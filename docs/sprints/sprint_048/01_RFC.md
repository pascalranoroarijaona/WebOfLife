# RFC-048: Geometric Interface Contact Calculator (`calculateH3SharedBoundaryLength`) for Lateral Thermodynamic Transport

- **Status**: APPROVED
- **Author**: Chief Systems Architect
- **Target Sprint**: sprint_048
- **Domain**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Problem Statement

### 1.1 Motivation
The Web of Life planetary simulation resolves atmospheric, oceanic, geochemical, and biosphere states over a discrete global hexagonal grid (Uber H3). Lateral physical transport—including Fourier heat conduction, Fickian geochemical diffusion, baroclinic moisture flux, and ecological migration across adjacent spatial cells—depends fundamentally on the geometric cross-sectional contact interface:
$$\Phi_{i \to j} = -\sigma_{ij} \cdot L_{ij} \cdot \frac{\Psi_j - \Psi_i}{D_{ij}}$$
where:
- $\Phi_{i \to j}$ is the extensive flux (energy in Watts, mass in $\text{kg}\cdot\text{s}^{-1}$),
- $\sigma_{ij}$ is the interface transport conductivity tensor,
- $D_{ij}$ is the geodesic centroid-to-centroid distance ($\text{m}$),
- $L_{ij}$ is the **shared boundary contact length** ($\text{m}$) between cell $i$ and cell $j$.

Prior to this RFC, lateral flux approximations assumed an idealized regular hexagon edge constant computed solely from grid resolution without verifying true spherical boundary geometry or cell adjacency. This introduced non-negligible boundary distortion errors near pentagonal cell singularities, icosahedral edge folds, and higher-latitude geodetic distortions.

### 1.2 Objective
Implement `calculateH3SharedBoundaryLength(origin: H3Index, neighbor: H3Index): number` in `src/spatial/h3_adjacency.ts`. The calculation must:
1. Verify strict topological 1-ring adjacency ($k=1$) between `origin` and `neighbor`. Return `0.0` for disjoint, identical, or non-adjacent cells.
2. Extract the boundary polygonal coordinates for both H3 cells and locate the coincident geodesic vertex pair defining the shared edge interface.
3. Compute the great-circle geodesic distance along the spherical Earth geoid ($R_\oplus = 6,371,008\text{ m}$) across the shared vertex pair.
4. Support exact symmetry: $L_{ij} \equiv L_{ji} \ge 0$, maintaining strict anti-symmetry in lateral flux matrices ($\Phi_{ij} = -\Phi_{ji}$) to guarantee exact thermodynamic conservation of energy and mass.

---

## 2. Mathematical & Thermodynamic Foundations

### 2.1 Spherical Interface Geometry
Let cell $i$ and cell $j$ possess closed polygon boundary vertex sequences:
$$\mathcal{V}_i = \{v_i^{(0)}, v_i^{(1)}, \dots, v_i^{(n-1)}\}, \quad n \in \{5, 6\}$$
$$\mathcal{V}_j = \{v_j^{(0)}, v_j^{(1)}, \dots, v_j^{(m-1)}\}, \quad m \in \{5, 6\}$$

Two cells are adjacent if and only if their boundaries share exactly two distinct coincident vertices $\{p_a, p_b\}$ within coordinate tolerance $\varepsilon = 10^{-7}\text{ rad}$:
$$\mathcal{V}_{ij} = \mathcal{V}_i \cap \mathcal{V}_j = \{p_a, p_b\}$$

The shared boundary contact length $L_{ij}$ is the spherical geodesic arc length between $p_a = (\phi_a, \lambda_a)$ and $p_b = (\phi_b, \lambda_b)$:
$$\Delta \sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\phi_b - \phi_a}{2}\right) + \cos \phi_a \cos \phi_b \sin^2\left(\frac{\lambda_b - \lambda_a}{2}\right)} \right)$$
$$L_{ij} = R_\oplus \cdot \Delta \sigma$$
where $R_\oplus = 6,371,008.0\text{ m}$ (Earth mean volumetric radius from `src/thermodynamics/constants.ts`).

### 2.2 Thermodynamic Consistency (1st & 2nd Laws)
1. **First Law (Mass and Energy Conservation)**:
   Any extensive stock transfer $\Delta Q_{ij}$ over time $\Delta t$ across boundary $L_{ij}$ is strictly conservative:
   $$\Delta Q_{ij} = -\Delta Q_{ji}$$
   $$\sum_{j \in \mathcal{N}(i)} \Phi_{i \to j} + \Phi_{ext, i} = \frac{d S_i}{dt}$$
   Symmetric contact length $L_{ij} = L_{ji}$ ensures that conductance coefficients $C_{ij} = \frac{\sigma_{ij} L_{ij}}{D_{ij}}$ form a symmetric matrix ($C_{ij} = C_{ji}$), guaranteeing that discrete Laplacian operators $\mathcal{L}_{ij} = C_{ij} (\Psi_j - \Psi_i)$ conserve internal stocks identically across closed boundaries.

2. **Second Law (Entropy Non-Decrease)**:
   For heat conduction $\Phi_{Q, ij} = -C_{ij}(T_j - T_i)$, entropy production satisfies:
   $$\dot{S}_{\text{entropy}} = \frac{1}{2} \sum_{i,j} C_{ij} (T_j - T_i)\left(\frac{1}{T_i} - \frac{1}{T_j}\right) = \frac{1}{2} \sum_{i,j} C_{ij} \frac{(T_j - T_i)^2}{T_i T_j} \ge 0$$
   Because $L_{ij} \ge 0$ and $D_{ij} > 0$, $C_{ij} \ge 0$ is strictly non-negative, eliminating unphysical negative entropy states.

---

## 3. Class Hierarchy & Interface Architecture

### 3.1 Object-Oriented Extensions to `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Shared boundary interface descriptor for adjacent H3 topological cells.
 */
export interface H3SharedBoundary {
  /** First shared vertex [latitude, longitude] in degrees */
  readonly vertexA: [number, number];
  /** Second shared vertex [latitude, longitude] in degrees */
  readonly vertexB: [number, number];
  /** Geodesic edge contact length in meters (WGS84 spherical approximation) */
  readonly lengthMeters: number;
  /** Topological status of adjacency */
  readonly isAdjacent: boolean;
}

/**
 * Geometric contact calculator contract.
 */
export interface IH3BoundaryCalculator {
  calculateSharedBoundary(origin: string, neighbor: string): H3SharedBoundary;
  calculateSharedBoundaryLength(origin: string, neighbor: string): number;
}
```

### 3.2 Component Relationship Diagram

```
+-------------------------------------------------------------+
|                     src/spatial/h3_grid.ts                  |
|  - H3GridCoordinateSystem: cellToBoundary, areNeighborCells |
+-------------------------------------------------------------+
                              ^
                              | composes
+-------------------------------------------------------------+
|                  src/spatial/h3_adjacency.ts                |
|  + H3AdjacencyGraph                                         |
|  + calculateH3SharedBoundaryLength(origin, neighbor): number|
|  + getH3SharedBoundary(origin, neighbor): H3SharedBoundary  |
+-------------------------------------------------------------+
                              ^
                              | parameterized by
+-------------------------------------------------------------+
|                 src/monads/spatial_monad.ts                 |
|  - LateralAdvectionDiffusionOperator                        |
|  - Computes flux conductance: C_ij = k * L_ij / D_ij        |
+-------------------------------------------------------------+
```

---

## 4. Implementation Specification

### 4.1 Function Signature
```typescript
/**
 * Calculates the exact geodesic contact length of the shared boundary edge
 * between two adjacent H3 cells in meters.
 *
 * @param origin - H3 cell index of the origin cell.
 * @param neighbor - H3 cell index of the adjacent cell.
 * @returns Geodesic shared boundary length in meters, or 0.0 if not adjacent.
 */
export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number;
```

### 4.2 Algorithm Steps
1. **Quick Rejection Check**:
   - If `origin === neighbor`, return `0.0`.
   - If `areNeighborCells(origin, neighbor)` is false, return `0.0`.
2. **Boundary Extraction**:
   - Retrieve boundary coordinates $\mathcal{V}_1 = \text{cellToBoundary}(origin)$ and $\mathcal{V}_2 = \text{cellToBoundary}(neighbor)$.
3. **Coincident Vertex Detection**:
   - Find coordinate pairs $(p_1, p_2)$ in $\mathcal{V}_1 \times \mathcal{V}_2$ with Euclidean distance $\sqrt{(\Delta \text{lat})^2 + (\Delta \text{lon})^2} < 10^{-6}$ degrees.
   - If fewer than 2 coincident vertices are resolved (e.g. vertex-only touch), return `0.0`.
4. **Great-Circle Geodesic Calculation**:
   - Compute Haversine distance $d(p_a, p_b)$ with $R = 6,371,008.0\text{ m}$.
5. **Return**:
   - Return $d(p_a, p_b)$ in meters.

---

## 5. Verification & Testing Strategy

1. **Topological Adjacency Tests**:
   - Assert $L(origin, neighbor) > 0$ for known adjacent cells at resolutions 0, 1, 2, and 3.
   - Assert $L(origin, neighbor) == 0$ when `neighbor` is a 2-ring cell ($k \ge 2$) or across distinct hemispheres.
   - Assert $L(origin, origin) == 0$.
2. **Symmetry Invariant**:
   - Assert $|L(A, B) - L(B, A)| < 10^{-6}\text{ m}$ for all 1-ring neighbors.
3. **Pentagonal Edge Compatibility**:
   - Test resolution-1 pentagonal cells (12 global pentagons) against their 5 neighboring hexagons to verify exact shared edge lengths.
4. **Thermodynamic Conductance Test**:
   - Parameterize `SpatialMonad` lateral diffusion with $L_{ij}$, executing a closed-system temperature equilibrium test to guarantee $\sum_i \Delta E_i = 0$ within machine precision ($\pm 10^{-12}\text{ J}$).

---

## 6. Rollback & Forward Compatibility

- **Rollback Strategy**: Revert `src/spatial/h3_adjacency.ts` to git revision prior to Sprint 048. Existing constant-edge approximations will remain as fallback defaults if the geometric method encounters invalid H3 strings.
- **Forward Compatibility**: Prepares the grid layer for Sprint 049 anisotropic Navier-Stokes lateral momentum diffusion and ocean boundary surface current interactions.