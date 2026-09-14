import * as h3 from 'h3-js';

export interface H3CellData {
  index: string;
  resolution: number;
  temperature: number;
  biomassFlux: number;
}

export function createH3Cell(lat: number, lng: number, resolution: number): H3CellData {
  const index = h3.latLngToCell(lat, lng, resolution);
  const res = h3.getResolution(index);
  return {
    index,
    resolution: res,
    temperature: 298.15,
    biomassFlux: 1.0,
  };
}

export function getCellBoundary(index: string): [number, number][] {
  const boundary = h3.cellToBoundary(index, true);
  return boundary as [number, number][];
}