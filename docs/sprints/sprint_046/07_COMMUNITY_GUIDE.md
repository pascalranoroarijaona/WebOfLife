<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 046 Community Guide: Geodesic Haversine Distance & Spatial Flux Transport

Welcome to the **Sprint 046** Contributor Guide for [WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)! Whether you are an open-source newcomer interested in geospatial simulations, a computational physicist modeling planetary thermodynamics, or a graphics programmer writing WebGL shaders, this guide will get you up to speed.

---

## 1. Quickstart & Developer Setup

The WebOfLife engine is built entirely in **TypeScript** running on **Node.js**. We do not use Python or other runtimes.

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (bundled with Node.js)

### Repository Setup
```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install TypeScript dependencies
npm install

# 3. Run Sprint 046 verification tests
npx tsx tests/sprint_046.test.ts
```

All unit and integration tests are executed using `npx tsx tests/sprint_N.test.ts`.

---

## 2. What's New in Sprint 046?

### Physical Geodesic Metric for H3 Cells
Prior to Sprint 046, H3 cells in `H3AdjacencyMatrix` knew their topological neighbors, but didn't know the exact physical metric distance separating their centroids. In Sprint 046, we introduced:
- `calculateHaversineDistance`: A high-performance, numerically stable geodesic metric function in `src/spatial/h3_adjacency.ts`.
- Bounded trigonometric evaluation that handles antipodal coordinates and identical points without `NaN` propagation.
- Geodesic distance caching in `H3AdjacencyMatrix.getCentroidDistance(cellA, cellB)`.

### Why This Matters for Thermodynamics
Fluxes between adjacent cells—like heat conduction, water vapor diffusion, and nutrient dispersion—require gradient computation:
$$\mathbf{J} = -\kappa \frac{\Phi_j - \Phi_i}{d_{ij}}$$
Having exact geodesic distance $d_{ij}$ in meters guarantees:
1. **First Law:** Mass and energy are conserved across cell boundaries ($\Phi_{ij} = -\Phi_{ji}$).
2. **Second Law:** Heat and mass diffuse from high to low potential, ensuring positive entropy generation ($\sigma_S \ge 0$).

---

## 3. How to Use the New Helper

```typescript
import { calculateHaversineDistance } from './src/spatial/h3_adjacency';

// Accepts coordinate tuples [lat, lng] or LatLngCoord objects:
const london = { lat: 51.5074, lng: -0.1278 };
const paris = { lat: 48.8566, lng: 2.3522 };

// Distance in meters (default):
const distanceMeters = calculateHaversineDistance(london, paris);
console.log(`Distance: ${(distanceMeters / 1000).toFixed(1)} km`); // ~343.6 km

// Or directly in kilometers:
const distanceKm = calculateHaversineDistance(london, paris, { unit: 'kilometers' });
console.log(`Distance: ${distanceKm.toFixed(1)} km`);
```

---

## 4. "Good First Issues" for External Contributors

We welcome contributions! Here are curated entry points directly building upon Sprint 046.

### 🌟 Good First Issue #1: Initial Bearing & Great-Circle Azimuth Helper
- **Location:** `src/spatial/h3_adjacency.ts`
- **Task:** Implement `calculateInitialBearing(coordA, coordB): number` returning the forward azimuth angle in degrees $[0^\circ, 360^\circ)$ along the great-circle arc.
- **Why it matters:** Atmospheric wind advection and oceanic currents require directed velocity vectors across cell faces.
- **Difficulty:** Beginner / Intermediate.

### 🌟 Good First Issue #2: Cross-Track Distance to Geodesic Corridor
- **Location:** `src/spatial/h3_adjacency.ts`
- **Task:** Implement `calculateCrossTrackDistance(coord, arcStart, arcEnd): number` computing perpendicular distance from a cell to a major storm track or ocean jet.
- **Why it matters:** Allows modeling hurricane swaths and cyclone dissipation over terrestrial cells.
- **Difficulty:** Intermediate.

---

## 5. Extension Points: Building Monads & WebGL Shaders

### A. Implementing a New Atmospheric Flux Monad
You can create a new spatial process monad that transfers mass or energy using `calculateHaversineDistance`:

```typescript
import { calculateHaversineDistance } from '../spatial/h3_adjacency';
import { CellThermodynamicState } from '../spatial/h3_types';

export function diffusePassiveTracer(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  tracerA: number,
  tracerB: number,
  diffusionCoeff: number,
  sharedEdgeLengthMeters: number,
  dtSeconds: number
) {
  const d = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  if (d <= 0) return 0;

  // Fick's first law of diffusion: J = -D * (dC / dx) * Area
  const flux = diffusionCoeff * sharedEdgeLengthMeters * ((tracerB - tracerA) / d) * dtSeconds;
  
  // Conserve stocks: deltaA = +flux, deltaB = -flux
  return flux;
}
```

### B. WebGL Great-Circle Arc Shader for Advective Flow
For frontend and graphics contributors:
- **Location:** `src/visualization/shaders/`
- **Goal:** Render dynamic great-circle arcs between cell centroids to visualize trade winds and thermohaline circulation.
- **Technique:**
  1. Pass cell centroid spherical coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$ to a vertex shader.
  2. Use Slerp (Spherical Linear Interpolation) across parameter $t \in [0, 1]$:
     $$\mathbf{p}(t) = \frac{\sin((1-t)\theta)}{\sin\theta} \mathbf{p}_1 + \frac{\sin(t\theta)}{\sin\theta} \mathbf{p}_2$$
  3. Offset vertex position along the normal by altitude $h(t) = 4 h_{max} t(1-t)$ for parabolic trajectory visualization.

---

## 6. Testing & Pull Request Checklist

Before submitting a PR to [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife):

- [ ] All code written in strict TypeScript.
- [ ] No external runtime dependencies introduced without RFC discussion.
- [ ] First Law verified: transfers between cells sum to zero ($\sum \Delta \text{Stock} = 0$).
- [ ] Second Law verified: entropy generation is non-negative ($\Delta S \ge 0$).
- [ ] Verified via `npx tsx tests/sprint_046.test.ts`.

Join our GitHub Discussions and happy hacking!