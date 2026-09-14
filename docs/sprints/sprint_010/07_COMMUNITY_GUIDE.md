<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 10 Developer Onboarding & Community Contributor Guide

**Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Target Sprint:** Sprint 10 (`src/spatial/h3_grid.ts`)  
**Tech Stack:** TypeScript, Node.js

---

## 1. Welcome to the Web of Life Community!

Welcome to the **Web of Life** open-source repository! We model ecological stocks, trophic flows, and spatial-temporal dynamics using functional programming principles (monads) and rigorous thermodynamic boundaries. 

Sprint 10 introduces string-level validation for Uber H3 index strings via `H3GridValidator` in `src/spatial/h3_grid.ts`. This ensures that all spatial coordinates bound to Earth-pod telemetry conform strictly to 64-bit hexadecimal formats before entering ecosystem state vectors.

---

## 2. Quickstart Environment Setup

Get your local development workspace up and running in under two minutes:

```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies (Node.js & TypeScript stack)
npm install

# 3. Run the Sprint 10 test suite
npx tsx tests/sprint_010.test.ts
```

---

## 3. Good First Issues & Extension Points

We love external contributors! If you are looking to build new custom monads or WebGL shaders, here are the designated extension points in the codebase:

### A. Building Custom Monads (`src/monads/`)
If you want to create a new ecosystem monad (e.g., carbon sink, water flux, or thermal regulation monad):
1. Extend the base monad interface in `src/monads/`.
2. Implement stock transition functions similar to the spatial validation pipeline:
   $$\text{State}_{\text{unverified}} \xrightarrow{\text{Validator}} \text{State}_{\text{active}}$$
3. Write your unit tests under `tests/`.

### B. Building WebGL Shaders (`src/renderer/` or `shaders/`)
To contribute real-time WebGL shaders for visualising Earth-pod telemetry and spatial hex grids:
1. Locate the rendering pipeline in `src/renderer/`.
2. Write custom GLSL fragment/vertex shaders that ingest H3 spatial indices and thermodynamic state vectors.
3. Hook shader uniforms into the main simulation loop.

---

## 4. Submitting Pull Requests

1. Create a feature branch: `git checkout -b feat/my-new-monad`
2. Implement your changes adhering to $O(1)$ or bounded computational complexities.
3. Run tests locally: `npx tsx tests/sprint_N.test.ts`
4. Open a Pull Request on GitHub against `main`. 

Happy coding, and welcome to the Web of Life!