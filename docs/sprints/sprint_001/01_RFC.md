# RFC 001: Abstract ThermodynamicStructure & Strict Thermodynamic State Interfaces

**Status:** Draft | **Sprint:** 1 | **Author:** Chief Systems Architect  
**Target Files:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`

---

## 1. Executive Summary
This RFC establishes the foundational thermodynamic contract for the Web of Life simulation engine. In strict compliance with the **First and Second Laws of Thermodynamics** (mass-energy conservation and unidirectional entropy generation powered exclusively by external solar input), this specification introduces:
1. **Strict Thermodynamic State Interfaces** (`src/thermodynamics/types.ts`) defining absolute energetic, entropic, and exergic metrics.
2. **The Abstract `ThermodynamicStructure` Base Class** (`src/thermodynamics/thermodynamic_structure.ts`) enforcing open-system steady-state maintenance, free-energy imports, entropy exports, and exergy destruction tracking.

---

## 2. Thermodynamic First & Second Law Compliance
- **First Law (Conservation of Energy):** Total energy within any closed control volume $CV$ equates to internal energy changes balanced exactly by boundary fluxes:
  $$\frac{dU}{dt} = \dot{Q}_{in} - \dot{W}_{out} + \sum \dot{m}_{in}h_{in} - \sum \dot{m}_{out}h_{out}$$
- **Second Law (Entropy & Exergy):** Entropy change within $CV$ is driven by net heat/mass transfers plus internal irreversible entropy generation ($\dot{S}_{gen} \ge 0$):
  $$\frac{dS}{dt} = \frac{\dot{Q}}{T} + \sum \dot{m}_{in}s_{in} - \sum \dot{m}_{out}s_{out} + \dot{S}_{gen}$$
- **Solar Input Monad:** All external free energy injections ($\dot{Q}_{in}$ or photon flux) must trace back to the primary `SolarSource` monad stock. Spontaneous internal energy generation without external forcing is strictly prohibited.

---

## 3. Interface Contracts (`src/thermodynamics/types.ts`)

```typescript
export interface ThermodynamicState {
  readonly internalEnergy: number;      // Joules (J)
  readonly entropy: number;             // Joules per Kelvin (J/K)
  readonly temperature: number;         // Kelvin (K)
  readonly exergy: number;              // Joules (J) - available work relative to ambient
  readonly ambientTemperature: number;  // Kelvin (K)
}

export interface ThermodynamicFluxes {
  readonly freeEnergyImportRate: number;    // Watts (J/s) - e.g., absorbed solar irradiance
  readonly entropyExportRate: number;       // Watts/Kelvin ((J/s)/K) - thermal radiation/waste heat dissipation
  readonly internalEntropyGenRate: number;  // Watts/Kelvin ((J/s)/K) - irreversible losses ($\dot{S}_{gen} \ge 0$)
  readonly exergyDestructionRate: number;   // Watts (J/s) - Gouy-Stodola theorem: $T_0 \dot{S}_{gen}$
}
```

---

## 4. Class Hierarchy & Architecture (`src/thermodynamics/thermodynamic_structure.ts`)

The `ThermodynamicStructure` abstract class acts as the root structural ancestor for all biotic and abiotic entities in the Web of Life simulation.

```typescript
import { ThermodynamicState, ThermodynamicFluxes } from './types';

export abstract class ThermodynamicStructure implements ThermodynamicState {
  // Protected mutable state for internal engine updates
  protected _internalEnergy: number;
  protected _entropy: number;
  protected _temperature: number;
  protected _ambientTemperature: number;

  constructor(initialEnergy: number, initialEntropy: number, temperature: number, ambientTemperature: number) {
    this._internalEnergy = initialEnergy;
    this._entropy = initialEntropy;
    this._temperature = temperature;
    this._ambientTemperature = ambientTemperature;
  }

  // ThermodynamicState getters
  public get internalEnergy(): number { return this._internalEnergy; }
  public get entropy(): number { return this._entropy; }
  public get temperature(): number { return this._temperature; }
  public get ambientTemperature(): number { return this._ambientTemperature; }
  
  public get exergy(): number {
    // Exergy = (U - U_0) - T_0(S - S_0) (simplified for constant volume/ambient baseline)
    return Math.max(0, (this._internalEnergy - this._ambientTemperature * this._entropy));
  }

  /**
   * Imports free energy (e.g., photons, chemical bonds) into the system.
   * Enforces First Law conservation.
   */
  public abstract importFreeEnergy(joules: number, dt: number): void;

  /**
   * Exports entropy to the external environment via thermal radiation or waste.
   * Enforces Second Law boundary dissipation.
   */
  public abstract exportEntropy(entropyJoulesPerKelvin: number, dt: number): void;

  /**
   * Maintains far-from-equilibrium state by balancing internal dissipation 
   * with boundary fluxes over time step dt.
   */
  public abstract maintainFarFromEquilibrium(dt: number): void;

  /**
   * Computes instantaneous thermodynamic fluxes for telemetry and monitoring.
   */
  public abstract getFluxes(): ThermodynamicFluxes;

  /**
   * Validates Second Law compliance: Internal entropy generation must be non-negative.
   */
  protected validateSecondLaw(entropyGenRate: number): void {
    if (entropyGenRate < 0) {
      throw new Error(`Second Law Violation: Negative entropy generation rate detected (${entropyGenRate}).`);
    }
  }
}
```

---

## 5. Incremental Design & Integration Strategy
1. **Phase 1:** Implement `src/thermodynamics/types.ts` and `src/thermodynamics/thermodynamic_structure.ts`.
2. **Phase 2:** Refactor existing structural nodes (`src/earth_pod.ts`) to inherit from `ThermodynamicStructure`.
3. **Phase 3:** Integrate runtime assertions enforcing $\dot{S}_{gen} \ge 0$ across all simulation tick loops.