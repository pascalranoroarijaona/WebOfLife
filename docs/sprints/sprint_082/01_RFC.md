# RFC 082: Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper (Sub-Task A)

## 1. Executive Summary
Sprint 082 introduces **Sub-Task A** of the Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper within the `Web of Life` (Gaia) architecture. This specification formalizes the strict TypeScript method signature for `evaluateDiscrepancy` inside `src/thermodynamics/state_validator.ts`. The component bridges empirical/simulated state vectors with theoretical conservation expectations under absolute First and Second Law thermodynamic constraints (matter conservation and external solar input only).

---

## 2. Architectural Objectives
1. **Strict Interface Contracts**: Define explicit types and signatures combining actual and expected state maps.
2. **Thermodynamic Consistency**: Guarantee that state inventory discrepancies are evaluated without violating mass-energy conservation boundaries.
3. **Incremental Inheritance**: Extend existing thermodynamic structures (`ThermodynamicStructure`) and validation monads (`ThermodynamicMonadProcess`) without rewriting core engine code.

---

## 3. Class Hierarchy & Interface Specifications

### 3.1 Interface Contracts (`src/thermodynamics/state_validator.ts`)

```ts
import { StateVector } from './state_vector';
import { ThermodynamicStructure } from './thermodynamic_structure';

export interface IStateDiscrepancyReport {
  readonly timestamp: number;
  readonly absoluteDiscrepancy: Map<string, number>;
  readonly relativeDiscrepancy: Map<string, number>;
  readonly totalMassDelta: number;
  readonly energyViolationDetected: boolean;
  readonly entropyDelta: number;
}

export interface IStateValidator {
  /**
   * Evaluates discrepancies between actual runtime state vectors and expected thermodynamic expectations.
   * Enforces First Law (mass conservation) and Second Law (entropy increase / solar input bounds).
   */
  evaluateDiscrepancy(
    actual: StateVector,
    expected: StateVector
  ): IStateDiscrepancyReport;
}
```

### 3.2 Concrete Evaluator Implementation

```ts
import { StateVector } from './state_vector';
import { IStateValidator, IStateDiscrepancyReport } from './state_validator';

export class StateDiscrepancyEvaluator implements IStateValidator {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  public evaluateDiscrepancy(
    actual: StateVector,
    expected: StateVector
  ): IStateDiscrepancyReport {
    const absoluteDiscrepancy = new Map<string, number>();
    const relativeDiscrepancy = new Map<string, number>();
    
    let totalMassDelta = 0;
    let energyViolationDetected = false;
    let entropyDelta = 0;

    const actualMap = actual.toMap();
    const expectedMap = expected.toMap();

    const allKeys = new Set([...actualMap.keys(), ...expectedMap.keys()]);

    for (const key of allKeys) {
      const actVal = actualMap.get(key) ?? 0;
      const expVal = expectedMap.get(key) ?? 0;
      const delta = actVal - expVal;
      
      absoluteDiscrepancy.set(key, Math.abs(delta));
      
      const rel = expVal !== 0 ? Math.abs(delta / expVal) : Math.abs(delta);
      relativeDiscrepancy.set(key, rel);

      if (key.includes('mass') || key.includes('carbon') || key.includes('nitrogen') || key.includes('phosphorus') || key.includes('water')) {
        totalMassDelta += delta;
      }

      if (key.includes('energy') && delta > this.tolerance) {
        energyViolationDetected = true;
      }
    }

    if (Math.abs(totalMassDelta) > this.tolerance) {
      energyViolationDetected = true; // Mass-energy accounting breach
    }

    entropyDelta = actual.getEntropy() - expected.getEntropy();

    return {
      timestamp: Date.now(),
      absoluteDiscrepancy,
      relativeDiscrepancy,
      totalMassDelta,
      energyViolationDetected,
      entropyDelta
    };
  }
}
```

---

## 4. Monad Stock Transitions & Thermodynamic Laws

1. **First Law (Mass Conservation)**:
   $$\sum \Delta M_{\text{system}} = \sum M_{\text{inputs}} - \sum M_{\text{outputs}}$$
   The `evaluateDiscrepancy` method checks that internal inventory shifts do not spontaneously generate or destroy matter unless accounted for by authorized boundary fluxes.

2. **Second Law (Entropy & Solar Input)**:
   $$\Delta S_{\text{universe}} \geq 0$$
   Systemic entropy changes ($\Delta S$) must be balanced by external solar thermal dissipation. Unbounded negative entropy shifts without external solar inputs trigger an audit flag in `energyViolationDetected`.

---

## 5. Verification & Test Plan
- Unit tests will be established in `tests/sprint_082.test.ts`.
- Mock state vectors with controlled mass imbalances will be passed to `evaluateDiscrepancy` to assert correct flag tripping and delta calculations.