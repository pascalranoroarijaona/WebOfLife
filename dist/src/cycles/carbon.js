/**
 * @fileoverview Carbon Cycle implementation extending BaseCycle (Sprint 015)
 */
import { BaseCycle, stepThermodynamicMonad } from './base_cycle.js';
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../thermodynamics/types.js';
export class CarbonCycle extends BaseCycle {
    constructor(options) {
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
    step(dt, solarFlux) {
        const boundaryFlux = {
            solarRadiationIn: solarFlux,
            longwaveRadiationOut: solarFlux * 0.99,
            sensibleHeatFlux: solarFlux * 1e-4,
            latentHeatFlux: 0,
            netMassFlux: 1.2,
            netHeatFlux: solarFlux * 1e-4,
            solarIncoming: solarFlux,
            terrestrialOutgoing: solarFlux * 0.99,
            heatFluxes: [solarFlux * 1e-4],
            boundaryTemperatures: [STANDARD_AMBIENT_TEMPERATURE_K],
            massFluxes: [1.2],
            specificEnthalpies: [500],
            specificEntropies: [2.1]
        };
        const res = stepThermodynamicMonad(this.stateVector, boundaryFlux, solarFlux * 1e-4 * dt, (solarFlux * 1e-4 / STANDARD_AMBIENT_TEMPERATURE_K) * dt, dt);
        this.stateVector = 'state' in res ? res.state : res;
    }
}
// Backward compatibility alias for sprint tests expecting CarbonCyclePOD
export { CarbonCycle as CarbonCyclePOD };
