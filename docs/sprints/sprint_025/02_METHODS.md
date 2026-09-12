<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector & Non-Equilibrium Entropy Generation

**Sprint:** 25  
**Module:** `src/thermodynamics/methods.ts`  
**Author:** Process Mining & Research Scientist  

---

## 1. Physical & Thermodynamic Process Foundations

To maintain biophysical rigor in the Web of Life biosphere simulation, all metabolic transformations, biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water), and boundary energy exchanges are governed by non-equilibrium thermodynamics. 

### 1.1 First Law of Thermodynamics (Conservation of Energy/Matter)
The total system energy evolution vector adheres to the open-system energy balance:

$$\frac{dE_{\text{system}}}{dt} = \sum \dot{Q}_k - \dot{W}_{\text{system}} + \sum_{i} \dot{m}_i \left( h_i + \frac{v_i^2}{2} + g z_i \right)$$

Within the monad implementation (`src/thermodynamics/thermodynamic_monad_process.ts`), mass fluxes are rigorously tracked to ensure $\Delta M_{\text{system}} = \sum \int (\dot{m}_{\text{in}} - \dot{m}_{\text{out}}) dt$.

### 1.2 Second Law of Thermodynamics & Entropy Generation ($\dot{S}_{\text{gen}}$)
The local entropy balance dictates that system entropy changes are driven by external heat exchanges across boundary layers plus internal irreversible dissipations:

$$\frac{dS_{\text{system}}}{dt} = \sum_{k} \frac{\dot{Q}_k}{T_k} + \dot{S}_{\text{gen}}$$

The internal entropy generation rate $\dot{S}_{\text{gen}}$ is strictly constrained by the Second Law to be non-negative:

$$\dot{S}_{\text{gen}} = \dot{S}_{\text{thermal}} + \dot{S}_{\text{chemical}} + \dot{S}_{\text{diffusive}} \ge 0$$

### 1.3 Exergy Destruction Rate ($\dot{I}$)
Gouy-Stodola Theorem relates exergy destruction ($\dot{I}$) directly to the entropy generation rate and ambient reference temperature ($T_0 = 298.15\text{ K}$):

$$\dot{I} = T_0 \cdot \dot{S}_{\text{gen}}$$

---

## 2. Executable Monad Methods & Concrete Stock Transfer Equations

The following specification details the executable monad functions that compute thermodynamic metrics, update boundary fluxes, and validate physical admissibility.

```typescript
/**
 * @file src/thermodynamics/methods.ts
 * @description Executable monad methods for calculating entropy generation, exergy destruction,
 * and validating thermodynamic state transitions against First and Second Law constraints.
 */

import {
  ThermodynamicVector,
  BoundaryFluxArray,
  EntropyGenerationMetrics,
  ExergyDestructionMetrics,
  ThermodynamicStateSnapshot
} from './types';

const T_0 = 298.15; // Ambient reference temperature in Kelvin

/**
 * Calculates internal entropy generation components from heat, chemical, and diffusive fluxes.
 */
voicing: export function computeEntropyGeneration(
  netHeatFlux: number,
  boundaryTemperature: number,
  chemicalDissipationRate: number,
  diffusiveFluxRate: number
): EntropyGenerationMetrics {
  // Thermal dissipation component: \dot{S}_{thermal} = \dot{Q} / T_boundary
  const thermalDissipation = Math.abs(netHeatFlux / boundaryTemperature);
  
  // Chemical reaction entropy production (must be >= 0 via affinity * reaction rate / T)
  const chemicalReactionEntropy = Math.max(0, chemicalDissipationRate);
  
  // Diffusive transport entropy component
  const diffusiveTransportEntropy = Math.max(0, diffusiveFluxRate);

  const totalEntropyGenerationRate =
    thermalDissipation + chemicalReactionEntropy + diffusiveTransportEntropy;

  if (totalEntropyGenerationRate < 0) {
    throw new Error(
      `ThermodynamicViolationError: Second Law violated. S_gen = ${totalEntropyGenerationRate} W/K < 0`
    );
  }

  return {
    thermalDissipation,
    chemicalReactionEntropy,
    diffusiveTransportEntropy,
    totalEntropyGenerationRate
  };
}

/**
 * Computes exergy destruction rate via the Gouy-Stodola theorem: \dot{I} = T_0 * \dot{S}_{gen}
 */
export function computeExergyDestruction(
  entropyMetrics: EntropyGenerationMetrics,
  systemUsefulWork: number,
  totalExergyInput: number
): ExergyDestructionMetrics {
  const exergyDestructionRate = T_0 * entropyMetrics.totalEntropyGenerationRate;
  
  // Second Law Efficiency: eta_II = Useful Work Output / Exergy Input (or Exergy Recovered / Exergy Expended)
  const secondLawEfficiency = totalExergyInput > 0
    ? Math.max(0, Math.min(1, 1.0 - (exergyDestructionRate / totalExergyInput)))
    : 0.0;

  return {
    ambientTemperatureReference: T_0,
    exergyDestructionRate,
    secondLawEfficiency
  };
}

/**
 * Monad Transition Wrapper implementing rigorous state validation.
 */
export class ThermodynamicMonad<T extends ThermodynamicStateSnapshot> {
  private constructor(private readonly state: T) {}

  public static unit<T extends ThermodynamicStateSnapshot>(initialState: T): ThermodynamicMonad<T> {
    const monad = new ThermodynamicMonad(initialState);
    monad.validateSecondLaw();
    return monad;
  }

  public getState(): T {
    return this.state;
  }

  public chain<U extends ThermodynamicStateSnapshot>(
    transitionFn: (current: T) => U
  ): ThermodynamicMonad<U> {
    const nextState = transitionFn(this.state);
    const nextMonad = new ThermodynamicMonad(nextState);
    nextMonad.validateSecondLaw();
    return nextMonad;
  }

  public validateSecondLaw(): boolean {
    const sGen = this.state.entropyMetrics.totalEntropyGenerationRate;
    if (sGen < 0) {
      throw new Error(
        `ThermodynamicViolationError at timestamp ${this.state.timestamp}: \dot{S}_{gen} (${sGen}) < 0 violates Second Law.`
      );
    }
    return true;
  }
}
```

---

## 3. Mass & Energy Conservation Matrices

| Process / Cycle | Mass Delta ($\Delta m$) | Energy Delta ($\Delta E$) | Entropy Generation ($\dot{S}_{\text{gen}}$) | Exergy Destruction ($\dot{I}$) |
|---|---|---|---|---|
| **Solar Forcing** | $0\text{ kg/s}$ (Radiative) | $+\dot{Q}_{\text{solar}}$ | $\frac{\dot{Q}_{\text{solar}}}{T_{\text{sun}}} - \frac{\dot{Q}_{\text{earth}}}{T_{\text{earth}}} \ge 0$ | $T_0 \dot{S}_{\text{gen, solar}}$ |
| **Carbon Cycle (Photosynthesis)** | $\sum \Delta m_{\text{CO}_2, \text{H}_2\text{O}} = \sum \Delta m_{\text{Biomass}, \text{O}_2}$ | $+\Delta H_{\text{reaction}}$ (Stored) | $\ge 0$ (Biochemical Irreversibility) | $T_0 \dot{S}_{\text{gen, photo}}$ |
| **Nitrogen Fixation** | $\Delta m_{\text{N}_2 \to \text{NH}_3} = 0$ (Closed mass balance) | $+\Delta H_{\text{ATP hydrolysis}}$ | $\ge 0$ (Enzymatic Dissipation) | $T_0 \dot{S}_{\text{gen, N-fix}}$ |
| **Hydrological Evapotranspiration**| $\Delta m_{\text{H}_2\text{O (liquid)}} = -\Delta m_{\text{H}_2\text{O (vapor)}}$ | $+\Delta H_{\text{latent}}$ | $\ge 0$ (Phase Change Irreversibility) | $T_0 \dot{S}_{\text{gen, vapor}}$ |