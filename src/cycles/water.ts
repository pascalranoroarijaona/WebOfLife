/**
 * @fileoverview Water Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { BoundaryFlux } from '../thermodynamics/types.js';

export class WaterCycle extends BaseCycle {
  constructor() {
    super("Water Cycle");
    const defaultStocks = {
      ocean: 1_338_000_000,
      atmosphere: 12900,
      ice: 24_064_000,
      groundwater: 23_400_000,
      surface_freshwater: 178_000
    };
    for (const [k, v] of Object.entries(defaultStocks)) {
      this.stocks.set(k, v);
    }
  }

  public step(dt: number, solarFlux: number): void {
    const boundaryFlux: BoundaryFlux = {
      netHeatFlux: solarFlux * 1e-3,
      netMassFlux: 15.0,
      solarIncoming: solarFlux,
      terrestrialOutgoing: solarFlux * 0.99,
      heatFluxes: [solarFlux * 1e-3],
      boundaryTemperatures: [300.0],
      massFluxes: [15.0],
      specificEnthalpies: [2260000],
      specificEntropies: [600]
    };
    const res = stepThermodynamicMonad(this.stateVector, boundaryFlux, solarFlux * 1e-3 * dt, (solarFlux * 1e-3 / 300.0) * dt, dt);
    this.stateVector = 'state' in res ? res.state : res;
  }
}

// Backward compatibility alias for sprint tests expecting WaterCyclePOD
export { WaterCycle as WaterCyclePOD };