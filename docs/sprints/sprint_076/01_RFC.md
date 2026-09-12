# RFC 076: Thermodynamic State Vector Discrepancy Mapping Iterator

## 1. Executive Summary
This RFC specifies the architectural design and implementation requirements for `src/thermodynamics/state_validator.ts`. The primary objective is to implement a robust, high-performance mapping function over stock collections that aggregates individual elemental discrepancy records within the Web of Life thermodynamic framework. This ensures strict adherence to the First Law of Thermodynamics (matter/energy conservation across closed systems) and the Second Law (entropy management and irreversible dissipation tracking).

---

## 2. Architectural Context & Location
- **Module Path:** `src/thermodynamics/state_validator.ts`
- **Related Modules:**
  - `src/thermodynamics/state_vector.ts`: Defines elemental state vectors and conservation baselines.
  - `src/thermodynamics/types.ts`: Shared type definitions for discrepancy records and validation tolerances.
  - `src/thermodynamic_monad_process.ts` & `src/thermodynamics/thermodynamic_structure.ts`: Monadic structure governing state transitions.

---

## 3. Class Hierarchy Additions & Composition

To maintain incremental design principles, `StateValidator` will be introduced as an immutable, pure-functional utility class or composition module that interfaces directly with existing thermodynamic monad structures.

```
+-------------------------------------------------------------+
|                   BaseStateValidator                        |
|  - tolerance: number                                        |
|  + validateVector(vector: ThermodynamicStateVector): Result |
+-------------------------------------------------------------+
                              ^
                              | (Extends / Composes)
+-------------------------------------------------------------+
|                StateVectorDiscrepancyIterator               |
|  + mapDiscrepancies(stocks: StockCollection[]): DiscrepancyRecord[] |
|  + aggregateDiscrepancies(records: DiscrepancyRecord[]): Summary   |
+-------------------------------------------------------------+
```

---

## 4. Monad Stock Transitions & Thermodynamic Laws

1. **First Law Conservation:**
   - The total mass/energy entering a stock transition minus the output must equal the accumulated internal change plus dissipation.
   - Any violation exceeding $\epsilon$ (tolerance threshold) generates an elemental discrepancy record.
2. **Second Law Validation:**
   - Entropy generation $\Delta S_{gen} \ge 0$ is verified across every mapped stock collection step.
3. **Mapping Function Contract:**
   - Inputs: Array of stock collections representing elemental distribution across carbon, nitrogen, phosphorus, and water cycles.
   - Outputs: Aggregated `DiscrepancyRecord` collection detailing elemental imbalances, deviation magnitudes, and timestamp vectors.

---

## 5. Interface Contracts (`src/thermodynamics/state_validator.ts`)

```typescript
export interface DiscrepancyRecord {
  element: 'C' | 'N' | 'P' | 'H2O';
  expected: number;
  actual: number;
  discrepancy: number;
  timestamp: number;
  isWithinTolerance: boolean;
}

export interface DiscrepancySummary {
  totalRecords: number;
  maxDiscrepancy: number;
  conserved: boolean;
  records: DiscrepancyRecord[];
}

export interface IStateValidator {
  mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): DiscrepancySummary;
}
```

---

## 6. Verification and Test Plan
- **Unit Tests:** `tests/sprint_076.test.ts` will validate:
  1. Perfect conservation scenarios (zero discrepancy).
  2. Controlled mass-loss injection to test threshold alerts.
  3. Second-law entropy constraint validation.
- **Integration Tests:** Pipeline verification with `src/earth_pod.ts` and cycle aggregators (`src/cycles/carbon.ts`, etc.).