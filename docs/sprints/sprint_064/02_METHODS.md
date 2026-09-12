<!-- Method Specifications -->

# Process Mining & Research: Thermodynamic State Vector Inventory Discrepancy Evaluator (`src/thermodynamics/state_validator.ts`)

## 1. Physical & Thermodynamic Process Foundations
The Web of Life simulation engine models biogeochemical cycles (carbon, water, nitrogen, phosphorus, mineral matrices) and thermal energy flows as state vectors. To maintain thermodynamic consistency (First Law of Thermodynamics: conservation of mass and energy; Second Law: entropy and directional dissipation bounds), state transitions executed by monad pipelines must be continuously validated against theoretical expected invariants.

The **Thermodynamic State Vector Inventory Discrepancy Evaluator** provides the mathematical foundation for checking whether an observed (`actual`) thermodynamic state vector deviates from a predicted (`expected`) state vector beyond strict, configurable elemental tolerances ($\epsilon$).

---

## 2. Formal Mass & Energy Delta Equations

Let an inventory vector $\mathbf{v}$ in a `ThermodynamicStateVector` be represented as a mapping of elemental stocks and energy/entropy metrics $k \in K$:

$$\mathbf{v} = \{ k_1: x_1, k_2: x_2, \dots, k_n: x_n \}$$

For a given expected state vector $\mathbf{v}_{\text{exp}}$ and actual state vector $\mathbf{v}_{\text{act}}$, the absolute discrepancy $\Delta_k$ for each inventory key $k$ is calculated as:

$$\Delta_k = |x_{\text{act}, k} - x_{\text{exp}, k}|$$

### Tolerance Evaluation Rule
Each inventory element or energy metric $k$ has an associated tolerance $\tau_k$ derived from `ThermodynamicToleranceConfig` (falling back to a default $\tau_{\text{default}} = 10^{-6}$):

$$\text{IsValid}_k = \begin{cases} 
true, & \text{if } \Delta_k \le \tau_k \\ 
false, & \text{if } \Delta_k > \tau_k 
\end{cases}$$

The global validity of the state transition is the logical conjunction of all element-wise validities:

$$\text{isValid}_{\text{global}} = \bigcap_{k \in K} \text{IsValid}_k$$

The maximum delta across all tracked components is computed as:

$$\Delta_{\max} = \max_{k \in K} (\Delta_k)$$

---

## 3. Executable Monad Method Specification (`src/thermodynamics/state_validator.ts`)

```ts
import { ThermodynamicStateVector } from './state_vector';
import { ThermodynamicToleranceConfig } from './types';

export interface DiscrepancyDetail {
  readonly expected: number;
  readonly actual: number;
  readonly delta: number;
  readonly tolerance: number;
}

export interface DiscrepancyResult {
  readonly isValid: boolean;
  readonly discrepancies: Record<string, DiscrepancyDetail>;
  readonly maxDelta: number;
}

export class ThermodynamicStateValidator {
  constructor(private readonly defaultTolerance: number = 1e-6) {}

  /**
   * Evaluates absolute differences between an actual state vector and an expected state vector
   * against individual or global elemental tolerances.
   */
  public evaluateDiscrepancy(
    expected: ThermodynamicStateVector,
    actual: ThermodynamicStateVector,
    tolerances?: ThermodynamicToleranceConfig
  ): DiscrepancyResult {
    const discrepancies: Record<string, DiscrepancyDetail> = {};
    let maxDelta = 0;
    let isValid = true;

    // Extract all unique keys from both state vectors
    const keys = new Set([
      ...Object.keys(expected.inventory || {}),
      ...Object.keys(actual.inventory || {})
    ]);

    for (const key of keys) {
      const expVal = expected.inventory[key] ?? 0;
      const actVal = actual.inventory[key] ?? 0;
      const delta = Math.abs(actVal - expVal);

      const tolerance = tolerances?.getElementTolerance(key) ?? this.defaultTolerance;

      if (delta > maxDelta) {
        maxDelta = delta;
      }

      const elementValid = delta <= tolerance;
      if (!elementValid) {
        isValid = false;
      }

      discrepancies[key] = {
        expected: expVal,
        actual: actVal,
        delta,
        tolerance
      };
    }

    return {
      isValid,
      discrepancies,
      maxDelta
    };
  }
}
```

---

## 4. Conservation Verification Matrix

| Process / State Transition | Conserved Quantity | Tolerance Bound ($\tau$) | Validation Outcome |
| :--- | :--- | :--- | :--- |
| **Isothermal Carbon Fixation** | Total Carbon Mass ($C_{\text{tot}}$) | $\le 10^{-6} \text{ kg}$ | Pass if $\Delta C \le \tau$ |
| **Hydrological Flux (Evapotranspiration)** | Water Mass ($H_2O_{\text{tot}}$) | $\le 10^{-5} \text{ kg}$ | Pass if $\Delta H_2O \le \tau$ |
| **Nitrogen Mineralization** | Total Nitrogen ($N_{\text{tot}}$) | $\le 10^{-6} \text{ kg}$ | Pass if $\Delta N \le \tau$ |
| **Thermal Dissipation (2nd Law)** | Internal Energy / Entropy | $\le 10^{-4} \text{ J}$ | Pass if $\Delta E \le \tau$ |