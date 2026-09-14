<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 009: Community Onboarding & Contributor Guide

Welcome to the **Web of Life (Gaia Simulation)** open-source ecosystem! In **Sprint 009**, we introduce a rigorous thermodynamic foundation: **`src/thermodynamics/constants.ts`**, establishing centralized physical constants, temperature normalization engines, Arrhenius kinetics, and Stefan-Boltzmann radiative balance.

---

## 🚀 Getting Started

If you are a new contributor, follow these steps to set up your environment, run the codebase, and verify your changes.

### 1. Environment Setup
Ensure you have **Node.js** (v18+ recommended) installed. Clone the repository and install dependencies using **npm**:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **CRITICAL NOTE:** This repository is a TypeScript/Node.js project. Never use Python tools like `pip` or `pytest`. 

### 2. Running the Sprint Tests
Verify that your local environment is configured correctly by running the Sprint 009 test suite via `npx tsx`:

```bash
npx tsx tests/sprint_009.test.ts
```

---

## 🛠️ Core Architecture: Sprint 009

Sprint 009 formalizes thermodynamic laws across spatial monads. The primary modules are structured as follows:

- **`IThermodynamicConstants`**: Codifies fundamental constants ($σ$, $S_0$, $R$, $T_0$, planetary bounds).
- **`TemperatureNormalizationEngine`**: Implements `ITemperatureNormalizer`, providing scale conversion ($^\circ\text{C} \leftrightarrow \text{K}$), Arrhenius metabolic scaling factors, and blackbody radiation dissipation rates.

---

## 💡 Good First Issues & Extension Points

Want to contribute to the Gaia simulation? Here are two designated entry points for external contributors:

### 1. Building a New Spatial Monad (`src/monads/`)
Spatial monads manage local stocks ($\mathcal{T}$, nutrients, biomass). 
* **Extension Point:** Create a new subclass extending `SpatialMonad` that implements custom advection-diffusion heat transfer or localized geothermal vents.
* **Good First Issue:** Implement a `GeothermalVentMonad` that injects constant internal heat flux ($\Delta \mathcal{S}_{\text{geo}}$) into the energy balance equation:
  $$\mathcal{T}_{t+1} = \mathcal{T}_{t} + \Delta \mathcal{S}_{\text{solar}} - \Delta \mathcal{S}_{\text{radis}} + \Delta \mathcal{S}_{\text{geo}} + \nabla \cdot \vec{\mathbf{Q}}_{\text{adjacent}}$$

### 2. Creating New WebGL Shaders (`src/shaders/`)
Visualize thermal gradients and metabolic activity in real time using WebGL.
* **Extension Point:** Write fragment shaders that sample spatial monad temperatures normalized by `PLANETARY_TEMP_MIN_K` and `PLANETARY_TEMP_MAX_K`.
* **Good First Issue:** Implement a thermodynamic heat-map fragment shader (`thermal_gradient.frag`) that maps Kelvin temperatures from $200\text{ K}$ (deep blue) to $350\text{ K}$ (fiery red/white).

---

## 🧪 Submitting Contributions

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Implement your feature alongside unit tests in `tests/`.
3. Validate your code:
   ```bash
   npx tsx tests/sprint_009.test.ts
   ```
4. Push to GitHub and submit a Pull Request against `https://github.com/pascalranoroarijaona/WebOfLife`.