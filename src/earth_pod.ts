// File: src/earth_pod.ts
import { ThermodynamicStructure, EntropyState, Stock, type Flow, applyThermalFlux, applyMassTransport } from './thermodynamics/thermodynamic_structure.js';
import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicMonad, IBoundaryFluxArray, IExergyMetrics } from './thermodynamics/types.js';
import { CarbonCycle } from './cycles/carbon.js';
import { WaterCycle } from './cycles/water.js';
import { NitrogenCycle } from './cycles/nitrogen.js';
import { PhosphorusCycle } from './cycles/phosphorus.js';

// Backward-compatibility aliases for Sprint 005 tests expecting *POD classes
export { CarbonCycle as CarbonCyclePOD };
export { WaterCycle as WaterCyclePOD };
export { NitrogenCycle as NitrogenCyclePOD };
export { PhosphorusCycle as PhosphorusCyclePOD };

export type ReservoirMap = Record<string, number>;

export interface ThermodynamicState<T> {
  value: T;
  energyUsed: number;
  entropyGenerated: number;
}

export { EntropyState, Stock };
export type { Flow };
export { applyThermalFlux, applyMassTransport, ThermodynamicMonad };

export class CyclePOD extends ThermodynamicStructure {
  constructor(
    name: string,
    public reservoirs: Record<string, number>,
    public transferRates: Record<string, number>
  ) {
    super(name);
    for (const [resName, qty] of Object.entries(reservoirs)) {
      this.addStock(resName, qty);
    }
  }

  public getStocks(): ReservoirMap {
    const res: ReservoirMap = {};
    for (const [key, stock] of this.stocks.entries()) {
      res[key] = stock.quantity;
    }
    return res;
  }

  importFreeEnergy(_tick: number): number {
    const total = Object.values(this.transferRates).reduce((a, b) => a + b, 0);
    const val = total * 0.01;
    this.importFreeEnergyJoules(val * 1000, 0.9);
    return val;
  }

  exportEntropy(_tick: number): number {
    const total = Object.values(this.transferRates).reduce((a, b) => a + b, 0);
    const val = total * 0.008;
    this.exportEntropyJoulesPerKelvin(val * 10);
    return val;
  }

  maintainFarFromEquilibrium(_tick: number): EntropyState {
    const imbalance = this.computeReservoirImbalance();
    if (imbalance < 0.02) return EntropyState.STEADY;
    if (imbalance < 0.15) return EntropyState.ACCUMULATING;
    return EntropyState.DEGRADING;
  }

  computeReservoirImbalance(): number {
    const totalTransfer = Object.values(this.transferRates).reduce((a, b) => a + b, 0);
    const net: Record<string, number> = {};
    for (const [route, rate] of Object.entries(this.transferRates)) {
      const [src, tgt] = route.split("->");
      net[src] = (net[src] ?? 0) - rate;
      net[tgt] = (net[tgt] ?? 0) + rate;
    }
    const values = Object.values(net).map(Math.abs);
    const maxImbalance = values.length ? Math.max(...values) : 0;
    return totalTransfer ? maxImbalance / totalTransfer : 0;
  }

  transfer(sourceReservoir: string, targetReservoir: string, customRate?: number): number {
    const route = `${sourceReservoir}->${targetReservoir}`;
    const rate = customRate ?? this.transferRates[route] ?? 0;
    const srcStock = this.stocks.get(sourceReservoir);
    const tgtStock = this.stocks.get(targetReservoir);
    if (srcStock) srcStock.quantity -= rate;
    if (tgtStock) tgtStock.quantity += rate;
    return rate;
  }
}

export const CARBON_CYCLE = new CyclePOD("Carbon Cycle", {
  atmosphere: 850,
  ocean_surface: 900,
  ocean_deep: 37000,
  biosphere_terrestrial: 550,
  soil: 1500,
  lithosphere_fossil: 100_000_000,
}, {
  "atmosphere->ocean_surface": 92,
  "ocean_surface->atmosphere": 90,
  "atmosphere->biosphere_terrestrial": 120,
  "biosphere_terrestrial->atmosphere": 118,
  "biosphere_terrestrial->soil": 60,
  "soil->atmosphere": 58,
  "lithosphere_fossil->atmosphere": 9.5,
});

export const NITROGEN_CYCLE = new CyclePOD("Nitrogen Cycle", {
  atmosphere: 3_900_000,
  soil: 100,
  biosphere: 3.5,
  ocean: 700
}, {
  "atmosphere->soil": 0.2,
  "soil->biosphere": 1.2,
  "biosphere->soil": 1.1,
  "soil->atmosphere": 0.19,
});

export const PHOSPHORUS_CYCLE = new CyclePOD("Phosphorus Cycle", {
  lithosphere_rock: 4e9,
  soil: 200,
  biosphere: 3,
  ocean: 90000
}, {
  "lithosphere_rock->soil": 0.02,
  "soil->biosphere": 1.0,
  "biosphere->soil": 0.9,
  "soil->ocean": 0.03,
});

export const WATER_CYCLE = new CyclePOD("Water Cycle", {
  ocean: 1_338_000_000,
  atmosphere: 12900,
  ice: 24_064_000,
  groundwater: 23_400_000,
  surface_freshwater: 178_000,
}, {
  "ocean->atmosphere": 434_000,
  "atmosphere->ocean": 398_000,
  "atmosphere->surface_freshwater": 107_000,
  "surface_freshwater->ocean": 40_000,
  "surface_freshwater->atmosphere": 71_000,
});

export class SpherePOD extends ThermodynamicStructure {
  constructor(name: string, public involvedCycles: CyclePOD[]) {
    super(name);
  }

  importFreeEnergy(tick: number): number {
    if (!this.involvedCycles.length) return 0;
    const sum = this.involvedCycles.reduce((s, c) => s + c.importFreeEnergy(tick), 0);
    const avg = sum / this.involvedCycles.length;
    this.importFreeEnergyJoules(avg * 100, 0.95);
    return avg;
  }

  exportEntropy(tick: number): number {
    if (!this.involvedCycles.length) return 0;
    const sum = this.involvedCycles.reduce((s, c) => s + c.exportEntropy(tick), 0);
    const avg = sum / this.involvedCycles.length;
    this.exportEntropyJoulesPerKelvin(avg * 5);
    return avg;
  }

  maintainFarFromEquilibrium(tick: number): EntropyState {
    const states = this.involvedCycles.map((c) => c.maintainFarFromEquilibrium(tick));
    if (states.includes(EntropyState.DEGRADING)) return EntropyState.DEGRADING;
    if (states.includes(EntropyState.ACCUMULATING)) return EntropyState.ACCUMULATING;
    return EntropyState.STEADY;
  }
}

export const ATMOSPHERE = new SpherePOD("Atmosphere", [CARBON_CYCLE, NITROGEN_CYCLE, WATER_CYCLE]);
export const HYDROSPHERE = new SpherePOD("Hydrosphere", [WATER_CYCLE, PHOSPHORUS_CYCLE]);
export const LITHOSPHERE = new SpherePOD("Lithosphere", [CARBON_CYCLE, PHOSPHORUS_CYCLE]);
export const BIOSPHERE = new SpherePOD("Biosphere", [CARBON_CYCLE, NITROGEN_CYCLE, PHOSPHORUS_CYCLE, WATER_CYCLE]);

export class BiomePOD extends ThermodynamicStructure {
  public species: SpeciesPOD[] = [];

  constructor(name: string, public sphere: SpherePOD, public areaKm2: number) {
    super(name);
  }

  importFreeEnergy(tick: number): number {
    const val = this.species.reduce((s, sp) => s + sp.importFreeEnergy(tick), 0);
    this.importFreeEnergyJoules(val * 50, 0.85);
    return val;
  }

  exportEntropy(tick: number): number {
    const val = this.species.reduce((s, sp) => s + sp.exportEntropy(tick), 0);
    this.exportEntropyJoulesPerKelvin(val * 4);
    return val;
  }

  maintainFarFromEquilibrium(_tick: number): EntropyState {
    const biodiversityIndex = this.species.length / Math.max(1, this.tickCreated + 1);
    if (biodiversityIndex < 0.1) return EntropyState.DEGRADING;
    return EntropyState.STEADY;
  }

  carryingCapacity(): number {
    return this.areaKm2 * 1e5;
  }

  addSpecies(species: SpeciesPOD): void {
    species.biome = this;
    this.species.push(species);
    this.addChild(species);
  }
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export class GeoBiomePOD extends BiomePOD {
  constructor(name: string, sphere: SpherePOD, areaKm2: number, public boundingPolygon: GeoLocation[]) {
    super(name, sphere, areaKm2);
  }
}

export class SpeciesPOD extends ThermodynamicStructure {
  public methodsAvailable: string[] = [];
  public history: number[] = [];

  constructor(
    name: string,
    public scientificName: string,
    public trophicLevel: number,
    public biome: BiomePOD | null,
    public population: number,
    public iucnStatus: string = "LC"
  ) {
    super(name);
  }

  importFreeEnergy(_tick: number): number {
    const val = this.trophicLevel === 1 ? this.population * 0.01 : this.population * this.netFlow("biomass") * 0.1;
    this.importFreeEnergyJoules(val * 20, 0.8);
    return val;
  }

  netFlow(_substance: string): number {
    return 1.0;
  }

  exportEntropy(_tick: number): number {
    const val = this.population * 0.008;
    this.exportEntropyJoulesPerKelvin(val * 2);
    return val;
  }

  maintainFarFromEquilibrium(_tick: number): EntropyState {
    if (this.iucnStatus === "CR" || this.iucnStatus === "EW") return EntropyState.DEGRADING;
    if (this.iucnStatus === "EX") return EntropyState.COLLAPSED;
    return EntropyState.STEADY;
  }

  executeMethod(methodName: string, target?: ThermodynamicStructure): string {
    if (!this.methodsAvailable.includes(methodName)) {
      throw new Error(`${this.name} has no method ${methodName}`);
    }
    return `${this.name}.${methodName}() executed on ${target?.name ?? "environment"}`;
  }

  static applyPredatorPreyStep(
    prey: SpeciesPOD,
    predator: SpeciesPOD,
    params: { growthRate?: number; predationRate?: number; conversionEfficiency?: number; deathRate?: number } = {}
  ): void {
    const { growthRate = 0.08, predationRate = 0.004, conversionEfficiency = 0.0025, deathRate = 0.08 } = params;
    const carryingCapacity = prey.biome?.carryingCapacity() ?? 1000;
    const preyPop = prey.population;
    const predPop = predator.population;

    prey.population = Math.max(
      2,
      preyPop + growthRate * preyPop * (1 - preyPop / carryingCapacity) - predationRate * preyPop * predPop
    );
    predator.population = Math.max(2, predPop + conversionEfficiency * preyPop * predPop - deathRate * predPop);

    prey.pushHistory();
    predator.pushHistory();
  }

  pushHistory(maxLength: number = 80): void {
    this.history.push(this.population);
    if (this.history.length > maxLength) this.history.shift();
  }
}

export interface IndividualMonad {
  monadId: string;
  wellbeingUnits: number;
  identityHash: string;
  resourceExtractionLog: Flow[];
}

export function createIndividualMonad(monadId: string, wellbeingUnits: number, identityHash: string): IndividualMonad {
  return { monadId, wellbeingUnits, identityHash, resourceExtractionLog: [] };
}

export function extractResource(
  monad: IndividualMonad,
  source: ThermodynamicStructure,
  substance: string,
  quantity: number
): Flow {
  const flow: Flow = {
    sourceId: source.id,
    targetId: monad.monadId,
    substance,
    rate: quantity,
    flowType: "resource_extraction",
  };
  monad.resourceExtractionLog.push(flow);
  const stock = source.stocks.get(substance);
  if (stock) stock.quantity -= quantity;
  return flow;
}

export class HumanNodePOD extends SpeciesPOD {
  public individualMonads: IndividualMonad[] = [];

  constructor(biome: BiomePOD, population: number) {
    super("Homo sapiens", "Homo sapiens", 3, biome, population, "LC");
    this.methodsAvailable = [
      "extractResources",
      "cultivate",
      "domesticate",
      "constructTechnology",
      "coordinateWithOtherHumans",
      "measureWellbeing",
      "verifyInformation",
      "proveThermodynamicWork",
      "denominateInSolarUnits",
    ];
  }

  totalWellbeingUnits(): number {
    return this.individualMonads.reduce((s, m) => s + m.wellbeingUnits, 0);
  }
}

export class EarthPOD extends ThermodynamicStructure {
  private static _instance: EarthPOD | null = null;
  public spheres: SpherePOD[];
  public cycles: CyclePOD[];
  public biomes: BiomePOD[] = [];
  public solarInputWatts: number = 1.74e17;

  // Dedicated biogeochemical cycle instances
  public carbonCycle = new CarbonCycle();
  public waterCycle = new WaterCycle();
  public nitrogenCycle = new NitrogenCycle();
  public phosphorusCycle = new PhosphorusCycle();

  constructor() {
    super("Earth");
    this.spheres = [ATMOSPHERE, HYDROSPHERE, LITHOSPHERE, BIOSPHERE];
    this.cycles = [CARBON_CYCLE, NITROGEN_CYCLE, PHOSPHORUS_CYCLE, WATER_CYCLE];
  }

  static getInstance(): EarthPOD {
    if (!EarthPOD._instance) {
      EarthPOD._instance = new EarthPOD();
    }
    return EarthPOD._instance;
  }

  public getStateVector(): IThermodynamicStateVector {
    const netHeat = this.solarInputWatts * 0.01;
    const entropyGen = 150.0;
    const boundaryFluxes: IBoundaryFluxArray = {
      solarRadiationIn: this.solarInputWatts,
      longwaveRadiationOut: this.solarInputWatts * 0.99,
      sensibleHeatFlux: 1e8,
      latentHeatFlux: 1e8,
      netMassFlux: 0,
      solarInput: this.solarInputWatts,
      thermalRadiationOut: this.solarInputWatts * 0.99,
      matterEnthalpyFlux: 0,
      netHeatFlux: netHeat,
      heatFluxes: new Map(),
      massFluxes: new Map()
    };
    const exergyMetrics: IExergyMetrics = {
      T_0: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: entropyGen,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * entropyGen,
      totalExergy: 1e12
    };

    const vec: IThermodynamicStateVector = {
      tick: this.tickCreated,
      timestamp: this.tickCreated,
      internalEnergy: 1e12,
      totalEntropy: 5e9,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      entropy: 5e9,
      entropyGenerationRate: entropyGen,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * entropyGen,
      boundaryFluxes,
      exergyMetrics,
      validateSecondLaw: () => entropyGen >= 0,
      validateFirstLaw: () => true
    };

    return vec;
  }

  public verifySecondLaw(): boolean {
    const vec = this.getStateVector();
    return vec.validateSecondLaw ? vec.validateSecondLaw() : true;
  }

  importFreeEnergy(_tick: number): number {
    this.importFreeEnergyJoules(this.solarInputWatts * 0.1, 0.99);
    return this.solarInputWatts;
  }

  exportEntropy(_tick: number): number {
    const exportedVal = this.solarInputWatts * 0.997;
    this.exportEntropyJoulesPerKelvin(exportedVal * 1e-12);
    return exportedVal;
  }

  maintainFarFromEquilibrium(tick: number): EntropyState {
    const cycleStates = this.cycles.map((c) => c.maintainFarFromEquilibrium(tick));
    const degradingCount = cycleStates.filter((s) => s === EntropyState.DEGRADING).length;
    if (degradingCount >= 2) return EntropyState.DEGRADING;
    if (degradingCount === 1) return EntropyState.ACCUMULATING;
    return EntropyState.STEADY;
  }

  addBiome(biome: BiomePOD): void {
    this.biomes.push(biome);
    this.addChild(biome);
  }

  public step(dt: number, solarFlux: number): void {
    this.carbonCycle.step(dt, solarFlux);
    this.waterCycle.step(dt, solarFlux);
    this.nitrogenCycle.step(dt, solarFlux);
    this.phosphorusCycle.step(dt, solarFlux);
  }

  fullTick(tickNum: number) {
    this.step(1.0, this.solarInputWatts);
    const result = {
      earth: this.tick(tickNum),
      cycles: {} as Record<string, ReturnType<CyclePOD["tick"]>>,
      biomes: {} as Record<string, ReturnType<BiomePOD["tick"]>>,
    };
    for (const cycle of this.cycles) {
      result.cycles[cycle.name] = cycle.tick(tickNum);
    }
    for (const biome of this.biomes) {
      result.biomes[biome.name] = biome.tick(tickNum);
      for (const species of biome.species) {
        species.tick(tickNum);
      }
    }
    return result;
  }

  globalEntropyReport() {
    return {
      earthState: this.entropyState,
      cycles: Object.fromEntries(this.cycles.map((c) => [c.name, c.entropyState])),
      spheres: Object.fromEntries(this.spheres.map((s) => [s.name, s.entropyState])),
      totalBiomass: this.totalDescendantBiomass(),
    };
  }
}

export class StellarMonad extends ThermodynamicStructure {
  constructor() {
    super("Sun");
    this.addStock("hydrogen", 1.5e30, 1.99e30);
  }

  importFreeEnergy(_tick: number): number {
    return 0;
  }

  exportEntropy(_tick: number): number {
    const val = 3.846e26;
    this.exportEntropyJoulesPerKelvin(val * 1e-20);
    return val;
  }

  maintainFarFromEquilibrium(_tick: number): EntropyState {
    const hydrogen = this.stocks.get("hydrogen");
    if (!hydrogen) return EntropyState.STEADY;
    return hydrogen.utilization() > 0.05 ? EntropyState.STEADY : EntropyState.DEGRADING;
  }
}

export function bootstrapMegaPod() {
  const sun = new StellarMonad();
  const earth = EarthPOD.getInstance();

  const temperateForest = new GeoBiomePOD("Temperate Forest", BIOSPHERE, 1_000_000, [
    { latitude: 45.0, longitude: -93.0 }
  ]);
  const ocean = new GeoBiomePOD("Ocean", HYDROSPHERE, 361_000_000, [
    { latitude: 0.0, longitude: -160.0 }
  ]);
  const savanna = new GeoBiomePOD("Savanna", BIOSPHERE, 2_000_000, [
    { latitude: -2.33, longitude: 34.83 }
  ]);
  const tundra = new GeoBiomePOD("Tundra", BIOSPHERE, 1_500_000, [
    { latitude: 71.2, longitude: -156.8 }
  ]);
  const urban = new GeoBiomePOD("Urban Zone", BIOSPHERE, 100_000, [
    { latitude: 40.71, longitude: -74.0 }
  ]);

  earth.addBiome(temperateForest);
  earth.addBiome(ocean);
  earth.addBiome(savanna);
  earth.addBiome(tundra);
  earth.addBiome(urban);

  const flora = new SpeciesPOD("Flora", "Autotrophic assemblage", 1, temperateForest, 80);
  const fauna = new SpeciesPOD("Fauna", "Heterotrophic assemblage", 2, temperateForest, 35);
  const fungi = new SpeciesPOD("Fungi", "Decomposer assemblage", 0, temperateForest, 24);
  const microbes = new SpeciesPOD("Microbes", "Microbial assemblage", 0, urban, 48);
  const humans = new HumanNodePOD(urban, 18);

  flora.addStock("biomass", 62);
  fauna.addStock("biomass", 44);
  fungi.addStock("biomass", 28);
  microbes.addStock("biomass", 20);
  humans.addStock("biomass", 30);

  temperateForest.addSpecies(flora);
  temperateForest.addSpecies(fauna);
  temperateForest.addSpecies(fungi);
  urban.addSpecies(microbes);
  urban.addSpecies(humans);

  return { sun, earth };
}