<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 054 Contributor Guide: Longitudinal Boundary Wrapping & Spatial Advection

Welcome to the **Web of Life** contributor community! Whether you are interested in discrete global grid systems, physical monads, or high-performance WebGL planetary visualization, Sprint 054 provides a clean mathematical foundation for spatial coordinate transformations across the antimeridian.

- **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Subsystem:** `src/spatial/h3_adjacency.ts`
- **Related Modules:** `src/monads/spatial_monad.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`

---

## 1. What Did Sprint 054 Achieve?

During planetary atmospheric and oceanic simulation, continuous zonal winds ($u_\lambda$) push coordinates across the International Date Line / antimeridian ($\pm 180^\circ$). If coordinates keep accumulating ($181^\circ, 182^\circ, \dots$), discrete global grid lookups (e.g. Uber H3 `latLonToCell`) fail or return non-existent indices.

Sprint 054 implemented `normalizeLongitudeDegrees(lonDeg: number): number` in `src/spatial/h3_adjacency.ts`:
1. **Range Enforcement:** Strictly maps any longitude $\lambda \in \mathbb{R}$ to the canonical half-open interval `[-180.0, 180.0)`.
2. **Deterministic Date Line Boundary:** Both `+180.0` and `-180.0` map to `-180.0`, eliminating duplicate boundary cells.
3. **Negative-Zero Suppression:** In JavaScript, `-0` can cause split keys in hash maps. The primitive guarantees `normalizeLongitudeDegrees(-0) === 0` (sanitized to `+0.0`).
4. **Thermodynamic Invariance:** Mass and energy are perfectly conserved when spatial state monads step across the antimeridian boundary.

---

## 2. Quickstart: Setting Up Your Environment

Our repository uses **TypeScript** and **Node.js**.

```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies (Node.js & npm)
npm install

# 3. Run the test suite for Sprint 054
npx tsx tests/sprint_054.test.ts
```

All 54 sprint test suites can be executed to ensure zero regression across the thermodynamic simulation stack.

---

## 3. Deep Dive: How to Use `normalizeLongitudeDegrees`

The function is exported directly from `src/spatial/h3_adjacency.ts`:

```typescript
import { normalizeLongitudeDegrees } from './src/spatial/h3_adjacency';

// Standard interior coordinates are untouched:
console.log(normalizeLongitudeDegrees(45.0)); // 45.0
console.log(normalizeLongitudeDegrees(-120.5)); // -120.5

// Antimeridian wrapping:
console.log(normalizeLongitudeDegrees(180.0)); // -180.0
console.log(normalizeLongitudeDegrees(-180.0)); // -180.0
console.log(normalizeLongitudeDegrees(181.5)); // -178.5
console.log(normalizeLongitudeDegrees(-181.5)); // 178.5

// Multi-turn rotations:
console.log(normalizeLongitudeDegrees(540.0)); // -180.0
console.log(normalizeLongitudeDegrees(720.0)); // 0.0

// Negative zero sanitization:
const zero = normalizeLongitudeDegrees(-0);
console.log(Object.is(zero, -0)); // false
console.log(Object.is(zero, 0));  // true
```

---

## 4. Good First Issues for New Contributors

We welcome contributions! Here are three curated **Good First Issues** building on Sprint 054:

### Issue #1: Antimeridian Great-Circle Shortest-Path Monad (`SpatialMonad`)
- **Area:** `src/monads/spatial_monad.ts`
- **Objective:** When calculating geodesic distances between two points $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$, taking the naive difference $|\lambda_2 - \lambda_1|$ across the antimeridian results in traversing $359^\circ$ instead of $1^\circ$.
- **Task:** Implement `computeMinimalAngularSeparation(lonA: number, lonB: number): number` using `normalizeLongitudeDegrees`.
- **Difficulty:** Beginner / Intermediate.

### Issue #2: WebGL Shader Antimeridian Seam Interpolation
- **Area:** `src/rendering/shaders/globe_vertex.glsl`
- **Objective:** GPU vertex shaders interpolating UV coordinates across the $180^\circ$ seam can produce visual stretching artifacts (triangles stretching across the entire globe).
- **Task:** Port the dual-modulo wrapping logic to GLSL (`wrap_longitude(float lon)`) to discard or split triangles that cross the antimeridian.
- **Difficulty:** Intermediate (WebGL / GLSL).

### Issue #3: Vectorized Float64Array Batch Normalization
- **Area:** `src/spatial/h3_adjacency.ts`
- **Objective:** When simulating atmospheric particle systems with $>10^5$ coordinates, calling `normalizeLongitudeDegrees` in a scalar loop can be accelerated.
- **Task:** Create `normalizeLongitudeDegreesBatch(coords: Float64Array, stride?: number): void` for in-place SIMD-friendly vectorization.
- **Difficulty:** Beginner (Performance & TypedArrays).

---

## 5. Extension Points for Community Builders

### Extension Point A: Building a Custom Advection Monad
You can build custom advection monads for specialized physical quantities (such as microplastics, volcanic ash, or oceanic salinity). Follow the monadic structure in `src/monads/`:

```typescript
import { normalizeLongitudeDegrees } from '../spatial/h3_adjacency';

export interface ParticleState {
  lat: number;
  lon: number;
  pollutantMassKg: number;
}

export function advectPollutant(
  p: ParticleState,
  uDeg: number,
  vDeg: number,
  dt: number
): ParticleState {
  return {
    lat: Math.max(-90, Math.min(90, p.lat + vDeg * dt)),
    lon: normalizeLongitudeDegrees(p.lon + uDeg * dt),
    pollutantMassKg: p.pollutantMassKg, // Mass conserved strictly
  };
}
```

### Extension Point B: Planetary Visualization Shaders
If you enjoy WebGL/WebGPU shaders:
- Check `src/rendering/` for our icosahedral grid projection shaders.
- Use `normalizeLongitudeDegrees` logic to map continuous texture coordinates to H3 hexagon centroid coordinates without seam artifacts.

---

## 6. Pull Request & Verification Checklist

Before submitting a Pull Request:
1. Ensure your code is written in TypeScript and adheres to the strict project configuration.
2. Run project tests:
   ```bash
   npx tsx tests/sprint_054.test.ts
   ```
3. Add dedicated unit tests under `tests/` covering boundary conditions, non-finite values (`NaN`, `Infinity`), and thermodynamic conservation.
4. Verify that mass and energy totals remain strictly invariant ($0.0$ drift) across advection steps.
5. Reference the repository in your PR: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).

Happy hacking, and welcome to the Web of Life simulation collective!