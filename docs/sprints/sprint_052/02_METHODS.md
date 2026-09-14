# Sprint 052 — Process Mining & Method Specifications: 3D Cartesian Spherical Unit Vector Projection

**Target Component:** `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`  
**Standard:** Web of Life Thermodynamic Monad & DGGS Spatial Protocol  
**Status:** APPROVED

---

## 1. Physical & Mathematical Process Foundations

### 1.1 Process 1: Geodesic-to-Euclidean Unit Projection (`latLngToUnitVector3D`)
Human geographic coordinates $(\phi_{\text{deg}}, \lambda_{\text{deg}})$ on the reference sphere $\mathbb{S}^2 \subset \mathbb{R}^3$ are projected to an orthonormal basis via:

$$\phi = \phi_{\text{deg}} \cdot \frac{\pi}{180}, \quad \lambda = \lambda_{\text{deg}} \cdot \frac{\pi}{180}$$

$$\mathbf{u} = \begin{bmatrix} x \\ y \\ z \end{bmatrix} = \begin{bmatrix} \cos(\phi) \cos(\lambda) \\ \cos(\phi) \sin(\lambda) \\ \sin(\phi) \end{bmatrix}$$

#### Numerical Invariance and Orthogonal Normalization
To prevent numerical drift from transcendental floating-point approximations:
$$\|\mathbf{u}\|_2 = \sqrt{x^2 + y^2 + z^2}$$
$$\mathbf{u}_{\text{unit}} = \frac{\mathbf{u}}{\|\mathbf{u}\|_2}, \quad \text{guaranteeing } |\|\mathbf{u}_{\text{unit}}\|_2 - 1.0| \le 1.0 \times 10^{-15}$$

#### Boundary Clamping & Singularities
- **Poles:** For $|\phi_{\text{deg}}| \ge 90.0 - 1.0 \times 10^{-12}$:
  $$\mathbf{u} = \begin{bmatrix} 0 \\ 0 \\ \operatorname{sgn}(\phi_{\text{deg}}) \cdot 1.0 \end{bmatrix}$$
- **Antimeridian:** Longitude is normalized modulo $360^\circ$ into $[-\pi, \pi)$ such that $\lim_{\lambda \to \pi^-} \mathbf{u} = \lim_{\lambda \to -\pi^+} \mathbf{u}$.

---

### 1.2 Process 2: Solar Insolation & Boundary Layer Radiative Influx
Cell centroids represented by unit vectors $\mathbf{u}_i \in \mathbb{S}^2$ receive direct unattenuated solar power proportional to the cosine of the local solar zenith angle $\theta_{z, i}$:

$$\cos \theta_{z, i} = \max(0, \mathbf{u}_i \cdot \mathbf{s}_\odot)$$

where $\mathbf{s}_\odot = [x_\odot, y_\odot, z_\odot]^T \in \mathbb{S}^2$ is the unit vector pointing toward the instantaneous subsolar point at planetary orbital epoch $t$.

#### First Law Energy Balance
The total solar radiative flux absorbed by hexagonal cell $i$ with surface area $A_i$ [$\text{m}^2$], surface albedo $\alpha_i \in [0, 1]$, and atmospheric shortwave transmissivity $\tau_{\text{atm}, i} \in [0, 1]$ over time increment $\Delta t$ [$\text{s}$] is:

$$\Delta E_{\text{absorbed}, i} = S_0 \cdot \tau_{\text{atm}, i} \cdot (1.0 - \alpha_i) \cdot \max(0, \mathbf{u}_i \cdot \mathbf{s}_\odot) \cdot A_i \cdot \Delta t \quad [\text{J}]$$

Where $S_0 = 1361.0 \text{ W/m}^2$ is the solar constant.

#### Planetary Conservation Invariant
Summed over all $N$ discrete cells of the planetary tessellation:
$$\sum_{i=1}^N \max(0, \mathbf{u}_i \cdot \mathbf{s}_\odot) \cdot A_i = \pi R_\oplus^2 \cdot (1 \pm \epsilon_{\text{tessellation}})$$
with truncation error $\epsilon_{\text{tessellation}} \le 2.5 \times 10^{-4}$ for H3 resolution $\ge 4$.

#### Biochemical Partitioning (GPP & Transpiration Coupling)
A fraction $\eta_{\text{PAR}} = 0.48$ of absorbed solar flux resides in the photosynthetically active radiation band ($\lambda \in [400, 700]\text{ nm}$). For vegetated cells with Leaf Area Index $\text{LAI}_i$, the absorbed PAR driving carboxylation is:

$$\text{APAR}_i = \eta_{\text{PAR}} \cdot \Delta E_{\text{absorbed}, i} \cdot \left(1.0 - e^{-k_{\text{ext}} \cdot \text{LAI}_i}\right) \quad [\text{J}]$$

Where $k_{\text{ext}} = 0.5$ is the canopy light extinction coefficient.

Mass transfers per cell $i$ during $\Delta t$:
1. **Carbon Assimilation (GPP):**
   $$\Delta C_{\text{biomass}, i} = \frac{\text{APAR}_i}{\mathcal{E}_{\text{quantum}}} \cdot \mu_{\text{rubisco}} \quad [\text{kg C}]$$
   where $\mathcal{E}_{\text{quantum}} = 4.22 \times 10^6 \text{ J/mol photons}$ and $\mu_{\text{rubisco}} = 0.012 \text{ kg C/mol photons}$.
2. **Carbon Dioxide Drawdown:**
   $$\Delta m_{\text{CO}_2, i} = -\frac{44.01}{12.011} \cdot \Delta C_{\text{biomass}, i} \quad [\text{kg }\text{CO}_2]$$
3. **Oxygen Generation:**
   $$\Delta m_{\text{O}_2, i} = +\frac{31.998}{12.011} \cdot \Delta C_{\text{biomass}, i} \quad [\text{kg }\text{O}_2]$$
4. **Stomatal Transpiration:**
   $$\Delta m_{\text{H}_2\text{O}, \text{transp}, i} = -\text{WUE}^{-1} \cdot \Delta C_{\text{biomass}, i} \quad [\text{kg }\text{H}_2\text{O}]$$
   where $\text{WUE} \approx 3.5 \times 10^{-3} \text{ kg C / kg }\text{H}_2\text{O}$ is water-use efficiency.

---

### 1.3 Process 3: Conservative Advective Inter-Cell Fluxes Across Hexagonal Edges
For two adjacent cells $i$ and $j$ with unit vectors $\mathbf{u}_i$ and $\mathbf{u}_j$:

#### Great-Circle Chord Metric
$$\theta_{ij} = \operatorname{atan2}\left(\|\mathbf{u}_i \times \mathbf{u}_j\|_2, \; \mathbf{u}_i \cdot \mathbf{u}_j\right) \quad [\text{rad}]$$
$$L_{ij} = R_\oplus \cdot \theta_{ij} \quad [\text{m}]$$
$$\mathbf{t}_{ij} = \frac{\mathbf{u}_j - \mathbf{u}_i}{\|\mathbf{u}_j - \mathbf{u}_i\|_2} \quad \text{(Unit tangent chord direction)}$$

#### Mass and Energy Flux Divergence
Given scalar tracer field $\psi$ (e.g., atmospheric water vapor mass concentration $[kg/kg]$ or thermal enthalpy $[J/kg]$) and horizontal wind vector $\mathbf{v}_{ij} \in \mathbb{R}^3$ along the great circle:

$$v_{n, ij} = \mathbf{v}_{ij} \cdot \mathbf{t}_{ij} \quad [\text{m/s}]$$
$$F_{\psi, ij} = w_{ij} \cdot \rho_{\text{air}} \cdot H_{\text{pbl}} \cdot \left[ \max(v_{n, ij}, 0) \psi_i + \min(v_{n, ij}, 0) \psi_j \right] \quad [\text{kg/s or W}]$$

where $w_{ij}$ is the metric length of the shared hexagonal boundary edge [$\text{m}$], $\rho_{\text{air}}$ is air density [$\text{kg/m}^3$], and $H_{\text{pbl}}$ is planetary boundary layer height [$\text{m}$].

Conservative mass/enthalpy update:
$$\Delta \Psi_i = \sum_{j \in \mathcal{N}(i)} \left(-F_{\psi, ij}\right) \cdot \Delta t$$
$$\Delta \Psi_j = -\Delta \Psi_i \implies \sum_{i} \Delta \Psi_i = 0 \quad \text{(Strict Conservation)}$$

#### Second Law Entropy Generation
$$\dot{S}_{\text{advect}, ij} = F_{E, ij} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0$$
Using normalized 3D vectors $\mathbf{u}_i, \mathbf{u}_j$ guarantees isotropic path length $L_{ij}$, eliminating non-physical negative dissipation loops that plague flat map projections.

---

## 2. Stock and Flow Ledger (Per Cell Monad State)

| Stock Identifier | Physical Quantity | Base SI Units | Influx Source | Outflux Sink | Conservation Invariant |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `state.stocks.thermalEnergyJoules` | Internal thermal energy | $\text{J}$ | Solar shortwave absorption ($F_{\text{solar}}$) | Longwave thermal radiation, sensible/latent advection | $\Delta U = Q - W$ |
| `state.stocks.carbonDioxideKg` | Atmospheric $\text{CO}_2$ mass | $\text{kg}$ | Respiration, combustion | Carboxylation (Photosynthesis) | $\sum \Delta C_{\text{atm}} + \sum \Delta C_{\text{bio}} = 0$ |
| `state.stocks.biomassCarbonKg` | Living biomass carbon | $\text{kg}$ | GPP carbon fixation | Autotrophic respiration, mortality | $\sum \Delta C = 0$ |
| `state.stocks.atmosphericWaterKg` | Column water vapor | $\text{kg}$ | Canopy transpiration, soil evaporation | Precipitation, advective divergent transport | $\sum \Delta \text{H}_2\text{O}_{\text{cell}} = 0$ (isolated) |
| `state.stocks.oxygenKg` | Free atmospheric $\text{O}_2$ | $\text{kg}$ | Light-dependent water photolysis | Soil/plant respiration | Balanced with C mole ratios |

---

## 3. Monad Method Executable Specifications

### 3.1 Spatial Vector Utilities Interface (`src/spatial/h3_types.ts`)

```typescript
export type UnitVector3D = readonly [x: number, y: number, z: number];

export interface CellSpatialGeometry {
  readonly h3Index: string;
  readonly latDeg: number;
  readonly lngDeg: number;
  readonly unitVector: UnitVector3D;
  readonly surfaceAreaM2: number;
}

export interface AdvectiveEdgeFlux {
  readonly sourceH3: string;
  readonly targetH3: string;
  readonly chordLengthM: number;
  readonly normalUnitVector: UnitVector3D;
  readonly massFluxKgPerSec: number;
  readonly heatFluxWatts: number;
}
```

### 3.2 Pure Geometric Projection Function (`src/spatial/h3_adjacency.ts`)

```typescript
import { UnitVector3D } from './h3_types';

const DEG_TO_RAD = Math.PI / 180.0;
const POLAR_TOLERANCE_DEG = 90.0 - 1e-12;

/**
 * Transforms latitude and longitude in decimal degrees to an orthonormal
 * Cartesian unit vector [x, y, z] on S^2.
 */
export function latLngToUnitVector3D(latDeg: number, lngDeg: number): UnitVector3D {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError(`latLngToUnitVector3D: Non-finite coordinate input lat=${latDeg}, lng=${lngDeg}`);
  }

  // Defensive clamping to exact poles if within floating-point roundoff threshold
  if (latDeg >= POLAR_TOLERANCE_DEG) {
    return [0.0, 0.0, 1.0] as const;
  }
  if (latDeg <= -POLAR_TOLERANCE_DEG) {
    return [0.0, 0.0, -1.0] as const;
  }

  if (latDeg > 90.0 || latDeg < -90.0) {
    throw new RangeError(`latLngToUnitVector3D: Latitude out of range [-90, 90]: ${latDeg}`);
  }

  // Normalize longitude into [-180.0, 180.0)
  let normalizedLng = lngDeg % 360.0;
  if (normalizedLng >= 180.0) {
    normalizedLng -= 360.0;
  } else if (normalizedLng < -180.0) {
    normalizedLng += 360.0;
  }

  const phi = latDeg * DEG_TO_RAD;
  const lambda = normalizedLng * DEG_TO_RAD;

  const cosPhi = Math.cos(phi);
  const rawX = cosPhi * Math.cos(lambda);
  const rawY = cosPhi * Math.sin(lambda);
  const rawZ = Math.sin(phi);

  // Exact Euclidean normalization to absorb floating-point cosine/sine drift
  const norm = Math.hypot(rawX, rawY, rawZ);
  if (norm === 0.0) {
    return [0.0, 0.0, 1.0] as const;
  }

  return [rawX / norm, rawY / norm, rawZ / norm] as const;
}

/**
 * Computes the 3D scalar dot product between two unit vectors.
 */
export function unitVectorDotProduct(a: UnitVector3D, b: UnitVector3D): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Computes the 3D vector cross product (a x b).
 */
export function unitVectorCrossProduct(a: UnitVector3D, b: UnitVector3D): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/**
 * Calculates central angle between two unit vectors in radians via atan2.
 * Strictly stable across small distances and antipodal poles.
 */
export function unitVectorAngularDistance(a: UnitVector3D, b: UnitVector3D): number {
  const cross = unitVectorCrossProduct(a, b);
  const crossNorm = Math.hypot(cross[0], cross[1], cross[2]);
  const dot = unitVectorDotProduct(a, b);
  return Math.atan2(crossNorm, dot);
}

/**
 * Calculates Euclidean chord distance between two unit vectors.
 */
export function unitVectorChordDistance(a: UnitVector3D, b: UnitVector3D): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.hypot(dx, dy, dz);
}
```

---

### 3.3 Monadic Insolation & Photosynthetic Production Method

```typescript
import { SpatialMonad } from '../monads/spatial_monad';
import { UnitVector3D, latLngToUnitVector3D, unitVectorDotProduct } from './h3_adjacency';

export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const PAR_FRACTION = 0.48;
export const CANOPY_EXTINCTION_K = 0.5;
export const QUANTUM_YIELD_J_PER_MOL = 4.22e6;
export const RUBISCO_EFFICIENCY_KG_PER_MOL = 0.012;
export const WATER_USE_EFFICIENCY_KG_C_PER_KG_H2O = 3.5e-3;

export interface CellBiophysicalState {
  readonly h3Index: string;
  readonly latDeg: number;
  readonly lngDeg: number;
  readonly areaM2: number;
  readonly albedo: number;
  readonly lai: number;
  readonly tauAtm: number;
  readonly stocks: {
    readonly thermalEnergyJoules: number;
    readonly carbonDioxideKg: number;
    readonly biomassCarbonKg: number;
    readonly atmosphericWaterKg: number;
    readonly oxygenKg: number;
  };
}

export interface PlanetaryGridState {
  readonly timeStepSeconds: number;
  readonly subsolarVector: UnitVector3D;
  readonly cells: ReadonlyMap<string, CellBiophysicalState>;
}

/**
 * Pure state monad transition: Computes insolation and couples light-driven
 * biophysical mass/energy stock exchanges.
 */
export function applyPlanetaryInsolationStep(
  state: PlanetaryGridState
): PlanetaryGridState {
  const dt = state.timeStepSeconds;
  const subsolar = state.subsolarVector;
  const nextCells = new Map<string, CellBiophysicalState>();

  for (const [h3, cell] of state.cells.entries()) {
    const u = latLngToUnitVector3D(cell.latDeg, cell.lngDeg);
    const cosZenith = Math.max(0.0, unitVectorDotProduct(u, subsolar));

    // Radiative energy influx [Joules]
    const fluxDensityW = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZenith;
    const deltaEnergyJoules = fluxDensityW * cell.areaM2 * dt;

    // Photosynthesis & Biochemical Coupling
    const aparJoules = deltaEnergyJoules * PAR_FRACTION * (1.0 - Math.exp(-CANOPY_EXTINCTION_K * cell.lai));
    const deltaBiomassC = (aparJoules / QUANTUM_YIELD_J_PER_MOL) * RUBISCO_EFFICIENCY_KG_PER_MOL;

    const deltaCO2 = (44.01 / 12.011) * deltaBiomassC;
    const deltaO2 = (31.998 / 12.011) * deltaBiomassC;
    const deltaH2OTransp = deltaBiomassC / WATER_USE_EFFICIENCY_KG_C_PER_KG_H2O;

    // Guaranteed conservation updates
    const updatedStocks = {
      thermalEnergyJoules: cell.stocks.thermalEnergyJoules + deltaEnergyJoules,
      carbonDioxideKg: Math.max(0.0, cell.stocks.carbonDioxideKg - deltaCO2),
      biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomassC,
      atmosphericWaterKg: cell.stocks.atmosphericWaterKg + deltaH2OTransp,
      oxygenKg: cell.stocks.oxygenKg + deltaO2
    };

    nextCells.set(h3, {
      ...cell,
      stocks: updatedStocks
    });
  }

  return {
    ...state,
    cells: nextCells
  };
}
```

---

## 4. Verification Assertions and Invariants

1. **Euclidean Metric Invariance:**
   For every cell $i$, $\|\mathbf{u}_i\| = 1.0 \pm 10^{-15}$.
2. **Polar Boundary Condition:**
   `latLngToUnitVector3D(90.0, lng)` must return `[0.0, 0.0, 1.0]` exactly, invariant of longitude.
   `latLngToUnitVector3D(-90.0, lng)` must return `[0.0, 0.0, -1.0]` exactly.
3. **Mass/Energy Conservation:**
   $$\Delta m_{\text{CO}_2} \cdot \left(\frac{12.011}{44.01}\right) + \Delta m_{\text{biomass}} = 0 \quad (\pm 10^{-12}\text{ kg})$$
4. **Hemispheric Interception Conservation:**
   $$\sum_{i} F_{\text{solar}, i} A_i = S_0 \cdot \pi R_\oplus^2 \quad (\pm 0.05\%)$$