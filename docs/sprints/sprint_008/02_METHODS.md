<!-- Method Specifications -->

# Process Mining & Research: Sprint 008 - H3 Index Validation & Thermodynamic Integrity

## 1. Physical & Informational Process Background
In the Web of Life simulation, spatial coordinates on the Gaia Earth Pod are indexed using Uber's H3 hierarchical hexagonal spatial index. Within our computational ecosystem, spatial position acts as a fundamental physical boundary container for matter (carbon, water, minerals) and energy (solar radiation, metabolic heat). 

A corrupted or malformed spatial index string (e.g., injection of invalid characters, incorrect length) introduces informational entropy into the simulation. If processed, this informational corruption manifests as physical entropy leakage: biomass, water, or thermodynamic energy could be assigned to non-existent, overlapping, or infinite spatial locations, violating the **First Law of Thermodynamics** (conservation of matter/energy) and the **Second Law** (minimization of unconstrained entropy increase).

By enforcing strict regex and character set validation at the boundary of the `SpatialMonad`, we establish an energetic screening gate. Only valid spatial tokens are permitted to bind to physical stocks.

---

## 2. Thermodynamic Stock Transfer & Conservation Equations

Let a raw spatial input string be denoted as $S_{raw} \in \mathcal{string}$.
Let the target spatial stock state in the `SpatialMonad` be $M_{spatial}$.

### 2.1 The Validation Gate Function ($\Phi_{H3}$)
The validation operator is defined as a pure, side-effect-free Boolean function:

$$\Phi_{H3}(S_{raw}) = \begin{cases} 
1 & \text{if } |S_{raw}| = 15 \text{ and } S_{raw} \in [0-9a-fA-F]^{15} \\
0 & \text{otherwise}
\end{cases}$$

### 2.2 Monadic State Transition Matrix
When $S_{raw}$ enters the `SpatialMonad`, the state transition is governed by $\Phi_{H3}$:

$$\text{SpatialMonad}(S_{raw}) \xrightarrow{\text{bind}} \begin{cases} 
\text{Right}(H3Index(S_{raw})) & \text{if } \Phi_{H3}(S_{raw}) == 1 \\
\text{Left}(\Delta S_{error}) & \text{if } \Phi_{H3}(S_{raw}) == 0 
\end{cases}$$

Where:
- **Mass Delta ($\Delta C, \Delta H_2O, \Delta Minerals$):** $0$ (Informational gating consumes no physical matter).
- **Energy Delta ($\Delta E$):** Minimal computational heat dissipation $Q_{comp} \approx \text{Processor Cycle Cost}$ for regex evaluation, bounded by $O(1)$ time complexity ($15$ character checks).
- **Entropy Control ($\Delta S_{sys}$):** Prevents positive entropy injection into adjacency matrices (`src/spatial/h3_adjacency.ts`), ensuring $\Delta S_{universe} \ge 0$ is strictly respected through deterministic spatial partitioning.

---

## 3. Executable Monad Method Specifications (`src/spatial/h3_grid.ts` & `src/monads/spatial_monad.ts`)

```ts
/**
 * @file 02_METHODS.md - Executable Monad Specification for H3 Validation
 * Thermodynamic Class: Spatial Boundary Gate
 */

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

/**
 * Validates an H3 index string against standard 15-character hex formatting.
 * @param index Raw input string representing a spatial coordinate.
 * @returns boolean True if thermodynamic spatial boundary is intact.
 */
export function isValidH3Index(index: string): boolean {
  if (typeof index !== 'string') return false;
  return H3_REGEX.test(index);
}

/**
 * Asserts valid H3 index, throwing a thermodynamic containment violation if malformed.
 * @param index Raw input string.
 */
export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index string: "${index}". Expected 15-char hexadecimal.`);
  }
}

/**
 * SpatialMonad wrapper ensuring matter/energy allocations only occur on validated spatial nodes.
 */
export class SpatialMonad {
  private constructor(private readonly value: string | null, private readonly error: string | null) {}

  public static of(rawString: string): SpatialMonad {
    if (isValidH3Index(rawString)) {
      return new SpatialMonad(rawString, null);
    } else {
      return new SpatialMonad(null, `Malformed spatial coordinate: ${rawString}`);
    }
  }

  public isRight(): boolean {
    return this.value !== null;
  }

  public getOrThrow(): string {
    if (this.value === null) {
      raiseEntropySpike(this.error || "Unknown spatial corruption");
    }
    return this.value;
  }
}

function raiseEntropySpike(reason: string): never {
  throw new Error(`[Entropy Leak Prevented] ${reason}`);
}
```