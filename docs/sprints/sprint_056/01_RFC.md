```md
# RFC 056: Thermodynamic State Vector Stock Conservation Delta Calculator

## 1. Executive Summary
Sprint 056 introduces the **Thermodynamic State Vector Stock Conservation Delta Calculator** (`src/thermodynamics/state_validator.ts`). This module bridges boundary flux rates and discrete simulation time steps to isolate and validate expected stock deltas. In alignment with the First and Second Laws of Thermodynamics (matter conservation and external solar energy influx), this calculator ensures that all biogeochemical cycles (carbon, nitrogen, phosphorus, water) strictly account for mass preservation without spontaneous creation or destruction.

---

## 2. Architectural Context & Module Placement
The Web of Life architecture models planetary metabolism as a coupled set of thermodynamic stocks and fluxes contained within the `EarthPod` wrapper. 

```
┌────────────────────────────────────────────────────────┐
│                      EarthPod                          │
│                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │   Thermodynamic       │   │    StateVector        │ │
│  │   Structure           │──►│    (Stocks & Fluxes)  │ │
│  └───────────────────────┘   └──────────┬────────────┘ │
│                                         │              │
│                              ┌──────────▼────────────┐ │
│                              │   StateValidator      │ │
│                              │   (Delta Calculator)  │ │
│                              └───────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Affected Files:
- `src/thermodynamics/types.ts`: Extended with delta calculation types and validation interfaces.
- `src/thermodynamics/state_vector.ts`: Provides underlying stock and flux representations.
- `src/thermodynamics/state_validator.ts`: **[NEW]** Core implementation of the isolated expected stock delta calculation engine.
- `tests/sprint_056.test.ts`: **[NEW]** Comprehensive test suite verifying mass conservation and flux rate integrations.

---

## 3. Class Hierarchy & Interface Contracts

### 3.1 Interface Specifications (`src/thermodynamics/types.ts`)
```typescript
export interface IFlowRateVector {
    element: 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'energy';
    inflows: Map<string, number>;  // sourceId -> rate (mass/time)
    outflows: Map<string, number>; // sinkId -> rate (mass/time)
}

export interface IDeltaCalculationResult {
    element: string;
    netRate: number;
    expectedDelta: number;
    timeStep: number;
    isConserved: boolean;
    discrepancy: number;
}
```

### 3.2 Core Class: `StateValidator` (`src/thermodynamics/state_validator.ts`)
```typescript
import { IFlowRateVector, IDeltaCalculationResult } from './types';

export class StateValidator {
    private tolerance: number;

    constructor(tolerance: number = 1e-9) {
        this.tolerance = tolerance;
    }

    /**
     * Calculates expected stock delta given boundary flux rates and time step dt.
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
            isConserved: true, // Baseline conservation property for closed/bounded systems
            discrepancy: 0.0
        };
    }

    /**
     * Validates actual stock change against expected delta within numerical tolerance.
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

---

## 4. Thermodynamic Law Compliance
1. **First Law (Conservation of Matter/Energy):** The delta calculator ensures that $\Delta \text{Stock} = (\sum \text{Inflows} - \sum \text{Outflows}) \times \Delta t$. No mass is generated internally without an explicit inflow source.
2. **Second Law (Entropy & Dissipation):** Energy vectors account for solar influx as the singular external driving potential, with thermal dissipation tracked as bounded boundary outflows.

---

## 5. Verification & Testing Strategy
Test suite `tests/sprint_056.test.ts` will validate:
1. **Standard Inflow/Outflow Integration:** Confirms linear scaling of expected deltas with respect to simulation time step `dt`.
2. **Conservation Violation Detection:** Verifies that discrepancies exceeding the numerical tolerance `1e-9` correctly flag `isConserved: false`.
3. **Multi-Element Independence:** Ensures carbon, nitrogen, phosphorus, and water cycles maintain separate, uncoupled conservation balances.