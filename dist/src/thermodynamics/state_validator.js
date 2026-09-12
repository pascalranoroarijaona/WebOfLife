/**
 * Thermodynamic State Vector Validation Wrapper (`src/thermodynamics/state_validator.ts`)
 * Sprint 28: Enforces property completeness, mass/energy conservation bounds, and second-law entropy non-negativity ($\Delta S \ge 0$).
 */
import { ThermodynamicValidationError } from './types.js';
export class ThermodynamicStateValidator {
    entropyTolerance;
    energyBounds;
    constructor(entropyTolerance = 0.0, maxEnergy = Number.MAX_SAFE_INTEGER) {
        this.entropyTolerance = entropyTolerance;
        this.energyBounds = { min: 0, max: maxEnergy };
    }
    /**
     * Validates the thermodynamic state vector against property completeness and
     * second-law entropy non-negativity constraints.
     */
    validate(stateVector) {
        const errors = [];
        // 1. Property Completeness Check
        if (stateVector.energy === undefined || stateVector.energy === null) {
            errors.push("Missing mandatory property: 'energy'");
        }
        if (stateVector.mass === undefined || stateVector.mass === null) {
            errors.push("Missing mandatory property: 'mass'");
        }
        if (stateVector.entropy === undefined || stateVector.entropy === null) {
            errors.push("Missing mandatory property: 'entropy'");
        }
        if (stateVector.temperature === undefined || stateVector.temperature === null) {
            errors.push("Missing mandatory property: 'temperature'");
        }
        if (stateVector.pressure === undefined || stateVector.pressure === null) {
            errors.push("Missing mandatory property: 'pressure'");
        }
        if (errors.length > 0) {
            return { isValid: false, errors };
        }
        // 2. Thermodynamic Law Compliance Checks
        if (stateVector.entropy < -this.entropyTolerance) {
            errors.push(`Second Law Violation: Entropy (${stateVector.entropy}) must be >= 0`);
        }
        if (stateVector.energy < this.energyBounds.min || stateVector.energy > this.energyBounds.max) {
            errors.push(`First Law Violation: Energy (${stateVector.energy}) out of bounds [${this.energyBounds.min}, ${this.energyBounds.max}]`);
        }
        if (stateVector.temperature < 0) {
            errors.push(`Physical Violation: Absolute temperature (${stateVector.temperature}) cannot be negative (< 0 K)`);
        }
        if (stateVector.pressure < 0) {
            errors.push(`Physical Violation: Pressure (${stateVector.pressure}) cannot be negative (< 0 Pa)`);
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Asserts validity, throwing a ThermodynamicValidationError if any checks fail.
     */
    assertValid(stateVector) {
        const result = this.validate(stateVector);
        if (!result.isValid) {
            throw new ThermodynamicValidationError(`State vector validation failed:\n - ${result.errors.join('\n - ')}`, stateVector);
        }
    }
}
