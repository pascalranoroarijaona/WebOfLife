```md
# RFC 061: Thermodynamic State Vector Inventory Discrepancy Evaluator

## 1. Overview & Sprint Goal
Sprint 61 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator** located at `src/thermodynamics/state_validator.ts`. This component implements rigorous discrepancy comparison logic evaluating absolute differences between actual stock deltas and expected flux-derived deltas across elemental cycles (Carbon, Nitrogen, Phosphorus, Water) under strict First and Second Law thermodynamic constraints (mass conservation, external solar/radiative input only).

---

## 2. Architectural Design & Class Hierarchy

```
[StateValidator] (New)
      │
      ├── consumes ──> [StateVector] (Actual stock states)
      ├── consumes ──> [ThermodynamicStructure] / [Cycle] (Flux rates & expected transformations)
      └── produces ──> [DiscrepancyReport] (Absolute deltas & conservation metrics)
```

### 2.1 Class Additions & Interfaces (`src/thermodynamics/state_validator.ts`)

```typescript
import { StateVector } from './state_vector';
import { ThermodynamicStructure } from './thermodynamic_structure';

export interface DiscrepancyRecord {
  stockKey: string;
  actualDelta: number;
  expectedFluxDelta: number;
  absoluteDiscrepancy: number;
  isWithinTolerance: boolean;
}

export interface ValidationReport {
  timestamp: number;
  totalAbsoluteDiscrepancy: number;
  records: DiscrepancyRecord[];
  isMassConserved: boolean;
}

export class StateValidator {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  public evaluate(
    previousState: StateVector,
    currentState: StateVector,
    structure: ThermodynamicStructure,
    deltaTime: number
  ): ValidationReport {
    const records: DiscrepancyRecord[] = [];
    let totalAbsoluteDiscrepancy = 0;

    const actualDeltas = currentState.computeDelta(previousState);
    const expectedDeltas = structure.calculateFluxDerivedDeltas(previousState, deltaTime);

    for (const key of Object.keys(actualDeltas)) {
      const actualDelta = actualDeltas[key] ?? 0;
      const expectedFluxDelta = expectedDeltas[key] ?? 0;
      const absoluteDiscrepancy = Math.abs(actualDelta - expectedFluxDelta);
      const isWithinTolerance = absoluteDiscrepancy <= this.tolerance;

      totalAbsoluteDiscrepancy += absoluteDiscrepancy;

      records.push({
        stockKey: key,
        actualDelta,
        expectedFluxDelta,
        absoluteDiscrepancy,
        isWithinTolerance,
      });
    }

    return {
      timestamp: Date.now(),
      totalAbsoluteDiscrepancy,
      records,
      isMassConserved: totalAbsoluteDiscrepancy <= this.tolerance,
    };
  }
}
```

---

## 3. Monad Stock Transitions & Thermodynamic Laws

1. **First Law (Conservation of Matter)**:
   - For any isolated control volume or Earth Pod ecosystem, $\Delta \text{Stock} = \sum \text{Inflows} - \sum \text{Outflows}$.
   - The `StateValidator` checks that actual measured stock changes match integrated flux calculations within a strict floating-point tolerance ($\epsilon = 10^{-6}$).
2. **Second Law (Entropy & Solar Input)**:
   - Energy dissipation and entropy generation are bounded by incoming solar flux. Mass balancing ensures no spontaneous matter creation or destruction occurs within internal biogeochemical pools.

---

## 4. Test Specifications (`tests/sprint_061.test.ts`)

- **Test 1**: Verify zero discrepancy when actual state deltas perfectly match flux-derived expectations.
- **Test 2**: Detect and report non-zero absolute discrepancy when external unmodeled forces perturb stocks.
- **Test 3**: Validate mass conservation flag toggles correctly based on tolerance thresholds.