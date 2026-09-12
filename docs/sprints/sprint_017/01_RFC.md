# RFC 017: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## Status
- **Sprint:** 17
- **Target Module:** `src/thermodynamics/types.ts`
- **Author:** Chief Systems Architect
- **Compliance:** First Law of Thermodynamics (Energy Conservation), Second Law of Thermodynamics (Non-negative Entropy Generation Rate $\dot{S}_{\text{gen}} \ge 0$), Solar-Input Exclusivity.

---

## 1. Abstract and Motivation

As the Web of Life simulation architecture matures (Sprint 17), maintaining rigorous thermodynamic accounting across elemental cycles (Carbon, Nitrogen, Phosphorus, Water) and metabolic monads requires a unified, formal type contract. 

Previous sprints established monadic thermodynamic process structures and boundary flux methods. Sprint 17 formally consolidates these through the **Thermodynamic State Vector Interface** inside `src/thermodynamics/types.ts`. This specification sets strict TypeScript interfaces for internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and multi-port boundary flux arrays.

---

## 2. Thermodynamic First and Second Law Principles

Every subsystem operating within the Web of Life must strictly adhere to universal thermodynamic balance equations:

### First Law (Energy Conservation)
$$\frac{dE_{\text{system}}}{dt} = \sum_{j} \dot{Q}_j - \dot{W} + \sum_{in} \dot{m}_{in} h_{in} - \sum_{out} \dot{m}_{out} h_{out}$$

### Second Law (Entropy Balance & Exergy Destruction)
$$\frac{dS_{\text{system}}}{dt} = \sum_{j} \frac{\dot{Q}_j}{T_j} + \sum_{in} \dot{m}_{in} s_{in} - \sum_{out} \dot{m}_{out} s_{out} + \dot{S}_{\text{gen}}$$

Where the internal entropy generation rate satisfies the Clausius-Duhem inequality:
$$\dot{S}_{\text{gen}} \ge 0$$

### Exergy Destruction Rate (Gouy-Stodola Theorem)
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
where $T_0$ is the ambient reference temperature (Kelvin).

---

## 3. Interface Specifications (`src/thermodynamics/types.ts`)

The new type definitions establish precise data structures for state vectors, boundary fluxes, and thermodynamic metrics.

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @description Thermodynamic State Vector and Boundary Flux Interface Definitions for Sprint 17.
 */

export type EnergyJoules = number;
export type EntropyJoulesPerKelvin = number;
export type TemperatureKelvin = number;
export type PowerWatts = number;
export type MassKilograms = number;
export type MassFluxRate = number; // kg/s

/**
 * Represents a boundary heat or mass flux entry with associated thermodynamic potentials.
 */
export interface IThermodynamicBoundaryFlux {
  readonly portId: string;
  readonly heatFluxWatts: PowerWatts;
  readonly boundaryTemperatureKelvin: TemperatureKelvin;
  readonly massFlowRateKgPerSec: MassFluxRate;
  readonly specificEnthalpyJoulesPerKg: number;
  readonly specificEntropyJoulesPerKgKelvin: number;
}

/**
 * Comprehensive Thermodynamic State Vector for any system, pod, or monad.
 */
export interface IThermodynamicStateVector {
  readonly timestamp: number;
  readonly internalEnergy: EnergyJoules;
  readonly totalEntropy: EntropyJoulesPerKelvin;
  readonly systemTemperature: TemperatureKelvin;
  readonly ambientReferenceTemperature: TemperatureKelvin;
  
  /** Array of active boundary fluxes entering or leaving the control volume */
  readonly boundaryFluxes: readonly IThermodynamicBoundaryFlux[];
  
  /** Rate of internal entropy generation (W/K or J/(s·K)) */
  readonly entropyGenerationRate: EntropyJoulesPerKelvin; // \dot{S}_gen
  
  /** Exergy destruction rate calculated via Gouy-Stodola theorem (Watts) */
  readonly exergyDestructionRate: PowerWatts; // \dot{I} = T_0 * \dot{S}_gen
}

/**
 * Contract for any object capable of evaluating its thermodynamic state.
 */
export interface IThermodynamicSystem {
  getStateVector(): IThermodynamicStateVector;
  validateFirstLaw(tolerance?: number): boolean;
  validateSecondLaw(): boolean;
}
```

---

## 4. Class Hierarchy Additions and Composition

To integrate the new state vector interface without breaking existing abstractions, classes in `src/thermodynamic_structure.ts`, `src/thermodynamics/thermodynamic_monad_process.ts`, and cycle processors will implement or compose `IThermodynamicSystem`.

```
[ IThermodynamicSystem ] (Interface)
        ▲
        │ implements
[ BaseThermodynamicStructure ] (Abstract Class)
        ▲
        ├── [ EarthPod ] (src/earth_pod.ts)
        ├── [ ThermodynamicMonadProcess ] (src/thermodynamics/thermodynamic_monad_process.ts)
        └── [ CycleProcessor ] (Carbon, Nitrogen, Phosphorus, Water Cycles)
```

### Validation Invariants
1. **Entropy Non-Negativity:** `state.entropyGenerationRate >= 0` is enforced on every evaluation cycle.
2. **Exergy Consistency:** `Math.abs(state.exergyDestructionRate - (state.ambientReferenceTemperature * state.entropyGenerationRate)) < 1e-9`.
3. **Solar Exclusivity:** All external energy inputs $\dot{Q}$ must trace back to the primary solar flux boundary port.

---

## 5. Verification and Test Plan (`tests/sprint_017.test.ts`)

1. **Unit Tests for State Vector Validation:** Verify that negative entropy generation rates throw an immediate thermodynamic validation error.
2. **First Law Conservation Audit:** Simulate closed and open metabolic loops under Carbon and Water cycles to verify energy balances within $10^{-6}$ relative tolerance.
3. **Second Law Audit:** Confirm monotonic non-decrease of total universe entropy across all integrated monad stock transitions.