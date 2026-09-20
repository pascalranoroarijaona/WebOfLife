# Sprint 091: Methods & Thermodynamic Process Specifications
**Theme**: H3 Aperture Classification and Hexagonal Orientation Dynamics in Adjacency Graphs  
**Status**: Formal Process Specification  
**Component**: `src/spatial/h3_adjacency.ts` & Spatial Thermodynamic Monads  

---

## 1. Domain Physics & Geometric Foundations

### 1.1 Aperture-7 Hierarchy & Rotational Transformation
The Uber H3 Discrete Global Grid System (DGGS) utilizes an Aperture 7 recursive hexagonal partitioning over an icosahedron. In an Aperture 7 hierarchy, each finer resolution scale shrinks the area by a factor of 7:
$$A(r) = \frac{A(0)}{7^r}$$

Because 7 is not a central polygonal number that shares collinear axes with parent hexagons, the orientation angle $\theta$ of child hexagon coordinate bases alternates between two discrete rotational classes:
$$\text{ApertureClass}(r) = \begin{cases}
\text{CLASS\_II}, & \text{if } r \equiv 0 \pmod 2 \\
\text{CLASS\_III}, & \text{if } r \equiv 1 \pmod 2
\end{cases}$$

The rotation angle $\alpha$ distinguishing Class III from Class II is derived from the geometry of the Aperture 7 centroid shift:
$$\alpha = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.1062629^\circ \approx 0.333473172 \text{ rad}$$

For an edge $k \in \{0, 1, 2, 3, 4, 5\}$ of a hexagon at resolution $r$, the outward unit normal vector $\mathbf{n}_k(r) \in \mathbb{R}^2$ in the tangent plane is governed by the 2D rotation group $\mathrm{SO}(2)$:
$$\mathbf{n}_k(r) = \mathbf{R}(\theta(r)) \cdot \mathbf{n}_k^{(0)}$$
Where:
$$\mathbf{n}_k^{(0)} = \begin{pmatrix} \cos\left( \frac{k \pi}{3} \right) \\ \sin\left( \frac{k \pi}{3} \right) \end{pmatrix}$$
$$\mathbf{R}(\theta(r)) = \begin{pmatrix} \cos \theta(r) & -\sin \theta(r) \\ \sin \theta(r) & \cos \theta(r) \end{pmatrix}$$
$$\theta(r) = \begin{cases} 
0, & \text{for } \text{CLASS\_II} \ (r \equiv 0 \pmod 2) \\ 
\alpha, & \text{for } \text{CLASS\_III} \ (r \equiv 1 \pmod 2) 
\end{cases}$$

### 1.2 Physical Consequences of Aperture Orientation Misalignment
Directional mass and energy transport vectors $\mathbf{J}_{\Phi}$ (representing advective and diffusive fluxes of carbon, water, oxygen, dissolved minerals, and enthalpy) must be projected across the cell interface $\partial \Omega_{i,k}$ shared between cell $i$ and its $k$-th neighbor $j = \mathcal{N}_k(i)$:
$$J_{i \to j, \Phi} = \mathbf{J}_{\Phi} \cdot \mathbf{n}_k(r) \cdot L(r)$$

Where $L(r)$ is the hexagonal edge length at resolution $r$:
$$L(r) = \sqrt{\frac{2 A(r)}{3 \sqrt{3}}}$$

If the spatial graph omits or incorrectly assumes the aperture class:
1. **Geometric Projection Error**: An unrotated normal $\mathbf{n}_k(0)$ applied to a Class III hexagon induces an angular misalignment error $\delta \theta = \alpha \approx 19.1063^\circ$.
2. **Spurious Divergence**: The projection error $\epsilon_{\text{proj}} = |\cos(\phi - \alpha) - \cos(\phi)|$ introduces non-physical numerical divergence:
   $$\nabla \cdot \mathbf{J}_{\text{err}} = \sum_{k=0}^5 J_{\Phi} (\cos(\phi_k - \alpha) - \cos(\phi_k)) L(r) \neq 0$$
3. **Entropy Violation**: Artificially induced transverse flux components generate fictitious entropy production $\dot{S}_{\text{num}} \neq 0$, violating the Second Law of Thermodynamics in passive equilibrium states.

---

## 2. Conserved State Variables & State Space Vector

Each spatial cell $i$ at resolution $r$ holds a thermodynamic state vector $\mathbf{S}_i \in \mathbb{R}^6$:
$$\mathbf{S}_i = \begin{bmatrix}
M_{C, i} \\
M_{H_2O, i} \\
M_{O_2, i} \\
M_{N, i} \\
M_{min, i} \\
U_i
\end{bmatrix}
= \begin{bmatrix}
\text{Total Organic \& Inorganic Carbon stock } [\mathrm{kg}] \\
\text{Total Liquid \& Vapor Water stock } [\mathrm{kg}] \\
\text{Dissolved / Gaseous Molecular Oxygen stock } [\mathrm{kg}] \\
\text{Reactive Nitrogen stock } [\mathrm{kg}] \\
\text{Bioavailable Mineral nutrients (P, K) } [\mathrm{kg}] \\
\text{Internal Thermal Energy / Enthalpy } [\mathrm{kJ}]
\end{bmatrix}$$

Associated intensive variables:
- Temperature: $T_i = \frac{U_i}{C_{v, i}}$ where $C_{v, i} = \sum_s M_{s, i} c_{v, s} \ [\mathrm{kJ \cdot K^{-1}}]$
- Chemical Potential of species $s$: $\mu_{s, i} = \mu_{s}^\circ + R T_i \ln\left( \frac{M_{s, i}}{A(r) h_i} \right) \ [\mathrm{kJ \cdot kg^{-1}}]$

---

## 3. Stock Transfer Equations Across Rotated Hexagonal Interfaces

### 3.1 Aperture-Corrected Boundary Normal Vectors
For a cell at resolution $r$, aperture class $\mathcal{A} \in \{\text{CLASS\_II}, \text{CLASS\_III}\}$ determines the boundary rotation angle $\theta_r$:
```typescript
theta_r = (apertureClass === 'CLASS_III') ? 0.333473172 : 0.0;
```
For directional face index $k \in \{0, 1, 2, 3, 4, 5\}$ (corresponding to canonical neighbor offsets):
$$\mathbf{n}_k(r) = \begin{pmatrix}
\cos\left(\frac{k \pi}{3} + \theta_r\right) \\
\sin\left(\frac{k \pi}{3} + \theta_r\right)
\end{pmatrix}$$

### 3.2 Inter-Cell Flux Balance (First Law Compliance)
Let $\mathbf{u} = (u_x, u_y)^T \ [\mathrm{m \cdot s^{-1}}]$ be the local fluid/wind velocity vector, and $D_s \ [\mathrm{m^2 \cdot s^{-1}}]$ the molecular/turbulent diffusion coefficient for species $s$.

The advective-diffusive flux density vector $\mathbf{j}_s \ [\mathrm{kg \cdot m^{-2} \cdot s^{-1}}]$ is:
$$\mathbf{j}_s = \mathbf{u} \cdot \rho_s - D_s \nabla \rho_s$$
Where $\rho_s = \frac{M_s}{A(r) h}$ is the volumetric density $[\mathrm{kg \cdot m^{-3}}]$, and $h$ is boundary layer thickness $[\mathrm{m}]$.

The discrete mass exchange $\Delta M_{s, i \to j}$ across interface edge $k$ over time step $\Delta t$ is:
$$\Phi_{s, k} = \left( \mathbf{j}_s \cdot \mathbf{n}_k(r) \right) \cdot L(r) \cdot h$$
$$\Delta M_{s, i \to j} = \Phi_{s, k} \cdot \Delta t$$

Direct conservation implies anti-symmetry:
$$\Delta M_{s, j \to i} = - \Delta M_{s, i \to j}$$

Mass deltas applied to state stocks:
$$\Delta M_{s, i} = - \sum_{k=0}^5 \Phi_{s, k} \cdot \Delta t$$
$$\Delta M_{s, j} = + \Phi_{s, k} \cdot \Delta t \quad \text{for } j = \mathcal{N}_k(i)$$
$$\sum_{i \in \text{Domain}} \Delta M_{s, i} = 0 \quad (\text{Strict First Law Conservation})$$

### 3.3 Thermal Energy (Enthalpy) Exchange
Heat transport incorporates both advective sensible enthalpy and Fourier thermal conduction:
$$\mathbf{j}_q = \mathbf{u} \cdot (\rho c_p T) - \kappa \nabla T$$
Where $\kappa$ is the thermal conductivity $[\mathrm{kW \cdot m^{-1} \cdot K^{-1}}]$.

The net interface enthalpy delta over $\Delta t$:
$$\Phi_{U, k} = \left( \mathbf{j}_q \cdot \mathbf{n}_k(r) \right) \cdot L(r) \cdot h$$
$$\Delta U_{i \to j} = \Phi_{U, k} \cdot \Delta t$$
$$\Delta U_i = - \sum_{k=0}^5 \Phi_{U, k} \cdot \Delta t$$
$$\Delta U_j = + \Phi_{U, k} \cdot \Delta t$$

### 3.4 Second Law Verification (Entropy Production)
Entropy generation rate $\dot{S}_{\text{gen}}$ across the interface must remain non-negative:
$$\dot{S}_{\text{gen}, i \to j} = \Phi_{U, k} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) + \sum_s \Phi_{s, k} \left( \frac{\mu_{s, i}}{T_i} - \frac{\mu_{s, j}}{T_j} \right) \ge 0$$
Accurate evaluation of $\mathbf{n}_k(r)$ via `getApertureClassForResolution` prevents spurious reversal of $\dot{S}_{\text{gen}}$.

---

## 4. Executable Monad Method Specifications

### 4.1 Aperture Resolution Classifier
```typescript
export type H3ApertureClass = 'CLASS_II' | 'CLASS_III';

/**
 * Pure mathematical mapping of resolution to aperture orientation class.
 * Satisfies O(1) runtime and zero allocation overhead.
 */
export function getApertureClassForResolution(res: number): H3ApertureClass {
  if (!Number.isInteger(res) || res < 0) {
    throw new RangeError(`Resolution must be a non-negative integer, received: ${res}`);
  }
  return (res % 2 === 0) ? 'CLASS_II' : 'CLASS_III';
}
```

### 4.2 Orientation Angle Resolution Monad
```typescript
export const CLASS_III_ROTATION_RADIANS = 0.3334731722438334; // arcsin(sqrt(3) / (2 * sqrt(7)))
export const CLASS_III_ROTATION_DEGREES = 19.106262883011494;

export interface IH3EdgeOrientation {
  readonly resolution: number;
  readonly apertureClass: H3ApertureClass;
  readonly rotationRadians: number;
  readonly normalVectors: ReadonlyArray<{ readonly nx: number; readonly ny: number }>;
}

export function computeH3EdgeNormals(res: number): IH3EdgeOrientation {
  const apertureClass = getApertureClassForResolution(res);
  const theta = (apertureClass === 'CLASS_III') ? CLASS_III_ROTATION_RADIANS : 0.0;
  
  const normalVectors = [0, 1, 2, 3, 4, 5].map((k) => {
    const angle = (k * Math.PI / 3.0) + theta;
    return {
      nx: Math.cos(angle),
      ny: Math.sin(angle)
    };
  });

  return {
    resolution: res,
    apertureClass,
    rotationRadians: theta,
    normalVectors
  };
}
```

### 4.3 Spatial Flux Monad Operator
```typescript
export interface ThermodynamicCellStocks {
  carbon_kg: number;
  water_kg: number;
  oxygen_kg: number;
  nitrogen_kg: number;
  minerals_kg: number;
  thermal_energy_kj: number;
}

export interface FluxField2D {
  readonly vx: number; // m/s
  readonly vy: number; // m/s
  readonly diffusionCoefficient: number; // m^2/s
  readonly thermalConductivity: number; // kW / (m * K)
}

export interface CellGeometry {
  readonly resolution: number;
  readonly edgeLengthMeters: number;
  readonly heightMeters: number;
}

/**
 * Computes conservative stock deltas between cell i and its 6 neighbor interfaces.
 */
export function computeInterfaceFluxDeltas(
  stateI: ThermodynamicCellStocks,
  neighborsState: ReadonlyArray<ThermodynamicCellStocks | null>,
  geometry: CellGeometry,
  field: FluxField2D,
  dtSeconds: number
): {
  deltaSelf: ThermodynamicCellStocks;
  deltaNeighbors: ThermodynamicCellStocks[];
} {
  const edgeNormals = computeH3EdgeNormals(geometry.resolution);
  const areaEdge = geometry.edgeLengthMeters * geometry.heightMeters;

  const deltaSelf: ThermodynamicCellStocks = {
    carbon_kg: 0,
    water_kg: 0,
    oxygen_kg: 0,
    nitrogen_kg: 0,
    minerals_kg: 0,
    thermal_energy_kj: 0
  };

  const deltaNeighbors: ThermodynamicCellStocks[] = neighborsState.map(() => ({
    carbon_kg: 0,
    water_kg: 0,
    oxygen_kg: 0,
    nitrogen_kg: 0,
    minerals_kg: 0,
    thermal_energy_kj: 0
  }));

  for (let k = 0; k < 6; k++) {
    const stateJ = neighborsState[k];
    if (!stateJ) continue; // Boundary / domain perimeter condition

    const normal = edgeNormals.normalVectors[k];
    const normalVelocity = (field.vx * normal.nx) + (field.vy * normal.ny);

    // Species flux calculation helper
    const calculateSpeciesExchange = (stockI: number, stockJ: number): number => {
      const concI = stockI / areaEdge;
      const concJ = stockJ / areaEdge;
      const advectiveConc = normalVelocity >= 0 ? concI : concJ;
      const advectiveFlux = normalVelocity * advectiveConc;
      const diffusiveFlux = -field.diffusionCoefficient * (concJ - concI);
      const totalFlux = (advectiveFlux + diffusiveFlux) * areaEdge * dtSeconds;
      return totalFlux;
    };

    const deltaC = calculateSpeciesExchange(stateI.carbon_kg, stateJ.carbon_kg);
    const deltaH2O = calculateSpeciesExchange(stateI.water_kg, stateJ.water_kg);
    const deltaO2 = calculateSpeciesExchange(stateI.oxygen_kg, stateJ.oxygen_kg);
    const deltaN = calculateSpeciesExchange(stateI.nitrogen_kg, stateJ.nitrogen_kg);
    const deltaMin = calculateSpeciesExchange(stateI.minerals_kg, stateJ.minerals_kg);
    const deltaU = calculateSpeciesExchange(stateI.thermal_energy_kj, stateJ.thermal_energy_kj);

    // Apply strict conservative updates (Outflow from I is inflow to J)
    deltaSelf.carbon_kg -= deltaC;
    deltaSelf.water_kg -= deltaH2O;
    deltaSelf.oxygen_kg -= deltaO2;
    deltaSelf.nitrogen_kg -= deltaN;
    deltaSelf.minerals_kg -= deltaMin;
    deltaSelf.thermal_energy_kj -= deltaU;

    deltaNeighbors[k].carbon_kg += deltaC;
    deltaNeighbors[k].water_kg += deltaH2O;
    deltaNeighbors[k].oxygen_kg += deltaO2;
    deltaNeighbors[k].nitrogen_kg += deltaN;
    deltaNeighbors[k].minerals_kg += deltaMin;
    deltaNeighbors[k].thermal_energy_kj += deltaU;
  }

  return { deltaSelf, deltaNeighbors };
}
```

---

## 5. Verification Vectors and Physical Invariants

| Test Condition | Resolution $r$ | Expected Aperture Class | Boundary Rotation Angle $\theta_r$ | Normal Edge 0 Vector $(\cos\theta_r, \sin\theta_r)$ | Invariant Checked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Base icosahedron cells | $r = 0$ | `'CLASS_II'` | $0^\circ$ ($0.0 \text{ rad}$) | $(1.000000, 0.000000)$ | $\sum \Delta M_s = 0$ |
| 1st refinement level | $r = 1$ | `'CLASS_III'` | $19.1063^\circ$ ($0.333473 \text{ rad}$) | $(0.944911, 0.327327)$ | $\sum \Delta M_s = 0$ |
| 2nd refinement level | $r = 2$ | `'CLASS_II'` | $0^\circ$ ($0.0 \text{ rad}$) | $(1.000000, 0.000000)$ | $\sum \Delta M_s = 0$ |
| 3rd refinement level | $r = 3$ | `'CLASS_III'` | $19.1063^\circ$ ($0.333473 \text{ rad}$) | $(0.944911, 0.327327)$ | $\sum \Delta M_s = 0$ |
| Operational finest res | $r = 15$ | `'CLASS_III'` | $19.1063^\circ$ ($0.333473 \text{ rad}$) | $(0.944911, 0.327327)$ | $\sum \Delta M_s = 0$ |
| Non-integer argument | $r = 2.5$ | Throws `RangeError` | N/A | N/A | Determinism & Type safety |
| Negative argument | $r = -1$ | Throws `RangeError` | N/A | N/A | Domain positivity |