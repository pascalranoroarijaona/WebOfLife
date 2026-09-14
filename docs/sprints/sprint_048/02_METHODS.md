# Process Mining & Method Specifications: Lateral Thermodynamic Transport & Geometric Contact Interfaces

- **Sprint**: sprint_048
- **Domain**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`
- **RFC Reference**: RFC-048 (Geometric Interface Contact Calculator `calculateH3SharedBoundaryLength`)
- **Mathematical Physics**: Non-Equilibrium Thermodynamics, Spherical Geodesics, Discrete Exterior Calculus on Uber H3

---

## 1. Physical & Geochemical Foundations

### 1.1 Cross-Sectional Geometric Interface
In discrete planetary spatial dynamics over spherical tessellations, the extensive lateral transfer of conserved thermodynamic stocks (enthalpy, water, dissolved inorganic carbon, atmospheric gases, and particulate minerals) across adjacent cells $i$ and $j$ occurs across a vertical interface cross-section:

$$A_{ij} = L_{ij} \cdot H_{ij}$$

where:
- $L_{ij} = L_{ji} \ge 0$ is the geodesic shared boundary contact length ($\text{m}$) computed via `calculateH3SharedBoundaryLength(i, j)`.
- $H_{ij} = \min(H_i, H_j)$ is the effective boundary interface depth/height column ($\text{m}$).
- $D_{ij}$ is the geodesic centroid-to-centroid distance ($\text{m}$) between cell centroids $\mathbf{x}_i$ and $\mathbf{x}_j$.

### 1.2 Generalized Lateral Flux Equation
For any intensive scalar potential $\Psi$ (e.g., temperature $T$ in $\text{K}$, chemical potential $\mu$ in $\text{J}\cdot\text{mol}^{-1}$, hydraulic head $h$ in $\text{m}$, or mass fraction $\chi$ in $\text{kg}\cdot\text{kg}^{-1}$), the directed extensive flux $\Phi_{i \to j}$ (stock transferred per second, $[\text{Stock}]\cdot\text{s}^{-1}$) from cell $i$ to cell $j$ is governed by the discrete Laplacian formulation:

$$\Phi_{i \to j} = - C_{ij} \left( \Psi_j - \Psi_i \right)$$

where the interface conductance $C_{ij}$ is defined as:

$$C_{ij} = \sigma_{ij} \cdot \frac{L_{ij} \cdot H_{ij}}{D_{ij}}$$

and $\sigma_{ij}$ is the harmonic mean of the material transport conductivities of cells $i$ and $j$:

$$\sigma_{ij} = \frac{2 \sigma_i \sigma_j}{\sigma_i + \sigma_j + \varepsilon_{\text{reg}}}$$

---

## 2. Conserved Stock Transfer Delta Formalisms

Each discrete simulation timestep $\Delta t$ updates cell state vector $\mathbf{S}_i = [E_i, W_i, C_i, O_i, M_i]^T$ (Energy, Water, Carbon, Oxygen, Minerals) according to exact pairwise conservative transfers:

$$\Delta S_{k, i} = \sum_{j \in \mathcal{N}(i)} \Phi_{k, j \to i} \cdot \Delta t = - \sum_{j \in \mathcal{N}(i)} \Phi_{k, i \to j} \cdot \Delta t$$

### 2.1 Thermal Energy (Fourier Conduction & Enthalpy Advection)
- **Fourier Sensible Heat Conduction**:
  $$\Phi_{Q, i \to j}^{\text{cond}} = - \kappa_{ij} \frac{L_{ij} H_{ij}}{D_{ij}} (T_j - T_i) \quad [\text{W} \equiv \text{J}\cdot\text{s}^{-1}]$$
  where $\kappa_{ij}$ is thermal conductivity ($\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}$).
- **Advective Enthalpy Transfer**:
  $$\Phi_{Q, i \to j}^{\text{adv}} = \Phi_{W, i \to j} \cdot c_{p, w} \cdot T_{\text{upwind}} \quad [\text{W}]$$
  where $c_{p, w} = 4,184\text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ and $T_{\text{upwind}} = T_i$ if $\Phi_{W, i \to j} > 0$ else $T_j$.
- **Energy Delta**:
  $$\Delta E_i = \sum_{j \in \mathcal{N}(i)} \left( \Phi_{Q, j \to i}^{\text{cond}} + \Phi_{Q, j \to i}^{\text{adv}} \right) \Delta t \quad [\text{J}]$$

### 2.2 Water Mass (Baroclinic & Darcy Surface/Subsurface Flux)
- **Hydraulic Head Potential**:
  $$\Phi_{W, i \to j} = - \rho_w K_{h, ij} \frac{L_{ij} H_{ij}}{D_{ij}} (h_j - h_i) \quad [\text{kg}\cdot\text{s}^{-1}]$$
  where $\rho_w = 1,000\text{ kg}\cdot\text{m}^{-3}$ is water density, $K_{h, ij}$ is hydraulic conductivity ($\text{m}\cdot\text{s}^{-1}$), and $h = z + \frac{P}{\rho_w g}$ is hydraulic head ($\text{m}$).
- **Water Delta**:
  $$\Delta W_i = \sum_{j \in \mathcal{N}(i)} \Phi_{W, j \to i} \cdot \Delta t \quad [\text{kg}]$$

### 2.3 Carbon Mass (Fickian Diffusion & Solute Advection)
- **Solute Diffusion & Advective Mass Flux**:
  $$\Phi_{C, i \to j} = - D_{c, ij} \frac{L_{ij} H_{ij}}{D_{ij}} (C_j - C_i) + \Phi_{W, i \to j} \cdot \chi_{C, \text{upwind}} \quad [\text{kg}\cdot\text{s}^{-1}]$$
  where $D_{c, ij}$ is solute molecular/eddy diffusivity ($\text{m}^2\cdot\text{s}^{-1}$), $C$ is carbon concentration ($\text{kg}\cdot\text{m}^{-3}$), and $\chi_C$ is carbon mass fraction in the aqueous/air carrier.
- **Carbon Delta**:
  $$\Delta C_i = \sum_{j \in \mathcal{N}(i)} \Phi_{C, j \to i} \cdot \Delta t \quad [\text{kg}]$$

### 2.4 Dissolved & Atmospheric Oxygen ($O_2$)
- **Gas/Aqueous Oxygen Transport**:
  $$\Phi_{O_2, i \to j} = - D_{O_2, ij} \frac{L_{ij} H_{ij}}{D_{ij}} (O_{2, j} - O_{2, i}) + \Phi_{W, i \to j} \cdot \chi_{O_2, \text{upwind}} \quad [\text{kg}\cdot\text{s}^{-1}]$$
- **Oxygen Delta**:
  $$\Delta O_i = \sum_{j \in \mathcal{N}(i)} \Phi_{O_2, j \to i} \cdot \Delta t \quad [\text{kg}]$$

### 2.5 Mineral Mass (Sediment/Particulate Transport)
- **Diffusive & Bedload/Suspended Sediment Transport**:
  $$\Phi_{M, i \to j} = - D_{m, ij} \frac{L_{ij} H_{ij}}{D_{ij}} (M_j - M_i) + \Phi_{W, i \to j} \cdot \chi_{M, \text{upwind}} \quad [\text{kg}\cdot\text{s}^{-1}]$$
- **Minerals Delta**:
  $$\Delta M_i = \sum_{j \in \mathcal{N}(i)} \Phi_{M, j \to i} \cdot \Delta t \quad [\text{kg}]$$

---

## 3. Strict Thermodynamic Conservation Invariants

1. **Global Conservation of Mass**:
   $$\sum_{i \in \text{Grid}} \Delta W_i \equiv 0, \quad \sum_{i \in \text{Grid}} \Delta C_i \equiv 0, \quad \sum_{i \in \text{Grid}} \Delta O_i \equiv 0, \quad \sum_{i \in \text{Grid}} \Delta M_i \equiv 0$$
   *Proof*:
   $$\sum_{i} \Delta S_i = \Delta t \sum_{i} \sum_{j \in \mathcal{N}(i)} \Phi_{j \to i} = \Delta t \sum_{\langle i, j \rangle} \left( \Phi_{j \to i} + \Phi_{i \to j} \right) \equiv 0$$
   because $L_{ij} = L_{ji} \implies C_{ij} = C_{ji} \implies \Phi_{j \to i} = -\Phi_{i \to j}$.

2. **Global First Law Conservation of Energy**:
   $$\sum_{i \in \text{Grid}} \Delta E_i = 0 \quad (\text{closed boundary})$$

3. **Second Law Non-Decrease of Entropy**:
   $$\dot{S}_{\text{entropy}} = \frac{1}{2} \sum_{i} \sum_{j \in \mathcal{N}(i)} \kappa_{ij} \frac{L_{ij} H_{ij}}{D_{ij}} \frac{(T_j - T_i)^2}{T_i T_j} \ge 0$$
   Guaranteed by $L_{ij} \ge 0$, $H_{ij} > 0$, $D_{ij} > 0$, and $T_i, T_j > 0\text{ K}$.

---

## 4. Executable Monad Method Specifications

### 4.1 Interface Contact Calculation (`calculateH3SharedBoundaryLength`)

```typescript
/**
 * Shared boundary interface descriptor for adjacent H3 topological cells.
 */
export interface H3SharedBoundary {
  /** First shared vertex [latitude, longitude] in degrees */
  readonly vertexA: [number, number];
  /** Second shared vertex [latitude, longitude] in degrees */
  readonly vertexB: [number, number];
  /** Geodesic edge contact length in meters (WGS84 spherical approximation) */
  readonly lengthMeters: number;
  /** Topological status of adjacency */
  readonly isAdjacent: boolean;
}

/**
 * Geometric contact calculator contract.
 */
export interface IH3BoundaryCalculator {
  calculateSharedBoundary(origin: string, neighbor: string): H3SharedBoundary;
  calculateSharedBoundaryLength(origin: string, neighbor: string): number;
}
```

### 4.2 Algorithm: Spherical Geodesic Shared Boundary Computation

```typescript
import { cellToBoundary, areNeighborCells } from "h3-js";

export const EARTH_MEAN_RADIUS_METERS = 6371008.0;
const GEODESIC_TOLERANCE_DEG = 1e-6; // Approx 11 cm precision

/**
 * Computes great circle distance between two [lat, lon] points in degrees.
 */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number],
  radius: number = EARTH_MEAN_RADIUS_METERS
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const sinDeltaPhi2 = Math.sin(deltaPhi / 2.0);
  const sinDeltaLambda2 = Math.sin(deltaLambda / 2.0);

  const a =
    sinDeltaPhi2 * sinDeltaPhi2 +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda2 * sinDeltaLambda2;

  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
  return radius * c;
}

/**
 * Resolves shared vertices between two polygonal coordinate boundaries.
 */
export function getH3SharedBoundary(origin: string, neighbor: string): H3SharedBoundary {
  // 1. Rejection tests
  if (origin === neighbor || !areNeighborCells(origin, neighbor)) {
    return {
      vertexA: [0, 0],
      vertexB: [0, 0],
      lengthMeters: 0.0,
      isAdjacent: false
    };
  }

  // 2. Extract cell boundary vertices [[lat, lng], ...]
  const originBoundary = cellToBoundary(origin);
  const neighborBoundary = cellToBoundary(neighbor);

  // 3. Match coincident boundary vertices
  const matchedVertices: [number, number][] = [];

  for (const vOrig of originBoundary) {
    for (const vNeigh of neighborBoundary) {
      const dLat = Math.abs(vOrig[0] - vNeigh[0]);
      let dLon = Math.abs(vOrig[1] - vNeigh[1]);
      if (dLon > 180.0) dLon = 360.0 - dLon; // Handle antimeridian wrap

      const euclideanDistDegSq = dLat * dLat + dLon * dLon;
      if (euclideanDistDegSq <= GEODESIC_TOLERANCE_DEG * GEODESIC_TOLERANCE_DEG) {
        // Found matching vertex; avoid duplicates
        const isDuplicate = matchedVertices.some(
          m => Math.hypot(m[0] - vOrig[0], m[1] - vOrig[1]) <= GEODESIC_TOLERANCE_DEG
        );
        if (!isDuplicate) {
          matchedVertices.push([vOrig[0], vOrig[1]]);
        }
      }
    }
  }

  // Hexagonal/pentagonal adjacent cells share exactly 2 vertices defining the common edge
  if (matchedVertices.length < 2) {
    return {
      vertexA: [0, 0],
      vertexB: [0, 0],
      lengthMeters: 0.0,
      isAdjacent: false
    };
  }

  const vertexA = matchedVertices[0];
  const vertexB = matchedVertices[1];
  const lengthMeters = haversineDistance(vertexA, vertexB);

  return {
    vertexA,
    vertexB,
    lengthMeters,
    isAdjacent: true
  };
}

/**
 * Calculates the exact geodesic contact length of the shared boundary edge
 * between two adjacent H3 cells in meters.
 *
 * @param origin - H3 cell index of the origin cell.
 * @param neighbor - H3 cell index of the adjacent cell.
 * @returns Geodesic shared boundary length in meters, or 0.0 if not adjacent.
 */
export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  return getH3SharedBoundary(origin, neighbor).lengthMeters;
}
```

### 4.3 Monad Integration: Discrete Lateral Flux Operator

The `SpatialMonad` applies the geometric contact length to compute lateral transport deltas:

```typescript
export interface CellThermodynamicState {
  readonly h3Index: string;
  energyJoules: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
  temperatureKelvin: number;
  heightColumnMeters: number;
  conductivity: number; // [W / (m * K)]
}

export interface LateralTransferDelta {
  readonly deltaEnergy: number;
  readonly deltaWater: number;
  readonly deltaCarbon: number;
  readonly deltaOxygen: number;
  readonly deltaMinerals: number;
}

/**
 * Computes conservative lateral thermodynamic exchange across all cell edges.
 */
export function executeLateralThermodynamicTransportStep(
  cells: Map<string, CellThermodynamicState>,
  adjacencyList: Map<string, string[]>,
  centroidDistanceMap: Map<string, number>, // key: `${cellA}_${cellB}`
  dtSeconds: number
): Map<string, LateralTransferDelta> {
  const deltas = new Map<string, {
    deltaEnergy: number;
    deltaWater: number;
    deltaCarbon: number;
    deltaOxygen: number;
    deltaMinerals: number;
  }>();

  // Initialize zero deltas
  for (const h3Index of cells.keys()) {
    deltas.set(h3Index, {
      deltaEnergy: 0.0,
      deltaWater: 0.0,
      deltaCarbon: 0.0,
      deltaOxygen: 0.0,
      deltaMinerals: 0.0
    });
  }

  const processedEdges = new Set<string>();

  for (const [originId, neighbors] of adjacencyList.entries()) {
    const origin = cells.get(originId);
    if (!origin) continue;

    for (const neighborId of neighbors) {
      const edgeKey = originId < neighborId ? `${originId}:${neighborId}` : `${neighborId}:${originId}`;
      if (processedEdges.has(edgeKey)) continue;
      processedEdges.add(edgeKey);

      const neighbor = cells.get(neighborId);
      if (!neighbor) continue;

      // Calculate shared geometric contact length
      const L_ij = calculateH3SharedBoundaryLength(originId, neighborId);
      if (L_ij <= 0.0) continue;

      const distKey = `${originId}_${neighborId}`;
      const revDistKey = `${neighborId}_${originId}`;
      const D_ij = centroidDistanceMap.get(distKey) ?? centroidDistanceMap.get(revDistKey) ?? 1.0;
      const H_ij = Math.min(origin.heightColumnMeters, neighbor.heightColumnMeters);

      // Interface thermal conductance
      const k_ij = (2.0 * origin.conductivity * neighbor.conductivity) /
                   (origin.conductivity + neighbor.conductivity + 1e-9);
      const conductance = (k_ij * L_ij * H_ij) / D_ij;

      // Sensible heat exchange (First law symmetric, Fourier conduction)
      const phiQ_i_to_j = -conductance * (neighbor.temperatureKelvin - origin.temperatureKelvin);
      const energyTransferred = phiQ_i_to_j * dtSeconds;

      // Accumulate conservative deltas
      const deltaOrig = deltas.get(originId)!;
      const deltaNeigh = deltas.get(neighborId)!;

      deltaOrig.deltaEnergy -= energyTransferred;
      deltaNeigh.deltaEnergy += energyTransferred;
    }
  }

  return deltas;
}
```

---

## 5. Verification & Acceptance Criteria

1. **Topological Adjacency Identity**:
   - $L(i, i) = 0.0$
   - $L(i, j) = 0.0$ for non-adjacent pairs ($k \ge 2$).
   - $L(i, j) > 0.0$ for all valid 1-ring neighbors ($k = 1$).
2. **Symmetry Invariant**:
   - $|L(i, j) - L(j, i)| \le 10^{-9}\text{ m}$ across all resolutions.
3. **Pentagon-Hexagon Boundaries**:
   - Pentagons (12 worldwide per resolution) possess exactly 5 shared boundaries of identical geodesic length to corresponding hexagonal neighbors.
4. **Thermodynamic First Law Machine Precision**:
   - $\left|\sum_{i} \Delta E_i\right| < 10^{-12}\text{ J}$ in any closed test manifold.