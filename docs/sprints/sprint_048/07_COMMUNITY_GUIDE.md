# Contributor & Developer Onboarding Guide: Sprint 048
## Geometric Interface Contact Calculator & Lateral Thermodynamic Transport

Welcome to the **Web of Life** open-source contributor community! Whether you are a computational physicist, a functional programming enthusiast, or a graphics engineer passionate about planetary simulation, this guide will get you onboarded with the new features landed in **Sprint 048** and guide you toward impactful contributions.

---

## 1. Executive Overview: What Landed in Sprint 048?

In Sprint 048, we closed a critical physical approximation gap across the global discrete spherical surface. 

Previously, lateral flux equations (such as Fourier sensible heat conduction, hydraulic head transfer, and Fickian chemical diffusion) assumed an idealized regular hexagon edge constant computed strictly from average grid resolution. This introduced spatial distortion around pentagonal singularities (the 12 pentagons per resolution level on the icosahedral grid) and higher-latitude geodetic distortions.

With Sprint 048, we introduced **exact spherical contact geometry**:
- **`calculateH3SharedBoundaryLength(origin, neighbor)`** in `src/spatial/h3_adjacency.ts`:
  - Enforces topological 1-ring neighbor adjacency verification ($k=1$).
  - Extracts spherical boundary coordinates using `h3-js`.
  - Resolves coincident vertices defining the shared interface edge across spherical boundaries.
  - Computes exact great-circle geodesic contact lengths ($L_{ij}$) using Haversine spherical trigonometry with Earth mean radius $R_\oplus = 6,371,008.0\text{ m}$.
  - Guarantees strict mathematical symmetry: $L_{ij} \equiv L_{ji} \ge 0$.
- **Conservative Discrete Lateral Flux Operators** in `src/monads/spatial_monad.ts`:
  - Direct pairwise coupling of adjacent cells where conductance $C_{ij} = \sigma_{ij} \frac{L_{ij} H_{ij}}{D_{ij}}$.
  - Strict preservation of the First Law of Thermodynamics ($\sum_i \Delta S_i \equiv 0$ in closed manifolds down to machine precision $\pm 10^{-12}$) and Second Law of Thermodynamics (non-negative entropy production $\dot{S} \ge 0$).

---

## 2. Quickstart: Setting Up Your Development Environment

The project is built entirely on **TypeScript** and **Node.js**.

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **npm**: v9.0.0 or higher
- **Git**

### Clone & Install
```bash
# Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (Node.js ecosystem)
npm install
```

> **Note**: Never use Python, `pip`, or `pytest`. All simulation operators, monads, and test harnesses run on TypeScript via `tsx`.

### Running Sprint 048 Verification Suite
To verify the geometric interface contact calculator and thermodynamic transport conservation tests:

```bash
npx tsx tests/sprint_048.test.ts
```

To run all unit tests across the entire monad workspace:
```bash
npm test
```

---

## 3. Architecture Deep-Dive: How It Works

### 3.1 Spatial Topology & Interface Contract

The shared boundary interface descriptor lives in `src/spatial/h3_adjacency.ts`:

```typescript
export interface H3SharedBoundary {
  /** First shared vertex [latitude, longitude] in degrees */
  readonly vertexA: [number, number];
  /** Second shared vertex [latitude, longitude] in degrees */
  readonly vertexB: [number, number];
  /** Geodesic edge contact length in meters */
  readonly lengthMeters: number;
  /** Adjacency status */
  readonly isAdjacent: boolean;
}
```

When calculating fluxes between cell $i$ and cell $j$:
1. If $i = j$ or $j \notin \mathcal{N}_1(i)$, $L_{ij} = 0.0$ and no transfer occurs.
2. If adjacent, the two shared vertices $p_a$ and $p_b$ are identified and converted to geodesic length $L_{ij}$ in meters.
3. The interface conductance matrix $C_{ij} = \sigma_{ij} \frac{L_{ij} H_{ij}}{D_{ij}}$ scales extensive mass and energy exchange.

```
       Cell i (Origin)                    Cell j (Neighbor)
    +-------------------+              +-------------------+
    |                   |              |                   |
    |      x_i          |   p_a        |       x_j         |
    |   (Centroid)      +--------------+    (Centroid)     |
    |                   |  Shared Edge |                   |
    |                   |   L_ij (m)   |                   |
    |                   +--------------+                   |
    |                   |   p_b        |                   |
    +-------------------+              +-------------------+
             <------------ D_ij ------------->
```

### 3.2 Monadic Flow

Thermodynamic transfers follow purely functional state transformations wrapped in `SpatialMonad`. The simulation pipeline guarantees that stock deltas are pairwise complementary:

$$\Delta S_{i \to j} = - \Delta S_{j \to i}$$

This prevents spurious numerical mass or energy creation.

---

## 4. Good First Issues & Contributor Extension Points

We actively welcome contributions! Here are curated entry points categorized by domain:

### Category A: New Physical & Ecological Monads

#### Issue #GFI-048-A1: Anisotropic Ocean Boundary Current Monad
- **File**: `src/monads/ocean_monad.ts` (or `src/monads/currents_monad.ts`)
- **Objective**: Implement lateral momentum diffusion incorporating coastal boundaries.
- **Details**: When cell $i$ is ocean and cell $j$ is land, $L_{ij}$ represents a no-slip or partial-slip lateral friction boundary. Use `calculateH3SharedBoundaryLength` to compute boundary shear stress $\tau_{\text{wall}} = \mu \frac{\partial u}{\partial n} \approx \mu \frac{u_i}{D_{ij}/2} \cdot L_{ij} H_i$.
- **Difficulty**: Intermediate.
- **Skills**: TypeScript, Fluid Dynamics / Differential Equations.

#### Issue #GFI-048-A2: Biogeochemical Seed & Spore Dispersal Monad
- **File**: `src/monads/ecological_monad.ts`
- **Objective**: Model passive botanical seed dispersal and faunal migration across adjacent biomes.
- **Details**: Compute migration capacity based on boundary length $L_{ij}$ divided by topographic barriers (elevation variance $\Delta z_{ij}$).
- **Difficulty**: Beginner to Intermediate.
- **Skills**: TypeScript, Ecological Modeling.

---

### Category B: WebGL & Three.js Shaders

#### Issue #GFI-048-B1: Shared Boundary Dynamic Flux Shader
- **Directory**: `src/render/shaders/`
- **Objective**: Create a custom GLSL line/ribbon shader rendering lateral heat and water transport across shared H3 edges in real time.
- **Details**:
  - Accept vertex buffers containing $[p_a, p_b]$ coordinates from `getH3SharedBoundary`.
  - Pass instantaneous flux $\Phi_{ij}$ as an instance attribute.
  - Animate directional pulses with pulse speed proportional to flux velocity and color mapped to temperature enthalpy ($T_{\text{upwind}}$).
- **Difficulty**: Intermediate.
- **Skills**: WebGL, GLSL, Three.js, Mathematical Visualization.

#### Issue #GFI-048-B2: Pentagonal Singularity & Mesh Distortion Debug Overlay
- **Directory**: `src/render/overlays/`
- **Objective**: Render icosahedral vertex boundaries and pentagonal cells (resolution 0 to 6) with highlighted boundary edge metrics.
- **Details**: Help researchers visually verify $L_{ij}$ consistency across grid resolutions.
- **Difficulty**: Good First Issue.
- **Skills**: WebGL/Canvas2D or Three.js primitives.

---

## 5. Walkthrough: Implementing a New Extension Monad

Want to build a new Monad utilizing `calculateH3SharedBoundaryLength`? Follow this step-by-step example.

### Step 1: Create Your Monad Operator
Create `src/monads/sediment_transport_monad.ts`:

```typescript
import { calculateH3SharedBoundaryLength } from "../spatial/h3_adjacency";

export interface SedimentCell {
  readonly h3Index: string;
  sedimentMassKg: number;
  elevationMeters: number;
}

export function computeSedimentCreepDelta(
  origin: SedimentCell,
  neighbor: SedimentCell,
  distanceMeters: number,
  dtSeconds: number,
  diffusionCoeff: number = 1e-4 // m^2 / s
): number {
  const L_ij = calculateH3SharedBoundaryLength(origin.h3Index, neighbor.h3Index);
  if (L_ij <= 0.0) return 0.0;

  // Elevation gradient driving downslope sediment flux
  const slope = (neighbor.elevationMeters - origin.elevationMeters) / distanceMeters;
  const massFluxKgPerSec = -diffusionCoeff * L_ij * slope;

  return massFluxKgPerSec * dtSeconds;
}
```

### Step 2: Write a Unit Test
Create `tests/sediment_monad.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSedimentCreepDelta, SedimentCell } from "../src/monads/sediment_transport_monad";

describe("Sediment Transport Monad", () => {
  it("conserves mass symmetrically across shared boundaries", () => {
    // Two known adjacent H3 resolution 3 cells
    const cellA: SedimentCell = { h3Index: "831f98fffffffff", sedimentMassKg: 1000, elevationMeters: 50 };
    const cellB: SedimentCell = { h3Index: "831f9afffffffff", sedimentMassKg: 500, elevationMeters: 20 };

    const deltaAtoB = computeSedimentCreepDelta(cellA, cellB, 15000, 3600);
    const deltaBtoA = computeSedimentCreepDelta(cellB, cellA, 15000, 3600);

    assert.ok(deltaAtoB > 0, "Sediment should move downslope from A to B");
    assert.ok(Math.abs(deltaAtoB + deltaBtoA) < 1e-9, "Flux must be strictly anti-symmetric");
  });
});
```

### Step 3: Run the Test
```bash
npx tsx tests/sediment_monad.test.ts
```

---

## 6. How to Submit a Pull Request

1. **Fork the Repository**:
   Visit [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) and click **Fork**.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/shader-flux-ribbon
   ```
3. **Commit with Conventional Commits**:
   ```bash
   git commit -m "feat(render): implement GLSL shared boundary flux visualization"
   ```
4. **Ensure All Tests Pass**:
   ```bash
   npm run lint
   npm test
   npx tsx tests/sprint_048.test.ts
   ```
5. **Open a Pull Request**:
   Reference your issue number (e.g. `Resolves #GFI-048-B1`) and provide screenshots or benchmark numbers if applicable.

---

## 7. Community Channels & Office Hours

- **GitHub Discussions**: Use the repository discussions tab for architecture brainstorming.
- **Bi-Weekly Dev Call**: Every other Thursday at 17:00 UTC (links shared in repository discussions).
- **Code of Conduct**: Be respectful, curious, and collaborative.

Thank you for contributing to the open-source science of planetary simulation!