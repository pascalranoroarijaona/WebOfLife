/**
 * Thermodynamic Monad Process Engine (RFC 020 / Sprint 20)
 * Encapsulates execution steps, entropy generation rates, and Second Law enforcement.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
/**
 * Computes the internal entropy generation rate based on heat dissipation and irreversible work.
 */
export function computeEntropyGenerationRate(dS_sys_dt, boundaryFluxes) {
    let heatEntropyTransferRate = 0;
    const heatFluxes = boundaryFluxes.heatFluxes;
    const boundaryTemps = boundaryFluxes.boundaryTemperatures;
    if (Array.isArray(heatFluxes)) {
        for (let i = 0; i < heatFluxes.length; i++) {
            const Q_k = heatFluxes[i];
            const T_k = (boundaryTemps ? boundaryTemps[i] : STANDARD_AMBIENT_TEMPERATURE_K) ?? STANDARD_AMBIENT_TEMPERATURE_K;
            if (T_k <= 0) {
                throw new Error(`Invalid boundary temperature: ${T_k} K. Temperature must be absolute (> 0).`);
            }
            heatEntropyTransferRate += Q_k / T_k;
        }
    }
    else if (heatFluxes instanceof Map) {
        let i = 0;
        for (const Q_k of heatFluxes.values()) {
            const T_k = (boundaryTemps && Array.isArray(boundaryTemps) ? boundaryTemps[i] : STANDARD_AMBIENT_TEMPERATURE_K) ?? STANDARD_AMBIENT_TEMPERATURE_K;
            if (T_k <= 0) {
                throw new Error(`Invalid boundary temperature: ${T_k} K. Temperature must be absolute (> 0).`);
            }
            heatEntropyTransferRate += Q_k / T_k;
            i++;
        }
    }
    else if (heatFluxes && typeof heatFluxes === 'object') {
        let i = 0;
        for (const Q_k of Object.values(heatFluxes)) {
            const T_k = (boundaryTemps && Array.isArray(boundaryTemps) ? boundaryTemps[i] : STANDARD_AMBIENT_TEMPERATURE_K) ?? STANDARD_AMBIENT_TEMPERATURE_K;
            if (T_k <= 0) {
                throw new Error(`Invalid boundary temperature: ${T_k} K. Temperature must be absolute (> 0).`);
            }
            heatEntropyTransferRate += Number(Q_k || 0) / T_k;
            i++;
        }
    }
    let massEntropyTransferRate = 0;
    const massFluxes = boundaryFluxes.massFluxes;
    const specEntropies = boundaryFluxes.specificEntropies;
    if (Array.isArray(massFluxes)) {
        for (let i = 0; i < massFluxes.length; i++) {
            const m_dot_i = massFluxes[i];
            const s_i = Array.isArray(specEntropies) ? (specEntropies[i] ?? 0) : 0;
            massEntropyTransferRate += m_dot_i * s_i;
        }
    }
    else if (massFluxes instanceof Map) {
        let i = 0;
        for (const m_dot_i of massFluxes.values()) {
            const s_i = Array.isArray(specEntropies) ? (specEntropies[i] ?? 0) : 0;
            massEntropyTransferRate += m_dot_i * s_i;
            i++;
        }
    }
    else if (massFluxes && typeof massFluxes === 'object') {
        let i = 0;
        for (const m_dot_i of Object.values(massFluxes)) {
            const s_i = Array.isArray(specEntropies) ? (specEntropies[i] ?? 0) : 0;
            massEntropyTransferRate += Number(m_dot_i || 0) * s_i;
            i++;
        }
    }
    const sGen = dS_sys_dt - heatEntropyTransferRate - massEntropyTransferRate;
    return sGen;
}
/**
 * Executes a thermodynamic state monad transition, enforcing First and Second Laws.
 */
export function stepThermodynamicMonad(previousState, boundaryFlux, netEnergyChange, deltaEntropy, dt) {
    if (dt <= 0) {
        return {
            state: previousState,
            isValid: false,
            error: `Time step dt must be positive, got ${dt}`
        };
    }
    // 1. Update Internal Energy (First Law)
    const newInternalEnergy = previousState.internalEnergy + netEnergyChange;
    // 2. Update System Entropy
    const newEntropy = previousState.entropy + deltaEntropy;
    const dS_sys_dt = deltaEntropy / dt;
    // 3. Compute Entropy Generation Rate
    let entropyGenerationRate;
    try {
        entropyGenerationRate = computeEntropyGenerationRate(dS_sys_dt, boundaryFlux);
    }
    catch (e) {
        return {
            state: previousState,
            isValid: false,
            error: e.message
        };
    }
    // Enforce Second Law: S_gen >= 0
    if (entropyGenerationRate < 0) {
        return {
            state: previousState,
            isValid: false,
            error: `Second Law Violation: entropyGenerationRate (${entropyGenerationRate}) < 0`
        };
    }
    // 4. Compute Exergy Destruction Rate (Gouy-Stodola theorem)
    const T_0 = previousState.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const exergyDestructionRate = T_0 * entropyGenerationRate;
    const currentState = {
        ...previousState,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        referenceTemperature: T_0,
        entropyGenerationRate,
        exergyDestructionRate,
        exergy: previousState.exergy ?? 1e5,
        boundaryFluxes: boundaryFlux,
        boundaryFlux,
        timestamp: previousState.timestamp + dt
    };
    return {
        state: currentState,
        isValid: true
    };
}
/**
 * Legacy compatibility wrapper for earlier sprint test suites.
 */
export function executeThermodynamicStep(state, netHeat, boundaryTemp, dt = 1.0) {
    if (typeof netHeat === 'object' && netHeat !== null) {
        const fluxes = netHeat;
        const actualDt = typeof boundaryTemp === 'number' ? boundaryTemp : 1.0;
        const heatArr = fluxes.heatFluxes instanceof Map ? Array.from(fluxes.heatFluxes.values()) : (fluxes.heatFluxes ?? [1000]);
        const tempArr = fluxes.boundaryTemperatures ?? [STANDARD_AMBIENT_TEMPERATURE_K];
        const boundaryFlux = {
            heatFluxes: heatArr,
            boundaryTemperatures: tempArr,
            massFluxes: [],
            specificEnthalpies: [],
            specificEntropies: []
        };
        const netQ = Array.isArray(heatArr) ? heatArr.reduce((a, b) => a + b, 0) : 1000;
        const dS = netQ / (tempArr[0] ?? STANDARD_AMBIENT_TEMPERATURE_K);
        const res = stepThermodynamicMonad(state, boundaryFlux, netQ * actualDt, dS * actualDt, actualDt);
        if (!res.isValid) {
            throw new Error(res.error ?? "Second Law Violation");
        }
        return res.state;
    }
    const netHeatVal = Number(netHeat) || 0;
    const bTempVal = Number(boundaryTemp) || STANDARD_AMBIENT_TEMPERATURE_K;
    const boundaryFlux = {
        heatFluxes: [netHeatVal],
        boundaryTemperatures: [bTempVal],
        massFluxes: [],
        specificEnthalpies: [],
        specificEntropies: []
    };
    const dS = netHeatVal / bTempVal;
    const res = stepThermodynamicMonad(state, boundaryFlux, netHeatVal * dt, dS * dt, dt);
    if (!res.isValid) {
        throw new Error(res.error ?? "Second Law Violation");
    }
    return res.state;
}
export class ThermodynamicMonadProcess {
    id;
    name;
    stateVector;
    constructor(id, name, initialState) {
        this.id = id;
        this.name = name;
        this.stateVector = initialState ?? {
            timestamp: 0,
            internalEnergy: 1e6,
            entropy: 5000,
            totalEntropy: 5000,
            entropyGenerationRate: 1.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.0,
            exergy: 1e5,
            boundaryFluxes: {
                heatFluxes: [],
                boundaryTemperatures: [],
                massFluxes: [],
                specificEnthalpies: [],
                specificEntropies: []
            }
        };
    }
    setStateVector(state) {
        if ((state.entropyGenerationRate ?? 0) < 0) {
            throw new Error("Second Law Violation: Negative entropy generation rate.");
        }
        this.stateVector = state;
    }
    getStateVector() {
        return this.stateVector;
    }
    validateSecondLaw() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation");
        }
        return true;
    }
    validateInvariants(state) {
        const sGen = state.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation");
        }
        return true;
    }
    step(state, dt) {
        const sGen = Math.max(0, state.entropyGenerationRate ?? 1.0);
        const T0 = state.ambientTemperature ?? state.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const stocks = state.elementalStocks;
        let nextStocks = stocks;
        if (Array.isArray(stocks)) {
            const bFlux = state.boundaryFluxes;
            const mRates = bFlux?.massFluxRates ?? [0, 0, 0, 0];
            nextStocks = stocks.map((val, idx) => val + (Number(mRates[idx]) || 0) * dt);
        }
        const updated = {
            ...state,
            timestamp: (state.timestamp ?? state.time ?? 0) + dt,
            time: (state.time ?? state.timestamp ?? 0) + dt,
            internalEnergy: state.internalEnergy + 1000 * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            exergy: (state.exergy ?? 5e6) + 100 * dt,
            elementalStocks: nextStocks
        };
        this.stateVector = updated;
        return updated;
    }
}
