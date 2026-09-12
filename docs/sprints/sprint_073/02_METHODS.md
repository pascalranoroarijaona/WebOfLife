<!-- Method Specifications -->

# Sprint 073 Method Specifications: Thermodynamic State Vector Discrepancy

## 1. Physical & Thermodynamic Foundations
The verification of biogeochemical and industrial state vectors within the Web of Life simulation engine relies on strict adherence to mass conservation laws (First Law of Thermodynamics). To monitor homeostasis and detect deviations from steady-state equilibria across closed elemental budgets ($C, N, P, H_2O$, etc.), the system requires precise mathematical quantification of discrepancies between actual measured states and expected baseline models.

The absolute difference function acts as a foundational invariant validator within the error-correction monad, feeding dissipation metrics and state-correction pipelines.

## 2. Mathematical Formalization
Let an elemental stock state vector be represented as a mapping from an elemental key $e \in \mathcal{E}$ to its scalar mass or molar stock $S_e \in \mathbb{R}$.

Given an actual state vector $\mathbf{S}_{\text{actual}}$ and an expected state vector $\mathbf{S}_{\text{expected}}$, the absolute stock delta for any elemental key $e$ is defined as:

$$\Delta_e = \left| S_{\text{actual}, e} - S_{\text{expected}, e} \right|$$

Where missing keys in either vector default to an absolute stock value of $0$.

## 3. Executable Monad Method Specification (`src/thermodynamics/state_validator.ts`)

```typescript
import { StateVector, ElementalKey } from './types';

/**
 * Computes the absolute elemental stock discrepancies between actual and expected thermodynamic state vectors.
 * 
 * @param actual - The measured or simulated current StateVector.
 * @param expected - The baseline or theoretical target StateVector.
 * @returns A record mapping each ElementalKey to its absolute scalar discrepancy.
 */
export function computeAbsoluteStockDelta(
  actual: StateVector,
  expected: StateVector
): Record<ElementalKey, number> {
  const result = {} as Record<ElementalKey, number>;
  
  // Extract all unique keys present across both state vectors
  const allKeys = new Set<ElementalKey>([
    ...(Object.keys(actual) as ElementalKey[]),
    ...(Object.keys(expected) as ElementalKey[])
  ]);

  for (const key of allKeys) {
    const actualVal = actual[key] ?? 0;
    const expectedVal = expected[key] ?? 0;
    result[key] = Math.abs(actualVal - expectedVal);
  }

  return result;
}
```

## 4. Conservation & Mass Balance Verification
- **Mass Closure:** Since $\Delta_e$ isolates the magnitude of deviation per element independently, total mass imbalance across the system can be derived via vector norm aggregation:
  $$\|\mathbf{\Delta}\|_1 = \sum_{e \in \mathcal{E}} \Delta_e$$
- **Monad Integration:** This pure helper function is stateless and deterministic, making it fully composable within functional validation pipelines (`Either` or `Validated` monads) operating on thermodynamic state transitions.