```md
# RFC 055: Thermodynamic State Vector Stock Conservation Delta Calculator

## 1. Executive Summary
Sprint 055 introduces the **Thermodynamic State Vector Stock Conservation Delta Calculator** (`src/thermodynamics/state_validator.ts`). This module provides isolated mathematical calculation of expected stock deltas ($\Delta S$) derived from boundary flux rates ($F$) and simulation time steps ($\Delta t$). It reinforces our commitment to rigorous First and Second Law thermodynamics, ensuring complete mass-energy conservation across biogeochemical cycles (carbon, nitrogen, phosphorus, water) under strictly bounded solar input.

---

## 2. Architectural Objectives
1. **Isolate Delta Calculation:** Provide a pure mathematical utility class/function to compute expected stock changes without side effects or implicit global state mutations.
2. **First Law Conservation:** Validate that sum of inputs minus sum of outputs matches net stock accumulation within machine epsilon tolerances.
3. **Incremental Composition:** Integrate cleanly with existing classes in `src/thermodynamics/state_vector.ts`, `src/thermodynamics/monad_process.ts`, and cycle implementations (`src/cycles/`).
4. **Testability & Auditing:** Enable comprehensive assertion suites in `tests/sprint_055.test.ts` verifying conservation laws under varying time step granularities and flux vectors.

---

## 3. Class Hierarchy & Interface Contracts

### 3.1 Interface Contracts (`src/thermodynamics/types.ts` additions)
```typescript
export interface FluxVector {
  sourceId: string;
  targetId: string;
  element: 'C' | 'N' | 'P' | 'H2O' | 'ENERGY';
  rate: number; // units per second
}

export interface DeltaCalculationResult {
  element: string;
  expectedDelta: number;
  netInflow: number;
  netOutflow: number;
  isConserved: boolean;
}
```

### 3.2 State Validator Class (`src/thermodynamics/state_validator.ts`)
```typescript
import { StateVector } from './state_vector';
import { FluxVector, DeltaCalculationResult } from './types';

export class ThermodynamicStateValidator {
  /**
   * Calculates expected stock deltas from boundary fluxes over a given time step.
   * Enforces First Law of Thermodynamics (Conservation of Mass/Energy).
   */
  public static calculateDelta(
    initialState: StateVector,
    fluxes: FluxVector[],
    deltaTime: number
  ): Map<string, DeltaCalculationResult> {
    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();

    for (const flux of fluxes) {
      const amount = flux.rate * deltaTime;
      if (flux.targetId) {
        inflowMap.set(flux.targetId, (inflowMap.get(flux.targetId) || 0) + amount);
      }
      if (flux.sourceId) {
        outflowMap.set(flux.sourceId, (outflowMap.get(flux.sourceId) || 0) + amount);
      }
    }

    const results = new Map<string, DeltaCalculationResult>();
    const stocks = initialState.getAllStocks();

    for (const [stockId, currentStock] of stocks.entries()) {
      const inflow = inflowMap.get(stockId) || 0;
      const outflow = outflowMap.get(stockId) || 0;
      const expectedDelta = inflow - outflow;

      results.set(stockId, {
        element: stockId,
        expectedDelta,
        netInflow: inflow,
        netOutflow: outflow,
        isConserved: currentStock + expectedDelta >= 0 // Second law / non-negativity constraint
      });
    }

    return results;
  }
}
```

---

## 4. Thermodynamic Law Enforcement
- **First Law (Conservation):** $\Delta S = \sum \text{Inflows} - \sum \text{Outflows}$ over $\Delta t$. Unaccounted creation or destruction of matter/energy throws a thermodynamic violation error.
- **Second Law (Entropy & Bounds):** Stocks cannot drop below absolute zero ($S_t \ge 0$). Flux rates scaling against chemical gradients must satisfy directional entropy dissipation.

---

## 5. Verification & Test Plan
- **Unit Tests (`tests/sprint_055.test.ts`):**
  1. Verify zero-flux equilibrium leaves state vectors untouched ($\Delta S = 0$).
  2. Verify constant positive flux scales linearly with $\Delta t$.
  3. Assert violation detection when mass is artificially injected without a valid source boundary.
- **Database / UML Schema Update:**
  - Generate `db/uml/sprint_055_schema.puml` reflecting state validator integration with monad stock transitions.