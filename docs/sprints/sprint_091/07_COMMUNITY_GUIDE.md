<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 091 Contributor & Onboarding Guide: H3 Aperture Classification & Hexagonal Orientation Dynamics

Welcome to Sprint 091 of the **Gaia Web of Life** engine! Whether you are joining us to build geospatial monads, author reactive WebGL compute shaders, or strengthen our discrete global grid mathematics, this guide will get you up to speed on our architecture and latest updates.

Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## 1. Quickstart & Environment Setup

The Gaia Web of Life engine is implemented entirely in **TypeScript** and runs on **Node.js** (v18+ or v20+ recommended). We use strict typing and referentially transparent functional primitives.

### Prerequisites
- Node.js (>= 18.0.0)
- npm (>= 9.0.0)

### Clone & Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 091 Verification Suite
Verify your local environment against Sprint 091 test vectors:
```bash
npx tsx tests/sprint_091.test.ts
```
*(Note: Never use `pip` or Python test runners; our build and test toolchain is pure Node.js/TypeScript).*

---

## 2. Sprint 091 Architecture: What We Built

### The Problem: Hexagonal Tilting in Aperture-7 Hierarchies
Uber's H3 Discrete Global Grid System (DGGS) recursively partitions icosahedral spherical cells using an **Aperture 7** scheme ($A(r) = A(0) / 7^r$). Because $7$ is not a collinear power, the orientation of hexagons rotates at each resolution step:
- **Even resolutions ($r = 0, 2, 4, \dots$)**: Hexagons are aligned directly with the base icosahedral triangle coordinate axes (**`CLASS_II`**, tilt $\theta = 0^\circ$).
- **Odd resolutions ($r = 1, 3, 5, \dots$)**: Hexagons rotate by $\alpha = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.10626^\circ$ (**`CLASS_III`**).

Without knowing this aperture class, spatial transport vectors $\mathbf{J}$ projected across cell boundaries $\mathbf{n}_k$ produce artificial divergence $\nabla \cdot \mathbf{J} \neq 0$ and spurious numerical entropy $\dot{S}_{\text{num}} \neq 0$.

### The Solution: `getApertureClassForResolution`
In `src/spatial/h3_adjacency.ts`, we introduced:
```typescript
export type H3ApertureClass = 'CLASS_II' | 'CLASS_III';

export function getApertureClassForResolution(res: number): H3ApertureClass {
  if (!Number.isInteger(res) || res < 0) {
    throw new RangeError(`Resolution must be a non-negative integer, received: ${res}`);
  }
  return (res % 2 === 0) ? 'CLASS_II' : 'CLASS_III';
}
```
And extended `H3AdjacencyGraph` with instance-level resolution inspection:
```typescript
export class H3AdjacencyGraph {
  public getResolutionApertureClass(resolution: number): H3ApertureClass {
    return getApertureClassForResolution(resolution);
  }
}
```

---

## 3. Extension Points & Good First Issues

We invite open-source contributors to build on top of Sprint 091 primitives! Here are three curated areas ripe for contribution.

### Good First Issue #1: WebGL Shader for Aperture-Aware Hexagonal Wireframes
- **Directory**: `src/rendering/shaders/`
- **Objective**: Author a WebGL fragment shader (`h3_grid.frag`) that dynamically visualizes hexagonal cell boundaries according to resolution parity.
- **Details**:
  - Pass resolution $r$ via uniform `uniform int u_resolution;`.
  - In vertex/fragment calculation, rotate the local hexagonal coordinates by $19.1063^\circ$ when `u_resolution % 2 == 1`.
  - Draw Class II grids with crisp cyan edge highlights (`#00e5ff`) and Class III with emerald highlights (`#00e676`).
- **Skills**: WebGL GLSL, basic trigonometry, coordinate transformations.

### Good First Issue #2: Monadic Spatial Flux Vector Projection Operator
- **Directory**: `src/monads/spatial_flux.ts`
- **Objective**: Build a typed monad wrapper `SpatialFluxMonad` that binds inter-cell mass-energy transfers.
- **Details**:
  - Consume `getApertureClassForResolution(res)` to dynamically construct the rotation matrix $\mathbf{R}(\theta)$.
  - Verify First Law conservation: ensure the sum of deltas across all 6 neighbors equals the outflow of the origin cell: $\sum_{k=0}^5 \Delta M_k + \Delta M_{\text{self}} = 0$.
  - Throw error if mass leakage exceeds floating-point tolerance ($10^{-12}$).
- **Skills**: Functional programming, TypeScript generics, conservative numerics.

### Good First Issue #3: Multi-Resolution Hierarchy Aperture Benchmark
- **Directory**: `tests/benchmarks/aperture_parity.bench.ts`
- **Objective**: Benchmark cell traversal across resolution hierarchies (res 0 to 15) using `getApertureClassForResolution`.
- **Details**:
  - Ensure zero heap allocations during pure aperture lookups.
  - Verify throughput exceeding $5 \times 10^7 \text{ ops/sec}$.
- **Skills**: Node.js performance profiling, benchmark harness authoring.

---

## 4. Contributor Workflow Checklist

1. **Fork & Branch**:
   ```bash
   git checkout -b feature/issue-title
   ```
2. **Implement Feature**:
   Follow strict functional paradigms and maintain zero side-effects in core mathematical modules.
3. **Run Typecheck & Linting**:
   ```bash
   npm run build
   ```
4. **Execute Tests**:
   ```bash
   npx tsx tests/sprint_091.test.ts
   ```
5. **Open Pull Request**: Reference your issue and describe the physical invariants preserved by your code.

Join our community and help us build a thermodynamically sound, planetary-scale simulation engine!
```

---