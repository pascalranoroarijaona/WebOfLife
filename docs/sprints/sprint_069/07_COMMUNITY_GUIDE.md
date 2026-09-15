<!-- DevRel Onboarding & Contributor Guide -->
# Developer & Contributor Guide: Sprint 069
## Cartesian 3D Boundary Vertex Extraction (`extractH3BoundaryCartesianVertices3D`)

Welcome to the **Web of Life** developer ecosystem! Whether you are interested in discrete global geometry, thermodynamic simulation monads, or high-performance GPU shaders on the planetary sphere, this guide gets you up to speed with our newest spatial geometry subsystem shipped in **Sprint 069**.

---

## 1. Quickstart & Local Environment Setup

The Web of Life engine is built exclusively in **TypeScript** on **Node.js**.

### Repository
Clone the repository:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
```

### Installation
Install project dependencies using `npm`:
```bash
npm install
```

### Running Sprint 069 Tests
Execute the verification suite with `tsx`:
```bash
npx tsx tests/sprint_069.test.ts
```

All 3D Cartesian boundary projection, geometric invariance, and interfacial conservation tests should pass with zero warnings.

---

## 2. What Was Built in Sprint 069?

### The Problem
Prior to Sprint 069, H3 cell boundaries were represented as geodetic latitude and longitude pairs $(\phi, \lambda)$. While convenient for 2D cartography, geodetic coordinates:
1. Suffer from coordinate singularities at the poles ($\phi = \pm \pi/2$).
2. Require expensive spherical trigonometry ($\arccos$, $\sin$, $\cos$) for every directional flux vector calculation.
3. Cause metric distortions and numerical inaccuracies when computing interface normals between neighboring cells.
4. Require cumbersome client-side projection transformations before streaming geometry to WebGL/Three.js GPU buffers.

### The Solution: `extractH3BoundaryCartesianVertices3D`
Sprint 069 introduces normalized 3D Cartesian boundary extraction in `src/spatial/h3_adjacency.ts`. For any H3 index (hexagonal or pentagonal), it converts boundary coordinates directly into normalized Cartesian position vectors $\mathbf{v} = [x, y, z]^T \in \mathbb{S}^2 \subset \mathbb{R}^3$:

$$
\begin{aligned}
x &= R \cos(\phi) \cos(\lambda) \\
y &= R \cos(\phi) \sin(\lambda) \\
z &= R \sin(\phi)
\end{aligned}
$$

Each vertex is strictly normalized such that $\|\mathbf{v}\|_2 = 1 \pm 10^{-12}$ (for planetary unit radius $R = 1.0$).

### Core TypeScript API

```typescript
import { 
  extractH3BoundaryCartesianVertices3D, 
  Cartesian3D, 
  H3BoundaryCartesian3D 
} from './src/spatial/h3_adjacency';

// Extract boundary for an H3 cell (e.g., resolution 3 hexagon)
const boundary: H3BoundaryCartesian3D = extractH3BoundaryCartesianVertices3D('832830fffffffff', {
  closeLoop: true, // Returns 7 vertices (v_6 == v_0) for closed rendering loops
  radius: 1.0      // Unit sphere
});

console.log(`Cell has ${boundary.vertexCount} unique vertices.`);
console.log(`Centroid: [${boundary.centroid.x}, ${boundary.centroid.y}, ${boundary.centroid.z}]`);

for (const vertex of boundary.vertices) {
  console.log(`Vertex: (${vertex.x.toFixed(6)}, ${vertex.y.toFixed(6)}, ${vertex.z.toFixed(6)})`);
}
```

---

## 3. Physical & Thermodynamic Relevance

In the Web of Life planetary architecture:
- **First Law (Mass & Energy Conservation)**: Adjacent cells $A$ and $B$ share a boundary segment $[\mathbf{v}_1, \mathbf{v}_2]$. The Cartesian edge vector $\mathbf{e}_{AB} = \mathbf{v}_2 - \mathbf{v}_1$ and interface normal $\hat{\mathbf{n}}_{AB}$ guarantee that interfacial fluxes satisfy $\Phi_{AB} = -\Phi_{BA}$ at machine precision.
- **Second Law (Entropy Non-Decreasing)**: Geodesic distances $L_{AB} = \arccos(\mathbf{v}_1 \cdot \mathbf{v}_2)$ allow direct evaluation of thermal dissipation and frictional shear entropy production without coordinate approximations.

---

## 4. Good First Issues for External Contributors

We welcome contributions from graphics programmers, simulation engineers, and functional programmers! Here are high-impact issues tagged for new contributors:

### Issue #1: WebGL / Three.js Instanced Hex-Prism Extrusion Shader
- **Module**: `src/rendering/shaders/` or `examples/webgl/`
- **Scope**: Use `extractH3BoundaryCartesianVertices3D` to build an instanced `BufferGeometry` for Three.js. Extrude the unit-sphere hexagon radially outward by dynamic cell scalar stocks (such as biomass density or atmospheric pressure).
- **Difficulty**: Intermediate.
- **Key Hint**: The 3D Cartesian vertices can be passed directly as `attribute vec3 aVertexPosition` into your vertex shader.

### Issue #2: Spatial Advection Vector Normal Visualizer
- **Module**: `src/spatial/h3_adjacency.ts` & `src/rendering/`
- **Scope**: Implement a helper function `computeCellEdgeNormals(h3Index: string)` that returns the 6 (or 5) outward Cartesian normal vectors $\hat{\mathbf{n}}_{k}$. Write a simple debug scene showing directional arrows pointing to topological neighbors.
- **Difficulty**: Easy / Good First Issue.
- **Verification**: Ensure $\hat{\mathbf{n}}_k \cdot \mathbf{c} = 0$ (orthogonal to the radial centroid vector) and $\|\hat{\mathbf{n}}_k\|_2 = 1.0$.

### Issue #3: Geodesic Interfacial Flux Monad Step
- **Module**: `src/monads/spatial_flux_monad.ts`
- **Scope**: Extend the state tensor monad with a pure function mapping `CellStockTensor` across an edge using `evaluateInterfacialTransferMonad` (specified in `RFC-069`). Verify that $\sum \Delta M = 0$.
- **Difficulty**: Intermediate.

---

## 5. Development Workflow & Contribution Checklist

1. **Branch**: Create a feature branch from `main`:
   ```bash
   git checkout -b feature/h3-boundary-shader-pipeline
   ```
2. **Coding Standards**:
   - 100% TypeScript with strict typing (`noImplicitAny: true`).
   - Pure, deterministic functions whenever possible.
   - All geometric conversions must respect machine precision tolerances ($\varepsilon \le 10^{-12}$).
3. **Testing**: Add unit tests under `tests/` and run:
   ```bash
   npx tsx tests/sprint_069.test.ts
   ```
4. **Pull Request**: Submit your PR on GitHub at [pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife). Reference the relevant sprint or issue number in your PR description.

Happy hacking on the planetary manifold!