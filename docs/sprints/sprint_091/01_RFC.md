# RFC-091: H3 Aperture Classification and Hexagonal Orientation Dynamics in Adjacency Graphs

## 1. Executive Summary & Sprint Objective
- **Sprint Target**: Sprint 091
- **Primary Goal**: Implement `getApertureClassForResolution(res: number): H3ApertureClass` returning `'CLASS_II'` for even resolutions and `'CLASS_III'` for odd resolutions within `src/spatial/h3_adjacency.ts`.
- **Architectural Scope**: Reinforce the spatial discrete global grid system (DGGS) within Gaia Web of Life by formally encoding the topological orientation alternations of Uber H3 Aperture-7 hierarchies. Hexagonal cell geometry rotates by $\theta \approx 19.1063^\circ$ at every successive refinement step, toggling between Class II and Class III alignments. Formally standardizing this aperture classifier ensures directional adjacency, face-normal transport vectors, and thermodynamic flux monads maintain strict geometric and physical invariants.

---

## 2. Theoretical & Mathematical Foundations

### 2.1 H3 Aperture 7 Discrete Global Grid System Geometry
The H3 grid system tiles the sphere via an icosahedron projection using an Aperture 7 hexagonal hierarchy. Because 7 is not a power of 3 or 4, the nested hexagonal tessellation does not align vertices directly with child hexagons without rotation. 

Let resolution index be $r \in \mathbb{N}_0$. The area scaling between resolutions is given by:
$$A(r) = \frac{A(0)}{7^r}$$

The relative orientation angle $\theta_r$ of the hexagonal axes relative to the icosahedral face coordinate system alternates between two discrete symmetry classes:
$$\text{ApertureClass}(r) = \begin{cases} 
\text{CLASS\_II}, & \text{if } r \equiv 0 \pmod 2 \\ 
\text{CLASS\_III}, & \text{if } r \equiv 1 \pmod 2 
\end{cases}$$

- **Class II Hexagons ($r$ even)**: Hexagonal vertices are aligned such that edges are orthogonal to the coordinate axes of the base icosahedral triangle faces (tilt angle $\theta \equiv 0 \pmod{60^\circ}$).
- **Class III Hexagons ($r$ odd)**: Hexagonal vertices are rotated by an angle $\alpha = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.1063^\circ$ relative to their parent cell axes.

### 2.2 Thermodynamic Flux Invariance Across Rotated Boundaries
Spatial mass-energy diffusion in Gaia obeys conservation laws across grid boundaries $\partial \Omega_{i,j}$:

$$\frac{dM_i}{dt} = \sum_{j \in \mathcal{N}(i)} J_{j \to i} + S_i$$

Where:
- $M_i$ represents the conserved thermodynamic stock (carbon, nitrogen, water, phosphorus) in cell $i$.
- $\mathcal{N}(i)$ is the 6-neighborhood set obtained via `H3AdjacencyGraph`.
- $J_{j \to i}$ is the directional flux vector projected onto the face normal $\mathbf{n}_{i,j}$.

Because Class II and Class III hexagons have distinct boundary normal orientations $\mathbf{n}^{(II)}_k$ and $\mathbf{n}^{(III)}_k$ ($k \in \{0, \dots, 5\}$), thermodynamic transport routing depends upon knowing the exact aperture class of resolution $r$ to prevent artificial advective drift and numerical entropy generation:
$$\mathbf{n}_k(r) = \mathbf{R}\left( (r \pmod 2) \cdot \alpha \right) \mathbf{n}_k(0)$$

By implementing `getApertureClassForResolution`, the spatial substrate guarantees that directional boundary projections, inter-cell flux tensors, and Laplacian diffusion kernels select the correct trigonometric transformation matrices.

---

## 3. Detailed Technical Specification

### 3.1 Type Definitions (`src/spatial/h3_types.ts` & `src/spatial/h3_adjacency.ts`)
We introduce the literal union type for H3 aperture classes:

```typescript
export type H3ApertureClass = 'CLASS_II' | 'CLASS_III';
```

### 3.2 Interface Contracts
```typescript
/**
 * Metadata descriptor for an H3 resolution level.
 */
export interface IH3ResolutionApertureInfo {
  readonly resolution: number;
  readonly apertureClass: H3ApertureClass;
  readonly rotationAngleDegrees: number;
  readonly isRotated: boolean;
}
```

### 3.3 Function Specification: `getApertureClassForResolution`
In `src/spatial/h3_adjacency.ts`:

```typescript
/**
 * Determines the H3 Aperture Class for a given resolution level.
 * In H3 Aperture 7 grids:
 * - Even resolutions (0, 2, 4, ...) are CLASS_II (unrotated relative to base cell axes).
 * - Odd resolutions (1, 3, 5, ...) are CLASS_III (rotated by ~19.1063°).
 *
 * @param res - The non-negative integer H3 resolution index (typically 0 through 15).
 * @returns 'CLASS_II' for even resolutions and 'CLASS_III' for odd resolutions.
 * @throws RangeError if resolution is negative or not a finite integer.
 */
export function getApertureClassForResolution(res: number): H3ApertureClass;
```

#### Invariant Assertions:
1. **Integer Validation**: Inputs must satisfy `Number.isInteger(res) && res >= 0`. If invalid, throw a descriptive `RangeError`.
2. **Deterministic Parity Mapping**:
   $$\text{res} \pmod 2 = 0 \implies \text{'CLASS\_II'}$$
   $$\text{res} \pmod 2 = 1 \implies \text{'CLASS\_III'}$$
3. **Purity**: Function must be referentially transparent and side-effect free ($O(1)$ time and memory complexity).

---

## 4. Class Hierarchy & Object-Oriented Integration

```
+-------------------------------------------------------------+
|                     SpatialAdjacencyGraph                   |
+-------------------------------------------------------------+
                              ^
                              | extends
+-------------------------------------------------------------+
|                      H3AdjacencyGraph                       |
+-------------------------------------------------------------+
| + getNeighbors(index: H3Index): H3Index[]                   |
| + getDirectedEdges(index: H3Index): H3DirectedEdge[]        |
| + getApertureClass(res: number): H3ApertureClass            |
+-------------------------------------------------------------+
                              | uses
+-------------------------------------------------------------+
|              getApertureClassForResolution()                |
+-------------------------------------------------------------+
```

### 4.1 Incremental Extension to `H3AdjacencyGraph`
In addition to the standalone pure export `getApertureClassForResolution`, class `H3AdjacencyGraph` will incorporate instance delegate methods to allow monad pipelines and graph queries to inspect the aperture class of the active spatial domain directly:

```typescript
export class H3AdjacencyGraph {
  // Existing adjacency implementations...

  /**
   * Returns the aperture class of the specified resolution.
   */
  public getResolutionApertureClass(resolution: number): H3ApertureClass {
    return getApertureClassForResolution(resolution);
  }
}
```

---

## 5. Thermodynamic and Monad Compliance

1. **First Law of Thermodynamics (Conservation of Mass & Energy)**:
   - Aperture class calculation is a pure geometric mapping. It neither creates nor consumes mass-energy stocks.
   - Spatial monad flux operators (`SpatialFluxMonad`) query this aperture class to ensure mass transport balance $\sum_{e \in \text{Edges}} J_e = 0$ is preserved across orientations without anisotropic leakage.

2. **Second Law of Thermodynamics (Entropy Non-Decrease)**:
   - Correct orientation calculation eliminates non-physical entropy decrease caused by misaligned edge flux projections. Numerical dispersion across rotated hexagonal boundaries remains strictly positive or zero ($dS_{\text{num}} \ge 0$).

---

## 6. Testing & Verification Plan

1. **Resolution Parity Suite**:
   - `res = 0` $\to$ `'CLASS_II'`
   - `res = 1` $\to$ `'CLASS_III'`
   - `res = 2` $\to$ `'CLASS_II'`
   - `res = 3` $\to$ `'CLASS_III'`
   - Full sweep up to H3 maximum operational resolution `res = 15`.
2. **Boundary & Error Conditions**:
   - Negative values (`-1`, `-4`) $\to$ Throw `RangeError`.
   - Floating point resolution (`1.5`, `2.7`) $\to$ Throw `RangeError`.
   - Non-finite (`NaN`, `Infinity`) $\to$ Throw `RangeError`.
3. **Graph Class Integration Suite**:
   - Ensure `H3AdjacencyGraph.prototype.getResolutionApertureClass` delegates seamlessly to `getApertureClassForResolution`.