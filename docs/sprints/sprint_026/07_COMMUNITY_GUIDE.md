<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 026: Contributor Onboarding & Community Guide

Welcome, Developer and Open-Source Ecosystem Contributor! You have landed on the developer onboarding guide for **Sprint 026** of the **Web of Life** project (`https://github.com/pascalranoroarijaona/WebOfLife`). 

Our architecture enforces strict thermodynamic compliance (zero matter creation/destruction) and type-safe spatial operations using TypeScript and Node.js.

---

## 1. Getting Started in Your Local Environment

Before writing any new monads or WebGL shaders, make sure your local workspace is correctly configured.

### Prerequisites
- **Node.js**: Version 18.x or higher recommended.
- **Package Manager**: `npm` (comes with Node.js).

### Installation
Clone the repository and install the required dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Sprint Tests
We use `tsx` to execute TypeScript test suites directly without a cumbersome pre-compilation step. To run the Sprint 026 verification tests for spatial grid boundary checks:

```bash
npx tsx tests/sprint_026.test.ts
```

---

## 2. Sprint 026 Feature Overview: H3 Spatial Resolution Gates

In Sprint 026, we introduced formal boundary checks for Uber's H3 hierarchical hexagonal spatial index within `src/spatial/h3_grid.ts`. 

- **Valid Tiers**: Integers strictly between `0` and `15`.
- **Thermodynamic Purpose**: Prevents out-of-bounds spatial indexing errors and halts invalid queries immediately ($O(1)$ short-circuit), protecting our simulated solar irradiance monad allocations from entropic waste.

Review the implementation in `src/spatial/h3_grid.ts` and the types in `src/spatial/h3_types.ts` to see how we leverage TypeScript assertion functions (`assertH3Resolution`).

---

## 3. Good First Issues & Extension Points

If you want to contribute to the Web of Life ecosystem, here are two prime areas open for external contributors:

### A. Building New Monads (`src/monads/`)
Monads represent encapsulated units of ecological behavior, energy exchange, or thermodynamic calculation (e.g., Solar Monad, Carbon Monad).
- **Extension Point**: Create a new file under `src/monads/` implementing our base monad interface. Ensure your monad respects mass-energy conservation ($\Delta M = 0$).
- **Good First Issue**: Implement a `WaterCycleMonad` that tracks precipitation and evaporation state transitions without violating planetary water mass totals.

### B. Developing WebGL Shaders (`src/render/shaders/`)
To visualize high-resolution biosphere sub-grids and H3 hexagonal boundaries in real time, we rely on WebGL shaders.
- **Extension Point**: Add custom vertex or fragment shaders under `src/render/shaders/` to render energy gradients or species density maps.
- **Good First Issue**: Write a fragment shader that colors H3 spatial cells dynamically based on their local biomass and resolution tier validation state.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/your-cool-monad`
2. Implement your changes following our TypeScript guidelines.
3. Add a comprehensive test file under `tests/sprint_N.test.ts`.
4. Run your tests locally: `npx tsx tests/sprint_N.test.ts`
5. Open a Pull Request on GitHub against `https://github.com/pascalranoroarijaona/WebOfLife`.

Happy coding, and may your monads remain thermodynamically balanced!