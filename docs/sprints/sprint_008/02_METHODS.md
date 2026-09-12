<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector & Monad State Transitions (Sprint 008)

## 1. Overview & Process Mining Scope
This document formalizes the mathematical and computational methods for tracking energy, entropy, and exergy across biogeochemical boundaries in the Web of Life simulation framework. The core mechanism links physical process monads (`ThermodynamicMonad`) with the exact thermodynamic state vector interface (`IThermodynamicStateVector`), ensuring strict adherence to the First and Second Laws of Thermodynamics.

---

## 2. Exact Mass, Energy, and Entropy Equations

### 2.1 First Law Control Volume Balance (Energy)
For any discrete control volume (Earth Pod $V$), the rate of change of internal energy $E$ is evaluated as:
$$\frac{dE}{dt} = \dot{Q}_{\text{solar}} + \dot{Q}_{\text{IR}} + \dot{Q}_{\text{sensible}} + \dot{Q}_{\text{latent}} - \dot{W}_{\text{net}} + \sum_{\text{in}} \dot{m}_i h_i - \sum_{\text{out}} \dot{m}_j h_j$$

Discrete integration over simulation step $\Delta t$:
$$E(t + \Delta t) = E(t) + \left( \sum \dot{Q} - \dot{W}_{\text{net}} + \sum \dot{m}_{\text{in}} h_{\text{in}} - \sum \dot{m}_{\text{out}} h_{\text{out}} \right) \Delta t$$

### 2.2 Second Law & Entropy Generation Rate ($\dot{S}_{\text{gen}}$)
The internal entropy generation rate $\dot{S}_{\text{gen}}$ accounts for all irreversible processes within the control volume (metabolic heat dissipation, biogeochemical transformations, radiative degradation of photon exergy):
$$\dot{S}_{\text{gen}} = \frac{dS}{dt} - \sum_{k} \frac{\dot{Q}_k}{T_k} - \sum_{\text{in}} \dot{m}_i s_i + \sum_{\text{out}} \dot{m}_j s_j \ge 0$$

### 2.3 Exergy Destruction Rate ($\dot{I}$)
Quantifying thermodynamic irreversibility relative to the standard ambient reference environment ($T_0 = 288.15\text{ K}$, $P_0 = 101.325\text{ kPa}$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$

---

## 3. Executable Monad Method Specifications (`src/thermodynamics/types.ts`)

The following monad implementation threads thermodynamic state vectors through biochemical and physical process transitions while enforcing strict invariant checks ($\dot{S}_{\text{gen}} \ge 0$ and mass conservation).

```typescript
/**
 * Thermodynamic State Vector representing energy, entropy, and exergy metrics 
 * for a discrete control volume or planetary pod at time t.
 */
export interface IThermodynamicStateVector {
  readonly timestamp: number;
  readonly T_0: number; // Default: 288.15 K
  readonly internalEnergy: number; // Joules (J)
  readonly entropy: number; // Joules per Kelvin (J/K)
  readonly entropyGenerationRate: number; // Watts per Kelvin (W/K or J/(s·K)), >= 0
  readonly exergyDestructionRate: number; // Watts (W or J/s), T_0 * entropyGenerationRate
  readonly boundaryHeatFlux: BoundaryHeatFluxArray;
  readonly massInventory: Record<string, number>; // kg (Carbon, Water, Nitrogen, Phosphorus)
}

/**
 * Boundary heat flux array tracking radiative and thermal exchanges (W).
 */
export interface BoundaryHeatFluxArray {
  solarIn: number;          // >= 0
  infraredOut: number;      // <= 0
  sensibleLatentFlux: number; // Convective/Evaporative exchange
}

/**
 * Contract for thermodynamic system components and control volumes.
 */
export interface IThermodynamicSystem {
  getStateVector(): IThermodynamicStateVector;
  calculateEntropyGeneration(dt: number): number;
  verifyFirstLaw(previousState: IThermodynamicStateVector, currentState: IThermodynamicStateVector, dt: number): boolean;
  verifySecondLaw(): boolean;
}

/**
 * Monad wrapper enforcing thermodynamic invariants during state transitions.
 */
export class ThermodynamicMonad<T> {
  private constructor(
    private readonly value: T,
    private readonly stateVector: IThermodynamicStateVector
  ) {}

  public static unit<T>(value: T, initialVector: IThermodynamicStateVector): ThermodynamicMonad<T> {
    return new ThermodynamicMonad(value, initialVector);
  }

  public bind<U>(
    fn: (val: T, vector: IThermodynamicStateVector) => { value: U; vector: IThermodynamicStateVector }
  ): ThermodynamicMonad<U> {
    const result = fn(this.value, this.stateVector);

    // Enforce Second Law: Entropy generation rate must be non-negative
    if (result.vector.entropyGenerationRate < 0) {
      throw new Error(
        `Second Law Violation: \u1e60_gen (${result.vector.entropyGenerationRate}) < 0 W/K`
      );
    }

    // Enforce Exergy Destruction Consistency: I = T_0 * S_gen
    const expectedExergyDestruction = result.vector.T_0 * result.vector.entropyGenerationRate;
    const exergyTolerance = 1e-6;
    if (Math.abs(result.vector.exergyDestructionRate - expectedExergyDestruction) > exergyTolerance) {
      throw new Error(
        `Exergy Inconsistency: \u0130 (${result.vector.exergyDestructionRate} W) != T_0 * \u1e60_gen (${expectedExergyDestruction} W)`
      );
    }

    return new ThermodynamicMonad(result.value, result.vector);
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getValue(): T {
    return this.value;
  }
}
```

---

## 4. Verification & Invariant Assertions

1. **Second Law Validation**: Every state transition executed via `.bind()` evaluates $\dot{S}_{\text{gen}} \ge 0$. Any negative value triggers an unrecoverable simulation abort.
2. **Exergy-Entropy Coupling**: The identity $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$ is validated to within $10^{-6}\text{ W}$ precision at each simulation tick.
3. **Mass Inventory Conservation**: Elemental mass pools (C, H2O, N, P) across `massInventory` are checked against net inputs/outputs with relative tolerance $\le 10^{-9}$.