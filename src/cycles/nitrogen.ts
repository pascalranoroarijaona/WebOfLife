/**
 * @fileoverview Nitrogen Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { IBoundaryFlux, STANDARD_AMBIENT_TEMPERATURE_K } from '../thermodynamics/types.js';

export class NitrogenCycle extends BaseCycle {
  constructor() {
    super("Nitrogen Cycle");
    const defaultStocks = {
      atmosphere: 3_900_000,
      soil: 100,
      biosphere: 3.5,
      ocean: 700
    };
    for (const [k, v] of Object.entries(defaultStocks)) {
      this.stocks.set(k, v);
    }
  }

  public step(dt: number, solarFlux: number): void {
    const boundaryFlux: IBoundaryFlux = {
      solarRadiationIn: solarFlux,
      longwaveRadiationOut: solarFlux * 0.99,
      sensibleHeatFlux: solarFlux * 1e-5,
      latentHeatFlux: 0,
      netMassFlux: 0.5,
      netHeatFlux: solarFlux * 1e-5,
      solarIncoming: solarFlux,
      terrestrialOutgoing: solarFlux * 0.99,
      heatFluxes: [solarFlux * 1e-5],
      boundaryTemperatures: [295.0],
      massFluxes: [0.5],
      specificEnthalpies: [300],
      specificEntropies: [1.5],
      heatFluxRate: solarFlux * 1e-5,
      massFluxRate: 0.5,
      enthalpyInflowRate: solarFlux * 1e-5,
      entropyInflowRate: (solarFlux * 1e-5) / 295.0
    };
    const res = stepThermodynamicMonad(this.stateVector, boundaryFlux, solarFlux * 1e-5 * dt, (solarFlux * 1e-5 / 295.0) * dt, dt);
    this.stateVector = 'state' in res ? res.state : res;
  }
}

// Backward compatibility alias for sprint tests expecting NitrogenCyclePOD
export { NitrogenCycle as NitrogenCyclePOD };