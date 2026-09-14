<!-- Method Specifications -->

# Sprint 006: Process Mining & Thermodynamic Formalization - Uber H3 Spatial Validation

## 1. Process Overview & Thermodynamic Context
In the Web of Life simulation engine, physical space is discretized using the Uber H3 hierarchical hexagonal grid system. Each H3 index represents a discrete control volume (geodetic cell) containing physical and biological stocks (e.g., carbon, water, minerals, biomass) and energy fluxes (e.g., solar radiation influx). 

To satisfy the **First Law of Thermodynamics** (conservation of mass and energy) and the **Second Law** (entropy regulation through bounded state spaces), spatial indexing must be strictly bijective and immune to corruption. Malformed spatial keys represent leakage vectors or boundary violations that could cause mass/energy duplication or disappearance during spatial transport monads.

This document formalizes the validation process implemented in `src/spatial/h3_grid.ts` as an executable monad method with explicit mass/energy transfer deltas and error-state trapping.

---

## 2. Mass & Energy Accounting Constants
Let a spatial monad state $S$ at H3 index $h$ be defined as:
$$S_h = (\mathbf{M}_h, \mathbf{E}_h)$$
Where:
- $\mathbf{M}_h = [m_{\text{carbon}}, m_{\text{water}}, m_{\text{minerals}}]$ (kg)
- $\mathbf{E}_h = [e_{\text{solar}}, e_{\text{internal}}, e_{\text{entropy}}]$ (Joules)

When a spatial transition occurs:
$$\Delta S: S_{h_{\text{source}}} \rightarrow S_{h_{\text{target}}}$$

If the string representation of $h_{\text{target}}$ fails format validation, the transition is aborted, and mass/energy conservation is preserved by locking stocks in the source cell or routing them to an entropic sink.

---

## 3. Executable Monad Method: `H3ValidationMonad`

The spatial monad wrapping state transitions executes the following deterministic validation and stock transfer protocol.

### Mathematical Definition of Validation
Given an input string $s$:
1. **Length Check:** $|s| = 15 \implies$ else throw `H3ErrorCode.INVALID_LENGTH`
2. **Character Check:** $s \in [0-9a-fA-F]^{15} \implies$ else throw `H3ErrorCode.INVALID_CHARACTER`
3. **Null Check:** $s \neq \text{'0'.repeat(15)} \implies$ else throw `H3ErrorCode.NULL_INDEX`
4. **Resolution Check:** $0 \le \text{res}(s) \le 15 \implies$ else throw `H3ErrorCode.INVALID_RESOLUTION`
5. **Base Cell Check:** $0 \le \text{baseCell}(s) \le 122 \implies$ else throw `H3ErrorCode.INVALID_BASE_CELL`

---

## 4. TypeScript Monad Implementation Spec

```typescript
import { H3Error, H3ErrorCode, IH3GridValidator } from '../spatial/h3_grid';

export interface SpatialState<M, E> {
  h3Index: string;
  matter: M;
  energy: E;
}

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: SpatialState<M, E> | null,
    private readonly error: H3Error | null,
    private readonly validator: IH3GridValidator
  ) {}

  public static unit<M, E>(state: SpatialState<M, E>, validator: IH3GridValidator): H3ValidationMonad<M, E> {
    try {
      validator.assertValid(state.h3Index);
      return new H3ValidationMonad(state, null, validator);
    } catch (err) {
      if (err instanceof H3Error) {
        return new H3ValidationMonad(null, err, validator);
      }
      throw err;
    }
  }

  public bind<M2, E2>(
    transitionFn: (state: SpatialState<M, E>) => SpatialState<M2, E2>
  ): H3ValidationMonad<M2, E2> {
    if (this.error !== null || this.state === null) {
      // Propagate error, halting spatial flux to prevent First/Second Law violations
      return new H3ValidationMonad<M2, E2>(null, this.error, this.validator);
    }

    try {
      const nextState = transitionFn(this.state);
      this.validator.assertValid(nextState.h3Index);
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err) {
      if (err instanceof H3Error) {
        return new H3ValidationMonad<M2, E2>(null, err, this.validator);
      }
      return new H3ValidationMonad<M2, E2>(
        null, 
        new H3Error(H3ErrorCode.INVALID_CHARACTER, (err as Error).message), 
        this.validator
      );
    }
  }

  public match<T>(
    onSuccess: (state: SpatialState<M, E>) => T,
    onError: (error: H3Error) => T
  ): T {
    if (this.error !== null || this.state === null) {
      return onError(this.error!);
    }
    return onSuccess(this.state);
  }
}
```

---

## 5. Thermodynamic Delta Summary Table

| Error Code | Trigger Condition | Mass Delta ($\Delta \mathbf{M}$) | Energy Delta ($\Delta \mathbf{E}$) | Entropy Impact ($\Delta S_{\text{system}}$) |
| :--- | :--- | :--- | :--- | :--- |
| `INVALID_LENGTH` | Length $\neq 15$ chars | $0$ (Restricted to source) | $0$ (Restricted to source) | $+0$ (Rejected before flux) |
| `INVALID_CHARACTER` | Non-hex characters present | $0$ (Restricted to source) | $0$ (Restricted to source) | $+0$ (Rejected before flux) |
| `INVALID_RESOLUTION` | Resolution outside $[0, 15]$ | $0$ (Restricted to source) | $0$ (Restricted to source) | $+0$ (Rejected before flux) |
| `INVALID_BASE_CELL` | Base cell outside $[0, 122]$| $0$ (Restricted to source) | $0$ (Restricted to source) | $+0$ (Rejected before flux) |
| `NULL_INDEX` | Index equals all zeros | $0$ (Restricted to source) | $0$ (Restricted to source) | $+0$ (Rejected before flux) |

---

## 6. Verification & Compliance
Adherence to these specifications guarantees that:
1. No matter or energy is created or destroyed due to parsing ambiguities.
2. Invalid spatial topologies fail fast, maintaining thermodynamic equilibrium across all adjacent H3 cells.