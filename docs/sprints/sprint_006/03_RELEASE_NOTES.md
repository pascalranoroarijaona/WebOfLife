<!-- Release Notes -->
# Sprint 006 Release Notes: Uber H3 Index String Format Validation & Error Code Mapping

## Executive Summary
Sprint 006 establishes rigorous spatial validation protocols for the Web of Life simulation engine. By implementing Uber H3 index string format validation and explicit error code mapping within `src/spatial/h3_grid.ts`, this release ensures thermodynamic integrity under the First and Second Laws. Precise spatial bookkeeping prevents matter and energy fluxes mapped across geodetic coordinates from suffering distortion or illegal boundary states.

---

## What's New

### Spatial Validation & Error Handling (`src/spatial/h3_grid.ts`)
- **`H3ErrorCode` Enum**: Introduced deterministic error codes for spatial validation failures:
  - `INVALID_LENGTH` (`H3_ERR_INVALID_LENGTH`)
  - `INVALID_CHARACTER` (`H3_ERR_INVALID_CHARACTER`)
  - `INVALID_RESOLUTION` (`H3_ERR_INVALID_RESOLUTION`)
  - `INVALID_BASE_CELL` (`H3_ERR_INVALID_BASE_CELL`)
  - `NULL_INDEX` (`H3_ERR_NULL_INDEX`)
- **`H3Error` Class**: A domain-specific error class extending native `Error` to encapsulate spatial validation error codes and standardized messages (`[CODE] Message`).
- **`IH3GridValidator` Interface**: Standardizes spatial validation contracts with `validate(indexStr: string)` and `assertValid(indexStr: string)` methods.
- **`H3Validator` Utility**: Static utility class providing robust format checking matching Uber H3 specifications (15-character hexadecimal string format, valid resolution 0–15, and valid base cell bounds 0–122).

### Monad Stock Integration (`src/monads/spatial_monad.ts`)
- Integrated `H3Validator.parseH3()` into spatial monad state transitions.
- Guarantees that raw string or H3 index candidates undergo rigorous validation checks (hexadecimal regex `/^[0-9a-fA-F]{15}$/`, resolution bitmasks, and base cell bitmasks) before matter and energy stocks are permitted to flux across spatial nodes. Failures halt the monad branch cleanly with corresponding `H3Error` exceptions.

---

## Architecture & Class Hierarchy Additions
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

---

## Testing & Verification
- **Unit Testing Suite (`tests/sprint_006.test.ts`)**:
  - Validated successful parsing and acceptance of well-formed 15-character H3 index strings.
  - Verified strict rejection of non-hexadecimal characters.
  - Confirmed rejection of invalid string lengths (< 15 or > 15 characters).
  - Tested resolution range constraints (ensuring values fall within 0–15).
  - Asserted correct mapping and emission of detailed error codes for each explicit failure mode.

---

## Thermodynamic & Spatial Compliance
- **First Law Compliance:** Binds spatial stocks (biomass, nutrient reservoirs, solar radiation flux) strictly to validated H3 indices, eliminating leakage vectors and ensuring absolute conservation of matter and energy.
- **Second Law Compliance:** Enforces entropy accounting by intercepting unresolvable spatial degradation errors and mapping them to deterministic error codes to prevent state space divergence.
- **Solar Input Only:** Preserves the simulation invariant where all spatial energy fluxes originate solely from explicit external solar influx models mapped via valid H3 cells.