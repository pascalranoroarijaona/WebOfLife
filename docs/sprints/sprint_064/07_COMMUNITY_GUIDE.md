# Web of Life — Developer Onboarding & Community Contributor Guide
## Sprint 064: 3D Vector Target Orientation via Displacement Dot-Product Parity

Welcome to the **Web of Life** open-source contributor community! Whether you are an ecologist writing computational monads, a systems programmer optimizing discrete global grid algorithms, or a graphics engineer building WebGL visualization shaders, this guide will help you understand, build, and extend the features delivered in Sprint 064.

---

## 1. Repository & Mission

- **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Tech Stack:** Node.js, TypeScript, Uber H3 (DGGS), WebGL2.
- **Mission:** High-fidelity, thermodynamically consistent planetary biosphere and ecosphere simulation operating over discrete global grid systems.

> **Note on Environment:** Web of Life is an end-to-end TypeScript repository. Do **not** use `pip` or `pytest`. All dependencies and test runners are driven strictly through `npm` and `npx tsx`.

---

## 2. Quickstart: Building & Running Tests

Clone the repository and install all dependencies:

```bash
# Clone the canonical repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install Node.js dependencies
npm install

# Run the Sprint 064 unit & integration test suite
npx tsx tests/sprint_064.test.ts
```

To run the entire test suite across all monads and spatial subsystems:
```bash
npm test
```

---

## 3. What Was Built in Sprint 064?

### The Problem: Arbitrary Edge Vectors on Spherical Tessellations
In discrete global grid systems (DGGS) mapped to spherical manifolds ($\mathbb{S}^2 \subset \mathbb{R}^3$), cell-boundary tangent normals and flow direction vectors often have arbitrary sign parity depending on mesh vertex winding order or chart projection. When computing advection across contiguous H3 hexagonal cells $C_i \to C_j$, a vector $\mathbf{v}$ pointing counter to the source-to-target displacement $\mathbf{d}_{ij} = \mathbf{p}_j - \mathbf{p}_i$ causes inverted boundary flux. In physical simulations, this manifests as reversed advection, spurious negative mass densities, and entropy destruction.

### The Solution: `orientVectorTowardsTarget3D`
In `src/spatial/h3_adjacency.ts`, we implemented `orientVectorTowardsTarget3D`, a zero-allocation parity projection operator:
$$\mathbf{v}^* = \begin{cases} -\mathbf{v} & \text{if } \mathbf{v} \cdot \mathbf{d} < 0 \\ \mathbf{v} & \text{if } \mathbf{v} \cdot \mathbf{d} \ge 0 \end{cases}$$

### Key Method Signatures
Located in `src/spatial/h3_adjacency.ts`:
```typescript
export type Vector3Tuple = [number, number, number];

// Direct displacement signature
export function orientVectorTowardsTarget3D(
  vector: Vector3Tuple,
  displacement: Vector3Tuple
): Vector3Tuple;

// Coordinate pair overload signature (displacement = target - origin)
export function orientVectorTowardsTarget3D(
  vector: Vector3Tuple,
  origin: Vector3Tuple,
  target: Vector3Tuple
): Vector3Tuple;
```

And integrated directly into `H3AdjacencyGraph`:
```typescript
public orientEdgeFluxVector(
  sourceHex: string,
  targetHex: string,
  fluxVector: Vector3Tuple
): Vector3Tuple;
```

---

## 4. Good First Issues & Extension Points

Looking to make your first contributions? Here are four high-impact areas designed for new contributors:

### Issue #1 (Graphics & Shaders): WebGL2 Flow-Field Vector Particle Shader
- **Area:** `src/renderer/shaders/advection_particles.frag` & `src/renderer/shaders/advection_particles.vert`
- **Context:** When visualizing surface wind, ocean currents, or animal migration on the 3D globe, WebGL particle streams must align with boundary flux vectors.
- **Task:** Create an instanced arrow or dynamic streak shader in WebGL2 that takes oriented vectors output by `orientEdgeFluxVector` and renders smooth streamlets along hexagonal edges.
- **Skills:** WebGL2, GLSL, matrix transforms.

### Issue #2 (Ecological Monads): Trophic Migration Alignment Monad
- **Area:** `src/monads/trophic_migration_monad.ts`
- **Context:** Foraging herbivores track nutrient and vegetation density gradients across adjacent H3 cells.
- **Task:** Implement a monad step that computes resource gradients between neighbor cells, projects migration velocity vectors onto the adjacency edges using `orientVectorTowardsTarget3D`, and updates herbivore biomass stocks with strict non-negative constraints.
- **Skills:** TypeScript, Ecological dynamics, Monadic state composition.

### Issue #3 (Geodesics & Topology): Pentagonal Disclination Boundary Handler
- **Area:** `src/spatial/h3_adjacency.ts`
- **Context:** An icosahedral H3 grid contains exactly 12 pentagons across the globe. Pentagons have 5 neighbors instead of 6, inducing angular deficit curvature.
- **Task:** Extend `orientEdgeFluxVector` test cases and handling for edges incident to pentagonal cells (resolution indices with pentagon flags) to ensure boundary normal parity does not suffer numerical drift across icosahedron facet folds.
- **Skills:** Computational geometry, H3 DGGS.

### Issue #4 (Performance Optimization): SIMD / Float32Array Batch Orientation
- **Area:** `src/spatial/h3_adjacency.ts`
- **Context:** When running global planetary steps with $10^5+$ hexagonal cells, computing dot products sequentially in Javascript can introduce CPU bottlenecks.
- **Task:** Implement `batchOrientVectorsTowardsTargets(flatVectors: Float32Array, flatDisplacements: Float32Array, outOriented: Float32Array): void` using contiguous flat typed arrays to allow V8 auto-vectorization and zero garbage collector overhead.
- **Skills:** High-performance TypeScript, TypedArrays, memory layout optimization.

---

## 5. Development Guidelines & PR Checklist

When submitting a pull request to `pascalranoroarijaona/WebOfLife`:

1. **Strict Type Safety:** Zero usage of `any`. Run `npx tsc --noEmit` to verify type cleanliness.
2. **Thermodynamic Invariants:**
   - Vector norm must be conserved: $\|\mathbf{v}^*\|_2 = \|\mathbf{v}\|_2$.
   - Mass and energy balances must satisfy $|\sum \Delta S| < 10^{-14}$.
3. **Unit Tests:** Add comprehensive unit tests in `tests/` covering positive alignment, negative alignment, orthogonal boundaries, and degenerate zero vectors.
4. **Verification:** Ensure `npx tsx tests/sprint_064.test.ts` and `npm test` pass with 100% success.
```

---