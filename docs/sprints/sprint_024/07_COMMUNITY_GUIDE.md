<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 24 Developer Onboarding & Community Contribution Guide

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 24**, focusing on spatial resolution tier boundaries ($r \in [0, 15]$), thermodynamic mass/energy conservation, and how you can contribute new spatial monads or WebGL shaders.

---

## 🛠️ Getting Started

Before diving into development, ensure your environment is configured correctly. **Web of Life** is built on a robust TypeScript and Node.js stack.

### 1. Installation
Clone the repository and install dependencies using `npm`:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Running Tests
We enforce strict thermodynamic and spatial boundary checks. Run the test suite using `npx tsx`:
```bash
npx tsx tests/sprint_024.test.ts
```

---

## 🚀 Sprint 24 Feature Overview: Spatial Resolution Tiers

In Sprint 24, we implemented formal resolution tier boundary checks in `src/spatial/h3_grid.ts` and integrated them into `src/monads/spatial_monad.ts`. 

### Key Concepts:
- **H3 Grid Hierarchy:** Uber's H3 index defines discrete global grid systems across 16 explicit resolution tiers ($r \in [0, 15]$).
- **Thermodynamic Guardrails:** 
  - *First Law (Matter Conservation):* Biomass is conserved across hierarchical refinement and compaction.
  - *Second Law (Solar-Driven Flux):* Energy input vectors depend on valid surface cell area projections ($A_r$).

### Core Utilities:
```ts
import { validateResolutionTier, assertResolutionTier } from './src/spatial/h3_grid';

// Validate resolution bounds [0, 15]
validateResolutionTier(8); // true
validateResolutionTier(16); // false

// Enforce assertions
assertResolutionTier(5); // passes
assertResolutionTier(99); // throws [SpatialError]
```

---

## 🌱 Good First Issues for External Contributors

Want to contribute to the Web of Life open-source ecosystem? Here are three curated "Good First Issues" designed for new contributors:

### 1. Implement Carbon Stock Sub-Monad (`Good First Issue`)
- **Objective:** Create a specialized `CarbonMonad` extending `SpatialMonad<EcologicalStock>` that tracks organic vs. inorganic soil carbon pools.
- **Files to touch:** `src/monads/carbon_monad.ts`, `tests/sprint_024_carbon.test.ts`
- **Requirements:** Must validate H3 resolution tiers on instantiation and preserve total carbon stock during spatial refinement.

### 2. WebGL Trophic Energy Heatmap Shader (`Good First Issue`)
- **Objective:** Write a WebGL fragment shader (`src/rendering/shaders/trophic_flux.frag.ts`) that visualizes solar energy flux density $E_{\text{solar}} = \Phi_{\odot} \cdot A_r$ across H3 resolutions.
- **Files to touch:** `src/rendering/shaders/trophic_flux.frag.ts`, `src/rendering/webgl_renderer.ts`
- **Requirements:** Must handle invalid or out-of-bound resolutions gracefully by rendering an error color state.

### 3. Boundary Edge Case Unit Tests (`Good First Issue`)
- **Objective:** Expand `tests/sprint_024.test.ts` to test edge cases including floating-point resolutions (e.g., `3.14159`), negative numbers, and boundary transitions at $r=0$ and $r=15$.
- **Files to touch:** `tests/sprint_024.test.ts`
- **Command:** Run via `npx tsx tests/sprint_024.test.ts`.

---

## 🤝 Contributing Guidelines
1. Fork the repository on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).
2. Create your feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes (`git commit -m 'feat: implement new spatial monad'`).
4. Push to the branch (`git origin push feature/amazing-monad`).
5. Open a Pull Request and ensure all tests pass via `npx tsx tests/sprint_024.test.ts`.