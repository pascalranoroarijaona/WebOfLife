<!-- Method Specifications -->

# Method Specifications: Sprint 036 - Thermodynamic State Vector Non-Negative Entropy Assertion

## 1. Process Overview & Physical Rationale
The Web of Life simulation engine models biogeochemical cycles, ecological succession, and industrial metabolic flows. To ensure absolute physical realism, all state transformations must adhere to the fundamental laws of thermodynamics:
1. **First Law of Thermodynamics (Conservation):** Total mass and energy are conserved across all stock transfers.
2. **Second Law of Thermodynamics (Entropy Directionality):** The total entropy of an isolated system (or the universe when accounting for boundaries) can never decrease over time ($\Delta S_{\text{univ}} \ge 0$), and system entropy must remain physically realizable ($S \ge 0$).

This specification formalizes the executable monad methods and stock transfer equations implemented in `src/thermodynamics/state_validator.ts` and integrated with `src/thermodynamics/thermodynamic_monad_process.ts`.

---

## 2. Thermodynamic Stock & Flow Equations

Let a thermodynamic state vector $\mathbf{X}$ at time $t$ be defined as:
$$\mathbf{X} = \left[ E, M_c, M_w, M_n, M_p, S, \dot{S}_{\text{gen}} \right]^T$$

Where:
- $E$: Total internal energy ($\text{J}$)
- $M_c, M_w, M_n, M_p$: Masses for Carbon, Water, Nitrogen, and Phosphorus pools ($\text{kg}$ or $\text{mol}$)
- $S$: System entropy ($\text{J}\cdot\text{K}^{-1}$)
- $\dot{S}_{\text{gen}}$: Rate of internal entropy generation ($\text{J}\cdot\text{K}^{-1}\cdot\text{s}^{-1}$)

### Validation Equations
For any valid state transition operated by a thermodynamic monad $P: \mathbf{X}_t \to \mathbf{X}_{t+\Delta t}$, the validator enforces:

1. **Absolute Entropy Floor:**
   $$S(\mathbf{X}) \ge 0$$

2. **Non-Negative Entropy Generation Rate:**
   $$\dot{S}_{\text{gen}}(\mathbf{X}) \ge 0$$

3. **Mass-Energy Conservation Bounds:**
   $$\sum \Delta M_{\text{system}} = 0 \quad (\text{closed boundary})$$
   $$\Delta E_{\text{system}} = Q_{\text{solar}} - W_{\text{dissipated}}$$

---

## 3. Executable Monad Method Specification

```ts
import { ThermodynamicState } from './state_validator';

export class ThermodynamicConstraintViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export class StateValidator {
  /**
   * Validates that the system state satisfies the Second Law of Thermodynamics.
   * Checks that entropy and entropy generation rates are non-negative.
   */
  public static validateEntropy(state: ThermodynamicState): boolean {
    const entropy = state.getEntropy();
    const entropyGenRate = state.getEntropyGenerationRate();

    return entropy >= 0 && entropyGenRate >= 0;
  }

  /**
   * Asserts non-negative entropy constraints, throwing an explicit error if violated.
   */
  public static assertNonNegativeEntropy(state: ThermodynamicState): void {
    const entropy = state.getEntropy();
    if (entropy < 0) {
      throw new ThermodynamicConstraintViolationError(
        `System entropy S = ${entropy} J/K violates the Third/Second Law (S >= 0 required).`
      );
    }

    const entropyGenRate = state.getEntropyGenerationRate();
    if (entropyGenRate < 0) {
      throw new ThermodynamicConstraintViolationError(
        `Entropy generation rate S_gen_dot = ${entropyGenRate} J/(K·s) violates the Second Law (S_gen_dot >= 0 required).`
      );
    }
  }
}
```

---

## 4. Integration with Thermodynamic Monad Processes

During monad execution (`ThermodynamicMonadProcess`), the state vector is intercepted and passed through the validator:

```ts
export class ThermodynamicMonadProcess {
  public execute<T extends ThermodynamicState>(state: T): T {
    // 1. Perform state transition calculations (mass/energy transfer)
    // ...

    // 2. Enforce Second Law bounds
    StateValidator.assertNonNegativeEntropy(state);

    return state;
  }
}
```