# Request for Comments (RFC): Sprint 006 - Biogeochemical CyclePOD Instances

**Status:** Approved  
**Author:** Chief Systems Architect  
**Date:** October 2023  
**Target Modules:** `src/cycles/carbon.ts`, `src/cycles/water.ts`, `src/cycles/nitrogen.ts`, `src/cycles/phosphorus.ts`, `src/earth_pod.ts`

---

## 1. Executive Summary & Objectives

Sprint 006 establishes the core biogeochemical cycle infrastructure for the **Web of Life (Gaia)** simulation engine. Building upon the thermodynamic foundations laid in previous sprints (`src/thermodynamics/`), this sprint introduces dedicated cycle POD classes for **Carbon**, **Water**, **Nitrogen**, and **Phosphorus**.

These cycle modules govern the mass conservation and transfer rates of elemental stocks across planetary reservoirs (atmosphere, lithosphere, hydrosphere, biosphere). Adhering strictly to the **First Law of Thermodynamics** (matter conservation: $\sum \Delta \text{Stocks} = 0$, excluding solar radiant energy input/entropy radiation), these classes ensure closed-loop mass balance during simulation stepping.

---

## 2. Thermodynamic & Mathematical Framework

### 2.1 Mass Conservation (First Law)
Every cycle POD maintains an internal state vector of discrete stock reservoirs $S_i$. Transfer rates $F_{i \to j}$ represent the flux of matter from reservoir $i$ to reservoir $j$ per unit time step $\Delta t$:

$$\frac{dS_i}{dt} = \sum_{j} F_{j \to i} - \sum_{k} F_{i \to k}$$

The simulation invariant requires that total global mass within each cycle remains constant:

$$\frac{d}{dt} \sum_{i} S_i = 0 \quad (\text{except external stellar input/output where applicable})$$

### 2.2 Second Law & Entropy Production
Biological assimilation and geochemical weathering fluxes consume thermodynamic free energy (driven by incoming solar flux), producing internal entropy $\sigma \ge 0$ as formalized in `src/thermodynamics/thermodynamic_structure.ts`.

---

## 3. Class Hierarchy & Interface Contracts

### 3.1 Base Cycle Interface (`src/cycles/base_cycle.ts` or inline contracts)
```typescript
export interface Reservoir {
  name: string;
  mass: number; // kg or Gt (Gigatons)
  capacity?: number;
}

export interface FluxRate {
  from: string;
  to: string;
  rate: number; // mass per time unit
}

export interface ICyclePOD {
  name: string;
  getStocks(): ReadonlyMap<string, number>;
  step(deltaSeconds: number, solarFlux: number): void;
  validateMassBalance(initialTotal: number): boolean;
}
```

### 3.2 Concrete Cycle POD Implementations

1. **Carbon Cycle (`src/cycles/carbon.ts`)**
   - **Reservoirs:** `atmosphere` ($CO_2$), `ocean_dissolved_inorganic`, `biosphere_terrestrial`, `lithosphere_sediments`.
   - **Fluxes:** Photosynthesis, Respiration, Ocean-Atmosphere gas exchange, Weathering, Burial.

2. **Water Cycle (`src/cycles/water.ts`)**
   - **Reservoirs:** `oceans`, `atmosphere_vapor`, `ice_caps`, `terrestrial_groundwater`.
   - **Fluxes:** Evaporation, Precipitation, Runoff, Melting/Freezing.

3. **Nitrogen Cycle (`src/cycles/nitrogen.ts`)**
   - **Reservoirs:** `atmosphere_n2`, `soil_ammonium`, `soil_nitrate`, `biosphere_organic_n`.
   - **Fluxes:** Nitrogen fixation, Nitrification, Denitrification, Plant uptake.

4. **Phosphorus Cycle (`src/cycles/phosphorus.ts`)**
   - **Reservoirs:** `lithosphere_apatite`, `soil_phosphate`, `aquatic_dissolved_p`, `biosphere_p`.
   - **Fluxes:** Weathering, Plant uptake, Runoff/Sedimentation.

---

## 4. Integration with `EarthPOD`

The central `EarthPOD` class (`src/earth_pod.ts`) will orchestrate these four cycle instances, feeding environmental parameters (such as temperature, solar irradiance, and biological biomass) into each cycle's `.step()` method during the global simulation loop.

```typescript
import { CarbonCycle } from './cycles/carbon';
import { WaterCycle } from './cycles/water';
import { NitrogenCycle } from './cycles/nitrogen';
import { PhosphorusCycle } from './cycles/phosphorus';

export class EarthPOD {
  private carbon = new CarbonCycle();
  private water = new WaterCycle();
  private nitrogen = new NitrogenCycle();
  private phosphorus = new PhosphorusCycle();

  public step(dt: number, solarFlux: number): void {
    this.carbon.step(dt, solarFlux);
    this.water.step(dt, solarFlux);
    this.nitrogen.step(dt, solarFlux);
    this.phosphorus.step(dt, solarFlux);
  }
}
```

---

## 5. Verification & Testing Strategy

- **Unit Tests (`tests/sprint_006.test.ts`)**: Verify exact mass conservation across 1,000 simulation steps under varying solar inputs.
- **Invariant Assertions**: Throw runtime errors if total reservoir mass deviates beyond floating-point tolerance ($1.0 \times 10^{-12}$).