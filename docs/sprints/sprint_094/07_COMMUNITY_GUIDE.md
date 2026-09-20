<!-- DevRel Onboarding & Contributor Guide -->

# Developer & Contributor Guide: Sprint 094
## Aperture-7 Class III Step Counter & Hierarchical Orientation Parity

Welcome to the **Web of Life** developer community! Whether you are an open-source contributor interested in Discrete Global Grid Systems (DGGS), a functional programmer working with category-theoretic monads, or a graphics engineer building WebGL compute shaders, this guide will help you understand, build, and extend the features introduced in Sprint 094.

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Component**: `src/spatial/h3_adjacency.ts` (with interfaces in `src/spatial/h3_types.ts`)
- **Runtime & Language**: Node.js (v18+) & TypeScript (Strict Mode)

---

## 1. Fast Track: Quickstart & Verification

We use Node.js and TypeScript. All packages and test runners execute natively via `npm` and `tsx`.

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (do NOT use pip or pytest)
npm install

# Run the dedicated Sprint 094 test suite
npx tsx tests/sprint_094.test.ts
```

All unit tests and thermodynamic invariance assertions should pass with 100% green status.

---

## 2. What Problem Did Sprint 094 Solve?

The Web of Life engine models planetary-scale ecological, thermodynamic, and biogeochemical dynamics over hexagonal discrete global grid systems based on Uber's H3 hierarchical aperture-7 structure.

In an aperture-7 hexagonal hierarchy, each level of resolution increases spatial density by a factor of 7 ($A_{r+1} = A_r / 7$). However, the geometry does not stay aligned:
- **Class II (Even resolutions: 0, 2, 4, 6, ...)**: Hexagon vertices and edges align symmetrically with the primary icosahedral axes.
- **Class III (Odd resolutions: 1, 3, 5, 7, ...)**: Hexagons rotate relative to their parent coordinate frame by the characteristic aperture-7 angle:
  $$\theta = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.106605^\circ \quad (0.333473172 \text{ rad})$$

When calculating directional flux vectors (e.g., wind transport, river runoff, predator migration) or composing Laplacian stencils between different scales, failure to account for this rotation leads to numerical drift, false vorticity, and thermodynamic leakage.

Sprint 094 implements a set of deterministic, $O(1)$ parity-counting functions in `src/spatial/h3_adjacency.ts`:
1. `countClassIIIApertureSteps(targetResolution, startResolution)`: Counts the exact number of odd (Class III) transitions between scales.
2. `isClassIIIResolution(resolution)`: Fast bitwise parity check (`resolution & 1 === 1`).
3. `getApertureClassProfile(targetResolution, startResolution)`: Structural diagnostic reporting Class II steps, Class III steps, total steps, and net rotation delta in radians.

---

## 3. Code Walkthrough & API Usage

```typescript
import { 
  countClassIIIApertureSteps, 
  isClassIIIResolution, 
  getApertureClassProfile 
} from '../src/spatial/h3_adjacency';

// 1. Check resolution class
console.log(isClassIIIResolution(0)); // false (Class II, aligned)
console.log(isClassIIIResolution(1)); // true  (Class III, tilted ~19.11°)
console.log(isClassIIIResolution(2)); // false (Class II, re-aligned)

// 2. Count Class III transitions from base (resolution 0)
console.log(countClassIIIApertureSteps(5)); // 3 (odd steps: 1, 3, 5)

// 3. Count Class III transitions across an arbitrary interval
console.log(countClassIIIApertureSteps(5, 2)); // 2 (odd steps: 3, 5)
console.log(countClassIIIApertureSteps(2, 5)); // 2 (symmetric invariant)

// 4. Inspect full profile including net angular rotation
const profile = getApertureClassProfile(3, 1);
console.log(profile);
/*
{
  startResolution: 1,
  targetResolution: 3,
  classIIISteps: 1,
  classIISteps: 1,
  totalSteps: 2,
  isTargetClassIII: true,
  netOrientationDeltaRad: 0 // Both start and target are Class III, so net relative delta is 0!
}
*/
```

---

## 4. Extension Points for Contributors

### Extension Point A: Building New Monads (`SpatialFluxMonad`)
When writing new monads in `src/monads/`, you often need to lift state tensors across spatial resolutions.
- **Hook**: Use `getApertureClassProfile` to construct a 2D rotation matrix $\mathbf{R}(\Delta \phi)$ before applying convolution or restriction operators.
- **Invariant**: Mass and thermal enthalpy must be strictly conserved ($\Delta M = 0$, $\Delta E = 0$).

Example template for an aperture-aware flux transformer:
```typescript
import { getApertureClassProfile } from '../spatial/h3_adjacency';

export class ApertureFluxTransformer {
  static computeRotationMatrix(startRes: number, targetRes: number): [number, number, number, number] {
    const profile = getApertureClassProfile(targetRes, startRes);
    const rad = profile.netOrientationDeltaRad;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Returns 2x2 rotation matrix elements [cos, -sin, sin, cos]
    return [cos, -sin, sin, cos];
  }
}
```

### Extension Point B: WebGL & WebGPU Shaders
In real-time visualization of biospheric stocks, directional arrows and neighbor interpolation kernels must tilt depending on the active zoom resolution.
- **Shader Uniforms**: Pass `u_orientationAngle` computed via `getApertureClassProfile(currentRes).netOrientationDeltaRad`.
- **GLSL Vertex Transformation**:
```glsl
uniform float u_orientationAngle; // 0.0 or +0.333473 rad

vec2 rotateHexVertex(vec2 vertexPos, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(vertexPos.x * c - vertexPos.y * s, vertexPos.x * s + vertexPos.y * c);
}
```

---

## 5. "Good First Issues" for External Contributors

We welcome contributions! Below are three well-scoped issues ready for implementation:

### Issue #GFI-094-1: Vectorized Rotation Matrix Helper in `H3DirectionalKernel`
- **Scope**: Add a helper method `H3DirectionalKernel.getBasisRotation(resA: number, resB: number)` that returns a Float32Array containing the 2D transformation matrix.
- **Files**: `src/spatial/h3_directional_kernel.ts`, `tests/test_h3_kernel_rotation.ts`.
- **Requirements**:
  - Validates resolutions in range $[0, 15]$.
  - Uses `getApertureClassProfile` under the hood.
  - Returns `new Float32Array([cos, -sin, sin, cos])`.
  - Add unit tests with `npx tsx tests/test_h3_kernel_rotation.ts`.

### Issue #GFI-094-2: WebGL Hexagonal Wireframe Shader Alignment
- **Scope**: Update the WebGL hexagonal grid rendering shader in `src/rendering/shaders/hex_grid.vert` to accept an integer `u_resolution` and dynamically apply $\pm 19.1066^\circ$ vertex rotation when `(u_resolution & 1) == 1`.
- **Files**: `src/rendering/shaders/hex_grid.vert`, `src/rendering/hex_renderer.ts`.
- **Requirements**:
  - Zero performance regression in frame render time.
  - Hexagon outlines must align seamlessly when transitioning between resolution levels.

### Issue #GFI-094-3: Benchmark Suite for High-Throughput DGGS Queries
- **Scope**: Create a micro-benchmark testing `countClassIIIApertureSteps` and `getApertureClassProfile` throughput over $10^7$ iterations.
- **Files**: `benchmarks/bench_h3_parity.ts`.
- **Requirements**:
  - Measure ops/sec and memory allocations.
  - Run via `npx tsx benchmarks/bench_h3_parity.ts`.

---

## 6. How to Submit Your Pull Request

1. **Fork and Branch**: Create a branch off `main` with the naming format `feat/your-feature-name` or `fix/issue-description`.
2. **Coding Standards**: Ensure TypeScript strict mode passes with no `any` types.
3. **Tests**: Add test coverage for all new branches in `tests/`. Verify with:
   ```bash
   npx tsx tests/sprint_094.test.ts
   npm test
   ```
4. **Pull Request**: Submit your PR to `https://github.com/pascalranoroarijaona/WebOfLife` referencing the relevant issue. Our team reviews PRs within 48 hours!
```

---