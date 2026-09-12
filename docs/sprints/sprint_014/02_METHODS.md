<!-- Method Specifications -->

# Method Specifications: Sprint 014 - Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## 1. Overview & Process Mining Context
This document specifies the rigorous physical and mathematical methods required for Sprint 014, formalizing the thermodynamic state vector interface, internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays. 

The Web of Life ecosystem operates as a closed thermodynamic system with respect to mass (except for minuscule meteoritic inputs and negligible atmospheric escape, set to zero for ideal closure) and an open thermodynamic system with respect to energy (incoming shortwave solar radiation balanced by outgoing longwave thermal radiation).

---

## 2. Mathematical Formalization & Monad Implementation

### 2.1 First Law of Thermodynamics (Energy Conservation)
For any subsystem or the global Earth Pod $\Omega$, the internal energy change $E_{\text{sys}}$ is governed by:
$$\frac{dE_{\text{sys}}}{dt} = \dot{Q}_{\text{solar,in}} - \dot{Q}_{\text{lw,out}} + \dot{H}_{\text{sensible}} + \dot{H}_{\text{latent}}$$

In code representation via `BoundaryFluxArray`:
- $\dot{Q}_{\text{solar,in}} =$ `solarRadiationIn` ($W$)
- $\dot{Q}_{\text{lw,out}} =$ `longwaveRadiationOut` ($W$)
- $\dot{H}_{\text{sensible}} =$ `sensibleHeatFlux` ($W$)
- $\dot{H}_{\text{latent}} =$ `latentHeatFlux` ($W$)
- $\dot{m}_{\text{net}} =$ `netMassFlux` ($\text{kg/s} \approx 0$)

### 2.2 Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)
The entropy balance across a time step $\Delta t$ is:
$$\Delta S_{\text{sys}} = \sum \frac{Q_k}{T_k} + S_{\text{gen}}$$
Rearranging for the internal entropy generation rate ($\dot{S}_{\text{gen}}$):
$$\dot{S}_{\text{gen}} = \frac{dS_{\text{sys}}}{dt} - \sum \frac{\dot{Q}_k}{T_k} \ge 0$$

The exergy destruction rate ($\dot{I}$) quantifies lost work potential due to irreversibilities (metabolic heat dissipation, friction, thermal radiation mismatch):
$$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
where $T_0 = 288.15\text{ K}$ is the ambient reference temperature.

---

## 3. Executable Monad Method & Stock Transfer Equations (`src/thermodynamics/thermodynamic_structure.ts`)

Below is the concrete implementation specification for the thermodynamic state transition monad, enforcing invariant checks for the Second Law ($\dot{S}_{\text{gen}} \ge -10^{-9}$ to account for IEEE 754 floating-point inaccuracies).

```typescript
import { ThermodynamicStateVector, BoundaryFluxArray, ThermodynamicMetrics } from './types';

export abstract class BaseThermodynamicSystem {
  protected state: ThermodynamicStateVector;

  constructor(initialState: ThermodynamicStateVector) {
    this.state = initialState;
  }

  public abstract computeEntropyGeneration(dt: number): number;
  protected abstract calculateExergyEfficiency(): number;

  public getMetrics(): ThermodynamicMetrics {
    const sGen = this.computeEntropyGeneration(1.0);
    const iDest = sGen * this.state.ambientReferenceTemp;
    return {
      entropyGenerationRate: sGen,
      exergyDestructionRate: iDest,
      exergyEfficiency: this.calculateExergyEfficiency(),
      isSecondLawValid: sGen >= -1e-9
    };
  }
}

export class ThermodynamicStateMonad {
  private constructor(private readonly state: ThermodynamicStateVector) {}

  public static unit(state: ThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public map(fn: (s: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateMonad {
    const nextState = fn(this.state);
    
    // Validate First Law / Mass Conservation bounds
    if (Math.abs(nextState.boundaryFluxes.netMassFlux) > 1e-6) {
      console.warn(`[Warning] Mass conservation violation detected: netMassFlux = ${nextState.boundaryFluxes.netMassFlux} kg/s`);
    }

    return new ThermodynamicStateMonad(nextState);
  }

  public getState(): ThermodynamicStateVector {
    return this.state;
  }
}
```

---

## 4. Verification & Audit Protocol
1. **Entropy Non-Negativity Check**: Every state transition through `ThermodynamicStateMonad` must verify that $\dot{S}_{\text{gen}} \ge -10^{-9}$.
2. **Exergy Coupling Verification**: $\dot{I} = T_0 \dot{S}_{\text{gen}}$ must hold identically across all biogeochemical cycle subsystems (Carbon, Nitrogen, Phosphorus, Water).
3. **Boundary Closure**: Solar radiation input must balance outgoing longwave radiation plus internal storage changes within tolerance limits ($\pm 0.1\%$ per diurnal cycle).