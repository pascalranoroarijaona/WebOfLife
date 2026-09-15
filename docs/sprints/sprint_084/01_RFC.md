# RFC-084: H3 Direction Bitmask Specification and Directional Flux Channel Topology

- **Sprint:** 084
- **Author:** Chief Systems Architect
- **Status:** Proposed
- **Target Files:** `src/spatial/h3_types.ts`, `tests/sprint_084.test.ts`
- **Related Systems:** `src/spatial/h3_adjacency.ts`, `src/spatial/spatial_flux_monad.ts`, `src/spatial/h3_state_tensor.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Define the `H3DirectionBitmask` constant map and `DirectionBitmask` type in `src/spatial/h3_types.ts` to establish an exact, zero-allocation bitwise primitive for directional adjacency, boundary barrier modeling, and conservative advection-diffusion routing across the discrete global hexagonal grid (H3 DGGS).

### 1.2 Motivation
Hexagonal Discrete Global Grid Systems (DGGS) partition planetary manifolds into cells where each interior hexagon possesses exactly six topological neighbors. In high-frequency planetary simulations (atmospheric circulation, oceanic currents, trophic nutrient transport, and hydrological runoff), routing conserved fluxes across adjacent cells requires evaluating topological connectivity along the hexagonal edge vectors. 

Previous sprint implementations identified directional neighbor channels using either numerical arrays or dynamic object lookups. While mathematically functional, dynamic lookups incur heap allocation, pointer dereferencing, and branch mispredictions when applied at scale across millions of cells. By introducing `DirectionBitmask` and `H3DirectionBitmask`, directional channel topology is encoded as a set of orthogonal bit flags ($2^0$ through $2^5$). This enables single-cycle bitwise operations (`&`, `|`, `^`, `~`) to:
1. Verify neighborhood channel open/closed status (e.g., topographic mountain barriers, continental shelf boundaries).
2. Filter directional flux components in `SpatialFluxMonad` without object allocations.
3. Guarantee strict First-Law mass/energy conservation by ensuring flux transfers only proceed over bidirectionally verified topological channels.

---

## 2. Mathematical & Thermodynamic Foundations

### 2.1 Hexagonal Neighborhood Topology
Let $\mathcal{H}$ denote the set of H3 hexagonal cells on the spherical manifold. For any interior cell $c \in \mathcal{H}$, the 1-ring neighborhood $\mathcal{N}(c)$ consists of six adjacent cells:
$$\mathcal{N}(c) = \{ c_d \mid d \in \{0, 1, 2, 3, 4, 5\} \}$$
where $d$ represents the discrete directional index corresponding to canonical H3 coordinate axes radiating from the cell center to its six edges at angular increments of $\frac{\pi}{3}$ radians ($60^\circ$).

### 2.2 Directional Bitmask Vector Space
To represent any subset of active directional channels $\mathcal{D} \subseteq \{0, 1, 2, 3, 4, 5\}$, we map discrete directions $d$ into an orthogonal 6-bit binary basis:
$$\beta(d) = 1 \ll d = 2^d \quad \text{for } d \in \{0, 1, 2, 3, 4, 5\}$$

The composite bitmask $\mathcal{B}(\mathcal{D})$ for any directional channel configuration is defined as:
$$\mathcal{B}(\mathcal{D}) = \sum_{d \in \mathcal{D}} \beta(d) = \bigvee_{d \in \mathcal{D}} 2^d \in [0, 63] \subset \mathbb{N}_0$$

| Direction ($d$) | Semantic Edge / Relative Orientation | Bit Position ($1 \ll d$) | Hexadecimal Value | Binary Value |
|:---------------:|:------------------------------------:|:------------------------:|:-----------------:|:------------:|
| $0$             | Direction 0 (E / Axis 0)             | $2^0 = 1$                | `0x01`            | `00000001`   |
| $1$             | Direction 1 (NE / Axis 1)            | $2^1 = 2$                | `0x02`            | `00000010`   |
| $2$             | Direction 2 (NW / Axis 2)            | $2^2 = 4$                | `0x04`            | `00000100`   |
| $3$             | Direction 3 (W / Axis 3)             | $2^3 = 8$                | `0x08`            | `00001000`   |
| $4$             | Direction 4 (SW / Axis 4)            | $2^4 = 16$               | `0x10`            | `00010000`   |
| $5$             | Direction 5 (SE / Axis 5)            | $2^5 = 32$               | `0x20`            | `00100000`   |

Key aggregate constants:
- **`NONE`**: $0$ (`0x00`) — Completely isolated cell (zero open flux channels).
- **`ALL`**: $1 + 2 + 4 + 8 + 16 + 32 = 63$ (`0x3F`) — Fully connected interior hexagon (all six channels open).

### 2.3 Thermodynamic Flux Conservation over Masked Channels
In accordance with the First Law of Thermodynamics:
$$\Delta U_{\text{cell}} = \delta Q_{\text{solar}} - \delta W_{\text{dissipated}} + \sum_{d=0}^{5} \Phi_d \cdot \chi_d$$
where $\Phi_d$ is the thermodynamic stock flux (matter, enthalpy, or biomass) across edge $d$, and $\chi_d \in \{0, 1\}$ is the characteristic indicator of channel permeability derived directly from the bitmask:
$$\chi_d = \frac{\mathcal{B}_{\text{active}} \ \& \ \beta(d)}{\beta(d)} = (\mathcal{B}_{\text{active}} \gg d) \ \& \ 1$$

If $\chi_d = 0$, edge $d$ is an adiabatic/impermeable boundary. Flux $\Phi_d \equiv 0$. The anti-symmetry condition across the shared interface between cells $c_i$ and $c_j$ requires:
$$\Phi_{i \to j} = -\Phi_{j \to i}$$
$$\chi_{d(i \to j)} = \chi_{d(j \to i)} = 1$$
If either cell's bitmask blocks direction $d$, mutual flux is strictly zero, preventing spurious matter destruction or enthalpy creation.

---

## 3. Detailed Technical Specification

### 3.1 Location in Source Code
All additions will be integrated directly into `src/spatial/h3_types.ts`, which serves as the single source of truth for spatial DGGS domain primitives.

### 3.2 Type Declarations

```typescript
/**
 * Nominal or literal type representing valid H3 directional bitmask values.
 * Ranges from 0 (no open directions / isolated boundary) to 63 (all 6 hexagonal directions open).
 */
export type DirectionBitmask = number;

/**
 * Valid discrete directional indices for H3 hexagonal adjacency [0..5].
 * Corresponds to standard 6-neighbor ring orientations.
 */
export type H3DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5;
```

### 3.3 Constant Mapping (`H3DirectionBitmask`)
The `H3DirectionBitmask` constant is exported as a deeply frozen object defining directional flags, composite masks, and reverse lookup / utility bit arithmetic functions:

```typescript
/**
 * Canonical directional bitmask constants for H3 hexagonal topology.
 * Each direction is mapped to an orthogonal bit (1 << d) in a 6-bit integer space.
 */
export const H3DirectionBitmask = {
  /** Direction 0: Bit 0 (0x01) */
  DIRECTION_0: 1 << 0, // 1
  /** Direction 1: Bit 1 (0x02) */
  DIRECTION_1: 1 << 1, // 2
  /** Direction 2: Bit 2 (0x04) */
  DIRECTION_2: 1 << 2, // 4
  /** Direction 3: Bit 3 (0x08) */
  DIRECTION_3: 1 << 3, // 8
  /** Direction 4: Bit 4 (0x10) */
  DIRECTION_4: 1 << 4, // 16
  /** Direction 5: Bit 5 (0x20) */
  DIRECTION_5: 1 << 5, // 32

  /** Null mask: No directions enabled (0x00) */
  NONE: 0,
  /** Full mask: All 6 directions enabled (0x3F = 63) */
  ALL: (1 << 6) - 1, // 63

  /**
   * Directional array mapping discrete index [0..5] to DirectionBitmask.
   */
  BY_INDEX: [
    1 << 0,
    1 << 1,
    1 << 2,
    1 << 3,
    1 << 4,
    1 << 5,
  ] as const,

  /**
   * Returns true if the given direction index is active in the bitmask.
   */
  hasDirection(mask: DirectionBitmask, direction: H3DirectionIndex): boolean {
    return (mask & (1 << direction)) !== 0;
  },

  /**
   * Sets the specified direction bit in the mask.
   */
  setDirection(mask: DirectionBitmask, direction: H3DirectionIndex): DirectionBitmask {
    return mask | (1 << direction);
  },

  /**
   * Clears the specified direction bit in the mask.
   */
  clearDirection(mask: DirectionBitmask, direction: H3DirectionIndex): DirectionBitmask {
    return mask & ~(1 << direction);
  },

  /**
   * Inverts direction across hexagonal symmetry (opposite edge: (d + 3) % 6).
   */
  oppositeDirection(direction: H3DirectionIndex): H3DirectionIndex {
    return ((direction + 3) % 6) as H3DirectionIndex;
  },

  /**
   * Computes the reciprocal bitmask for opposite edges.
   */
  invertMask(mask: DirectionBitmask): DirectionBitmask {
    let inverted = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        inverted |= (1 << ((d + 3) % 6));
      }
    }
    return inverted;
  }
} as const;
```

---

## 4. Class Hierarchy & Architectural Integration

### 4.1 Relationship to Existing Spatial Monads
1. **`src/spatial/h3_types.ts` (Foundational layer):**
   - Declares `DirectionBitmask`, `H3DirectionIndex`, and exports `H3DirectionBitmask`.
   - Leaves existing types (`H3Index`, `H3Resolution`, `HexCoordinate`) intact and fully backward-compatible.

2. **`src/spatial/h3_adjacency.ts` (Topological traversal):**
   - `H3AdjacencyGraph` can store `cellMasks: Map<H3Index, DirectionBitmask>` to represent topological barriers and coastlines without mutating neighbor index tables.

3. **`src/spatial/spatial_flux_monad.ts` (Conserved transport monad):**
   - In `SpatialFluxMonad.advect()` and `diffuse()`, fluxes along direction $d$ are gated by:
     ```typescript
     if (!H3DirectionBitmask.hasDirection(sourceMask, d)) continue;
     ```
   - This eliminates vector allocations in inner simulation loops while guaranteeing zero flux across boundary edges.

### 4.2 Class Hierarchy Diagram

```
+-------------------------------------------------------------+
|                 src/spatial/h3_types.ts                     |
|  + type DirectionBitmask = number                           |
|  + type H3DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5            |
|  + const H3DirectionBitmask: Readonly<...>                  |
+-------------------------------------------------------------+
                              ^
                              | imports & utilizes
        +---------------------+---------------------+
        |                                           |
+------------------------------+     +-------------------------------+
|  src/spatial/h3_adjacency.ts |     | src/spatial/                  |
|  - stores cell boundary      |     |   spatial_flux_monad.ts       |
|    connectivity bitmasks     |     | - filters edge transfers with |
|  - checks reciprocal edges   |     |   bitwise & operations        |
+------------------------------+     +-------------------------------+
```

---

## 5. Thermodynamic Compliance & Invariants

1. **First Law (Mass & Energy Conservation):**
   - Direction bitmasks govern topological edges. If cell $A$ has bit $d$ closed, no flux $\Phi_{A \to B}$ can exit $A$.
   - Reciprocal integrity: If channel $(A, B)$ is open, $B$ must have `oppositeDirection(d)` open. Otherwise, flux is rejected before state tensor integration.
   - Matter stock transitions $\Delta M$ sum strictly to zero over any closed internal step: $\sum_{c \in \mathcal{H}} \Delta M_c = 0$.

2. **Second Law (Entropy Non-Decrease):**
   - Dissipation due to flow resistance along edge channels is calculated strictly as positive definite entropy generation:
     $$\dot{S}_{\text{irr}} = \sum_{\text{edges}} \frac{\Phi_d^2}{\kappa_d T_d} \ge 0$$
   - Closed channels ($\chi_d = 0$) contribute zero flux and zero spurious entropy sink.

---

## 6. Verification and Testing Plan

### 6.1 Test Suite Location
`tests/sprint_084.test.ts`

### 6.2 Test Matrix
1. **Bitwise Disjointness & Completeness:**
   - Verify each of the 6 directions `DIRECTION_0` through `DIRECTION_5` is distinct and equal to $1 \ll d$.
   - Verify `H3DirectionBitmask.ALL === 63` and `H3DirectionBitmask.NONE === 0`.
   - Verify sum/bitwise OR of all 6 directions equals `H3DirectionBitmask.ALL`.

2. **Index Lookup Array:**
   - Verify `BY_INDEX[i] === (1 << i)` for all $i \in [0..5]$.

3. **Bitwise Mutation and Query Helpers:**
   - `hasDirection(mask, dir)` returns expected booleans for single and multi-bit combinations.
   - `setDirection(mask, dir)` idempotently sets bits.
   - `clearDirection(mask, dir)` idempotently unsets bits.

4. **Symmetry & Reciprocity:**
   - Verify `oppositeDirection(d)` satisfies `oppositeDirection(oppositeDirection(d)) === d`.
   - Verify `invertMask(mask)` produces correct opposite bit patterns (e.g. `DIRECTION_0` (1) maps to `DIRECTION_3` (8)).

5. **Type Integrity:**
   - Compile-time type check ensuring `DirectionBitmask` accepts integer values and integrates cleanly with spatial monad interfaces.

---

## 7. Migration and Backward Compatibility

- **Non-Breaking Extension:** No existing interfaces, function signatures, or classes in `h3_types.ts` are deprecated or removed.
- **Runtime Performance:** Zero allocations; operations run on unboxed JavaScript 32-bit integers via V8 bitwise optimization.
- **Rollout Step:** Sprint 084 implements the types and constants in `src/spatial/h3_types.ts` and establishes baseline test coverage. Subsequent sprints will wire these bitmasks into `H3Adjacency` and `SpatialFluxMonad`.