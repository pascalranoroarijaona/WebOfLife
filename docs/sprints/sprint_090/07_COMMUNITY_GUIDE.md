<!-- DevRel Onboarding & Contributor Guide -->
# Developer & Contributor Guide: Sprint 090
## Pure Pentagon Resolution Index Verification & Aperture Orientation Invariance

Welcome to the **Web of Life** open-source contributor community! In Sprint 090, we tackled a subtle geometric and thermodynamic challenge in discrete global grid systems (DGGS): eliminating aperture-rotation artifacts at the 12 pentagonal vertices of the planetary icosahedron.

This guide will walk you through the new features implemented in `src/spatial/h3_adjacency.ts`, demonstrate how to set up your local development environment, and highlight "Good First Issues" for contributors looking to build new thermodynamic monads and WebGL shaders.

---

## 1. Executive Summary: What Sprint 090 Introduced

The Earth Pod thermodynamic engine discretizes the biosphere across an Aperture-7 ($\mathrm{Ap}7$) hexagonal/pentagonal hierarchy. In this tessellation:
- The 12 topological pentagonal cells reside at the vertices of the regular icosahedron.
- Tessellation levels alternate between **Class II** (even resolutions $r \equiv 0 \pmod 2$, zero net aperture rotation: $\theta_{\mathrm{ap}} = 0$) and **Class III** (odd resolutions $r \equiv 1 \pmod 2$, rotated by $\theta_{\mathrm{ap}} \approx \pm 19.1063^{\circ}$).
- When a pentagonal cell is scaled along the concentric center-child trajectory ($d_k = 0$) to an even resolution, it retains the base cell's coordinate alignment.

Sprint 090 introduces `isPurePentagonResolutionIndex` in `src/spatial/h3_adjacency.ts`. This utility enables simulation kernels and monads to immediately detect when rotational coordinate transformation matrices can be safely bypassed, guaranteeing zero artificial numerical vorticity and exact mass/energy conservation.

---

## 2. Quickstart & Local Environment Setup

### 2.1 Repository Setup
The official repository is located at:
**[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)**

Clone the repository and install the dependencies via Node.js and npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note**: Our engine is purely TypeScript on Node.js. Do not use Python or pip.

### 2.2 Running Sprint 090 Tests
Execute the Sprint 090 test suite directly using `npx tsx`:

```bash
npx tsx tests/sprint_090.test.ts
```

All 20+ unit tests validating numeric resolutions, cell index bit patterns, and thermodynamic boundary flux conservation should pass with zero warnings.

---

## 3. Architecture & Code Deep Dive

### 3.1 Interface Contract
In `src/spatial/h3_adjacency.ts`:

```typescript
import {
  H3Index,
  PENTAGON_BASE_CELLS,
  H3_MAX_RESOLUTION,
  H3_MIN_RESOLUTION,
  DIRECTION_CENTER
} from './h3_types';
import { getResolution, getBaseCell, getIndexDigit } from './h3_grid';

/**
 * Evaluates whether a given H3 cell index or resolution represents a pure pentagon
 * resolution index.
 *
 * @param target - The H3 index (as hex string or bigint) or a resolution integer (0-15).
 * @param resolution - Optional resolution override when target is an index.
 * @returns true if target is a pentagon at an even resolution with center child digits.
 */
export function isPurePentagonResolutionIndex(
  target: string | bigint | number,
  resolution?: number
): boolean;
```

### 3.2 Dual Overload Behavior
1. **Numeric Resolution Overload**:
   ```typescript
   isPurePentagonResolutionIndex(0);  // true (Class II)
   isPurePentagonResolutionIndex(1);  // false (Class III, aperture rotated)
   isPurePentagonResolutionIndex(2);  // true (Class II)
   isPurePentagonResolutionIndex(7);  // false
   isPurePentagonResolutionIndex(16); // false (out of bounds)
   ```
2. **H3 Cell Index Overload**:
   ```typescript
   // Res 0 pentagon (base cell 4) -> true
   isPurePentagonResolutionIndex("8009fffffffffff"); 
   
   // Res 1 child of pentagon with digit 0 -> false (odd res, aperture skewed)
   isPurePentagonResolutionIndex("81083ffffffffff"); 
   
   // Res 2 child of pentagon with digits 0,0 -> true (even res, pure alignment)
   isPurePentagonResolutionIndex("820807fffffffff"); 
   
   // Hexagonal base cell -> false
   isPurePentagonResolutionIndex("801ffffffffffff"); 
   ```

---

## 4. Good First Issues & Extension Points

We welcome community pull requests! Here are high-impact extension points suited for new contributors:

### Issue #GFI-090-A: WebGL Aperture Rotation Debug Shader
- **Domain**: WebGL2 / GLSL Shader
- **Goal**: Build an interactive vertex/fragment shader visualizer highlighting the 12 pentagonal vertices across resolutions 0 through 6.
- **Specification**: Render pure pentagons ($r \pmod 2 === 0$) with a gold outline ($\theta = 0^{\circ}$) and rotated pentagons ($r \pmod 2 \ne 0$) with a cyan outline showing the $\pm 19.1063^{\circ}$ orientation vector.
- **File Target**: `src/rendering/shaders/pentagon_aperture_debug.glsl.ts`

### Issue #GFI-090-B: SpatialFluxMonad Unaligned Boundary Fast-Path
- **Domain**: Thermodynamic Monads (`src/monads/`)
- **Goal**: Integrate `isPurePentagonResolutionIndex` into `SpatialFluxMonad` to skip 2D rotation matrix multiplication when transferring convective and diffusive fluxes across unrotated pentagons.
- **Verification**: Ensure enthalpy and mass conservation to within $|10^{-15}|$ while reducing tick computation time by $\approx 12\%$ on high-density grid passes.
- **File Target**: `src/monads/spatial_flux_monad.ts`

### Issue #GFI-090-C: CLI Tool for Pentagon Ancestry Inspection
- **Domain**: Developer Tooling & CLI
- **Goal**: Create a lightweight CLI command `npm run h3:inspect <hex-index>` that outputs:
  - Base Cell ID
  - Cell Resolution
  - Is Pentagon? (`true`/`false`)
  - Directional Path Digits (`[d_1, ..., d_r]`)
  - Pure Pentagon Resolution Status (`true`/`false`)
  - Orientation Skew Angle ($\mathrm{deg}$)
- **File Target**: `src/cli/inspect_cell.ts`

---

## 5. Contribution Workflow Checklist

1. **Fork & Branch**: Create a feature branch named `feature/gfi-XXX-short-desc`.
2. **Type Safety**: Strictly adhere to TypeScript strict mode. No `any` types.
3. **Tests**: Add unit tests in `tests/` covering both edge cases and thermodynamic invariants.
4. **Verification**:
   ```bash
   npm run build
   npx tsx tests/sprint_090.test.ts
   npm test
   ```
5. **Pull Request**: Open a PR against `main` on [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) citing the relevant RFC and issue.
```

---