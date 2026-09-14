# RFC 055: Angular Normalization Wrapper (`normalizeAngleRadians`) in H3 Spherical Adjacency

- **Sprint:** 055
- **Author:** Chief Systems Architect, Web of Life Project
- **Status:** Proposed
- **Target Subsystem:** `src/spatial/h3_adjacency.ts`
- **Dependencies:** `src/thermodynamics/constants.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In the discrete global grid system (DGGS) powering the Web of Life simulation, geodesic adjacency operations on the spherical icosahedral surface—governed by Uber H3 discrete hexagonal indexing—require directional azimuth calculation, vector field advection, wind/ocean surface transport, and angular decomposition between adjacent centroids.

Planar approximations fail at planetary scales. When computing geodesic bearings, relative neighbor offsets, Coriolis deflections, and horizontal advection velocity vectors $\mathbf{u} = (u_\lambda, u_\phi)$ across hexagon facets, angle calculations (e.g., via $\text{atan2}(\Delta y, \Delta x)$ or spherical trigonometry) undergo branch cuts and cyclic discontinuities. Repeated rotational updates, advective drift accumulations, and angular deviations frequently yield values outside the principal fundamental domain, leading to numerical divergence, asymmetric neighborhood fluxes, and non-deterministic branch selection in hydrodynamic transport routines.

### 1.2 Objective
This RFC specifies the formal architectural design and mathematical formulation of `normalizeAngleRadians(radians: number): number` within `src/spatial/h3_adjacency.ts`. The utility maps any real angular value $\theta \in \mathbb{R}$ bijectively onto the canonical half-open interval $[-\pi, \pi)$, ensuring exact topological continuity, numerical stability across geodesic branch cuts, and thermodynamic flux consistency across hexagonal boundary interfaces.

---

## 2. Mathematical Specification

### 2.1 The Circle Group and Quotient Topology
The circle group $\mathbb{T}$ is isomorphic to the quotient Lie group $\mathbb{R} / 2\pi\mathbb{Z}$. Angular coordinates on the sphere are defined modulo $2\pi$. For computational consistency across directional vectors, adjacency azimuths, and trigonometric operations, every angle $\theta \in \mathbb{R}$ must have a canonical representative $\hat{\theta}$ in the half-open fundamental domain:

$$\hat{\theta} \in [-\pi, \pi)$$

The mapping $\psi: \mathbb{R} \to [-\pi, \pi)$ is uniquely characterized by:

$$\psi(\theta) = \theta - 2\pi \left\lfloor \frac{\theta + \pi}{2\pi} \right\rfloor$$

where $\lfloor \cdot \rfloor$ denotes the floor function ($\mathbb{R} \to \mathbb{Z}$).

### 2.2 Algebraic Properties
1. **Idempotence:** $\forall \theta \in [-\pi, \pi),\; \psi(\psi(\theta)) = \psi(\theta)$.
2. **Periodicity:** $\forall k \in \mathbb{Z},\; \psi(\theta + 2\pi k) = \psi(\theta)$.
3. **Boundary Invariance:**
   - As $\theta \to \pi^-$, $\psi(\theta) \to \pi$.
   - At $\theta = \pi$, $\psi(\pi) = \pi - 2\pi \lfloor 2\pi / 2\pi \rfloor = \pi - 2\pi(1) = -\pi$.
   - At $\theta = -\pi$, $\psi(-\pi) = -\pi - 2\pi \lfloor 0 / 2\pi \rfloor = -\pi$.
   - Thus, the branch cut aligns strictly at $+\pi \mapsto -\pi$, preserving the interval $[-\pi, \pi)$.
4. **Odd-Symmetry Modulo Boundaries:** For $\theta \in (-\pi, \pi)$, $\psi(-\theta) = -\psi(\theta)$.

### 2.3 Numerical Formulation for IEEE 754 Floating Point
Direct floating-point evaluation of $\lfloor (\theta + \pi) / 2\pi \rfloor$ can be subject to catastrophic cancellation near $\theta \approx \pi (2k - 1)$. In ECMAScript/TypeScript, the remainder operator `%` computes the truncated remainder rather than the Euclidean modulo. The canonical, branchless, or robust modulo implementation is formulated as:

```typescript
const TWO_PI = 2 * Math.PI;

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) {
    return radians; // Propagate NaN and +/-Infinity consistently with IEEE 754
  }
  // Shift domain to [0, 2pi), apply modulo, and shift back to [-pi, pi)
  let angle = (radians + Math.PI) % TWO_PI;
  if (angle < 0) {
    angle += TWO_PI;
  }
  return angle - Math.PI;
}
```

*Edge-case invariant:* If `angle - Math.PI === Math.PI` due to roundoff at the upper boundary, it snaps to `-Math.PI`, maintaining strict inclusion in $[-\pi, \pi)$.

---

## 3. Thermodynamic and Physical Constraints

The Web of Life simulation operates under uncompromising thermodynamic laws:

### 3.1 First Law Compliance (Conservation of Energy and Momentum)
Advective kinetic energy $E_k = \frac{1}{2} m \|\mathbf{v}\|^2$ and directional momentum flux $\mathbf{p} = m\mathbf{v}$ transported across hexagonal cell boundaries depend directly on bearing angles $\alpha_{ij}$ between adjacent cells $H_i$ and $H_j$. 
- Angular transformations must never alter vector magnitudes $\|\mathbf{v}\|$.
- Directional decomposition $\mathbf{v} = (\|\mathbf{v}\|\cos\theta, \|\mathbf{v}\|\sin\theta)$ remains invariant under $\theta \mapsto \psi(\theta)$ because $\cos(\psi(\theta)) = \cos(\theta)$ and $\sin(\psi(\theta)) = \sin(\theta)$ within machine precision $\epsilon_{\text{mach}} \approx 2.22 \times 10^{-16}$.
- No synthetic momentum or energy is introduced or destroyed through cyclic coordinate transformations.

### 3.2 Second Law Compliance (Entropy and Dissipation)
- Phase-angle wrapping is an isentropic coordinate projection ($dS_{\text{phase}} = 0$).
- Preventing angular drift eliminates numerical artificial diffusion caused by out-of-range arguments to trigonometric functions in atmospheric advection steps.

---

## 4. Class Hierarchy & Architectural Integration

### 4.1 Structural Repository Mapping
The function `normalizeAngleRadians` will be declared and exported from `src/spatial/h3_adjacency.ts`, serving as the foundational angular utility for spatial indexing, directional routing, and neighborhood topology.

```
src/
├── spatial/
│   ├── h3_adjacency.ts          <-- [TARGET: normalizeAngleRadians added & exported]
│   ├── h3_grid.ts               <-- Consumes angular normalization for neighbor bearings
│   ├── h3_state_tensor.ts       <-- Consumes for velocity vector tensor projections
│   └── h3_types.ts              <-- Provides directional and coordinate interfaces
├── monads/
│   └── spatial_monad.ts         <-- Wraps spatial flux transformations
└── thermodynamics/
    └── constants.ts             <-- Core physical constants
```

### 4.2 Object-Oriented Class Hierarchy Design

```
+-------------------------------------------------------------+
|                     <<interface>>                           |
|                  IAngularVector2D                           |
+-------------------------------------------------------------+
| + magnitude: number                                         |
| + angleRadians: number                                      |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|                 HexagonalAdvectiveBearing                   |
+-------------------------------------------------------------+
| - _originCell: H3Index                                      |
| - _targetCell: H3Index                                      |
| - _bearingRadians: number                                   |
+-------------------------------------------------------------+
| + constructor(origin: H3Index, target: H3Index, rad: number)|
| + get bearing(): number                                     |
| + normalize(): HexagonalAdvectiveBearing                    |
| + toCartesianComponents(): { u: number; v: number }         |
+-------------------------------------------------------------+
```

### 4.3 Interface Contracts

```typescript
/**
 * Normalizes an angle in radians to the canonical half-open interval [-π, π).
 *
 * Boundary rules:
 * - -π maps to -π
 * - +π maps to -π (due to half-open interval [-π, π))
 * - 0 maps to 0
 * - Values outside [-π, π) are wrapped periodically by 2π
 * - Non-finite numbers (NaN, Infinity, -Infinity) return unchanged
 *
 * @param radians The input angle in radians.
 * @returns The canonical normalized angle in radians within [-Math.PI, Math.PI).
 */
export function normalizeAngleRadians(radians: number): number;
```

---

## 5. Monad Stock Transitions & Interface Contracts

### 5.1 Spatial Monad Bearing Transition
When state tensors are mapped across spatial cells via `SpatialMonad`, directional advection updates satisfy:

$$\mathcal{M}\big(\mathbf{S}(H_i)\big) \xrightarrow{\text{advect}(\theta_{ij})} \mathcal{M}\big(\mathbf{S}(H_j)\big)$$

where $\theta_{ij} = \text{normalizeAngleRadians}(\text{bearing}(H_i, H_j))$.

1. **Pre-condition:**
   - Adjacency bearing $\theta_{\text{raw}} \in \mathbb{R}$.
   - Source hexagonal index $H_i \in \text{valid H3 cells}$.
2. **Transition Function:**
   - $\theta_{\text{norm}} = \text{normalizeAngleRadians}(\theta_{\text{raw}})$.
   - $\theta_{\text{norm}} \ge -\pi \land \theta_{\text{norm}} < \pi$.
3. **Post-condition:**
   - Advection tensor decomposition preserves mass and kinetic energy totals:
     $$\sum_{k \in \text{neighbors}(H_i)} \text{flux}_k(m) = 0$$

---

## 6. Verification and Test Plan

A dedicated test suite within `tests/sprint_055.test.ts` must validate the following exhaustive test matrix:

| Case ID | Input Value | Expected Output | Precision Requirement | Description |
|---|---|---|---|---|
| `TC-ANG-001` | `0.0` | `0.0` | Exact (`0`) | Zero identity |
| `TC-ANG-002` | `Math.PI / 2` | `Math.PI / 2` | $\epsilon < 10^{-15}$ | Quarter circle positive |
| `TC-ANG-003` | `-Math.PI / 2` | `-Math.PI / 2` | $\epsilon < 10^{-15}$ | Quarter circle negative |
| `TC-ANG-004` | `Math.PI` | `-Math.PI` | Exact (`-Math.PI`) | Upper boundary wrap to lower |
| `TC-ANG-005` | `-Math.PI` | `-Math.PI` | Exact (`-Math.PI`) | Lower boundary identity |
| `TC-ANG-006` | `2 * Math.PI` | `0.0` | $\epsilon < 10^{-15}$ | Full circle wrap |
| `TC-ANG-007` | `-2 * Math.PI` | `0.0` | $\epsilon < 10^{-15}$ | Negative full circle wrap |
| `TC-ANG-008` | `3 * Math.PI` | `-Math.PI` | Exact (`-Math.PI`) | Multi-turn boundary wrap |
| `TC-ANG-009` | `3.5 * Math.PI` | `-0.5 * Math.PI` | $\epsilon < 10^{-15}$ | Large positive angle |
| `TC-ANG-010` | `-5.25 * Math.PI` | `0.75 * Math.PI` | $\epsilon < 10^{-15}$ | Large negative angle |
| `TC-ANG-011` | `100 * Math.PI` | `0.0` | $\epsilon < 10^{-14}$ | Extreme positive multiple |
| `TC-ANG-012` | `-99 * Math.PI` | `-Math.PI` | $\epsilon < 10^{-14}$ | Extreme negative odd multiple |
| `TC-ANG-013` | `NaN` | `NaN` | `Number.isNaN` | IEEE 754 NaN safety |
| `TC-ANG-014` | `Infinity` | `Infinity` | Exact | Positive infinity safety |
| `TC-ANG-015` | `-Infinity` | `-Infinity` | Exact | Negative infinity safety |

---

## 7. Migration and Compatibility

- **Backward Compatibility:** Fully backward-compatible. This adds an exported utility function to `src/spatial/h3_adjacency.ts`. Existing callers of `h3_adjacency.ts` remain unaffected.
- **Forward Adoption:** Subsequent sprints will update directional hexagonal wind vectoring (`H3Grid.computeFlowAdvection`) and Coriolis calculations to route all raw bearings through `normalizeAngleRadians`.

---

## 8. Architectural Sign-Off

The proposed architecture respects modular composition, adheres to strict mathematical definitions of quotient circle topologies, preserves First and Second Law thermodynamic constraints, and guarantees numerical determinism across the Web of Life simulation.