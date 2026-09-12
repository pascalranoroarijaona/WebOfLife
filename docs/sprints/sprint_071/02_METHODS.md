<!-- Method Specifications -->

# Sprint 071: Thermodynamic State Vector Discrepancy & Mass-Energy Delta Methods

## 1. Process Overview & Thermodynamic Foundation

In the Web of Life planetary metabolism simulation, thermodynamic and biogeochemical processes are modeled as state vector transitions operating over closed or semi-closed system boundaries. To maintain strict compliance with the **First Law of Thermodynamics** (Conservation of Mass and Energy) and track energetic degradation under the **Second Law**, systems must continuously validate measured actual states against expected theoretical state vectors.

This method specification formalizes the mathematical operations performed by the pure helper function `computeAbsoluteStockDelta(actual, expected)` within `src/thermodynamics/state_validator.ts`.

---

## 2. Elemental Stock Vector Formalization

Let a thermodynamic state vector $\mathbf{S}$ be defined as a mapping over the set of elemental and energetic keys $\mathcal{K}$:

$$\mathcal{K} = \{ \text{carbon}, \text{nitrogen}, \text{phosphorus}, \text{water}, \text{energy} \}$$

For any given process or spatial node $i$, the state vector is represented as:

$$\mathbf{S}_i = \begin{pmatrix} 
S_{i, \text{carbon}} \\ 
S_{i, \text{nitrogen}} \\ 
S_{i, \text{phosphorus}} \\ 
S_{i, \text{water}} \\ 
S_{i, \text{energy}} 
\end{pmatrix}$$

### Stock Transfer & Delta Equation

Given an actual measured state vector $\mathbf{S}_{\text{actual}}$ resulting from a monad execution and an expected baseline state vector $\mathbf{S}_{\text{expected}}$, the absolute discrepancy vector $\mathbf{\Delta}_{\text{abs}}$ is computed element-wise for each key $k \in \mathcal{K}$:

$$\Delta_{\text{abs}, k} = \left| S_{\text{actual}, k} - S_{\text{expected}, k} \right|$$

Where any uninitialized or missing stock key defaults to the zero-state boundary:

$$S_{\text{actual}, k} \leftarrow S_{\text{actual}, k} \lor 0, \quad S_{\text{expected}, k} \leftarrow S_{\text{expected}, k} \lor 0$$

---

## 3. Executable Monad Method Specification (`src/thermodynamics/state_validator.ts`)

```typescript
export type ElementalStockKey = 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'energy';

export type ThermodynamicStockMap = Record<ElementalStockKey, number>;

/**
 * Computes the absolute stock discrepancy between actual and expected thermodynamic states.
 * Enforces First Law residual checks by mapping exact absolute deltas per elemental key.
 * 
 * @param actual - The measured state vector or stock map after monad reduction.
 * @param expected - The baseline or targeted state vector or stock map.
 * @returns A record mapping each elemental key to its absolute difference: |actual - expected|.
 */
export function computeAbsoluteStockDelta(
    actual: ThermodynamicStockMap,
    expected: ThermodynamicStockMap
): ThermodynamicStockMap {
    const result = {} as ThermodynamicStockMap;
    const keys: ElementalStockKey[] = ['carbon', 'nitrogen', 'phosphorus', 'water', 'energy'];
    
    for (const key of keys) {
        const actVal = actual[key] ?? 0;
        const expVal = expected[key] ?? 0;
        result[key] = Math.abs(actVal - expVal);
    }
    
    return result;
}
```

---

## 4. Mass and Energy Conservation Verification

1. **Mass Balance Residuals (`carbon`, `nitrogen`, `phosphorus`, `water`)**:
   - If $\sum_{k \in \text{MassKeys}} \Delta_{\text{abs}, k} > \epsilon$ (where $\epsilon$ is machine precision tolerance), a closed-system boundary violation or unmonitored mass flux (sink/source leak) has occurred within the preceding monad cycle.
2. **Energetic Dissipation & Entropy (`energy`)**:
   - The absolute energy delta $\Delta_{\text{abs, energy}}$ isolates uncounted work, metabolic heat dissipation, or internal energy generation anomalies, feeding directly into Second Law entropy tracking routines.