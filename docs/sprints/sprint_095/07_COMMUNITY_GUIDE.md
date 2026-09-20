<!-- DevRel Onboarding & Contributor Guide -->
# Developer & Contributor Guide: Sprint 095
## Hierarchical Aperture-7 Class III Coordinate Rotation & Spatial Flux Alignment

Welcome to the **Web of Life** developer community! In Sprint 095, we introduced rigorous spatial rotation primitives for Discrete Global Grid Systems (DGGS) using Aperture-7 hexagonal hierarchies (Uber H3).

This guide walks you through the architectural mechanics of resolution transitions, demonstrates how to test and extend these primitives, and highlights exciting "Good First Issues" across monads and WebGL shaders.

---

## 1. Quickstart & Local Setup

The **Web of Life** simulation engine is written in pure TypeScript on Node.js.

### Clone & Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Run Sprint 095 Test Suite
Verify that the coordinate transformation tests pass out of the box:
```bash
npx tsx tests/sprint_095.test.ts
```

---

## 2. Feature Deep Dive: Aperture-7 Class III Rotations

### Why Coordinate Rotation Matters
When simulating planetary thermodynamics (heat transport, hydrological flow, carbon dynamics) on discrete hexagonal grids, H3 partitions space using an **Aperture-7** hierarchy (each parent hexagon subdivides into 7 child hexagons).

Hexagonal grids alternate topological alignment between resolutions:
- **Class II (Even Resolutions: 0, 2, 4, ...)**: Hexagon vertices align with base icosahedral axes.
- **Class III (Odd Resolutions: 1, 3, 5, ...)**: Hexagons undergo a counter-rotation offset:
  $$\theta_{\text{ap7}} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.3334731722918321 \text{ radians } (\approx 19.106605^\circ)$$

If vector fluxes (such as wind velocity or dissolved nutrient flux $\mathbf{J}$) are transferred across cells of different resolutions without accounting for this rotation, artificial divergence and spurious entropy generation occur, violating the First and Second Laws of Thermodynamics.

### Core API in `src/spatial/h3_adjacency.ts`

```typescript
import {
  APERTURE_7_ROTATION_RAD,
  countClassIIIApertureSteps,
  computeClassIIIRotationAngleRadians
} from './src/spatial/h3_adjacency';

// 1. Fundamental rotation constant
console.log(APERTURE_7_ROTATION_RAD); // 0.3334731722918321

// 2. Count signed Class III steps between resolutions
const steps = countClassIIIApertureSteps(0, 3);
console.log(steps); // +2 (transitions into res 1 and res 3)

// 3. Compute rotation angle in radians (normalized to [-PI, PI))
const angle = computeClassIIIRotationAngleRadians(0, 3);
console.log(angle); // 0.6669463445836642 rad (~38.21 deg)

// Antisymmetry holds:
const reverseAngle = computeClassIIIRotationAngleRadians(3, 0);
console.log(reverseAngle); // -0.6669463445836642 rad
```

---

## 3. Extension Architecture: `SpatialFluxMonad`

Flux operations across multi-resolution boundaries are encapsulated via `SpatialFluxMonad` (`src/spatial/spatial_flux_monad.ts`). The monad ensures orthogonal $\mathrm{SO}(2)$ rotation without altering vector magnitude:

```typescript
import { SpatialFluxMonad, Vector2D } from './src/spatial/spatial_flux_monad';

const rawFlux: Vector2D = { x: 10.0, y: 0.0 }; // e.g. 10 kg/(m*s) advective moisture flux
const sourceMonad = SpatialFluxMonad.of(0, rawFlux, cellStocks);

// Project flux to child resolution 1:
const childMonad = sourceMonad.alignToResolution(1);
console.log(childMonad.getFluxVector());
// Result is orthogonally rotated by +0.333473 rad; ||J|| remains exactly 10.0!
```

---

## 4. Good First Issues & Extension Points

We actively welcome contributions! Here are targeted areas where you can jump in:

### Issue #1 (Monads): Implement `MultiResolutionDiffusionMonad`
- **Location**: `src/spatial/monads/diffusion_monad.ts`
- **Task**: Create a monad that computes second-order spatial laplacians $\nabla^2 \phi$ across cells where neighbors reside at different H3 resolutions.
- **Key Requirement**: Use `computeClassIIIRotationAngleRadians(r_src, r_target)` to align the gradient vector before applying the diffusion tensor $\mathbf{D}$. Ensure trace invariance $\mathrm{Tr}(\mathbf{D}') = \mathrm{Tr}(\mathbf{D})$.

### Issue #2 (WebGL Shaders): Hexagonal Class III Grid Alignment Shader
- **Location**: `src/rendering/shaders/h3_grid.vert.glsl` & `h3_grid.frag.glsl`
- **Task**: Add uniform `uniform float u_apertureRotationAngle;` passed from `computeClassIIIRotationAngleRadians` to rotate UV coordinates in vertex shaders when rendering procedural hexagonal terrain overlays.
- **Key Requirement**: Ensure bilinear anti-aliasing along rotated hexagon boundaries without pixel shimmering during zoom cascades.

### Issue #3 (Validation): Edge-Case Fuzz Testing for Resolution Bounds
- **Location**: `tests/spatial_fuzz.test.ts`
- **Task**: Expand test coverage with property-based testing (e.g., using `fast-check`) verifying that for all integer pairs $(r_1, r_2) \in [0, 15]^2$, the relation $\Theta(r_1, r_2) + \Theta(r_2, r_1) \equiv 0$ holds within machine epsilon ($10^{-15}$).

---

## 5. Development Workflow & Guidelines

1. **Branch Naming**: `feat/issue-number-short-description` or `fix/issue-number-short-description`.
2. **Type Safety**: Strictly typed TypeScript with `noImplicitAny` and strict null checking.
3. **Physical Invariants**: Any PR touching mass or energy transformations must maintain conservation checks:
   ```typescript
   if (Math.abs(normBefore - normAfter) > 1e-12) {
     throw new Error("First Law violation: Vector magnitude altered during transformation");
   }
   ```
4. **Verification**: Always run `npm test` or `npx tsx tests/<test_file>.test.ts` before opening your pull request.

Join our discussions on [GitHub Discussions](https://github.com/pascalranoroarijaona/WebOfLife/discussions) and happy coding!
```

---