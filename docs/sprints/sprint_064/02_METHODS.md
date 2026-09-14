# Sprint 064 — Methods Specification: 3D Vector Target Orientation via Displacement Dot-Product Parity

## 1. Domain & Physical Process Context

In the Web of Life planetary simulation engine, discrete global grid systems (DGGS) based on Uber H3 hexagonal partitions represent the spherical boundary manifold $\mathbb{S}^2 \subset \mathbb{R}^3$. Spatial monads (`SpatialMonad`, `H3AdjacencyGraph`, and `H3GridManager`) govern the exchange of mass (carbon, water, oxygen, nutrient minerals, trophic biomass) and thermal energy (sensible enthalpy) across cell boundaries.

Boundary flux transport across contiguous hexagonal cells $C_i$ and $C_j$ is driven by physical flow fields—including atmospheric wind vectors, oceanic surface velocity vectors, hydrologic runoffs, and trophic migration fields. In arbitrary 3D geodesic coordinate representations, vertex winding order, edge orientation conventions, or unaligned tangent projection operators frequently yield candidate boundary flux vectors $\mathbf{v} \in \mathbb{R}^3$ whose sign orientation is ambiguous relative to the directed edge $e_{ij} = (C_i \to C_j)$.

If a boundary normal or flow velocity vector $\mathbf{v}$ points counter to the target displacement vector $\mathbf{d}_{ij} = \mathbf{p}_j - \mathbf{p}_i$, computing advective flux without directional parity inversion results in reversed transport (violating mass conservation, causing negative density states, and producing negative entropy generation). `orientVectorTowardsTarget3D` resolves this by computing the Euclidean inner product $\mathbf{v} \cdot \mathbf{d}_{ij}$ and applying a sign-flip inversion operator when $\mathbf{v} \cdot \mathbf{d}_{ij} < 0$.

---

## 2. Mathematical Formalism

### 2.1 State Space & Geometric Quantities
Let source cell $C_i$ and target cell $C_j$ have geodesic centroid positions embedded in $\mathbb{R}^3$:
$$\mathbf{p}_i = [x_i, y_i, z_i]^T, \quad \mathbf{p}_j = [x_j, y_j, z_j]^T$$

The net displacement vector from source to target is:
$$\mathbf{d}_{ij} = \mathbf{p}_j - \mathbf{p}_i = \begin{bmatrix} x_j - x_i \\ y_j - y_i \\ z_j - z_i \end{bmatrix}$$

Let $\mathbf{v} = [v_x, v_y, v_z]^T \in \mathbb{R}^3$ be the candidate flow or face-normal vector associated with the boundary between $C_i$ and $C_j$.

### 2.2 Inner Product & Parity Projection Operator
The Euclidean dot product $\langle \mathbf{v}, \mathbf{d}_{ij} \rangle \in \mathbb{R}$ is defined as:
$$\langle \mathbf{v}, \mathbf{d}_{ij} \rangle = \mathbf{v} \cdot \mathbf{d}_{ij} = v_x d_x + v_y d_y + v_z d_z$$

The orientation operator $\mathcal{O}: \mathbb{R}^3 \times \mathbb{R}^3 \to \mathbb{R}^3$ evaluates:
$$\mathbf{v}^* = \mathcal{O}(\mathbf{v}, \mathbf{d}_{ij}) = \begin{cases}
-\mathbf{v} = \begin{bmatrix} -v_x \\ -v_y \\ -v_z \end{bmatrix}, & \text{if } \mathbf{v} \cdot \mathbf{d}_{ij} < 0 \\
\mathbf{v} = \begin{bmatrix} v_x \\ v_y \\ v_z \end{bmatrix}, & \text{if } \mathbf{v} \cdot \mathbf{d}_{ij} \ge 0
\end{cases}$$

### 2.3 Overloaded Origin-Target Evaluation
When source position $\mathbf{p}_{\text{origin}}$ and target position $\mathbf{p}_{\text{target}}$ are provided directly:
$$\mathbf{d}_{ij} = \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{origin}}$$
$$\mathbf{v}^* = \mathcal{O}(\mathbf{v}, \mathbf{p}_{\text{target}} - \mathbf{p}_{\text{origin}})$$

### 2.4 Degenerate & Edge Constraints
1. **Collinear Opposing Vectors ($\mathbf{v} \cdot \mathbf{d}_{ij} = -\|\mathbf{v}\|_2 \|\mathbf{d}_{ij}\|_2$):** Sign inverted: $\mathbf{v}^* = -\mathbf{v}$.
2. **Orthogonal Vectors ($\mathbf{v} \cdot \mathbf{d}_{ij} = 0$):** Invariant: $\mathbf{v}^* = \mathbf{v}$.
3. **Zero Vectors ($\|\mathbf{v}\|_2 = 0$ or $\|\mathbf{d}_{ij}\|_2 = 0$):** Invariant: $\mathbf{v}^* = \mathbf{v} = [0, 0, 0]^T$.
4. **Isometry Invariance:** The operator $\mathcal{O}$ is an isometric reflection or identity map:
   $$\|\mathbf{v}^*\|_2 = \|\mathbf{v}\|_2$$

---

## 3. Physical & Thermodynamic Stock Transfer Deltas

The oriented vector $\mathbf{v}^*$ defines the directed advection velocity $u_{\text{eff}}$ across boundary interface $\partial \Omega_{ij}$ of cross-sectional area $A_{ij} \, (\text{m}^2)$:
$$u_{\text{eff}} = \frac{\mathbf{v}^* \cdot \mathbf{d}_{ij}}{\|\mathbf{d}_{ij}\|_2} \ge 0$$

Volumetric exchange rate $\Phi_V \, (\text{m}^3 \cdot \text{s}^{-1})$ over time step $\Delta t \, (\text{s})$:
$$\Phi_V = u_{\text{eff}} \cdot A_{ij}$$
$$\Delta V_{ij} = \Phi_V \cdot \Delta t$$

### 3.1 Mass Transfer Deltas
Let each spatial cell $C_k$ hold state stocks:
- $S_{\text{CO2}}$: Dissolved / Atmospheric Carbon Dioxide $(\text{kg C})$
- $S_{\text{H2O}}$: Water / Moisture content $(\text{kg})$
- $S_{\text{O2}}$: Dissolved / Atmospheric Oxygen $(\text{kg})$
- $S_{\text{minerals}}$: Soil / Solute mineral nutrients $(\text{kg})$
- $S_{\text{biomass}}$: Organic matter / Trophic biomass $(\text{kg C})$

For each conserved substance $k$ with concentration $c_k = \frac{S_k(C_i)}{V(C_i)} \, (\text{kg} \cdot \text{m}^{-3})$:
$$\Delta M_k = c_k \cdot \Delta V_{ij} = \left(\frac{S_k(C_i)}{V(C_i)}\right) u_{\text{eff}} A_{ij} \Delta t$$

Stock transfer equations:
$$\Delta S_k(C_i) = - \Delta M_k$$
$$\Delta S_k(C_j) = + \Delta M_k$$

**Conservation Check:**
$$\Delta S_k(C_i) + \Delta S_k(C_j) = 0 \quad (\text{Strict Mass Invariance})$$

### 3.2 Sensible Heat & Enthalpy Transfer Deltas
Let $T_i$ and $T_j$ be cell temperatures $(\text{K})$, with bulk volumetric heat capacity $C_{\text{th}} = \rho c_p \, (\text{J} \cdot \text{m}^{-3} \cdot \text{K}^{-1})$:
$$\Delta H_{ij} = C_{\text{th}} (T_i - T_{\text{ref}}) \Delta V_{ij}$$

Thermal stock deltas:
$$\Delta E_{\text{thermal}}(C_i) = - \Delta H_{ij}$$
$$\Delta E_{\text{thermal}}(C_j) = + \Delta H_{ij}$$

**Entropy Generation Verification:**
Because $u_{\text{eff}} \ge 0$, directional flow strictly tracks the intended kinetic momentum vector. For conductive and convective boundaries, the net entropy change of the universe satisfies:
$$\Delta S_{\text{universe}} = -\frac{\Delta H_{ij}}{T_i} + \frac{\Delta H_{ij}}{T_j} = \Delta H_{ij} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0$$
when $T_i \ge T_j$, eliminating unphysical reverse-entropy advection.

---

## 4. Concrete Monad Method Specifications

### 4.1 Method Signatures in `src/spatial/h3_adjacency.ts`

```typescript
export type Vector3Tuple = [number, number, number];

/**
 * Orients a 3D vector towards a target direction defined by a displacement vector.
 * If the inner product between the input vector and the displacement vector is negative
 * (dot product < 0), the vector is inverted (sign-flipped); otherwise, it is preserved.
 *
 * @param vector - The candidate 3D vector [x, y, z] to orient.
 * @param displacement - The 3D displacement vector [dx, dy, dz] pointing towards the target.
 * @returns An oriented 3D vector [x', y', z'] guaranteed to satisfy dot(v', d) >= 0.
 */
export function orientVectorTowardsTarget3D(
  vector: Vector3Tuple,
  displacement: Vector3Tuple
): Vector3Tuple;

/**
 * Overloaded variant accepting origin and target 3D coordinates directly.
 * Displacement is computed internally as target - origin.
 *
 * @param vector - The candidate 3D vector [x, y, z] to orient.
 * @param origin - Origin coordinates [ox, oy, oz].
 * @param target - Target coordinates [tx, ty, tz].
 * @returns An oriented 3D vector [x', y', z'] guaranteed to satisfy dot(v', target - origin) >= 0.
 */
export function orientVectorTowardsTarget3D(
  vector: Vector3Tuple,
  origin: Vector3Tuple,
  target: Vector3Tuple
): Vector3Tuple;
```

### 4.2 Algorithm Implementation

```typescript
export function orientVectorTowardsTarget3D(
  vector: Vector3Tuple,
  originOrDisplacement: Vector3Tuple,
  target?: Vector3Tuple
): Vector3Tuple {
  const vx = vector[0];
  const vy = vector[1];
  const vz = vector[2];

  let dx: number;
  let dy: number;
  let dz: number;

  if (target !== undefined) {
    // originOrDisplacement is origin, target is target
    dx = target[0] - originOrDisplacement[0];
    dy = target[1] - originOrDisplacement[1];
    dz = target[2] - originOrDisplacement[2];
  } else {
    // originOrDisplacement is displacement
    dx = originOrDisplacement[0];
    dy = originOrDisplacement[1];
    dz = originOrDisplacement[2];
  }

  const dot = vx * dx + vy * dy + vz * dz;

  if (dot < 0) {
    return [-vx, -vy, -vz];
  }

  return [vx, vy, vz];
}
```

### 4.3 Adjacency Edge Method Integration (`H3AdjacencyGraph`)

```typescript
export class H3AdjacencyGraph {
  // ... existing members

  /**
   * Orients an arbitrary boundary flux vector along the directed edge from source to target.
   *
   * @param sourceHex - H3 index of source cell
   * @param targetHex - H3 index of target cell
   * @param fluxVector - 3D vector of candidate flux
   * @returns Inverted vector if dot product with (target - source) is negative, else identical vector
   */
  public orientEdgeFluxVector(
    sourceHex: string,
    targetHex: string,
    fluxVector: Vector3Tuple
  ): Vector3Tuple {
    const origin = this.getCellCentroid3D(sourceHex);
    const target = this.getCellCentroid3D(targetHex);
    return orientVectorTowardsTarget3D(fluxVector, origin, target);
  }
}
```

---

## 5. Test Vectors & Numerical Assertions

| Test Case ID | Vector $\mathbf{v}$ | Displacement $\mathbf{d}$ | Dot Product $\mathbf{v} \cdot \mathbf{d}$ | Expected $\mathbf{v}^*$ | Norm Conserved |
|---|---|---|---|---|---|
| `TC-01-POS` | `[1.0, 2.0, 3.0]` | `[1.0, 0.0, 0.0]` | $+1.0 > 0$ | `[1.0, 2.0, 3.0]` | Yes ($\sqrt{14}$) |
| `TC-02-NEG` | `[1.0, 2.0, 3.0]` | `[-1.0, 0.0, 0.0]` | $-1.0 < 0$ | `[-1.0, -2.0, -3.0]` | Yes ($\sqrt{14}$) |
| `TC-03-ORTHO`| `[0.0, 1.0, 0.0]` | `[1.0, 0.0, 0.0]` | $0.0 = 0$ | `[0.0, 1.0, 0.0]` | Yes ($1.0$) |
| `TC-04-ZERO-V`| `[0.0, 0.0, 0.0]` | `[3.0, 4.0, 5.0]` | $0.0 = 0$ | `[0.0, 0.0, 0.0]` | Yes ($0.0$) |
| `TC-05-ZERO-D`| `[1.0, -2.0, 1.5]`| `[0.0, 0.0, 0.0]` | $0.0 = 0$ | `[1.0, -2.0, 1.5]` | Yes ($\sqrt{7.25}$) |
| `TC-06-3ARG-POS`| `[0.5, 0.5, 0.0]` | $O=[0,0,0], T=[1,1,0]$ | $+1.0 > 0$ | `[0.5, 0.5, 0.0]` | Yes ($\sqrt{0.5}$) |
| `TC-07-3ARG-NEG`| `[0.5, 0.5, 0.0]` | $O=[1,1,0], T=[0,0,0]$ | $-1.0 < 0$ | `[-0.5, -0.5, 0.0]` | Yes ($\sqrt{0.5}$) |

---

## 6. Execution Verification Matrix

1. **Mass Stock Balance:**
   $\forall k \in \{ \text{CO}_2, \text{H}_2\text{O}, \text{O}_2, \text{minerals}, \text{biomass} \}$, $| \Delta S_k(C_i) + \Delta S_k(C_j) | < 10^{-15}$.
2. **Thermal Energy Balance:**
   $| \Delta E_{\text{thermal}}(C_i) + \Delta E_{\text{thermal}}(C_j) | < 10^{-12} \, \text{J}$.
3. **Isometry Guarantee:**
   $| \|\mathbf{v}^*\|_2 - \|\mathbf{v}\|_2 | < 10^{-15}$.
4. **Target Alignment Invariant:**
   $\langle \mathbf{v}^*, \mathbf{d} \rangle \ge 0$ for all finite inputs.