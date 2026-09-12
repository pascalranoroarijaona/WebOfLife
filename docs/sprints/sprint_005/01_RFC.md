# RFC 005: Biogeochemical CyclePOD Instances

## Status
- **Status:** Proposed / Under Architectural Review
- **Sprint:** 005
- **Author:** Chief Systems Architect
- **Target Modules:** `src/cycles/carbon.ts`, `src/cycles/water.ts`, `src/cycles/nitrogen.ts`, `src/cycles/phosphorus.ts`

---

## 1. Executive Summary
Sprint 005 establishes dedicated Biogeochemical CyclePOD instances for Carbon, Water, Nitrogen, and Phosphorus. These modules encapsulate explicit stock reservoirs and transfer rate calculations adhering strictly to the First and Second Laws of Thermodynamics (matter conservation, closed-system mass balance, and solar-driven energetic flux).

---

## 2. Architectural Context & Objectives
Building upon the thermodynamic structures established in previous sprints (`src/thermodynamics/thermodynamic_structure.ts`), Sprint 005 introduces explicit biogeochemical cycle subsystems. Each cycle operates as an independent `CyclePOD` subclass or composition entity that tracks atomic/molecular masses across distinct reservoirs without violating mass conservation.

### Objectives:
1. Implement `src/cycles/carbon.ts`: Atmosphere, Ocean, Lithosphere, and Biosphere carbon stocks with flux calculations (photosynthesis, respiration, outgassing, weathering).
2. Implement `src/cycles/water.ts`: Atmospheric vapor, Ocean/Surface water, Groundwater, and Ice caps with phase-change and precipitation/evaporation fluxes.
3. Implement `src/cycles/nitrogen.ts`: Atmospheric $N_2$, Soil ammonium/nitrate, and Organic nitrogen pools with fixation, nitrification, denitrification, and assimilation rates.
4. Implement `src/cycles/phosphorus.ts`: Lithospheric apatite, Soil inorganic/organic phosphorus, and Aquatic/Marine dissolved pools with weathering and sedimentation fluxes.
5. Guarantee absolute matter conservation across all tick transitions ($\sum \Delta \text{stocks} = 0$).

---

## 3. Class Hierarchy & Interface Contracts

### 3.1 Base CyclePOD Interface
```typescript
export interface ReservoirMap {
  [reservoirName: string]: number; // Mass in moles, kg, or gigatons
}

export interface FluxRateMap {
  [fluxName: string]: number; // Transfer rate per time step
}

export abstract class CyclePOD {
  protected stocks: ReservoirMap;

  constructor(initialStocks: ReservoirMap) {
    this.stocks = { ...initialStocks };
  }

  public abstract step(deltaTime: number, solarInput: number): void;

  public getStocks(): Readonly<ReservoirMap> {
    return { ...this.stocks };
  }

  protected transfer(from: string, to: string, amount: number): void {
    if (this.stocks[from] === undefined || this.stocks[to] === undefined) {
      throw new Error(`Invalid reservoir transfer: ${from} -> ${to}`);
    }
    if (this.stocks[from] < amount) {
      amount = this.stocks[from]; // Clamp to prevent negative stock (mass conservation safety)
    }
    this.stocks[from] -= amount;
    this.stocks[to] += amount;
  }
}
```

### 3.2 Concrete Cycle Implementations
- **`CarbonCyclePOD` (`src/cycles/carbon.ts`)**: Manages `atmosphere`, `ocean`, `biosphere`, and `lithosphere`. Flux driven by solar input powering primary production.
- **`WaterCyclePOD` (`src/cycles/water.ts`)**: Manages `atmosphere`, `surfaceWater`, `groundwater`, and `iceCaps`. Flux driven by thermal evaporation and gravitational runoff.
- **`NitrogenCyclePOD` (`src/cycles/nitrogen.ts`)**: Manages `atmosphere`, `soilAmmonium`, `soilNitrate`, and `biomassN`. Driven by biological fixation requiring metabolic energy.
- **`PhosphorusCyclePOD` (`src/cycles/phosphorus.ts`)**: Manages `lithosphereP`, `soilP`, and `marineP`. Purely sedimentary/geochemical weathering and runoff dynamics (no significant atmospheric phase).

---

## 4. Thermodynamic & Monadic Stock Transitions
State transitions across cycles utilize immutable state updates wrapped in monad-like state containers to ensure traceability and auditability of atomic movements:

```typescript
export interface ThermodynamicState<T> {
  value: T;
  energyUsed: number;
  entropyGenerated: number;
}
```

Every transfer verifies:
1. $\Delta M_{\text{total}} = 0$ (Conservation of Matter).
2. Energy dissipation adheres to Carnot/thermal efficiency bounds driven exclusively by `solarInput`.

---

## 5. Verification & Testing Strategy
- **Unit Tests (`tests/sprint_005.test.ts`)**: Verify invariant conservation across 1,000 simulation steps.
- **Integration Test**: Couple all four cycle pods into `EarthPod` (`src/earth_pod.ts`) to observe global biogeochemical coupling under varying solar forcing scenarios.