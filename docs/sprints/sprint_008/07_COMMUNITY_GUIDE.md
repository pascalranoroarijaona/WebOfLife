<!-- DevRel Onboarding & Contributor Guide -->
# Developer Relations & Contributor Onboarding: Sprint 008 (Thermodynamic State Vector Interface)

Welcome to the **Web of Life** open-source community! Sprint 008 introduces the rigorous mathematical and software engineering foundation for thermodynamic state vectors (`src/thermodynamics/types.ts`). This guide will help you get set up, understand our monad-based state pipeline, and show you how to contribute new monads or WebGL shaders.

---

## 1. Quick Start & Development Setup

Our simulation framework is built on **TypeScript and Node.js**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the test suite (Sprint 008 validation):**
   ```bash
   npx tsx tests/sprint_008.test.ts
   ```

*Note: Never use Python tools (`pip`, `pytest`) for this repository. All execution and testing occur through Node.js and `npx tsx`.*

---

## 2. Good First Issues for External Contributors

If you are looking to make your first contribution to the Web of Life repository, pick up one of these starter tasks:

### Issue #801: Implement Adiabatic Expansion Monad Wrapper
* **Goal**: Create a specialized transformation function for the `ThermodynamicMonad` that simulates an adiabatic, reversible expansion of a gas pod ($\dot{S}_{\text{gen}} = 0$).
* **Where to look**: `src/thermodynamics/types.ts`
* **Acceptance Criteria**: Must pass a unit test verifying zero entropy generation and strict energy conservation.

### Issue #802: Add Nitrogen Cycle Mass Inventory Validator
* **Goal**: Extend the `massInventory` validation in `IThermodynamicStateVector` to explicitly check for ammonia ($\text{NH}_3$) and nitrate ($\text{NO}_3^-$) conservation during denitrification steps.
* **Where to look**: `src/cycles/nitrogen.ts` and `tests/sprint_008.test.ts`

---

## 3. Extension Guide: Building New Monads

The `ThermodynamicMonad<T>` class ensures that all biochemical and physical transitions comply with the First and Second Laws of Thermodynamics. When building a new simulation monad:

1. **Wrap your state**: Initialize your process using `ThermodynamicMonad.unit(value, initialVector)`.
2. **Chain transformations via `.bind()`**:
   ```typescript
   import { ThermodynamicMonad, IThermodynamicStateVector } from '../src/thermodynamics/types';

   function metabolicDecayStep(
     biomass: number, 
     vector: IThermodynamicStateVector
   ): { value: number; vector: IThermodynamicStateVector } {
     // Perform calculations...
     const newEntropyGen = 12.5; // W/K (must be >= 0)
     const updatedVector: IThermodynamicStateVector = {
       ...vector,
       timestamp: vector.timestamp + 1,
       entropyGenerationRate: newEntropyGen,
       exergyDestructionRate: vector.T_0 * newEntropyGen,
     };
     return { value: biomass * 0.95, vector: updatedVector };
   }

   // Execution
   const simulationPod = ThermodynamicMonad.unit(100.0, initialVector)
     .bind(metabolicDecayStep);
   ```
3. **Automatic Invariant Enforcements**: The `.bind()` method automatically validates:
   - $\dot{S}_{\text{gen}} \ge 0$ (Second Law)
   - $\dot{I} = T_0 \dot{S}_{\text{gen}}$ (Exergy Destruction Consistency within $10^{-6}\text{ W}$)

---

## 4. Extension Guide: Building New WebGL Shaders

To visualize thermodynamic fluxes (such as exergy destruction rates or entropy generation density) across the Earth Pod surface:

1. **Shader Location**: Place GLSL fragment and vertex shaders in `src/rendering/shaders/`.
2. **Uniform Binding**: Pass thermodynamic state vector metrics (`entropyGenerationRate`, `exergyDestructionRate`) as uniforms into your shader material.
3. **Testing Shaders**: Run rendering and pipeline tests using:
   ```bash
   npx tsx tests/sprint_008.test.ts
   ```

Happy coding, and welcome aboard the Web of Life community!