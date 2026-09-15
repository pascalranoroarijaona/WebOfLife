<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 067 Contributor Guide: Exact Geodesic Interface Metrics (`DetailedInterfaceNormalResult`)

Welcome to Sprint 067 of **Web of Life**! 

Whether you are a numerical modeler, computational geometer, WebGL rendering engineer, or distributed systems programmer, this sprint introduces a foundational spatial primitive for planetary thermodynamics: `DetailedInterfaceNormalResult` in `src/spatial/h3_types.ts`.

---

## 1. Executive Overview & Scientific Motivation

In discrete global grid systems (DGGS) such as Uber H3 on the spherical manifold $\mathbb{S}^2$, conservative finite-volume transport (advection, diffusion, conduction, and biological migration) across adjacent hexagonal or pentagonal cells requires precise geometric parameters along the shared interface boundary:
1. **Outward Unit Normal ($\hat{\mathbf{n}}_{ij}$)**: The tangent-plane unit normal vector directed from cell $i$ across the shared edge into cell $j$.
2. **Metric Arc Length ($L_{ij}$)**: The great-circle boundary distance in meters ($R_{\oplus} \Delta \sigma$).
3. **Alignment Metric ($\cos\theta_{ij}$)**: The directional cosine projection between the centroid separation chord and the boundary normal vector ($\hat{\mathbf{d}}_{ij} \cdot \hat{\mathbf{n}}_{ij}$), critical for correcting non-orthogonal cell distortions.

Sprint 067 codifies this standard interface in `src/spatial/h3_types.ts`, creating a unified, zero-copy typing foundation for monadic planetary fluxes.

---

## 2. Quickstart: Setting Up Your Development Environment

Our core engine is built strictly in **TypeScript** executed on **Node.js**.

### 2.1 Repository Setup
Clone the official repository and install project dependencies:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2.2 Running Sprint Verification Tests
Execute the Sprint 067 test suite using `tsx`:
```bash
npx tsx tests/sprint_067.test.ts
```

To run type verification across the entire monad and spatial toolchain:
```bash
npm run build # or npx tsc --noEmit
```

---

## 3. Architecture Deep-Dive: `DetailedInterfaceNormalResult`

Located in `src/spatial/h3_types.ts`:

```typescript
/**
 * Detailed geometric and directional properties of an H3 cell interface boundary.
 * Used for conservative finite-volume advection and diffusion across cell edges.
 */
export interface DetailedInterfaceNormalResult {
  /**
   * 3D unit normal vector [nx, ny, nz] on the unit sphere S^2,
   * tangent to S^2 at the interface midpoint, oriented outward from cell i toward cell j.
   */
  readonly normal: readonly [number, number, number];

  /**
   * Great-circle arc length of the shared boundary segment in meters (WGS84 spherical approximation).
   * L_ij = R_earth * Delta_sigma_ij
   */
  readonly arcLengthMeters: number;

  /**
   * Cosine of the angle between the centroid-to-centroid unit vector and the boundary normal vector.
   * alignmentCos = dot(d_ij_hat, normal). Equal to 1.0 on a flat regular hexagonal grid.
   */
  readonly alignmentCos: number;
}
```

### Why a Readonly Tuple for Vectors?
Notice that `normal` is typed as `readonly [number, number, number]` rather than an object `{ x, y, z }` or a high-level `Vector3` class instance. This design ensures:
- **Zero allocation overhead**: Can directly slice into and out of linear `Float64Array` / WebAssembly SIMD buffers.
- **Monadic immutability**: Prevents unintended side-effects during functional parallel pipeline execution.

---

## 4. "Good First Issues" & Contributor Opportunities

Looking to contribute to Web of Life? Here are curated entry points leveraging `DetailedInterfaceNormalResult`:

### Issue #1: Adjacency Normal Vector Validator Utility [Good First Issue - Spatial Math]
- **Target Subsystem**: `src/spatial/h3_adjacency.ts` & `tests/spatial/adjacency_normal.test.ts`
- **Goal**: Implement a pure helper `validateInterfaceNormalInvariants(metricAB: DetailedInterfaceNormalResult, metricBA: DetailedInterfaceNormalResult): boolean` that verifies:
  - Unit norm: $\|\hat{\mathbf{n}}_{ij}\| = 1 \pm 10^{-12}$.
  - Anti-symmetry: $\hat{\mathbf{n}}_{ij} = -\hat{\mathbf{n}}_{ji}$.
  - Equal arc lengths: $|L_{ij} - L_{ji}| < 10^{-9}\text{ m}$.
  - Symmetrical alignment metric: $|\alpha_{ij} - \alpha_{ji}| < 10^{-9}$.

### Issue #2: WebGL Boundary Flux Vector Field Shader [Good First Issue - WebGL / Graphics]
- **Target Subsystem**: `src/rendering/shaders/flux_boundary.frag.glsl`
- **Goal**: Write a GLSL fragment shader displaying atmospheric/oceanic flux magnitude as directional ribbons on the planetary globe:
  - Input: Buffer of cell edges, interface normal vectors, and computed scalar flux values.
  - Output: Projected arrowheads or tangent streamlets perpendicular to interface normals.
  - Shader snippet idea:
    ```glsl
    precision highp float;
    varying vec3 vInterfaceNormal;
    varying float vFluxRate;
    void main() {
      // Color gradient based on net export (blue = positive flux, red = negative flux)
      vec3 fluxColor = mix(vec3(0.1, 0.4, 0.9), vec3(0.9, 0.2, 0.1), clamp(vFluxRate * 0.5 + 0.5, 0.0, 1.0));
      gl_FragColor = vec4(fluxColor, 0.85);
    }
    ```

### Issue #3: Monadic Atmospheric Advection Kernel [Intermediate - Monads / Physics]
- **Target Subsystem**: `src/monads/advection_monad.ts`
- **Goal**: Implement a `SpatialAdvectionMonad` step utilizing `DetailedInterfaceNormalResult`:
  - Calculate upwind state concentrations for air mass and water vapor.
  - Assert conservative divergence $\sum_j J_{ij} = 0$ over the full closed manifold.

---

## 5. Extension Guide: Building Custom Monads with Interface Metrics

To consume `DetailedInterfaceNormalResult` in a custom monad:

```typescript
import { DetailedInterfaceNormalResult } from '../spatial/h3_types';

export interface SoluteCellState {
  readonly massKg: number;
  readonly volumeM3: number;
}

export function computeConservativeSoluteFlux(
  metric: DetailedInterfaceNormalResult,
  cellA: SoluteCellState,
  cellB: SoluteCellState,
  velocityMidpoint: readonly [number, number, number],
  columnDepthM: number,
  dtSeconds: number
): { readonly deltaMassA: number; readonly deltaMassB: number } {
  const [nx, ny, nz] = metric.normal;
  const [vx, vy, vz] = velocityMidpoint;

  // 1. Normal velocity projection
  const uNormal = vx * nx + vy * ny + vz * nz;

  // 2. Interface cross-sectional area
  const areaM2 = metric.arcLengthMeters * columnDepthM;

  // 3. Upwind solute concentration
  const concA = cellA.massKg / cellA.volumeM3;
  const concB = cellB.massKg / cellB.volumeM3;
  const concUpwind = uNormal >= 0 ? concA : concB;

  // 4. Volumetric flux rate
  const volumetricFlux = uNormal * areaM2;
  const massFluxKg = volumetricFlux * concUpwind * dtSeconds;

  return {
    deltaMassA: -massFluxKg,
    deltaMassB: massFluxKg
  };
}
```

---

## 6. Community & Communication

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Contribution Guidelines**: Ensure all pull requests include strict typing, unit tests under `tests/`, and passing runs with `npx tsx tests/sprint_067.test.ts`.
- **Questions & Discussions**: Open an issue or join the community discussion on GitHub!
```

---