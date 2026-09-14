<!-- Method Specifications -->

# Method Specifications: Sprint 007 - Uber H3 Index String Format Validation and Error Code Mapping

## 1. Process Overview & Thermodynamic Accounting
The spatial validation process within `src/spatial/h3_grid.ts` enforces geometric and energetic constraints on Web of Life simulation entities. Because spatial indices act as addressing containers for mass and energy stocks across planetary hexagonal cells (Resolutions 0–15), validating string tokens prevents thermodynamic leakages, spatial corruption, and unphysical state routing.

### 1.1 Conservation Laws & Mass/Energy Deltas
- **Matter ($\Delta M$)**: $0\text{ kg}$. Validation operations inspect metadata headers and string tokens; no physical elements, minerals, or biochemical stocks are created, consumed, or transformed.
- **Water ($\Delta H_2O$)**: $0\text{ kg}$. Purely computational string and bit-pattern processing.
- **Energy ($\Delta E$)**: Internal thermodynamic dissipation only. Each validation execution cycle expends computational energy through CPU instruction cycles, converted entirely to low-grade thermal entropy ($Q$) per Landauer's Principle.
  $$\Delta E_{\text{dissipated}} = k_B T \ln(2) \cdot N_{\text{bits}}$$

---

## 2. Executable Monad Method: `H3GridValidator`

The following specification details the executable monad validation method and its associated stock transition mechanics.

```ts
/**
 * @file 02_METHODS.md - Executable Monad Method Specification for Sprint 007
 * @module WebOfLife.Spatial.H3GridValidator
 */

import { SpatialMonad } from '../monads/spatial_monad';

export enum H3ErrorCode {
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06
}

export type H3ValidationResult = 
  | { valid: true; resolution: number; baseCell: number }
  | { valid: false; errorCode: H3ErrorCode; message: string };

export class H3GridValidator {
  // Standard Uber H3 index regex: 15-character hex string starting with '8' (typical face/resolution prefix)
  private static readonly H3_REGEX = /^[8][0-9a-fA-F]{14}$/;

  /**
   * Validates an H3 index string format, resolution, and base cell constraints.
   * Satisfies First & Second Law constraints by performing stateless string inspection.
   */
  public static validateString(h3Index: unknown): H3ValidationResult {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return {
        valid: false,
        errorCode: H3ErrorCode.ERR_H3_INVALID_NULL,
        message: 'H3 index must be a non-null string.'
      };
    }

    if (h3Index.length !== 15) {
      return {
        valid: false,
        errorCode: H3ErrorCode.ERR_H3_INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
      };
    }

    if (!H3GridValidator.H3_REGEX.test(h3Index)) {
      return {
        valid: false,
        errorCode: H3ErrorCode.ERR_H3_INVALID_CHARACTERS,
        message: 'H3 index contains invalid hexadecimal characters or incorrect prefix.'
      };
    }

    // Extract resolution and base cell from the H3 bitmask structure encoded in hex
    const resolution = H3GridValidator.parseResolution(h3Index);
    if (resolution < 0 || resolution > 15) {
      return {
        valid: false,
        errorCode: H3ErrorCode.ERR_H3_INVALID_RESOLUTION,
        message: `Extracted resolution ${resolution} is out of valid range [0, 15].`
      };
    }

    const baseCell = H3GridValidator.parseBaseCell(h3Index);
    if (baseCell < 0 || baseCell > 121) {
      return {
        valid: false,
        errorCode: H3ErrorCode.ERR_H3_INVALID_BASE_CELL,
        message: `Extracted base cell ${baseCell} is out of valid range [0, 121].`
      };
    }

    return {
      valid: true,
      resolution,
      baseCell
    };
  }

  public static parseResolution(h3Index: string): number {
    // Resolution is stored in bits 45-51 of the 64-bit H3 integer (represented in hex characters)
    // For standard string parsing, the resolution nibble can be decoded from specific character indices.
    const resChar = h3Index.charAt(1);
    return parseInt(resChar, 16);
  }

  public static parseBaseCell(h3Index: string): number {
    // Base cell is stored in bits 52-59
    const baseCellStr = h3Index.substring(2, 4);
    return parseInt(baseCellStr, 16);
  }
}
```

---

## 3. Spatial Monad Integration Contract

When integrating `H3GridValidator` into `SpatialMonad<T>`, the state transition function adheres to the following deterministic flow:

$$\text{SpatialMonad.bind}(\text{h3Token}) \implies \begin{cases} 
\text{Encapsulated(Token, Metadata)} & \text{if } \text{validateString}(\text{h3Token}).valid == \text{true} \\ 
\text{ErrorState}(\text{ErrorCode}) & \text{if } \text{validateString}(\text{h3Token}).valid == \text{false} 
\end{cases}$$

This guarantees that energetic and material stocks bound to spatial coordinates cannot propagate across the simulation grid if their addressing container fails topological or formatting verification.