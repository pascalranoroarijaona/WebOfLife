<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 089 Contributor Guide: Aperture Inspection & Hierarchical DGGS Kinematics

Welcome to **WebOfLife** Sprint 089! In this release, we've extended the spatial kinematics sub-engine with zero-allocation bitmask predicates for hierarchical H3 Discrete Global Grid System (DGGS) cells: `hasNonZeroApertureDigits`, `getApertureDigitAt`, and `getFirstNonZeroApertureResolution`.

Whether you are looking to build monadic thermodynamic pipelines or author WebGL geodesic shaders, this guide will get you set up and contributing in minutes.

---

## 1. Quickstart & Local Setup

Our project is strictly built on **TypeScript and Node.js**. No external runtime environments or non-JS package managers are required.

### 1.1 Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 1.2 Verify the Sprint Test Suite
To run the automated verification suite for Sprint 089:
```bash
npx tsx tests/sprint_089.test.ts
```

All tests run via `tsx` directly against native TypeScript source code under `src/spatial/`.

---

## 2. What Shipped in Sprint 089?

In H3 hierarchical aperture-7 tessellations, every cell between resolution $1$ and $15$ has a sequence of 3-bit directional aperture digits ($d_k \in \{0, \dots, 6\}$):
- $d_k = 0$: The concentric child (shares the exact center and orientation with its ancestor base cell).
- $d_k \in \{1, \dots, 6\}$: Peripheral child hexagon rotated by the characteristic aperture angle ($\theta_{\text{aperture}} \approx 19.1066^\circ$).

### Core Predicate: `hasNonZeroApertureDigits`
Located in `src/spatial/h3_adjacency.ts`, this evaluates whether any active aperture digit $d_k$ is non-zero using pure bitwise arithmetic in $\mathcal{O}(1)$ time:

```typescript
import { hasNonZeroApertureDigits, getApertureDigitAt } from './src/spatial/h3_adjacency';

// Concentric child cell (all aperture digits are 0 up to active resolution)
const concentricCell = "0x852800000000000";
console.log(hasNonZeroApertureDigits(concentricCell)); // false

// Peripheral child cell (digit d_1 = 3)
const peripheralCell = "0x852830000000000";
console.log(hasNonZeroApertureDigits(peripheralCell)); // true
console.log(getApertureDigitAt(peripheralCell, 1));     // 3
```

---

## 3. Good First Issues & Extension Opportunities

Looking to submit your first Pull Request? Here are curated opportunities spanning Monad design and WebGL visual computing.

### 🚀 Issue #1: WebGL Aperture Shear Fragment Shader (`src/render/shaders/aperture_flow.frag.glsl`)
- **Domain:** WebGL2 / Fragment Shaders / GPU Geodesics
- **Task:** Build a fragment shader visualizing multi-scale mass coarsening across aperture-7 tiles.
  - Uniforms: `uniform int u_activeResolution;`, `uniform float u_time;`
  - Input: Cell coordinate and integer bitmask encoded via `usampler2D`.
  - Shader Logic: Color concentric cells ($d_k = 0$) with stationary laminar stream lines, and non-concentric cells with rotating shear vortices computed from $\theta_{\text{aperture}} \approx 0.333473\text{ rad}$.

### 🚀 Issue #2: Reactive Monadic Lens for Boundary Influx (`src/monads/geodesic_lens.ts`)
- **Domain:** Monadic Geodesy / Category Theory
- **Task:** Implement a monadic lens `ApertureFilterMonad<T>` that wraps spatial patches and dynamically redirects thermodynamic flux along concentric geodesic axes when `hasNonZeroApertureDigits(h) === false`, eliminating shear dissipation recalculations.
- **Constraints:** Strict First Law compliance ($\sum \Delta M = 0$, $\sum \Delta H = 0$).

### 🚀 Issue #3: Aperture Bitfield Unpacking Benchmark
- **Domain:** Performance & Microbenchmarking
- **Task:** Benchmark `hasNonZeroApertureDigits` against 1,000,000 synthetic random H3 indices using `benchmark.ts` to confirm sub-nanosecond $\mathcal{O}(1)$ execution and zero heap allocations.

---

## 4. Contributor Workflow

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feature/aperture-shear-shader
   ```
2. Implement your module or shader under `src/`.
3. Add unit tests under `tests/` covering:
   - Base cells ($r = 0$).
   - Boundary resolution levels ($r = 1$ and $r = 15$).
   - Mass and enthalpy conservation invariants ($\Delta S \ge 0$, $\Delta M = 0$).
4. Run test validation:
   ```bash
   npx tsx tests/sprint_089.test.ts
   ```
5. Open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).