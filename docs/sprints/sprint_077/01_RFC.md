# RFC 077: Thermodynamic State Vector Discrepancy Aggregator

## 1. Overview & Executive Summary
Sprint 077 introduces the **Thermodynamic State Vector Discrepancy Aggregator** within `src/thermodynamics/state_validator.ts`. This component formalizes the evaluation pipeline by mapping state vectors across thermodynamic evaluation results and computing maximum discrepancy accumulation vectors. Adhering strictly to the First and Second Laws of Thermodynamics, this module ensures that energy and matter transformations within the Web of Life biosphere simulation are continuously monitored for balance anomalies, dissipation bounds, and conservation violations.

---

## 2. Architectural Placement & Class Hierarchy

```
[BaseMonadProcess] --> [ThermodynamicMonadProcess] --> [StateValidator]
                                                            │
                                                            ▼
                                              [StateVectorDiscrepancyAggregator]
```

### 2.1 Class Additions & Composition
- **`StateValidator` (`src/thermodynamics/state_validator.ts`)**: Extended to include discrepancy mapping functions and aggregation accumulators.
- **`StateVector` (`src/thermodynamics/state_vector.ts`)**: Provides the underlying data structure representing conserved stocks (Carbon, Nitrogen, Phosphorus, Water, and Enthalpy).
- **`ThermodynamicMonadProcess`**: Manages monadic state transitions ensuring pure functional transformations without matter leakage.

---

## 3. Monad Stock Transitions & Thermodynamic Laws

### 3.1 First Law Compliance (Matter/Energy Conservation)
All transitions within the monad stock pipeline preserve total mass and energy:
$$\sum \Delta \text{Stock}_{\text{in}} = \sum \Delta \text{Stock}_{\text{out}} + \Delta \text{Dissipation}$$

### 3.2 Second Law Compliance (Entropy Generation)
Discrepancies calculated by the aggregator quantify deviations from ideal reversible or steady-state pathways, bounding maximum allowable entropy production:
$$\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{surrounding}} \ge 0$$

---

## 4. Interface Contracts & Specifications

```typescript
export interface IStateEvaluationResult {
  timestamp: number;
  expectedVector: IStateVector;
  actualVector: IStateVector;
  discrepancy: number;
}

export interface IStateVectorAggregator {
  mapEvaluations(results: IStateEvaluationResult[]): number[];
  accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number;
}
```

### 4.1 Methods in `src/thermodynamics/state_validator.ts`
1. `mapEvaluations(results: IStateEvaluationResult[]): number[]`: Maps an array of state evaluation results to an array of scalar discrepancy values.
2. `accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number`: Computes the maximum discrepancy accumulated across all evaluated cycles to flag potential thermodynamic breaches.

---

## 5. Verification & Testing Strategy
- **Unit Tests**: Add `tests/sprint_077.test.ts` to validate mapping correctness and maximum discrepancy accumulation under normal and anomalous thermodynamic states.
- **Integration Tests**: Verify end-to-end integration with `EarthPod` and biogeochemical cycles (`Carbon`, `Nitrogen`, `Phosphorus`, `Water`).