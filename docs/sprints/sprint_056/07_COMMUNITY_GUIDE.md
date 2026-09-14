<!-- DevRel Onboarding & Contributor Guide -->

# Developer & Contributor Guide: Sprint 056
## Geodesic Boundary Assertions (`assertValidCoordinatePair`) & Spherical Transport Monads

Welcome to **WebOfLife**! This sprint introduces `assertValidCoordinatePair` and `CoordinateBoundaryError` in `src/spatial/h3_adjacency.ts`. These additions form the foundation for geodesic validation across planetary tessellations, spatial monads, and conservation-law physics pipelines.

Whether you are here to build biogeochemical monads, write high-performance WebGL shaders, or improve spatial validation, this guide will get you set up and contributing in minutes.

---

## 1. Quickstart & Environment Setup

The **WebOfLife** engine runs entirely on modern **TypeScript** and **Node.js**.

### 1.1 Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note**: Do not use Python package managers (`pip`) or testing frameworks (`pytest`). All tooling is standard Node.js / TypeScript.

### 1.2 Verify the Sprint 056 Test Suite
Run the dedicated test suite using `npx tsx`:
```bash
npx tsx tests/sprint_056.test.ts
```
To run all spatial tests across the repository:
```bash
npx tsx --test tests/**/*.test.ts
```

---

## 2. What Shipped in Sprint 056?

### 2.1 The Problem: Coordinate Singularities & Thermodynamic Leakage
In planetary simulations running over Uber H3 discrete global grids, discrete cells exchange conserved mass (carbon, water, nitrogen, phosphorus, dissolved oxygen) and thermal energy ($U$).

When floating-point coordinates drift outside valid geodesic bounds:
1. **Latitude singularities ($|\phi| > 90^\circ$)**: Spherical distance formulas (e.g., Haversine or Law of Cosines) encounter negative values inside square roots, propagating `NaN` values across adjacent stock tensors.
2. **First Law Violations**: Dangling or unmapped spatial addresses direct fluxes into invalid nodes, breaking total mass conservation ($\sum \Delta M_c \ne 0$).
3. **Second Law Violations**: Non-positive separation distances ($d \le 0$) invert thermal and diffusion gradients, generating non-physical negative entropy ($dS < 0$).

### 2.2 The Solution: `assertValidCoordinatePair`
In `src/spatial/h3_adjacency.ts`, we introduced:
- **`assertValidCoordinatePair`**: TypeScript assertion signature verifying IEEE 754 finiteness and spherical bounds $\phi \in [-90^\circ, +90^\circ]$ and $\lambda \in [-180^\circ, +180^\circ]$ (or $[0^\circ, 360^\circ]$ when enabled).
- **`isValidCoordinatePair`**: Non-throwing boolean predicate for safe branching.
- **`CoordinateBoundaryError`**: Dedicated subclass of `RangeError` with contextual tracing.

### 2.3 Code Pattern: How to Use It in Your Features
```typescript
import { 
  assertValidCoordinatePair, 
  isValidCoordinatePair, 
  CoordinateBoundaryError 
} from '../spatial/h3_adjacency';

// 1. Dual scalar assertion
assertValidCoordinatePair(48.8566, 2.3522, "CityLookup.Paris");

// 2. Structured object assertion
assertValidCoordinatePair({ lat: -33.8688, lon: 151.2093 }, {
  context: "OceanCurrentSensor.Sydney",
  epsilon: 1e-9
});

// 3. Alternative naming format ({ latitude, longitude })
assertValidCoordinatePair({ latitude: 0.0, longitude: 179.999 });

// 4. Conditional checking without exceptions
if (isValidCoordinatePair(rawLat, rawLon)) {
  projectCell(rawLat, rawLon);
} else {
  quarantineInput(rawLat, rawLon);
}
```

---

## 3. Good First Issues & Extension Points

We actively welcome community contributions! Below are ready-to-implement extension points for new contributors.

### Issue #1: Antimeridian Wrapping Option in `H3AdjacencyService`
- **Level**: *Good First Issue (Beginner)*
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Description**: Add an option to automatically normalize and wrap longitudes across the antimeridian $\pm 180^\circ$ instead of throwing an error when `wrapAntimeridian: true` is configured.
- **Verification**: Add unit tests in `tests/sprint_056.test.ts` verifying that `181.5°` wraps cleanly to `-178.5°`.

### Issue #2: Build a Watershed Overland Flow Monad (`HydrologyMonad`)
- **Level**: *Intermediate (Monad Engineering)*
- **Target File**: `src/monads/hydrology_monad.ts`
- **Description**: Construct a functional monadic state wrapper (`HydrologyMonad`) that models D8/hexagonal hydraulic head overland flow:
  - Guard all cell centroid inputs using `assertValidCoordinatePair`.
  - Implement conservative fluid transfer between neighboring H3 indices: $\Delta M_{\text{H}_2\text{O}, i \to j} = -\Delta M_{\text{H}_2\text{O}, j \to i}$.
  - Ensure zero fluid mass divergence over closed basins.
- **Verification**: Create `tests/hydrology_monad.test.ts` verifying that water volume is strictly conserved to machine precision across $10^4$ simulation ticks.

### Issue #3: WebGL Geodesic Advection Vector Field Shader
- **Level**: *Advanced (WebGL / Graphics)*
- **Target File**: `src/rendering/shaders/advection_flow.frag.glsl` & `src/rendering/advection_renderer.ts`
- **Description**: Implement a WebGL 2.0 fragment shader rendering advective wind and ocean surface currents:
  - Feed vertex positions sampled from validated H3 cell coordinates.
  - Handle pole pinch artifacts in fragment UV transformations using spherical coordinates.
  - Render color-coded kinetic energy dissipation $\frac{1}{2}\rho v^2$ with smooth antimeridian wrapping.
- **Verification**: Run visual regression testing with the project canvas harness.

---

## 4. Architectural Map for Spatial Monads

```
        Geodesic Ingestion (lat, lon)
                     │
                     ▼
       ┌───────────────────────────┐
       │ assertValidCoordinatePair │ ──[Violation]──► CoordinateBoundaryError
       └─────────────┬─────────────┘
                     │ Valid (passes IEEE 754 & WGS84 bounds)
                     ▼
       ┌───────────────────────────┐
       │   H3AdjacencyService      │ ◄── Adjacency & Great-Circle Calculations
       └─────────────┬─────────────┘
                     │ Topological Neighbours
                     ▼
       ┌───────────────────────────┐
       │   SpatialTransportMonad   │ ◄── Strictly Conservative Flux Transfers
       └─────────────┬─────────────┘
                     │ Immutable State Transitions
                     ▼
       ┌───────────────────────────┐
       │  WebGL Planetary Renderer │ ◄── GPU Geodesic Shader Pipelines
       └───────────────────────────┘
```

---

## 5. Contribution & PR Workflow

1. **Fork & Branch**:
   ```bash
   git checkout -b feat/my-new-monad
   ```
2. **Follow Invariants**:
   - Every coordinate entry point **must** be guarded by `assertValidCoordinatePair`.
   - Every physical stock exchange between cells must follow conservation equations ($\Delta S_i = -\Delta S_j$).
3. **Execute Formatting & Tests**:
   ```bash
   npm run lint || npx eslint src/
   npx tsx tests/sprint_056.test.ts
   ```
4. **Open a Pull Request**:
   - Reference the issue number.
   - Include test run logs showing passed conservation checks.

Join us on GitHub: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)