```md
<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector Stock Conservation Asserter
**Sprint:** 053  
**Path:** `src/thermodynamics/state_validator.ts`  
**Author:** Process Mining & Research Scientist, Web of Life  

---

## 1. Physical & Thermodynamic Principles

The Web of Life simulation engine models biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) and energy transformations using composable monad thermodynamic process chains. To ensure rigorous adherence to physical laws, **Sprint 053** introduces the `StateValidator` monad method to enforce mass and energy conservation across discrete time steps ($\Delta t$).

### 1.1 First Law of Conservation of Mass/Energy
For any species $i$ (e.g., dissolved organic carbon, nitrate, metabolic water, radiant heat) within a defined system boundary (compartment or global `EarthPod`), the change in stored inventory mass or energy ($\Delta S_i$) between time $t$ and $t + \Delta t$ must precisely equal the integrated net boundary flux:

$$\Delta S_i = S_i(t + \Delta t) - S_i(t) = \int_{t}^{t+\Delta t} \left( \sum \Phi_{\text{in}, i}(t) - \sum \Phi_{\text{out}, i}(t) \right) dt$$

Under discrete simulation steps with constant or averaged flux rates $\Phi$, this is approximated as:

$$\Delta S_{i, \text{expected}} = \left( \sum \Phi_{\text{in}, i} - \sum \Phi_{\text{out}, i} \right) \cdot \Delta t$$

### 1.2 Second Law & Entropy Production
While mass and elemental atoms are conserved ($\Delta M_{\text{total}} = 0$), available energy undergoes degradation. Energy entering via solar irradiance ($E_{\text{solar}}$) drives internal negentropy and work, eventually dissipating as long-wave thermal radiation ($E_{\text{heat}}$ across system boundaries):

$$\Delta S_{\text{universe}} = \Delta S_{\text{system}} + \Delta S_{\text{surroundings}} \ge 0$$

The `StateValidator` ensures that internal monad process conversions (photosynthesis, respiration, fixation, denitrification) maintain elemental stoichiometry while tracking thermodynamic consistency.

---

## 2. Executable Monad Method Specifications

### 2.1 Interface & Type Definitions (`src/thermodynamics/types.ts`)

```typescript
export interface BoundaryFluxRates {
  /** Map of species or element ID to net incoming/outgoing rates (mass/energy units per second) */
  fluxes: Map<string, number>;
}

export interface StateVector {
  timestamp: number;
  /** Map of species or element ID to absolute inventory stock levels (mass/energy units) */
  stocks: Map<string, number>;
}

export interface DiscrepancyRecord {
  expectedDelta: number;
  actualDelta: number;
  error: number;
}

export interface ValidationResult {
  valid: boolean;
  discrepancies: Map<string, DiscrepancyRecord>;
  timestamp: number;
  maxTolerance: number;
}
```

### 2.2 `StateValidator` Class Implementation (`src/thermodynamics/state_validator.ts`)

```typescript
import { StateVector, BoundaryFluxRates, ValidationResult, DiscrepancyRecord } from './types';

export class StateValidator {
  private defaultTolerance: number;
  private conservationHooks: Array<(result: ValidationResult) => void>;

  constructor(defaultTolerance: number = 1.0e-6) {
    this.defaultTolerance = defaultTolerance;
    this.conservationHooks = [];
  }

  /**
     * Validates whether inventory stock deltas match integrated boundary fluxes within tolerance.
     */
  public validateConservation(
    previous: StateVector,
    current: StateVector,
    fluxes: BoundaryFluxRates,
    dt: number,
    tolerance: number = this.defaultTolerance
  ): ValidationResult {
    const dtActual = current.timestamp - previous.timestamp;
    // Use provided dt or measured timestamp delta
    const effectiveDt = dt > 0 ? dt : (dtActual > 0 ? dtActual : 1.0);
    
    const discrepancies = new Map<string, DiscrepancyRecord>();
    let isValid = true;

    // Collect all unique species keys from both state vectors
    const allSpecies = new Set<string>([
      ...previous.stocks.keys(),
      ...current.stocks.keys()
    ]);

    for (const species of allSpecies) {
      const prevStock = previous.stocks.get(species) || 0;
      const currStock = current.stocks.get(species) || 0;
      const actualDelta = currStock - prevStock;

      const netFluxRate = fluxes.fluxes.get(species) || 0;
      const expectedDelta = netFluxRate * effectiveDt;

      const error = Math.abs(actualDelta - expectedDelta);

      if (error > tolerance) {
        isValid = false;
        discrepancies.set(species, {
          expectedDelta,
          actualDelta,
          error
        });
      }
    }

    const result: ValidationResult = {
      valid: isValid,
      discrepancies,
      timestamp: current.timestamp,
      maxTolerance: tolerance
    };

    if (!isValid) {
      this.notifyHooks(result);
    }

    return result;
  }

  /**
     * Asserts conservation, throwing an Error if mass/energy balance is violated.
     */
  public assertConservation(
    previous: StateVector,
    current: StateVector,
    fluxes: BoundaryFluxRates,
    dt: number,
    tolerance: number = this.defaultTolerance
  ): void {
    const result = this.validateConservation(previous, current, fluxes, dt, tolerance);
    
    if (!result.valid) {
      const details: string[] = [];
      result.discrepancies.forEach((disc, species) => {
        details.push(
          `  - Species '${species}': Expected Δ = ${disc.expectedDelta.toExponential(4)}, Actual Δ = ${disc.actualDelta.toExponential(4)}, Error = ${disc.error.toExponential(4)}`
        );
      });

      throw new Error(
        `Thermodynamic Conservation Violation Detected at t = ${current.timestamp}s:\n` +
        details.join('\n')
      );
    }
  }

  /**
     * Registers a callback hook invoked when a conservation violation is detected.
     */
  public registerConservationHook(callback: (result: ValidationResult) => void): void {
    this.conservationHooks.push(callback);
  }

  private notifyHooks(result: ValidationResult): void {
    for (const hook of this.conservationHooks) {
      try {
        hook(result);
      } catch (e) {
        console.error('Error in conservation hook execution:', e);
      }
    }
  }
}
```

---

## 3. Stock Transfer Equations & Verification Matrix

| Process Monad | Consumed Stocks ($S_{\text{in}}$) | Produced Stocks ($S_{\text{out}}$) | Boundary Flux Equivalence ($\Phi$) |
| :--- | :--- | :--- | :--- |
| **Photosynthesis** | $CO_2$, $H_2O$, Solar Energy | Biomass ($C_6H_{12}O_6$), $O_2$ | $\Delta M_{C, \text{system}} = 0$ (Internal conversion) |
| **Respiration** | Biomass, $O_2$ | $CO_2$, $H_2O$, Heat Energy | $\Phi_{\text{out}, CO_2} = +R_{\text{respiration}}$ |
| **Solar Input** | Extraterrestrial Radiation | Thermal/Chemical Energy | $\Phi_{\text{in}, \text{energy}} = I_{\text{solar}}$ |
| **Heat Dissipation** | Internal Heat | Outgoing Longwave Radiation | $\Phi_{\text{out}, \text{energy}} = \sigma T^4$ |