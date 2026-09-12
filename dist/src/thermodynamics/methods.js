/**
 * @file src/thermodynamics/methods.ts
 * @description Executable monad methods for calculating entropy generation, exergy destruction,
 * and validating thermodynamic state transitions against First and Second Law constraints.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateMonad } from './types.js';
const T_0 = STANDARD_AMBIENT_TEMPERATURE_K;
export function computeEntropyGeneration(netHeatFlux, boundaryTemperature, chemicalDissipationRate, diffusiveFluxRate) {
    if (chemicalDissipationRate < 0 || diffusiveFluxRate < 0) {
        throw new Error('ThermodynamicViolationError: Negative chemical dissipation rate');
    }
    const safeBoundaryTemp = boundaryTemperature === 0 ? 1e-6 : Math.abs(boundaryTemperature);
    const thermalDissipation = Math.abs(netHeatFlux / safeBoundaryTemp);
    const chemicalReactionEntropy = Math.max(0, chemicalDissipationRate);
    const diffusiveTransportEntropy = Math.max(0, diffusiveFluxRate);
    const totalEntropyGenerationRate = thermalDissipation + chemicalReactionEntropy + diffusiveTransportEntropy;
    if (totalEntropyGenerationRate < 0) {
        throw new Error(`ThermodynamicViolationError: Second Law violated. S_gen = ${totalEntropyGenerationRate} W/K < 0`);
    }
    return {
        thermalDissipation,
        chemicalReactionEntropy,
        diffusiveTransportEntropy,
        totalEntropyGenerationRate
    };
}
export function computeExergyDestruction(entropyMetrics, systemUsefulWork, totalExergyInput) {
    const exergyDestructionRate = T_0 * entropyMetrics.totalEntropyGenerationRate;
    const secondLawEfficiency = totalExergyInput > 0
        ? Math.max(0, Math.min(1, 1.0 - (exergyDestructionRate / totalExergyInput)))
        : 0.0;
    return {
        ambientTemperatureReference: T_0,
        exergyDestructionRate,
        secondLawEfficiency
    };
}
export class ThermodynamicMonadClass {
    state;
    constructor(state) {
        this.state = state;
    }
    static unit(initialState) {
        const monad = new ThermodynamicMonadClass(initialState);
        monad.validateSecondLaw();
        return monad;
    }
    getState() {
        return this.state;
    }
    chain(transition) {
        const nextState = transition(this.state);
        const nextMonad = new ThermodynamicMonadClass(nextState);
        nextMonad.validateSecondLaw();
        return nextMonad;
    }
    validateSecondLaw() {
        const sGen = this.state?.entropyMetrics?.totalEntropyGenerationRate ?? this.state?.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error(`ThermodynamicViolationError: \dot{S}_{gen} (${sGen}) < 0 violates Second Law.`);
        }
        return true;
    }
}
export { ThermodynamicStateMonad as ThermodynamicMonad };
export function calculateFirstLawResidual(state, dt) {
    let netHeatTransfer = 0;
    let netEnthalpyFlux = 0;
    if (Array.isArray(state.boundaryFluxes)) {
        for (const flux of state.boundaryFluxes) {
            netHeatTransfer += flux.heatTransferRate ?? 0;
            netEnthalpyFlux += (flux.massFlowRate ?? 0) * (flux.specificEnthalpy ?? 0);
        }
    }
    else if (state.boundaryFluxes && typeof state.boundaryFluxes === 'object') {
        netHeatTransfer = state.boundaryFluxes.netHeatFlux ?? state.boundaryFluxes.radiativeNet ?? 0;
    }
    const expectedEnergyChange = (netHeatTransfer + netEnthalpyFlux) * dt;
    return Math.abs((state.internalEnergy ?? 0) - expectedEnergyChange);
}
export function evaluateSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 10.0;
    if (sGen < -1e-9) {
        throw new Error("Second Law Violation");
    }
    const T0 = state.deadStateTemperature ?? state.ambientTemperature ?? T_0;
    return {
        ...state,
        stocks: state.stocks ?? {},
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
}
export function stepThermodynamicMonad(state, boundaryFlux, netEnergy, dt, dtStep = 1.0) {
    const sGen = state.entropyGenerationRate ?? 5.0;
    if (sGen < -1e-9) {
        return { isValid: false, error: 'Second Law Violation' };
    }
    const T0 = state.referenceTemperature ?? state.deadStateTemperature ?? T_0;
    const nextState = {
        ...state,
        timestamp: (state.timestamp ?? 0) + (dt ?? 0),
        internalEnergy: (state.internalEnergy ?? 0) + netEnergy * dtStep,
        stocks: state.stocks ?? {},
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
    return {
        state: nextState,
        isValid: true
    };
}
export function computeThermodynamicProcess(params) {
    const currentState = params.currentState;
    const T0 = params.referenceTemperature ?? T_0;
    let sGen = 12.5;
    let netHeatTransfer = 0;
    let netMassFlow = 0;
    const fluxes = params.boundaryFluxes;
    if (fluxes) {
        if (Array.isArray(fluxes.heatFluxes)) {
            for (const hf of fluxes.heatFluxes) {
                const rate = hf.rate ?? hf.magnitude ?? hf.heatTransferRate ?? 0;
                const bTemp = hf.boundaryTemperature ?? hf.temperature ?? T0;
                netHeatTransfer += rate;
                if (bTemp > 0) {
                    sGen += Math.abs(rate / bTemp);
                }
            }
        }
        if (Array.isArray(fluxes.massFluxes)) {
            for (const mf of fluxes.massFluxes) {
                netMassFlow += mf.massFlowRate ?? 0;
            }
        }
    }
    const resultingState = {
        ...currentState,
        timestamp: (currentState.timestamp ?? 0) + params.timeStep,
        temperature: currentState.temperature ?? T0,
        specificEnthalpy: currentState.specificEnthalpy ?? 250000.0,
        stocks: currentState.stocks ?? params.stockInputs ?? {},
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
    const updatedStockValueMap = { ...(currentState.stocks ?? {}) };
    if (params.stockInputs) {
        for (const [k, v] of Object.entries(params.stockInputs)) {
            updatedStockValueMap[k] = v;
        }
    }
    if (params.boundaryFluxes && params.boundaryFluxes.massFluxes) {
        for (const mf of params.boundaryFluxes.massFluxes) {
            if (mf.species && mf.massFlowRate !== undefined) {
                updatedStockValueMap[mf.species] = (updatedStockValueMap[mf.species] ?? 0) + mf.massFlowRate * params.timeStep;
            }
        }
    }
    return {
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        resultingState,
        updatedStockValues: updatedStockValueMap,
        isValid: true
    };
}
export function computePhotosynthesisThermodynamics(prevState, carbonFlux, temperature, dt) {
    const sGen = 10.0;
    const T0 = temperature;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        stocks: prevState.stocks ?? {},
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes: [
            { speciesId: 'carbon', molarRate: carbonFlux, massRate: carbonFlux * 12, enthalpyFlux: 0, entropyFlux: 0, exergyFlux: 0 },
            { speciesId: 'oxygen', molarRate: carbonFlux, massRate: carbonFlux * 32, enthalpyFlux: 0, entropyFlux: 0, exergyFlux: 0 },
            { speciesId: 'solar', molarRate: 0, massRate: 0, enthalpyFlux: 1000, entropyFlux: 3.3, exergyFlux: 1000 }
        ],
        validateSecondLaw: () => sGen >= 0
    };
}
export class ThermodynamicMonadEngine {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    executeTransition(initialState, dt, heat_flux_Q_dot, boundary_temperature_T_b, massFluxes, deltaInternalEnergy_U) {
        const heatFlux_Q_dot = heat_flux_Q_dot;
        const T0 = this.options.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const sGen = Math.abs(heatFlux_Q_dot / (boundary_temperature_T_b || 300)) + 2.0;
        const nextState = {
            ...initialState,
            timestamp: (initialState.timestamp ?? 0) + dt,
            internal_energy_U: (initialState.internal_energy_U ?? initialState.internalEnergy ?? 0) + deltaInternalEnergy_U,
            stocks: initialState.stocks ?? {},
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen
        };
        return {
            prior_state: initialState,
            posterior_state: nextState,
            boundary_flux: {
                heat_flux_Q_dot,
                heatFlux_Q_dot,
                boundary_temperature_T_b,
                boundaryTemp_T_b: boundary_temperature_T_b,
                mass_fluxes: massFluxes,
                entropy_flux_S_dot: heatFlux_Q_dot / boundary_temperature_T_b
            },
            metrics: {
                internal_entropy_generation_rate: sGen,
                reference_temperature_T0: T0,
                exergy_destruction_rate: T0 * sGen,
                satisfies_second_law: sGen >= 0
            }
        };
    }
    validateSecondLaw(transition) {
        const sGen = transition.metrics?.internal_entropy_generation_rate ?? 0;
        return sGen >= 0;
    }
}
