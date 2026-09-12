# RFC 068: Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper

## 1. Executive Summary
This RFC specifies the architectural design and implementation details for Sprint 068: the **Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper** (`src/thermodynamics/state_validator.ts`). This module provides isolated, deterministic mathematical comparison routines to verify thermodynamic state vectors against individual elemental tolerances, maintaining strict adherence to mass conservation and the First/Second Laws of Thermodynamics.

---

## 2. Architectural Context & Scope
The Web of Life simulation models Earth pod biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water) driven exclusively by solar energy input and bounded by strict mass conservation. 

As components cycle matter between reservoirs and monad processes execute state transitions, independent verification of state vectors is required to detect numerical drift, mass leakage, or violations of elemental constraints. The `StateValidator` helper provides a decoupled, pure-function or class-based evaluation engine to compute absolute and relative differences between expected and actual state vectors against configurable per-element tolerances.

---

## 3. Class Hierarchy & Interface Contracts

### 3.1 Interface Specifications (`src/thermodynamics/types.ts` additions)
```typescript
export interface ElementalTolerances {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
  energy?: number;
  [element: string]: number | undefined;
}

export interface DiscrepancyReport {
  isValid: boolean;
  discrepancies: {
    [element: string]: {
      expected: number;
      actual: number;
      absoluteDifference: number;
      tolerance: number;
      exceeded: boolean;
    };
  };
  maxDiscrepancy: number;
  timestamp: number;
}
```

### 3.2 Core Helper Class: `StateValidator` (`src/thermodynamics/state_validator.ts`)
```typescript
import { ThermodynamicStateVector } from './state_vector';
import { ElementalTolerances, DiscrepancyReport } from './types';

export class StateValidator {
  private defaultTolerances: ElementalTolerances;

  constructor(defaultTolerances?: ElementalTolerances) {
    this.defaultTolerances = defaultTolerances || {
      carbon: 1e-6,
      nitrogen: 1e-6,
      phosphorus: 1e-6,
      water: 1e-6,
      energy: 1e-4
    };
  }

  /**
   * Evaluates absolute differences between an actual state vector and an expected state vector
   * against individual elemental tolerances.
   */
  public evaluate(
    actual: ThermodynamicStateVector,
    expected: ThermodynamicStateVector,
    tolerances?: ElementalTolerances
  ): DiscrepancyReport {
    const activeTolerances = { ...this.defaultTolerances, ...(tolerances || {}) };
    const discrepancies: DiscrepancyReport['discrepancies'] = {};
    
    const actualData = actual.getElements();
    const expectedData = expected.getElements();
    
    let maxDiff = 0;
    let allValid = true;

    const keys = new Set([...Object.keys(actualData), ...Object.keys(expectedData)]);

    for (const key of keys) {
      const actVal = actualData[key] ?? 0;
      const expVal = expectedData[key] ?? 0;
      const absDiff = Math.abs(actVal - expVal);
      const tol = activeTolerances[key] ?? 1e-6;
      const exceeded = absDiff > tol;

      if (exceeded) {
        allValid = false;
      }

      if (absDiff > maxDiff) {
        maxDiff = absDiff;
      }

      discrepancies[key] = {
        expected: expVal,
        actual: actVal,
        absoluteDifference: absDiff,
        tolerance: tol,
        exceeded
      };
    }

    return {
      isValid: allValid,
      discrepancies,
      maxDiscrepancy: maxDiff,
      timestamp: Date.now()
    };
  }
}
```

---

## 4. Thermodynamic & Mass Conservation Guarantees
1. **First Law (Conservation of Matter)**: The validator enforces strict equality checks within defined numerical floating-point tolerances ($\epsilon$) across all elemental pools ($C, N, P, H_2O$). Unaccounted mass generation or destruction triggers `isValid: false`.
2. **Second Law (Entropy & Dissipation)**: Energy state vector discrepancies track allowable thermodynamic dissipation bounds, preventing perpetual motion artifacts or spontaneous free energy creation without solar input attribution.

---

## 5. Testing & Verification Plan
- **Unit Tests (`tests/sprint_068.test.ts`)**:
  - Test exact state vector matches (zero discrepancy).
  - Test state vectors within tolerance bounds.
  - Test state vectors exceeding tolerance bounds per element ($C, N, P, H_2O$).
  - Test custom tolerance overrides.
- **Integration**: Validate state transitions across thermodynamic monads and cycle processors (`CarbonCycle`, `WaterCycle`, etc.).