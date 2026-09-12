import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AbstractThermodynamicStructure } from '../src/thermodynamics/thermodynamic_structure.js';
import { bootstrapMegaPod, EntropyState } from '../src/earth_pod.js';
class DummyThermodynamicStructure extends AbstractThermodynamicStructure {
    importedCount = 0;
    exportedCount = 0;
    maintainedCount = 0;
    constructor(id, temperature = 298.15, mass = 1000.0, ambientTemp = 298.15) {
        super(id, temperature, mass, ambientTemp);
    }
    get structId() {
        return this._id;
    }
    get structTemperature() {
        return this._temperature;
    }
    get structMass() {
        return this._mass;
    }
    get structAmbientTemperature() {
        return this.ambientTemperature;
    }
    get structInternalEnergy() {
        return this._internalEnergy;
    }
    get structEntropy() {
        return this._entropy;
    }
    get structExergy() {
        return this._exergy;
    }
    importFreeEnergy(joules) {
        if (joules < 0)
            throw new Error("Negative energy import");
        this._internalEnergy += joules;
        this.importedCount++;
        return joules;
    }
    exportEntropy(entropyJoulePerKelvin) {
        if (entropyJoulePerKelvin < 0)
            throw new Error("Negative entropy export");
        this._entropy = Math.max(0, this._entropy - entropyJoulePerKelvin);
        this.exportedCount++;
        return entropyJoulePerKelvin;
    }
    maintainFarFromEquilibrium(dt) {
        const genRate = this.computeEntropyGeneration();
        this.validateSecondLaw(genRate);
        this._entropy += genRate * dt;
        this.maintainedCount++;
        return EntropyState.STEADY;
    }
}
describe('RFC 001: ThermodynamicStructure & Strict Thermodynamic State Contracts', () => {
    it('should initialize thermodynamic state variables correctly', () => {
        const dummy = new DummyThermodynamicStructure("test-id", 300, 500, 298.15);
        assert.strictEqual(dummy.structId, "test-id");
        assert.strictEqual(dummy.structTemperature, 300);
        assert.strictEqual(dummy.structMass, 500);
        assert.strictEqual(dummy.structAmbientTemperature, 298.15);
        assert.ok(dummy.structInternalEnergy > 0);
        assert.ok(dummy.structEntropy > 0);
        assert.ok(dummy.structExergy >= 0);
    });
    it('should enforce First Law in importFreeEnergy', () => {
        const dummy = new DummyThermodynamicStructure("test-id", 300, 500, 298.15);
        const initialEnergy = dummy.structInternalEnergy;
        dummy.importFreeEnergy(1000);
        assert.strictEqual(dummy.structInternalEnergy, initialEnergy + 1000);
        assert.strictEqual(dummy.importedCount, 1);
        assert.throws(() => {
            dummy.importFreeEnergy(-500);
        }, /Negative energy import/);
    });
    it('should enforce Second Law in exportEntropy and maintainFarFromEquilibrium', () => {
        const dummy = new DummyThermodynamicStructure("test-id", 300, 500, 298.15);
        dummy.exportEntropy(10);
        assert.strictEqual(dummy.exportedCount, 1);
        assert.throws(() => {
            dummy.exportEntropy(-5);
        }, /Negative entropy export/);
        dummy.maintainFarFromEquilibrium(1.0);
        assert.strictEqual(dummy.maintainedCount, 1);
    });
    it('should compute valid instantaneous thermodynamic fluxes (Gouy-Stodola theorem)', () => {
        const dummy = new DummyThermodynamicStructure("test-id", 300, 500, 298.15);
        const stateVector = dummy.getStateVector();
        const internalEntropyGenRate = stateVector.entropyGenerationRate ?? 0;
        const exergyDestructionRate = stateVector.exergyDestructionRate ?? 0;
        assert.ok(internalEntropyGenRate >= 0);
        assert.ok(exergyDestructionRate >= 0);
        assert.strictEqual(exergyDestructionRate, dummy.structAmbientTemperature * internalEntropyGenRate);
    });
    it('should correctly integrate into planetary EarthPOD and bootstrapMegaPod', () => {
        const { sun, earth } = bootstrapMegaPod();
        assert.ok(sun);
        assert.ok(earth);
        const tickResult = earth.fullTick(1);
        assert.ok(tickResult);
        assert.strictEqual(earth.entropyState, EntropyState.STEADY);
    });
});
