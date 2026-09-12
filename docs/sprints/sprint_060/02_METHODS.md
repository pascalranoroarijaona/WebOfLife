<!-- Method Specifications -->

# Sprint 060: Thermodynamic State Vector Inventory Discrepancy Evaluator Methods

This document formalizes the physical, biological, and industrial process specifications, mass/energy delta equations, and executable monad transition methods implemented in `src/thermodynamics/state_validator.ts` and related thermodynamic modules for Sprint 060.

---

## 1. Biogeochemical Process Research & Conservation Equations

To satisfy the **First Law of Thermodynamics** (conservation of matter and energy) across simulated planetary systems, all biogeochemical stocks ($S$) must strictly balance their actual discrete-time accumulation against cumulative integrated input and output fluxes ($\Phi$).

### 1.1 Carbon Cycle Inventory
* **Stock Reservoir:** Biomass Carbon, Soil Organic Carbon, Atmospheric $CO_2$.
* **Process:** Photosynthesis (input), Respiration & Decomposition (output).
* **Mass Delta Equation:**
  $$\Delta S_{\text{Carbon}} = S_{t+\Delta t} - S_t = \int_{t}^{t+\Delta t} \left( \Phi_{\text{photosynthesis}}(t) - \Phi_{\text{respiration}}(t) - \Phi_{\text{decomposition}}(t) \right) dt$$

### 1.2 Water Cycle Inventory
* **Stock Reservoir:** Hydrosphere, Soil Moisture, Atmospheric Vapor.
* **Process:** Precipitation (input), Evapotranspiration & Runoff (output).
* **Mass Delta Equation:**
  $$\Delta S_{\text{Water}} = W_{t+\Delta t} - W_t = \int_{t}^{t+\Delta t} \left( \Phi_{\text{precipitation}}(t) - \Phi_{\text{evapotranspiration}}(t) - \Phi_{\text{runoff}}(t) \right) dt$$

### 1.3 Energy / Solar Flux Exclusivity (Second Law Constraint)
* **Process:** Exogenous Solar Irradiation vs. Internal Dissipation.
* **Energy Balance Rule:** All non-conserved internal energy transformations must be bound by entropy generation limits. Unaccounted internal energy creation ($\Delta E_{\text{unaccounted}} > 0$) without a registered solar flux source vector ($\Phi_{\text{solar}}$) triggers an unrecoverable `ThermodynamicDiscrepancyViolationError`.

---

## 2. Executable Monad Methods & Stock Transfer Equations

The `StateValidator` class encapsulates monad verification logic, ensuring that state transitions executed within the Web of Life simulation engine remain within strict numerical precision bounds ($\epsilon = 10^{-6}$).

### 2.1 Discrepancy Evaluation Monad (`evaluateDiscrepancy`)

Calculates the absolute mathematical divergence between actual physical stock variations and integrated flux expectations.

```typescript
/**
 * Evaluates the absolute divergence for a single inventory stock.
 * 
 * @param stockId - Unique identifier of the biogeochemical stock (e.g., 'CARBON_ATMOSPHERE')
 * @param actualDelta - Measured change in stock quantity: S(t+dt) - S(t)
 * @param expectedDelta - Cumulative integrated flux delta: Integral(In - Out) dt
 * @returns DiscrepancyResult containing absolute difference and tolerance compliance flag
 */
public evaluateDiscrepancy(
    stockId: string,
    actualDelta: number,
    expectedDelta: number
): DiscrepancyResult {
    const absoluteDifference = Math.abs(actualDelta - expectedDelta);
    return {
        stockId,
        actualDelta,
        expectedDelta,
        absoluteDifference,
        isWithinTolerance: absoluteDifference <= this.tolerance
    };
}
```

### 2.2 State Vector Validation Monad (`validateStateVector`)

Aggregates vector inventories across sequential temporal states (`StateVector`), verifying complete system compliance.

```typescript
/**
 * Validates an entire state vector transition against expected flux-derived deltas.
 * 
 * @param previousVector - The baseline thermodynamic state vector at time t
 * @param currentVector - The resulting thermodynamic state vector at time t + dt
 * @param fluxDerivedDeltas - Map of expected net fluxes per stock ID over the interval
 * @returns ValidationReport detailing overall validity, maximum divergence, and per-stock results
 */
public validateStateVector(
    previousVector: StateVector,
    currentVector: StateVector,
    fluxDerivedDeltas: Map<string, number>
): ValidationReport {
    const discrepancies: DiscrepancyResult[] = [];
    let maxDiscrepancy = 0;
    let isValid = true;

    for (const [stockId, currentStock] of currentVector.getStocks()) {
        const previousStock = previousVector.getStock(stockId) ?? 0;
        const actualDelta = currentStock - previousStock;
        const expectedDelta = fluxDerivedDeltas.get(stockId) ?? 0;

        const result = this.evaluateDiscrepancy(stockId, actualDelta, expectedDelta);
        discrepancies.push(result);

        if (result.absoluteDifference > maxDiscrepancy) {
            maxDiscrepancy = result.absoluteDifference;
        }

        if (!result.isWithinTolerance) {
            isValid = false;
        }
    }

    return {
        timestamp: Date.now(),
        isValid,
        maxDiscrepancy,
        discrepancies
    };
}
```

---

## 3. Numerical Tolerance & Verification Parameters

| Parameter | Symbol | Default Value | Description |
| :--- | :---: | :---: | :--- |
| **Precision Tolerance** | $\epsilon$ | `1e-6` | Maximum allowable absolute variance between actual stock deltas and flux integrals. |
| **Timestamp Metric** | $t$ | `Date.now()` | Epoch millisecond marker for audit reporting and telemetry logs. |