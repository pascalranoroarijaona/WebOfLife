<!-- Method Specifications -->

# Thermodynamic State Vector Stock Conservation Delta Calculator: Method Specifications

## 1. Overview
This document formalizes the exact mathematical, physical, and algorithmic methods implemented within the Thermodynamic State Vector Stock Conservation Delta Calculator (`src/thermodynamics/state_validator.ts`). The module enforces strict adherence to mass and energy conservation laws (First Law) and irreversible thermodynamic transformations (Second Law) across biogeochemical stocks in the Web of Life Earth pod simulation framework.

---

## 2. Fundamental Thermodynamic Principles

### 2.1 First Law of Thermodynamics (Mass & Elemental Conservation)
For any isolated or bounded biogeochemical stock $S_i$ (e.g., carbon, nitrogen, water, mineral pools, or thermal energy units), the internal rate of change plus net boundary transport must balance. Given a discrete simulation time step $\Delta t$, the expected stock variation $\Delta S_i$ driven by boundary flux rates $J_i$ is expressed as:

$$\Delta S_i = \left( \sum_{\text{in}} J_{i, \text{in}} - \sum_{\text{out}} J_{i, \text{out}} \right) \cdot \Delta t = \text{NetFlux}_i \cdot \Delta t$$

### 2.2 Second Law of Thermodynamics (Dissipation & Entropy Generation)
All work performed and material transformations executed within the pod are subject to entropic degradation. Total energy influx (primarily unidirectional solar irradiance $E_{\text{solar}}$) is partitioned into chemical/structural storage $\Delta U$ and degraded thermal dissipation $Q$:

$$E_{\text{solar}} = \Delta U + Q \quad \text{where} \quad Q \ge 0$$

The `StateValidator` component verifies that actual stock variations across time steps $\Delta t$ do not violate these upper bounds or create spontaneous matter-energy creation out of equilibrium.

---

## 3. Executable Monad & Validation Methods

The calculation logic is structured as an immutable, stateless evaluation monad operating over `StateVector` instances and `FluxRateMap` boundaries.

### 3.1 Mathematical Delta Calculation Method
$$\mathcal{M}_{\text{delta}}: (\text{StateVector}, \text{FluxRateMap}, \Delta t) \mapsto \text{Map}\langle\text{string}, \text{number}\rangle$$

```typescript
/**
 * Calculates expected stock deltas from boundary flux rates and simulation time steps.
 * @param initialVector Starting thermodynamic state vector
 * @param fluxRates Map of active boundary flux rates per stock/element
 * @param deltaTime Simulation step size (dt)
 */
public calculateExpectedDeltas(
  initialVector: StateVector,
  fluxRates: FluxRateMap,
  deltaTime: number
): Map<string, number> {
  const deltas = new Map<string, number>();
  for (const [stockKey, netRate] of fluxRates.entries()) {
    deltas.set(stockKey, netRate * deltaTime);
  }
  return deltas;
}
```

### 3.2 Conservation Validation & Discrepancy Analysis Method
$$\mathcal{M}_{\text{validate}}: (\mathbf{S}_{t-1}, \mathbf{S}_t, \text{FluxRateMap}, \Delta t, \epsilon) \mapsto \text{ValidationResult}$$

```typescript
/**
 * Validates if actual state vector changes conform to expected flux deltas within tolerance.
 */
public validateConservation(
  previousVector: StateVector,
  currentVector: StateVector,
  fluxRates: FluxRateMap,
  deltaTime: number
): ValidationResult {
  const expectedDeltas = this.calculateExpectedDeltas(previousVector, fluxRates, deltaTime);
  const discrepancies = new Map<string, number>();
  let isValid = true;

  for (const [key, expectedDelta] of expectedDeltas.entries()) {
    const actualValue = currentVector.getStock(key) - previousVector.getStock(key);
    const diff = Math.abs(actualValue - expectedDelta);
    discrepancies.set(key, diff);
    if (diff > this.tolerance) {
      isValid = false;
    }
  }

  return {
    isValid,
    expectedDeltas,
    discrepancies,
    maxTolerance: this.tolerance
  };
}
```

---

## 4. Concrete Stock Transfer Matrix Example

Consider a three-stock subsystem comprising Carbon ($C$), Water ($H_2O$), and Solar Thermal Energy ($E_{th}$) over a simulation step $\Delta t = 1.0\text{ s}$:

| Stock Key ($i$) | Initial Stock ($S_{t=0}$) | Net Flux Rate ($J_i$) | Expected Delta ($\Delta S_i$) | Actual Stock ($S_{t=1}$) | Discrepancy ($\epsilon_{\text{actual}}$) | Valid ($\le 10^{-6}$) |
|---|---|---|---|---|---|---|
| `carbon_pool` | $1000.0\text{ g}$ | $+5.2\text{ g/s}$ | $+5.2\text{ g}$ | $1005.2\text{ g}$ | $0.0\text{ g}$ | `true` |
| `water_pool` | $50000.0\text{ g}$ | $-12.5\text{ g/s}$ | $-12.5\text{ g}$ | $49987.5\text{ g}$ | $0.0\text{ g}$ | `true` |
| `solar_energy` | $0.0\text{ kJ}$ | $+342.0\text{ kJ/s}$ | $+342.0\text{ kJ}$ | $342.0\text{ kJ}$ | $0.0\text{ kJ}$ | `true` |

If an anomalous stock drift occurs where `water_pool` actual value reads $49985.0\text{ g}$ (actual change $-15.0\text{ g}$ versus expected $-12.5\text{ g}$), the discrepancy calculation evaluates:
$$\text{diff} = |-15.0 - (-12.5)| = 2.5 > 10^{-6}$$
Resulting in `isValid = false` and flagging an unbudgeted mass/energy leakage.