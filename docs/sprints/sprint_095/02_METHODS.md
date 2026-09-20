# Method Specifications: Hierarchical Aperture-7 Class III Coordinate Rotation Angle Computation

- **Sprint**: 095
- **Author**: Process Mining & Research Scientist
- **Status**: Complete Formalization
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Related Modules**: `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`, `src/spatial/h3_types.ts`

---

## 1. Physical & Mathematical Foundations

### 1.1 Discrete Global Grid Hierarchy and Aperture-7 Hexagonal Geometry
In discrete global grid systems (DGGS) based on Aperture-7 hexagonal tessellations (such as Uber H3), the spatial hierarchy transitions between cell resolutions $r \in [0, 15]$ by subdividing each parent hexagon into approximately 7 child hexagons.

The spatial orientation of the hexagonal lattice alternates between two topological alignment classes:
1. **Class II**: The hexagon vertices align symmetrically with the principal icosahedral coordinate axes (rotational offset $\theta \equiv 0 \pmod{\pi/3}$).
2. **Class III**: The coordinate basis undergoes a counter-rotation by an irrational angular step $\theta_{\text{ap7}}$ relative to the centroidal axis, given by:
   $$\theta_{\text{ap7}} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.33347317229183211765 \text{ rad} \quad (\approx 19.10660535086408^\circ)$$

The cumulative rotation angle $\Theta(r_1, r_2)$ between resolution $r_1$ and resolution $r_2$ is directly proportional to the net number of Class III transitions traversed:
$$\Theta(r_1, r_2) = n_{\text{III}}(r_1, r_2) \cdot \theta_{\text{ap7}}$$
Where $n_{\text{III}}(r_1, r_2) = \text{countClassIIIApertureSteps}(r_1, r_2) \in \mathbb{Z}$.

### 1.2 Class III Aperture Step Determination
Resolution classes alternate deterministically across the H3 hierarchy:
- Even resolutions ($r \in \{0, 2, 4, 6, 8, 10, 12, 14\}$) are Class II.
- Odd resolutions ($r \in \{1, 3, 5, 7, 9, 11, 13, 15\}$) are Class III.

When traversing from resolution $r_1$ to $r_2$:
- Each odd resolution index stepped into or through induces an aperture shift.
- Explicitly, the step count $n_{\text{III}}(r_1, r_2)$ represents the cumulative signed count of Class III parity switches along the directional hierarchy traverse:
  $$n_{\text{III}}(r_1, r_2) = \operatorname{sgn}(r_2 - r_1) \sum_{k=\min(r_1, r_2)}^{\max(r_1, r_2) - 1} w(k)$$
  where for an edge transition $k \to k+1$, $w(k) = 1$ if resolution $k+1$ is Class III (odd $k+1$), and $w(k) = 0$ if resolution $k+1$ is Class II (even $k+1$).
- Thus:
  $$n_{\text{III}}(0, 0) = 0$$
  $$n_{\text{III}}(0, 1) = +1$$
  $$n_{\text{III}}(0, 2) = +1$$
  $$n_{\text{III}}(1, 2) = 0$$
  $$n_{\text{III}}(0, 3) = +2$$
  $$n_{\text{III}}(3, 0) = -2$$
- Antisymmetry holds globally: $n_{\text{III}}(r_1, r_2) = -n_{\text{III}}(r_2, r_1)$.

### 1.3 Thermodynamic Invariance & Vector Flux Conservation
Let $\mathbf{J} = \begin{bmatrix} J_x \\ J_y \end{bmatrix}$ represent any horizontal vector flux density across cell boundaries (e.g., advective moisture flux, latent heat flux, sensible heat flux, or lateral dissolved carbon flux).

When projecting flux vectors between grid systems rotated by $\Theta \equiv \Theta(r_1, r_2)$, the spatial coordinate transform is given by the rotation tensor $\mathbf{R}(\Theta) \in \mathrm{SO}(2)$:
$$\mathbf{R}(\Theta) = \begin{bmatrix} \cos\Theta & -\sin\Theta \\ \sin\Theta & \cos\Theta \end{bmatrix}$$
$$\mathbf{J}' = \mathbf{R}(\Theta) \mathbf{J}$$

#### Physical Invariants:
1. **Norm Invariance (First Law of Thermodynamics)**:
   $$\|\mathbf{J}'\|^2 = (J_x \cos\Theta - J_y \sin\Theta)^2 + (J_x \sin\Theta + J_y \cos\Theta)^2 = J_x^2 + J_y^2 = \|\mathbf{J}\|^2$$
   No energy, mass, or momentum is artificially created or destroyed by grid rotation.
2. **Divergence Invariance**:
   $$\nabla' \cdot \mathbf{J}' = \nabla \cdot \mathbf{J}$$
   Net stock accruals within finite control volumes remain conserved under rotation.
3. **Entropy Dissipation Non-Negativity (Second Law of Thermodynamics)**:
   The local entropy generation rate $\sigma \ge 0$ due to thermal diffusion $\mathbf{J}_q$ along temperature gradient $\nabla T$:
   $$\sigma = -\frac{1}{T^2} \mathbf{J}_q' \cdot \nabla' T = -\frac{1}{T^2} (\mathbf{R}\mathbf{J}_q) \cdot (\mathbf{R}\nabla T) = -\frac{1}{T^2} \mathbf{J}_q \cdot \nabla T \ge 0$$
   Because $\mathbf{R}^T \mathbf{R} = \mathbf{I}$, the entropy production scalar is strictly invariant under $\mathrm{SO}(2)$ coordinate transformations.

---

## 2. Mass & Energy Flux Quantifications

### 2.1 State Vector Definition
For an H3 cell $c$, the thermodynamic and biogeochemical stock vector is:
$$\mathbf{S}_c = \begin{bmatrix} M_{\text{C}} \\ M_{\text{H}_2\text{O}} \\ M_{\text{minerals}} \\ M_{\text{O}_2} \\ U \end{bmatrix} \in \mathbb{R}^5$$
where:
- $M_{\text{C}}$: Carbon mass $(\text{kg})$
- $M_{\text{H}_2\text{O}}$: Total water mass $(\text{kg})$ (liquid, vapor, ice)
- $M_{\text{minerals}}$: Soil mineral nutrients $(\text{kg})$ (N, P, K compounds)
- $M_{\text{O}_2}$: Dissolved/atmospheric oxygen mass $(\text{kg})$
- $U$: Internal thermal energy $(\text{J})$

### 2.2 Lateral Multi-Resolution Flux Dynamics
Across a directional boundary between cell $c_1$ (resolution $r_1$) and cell $c_2$ (resolution $r_2$), the physical flux matrix $\boldsymbol{\Phi}_{1 \to 2}$ carries mass and energy per unit contact edge length $L$:
$$\boldsymbol{\Phi}_{1 \to 2} = \begin{bmatrix}
\mathbf{J}_{\text{C}} \\
\mathbf{J}_{\text{H}_2\text{O}} \\
\mathbf{J}_{\text{minerals}} \\
\mathbf{J}_{\text{O}_2} \\
\mathbf{J}_{U}
\end{bmatrix} \in \mathbb{R}^{5 \times 2}, \quad \text{where } \mathbf{J}_k = \begin{bmatrix} J_{k,x} \\ J_{k,y} \end{bmatrix}$$

Applying the Class III Aperture rotation $\Theta = \text{computeClassIIIRotationAngleRadians}(r_1, r_2)$:
$$\mathbf{J}_{k}' = \mathbf{R}(\Theta) \mathbf{J}_k = \begin{bmatrix} \cos\Theta & -\sin\Theta \\ \sin\Theta & \cos\Theta \end{bmatrix} \begin{bmatrix} J_{k,x} \\ J_{k,y} \end{bmatrix}$$

The boundary-normal flux scalar $j_{k, \perp}$ across inter-cell boundary edge normal vector $\hat{\mathbf{n}}_{12}$ is:
$$j_{k, \perp} = \mathbf{J}_{k}' \cdot \hat{\mathbf{n}}_{12}$$

### 2.3 Discrete Time Stock Transfer Equations
For simulation time step $\Delta t$ (seconds) and interface contact length $L_{12}$ (meters):
$$\Delta \mathbf{S}_{1 \to 2} = \Delta t \cdot L_{12} \begin{bmatrix}
j_{\text{C}, \perp} \\
j_{\text{H}_2\text{O}, \perp} \\
j_{\text{minerals}, \perp} \\
j_{\text{O}_2, \perp} \\
j_{U, \perp}
\end{bmatrix}$$

Conservation guarantees:
$$\mathbf{S}_{c_1}(t + \Delta t) = \mathbf{S}_{c_1}(t) - \Delta \mathbf{S}_{1 \to 2}$$
$$\mathbf{S}_{c_2}(t + \Delta t) = \mathbf{S}_{c_2}(t) + \Delta \mathbf{S}_{1 \to 2}$$
$$\sum \Delta \mathbf{S} = \mathbf{0}$$

---

## 3. Mathematical Specifications for `src/spatial/h3_adjacency.ts`

### 3.1 Constant Formalization
```typescript
/**
 * Fundamental rotation angle for Aperture-7 Class III hexagon resolutions in radians.
 * θ_ap7 = arcsin(sqrt(3) / (2 * sqrt(7))) ≈ 0.33347317229183211765 rad (~19.106605 deg).
 */
export const APERTURE_7_ROTATION_RAD: number = 0.3334731722918321;
```

### 3.2 `countClassIIIApertureSteps`
```typescript
/**
 * Computes the signed count of Class III aperture rotation steps between two H3 resolutions.
 * 
 * In an Aperture-7 hierarchy:
 * - Even resolutions (0, 2, 4, ...) are Class II.
 * - Odd resolutions (1, 3, 5, ...) are Class III.
 * Stepping into an odd resolution from an even resolution advances the rotation by +1 step.
 * Stepping from an odd resolution to an even resolution introduces 0 rotation steps.
 * Reverse transitions produce the antisymmetric negative steps.
 *
 * @param startRes - Base resolution in [0, 15]
 * @param targetRes - Target resolution in [0, 15]
 * @returns Signed integer count of Class III aperture steps.
 * @throws RangeError if startRes or targetRes are out of the [0, 15] range or not integers.
 */
export function countClassIIIApertureSteps(startRes: number, targetRes: number): number {
  if (!Number.isInteger(startRes) || startRes < 0 || startRes > 15) {
    throw new RangeError(`startRes must be an integer between 0 and 15. Received: ${startRes}`);
  }
  if (!Number.isInteger(targetRes) || targetRes < 0 || targetRes > 15) {
    throw new RangeError(`targetRes must be an integer between 0 and 15. Received: ${targetRes}`);
  }

  if (startRes === targetRes) {
    return 0;
  }

  const forward = targetRes > startRes;
  const min = forward ? startRes : targetRes;
  const max = forward ? targetRes : startRes;

  let steps = 0;
  for (let r = min; r < max; r++) {
    // When transitioning from r to r + 1:
    // If r + 1 is odd (Class III), a Class III rotation step occurs.
    if ((r + 1) % 2 !== 0) {
      steps += 1;
    }
  }

  return forward ? steps : -steps;
}
```

### 3.3 `computeClassIIIRotationAngleRadians`
```typescript
/**
 * Computes the cumulative rotation angle in radians for Class III Aperture-7 transitions
 * between two resolutions, scaling APERTURE_7_ROTATION_RAD by countClassIIIApertureSteps.
 *
 * Normalizes output into [-PI, PI) when normalize is true.
 *
 * @param startRes - Base resolution (0-15)
 * @param targetRes - Target resolution (0-15)
 * @param normalize - Optional flag to normalize output to [-PI, PI). Defaults to true.
 * @returns Cumulative rotation angle in radians.
 */
export function computeClassIIIRotationAngleRadians(
  startRes: number,
  targetRes: number,
  normalize: boolean = true
): number {
  const steps = countClassIIIApertureSteps(startRes, targetRes);
  const rawAngle = steps * APERTURE_7_ROTATION_RAD;

  if (!normalize) {
    return rawAngle;
  }

  // Normalize to [-PI, PI)
  // angle - 2*PI * floor((angle + PI) / (2*PI))
  const twoPi = 2 * Math.PI;
  const wrapped = rawAngle - twoPi * Math.floor((rawAngle + Math.PI) / twoPi);
  
  // Guard against float precision edge case where wrapped could equal PI
  return wrapped === Math.PI ? -Math.PI : wrapped;
}
```

---

## 4. Executable Monad Method Formalization

### 4.1 Monad Interface: `SpatialFluxMonad`
The coordinate rotation directly powers `SpatialFluxMonad.rotateInterResolutionVector`:

```typescript
export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export interface CellThermodynamicStock {
  readonly carbonKg: number;
  readonly waterKg: number;
  readonly mineralsKg: number;
  readonly oxygenKg: number;
  readonly internalEnergyJoules: number;
}

export class SpatialFluxMonad {
  private constructor(
    private readonly resolution: number,
    private readonly fluxVector: Vector2D,
    private readonly stocks: CellThermodynamicStock
  ) {}

  public static of(
    resolution: number,
    fluxVector: Vector2D,
    stocks: CellThermodynamicStock
  ): SpatialFluxMonad {
    return new SpatialFluxMonad(resolution, fluxVector, stocks);
  }

  /**
   * Transforms the flux vector into target resolution coordinates by computing
   * the Class III Aperture-7 rotation angle and applying SO(2) rotation.
   */
  public alignToResolution(targetRes: number): SpatialFluxMonad {
    const theta = computeClassIIIRotationAngleRadians(this.resolution, targetRes);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const rotatedVector: Vector2D = {
      x: this.fluxVector.x * cosT - this.fluxVector.y * sinT,
      y: this.fluxVector.x * sinT + this.fluxVector.y * cosT
    };

    // Vector magnitude invariant verification
    const originalNorm = Math.hypot(this.fluxVector.x, this.fluxVector.y);
    const transformedNorm = Math.hypot(rotatedVector.x, rotatedVector.y);
    if (Math.abs(originalNorm - transformedNorm) > 1e-12) {
      throw new Error(
        `First Law violation: Vector magnitude changed from ${originalNorm} to ${transformedNorm}`
      );
    }

    return new SpatialFluxMonad(targetRes, rotatedVector, this.stocks);
  }

  /**
   * Applies advective flux across an interface boundary of length L over interval dt,
   * returning updated stock state while strictly conserving matter and energy.
   */
  public transferStocksAcrossBoundary(
    targetStock: CellThermodynamicStock,
    boundaryNormal: Vector2D,
    boundaryLengthMeters: number,
    dtSeconds: number
  ): [CellThermodynamicStock, CellThermodynamicStock] {
    const normalFluxMagnitude =
      this.fluxVector.x * boundaryNormal.x + this.fluxVector.y * boundaryNormal.y;

    const deltaCoefficient = normalFluxMagnitude * boundaryLengthMeters * dtSeconds;

    // Fractional transfer based on flux density
    const dCarbon = this.stocks.carbonKg * deltaCoefficient;
    const dWater = this.stocks.waterKg * deltaCoefficient;
    const dMinerals = this.stocks.mineralsKg * deltaCoefficient;
    const dOxygen = this.stocks.oxygenKg * deltaCoefficient;
    const dEnergy = this.stocks.internalEnergyJoules * deltaCoefficient;

    const sourceUpdated: CellThermodynamicStock = {
      carbonKg: this.stocks.carbonKg - dCarbon,
      waterKg: this.stocks.waterKg - dWater,
      mineralsKg: this.stocks.mineralsKg - dMinerals,
      oxygenKg: this.stocks.oxygenKg - dOxygen,
      internalEnergyJoules: this.stocks.internalEnergyJoules - dEnergy
    };

    const targetUpdated: CellThermodynamicStock = {
      carbonKg: targetStock.carbonKg + dCarbon,
      waterKg: targetStock.waterKg + dWater,
      mineralsKg: targetStock.mineralsKg + dMinerals,
      oxygenKg: targetStock.oxygenKg + dOxygen,
      internalEnergyJoules: targetStock.internalEnergyJoules + dEnergy
    };

    return [sourceUpdated, targetUpdated];
  }
}
```

---

## 5. Test Vectors and Verification Matrices

| $r_1$ | $r_2$ | Expected $n_{\text{III}}$ | Raw Angle (rad) | Normalized Angle (rad) | Verification Notes |
|:-----:|:-----:|:-------------------------:|:---------------:|:----------------------:|:-------------------|
| 0 | 0 | 0 | 0.000000000 | 0.000000000 | Self-resolution identity |
| 0 | 1 | +1 | 0.333473172 | 0.333473172 | Single Class III step |
| 1 | 0 | -1 | -0.333473172 | -0.333473172 | Antisymmetric reversal |
| 0 | 2 | +1 | 0.333473172 | 0.333473172 | Class II parent to Class II grandchild via Class III |
| 1 | 2 | 0 | 0.000000000 | 0.000000000 | Odd to even adjacent step introduces 0 Class III switches |
| 2 | 1 | 0 | 0.000000000 | 0.000000000 | Reverse odd to even step |
| 0 | 3 | +2 | 0.666946345 | 0.666946345 | 2 Class III transitions (1 and 3) |
| 3 | 0 | -2 | -0.666946345 | -0.666946345 | Antisymmetric 3 to 0 |
| 0 | 7 | +4 | 1.333892689 | 1.333892689 | 4 Class III transitions (1, 3, 5, 7) |
| 0 | 15 | +8 | 2.667785378 | 2.667785378 | Maximum standard span |
| 15 | 0 | -8 | -2.667785378 | -2.667785378 | Maximum reverse span |
| 1 | 15 | +7 | 2.334312206 | 2.334312206 | Intra-Class III multi-span |

---

## 6. Audit & Validation Invariants

1. **Orthogonality**:
   For any returned rotation $\Theta$, $\det(\mathbf{R}(\Theta)) = \cos^2\Theta + \sin^2\Theta = 1.0 \pm 10^{-15}$.
2. **First Law Conservation**:
   For any state $\mathbf{S}_1, \mathbf{S}_2$, the divergence operator across transformed coordinates satisfies $\Delta \mathbf{S}_1 + \Delta \mathbf{S}_2 = \mathbf{0}$.
3. **Range Adherence**:
   For all valid inputs with `normalize = true`, $-\pi \le \Theta < \pi$.
4. **Exception Handling**:
   Passing $r \notin [0, 15]$ or non-integers rejects synchronously with `RangeError`.