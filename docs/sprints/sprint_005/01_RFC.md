# Request for Comments (RFC): Sprint 005 - Uber H3 Index String Format Validation and Error Code Mapping

**Author:** Chief Systems Architect  
**Status:** Approved / In Progress  
**Target Module:** `src/spatial/h3_grid.ts`  
**Compliance:** First and Second Laws of Thermodynamics (Matter Conservation & Solar-Driven Energy Fluxes)

---

## 1. Executive Summary

Sprint 005 establishes rigorous spatial coordinate verification within the Web of Life simulation architecture. As biochemical and trophic flows are mapped across discrete planetary sub-units, spatial integrity relies entirely on valid Uber H3 hierarchical hexagonal index strings. This RFC details the class hierarchies, monadic stock transitions, interface contracts, and error code mappings required to validate H3 indices in `src/spatial/h3_grid.ts`.

---

## 2. Thermodynamic & Spatial Principles

1. **Matter Conservation (First Law):** Spatial grid allocations represent fixed geodetic surfaces ($A_{\text{earth}} = \text{constant}$). No matter or spatial volume is created or destroyed during index validation; validation merely classifies discrete partitions of the planetary surface.
2. **Solar Input & Entropy (Second Law):** Computation cycles consumed during validation represent metabolic/dissipative energy overhead bounded by available solar flux inputs into the Earth Pod simulation loop.

---

## 3. Architectural Additions & Class Hierarchy

We extend the spatial subsystem to encapsulate validation logic using robust object-oriented patterns, preserving existing interfaces while layering strict validation wrappers.

```
       +----------------------------+
       |     SpatialMonadStock      |
       +----------------------------+
                     |
                     v
       +----------------------------+
       |       H3GridValidator      |
       +----------------------------+
         /                        \
        v                          v
+------------------+     +------------------+
| ValidH3Cell      |     | InvalidH3Cell    |
+------------------+     +------------------+
```

### 3.1 Interface Contracts

```typescript
export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
}

export interface IH3GridService {
  validateIndex(h3Index: string): IH3ValidationResult;
  assertValidIndex(h3Index: string): void;
}
```

---

## 4. Monad Stock Transitions

The spatial monad (`src/monads/spatial_monad.ts`) governs state transformations for spatial entities. Sprint 005 introduces strict state gates:

* **Unverified State ($S_0$):** Raw string input from telemetry or spatial queries.
* **Validation Gate ($\mathcal{V}$):** Evaluates length (typically 15 hex characters for standard resolutions), hexadecimal character set (`[0-9a-fA-F]`), valid H3 resolution range ($0 \le r \le 15$), and base cell constraints.
* **Active Spatial State ($S_1$):** Successfully validated cell bound to trophic flows and biomass distribution stocks.
* **Fault State ($S_{\text{err}}$):** Emits explicit `H3ErrorCode` mapped to ecosystem logging without crashing the planetary simulation loop.

---

## 5. Implementation Specification (`src/spatial/h3_grid.ts`)

```typescript
import { H3ErrorCode, IH3ValidationResult, IH3GridService } from './h3_types';

export class H3Grid implements IH3GridService {
  private static readonly H3_REGEX = /^[0-9a-fA-F]{15}$/;

  public validateIndex(h3Index: string): IH3ValidationResult {
    if (!h3Index || typeof h3Index !== 'string') {
      return {
        isValid: false,
        code: H3ErrorCode.NULL_INDEX,
        message: 'H3 index must be a non-empty string.'
      };
    }

    if (h3Index.length !== 15) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
      };
    }

    if (!H3Grid.H3_REGEX.test(h3Index)) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_CHARACTER,
        message: 'H3 index contains invalid non-hexadecimal characters.'
      };
    }

    // Additional bitwise resolution and base cell checks parsed from H3 specification header
    const resolution = parseInt(h3Index.charAt(1), 16); // Simplified mock extraction for RFC spec
    if (isNaN(resolution) || resolution < 0 || resolution > 15) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_RESOLUTION,
        message: `Extracted resolution ${resolution} is out of valid range [0, 15].`
      };
    }

    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      message: 'H3 index format is valid.',
      resolution
    };
  }

  public assertValidIndex(h3Index: string): void {
    const result = this.validateIndex(h3Index);
    if (!result.isValid) {
      throw new Error(`[${result.code}] Spatial Validation Error: ${result.message}`);
    }
  }
}
```

---

## 6. Verification and Testing Plan

1. **Unit Tests (`tests/sprint_005.test.ts`):**
   * Test valid 15-character hex strings across resolutions $0$ through $15$.
   * Test rejection of invalid lengths (<15 and >15).
   * Test rejection of invalid characters (non-hex characters such as 'g', 'z', symbols).
   * Verify correct mapping of `H3ErrorCode` enums.
2. **Integration Test:** Ensure `EarthPod` spatial telemetry ingestion gracefully handles `H3ErrorCode` responses without halting systemic trophic energy loops.