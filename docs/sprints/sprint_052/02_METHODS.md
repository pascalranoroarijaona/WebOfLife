<!-- Method Specifications -->

# Thermodynamic State Vector Stock Conservation Asserter - Method Specifications

## 1. Physical & Chemical Process Foundations

The Web of Life simulation engine models planetary-scale geochemical cycles, biogeochemical stocks, and thermodynamic state vectors. To ensure absolute physical consistency across discrete simulation intervals ($\Delta t$), the system enforces strict conservation laws derived from non-equilibrium thermodynamics and mass balance equations.

### 1.1 First Law: Mass & Element Conservation
For any closed or open thermodynamic control volume, the change in elemental or molecular stock ($S$) over time interval $\Delta t$ must exactly equal the net sum of all boundary fluxes ($\Phi_i$) integrated over time, plus or minus internal generation/consumption rates:

$$\Delta S_j = S_j(t + \Delta t) - S_j(t) = \sum_{i} \Phi_{ij} \cdot \Delta t \pm \epsilon$$

Where:
- $S_j$: Stock quantity of element/molecule $j$ (e.g., Carbon [C], Water [$H_2O$], Nitrogen [N], Phosphorus [P], Energy [J]).
- $\Phi_{ij}$: Boundary flux rate of species $j$ through boundary channel $i$ (units of mass/energy per unit time).
- $\Delta t$: Discrete simulation time step.
- $\epsilon$: Numerical tolerance bound (default $10^{-6}$).

### 1.2 Second Law: Entropy Consistency & Irreversibility
While mass and atomic species are conserved, thermodynamic energy availability is bounded by entropy production:

$$\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{surrounding}} \ge 0$$

The `StateValidator` evaluates internal energy state transitions to ensure non-negative entropy generation rates for spontaneous biological and geochemical processes.

---

## 2. Executable Monad Method Specifications

The following specification details the mathematical formulations and execution contracts for the `StateValidator` and associated monad methods within the Web of Life thermodynamic pipeline.

### 2.1 State Vector Definition
A `StateVector` represents the physical inventory of stocks at a discrete point in time $t$:

```typescript
export interface StateVector {
  timestamp: number;
  stocks: Map<string, number>; // e.g., "C_organic": 1500.0, "H2O_liquid": 50000.0, "Energy": 2.5e5
  enthalpy: number;
  entropy: number;
}
```

### 2.2 Conservation Asserter Monad Method (`validateStockConservation`)

The validation pipeline executes as a pure transformation over state vectors and boundary flux maps, returning an array of `ConservationReport` structures.

```typescript
import { StateVector, ConservationReport } from '../types/thermodynamics';

export class StateValidator {
  constructor(private tolerance: number = 1e-6) {}

  /**
   * Validates that stock deltas between pre-state and post-state match 
   * integrated boundary fluxes within numerical tolerance bounds.
   * 
   * @param preState StateVector at time t
   * @param postState StateVector at time t + deltaTime
   * @param boundaryFluxes Map of species/element boundary flux rates (units/time)
   * @param deltaTime Duration of the simulation interval (delta t)
   */
  public validateStockConservation(
    preState: StateVector,
    postState: StateVector,
    boundaryFluxes: Map<string, number>,
    deltaTime: number
  ): ConservationReport[] {
    const reports: ConservationReport[] = [];
    const allKeys = new Set([...preState.stocks.keys(), ...postState.stocks.keys(), ...boundaryFluxes.keys()]);

    for (const element of allKeys) {
      const initialStock = preState.stocks.get(element) ?? 0.0;
      const finalStock = postState.stocks.get(element) ?? 0.0;
      const actualDelta = finalStock - initialStock;

      const fluxRate = boundaryFluxes.get(element) ?? 0.0;
      const expectedDelta = fluxRate * deltaTime;

      const discrepancy = Math.abs(actualDelta - expectedDelta);
      const isValid = discrepancy <= this.tolerance;

      reports.push({
        element,
        isValid,
        expectedDelta,
        actualDelta,
        discrepancy,
        tolerance: this.tolerance
      });
    }

    return reports;
  }

  /**
   * Asserts complete thermodynamic compliance, throwing an error if any stock 
   * violates mass/energy conservation bounds.
   */
  public assertOrThrow(
    preState: StateVector,
    postState: StateVector,
    boundaryFluxes: Map<string, number>,
    deltaTime: number
  ): void {
    const reports = this.validateStockConservation(preState, postState, boundaryFluxes, deltaTime);
    const violations = reports.filter(r => !r.isValid);

    if (violations.length > 0) {
      const violationSummary = violations
        .map(v => `[${v.element}] Expected Δ: ${v.expectedDelta}, Actual Δ: ${v.actualDelta}, Discrepancy: ${v.discrepancy}`)
        .join('; ');
      throw new Error(`Thermodynamic Conservation Violation Detected: ${violationSummary}`);
    }
  }
}
```

---

## 3. Geochemical Cycle Invariant Verification

When integrated into sprint validation suites (`tests/sprint_052.test.ts`), the asserter verifies specific biogeochemical balances:

1. **Carbon Cycle**: Photosynthetic fixation and respiration fluxes must balance organic and inorganic carbon pools without mass leakage.
2. **Hydrological Cycle**: Precipitation, evaporation, and runoff boundary fluxes must account for exact changes in atmospheric, surface, and groundwater reservoirs.
3. **Energy Balance**: Radiant solar input minus thermal radiation and metabolic heat loss must balance internal enthalpy and entropy state variations.