# RFC-040: Global Regex Constant for Canonical H3 Index Token Matching (`H3_GLOBAL_CANONICAL_INDEX_PATTERN`)

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Define global regular expression constant `H3_GLOBAL_CANONICAL_INDEX_PATTERN` matching 15-character canonical H3 tokens globally in `src/spatial/h3_grid.ts`.

### 1.2 Purpose & Context
The Gaia Web of Life engine operates as a spatially partitioned thermodynamic monad. Biogeochemical mass, trophic energy transformations, and thermodynamic entropy dissipation are anchored to discrete hexagonal tessellations parameterized by Uber H3 geospatial indices.

As telemetry streams, distributed pod synchronization manifests, and spatial serializations traverse system boundaries (JSON envelopes, spatial SQL dumps, event-sourcing append logs, and peer-to-peer gossip packets), raw unstructured text frequently embeds canonical 15-hexadecimal-character H3 index strings (e.g., `8826856235fffff`). Prior iterations introduced localized string parsers or non-global single-match validators (`^[0-9a-fA-F]{15}$`). However, parsing bulk spatial payloads, log streams, and serialized vector topology requires a standardized, immutable, globally flagged regex constant that performs zero-allocation match scanning across continuous text buffers without drift or regex re-compilation overhead.

RFC-040 specifies the formal definition, token morphology, compilation flags, zero-backtracking guarantees, and spatial monad integration contracts for `H3_GLOBAL_CANONICAL_INDEX_PATTERN` in `src/spatial/h3_grid.ts`.

---

## 2. Spatial & Thermodynamic Invariants

### 2.1 Spatial Partition Invariance
Every Earth Pod and trophic biomass monad is bound to a valid 64-bit unsigned integer H3 cell representation, canonically serialized as a 15-character hexadecimal string (`resolutions 0` through `15`).
- The canonical string length is invariant: exactly 15 hexadecimal characters (`[0-9a-fA-F]`).
- H3 canonical index strings are case-insensitive in parsing, standardizing on lowercase hex (`[0-9a-f]`) upon internal canonicalization.
- Global token extraction must isolate valid discrete tokens without altering the underlying spatial topology or violating coordinate reference parity.

### 2.2 First and Second Law Compliance
- **First Law (Mass Conservation):** Spatial indexing and regex token parsing are strictly informational operations with zero mass transfer ($dM/dt = 0$). Extracting spatial tokens must never synthesize or discard physical biomass stocks (Carbon, Nitrogen, Phosphorus, Water) mapped to the corresponding cells.
- **Second Law (Thermodynamic Irreversibility):** Regex execution incurs computational work. The matching pattern must be strictly bounded in execution time ($\mathcal{O}(N)$ deterministic finite automaton scan), preventing catastrophic regular expression denial of service (ReDoS), runaway state transitions, or unmodeled entropy generation.

---

## 3. Specification of `H3_GLOBAL_CANONICAL_INDEX_PATTERN`

### 3.1 Formal Regular Expression Architecture
The global canonical index pattern is specified to match all 15-character hexadecimal H3 tokens across any arbitrary document or serialized payload:

```typescript
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN: RegExp = /\b[0-9a-fA-F]{15}\b/g;
```

#### Token Mechanics:
1. `\b`: Word boundary anchor ensuring that substrings within longer alphanumeric sequences (e.g., 24-character MongoDB ObjectIds or 32-character MD5 hashes) are rejected and not erroneously sliced into false 15-character H3 matches.
2. `[0-9a-fA-F]{15}`: Exactly 15 contiguous hexadecimal characters representing the 60-bit payload of a canonical H3 index (with leading nibble zero-suppressed to 15 hex digits).
3. `\b`: Trailing word boundary anchor.
4. `g`: Global flag enabling stateful iterator scanning (`RegExp.prototype.exec`), match arrays (`String.prototype.matchAll`), and bulk extraction pipelines.

### 3.2 State Safety & Idempotent Scanning
Because JavaScript regular expressions with the `/g` flag maintain an internal mutable `lastIndex` pointer:
- Utility wrappers within `H3Grid` must provide idempotent token extraction helpers (e.g., `extractH3Tokens(content: string): string[]`) that either clone the RegExp, utilize `matchAll`, or ensure `lastIndex = 0` prior to and after scanning.
- Direct export of `H3_GLOBAL_CANONICAL_INDEX_PATTERN` enables high-performance streaming tokenizers to stream chunks into `exec()` loops across large spatial ingest pipelines.

---

## 4. Class Hierarchy & Monadic Contracts

### 4.1 Module Structure Updates (`src/spatial/h3_grid.ts`)
`src/spatial/h3_grid.ts` serves as the primary spatial grid subsystem. The constant is exported alongside the existing `H3Grid` class and spatial utilities:

```typescript
/**
 * Global pattern matching 15-character canonical H3 spatial index tokens within arbitrary text streams.
 * Utilizes word boundaries to prevent false-positive matching on sub-segments of longer hexadecimal hashes.
 */
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;

export class H3Grid {
    /**
     * Scans an arbitrary string or serialized stream for all canonical 15-character H3 index tokens.
     * Returns an immutable array of unique canonical lowercase H3 index strings.
     *
     * @param payload Unstructured string containing serialized spatial entities
     * @returns Array of unique validated canonical H3 indices
     */
    public static extractCanonicalTokens(payload: string): string[] {
        if (!payload || typeof payload !== 'string') {
            return [];
        }
        const matches = payload.matchAll(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'gi'));
        const uniqueTokens = new Set<string>();
        for (const match of matches) {
            uniqueTokens.add(match[0].toLowerCase());
        }
        return Array.from(uniqueTokens);
    }
}
```

### 4.2 Integration with `SpatialMonad` and `EarthPod`
- **SpatialMonad Serialization:** When de-serializing spatial envelopes (`SpatialMonad.fromJSON` or graph telemetry logs), `H3Grid.extractCanonicalTokens` or `H3_GLOBAL_CANONICAL_INDEX_PATTERN` will be used to recover cell addresses from mixed log metadata.
- **Topological Integrity:** Each extracted token maps to `H3Index` types defined in `src/spatial/h3_types.ts`, verifying spatial partition validity before trophic allocation.

---

## 5. Algorithmic Complexity & ReDoS Audit

- **Time Complexity:** The regular expression $\mathcal{O}(N)$ where $N$ is the character length of the target string. The subpattern `[0-9a-fA-F]{15}` contains fixed quantification (`{15}`) with no nested quantifiers or overlapping union branches.
- **Space Complexity:** $\mathcal{O}(1)$ working memory during DFA transition; $\mathcal{O}(M)$ for resulting tokens where $M \le N / 15$.
- **Vulnerability Check:** Zero backtracking vectors exist. The pattern conforms to strict Chomsky Type-3 regular grammar, ensuring immune status against ReDoS attacks under high-throughput spatial event ingestion.

---

## 6. Verification & Test Strategy

### 6.1 Unit Test Coverage (`tests/sprint_040.test.ts`)
The test suite will validate:
1. **Direct Regex Validation:**
   - Matches exactly 15 hexadecimal characters (both lowercase and uppercase).
   - Global match extraction across multi-line spatial payloads containing multiple indices.
2. **Boundary & False-Positive Rejection:**
   - 14-character hex strings: Rejection.
   - 16-character hex strings: Rejection (word boundary enforcement).
   - Non-hexadecimal 15-character strings (e.g., `8826856235ggggg`): Rejection.
   - Embedded 15-char substrings inside 32-char UUID/MD5 hex sequences: Rejection.
3. **Execution Semantics:**
   - `H3_GLOBAL_CANONICAL_INDEX_PATTERN.global === true`.
   - Repeated executions via `matchAll` or regex clones maintain purity and deterministic token outputs.
4. **Thermodynamic Invariance:**
   - Verified zero impact on biomass conservation across trophic stocks when parsing spatial tokens.

---

## 7. Migration & Architectural Backlog

- **Deprecation Path:** Any internal ad-hoc string slicing (`str.slice(0, 15)`) or unanchored hex parsers across `src/spatial/` will be refactored to consume `H3_GLOBAL_CANONICAL_INDEX_PATTERN`.
- **Downstream Sprints:** Subsequent sprints will wire `H3_GLOBAL_CANONICAL_INDEX_PATTERN` into streaming pipeline decoders for distributed peer-to-peer pod consensus.