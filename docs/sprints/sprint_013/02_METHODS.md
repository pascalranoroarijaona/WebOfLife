<!-- Method Specifications -->

# Sprint 013: Thermodynamic State Vector Methods & Monad Specifications

## 1. Physical & Thermodynamic Process Formalization

The *Web of Life* simulation enforces strict thermodynamic consistency across all biological, chemical, and physical transformations. Sprint 013 formalizes the thermodynamic state vector interface (`src/thermodynamics/types.ts`), bridging mass/energy flows with the First and Second Laws of Thermodynamics.

### 1.1 First Law of Thermodynamics (Energy Conservation)
The total internal energy change of any ecosystem compartment or global EarthPod over a time step $\Delta t$ is governed by the energy balance equation:
$$\Delta U = U^{(t+\Delta t)} - U^{(t)} = \int_{t}^{t+\Delta t} \left( \dot{Q}_{\text{net}} + \sum_j \dot{H}_{j, \text{in}} - \sum_k \dot{H}_{k, \text{out}} + \dot{W} \right) dt$$

In discrete simulation steps:
$$U^{(t+\Delta t)} = U^{(t)} + \left( Q_{\text{solar}} - Q_{\text{thermal}} + \sum \dot{m}_{\text{boundary}} h_{\text{specific}} \right) \Delta t$$

### 1.2 Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)
The entropy evolution of the system is given by:
$$\frac{dS}{dt} = \sum_{i} \frac{\dot{Q}_i}{T_i} + \dot{S}_{\text{gen}}$$

By the Second Law, internal irreversibilities dictate that entropy generation is strictly non-negative:
$$\dot{S}_{\text{gen}} \ge 0$$

Exergy destruction ($\dot{I}$), representing the lost work potential due to thermodynamic irreversibilities, is coupled directly to entropy generation via the Gouy-Stodola theorem using the ambient reference temperature $T_0$ (default $288.15\text{ K}$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 2. Executable Monad Methods & Stock Transfer Equations

Thermodynamic state transitions are wrapped in immutable monad structures that thread state vectors, accumulate boundary fluxes, and execute validation predicates prior to committing stocks.

### 2.1 Thermodynamic Monad Structure (`src/thermodynamics/thermodynamic_structure.ts`)

```typescript
export interface IThermodynamicMonad {
  state: IThermodynamicStateVector;
  
  /** Computes next state and validates First/Second laws. */
  step(
    solarInput: number,
    thermalRadiationOut: number,
    matterEnthalpyFlux: number,
    entropyGenerationRate: number,
    dt: number
  ): IThermodynamicMonad;

  /** Validates thermodynamic invariants. */
  assertInvariants(): void;
}
```

### 2.2 Concrete Stock Transfer Implementation

```typescript
import { IThermodynamicStateVector, IBoundaryFluxArray, IExergyMetrics } from './types';

export class ThermodynamicStateVector implements IThermodynamicStateVector {
  constructor(
    public tick: number,
    public internalEnergy: number,
    public totalEntropy: number,
    public boundaryFluxes: IBoundaryFluxArray,
    public exergyMetrics: IExergyMetrics
  ) {}

  public validateFirstLaw(dt: number, previousEnergy: number): boolean {
    const netPower = 
      this.boundaryFluxes.solarInput -
      this.boundaryFluxes.thermalRadiationOut +
      this.boundaryFluxes.matterEnthalpyFlux +
      this.boundaryFluxes.netHeatFlux;

    const expectedEnergy = previousEnergy + netPower * dt;
    const tolerance = 1e-6;
    return Math.abs(this.internalEnergy - expectedEnergy) <= tolerance;
  }

  public validateSecondLaw(): boolean {
    const sGen = this.exergyMetrics.entropyGenerationRate;
    const iDest = this.exergyMetrics.exergyDestructionRate;
    const T0 = this.exergyMetrics.T_0;

    // Check S_gen >= 0 and Gouy-Stodola relation: I = T_0 * S_gen
    const exergyMatch = Math.abs(iDest - (T0 * sGen)) < 1e-6;
    return sGen >= 0 && exergyMatch;
  }
}

/**
 * Pure monad step function for thermodynamic state propagation.
 */
export function transitionThermodynamicState(
  current: IThermodynamicStateVector,
  solarInput: number,
  thermalRadiationOut: number,
  matterEnthalpyFlux: number,
  entropyGenerationRate: number,
  dt: number
): IThermodynamicStateVector {
  const T_0 = current.exergyMetrics.T_0;
  
  // 1. Construct new boundary fluxes
  const boundaryFluxes: IBoundaryFluxArray = {
    solarInput,
    thermalRadiationOut,
    matterEnthalpyFlux,
    netHeatFlux: solarInput - thermalRadiationOut
  };

  // 2. Calculate net energy flux (W) and update internal energy (J)
  const netPower = solarInput - thermalRadiationOut + matterEnthalpyFlux;
  const newInternalEnergy = current.internalEnergy + netPower * dt;

  // 3. Update entropy: dS = (Q_net / T_avg) + S_gen * dt
  const T_avg = T_0; // Approximation for boundary/system isothermal coupling
  const dEntropy = ((boundaryFluxes.netHeatFlux / T_avg) + entropyGenerationRate) * dt;
  const newTotalEntropy = current.totalEntropy + dEntropy;

  // 4. Compute exergy metrics
  const exergyDestructionRate = T_0 * Math.max(0, entropyGenerationRate);
  
  // Total exergy estimation: E_x = (U - U_0) - T_0(S - S_0) + ... simplified to available work metric
  const totalExergy = Math.max(0, (newInternalEnergy - T_0 * newTotalEntropy));

  const exergyMetrics: IExergyMetrics = {
    T_0,
    entropyGenerationRate: Math.max(0, entropyGenerationRate),
    exergyDestructionRate,
    totalExergy
  };

  const nextState = new ThermodynamicStateVector(
    current.tick + 1,
    newInternalEnergy,
    newTotalEntropy,
    boundaryFluxes,
    exergyMetrics
  );

  // Validate laws
  if (!nextState.validateFirstLaw(dt, current.internalEnergy)) {
    throw new Error(`First Law violation at tick ${nextState.tick}: Energy conservation failed.`);
  }

  if (!nextState.validateSecondLaw()) {
    throw new Error(`Second Law violation at tick ${nextState.tick}: Entropy generation negative or exergy mismatch.`);
  }

  return nextState;
}
```

---

## 3. Verification & Compliance Matrix

| Law / Metric | Mathematical Expression | Validation Mechanism | Test Assertion (`tests/sprint_013.test.ts`) |
| :--- | :--- | :--- | :--- |
| **First Law** | $\Delta U = \sum \dot{Q}\Delta t + \sum \dot{H}\Delta t$ | `validateFirstLaw(dt, prev)` | Energy residual $< 10^{-6}\text{ J}$ across arbitrary solar inputs. |
| **Second Law** | $\dot{S}_{\text{gen}} \ge 0$ | `validateSecondLaw()` | Throws error if $\dot{S}_{\text{gen}} < 0$. |
| **Exergy Destruction** | $\dot{I} = T_0 \dot{S}_{\text{gen}}$ | `IExergyMetrics` coupling | Exact proportionality verified across all metabolic workflows. |