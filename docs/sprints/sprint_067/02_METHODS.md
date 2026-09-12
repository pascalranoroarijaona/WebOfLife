<!-- Method Specifications -->

# Process Mining & Research Specifications: Sprint 067
## Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper (`src/thermodynamics/state_validator.ts`)

### 1. Process Overview & Thermodynamic Foundation
In biogeochemical modeling and industrial process simulation within the *Web of Life* framework, monad state transitions represent mass-energy transformations across living and abiotic compartments. To enforce rigorous adherence to physical conservation laws (First Law of Thermodynamics / Conservation of Mass) and state boundary constraints (Second Law entropy and dissipation limits), continuous state validation is required.

The `StateValidator` operationalizes deterministic mathematical evaluation of absolute inventory discrepancies across elemental stock vectors ($C, N, P, H_2O, O_2$, and energetic pools).

---

### 2. Mathematical Formalization & Conservation Equations

Let an arbitrary thermodynamic state vector $\vec{S}$ be defined as a mapping from elemental/molecular stock keys $k \in K$ to scalar quantities $q_k \in \mathbb{R}$ representing moles, mass ($\text{kg}$), or energy equivalents ($\text{Joules}$).

Given an actual state vector $\vec{S}_{\text{actual}}$ and an expected state vector $\vec{S}_{\text{expected}}$, the absolute inventory discrepancy $\Delta_k$ for any stock $k$ is computed as:

$$\Delta_k = \left| q_{k, \text{actual}} - q_{k, \text{expected}} \right|$$

#### Tolerance Evaluation Condition:
For each stock $k$, let $\tau_k$ be the allowable tolerance defined either by a custom per-element mapping or a global default tolerance $\tau_{\text{global}}$:

$$\tau_k = \begin{cases} 
\text{customTolerances}[k] & \text{if } k \in \text{customTolerances} \\ 
\tau_{\text{global}} & \text{otherwise} 
\end{cases}$$

The validation predicate $\mathcal{P}_k$ for stock $k$ is defined as:

$$\mathcal{P}_k = \begin{cases} 
\text{true} & \text{if } \Delta_k \le \tau_k \\ 
\text{false} & \text{if } \Delta_k > \tau_k 
\end{cases}$$

The global validation result $\text{IsValid}$ for the state vector transition is true if and only if all individual stock predicates evaluate to true:

$$\text{IsValid} = \bigwedge_{k \in K} \mathcal{P}_k$$

---

### 3. Executable Monad Method Specification

The method is encapsulated within the `StateValidator` monad utility class:

```typescript
import { StateVector } from './state_vector';
import { ValidationResult } from './types';

export class StateValidator {
  constructor(private globalTolerance: number = 1e-6) {}

  public evaluateDiscrepancy(
    actual: StateVector,
    expected: StateVector,
    customTolerances?: Record<string, number>
  ): ValidationResult {
    const differences: Record<string, number> = {};
    const violations: Record<string, string> = {};
    let isValid = true;

    const actualStocks = actual.getStocks();
    const expectedStocks = expected.getStocks();
    const keys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);

    for (const key of keys) {
      const actVal = actualStocks[key] ?? 0;
      const expVal = expectedStocks[key] ?? 0;
      const diff = Math.abs(actVal - expVal);
      differences[key] = diff;

      const tolerance = customTolerances?.[key] ?? this.globalTolerance;
      if (diff > tolerance) {
        isValid = false;
        violations[key] = `Discrepancy ${diff} exceeds tolerance ${tolerance}`;
      }
    }

    return {
      isValid,
      differences,
      violations
    };
  }
}
```

---

### 4. Verification Vectors

| Test Case ID | Actual Stock Vector ($q_{\text{actual}}$) | Expected Stock Vector ($q_{\text{expected}}$) | Tolerances ($\tau$) | Expected Output (`ValidationResult`) |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | `{ C: 100.0, H2O: 500.0 }` | `{ C: 100.0, H2O: 500.0 }` | Default ($10^{-6}$) | `isValid: true`, all $\Delta = 0.0$ |
| **TC-02** | `{ C: 100.000005, N: 10.0 }` | `{ C: 100.0, N: 10.0 }` | Default ($10^{-6}$) | `isValid: false`, violation on `C` ($\Delta = 5\times 10^{-6}$) |
| **TC-03** | `{ C: 100.005, N: 10.0 }` | `{ C: 100.0, N: 10.0 }` | `{ C: 0.01 }` | `isValid: true`, custom tolerance suppresses violation on `C` |