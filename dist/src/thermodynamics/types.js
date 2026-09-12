// File: src/thermodynamics/types.ts
export var EntropyState;
(function (EntropyState) {
    EntropyState["STEADY"] = "STEADY";
    EntropyState["ACCUMULATING"] = "ACCUMULATING";
    EntropyState["DEGRADING"] = "DEGRADING";
    EntropyState["COLLAPSED"] = "COLLAPSED";
})(EntropyState || (EntropyState = {}));
export class ElementalStocks {
    carbon;
    water;
    nitrogen;
    phosphorus;
    oxygen;
    energyStored;
    qLoss;
    constructor(carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, energyStored = 0, qLoss = 0) {
        this.carbon = carbon;
        this.water = water;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.oxygen = oxygen;
        this.energyStored = energyStored;
        this.qLoss = qLoss;
    }
    clone() {
        return new ElementalStocks(this.carbon, this.water, this.nitrogen, this.phosphorus, this.oxygen, this.energyStored, this.qLoss);
    }
}
export class ThermodynamicMonad {
    value;
    vector;
    constructor(value, vector) {
        this.value = value;
        this.vector = vector;
    }
    static of(val) {
        if (val.entropyGenerationRate !== undefined || val.internalEnergy !== undefined) {
            const vec = val;
            validateThermodynamicInvariants(vec);
            return new ThermodynamicMonad(val, vec);
        }
        return new ThermodynamicMonad(val, {
            timestamp: 0,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 10000,
            totalEntropy: 33.33,
            entropyGenerationRate: 1.0,
            exergyDestructionRate: 288.15 * 1.0,
            boundaryFluxes: {}
        });
    }
    static unit(val, vector) {
        validateThermodynamicInvariants(vector);
        return new ThermodynamicMonad(val, vector);
    }
    getValue() {
        return this.value;
    }
    getStateVector() {
        return this.vector;
    }
    transform(sGenRate, timestamp) {
        const t0 = this.vector.T_0 ?? this.vector.ambientTemperature ?? 288.15;
        const newVector = {
            ...this.vector,
            timestamp,
            entropyGenerationRate: sGenRate,
            exergyDestructionRate: t0 * sGenRate,
            entropyMetrics: {
                sGenRate,
                exergyDestruction: t0 * sGenRate,
                cumulativeQLoss: 0,
                referenceTemperature: t0,
                exergyDestructionRate: t0 * sGenRate
            }
        };
        validateThermodynamicInvariants(newVector);
        return new ThermodynamicMonad(this.value, newVector);
    }
    bind(fn) {
        const result = fn(this.value, this.vector);
        let nextVal;
        let nextVec;
        if (result && typeof result === 'object' && 'value' in result && 'vector' in result) {
            nextVal = result.value;
            nextVec = result.vector;
        }
        else {
            nextVal = result;
            if (nextVal instanceof ElementalStocks && this.value instanceof ElementalStocks) {
                const prevStocks = this.value;
                const newStocks = nextVal;
                const prevMass = prevStocks.carbon + prevStocks.water + prevStocks.nitrogen + prevStocks.phosphorus + prevStocks.oxygen;
                const newMass = newStocks.carbon + newStocks.water + newStocks.nitrogen + newStocks.phosphorus + newStocks.oxygen;
                if (Math.abs(newMass - prevMass) > 1e-4) {
                    throw new Error(`First Law Violation: Total elemental mass altered from ${prevMass} to ${newMass}`);
                }
                if (newStocks.qLoss < prevStocks.qLoss - 1e-6) {
                    throw new Error(`Second Law Violation: qLoss decreased from ${prevStocks.qLoss} to ${newStocks.qLoss}`);
                }
            }
            nextVec = { ...this.vector };
        }
        validateThermodynamicInvariants(nextVec);
        return new ThermodynamicMonad(nextVal, nextVec);
    }
    map(fn) {
        const newVec = fn(this.vector);
        validateThermodynamicInvariants(newVec);
        return new ThermodynamicMonad(this.value, newVec);
    }
    validate() {
        try {
            validateThermodynamicInvariants(this.vector);
            return { isValid: true, violations: [] };
        }
        catch (err) {
            return { isValid: false, violations: [err.message] };
        }
    }
}
export class ThermodynamicStateMonad {
    vector;
    constructor(vector) {
        this.vector = vector;
    }
    static initialize(initialState) {
        validateThermodynamicInvariants(initialState);
        return new ThermodynamicStateMonad(initialState);
    }
    extract() {
        return this.vector;
    }
    map(fn) {
        const next = fn(this.vector);
        validateThermodynamicInvariants(next);
        return new ThermodynamicStateMonad(next);
    }
}
export function validateThermodynamicInvariants(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? state.entropyMetrics?.sGenRate ?? 0;
    if (sGen < -1e-6) {
        throw new Error(`Second Law Violation: entropy generation rate ${sGen} < 0`);
    }
    const iDot = state.exergyDestructionRate ?? state.exergyDestructionRateWatts ?? state.entropyMetrics?.exergyDestructionRate ?? state.entropyMetrics?.exergyDestruction;
    const t0 = state.T_0 ?? state.ambientTemperature ?? state.deadStateTemperatureKelvin ?? 288.15;
    if (iDot !== undefined) {
        const expectedIDot = t0 * sGen;
        if (Math.abs(iDot - expectedIDot) > 1e-2) {
            throw new Error(`Exergy Destruction mismatch: I_dot (${iDot}) != T_0 * S_gen (${expectedIDot})`);
        }
    }
    return true;
}
export function photosyntheticFixation(solarWattsOrStocks, efficiencyOrWatts = 0.02, eff = 0.05) {
    if (solarWattsOrStocks instanceof ElementalStocks) {
        const stocks = solarWattsOrStocks.clone();
        const fixAmount = Math.max(0, efficiencyOrWatts * eff);
        stocks.carbon = Math.max(0, stocks.carbon - fixAmount);
        stocks.energyStored += fixAmount * 10;
        return stocks;
    }
    return solarWattsOrStocks * efficiencyOrWatts;
}
export function cellularRespiration(biomassMassOrStocks, metabolicRate = 0.05) {
    if (biomassMassOrStocks instanceof ElementalStocks) {
        const stocks = biomassMassOrStocks.clone();
        const resp = Math.max(0, metabolicRate * 1.0);
        stocks.carbon = Math.max(0, stocks.carbon - resp);
        stocks.qLoss += resp * 5;
        return stocks;
    }
    return biomassMassOrStocks * metabolicRate;
}
/**
 * Computes the instantaneous thermodynamic state vector from system stocks and boundary fluxes.
 */
export function evaluateThermodynamicState(previousState, internalEnergy, systemTemperature, ambientTemperature, fluxes, dt) {
    const totalEntropy = internalEnergy / systemTemperature;
    const dEntropySys = dt > 0 ? (totalEntropy - previousState.totalEntropy) / dt : 0;
    const solarEntropyRate = fluxes.solarRadiationIn / 5778;
    const thermalEntropyRate = fluxes.thermalRadiationOut / systemTemperature;
    const sensibleEntropyRate = fluxes.sensibleHeatFlux / ambientTemperature;
    const latentEntropyRate = fluxes.latentHeatFlux / systemTemperature;
    const netBoundaryEntropyFlux = solarEntropyRate - (thermalEntropyRate + sensibleEntropyRate + latentEntropyRate);
    const entropyGenerationRate = Math.max(0, dEntropySys - netBoundaryEntropyFlux);
    const exergyDestructionRate = ambientTemperature * entropyGenerationRate;
    return {
        timestamp: previousState.timestamp + dt,
        ambientTemperature,
        systemTemperature,
        internalEnergy,
        totalEntropy,
        entropyGenerationRate,
        exergyDestructionRate,
        boundaryFluxes: fluxes,
        T_0: ambientTemperature,
        deadStateTemperatureKelvin: ambientTemperature,
        systemInternalEnergyJoules: internalEnergy,
        entropy: totalEntropy,
        systemEntropyJoulesPerKelvin: totalEntropy,
        temperature: systemTemperature,
        temperatureKelvin: systemTemperature,
        solarInputWatts: fluxes.solarRadiationIn,
        planetaryEmissionWatts: fluxes.thermalRadiationOut,
        entropyGenerationRateWattsPerKelvin: entropyGenerationRate,
        exergyDestructionRateWatts: exergyDestructionRate,
        boundaryHeatFlux: { solarIn: fluxes.solarRadiationIn, infraRedOut: -fluxes.thermalRadiationOut },
        entropyMetrics: {
            sGenRate: entropyGenerationRate,
            exergyDestruction: exergyDestructionRate,
            cumulativeQLoss: 0,
            referenceTemperature: ambientTemperature,
            exergyDestructionRate: exergyDestructionRate
        },
        ambientReference: { temperature0: ambientTemperature, pressure0: 101325 }
    };
}
/**
 * Asserts the Second Law of Thermodynamics and Exergy Consistency.
 */
export function assertSecondLaw(state) {
    return validateThermodynamicInvariants(state);
}
