# Sprint 051: Process Mining & Method Specifications
## H3 Cell Interface Metrics & Boundary Flux Operators

---

## 1. Physical & Environmental Transport Processes

Cross-cell transport on the discrete H3 hexagonal/pentagonal manifold discretizes continuous spatial transport into localized finite-volume boundary transfers. Between any adjacent cell pair $(c_i, c_j)$ sharing an interface metric $M_{ij} \in \mathcal{M}$, physical transport is governed by four primary processes:

1. **Subsurface Saturated/Unsaturated Porous Hydrology (Darcy & Richards Flow)**
   - Driven by hydraulic head gradients $\nabla h_{ij} = \frac{h_j - h_i}{d_{ij}} + \text{topographicSlope}_{ij}$.
   - Flux operates across $A_{ij}^{\text{sub}} = \text{subterraneanContactAreaM2}$.
2. **Surface Runoff & Overland Overland Flow (Saint-Venant / Manning-Strickler Transfer)**
   - Driven by gravitational slope along boundary normal $\nabla z_{ij} = \text{topographicSlope}_{ij}$ and water head differentials.
   - Flux operates across edge length $L_{ij} = \text{sharedEdgeLengthMeters}$.
3. **Atmospheric Advective-Diffusive Heat & Gas Exchange (Planetary Boundary Layer Eddy Transfer)**
   - Driven by wind velocity projection along unit normal $\vec{u} \cdot \hat{n}_{ij}$ and temperature/partial pressure gradients $\frac{\phi_j - \phi_i}{d_{ij}}$.
   - Flux operates across atmospheric cross-section $A_{ij}^{\text{atm}} = \text{atmosphericContactAreaM2}$.
4. **Dissolved Solute, Nutrient & Mineral Advection**
   - Passive advection of dissolved organic carbon ($DOC$), dissolved inorganic carbon ($DIC$), bio-available minerals ($N, P, K$), and dissolved oxygen ($DO$) coupled directly to liquid mass transfers.

---

## 2. Formal Mass and Energy Conservation Deltas

### 2.1 Interface Metric Variables and Constants

For cells $c_i$ and $c_j$ with interface $M_{ij}$:
- $L_{ij} = M_{ij}.\text{sharedEdgeLengthMeters}$ [$\text{m}$]
- $d_{ij} = M_{ij}.\text{centroidDistanceMeters}$ [$\text{m}$]
- $\hat{n}_{ij} = M_{ij}.\text{normalVector}$ [dimensionless unit vector in tangent plane]
- $S_{ij} = M_{ij}.\text{topographicSlope} = \frac{z_j - z_i}{d_{ij}}$ [dimensionless]
- $\gamma_{ij} = M_{ij}.\text{geometricConductance} = \frac{L_{ij}}{d_{ij}}$ [dimensionless]
- $A_{ij}^{\text{atm}} = M_{ij}.\text{atmosphericContactAreaM2}$ [$\text{m}^2$]
- $A_{ij}^{\text{sub}} = M_{ij}.\text{subterraneanContactAreaM2}$ [$\text{m}^2$]
- Time step: $\Delta t$ [$\text{s}$]

---

### 2.2 Subsurface Hydrological Flux (Darcy Flow)

Let $\psi_i, \psi_j$ be matric potentials [$\text{m}$], $K_{\text{sat}}$ saturated hydraulic conductivity [$\text{m}\cdot\text{s}^{-1}$], and $k_r(\theta)$ relative permeability:

$$q_{\text{sub}, i \to j} = - K_{\text{eff}} \left( \frac{\psi_j - \psi_i}{d_{ij}} + S_{ij} \right)$$
$$K_{\text{eff}} = \sqrt{K_i(\theta_i) K_j(\theta_j)}$$
$$J_{w, \text{sub}} = \rho_w A_{ij}^{\text{sub}} q_{\text{sub}, i \to j} \quad [\text{kg}\cdot\text{s}^{-1}]$$

Mass transfer over $\Delta t$:
$$\Delta M_{w, \text{sub}}^{(i \to j)} = J_{w, \text{sub}} \Delta t$$
$$\Delta M_w(c_i) = - \Delta M_{w, \text{sub}}^{(i \to j)}$$
$$\Delta M_w(c_j) = + \Delta M_{w, \text{sub}}^{(i \to j)}$$

---

### 2.3 Surface Runoff Flux (Diffusive Wave Overland Approximation)

Let $h_{w, i}, h_{w, j}$ be surface water depth [$\text{m}$], $n_{\text{manning}}$ roughness [$\text{s}\cdot\text{m}^{-1/3}$]:

$$\mathcal{H}_i = z_i + h_{w, i}, \quad \nabla \mathcal{H}_{ij} = \frac{\mathcal{H}_j - \mathcal{H}_i}{d_{ij}}$$
$$u_{\text{surf}, i \to j} = -\operatorname{sgn}(\nabla \mathcal{H}_{ij}) \frac{1}{n_{\text{manning}}} \bar{h}_w^{2/3} |\nabla \mathcal{H}_{ij}|^{1/2}$$
where $\bar{h}_w = \max\left(0, \frac{h_{w, i} + h_{w, j}}{2}\right)$.

Surface cross-sectional area:
$$A_{ij}^{\text{surf}} = L_{ij} \cdot \bar{h}_w \quad [\text{m}^2]$$
$$J_{w, \text{surf}} = \rho_w A_{ij}^{\text{surf}} u_{\text{surf}, i \to j} \quad [\text{kg}\cdot\text{s}^{-1}]$$

Mass transfer over $\Delta t$:
$$\Delta M_{w, \text{surf}}^{(i \to j)} = J_{w, \text{surf}} \Delta t$$
$$\Delta M_w(c_i) \mathrel{-}= \Delta M_{w, \text{surf}}^{(i \to j)}$$
$$\Delta M_w(c_j) \mathrel{+}= \Delta M_{w, \text{surf}}^{(i \to j)}$$

---

### 2.4 Solute, Carbon, Mineral, and Oxygen Advection

Let $C_{k, i}$ denote the concentration of solute species $k$ in cell $i$ [$\text{kg solute} / \text{kg } H_2O$], where $k \in \{\text{DOC}, \text{DIC}, \text{Minerals}_{N,P,K}, \text{DO}\}$:

Upwind discretization determines the interface solute concentration $C_{k, ij}^*$:
$$C_{k, ij}^* = \begin{cases} 
C_{k, i} & \text{if } J_w^{(i \to j)} \ge 0 \\
C_{k, j} & \text{if } J_w^{(i \to j)} < 0 
\end{cases}$$
where $J_w^{(i \to j)} = J_{w, \text{sub}} + J_{w, \text{surf}}$.

Solute mass delta:
$$\Delta M_k^{(i \to j)} = C_{k, ij}^* \cdot J_w^{(i \to j)} \Delta t$$
$$\Delta M_k(c_i) \mathrel{-}= \Delta M_k^{(i \to j)}$$
$$\Delta M_k(c_j) \mathrel{+}= \Delta M_k^{(i \to j)}$$

---

### 2.5 Atmospheric Sensible & Latent Heat Flux (Boundary Layer Exchange)

Wind vector $\vec{u}_i = [u_{\text{east}}, u_{\text{north}}, u_{\text{up}}]^T$:
$$u_{n, ij} = \frac{\vec{u}_i + \vec{u}_j}{2} \cdot \hat{n}_{ij} \quad [\text{m}\cdot\text{s}^{-1}]$$
Atmospheric air density $\rho_{\text{air}}$, heat capacity $c_p = 1005 \, \text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$, thermal eddy diffusivity $K_T \, [\text{m}^2\cdot\text{s}^{-1}]$:

#### Advective Enthalpy Transfer:
$$J_{H, \text{adv}} = \rho_{\text{air}} c_p A_{ij}^{\text{atm}} u_{n, ij} \cdot \left( \frac{T_i + T_j}{2} \right) \quad [\text{W}]$$

#### Diffusive Heat Transfer (Fourier/Fick Laplacian):
$$J_{H, \text{diff}} = - \rho_{\text{air}} c_p K_T \left( \frac{A_{ij}^{\text{atm}}}{d_{ij}} \right) (T_j - T_i) \quad [\text{W}]$$

Total Enthalpy Delta:
$$\Delta U^{(i \to j)} = (J_{H, \text{adv}} + J_{H, \text{diff}}) \Delta t \quad [\text{J}]$$
$$\Delta U(c_i) \mathrel{-}= \Delta U^{(i \to j)}$$
$$\Delta U(c_j) \mathrel{+}= \Delta U^{(i \to j)}$$

#### Atmospheric Gas Exchange ($CO_2, O_2$):
Let $\chi_{g}$ be mole fraction of gas $g \in \{CO_2, O_2\}$, molar mass $M_{\text{mol}, g}$:
$$J_{g, \text{diff}} = - \rho_{\text{air}} K_g \left( \frac{A_{ij}^{\text{atm}}}{d_{ij}} \right) (\chi_{g, j} - \chi_{g, i}) \cdot M_{\text{mol}, g} \quad [\text{kg}\cdot\text{s}^{-1}]$$
$$\Delta M_g^{(i \to j)} = (u_{n, ij} \rho_{\text{air}} A_{ij}^{\text{atm}} \chi_{g, ij}^* M_{\text{mol}, g} + J_{g, \text{diff}}) \Delta t$$
$$\Delta M_g(c_i) \mathrel{-}= \Delta M_g^{(i \to j)}$$
$$\Delta M_g(c_j) \mathrel{+}= \Delta M_g^{(i \to j)}$$

---

## 3. First and Second Law Invariant Validations

```
        Origin Cell (c_i)                         Neighbor Cell (c_j)
   +-------------------------+               +-------------------------+
   |  Mass: M_w(i), M_c(i)   |               |  Mass: M_w(j), M_c(j)   |
   |  Enthalpy: U(i)         |    M_{ij}     |  Enthalpy: U(j)         |
   |  Elevation: z_i         |  -----------> |  Elevation: z_j         |
   |                         |  Normal n_ij  |                         |
   +-------------------------+               +-------------------------+
                \                                 /
                 \--- Edge Length: L_{ij} -------/
                 \--- Centroid Dist: d_{ij} -----/
                 \--- Area Sub: A_{ij}^{sub} ----/
                 \--- Area Atm: A_{ij}^{atm} ----/

   CONSERVATION INVARIANT (First Law):
   Phi_{i -> j}(Stock) + Phi_{j -> i}(Stock) = 0

   ENTROPY PRODUCTION (Second Law):
   sigma = J_{H, diff} * (1/T_j - 1/T_i) >= 0
```

1. **Antisymmetry**:
   Every flux operator satisfies:
   $$\Phi(c_i, c_j, M_{ij}) = -\Phi(c_j, c_i, M_{ji})$$
2. **Conductance Positivity**:
   $$\gamma_{ij} = \frac{L_{ij}}{d_{ij}} > 0, \quad \gamma_{ij} = \gamma_{ji}$$
3. **Metric Coordinate Inversion**:
   $$\hat{n}_{ij} = -\hat{n}_{ji}$$
   $$S_{ij} = \frac{z_j - z_i}{d_{ij}} = - \frac{z_i - z_j}{d_{ji}} = - S_{ji}$$

---

## 4. Executable Monad Method Specifications

### 4.1 Interface Specification: `H3CellInterfaceMetrics`

File target: `src/spatial/h3_types.ts`

```typescript
/**
 * Metrics describing the shared physical and geometric interface 
 * between two topologically adjacent H3 cells.
 */
export interface H3CellInterfaceMetrics {
  /** Source cell H3 index */
  readonly originIndex: string;

  /** Destination/neighbor cell H3 index */
  readonly neighborIndex: string;

  /**
   * Geodesic length of the shared boundary edge in meters (m).
   * In spherical/ellipsoidal space, this is the length of the Voronoi edge.
   */
  readonly sharedEdgeLengthMeters: number;

  /**
   * Centroid-to-centroid geodesic distance between cells in meters (m).
   */
  readonly centroidDistanceMeters: number;

  /**
   * Azimuth / bearing from origin centroid to neighbor centroid in radians [0, 2π).
   * 0 radians points due North, π/2 East, π South, 3π/2 West.
   */
  readonly bearingRadians: number;

  /**
   * Unit normal vector in local tangent plane (East, North, Up) pointing from origin to neighbor.
   */
  readonly normalVector: readonly [number, number, number];

  /**
   * Effective cross-sectional area of contact for atmospheric boundary layer (m²).
   */
  readonly atmosphericContactAreaM2: number;

  /**
   * Effective cross-sectional area of contact for sub-surface hydrological / soil column (m²).
   */
  readonly subterraneanContactAreaM2: number;

  /**
   * Topographic slope across the interface: (elevation_neighbor - elevation_origin) / centroidDistance.
   * Positive indicates upward incline towards neighbor; negative indicates downward decline.
   */
  readonly topographicSlope: number;

  /**
   * Dimensionless geometric conductance factor: sharedEdgeLength / centroidDistance.
   * Standard scaling factor for 2D finite-volume Laplacian discretization.
   */
  readonly geometricConductance: number;
}

/**
 * Canonical edge key identifying a pair of neighboring H3 cells.
 */
export type H3EdgeId = string;

/**
 * Immutable mapping of neighbor cell indices to their interface metrics.
 */
export type H3NeighborInterfaceMap = ReadonlyMap<string, H3CellInterfaceMetrics>;
```

---

### 4.2 Monad Transfer Method Specifications

To execute interface-driven transfers within `SpatialMonad` and pod state transitions:

```typescript
export interface CellThermodynamicState {
  waterMassKg: number;
  carbonMassKg: number;
  mineralMassKg: number;
  dissolvedOxygenKg: number;
  enthalpyJoules: number;
  elevationMeters: number;
  temperatureKelvin: number;
  soilDepthMeters: number;
}

export interface InterfaceFluxResult {
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaMineralKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnthalpyJoules: number;
  readonly entropyProducedJPerK: number;
}

/**
 * Computes conservative interface flux from cell i to cell j across H3CellInterfaceMetrics.
 */
export function computeInterfaceFlux(
  origin: CellThermodynamicState,
  neighbor: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dtSeconds: number,
  params: {
    kSatPorous: number;
    manningN: number;
    eddyDiffusivityHeat: number;
  }
): InterfaceFluxResult {
  // Preconditions: metric matches origin and neighbor
  if (metrics.originIndex === metrics.neighborIndex) {
    throw new Error('Self-interface flux calculation is undefined.');
  }

  // 1. Subsurface flux (Darcy flow)
  const hydraulicHeadOrigin = origin.elevationMeters;
  const hydraulicHeadNeighbor = neighbor.elevationMeters;
  const gradHead = (hydraulicHeadNeighbor - hydraulicHeadOrigin) / metrics.centroidDistanceMeters;
  
  // Downward gradient accelerates flow: q = -K * gradHead
  const qSub = -params.kSatPorous * gradHead;
  const subFlowRateKgPerS = 1000.0 * metrics.subterraneanContactAreaM2 * qSub; // density 1000 kg/m^3
  const deltaWaterSub = subFlowRateKgPerS * dtSeconds;

  // 2. Diffusive thermal flux across atmospheric boundary
  const conductanceArea = metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters;
  const conductiveHeatFlowWatts = -params.eddyDiffusivityHeat * conductanceArea * (neighbor.temperatureKelvin - origin.temperatureKelvin);
  const deltaEnthalpy = conductiveHeatFlowWatts * dtSeconds;

  // 3. Second law entropy production
  const entropyProduced = conductiveHeatFlowWatts * (1.0 / neighbor.temperatureKelvin - 1.0 / origin.temperatureKelvin) * dtSeconds;
  if (entropyProduced < -1e-9) {
    throw new Error(`Second law violation: negative entropy generated ${entropyProduced}`);
  }

  // 4. Upwind advective scalar concentration
  const netWaterFlux = deltaWaterSub;
  const originWater = Math.max(origin.waterMassKg, 1e-6);
  const neighborWater = Math.max(neighbor.waterMassKg, 1e-6);

  const docRatio = netWaterFlux >= 0 
    ? origin.carbonMassKg / originWater 
    : neighbor.carbonMassKg / neighborWater;

  const mineralRatio = netWaterFlux >= 0 
    ? origin.mineralMassKg / originWater 
    : neighbor.mineralMassKg / neighborWater;

  const doRatio = netWaterFlux >= 0
    ? origin.dissolvedOxygenKg / originWater
    : neighbor.dissolvedOxygenKg / neighborWater;

  const deltaCarbon = docRatio * netWaterFlux;
  const deltaMineral = mineralRatio * netWaterFlux;
  const deltaOxygen = doRatio * netWaterFlux;

  return {
    deltaWaterKg: netWaterFlux,
    deltaCarbonKg: deltaCarbon,
    deltaMineralKg: deltaMineral,
    deltaOxygenKg: deltaOxygen,
    deltaEnthalpyJoules: deltaEnthalpy,
    entropyProducedJPerK: Math.max(0, entropyProduced)
  };
}
```

---

### 4.3 Invariant Verification Table

| Test Identifier | Property Under Test | Preconditions | Mathematical Form | Tolerances |
| :--- | :--- | :--- | :--- | :--- |
| `INV-METRIC-LEN` | Edge Length Symmetry | $M_{ij}, M_{ji}$ instantiated | $L_{ij} = L_{ji}$ | Machine $\epsilon$ ($10^{-12}$) |
| `INV-METRIC-DIST` | Centroid Distance Symmetry | $M_{ij}, M_{ji}$ instantiated | $d_{ij} = d_{ji}$ | Machine $\epsilon$ ($10^{-12}$) |
| `INV-METRIC-NORM` | Normal Vector Inversion | $M_{ij}, M_{ji}$ instantiated | $\hat{n}_{ij} = -\hat{n}_{ji}$ | Absolute $10^{-9}$ |
| `INV-METRIC-SLOPE` | Topographic Slope Inversion | $M_{ij}, M_{ji}$ instantiated | $S_{ij} = -S_{ji}$ | Absolute $10^{-9}$ |
| `INV-METRIC-COND` | Conductance Consistency | $L_{ij} > 0, d_{ij} > 0$ | $\gamma_{ij} = \frac{L_{ij}}{d_{ij}} = \gamma_{ji} > 0$ | Absolute $10^{-9}$ |
| `INV-METRIC-FLUX` | Mass/Energy Conservation | Coupled pair evaluation | $\Phi_{i \to j}(S) + \Phi_{j \to i}(S) = 0$ | Absolute $10^{-9}$ |
| `INV-METRIC-ENTROPY` | Second Law Non-Negativity | Heat transfer evaluation | $\dot{S}_{\text{gen}} \ge 0$ | Absolute $\ge -10^{-12}$ |