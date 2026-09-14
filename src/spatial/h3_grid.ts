/**
 * src/spatial/h3_grid.ts
 * Sprint 005: Uber H3 Index String Format Validation and Error Code Mapping
 */

import {
  latLngToCell,
  cellToLatLng,
  getResolution,
  isValidCell,
  getGridRes
} from 'h3-js';

import { H3IndexString, H3Error, H3_ERROR_CODES, LatLng } from './h3_types';

/**
 * Validates an H3 index string using h3-js isValidCell and format regex.
 */
export function validateH3Index(index: string): { valid: boolean; code?: H3Error; res?: number } {
  if (typeof index !== 'string') {
    return { valid: false, code: H3_ERROR_CODES.INVALID_TYPE };
  }

  // H3 index format: 15-character hex string starting with '8'
  const h3Regex = /^[8a-fA-F0-9]{15}$/;
  if (!h3Regex.test(index)) {
    return { valid: false, code: H3_ERROR_CODES.MALFORMED_FORMAT };
  }

  try {
    const valid = isValidCell(index);
    if (!valid) {
      return { valid: false, code: H3_ERROR_CODES.INVALID_INDEX };
    }

    const res = getResolution(index);
    return { valid: true, res };
  } catch (err) {
    return { valid: false, code: H3_ERROR_CODES.RESOLUTION_MISMATCH };
  }
}

/**
 * Converts latitude and longitude to an H3 index string at a given resolution.
 */
export function latLngToH3Index(lat: number, lng: number, resolution: number): H3IndexString {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`[H3_ERROR_INVALID_COORDINATES] Lat/Lng out of bounds: (${lat}, ${lng})`);
  }
  if (resolution < 0 || resolution > 15) {
    throw new Error(`[H3_ERROR_RESOLUTION_MISMATCH] Resolution out of bounds: ${resolution}`);
  }

  try {
    const cell = latLngToCell(lat, lng, resolution);
    const validation = validateH3Index(cell);
    if (!validation.valid) {
      throw new Error(`[${validation.code}] Generated cell is invalid: ${cell}`);
    }
    return cell as H3IndexString;
  } catch (err: any) {
    if (err.message && err.message.includes('H3_ERROR')) {
      throw err;
    }
    throw new Error(`[H3_ERROR_INTERNAL] Failed to convert LatLng to H3: ${err.message}`);
  }
}

/**
 * Converts an H3 index string to its center latitude and longitude.
 */
export function h3IndexToLatLng(index: H3IndexString): LatLng {
  const validation = validateH3Index(index);
  if (!validation.valid) {
    throw new Error(`[${validation.code}] Cannot convert invalid H3 index: ${index}`);
  }

  try {
    const [lat, lng] = cellToLatLng(index);
    return { lat, lng };
  } catch (err: any) {
    throw new Error(`[H3_ERROR_INTERNAL] Failed to convert H3 to LatLng: ${err.message}`);
  }
}

/**
 * Retrieves the resolution of an H3 index string.
 */
export function getH3Resolution(index: H3IndexString): number {
  const validation = validateH3Index(index);
  if (!validation.valid || validation.res === undefined) {
    throw new Error(`[${validation.code || H3_ERROR_CODES.INVALID_INDEX}] Cannot get resolution for invalid H3 index: ${index}`);
  }
  return validation.res;
}