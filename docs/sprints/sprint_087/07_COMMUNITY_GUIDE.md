# Sprint 087 Contributor Guide: Pentagon Base Cell Missing Direction Mapping

Welcome to the **Web of Life** planetary simulation engine! This sprint introduces `determinePentagonBaseCellMissingDirection` in `src/spatial/h3_adjacency.ts`, resolving a foundational topological challenge on icosahedral discrete global grid systems (DGGS): eliminating mass and energy leakage across icosahedral pentagon singularities.

Whether you are here to build thermodynamic state monads, write WebGL visualizers for planetary boundary layers, or optimize DGGS index math, this guide will get you started in minutes.

---

## 1. Fast-Track Quickstart

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Git**

### Clone & Install
```bash
# Clone the canonical repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install TypeScript and project dependencies
npm install
```

### Run Sprint 087 Verification Tests
Verify that the pentagon boundary operators and mass conservation invariants pass locally:
```bash
npx tsx tests/sprint_087.test.ts
```

All 12 pentagon base cells should report their canonical missing aperture (`Direction.K_AXES` / 1), while all 110 hexagonal base cells return `Direction.INVALID` (7), with 0 boundary mass loss over $10^3$ integration timesteps.

---

## 2. What We Built in Sprint 087

### 2.1 The Euler Characteristic Dilemma
Under Euler's formula ($\chi = V - E + F = 2$), any hexagonal tiling of the sphere $S^2$ requires exactly **12 pentagonal defects** located at the vertices of an inscribed icosahedron. In the canonical 122 base cell partition ($0 \dots 121$):
* **110 base cells** are regular hexagons ($6$ adjacent neighbors).
* **12 base cells** are spherical pentagons ($5$ adjacent neighbors):
  $$\mathcal{P} = \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$$

### 2.2 The Missing Direction Operator
Each pentagonal base cell has a deleted $60^\circ$ coordinate sector corresponding to an omitted aperture direction:

| Direction Enum | Digit | Planar Axis ($60^\circ$ Basis) |
| :--- | :---: | :--- |
| `CENTER` | $0$ | $(0, 0)$ |
| `K_AXES` | $1$ | $(0, 1)$ *(Omitted for pentagons)* |
| `J_AXES` | $2$ | $(-\sqrt{3}/2, 1/2)$ |
| `JK_AXES` | $3$ | $(-\sqrt{3}/2, 3/2)$ |
| `I_AXES` | $4$ | $(\sqrt{3}/2, 1/2)$ |
| `IK_AXES` | $5$ | $(\sqrt{3}/2, 3/2)$ |
| `IJ_AXES` | $6$ | $(0, 2)$ |
| `INVALID` | $7$ | Topological null |

Calling `determinePentagonBaseCellMissingDirection(baseCell)` returns:
* `Direction.K_AXES` ($1$) for any $b \in \mathcal{P}$.
* `Direction.INVALID` ($7$) for all hexagonal cells $h \in \mathcal{H}$ and out-of-range indices.

```typescript
import { determinePentagonBaseCellMissingDirection, isBaseCellPentagon } from './src/spatial/h3_adjacency';
import { Direction } from './src/spatial/h3_types';

isBaseCellPentagon(4); // true (North Polar pentagon)
determinePentagonBaseCellMissingDirection(4); // Direction.K_AXES (1)

isBaseCellPentagon(0); // false (Equatorial hexagon)
determinePentagonBaseCellMissingDirection(0); // Direction.INVALID (7)
```

### 2.3 Thermodynamic Flux Conservation
If an atmospheric or hydrological diffusion loop attempts to route mass across `Direction.K_AXES` on a pentagonal defect, neighbor lookup yields `INVALID_BASE_CELL` ($-1$). Routing matter into this topological void produces an immediate violation of the First Law of Thermodynamics:

$$\sum_{b=0}^{121} \frac{d M_b}{dt} \ne 0 \quad \text{[Mass Leak]}$$

`determinePentagonBaseCellMissingDirection` acts as a zero-admittance barrier ($J_{p, \mu(p)} \equiv 0$), guaranteeing that every gram of carbon, nitrogen, and water remains strictly conserved across the global manifold.

---

## 3. "Good First Issues" & Contributor Extension Points

Looking to make your first open-source contribution to Gaia Platform? Here are three high-impact extension points ready for community PRs:

### Issue #1: Build an Atmospheric Aerosol Dispersion Monad (Beginner / Intermediate)
* **Goal**: Implement `AerosolDispersionMonad` in `src/monads/aerosol_monad.ts` that models particulate transport (dust, volcanic ash, sea spray) across the 122 base cells.
* **Extension Details**:
  * Inherit patterns from `DiscreteManifoldFluxMonad`.
  * Ensure flux through `determinePentagonBaseCellMissingDirection(bc)` is strictly set to 0.
  * Implement dry deposition rate $\lambda_{\text{dep}}$ and horizontal eddy diffusion $K_{\text{aero}}$.
* **Validation**: Add unit tests in `tests/community_aerosol.test.ts` verifying that total mass $\sum M_{\text{ash}}$ is conserved when $\lambda_{\text{dep}} = 0$.

### Issue #2: WebGL Shader for Pentagon Defect Topology Visualization (Frontend / Shaders)
* **Goal**: Write a WebGL vertex and fragment shader in `src/render/shaders/dggs_pentagon.vert.glsl` and `src/render/shaders/dggs_pentagon.frag.glsl`.
* **Extension Details**:
  * Receive base cell index $b \in [0, 121]$ as an attribute.
  * Branch color output: Render hexagonal cells in ocean cyan/continental green, and render the 12 pentagonal defects in emissive gold (`#FFD700`).
  * Draw the 5 valid outward aperture normal vectors in green, and draw the omitted missing aperture vector in dotted crimson (`#DC143C`) to visually highlight the zero-flux barrier.

### Issue #3: Multi-Resolution Pentagon Child Aperture Pruning (Advanced Math)
* **Goal**: Extend missing direction mechanics from resolution $0$ (base cells) to resolution $r \in \{1, 2, 3\}$.
* **Extension Details**:
  * In hierarchical H3 grids, pentagon cells generate exactly 5 hexagonal children and 1 pentagonal child per subdivision level.
  * Implement `determineHierarchicalPentagonMissingDirection(h3Index: bigint): Direction` in `src/spatial/h3_hierarchical.ts`.
  * Verify that child directional digit $1$ (`K_AXES`) is pruned from recursive pentagonal neighbor lookups.

---

## 4. Contributing Workflow

1. **Fork and Branch**:
   ```bash
   git checkout -b feature/issue-your-feature-name
   ```
2. **Implement Feature**:
   Write your TypeScript implementation under `src/`. Ensure zero type errors via `npx tsc --noEmit`.
3. **Write Unit Tests**:
   Create a test script under `tests/` and verify:
   ```bash
   npx tsx tests/sprint_087.test.ts
   ```
4. **Thermodynamic Invariant Check**:
   Any flux or advective monad PR must verify strict numerical mass conservation:
   $$|M(t + \Delta t) - M(t)| < 10^{-12}$$
5. **Submit a Pull Request**:
   Open a PR against `main` on [pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) using the Sprint Contributor Template!
```

---