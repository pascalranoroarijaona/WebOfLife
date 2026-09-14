# RFC-053: Spatial Geodesic Invariant Enforcement — `assertValidLatitudeDegrees` Boundary Check

## 1. Metadata
- **RFC ID**: RFC-053
- **Sprint**: Sprint 053
- **Title**: Strict Geodesic Boundary Invariant via `assertValidLatitudeDegrees` in H3 Adjacency Subsystem
- **Status**: Proposed
- **Author**: Chief Systems Architect
- **Target Subsystem**: `src/spatial/h3_adjacency.ts`
- **Dependencies**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`

---

## 2. Executive Summary & Problem Statement

In the planetary modeling engine of the Web of Life simulation, geodesic coordinate representations underpin all spatial partitioning, discrete hexagonal cell adjacency, and spatial monad flux distributions (e.g., insolation gradients, ocean-atmosphere advection tensors, and trophic migration vectors).

Under the spherical geodesic coordinate system $(\phi, \lambda) \in [-\frac{\pi}{2}, \frac{\pi}{2}] \times (-\pi, \pi]$ or degree equivalent $\phi \in [-90^\circ, 90^\circ]$, the latitude $\phi$ specifies the angular elevation from the equatorial plane toward the geographic poles. While longitudinal coordinates $\lambda$ admit modular topology ($\mathbb{R} / 360^\circ\mathbb{Z}$), latitudinal coordinates define a closed manifold segment with non-periodic polar boundaries:
$$\partial M_{\text{lat}} = \{-90^\circ, +90^\circ\}$$

Currently, coordinate ingestion and neighbor adjacency resolution in `src/spatial/h3_adjacency.ts` risk downstream calculation corruption if coordinates exceed physical planetary bounds $[-90^\circ, 90^\circ]$—leading to undefined behavior in trigonometric solar incidence formulations, distorted zonal wind calculations (Coriolis effect singular divergence), and unphysical mass flux across poles.

This RFC defines the formal specification, interface contract, and implementation semantics for `assertValidLatitudeDegrees(latDeg: number): void` to establish an airtight boundary check enforcing $[-90, 90]$ degrees across all spatial indexing and adjacency projections.

---

## 3. Thermodynamic and Physical Invariants

### 3.1 First Law of Thermodynamics (Energy & Mass Conservation)
Latitudinal coordinates index top-of-atmosphere solar irradiance inputs $S(\phi, t)$:
$$S(\phi, t) = S_0 \cdot \max(0, \cos \theta_z(\phi, \delta, h))$$
where $\theta_z$ is the solar zenith angle, $\delta$ is solar declination, and $h$ is the hour angle. 

If $|\phi| > 90^\circ$, trigonometric evaluations produce inverted or negative solar inputs, yielding negative energy fluxes or artificial energy creation, directly violating the First Law of Thermodynamics ($\Delta U = Q - W$). Enforcing $\phi \in [-90, 90]$ guarantees that solar insolation remains strictly bounded to non-negative energy input originating exclusively from external solar radiation.

### 3.2 Second Law of Thermodynamics & Pole Coordinate Topology
Hexagonal cell adjacency graphs mapped via H3 near the poles collapse to pentagonal cells with geodesic limits at $\pm 90^\circ$. Coordinates escaping $[-90, 90]$ disrupt directional entropy dissipation rates during diffusive matter/heat transport across adjacent grid cells. By enforcing strict coordinate boundaries, thermal equilibrium and monotonic entropy generation ($dS \ge 0$) are maintained across zonal transport boundaries.

---

## 4. Technical Specification & Formal Contract

### 4.1 Function Signature & Behavior
The boundary validation routine is situated in `src/spatial/h3_adjacency.ts`:

```typescript
/**
 * Asserts that a given latitude expressed in decimal degrees is within the valid
 * physical geodesic range [-90.0, 90.0] and is a finite numerical value.
 *
 * @param latDeg - The latitude in decimal degrees.
 * @throws {RangeError} If latDeg < -90 or latDeg > 90, or if latDeg is not finite (NaN, Infinity).
 */
export function assertValidLatitudeDegrees(latDeg: number): void;
```

### 4.2 Formal Preconditions & Postconditions
- **Precondition**: `latDeg` must be a primitive `number`.
- **Invariants**:
  1. `typeof latDeg === 'number'`
  2. `!Number.isNaN(latDeg)`
  3. `Number.isFinite(latDeg)`
  4. `latDeg >= -90 && latDeg <= 90`
- **Postcondition**: Control flow proceeds uninterrupted if and only if the invariants hold; otherwise, a descriptive `RangeError` is thrown immediately, halting corrupt tensor operations before state mutation can occur.

### 4.3 Error Semantics & Diagnostic Messaging
When validation fails, the error message must indicate the offending value and explicitly state the permissible domain $[-90, 90]$:
```typescript
if (!Number.isFinite(latDeg) || latDeg < -90 || latDeg > 90) {
  throw new RangeError(
    `Latitude out of physical geodesic range [-90, 90] degrees: received ${latDeg}`
  );
}
```

---

## 5. Object-Oriented Architecture & Incremental Design

To preserve long-term extensibility without disruptive rewrites, the validation function works both as a standalone defensive utility and as a building block for spatial coordinate value objects:

```
+-------------------------------------------------------------+
|                      Spatial Invariant                      |
+-------------------------------------------------------------+
                              |
                              v
        +--------------------------------------------+
        |   assertValidLatitudeDegrees(latDeg)       |
        +--------------------------------------------+
                              |
               +--------------+--------------+
               |                             |
               v                             v
+-----------------------------+ +-----------------------------+
|    H3AdjacencyResolver      | |    SpatialMonad Coordinate  |
| (Cell Neighbor Projections) | | (Diffusion & Solar Tensors) |
+-----------------------------+ +-----------------------------+
```

### 5.1 Monad Stock Transitions
During spatial monad state transitions $\mathcal{M}_{t} \xrightarrow{\Delta t} \mathcal{M}_{t+1}$, latitude validation is applied at the ingress of any coordinate-based lookup or neighborhood aggregation:
$$\mathcal{M}' = \mathcal{M}.\text{bind}\left(\text{state} \mapsto \text{assertValidLatitudeDegrees}(\text{state.lat}) \implies \text{computeAdjacencyFlux}(\text{state})\right)$$

This ensures that spatial tensors never ingest non-physical latitudes during iterative simulation cycles.

---

## 6. Implementation Plan & Source Modifications

1. **Modify `src/spatial/h3_adjacency.ts`**:
   - Export `assertValidLatitudeDegrees(latDeg: number): void`.
   - Integrate `assertValidLatitudeDegrees` into existing latitude ingestion points, geodesic distance computations, and adjacency vector transforms.

2. **Integration Verification**:
   - Verify that all invocations in `src/spatial/h3_grid.ts` and `src/monads/spatial_monad.ts` passing geographic degrees conform without regressions.

---

## 7. Verification & Test Plan

A comprehensive suite in `tests/sprint_053.test.ts` will validate:
1. **Valid Boundaries**:
   - $\phi = -90.0$ (South Pole): pass
   - $\phi = 90.0$ (North Pole): pass
   - $\phi = 0.0$ (Equator): pass
   - Intermediate latitudes ($\pm 45.0$, $\pm 23.44$ Tropic of Cancer/Capricorn, $\pm 66.5$ Polar Circles): pass
2. **Boundary Violations**:
   - $\phi = 90.000001$: throw `RangeError`
   - $\phi = -90.000001$: throw `RangeError`
   - $\phi = 180.0$, $\phi = -180.0$: throw `RangeError`
3. **Singular & Non-Finite Numbers**:
   - `NaN`: throw `RangeError`
   - `+Infinity`, `-Infinity`: throw `RangeError`
4. **Thermodynamic Non-Leakage**:
   - Verify spatial monad aborts state transformation prior to committing stock transitions when an invalid latitude is encountered.