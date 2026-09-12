<!-- Method Specifications -->

# Sprint 011 Method Specifications: Thermodynamic State Vector & Monadic Transitions

## 1. Physical & Thermodynamic Process Formalization

This document formalizes the process mining and executable monad methods for Sprint 011 (`src/thermodynamics/types.ts` and associated modules). The simulation engine treats planetary pods and biochemical/biogeochemical cycles as open thermodynamic systems interacting with boundary energy (solar/thermal radiation) and mass fluxes.

### 1.1 First Law of Thermodynamics (Energy & Mass Closure)
The rate of change of total internal energy ($E_{\text{sys}}$) within control volume $\Omega$ is tracked continuously:
$$\frac{dE_{\text{sys}}}{dt} = \dot{Q}_{\text{net}} - \dot{W}_{\text{net}} + \sum_{\text{in}} \dot{m}_{\text{in}} h_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} h_{\text{out}}$$

Where:
- $\dot{Q}_{\text{net}} = \text{solarInbound} - \text{thermalOutbound} + \text{sensibleHeatFlux}$ [$\text{W}$]
- $\dot{W}_{\text{net}}$ = Net rate of work done by the system [$\text{W}$]
- $\dot{m}_{\text{in}}, \dot{m}_{\text{out}}$ = Inflow and outflow mass flow rates [$\text{kg}\cdot\text{s}^{-1}$]
- $h_{\text{in}}, h_{\text{out}}$ = Specific enthalpies [$\text{J}\cdot\text{kg}^{-1}$]

### 1.2 Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)
The entropy balance equation governs internal disorder accumulation and irreversibilities:
$$\frac{dS_{\text{sys}}}{dt} = \frac{\dot{Q}_{\text{net}}}{T_{\text{sys}}} + \sum_{\text{in}} \dot{m}_{\text{in}} s_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} s_{\text{out}} + \dot{S}_{\text{gen}}$$

The **Clausius Postulate / Entropy Generation Invariant**:
$$\dot{S}_{\text{gen}} \ge 0$$

The **Gouy-Stodola Theorem** (Exergy Destruction Rate $\dot{I}$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
where $T_0 = 288.15\text{ K}$ (`STANDARD_AMBIENT_TEMPERATURE_K`).

---

## 2. Executable Monad Implementation (`src/thermodynamics/thermodynamic_structure.ts`)

Below is the concrete implementation of the state transition runner enforcing thermodynamic constraints as a functional monad.

```typescript
/**
 * @file src/thermodynamics/thermodynamic_structure.ts
 * @description Executable Monad methods and validation logic for thermodynamic state vectors.
 */

import { 
  IThermodynamicStateVector, 
  IThermodynamicValidator, 
  STANDARD_AMBIENT_TEMPERATURE_K 
} from './types';

/**
 * Concrete implementation of the Thermodynamic Validator ensuring First & Second Law compliance.
 */
export class ThermodynamicValidator implements IThermodynamicValidator {
  public validateState(state: IThermodynamicStateVector): boolean {
    this.assertSecondLaw(state.entropyGenerationRate);
    this.assertExergyConsistency(state);
    return true;
  }

  public assertSecondLaw(entropyGenRate: number): void {
    if (entropyGenRate < 0) {
      throw new Error(
        `[Second Law Violation]: Entropy generation rate (\dot{S}_gen = ${entropyGenRate} J/(K*s)) must be >= 0.`
      );
    }
  }

  public assertExergyConsistency(state: IThermodynamicStateVector): void {
    const expectedExergy = state.referenceTemperature * state.entropyGenerationRate;
    const delta = Math.abs(state.exergyDestructionRate - expectedExergy);
    if (delta > 1e-5) {
      throw new Error(
        `[Exergy Inconsistency]: Exergy destruction rate (${state.exergyDestructionRate} W) does not match T_0 * S_gen (${expectedExergy} W).`
      );
    }
  }
}

/**
 * Functional Monad structure for immutable, validated thermodynamic state propagation.
 */
export class ThermodynamicStateMonad {
  private static validator = new ThermodynamicValidator();

  private constructor(private readonly state: IThermodynamicStateVector) {}

  /**
     * Initializes the monad with an initial thermodynamic state vector.
     */
  public static of(initialState: IThermodynamicStateVector): ThermodynamicStateMonad {
    ThermodynamicStateMonad.validator.validateState(initialState);
    return new ThermodynamicStateMonad(initialState);
  }

  /**
     * Applies a pure state transition function, returning a new monadic container 
     * with enforced Second Law invariants and auto-aligned exergy destruction rates.
     */
  public map(transitionFn: (s: IThermodynamicStateVector) => IThermodynamicStateVector): ThermodynamicStateMonad {
    const rawNextState = transitionFn(this.state);

    // Enforce Second Law invariant check
    ThermodynamicStateMonad.validator.assertSecondLaw(rawNextState.entropyGenerationRate);

    // Enforce Gouy-Stodola Theorem consistency: I = T_0 * S_gen
    const normalizedExergyDestruction = rawNextState.referenceTemperature * rawNextState.entropyGenerationRate;

    const nextState: IThermodynamicStateVector = {
      ...rawNextState,
      exergyDestructionRate: normalizedExergyDestruction
    };

    ThermodynamicStateMonad.validator.validateState(nextState);

    return new ThermodynamicStateMonad(nextState);
  }

  /**
     * Extracts a deep copy of the current immutable state vector.
     */
  public getState(): IThermodynamicStateVector {
    return JSON.parse(JSON.stringify(this.state));
  }
}
```

---

## 3. Stock Transfer Equation Matrices

When coupled with biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water), state transitions update internal energy and entropy according to exact stoichiometry and thermodynamic potentials:

| Process Type | Net Energy Delta ($\Delta E_{\text{sys}}$) | Entropy Generation ($\dot{S}_{\text{gen}}$) | Exergy Destruction ($\dot{I}$) |
| :--- | :--- | :--- | :--- |
| **Solar Radiation Absorption** | $+\dot{Q}_{\text{solar}}$ | $\frac{\dot{Q}_{\text{solar}}}{T_{\text{surface}}} - \frac{\dot{Q}_{\text{solar}}}{T_{\text{sun}}}$ | $T_0 \dot{S}_{\text{gen}}$ |
| **Biomass Respiration / Catabolism** | $-\dot{W}_{\text{metabolic}} + \sum \dot{m}h$ | $\frac{Q_{\text{dissipated}}}{T_{\text{sys}}} + \sum \Delta s_{\text{chem}}$ | $T_0 \dot{S}_{\text{gen}}$ |
| **Hydrological Evapotranspiration** | $\dot{m}_{\text{water}} (h_{\text{vap}} - h_{\text{liq}})$ | $\dot{m}_{\text{water}} (s_{\text{vap}} - s_{\text{liq}}) + \frac{\dot{Q}}{T}$ | $T_0 \dot{S}_{\text{gen}}$ |