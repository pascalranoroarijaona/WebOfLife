<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 17 Developer Onboarding & Contributor Guide: Thermodynamic State Vectors & Monadic Extensions

Welcome to the **Web of Life** open-source community! Sprint 17 introduces rigorous thermodynamic accounting into our TypeScript simulation architecture via the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`). 

Whether you are building a new biochemical monad (e.g., nitrogen-fixing pathways) or an optimized WebGL shader for planetary-scale thermodynamic visualization, this guide covers everything you need to get up and running.

---

## 🚀 Quickstart for New Contributors

Ensure you are working inside the official repository:
👉 [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

### 1. Environment Setup
We use **Node.js** and **TypeScript**. *Note: This repository is entirely JavaScript/TypeScript based; do not use Python (`pip` or `pytest`).*

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies
npm install
```

### 2. Running the Sprint 17 Test Suite
To verify your environment and test the new thermodynamic state vector validation checks, run:

```bash
npx tsx tests/sprint_017.test.ts
```

---

## 🧪 Good First Issues & Extension Points

We invite external contributors to help expand the simulation's thermodynamic depth. Below are two prime entry points for new contributors:

### 1. Building a New Thermodynamic Monad
If you want to implement a custom biogeochemical monad (e.g., Sulfur Cycle, Denitrification, or Deep-Sea Vent Chemosynthesis):
* **Base Class:** Extend `ThermodynamicMonadProcess` from `src/thermodynamics/thermodynamic_monad_process.ts`.
* **Contract:** Implement `executeStep(dt: number)` and ensure your state calculations populate `IThermodynamicStateVector`.
* **Invariants to Respect:**
  1. **Second Law:** `entropyGenerationRate >= 0` (enforced automatically by `setStateVector`).
  2. **Gouy-Stodola Theorem:** `exergyDestructionRate === ambientReferenceTemperature * entropyGenerationRate`.

#### Example Template for a Custom Monad (`src/thermodynamics/sulfur_monad.ts`):
```typescript
import { ThermodynamicMonadProcess } from './thermodynamic_monad_process';
import { IThermodynamicStateVector } from './types';

export class SulfurCycleMonad extends ThermodynamicMonadProcess {
  constructor(initialState: IThermodynamicStateVector) {
    super(initialState);
  }

  public executeStep(dt: number): void {
    // Perform biochemical reactions...
    // Update internal energy, boundary fluxes, and entropy generation rate
    // Then call this.setStateVector(updatedState);
  }
}
```

### 2. Building a WebGL Exergy/Entropy Shader
If your expertise is in graphics programming, you can contribute real-time visual shaders to render entropy generation ($\dot{S}_{\text{gen}}$) and exergy destruction ($\dot{I}$) gradients across the Earth Pod surface.
* **Target Directory:** `src/shaders/` or `src/rendering/`
* **Uniforms to Bind:** Pass `exergyDestructionRate` and `entropyGenerationRate` from `IThermodynamicStateVector` into fragment shaders to map thermal degradation and exergy loss to a perceptually uniform colormap (e.g., Viridis or Inferno).

---

## 🤝 Contribution Workflow

1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes following strict typing standards (`npm run build` or typecheck).
4. Add corresponding unit tests in `tests/`.
5. Run tests via `npx tsx tests/sprint_017.test.ts`.
6. Open a Pull Request against `main`.

Happy coding, and welcome to the Web of Life!