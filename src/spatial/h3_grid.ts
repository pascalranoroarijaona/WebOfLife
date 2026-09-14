import { latLngToCell, cellToLatLng, gridDisk, isValidCell } from "h3-js";
import { H3Index, H3Coordinate, H3Resolution } from "./h3_types";

export class H3GridManager {
  private resolution: H3Resolution;

  constructor(resolution: H3Resolution = 3) {
    this.resolution = resolution;
  }

  public latLngToH3(lat: number, lng: number): H3Index {
    return latLngToCell(lat, lng, this.resolution);
  }

  public h3ToLatLng(h3Index: H3Index): H3Coordinate {
    const [lat, lng] = cellToLatLng(h3Index);
    return { lat, lng };
  }

  public getNeighbors(h3Index: H3Index, k: number = 1): H3Index[] {
    return gridDisk(h3Index, k);
  }

  public isValid(h3Index: H3Index): boolean {
    return isValidCell(h3Index);
  }
}