// Complete implementation of CarbonCycle in src/cycles/carbon.ts
import { BaseCycle } from './base_cycle.js';
export class CarbonCycle extends BaseCycle {
    constructor(config) {
        super("Carbon Cycle", {
            initialStocks: config?.initialStocks ?? {
                atmosphere: 850,
                terrestrial_biosphere: 550,
                ocean_surface: 900,
                lithosphere: 100_000_000,
            },
            transferCoefficients: config?.transferCoefficients ?? {
                photo: 0.00014,
                resp: 0.00013,
                diss: 0.0001,
                outg: 0.0001,
                burial: 0.00001,
            }
        });
    }
    step(deltaSeconds, solarInput) {
        const atm = this.getStock('atmosphere');
        const bio = this.getStock('terrestrial_biosphere');
        const ocean = this.getStock('ocean_surface');
        const fPhoto = this.coeffs.photo * atm * solarInput * deltaSeconds;
        const fResp = this.coeffs.resp * bio * deltaSeconds;
        const fDiss = this.coeffs.diss * atm * deltaSeconds;
        const fOutg = this.coeffs.outg * ocean * deltaSeconds;
        const fBurial = this.coeffs.burial * bio * deltaSeconds;
        this.transfer('atmosphere', 'terrestrial_biosphere', fPhoto);
        this.transfer('terrestrial_biosphere', 'atmosphere', fResp);
        this.transfer('atmosphere', 'ocean_surface', fDiss);
        this.transfer('ocean_surface', 'atmosphere', fOutg);
        this.transfer('terrestrial_biosphere', 'lithosphere', fBurial);
    }
}
export { CarbonCycle as CarbonCyclePOD };
