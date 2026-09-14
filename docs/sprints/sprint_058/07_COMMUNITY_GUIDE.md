<!-- DevRel Onboarding & Contributor Guide -->

# Contributor & Developer Guide: Sprint 058

Welcome to the **Web of Life** contributor community! In Sprint 058, we implemented `computeBoundaryMidpointLatLng` in `src/spatial/h3_adjacency.ts`, enabling exact spherical geodesic calculations between adjacent Uber H3 hexagonal centroids. This underpins conservative interfacial transport across the discrete global grid (DGGS) without antimeridian distortions or high-latitude metric collapse.

This guide walks you through setting up the repository, understanding the spherical boundary architecture, running the test suite, and claiming high-impact "Good First Issues" across monadic state systems and WebGL GPU pipelines.

---

## 1. Quickstart & Local Development Setup

The *Web of Life* engine is strictly written in **TypeScript** executed within **Node.js**.

### Prerequisites
- Node.js (v18.0.0+ LTS recommended)
- npm (v9.0.0+)
- Git

### Cloning and Installation
Clone the repository and install project dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note**: Do not use Python package managers (`pip`) or test runners (`pytest`). The entire simulation and verification pipeline runs exclusively on TypeScript via Node.js.

### Running Sprint 058 Verification Tests
To run the automated test suite for this sprint:

```bash
npx tsx tests/sprint_058.test.ts
```

All 8 core test cases (Equatorial, Meridian, Antimeridian Crossing, Polar Proximity, Commutativity/Symmetry, Equidistance, Idempotence, and H3 Adjacency) should pass with machine-precision tolerance ($< 10^{-7}$).

---

## 2. Architecture Overview: Spherical Boundary Adjacency

### The Problem Solved
Prior to Sprint 058, calculating the midpoint between two adjacent hexagonal cells often used naive planar arithmetic:
$$\phi_m \approx \frac{\phi_1 + \phi_2}{2}, \quad \lambda_m \approx \frac{\lambda_1 + \lambda_2}{2}$$
This fails across the antimeridian ($\pm 180^\circ$) where adjacent cells at $+179^\circ$ and $-179^\circ$ incorrectly averaged to $0^\circ$ (the Prime Meridian in the Gulf of Guinea), while high latitudes suffered massive non-linear metric stretching.

### 3D Cartesian n-Vector Geodesic Projection
`computeBoundaryMidpointLatLng` projects coordinates onto the 3D unit sphere $\mathbb{S}^2 \subset \mathbb{R}^3$:
$$\mathbf{v}_i = \begin{bmatrix} \cos\phi_i \cos\lambda_i \\ \cos\phi_i \sin\lambda_i \\ \sin\phi_i \end{bmatrix}, \quad \mathbf{v}_m' = \mathbf{v}_1 + \mathbf{v}_2, \quad \hat{\mathbf{v}}_m = \frac{\mathbf{v}_m'}{\|\mathbf{v}_m'\|}$$
$$\phi_m = \operatorname{atan2}\left(z_m, \sqrt{x_m^2 + y_m^2}\right), \quad \lambda_m = \operatorname{atan2}(y_m, x_m)$$

This guarantees:
1. **Antimeridian Continuity**: Cells spanning $+179^\circ$ and $-179^\circ$ resolve to $\pm 180^\circ$.
2. **First Law Conservation**: Symmetrical midpoint evaluation ensures interfacial flux $J_{1 \to 2} = -J_{2 \to 1}$, eliminating artificial stock generation.
3. **Second Law Compliance**: Diffusive transport down chemical/thermal gradients maintains non-negative entropy production.

### Key Types and Functions (`src/spatial/h3_adjacency.ts`)

```typescript
import { computeBoundaryMidpointLatLng, evaluateBoundaryInterface, LatLng } from './spatial/h3_adjacency';

const hexCentroidA: LatLng = { lat: 10.0, lng: 179.0 };
const hexCentroidB: LatLng = { lat: 10.0, lng: -179.0 };

const midpoint = computeBoundaryMidpointLatLng(hexCentroidA, hexCentroidB);
// midpoint -> { lat: 10.076..., lng: 180.0 }
```

---

## 3. Good First Issues & Extension Points

We welcome community contributions! Below are curated starter issues and extensions ideal for new contributors.

### Issue #GFI-058-A: Boundary Solar Zenith Angle Monad
- **Area**: Monadic State / Solar Insolation (`src/monads/solar_flux_monad.ts`)
- **Complexity**: Beginner / Intermediate
- **Description**: Implement a monadic operator that accepts `H3BoundaryInterface` and calculates instantaneous solar irradiance $I_{\text{mid}}(t) = S_0 \cdot \max(0, \cos\theta_z)$ at the boundary midpoint.
- **Key Task**: Use the midpoint latitude/longitude and astronomical hour angle to compute daytime interfacial insolation. Add unit tests in `tests/sprint_058_solar.test.ts`.

### Issue #GFI-058-B: WebGL Interfacial Flux Vector Shader
- **Area**: Visualization / WebGL (`src/rendering/shaders/flux_vector.vert.glsl`, `flux_vector.frag.glsl`)
- **Complexity**: Intermediate
- **Description**: Render animated boundary flux streamlines between adjacent H3 hexels on a 3D globe.
- **Key Task**:
  - Receive vertex buffer containing `[originLngLat, neighborLngLat, midpointLngLat, fluxMagnitude]`.
  - In vertex shader, unroll the great-circle arc through the midpoint.
  - In fragment shader, draw directed animated dash lines representing transport velocity $u_{12}$.

### Issue #GFI-058-C: Coriolis Normalization in Shallow-Water Boundary Solver
- **Area**: Dynamics / Ocean-Atmosphere coupling (`src/spatial/h3_adjacency.ts`)
- **Complexity**: Intermediate
- **Description**: Incorporate the boundary midpoint Coriolis parameter $f_m = 2 \Omega \sin(\phi_m)$ directly into inter-hexel geostrophic balance corrections.
- **Key Task**: Verify that cross-boundary pressure gradients balance the Coriolis acceleration at high latitudes without numerical oscillation.

---

## 4. Contributing Guidelines

1. **Fork & Branch**: Create a feature branch named `feat/issue-number-description` off `main`.
2. **Coding Standards**:
   - Write strict, fully-typed TypeScript (`noImplicitAny: true`).
   - Pure mathematical routines must be deterministic, pure functions with zero side effects.
   - Respect conservation laws: closed-system stock adjustments must sum to zero ($\sum \Delta X = 0$).
3. **Testing**:
   - Write accompanying test specs under `tests/`.
   - Run tests with `npx tsx tests/<your_test>.test.ts`.
4. **Pull Requests**:
   - Reference the issue number.
   - Include test outputs and relevant benchmark logs.
   - Submit PR to `https://github.com/pascalranoroarijaona/WebOfLife`.

Need help? Open an issue or join the discussion in the repository!