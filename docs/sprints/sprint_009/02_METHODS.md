<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector & Second Law Monad (Sprint 009)

## 1. Overview & Physical Rationale
Sprint 009 establishes the formal thermodynamic accounting infrastructure for the Web of Life Earth pod. By enforcing rigorous First and Second Law constraints via immutable monad wrappers, the simulation guarantees thermodynamic consistency across coupled biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water).

This document details the mathematical formulations, conservation equations, and executable monad transition rules implemented in `src/thermodynamics/types.ts` and `src/thermodynamics/thermodynamic_structure.ts`.

---

## 2. Mathematical Formalisms & Conservation Equations

### 2.1 First Law of Thermodynamics (Energy Conservation)
The rate of change of total system internal energy ($U$) is governed by net boundary heat transfers, net work interactions, and enthalpy fluxes:
$$\frac{dU_{\text{sys}}}{dt} = \sum_k \dot{Q}_k - \dot{W}_{\text{net,out}} + \sum_i \dot{m}_i h_i$$

For the closed-material Web of Life Earth pod, external mass exchange is zero ($\sum \dot{m}_i = 0$), reducing the energy balance to:
$$\frac{dU_{\text{sys}}}{dt} = \dot{Q}_{\text{solar}} - \dot{Q}_{\text{emit}} + \sum \dot{W}_{\text{in,net}}$$

### 2.2 Second Law of Thermodynamics & Entropy Generation ($\dot{S}_{\text{gen}}$)
The entropy balance for the open thermodynamic control volume is:
$$\frac{dS_{\text{sys}}}{dt} = \sum_{k} \frac{\dot{Q}_k}{T_k} + \sum_i \dot{m}_i s_i + \dot{S}_{\text{gen}}$$

Given closed material boundaries ($\dot{m}_i = 0$), the entropy generation rate $\dot{S}_{\text{gen}}$ is isolated as:
$$\dot{S}_{\text{gen}} = \frac{dS_{\text{sys}}}{dt} - \left( \frac{\dot{Q}_{\text{solar}}}{T_{\text{sun}}} - \frac{\dot{Q}_{\text{emit}}}{T_{\text{sink}}} \right) \ge 0$$

### 2.3 Gouy-Stodola Theorem (Exergy Destruction Rate)
Irreversibilities within the Earth pod destroy work potential (exergy). The exergy destruction rate ($\dot{I}$) is linked directly to internal entropy generation via the dead-state temperature ($T_0$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

Where:
- $T_0$ is the ambient sink reference temperature (e.g., effective deep-space radiative sink $T_0 \approx 255\text{ K}$).

---

## 3. Executable Monad Method Specifications

### 3.1 `ThermodynamicStateMonad.initialize`
Validates initial boundary conditions against the Second Law before instantiating the simulation state vector.

```typescript
public static initialize(initialState: ThermodynamicStateVector): ThermodynamicStateMonad {
  if (initialState.entropyGenerationRateWattsPerKelvin < 0) {
    throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
  }
  if (initialState.solarInputWatts < 0 || initialState.planetaryEmissionWatts < 0) {
    throw new Error("First Law Violation: Radiative fluxes cannot be negative.");
  }
  return new ThermodynamicStateMonad(initialState);
}
```

- **Mass Delta:** $\Delta m = 0$ (Closed material boundary constraint).
- **Energy Delta:** $\Delta U = \int (\dot{Q}_{\text{solar}} - \dot{Q}_{\text{emit}}) \, dt$.
- **Entropy Delta:** $\Delta S_{\text{sys}} = \int \left( \frac{\dot{Q}_{\text{solar}}}{T_{\text{sun}}} - \frac{\dot{Q}_{\text{emit}}}{T_{\text{sink}}} + \dot{S}_{\text{gen}} \right) dt$.

### 3.2 `ThermodynamicStateMonad.map`
Executes a state transition function while intercepting and validating physical invariants.

```typescript
public map(transitionFn: (current: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateMonad {
  const nextState = transitionFn(this.state);
  
  // Enforce Second Law constraint: S_dot_gen >= 0 (with small numerical epsilon tolerance)
  if (nextState.entropyGenerationRateWattsPerKelvin < -1e-9) {
    throw new Error(
      `Second Law Violation: S_gen_dot (${nextState.entropyGenerationRateWattsPerKelvin}) < 0 detected during state transition.`
    );
  }

  // Enforce Gouy-Stodola consistency: I_dot = T_0 * S_gen_dot
  const expectedExergyDestruction = nextState.deadStateTemperatureKelvin * nextState.entropyGenerationRateWattsPerKelvin;
  if (Math.abs(nextState.exergyDestructionRateWatts - expectedExergyDestruction) > 1e-6) {
    throw new Error(
      `Exergy Inconsistency: I_dot (${nextState.exergyDestructionRateWatts}) != T_0 * S_gen_dot (${expectedExergyDestruction}).`
    );
  }

  return new ThermodynamicStateMonad(nextState);
}
```

---

## 4. Verification & Validation Protocol
1. **First Law Closure Test:** Verify that $\left| \frac{dU_{\text{sys}}}{dt} - (\dot{Q}_{\text{solar}} - \dot{Q}_{\text{emit}}) \right| \le \epsilon_{\text{tol}}$.
2. **Second Law Non-Negativity Test:** Assert $\dot{S}_{\text{gen}} \ge 0$ across 10,000 stochastic biogeochemical simulation ticks.
3. **Exergy Coupling Test:** Confirm exact proportionality between $\dot{I}$ and $\dot{S}_{\text{gen}}$ scaled by $T_0$.