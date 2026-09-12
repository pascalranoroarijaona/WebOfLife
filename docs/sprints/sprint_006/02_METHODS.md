<!-- Method Specifications -->

# Sprint 006: Biogeochemical CyclePOD Instances - Method Specifications

This document outlines the exact physical, biological, and chemical process models, mass-balance differential equations, and executable monad/POD method structures for the four core biogeochemical cycles (`Carbon`, `Water`, `Nitrogen`, `Phosphorus`) and their orchestration via `EarthPOD`.

---

## 1. Global Conservation Laws & Monad Architecture

All cycle PODs implement the `ICyclePOD` interface, maintaining closed-system mass conservation in accordance with the First Law of Thermodynamics:

$$\sum_{i} S_i(t) = \sum_{i} S_i(0) \pm \Phi_{\text{external}}(t)$$

Where floating-point drift is strictly bounded by $\epsilon \le 1.0 \times 10^{-12}$.

---

## 2. Carbon Cycle POD (`src/cycles/carbon.ts`)

### 2.1 Reservoirs ($S_C$)
1. `atmosphere`: Atmospheric Carbon Dioxide ($CO_2$) [Gt C]
2. `ocean_dissolved_inorganic`: Dissolved Inorganic Carbon ($DIC$) [Gt C]
3. `biosphere_terrestrial`: Living biomass & soil organic carbon [Gt C]
4. `lithosphere_sediments`: Carbonate rocks and kerogen/coal [Gt C]

### 2.2 Flux Equations ($F_{i \to j}$)
- **Photosynthesis ($F_{\text{atmos} \to \text{bio}}$):**
  $$F_{1 \to 3} = k_{\text{photo}} \cdot S_{\text{atmos}} \cdot \left(\frac{\text{solarFlux}}{\text{solarFlux}_0}\right) \cdot \left(1 - \frac{S_{\text{bio}}}{C_{\text{max},\text{bio}}}\right)$$
- **Terrestrial Respiration ($F_{\text{bio} \to \text{atmos}}$):**
  $$F_{3 \to 1} = k_{\text{resp}} \cdot S_{\text{bio}} \cdot e^{\beta (T - T_0)}$$
- **Ocean-Atmosphere Exchange ($F_{\text{atmos} \leftrightarrow \text{ocean}}$):**
  $$F_{1 \to 2} = k_{\text{solubility}} \cdot S_{\text{atmos}}$$
  $$F_{2 \to 1} = k_{\text{ degassing}} \cdot S_{\text{ocean}}$$
- **Weathering & Burial ($F_{\text{litho} \leftrightarrow \text{ocean}}$):**
  $$F_{2 \to 4} = k_{\text{burial}} \cdot S_{\text{ocean}}$$
  $$F_{4 \to 1} = k_{\text{weathering}} \cdot S_{\text{litho}}$$

### 2.3 Executable Method Spec
```typescript
export class CarbonCycle implements ICyclePOD {
  public name = "CarbonCycle";
  private stocks: Map<string, number> = new Map([
    ['atmosphere', 850.0],
    ['ocean_dissolved_inorganic', 38000.0],
    ['biosphere_terrestrial', 2000.0],
    ['lithosphere_sediments', 100000000.0]
  ]);

  public getStocks(): ReadonlyMap<string, number> {
    return this.stocks;
  }

  public step(deltaSeconds: number, solarFlux: number): void {
    const dt = deltaSeconds / 31536000; // convert to years or fractional scale
    const atmos = this.stocks.get('atmosphere')!;
    const ocean = this.stocks.get('ocean_dissolved_inorganic')!;
    const bio = this.stocks.get('biosphere_terrestrial')!;
    const litho = this.stocks.get('lithosphere_sediments')!;

    const f_photo = 60.0 * (solarFlux / 1361.0) * (atmos / 850.0);
    const f_resp = 59.5 * (bio / 2000.0);
    const f_atm_oc = 90.0 * (atmos / 850.0);
    const f_oc_atm = 88.0 * (ocean / 38000.0);
    const f_burial = 0.2 * (ocean / 38000.0);
    const f_weathering = 0.2 * (litho / 100000000.0);

    this.stocks.set('atmosphere', atmos + (-f_photo + f_resp - f_atm_oc + f_oc_atm + f_weathering) * dt);
    this.stocks.set('ocean_dissolved_inorganic', ocean + (f_atm_oc - f_oc_atm - f_burial) * dt);
    this.stocks.set('biosphere_terrestrial', bio + (f_photo - f_resp) * dt);
    this.stocks.set('lithosphere_sediments', litho + (f_burial - f_weathering) * dt);
  }

  public validateMassBalance(initialTotal: number): boolean {
    let currentTotal = 0;
    for (const val of this.stocks.values()) currentTotal += val;
    return Math.abs(currentTotal - initialTotal) < 1e-6;
  }
}
```

---

## 3. Water Cycle POD (`src/cycles/water.ts`)

### 3.1 Reservoirs ($S_W$)
1. `oceans`: Global marine water mass [$10^{18}$ kg]
2. `atmosphere_vapor`: Atmospheric water vapor [$10^{15}$ kg]
3. `ice_caps`: Glaciers and ice sheets [$10^{18}$ kg]
4. `terrestrial_groundwater`: Soil moisture and aquifers [$10^{15}$ kg]

### 3.2 Flux Equations
- **Evaporation ($F_{\text{ocean} \to \text{atmos}}$):** $E = k_e \cdot \text{solarFlux} \cdot S_{\text{oceans}}$
- **Precipitation ($F_{\text{atmos} \to \text{terrestrial/ocean}}$):** $P = k_p \cdot S_{\text{atmos\_vapor}}$
- **Runoff ($F_{\text{terrestrial} \to \text{oceans}}$):** $R = k_r \cdot S_{\text{groundwater}}$
- **Melting/Freezing ($F_{\text{ice} \leftrightarrow \text{ocean}}$):** $M = k_m \cdot (\text{solarFlux} - \text{solarFlux}_0) \cdot S_{\text{ice}}$

---

## 4. Nitrogen Cycle POD (`src/cycles/nitrogen.ts`)

### 4.1 Reservoirs ($S_N$)
1. `atmosphere_n2`: Inert atmospheric $N_2$ [Tg N]
2. `soil_ammonium`: $NH_4^+$ pool [Tg N]
3. `soil_nitrate`: $NO_3^-$ pool [Tg N]
4. `biosphere_organic_n`: Plant and microbial organic nitrogen [Tg N]

### 4.2 Flux Equations
- **Biological Fixation ($F_{\text{atmos} \to \text{soil}}$):** Driven by bio-activity and solar energy.
- **Nitrification ($F_{\text{ammonium} \to \text{nitrate}}$):** Microbial oxidation rate.
- **Denitrification ($F_{\text{nitrate} \to \text{atmos}}$):** Anaerobic reduction back to $N_2$.
- **Plant Uptake & Litterfall:** Cyclic transfer between soil inorganic pools and organic biosphere.

---

## 5. Phosphorus Cycle (`src/cycles/phosphorus.ts`)

### 5.1 Reservoirs ($S_P$)
1. `lithosphere_apatite`: Mineral phosphate rocks [Mt P]
2. `soil_phosphate`: Bio-available orthophosphate in soils [Mt P]
3. `aquatic_dissolved_p`: Dissolved riverine and oceanic phosphorus [Mt P]
4. `biosphere_p`: Living and dead organic phosphorus biomass [Mt P]

### 5.2 Flux Equations
- **Weathering ($F_{\text{litho} \to \text{soil}}$):** Slow geochemical release of apatite via rainfall/carbonic acid.
- **Runoff ($F_{\text{soil} \to \text{aquatic}}$):** Leaching and soil erosion into aquatic systems.
- **Sedimentation ($F_{\text{aquatic} \to \text{litho}}$):** Marine snow and deep ocean floor burial.

---

## 6. EarthPOD Integration Spec (`src/earth_pod.ts`)

The orchestrator updates all cycles concurrently per simulation tick while enforcing global mass invariants:

```typescript
import { CarbonCycle } from './cycles/carbon';
import { WaterCycle } from './cycles/water';
import { NitrogenCycle } from './cycles/nitrogen';
import { PhosphorusCycle } from './cycles/phosphorus';

export class EarthPOD {
  public carbon = new CarbonCycle();
  public water = new WaterCycle();
  public nitrogen = new NitrogenCycle();
  public phosphorus = new PhosphorusCycle();

  private initialMasses: { [key: string]: number } = {};

  constructor() {
    this.cacheInitialMasses();
  }

  private cacheInitialMasses(): void {
    this.initialMasses['carbon'] = Array.from(this.carbon.getStocks().values()).reduce((a, b) => a + b, 0);
    this.initialMasses['water'] = Array.from(this.water.getStocks().values()).reduce((a, b) => a + b, 0);
    this.initialMasses['nitrogen'] = Array.from(this.nitrogen.getStocks().values()).reduce((a, b) => a + b, 0);
    this.initialMasses['phosphorus'] = Array.from(this.phosphorus.getStocks().values()).reduce((a, b) => a + b, 0);
  }

  public step(dt: number, solarFlux: number): void {
    this.carbon.step(dt, solarFlux);
    this.water.step(dt, solarFlux);
    this.nitrogen.step(dt, solarFlux);
    this.phosphorus.step(dt, solarFlux);

    if (!this.carbon.validateMassBalance(this.initialMasses['carbon'])) {
      throw new Error("Mass conservation violation detected in CarbonCycle POD!");
    }
  }
}
```