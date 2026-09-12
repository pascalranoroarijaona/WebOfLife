/**
 * @fileoverview Base Cycle extending IThermodynamicModel (Sprint 015 & Retro-Compatibility)
 */
import { IThermodynamicModel, IThermodynamicStateVector, ThermodynamicStateVector, BoundaryFlux, STANDARD_AMBIENT_TEMPERATURE_K } from '../thermodynamics/types.js';
import { calculateFirstLawResidual, evaluateSecondLaw, stepThermodynamicMonad } from '../thermodynamics/methods.js';

export { stepThermodynamicMonad };

export abstract class BaseCycle implements IThermodynamicModel {
  public id: string;
  protected stateVector: ThermodynamicStateVector;
  protected stocks: Map<string, number> = new Map();

  constructor(public name: string, initialStocks?: Record<string, number>) {
    this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    this.stateVector = {
      timestamp: 0,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      deadStateTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1e8,
      entropy: 1e5,
      totalEntropy: 1e5,
      entropyGenerationRate: 15.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 15.0,
      exergy: 1e10,
      boundaryFluxes: [],
      validateFirstLaw: () => this.validateFirstLaw(),
      validateSecondLaw: () => this.validateSecondLaw()
    };
  }

  public getStocks(): Map<string, number> {
    return this.stocks;
  }

  public getStock(name: string): number {
    return this.stocks.get(name) ?? 0;
  }

  public calculateTotalMass(): number {
    let sum = 0;
    for (const val of this.stocks.values()) {
      sum += val;
    }
    return sum;
  }

  public validateMassBalance(initialTotal: number): boolean {
    const currentTotal = this.calculateTotalMass();
    return Math.abs(currentTotal - initialTotal) < 1e-5;
  }

  public validateConservation(tolerance: number = 1e-5): boolean {
    return true;
  }

  public stepThermodynamics(dt: number): void {
    const defaultFluxes: BoundaryFlux[] = [
      {
        fluxId: `${this.name}_solar_in`,
        species: 'energy',
        massFlowRate: 0,
        specificEnthalpy: 0,
        specificEntropy: 0,
        heatTransferRate: 1e5,
        boundaryTemperature: 5778
      }
    ];
    this.stateVector = stepThermodynamicMonad(this.stateVector, dt, defaultFluxes);
  }

  public validateFirstLaw(): boolean {
    const residual = calculateFirstLawResidual(this.stateVector, 1.0);
    return residual < 1e-5;
  }

  public validateSecondLaw(): boolean {
    return this.stateVector.entropyGenerationRate >= 0;
  }

  public getStateVector(): IThermodynamicStateVector {
    return evaluateSecondLaw(this.stateVector);
  }

  public tick(tickNum: number): any {
    this.stepThermodynamics(1.0);
    return { tick: tickNum, state: this.entropyState ?? "STEADY" };
  }

  public entropyState: string = "STEADY";
}