# RFC-064: 3D Vector Target Orientation via Displacement Dot-Product Parity

## 1. Executive Summary & Goal
In discrete global grid systems (DGGS) operating on spherical manifolds (such as H3 hexagonal tessellations), spatial advection, cross-boundary flux transport, and geodesic field alignments frequently compute tangent and face-normal vectors whose sign orientation may be arbitrary depending on vertex winding order or coordinate-chart parameterization. When transporting physical quantities (matter, enthalpy, trophic biomass, dissolved carbon, or kinetic energy) between adjacent spatial cells $C_i$ and $C_j$, the orientation of the flow direction vector must strictly align with the net displacement vector pointing from the source node to the target node.

This RFC specifies the technical architecture for implementing `orientVectorTowardsTarget3D` in `src/spatial/h3_adjacency.ts`. The routine evaluates the directional coherence between an input 3D vector $\mathbf{v}$ and a target displacement vector $\mathbf{d} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{origin}}$ (or direct displacement vector $\mathbf{d}$), flipping the sign of $\mathbf{v}$ if their Euclidean inner product is negative ($\mathbf{v} \cdot \mathbf{d} < 0$). This guarantees invariant, thermodynamically coherent directional flux across discrete geodesic cell boundaries.

---

## 2. Motivation & Domain Context
In the Web of Life engine, horizontal transport across H3 spatial monads (`SpatialMonad`, `H3GridManager`, and `H3AdjacencyGraph`) models real-world physical and ecological flows:
- **Atmospheric & Oceanic Advection:** Transport of sensible heat and carbon dioxide via wind and oceanic surface currents.
- **Trophic Migration:** Spatial displacement of biological stocks (`Biomass`, `Detritus`) guided by resource gradients.
- **Geodesic Flow Correction:** Hexagonal faces and edge boundaries projected into 3D Cartesian coordinates ($\mathbb{R}^3$) require unambiguous directional consistency. If a directional basis or normal vector $\mathbf{n}$ possesses a negative projection onto the vector connecting cell centers $\mathbf{d}_{ij} = \mathbf{x}_j - \mathbf{x}_i$, failing to flip $\mathbf{n}$ leads to inverted flux divergence calculations, violating local mass balance and entropy dissipation principles.

---

## 3. Mathematical Formalism

### 3.1 Inner Product & Directional Parity
Let $\mathbf{v} \in \mathbb{R}^3$ denote an arbitrary 3D vector (e.g., an advection vector, boundary normal, or gradient vector):
$$\mathbf{v} = \begin{bmatrix} v_x \\ v_y \\ v_z \end{bmatrix}$$

Let $\mathbf{d} \in \mathbb{R}^3$ denote the displacement vector directed toward the target point:
$$\mathbf{d} = \begin{bmatrix} d_x \\ d_y \\ d_z \end{bmatrix} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{origin}}$$

The standard Euclidean dot product $\langle \mathbf{v}, \mathbf{d} \rangle$ is defined as:
$$\langle \mathbf{v}, \mathbf{d} \rangle = \mathbf{v} \cdot \mathbf{d} = v_x d_x + v_y d_y + v_z d_z$$

The oriented vector $\mathbf{v}^*$ is determined by the parity projection operator:
$$\mathbf{v}^* = \mathcal{O}(\mathbf{v}, \mathbf{d}) = \begin{cases}
-\mathbf{v} = \begin{bmatrix} -v_x \\ -v_y \\ -v_z \end{bmatrix}, & \text{if } \langle \mathbf{v}, \mathbf{d} \rangle < 0 \\
\mathbf{v} = \begin{bmatrix} v_x \\ v_y \\ v_z \end{bmatrix}, & \text{if } \langle \mathbf{v}, \mathbf{d} \rangle \ge 0
\end{cases}$$

### 3.2 Degenerate & Edge Case Constraints
1. **Collinear Opposing Vectors ($\mathbf{v} \cdot \mathbf{d} = -\|\mathbf{v}\| \|\mathbf{d}\|$):** Perfect negative alignment triggers a complete sign inversion, restoring positive forward alignment.
2. **Orthogonal Vectors ($\mathbf{v} \cdot \mathbf{d} = 0$):** Retains initial orientation without sign inversion, ensuring non-divergence along zero-gradient tangential manifolds.
3. **Zero Displacement ($\|\mathbf{d}\| = 0$) or Zero Vector ($\|\mathbf{v}\| = 0$):** Returns the vector unchanged (or zero vector), preventing NaN propagation or division-by-zero artifacts.
4. **Tolerance Threshold $\epsilon$:** Floating-point comparison uses exact sign or a small numerical epsilon ($\epsilon = 10^{-12}$) to prevent oscillation near orthogonality.

---

## 4. Architectural Specification & Interface Contracts

### 4.1 Type Definitions
Existing coordinate and vector types in `src/spatial/h3_types.ts` will be utilized:
```typescript
export type Vector3D = [number, number, number] | { x: number; y: number; z: number };
```
To maintain maximum performance and zero garbage collection overhead in hot simulation loops, `orientVectorTowardsTarget3D` will support both 3-tuple vectors (`[x, y, z]`) and object vectors (`{ x, y, z }`), returning the matching format or a standard immutable tuple `[number, number, number]`.

### 4.2 Functional Contract in `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Orients a 3D vector towards a target direction defined by a displacement vector.
 * If the inner product between the input vector and the displacement vector is negative
 * (dot product < 0), the vector is inverted (sign-flipped); otherwise, it is preserved.
 *
 * @param vector - The candidate 3D vector [x, y, z] to orient.
 * @param displacement - The 3D displacement vector [dx, dy, dz] pointing towards the target.
 * @returns An oriented 3D vector [x', y', z'] guaranteed to satisfy dot(v', d) >= 0.
 */
export function orientVectorTowardsTarget3D(
  vector: [number, number, number],
  displacement: [number, number, number]
): [number, number, number];

/**
 * Overloaded variant accepting origin and target 3D coordinates directly.
 */
export function orientVectorTowardsTarget3D(
  vector: [number, number, number],
  originOrDisplacement: [number, number, number],
  target?: [number, number, number]
): [number, number, number];
```

### 4.3 Integration with Class Hierarchies

1. **`H3AdjacencyGraph` (`src/spatial/h3_adjacency.ts`)**:
   - Class-level method `orientEdgeFluxVector(edgeId: string, fluxVector: [number, number, number]): [number, number, number]` delegates to `orientVectorTowardsTarget3D`.
   - Adjacency edge calculations utilize precomputed node centroid coordinates $(\mathbf{p}_i, \mathbf{p}_j)$ to guarantee directed flux coherence across boundaries.

2. **`SpatialMonad` (`src/monads/spatial_monad.ts`)**:
   - Cross-cell mass and heat exchange pipelines invoke directional orientation before applying flux transfer matrices.
   - Prevents negative diffusive conductance or reverse-entropy advection.

---

## 5. Thermodynamic & Conservation Invariants

### 5.1 First Law of Thermodynamics (Conservation of Energy & Mass)
- Directional alignment must not alter the magnitude of the vector:
  $$\|\mathbf{v}^*\|_2 = \|\mathbf{v}\|_2$$
- Vector orientation is strictly an isometry in $\mathbb{R}^3$ ($T(\mathbf{v}) = \pm \mathbf{v}$), guaranteeing that no artificial kinetic energy, momentum, or mass magnitude is created or destroyed.

### 5.2 Second Law of Thermodynamics (Entropy Production & Dissipation)
- Transport between cell $C_i$ (higher potential) and cell $C_j$ (lower potential) requires that the gradient flux vector $\mathbf{J}_{ij}$ satisfies:
  $$\mathbf{J}_{ij} \cdot (\mathbf{x}_j - \mathbf{x}_i) \ge 0$$
- By flipping negative projections, spurious reverse entropy transport against thermodynamic driving forces is mathematically eliminated.

---

## 6. Implementation Plan & Deliverables

1. **`src/spatial/h3_adjacency.ts`**:
   - Implement `orientVectorTowardsTarget3D(vector, displacement, target?)`.
   - Add unit dot-product utility if not already present or export clean inline computation for V8 JIT loop optimization.
   - Update `H3AdjacencyGraph` edge orientation handlers.

2. **Verification & Testing (`tests/sprint_064.test.ts`)**:
   - Standard positive alignment ($\mathbf{v} \cdot \mathbf{d} > 0$): vector unchanged.
   - Standard negative alignment ($\mathbf{v} \cdot \mathbf{d} < 0$): vector components inverted $(-v_x, -v_y, -v_z)$.
   - Orthogonal alignment ($\mathbf{v} \cdot \mathbf{d} = 0$): preserved without flip.
   - Origin-target overload: $\mathbf{d} = \mathbf{t} - \mathbf{o}$.
   - Degenerate vectors: zero vector and zero displacement.
   - Invariance of norm: $\sqrt{x^2+y^2+z^2}$ strictly conserved.

---

## 7. Success Criteria & Quality Gates
- **Type Safety**: 100% TypeScript compilation with zero `any` declarations.
- **Unit Test Coverage**: $\ge 98\%$ branch and statement coverage across vector orientation and adjacency graph edge routines.
- **Computational Efficiency**: Zero heap allocations when computing on primitive tuples or reusable vector buffers.