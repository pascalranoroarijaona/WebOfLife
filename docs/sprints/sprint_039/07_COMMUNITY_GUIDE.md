<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 039 Contributor Guide: Spatial Grid Validation & Canonical H3 Assertions

Welcome to the **Web of Life** developer community! Whether you are here to build biophysical simulation monads, write high-performance WebGL compute shaders, or strengthen our discrete geospatial grid foundations, this guide will get you up to speed with our latest architecture.

In **Sprint 039**, we introduced canonical hexadecimal pattern validation for Uber H3 Discrete Global Grid System (DGGS) cell tokens via `assertCanonicalH3Pattern(token: string): void` and the domain-specific error hierarchy (`H3ValidationError`, `SpatialGridError`).

---

## 1. Quickstart & Repository Setup

The Web of Life simulation engine is built entirely with **TypeScript** and **Node.js**.

### Clone and Install
```bash
# Clone the canonical repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies
npm install
```

### Run the Sprint 039 Test Suite
All test suites run directly with `npx tsx`:
```bash
npx tsx tests/sprint_039.test.ts
```

> **Note**: Do not use Python, `pip`, or `pytest`. The runtime environment is strictly TypeScript/Node.js.

---

## 2. Architecture Overview: The "Ghost Monad" Problem

The Web of Life engine discretizes the Earth's boundary layer into discrete hexagonal polytopes using the Uber H3 grid. Every spatial monad holds a thermodynamic state vector $\mathbf{S}_h$:

$$\mathbf{S}_h = \begin{bmatrix} C_h \\ W_h \\ N_h \\ P_h \\ O_{2,h} \\ Q_h \end{bmatrix} \in \mathbb{R}_{\ge 0}^6$$

(representing Carbon, Water, Nitrogen, Phosphorus, Oxygen, and Thermal Energy).

### Why Canonical Validation Matters
Hexagonal cell coordinates are serialized as 64-bit hexadecimal string tokens (e.g., `'8828308281fffff'`). Prior to Sprint 039, an unsanitized string (e.g., typos, invalid lengths, or non-hex characters) could enter the spatial hash map. This created **Ghost Monads**:
1. Advective and diffusive transport fluxes $\mathbf{J}_{i \to k}$ would allocate mass/energy into the malformed index $k$.
2. Because $k$ is not a valid node on the icosahedral adjacency graph, topological neighborhood queries (`getNeighbors(k)`, `kRing(k, r)`) return empty sets or throw later during flux redistributions.
3. Fluxes could never escape $k$, turning it into an unphysical black hole for mass and energy, violating the First Law of Thermodynamics ($\sum \Delta \mathbf{S} \ne 0$).

`assertCanonicalH3Pattern` acts as a zero-overhead perimeter defense at Layer 1.

---

## 3. Sprint 039 Key APIs

### `CANONICAL_H3_REGEX` & `assertCanonicalH3Pattern`
Located in `src/spatial/h3_grid.ts`:

```typescript
import { CANONICAL_H3_REGEX, assertCanonicalH3Pattern } from "../src/spatial/h3_grid";
import { H3ValidationError, SpatialGridError } from "../src/spatial/h3_types";

// Mode-1 H3 cells always start with high-nibble 8 and have 15 hexadecimal characters
// Pattern: /^8[0-9a-fA-F]{14}$/

// Example valid invocation:
assertCanonicalH3Pattern("8828308281fffff"); // Passes cleanly (returns void)

// Example invalid invocation:
try {
  assertCanonicalH3Pattern("7828308281fffff"); // Invalid mode nibble
} catch (err) {
  if (err instanceof H3ValidationError) {
    console.error(`Rejected token: ${err.token}`);
    console.error(err.message); // "Invalid canonical H3 index token '7828308281fffff'..."
  }
}
```

### Error Topology
In `src/spatial/h3_types.ts`:
```typescript
Error
 └── SpatialGridError
      └── H3ValidationError
```
- `SpatialGridError`: Root exception for geospatial anomalies.
- `H3ValidationError`: Carries `token: string` indicating the offending serialized coordinate.

---

## 4. Good First Issues for Community Contributors

We have curated several entry-level and intermediate tasks for new contributors:

### Issue #1: Fast-Path Lowercase Normalization Monad Pipeline
- **Module**: `src/spatial/h3_grid.ts`
- **Difficulty**: Good First Issue (Beginner)
- **Goal**: Add an idempotent helper `toCanonicalH3Index(token: string): CanonicalH3Index` that validates using `assertCanonicalH3Pattern(token)` and returns a branded type `CanonicalH3Index` in lowercase.
- **Verification**: Write unit tests in `tests/sprint_039_ext.test.ts` asserting case normalization and type safety.

### Issue #2: WebGL Hexagonal Cell Boundary Shader
- **Module**: `src/renderer/shaders/h3_poly_wireframe.frag` & `.vert`
- **Difficulty**: Intermediate (Graphics / Shaders)
- **Goal**: Implement a WebGL2 fragment shader rendering hexagonal borders with antialiased screen-space derivatives (`fwidth`).
- **Data Ingress**: Pass canonical H3 center coordinates and resolution uniforms to project hexagonal vertices onto the icosahedron-projected terrestrial globe.
- **Thermodynamic Coupling**: Tint cells based on thermal energy stock $Q_h$ (blue $\to$ green $\to$ red heatmap).

### Issue #3: Directional Advection Monad Operator
- **Module**: `src/monads/advection_monad.ts`
- **Difficulty**: Intermediate (TypeScript / Applied Math)
- **Goal**: Implement a monad operator `advectFlux(source: SpatialMonad, targetIndex: string, amount: ThermodynamicStocks)` that enforces:
  1. `assertCanonicalH3Pattern(targetIndex)`
  2. Adjacency verification via `H3GridAdjacency.areNeighbors(source.h3Index, targetIndex)`
  3. Conservation check $\mathbf{S}_{\text{source}} - \Delta \mathbf{S} \ge 0$
  4. Atomic mass-energy transfer ($\Delta \mathbf{S}_{\text{system}} = 0$).

---

## 5. Development Workflow & Contributing Guidelines

1. **Fork & Branch**:
   Create a descriptive branch:
   ```bash
   git checkout -b feature/h3-wireframe-shader
   ```
2. **Coding Standards**:
   - Strict TypeScript, zero `any` types.
   - Pure, deterministic, zero-allocation assertion paths where possible.
   - All spatial transformations must preserve thermodynamic invariants (mass-energy conservation deltas must equal zero).
3. **Testing**:
   Run tests before committing:
   ```bash
   npx tsx tests/sprint_039.test.ts
   ```
4. **Submitting a Pull Request**:
   - Reference the issue number.
   - Include a brief description of how your change preserves thermodynamic and spatial invariants.
   - Target the `main` branch at `https://github.com/pascalranoroarijaona/WebOfLife`.

Need help? Open an Issue or Discussion on GitHub! We look forward to your contributions.