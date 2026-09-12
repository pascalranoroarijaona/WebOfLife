# Request for Comments (RFC) - Sprint 018
## Thermodynamic State Vector Interface & Nonequilibrium Exergy Accounting

- **Status:** Draft / Proposed
- **Author:** Chief Systems Architect
- **Target Module:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_monad_process.ts`
- **Related Sprints:** Sprint 017 (Thermodynamic Monad Processes), Sprint 016 (Nonequilibrium Coupling)

---

## 1. Executive Summary & Sprint Goal

Sprint 018 establishes rigorous type safety and mathematical contracts for the **Thermodynamic State Vector Interface** within `src/thermodynamics/types.ts`. As the Web of Life simulator scales to represent complex planetary metabolism (carbon, nitrogen, phosphorus, and hydrological cycles), tracking conserved quantities and dissipation channels is paramount. 

This sprint formalizes:
1. Internal entropy generation rate ($\dot{S}_{\text{gen}} \ge 0$).
2. Exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), adhering strictly to the Gouy-Stodola theorem.
3. Boundary flux arrays for mass, heat, and radiation.
4. Monad stock transitions enforcing the First Law (conservation of mass-energy) and Second Law (non-negative entropy production) of thermodynamics.

---

## 2. Mathematical Foundation

### 2.1 First Law of Thermodynamics (Mass-Energy Conservation)
For any open thermodynamic control volume $V$ bounded by surface $\partial V$:
$$\frac{dE_{\text{system}}}{dt} = \sum_{i} \dot{Q}_i - \dot{W} + \sum_{j} \dot{m}_j \left( h_j + \frac{v_j^2}{2} + g z_j \right)$$

Within the Web of Life, total mass and elemental stocks (C, N, P, $\text{H}_2\text{O}$) are strictly conserved across monad boundaries. Solar radiation constitutes the sole net exergy input ($\dot{E}_x^{\text{in}}$), while longwave thermal radiation to space constitutes the entropy export sink.

### 2.2 Second Law & Nonequilibrium Thermodynamics
The rate of total entropy change is given by:
$$\frac{dS_{\text{system}}}{dt} = \sum_{i} \frac{\dot{Q}_i}{T_i} + \sum_{j} \dot{m}_j s_j + \dot{S}_{\text{gen}}$$

Where $\dot{S}_{\text{gen}}$ is the internal entropy generation rate due to irreversible processes (e.g., chemical reactions, heat conduction, viscous dissipation, and metabolic maintenance). The Second Law requires:
$$\dot{S}_{\text{gen}} \ge 0 \quad \forall t$$

### 2.3 Gouy-Stodola Theorem (Exergy Destruction)
The rate of exergy destruction ($\dot{I}$, also denoted $\dot{X}_{\text{dest}}$) is directly proportional to internal entropy generation at dead-state ambient temperature $T_0$:
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 3. Class Hierarchy & Interface Contracts (`src/thermodynamics/types.ts`)

To support incremental design and object-oriented composability, the core thermodynamic contracts are structured around immutable state vectors and interface segregation.

### 3.1 Interface Specifications

```typescript
/**
 * Represents boundary thermal, radiative, and mass flux vectors.
 */
export interface BoundaryFluxVector {
  /** Net radiative heat flux input (W/m^2 or total W depending on control volume scale) */
  radiativeFlux: number;
  /** Conductive/convective sensible heat flux (W) */
  sensibleHeatFlux: number;
  /** Latent heat flux associated with phase changes / water cycle (W) */
  latentHeatFlux: number;
  /** Elemental mass inflow/outflow rates vector [C, N, P, H2O] (kg/s) */
  massFluxRates: [number, number, number, number];
}

/**
 * Thermodynamic State Vector capturing intensive and extensive properties
 * of a planetary pod or biogeochemical monad.
 */
export interface ThermodynamicStateVector {
  /** Timestamp or simulation tick */
  time: number;
  /** System absolute temperature (K) */
  temperature: number;
  /** Reference ambient dead-state temperature T_0 (K) */
  ambientTemperature: number;
  /** Total internal energy E (J) */
  internalEnergy: number;
  /** Total system entropy S (J/K) */
  entropy: number;
  /** Total system exergy X (J) */
  exergy: number;
  /** Elemental stock vector [Carbon, Nitrogen, Phosphorus, Water] (kg or moles) */
  elementalStocks: [number, number, number, number];
  /** Boundary flux vector */
  boundaryFluxes: BoundaryFluxVector;
  /** Internal entropy generation rate S_gen_dot (W/K or J/(s·K)) */
  entropyGenerationRate: number;
  /** Exergy destruction rate I_dot = T_0 * S_gen_dot (W) */
  exergyDestructionRate: number;
}

/**
 * Contract for any thermodynamic process monad or biogeochemical cycle.
 */
export interface IThermodynamicMonadProcess {
  id: string;
  name: string;
  /**
     * Evaluates state transition over dt, returning updated state vector
     * while guaranteeing First and Second Law invariants.
     */
  step(currentState: ThermodynamicStateVector, dt: number): ThermodynamicStateVector;
  /**
     * Verifies mass conservation and non-negative entropy generation.
     */
  validateInvariants(state: ThermodynamicStateVector): boolean;
}
```

---

## 4. Monad Stock Transitions & State Evolution

The `ThermodynamicMonadProcess` base class (`src/thermodynamics/thermodynamic_monad_process.ts`) shall be extended to enforce the following transition pipeline:

1. **Input Ingestion:** Receive solar radiation and boundary elemental fluxes.
2. **First Law Check:** Compute $\frac{dE}{dt}$ from net heat and work exchanges; verify mass balance across C, N, P, and $\text{H}_2\text{O}$ pools within tolerance $\epsilon = 10^{-12}$.
3. **Irreversibility Calculation:** Compute internal chemical and thermal gradients to derive $\dot{S}_{\text{gen}}$.
4. **Second Law Assertion:** Throw a runtime validation error if $\dot{S}_{\text{gen}} < 0$.
5. **Exergy Accounting:** Update $\dot{I} = T_0 \dot{S}_{\text{gen}}$ and track cumulative exergy efficiency $\eta_x$.

---

## 5. Verification & Testing Plan

- **Unit Tests (`tests/sprint_018.test.ts`):**
  - Verify that isolated monads conserve total mass-energy.
  - Assert that $\dot{S}_{\text{gen}} \ge 0$ under all metabolic and geochemical stress tests.
  - Validate Gouy-Stodola exergy destruction calculations against analytical benchmarks.
- **Database Schema UML:** Update `db/uml/sprint_018_schema.puml` to reflect state vector logging structures.