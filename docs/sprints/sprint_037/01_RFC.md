# RFC 037: Thermodynamic State Vector Non-Negative Entropy Assertion

## 1. Executive Summary
Sprint 037 introduces the **Thermodynamic State Vector Non-Negative Entropy Assertion** utility within `src/thermodynamics/state_validator.ts`. This specification establishes rigorous validation mechanisms to enforce the Second Law of Thermodynamics across the Web of Life ecosystem. Specifically, it ensures that all system entropy ($S \ge 0$) and entropy generation rates ($\dot{S}_{gen} \ge 0$) remain mathematically and physically non-negative at every simulation step.

---

## 2. Theoretical & Thermodynamic Foundation
To satisfy the First and Second Laws of Thermodynamics within the Gaia simulation framework:
1. **First Law (Conservation of Energy/Matter):** Total matter and energy are conserved across all biogeochemical cycles (`carbon.ts`, `nitrogen.ts`, `phosphorus.ts`, `water.ts`), with solar input as the sole external energy driver (`src/earth_pod.ts`).
2. **Second Law (Entropy Non-Decrease):** The total entropy of the isolated Earth system plus its boundaries must satisfy:
   $$\Delta S_{universe} = \Delta S_{system} + \Delta S_{surroundings} \ge 0$$
   Locally, the state validator checks:
   - System Entropy ($S$) $\ge 0$
   - Entropy Generation Rate ($\dot{S}_{gen} = \frac{d}{dt}S_{internal} - \frac{Q}{T} \ge 0$)

---

## 3. Architecture & Class Hierarchy Additions

### 3.1 Interface Contracts (`src/thermodynamics/types.ts` & `src/thermodynamics/state_validator.ts`)
```typescript
export interface IThermodynamicStateVector {
    temperature: number;
    internalEnergy: number;
    entropy: number;
    entropyGenerationRate: number;
    exergy: number;
}

export interface IStateValidator {
    validate(state: IThermodynamicStateVector): ValidationResult;
}

export interface ValidationResult {
    isValid: boolean;
    violations: string[];
}
```

### 3.2 State Validator Implementation (`src/thermodynamics/state_validator.ts`)
```typescript
import { IThermodynamicStateVector, ValidationResult } from './types';

export class ThermodynamicStateValidator implements IStateValidator {
    public validate(state: IThermodynamicStateVector): ValidationResult {
        const violations: string[] = [];

        if (state.entropy < 0) {
            violations.push(`Second Law Violation: Entropy (${state.entropy}) cannot be negative.`);
        }

        if (state.entropyGenerationRate < 0) {
            violations.push(`Second Law Violation: Entropy generation rate (${state.entropyGenerationRate}) must be >= 0.`);
        }

        if (state.temperature < 0) {
            violations.push(`First/Second Law Violation: Absolute temperature (${state.temperature}) cannot be negative.`);
        }

        return {
            isValid: violations.length === 0,
            violations
        };
    }

    public assertValid(state: IThermodynamicStateVector): void {
        const result = this.validate(state);
        if (!result.isValid) {
            throw new Error(`Thermodynamic State Validation Failed:\n${result.violations.join('\n')}`);
        }
    }
}
```

---

## 4. Monad Stock Transitions
The Thermodynamic Monad (`src/thermodynamics/thermodynamic_monad_process.ts`) integrates the validator into its state pipeline:
1. **Receive State Vector:** Ingests current elemental and thermal stocks.
2. **Process Fluxes:** Apply biogeochemical cycle transformations (Carbon, Nitrogen, Phosphorus, Water).
3. **Validate:** Invoke `ThermodynamicStateValidator.assertValid()` prior to committing state updates to the Earth Pod.
4. **Emit:** Advance simulation clock only upon successful validation.

---

## 5. Verification & Testing Strategy
- Unit tests in `tests/sprint_037.test.ts` will verify:
  1. Valid states with $S > 0$ and $\dot{S}_{gen} \ge 0$ pass successfully.
  2. States with negative entropy ($S < 0$) throw immediate assertion errors.
  3. States with negative entropy generation rates ($\dot{S}_{gen} < 0$) are rejected.
  4. Integration with `EarthPod` thermal and matter balance loops.