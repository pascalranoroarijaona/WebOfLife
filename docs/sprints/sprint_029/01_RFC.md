# Request for Comments: Sprint 029 - Thermodynamic State Vector Validation Wrapper

## Metadata
- **Author:** Chief Systems Architect
- **Sprint Target:** Sprint 029
- **Scope:** `src/thermodynamics/state_validator.ts`, integration with `src/thermodynamics/thermodynamic_monad_process.ts`, and associated unit testing (`tests/sprint_029.test.ts`).
- **Status:** Approved / Drafted

---

## 1. Executive Summary & Sprint Goal
The objective of Sprint 029 is to establish a rigorous **Thermodynamic State Vector Validation Wrapper** in `src/thermodynamics/state_validator.ts`. 

As the Web of Life simulator executes thermodynamic monad steps across various biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water), ensuring the physical integrity of the underlying `ThermodynamicStateVector` is paramount. This sprint introduces validation helper functions that assert:
1. **Required Property Existence:** Checking that all essential physical vectors and scalar parameters (e.g., energy stores, mass balance stocks, temperature, and entropy metrics) are present and properly initialized.
2. **Non-Negative Entropy & Physical Bounds:** Enforcing the Second Law of Thermodynamics (entropy $\ge 0$, entropy generation rate $\ge 0$ in closed/isolated adjustments, and non-negative material stock quantities) prior to monad execution steps.
3. **Monad Interception & Pre-Execution Hook:** Wrapping or inspecting monad transitions to prevent corrupted or physically impossible state vectors from propagating through the simulation pipeline.

---

## 2. Thermodynamic Laws & Mathematical Constraints

### First Law of Thermodynamics (Conservation of Energy & Matter)
Total energy and matter within the Earth Pod pod structure remain constant, subject strictly to external boundary fluxes (primarily solar radiation input and longwave thermal radiation output):
$$\Delta E_{\text{system}} = Q_{\text{solar}} - W_{\text{work}} - Q_{\text{loss}}$$
Mass conservation is enforced across all biogeochemical stocks:
$$\sum \text{Stock}_{\text{initial}} = \sum \text{Stock}_{\text{final}}$$

### Second Law of Thermodynamics (Entropy Generation)
The total entropy change of the system and its surroundings must satisfy:
$$\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{surroundings}} \ge 0$$
Furthermore, internal state vectors must maintain non-negative thermodynamic entropy ($S \ge 0$) and valid absolute temperatures ($T > 0$). The `StateValidator` explicitly checks that:
- $\forall s \in \text{system.entropy}, s \ge 0$
- $\forall m \in \text{system.stocks}, m \ge 0$

---

## 3. Class Hierarchy & Architecture Additions

### 3.1 Class Diagram (`src/thermodynamics/state_validator.ts`)
```text
+---------------------------------------------------------------+
|                      ThermodynamicStateValidator              |
+---------------------------------------------------------------+
| + validateStateVector(vector: ThermodynamicStateVector): void |
| + assertNonNegativeEntropy(vector: ThermodynamicStateVector): void|
| + assertRequiredProperties(vector: ThermodynamicStateVector): void|
| + wrapMonadStep(stepFn: MonadStepFunction): MonadStepFunction |
+---------------------------------------------------------------+
                                |
                                v
+---------------------------------------------------------------+
|                 ThermodynamicMonadProcess                     |
+---------------------------------------------------------------+
| - validator: ThermodynamicStateValidator                      |
| + executeStep(vector: ThermodynamicStateVector): Result       |
+---------------------------------------------------------------+
```

### 3.2 Interface Contracts
```typescript
export interface IStateValidator {
  validateStateVector(vector: ThermodynamicStateVector): boolean;
  assertNonNegativeEntropy(vector: ThermodynamicStateVector): void;
  assertRequiredProperties(vector: ThermodynamicStateVector): void;
}

export type MonadStepFunction = (vector: ThermodynamicStateVector) => ThermodynamicStateVector;
```

---

## 4. Implementation Specification

### `src/thermodynamics/state_validator.ts`
```typescript
import { ThermodynamicStateVector } from './state_vector';

export class ThermodynamicStateValidator {
  /**
   * Performs full validation of a ThermodynamicStateVector.
   * Throws an Error if any invariant is violated.
   */
  public static validateStateVector(vector: ThermodynamicStateVector): void {
    this.assertRequiredProperties(vector);
    this.assertNonNegativeEntropy(vector);
    this.assertNonNegativeStocks(vector);
  }

  /**
   * Asserts that all required structural and thermodynamic properties exist.
   */
  public static assertRequiredProperties(vector: ThermodynamicStateVector): void {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
    }
    if (vector.energy === undefined || vector.energy === null) {
      throw new Error('ValidationError: Missing required property \'energy\'.');
    }
    if (vector.entropy === undefined || vector.entropy === null) {
      throw new Error('ValidationError: Missing required property \'entropy\'.');
    }
    if (vector.temperature === undefined || vector.temperature === null) {
      throw new Error('ValidationError: Missing required property \'temperature\'.');
    }
    if (vector.stocks === undefined || vector.stocks === null) {
      throw new Error('ValidationError: Missing required property \'stocks\'.');
    }
  }

  /**
   * Asserts that entropy and entropy generation rates are non-negative (Second Law).
   */
  public static assertNonNegativeEntropy(vector: ThermodynamicStateVector): void {
    const entropyVal = typeof vector.entropy === 'number' 
      ? vector.entropy 
      : (vector.entropy as any).total ?? 0;

    if (entropyVal < 0) {
      throw new Error(`ThermodynamicViolation (Second Law): Entropy cannot be negative. Found: ${entropyVal}`);
    }

    if (vector.temperature <= 0) {
      throw new Error(`ThermodynamicViolation: Absolute temperature must be strictly positive. Found: ${vector.temperature}`);
    }
  }

  /**
   * Asserts that material stocks (Carbon, Nitrogen, Phosphorus, Water) are non-negative (First Law / Mass Conservation).
   */
  public static assertNonNegativeStocks(vector: ThermodynamicStateVector): void {
    for (const [key, value] of Object.entries(vector.stocks)) {
      if (typeof value === 'number' && value < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${key}' has negative mass/count: ${value}`);
      }
    }
  }

  /**
   * Wraps a monad step execution with pre-validation and post-validation checks.
   */
  public static wrapMonadStep(stepFn: MonadStepFunction): MonadStepFunction {
    return (vector: ThermodynamicStateVector): ThermodynamicStateVector => {
      // Pre-execution validation
      this.validateStateVector(vector);

      // Execute step
      const nextVector = stepFn(vector);

      // Post-execution validation
      this.validateStateVector(nextVector);

      return nextVector;
    };
  }
}
```

---

## 5. Verification & Testing Plan
1. **Unit Tests (`tests/sprint_029.test.ts`):**
   - Test valid state vectors pass validation without throwing.
   - Test missing properties (`energy`, `entropy`, `temperature`, `stocks`) trigger expected `ValidationError`.
   - Test negative entropy values trigger `ThermodynamicViolation (Second Law)`.
   - Test negative material stocks trigger `ThermodynamicViolation (First Law)`.
   - Test monad wrapper correctly intercepts and guards step execution.
```typescript