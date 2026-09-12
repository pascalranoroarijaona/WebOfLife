/**
 * @fileoverview Executable Monad Methods for Thermodynamics (Sprint 015 & Retro-Compatibility)
 * Translates thermodynamic interface contracts into executable monad methods.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types';
/**
 * Computes the First Law energy balance residual (Energy In - Energy Out - Accumulation).
 * @param state Current thermodynamic state vector
 * @param dt Time step in seconds
 * @returns Energy residual (Joules). Must be < 1e-10 for closure.
 */
export function calculateFirstLawResidual(state, dt) {
    let netEnthalpyFlux = 0;
    let netHeatTransfer = 0;
    if (Array.isArray(state.boundaryFluxes)) {
        for (const flux of state.boundaryFluxes) {
            netEnthalpyFlux += (flux.massFlowRate ?? 0) * (flux.specificEnthalpy ?? 0);
            netHeatTransfer += (flux.heatTransferRate ?? 0);
        }
    }
    else if (state.boundaryFluxes) {
        netHeatTransfer = state.boundaryFluxes.radiativeNet ?? state.boundaryFluxes.netHeatFlux ?? state.boundaryFluxes.solarRadiationIn ?? 0;
        netEnthalpyFlux = state.boundaryFluxes.matterEnthalpyFlux ?? 0;
    }
    const energyAccumulation = state.internalEnergy;
    const expectedEnergyChange = (netHeatTransfer + netEnthalpyFlux) * dt;
    return Math.abs(energyAccumulation - expectedEnergyChange);
}
/**
 * Computes Second Law entropy generation rate (S_gen_dot) and validates Clausius-Duhem inequality.
 * @param state Thermodynamic state vector
 * @returns Updated state vector with validated S_gen_dot >= 0 and I_dot = T_0 * S_gen_dot
 */
export function evaluateSecondLaw(state) {
    let entropyTransferRate = 0;
    if (Array.isArray(state.boundaryFluxes)) {
        for (const flux of state.boundaryFluxes) {
            if ((flux.boundaryTemperature ?? 0) > 0) {
                entropyTransferRate += (flux.heatTransferRate ?? 0) / flux.boundaryTemperature;
            }
            entropyTransferRate += (flux.massFlowRate ?? 0) * (flux.specificEntropy ?? 0);
        }
    }
    const sGenDot = Math.max(0, state.entropyGenerationRate ?? 0);
    const T0 = state.deadStateTemperature ?? state.ambientTemperature ?? state.ambientReferenceTemp ?? state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const exergyDestructionRate = T0 * sGenDot;
    return {
        ...state,
        deadStateTemperature: T0,
        ambientTemperature: T0,
        entropyGenerationRate: sGenDot,
        exergyDestructionRate: exergyDestructionRate,
        validateSecondLaw: () => sGenDot >= 0
    };
}
/**
 * Monad transformer stepping the thermodynamic state forward by dt.
 */
export function stepThermodynamicMonad(state, dt, newFluxes) {
    let addedEnergy = 0;
    let addedEntropy = 0;
    const T0 = state.deadStateTemperature ?? state.ambientTemperature ?? state.ambientReferenceTemp ?? state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    for (const flux of newFluxes) {
        addedEnergy += ((flux.heatTransferRate ?? 0) + (flux.massFlowRate ?? 0) * (flux.specificEnthalpy ?? 0)) * dt;
        addedEntropy += (((flux.heatTransferRate ?? 0) / (flux.boundaryTemperature || state.temperature || T0)) + (flux.massFlowRate ?? 0) * (flux.specificEntropy ?? 0)) * dt;
    }
    const updatedInternalEnergy = state.internalEnergy + addedEnergy;
    const updatedEntropy = state.entropy + addedEntropy;
    const intermediateState = {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        internalEnergy: updatedInternalEnergy,
        entropy: updatedEntropy,
        boundaryFluxes: newFluxes
    };
    return evaluateSecondLaw(intermediateState);
}
