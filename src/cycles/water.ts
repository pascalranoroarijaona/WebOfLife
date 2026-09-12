// Complete implementation of WaterCycle in src/cycles/water.ts
import { BaseCycle } from './base_cycle.js';

export class WaterCycle extends BaseCycle {
  constructor(config?: { initialStocks?: Record<string, number>; transferCoefficients?: Record<string, number> }) {
    super("Water Cycle", {
      initialStocks: config?.initialStocks ?? {
        atmosphere_vapor: 12900,
        ocean: 1_338_000_000,
        groundwater: 23_400_000,
        ice_caps: 24_064_000,
      },
      transferCoefficients: config?.transferCoefficients ?? {
        evap: 0.00032,
        precip: 0.0005,
        runoff: 0.0002,
        melt: 0.00005,
      }
    });
  }

  public step(deltaSeconds: number, solarInput: number): void {
    const oc = this.getStock('ocean');
    const vap = this.getStock('atmosphere_vapor');
    const gw = this.getStock('groundwater');
    const ice = this.getStock('ice_caps');

    const fEvap = this.coeffs.evap * oc * solarInput * deltaSeconds;
    const fPrecip = this.coeffs.precip * vap * deltaSeconds;
    const fRunoff = this.coeffs.runoff * gw * deltaSeconds;
    const fMelt = this.coeffs.melt * ice * Math.max(0, solarInput - 0.5) * deltaSeconds;

    this.transfer('ocean', 'atmosphere_vapor', fEvap);
    this.transfer('atmosphere_vapor', 'groundwater', fPrecip * 0.8);
    this.transfer('atmosphere_vapor', 'ice_caps', fPrecip * 0.2);
    this.transfer('groundwater', 'ocean', fRunoff);
    this.transfer('ice_caps', 'ocean', fMelt);
  }
}

export { WaterCycle as WaterCyclePOD };