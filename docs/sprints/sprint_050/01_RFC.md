# RFC-050: Vertical Interface Cross-Section Contact Area Calculator (`calculateH3BoundaryContactArea`)

- **Status:** Approved
- **Sprint:** 050
- **Author:** Chief Systems Architect
- **Component:** `src/spatial/h3_adjacency.ts`
- **Dependencies:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary

Sprint 050 introduces `calculateH3BoundaryContactArea`, a deterministic, geometrically rigorous vertical interface cross-section calculator integrated directly into `src/spatial/h3_adjacency.ts`. 

In our multi-layer planetary shell architecture (incorporating atmospheric strata, hydrospheric columns, edaphic/soil horizons, and lithospheric layers), lateral fluxes of mass (e.g., advective atmospheric transport, oceanic barotropic/baroclinic currents, lateral groundwater seepage) and heat (conductive and turbulent sensible heat transfer) are constrained by the physical cross-sectional boundary area between adjacent H3 cells. 

This RFC formalizes the mathematical derivation, object-oriented class additions, thermodynamic invariance guarantees, and interface contracts required to calculate the exact vertical cross-sectional contact area $A_{\text{contact}} \, [\text{m}^2]$ between two adjacent H3 cells across overlapping vertical strata.

---

## 2. Motivation and Problem Statement

### 2.1 The Need for Discrete Vertical Cross-Sections
Previously, spatial adjacency in `src/spatial/h3_adjacency.ts` primarily operated under 2D surface abstractions, modeling neighbor topologies via unit adjacency matrices or 1D boundary lengths $L_{\text{edge}}$. However:
1. **Stratified Fluid Dynamics:** Oceanic and atmospheric dynamics operate across discrete altitude/depth layers. Flux volumes $\dot{V} = \mathbf{u} \cdot \mathbf{A}$ require an explicit, physical area normal to the horizontal flow vector.
2. **Topographic Discontinuities:** Adjacent cells rarely share identical surface elevation or bathymetric depth. A high-altitude plateau adjacent to a low-lying valley must not allow subterranean soil water or lower atmospheric strata to undergo unphysical lateral exchange if one cell's vertical stratum is blocked by bedrock.
3. **Curvature and Metric Distortions:** The shared boundary length varies by H3 resolution ($r \in [0, 15]$) and spherical radial distance $R = R_{\text{Earth}} + z$. A uniform Euclidean planar assumption introduces systematic errors that accumulate over multi-century thermodynamic simulations.

### 2.2 Thermodynamic Consistency
The First Law of Thermodynamics demands strict conservation of mass and internal energy:
$$\sum_{j \in \mathcal{N}(i)} J_{ij}^{\text{mass}} \cdot A_{ij} = -\frac{\mathrm{d}M_i}{\mathrm{d}t}$$
For anti-symmetric fluxes $J_{ij} = -J_{ji}$, exact conservation across discrete boundaries requires geometric symmetry:
$$A_{ij} \equiv A_{ji} \quad \forall i, j$$
Failure to maintain $A_{ij} = A_{ji}$ introduces spurious mass generation or destruction, breaking the fundamental conservative invariants enforced by `SpatialMonad`.

---

## 3. Mathematical and Geometric Foundations

### 3.1 Geodesic Boundary Edge Length
Let $u$ and $v$ be two distinct, valid H3 index cells at resolution $r$. If $v \in \mathcal{N}(u)$, they share a continuous boundary edge segment $\mathcal{E}_{uv} = \partial \Omega_u \cap \partial \Omega_v$.

For an ideal regular spherical hexagon on a sphere of reference radius $R_{\text{ref}} = 6{,}371{,}000\,\text{m}$ at resolution $r$, the nominal edge length $L_{\text{nominal}}(r)$ is derived from the spherical geometry of H3:
$$L_{\text{nominal}}(r) = \sqrt{\frac{2}{\sqrt{3}} \cdot A_{\text{hex}}(r)} = \sqrt{\frac{8 \pi \cdot R_{\text{ref}}^2}{5 \cdot 7^r \cdot 3 \sqrt{3}}}$$
Where:
- $A_{\text{hex}}(r)$ is the average surface area of an H3 cell at resolution $r$.
- For exact edge evaluation, when cell boundary coordinates are supplied, the great-circle arc distance between the two shared vertices $\mathbf{x}_1, \mathbf{x}_2 \in \mathbb{S}^2$ is calculated via the Haversine or Vincenty formula:
  $$L_{\text{geodesic}}(u, v) = R_{\text{ref}} \cdot \arccos\left(\mathbf{x}_1 \cdot \mathbf{x}_2\right)$$

### 3.2 Vertical Stratum Overlap Clipping
Consider cell $u$ with vertical stratum bounds $[z_{u,\text{base}}, z_{u,\text{top}}]$ and cell $v$ with $[z_{v,\text{base}}, z_{v,\text{top}}]$, defined relative to the geoid/mean sea level (MSL) in meters.

The physical contact vertical interval $\mathcal{I}_{uv}$ is the set intersection:
$$\mathcal{I}_{uv} = [z_{u,\text{base}}, z_{u,\text{top}}] \cap [z_{v,\text{base}}, z_{v,\text{top}}]$$
The effective vertical thickness $\Delta z_{\text{overlap}}$ is therefore:
$$\Delta z_{\text{overlap}}(u, v) = \max\left(0.0, \, \min(z_{u,\text{top}}, z_{v,\text{top}}) - \max(z_{u,\text{base}}, z_{v,\text{base}})\right)$$

If $\Delta z_{\text{overlap}}(u, v) = 0$, the strata are disjoint or vertically separated (e.g., cell $u$ is perched above a vertical cliff face relative to the soil stratum of cell $v$), yielding zero lateral contact area.

```
       Cell u (Stratum)                 Cell v (Stratum)
    z_u,top -----------------
            |               |        z_v,top -----------------
            |   Overlap     |================|   Overlap     |
            |   Region      |                |   Region      |
    z_u,base-----------------        z_v,base-----------------
                                             |  (Blocked)    |
                                             -----------------
```

### 3.3 Spherical Radial Expansion Correction
The boundary length scales linearly with radial distance $R(z) = R_{\text{Earth}} + z$. For a stratum centered at average elevation:
$$\bar{z}_{\text{mid}} = \frac{\max(z_{u,\text{base}}, z_{v,\text{base}}) + \min(z_{u,\text{top}}, z_{v,\text{top}})}{2}$$
The radial scale factor $\gamma(z)$ is:
$$\gamma(\bar{z}_{\text{mid}}) = 1.0 + \frac{\bar{z}_{\text{mid}}}{R_{\text{Earth}}}$$
The scaled shared edge length is:
$$L_{\text{scaled}}(u, v, \bar{z}_{\text{mid}}) = L_{\text{geodesic}}(u, v) \cdot \gamma(\bar{z}_{\text{mid}})$$

### 3.4 The Boundary Contact Area Equation
Combining the clipped vertical overlap with the radially corrected edge length:
$$A_{\text{contact}}(u, v) = L_{\text{scaled}}(u, v, \bar{z}_{\text{mid}}) \cdot \Delta z_{\text{overlap}}(u, v)$$

When cells $u$ and $v$ are identical ($u = v$), or when $v \notin \mathcal{N}(u)$ (non-adjacent), the contact area evaluates identically to zero:
$$A_{\text{contact}}(u, v) = 0 \quad \text{if } u = v \lor v \notin \mathcal{N}(u)$$

---

## 4. Class Hierarchy and Architectural Design

To adhere to incremental, long-term object-oriented design, the contact area calculator will be integrated into the existing `H3AdjacencyManager` and exposed via functional and class-based interfaces.

```
                      +----------------------------------+
                      |         H3AdjacencyManager       |
                      +----------------------------------+
                                       |
                                       | uses
                                       v
             +----------------------------------------------------+
             |            IH3BoundaryContactCalculator            |
             +----------------------------------------------------+
             | + calculateBoundaryContactArea(...)                |
             | + getSharedBoundaryEdgeLength(...)                 |
             | + calculateVerticalOverlap(...)                    |
             +----------------------------------------------------+
                                       ^
                                       | implements
             +----------------------------------------------------+
             |            H3BoundaryContactCalculator             |
             +----------------------------------------------------+
             | - earthRadiusMeters: number                        |
             | - cache: Map<string, number>                       |
             +----------------------------------------------------+
```

### 4.1 Interface Contracts (`src/spatial/h3_types.ts` additions)

```typescript
/**
 * Geometric definition of a vertical stratum for an H3 cell.
 */
export interface IVerticalStratum {
  /** Altitude/elevation of stratum base relative to MSL (meters). */
  readonly zBaseMeters: number;
  /** Altitude/elevation of stratum top relative to MSL (meters). */
  readonly zTopMeters: number;
}

/**
 * Options for calculating H3 boundary contact area.
 */
export interface IH3BoundaryContactAreaOptions {
  /** Custom planetary radius in meters (defaults to WGS84 authalic radius: 6,371,007.2 m). */
  readonly planetaryRadiusMeters?: number;
  /** Whether to apply radial expansion scaling (1 + z / R). Default: true. */
  readonly applyRadialExpansion?: boolean;
  /** Explicit boundary length override (optional, bypasses geodesic lookup). */
  readonly boundaryLengthMeters?: number;
}

/**
 * Detailed output for vertical boundary cross-section calculation.
 */
export interface IH3BoundaryContactAreaResult {
  /** Effective vertical contact area in square meters (m^2). */
  readonly contactAreaM2: number;
  /** Shared lateral boundary length in meters (m). */
  readonly boundaryLengthMeters: number;
  /** Overlapping vertical depth/height in meters (m). */
  readonly overlapHeightMeters: number;
  /** Midpoint elevation of the overlapping interface relative to MSL (meters). */
  readonly midPointElevationMeters: number;
  /** Whether the cells are verified direct topological neighbors. */
  readonly isAdjacent: boolean;
}
```

### 4.2 Function Specification (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Calculates the exact vertical interface cross-section contact area between two adjacent H3 cells.
 *
 * @param cellIndexA - Origin H3 index string.
 * @param stratumA - Vertical stratum bounds of origin cell.
 * @param cellIndexB - Destination H3 index string.
 * @param stratumB - Vertical stratum bounds of destination cell.
 * @param options - Calculation options (planetary radius, radial scaling).
 * @returns Comprehensive cross-sectional boundary calculation result.
 */
export function calculateH3BoundaryContactArea(
  cellIndexA: string,
  stratumA: IVerticalStratum,
  cellIndexB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
): IH3BoundaryContactAreaResult;
```

---

## 5. Thermodynamic and Monad Integration

### 5.1 Conservation Invariant
In `src/monads/spatial_monad.ts`, the divergence operator for horizontal advective and diffusive fluxes across cell faces uses $A_{\text{contact}}$:

$$\Delta S_i = \Delta t \sum_{j \in \mathcal{N}(i)} \mathcal{F}_{j \to i} \cdot A_{\text{contact}}(j, i)$$

Where $\mathcal{F}_{j \to i}$ is the flux density ($\text{kg} \cdot \text{m}^{-2} \cdot \text{s}^{-1}$ or $\text{J} \cdot \text{m}^{-2} \cdot \text{s}^{-1}$).

1. **Symmetry Invariant:**
   $$\forall u, v: \quad A_{\text{contact}}(u, v) \equiv A_{\text{contact}}(v, u)$$
   Enforces $\sum_i \Delta M_i = 0$ globally without numerical drift.

2. **Positivity and Non-Trivial Bounding:**
   $$0 \le A_{\text{contact}}(u, v) < \infty$$
   If $z_{\text{top}} \le z_{\text{base}}$, $\Delta z = 0 \implies A = 0$. Inverted stratum definitions must either throw an explicit architectural error (`InvalidStratumError`) or clamp gracefully to $0.0$.

3. **Pentagon Handling:**
   H3 pentagonal cells have only 5 neighbors. If $u$ is a pentagon and $v$ is not one of its 5 adjacent cells, $A_{\text{contact}}(u, v) \equiv 0$.

---

## 6. Implementation Plan & Deliverables

1. **`src/spatial/h3_types.ts`:**
   - Add `IVerticalStratum`, `IH3BoundaryContactAreaOptions`, and `IH3BoundaryContactAreaResult`.
2. **`src/spatial/h3_adjacency.ts`:**
   - Implement `calculateH3BoundaryContactArea`.
   - Implement helper `getH3SharedEdgeLength(a: string, b: string, radius: number): number`.
   - Extend `H3AdjacencyManager` with method `getBoundaryContactArea(...)`.
3. **`tests/sprint_050.test.ts`:**
   - Verify symmetry: $A(u, v) = A(v, u)$.
   - Verify non-adjacent cells yield `contactAreaM2: 0, isAdjacent: false`.
   - Verify disjoint vertical strata yield `overlapHeightMeters: 0, contactAreaM2: 0`.
   - Verify exact geometry matches theoretical spherical edge lengths across H3 resolutions 0 through 4.
   - Verify pentagonal cell boundary conditions.
   - Verify thermodynamic conservation when integrated with `SpatialMonad`.

---

## 7. Architectural Risk Analysis

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Coordinate ordering in great-circle vertex pairing causes slight floating-point asymmetry between $A(u, v)$ and $A(v, u)$. | High (Violates 1st Law energy conservation over $10^6$ cycles). | Sort cell indices canonical lexicographically `[min(u, v), max(u, v)]` for geodesic edge lookup and use commutative arithmetic for overlap calculation. |
| Inverted vertical stratum bounds ($z_{\text{base}} > z_{\text{top}}$). | Medium (Negative cross-sectional areas). | Guard clauses with standard clamping $\max(0.0, \dots)$ and strict debug assertion checks. |
| Performance overhead on high-frequency fluid advection loops. | Medium (Slowdown in state tensor transitions). | Cache static lateral edge lengths $L_{\text{edge}}(u, v)$ in `H3AdjacencyManager`, performing dynamic computation only on vertical stratum overlap. |