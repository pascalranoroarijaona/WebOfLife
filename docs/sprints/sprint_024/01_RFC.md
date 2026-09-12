# RFC 024: Thermodynamic State Vector Interface Contracts (`src/thermodynamics/types.ts`)

**Status:** Draft / Proposed  
**Author:** Chief Systems Architect  
**Date:** Current Sprint Cycle (Sprint 24)  
**Target Module:** `src/thermodynamics/types.ts`  

---

## 1. Executive Summary & Sprint Goal

Sprint 24 formalizes the strict TypeScript interface contracts for thermodynamic state vectors, entropy generation rates ($\dot{S}_{\text{gen}}$), exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux array structures within the Web of Life framework. 

Adhering strictly to the **First Law** (conservation of total energy/matter) and the **Second Law** of thermodynamics (irreversibility and non-negative entropy generation $\dot{S}_{\text{gen}} \ge 0$), this specification establishes robust typing for monad stock transitions, boundary heat/mass/radiation exchanges, and thermodynamic potential calculations.

---

## 2. Thermodynamic First & Second Law Compliance

1. **First Law of Thermodynamics (Conservation):**
   $$\frac{dE_{\text{system}}}{dt} = \sum \dot{Q}_i - \sum \dot{W}_i + \sum \dot{m}_{\text{in}} h_{\text{in}} - \sum \dot{m}_{\text{out}} h_{\text{out}}$$
   Within our monad system, matter and energy are strictly conserved across system boundaries. Solar input is the sole external driving potential; net accumulation equals incoming minus outgoing fluxes plus internal conversions without spontaneous generation of mass-energy.

2. **Second Law of Thermodynamics (Entropy Generation & Exergy Destruction):**
   $$\dot{S}_{\text{gen}} = \frac{dS_{\text{system}}}{dt} - \sum \left( \frac{\dot{Q}_k}{T_k} \right) - \sum_{\text{in}} \dot{m}_{\text{in}} s_{\text{in}} + \sum_{\text{out}} \dot{m}_{\text{out}} s_{\text{out}} \ge 0$$
   $$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$
   Every state vector transition must evaluate $\dot{S}_{\text{gen}}$ and ensure it is non-negative. Exergy destruction ($\dot{I}$) quantifies the thermodynamic imperfection (dissipation) of biochemical and biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water).

---

## 3. Class Hierarchy Additions & Composition

Building upon previous sprints (`src/thermodynamic_structure.ts`, `src/thermodynamics/thermodynamic_structure.ts`), Sprint 24 formalizes the interface contracts consumed by thermodynamic calculation engines (`src/thermodynamics/methods.ts` and `src/thermodynamics/thermodynamic_monad_process.ts`).

```
+-------------------------------------------------------------<interface>-------------------------------------------------------------+
|                                                      IThermodynamicStateVector                                                      |
| - temperature: number (K)                                                                                                           |
| - pressure: number (Pa)                                                                                                             |
| - specificEntropy: number (J/(kg·K))                                                                                                |
| - specificEnthalpy: number (J/kg)                                                                                                   |
| - exergy: number (J/kg)                                                                                                             |
+-------------------------------------------------------------------------------------------------------------------------------------+
                                                                   ▲
                                                                   │ implements / extends
                                                                   │
+-------------------------------------------------------------<interface>-------------------------------------------------------------+
|                                                         IBoundaryFluxArray                                                          |
| - heatFluxes: IHeatFlux[]                                                                                                           |
| - massFluxes: IMassFlux[]                                                                                                           |
| - radiationFluxes: IRadiationFlux[]                                                                                                 |
| - netEntropyFlux: number (W/K)                                                                                                      |
+-------------------------------------------------------------------------------------------------------------------------------------+
                                                                   ▲
                                                                   │ composition
                                                                   │
+-------------------------------------------------------------<interface>-------------------------------------------------------------+
|                                                      IThermodynamicProcessResult                                                    |
| - entropyGenerationRate: number (W/K, S_gen >= 0)                                                                                   |
| - exergyDestructionRate: number (W, I = T_0 * S_gen)                                                                                |
| - boundaryFluxes: IBoundaryFluxArray                                                                                                |
| - updatedStockValues: Record<string, number>                                                                                        |
+-------------------------------------------------------------------------------------------------------------------------------------+
```

---

## 4. Formal TypeScript Specifications (`src/thermodynamics/types.ts`)

Below is the definitive interface specification to be implemented in `src/thermodynamics/types.ts`:

```typescript
/**
 * @file src/thermodynamics/types.ts
 * @description Formal TypeScript interfaces for Thermodynamic State Vectors, 
 * Entropy Generation Rates (S_dot_gen), Exergy Destruction (I), and Boundary Flux Arrays.
 * Strict compliance with First and Second Laws of Thermodynamics.
 */

/**
 * Represents the fundamental thermodynamic state vector of a monad or subsystem.
 */
export interface IThermodynamicStateVector {
    /** Absolute temperature in Kelvin (K). Must be > 0. */
    temperature: number;
    
    /** System pressure in Pascals (Pa). Must be > 0. */
    pressure: number;
    
    /** Specific entropy in J/(kg·K). */
    specificEntropy: number;
    
    /** Specific enthalpy in J/kg. */
    specificEnthalpy: number;
    
    /** Specific exergy relative to environmental reference state T0, P0 in J/kg. */
    specificExergy: number;

    /** Chemical potential vector for tracked species (C, N, P, H2O) in J/mol. */
    chemicalPotentials?: Record<string, number>;
}

/**
 * Represents a discrete thermal boundary heat transfer flux.
 */
export interface IHeatFlux {
    /** Rate of heat transfer in Watts (W). Positive into system, negative out. */
    rate: number;
    
    /** Absolute boundary temperature at the point of heat transfer in Kelvin (K). */
    boundaryTemperature: number;
}

/**
 * Represents mass transfer crossing system boundaries carrying energy, enthalpy, and entropy.
 */
export interface IMassFlux {
    /** Species identifier (e.g., 'H2O', 'CO2', 'NO3', 'PO4'). */
    species: string;
    
    /** Mass flow rate in kg/s. Positive for inflow, negative for outflow. */
    massFlowRate: number;
    
    /** Specific enthalpy of the flowing mass stream in J/kg. */
    specificEnthalpy: number;
    
    /** Specific entropy of the flowing mass stream in J/(kg·K). */
    specificEntropy: number;
}

/**
 * Represents radiative energy exchange across system boundaries (e.g., solar input, terrestrial outgoing).
 */
export interface IRadiationFlux {
    /** Radiative power in Watts (W). */
    power: number;
    
    /** Effective blackbody temperature of the radiation source/sink in Kelvin (K). */
    sourceTemperature: number;
    
    /** Wavelength band or radiation type ('solar_shortwave', 'terrestrial_longwave'). */
    bandType: 'solar_shortwave' | 'terrestrial_longwave';
}

/**
 * Comprehensive boundary flux array aggregating all energy and mass crossings.
 */
export interface IBoundaryFluxArray {
    /** Array of thermal conduction/convection heat fluxes. */
    heatFluxes: IHeatFlux[];
    
    /** Array of advective mass fluxes. */
    massFluxes: IMassFlux[];
    
    /** Array of radiative fluxes (ensuring solar input tracking). */
    radiationFluxes: IRadiationFlux[];
    
    /** Net entropy transfer rate across boundaries due to heat and mass: \sum (Q_k / T_k) + \sum (m_in s_in) - \sum (m_out s_out) in W/K. */
    netEntropyTransferRate: number;
}

/**
 * Thermodynamic evaluation result for a monad process step.
 * Enforces Second Law validation: entropyGenerationRate >= 0.
 */
export interface IThermodynamicProcessResult {
    /** 
     * Internal entropy generation rate S_gen_dot in W/K. 
     * INVARIANT: entropyGenerationRate >= 0 (Second Law of Thermodynamics).
     */
    entropyGenerationRate: number;

    /** 
     * Exergy destruction rate I in Watts (W). 
     * Calculated as I = T_0 * S_gen_dot, where T_0 is environmental reference temperature.
     * INVARIANT: exergyDestructionRate >= 0.
     */
    exergyDestructionRate: number;

    /** Environmental reference temperature T_0 used for exergy calculations in Kelvin (K). */
    referenceTemperature: number;

    /** Boundary flux array detailing all energy and mass interactions during the step. */
    boundaryFluxes: IBoundaryFluxArray;

    /** Updated thermodynamic state vector after monad process transition. */
    resultingState: IThermodynamicStateVector;

    /** Resulting stock levels for biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water). */
    updatedStockValues: Record<string, number>;
}

/**
 * Validation helper type signature for thermodynamic process verification.
 */
export type IThermodynamicValidator = (result: IThermodynamicProcessResult) => boolean;
```

---

## 5. Monad Stock Transitions & Integration with Biogeochemical Cycles

The thermodynamic state vector interfaces integrate directly with existing cycle implementations (`src/cycles/carbon.ts`, `src/cycles/nitrogen.ts`, `src/cycles/phosphorus.ts`, `src/cycles/water.ts`):

1. **Carbon Cycle:** Photosynthesis and respiration fluxes map into `IMassFlux` entries ($CO_2$, biomass), where solar radiation drives endergonic carbon fixation ($\Delta G > 0$), balanced by entropy generation.
2. **Water Cycle:** Evaporation, precipitation, and transpiration track latent heat fluxes and mass enthalpy/entropy transport.
3. **Nitrogen & Phosphorus Cycles:** Mineralization, assimilation, and fixation reactions update chemical potential vectors and compute internal dissipation ($\dot{I}$).

---

## 6. Verification and Test Plan

- **Unit Tests (`tests/sprint_024.test.ts`):**
  1. Verify that any `IThermodynamicProcessResult` instantiated with `entropyGenerationRate < 0` triggers a validation error (Second Law violation check).
  2. Verify correct computation of exergy destruction rate $\dot{I} = T_0 \dot{S}_{\text{gen}}$.
  3. Validate boundary flux summation against First Law energy balance closure.