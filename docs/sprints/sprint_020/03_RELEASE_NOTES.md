# Release Notes – Sprint 20: Thermodynamic State Vector Interface

## Overview
Sprint 20 establishes strict TypeScript contracts and interface definitions for the thermodynamic state vector within the Web of Life simulation engine (`src/thermodynamics/types.ts`). This release formalizes core thermodynamic laws, including internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and comprehensive boundary flux arrays. 

By enforcing rigorous physical laws—specifically the First Law (energy/mass conservation) and the Second Law (non-negative entropy generation $\dot{S}_{\text{gen}} \ge 0$)—the simulation guarantees physically consistent planetary-scale metabolic and biochemical processes.

---

## What's New

### 1. Core Thermodynamic Interfaces (`src/thermodynamics/types.ts`)
* **`ThermodynamicBoundaryFlux`**: Defines net radiative/conductive heat transfer rates, boundary temperatures, mass transfer rates across biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water), and their specific enthalpies and entropies.
* **`ThermodynamicStateVector`**: Encapsulates the complete thermodynamic state of a simulation pod or planetary subsystem, tracking internal energy, total entropy, reference temperature, entropy generation rate, exergy destruction rate, boundary fluxes, and simulation timestamps.
* **`ThermodynamicValidator`**: Establishes strict validation contracts to ensure continuous compliance with the First Law (energy conservation across time steps) and the Second Law (non-negative entropy generation).

### 2. Architectural & Class Integration
* **Monad Stock Transitions**: Bound elemental stocks (C, N, P, $\text{H}_2\text{O}$) to thermodynamic state transitions.
* **Energy Coupling**: Mapped biochemical reaction enthalpy changes directly to internal energy shifts within the `ThermodynamicStateVector`.
* **Entropy Accounting**: Configured biological and chemical transformations to incrementally update `entropyGenerationRate` and compound `exergyDestructionRate`.

---

## Mathematical & Physical Guarantees

* **First Law (Energy Conservation)**: 
  $$\frac{dE_{\text{sys}}}{dt} = \sum_j \dot{Q}_j - \dot{W} + \sum_i \dot{m}_i \left( h_i + \frac{1}{2}v_i^2 + g z_i \right)$$
  Enforced with solar input as the sole exogenous energy driver ($\dot{Q}_{\text{solar}} > 0, \dot{Q}_{\text{other external}} = 0$).
* **Second Law (Entropy Generation)**: 
  $$\dot{S}_{\text{gen}} \ge 0$$
  Guarantees that real irreversible processes (respiration, nutrient cycling, radiative degradation) never violate physical entropy bounds.
* **Gouy-Stodola Theorem (Exergy Destruction)**: 
  $$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
  Maintains rigorous consistency between exergy destruction and internal entropy generation relative to the ambient reference temperature ($T_0 = 288.15\text{ K}$).

---

## Verification & Testing (`tests/sprint_020.test.ts`)
* **Second Law Enforcement Tests**: Asserts that any state vector attempting to pass an `entropyGenerationRate < 0` immediately triggers a `ThermodynamicViolationError`.
* **Gouy-Stodola Consistency Checks**: Validates that `exergyDestructionRate === referenceTemperature * entropyGenerationRate` across randomized simulation scenarios.
* **Solar-Driven Conservation**: Confirms closed-system mass conservation alongside strictly controlled solar-only external energy influxes.