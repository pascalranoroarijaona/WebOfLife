# Sprint 066 — Process Mining & Method Specifications: 3D Boundary Outward Normal Vector & Lateral Facet Transport

**Sprint Goal:** Implement `computeBoundaryOutwardNormal3D` combining midpoint horizontal normal with centroid displacement direction in `src/spatial/h3_adjacency.ts`.  
**Role:** Process Mining & Research Scientist  
**Status:** Approved  
**Related Documents:** RFC-066 (`01_RFC.md`)

---

## 1. Physical, Biogeochemical, and Geometric Foundations

On a spherical discrete global grid system (DGGS) such as H3 projected onto $\mathbb{S}^2 \subset \mathbb{R}^3$ with mean radius $R = 6{,}371{,}008.8\,\text{m}$, dynamic exchange of matter (carbon, water, oxygen, dissolved minerals) and enthalpy (sensible and latent heat) between contiguous polyhedral cells $\Omega_i$ and $\Omega_j$ occurs across their shared 1D spherical boundary arc $e_{ij} = \partial\Omega_i \cap \partial\Omega_j$.

### 1.1 Interface Geometry & Normal Formulation

For cell centroids $\mathbf{c}_i, \mathbf{c}_j \in \mathbb{S}^2$ and boundary vertices $\mathbf{v}_a, \mathbf{v}_b \in \mathbb{S}^2$:
1. **Chord and Spherical Midpoint**:
   $$\mathbf{m}_{\text{chord}} = \frac{\mathbf{v}_a + \mathbf{v}_b}{2}, \quad \mathbf{m} = R\,\frac{\mathbf{m}_{\text{chord}}}{\|\mathbf{m}_{\text{chord}}\|}, \quad \hat{\mathbf{r}} = \frac{\mathbf{m}}{\|\mathbf{m}\|}$$
2. **Boundary Tangent and Midpoint Horizontal Normal**:
   $$\mathbf{t}_{\text{edge}} = \mathbf{v}_b - \mathbf{v}_a, \quad \mathbf{n}_{\text{cross}} = \mathbf{t}_{\text{edge}} \times \hat{\mathbf{r}}, \quad \hat{\mathbf{n}}_{\text{edge}} = \frac{\mathbf{n}_{\text{cross}}}{\|\mathbf{n}_{\text{cross}}\|}$$
   $$\hat{\mathbf{n}}_{\text{mid}} = \operatorname{sgn}\left(\hat{\mathbf{n}}_{\text{edge}} \cdot (\mathbf{c}_j - \mathbf{c}_i)\right)\hat{\mathbf{n}}_{\text{edge}}$$
3. **Projected Centroid Displacement**:
   $$\mathbf{d}_{ij} = \mathbf{c}_j - \mathbf{c}_i, \quad \mathbf{d}_{\text{tan}} = \mathbf{d}_{ij} - (\mathbf{d}_{ij} \cdot \hat{\mathbf{r}})\hat{\mathbf{r}}, \quad \hat{\mathbf{u}}_{\text{disp}} = \frac{\mathbf{d}_{\text{tan}}}{\|\mathbf{d}_{\text{tan}}\|}$$
4. **Blended Facet Outward Unit Normal**:
   $$\mathbf{n}_{\text{blend}} = (1 - \alpha)\,\hat{\mathbf{n}}_{\text{mid}} + \alpha\,\hat{\mathbf{u}}_{\text{disp}}, \quad \alpha \in [0, 1]$$
   $$\mathbf{n}_{\text{tan}} = \mathbf{n}_{\text{blend}} - (\mathbf{n}_{\text{blend}} \cdot \hat{\mathbf{r}})\hat{\mathbf{r}}, \quad \hat{\mathbf{n}}_{ij} = \frac{\mathbf{n}_{\text{tan}}}{\|\mathbf{n}_{\text{tan}}\|}$$

### 1.2 Boundary Arc Metric Length
The physical arc length $L_{ij}$ across the sphere interface between vertices $\mathbf{v}_a$ and $\mathbf{v}_b$ is given by the great-circle central angle:
$$\theta_{ab} = 2 \arcsin\left(\frac{\|\mathbf{v}_b - \mathbf{v}_a\|}{2 R}\right), \quad L_{ij} = R\,\theta_{ab}$$

---

## 2. Formalized Stock Transfer Equations

Any conservative intensive state variable $\phi \in \{C, W, M, O_2, E\}$ (where concentrations or volumetric densities are denoted by $\rho_\phi$) moves across facet $e_{ij}$ through advective velocity $\mathbf{u}_{ij} \in T_{\mathbf{m}}\mathbb{S}^2$ and diffusive/dispersive gradients $\nabla \phi$.

### 2.1 Advective Flux Equation
The advective flux rate $J_{ij,\phi}^{\text{adv}}$ across face $e_{ij}$ into cell $j$ with effective fluid layer height $H_{ij}$ (m) is:
$$u_{n, ij} = \mathbf{u}_{ij} \cdot \hat{\mathbf{n}}_{ij}$$
$$A_{ij} = L_{ij} \cdot H_{ij} \quad [\text{m}^2]$$
$$\phi_{ij}^* = \begin{cases}
\phi_i / V_i & \text{if } u_{n, ij} \ge 0 \quad (\text{upwind from cell } i) \\
\phi_j / V_j & \text{if } u_{n, ij} < 0 \quad (\text{upwind from cell } j)
\end{cases}$$
$$F_{ij,\phi}^{\text{adv}} = \phi_{ij}^* \cdot u_{n, ij} \cdot A_{ij} \cdot \Delta t \quad [\text{unit of } \phi]$$

Anti-symmetry is exact: since $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$, $u_{n, ji} = -u_{n, ij}$, ensuring:
$$F_{ji,\phi}^{\text{adv}} = -F_{ij,\phi}^{\text{adv}}$$

### 2.2 Diffusive Flux Equation (Fickian / Fourier)
The diffusive exchange rate $J_{ij,\phi}^{\text{diff}}$ driven by concentration differences across the geodesic distance $\ell_{ij} = \|\mathbf{c}_j - \mathbf{c}_i\|$ projected along the blended normal is:
$$\nabla_n \rho_\phi \approx \frac{\rho_{\phi, j} - \rho_{\phi, i}}{\ell_{ij}} (\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})$$
$$F_{ij,\phi}^{\text{diff}} = -D_\phi \cdot \frac{\frac{\phi_j}{V_j} - \frac{\phi_i}{V_i}}{\ell_{ij}} \cdot (\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij}) \cdot A_{ij} \cdot \Delta t$$

### 2.3 Exact State Delta Matrix per Timestep $\Delta t$

| Stock Variable | Symbol | Unit | Advective Transport Rate | Diffusive Transport Rate | Conservation Law |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Carbon Stock** | $C$ | $\text{kg C}$ | $\rho_C^*\,u_{n,ij}\,A_{ij}$ | $-D_C\,\frac{\Delta\rho_C}{\ell_{ij}}\,(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})\,A_{ij}$ | $\Delta C_i + \Delta C_j \equiv 0$ |
| **Water Stock** | $W$ | $\text{kg } \text{H}_2\text{O}$ | $\rho_W^*\,u_{n,ij}\,A_{ij}$ | $-D_W\,\frac{\Delta\rho_W}{\ell_{ij}}\,(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})\,A_{ij}$ | $\Delta W_i + \Delta W_j \equiv 0$ |
| **Minerals / Nutrients** | $M$ | $\text{kg}$ | $\rho_M^*\,u_{n,ij}\,A_{ij}$ | $-D_M\,\frac{\Delta\rho_M}{\ell_{ij}}\,(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})\,A_{ij}$ | $\Delta M_i + \Delta M_j \equiv 0$ |
| **Dissolved Oxygen** | $O_2$ | $\text{kg } \text{O}_2$ | $\rho_{O_2}^*\,u_{n,ij}\,A_{ij}$ | $-D_{O_2}\,\frac{\Delta\rho_{O_2}}{\ell_{ij}}\,(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})\,A_{ij}$ | $\Delta O_{2,i} + \Delta O_{2,j} \equiv 0$ |
| **Thermal Enthalpy** | $E$ | $\text{J}$ | $(\rho\,c_p\,T)_{ij}^*\,u_{n,ij}\,A_{ij}$ | $-k_{\text{th}}\,\frac{T_j - T_i}{\ell_{ij}}\,(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})\,A_{ij}$ | $\Delta E_i + \Delta E_j \equiv 0$ |

---

## 3. Thermodynamic Entropic Bounds (Second Law Compliance)

For thermal diffusion across facet $e_{ij}$ with temperatures $T_i$ and $T_j$:
$$\dot{Q}_{i \to j} = -k_{\text{th}}\,A_{ij}\,\frac{T_j - T_i}{\ell_{ij}}(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij})$$
Since $(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij}) > 0$ by construction (verified by `computeBoundaryOutwardNormal3D` assertion $\hat{\mathbf{n}}_{ij} \cdot \mathbf{d}_{ij} > 0$):
$$\dot{S}_{\text{gen}} = \dot{Q}_{i \to j}\left(\frac{1}{T_j} - \frac{1}{T_i}\right) = k_{\text{th}}\,A_{ij}\,\frac{(T_i - T_j)^2}{T_i T_j\,\ell_{ij}}(\hat{\mathbf{u}}_{\text{disp}} \cdot \hat{\mathbf{n}}_{ij}) \ge 0$$
Strict positive definiteness of entropy production $\dot{S}_{\text{gen}} \ge 0$ is preserved if and only if $\hat{\mathbf{n}}_{ij}$ maintains an acute angle with centroid displacement $\mathbf{d}_{ij}$.

---

## 4. Executable Monad Method Specification

Below is the concrete monad execution method implementing boundary flux exchange driven by `computeBoundaryOutwardNormal3D`.

```typescript
import {
  Vector3D,
  BoundaryNormal3DResult,
  computeBoundaryOutwardNormal3D,
  vec3Dot,
  vec3Sub,
  vec3Norm
} from '../../spatial/h3_adjacency';

export interface FacetCellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
}

export interface FacetTransportParameters {
  fluidVelocity3D: Vector3D; // m/s at boundary midpoint
  effectiveHeightM: number;  // Fluid column or canopy height
  diffusionCoeffs: {
    carbon: number;          // m^2/s
    water: number;           // m^2/s
    minerals: number;        // m^2/s
    oxygen: number;          // m^2/s
    thermalConductivity: number; // W/(m*K)
  };
  blendAlpha?: number;       // Weight between mid-normal and centroid disp (default: 0.5)
}

export interface FacetTransferDeltas {
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaMineralsKg: number;
  deltaOxygenKg: number;
  deltaEnergyJoules: number;
  entropyProductionJoulesPerKelvin: number;
}

export interface FacetExchangeResult {
  originDeltas: FacetTransferDeltas;
  neighborDeltas: FacetTransferDeltas;
  geometry: BoundaryNormal3DResult;
  facetAreaM2: number;
  normalVelocityMs: number;
}

/**
 * Calculates conservative mass and energy transfer across a shared boundary facet
 * between adjacent H3 cells using blended 3D outward normal vectors.
 */
export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  neighborState: FacetCellStockState,
  originCentroid: Vector3D,
  neighborCentroid: Vector3D,
  edgeVertexA: Vector3D,
  edgeVertexB: Vector3D,
  params: FacetTransportParameters,
  dtSeconds: number
): FacetExchangeResult {
  // 1. Synthesize robust 3D boundary outward normal
  const normalResult = computeBoundaryOutwardNormal3D(
    originCentroid,
    neighborCentroid,
    edgeVertexA,
    edgeVertexB,
    { blendAlpha: params.blendAlpha ?? 0.5 }
  );

  // 2. Compute facet metric geometry on sphere
  const chordLength = vec3Norm(vec3Sub(edgeVertexB, edgeVertexA));
  const R = vec3Norm(normalResult.midpoint);
  const facetArcLengthM = 2 * R * Math.asin(Math.min(1.0, chordLength / (2 * R)));
  const facetAreaM2 = facetArcLengthM * params.effectiveHeightM;
  const geodesicDistanceM = vec3Norm(vec3Sub(neighborCentroid, originCentroid));

  // 3. Normal velocity component
  const uNormal = vec3Dot(params.fluidVelocity3D, normalResult.normal);

  // 4. Transport calculations: Advection (Upwind Scheme)
  const isOutflow = uNormal >= 0;
  const sourceState = isOutflow ? originState : neighborState;
  const volumetricFlowRateM3s = uNormal * facetAreaM2; // signed relative to origin -> neighbor

  const advCarbonRate = (sourceState.carbonKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const advWaterRate = (sourceState.waterKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const advMineralsRate = (sourceState.mineralsKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const advOxygenRate = (sourceState.oxygenKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const heatCapacityJPerM3K = 4.184e6; // Volumetric heat capacity for aqueous media
  const advEnergyRate = (sourceState.temperatureKelvin * heatCapacityJPerM3K) * volumetricFlowRateM3s;

  // 5. Transport calculations: Diffusion / Conduction
  const alignment = normalResult.alignmentCos;
  const diffFactor = alignment * (facetAreaM2 / geodesicDistanceM);

  const diffCarbonRate = -params.diffusionCoeffs.carbon * 
    ((neighborState.carbonKg / neighborState.volumeM3) - (originState.carbonKg / originState.volumeM3)) * diffFactor;

  const diffWaterRate = -params.diffusionCoeffs.water * 
    ((neighborState.waterKg / neighborState.volumeM3) - (originState.waterKg / originState.volumeM3)) * diffFactor;

  const diffMineralsRate = -params.diffusionCoeffs.minerals * 
    ((neighborState.mineralsKg / neighborState.volumeM3) - (originState.mineralsKg / originState.volumeM3)) * diffFactor;

  const diffOxygenRate = -params.diffusionCoeffs.oxygen * 
    ((neighborState.oxygenKg / neighborState.volumeM3) - (originState.oxygenKg / originState.volumeM3)) * diffFactor;

  const conductiveHeatRate = -params.diffusionCoeffs.thermalConductivity * 
    (neighborState.temperatureKelvin - originState.temperatureKelvin) * diffFactor;

  // 6. Net flux rates across the interface (origin -> neighbor)
  const netFluxCarbon = (advCarbonRate + diffCarbonRate) * dtSeconds;
  const netFluxWater = (advWaterRate + diffWaterRate) * dtSeconds;
  const netFluxMinerals = (advMineralsRate + diffMineralsRate) * dtSeconds;
  const netFluxOxygen = (advOxygenRate + diffOxygenRate) * dtSeconds;
  const netFluxEnergy = (advEnergyRate + conductiveHeatRate) * dtSeconds;

  // 7. Entropy Generation Rate
  const T1 = originState.temperatureKelvin;
  const T2 = neighborState.temperatureKelvin;
  const entropyProduction = (conductiveHeatRate * dtSeconds) * (1 / T2 - 1 / T1);

  // 8. Construct perfectly anti-symmetric deltas
  const originDeltas: FacetTransferDeltas = {
    deltaCarbonKg: -netFluxCarbon,
    deltaWaterKg: -netFluxWater,
    deltaMineralsKg: -netFluxMinerals,
    deltaOxygenKg: -netFluxOxygen,
    deltaEnergyJoules: -netFluxEnergy,
    entropyProductionJoulesPerKelvin: Math.max(0, entropyProduction / 2)
  };

  const neighborDeltas: FacetTransferDeltas = {
    deltaCarbonKg: netFluxCarbon,
    deltaWaterKg: netFluxWater,
    deltaMineralsKg: netFluxMinerals,
    deltaOxygenKg: netFluxOxygen,
    deltaEnergyJoules: netFluxEnergy,
    entropyProductionJoulesPerKelvin: Math.max(0, entropyProduction / 2)
  };

  return {
    originDeltas,
    neighborDeltas,
    geometry: normalResult,
    facetAreaM2,
    normalVelocityMs: uNormal
  };
}
```

---

## 5. First-Law Conservation Verification Invariants

Let $\Delta \mathbf{S}_i$ be the state transfer vector for origin cell $i$ and $\Delta \mathbf{S}_j$ for neighbor cell $j$:
$$\Delta \mathbf{S}_i = \begin{bmatrix} \Delta C_i \\ \Delta W_i \\ \Delta M_i \\ \Delta O_{2,i} \\ \Delta E_i \end{bmatrix}, \quad \Delta \mathbf{S}_j = \begin{bmatrix} \Delta C_j \\ \Delta W_j \\ \Delta M_j \\ \Delta O_{2,j} \\ \Delta E_j \end{bmatrix}$$

1. **Global Additive Conservation (Machine Epsilon Zero-Sum)**:
   $$\|\Delta \mathbf{S}_i + \Delta \mathbf{S}_j\|_\infty \le \epsilon_{\text{mach}} \cdot \|\Delta \mathbf{S}_i\|_\infty \quad (\epsilon_{\text{mach}} \approx 2.22 \times 10^{-16})$$
2. **Tangent Plane Orthogonality**:
   $$|\hat{\mathbf{n}}_{ij} \cdot \hat{\mathbf{r}}| < 10^{-14}$$
3. **Strict Convex Combination Bound**:
   $$\|\hat{\mathbf{n}}_{ij}\| = 1.0 \pm 10^{-14}$$
4. **Anti-Symmetric Inversion**:
   $$\operatorname{computeBoundaryOutwardNormal3D}(\mathbf{c}_j, \mathbf{c}_i, \mathbf{v}_b, \mathbf{v}_a, \alpha) = -\operatorname{computeBoundaryOutwardNormal3D}(\mathbf{c}_i, \mathbf{c}_j, \mathbf{v}_a, \mathbf{v}_b, \alpha)$$