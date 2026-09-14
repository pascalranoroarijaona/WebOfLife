<!-- DevRel Onboarding & Contributor Guide -->

# Welcome to Sprint 022: Spatial Resolution Tier Boundary Enforcement

Hello Web of Life Developers and Open-Source Contributors! 

Welcome to the Sprint 022 onboarding guide. In this sprint, we introduce strict boundary validation for Uber's H3 hierarchical hexagonal spatial index within `src/spatial/h3_grid.ts`. As our simulation tracks energetic monads and material stocks (Carbon, Water, Minerals, Oxygen) across planetary surfaces, ensuring that resolution tiers remain strictly within $[0, 15]$ is critical to preserving topological integrity and adhering to thermodynamic conservation laws.

---

## 🚀 Quickstart for Developers

If you are setting up your development environment for the first time, follow these steps to get your workspace running:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 022 Test Suite:**
   ```bash
   npx tsx tests/sprint_022.test.ts
   ```

---

## 🛠️ Good First Issues & Contribution Extensions

Are you looking to contribute to the Web of Life ecosystem? Here are two designated tracks for new and veteran contributors to expand our simulation engine:

### Track 1: Building New Monad Types (`src/monads/`)
Monads represent encapsulated bundles of matter, energy, and behavior. 
- **The Challenge:** Implement a new specialized monad (e.g., an *Atmospheric Flux Monad* or *Hydrological Cycle Monad*) that interacts with spatial grid cells.
- **Extension Point:** Extend `SpatialMonadState` in `src/spatial/h3_grid.ts` or create a new handler in `src/monads/`. Ensure all state transformations pass through `assertValidResolution()` when scaling across spatial tiers.
- **Testing:** Add your unit tests in a new file `tests/sprint_022_monad.test.ts` and run via `npx tsx tests/sprint_022_monad.test.ts`.

### Track 2: WebGL Shader Extensions (`src/renderer/shaders/`)
To visualize planetary-scale energetic flows and H3 hexagonal boundaries in real-time:
- **The Challenge:** Write or extend a WebGL fragment shader that renders resolution-dependent density heatmaps for carbon and water stocks.
- **Extension Point:** Add custom GLSL shaders under `src/renderer/shaders/` and wire them into the simulation viewport renderer.
- **Validation:** Confirm performance metrics and visual correctness across resolutions $r \in [0, 15]$.

---

## 🧪 Testing Guidelines

We enforce strict test-driven development. Never commit changes without verifying them against the TypeScript test runner:
```bash
npx tsx tests/sprint_022.test.ts
```
Ensure your contributions include edge-case validation, proper TypeScript typing, and adherence to our thermodynamic invariance principles. Happy coding!