<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 060 Contributor & Onboarding Guide: Tangent Space Projection on Spherical Manifolds

Welcome to Sprint 060 of **Web of Life**! Whether you are a computational geometer, a WebGL graphics hacker, or a distributed systems engineer fascinated by functional reactive monads, this guide is your entry point.

In this sprint, we implemented `projectVectorOntoSphereTangentSpace` within `src/spatial/h3_adjacency.ts`. This mathematical operator strips radial normal velocity components from arbitrary 3D vector fields across our discrete H3 geodesic grid, ensuring exact mass conservation and preventing non-physical atmospheric escape or core leakage.

---

## 1. Quickstart & Local Development Setup

The **Web of Life** engine is written entirely in **TypeScript** running on **Node.js**.

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Setup Steps
```bash
# 1. Clone the canonical repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install all dependencies
npm install

# 3. Execute the Sprint 060 test suite
npx tsx tests/sprint_060.test.ts
```

> **Note**: Our engine strictly uses TypeScript toolchains. Do not use Python, pip, or pytest. All tests are executed using `npx tsx`.

---

## 2. Architecture Overview: What Was Built in Sprint 060

### The Physics & Geometry Challenge
Advection fields (atmospheric tropospheric winds, marine currents, biological migratory fluxes) are modeled as 3D Cartesian vectors $\mathbf{v} \in \mathbb{R}^3$. However, our planetary surface is a 2D spherical manifold $S^2 = \{ \mathbf{p} \in \mathbb{R}^3 \mid \|\mathbf{p}\| = R \}$.

When vectors cross between H3 hexagonal cells on a curved sphere, any nonzero radial normal velocity $v_r = \mathbf{v} \cdot \hat{\mathbf{n}}$ causes **radial leakage**: mass artificially leaks into outer space or sinks into the planetary mantle, violating the First Law of Thermodynamics.

### The Solution: Orthogonal Projection $\mathcal{P}_{T_{\mathbf{p}}S^2}$
In `src/spatial/h3_adjacency.ts`, we project any vector $\mathbf{v}$ at centroid position $\mathbf{p}$ onto the local tangent plane $T_{\mathbf{p}}S^2$:

$$\mathbf{v}_\perp = \mathbf{v} - \left(\frac{\mathbf{v} \cdot \mathbf{p}}{\|\mathbf{p}\|^2}\right)\mathbf{p}$$

### Key Modules Touched
1. `src/spatial/h3_adjacency.ts`:
   - `projectVectorOntoSphereTangentSpace(vector, originPoint, tolerance)`
   - `projectVectorOntoSphereTangentSpaceDetailed(vector, originPoint, tolerance)`
2. `src/spatial/h3_grid.ts`:
   - Facet-level velocity projection and upwind normal velocity $u_{ij} = \mathbf{v}_{\perp, ij} \cdot \hat{\mathbf{e}}_{ij}$ calculation.
3. `src/monads/spatial_monad.ts`:
   - Monadic stock updates conserving Carbon, Nitrogen, Water, Phosphorus, Oxygen, and Thermal Energy across cell interfaces.

---

## 3. How to Use the New APIs

```typescript
import { 
  projectVectorOntoSphereTangentSpace, 
  projectVectorOntoSphereTangentSpaceDetailed,
  Vector3D 
} from './src/spatial/h3_adjacency';

// Define a cell position on a planet of radius 6,371 km (e.g. on the equator)
const cellCentroid: Vector3D = [6371000, 0, 0];

// Raw velocity vector with unphysical radial velocity (10 m/s eastward, 50 m/s upward)
const rawVelocity: Vector3D = [50, 10, 0];

// Project onto the tangent plane: strips the [50, 0, 0] radial component
const tangentialVelocity = projectVectorOntoSphereTangentSpace(rawVelocity, cellCentroid);
console.log(tangentialVelocity); // [0, 10, 0]

// Get detailed audit metrics for debugging and diagnostics
const audit = projectVectorOntoSphereTangentSpaceDetailed(rawVelocity, cellCentroid);
console.log(`Orthogonality Error: ${audit.orthogonalityError}`); // < 1e-15
console.log(`Radial Magnitude: ${audit.radialMagnitude}`);       // 50.0
console.log(`Tangential Magnitude: ${audit.tangentialMagnitude}`); // 10.0
```

---

## 4. Good First Issues for External Contributors

We welcome contributions! Here are structured entry points for new contributors:

### Issue #1 (Good First Issue): High-Latitude Coriolis Deflection Monad
- **Area**: `src/monads/`
- **Objective**: Create a `CoriolisMonad` that wraps `SpatialMonad` and applies the Coriolis acceleration $\mathbf{a}_c = -2(\boldsymbol{\Omega} \times \mathbf{v}_\perp)$ to the velocity field at each H3 cell, followed by a call to `projectVectorOntoSphereTangentSpace` to preserve tangency.
- **Skills**: TypeScript, basic vector algebra (cross product).

### Issue #2: WebGL Instanced Streamline Shader for Tangent Fields
- **Area**: `src/rendering/shaders/`
- **Objective**: Implement a WebGL2 vertex/fragment shader pipeline that renders tangential advective velocity fields as animated streamlines or oriented glyphs across the H3 spherical manifold.
- **Requirements**:
  - Sample `projectVectorOntoSphereTangentSpace` output vectors from a uniform buffer or attribute buffer.
  - Render oriented arrows tangent to the sphere surface without z-fighting against the planetary crust.
- **Skills**: WebGL2, GLSL, 3D linear algebra.

### Issue #3: Geodesic Pentagonal Singularity Stress Tests
- **Area**: `tests/`
- **Objective**: H3 grids contain exactly 12 pentagonal cells at each resolution. Write automated edge-case test suites in `tests/sprint_060_pentagons.test.ts` to verify that `computeInterfaceAdvectiveTransfer` maintains exact mass conservation to machine precision ($< 10^{-15}$) across pentagon-hexagon interfaces.
- **Skills**: TypeScript, mathematical verification, finite volume methods.

---

## 5. Development Workflow & Contribution Checklist

1. **Fork and Branch**: Create a descriptive feature branch:
   ```bash
   git checkout -b feature/coriolis-monad
   ```
2. **Implement & Typecheck**:
   Ensure all TypeScript types are strictly typed (no `any`):
   ```bash
   npx tsc --noEmit
   ```
3. **Run Existing & New Tests**:
   ```bash
   npx tsx tests/sprint_060.test.ts
   ```
4. **Submit PR**: Target `main` on `https://github.com/pascalranoroarijaona/WebOfLife` with a clear explanation of physical conservation invariants tested.
```

---