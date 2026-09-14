<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 044 Contributor Guide: H3 DGGS Baseline STP Thermodynamic State Factory

Welcome to the contributor guide for **Sprint 044** of **Web of Life**! 

In this sprint, we established the foundational baseline thermodynamic factory: `createDefaultH3CellThermodynamicState` inside `src/spatial/h3_state_tensor.ts`. This factory guarantees that discrete global grid cells (H3 DGGS) are instantiated at Standard Temperature and Pressure (STP) in rigorous compliance with the First and Second Laws of Thermodynamics.

Whether you are building new monadic simulation pipelines, writing WebGL compute/render shaders, or refining biogeochemical flux kernels, this guide will walk you through the system architecture, how to get started locally, and accessible "Good First Issues" to tackle.

---

## 1. Project Repository & Tech Stack Overview

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Runtime & Language**: Node.js (v18+ or v20+ recommended), TypeScript 5.x.
- **Strict Guidelines**:
  - The project is 100% TypeScript.
  - Do **not** use `pip`, `python`, or `pytest`.
  - All package management is handled via `npm`.
  - Fast test execution uses `tsx` (`npx tsx`).

---

## 2. Quickstart: Setup & Running Tests

Clone the repository and install dependencies:

```bash
# 1. Clone repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies via npm
npm install

# 3. Run Sprint 044 verification tests
npx tsx tests/sprint_044.test.ts
```

All tests should pass, confirming that baseline STP states, hydrostatic atmospheric column calculations, and cell area scalings meet strict conservation checks.

---

## 3. What Was Built in Sprint 044?

### 3.1 The Problem It Solves
When partitioning Earth's surface into an H3 Discrete Global Grid System (DGGS), initializing cells with arbitrary values leads to thermodynamic drift—phantom energy or matter creation ex nihilo.

Sprint 044 introduces `createDefaultH3CellThermodynamicState(h3Index, overrides?)`, which acts as the **unit morphism $\eta$** for our spatial state monad:
$$\eta: \text{H3Index} \longrightarrow \text{SpatialMonad}\langle \text{IH3CellThermodynamicState} \rangle$$

### 3.2 Key Thermodynamic Specifications
For any given H3 cell index (at resolution $r \in [0, 15]$):
1. **Geodesic Area Scaling**:
   $$A(r) = \bar{A}_0 \cdot 7^{-r}, \quad \bar{A}_0 \approx 4.357419 \times 10^{12}\text{ m}^2$$
2. **Standard Atmospheric Column**:
   - Surface pressure $P_0 = 101,325.0\text{ Pa}$
   - Surface temperature $T_0 = 288.15\text{ K}$ ($15.0^\circ\text{C}$)
   - Total column mass: $M_{atm} = A \cdot \frac{P_0}{g_0}$, where $g_0 = 9.80665\text{ m/s}^2$
   - Wet air stoichiometry at $60\%$ relative humidity ($N_2 \approx 77.3\%$, $O_2 \approx 20.7\%$, $H_2O_{(g)} \approx 1.01\%$, $CO_2 = 420\text{ ppm}$).
3. **Four Coupled Spheres**:
   - **Atmosphere**: $N_2$, $O_2$, $CO_2$, $H_2O_{(g)}$ molar stocks.
   - **Hydrosphere**: $50.0\text{ kg/m}^2$ baseline liquid surface water film.
   - **Lithosphere**: $1\text{ m}$ active soil column ($12\text{ kg C/m}^2$ SOC, $1288\text{ kg/m}^2$ minerals, $200\text{ kg/m}^2$ moisture).
   - **Biosphere**: $2.50\text{ kg/m}^2$ autotrophs, $0.015\text{ kg/m}^2$ heterotrophs, $0.75\text{ kg/m}^2$ detritus.
4. **Energy & Entropy Invariants**:
   - $U_{cell} = U_{atm} + U_{hydro} + U_{litho} + U_{bio}$ accounting for sensible and latent heat of vaporization ($L_v(T_0) \approx 2.465 \times 10^6\text{ J/kg}$).
   - $S_{cell}$ computed via component standard molar entropies at LTE.
   - All state tensors are deeply immutable (`Object.freeze`).

---

## 4. Developer Usage Example

```typescript
import { createDefaultH3CellThermodynamicState } from './src/spatial/h3_state_tensor';
import { SpatialMonad } from './src/monads/spatial_monad';

// Resolution 7 hexagon index (e.g., area ~ 5.29 km²)
const h3Index = '872830828ffffff';

// Instantiate baseline STP state
const cellState = createDefaultH3CellThermodynamicState(h3Index);

console.log(`Cell Resolution: ${cellState.resolution}`);
console.log(`Cell Area: ${cellState.areaM2.toLocaleString()} m²`);
console.log(`Atmospheric Mass: ${(cellState.atmosphere.surfacePressurePa * cellState.areaM2 / 9.80665).toExponential(3)} kg`);
console.log(`Internal Energy: ${cellState.internalEnergyJoules.toExponential(3)} J`);

// Wrap in SpatialMonad for functional transformations
const cellMonad = SpatialMonad.of(cellState);
const warmedCell = cellMonad.map(state => ({
  ...state,
  temperatureKelvin: state.temperatureKelvin + 1.5 // 1.5 K warming anomaly
}));
```

---

## 5. Extension Points & Good First Issues

Looking to contribute to Web of Life? Here are curated issues and architectural extension points:

### Good First Issue #1: Marine/Oceanic Cell Preset
- **File**: `src/spatial/h3_state_tensor.ts`
- **Task**: Currently, `createDefaultH3CellThermodynamicState` sets hydrosphere salinity to `0.0 PSU` and lithosphere soil to standard pedosphere. Add a `CellBiomePreset` parameter (`'terrestrial' | 'marine' | 'cryosphere'`). For `'marine'`, set water column depth (e.g., $4000\text{ m}$ average bathymetry), salinity to $35.0\text{ PSU}$, and zero out topsoil mineral mass.
- **Skills**: TypeScript interfaces, unit testing.

### Good First Issue #2: Monadic Mass Balance Verification Operator
- **File**: `src/monads/validation_monad.ts`
- **Task**: Write a monadic validator `validateMassConservation(prevState, nextState)` that verifies $\sum M_{stocks, t+1} - \sum M_{stocks, t} = \Delta M_{boundary}$ within a $10^{-7}$ relative error tolerance.
- **Skills**: Functional programming, TypeScript generics.

### Extension Point #3: WebGL State Packing Shader for Hexagonal Tile Rendering
- **Target**: `src/rendering/shaders/h3_thermo_vertex.glsl` & `h3_thermo_fragment.glsl`
- **Task**: Pack the thermodynamic state tensor into a WebGL float texture (DataTexture) or attribute buffer:
  - `vec4 a_Atmosphere`: $(n_{N_2}, n_{O_2}, n_{CO_2}, n_{H_2O})$ normalized by area.
  - `vec4 a_Thermodynamics`: $(T, U, S, P)$.
  - Create a fragment shader visualizing cell surface temperature gradients or soil moisture anomalies using an aesthetic colormap (e.g., Viridis or Turbo).
- **Skills**: WebGL 2.0 / GLSL ES 3.00, buffer management.

### Extension Point #4: Horizontal Vapor Advection Flux Monad
- **Target**: `src/monads/spatial_monad.ts` & `src/spatial/advection.ts`
- **Task**: Implement an advective transport operator between adjacent H3 cells (using `h3GetNeighbors(h3Index)`). Transfer water vapor moles proportionally to wind velocity vectors across hexagonal boundaries while strictly conserving total molar mass and updating sensible enthalpy.
- **Skills**: Discrete differential operators, thermodynamics.

---

## 6. How to Submit a Pull Request

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/marine-cell-thermodynamic-preset
   ```
2. Implement your feature and include unit tests in `tests/`.
3. Verify your changes pass type checks and tests:
   ```bash
   npx tsc --noEmit
   npx tsx tests/sprint_044.test.ts
   ```
4. Open a PR against `main` on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife) citing the RFC or issue number.

Welcome aboard, and happy hacking!