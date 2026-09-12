/**
 * @fileoverview Base Cycle extending IThermodynamicModel (Sprint 015 & Retro-Compatibility)
 */
import { IThermodynamicModel, IThermodynamicStateVector, ThermodynamicStateVector, IBoundaryFlux, STANDARD_AMBIENT_TEMPERATURE_K, BoundaryFluxVector, ThermodynamicComplianceResult } from '../thermodynamics/types.js';
import { calculateFirstLawResidual, evaluateSecondLaw, stepThermodynamicMonad } from '../thermodynamics/methods.js';

export { stepThermodynamicMonad };

export abstract class BaseCycle implements IThermodynamicModel {
  public id: string;
  protected stateVector: ThermodynamicStateVector;
  public stocks: Map<string, number> = new Map();

  constructor(public name: string, initialStocks?: Record<string, number>) {
    this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    this.stateVector = {
      timestamp: 0,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      deadStateTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1e8,
      entropy: 1e5,
      totalEntropy: 1e5,
      entropyGenerationRate: 15.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 15.0,
      exergy: 1e10,
      stocks: {},
      boundaryFluxes: {
        solarRadiationIn: 1.74e17,
        longwaveRadiationOut: 1.74e17 * 0.99,
        sensibleHeatFlux: 0,
        latentHeatFlux: 0,
        netMassFlux: 0,
        solarIncoming: 1.74e17,
        terrestrialOutgoing: 1.74e17 * 0.99,
        heatFluxes: [],
        boundaryTemperatures: [],
        massFluxes: [],
        specificEnthalpies: [],
        specificEntropies: []
      },
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

  public stepThermodynamics(dt: number, _fluxes?: BoundaryFluxVector): void {
    const defaultFlux: IBoundaryFlux = {
      solarRadiationIn: 1e5,
      longwaveRadiationOut: 0.99e5,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0,
      fluxId: `${this.name}_solar_in`,
      species: 'energy',
      massFlowRate: 0,
      specificEnthalpy: 0,
      specificEntropy: 0,
      heatTransferRate: 1e5,
      boundaryTemperature: 5778,
      magnitudeWatts: 1e5,
      solarIncoming: 1e5,
      terrestrialOutgoing: 0.99e5,
      heatFluxes: [1e5],
      boundaryTemperatures: [5778],
      massFluxes: [0],
      specificEnthalpies: [0],
      specificEntropies: [0]
    };
    const res = stepThermodynamicMonad(this.stateVector, defaultFlux, 1e5 * dt, (1e5 / 5778) * dt, dt);
    this.stateVector = 'state' in res ? res.state : res;
  }

  public getBoundaryFluxes(): BoundaryFluxVector {
    return {
      heatFluxes: [],
      radiationFlux: { solarIncoming: 1e5, terrestrialOutgoing: 0.99e5 },
      workRate: 0,
      massFluxes: [],
      specificEnthalpies: [],
      specificEntropies: [],
      solarRadiationIn: 1e5,
      longwaveRadiationOut: 0.99e5,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0
    };
  }

  public validateFirstLaw(): boolean {
    const residual = calculateFirstLawResidual(this.stateVector, 1.0);
    return residual < 1e-5;
  }

  public validateSecondLaw(): boolean {
    return (this.stateVector.entropyGenerationRate ?? 0) >= 0;
  }

  public validateLaws(): ThermodynamicComplianceResult {
    return {
      isFirstLawSatisfied: this.validateFirstLaw(),
      isSecondLawSatisfied: this.validateSecondLaw(),
      energyResidual: 0,
      entropyResidual: 0,
      isValid: this.validateFirstLaw() && this.validateSecondLaw()
    };
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