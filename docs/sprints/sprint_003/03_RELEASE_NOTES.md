<!-- Release Notes -->
# Sprint 003 Release Notes: Thermodynamic State Vector Interface

## Overview
Sprint 003 establishes the foundational thermodynamic contract for the *Web of Life* simulation engine via `src/thermodynamics/types.ts`. This release codifies strict mathematical boundaries, conservation laws, and second-law irreversibility tracking into pure TypeScript type definitions and interfaces.

---

## Key Features & Architecture

### 1. Thermodynamic State Vector Contracts (`src/thermodynamics/types.ts`)
We introduced robust, immutable TypeScript interfaces to govern all control volumes within the system (`EarthPod` and simulation runloops):
- **`BoundaryFluxArray`**: Tracks net radiative heat fluxes, sensible/latent convective heat transfer, mass-transported enthalpy fluxes, and species-specific mass inflow/outflow rates.
- **`EntropyMetrics`**: Encapsulates second-law parameters, explicitly monitoring internal entropy generation rates ($\dot{S}_{\text{gen}}$) and corresponding exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) relative to an ambient reference temperature ($T_0$).
- **`ThermodynamicStateVector`**: Provides a comprehensive snapshot combining internal energy, total mass, absolute temperature, boundary fluxes, and entropy metrics at any simulation timestamp.

### 2. First and Second Law Invariant Enforcement
The architecture now strictly enforces classical thermodynamic principles:
- **First Law (Conservation):** Ensures mass and energy changes across control volume boundaries balance perfectly without spontaneous creation or destruction.
- **Second Law (Clausius-Duhem Inequality):** Validates that internal entropy generation and exergy destruction rates remain non-negative ($\dot{S}_{\text{gen}} \ge 0$, $\dot{I} \ge 0$).
- **Solar-Driven Boundary Conditions:** Restricts external energy inputs strictly to bounded solar irradiance and longwave thermal radiation.

---

## Verification & Testing Strategy
- **Invariant Validation:** Implemented strict type checks and validation predicates to reject illegal state vectors (e.g., negative entropy generation or exergy destruction).
- **Mass & Energy Conservation Tests:** Validated state transitions across open and closed system compartments to ensure strict mass/energy balance.

---

## Contributors & Review
- **Chief Systems Architect:** Thermodynamic State Vector Specification & RFC 003.
- **Open-Source Community Lead:** Technical Documentation & Release Management.