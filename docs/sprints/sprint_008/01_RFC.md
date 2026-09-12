# Request for Comments (RFC): Sprint 008 - Thermodynamic State Vector Interface

## 1. Executive Summary & Sprint Goal
Sprint 008 establishes the rigorous mathematical and software engineering foundation for thermodynamic state vectors within the Web of Life simulation framework (`src/thermodynamics/types.ts`). This RFC defines the precise contracts for internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays, maintaining absolute compliance with the First and Second Laws of Thermodynamics (matter conservation and solar-driven open thermodynamic non-equilibrium systems).

---

## 2. Theoretical Framework & Thermodynamic Laws

### 2.1 First Law of Thermodynamics (Energy Conservation)
The total energy change within any control volume $V$ bounded by surface $\partial V$ is governed by:
$$\frac{dE}{dt} = \sum \dot{Q}_{\text{in}} - \sum \dot{W}_{\text{out}} + \sum_{\text{in}} \dot{m}(h + \frac{1}{2}v^2 + gz) - \sum_{\text{out}} \dot{m}(h + \frac{1}{2}v^2 + gz)$$
In our closed-mass, open-energy Earth Pod model, total elemental mass is strictly conserved across biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water), while energy enters exclusively via solar radiation flux ($\dot{Q}_{\text{solar}}$) and exits via longwave infrared radiative cooling to deep space ($\dot{Q}_{\text{IR}}$).

### 2.2 Second Law of Thermodynamics & Entropy Generation
The entropy balance for the system is given by the Gouy-Stodola theorem extension:
$$\frac{dS}{dt} = \sum_{k} \frac{\dot{Q}_k}{T_k} + \dot{S}_{\text{gen}}$$
Where $\dot{S}_{\text{gen}} \ge 0$ strictly according to the Second Law. 

### 2.3 Exergy Destruction Rate
Exergy ($\Xi$) represents the maximum useful work obtainable as the system brings itself into thermodynamic equilibrium with a reference environment at temperature $T_0$ and pressure $P_0$. The rate of exergy destruction ($\dot{I}$), quantifying thermodynamic irreversibility, is proportional to internal entropy generation:
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
where $T_0 = 288.15\text{ K}$ represents the standard global mean surface reference temperature.

---

## 3. Interface Contracts & Class Hierarchy (`src/thermodynamics/types.ts`)

### 3.1 Core Type Definitions

```typescript
/**
 * Thermodynamic State Vector representing energy, entropy, and exergy metrics 
 * for a discrete control volume or planetary pod at time t.
 */
export interface IThermodynamicStateVector {
  /** Timestamp or simulation tick index */
  readonly timestamp: number;
  /** Ambient reference temperature (K), default 288.15 K */
  readonly T_0: number;
  /** Total internal energy (J) */
  readonly internalEnergy: number;
  /** Total system entropy (J/K) */
  readonly entropy: number;
  /** Internal entropy generation rate (W/K or J/(s·K)), must be >= 0 */
  readonly entropyGenerationRate: number;
  /** Exergy destruction rate (W or J/s), defined as T_0 * entropyGenerationRate */
  readonly exergyDestructionRate: number;
  /** Net boundary heat flux vector (W) */
  readonly boundaryHeatFlux: BoundaryHeatFluxArray;
  /** Material mass inventory vector across biogeochemical cycles (kg) */
  readonly massInventory: Record<string, number>;
}

/**
 * Boundary heat flux array tracking incoming solar, outgoing thermal IR, 
 * and conductive/convective exchanges with boundaries (W).
 */
export interface BoundaryHeatFluxArray {
  /** Incoming solar radiative flux (W) [>= 0] */
  solarIn: number;
  /** Outgoing longwave infrared radiative flux (W) [<= 0] */
  infraredOut: number;
  /** Sensible and latent heat exchange fluxes (W) */
  sensibleLatentFlux: number;
}

/**
 * Contract for any thermodynamic processor, pod, or biogeochemical cycle component.
 */
export interface IThermodynamicSystem {
  getStateVector(): IThermodynamicStateVector;
  calculateEntropyGeneration(dt: number): number;
  verifyFirstLaw(previousState: IThermodynamicStateVector, currentState: IThermodynamicStateVector, dt: number): boolean;
  verifySecondLaw(): boolean;
}
```

---

## 4. Monad Stock Transitions & Incremental Integration

To maintain seamless integration with existing biogeochemical cycles (`src/cycles/`), state transitions are modeled as monad-like state wrappers (`ThermodynamicMonad<T>`) that thread mass and energy while enforcing thermodynamic invariants at every step:

```typescript
export class ThermodynamicMonad<T> {
  private constructor(
    private readonly value: T,
    private readonly stateVector: IThermodynamicStateVector
  ) {}

  public static unit<T>(value: T, initialVector: IThermodynamicStateVector): ThermodynamicMonad<T> {
    return new ThermodynamicMonad(value, initialVector);
  }

  public bind<U>(fn: (val: T, vector: IThermodynamicStateVector) => { value: U; vector: IThermodynamicStateVector }): ThermodynamicMonad<U> {
    const result = fn(this.value, this.stateVector);
    
    // Enforce Second Law: Entropy generation rate must be non-negative
    if (result.vector.entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation: \u1e60_gen (${result.vector.entropyGenerationRate}) < 0`);
    }

    return new ThermodynamicMonad(result.value, result.vector);
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }
}
```

---

## 5. Verification & Testing Strategy
1. **Unit Tests (`tests/sprint_008.test.ts`)**: Validate $\dot{S}_{\text{gen}} \ge 0$ across diverse metabolic and radiative scenarios.
2. **Invariance Checks**: Assert mass conservation across carbon, nitrogen, phosphorus, and water cycles within $10^{-9}$ relative tolerance.
3. **Exergy Consistency**: Verify $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$ under transient solar loading.