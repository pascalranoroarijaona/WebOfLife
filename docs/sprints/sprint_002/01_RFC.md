# RFC 002: Thermodynamic State Vector Interface & Laws Compliance

## 1. Executive Summary & Sprint Goal
The objective of **Sprint 002** is to establish rigorous thermodynamic contracts in `src/thermodynamics/types.ts` and ensure adherence to the First and Second Laws of Thermodynamics across the Web of Life simulation architecture. This includes formalizing internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays to govern energy conservation and irreversibility constraints.

---

## 2. Thermodynamic First & Second Law Principles

### 2.1 First Law of Thermodynamics (Energy Conservation)
The total energy change within any control volume (Earth Pod, organism, or system node) must equal the net energy transfer across boundaries via heat, work, and mass flow:
$$\frac{dE_{\text{sys}}}{dt} = \sum \dot{Q} - \sum \dot{W} + \sum \dot{m}_{\text{in}} h_{\text{in}} - \sum \dot{m}_{\text{out}} h_{\text{out}}$$
- **Solar Input Only:** External work inputs are restricted strictly to radiation flux from stellar sources (solar input). No unphysical internal energy generation sources are permitted.

### 2.2 Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)
The entropy change of a system is driven by heat transfer, mass exchange, and internal irreversibilities:
$$\frac{dS_{\text{sys}}}{dt} = \sum \left( \frac{\dot{Q}_k}{T_k} \right) + \sum \dot{m}_{\text{in}} s_{\text{in}} - \sum \dot{m}_{\text{out}} s_{\text{out}} + \dot{S}_{\text{gen}}$$
- **Internal Entropy Generation ($\dot{S}_{\text{gen}}$):** Must be non-negative ($\dot{S}_{\text{gen}} \ge 0$) for all real processes, satisfying the Clausius inequality.
- **Exergy Destruction Rate ($\dot{I}$):** Quantifies thermodynamic irreversibility relative to an ambient reference temperature $T_0$:
  $$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 3. Class Hierarchy Additions & Interface Contracts (`src/thermodynamics/types.ts`)

We introduce strict TypeScript interfaces and types to encapsulate state vectors, boundary fluxes, and thermodynamic evaluations.

### 3.1 Interface Specifications

```typescript
export interface ThermodynamicVector {
  temperature: number;      // Absolute temperature (K)
  pressure: number;         // Pressure (Pa)
  internalEnergy: number;   // Total internal energy (J)
  entropy: number;          // Total entropy (J/K)
  exergy: number;           // Total available work / exergy (J)
}

export interface BoundaryFlux {
  heatTransferRate: number;     // \dot{Q} (W)
  boundaryTemperature: number;  // T_boundary (K)
  massFlowRate: number;         // \dot{m} (kg/s)
  specificEnthalpy: number;     // h (J/kg)
  specificEntropy: number;      // s (J/(kg·K))
}

export interface ThermodynamicStateVector {
  timestamp: number;
  system: ThermodynamicVector;
  ambientReference: {
    temperature0: number;       // T_0 (K)
    pressure0: number;          // P_0 (Pa)
  };
  fluxes: BoundaryFlux[];
  entropyGenerationRate: number; // \dot{S}_{\text{gen}} (W/K)
  exergyDestructionRate: number; // \dot{I} = T_0 \dot{S}_{\text{gen}} (W)
}

export interface IThermodynamicSystem {
  getStateVector(): ThermodynamicStateVector;
  applyBoundaryFlux(flux: BoundaryFlux): void;
  computeEntropyGeneration(): number;
  validateLaws(): ValidationResult;
}

export interface ValidationResult {
  isFirstLawSatisfied: boolean;   // Energy conservation check
  isSecondLawSatisfied: boolean;  // \dot{S}_{\text{gen}} >= 0 check
  energyResidual: number;
  entropyResidual: number;
}
```

---

## 4. Monad Stock Transitions & Conservation Flow

To guarantee matter and energy conservation across tick cycles, state transitions are wrapped in a functional state monad (`ThermodynamicMonad`):

1. **Intake / Influx:** Solar radiation and nutrient mass enter system boundaries.
2. **Internal Transformation:** Metabolic and chemical reactions generate internal entropy ($\dot{S}_{\text{gen}}$) without violating total mass-energy balance.
3. **Exiting Fluxes:** Heat dissipation and metabolic waste leave the boundary.
4. **Validation Gate:** The monad applies a strict assertion filter verifying $\dot{S}_{\text{gen}} \ge 0$ and $\Delta E_{\text{sys}} = \sum \text{Fluxes}$. If thresholds fail, the system triggers an entropic exception rollback.

---

## 5. Incremental Integration Roadmap
- **Step 1:** Implement `src/thermodynamics/types.ts` with the interface contracts defined above.
- **Step 2:** Refactor `src/thermodynamics/thermodynamic_structure.ts` to implement `IThermodynamicSystem`.
- **Step 3:** Update `src/earth_pod.ts` to aggregate pod-level boundary fluxes and validate thermodynamic compliance on every simulation step.
- **Step 4:** Write comprehensive unit tests in `tests/sprint_002.test.ts` (extending the repository test suite).