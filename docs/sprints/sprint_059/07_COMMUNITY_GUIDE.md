<!-- DevRel Onboarding & Contributor Guide -->
# Developer & Contributor Guide: Sprint 059 — Spherical Great Circle Plane Normal Vector Computation

Welcome to the **Web of Life** contributor community! Whether you are interested in discrete global grid systems (DGGS), non-equilibrium thermodynamics, functional reactive monads, or high-performance GPU shaders, this guide will help you understand our newest additions and get your development environment running in minutes.

The official project repository is located at:
**https://github.com/pascalranoroarijaona/WebOfLife**

---

## 1. Sprint 059 Architecture Overview

In Sprint 059, we introduced `computeSphericalGreatCircleNormal3D` in `src/spatial/h3_adjacency.ts`, expanding our spherical geometry kernel on $\mathbb{S}^2 \subset \mathbb{R}^3$.

### What Problem Does This Solve?
Planetary dynamics across discrete hexagonal cells (powered by Uber's H3 index) require directional fluxes for:
- Atmospheric circulation cells (Hadley, Ferrel, Polar).
- Oceanic thermohaline currents.
- Trophic biomass migrations and nutrient dispersal.

Every cell-to-cell interface is represented by a great circle arc spanned by unit vectors $\mathbf{u}$ and $\mathbf{v}$ from the sphere's origin. To evaluate perpendicular boundary velocity $v_\perp = \mathbf{V}_{\text{flow}} \cdot \mathbf{n}$, we need a canonical unit normal vector $\mathbf{n}$ defining the great circle plane:
$$\mathbf{n} = \frac{\mathbf{u} \times \mathbf{v}}{\|\mathbf{u} \times \mathbf{v}\|}$$

### Key Engineering Features
1. **Collinear & Antipodal Singularity Fallback**: When points are identical ($\mathbf{u} = \mathbf{v}$) or antipodal ($\mathbf{u} = -\mathbf{v}$), the cross product magnitude approaches zero ($\|\mathbf{w}\| < 10^{-10}$). We deterministically construct an orthogonal vector via Gram-Schmidt projection against a stable axis ($[1, 0, 0]^T$ or $[0, 1, 0]^T$), eliminating `NaN` or `Infinity` bugs.
2. **Strict Invariants**:
   - Unit length: $\|\mathbf{n}\| = 1.0 \pm 10^{-12}$.
   - Orthogonality: $|\mathbf{n} \cdot \mathbf{u}| < 10^{-10}$ and $|\mathbf{n} \cdot \mathbf{v}| < 10^{-10}$.
   - Anti-symmetry: $\mathbf{n}(\mathbf{v}, \mathbf{u}) = -\mathbf{n}(\mathbf{u}, \mathbf{v})$ for non-collinear vectors.
3. **Conservative Transport**: Coupled with `advectiveBoundaryFluxMonad`, mass and thermal energy are strictly conserved across interfaces ($\sum \Delta \mathbf{S} = \mathbf{0}$) according to the First Law of Thermodynamics, while satisfying Second Law entropy conditions.

---

## 2. Quickstart: Setting Up Your Dev Environment

The Web of Life engine is built exclusively with **TypeScript** and **Node.js** (v18+ recommended).

### 2.1 Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2.2 Run Sprint Tests
Execute test suites directly using `npx tsx`:
```bash
# Run Sprint 059 unit and invariant tests
npx tsx tests/sprint_059.test.ts

# Run the full spatial geometry test suite
npx tsx tests/sprint_058.test.ts
```

---

## 3. How to Use the New Function in TypeScript

```typescript
import { computeSphericalGreatCircleNormal3D } from './src/spatial/h3_adjacency';

// Define two unit vectors on S^2 (e.g., Equator at 0°E and 90°E)
const u: [number, number, number] = [1, 0, 0];
const v: [number, number, number] = [0, 1, 0];

// Compute unit normal of the great circle plane (returns [0, 0, 1] - North Pole)
const normal = computeSphericalGreatCircleNormal3D(u, v);
console.log('Plane Normal:', normal); // [0, 0, 1]

// Antipodal / collinear vectors are handled deterministically without NaN:
const antipodalU: [number, number, number] = [0, 0, 1];
const antipodalV: [number, number, number] = [0, 0, -1];
const fallbackNormal = computeSphericalGreatCircleNormal3D(antipodalU, antipodalV);
console.log('Fallback Normal:', fallbackNormal); // Guaranteed perpendicular unit vector
```

---

## 4. "Good First Issues" & Contributor Extension Points

Looking to make your first open-source contribution to Web of Life? Here are curated projects ready for community involvement:

### Issue #1 (Good First Issue): Great Circle Midpoint Interpolator Monad
- **Area**: `src/spatial/geodesic_monad.ts`
- **Objective**: Implement `slerpUnitVector3D(u, v, t)` performing spherical linear interpolation (SLERP) along the great circle arc using the normal vector computed in Sprint 059.
- **Requirements**:
  - Pure functional implementation returning a `[number, number, number]`.
  - Maintain unit norm $\|\mathbf{p}(t)\| = 1.0 \pm 10^{-12}$.
  - Write test coverage in `tests/slerp_monad.test.ts`.

### Issue #2: WebGL Great Circle Ribbon & Velocity Streamline Shader
- **Area**: `src/renderer/shaders/geodesic_flux.frag` & `src/renderer/shaders/geodesic_flux.vert`
- **Objective**: Create a WebGL2 / GLSL shader that visualizes cross-boundary advective fluxes across H3 edges.
- **Specification**:
  - Pass cell centroids `u`, `v` and their precalculated normal `n` as vertex attributes.
  - Draw extruded ribbon geometry on the spherical crust with dynamic flow animation proportional to $|v_\perp|$.
  - Color gradient represents temperature/enthalpy flux from donor cell to receiver cell.

### Issue #3: Multi-Layer Atmospheric Advection Monad
- **Area**: `src/thermodynamics/atmospheric_transport.ts`
- **Objective**: Extend `advectiveBoundaryFluxMonad` to multi-layer atmospheric columns (Troposphere, Stratosphere).
- **Specification**:
  - Incorporate barometric pressure drop across vertical boundaries.
  - Ensure stoichiometric preservation of trace greenhouse gases ($CO_2$, $CH_4$, $H_2O$ vapor).

---

## 5. Contribution Guidelines & Testing Standards

1. **Deterministic & Pure**: Spatial and thermodynamic monads must be pure functions with zero side effects.
2. **Strict Invariant Validation**: Include unit tests validating conservation laws ($\sum \Delta \text{Mass} = 0$, $\sum \Delta \text{Energy} = 0$).
3. **PR Verification**: Run `npx tsx tests/sprint_059.test.ts` and ensure all assertions pass before submitting a pull request.

Join our discussions on GitHub Issues and help us model the living planet with geometric and physical precision!