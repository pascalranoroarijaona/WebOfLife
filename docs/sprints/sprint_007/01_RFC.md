# RFC 007: Biogeochemical CyclePOD Instances and Mass-Conservative Transfer Dynamics

**Status:** Approved  
**Author:** Chief Systems Architect  
**Date:** October 2023  
**Target Sprint:** Sprint 007 (`sprint_007`)  

---

## 1. Executive Summary and Objectives

Sprint 007 establishes the dedicated biogeochemical cycle infrastructure within the **Web of Life** engine (`src/cycles/`). Building upon the thermodynamic foundation established in previous sprints (`src/thermodynamics/`), this sprint introduces concrete implementations for four primary planetary cycles: **Carbon**, **Water**, **Nitrogen**, and **Phosphorus**. 

Each cycle operates as a specialized **CyclePOD** extending a unified abstract base class (`BaseCycle`). These instances govern specific stock reservoirs (e.g., atmosphere, lithosphere, hydrosphere, biosphere) and execute mass-conservative transfer rate calculations driven by solar flux and systemic energy gradients.

### Core Goals
1. **Abstract Base Cycle Architecture (`src/cycles/base_cycle.ts`)**: Define standard interfaces for stock reservoirs, transfer fluxes, conservation auditing, and temporal step evaluation.
2. **Carbon Cycle Implementation (`src/cycles/carbon.ts`)**: Model atmospheric $CO_2$, ocean dissolved inorganic carbon (DIC), terrestrial biomass, and lithospheric carbonate reservoirs with photosynthetic and respiratory fluxes.
3. **Water Cycle Implementation (`src/cycles/water.ts`)**: Model atmospheric vapor, oceanic reservoirs, terrestrial groundwater, and surface ice with precipitation, evaporation, and runoff transfer functions.
4. **Nitrogen Cycle Implementation (`src/cycles/nitrogen.ts`)**: Model atmospheric $N_2$, soil nitrates/ammonia, and biomass pools with fixation, denitrification, and assimilation rates.
5. **Phosphorus Cycle Implementation (`src/cycles/phosphorus.ts`)**: Model lithospheric apatite, soil soluble phosphate, aquatic sediments, and biomass with weathering and sedimentation transfer dynamics.
6. **Thermodynamic Compliance**: Enforce strict First Law mass conservation across all multi-reservoir transfer operations and Second Law entropy generation tracking.

---

## 2. Class Hierarchy and Architectural Design

The cycle subsystem leverages an object-oriented hierarchical pattern, inheriting common state-management and thermodynamic validation features from `BaseCycle`.

```
┌────────────────────────────────────────────────────────┐
│                     BaseCycle                          │
│  - reservoirs: Map<string, number>                     │
│  - fluxes: Map<string, number>                         │
│  + update(deltaSeconds: number): void                  │
│  + getStock(reservoir: string): number                 │
│  + validateConservation(): boolean                     │
└───────────────────┬────────────────────────────────────┘
                    │
       ┌────────────┼────────────┬────────────┐
       ▼            ▼            ▼            ▼
  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ Carbon  │  │  Water  │  │Nitrogen │Phosphorus│
  │  Cycle  │  │  Cycle  │  │  Cycle  │  Cycle   │
  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

### 2.1 Interface Contracts (`src/cycles/base_cycle.ts`)

```typescript
export interface ReservoirState {
  [key: string]: number;
}

export interface CycleConfig {
  initialStocks: ReservoirState;
  transferCoefficients: Record<string, number>;
}

export abstract class BaseCycle {
  protected reservoirs: Map<string, number>;
  protected initialTotalMass: number;

  constructor(config: CycleConfig) {
    this.reservoirs = new Map(Object.entries(config.initialStocks));
    this.initialTotalMass = this.calculateTotalMass();
  }

  public abstract step(deltaSeconds: number, solarInput: number): void;

  public getStock(name: string): number {
    return this.reservoirs.get(name) ?? 0;
  }

  protected transfer(from: string, to: string, amount: number): void {
    const currentFrom = this.getStock(from);
    const actualTransfer = Math.min(currentFrom, Math.max(0, amount));
    this.reservoirs.set(from, currentFrom - actualTransfer);
    this.reservoirs.set(to, this.getStock(to) + actualTransfer);
  }

  public calculateTotalMass(): number {
    let total = 0;
    for (const val of this.reservoirs.values()) {
      total += val;
    }
    return total;
  }

  public validateConservation(tolerance: number = 1e-6): boolean {
    const currentTotal = this.calculateTotalMass();
    return Math.abs(currentTotal - this.initialTotalMass) <= tolerance;
  }
}
```

---

## 3. CyclePOD Specifications

### 3.1 Carbon Cycle (`src/cycles/carbon.ts`)
* **Reservoirs**: `atmosphere`, `terrestrial_biosphere`, `ocean_surface`, `lithosphere`.
* **Fluxes**: 
  * Photosynthesis ($atmosphere \rightarrow terrestrial\_biosphere$) modulated by solar input.
  * Respiration & Decomposition ($terrestrial\_biosphere \rightarrow atmosphere$).
  * Ocean-Atmosphere Dissolution & Outgassing ($atmosphere \rightleftharpoons ocean\_surface$).
  * Weathering / Burial ($terrestrial\_biosphere \rightarrow lithosphere$).

### 3.2 Water Cycle (`src/cycles/water.ts`)
* **Reservoirs**: `atmosphere_vapor`, `ocean`, `groundwater`, `ice_caps`.
* **Fluxes**:
  * Evaporation ($ocean \rightarrow atmosphere\_vapor$) driven by solar irradiance.
  * Precipitation ($atmosphere\_vapor \rightarrow groundwater, ice\_caps$).
  * Runoff ($groundwater \rightarrow ocean$).
  * Melting / Freezing ($ice\_caps \rightleftharpoons ocean$).

### 3.3 Nitrogen Cycle (`src/cycles/nitrogen.ts`)
* **Reservoirs**: `atmosphere_n2`, `soil_ammonia`, `soil_nitrate`, `biomass`.
* **Fluxes**:
  * Nitrogen Fixation ($atmosphere\_n2 \rightarrow soil\_ammonia$).
  * Assimilation ($soil\_nitrate, soil\_ammonia \rightarrow biomass$).
  * Ammonification & Nitrification ($biomass \rightarrow soil\_ammonia \rightarrow soil\_nitrate$).
  * Denitrification ($soil\_nitrate \rightarrow atmosphere\_n2$).

### 3.4 Phosphorus Cycle (`src/cycles/phosphorus.ts`)
* **Reservoirs**: `lithosphere_apatite`, `soil_phosphate`, `aquatic_sediment`, `biomass`.
* **Fluxes**:
  * Weathering ($lithosphere\_apatite \rightarrow soil\_phosphate$).
  * Uptake ($soil\_phosphate \rightarrow biomass$).
  * Litterfall & Runoff ($biomass \rightarrow aquatic\_sediment$).
  * Lithification / Uplift ($aquatic\_sediment \rightarrow lithosphere\_apatite$).

---

## 4. Thermodynamic & Monad Stock Integration

All cycle updates adhere to thermodynamic constraints defined in `src/thermodynamics/thermodynamic_structure.ts`:
1. **Mass Conservation (First Law)**: Total elemental mass across all reservoirs within a CyclePOD remains invariant across simulation steps ($\sum M_i(t) = \sum M_i(0)$).
2. **Energy Coupling (Second Law)**: Transfers requiring activation energy (e.g., endothermic fixation, evaporation) scale dynamically with available solar input metrics supplied by the global `EarthPod` instance.

---

## 5. Verification and Testing Plan

Sprint 007 unit tests (`tests/sprint_007.test.ts`) will validate:
* Exact mass conservation across 10,000 simulation steps.
* Stoichiometric consistency under varying solar input regimes ($0.0$ to $2.0 \times$ baseline).
* Proper handling of depletion limits (reservoirs cannot drop below zero).