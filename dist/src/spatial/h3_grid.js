import { latLngToCell, cellToLatLng, gridDisk, isValidCell } from "h3-js";
export class H3GridManager {
    resolution;
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    latLngToH3(lat, lng) {
        return latLngToCell(lat, lng, this.resolution);
    }
    h3ToLatLng(h3Index) {
        const [lat, lng] = cellToLatLng(h3Index);
        return { lat, lng };
    }
    getNeighbors(h3Index, k = 1) {
        return gridDisk(h3Index, k);
    }
    isValid(h3Index) {
        return isValidCell(h3Index);
    }
}
