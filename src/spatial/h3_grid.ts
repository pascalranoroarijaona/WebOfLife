/**
 * Sprint 003 - Base H3 Grid Parsing and Index Validation Routines
 * Implements H3 grid parsing, coordinate conversion, and strict validation logic.
 */

import * as h3 from 'h3-js';

/**
 * Interface defining raw geographic coordinates.
 */
export interface GeoCoordinate {
  lat: number;
  lng: number;
}

/**
 * Interface defining H3 validation result structures.
 */
export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string;
  resolution?: number;
  baseCell?: number;
}

/**
 * Core H3 Grid Parser and Validator Class.
 * Handles parsing of hex strings, integer identifiers, and geographic coordinates
 * into verified H3 spatial tokens.
 */
export class H3GridParser {
  /**
   * Validates an H3 index string or BigInt representation.
   * @param h3Index Hexadecimal string or BigInt
   */
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    try {
      let hexStr: string;
      if (typeof h3Index === 'bigint') {
        hexStr = h3Index.toString(16);
      } else if (typeof h3Index === 'string') {
        hexStr = h3Index.trim();
        if (hexStr.startsWith('0x') || hexStr.startsWith('0X')) {
          hexStr = hexStr.slice(2);
        }
      } else {
        return { isValid: false, errorCode: 'INVALID_TYPE' };
      }

      // Check if it's a valid H3 index using h3-js isValidCell or general string validity
      // In h3-js, isValidCell checks if the index is a valid cell index.
      // We can also check length and character set.
      if (!/^[0-9a-fA-F]{1,15}$/.test(hexStr)) {
        return { isValid: false, errorCode: 'INVALID_FORMAT' };
      }

      // Pad or normalize for h3-js check if needed, or pass directly
      const normalized = hexStr.length < 15 ? hexStr.padStart(15, '0') : hexStr;
      
      // Let's use h3.isValidCell or h3.isValidIndex if available, or validate via h3-js
      const isValid = h3.isValidCell(hexStr) || h3.isValidCell(normalized);
      if (!isValid) {
        return { isValid: false, errorCode: 'INVALID_H3_CELL' };
      }

      let resolution: number;
      let baseCell: number;
      try {
        resolution = h3.getResolution(hexStr);
        baseCell = h3.getBaseCellNumber(hexStr);
      } catch {
        return { isValid: false, errorCode: 'RESOLUTION_PARSE_ERROR' };
      }

      if (resolution < 0 || resolution > 15) {
        return { isValid: false, errorCode: 'RESOLUTION_OUT_OF_BOUNDS', resolution };
      }

      if (baseCell < 0 || baseCell > 121) {
        return { isValid: false, errorCode: 'INVALID_BASE_CELL', baseCell };
      }

      return {
        isValid: true,
        resolution,
        baseCell,
      };
    } catch (err: any) {
      return { isValid: false, errorCode: err?.message ?? 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Parses latitude and longitude into an H3 index at a specified resolution.
   * @param coord Geographic coordinate (lat, lng)
   * @param resolution H3 resolution (0-15)
   */
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    if (resolution < 0 || resolution > 15) {
      throw new Error(`Invalid H3 resolution: ${resolution}. Must be between 0 and 15.`);
    }
    if (coord.lat < -90 || coord.lat > 90 || coord.lng < -180 || coord.lng > 180) {
      throw new Error(`Invalid geographic coordinates: lat=${coord.lat}, lng=${coord.lng}`);
    }
    return h3.latLngToCell(coord.lat, coord.lng, resolution);
  }

  /**
   * Parses an H3 string identifier into its normalized hexadecimal string form.
   * @param h3Str Raw H3 string
   */
  public static parseString(h3Str: string): string {
    if (typeof h3Str !== 'string') {
      throw new Error('H3 string must be a valid string identifier.');
    }
    const trimmed = h3Str.trim().toLowerCase();
    const validation = H3GridParser.validateIndex(trimmed);
    if (!validation.isValid) {
      throw new Error(`Failed to parse H3 string '${h3Str}': ${validation.errorCode}`);
    }
    return trimmed;
  }
}