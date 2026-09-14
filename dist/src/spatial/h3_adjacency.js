/**
 * src/spatial/h3_adjacency.ts
 * Sprint 005: Uber H3 Index String Format Validation and Error Code Mapping
 */
import { gridDisk, gridDistance } from 'h3-js';
import { H3_ERROR_CODES } from './h3_types';
import { validateH3Index } from './h3_grid';
/**
 * Returns neighboring H3 cells within k distance (gridDisk).
 */
export function getH3Neighbors(index, k = 1) {
    const validation = validateH3Index(index);
    if (!validation.valid) {
        throw new Error(`[${validation.code}] Cannot compute neighbors for invalid H3 index: ${index}`);
    }
    if (k < 0) {
        throw new Error(`[${H3_ERROR_CODES.INVALID_TYPE}] Distance k must be non-negative`);
    }
    try {
        const disks = gridDisk(index, k);
        return disks.filter((cell) => cell !== null);
    }
    catch (err) {
        throw new Error(`[${H3_ERROR_CODES.INTERNAL_ERROR}] Failed to compute grid disk: ${err.message}`);
    }
}
/**
 * Computes grid distance between two H3 index strings.
 */
export function getH3GridDistance(origin, destination) {
    const v1 = validateH3Index(origin);
    if (!v1.valid) {
        throw new Error(`[${v1.code}] Invalid origin H3 index: ${origin}`);
    }
    const v2 = validateH3Index(destination);
    if (!v2.valid) {
        throw new Error(`[${v2.code}] Invalid destination H3 index: ${destination}`);
    }
    try {
        const dist = gridDistance(origin, destination);
        if (dist < 0) {
            throw new Error(`[${H3_ERROR_CODES.RESOLUTION_MISMATCH}] Indices are at different resolutions or non-comparable`);
        }
        return dist;
    }
    catch (err) {
        if (err.message && err.message.includes('H3_ERROR')) {
            throw err;
        }
        throw new Error(`[${H3_ERROR_CODES.INTERNAL_ERROR}] Failed to compute grid distance: ${err.message}`);
    }
}
