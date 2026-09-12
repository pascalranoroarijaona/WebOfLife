/**
 * Thermodynamic State Vector Validation Wrapper (Sprint 028)
 * Provides validation helper functions that assert required property existence
 * and non-negative entropy fields prior to monad step executions.
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
let ElementalStocks = (() => {
    let _classDecorators = [dataclassDecorator];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ElementalStocks = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ElementalStocks = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        carbon;
        nitrogen;
        phosphorus;
        water;
        constructor(carbon, nitrogen, phosphorus, water) {
            this.carbon = carbon;
            this.nitrogen = nitrogen;
            this.phosphorus = phosphorus;
            this.water = water;
        }
        add(other) {
            return new ElementalStocks(this.carbon + other.carbon, this.nitrogen + other.nitrogen, this.phosphorus + other.phosphorus, this.water + other.water);
        }
        subtract(other) {
            return new ElementalStocks(this.carbon - other.carbon, this.nitrogen - other.nitrogen, this.phosphorus - other.phosphorus, this.water - other.water);
        }
        isNonNegative() {
            return (this.carbon >= 0.0 &&
                this.nitrogen >= 0.0 &&
                this.phosphorus >= 0.0 &&
                this.water >= 0.0);
        }
    };
    return ElementalStocks = _classThis;
})();
export { ElementalStocks };
function dataclassDecorator(constructor) {
    return class extends constructor {
        constructor(...args) {
            super(...args);
        }
    };
}
export class ThermodynamicLedger {
    totalEntropy;
    totalDissipatedHeat;
    initialSystemMass;
    constructor(totalEntropy = 0.0, totalDissipatedHeat = 0.0, initialSystemMass = null) {
        this.totalEntropy = totalEntropy;
        this.totalDissipatedHeat = totalDissipatedHeat;
        this.initialSystemMass = initialSystemMass;
    }
    recordDissipation(joules, ambientTemp = STANDARD_AMBIENT_TEMPERATURE_K) {
        if (joules < 0) {
            throw new Error("Dissipated heat cannot be negative.");
        }
        const deltaS = joules / ambientTemp;
        this.totalEntropy += deltaS;
        this.totalDissipatedHeat += joules;
    }
    auditMassConservation(currentMass) {
        if (this.initialSystemMass === null) {
            this.initialSystemMass = currentMass;
            return 0.0;
        }
        const diff = Math.abs(currentMass.carbon - this.initialSystemMass.carbon) +
            Math.abs(currentMass.nitrogen - this.initialSystemMass.nitrogen) +
            Math.abs(currentMass.phosphorus - this.initialSystemMass.phosphorus) +
            Math.abs(currentMass.water - this.initialSystemMass.water);
        return Number(diff);
    }
}
export class SpatialNode {
    coordinates;
    carryingCapacity;
    constructor(coordinates, carryingCapacity) {
        this.coordinates = coordinates;
        this.carryingCapacity = carryingCapacity;
    }
}
export class BiomePatch extends SpatialNode {
    nutrientPool;
    constructor(coordinates, carryingCapacity, initialPool) {
        super(coordinates, carryingCapacity);
        this.nutrient_pool = initialPool;
        this.nutrientPool = initialPool;
    }
    get nutrient_pool() {
        return this.nutrientPool;
    }
    set nutrient_pool(val) {
        this.nutrientPool = val;
    }
    queryNutrients() {
        return this.nutrientPool;
    }
    consumeNutrients(demand) {
        const fulfilled = new ElementalStocks(Math.min(this.nutrientPool.carbon, demand.carbon), Math.min(this.nutrientPool.nitrogen, demand.nitrogen), Math.min(this.nutrientPool.phosphorus, demand.phosphorus), Math.min(this.nutrientPool.water, demand.water));
        this.nutrientPool = this.nutrientPool.subtract(fulfilled);
        return fulfilled;
    }
    depositCarcass(carcassStocks) {
        this.nutrientPool = this.nutrientPool.add(carcassStocks);
    }
}
export class DetritivoreMonad {
    static scavenge(carcass, patch, ledger) {
        const assimilationEfficiency = 0.15;
        const assimilated = new ElementalStocks(carcass.carbon * assimilationEfficiency, carcass.nitrogen * assimilationEfficiency, carcass.phosphorus * assimilationEfficiency, carcass.water * assimilationEfficiency);
        const residue = carcass.subtract(assimilated);
        const energyReleasedJoules = carcass.carbon * 10.5;
        ledger.recordDissipation(energyReleasedJoules);
        patch.depositCarcass(residue);
        return [assimilated, residue];
    }
}
export class ThermodynamicStateValidator {
    validateStateVector(state) {
        if (!state)
            return false;
        const entropy = state.entropy ?? state.totalEntropy ?? state.systemEntropy;
        const sGen = state.entropyGenerationRate;
        if (entropy === undefined || entropy === null || Number.isNaN(entropy))
            return false;
        if (sGen !== undefined && sGen < 0)
            return false;
        return true;
    }
    assertNonNegativeEntropy(state) {
        if (!this.validateStateVector(state)) {
            throw new Error("Thermodynamic State Validation Failed: Invalid or negative entropy/entropy generation detected.");
        }
        const entropy = state.entropy ?? state.totalEntropy ?? 0;
        const sGen = state.entropyGenerationRate ?? 0;
        if (entropy < 0 || sGen < 0) {
            throw new Error(`Second Law Violation: Entropy (${entropy}) or Entropy Generation Rate (${sGen}) must be non-negative.`);
        }
    }
}
export const STATE_VALIDATOR = new ThermodynamicStateValidator();
