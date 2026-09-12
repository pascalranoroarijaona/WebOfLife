// Complete implementation of PhosphorusCycle in src/cycles/phosphorus.ts
import { BaseCycle } from './base_cycle.js';

export class PhosphorusCycle extends BaseCycle {
  constructor(config?: { initialStocks?: Record<string, number>; transferCoefficients?: Record<string, number> }) {
    super("Phosphorus Cycle", {
      initialStocks: config?.initialStocks ?? {
        lithosphere_apatite: 4e9,
        soil_phosphate: 200,
        aquatic_sediment: 90000,
        biomass: 3,
      },
      transferCoefficients: config?.transferCoefficients ?? {
        weath: 0.00001,
        uptake: 0.00005,
        litter: 0.00004,
        lith: 0.000002,
      }
    });
  }

  public step(deltaSeconds: number, solarInput: number): void {
    const apatite = this.getStock('lithosphere_apatite');
    const po4 = this.getStock('soil_phosphate');
    const bio = this.getStock('biomass');
    const sed = this.getStock('aquatic_sediment');

    const fWeath = this.coeffs.weath * apatite * solarInput * deltaSeconds;
    const fUptake = this.coeffs.uptake * po4 * bio * deltaSeconds;
    const fLitter = this.coeffs.litter * bio * deltaSeconds;
    const fLith = this.coeffs.lith * sed * deltaSeconds;

    this.transfer('lithosphere_apatite', 'soil_phosphate', fWeath);
    this.transfer('soil_phosphate', 'biomass', fUptake);
    this.transfer('biomass', 'aquatic_sediment', fLitter);
    this.transfer('aquatic_sediment', 'lithosphere_apatite', fLith);
  }
}

export { PhosphorusCycle as PhosphorusCyclePOD };