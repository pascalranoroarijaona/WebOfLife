# RFC 020: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## 1. Overview & Sprint Goal
Sprint 20 establishes strict TypeScript interfaces and contracts for the thermodynamic state vector within the Web of Life simulation engine. This RFC formalizes internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays. 

By enforcing rigorous thermodynamic laws (First Law: conservation of mass and energy; Second Law: non-negative entropy generation $\dot{S}_{\text{gen}} \ge 0$), the simulation guarantees physically consistent planetary-scale metabolic processes.

---

## 2. Thermodynamic Foundations & Mathematical Contracts

### 2.1 First Law of Thermodynamics (Energy Conservation)
For any subsystem or the global Earth pod $V$, the time rate of change of total internal energy $U$ equals the net energy flux across the boundaries plus internal heat and work rates:
$$\frac{dE_{\text{sys}}}{dt} = \sum_j \dot{Q}_j - \dot{W} + \sum_i \dot{m}_i \left( h_i + \frac{1}{2}v_i^2 + g z_i \right)$$

Within the Web of Life engine, solar input is the sole exogenous energy driver:
$$\dot{Q}_{\text{solar}} > 0, \quad \dot{Q}_{\text{other external}} = 0$$

### 2.2 Second Law of Thermodynamics (Entropy Generation)
The entropy balance for an open thermodynamic system is given by:
$$\frac{dS_{\text{sys}}}{dt} = \sum_k \frac{\dot{Q}_k}{T_k} + \sum_i \dot{m}_i s_i + \dot{S}_{\text{gen}}$$

The core requirement of the Second Law is **non-negative entropy generation**:
$$\dot{S}_{\text{gen}} \ge 0$$
where $\dot{S}_{\text{gen}} = 0$ represents reversible ideal processes, and $\dot{S}_{\text{gen}} > 0$ represents real irreversible processes (e.g., biochemical respiration, nutrient cycling, radiative degradation).

### 2.3 Exergy Destruction Rate ($\dot{I}$)
Exergy ($\Xi$) represents the maximum useful work obtainable as the system brings itself into equilibrium with a reference environment at temperature $T_0$. The exergy destruction rate (dissipation rate) is directly proportional to internal entropy generation via the Gouy-Stodola theorem:
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
where $T_0$ is the ambient reference temperature (e.g., 288.15 K for standard Earth surface conditions).

---

## 3. Interface Contracts (`src/thermodynamics/types.ts`)

The following TypeScript interfaces formalize these mathematical structures:

```ts
/**
 * Represents boundary heat and mass fluxes interacting with the thermodynamic system.
 */
export interface ThermodynamicBoundaryFlux {
  /** Net radiative and conductive heat transfer rates across boundaries (Watts, J/s) */
  heatFluxes: number[];
  /** Temperatures corresponding to each boundary heat flux (Kelvin) */
  boundaryTemperatures: number[];
  /** Mass transfer rates across boundaries (kg/s) for cycles (Carbon, Nitrogen, Phosphorus, Water) */
  massFluxes: number[];
  /** Specific enthalpies of transferred masses (J/kg) */
  specificEnthalpies: number[];
  /** Specific entropies of transferred masses (J/(kg·K)) */
  specificEntropies: number[];
}

/**
 * Complete thermodynamic state vector for a pod or planetary subsystem.
 */
export interface ThermodynamicStateVector {
  /** Internal energy of the system (Joules) */
  internalEnergy: number;
  /** Total system entropy (Joules / Kelvin) */
  entropy: number;
  /** Ambient reference temperature for exergy calculations (Kelvin) */
  referenceTemperature: number;
  /** Internal entropy generation rate $\dot{S}_{\text{gen}}$ (W/K or J/(s·K)) */
  entropyGenerationRate: number;
  /** Exergy destruction rate $\dot{I} = T_0 \dot{S}_{\text{gen}}$ (Watts, J/s) */
  exergyDestructionRate: number;
  /** Boundary flux vector containing heat, mass, and constituent thermal properties */
  boundaryFlux: ThermodynamicBoundaryFlux;
  /** Timestamp or simulation tick of the state record */
  timestamp: number;
}

/**
 * Validator contract ensuring compliance with First and Second Laws.
 */
export interface ThermodynamicValidator {
  validateFirstLaw(previousState: ThermodynamicStateVector, currentState: ThermodynamicStateVector, dt: number): boolean;
  validateSecondLaw(state: ThermodynamicStateVector): boolean;
}
```

---

## 4. Class Hierarchy & Composition Additions

To integrate `ThermodynamicStateVector` seamlessly into the existing architecture (`src/thermodynamic_structure.ts`, `src/thermodynamics/thermodynamic_monad_process.ts`), we define an incremental inheritance structure:

```
        +-----------------------------------+
        |    ThermodynamicStructure         |
        +-----------------------------------+
                          ^
                          | extends / composes
        +-----------------------------------+
        |    MonadProcessablePod            |
        +-----------------------------------+
                          ^
                          | instantiates
        +-----------------------------------+
        |    ThermodynamicStateVector       |
        +-----------------------------------+
```

### 4.1 Monad Stock Transitions
Monads representing elemental stocks (Carbon, Nitrogen, Phosphorus, Water cycles) are bound to thermodynamic state transitions. When a biogeochemical monad process executes:
1. **Matter Conservation (First Law)**: Total mass across C, N, P, and $\text{H}_2\text{O}$ pools is conserved within rounding tolerances ($\sum \Delta M_i = 0$).
2. **Energy Coupling**: Enthalpy changes in biochemical reactions map directly to internal energy shifts in the `ThermodynamicStateVector`.
3. **Entropy Accounting**: Every irreversible biological or chemical transformation increments `entropyGenerationRate`, compounding `exergyDestructionRate`.

---

## 5. Verification & Testing Strategy

Tests in `tests/sprint_020.test.ts` will verify:
1. **Second Law Enforcement**: Any state where `entropyGenerationRate < 0` throws an immediate `ThermodynamicViolationError`.
2. **Gouy-Stodola Consistency**: Asserts that `exergyDestructionRate === referenceTemperature * entropyGenerationRate` across random simulation states.
3. **Solar-Only Driving**: Confirms that external energy inputs are strictly non-zero solely for solar radiative influxes, maintaining closed-system mass conservation.