<!-- Release Notes -->

# Sprint 13 Release Notes: Thermodynamic State Vector Interface

## Overview
Sprint 13 establishes the rigorous mathematical foundation for thermodynamics within the *Web of Life* simulation engine via the introduction of the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`). This release moves the ecosystem modeling away from unconstrained pools to strict macroscopic and microscopic thermodynamic representations adhering to the First and Second Laws of Thermodynamics.

---

## Key Architectural & Code Modifications

### 1. Thermodynamic Type Contracts (`src/thermodynamics/types.ts`)
Introduced precise TypeScript interfaces to enforce thermodynamic laws across all biogeochemical cycles:
- **`IBoundaryFluxArray`**: Tracks incoming solar radiative fluxes ($\ge 0$), outgoing thermal/longwave radiation, matter enthalpy fluxes, and net heat transfer across system boundaries.
- **`IExergyMetrics`**: Manages ambient reference temperature ($T_0$, default $288.15\text{ K}$), internal entropy generation rates ($\dot{S}_{\text{gen}}$), exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and total available exergy.
- **`IThermodynamicStateVector`**: Combines state timestamps, internal energy ($U$), total entropy ($S$), boundary fluxes, and exergy metrics with built-in validation methods:
  - `validateFirstLaw(dt, previousEnergy)`: Confirms energy conservation compliance ($\Delta U = \sum \dot{Q} - \sum \dot{W} + \sum \dot{h}\dot{m}$).
  - `validateSecondLaw()`: Enforces irreversibility and non-negative entropy generation ($\dot{S}_{\text{gen}} \ge 0$).

### 2. Integration with Biogeochemical Cycles
- Designed to integrate seamlessly with concrete thermodynamic engines (`src/thermodynamics/thermodynamic_structure.ts`) and existing biogeochemical cycles (`src/cycles/carbon.ts`, `nitrogen.ts`, `phosphorus.ts`, `water.ts`).
- Operates via pure functional state transitions that thread thermodynamic checks across every simulation step.

### 3. Verification & Testing Suite (`tests/sprint_013.test.ts`)
- Added comprehensive test coverage validating:
  - Strict enforcement of $\dot{S}_{\text{gen}} \ge 0$ under standard and stressed metabolic workflows.
  - Mathematical integrity of exergy destruction calculations ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).
  - Balance fidelity of solar radiative input versus internal accumulation and boundary radiation.

---

## GitHub Docs & Reference Standards
This release aligns with RFC 013 specifications, ensuring robust ecosystem thermodynamic feedback loops and future-proofing energy-matter tracking across all simulation tiers.