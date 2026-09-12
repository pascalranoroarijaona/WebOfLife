# RFC 030: Thermodynamic State Vector Validation Wrapper

## 1. Executive Summary
Sprint 030 establishes the formal thermodynamic validation layer within `src/thermodynamics/state_validator.ts`. As part of the ongoing evolution of the Web of Life simulation architecture, this sprint introduces rigid invariant assertions for thermodynamic state vectors prior to monad step executions. By validating property existence, boundary limits, and non-negative entropy fields, this module guarantees compliance with the First and Second Laws of Thermodynamics across all biogeochemical cycles.

---

## 2. Architectural Context & Scope
The Web of Life architecture relies on monadic state transitions (`ThermodynamicMonadProcess`) to model matter conservation and energy dissipation. 
- **Matter Conservation (1st Law):** Total mass and elemental stocks (Carbon, Nitrogen, Phosphorus, Water) must remain invariant or balance exactly with boundary inputs/outputs.
- **Entropy Generation (2nd Law):** Internal entropy fields must be non-negative ($\Delta S \ge 0$), and local decreases in entropy (e.g., biomass synthesis) must be coupled with equivalent or greater thermal dissipation to the environment.

`src/thermodynamics/state_validator.ts` acts as an interceptor and guard function, evaluating `ThermodynamicStateVector` instances before any monadic transformation pipeline executes.

---

## 3. Class Hierarchy Additions & Interfaces

### 3.1 Interface Contracts (`src/thermodynamics/types.ts` & `state_validator.ts`)

```typescript
import { ThermodynamicStateVector } from './state_vector';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IStateValidator {
  validate(state: ThermodynamicStateVector): ValidationResult;
  assertValid(state: ThermodynamicStateVector): void;
}
```

### 3.2 State Validator Class Definition (`src/thermodynamics/state_validator.ts`)

```typescript
export class ThermodynamicStateValidator implements IStateValidator {
  private requiredProperties: string[] = [
    'energy',
    'entropy',
    'temperature',
    'elementalStocks'
  ];

  public validate(state: ThermodynamicStateVector): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Property Existence Check
    for (const prop of this.requiredProperties) {
      if (state[prop as keyof ThermodynamicStateVector] === undefined || state[prop as keyof ThermodynamicStateVector] === null) {
        errors.push(`Missing required thermodynamic property: ${prop}`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // 2. Non-Negative Entropy Validation (2nd Law)
    if (typeof state.entropy === 'number' && state.entropy < 0) {
      errors.push(`Thermodynamic violation: Entropy cannot be negative (S = ${state.entropy})`);
    }

    // 3. Energy and Temperature Bounds
    if (typeof state.temperature === 'number' && state.temperature < 0) {
      errors.push(`Thermodynamic violation: Absolute temperature cannot be negative (T = ${state.temperature}K)`);
    }

    // 4. Elemental Stock Matter Conservation Check
    if (state.elementalStocks) {
      for (const [element, mass] of Object.entries(state.elementalStocks)) {
        if (typeof mass === 'number' && mass < 0) {
          errors.push(`Matter conservation violation: Elemental stock '${element}' is negative (${mass})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public assertValid(state: ThermodynamicStateVector): void {
    const result = this.validate(state);
    if (!result.isValid) {
      throw new Error(`Thermodynamic State Vector Validation Failed:\n- ${result.errors.join('\n- ')}`);
    }
  }
}
```

---

## 4. Monad Integration & Pipeline Flow

The `ThermodynamicMonadProcess` will integrate `ThermodynamicStateValidator` directly into its `.bind()` or execution pipeline:

```
[Input State Vector] 
       │
       ▼
[StateValidator.assertValid()] ──(Failure)──> [Throw Thermodynamic Error]
       │
   (Success)
       ▼
[Monad Transformation Step (Cycles / EarthPod)]
       │
       ▼
[Output State Vector Validation]
```

---

## 5. Verification & Testing Strategy
- **Unit Tests (`tests/sprint_030.test.ts`):**
  - Verify successful validation for well-formed state vectors.
  - Assert error throwing when entropy is negative.
  - Assert error throwing when mandatory properties (energy, temperature, elemental stocks) are missing.
  - Assert error throwing when elemental mass stocks drop below zero (First Law violation).