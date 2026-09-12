# Request for Comments (RFC) - Sprint 009
## Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

**Author:** Chief Systems Architect  
**Status:** Approved / Specification  
**Target Module:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`  

---

### 1. Executive Summary & Sprint Goal

Sprint 009 establishes the formal thermodynamic state vector interface and typing contracts within `src/thermodynamics/types.ts`. This sprint bridges macro-level biogeochemical cycling (Carbon, Nitrogen, Phosphorus, Water) with rigorous thermodynamic first and second law constraints. 

Specifically, this RFC formalizes:
1. **Internal Entropy Generation Rate ($\dot{S}_{\text{gen}}$)**: Quantifying the irreversible entropy production within the Earth pod control volume.
2. **Exergy Destruction Rate ($\dot{I} = T_0 \ises{S}_{\text{gen}}$)**: Establishing the Gouy-Stodola theorem link for thermodynamic efficiency and exergy degradation.
3. **Boundary Flux Arrays**: Modeling heat, work, and mass-transfer exergy/entropy fluxes across the system boundaries, ensuring absolute compliance with the constraint that *matter is conserved* and *energy input is strictly solar*.

---

### 2. Thermodynamic Foundations & First/Second Law Compliance

The Web of Life simulation models the Earth pod as an open thermodynamic system receiving solar radiation, reradiating longwave thermal radiation to deep space, and maintaining closed-loop material cycles (C, N, P, $\text{H}_2\text{O}$).

#### 2.1 First Law of Thermodynamics (Conservation of Energy)
$$\frac{dE_{\text{sys}}}{dt} = \sum \dot{Q}_{\text{in}} - \sum \dot{Q}_{\text{out}} + \sum \dot{W}_{\text{in,net}} + \sum \dot{H}_{\text{mass}}$$
In our closed-material Earth pod, external mass fluxes are zero ($\sum \dot{H}_{\text{mass}} = 0$). Energy input is driven exclusively by incoming solar irradiance ($\dot{Q}_{\text{solar}}$) balanced by planetary thermal emission ($\dot{Q}_{\text{thermal}}$).

#### 2.2 Second Law of Thermodynamics (Entropy Balance)
$$\frac{dS_{\text{sys}}}{dt} = \sum \left( \frac{\dot{Q}_k}{T_k} \right) + \dot{S}_{\text{gen}}$$
Where:
- $\frac{dS_{\text{sys}}}{dt}$ is the rate of change of system entropy.
- $\sum \left( \frac{\dot{Q}_k}{T_k} \right)$ is the entropy transfer across boundaries due to heat interactions.
- $\dot{S}_{\text{gen}} \ge 0$ is the internal entropy generation rate (guaranteed non-negative by the Second Law).

#### 2.3 Exergy Destruction & Gouy-Stodola Theorem
The exergy destruction rate ($\dot{I}$) quantifies thermodynamic imperfection (work potential loss):
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
where $T_0$ is the dead-state (ambient/sink) temperature (e.g., effective deep-space sink temperature $T_0 \approx 2.7\text{K}$ or effective radiative sink $\approx 255\text{K}$).

---

### 3. Class Hierarchy Additions & Interface Contracts (`src/thermodynamics/types.ts`)

We introduce strict TypeScript interfaces and type definitions to support state vector calculations across all biogeochemical cycles.

```typescript
/**
 * @fileoverview Thermodynamic State Vector Interfaces for Web of Life
 * @laws First Law (Energy Conservation), Second Law (Entropy Generation >= 0)
 */

export interface ThermalBoundaryFlux {
  readonly heatTransferRateWatts: number; // Q_dot (W)
  readonly boundaryTemperatureKelvin: number; // T_b (K)
}

export interface MassBoundaryFlux {
  readonly speciesId: string;
  readonly massFlowRateKgPerSec: number; // m_dot (kg/s) - Must sum to 0 for closed matter
  readonly specificEnthalpyJoulesPerKg: number; // h (J/kg)
  readonly specificEntropyJoulesPerKgKelvin: number; // s (J/kg·K)
}

export interface ThermodynamicStateVector {
  readonly timestamp: number;
  readonly systemInternalEnergyJoules: number; // U (J)
  readonly systemEntropyJoulesPerKelvin: number; // S (J/K)
  readonly temperatureKelvin: number; // T (K)
  readonly deadStateTemperatureKelvin: number; // T_0 (K)
  
  // Boundary interactions
  readonly solarInputWatts: number; // Q_solar (W) >= 0
  readonly planetaryEmissionWatts: number; // Q_emit (W) >= 0
  readonly thermalFluxes: readonly ThermalBoundaryFlux[];
  readonly massFluxes: readonly MassBoundaryFlux[];

  // Second Law Metrics
  readonly entropyGenerationRateWattsPerKelvin: number; // S_gen_dot (W/K) >= 0
  readonly exergyDestructionRateWatts: number; // I_dot = T_0 * S_gen_dot (W) >= 0
  readonly exergyEfficiency: number; // Eta_ex between 0.0 and 1.0
}

export interface IThermodynamicSystem {
  getStateVector(): ThermodynamicStateVector;
  computeEntropyGenerationRate(): number;
  computeExergyDestructionRate(): number;
  validateFirstLaw(tolerance: number): boolean;
  validateSecondLaw(): boolean;
}
```

---

### 4. Monad Stock Transitions & Integration

To manage state mutations across simulation ticks without violating conservation laws, thermodynamic stocks are wrapped in immutable monad structures (`ThermodynamicStateMonad`).

```typescript
export class ThermodynamicStateMonad {
  private constructor(private readonly state: ThermodynamicStateVector) {}

  public static initialize(initialState: ThermodynamicStateVector): ThermodynamicStateMonad {
    if (initialState.entropyGenerationRateWattsPerKelvin < 0) {
      throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
    }
    return new ThermodynamicStateMonad(initialState);
  }

  public map(transitionFn: (current: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateMonad {
    const nextState = transitionFn(this.state);
    
    // Enforce Second Law constraint: S_dot_gen >= 0
    if (nextState.entropyGenerationRateWattsPerKelvin < -1e-9) {
      throw new Error(
        `Second Law Violation: S_gen_dot (${nextState.entropyGenerationRateWattsPerKelvin}) < 0 detected during state transition.`
      );
    }

    return new ThermodynamicStateMonad(nextState);
  }

  public extract(): ThermodynamicStateVector {
    return this.state;
  }
}
```

---

### 5. Verification & Testing Strategy

1. **Unit Tests (`tests/sprint_009.test.ts`)**:
   - Verify that $\dot{S}_{\text{gen}} \ge 0$ holds across all cycle interactions (Carbon, Nitrogen, Phosphorus, Water).
   - Assert Gouy-Stodola relationship: $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$.
   - Verify solar-only energy input validation (rejecting external non-solar heat/energy sources).
2. **UML Schema Updates (`db/uml/sprint_009_schema.puml`)**:
   - Document new thermodynamic interfaces and composition relationships with `src/thermodynamics/thermodynamic_structure.ts`.