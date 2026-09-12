<!-- Method Specifications -->

# Thermodynamic Process Specifications: Sprint 072
**Author:** Process Mining & Research Scientist, Web of Life  
**Module:** `src/thermodynamics/state_validator.ts`  
**Target:** `computeAbsoluteStockDelta(actual, expected)`

## 1. Physical & Biogeochemical Context
In the Web of Life simulation architecture, biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water) are maintained as discrete thermodynamic state vectors. To validate conservation laws (First Law of Thermodynamics) and feed error gradients into regulatory monads (Second Law dissipation loops), the system must compute precise, element-wise absolute discrepancies between observed (`actual`) and predicted (`expected`) stock inventories.

## 2. Mathematical Formalization
Let $S_A$ be the `actual` state vector and $S_E$ be the `expected` state vector, where each vector is represented as a dictionary mapping elemental keys $k \in K$ (such as `'C'`, `'N'`, `'P'`, `'H2O'`) to scalar mass or molar quantities ($\mathbb{R}_{\ge 0}$).

The union of all keys present in either record is defined as:
$$K_{\text{total}} = \text{keys}(S_A) \cup \text{keys}(S_E)$$

For any key $k \in K_{\text{total}}$, if a key is missing from either dictionary, its default quantity is evaluated as $0$. The absolute stock delta function $\Delta(k)$ is defined as:
$$\Delta(k) = \left| S_A(k) - S_E(k) \right|$$

Thus, the resulting delta record $\Delta_{\text{vector}}$ is constructed as:
$$\Delta_{\text{vector}} = \{ k : \Delta(k) \mid \forall k \in K_{\text{total}} \}$$

## 3. Executable Monad Method Specification
The pure helper function adheres strictly to functional programming principles (no side effects, deterministic transformations) and is integrated into the monad validation pipeline.

```typescript
/**
 * Computes the absolute stock delta between actual and expected thermodynamic state vectors.
 * 
 * @param actual - Record of actual elemental stock quantities.
 * @param expected - Record of expected/baseline elemental stock quantities.
 * @returns A new record mapping each elemental key to its absolute numerical difference.
 */
export function computeAbsoluteStockDelta(
    actual: Record<string, number>,
    expected: Record<string, number>
): Record<string, number> {
    const allKeys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    const deltas: Record<string, number> = {};

    for (const key of allKeys) {
        const actualVal = actual[key] ?? 0;
        const expectedVal = expected[key] ?? 0;
        deltas[key] = Math.abs(actualVal - expectedVal);
    }

    return deltas;
}
```

## 4. Conservation & Validation Rules
1. **Mass Conservation (First Law):** Total mass discrepancies calculated across closed systems must sum within acceptable machine-precision floating-point tolerances ($\epsilon < 10^{-12}$).
2. **Asymmetric Key Resilience:** Missing keys default to $0$, ensuring that sparse state vectors (e.g., tracking only newly introduced metabolites or localized water pools) do not throw runtime undefined reference exceptions.
3. **Purity & Side-Effect Free Execution:** The function does not mutate `actual` or `expected` inputs, preserving the immutability guarantees required by state-transition monads in the Web of Life architecture.