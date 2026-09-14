import * as h3 from 'h3-js';
export function createH3Cell(lat, lng, resolution) {
    const index = h3.latLngToCell(lat, lng, resolution);
    const res = h3.getResolution(index);
    return {
        index,
        resolution: res,
        temperature: 298.15,
        biomassFlux: 1.0,
    };
}
export function getCellBoundary(index) {
    const boundary = h3.cellToBoundary(index, true);
    return boundary;
}
