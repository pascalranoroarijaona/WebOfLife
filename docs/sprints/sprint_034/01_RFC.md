# Request for Comments (RFC): Sprint 034
## Thermodynamic State Vector Non-Negative Entropy Assertion (`src/thermodynamics/state_validator.ts`)

**Author:** Chief Systems Architect  
**Status:** Approved / In Progress  
**Target Module:** `src/thermodynamics/state_validator.ts`  
**Related Modules:** `src/thermodynamics/state_vector.ts`, `src/thermodynamics/types.ts`  

---

### 1. Overview & Objective
To rigorously enforce the **Second Law of Thermodynamics** within the Web of Life simulation engine, this sprint introduces **`src/thermodynamics/state_validator.ts`**. 

The validator provides robust assertions verifying that any thermodynamic state vector maintains:
1. Non-negative absolute entropy ($S \ge 0$).
2. Non-negative entropy generation rates ($\dot{S}_{\text{gen}} \ge 0$), conforming to the Clausius formulation of the Second Law for open thermodynamic systems receiving solar input and radiating longwave thermal energy to space.

---

### 2. Thermodynamic Foundations & Laws Compliance

#### First Law (Conservation of Energy)
Total energy within the planetary boundary (Earth Pod) is conserved. Energy inputs (solar irradiance $Q_{\text{in}}$) equal internal transformations plus energy outputs ($Q_{\text{out}}$).

#### Second Law (Entropy Production)
For any isolated or bounded system experiencing irreversible internal processes, the total entropy change is given by:
$$\Delta S_{\text{total}} = \Delta S_{\text{system}} + \Delta S_{\text{surrounding}} \ge 0$$
Equivalently, the local entropy generation rate $\dot{S}_{\text{gen}}$ within the system must satisfy:
$$\dot{S}_{\text{gen}} \ge 0$$

The new validator enforces this invariant at every simulation tick. If any state vector yields $S < 0$ or $\dot{S}_{\text{gen}} < 0$, a `ThermodynamicViolationError` is thrown, halting non-physical states.

---

### 3. Architecture & Class Hierarchy Additions

#### 3.1 Interface & Type Definitions (`src/thermodynamics/types.ts` extensions)
```ts
export interface IStateValidator {
  validateEntropy(entropy: number): boolean;
  validateEntropyGenerationRate(rate: number): boolean;
  assertValidState(vector: IThermodynamicStateVector): void;
}

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Violation - Second Law]: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}
```

#### 3.2 State Validator Implementation (`src/thermodynamics/state_validator.ts`)
```ts
import { IThermodynamicStateVector } from './types';
import { IStateValidator, ThermodynamicViolationError } from './types';

export class StateValidator implements IStateValidator {
  /**
   * Validates that absolute entropy is non-negative (S >= 0).
   */
  public validateEntropy(entropy: number): boolean {
    return Number.isFinite(entropy) && entropy >= 0;
  }

  /**
   * Validates that entropy generation rate is non-negative (dS_gen/dt >= 0).
   */
  public validateEntropyGenerationRate(rate: number): boolean {
    return Number.isFinite(rate) && rate >= 0;
  }

  /**
   * Asserts validity across a complete Thermodynamic State Vector.
   * Throws ThermodynamicViolationError if any invariant is violated.
   */
  public assertValidState(vector: IThermodynamicStateVector): void {
    if (!this.validateEntropy(vector.entropy)) {
      throw new ThermodynamicViolationError(
        `Invalid absolute entropy value: ${vector.entropy}. Must be >= 0.`
      );
    }

    if (!this.validateEntropyGenerationRate(vector.entropyGenerationRate)) {
      throw new ThermodynamicViolationError(
        `Invalid entropy generation rate: ${vector.entropyGenerationRate}. Must be >= 0 (Second Law violation).`
      );
    }
  }
}
```

---

### 4. Monad Stock Transitions & Integration
The `StateValidator` will be integrated into the thermodynamic monad processing pipeline (`src/thermodynamics/thermodynamic_monad_process.ts`). 

```
[Solar Input Q_in] ──> [Monad Process] ──> [State Vector Update] 
                                                    │
                                                    ▼
                                          [StateValidator Check]
                                           ├── S >= 0 ? ──> Continue
                                           └── S <  0 ? ──> Throw Error
```

---

### 5. Testing & Verification Plan
1. **Unit Tests (`tests/sprint_034.test.ts`)**:
   - Verify valid states ($S = 100, \dot{S}_{\text{gen}} = 5$) pass validation without error.
   - Verify negative entropy ($S = -0.1$) triggers `ThermodynamicViolationError`.
   - Verify negative entropy generation rate ($\dot{S}_{\text{gen}} = -1.2$) triggers `ThermodynamicViolationError`.
   - Verify non-finite values (`NaN`, `Infinity`) are correctly rejected.
2. **Integration Tests**:
   - Run full Earth Pod simulation ticks over 100 cycles to ensure baseline adherence to the Second Law invariant under standard solar forcing.