/**
 * Thermodynamic State Vector Implementation for Web of Life
 * Encapsulates system energetic, entropic, and mass inventory vectors.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateVector as BaseThermodynamicStateVector } from './types.js';
export class ThermodynamicStateVector extends BaseThermodynamicStateVector {
    computeDelta(previousState) {
        const deltas = {};
        const prevStocks = previousState?.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState?.stocks ?? {});
        const currStocks = this.stocks instanceof Map ? Object.fromEntries(this.stocks) : (this.stocks ?? {});
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        for (const k of keys) {
            deltas[k] = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
        }
        return deltas;
    }
}
export const StateVector = ThermodynamicStateVector;
export { ThermodynamicStateVector as StateVectorClass };
export function createThermodynamicStateVector(init) {
    return new ThermodynamicStateVector(init);
}
export function createBaselineStateVector(init) {
    return new ThermodynamicStateVector({
        temperature: STANDARD_AMBIENT_TEMPERATURE_K,
        ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
        referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
        entropy: 0,
        timestamp: 0,
        fluxes: {
            solarRadiation: 0,
            thermalEmission: 0,
            latentHeat: 0,
            sensibleHeat: 0,
        },
        ...init
    });
}
export class ThermodynamicMonadProcess {
    state;
    constructor(state = new ThermodynamicStateVector()) {
        this.state = state;
    }
    static unit(state) {
        const tsv = state instanceof ThermodynamicStateVector ? state : new ThermodynamicStateVector(state);
        return new ThermodynamicMonadProcess(tsv);
    }
    static step(state, fluxDelta, dt) {
        const vec = state instanceof ThermodynamicStateVector ? state : new ThermodynamicStateVector(state);
        const netFlux = fluxDelta?.solarRadiation ?? fluxDelta?.netHeatFlux ?? 1000;
        const nextEnergy = vec.internalEnergy + netFlux * dt;
        const nextEntropy = vec.entropy + (Math.abs(netFlux) / vec.temperature) * dt;
        return vec.clone({
            timestamp: vec.timestamp + dt,
            internalEnergy: nextEnergy,
            entropy: nextEntropy,
            totalEntropy: nextEntropy,
            fluxes: { ...vec.boundaryFluxes, ...fluxDelta }
        });
    }
    bind(fn) {
        const res = fn(this.state);
        this.state = res instanceof ThermodynamicStateVector ? res : new ThermodynamicStateVector(res);
        return this;
    }
    extract() {
        return this.state;
    }
}
export function validateOrThrowEntropy(state) {
    const sGen = state?.entropyGenerationRate ?? 0;
    if (typeof sGen === 'number' && sGen < -1e-9) {
        throw new Error(`Second Law Violation: Entropy generation rate ${sGen} is less than zero.`);
    }
}
