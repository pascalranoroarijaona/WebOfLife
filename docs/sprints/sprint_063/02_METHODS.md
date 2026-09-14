# Sprint 063 — Process Mining & Method Specifications: Horizontal Boundary Normal Vector and Facet Transport Mechanics

## 1. Executive Scientific Summary

In discrete geodesic grid fluid dynamics on the two-sphere ($S^2 \subset \mathbb{R}^3$), the horizontal exchange of mass (water, carbon dioxide, oxygen, mineral dust) and thermodynamic enthalpy between adjacent Voronoi/hexagonal cells occurs across shared one-dimensional geodesic boundary edges.

Sprint 063 operationalizes the completion of the local orthonormal Darboux frame $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ at shared cell boundaries via `computeBoundaryHorizontalNormal3D`. This method provides the foundational projection operator $\hat{\mathbf{n}}_h$ necessary for:
1. **Advective Flux Projection**: $\Phi_{\text{adv}} = \oint_{\partial \Omega} \rho \psi (\mathbf{u} \cdot \hat{\mathbf{n}}_h) \, dA_f$
2. **Diffusive Flux Projection**: $\Phi_{\text{diff}} = -\oint_{\partial \Omega} \mathbf{D} \nabla \psi \cdot \hat{\mathbf{n}}_h \, dA_f$
3. **Radial Leakage Elimination**: Strict orthogonality $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \equiv 0$, guaranteeing decoupling of horizontal barotropic flow from vertical diapycnal/convective columns.

---

## 2. Mathematical Formalism & Coordinate Transformation

### 2.1 The Orthonormal Darboux Triad at Midpoint $\mathbf{m}$
Let $S^2_R \subset \mathbb{R}^3$ be a sphere of radius $R = 6.371 \times 10^6\text{ m}$. For boundary edge $e_{ij} = \partial c_i \cap \partial c_j$ with geodesic vertices $\mathbf{v}_1, \mathbf{v}_2$:

1. **Edge Midpoint**:
   $$\mathbf{m} = R \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|} \in S^2_R$$

2. **Radial Unit Normal (Local Upward Vertical)**:
   $$\hat{\mathbf{r}} = \frac{\mathbf{m}}{\|\mathbf{m}\|} = \frac{\mathbf{m}}{R}$$

3. **Boundary Edge Unit Tangent**:
   $$\hat{\mathbf{t}} = \frac{\mathbf{v}_2 - (\mathbf{v}_2 \cdot \hat{\mathbf{r}}) \hat{\mathbf{r}}}{\|\mathbf{v}_2 - (\mathbf{v}_2 \cdot \hat{\mathbf{r}}) \hat{\mathbf{r}}\|}$$
   where $\langle \hat{\mathbf{t}}, \hat{\mathbf{r}} \rangle = 0$ and $\|\hat{\mathbf{t}}\| = 1$.

4. **In-Plane Horizontal Unit Normal**:
   $$\mathbf{n}_{\text{raw}} = \hat{\mathbf{t}} \times \hat{\mathbf{r}} = \begin{pmatrix}
   t_y r_z - t_z r_y \\
   t_z r_x - t_x r_z \\
   t_x r_y - t_y r_x
   \end{pmatrix}$$

   $$\hat{\mathbf{n}}_h = \begin{cases} 
   \frac{\mathbf{n}_{\text{raw}}}{\|\mathbf{n}_{\text{raw}}\|}, & \|\mathbf{n}_{\text{raw}}\| > \varepsilon \\
   \mathbf{0}, & \text{otherwise}
   \end{cases}$$
   with threshold $\varepsilon = 10^{-12}$.

### 2.2 Directed Boundary Orientation
The unoriented normal $\hat{\mathbf{n}}_h$ is assigned a directional orientation from cell $c_i$ to neighbor cell $c_j$ with centroids $\mathbf{x}_i, \mathbf{x}_j \in \mathbb{R}^3$:
$$\sigma_{ij} = \operatorname{sgn}\left( \langle \hat{\mathbf{n}}_h, \, \mathbf{x}_j - \mathbf{x}_i \rangle \right)$$
$$\hat{\mathbf{n}}_{ij} = \sigma_{ij} \hat{\mathbf{n}}_h$$

This guarantees anti-symmetry across shared edges:
$$\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$$

---

## 3. Mass & Energy Flux Mechanics Across Facet $e_{ij}$

### 3.1 Geometric Facet Cross-Section
For spherical edge length $L_{ij} = R \arccos\left(\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}\right)$ and atmospheric or oceanic vertical layer thickness $\Delta z$ (m), the facet area $A_f$ is:
$$A_{f, ij} = L_{ij} \Delta z \quad [\text{m}^2]$$

### 3.2 Normal Velocity Scalar
Given 3D fluid velocity field $\mathbf{u} = (u_x, u_y, u_z)^T \in T_{\mathbf{m}}S^2$ at the boundary midpoint:
$$u_{n, ij} = \mathbf{u} \cdot \hat{\mathbf{n}}_{ij} \quad [\text{m/s}]$$

### 3.3 Upwind Advective State Formulation
Under the Godunov first-order upwind scheme, the boundary interfacial density $\rho^*$ and interfacial tracer concentration $\psi^*$ are determined by the sign of normal velocity:
$$\rho^*_{ij} = \begin{cases}
\rho_i, & u_{n, ij} \ge 0 \\
\rho_j, & u_{n, ij} < 0
\end{cases}, \qquad \psi^*_{ij} = \begin{cases}
\psi_i, & u_{n, ij} \ge 0 \\
\psi_j, & u_{n, ij} < 0
\end{cases}$$

Volumetric flux:
$$\dot{V}_{ij} = u_{n, ij} A_{f, ij} \quad [\text{m}^3/\text{s}]$$

Total mass flux rate:
$$\dot{M}_{ij} = \rho^*_{ij} \dot{V}_{ij} = \rho^*_{ij} u_{n, ij} A_{f, ij} \quad [\text{kg/s}]$$

---

## 4. Formalized Stock Transfer Equations

Each simulation time step $\Delta t$ (s) transfers discrete masses and enthalpy across facet $e_{ij}$.

### 4.1 Mass Deltas: $\Delta \mathbf{S}_{\text{advective}}$

| Stock | Symbol | Mass Transfer Equation $\Delta M_k$ (kg) | Units |
|---|---|---|---|
| **Dry Air / Water Carrier** | $\Delta M_{\text{bulk}}$ | $\dot{M}_{ij} \Delta t$ | $\text{kg}$ |
| **Water Vapor / Moisture** | $\Delta M_{\text{H}_2\text{O}}$ | $q^*_{ij} \dot{M}_{ij} \Delta t$ ($q =$ specific humidity) | $\text{kg}$ |
| **Dissolved / Atmospheric Carbon** | $\Delta M_{\text{C}}$ | $\chi^*_{C, ij} \dot{M}_{ij} \Delta t$ ($\chi_C =$ carbon mass fraction) | $\text{kg}$ |
| **Molecular Oxygen** | $\Delta M_{\text{O}_2}$ | $\chi^*_{\text{O}_2, ij} \dot{M}_{ij} \Delta t$ ($\chi_{\text{O}_2} =$ oxygen mass fraction) | $\text{kg}$ |
| **Mineral Particulates / Dust** | $\Delta M_{\text{min}}$ | $\chi^*_{\text{min}, ij} \dot{M}_{ij} \Delta t$ ($\chi_{\text{min}} =$ mineral dust fraction) | $\text{kg}$ |

### 4.2 Thermal Energy Delta: $\Delta E_{\text{adv}}$
Sensible and latent enthalpy advected across facet $e_{ij}$:
$$\Delta E_{\text{adv}, ij} = \dot{M}_{ij} \left( c_p T^*_{ij} + L_v q^*_{ij} \right) \Delta t \quad [\text{J}]$$
where:
- $c_p$: Specific heat capacity ($1005\text{ J/(kg}\cdot\text{K)}$ for dry air, $3993\text{ J/(kg}\cdot\text{K)}$ for seawater).
- $L_v$: Latent heat of vaporization ($2.501 \times 10^6\text{ J/kg}$).
- $T^*_{ij}$: Upwind absolute temperature (K).

### 4.3 Diffusive Flux Deltas (Fickian & Fourier)
In addition to bulk fluid motion, down-gradient molecular and subgrid turbulent diffusion operates across the normal $\hat{\mathbf{n}}_{ij}$:

Geodesic cell centroid distance:
$$d_{ij} = R \arccos\left(\frac{\mathbf{x}_i \cdot \mathbf{x}_j}{R^2}\right) \quad [\text{m}]$$

1. **Thermal Heat Conduction (Fourier's Law)**:
   $$\dot{Q}_{\text{diff}, ij} = -k_{\text{thermal}} A_{f, ij} \frac{T_j - T_i}{d_{ij}} = k_{\text{thermal}} A_{f, ij} \frac{T_i - T_j}{d_{ij}} \quad [\text{W}]$$
   $$\Delta E_{\text{diff}, ij} = \dot{Q}_{\text{diff}, ij} \Delta t \quad [\text{J}]$$

2. **Fickian Tracer Mass Diffusion**:
   $$\Delta M_{\text{diff}, k, ij} = D_k \rho_{\text{avg}} A_{f, ij} \frac{\chi_{k, i} - \chi_{k, j}}{d_{ij}} \Delta t \quad [\text{kg}]$$
   where $D_k$ is the horizontal eddy diffusivity ($\text{m}^2/\text{s}$).

---

## 5. Thermodynamic Entropy Governance

### 5.1 First Law Conservation Check
For any two adjacent cells $i$ and $j$:
$$\begin{aligned}
\Delta M_{i \to j} + \Delta M_{j \to i} &= 0 \\
\Delta E_{i \to j} + \Delta E_{j \to i} &= 0
\end{aligned}$$
Total global sum over all interior boundary facets $\mathcal{E}_{\text{int}}$:
$$\sum_{e \in \mathcal{E}_{\text{int}}} \Delta M_e = 0, \qquad \sum_{e \in \mathcal{E}_{\text{int}}} \Delta E_e = 0$$

### 5.2 Second Law Dissipation & Entropy Generation
Diffusive heat and tracer exchange produces entropy irreversibly:
$$\dot{S}_{\text{facet}, ij} = \dot{Q}_{\text{diff}, ij} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) = k_{\text{thermal}} A_{f, ij} \frac{(T_i - T_j)^2}{T_i T_j d_{ij}} \ge 0 \quad [\text{J}/(\text{K}\cdot\text{s})]$$

For mass species diffusion between chemical potentials $\mu_i, \mu_j$:
$$\dot{S}_{\text{facet, chem}} = \sum_k \dot{M}_{\text{diff}, k, ij} \left( \frac{\mu_{k, i} - \mu_{k, j}}{T} \right) \ge 0$$

Exact orthogonality $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} = 0$ prevents spurious projection of horizontal gradients onto the gravitational potential vector, ensuring gravity cannot drive fictitious horizontal dissipation.

---

## 6. Monadic Process Implementation Specifications

### 6.1 `computeBoundaryHorizontalNormal3D`
Pure geometric monad computing the unoriented in-plane horizontal unit normal.

```typescript
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes the unoriented horizontal boundary unit normal vector in 3D Cartesian space.
 * 
 * Formula:
 *   n_raw = tangent x radialNormal
 *   norm = sqrt(n_raw.x^2 + n_raw.y^2 + n_raw.z^2)
 *   n_h = norm > epsilon ? n_raw / norm : (0, 0, 0)
 */
export function computeBoundaryHorizontalNormal3D(
  tangent: Vector3D,
  radialNormal: Vector3D,
  epsilon: number = 1e-12
): Vector3D {
  // Cross product: tangent x radialNormal
  const nx = tangent.y * radialNormal.z - tangent.z * radialNormal.y;
  const ny = tangent.z * radialNormal.x - tangent.x * radialNormal.z;
  const nz = tangent.x * radialNormal.y - tangent.y * radialNormal.x;

  const normSq = nx * nx + ny * ny + nz * nz;
  if (normSq <= epsilon * epsilon) {
    return { x: 0, y: 0, z: 0 };
  }

  const invNorm = 1 / Math.sqrt(normSq);
  return {
    x: nx * invNorm,
    y: ny * invNorm,
    z: nz * invNorm,
  };
}
```

### 6.2 `computeBoundaryHorizontalNormalFromEndpoints3D`
Convenience monad evaluating endpoints and midpoint directly to Darboux horizontal normal.

```typescript
/**
 * Evaluates the horizontal normal vector directly from boundary endpoints and midpoint.
 */
export function computeBoundaryHorizontalNormalFromEndpoints3D(
  v1: Vector3D,
  v2: Vector3D,
  midpoint: Vector3D,
  epsilon: number = 1e-12
): Vector3D {
  // 1. Radial outward normal r = midpoint / ||midpoint||
  const mNormSq = midpoint.x * midpoint.x + midpoint.y * midpoint.y + midpoint.z * midpoint.z;
  if (mNormSq <= epsilon * epsilon) {
    return { x: 0, y: 0, z: 0 };
  }
  const invMNorm = 1 / Math.sqrt(mNormSq);
  const radial: Vector3D = {
    x: midpoint.x * invMNorm,
    y: midpoint.y * invMNorm,
    z: midpoint.z * invMNorm,
  };

  // 2. Chord vector chord = v2 - v1
  const cx = v2.x - v1.x;
  const cy = v2.y - v1.y;
  const cz = v2.z - v1.z;

  // 3. Tangent vector projected onto sphere tangent plane: t_raw = chord - (chord . radial) * radial
  const dot = cx * radial.x + cy * radial.y + cz * radial.z;
  const tx = cx - dot * radial.x;
  const ty = cy - dot * radial.y;
  const tz = cz - dot * radial.z;

  const tNormSq = tx * tx + ty * ty + tz * tz;
  if (tNormSq <= epsilon * epsilon) {
    return { x: 0, y: 0, z: 0 };
  }
  const invTNorm = 1 / Math.sqrt(tNormSq);
  const tangent: Vector3D = {
    x: tx * invTNorm,
    y: ty * invTNorm,
    z: tz * invTNorm,
  };

  // 4. Horizontal normal: tangent x radial
  return computeBoundaryHorizontalNormal3D(tangent, radial, epsilon);
}
```

### 6.3 Facet Advection State Delta Monad
Evaluates conservative exchange between cell states $S_i$ and $S_j$.

```typescript
export interface CellFacetState {
  massDry: number;     // kg
  massWater: number;   // kg
  massCarbon: number;  // kg
  massOxygen: number;  // kg
  massMineral: number; // kg
  thermalEnergy: number; // J
  temperature: number; // K
  volume: number;      // m^3
  centroid: Vector3D;
}

export interface FacetExchangeDelta {
  deltaMassDry: number;
  deltaMassWater: number;
  deltaMassCarbon: number;
  deltaMassOxygen: number;
  deltaMassMineral: number;
  deltaThermalEnergy: number;
  entropyProduction: number; // J/K
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  horizontalNormal: Vector3D,
  velocityMidpoint: Vector3D,
  facetLength: number,
  layerDepth: number,
  diffusivity: number,
  thermalConductivity: number,
  dt: number
): FacetExchangeDelta {
  // Determine orientation relative to i -> j
  const dx = cellJ.centroid.x - cellI.centroid.x;
  const dy = cellJ.centroid.y - cellI.centroid.y;
  const dz = cellJ.centroid.z - cellI.centroid.z;
  const d_ij = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  const proj = horizontalNormal.x * dx + horizontalNormal.y * dy + horizontalNormal.z * dz;
  const sigma = proj >= 0 ? 1 : -1;
  const n_ij = {
    x: horizontalNormal.x * sigma,
    y: horizontalNormal.y * sigma,
    z: horizontalNormal.z * sigma,
  };

  const facetArea = facetLength * layerDepth;
  const u_n = velocityMidpoint.x * n_ij.x + velocityMidpoint.y * n_ij.y + velocityMidpoint.z * n_ij.z;
  const volFluxRate = u_n * facetArea; // m^3/s

  // Upwind state selection
  const source = volFluxRate >= 0 ? cellI : cellJ;
  const rhoTotal = (source.massDry + source.massWater) / source.volume;
  const massFluxRate = volFluxRate * rhoTotal;

  const fWater = source.massWater / (source.massDry + source.massWater);
  const fCarbon = source.massCarbon / (source.massDry + source.massWater);
  const fOxygen = source.massOxygen / (source.massDry + source.massWater);
  const fMineral = source.massMineral / (source.massDry + source.massWater);
  const specificEnthalpy = source.thermalEnergy / (source.massDry + source.massWater);

  // Advective transfers (positive: leaves cell I, enters cell J)
  const dM_dry_adv = massFluxRate * (1 - fWater) * dt;
  const dM_water_adv = massFluxRate * fWater * dt;
  const dM_carbon_adv = massFluxRate * fCarbon * dt;
  const dM_oxygen_adv = massFluxRate * fOxygen * dt;
  const dM_mineral_adv = massFluxRate * fMineral * dt;
  const dE_adv = massFluxRate * specificEnthalpy * dt;

  // Diffusive heat transfer (Fourier)
  const q_diff_rate = thermalConductivity * facetArea * (cellI.temperature - cellJ.temperature) / d_ij;
  const dE_diff = q_diff_rate * dt;

  // Entropy generated by heat conduction (Second Law)
  const dS_heat = (d_ij > 1e-6) 
    ? (thermalConductivity * facetArea * Math.pow(cellI.temperature - cellJ.temperature, 2) / (cellI.temperature * cellJ.temperature * d_ij)) * dt
    : 0;

  return {
    deltaMassDry: dM_dry_adv,
    deltaMassWater: dM_water_adv,
    deltaMassCarbon: dM_carbon_adv,
    deltaMassOxygen: dM_oxygen_adv,
    deltaMassMineral: dM_mineral_adv,
    deltaThermalEnergy: dE_adv + dE_diff,
    entropyProduction: dS_heat,
  };
}
```

---

## 7. Verification Invariants & Conservation Proofs

Every call to `computeBoundaryHorizontalNormal3D` must satisfy four mathematical invariants:

1. **Tangent Orthogonality**:
   $$\left| \hat{\mathbf{n}}_h \cdot \hat{\mathbf{t}} \right| < 10^{-12}$$
2. **Radial Orthogonality (Zero Vertical Leakage)**:
   $$\left| \hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \right| < 10^{-12}$$
3. **Unit Normalization**:
   $$\left| \|\hat{\mathbf{n}}_h\| - 1.0 \right| < 10^{-12} \quad (\text{if } \|\mathbf{n}_{\text{raw}}\| > \varepsilon)$$
4. **Right-Hand Orientation**:
   $$\operatorname{det}\left( \begin{bmatrix} \hat{\mathbf{t}} & \hat{\mathbf{n}}_h & \hat{\mathbf{r}} \end{bmatrix} \right) = +1.0 \pm 10^{-12}$$