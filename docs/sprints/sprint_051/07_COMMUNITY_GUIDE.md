<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 051 Contributor Guide: H3 Cell Interface Metrics & Boundary Flux Operators

Welcome to Sprint 051 of **Web of Life**! This guide equips contributors, ecological modelers, and graphics programmers with everything needed to understand, implement, and extend the newly standardized inter-cell interface metric contracts.

Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## 1. Overview: What Was Built in Sprint 051?

In previous sprints, our Discrete Global Grid System (Uber H3 DGGS) represented spatial cells via `H3SpatialGrid`, indexed topological neighbors via `H3AdjacencyManager`, and stored multidimensional ecological stocks in `H3StateTensor`. 

However, simulating advective and diffusive transport—such as groundwater flow, overland runoff, atmospheric sensible heat exchange, and nutrient transport—requires exact geometric metrics along the Voronoi shared boundaries between adjacent cells. Sprint 051 defines the formal interface contract:

```typescript
// Defined in src/spatial/h3_types.ts
export interface H3CellInterfaceMetrics {
  readonly originIndex: string;
  readonly neighborIndex: string;
  readonly sharedEdgeLengthMeters: number;
  readonly centroidDistanceMeters: number;
  readonly bearingRadians: number;
  readonly normalVector: readonly [number, number, number];
  readonly atmosphericContactAreaM2: number;
  readonly subterraneanContactAreaM2: number;
  readonly topographicSlope: number;
  readonly geometricConductance: number;
}
```

### Thermodynamic Invariants Enforced
Every interface metric calculation guarantees:
1. **First Law of Thermodynamics (Conservation)**: Shared edge lengths and distances are strictly symmetric ($L_{ij} = L_{ji}$, $d_{ij} = d_{ji}$), while normal vectors and topographic slopes are strictly antisymmetric ($\hat{n}_{ij} = -\hat{n}_{ji}$, $S_{ij} = -S_{ji}$). Net divergence across closed boundaries without internal sources is 0.
2. **Second Law of Thermodynamics (Entropy Production)**: Diffusive transport operators parameterized by `geometricConductance` ($\gamma_{ij} = L_{ij}/d_{ij}$) produce non-negative entropy ($\dot{S}_{\text{gen}} \ge 0$).

---

## 2. Quickstart: Setup & Verification

Web of Life is built natively on **TypeScript** and **Node.js**.

### Clone and Install Dependencies
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Run Sprint 051 Verification Tests
Verify that all geometric invariants and thermodynamic flux deltas pass:
```bash
npx tsx tests/sprint_051.test.ts
```

---

## 3. Architecture & Core Concepts

Cross-cell interactions flow through three distinct architectural layers:

```
+--------------------------------------------------------------+
|                   src/spatial/h3_types.ts                    |
|   - H3CellInterfaceMetrics                                   |
|   - H3NeighborInterfaceMap = ReadonlyMap<string, Metrics>    |
+--------------------------------------------------------------+
                               ▲
                               │ implements / produces
+--------------------------------------------------------------+
|                 src/spatial/h3_adjacency.ts                  |
|   - Computes Voronoi geodesic lengths, normal azimuths,      |
|     subsurface/atmospheric contact areas, and slopes.        |
+--------------------------------------------------------------+
                               ▲
                               │ consumes
+--------------------------------------------------------------+
|                 src/monads/spatial_monad.ts                  |
|   - Evaluates advective, diffusive, and reactive transfers   |
|   - Enforces antisymmetric flux pairing & entropy positivity |
+--------------------------------------------------------------+
```

### Computing Fluxes with Interface Metrics
Here is a minimal pattern demonstrating how `H3CellInterfaceMetrics` parameterizes transport between two cells:

```typescript
import { H3CellInterfaceMetrics } from './src/spatial/h3_types';

export function computeDarcySubsurfaceFlux(
  headOriginM: number,
  headNeighborM: number,
  kSatMPerS: number,
  metrics: H3CellInterfaceMetrics,
  dtSeconds: number
): number {
  // Hydraulic gradient along boundary normal
  const gradHead = (headNeighborM - headOriginM) / metrics.centroidDistanceMeters;
  const darcyVelocityMPerS = -kSatMPerS * gradHead;

  // Cross-sectional transfer across subterranean contact area
  const volumetricFlowM3PerS = darcyVelocityMPerS * metrics.subterraneanContactAreaM2;
  const massFluxKgPerS = volumetricFlowM3PerS * 1000.0; // 1000 kg/m³ density

  return massFluxKgPerS * dtSeconds;
}
```

---

## 4. Good First Issues & Contributor Extension Points

We welcome community pull requests! Below are four curated entry points for new contributors.

### Issue #1: Build an Overland Sediment Monad (Erosion & Deposition)
- **Area**: Ecological Monads (`src/monads/sediment_monad.ts`)
- **Difficulty**: Good First Issue (Beginner to Intermediate)
- **Goal**: Implement a conservative monad that transfers eroded topsoil across cell boundaries driven by overland surface runoff and `topographicSlope`.
- **Inputs**:
  - `metrics.sharedEdgeLengthMeters`
  - `metrics.topographicSlope`
  - Cell state: `surfaceWaterRunoffM3`, `topsoilSedimentKg`.
- **Requirements**:
  - Net sediment delta across adjacent cells must be zero: $\Delta M_{\text{sediment}}(i) + \Delta M_{\text{sediment}}(j) = 0$.
  - Provide unit tests in `tests/sediment_monad.test.ts` verifying mass conservation.

### Issue #2: WebGL Inter-Cell Flux Vector Shader
- **Area**: Visualization (`src/render/shaders/flux_edge.frag`, `flux_edge.vert`)
- **Difficulty**: Intermediate (WebGL / Three.js)
- **Goal**: Visualize inter-cell transport fluxes on the 3D globe using dynamic instanced lines or ribbons aligned with `normalVector` and `bearingRadians`.
- **Inputs**:
  - Attribute buffer: cell centroids $(x, y, z)$ and neighbor unit normal vectors.
  - Uniforms: `u_time`, scalar flux intensity (positive for outward flux, negative for inward).
- **Deliverables**:
  - Shader material with animated dashes flowing along the vector direction.
  - Dynamic thickness scaled by `geometricConductance`.

### Issue #3: Multi-Layer Atmospheric Heat Exchange Operator
- **Area**: Atmospheric Physics (`src/spatial/atmospheric_transport.ts`)
- **Difficulty**: Intermediate
- **Goal**: Implement sensible and latent heat transfer across `atmosphericContactAreaM2` for multi-elevation cells using potential temperature.
- **Requirements**:
  - Verify non-negative entropy generation: $\Delta S = Q \cdot (1/T_j - 1/T_i) \ge 0$.

### Issue #4: Interface Metric Serialization & Protobuf Exporter
- **Area**: Data Pipeline (`src/spatial/serialization.ts`)
- **Difficulty**: Beginner
- **Goal**: Provide high-speed compact serialization/deserialization for `H3NeighborInterfaceMap` to enable cached world grid persistence and fast worker-thread distribution.

---

## 5. Development Workflow & Contribution Checklist

1. **Fork and Branch**:
   ```bash
   git checkout -b feature/issue-number-interface-extension
   ```
2. **Implement Feature**: Follow strict typing (`--strict` mode enabled in `tsconfig.json`).
3. **Write Unit Tests**: Add test assertions checking conservation and invariant conditions.
4. **Run Suite**:
   ```bash
   npx tsx tests/sprint_051.test.ts
   npm test
   ```
5. **Submit PR**: Target the `main` branch of [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) and link your issue!