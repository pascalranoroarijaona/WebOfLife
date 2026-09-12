<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector Inventory Discrepancy Evaluator (`src/thermodynamics/state_validator.ts`)

## 1. Physical & Biogeochemical Process Context
The Web of Life simulation models continuous mass-conserved geochemical and biological transformations across Earth pod elemental reservoirs. While individual monad processes execute mass-conserved stoichiometric transfers (Carbon, Nitrogen, Phosphorus, and Water), accumulated floating-point arithmetic or improper reservoir scaling can introduce drift. 

The `StateValidator` provides the mathematical mechanism to inspect thermodynamic state vectors ($S$) against expected baseline vectors ($S^*$) under strict per-element tolerance thresholds ($\epsilon_i$).

---

## 2. Mathematical Formalization & Stock Transfer Equations

Let a thermodynamic state vector be represented as a mapping of elemental inventories and energy:
$$S = \{ e_i \mid i \in \{ \text{carbon}, \text{nitrogen}, \text{phosphorus}, \text{water}, \text{energy}, \dots \} \}$$

Given an actual state vector $S_{\text{actual}}$ and an expected state vector $S_{\text{expected}}$, the discrepancy evaluation for each element $i$ is formalized as:

$$\Delta_i = |e_{i, \text{actual}} - e_{i, \text{expected}}|$$

A tolerance threshold $\tau_i$ is defined for each element $i$ (defaulting to $\epsilon = 10^{-6}$ for mass elements and $10^{-4}$ for energy). The validation predicate $P_i$ for element $i$ is expressed as:

$$P_i = \begin{cases} 
true, & \text{if } \Delta_i \le \tau_i \\ 
false, & \text{if } \Delta_i > \tau_i 
\end{cases}$$

The aggregate validity of the entire system state vector is defined as the logical conjunction of all element predicates:

$$\text{isValid} = \bigwedge_{i} P_i$$

The maximum system discrepancy $\Delta_{\max}$ across all tracked elements is calculated as:

$$\Delta_{\max} = \max_i (\Delta_i)$$

---

## 3. Executable Monad Method Specifications

### 3.1 `StateValidator.evaluate`
```typescript
/**
 * Evaluates absolute differences between an actual state vector and an expected state vector
 * against individual elemental tolerances.
 * 
 * Stock Transfer & Balance Equation:
 *   e_i_diff = | actual(e_i) - expected(e_i) |
 *   exceeded_i = e_i_diff > tolerance(e_i)
 */
public evaluate(
  actual: ThermodynamicStateVector,
  expected: ThermodynamicStateVector,
  tolerances?: ElementalTolerances
): DiscrepancyReport
```

#### Parameters:
- `actual`: `ThermodynamicStateVector` representing the post-transition system state.
- `expected`: `ThermodynamicStateVector` representing the theoretically derived or mass-balanced baseline state.
- `tolerances` (Optional): `ElementalTolerances` overrides for specific elemental or energy thresholds.

#### Returns:
- `DiscrepancyReport`: Contains global validity flag (`isValid`), per-element breakdown of expected vs. actual values, absolute differences, tolerances, exceeded status, maximum system discrepancy (`maxDiscrepancy`), and UTC timestamp.