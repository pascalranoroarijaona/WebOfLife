# Sprint 065 Methods Specification: 3D Boundary Centroid Displacement & Directional Flux Transport

**Author**: Process Mining & Research Scientist  
**Sprint**: 065  
**Component**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/thermodynamics/`  
**Status**: Ready for Implementation  

---

## 1. Physical & Mathematical Foundations

### 1.1 Geocentric Spherical-to-Cartesian Mapping ($S^2 \to \mathbb{R}^3$)
Let Earth be approximated as a unit sphere $S^2 \subset \mathbb{R}^3$ with mean volumetric radius $R_{\oplus} = 6.3710088 \times 10^6 \text{ m}$. Coordinates on the planetary manifold are parameterized by geodetic latitude $\phi \in [-\pi/2, \pi/2]$ and longitude $\lambda \in [-\pi, \pi]$:

$$\mathbf{r}(\phi, \lambda) = \begin{bmatrix} x \\ y \\ z \end{bmatrix} = \begin{bmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{bmatrix}$$

For numerical execution, input angles $(\text{lat}, \text{lng})$ in decimal degrees are converted to radians:
$$\phi = \text{lat} \times \frac{\pi}{180}, \quad \lambda = \text{lng} \times \frac{\pi}{180}$$

### 1.2 3D Chord Displacement Vector & Unit Normalization
Given origin centroid $C_1 = (\phi_1, \lambda_1)$ and target centroid $C_2 = (\phi_2, \lambda_2)$, their corresponding Cartesian unit position vectors are $\mathbf{r}_1$ and $\mathbf{r}_2$.

The 3D Euclidean displacement vector pointing from $C_1$ to $C_2$ is:
$$\vec{\Delta}_{12} = \mathbf{r}_2 - \mathbf{r}_1 = \begin{bmatrix} x_2 - x_1 \\ y_2 - y_1 \\ z_2 - z_1 \end{bmatrix}$$

The Euclidean chord distance on the unit sphere is:
$$d_{\text{chord}} = \|\vec{\Delta}_{12}\|_2 = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}$$

The physical chord distance in meters is:
$$D_{\text{chord}} = R_{\oplus} \cdot d_{\text{chord}}$$

The normalized 3D boundary centroid displacement unit vector $\hat{\mathbf{u}}_{12}$ is:
$$\hat{\mathbf{u}}_{12} = \begin{cases} 
\dfrac{\vec{\Delta}_{12}}{\|\vec{\Delta}_{12}\|_2}, & \text{if } \|\vec{\Delta}_{12}\|_2 > \epsilon_{\text{singular}} \\
\mathbf{0} = \begin{bmatrix} 0 \\ 0 \\ 0 \end{bmatrix}, & \text{if } \|\vec{\Delta}_{12}\|_2 \le \epsilon_{\text{singular}}
\end{cases}$$
where singularity threshold $\epsilon_{\text{singular}} = 1.0 \times 10^{-12}$.

### 1.3 Great-Circle Angular Separation
The angular arc separation $\theta_{12} \in [0, \pi]$ radians is computed via the robust haversine-derived chord relation:
$$\sin\left(\frac{\theta_{12}}{2}\right) = \frac{d_{\text{chord}}}{2} \implies \theta_{12} = 2 \arcsin\left(\min\left(1.0, \frac{d_{\text{chord}}}{2}\right)\right)$$
This formulation guarantees stability across antipodal and coincident limits without the cancellation errors inherent to naive dot products $\arccos(\mathbf{r}_1 \cdot \mathbf{r}_2)$.

---

## 2. Boundary Flux Dynamics & Thermodynamic Transport Monad

Planetary hexagonal cells exchange conserved mass $\mathbf{M} = [M_{\text{water}}, M_{\text{carbon}}, M_{\text{oxygen}}, M_{\text{minerals}}]^T$ and thermal energy $U$ across inter-cell boundary facets $\partial \Omega_{12}$ of length $L_{\text{facet}}$ and vertical column height $H_{\text{layer}}$.

### 2.1 Directional Velocity Projection
Let cell 1 possess an ambient 3D fluid velocity vector $\mathbf{v}_1 = [v_x, v_y, v_z]^T$ in geocentric Cartesian coordinates ($\text{m}\cdot\text{s}^{-1}$). The directional advective transport velocity across the shared boundary normal to cell 2 is the scalar projection:
$$v_{\perp, 12} = \mathbf{v}_1 \cdot \hat{\mathbf{u}}_{12} = v_{x,1} \hat{u}_{x,12} + v_{y,1} \hat{u}_{y,12} + v_{z,1} \hat{u}_{z,12}$$

Using the upstream donor-cell upwind convention:
$$v_{\text{flux}} = \begin{cases}
v_{\perp, 12}, & \text{if } v_{\perp, 12} \ge 0 \quad (\text{donor is cell 1}) \\
\mathbf{v}_2 \cdot \hat{\mathbf{u}}_{12}, & \text{if } v_{\perp, 12} < 0 \quad (\text{donor is cell 2})
\end{cases}$$

### 2.2 Volumetric Flux & Courant-Friedrichs-Lewy (CFL) Condition
The volumetric exchange rate across the boundary interface during discrete time step $\Delta t$ is:
$$\dot{V}_{12} = |v_{\text{flux}}| \cdot A_{\text{facet}}$$
where $A_{\text{facet}} = L_{\text{facet}} \cdot H_{\text{layer}}$.

To preserve monotonic thermodynamic stability and prevent negative mass states, the exchange fraction $\alpha_{12}$ is bounded by the donor cell volume $V_{\text{donor}}$:
$$\alpha_{12} = \min\left(1.0, \frac{\dot{V}_{12} \cdot \Delta t}{V_{\text{donor}}}\right)$$
where $V_{\text{donor}} = A_{\text{cell}} \cdot H_{\text{layer}}$.

### 2.3 Mass Transfer Deltas
For each conserved mass species $k \in \{\text{water}, \text{carbon}, \text{oxygen}, \text{minerals}\}$:

If $v_{\text{flux}} \ge 0$ (flow from cell 1 to cell 2):
$$\begin{aligned}
\Delta M_{k, 1\to 2} &= \alpha_{12} \cdot M_{k, 1} \\
M_{k, 1}^{(t+\Delta t)} &= M_{k, 1}^{(t)} - \Delta M_{k, 1\to 2} \\
M_{k, 2}^{(t+\Delta t)} &= M_{k, 2}^{(t)} + \Delta M_{k, 1\to 2}
\end{aligned}$$

If $v_{\text{flux}} < 0$ (flow from cell 2 to cell 1):
$$\begin{aligned}
\Delta M_{k, 2\to 1} &= \alpha_{12} \cdot M_{k, 2} \\
M_{k, 1}^{(t+\Delta t)} &= M_{k, 1}^{(t)} + \Delta M_{k, 2\to 1} \\
M_{k, 2}^{(t+\Delta t)} &= M_{k, 2}^{(t)} - \Delta M_{k, 2\to 1}
\end{aligned}$$

**Conservation Law Invariant**:
$$\Delta M_{k, 1} + \Delta M_{k, 2} = 0 \implies \sum_{i \in \text{cells}} \Delta M_{k, i} \equiv 0$$

### 2.4 Energy Transfer Deltas (Advective + Conductive)

#### Advective Enthalpy Transport
The enthalpy carried by the moving fluid parcel:
$$\Delta H_{\text{adv}} = \alpha_{12} \cdot U_{\text{donor}} = \alpha_{12} \cdot (M_{\text{donor}} c_{p} T_{\text{donor}})$$

#### Conductive / Diffusive Thermal Transfer
Thermal conduction across the chord distance $D_{\text{chord}} = R_{\oplus} d_{\text{chord}}$ obeys Fourier's Law projected along $\hat{\mathbf{u}}_{12}$:
$$\dot{Q}_{\text{diff}} = -k_{\text{thermal}} A_{\text{facet}} \frac{T_2 - T_1}{D_{\text{chord}}}$$
$$\Delta Q_{\text{diff}} = \dot{Q}_{\text{diff}} \cdot \Delta t$$

Total thermal energy exchanged:
$$\Delta U_{1\to 2} = \text{sign}(v_{\text{flux}}) \cdot \Delta H_{\text{adv}} + \Delta Q_{\text{diff}}$$

**State Transition**:
$$\begin{aligned}
U_1^{(t+\Delta t)} &= U_1^{(t)} - \Delta U_{1\to 2} \\
U_2^{(t+\Delta t)} &= U_2^{(t)} + \Delta U_{1\to 2}
\end{aligned}$$

**First Law Conservation**:
$$\Delta U_1 + \Delta U_2 \equiv 0$$

### 2.5 Second Law & Local Entropy Production
The local entropy production rate $\dot{S}_{\text{prod}}$ for conductive and advective heat transfer between cell 1 and cell 2 must satisfy:
$$\dot{S}_{\text{prod}} = \dot{Q}_{\text{diff}} \left( \frac{1}{T_2} - \frac{1}{T_1} \right) = k_{\text{thermal}} \frac{A_{\text{facet}}}{D_{\text{chord}}} \frac{(T_1 - T_2)^2}{T_1 T_2} \ge 0$$
Because $k_{\text{thermal}} > 0$, $A_{\text{facet}} > 0$, $D_{\text{chord}} > 0$, and absolute temperatures $T_1, T_2 > 0 \text{ K}$, $\dot{S}_{\text{prod}} \ge 0$ unconditionally, preserving Second Law thermodynamic admissibility.

---

## 3. Concrete Monad Method Specifications

### Method 1: `computeBoundaryCentroidDisplacement3D`
Calculates the normalized 3D Cartesian displacement vector in geocentric space pointing from an origin spherical coordinate to a target spherical coordinate.

```typescript
/**
 * Computes the normalized 3D Cartesian unit displacement vector
 * from origin to target on the unit sphere.
 *
 * @param origin - Origin spherical coordinates { lat, lng } in degrees.
 * @param target - Target spherical coordinates { lat, lng } in degrees.
 * @param epsilon - Singularity tolerance threshold (default: 1e-12).
 * @returns Normalized 3D Cartesian unit vector { x, y, z }.
 */
export function computeBoundaryCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates,
  epsilon: number = 1e-12
): Vector3D {
  const DEG_TO_RAD = Math.PI / 180.0;
  const phi1 = origin.lat * DEG_TO_RAD;
  const lam1 = origin.lng * DEG_TO_RAD;
  const phi2 = target.lat * DEG_TO_RAD;
  const lam2 = target.lng * DEG_TO_RAD;

  const cosPhi1 = Math.cos(phi1);
  const x1 = cosPhi1 * Math.cos(lam1);
  const y1 = cosPhi1 * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const cosPhi2 = Math.cos(phi2);
  const x2 = cosPhi2 * Math.cos(lam2);
  const y2 = cosPhi2 * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;

  const norm = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (norm <= epsilon) {
    return { x: 0.0, y: 0.0, z: 0.0 };
  }

  const invNorm = 1.0 / norm;
  return {
    x: dx * invNorm,
    y: dy * invNorm,
    z: dz * invNorm
  };
}
```

---

### Method 2: `computeDetailedCentroidDisplacement3D`
Calculates position vectors, chord displacement, normalized unit vector, chord distance, and geodesic arc separation.

```typescript
/**
 * Detailed 3D boundary centroid displacement analysis including
 * geocentric Cartesian positions, chord vector, unit vector,
 * chord distance, and great-circle angular distance.
 *
 * @param origin - Origin spherical coordinates { lat, lng } in degrees.
 * @param target - Target spherical coordinates { lat, lng } in degrees.
 * @param epsilon - Singularity threshold (default: 1e-12).
 * @returns Full displacement record.
 */
export function computeDetailedCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates,
  epsilon: number = 1e-12
): BoundaryDisplacement3D {
  const DEG_TO_RAD = Math.PI / 180.0;
  const phi1 = origin.lat * DEG_TO_RAD;
  const lam1 = origin.lng * DEG_TO_RAD;
  const phi2 = target.lat * DEG_TO_RAD;
  const lam2 = target.lng * DEG_TO_RAD;

  const cosPhi1 = Math.cos(phi1);
  const p1: Vector3D = {
    x: cosPhi1 * Math.cos(lam1),
    y: cosPhi1 * Math.sin(lam1),
    z: Math.sin(phi1)
  };

  const cosPhi2 = Math.cos(phi2);
  const p2: Vector3D = {
    x: cosPhi2 * Math.cos(lam2),
    y: cosPhi2 * Math.sin(lam2),
    z: Math.sin(phi2)
  };

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const chordDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  let unitVector: Vector3D;
  if (chordDistance <= epsilon) {
    unitVector = { x: 0.0, y: 0.0, z: 0.0 };
  } else {
    const inv = 1.0 / chordDistance;
    unitVector = { x: dx * inv, y: dy * inv, z: dz * inv };
  }

  // Angular distance via stable chord relation
  const halfChord = Math.min(1.0, chordDistance * 0.5);
  const angularDistanceRad = 2.0 * Math.asin(halfChord);

  return {
    origin: p1,
    target: p2,
    displacement: { x: dx, y: dy, z: dz },
    unitVector,
    chordDistance,
    angularDistanceRad
  };
}
```

---

### Method 3: `executeAdvectiveBoundaryTransfer`
Executes conservative mass and enthalpy transfer between two adjacent cells along their 3D displacement vector.

```typescript
export interface BoundaryTransferInputs {
  cellA: {
    coord: SphericalCoordinates;
    waterMassKg: number;
    carbonMassKg: number;
    oxygenMassKg: number;
    mineralMassKg: number;
    thermalEnergyJoules: number;
    volumeM3: number;
    windVelocity3D: Vector3D; // m/s
  };
  cellB: {
    coord: SphericalCoordinates;
    waterMassKg: number;
    carbonMassKg: number;
    oxygenMassKg: number;
    mineralMassKg: number;
    thermalEnergyJoules: number;
    volumeM3: number;
    windVelocity3D: Vector3D; // m/s
  };
  facetAreaM2: number;
  deltaTimeSec: number;
}

export interface BoundaryTransferResult {
  deltaWaterKg: number;    // positive: A -> B, negative: B -> A
  deltaCarbonKg: number;
  deltaOxygenKg: number;
  deltaMineralKg: number;
  deltaEnergyJoules: number;
}

export function executeAdvectiveBoundaryTransfer(
  inputs: BoundaryTransferInputs
): BoundaryTransferResult {
  const u_hat = computeBoundaryCentroidDisplacement3D(
    inputs.cellA.coord,
    inputs.cellB.coord
  );

  // Velocity projection of cell A along displacement axis
  const v_projA =
    inputs.cellA.windVelocity3D.x * u_hat.x +
    inputs.cellA.windVelocity3D.y * u_hat.y +
    inputs.cellA.windVelocity3D.z * u_hat.z;

  // Velocity projection of cell B along displacement axis
  const v_projB =
    inputs.cellB.windVelocity3D.x * u_hat.x +
    inputs.cellB.windVelocity3D.y * u_hat.y +
    inputs.cellB.windVelocity3D.z * u_hat.z;

  let donorIsA = true;
  let effectiveVelocity = 0.0;

  if (v_projA >= 0 && v_projB >= 0) {
    effectiveVelocity = (v_projA + v_projB) * 0.5;
    donorIsA = true;
  } else if (v_projA < 0 && v_projB < 0) {
    effectiveVelocity = -(v_projA + v_projB) * 0.5;
    donorIsA = false;
  } else {
    // Divergence / convergence boundary resolution
    if (v_projA > -v_projB) {
      effectiveVelocity = v_projA;
      donorIsA = true;
    } else {
      effectiveVelocity = -v_projB;
      donorIsA = false;
    }
  }

  if (effectiveVelocity <= 0.0) {
    return {
      deltaWaterKg: 0,
      deltaCarbonKg: 0,
      deltaOxygenKg: 0,
      deltaMineralKg: 0,
      deltaEnergyJoules: 0
    };
  }

  const volumetricFlux = effectiveVelocity * inputs.facetAreaM2;
  const donorVolume = donorIsA ? inputs.cellA.volumeM3 : inputs.cellB.volumeM3;
  const alpha = Math.min(
    1.0,
    (volumetricFlux * inputs.deltaTimeSec) / Math.max(1e-3, donorVolume)
  );

  const sign = donorIsA ? 1.0 : -1.0;
  const donor = donorIsA ? inputs.cellA : inputs.cellB;

  return {
    deltaWaterKg: sign * alpha * donor.waterMassKg,
    deltaCarbonKg: sign * alpha * donor.carbonMassKg,
    deltaOxygenKg: sign * alpha * donor.oxygenMassKg,
    deltaMineralKg: sign * alpha * donor.mineralMassKg,
    deltaEnergyJoules: sign * alpha * donor.thermalEnergyJoules
  };
}
```

---

## 4. Analytical Reference Test Cases

| Index | Case Description | Origin $(\text{lat}_1, \text{lng}_1)$ | Target $(\text{lat}_2, \text{lng}_2)$ | Expected Chord $\vec{\Delta}$ | Expected $\hat{\mathbf{u}}$ | Expected Angular Arc $\theta$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Equator Eastward $90^\circ$ | $(0^\circ, 0^\circ)$ | $(0^\circ, 90^\circ)$ | $[-1.0, 1.0, 0.0]$ | $[-1/\sqrt{2}, 1/\sqrt{2}, 0.0]$ | $\pi / 2 \approx 1.570796$ |
| **TC-02** | Equator to North Pole | $(0^\circ, 0^\circ)$ | $(90^\circ, 0^\circ)$ | $[-1.0, 0.0, 1.0]$ | $[-1/\sqrt{2}, 0.0, 1/\sqrt{2}]$ | $\pi / 2 \approx 1.570796$ |
| **TC-03** | Prime Meridian to Date Line | $(0^\circ, 0^\circ)$ | $(0^\circ, 180^\circ)$ | $[-2.0, 0.0, 0.0]$ | $[-1.0, 0.0, 0.0]$ | $\pi \approx 3.141593$ |
| **TC-04** | Coincident Singular Centroid | $(37.77^\circ, -122.41^\circ)$ | $(37.77^\circ, -122.41^\circ)$| $[0.0, 0.0, 0.0]$ | $[0.0, 0.0, 0.0]$ | $0.0$ |
| **TC-05** | Date-Line Boundary Crossing | $(10^\circ, 179.9^\circ)$ | $(10^\circ, -179.9^\circ)$ | $[0.0, -0.003437, 0.0]$ | $[0.0, -1.0, 0.0]$ | $0.003490 \text{ rad}$ |

---

## 5. Summary of Deliverable Files
- `src/spatial/h3_types.ts`: Ensure `Vector3D`, `SphericalCoordinates`, and `BoundaryDisplacement3D` interfaces are defined.
- `src/spatial/h3_adjacency.ts`: Export `computeBoundaryCentroidDisplacement3D` and `computeDetailedCentroidDisplacement3D`; add `getNeighborDisplacement3D` to `H3AdjacencyManager`.
- `tests/sprint_065.test.ts`: Validate unit norm invariants, directional accuracy, singularity handling, date-line transitions, and zero-sum mass/energy conservations.