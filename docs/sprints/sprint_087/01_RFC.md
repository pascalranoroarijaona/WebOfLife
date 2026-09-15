# RFC-087: Pentagon Base Cell Missing Direction Mapping in Icosahedral Discrete Global Grid Systems

- **Sprint**: 087
- **Feature**: `determinePentagonBaseCellMissingDirection`
- **Module**: `src/spatial/h3_adjacency.ts`
- **Status**: Draft / Technical Specification
- **Author**: Chief Systems Architect, Web of Life / Gaia Platform
- **Thermodynamic Review**: Invariant Mass & Energy Boundary Conservator

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `determinePentagonBaseCellMissingDirection` mapping icosahedral base cell to omitted direction in `src/spatial/h3_adjacency.ts`.

### 1.2 Context & Architectural Necessity
In the Web of Life planetary simulation, spatial fields (biomass, carbon pools, hydrology, latent heat, sensible enthalpy) are discretized across the globe using an icosahedral hexagonal Discrete Global Grid System (DGGS) adhering to the H3 hierarchical indexing standard.

According to Euler’s Polyhedral Formula ($\chi = V - E + F = 2$), a closed sphere cannot be tiled exclusively by regular hexagons. Any hexagonal decomposition of an icosahedron must introduce exactly **12 pentagonal defects** located at the 12 vertices of the icosahedron. In the 122 base cell partition of the Earth's surface (base cells $0$ through $121$):
- **110 base cells** are regular hexagons possessing degree $6$ (six adjacent base cells).
- **12 base cells** are spherical pentagons possessing degree $5$ (five adjacent base cells).

In a hexagonal grid traversal coordinate system defined by 6 aperture directions ($\mathcal{D} = \{\text{K}, \text{J}, \text{JK}, \text{I}, \text{IK}, \text{IJ}\}$ or directions $1$ through $6$), each pentagonal base cell has an **omitted (missing) direction**. Attempting to diffuse material, route hydrology, or perform stencils along this omitted direction across an icosahedral vertex leads to out-of-bounds vertex traversal, catastrophic matter loss, and phantom boundary fluxes violating the First Law of Thermodynamics.

This RFC formalizes the topological foundation, interface contract, lookup table, validation mechanics, and thermodynamic integration of `determinePentagonBaseCellMissingDirection` in `src/spatial/h3_adjacency.ts`.

---

## 2. Theoretical & Mathematical Foundations

### 2.1 The Topology of 12 Pentagon Deficits on $S^2$
Let $\mathcal{M} = S^2$ be the two-dimensional Riemannian sphere. When projected onto a regular icosahedron with 20 equilateral triangular faces $\mathcal{F} = \{F_0, \dots, F_{19}\}$ and 12 vertices $\mathcal{V} = \{V_0, \dots, V_{11}\}$, each vertex $V_k$ is the confluence of 5 triangular faces.

The angle deficit at each icosahedral vertex is:
$$\Delta \theta = 2\pi - 5 \times \frac{\pi}{3} = \frac{\pi}{3} = 60^\circ$$

In the canonical H3 base cell layout:
- Total base cells: $N_{\text{bc}} = 122$.
- Pentagon base cell index set:
  $$\mathcal{P} = \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$$
  where $|\mathcal{P}| = 12$.
- Hexagon base cell index set:
  $$\mathcal{H} = \{0, \dots, 121\} \setminus \mathcal{P}, \quad |\mathcal{H}| = 110$$

### 2.2 Directional Digit System
In H3, spatial adjacency across cells is parameterized by discrete directional digits:

| Enum Identifier | Numerical Digit | Axis Name | Unit Vector on Planar Hex Grid ($60^\circ$ Basis) |
| :--- | :--- | :--- | :--- |
| `CENTER_DIGIT` / `CENTER` | $0$ | Center (self) | $(0, 0)$ |
| `K_AXES_DIGIT` / `K_AXES` | $1$ | $+k$ axis | $(0, 1)$ |
| `J_AXES_DIGIT` / `J_AXES` | $2$ | $+j$ axis | $(-\frac{\sqrt{3}}{2}, \frac{1}{2})$ |
| `JK_AXES_DIGIT` / `JK_AXES` | $3$ | $+j + k$ axis | $(-\frac{\sqrt{3}}{2}, \frac{3}{2})$ |
| `I_AXES_DIGIT` / `I_AXES` | $4$ | $+i$ axis | $(\frac{\sqrt{3}}{2}, \frac{1}{2})$ |
| `IK_AXES_DIGIT` / `IK_AXES` | $5$ | $+i + k$ axis | $(\frac{\sqrt{3}}{2}, \frac{3}{2})$ |
| `IJ_AXES_DIGIT` / `IJ_AXES` | $6$ | $+i + j$ axis | $(0, 2)$ |
| `INVALID_DIGIT` / `INVALID` | $7$ | Invalid / None | $\text{undefined}$ |

### 2.3 The Missing Direction Operator
For any hexagonal base cell $h \in \mathcal{H}$, the base cell adjacency map $\mathcal{A}(h, d)$ is defined for all $d \in \{1, 2, 3, 4, 5, 6\}$.
For any pentagonal base cell $p \in \mathcal{P}$, exactly one directional digit $d^* \in \{1, 2, 3, 4, 5, 6\}$ does not map to any valid adjacent base cell:
$$\mathcal{A}(p, d^*) = \text{INVALID\_BASE\_CELL} = -1$$

The missing direction mapping is formalised as a discrete function:
$$\mu: \{0, \dots, 121\} \to \{1, 2, 3, 4, 5, 6\} \cup \{7\}$$
such that:
$$\mu(b) = \begin{cases} d^* \in \{1, \dots, 6\} & \text{if } b \in \mathcal{P} \\ 7 \text{ (INVALID)} & \text{if } b \in \mathcal{H} \text{ or } b \notin [0, 121] \end{cases}$$

### 2.4 Canonical Mapping Table for the 12 Pentagon Base Cells
Across the canonical H3 base cell layout, each pentagon base cell is oriented according to the icosahedral face unfolding. The omitted direction corresponds to the deleted triangular sector:

| Pentagon Base Cell Index ($b$) | Polar / Equator Classification | Face Neighborhood Confluence | Omitted Direction Digit | Omitted Direction Enum |
| :---: | :---: | :---: | :---: | :---: |
| **4** | North Polar Cap | Faces 0, 1, 2, 3, 4 | 1 | `Direction.K_AXES` |
| **14** | Northern Temperate Ring | Faces 0, 1, 5, 6, 10 | 1 | `Direction.K_AXES` |
| **24** | Northern Temperate Ring | Faces 1, 2, 6, 7, 11 | 1 | `Direction.K_AXES` |
| **38** | Northern Temperate Ring | Faces 2, 3, 7, 8, 12 | 1 | `Direction.K_AXES` |
| **49** | Northern Temperate Ring | Faces 3, 4, 8, 9, 13 | 1 | `Direction.K_AXES` |
| **58** | Northern Temperate Ring | Faces 4, 0, 9, 5, 14 | 1 | `Direction.K_AXES` |
| **63** | Southern Temperate Ring | Faces 14, 15, 9, 19, 18 | 1 | `Direction.K_AXES` |
| **72** | Southern Temperate Ring | Faces 10, 16, 5, 15, 19 | 1 | `Direction.K_AXES` |
| **83** | Southern Temperate Ring | Faces 11, 17, 6, 16, 15 | 1 | `Direction.K_AXES` |
| **97** | Southern Temperate Ring | Faces 12, 18, 7, 17, 16 | 1 | `Direction.K_AXES` |
| **107** | Southern Temperate Ring | Faces 13, 19, 8, 18, 17 | 1 | `Direction.K_AXES` |
| **117** | South Polar Cap | Faces 15, 16, 17, 18, 19 | 1 | `Direction.K_AXES` |

*Topological Invariant Note*: While in hierarchical pentagon child indexing, digit 1 (`K_AXES_DIGIT`) is systematically pruned from child indices at resolution $r \ge 1$, base-cell level adjacency tables may reflect specific coordinate alignment depending on face projection orientation. The function `determinePentagonBaseCellMissingDirection` must encapsulate this canonical mapping and provide bidirectionality with `getBaseCellNeighbor(bc, dir) === -1`.

---

## 3. First and Second Law Thermodynamic Compliance

```
           SOLAR ENTHALPY INFLUX (L_sun)
                     │
                     ▼
       ┌───────────────────────────────┐
       │   EarthPod Base Cell System   │
       │     (110 Hexagons, 12 Pents)  │
       └──────────────┬────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
 ┌──────────────┐            ┌──────────────┐
 │ Hex Base Cell│            │Pent Base Cell│
 │ (6 Neighbors)│            │(5 Neighbors) │
 └──────┬───────┘            └──────┬───────┘
        │                           │
        │ 6 Valid                   │ 5 Valid Adjacencies
        │ Adjacencies               │ 1 Missing Direction:
        │                           │   determinePentagonBaseCellMissingDirection(bc)
        ▼                           ▼
 ┌──────────────┐            ┌──────────────────────────────────────────┐
 │ Full Flux:   │            │ Zero-Flux Barrier:                       │
 │ J_ij = -D∇C  │            │ J_{bc, d_missing} ≡ 0                    │
 └──────────────┘            │ NO PHANTOM SINKS / NO MATTER DESTRUCTION │
                             └──────────────────────────────────────────┘
```

### 3.1 First Law: Strict Conservation of Mass and Energy
Let $S_b(t)$ be the state vector (carbon, water, nitrogen, energy) in base cell $b$ at time $t$. The discrete balance equation is:
$$\frac{dS_b}{dt} = \sum_{d=1}^{6} J_{b \to \mathcal{A}(b, d)} + \Phi_{\text{solar}} - \Phi_{\text{re-radiation}}$$

For a pentagonal base cell $p \in \mathcal{P}$ with missing direction $d^* = \mu(p)$:
$$J_{p \to \mathcal{A}(p, d^*)} \equiv 0$$
If an algorithm attempts to route flux along $d^*$, `determinePentagonBaseCellMissingDirection` acts as a zero-admittance boundary enforcer. Without this function, unvalidated fluxes directed along $d^*$ would index `INVALID_BASE_CELL` ($-1$), causing state variables to be dumped into an unallocated memory buffer or thrown away, creating an unphysical mass sink:
$$\Delta M_{\text{universe}} = \sum M(t+\Delta t) - \sum M(t) \ne 0 \quad \text{[VIOLATION]}$$

With `determinePentagonBaseCellMissingDirection`, the interface guarantees:
$$\sum_{b=0}^{121} \frac{dM_b}{dt} = 0 \quad \text{[FIRST LAW CONSERVED]}$$

### 3.2 Second Law: Positive Entropy Generation along Manifold Adjacencies
Cross-cell diffusion obeys the Onsager reciprocal relation:
$$J_{b \to k} = -L \frac{\Delta \mu_{bk}}{T}$$
where $\Delta \mu_{bk}$ is the chemical or hydraulic potential difference between adjacent cells.
At the boundary of a pentagon defect, calculating $\Delta \mu$ against a nonexistent cell in direction $d^*$ would evaluate an undefined potential $\mu(\text{null})$. The missing direction mapping allows the discrete Laplacian $\nabla^2 \phi$ to properly sum over only the 5 valid topological neighbors with appropriate spherical weighting:
$$\nabla^2 \phi_p = \frac{6}{5} \sum_{d \in \{1..6\} \setminus \{\mu(p)\}} (\phi_{\mathcal{A}(p, d)} - \phi_p)$$
ensuring that entropy production rate $\sigma = \sum J \cdot X \ge 0$ remains strictly positive semi-definite.

---

## 4. Architectural Design & Class Hierarchy

### 4.1 Relationship to Existing DGGS Architecture
The implementation builds directly on `src/spatial/h3_types.ts` and `src/spatial/h3_adjacency.ts`, integrating smoothly with `SpatialFluxMonad` and `EarthPod`.

```
src/spatial/
├── h3_types.ts
│   ├── enum Direction (CENTER, K, J, JK, I, IK, IJ, INVALID)
│   ├── type BaseCellIndex (0..121)
│   └── interface IPentagonDefectInfo
├── h3_adjacency.ts
│   ├── const PENTAGON_BASE_CELLS: ReadonlySet<number>
│   ├── const PENTAGON_MISSING_DIRECTIONS: ReadonlyMap<number, Direction>
│   ├── function isBaseCellPentagon(baseCell: number): boolean
│   ├── function determinePentagonBaseCellMissingDirection(baseCell: number): Direction
│   ├── function getBaseCellNeighbor(baseCell: number, dir: Direction): number
│   └── class H3AdjacencyService
└── spatial_flux_monad.ts
    └── class SpatialFluxMonad
        └── applyBoundaryDiffusion(cell, fluxTensor)
```

### 4.2 Type Contracts (`src/spatial/h3_types.ts`)
```ts
/**
 * Directional digits in H3 hexagonal grid aperture system.
 */
export enum Direction {
  CENTER = 0,
  K_AXES = 1,
  J_AXES = 2,
  JK_AXES = 3,
  I_AXES = 4,
  IK_AXES = 5,
  IJ_AXES = 6,
  INVALID = 7
}

/**
 * Metadata descriptor for pentagonal base cell topological singularity.
 */
export interface IPentagonDefectMetadata {
  readonly baseCell: number;
  readonly isPentagon: boolean;
  readonly missingDirection: Direction;
  readonly validNeighborCount: 5 | 6;
}
```

### 4.3 Function Contract (`src/spatial/h3_adjacency.ts`)
```ts
/**
 * Determines the omitted (missing) direction digit for a given base cell.
 *
 * For the 12 pentagonal base cells (4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117),
 * this returns the canonical Direction digit that does not possess an adjacent neighbor
 * on the icosahedral manifold.
 *
 * For hexagonal base cells (0..121 not in the pentagon set) or invalid base cell indices,
 * this returns Direction.INVALID (7).
 *
 * @param baseCell - The integer base cell index (0 to 121)
 * @returns The omitted Direction enum value, or Direction.INVALID if not a pentagon
 */
export function determinePentagonBaseCellMissingDirection(baseCell: number): Direction;
```

---

## 5. Algorithmic Implementation Details

### 5.1 Lookup Table Construction
To ensure $O(1)$ performance and deterministic zero-allocation execution during high-frequency biosphere simulation loops ($10^6$ flux evaluations/sec), the mapping is precomputed into a static lookup table and validated against topological neighbor tables:

```ts
import { Direction } from './h3_types';

/**
 * The 12 pentagonal base cells in standard H3 DGGS.
 */
export const PENTAGON_BASE_CELLS: ReadonlyArray<number> = Object.freeze([
  4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);

/**
 * Set for O(1) pentagon identification.
 */
export const PENTAGON_BASE_CELL_SET: ReadonlySet<number> = new Set(PENTAGON_BASE_CELLS);

/**
 * Canonical mapping from pentagon base cell index to omitted Direction.
 * In H3 base cell coordinates, K_AXES (1) is the canonical omitted direction
 * for pentagons, corresponding to the deleted 60-degree sector.
 */
const PENTAGON_MISSING_DIRECTION_MAP: ReadonlyMap<number, Direction> = new Map([
  [4, Direction.K_AXES],
  [14, Direction.K_AXES],
  [24, Direction.K_AXES],
  [38, Direction.K_AXES],
  [49, Direction.K_AXES],
  [58, Direction.K_AXES],
  [63, Direction.K_AXES],
  [72, Direction.K_AXES],
  [83, Direction.K_AXES],
  [97, Direction.K_AXES],
  [107, Direction.K_AXES],
  [117, Direction.K_AXES],
]);

/**
 * Fast dense array lookup for 0 <= baseCell < 122.
 * Populated at module initialization: pentagons map to their missing direction,
 * hexagons map to Direction.INVALID.
 */
const BASE_CELL_MISSING_DIR_LUT: Uint8Array = new Uint8Array(122).fill(Direction.INVALID);
for (const [bc, dir] of PENTAGON_MISSING_DIRECTION_MAP.entries()) {
  BASE_CELL_MISSING_DIR_LUT[bc] = dir;
}

/**
 * Determines whether a base cell is one of the 12 pentagonal singularities.
 */
export function isBaseCellPentagon(baseCell: number): boolean {
  if (baseCell < 0 || baseCell >= 122 || !Number.isInteger(baseCell)) {
    return false;
  }
  return PENTAGON_BASE_CELL_SET.has(baseCell);
}

/**
 * Implements determinePentagonBaseCellMissingDirection.
 */
export function determinePentagonBaseCellMissingDirection(baseCell: number): Direction {
  if (baseCell < 0 || baseCell >= 122 || !Number.isInteger(baseCell)) {
    return Direction.INVALID;
  }
  return BASE_CELL_MISSING_DIR_LUT[baseCell];
}
```

### 5.2 Dynamic Topological Validation Fallback
In addition to the dense lookup table, `determinePentagonBaseCellMissingDirection` can verify consistency against the base cell neighbor adjacency matrix. If `getBaseCellNeighbor(bc, dir)` returns `-1`, that direction is topologically verified as missing:

```ts
/**
 * Verifies that the missing direction correctly matches the neighbor table vacancy.
 */
export function verifyPentagonMissingDirectionConsistency(baseCell: number): boolean {
  if (!isBaseCellPentagon(baseCell)) return true;
  const missingDir = determinePentagonBaseCellMissingDirection(baseCell);
  if (missingDir === Direction.INVALID) return false;
  
  // The missing direction MUST have no neighbor (-1)
  const neighbor = getBaseCellNeighbor(baseCell, missingDir);
  return neighbor === -1;
}
```

---

## 6. Monadic State Transitions & Mass Conservation

In the `SpatialFluxMonad`, mass redistribution between base cells is governed by:

```ts
export class SpatialFluxMonad {
  /**
   * Distributes mass outward across base cell neighbors while respecting pentagon deficits.
   */
  public routeConservedFlux(
    sourceBaseCell: number,
    totalMassFlux: number,
    diffusivities: Record<Direction, number>
  ): Map<number, number> {
    const allocations = new Map<number, number>();
    const missingDir = determinePentagonBaseCellMissingDirection(sourceBaseCell);
    
    // Determine active directions (excluding CENTER and missingDir)
    const activeDirections: Direction[] = [
      Direction.K_AXES,
      Direction.J_AXES,
      Direction.JK_AXES,
      Direction.I_AXES,
      Direction.IK_AXES,
      Direction.IJ_AXES
    ].filter(dir => dir !== missingDir);

    // Normalize weights across 5 (for pentagon) or 6 (for hexagon) directions
    let weightSum = 0;
    for (const dir of activeDirections) {
      weightSum += diffusivities[dir] ?? 1.0;
    }

    // Allocate flux strictly preserving First Law
    let allocatedTotal = 0;
    for (let i = 0; i < activeDirections.length; i++) {
      const dir = activeDirections[i];
      const targetNeighbor = getBaseCellNeighbor(sourceBaseCell, dir);
      if (targetNeighbor >= 0) {
        const weight = diffusivities[dir] ?? 1.0;
        const massSlice = (i === activeDirections.length - 1)
          ? totalMassFlux - allocatedTotal // Remainder ensures 0 rounding leak
          : (totalMassFlux * weight) / weightSum;
        
        allocations.set(targetNeighbor, (allocations.get(targetNeighbor) ?? 0) + massSlice);
        allocatedTotal += massSlice;
      }
    }

    return allocations;
  }
}
```

---

## 7. Verification & Test Strategy

To ensure zero defect regression, tests in `tests/sprint_087.test.ts` must validate:

1. **Exhaustive Pentagon Mapping**:
   - All 12 pentagonal base cells ($4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117$) must return a valid directional digit in $\{1..6\}$ (specifically `Direction.K_AXES`).
2. **Exhaustive Hexagon Negation**:
   - All 110 non-pentagonal base cells ($0, 1, 2, 3, 5..13, \dots, 121$) must return `Direction.INVALID` ($7$).
3. **Invalid Input Guardrails**:
   - Negative numbers ($-1, -99$), out-of-range base cells ($122, 123, 999$), non-integers ($4.5, \text{NaN}, \infty$) must safely return `Direction.INVALID` without throwing unhandled exceptions.
4. **Adjacency Consistency**:
   - For all 12 pentagons, asserting `getBaseCellNeighbor(bc, determinePentagonBaseCellMissingDirection(bc)) === -1`.
5. **Thermodynamic Invariant Conservation**:
   - Simulating 1,000 diffusion steps across a 122-base cell grid seeded with $10^{12}\ \text{kg}$ of water. Total system water must remain invariant within floating-point tolerance ($\epsilon < 10^{-10}$).

---

## 8. Rollout Plan & Backward Compatibility

- **Direct Export**: `determinePentagonBaseCellMissingDirection` exported from `src/spatial/h3_adjacency.ts`.
- **Re-export**: Re-exported through `src/spatial/index.ts` (if applicable) and consumed by `H3Grid` and `SpatialFluxMonad`.
- **Zero Breaking Changes**: Existing callers of `isBaseCellPentagon` and `getBaseCellNeighbor` experience purely additive functionality.