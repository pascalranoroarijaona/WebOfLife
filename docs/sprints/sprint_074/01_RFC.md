# RFC-074: Pentagonal Coordination Violation Error Specification

- **Sprint:** 074
- **Title:** Topological Invariant Enforcement and `PentagonalCoordinationViolationError` Specification
- **Status:** Proposed
- **Author:** Chief Systems Architect, Web of Life
- **Target File:** `src/spatial/h3_adjacency.ts`
- **Related Files:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`

---

## 1. Executive Summary & Problem Statement

The discrete global grid system (DGGS) utilized by the Gaia engine discretizes the terrestrial spheroid into a geodesic icosahedral aperture 3 hexagonal discrete grid (H3). By Euler's polyhedral formula ($V - E + F = 2$) and the Gauss-Bonnet theorem, an icosahedral spherical surface cannot be tiled exclusively by hexagons; exactly twelve pentagonal singularities are geometrically required across every multiresolution tier ($r \ge 0$).

Standard hexagonal cells maintain a strict coordination degree of $k = 6$, yielding six directional directed edges and an isotropic valence distribution. Conversely, the twelve topological pentagons maintain a coordination degree of $k = 5$. In discrete spatial flux simulations and mass-energy transport monads, algorithms that compute finite-volume divergence, cross-edge advection, or discrete laplacians across adjacent cells must explicitly guard coordination invariants. 

Prior to this RFC, edge-enumeration anomalies, directional index mismatches, or malformed adjacency structures on pentagonal boundaries either failed silently or produced uninformative general exceptions, jeopardizing mass-conservation balance sheets ($\Delta M_{\text{system}} \equiv 0$).

Sprint 074 defines the explicit domain error class `PentagonalCoordinationViolationError` in `src/spatial/h3_adjacency.ts` with strongly-typed properties `cellIndex`, `expectedCount`, and `actualCount`, establishing a deterministic, inspectable topological failure mode for the entire spatial computing stack.

---

## 2. Theoretical & Thermodynamic Foundations

### 2.1 Euler-Poincaré Characteristic & Pentagonal Singularities
On a compact 2D Riemannian 2-sphere $\mathbb{S}^2$, Euler's characteristic is $\chi(\mathbb{S}^2) = 2$. For any tessellation composed of $F_5$ pentagons and $F_6$ hexagons where each vertex has degree 3:
$$3V = 2E = 5F_5 + 6F_6$$
$$V - E + F = \frac{5F_5 + 6F_6}{3} - \frac{5F_5 + 6F_6}{2} + (F_5 + F_6) = \frac{F_5}{6} = \chi(\mathbb{S}^2) = 2$$
$$\therefore F_5 = 12$$

Thus, regardless of the spatial resolution or recursion depth, exactly 12 pentagons exist. Hexagonal neighbor adjacency queries expect $|N(c)| = 6$, whereas pentagonal neighbor queries strictly expect $|N(c)| = 5$.

### 2.2 Thermodynamic Conservation Under Topological Irregularities
In the Gaia Spatial Flux Monad, divergence at cell $c_i$ for conserved scalar stock $S$ (e.g., biomass carbon, soil nitrogen, sensible heat) across directed dual edges $e_{ij} \in \partial c_i$ is computed via:
$$\frac{dS_i}{dt} = \sum_{j \in N(c_i)} J_{ij} \cdot l_{ij} + Q_{\text{solar}, i} - R_{\text{dissipation}, i}$$
where $l_{ij}$ is the metric boundary length, $J_{ij}$ is the flux vector, and $N(c_i)$ is the coordination set. If an algorithm attempts hexagonal 6-stencil flux calculations on a pentagonal cell or if boundary truncation corrupts the topological valence ($|N(c_i)| \neq 5$), boundary flux closure fails, inducing non-physical mass-energy leaks or artificial creation (violating the First Law of Thermodynamics).

Raising a typed `PentagonalCoordinationViolationError` halts non-conservative state transitions immediately, enforcing conservative fail-fast semantics before state tensor corruption occurs.

---

## 3. Structural & Class Design

### 3.1 Class Definition: `PentagonalCoordinationViolationError`
The error class extends the standard JavaScript `Error` root, preserving prototype chain resolution across modern V8/ECMAScript runtime boundaries, capturing stack traces cleanly, and exposing structured properties for automated programmatic handling.

```typescript
/**
 * Error thrown when an H3 cell exhibits a coordination number that violates
 * the topological invariants expected for pentagonal cells in an icosahedral DGGS.
 */
export class PentagonalCoordinationViolationError extends Error {
  public readonly cellIndex: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;

  constructor(cellIndex: string, expectedCount: number, actualCount: number) {
    const message = 
      `Pentagonal coordination violation at cell '${cellIndex}': ` +
      `expected ${expectedCount} neighbors, but found ${actualCount}.`;
    super(message);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellIndex = cellIndex;
    this.expectedCount = expectedCount;
    this.actualCount = actualCount;

    // Maintain correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 3.2 Field Specifications
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Literal identifier: `'PentagonalCoordinationViolationError'`. |
| `cellIndex` | `string` | Canonical hexadecimal H3 cell index identifier (or cell coordinate representation). |
| `expectedCount` | `number` | The topologically required neighbor count (typically `5` for pentagonal cells, or specific configuration bounds). |
| `actualCount` | `number` | The observed neighbor count discovered during validation, traversal, or kernel stencil synthesis. |
| `message` | `string` | Descriptive diagnostic message formatting cell index, expected count, and actual count. |

---

## 4. Integration with `H3AdjacencyGraph`

The error is integrated into the coordination validation routines within `src/spatial/h3_adjacency.ts`:

1. **Topological Validation Kernel:**
   When verifying adjacency consistency on cells flagged or detected as pentagonal (`isPentagon(cellIndex) === true`), the coordination degree check verifies:
   ```typescript
   if (isPentagon && neighborCount !== 5) {
     throw new PentagonalCoordinationViolationError(cellIndex, 5, neighborCount);
   }
   ```
2. **Reverse Directional Verification:**
   When validating boundary symmetry across pentagon-hexagon interfaces, if a pentagonal aperture boundary yields an invalid valence, `PentagonalCoordinationViolationError` provides exact telemetry on the defective edge.

---

## 5. Architectural Compliance & Interface Contracts

### 5.1 First & Second Law Compliance
- **First Law (Conservation of Matter & Energy):** Finite-volume dual meshes rely on conservative edge flux summation: $\sum_{i} \sum_{j \in N(i)} J_{ij} \equiv 0$. By terminating computations when coordination counts are corrupted, erroneous unclosed boundary flux loops cannot introduce spurious matter.
- **Second Law (Irreversibility & Entropy Production):** Dissipative losses on pentagonal boundaries must account for the $5/6$ geometric aperture weighting without numerical drift.

### 5.2 Incremental Class Hierarchy
- Follows existing error hierarchy patterns across `src/spatial/` and `src/monads/`.
- No disruption to existing `H3Adjacency` interfaces; purely additive class definition and non-breaking contract validation.

---

## 6. Verification and Test Vectors

The implementation will be verified through targeted unit tests in `tests/sprint_074.test.ts` covering:
1. Instantiation with arbitrary strings and numerical counts (`cellIndex: "8828308281fffff"`, `expectedCount: 5`, `actualCount: 6`).
2. Correct `instanceof` resolution:
   - `err instanceof Error === true`
   - `err instanceof PentagonalCoordinationViolationError === true`
3. Proper formatting of `err.message` containing `cellIndex`, `expectedCount`, and `actualCount`.
4. Accurate reflection of `err.name === 'PentagonalCoordinationViolationError'`.
5. Rejection and error propagation inside graph neighbor validation logic.