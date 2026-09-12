# RFC 023: Thermodynamic State Vector Interface Contracts (`src/thermodynamics/types.ts`)

## 1. Executive Summary & Sprint Goal
Sprint 23 establishes rigorous, formal TypeScript interface contracts for the thermodynamic state vector within the Web of Life engine (`src/thermodynamics/types.ts`). By formalizing internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux array structures, this RFC ensures absolute compliance with the First and Second Laws of Thermodynamics (matter conservation and strictly solar exergy input with ambient thermal rejection).

---

## 2. Thermodynamic Foundations & Governing Equations

### 2.1 First Law of Thermodynamics (Energy Conservation)
For any open subsystem or the global Earth Pod domain:
$$\frac{dE}{dt} = \dot{Q}_{\text{net}} - \dot{W}_{\text{net}} + \sum_k \dot{m}_k h_k$$
Under closed-mass/open-energy planetary boundary conditions (matter conservation):
$$\frac{dU_{\text{Earth}}}{dt} = \dot{\Phi}_{\text{solar}} - \dot{\Phi}_{\text{thermal}} + \dot{W}_{\text{boundary}}$$

### 2.2 Second Law of Thermodynamics (Entropy Balance & Exergy Destruction)
The entropy rate balance for the control volume is:
$$\frac{dS}{dt} = \sum_j \frac{\dot{Q}_j}{T_j} + \sum_k \dot{m}_k s_k + \dot{S}_{\text{gen}}$$
Where internal entropy generation must satisfy:
$$\dot{S}_{\text{gen}} \ge 0 \quad (\text{Clausius Inequality / Dissipation Rate})$$

### 2.3 Exergy Destruction Rate ($\dot{I}$)
Gouy-Stodola Theorem relates exergy destruction to internal entropy generation relative to ambient temperature $T_0$:
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 3. Class Hierarchy Additions & Composition

Building upon existing thermodynamic modules (`src/thermodynamics/thermodynamic_structure.ts`, `src/thermodynamics/methods.ts`, and `src/thermodynamics/thermodynamic_monad_process.ts`), Sprint 23 introduces concrete typing structures to govern state evolution.

```
                    ┌─────────────────────────┐
                    │ IThermodynamicStateVector│
                    └───────────┬─────────────┘
                                │ extends / implements
                    ┌───────────▼─────────────┐
                    │   ThermodynamicState    │
                    └───────────┬─────────────┘
          ┌─────────────────────┴─────────────────────┐
          │ composition                               │ composition
┌─────────▼─────────────────┐               ┌─────────▼─────────────────┐
│ IBoundaryFluxStructure    │               │ IExergyDestructionMetrics │
└───────────────────────────┘               └───────────────────────────┘
```

---

## 4. Formal TypeScript Interface Contracts (`src/thermodynamics/types.ts`)

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @author Chief Systems Architect
 * @description Formal TypeScript interfaces for internal entropy generation,
 * exergy destruction, and boundary flux array structures adhering to 
 * First and Second Laws of Thermodynamics.
 */

export type FluxType = 'SOLAR_SHORTWAVE' | 'TERRESTRIAL_LONGWAVE' | 'SENSIBLE_HEAT' | 'LATENT_HEAT' | 'MASS_FLUX';

/**
 * Represents a boundary energy or mass flux vector crossing the control volume boundary.
 */
export interface IBoundaryFlux {
  readonly id: string;
  readonly type: FluxType;
  /** Rate of energy or mass transfer (Watts for energy, kg/s for mass). */
  readonly magnitude: number;
  /** Effective boundary temperature (Kelvin) at which the flux crosses. */
  readonly temperature: number;
  /** Specific enthalpy (J/kg) if mass flux. */
  readonly specificEnthalpy?: number;
  /** Specific entropy (J/(kg·K)) if mass flux. */
  readonly specificEntropy?: number;
}

/**
 * Array structure managing multiple boundary fluxes for the thermodynamic control volume.
 */
export interface IBoundaryFluxStructure {
  readonly fluxes: ReadonlyArray<IBoundaryFlux>;
  /** Net rate of heat addition across boundaries (Watts). */
  readonly netHeatRate: number;
  /** Net rate of work transfer (Watts). */
  readonly netWorkRate: number;
  /** Net mass flux balance (kg/s), strictly bounded to zero for closed matter systems. */
  readonly netMassBalance: number;
}

/**
 * Metrics governing exergy destruction and entropy generation.
 */
export interface IExergyDestructionMetrics {
  /** Reference ambient temperature T0 (Kelvin), typically 288.15 K. */
  readonly ambientTemperature: number;
  /** Rate of internal entropy generation S_gen (W/K), must be >= 0. */
  readonly entropyGenerationRate: number;
  /** Rate of exergy destruction I = T0 * S_gen (Watts), must be >= 0. */
  readonly exergyDestructionRate: number;
  /** Total incoming exergy rate (solar radiation exergy). */
  readonly inputExergyRate: number;
  /** Exergy efficiency of the planetary control volume (0 to 1). */
  readonly exergeticEfficiency: number;
}

/**
 * Comprehensive Thermodynamic State Vector combining energy, entropy, and exergy.
 */
export interface IThermodynamicStateVector {
  readonly timestamp: number;
  /** Internal energy U of the system (Joules). */
  readonly internalEnergy: number;
  /** Total system entropy S (Joules / Kelvin). */
  readonly totalEntropy: number;
  /** Boundary flux structure encapsulating energetic interactions. */
  readonly boundaryFluxes: IBoundaryFluxStructure;
  /** Second Law metrics (entropy generation and exergy destruction). */
  readonly exergyMetrics: IExergyDestructionMetrics;
}

/**
 * Contract for thermodynamic validator functions ensuring First/Second Law compliance.
 */
export interface IThermodynamicValidator {
  validateFirstLaw(state: IThermodynamicStateVector, dt: number): boolean;
  validateSecondLaw(state: IThermodynamicStateVector): boolean;
}
```

---

## 5. Monad Stock Transitions & Conservation Invariants

The thermodynamic monad state transformer (`ThermodynamicMonadProcess`) governs state updates while preserving invariants:

1. **Matter Conservation Invariant:**
   $$\Delta M_{\text{system}} = \int \sum \dot{m}_{\text{in}} dt - \int \sum \dot{m}_{\text{out}} dt = 0 \quad (\text{closed global biosphere})$$
2. **Second Law Monotonicity Invariant:**
   $$\dot{S}_{\text{gen}} \ge 0 \quad \forall t$$

---

## 6. Verification and Test Plan
- **Unit Tests (`tests/sprint_023.test.ts`):** Verify that any state vector violating $\dot{S}_{\text{gen}} < 0$ or $\dot{I} < 0$ throws a thermodynamic violation exception.
- **Integration Tests:** Validate coupled biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) against the new `IThermodynamicStateVector` contracts.