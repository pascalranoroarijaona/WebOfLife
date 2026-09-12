# RFC 031: Thermodynamic State Vector Validation Wrapper

**Status:** Draft / Approved  
**Author:** Chief Systems Architect  
**Target Module:** `src/thermodynamics/state_validator.ts`  
**Associated Tests:** `tests/sprint_031.test.ts`  
**Related UML:** `db/uml/sprint_031_schema.puml`

---

## 1. Executive Summary & Sprint Goal

Sprint 31 introduces the **Thermodynamic State Vector Validation Wrapper** located at `src/thermodynamics/state_validator.ts`. As the Web of Life simulation architecture scales and handles complex monad state transitions across biochemical cycles (Carbon, Nitrogen, Phosphorus, Water), runtime verification of thermodynamic consistency becomes paramount. 

This module provides formal code validation helper functions and wrapper utilities that:
1. Assert mandatory property existence within incoming `ThermodynamicStateVector` instances.
2. Enforce the **First Law of Thermodynamics** via mass-energy conservation checks across stock transitions.
3. Enforce the **Second Law of Thermodynamics** by asserting non-negative entropy fields ($\Delta S \ge 0$ or valid internal energy dissipation rates) prior to monad step executions.
4. Integrate seamlessly with `ThermodynamicMonadProcess` to intercept malformed state vectors before computational propagation.

---

## 2. Thermodynamic Laws & Mathematical Foundations

### 2.1 First Law Compliance (Conservation of Matter/Energy)
For any monad state transition $T: \mathcal{S}_t \to \mathcal{S}_{t+1}$, the total conserved stock pool (Carbon, Nitrogen, Phosphorus, Water, and Enthalpy equivalents) must balance within tolerance $\epsilon$:
$$\sum \text{Stocks}_{t+1} = \sum \text{Stocks}_{t} + \text{SolarInput}_t - \text{Dissipation}_t$$
The validator checks that no matter or energy spontaneously appears or vanishes outside defined solar input bounds.

### 2.2 Second Law Compliance (Entropy & Dissipation)
Every irreversible thermodynamic process must generate entropy:
$$\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{surroundings}} \ge 0$$
Within `StateValidator`, entropy fields (`entropy`, `dissipationRate`) are inspected to ensure:
- Entropy values are numeric and non-negative ($S \ge 0$).
- Rate of entropy change or internal dissipation during monad transitions does not violate thermodynamic bounds.

---

## 3. Class Hierarchy & Interface Additions

### 3.1 Interface Contracts (`src/thermodynamics/types.ts` extensions)
```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StateValidatorOptions {
  strictMode?: boolean;
  tolerance?: number;
  requireSolarInputBinding?: boolean;
}
```

### 3.2 State Validator Class (`src/thermodynamics/state_validator.ts`)
```typescript
import { ThermodynamicStateVector } from './state_vector';
import { ValidationResult, StateValidatorOptions } from './types';

export class StateValidator {
  private options: StateValidatorOptions;

  constructor(options: StateValidatorOptions = {}) {
    this.options = {
      strictMode: true,
      tolerance: 1e-6,
      requireSolarInputBinding: true,
      ...options
    };
  }

  public validateState(state: ThermodynamicStateVector): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Property Existence Check
    if (!state) {
      return { isValid: false, errors: ['State vector is null or undefined'], warnings: [] };
    }

    if (typeof state.temperature !== 'number' || isNaN(state.temperature)) {
      errors.push('Missing or invalid temperature property.');
    }

    if (!state.stocks || typeof state.stocks !== 'object') {
      errors.push('Missing or invalid stocks dictionary.');
    }

    // 2. Second Law: Non-negative Entropy Check
    if (typeof state.entropy !== 'number' || state.entropy < 0) {
      errors.push(`Second Law Violation: Entropy must be non-negative. Found: ${state.entropy}`);
    }

    if (typeof state.dissipationRate === 'number' && state.dissipationRate < 0) {
      errors.push(`Second Law Violation: Dissipation rate cannot be negative. Found: ${state.dissipationRate}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public assertValidState(state: ThermodynamicStateVector): void {
    const result = this.validateState(state);
    if (!result.isValid) {
      throw new Error(`Thermodynamic State Validation Failed:\n- ${result.errors.join('\n- ')}`);
    }
  }

  public validateTransition(prior: ThermodynamicStateVector, next: ThermodynamicStateVector): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.assertValidState(prior);
    this.assertValidState(next);

    // First Law: Conservation check across stocks
    const priorTotal = Object.values(prior.stocks).reduce((a, b) => a + b, 0);
    const nextTotal = Object.values(next.stocks).reduce((a, b) => a + b, 0);
    const solarInput = next.solarInput ?? 0;
    const netChange = nextTotal - priorTotal;

    // Mass-energy balance: netChange should equal solarInput minus system work/loss
    if (Math.abs(netChange - solarInput) > (this.options.tolerance ?? 1e-6)) {
      if (this.options.strictMode) {
        errors.push(`First Law Violation: Stock conservation mismatch. Net change (${netChange}) does not balance with solar input (${solarInput}) within tolerance.`);
      } else {
        warnings.warn(`Stock conservation discrepancy detected: Delta=${netChange}, Solar=${solarInput}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

---

## 4. Monad Stock Transitions & Integration

`ThermodynamicMonadProcess` will wrap its step execution using `StateValidator`:

```typescript
import { StateValidator } from './state_validator';
import { ThermodynamicStateVector } from './state_vector';

export class ThermodynamicMonadProcess {
  private validator: StateValidator;

  constructor(validator: StateValidator = new StateValidator()) {
    this.validator = validator;
  }

  public step(state: ThermodynamicStateVector, transitionFn: (s: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateVector {
    this.validator.assertValidState(state);
    
    const nextState = transitionFn(state);
    
    const transitionResult = this.validator.validateTransition(state, nextState);
    if (!transitionResult.isValid) {
      throw new Error(`Monad step aborted due to thermodynamic transition violation:\n- ${transitionResult.errors.join('\n- ')}`);
    }

    return nextState;
  }
}
```

---

## 5. Verification & Testing Plan

1. **Unit Tests (`tests/sprint_031.test.ts`)**:
   - Verify detection of missing properties (temperature, stocks, entropy).
   - Verify rejection of negative entropy or negative dissipation rates.
   - Verify First Law mass-energy conservation checks during simulated stock transitions.
   - Verify successful monad step execution when state vectors comply with thermodynamic laws.
2. **Integration Checks**:
   - Run existing cycle tests (`carbon`, `nitrogen`, `phosphorus`, `water`) with the state validator enabled to ensure zero regressions in established biogeochemical models.