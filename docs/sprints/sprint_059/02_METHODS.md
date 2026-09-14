# Process & Method Specifications: Great Circle Normal Vector & Advective Boundary Transport

## 1. Physical & Geodesic Process Foundation

In the spherical discrete global grid system (DGGS) of the Web of Life simulation, geodesic boundaries, interfacial flux corridors, and lateral advection (such as planetary boundary layer winds, oceanic thermohaline circulation, and mobile biomass drift) operate across great circle arcs on $\mathbb{S}^2 \subset \mathbb{R}^3$.

### 1.1 Great Circle Plane Geometry
Given two non-degenerate unit vectors $\mathbf{u}, \mathbf{v} \in \mathbb{S}^2$ representing adjacent cell centroids or boundary vertices on the spherical shell ($R_{\oplus} \approx 6.371 \times 10^6 \text{ m}$):
- The great circle plane passing through the origin and $\mathbf{u}, \mathbf{v}$ satisfies:
  $$\Pi(\mathbf{u}, \mathbf{v}) = \{ \mathbf{x} \in \mathbb{R}^3 : \mathbf{x} \cdot \mathbf{n} = 0 \}$$
- The oriented normal vector $\mathbf{n} \in \mathbb{S}^2$ is defined by:
  $$\mathbf{w} = \mathbf{u} \times \mathbf{v} = \begin{pmatrix} u_y v_z - u_z v_y \\ u_z v_x - u_x v_z \\ u_x v_y - u_y v_x \end{pmatrix}, \quad \|\mathbf{w}\| = \sin \theta$$
  $$\mathbf{n} = \frac{\mathbf{w}}{\|\mathbf{w}\|} = \frac{\mathbf{u} \times \mathbf{v}}{\|\mathbf{u} \times \mathbf{v}\|}$$
  where $\theta = \arccos(\mathbf{u} \cdot \mathbf{v}) \in [0, \pi]$.

### 1.2 Geodesic Boundary Tangent and Flux Projection
For a geodesic edge separating cell $A$ (centroid $\mathbf{u}$) and cell $B$ (centroid $\mathbf{v}$), the great circle normal $\mathbf{n}$ uniquely determines the oriented geodesic plane.
- The unit tangent along the interface between $A$ and $B$ at midpoint $\mathbf{m} = \frac{\mathbf{u} + \mathbf{v}}{\|\mathbf{u} + \mathbf{v}\|}$ is:
  $$\mathbf{t} = \mathbf{n} \times \mathbf{m}$$
- The cross-boundary directional vector from cell $A$ to cell $B$ tangential to the spherical surface at $\mathbf{m}$ is:
  $$\hat{\mathbf{e}}_{A \to B} = \mathbf{m} \times \mathbf{t} = \mathbf{n}$$
  yielding direct coupling between normal orientation and cross-interface transport.

---

## 2. Mass and Energy Conservation Dynamics

Lateral physical advection transfers matter and enthalpy across the geodesic boundary without spontaneous creation or destruction.

### 2.1 State Vector Stocks
For each discrete spatial cell $k \in \{A, B\}$, the state vector $\mathbf{S}_k$ consists of:
- Carbon mass stock $C_k$ $[\text{kg C}]$
- Water mass stock $W_k = M_{\text{H}_2\text{O}, k}$ $[\text{kg H}_2\text{O}]$
- Mineral nutrient stock $M_k$ $[\text{kg}]$ (phosphorus, fixed nitrogen, silica)
- Dissolved/atmospheric oxygen stock $O_k = M_{\text{O}_2, k}$ $[\text{kg O}_2]$
- Internal thermal energy stock $E_k$ $[\text{J}]$

### 2.2 Boundary Advection Formulation
Let $\mathbf{V}_{\text{flow}} \in \mathbb{R}^3$ be the local advective transport velocity vector $[\text{m}\cdot\text{s}^{-1}]$ at the interface midpoint $\mathbf{m}$, with $\|\mathbf{V}_{\text{flow}}\| < c_{\text{sonic}}$.
The directed normal velocity through interface $A \to B$ is:
$$v_{\perp} = \mathbf{V}_{\text{flow}} \cdot \mathbf{n}_{A \to B}$$

Let $L_{\text{edge}} = R_{\oplus} \cdot \theta$ be the boundary segment length $[\text{m}]$, and $H_{\text{layer}}$ be the fluid layer depth $[\text{m}]$. The volumetric flux rate $\Phi_V$ $[\text{m}^3\cdot\text{s}^{-1}]$ is:
$$\Phi_V = v_{\perp} \cdot L_{\text{edge}} \cdot H_{\text{layer}}$$

Applying upwind differencing for numerical monotonicity and positive definiteness:
- If $v_{\perp} \ge 0$, donor cell is $A$, receiver cell is $B$.
- If $v_{\perp} < 0$, donor cell is $B$, receiver cell is $A$.

### 2.3 Exact Differential Stock Transfers ($\Delta t$)
For timestep $\Delta t$ $[\text{s}]$:
$$\Delta V = |\Phi_V| \cdot \Delta t$$

Let donor concentrations be:
- $\rho_C = C_{\text{donor}} / V_{\text{donor}}$ $[\text{kg C}\cdot\text{m}^{-3}]$
- $\rho_W = W_{\text{donor}} / V_{\text{donor}}$ $[\text{kg H}_2\text{O}\cdot\text{m}^{-3}]$
- $\rho_M = M_{\text{donor}} / V_{\text{donor}}$ $[\text{kg}\cdot\text{m}^{-3}]$
- $\rho_O = O_{\text{donor}} / V_{\text{donor}}$ $[\text{kg O}_2\cdot\text{m}^{-3}]$
- $u_E = E_{\text{donor}} / V_{\text{donor}}$ $[\text{J}\cdot\text{m}^{-3}]$

The stoichiometric stock deltas satisfy:
$$\Delta C = \text{sgn}(v_{\perp}) \cdot \rho_C \cdot \Delta V$$
$$\Delta W = \text{sgn}(v_{\perp}) \cdot \rho_W \cdot \Delta V$$
$$\Delta M = \text{sgn}(v_{\perp}) \cdot \rho_M \cdot \Delta V$$
$$\Delta O = \text{sgn}(v_{\perp}) \cdot \rho_O \cdot \Delta V$$
$$\Delta E = \text{sgn}(v_{\perp}) \cdot u_E \cdot \Delta V$$

### 2.4 First and Second Law Thermodynamic Invariants
1. **First Law Conservation**:
   $$\Delta \mathbf{S}_A + \Delta \mathbf{S}_B = \mathbf{0}$$
   $$\sum_{k \in \{A, B\}} \Delta C_k = 0, \quad \sum_{k \in \{A, B\}} \Delta W_k = 0, \quad \sum_{k \in \{A, B\}} \Delta M_k = 0, \quad \sum_{k \in \{A, B\}} \Delta O_k = 0, \quad \sum_{k \in \{A, B\}} \Delta E_k = 0$$

2. **Anti-symmetry of Plane Normal**:
   $$\mathbf{n}(\mathbf{v}, \mathbf{u}) = -\mathbf{n}(\mathbf{u}, \mathbf{v}) \implies v_{\perp}(B \to A) = -v_{\perp}(A \to B)$$
   Guarantees zero net divergence over closed spherical tessellations:
   $$\oint_{\partial \Omega} \mathbf{V}_{\text{flow}} \cdot \mathbf{n} \, dA = 0$$

3. **Second Law Entropy Non-Decrease**:
   Entropy generation per boundary exchange:
   $$\dot{S}_{\text{gen}} = \Delta V \left( \frac{u_E^{(A)}}{T_A} - \frac{u_E^{(B)}}{T_B} \right) \operatorname{sgn}(T_A - T_B) \ge 0$$
   ensuring irreversible thermal equilibration alongside mass advection.

---

## 3. Monad Method Formalization

### 3.1 Geometric Primitive Monad: `computeSphericalGreatCircleNormal3D`
Calculates the normalized cross product with strict singularity resolution for collinear and antipodal vectors.

```typescript
/**
 * Monad Method: computeSphericalGreatCircleNormal3D
 * 
 * Computes the unit normal of the great circle plane passing through u and v.
 *
 * Preconditions:
 *   - u, v are 3-tuples of finite numbers on S^2 (||u|| > 0, ||v|| > 0).
 *   - epsilon >= 0 (default 1e-10).
 * Postconditions:
 *   - ||n|| = 1.0 +/- 1e-12.
 *   - |n . u| < 1e-10 and |n . v| < 1e-10.
 *   - Deterministic and non-NaN even if u x v -> 0.
 */
export function computeSphericalGreatCircleNormal3D(
  u: [number, number, number],
  v: [number, number, number],
  epsilon: number = 1e-10
): [number, number, number] {
  const wx = u[1] * v[2] - u[2] * v[1];
  const wy = u[2] * v[0] - u[0] * v[2];
  const wz = u[0] * v[1] - u[1] * v[0];

  const norm = Math.sqrt(wx * wx + wy * wy + wz * wz);

  if (norm >= epsilon) {
    return [wx / norm, wy / norm, wz / norm];
  }

  // Degeneracy Handling (Collinear or Antipodal):
  // Find a stable non-parallel axis to construct an orthogonal plane
  const ax = Math.abs(u[0]) < 0.9 ? 1.0 : 0.0;
  const ay = Math.abs(u[0]) < 0.9 ? 0.0 : 1.0;
  const az = 0.0;

  // Fallback cross product: u x a
  const fwx = u[1] * az - u[2] * ay;
  const fwy = u[2] * ax - u[0] * az;
  const fwz = u[0] * ay - u[1] * ax;

  const fnorm = Math.sqrt(fwx * fwx + fwy * fwy + fwz * fwz);
  return [fwx / fnorm, fwy / fnorm, fwz / fnorm];
}
```

### 3.2 Thermodynamic Boundary Advection Monad: `advectiveBoundaryFluxMonad`
Transforms physical state stocks across a great circle interface based on projected velocity.

```typescript
export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
}

export interface AdvectiveFluxDelta {
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaMineralsKg: number;
  deltaOxygenKg: number;
  deltaEnergyJoules: number;
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVelocity3D: [number, number, number],
  normalVector: [number, number, number],
  edgeLengthM: number,
  layerHeightM: number,
  dtSeconds: number
): { deltaA: AdvectiveFluxDelta; deltaB: AdvectiveFluxDelta } {
  // Normal velocity projection
  const vNormal =
    flowVelocity3D[0] * normalVector[0] +
    flowVelocity3D[1] * normalVector[1] +
    flowVelocity3D[2] * normalVector[2];

  const volumetricFluxRate = vNormal * edgeLengthM * layerHeightM; // m^3 / s
  const deltaVolumeTransfer = Math.abs(volumetricFluxRate) * dtSeconds; // m^3

  // Upwind donor selection
  const donor = vNormal >= 0 ? cellA : cellB;
  const sign = vNormal >= 0 ? 1 : -1;

  const safeDonorVol = Math.max(donor.volumeM3, 1e-6);
  const fraction = Math.min(deltaVolumeTransfer / safeDonorVol, 1.0);

  const deltaC = sign * donor.carbonKg * fraction;
  const deltaW = sign * donor.waterKg * fraction;
  const deltaM = sign * donor.mineralsKg * fraction;
  const deltaO = sign * donor.oxygenKg * fraction;
  const deltaE = sign * donor.energyJoules * fraction;

  return {
    deltaA: {
      deltaCarbonKg: -deltaC,
      deltaWaterKg: -deltaW,
      deltaMineralsKg: -deltaM,
      deltaOxygenKg: -deltaO,
      deltaEnergyJoules: -deltaE
    },
    deltaB: {
      deltaCarbonKg: deltaC,
      deltaWaterKg: deltaW,
      deltaMineralsKg: deltaM,
      deltaOxygenKg: deltaO,
      deltaEnergyJoules: deltaE
    }
  };
}
```

---

## 4. Verification Bounds & Precision Criteria

| Parameter | Symbol | Strict Numerical Tolerance |
|---|---|---|
| Normal Unit Length | $\|\mathbf{n}\|$ | $1.0 \pm 10^{-12}$ |
| Orthogonality to Vector $\mathbf{u}$ | $|\mathbf{n} \cdot \mathbf{u}|$ | $< 10^{-10}$ |
| Orthogonality to Vector $\mathbf{v}$ | $|\mathbf{n} \cdot \mathbf{v}|$ | $< 10^{-10}$ |
| Anti-symmetry Error | $\|\mathbf{n}(\mathbf{u}, \mathbf{v}) + \mathbf{n}(\mathbf{v}, \mathbf{u})\|$ | $< 10^{-12}$ (non-collinear) |
| Conservation Mass Drift | $|\sum \Delta \text{Mass}|$ | $0.0 \text{ kg} \pm 10^{-15}$ |
| Enthalpy Balance Error | $|\sum \Delta E|$ | $0.0 \text{ J} \pm 10^{-12}$ |
| Collinear Threshold | $\epsilon$ | $10^{-10}$ |