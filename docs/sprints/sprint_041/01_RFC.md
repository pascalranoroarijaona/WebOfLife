# RFC-041: Deduplicated Canonical H3 Token Extraction Helper

- **Status**: Accepted
- **Author**: Chief Systems Architect
- **Sprint**: 041
- **Domain**: `src/spatial/h3_grid.ts` & `src/spatial/h3_types.ts`
- **Related Systems**: `SpatialMonad`, `H3Grid`, `EarthPod`, `TrophicDynamics`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement the deduplicated canonical token extraction helper:
```typescript
export function extractUniqueCanonicalH3Tokens(text: string): string[];
```
in `src/spatial/h3_grid.ts`.

### 1.2 Architectural Rationale
As planetary sensor streams, biological telemetry logs, and distributed spatial monads exchange thermodynamic and ecological payloads, unstructured textual payloads (GeoJSON metadata, cell stream logs, URI query parameters, and human-annotated telemetry) frequently contain mixed representations of H3 cell index tokens.

To prevent spatial ambiguity, non-deterministic cell routing, and memory leaks across the planetary spatial substrate, the engine requires a pure, deterministic, deduplicated canonical token extractor. This helper extracts, validates, normalizes (canonicalizes to lowercase hexadecimal format), and deduplicates H3 index tokens in order of appearance.

---

## 2. Theoretical & Thermodynamic Foundations

### 2.1 Thermodynamic Conservation Compliance
1. **First Law (Matter Conservation)**:
   - String processing, regex parsing, and token canonicalization do not create, destroy, or transmute simulated biophysical matter or trophic biomass stocks ($M_{\text{total}} = \text{const}$).
   - The token extraction is a zero-mass, read-only functional operation over information entropy buffers.
2. **Second Law (Information Entropy & Dissipation)**:
   - Parsing arbitrary telemetry strings carries an informational thermodynamic cost bounded by $O(N)$ character traversal time and $O(K)$ space complexity, where $N$ is text length and $K$ is the number of distinct valid H3 tokens.
   - By deduplicating tokens deterministically at the extraction boundary, downstream spatial lookups, adjacency graphs, and monad evaluations avoid redundant entropy dissipation and prevent extraneous hash queries.

---

## 3. Specification & Formal Contract

### 3.1 Function Signature
```typescript
/**
 * Extracts, canonicalizes, and deduplicates valid H3 hexadecimal index tokens from arbitrary text.
 *
 * @param text - Unstructured or semi-structured string potentially containing H3 index tokens.
 * @returns Array of lowercase 15-character canonical H3 index strings, deduplicated in order of first appearance.
 */
export function extractUniqueCanonicalH3Tokens(text: string): string[];
```

### 3.2 Canonical H3 Token Definition
An H3 index token is considered canonical in the Web of Life spatial substrate if:
1. **Length**: Exactly 15 hexadecimal characters.
2. **Character Set**: Hexadecimal characters `[0-9a-fA-F]`.
3. **Canonical Normalization**: Normalized to lower-case representation (`[0-9a-f]{15}`).
4. **H3 Index Structure**: Must conform to standard H3 cell index bits:
   - Non-zero cell index mode (Mode 1 = cell index).
   - Valid resolution range ($0 \le r \le 15$).
5. **Boundary Delimiters**: Matched with word-boundary awareness (`\b[0-9a-fA-F]{15}\b`) to avoid extracting sub-slices of longer alphanumeric hashes (such as 32-character or 64-character SHA/UUID strings).

### 3.3 Deduplication & Ordering Invariants
- **Deduplication**: Case-insensitive uniqueness. If `882681E049FFFFF` and `882681e049fffff` appear in the same input text, only the first occurrence is retained as `882681e049fffff`.
- **Order Preservation**: Output order strictly preserves the order of first encounter in the source text (FIFO discovery order).
- **Empty / Null Input Safety**: Null, undefined, empty strings, or strings devoid of valid tokens return an empty array `[]`.

---

## 4. Object-Oriented Class Hierarchy & Integration

```
+-------------------------------------------------------------+
|                     src/spatial/h3_types.ts                 |
| + type H3Index = string                                     |
| + interface IH3TokenExtractor                               |
+-------------------------------------------------------------+
                              ^
                              | implements / utilizes
+-------------------------------------------------------------+
|                     src/spatial/h3_grid.ts                  |
| + extractUniqueCanonicalH3Tokens(text: string): string[]    |
| + class H3Grid                                              |
|   + parseTokens(input: string): H3Index[]                   |
|   + getCell(index: H3Index): H3Cell                         |
+-------------------------------------------------------------+
                              ^
                              | composes
+-------------------------------------------------------------+
|                 src/monads/spatial_monad.ts                 |
| + class SpatialMonad<T>                                     |
|   + ingestTelemetry(rawLog: string): SpatialMonad<T>        |
+-------------------------------------------------------------+
```

### 4.1 Interface Contract
```typescript
export interface IH3TokenExtractor {
  extractTokens(text: string): string[];
}
```

### 4.2 Incremental Integration with `H3Grid`
In `src/spatial/h3_grid.ts`, the existing `H3Grid` utility class will expose a static method delegating directly to `extractUniqueCanonicalH3Tokens`, maintaining backwards compatibility while offering both functional and object-oriented invocation styles:

```typescript
export class H3Grid {
  // Existing H3Grid implementation...

  /**
   * Static helper adhering to IH3TokenExtractor semantics.
   */
  public static extractUniqueCanonicalTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }
}
```

---

## 5. Algorithmic Implementation Details

### 5.1 Regular Expression & Parsing
```typescript
const H3_INDEX_REGEX = /\b([0-9a-fA-F]{15})\b/g;
```

1. Guard against empty/invalid input: return `[]` if `!text || typeof text !== 'string'`.
2. Reset regex execution pointer (`H3_INDEX_REGEX.lastIndex = 0`) or execute `text.match(H3_INDEX_REGEX)`.
3. Iterate over matches:
   - Normalize candidate: `const canonical = token.toLowerCase();`
   - Validate index semantics via `isValidH3Index(canonical)` (verifying resolution and cell mode).
   - If not already present in a tracking `Set<string>`, append `canonical` to `results: string[]` and insert into the `Set`.
4. Return `results`.

### 5.2 Algorithmic Complexity
- **Time Complexity**: $O(N)$ scan where $N$ is text character length; $O(M)$ hash set insertions where $M$ is token match count.
- **Space Complexity**: $O(K)$ where $K$ is the number of unique canonical tokens extracted, ensuring minimal heap footprint.

---

## 6. Monad Stock Transitions & State Immutability

The helper function is purely referentially transparent ($f: \text{String} \to \text{Array}\langle\text{H3Index}\rangle$). It introduces zero state mutations to:
- `AtmosphereStock` ($CO_2$, $O_2$, $N_2$)
- `BiomassStock` (Autotrophs, Herbivores, Carnivores)
- `ThermalStock` (Sensible & Latent heat)

In `SpatialMonad`, chaining `extractUniqueCanonicalH3Tokens` enables atomic cell ingestion without mutating monad stock balances:
```typescript
spatialMonad.bind(grid => {
  const tokens = extractUniqueCanonicalH3Tokens(telemetryPayload);
  return tokens.reduce((acc, token) => acc.activateCell(token), grid);
});
```

---

## 7. Verification & Test Strategy (`tests/sprint_041.test.ts`)

The test suite will validate:
1. **Standard Extraction**: Mixed casing (`882681E049FFFFF`, `882681e049fffff`) extracts single lowercase token.
2. **Multiple Unique Indices**: Distinct cell tokens in arbitrary prose extracted in exact appearance order.
3. **Delimiter Resilience**: Tokens bounded by punctuation, commas, brackets, newlines, and JSON quotes.
4. **False Positive Rejection**:
   - 14-char or 16-char hex strings ignored.
   - 32-char UUIDs / MD5 hashes ignored.
   - Hex tokens with invalid resolution / mode bits rejected.
5. **Edge Cases**:
   - Empty string `""`.
   - String with no matches.
   - Repetitive identical tokens.
   - Non-string / falsy guards.
6. **Thermodynamic Invariant**: Ensure no stock drift in `EarthPod` when parsing high-frequency telemetry streams.

---

## 8. Rollout Plan & Artifact Deliverables
1. **Code**: Add `extractUniqueCanonicalH3Tokens` and `H3Grid.extractUniqueCanonicalTokens` to `src/spatial/h3_grid.ts`.
2. **Types**: Export `H3Index` token contracts in `src/spatial/h3_types.ts`.
3. **Tests**: Create comprehensive test specifications in `tests/sprint_041.test.ts`.
4. **Documentation**: Sprint 041 documentation suite (`02_METHODS.md`, `03_RELEASE_NOTES.md`, `04_AUDIT.md`, `05_ACADEMIC_PREPRINT.*`, etc.).