# Request for Comments (RFC): Sprint 014
## Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

**Author:** Chief Systems Architect  
**Status:** Approved / In Progress  
**Target Module:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`  

---

## 1. Executive Summary

Sprint 014 establishes rigorous thermodynamic contracts and state vector interfaces for the Web of Life ecosystem. Building upon previous biogeochemical cycle models (carbon, nitrogen, phosphorus, and water), this sprint formalizes the mathematical accounting of internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays within `src/thermodynamics/types.ts`.

Adhering strictly to the **First Law of Thermodynamics** (conservation of total energy/matter within closed planetary boundaries) and the **Second Law of Thermodynamics** ($\dot{S}_{\text{gen}} \ge 0$, driven exclusively by external solar inputs and planetary dissipation), this RFC outlines class hierarchy additions, monad stock transitions, and interface definitions required to make the Gaian Earth Pod fully accountable thermodynamically.

---

## 2. Thermodynamic Foundations & Mathematical Formulation

### 2.1 First Law: Conservation of Energy and Matter
For any subsystem or the global Earth Pod system $\Omega$:
$$\frac{dE_{\text{sys}}}{dt} = \sum \dot{Q}_i - \sum \dot{W}_j + \sum \dot{m}_{\text{in}} h_{\text{in}} - \sum \dot{m}_{\text{out}} h_{\text{out}}$$
Given our strict mass-conservative closed-loop simulation (solar energy input only, zero net mass flux across planetary boundaries except radiative exchange), the energy balance simplifies to net incoming solar radiative flux minus outgoing longwave radiation, balanced by internal storage and biochemical dissipation.

### 2.2 Second Law: Entropy Generation and Exergy Destruction
The rate of entropy generation within the system must satisfy the Gouy-Stodola theorem:
$$\dot{S}_{\text{gen}} = \frac{dS_{\text{sys}}}{dt} - \sum \frac{\dot{Q}_k}{T_k} - \sum \dot{s}_{\text{in}}\dot{m}_{\text{in}} + \sum \dot{s}_{\text{out}}\dot{m}_{\text{out}} \ge 0$$

The **Exergy Destruction Rate** ($\dot{I}$) quantifies the lost work potential due to irreversibilities (e.g., metabolic heat dissipation, nutrient cycling friction, radiative thermal mismatch):
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
where $T_0$ is the environmental reference temperature (Kelvin), typically set to standard ambient temperature ($288.15\text{ K}$).

---

## 3. Class Hierarchy & Interface Specifications (`src/thermodynamics/types.ts`)

To support incremental design and object-oriented composition, we introduce the following core interfaces and base classes:

### 3.1 Core Interfaces

```typescript
export interface ThermodynamicStateVector {
  readonly timestamp: number;
  readonly internalEnergy: number;      // Joules (J)
  readonly totalEntropy: number;        // Joules per Kelvin (J/K)
  readonly temperature: number;         // Kelvin (K)
  readonly ambientReferenceTemp: number; // T_0 (K)
  readonly boundaryFluxes: BoundaryFluxArray;
}

export interface BoundaryFluxArray {
  solarRadiationIn: number;     // W (Watts)
  longwaveRadiationOut: number; // W
  sensibleHeatFlux: number;     // W
  latentHeatFlux: number;       // W
  netMassFlux: number;          // kg/s (must approximate 0 globally)
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number; // \dot{S}_{\text{gen}} (W/K)
  exergyDestructionRate: number; // \dot{I} = T_0 \dot{S}_{\text{gen}} (W)
  exergyEfficiency: number;      // dimensionless [0, 1]
  isSecondLawValid: boolean;     // enforces \dot{S}_{\text{gen}} >= -1e-9 (tolerance for float precision)
}
```

### 3.2 Thermodynamic Structure Extensions (`src/thermodynamics/thermodynamic_structure.ts`)

The existing thermodynamic structures will implement these interfaces, ensuring every biogeochemical cycle (Carbon, Nitrogen, Phosphorus, Water) reports its local entropy generation and exergy destruction to the global `EarthPod` instance.

```typescript
export abstract class BaseThermodynamicSystem {
  protected state: ThermodynamicStateVector;

  constructor(initialState: ThermodynamicStateVector) {
    this.state = initialState;
  }

  public abstract computeEntropyGeneration(dt: number): number;
  
  public getMetrics(): ThermodynamicMetrics {
    const sGen = this.computeEntropyGeneration(1.0);
    const iDest = sGen * this.state.ambientReferenceTemp;
    return {
      entropyGenerationRate: sGen,
      exergyDestructionRate: iDest,
      exergyEfficiency: this.calculateExergyEfficiency(),
      isSecondLawValid: sGen >= -1e-9
    };
  }

  protected abstract calculateExergyEfficiency(): number;
}
```

---

## 4. Monad Stock Transitions

To maintain immutable state evolution and transparent audit trails across time steps, thermodynamic state transitions are wrapped in a `ThermodynamicStateMonad`:

```typescript
export class ThermodynamicStateMonad {
  private constructor(private readonly state: ThermodynamicStateVector) {}

  public static unit(state: ThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public map(fn: (s: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateMonad {
    const nextState = fn(this.state);
    // Validate Second Law invariant
    return new ThermodynamicStateMonad(nextState);
  }

  public getState(): ThermodynamicStateVector {
    return this.state;
  }
}
```

---

## 5. Verification & Testing Plan

1. **Unit Tests (`tests/sprint_014.test.ts`)**:
   - Verify that $\dot{S}_{\text{gen}} \ge 0$ under all operational scenarios.
   - Assert that $\dot{I} = T_0 \dot{S}_{\text{gen}}$ holds exact equality across cycle computations.
   - Test boundary flux mass conservation invariants.
2. **Integration Tests**:
   - Ensure `EarthPod` aggregates exergy destruction rates from Carbon, Nitrogen, Phosphorus, and Water cycles correctly without violating solar-only energy input constraints.

---
*End of RFC Sprint 014*