# RFC 022: Thermodynamic State Vector Interface Contracts

## Metadata
- **Sprint:** Sprint 022
- **Author:** Chief Systems Architect
- **Status:** Approved / In Implementation
- **Target File:** `src/thermodynamics/types.ts`
- **Dependencies:** `src/thermodynamics/thermodynamic_structure.ts`, `src/thermodynamics/thermodynamic_monad_process.ts`

---

## 1. Background & Motivation
The Web of Life simulation engine models planetary metabolism under strict thermodynamic constraints:
1. **First Law of Thermodynamics:** Conservation of matter and energy across all biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water).
2. **Second Law of Thermodynamics:** All irreversible processes produce internal entropy ($\dot{S}_{\text{gen}} \ge 0$), driving exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$ where $T_0$ is the ambient reference temperature).

Previous sprints established core thermodynamic structures and monad process flows. Sprint 022 formalizes the strict TypeScript interfaces and types for internal entropy generation tracking, exergy destruction accounting, and boundary flux array structures within `src/thermodynamics/types.ts`.

---

## 2. Specification: `src/thermodynamics/types.ts`

The types and interfaces defined below provide compile-time guarantees for thermodynamic calculations, state vector transformations, and monad stock transitions.

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @description Formal TypeScript interfaces for thermodynamic state vectors, 
 * boundary flux arrays, internal entropy generation, and exergy destruction.
 */

/**
 * Ambient reference state parameters for exergy calculations.
 */
export interface IThermodynamicReferenceState {
  readonly T_0: number; // Reference temperature (Kelvin, K)
  readonly P_0: number; // Reference pressure (Pascals, Pa or bar)
  readonly chemical_potentials: Record<string, number>; // Standard chemical potentials (\mu_i^0)
}

/**
 * Boundary flux vector tracking energy, matter, and entropy crossing system boundaries.
 */
export interface IBoundaryFluxVector {
  readonly heat_flux_Q_dot: number;        // Rate of heat transfer across boundary (Watts, W)
  readonly boundary_temperature_T_b: number; // Temperature at the system boundary (Kelvin, K)
  readonly mass_fluxes: Record<string, number>; // Elemental/molecular mass flow rates (kg/s or mol/s)
  readonly entropy_flux_S_dot: number;     // Rate of entropy transfer across boundary (\dot{Q}/T_b) (W/K)
}

/**
 * Thermodynamic State Vector capturing intensive and extensive properties
 * of a subsystem or global earth pod instance.
 */
export interface IThermodynamicStateVector {
  readonly timestamp: number;
  readonly internal_energy_U: number;     // Joules (J)
  readonly entropy_S: number;             // Joules per Kelvin (J/K)
  readonly temperature_T: number;         // Kelvin (K)
  readonly pressure_P: number;            // Pascals (Pa)
  readonly volume_V: number;              // Cubic meters (m^3)
  readonly stock_masses: Record<string, number>; // Elemental pool masses (kg)
}

/**
 * Rigorous Second Law accounting structure for entropy generation and exergy destruction.
 */
export interface IEntropyGenerationMetrics {
  /** Internal entropy generation rate (\dot{S}_{gen} >= 0) in W/K */
  readonly internal_entropy_generation_rate: number;
  
  /** Ambient reference temperature used for exergy destruction calculation (K) */
  readonly reference_temperature_T0: number;
  
  /** Exergy destruction rate (\dot{I} = T_0 \cdot \dot{S}_{gen}) in Watts (W) */
  readonly exergy_destruction_rate: number;
  
  /** Flag indicating compliance with the Second Law (\dot{S}_{gen} >= -ε) */
  readonly satisfies_second_law: boolean;
}

/**
 * Monad Stock Transition Payload representing state updates during process execution.
 */
export interface IThermodynamicMonadTransition {
  readonly prior_state: IThermodynamicStateVector;
  readonly posterior_state: IThermodynamicStateVector;
  readonly boundary_flux: IBoundaryFluxVector;
  readonly metrics: IEntropyGenerationMetrics;
}

/**
 * Contract for any process or subsystem participating in thermodynamic state evolution.
 */
export interface IThermodynamicProcessContract {
  executeTransition(
    currentState: IThermodynamicStateVector,
    dt: number
  ): IThermodynamicMonadTransition;
  
  validateFirstLaw(transition: IThermodynamicMonadTransition): boolean;
  validateSecondLaw(transition: IThermodynamicMonadTransition): boolean;
}
```

---

## 3. Class Hierarchy & Architecture Integration

```
IThermodynamicProcessContract (Interface)
 └── BaseThermodynamicProcess (Abstract Class in src/thermodynamics/methods.ts)
      ├── CarbonCycleProcess (src/cycles/carbon.ts)
      ├── NitrogenCycleProcess (src/cycles/nitrogen.ts)
      ├── PhosphorusCycleProcess (src/cycles/phosphorus.ts)
      └── WaterCycleProcess (src/cycles/water.ts)
```

### Monad Stock Transitions
- **Input Monad State ($\mathcal{M}_t$):** Contains `IThermodynamicStateVector` at time $t$.
- **Process Transformation:** Biogeochemical cycles consume solar radiation flux, compute internal transformations, and output mass/energy adjustments.
- **Output Monad State ($\mathcal{M}_{t+\Delta t}$):** Validates $\Delta U = Q - W$ (First Law) and $\dot{S}_{\text{gen}} \ge 0$ (Second Law) before committing state transitions to the database/memory store.

---

## 4. Verification & Testing Strategy
1. **Type-Level Tests:** Ensure all cycle implementations (`src/cycles/*.ts`) strictly conform to `IThermodynamicStateVector`, `IBoundaryFluxVector`, and `IEntropyGenerationMetrics`.
2. **Thermodynamic Unit Tests (`tests/sprint_022.test.ts`):**
   - Verify $\dot{I} = T_0 \dot{S}_{\text{gen}}$ holds identically across all simulated cycles.
   - Assert violation exceptions are thrown if $\dot{S}_{\text{gen}} < 0$ (Second Law breach).
   - Verify mass conservation across planetary reservoirs (First Law compliance).