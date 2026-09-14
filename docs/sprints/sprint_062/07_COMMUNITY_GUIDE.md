<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 062 Contributor Guide: Radial Midpoint Unit Vectors on H3 Discrete Global Grids

Welcome to the **Web of Life** open-source contributor community! Whether you are an experienced scientific computational programmer, a TypeScript enthusiast, or a creative WebGL shader developer, this guide provides everything you need to understand, run, and extend the new features landed in **Sprint 062**.

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Tech Stack**: TypeScript, Node.js, WebGL2

---

## 1. Sprint 062 Feature Overview

In Discrete Global Grid Systems (DGGS) like H3, hexagonal and pentagonal cells partition the spherical surface of the planet. Accurately modeling thermodynamic mass, heat, and momentum transport across cell boundaries requires an orthogonal local reference triad $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_{\text{lat}}, \hat{\mathbf{n}}_{\text{rad}})$ at each inter-cell facet:

1. **Boundary Tangent** ($\hat{\mathbf{t}}$): Directed along the boundary segment between vertices $\mathbf{v}_1$ and $\mathbf{v}_2$.
2. **Radial Outward Normal** ($\hat{\mathbf{n}}_{\text{rad}}$): Points from the geocenter $(0,0,0)$ through the boundary segment midpoint.
3. **Lateral Normal** ($\hat{\mathbf{n}}_{\text{lat}} = \hat{\mathbf{t}} \times \hat{\mathbf{n}}_{\text{rad}}$): Tangent to the sphere, directing inter-cell advection across the interface facet.

In Sprint 062, we implemented `computeBoundarySegmentRadialNormal3D` and `computeBoundarySegmentRadialNormal3DFromPoints` in `src/spatial/h3_adjacency.ts`.

### Mathematical Formulation
Given Cartesian vertex vectors $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$:
$$\mathbf{m} = \frac{1}{2}(\mathbf{v}_1 + \mathbf{v}_2)$$
$$\hat{\mathbf{n}}_{\text{rad}} = \frac{\mathbf{m}}{\|\mathbf{m}\|_2} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|_2}$$

### Singularity Guard
When vertices are antipodal ($\mathbf{v}_1 = -\mathbf{v}_2$) or coincident at the origin, $\|\mathbf{v}_1 + \mathbf{v}_2\| \le \epsilon$ ($\epsilon = 10^{-12}$). In this condition, the function safely returns the canonical zenith fallback $[0, 0, 1]^T$, preventing IEEE-754 `NaN` or `Infinity` propagation into physics and rendering pipelines.

---

## 2. Quickstart & Local Setup

The project is purely built on Node.js and TypeScript. **Do not use Python package managers (no `pip`, no `pytest`).**

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or higher)

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 062 Tests
Run the test suite via `tsx`:
```bash
npx tsx tests/sprint_062.test.ts
```

To run the full regression test suite:
```bash
npm test
```

---

## 3. Code Example: Computing the Radial Normal

```typescript
import { 
  computeBoundarySegmentRadialNormal3D, 
  computeBoundarySegmentRadialNormal3DFromPoints 
} from './src/spatial/h3_adjacency';
import { Vector3D } from './src/spatial/h3_types';

// Define two vertices of an H3 cell edge in 3D Cartesian coordinates
const v1: Vector3D = [1.0, 0.0, 0.0];
const v2: Vector3D = [0.0, 1.0, 0.0];

// Compute radial normal via points
const normalFromPoints = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
console.log('Radial normal:', normalFromPoints);
// Output: [ 0.7071067811865475, 0.7071067811865475, 0 ]

// Compute radial normal via BoundarySegment3D struct
const normalFromStruct = computeBoundarySegmentRadialNormal3D({ v1, v2 });
console.log('Magnitude:', Math.hypot(...normalFromStruct)); // 1.0
```

---

## 4. Good First Issues & Extension Points

We welcome external contributors! Below are curated extension tasks ideal for first-time contributors wanting to write thermodynamic monads or WebGL shaders.

### Issue #1: WebGL 3D Normal Vector Arrow Shader (Good First Issue)
- **Component**: `src/rendering/shaders/boundary_normals.vert.glsl` and `src/rendering/shaders/boundary_normals.frag.glsl`
- **Goal**: Implement a GPU instanced line/arrow shader rendering the radial unit normal $\hat{\mathbf{n}}_{\text{rad}}$ and lateral unit normal $\hat{\mathbf{n}}_{\text{lat}}$ at each H3 cell facet.
- **Why it matters**: Provides real-time visual inspection in our WebGL planetary globe of atmospheric wind flux vectors crossing hexagon boundaries.
- **Skills**: WebGL2, GLSL, 3D coordinate transformations.

### Issue #2: Solar Zenith Angle Facet Monad (Thermodynamics / Monad)
- **Component**: `src/thermodynamics/solar_zenith_monad.ts`
- **Goal**: Implement a pure monad that accepts an array of boundary segments, calculates their radial normal unit vectors using `computeBoundarySegmentRadialNormal3D`, and computes incident shortwave solar radiation:
  $$I_{\text{facet}} = I_0 \cdot \max(0, \hat{\mathbf{s}} \cdot \hat{\mathbf{n}}_{\text{rad}})$$
  where $\hat{\mathbf{s}}$ is the time-dependent solar vector.
- **Why it matters**: Drives boundary layer heating and convection between adjacent microclimate zones.
- **Skills**: TypeScript, pure functional programming, immutable state transforms.

### Issue #3: Edge-Crossing Advective Flux Monad
- **Component**: `src/physics/atmospheric_advection.ts`
- **Goal**: Using the lateral normal $\hat{\mathbf{n}}_{\text{lat}} = \hat{\mathbf{t}} \times \hat{\mathbf{n}}_{\text{rad}}$, compute conservative inter-cell air mass exchange:
  $$\dot{M}_{AB} = \rho_{\text{air}} \cdot A_{\text{facet}} \cdot (\mathbf{u} \cdot \hat{\mathbf{n}}_{\text{lat}})$$
  Ensure mass balance: $\Delta M_A + \Delta M_B = 0$.
- **Skills**: Finite volume methods, conservation laws.

---

## 5. Contribution Guidelines

1. **Fork and Branch**: Create a feature branch named `feat/issue-title` from `main`.
2. **Purity & Conservation**: Core thermodynamic and geometric methods must be deterministic, pure functions with no side effects.
3. **Type Safety**: Maintain strict TypeScript compliance without `any`.
4. **Testing**: Add unit tests in `tests/` covering boundary edge cases (equator, poles, zero-length segments). Run `npx tsx tests/sprint_062.test.ts`.
5. **Open a PR**: Reference the issue number and tag `@pascalranoroarijaona/reviewers`.

Join our discussion on GitHub Discussions and feel free to ask questions!