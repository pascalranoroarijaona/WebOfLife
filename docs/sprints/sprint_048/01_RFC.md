# RFC 048: Thermodynamic State Vector Non-Negative Entropy Exception Guard

## 1. Executive Summary
This Request for Comments (RFC) outlines the architecture and implementation details for Sprint 48 of the **Web of Life** project. The focus is to establish a robust, strict assertion framework within `src/thermodynamics/state_validator.ts` that enforces the Second Law of Thermodynamics. Specifically, any evaluated thermodynamic state vector yielding an entropy generation rate $\dot{S}_{\text{gen}} < 0$ must immediately trigger a custom runtime exception: `ThermodynamicEntropyViolationError`.

---

## 2. Theoretical & Thermodynamic Foundation
In accordance with the laws governing closed and open planetary systems under solar input:
1. **First Law (Matter/Energy Conservation):** Total internal energy changes equal heat added minus work done, with planetary matter pools strictly conserved.
2. **Second Law (Entropy Generation):** For any real thermodynamic process, the entropy generation rate must satisfy the non-negative constraint:
   $$\dot{S}_{\text{gen}} \ge 0$$

Violations of this principle within simulated cycles (Carbon, Nitrogen, Phosphorus, Water) represent unphysical regressions or computational anomalies.

---

## 3. Architecture & Class Hierarchy Additions

### 3.1 Exception Hierarchy
- **`ThermodynamicViolationError`** (Base Error class)
  - **`ThermodynamicEntropyViolationError`** (New in Sprint 48): Thrown specifically when $\dot{S}_{\text{gen}} < 0$.

### 3.2 Validator Interface (`src/thermodynamics/state_validator.ts`)
```typescript
import { ThermodynamicStateVector } from './state_vector';

export class ThermodynamicEntropyViolationError extends Error {
  constructor(message: string, public readonly entropyGenerationRate: number) {
    super(message);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export function validateOrThrowEntropy(state: ThermodynamicStateVector): void {
  const sGen = state.getEntropyGenerationRate();
  if (sGen < 0) {
    throw new ThermodynamicEntropyViolationError(
      `Second Law Violation: Entropy generation rate S_gen (${sGen}) is strictly less than 0.`,
      sGen
    );
  }
}
```

---

## 4. Monad Stock Transitions & Integration
Thermodynamic monad processes (`src/thermodynamics/thermodynamic_monad_process.ts`) will incorporate `validateOrThrowEntropy` during their state transition step:

```
[Initial State] --> [Monad Process Step] --> [State Vector Evaluation] 
                                                    │
                                                    ▼
                                        validateOrThrowEntropy(state)
                                                    │
                      ┌─────────────────────────────┴─────────────────────────────┐
                      ▼ (sGen >= 0)                                               ▼ (sGen < 0)
             [Commit State Vector]                                   [Throw ThermodynamicEntropyViolationError]
```

---

## 5. Verification & Testing Strategy
- **Unit Tests (`tests/sprint_048.test.ts`)**:
  1. Verify valid states with $\dot{S}_{\text{gen}} \ge 0$ pass validation without error.
  2. Verify invalid states with $\dot{S}_{\text{gen}} < 0$ correctly throw `ThermodynamicEntropyViolationError`.
  3. Verify integration with existing biogeochemical cycles (`Carbon`, `Nitrogen`, `Phosphorus`, `Water`).