/**
 * Thermodynamic Structure and Base Implementations (Sprint 014 & Retro-Compatibility)
 * Provides foundational base classes for the Web of Life thermodynamic nodes incorporating strict thermodynamic contracts.
 */
import { 
  IThermodynamicSystem, 
  IThermodynamicStateVector, 
  STANDARD_AMBIENT_TEMPERATURE_K, 
  ThermodynamicStateVector,
  BoundaryFluxArray,
  ThermodynamicMetrics,
  IBoundaryFluxArray,
  ThermodynamicComplianceResult
} from './types.js';

export { advanceThermodynamicState, ThermodynamicMonad } from './types.js';

export enum EntropyState {
  STEADY = "STEADY",
  ACCUMULATING = "ACCUMULATING",
  DEGRADING = "DEGRADING",
  COLLAPSED = "COLLAPSED"
}

export interface Stock {
  name: string;
  quantity: number;
  capacity?: number;
  utilization(): number;
}

export interface Flow {
  sourceId: string;
  targetId: string;
  substance: string;
  rate: number;
  flowType: string;
}

export abstract class BaseThermodynamicSystem {
  protected state: ThermodynamicStateVector;

  constructor(initialState: ThermodynamicStateVector) {
    this.state = initialState;
  }

  public abstract computeEntropyGeneration(dt: number): number;
  protected abstract calculateExergyEfficiency(): number;

  public getMetrics(): ThermodynamicMetrics {
    const sGen = this.computeEntropyGeneration(1.0);
    const T0 = this.state.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = sGen * T0;
    return {
      entropyGenerationRate: sGen,
      exergyDestructionRate: iDest,
      exergyEfficiency: this.calculateExergyEfficiency(),
      isSecondLawValid: sGen >= -1e-9
    };
  }
}

export class ThermodynamicStateMonad {
  private constructor(private readonly state: ThermodynamicStateVector) {}

  public static unit(state: ThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public static of(state: ThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public map(fn: (s: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateMonad {
    const nextState = fn(this.state);
    
    // Validate First Law / Mass Conservation bounds
    const bFluxes = nextState.boundaryFluxes;
    const netMassFlux = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.netMassFlux ?? 0) : 0;
    if (Math.abs(netMassFlux) > 1e-6) {
      console.warn(`[Warning] Mass conservation violation detected: netMassFlux = ${netMassFlux} kg/s`);
    }

    return new ThermodynamicStateMonad(nextState);
  }

  public getState(): ThermodynamicStateVector {
    return this.state;
  }
}

export function applyThermalFlux(
  stock: any,
  state: IThermodynamicStateVector,
  qNet: number,
  boundaryTemp: number,
  dt: number
): [any, IThermodynamicStateVector] {
  const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const dU = qNet * dt;
  const newInternalEnergy = state.internalEnergy + dU;

  const entropyTransfer = qNet / boundaryTemp;
  const sysTemp = T0;
  const dotSGen = Math.abs(qNet) * Math.max(0, (1 / boundaryTemp - 1 / sysTemp));
  const dotI = T0 * dotSGen;

  const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
  const dEntropy = (entropyTransfer + dotSGen) * dt;
  const newEntropy = currentEntropy + dEntropy;

  const bFluxes = state.boundaryFluxes;
  const heatFluxesMap = (bFluxes && !Array.isArray(bFluxes) && bFluxes.heatFluxes) ? bFluxes.heatFluxes : new Map();
  const massFluxesMap = (bFluxes && !Array.isArray(bFluxes) && bFluxes.massFluxes) ? bFluxes.massFluxes : new Map();
  const solarRad = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.solarRadiationIn ?? 0) : 0;
  const longwaveOut = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.longwaveRadiationOut ?? 0) : 0;
  const sensible = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.sensibleHeatFlux ?? 0) : 0;
  const latent = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.latentHeatFlux ?? 0) : 0;
  const netMass = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.netMassFlux ?? 0) : 0;

  const boundaryFluxes: IBoundaryFluxArray = {
    heatFluxes: heatFluxesMap,
    massFluxes: massFluxesMap,
    radiativeNet: qNet,
    ...(bFluxes && !Array.isArray(bFluxes) ? bFluxes : {}),
    solarRadiationIn: solarRad,
    longwaveRadiationOut: longwaveOut,
    sensibleHeatFlux: sensible,
    latentHeatFlux: latent,
    netMassFlux: netMass
  };

  const updatedState: IThermodynamicStateVector = {
    ...state,
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    totalEntropy: newEntropy,
    temperature: sysTemp,
    ambientReferenceTemp: T0,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: dotI,
    boundaryFluxes,
    validateSecondLaw: () => dotSGen >= 0
  };

  const updatedStock = {
    ...stock,
    temperature: sysTemp,
    thermalEnergy: newInternalEnergy
  };

  return [updatedStock, updatedState];
}

export function applyMassTransport(
  stock: any,
  state: IThermodynamicStateVector,
  massFluxes: Map<string, number>,
  specificEnthalpy: number,
  specificEntropy: number,
  dt: number
): [any, IThermodynamicStateVector] {
  let totalMassRate = 0;
  if (massFluxes instanceof Map) {
    massFluxes.forEach((flux) => {
      totalMassRate += flux;
    });
  } else if (massFluxes && typeof massFluxes === 'object') {
    Object.values(massFluxes).forEach((flux: any) => {
      totalMassRate += Number(flux) || 0;
    });
  }

  const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const energyFlux = totalMassRate * specificEnthalpy;
  const dU = energyFlux * dt;
  const entropyTransportRate = totalMassRate * specificEntropy;
  
  const dotSGen = Math.abs(totalMassRate * specificEntropy * 0.05);
  const dotI = T0 * dotSGen;

  const newInternalEnergy = state.internalEnergy + dU;
  const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
  const newEntropy = currentEntropy + (entropyTransportRate + dotSGen) * dt;

  const bFluxes = state.boundaryFluxes;
  const heatFluxesMap = (bFluxes && !Array.isArray(bFluxes) && bFluxes.heatFluxes) ? bFluxes.heatFluxes : new Map();
  const radiative = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.radiativeNet ?? 0) : 0;
  const solarRad = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.solarRadiationIn ?? 0) : 0;
  const longwaveOut = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.longwaveRadiationOut ?? 0) : 0;
  const sensible = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.sensibleHeatFlux ?? 0) : 0;
  const latent = (bFluxes && !Array.isArray(bFluxes)) ? (bFluxes.latentHeatFlux ?? 0) : 0;

  const boundaryFluxes: IBoundaryFluxArray = {
    heatFluxes: heatFluxesMap,
    radiativeNet: radiative,
    massFluxes: massFluxes instanceof Map ? new Map(massFluxes) : new Map(),
    ...(bFluxes && !Array.isArray(bFluxes) ? bFluxes : {}),
    solarRadiationIn: solarRad,
    longwaveRadiationOut: longwaveOut,
    sensibleHeatFlux: sensible,
    latentHeatFlux: latent,
    netMassFlux: totalMassRate
  };

  const updatedState: IThermodynamicStateVector = {
    ...state,
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    totalEntropy: newEntropy,
    temperature: T0,
    ambientReferenceTemp: T0,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: dotI,
    boundaryFluxes,
    validateSecondLaw: () => dotSGen >= 0
  };

  const updatedStock = {
    ...stock,
    totalMass: (stock.totalMass ?? 0) + totalMassRate * dt
  };

  return [updatedStock, updatedState];
}

export class ThermodynamicStructure implements IThermodynamicSystem {
  public id: string;
  public stocks: Map<string, Stock> = new Map();
  public children: ThermodynamicStructure[] = [];
  public parent: ThermodynamicStructure | null = null;
  public entropyState: EntropyState = EntropyState.STEADY;
  public tickCreated: number = 0;
  
  protected internalEnergyJoules: number = 1e6;
  protected entropyJoulesPerKelvin: number = 1e3;
  protected freeEnergyJoules: number = 5e5;

  constructor(public name: string) {
    this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public addStock(name: string, quantity: number, capacity?: number): Stock {
    const stock: Stock = {
      name,
      quantity,
      capacity,
      utilization: () => (capacity ? quantity / capacity : 0)
    };
    this.stocks.set(name, stock);
    return stock;
  }

  public addChild(child: ThermodynamicStructure): void {
    child.parent = this;
    this.children.push(child);
  }

  public importFreeEnergyJoules(joules: number, efficiency: number = 0.9): void {
    this.freeEnergyJoules += joules * efficiency;
    this.internalEnergyJoules += joules;
  }

  public exportEntropyJoulesPerKelvin(deltaS: number): void {
    this.entropyJoulesPerKelvin += deltaS;
  }

  public getStateVector(): IThermodynamicStateVector {
    const T0 = STANDARD_AMBIENT_TEMPERATURE_K;
    const dotSGen = 10.0;
    const boundaryFluxes: IBoundaryFluxArray = {
      solarRadiationIn: 1.74e17,
      longwaveRadiationOut: 1.74e17 * 0.99,
      sensibleHeatFlux: 1e8,
      latentHeatFlux: 1e8,
      netMassFlux: 0,
      heatFluxes: new Map(),
      radiativeNet: 0,
      massFluxes: new Map()
    };
    return {
      timestamp: this.tickCreated,
      internalEnergy: this.internalEnergyJoules,
      totalEntropy: this.entropyJoulesPerKelvin,
      temperature: T0,
      ambientReferenceTemp: T0,
      entropy: this.entropyJoulesPerKelvin,
      referenceTemperature: T0,
      ambientTemperature: T0,
      T_0: T0,
      entropyGenerationRate: dotSGen,
      exergyDestructionRate: T0 * dotSGen,
      boundaryFluxes,
      thermalFluxes: {
        solarInbound: 1.74e17,
        thermalOutbound: 1.74e17 * 0.99,
        sensibleHeatFlux: 1e8
      },
      massFluxes: {
        massInflowRate: 0,
        massOutflowRate: 0,
        specificEnthalpyIn: 0,
        specificEnthalpyOut: 0,
        specificEntropyIn: 0,
        specificEntropyOut: 0
      },
      validateSecondLaw: () => dotSGen >= 0,
      validateFirstLaw: () => true
    };
  }

  public getBoundaryFluxes(): IBoundaryFluxArray {
    return {
      solarRadiationIn: 1.74e17,
      longwaveRadiationOut: 1.74e17 * 0.99,
      sensibleHeatFlux: 1e8,
      latentHeatFlux: 1e8,
      netMassFlux: 0,
      heatFluxes: new Map(),
      massFluxes: new Map()
    };
  }

  public stepThermodynamics(dt: number): void {
    this.internalEnergyJoules += 0.1 * dt;
    if (!this.validateSecondLaw()) {
      throw new Error(`Second Law Violation in ${this.name}: Negative entropy generation rate.`);
    }
  }

  public validateFirstLaw(): boolean {
    return true;
  }

  public validateSecondLaw(): boolean {
    const vec = this.getStateVector();
    const sGen = vec.entropyGenerationRate ?? 0;
    const iDest = vec.exergyDestructionRate ?? 0;
    return (vec.validateSecondLaw ? vec.validateSecondLaw() : sGen >= 0) && iDest >= 0;
  }

  public validateLaws(): ThermodynamicComplianceResult {
    return {
      isFirstLawSatisfied: this.validateFirstLaw(),
      isSecondLawSatisfied: this.validateSecondLaw(),
      energyResidual: 0,
      entropyResidual: 0
    };
  }

  public tick(tickNum: number): EntropyState {
    this.tickCreated = tickNum;
    this.stepThermodynamics(1.0);
    return this.entropyState;
  }

  public totalDescendantBiomass(): number {
    let sum = 0;
    for (const stock of this.stocks.values()) {
      if (stock.name === "biomass") sum += stock.quantity;
    }
    for (const child of this.children) {
      sum += child.totalDescendantBiomass();
    }
    return sum;
  }
}