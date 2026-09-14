# RFC 006: Uber H3 Index String Format Validation & Error Code Mapping

## 1. Executive Summary & Sprint Goal
Sprint 006 establishes rigorous spatial validation protocols for the Web of Life simulation engine by implementing Uber H3 index string format validation and explicit error code mapping within `src/spatial/h3_grid.ts`. Maintaining thermodynamic integrity under the First and Second Laws requires precise spatial bookkeeping, ensuring matter and energy fluxes mapped across geodetic coordinates suffer no distortion or illegal boundary states.

## 2. Thermodynamic & Spatial Constraints
- **First Law Compliance:** Spatial stocks (e.g., biomass, nutrient reservoirs, solar radiation flux) bound to H3 indexes must be conserved. Invalid H3 strings or malformed indices represent leakage vectors and are strictly rejected.
- **Second Law Compliance:** Spatial transformations must maintain entropy accounting. Unresolvable spatial degradation errors map to deterministic error codes to prevent state space divergence.
- **Solar Input Only:** All spatial energy fluxes originate from explicit external solar influx models mapped via valid H3 cells.

## 3. Architecture & Class Hierarchy Additions
To support incremental design, `src/spatial/h3_grid.ts` will be extended with:
- `H3Validator`: A static utility class providing format validation matching Uber H3 specifications (15-character hex string format, valid resolution 0–15, valid base cell 0–122).
- `H3Error`: A domain-specific error class extending `Error` mapping illegal spatial states to explicit error codes.
- `H3ErrorCode`: Enum representing validation failures (`INVALID_LENGTH`, `INVALID_CHARACTER`, `INVALID_RESOLUTION`, `INVALID_BASE_CELL`, `NULL_INDEX`).

### Class Diagram Extension
```
+-------------------+       +-----------------------+
|    H3Validator    | ----> |      H3ErrorCode      |
+-------------------+       +-----------------------+
| + isValidH3(str)  |       | INVALID_LENGTH        |
| + parseH3(str)    |       | INVALID_CHARACTER     |
+-------------------+       | INVALID_RESOLUTION    |
         |                  | INVALID_BASE_CELL     |
         v                  | NULL_INDEX            |
+-------------------+       +-----------------------+
|      H3Error      |
+-------------------+
| + code: H3ErrorCode
| + message: string
+-------------------+
```

## 4. Monad Stock Transitions
Spatial monads (`SpatialMonad` in `src/monads/spatial_monad.ts`) wrapping matter and energy states will invoke `H3Validator.parseH3()` during state transitions:
1. **Input:** Raw string or H3 index candidate.
2. **Validation Check:** Matches hex regex `/^[0-9a-fA-F]{15}$/`, resolution bitmask (bits 45-51), and base cell bitmask (bits 46-52 in H3 specification layout).
3. **Transition:** Success yields a wrapped valid `H3Index`; failure halts the monad branch and emits an `H3Error` with the corresponding `H3ErrorCode`.

## 5. Interface Contracts (`src/spatial/h3_grid.ts`)
```typescript
export enum H3ErrorCode {
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX'
}

export class H3Error extends Error {
  constructor(public readonly code: H3ErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'H3Error';
  }
}

export interface IH3GridValidator {
  validate(indexStr: string): boolean;
  assertValid(indexStr: string): void;
}
```

## 6. Verification and Testing Plan
- Unit tests in `tests/sprint_006.test.ts` covering:
  - Valid 15-char H3 index strings.
  - Rejection of non-hex characters.
  - Rejection of invalid lengths (<15 or >15).
  - Validation of resolution ranges (0–15).
  - Error code verification for each failure mode.