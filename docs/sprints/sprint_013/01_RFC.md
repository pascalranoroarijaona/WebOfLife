# RFC 013: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## 1. Overview and Motivation

As the *Web of Life* simulation evolves toward an exact macroscopic and microscopic thermodynamic representation of Gaia, treating matter and energy as unconstrained pools is no longer sufficient. Sprint 13 establishes the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`). This interface provides rigorous mathematical contracts for:
1. Internal entropy generation rates ($\dot{S}_{\text{gen}} \ge 0$).
2. Exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$ where $T_0$ is the ambient reference temperature).
3. Boundary flux arrays accounting for incoming solar exergy, outgoing thermal radiation, and matter conservation boundaries.

This specification guarantees absolute adherence to the First Law of Thermodynamics (energy conservation across closed/open ecosystem boundaries) and the Second Law of Thermodynamics (irreversibility and non-negative entropy generation).

---

## 2. Architectural Placement

```
                  ┌─────────────────────────────────────────┐
                  │          EarthPod / Main Loop           │
                  └────────────────────┬────────────────────┘
                                       │ uses
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │   src/thermodynamics/types.ts           │
                  │   - IThermodynamicStateVector           │
                  │   - IBoundaryFluxArray                  │
                  │   - IExergyMetrics                      │
                  └────────┬────────────────────────┬───────┘
                           │                        │
       extends / implements│                        │ implements
                           ▼                        ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│  src/thermodynamics/                 │   │  src/cycles/                 │
│  thermodynamic_structure.ts          │   │  carbon.ts, nitrogen.ts,     │
│  (Concrete Thermodynamic Engine)     │   │  phosphorus.ts, water.ts     │
└──────────────────────────────────────┘   └──────────────────────────────┘
```

---

## 3. Class Hierarchy Additions & Interface Contracts (`src/thermodynamics/types.ts`)

```typescript
/**
 * @fileoverview Thermodynamic State Vector Interface
 * Enforces First and Second Law thermodynamics across all biogeochemical cycles.
 */

export interface IBoundaryFluxArray {
  /** Incoming solar radiative flux (W/m^2 or total W). Must be >= 0. */
  solarInput: number;
  
  /** Outgoing thermal/longwave radiative flux (W). */
  thermalRadiationOut: number;
  
  /** Enthalpy flux associated with boundary matter exchange (W). */
  matterEnthalpyFlux: number;
  
  /** Net heat transfer rate across the system boundary (W). */
  netHeatFlux: number;
}

export interface IExergyMetrics {
  /** Ambient reference temperature (K), standard default = 288.15 K. */
  T_0: number;
  
  /** Internal entropy generation rate (\dot{S}_gen, W/K). Must satisfy \dot{S}_gen >= 0 (2nd Law). */
  entropyGenerationRate: number;
  
  /** Exergy destruction rate (\dot{I} = T_0 * \dot{S}_gen, W). */
  exergyDestructionRate: number;
  
  /** Total available exergy or exergy content of the system (W). */
  totalExergy: number;
}

export interface IThermodynamicStateVector {
  /** Unique timestamp or simulation tick identifier. */
  tick: number;
  
  /** Total internal energy of the system U (Joules). */
  internalEnergy: number;
  
  /** Total system entropy S (J/K). */
  totalEntropy: number;
  
  /** Boundary flux vector containing radiative and matter exchange terms. */
  boundaryFluxes: IBoundaryFluxArray;
  
  /** Exergy metrics enforcing second-law degradation tracking. */
  exergyMetrics: IExergyMetrics;
  
  /** 
   * Validates First Law conservation: dU/dt = Sum(Q_dot) - Sum(W_dot) + Sum(h_dot * m_dot).
   */
  validateFirstLaw(dt: number, previousEnergy: number): boolean;

  /** 
   * Validates Second Law compliance: \dot{S}_gen >= 0.
   */
  validateSecondLaw(): boolean;
}
```

---

## 4. Monad Stock Transitions & Conservation Laws

To integrate seamlessly with the existing biogeochemical cycles (`Carbon`, `Nitrogen`, `Phosphorus`, `Water`), state transitions operate as pure monads that thread thermodynamic validation checks:

1. **Matter Conservation (First Law - Mass/Elements):**
   $$\sum_{i} M_{i}^{(t+\Delta t)} = \sum_{i} M_{i}^{(t)} + \sum \dot{M}_{\text{boundary}} \Delta t$$
   No matter is created or destroyed within internal ecosystem compartments.

2. **Energy Conservation (First Law - Enthalpy/Internal Energy):**
   $$\Delta U = Q_{\text{solar}} - Q_{\text{thermal}} + W_{\text{boundary}}$$
   Solar input is the sole external energy driver (`src/cycles/base_cycle.ts`).

3. **Entropy Evolution (Second Law):**
   $$\frac{dS}{dt} = \sum \frac{\dot{Q}_i}{T_i} + \dot{S}_{\text{gen}}$$
   Where $\dot{S}_{\text{gen}} \ge 0$ is strictly enforced at every integration step via `IThermodynamicStateVector.validateSecondLaw()`.

---

## 5. Verification & Testing Strategy

A new test suite (`tests/sprint_013.test.ts`) will be introduced to verify:
- Non-negative entropy generation under arbitrary metabolic workflows ($\dot{S}_{\text{gen}} \ge 0$).
- Exact proportionality between exergy destruction and entropy generation ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).
- Strict balance of energy inputs (solar radiation only) against internal accumulation and boundary radiation.