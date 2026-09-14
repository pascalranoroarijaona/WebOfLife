<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 045 Contributor Guide: Granular Thermodynamic Overrides in H3StateTensor

Welcome to Sprint 045 of **WebOfLife**! In this sprint, we implemented `applyThermodynamicOverrides` in `src/spatial/h3_state_tensor.ts` alongside first-class ledgering contracts in `src/spatial/h3_types.ts` and monadic integration in `src/monads/spatial_monad.ts`.

This guide walks you through local setup, architectural foundations, practical code examples, and high-impact "Good First Issues" for extending our simulation engine.

---

## 1. Quickstart & Local Setup

Our project is strictly built on **TypeScript and Node.js**. Ensure you have Node.js (v18+ or v20+ recommended) installed.

### Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Run Sprint 045 Verification Tests
Execute the automated test suite directly using `npx tsx`:
```bash
npx tsx tests/sprint_045.test.ts
```

All 100-cell boundary ledgering tests, thermodynamic limit checks, and monadic invariant assertions will execute against the contiguous Float64 stride buffers.

---

## 2. Architecture Overview: Thermodynamic Overrides & Boundary Ledgers

When simulating discrete planetary systems across hexagonal discrete global grid systems (Uber H3), external interventions—such as volcanic degassing, carbon sequestration, targeted irrigation, or solar radiation management—require partial mutations on specific cells.

Directly mutating array elements introduces thermodynamic drift and violates conservation laws. Sprint 045 introduces:

1. **Contiguous Stride Layout (`ThermodynamicChannel`)**:
   Each cell occupies an 8-channel stride in `Float64Array`:
   - `0`: Temperature ($K$)
   - `1`: Water Mass ($kg$)
   - `2`: Soil Organic Carbon Mass ($kg$)
   - `3`: Vegetation Biomass ($kg$)
   - `4`: Atmospheric $\text{CO}_2$ Mass ($kg$)
   - `5`: Mineral Nitrogen Mass ($kg$)
   - `6`: Sensible Thermal Heat ($J$)
   - `7`: Albedo ($\alpha \in [0, 1]$)

2. **Thermodynamic Realization & Conservation**:
   - **Mass Non-Negativity**: Matter stocks cannot drop below $0.0\,\text{kg}$.
   - **Absolute Zero Enforcement**: Temperatures cannot breach the CMB lower bound ($T \ge 2.7315\,\text{K}$).
   - **Sensible Heat Coupling**: Recalculated dynamically from composite heat capacity $C_p = \sum m_k c_{p,k} + m_{\text{regolith}} c_{p,\text{regolith}}$.
   - **Boundary Flux Accounting**: All mass ($\Delta M$) and energy ($\Delta U$) adjustments are recorded into a `ThermodynamicOverrideReport`.

3. **Monadic State Binding**:
   `SpatialMonad.prototype.applyOverrides(overrides, options)` preserves immutable auditing history while executing zero-copy in-place mutations on the internal buffer.

---

## 3. Developer Example: Applying In-Place Overrides

```typescript
import { H3StateTensor } from './src/spatial/h3_state_tensor';
import { applyThermodynamicOverrides } from './src/spatial/h3_state_tensor';
import { SpatialMonad } from './src/monads/spatial_monad';

// 1. Target H3 cells with partial state mutations
const overrides = {
  '8828308281fffff': {
    temperatureKelvin: 295.15,
    waterMassKg: 12500.0,
    albedo: 0.18,
  },
  '8828308283fffff': {
    vegetationBiomassKg: 4200.0,
    soilOrganicCarbonKg: 18500.0,
  },
};

// 2. Pure function application with strict bounds checking
const report = applyThermodynamicOverrides(tensor, overrides, {
  strictThermodynamicBounds: true,
  recomputeSensibleHeat: true,
});

console.log(`Modified ${report.cellCountModified} cells.`);
console.log(`Net injected mass: ${report.netMassDeltaKg} kg`);
console.log(`Net injected energy: ${report.netEnergyDeltaJoules} J`);

// 3. Monadic pipeline binding
const monad = new SpatialMonad(tensor);
const updatedMonad = monad.applyOverrides(overrides);
console.log(`Cumulative energy delta: ${updatedMonad.getCumulativeNetEnergyDeltaJoules()} J`);
```

---

## 4. "Good First Issues" & Extension Points

We welcome contributions! Below are curated open-source tasks suitable for new contributors looking to explore our computational biology, spatial geometry, and graphics stack.

### Issue #1: WebGL2 Hexagonal Thermal Anomaly Shader
- **Area**: Visualization / WebGL
- **Goal**: Implement a WebGL2 fragment shader rendering thermal anomaly heatmaps directly from the contiguous `H3StateTensor` Float64 buffer via an instanced vertex buffer or floating-point texture (`gl.R32F`).
- **Files to touch**: `src/viz/shaders/thermal_override.frag.glsl`, `src/viz/h3_renderer.ts`.
- **Skills**: WebGL2 / GLSL, color ramps, H3 geometric coordinates.

### Issue #2: Volcanic Eruption Forcing Monad (`VolcanismMonad`)
- **Area**: Monadic Modeling
- **Goal**: Build a specialized monad that accepts a volcanic explosivity index (VEI), identifies the plume footprint using H3 k-ring traversal, and emits a `H3ThermodynamicOverridesMap` injecting $\text{SO}_2$ (atmospheric aerosol mass), heat, and reduced albedo.
- **Files to touch**: `src/monads/volcanism_monad.ts`, `tests/monads/volcanism_monad.test.ts`.
- **Skills**: Functional programming, TypeScript monads, H3 indexing.

### Issue #3: Anthropogenic Direct Air Capture (DAC) Intervention Helper
- **Area**: Thermodynamic Interventions
- **Goal**: Implement a helper function `createDirectAirCaptureOverride(targetCells, targetCo2ReductionKg, energyEfficiencyFactor)` that computes realistic sensible heat emission and mass displacement corresponding to industrial direct air capture.
- **Files to touch**: `src/spatial/interventions/dac.ts`, `tests/spatial/interventions.test.ts`.
- **Skills**: Stoichiometry, First Law thermodynamic accounting.

---

## 5. Submitting Your Contribution

1. Fork `https://github.com/pascalranoroarijaona/WebOfLife` and create your feature branch:
   ```bash
   git checkout -b feature/my-new-monad
   ```
2. Write unit tests in TypeScript under `tests/`.
3. Run tests and linting:
   ```bash
   npx tsx tests/sprint_045.test.ts
   npm run lint
   ```
4. Open a Pull Request referencing the sprint or issue number. Our DevRel and core maintainers review PRs within 48 hours!
```

---