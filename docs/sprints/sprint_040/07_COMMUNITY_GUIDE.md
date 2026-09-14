<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 040 Contributor Guide: High-Throughput Spatial Token Extraction with `H3_GLOBAL_CANONICAL_INDEX_PATTERN`

Welcome to the Sprint 040 contributor guide for the **Gaia Web of Life** engine! Whether you are a distributed systems engineer, an open-source contributor passionate about thermodynamic simulation, or a graphics programmer looking to write WebGL compute shaders, this guide will walk you through the newly released spatial indexing primitives and show you how to contribute.

---

## 1. Executive Overview: What Was Shipped in Sprint 040?

In Sprint 040, we standardized canonical Uber H3 spatial token extraction across the entire Web of Life distributed runtime via:
- **`H3_GLOBAL_CANONICAL_INDEX_PATTERN`** in `src/spatial/h3_grid.ts`:
  ```typescript
  export const H3_GLOBAL_CANONICAL_INDEX_PATTERN: RegExp = /\b[0-9a-fA-F]{15}\b/g;
  ```
- **Deterministic Finite Automaton (DFA) execution guarantees**: Strict $\mathcal{O}(N)$ linear time parsing with zero backtracking vectors, immunizing spatial ingest pipelines against Regular Expression Denial of Service (ReDoS).
- **Physical Invariance Enforcement**: Spatial extraction operations are purely informational ($dM/dt = 0$), guaranteeing zero synthetic mass drift in physical biogeochemical stocks (Carbon, Water, Nitrogen, Phosphorus, Oxygen) while accounting for microscopic Landauer dissipation and computational entropy generation ($\Delta S_{\text{entropy}} \ge 0$).
- **Idempotent Token Extraction**: Safe string scanning via `extractCanonicalTokens()` / `extractCanonicalH3Tokens()` ensuring that JavaScript's stateful `RegExp.prototype.lastIndex` pointer does not introduce concurrency race conditions.

---

## 2. Developer Quickstart

### 2.1 Repository Setup

Clone the official repository and set up the Node.js / TypeScript environment:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note**: Web of Life is strictly built with TypeScript and Node.js. Do not use Python, `pip`, or `pytest`.

### 2.2 Running Sprint Verification Tests

Validate your local environment by running the test suite for Sprint 040 using `tsx`:

```bash
npx tsx tests/sprint_040.test.ts
```

All tests should pass, verifying:
1. Exact 15-character hex token recognition (e.g., `8826856235fffff`).
2. Strict rejection of 14-character and 16-character hex strings via `\b` word boundary anchors.
3. False-positive immunity against substrings embedded in 24-character ObjectIds or 32-character UUID/MD5 hashes.
4. Mass conservation ($\Delta M \equiv 0$) when synchronizing spatial cells into `SpatialPartitionMonad`.

---

## 3. Deep Dive: Using the New Primitives

### 3.1 Extracting Tokens from Arbitrary Streams

When handling gossip telemetry packets, spatial log entries, or GeoJSON metadata, extract normalized lowercase canonical tokens using the idempotent wrapper:

```typescript
import { H3Grid, H3_GLOBAL_CANONICAL_INDEX_PATTERN } from './src/spatial/h3_grid';

// Mixed payload containing valid H3 indices and invalid hexadecimal sequences
const logPayload = `
    [POD_SYNC] Peer discovered at cell 8826856235fffff.
    Neighbor cell: 8826856235bffff.
    Transaction hash: 4f3a2b1c8826856235fffff098765432 (should be ignored).
    Short token: a1b2c3d (should be ignored).
`;

// Safe extraction via H3Grid utility (resets regex state and dedupes)
const tokens: string[] = H3Grid.extractCanonicalTokens(logPayload);
console.log(tokens);
// Output: ['8826856235fffff', '8826856235bffff']
```

### 3.2 High-Throughput Streaming Pattern

If you are writing a custom streaming tokenizer over a Node.js `Readable` stream or `TransformStream`, you can iterate directly with match loops:

```typescript
import { H3_GLOBAL_CANONICAL_INDEX_PATTERN } from './src/spatial/h3_grid';

export function* streamTokens(chunk: string): Generator<string> {
    // Clone pattern to avoid shared lastIndex mutation across concurrent asynchronous chunks
    const matcher = new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(chunk)) !== null) {
        yield match[0].toLowerCase();
    }
}
```

---

## 4. Good First Issues & Contributor Opportunities

We welcome open-source contributions! Below are curated extension points ready for development:

### Issue #1: WebGL Instanced Hexagon Highlight Shader (Good First Issue for Graphics/WebGL)
- **Target File**: `src/rendering/shaders/hex_instanced.frag.glsl` and `src/rendering/hex_picker.ts`
- **Objective**: When canonical H3 indices are extracted from telemetry or mouse-hover pick coordinates, highlight matching hexagons on the globe.
- **Requirements**:
  - Accept a uniform array of `vec2` or 64-bit split cell coordinates passed from TypeScript.
  - Implement a fragment glow effect with smooth thermodynamic dissipation falloff.
  - Test via rendering integration tests in headless WebGL or canvas mock.

### Issue #2: Reactive Stream Tokenizer Monad (Good First Issue for Monadic State)
- **Target File**: `src/monads/streaming_spatial_monad.ts`
- **Objective**: Create a reactive stream transformer monad `StreamingSpatialMonad` that wraps Node.js `Transform` streams.
- **Requirements**:
  - Buffer partial character tokens crossing 64KB chunk boundaries so 15-character hex tokens split across chunk boundaries are reconstructed safely.
  - Compute Landauer thermodynamic dissipation for each chunk processed:
    $$E_{\text{comp}} = P_{\text{core}} \cdot \frac{N \cdot 1.2}{3.0 \times 10^9}$$
  - Maintain absolute mass balance ($\Delta M = 0$).

### Issue #3: H3 Resolution-Filtering Pipe
- **Target File**: `src/spatial/h3_filter.ts`
- **Objective**: Filter extracted canonical 15-hex tokens by their Uber H3 resolution (e.g., resolutions 0 through 15) using bitwise operations on the leading nibbles without full un-compacting.
- **Requirements**:
  - Extract tokens via `H3_GLOBAL_CANONICAL_INDEX_PATTERN`.
  - Parse the resolution bitmask (bits 52–55).
  - Add unit tests in `tests/spatial_filter.test.ts`.

---

## 5. Development Workflow & Contribution Guidelines

1. **Fork and Branch**:
   Create a feature branch from `main`:
   ```bash
   git checkout -b feature/h3-streaming-pipeline
   ```
2. **Coding Standards**:
   - Strictly typed TypeScript.
   - Every spatial operation must verify mass conservation ($dM/dt = 0$) and thermodynamic entropy tracking ($dS \ge 0$).
   - Immutability: Freeze state objects using `Object.freeze()` where appropriate.
3. **Running Quality Checks**:
   ```bash
   # Run all sprint test suites
   npx tsx tests/sprint_040.test.ts
   ```
4. **Submitting Your PR**:
   - Reference the issue number.
   - Document any changes in the corresponding sprint docs.
   - Tag the maintainers on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Join us in building the thermodynamic decentralized biosphere simulation!
```

---