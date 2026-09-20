# Sprint 093 Contributor & Developer Guide: H3 Aperture Rotation Sequencing & Multiscale Spatial Fluxes

Welcome to **Sprint 093** of the **Web of Life** project! 

This sprint integrates a key mathematical foundation into our discrete spatial calculus engine: **Aperture Rotation Sequence Resolution for H3 Hierarchical Tessellations**. 

Whether you are building functional reactive monads in TypeScript or crafting WebGL/WebGPU visual shaders for planetary visualization, this guide walks you through the concepts, codebase layout, test workflows, and open extension points.

---

## 1. Quickstart & Environment Setup

Our repository is built on **Node.js** and **TypeScript**. We do not use Python or other runtimes for core simulation logic.

### Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Sprint 093 Test Suite
We execute our test suites directly using `npx tsx`:

```bash
npx tsx tests/sprint_093.test.ts
```

All tests should pass with clean assertions verifying sequence construction, boundary enforcement, vector norm preservation, and First Law thermodynamic conservation.

---

## 2. The Core Concept: Why Do Hexagons Rotate?

Our planetary grid uses Uber's H3 Aperture-7 hexagonal tessellation projected onto an icosahedron. 

In standard quadtree grids, children nest squarely inside parents with parallel boundaries. However, in an **Aperture-7 hexagonal grid**, each time you increase the resolution ($r \to r + 1$), child hexagons are scaled by $1/7$ and **rotate** by an angle:

$$\theta_0 = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.106605^\circ \quad (0.333473172 \text{ rad})$$

Because a hexagon has $60^\circ$ rotational symmetry, the grid coordinate orientation alternates between two parity classes:
- **Class II (Even resolutions $0, 2, 4, \dots$):** Aligned with the base icosahedral grid ($0^\circ \pmod{60^\circ}$).
- **Class III (Odd resolutions $1, 3, 5, \dots$):** Rotated by $19.11^\circ \pmod{60^\circ}$.

```
  Resolution 0 (Class II)             Resolution 1 (Class III)
          ______                               /\
         /      \                             /  \
        /        \                           /    \
       |          |                         |      |
       |          |          ======>        |      |
        \        /                           \    /
         \______/                             \  /
                                               \/
      Orientation: 0°                     Orientation: +19.11°
```

### The New APIs in `src/spatial/h3_adjacency.ts`

```typescript
import { ApertureClass } from './h3_types';

// Get the orientation class for a single resolution level
const resClass = getApertureClass(3); // Returns ApertureClass.CLASS_III

// Get the full historical sequence from Resolution 0 to targetResolution
const seq = getApertureRotationSequence(2); 
// Returns: [ApertureClass.CLASS_II, ApertureClass.CLASS_III, ApertureClass.CLASS_II]
```

### Strict Validation Contracts
- Resolutions must be integers: passing `2.5`, `NaN`, or `"3"` throws a `TypeError`.
- Resolutions must be within valid bounds $[0, 15]$: passing `-1` or `16` throws a `RangeError`.

---

## 3. Good First Issues & Contributor Extension Points

We are actively seeking community contributions in two primary areas: **Functional Monads** and **WebGL/GLSL Shaders**.

### 🌟 Good First Issue #1: Implement `BiomassAdvectionMonad`
- **Location:** `src/spatial/biomass_advection_monad.ts`
- **Goal:** Build a monadic transfer pipeline that transports vegetative and fungal biomass across parent-child hexagonal boundaries.
- **Requirements:**
  1. Use `getApertureRotationSequence` to check whether the source and target cell share orientation parity.
  2. If transferring across odd step differences, apply `SpatialFluxMonad.create(sourceRes, targetRes).alignFluxVector(flux)`.
  3. Ensure that the total mass of carbon transferred ($\Delta M_{\text{C}}$) identically equals the mass received, asserting First Law conservation.
- **Skills:** TypeScript, Functional Programming, Unit Testing with `npx tsx`.

### 🌟 Good First Issue #2: WebGL Hexagonal Wireframe Shader with Aperture Rotation
- **Location:** `src/renderer/shaders/hex_aperture.vert.glsl` and `hex_aperture.frag.glsl`
- **Goal:** Render multi-resolution nested hexagons in WebGL with accurate geometric orientation.
- **Requirements:**
  1. Pass the `apertureClass` as an integer uniform/attribute (`0` for Class II, `1` for Class III).
  2. In the vertex shader, rotate vertex positions by $19.106605^\circ$ ($0.333473172$ rad) when `apertureClass == 1`.
  3. Display child hexagons seamlessly aligned inside their parent cells on the globe.
- **Skills:** GLSL, WebGL, 3D Coordinate Geometry.

### 🌟 Good First Issue #3: Aperture Parity Bitmask Performance Optimization
- **Location:** `src/spatial/h3_adjacency.ts`
- **Goal:** Add a lookup table or pre-computed constant bitmask for resolving sequences without memory re-allocation in tight simulation loops:
  ```typescript
  // Example candidate:
  export const STATIC_APERTURE_TABLE: ReadonlyArray<readonly ApertureClass[]> = ...
  ```
- **Requirements:** Benchmark garbage collection pressure during $10^6$ cell updates per second.

---

## 4. How to Submit a Pull Request

1. **Create a branch:**
   ```bash
   git checkout -b feature/my-new-monad
   ```
2. **Implement your changes:** Write clean, typed TypeScript code in `src/`.
3. **Add unit tests:** Add corresponding tests in `tests/`.
4. **Run the suite:**
   ```bash
   npx tsx tests/sprint_093.test.ts
   ```
5. **Open a PR:** Target `main` on [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) with a description of your mathematical checks and test outputs!

Happy hacking, and welcome to building the open-source biosphere!