<!-- Method Specifications -->

# Thermodynamic State Vector Stock Conservation Delta Calculator: Process Methodology & Monad Specifications

## 1. Physical & Biogeochemical Process Foundation
The Web of Life simulation engine models EarthPod planetary metabolism as a closed thermodynamic system (with respect to mass) bounded by solar radiative energy influx and thermal/radiative outflux. To maintain physical realism in accordance with the **First Law of Thermodynamics (Conservation of Energy and Mass)**, all state transitions across discrete simulation time steps ($\Delta t$) must satisfy the exact mass-balance continuity equation:

$$\frac{dM_i}{dt} = \sum_{j} \Phi_{ij}^{\text{in}} - \sum_{k} \Phi_{ik}^{\text{out}}$$

Where:
- $M_i$ represents the stock mass or energy content of element/pool $i$ (carbon, nitrogen, phosphorus, water, or energy).
- $\Phi_{ij}^{\text{in}}$ is the inward mass/energy flux rate from source $j$ into pool $i$.
- $\Phi_{ik}^{\text{out}}$ is the outward mass/energy flux rate from pool $i$ to sink $k$.

Discretized over a simulation time step $\Delta t$, the expected stock delta ($\Delta M_i^{\text{expected}}$) is calculated as:

$$\Delta M_i^{\text{expected}} = \left( \sum_{j} \Phi_{ij}^{\text{in}} - \sum_{k} \Phi_{ik}^{\text{out}} \right) \cdot \Delta t$$

---

## 2. Mass/Energy Delta Equations Across Biogeochemical Vectors

The `StateValidator` evaluates conservation independently for each elemental and energetic monad vector:

### 2.1 Carbon Cycle Vector
- **Inflows ($\Phi^{\text{in}}$):** Photosynthetic fixation, geological outgassing, organic matter absorption.
- **Outflows ($\Phi^{\text{out}}$):** Autotrophic/heterotrophic respiration, combustion, leaching.
- **Delta Equation:** 
  $$\Delta C_{\text{expected}} = (\Phi_{\text{photosynthesis}} + \Phi_{\text{geological\_in}} - \Phi_{\text{respiration}} - \Phi_{\text{decomposition}}) \cdot \Delta t$$

### 2.2 Water Cycle Vector
- **Inflows ($\Phi^{\text{in}}$):** Precipitation, aquifer recharge, condensation.
- **Outflows ($\Phi^{\text{out}}$):** Evapotranspiration, runoff, percolation.
- **Delta Equation:** 
  $$\Delta W_{\text{expected}} = (\Phi_{\text{precipitation}} + \Phi_{\text{inflow\_runon}} - \Phi_{\text{evapotranspiration}} - \Phi_{\text{runoff}}) \cdot \Delta t$$

### 2.3 Nitrogen & Phosphorus Nutrient Vectors
- **Inflows ($\Phi^{\text{in}}$):** Nitrogen fixation, atmospheric deposition, mineral weathering (P).
- **Outflows ($\Phi^{\text{out}}$):** Denitrification, leaching, sedimentation (P).
- **Delta Equation:** 
  $$\Delta N_{\text{expected}} = (\Phi_{\text{fixation}} + \Phi_{\text{deposition}} - \Phi_{\text{denitrification}} - \Phi_{\text{leaching}}) \cdot \Delta t$$

### 2.4 Energy Vector (Second Law & Solar Influx)
- **Inflows ($\Phi^{\text{in}}$):** Incident solar radiative flux ($S_{\text{in}}$).
- **Outflows ($\Phi^{\text{out}}$):** Longwave thermal radiation, latent heat flux, sensible heat dissipation.
- **Delta Equation:** 
  $$\Delta E_{\text{expected}} = (S_{\text{in}} - (\Phi_{\text{thermal\_radiation}} + \Phi_{\text{latent\_heat}} + \Phi_{\text{sensible\_heat}})) \cdot \Delta t$$

---

## 3. Executable Monad Methods & Concrete Stock Transfer Equations

The calculation engine is encapsulated within the `StateValidator` class (`src/thermodynamics/state_validator.ts`), operating on immutable flow rate vectors and validating against actual observed stock deltas within a rigorous numerical tolerance ($\epsilon = 10^{-9}$).

### 3.1 Monad Signature & Method Specifications

```typescript
import { IFlowRateVector, IDeltaCalculationResult } from './types';

export class StateValidator {
    private tolerance: number;

    constructor(tolerance: number = 1e-9) {
        this.tolerance = tolerance;
    }

    /**
     * Monad Operation: Calculates expected stock delta given boundary flux rates and time step dt.
     * ΔStock = (Σ Inflows - Σ Outflows) * dt
     */
    public calculateExpectedDelta(
        vector: IFlowRateVector,
        dt: number
    ): IDeltaCalculationResult {
        let totalInflow = 0;
        for (const rate of vector.inflows.values()) {
            totalInflow += rate;
        }

        let totalOutflow = 0;
        for (const rate of vector.outflows.values()) {
            totalOutflow += rate;
        }

        const netRate = totalInflow - totalOutflow;
        const expectedDelta = netRate * dt;

        return {
            element: vector.element,
            netRate,
            expectedDelta,
            timeStep: dt,
            isConserved: true,
            discrepancy: 0.0
        };
    }

    /**
     * Monad Operation: Validates actual stock change against expected delta within numerical tolerance.
     */
    public validateStockDelta(
        vector: IFlowRateVector,
        dt: number,
        actualDelta: number
    ): IDeltaCalculationResult {
        const result = this.calculateExpectedDelta(vector, dt);
        const discrepancy = Math.abs(result.expectedDelta - actualDelta);
        const isConserved = discrepancy <= this.tolerance;

        return {
            ...result,
            isConserved,
            discrepancy
        };
    }
}
```

### 3.2 Verification & Error Tolerance Matrix
| Test Condition | Input Flow Vectors ($\Phi$) | Time Step ($\Delta t$) | Actual Delta ($\Delta M_{\text{actual}}$) | Expected Result (`isConserved`) | Discrepancy Bound |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Exact Conservation** | In: 5.0, Out: 2.0 | 1.0 s | 3.0 | `true` | $< 10^{-9}$ |
| **Linear Time Scaling** | In: 10.0, Out: 4.0 | 0.5 s | 3.0 | `true` | $< 10^{-9}$ |
| **Conservation Violation**| In: 5.0, Out: 2.0 | 1.0 s | 3.00002 | `false` | $> 10^{-9}$ |