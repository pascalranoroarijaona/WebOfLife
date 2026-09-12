# Request for Comments (RFC) - Sprint 25
## Thermodynamic State Vector Interface Contracts (`src/thermodynamics/types.ts`)

**Author:** Chief Systems Architect  
**Status:** Draft / Approved for Implementation  
**Target Module:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`, `src/thermodynamics/methods.ts`

---

## 1. Executive Summary and Sprint Goal

Sprint 25 formalizes strict, strongly-typed TypeScript interface contracts within `src/thermodynamics/types.ts` for quantifying non-equilibrium thermodynamic metrics across the Web of Life biosphere simulation framework. 

The primary objectives are:
1. **Entropy Generation Rate ($\dot{S}_{\text{gen}}$):** Define explicit data structures and interfaces calculating internal entropy production across biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) adhering to the Second Law of Thermodynamics ($\dot{S}_{\text{gen}} \ge 0$).
2. **Exergy Destruction Rate ($\dot{I}$):** Establish contract types for quantifying exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), where $T_0$ represents the ambient reference sink temperature ($298.15\text{ K}$).
3. **Boundary Flux Array Structures:** Design multidimensional interface definitions tracking energy, matter, and entropy boundary interactions, ensuring absolute mass conservation (First Law) and strict external solar boundary forcing (Second Law).

---

## 2. Thermodynamic First & Second Law Compliance

To maintain rigorous geophysical validity within the Gaia simulation framework, all added interfaces and monad stock state transitions must conform to two inviolable axioms:

$$\text{First Law (Conservation of Matter/Energy):} \quad \frac{dE_{\text{system}}}{dt} = \sum \dot{Q} - \sum \dot{W} + \sum \dot{m}_i (h_i + \frac{v_i^2}{2} + gz_i)$$

$$\text{Second Law (Entropy Balance):} \quad \frac{dS_{\text{system}}}{dt} = \sum \frac{\dot{Q}_k}{T_k} + \dot{S}_{\text{gen}} \quad \text{where} \quad \dot{S}_{\text{gen}} \ge 0$$

- **Solar Input Only:** External work and energy inputs are strictly bounded by incoming solar radiative flux monads. No arbitrary sinks or sources of internal energy/matter are permitted.

---

## 3. Class Hierarchy & Interface Specifications (`src/thermodynamics/types.ts`)

The following TypeScript definitions establish the formal contract structures for Sprint 25:

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @description Formal TypeScript interface contracts for thermodynamic state vectors,
 * entropy generation rates, exergy destruction, and boundary flux arrays.
 */

export interface ThermodynamicVector {
  readonly temperature: number; // Kelvin (K)
  readonly pressure: number;    // Pascal (Pa)
  readonly volume: number;      // Cubic meters (m^3)
  readonly internalEnergy: number; // Joules (J)
  readonly enthalpy: number;    // Joules (J)
  readonly entropy: number;     // Joules per Kelvin (J/K)
  readonly exergy: number;      // Joules (J)
}

export interface BoundaryFluxItem {
  readonly speciesId: string;
  readonly molarRate: number;   // mol/s
  readonly massRate: number;    // kg/s
  readonly enthalpyFlux: number;// W (J/s)
  readonly entropyFlux: number; // W/K (J/(s*K))
  readonly exergyFlux: number;  // W (J/s)
}

export interface BoundaryFluxArray {
  readonly incomingSolarRadiation: BoundaryFluxItem;
  readonly outgoingThermalRadiation: BoundaryFluxItem;
  readonly matterFluxes: ReadonlyArray<BoundaryFluxItem>;
  readonly netHeatFlux: number; // W
  readonly netWorkFlux: number; // W
}

export interface EntropyGenerationMetrics {
  readonly thermalDissipation: number; // W/K
  readonly chemicalReactionEntropy: number; // W/K
  readonly diffusiveTransportEntropy: number; // W/K
  readonly totalEntropyGenerationRate: number; // \dot{S}_{gen} (W/K), must be >= 0
}

export interface ExergyDestructionMetrics {
  readonly ambientTemperatureReference: number; // T_0 (K), default 298.15
  readonly exergyDestructionRate: number; // \dot{I} = T_0 * \dot{S}_{gen} (W)
  readonly secondLawEfficiency: number; // dimensionless [0, 1]
}

export interface ThermodynamicStateSnapshot {
  readonly timestamp: number; // Simulation tick / seconds
  readonly stateVector: ThermodynamicVector;
  readonly boundaryFluxes: BoundaryFluxArray;
  readonly entropyMetrics: EntropyGenerationMetrics;
  readonly exergyMetrics: ExergyDestructionMetrics;
}
```

---

## 4. Monad Stock Transitions & Integration Contract

The thermodynamic monad process (`src/thermodynamics/thermodynamic_monad_process.ts`) wraps state mutations to guarantee immutability and thermodynamic admissibility.

```typescript
export interface IThermodynamicMonad<T> {
  getState(): T;
  chain<U>(transition: (state: T) => U): IThermodynamicMonad<U>;
  validateSecondLaw(): boolean;
}
```

### Transition Rule:
1. Every biogeochemical cycle step (Carbon, Nitrogen, Phosphorus, Water) passes through the monad wrapper.
2. $\dot{S}_{\text{gen}}$ is evaluated at each step. If `totalEntropyGenerationRate < 0`, a `ThermodynamicViolationError` is thrown, halting non-physical backflow of entropy.

---

## 5. Verification and Testing Plan

- **Unit Tests (`tests/sprint_025.test.ts`):**
  - Verify that $\dot{S}_{\text{gen}} \ge 0$ under all stochastic cycle perturbations.
  - Assert correct computation of exergy destruction rate $\dot{I} = T_0 \dot{S}_{\text{gen}}$.
  - Validate boundary flux array conservation laws against closed-system and open-system solar-forced models.
- **Database Schema UML:** Update `db/uml/sprint_025_schema.puml` to reflect thermodynamic metrics logging tables.