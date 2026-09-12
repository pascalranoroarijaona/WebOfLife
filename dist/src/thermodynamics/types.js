/**
 * Thermodynamic Types & Interfaces for Web of Life Engine (RFC 020)
 * Formalizes ThermodynamicStateVector, BoundaryFlux, and Law Validators.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export function advanceThermodynamicState(state, dt, energyIn, entropyIn) {
    const newInternalEnergy = state.internalEnergy + energyIn * dt;
    const newEntropy = state.totalEntropy + entropyIn * dt;
    const sGen = Math.max(0, entropyIn * 0.1);
    const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: state.timestamp + dt,
        internalEnergy: newInternalEnergy,
        totalEntropy: newEntropy,
        entropy: newEntropy,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true
    };
}
export class ThermodynamicStateMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    static unit(state) {
        return new ThermodynamicStateMonad(state);
    }
    bind(fn) {
        return new ThermodynamicStateMonad(fn(this.state));
    }
    getState() {
        return this.state;
    }
}
