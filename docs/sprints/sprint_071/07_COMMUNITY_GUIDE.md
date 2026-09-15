<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 071 Contributor Guide: Discrete 3D Boundary Vertex Matching & Conservative Thermodynamic Flux Monads

Welcome to Sprint 071 of the Gaia **WebOfLife** project! If you are interested in computational geometry, discrete global grid systems (DGGS), finite volume methods, or planetary thermodynamics, you have landed in the right place.

In this sprint, we implemented `findSharedBoundaryVertexPairs3D` inside `src/spatial/h3_adjacency.ts`. This fundamental building block enables conservative boundary advection and diffusion across adjacent H3 cells without spatial mass leaks or energy deficits.

---

## 1. Quickstart & Developer Onboarding

### Repository Coordinates
- **GitHub Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Tech Stack**: TypeScript (ES2022+), Node.js (v20+), strict typing.

### Environment Setup

Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note**: We do not use Python or pip. All scripts, math operations, and unit tests execute natively in TypeScript via Node.js and `tsx`.

### Running Verification Tests

To verify the test suite for this sprint, run:

```bash
npx tsx tests/sprint_071.test.ts
```

All 6 core invariant checks—ranging from exact coincident vertex distance detection to machine-precision First Law conservation ($\Delta M_A + \Delta M_B = 0$)—should pass.

---

## 2. What Was Added in Sprint 071?

Discrete cell footprints projected across curved planetary manifolds exhibit minor floating-point divergence ($\sim 10^{-7} - 10^{-5}$). Sprint 071 solves this by computing symmetric, coincident boundary vertex pairs in $\mathbb{R}^3$:

1. **`findSharedBoundaryVertexPairs3D`** (`src/spatial/h3_adjacency.ts`):
   Identifies and extracts ordered pairs $(i, j)$ where $\|\mathbf{p}_i^A - \mathbf{q}_j^B\|_2 \le \epsilon_{\text{geom}}$. Adjacent cells return exactly 2 vertex pairs representing the shared geodesic edge.
2. **`BoundaryEdge3D` Interface** (`src/spatial/h3_types.ts`):
   Provides edge midpoint, symmetric geodesic length $L_{AB}$, and outward normal $\hat{\mathbf{n}}_{AB}$ directed strictly from Cell A to Cell B.
3. **`computeBoundaryFlux`** (`src/spatial/spatial_flux_monad.ts`):
   Evaluates coupled advection and Fickian diffusion for water, dissolved carbon, minerals, oxygen, and thermal enthalpy. Guarantees:
   - **First Law**: Closed-boundary mass and enthalpy balances $\sum \Delta S = 0$ to double precision ($< 10^{-15}$).
   - **Second Law**: Non-negative entropy production on boundary conduction ($\dot{S}_{\text{gen}} \ge 0$).

---

## 3. "Good First Issues" for New Contributors

Looking to make your first pull request? Here are three high-impact issues ready for external contributors:

### Issue #GFI-071-A: Add Voronoi/Geodesic Segment Length Metric Option
- **Subsystem**: `src/spatial/h3_adjacency.ts`
- **Scope**: Currently, edge length $L_{AB}$ uses the Euclidean chord distance between matched endpoints in $\mathbb{R}^3$. For high-altitude cells or low H3 resolutions (e.g., res 0–2), great-circle arc length on the planetary sphere $R_\oplus \arcsin\left(\frac{\|\mathbf{e}_{AB}\|}{2 R_\oplus}\right)$ is more precise.
- **Task**: Add an optional configuration flag `{ useGeodesicArcLength: boolean }` to `extractSharedBoundaryEdge3D` and add tests in `tests/sprint_071.test.ts`.

### Issue #GFI-071-B: Implement a `BoundaryFluxLoggerMonad`
- **Subsystem**: `src/spatial/spatial_flux_monad.ts`
- **Scope**: Contributors interested in Functional Reactive Programming can write a monadic wrapper that records cumulative edge fluxes into an indexed circular buffer for diagnostics.
- **Task**: Create `BoundaryFluxLoggerMonad` wrapping `computeBoundaryFlux`, recording cumulative mass transported across identified edge keys `${cellA}_${cellB}`.

### Issue #GFI-071-C: Degenerate Vertex Edge Invariant Fuzzing Test
- **Subsystem**: `tests/sprint_071.test.ts`
- **Scope**: Property-based testing for pentagonal cells (the 12 topological pentagons in the H3 grid) and perturbed noise inputs.
- **Task**: Add a test that injects random geometric jitter ($10^{-6} \le \delta \le 10^{-3}$) into cell vertices and verifies that `findSharedBoundaryVertexPairs3D` gracefully rejects non-coincident vertices when $\delta > \epsilon$.

---

## 4. Extension Points: Building Monads & WebGL Shaders

For senior contributors wanting to expand the planetary simulation pipeline:

### A. Constructing New Physical Process Monads
You can compose `BoundaryFluxDelta` into custom biogeochemical monads:
```typescript
import { CellThermodynamicState, BoundaryEdge3D, computeBoundaryFlux } from '../src/spatial/spatial_flux_monad';

export class BiogeochemicalSedimentMonad {
  // Chain spatial advection with benthic boundary fluxes
  public stepSedimentBoundary(
    stateA: CellThermodynamicState,
    stateB: CellThermodynamicState,
    edge: BoundaryEdge3D,
    dt: number
  ) {
    return computeBoundaryFlux(
      stateA,
      stateB,
      edge,
      10.0, // layerHeightMeters
      0.05, // normal velocity (m/s)
      {
        waterDiffusivity: 1e-6,
        carbonDiffusivity: 1e-9,
        mineralDiffusivity: 1e-8,
        oxygenDiffusivity: 2e-9,
        thermalConductivity: 0.6
      },
      dt
    );
  }
}
```

### B. WebGL Shader Extension Point: Boundary Flux Vector Visualization
In our client-side WebGL renderer, coincident boundary edges can be rendered as dynamic vector field lines with color-mapped entropy dissipation:

```glsl
// vertex_flux_edge.glsl
attribute vec3 a_vertex1;
attribute vec3 a_vertex2;
attribute vec3 a_outwardNormal;
attribute float a_fluxIntensity;
attribute float a_entropyProduced;

uniform mat4 u_modelViewProjection;
uniform float u_time;

varying vec4 v_color;

void main() {
    // Interpolate edge segment with outward normal extrusion
    vec3 mid = 0.5 * (a_vertex1 + a_vertex2);
    vec3 animatedPos = mid + a_outwardNormal * sin(u_time * 2.0) * a_fluxIntensity * 0.01;
    
    // Color map: Green (conservative transport) -> Amber/Red (high entropy generation)
    v_color = vec4(clamp(a_entropyProduced * 100.0, 0.0, 1.0), 1.0 - clamp(a_entropyProduced * 100.0, 0.0, 1.0), 0.2, 1.0);
    gl_Position = u_modelViewProjection * vec4(animatedPos, 1.0);
}
```

---

## 5. Coding Standards & Review Checklist

When submitting a PR for `src/spatial/`:
- [ ] Strictly pure functional state updates: no in-place mutation of `CellThermodynamicState`.
- [ ] All vectors must use the immutable `Vector3D` interface.
- [ ] Verify First Law invariants: closed-cell test checks that `|deltaA + deltaB| < 1e-15`.
- [ ] Verify Second Law invariants: thermal diffusion tests confirm `entropyProducedJPerK >= 0.0`.
- [ ] Run `npx tsx tests/sprint_071.test.ts` to confirm no regressions.

Welcome aboard! Drop into issues or pull requests at [WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) to get started.
```

---