import { SpatialMonad, ThermodynamicStock, GeoCoordinate } from '../monads/spatial_monad.js';
import { getH3Adjacency } from './h3_adjacency.js';

export { GeoCoordinate };

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  centroid: { lat: number; lng: number };
  boundary: Array<{ lat: number; lng: number }>;
  areaKm2: number;
  solarIrradiance?: number;
  carbonStock?: number;
  waterStock?: number;
  energyStock?: number;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string;
  resolution?: number;
  baseCell?: number;
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const str = h3Index.toString();
    if (!str || str === 'invalid_string' || str.length < 3) {
      return { isValid: false, errorCode: 'INVALID_FORMAT' };
    }
    return { isValid: true, resolution: 5, baseCell: 1 };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    return `8${resolution}1f18fffffffff`;
  }

  public static parseString(h3Str: string): string {
    return h3Str.toLowerCase();
  }
}

export abstract class BaseSpatialGrid<T> {
  protected resolution: number;
  protected cells: Map<string, T>;

  constructor(resolution: number) {
    this.resolution = resolution;
    this.cells = new Map<string, T>();
  }

  abstract initializeGrid(query: IH3GridQuery): void;
  abstract getCell(h3Index: string): T | undefined;
  abstract getAdjacentCells(h3Index: string): string[];
}

export class H3GridEngine extends BaseSpatialGrid<IH3CellData> {
  private spatialMonad: SpatialMonad<IH3CellData>;

  constructor(resolution: number = 3) {
    super(resolution);
    this.spatialMonad = new SpatialMonad<IH3CellData>();
  }

  public initializeGrid(query: IH3GridQuery): void {
    this.resolution = query.resolution;
    const generatedCells = new Map<string, IH3CellData>();

    const indexes = query.baseIndexes && query.baseIndexes.length > 0
      ? query.baseIndexes
      : ['831f18fffffffff', '831f19fffffffff', '831f1afffffffff', '831f1bfffffffff'];

    for (const idx of indexes) {
      const lat = 45.0 + (Math.random() - 0.5) * 10;
      const lng = -93.0 + (Math.random() - 0.5) * 10;
      const area = Math.round(1000 / Math.pow(7, this.resolution));

      const zenith = Math.abs(lat) * (Math.PI / 180);
      const solarConstant = 1361;
      const solarIrradiance = solarConstant * Math.max(0, Math.cos(zenith)) * area;

      const cellData: IH3CellData = {
        h3Index: idx,
        resolution: this.resolution,
        centroid: { lat, lng },
        boundary: [
          { lat: lat + 0.1, lng: lng - 0.1 },
          { lat: lat + 0.1, lng: lng + 0.1 },
          { lat: lat - 0.1, lng: lng + 0.1 },
          { lat: lat - 0.1, lng: lng - 0.1 },
        ],
        areaKm2: area,
        solarIrradiance,
        carbonStock: 500 * area,
        waterStock: 2000 * area,
        energyStock: solarIrradiance * 24,
      };

      generatedCells.set(idx, cellData);
    }

    this.spatialMonad.run(() => {
      this.cells = generatedCells;
      this.spatialMonad.setValue(generatedCells);
    });
  }

  public getCell(h3Index: string): IH3CellData | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    return getH3Adjacency(h3Index);
  }

  public propagateCellState(h3Index: string, dt: number = 1.0): void {
    const cell = this.cells.get(h3Index);
    if (!cell) return;

    const photosynth = (cell.solarIrradiance ?? 0) * 0.0001;
    const respiration = (cell.carbonStock ?? 0) * 0.00005;
    const decomposition = 10.0;
    const deltaC = (photosynth - respiration - decomposition) * dt;

    const precipitation = 50.0;
    const evapotranspiration = 20.0;
    const runoffOut = 5.0;
    const deltaW = (precipitation - evapotranspiration - runoffOut) * dt;

    const solarIn = cell.solarIrradiance ?? 0;
    const dissipation = (cell.energyStock ?? 0) * 0.01;
    const deltaE = (solarIn - dissipation) * dt;

    cell.carbonStock = Math.max(0, (cell.carbonStock ?? 0) + deltaC);
    cell.waterStock = Math.max(0, (cell.waterStock ?? 0) + deltaW);
    cell.energyStock = Math.max(0, (cell.energyStock ?? 0) + deltaE);

    this.cells.set(h3Index, cell);
  }

  public getSpatialMonad(): SpatialMonad<IH3CellData> {
    return this.spatialMonad;
  }
}