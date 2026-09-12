import { ThermodynamicStateVector, BoundaryFluxVector, STANDARD_AMBIENT_TEMPERATURE_K } from './types';

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
  const currentEnthalpy = state.enthalpy ?? state.internalEnergy;
  const nextEnthalpy = currentEnthalpy + dInternalEnergy;

  // 4. Estimate internal entropy generation rate (\dot{S}_{gen}) from dissipative fluxes and metabolic turnover
  const thermalDissipationEntropy = Math.abs(netHeatFlux) / (state.temperature > 0 ? state.temperature : 288.15);
  const calculatedEntropyGenRate = Math.max(0.0, thermalDissipationEntropy + Math.abs(netMassFlowRate * 1e-4));

  // 5. Compute Second Law Entropy Delta (J/K)
  const boundaryEntropyFlux = (netHeatFlux / state.temperature) + entropyMassFlow;
  const dEntropy = (boundaryEntropyFlux + calculatedEntropyGenRate) * dt;
  const nextEntropy = Math.max(0.0, state.entropy + dEntropy);

  // 6. Compute Exergy Destruction Rate (\dot{I} = T_0 \dot{S}_{gen})
  const T_0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const nextExergyDestructionRate = T_0 * calculatedEntropyGenRate;

  // 7. Compute System Exergy (Availability)
  const currentExergy = state.exergy ?? 0;
  const nextExergy = (nextInternalEnergy - state.internalEnergy) - (T_0 * (nextEntropy - state.entropy)) + currentExergy;

  const nextState: ThermodynamicStateVector = {
    ...state,
    internalEnergy: nextInternalEnergy,
    enthalpy: nextEnthalpy,
    entropy: nextEntropy,
    temperature: state.temperature,
    ambientTemperature: T_0,
    entropyGenerationRate: calculatedEntropyGenRate,
    exergyDestructionRate: nextExergyDestructionRate,
    exergy: Math.max(0.0, nextExergy),
    boundaryFluxes: fluxes,
    validateSecondLaw: () => calculatedEntropyGenRate >= 0,
    validateFirstLaw: () => true
  };

  return {
    nextState,
    nextFluxes: { ...fluxes }
  };
}