# Contributor & Developer Guide: Sprint 088 — Center Aperture Invariance & `hasZeroApertureSequence`

Welcome to the **Web of Life** developer community! Whether you are exploring discrete planetary grid systems, writing thermodynamic monads, or hacking on high-performance WebGL shaders, this guide will help you understand our latest release, get your local environment running, and find high-impact extension points to contribute.

---

## 1. What’s New in Sprint 088?

In Sprint 088, we introduced `hasZeroApertureSequence` to `src/spatial/h3_adjacency.ts`. 

### The Core Problem: Aperture Traversal & Lateral Flux
In our planetary simulation, Earth's surface is discretized using hierarchical hexagonal cells (H3 aperture-7 / aperture-3). Traversal down resolution levels ($r \to r+1 \to \dots \to r+k$) is represented as an array of directional digits:
$$\mathbf{d} = \langle d_1, d_2, \dots, d_m \rangle, \quad d_i \in \{0, 1, 2, 3, 4, 5, 6\}$$

* **Digit `0`**: The nested central sub-hexagon (centroid coordinates remain identical; lateral translation vector $\mathbf{T}_r(0) = \mathbf{0}$).
* **Digits `1..6`**: The 6 surrounding peripheral neighbor sub-hexagons.

When downscaling across resolutions strictly through central sub-hexagons ($[0, 0, 0, \dots]$), the centroid never shifts. From an ecological and thermodynamic standpoint:
1. **Zero Lateral Flux ($\mathbf{J}_{\text{lateral}} = \mathbf{0}$)**: The cell column acts as a laterally isolated closed system. No mass or heat exchange occurs across lateral hexagonal facets.
2. **Computational Fast-Path**: We can bypass expensive advection-dispersion tensors and coordinate recalculations in `SpatialFluxMonad`.

### The Solution: `hasZeroApertureSequence`
A pure, zero-allocation $\mathcal{O}(k)$ predicate that tests if a sequence contains exclusively `0` digits:

```typescript
import { hasZeroApertureSequence } from './spatial/h3_adjacency';

hasZeroApertureSequence([]);             // => true (vacuously true)
hasZeroApertureSequence([0, 0, 0]);       // => true (centroid invariant)
hasZeroApertureSequence([0, 2, 0]);       // => false (breaks invariance at step 1)
```

---

## 2. Quickstart & Local Development Setup

The **Web of Life** engine is built using **TypeScript** and **Node.js**.

### 2.1 Clone the Repository
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
```

### 2.2 Install Dependencies
We strictly use `npm`. Do not use alternative package managers or Python tools:
```bash
npm install
```

### 2.3 Run Test Suites
We execute tests directly with `tsx`:
```bash
# Run the Sprint 088 verification suite
npx tsx tests/sprint_088.test.ts

# Run the full test suite
npm test
```

---

## 3. Architecture Deep-Dive: Spatial Monads & Gating

### 3.1 How `SpatialFluxMonad` Uses `hasZeroApertureSequence`
When hierarchical scaling occurs, `SpatialFluxMonad` checks `hasZeroApertureSequence(pathDigits)`:

```typescript
import { hasZeroApertureSequence } from './spatial/h3_adjacency';
import { EcologicalStockState, HierarchicalProjectionResult } from './spatial/spatial_flux_monad';

export function projectStateDownPath(
  sourceState: EcologicalStockState,
  path: readonly number[]
): HierarchicalProjectionResult {
  const steps = path.length;
  const apertureAreaFactor = Math.pow(1 / 7, steps);

  if (hasZeroApertureSequence(path)) {
    // FAST PATH: Centroid preserved, lateral exchange J_lateral = 0
    return {
      targetState: scaleStock(sourceState, apertureAreaFactor),
      lateralDeltas: zeroDeltas(),
      isApertureInvariant: true,
      entropyGeneratedJoulesPerKelvin: 0.0,
    };
  }

  // SLOW PATH: Peripheral facet traversal introduces advective flux
  return computePeripheralLateralExchange(sourceState, path, apertureAreaFactor);
}
```

This optimization eliminates redundant matrix operations for self-nested resolution hierarchies.

---

## 4. "Good First Issues" for External Contributors

We welcome pull requests from developers of all experience levels. Here are curated issues ready for contribution:

### 🌟 Issue #1: Implement `getAperturePathCentroidOffset`
* **Area**: `src/spatial/h3_adjacency.ts` & `src/spatial/h3_grid.ts`
* **Difficulty**: Beginner / Good First Issue
* **Context**: While `hasZeroApertureSequence` returns a boolean, we frequently need the cumulative lateral offset vector $(\Delta x, \Delta y)$ for mixed paths (e.g., `[0, 1, 0, 4]`).
* **Task**:
  1. Implement `getAperturePathCentroidOffset(digits: readonly number[], baseResolution: number): [number, number]`.
  2. Short-circuit to `[0, 0]` immediately if `hasZeroApertureSequence(digits)` is `true`.
  3. Add unit tests in `tests/spatial_offset.test.ts` verifying that zero sequences return identity centroids across resolutions 0 through 15.

### 🌟 Issue #2: WebGL Shader for Smooth Multi-Resolution Zoom
* **Area**: `src/render/shaders/hex_hierarchy.frag` & `hex_hierarchy.vert`
* **Difficulty**: Intermediate (WebGL / GLSL)
* **Context**: When zooming the camera through H3 hierarchical tiers, cells can pop or jitter during coordinate snapping.
* **Task**:
  1. Write a fragment shader that takes an aperture path uniform `u_pathDigits[8]`.
  2. If the path satisfies zero-aperture invariance, smoothly blend alpha levels between parent resolution $r$ and child resolution $r+1$ without radial boundary distortion.
  3. For non-zero aperture paths, render directional boundary vectors pointing toward neighbor azimuth $\theta = (d - 1) \cdot \frac{\pi}{3}$.

### 🌟 Issue #3: Monadic Soil Column Infiltration Bypass
* **Area**: `src/monads/hydrology_monad.ts`
* **Difficulty**: Intermediate (TypeScript / Monads)
* **Context**: Vertical 1D hydrology models (Richards' equation approximation) assume horizontal fluxes are zero when zooming into center sub-hexagons.
* **Task**:
  1. Build `HydraulicColumnMonad` implementing vertical Darcy infiltration.
  2. Use `hasZeroApertureSequence` to guard against triggering 2D saturated lateral runoff calculations.
  3. Ensure mass conservation: liquid water entering the top layer must equal drainage plus evapotranspiration plus storage delta ($\Delta W_{\text{liq}} = 0$ over closed cycles).

---

## 5. Coding Standards & PR Submission Checklist

To ensure fast code review and maintain strict thermodynamic rigor, please verify:

- [ ] **Pure Functions & Immutability**: All spatial calculations and monad transformations must return fresh immutable state objects (`Object.freeze` or `readonly`).
- [ ] **Physical Conservation**: Any mass or energy transformed must obey strict mass stoichiometry and the First Law of Thermodynamics ($\Delta E_{\text{system}} = Q - W$).
- [ ] **Type Safety**: Strictly typed TypeScript with `noImplicitAny: true`. Never use `any`.
- [ ] **Test Coverage**: Accompany all changes with tests under `tests/`. Verify execution with:
  ```bash
  npx tsx tests/sprint_088.test.ts
  ```
- [ ] **Conventional Commits**: Format commit messages as `feat(spatial): ...`, `fix(monad): ...`, or `docs(guide): ...`.

---

## 6. Join the Discussion

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Discussions & RFCs**: Open an issue or discussion topic on GitHub to propose new ecological state variables, shader visualizers, or numerical solvers.

Happy hacking on the planetary simulation!