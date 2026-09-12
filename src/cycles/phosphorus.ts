/**
 * @fileoverview Phosphorus Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { IBoundaryFlux, STANDARD_AMBIENT_TEMPERATURE_K } from '../thermodynamics/types.js';

export class PhosphorusCycle extends BaseCycle {
  constructor() {
    super("Phosphorus Cycle");
    const defaultStocks = {
      lithosphere_rock: 4e9,
      soil: 200,
      biosphere: 3,
      ocean: 90000
    };
    for (const [k, v] of Object.entries(defaultStocks)) {
      this.stocks.set(k, v);
    }
  }

  public step(dt: number, solarFlux: number): void {
    const boundaryFlux: IBoundaryFlux = {
      solarRadiationIn: solarFlux,
      longwaveRadiationOut: solarFlux * 0.99,
      sensibleHeatFlux: solarFlux * 1e-6,
      latentHeatFlux: 0,
      netMassFlux: 0.1,
      netHeatFlux: solarFlux * 1e-6,
      solarIncoming: solarFlux,
      terrestrialOutgoing: solarFlux * 0.99,
      heatFluxes: [solarFlux * 1e-6],
      boundaryTemperatures: [290.0],
      massFluxes: [0.1],
      specificEnthalpies: [150],
      specificEntropies: [0.8],
      heatFluxRate: solarFlux * 1e-6,
      massFluxRate: 0.1,
      enthalpyInflowRate: solarFlux * 1e-6,
      entropyInflowRate: (solarFlux * 1e-6) / 290.0,
      fluxId: 'phosphorus_cycle_flux',
      species: 'phosphorus',
      massFlowRate: 0.1,
      specificEnthalpy: 150,
      specificEntropy: 0.8,
      heatTransferRate: solarFlux * 1e-6,
      boundaryTemperature: 290.0
    };
    const res = stepThermodynamicMonad(this.stateVector, boundaryFlux, solarFlux * 1e-6 * dt, (solarFlux * 1e-6 / 290.0) * dt, dt);
    this.stateVector = 'state' in res ? res.state : res;
  }
}

// Backward compatibility alias for sprint tests expecting PhosphorusCyclePOD
export { PhosphorusCycle as PhosphorusCyclePOD };