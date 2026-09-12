/**
 * @fileoverview Carbon Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { BoundaryFlux } from '../thermodynamics/types.js';

export class CarbonCycle extends BaseCycle {
  constructor(options?: { initialStocks?: Record<string, number> }) {
    super("Carbon Cycle");
    const defaultStocks = {
      atmosphere: 850,
      terrestrial_biosphere: 550,
      ocean_surface: 900,
      ocean_deep: 37000,
      soil: 1500,
      lithosphere: 100_000_000,
      lithosphere_fossil: 100_000_000
    };
    const initial = options?.initialStocks ?? defaultStocks;
    for (const [k, v] of Object.entries(initial)) {
      this.stocks.set(k, v);
    }
  }

  public step(dt: number, solarFlux: number): void {
    const flux: BoundaryFlux = {
      fluxId: "carbon_solar_flux",
      species: "co2",
      massFlowRate: 1.2,
      specificEnthalpy: 500,
      specificEntropy: 2.1,
      heatTransferRate: solarFlux * 1e-4,
      boundaryTemperature: 298.15
    };
    this.stateVector = stepThermodynamicMonad(this.stateVector, dt, [flux]);
  }
}

// Backward compatibility alias for sprint tests expecting CarbonCyclePOD
export { CarbonCycle as CarbonCyclePOD };