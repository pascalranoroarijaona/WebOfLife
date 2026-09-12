import { ThermodynamicStateVector } from './types.js';

export class AbstractThermodynamicStructure {
  protected _id: string;
  protected _temperature: number;
  protected _mass: number;
  protected _internalEnergy: number;
  protected _entropy: number;
  protected _exergy: number;
  protected _ambientTemperature: number;
  protected lastEntropyGenerationRate: number = 0.0;

  constructor(id: string, temperature: number, mass: number, internalEnergyOrAmbient: number) {
    this._id = id;
    this._temperature = temperature;
    this._mass = mass;
    this._ambientTemperature = internalEnergyOrAmbient > 1000 ? 288.15 : internalEnergyOrAmbient;
    this._internalEnergy = internalEnergyOrAmbient > 1000 ? internalEnergyOrAmbient : mass * 1000;
    this._entropy = this._internalEnergy / Math.max(1, temperature);
    this._exergy = Math.max(0, this._internalEnergy - this._ambientTemperature * this._entropy);
  }

  public get ambientTemperature(): number {
    return this._ambientTemperature;
  }

  protected updateExergy(): void {
    const T_0 = this._ambientTemperature;
    this._exergy = Math.max(0, this._internalEnergy - T_0 * this._entropy);
  }

  protected validateSecondLaw(sGenRate: number): void {
    if (sGenRate < 0) {
      throw new Error(`Second Law Violation: sGenRate (${sGenRate}) cannot be negative.`);
    }
  }

  protected computeEntropyGeneration(): number {
    return Math.abs(this._internalEnergy * 1e-6);
  }

  public getStateVector(): ThermodynamicStateVector {
    const sGenRate = this.lastEntropyGenerationRate || this.computeEntropyGeneration();
    const T_0 = this._ambientTemperature;
    const exergyDestructionRate = T_0 * sGenRate;

    return {
      timestamp: Date.now(),
      internalEnergy: this._internalEnergy,
      totalMass: this._mass,
      temperature: this._temperature,
      fluxes: {
        radiativeFlux: 1.74e17 * 0.1,
        convectiveFlux: 0.0,
        massEnthalpyFlux: 0.0,
        speciesMassFluxes: { carbon: 0.0, water: 0.0 },
      },
      entropyMetrics: {
        sGenRate,
        referenceTemperature: T_0,
        exergyDestructionRate,
      },
      system: {
        temperature: this._temperature,
        internalEnergy: this._internalEnergy,
        entropy: this._entropy,
        exergy: this._exergy,
      },
      ambientReference: {
        temperature0: T_0,
        pressure0: 101325,
      },
      entropyGenerationRate: sGenRate,
      exergyDestructionRate,
    };
  }
}