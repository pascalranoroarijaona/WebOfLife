<!-- Method Specifications -->

# Sprint 051: Thermodynamic State Vector Stock Conservation Asserter (`src/thermodynamics/state_validator.ts`)

## 1. Process Overview & Thermodynamic Foundation

The **Thermodynamic State Vector Stock Conservation Asserter** formalizes the accounting of mass, elemental, and thermodynamic stocks ($\mathbf{S}$) across Earth Pod boundaries. It guarantees adherence to fundamental physical laws during monad process execution:

1. **First Law of Thermodynamics (Conservation of Mass and Energy):**
   $$\Delta \mathbf{S} = \int_{t_k}^{t_{k+1}} \mathbf{F}_{\text{net}}(t) \, dt$$
   In closed or bounded open systems, any change in internal stock levels must be fully accounted for by net boundary fluxes (mass influx/outflux, radiative transfer, and geothermal input).

2. **Second Law of Thermodynamics (Entropy Generation & Non-Equilibrium Flux):**
   Incoming solar radiation ($F_{\text{solar}}$) and outgoing longwave thermal dissipation ($F_{\text{dissipation}}$) drive open-system thermodynamic gradients, which are explicitly validated within the energy and thermal stock channels.

---

## 2. Mathematical Formalization & Stock Delta Equations

Let the state vector at time $t_k$ be defined across elemental and energetic components:
$$\mathbf{S}(t_k) = \begin{bmatrix} S_C \\ S_N \\ S_P \\ S_{H_2O} \\ E_{\text{thermal}} \\ H_{\text{entropy}} \end{bmatrix}$$

For a discrete simulation time step $\Delta t = t_{k+1} - t_k$, the observed state transition yields:
$$\Delta \mathbf{S}_{\text{observed}} = \mathbf{S}(t_{k+1}) - \mathbf{S}(t_k)$$

The predicted stock change $\Delta \mathbf{S}_{\text{predicted}}$ is derived from boundary flux rates $\mathbf{F}(t)$:
$$\Delta S_{\text{predicted}, i} = \begin{cases} 
F_{\text{net}, i} \cdot \Delta t & \text{for standard elemental stocks } (C, N, P, H_2O) \\
\left(F_{\text{net}, \text{energy}} + F_{\text{solar}} - F_{\text{dissipation}}\right) \cdot \Delta t & \text{for energetic / thermal stocks}
\end{cases}$$

### Tolerance Bound Validation
For each stock $i$, the discrepancy metric $\delta_i$ is evaluated against an allowable tolerance $\epsilon_i$:
$$\delta_i = \left| \Delta S_{\text{observed}, i} - \Delta S_{\text{predicted}, i} \right| \le \epsilon_i$$

If $\delta_i > \epsilon_i$, a conservation violation is logged containing the observed delta, predicted delta, absolute discrepancy, and configured tolerance.

---

## 3. Executable Monad Method Specification

The validation logic is formalized as an executable monad method within `ThermodynamicStateValidator`:

```typescript
import { StateVector } from './state_vector';
import { FluxBoundary, ValidationResult, IStateValidator } from './types';

export class ThermodynamicStateValidator implements IStateValidator {
  private defaultTolerance: number;

  constructor(defaultTolerance: number = 1e-6) {
    this.defaultTolerance = defaultTolerance;
  }

  public assertConservation(
    previousState: StateVector,
    currentState: StateVector,
    boundary: FluxBoundary,
    deltaTime: number,
    tolerances?: Map<string, number>
  ): ValidationResult {
    const violations: Array<{
      stockName: string;
      observedDelta: number;
      predictedDelta: number;
      discrepancy: number;
      tolerance: number;
    }> = [];

    const stockKeys = new Set([
      ...previousState.getKeys(),
      ...currentState.getKeys()
    ]);

    for (const stock of stockKeys) {
      const prevVal = previousState.getStock(stock) ?? 0;
      const currVal = currentState.getStock(stock) ?? 0;
      const observedDelta = currVal - prevVal;

      const fluxRate = boundary.netFluxes.get(stock) ?? 0;
      let predictedDelta = fluxRate * deltaTime;

      // First/Second Law enforcement for energy and thermal boundary transfer
      if (stock === 'energy' || stock === 'thermal') {
        predictedDelta += (boundary.solarInput - boundary.dissipationRate) * deltaTime;
      }

      const tolerance = tolerances?.get(stock) ?? this.defaultTolerance;
      const discrepancy = Math.abs(observedDelta - predictedDelta);

      if (discrepancy > tolerance) {
        violations.push({
          stockName: stock,
          observedDelta,
          predictedDelta,
          discrepancy,
          tolerance
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      timestamp: Date.now()
    };
  }
}
```

---

## 4. Verification & Testing Protocols

1. **Closed-System Mass Balance ($\pm 1e-7$ tolerance):**
   * *Condition:* $\mathbf{F}_{\text{net}} = 0$ for $C, N, P, H_2O$.
   * *Assertion:* $\Delta S_{\text{observed}} = 0$ across transitions; any spurious drift triggers a validation failure.
2. **Solar Radiative Forcing & Dissipation Balance:**
   * *Condition:* $F_{\text{solar}} > 0, F_{\text{dissipation}} > 0$.
   * *Assertion:* Energy and thermal stocks correctly integrate net radiative flux inputs minus longwave thermal loss over $\Delta t$.
3. **Anomaly Injection Testing:**
   * *Condition:* Artificially inject unmodeled mass/energy jumps exceeding $\epsilon = 10^{-6}$.
   * *Assertion:* `ValidationResult.isValid` returns `false` with fully populated violation vectors.