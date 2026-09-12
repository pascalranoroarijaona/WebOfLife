<!-- Method Specifications -->

# Process Mining & Research: Thermodynamic State Vector Discrepancy Mapping Iterator
**Module Path:** `src/thermodynamics/state_validator.ts`
**Sprint:** 076

## 1. Physical & Thermodynamic Foundations

The Web of Life simulation engine models global biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Hydrological cycles) through discrete stock-flow collections. To maintain thermodynamic integrity, every state transition governed by the monadic execution pipeline must satisfy conservation laws:

1. **First Law of Thermodynamics (Conservation of Mass-Energy):**
   $$\sum \Delta M_{\text{in}} - \sum \Delta M_{\text{out}} = \Delta M_{\text{internal}} + \Delta M_{\text{dissipated}}$$
   For each elemental species $e \in \{C, N, P, H_2O\}$, the discrepancy $\delta_e$ between the expected baseline stock ($M_{\text{expected}}$) and the actual measured stock ($M_{\text{actual}}$) is defined as:
   $$\delta_e = |M_{\text{actual}, e} - M_{\text{expected}, e}|$$

2. **Second Law of Thermodynamics (Entropy Generation):**
   $$\Delta S_{\text{gen}} \ge 0$$
   Irreversible dissipation across stock collections must result in non-negative entropy generation increments, tracked alongside mass discrepancies.

---

## 2. Mathematical Formalization of Stock Transfer & Mapping

Let $S$ be a stock collection map where keys are elemental species identifiers and values represent total mass (in moles or kilograms). Let $B$ be the baseline reference vector.

The mapping function $\mathcal{M}$ iterates over the entries of $S$ and $B$, generating a collection of `DiscrepancyRecord` objects:

$$\mathcal{M}(S, B, \epsilon) = \left\{ R_e \right\}_{e \in \text{keys}(S)}$$

Where each record $R_e$ contains:
- **Element:** $e$
- **Expected:** $B(e)$
- **Actual:** $S(e)$
- **Discrepancy:** $\Delta_e = S(e) - B(e)$
- **Absolute Deviation:** $|\Delta_e|$
- **Tolerance Flag:** $\text{isWithinTolerance} = $|\Delta_e| \le \epsilon$

---

## 3. Executable Monad Method & Stock Transfer Equations

The following TypeScript interface and implementation contract formalize the mapping iterator for `src/thermodynamics/state_validator.ts`:

```typescript
import { DiscrepancyRecord, DiscrepancySummary, IStateValidator } from './types';

/**
 * StateValidator implements immutable, pure-functional verification 
 * of thermodynamic state vectors against conservation baselines.
 */
export class StateValidator implements IStateValidator {
  private readonly tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  /**
   * Maps current stock collections against baseline expectations to compute
   * elemental discrepancy records and summary conservation status.
   */
  public mapDiscrepancies(
    stocks: Map<string, number>, 
    baseline: Map<string, number>
  ): DiscrepancySummary {
    const records: DiscrepancyRecord[] = [];
    let maxDiscrepancy = 0;
    let allConserved = true;
    const timestamp = Date.now();

    for (const [elementKey, actualValue] of stocks.entries()) {
      const expectedValue = baseline.get(elementKey) ?? 0;
      const discrepancy = actualValue - expectedValue;
      const absDeviation = Math.abs(discrepancy);
      const isWithinTolerance = absDeviation <= this.tolerance;

      if (!isWithinTolerance) {
        allConserved = false;
      }

      if (absDeviation > maxDiscrepancy) {
        maxDiscrepancy = absDeviation;
      }

      // Type guard cast for valid Web of Life tracked elements
      const element = (['C', 'N', 'P', 'H2O'].includes(elementKey) 
        ? elementKey 
        : 'C') as 'C' | 'N' | 'P' | 'H2O';

      records.push({
        element,
        expected: expectedValue,
        actual: actualValue,
        discrepancy,
        timestamp,
        isWithinTolerance
      });
    }

    return {
      totalRecords: records.length,
      maxDiscrepancy,
      conserved: allConserved,
      records
    };
  }
}
```

---

## 4. Verification & Testing Specifications

- **Unit Test Vectors (`tests/sprint_076.test.ts`):**
  1. *Zero-Discrepancy Baseline:* Verify that identical maps return `conserved: true` and zero maximum discrepancy.
  2. *Threshold Violation Injection:* Inject a mass delta exceeding $\epsilon = 10^{-6}$ in carbon stocks ($\Delta C = 0.5$) and assert `isWithinTolerance: false`.
  3. *Multi-Element Aggregation:* Verify complete iteration across Carbon, Nitrogen, Phosphorus, and Water stocks simultaneously.