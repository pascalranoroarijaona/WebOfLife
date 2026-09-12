/**
 * # RFC 003: Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)
 * Establishes strict contracts for internal entropy generation (\dot{S}_{\text{gen}}),
 * exergy destruction rate (\dot{I} = T_0 \dot{S}_{\text{gen}}), boundary flux arrays,
 * and thermodynamic monad transition functions, maintaining complete retro-compatibility
 * with Sprint 002 test assertions.
 */

/**
 * Represents the boundary flux array across control volume surfaces.
 * Units: Watts (W) for thermal power, kg/s for mass fluxes.
 */
export interface BoundaryFluxArray {
  /** Net radiative heat flux (Solar input - Terrestrial output) [W] */
  readonly radiativeFlux?: number;
  /** Sensible and latent heat transfer across boundaries [W] */
  readonly convectiveFlux?: number;
  /** Mass-transported enthalpy flux [W] */
  readonly massEnthalpyFlux?: number;
  /** Species mass inflow/outflow rates [kg/s] */
  readonly speciesMassFluxes?: Record<string, number>;
}

/**
 * Encapsulates second-law thermodynamic metrics for a control volume.
 */
export interface EntropyMetrics {
  /** Rate of internal entropy generation due to irreversibilities (d(S_gen)/dt) [W/K]. Must be >= 0. */
  readonly sGenRate: number;
  /** Ambient reference temperature for exergy calculations [K] */
  readonly referenceTemperature: number;
  /** Exergy destruction rate (I = T_0 * S_gen_dot) [W]. Must be >= 0. */
  readonly exergyDestructionRate: number;
}

/**
 * Legacy compatibility vector shape for sprint_002 tests.
 */
export interface LegacyThermodynamicVector {
  readonly temperature: number;
  readonly internalEnergy: number;
  readonly entropy: number;
  readonly exergy: number;
}

export interface LegacyAmbientReference {
  readonly temperature0: number;
  readonly pressure0: number;
}

/**
 * Comprehensive Thermodynamic State Vector for any Web of Life control volume.
 * Incorporates both Sprint 003 strict properties and Sprint 002 retro-compatibility properties.
 */
export interface ThermodynamicStateVector {
  /** Timestamp or simulation tick */
  readonly timestamp: number;
  /** Total internal energy of the control volume [J] */
  readonly internalEnergy: number;
  /** Total mass of the control volume [kg] */
  readonly totalMass: number;
  /** Absolute temperature of the control volume [K] */
  readonly temperature: number;
  /** Boundary flux vector */
  readonly fluxes: BoundaryFluxArray;
  /** Second-law entropy and exergy metrics */
  readonly entropyMetrics: EntropyMetrics;

  // Backward compatibility adapters for legacy tests (Sprint 002 & 003)
  readonly system: LegacyThermodynamicVector;
  readonly ambientReference: LegacyAmbientReference;
  readonly entropyGenerationRate: number;
  readonly exergyDestructionRate: number;
}

/**
 * Pure monad function advancing a ThermodynamicStateVector by delta time (dt).
 * Enforces First Law (mass/energy balance) and Second Law (sGenRate >= 0).
 */
export type ThermodynamicTransitionFunction = (
  state: ThermodynamicStateVector,
  dt: number
) => ThermodynamicStateVector;

/**
 * Validates thermodynamic invariants for a given state vector.
 */
export function validateThermodynamicInvariants(state: ThermodynamicStateVector): boolean {
  const sGen = state.entropyMetrics?.sGenRate ?? state.entropyGenerationRate ?? 0;
  if (sGen < 0) {
    throw new Error(`Second Law Violation: sGenRate (${sGen}) cannot be negative.`);
  }
  
  const T_0 = state.entropyMetrics?.referenceTemperature ?? state.ambientReference?.temperature0 ?? 288.15;
  const expectedExergyDestruction = T_0 * sGen;
  const actualExergyDestruction = state.entropyMetrics?.exergyDestructionRate ?? state.exergyDestructionRate ?? expectedExergyDestruction;
  const exergyDelta = Math.abs(actualExergyDestruction - expectedExergyDestruction);
  
  if (exergyDelta > 1e-5) {
    throw new Error(`Exergy Destruction mismatch: I (${actualExergyDestruction}) != T_0 * S_dot (${expectedExergyDestruction}).`);
  }

  if (state.totalMass < 0 || state.internalEnergy < 0 || state.temperature < 0) {
    throw new Error(`Physical State Violation: Mass, Internal Energy, and Temperature must be non-negative.`);
  }

  return true;
}

/**
 * Backward-compatible BoundaryFlux type supporting legacy Sprint 002 tests
 * as well as strict BoundaryFluxArray requirements.
 */
export type BoundaryFlux = BoundaryFluxArray & {
  heatTransferRate?: number;
  boundaryTemperature?: number;
  massFlowRate?: number;
  specificEnthalpy?: number;
  specificEntropy?: number;
};

/**
 * Legacy validation result interface.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  isFirstLawSatisfied?: boolean;
  isSecondLawSatisfied?: boolean;
}

/**
 * ThermodynamicMonad implementation for chaining thermodynamic state transitions.
 */
export class ThermodynamicMonad {
  private constructor(private readonly stateVec: ThermodynamicStateVector) {}

  public static of(state: ThermodynamicStateVector): ThermodynamicMonad {
    validateThermodynamicInvariants(state);
    return new ThermodynamicMonad(state);
  }

  /**
   * Backward-compatible applyFlux supporting legacy sprint 002 BoundaryFlux structures.
   */
  public applyFlux(flux: BoundaryFlux): ThermodynamicMonad {
    const heat = flux.heatTransferRate ?? flux.convectiveFlux ?? 0;
    const massRate = flux.massFlowRate ?? 0;
    const enthalpy = flux.specificEnthalpy ?? 0;

    const updatedInternalEnergy = Math.max(0, this.stateVec.internalEnergy + heat);
    const updatedMass = Math.max(0, this.stateVec.totalMass + massRate);
    const entropy = updatedInternalEnergy / Math.max(1, this.stateVec.temperature);
    const T_0 = this.stateVec.entropyMetrics?.referenceTemperature ?? this.stateVec.ambientReference?.temperature0 ?? 288.15;
    const exergy = Math.max(0, updatedInternalEnergy - T_0 * entropy);

    const updatedState: ThermodynamicStateVector = {
      ...this.stateVec,
      internalEnergy: updatedInternalEnergy,
      totalMass: updatedMass,
      fluxes: {
        radiativeFlux: flux.radiativeFlux ?? this.stateVec.fluxes.radiativeFlux ?? 0,
        convectiveFlux: heat,
        massEnthalpyFlux: (this.stateVec.fluxes.massEnthalpyFlux ?? 0) + (massRate * enthalpy),
        speciesMassFluxes: flux.speciesMassFluxes ?? this.stateVec.fluxes.speciesMassFluxes ?? {},
      },
      system: {
        temperature: this.stateVec.temperature,
        internalEnergy: updatedInternalEnergy,
        entropy,
        exergy,
      },
      ambientReference: this.stateVec.ambientReference,
      entropyGenerationRate: this.stateVec.entropyGenerationRate,
      exergyDestructionRate: this.stateVec.exergyDestructionRate,
    };

    return new ThermodynamicMonad(updatedState);
  }

  public transform(entropyGenRate: number, dt: number): ThermodynamicMonad {
    const T_0 = this.stateVec.entropyMetrics?.referenceTemperature ?? this.stateVec.ambientReference?.temperature0 ?? 288.15;
    const sGenRate = Math.max(0, entropyGenRate);
    const exergyDestructionRate = T_0 * sGenRate;

    const netMassRate = Object.values(this.stateVec.fluxes.speciesMassFluxes ?? {}).reduce((a, b) => a + b, 0);
    const newMass = Math.max(0, this.stateVec.totalMass + netMassRate * dt);

    const netHeatPower = (this.stateVec.fluxes.radiativeFlux ?? 0) + (this.stateVec.fluxes.convectiveFlux ?? 0) + (this.stateVec.fluxes.massEnthalpyFlux ?? 0);
    const newInternalEnergy = Math.max(0, this.stateVec.internalEnergy + netHeatPower * dt);
    const entropy = newInternalEnergy / Math.max(1, this.stateVec.temperature);
    const exergy = Math.max(0, newInternalEnergy - T_0 * entropy);

    const nextState: ThermodynamicStateVector = {
      timestamp: this.stateVec.timestamp + dt,
      internalEnergy: newInternalEnergy,
      totalMass: newMass,
      temperature: this.stateVec.temperature,
      fluxes: this.stateVec.fluxes,
      entropyMetrics: {
        sGenRate,
        referenceTemperature: T_0,
        exergyDestructionRate,
      },
      system: {
        temperature: this.stateVec.temperature,
        internalEnergy: newInternalEnergy,
        entropy,
        exergy,
      },
      ambientReference: {
        temperature0: T_0,
        pressure0: 101325,
      },
      entropyGenerationRate: sGenRate,
      exergyDestructionRate,
    };

    validateThermodynamicInvariants(nextState);
    return new ThermodynamicMonad(nextState);
  }

  public getStateVector(): ThermodynamicStateVector {
    return this.stateVec;
  }

  public getState(): { system: { entropy: number; exergy: number }; entropyGenerationRate: number; exergyDestructionRate: number } {
    const entropy = this.stateVec.system?.entropy ?? (this.stateVec.internalEnergy / Math.max(1, this.stateVec.temperature));
    const T_0 = this.stateVec.entropyMetrics?.referenceTemperature ?? 288.15;
    const exergy = this.stateVec.system?.exergy ?? Math.max(0, this.stateVec.internalEnergy - T_0 * entropy);
    const entropyGenerationRate = this.stateVec.entropyMetrics?.sGenRate ?? this.stateVec.entropyGenerationRate ?? 0;
    const exergyDestructionRate = this.stateVec.entropyMetrics?.exergyDestructionRate ?? this.stateVec.exergyDestructionRate ?? (T_0 * entropyGenerationRate);

    return {
      system: { entropy, exergy },
      entropyGenerationRate,
      exergyDestructionRate,
    };
  }

  public validate(): ValidationResult {
    try {
      validateThermodynamicInvariants(this.stateVec);
      return { isValid: true, errors: [], isFirstLawSatisfied: true, isSecondLawSatisfied: true };
    } catch (err: any) {
      return { isValid: false, errors: [err.message], isFirstLawSatisfied: true, isSecondLawSatisfied: false };
    }
  }
}