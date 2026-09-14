# RFC-047: Spherical Geodesic Edge Scaling & `calculateH3EdgeLengthMeters` Architecture

- **Status**: Proposed
- **Author**: Chief Systems Architect
- **Sprint**: 047
- **Target Component**: `src/spatial/h3_adjacency.ts` & `src/spatial/h3_grid.ts`
- **Related Modules**: `src/monads/spatial_monad.ts`, `src/spatial/h3_types.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary & Objective

In the Web of Life planetary simulation engine, spatial state transitions (mass diffusion, trophic migration, convective heat dissipation, and oceanic/atmospheric boundary exchange) operate over discrete spatial cells managed by the Hierarchical Triangular Mesh / Hexagonal Discrete Global Grid System (H3 DGGS). 

Thermodynamic flux exchanges between adjacent hexagonal cells $i$ and $j$ strictly depend on boundary geometry—specifically the interface contact edge length $L_{\text{edge}}$ separating neighboring Voronoi/hexagonal cells. To evaluate Fickian mass flux:
$$J_{m} = -D \nabla C \approx -D \frac{C_j - C_i}{\Delta x_{ij}} \cdot (L_{\text{edge}} \cdot h)$$
and Fourier thermal dissipation:
$$J_{q} = -\kappa \nabla T \approx -\kappa \frac{T_j - T_i}{\Delta x_{ij}} \cdot (L_{\text{edge}} \cdot h)$$
the system requires an exact, numerically stable, spherical geodesic edge length scaling function.

This RFC defines the formal mathematical specification, interface contracts, and thermodynamic integration patterns for `calculateH3EdgeLengthMeters(resolution: number): number` within `src/spatial/h3_adjacency.ts`.

---

## 2. Mathematical & Physical Principles

### 2.1 Spherical Geodesic Geometry and Aperture-7 Scaling
The Uber H3 Discrete Global Grid System is constructed via an icosahedral projection with an aperture 7 hexagonal decomposition. At each successive resolution step $r \to r + 1$, the area of a cell scales down by a factor of 7:
$$A(r) = \frac{A(0)}{7^r}$$

Because cell area for a regular hexagon on a planar approximation relates to edge length $L$ by:
$$A = \frac{3\sqrt{3}}{2} L^2$$
the characteristic edge length $L(r)$ at resolution $r$ asymptotically scales with the inverse square root of 7:
$$L(r) \approx L_0 \cdot 7^{-r/2} = \frac{L_0}{(\sqrt{7})^r}$$

On a spherical geoid of mean volumetric radius $R_{\text{Earth}} = 6{,}371{,}007.1809 \text{ m}$ (or $6{,}371{,}000 \text{ m}$ per `EARTH_RADIUS_METERS`), resolution 0 nominal edge length on the truncated icosahedral spherical surface is:
$$L_0 \approx 1{,}107{,}712.59 \text{ m} \quad (\approx 1{,}107.71 \text{ km})$$

### 2.2 Discrete Resolution Table & Geodesic Scaling
While the asymptotic scaling factor $1/\sqrt{7} \approx 0.377964473$ provides smooth dimensional transitions, the projection of spherical pentagons and distortion variations across icosahedral faces yield empirical geodesic averages defined by H3 specifications:

| Resolution ($r$) | Nominal Average Edge Length ($L_r$ in meters) |
|---|---|
| 0 | $1{,}107{,}712.59$ |
| 1 | $418{,}676.01$ |
| 2 | $158{,}244.66$ |
| 3 | $59{,}810.86$ |
| 4 | $22{,}606.38$ |
| 5 | $8{,}544.41$ |
| 6 | $3{,}229.48$ |
| 7 | $1{,}220.63$ |
| 8 | $461.35$ |
| 9 | $174.38$ |
| 10 | $65.91$ |
| 11 | $24.91$ |
| 12 | $9.42$ |
| 13 | $3.56$ |
| 14 | $1.35$ |
| 15 | $0.51$ |

The function `calculateH3EdgeLengthMeters(resolution: number): number` must:
1. Provide precise lookup for defined H3 resolutions $r \in [0, 15]$.
2. Provide analytical geodesic fall-back scaling for continuous or fractional resolutions:
   $$L(r) = L_0 \cdot 7^{-r / 2}$$
3. Throw a deterministic `RangeError` for non-finite or invalid resolutions ($r < 0$ or $r > 15$ when strict discrete bounds are mandated).

---

## 3. Thermodynamic Conservation & Law Invariants

### 3.1 First Law Compliance: Conservative Inter-Cell Flux
Inter-cell flux across shared edge $e_{ij}$ between cells $i$ and $j$ must satisfy pairwise anti-symmetry:
$$J_{ij} = -J_{ji}$$
$$L_{ij} = L_{ji} = \text{calculateH3EdgeLengthMeters}(r)$$
The mass transfer rate $\Delta M_{ij} = J_{ij} \cdot \Delta t$ updates the spatial monad state tensors such that:
$$\sum_{k \in \mathcal{N}(i)} \Delta M_{ik} + \sum_{m \in \mathcal{N}(j)} \Delta M_{jm} = 0 \quad (\text{closed system})$$
Zero mass or energy is created or destroyed at the boundary edge interface.

### 3.2 Second Law Compliance: Non-Negative Entropy Production
Flux transported across the geodesic boundary length $L_{\text{edge}}$ driven by chemical potential or temperature gradients satisfies:
$$\sigma = J_{q} \cdot \nabla \left(\frac{1}{T}\right) \ge 0$$
Accurate edge sizing guarantees that the boundary conductance $K_{\text{boundary}} = \kappa \cdot \frac{L_{\text{edge}} \cdot h}{d_{ij}}$ remains strictly positive ($K_{\text{boundary}} > 0$), preventing negative thermal diffusion or synthetic negentropy anomalies.

---

## 4. Software Architecture & Class Hierarchy Additions

### 4.1 Interface Contract
In `src/spatial/h3_adjacency.ts`:
```typescript
/**
 * Calculates the mean spherical geodesic edge length in meters for a given H3 resolution.
 * 
 * Complies with the aperture 7 spherical geodesic scaling metric over WGS84/spherical Earth radius.
 * 
 * @param resolution - H3 grid resolution (integer 0 to 15)
 * @returns Average geodesic edge length in meters
 * @throws RangeError if resolution is outside [0, 15] or not an integer
 */
export function calculateH3EdgeLengthMeters(resolution: number): number;
```

### 4.2 Object-Oriented Incremental Design
`H3AdjacencyGraph` and `SpatialMonad` integrate `calculateH3EdgeLengthMeters`:
1. **`IH3EdgeMetrics` Interface**:
   ```typescript
   export interface IH3EdgeMetrics {
     readonly resolution: number;
     readonly edgeLengthMeters: number;
     readonly boundaryContactAreaMeters2: (columnDepthMeters: number) => number;
     readonly interCellDistanceMeters: number;
   }
   ```
2. **`H3AdjacencyGraph`**:
   Exposes a method `getEdgeLength(resolution?: number): number` delegating to `calculateH3EdgeLengthMeters`, memoizing results to eliminate redundant trigonometric evaluation.
3. **`SpatialMonad<T>`**:
   Uses `calculateH3EdgeLengthMeters` in diffusion kernel matrix formulations to evaluate geometric boundary cross-sections.

---

## 5. Verification & Acceptance Criteria

1. **Precision & Reference Values**:
   - `calculateH3EdgeLengthMeters(0)` returns `1107712.59` ($\pm 0.01$).
   - `calculateH3EdgeLengthMeters(7)` returns `1220.63` ($\pm 0.01$).
   - `calculateH3EdgeLengthMeters(15)` returns `0.51` ($\pm 0.01$).
2. **Validation & Edge Conditions**:
   - Throws `RangeError` for negative numbers, numbers $> 15$, `NaN`, and non-integers.
3. **Purity & Conservation**:
   - The function is purely mathematical, idempotent, and free of side-effects.
   - Preserves strict mass-energy conservation invariants when edge length is applied to gradient fluxes.
4. **Test Suite Coverage**:
   - Unit tests covering $r \in [0, 15]$, edge validation, and integration with `H3AdjacencyGraph` in `tests/sprint_047.test.ts`.