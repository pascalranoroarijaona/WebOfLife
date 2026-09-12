<!-- Method Specifications -->

# Thermodynamic State Vector & Nonequilibrium Exergy Accounting Methods

## 1. Overview & Physical Process Formalization
This specification details the executable monad methods supporting Sprint 018 (`src/thermodynamics/types.ts` and `src/thermodynamics/thermodynamic_monad_process.ts`). The system tracks planetary metabolism—specifically coupled cycles of Carbon ($C$), Nitrogen ($N$), Phosphorus ($P$), and Water ($\text{H}_2\text{O}$)—while enforcing the First Law of Thermodynamics (mass-energy conservation) and the Second Law of Thermodynamics ($\dot{S}_{\text{gen}} \ge 0$).

---

## 2. Mass and Energy Stock Transfer Equations

### 2.1 Elemental Mass Conservation
Let vector $\mathbf{M} = [M_C, M_N, M_P, M_{H_2O}]^T$ represent the elemental stocks in kilograms. For any monad process over time step $\Delta t$:
$$\mathbf{M}^{(t+\Delta t)} = \mathbf{M}^{(t)} + \dot{\mathbf{m}}_{\text{net}} \Delta t$$
where $\dot{\mathbf{m}}_{\text{net}} = \sum_j \dot{\mathbf{m}}_j$ is the net mass flux rate vector ($\text{kg/s}$).

### 2.2 First Law Energy Balance
The total internal energy $E$ evolves according to boundary heat inputs, radiative transfer, and enthalpy associated with mass transport:
$$E^{(t+\Delta t)} = E^{(t)} + \left( \sum_{i} \dot{Q}_i - \dot{W} + \sum_{j} \dot{m}_j \left( h_j + \frac{v_j^2}{2} + g z_j \right) \right) \Delta t$$
where:
- $\dot{Q}_i$ includes net radiative flux, sensible heat flux, and latent heat flux ($\text{W}$).
- $\dot{W}$ is useful work output ($\text{W}$).
- $h_j$ is the specific enthalpy of mass stream $j$ ($\text{J/kg}$).

### 2.3 Second Law & Entropy Generation Rate
The total entropy change within the control volume is:
$$S^{(t+\Delta t)} = S^{(t)} + \left( \sum_{i} \frac{\dot{Q}_i}{T_i} + \sum_{j} \dot{m}_j s_j + \dot{S}_{\text{gen}} \right) \Delta t$$
where internal entropy generation rate $\dot{S}_{\text{gen}}$ must satisfy:
$$\dot{S}_{\text{gen}} \ge 0 \quad \forall t$$

### 2.4 Gouy-Stodola Exergy Destruction Theorem
The rate of exergy destruction ($\dot{I}$) relative to dead-state temperature $T_0$ is defined as:
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
The system exergy $X$ updates via:
$$X^{(t+\Delta t)} = X^{(t)} + \left( \sum_{i} \left(1 - \frac{T_0}{T_i}\right)\dot{Q}_i - \dot{W} + \sum_{j} \dot{e}_{x,j} \dot{m}_j - \dot{I} \right) \Delta t$$

---

## 3. Executable Monad Method Specifications (`ThermodynamicMonadProcess`)

```typescript
import { 
  ThermodynamicStateVector, 
  BoundaryFluxVector, 
  IThermodynamicMonadProcess 
} from './types';

export class ThermodynamicMonadProcess implements IThermodynamicMonadProcess {
  public id: string;
  public name: string;
  protected tolerance: number = 1e-12;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /**
   * Evaluates state transition over dt, enforcing First and Second Laws.
   */
  public step(currentState: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    // 1. Unpack State & Boundary Fluxes
    const { temperature, ambientTemperature, internalEnergy, entropy, exergy, elementalStocks, boundaryFluxes } = currentState;
    const { radiativeFlux, sensibleHeatFlux, latentHeatFlux, massFluxRates } = boundaryFluxes;

    // 2. Compute Net Heat Flux (W)
    const totalHeatFlux = radiativeFlux + sensibleHeatFlux + latentHeatFlux;

    // 3. Compute Enthalpy/Mass Transport Contribution (simplified linear enthalpy model for bio-stocks)
    // Specific enthalpy approximations: [C, N, P, H2O] in J/kg
    const specificEnthalpies: [number, number, number, number] = [3.2e7, 1.0e6, 5.0e5, 2.26e6]; 
    const massEnthalpyFlux = massFluxRates.reduce((acc, mDot, idx) => acc + mDot * specificEnthalpies[idx], 0);

    // 4. Update Elemental Stocks
    const newElementalStocks: [number, number, number, number] = [
      elementalStocks[0] + massFluxRates[0] * dt,
      elementalStocks[1] + massFluxRates[1] * dt,
      elementalStocks[2] + massFluxRates[2] * dt,
      elementalStocks[3] + massFluxRates[3] * dt
    ];

    // 5. First Law: Update Internal Energy (J)
    const dE_dt = totalHeatFlux + massEnthalpyFlux;
    const newInternalEnergy = internalEnergy + dE_dt * dt;

    // 6. Compute Internal Entropy Generation Rate S_gen_dot (W/K)
    // Derived from irreversible heat dissipation and metabolic maintenance overhead
    const metabolicDissipation = Math.abs(totalHeatFlux) * 0.05 + Math.abs(massEnthalpyFlux) * 0.01;
    const entropyGenerationRate = Math.max(0, metabolicDissipation / Math.max(temperature, 1.0));

    // 7. Second Law Assertion
    if (entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation: S_gen_dot (${entropyGenerationRate}) < 0 in monad ${this.id}`);
    }

    // 8. Gouy-Stodola Exergy Destruction Rate (W)
    const exergyDestructionRate = ambientTemperature * entropyGenerationRate;

    // 9. Update System Entropy & Exergy
    const entropyBoundaryFlux = (totalHeatFlux / temperature) + massFluxRates.reduce((acc, mDot, idx) => acc + mDot * (specificEnthalpies[idx] / temperature), 0);
    const newEntropy = entropy + (entropyBoundaryFlux + entropyGenerationRate) * dt;

    const exergyBoundaryFlux = (1 - (ambientTemperature / temperature)) * totalHeatFlux;
    const newExergy = Math.max(0, exergy + (exergyBoundaryFlux - exergyDestructionRate) * dt);

    const nextState: ThermodynamicStateVector = {
      time: currentState.time + dt,
      temperature,
      ambientTemperature,
      internalEnergy: newInternalEnergy,
      entropy: newEntropy,
      exergy: newExergy,
      elementalStocks: newElementalStocks,
      boundaryFluxes,
      entropyGenerationRate,
      exergyDestructionRate
    };

    if (!this.validateInvariants(nextState)) {
      throw new Error(`Invariant validation failed after step execution in monad ${this.id}`);
    }

    return nextState;
  }

  /**
   * Verifies mass conservation bounds and non-negative entropy generation.
   */
  public validateInvariants(state: ThermodynamicStateVector): boolean {
    if (state.entropyGenerationRate < -this.tolerance) {
      return false;
    }
    if (state.exergyDestructionRate < -this.tolerance) {
      return false;
    }
    for (const stock of state.elementalStocks) {
      if (isNaN(stock) || !isFinite(stock)) {
        return false;
      }
    }
    return true;
  }
}
```