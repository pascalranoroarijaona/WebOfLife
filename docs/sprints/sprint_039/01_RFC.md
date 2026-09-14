# RFC 039: Spatial Grid Validation — Canonical H3 Regex Assertions and Error Topologies

- **Author**: Chief Systems Architect
- **Status**: Proposed
- **Created**: 2025-02-14
- **Sprint Target**: Sprint 039
- **Domain**: `src/spatial/h3_grid.ts`, `src/spatial/h3_types.ts`
- **Related Systems**: `SpatialMonad`, `H3GridAdjacency`, `EarthPod`

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
The Web of Life simulation models continuous mass-energy conservation across discrete geospatial partitions of the biosphere. Geospatial locality is partitioned using the Uber H3 discrete global grid system (DGGS). In prior sprints (Sprint 037, Sprint 038), topological adjacency, directional ring queries, and resolution transformations were established within `src/spatial/h3_adjacency.ts` and `src/spatial/h3_grid.ts`.

### 1.2 Problem Statement
Hexagonal spatial coordinates are serialized as 64-bit hexadecimal string tokens across spatial monads and thermodynamic pod interfaces. Unsanitized strings, malformed tokens, non-hexadecimal characters, or invalid string lengths propagate silently into spatial hash lookups and matrix operators. This failure mode allows non-physical disconnected topologies to accept flux allocations, destabilizing mass-energy conservation invariants.

### 1.3 Proposed Solution
We introduce an explicit, zero-overhead regex-driven format validator:
```typescript
assertCanonicalH3Pattern(token: string): void
```
which validates that any arbitrary string conforms strictly to canonical 15-character or 16-character canonical H3 hexadecimal cell index representations. If the token violates the format invariant, it raises a dedicated, strongly typed `H3ValidationError`.

---

## 2. Thermodynamic & Spatial Invariants

Even purely lexical or syntactic validators within the spatial subsystem must uphold the fundamental thermodynamic constraints of the Web of Life engine:

1. **First Law of Thermodynamics (Conservation of Energy/Mass)**:
   A spatial index is the coordinate key for thermodynamic stocks (biomass, carbon, nitrogen, phosphorus, water, thermal energy). Accepting a corrupt H3 token creates "ghost monads" where stock values can be trapped or leaked outside the closed planetary budget. Rejection via `assertCanonicalH3Pattern` ensures zero state-stock mutation on invalid input.

2. **Second Law of Thermodynamics (Entropy Non-Decrease)**:
   Validation operations are strictly deterministic and idempotent ($\Delta S_{computation} \ge 0$). No computational step during validation allocates synthetic energy or creates energetic free lunches.

3. **Spatial Determinism and Isomorphism**:
   Every valid H3 cell index uniquely maps to a single topological polytope on the icosahedron-projected terrestrial globe. The regex enforces canonical lower-case or upper-case 15/16-hex representation matching Uber H3 Mode-1 cell specifications.

---

## 3. Specification of the Canonical H3 Pattern

### 3.1 Hexadecimal Index Anatomy
An H3 index is a 64-bit unsigned integer formatted as a hexadecimal string:
- **Bit 63**: Reserved (0).
- **Bits 59-62**: Mode (1 indicates an ordinary hexagonal cell).
- **Bits 56-58**: Edge / Mode auxiliary.
- **Bits 52-55**: Base cell number (0 to 121).
- **Bits 0-51**: Directional child indices for resolutions 1 through 15 (each resolution occupies 3 bits, values 0–6, with 7 denoting unallocated resolution).

When stringified, canonical Uber H3 tokens are represented as 15-character hexadecimal strings (starting with `8`, reflecting mode `1` shifted into the high nibble) or padded 16-character hexadecimal strings starting with `08` or `8`. The standard canonical representation used in Web of Life serialization is the 15-character hexadecimal string beginning with `8` (case-insensitive for ingress, canonically normalized to lowercase):
$$\mathcal{P}_{\text{canonical}} = \texttt{/^8[0-9a-fA-F]{14}$/}$$

To support legacy systems providing a leading zero (16 characters: `08...`), the strict canonical check allows the definitive 15-hex mode-1 standard while enabling an exact canonical assertion. For the sprint requirement, the canonical H3 cell pattern is formally:
$$\text{PATTERN} = \texttt{/\^{}(8|08)[0-9a-fA-F]\{14\}\$/}$$
or the standard 15-hex format:
$$\text{PATTERN}_{\text{canonical15}} = \texttt{/\^{}8[0-9a-fA-F]\{14\}\$/}$$

For this RFC, `assertCanonicalH3Pattern` evaluates against:
```typescript
export const CANONICAL_H3_REGEX = /^8[0-9a-fA-F]{14}$/;
```

---

## 4. Class Hierarchy & Interface Contracts

### 4.1 Error Hierarchy
In `src/spatial/h3_types.ts` (or exported via `h3_grid.ts`):

```typescript
/**
 * Root domain error for spatial grid coordinate and indexing anomalies.
 */
export class SpatialGridError extends Error {
  public override readonly name = "SpatialGridError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when an H3 index token fails canonical syntax or topological boundary criteria.
 */
export class H3ValidationError extends SpatialGridError {
  public override readonly name = "H3ValidationError";
  public readonly token: string;

  constructor(token: string, details?: string) {
    const reason = details ? `: ${details}` : "";
    super(`Invalid canonical H3 index token '${token}'${reason}`);
    this.token = token;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 4.2 Function Contract: `assertCanonicalH3Pattern`
In `src/spatial/h3_grid.ts`:

```typescript
/**
 * Validates that an H3 string token matches the canonical 15-character hexadecimal pattern.
 *
 * @param token - The candidate H3 string index to validate.
 * @throws {H3ValidationError} When the token is not a string or fails the canonical H3 regex pattern.
 */
export function assertCanonicalH3Pattern(token: string): void;
```

#### Pre-conditions:
- `token` must be of type `string` (if runtime type is corrupted or non-string, `H3ValidationError` is thrown immediately).
- `token.trim().length === 15` (no whitespace padding permitted).

#### Post-conditions:
- Returns `void` cleanly if and only if `token` strictly satisfies `CANONICAL_H3_REGEX.test(token)`.
- If invalid, throws an instance of `H3ValidationError` containing the offending token.

---

## 5. Integration with SpatialMonad and H3Grid

### 5.1 Defense-in-Depth Pipeline
`assertCanonicalH3Pattern` serves as Layer 1 (syntactic validation) within the grid pipeline:
```
[ Raw Ingress String ]
          │
          ▼
assertCanonicalH3Pattern(token) ───[Fails]───► throw H3ValidationError
          │
          ▼ [Passes]
assertValidH3Resolution(token)  ───[Fails]───► throw H3ResolutionError
          │
          ▼ [Passes]
H3GridCell / SpatialMonad Instantiate
```

### 5.2 Method Ingestion Points
1. **`H3Grid.getNeighbors(token: string)`**: Guarded with `assertCanonicalH3Pattern(token)`.
2. **`H3Grid.kRing(token: string, radius: number)`**: Guarded with `assertCanonicalH3Pattern(token)`.
3. **`SpatialMonad.fromH3(token: string, stocks: ThermodynamicStocks)`**: Syntactic guard executed before thermodynamic state registration.

---

## 6. Monad Stock Transitions & Thermodynamic Safety

The validator execution maintains strict non-interference with system state:

$$\mathcal{T}_{\text{assert}}: (\mathcal{S}_{\text{monad}}, \text{token}) \to \begin{cases}
\mathcal{S}_{\text{monad}} & \text{if } \text{token} \in \mathcal{L}(\text{CANONICAL\_H3\_REGEX}) \\
\bot (\text{H3ValidationError}) & \text{otherwise}
\end{cases}$$

No thermodynamic stock transitions are committed until syntactic and semantic validation have fully succeeded.

---

## 7. Test Suite Requirements (`tests/sprint_039.test.ts`)

1. **Acceptance of Valid Canonical H3 Tokens**:
   - Standard resolution 0–15 tokens (e.g., `'8828308281fffff'`, `'8a2a1072b59ffff'`, `'85283473fffffff'`).
   - Upper-case and lowercase hex representations.
2. **Rejection of Syntactically Invalid Tokens**:
   - Short tokens: `'8828308281ffff'` (14 chars).
   - Long tokens: `'8828308281ffffff'` (16 chars).
   - Non-hex characters: `'8828308281fffgz'`, `'8828308281fff-!'`.
   - Missing leading 8: `'7828308281fffff'`, `'9828308281fffff'`.
   - Null, undefined, empty string, or whitespace-padded: `' 8828308281fffff '`.
3. **Error Subtyping Invariant**:
   - Thrown error must be an `instanceof H3ValidationError`.
   - Thrown error must be an `instanceof SpatialGridError`.
   - Thrown error must be an `instanceof Error`.
   - Property `error.token` must equal the invalid input token.

---

## 8. Summary of File Modifications
- **`src/spatial/h3_types.ts`**: Declare `SpatialGridError` and `H3ValidationError`.
- **`src/spatial/h3_grid.ts`**: Export `CANONICAL_H3_REGEX` and implement `assertCanonicalH3Pattern(token: string): void`.
- **`tests/sprint_039.test.ts`**: Comprehensive suite verifying canonical format verification.