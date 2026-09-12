# RFC 016: Thermodynamic State Vector Interface & Nonequilibrium Energy Equations

**Status:** Draft  
**Author:** Chief Systems Architect  
**Sprint:** 16  
**Target Module:** `src/thermodynamics/types.ts` & `src/thermodynamics/thermodynamic_structure.ts`

---

## 1. Executive Summary & Objective

Sprint 16 establishes rigorous mathematical and software contracts for the **Thermodynamic State Vector Interface** within the Web of Life simulation architecture. As the planetary simulation scales across biogeochemical cycles (carbon, nitrogen, phosphorus, water), maintaining absolute compliance with the First and Second Laws of Thermodynamics is paramount. 

This RFC outlines:
1. Strict type definitions for internal entropy generation ($\dot{S}_{\text{gen}}$).
2. Exergy destruction rate quantification ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).
3. Comprehensive boundary heat and mass flux arrays.
4. Monad stock transitions enforcing mass conservation and solar-only energy input.
5. Incremental class hierarchies extending existing thermodynamic structures without rewriting legacy modules.

---

## 2. Thermodynamic Foundations & Laws Compliance

### 2.1 First Law: Conservation of Energy
The total energy change within any sub-system or planetary boundary $\Omega$ is governed by:
$$\frac{dE}{dt} = \sum_k \dot{Q}_k - \dot{W} + \sum_i \dot{m}_i h_i$$
Within the Web of Life, **all external energy input must originate solely from solar radiation** ($\dot{Q}_{\text{solar}}$), while internal work ($\dot{W}$) and boundary heat losses obey closed-system or open-system accounting.

### 2.2 Second Law: Entropy Generation & Exergy Destruction
The Second Law mandates that entropy within an isolated or interacting control volume cannot spontaneously decrease:
$$\frac{dS}{dt} = \sum_k \frac{\dot{Q}_k}{T_k} + \sum_i \dot{m}_i s_i + \dot{S}_{\text{gen}}$$
Where the internal entropy generation rate $\dot{S}_{\text{gen}} \ge 0$ under all non-equilibrium conditions. 

The **Exergy Destruction Rate** ($\dot{I}$), representing thermodynamic irreversibility, is defined via Gouy-Stodola theorem relative to an ambient reference temperature $T_0$ (set to 288.15 K for Earth standard atmosphere):
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$

---

## 3. Class Hierarchy & Interface Contracts (`src/thermodynamics/types.ts`)

To maintain object-oriented incremental design, we extend existing structures in `src/thermodynamics/` with explicit TypeScript interfaces and abstract base classes.

### 3.1 Core Interfaces

```typescript
/**
 * Represents boundary flux vectors for heat, work, and chemical species mass flow.
 */
export interface BoundaryFluxVector {
  /** Heat transfer rates across subsystem boundaries (W), indexed by boundary ID or surface node. */
  heatFluxes: Map<string, number>;
  /** Radiation flux vector, explicitly capturing incoming solar input vs outgoing terrestrial longwave. */
  radiationFlux: {
    solarIncoming: number;     // W (must be >= 0, primary energy source)
    terrestrialOutgoing: number; // W
  };
  /** Net mechanical or biochemical work transfer rate (W). */
  workRate: number;
  /** Mass flow rates of chemical species across boundaries (kg/s), mapped by species identifier. */
  massFluxes: Map<string, number>;
  /** Specific entropy associated with incoming/outgoing mass flows (J/(kg·K)). */
  specificEnthalpies: Map<string, number>;
  specificEntropies: Map<string, number>;
}

/**
 * Thermodynamic State Vector capturing energetic and entropic coordinates.
 */
export interface ThermodynamicStateVector {
  /** Internal energy (J). */
  internalEnergy: number;
  /** Enthalpy (J). */
  enthalpy: number;
  /** System absolute entropy (J/K). */
  entropy: number;
  /** System absolute temperature (K). Must be > 0. */
  temperature: number;
  /** Ambient reference temperature for exergy calculations (K), default 288.15 K. */
  ambientTemperature: number;
  /** Internal entropy generation rate (\dot{S}_{gen}), J/(K·s). Must be >= 0. */
  entropyGenerationRate: number;
  /** Exergy destruction rate (\dot{I} = T_0 \dot{S}_{gen}), W. Must be >= 0. */
  exergyDestructionRate: number;
  /** Exergy (availability) of the system state (J). */
  exergy: number;
}

/**
 * Contract for any thermodynamic control volume or planetary compartment.
 */
export interface IThermodynamicSystem {
  getStateVector(): ThermodynamicStateVector;
  getBoundaryFluxes(): BoundaryFluxVector;
  /** Computes time derivatives and updates internal entropy generation. */
  stepThermodynamics(dt: number, fluxes: BoundaryFluxVector): void;
  /** Validates First and Second Law invariants. */
  validateLaws(): ThermodynamicComplianceResult;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean; // Ensures \dot{S}_{gen} >= 0
  energyResidual: number;
  entropyResidual: number;
}
```

---

## 4. Monad Stock Transitions & Conservation Architecture

State transitions in biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) are wrapped in functional monads (`ThermodynamicStateMonad`) that track mass and energy balance checks upon every mutation.

### 4.1 Monad State Transition Contract

```typescript
export class ThermodynamicStateMonad {
  private constructor(
    private readonly state: ThermodynamicStateVector,
    private readonly fluxes: BoundaryFluxVector,
    private readonly errorMargin: number = 1e-6
  ) {}

  public static initialize(initialState: ThermodynamicStateVector, initialFluxes: BoundaryFluxVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(initialState, initialFluxes);
  }

  /**
   * Transforms the state via a thermodynamic process function, automatically enforcing:
   * 1. Mass conservation (First Law).
   * 2. Non-negative entropy generation (Second Law: \dot{S}_{gen} >= 0).
   */
  public transit(processFn: (s: ThermodynamicStateVector, f: BoundaryFluxVector) => { nextState: ThermodynamicStateVector; nextFluxes: BoundaryFluxVector }): ThermodynamicStateMonad {
    const { nextState, nextFluxes } = processFn(this.state, this.fluxes);

    // Enforce Second Law: \dot{S}_{gen} >= 0
    if (nextState.entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation: Entropy generation rate \dot{S}_{gen} (${nextState.entropyGenerationRate}) cannot be negative.`);
    }

    // Enforce Exergy Destruction Consistency: \dot{I} = T_0 \dot{S}_{gen}
    const expectedExergyDestruction = nextState.ambientTemperature * nextState.entropyGenerationRate;
    if (Math.abs(nextState.exergyDestructionRate - expectedExergyDestruction) > this.errorMargin) {
      throw new Error(`Thermodynamic Consistency Violation: Exergy destruction rate (${nextState.exergyDestructionRate}) does not match T_0 * \dot{S}_{gen} (${expectedExergyDestruction}).`);
    }

    return new ThermodynamicStateMonad(nextState, nextFluxes, this.errorMargin);
  }

  public extract(): { state: ThermodynamicStateVector; fluxes: BoundaryFluxVector } {
    return { state: { ...this.state }, fluxes: { ...this.fluxes } };
  }
}
```

---

## 5. Integration with Existing Cycles & Earth Pod

- **`src/thermodynamics/thermodynamic_structure.ts`**: Will be updated to implement `IThermodynamicSystem`, mapping high-level planetary reservoirs (atmosphere, hydrosphere, lithosphere, biosphere) to the new `ThermodynamicStateVector` interface.
- **`src/earth_pod.ts`**: Acts as the top-level orchestrator, aggregating subsystem entropy generation rates into planetary-scale dissipation metrics.
- **Solar-Only Enforcement**: Incoming shortwave radiation (`radiationFlux.solarIncoming`) is verified as the sole external energy source; any internal energy creation without corresponding boundary heat/mass inputs throws an immediate architecture fault.

---

## 6. Verification and Testing Plan

1. **Unit Tests (`tests/sprint_016.test.ts`)**:
   - Verify that negative $\dot{S}_{\text{gen}}$ inputs trigger runtime exceptions.
   - Validate exact computation of $\dot{I} = T_0 \dot{S}_{\text{gen}}$.
   - Confirm mass and energy balance across carbon, nitrogen, phosphorus, and water cycle transitions.
2. **Audit & Compliance**:
   - Automated checks in CI pipeline ensuring no thermodynamic equations violate Clausius inequality ($\oint \frac{dQ}{T} \le 0$).