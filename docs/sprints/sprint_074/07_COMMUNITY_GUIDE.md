# Developer Onboarding & Community Guide: Sprint 074
**Topological Invariant Enforcement & `PentagonalCoordinationViolationError`**

Welcome to the Web of Life developer community! Whether you are an open-source contributor, a mathematical ecologist, or a graphics engineer interested in Discrete Global Grid Systems (DGGS), this guide will walk you through the architectural updates delivered in Sprint 074.

---

## 1. Quickstart & Local Setup

The Web of Life repository is hosted at:
👉 **[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)**

The engine is built entirely with **TypeScript** and **Node.js**.

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (Node Package Manager)

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Test Suite
Execute the targeted tests for Sprint 074 using `tsx`:
```bash
npx tsx tests/sprint_074.test.ts
```

---

## 2. Sprint 074 Architectural Overview

In Sprint 074, we addressed a fundamental topological property of discrete planetary grids: **the 12 pentagonal singularities of spherical icosahedral tessellations**.

Under Euler's polyhedral formula ($V - E + F = 2$), any geodesic hexagonal aperture-3 grid across spherical topology requires exactly 12 pentagonal cells, irrespective of resolution tier. 

- **Hexagonal cells:** Coordination degree $k = 6$ (6 neighbors).
- **Pentagonal cells:** Coordination degree $k = 5$ (5 neighbors).

Prior to this sprint, boundary truncation or traversal anomalies on pentagons could lead to silent coordination mismatches, causing discrete divergence equations ($\sum_{j \in N(c_i)} \mathbf{J}_{ij} \cdot l_{ij}$) to violate the First Law of Thermodynamics (mass-energy conservation).

### What's New in `src/spatial/h3_adjacency.ts`
We introduced the strongly-typed `PentagonalCoordinationViolationError`:

```typescript
export class PentagonalCoordinationViolationError extends Error {
  public readonly cellIndex: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;

  constructor(cellIndex: string, expectedCount: number, actualCount: number) {
    const message =
      `Pentagonal coordination violation at cell '${cellIndex}': ` +
      `expected ${expectedCount} neighbors, but found ${actualCount}.`;
    super(message);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellIndex = cellIndex;
    this.expectedCount = expectedCount;
    this.actualCount = actualCount;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

This error class provides deterministic, inspectable fail-fast behavior whenever a pentagonal cell does not strictly satisfy its $k = 5$ adjacency invariant.

---

## 3. Good First Issues for New Contributors

Looking to make your first pull request? Here are curated entry points aligned with our spatial computing roadmap:

### 🌟 Good First Issue #1: Pentagonal Cell Flagging in WebGL Viewport
- **Category:** Graphics / Shaders
- **Objective:** In our planetary WebGL renderer (`src/render/shaders/dggs_mesh.vert.glsl` and `frag.glsl`), pass an attribute `a_is_pentagon` (or derive it from cell index bits). Render the 12 pentagonal singularity cells with a distinct diagnostic pulsing halo (e.g., amber warning outline) when debug visualization mode is toggled.
- **Key Skills:** GLSL, WebGL2, TypeScript buffer serialization.

### 🌟 Good First Issue #2: Monadic Coordination Inspector Monad (`CoordinationValidationMonad`)
- **Category:** Functional Programming / Monads
- **Objective:** Extend `src/monads/` with a composable `TopologicalValidationMonad<T>` that wraps arbitrary spatial tensors, runs coordination audits across all cells, collects all `PentagonalCoordinationViolationError` instances into a non-fatal `Validation<E, A>` container, and yields a comprehensive structural diagnostic report.
- **Key Skills:** TypeScript generics, functional monads, error accumulation.

### 🌟 Good First Issue #3: Edge-Length Correction Factors for Pentagonal Duals
- **Category:** Spatial Numerics
- **Objective:** Calculate and document exact resolution-dependent metric dual boundary lengths ($l_{\text{pent}}$ vs $l_{\text{hex}}$) in `src/spatial/h3_grid.ts`. Add a unit test verifying that geodesic edge lengths around pentagons conform to the theoretical aperture ratio $l_{\text{pent}} / l_{\text{hex}} = \sqrt{3 / (5 \tan(\pi/5))}$.
- **Key Skills:** Computational geometry, unit testing with `tsx`.

---

## 4. How to Contribute

1. **Fork & Branch:** Create a branch from `main` using the format `feature/issue-<number>-description`.
2. **Implement:** Write your feature or fix in `src/`.
3. **Verify:** Run your tests via `npx tsx tests/your_test.test.ts` and verify regression passes across the repository.
4. **Pull Request:** Open a PR referencing the issue with a clear summary of changes and physical/topological impact.

Have questions? Join our discussions on GitHub Issues or submit an RFC proposal!