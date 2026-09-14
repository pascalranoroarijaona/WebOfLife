# Sprint 042 — Process Mining & Thermodynamic Specification: H3 Spatial State Tensor

**Module Target**: `src/spatial/h3_state_tensor.ts`  
**Related Modules**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`, `src/monads/spatial_monad.ts`  
**Author**: Process Mining & Research Scientist  
**Status**: APPROVED

---

## 1. Thermodynamic Reference Framework & Fundamental Constants

Each discrete H3 hexagonal cell $c \in \mathcal{H}_r$ (where $r$ is the H3 grid resolution) constitutes an open non-equilibrium thermodynamic control volume characterized by:
- Cell horizontal cross-sectional area: $A_c$ [$\text{m}^2$]
- Surface elevation: $z_c$ [$\text{m}$]
- Bounded atmospheric-lithospheric vertical column: $\Delta z_c$ [$\text{m}$]

```
                 Top-of-Atmosphere / Space Boundary (T_space = 2.725 K)
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                                    ^                 |
                 \Phi_{lw}^{out}    |                 | \Phi_{sw}^{in}
             (Stefan-Boltzmann)     |                 v
                               +----+-----------------+----+
                               |     H3 Atmospheric Column |
                               |     Dry Air, H2O Vapor,   |
                               |     CO2, N2, Aerosols     |
                               +----+-----------------+----+
                                    ^                 |
                  Latent & Sensible |                 | Direct Insolation
                       Turbulent    |                 v
                               +----+-----------------+----+
                               |   Surface / Lithosphere   |
   H3 Cell (k) <============== |   Liquid H2O, Ice/Snow,   | ==============> H3 Cell (m)
   Inter-cell Advective/       |   Biomass, Soil Carbon,   | Advective / Diffusive
   Diffusive Mass & Energy     |   Nitrogen, Phosphorus    | Flux Boundary
                               +---------------------------+
```

### 1.1 Universal Physical Constants

| Constant | Symbol | Value | Unit | Definition |
| :--- | :--- | :--- | :--- | :--- |
| **Stefan-Boltzmann Constant** | $\sigma$ | $5.670374419 \times 10^{-8}$ | $\text{W}\cdot\text{m}^{-2}\cdot\text{K}^{-4}$ | Blackbody irradiance scale |
| **Solar Temperature** | $T_{\text{sun}}$ | $5778.0$ | $\text{K}$ | Effective blackbody solar emitter |
| **Deep Space Temperature** | $T_{\text{space}}$ | $2.725$ | $\text{K}$ | Cosmic microwave background sink |
| **Specific Gas Const. (Dry Air)** | $R_d$ | $287.058$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | $R/M_{\text{dry\_air}}$ |
| **Specific Gas Const. (Vapor)** | $R_v$ | $461.520$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | $R/M_{\text{H}_2\text{O}}$ |
| **Isochoric Specific Heat (Dry Air)** | $c_{v, d}$ | $718.0$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | Dry air constant volume heat cap. |
| **Isobaric Specific Heat (Dry Air)** | $c_{p, d}$ | $1005.0$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | Dry air constant pressure heat cap. |
| **Specific Heat (Liquid Water)** | $c_{w}$ | $4184.0$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | Standard liquid phase heat cap. |
| **Specific Heat (Ice/Snow)** | $c_{\text{ice}}$ | $2108.0$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | Solid phase water heat cap. |
| **Specific Heat (Water Vapor)** | $c_{v, \text{vap}}$| $1410.0$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | Constant volume water vapor |
| **Latent Heat of Vaporization** | $L_v$ | $2.501 \times 10^6$ | $\text{J}\cdot\text{kg}^{-1}$ | At $T_0 = 273.15\,\text{K}$ |
| **Latent Heat of Fusion** | $L_f$ | $3.337 \times 10^5$ | $\text{J}\cdot\text{kg}^{-1}$ | At $T_0 = 273.15\,\text{K}$ |
| **Latent Heat of Sublimation** | $L_s$ | $2.834 \times 10^6$ | $\text{J}\cdot\text{kg}^{-1}$ | $L_s = L_v + L_f$ |
| **Specific Heat of Soil Matrix** | $c_{\text{soil}}$ | $840.0$ | $\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$ | Lithospheric mineral fraction |

---

## 2. Scalar Thermodynamic State Vector & Metric Invariants

For each hexagonal index $h \in \mathcal{H}_r$, the state vector $\mathbf{x}_c \in \mathbb{R}^{23}$ is defined by:

$$\mathbf{x}_c = \begin{bmatrix}
A_c & z_c & U_c & T_c & C_{v, c} & \alpha_c & \epsilon_c & \Phi_{\text{sw}, c}^{\text{in}} & \Phi_{\text{sw}, c}^{\text{out}} & \Phi_{\text{lw}, c}^{\text{out}} & \Phi_{\text{sens}, c} & \Phi_{\text{lat}, c} & S_c & \sigma_c & M_d & M_{w} & M_{l} & M_{i} & M_{v} & M_{\text{C}} & M_{\text{N}} & M_{\text{P}}
\end{bmatrix}^T$$

### 2.1 State Variable Constraints and Invariants

1. **Non-Negativity of Temperature and Mass Stocks**:
   $$\forall c: \quad T_c > 0, \quad M_d \ge 0, \quad M_{l} \ge 0, \quad M_{i} \ge 0, \quad M_{v} \ge 0, \quad M_{\text{C}} \ge 0, \quad M_{\text{N}} \ge 0, \quad M_{\text{P}} \ge 0$$

2. **Water Mass Partition Closure**:
   $$M_w = M_l + M_i + M_v \implies |M_w - (M_l + M_i + M_v)| \le 10^{-7} \cdot M_w$$

3. **Composite Column Heat Capacity**:
   $$C_{v, c} = M_d \cdot c_{v, d} + M_l \cdot c_w + M_i \cdot c_{\text{ice}} + M_v \cdot c_{v, \text{vap}} + M_{\text{lith}} \cdot c_{\text{soil}}$$
   Where $M_{\text{lith}} = \rho_{\text{lith}} \cdot A_c \cdot d_{\text{therm}}$, with default active thermal bedrock depth $d_{\text{therm}} = 2.0\,\text{m}$ and $\rho_{\text{lith}} = 2600\,\text{kg/m}^3$.

4. **Internal Thermal Energy Formulation**:
   $$U_c = C_{v, c} \cdot T_c + M_l \cdot L_f + M_v \cdot (L_f + L_v)$$
   Where $T = 0\,\text{K}$ is defined as the zero-energy datum for sensible heat, and phase zero-references are assigned relative to solid ice at $0\,\text{K}$.

5. **Optical Bounds**:
   $$\alpha_c \in [0.0, 1.0], \quad \epsilon_c \in (0.0, 1.0]$$

6. **Second Law Local Irreversibility**:
   $$\sigma_c \ge 0 \quad [\text{W}\cdot\text{K}^{-1}]$$

---

## 3. Physical Process Formulations & Mass/Energy Deltas

### 3.1 Radiative Exchange Process ($\mathcal{P}_{\text{rad}}$)

Insolation absorbed and longwave radiation emitted across the top-of-column boundary during step $\Delta t$:

$$\Phi_{\text{sw}, c}^{\text{out}} = \alpha_c \cdot \Phi_{\text{sw}, c}^{\text{in}}$$
$$\Phi_{\text{sw}, c}^{\text{abs}} = (1 - \alpha_c) \cdot \Phi_{\text{sw}, c}^{\text{in}}$$
$$\Phi_{\text{lw}, c}^{\text{out}} = \epsilon_c \cdot \sigma \cdot T_c^4$$

#### Mass / Energy / Entropy Deltas:
- $\Delta M_k = 0 \quad (\forall k \in \{d, l, i, v, \text{C}, \text{N}, \text{P}\})$
- $\Delta U_{\text{rad}} = \left( (1 - \alpha_c) \cdot \Phi_{\text{sw}, c}^{\text{in}} - \epsilon_c \cdot \sigma \cdot T_c^4 \right) \cdot A_c \cdot \Delta t$
- Entropy exchange with surroundings:
  $$\Delta S_{\text{ext}} = \left( \frac{(1 - \alpha_c)\Phi_{\text{sw}, c}^{\text{in}}}{T_{\text{sun}}} - \frac{\epsilon_c \sigma T_c^4}{T_c} \right) \cdot A_c \cdot \Delta t$$
- Local entropy production due to solar thermal degradation:
  $$\sigma_{\text{rad}} = A_c \cdot (1 - \alpha_c) \cdot \Phi_{\text{sw}, c}^{\text{in}} \cdot \left( \frac{1}{T_c} - \frac{1}{T_{\text{sun}}} \right) \ge 0$$

---

### 3.2 Water Phase Transitions ($\mathcal{P}_{\text{phase}}$)

Liquid-Vapor and Liquid-Ice transitions depend on thermal departure from phase equilibrium $T_{\text{freeze}} = 273.15\,\text{K}$ and saturation vapor pressure $e_s(T)$.

#### 3.2.1 Evaporation / Condensation
Saturation vapor pressure via Tetens formula:
$$e_s(T_c) = 610.78 \exp\left( \frac{17.27 \cdot (T_c - 273.15)}{T_c - 35.85} \right) \quad [\text{Pa}]$$
Saturation vapor mass in cell atmospheric column:
$$M_{v, \text{sat}} = \frac{e_s(T_c) \cdot A_c \cdot H_{\text{atm}}}{R_v \cdot T_c}$$
When $M_v < M_{v, \text{sat}}$ and $M_l > 0$, net evaporation rate $\dot{m}_{\text{evap}}$ ($\text{kg/s}$):
$$\dot{m}_{\text{evap}} = \min\left( \frac{M_l}{\Delta t}, \; K_{\text{evap}} \cdot A_c \cdot \frac{M_{v, \text{sat}} - M_v}{M_{v, \text{sat}}} \right)$$
When $M_v > M_{v, \text{sat}}$, net condensation rate $\dot{m}_{\text{cond}}$ ($\text{kg/s}$):
$$\dot{m}_{\text{cond}} = \frac{M_v - M_{v, \text{sat}}}{\tau_{\text{cond}}}$$

#### 3.2.2 Freezing / Melting
When $T_c < 273.15\,\text{K}$ and $M_l > 0$:
$$\dot{m}_{\text{freeze}} = \min\left( \frac{M_l}{\Delta t}, \; \frac{C_{v, c}(273.15 - T_c)}{L_f \cdot \Delta t} \right)$$
When $T_c > 273.15\,\text{K}$ and $M_i > 0$:
$$\dot{m}_{\text{melt}} = \min\left( \frac{M_i}{\Delta t}, \; \frac{C_{v, c}(T_c - 273.15)}{L_f \cdot \Delta t} \right)$$

#### Mass & Energy Flux Balance for Phase Transitions:
$$\Delta M_l = (-\dot{m}_{\text{evap}} + \dot{m}_{\text{cond}} - \dot{m}_{\text{freeze}} + \dot{m}_{\text{melt}}) \cdot \Delta t$$
$$\Delta M_v = (\dot{m}_{\text{evap}} - \dot{m}_{\text{cond}}) \cdot \Delta t$$
$$\Delta M_i = (\dot{m}_{\text{freeze}} - \dot{m}_{\text{melt}}) \cdot \Delta t$$
$$\Delta M_w = \Delta M_l + \Delta M_v + \Delta M_i = 0$$

Thermal latent heat conversion into sensible thermal heat:
$$\dot{Q}_{\text{lat}} = \left( (\dot{m}_{\text{cond}} - \dot{m}_{\text{evap}}) \cdot L_v + (\dot{m}_{\text{freeze}} - \dot{m}_{\text{melt}}) \cdot L_f \right)$$
$$\Delta U_{\text{sensible}} = \dot{Q}_{\text{lat}} \cdot \Delta t$$
Entropy generation from phase change irreversibility:
$$\sigma_{\text{phase}} = \left| \dot{Q}_{\text{lat}} \right| \cdot \left| \frac{1}{T_c} - \frac{1}{273.15} \right| \ge 0$$

---

### 3.3 Sensible Turbulent Heat Exchange ($\mathcal{P}_{\text{turb}}$)

Sensible heat flux between lithosphere/ocean surface and overlaying air boundary layer:
$$\Phi_{\text{sens}, c} = \rho_{\text{air}} \cdot c_{p, d} \cdot C_H \cdot \|\mathbf{u}_c\| \cdot (T_{\text{surf}, c} - T_{\text{air}, c})$$
Where:
- $C_H \approx 1.5 \times 10^{-3}$ (bulk transfer coefficient)
- $\|\mathbf{u}_c\|$ is local 10m surface wind velocity ($\text{m/s}$)
- $\rho_{\text{air}} = \frac{P_c}{R_d T_c}$ is air density ($\text{kg/m}^3$)

Energy delta:
$$\Delta U_{\text{sens}} = - \Phi_{\text{sens}, c} \cdot A_c \cdot \Delta t$$

---

### 3.4 Hexagonal Spatial Advection & Diffusion ($\mathcal{P}_{\text{advect}}$)

Between cell $c$ and each adjacent neighbor $k \in \mathcal{N}(c)$ (where $|\mathcal{N}(c)| = 6$ for standard planar/spherical hexagons):

```
         Neighbor k
       +------------+
       |   T_k, P_k |
       +------+-----+
              |
              | J_{mass, k->c} = L_e * v_{k,c} * rho
              | J_{E, k->c}    = J_{mass} * h_k + L_e * k_diff * (T_k - T_c) / d_{kc}
              v
       +------------+
       |   T_c, P_c |
       +------------+
          Cell c
```

- Shared edge length: $L_{e} = \frac{2}{\sqrt{3}} \sqrt{\frac{A_c}{2.598076}} \approx \sqrt{\frac{2 A_c}{3 \sqrt{3}}}$
- Neighbor centroid distance: $d_{kc} \approx 2 \cdot r_c$
- Advective flux governed by pressure gradient $\nabla P_{kc} = \frac{P_k - P_c}{d_{kc}}$
- Thermal diffusive conduction:
  $$J_{\text{diff}, k \to c} = k_{\text{therm}} \cdot L_e \cdot \frac{T_k - T_c}{d_{kc}}$$

#### Inter-Cell Conserved Transfer Invariant:
For any pair $(c, k)$:
$$J_{c \to k} = - J_{k \to c}$$
$$\sum_{c \in \mathcal{H}} \sum_{k \in \mathcal{N}(c)} J_{E, c \to k} = 0$$
$$\sum_{c \in \mathcal{H}} \sum_{k \in \mathcal{N}(c)} J_{\text{mass}, c \to k} = 0$$

---

### 3.5 Biogeochemical Elemental Turnover ($\mathcal{P}_{\text{bgc}}$)

Cell stocks $M_{\text{C}}, M_{\text{N}}, M_{\text{P}}$ undergo biochemical reallocation (NPP, respiration, mineralization) while preserving elemental atoms:

```
                                  [ Atmospheric CO2 ]
                                     ^         |
                         Respiration |         | NPP (GPP - Ra)
                                     |         v
[ Soil Organic Carbon ] <------- [ Biomass Carbon ]
  + N_organic, P_organic            + N_tissue, P_tissue
```

Stoichiometric Redfield / Atkinson ratio constraints:
$$(\Delta M_{\text{C}} : \Delta M_{\text{N}} : \Delta M_{\text{P}})_{\text{uptake}} = 106 : 16 : 1 \quad (\text{marine})$$
$$(\Delta M_{\text{C}} : \Delta M_{\text{N}} : \Delta M_{\text{P}})_{\text{terrestrial}} = 450 : 11 : 1 \quad (\text{canopy})$$

Total isolated element conservation:
$$\frac{d}{dt} \left( M_{\text{C}} + M_{\text{N}} + M_{\text{P}} \right)_{\text{closed\_system}} = 0$$

---

## 4. Concrete Stock Transfer Matrix & Deltas

For time-step integration $\mathbf{x}_c(t + \Delta t) = \mathbf{x}_c(t) + \mathbf{\Delta x}_c$:

| Property | Symbol | Process Contributing | Delta Equation $\Delta x$ | Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Internal Energy** | $U_c$ | $\mathcal{P}_{\text{rad}} + \mathcal{P}_{\text{sens}} + \mathcal{P}_{\text{lat}} + \mathcal{P}_{\text{advect}}$ | $\Delta U = \left( (1-\alpha)\Phi_{\text{sw}}^{\text{in}} - \epsilon\sigma T^4 - \Phi_{\text{sens}} - \Phi_{\text{lat}} \right) A_c \Delta t + \sum_{k} J_{E, k\to c}\Delta t$ | $\text{J}$ |
| **Temperature** | $T_c$ | Energy / Capacity update | $T^{t+\Delta t} = \frac{U^{t+\Delta t}}{C_{v, c}^{t+\Delta t}}$ | $\text{K}$ |
| **Liquid Water** | $M_l$ | $\mathcal{P}_{\text{phase}} + \mathcal{P}_{\text{hydrology}}$ | $\Delta M_l = (-\dot{m}_{\text{evap}} + \dot{m}_{\text{cond}} - \dot{m}_{\text{freeze}} + \dot{m}_{\text{melt}}) \Delta t + F_{l, \text{adv}} \Delta t$ | $\text{kg}$ |
| **Ice Water** | $M_i$ | $\mathcal{P}_{\text{phase}}$ | $\Delta M_i = (\dot{m}_{\text{freeze}} - \dot{m}_{\text{melt}}) \Delta t$ | $\text{kg}$ |
| **Vapor Water** | $M_v$ | $\mathcal{P}_{\text{phase}} + \mathcal{P}_{\text{advect}}$ | $\Delta M_v = (\dot{m}_{\text{evap}} - \dot{m}_{\text{cond}}) \Delta t + \sum_k J_{v, k \to c} \Delta t$ | $\text{kg}$ |
| **Total Water** | $M_w$ | Mass Closure | $\Delta M_w = \Delta M_l + \Delta M_i + \Delta M_v$ | $\text{kg}$ |
| **Entropy** | $S_c$ | Heat transfer + entropy gen. | $\Delta S_c = \frac{\Delta U_{\text{sensible}}}{T_c} + \sigma_c \cdot \Delta t$ | $\text{J/K}$ |
| **Entropy Prod.**| $\sigma_c$| Irreversible dissipations | $\sigma_c = \sigma_{\text{rad}} + \sigma_{\text{phase}} + \sigma_{\text{turb}} + \sigma_{\text{diff}} \ge 0$ | $\text{W/K}$ |
| **Carbon Stock**| $M_{\text{C}}$| $\mathcal{P}_{\text{bgc}} + \mathcal{P}_{\text{advect}}$ | $\Delta M_{\text{C}} = \sum_k J_{\text{C}, k \to c} \Delta t$ | $\text{kg}$ |
| **Nitrogen** | $M_{\text{N}}$| $\mathcal{P}_{\text{bgc}} + \mathcal{P}_{\text{advect}}$ | $\Delta M_{\text{N}} = \sum_k J_{\text{N}, k \to c} \Delta t$ | $\text{kg}$ |
| **Phosphorus** | $M_{\text{P}}$| $\mathcal{P}_{\text{bgc}} + \mathcal{P}_{\text{runoff}}$ | $\Delta M_{\text{P}} = \sum_k J_{\text{P}, k \to c} \Delta t$ | $\text{kg}$ |

---

## 5. Monadic Interface & Executable Signatures

The process mutations are implemented as pure state transitions composable within `SpatialMonad<H3CellThermodynamicRecord>`.

```typescript
import { H3CellThermodynamicRecord } from '../spatial/h3_state_tensor';

export interface ThermodynamicProcessKernel {
  /** Name of the physical kernel process */
  readonly kernelName: string;

  /**
   * Pure transformation mapping an immutable cell state at time t
   * to time t + dt under local thermodynamic laws.
   */
  apply(
    state: H3CellThermodynamicRecord,
    dtSeconds: number,
    boundaryFluxes?: BoundaryFluxContext
  ): H3CellThermodynamicRecord;
}

export interface BoundaryFluxContext {
  /** Net energy influx from adjacent cells: sum_k J_{E, k -> c} in Watts */
  readonly energyFluxInWatts: number;
  /** Net water mass influx from adjacent cells: sum_k J_{w, k -> c} in kg/s */
  readonly waterFluxInKgPerS: number;
  /** Net dry air influx from adjacent cells in kg/s */
  readonly dryAirFluxInKgPerS: number;
  /** Elemental advective fluxes in kg/s */
  readonly carbonFluxInKgPerS: number;
  readonly nitrogenFluxInKgPerS: number;
  readonly phosphorusFluxInKgPerS: number;
}
```

### 5.1 Pure Kernel Implementations

#### 1. Radiative Exchange Monad Transition
```typescript
export function evaluateRadiativeStep(
  state: H3CellThermodynamicRecord,
  dtSeconds: number
): H3CellThermodynamicRecord {
  const SIGMA = 5.670374419e-8;
  const T_SUN = 5778.0;
  
  const swInW = state.shortwaveInWm2 * state.areaM2;
  const swOutW = state.albedo * swInW;
  const swAbsorbedW = swInW - swOutW;

  // Stefan-Boltzmann emission
  const lwOutWm2 = state.emissivity * SIGMA * Math.pow(state.temperatureK, 4);
  const lwOutW = lwOutWm2 * state.areaM2;

  const netRadiativePowerW = swAbsorbedW - lwOutW;
  const deltaInternalEnergyJ = netRadiativePowerW * dtSeconds;
  const newInternalEnergyJ = state.internalEnergyJ + deltaInternalEnergyJ;

  // Derive new temperature
  const newTemperatureK = Math.max(0.1, newInternalEnergyJ / state.heatCapacityJK);

  // Entropy generation rate (W/K)
  const entropyProductionRateJKs = 
    Math.max(0, swAbsorbedW * (1.0 / newTemperatureK - 1.0 / T_SUN));

  const deltaEntropyJPerK = (deltaInternalEnergyJ / newTemperatureK) + (entropyProductionRateJKs * dtSeconds);

  return state.withUpdates({
    internalEnergyJ: newInternalEnergyJ,
    temperatureK: newTemperatureK,
    shortwaveOutWm2: swOutW / state.areaM2,
    longwaveOutWm2: lwOutWm2,
    entropyJPerK: Math.max(0, state.entropyJPerK + deltaEntropyJPerK),
    entropyProductionRateJKs
  });
}
```

#### 2. Water Phase Transition Monad Transition
```typescript
export function evaluatePhaseTransitions(
  state: H3CellThermodynamicRecord,
  dtSeconds: number
): H3CellThermodynamicRecord {
  const L_v = 2.501e6; // J/kg
  const L_f = 3.337e5; // J/kg
  const T_FREEZE = 273.15;

  let liquid = state.liquidWaterMassKg;
  let ice = state.iceMassKg;
  let vapor = state.vaporMassKg;
  let sensibleEnergyDeltaJ = 0;
  let entropyGenRateJKs = 0;

  // Liquid <-> Ice equilibrium
  if (state.temperatureK < T_FREEZE && liquid > 0) {
    // Freezing
    const maxFreezableKg = Math.min(
      liquid,
      (state.heatCapacityJK * (T_FREEZE - state.temperatureK)) / L_f
    );
    liquid -= maxFreezableKg;
    ice += maxFreezableKg;
    sensibleEnergyDeltaJ += maxFreezableKg * L_f;
    entropyGenRateJKs += (maxFreezableKg * L_f / dtSeconds) * (1 / state.temperatureK - 1 / T_FREEZE);
  } else if (state.temperatureK > T_FREEZE && ice > 0) {
    // Melting
    const maxMeltableKg = Math.min(
      ice,
      (state.heatCapacityJK * (state.temperatureK - T_FREEZE)) / L_f
    );
    ice -= maxMeltableKg;
    liquid += maxMeltableKg;
    sensibleEnergyDeltaJ -= maxMeltableKg * L_f;
    entropyGenRateJKs += (maxMeltableKg * L_f / dtSeconds) * (1 / T_FREEZE - 1 / state.temperatureK);
  }

  const newTotalWater = liquid + ice + vapor;
  const newInternalEnergyJ = state.internalEnergyJ + sensibleEnergyDeltaJ;
  const newTemperatureK = Math.max(0.1, newInternalEnergyJ / state.heatCapacityJK);

  return state.withUpdates({
    liquidWaterMassKg: liquid,
    iceMassKg: ice,
    vaporMassKg: vapor,
    totalWaterMassKg: newTotalWater,
    internalEnergyJ: newInternalEnergyJ,
    temperatureK: newTemperatureK,
    entropyProductionRateJKs: Math.max(0, state.entropyProductionRateJKs + Math.max(0, entropyGenRateJKs))
  });
}
```

#### 3. Full Step Composite Monad Composition
```typescript
export function stepThermodynamicCell(
  initialState: H3CellThermodynamicRecord,
  dtSeconds: number,
  boundary: BoundaryFluxContext
): H3CellThermodynamicRecord {
  // Step 1: Apply advective/turbulent boundary fluxes
  const advectedEnergy = initialState.internalEnergyJ + boundary.energyFluxInWatts * dtSeconds;
  const advectedWater = initialState.totalWaterMassKg + boundary.waterFluxInKgPerS * dtSeconds;
  const advectedLiquid = initialState.liquidWaterMassKg + boundary.waterFluxInKgPerS * dtSeconds;
  const advectedCarbon = initialState.carbonMassKg + boundary.carbonFluxInKgPerS * dtSeconds;
  const advectedNitrogen = initialState.nitrogenMassKg + boundary.nitrogenFluxInKgPerS * dtSeconds;
  const advectedPhosphorus = initialState.phosphorusMassKg + boundary.phosphorusFluxInKgPerS * dtSeconds;

  const stateAfterAdvection = initialState.withUpdates({
    internalEnergyJ: advectedEnergy,
    temperatureK: Math.max(0.1, advectedEnergy / initialState.heatCapacityJK),
    totalWaterMassKg: Math.max(0, advectedWater),
    liquidWaterMassKg: Math.max(0, advectedLiquid),
    carbonMassKg: Math.max(0, advectedCarbon),
    nitrogenMassKg: Math.max(0, advectedNitrogen),
    phosphorusMassKg: Math.max(0, advectedPhosphorus)
  });

  // Step 2: Radiation
  const stateAfterRadiation = evaluateRadiativeStep(stateAfterAdvection, dtSeconds);

  // Step 3: Phase change
  const finalState = evaluatePhaseTransitions(stateAfterRadiation, dtSeconds);

  return finalState;
}
```

---

## 6. Verification and Numerical Invariant Assertions

The following invariant assertions must execute without failure across any time-series transition $t \to t + \Delta t$:

1. **Mass Invariant Ratio**:
   $$\left| \frac{M_w - (M_l + M_i + M_v)}{M_w} \right| < 10^{-7}$$
2. **Absolute Temperature Range**:
   $$T_c \in (0.0, \; 1000.0) \quad [\text{K}]$$
3. **Entropy Second-Law Guarantee**:
   $$\sigma_c \ge -10^{-12} \quad [\text{W/K}]$$
4. **Boundary Energy Summation Closure**:
   $$\sum_{c \in \mathcal{H}} \left( \Phi_{\text{net}, c} \cdot A_c + \sum_{k \in \mathcal{N}(c)} J_{E, k \to c} \right) = \frac{d}{dt} \sum_{c \in \mathcal{H}} U_c$$