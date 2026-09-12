// Complete implementation of BaseCycle in src/cycles/base_cycle.ts
import { ThermodynamicStructure, EntropyState } from '../thermodynamics/thermodynamic_structure.js';
export class BaseCycle extends ThermodynamicStructure {
    reservoirs;
    initialTotalMass;
    coeffs;
    constructor(name, config) {
        super(name);
        this.reservoirs = new Map(Object.entries(config.initialStocks));
        this.coeffs = { ...config.transferCoefficients };
        // Also register them as Engine Stocks for thermodynamic monitoring
        for (const [resName, qty] of this.reservoirs.entries()) {
            this.addStock(resName, qty);
        }
        this.initialTotalMass = this.calculateTotalMass();
    }
    getStock(name) {
        return this.reservoirs.get(name) ?? 0;
    }
    getStocks() {
        return this.reservoirs;
    }
    transfer(from, to, amount) {
        const currentFrom = this.getStock(from);
        const actualTransfer = Math.min(currentFrom, Math.max(0, amount));
        const newFrom = currentFrom - actualTransfer;
        const currentTo = this.getStock(to);
        const newTo = currentTo + actualTransfer;
        this.reservoirs.set(from, newFrom);
        this.reservoirs.set(to, newTo);
        // Sync with ThermodynamicStructure stocks map
        const stockFrom = this.stocks.get(from);
        if (stockFrom)
            stockFrom.quantity = newFrom;
        const stockTo = this.stocks.get(to);
        if (stockTo)
            stockTo.quantity = newTo;
    }
    calculateTotalMass() {
        let total = 0;
        for (const val of this.reservoirs.values()) {
            total += val;
        }
        return total;
    }
    validateConservation(tolerance = 1e-6) {
        const currentTotal = this.calculateTotalMass();
        return Math.abs(currentTotal - this.initialTotalMass) <= tolerance;
    }
    validateMassBalance(initialTotal, tolerance = 1e-6) {
        const currentTotal = this.calculateTotalMass();
        return Math.abs(currentTotal - initialTotal) <= tolerance;
    }
    // ThermodynamicStructure abstract method implementations
    importFreeEnergy(_tick) {
        const totalMass = this.calculateTotalMass();
        const val = totalMass * 0.001;
        this.importFreeEnergyJoules(val * 1000, 0.9);
        return val;
    }
    exportEntropy(_tick) {
        const totalMass = this.calculateTotalMass();
        const val = totalMass * 0.0008;
        this.exportEntropyJoulesPerKelvin(val * 10);
        return val;
    }
    maintainFarFromEquilibrium(_tick) {
        return this.validateConservation(1e-4) ? EntropyState.STEADY : EntropyState.DEGRADING;
    }
}
