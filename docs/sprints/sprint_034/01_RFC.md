# RFC 034: H3 Token Non-Hexadecimal Symbol Validation Error Throwing

## 1. Executive Summary & Sprint Goal
**Sprint Goal:** Implement invalid character error throwing when an H3 token contains non-hexadecimal symbols in `src/spatial/h3_grid.ts`.

As part of the continuous evolution of the Web of Life spatial indexing infrastructure (Web of Life simulation matrix), rigorous validation of spatial identifiers (H3 tokens) ensures physical thermodynamic state consistency across planetary nodes. Injecting non-hexadecimal symbols into H3 grid tokens corrupts spatial coordinate transformations, leading to entropy violations and untracked spatial drift. This RFC formalizes the architecture for rigorous regex-based and parser-level validation of H3 string tokens, throwing descriptive runtime errors when invalid characters are detected.

---

## 2. Architectural Scope & Repository Additions

### 2.1 Affected Components
- **`src/spatial/h3_grid.ts`**: Core spatial grid indexing engine where H3 strings are validated, parsed, and converted into coordinate grids or monad mappings.
- **`src/monads/spatial_monad.ts`**: Spatial monad container interfacing with `h3_grid.ts` to uphold conservation laws and manage spatial stocking.
- **`tests/sprint_034.test.ts`**: Verification suite validating error throwing for invalid characters (e.g., letters `g`-`z`, special characters, symbols, whitespace).

### 2.2 Class Hierarchy & Interface Contracts
- **`H3ValidationError`**: Custom subclass of `Error` thrown specifically when an H3 token violates structural or hexadecimal constraints.
- **`H3GridValidator`**: Static utility class within `src/spatial/h3_grid.ts` responsible for token sanitization and regex validation.

```ts
export class H3ValidationError extends Error {
  constructor(token: string, message: string) {
    super(`H3ValidationError [Token: "${token}"]: ${message}`);
    this.name = "H3ValidationError";
  }
}
```

---

## 3. Thermodynamic Compliance (First & Second Laws)

1. **First Law (Matter Conservation):** Invalid spatial tokens represent unphysical matter allocations in the simulation topology. Rejecting malformed strings prevents phantom spatial leakage and unallocated biomass/energy tracking across trophic layers.
2. **Second Law (Entropy Management):** Enforcing strict boundary checks lowers computational and informational entropy by eliminating undefined state behaviors during spatial neighbor lookups and adjacency transformations. Solar input continues to drive valid biochemical transformations without disruption from corrupted coordinate states.

---

## 4. Implementation Specification

### 4.1 Regular Expression Validation Rule
Standard H3 tokens are hexadecimal strings of variable length (typically 15 characters for standard resolution indices, but parser supports valid hex formats). 
- **Valid Pattern:** `/^[0-9a-fA-F]+$/`
- **Invalid Pattern Trigger:** Any character matching `[^0-9a-fA-F]` or empty/whitespace strings.

### 4.2 Integration into `src/spatial/h3_grid.ts`
```ts
export function validateH3Token(token: string): void {
  if (!token || typeof token !== "string") {
    throw new H3ValidationError(token, "H3 token must be a non-empty string.");
  }
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(token)) {
    throw new H3ValidationError(token, "H3 token contains non-hexadecimal symbols.");
  }
}
```

---

## 5. Acceptance Criteria
1. Calling H3 grid methods or validation functions with tokens containing non-hexadecimal characters (e.g., `'8f2685ffffffffffZ'`, `'not-a-token!'`, `'8f268g...'`) immediately throws an instance of `H3ValidationError`.
2. Valid hexadecimal tokens pass without throwing.
3. Unit tests in `tests/sprint_034.test.ts` achieve 100% branch coverage over the validation logic.