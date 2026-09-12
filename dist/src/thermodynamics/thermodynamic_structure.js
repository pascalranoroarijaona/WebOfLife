export var EntropyState;
(function (EntropyState) {
    EntropyState["ACCUMULATING"] = "accumulating";
    EntropyState["STEADY"] = "steady";
    EntropyState["DEGRADING"] = "degrading";
    EntropyState["COLLAPSED"] = "collapsed";
})(EntropyState || (EntropyState = {}));
export class Stock {
    substance;
    quantity;
    maxCapacity;
    unit;
    constructor(substance, quantity, maxCapacity, unit = "kg_equivalent_carbon") {
        this.substance = substance;
        this.quantity = quantity;
        this.maxCapacity = maxCapacity;
        this.unit = unit;
    }
    utilization() {
        if (!this.maxCapacity)
            return 0;
        return this.quantity / this.maxCapacity;
    }
}
export class AbstractThermodynamicStructure {
    _id;
    _temperature;
    _mass;
    _ambientTemperature;
    _internalEnergy;
    _entropy;
    _exergy;
    _boundaryFluxes = [];
    lastEntropyGenerationRate = 0.0;
    constructor(id, temperature, mass, ambientTemperature = 288.15) {
        this._id = id;
        this._temperature = temperature;
        this._mass = mass;
        this._ambientTemperature = ambientTemperature;
        this._internalEnergy = mass * 1000 * temperature * 0.5; // Estimated specific heat approx
        this._entropy = this._internalEnergy / Math.max(1, temperature);
        this._exergy = Math.max(0, this._internalEnergy - ambientTemperature * this._entropy);
    }
    get id() {
        return this._id;
    }
    validateSecondLaw(entropyGenerationRate) {
        if (entropyGenerationRate < 0) {
            throw new Error(`Second Law Violation: Internal entropy generation rate (\dot{S}_{gen}) cannot be negative: ${entropyGenerationRate}`);
        }
    }
    updateExergy() {
        const deltaT = this._temperature - this._ambientTemperature;
        this._exergy = Math.max(0, this._internalEnergy - this._ambientTemperature * this._entropy + deltaT * this._mass);
    }
    getStateVector() {
        const sGenRate = Math.max(0, this.computeInternalEntropyGeneration());
        const exergyDest = this._ambientTemperature * sGenRate;
        const entropyMetrics = {
            sGenRate,
            exergyDestruction: exergyDest,
            cumulativeQLoss: sGenRate * 10.0,
            referenceTemperature: this._ambientTemperature,
            exergyDestructionRate: exergyDest
        };
        return {
            timestamp: Date.now(),
            T_0: this._ambientTemperature,
            internalEnergy: this._internalEnergy,
            entropy: this._entropy,
            entropyGenerationRate: sGenRate,
            exergyDestructionRate: exergyDest,
            boundaryHeatFlux: {
                solarIn: 1000,
                infraredOut: -950,
                sensibleLatentFlux: 50
            },
            massInventory: {
                carbon: this._mass * 0.45,
                nitrogen: this._mass * 0.04,
                phosphorus: this._mass * 0.005,
                water: this._mass * 0.5
            },
            temperature: this._temperature,
            ambientTemperature: this._ambientTemperature,
            mass: this._mass,
            totalMass: this._mass,
            exergy: this._exergy,
            entropyMetrics,
            stocks: {
                carbon: this._mass * 0.45,
                nitrogen: this._mass * 0.04,
                phosphorus: this._mass * 0.005,
                oxygen: this._mass * 0.2,
                water: this._mass * 0.3,
                energyStored: this._internalEnergy,
                qLoss: entropyMetrics.cumulativeQLoss
            },
            boundaryFluxes: [...this._boundaryFluxes],
            system: {
                temperature: this._temperature,
                internalEnergy: this._internalEnergy,
                entropy: this._entropy,
                exergy: this._exergy
            },
            ambientReference: {
                temperature0: this._ambientTemperature,
                pressure0: 101325
            }
        };
    }
    enforceMassConservation(initialMass, currentMass, tolerance = 1e-9) {
        if (Math.abs(initialMass - currentMass) > tolerance) {
            throw new Error(`First Law Violation: Mass invariant broken! Initial: ${initialMass}, Current: ${currentMass}`);
        }
    }
}
export class ThermodynamicStructure extends AbstractThermodynamicStructure {
    name;
    stocks = new Map();
    inboundFlows = [];
    outboundFlows = [];
    entropyState = EntropyState.STEADY;
    tickCreated = 0;
    parent = null;
    children = [];
    constructor(name = "unnamed", id) {
        super(id ?? crypto.randomUUID(), 298.15, 1000.0, 288.15);
        this.name = name;
    }
    get id() {
        return this._id;
    }
    computeInternalEntropyGeneration() {
        return Math.abs(this._internalEnergy * 1e-6);
    }
    importFreeEnergyJoules(joules, qualityFactor = 1.0) {
        if (joules < 0 || qualityFactor < 0 || qualityFactor > 1) {
            throw new Error("Invalid free energy parameters: energy and quality factor must be non-negative, quality <= 1.");
        }
        this._internalEnergy += joules;
        const importedExergy = joules * qualityFactor;
        this._exergy = Math.max(0, this._exergy + importedExergy);
        const estimatedC_v = 1000;
        this._temperature += joules / (this._mass * estimatedC_v);
        this.updateExergy();
    }
    exportEntropyJoulesPerKelvin(joulesPerKelvin) {
        if (joulesPerKelvin < 0) {
            throw new Error("Entropy export quantity cannot be negative.");
        }
        this._entropy = Math.max(0, this._entropy - joulesPerKelvin);
        this.updateExergy();
    }
    maintainFarFromEquilibriumSeconds(deltaTimeSeconds) {
        if (deltaTimeSeconds <= 0)
            return;
        const internalEntropyGenRate = this.computeInternalEntropyGeneration();
        const validEntropyGenRate = Math.max(0, internalEntropyGenRate);
        this.validateSecondLaw(validEntropyGenRate);
        const monad = globalThis.ThermodynamicMonad?.of ? globalThis.ThermodynamicMonad.of(this.getStateVector()) : null;
        if (monad) {
            const stateVec = monad.transform(validEntropyGenRate, deltaTimeSeconds).getStateVector();
            this._entropy = stateVec.entropy ?? stateVec.internalEnergy / Math.max(1, stateVec.temperature ?? 288.15);
            this._exergy = stateVec.exergy ?? stateVec.internalEnergy * 0.1;
            this.lastEntropyGenerationRate = stateVec.entropyGenerationRate;
        }
    }
    addStock(substance, quantity, maxCapacity) {
        this.stocks.set(substance, new Stock(substance, quantity, maxCapacity));
    }
    netFlow(substance) {
        const inflow = this.inboundFlows
            .filter((f) => f.substance === substance)
            .reduce((sum, f) => sum + f.rate, 0);
        const outflow = this.outboundFlows
            .filter((f) => f.substance === substance)
            .reduce((sum, f) => sum + f.rate, 0);
        return inflow - outflow;
    }
    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }
    totalDescendantBiomass() {
        const own = this.stocks.get("biomass")?.quantity ?? 0;
        return own + this.children.reduce((sum, c) => sum + c.totalDescendantBiomass(), 0);
    }
    tick(tickNum) {
        const imported = this.importFreeEnergy(tickNum);
        const exported = this.exportEntropy(tickNum);
        this.entropyState = this.maintainFarFromEquilibrium(tickNum);
        this.maintainFarFromEquilibriumSeconds(1.0);
        return { imported, exported, state: this.entropyState };
    }
    toString() {
        return `<${this.constructor.name} '${this.name}' state=${this.entropyState}>`;
    }
}
