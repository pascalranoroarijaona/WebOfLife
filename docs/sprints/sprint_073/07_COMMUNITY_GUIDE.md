# Sprint 073 Contributor & Developer Onboarding Guide
## Spherical Angular Tolerance Validation for Shared Boundary Endpoints

Welcome to Sprint 073 of the **Web of Life** planetary simulation engine! This sprint introduces strict spherical topology verification in `src/spatial/h3_adjacency.ts` via `assertBoundaryEndpointTolerance`.

Whether you are an open-source contributor interested in Discrete Global Grid Systems (DGGS), a numerical simulation enthusiast modeling conservation laws, or a graphics engineer building WebGL shaders, this guide will walk you through the architecture, testing workflow, and open extension points.

---

## 1. Quickstart & Development Setup

### Repository Information
* **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
* **Runtime**: Node.js (v18+ or v20+ recommended)
* **Language**: TypeScript (strict mode enabled)

### Local Environment Setup
Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 073 Verification Tests
All tests in Web of Life execute using TypeScript execution tools (`tsx`). Execute the Sprint 073 test suite:

```bash
npx tsx tests/sprint_073.test.ts
```

To run the full spatial topology test suite:
```bash
npx tsx tests/spatial_topology.test.ts
```

*(Note: We exclusively use Node.js and `npm`. Do not use Python package managers or test runners.)*

---

## 2. Sprint 073 Technical Deep Dive

### The Problem: Geometric Manifold Tearing & Thermodynamic Leakage
In discrete global grid systems such as H3, hexagonal and pentagonal cells partition the spherical planetary manifold ($R_{\oplus} \approx 6.371 \times 10^6 \text{ m}$). Adjacent cells $C_u$ and $C_v$ share a common boundary arc $E_{uv}$.

When boundary coordinates are independently calculated from adjacent cell polygon registries, floating-point truncation and icosahedral projections cause slight vertex dislocations:
$$P_{u, 1} \ne P_{v, 2}$$

Without an invariant assertion, this minute angular divergence $\Delta\sigma$ introduces an unclosed boundary gap $\delta L = R_{\oplus} \Delta\sigma$. Fluid, carbon, and heat advecting across this gap lead to non-physical mass and energy accumulation or loss, violating the **First Law of Thermodynamics**:

$$\sum_{\text{cells}} \Delta M \neq 0, \quad \oint_{\partial \Omega} \mathbf{J} \cdot \hat{\mathbf{n}} \, dl \neq 0$$

### The Solution: `assertBoundaryEndpointTolerance`
Sprint 073 adds `assertBoundaryEndpointTolerance` to `src/spatial/h3_adjacency.ts`. It measures great-circle central angular distance using a numerically stable Vincenty-Haversine hybrid formulation:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_A) \cos(\phi_B) \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$\Delta\sigma_{AB} = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{\max(0.0, 1.0 - a)}\right)$$

If $\Delta\sigma_{AB} > \epsilon_{\text{angular}}$ (nominal threshold: $1.0 \times 10^{-6}\text{ rad} \approx 6.37\text{ m}$; strict micro-tolerance: $1.0 \times 10^{-9}\text{ rad} \approx 6.37\text{ mm}$), the engine halts with `BoundaryEndpointToleranceExceededError`.

---

## 3. Code Walkthrough & API Usage

```typescript
import { 
  assertBoundaryEndpointTolerance, 
  BoundaryEndpointToleranceExceededError 
} from "../src/spatial/h3_adjacency";

// Radians format (default)
const endpointA: [number, number] = [0.1234567, 0.7891011];
const endpointB: [number, number] = [0.1234568, 0.7891012];

try {
  // Enforces angular distance <= 1e-6 radians
  assertBoundaryEndpointTolerance(endpointA, endpointB, 1.0e-6);
  console.log("Boundary topologically closed!");
} catch (error) {
  if (error instanceof BoundaryEndpointToleranceExceededError) {
    console.error(`Boundary gap detected: ${error.angularDistanceRad} rad`);
  }
}

// Degrees format with custom context
assertBoundaryEndpointTolerance(
  [45.000001, 10.000000],
  [45.000000, 10.000000],
  1.0e-6,
  { useDegrees: true, context: "HexCell_881f_8820_Interface" }
);
```

---

## 4. Good First Issues & Extension Opportunities

We welcome community contributions! Here are vetted entry points for your first Pull Request:

### Good First Issue 1: Antimeridian & Polar Tolerance Edge Cases
* **Difficulty**: Easy
* **File**: `tests/sprint_073.test.ts`
* **Task**: Add parameterized unit tests verifying edge-case longitude wrap-around across the International Date Line ($\lambda = \pm \pi$) and polar coordinate singularities ($\phi = \pm \frac{\pi}{2}$). Ensure that coordinates like `[Math.PI / 2, 0.1]` and `[Math.PI / 2, 2.5]` evaluate to $0.0\text{ rad}$ angular distance.

### Good First Issue 2: Automatic Boundary Healing Utility
* **Difficulty**: Medium
* **File**: `src/spatial/h3_adjacency.ts`
* **Task**: Implement `snapBoundaryEndpoints(endpointA, endpointB, toleranceRad)` which returns the spherical midpoint $(\phi_{\text{mid}}, \lambda_{\text{mid}})$ if $\Delta\sigma \le \epsilon_{\text{angular}}$, automatically reconciling minor floating-point jitter before edge metrics are computed.

---

## 5. Advanced Extension Points

### Building a New Monad: `AtmosphericMoistureFluxMonad`
Spatial transport in Web of Life is implemented using monadic pipeline operators that preserve conserved physical quantities.
1. Inspect `src/monads/SpatialFluxMonad.ts`.
2. Construct `AtmosphericMoistureFluxMonad` extending the conservative transport pipeline.
3. Hook into `validateSharedEdgeTopologicalAlignment` before computing interface cross-sectional area $A_{uv} = (R_{\oplus} \Delta\sigma_{uv}) \cdot h_{\text{layer}}$.
4. Calculate lateral vapor discharge: $Q_{uv} = v_{\perp, uv} \cdot A_{uv}$.
5. Assert $\Delta M_{\text{vapor}, u} + \Delta M_{\text{vapor}, v} = 0$.

### Building a WebGL/WebGPU Diagnostic Shader: Boundary Manifold Inspector
Visualize manifold continuity and detect boundary tearing in the 3D globe viewport:
1. Locate `src/rendering/shaders/` (WebGL / WGSL pipeline).
2. Write a fragment shader `boundary_tolerance.frag` that maps shared cell boundaries.
3. Compute the vertex displacement buffer attribute `a_endpoint_delta`.
4. Render green lines for boundaries where $\Delta\sigma \le 1.0 \times 10^{-6}\text{ rad}$, and flash pulsating red geometry if $\Delta\sigma > 1.0 \times 10^{-6}\text{ rad}$.

---

## 6. Contribution Workflow

1. Fork `https://github.com/pascalranoroarijaona/WebOfLife`.
2. Create a feature branch: `git checkout -b feature/boundary-tolerance-enhancement`.
3. Verify your changes pass type-checking and tests:
   ```bash
   npm run build
   npx tsx tests/sprint_073.test.ts
   ```
4. Submit a Pull Request referencing Sprint 073!
```

---