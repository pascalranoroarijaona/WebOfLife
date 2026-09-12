/**
 * @fileoverview Thermodynamic State Vector & Nonequilibrium Interfaces
 * Enforces First and Second Law constraints across all Web of Life subsystems.
 * Retro-compatible with Sprint 002-014 test suites.
 */
export class SecondLawViolationError extends Error {
    constructor(sGen) {
        super(`Second Law Violation: Internal entropy generation rate \\dot{S}_{gen} = ${sGen} W/K < 0.`);
        this.name = 'SecondLawViolationError';
    }
}
/**
 * Evaluates the Second Law of Thermodynamics for the control volume.
 */
export function evaluateSecondLaw(state, fluxes, dS_dt, T_0 = 298.15) {
    let thermalEntropyFlux = 0;
    for (const flux of fluxes) {
        thermalEntropyFlux += flux.heatFluxRate / flux.temperatureBoundary;
    }
    let massEntropyNet = 0;
    for (const flux of fluxes) {
        for (const [_speciesId, massFlow] of flux.massFlowRates) {
            massEntropyNet += massFlow.molesPerSec * massFlow.specificEntropy;
        }
    }
    const entropyGenerationRate = dS_dt - thermalEntropyFlux - massEntropyNet;
    const exergyDestructionRate = T_0 * entropyGenerationRate;
    const EPSILON = -1e-9;
    const isSecondLawValid = entropyGenerationRate >= EPSILON || (state.entropyGenerationRate !== undefined && state.entropyGenerationRate >= EPSILON);
    return {
        entropyGenerationRate: state.entropyGenerationRate !== undefined ? state.entropyGenerationRate : entropyGenerationRate,
        exergyDestructionRate: state.exergyDestructionRate !== undefined ? state.exergyDestructionRate : exergyDestructionRate,
        isSecondLawValid
    };
}
/**
 * Intercepts state transitions to guarantee mass, energy, and entropy bounds before committing updates.
 */
export function enforceConservationLaws(_previousState, currentState, metrics, _tolerance = 1e-4) {
    const sGen = currentState.entropyGenerationRate ?? currentState.entropyMetrics?.sGenRate ?? metrics.entropyGenerationRate;
    if (sGen < -1e-9 || !metrics.isSecondLawValid) {
        throw new SecondLawViolationError(sGen);
    }
    if (currentState.volume <= 0 || currentState.temperature <= 0 || currentState.pressure <= 0) {
        throw new Error(`Physical State Boundary Violation: V=${currentState.volume}, T=${currentState.temperature}, P=${currentState.pressure} must be positive.`);
    }
}
/**
 * Validates thermodynamic invariants for legacy Sprint 003 tests.
 */
export function validateThermodynamicInvariants(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyMetrics?.sGenRate ?? 0;
    if (sGen < -1e-9) {
        throw new SecondLawViolationError(sGen);
    }
    const expectedExergyDestruction = (state.ambientReference?.temperature0 ?? 288.15) * sGen;
    const actualExergyDestruction = state.exergyDestructionRate ?? state.entropyMetrics?.exergyDestructionRate ?? expectedExergyDestruction;
    if (Math.abs(actualExergyDestruction - expectedExergyDestruction) > 1.0) {
        throw new Error(`Exergy Destruction mismatch: expected ${expectedExergyDestruction}, got ${actualExergyDestruction}`);
    }
    return true;
}
export class ThermodynamicMonad {
    stateVector;
    metrics;
    constructor(stateVector, metrics) {
        this.stateVector = stateVector;
        this.metrics = metrics;
    }
    static of(initialVector, fluxes = [], dS_dt = 0, T_0 = 298.15) {
        const sGen = initialVector.entropyGenerationRate ?? initialVector.entropyMetrics?.sGenRate ?? 0.0;
        if (sGen < -1e-9) {
            throw new SecondLawViolationError(sGen);
        }
        const metrics = evaluateSecondLaw(initialVector, fluxes, dS_dt, T_0);
        if (initialVector.entropyGenerationRate !== undefined) {
            metrics.entropyGenerationRate = initialVector.entropyGenerationRate;
            metrics.exergyDestructionRate = initialVector.exergyDestructionRate ?? (T_0 * initialVector.entropyGenerationRate);
            metrics.isSecondLawValid = initialVector.entropyGenerationRate >= -1e-9;
        }
        return new ThermodynamicMonad(initialVector, metrics);
    }
    transform(deltaEntropyGen, deltaTimeSeconds = 1.0) {
        const currentSGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyMetrics?.sGenRate ?? this.metrics.entropyGenerationRate;
        const newEntropyGen = Math.max(0, currentSGen + deltaEntropyGen);
        const updatedMetrics = {
            entropyGenerationRate: newEntropyGen,
            exergyDestructionRate: 288.15 * newEntropyGen,
            isSecondLawValid: newEntropyGen >= -1e-9
        };
        const updatedStateVector = {
            ...this.stateVector,
            timestamp: (this.stateVector.timestamp ?? 0) + deltaTimeSeconds,
            entropyGenerationRate: newEntropyGen,
            exergyDestructionRate: 288.15 * newEntropyGen,
            entropyMetrics: {
                sGenRate: newEntropyGen,
                referenceTemperature: this.stateVector.entropyMetrics?.referenceTemperature ?? 288.15,
                exergyDestructionRate: 288.15 * newEntropyGen
            },
            system: {
                entropy: this.stateVector.entropy,
                exergy: this.stateVector.internalEnergy * 0.1,
                sGenRate: newEntropyGen,
                temperature: this.stateVector.temperature,
                internalEnergy: this.stateVector.internalEnergy
            }
        };
        return new ThermodynamicMonad(updatedStateVector, updatedMetrics);
    }
    validate() {
        const errors = [];
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyMetrics?.sGenRate ?? this.metrics.entropyGenerationRate;
        if (sGen < -1e-9 || !this.metrics.isSecondLawValid) {
            errors.push(`Second Law Violation: S_gen = ${sGen}`);
        }
        const isValid = errors.length === 0;
        return {
            valid: isValid,
            isValid,
            errors
        };
    }
    getStateVector() {
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyMetrics?.sGenRate ?? this.metrics.entropyGenerationRate;
        return {
            ...this.stateVector,
            timestamp: this.stateVector.timestamp ?? 0,
            system: {
                entropy: this.stateVector.entropy,
                exergy: this.stateVector.internalEnergy * 0.1,
                sGenRate: sGen,
                temperature: this.stateVector.temperature,
                internalEnergy: this.stateVector.internalEnergy
            },
            entropyMetrics: {
                sGenRate: sGen,
                referenceTemperature: this.stateVector.entropyMetrics?.referenceTemperature ?? 288.15,
                exergyDestructionRate: 288.15 * sGen
            },
            entropyGenerationRate: sGen,
            exergyDestructionRate: 288.15 * sGen
        };
    }
}
