// File: src/thermodynamics/thermodynamic_structure.ts
import { EntropyState, Stock, Flow, ThermodynamicStateVector, BoundaryFluxVector, IThermodynamicSystem, evaluateThermodynamicState, assertSecondLaw } from './types.js';

export { EntropyState };
export type { Stock, Flow };

export class ThermodynamicStructure implements IThermodynamicSystem {
  public id: string;
  public stocks: Map<string, Stock> = new Map();
  public children: ThermodynamicStructure[] = [];
  public parent: ThermodynamicStructure | null = null;
  public energyJoules: number = 0;
  public entropyJoulesPerKelvin: number = 0;
  public entropyState: EntropyState = EntropyState.STEADY;
  public tickCreated: number = 0;
  
  protected _currentStateVector: ThermodynamicStateVector;

  constructor(public name: string) {
    this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    this._currentStateVector = {
      timestamp: 0,
      ambientTemperature: 288.15,
      systemTemperature: 288.15,
      internalEnergy: 1e6,
      totalEntropy: 3470.4,
      entropyGenerationRate: 10.0,
      exergyDestructionRate: 2881.5,
      boundaryFluxes: {
        solarRadiationIn: 1.74e17,
        thermalRadiationOut: 1.73e17,
        sensibleHeatFlux: 1e11,
        latentHeatFlux: 1e11,
        netMassEnthalpyFlux: 0
      }
    };
  }

  public addStock(name: string, quantity: number, capacity?: number): Stock {
    const stock: Stock = {
      name,
      quantity,
      capacity,
      utilization() {
        return capacity ? quantity / capacity : 0;
      },
    };
    this.stocks.set(name, stock);
    return stock;
  }

  public addChild(child: ThermodynamicStructure): void {
    child.parent = this;
    this.children.push(child);
  }

  public importFreeEnergyJoules(joules: number, efficiency: number = 1.0): void {
    this.energyJoules += joules * efficiency;
  }

  public exportEntropyJoulesPerKelvin(jPerK: number): void {
    this.entropyJoulesPerKelvin += jPerK;
  }

  public totalDescendantBiomass(): number {
    let sum = 0;
    for (const stock of this.stocks.values()) {
      if (stock.name === "biomass" || stock.name.includes("biomass")) {
        sum += stock.quantity;
      }
    }
    for (const child of this.children) {
      sum += child.totalDescendantBiomass();
    }
    return sum;
  }

  public tick(tickNum: number): ThermodynamicStateVector {
    this.tickCreated = tickNum;
    const dt = 1.0;
    const internalEnergy = Math.max(1e3, this.energyJoules + 1e6);
    const systemTemp = 288.15;
    const ambientTemp = 288.15;
    
    const fluxes: BoundaryFluxVector = {
      solarRadiationIn: 1.74e17,
      thermalRadiationOut: 1.73e17,
      sensibleHeatFlux: 1e10,
      latentHeatFlux: 1e10,
      netMassEnthalpyFlux: 0
    };

    this._currentStateVector = evaluateThermodynamicState(
      this._currentStateVector,
      internalEnergy,
      systemTemp,
      ambientTemp,
      fluxes,
      dt
    );

    assertSecondLaw(this._currentStateVector);
    return this._currentStateVector;
  }

  public getStateVector(): ThermodynamicStateVector {
    return this._currentStateVector;
  }

  public computeEntropyGeneration(dt: number): number {
    return this._currentStateVector.entropyGenerationRate * dt;
  }

  public verifySecondLaw(): boolean {
    return assertSecondLaw(this._currentStateVector);
  }
}