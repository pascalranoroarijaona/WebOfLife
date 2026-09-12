/**
 * @fileoverview Phosphorus Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
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
    step(dt, solarFlux) {
        const flux = {
            heatFluxes: [solarFlux * 1e-6],
            boundaryTemperatures: [290.0],
            massFluxes: [0.1],
            specificEnthalpies: [150],
            specificEntropies: [0.8],
            fluxId: "phosphorus_weathering_flux",
            species: "po4",
            massFlowRate: 0.1,
            specificEnthalpy: 150,
            specificEntropy: 0.8,
            heatTransferRate: solarFlux * 1e-6,
            boundaryTemperature: 290.0
        };
        this.stateVector = stepThermodynamicMonad(this.stateVector, dt, [flux]);
    }
}
// Backward compatibility alias for sprint tests expecting PhosphorusCyclePOD
export { PhosphorusCycle as PhosphorusCyclePOD };
