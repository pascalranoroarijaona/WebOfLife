# RFC-044: Factory Specification for Baseline STP H3 Cell Thermodynamic State Tensor

- **Status**: Proposed
- **Author**: Chief Systems Architect
- **Sprint Target**: Sprint 044
- **Date**: 2025-02-17
- **Target Subsystem**: `src/spatial/h3_state_tensor.ts`, `src/spatial/h3_types.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary

Sprint 044 introduces the foundational thermodynamic factory function `createDefaultH3CellThermodynamicState` within `src/spatial/h3_state_tensor.ts`. As the Web of Life simulation scales to explicit hexagonal discrete global grids (H3 DGGS), every spatial cell must be instantiated with a well-defined, physically grounded baseline state at Standard Temperature and Pressure (STP).

This RFC formalizes the baseline thermodynamic vector components—enthalpy, internal energy, pressure, temperature, water inventory, atmospheric gaseous stocks, and carbon pools—ensuring rigorous compliance with the First Law (mass and energy conservation) and Second Law (non-negative entropy production) of thermodynamics.

---

## 2. Problem Statement & Motivation

Prior spatial abstractions initialized cells with fragmented or arbitrary parameters, creating potential entropy sinks and phantom energy generation during grid partitioning and cell subdivision. Without an authoritative factory for baseline cell state:

1. **Thermodynamic Drift**: New H3 cells can be instantiated with unbalanced enthalpies or undefined chemical potentials, violating conservation laws.
2. **Coupling Fragility**: Downstream trophic webs (`src/biosphere/trophic.ts`) and spatial monad transitions (`src/monads/spatial_monad.ts`) require deterministic, immutable baseline stocks for lithosphere, hydrosphere, atmosphere, and biosphere before executing flux operators.
3. **Discrete Spatial Consistency**: Each H3 cell represents a finite physical surface area and atmospheric column. Initializing state tensors requires exact area-scaling relative to standard global reference values.

---

## 3. Thermodynamic Axioms & Physical Invariants

### 3.1 First Law of Thermodynamics (Conservation of Energy and Matter)
$$\Delta U = Q - W + \sum_k \mu_k \Delta N_k$$
For an isolated system without external solar flux, $\frac{d}{dt}(U_{cell}) = 0$. The baseline factory initializes internal energy $U$ and total mass $M$ such that:
$$M_{total} = M_{atm} + M_{hydro} + M_{litho} + M_{bio}$$
$$U_{total} = U_{thermal} + U_{latent} + U_{chemical}$$
No energy or matter shall appear or disappear ex nihilo upon cell instantiation.

### 3.2 Second Law of Thermodynamics (Entropy Generation)
$$S_{gen} \ge 0$$
Initial chemical and thermal states must reside in stable local thermodynamic equilibrium at baseline STP ($T_{0} = 288.15\text{ K}$, $P_{0} = 101,325\text{ Pa}$), eliminating spontaneous non-physical entropy drops upon simulation kick-off.

---

## 4. Class Hierarchy & Interface Architecture

```
                 +-------------------------------+
                 |       IH3CellCoordinates      |
                 +---------------+---------------+
                                 |
                                 v
                 +-------------------------------+
                 |   IH3CellThermodynamicState   |
                 +---------------+---------------+
                                 |
             +-------------------+-------------------+
             |                                       |
             v                                       v
+--------------------------+           +--------------------------+
|  H3CellThermodynamicState|           |    SpatialMonad<State>   |
|         (Entity)         |           |       (Transition)       |
+--------------------------+           +--------------------------+
             ^
             |
   +---------+------------------------------+
   | Factory:                               |
   | createDefaultH3CellThermodynamicState  |
   +----------------------------------------+
```

### 4.1 Interface Contract additions (`src/spatial/h3_types.ts` & `src/spatial/h3_state_tensor.ts`)

```typescript
export interface IThermodynamicAtmosphereStock {
  readonly nitrogenMoles: number;    // N2
  readonly oxygenMoles: number;      // O2
  readonly co2Moles: number;         // CO2
  readonly waterVaporMoles: number;  // H2O (g)
  readonly surfacePressurePa: number; // Pa
}

export interface IThermodynamicHydrosphereStock {
  readonly liquidWaterKg: number;    // H2O (l)
  readonly iceKg: number;            // H2O (s)
  readonly salinityPsu: number;       // PSU
}

export interface IThermodynamicLithosphereStock {
  readonly soilOrganicCarbonKg: number;
  readonly inorganicMineralKg: number;
  readonly soilMoistureKg: number;
}

export interface IThermodynamicBiosphereStock {
  readonly autotrophBiomassKg: number;
  readonly heterotrophBiomassKg: number;
  readonly detritusKg: number;
}

export interface IH3CellThermodynamicState {
  readonly h3Index: string;
  readonly resolution: number;
  readonly areaM2: number;
  readonly temperatureKelvin: number;
  readonly atmosphere: IThermodynamicAtmosphereStock;
  readonly hydrosphere: IThermodynamicHydrosphereStock;
  readonly lithosphere: IThermodynamicLithosphereStock;
  readonly biosphere: IThermodynamicBiosphereStock;
  readonly internalEnergyJoules: number;
  readonly entropyJoulesPerKelvin: number;
}
```

### 4.2 Factory Signature and Behavioral Contract

```typescript
export function createDefaultH3CellThermodynamicState(
  h3Index: string,
  overrides?: Partial<IH3CellThermodynamicState>
): IH3CellThermodynamicState;
```

#### Behavioral Specifications:
1. **Resolution & Area Calculation**:
   Extracts H3 resolution from `h3Index`. Calculates cell area $A_{cell}$ using geodesic projection constants in `src/thermodynamics/constants.ts`.
2. **Standard STP Atmospheric Column**:
   - Surface pressure $P_0 = 101,325\text{ Pa}$.
   - Temperature $T_0 = 288.15\text{ K}$ (15°C global mean standard surface temperature).
   - Column gas mass scaled to $A_{cell} \times \frac{P_0}{g_0}$, where $g_0 = 9.80665\text{ m/s}^2$.
   - Gas mole fractions:
     - $N_2$: $78.084\%$
     - $O_2$: $20.946\%$
     - $CO_2$: $420\text{ ppm}$ ($0.042\%$)
     - $H_2O$: Saturated/Relative baseline humidity at $60\%$.
3. **Hydrosphere Baseline**:
   - Baseline nominal surface water distribution (default continental/oceanic mean or dry reference column if unspecified).
4. **Lithosphere & Biosphere Baselines**:
   - Non-negative baseline organic carbon and mineral fractions proportional to cell area.
5. **Internal Energy Formulation**:
   $$U_{cell} = C_{p,atm} M_{atm} T_0 + C_{p,hydro} M_{hydro} T_0 + C_{p,litho} M_{litho} T_0$$
   Consistent with absolute temperature in Kelvin.

---

## 5. Monad Stock Transitions & Integration

`createDefaultH3CellThermodynamicState` provides the identity element $\eta$ (unit) for the spatial monad `SpatialMonad<H3CellThermodynamicState>`:

$$\eta: \text{H3Index} \longrightarrow \mathcal{M}(\text{H3CellThermodynamicState})$$

When `SpatialMonad.of(cellState)` is invoked, it wraps an immutable instance created by this factory. Downstream monadic operations (`map`, `flatMap`, `diffuse`) can rely on strictly positive mass and non-zero positive Kelvin temperature across the tensor grid.

---

## 6. Implementation Steps

1. **Constants Update (`src/thermodynamics/constants.ts`)**:
   - Define reference STP values: $T_{STP} = 288.15\text{ K}$, $P_{STP} = 101325.0\text{ Pa}$, $MOLAR_MASS_AIR = 0.0289647\text{ kg/mol}$, $C_P\_AIR = 1005.0\text{ J/(kg}\cdot\text{K)}$.
2. **Type Declarations (`src/spatial/h3_types.ts`)**:
   - Export `IH3CellThermodynamicState` and sub-interfaces.
3. **State Factory Implementation (`src/spatial/h3_state_tensor.ts`)**:
   - Implement `H3CellThermodynamicState` class or immutable record.
   - Implement `createDefaultH3CellThermodynamicState(h3Index: string, overrides?: ...)`.
   - Implement validation guards verifying $T > 0$, masses $\ge 0$, and valid H3 format.
4. **Unit Verification (`tests/sprint_044.test.ts`)**:
   - Validate STP baseline values, conservation invariants, area scaling, and override immutability.

---

## 7. Quality & Verification Gates

- **Conservation Check**: Total moles of gas must match $P \cdot A / (M_{air} \cdot g)$ within $10^{-6}$ relative error.
- **Immutability Guarantee**: Returned objects must be deeply frozen or structurally unmodifiable.
- **Type Rigor**: Strict TypeScript compiler checks with zero `any` allocations.