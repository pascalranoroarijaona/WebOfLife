# RFC-045: Thermodynamic Overrides Helper for Granular Cell State Mutations in H3StateTensor

- **Sprint:** 045
- **Status:** Proposed
- **Author:** Chief Systems Architect
- **Target Subsystem:** `src/spatial/h3_state_tensor.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`
- **Thermodynamic Domain:** Mass-Energy Conservation (First Law), Entropy Non-Decrease & Boundary Ledgering (Second Law)

---

## 1. Executive Summary & Sprint Goal

### 1.1 Goal
Implement `applyThermodynamicOverrides` within `src/spatial/h3_state_tensor.ts` (alongside associated type contracts in `src/spatial/h3_types.ts`) to enable targeted, partial cell state updates across arbitrary H3 spatial hexagons without requiring full tensor recreation.

### 1.2 Motivation
In planetary simulation, external forcing agents (e.g., vulcanism, anthropogenic carbon sequestration/emission, localized albedo modification, atmospheric river influxes, and experimental micro-climate interventions) require selective injection of state adjustments onto individual H3 cells. Direct raw array manipulation risks:
1. **Thermodynamic leaks**: Untracked addition or destruction of mass/energy violating First Law conservation.
2. **Phase inconsistencies**: Setting temperatures below absolute zero ($0\,\text{K}$), negative chemical or biomass stocks, or invalid pressure/density couplings.
3. **Monadic divergence**: Bypassing the spatial monad's state ledger, leaving audit tools and rewind mechanics desynchronized.

The `applyThermodynamicOverrides` helper formalizes partial state mutation as a first-class, thermodynamically auditable transformation.

---

## 2. Thermodynamic Foundations & Invariant Analysis

### 2.1 First Law Conservation & Boundary Ledger Accounting
In an isolated thermodynamic manifold $\Omega$, the global mass $M$ and internal energy $U$ are conserved:
$$\frac{dM_{\Omega}}{dt} = 0, \quad \frac{dU_{\Omega}}{dt} = \dot{Q}_{\text{solar}} - \dot{Q}_{\text{rerad}}$$

When `applyThermodynamicOverrides` mutates cell $i \in \Omega$ with state delta $\Delta \mathbf{s}_i$, it represents an open boundary interaction across time step $\Delta t$. Therefore, any mutation **must** be quantified by an override ledger $\mathcal{L}_{\text{override}}$:
$$\Delta M_{\text{override}} = \sum_{i} \left( M_i^{\text{post}} - M_i^{\text{pre}} \right)$$
$$\Delta U_{\text{override}} = \sum_{i} \left( U_i^{\text{post}} - U_i^{\text{pre}} \right)$$

This guarantees that external forcings are tracked as explicit boundary fluxes rather than phantom sources or sinks.

### 2.2 Second Law Constraints & Domain Validity
Mutations applied through partial overrides must satisfy thermodynamic realization criteria:
1. **Positivity of Matter**: For every matter stock $S_{m,i} \in \{\text{water}, \text{soil\_organic\_carbon}, \text{biomass}, \text{atmospheric\_co2}, \text{nutrients}\}$,
   $$S_{m,i}^{\text{override}} \ge 0$$
2. **Absolute Temperature Lower Bound**: Temperature $T_i$ must never breach the Third Law limit:
   $$T_i \ge T_{\text{min}} > 0\,\text{K} \quad (\text{default } T_{\text{min}} = 2.73\,\text{K})$$
3. **Internal Energy-Temperature Consistency**: Overriding temperature recalculates internal sensible heat according to specific heat capacity $c_{p,i}$:
   $$U_{\text{sensible},i} = m_i \cdot c_{p,i} \cdot T_i$$
   Conversely, overriding thermal energy updates $T_i$.

---

## 3. Class Hierarchy & Architectural Design

### 3.1 Object-Oriented Composition
We maintain an incremental, backwards-compatible architecture building upon `H3StateTensor`:

```
+-------------------------------------------------------------+
|                      H3StateTensor                          |
|  - _cellCount: number                                       |
|  - _indices: string[] / Map<string, number>                 |
|  - _buffer: Float64Array                                    |
+-------------------------------------------------------------+
                              ^
                              | calls helper
+-------------------------------------------------------------+
|              applyThermodynamicOverrides(...)               |
|  - validates state boundary limits                          |
|  - updates Float64Array channels in-place                   |
|  - aggregates ThermodynamicOverrideReport                   |
+-------------------------------------------------------------+
                              | returns
+-------------------------------------------------------------+
|                ThermodynamicOverrideReport                  |
|  - netMassDeltaKg: number                                   |
|  - netEnergyDeltaJoules: number                             |
|  - modifiedCellsCount: number                               |
|  - appliedDeltas: Map<string, ThermodynamicDeltaRecord>     |
+-------------------------------------------------------------+
```

### 3.2 Monadic Stock Transition Contract
The `SpatialMonad` binds state tensors through functional pipelines:
$$\mathcal{M}_{t+1} = \mathcal{M}_t.\text{bind}(\text{tensor} \to \text{tensor}.\text{applyOverrides}(\text{overrides}))$$
The returned monad retains an immutable audit record of external thermodynamic work and matter flux injected into the ecosystem.

---

## 4. Interface Contracts & Specification

### 4.1 Type Definitions (`src/spatial/h3_types.ts`)

```typescript
/**
 * Partial thermodynamic state representing target values or overrides
 * for a single hexagonal cell.
 */
export interface CellThermodynamicOverride {
  temperatureKelvin?: number;
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  sensibleHeatJoules?: number;
  albedo?: number;
}

/**
 * Map or dictionary of H3 index string to partial override parameters.
 */
export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

/**
 * Auditing record detailing mass and energy delta per modified cell.
 */
export interface CellThermodynamicDeltaRecord {
  h3Index: string;
  cellIndex: number;
  massDeltaKg: number;
  energyDeltaJoules: number;
  overriddenFields: (keyof CellThermodynamicOverride)[];
}

/**
 * Comprehensive ledger generated by applyThermodynamicOverrides.
 */
export interface ThermodynamicOverrideReport {
  timestamp: number;
  cellCountModified: number;
  netMassDeltaKg: number;
  netEnergyDeltaJoules: number;
  cellReports: CellThermodynamicDeltaRecord[];
}

/**
 * Behavioral configuration options for applying overrides.
 */
export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  allowMassDestruction?: boolean;
  recomputeSensibleHeat?: boolean;
}
```

### 4.2 Helper Method Signatures (`src/spatial/h3_state_tensor.ts`)

```typescript
/**
 * Applies partial thermodynamic overrides across specified H3 cells within the state tensor.
 * Validates domain boundaries, updates contiguous Float64Array buffers in-place,
 * and compiles a thermodynamic conservation audit report.
 *
 * @param tensor The target H3StateTensor instance.
 * @param overrides A Map or Record associating H3 cell indices to partial overrides.
 * @param options Behavioral constraints (clamping, bounds checking, sensible heat recalculation).
 * @returns ThermodynamicOverrideReport detailing mass-energy additions and state changes.
 */
export function applyThermodynamicOverrides(
  tensor: H3StateTensor,
  overrides: H3ThermodynamicOverridesMap,
  options?: OverrideOptions
): ThermodynamicOverrideReport;
```

---

## 5. Algorithmic Step-by-Step Implementation

1. **Resolution of Target Cells**:
   - Iterate through the keys of `overrides`.
   - Query cell numeric offset $i = \text{tensor.getCellOffset}(h3Index)$.
   - If $i = -1$ (cell not present in spatial tensor), discard or raise `CellOutOfBoundsError` based on `options.strictThermodynamicBounds`.

2. **Pre-State Capture**:
   - Extract initial mass $M_i^{\text{pre}}$ and energy $U_i^{\text{pre}}$ from tensor channels.

3. **Field Validation & Clamping**:
   - For all scalar fields in `CellThermodynamicOverride`:
     - If $T < T_{\text{min}}$, throw `ThermodynamicDomainViolationError` (or clamp if non-strict).
     - If any mass stock $S_m < 0$, throw `NegativeMassForbiddenError`.
     - If $0 \le \alpha \le 1$ violated for albedo, clamp to $[0.0, 1.0]$.

4. **In-Place Buffer Mutation**:
   - Write new values into the corresponding stride offsets in `tensor._buffer`.
   - If `recomputeSensibleHeat` is true and `temperatureKelvin` was overridden without an explicit `sensibleHeatJoules`, calculate:
     $$U_{\text{sensible}, i}^{\text{new}} = \sum_{m} \left( \text{mass}_{m,i} \cdot c_{p,m} \right) \cdot T_i^{\text{new}}$$
     and update the thermal energy channel.

5. **Post-State Capture & Ledger Accumulation**:
   - Calculate $\Delta M_i = M_i^{\text{post}} - M_i^{\text{pre}}$ and $\Delta U_i = U_i^{\text{post}} - U_i^{\text{pre}}$.
   - Append `CellThermodynamicDeltaRecord` to `ThermodynamicOverrideReport`.
   - Aggregate global `netMassDeltaKg` and `netEnergyDeltaJoules`.

---

## 6. Verification & Test Plan

1. **Conservation Accounting Test (`tests/sprint_045.test.ts`)**:
   - Initialize 100-cell H3 state tensor.
   - Inject $+500\,\text{kg}$ water and $+120\,\text{kJ}$ thermal energy across 5 target cells.
   - Verify `report.netMassDeltaKg === 2500` and `report.netEnergyDeltaJoules === 600000`.
   - Verify un-mutated cells remain bitwise identical in the tensor buffer.

2. **Thermodynamic Limit Violations**:
   - Attempting to set $T = -5.0\,\text{K}$ or $\text{biomass} = -1.0\,\text{kg}$ must throw validation exceptions when `strictThermodynamicBounds: true`.
   - Clamping mode (`strictThermodynamicBounds: false`) sets $T = T_{\text{min}}$ ($2.73\,\text{K}$) and mass $= 0.0\,\text{kg}$.

3. **Monad State Preservation**:
   - Execute an override chain within `SpatialMonad`. Ensure monadic associativity holds and history audit logs match `ThermodynamicOverrideReport`.

4. **Benchmark & Memory Stability**:
   - Apply 10,000 cell overrides. Ensure zero garbage-collection overhead for array allocations (in-place buffer write).