<!-- Release Notes -->
# Sprint 15 Release Notes: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

## Executive Summary
Sprint 15 establishes formal TypeScript interface contracts for thermodynamic state vectors, internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays within `src/thermodynamics/types.ts`. This release provides rigorous mathematical backing to ensure compliance with the First Law (energy conservation) and Second Law (entropy generation $\ge 0$) of thermodynamics across all planetary nutrient and water cycles.

---

## Key Architectural & Backend Additions

### 1. Thermodynamic State Vector & Flux Contracts (`src/thermodynamics/types.ts`)
- **`BoundaryFlux`**: Encapsulates boundary-crossing metrics including mass/molar flow rates, specific enthalpy, specific entropy, and boundary heat transfer rates at specified temperatures.
- **`ThermodynamicStateVector`**: Tracks absolute subsystem temperature, ambient dead-state temperature ($T_0$), internal energy, total entropy, internal entropy generation rate ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I}$), and active boundary fluxes.
- **`IThermodynamicModel`**: Defines core model operations for stepping thermodynamics (`stepThermodynamics`), validating First Law energy conservation (`validateFirstLaw`), checking Second Law compliance (`validateSecondLaw`), and retrieving the current state vector.

### 2. Class Hierarchy & Integration
- Extended **`BaseCycle`** (`src/cycles/base_cycle.ts`) to implement `IThermodynamicModel`.
- Configured individual nutrient and water cycles (**Carbon**, **Nitrogen**, **Phosphorus**, **Water**) to maintain strict thermodynamic tracking.
- Restricted external energy inputs strictly to validated solar and geothermal boundary fluxes via `src/earth_pod.ts`.

### 3. Database Schema & Persistence
- Added Sprint 15 schema definitions (`db/uml/sprint_015_schema.puml` and `db/schema.sql`) to support historical persistence of thermodynamic state vectors and exergy destruction telemetry for macroeconomic and ecological auditing.

---

## Testing & Verification
- **Unit Tests (`tests/sprint_015.test.ts`)**:
  - Validated that internal entropy generation $\dot{S}_{\text{gen}} \ge 0$ holds across all operational configurations for carbon, nitrogen, phosphorus, and water cycles.
  - Confirmed strict adherence to the Gouy-Stodola theorem: $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$.
  - Asserted First Law mass-energy balance closure within computational tolerances ($\epsilon < 10^{-10}$).