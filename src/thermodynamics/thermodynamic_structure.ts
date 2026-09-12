/**
 * Abstract Thermodynamic Structure base implementation
 */
import { ThermodynamicStateVector, BoundaryFlux, EntropyMetrics, ValidationResult } from './types.js';

export enum EntropyState {
  ACCUMULATING = "accumulating",
  STEADY = "steady",
  DEGRADING = "degrading",
  COLLAPSED = "collapsed"
}

export class Stock {
  constructor(
    public substance: string,
    public quantity: number,
    public maxCapacity?: number,
    public unit: string = "kg_equivalent_carbon"
  ) {}

  utilization(): number {
    if (!this.maxCapacity) return 0;
    return this.quantity / this.maxCapacity;
  }
}

export interface Flow {
  sourceId: string;
  targetId: string;
  substance: string;
  rate: number;
  flowType: string;
}

export abstract class AbstractThermodynamicStructure {
  protected _id: string;
  protected _temperature: number;
  protected _mass: number;
  protected _ambientTemperature: number;
  protected _internalEnergy: number;
  protected _entropy: number;
  protected _exergy: number;
  protected _boundaryFluxes: BoundaryFlux[] = [];
  protected lastEntropyGenerationRate: number = 0.0;

  constructor(id: string, temperature: number, mass: number, ambientTemperature: number = 288.15) {
    this._id = id;
    this._temperature = temperature;
    this._mass = mass;
    this._ambientTemperature = ambientTemperature;
    this._internalEnergy = mass * 1000 * temperature * 0.5; // Estimated specific heat approx
    this._entropy = this._internalEnergy / Math.max(1, temperature);
    this._exergy = Math.max(0, this._internalEnergy - ambientTemperature * this._entropy);
  }

  public get id(): string {
    return this._id;
  }

  protected abstract computeInternalEntropyGeneration(): number;

  protected validateSecondLaw(entropyGenerationRate: number): void {
    if (entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation: Internal entropy generation rate (\dot{S}_{gen}) cannot be negative: ${entropyGenerationRate}`);
    }
  }

  public updateExergy(): void {
    const deltaT = this._temperature - this._ambientTemperature;
    this._exergy = Math.max(0, this._internalEnergy - this._ambientTemperature * this._entropy + deltaT * this._mass);
  }

  public getStateVector(): ThermodynamicStateVector {
    const sGenRate = Math.max(0, this.computeInternalEntropyGeneration());
    const exergyDest = this._ambientTemperature * sGenRate;

    const entropyMetrics: EntropyMetrics = {
      sGenRate,
      exergyDestruction: exergyDest,
      cumulativeQLoss: sGenRate * 10.0,
      referenceTemperature: this._ambientTemperature,
      exergyDestructionRate: exergyDest
    };

    return {
      timestamp: Date.now(),
      T_0: this._ambientTemperature,
      internalEnergy: this._internalEnergy,
      entropy: this._entropy,
      entropyGenerationRate: sGenRate,
      exergyDestructionRate: exergyDest,
      boundaryHeatFlux: {
        solarIn: 1000,
        infraredOut: -950,
        sensibleLatentFlux: 50
      },
      massInventory: {
        carbon: this._mass * 0.45,
        nitrogen: this._mass * 0.04,
        phosphorus: this._mass * 0.005,
        water: this._mass * 0.5
      },
      temperature: this._temperature,
      ambientTemperature: this._ambientTemperature,
      mass: this._mass,
      totalMass: this._mass,
      exergy: this._exergy,
      entropyMetrics,
      stocks: {
        carbon: this._mass * 0.45,
        nitrogen: this._mass * 0.04,
        phosphorus: this._mass * 0.005,
        oxygen: this._mass * 0.2,
        water: this._mass * 0.3,
        energyStored: this._internalEnergy,
        qLoss: entropyMetrics.cumulativeQLoss
      },
      boundaryFluxes: [...this._boundaryFluxes],
      system: {
        temperature: this._temperature,
        internalEnergy: this._internalEnergy,
        entropy: this._entropy,
        exergy: this._exergy
      },
      ambientReference: {
        temperature0: this._ambientTemperature,
        pressure0: 101325
      }
    };
  }

  public enforceMassConservation(initialMass: number, currentMass: number, tolerance: number = 1e-9): void {
    if (Math.abs(initialMass - currentMass) > tolerance) {
      throw new Error(`First Law Violation: Mass invariant broken! Initial: ${initialMass}, Current: ${currentMass}`);
    }
  }
}

export abstract class ThermodynamicStructure extends AbstractThermodynamicStructure {
  public name: string;
  public stocks: Map<string, Stock> = new Map();
  public inboundFlows: Flow[] = [];
  public outboundFlows: Flow[] = [];
  public entropyState: EntropyState = EntropyState.STEADY;
  public tickCreated: number = 0;
  public parent: ThermodynamicStructure | null = null;
  public children: ThermodynamicStructure[] = [];

  constructor(name: string = "unnamed", id?: string) {
    super(id ?? crypto.randomUUID(), 298.15, 1000.0, 288.15);
    this.name = name;
  }

  public get id(): string {
    return this._id;
  }

  protected computeInternalEntropyGeneration(): number {
    return Math.abs(this._internalEnergy * 1e-6);
  }

  public importFreeEnergyJoules(joules: number, qualityFactor: number = 1.0): void {
    if (joules < 0 || qualityFactor < 0 || qualityFactor > 1) {
      throw new Error("Invalid free energy parameters: energy and quality factor must be non-negative, quality <= 1.");
    }
    this._internalEnergy += joules;
    const importedExergy = joules * qualityFactor;
    this._exergy = Math.max(0, this._exergy + importedExergy);
    const estimatedC_v = 1000;
    this._temperature += joules / (this._mass * estimatedC_v);
    this.updateExergy();
  }

  public exportEntropyJoulesPerKelvin(joulesPerKelvin: number): void {
    if (joulesPerKelvin < 0) {
      throw new Error("Entropy export quantity cannot be negative.");
    }
    this._entropy = Math.max(0, this._entropy - joulesPerKelvin);
    this.updateExergy();
  }

  public maintainFarFromEquilibriumSeconds(deltaTimeSeconds: number): void {
    if (deltaTimeSeconds <= 0) return;
    const internalEntropyGenRate = this.computeInternalEntropyGeneration();
    const validEntropyGenRate = Math.max(0, internalEntropyGenRate);
    this.validateSecondLaw(validEntropyGenRate);

    const monad = (globalThis as any).ThermodynamicMonad?.of ? (globalThis as any).ThermodynamicMonad.of(this.getStateVector()) : null;
    if (monad) {
      const stateVec = monad.transform(validEntropyGenRate, deltaTimeSeconds).getStateVector();
      this._entropy = stateVec.entropy ?? stateVec.internalEnergy / Math.max(1, stateVec.temperature ?? 288.15);
      this._exergy = stateVec.exergy ?? stateVec.internalEnergy * 0.1;
      this.lastEntropyGenerationRate = stateVec.entropyGenerationRate;
    }
  }

  abstract importFreeEnergy(tick: number): number;
  abstract exportEntropy(tick: number): number;
  abstract maintainFarFromEquilibrium(tick: number): EntropyState;

  addStock(substance: string, quantity: number, maxCapacity?: number): void {
    this.stocks.set(substance, new Stock(substance, quantity, maxCapacity));
  }

  netFlow(substance: string): number {
    const inflow = this.inboundFlows
      .filter((f) => f.substance === substance)
      .reduce((sum, f) => sum + f.rate, 0);
    const outflow = this.outboundFlows
      .filter((f) => f.substance === substance)
      .reduce((sum, f) => sum + f.rate, 0);
    return inflow - outflow;
  }

  addChild(child: ThermodynamicStructure): void {
    child.parent = this;
    this.children.push(child);
  }

  totalDescendantBiomass(): number {
    const own = this.stocks.get("biomass")?.quantity ?? 0;
    return own + this.children.reduce((sum, c) => sum + c.totalDescendantBiomass(), 0);
  }

  tick(tickNum: number) {
    const imported = this.importFreeEnergy(tickNum);
    const exported = this.exportEntropy(tickNum);
    this.entropyState = this.maintainFarFromEquilibrium(tickNum);
    this.maintainFarFromEquilibriumSeconds(1.0);
    return { imported, exported, state: this.entropyState };
  }

  toString(): string {
    return `<${this.constructor.name} '${this.name}' state=${this.entropyState}>`;
  }
}