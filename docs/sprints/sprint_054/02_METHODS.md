```md
<!-- Method Specifications: Thermodynamic State Vector Stock Conservation Asserter -->

# Method Specifications: Thermodynamic State Vector Stock Conservation (`src/thermodynamics/state_validator.ts`)

## 1. Mathematical Formulation of Mass and Energy Conservation

The Web of Life planetary simulation tracks state vectors composed of continuous biogeochemical stocks and energetic potentials. To enforce absolute adherence to the First and Second Laws of Thermodynamics, the `StateValidator` evaluates stock transitions against boundary flux integrals over discrete time steps $\Delta t = t_1 - t_0$.

### 1.1 First Law Conservation Equation
For any conserved elemental stock or energy pool $i$ (where $i \in \{\text{Carbon}, \text{Nitrogen}, \text{Phosphorus}, \text{Water}, \text{Energy}\}$), the true physical invariant requires that the change in stock mass/energy within the system boundaries exactly equals the net flux across those boundaries:

$$\Delta S_i = S_i(t_1) - S_i(t_0) = \int_{t_0}^{t_1} \left( \sum \Phi_{i, \text{in}}(t) - \sum \Phi_{i, \text{out}}(t) \right) dt$$

For discrete numerical implementation with constant or piecewise linear fluxes over interval $\Delta t$:

$$\Delta S_{i, \text{actual}} = S_i(t_1) - S_i(t_0)$$
$$\Delta S_{i, \text{expected}} = \left( \sum \Phi_{i, \text{in}} - \sum \Phi_{i, \text{out}} \right) \cdot \Delta t$$

The validation residual $\varepsilon_i$ is tested against a predefined numerical tolerance $\tau_i$:

$$\left| \Delta S_{i, \text{actual}} - \Delta S_{i, \text{expected}} \right| \le \tau_i$$

### 1.2 Second Law & Boundary Invariants
1. **No Spontaneous Generation**: 
   $$\text{If } \sum \Phi_{i, \text{in}} = 0 \text{ and } \sum \Phi_{i, \text{out}} = 0, \text{ then } |\Delta S_{i, \text{actual}}| \le \tau_i$$
2. **Solar-Only External Energy Forcing**: 
   External energy influx $\Phi_{E, \text{in}}$ must originate exclusively from designated solar irradiance boundary vectors ($Q_{\text{solar}}$). Any unassigned internal energy generation violates entropy bounds and triggers a `ThermodynamicViolationException`.

---

## 2. Executable Monad Method Specifications

Below is the concrete method specification implemented within `src/thermodynamics/state_validator.ts` as an executable monad validation routine.

```typescript
import { StateVector } from './state_vector';
import { ThermodynamicFlux, ValidationResult, ThermodynamicViolationException } from './types';

export interface ConservationRule {
  stockKey: string;
  tolerance: number;
}

export class StateValidator {
  private rules: Map<string, number> = new Map();

  constructor(defaultTolerance: number = 1e-5) {
    // Initialize standard conservation tolerances for core biogeochemical stocks
    this.rules.set('carbon', defaultTolerance);
    this.rules.set('nitrogen', defaultTolerance);
    this.rules.set('phosphorus', defaultTolerance);
    this.rules.set('water', defaultTolerance);
    this.rules.set('energy', defaultTolerance);
  }

  public registerRule(stockKey: string, tolerance: number): void {
    this.rules.set(stockKey, tolerance);
  }

  public validateStockConservation(
    previousState: StateVector,
    currentState: StateVector,
    boundaryFluxes: ThermodynamicFlux[],
    deltaTime: number
  ): ValidationResult {
    const discrepancies: Record<string, number> = {};
    let isValid = true;

    // 1. Extract stock keys present in both states
    const stockKeys = new Set([
      ...Object.keys(previousState.stocks),
      ...Object.keys(currentState.stocks)
    ]);

    for (const key of stockKeys) {
      const s0 = previousState.stocks[key] ?? 0;
      const s1 = currentState.stocks[key] ?? 0;
      const actualDelta = s1 - s0;

      // 2. Accumulate boundary fluxes for this specific stock over deltaTime
      const netFlux = boundaryFluxes
        .filter(flux => flux.stockKey === key)
        .reduce((acc, flux) => acc + (flux.rateIn - flux.rateOut), 0);

      const expectedDelta = netFlux * deltaTime;
      const discrepancy = Math.abs(actualDelta - expectedDelta);
      discrepancies[key] = discrepancy;

      const tolerance = this.rules.get(key) ?? 1e-5;

      // 3. Assert First Law: |ΔStock - NetFlux * dt| <= tolerance
      if (discrepancy > tolerance) {
        isValid = false;
        if (key === 'energy') {
          // Enforce Second Law / Solar-only constraint violation check
          const hasUnassignedEnergyInput = boundaryFluxes
            .filter(flux => flux.stockKey === 'energy' && flux.rateIn > 0)
            .some(flux => flux.sourceType !== 'solar');

          if (hasUnassignedEnergyInput || actualDelta > expectedDelta) {
            throw new ThermodynamicViolationException(
              `Second Law Violation: Unbounded energy generation detected in stock '${key}'. ` +
              `Actual delta (${actualDelta}) exceeds expected net flux (${expectedDelta}) without valid solar forcing.`
            );
          }
        }

        throw new ThermodynamicViolationException(
          `First Law Conservation Failure for stock '${key}': ` +
          `ΔStock (${actualDelta}) deviates from net boundary flux (${expectedDelta}) by ${discrepancy} (tolerance: ${tolerance}).`
        );
      }
    }

    return {
      isValid,
      discrepancies,
      timestamp: currentState.timestamp
    };
  }
}
```

---

## 3. Concrete Stock Transfer Equations by Biogeochemical Domain

### 3.1 Carbon Cycle ($C$)
- **Stocks**: Atmospheric $CO_2$, Terrestrial Biomass, Soil Organic Carbon, Dissolved Inorganic Carbon (DIC).
- **Boundary Fluxes**: Volcanic outgassing ($\Phi_{C, \text{volcano}}$), Anthropogenic/Biogenic emission, Solar-driven photo-fixation (Net Primary Production, $\Phi_{C, \text{NPP}}$).
- **Conservation Equation**:
  $$\Delta C_{\text{total}} = \left( \Phi_{C, \text{volcano}} - \Phi_{C, \text{burial}} \right) \cdot \Delta t$$

### 3.2 Water Cycle ($H_2O$)
- **Stocks**: Atmospheric Vapor, Surface Water (Ocean/Lakes), Groundwater, Cryosphere.
- **Boundary Fluxes**: Extraterrestrial accretion/loss (negligible, $\approx 0$), Solar radiative evaporation ($\Phi_{W, \text{evap}}$), Precipitation ($\Phi_{W, \text{precip}}$).
- **Conservation Equation**:
  $$\Delta H_2O_{\text{total}} = \left( \sum \Phi_{W, \text{in}} - \sum \Phi_{W, \text{out}} \right) \cdot \Delta t = 0 \quad (\text{within closed planetary boundary})$$

### 3.3 Energy Conservation & Thermodynamic Monad ($E$)
- **Stocks**: Internal Thermal Energy, Chemical Bond Energy, Kinetic Energy.
- **Boundary Fluxes**: Incoming Solar Radiation ($Q_{\text{solar}}$), Outgoing Longwave Radiation ($L_{\text{out}}$).
- **Conservation Equation**:
  $$\Delta E_{\text{system}} = \left( Q_{\text{solar}} - L_{\text{out}} + \sum W_{\text{boundary}} \right) \cdot \Delta t$$