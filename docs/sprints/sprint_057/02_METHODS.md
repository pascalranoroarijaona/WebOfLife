# Sprint 057 — Process Formalization & Method Specifications
**Geodesic Azimuth Vectorization: Forward Spherical Arc Bearing for Directional Advective Transport**

---

## 1. Physical & Geophysical Process Overview

In planetary-scale biosphere and Earth system modeling, horizontal transport of conserved thermodynamic quantities—such as atmospheric greenhouse gases, water vapor, marine dissolved nutrients, biological diaspores (spores, seeds), and trophic biomass—occurs along continuous fluid vector fields projected onto the Earth's curved oblate/spherical geometry.

Planar flat-grid approximations (e.g., standard Cartesian grids or local Euclidean tangents) introduce geometric distortions that diverge significantly at high latitudes, near the poles, and across the antimeridian ($\pm 180^\circ$ longitude). Sprint 057 formalizes the forward geodesic initial azimuth operator on the WGS84 mean reference sphere ($R_\oplus = 6,371,008.8\text{ m}$), coupling discrete H3 hexagonal cell partitions to continuous directional advection equations.

```
       Local Meridian (North)
              ^
              |  \
              |   \  Forward Geodesic Arc
              |    \
              | θ   v
      Cell i (Origin) ------------> Cell j (Neighbor Centroid)
              \                 /
               \               /
                \             /
                 \           /
             Edge Boundary L_ij
```

---

## 2. Mathematical Formalism of Spherical Geodesic Kinematics

### 2.1 Forward Initial Azimuth Operator

Let an origin centroid $A = (\phi_1, \lambda_1)$ and a target centroid $B = (\phi_2, \lambda_2)$ be specified in geodetic latitude $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ and longitude $\lambda \in [-\pi, \pi]$ (radians).

The longitudinal difference with canonical periodic wrapping is:
$$\Delta\lambda = \operatorname{wrap}_{[-\pi, \pi]}(\lambda_2 - \lambda_1) = \operatorname{atan2}\left(\sin(\lambda_2 - \lambda_1), \cos(\lambda_2 - \lambda_1)\right)$$

The forward initial azimuth $\theta \in [0, 2\pi)$ measured clockwise from True North is derived from the spherical law of cotangents and sines:
$$y = \sin(\Delta\lambda) \cdot \cos(\phi_2)$$
$$x = \cos(\phi_1) \cdot \sin(\phi_2) - \sin(\phi_1) \cdot \cos(\phi_2) \cdot \cos(\Delta\lambda)$$

$$\theta_{\text{raw}} = \operatorname{atan2}(y, x)$$
$$\theta = (\theta_{\text{raw}} + 2\pi) \pmod{2\pi}$$

### 2.2 Local Tangent Basis & Directional Unit Vector

The forward azimuth translates directly into the local orthonormal tangent plane $({\hat{\mathbf{e}}}_{\text{East}}, {\hat{\mathbf{e}}}_{\text{North}})$ centered at origin $A$:
$${\hat{\mathbf{n}}}_{ij} = \begin{bmatrix} u_{\text{East}} \\ v_{\text{North}} \end{bmatrix} = \begin{bmatrix} \sin(\theta) \\ \cos(\theta) \end{bmatrix}$$

Where:
$$\|{\hat{\mathbf{n}}}_{ij}\|_2 = \sqrt{\sin^2(\theta) + \cos^2(\theta)} = 1.0$$

### 2.3 Great Circle Arc Separation (Vincenty-Haversine Sphere)

The central angular distance $\sigma_{ij} \in [0, \pi]$ and metric geodesic length $d_{ij}$ are:
$$\Delta\phi = \phi_2 - \phi_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$\sigma_{ij} = 2 \cdot \operatorname{atan2}\left(\sqrt{\operatorname{clamp}(a, 0, 1)}, \sqrt{\operatorname{clamp}(1 - a, 0, 1)}\right)$$
$$d_{ij} = R_\oplus \cdot \sigma_{ij}$$

---

## 3. Directional Advection & Monadic Thermodynamic Stock Transfers

### 3.1 Conserved Thermodynamic State Vector

Each H3 spatial partition $i$ maintains a conserved extensive thermodynamic stock state vector $\mathbf{S}_i$:
$$\mathbf{S}_i = \begin{bmatrix} M_{C, i} \\ M_{H_2O, i} \\ M_{min, i} \\ M_{O_2, i} \\ U_i \end{bmatrix} \quad \begin{matrix} \text{[mol C]} & \text{Total carbon stock (organic + inorganic)} \\ \text{[kg } H_2O\text{]} & \text{Hydrological stock (vapor + liquid)} \\ \text{[kg]} & \text{Mineral/nutrient aerosol/solute stock} \\ \text{[mol } O_2\text{]} & \text{Free oxygen stock} \\ \text{[J]} & \text{Internal thermal energy stock} \end{matrix}$$

### 3.2 Geodesic Advection Tensor Formulation

Given a local velocity vector $\mathbf{v}_i = (u_{\text{wind}}, v_{\text{wind}})$ in $\text{m}\cdot\text{s}^{-1}$ at cell $i$, the projected normal velocity across the directed geodesic interface to adjacent cell $j \in \mathcal{N}(i)$ is:
$$v_{n, ij} = \mathbf{v}_i \cdot {\hat{\mathbf{n}}}_{ij} = u_{\text{wind}} \sin(\theta_{ij}) + v_{\text{wind}} \cos(\theta_{ij})$$

Outward advective transport requires $v_{n, ij} > 0$. The geometric routing flux coefficient $k_{ij}$ over simulation step $\Delta t$ across boundary edge length $L_{ij}$ and source cell area $A_i$ is defined via the Courant–Friedrichs–Lewy (CFL) constrained finite-volume formulation:
$$k_{ij} = \max\left(0, \frac{v_{n, ij} \cdot L_{ij} \cdot \Delta t}{A_i}\right)$$

To ensure stability and non-negative mass states:
$$\sum_{j \in \mathcal{N}(i)} k_{ij} \le 1 - \epsilon_{\text{stability}}, \quad \text{where } \epsilon_{\text{stability}} = 10^{-9}$$

If $\sum_j k_{ij} > 1$, the coefficients are normalized:
$$k_{ij}^* = \frac{k_{ij}}{\sum_{m \in \mathcal{N}(i)} k_{im}} \cdot (1 - \epsilon_{\text{stability}})$$

### 3.3 Stock Transfer Delta Equations

For every directed edge $i \to j$:

$$\Delta M_{C, i \to j} = k_{ij}^* \cdot M_{C, i}$$
$$\Delta M_{H_2O, i \to j} = k_{ij}^* \cdot M_{H_2O, i}$$
$$\Delta M_{min, i \to j} = k_{ij}^* \cdot M_{min, i}$$
$$\Delta M_{O_2, i \to j} = k_{ij}^* \cdot M_{O_2, i}$$
$$\Delta U_{i \to j} = k_{ij}^* \cdot U_i$$

### 3.4 State Update Monad Equations

The updated stock vector $\mathbf{S}'_i$ at time $t + \Delta t$ satisfies:
$$\mathbf{S}'_i = \mathbf{S}_i - \sum_{j \in \mathcal{N}(i)} \mathbf{\Phi}_{i \to j} + \sum_{m: i \in \mathcal{N}(m)} \mathbf{\Phi}_{m \to i}$$

Where flux vector $\mathbf{\Phi}_{i \to j} = [\Delta M_{C, i \to j}, \Delta M_{H_2O, i \to j}, \Delta M_{min, i \to j}, \Delta M_{O_2, i \to j}, \Delta U_{i \to j}]^T$.

---

## 4. Thermodynamic Law Auditing & Invariants

### 4.1 First Law Compliance (Conservation of Mass and Energy)

For the closed planetary system over all cells $\mathcal{C}$:
$$\sum_{i \in \mathcal{C}} \Delta \mathbf{S}_i = \sum_{i \in \mathcal{C}} \left( - \sum_{j \in \mathcal{N}(i)} \mathbf{\Phi}_{i \to j} + \sum_{m: i \in \mathcal{N}(m)} \mathbf{\Phi}_{m \to i} \right) = \mathbf{0}$$

Exact floating-point balance verification:
$$\left| \sum_{i \in \mathcal{C}} \mathbf{S}'_i - \sum_{i \in \mathcal{C}} \mathbf{S}_i \right| < 10^{-12} \cdot \sum_{i \in \mathcal{C}} \mathbf{S}_i$$

### 4.2 Second Law Compliance (Non-Negative Entropy Production)

Advection coupled with boundary shear and temperature differentials generates thermal entropy:
$$\Delta S_{\text{entropy}} = \sum_{\langle i, j \rangle} \Delta U_{i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) + \frac{D_{\text{shear}}}{T_{\text{avg}}} \ge 0$$
Where $D_{\text{shear}} \ge 0$ is viscous dissipation along geodesic shears. Geodesic bearings guarantee that directional flux flows strictly down total hydrodynamic head gradients in laminar regimes, preventing reversed unphysical negative entropy states.

---

## 5. Numerical Guardrails & Boundary Handling

| Edge Case | Condition | Mathematical Handling | Programmatic Guardrail |
|---|---|---|---|
| **Coincident Centroids** | $\sigma_{ij} < 10^{-12}$ | Bearing is undefined ($0/0$). | Return azimuth `0.0`, distance `0.0`, unit vector `(0.0, 1.0)`. |
| **North Pole Origin** | $\phi_1 \ge \frac{\pi}{2} - 10^{-9}$ | All geodesics move South. | Return azimuth $\pi$ ($180^\circ$), unit vector `(0.0, -1.0)`. |
| **South Pole Origin** | $\phi_1 \le -\frac{\pi}{2} + 10^{-9}$ | All geodesics move North. | Return azimuth `0.0` ($0^\circ$), unit vector `(0.0, 1.0)`. |
| **Antipodal Points** | $\sigma_{ij} \ge \pi - 10^{-9}$ | Infinite geodesics exist. | Deterministically select meridian azimuth `0.0` or $\pi$ based on latitude sign. |
| **Antimeridian Crossing** | $|\lambda_2 - \lambda_1| > \pi$ | Discontinuity in longitude. | Normalize $\Delta\lambda \in [-\pi, \pi]$ using `atan2(sin, cos)`. |
| **Trigonometric Overflow** | $|x| > 1.0$ in `asin`/`acos` | Numerical precision drift. | Clamping via `Math.min(1.0, Math.max(-1.0, val))`. |

---

## 6. Monad Method Executable Specifications

### 6.1 `computeSphericalArcBearing`
Calculates the forward geodesic initial azimuth in radians, canonicalized to $[0, 2\pi)$.

```typescript
export interface LatLngPoint {
  readonly lat: number; // Degrees [-90, 90]
  readonly lng: number; // Degrees [-180, 180]
}

export function computeSphericalArcBearing(
  origin: LatLngPoint,
  destination: LatLngPoint
): number {
  const DEG2RAD = Math.PI / 180;
  const EPSILON = 1e-11;

  const lat1 = origin.lat * DEG2RAD;
  const lon1 = origin.lng * DEG2RAD;
  const lat2 = destination.lat * DEG2RAD;
  const lon2 = destination.lng * DEG2RAD;

  // Polar singularity handling
  if (lat1 >= Math.PI / 2 - EPSILON) {
    return Math.PI; // Heading South from North Pole
  }
  if (lat1 <= -Math.PI / 2 + EPSILON) {
    return 0.0; // Heading North from South Pole
  }

  const dLon = Math.atan2(Math.sin(lon2 - lon1), Math.cos(lon2 - lon1));

  // Coincident points
  if (Math.abs(lat1 - lat2) < EPSILON && Math.abs(dLon) < EPSILON) {
    return 0.0;
  }

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const rawBearing = Math.atan2(y, x);
  const bearingRad = (rawBearing + 2 * Math.PI) % (2 * Math.PI);

  return bearingRad;
}
```

### 6.2 `computeDetailedBearing`
Returns azimuth (rad/deg), geodesic distance (m), and directional normal tangent unit vectors.

```typescript
export interface GeodesicBearingResult {
  readonly initialAzimuthRad: number;
  readonly initialAzimuthDeg: number;
  readonly distanceMeters: number;
  readonly unitVector: {
    readonly uEast: number;
    readonly vNorth: number;
  };
}

export function computeDetailedBearing(
  origin: LatLngPoint,
  destination: LatLngPoint
): GeodesicBearingResult {
  const R_EARTH = 6371008.8; // WGS-84 Mean Earth Radius in meters
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  const azimuthRad = computeSphericalArcBearing(origin, destination);
  const azimuthDeg = (azimuthRad * RAD2DEG) % 360;

  const lat1 = origin.lat * DEG2RAD;
  const lon1 = origin.lng * DEG2RAD;
  const lat2 = destination.lat * DEG2RAD;
  const lon2 = destination.lng * DEG2RAD;

  const dLat = lat2 - lat1;
  const dLon = Math.atan2(Math.sin(lon2 - lon1), Math.cos(lon2 - lon1));

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) ** 2);
  const clampedA = Math.min(1.0, Math.max(0.0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0.0, 1 - clampedA)));
  const distanceMeters = R_EARTH * c;

  return {
    initialAzimuthRad: azimuthRad,
    initialAzimuthDeg: azimuthDeg,
    distanceMeters,
    unitVector: {
      uEast: Math.sin(azimuthRad),
      vNorth: Math.cos(azimuthRad)
    }
  };
}
```

### 6.3 Monadic Conserved Stock Advection Step

```typescript
export interface SpatialHexCell {
  readonly h3Index: string;
  readonly centroid: LatLngPoint;
  readonly areaM2: number;
  stocks: {
    carbonMol: number;
    waterKg: number;
    mineralsKg: number;
    oxygenMol: number;
    internalEnergyJoules: number;
  };
}

export function computeAdvectiveTransfer(
  source: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  windVector: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, typeof source.stocks> {
  const transfers = new Map<string, typeof source.stocks>();
  const rawK = new Map<string, number>();
  let sumK = 0.0;

  for (const { cell: neighbor, edgeLengthMeters } of neighbors) {
    const bearing = computeDetailedBearing(source.centroid, neighbor.centroid);
    const vNormal = windVector.uEast * bearing.unitVector.uEast +
                    windVector.vNorth * bearing.unitVector.vNorth;

    if (vNormal > 0) {
      const k = (vNormal * edgeLengthMeters * dtSeconds) / source.areaM2;
      rawK.set(neighbor.h3Index, k);
      sumK += k;
    } else {
      rawK.set(neighbor.h3Index, 0);
    }
  }

  // CFL Guardrail
  const scale = sumK > (1 - 1e-9) ? (1 - 1e-9) / sumK : 1.0;

  for (const { cell: neighbor } of neighbors) {
    const kEffective = (rawK.get(neighbor.h3Index) ?? 0) * scale;
    transfers.set(neighbor.h3Index, {
      carbonMol: source.stocks.carbonMol * kEffective,
      waterKg: source.stocks.waterKg * kEffective,
      mineralsKg: source.stocks.mineralsKg * kEffective,
      oxygenMol: source.stocks.oxygenMol * kEffective,
      internalEnergyJoules: source.stocks.internalEnergyJoules * kEffective
    });
  }

  return transfers;
}
```

---

## 7. Verification Invariant Summary

1. **Orthogonal Azimuth Precision**: Azimuth calculations across cardinal and intermediate axes must match analytical values within $\Delta \theta < 10^{-12}\text{ rad}$.
2. **Mass-Energy Closure**: $\sum_i \Delta \mathbf{S}_i = \mathbf{0}$ to within machine precision tolerance $\varepsilon \le 10^{-14}$.
3. **CFL Condition**: $\Delta t \le \min_i \left( \frac{A_i}{\|\mathbf{v}_i\| \sum_j L_{ij}} \right)$, guaranteeing non-negative residual stock concentrations.