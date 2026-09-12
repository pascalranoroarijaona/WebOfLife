<!-- Method Specifications -->

# Thermodynamic Process Specifications: Sprint 082
**Author**: Process Mining & Research Scientist, Web of Life (Gaia)  
**Target Module**: `src/thermodynamics/state_validator.ts`  

---

## 1. Executive Summary & Physical Principles

Sprint 082 implements the rigorous mathematical validation wrapper for thermodynamic state vectors within the Web of Life simulation framework. Living systems exist as open thermodynamic engines far from equilibrium, sustained by continuous external energy fluxes (solar radiation) coupled with strict internal mass conservation. 

This specification formalizes the precise monad methods and stock-flow accounting equations executed by `StateDiscrepancyEvaluator.evaluateDiscrepancy()`.

---

## 2. Quantitative Thermodynamic Equations & Conservation Laws

### 2.1 First Law of Thermodynamics: Mass & Matter Conservation
Let $M_i$ represent the inventory stock of element or molecular species $i$ (e.g., carbon, nitrogen, phosphorus, water) within the system boundary. The total mass delta ($\Delta M_{\text{total}}$) evaluated between the actual runtime state vector ($\mathbf{x}_{\text{actual}}$) and the expected theoretical state vector ($\mathbf{x}_{\text{expected}}$) is defined as:

$$\Delta M_{\text{total}} = \sum_{i \in \text{mass-species}} \left( x_{\text{actual}, i} - x_{\text{expected}, i} \right)$$

**Constraint Condition**: 
$$\left| \Delta M_{\text{total}} \right| \leq \epsilon_{\text{tolerance}}$$
Where $\epsilon_{\text{tolerance}} = 10^{-6}$ (default). Any residual exceeding this threshold signifies unmodeled mass sources/sinks or ledger corruption, tripping the `energyViolationDetected` flag.

### 2.2 Energy Balance & Thermodynamic Violation Criteria
Let $E_j$ represent energy stocks (internal energy, chemical bond energy, thermal enthalpy). The energy discrepancy for stock $j$ is:

$$\Delta E_j = x_{\text{actual}, j} - x_{\text{expected}, j}$$

**Violation Trigger**:
$$\text{energyViolationDetected} = \left( \exists j \mid \Delta E_j > \epsilon_{\text{tolerance}} \right) \lor \left( \left| \Delta M_{\text{total}} \`> \epsilon_{\text{tolerance}} \right) \right)$$
*Note: Spontaneous creation of energy ($\Delta E_j > 0$ without explicit external work or solar input flux) constitutes an absolute First Law violation.*

### 2.3 Second Law of Thermodynamics: Entropy Production
The system entropy change ($\Delta S$) is calculated directly from the state vector's internal microstate representations or thermodynamic state functions:

$$\Delta S = S(\mathbf{x}_{\text{actual}}) - S(\mathbf{x}_{\text{expected}})$$

While open living systems can locally decrease entropy ($\Delta S_{\text{system}} < 0$) via metabolic work, the universe's total entropy must never decrease ($\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{environment}} \ge 0$). The validator records $\Delta S$ as an analytical metric within `IStateDiscrepancyReport`.

---

## 3. Executable Monad Method Specification

The discrepancy evaluation process is encapsulated as a pure functional transformation mapping two `StateVector` monads into an immutable `IStateDisricpancyReport` data structure.

### 3.1 Method Signature (`src/thermodynamics/state_validator.ts`)

```ts
import { StateVector } from './state_vector';

export interface IStateDiscrepancyReport {
  readonly timestamp: number;
  readonly absoluteDiscrepancy: Map<string, number>;
  readonly relativeDiscrepancy: Map<string, number>;
  readonly totalMassDelta: number;
  readonly energyViolationDetected: boolean;
  readonly entropyDelta: number;
}

export interface IStateValidator {
  /**
   * Evaluates discrepancies between actual runtime state vectors and expected thermodynamic expectations.
   * Enforces First Law (mass conservation) and Second Law (entropy increase / solar input bounds).
   */
  evaluateDiscrepancy(
    actual: StateVector,
    expected: StateVector
  ): IStateDiscrepancyReport;
}
```

### 3.2 Stock Transfer & Discrepancy Calculation Algorithm

```ts
export class StateDiscrepancyEvaluator implements IStateValidator {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  public evaluateDiscrepancy(
    actual: StateVector,
    expected: StateVector
  ): IStateDiscrepancyReport {
    const absoluteDiscrepancy = new Map<string, number>();
    const relativeDiscrepancy = new Map<string, number>();
    
    let totalMassDelta = 0;
    let energyViolationDetected = false;
    let entropyDelta = 0;

    const actualMap = actual.toMap();
    const expectedMap = expected.toMap();

    const allKeys = new Set([...actualMap.keys(), ...expectedMap.keys()]);

    for (const key of allKeys) {
      const actVal = actualMap.get(key) ?? 0;
      const expVal = expectedMap.get(key) ?? 0;
      const delta = actVal - expVal;
      
      // Absolute discrepancy: |x_act - x_exp|
      absoluteDiscrepancy.set(key, Math.abs(delta));
      
      // Relative discrepancy: |(x_act - x_exp) / x_exp| (or absolute if expVal is 0)
      const rel = expVal !== 0 ? Math.abs(delta / expVal) : Math.abs(delta);
      relativeDiscrepancy.set(key, rel);

      // Mass inventory aggregation for First Law verification
      if (
        key.includes('mass') || 
        key.includes('carbon') || 
        key.includes('nitrogen') || 
        key.includes('phosphorus') || 
        key.includes('water')
      ) {
        totalMassDelta += delta;
      }

      // First Law Energy Breach Check
      if (key.includes('energy') && delta > this.tolerance) {
        energyViolationDetected = true;
      }
    }

    // Global Mass Conservation Check
    if (Math.abs(totalMassDelta) > this.tolerance) {
      energyViolationDetected = true; 
    }

    // Second Law Entropy Delta Calculation
    entropyDelta = actual.getEntropy() - expected.getEntropy();

    return {
      timestamp: Date.now(),
      absoluteDiscrepancy,
      relativeDiscrepancy,
      totalMassDelta,
      energyViolationDetected,
      entropyDelta
    };
  }
}
```

---

## 4. Verification and Audit Traceability
1. **Unit Test Coverage**: Tests in `tests/sprint_082.test.ts` will feed controlled perturbation vectors into `evaluateDiscrepancy`.
2. **Assertion Matrix**:
   - *Mass-balanced shift*: `totalMassDelta == 0`, `energyViolationDetected == false`.
   - *Spontaneous mass creation*: `totalMassDelta > tolerance`, `energyViolationDetected == true`.
   - *Spontaneous energy generation*: $\Delta E_{\text{energy}} > \text{tolerance}$, `energyViolationDetected == true`.