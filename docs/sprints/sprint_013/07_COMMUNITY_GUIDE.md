<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 13 Developer Relations & Open-Source Community Onboarding Guide

Welcome to the **Web of Life** repository! This guide is designed for developers, researchers, and open-source contributors joining us for **Sprint 13**. In this sprint, we focus on hardening spatial boundary interfaces through rigorous null-check guard clauses for incoming H3 string payloads and integrating thermodynamic entropy management inside our spatial monads (`SpatialMonad`).

---

## 1. Quick Start & Environment Setup

The Web of Life simulation architecture is built on **TypeScript** and **Node.js**. 

> **CRITICAL NOTE:** We do **NOT** use Python, `pip`, or `pytest`. All dependencies and test suites are managed via Node.

### Installation & Test Execution
To set up your local development workspace and run the test suite, execute the following commands in your terminal:

```bash
# 1. Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies using npm
npm install

# 3. Run the Sprint 13 verification test suite
npx tsx tests/sprint_013.test.ts
```

---

## 2. Architecture Overview: Sprint 13 Changes

Sprint 13 introduces strict boundary validation to preserve mass-energy conservation across spatial topologies:
- **`src/spatial/h3_types.ts`**: Defines the `IH3PayloadGuard` interface contract.
- **`src/spatial/h3_grid.ts`**: Implements `H3GridManager.guardPayload()`, intercepting `null`, `undefined`, and whitespace strings to prevent unstructured error propagation.
- **`src/monads/spatial_monad.ts`**: Encapsulates spatial states and traps thermodynamic exceptions safely via `SpatialMonad.empty()`.

---

## 3. Good First Issues & Extension Points

Are you an external contributor looking to make your first commit? Here are two designated extension points where you can build new monads or expand our WebGL shaders while adhering to our thermodynamic design patterns:

### Extension Point A: Building Custom Monads (`src/monads/`)
If you want to introduce a new domain monad (e.g., `TrophicMonad` or `EnergyMonad`), follow the pattern established in `SpatialMonad`:
1. **Enforce Conservation:** Ensure state initialization checks for `null` or `undefined` inputs and defaults to a safe, empty container state.
2. **Trap Exceptions:** Wrap transformation functions (`chain`) in `try/catch` blocks to prevent downstream systemic collapse.
3. **Contribute Tests:** Add your verification script under `tests/` and execute it using `npx tsx tests/sprint_N.test.ts`.

### Extension Point B: WebGL Shaders & Spatial Rendering (`src/rendering/` or `src/shaders/`)
For contributors interested in visualization and WebGL:
1. **Shader Safety:** Ensure uniform variables receiving spatial indices validate payloads on the CPU side using `H3GridManager.guardPayload` before dispatching buffers to the GPU.
2. **Entropy Tracking:** Link shader fragment color outputs to the monad's `isCorrupted()` state to visually render invalid spatial zones as dormant (zero-energy) thermodynamic voids.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/your-awesome-feature`
2. Commit your changes following conventional commit messages.
3. Verify all tests pass locally: `npx tsx tests/sprint_013.test.ts`
4. Open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Happy coding, and welcome to the Web of Life community!