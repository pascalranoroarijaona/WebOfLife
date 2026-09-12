<!-- Method Specifications -->

# Sprint 029: Thermodynamic State Vector Validation Wrapper & Monad Process Methods

## 1. Overview
This document formalizes the process mining specifications, mass-energy balance delta equations, and executable monad validation methods for **Sprint 029**. The primary objective is to enforce thermodynamic invariance (First and Second Laws of Thermodynamics) during biogeochemical monad state transitions within the Web of Life simulation architecture.

---

## 2. Process Physics & Thermodynamic Constraints

### 2.1 First Law: Conservation of Energy and Mass
For any monad transformation step $\mathcal{M}: \Gamma_t \to \Gamma_{t+\Delta t}$, the total mass of individual biochemical stocks (Carbon $C$, Nitrogen $N$, Phosphorus $P$, Water $H_2O$) and total internal energy $E$ must satisfy exact material and energy balance preservation bounds:

$$\Delta M_{\text{system}} = \sum_{i} \Delta m_i = 0 \quad \text{(Closed Pod Boundary)}$$
$$\Delta E_{\text{system}} = Q_{\text{net}} - W_{\text{work}}$$

Where any component stock $m_i \in \text{stocks}$ is constrained by:
$$m_i \ge 0 \quad \forall i \in \{C, N, P, H_2O, \dots\}$$

### 2.2 Second Law: Non-Negative Entropy & Absolute Temperature
Entropy $S$ and absolute temperature $T$ must obey strict physical bounds at all points across the monad execution lifecycle:
$$S \ge 0$$
$$T > 0$$

Any state vector violating these inequalities represents an unphysical state (perpetual motion or violation of statistical mechanics) and triggers an immediate process halt.

---

## 3. Executable Monad Methods (`src/thermodynamics/state_validator.ts`)

```typescript
import { ThermodynamicStateVector } from './state_vector';

export interface IStateValidator {
  validateStateVector(vector: ThermodynamicStateVector): boolean;
  assertNonNegativeEntropy(vector: ThermodynamicStateVector): void;
  assertRequiredProperties(vector: ThermodynamicStateVector): void;
  assertNonNegativeStocks(vector: ThermodynamicStateVector): void;
}

export type MonadStepFunction = (vector: ThermodynamicStateVector) => ThermodynamicStateVector;

export class ThermodynamicStateValidator implements IStateValidator {
  /**
   * Performs full validation of a ThermodynamicStateVector.
   * Throws an Error if any invariant is violated.
   */
  public static validateStateVector(vector: ThermodynamicStateVector): void {
    this.assertRequiredProperties(vector);
    this.assertNonNegativeEntropy(vector);
    this.assertNonNegativeStocks(vector);
  }

  public validateStateVector(vector: ThermodynamicStateVector): boolean {
    ThermodynamicStateValidator.validateStateVector(vector);
    return true;
  }

  /**
   * Asserts that all required structural and thermodynamic properties exist.
   */
  public static assertRequiredProperties(vector: ThermodynamicStateVector): void {
    if (!vector) {
      throw new Error('ValidationError: ThermodynamicStateVector is null or undefined.');
    }
    if (vector.energy === undefined || vector.energy === null) {
      throw new Error('ValidationError: Missing required property \'energy\'.');
    }
    if (vector.entropy === undefined || vector.entropy === null) {
      throw new Error('ValidationError: Missing required property \'entropy\'.');
    }
    if (vector.temperature === undefined || vector.temperature === null) {
      throw new Error('ValidationError: Missing required property \'temperature\'.');
    }
    if (vector.stocks === undefined || vector.stocks === null) {
      throw new Error('ValidationError: Missing required property \'stocks\'.');
    }
  }

  public assertRequiredProperties(vector: ThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertRequiredProperties(vector);
  }

  /**
   * Asserts that entropy and entropy generation rates are non-negative (Second Law),
   * and that absolute temperature is strictly positive.
   */
  public static assertNonNegativeEntropy(vector: ThermodynamicStateVector): void {
    const entropyVal = typeof vector.entropy === 'number' 
      ? vector.entropy 
      : (vector.entropy as any).total ?? 0;

    if (entropyVal < 0) {
      throw new Error(`ThermodynamicViolation (Second Law): Entropy cannot be negative. Found: ${entropyVal}`);
    }

    if (vector.temperature <= 0) {
      throw new Error(`ThermodynamicViolation: Absolute temperature must be strictly positive. Found: ${vector.temperature}`);
    }
  }

  public assertNonNegativeEntropy(vector: ThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertNonNegativeEntropy(vector);
  }

  /**
   * Asserts that material stocks (Carbon, Nitrogen, Phosphorus, Water) are non-negative (First Law / Mass Conservation).
   */
  public static assertNonNegativeStocks(vector: ThermodynamicStateVector): void {
    for (const [key, value] of Object.entries(vector.stocks)) {
      if (typeof value === 'number' && value < 0) {
        throw new Error(`ThermodynamicViolation (First Law): Stock '${key}' has negative mass/count: ${value}`);
      }
    }
  }

  public assertNonNegativeStocks(vector: ThermodynamicStateVector): void {
    ThermodynamicStateValidator.assertNonNegativeStocks(vector);
  }

  /**
   * Wraps a monad step execution with pre-validation and post-validation checks.
   */
  public static wrapMonadStep(stepFn: MonadStepFunction): MonadStepFunction {
    return (vector: ThermodynamicStateVector): ThermodynamicStateVector => {
      // Pre-execution validation
      this.validateStateVector(vector);

      // Execute step
      const nextVector = stepFn(vector);

      // Post-execution validation
      this.validateStateVector(nextVector);

      return nextVector;
    };
  }
}
```

---

## 4. Stock Transfer Equation Matrix

| Process / Monad Step | Input Stock ($I$) | Output Stock ($O$) | Mass Delta ($\Delta m$) | Energy Delta ($\Delta E$) | Entropy Delta ($\Delta S$) |
|----------------------|-------------------|-------------------|------------------------|---------------------------|----------------------------|
| Photosynthesis       | $CO_2, H_2O, Q_{solar}$ | $C_6H_{12}O_6, O_2$ | $\sum \Delta m = 0$     | $+E_{\text{chemical}}$     | $\Delta S_{\text{univ}} \ge 0$ |
| Respiration          | $C_6H_{12}O_6, O_2$ | $CO_2, H_2O$      | $\sum \eta m = 0$     | $-E_{\text{heat}}$        | $\Delta S_{\text{univ}} \ge 0$ |
| Hydrological Cycle   | $H_2O_{(l)}$       | $H_2O_{(g)}$       | $\Delta m_{H2O} = 0$   | $+Q_{\text{latent}}$      | $\Delta S_{\text{univ}} \ge 0$ |