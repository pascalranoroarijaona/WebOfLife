# Sprint 068 — Process Mining & Method Specifications: Shared Boundary Geodesic Flux Transport

## 1. Physical & Mathematical Foundations

### 1.1 Geodesic Interface Topology on $S_R^2$
For two topological neighbor cells $c_i, c_j \in \mathcal{H}$ on a sphere of radius $R = 6,371,008\,\text{m}$, `extractSharedBoundaryVertices3D(cellA, cellB, radius)` extracts the Cartesian endpoint coordinates $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$ satisfying $\|\mathbf{v}_1\| = \|\mathbf{v}_2\| = R$.

From the boundary endpoint pair $[\mathbf{v}_1, \mathbf{v}_2]$, the fundamental interface metrics are defined as:
1. **Geodesic Edge Arc Length ($L_{ij}$)**:
   $$L_{ij} = R \cdot \arccos\left(\text{clamp}\left(\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}, -1.0, 1.0\right)\right)$$
2. **Tangent Vector ($\mathbf{t}_{ij}$)**:
   $$\mathbf{t}_{ij} = \mathbf{v}_2 - \mathbf{v}_1$$
3. **Outward Directed Interface Unit Normal ($\hat{\mathbf{n}}_{ij}$)**:
   Given source cell centroid $\mathbf{x}_i \in \mathbb{R}^3$ and neighbor cell centroid $\mathbf{x}_j \in \mathbb{R}^3$:
   $$\mathbf{m}_{ij} = \mathbf{t}_{ij} \times \mathbf{x}_i, \quad \hat{\mathbf{n}}_{ij} = \frac{\mathbf{m}_{ij}}{\|\mathbf{m}_{ij}\|}$$
   Conditioned such that if $\hat{\mathbf{n}}_{ij} \cdot (\mathbf{x}_j - \mathbf{x}_i) < 0$, the vector is negated ($\hat{\mathbf{n}}_{ij} \leftarrow -\hat{\mathbf{n}}_{ij}$) and vertex ordering is swapped $[\mathbf{v}_1, \mathbf{v}_2] \leftarrow [\mathbf{v}_2, \mathbf{v}_1]$.
4. **Boundary Cross-Sectional Area ($A_{ij}$)**:
   $$A_{ij} = L_{ij} \cdot \Delta z$$
   where $\Delta z$ is the effective layer thickness (m) of the atmosphere, ocean, or soil stratum.
5. **Centroid Distance ($d_{ij}$)**:
   $$d_{ij} = R \cdot \arccos\left(\text{clamp}\left(\frac{\mathbf{x}_i \cdot \mathbf{x}_j}{R^2}, -1.0, 1.0\right)\right)$$

---

## 2. Mass & Enthalpy Flux Governing Equations

### 2.1 First Law Conservation Across Shared Facet
Any conservative stock $X \in \{ M_{\text{H}_2\text{O}}, M_{\text{C}}, M_{\text{O}_2}, M_{\text{min}}, H \}$ transferred across facet $e_{ij}$ satisfies:
$$\Delta X_i + \Delta X_j = 0$$
$$\frac{d X_i}{dt}\bigg|_{e_{ij}} = - J_{X, ij} \cdot A_{ij}, \quad \frac{d X_j}{dt}\bigg|_{e_{ij}} = + J_{X, ij} \cdot A_{ij}$$
where $J_{X, ij}$ is the net flux density $(\text{mass or energy} \cdot \text{m}^{-2} \cdot \text{s}^{-1})$ oriented along $\hat{\mathbf{n}}_{ij}$.

### 2.2 Combined Advective-Diffusive Inter-Cell Transport
The total flux density across edge $e_{ij}$ couples bulk flow advection with molecular/eddy diffusion:
$$J_{X, ij} = J_{X, ij}^{\text{adv}} + J_{X, ij}^{\text{diff}}$$

1. **Advective Flux Density (Upwind Formulation)**:
   Given horizontal fluid velocity vector $\mathbf{u}_{ij} \in \mathbb{R}^3$ at the edge midpoint $\mathbf{x}_{ij} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|} R$:
   $$u_n = \mathbf{u}_{ij} \cdot \hat{\mathbf{n}}_{ij}$$
   $$J_{X, ij}^{\text{adv}} = \begin{cases}
     u_n \cdot \rho_{X, i} & \text{if } u_n \ge 0 \\
     u_n \cdot \rho_{X, j} & \text{if } u_n < 0
   \end{cases}$$
   where $\rho_{X} = \frac{X}{V}$ is the volumetric density $(\text{kg}\cdot\text{m}^{-3}\text{ or }\text{J}\cdot\text{m}^{-3})$.

2. **Fickian / Fourier Diffusive Flux Density**:
   $$J_{X, ij}^{\text{diff}} = - D_X \frac{\rho_{X, j} - \rho_{X, i}}{d_{ij}}$$
   where $D_X$ is the diffusivity or thermal conductivity $(\text{m}^2\cdot\text{s}^{-1}\text{ or }\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1})$.

### 2.3 Second Law Entropy Balance
Irreversible entropy generation rate $\dot{S}_{\text{gen}, ij}$ across boundary $e_{ij}$ due to sensible heat conduction between cells at temperatures $T_i$ and $T_j$:
$$\dot{S}_{\text{gen}, ij} = A_{ij} \cdot k_{\text{th}} \frac{(T_i - T_j)^2}{T_i T_j d_{ij}} \ge 0$$
Strict non-negativity guarantees compliance with the Second Law of Thermodynamics.

---

## 3. Stock Transfer Deltas Matrix

| Stock | Symbol | Units | Transport Mechanism | Transfer Delta Equation ($\Delta X_i$) |
|---|---|---|---|---|
| Water Mass | $M_{\text{H}_2\text{O}}$ | $\text{kg}$ | Advection + Vapor Diffusion | $-\left( u_n \rho_{\text{H}_2\text{O}, \text{upwind}} - D_w \frac{\rho_{w, j} - \rho_{w, i}}{d_{ij}} \right) A_{ij} \Delta t$ |
| Carbon Mass | $M_{\text{C}}$ | $\text{kg}$ | Advection (DOC/POC) + Diff | $-\left( u_n \rho_{\text{C}, \text{upwind}} - D_C \frac{\rho_{\text{C}, j} - \rho_{\text{C}, i}}{d_{ij}} \right) A_{ij} \Delta t$ |
| Mineral Mass | $M_{\text{min}}$ | $\text{kg}$ | Advection + Dissolved Diffusion | $-\left( u_n \rho_{\text{min}, \text{upwind}} - D_{\text{min}} \frac{\rho_{\text{min}, j} - \rho_{\text{min}, i}}{d_{ij}} \right) A_{ij} \Delta t$ |
| Oxygen Mass | $M_{\text{O}_2}$ | $\text{kg}$ | Advection + Gaseous Diffusion | $-\left( u_n \rho_{\text{O}_2, \text{upwind}} - D_{\text{O}_2} \frac{\rho_{\text{O}_2, j} - \rho_{\text{O}_2, i}}{d_{ij}} \right) A_{ij} \Delta t$ |
| Thermal Enthalpy | $H$ | $\text{J}$ | Sensible/Latent Advection + Fourier | $-\left( u_n \rho_{H, \text{upwind}} - k_{\text{th}} \frac{T_j - T_i}{d_{ij}} \right) A_{ij} \Delta t$ |
| Entropy | $S$ | $\text{J}\cdot\text{K}^{-1}$ | Net Irreversible Exchange | $\Delta S_{\text{gen}, ij} = A_{ij} \Delta t \cdot k_{\text{th}} \frac{(T_i - T_j)^2}{T_i T_j d_{ij}}$ |

---

## 4. Executable Monad Method Specifications

### 4.1 Interface Metric Extraction Method

```typescript
/**
 * Resolves shared geodesic boundary geometry between two topological cells.
 */
export interface BoundaryGeometry3D {
  readonly cellA: string;
  readonly cellB: string;
  readonly v1: [number, number, number];
  readonly v2: [number, number, number];
  readonly midpoint: [number, number, number];
  readonly lengthMeters: number;
  readonly normalAtoB: [number, number, number];
  readonly distanceMeters: number;
  readonly facetAreaMeters2: number;
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  centroidA: [number, number, number],
  centroidB: [number, number, number],
  layerHeightMeters: number,
  radiusMeters: number = 6371008
): BoundaryGeometry3D | null {
  const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radiusMeters);
  if (!vertices) return null;

  const [p1, p2] = vertices;
  
  // Tangent vector
  const tx = p2[0] - p1[0];
  const ty = p2[1] - p1[1];
  const tz = p2[2] - p1[2];

  // Centroid A vector
  const [cx, cy, cz] = centroidA;

  // Normal vector: cross(t, centroidA)
  let nx = ty * cz - tz * cy;
  let ny = tz * cx - tx * cz;
  let nz = tx * cy - ty * cx;
  const nLen = Math.hypot(nx, ny, nz);
  if (nLen < 1e-12) return null;
  nx /= nLen;
  ny /= nLen;
  nz /= nLen;

  // Centroid displacement vector cB - cA
  const dx = centroidB[0] - cx;
  const dy = centroidB[1] - cy;
  const dz = centroidB[2] - cz;

  // Dot product to align normal toward cellB
  const dot = nx * dx + ny * dy + nz * dz;
  let v1 = p1;
  let v2 = p2;
  let finalNx = nx;
  let finalNy = ny;
  let finalNz = nz;

  if (dot < 0) {
    v1 = p2;
    v2 = p1;
    finalNx = -nx;
    finalNy = -ny;
    finalNz = -nz;
  }

  // Geodesic length along sphere
  const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radiusMeters * radiusMeters);
  const clampedDotV = Math.max(-1.0, Math.min(1.0, dotV));
  const lengthMeters = radiusMeters * Math.acos(clampedDotV);

  // Interface midpoint normalized to sphere radius
  const mx = 0.5 * (v1[0] + v2[0]);
  const my = 0.5 * (v1[1] + v2[1]);
  const mz = 0.5 * (v1[2] + v2[2]);
  const mLen = Math.hypot(mx, my, mz);
  const midpoint: [number, number, number] = [
    (mx / mLen) * radiusMeters,
    (my / mLen) * radiusMeters,
    (mz / mLen) * radiusMeters
  ];

  // Great-circle distance between centroids
  const dotC = (cx * centroidB[0] + cy * centroidB[1] + cz * centroidB[2]) / (radiusMeters * radiusMeters);
  const clampedDotC = Math.max(-1.0, Math.min(1.0, dotC));
  const distanceMeters = radiusMeters * Math.acos(clampedDotC);

  const facetAreaMeters2 = lengthMeters * layerHeightMeters;

  return {
    cellA,
    cellB,
    v1,
    v2,
    midpoint,
    lengthMeters,
    normalAtoB: [finalNx, finalNy, finalNz],
    distanceMeters,
    facetAreaMeters2
  };
}
```

---

### 4.2 Conservative Inter-Cell Stock Exchange Monad Method

```typescript
export interface CellThermodynamicState {
  massWaterKg: number;
  massCarbonKg: number;
  massMineralsKg: number;
  massOxygenKg: number;
  enthalpyJoules: number;
  temperatureKelvin: number;
  volumeM3: number;
}

export interface BoundaryFluxTransferResult {
  deltaCellA: CellThermodynamicState;
  deltaCellB: CellThermodynamicState;
  entropyGenerationJoulesPerKelvin: number;
}

/**
 * Computes conservative advective-diffusive mass and enthalpy exchanges
 * between two cells across their shared 3D spherical boundary edge.
 */
export function transferStocksAcrossBoundary3D(
  geom: BoundaryGeometry3D,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  velocityMidpoint: [number, number, number], // m/s
  diffusivityWater: number,                  // m^2/s
  diffusivityCarbon: number,                 // m^2/s
  diffusivityMinerals: number,               // m^2/s
  diffusivityOxygen: number,                 // m^2/s
  thermalConductivity: number,               // W/(m*K)
  deltaTimeSeconds: number
): BoundaryFluxTransferResult {
  const { normalAtoB, facetAreaMeters2, distanceMeters } = geom;
  
  // Normal velocity un = u . n_AB (positive into cell B)
  const un = velocityMidpoint[0] * normalAtoB[0] +
             velocityMidpoint[1] * normalAtoB[1] +
             velocityMidpoint[2] * normalAtoB[2];

  // Densities (kg/m^3 and J/m^3)
  const rhoW_A = stateA.massWaterKg / stateA.volumeM3;
  const rhoW_B = stateB.massWaterKg / stateB.volumeM3;
  const rhoC_A = stateA.massCarbonKg / stateA.volumeM3;
  const rhoC_B = stateB.massCarbonKg / stateB.volumeM3;
  const rhoM_A = stateA.massMineralsKg / stateA.volumeM3;
  const rhoM_B = stateB.massMineralsKg / stateB.volumeM3;
  const rhoO_A = stateA.massOxygenKg / stateA.volumeM3;
  const rhoO_B = stateB.massOxygenKg / stateB.volumeM3;
  const rhoH_A = stateA.enthalpyJoules / stateA.volumeM3;
  const rhoH_B = stateB.enthalpyJoules / stateB.volumeM3;

  // 1. Upwind Advective Fluxes (A -> B is positive)
  const isFlowAtoB = un >= 0;
  const fluxAdvW = un * (isFlowAtoB ? rhoW_A : rhoW_B);
  const fluxAdvC = un * (isFlowAtoB ? rhoC_A : rhoC_B);
  const fluxAdvM = un * (isFlowAtoB ? rhoM_A : rhoM_B);
  const fluxAdvO = un * (isFlowAtoB ? rhoO_A : rhoO_B);
  const fluxAdvH = un * (isFlowAtoB ? rhoH_A : rhoH_B);

  // 2. Fickian Diffusive Fluxes (-D * dRho/dx)
  const fluxDiffW = -diffusivityWater * ((rhoW_B - rhoW_A) / distanceMeters);
  const fluxDiffC = -diffusivityCarbon * ((rhoC_B - rhoC_A) / distanceMeters);
  const fluxDiffM = -diffusivityMinerals * ((rhoM_B - rhoM_A) / distanceMeters);
  const fluxDiffO = -diffusivityOxygen * ((rhoO_B - rhoO_A) / distanceMeters);

  // 3. Fourier Thermal Conduction Flux (-k * dT/dx)
  const fluxCondH = -thermalConductivity * ((stateB.temperatureKelvin - stateA.temperatureKelvin) / distanceMeters);

  // Total transferred mass and enthalpy over deltaTimeSeconds
  const factor = facetAreaMeters2 * deltaTimeSeconds;
  const deltaW = (fluxAdvW + fluxDiffW) * factor;
  const deltaC = (fluxAdvC + fluxDiffC) * factor;
  const deltaM = (fluxAdvM + fluxDiffM) * factor;
  const deltaO = (fluxAdvO + fluxDiffO) * factor;
  const deltaH = (fluxAdvH + fluxCondH) * factor;

  // Second Law Entropy Generation
  const tA = Math.max(1.0, stateA.temperatureKelvin);
  const tB = Math.max(1.0, stateB.temperatureKelvin);
  const sGen = factor * thermalConductivity * Math.pow(tA - tB, 2) / (tA * tB * distanceMeters);

  return {
    deltaCellA: {
      massWaterKg: -deltaW,
      massCarbonKg: -deltaC,
      massMineralsKg: -deltaM,
      massOxygenKg: -deltaO,
      enthalpyJoules: -deltaH,
      temperatureKelvin: 0, // State update handles T from enthalpy
      volumeM3: 0
    },
    deltaCellB: {
      massWaterKg: deltaW,
      massCarbonKg: deltaC,
      massMineralsKg: deltaM,
      massOxygenKg: deltaO,
      enthalpyJoules: deltaH,
      temperatureKelvin: 0,
      volumeM3: 0
    },
    entropyGenerationJoulesPerKelvin: sGen
  };
}
```

---

## 5. Numerical Stability & Conservation Invariants

1. **Exact Zero-Sum Invariance**:
   $$\sum_{k \in \{A, B\}} \Delta M_{w, k} \equiv 0, \quad \sum_{k \in \{A, B\}} \Delta M_{C, k} \equiv 0, \quad \sum_{k \in \{A, B\}} \Delta H_{k} \equiv 0$$
   Every transfer operation evaluates identical boundary geometry $A_{ij} = A_{ji}$ and guarantees strict sign inversion for fluxes.
2. **Courant-Friedrichs-Lewy (CFL) Condition**:
   To prevent unphysical oscillatory transport across facet $e_{ij}$, the simulation step must satisfy:
   $$\Delta t \le \min\left( \frac{d_{ij}}{2 |u_n|}, \frac{d_{ij}^2}{4 D_{\max}} \right)$$
   where $D_{\max} = \max(D_w, D_C, D_{\text{min}}, D_{\text{O}_2}, k_{\text{th}}/(\rho c_p))$.
3. **Floating-Point Clamping**:
   Vertex dot-products $\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}$ are clamped to $[-1.0, 1.0]$ prior to evaluating `Math.acos`, eliminating NaN risks at antipodal or identical vertex limits.