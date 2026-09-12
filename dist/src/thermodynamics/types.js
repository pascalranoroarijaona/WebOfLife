/**
 * ElementalStocks representation for Sprint 004 & legacy compatibility.
 */
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    oxygen;
    water;
    energyStored;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, water = 0, energyStored = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.oxygen = oxygen;
        this.water = water;
        this.energyStored = energyStored;
        this.qLoss = qLoss;
    }
    totalMass() {
        return this.carbon + this.nitrogen + this.phosphorus + this.oxygen + this.water;
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.oxygen, this.water, this.energyStored, this.qLoss);
    }
}
/**
 * Monad wrapper enforcing thermodynamic invariants during state transitions.
 */
export class ThermodynamicMonad {
    value;
    stateVector;
    constructor(value, stateVector) {
        this.value = value;
        this.stateVector = stateVector;
    }
    static unit(value, initialVector) {
        validateThermodynamicInvariants(initialVector);
        return new ThermodynamicMonad(value, initialVector);
    }
    static of(initialVectorOrStocks) {
        if (initialVectorOrStocks instanceof ElementalStocks) {
            const stocks = initialVectorOrStocks;
            const t0 = 288.15;
            const totalM = stocks.totalMass();
            const sGen = 0.1;
            const vector = {
                timestamp: 0,
                T_0: t0,
                internalEnergy: stocks.energyStored,
                entropy: stocks.qLoss / t0 + 10,
                entropyGenerationRate: sGen,
                exergyDestructionRate: t0 * sGen,
                boundaryHeatFlux: { solarIn: 1000, infraredOut: -950 },
                massInventory: { carbon: stocks.carbon, nitrogen: stocks.nitrogen, phosphorus: stocks.phosphorus, oxygen: stocks.oxygen, water: stocks.water },
                temperature: t0,
                ambientTemperature: t0,
                mass: totalM,
                totalMass: totalM,
                exergy: stocks.energyStored * 0.5,
                stocks,
                entropyMetrics: { sGenRate: sGen, exergyDestruction: t0 * sGen, cumulativeQLoss: stocks.qLoss }
            };
            return new ThermodynamicMonad(stocks, vector);
        }
        else {
            validateThermodynamicInvariants(initialVectorOrStocks);
            return new ThermodynamicMonad(initialVectorOrStocks, initialVectorOrStocks);
        }
    }
    bind(fn) {
        const res = fn(this.value, this.stateVector);
        let nextVal;
        let nextVec;
        if (res instanceof ElementalStocks) {
            const prevStocks = this.stateVector.stocks instanceof ElementalStocks ? this.stateVector.stocks : null;
            if (prevStocks) {
                const initialTotal = prevStocks.totalMass();
                const currentTotal = res.totalMass();
                if (Math.abs(initialTotal - currentTotal) > 1e-6) {
                    throw new Error(`First Law Violation: Mass invariant broken! Initial: ${initialTotal}, Current: ${currentTotal}`);
                }
            }
            if (res.qLoss < (this.value instanceof ElementalStocks ? this.value.qLoss : 0)) {
                throw new Error(`Second Law Violation: qLoss cannot decrease.`);
            }
            nextVal = res;
            const t0 = this.stateVector.T_0;
            const sGen = 0.1;
            nextVec = {
                ...this.stateVector,
                timestamp: this.stateVector.timestamp + 1,
                mass: res.totalMass(),
                totalMass: res.totalMass(),
                entropyGenerationRate: sGen,
                exergyDestructionRate: t0 * sGen,
                stocks: res,
                massInventory: { carbon: res.carbon, nitrogen: res.nitrogen, phosphorus: res.phosphorus, oxygen: res.oxygen, water: res.water }
            };
        }
        else if (res && typeof res === 'object' && 'vector' in res && 'value' in res) {
            nextVal = res.value;
            nextVec = res.vector;
        }
        else {
            nextVal = res;
            nextVec = { ...this.stateVector, timestamp: this.stateVector.timestamp + 1 };
        }
        validateThermodynamicInvariants(nextVec);
        return new ThermodynamicMonad(nextVal, nextVec);
    }
    transform(sGenRate, dt) {
        if (sGenRate < 0) {
            throw new Error(`Second Law Violation: \u1e60_gen (${sGenRate}) < 0 W/K`);
        }
        const updatedVector = {
            ...this.stateVector,
            timestamp: this.stateVector.timestamp + dt,
            entropyGenerationRate: sGenRate,
            exergyDestructionRate: this.stateVector.T_0 * sGenRate,
            entropyMetrics: {
                ...(this.stateVector.entropyMetrics || { cumulativeQLoss: 0, exergyDestruction: this.stateVector.T_0 * sGenRate }),
                sGenRate,
                exergyDestruction: this.stateVector.T_0 * sGenRate,
                exergyDestructionRate: this.stateVector.T_0 * sGenRate
            }
        };
        validateThermodynamicInvariants(updatedVector);
        return new ThermodynamicMonad(this.value, updatedVector);
    }
    getStateVector() {
        return this.stateVector;
    }
    getValue() {
        return this.value;
    }
    validate() {
        const violations = [];
        if (this.stateVector.entropyGenerationRate < 0) {
            violations.push("Second Law Violation: negative entropy generation rate");
        }
        const t0 = this.stateVector.T_0;
        const sGen = this.stateVector.entropyGenerationRate;
        const exDest = this.stateVector.exergyDestructionRate;
        if (Math.abs(exDest - t0 * sGen) > 1e-4) {
            violations.push("Exergy Inconsistency: exergy destruction rate does not equal T_0 * S_gen");
        }
        return {
            isValid: violations.length === 0,
            violations
        };
    }
}
// Backward compatibility validation predicate
export function validateThermodynamicInvariants(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyMetrics?.sGenRate ?? 0;
    if (sGen < 0 || (state.entropyMetrics && state.entropyMetrics.sGenRate < 0)) {
        throw new Error(`Second Law Violation: Internal entropy generation rate cannot be negative: ${sGen}`);
    }
    const exergyDest = state.exergyDestructionRate ?? state.entropyMetrics?.exergyDestruction ?? (state.T_0 * sGen);
    const t0 = state.T_0 ?? 288.15;
    const expectedExDest = t0 * sGen;
    if (Math.abs(exergyDest - expectedExDest) > 1e-3) {
        throw new Error(`Exergy Inconsistency: Exergy destruction rate ${exergyDest} does not match T_0 * S_gen (${expectedExDest})`);
    }
    return true;
}
export function photosyntheticFixation(stocksOrCarbon, solarWatts, efficiency = 0.05) {
    const t0 = 288.15;
    if (typeof stocksOrCarbon === 'number') {
        const carbonMass = stocksOrCarbon;
        const entropyGen = solarWatts * 1e-4 + carbonMass * 1e-5;
        return {
            value: carbonMass * 1.05,
            vector: {
                timestamp: Date.now(),
                T_0: t0,
                internalEnergy: solarWatts * 0.1,
                entropy: carbonMass * 1.2,
                entropyGenerationRate: entropyGen,
                exergyDestructionRate: t0 * entropyGen,
                boundaryHeatFlux: { solarIn: solarWatts, infraredOut: -solarWatts * 0.95, sensibleLatentFlux: solarWatts * 0.05 },
                massInventory: { carbon: carbonMass }
            }
        };
    }
    else {
        const stocks = stocksOrCarbon;
        const mutated = stocks.clone();
        const fixedC = solarWatts * efficiency * 1e-4;
        mutated.carbon += fixedC;
        mutated.oxygen += fixedC * 2.66;
        mutated.qLoss += solarWatts * (1 - efficiency) * 1e-5;
        return mutated;
    }
}
export function cellularRespiration(stocksOrCarbon, metabolicRate) {
    const t0 = 288.15;
    if (typeof stocksOrCarbon === 'number') {
        const carbonMass = stocksOrCarbon;
        const entropyGen = metabolicRate * 0.01;
        return {
            value: Math.max(0, carbonMass * 0.98),
            vector: {
                timestamp: Date.now(),
                T_0: t0,
                internalEnergy: metabolicRate * 10,
                entropy: carbonMass * 1.5,
                entropyGenerationRate: entropyGen,
                exergyDestructionRate: t0 * entropyGen,
                boundaryHeatFlux: { solarIn: 0, infraredOut: -metabolicRate * 10, sensibleLatentFlux: 0 },
                massInventory: { carbon: carbonMass }
            }
        };
    }
    else {
        const stocks = stocksOrCarbon;
        const mutated = stocks.clone();
        const respiredC = metabolicRate * 0.1;
        mutated.carbon = Math.max(0, mutated.carbon - respiredC);
        mutated.qLoss += metabolicRate * 0.5;
        return mutated;
    }
}
