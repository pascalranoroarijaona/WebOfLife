# Method Specification: Aperture-7 Class III Step Counter & Hierarchical Orientation Parity

## 1. Physical and Geometric Process Foundations

### 1.1 Aperture-7 Discrete Global Grid System (DGGS)
The discrete spatial topology of the Web of Life simulation engine is anchored upon Uber's H3 hierarchical hexagonal grid system. H3 is an aperture-7 hexagonal discrete global grid system ($1:7$ geometric area ratio per resolution level). 

In aperture-7 hexagonal hierarchies, spatial orientation does not remain static across successive scales. Successive resolution steps alternate between two distinct orientation classes:
- **Class II (Even Resolutions: $r \in \{0, 2, 4, 6, 8, 10, 12, 14\}$)**: Hexagons possess an orientation aligned with the base icosahedron face axes. Edges and vertices align symmetrically to canonical coordinate axes.
- **Class III (Odd Resolutions: $r \in \{1, 3, 5, 7, 9, 11, 13, 15\}$)**: Hexagonal cells are rotated relative to the parent frame by the characteristic aperture-7 rotation angle $\theta$:
  $$\theta = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.333473172 \text{ rad} \approx 19.106605350869^\circ$$

When spatial fluxes (biomass migration, hydrological transport, atmospheric carbon diffusion, thermal dissipation) are evaluated across multiscale parent-child cells or directional neighbor stencils, the coordinate basis undergoes a rotation:
$$\mathbf{R}(\Delta \theta) = \begin{bmatrix} \cos(\Delta \theta) & -\sin(\Delta \theta) \\ \sin(\Delta \theta) & \cos(\Delta \theta) \end{bmatrix}$$
where $\Delta \theta$ is governed by the parity of odd (Class III) resolution levels traversed.

### 1.2 Directional Adjacency and Laplacian Stencils
The discrete spatial divergence $\nabla \cdot \mathbf{J}$ for a conserved stock $S$ across hexagonal neighbors $k \in \{0, \dots, 5\}$ is given by:
$$\nabla \cdot \mathbf{J}_c = \frac{1}{A_r} \sum_{k=0}^5 \mathbf{J}_{c,k} \cdot \mathbf{n}_k^{(r)} \cdot L_r$$
where:
- $A_r$ is the cell area at resolution $r$: $A_r = A_0 \cdot 7^{-r}$.
- $L_r$ is the hexagon edge length at resolution $r$: $L_r = L_0 \cdot 7^{-r/2}$.
- $\mathbf{n}_k^{(r)}$ is the unit normal vector directed toward neighbor $k$.

Because the basis orientation rotates by $\theta$ on every odd resolution transition and reverses on the subsequent even transition, the directional index mapping $k \mapsto \mathbf{n}_k^{(r)}$ requires the exact Class III step count to establish directional parity and prevent artificial numerical dispersion or spurious vorticity.

---

## 2. Mathematical Formalism of Class III Counting

### 2.1 Single-Target Step Counter
Let $r \in \mathbb{N}_0 \cap [0, 15]$ denote the target H3 resolution. The set of intermediate resolution transitions from base resolution $0$ to $r$ is $\{1, 2, \dots, r\}$. A resolution step $k$ introduces a Class III rotation if and only if $k$ is an odd integer ($k \equiv 1 \pmod 2$).

The total count of Class III aperture steps from base resolution 0 to resolution $r$ is:
$$N_{\text{Class III}}(r) = \sum_{k=1}^r (k \bmod 2) = \left\lfloor \frac{r + 1}{2} \right\rfloor$$

Similarly, the total count of Class II aperture steps is:
$$N_{\text{Class II}}(r) = r - N_{\text{Class III}}(r) = \left\lfloor \frac{r}{2} \right\rfloor$$

### 2.2 Arbitrary Interval Step Counter
For transitions between arbitrary resolutions $r_{\text{start}}, r_{\text{target}} \in [0, 15]$:
$$r_{\min} = \min(r_{\text{start}}, r_{\text{target}}), \quad r_{\max} = \max(r_{\text{start}}, r_{\text{target}})$$
The cumulative Class III steps traversed between the two scales is:
$$N_{\text{Class III}}(r_{\text{start}}, r_{\text{target}}) = \left\lfloor \frac{r_{\max} + 1}{2} \right\rfloor - \left\lfloor \frac{r_{\min} + 1}{2} \right\rfloor$$

### 2.3 Parity Properties and Invariants
1. **Zero Self-Transition**: $N_{\text{Class III}}(r, r) = 0$ for all $r \in [0, 15]$.
2. **Symmetry / Reversibility**: $N_{\text{Class III}}(r_{\text{start}}, r_{\text{target}}) = N_{\text{Class III}}(r_{\text{target}}, r_{\text{start}})$.
3. **Additivity / Triangle Equality**: For any intermediate resolution $r_{\text{mid}}$ such that $r_{\text{start}} \le r_{\text{mid}} \le r_{\text{target}}$:
   $$N_{\text{Class III}}(r_{\text{start}}, r_{\text{target}}) = N_{\text{Class III}}(r_{\text{start}}, r_{\text{mid}}) + N_{\text{Class III}}(r_{\text{mid}}, r_{\text{target}})$$
4. **Partition Completeness**: 
   $$N_{\text{Class III}}(r_{\text{start}}, r_{\text{target}}) + N_{\text{Class II}}(r_{\text{start}}, r_{\text{target}}) = |r_{\text{target}} - r_{\text{start}}|$$
5. **Class Identity**:
   $$\text{isClassIII}(r) = \begin{cases} \text{true}, & r \equiv 1 \pmod 2 \\ \text{false}, & r \equiv 0 \pmod 2 \end{cases}$$

---

## 3. Mass and Energy Conservation Across Multiscale Hexagonal Fluxes

### 3.1 State Stock Vector
Each hexagonal DGGS cell $c$ at resolution $r$ maintains a conserved state vector $\mathbf{S}_c \in \mathbb{R}^6_{\ge 0}$:
$$\mathbf{S}_c = \begin{bmatrix} M_{\text{C}} \\ M_{\text{H}_2\text{O}} \\ M_{\text{O}_2} \\ M_{\text{min}} \\ E_{\text{thermal}} \\ M_{\text{biomass}} \end{bmatrix} \quad \begin{matrix} \text{[kg C]} \\ \text{[kg H}_2\text{O]} \\ \text{[kg O}_2\text{]} \\ \text{[kg minerals]} \\ \text{[MJ]} \\ \text{[kg dry matter]} \end{matrix}$$

### 3.2 Projection (Coarsening) Operator: Resolution $r \to r-1$
When aggregating fine-resolution states $\{c_1, \dots, c_7\} \subset \text{Children}(p)$ into parent cell $p$:
$$\mathbf{S}_p = \sum_{i=1}^7 \mathbf{S}_{c_i}$$
$$\Delta \mathbf{S}_{\text{projection}} = \mathbf{S}_p - \sum_{i=1}^7 \mathbf{S}_{c_i} \equiv \mathbf{0}$$
Mass and energy are strictly conserved ($\Delta M = 0$, $\Delta E = 0$).

### 3.3 Prolongation (Refinement) Operator: Resolution $r-1 \to r$
When downscaling from parent cell $p$ to sub-cells $c_i \in \text{Children}(p)$, weighting factors $w_i$ ($\sum_{i=1}^7 w_i = 1$) distribute the parent stock:
$$\mathbf{S}_{c_i} = w_i \mathbf{S}_p$$
$$\sum_{i=1}^7 \mathbf{S}_{c_i} = \mathbf{S}_p \sum_{i=1}^7 w_i = \mathbf{S}_p \implies \Delta \mathbf{S}_{\text{prolongation}} \equiv \mathbf{0}$$

### 3.4 Directional Flux Transformation Matrix
When calculating directional diffusion $\mathbf{J}$ between cells across resolution levels, orientation parity governs the rotation angle:
$$\phi(r) = (r \bmod 2) \cdot \theta \approx (r \bmod 2) \cdot 19.106605^\circ$$
$$\Delta \phi(r_{\text{start}}, r_{\text{target}}) = \phi(r_{\text{target}}) - \phi(r_{\text{start}}) = ((r_{\text{target}} \bmod 2) - (r_{\text{start}} \bmod 2)) \cdot \theta$$

The rotated flux vector $\mathbf{J}'$ is:
$$\mathbf{J}' = \mathbf{R}(\Delta \phi) \mathbf{J} = \begin{bmatrix} \cos(\Delta \phi) & -\sin(\Delta \phi) \\ \sin(\Delta \phi) & \cos(\Delta \phi) \end{bmatrix} \begin{bmatrix} J_u \\ J_v \end{bmatrix}$$

Because $\mathbf{R}(\Delta \phi)$ is an orthogonal matrix ($\det(\mathbf{R}) = 1$, $\mathbf{R}^T \mathbf{R} = \mathbf{I}$), flux magnitude is strictly preserved:
$$\|\mathbf{J}'\|_2 = \|\mathbf{J}\|_2$$
Ensuring zero synthetic generation of kinetic energy or mass flux magnitude.

---

## 4. Executable Monad Method Specifications

### 4.1 `countClassIIIApertureSteps`
Computes the exact number of odd resolution transitions between two resolutions.

```typescript
/**
 * Computes the number of Class III (odd resolution) aperture transitions
 * between startResolution and targetResolution.
 *
 * @param targetResolution - Desired H3 resolution level [0..15]
 * @param startResolution  - Starting H3 resolution level [0..15] (default: 0)
 * @returns Non-negative integer count of Class III steps
 * @throws RangeError if resolutions are outside [0..15] or non-integer
 */
export function countClassIIIApertureSteps(
  targetResolution: number,
  startResolution: number = 0
): number {
  if (!Number.isInteger(targetResolution) || targetResolution < 0 || targetResolution > 15) {
    throw new RangeError(`Invalid targetResolution: ${targetResolution}. Must be integer in [0, 15].`);
  }
  if (!Number.isInteger(startResolution) || startResolution < 0 || startResolution > 15) {
    throw new RangeError(`Invalid startResolution: ${startResolution}. Must be integer in [0, 15].`);
  }

  const minRes = Math.min(startResolution, targetResolution);
  const maxRes = Math.max(startResolution, targetResolution);

  const oddUpToMax = Math.floor((maxRes + 1) / 2);
  const oddUpToMin = Math.floor((minRes + 1) / 2);

  return oddUpToMax - oddUpToMin;
}
```

### 4.2 `isClassIIIResolution`
Determines whether a given resolution belongs to Class III (odd) or Class II (even).

```typescript
/**
 * Checks whether an H3 resolution is Class III (odd resolution, tilted orientation).
 *
 * @param resolution - H3 resolution level [0..15]
 * @returns true if Class III, false if Class II
 * @throws RangeError if resolution is outside [0..15] or non-integer
 */
export function isClassIIIResolution(resolution: number): boolean {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Invalid resolution: ${resolution}. Must be integer in [0, 15].`);
  }
  return (resolution & 1) === 1;
}
```

### 4.3 `getApertureClassProfile`
Provides comprehensive structural parity analysis between two resolution levels.

```typescript
export interface ApertureClassProfile {
  readonly startResolution: number;
  readonly targetResolution: number;
  readonly classIIISteps: number;
  readonly classIISteps: number;
  readonly totalSteps: number;
  readonly isTargetClassIII: boolean;
  readonly netOrientationDeltaRad: number;
}

const APERTURE_7_ROTATION_RAD = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7))); // ~0.333473172209592 rad

/**
 * Returns detailed aperture step and orientation diagnostics between two resolutions.
 */
export function getApertureClassProfile(
  targetResolution: number,
  startResolution: number = 0
): ApertureClassProfile {
  const classIIISteps = countClassIIIApertureSteps(targetResolution, startResolution);
  const totalSteps = Math.abs(targetResolution - startResolution);
  const classIISteps = totalSteps - classIIISteps;
  const isTargetClassIII = isClassIIIResolution(targetResolution);

  // Net rotation is determined by difference in odd parity between start and target
  const startClassIII = isClassIIIResolution(startResolution);
  let netOrientationDeltaRad = 0;
  if (!startClassIII && isTargetClassIII) {
    netOrientationDeltaRad = APERTURE_7_ROTATION_RAD;
  } else if (startClassIII && !isTargetClassIII) {
    netOrientationDeltaRad = -APERTURE_7_ROTATION_RAD;
  }

  return {
    startResolution,
    targetResolution,
    classIIISteps,
    classIISteps,
    totalSteps,
    isTargetClassIII,
    netOrientationDeltaRad,
  };
}
```

---

## 5. Thermodynamic Process Delta Tables

The table below quantifies process deltas during inter-resolution transformation operations under Class III rotation correction:

| Operation | Scale Transition | $\Delta M_{\text{C}}$ [kg] | $\Delta M_{\text{H}_2\text{O}}$ [kg] | $\Delta M_{\text{min}}$ [kg] | $\Delta E_{\text{thermal}}$ [MJ] | $\Delta \sigma$ (Entropy) [J/K] |
|---|---|---|---|---|---|---|
| **Prolongation (Res 0 $\to$ 1)** | Class II $\to$ Class III | $0.0000$ | $0.0000$ | $0.0000$ | $0.0000$ | $\ge 0$ |
| **Prolongation (Res 1 $\to$ 2)** | Class III $\to$ Class II | $0.0000$ | $0.0000$ | $0.0000$ | $0.0000$ | $\ge 0$ |
| **Restriction (Res 2 $\to$ 1)** | Class II $\to$ Class III | $0.0000$ | $0.0000$ | $0.0000$ | $0.0000$ | $\ge 0$ |
| **Restriction (Res 1 $\to$ 0)** | Class III $\to$ Class II | $0.0000$ | $0.0000$ | $0.0000$ | $0.0000$ | $\ge 0$ |
| **Cross-Level Flux Stencil** | $r \to r \pm k$ | $0.0000$ | $0.0000$ | $0.0000$ | $0.0000$ | $\ge 0$ |

All geometric step calculations are strictly isenthalpic ($\Delta H = 0$) and isomass ($\Delta M = 0$).

---

## 6. Verification and Validation Checklist

1. **Analytical Identity**: `countClassIIIApertureSteps(r, r) === 0` for all $r \in [0, 15]$.
2. **Cumulative Base Verification**:
   - $r=0 \implies 0$
   - $r=1 \implies 1$
   - $r=2 \implies 1$
   - $r=3 \implies 2$
   - $r=7 \implies 4$
   - $r=15 \implies 8$
3. **Partition Integrity**: `classIIISteps + classIISteps === totalSteps`.
4. **Commutativity**: `countClassIIIApertureSteps(a, b) === countClassIIIApertureSteps(b, a)`.
5. **Strict Bounds Checking**: Inputs outside $[0, 15]$, floating-point values, and `NaN` values trigger immediate `RangeError` exceptions.