<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 001: Contributor Onboarding & Developer Guide
**Welcome to the Web of Life Open-Source Community!**

This guide provides a comprehensive walkthrough of the newly released **Directed Acyclic Trophic Graphs (DATG)** and **Lindeman's Efficiency Matrix** engine implemented in `src/biosphere/trophic.ts`. Whether you are looking to build custom energy monads or extend our simulation pipelines, this document will get you up to speed quickly.

---

## 1. Getting Started & Environment Setup

Before writing any code, ensure your local environment is configured with **Node.js** and **TypeScript**.

### Installation
Clone the repository from [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) and install dependencies using npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We use TypeScript execution via `tsx`. To execute the verification test suite for Sprint 001, run:

```bash
npx tsx tests/sprint_001.test.ts
```

---

## 2. Core Architecture Overview (`src/biosphere/trophic.ts`)

Sprint 001 introduces strict thermodynamic constraints to ecosystem energy flows, grounded in two fundamental physical laws:
1. **First Law of Thermodynamics:** Energy can neither be created nor destroyed. The sum of remaining biomass, dissipated metabolic heat, and transferred energy must balance out.
2. **Second Law of Thermodynamics:** Energy transfers between trophic levels are bounded by Lindeman's 10% Rule ($\epsilon \le 0.15$), with the remainder lost as entropic heat dissipation.

### The `TrophicStateMonad`
To maintain pure, immutable state transformations during simulation ticks, all state mutations are wrapped inside the `TrophicStateMonad`. 

```typescript
import { TrophicStateMonad, EcosystemGraphState } from '../biosphere/trophic';

const initialState: EcosystemGraphState = {
    nodes: new Map(),
    edges: [],
    totalSystemJoules: 1000,
    dissipatedHeatJoules: 0
};

const monad = TrophicStateMonad.unit(initialState);
```

---

## 3. "Good First Issues" & Extension Points

Want to contribute to the Web of Life? Here are two designated "Good First Issues" tailored for external contributors wanting to build custom monads or WebGL shaders.

### Good First Issue #1: Custom Energy Monad (`src/utils/custom_monads.ts`)
- **Objective:** Implement a new `StochasticEnergyMonad<T>` that introduces random environmental fluctuations (e.g., drought or solar flare multipliers) into the `TrophicStateMonad` pipeline.
- **Requirements:**
  1. Extend or compose with `TrophicStateMonad`.
  2. Accept a variance coefficient $\sigma \in [0.0, 0.5]$.
  3. Write a corresponding unit test in `tests/sprint_001_custom.test.ts`.

### Good First Issue #2: WebGL Trophic Heat Dissipation Shader (`src/renderer/shaders/trophic_heat.frag`)
- **Objective:** Build a fragment shader to visualize metabolic heat dissipation across trophic levels in real-time.
- **Requirements:**
  1. Map `dissipatedHeatJoules` to a color gradient ranging from cool blue (low entropy) to radiant red/yellow (high thermal dissipation).
  2. Integrate the shader uniform bindings inside `src/earth_pod.ts`.

---

## 4. Contributing Guidelines
1. Fork the repository on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes with descriptive messages.
4. Ensure all tests pass (`npx tsx tests/sprint_001.test.ts`).
5. Open a Pull Request against the `main` branch.

Happy coding, and welcome aboard!