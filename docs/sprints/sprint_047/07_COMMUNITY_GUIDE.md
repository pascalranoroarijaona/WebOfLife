# Contributor & DevRel Onboarding Guide: Sprint 047
## Spherical Geodesic Edge Scaling & Boundary Flux Architecture

Welcome to the **Web of Life** contributor guide for Sprint 047! This sprint introduces `calculateH3EdgeLengthMeters` and the boundary flux transfer mechanics across the Uber H3 Discrete Global Grid System (DGGS).

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Source Files**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_grid.ts`, `src/monads/spatial_monad.ts`
- **Primary Test Suite**: `tests/sprint_047.test.ts`
- **Tech Stack**: TypeScript (strict mode), Node.js (v18+ or v20+), WebGL2 / GLSL shaders

---

## 1. Quickstart: Getting Up and Running

Ensure you have **Node.js** (v18 or v20 LTS) installed. We do not use Python or pip in this engine; all tooling runs through `npm` and `npx`.

```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies
npm install

# 3. Execute the Sprint 047 test suite
npx tsx tests/sprint_047.test.ts
```

All tests should pass, confirming that the spherical geodesic lookup table, asymptotic fallbacks, error guards, and conservation assertions are active.

---

## 2. Sprint 047 Architecture Overview

In Web of Life, planetary thermodynamic exchange occurs over discrete hexagonal columns. When two adjacent cells $i$ and $j$ exchange mass (Fickian diffusion), heat (Fourier conduction), or fluid (Darcy/Saint-Venant surface conveyance), the transfer rate directly depends on the **contact boundary edge length** ($L_{\text{edge}}$) and the **inter-cell distance** ($d_{ij} = \sqrt{3} \cdot L_{\text{edge}}$).

### Key Components

1. **`calculateH3EdgeLengthMeters(resolution: number): number`** in `src/spatial/h3_adjacency.ts`:
   - Returns nominal spherical geodesic edge lengths for resolutions $r \in [0, 15]$.
   - Evaluates asymptotic scaling $L(r) = L_0 \cdot 7^{-r/2}$ for continuous/fractional inputs.
   - Throws `RangeError` for invalid or out-of-range resolutions.

2. **`createH3BoundaryInterface(resolution: number): IH3BoundaryInterface`**:
   - Encapsulates $L_{\text{edge}}$, $d_{ij}$, and contact area calculations $A_{\text{contact}} = L_{\text{edge}} \cdot h$.

3. **`computeBoundaryDiffusionStep(...)`**:
   - Implements strictly conservative, anti-symmetric pairwise transfers: $\Delta M_{ij} = -\Delta M_{ji}$, enforcing First Law conservation $\Delta M_i + \Delta M_j \equiv 0$ and Second Law non-negative entropy production $\sigma \ge 0$.

---

## 3. Good First Issues & Extension Points

Looking to make your first contributions? Here are four high-impact areas ready for PRs:

### Issue #1: Advection-Dispersion Spatial Monad Step (TypeScript)
- **Component**: `src/monads/spatial_monad.ts`
- **Description**: Extend `SpatialMonad<T>` to support combined advective and diffusive mass flux across cell edges.
- **Task**:
  - Implement an upwind differencing scheme where solute is advected in the direction of hydraulic flow:
    $$J_{\text{adv}} = v_{\text{edge}} \cdot C_{\text{upwind}}$$
  - Integrate `calculateH3EdgeLengthMeters(resolution)` to obtain edge cross-sections for flux balance.
- **Acceptance Criteria**: Pass tests verifying mass conservation across a 7-cell hexagonal patch under high velocity gradients.

### Issue #2: WebGL2 GPGPU Hex Edge Boundary Shader (GLSL)
- **Component**: `src/render/shaders/hex_boundary_flux.frag.glsl`
- **Description**: Accelerate inter-cell boundary flux on the GPU for real-time visualization of nutrient transport.
- **Task**:
  - Write a fragment shader that samples a 2D-packed H3 texture atlas containing cell stocks ($M_i$).
  - For each cell, sample the 6 neighboring texels, compute $\Delta C / d_{ij}$ using a uniform edge length `u_edgeLengthMeters`, and output the net flux divergence $\nabla \cdot \mathbf{J}$.
- **Acceptance Criteria**: Render diffusion divergence into a floating-point frame buffer texture and ensure equivalence with the CPU `SpatialMonad` within $10^{-4}$ tolerance.

### Issue #3: Geodesic Pentagonal Correction Factor
- **Component**: `src/spatial/h3_adjacency.ts`
- **Description**: The 12 pentagonal cells in the icosahedral projection possess 5 neighbors rather than 6, with slightly reduced perimeter.
- **Task**:
  - Add an optional boolean parameter `isPentagon?: boolean` or inspect cell topology in `calculateH3EdgeLengthMeters`.
  - Apply the spherical pentagon distortion factor ($\approx 0.952$) when computing boundary contact area for the 12 base pentagons.
- **Acceptance Criteria**: Add unit tests in `tests/sprint_047.test.ts` checking pentagonal edge lengths at resolutions 0 through 5.

### Issue #4: Topographic Slope & Gravity Drainage Operator
- **Component**: `src/hydrology/surface_flow.ts`
- **Description**: Connect digital elevation model (DEM) bedrock data with `calculateH3EdgeLengthMeters`.
- **Task**:
  - Calculate topographic slope $S_{ij} = \frac{z_i - z_j}{d_{ij}}$ across shared edges.
  - Implement Manning's kinematic wave flux across $L_{\text{edge}}$ for surface runoff.
- **Acceptance Criteria**: Ensure water volume is strictly conserved and runs downhill into local depressions without numerical oscillations.

---

## 4. Development & PR Guidelines

1. **Strict Types**: Ensure `npm run build` or `npx tsc --noEmit` passes with zero errors.
2. **Deterministic Physics**: Never use synthetic fudge factors that violate $\sum \Delta M = 0$ or produce negative entropy.
3. **Unit Tests**: Add tests under `tests/` covering boundary cases (`r = 0`, `r = 15`, negative numbers, NaN, non-integers).
4. **Running Validation**:
   ```bash
   npx tsx tests/sprint_047.test.ts
   ```
5. **Submitting**: Open a PR against `main` on [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) with a clear reference to the issue addressed.
```

---