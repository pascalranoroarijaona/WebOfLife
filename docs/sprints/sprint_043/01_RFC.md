# RFC-043: Thermodynamic State Invariant Verification for Discrete H3 Hexagonal Cells

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `validateH3CellThermodynamicState` predicate enforcing non-negative material stocks and strictly positive thermodynamic temperature ($T > 0\,\text{K}$) within `src/spatial/h3_state_tensor.ts`.

### 1.2 System Context
The Web of Life simulation models the biosphere as a discrete planetary tessellation using Uber's H3 discrete global grid system coupled to thermodynamic state monads. Prior sprints established the spatial grid topology (`h3_grid.ts`), adjacency graph connections (`h3_adjacency.ts`), trophic energy flow pathways (`trophic.ts`), and continuous state tensors across hexagonal cells. 

To prevent numerical runaway, unphysical mass creation, negative biomass reservoirs, and violations of the Third Law of Thermodynamics ($T \le 0\,\text{K}$), the spatial simulation requires a strict, formal invariant validation barrier. This RFC specifies the contract, algorithmic verification rules, error classification, and object-oriented integration for `validateH3CellThermodynamicState` in `src/spatial/h3_state_tensor.ts`.

---

## 2. Thermodynamic & Physical Invariants

The spatial state tensor assigns a multivariant state vector $\mathbf{X}_i \in \mathbb{R}^k$ to each hexagonal cell index $i \in \mathcal{H}_3$. The predicate establishes an admissibility domain $\Omega_{\text{phys}} \subset \mathbb{R}^k$ characterized by:

### 2.1 First Law: Mass & Matter Admissibility
All elemental and physical matter reservoirs (carbon pools, water stocks, nitrogen/phosphorus minerals, trophic biomass densities) are scalar quantities measuring physical mass densities. Negative mass is physically inadmissible:
$$\forall s \in \mathcal{S}_{\text{mass}}, \quad X_{i, s} \ge -\epsilon_{\text{tol}}$$
where $\epsilon_{\text{tol}} \ge 0$ is a configurable numerical precision floor (defaulting to $10^{-9}$ to accommodate floating-point rounding around zero) and $X_{i,s}$ represents stock $s$ in cell $i$. Any stock $X_{i, s} < -\epsilon_{\text{tol}}$ represents an unauthorized mass sink or non-conservative annihilation.

### 2.2 Second & Third Law: Positive Absolute Temperature
Absolute temperature $T_i$ represents the mean kinetic energy of molecular degrees of freedom and is defined via the fundamental relation:
$$\frac{1}{T_i} = \left(\frac{\partial S_i}{\partial U_i}\right)_{V_i, N_i}$$
In any physically realized macrostate, absolute temperature must remain strictly bounded above absolute zero:
$$T_i > 0\,\text{K}, \quad \text{specifically} \quad T_i \ge T_{\text{absolute\_min}} > 0$$
where $T_{\text{absolute\_min}} = 1.0 \times 10^{-3}\,\text{K}$ (or an operational ecological floor $T_{\text{eco\_min}} = 150.0\,\text{K}$ depending on validation mode, with the foundational physical predicate enforcing $T > 0\,\text{K}$). Any state exhibiting $T_i \le 0$, $\text{NaN}$, or $+\infty$ triggers an immediate thermodynamic invariant failure.

### 2.3 Solar-Forced Closed-System Invariant
Hexagonal cells interact exclusively through lateral fluxes (advection, diffusion, migration) and vertical planetary exchanges (insolation, blackbody thermal emission). No state transition may synthesize internal energy or matter ex nihilo. Validation ensures all components are finite and real:
$$\forall s \in \mathcal{S}_{\text{all}}, \quad X_{i, s} \in \mathbb{R} \setminus \{-\infty, +\infty, \text{NaN}\}$$

---

## 3. Architecture & Class Hierarchy Additions

### 3.1 Class & Contract Hierarchy

```
+-------------------------------------------------------------+
|                  SpatialStateValidation                     |
+-------------------------------------------------------------+
                              |
       +----------------------+----------------------+
       |                                             |
+---------------+                             +---------------+
| Thermodynamic |                             | Invariant     |
| StateRecord   |                             | ViolationType |
+---------------+                             +---------------+
       |                                             |
+-------------------------------------------------------------+
|                IH3CellThermodynamicState                    |
|-------------------------------------------------------------|
| + cellIndex: string                                         |
| + temperatureKelvin: number                                 |
| + atmosphericCarbon: number                                 |
| + organicCarbon: number                                     |
| + biomassStocks: Record<string, number>                     |
| + waterMassKg: number                                       |
| + enthalpyJoules: number                                    |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|               ThermodynamicValidationResult                 |
|-------------------------------------------------------------|
| + isValid: boolean                                          |
| + violations: ReadonlyArray<ThermodynamicViolation>         |
| + cellIndex: string                                         |
| + timestamp: number                                         |
+-------------------------------------------------------------+
                              ^
                              | produces
+-------------------------------------------------------------+
|            validateH3CellThermodynamicState()               |
|                      (Pure Predicate)                       |
+-------------------------------------------------------------+
```

### 3.2 Interface Contracts

```typescript
/**
 * Quantifies discrete thermodynamic violation modes.
 */
export enum ThermodynamicViolationType {
  NEGATIVE_STOCK = 'NEGATIVE_STOCK',
  NON_POSITIVE_TEMPERATURE = 'NON_POSITIVE_TEMPERATURE',
  NON_FINITE_VALUE = 'NON_FINITE_VALUE',
  CORRUPT_METADATA = 'CORRUPT_METADATA'
}

/**
 * Diagnostic payload detailing a specific invariant breach.
 */
export interface ThermodynamicViolation {
  readonly type: ThermodynamicViolationType;
  readonly field: string;
  readonly value: number;
  readonly threshold: number;
  readonly message: string;
}

/**
 * Complete verification output for an H3 cell state tensor.
 */
export interface ThermodynamicValidationResult {
  readonly isValid: boolean;
  readonly cellIndex: string;
  readonly violations: readonly ThermodynamicViolation[];
  readonly evaluatedAt: number;
}

/**
 * Configuration options for thermodynamic state validation.
 */
export interface ThermodynamicValidationOptions {
  /**
   * Allowed numerical tolerance for small negative numbers resulting
   * from floating-point arithmetic. Must be >= 0. Default: 1e-9.
   */
  readonly tolerance?: number;

  /**
   * Minimum allowable absolute temperature in Kelvin.
   * Must be > 0. Default: 1e-3 K (absolute physical limit).
   */
  readonly minTemperatureKelvin?: number;

  /**
   * When true, short-circuits on the first encountered violation.
   * Default: false (gathers full diagnostic telemetry).
   */
  readonly failFast?: boolean;
}
```

---

## 4. Algorithmic Specification

### 4.1 Pure Predicate Contract
The predicate function is defined in `src/spatial/h3_state_tensor.ts`:

```typescript
export function validateH3CellThermodynamicState(
  state: IH3CellThermodynamicState,
  options?: ThermodynamicValidationOptions
): ThermodynamicValidationResult;
```

Additionally, a high-performance boolean type-guard is provided for hot simulation loops:

```typescript
export function isH3CellThermodynamicallyValid(
  state: IH3CellThermodynamicState,
  tolerance?: number
): boolean;
```

### 4.2 Step-by-Step Validation Pipeline

1. **Finite Value Guard**:
   Verify that `temperatureKelvin`, `atmosphericCarbon`, `organicCarbon`, `waterMassKg`, `enthalpyJoules`, and all members of `biomassStocks` satisfy `Number.isFinite(v)`. Any `NaN`, `+Infinity`, or `-Infinity` produces a `NON_FINITE_VALUE` violation.

2. **Temperature Positivity Guard**:
   Check `temperatureKelvin >= minTemperatureKelvin`. If `temperatureKelvin <= 0`, a `NON_POSITIVE_TEMPERATURE` violation is emitted with maximum severity.

3. **Scalar Stock Non-Negativity**:
   Evaluate primary material stocks against numerical tolerance:
   - `atmosphericCarbon >= -tolerance`
   - `organicCarbon >= -tolerance`
   - `waterMassKg >= -tolerance`
   If any stock falls below `-tolerance`, generate a `NEGATIVE_STOCK` violation.

4. **Trophic Biomass Map Non-Negativity**:
   Iterate over key-value pairs in `biomassStocks`. Each trophic tier (e.g., autotroph, primary herbivore, predator, decomposer) must satisfy:
   $$M_{\text{trophic}, k} \ge -\epsilon_{\text{tol}}$$
   Record any negative entry as `NEGATIVE_STOCK` keyed by its trophic identifier.

5. **Aggregation & Monadic State Reporting**:
   Construct an immutable `ThermodynamicValidationResult`. If `violations.length === 0`, `isValid` is `true`.

---

## 5. Mathematical Formulation & Conservation Properties

| Quantity | Variable | Invariant Boundary Condition | Physical Rationale |
| :--- | :--- | :--- | :--- |
| Temperature | $T_i$ | $T_i \ge T_{\min} > 0\,\text{K}$ | Third Law: $T=0\,\text{K}$ is unreachable; $T < 0$ unphysical without population inversion |
| Water Stock | $W_i$ | $W_i \ge 0\,\text{kg}$ | Non-negative mass density |
| Atmospheric Carbon | $C_{\text{atm}, i}$ | $C_{\text{atm}, i} \ge 0\,\text{kg}$ | Conservation of terrestrial/atmospheric carbon pool |
| Organic Soil Carbon | $C_{\text{org}, i}$ | $C_{\text{org}, i} \ge 0\,\text{kg}$ | Organic carbon detritus floor |
| Biomass Trophic Tiers | $B_{k, i}$ | $B_{k, i} \ge 0\,\text{kg}$ | Biological population mass bounds |
| Thermal Enthalpy | $H_i$ | $H_i \in \mathbb{R},\ H_i > c_v \cdot m_i \cdot T_{\min}$ | Minimum internal energy bound proportional to thermal mass |

---

## 6. Monad Stock Transitions & Architectural Integration

### 6.1 State Monad Interception
The `SpatialStateMonad` (in `src/monads/spatial_monad.ts`) executes discrete time evolution:
$$\mathcal{M}_{t+\Delta t} = \mathcal{M}_t \gg= f_{\text{climate}} \gg= f_{\text{trophic}} \gg= f_{\text{flux}}$$
`validateH3CellThermodynamicState` acts as the monadic bind invariant contract:
- Pre-transition assertion: $\forall c \in \text{Cells}, \quad \text{validate}(c).\text{isValid} \equiv \text{true}$
- Post-transition assertion: If post-state validation fails, the monadic computation aborts to a recovery fallback (or clamping with mass-balance accounting) and flags a thermodynamic conservation alarm.

### 6.2 Clamping vs. Diagnostic Verification
The predicate `validateH3CellThermodynamicState` is strictly read-only and side-effect free. It does not silently mutate or clamp unphysical values; instead, it outputs explicit diagnostic telemetry. Remediation monads or projection stages may consume `violations` to execute controlled, conservative adjustments while logging entropy/matter accounting errors.

---

## 7. Numerical Stability & Edge Conditions

1. **Sub-Epsilon Machine Precision Fluctuation**:
   Numerical solvers using Runge-Kutta or Euler integration may yield residual stocks like $-1.4 \times 10^{-16}$. The configurable `tolerance` parameter (default $10^{-9}$) ensures that true zeros under floating-point arithmetic do not raise false-positive alarms.
2. **Empty Biomass Tiers**:
   Cells representing uninhabited regions (e.g., deep ice sheets, hyper-arid deserts) may have $B_k = 0.0$. Zero mass is explicitly valid ($0.0 \ge -\epsilon$).
3. **Extreme Low Temperatures**:
   Sub-polar winter temperatures ($T \approx 190\,\text{K}$) remain strictly positive ($190 > 10^{-3}\,\text{K}$). Only non-positive values ($T \le 0$) or non-finite values fail physical admissibility.

---

## 8. Test Plan & Acceptance Criteria

### 8.1 Automated Test Suite (`tests/sprint_043.test.ts`)
- **TC-43-01: Nominal Admissible State**: Validate an H3 cell state with realistic biomass, positive temperature ($298.15\,\text{K}$), and positive carbon/water stocks. Assert `isValid === true` and `violations.length === 0`.
- **TC-43-02: Negative Material Stock**: Inject negative `organicCarbon: -0.5`. Assert `isValid === false`, violation type `NEGATIVE_STOCK`, and field `'organicCarbon'`.
- **TC-43-03: Floating-Point Tolerance**: Inject `waterMassKg: -1e-12` with default tolerance $10^{-9}$. Assert `isValid === true`. Inject `waterMassKg: -1e-7`. Assert `isValid === false`.
- **TC-43-04: Non-Positive Temperature**:
  - Inject $T = 0\,\text{K}$. Assert failure with `NON_POSITIVE_TEMPERATURE`.
  - Inject $T = -10\,\text{K}$. Assert failure with `NON_POSITIVE_TEMPERATURE`.
- **TC-43-05: Non-Finite Values**: Inject `NaN` and `+Infinity` for stocks and temperature. Assert `NON_FINITE_VALUE` violations for each corrupted field.
- **TC-43-06: Trophic Biomass Stocks Validation**: Inject negative biomass for predator trophic tier in `biomassStocks`. Assert exact trophic key reporting.
- **TC-43-07: Fast Boolean Predicate**: Verify `isH3CellThermodynamicallyValid` returns identical boolean agreement across test matrices.
- **TC-43-08: Regression Baseline**: Execute full previous test suite (`sprint_001.test.ts` through `sprint_042.test.ts`) ensuring 100% pass rate.