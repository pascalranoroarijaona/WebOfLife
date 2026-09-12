/**
 * @fileoverview Water Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
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
    step(dt, solarFlux) {
        const flux = {
            heatFluxes: [solarFlux * 1e-3],
            boundaryTemperatures: [300.0],
            massFluxes: [15.0],
            specificEnthalpies: [2260000],
            specificEntropies: [600],
            fluxId: "water_evaporation_flux",
            species: "h2o",
            massFlowRate: 15.0,
            specificEnthalpy: 2260000,
            specificEntropy: 600,
            heatTransferRate: solarFlux * 1e-3,
            boundaryTemperature: 300.0
        };
        this.stateVector = stepThermodynamicMonad(this.stateVector, dt, [flux]);
    }
}
// Backward compatibility alias for sprint tests expecting WaterCyclePOD
export { WaterCycle as WaterCyclePOD };
