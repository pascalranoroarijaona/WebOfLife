<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 048 Developer Onboarding & Community Contributor Guide

Welcome to **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`)! As we advance our planetary-scale biogeochemical and thermodynamic simulation engine, community contributions are essential. 

Sprint 048 introduces the **Thermodynamic State Vector Non-Negative Entropy Exception Guard**, ensuring that all simulated state transitions strictly comply with the Second Law of Thermodynamics.

---

## 🛠️ Getting Started in TypeScript & Node.js

This repository is built entirely on **TypeScript** and **Node.js**. 

> ⚠️ **CRITICAL CONSTRAINT:** We do **not** use Python (`pip` or `pytest`). All dependency management, script execution, and testing must be performed via Node.js toolchains.

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the test suite for Sprint 048:
   ```bash
   npx tsx tests/sprint_048.test.ts
   ```

---

## 🚀 What's New in Sprint 048

In `src/thermodynamics/state_validator.ts`, we implemented `validateOrThrowEntropy(state)`, which evaluates the system's entropy generation rate ($\dot{S}_{\text{gen}}$). If $\dot{S}_{\text{gen}} < 0$, it immediately throws a custom `ThermodynamicEntropyViolationError`.

### Core Monadic Integration (`src/thermodynamics/thermodynamic_monad_process.ts`)
```typescript
import { ThermodynamicStateVector } from './state_vector';
import { validateOrThrowEntropy } from './state_validator';

export class ThermodynamicMonadProcess {
  constructor(private readonly state: ThermodynamicStateVector) {}

  public bind(transitionFn: (s: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicMonadProcess {
    const nextState = transitionFn(this.state);
    validateOrThrowEntropy(nextState); // Enforces Second Law
    return new ThermodynamicMonadProcess(nextState);
  }
}
```

---

## 💡 "Good First Issues" & Extension Points for Contributors

We invite external contributors to expand our simulation primitives. Here are targeted areas for your first contribution:

### 1. Build a New Thermodynamic Monad (`src/thermodynamics/monads/`)
- **Objective:** Create custom monad wrappers for specialized geochemical tracking (e.g., Sulfur or Methane cycles).
- **Requirements:** 
  - Must implement standard monadic `bind` and `unit` methods.
  - Must integrate `validateOrThrowEntropy` after every stock update step to prevent unphysical entropy sinks.

### 2. Implement a New WebGL Shader (`src/rendering/shaders/`)
- **Objective:** Write custom GLSL fragment shaders to visualize planetary entropy generation heatmaps or biogeochemical flux distributions in real-time.
- **Requirements:**
  - Connect shader uniforms directly to the `ThermodynamicStateVector` output parameters.
  - Test rendering performance under high-density node counts.

---

## 🧪 Submitting Your Contribution
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Implement your changes following our TypeScript typing standards.
3. Add corresponding test files in `tests/`.
4. Run your tests:
   ```bash
   npx tsx tests/sprint_N.test.ts
   ```
5. Open a Pull Request on GitHub!