# Sprint 056: Process Mining & Method Specifications

## Coordinate Boundary Assertion (`assertValidCoordinatePair`) & Geodesic Transport Monads

---

### 1. Physical, Biological, and Geodesic Context

In continuous Earth system models discretized over spherical tessellations (such as the discrete global grid system H3), spatial cells exchange conserved scalar quantities—carbon ($M_C$), nitrogen ($M_N$), phosphorus ($M_P$), moisture ($M_{\text{H}_2\text{O}}$), dissolved oxygen ($M_{\text{O}_2}$), and internal thermal energy ($U$).

Advective and diffusive transport fluxes between contiguous hexagonal cells $i$ and $j$ depend fundamentally on the Riemannian metric distance $d_{ij} = d(\mathbf{x}_i, \mathbf{x}_j)$ and inter-cell interface lengths $L_{ij}$ defined over the spherical manifold $S^2$:

$$\mathbf{x} = (\phi, \lambda) \in \mathcal{D}_{\text{geo}} = [-\pi/2, \pi/2] \times [-\pi, \pi]$$

If an invalid coordinate pair $(\phi_{\text{inv}}, \lambda_{\text{inv}})$ enters the adjacency subsystem:
1. **Metric Singularity & Pole Divergence**: Computing great-circle distance via the spherical law of cosines or the haversine formula yields $\text{NaN}$ or negative values:
   $$d_{ij} = 2 R_{\oplus} \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos \phi_i \cos \phi_j \sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
   For $|\phi| > \pi/2$, $\cos \phi < 0$, which can force the radicand negative, generating imaginary distance $d_{ij} \in \mathbb{C}$ and converting IEEE 754 floating-point representations into `NaN`.
2. **Dissipation Anomaly (Second Law Breakdown)**: Advective heat flux is given by:
   $$\dot{Q}_{ij} = C_p \cdot \dot{m}_{ij} \cdot (T_i - T_j)$$
   Entropy generation $\dot{S}_{\text{gen}} = \dot{Q}_{ij} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) = C_p \dot{m}_{ij} \frac{(T_i - T_j)^2}{T_i T_j} \ge 0$.
   If $d_{ij} \le 0$ or non-finite, diffusion coefficients $K_{ij} = \frac{D_{\text{eff}}}{d_{ij}}$ invert sign or evaluate to $\pm\infty$, creating non-physical negative entropy sources (perpetual motion) or instantaneous stock annihilation.
3. **Mass Evaporation / Sink Creation (First Law Breakdown)**: Disjoint or dangling graph edges redirect conserved mass fluxes into unmapped address spaces, resulting in non-zero divergence across the planetary mass balance:
   $$\sum_{c \in \mathcal{H}_3} \Delta M_c \neq 0$$

`assertValidCoordinatePair` functions as the formal invariant gatekeeper enforcing $\mathbf{x} \in \mathcal{D}_{\text{geo}}$ prior to any metric, directional, or transport operator execution.

---

### 2. Formal Mass & Energy Transfer Balances

Let cell state vector $\mathbf{S}_i$ be defined as:
$$\mathbf{S}_i = \begin{bmatrix} M_{C, i} \\ M_{N, i} \\ M_{P, i} \\ M_{\text{H}_2\text{O}, i} \\ M_{\text{O}_2, i} \\ U_i \end{bmatrix} \quad (\text{kg or J})$$

#### 2.1 Advective & Diffusive Inter-Cell Flux
The net flux vector $\mathbf{J}_{ij}$ from cell $i$ to cell $j$ over time interval $\Delta t$ is governed by hydraulic gradient $\Delta h_{ij} = h_i - h_j$, thermal gradient $\Delta T_{ij} = T_i - T_j$, and concentration gradients $\Delta C_{k, ij} = \frac{M_{k, i}}{V_i} - \frac{M_{k, j}}{V_j}$:

$$\Delta M_{\text{H}_2\text{O}, ij} = \Delta t \cdot \sigma_{ij} \cdot \frac{K_{\text{hyd}} \cdot A_{ij}}{d_{ij}} (h_i - h_j)$$
$$\Delta M_{k, ij} = \Delta t \cdot \left( v_{ij} A_{ij} \bar{C}_{k, ij} + \frac{D_k A_{ij}}{d_{ij}} \Delta C_{k, ij} \right) \quad \text{for } k \in \{C, N, P, \text{O}_2\}$$
$$\Delta U_{ij} = \Delta t \cdot \left( c_w \Delta M_{\text{H}_2\text{O}, ij} \bar{T}_{ij} + \frac{\kappa_{\text{therm}} A_{ij}}{d_{ij}} (T_i - T_j) \right)$$

Where:
- $d_{ij} = \text{GreatCircleDistance}(\mathbf{x}_i, \mathbf{x}_j)$
- $A_{ij}$ is the shared cell edge length $\times$ effective fluid depth
- $\sigma_{ij} \in \{0, 1\}$ is the topological adjacency indicator
- Conservation requires anti-symmetry: $\mathbf{J}_{ji} = -\mathbf{J}_{ij}$

#### 2.2 Continuity & Conservation Delta Equations
For any conserved component $\alpha \in \{C, N, P, \text{H}_2\text{O}, \text{O}_2, U\}$:
$$\Delta S_{i, \alpha} = -\sum_{j \in \mathcal{N}(i)} J_{ij, \alpha}$$
$$\Delta S_{j, \alpha} = +\sum_{i \in \mathcal{N}(j)} J_{ij, \alpha}$$
$$\sum_{i} \Delta S_{i, \alpha} \equiv 0 \quad (\text{isolated closure})$$

---

### 3. Coordinate Boundary Domain Formulation

$$\mathcal{D}_{\text{geo}} = \left\{ (\phi, \lambda) \in \mathbb{R}^2 \;\middle|\; -\frac{\pi}{2} - \epsilon \le \phi \le \frac{\pi}{2} + \epsilon \;\land\; -\pi - \epsilon \le \lambda \le \pi + \epsilon \right\}$$

In degrees:
$$\phi \in [-90.0 - \epsilon, +90.0 + \epsilon], \quad \lambda \in [-180.0 - \epsilon, +180.0 + \epsilon]$$
With IEEE 754 checks:
$$\text{Number.isFinite}(\phi) \land \neg\text{isNaN}(\phi) \land \text{Number.isFinite}(\lambda) \land \neg\text{isNaN}(\lambda)$$

Optional normalized positive longitude domain $\mathcal{D}_{\text{geo}}^{360}$:
$$\lambda \in [-180.0 - \epsilon, +360.0 + \epsilon]$$

---

### 4. Executable Monad Method Specifications

#### 4.1 Coordinate Guard & Geodesic Distance Operator

```typescript
import { CoordinateBoundaryError } from './h3_adjacency';

export interface ICoordinatePair {
  lat: number;
  lon: number;
}

export interface CoordinateValidationOptions {
  context?: string;
  allowNormalizedPositiveLon?: boolean;
  epsilon?: number;
}

/**
 * Asserts coordinate validity on spherical manifold S^2.
 */
export function assertValidCoordinatePair(
  latOrCoords: number | { lat?: number; lon?: number; latitude?: number; longitude?: number },
  lonOrOptions?: number | CoordinateValidationOptions | string,
  maybeOptions?: CoordinateValidationOptions | string
): asserts latOrCoords is number {
  let lat: number;
  let lon: number;
  let options: CoordinateValidationOptions | undefined;

  if (typeof latOrCoords === 'object' && latOrCoords !== null) {
    lat = (latOrCoords as any).lat !== undefined ? (latOrCoords as any).lat : (latOrCoords as any).latitude;
    lon = (latOrCoords as any).lon !== undefined ? (latOrCoords as any).lon : (latOrCoords as any).longitude;
    if (typeof lonOrOptions === 'string') {
      options = { context: lonOrOptions };
    } else if (typeof lonOrOptions === 'object') {
      options = lonOrOptions;
    }
  } else {
    lat = latOrCoords as number;
    lon = lonOrOptions as number;
    if (typeof maybeOptions === 'string') {
      options = { context: maybeOptions };
    } else if (typeof maybeOptions === 'object') {
      options = maybeOptions;
    }
  }

  const context = options?.context;
  const epsilon = options?.epsilon ?? 1e-9;
  const allowPositive360 = options?.allowNormalizedPositiveLon ?? false;

  // Type & NaN / Infinite checks
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(
      `Coordinate values must be finite numbers; received lat=${lat}, lon=${lon}`,
      lat,
      lon,
      context
    );
  }

  // Latitude check [-90, +90]
  if (lat < -90 - epsilon || lat > 90 + epsilon) {
    throw new CoordinateBoundaryError(
      `Latitude must be within [-90, +90] degrees; received ${lat}`,
      lat,
      lon,
      context
    );
  }

  // Longitude check [-180, +180] or [-180, +360]
  const maxLon = allowPositive360 ? 360 + epsilon : 180 + epsilon;
  const minLon = -180 - epsilon;
  if (lon < minLon || lon > maxLon) {
    throw new CoordinateBoundaryError(
      `Longitude must be within [${minLon}, ${maxLon}] degrees; received ${lon}`,
      lat,
      lon,
      context
    );
  }
}
```

#### 4.2 Conserved Spatial Transport Monad (`SpatialTransportMonad`)

```typescript
export interface BiogeochemicalStock {
  carbonKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  waterKg: number;
  oxygenKg: number;
  thermalJoules: number;
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: BiogeochemicalStock;
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  private constructor(private readonly nodes: ReadonlyMap<string, CellNode>) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon, `SpatialTransportMonad.init[${n.cellId}]`);
      map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
    return new SpatialTransportMonad(map);
  }

  /**
   * Executes conservative advective-diffusive flux between adjacent cells.
   * Guarantees 100% mass and energy conservation: Delta_i = -Delta_j.
   */
  public stepAdvection(
    fromId: string,
    toId: string,
    crossSectionAreaM2: number,
    dtSeconds: number,
    conductivityMPerS: number = 1e-4
  ): SpatialTransportMonad {
    const nodeFrom = this.nodes.get(fromId);
    const nodeTo = this.nodes.get(toId);

    if (!nodeFrom || !nodeTo) {
      throw new Error(`Nodes ${fromId} or ${toId} missing in SpatialTransportMonad`);
    }

    // Guard coordinate integrity at boundary interface
    assertValidCoordinatePair(nodeFrom.coords.lat, nodeFrom.coords.lon, `stepAdvection.origin[${fromId}]`);
    assertValidCoordinatePair(nodeTo.coords.lat, nodeTo.coords.lon, `stepAdvection.target[${toId}]`);

    // Calculate Geodesic Distance safely
    const distMeters = this.computeHaversineDistance(
      nodeFrom.coords.lat,
      nodeFrom.coords.lon,
      nodeTo.coords.lat,
      nodeTo.coords.lon
    );

    if (distMeters <= 0) {
      throw new RangeError(`Degenerate cell separation distance: ${distMeters} m`);
    }

    // Hydraulic gradient
    const deltaH = nodeFrom.hydraulicHeadMeters - nodeTo.hydraulicHeadMeters;
    // Water volumetric flux (m^3 / s) = K * A * (dh / d)
    const volumetricRateM3PerS = conductivityMPerS * crossSectionAreaM2 * (deltaH / distMeters);
    const waterDensity = 1000.0; // kg / m^3
    let waterFluxKg = volumetricRateM3PerS * waterDensity * dtSeconds;

    // Constrain water flux to available stock (limit flow to avoid negative stocks)
    if (waterFluxKg > 0) {
      waterFluxKg = Math.min(waterFluxKg, nodeFrom.stock.waterKg * 0.5);
    } else {
      waterFluxKg = -Math.min(-waterFluxKg, nodeTo.stock.waterKg * 0.5);
    }

    // Solute tracking: Advective entrainment ratio
    const fromVol = Math.max(nodeFrom.stock.waterKg / waterDensity, 1.0);
    const toVol = Math.max(nodeTo.stock.waterKg / waterDensity, 1.0);

    const calcSoluteFlux = (stockFrom: number, stockTo: number): number => {
      if (waterFluxKg >= 0) {
        const conc = stockFrom / fromVol;
        return (waterFluxKg / waterDensity) * conc;
      } else {
        const conc = stockTo / toVol;
        return (waterFluxKg / waterDensity) * conc;
      }
    };

    const carbonFluxKg = calcSoluteFlux(nodeFrom.stock.carbonKg, nodeTo.stock.carbonKg);
    const nitrogenFluxKg = calcSoluteFlux(nodeFrom.stock.nitrogenKg, nodeTo.stock.nitrogenKg);
    const phosphorusFluxKg = calcSoluteFlux(nodeFrom.stock.phosphorusKg, nodeTo.stock.phosphorusKg);
    const oxygenFluxKg = calcSoluteFlux(nodeFrom.stock.oxygenKg, nodeTo.stock.oxygenKg);

    // Thermal flux: Advective heat + conduction
    const specificHeatWater = 4184; // J / (kg * K)
    const avgTemp = (nodeFrom.temperatureKelvin + nodeTo.temperatureKelvin) / 2.0;
    const advectiveHeatJoules = waterFluxKg * specificHeatWater * avgTemp;
    const thermalCondCoeff = 0.6; // W / (m * K)
    const conductiveHeatJoules =
      (thermalCondCoeff * crossSectionAreaM2 * (nodeFrom.temperatureKelvin - nodeTo.temperatureKelvin) / distMeters) * dtSeconds;
    const totalThermalFluxJoules = advectiveHeatJoules + conductiveHeatJoules;

    // Apply strictly conservative delta updates
    const nextMap = new Map(this.nodes);

    const nextFrom: CellNode = {
      ...nodeFrom,
      stock: {
        carbonKg: nodeFrom.stock.carbonKg - carbonFluxKg,
        nitrogenKg: nodeFrom.stock.nitrogenKg - nitrogenFluxKg,
        phosphorusKg: nodeFrom.stock.phosphorusKg - phosphorusFluxKg,
        waterKg: nodeFrom.stock.waterKg - waterFluxKg,
        oxygenKg: nodeFrom.stock.oxygenKg - oxygenFluxKg,
        thermalJoules: nodeFrom.stock.thermalJoules - totalThermalFluxJoules,
      },
    };

    const nextTo: CellNode = {
      ...nodeTo,
      stock: {
        carbonKg: nodeTo.stock.carbonKg + carbonFluxKg,
        nitrogenKg: nodeTo.stock.nitrogenKg + nitrogenFluxKg,
        phosphorusKg: nodeTo.stock.phosphorusKg + phosphorusFluxKg,
        waterKg: nodeTo.stock.waterKg + waterFluxKg,
        oxygenKg: nodeTo.stock.oxygenKg + oxygenFluxKg,
        thermalJoules: nodeTo.stock.thermalJoules + totalThermalFluxJoules,
      },
    };

    nextMap.set(fromId, nextFrom);
    nextMap.set(toId, nextTo);

    return new SpatialTransportMonad(nextMap);
  }

  private computeHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371008.8; // Mean Earth radius in meters (WGS84 spherical equivalent)
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180.0;

    const a =
      Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const clampedA = Math.min(1.0, Math.max(0.0, a));
    return 2.0 * R * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1.0 - clampedA));
  }

  public get(cellId: string): CellNode | undefined {
    return this.nodes.get(cellId);
  }
}
```

---

### 5. Numerical Stability, Quantized Conservation & Validation Matrix

| Parameter / Variable | Unit | Minimum Bounds | Maximum Bounds | Tolerance ($\epsilon$) | Invariant Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| $\phi$ (Latitude) | $\text{deg}$ | $-90.0$ | $+90.0$ | $1 \times 10^{-9}$ | No pole overflow |
| $\lambda$ (Longitude standard) | $\text{deg}$ | $-180.0$ | $+180.0$ | $1 \times 10^{-9}$ | Antimeridian closure |
| $\lambda_{360}$ (Longitude positive) | $\text{deg}$ | $-180.0$ | $+360.0$ | $1 \times 10^{-9}$ | Wrapped coordinate support |
| $d_{ij}$ (Distance) | $\text{m}$ | $> 0.0$ | $2.0015 \times 10^7$ | $1 \times 10^{-4}$ | Strict metric positivity |
| $\sum \Delta M_k$ | $\text{kg}$ | $0.0$ | $0.0$ | $0.0$ (exact bitwise match) | Exact mass conservation |
| $\sum \Delta U$ | $\text{J}$ | $0.0$ | $0.0$ | $0.0$ (exact bitwise match) | First Law thermal closure |