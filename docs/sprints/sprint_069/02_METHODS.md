# Process Methods Specification: Cartesian 3D Boundary Geometry & Interfacial Flux Mechanics

- **Sprint**: 069
- **Domain**: Spatial Geometry / Discrete Global Grid System (DGGS) / Interfacial Transport Monad
- **Target Source Modules**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/spatial/spatial_flux_monad.ts`
- **Architectural Reference**: RFC-069

---

## 1. Physical & Phenomenological Foundations

In the Web of Life discrete global grid simulation, physical state variables (temperature, fluid mass, dissolved carbon, oxygen, suspended minerals) are localized as volume-averaged cell stocks across H3 discrete global grid cells. Physical interactions between neighboring cells $A$ and $B$ are interfacial transport processes governed by finite-volume balance equations:

$$
\frac{d S_i}{dt} = \sum_{j \in \mathcal{N}(i)} \Phi_{ij} + \Pi_i
$$

where:
- $S_i$ is the stock vector in cell $i$ (e.g., thermal energy $U$, mass of species $M_k$).
- $\mathcal{N}(i)$ is the set of topological neighbors of cell $i$ in the DGGS.
- $\Phi_{ij}$ is the net flux across interface edge $\Gamma_{ij}$ from cell $j$ to cell $i$ ($\Phi_{ij} = -\Phi_{ji}$).
- $\Pi_i$ is the internal production/destruction rate within cell $i$.

Computing $\Phi_{ij}$ with zero numerical boundary leakage requires rigorous 3D spatial metrics. Geodetic polar representations $(\phi, \lambda)$ create non-conservative metric distortions and singularities at the poles. Mapping H3 boundary vertices into 3D Cartesian coordinates $\mathbf{v} \in \mathbb{S}^2 \subset \mathbb{R}^3$ via `extractH3BoundaryCartesianVertices3D` resolves these artifacts and establishes exact metric tensors for interfacial mass, momentum, enthalpy, and entropy transport.

---

## 2. Mass & Energy Conservation Mechanics Across Cartesian Interfaces

### 2.1 Interface Geometry from Cartesian Boundary Vertices

For two adjacent H3 cells $A$ and $B$, their shared boundary is an arc segment on the sphere bounded by two Cartesian vertices $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$:

1. **Normalized Unit Vertices**:
   $$\|\mathbf{v}_1\|_2 = 1, \quad \|\mathbf{v}_2\|_2 = 1$$

2. **Directed Boundary Tangent Vector**:
   $$\mathbf{e}_{AB} = \mathbf{v}_2 - \mathbf{v}_1$$

3. **Geodesic Interface Length**:
   $$L_{AB} = R \cdot \arccos\left(\mathbf{v}_1 \cdot \mathbf{v}_2\right) \quad [\text{m}]$$
   where $R$ is planetary radius (for Earth, $R = 6.3710088 \times 10^6\text{ m}$).

4. **Interface Midpoint Vector**:
   $$\mathbf{m}_{AB} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|_2}$$

5. **Outward Unit Normal to Boundary Arc**:
   $$\hat{\mathbf{n}}_{AB} = \frac{\mathbf{e}_{AB} \times \mathbf{m}_{AB}}{\|\mathbf{e}_{AB} \times \mathbf{m}_{AB}\|_2}$$
   Oriented such that $\hat{\mathbf{n}}_{AB} \cdot (\mathbf{c}_B - \mathbf{c}_A) > 0$, where $\mathbf{c}_A, \mathbf{c}_B$ are cell centroids.

6. **Interfacial Area**:
   $$A_{AB} = L_{AB} \cdot \Delta z_{\text{eff}} \quad [\text{m}^2]$$
   where $\Delta z_{\text{eff}}$ is the effective vertical fluid column layer thickness (m).

---

## 3. Concrete Stock Transfer Deltas

Let simulation time step be $\Delta t$ (seconds). For adjacent cells $A$ and $B$, stock transfer deltas $\Delta S_{AB} = [\Delta M_{H_2O}, \Delta M_{C}, \Delta M_{O_2}, \Delta M_{\text{min}}, \Delta U]_{AB}^T$ are evaluated across interface $\Gamma_{AB}$.

### 3.1 Velocity and Advective Flux
Let the fluid velocity vector evaluated at interface midpoint $\mathbf{m}_{AB}$ be $\mathbf{u}_{AB} \in \mathbb{R}^3$ ($\text{m}\cdot\text{s}^{-1}$).
The directed normal velocity across the boundary is:
$$u_{n, AB} = \mathbf{u}_{AB} \cdot \hat{\mathbf{n}}_{AB} \quad [\text{m}\cdot\text{s}^{-1}]$$

Volumetric exchange rate:
$$Q_{AB} = u_{n, AB} \cdot A_{AB} \quad [\text{m}^3\cdot\text{s}^{-1}]$$

Using first-order upwind discretization based on normal velocity sign:
$$\text{Donor}(AB) = \begin{cases} A, & u_{n, AB} \ge 0 \\ B, & u_{n, AB} < 0 \end{cases}$$

### 3.2 Species Mass Stock Deltas

1. **Water Mass Transfer ($\text{kg}$)**:
   $$\Delta M_{H_2O, AB} = Q_{AB} \cdot \rho_{w, \text{Donor}} \cdot \Delta t$$
   where $\rho_w$ is water density ($\text{kg}\cdot\text{m}^{-3}$).

2. **Carbon Stock Transfer ($\text{kg C}$)**:
   $$\Delta M_{C, AB} = Q_{AB} \cdot [C]_{\text{Donor}} \cdot \Delta t$$
   where $[C]$ is dissolved/airborne carbon concentration ($\text{kg C}\cdot\text{m}^{-3}$).

3. **Oxygen Stock Transfer ($\text{kg } O_2$)**:
   $$\Delta M_{O_2, AB} = Q_{AB} \cdot [O_2]_{\text{Donor}} \cdot \Delta t$$
   where $[O_2]$ is oxygen concentration ($\text{kg } O_2\cdot\text{m}^{-3}$).

4. **Mineral / Nutrient Stock Transfer ($\text{kg}$)**:
   $$\Delta M_{\text{min}, AB} = Q_{AB} \cdot [\text{min}]_{\text{Donor}} \cdot \Delta t + D_{\text{diff}} \cdot A_{AB} \cdot \frac{[\text{min}]_A - [\text{min}]_B}{d(\mathbf{c}_A, \mathbf{c}_B)} \cdot \Delta t$$
   where $D_{\text{diff}}$ is molecular/eddy diffusivity ($\text{m}^2\cdot\text{s}^{-1}$) and $d(\mathbf{c}_A, \mathbf{c}_B) = R \cdot \arccos(\mathbf{c}_A \cdot \mathbf{c}_B)$.

### 3.3 Internal Energy / Thermal Enthalpy Transfer ($\text{J}$)
$$
\Delta U_{AB} = \left( Q_{AB} \cdot c_p \cdot \rho \cdot T_{\text{Donor}} + \kappa \cdot A_{AB} \cdot \frac{T_A - T_B}{d(\mathbf{c}_A, \mathbf{c}_B)} \right) \cdot \Delta t
$$
where:
- $c_p$ is specific heat capacity ($\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$).
- $\kappa$ is thermal conductivity ($\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}$).
- $T$ is temperature ($\text{K}$).

### 3.4 Second Law Thermodynamic Dissipation & Entropy Generation ($\text{J}\cdot\text{K}^{-1}$)
Entropy generated across the interface over interval $\Delta t$:
$$
\Delta S_{\text{entropy}, AB} = \left[ J_{Q, AB} \cdot \left(\frac{1}{T_B} - \frac{1}{A}\right) + \frac{\mu_{\text{visc}} \cdot (\Delta u_{\parallel})^2}{T_{\text{avg}} \cdot d(\mathbf{c}_A, \mathbf{c}_B)} \cdot A_{AB} \right] \cdot \Delta t \ge 0
$$
where $J_{Q, AB}$ is conductive heat flux and $\Delta u_{\parallel}$ is tangential velocity shear.

---

## 4. Executable Monad Method Specification

The geometric interface calculated by `extractH3BoundaryCartesianVertices3D` binds directly to state tensor transitions inside the `SpatialFluxMonad`.

```typescript
/**
 * Vector representation of conserved extensive stocks in an H3 cell.
 */
export interface CellStockTensor {
  readonly massH2O: number;      // kg
  readonly massCarbon: number;   // kg C
  readonly massOxygen: number;   // kg O2
  readonly massMinerals: number; // kg
  readonly energyJoules: number; // J
  readonly temperatureK: number; // K
}

/**
 * Interface flux delta computed across a directed 3D boundary edge.
 */
export interface InterfacialFluxDelta {
  readonly edgeId: string;
  readonly donorCell: string;
  readonly receiverCell: string;
  readonly deltaH2O: number;      // kg
  readonly deltaCarbon: number;   // kg C
  readonly deltaOxygen: number;   // kg O2
  readonly deltaMinerals: number; // kg
  readonly deltaEnergy: number;   // J
  readonly entropyProduced: number; // J/K
}

/**
 * Geometric metrics of a shared boundary edge computed from 3D Cartesian coordinates.
 */
export interface EdgeCartesianMetrics {
  readonly v1: Cartesian3D;
  readonly v2: Cartesian3D;
  readonly lengthMeters: number;
  readonly normalUnit: Cartesian3D;
  readonly midpointUnit: Cartesian3D;
  readonly interfacialAreaM2: number;
}
```

### 4.1 Boundary Metric Derivation Function

```typescript
/**
 * Computes exact metric properties for the interface between two Cartesian vertices.
 */
export function computeEdgeCartesianMetrics(
  v1: Cartesian3D,
  v2: Cartesian3D,
  effectiveHeightMeters: number,
  planetRadiusMeters: number = 6371008.8
): EdgeCartesianMetrics {
  // Dot product clamped to [-1, 1] for numeric safety
  const dot = Math.max(-1.0, Math.min(1.0, v1.x * v2.x + v1.y * v2.y + v1.z * v2.z));
  const angularDistance = Math.acos(dot);
  const lengthMeters = planetRadiusMeters * angularDistance;

  // Tangent vector
  const tx = v2.x - v1.x;
  const ty = v2.y - v1.y;
  const tz = v2.z - v1.z;

  // Midpoint vector normalized to unit sphere
  const mx = (v1.x + v2.x) * 0.5;
  const my = (v1.y + v2.y) * 0.5;
  const mz = (v1.z + v2.z) * 0.5;
  const mNorm = Math.sqrt(mx * mx + my * my + mz * mz) || 1.0;
  const midpointUnit: Cartesian3D = {
    x: mx / mNorm,
    y: my / mNorm,
    z: mz / mNorm
  };

  // Normal vector: cross product of edge vector and radial midpoint vector
  const nx = ty * midpointUnit.z - tz * midpointUnit.y;
  const ny = tz * midpointUnit.x - tx * midpointUnit.z;
  const nz = tx * midpointUnit.y - ty * midpointUnit.x;
  const nNorm = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;

  const normalUnit: Cartesian3D = {
    x: nx / nNorm,
    y: ny / nNorm,
    z: nz / nNorm
  };

  const interfacialAreaM2 = lengthMeters * effectiveHeightMeters;

  return {
    v1,
    v2,
    lengthMeters,
    normalUnit,
    midpointUnit,
    interfacialAreaM2
  };
}
```

### 4.2 Monadic Interfacial Transfer Equation

```typescript
/**
 * Computes conservative stock transfer delta across a single interface.
 */
export function evaluateInterfacialTransferMonad(
  cellAIndex: string,
  cellBIndex: string,
  stockA: CellStockTensor,
  stockB: CellStockTensor,
  metrics: EdgeCartesianMetrics,
  velocityVec: Cartesian3D, // m/s at interface
  dtSeconds: number
): InterfacialFluxDelta {
  // Normal velocity: u_n = u . n
  const u_n = velocityVec.x * metrics.normalUnit.x +
              velocityVec.y * metrics.normalUnit.y +
              velocityVec.z * metrics.normalUnit.z;

  const volumetricFluxM3PerSec = u_n * metrics.interfacialAreaM2;

  // Upwind donor-receiver logic
  const isAtoB = volumetricFluxM3PerSec >= 0;
  const donor = isAtoB ? cellAIndex : cellBIndex;
  const receiver = isAtoB ? cellBIndex : cellAIndex;
  const donorStock = isAtoB ? stockA : stockB;

  const absFluxVolume = Math.abs(volumetricFluxM3PerSec) * dtSeconds;

  // Concentrations in donor
  const rhoWater = 1000.0; // kg/m^3 baseline fluid density
  const deltaH2O = Math.min(donorStock.massH2O, absFluxVolume * rhoWater);

  const carbonConc = donorStock.massH2O > 0 ? donorStock.massCarbon / donorStock.massH2O : 0;
  const oxygenConc = donorStock.massH2O > 0 ? donorStock.massOxygen / donorStock.massH2O : 0;
  const mineralConc = donorStock.massH2O > 0 ? donorStock.massMinerals / donorStock.massH2O : 0;

  const deltaCarbon = deltaH2O * carbonConc;
  const deltaOxygen = deltaH2O * oxygenConc;
  const deltaMinerals = deltaH2O * mineralConc;

  // Thermal energy transfer (Advection + Conduction)
  const cpWater = 4184.0; // J/(kg*K)
  const thermalConductivity = 0.6; // W/(m*K)
  const tempDiff = stockA.temperatureK - stockB.temperatureK;
  const heatConduction = thermalConductivity * metrics.interfacialAreaM2 * (tempDiff / Math.max(metrics.lengthMeters, 1.0)) * dtSeconds;

  const advectiveHeat = deltaH2O * cpWater * donorStock.temperatureK;
  const totalDeltaEnergy = isAtoB ? (advectiveHeat + heatConduction) : (-advectiveHeat + heatConduction);

  // Entropy generation (Second Law: dS >= 0)
  const invTB = 1.0 / Math.max(stockB.temperatureK, 1.0);
  const invTA = 1.0 / Math.max(stockA.temperatureK, 1.0);
  const entropyProduced = Math.max(0.0, heatConduction * (invTB - invTA));

  return {
    edgeId: `${cellAIndex}->${cellBIndex}`,
    donorCell: donor,
    receiverCell: receiver,
    deltaH2O,
    deltaCarbon,
    deltaOxygen,
    deltaMinerals,
    deltaEnergy: totalDeltaEnergy,
    entropyProduced
  };
}
```

---

## 5. Verification Matrix & Invariants

| Invariant Index | Physical Law | Constraint Expression | Numerical Tolerance |
| :--- | :--- | :--- | :--- |
| **INV-M-01** | First Law (Mass) | $\sum_{i} \Delta M_{k, i} = 0 \quad (\forall k \in \{H_2O, C, O_2, \text{min}\})$ | $\varepsilon \le 1.0 \times 10^{-12}\text{ kg}$ |
| **INV-E-02** | First Law (Energy) | $\sum_{i} \Delta U_i + W_{\text{ext}} - Q_{\text{rad}} = 0$ | $\varepsilon \le 1.0 \times 10^{-9}\text{ J}$ |
| **INV-S-03** | Second Law (Entropy) | $\Delta S_{\text{entropy, edge}} \ge 0$ | Strictly $\ge 0$ |
| **INV-G-04** | Cartesian Norm | $\|\mathbf{v}_k\|_2 = 1.0$ for all boundary vertices | $\lvert \|\mathbf{v}_k\|_2 - 1.0 \rvert \le 1.0 \times 10^{-12}$ |
| **INV-G-05** | Metric Symmetry | $L_{AB} \equiv L_{BA}, \quad \hat{\mathbf{n}}_{AB} \equiv -\hat{\mathbf{n}}_{BA}$ | $\varepsilon \le 1.0 \times 10^{-14}$ |

---

## 6. Implementation Checklist for Sprint 069
- [x] Geodetic to 3D Cartesian spherical transformation formulation.
- [x] Boundary closure and vertex sequencing topology.
- [x] Interfacial unit normal and geodesic edge length derivations.
- [x] First and Second Law conservation delta monad formulations.
- [x] Export interface structures ready for code generation in `src/spatial/h3_adjacency.ts`.