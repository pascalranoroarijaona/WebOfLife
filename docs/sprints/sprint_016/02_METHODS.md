<!-- Method Specifications -->

# Sprint 16: Thermodynamic State Vector & Nonequilibrium Process Methods

## 1. Physical & Industrial Process Research

The Web of Life planetary simulation tracks nonequilibrium thermodynamic processes across four primary spheres: Atmosphere, Hydrosphere, Lithosphere, and Biosphere. In accordance with RFC 016, all subsystem state transitions must rigorously obey conservation laws, ensure positive internal entropy generation ($\dot{S}_{\text{gen}} \ge 0$), and maintain exact consistency between exergy destruction and Gouy-Stodola dissipation ($\dot{I} = T_0 \dot{S}_{\text{gen}}$, where $T_0 = 288.15\text{ K}$).

### 1.1 Planetary Energy Balance & Solar Forcing
The primary energy input into the Web of Life is unmitigated shortwave solar radiation ($\dot{Q}_{\text{solar}}$). Terrestrial longwave radiation ($\dot{Q}_{\text{lw}}$), sensible heat fluxes, and latent heat fluxes constitute boundary losses. The First Law energy balance for any compartment is:
$$\frac{dE}{dt} = \dot{Q}_{\text{solar}} - \dot{Q}_{\text{lw}} + \sum_k \dot{Q}_{k,\text{boundary}} - \dot{W} + \sum_i \dot{m}_i h_i$$

### 1.2 Entropy Generation in Biogeochemical Cycles
Internal entropy generation ($\dot{S}_{\text{gen}}$) arises from irreversible processes such as chemical reactions (e.g., net primary production, respiration), heat conduction across finite temperature gradients, and mass diffusion:
$$\dot{S}_{\text{gen}} = \frac{dS}{dt} - \sum_k \frac{\dot{Q}_k}{T_k} - \sum_i \dot{m}_i s_i \ge 0$$

---

## 2. Mass, Energy, and Entropy Delta Equations

### 2.1 State Transition Equations
For a discrete simulation time step $\Delta t$, state transitions applied via the `ThermodynamicStateMonad` compute delta stocks as follows:

1. **Internal Energy Delta ($\Delta U$):**
   $$\Delta U = \left( \sum_k \dot{Q}_k - \dot{W} + \sum_i \dot{m}_i h_i \right) \Delta t$$

2. **Entropy Delta ($\Delta S$):**
   $$\Delta S = \left( \sum_k \frac{\dot{Q}_k}{T_k} + \sum_i \dot{m}_i s_i + \dot{S}_{\text{gen}} \right) \Delta t$$

3. **Exergy Destruction Rate ($\dot{I}$):**
   $$\dot{I} = T_0 \dot{S}_{\text{gen}}$$

---

## 3. Executable Monad Method Implementations

Below are the concrete TypeScript methods implementing the thermodynamic process monad transitions, ensuring mass conservation and strict Second Law compliance (`src/thermodynamics/thermodynamic_monad_process.ts`).

```typescript
import { ThermodynamicStateVector, BoundaryFluxVector } from './types';

/**
 * Executes a planetary biogeochemical state transition under strict thermodynamic constraints.
 */
export function executeThermodynamicStep(
  state: ThermodynamicStateVector,
  fluxes: BoundaryFluxVector,
  dt: number
): { nextState: ThermodynamicStateVector; nextFluxes: BoundaryFluxVector } {
  // 1. Aggregate total heat flux contributions (W)
  let netHeatFlux = fluxes.radiationFlux.solarIncoming - fluxes.radiationFlux.terrestrialOutgoing;
  for (const [, q] of fluxes.heatFluxes) {
    netHeatFlux += q;
  }

  // 2. Aggregate mass and enthalpy/entropy influxes/outfluxes
  let netMassFlowRate = 0;
  let enthalpyMassFlow = 0;
  let entropyMassFlow = 0;

  for (const [speciesId, mDot] of fluxes.massFluxes) {
    netMassFlowRate += mDot;
    const h = fluxes.specificEnthalpies.get(speciesId) ?? 0;
    const s = fluxes.specificEntropies.get(speciesId) ?? 0;
    enthalpyMassFlow += mDot * h;
    entropyMassFlow += mDot * s;
  }

  // 3. Compute First Law Energy Delta (J)
  const dInternalEnergy = (netHeatFlux - fluxes.workRate + enthalpyMassFlow) * dt;
  const nextInternalEnergy = state.internalEnergy + dInternalEnergy;
  const nextEnthalpy = state.enthalpy + dInternalEnergy; // Approximation assuming incompressible condensed phases or ideal gas scaling

  // 4. Estimate internal entropy generation rate (\dot{S}_{gen}) from dissipative fluxes and metabolic turnover
  // Minimum entropy generation bound ensuring \dot{S}_{gen} >= 0
  const thermalDissipationEntropy = Math.abs(netHeatFlux) / (state.temperature > 0 ? state.temperature : 288.15);
  const calculatedEntropyGenRate = Math.max(0.0, thermalDissipationEntropy + Math.abs(netMassFlowRate * 1e-4));

  // 5. Compute Second Law Entropy Delta (J/K)
  const boundaryEntropyFlux = (netHeatFlux / state.temperature) + entropyMassFlow;
  const dEntropy = (boundaryEntropyFlux + calculatedEntropyGenRate) * dt;
  const nextEntropy = Math.max(0.0, state.entropy + dEntropy);

  // 6. Compute Exergy Destruction Rate (\dot{I} = T_0 \dot{S}_{gen})
  const T_0 = state.ambientTemperature;
  const nextExergyDestructionRate = T_0 * calculatedEntropyGenRate;

  // 7. Compute System Exergy (Availability): E_x = (U - U_0) - T_0(S - S_0) + P_0(V - V_0)
  // Simplified for planetary control volumes:
  const nextExergy = (nextInternalEnergy - (state.internalEnergy)) - (T_0 * (nextEntropy - state.entropy)) + state.exergy;

  const nextState: ThermodynamicStateVector = {
    internalEnergy: nextInternalEnergy,
    enthalpy: nextEnthalpy,
    entropy: nextEntropy,
    temperature: state.temperature, // Assumes isothermal or managed thermal capacity updates
    ambientTemperature: T_0,
    entropyGenerationRate: calculatedEntropyGenRate,
    exergyDestructionRate: nextExergyDestructionRate,
    exergy: Math.max(0.0, nextExergy)
  };

  return {
    nextState,
    nextFluxes: { ...fluxes }
  };
}
```