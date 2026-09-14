<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 037 Contributor Guide: Canonical 15-Character Hexadecimal H3 Index Validation & Thermodynamic Spatial Routing

Welcome to the **Web of Life** open-source planetary biosphere simulation engine! Whether you are interested in discrete global grid systems (DGGS), functional programming monads, thermodynamic conservation physics, or high-performance WebGL compute and visualization shaders, Sprint 037 establishes an essential foundation for our spatial architecture.

This guide will walk you through the core changes introduced in Sprint 037, demonstrate how to set up your TypeScript/Node.js environment, explain our spatial-thermodynamic invariant architecture, and highlight curated **Good First Issues** for new contributors.

---

## 1. Quickstart & Environment Setup

The Web of Life simulation engine is built natively with **TypeScript** and **Node.js**. We do not use Python or external binary packages for grid routing.

### 1.1 Clone the Repository

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
```

### 1.2 Install Dependencies

Ensure you have Node.js (v18.0.0+ recommended) and npm installed:

```bash
npm install
```

### 1.3 Verify Sprint 037 Test Suite

Execute the dedicated test suite for Sprint 037 using `npx tsx`:

```bash
npx tsx tests/sprint_037.test.ts
```

All test vectors (including resolution tests, pattern validation, branded type checks, and conservation invariance tests) should pass with zero exit codes.

---

## 2. Sprint 037 Feature Deep Dive

### 2.1 The Problem: Spatial Key Fragmentation & Energy Leaking
In the Web of Life simulation, Earth is discretized into millions of hexagonal control volumes using Uber's Hierarchical Hexagonal Spatial Index (H3). Each cell holds conserved physical quantities:
- Water mass $M_w$ ($\text{kg}$)
- Carbon stocks $M_c$ ($\text{kg}$)
- Mineral stocks $M_m$ ($\text{kg}$)
- Molecular oxygen $M_{O_2}$ ($\text{kg}$)
- Thermal internal energy $U$ ($\text{J}$)

Previously, cell indices were handled as unconstrained strings. This introduced three critical risks:
1. **Case Mismatches & Dictionary Fragmentation**: `"8826856235fffff"` vs `"8826856235FFFFF"` generated duplicate control volumes in `Map<string, EarthPod>`, causing phantom storage and broken flux accounting.
2. **Malformed or 16-Digit Padded Strings**: A standard 64-bit integer formatted as 16 hexadecimal digits includes a redundant leading zero (`"08826856235fffff"`), whereas canonical H3 string notation omits it because bit 63 is always 0.
3. **Violations of the First and Second Laws**: Advecting mass or heat into an invalid spatial string meant extensive stocks were dropped into unallocated memory, violating mass and energy conservation ($\Delta M \neq 0$).

### 2.2 The Solution: `H3_CANONICAL_INDEX_PATTERN` & Branded Types
Sprint 037 formalizes the canonical 15-character hexadecimal index specification:

1. **Deterministic Regular Expression** (`src/spatial/h3_grid.ts`):
   ```typescript
   export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
   ```
2. **Branded Nominal Typing** (`src/spatial/h3_types.ts`):
   ```typescript
   declare const CanonicalH3Brand: unique symbol;

   export type CanonicalH3Index = string & {
     readonly [CanonicalH3Brand]: true;
   };
   ```
3. **Runtime Guard & Assertion Pipeline** (`src/spatial/h3_grid.ts`):
   ```typescript
   export function isValidH3CanonicalIndex(index: string): index is CanonicalH3Index {
     if (typeof index !== 'string' || index.length !== 15) {
       return false;
     }
     return H3_CANONICAL_INDEX_PATTERN.test(index);
   }

   export function assertCanonicalH3Index(index: string): CanonicalH3Index {
     if (!isValidH3CanonicalIndex(index)) {
       throw new RangeError(
         `Invalid H3 canonical index: "${index}". Must match canonical 15-character hexadecimal pattern: ${H3_CANONICAL_INDEX_PATTERN.source}`
       );
     }
     return index.toLowerCase() as CanonicalH3Index;
   }
   ```

### 2.3 Bitfield Geometry: Why 15 Characters?
An H3 index is a 64-bit bitfield:
- **Bit 63**: Reserved (fixed to 0)
- **Bits 59–62**: Mode (1 for standard hexagonal cells: binary `0001`)
- **Bits 56–58**: Edge / child modes
- **Bits 52–55**: Resolution ($0 \le r \le 15$)
- **Bits 45–51**: Base cell identifier ($0 \le b \le 121$)
- **Bits 0–44**: Hierarchical directional aperture path

Because bit 63 is zero and standard cell mode is 1, the most significant nibble (bits 60–63) is `0001_2 = 1_{16}`. There is no zero nibble at the front. Thus, stringified standard H3 cell indices have **exactly 15 hexadecimal characters**.

---

## 3. Architecture & Monadic Integration

Spatial control volumes are encapsulated using functional structures such as `SpatialCellMonad` (`src/monads/spatial_monad.ts`). The monad enforces that:
- Every cell address is a validated `CanonicalH3Index`.
- Transformations preserve stock non-negativity: $\min(M_w, M_c, M_m, M_{O_2}, U) \ge 0$.
- Pairwise transfers enforce zero mass divergence ($\sum \Delta M_i + \sum \Delta M_j = 0$).

```typescript
import { SpatialCellMonad, executeAdvectiveTransfer } from '../src/monads/spatial_monad';

// 1. Instantiate monadic cells with canonical addresses
const cellA = SpatialCellMonad.unit("8826856235fffff", {
  waterKg: 1000.0,
  carbonKg: 50.0,
  mineralKg: 20.0,
  oxygenKg: 210.0,
  thermalEnergyJoules: 3.1e8,
});

const cellB = SpatialCellMonad.unit("8826856235dffff", {
  waterKg: 500.0,
  carbonKg: 25.0,
  mineralKg: 10.0,
  oxygenKg: 105.0,
  thermalEnergyJoules: 1.5e8,
});

// 2. Execute conservative transfer
const { source, target, transferred } = executeAdvectiveTransfer(cellA, cellB, {
  deltaWaterKg: 100.0,
  deltaCarbonKg: 5.0,
  deltaMineralKg: 2.0,
  deltaOxygenKg: 21.0,
  deltaEnergyJoules: 3.1e7,
});

console.log(`Transferred ${transferred.deltaWaterKg} kg water without leakage!`);
```

---

## 4. Good First Issues for External Contributors

We welcome contributions! Below are curated entry points across functional monads and WebGL graphics.

### Issue #1: `SpatialMonad.traverse` Array Combinator
- **Domain**: Functional TypeScript / Category Theory
- **Difficulty**: Starter / Good First Issue
- **Files**: `src/monads/spatial_monad.ts`, `tests/spatial_monad.test.ts`
- **Goal**: Implement a `traverse` or `sequence` utility that accepts an array of raw strings and initial stocks, returning a `SpatialCellMonad[]` if all addresses match `isValidH3CanonicalIndex`, or collecting validation errors without partial allocation.
- **Key Requirement**: Ensure short-circuiting or aggregated error reporting on invalid 15-char H3 strings.

### Issue #2: WebGL Instanced Hexagon Buffer Validation & Uniform Packing
- **Domain**: WebGL 2.0 / GPU Pipelines
- **Difficulty**: Intermediate
- **Files**: `src/rendering/shaders/hex_grid.vert.glsl`, `src/rendering/h3_buffer_builder.ts`
- **Goal**: WebGL shaders need H3 cell coordinates packed into attribute buffers. Since GPUs cannot natively parse 15-character hex strings in GLSL, write a TypeScript builder that decomposes a `CanonicalH3Index` into two `uvec2` uniforms (high 32 bits and low 32 bits) and verifies them against `H3_CANONICAL_INDEX_PATTERN` before upload to the GPU buffer.
- **Key Requirement**: Throw explicit descriptive errors if non-canonical strings reach the WebGL buffer pipeline.

### Issue #3: Hexagonal Advection Boundary Dissipation Fragment Shader
- **Domain**: WebGL Shaders / GLSL
- **Difficulty**: Intermediate
- **Files**: `src/rendering/shaders/hex_flux.frag.glsl`
- **Goal**: Build a fragment shader visualizing inter-cell advective flux $\mathbf{J}_{i \to j}$ along the edges between adjacent H3 hexagons. The shader should sample scalar moisture and carbon densities and render smooth directional gradients across cell borders $\Gamma_{ij}$.
- **Key Requirement**: The shader should use edge weights proportional to the Courant-Friedrichs-Lewy (CFL) advective transfer velocity.

### Issue #4: Hex Neighbor Ring Cache with Canonical Keys
- **Domain**: Spatial Indexing / Caching
- **Difficulty**: Good First Issue
- **Files**: `src/spatial/h3_grid.ts`, `tests/sprint_037.test.ts`
- **Goal**: Implement an LRU cache `H3NeighborhoodCache` keyed strictly by `CanonicalH3Index`. When computing `kRing(origin, radius)`, the cache should store and return canonical lowercase keys, avoiding redundant regex checks across tight simulation loops.

---

## 5. Extension Points: How to Build New Modules

### 5.1 Extending Monads
If you are developing a new physical domain monad (e.g., `AtmosphericChemistryMonad` or `SoilNutrientMonad`):
1. Import `CanonicalH3Index` and `assertCanonicalH3Index` from `src/spatial/h3_grid`.
2. Ensure the state type is immutable.
3. Validate domain conservation invariants (e.g., mass sum, charge neutrality) inside `.bind()`.
4. Add unit tests covering nominal boundary conditions.

### 5.2 Extending WebGL Shaders
When creating WebGL visualization layers for global climate fields:
1. Locate GLSL source files in `src/rendering/shaders/`.
2. Ensure attribute locations and uniform buffers mirror the data structures generated in `src/spatial/`.
3. Use linear color spaces for physically accurate rendering of thermal energy $U$ and water mass $M_w$.

---

## 6. Contribution Workflow & PR Checklist

1. **Fork & Branch**:
   ```bash
   git checkout -b feature/issue-title-canonical-h3
   ```
2. **Write Unit Tests First**:
   Add test coverage under `tests/` demonstrating both valid scenarios and invalid edge cases (e.g., empty strings, whitespace, 14-char or 16-char strings).
3. **Run Linting & Tests**:
   ```bash
   npx tsx tests/sprint_037.test.ts
   npm test
   ```
4. **Thermodynamic Guard Compliance**:
   Confirm that your PR introduces no floating-point mass leaks, unhandled NaNs, or unnormalized spatial keys.
5. **Open a Pull Request**:
   Submit your PR to `https://github.com/pascalranoroarijaona/WebOfLife` referencing the relevant issue number!

---

## 7. Community Channels & Resources

- **GitHub Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **RFC Directory**: `docs/sprints/`
- **Issue Tracker**: Tag your PRs with `good first issue` or `spatial-grid`.

Thank you for contributing to open-source planetary science and mathematical modeling in the Web of Life!