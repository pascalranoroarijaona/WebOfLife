# Method Specifications: Tangent Space Projection & Conservative Spherical Advection

## 1. Physical, Biological, and Fluid Dynamic Foundations

### 1.1 Differential Geometry of the Planetary Shell
Planetary biogeochemical transport occurs within thin planetary envelopes (troposphere, oceanic mixed layer, biosphere canopy) bounded radially by the solid lithosphere at $r = R_{\text{planet}}$ and the planetary exosphere/space boundary at $r = R_{\text{planet}} + H_{\text{atm}}$. Because the vertical aspect ratio $\epsilon_H = H_{\text{atm}} / R_{\text{planet}} \sim 10^{-3} \ll 1$, large-scale physical advective fluxes are constrained to the two-dimensional spherical manifold $S^2 \subset \mathbb{R}^3$:

$$S^2 = \left\{ \mathbf{p} \in \mathbb{R}^3 \;\middle|\; \|\mathbf{p}\|_2 = R \right\}$$

The outward unit normal vector at any position $\mathbf{p} = [p_x, p_y, p_z]^T$ is:
$$\hat{\mathbf{n}}(\mathbf{p}) = \frac{\mathbf{p}}{\|\mathbf{p}\|_2}$$

For any 3D Cartesian velocity vector field $\mathbf{v} \in \mathbb{R}^3$, the direct sum decomposition of the vector bundle over $S^2$ is:
$$\mathbb{R}^3 = T_{\mathbf{p}}S^2 \oplus N_{\mathbf{p}}S^2$$

where $T_{\mathbf{p}}S^2$ is the tangent space and $N_{\mathbf{p}}S^2 = \text{span}\{\hat{\mathbf{n}}(\mathbf{p})\}$ is the radial normal bundle. The orthogonal tangent projection operator $\mathcal{P}_{T_{\mathbf{p}}S^2}$ strips radial momentum:
$$\mathcal{P}_{T_{\mathbf{p}}S^2}(\mathbf{v}) = \mathbf{v}_\perp = \mathbf{v} - (\mathbf{v} \cdot \hat{\mathbf{n}})\hat{\mathbf{n}} = \mathbf{v} - \left(\frac{\mathbf{v} \cdot \mathbf{p}}{\|\mathbf{p}\|^2}\right)\mathbf{p}$$

### 1.2 Boundary Impermeability & The Radial Leakage Problem
In unprojected Cartesian vector schemes, small truncation errors or coordinate transformations induce an artificial radial velocity $v_r = \mathbf{v} \cdot \hat{\mathbf{n}} \neq 0$. Across a surface finite volume cell of lateral area $A_c$, an unprojected radial velocity creates a non-physical boundary flux of conserved scalar stock $C$ (such as dissolved inorganic carbon, moisture, or fixed nitrogen):

$$\Phi_{\text{leak}} = \oint_{\partial \Omega_{\text{radial}}} C (\mathbf{v} \cdot \hat{\mathbf{n}}) \, dA \neq 0$$

- If $v_r > 0$, mass is artificially vented into space (e.g., carbon venting, hydrologic escape).
- If $v_r < 0$, mass sinks into the impermeable planetary core (unphysical lithospheric sequestration).

By enforcing $\mathbf{v} \equiv \mathbf{v}_\perp$ such that $\mathbf{v}_\perp \cdot \mathbf{p} = 0$, the boundary normal flux identically satisfies:
$$\Phi_{\text{leak}} \equiv 0$$
guaranteeing strict mass conservation within the spherical boundary layer.

---

## 2. Quantitative Process Deltas & Thermodynamic Stoichiometry

### 2.1 State Vector Definition
Each discrete H3 cell $i$ on the manifold maintains an extensive stock vector $\mathbf{S}_i \in \mathbb{R}^6$:

$$\mathbf{S}_i = \begin{bmatrix} M_{C, i} \\ M_{H_2O, i} \\ M_{N, i} \\ M_{P, i} \\ M_{O_2, i} \\ U_i \end{bmatrix} \begin{array}{l} \text{(Total Carbon, mol C)} \\ \text{(Total Water, kg } \text{H}_2\text{O)} \\ \text{(Reactive Nitrogen, mol N)} \\ \text{(Labile Phosphorus, mol P)} \\ \text{(Dissolved/Atmospheric Oxygen, mol } \text{O}_2\text{)} \\ \text{(Internal Thermal Energy, J)} \end{array}$$

The volumetric/areal concentration vector is defined per cell area $A_i$ ($\text{m}^2$):
$$\mathbf{c}_i = \frac{\mathbf{S}_i}{A_i}$$

### 2.2 Geodesic Facet Tangent Flux Formulation
For an H3 hexagonal cell $i$ with neighbor $j$, let:
- $\mathbf{p}_i, \mathbf{p}_j \in \mathbb{R}^3$: Cartesian cell centroids on sphere radius $R$.
- $\mathbf{m}_{ij} = \frac{\mathbf{p}_i + \mathbf{p}_j}{\|\mathbf{p}_i + \mathbf{p}_j\|} R$: Midpoint on the spherical manifold.
- $\mathbf{d}_{ij} = \mathbf{p}_j - \mathbf{p}_i$: Chord vector connecting centroids.
- $\mathbf{t}_{ij} = \mathcal{P}_{T_{\mathbf{m}_{ij}}S^2}(\mathbf{d}_{ij})$: Tangential direction vector between cell $i$ and $j$.
- $\hat{\mathbf{e}}_{ij} = \frac{\mathbf{t}_{ij}}{\|\mathbf{t}_{ij}\|}$: Unit geodesic direction from cell $i$ to cell $j$.
- $L_{ij}$: Geodesic edge length between cells $i$ and $j$ ($\text{m}$).

Given the tangential velocity at the facet $\mathbf{v}_{\perp, ij}$:
$$\mathbf{v}_{\perp, ij} = \mathcal{P}_{T_{\mathbf{m}_{ij}}S^2}\left( \frac{\mathbf{v}_i + \mathbf{v}_j}{2} \right)$$

The normal scalar advection velocity $u_{ij}$ crossing the facet from cell $i$ to $j$ is:
$$u_{ij} = \mathbf{v}_{\perp, ij} \cdot \hat{\mathbf{e}}_{ij}$$

Notice that $u_{ji} = -u_{ij}$ by antisymmetry of the boundary normal $\hat{\mathbf{e}}_{ji} = -\hat{\mathbf{e}}_{ij}$.

### 2.3 Upwind Mass & Energy Flux Deltas
Using a first-order donor-cell upwind discretization over timestep $\Delta t$:

$$F_{k, ij} = \begin{cases} u_{ij} L_{ij} \left(\dfrac{S_{k, i}}{A_i}\right) & \text{if } u_{ij} \ge 0 \\ u_{ij} L_{ij} \left(\dfrac{S_{k, j}}{A_j}\right) & \text{if } u_{ij} < 0 \end{cases}$$

The net discrete transfer delta $\Delta S_{k, i \to j}$ for stock $k$ across interface $e_{ij}$ during $\Delta t$ is:
$$\Delta S_{k, i \to j} = F_{k, ij} \Delta t$$

The stock state balance update for cell $i$ over all neighbors $\mathcal{N}(i)$ is:
$$S_{k, i}^{t + \Delta t} = S_{k, i}^t - \sum_{j \in \mathcal{N}(i)} \Delta S_{k, i \to j}$$

#### Mass Conservation Invariant:
$$\sum_{i \in \text{Grid}} \sum_{j \in \mathcal{N}(i)} \Delta S_{k, i \to j} \equiv 0 \implies \sum_{i \in \text{Grid}} S_{k, i}^{t + \Delta t} = \sum_{i \in \text{Grid}} S_{k, i}^t$$

#### Thermal Energy Advection Delta:
Thermal internal energy $U_i = c_{p, \text{bulk}} M_{\text{mass}, i} T_i$ advects identically:
$$\Delta U_{i \to j} = \begin{cases} u_{ij} L_{ij} \left(\dfrac{U_i}{A_i}\right) \Delta t & \text{if } u_{ij} \ge 0 \\ u_{ij} L_{ij} \left(\dfrac{U_j}{A_j}\right) \Delta t & \text{if } u_{ij} < 0 \end{cases}$$

### 2.4 Second-Law Entropy Generation & Stability Limits
The Courant-Friedrichs-Lewy (CFL) advective stability condition for each cell $i$ requires:
$$\Delta t \le \min_{i} \left( \frac{A_i}{\sum_{j \in \mathcal{N}(i)} \max(0, u_{ij}) L_{ij}} \right)$$

Physical entropy dissipation $\sigma_s \ge 0$ is preserved by ensuring no concentrations become negative:
$$S_{k, i}^{t + \Delta t} \ge 0 \quad \forall k \in \{C, H_2O, N, P, O_2\}$$

---

## 3. Algorithmic Monad Specifications

### 3.1 Vector3D Types and Core Projection Function

```typescript
export type Vector3D = readonly [number, number, number];

export interface TangentProjectionMetrics {
  readonly projected: Vector3D;
  readonly radialComponent: Vector3D;
  readonly radialMagnitude: number;
  readonly tangentialMagnitude: number;
  readonly orthogonalityError: number;
}

/**
 * Projects an arbitrary 3D Cartesian vector onto the tangent plane of a sphere at originPoint.
 * Strips the parallel radial component: v_perp = v - ((v . p) / ||p||^2) * p
 *
 * @param vector - Raw 3D Cartesian vector [vx, vy, vz]
 * @param originPoint - Sphere surface position vector [px, py, pz]
 * @param tolerance - Numerical singularity threshold (default 1e-12)
 * @returns Projected tangential vector [wx, wy, wz] in T_p S^2
 */
export function projectVectorOntoSphereTangentSpace(
  vector: Vector3D,
  originPoint: Vector3D,
  tolerance: number = 1e-12
): Vector3D {
  const [vx, vy, vz] = vector;
  const [px, py, pz] = originPoint;

  const r2 = px * px + py * py + pz * pz;
  if (r2 < tolerance * tolerance) {
    // Degenerate origin point at center of manifold: tangent space undefined
    return [0, 0, 0];
  }

  // Inner product: v . p
  const dot = vx * px + vy * py + vz * pz;
  const s = dot / r2;

  // w = v - s * p
  return [
    vx - s * px,
    vy - s * py,
    vz - s * pz
  ];
}

/**
 * Detailed projection audit computing numerical orthogonality metrics.
 */
export function projectVectorOntoSphereTangentSpaceDetailed(
  vector: Vector3D,
  originPoint: Vector3D,
  tolerance: number = 1e-12
): TangentProjectionMetrics {
  const [vx, vy, vz] = vector;
  const [px, py, pz] = originPoint;

  const r2 = px * px + py * py + pz * pz;
  if (r2 < tolerance * tolerance) {
    return {
      projected: [0, 0, 0],
      radialComponent: [0, 0, 0],
      radialMagnitude: 0,
      tangentialMagnitude: 0,
      orthogonalityError: 0,
    };
  }

  const dot = vx * px + vy * py + vz * pz;
  const s = dot / r2;

  const rx = s * px;
  const ry = s * py;
  const rz = s * pz;

  const wx = vx - rx;
  const wy = vy - ry;
  const wz = vz - rz;

  const radialMag = Math.sqrt(rx * rx + ry * ry + rz * rz);
  const tangMag = Math.sqrt(wx * wx + wy * wy + wz * wz);
  const rNorm = Math.sqrt(r2);

  // Residual dot product |w . p| / (||w|| * ||p||)
  const residualDot = Math.abs(wx * px + wy * py + wz * pz);
  const orthogonalityError = (tangMag * rNorm > 0) ? residualDot / (tangMag * rNorm) : 0;

  return {
    projected: [wx, wy, wz],
    radialComponent: [rx, ry, rz],
    radialMagnitude: radialMag,
    tangentialMagnitude: tangMag,
    orthogonalityError,
  };
}
```

### 3.2 Discrete Facet Advection Monad Method

```typescript
export interface CellStocks {
  readonly carbon: number;      // mol C
  readonly water: number;       // kg H2O
  readonly nitrogen: number;    // mol N
  readonly phosphorus: number;  // mol P
  readonly oxygen: number;      // mol O2
  readonly thermalEnergy: number; // Joules
}

export interface CellAdvectionState {
  readonly h3Index: string;
  readonly centroid: Vector3D;
  readonly area: number; // m^2
  readonly velocity: Vector3D; // Raw unprojected or projected vector
  readonly stocks: CellStocks;
}

export interface AdvectiveFluxEdge {
  readonly fromCell: string;
  readonly toCell: string;
  readonly edgeLength: number; // m
  readonly deltaStocks: CellStocks; // Exact transferred amounts (mol or J)
}

/**
 * Computes conservative upwind stock transfers across a shared geodesic interface.
 */
export function computeInterfaceAdvectiveTransfer(
  cellA: CellAdvectionState,
  cellB: CellAdvectionState,
  edgeLength: number,
  dt: number
): { fluxAtoB: CellStocks; normalVelocity: number } {
  // 1. Interface midpoint on sphere
  const mx = cellA.centroid[0] + cellB.centroid[0];
  const my = cellA.centroid[1] + cellB.centroid[1];
  const mz = cellA.centroid[2] + cellB.centroid[2];
  const mNorm = Math.sqrt(mx * mx + my * my + mz * mz);
  const rMean = (Math.sqrt(cellA.centroid[0]**2 + cellA.centroid[1]**2 + cellA.centroid[2]**2) +
                 Math.sqrt(cellB.centroid[0]**2 + cellB.centroid[1]**2 + cellB.centroid[2]**2)) / 2;
  const pMid: Vector3D = [(mx / mNorm) * rMean, (my / mNorm) * rMean, (mz / mNorm) * rMean];

  // 2. Project velocities onto tangent space at cell centroids
  const vA_tan = projectVectorOntoSphereTangentSpace(cellA.velocity, cellA.centroid);
  const vB_tan = projectVectorOntoSphereTangentSpace(cellB.velocity, cellB.centroid);

  // 3. Average velocity at interface and project onto interface tangent space
  const vMidRaw: Vector3D = [
    (vA_tan[0] + vB_tan[0]) * 0.5,
    (vA_tan[1] + vB_tan[1]) * 0.5,
    (vA_tan[2] + vB_tan[2]) * 0.5,
  ];
  const vMid_tan = projectVectorOntoSphereTangentSpace(vMidRaw, pMid);

  // 4. Direction vector between cell centroids projected onto interface tangent space
  const chord: Vector3D = [
    cellB.centroid[0] - cellA.centroid[0],
    cellB.centroid[1] - cellA.centroid[1],
    cellB.centroid[2] - cellA.centroid[2],
  ];
  const dir_tan = projectVectorOntoSphereTangentSpace(chord, pMid);
  const dirMag = Math.sqrt(dir_tan[0]**2 + dir_tan[1]**2 + dir_tan[2]**2);

  if (dirMag < 1e-12) {
    const zeroStocks: CellStocks = { carbon: 0, water: 0, nitrogen: 0, phosphorus: 0, oxygen: 0, thermalEnergy: 0 };
    return { fluxAtoB: zeroStocks, normalVelocity: 0 };
  }

  const normalHat: Vector3D = [dir_tan[0] / dirMag, dir_tan[1] / dirMag, dir_tan[2] / dirMag];

  // 5. Interface normal velocity: u_ab = v_mid_tan . normalHat
  const u_ab = vMid_tan[0] * normalHat[0] + vMid_tan[1] * normalHat[1] + vMid_tan[2] * normalHat[2];

  // 6. Upwind concentration selection
  const volumetricRate = u_ab * edgeLength * dt; // m^3 or m^2 effective volume flux
  const sourceStocks = u_ab >= 0 ? cellA.stocks : cellB.stocks;
  const sourceArea = u_ab >= 0 ? cellA.area : cellB.area;

  // Fraction of donor cell transferred
  const fraction = Math.max(0, Math.min(1.0, Math.abs(volumetricRate) / sourceArea));
  const sign = u_ab >= 0 ? 1.0 : -1.0;

  const fluxAtoB: CellStocks = {
    carbon: sign * sourceStocks.carbon * fraction,
    water: sign * sourceStocks.water * fraction,
    nitrogen: sign * sourceStocks.nitrogen * fraction,
    phosphorus: sign * sourceStocks.phosphorus * fraction,
    oxygen: sign * sourceStocks.oxygen * fraction,
    thermalEnergy: sign * sourceStocks.thermalEnergy * fraction,
  };

  return { fluxAtoB, normalVelocity: u_ab };
}
```

---

## 4. Test Invariant & Verification Benchmarks

| Invariant | Equation / Test | Error Tolerance |
|---|---|---|
| **Orthogonality** | $\mathbf{v}_\perp \cdot \mathbf{p} = 0$ | $|\mathbf{v}_\perp \cdot \mathbf{p}| / (\|\mathbf{v}_\perp\| \cdot \|\mathbf{p}\|) < 10^{-14}$ |
| **Idempotency** | $\mathcal{P}_{T_{\mathbf{p}}S^2}(\mathcal{P}_{T_{\mathbf{p}}S^2}(\mathbf{v})) = \mathcal{P}_{T_{\mathbf{p}}S^2}(\mathbf{v})$ | $\|\mathbf{w}_{\text{double}} - \mathbf{w}_{\text{single}}\|_\infty < 10^{-15}$ |
| **Pure Radial Cancellation** | $\mathcal{P}_{T_{\mathbf{p}}S^2}(\lambda \mathbf{p}) = \mathbf{0}$ | $\|\mathbf{w}\|_2 < 10^{-15}$ |
| **Conservation of Global Mass** | $\sum_{i \in \text{Grid}} S_{k, i}^{t + \Delta t} - \sum_{i \in \text{Grid}} S_{k, i}^t = 0$ | Relative error $< 10^{-15}$ (machine epsilon) |
| **Energy Dissipation Non-negativity** | $S_{k, i} \ge 0 \;\forall i, k$ | Strict non-negativity under CFL $\Delta t \le \Delta t_{\text{max}}$ |