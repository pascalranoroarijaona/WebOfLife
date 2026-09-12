<!-- Release Notes -->
# Sprint 17 Release Notes: Thermodynamic State Vector Interface

**Sprint:** 17  
**Module:** `src/thermodynamics/types.ts`  
**Compliance:** First Law of Thermodynamics (Energy Conservation), Second Law of Thermodynamics (Non-negative Entropy Generation Rate $\dot{S}_{\text{gen}} \ge 0$), Solar-Input Exclusivity.

---

## Overview

Sprint 17 delivers a formal, unified type contract for thermodynamic accounting across the Web of Life simulation architecture. By establishing the **Thermodynamic State Vector Interface** in `src/thermodynamics/types.ts`, this release standardizes entropy generation, exergy destruction metrics, and multi-port boundary flux arrays for all elemental cycles (Carbon, Nitrogen, Phosphorus, Water) and metabolic monads.

---

## Key Features & Architecture Changes

### 1. Thermodynamic State Vector & Boundary Flux Interfaces (`src/thermodynamics/types.ts`)
- **Strict Brand Types:** Defined explicit types for physical dimensions (`EnergyJoules`, `EntropyJoulesPerKelvin`, `TemperatureKelvin`, `PowerWatts`, `MassKilograms`, and `MassFluxRate`).
- **`IThermodynamicBoundaryFlux`:** Represents individual heat and mass port entries with associated thermodynamic potentials (heat flux, boundary temperature, mass flow rate, specific enthalpy, and specific entropy).
- **`IThermodynamicStateVector`:** Comprehensive snapshot capture containing internal energy, total entropy, system/ambient reference temperatures, boundary flux arrays, internal entropy generation rate ($\dot{S}_{\text{gen}}$), and exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).
- **`IThermodynamicSystem` Contract:** Core interface requiring implementing entities to expose their state vector, validate the First Law of Thermodynamics, and verify Second Law compliance.

### 2. Thermodynamic Invariants & Governing Laws
- **First Law (Energy Conservation):** Balances system energy changes against net heat, work, and enthalpy mass boundary fluxes.
- **Second Law (Clausius-Duhem Inequality):** Enforces strict non-negativity on internal entropy generation ($\dot{S}_{\text{gen}} \ge 0$).
- **Gouy-Stodola Theorem:** Automatically correlates exergy destruction with ambient reference temperature and entropy generation ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).
- **Solar-Input Exclusivity:** Traces all external thermal and work inputs to verified solar boundary flux ports.

### 3. Class Hierarchy Integration
- Integrated `IThermodynamicSystem` compliance across `BaseThermodynamicStructure`, `EarthPod`, `ThermodynamicMonadProcess`, and elemental cycle processors (Carbon, Nitrogen, Phosphorus, Water).

---

## Verification and Testing (`tests/sprint_017.test.ts`)

- **State Vector Unit Tests:** Validates correct computation of exergy destruction rates and verifies that negative entropy generation rates trigger immediate thermodynamic exceptions.
- **First Law Conservation Audits:** Simulates open and closed metabolic loops to confirm energy balance convergence within $10^{-6}$ relative tolerance.
- **Second Law Audits:** Verifies monotonic non-decrease of universe entropy across integrated monad stock transitions.