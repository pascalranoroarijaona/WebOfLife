/**
 * @fileoverview Nitrogen Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { BoundaryFlux } from '../thermodynamics/types.js';

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
    const flux: BoundaryFlux = {
      heatFluxes: [solarFlux * 1e-5],
      boundaryTemperatures: [295.0],
      massFluxes: [0.5],
      specificEnthalpies: [300],
      specificEntropies: [1.5],
      fluxId: "nitrogen_fixation_flux",
      species: "n2",
      massFlowRate: 0.5,
      specificEnthalpy: 300,
      specificEntropy: 1.5,
      heatTransferRate: solarFlux * 1e-5,
      boundaryTemperature: 295.0
    };
    this.stateVector = stepThermodynamicMonad(this.stateVector, dt, [flux]);
  }
}

// Backward compatibility alias for sprint tests expecting NitrogenCyclePOD
export { NitrogenCycle as NitrogenCyclePOD };