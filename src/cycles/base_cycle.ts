// Complete implementation of BaseCycle in src/cycles/base_cycle.ts
import { ThermodynamicStructure, EntropyState } from '../thermodynamics/thermodynamic_structure.js';

export interface ReservoirState {
  [key: string]: number;
}

export interface CycleConfig {
  initialStocks: ReservoirState;
  transferCoefficients: Record<string, number>;
}

export abstract class BaseCycle extends ThermodynamicStructure {
  protected reservoirs: Map<string, number>;
  protected initialTotalMass: number;
  public coeffs: Record<string, number>;

  constructor(name: string, config: CycleConfig) {
    super(name);
    this.reservoirs = new Map(Object.entries(config.initialStocks));
    this.coeffs = { ...config.transferCoefficients };
    
    // Also register them as Engine Stocks for thermodynamic monitoring
    for (const [resName, qty] of this.reservoirs.entries()) {
      this.addStock(resName, qty);
    }
    
    this.initialTotalMass = this.calculateTotalMass();
  }

  public abstract step(deltaSeconds: number, solarInput: number): void;

  public getStock(name: string): number {
    return this.reservoirs.get(name) ?? 0;
  }

  public getStocks(): Map<string, number> {
    return this.reservoirs;
  }

  protected transfer(from: string, to: string, amount: number): void {
    const currentFrom = this.getStock(from);
    const actualTransfer = Math.min(currentFrom, Math.max(0, amount));
    const newFrom = currentFrom - actualTransfer;
    const currentTo = this.getStock(to);
    const newTo = currentTo + actualTransfer;

    this.reservoirs.set(from, newFrom);
    this.reservoirs.set(to, newTo);

    // Sync with ThermodynamicStructure stocks map
    const stockFrom = this.stocks.get(from);
    if (stockFrom) stockFrom.quantity = newFrom;
    const stockTo = this.stocks.get(to);
    if (stockTo) stockTo.quantity = newTo;
  }

  public calculateTotalMass(): number {
    let total = 0;
    for (const val of this.reservoirs.values()) {
      total += val;
    }
    return total;
  }

  public validateConservation(tolerance: number = 1e-6): boolean {
    const currentTotal = this.calculateTotalMass();
    return Math.abs(currentTotal - this.initialTotalMass) <= tolerance;
  }

  public validateMassBalance(initialTotal: number, tolerance: number = 1e-6): boolean {
    const currentTotal = this.calculateTotalMass();
    return Math.abs(currentTotal - initialTotal) <= tolerance;
  }

  // ThermodynamicStructure abstract method implementations
  public importFreeEnergy(_tick: number): number {
    const totalMass = this.calculateTotalMass();
    const val = totalMass * 0.001;
    this.importFreeEnergyJoules(val * 1000, 0.9);
    return val;
  }

  public exportEntropy(_tick: number): number {
    const totalMass = this.calculateTotalMass();
    const val = totalMass * 0.0008;
    this.exportEntropyJoulesPerKelvin(val * 10);
    return val;
  }

  public maintainFarFromEquilibrium(_tick: number): EntropyState {
    return this.validateConservation(1e-4) ? EntropyState.STEADY : EntropyState.DEGRADING;
  }
}