# RFC-056: Coordinate Boundary Assertion Helper (`assertValidCoordinatePair`) in Spatial Adjacency Architecture

- **Status**: Proposed
- **Author**: Chief Systems Architect
- **Sprint**: 056
- **Date**: 2025-02-17
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Related Components**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/h3_state_tensor.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `assertValidCoordinatePair` coordinate boundary assertion helper in `src/spatial/h3_adjacency.ts` to enforce rigorous spatial boundary checking, numerical sanity, and geodesic domain compliance for spherical coordinate pairs $(\phi, \lambda)$ across the H3 spatial adjacency subsystems.

### 1.2 Motivation
In planetary biogeochemical simulation and decentralized trophic-energy models, spatial discretization partitions the continuous Earth surface into discrete spatial cells (Uber H3 hexagonal grid). Fluxes of mass, moisture, nutrients, and radiant energy must never traverse non-physical coordinate space. Floating-point numerical drift, unprojected planar vectors, and boundary wrapping failures (e.g., pole singularities at $|\phi| > 90^\circ$ and antimeridian divergences $|\lambda| > 180^\circ$) risk silent thermodynamic leakage, `NaN` contagion in stock tensors, and spatial unlinking.

The introduction of `assertValidCoordinatePair` establishes an invariant gatekeeper within `src/spatial/h3_adjacency.ts`, validating latitude and longitude pairs against strict geodesic and IEEE 754 bounds prior to adjacency queries, distance metrics, directional neighbor lookups, and spatial monad transitions.

---

## 2. Thermodynamic & Geodesic Invariants

### 2.1 First Law Compliance (Conservation of Matter & Energy)
Every spatial cell $c \in \mathcal{H}_3$ holds conserved biogeochemical scalar stocks (carbon $M_C$, nitrogen $M_N$, phosphorus $M_P$, water $M_{\text{H}_2\text{O}}$) and thermal energy $U$.
$$\sum_{c \in \mathcal{H}_3} \frac{d M_c}{dt} = 0 \quad (\text{closed system mass})$$
$$\sum_{c \in \mathcal{H}_3} \frac{d U_c}{dt} = \dot{Q}_{\text{solar, in}} - \dot{Q}_{\text{blackbody, out}}$$
If an invalid coordinate pair $(\phi_{\text{inv}}, \lambda_{\text{inv}})$ is accepted into adjacency computations, the topological graph generates disjoint edges or sink nodes, causing flux terms $J_{ij}$ to evacuate the conserved envelope into undefined address spaces. Validating coordinates at the interface layer ensures the topological graph remains a closed Riemannian manifold with zero divergent boundary leaks.

### 2.2 Second Law Compliance (Entropy & Dissipation)
Atmospheric and oceanic advection between adjacent hexagonal cells represents irreversible hydrodynamic dispersion:
$$\Delta S_{\text{advection}} = \sum_{\langle i, j \rangle} J_{ij} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0$$
Invalid coordinate metrics result in non-positive distances ($d \le 0$) or infinite gradients, creating fictitious negative entropy sources. Strict coordinate validation preserves metric positivity and strict monotonicity of entropy production along spatial thermal gradients.

---

## 3. Mathematical & Domain Specifications

### 3.1 Geodesic Bounds (WGS84 / Spherical Coordinates)
A coordinate pair is represented as either explicit numeric arguments `(lat: number, lon: number)` or as a structured object implementing `ICoordinatePair` `{ lat: number, lon: number }` (or `{ latitude: number, longitude: number }`).

The valid coordinate domain $\mathcal{D}_{\text{geo}}$ is defined on the spherical surface $S^2$:
$$\mathcal{D}_{\text{geo}} = \left\{ (\phi, \lambda) \in \mathbb{R}^2 \;\middle|\; -90.0 \le \phi \le 90.0 \;\land\; -180.0 \le \lambda \le 180.0 \right\}$$
Where:
- $\phi$ (Latitude): $[-90^\circ, +90^\circ]$ inclusive (South Pole to North Pole).
- $\lambda$ (Longitude): $[-180^\circ, +180^\circ]$ inclusive (International Date Line / Antimeridian).

### 3.2 IEEE 754 Numerical Sanity
In addition to domain limits, coordinates must satisfy:
$$\text{isFinite}(\phi) \land \neg\text{isNaN}(\phi) \land \text{isFinite}(\lambda) \land \neg\text{isNaN}(\lambda)$$
Subnormal numbers, `+Infinity`, `-Infinity`, and `NaN` are strictly rejected.

---

## 4. Architectural & Class Hierarchy Design

```
src/
├── spatial/
│   ├── h3_types.ts             <-- Extended with ICoordinatePair, CoordinateValidationOptions
│   ├── h3_adjacency.ts         <-- Addition: CoordinateBoundaryError, assertValidCoordinatePair
│   ├── h3_grid.ts              <-- Consumes assertValidCoordinatePair for point-to-cell mapping
│   └── h3_state_tensor.ts      <-- Consumes validated coordinates for spatial tensor indexing
└── monads/
    └── spatial_monad.ts        <-- Uses assertions to guard monadic state transitions
```

### 4.1 Error Hierarchy
```typescript
/**
 * Specialized error class thrown when geographical coordinates violate domain constraints.
 */
export class CoordinateBoundaryError extends RangeError {
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly violationContext?: string;

  constructor(message: string, lat: number, lon: number, context?: string) {
    super(`[CoordinateBoundaryError] ${message} (lat: ${lat}, lon: ${lon})${context ? ` in ${context}` : ""}`);
    this.name = "CoordinateBoundaryError";
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
    Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
  }
}
```

### 4.2 Core Validation Function Signature & Overloads
```typescript
export interface CoordinateValidationOptions {
  /** Optional contextual tag for debugging stack traces (e.g., 'H3AdjacencyService.findNearestNeighbor') */
  context?: string;
  /** Whether to allow 360-degree wrapped longitude [0, 360]; defaults to false (strict [-180, 180]) */
  allowNormalizedPositiveLon?: boolean;
  /** Custom tolerance epsilon for floating point boundary clamping (default: 1e-9) */
  epsilon?: number;
}

/**
 * Asserts that latitude and longitude represent a mathematically and geographically
 * valid position on the Earth ellipsoid/sphere.
 *
 * @throws {CoordinateBoundaryError} If latitude or longitude is NaN, infinite, or out of bounds.
 */
export function assertValidCoordinatePair(
  lat: number,
  lon: number,
  options?: CoordinateValidationOptions | string
): asserts lat is number;

export function assertValidCoordinatePair(
  coords: { lat: number; lon: number } | { latitude: number; longitude: number },
  options?: CoordinateValidationOptions | string
): void;
```

---

## 5. Implementation Specifications for `src/spatial/h3_adjacency.ts`

### 5.1 Validation Logic Flow
1. **Argument Parsing**: Normalize input signature:
   - Handle dual-scalar invocation: `assertValidCoordinatePair(lat, lon, contextOrOptions)`
   - Handle composite object invocation: `assertValidCoordinatePair({ lat, lon }, contextOrOptions)`
2. **Type & Non-Null Checks**:
   - Verify `lat` and `lon` are of type `number`.
   - Reject `null`, `undefined`, or non-numeric types immediately.
3. **Finite & Non-NaN Checks**:
   - Evaluate `Number.isFinite(lat)` and `Number.isFinite(lon)`.
   - If either fails, throw `CoordinateBoundaryError` specifying non-finite input.
4. **Latitude Bounds Check**:
   - Check if `lat < -90 - epsilon || lat > 90 + epsilon`.
   - If out of bounds, throw `CoordinateBoundaryError` with detail: `"Latitude must be within [-90, +90] degrees"`.
5. **Longitude Bounds Check**:
   - If `allowNormalizedPositiveLon` is `true`:
     - Validate $\lambda \in [-180 - \epsilon, 360 + \epsilon]$.
   - Else (default strict WGS84):
     - Check if `lon < -180 - epsilon || lon > 180 + epsilon`.
     - If out of bounds, throw `CoordinateBoundaryError` with detail: `"Longitude must be within [-180, +180] degrees"`.
6. **Pass Condition**: Return void (TypeScript assertion signature affirms validity).

### 5.2 Helper Query Function
In addition to the assertion helper `assertValidCoordinatePair`, implement the non-throwing boolean predicate `isValidCoordinatePair` for conditional branches:
```typescript
export function isValidCoordinatePair(
  lat: number,
  lon: number,
  options?: CoordinateValidationOptions
): boolean;
```

---

## 6. Integration Points with Existing Spatial Monad & Adjacency

### 6.1 `H3AdjacencyService` Integration
`H3AdjacencyService` methods that transform spherical coordinates into directional vectors, azimuths, or cell distances must guard their entry points:
- `getGreatCircleDistance(lat1, lon1, lat2, lon2)`: Guards both pairs with `assertValidCoordinatePair`.
- `latLonToBearing(fromLat, fromLon, toLat, toLon)`: Guards origin and destination.
- `findKNearestNeighbors(centerLat, centerLon, k)`: Guards search origin.

### 6.2 `SpatialMonad` Transition Safety
When constructing or updating a spatial state tensor from geographic centroids:
```typescript
public updateCentroid(lat: number, lon: number): SpatialMonad<T> {
  assertValidCoordinatePair(lat, lon, "SpatialMonad.updateCentroid");
  return new SpatialMonad(this.cellId, { lat, lon }, this.tensor);
}
```

---

## 7. Test Plan (`tests/sprint_056.test.ts`)

1. **Nominal Tests**:
   - Equator / Prime Meridian `(0, 0)`.
   - Cardinal extremes: `(90, 0)`, `(-90, 0)`, `(0, 180)`, `(0, -180)`.
   - Typical geographic points: Paris `(48.8566, 2.3522)`, Sydney `(-33.8688, 151.2093)`.
   - Composite object formats: `{ lat: 10, lon: 20 }` and `{ latitude: 10, longitude: 20 }`.
2. **Boundary & Epsilon Tests**:
   - Clamping tolerance: `90.0000000001` with `epsilon = 1e-9` passes.
   - Strict violations: `90.01` and `-90.01` throw `CoordinateBoundaryError`.
   - Longitude wrapping: `180.001` throws; `350` passes when `allowNormalizedPositiveLon: true`.
3. **Invalid Type & Singularity Tests**:
   - `NaN` for latitude and longitude.
   - `+Infinity` and `-Infinity`.
   - `null`, `undefined`, non-numeric cast simulations.
4. **Context Reporting**:
   - Confirm contextual message is included in error string when specified.
5. **Thermodynamic Guard Simulation**:
   - Confirm that adjacency calculations reject corrupted coordinates before evaluating flux tensors.

---

## 8. Backward Compatibility & Rollout

- **Non-breaking addition**: Pure additive export in `src/spatial/h3_adjacency.ts`.
- **Zero performance overhead** on valid simulations (single branch comparisons $O(1)$).
- Prepares spatial adjacency pipeline for high-resolution planetary tessellations in future sprints.