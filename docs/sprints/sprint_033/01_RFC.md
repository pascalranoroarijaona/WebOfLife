# Request for Comments (RFC) - Sprint 033
**Title:** Invalid Character Error Throwing for H3 Non-Hexadecimal Tokens  
**Author:** Chief Systems Architect  
**Status:** Approved / Draft  
**Target Module:** `src/spatial/h3_grid.ts`

---

## 1. Executive Summary & Sprint Goal
The goal of Sprint 033 is to enforce strict input validation on H3 spatial tokens within `src/spatial/h3_grid.ts`. Specifically, any H3 token string containing non-hexadecimal symbols must immediately throw an explicit validation/error instance, preventing malformed spatial monad state propagation and upholding absolute topological integrity within the Web of Life simulation architecture.

---

## 2. Architectural Context & Thermodynamical Compliance
- **First Law of Thermodynamics (Conservation):** Spatial coordinates represent fixed energetic zones and discrete patches of the biosphere. Allowing corrupt or non-hexadecimal strings into the grid creates phantom index mappings or undefined energy sinks/sources, violating matter-energy bookkeeping. Strict token validation ensures all mapped entities correspond to valid spatial indices.
- **Second Law of Thermodynamics (Entropy Control):** Entropy within the simulation increases through trophic inefficiency and metabolic heat dissipation, not through silent parsing failures or corrupted state vectors. Strict error-throwing halts degenerative entropy proliferation at the boundary.
- **Object-Oriented & Incremental Design:** This RFC builds directly upon prior spatial monads (`src/monads/spatial_monad.ts`) and H3 types (`src/spatial/h3_types.ts`). We introduce an incremental validation helper method within `src/spatial/h3_grid.ts` rather than rewriting core spatial infrastructure.

---

## 3. Class Hierarchy Additions & Interface Contracts

### 3.1 Error Definition
We introduce or utilize a standardized spatial validation error:
```typescript
export class InvalidH3TokenError extends Error {
  constructor(token: string) {
    super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
  }
}
```

### 3.2 Method Signatures in `src/spatial/h3_grid.ts`
```typescript
export function validateH3Token(token: string): void {
  // Regex matching valid hexadecimal H3 index strings (typically 15 chars, hex characters [0-9a-fA-F])
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!token || !hexRegex.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}
```

Integration point inside `H3Grid` resolution methods:
```typescript
export class H3Grid {
  public resolveCell(token: string): SpatialCell {
    validateH3Token(token);
    // ... existing resolution logic ...
  }
}
```

---

## 4. Monad Stock Transitions
1. **Input State ($S_0$):** Unverified string token entering `SpatialMonad`.
2. **Validation Gate ($G_v$):** `validateH3Token(token)` inspects character set.
3. **Transition Path A (Valid):** Token passes $\rightarrow$ Cell instantiated $\rightarrow$ Energy stock retained.
4. **Transition Path B (Invalid):** Non-hexadecimal symbol detected $\rightarrow$ `InvalidH3TokenError` thrown $\rightarrow$ Execution halted before thermodynamic state corruption occurs.

---

## 5. Verification & Test Plan
- Create test suite in `tests/sprint_033.test.ts`.
- Verify standard valid H3 tokens pass without error.
- Verify tokens with invalid characters (e.g., `'g'`, `'Z'`, `'-'`, `' '`, symbols) throw `InvalidH3TokenError`.