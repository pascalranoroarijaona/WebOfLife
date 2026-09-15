<!-- DevRel Onboarding & Contributor Guide -->
# Contributor & Developer Onboarding Guide: Sprint 072
## Centroid-Relative Boundary Ordering & Outward-Normal Orientation in Discrete Global Grid Systems (H3)

Welcome to the **Web of Life** open-source contributor ecosystem! Whether you are a computational ecologist, discrete geometer, graphics programmer, or functional TypeScript engineer, this guide will orient you to the new core architectural features landed in Sprint 072 and help you make your first contributions to our planetary biosphere simulation engine.

---

## 1. Project Overview & Sprint 072 Context

- **Official Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Runtime:** Node.js (v18+ or v20 LTS recommended)
- **Language / Stack:** 100% TypeScript (strict mode, immutable monads, no Python runtime dependencies)

### What was delivered in Sprint 072?
In hierarchical hexagonal discrete global grid systems (DGGS) like Uber's H3, cells share boundaries along geodesic arcs or line segments. In previous iterations, shared boundary endpoints were unordered pairs $(P_1, P_2)$. This created numerical ambiguities when computing directional fluxes:

$$\Phi_k(c_A \to c_B) = \int_{\Gamma_{AB}} \mathbf{F}_k \cdot \hat{\mathbf{n}}_{A \to B} \, d\ell$$

Without deterministic orientation, edge normal vectors $\hat{\mathbf{n}}$ risked pointing into the wrong cell, yielding artificial mass and energy destruction/creation in violation of the First Law of Thermodynamics.

In Sprint 072, we implemented:
1. `orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB)` in `src/spatial/h3_adjacency.ts`.
2. `orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB)` for spherical coordinates on $S^2$.
3. `H3AdjacencyGraph.getOrientedBoundary(cellA, cellB)` returning `ISharedBoundarySegment`.
4. Integration with `SpatialFluxMonad` guaranteeing skew-symmetry $\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$ and conservative flux closure:

$$\Phi_k(c_A \to c_B) + \Phi_k(c_B \to c_A) = 0$$

---

## 2. Quickstart & Local Environment Setup

We use Node.js and TypeScript throughout the entire stack.

### Step 1: Clone the Repository
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Sprint 072 Test Suite
Execute the newly added suite verifying centroid-relative orientation, skew-symmetry, and thermodynamic invariants:
```bash
npx tsx tests/sprint_072.test.ts
```

You should see all unit and integration tests passing:
- `INV-072-1`: Outward normal dot product with centroid displacement is strictly positive ($\hat{\mathbf{n}}_{A \to B} \cdot \mathbf{d}_{AB} > 0$).
- `INV-072-2`: Skew-symmetry verification ($\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$).
- `INV-072-3`: Unit length normalization ($\|\hat{\mathbf{n}}\| = 1.0 \pm 10^{-12}$).
- `INV-072-4`: Vertex set invariance (endpoints permuted, never distorted).
- `INV-072-5`: Zero net mass/energy flux leakage across all edges.

---

## 3. How to Use the New Sprint 072 API

### 3.1 Direct Ordering of Boundary Endpoints (2D)

```typescript
import { orderSharedBoundaryEndpointsByCentroid } from './src/spatial/h3_adjacency';
import type { Point2D } from './src/spatial/h3_types';

const p1: Point2D = [1.0, 2.0];
const p2: Point2D = [1.0, 4.0];
const centroidA: Point2D = [0.0, 3.0];
const centroidB: Point2D = [2.0, 3.0];

const result = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);

console.log('Ordered start:', result.orderedEndpoints[0]);
console.log('Ordered end:', result.orderedEndpoints[1]);
console.log('Unit outward normal:', result.outwardNormal);
console.log('Edge length:', result.length);
console.log('Was flipped:', result.isFlipped);
```

### 3.2 High-Level Graph Access via `H3AdjacencyGraph`

```typescript
import { H3AdjacencyGraph } from './src/spatial/h3_adjacency';

const graph = new H3AdjacencyGraph();
// ... initialize graph with cell indexes ...

const orientedSegment = graph.getOrientedBoundary('872830828ffffff', '872830829ffffff');
console.log('Outward Normal:', orientedSegment.outwardNormal);
console.log('Segment Length:', orientedSegment.length);
```

---

## 4. Extension Points: Build Your Own Monads and WebGL Shaders

The Web of Life architecture is designed around two extension vectors:
1. **Thermodynamic Monads** (Pure computational models of biogeochemical flux).
2. **WebGL / WebGPU Shaders** (High-throughput client-side visualization of vector fields and cellular manifolds).

### 4.1 Extension Point 1: Writing a Custom Spatial Flux Monad
If you want to simulate a new ecological transport process (e.g., fungal spore dispersal, atmospheric methane transport, microplastic drift):

1. **Location:** `src/spatial/` or `src/thermodynamics/`
2. **Interface Contract:**
   - Consume `ISharedBoundarySegment<Point2D>` from `H3AdjacencyGraph.getOrientedBoundary`.
   - Compute fluxes proportional to `boundary.outwardNormal` and `boundary.length`.
   - Ensure the update operator obeys skew-symmetry to preserve conserved quantities.

```typescript
// Example: SporeDispersalMonad.ts
import type { ISharedBoundarySegment, Point2D } from './src/spatial/h3_types';

export interface SporeState {
  readonly sporeCount: number;
}

export function computeSporeFlux(
  sourceState: SporeState,
  targetState: SporeState,
  boundary: ISharedBoundarySegment<Point2D>,
  windVelocity: [number, number],
  diffusivity: number
): number {
  const [nx, ny] = boundary.outwardNormal;
  const normalWind = windVelocity[0] * nx + windVelocity[1] * ny;
  
  // Upwind advection + Fickian diffusion
  const upwindConcentration = normalWind >= 0 ? sourceState.sporeCount : targetState.sporeCount;
  const advectiveFlux = normalWind * upwindConcentration;
  const diffusiveFlux = -diffusivity * (targetState.sporeCount - sourceState.sporeCount);
  
  return (advectiveFlux + diffusiveFlux) * boundary.length;
}
```

### 4.2 Extension Point 2: Building WebGL / WebGPU Shaders
The oriented boundary endpoints and outward normal vectors provide data buffers that can be fed directly to the GPU.

#### Shading Boundary Fluxes with Oriented Normals
In our WebGL pipeline (`src/visualization/shaders/`):
- **Vertex Buffer:** Passes `attribute vec2 a_endpointA`, `attribute vec2 a_endpointB`, `attribute vec2 a_outwardNormal`.
- **Instance Attributes:** `attribute float a_fluxMagnitude`, `attribute vec4 a_fluxColor`.
- **Fragment Shader Idea:** Render dynamic arrows, pulsating contours, or color ramps where saturation indicates flux magnitude and hue denotes thermodynamic sign:

```glsl
// Example WebGL Fragment Shader snippet: flux_boundary.frag
precision highp float;

varying vec2 v_texCoord;
uniform float u_time;
uniform vec3 u_positiveFluxColor;
uniform vec3 u_negativeFluxColor;
varying float v_fluxRate;

void main() {
    // Animate moving energy pulses along the boundary normal
    float pulse = sin(v_texCoord.x * 20.0 - u_time * 4.0 * sign(v_fluxRate));
    vec3 baseColor = v_fluxRate >= 0.0 ? u_positiveFluxColor : u_negativeFluxColor;
    float alpha = smoothstep(0.2, 0.8, pulse) * abs(v_fluxRate);
    gl_FragColor = vec4(baseColor, alpha);
}
```

---

## 5. Curated "Good First Issues" for New Contributors

Ready to submit your first Pull Request? Here are four high-impact, bite-sized tasks:

### Issue #GFI-072-A: WebGL Normal Arrow Overlay
- **Domain:** WebGL / Canvas2D / Shaders
- **Goal:** Write a lightweight rendering utility in `src/visualization/` that draws directional outward normal glyphs $(\hat{\mathbf{n}}_{A \to B})$ centered at the midpoint of each shared H3 boundary.
- **Difficulty:** Beginner / Intermediate
- **Mentor Contact:** `@architecture-team` in discussion threads.

### Issue #GFI-072-B: Collinear Pentagonal Degeneracy Failsafe in H3
- **Domain:** Discrete Geometry
- **Goal:** At resolution transitions and around the 12 pentagons of the icosahedral H3 grid, cell edges can occasionally exhibit micro-segment collinearity. Add dedicated boundary unit tests in `tests/` asserting that `orderSharedBoundaryEndpointsByCentroid` cleanly resolves pentagon-hexagon interfaces using the lexicographical tie-break invariant.
- **Difficulty:** Beginner
- **Skills:** TypeScript, Unit Testing (`npx tsx`)

### Issue #GFI-072-C: GeoJSON FeatureCollection Exporter for Oriented Boundaries
- **Domain:** GIS / Data Pipelines
- **Goal:** Create a helper function `exportOrientedBoundariesToGeoJSON(graph: H3AdjacencyGraph)` that exports line strings with LineString properties `['outwardNormalX', 'outwardNormalY', 'lengthMeters', 'cellA', 'cellB']` for visualization in QGIS and Mapbox.
- **Difficulty:** Beginner
- **Skills:** TypeScript, GeoJSON specification

### Issue #GFI-072-D: Add Benchmark for 3D Chord vs Geodesic Normal Calculations
- **Domain:** Performance / Math Benchmarking
- **Goal:** Profile `orderSharedBoundaryEndpointsByCentroid3D` across $10^6$ edges using `tinybench` or Node.js `performance.now()`, identifying opportunities for SIMD or typed array optimization.
- **Difficulty:** Intermediate
- **Skills:** Node.js performance profiling, 3D Vector Math

---

## 6. Contribution Workflow & Code Standards

1. **Fork and Branch:** Create a feature branch named `feat/your-feature-name` or `fix/issue-description`.
2. **Code Style:** Pure TypeScript, zero `any` types, immutable interfaces where applicable.
3. **No External Runtime Bloat:** Avoid adding heavy runtime dependencies. Keep geometry routines pure and zero-dependency.
4. **Verification:** All PRs must include passing tests executable with:
   ```bash
   npx tsx tests/sprint_072.test.ts
   ```
5. **PR Description:** Reference any related RFC or GFI issue ID, explain physical/mathematical invariants preserved, and attach screenshots or test output.

Happy hacking, and welcome to the team building the digital twin of planetary thermodynamics!
```

---