# Sprint 058 — Methods Specification: Spherical Boundary Midpoint & Interfacial Flux Monad

## 1. Mathematical & Biophysical Geodesic Foundations

### 1.1 Great-Circle Boundary Midpoint Formulation
Let two adjacent H3 hexagonal cell centroids be $C_1 = (\phi_1, \lambda_1)$ and $C_2 = (\phi_2, \lambda_2)$, where $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ denotes geocentric latitude in radians and $\lambda \in [-\pi, \pi)$ denotes geocentric longitude in radians.

Planar arithmetic averaging ($\frac{\phi_1+\phi_2}{2}, \frac{\lambda_1+\lambda_2}{2}$) breaks down across the antimeridian ($\lambda = \pm \pi$) and distorts distance metrics near the poles ($\phi \to \pm \frac{\pi}{2}$). To maintain metric and flux tensor invariance across the spherical surface $\mathbb{S}^2$, coordinates are embedded in 3D Euclidean space $\mathbb{R}^3$ via unit direction cosines (n-vectors):

$$\mathbf{v}_i = \begin{bmatrix} x_i \\ y_i \\ z_i \end{bmatrix} = \begin{bmatrix} \cos\phi_i \cos\lambda_i \\ \cos\phi_i \sin\lambda_i \\ \sin\phi_i \end{bmatrix}, \quad i \in \{1, 2\}$$

The unnormalized chord midpoint vector is:
$$\mathbf{v}_m' = \mathbf{v}_1 + \mathbf{v}_2 = \begin{bmatrix} \cos\phi_1 \cos\lambda_1 + \cos\phi_2 \cos\lambda_2 \\ \cos\phi_1 \sin\lambda_1 + \cos\phi_2 \sin\lambda_2 \\ \sin\phi_1 + \sin\phi_2 \end{bmatrix}$$

The Euclidean chord length norm is:
$$\|\mathbf{v}_m'\| = \sqrt{(x_1 + x_2)^2 + (y_1 + y_2)^2 + (z_1 + z_2)^2}$$

Because $C_1$ and $C_2$ are adjacent H3 cells (resolution $r \ge 0$), their central angular separation satisfies $\Delta\sigma \le 0.1745\text{ rad} \approx 10^\circ \ll \pi$, guaranteeing $\|\mathbf{v}_m'\| > 1.984 \gg 0$, which strictly precludes antipodal singularities.

The projected spherical midpoint unit vector $\hat{\mathbf{v}}_m \in \mathbb{S}^2$ is:
$$\hat{\mathbf{v}}_m = \frac{\mathbf{v}_m'}{\|\mathbf{v}_m'\|} = \begin{bmatrix} x_m \\ y_m \\ z_m \end{bmatrix}$$

Re-projecting to spherical geocentric coordinates $(\phi_m, \lambda_m)$:
$$\phi_m = \operatorname{atan2}\left(z_m, \sqrt{x_m^2 + y_m^2}\right)$$
$$\lambda_m = \operatorname{atan2}\left(y_m, x_m\right)$$

In decimal degrees:
$$\Phi_m = \phi_m \cdot \frac{180}{\pi}, \quad \Lambda_m = \lambda_m \cdot \frac{180}{\pi}$$
where $\Lambda_m$ is normalized to $[-180, 180)$ via:
$$\Lambda_m \leftarrow ((\Lambda_m + 180) \bmod 360) - 180$$

### 1.2 Geodesic Metric Invariants
Let $R_\oplus = 6,371,008.8\text{ m}$ denote the mean volumetric Earth radius.
1. **Central Angular Separation**:
   $$\Delta\sigma_{12} = 2 \arcsin\left(\frac{1}{2} \|\mathbf{v}_2 - \mathbf{v}_1\|\right) = 2 \arcsin\left(\frac{1}{2} \sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2}\right)$$
2. **Great-Circle Centroid Distance**:
   $$d_{12} = R_\oplus \Delta\sigma_{12}$$
3. **Midpoint Equidistance & Geodesic Collinearity**:
   $$d(C_1, \mathcal{M}) = d(C_2, \mathcal{M}) = \frac{1}{2} d_{12}$$
4. **Interface Contact Length**:
   For regular hexagonal cells at H3 resolution $r$, with centroid distance $d_{12}$, the shared boundary edge length $L_{12}$ is:
   $$L_{12} = \frac{d_{12}}{\sqrt{3}}$$

---

## 2. Interfacial Thermodynamic Transfer Dynamics

Interfacial mass and energy transport occurs across boundary $\partial \Omega_{12} = \Omega_1 \cap \Omega_2$ of cross-sectional area $A_{12} = L_{12} \cdot H_{\text{eff}}$, where $H_{\text{eff}}$ is the effective boundary layer thickness (atmospheric boundary layer $H_{\text{atm}} \approx 1000\text{ m}$ or ocean mixed layer $H_{\text{ocn}} \approx 100\text{ m}$).

All interfacial transport processes are evaluated at the geodesic midpoint $\mathcal{M}(C_1, C_2)$.

### 2.1 Midpoint Environmental Forcing Factors
Physical fluxes across $\partial \Omega_{12}$ depend on dynamic physical parameters evaluated at $\mathcal{M}$:
1. **Coriolis Parameter at Midpoint**:
   $$f_m = 2 \Omega_\oplus \sin(\phi_m), \quad \Omega_\oplus = 7.2921159 \times 10^{-5}\text{ rad/s}$$
2. **Solar Zenith Angle at Midpoint at Time $t$**:
   $$\cos\theta_z(t) = \sin\phi_m \sin\delta_\odot(t) + \cos\phi_m \cos\delta_\odot(t) \cos h_\odot(\lambda_m, t)$$
   where $\delta_\odot(t)$ is solar declination and $h_\odot$ is the local hour angle at $\lambda_m$.
3. **Midpoint Solar Irradiance**:
   $$I_{\text{mid}}(t) = S_0 \cdot \max(0, \cos\theta_z(t))$$
   where $S_0 = 1361.0\text{ W/m}^2$.

---

## 3. Stock Transfer Equations and Finite-Volume Deliberations

Let time step be $\Delta t\text{ [s]}$. For any conserved stock $X_i \in \{C_i, W_i, M_i, O_i, E_i\}$ in cell $i \in \{1, 2\}$, the discrete boundary update is:
$$X_1(t + \Delta t) = X_1(t) - \Delta X_{1 \to 2}$$
$$X_2(t + \Delta t) = X_2(t) + \Delta X_{1 \to 2}$$

This formulation intrinsically satisfies the First Law of Thermodynamics:
$$\Delta X_1 + \Delta X_2 \equiv 0$$

### 3.1 Water Stock Transfer ($\Delta W_{1 \to 2}$) [kg H₂O]
Water moves via advection driven by the interfacial normal velocity $u_{12}$ and diffusion down the specific vapor humidity gradient $\nabla q$:

$$\bar{q}_{12} = \begin{cases} q_1 & \text{if } u_{12} \ge 0 \\ q_2 & \text{if } u_{12} < 0 \end{cases} \quad \text{(Upwind advection concentration)}$$

$$J_{W, \text{adv}} = \rho_{\text{air}} \cdot u_{12} \cdot \bar{q}_{12} \quad \left[\frac{\text{kg}}{\text{m}^2 \cdot \text{s}}\right]$$
$$J_{W, \text{diff}} = - D_W \cdot \rho_{\text{air}} \cdot \frac{q_2 - q_1}{d_{12}} \quad \left[\frac{\text{kg}}{\text{m}^2 \cdot \text{s}}\right]$$

$$\Delta W_{1 \to 2} = (J_{W, \text{adv}} + J_{W, \text{diff}}) \cdot A_{12} \cdot \Delta t \quad [\text{kg}]$$
where $\rho_{\text{air}} = \frac{P_{\text{mid}}}{R_{\text{specific}} T_{\text{mid}}}$ evaluated at $\mathcal{M}(C_1, C_2)$.

### 3.2 Carbon Stock Transfer ($\Delta C_{1 \to 2}$) [kg C]
Atmospheric $\text{CO}_2$ and oceanic Dissolved Inorganic Carbon (DIC) transfer:

$$\bar{c}_{12} = \begin{cases} c_1 & \text{if } u_{12} \ge 0 \\ c_2 & \text{if } u_{12} < 0 \end{cases} \quad [\text{kg C / m}^3]$$

$$J_{C, \text{adv}} = u_{12} \cdot \bar{c}_{12} \quad \left[\frac{\text{kg C}}{\text{m}^2 \cdot \text{s}}\right]$$
$$J_{C, \text{diff}} = - K_C \cdot \frac{c_2 - c_1}{d_{12}} \quad \left[\frac{\text{kg C}}{\text{m}^2 \cdot \text{s}}\right]$$

$$\Delta C_{1 \to 2} = (J_{C, \text{adv}} + J_{C, \text{diff}}) \cdot A_{12} \cdot \Delta t \quad [\text{kg C}]$$

### 3.3 Oxygen Stock Transfer ($\Delta O_{1 \to 2}$) [kg O₂]
Interfacial dissolved or gaseous oxygen exchange:

$$\bar{o}_{12} = \begin{cases} o_1 & \text{if } u_{12} \ge 0 \\ o_2 & \text{if } u_{12} < 0 \end{cases} \quad [\text{kg O}_2\text{ / m}^3]$$

$$J_{O, \text{adv}} = u_{12} \cdot \bar{o}_{12} \quad \left[\frac{\text{kg O}_2}{\text{m}^2 \cdot \text{s}}\right]$$
$$J_{O, \text{diff}} = - K_O \cdot \frac{o_2 - o_1}{d_{12}} \quad \left[\frac{\text{kg O}_2}{\text{m}^2 \cdot \text{s}}\right]$$

$$\Delta O_{1 \to 2} = (J_{O, \text{adv}} + J_{O, \text{diff}}) \cdot A_{12} \cdot \Delta t \quad [\text{kg O}_2]$$

### 3.4 Mineral/Nutrient Transfer ($\Delta M_{1 \to 2}$) [kg Mineral]
Dissolved phosphorus, reactive nitrogen, and mineral sediment flux:

$$\bar{m}_{12} = \begin{cases} m_1 & \text{if } u_{12} \ge 0 \\ m_2 & \text{if } u_{12} < 0 \end{cases} \quad [\text{kg mineral / m}^3]$$

$$J_{M, \text{adv}} = u_{12} \cdot \bar{m}_{12} \quad \left[\frac{\text{kg mineral}}{\text{m}^2 \cdot \text{s}}\right]$$
$$J_{M, \text{diff}} = - K_M \cdot \frac{m_2 - m_1}{d_{12}} \quad \left[\frac{\text{kg mineral}}{\text{m}^2 \cdot \text{s}}\right]$$

$$\Delta M_{1 \to 2} = (J_{M, \text{adv}} + J_{M, \text{diff}}) \cdot A_{12} \cdot \Delta t \quad [\text{kg mineral}]$$

### 3.5 Energy Stock Transfer ($\Delta E_{1 \to 2}$) [Joules]
Enthalpy advection and thermal conduction across $\partial \Omega_{12}$:

$$\bar{T}_{12} = \begin{cases} T_1 & \text{if } u_{12} \ge 0 \\ T_2 & \text{if } u_{12} < 0 \end{cases} \quad [\text{K}]$$

$$J_{E, \text{adv}} = \rho C_p \cdot u_{12} \cdot \bar{T}_{12} \quad \left[\frac{\text{J}}{\text{m}^2 \cdot \text{s}}\right]$$
$$J_{E, \text{cond}} = - k_{\text{thermal}} \cdot \frac{T_2 - T_1}{d_{12}} \quad \left[\frac{\text{J}}{\text{m}^2 \cdot \text{s}}\right]$$
$$J_{E, \text{latent}} = L_v \cdot (J_{W, \text{adv}} + J_{W, \text{diff}}) \quad \left[\frac{\text{J}}{\text{m}^2 \cdot \text{s}}\right]$$
where $L_v = 2.501 \times 10^6\text{ J/kg}$ is the latent heat of vaporization of water.

$$\Delta E_{1 \to 2} = (J_{E, \text{adv}} + J_{E, \text{cond}} + J_{E, \text{latent}}) \cdot A_{12} \cdot \Delta t \quad [\text{J}]$$

### 3.6 Entropy Generation (Second Law Compliance)
For purely diffusive/conductive interfacial fluxes, entropy generation rate $d S_{\text{ent}} / dt$ is:
$$\frac{dS_{\text{ent}}}{dt} = A_{12} \cdot \left[ k_{\text{thermal}} \frac{(T_2 - T_1)^2}{T_1 T_2 d_{12}} + \sum_k R_k K_k \frac{(c_{k, 2} - c_{k, 1})^2}{\bar{c}_{k, 12} d_{12}} \right] \ge 0$$
Accurate evaluation of $d_{12}$ and midpoint states guarantees strictly non-negative entropy production without numerical anti-diffusion.

---

## 4. Executable Monad Method Specifications

### 4.1 `computeBoundaryMidpointLatLng`
Pure geodesic calculation of the spherical great-circle midpoint.

```typescript
export interface LatLng {
  readonly lat: number; // [-90, 90]
  readonly lng: number; // [-180, 180)
}

export function computeBoundaryMidpointLatLng(coord1: LatLng, coord2: LatLng): LatLng;
```

#### Preconditions
- $-90.0 \le \text{coord1.lat}, \text{coord2.lat} \le 90.0$
- $-180.0 \le \text{coord1.lng}, \text{coord2.lng} \le 180.0$
- Hexels are non-antipodal: $d(C_1, C_2) < \pi R_\oplus - \epsilon$

#### Invariants & Postconditions
- $\text{Midpoint.lat} \in [-90.0, 90.0]$
- $\text{Midpoint.lng} \in [-180.0, 180.0)$
- Symmetry: `computeBoundaryMidpointLatLng(C1, C2) === computeBoundaryMidpointLatLng(C2, C1)` within $10^{-12}$ rad.
- Idempotence: `computeBoundaryMidpointLatLng(C1, C1) === C1`.
- Equidistance: $|d(C_1, M) - d(C_2, M)| < 10^{-6}\text{ m}$.

### 4.2 `evaluateBoundaryInterface`
Constructs the complete geometric interface between adjacent H3 cells.

```typescript
export interface H3BoundaryInterface {
  readonly originHex: string;
  readonly neighborHex: string;
  readonly midpoint: LatLng;
  readonly distanceMeters: number;
  readonly contactLengthMeters: number;
  readonly normalAzimuthDegrees: number;
  readonly midpointCoriolisParameter: number;
}

export function evaluateBoundaryInterface(
  originHex: string,
  neighborHex: string,
  coord1: LatLng,
  coord2: LatLng
): H3BoundaryInterface;
```

### 4.3 Monadic Interfacial Flux Step: `stepBoundaryFlux`

```typescript
export interface CellStockState {
  readonly carbonKg: number;
  readonly waterKg: number;
  readonly oxygenKg: number;
  readonly mineralsKg: number;
  readonly energyJoules: number;
  readonly temperatureKelvin: number;
  readonly specificHumidity: number;
  readonly dicConcentration: number;
}

export interface InterfacialFluxDeltas {
  readonly deltaCarbonKg: number;
  readonly deltaWaterKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaEnergyJoules: number;
}

export class SpatialBoundaryMonad {
  private constructor(
    private readonly state1: CellStockState,
    private readonly state2: CellStockState,
    private readonly boundary: H3BoundaryInterface
  ) {}

  public static of(
    state1: CellStockState,
    state2: CellStockState,
    boundary: H3BoundaryInterface
  ): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(state1, state2, boundary);
  }

  /**
   * Computes conservative mass and energy transfer across the midpoint boundary.
   * Enforces exact First Law anti-symmetry (sum of deltas = 0).
   */
  public computeTransfer(
    normalVelocityMs: number,
    effectiveHeightMeters: number,
    deltaSeconds: number,
    diffusionCoeffs: {
      diffWater: number;
      diffCarbon: number;
      diffOxygen: number;
      diffMinerals: number;
      thermalCond: number;
    }
  ): [CellStockState, CellStockState, InterfacialFluxDeltas] {
    const area = this.boundary.contactLengthMeters * effectiveHeightMeters;
    const dist = this.boundary.distanceMeters;

    // Upwind advective concentrations
    const qAdv = normalVelocityMs >= 0 ? this.state1.specificHumidity : this.state2.specificHumidity;
    const cAdv = normalVelocityMs >= 0 ? this.state1.carbonKg : this.state2.carbonKg;
    const oAdv = normalVelocityMs >= 0 ? this.state1.oxygenKg : this.state2.oxygenKg;
    const mAdv = normalVelocityMs >= 0 ? this.state1.mineralsKg : this.state2.mineralsKg;
    const tAdv = normalVelocityMs >= 0 ? this.state1.temperatureKelvin : this.state2.temperatureKelvin;

    // Density at boundary midpoint
    const rhoMid = 1.225; // kg/m3 atmospheric base
    const cp = 1005.0;     // J/(kg K)
    const lv = 2.501e6;    // J/kg

    // Water delta
    const jWAdv = rhoMid * normalVelocityMs * qAdv;
    const jWDiff = -diffusionCoeffs.diffWater * rhoMid * (this.state2.specificHumidity - this.state1.specificHumidity) / dist;
    const deltaWater = (jWAdv + jWDiff) * area * deltaSeconds;

    // Carbon delta
    const jCAdv = normalVelocityMs * (cAdv / (area * dist));
    const jCDiff = -diffusionCoeffs.diffCarbon * (this.state2.carbonKg - this.state1.carbonKg) / dist;
    const deltaCarbon = (jCAdv + jCDiff) * area * deltaSeconds;

    // Oxygen delta
    const jOAdv = normalVelocityMs * (oAdv / (area * dist));
    const jODiff = -diffusionCoeffs.diffOxygen * (this.state2.oxygenKg - this.state1.oxygenKg) / dist;
    const deltaOxygen = (jOAdv + jODiff) * area * deltaSeconds;

    // Minerals delta
    const jMAdv = normalVelocityMs * (mAdv / (area * dist));
    const jMDiff = -diffusionCoeffs.diffMinerals * (this.state2.mineralsKg - this.state1.mineralsKg) / dist;
    const deltaMinerals = (jMAdv + jMDiff) * area * deltaSeconds;

    // Energy delta (advective enthalpy + thermal conduction + latent heat)
    const jEAdv = rhoMid * cp * normalVelocityMs * tAdv;
    const jECond = -diffusionCoeffs.thermalCond * (this.state2.temperatureKelvin - this.state1.temperatureKelvin) / dist;
    const jELatent = lv * (jWAdv + jWDiff);
    const deltaEnergy = (jEAdv + jECond + jELatent) * area * deltaSeconds;

    const deltas: InterfacialFluxDeltas = {
      deltaCarbonKg: deltaCarbon,
      deltaWaterKg: deltaWater,
      deltaOxygenKg: deltaOxygen,
      deltaMineralsKg: deltaMinerals,
      deltaEnergyJoules: deltaEnergy,
    };

    const nextState1: CellStockState = {
      ...this.state1,
      carbonKg: this.state1.carbonKg - deltaCarbon,
      waterKg: this.state1.waterKg - deltaWater,
      oxygenKg: this.state1.oxygenKg - deltaOxygen,
      mineralsKg: this.state1.mineralsKg - deltaMinerals,
      energyJoules: this.state1.energyJoules - deltaEnergy,
    };

    const nextState2: CellStockState = {
      ...this.state2,
      carbonKg: this.state2.carbonKg + deltaCarbon,
      waterKg: this.state2.waterKg + deltaWater,
      oxygenKg: this.state2.oxygenKg + deltaOxygen,
      mineralsKg: this.state2.mineralsKg + deltaMinerals,
      energyJoules: this.state2.energyJoules + deltaEnergy,
    };

    return [nextState1, nextState2, deltas];
  }
}
```

---

## 5. Numerical Accuracy & Stability Constraints

1. **Courant-Friedrichs-Lewy (CFL) Condition**:
   $$\Delta t \le \min\left( \frac{d_{12}}{|u_{12}|_{\max}}, \frac{d_{12}^2}{2 D_{\max}} \right)$$
   For H3 resolution 3 ($d_{12} \approx 110\text{ km}$), with atmospheric wind speed $u_{\max} \approx 50\text{ m/s}$ and eddy diffusivity $D_{\max} \approx 10^5\text{ m}^2/\text{s}$:
   $$\Delta t_{\text{adv}} \le \frac{110 \times 10^3}{50} = 2200\text{ s}$$
   $$\Delta t_{\text{diff}} \le \frac{(110 \times 10^3)^2}{2 \times 10^5} = 6.05 \times 10^4\text{ s}$$
   Simulation timestep $\Delta t = 900\text{ s}$ (15 min) comfortably satisfies numerical stability.

2. **Antimeridian Phase Unwrapping**:
   Longitudes in $\lambda \in [-\pi, \pi)$ cross discontinuous jumps from $+180^\circ$ to $-180^\circ$. By calculating via the 3D unit vector projection $\mathbf{v} \in \mathbb{R}^3$, longitude branching is resolved without trigonometric singularity:
   $$\operatorname{atan2}(y_m, x_m) = \operatorname{atan2}(\sin\lambda_1 + \sin\lambda_2, \cos\lambda_1 + \cos\lambda_2) \quad \text{(at equal latitudes)}$$
   yielding exact antimeridian midpoints (e.g., $179^\circ$ and $-179^\circ$ yields $180.0^\circ$ or $-180.0^\circ$, never $0.0^\circ$).