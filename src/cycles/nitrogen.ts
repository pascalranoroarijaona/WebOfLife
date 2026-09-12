// Complete implementation of NitrogenCycle in src/cycles/nitrogen.ts
import { BaseCycle } from './base_cycle.js';

export class NitrogenCycle extends BaseCycle {
  constructor(config?: { initialStocks?: Record<string, number>; transferCoefficients?: Record<string, number> }) {
    super("Nitrogen Cycle", {
      initialStocks: config?.initialStocks ?? {
        atmosphere_n2: 3_900_000,
        soil_ammonia: 100,
        soil_nitrate: 150,
        biomass: 3.5,
      },
      transferCoefficients: config?.transferCoefficients ?? {
        fix: 0.00005,
        nitrif: 0.0002,
        assim: 0.0001,
        denit: 0.00008,
      }
    });
  }

  public step(deltaSeconds: number, solarInput: number): void {
    const n2 = this.getStock('atmosphere_n2');
    const nh3 = this.getStock('soil_ammonia');
    const no3 = this.getStock('soil_nitrate');
    const bio = this.getStock('biomass');

    const fFix = this.coeffs.fix * n2 * solarInput * deltaSeconds;
    const fNitrif = this.coeffs.nitrif * nh3 * deltaSeconds;
    const fAssim = this.coeffs.assim * no3 * bio * deltaSeconds;
    const fDenit = this.coeffs.denit * no3 * deltaSeconds;

    this.transfer('atmosphere_n2', 'soil_ammonia', fFix);
    this.transfer('soil_ammonia', 'soil_nitrate', fNitrif);
    this.transfer('soil_nitrate', 'biomass', fAssim);
    this.transfer('soil_nitrate', 'atmosphere_n2', fDenit);
  }
}

export { NitrogenCycle as NitrogenCyclePOD };