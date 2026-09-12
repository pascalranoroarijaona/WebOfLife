<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 055 Community Guide & Contributor Onboarding: Thermodynamic State Vector Conservation

Welcome to the **Web of Life** repository (`https://github.com/pascalranoroarijaona/WebOfLife`)! In Sprint 055, we introduced the **Thermodynamic State Vector Stock Conservation Delta Calculator** (`src/thermodynamics/state_validator.ts`). This guide covers how to set up your environment, run tests, and contribute new monad processes or WebGL shaders.

---

## 1. Quickstart & Environment Setup

Ensure you have **Node.js** (v18+ recommended) installed. Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We use TypeScript execution tooling to validate our simulation models and thermodynamic constraints. Run the Sprint 055 test suite via:

```bash
npx tsx tests/sprint_055.test.ts
```

---

## 2. Good First Issues for External Contributors

Looking to make your first contribution? Here are two designated "Good First Issues" tied to thermodynamic monads and visualization:

### Issue A: Custom Monad Process Extension (`src/thermodynamics/monad_process.ts`)
* **Objective:** Implement a new biogeochemical cycling monad (e.g., Denitrification Monad or Sulfur Cycle Flux Monad) that outputs compliant `FluxVector` objects.
* **Requirements:**
  1. Inherit from the base monad interface.
  2. Ensure all flux calculations use rates multiplied by $\Delta t$.
  3. Validate outputs using `ThermodynamicStateValidator.calculateDelta()`.
* **Testing:** Add unit assertions in `tests/sprint_055.test.ts` verifying mass conservation under your custom monad.

### Issue B: WebGL Shader Uniform Binding for Flux Visualization (`src/shaders/`)
* **Objective:** Extend the WebGL rendering pipeline to bind stock delta magnitudes (`expectedDelta`) as dynamic fragment shader uniforms.
* **Requirements:**
  1. Update shader uniforms in `src/shaders/flux_fragment.glsl`.
  2. Map the `DeltaCalculationResult.isConserved` boolean to a visual warning color (e.g., shifting to red when thermodynamic thresholds approach machine epsilon limits).
* **Testing:** Validate rendering updates through browser canvas test harnesses.

---

## 3. Contribution Guidelines
1. **Branching:** Create a feature branch off `main` (`git checkout -b feature/your-feature-name`).
2. **Type Safety:** Maintain strict TypeScript typing across all additions (`src/thermodynamics/types.ts`).
3. **Conservation Laws:** Any new state modifier must strictly adhere to First Law mass-energy balance ($\Delta S = \text{Inflow} - \text{Outflow}$) and Second Law non-negativity bounds ($S \ge 0$).
4. **Pull Requests:** Submit your PR against `https://github.com/pascalranoroarijaona/WebOfLife` with a reference to the relevant sprint objectives.