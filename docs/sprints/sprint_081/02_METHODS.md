<!-- Method Specifications -->

# Thermodynamic State Vector Inventory Discrepancy Evaluator - Method Specifications

## 1. Physical & Biological Process Foundations
The `StateValidator` operationalizes the First and Second Laws of Thermodynamics across Web of Life biospheric and elemental compartments (Carbon, Nitrogen, Phosphorus, and Water). 
- **First Law Enforcement:** Total mass-energy conservation is verified across compartments $c \in C$. For any transition, the inventory discrepancy vector $\Delta I$ is quantified by comparing the actual state vector $S_{\text{actual}}(c)$ against the expected evolutionary state vector $S_{\text{expected}}(c)$.
- **Second Law & Dissipation Tracking:** Irreversible exergy degradation and thermal dissipation anomalies are bounded by strict floating-point tolerances ($\epsilon < 10^{-6}$).

---

## 2. Mass-Energy Delta Equations

Let $M(S)$ be the total mass operator and $U(S)$ be the internal energy operator for a thermodynamic state vector $S$.

For each compartment $c$:
$$\Delta M_c = \left| M(S_{\text{actual}}(c)) - M(S_{\text{expected}}(c)) \right|$$
$$\Delta U_c = \left| U(S_{\text{actual}}(c)) - U(S_{\text{expected}}(c)) \right|$$

Global cumulative discrepancies:
$$\Sigma_{\text{mass}} = \sum_{c \in C} \Delta M_c$$
$$\Sigma_{\text{energy}} = \sum_{c \in C} \Delta U_c$$

Validation predicate:
$$\text{isValid} = (\Sigma_{\text{mass}} \le \tau_{\text{mass}}) \land (\Sigma_{\text{energy}} \le \tau_{\text{energy}})$$
where $\tau_{\text{mass}}$ and $\tau_{\text{energy}}$ are configured via `DiscrepancyTolerance`.

---

## 3. Executable Monad Method Signature & Stock Transfer Integration

The evaluation logic is encapsulated within the `StateValidator` class conforming to the `IStateValidator` interface (`src/thermodynamics/state_validator.ts`).

```typescript
import { ThermodynamicStateVector } from './state_vector';
import { ThermodynamicDiscrepancyReport, DiscrepancyTolerance } from './types';

export interface IStateValidator {
  evaluateDiscrepancy(
    actualMap: Map<string, ThermodynamicStateVector>,
    expectedMap: Map<string, ThermodynamicStateVector>,
    tolerance?: DiscrepancyTolerance
  ): ThermodynamicDiscrepancyReport;
}

export class StateValidator implements IStateValidator {
  constructor(private defaultTolerance: DiscrepancyTolerance = { mass: 1e-6, energy: 1e-6 }) {}

  public evaluateDiscrepancy(
    actualMap: Map<string, ThermodynamicStateVector>,
    expectedMap: Map<string, ThermodynamicStateVector>,
    tolerance: DiscrepancyTolerance = this.defaultTolerance
  ): ThermodynamicDiscrepancyReport {
    const discrepancies = new Map<string, number>();
    let totalMassDiscrepancy = 0;
    let totalEnergyDiscrepancy = 0;

    for (const [compartment, actualState] of actualMap.entries()) {
      const expectedState = expectedMap.get(compartment);
      if (!expectedState) {
        throw new Error(`Expected state missing for compartment: ${compartment}`);
      }

      const massDiff = Math.abs(actualState.getTotalMass() - expectedState.getTotalMass());
      const energyDiff = Math.abs(actualState.getInternalEnergy() - expectedState.getInternalEnergy());

      discrepancies.set(compartment, massDiff);
      totalMassDiscrepancy += massDiff;
      totalEnergyDiscrepancy += energyDiff;
    }

    const isValid = 
      totalMassDiscrepancy <= tolerance.mass && 
      totalEnergyDiscrepancy <= tolerance.energy;

    return {
      isValid,
      totalMassDiscrepancy,
      totalEnergyDiscrepancy,
      compartmentDiscrepancies: discrepancies,
      timestamp: Date.now()
    };
  }
}
```