# RFC-054: Longitudinal Boundary Wrapping & Antimeridian Coordinate Normalization

- **Sprint:** 054
- **Author:** Chief Systems Architect, Web of Life Core Team
- **Status:** Proposed
- **Target Subsystem:** `src/spatial/h3_adjacency.ts`
- **Related Components:** `src/monads/spatial_monad.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In the discrete planetary simulation engine of *Web of Life*, global spatial indexing is governed by the Uber H3 discrete global grid system (DGGS) over an icosahedral spherical manifold $\mathcal{M} \cong S^2$. When continuous geophysical coordinate vectors $(\phi, \lambda)$—latitude and longitude—are computed during atmospheric advection, oceanic current transport, and solar zenith angle evaluation, longitudinal coordinates undergo continuous accumulation:
$$\lambda_{t+\Delta t} = \lambda_t + u_\lambda \cdot \Delta t$$
where $u_\lambda$ is the angular zonal velocity. Without strict boundary normalization, numerical drift inevitably generates coordinates $\lambda \ge 180^\circ$ or $\lambda < -180^\circ$, causing coordinate divergence, antimeridian ($180^\circ$ E/W) sampling discontinuities, and key lookup misses in spatial hash maps and tensor indices.

### 1.2 Problem Statement
The spatial adjacency subsystem `src/spatial/h3_adjacency.ts` currently lacks a standardized, high-performance, pure mathematical primitive for canonical longitude normalization into the half-open interval:
$$\lambda_{\text{canonical}} \in [-180.0, 180.0)$$
In particular, the boundary condition at the International Date Line / 180th meridian must map symmetrically and deterministically:
$$\lambda = +180.0^\circ \mapsto -180.0^\circ$$
enforcing a strictly well-ordered half-open domain that prevents double-counting of boundary cells and eliminates negative-zero (`-0.0`) floating-point ambiguities.

### 1.3 Sprint Goal
Implement and export the canonical coordinate wrapping primitive `normalizeLongitudeDegrees(lonDeg: number): number` within `src/spatial/h3_adjacency.ts`, satisfying:
1. Rigorous range enforcement: $\forall \lambda \in \mathbb{R},\; \text{normalizeLongitudeDegrees}(\lambda) \in [-180, 180)$.
2. Periodicity: $\forall k \in \mathbb{Z},\; \text{normalizeLongitudeDegrees}(\lambda + 360 \cdot k) = \text{normalizeLongitudeDegrees}(\lambda)$.
3. Exact boundary condition: $\text{normalizeLongitudeDegrees}(180.0) = -180.0$ and $\text{normalizeLongitudeDegrees}(-180.0) = -180.0$.
4. Deterministic floating-point arithmetic with negative-zero suppression (`+0` canonicalization).

---

## 2. Theoretical & Mathematical Foundations

### 2.1 The Circle $S^1$ as a Quotient Topological Group
The geographic longitude $\lambda$ parameterizes the unit circle $S^1$ embedded within the spherical coordinate chart of $S^2 \setminus \{(0, 0, \pm 1)\}$. The topological group of planar rotations is isomorphic to the quotient group:
$$\mathbb{R} / 360\mathbb{Z}$$
The canonical projection homomorphism $\pi: \mathbb{R} \to \mathbb{R} / 360\mathbb{Z}$ maps any real angular measure $\lambda$ to an equivalence class $[\lambda]_{360} = \{ \lambda + 360k \mid k \in \mathbb{Z} \}$.

To perform discrete operations on a computer architecture, we select a unique fundamental domain representative $\hat{\lambda}$ within the left-closed, right-open interval $\mathcal{D} = [-180, 180)$. The canonical projection function $f: \mathbb{R} \to \mathcal{D}$ is defined analytically by:
$$f(\lambda) = \left( (\lambda + 180) \bmod 360 \right) - 180$$
where $\bmod$ denotes the mathematical modulo operator (floored division remainder) satisfying $x \bmod y \in [0, y)$ for $y > 0$.

### 2.2 IEEE 754 Modulo Semantics vs. Mathematical Modulo
In ECMAScript / JavaScript (IEEE 754 double precision), the binary operator `%` computes the *truncated remainder* rather than the floored modulo:
$$r = a \% b = a - b \cdot \operatorname{trunc}(a / b)$$
Consequently, when $a < 0$, $a \% b \le 0$. To enforce strict floored modulo over $\mathbb{R}$ in $O(1)$ arithmetic without branches, the dual-modulus shift formulation is established:
$$\operatorname{mod}_{360}(x) = ((x \bmod 360) + 360) \bmod 360$$
Applying the 180-degree phase translation:
$$\hat{\lambda} = \left[ \left( ((\lambda + 180) \% 360) + 360 \right) \% 360 \right] - 180$$
For $\lambda = 180.0$:
$$\lambda + 180 = 360 \implies 360 \% 360 = 0 \implies (0 + 360) \% 360 = 0 \implies 0 - 180 = -180.0$$
For $\lambda = -180.0$:
$$\lambda + 180 = 0 \implies 0 \% 360 = 0 \implies (0 + 360) \% 360 = 0 \implies 0 - 180 = -180.0$$
For $\lambda = -0.0$:
$$\lambda + 180 = 180 \implies 180 \% 360 = 180 \implies 180 - 180 = 0.0$$
This guarantees that $\hat{\lambda} \in [-180, 180)$ across all non-infinite, non-NaN real inputs.

---

## 3. Thermodynamic Compliance (1st & 2nd Laws)

### 3.1 First Law: Mass & Energy Invariance Under Coordinate Transformation
Let the global state tensor $\mathbf{\Psi}$ encode total planetary mass $M_{\text{total}}$ and internal energy $U_{\text{total}}$ partitioned across discrete cells $c_i \in \mathcal{H}$:
$$M_{\text{total}} = \sum_{i=1}^{N_{\text{cells}}} \left( \rho_{\text{bio}, i} + \rho_{\text{water}, i} + \rho_{\text{soil}, i} \right) \cdot A_i$$
A continuous coordinate evaluation $(\phi, \lambda) \mapsto c_i \in \mathcal{H}$ must represent an isometry with respect to stock accounting. The coordinate wrapping operation:
$$\mathcal{W}: (\phi, \lambda) \mapsto (\phi, \text{normalizeLongitudeDegrees}(\lambda))$$
is an identity on the underlying manifold $S^2$. Therefore:
$$\frac{d}{dt} M_{\text{total}}\Big|_{\mathcal{W}} = 0, \quad \frac{d}{dt} U_{\text{total}}\Big|_{\mathcal{W}} = 0$$
No stock transition, mass evaporation, or energy annihilation can occur as a function of crossing the antimeridian.

### 3.2 Second Law: Entropy Generation & Direction of Flow
Zonal transport of matter $\vec{J}_{\text{matter}} = \rho \vec{v}$ across the antimeridian boundary must conserve entropy balance:
$$\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{surroundings}} \ge 0$$
By guaranteeing continuous indexing of neighboring cells $c_L$ ($\lambda \approx -180^\circ$) and $c_R$ ($\lambda \approx +180^\circ$), numerical truncation artifacts that could generate artificial potential gradients or spontaneous negative entropy anomalies are strictly eliminated.

---

## 4. Technical Architecture & Interface Contracts

### 4.1 Interface Specification
In `src/spatial/h3_adjacency.ts`, the new function will be exported as a pure mathematical utility alongside existing adjacency and directional operators.

```typescript
/**
 * Normalizes an arbitrary longitude in degrees into the canonical half-open interval [-180, 180).
 *
 * Enforces:
 * - Deterministic wrapping such that -180 <= result < 180.
 * - +180.0 wraps identically to -180.0.
 * - Negative zero (-0) is sanitized to canonical +0.0.
 * - Periodic invariance under translations of k * 360 degrees.
 *
 * @param lonDeg - Unbounded longitude in degrees.
 * @returns Canonical longitude in [-180, 180).
 */
export function normalizeLongitudeDegrees(lonDeg: number): number;
```

### 4.2 Integration into H3AdjacencyService / Spatial Hierarchy
The class hierarchy in `src/spatial/h3_adjacency.ts` leverages `normalizeLongitudeDegrees` in coordinate-to-cell transformations and neighborhood traversals:

```
+-------------------------------------------------------------+
|                     H3AdjacencyService                      |
+-------------------------------------------------------------+
| + getNeighbors(cell: H3Index): H3Index[]                    |
| + getDirectionalNeighbor(cell: H3Index, dir: HexDir): H3Index|
| + computeGeodesicStep(coord: LatLon, delta: Vector2): LatLon|
+-------------------------------------------------------------+
                              |
                              v uses
+-------------------------------------------------------------+
|                 normalizeLongitudeDegrees                   |
|         (Canonical [-180, 180) projection function)         |
+-------------------------------------------------------------+
```

---

## 5. Algorithmic Specification & Edge Cases

### 5.1 Canonical Algorithm
```typescript
export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return NaN;
  }
  // Standard dual-modulo wrapping into [0, 360)
  const wrapped = (((lonDeg + 180) % 360) + 360) % 360;
  // Shift back to [-180, 180)
  const normalized = wrapped - 180;
  // Sanitize negative zero to positive zero
  return normalized === 0 ? 0 : normalized;
}
```

### 5.2 Edge Cases Matrix

| Input `lonDeg` | Expected Output | Rationale |
|---|---|---|
| `0.0` | `0.0` | Prime meridian origin |
| `-0.0` | `0.0` | Floating-point zero stabilization |
| `180.0` | `-180.0` | Half-open interval boundary $[-180, 180)$ |
| `-180.0` | `-180.0` | Left boundary invariant |
| `540.0` | `-180.0` | $180 + 360 = 540 \implies -180$ |
| `-540.0` | `-180.0` | $-180 - 360 = -540 \implies -180$ |
| `181.0` | `-179.0` | Forward antimeridian wrap |
| `-181.0` | `179.0` | Backward antimeridian wrap |
| `360.0` | `0.0` | Full positive rotation |
| `-360.0` | `0.0` | Full negative rotation |
| `720.0` | `0.0` | Multi-revolution null |
| `179.999999` | `179.999999` | Inside open upper boundary |
| `-179.999999` | `-179.999999` | Inside closed lower boundary |
| `Infinity` / `-Infinity` | `NaN` | Non-finite domain protection |
| `NaN` | `NaN` | IEEE 754 propagation |

---

## 6. Monad Stock Transitions & Integration

Within `SpatialMonad` (`src/monads/spatial_monad.ts`), spatial coordinate projections feed into cell resolution lookups:

```typescript
// Integration pattern inside coordinate conversion pipeline
const canonicalLon = normalizeLongitudeDegrees(advectedLongitude);
const h3Index = latLonToCell(advectedLatitude, canonicalLon, resolution);
```

By ensuring `canonicalLon` always falls strictly within $[-180.0, 180.0)$:
1. `latLonToCell` calls from the core H3 bindings will never encounter out-of-domain coordinates.
2. Atmospheric advection across the antimeridian seamlessly transfers state monads between adjacent cells without stock loss or unmapped voids.

---

## 7. Verification & Acceptance Criteria

1. **Unit Test Coverage:** A new comprehensive test suite `tests/sprint_054.test.ts` covering:
   - Boundary tests for $[-180, 180)$ interval adherence.
   - Multi-turn angle testing ($\pm 720^\circ, \pm 1080^\circ, \pm 3600^\circ$).
   - Precision preservation for micro-arcsecond coordinates ($10^{-6}$ degrees).
   - Invariance across $k \cdot 360^\circ$ translations.
   - Negative zero suppression test (`Object.is(normalizeLongitudeDegrees(-0), -0)` must be `false`, `Object.is(normalizeLongitudeDegrees(-0), 0)` must be `true`).
2. **Thermodynamic Invariance:** Coordinate wrapping must not alter mass or energy tensors when integrated with `SpatialMonad`.
3. **Zero Regression:** All existing test suites `tests/sprint_001.test.ts` through `tests/sprint_053.test.ts` must maintain 100% pass rate.