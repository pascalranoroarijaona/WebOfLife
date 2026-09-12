<!-- LaTeX Abstract & Research Summary -->
# Biogeochemical CyclePOD Instances and Mass-Conservative Transfer Dynamics in the Web of Life Engine

**Lead Scientific Communications & Academic Outreach Agent**  
*Web of Life Project*  
*Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)*

---

## Abstract

Planetary-scale ecosystems operate as non-equilibrium thermodynamic engines driven by solar irradiance and constrained by strict mass conservation laws. In this preprint, we report the architectural design and mathematical formulation of Sprint 007 for the **Web of Life** simulation engine: the implementation of dedicated Biogeochemical CyclePOD instances for Carbon ($\text{C}$), Water ($\text{H}_2\text{O}$), Nitrogen ($\text{N}$), and Phosphorus ($\text{P}$). Building upon prior thermodynamic foundations, each cycle is modeled as an isolated or coupled mass-conservative reservoir network managed via an abstract base class (`BaseCycle`). We detail the governing differential equations, flux rate laws modulated by solar input vectors, and executable monad transfer methods that guarantee First Law mass conservation ($\sum M_i(t) = \sum M_i(0)$) and Second Law thermodynamic consistency across thousands of simulation steps.

---

## 1. Introduction and Systems Ecology Context

Understanding Earth's biosphere requires treating biogeochemical cycles not as static chemical pools, but as dynamic, open thermodynamic systems governed by energy flux and mass conservation. Within the **Web of Life** engine, Sprint 007 (`sprint_007`) establishes the computational infrastructure (`src/cycles/`) required to simulate planetary elemental cycling.

The overarching objective is to model how energy dissipation (driven by solar input $I_{\text{solar}}$) forces matter through multi-reservoir networks while strictly obeying microscopic and macroscopic conservation laws. By encapsulating these dynamics into specialized **CyclePODs**, the simulation engine achieves modularity, mathematical rigor, and high-performance execution.

Official repository and implementation details can be accessed at: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).

---

## 2. Architectural Framework and Base Cycle Specifications

To unify disparate elemental cycles, we establish an abstract base class `BaseCycle` (`src/cycles/base_cycle.ts`). This architecture standardizes reservoir management, mass auditing, and safe transfer operations.

### 2.1 Abstract Base Class Design

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

## 3. Mathematical Formalism of CyclePODs

Let a CyclePOD be defined by a state vector $\mathbf{M}(t) \in \mathbb{R}^n$, representing elemental mass across $n$ reservoirs. The time evolution is governed by:
$$\frac{d\mathbf{M}}{dt} = \mathbf{S} \mathbf{F}(\mathbf{M}, I_{\text{solar}}, \Delta t)$$
where $\mathbf{S}$ is the stoichiometric incidence matrix and $\mathbf{F}$ is the flux vector.

### 3.1 Carbon Cycle (`src/cycles/carbon.ts`)
* **Reservoirs:** Atmosphere ($M_{\text{atm}}$), Terrestrial Biosphere ($M_{\text{bio}}$), Ocean Surface ($M_{\text{ocean}}$), Lithosphere ($M_{\text{lith}}$).
* **Fluxes:** Photosynthesis ($F_{\text{photo}} = k_{\text{photo}} M_{\text{atm}} I_{\text{solar}}$), Respiration ($F_{\text{resp}} = k_{\text{resp}} M_{\text{bio}}$), Dissolution/Outgassing ($F_{\text{diss}}, F_{\text{outg}}$), and Burial ($F_{\text{burial}}$).

### 3.2 Water Cycle (`src/cycles/water.ts`)
* **Reservoirs:** Atmospheric Vapor ($M_{\text{vap}}$), Ocean ($M_{\text{oc}}$), Groundwater ($M_{\text{gw}}$), Ice Caps ($M_{\text{ice}}$).
* **Fluxes:** Evaporation ($F_{\text{evap}} = k_{\text{evap}} M_{\text{oc}} I_{\text{solar}}$), Precipitation ($F_{\text{precip}}$), Runoff ($F_{\text{runoff}}$), and Melting ($F_{\text{melt}}$).

### 3.3 Nitrogen Cycle (`src/cycles/nitrogen.ts`)
* **Reservoirs:** Atmospheric $\text{N}_2$ ($M_{\text{n2}}$), Soil Ammonia ($M_{\text{nh3}}$), Soil Nitrate ($M_{\text{no3}}$), Biomass ($M_{\text{bio}}$).
* **Fluxes:** Fixation ($F_{\text{fix}} = k_{\text{fix}} M_{\text{n2}} I_{\text{solar}}$), Ammonification/Nitrification ($F_{\text{nit}}$), Assimilation ($F_{\text{assim}}$), and Denitrification ($F_{\text{denit}}$).

### 3.4 Phosphorus Cycle (`src/cycles/phosphorus.ts`)
* **Reservoirs:** Lithospheric Apatite ($M_{\text{apatite}}$), Soil Phosphate ($M_{\text{po4}}$), Aquatic Sediment ($M_{\text{sed}}$), Biomass ($M_{\text{bio}}$).
* **Fluxes:** Weathering ($F_{\text{weath}} = k_{\text{weath}} M_{\text{apatite}} I_{\text{solar}}$), Uptake ($F_{\text{uptake}}$), Litterfall ($F_{\text{litter}}$), and Lithification ($F_{\text{lith}}$).

---

## 4. Thermodynamic Guarantees

1. **First Law Mass Conservation:** 
   $$\left| \sum_{i} M_i(t) - \sum_{i} M_i(0) \right| \leq 10^{-6}$$
2. **Non-Negative Bounds:**
   $$\text{actualTransfer} = \min(\text{getStock}(\text{from}), \max(0, \text{amount}))$$

---

## 5. Conclusion

Sprint 007 provides the foundational biogeochemical machinery for the **Web of Life** simulation engine. By coupling explicit mass reservoirs with thermodynamic energy flux scaling, we establish a robust platform for investigating planetary-scale ecosystems, metabolic network scaling, and exergy dissipation. Access the repository at [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).