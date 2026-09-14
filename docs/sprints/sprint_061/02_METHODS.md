# Sprint 061 — Process Methods & Thermodynamic Formulations: Spherical Boundary Segment Displacement Vectors

## 1. Domain & Physical Context

In the Web of Life planetary simulation engine, continuous planetary geometry is discretized using the Discrete Global Grid System (DGGS) via H3 hexagonal and pentagonal spherical tiles on an oblate or mean spherical Earth $\mathbb{S}^2$ of radius $R_{\oplus} = 6,371,008.8\text{ m}$.

Lateral advective and diffusive transport of fluid and thermodynamic stocks—including sensible enthalpy ($H$), atmospheric water vapor and ocean moisture ($Q_{H_2O}$), dissolved inorganic carbon ($DIC$), dissolved organic carbon ($DOC$), dissolved oxygen ($O_2$), and mineral macronutrients ($\text{NO}_3^-$, $\text{PO}_4^{3-}$)—is evaluated across finite-volume cell boundaries.

To preserve strict physical conservation (First Law of Thermodynamics) and guarantee non-negative entropy generation (Second Law of Thermodynamics), conservative finite volume schemes require exact, oriented boundary facet vectors. The unnormalized boundary segment displacement vector:
$$\vec{\mathbf{L}}_{AB} = \mathbf{v}_B - \mathbf{v}_A$$
is the foundational geometric primitive from which boundary lengths, outward normals, lateral facet areas, and interfacial flux rates are computed.

---

## 2. Mathematical & Thermodynamic Formalisms

### 2.1 Coordinate Space and Segment Vector Formulation
Let the planetary surface be parameterized in 3D Cartesian coordinates (geocentric Earth-Centered, Earth-Fixed [ECEF] reference frame):
$$\mathbf{v} = \begin{bmatrix} x \\ y \\ z \end{bmatrix} \in \mathbb{R}^3, \quad \|\mathbf{v}\|_2 \approx R_{\oplus}$$

For an oriented cell boundary segment connecting vertex $A$ to vertex $B$:
$$\vec{\mathbf{L}}_{AB} = \mathbf{v}_B - \mathbf{v}_A = \begin{bmatrix} x_B - x_A \\ y_B - y_A \\ z_B - z_A \end{bmatrix}$$

#### Antisymmetry Property
$$\vec{\mathbf{L}}_{BA} = -\vec{\mathbf{L}}_{AB}$$

#### Discrete Stokes Loop Invariant
For any closed planar or spherical $N$-sided polygon (such as an H3 hexagon where $N=6$, or pentagon where $N=5$):
$$\oint_{\partial \Omega_i} d\vec{\mathbf{l}} = \sum_{k=1}^N \vec{\mathbf{L}}_{k, k+1} = \sum_{k=1}^N (\mathbf{v}_{k+1} - \mathbf{v}_k) \equiv \mathbf{0}, \quad \text{where } \mathbf{v}_{N+1} = \mathbf{v}_1$$

### 2.2 Metric Quantities Derived from $\vec{\mathbf{L}}_{AB}$
1. **Euclidean Chord Length**:
   $$l_{chord} = \|\vec{\mathbf{L}}_{AB}\|_2 = \sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}$$

2. **Geodesic Great-Circle Arc Length**:
   Using the mean planetary sphere radius $R_{\oplus}$:
   $$\theta = 2 \arcsin\left(\frac{l_{chord}}{2 R_{\oplus}}\right), \quad s_{AB} = R_{\oplus} \theta$$

3. **Facet Normal and Interfacial Area Vector**:
   Let $\hat{\mathbf{r}}_{edge}$ be the unit outward radial vector evaluated at the edge midpoint $\mathbf{v}_{mid} = \frac{1}{2}(\mathbf{v}_A + \mathbf{v}_B)$:
   $$\hat{\mathbf{r}}_{edge} = \frac{\mathbf{v}_{mid}}{\|\mathbf{v}_{mid}\|_2}$$
   The oriented horizontal facet normal vector in the tangent plane of the sphere is given by:
   $$\vec{\mathbf{n}}_{facet} = \hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}$$
   The unit horizontal normal is:
   $$\hat{\mathbf{n}}_{facet} = \frac{\vec{\mathbf{n}}_{facet}}{\|\vec{\mathbf{n}}_{facet}\|_2} = \frac{\hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}}{\|\hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}\|_2}$$
   For a fluid column (atmospheric scale height or oceanic layer) of effective depth $H_e$, the interfacial directed area vector $\mathbf{A}_{AB}$ is:
   $$\mathbf{A}_{AB} = \left(\hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}\right) \frac{s_{AB}}{l_{chord}} \cdot H_e \approx (\hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}) \cdot H_e$$

---

## 3. Mass & Energy Flux Formulations

### 3.1 Thermodynamic State Vector of Cell Monad
Each cell monad $\mathcal{M}_i$ carries state variables:
$$\mathbf{S}_i = \begin{bmatrix} U_i & (\text{Internal Energy, J}) \\ M_{i, w} & (\text{Water Mass, kg}) \\ M_{i, C} & (\text{Carbon Mass, kg C}) \\ M_{i, O} & (\text{Oxygen Mass, kg } \text{O}_2) \\ M_{i, N} & (\text{Mineral/Macronutrient Mass, kg N}) \end{bmatrix}$$

Associated intensive variables:
- Temperature: $T_i = \frac{U_i}{C_{v, i}}$ (where $C_{v, i}$ is total heat capacity, $\text{J}\cdot\text{K}^{-1}$)
- Species concentrations: $c_{i, k} = \frac{M_{i, k}}{V_i}$ ($\text{kg}\cdot\text{m}^{-3}$)

### 3.2 Interfacial Advective Fluxes
Given fluid velocity field $\mathbf{u} = [u_x, u_y, u_z]^T$ at the facet interface:
The volumetric volumetric transport rate $\dot{V}_{AB}$ across facet $AB$ during time interval $\Delta t$ is:
$$\dot{V}_{AB} = \mathbf{u} \cdot \mathbf{A}_{AB} = \mathbf{u} \cdot (\hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}) \cdot H_e \quad [\text{m}^3\cdot\text{s}^{-1}]$$

Using upwind concentration $c_{k}^*$:
$$c_{k}^* = \begin{cases} c_{i, k} & \text{if } \dot{V}_{AB} \ge 0 \quad (\text{flow from } i \to j) \\ c_{j, k} & \text{if } \dot{V}_{AB} < 0 \quad (\text{flow from } j \to i) \end{cases}$$

The mass transfer delta for stock $k$ is:
$$\Delta M_{k, adv} = c_{k}^* \cdot \dot{V}_{AB} \cdot \Delta t \quad [\text{kg}]$$

### 3.3 Interfacial Diffusive & Conductive Fluxes
Let $d_{ij} = \|\mathbf{x}_j - \mathbf{x}_i\|_2$ be the geodetic distance between cell centroids:
1. **Fickian Mass Diffusion**:
   $$\dot{M}_{k, diff} = -D_k \left(\frac{c_{j, k} - c_{i, k}}{d_{ij}}\right) \|\mathbf{A}_{AB}\|_2 \quad [\text{kg}\cdot\text{s}^{-1}]$$
   $$\Delta M_{k, diff} = \dot{M}_{k, diff} \cdot \Delta t$$

2. **Fourier Heat Conduction**:
   $$\dot{Q}_{cond} = -\kappa_{th} \left(\frac{T_j - T_i}{d_{ij}}\right) \|\mathbf{A}_{AB}\|_2 \quad [\text{W}]$$
   $$\Delta U_{cond} = \dot{Q}_{cond} \cdot \Delta t \quad [\text{J}]$$

### 3.4 Second Law Entropy Production
For thermal exchange $\Delta Q_{cond} = \dot{Q}_{cond} \Delta t$ flowing from $i$ to $j$ ($T_i > T_j \implies \dot{Q}_{cond} > 0$):
$$\Delta S_{gen, AB} = \dot{Q}_{cond} \Delta t \left( \frac{1}{T_j} - \frac{1}{T_i} \right) \ge 0$$
This is non-negative since $\dot{Q}_{cond}$ and $(T_i - T_j)$ share the same sign.

---

## 4. Executable Monad Method Specifications

### 4.1 Type Definitions

```typescript
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BoundarySegment3D {
  readonly start: Vector3D;
  readonly end: Vector3D;
  readonly displacement: Vector3D;
  readonly chordLength: number;
  readonly arcLength: number;
}

export interface FacetMetrics {
  readonly segmentVector: Vector3D;
  readonly chordLength: number;
  readonly arcLength: number;
  readonly normalAreaVector: Vector3D;
  readonly facetArea: number;
  readonly unitNormal: Vector3D;
}

export interface ThermodynamicStocks {
  internalEnergyJ: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
}

export interface ThermodynamicDeltas {
  dInternalEnergyJ: number;
  dWaterKg: number;
  dCarbonKg: number;
  dOxygenKg: number;
  dMineralsKg: number;
  entropyGenJK: number;
}
```

### 4.2 Geometric Primitive Implementation

```typescript
/**
 * Calculates the unnormalized displacement vector from vertex v1 to vertex v2.
 * Vector = v2 - v1 = (x2 - x1, y2 - y1, z2 - z1).
 *
 * Invariant: computeBoundarySegmentVector3D(v1, v2) === -computeBoundarySegmentVector3D(v2, v1)
 *
 * @param v1 Starting spherical boundary vertex in 3D Cartesian coordinates.
 * @param v2 Ending spherical boundary vertex in 3D Cartesian coordinates.
 * @returns Unnormalized Vector3D representing displacement from v1 to v2.
 * @throws Error if any coordinate is NaN or non-finite.
 */
export function computeBoundarySegmentVector3D(v1: Vector3D, v2: Vector3D): Vector3D {
  if (
    !Number.isFinite(v1.x) || !Number.isFinite(v1.y) || !Number.isFinite(v1.z) ||
    !Number.isFinite(v2.x) || !Number.isFinite(v2.y) || !Number.isFinite(v2.z)
  ) {
    throw new Error('computeBoundarySegmentVector3D: All vertex coordinates must be finite numbers');
  }

  return {
    x: v2.x - v1.x,
    y: v2.y - v1.y,
    z: v2.z - v1.z
  };
}
```

### 4.3 Facet Metric Evaluator

```typescript
const MEAN_EARTH_RADIUS_METERS = 6371008.8;

/**
 * Computes facet metrics derived from boundary segment displacement.
 */
export function computeFacetMetrics(
  v1: Vector3D,
  v2: Vector3D,
  layerDepthMeters: number,
  planetaryRadiusMeters: number = MEAN_EARTH_RADIUS_METERS
): FacetMetrics {
  const L = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = Math.sqrt(L.x * L.x + L.y * L.y + L.z * L.z);

  // Compute central angle on sphere
  const clampedChordRatio = Math.min(1.0, chordLength / (2 * planetaryRadiusMeters));
  const centralAngle = 2 * Math.asin(clampedChordRatio);
  const arcLength = planetaryRadiusMeters * centralAngle;

  // Midpoint radial direction
  const midX = 0.5 * (v1.x + v2.x);
  const midY = 0.5 * (v1.y + v2.y);
  const midZ = 0.5 * (v1.z + v2.z);
  const midNorm = Math.sqrt(midX * midX + midY * midY + midZ * midZ);

  const rMid = midNorm > 0
    ? { x: midX / midNorm, y: midY / midNorm, z: midZ / midNorm }
    : { x: 0, y: 0, z: 1 };

  // Cross product: normalDirection = rMid x L
  const nx = rMid.y * L.z - rMid.z * L.y;
  const ny = rMid.z * L.x - rMid.x * L.z;
  const nz = rMid.x * L.y - rMid.y * L.x;
  const crossNorm = Math.sqrt(nx * nx + ny * ny + nz * nz);

  const unitNormal = crossNorm > 0
    ? { x: nx / crossNorm, y: ny / crossNorm, z: nz / crossNorm }
    : { x: 0, y: 0, z: 0 };

  const facetArea = arcLength * layerDepthMeters;
  const normalAreaVector = {
    x: unitNormal.x * facetArea,
    y: unitNormal.y * facetArea,
    z: unitNormal.z * facetArea
  };

  return {
    segmentVector: L,
    chordLength,
    arcLength,
    normalAreaVector,
    facetArea,
    unitNormal
  };
}
```

### 4.4 Interfacial Finite-Volume Flux Transfer Method

```typescript
/**
 * Evaluates conservative mass and energy deltas across boundary facet AB separating Cell I and Cell J.
 * Preserves First Law (exact anti-symmetry) and Second Law (dS_gen >= 0).
 */
export function evaluateInterfacialFlux(
  stockI: ThermodynamicStocks,
  stockJ: ThermodynamicStocks,
  volumeI: number,
  volumeJ: number,
  heatCapacityI: number,
  heatCapacityJ: number,
  centroidDistance: number,
  metrics: FacetMetrics,
  fluidVelocity: Vector3D,
  diffusionCoeffs: { water: number; carbon: number; oxygen: number; minerals: number; thermalConductivity: number },
  dtSeconds: number
): { deltaI: ThermodynamicDeltas; deltaJ: ThermodynamicDeltas } {
  // 1. Volumetric advection flux rate (m^3 / s)
  const vDotA = fluidVelocity.x * metrics.normalAreaVector.x +
                fluidVelocity.y * metrics.normalAreaVector.y +
                fluidVelocity.z * metrics.normalAreaVector.z;

  // 2. Temperatures (K)
  const TI = stockI.internalEnergyJ / heatCapacityI;
  const TJ = stockJ.internalEnergyJ / heatCapacityJ;

  // 3. Species concentrations (kg / m^3)
  const cW_I = stockI.waterKg / volumeI;
  const cW_J = stockJ.waterKg / volumeJ;
  const cC_I = stockI.carbonKg / volumeI;
  const cC_J = stockJ.carbonKg / volumeJ;
  const cO_I = stockI.oxygenKg / volumeI;
  const cO_J = stockJ.oxygenKg / volumeJ;
  const cM_I = stockI.mineralsKg / volumeI;
  const cM_J = stockJ.mineralsKg / volumeJ;

  // Upwind advective concentrations
  const upwindW = vDotA >= 0 ? cW_I : cW_J;
  const upwindC = vDotA >= 0 ? cC_I : cC_J;
  const upwindO = vDotA >= 0 ? cO_I : cO_J;
  const upwindM = vDotA >= 0 ? cM_I : cM_J;
  const upwindT = vDotA >= 0 ? TI : TJ;
  const upwindSpecificHeat = vDotA >= 0
    ? heatCapacityI / (stockI.waterKg + stockI.mineralsKg)
    : heatCapacityJ / (stockJ.waterKg + stockJ.mineralsKg);

  // 4. Advective transfers (Cell I -> Cell J)
  const dWaterAdv = upwindW * vDotA * dtSeconds;
  const dCarbonAdv = upwindC * vDotA * dtSeconds;
  const dOxygenAdv = upwindO * vDotA * dtSeconds;
  const dMineralsAdv = upwindM * vDotA * dtSeconds;
  const dEnergyAdv = (dWaterAdv + dMineralsAdv) * upwindSpecificHeat * upwindT;

  // 5. Diffusive transfers (Fickian & Fourier)
  const areaOverDist = metrics.facetArea / centroidDistance;

  const dWaterDiff = -diffusionCoeffs.water * ((cW_J - cW_I) * areaOverDist) * dtSeconds;
  const dCarbonDiff = -diffusionCoeffs.carbon * ((cC_J - cC_I) * areaOverDist) * dtSeconds;
  const dOxygenDiff = -diffusionCoeffs.oxygen * ((cO_J - cO_I) * areaOverDist) * dtSeconds;
  const dMineralsDiff = -diffusionCoeffs.minerals * ((cM_J - cM_I) * areaOverDist) * dtSeconds;
  const dEnergyCond = -diffusionCoeffs.thermalConductivity * ((TJ - TI) * areaOverDist) * dtSeconds;

  // 6. Net exchange deltas (from cell I to cell J)
  const netEnergy = dEnergyAdv + dEnergyCond;
  const netWater = dWaterAdv + dWaterDiff;
  const netCarbon = dCarbonAdv + dCarbonDiff;
  const netOxygen = dOxygenAdv + dOxygenDiff;
  const netMinerals = dMineralsAdv + dMineralsDiff;

  // 7. Second Law Entropy Generation for thermal conduction
  const entropyGen = dEnergyCond * (1.0 / TJ - 1.0 / TI);

  const deltaI: ThermodynamicDeltas = {
    dInternalEnergyJ: -netEnergy,
    dWaterKg: -netWater,
    dCarbonKg: -netCarbon,
    dOxygenKg: -netOxygen,
    dMineralsKg: -netMinerals,
    entropyGenJK: entropyGen >= 0 ? entropyGen : 0
  };

  const deltaJ: ThermodynamicDeltas = {
    dInternalEnergyJ: netEnergy,
    dWaterKg: netWater,
    dCarbonKg: netCarbon,
    dOxygenKg: netOxygen,
    dMineralsKg: netMinerals,
    entropyGenJK: entropyGen >= 0 ? entropyGen : 0
  };

  return { deltaI, deltaJ };
}
```

---

## 5. Physical Invariants & Verification Bounds

| Invariant | Equation / Bound | Numerical Tolerance | Physical Consequence |
| :--- | :--- | :--- | :--- |
| **Vector Antisymmetry** | $\vec{\mathbf{L}}_{AB} + \vec{\mathbf{L}}_{BA} = \mathbf{0}$ | $\epsilon < 10^{-15}$ | Reversal of facet orientation inverts flux sign with zero drift. |
| **Stokes Closed Loop** | $\sum_{k=1}^N \vec{\mathbf{L}}_{k, k+1} = \mathbf{0}$ | $\epsilon < 10^{-12}$ | Closed polygon boundary contours exhibit zero net translational vector sum. |
| **First Law Energy** | $\Delta U_i + \Delta U_j = 0$ | Exact ($0.0\text{ J}$) | No artificial energy sink or source across shared topological facets. |
| **First Law Mass** | $\Delta M_{k, i} + \Delta M_{k, j} = 0$ | Exact ($0.0\text{ kg}$) | Mass conservation across boundary facets for water, carbon, $O_2$, minerals. |
| **Second Law Thermal** | $\dot{S}_{gen} = \dot{Q}_{cond} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0$ | Lower bound $0.0\text{ J/K}$ | Heat flows spontaneously down temperature gradients, producing non-negative entropy. |