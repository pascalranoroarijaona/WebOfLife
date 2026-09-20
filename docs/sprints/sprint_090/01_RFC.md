# RFC-090: Pure Pentagon Resolution Index Verification and Aperture Orientation Invariance

**Author**: Chief Systems Architect  
**Sprint**: 090  
**Status**: Proposed  
**Scope**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_grid.ts`, `src/spatial/h3_types.ts`, `tests/sprint_090.test.ts`  
**Dependencies**: Sprint 089 (Pentagonal Vertex and Directional Adjacency Kernels)

---

## 1. Executive Summary & Sprint Goal

### 1.1 Goal
Implement `isPurePentagonResolutionIndex` in `src/spatial/h3_adjacency.ts` to determine whether a given spatial index or resolution designates a pentagonal cell that retains pristine base cell orientation without aperture rotation.

### 1.2 Architectural Rationale
The Earth Pod thermodynamic simulation models biosphere dynamics on an icosahedral Discrete Global Grid System (DGGS) using hierarchical hexagonal decomposition with 12 topological pentagons at the vertices of the regular icosahedron. Under Aperture-7 ($\mathrm{Ap}7$) hierarchical tessellation, alternating subdivision levels introduce grid orientation shifts:
- **Class II resolutions** ($r \equiv 0 \pmod 2$): Symmetrical scaling where the grid coordinate axes align directly with the base cell axes (net aperture rotation angle $\theta = 0$).
- **Class III resolutions** ($r \equiv 1 \pmod 2$): Rotated scaling where coordinate axes tilt by an angle $\theta_{\mathrm{ap}} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.106262983^{\circ}$.

Pentagonal cells at resolution $r > 0$ exist exclusively along the concentric center-child trajectory ($\text{digit} = 0$, `CENTER_DIGIT`) originating from one of the 12 pentagonal base cells. When a pentagon resides at an odd resolution, its five adjacent directional vectors are rotated relative to the spherical geodesic arcs linking the icosahedral vertices. When residing at an even resolution, the pentagon retains the pristine orientation of the base cell without aperture rotation skew.

The function `isPurePentagonResolutionIndex` provides the geometric and monadic gating required by the simulation tensor to ensure that thermodynamic flux tensors, atmospheric vorticity operators, and isotropic planetary diffusive kernels do not introduce spurious rotational skew at pentagonal singularities.

---

## 2. Mathematical & Geometric Governance

### 2.1 Aperture-7 Tessellation and Rotation Group
In an Aperture-7 hexagonal/pentagonal hierarchy, the scale factor between successive resolutions is $\sqrt{7}$. The coordinate transformation matrix from resolution $r$ to $r+1$ alternates between two classes of orientation:
1. **Resolution 0 (Base Cells)**: Coaligned with the icosahedron face coordinate system. $\theta_0 = 0^{\circ}$.
2. **Class III Step ($r \to r+1$, odd $r$)**:
   $$\theta_{r} = (-1)^{\lfloor r/2 \rfloor} \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.1063^{\circ}$$
3. **Class II Step ($r \to r+1$, even $r$)**:
   The subsequent aperture step applies the counter-rotation $-\theta_{r}$, restoring the net coordinate axes orientation back to the base cell alignment:
   $$\Theta_{\text{net}}(r) = \begin{cases} 0^{\circ}, & r \equiv 0 \pmod 2 \\ \pm 19.1063^{\circ}, & r \equiv 1 \pmod 2 \end{cases}$$

### 2.2 Pure Pentagon Definition
A discrete spatial cell index $H$ at resolution $r \in [0, 15]$ represents a **Pure Pentagon Resolution Index** if and only if:
1. **Topological Singularity**: $H$ is a valid pentagon cell (originating from one of the 12 icosahedral pentagonal base cells: $\{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$).
2. **Concentric Hierarchy**: All directional digits $d_k$ for levels $k \in [1, r]$ are strictly $0$ (`CENTER_DIGIT`). Any non-zero digit converts the descendant into a hexagon.
3. **Aperture Orientation Invariance**: The net aperture rotation is zero, requiring $r$ to be a Class II resolution:
   $$r \equiv 0 \pmod 2 \quad (r \in \{0, 2, 4, 6, 8, 10, 12, 14\})$$

If the function is evaluated directly against a resolution integer $r$, it returns `true` if and only if $r$ is an unrotated Class II resolution ($0 \le r \le 15$ and $r \pmod 2 === 0$).

---

## 3. Thermodynamic Governance & Monadic Invariants

### 3.1 First Law Compliance: Mass-Energy Conservation at Singularities
Pentagonal cells have 5 planar neighbors instead of 6, presenting a geometric defect of $\frac{\pi}{3}$. At pure pentagon resolutions:
- Neighboring radial flux vectors form five equal angles of $72^{\circ}$ co-aligned with the icosahedral meridian geodesics.
- Because $\Theta_{\text{net}}(r) = 0$, diffusive flux tensors $\vec{J}_{\text{diff}} = -D \nabla \rho$ do not require rotational transformation matrices to align with base-cell coordinate frames.
- Matter conservation holds strictly:
  $$\sum_{i=1}^{5} J_{i, \text{pent}} \cdot A_i = -\frac{\mathrm{d}M_{\text{pent}}}{\mathrm{d}t}$$
  where $A_i$ is the face boundary length and $J_i$ is the mass flux density across edge $i$.

### 3.2 Second Law Compliance: Isotropic Dissipation
When aperture rotation is present (Class III, odd resolutions), numerical gradient approximations on 5-fold vertices can induce non-physical circulation (spurious curl $\nabla \times \vec{J} \ne 0$) if not corrected. By identifying pure pentagon indices via `isPurePentagonResolutionIndex`, thermodynamic spatial operators can bypass aperture correction tensors, eliminating numerical entropy production and guaranteeing monotonic entropy dissipation ($\Delta S \ge 0$).

---

## 4. Technical Specification & Interface Contracts

### 4.1 Interface Signatures in `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Evaluates whether a given H3 cell index or resolution represents a pure pentagon
 * resolution index.
 *
 * A cell is a pure pentagon resolution index if:
 * 1. It is a pentagonal cell (base cell is one of the 12 icosahedral vertices and
 *    all child digits 1..r are 0).
 * 2. It resides at a Class II resolution (r % 2 === 0), retaining base cell orientation
 *    without aperture rotation.
 *
 * If passed a numeric resolution directly, returns true if the resolution preserves
 * base cell orientation without aperture rotation (i.e. even resolution in [0, 15]).
 *
 * @param target - The H3 index (as hex string or bigint) or a resolution number (0-15).
 * @param resolution - Optional resolution override when target is an index.
 * @returns true if the index or resolution retains base cell orientation without aperture rotation.
 */
export function isPurePentagonResolutionIndex(
  target: string | bigint | number,
  resolution?: number
): boolean;
```

### 4.2 Supporting Constants & Type Definitions
In `src/spatial/h3_types.ts` (or referenced in `h3_adjacency.ts`):
- `PENTAGON_BASE_CELLS`: `ReadonlySet<number>` containing the 12 base cell IDs $\{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$.
- `H3_MAX_RESOLUTION`: `15`
- `H3_MIN_RESOLUTION`: `0`
- `DIRECTION_CENTER`: `0`

### 4.3 Bitwise Decomposition of H3 Index
For a 64-bit H3 index:
1. `mode` (bits 59-62): Must be `1` (`H3_CELL_MODE`).
2. `resolution` (bits 52-55): Integer $r \in [0, 15]$.
3. `baseCell` (bits 45-51): Integer $b \in [0, 121]$.
4. `digits` (bits $52 - 3k$ to $54 - 3k$ for $k \in [1, r]$): Directional child digits.

A pentagon index satisfies:
$$\text{isPentagon}(H) \iff (b \in \text{PENTAGON\_BASE\_CELLS}) \land \left(\forall k \in [1, r], \, d_k = 0\right)$$

The pure pentagon resolution condition adds:
$$\text{isPurePentagonResolutionIndex}(H) \iff \text{isPentagon}(H) \land (r \pmod 2 === 0)$$

If $r$ is supplied as a raw number:
$$\text{isPurePentagonResolutionIndex}(r) \iff (r \in \mathbb{Z}) \land (0 \le r \le 15) \land (r \pmod 2 === 0)$$

---

## 5. Incremental Object-Oriented Architecture

```
                      +-----------------------------+
                      |         H3IndexOps          |
                      +-----------------------------+
                                     |
           +-------------------------+-------------------------+
           |                                                   |
+----------------------+                             +----------------------+
|    h3_grid.ts        |                             |   h3_adjacency.ts    |
| - getResolution      |                             | - isPentagon         |
| - getBaseCell        |                             | - isPurePentagon...  |
| - getIndexDigit      |                             | - getAdjacentPent... |
+----------------------+                             +----------------------+
           |                                                   |
           +-------------------------+-------------------------+
                                     |
                      +-----------------------------+
                      |      SpatialFluxMonad       |
                      | - computeBoundaryFlux       |
                      | - applyApertureRotation     |
                      +-----------------------------+
                                     |
                      +-----------------------------+
                      |      H3StateTensor          |
                      | - polarGeodesicCoupling     |
                      +-----------------------------+
```

### 5.1 Monad Stock Transitions
In `SpatialFluxMonad`:
- Prior to computing edge-based diffusive mass/energy exchanges across cell boundaries, the monad verifies if the source/target cell is a pure pentagon:
  ```typescript
  if (isPurePentagonResolutionIndex(cellIndex)) {
    // Zero aperture rotation: bypass rotational coordinate transformations
    return this.applyUnalignedPentagonFlux(cellIndex, stocks);
  } else if (isPentagon(cellIndex)) {
    // Odd resolution pentagon: apply 19.1063 deg aperture correction matrix
    return this.applyRotatedPentagonFlux(cellIndex, stocks, APERTURE_ROTATION_RAD);
  }
  ```

---

## 6. Verification & Test Plan

Test suite `tests/sprint_090.test.ts` will validate:
1. **Resolution Number Overload**:
   - `isPurePentagonResolutionIndex(0)` $\to$ `true`
   - `isPurePentagonResolutionIndex(1)` $\to$ `false`
   - `isPurePentagonResolutionIndex(2)` $\to$ `true`
   - `isPurePentagonResolutionIndex(3)` $\to$ `false`
   - Class II even levels $0, 2, 4, 6, 8, 10, 12, 14 \to \text{true}$
   - Class III odd levels $1, 3, 5, 7, 9, 11, 13, 15 \to \text{false}$
   - Out of bounds resolutions ($< 0$, $> 15$, non-integers, `NaN`) $\to$ `false`
2. **Pentagon Cell Index Overload (String & BigInt)**:
   - Res 0 pentagonal base cells (e.g., base cell 4) $\to$ `true`
   - Res 1 pentagonal children with digit 0 $\to$ `false` (odd resolution has aperture rotation)
   - Res 2 pentagonal children with digits 0,0 $\to$ `true` (even resolution, aligned)
   - Res 3 pentagonal children with digits 0,0,0 $\to$ `false`
   - Res 4 pentagonal children with digits 0,0,0,0 $\to$ `true`
3. **Hexagonal Cell Validation**:
   - Hexagonal base cells at resolution 0 $\to$ `false`
   - Hexagonal children at even resolutions $\to$ `false` (only pentagons qualify)
   - Descendant of pentagon with non-zero digit (e.g. digit 1 at res 2) $\to$ `false` (becomes a hexagon)
4. **Thermodynamic Invariant Integration**:
   - Verify mass and enthalpy conservation holds with error $< 10^{-14}$ across pure pentagon flux boundaries.

---

## 7. Deliverables & Sprint Artifacts
1. `src/spatial/h3_adjacency.ts`: Export `isPurePentagonResolutionIndex`.
2. `tests/sprint_090.test.ts`: Complete unit test coverage for pure pentagon resolution identification.
3. `docs/sprints/sprint_090/01_RFC.md`: This architecture specification.