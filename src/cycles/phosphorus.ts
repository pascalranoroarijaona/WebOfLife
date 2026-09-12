/**
 * @fileoverview Phosphorus Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { IBoundaryFlux } from '../thermodynamics/types.js';

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
      netHeatFlux: solarFlux * 1e-6,
      netMassFlux: 0.1,
      solarIncoming: solarFlux,
      terrestrialOutgoing: solarFlux * 0.99,
      heatFluxes: [solarFlux * 1e-6],
      boundaryTemperatures: [290.0],
      massFluxes: [0.1],
      specificEnthalpies: [150],
      specificEntropies: [0.8]
    };
    const res = stepThermodynamicMonad(this.stateVector, boundaryFlux, solarFlux * 1e-6 * dt, (solarFlux * 1e-6 / 290.0) * dt, dt);
    this.stateVector = 'state' in res ? res.state : res;
  }
}

// Backward compatibility alias for sprint tests expecting PhosphorusCyclePOD
export { PhosphorusCycle as PhosphorusCyclePOD };