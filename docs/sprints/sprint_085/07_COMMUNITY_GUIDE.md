# Sprint 085 Contributor & Developer Guide: H3 Index Aperture Digit Extraction & Directional Flux Routing

Welcome to the contributor guide for **Sprint 085** of the **Web of Life** project! 

The Web of Life simulation engine couples non-equilibrium biophysical thermodynamics with hierarchical spatial Discrete Global Grid Systems (DGGS). In Sprint 085, we implemented `extractH3IndexApertureDigits` in `src/spatial/h3_adjacency.ts`, unlocking zero-lookup bitwise decomposition of 64-bit Uber H3 cell indices into resolution-dependent directional aperture digits.

Whether you are looking to extend our monadic state pipelines, craft high-performance WebGL shaders for hexagonal transport, or fix your first issue in open-source spatial computing, this guide has everything you need.

---

## 1. Quickstart & Development Environment

### Repository
- **Official Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Language**: TypeScript (Node.js runtime, strict ES2022+ / ESM)

### Setup Instructions
Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
All unit tests and invariant verification suites are executed via `tsx`:

```bash
# Run Sprint 085 specific tests
npx tsx tests/sprint_085.test.ts

# Run the entire test suite
npm test
```

> **Note**: This repository is pure TypeScript and Node.js. Do not use Python package managers (`pip`) or test runners (`pytest`).

---

## 2. Sprint 085 Architecture Overview

### 2.1 The Problem: Hierarchical Traversal Without State Lookups
In Uber H3's aperture-7 hexagonal system, child cells at resolution $r$ are nested inside parent cells at resolution $r - 1$. Each downward resolution step is defined by a 3-bit directional aperture digit $d_k \in \{0, 1, 2, 3, 4, 5, 6\}$:
- Digit `0`: Central co-axial hexagon (aligned with parent center).
- Digits `1` to `6`: Peripheral hexagons rotated by $\theta \approx 19.1066^\circ$.
- Digit `7`: Terminal/unused sentinel indicating resolutions $k > r$.

Previously, determining traversal paths or routing directional fluxes required recursive parent-child lookups. `extractH3IndexApertureDigits` directly decodes these digits using bitwise arithmetic on 64-bit `bigint` representations.

### 2.2 Bit Manipulation Layout
The 64-bit index bitfield is laid out as follows:
```
Bits 63      : Reserved (0)
Bits 59-62   : Mode (Mode 1 for standard H3 cells)
Bits 56-58   : Mode-dependent padding (0)
Bits 52-55   : Resolution r (0 <= r <= 15)
Bits 45-51   : Base Cell (0 <= baseCell <= 121)
Bits 42-44   : Aperture Digit 1 (Resolution 1)
Bits 39-41   : Aperture Digit 2 (Resolution 2)
...
Bits 45-3k.. : Aperture Digit k (Resolution k): shift = 45 - 3k
...
Bits 0-2     : Aperture Digit 15 (Resolution 15)
```

The mathematical extraction for any resolution $k \in \{1, \dots, 15\}$:
$$\text{shift}_k = 45 - 3k$$
$$d_k = \left( \frac{I}{2^{\text{shift}_k}} \right) \ \& \ 7 = (I \gg \text{shift}_k) \ \& \ 0\text{b}111$$

### 2.3 Core Data Contracts (`src/spatial/h3_types.ts`)
```typescript
export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface H3ApertureDecomposition {
  readonly index: bigint;
  readonly indexHex: string;
  readonly resolution: number;
  readonly baseCell: number;
  readonly activeDigits: readonly H3DirectionDigit[];
  readonly allDigits: readonly H3DirectionDigit[]; // Array of 15 elements
  readonly isValid: boolean;
}
```

---

## 3. Extension Points: Good First Issues

We have prepared beginner-friendly and intermediate-friendly tasks for contributors wanting to build new monads, spatial pipelines, or WebGL rendering shaders.

### Issue #1 (Good First Issue): Directional Displacement Vector Generator
- **Location**: `src/spatial/h3_geometry.ts`
- **Objective**: Implement a function `getApertureDirectionVector(digit: H3DirectionDigit, resolution: number): [number, number]` that outputs the normalized local 2D tangent displacement vector $(\Delta x, \Delta y)$ for a given aperture digit, taking into account the alternating Class II / Class III rotation angle ($\pm 19.1066^\circ$).
- **Difficulty**: Easy. Great introduction to H3 aperture geometry.

### Issue #2 (Monad Extension): Multi-Resolution Downscaling Monad
- **Location**: `src/spatial/spatial_flux_monad.ts`
- **Objective**: Build `ApertureDownscalingMonad<T>` that consumes an `H3ApertureDecomposition`, accepts parent-level biophysical stocks (carbon, nitrogen, phosphorus, water, thermal energy), and dispatches mass-conserved stock partitions to all 7 sub-aperture child monads such that:
  $$\sum_{d=0}^{6} M_{\text{child}}^{(d)} - M_{\text{parent}} = 0 \quad (\epsilon \le 10^{-14})$$
- **Difficulty**: Intermediate. Requires functional programming patterns and floating-point residual tracking.

### Issue #3 (WebGL Shader): Directional Sub-Aperture Flux Visualizer
- **Location**: `src/render/shaders/hex_aperture_flow.frag.glsl`
- **Objective**: Write a fragment shader that renders animated advection streamlines radiating from the central aperture ($d = 0$) toward peripheral aperture neighbors ($d \in \{1, \dots, 6\}$), encoded as a dynamic vector field matching the parsed aperture digits.
- **Difficulty**: Intermediate / Creative.

### Issue #4 (Tooling / DX): Terminal H3 Hierarchy Tree Formatter
- **Location**: `src/cli/inspect_h3.ts`
- **Objective**: Create a CLI utility that parses any H3 hex index string (e.g., `8828308281fffff`) and prints a stylized ANSI ASCII tree in the terminal displaying the base cell, active resolution, and directional aperture steps with color-coded directional paths.
- **Difficulty**: Easy.

---

## 4. How to Submit Your Contribution

1. **Fork & Branch**:
   ```bash
   git checkout -b feature/aperture-vector-lookup
   ```
2. **Implement & Test**:
   Write your logic in `src/` and accompany it with a unit test in `tests/`:
   ```bash
   npx tsx tests/sprint_085.test.ts
   ```
3. **Ensure Code Quality**:
   - Zero ESLint/TypeScript compiler errors (`npx tsc --noEmit`).
   - Strict floating-point conservation checks where mass/energy transfers are involved.
   - Immutable data structures (`Readonly<T>`, `readonly []`).
4. **Submit PR**:
   Open a pull request to `main` at `https://github.com/pascalranoroarijaona/WebOfLife` referencing your issue!
```

---