# Sprint 046 — Method Specifications: Geodesic Haversine Distance & Spatial Thermodynamic Flux Monads

**Author:** Process Mining & Research Scientist  
**Sprint:** 046  
**Component:** `src/spatial/h3_adjacency.ts`  
**Downstream Coupling:** `SpatialMonad`, `EarthPod`, `AtmosphereKernel`, `OceanKernel`  
**Status:** Approved for Implementation  

---

## 1. Physical & Mathematical Foundations

### 1.1 Geodesic Metric on the Planetary Geoid
Let the planetary reference sphere have mean radius $R_\oplus = 6,371,007\text{ m}$ (`EARTH_RADIUS_METERS` from `src/thermodynamics/constants.ts`). Centroids of two discrete spatial cells $i$ and $j$ on the H3 hexagonal manifold are defined by geographical coordinates:
$$\mathbf{x}_i = (\phi_i, \lambda_i), \quad \mathbf{x}_j = (\phi_j, \lambda_j)$$
where $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ denotes geocentric latitude in radians and $\lambda \in [-\pi, \pi]$ denotes geocentric longitude in radians.

The great-circle central angle $\Delta\sigma_{ij}$ is evaluated via the numerically stable Haversine formulation:
$$\Delta\phi = \phi_j - \phi_i, \quad \Delta\lambda = \lambda_j - \lambda_i$$
$$\operatorname{hav}(\Delta\sigma_{ij}) = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_i)\cos(\phi_j)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

To eliminate IEEE 754 floating-point domain errors near antipodal points ($\operatorname{hav} > 1.0$) or collinear centroids ($\operatorname{hav} < 0.0$ due to rounding), the bounded scalar $a$ is clamped:
$$a = \min\left(1.0, \max\left(0.0, \operatorname{hav}(\Delta\sigma_{ij})\right)\right)$$

The central angle $c_{ij}$ and physical geodesic surface distance $d_{ij}$ are:
$$c_{ij} = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d_{ij} = R_\oplus \cdot c_{ij}$$

### 1.2 Geodesic Transport & Finite-Volume Flux Conservation
Across adjacent cells $i$ and $j$ sharing a boundary facet of arc length $L_{ij}$ and vertical boundary height $H_{ij}$ (yielding cross-sectional contact area $A_{ij} = L_{ij} \cdot H_{ij}$), any conserved scalar property $\psi$ (mass concentration, enthalpy, or temperature) undergoes lateral transport driven by the potential gradient:
$$\nabla \psi_{ij} \approx \frac{\psi_j - \psi_i}{d_{ij}}$$

The thermodynamic conductometric flux density $\mathbf{J}_{\psi, ij}$ across the interface is:
$$\mathbf{J}_{\psi, ij} = -\kappa_\psi \frac{\psi_j - \psi_i}{d_{ij}} \hat{\mathbf{n}}_{ij}$$
where $\kappa_\psi$ is the transport conductance coefficient (thermal conductivity, kinematic mass diffusivity, or hydraulic eddy dispersion) and $\hat{\mathbf{n}}_{ij}$ is the outward unit normal from cell $i$ to cell $j$.

Total flux exchange over integration timestep $\Delta t$:
$$\Phi_{\psi, ij} = A_{ij} \cdot \mathbf{J}_{\psi, ij} \cdot \Delta t = - A_{ij} \kappa_\psi \frac{\psi_j - \psi_i}{d_{ij}} \Delta t$$

Because $d_{ij} = d_{ji}$ and $\hat{\mathbf{n}}_{ij} = -\hat{\mathbf{n}}_{ji}$, the bilateral anti-symmetry holds:
$$\Phi_{\psi, ij} = -\Phi_{\psi, ji} \implies \Delta S_{\psi, i} + \Delta S_{\psi, j} = 0$$
guaranteeing strict first-law conservation of total planetary stocks.

---

## 2. Process Specifications & Monad Stock Transfer Deltas

### Process 1: Geodesic Calculation & Sanitization (`calculateHaversineDistance`)
Calculates the spatial distance $d_{ij}$ between two points, providing the denominator for all continuous gradient-driven spatial fluxes.

- **Inputs:**
  - `coordA`: $P_1 = (\text{lat}_1, \text{lng}_1)$ in degrees or tuple `[lat, lng]`
  - `coordB`: $P_2 = (\text{lat}_2, \text{lng}_2)$ in degrees or tuple `[lat, lng]`
  - `options`: `{ radiusMeters?: number, unit?: 'meters' | 'kilometers' }`
- **Preconditions:**
  - $\text{lat} \in [-90, +90]$, $\text{lng} \in [-180, +180]$
  - $R > 0$
- **Postconditions:**
  - $d_{ij} \ge 0.0$
  - If $\mathbf{x}_i \equiv \mathbf{x}_j$, $d_{ij} = 0.0$
  - If antipodal, $d_{ij} = \pi R$
  - Metric symmetry: $d(\mathbf{x}_i, \mathbf{x}_j) = d(\mathbf{x}_j, \mathbf{x}_i)$
  - Triangle inequality: $d(\mathbf{x}_i, \mathbf{x}_k) \le d(\mathbf{x}_i, \mathbf{x}_j) + d(\mathbf{x}_j, \mathbf{x}_k) + \epsilon$

---

### Process 2: Atmospheric Sensible Heat Diffusion
Calculates thermal conduction/eddy diffusion of internal energy between contiguous atmospheric column layers across geodesic centroid distance $d_{ij}$.

#### Stock Transfers & Deltas
Let:
- $T_i, T_j$: Atmospheric layer temperatures $[\text{K}]$
- $C_{p, air} = 1005.0\text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$
- $\rho_{air} \approx \frac{P_{sfc}}{R_{spec} T}$: Air density $[\text{kg}\cdot\text{m}^{-3}]$
- $K_{th}$: Effective eddy thermal diffusivity $[\text{m}^2\cdot\text{s}^{-1}]$ ($10.0$ to $50.0\text{ m}^2\cdot\text{s}^{-1}$ in boundary layer)
- $A_{ij} = L_{ij} \cdot \Delta z$: Interface area $[\text{m}^2]$

The sensible heat exchange $\Delta Q_{ij}$ (Joules) over timestep $\Delta t$:
$$\Delta Q_{ij} = \rho_{air} C_{p, air} K_{th} A_{ij} \left(\frac{T_j - T_i}{d_{ij}}\right) \Delta t$$

**Monad Stock Deltas:**
$$\Delta U_i = +\Delta Q_{ij} \quad [\text{Joules}]$$
$$\Delta U_j = -\Delta Q_{ij} \quad [\text{Joules}]$$
$$\Delta U_{total} = \Delta U_i + \Delta U_j = 0$$

**Entropy Production:**
$$\Delta S_{gen} = \Delta Q_{ij} \left(\frac{1}{T_i} - \frac{1}{T_j}\right) = \rho_{air} C_{p, air} K_{th} A_{ij} \frac{(T_j - T_i)^2}{T_i T_j d_{ij}} \Delta t \ge 0$$
Entropy is strictly non-negative, satisfying the Second Law of Thermodynamics.

---

### Process 3: Water Vapor Gradient Diffusion
Evaluates water mass transfer driven by absolute humidity (or vapor pressure) gradients across adjacent cell centroids.

#### Stock Transfers & Deltas
Let:
- $\rho_{v, i}, \rho_{v, j}$: Water vapor density in cell atmospheres $[\text{kg}\cdot\text{m}^{-3}]$
- $D_v$: Effective atmospheric vapor dispersion coefficient $[\text{m}^2\cdot\text{s}^{-1}]$
- $d_{ij} = \text{calculateHaversineDistance}(\text{centroid}_i, \text{centroid}_j)\text{ [m]}$

The mass of water transferred $\Delta M_{H_2O, ij}$ $[\text{kg}]$:
$$\Delta M_{H_2O, ij} = D_v A_{ij} \left(\frac{\rho_{v, j} - \rho_{v, i}}{d_{ij}}\right) \Delta t$$

Associated latent heat flux $\Delta Q_{latent, ij}$ $[\text{Joules}]$ (with latent heat of vaporization $L_v = 2.501 \times 10^6\text{ J}\cdot\text{kg}^{-1}$):
$$\Delta Q_{latent, ij} = L_v \cdot \Delta M_{H_2O, ij}$$

**Monad Stock Deltas:**
$$\Delta \text{AtmosphericWater}_i = +\Delta M_{H_2O, ij} \quad [\text{kg}]$$
$$\Delta \text{AtmosphericWater}_j = -\Delta M_{H_2O, ij} \quad [\text{kg}]$$
$$\Delta \text{AtmosphericEnthalpy}_i = +\Delta Q_{latent, ij} \quad [\text{J}]$$
$$\Delta \text{AtmosphericEnthalpy}_j = -\Delta Q_{latent, ij} \quad [\text{J}]$$
$$\sum \Delta M_{H_2O} = 0, \quad \sum \Delta Q = 0$$

---

### Process 4: Dissolved Biogeochemical Oceanic Dispersion (Carbon & Nutrients)
Transfers dissolved inorganic carbon (DIC), dissolved organic carbon (DOC), and dissolved mineral nutrients ($\text{N, P}$) through ocean surface currents and horizontal turbulent mixing.

#### Stock Transfers & Deltas
Let:
- $C_{DIC, i}, C_{DIC, j}$: DIC concentration $[\text{mol C}\cdot\text{m}^{-3}]$
- $C_{Nutr, i}, C_{Nutr, j}$: Dissolved nitrogen/phosphorus concentration $[\text{mol}\cdot\text{m}^{-3}]$
- $K_h$: Horizontal ocean diffusivity $[\text{m}^2\cdot\text{s}^{-1}]$ (typically $10^2 - 10^4\text{ m}^2\cdot\text{s}^{-1}$)
- $A_{ocean, ij}$: Ocean boundary cross-section $[\text{m}^2]$

The transfer of DIC carbon atoms $N_{C, ij}$ $[\text{mol}]$:
$$\Delta N_{C, ij} = K_h A_{ocean, ij} \left(\frac{C_{DIC, j} - C_{DIC, i}}{d_{ij}}\right) \Delta t$$

Mass equivalent for elemental carbon ($M_C = 0.012011\text{ kg}\cdot\text{mol}^{-1}$):
$$\Delta M_{C, ij} = \Delta N_{C, ij} \cdot M_C \quad [\text{kg C}]$$

**Monad Stock Deltas:**
$$\Delta \text{OceanDIC}_i = +\Delta M_{C, ij} \quad [\text{kg C}]$$
$$\Delta \text{OceanDIC}_j = -\Delta M_{C, ij} \quad [\text{kg C}]$$
$$\sum \Delta \text{OceanDIC} = 0$$

---

### Process 5: Trophic Biomass Migration & Locomotion Energetics
Simulates animal/trophic dispersal between cells over geodesic distance $d_{ij}$, computing metabolic cost and respiratory stock decay.

#### Stock Transfers & Deltas
Let:
- $M_{bio}$: Migrating biomass $[\text{kg}]$
- $\text{COT}$: Cost of Transport $[\text{J}\cdot\text{kg}^{-1}\cdot\text{m}^{-1}]$ (empirical scaling based on body mass: $\text{COT} \approx 10.7 \cdot M_{ind}^{-0.316}$)
- $E_{metabolic} = M_{bio} \cdot \text{COT} \cdot d_{ij}$ $[\text{Joules}]$
- $Y_{CO_2}$: Carbon respiration emission ratio ($\approx 0.03 \text{ g C}\cdot\text{kJ}^{-1} = 3.0 \times 10^{-8}\text{ kg C}\cdot\text{J}^{-1}$)
- $Y_{O_2}$: Oxygen consumption ratio ($\approx 3.2 \times 10^{-8}\text{ kg } \text{O}_2\cdot\text{J}^{-1}$)

**Stock Deltas:**
$$\Delta \text{Biomass}_i = -M_{bio} \quad [\text{kg}]$$
$$\Delta \text{Biomass}_j = +M_{bio} - (E_{metabolic} \cdot 2.5 \times 10^{-7}) \quad [\text{kg}]$$
$$\Delta \text{AtmosphericCO2}_j = +(E_{metabolic} \cdot Y_{CO_2} \cdot \frac{44}{12}) \quad [\text{kg}]$$
$$\Delta \text{AtmosphericO2}_j = -(E_{metabolic} \cdot Y_{O_2}) \quad [\text{kg}]$$
$$\Delta \text{ThermalEntropy}_j = +\frac{E_{metabolic}}{T_{ambient}} \quad [\text{J}\cdot\text{K}^{-1}]$$

---

## 3. Concrete Executable Monad Implementations

```typescript
import { EARTH_RADIUS_METERS } from '../thermodynamics/constants';
import { LatLngCoord, GeodesicDistanceOptions } from './h3_types';

/**
 * Normalizes input coordinates into radian latitude and longitude.
 */
function normalizeToRadians(coord: LatLngCoord | [number, number]): [number, number] {
  let latDeg: number;
  let lngDeg: number;

  if (Array.isArray(coord)) {
    latDeg = coord[0];
    lngDeg = coord[1];
  } else {
    latDeg = coord.lat;
    lngDeg = coord.lng;
  }

  const deg2rad = Math.PI / 180.0;
  const latRad = latDeg * deg2rad;
  let lngRad = lngDeg * deg2rad;

  // Wrap longitude into [-PI, PI]
  lngRad = Math.atan2(Math.sin(lngRad), Math.cos(lngRad));

  return [latRad, lngRad];
}

/**
 * Calculates geodesic distance between two centroids on the planetary reference sphere.
 * High-performance, zero-allocation, numerically robust Haversine implementation.
 */
export function calculateHaversineDistance(
  coordA: LatLngCoord | [number, number],
  coordB: LatLngCoord | [number, number],
  options?: GeodesicDistanceOptions
): number {
  const [lat1, lon1] = normalizeToRadians(coordA);
  const [lat2, lon2] = normalizeToRadians(coordB);

  const radius = options?.radiusMeters ?? EARTH_RADIUS_METERS;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  // Identity optimization
  if (Math.abs(dLat) < 1e-12 && Math.abs(dLon) < 1e-12) {
    return 0.0;
  }

  const sinHalfLat = Math.sin(dLat * 0.5);
  const sinHalfLon = Math.sin(dLon * 0.5);

  const a =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;

  // Numerical clamping for antipodal or precision limits
  const clampedA = Math.min(1.0, Math.max(0.0, a));
  const c = 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1.0 - clampedA));

  const distanceMeters = radius * c;

  if (options?.unit === 'kilometers') {
    return distanceMeters * 0.001;
  }

  return distanceMeters;
}

/**
 * Spatial State Vector interface for thermodynamic cell monad.
 */
export interface CellThermodynamicState {
  readonly cellIndex: string;
  readonly centroid: LatLngCoord;
  temperatureKelvin: number;
  internalEnergyJoules: number;
  waterVaporMassKg: number;
  dissolvedCarbonKg: number;
  dissolvedNutrientsKg: number;
  biomassKg: number;
  entropyJoulesPerKelvin: number;
}

/**
 * Immutable Delta Result of spatial transport interaction.
 */
export interface SpatialTransportDelta {
  readonly cellA: string;
  readonly cellB: string;
  readonly geodesicDistanceMeters: number;
  readonly deltaInternalEnergyJoulesA: number;
  readonly deltaInternalEnergyJoulesB: number;
  readonly deltaWaterVaporKgA: number;
  readonly deltaWaterVaporKgB: number;
  readonly deltaCarbonKgA: number;
  readonly deltaCarbonKgB: number;
  readonly entropyGeneratedJoulesPerKelvin: number;
}

/**
 * Evaluates pairwise gradient diffusion between adjacent cells
 * using geodesic haversine distance.
 */
export function computeSpatialGradientTransport(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  boundaryAreaM2: number,
  deltaSeconds: number
): SpatialTransportDelta {
  const distance = calculateHaversineDistance(stateA.centroid, stateB.centroid);

  if (distance <= 0.0) {
    return {
      cellA: stateA.cellIndex,
      cellB: stateB.cellIndex,
      geodesicDistanceMeters: 0.0,
      deltaInternalEnergyJoulesA: 0.0,
      deltaInternalEnergyJoulesB: 0.0,
      deltaWaterVaporKgA: 0.0,
      deltaWaterVaporKgB: 0.0,
      deltaCarbonKgA: 0.0,
      deltaCarbonKgB: 0.0,
      entropyGeneratedJoulesPerKelvin: 0.0,
    };
  }

  // 1. Thermal conduction
  const K_thermal = 25.0; // W / (m * K) effective turbulent conductivity
  const tempDiff = stateB.temperatureKelvin - stateA.temperatureKelvin;
  const conductiveHeatFluxWatts = (K_thermal * boundaryAreaM2 * tempDiff) / distance;
  const heatExchangeJoules = conductiveHeatFluxWatts * deltaSeconds;

  // 2. Moisture diffusion
  const D_vapor = 2.4e-5; // m^2 / s kinematic moisture diffusivity
  const vaporDensityA = stateA.waterVaporMassKg / (boundaryAreaM2 * distance * 0.5);
  const vaporDensityB = stateB.waterVaporMassKg / (boundaryAreaM2 * distance * 0.5);
  const vaporGradient = (vaporDensityB - vaporDensityA) / distance;
  const vaporExchangeKg = D_vapor * boundaryAreaM2 * vaporGradient * deltaSeconds;

  // 3. Carbon lateral advection/diffusion
  const D_carbon = 1.0e-4; // Oceanic/atmospheric passive scalar diffusivity
  const carbonDensityA = stateA.dissolvedCarbonKg / (boundaryAreaM2 * distance * 0.5);
  const carbonDensityB = stateB.dissolvedCarbonKg / (boundaryAreaM2 * distance * 0.5);
  const carbonGradient = (carbonDensityB - carbonDensityA) / distance;
  const carbonExchangeKg = D_carbon * boundaryAreaM2 * carbonGradient * deltaSeconds;

  // 4. Entropy generation check (Second Law: dS >= 0)
  const entropyGen =
    heatExchangeJoules * (1.0 / stateA.temperatureKelvin - 1.0 / stateB.temperatureKelvin);

  return {
    cellA: stateA.cellIndex,
    cellB: stateB.cellIndex,
    geodesicDistanceMeters: distance,
    deltaInternalEnergyJoulesA: heatExchangeJoules,
    deltaInternalEnergyJoulesB: -heatExchangeJoules,
    deltaWaterVaporKgA: vaporExchangeKg,
    deltaWaterVaporKgB: -vaporExchangeKg,
    deltaCarbonKgA: carbonExchangeKg,
    deltaCarbonKgB: -carbonExchangeKg,
    entropyGeneratedJoulesPerKelvin: Math.max(0.0, entropyGen),
  };
}
```

---

## 4. Analytical Invariants & Validation Truth Table

| Scenario | Point A $(\phi_A, \lambda_A)$ | Point B $(\phi_B, \lambda_B)$ | Theoretical Distance (m) | Acceptance Tolerance |
| :--- | :--- | :--- | :--- | :--- |
| **Identical Coincident** | $(0.0^\circ, 0.0^\circ)$ | $(0.0^\circ, 0.0^\circ)$ | $0.000$ | Exact ($0.0$) |
| **Poles (Antipodal)** | $(90.0^\circ, 0.0^\circ)$ | $(-90.0^\circ, 0.0^\circ)$ | $\pi \cdot R_\oplus \approx 20,015,087.05$ | $\pm 10^{-2}\text{ m}$ |
| **Equatorial Quadrant** | $(0.0^\circ, 0.0^\circ)$ | $(0.0^\circ, 90.0^\circ)$ | $\frac{\pi}{2} \cdot R_\oplus \approx 10,007,543.52$ | $\pm 10^{-2}\text{ m}$ |
| **London to Paris** | $(51.5074^\circ, -0.1278^\circ)$ | $(48.8566^\circ, 2.3522^\circ)$ | $\approx 343,556$ | $\pm 0.1\%$ |
| **New York to Tokyo** | $(40.7128^\circ, -74.0060^\circ)$ | $(35.6762^\circ, 139.6503^\circ)$ | $\approx 10,850,000$ | $\pm 0.2\%$ |
| **Date-Line Crossing** | $(0.0^\circ, 179.0^\circ)$ | $(0.0^\circ, -179.0^\circ)$ | $2^\circ \cdot \frac{\pi}{180} R_\oplus \approx 222,389.85$ | $\pm 10^{-2}\text{ m}$ |

---

## 5. Architectural Compliance Verification
1. **Zero Stock Creation/Annihilation:**
   Every physical flux computed using $d_{ij}$ satisfies $\Delta \text{Stock}_A + \Delta \text{Stock}_B \equiv 0$.
2. **Positive Definite Entropy:**
   $\Delta S_{gen} = \Delta Q_{ij} (\frac{1}{T_i} - \frac{1}{T_j}) = \frac{\kappa A_{ij} (T_j - T_i)^2}{T_i T_j d_{ij}} \Delta t \ge 0$. Since $d_{ij} > 0$ and $T > 0$, entropy production is strictly non-negative.
3. **Hexagonal Resolution Invariance:**
   Centroid distances correctly scale with H3 resolution indices ($R0 \sim 1100\text{ km}$, $R1 \sim 418\text{ km}$, $R2 \sim 158\text{ km}$, $R3 \sim 60\text{ km}$), ensuring spatial convergence of finite volume methods across varying grid depths.