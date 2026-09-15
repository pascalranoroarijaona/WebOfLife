# RFC-073: Spherical Angular Tolerance Validation for Shared Boundary Endpoints

## 1. Executive Summary

Sprint 073 introduces strict spherical topology verification in `src/spatial/h3_adjacency.ts` via `assertBoundaryEndpointTolerance`. Discrete Global Grid Systems (DGGS) such as H3 represent cell boundaries as spherical polygons. When two adjacent H3 cells share a directed edge or common boundary vertices, slight floating-point numerical variances and spherical projection distortions can cause discrepancies between endpoint representations across adjacent cell instances. 

Without an invariant assertion mechanism, boundary endpoint mismatches lead to geometric manifold tearing, indeterminate edge-flux lengths, and potential mass/energy leakage along shared boundaries—violating the First Law of Thermodynamics. This RFC specifies the mathematical formulation, class additions, interface contracts, and integration points for validating that shared boundary endpoints lie within a rigorous spherical angular tolerance (in radians), ensuring conservation of spatial stocks across cell interfaces.

---

## 2. Problem Statement & Thermodynamic Motivation

### 2.1 Geometric Inconsistencies at Cell Interfaces
In spherical coordinate representations $(\phi, \lambda)$ (latitude, longitude in radians), adjacent cells $C_i$ and $C_j$ share a topological boundary arc $E_{ij}$. When extracted independently from cell polygon registries:
- $C_i$ yields shared edge endpoints $(P_{i,1}, P_{i,2})$.
- $C_j$ yields shared edge endpoints $(P_{j,2}, P_{j,1})$ (oriented conversely).

Due to floating-point truncation, icosahedral face unfolding, and coordinate transformations, $P_{i,1} \neq P_{j,1}$ at machine precision. If unchecked, the angular divergence $\theta = \angle(P_{i,1}, P_{j,1})$ can accumulate, causing:
1. Spatial boundary porosity where fluid or chemical flux escapes the discretized manifold.
2. Inaccurate boundary segment lengths $L_{ij} = R \cdot \Delta\sigma$, corrupting diffusion rate coefficients $D_{ij} = K \cdot \frac{A_{ij}}{d_{ij}}$.
3. Breach of the First Law of Thermodynamics: Matter conservation ($\sum \Delta M = 0$) relies upon exact pairwise equivalence of interface flux channels $J_{i \to j} = -J_{j \to i}$.

### 2.2 Angular Tolerance Formulation
Let two endpoints on the unit sphere be represented in spherical radians:
$$P_1 = (\phi_1, \lambda_1), \quad P_2 = (\phi_2, \lambda_2)$$
where $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ is latitude and $\lambda \in [-\pi, \pi]$ is longitude.

The central angular distance $\Delta\sigma$ between $P_1$ and $P_2$ is computed via the Vincenty/Haversine formula:
$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$\Delta\sigma = 2 \arcsin\left(\min(1.0, \sqrt{a})\right)$$

Alternatively, using unit Cartesian 3-vectors $\mathbf{u}_1, \mathbf{u}_2 \in \mathbb{R}^3$:
$$\mathbf{u} = \begin{bmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{bmatrix}, \quad \Delta\sigma = \arccos\left(\text{clamp}(\mathbf{u}_1 \cdot \mathbf{u}_2, -1.0, 1.0)\right)$$

The assertion contract dictates:
$$\Delta\sigma \le \epsilon_{\text{angular}}$$
where $\epsilon_{\text{angular}}$ is the maximum allowable spherical angular tolerance (defaulting to $1.0 \times 10^{-6}\text{ rad} \approx 6.37\text{ meters}$ at Earth radius, with configurable micro-tolerances down to $1.0 \times 10^{-9}\text{ rad}$).

---

## 3. Architecture & Class Hierarchy Additions

### 3.1 Error Handling & Domain Exceptions
We introduce an explicit domain error within `src/spatial/h3_types.ts` or `src/spatial/h3_adjacency.ts`:
- `BoundaryEndpointToleranceExceededError`: Subclasses standard `Error` and provides structured diagnostic metadata including endpoint coordinates, calculated central angle $\Delta\sigma$, and allowable threshold $\epsilon$.

```typescript
export class BoundaryEndpointToleranceExceededError extends Error {
  public readonly endpointA: [number, number];
  public readonly endpointB: [number, number];
  public readonly angularDistanceRad: number;
  public readonly toleranceRad: number;

  constructor(
    endpointA: [number, number],
    endpointB: [number, number],
    angularDistanceRad: number,
    toleranceRad: number,
    context?: string
  ) {
    super(
      `Boundary endpoint angular tolerance exceeded${context ? ` in ${context}` : ""}: ` +
      `angular distance ${angularDistanceRad.toExponential(4)} rad exceeds tolerance ${toleranceRad.toExponential(4)} rad ` +
      `between [${endpointA.join(", ")}] and [${endpointB.join(", ")}].`
    );
    this.name = "BoundaryEndpointToleranceExceededError";
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.angularDistanceRad = angularDistanceRad;
    this.toleranceRad = toleranceRad;
  }
}
```

### 3.2 Assertion Contract
In `src/spatial/h3_adjacency.ts`, export:
```typescript
/**
 * Asserts that two spherical boundary endpoints coincide within a specified angular tolerance.
 *
 * @param endpointA Lat/Lng or Spherical coordinate tuple [latRad, lngRad] or [latDeg, lngDeg]
 * @param endpointB Lat/Lng or Spherical coordinate tuple [latRad, lngRad] or [latDeg, lngDeg]
 * @param maxAngularToleranceRad Maximum allowed great-circle angular distance in radians
 * @param options Configuration options specifying coordinate units and debugging context
 * @throws {BoundaryEndpointToleranceExceededError} If central angle exceeds maxAngularToleranceRad
 */
export function assertBoundaryEndpointTolerance(
  endpointA: [number, number],
  endpointB: [number, number],
  maxAngularToleranceRad?: number,
  options?: {
    useDegrees?: boolean;
    context?: string;
  }
): void;
```

### 3.3 Helper & Calculation Primitives
- `computeSphericalAngularDistance(p1: [number, number], p2: [number, number], inDegrees?: boolean): number`
  Calculates the great-circle central angle $\Delta\sigma$ in radians with high numerical stability against antipodal and identical points.

---

## 4. Integration with Adjacency & Spatial Monads

### 4.1 Boundary Arc Extraction Pipeline
When constructing or validating shared edges between neighboring cells $C_u$ and $C_v$ in `H3AdjacencyGraph`:
1. Shared boundary extraction determines the shared vertex pair $(V_{start}, V_{end})$.
2. `assertBoundaryEndpointTolerance` validates:
   - $\angle(V_{start, u}, V_{end, v}) \le \epsilon$
   - $\angle(V_{end, u}, V_{start, v}) \le \epsilon$
3. Upon validation success, edge metric caching (boundary length $L_{uv}$, normal unit vector $\hat{\mathbf{n}}_{uv}$) proceeds.
4. Upon failure, execution halts deterministically before any mass/flux monad registers an unclosed geometric conduit.

### 4.2 Monadic Stock Transition Invariants
`SpatialFluxMonad` guarantees:
$$\frac{d}{dt} \sum_{k \in \text{Cells}} S_k(t) = \dot{S}_{\text{solar}} - \dot{S}_{\text{radiant}}$$
Unvalidated boundary edges introduce geometric leakage $\delta S_{\text{leak}} = \oint_{\partial \Omega_{\text{gap}}} \mathbf{J} \cdot d\mathbf{l} \neq 0$. By enforcing `assertBoundaryEndpointTolerance`, $\partial \Omega_{\text{gap}} = \emptyset$, maintaining strict thermodynamic closure.

---

## 5. Verification & Test Plan

1. **Exact Match Test**: Endpoints with identical coordinates produce zero angular distance and pass without assertion.
2. **Acceptable Sub-Tolerance Test**: Jittered coordinates with angular displacement $\Delta\sigma = 0.5 \epsilon$ pass without assertion.
3. **Tolerance Breach Test**: Coordinates with angular displacement $\Delta\sigma = 1.01 \epsilon$ throw `BoundaryEndpointToleranceExceededError` containing correct diagnostic values.
4. **Degree vs. Radian Normalization**: Validate that setting `useDegrees: true` properly converts inputs before computing angular distance.
5. **Poles and Meridian Wrap-Around**: Validate endpoints near $\lambda = \pm \pi$ and $\phi = \pm \frac{\pi}{2}$ correctly account for periodic wrapping without false breach detections.
6. **Zero Tolerance Boundary**: Test strict edge cases with default and custom $\epsilon$ values.

---

## 6. Implementation Checklist

- [ ] Add `BoundaryEndpointToleranceExceededError` class in `src/spatial/h3_adjacency.ts` (or import from `h3_types.ts`).
- [ ] Implement `computeSphericalAngularDistance` utility function with numerical stability clamps.
- [ ] Implement and export `assertBoundaryEndpointTolerance` in `src/spatial/h3_adjacency.ts`.
- [ ] Wire assertion into boundary segment construction and shared edge verification routines.
- [ ] Add comprehensive unit tests in `tests/sprint_073.test.ts`.