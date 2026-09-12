# RFC 021: Thermodynamic State Vector Interface Contracts (`src/thermodynamics/types.ts`)

**Status:** Draft | **Sprint:** 21 | **Author:** Chief Systems Architect  
**Dependencies:** Sprints 01–20, `src/thermodynamics/thermodynamic_structure.ts`, `src/thermodynamics/methods.ts`

---

## 1. Executive Summary

As the Web of Life simulation evolves into a rigorous biogeochemical and thermodynamic engine, we must enforce strict mathematical and programmatic guarantees regarding energy conservation, entropy production, and exergy destruction. 

Sprint 21 formalizes the thermodynamic interface contracts within `src/thermodynamics/types.ts`. This specification establishes robust TypeScript interfaces for internal entropy generation rates ($\dot{S}_{\text{gen}}$), exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), boundary flux arrays, and monad state transformations while maintaining absolute compliance with the First and Second Laws of Thermodynamics (closed-system matter conservation, open-system energy flux driven exclusively by solar inputs and planetary thermal radiation).

---

## 2. Thermodynamic Principles & Governing Equations

### 2.1 First Law of Thermodynamics (Energy Conservation)
For any subsystem or the global Earth Pod system $\Omega$, the total energy balance accounts for internal energy changes driven by net heat flux, work interactions, and mass-associated enthalpy boundary crossings:

$$\frac{dE_{\text{system}}}{dt} = \sum_{j} \dot{Q}_j - \dot{W}_{\text{sys}} + \sum_{in} \dot{m}_{in} h_{in} - \sum_{out} \dot{m}_{out} h_{out}$$

In our localized monad processes, matter is strictly conserved ($\sum \Delta M = 0$), and external energy input is exclusively bounded by incoming solar irradiance ($Q_{\text{solar}}$) and dissipated via longwave radiation ($Q_{\text{emitted}}$).

### 2.2 Second Law of Thermodynamics (Entropy Generation)
The time rate of change of entropy within the system is linked to heat transfer boundaries and internal irreversibilities:

$$\frac{dS_{\text{system}}}{dt} = \sum_{j} \frac{\dot{Q}_j}{T_j} + \dot{S}_{\text{gen}}$$

where $\dot{S}_{\text{gen}} \ge 0$ represents the internal entropy generation rate due to finite-temperature gradients, viscous dissipation, chemical reaction irreversibilities, and metabolic heat loss.

### 2.3 Exergy Destruction Rate
Exergy ($\Xi$) represents the maximum useful work obtainable as the system brings itself into equilibrium with a reference environment at temperature $T_0$ and pressure $P_0$. The rate of exergy destruction ($\dot{I}$) is proportional to internal entropy generation through the Gouy-Stodola theorem:

$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

where $T_0$ is the ambient sink temperature (set to $288.15\text{ K}$ standard planetary baseline).

---

## 3. Class Hierarchy Additions & Composition

To maintain object-oriented integrity across incremental sprints, we extend the thermodynamic structure without altering foundational base classes.

```
┌──────────────────────────────────────┐
│       IThermodynamicObservable       │
└──────────────────┬───────────────────┘
                   │ implements
┌──────────────────▼───────────────────┐
│     ThermodynamicStateVector         │
├──────────────────────────────────────┤
│ + entropyGenerationRate: number      │
│ + exergyDestructionRate: number      │
│ + boundaryFluxes: IBoundaryFlux[]    │
│ + temperatureReference: number       │
└──────────────────┬───────────────────┘
                   │ composes
┌──────────────────▼───────────────────┐
│   ThermodynamicMonadProcess<T, U>    │
├──────────────────────────────────────┤
│ + execute(stock: T): Monad<U>        │
│ + validateFirstLaw(): boolean        │
│ + validateSecondLaw(): boolean       │
└──────────────────────────────────────┘
```

---

## 4. Formal TypeScript Interface Contracts (`src/thermodynamics/types.ts`)

The complete type definitions to be implemented in `src/thermodynamics/types.ts`:

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @description Formal TypeScript interfaces for Thermodynamic State Vectors,
 * Entropy Generation, Exergy Destruction, and Boundary Flux Structures.
 */

/**
 * Enumeration of recognized thermodynamic boundary flux types.
 */
export enum FluxType {
  SOLAR_IRRADIANCE = 'SOLAR_IRRADIANCE',
  LONGWAVE_RADIATION = 'LONGWAVE_RADIATION',
  SENSIBLE_HEAT = 'SENSIBLE_HEAT',
  LATENT_HEAT = 'LATENT_HEAT',
  CHEMICAL_ENDBEAU = 'CHEMICAL_ENDBEAU',
  METABOLIC_DISSIPATION = 'METABOLIC_DISSIPATION'
}

/**
 * Structure representing a single boundary energy or mass flux vector component.
 */
export interface IBoundaryFlux {
  readonly id: string;
  readonly type: FluxType;
  readonly magnitudeWatts: number; // Watts [W] or J/s
  readonly boundaryTemperatureKelvin: number; // [K]
  readonly timestamp: number; // Simulation tick / seconds
}

/**
 * Comprehensive thermodynamic state vector capturing instantaneous
 * energetic, entropic, and exergic properties of a node or subsystem.
 */
export interface IThermodynamicStateVector {
  readonly internalEnergyJoules: number;
  readonly absoluteEntropyJoulesPerKelvin: number;
  
  /**
   * Internal entropy generation rate (\dot{S}_gen) [W/K or J/(s·K)].
   * Must satisfy \dot{S}_gen >= 0 per the Second Law of Thermodynamics.
   */
  readonly entropyGenerationRate: number;

  /**
   * Exergy destruction rate (\dot{I} = T_0 * \dot{S}_gen) [Watts].
   * Represents lost work potential due to thermodynamic irreversibilities.
   */
  readonly exergyDestructionRate: number;

  /**
   * Reference ambient temperature (T_0) [K], standard default = 288.15 K.
   */
  readonly referenceTemperatureKelvin: number;

  /**
   * Array of active boundary fluxes crossing the system perimeter.
   */
  readonly boundaryFluxes: readonly IBoundaryFlux[];
}

/**
 * Validation contract enforcing First and Second Law constraints.
 */
export interface IThermodynamicLawValidator {
  /**
   * Validates First Law (Energy Conservation):
   * dE/dt = Sum(Q_in - Q_out) + Sum(W_in - W_out) within tolerance delta.
   */
  validateFirstLaw(stateBefore: IThermodynamicStateVector, stateAfter: IThermodynamicStateVector, deltaSeconds: number, tolerance?: number): boolean;

  /**
   * Validates Second Law (Entropy Production):
   * \dot{S}_gen >= 0 for all internal transformations.
   */
  validateSecondLaw(state: IThermodynamicStateVector): boolean;
}

/**
 * Monad stock transition payload structure incorporating thermodynamic tracking.
 */
export interface IThermodynamicMonadPayload<T> {
  readonly stock: T;
  readonly thermodynamicState: IThermodynamicStateVector;
  readonly metadata: {
    readonly processId: string;
    readonly executionTimeMs: number;
    readonly lawComplianceVerified: boolean;
  };
}
```

---

## 5. Monad Stock Transitions & Integration

The thermodynamic monad process (`src/thermodynamics/thermodynamic_monad_process.ts`) wraps state transitions, threading the `IThermodynamicStateVector` through biochemical and elemental cycles (Carbon, Nitrogen, Phosphorus, Water).

```typescript
import { IThermodynamicStateVector, IThermodynamicMonadPayload } from './types';

export class ThermodynamicMonad<T> {
  private constructor(private readonly payload: IThermodynamicMonadPayload<T>) {}

  public static unit<T>(stock: T, initialState: IThermodynamicStateVector, processId: string): ThermodynamicMonad<T> {
    return new ThermodynamicMonad({
      stock,
      thermodynamicState: initialState,
      metadata: {
        processId,
        executionTimeMs: performance.now(),
        lawComplianceVerified: true
      }
    });
  }

  public bind<U>(transitionFn: (stock: T) => { nextStock: U; nextState: IThermodynamicStateVector }): ThermodynamicMonad<U> {
    const startTime = performance.now();
    const result = transitionFn(this.payload.stock);
    
    // Verify Second Law: S_gen >= 0
    if (result.nextState.entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation in process ${this.payload.metadata.processId}: \dot{S}_gen < 0 (${result.nextState.entropyGenerationRate})`);
    }

    return new ThermodynamicMonad({
      stock: result.nextStock,
      thermodynamicState: result.nextState,
      metadata: {
        processId: this.payload.metadata.processId,
        executionTimeMs: performance.now() - startTime,
        lawComplianceVerified: true
      }
    });
  }

  public extract(): IThermodynamicMonadPayload<T> {
    return this.payload;
  }
}
```

---

## 6. Verification and Test Plan

To validate Sprint 21 deliverables, unit tests in `tests/sprint_021.test.ts` will verify:
1. **Type Compliance:** Strict compile-time adherence to `IThermodynamicStateVector` and `IBoundaryFlux` structures.
2. **Second Law Enforcement:** Rejection of any monad state transition where `entropyGenerationRate < 0`.
3. **Exergy Calculation Accuracy:** Verification that $\dot{I} = T_0 \dot{S}_{\text{gen}}$ holds true across simulated carbon and water cycle fluxes.
4. **Matter Conservation:** Confirmation that elemental pool transformations preserve total atomic mass within $10^{-9}$ relative tolerance.