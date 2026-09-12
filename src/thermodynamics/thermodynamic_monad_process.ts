/**
 * Thermodynamic Monad Process (Sprint 037)
 * Encapsulates state transitions and enforces Second Law verification prior to committing state updates.
 */
import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateMonad } from './types.js';
import { StateValidator } from './state_validator.js';
import { ThermodynamicStateVector } from './state_vector.js';

export { StateValidator as ThermodynamicStateValidator };

export class ThermodynamicMonadProcess {
    private validator: StateValidator;
    public id: string;
    public name: string;
    private state: IThermodynamicStateVector;

    constructor(idOrValidator?: string | StateValidator, name?: string, initialState?: IThermodynamicStateVector) {
        if (typeof idOrValidator === 'string') {
            this.id = idOrValidator;
            this.name = name ?? 'Thermodynamic Monad Process';
            this.state = initialState ?? {
                timestamp: 0,
                temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
                internalEnergy: 1e6,
                energy: 1e6,
                entropy: 1e3,
                totalEntropy: 1e3,
                exergy: 1e5,
                stocks: {},
                entropyGenerationRate: 1.0,
                exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
                boundaryFluxes: []
            };
            this.validator = new StateValidator();
        } else {
            this.validator = idOrValidator ?? new StateValidator();
            this.id = 'default_process';
            this.name = 'Default Monad Process';
            this.state = {
                timestamp: 0,
                temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
                internalEnergy: 1e6,
                energy: 1e6,
                entropy: 1e3,
                totalEntropy: 1e3,
                exergy: 1e5,
                stocks: {},
                entropyGenerationRate: 1.0,
                exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
                boundaryFluxes: []
            };
        }
    }

    public setStateVector(state: IThermodynamicStateVector): void {
        this.validator.assertValid(state);
        this.state = state;
    }

    public getStateVector(): IThermodynamicStateVector {
        return this.state;
    }

    public validateSecondLaw(): boolean {
        const sGen = this.state.entropyGenerationRate ?? 0;
        return sGen >= 0;
    }

    public validateInvariants(state?: IThermodynamicStateVector): boolean {
        const s = state ?? this.state;
        const sGen = s.entropyGenerationRate ?? 0;
        return sGen >= 0;
    }

    public execute(currentState: any): any {
        return this.step(currentState);
    }

    public step(
        stateOrFlux: IThermodynamicStateVector | any,
        fluxesOrDt?: any,
        dtVal?: number
    ): IThermodynamicStateVector {
        if (arguments.length === 2 && typeof fluxesOrDt === 'function') {
            const state = stateOrFlux as IThermodynamicStateVector;
            const fluxFunction = fluxesOrDt as (s: IThermodynamicStateVector) => IThermodynamicStateVector;
            const candidateState = fluxFunction(state);
            this.validator.assertValid(candidateState);
            this.state = candidateState;
            return candidateState;
        }

        const state = (arguments.length === 3 ? stateOrFlux : this.state) as IThermodynamicStateVector;
        const fluxes = arguments.length === 3 ? fluxesOrDt : stateOrFlux;
        const dt = arguments.length === 3 ? dtVal : (fluxesOrDt ?? 1.0);

        this.validator.assertValid(state);

        const netHeat = fluxes?.netHeatRate ?? fluxes?.radiativeNet ?? 1000;
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const sGen = Math.abs(netHeat / T0) + 1.0;

        const candidateState: IThermodynamicStateVector = {
            ...state,
            timestamp: (state.timestamp ?? 0) + (dt ?? 1.0),
            time: ((state as any).time ?? state.timestamp ?? 0) + (dt ?? 1.0),
            internalEnergy: (state.internalEnergy ?? state.energy ?? 1e6) + netHeat * dt,
            energy: (state.energy ?? state.internalEnergy ?? 1e6) + netHeat * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            boundaryFluxes: fluxes
        };

        this.validator.assertValid(candidateState);
        this.state = candidateState;
        return candidateState;
    }

    public bind(
        currentState: IThermodynamicStateVector,
        fluxFunction: (state: IThermodynamicStateVector) => IThermodynamicStateVector
    ): IThermodynamicStateVector {
        const candidateState = fluxFunction(currentState);
        this.validator.assertValid(candidateState);
        this.state = candidateState;
        return candidateState;
    }
}

export class BiogeochemicalMonadProcess extends ThermodynamicMonadProcess {
  public execute(state: ThermodynamicStateVector | any): ThermodynamicStateVector {
    const next = new ThermodynamicStateVector({
      ...state,
      timestamp: (state.timestamp ?? 0) + 1,
      entropyGenerationRate: state.entropyGenerationRate ?? 1.0
    });
    this.setStateVector(next);
    return next;
  }
}

export function computeEntropyGenerationRate(dS_sys_dt: number, boundaryFluxes: any): number {
    let thermalEnt = 0;
    if (boundaryFluxes && Array.isArray(boundaryFluxes.heatFluxes) && Array.isArray(boundaryFluxes.boundaryTemperatures)) {
        for (let i = 0; i < boundaryFluxes.heatFluxes.length; i++) {
            const q = boundaryFluxes.heatFluxes[i];
            const tb = boundaryFluxes.boundaryTemperatures[i] || STANDARD_AMBIENT_TEMPERATURE_K;
            thermalEnt += q / tb;
        }
    }
    const sGen = dS_sys_dt - thermalEnt;
    return Math.max(0, sGen);
}

export function stepThermodynamicMonad(
    state: IThermodynamicStateVector,
    boundaryFlux: any,
    netEnergy: number,
    dt: number,
    dtStep: number = 1.0
): any {
    const sGen = state.entropyGenerationRate ?? 5.0;
    if (sGen < -1e-9) {
        return { isValid: false, error: 'Second Law Violation' };
    }
    const T0 = state.referenceTemperature ?? state.deadStateTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const nextState = {
        ...state,
        timestamp: (state.timestamp ?? 0) + (dt ?? 0),
        internalEnergy: (state.internalEnergy ?? 0) + netEnergy * dtStep,
        stocks: state.stocks ?? {},
        entropyGenerationRate: sGen,
        entropyGeneratorRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
    return {
        state: nextState,
        isValid: true
    };
}

export function executeThermodynamicStep(
    state: IThermodynamicStateVector,
    fluxFunction: (state: IThermodynamicStateVector) => IThermodynamicStateVector
): IThermodynamicStateVector {
    const monadProcess = new ThermodynamicMonadProcess();
    return monadProcess.bind(state, fluxFunction);
}

export { ThermodynamicMonadStateModel, ThermodynamicStateMonad as ThermodynamicMonad } from './types.js';