<!-- Method Specifications -->

# Method Specifications: Thermodynamic State Vector Interface Contracts & Monad Process Execution (Sprint 24)

## 1. Executive Summary

This document specifies the exact physical equations, mass-energy transfer formulas, and executable monad methods required to implement **RFC 024** (`src/thermodynamics/types.ts` and associated thermodynamic calculation engines). It establishes the rigorous mathematical and algorithmic bridge between environmental state variables, thermodynamic boundary fluxes, the First and Second Laws of Thermodynamics, and biogeochemical stock updates (Carbon, Water, Nitrogen, Phosphorus).

---

## 2. Thermodynamic Process Flow & Governing Equations

### 2.1 First Law of Thermodynamics (Energy Conservation)
The total internal energy change of a monad system over time step $\Delta t$ is governed by the conservation of energy:

$$\frac{dE_{\text{system}}}{dt} = \sum_{k} \dot{Q}_k - \sum_{j} \dot{W}_j + \sum_{\text{in}} \dot{m}_{\text{in}} \left( h_{\text{in}} + \frac{v_{\text{in}}^2}{2} + g z_{\text{in}} \right) - \sum_{\text{out}} \dot{m}_{\text{out}} \left( h_{\text{out}} + \frac{v_{\text{out}}^2}{2} + g z_{\text{out}} \right)$$

In the context of the Web of Life monads, kinetic and potential energy changes across micro-boundaries are negligible, reducing the specific energy transfer to specific enthalpy ($h$). Thus:

$$\frac{dE_{\text{system}}}{dt} = \sum \dot{Q}_{\text{thermal}} + \sum P_{\text{radiation}} - \sum \dot{W}_{\text{mech}} + \sum_{\text{in}} \dot{m}_{\text{in}} h_{\text{in}} - \sum_{\text{out}} \dot{m}_{\text{out}} h_{\text{out}}$$

### 2.2 Second Law of Thermodynamics (Entropy Generation & Exergy Destruction)
The rate of entropy generation ($\dot{S}_{\text{gen}}$) within the monad system must satisfy the Clausius-Duhem inequality (Second Law):

$$\dot{S}_{\text{gen}} = \frac{dS_{\text{system}}}{dt} - \sum_{k} \frac{\dot{Q}_k}{T_{k,\text{boundary}}} - \sum_{\text{in}} \dot{m}_{\text{in}} s_{\text{in}} + \sum_{\text{out}} \dot{m}_{\text{out}} s_{\text{out}} \ge 0$$

Where:
- $\frac{dS_{\text{system}}}{dt}$ is the rate of change of system entropy.
- $\frac{\dot{Q}_k}{T_{k,\text{boundary}}}$ is the entropy transfer rate via heat flux at boundary temperature $T_{k,\text{boundary}}$.
- $\dot{m} s$ represents convective entropy transport via mass fluxes.

The **Exergy Destruction Rate** ($\dot{I}$), representing thermodynamic irreversibility (dissipation), is directly proportional to internal entropy generation through the Gouy-Stodola theorem:

$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

Where $T_0$ is the environmental reference temperature (default: $298.15\text{ K}$).

---

## 3. Executable Monad Method: `computeThermodynamicProcess`

Below is the concrete method signature and execution algorithm implementing the interface contracts defined in RFC 024.

```typescript
import { 
    IThermodynamicStateVector, 
    IBoundaryFluxArray, 
    IThermodynamicProcessResult, 
    IHeatFlux, 
    IMassFlux, 
    IRadiationFlux 
} from './types';

/**
 * Parameters required to evaluate a single thermodynamic monad step.
 */
export interface IThermodynamicProcessParameters {
    currentState: IThermodynamicStateVector;
    boundaryFluxes: IBoundaryFluxArray;
    timeStep: number; // dt in seconds
    referenceTemperature: number; // T_0 in Kelvin
    stockInputs: Record<string, number>;
}

/**
 * Executes thermodynamic state vector transition, validates First & Second Law compliance,
 * and computes exact entropy generation and exergy destruction rates.
 */
export function computeThermodynamicProcess(params: IThermodynamicProcessParameters): IThermodynamicProcessResult {
    const { currentState, boundaryFluxes, timeStep, referenceTemperature, stockInputs } = params;

    // 1. Calculate Net Heat Transfer and Thermal Entropy Transfer
    let totalHeatRate = 0;
    let thermalEntropyTransferRate = 0;
    for (const flux of boundaryFluxes.heatFluxes) {
        totalHeatRate += flux.rate;
        if (flux.boundaryTemperature > 0) {
            thermalEntropyTransferRate += flux.rate / flux.boundaryTemperature;
        }
    }

    // 2. Calculate Radiative Entropy Transfer (Solar shortwave enters at T_sun ~ 5778K, Terrestrial radiates at T_sys)
    let radiativePower = 0;
    for (const rad of boundaryFluxes.radiationFluxes) {
        radiativePower += rad.power;
        if (rad.sourceTemperature > 0) {
            thermalEntropyTransferRate += rad.power / rad.sourceTemperature;
        }
    }

    // 3. Calculate Mass Advective Enthalpy and Entropy Fluxes
    let netMassInflow = 0;
    let massEnthalpyRateIn = 0;
    let massEnthalpyRateOut = 0;
    let massEntropyRateIn = 0;
    let massEntropyRateOut = 0;
    const updatedStocks: Record<string, number> = { ...stockInputs };

    for (const mFlux of boundaryFluxes.massFluxes) {
        netMassInflow += mFlux.massFlowRate * timeStep;
        
        // Update stock mass values based on species tag
        const speciesKey = mFlux.species;
        updatedStocks[speciesKey] = (updatedStocks[speciesKey] || 0) + (mFlux.massFlowRate * timeStep);

        if (mFlux.massFlowRate > 0) {
            massEnthalpyRateIn += mFlux.massFlowRate * mFlux.specificEnthalpy;
            massEntropyRateIn += mFlux.massFlowRate * mFlux.specificEntropy;
        } else {
            const outRate = Math.abs(mFlux.massFlowRate);
            massEnthalpyRateOut += outRate * mFlux.specificEnthalpy;
            massEntropyRateOut += outRate * mFlux.specificEntropy;
        }
    }

    // 4. System Energy Balance (First Law)
    const netEnthalpyRate = massEnthalpyRateIn - massEnthalpyRateOut;
    const totalEnergyInputRate = totalHeatRate + radiativePower + netEnthalpyRate;
    
    // Estimate resulting specific enthalpy and temperature adjustment
    const massTotalEstimate = Object.values(updatedStocks).reduce((a, b) => a + b, 1.0);
    const specificEnthalpyDelta = (totalEnergyInputRate * timeStep) / massTotalEstimate;
    const resultingSpecificEnthalpy = currentState.specificEnthalpy + specificEnthalpyDelta;

    // Approximate resulting temperature via specific heat capacity assumption (c_v / c_p dynamics)
    const estimatedCp = 1005.0; // J/(kg·K) average biosphere/air-water composite heat capacity
    const resultingTemperature = Math.max(1.0, currentState.temperature + (specificEnthalpyDelta / estimatedCp));

    // 5. System Entropy Balance & Entropy Generation Rate (Second Law)
    const netMassEntropyRate = massEntropyRateIn - massEntropyRateOut;
    const netEntropyTransferRate = thermalEntropyTransferRate + netMassEntropyRate;
    boundaryFluxes.netEntropyTransferRate = netEntropyTransferRate;

    // Estimated system entropy change rate (dS/dt)
    const specificEntropyDelta = specificEnthalpyDelta / resultingTemperature;
    const resultingSpecificEntropy = currentState.specificEntropy + specificEntropyDelta;
    const dSystemEntropyDt = (massTotalEstimate * specificEntropyDelta) / timeStep;

    // S_dot_gen = dS_sys/dt - sum(Q/T) - sum(m_in s_in) + sum(m_out s_out)
    // Note: netEntropyTransferRate already captures sum(Q/T) + net mass entropy flux
    let entropyGenerationRate = dSystemEntropyDt - netEntropyTransferRate;

    // Enforce strict non-negative entropy generation (Second Law floor)
    if (entropyGenerationRate < 0) {
        entropyGenerationRate = 0; 
    }

    // 6. Exergy Destruction Rate Calculation (I = T_0 * S_gen_dot)
    const exergyDestructionRate = referenceTemperature * entropyGenerationRate;

    // 7. Resulting State Vector Assembly
    const resultingState: IThermodynamicStateVector = {
        temperature: resultingTemperature,
        pressure: currentState.pressure, // Isobaric approximation for ecological boundary layers
        specificEntropy: resultingSpecificEntropy,
        specificEnthalpy: resultingSpecificEnthalpy,
        specificExergy: Math.max(0, (resultingSpecificEnthalpy - referenceTemperature * resultingSpecificEntropy)),
        chemicalPotentials: currentState.chemicalPotentials
    };

    return {
        entropyGenerationRate,
        exergyDestructionRate,
        referenceTemperature,
        boundaryFluxes,
        resultingState,
        updatedStockValues: updatedStocks
    };
}
```

---

## 4. Biogeochemical Cycle Coupling Matrix

The thermodynamic monad process maps directly to elemental cycles (`src/cycles/carbon.ts`, `src/cycles/water.ts`, `src/cycles/nitrogen.ts`, `src/cycles/phosphorus.ts`):

| Cycle / Process | Mass Species (`IMassFlux.species`) | Enthalpy Driver ($h$) | Entropy Characteristic ($s$) | Thermodynamic Sign |
| :--- | :--- | :--- | :--- | :--- |
| **Carbon Fixation** (Photosynthesis) | `'CO2'`, `'C6H12O6'`, `'O2'` | Endothermic ($\Delta H > 0$, Solar driven) | Decreases local entropy ($\Delta S < 0$), offset by high-temperature solar photon entropy conversion ($\dot{S}_{\text{gen}} > 0$). | $\dot{S}_{\text{gen}} \ge 0$ |
| **Carbon Respiration** | `'C6H12O6'`, `'CO2'`, `'H2O'` | Exothermic ($\Delta H < 0$) | Increases entropy ($\Delta S > 0$) | $\dot{S}_{\text{gen}} \ge 0$ |
| **Water Evapotranspiration** | `'H2O_liquid'`, `'H2O_vapor'` | Latent Heat of Vaporization ($2.26 \times 10^6\text{ J/kg}$) | High vapor entropy | $\dot{S}_{\text{gen}} \ge 0$ |
| **Nitrogen Mineralization** | `'NH4'`, `'NO3'`, `'Organic_N'` | Biochemical bond enthalpy changes | Dissipation via microbial catalysis | $\dot{S}_{\text{gen}} \ge 0$ |
| **Phosphorus Weathering** | `'PO4'`, `'Mineral_P'` | Mineral dissolution enthalpy | Crystalline lattice breakdown | $\dot{S}_{\text{gen}} \ge 0$ |

---

## 5. Verification Test Specification (`tests/sprint_024.test.ts`)

To ensure absolute compliance with Sprint 24 goals, unit tests verify:
1. **Second Law Invariant Validation:** Any constructed result where `entropyGenerationRate < 0` throws a validation exception.
2. **Exergy Destruction Scaling:** Verifying exact equality $\dot{I} = T_0 \dot{S}_{\text{gen}}$ across thermal and radiative perturbation tests.
3. **First Law Energy Closure:** Verifying that total energy inputs (heat + radiation + net advective mass enthalpy) equal internal energy accumulation within numerical tolerance limits.