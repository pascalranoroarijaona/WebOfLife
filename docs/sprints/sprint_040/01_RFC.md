```md
# RFC 040: Thermodynamic State Vector Non-Negative Entropy Assertion Utility

## 1. Overview & Motivation
As part of the continuous hardening of the Web of Life thermodynamic engine, state transitions and vector inspections require robust validation without disrupting execution flow through exception throwing. Sprint 040 introduces a pure helper utility, `assertNonNegativeEntropy(state)`, located in `src/thermodynamics/state_validator.ts`. This utility inspects thermodynamic state vectors and structures, returning a functional `Result` object encapsulating either success or validation failure details regarding entropy constraints ($\Delta S \ge 0$).

## 2. Architectural Scope & File Location
- **Module:** `src/thermodynamics/state_validator.ts`
- **Associated Types:** `src/thermodynamics/types.ts`
- **Integration Test:** `tests/sprint_040.test.ts`
- **Database Schema UML:** `db/uml/sprint_040_schema.puml`

## 3. Class & Interface Contracts

### 3.1 Result Monad Contract
To avoid throwing errors during validation checks, the utility utilizes a standard functional `Result<T, E>` pattern:
```typescript
export type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };
```

### 3.2 State Validator Signature
```typescript
import { ThermodynamicStateVector } from './state_vector';
import { ThermodynamicStructure } from './thermodynamic_structure';
import { Result } from './types';

export interface EntropyValidationError {
  code: 'NEGATIVE_ENTROPY_DETECTED';
  message: string;
  violatingValue: number;
  path: string;
}

/**
 * Pure helper function to inspect thermodynamic state or state vectors
 * and assert that all entropy values are non-negative.
 * 
 * @param state ThermodynamicStateVector, ThermodynamicStructure, or generic state record
 * @returns Result<true, EntropyValidationError>
 */
export function assertNonNegativeEntropy(
  state: ThermodynamicStateVector | ThermodynamicStructure | Record<string, any>
): Result<true, EntropyValidationError>;
```

## 4. Thermodynamic Law Compliance
1. **First Law (Matter/Energy Conservation):** State validation routines do not alter matter or energy stocks; they act as pure observer functions enforcing boundary conditions.
2. **Second Law (Entropy Non-Decrease):** The validation utility explicitly asserts that internal and systemic entropy metrics remain $\ge 0$ (as physical entropy cannot be negative relative to absolute zero ground states, and internal entropy production rates must obey $\sigma \ge 0$).

## 5. Incremental Design & Integration
`assertNonNegativeEntropy` extends the existing functional utilities in `src/thermodynamics/` without mutating existing classes. It composes cleanly with monad processes (`ThermodynamicMonadProcess`) to gate state transitions safely across biogeochemical cycles (carbon, nitrogen, phosphorus, water).