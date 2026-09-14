# RFC-049: Topological Pentagon Cell Validation via H3 Index Decomposition

## 1. Executive Summary & Sprint Goal
- **Sprint Goal**: Implement `isPentagonCell` topology validator using H3 cell index decomposition in `src/spatial/h3_adjacency.ts`.
- **Primary Objective**: Provide an exact, bitwise index decomposition validator for identifying pentagonal cells across arbitrary H3 resolutions ($0 \le r \le 15$).
- **Thermodynamic Core Driver**: On an icosahedral geodesic discrete global grid (H3), exactly 12 topological singularities exist at any resolution: pentagonal cells with coordination number $k = 5$ instead of regular hexagonal cells with $k = 6$. Failure to detect pentagons causes flux operators to attempt exchange across a phantom 6th edge, inducing matter and energy divergence that violates the First Law of Thermodynamics ($\Delta U \ne Q - W$) and breaks divergence-free conservative advection.

---

## 2. Context and Architectural Drivers

### 2.1 The Topology of the H3 Discrete Global Grid
The discrete global grid system (DGGS) utilized by the Web of Life simulation projects an icosahedron onto the spherical earth pod using the Snyder equal-area polyhedral projection, partitioned recursively into aperture-7 hexagonal cells.
Euler's polyhedron formula:
$$V - E + F = 2$$
dictates that a closed spherical surface cannot be tiled entirely with regular hexagons ($k = 6$). Exactly 12 vertices of the truncated/projected icosahedron require pentagonal cells ($k = 5$).

### 2.2 Bitwise Structure of H3 Cell Indices (64-bit BigInt)
An H3 index is represented internally as a 64-bit unsigned integer (or BigInt in TypeScript). The canonical bit layout is defined as follows:

| Bit Range | Field Name | Width | Description / Values |
| :--- | :--- | :--- | :--- |
| Bit 63 | Reserved | 1 bit | Reserved (must be `0`) |
| Bits 59–62 | Mode | 4 bits | Index mode (`1` = H3 Cell) |
| Bits 56–58 | Mode-dependent | 3 bits | Reserved / Sub-mode (`0`) |
| Bits 52–55 | Resolution | 4 bits | Grid resolution $r \in [0, 15]$ |
| Bits 45–51 | Base Cell Number | 7 bits | Base cell index $b \in [0, 121]$ |
| Bits 42–44 | Res 1 Digit | 3 bits | Directional child digit $d_1 \in [0, 7]$ |
| Bits 39–41 | Res 2 Digit | 3 bits | Directional child digit $d_2 \in [0, 7]$ |
| ... | ... | 3 bits | ... |
| Bits $(45 - 3 \cdot r)$–$(47 - 3 \cdot r)$ | Res $r$ Digit | 3 bits | Directional child digit $d_r \in [0, 7]$ |
| Bits $0$–$(44 - 3 \cdot r)$ | Unused Digits | — | Must be set to all 1s (`0b111` or `7`) for unused levels |

### 2.3 Mathematical Pentagon Criterion
A cell index $h$ represents a pentagon if and only if:
1. **Mode Check**: Mode bits $(h \gg 59) \ \& \ 0\text{xF} == 1$.
2. **Pentagonal Base Cell**: The 7-bit base cell $b = (h \gg 45) \ \& \ 0\text{x7F}$ belongs to the canonical set of 12 icosahedral vertex base cells:
   $$\mathcal{B}_{\text{pent}} = \{4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107\}$$
3. **Sequence Center Invariance**: For all resolution levels $i \in \{1, 2, \dots, r\}$, the child directional digit $d_i$ must be $0$ (the center digit `H3_CENTER_DIGIT`). Any non-zero directional branch ($d_i \in \{1, 2, 3, 4, 5, 6\}$) transitions the aperture partition off the icosahedral vertex into a hexagonal sub-domain.

---

## 3. Thermodynamic Compliance (First & Second Laws)

### 3.1 First Law Conservation: Preventing Phantom Facet Fluxes
Adjacency graph operators compute mass flux $\vec{J}_m$ (water, carbon, nutrients) and energy flux $\vec{J}_q$ (sensible heat, latent enthalpy) across cell boundaries:
$$\frac{\partial S_i}{\partial t} = \sum_{j \in \mathcal{N}(i)} F_{j \to i} + \Phi_i^{\text{solar}} - \Phi_i^{\text{rad}}$$
where $\mathcal{N}(i)$ is the neighborhood of cell $i$.
- For regular hexagonal cells, $|\mathcal{N}(i)| = 6$.
- For pentagonal cells, $|\mathcal{N}(i)| = 5$.

If an adjacency engine treats a pentagon as having 6 neighbors, it allocates a zero-address or invalid neighbor slot (`0x0` or duplicate base cell), resulting in:
1. **Asymmetric Leakage**: Flux dispatched to a non-existent neighbor disappears from the source stock without landing in any destination stock, causing an unphysical net mass destruction ($\Delta M < 0$).
2. **Double Counting**: Flux calculated along a degenerated edge is accounted for twice, violating $\sum \Delta M_i = 0$.

`isPentagonCell` provides the boundary condition validator that truncates the neighbor stencil from 6 to 5 directional edges, preserving exact machine-precision mass conservation $\sum_k S_k = \text{const}$.

### 3.2 Second Law Compliance: Local Entropy Production
At pentagonal boundary facets, metric distortion (angular defect of $60^\circ$ at the icosahedral vertex) alters boundary face lengths. Explicitly detecting pentagonal cells enables the transport monad to apply the pentagonal perimeter correction factor:
$$L_{\text{edge}}^{\text{pent}} = L_{\text{edge}}^{\text{hex}} \cdot \sqrt{\frac{5}{6 \cdot \sin(\pi / 5)}}$$
ensuring that diffusion conductances $D_{ij} = \frac{k A_{ij}}{\Delta x_{ij}} \ge 0$ guarantee positive entropy production $\sigma = \sum_{ij} J_{ij} \Delta \mu_{ij} \ge 0$.

---

## 4. Class Hierarchy & Architecture Additions

### 4.1 Class Hierarchy Overview
```
+-------------------------------------------------------+
|                 IH3TopologyValidator                  |
|  + isPentagon(h3Index: string | bigint): boolean      |
|  + getBaseCell(h3Index: string | bigint): number      |
|  + getResolution(h3Index: string | bigint): number    |
|  + getCoordinationNumber(h3Index: string | bigint): 5 | 6
+-------------------------------------------------------+
                           ^
                           | implements
+-------------------------------------------------------+
|                 H3TopologyValidator                   |
|  - PENTAGON_BASE_CELL_SET: ReadonlySet<number>        |
|  + validateIndex(h3Index: bigint): void               |
|  + decompose(h3Index: bigint): H3CellDecomposition    |
+-------------------------------------------------------+
                           | composes
                           v
+-------------------------------------------------------+
|                 H3AdjacencyCoordinator                |
|  - validator: IH3TopologyValidator                    |
|  + getNeighbors(cell: string | bigint): string[]      |
|  + computeBoundaryFlux(stencil: FluxStencil): Flux    |
+-------------------------------------------------------+
```

### 4.2 Interface Contracts

#### `src/spatial/h3_types.ts`
```typescript
/**
 * Decomposed components of a 64-bit H3 cell index.
 */
export interface H3CellDecomposition {
  readonly mode: number;
  readonly reserved: number;
  readonly resolution: number;
  readonly baseCell: number;
  readonly digits: readonly number[];
  readonly isPentagon: boolean;
}

/**
 * Topology validation contract for H3 cells.
 */
export interface IH3TopologyValidator {
  isPentagon(h3Index: string | bigint): boolean;
  getBaseCell(h3Index: string | bigint): number;
  getResolution(h3Index: string | bigint): number;
  getCoordinationNumber(h3Index: string | bigint): 5 | 6;
  decompose(h3Index: string | bigint): H3CellDecomposition;
}
```

#### `src/spatial/h3_adjacency.ts`
The module `src/spatial/h3_adjacency.ts` is augmented with:
1. Constant Bitmasks and Shifts:
   - `H3_MODE_MASK = 0xFn` shifted by `59n`
   - `H3_RES_MASK = 0xFn` shifted by `52n`
   - `H3_BASE_CELL_MASK = 0x7Fn` shifted by `45n`
   - `H3_DIGIT_MASK = 0x7n`
   - `PENTAGON_BASE_CELLS = new Set([4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107])`
2. Pure utility function:
   `isPentagonCell(cell: string | bigint): boolean`
3. Class `H3TopologyValidator` implementing `IH3TopologyValidator`.
4. Integration into `H3AdjacencyCoordinator`:
   Neighbor queries check `isPentagonCell(cell)` and safely eliminate the non-traversable directional axis (directional digit `1` or `K_AXES_DIGIT` depending on rotation orientation), yielding 5 neighbors instead of 6.

---

## 5. Monad Stock Transitions & Thermodynamic Invariants

### 5.1 Spatial Monad Boundary Guard
When transitioning mass-energy packets across the spatial monad `SpatialMonad<H3GridState>`:
```typescript
class SpatialAdvectionStep {
  public execute(monad: SpatialMonad): SpatialMonad {
    for (const cell of monad.cells) {
      const isPent = H3TopologyValidator.getInstance().isPentagon(cell.id);
      const neighborLimit = isPent ? 5 : 6;
      // Stencil iteration strictly bounded to neighborLimit
      // Assert: No flux allocated to deleted 6th directional axis
    }
  }
}
```

### 5.2 System Invariants
1. **Invariant 1 (Global Pentagon Count)**:
   For any resolution $r \in [0, 15]$, the total number of pentagons in a complete sphere tiling $\Omega_r$ is strictly:
   $$N_{\text{pent}}(r) \equiv 12$$
2. **Invariant 2 (Coordination Integral)**:
   The total count of directed edges $|\mathcal{E}|$ in the adjacency graph is:
   $$|\mathcal{E}| = 6 \cdot (N_{\text{cells}}(r) - 12) + 5 \cdot 12 = 6 \cdot N_{\text{cells}}(r) - 12$$
3. **Invariant 3 (Conservative Divergence)**:
   For any closed stock flux vector $\mathbf{F}$, sum of divergence over all cells including pentagons satisfies:
   $$\sum_{i=1}^{N_{\text{cells}}} \nabla \cdot \mathbf{F}_i = 0 \pm 10^{-14} \text{ (machine epsilon)}$$

---

## 6. Implementation Specification: Bitwise Logic

```typescript
export function isPentagonCell(cell: string | bigint): boolean {
  const index = typeof cell === 'string' ? BigInt(cell.startsWith('0x') ? cell : `0x${cell}`) : cell;
  
  // 1. Verify Mode is 1 (H3 Cell)
  const mode = Number((index >> 59n) & 0xFn);
  if (mode !== 1) {
    return false;
  }
  
  // 2. Extract Resolution (bits 52-55)
  const res = Number((index >> 52n) & 0xFn);
  if (res < 0 || res > 15) {
    return false;
  }
  
  // 3. Extract Base Cell (bits 45-51)
  const baseCell = Number((index >> 45n) & 0x7Fn);
  if (!PENTAGON_BASE_CELLS.has(baseCell)) {
    return false;
  }
  
  // 4. Check that all child digits up to resolution 'res' are 0 (H3_CENTER_DIGIT)
  for (let r = 1; r <= res; r++) {
    const shift = BigInt(45 - 3 * r);
    const digit = Number((index >> shift) & 0x7n);
    if (digit !== 0) {
      return false;
    }
  }
  
  return true;
}
```

---

## 7. Verification and Testing Strategy

1. **Base Cell Resolution 0 Verification**:
   - Verify all 122 resolution-0 base cells. Exactly 12 cells (`4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107`) return `true`.
   - The remaining 110 base cells return `false`.
2. **Multi-Resolution Invariance ($r = 1, 2, 3$)**:
   - For resolution $r \in \{1, 2, 3\}$, child cell with base cell `4` and all digits `0` returns `true`.
   - For any child cell where any $d_i \in \{1, 2, 3, 4, 5, 6\}$, `isPentagonCell` returns `false`.
3. **Invalid Index Resilience**:
   - Indices with mode $\ne 1$, resolution $> 15$, or invalid hex strings must return `false` or raise domain error without crashing the simulation loop.
4. **Adjacency Integration Test**:
   - Validate that `H3AdjacencyCoordinator.getNeighbors(pentagonIndex)` returns exactly 5 distinct valid cell IDs, whereas hexagonal cells return 6 distinct valid cell IDs.
5. **Mass Conservation Flux Test**:
   - Run a 100-step diffusive advection test on an icosahedral patch containing a pentagon; verify total mass is invariant to $10^{-12}$.

---

## 8. Rollout Plan
1. Update `src/spatial/h3_types.ts` with decomposition and topology validator interfaces.
2. Implement bitwise constants and `isPentagonCell` along with `H3TopologyValidator` in `src/spatial/h3_adjacency.ts`.
3. Update `H3AdjacencyCoordinator` neighbor discovery stencils to respect pentagon coordination boundaries ($k = 5$).
4. Add comprehensive unit tests in `tests/sprint_049.test.ts`.
5. Execute regression suite across all existing thermodynamic test suites (`sprint_001` through `sprint_048`).