<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 083 Developer Onboarding: Pentagon Directional Topology

Welcome to the contributor guide for Sprint 083 of the **Web of Life** project!

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Tech Stack**: TypeScript, Node.js, WebGL2
- **Core Domain**: Geodesic spatial simulation, non-equilibrium thermodynamics, discrete global grid systems (H3).

In this sprint, we introduced foundational topological contracts in `src/spatial/h3_types.ts`: `H3Direction` and `PentagonDirectionalTopology`. This document explains why these interfaces exist, how they protect our simulation against thermodynamic mass drift, and how you can get started contributing.

---

## 1. Architectural & Physical Motivation

In any geodesic discrete global grid system derived from an icosahedron (such as Uber's H3 aperture-3 grid), Euler's polyhedral formula ($V - E + F = 2$) mandates that a closed spherical surface cannot be tiled exclusively by regular hexagons. At every discrete resolution, there are **exactly 12 topologically non-hexagonal (pentagonal) cells**:

$$|\mathcal{P}_r| = 12 \quad \forall r \ge 0$$

- Regular hexagons have **valence 6** (6 directional adjacent neighbors: indices `1..6`).
- Pentagonal cells have **valence 5** (5 directional adjacent neighbors).

In canonical H3 coordinate space, every pentagon has one direction along which no neighboring facet exists. If our discrete spatial calculus operators (such as mass diffusion, advection, or moisture flow) naively attempt to route stocks across all 6 directions on a pentagon, mass leaks into an unmapped coordinate buffer. This directly violates the **First Law of Thermodynamics** (Conservation of Mass and Energy, $\nabla \cdot \vec{J}_M = 0$).

Sprint 083 formalizes the directional topology of pentagons:
```typescript
export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;

export interface PentagonDirectionalTopology {
  readonly presentDirections: readonly H3Direction[];
  readonly omittedDirection: H3Direction;
}
```

---

## 2. Getting Started (Local Setup)

Clone the repository and install dependencies using Node.js and npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 083 Tests
Execute the test suite using `npx tsx`:

```bash
npx tsx tests/sprint_083.test.ts
```

All tests should pass, validating:
1. Invariant completeness: `presentDirections.length === 5`.
2. Disjointness: `presentDirections` does not contain `omittedDirection`.
3. Set union: `presentDirections ∪ {omittedDirection} = {1, 2, 3, 4, 5, 6}`.
4. Flux guard: Attempting to route mass across `omittedDirection` throws a thermodynamic guard error.

---

## 3. How to Use the New Types

Import the types from `src/spatial/h3_types.ts`:

```typescript
import { H3Direction, PentagonDirectionalTopology } from '../src/spatial/h3_types';

const examplePentagonTopology: PentagonDirectionalTopology = {
  presentDirections: [1, 2, 3, 4, 5] as const,
  omittedDirection: 6,
};
```

When writing spatial transport logic, always check if the cell is a pentagon. If it is, restrict your directional flux iteration strictly to `presentDirections`:

```typescript
for (const dir of topology.presentDirections) {
  // Safe: compute advective/diffusive transport
  const flux = computeFluxAlongFacet(cell, dir);
  applyFlux(cell, dir, flux);
}
// Dir 6 is omitted; flux along omittedDirection is strictly 0.
```

---

## 4. "Good First Issues" & Contributor Extension Points

We are actively seeking open-source contributors to expand our spatial transport and rendering pipelines. Here are three curated extension points:

### Issue #1: Implement `PentagonFluxMonad` Advection Guard (Monad Extension)
- **Goal**: Implement a functional monad that wraps pentagon stock state updates and asserts conservation invariants ($\sum \Delta \vec{S} = 0$).
- **File**: `src/spatial/pentagon_flux_monad.ts`
- **Skills**: TypeScript, Functional Programming, Linear Algebra.
- **Acceptance Criteria**:
  - Rejects any flux along `omittedDirection` at runtime.
  - Passes 100% of unit tests verifying mass conservation to $10^{-14}$ precision.

### Issue #2: WebGL Singular Cell Boundary Shader Indicator (Shader Extension)
- **Goal**: Render the 12 pentagonal cells and visually highlight the missing facet in the WebGL globe renderer.
- **File**: `src/renderer/shaders/pentagon_boundary.frag` & `src/renderer/shaders/pentagon_boundary.vert`
- **Skills**: WebGL2, GLSL, 3D Coordinate Transformations.
- **Acceptance Criteria**:
  - Draw pentagon borders in gold/amber.
  - Draw a subtle dotted red normal vector indicating the omitted directional facet orientation.

### Issue #3: H3 Adjacency Pre-computation Cache (Performance Enhancement)
- **Goal**: Precompute and freeze `PentagonDirectionalTopology` lookup tables for all 12 pentagons across resolutions 0 to 6.
- **File**: `src/spatial/h3_adjacency_cache.ts`
- **Skills**: TypeScript, Data Structures, Benchmarking.
- **Acceptance Criteria**:
  - $O(1)$ constant-time lookup for pentagon topology.
  - Zero heap allocation during simulation tick step.

---

## 5. Submitting Your Contribution

1. Fork `https://github.com/pascalranoroarijaona/WebOfLife`.
2. Create a feature branch: `git checkout -b feature/pentagon-flux-guard`.
3. Add unit tests in `tests/` and run them via `npx tsx tests/<test_file>.ts`.
4. Ensure TypeScript type checking passes without errors (`npx tsc --noEmit`).
5. Open a Pull Request referencing the issue number!
```

---