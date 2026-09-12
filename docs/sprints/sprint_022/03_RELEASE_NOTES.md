<!-- Release Notes -->
# Release Notes — Sprint 022: Thermodynamic State Vector Interface Contracts

## Overview
Sprint 022 establishes formal, strict TypeScript interfaces for internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux array structures within the Web of Life simulation engine (`src/thermodynamics/types.ts`). This release provides strict compile-time guarantees and foundational contracts enforcing the First and Second Laws of Thermodynamics across all planetary metabolic processes.

---

## Key Architectural Additions (`src/thermodynamics/types.ts`)

### 1. Reference State & Boundary Fluxes
- **`IThermodynamicReferenceState`**: Formalizes ambient reference parameters ($T_0$, $P_0$, and standard chemical potentials $\mu_i^0$) essential for exergy calculations.
- **`IBoundaryFluxVector`**: Tracks rate of heat transfer ($\dot{Q}$), boundary temperature ($T_b$), elemental/molecular mass flow rates, and boundary entropy flux ($\dot{S} = \dot{Q}/T_b$).

### 2. State Vector & Second Law Metrics
- **`IThermodynamicStateVector`**: Captures comprehensive intensive and extensive properties (internal energy $U$, entropy $S$, temperature $T$, pressure $P$, volume $V$, and elemental pool masses).
- **`IEntropyGenerationMetrics`**: Implements rigorous Second Law accounting structures:
  - Internal entropy generation rate ($\dot{S}_{\text{gen}} \ge 0$).
  - Ambient reference temperature ($T_0$).
  - Exergy destruction rate ($\dot{I} = T_0 \cdot \dot{S}_{\text{gen}}$).
  - Second Law compliance flags.

### 3. Monad Transitions & Process Contracts
- **`IThermodynamicMonadTransition`**: Represents state updates bundling prior states, posterior states, boundary fluxes, and entropy/exergy metrics.
- **`IThermodynamicProcessContract`**: Defines strict execution and validation interfaces (`executeTransition`, `validateFirstLaw`, `validateSecondLaw`) for all participating biogeochemical processes.

---

## Class Hierarchy & Integration
- Integrated with existing thermodynamic structures (`src/thermodynamics/thermodynamic_structure.ts`) and monad process flows (`src/thermodynamics/thermodynamic_monad_process.ts`).
- Establishes the blueprint for cycle-specific implementations (Carbon, Nitrogen, Phosphorus, and Water cycles) via `IThermodynamicProcessContract`.

---

## Verification & Testing Strategy
- **Type-Level Compliance:** Enforces strict conformance across all subsystem processes.
- **Thermodynamic Unit Tests (`tests/sprint_022.test.ts`):** 
  - Validates exact parity for $\dot{I} = T_0 \dot{S}_{\text{gen}}$.
  - Asserts runtime exceptions on Second Law breaches ($\dot{S}_{\text{gen}} < 0$).
  - Verifies mass conservation across global earth pods and elemental reservoirs.