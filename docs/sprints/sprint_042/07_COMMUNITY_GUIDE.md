# Developer Onboarding & Community Contributor Guide: Sprint 042

Welcome to Sprint 042 of **WebOfLife**! In this sprint, we bridge discrete global grid spatial partitioning (Uber H3 discrete global grid systems) with non-equilibrium planetary thermodynamics. We have formalized the fundamental per-cell thermodynamic contract: `H3CellThermodynamicState`, its immutable record implementation `H3CellThermodynamicRecord`, and the indexed collection `H3StateTensorContainer`.

Whether you are interested in building new thermodynamic monads, extending planetary biochemical cycles, or writing high-performance WebGL compute and visualization shaders for planetary lattices, this guide will help you get started immediately.

---

## 1. Quickstart & Local Environment Setup

The **WebOfLife** engine is built with **TypeScript** and **Node.js**.

### Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 042 Tests
Verify that your local environment satisfies all thermodynamic and spatial invariants:
```bash
npx tsx tests/sprint_042.test.ts
```

All project test suites and compilation passes can be run using:
```bash
npm test
```

> **Note**: Never use Python, `pip`, or `pytest` in this repository. All simulations, tensor math, monadic transforms, and tests are strictly TypeScript / Node.js.

---

## 2. Sprint 042 Architecture Overview

Sprint 042 introduces control-volume thermodynamics into discrete hexagonal columns:

```
                                  +-----------------------------+
                                  |   H3CellThermodynamicState  |
                                  |         (Interface)         |
                                  +--------------+--------------+
                                                 |
                                                 | implements
                                                 v
                                  +-----------------------------+
                                  |  H3CellThermodynamicRecord  |
                                  |      (Immutable Class)      |
                                  +--------------+--------------+
                                                 |
                                                 | aggregated by
                                                 v
+------------------------+        +-----------------------------+
|    SpatialMonad<T>     | <----> |  H3StateTensorContainer     |
| (Functional Evolution) |        | (Sparse/Dense Tensor Index) |
+------------------------+        +-----------------------------+
```

### Key Modules
- `src/spatial/h3_state_tensor.ts`: Contains the `H3CellThermodynamicState` interface, `H3CellThermodynamicRecord`, and `H3StateTensorContainer`.
- `src/spatial/h3_grid.ts` & `src/spatial/h3_adjacency.ts`: Hexagonal topological coordinates, indexing, and adjacency operators.
- `src/thermodynamics/constants.ts`: Fundamental physical constants (Stefan-Boltzmann constant $\sigma$, solar temperature $T_{\text{sun}}$, dry air and vapor specific heat capacities, latent heats $L_v, L_f, L_s$).
- `src/monads/spatial_monad.ts`: Functional state wrappers enabling chained composable transformations `M.bind(f)`.

### Core Invariants Guaranteed
1. **First Law (Energy & Mass Conservation)**: Column total mass $M_{\text{total}} = M_d + M_w + M_{\text{C}} + M_{\text{N}} + M_{\text{P}}$. Water mass is partitioned with strict closure: $|M_w - (M_l + M_i + M_v)| \le 10^{-7} M_w$.
2. **Second Law (Irreversibility)**: Non-negative entropy generation rate $\sigma_c \ge 0$.
3. **Thermal Positivity**: Temperature is strictly positive ($T_c > 0\,\text{K}$).

---

## 3. Good First Issues for Community Contributors

We have curated several extension points ideal for external contributors looking to dive in:

### Issue #GFI-042-A: Implement Latent Heat Sublimation Monad (`SublimationTransitionKernel`)
- **Difficulty**: Beginner / Intermediate
- **Domain**: Pure Functional Monad / Thermodynamics
- **Goal**: Implement direct ice-to-vapor sublimation and vapor-to-ice desublimation (frost deposition) when $T_c < 273.15\,\text{K}$ and relative humidity conditions warrant direct sublimation.
- **Location**: `src/thermodynamics/phase_sublimation.ts`
- **Specification**:
  - Consume `H3CellThermodynamicRecord` and return a new updated immutable record.
  - Utilize latent heat of sublimation $L_s = L_v + L_f = 2.834 \times 10^6\,\text{J/kg}$.
  - Ensure entropy production $\sigma_{\text{sub}} = |\dot{Q}_{\text{sub}}| \cdot |1/T_c - 1/273.15| \ge 0$.
  - Add unit tests validating mass conservation and water closure in `tests/sublimation.test.ts`.

### Issue #GFI-042-B: Hexagonal Advective Flux Neighbor Router
- **Difficulty**: Intermediate
- **Domain**: Spatial Graph Algorithms & Discrete Advection
- **Goal**: Using `H3Adjacency` from Sprint 041 and `H3StateTensorContainer`, implement an advection step where atmospheric pressure gradients $\nabla P_{kc} = (P_k - P_c)/d_{kc}$ drive air mass and sensible enthalpy transfers across shared cell edges $L_e$.
- **Location**: `src/spatial/h3_advection_kernel.ts`
- **Specification**:
  - Enforce antisymmetric conservation: $J_{c \to k} = -J_{k \to c}$.
  - Ensure mass non-negativity under Courant-Friedrichs-Lewy (CFL) limits: $\Delta t \le d_{kc} / (2 \|\mathbf{u}\|)$.

### Issue #GFI-042-C: WebGL GPGPU Hexagonal Thermodynamic State Visualizer
- **Difficulty**: Intermediate / Advanced
- **Domain**: WebGL2 / GLSL Shaders
- **Goal**: Build an interactive WebGL visualization pipeline rendering the H3 hexagonal lattice colored by scalar fields (temperature Kelvin, net radiative flux, entropy production).
- **Location**: `src/visualization/shaders/hex_thermo.frag` & `src/visualization/h3_webgl_renderer.ts`
- **Specification**:
  - Pack scalar properties ($T_c$, net flux $\Phi_{\text{net}}$, water stocks) into RGBA floating-point textures.
  - Fragment shader interpolates cell centroid values with anti-aliased hexagonal borders.
  - Colormap mapping: divergent colormap for energy balance (red = net heating, blue = net cooling), perceptual thermal map for $T_c \in [200, 320]\,\text{K}$.

---

## 4. Extension Points: Writing a New Thermodynamic Monad

All physical transitions in WebOfLife can be composed functionally using monadic binding. Here is a minimal template for writing your own process kernel:

```typescript
import { H3CellThermodynamicRecord } from '../spatial/h3_state_tensor';

export function myCustomProcessKernel(
  state: H3CellThermodynamicRecord,
  dtSeconds: number
): H3CellThermodynamicRecord {
  // 1. Calculate process dynamics
  const deltaInternalEnergyJ = 100.0 * state.areaM2 * dtSeconds;
  
  // 2. Compute updated thermodynamic variables
  const updatedEnergy = state.internalEnergyJ + deltaInternalEnergyJ;
  const updatedTemperatureK = Math.max(0.1, updatedEnergy / state.heatCapacityJK);
  
  // 3. Return new immutable state using withUpdates
  return state.withUpdates({
    internalEnergyJ: updatedEnergy,
    temperatureK: updatedTemperatureK,
    entropyProductionRateJKs: Math.max(0, state.entropyProductionRateJKs)
  });
}
```

Compose kernels with `SpatialMonad`:
```typescript
const evolvedState = SpatialMonad.of(cellRecord)
  .bind(state => evaluateRadiativeStep(state, dt))
  .bind(state => evaluatePhaseTransitions(state, dt))
  .bind(state => myCustomProcessKernel(state, dt))
  .unwrap();
```

---

## 5. Community & Contribution Workflow

1. Fork `https://github.com/pascalranoroarijaona/WebOfLife`.
2. Create a topic branch: `git checkout -b feature/h3-sublimation-monad`.
3. Implement your changes following TypeScript strict typing and functional immutability conventions.
4. Verify tests pass: `npx tsx tests/sprint_042.test.ts`.
5. Submit a Pull Request referencing the issue ID.

Join our discussions on GitHub and help us scale planetary thermodynamics to global hexagonal resolutions!