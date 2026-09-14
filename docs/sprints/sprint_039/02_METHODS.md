# Sprint 039 — Method Specifications: Canonical H3 Grid Validation & Spatial Invariant Guarding

## 1. Scientific & Biophysical Foundations

### 1.1 Discrete Global Grid Partitioning of Biosphere Stocks
The Web of Life planetary simulation discretizes Earth's continuous boundary layer into non-overlapping terrestrial/oceanic hexagonal cells using the Uber H3 Discrete Global Grid System (DGGS). Each spatial cell at index $h \in \mathcal{H}_3$ anchors a thermodynamic state vector $\mathbf{S}_h$:

$$\mathbf{S}_h = \begin{bmatrix} C_h \\ W_h \\ N_h \\ P_h \\ O_{2,h} \\ Q_h \end{bmatrix} \in \mathbb{R}_{\ge 0}^6$$

where:
- $C_h$: Organic and inorganic carbon stock ($\text{mol C}$)
- $W_h$: Bioavailable water stock ($\text{mol } \text{H}_2\text{O}$)
- $N_h$: Reactive nitrogen stock ($\text{mol N}$)
- $P_h$: Phosphorus stock ($\text{mol P}$)
- $O_{2,h}$: Dissolved / atmospheric oxygen stock ($\text{mol } \text{O}_2$)
- $Q_h$: Thermal internal energy ($\text{J}$)

Total planetary conservation demands:
$$\sum_{h \in \mathcal{H}_3} \mathbf{S}_h(t) = \mathbf{S}_{\text{total}}(t) \quad \text{with} \quad \frac{d}{dt}\mathbf{S}_{\text{total}} = \mathbf{\Phi}_{\text{solar}} - \mathbf{\Phi}_{\text{rerad}}$$

### 1.2 The "Ghost Monad" Topology Failure
When an unvalidated or corrupt string token $k \notin \mathcal{H}_{3,\text{canonical}}$ is ingested:
1. Spatial indexing maps $k$ to an orphaned hash bucket outside the icosahedral adjacency graph.
2. Advective and diffusive fluxes $\mathbf{J}_{i \to k}$ allocate non-zero mass-energy into $k$:
   $$\frac{d\mathbf{S}_k}{dt} = \sum_{i \in \text{neighbors}(k)} \mathbf{J}_{i \to k} > 0$$
3. Because $k$ possesses invalid topological coordinates, neighboring lookups (`getNeighbors(k)`, `kRing(k, r)`) fail to route return fluxes ($\mathbf{J}_{k \to i} = 0$).
4. The cell becomes an unphysical sink or "ghost monad", resulting in thermodynamic stock drift:
   $$\Delta \mathbf{S}_{\text{leak}} = \int_0^t \mathbf{J}_{i \to k} \, dt \ne \mathbf{0}$$

Asserting canonical format at the ingress perimeter guarantees that no state allocation occurs for unaddressable cells, preserving $\Delta \mathbf{S}_{\text{leak}} = \mathbf{0}$.

---

## 2. Mass & Energy Conservation Deltas

Validation is a strict thermodynamic gate. In accordance with the First and Second Laws of Thermodynamics, the syntactic validation step must be purely non-mutating and conservative with respect to planetary stocks.

### 2.1 State Vector Deltas
For any execution of $\texttt{assertCanonicalH3Pattern}(k)$:

$$\begin{aligned}
\Delta C &= 0.000000 \times 10^0 \text{ mol C} \\
\Delta H_2O &= 0.000000 \times 10^0 \text{ mol } \text{H}_2\text{O} \\
\Delta N &= 0.000000 \times 10^0 \text{ mol N} \\
\Delta P &= 0.000000 \times 10^0 \text{ mol P} \\
\Delta O_2 &= 0.000000 \times 10^0 \text{ mol } \text{O}_2 \\
\Delta Q &= 0.000000 \times 10^0 \text{ J}
\end{aligned}$$

### 2.2 Rejection State Transition
When $k$ fails validation, execution halts via `H3ValidationError` prior to any monad instantiation or flux operator invocation:

$$\mathcal{T}_{\text{assert}}(k, \mathbf{S}) \to \begin{cases}
(\text{void}, \mathbf{S}) & \text{if } k \in \mathcal{L}(\text{CANONICAL\_H3\_REGEX}) \\
\bot (\text{H3ValidationError}) & \text{if } k \notin \mathcal{L}(\text{CANONICAL\_H3\_REGEX})
\end{cases}$$

No allocation $\mathbf{S}_{new}$ is materialized. Mass and energy deltas across the planetary register are strictly zero.

---

## 3. Formal Pattern Specification

### 3.1 Mode-1 H3 Bit Architecture
An H3 index is a 64-bit word. Canonical cell representations require:
- **Bit 63**: `0`
- **Bits 59–62**: `0001` (Mode 1: Hexagonal Cell)
- High nibble (bits 60–63): `0001_2` $\to$ `0x8`
- Total characters: 15 hexadecimal digits without leading zero padding, or 16 digits if zero-padded.

Under canonical serialization in `src/spatial/`, all active cell indices are normalized to 15-character hexadecimal strings starting with `8` (case-insensitive on ingress):

$$\mathcal{L}(\text{CANONICAL\_H3\_REGEX}) = \left\{ s \in \Sigma^* \;\middle|\; |s| = 15 \land s[0] = \text{'8'} \land \forall i \in [1, 14], s[i] \in [0\text{-}9a\text{-}fA\text{-}F] \right\}$$

### 3.2 Formal Regular Expression
```typescript
export const CANONICAL_H3_REGEX = /^8[0-9a-fA-F]{14}$/;
```

---

## 4. Concrete Monad Methods & Error Topologies

### 4.1 Error Hierarchy (`src/spatial/h3_types.ts`)

```typescript
/**
 * Root spatial grid domain exception.
 */
export class SpatialGridError extends Error {
  public override readonly name = "SpatialGridError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when an H3 index token violates canonical syntax, pattern, or resolution constraints.
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

### 4.2 Assertion Method Contract (`src/spatial/h3_grid.ts`)

```typescript
/**
 * Asserts that a token conforms to the canonical 15-character H3 hexadecimal cell format.
 *
 * @param token - The string candidate to be verified.
 * @throws {H3ValidationError} If token is not a string, is improperly formatted, or fails the canonical regex.
 */
export function assertCanonicalH3Pattern(token: string): void {
  if (typeof token !== "string") {
    throw new H3ValidationError(String(token), "Token must be a string");
  }
  if (!CANONICAL_H3_REGEX.test(token)) {
    throw new H3ValidationError(token, "Does not match canonical H3 cell pattern /^8[0-9a-fA-F]{14}$/");
  }
}
```

### 4.3 Monadic Stock Ingress Guard (`SpatialMonad` Integration)

```typescript
/**
 * Guarded instantiation of a SpatialMonad holding thermodynamic stocks.
 */
export function createSpatialMonad(
  token: string,
  stocks: ThermodynamicStocks
): SpatialMonad {
  // Layer 1: Lexical Pattern Assertion
  assertCanonicalH3Pattern(token);

  // Invariant confirmation: Zero stock leakage prior to boundary acceptance
  assertZeroLeakage(stocks);

  return new SpatialMonad(token.toLowerCase(), stocks);
}

function assertZeroLeakage(stocks: ThermodynamicStocks): void {
  if (
    stocks.carbon < 0 ||
    stocks.water < 0 ||
    stocks.nitrogen < 0 ||
    stocks.phosphorus < 0 ||
    stocks.oxygen < 0 ||
    stocks.thermalEnergy < 0
  ) {
    throw new SpatialGridError("Non-physical negative stock detected during monad allocation");
  }
}
```

---

## 5. Verification Matrix & Edge Case Topologies

| Input Token | Type / Length | Expected Result | Reason |
| :--- | :--- | :--- | :--- |
| `'8828308281fffff'` | `string` (15) | **Pass** | Canonical Mode-1 resolution 8 index |
| `'8a2a1072b59ffff'` | `string` (15) | **Pass** | Canonical Mode-1 resolution 10 index |
| `'85283473FFFFFFF'` | `string` (15) | **Pass** | Valid upper-case hex characters |
| `'8828308281ffff'` | `string` (14) | **Fail** (`H3ValidationError`) | Underlength (14 hex chars) |
| `'8828308281ffffff'` | `string` (16) | **Fail** (`H3ValidationError`) | Overlength / non-canonical 16-char padded |
| `'7828308281fffff'` | `string` (15) | **Fail** (`H3ValidationError`) | Invalid high nibble (`7` $\ne$ `8`) |
| `'9828308281fffff'` | `string` (15) | **Fail** (`H3ValidationError`) | Invalid high nibble (`9` $\ne$ `8`) |
| `'8828308281fffgz'` | `string` (15) | **Fail** (`H3ValidationError`) | Non-hexadecimal characters (`'g'`, `'z'`) |
| `' 8828308281fffff '` | `string` (17) | **Fail** (`H3ValidationError`) | Leading/trailing whitespace violation |
| `null` / `undefined` | `null` / `undefined` | **Fail** (`H3ValidationError`) | Type invariant violation |
| `123456789012345` | `number` | **Fail** (`H3ValidationError`) | Non-string numeric type violation |