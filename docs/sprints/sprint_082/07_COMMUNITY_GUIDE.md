<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 082 Contributor Guide: Pentagonal Coordination Validation in Discrete Global Grid Systems

Welcome to the **WebOfLife** open-source contributor community! Whether you are a computational geometer, thermodynamicist, or frontend WebGL graphics hacker, this guide will walk you through our latest topological milestone in Sprint 082 and show you how to build your first contribution.

---

## 1. Executive Overview: The 12 Pentagons of Earth

Our planetary biosphere simulation runs on discrete global grid systems (DGGS) using Uber's H3 hierarchical spatial index. Because Earth is topologically a 2-sphere ($\mathbb{S}^2$), Euler's polyhedron formula ($V - E + F = 2$) mathematically guarantees that **no spherical hexagonal mesh can exist without exactly 12 pentagonal cells** at every resolution:

$$\sum_{i} (6 - i) F_i = 12 \implies F_5 = 12$$

Standard cells have 6 neighbors ($z = 6$). Pentagonal cells have strictly 5 neighbors ($z = 5$). 

In Sprint 082, we introduced `validatePentagonalNeighborCount` and `PentagonalCoordinationViolationError` in `src/spatial/h3_adjacency.ts`. This runtime invariant prevents phantom mass/energy injection or leakage in downstream biogeochemical flux operators.

---

## 2. Quickstart: Setting Up Your Dev Environment

The WebOfLife engine is written entirely in TypeScript running on Node.js.

### 2.1 Clone & Install
```bash
# Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (strictly Node.js & npm)
npm install
```

### 2.2 Verify Sprint 082 Implementation
Run the Sprint 082 test suite directly with `npx tsx`:
```bash
npx tsx tests/sprint_082.test.ts
```

All tests should pass, confirming that pentagonal neighbor arrays with $\neq 5$ elements deterministically throw `PentagonalCoordinationViolationError`.

---

## 3. Core Architecture: `src/spatial/h3_adjacency.ts`

Here is how the validation works under the hood:

```typescript
import { PentagonalCoordinationViolationError, validatePentagonalNeighborCount } from './spatial/h3_adjacency';

// Example: Validating an H3 pentagon's neighbor list
const pentagonId = '8049fffffffffff'; // H3 Resolution 0 Pentagon
const neighbors = ['801dfffffffffff', '802bfffffffffff', '8037fffffffffff', '8051fffffffffff', '8069fffffffffff'];

// Passes silently:
validatePentagonalNeighborCount(neighbors, pentagonId);

// Hexagonal allocation or corrupted array (length !== 5) throws:
const invalidNeighbors = [...neighbors, 'phantom_cell_id'];
validatePentagonalNeighborCount(invalidNeighbors, pentagonId); 
// => Throws PentagonalCoordinationViolationError: 
//    "Pentagonal coordination violation for cell 8049fffffffffff: expected exactly 5 neighbors, but received 6."
```

### Why This Matters for Thermodynamic Monads
When diffusive tracer flux $\mathbf{\Phi}_{pk} = -D \frac{L_{pk}}{d_{pk}}(\mathbf{C}_k - \mathbf{C}_p)$ is summed across neighbor boundaries, evaluating a 6th non-existent neighbor creates unphysical stocks of carbon, water, or energy ($\sum \Delta M \neq 0$). The invariant assertion halts computation before state corruption occurs.

---

## 4. Good First Issues & Contributor Extension Points

We are actively seeking community contributions for Sprint 083 and beyond. Here are curated areas where you can jump in immediately:

### Issue #1: [Good First Issue] Dynamic Fallback for Hexagonal vs. Pentagonal Validation
- **Target File:** `src/spatial/h3_adjacency.ts`
- **Scope:** Create a unified function `validateCellNeighborCount(cellIndex: string, neighbors: readonly unknown[]): void` that checks `h3IsPentagon(cellIndex)`. If true, delegate to `validatePentagonalNeighborCount(neighbors, cellIndex)`. If false, assert `neighbors.length === 6` with a corresponding `HexagonalCoordinationViolationError`.
- **Skills:** TypeScript, basic H3 grid concepts.

### Issue #2: [New Monad] Pentagonal Dirichlet Energy Operator
- **Target File:** `src/monads/dirichlet_energy.ts`
- **Scope:** Build a monadic pipeline operator that evaluates discrete Dirichlet energy $E_D(u) = \frac{1}{2} \sum_{(i,j) \in \mathcal{E}} w_{ij} (u_i - u_j)^2$ across icosahedral grid cells, utilizing `validatePentagonalNeighborCount` to weight pentagonal face boundaries with correct geodesic harmonic weights.
- **Skills:** Functional programming, discrete differential geometry.

### Issue #3: [WebGL / Shaders] 12-Singularity Pentagonal Highlight Shader
- **Target File:** `src/render/shaders/pentagon_singularity.frag.glsl`
- **Scope:** Implement a GPU fragment/vertex shader overlay for our Three.js/WebGL globe rendering pipeline. The shader should accept a uniform vector array of the 12 base pentagon 3D centroids (`uniform vec3 u_pentagonCentroids[12]`) and render a geodesic pulsed Voronoi ring around the singular pentagons to visualize discrete curvature concentration on the globe.
- **Skills:** GLSL, WebGL, spherical coordinate math.

---

## 5. Submission & Community Checklist

Before submitting a Pull Request:
1. Ensure your code is strictly typed with no `any` leaks.
2. Add comprehensive tests under `tests/`.
3. Verify test execution via `npx tsx tests/<your_test>.test.ts`.
4. Submit PR to: `https://github.com/pascalranoroarijaona/WebOfLife`.

Need help? Join the discussion in our GitHub repository issues!
```

---