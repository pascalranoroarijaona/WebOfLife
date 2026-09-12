<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 002 Contributor Guide: Thermodynamic State Vector & Monad Execution

Welcome to **Web of Life**! This guide is designed for developers and open-source contributors looking to understand, extend, and test the thermodynamic simulation pipeline introduced in **Sprint 002**.

Our repository operates on a strict TypeScript and Node.js stack. Whether you are building custom monad pipelines, adding new metabolic pathways, or writing WebGL shaders to visualize entropy dissipation, this document will get you up to speed.

---

## 1. Environment Setup & Testing

Before contributing, ensure your local development environment is configured correctly.

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes packaged with Node.js)

### Installation
Clone the repository and install dependencies using `npm install`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Test Suite
We use `tsx` to execute TypeScript tests directly. To run the Sprint 002 verification suite, execute:

```bash
npx tsx tests/sprint_002.test.ts
```

*Note: Never use `pip install` or `pytest`. This is a 100% TypeScript/Node.js project.*

---

## 2. Architecture Overview: Sprint 002 Core Contracts

Sprint 002 establishes the foundational thermodynamic laws governing all energy and mass transformations inside the simulation. Located in `src/thermodynamics/types.ts`, the contracts enforce:
1. **First Law (Energy Conservation):** Total energy changes within system control volumes must balance net boundary fluxes and stellar solar inputs.
2. **Second Law (Entropy & Exergy):** Internal entropy generation ($\dot{S}_{\text{gen}}$) must be non-negative ($\ge 0$), and exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) tracks thermodynamic irreversibility.

State transitions are safely encapsulated within the `ThermodynamicMonad`, ensuring validation gates catch violations before simulation ticks commit.

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution? Here are two beginner-friendly tasks designed around Sprint 002:

### Good First Issue 1: Implement an Adiabatic Boundary Flux Generator
- **Description:** Create a helper utility in `src/thermodynamics/utils/` that generates standard adiabatic boundary fluxes ($\dot{Q} = 0$) with variable mass flow rates.
- **Acceptance Criteria:**
  - Function signature: `createAdiabaticFlux(massFlowRate: number, h: number, s: number): BoundaryFlux`
  - Unit tests added in `tests/sprint_002.test.ts` verifying zero heat transfer.

### Good First Issue 2: Temperature-Dependent Exergy Reference Utility
- **Description:** Extend `src/thermodynamics/types.ts` with a helper that computes ambient exergy destruction relative to changing environmental temperatures ($T_0$).
- **Acceptance Criteria:**
  - Function calculates $\dot{I} = T_0 \dot{S}_{\text{gen}}$ under varying thermal loads.
  - Passes all existing validation gate checks.

---

## 4. Extension Points for Advanced Contributors

For developers wanting to build new monads, biological feedback loops, or real-time WebGL shaders:

### 4.1 Building Custom Monads
You can chain custom metabolic or ecological state transitions by extending or composing with `ThermodynamicMonad`:

```typescript
import { ThermodynamicMonad } from '../src/thermodynamics/monad';
import { ThermodynamicStateVector } from '../src/thermodynamics/types';

export function applyPhotosynthesisMonad(
  initialState: ThermodynamicStateVector,
  solarFlux: BoundaryFlux,
  metabolicEntropyGen: number,
  deltaTime: number
): ThermodynamicStateVector {
  return ThermodynamicMonad.of(initialState)
    .applyFlux(solarFlux)
    .transform(metabolicEntropyGen, deltaTime)
    .getState(); // Will throw an error automatically if Second Law is violated!
}
```

### 4.2 WebGL Shader Integration for Entropy Visualization
To visualize real-time entropy generation ($\dot{S}_{\text{gen}}$) and exergy destruction ($\dot{I}$) across Earth Pod surfaces:
1. Bind the `entropyGenerationRate` and `exergyDestructionRate` properties from `ThermodynamicStateVector` to WebGL uniform buffers (`uniform float u_entropyGen;`).
2. Map these uniforms inside your fragment shaders (`src/shaders/entropy_frag.glsl`) to color gradients ranging from cool blue (reversible, low entropy generation) to fiery red (high irreversibility and exergy destruction).

---

## 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Run your tests: `npx tsx tests/sprint_002.test.ts`
3. Push to your fork and open a Pull Request against `main` on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).