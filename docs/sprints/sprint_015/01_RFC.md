# RFC 015: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## 1. Executive Summary & Sprint Goal
Sprint 15 establishes the formal TypeScript interface contracts for the thermodynamic state vector, internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays within `src/thermodynamics/types.ts`. This layer provides rigorous mathematical backing to ensure adherence to the First Law (energy conservation) and Second Law (entropy generation $\ge 0$) of thermodynamics across all planetary nutrient and water cycles.

---

## 2. Theoretical Foundations

### 2.1 First Law of Thermodynamics (Energy Conservation)
For any open subsystem $k$ in the Web of Life (e.g., carbon, nitrogen, phosphorus, or water pools), the time rate of change of total energy $E_k$ is governed by:
$$\frac{dE_k}{dt} = \dot{Q}_k - \dot{W}_k + \sum_{in} \dot{m}_{in} h_{in} - \sum_{out} \dot{m}_{out} h_{out}$$
Mass conservation is strictly enforced: matter is neither created nor destroyed within cycles, and external inputs are restricted solely to solar radiation and geothermal boundary conditions.

### 2.2 Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)
The entropy balance for any subsystem is given by:
$$\frac{dS_k}{dt} = \sum_{j} \frac{\dot{Q}_{kj}}{T_{j}} + \sum_{in} \dot{m}_{in} s_{in} - \sum_{out} \dot{m}_{out} s_{out} + \dot{S}_{\text{gen}, k}$$
where the internal entropy generation rate $\dot{S}_{\text{gen}, k}$ must satisfy the Clausius-Duhem inequality:
$$\dot{S}_{\text{gen}, k} \ge 0$$

The associated **exergy destruction rate** ($\dot{I}$) at dead-state temperature $T_0$ (ambient sink temperature) is quantified via Gouy-Stodola theorem:
$$\dot{I}_k = T_0 \dot{S}_{\text{gen}, k} \ge 0$$

---

## 3. Interface Contracts (`src/thermodynamics/types.ts`)

```typescript
/**
 * @fileoverview Thermodynamic State Vector and Flux Contracts
 * Enforces First and Second Laws of Thermodynamics for Web of Life cycles.
 */

export interface BoundaryFlux {
  readonly fluxId: string;
  readonly species: string;
  /** Mass or molar flow rate (kg/s or mol/s) */
  readonly massFlowRate: number;
  /** Specific enthalpy (J/kg or J/mol) */
  readonly specificEnthalpy: number;
  /** Specific entropy (J/(kg·K) or J/(mol·K)) */
  readonly specificEntropy: number;
  /** Heat transfer rate crossing boundary at temperature T (Watts) */
  readonly heatTransferRate: number;
  readonly boundaryTemperature: number;
}

export interface ThermodynamicStateVector {
  readonly timestamp: number;
  /** Absolute temperature of the subsystem (Kelvin) */
  readonly temperature: number;
  /** Ambient dead-state temperature T_0 (Kelvin) */
  readonly deadStateTemperature: number;
  /** Total internal energy (Joules) */
  internalEnergy: number;
  /** Total entropy (Joules / Kelvin) */
  entropy: number;
  /** Internal entropy generation rate S_gen_dot (W/K) */
  entropyGenerationRate: number;
  /** Exergy destruction rate I_dot = T_0 * S_gen_dot (Watts) */
  exergyDestructionRate: number;
  /** Incoming and outgoing boundary fluxes */
  boundaryFluxes: BoundaryFlux[];
}

export interface IThermodynamicModel {
  /** Computes energy and entropy balances, updating the state vector */
  stepThermodynamics(dt: number): void;
  
  /** Validates First Law conservation (Energy in = Energy out + Accumulation) */
  validateFirstLaw(): boolean;
  
  /** Validates Second Law compliance (S_gen_dot >= 0) */
  validateSecondLaw(): boolean;
  
  /** Retrieves current thermodynamic state vector */
  getStateVector(): ThermodynamicStateVector;
}
```

---

## 4. Class Hierarchy & Incremental Integration

```
IThermodynamicModel (Interface)
 └── BaseCycle (Abstract Class in src/cycles/base_cycle.ts)
      ├── CarbonCycle (src/cycles/carbon.ts)
      ├── NitrogenCycle (src/cycles/nitrogen.ts)
      ├── PhosphorusCycle (src/cycles/phosphorus.ts)
      └── WaterCycle (src/cycles/water.ts)
```

- **`BaseCycle`**: Extended to implement `IThermodynamicModel`, maintaining a private `ThermodynamicStateVector` instance.
- **Solar Input Enforcement**: Net external energy inputs are validated to originate exclusively from radiative solar flux models (`src/earth_pod.ts`).

---

## 5. Verification & Testing Plan
1. **Unit Tests (`tests/sprint_015.test.ts`)**:
   - Verify that $\dot{S}_{\text{gen}} \ge 0$ under all operational scenarios across carbon, nitrogen, phosphorus, and water cycles.
   - Confirm Gouy-Stodola proportionality: $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$.
   - Assert First Law mass-energy balance closure within tolerance $\epsilon < 10^{-10}$.
2. **Database Schema Update (`db/uml/sprint_015_schema.puml`, `db/schema.sql`)**:
   - Persist historical thermodynamic state vectors and exergy destruction metrics for macro-ecological auditing.