<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 084 Community Guide: Directional Bitmask Flux Routing in Hexagonal DGGS

Welcome to Sprint 084 of **Web of Life**! Whether you are an open-source contributor interested in discrete planetary physics, a scientific programmer working on finite-volume transport monads, or a graphics engineer building WebGL shaders for planetary visualization, this guide will get you up to speed.

---

## 1. Quickstart & Environment Setup

The repository is hosted at:
**[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)**

### Prerequisites
- Node.js (v18+ LTS recommended)
- npm (bundled with Node.js)

### Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note:** Our stack is pure TypeScript and Node.js. Do not use Python, `pip`, or `pytest`. All simulation operators and tests run directly via TypeScript execution.

### Run Sprint 084 Verification Suite
```bash
npx tsx tests/sprint_084.test.ts
```

All 5 test matrices should pass with zero failures:
1. Bitwise Disjointness & Completeness (`0x01` through `0x20`, `NONE = 0`, `ALL = 63`)
2. `BY_INDEX` constant array mapping
3. Mutation and Query helpers (`hasDirection`, `setDirection`, `clearDirection`)
4. Directional Symmetry & Reciprocity (`oppositeDirection`, `invertMask`)
5. Strict Type Integrity under TypeScript compilation

---

## 2. Sprint 084 Feature Breakdown

### What Was Shipped?
Sprint 084 introduced zero-allocation directional adjacency primitives in `src/spatial/h3_types.ts`:
- **`DirectionBitmask`** (Type: `number`): Encodes any subset of open/closed hexagonal edges as an unboxed 6-bit integer ($0 \le \mathcal{B} \le 63$).
- **`H3DirectionIndex`** (Type: `0 | 1 | 2 | 3 | 4 | 5`): Canonical indices radiating from cell centers at $60^\circ$ ($\frac{\pi}{3}\text{ rad}$) intervals.
- **`H3DirectionBitmask`** (Readonly Object): Fast, frozen bitwise constants and arithmetic operations.

### The 6-Bit Direction Basis
| Direction Index ($d$) | Semantic Axis / Orientation | Constant Name | Bit Position | Hex | Binary |
|:---------------------:|:---------------------------:|:-------------:|:------------:|:---:|:------:|
| `0` | Axis 0 (East) | `DIRECTION_0` | `1 << 0` | `0x01` | `00000001` |
| `1` | Axis 1 (North-East) | `DIRECTION_1` | `1 << 1` | `0x02` | `00000010` |
| `2` | Axis 2 (North-West) | `DIRECTION_2` | `1 << 2` | `0x04` | `00000100` |
| `3` | Axis 3 (West) | `DIRECTION_3` | `1 << 3` | `0x08` | `00001000` |
| `4` | Axis 4 (South-West) | `DIRECTION_4` | `1 << 4` | `0x10` | `00010000` |
| `5` | Axis 5 (South-East) | `DIRECTION_5` | `1 << 5` | `0x20` | `00100000` |
| Aggregate | Isolated Cell | `NONE` | `0` | `0x00` | `00000000` |
| Aggregate | Isotropic Interior | `ALL` | `(1 << 6) - 1` | `0x3F` | `00111111` |

### Key Utility Functions
```typescript
import { H3DirectionBitmask, DirectionBitmask, H3DirectionIndex } from '../src/spatial/h3_types';

// Check if direction 2 is open:
const mask: DirectionBitmask = 0b000101; // Directions 0 and 2 open
const isOpen = H3DirectionBitmask.hasDirection(mask, 2); // true

// Find the reciprocal neighbor direction (opposite edge):
const opp = H3DirectionBitmask.oppositeDirection(1); // 4 ((1 + 3) % 6)

// Invert an entire cell mask for reciprocal reflection:
const inverted = H3DirectionBitmask.invertMask(mask); // 0b101000 (Directions 3 and 5)
```

---

## 3. Why Bitmasks? The Thermodynamic & Performance Rationale

In global planetary simulations with $10^6+$ cells, checking neighbor connectivity via dynamic arrays or hash lookups causes garbage collection spikes, cache misses, and pointer dereferencing bottlenecks.

With `H3DirectionBitmask`:
1. **Zero Allocations:** Every operation runs on unboxed 32-bit integers in V8 CPU registers.
2. **Mutual Admissibility in One Instruction:** For cell $i$ transmitting to cell $j$ via edge $d$, the channel is open if and only if:
   ```typescript
   const forwardOpen = (maskI & (1 << d)) !== 0;
   const backwardOpen = (maskJ & (1 << ((d + 3) % 6))) !== 0;
   const permeable = forwardOpen && backwardOpen;
   ```
3. **First-Law Mass/Energy Conservation:** Flux across edge $d$ is multiplied by the indicator $\chi_d \in \{0, 1\}$. If either side is closed (e.g. mountain barrier, ocean-land interface), flux is strictly 0. No spurious mass creation or destruction occurs.

---

## 4. Good First Issues & Extension Points for Contributors

We are actively seeking community contributions in the following areas:

### 🌟 Issue A: WebGL Shader Barrier Visualization (Good First Issue)
- **Goal:** Render directional boundary walls and coastline barriers on the 3D globe.
- **Location:** `src/rendering/shaders/hex_barrier.vert.glsl`, `hex_barrier.frag.glsl`
- **Specification:**
  - Pack `DirectionBitmask` (0–63) into a single vertex attribute `a_barrier_mask`.
  - In the fragment/geometry shader, extract individual edge states using bitwise division:
    ```glsl
    // Check if edge d is closed in GLSL ES 3.0:
    bool isClosed(int mask, int d) {
        return ((mask >> d) & 1) == 0;
    }
    ```
  - Thicken and color edge borders where $\chi_d = 0$ to display topological barriers (mountain divides or coastline seals).

### 🌟 Issue B: `TopographicBarrierMonad` (Monad Extension Point)
- **Goal:** Generate `DirectionBitmask` sets automatically from digital elevation models (DEM) and steep slope thresholds.
- **Location:** `src/spatial/topographic_barrier_monad.ts`
- **Specification:**
  - Given an `H3StateTensor` containing elevation values for each hexagon:
  - If $\Delta z_{ij} = |z_j - z_i| > \Delta z_{\text{critical}}$, clear bit $d$ in cell $i$ and bit $(d+3)\%6$ in cell $j$.
  - Return a immutable `Map<H3Index, DirectionBitmask>` ready for `SpatialFluxMonad`.

### 🌟 Issue C: SIMD / TypedArray Packed Storage Optimization
- **Goal:** Store `DirectionBitmask` for 1,000,000 cells in a single continuous `Uint8Array`.
- **Location:** `src/spatial/h3_bitmask_buffer.ts`
- **Specification:**
  - Create a lightweight buffer wrapper providing `getMask(cellOffset)` and `setMask(cellOffset, mask)`.
  - Benchmark against `Map<H3Index, number>` using `tests/perf_bitmask.test.ts`.

---

## 5. Development Workflow & Submitting a PR

1. **Create a branch:**
   ```bash
   git checkout -b feature/barrier-monad
   ```
2. **Implement your changes** under `src/spatial/` or `src/rendering/`.
3. **Add automated tests** in `tests/sprint_084_extensions.test.ts`.
4. **Verify TypeScript compilation and test execution:**
   ```bash
   npx tsx tests/sprint_084.test.ts
   npx tsx tests/sprint_084_extensions.test.ts
   ```
5. **Open a Pull Request** at [https://github.com/pascalranoroarijaona/WebOfLife/pulls](https://github.com/pascalranoroarijaona/WebOfLife/pulls). Tag `@pascalranoroarijaona` and reference Sprint 084!
```

---