<!-- Method Specifications -->

# Sprint 019 Method Specifications: Thermodynamic State Vector & Exergy Tracking

## 1. Physical & Thermodynamic Foundations
The Web of Life simulation engine models biogeochemical processes under strict thermodynamic constraints. Sprint 019 implements the mathematical and computational bridge between elemental mass conservation (First Law) and irreversibility accounting via entropy generation and exergy destruction (Second Law).

### 1.1 First Law Formulation (Energy Conservation)
The change in internal energy within any thermodynamic monad process or planetary control volume $V$ is governed by:
$$\Delta E_{\text{system}} = \int_0^{\Delta t} \left( \sum_k \dot{Q}_k - \dot{W}_{\text{useful}} + \sum_i \dot{h}_i \dot{m}_i \right) dt$$

In our solar-forced Earth Pod model:
- $\dot{Q}_k$ comprises net solar radiation, outgoing longwave thermal radiation, sensible heat flux, and latent heat flux.
- $\dot{W}_{\text{useful}} = 0$ internally (all work is converted to heat or stored as chemical/geopotential exergy).
- $\sum \Delta \text{Stock}_{\text{element}} = 0$ across closed transformations, subject only to explicitly declared boundary mass fluxes.

### 1.2 Second Law Formulation (Entropy & Exergy)
By the Gouy-Stodola theorem, the rate of exergy destruction ($\dot{I}$) is directly proportional to the internal entropy generation rate ($\dot{S}_{\text{gen}}$) and the ambient dead-state reference temperature ($T_0 = 288.15\text{ K}$):
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$

where the Clausius-Duhem inequality mandates:
$$\dot{S}_{\text{gen}} \ge 0 \quad \implies \quad \dot{I} \ge 0$$

---

## 2. Executable Monad Method Specifications (`src/thermodynamics/types.ts`)

### 2.1 Boundary Flux Vector (`BoundaryFluxVector`)
Represents instantaneous boundary transfer rates across the system control surface.

```typescript
export interface BoundaryFluxVector {
  solarRadiationFlux: number;       // W/m^2 (>= 0)
  thermalRadiationFlux: number;     // W/m^2 (<= 0 during net emission)
  sensibleHeatFlux: number;         // W/m^2
  latentHeatFlux: number;           // W/m^2
  massFluxes: Map<string, number>;  // kg/s or mol/s per elemental/molecular species
}
```

### 2.2 Thermodynamic State Vector (`ThermodynamicStateVector`)
Captures the complete energetic, entropic, and exergetic state of a control volume.

```typescript
export interface ThermodynamicStateVector {
  internalEnergy: number;           // J
  entropy: number;                  // J/K
  temperature: number;              // K
  ambientTemperature: number;       // K (Default T_0 = 288.15)
  entropyGenerationRate: number;    // W/K (J/(s·K)), must be >= 0
  exergyDestructionRate: number;    // W (J/s), I_dot = T_0 * S_dot_gen
  exergy: number;                   // J (Available work potential)
  boundaryFluxes: BoundaryFluxVector;
}
```

### 2.3 Process Monad Contract (`IThermodynamicProcessMonad`)
Defines the standard execution pipeline for physical, biological, and chemical process monads.

```typescript
export interface ThermodynamicDerivativeResult {
  dInternalEnergy: number;          // J (rate * dt or total delta over dt)
  dEntropy: number;                 // J/K
  entropyGenerationRate: number;    // W/K
  exergyDestructionRate: number;    // W
  massStockDeltas: Map<string, number>; // kg or mol delta per species
}

export interface IThermodynamicProcessMonad {
  readonly processId: string;
  evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;
  transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector;
}
```

---

## 3. Concrete Base Class & Enforcement Logic (`BaseThermodynamicProcessMonad`)

The abstract base class enforces physical laws during every state transition. Any subclass attempting to return a negative entropy generation rate triggers an immediate runtime exception.

```typescript
import { IThermodynamicProcessMonad, ThermodynamicStateVector, ThermodynamicDerivativeResult } from './types';

export abstract class BaseThermodynamicProcessMonad implements IThermodynamicProcessMonad {
  abstract readonly processId: string;

  abstract evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);

    // Second Law Validation Check
    if (deriv.entropyGenerationRate < 0) {
      throw new Error(
        `Second Law Violation in monad '${this.processId}': ` +
        `\u1e60_gen = ${deriv.entropyGenerationRate} W/K < 0. Irreversibility constraint violated.`
      );
    }

    const T_0 = state.ambientTemperature;
    const computedExergyDestruction = T_0 * deriv.entropyGenerationRate;

    return {
      internalEnergy: state.internalEnergy + deriv.dInternalEnergy,
      entropy: state.entropy + deriv.dEntropy,
      temperature: state.temperature,
      ambientTemperature: T_0,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: computedExergyDestruction,
      exergy: Math.max(0, state.exergy - computedExergyDestruction * dt),
      boundaryFluxes: state.boundaryFluxes
    };
  }
}
```

---

## 4. Verification & Test Plan (`tests/sprint_019.test.ts`)

1. **Test 1 (Second Law Enforcement):** Instantiate a mock monad that returns `entropyGenerationRate = -1.5`. Invoke `transit()` and assert that an `Error` matching `Second Law Violation` is thrown.
2. **Test 2 (Exergy Destruction Scaling):** Verify that $\dot{I} = T_0 \dot{S}_{\text{gen}}$ holds exactly for arbitrary valid positive values of $\dot{S}_{\text{gen}}$ at standard dead-state temperature ($288.15\text{ K}$).
3. **Test 3 (Mass & Energy Conservation):** Validate that monad state transitions correctly accumulate internal energy deltas and deplete available exergy without introducing unforced energy gains.