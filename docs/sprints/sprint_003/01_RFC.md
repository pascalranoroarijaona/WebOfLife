# RFC 003: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## 1. Overview and Objectives
As Chief Systems Architect for *Web of Life*, this Request for Comments (RFC) defines the formal technical specification for Sprint 003. Building upon our existing thermodynamic foundations (`src/thermodynamics/thermodynamic_structure.ts`), Sprint 003 establishes strict contractual types, state vector interfaces, and invariant checks in `src/thermodynamics/types.ts`.

The core objective is to codify rigorous thermodynamic laws into the software architecture:
1. **First Law (Conservation of Energy/Matter):** Total energy and mass changes within any control volume must precisely balance boundary fluxes and internal sources without spontaneous creation or destruction.
2. **Second Law (Entropy Generation & Exergy Destruction):** Irreversibilities are tracked explicitly via internal entropy generation rates ($\dot{S}_{\text{gen}} \ge 0$) and the corresponding exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), where $T_0$ is the ambient reference temperature.
3. **Solar-Driven Boundary Conditions:** All external energy inputs are strictly bounded by incoming solar irradiance and outward longwave thermal radiation to space.

---

## 2. Architectural Context & Repository Evolution
We treat the codebase as an incremental, long-term evolutionary system. Sprint 003 extends `src/thermodynamics/thermodynamic_structure.ts` by introducing pure TypeScript interfaces and type guards that can be consumed by `EarthPod` (`src/earth_pod.ts`) and simulation runloops (`src/main.ts`).

### Existing Structure
- `src/thermodynamics/thermodynamic_structure.ts`: Base classes for thermodynamic nodes, energy reservoirs, and heat/mass transfer paths.
- `src/earth_pod.ts`: Encapsulates Earth system compartments (atmosphere, hydrosphere, biosphere, lithosphere).

### New Additions in Sprint 003
- `src/thermodynamics/types.ts`: Defines `ThermodynamicStateVector`, `BoundaryFluxArray`, `EntropyMetrics`, and strict validation predicates.

---

## 3. Class Hierarchy & Interface Contracts (`src/thermodynamics/types.ts`)

### 3.1 Interface Specifications

```typescript
/**
 * Represents the boundary flux array across control volume surfaces.
 * Units: Watts (W) for thermal power, kg/s for mass fluxes.
 */
export interface BoundaryFluxArray {
  /** Net radiative heat flux (Solar input - Terrestrial output) [W] */
  readonly radiativeFlux: number;
  /** Sensible and latent heat transfer across boundaries [W] */
  readonly convectiveFlux: number;
  /** Mass-transported enthalpy flux [W] */
  readonly massEnthalpyFlux: number;
  /** Species mass inflow/outflow rates [kg/s] */
  readonly speciesMassFluxes: Record<string, number>;
}

/**
 * Encapsulates second-law thermodynamic metrics for a control volume.
 */
export interface EntropyMetrics {
  /** Rate of internal entropy generation due to irreversibilities (d(S_gen)/dt) [W/K]. Must be >= 0. */
  readonly sGenRate: number;
  /** Ambient reference temperature for exergy calculations [K] */
  readonly referenceTemperature: number;
  /** Exergy destruction rate (I = T_0 * S_gen_dot) [W]. Must be >= 0. */
  readonly exergyDestructionRate: number;
}

/**
 * Comprehensive Thermodynamic State Vector for any Web of Life control volume.
 */
export interface ThermodynamicStateVector {
  /** Timestamp or simulation tick */
  readonly timestamp: number;
  /** Total internal energy of the control volume [J] */
  readonly internalEnergy: number;
  /** Total mass of the control volume [kg] */
  readonly totalMass: number;
  /** Absolute temperature of the control volume [K] */
  readonly temperature: number;
  /** Boundary flux vector */
  readonly fluxes: BoundaryFluxArray;
  /** Second-law entropy and exergy metrics */
  readonly entropyMetrics: EntropyMetrics;
}
```

### 3.2 Monad Stock Transitions & Invariant Validation
State transitions operate as pure functions mapping a prior `ThermodynamicStateVector` and time step ($\Delta t$) to a subsequent state vector, subject to thermodynamic invariants:

1. **Mass Conservation Invariant:**
   $$\Delta M = \int \sum \dot{m}_{\text{in/out}} dt$$
2. **Energy Balance Invariant:**
   $$\Delta U = \sum Q_{\text{net}} + \sum W_{\text{net}} + \sum H_{\text{mass}}$$
3. **Clausius-Duhem Inequality (Second Law):**
   $$\dot{S}_{\text{gen}} = \frac{dS}{dt} - \sum \frac{Q_i}{T_i} \ge 0$$
   $$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 4. Verification and Testing Strategy
Tests will be implemented in `tests/sprint_003.test.ts` (or integrated into existing test runners) to verify:
- Rejection of state vectors where `sGenRate < 0` or `exergyDestructionRate < 0`.
- Conservation of mass across closed and open system pods.
- Strict accounting of solar radiation as the sole primary energy influx.