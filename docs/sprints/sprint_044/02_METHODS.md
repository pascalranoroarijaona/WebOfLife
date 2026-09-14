# Method Specifications: Baseline STP H3 Cell Thermodynamic State Tensor

- **Sprint**: 044
- **Target Subsystem**: `src/spatial/h3_state_tensor.ts`, `src/spatial/h3_types.ts`, `src/thermodynamics/constants.ts`
- **Author**: Process Mining & Research Scientist

---

## 1. Physical & Environmental Process Characterization

The discrete global grid system (H3 DGGS) partitions the planetary surface into hexagonal cells across discrete resolution levels $r \in [0, 15]$. Initializing an H3 cell into the simulation monad requires establishing a baseline thermodynamic state at Standard Temperature and Pressure (STP) that conforms strictly to:
1. **Mass Conservation**: Exact stoichiometric distribution of atmospheric, hydrospheric, lithospheric, and biospheric matter per unit surface area.
2. **First Law of Thermodynamics**: Exact allocation of internal energy $U$ across sensible, latent, and chemical enthalpy components.
3. **Second Law of Thermodynamics**: Exact reference entropy $S$ calculated at local thermodynamic equilibrium (LTE) such that production $\sigma \ge 0$ under non-equilibrium transitions.

---

## 2. Mathematical Formalism & Physical Deltas

### 2.1 Spatial Geodesic Scaling (H3 DGGS Area Calculation)

The average surface area $A(r)$ of an H3 cell at resolution $r$ is derived from the spherical surface area of the Earth $A_{\oplus} = 4\pi R_{\oplus}^2$:
$$R_{\oplus} = 6.3710088 \times 10^6 \text{ m}$$
$$A_{\oplus} = 5.100656 \times 10^{14} \text{ m}^2$$

At resolution $r = 0$, the global icosahedral projection decomposes into 110 hexagons and 12 pentagons ($N_0 = 122$ base cells):
$$\bar{A}_0 \approx \frac{A_{\oplus}}{122 - 2 + \frac{10}{6}} \approx 4.3574 \times 10^{12} \text{ m}^2$$

For resolution $r \in [0, 15]$, cell area scales inversely by a factor of 7:
$$A(r) = \bar{A}_0 \cdot 7^{-r}$$

```
Resolution  0: ~4.357419e+12 m²  (~4,357,419 km²)
Resolution  1: ~6.224884e+11 m²  (~622,488 km²)
Resolution  2: ~8.892692e+10 m²  (~88,927 km²)
Resolution  3: ~1.270385e+10 m²  (~12,704 km²)
Resolution  4: ~1.814835e+09 m²  (~1,815 km²)
Resolution  5: ~2.592622e+08 m²  (~259.3 km²)
Resolution  6: ~3.703745e+07 m²  (~37.0 km²)
Resolution  7: ~5.291065e+06 m²  (~5.29 km²)
Resolution  8: ~7.558664e+05 m²  (~0.756 km²)
Resolution  9: ~1.079809e+05 m²  (~0.108 km²)
Resolution 10: ~1.542585e+04 m²  (15,426 m²)
Resolution 11: ~2.203692e+03 m²  (2,204 m²)
Resolution 12: ~3.148132e+02 m²  (315 m²)
Resolution 13: ~4.497331e+01 m²  (45 m²)
Resolution 14: ~6.424759e+00 m²  (6.42 m²)
Resolution 15: ~9.178227e-01 m²  (0.918 m²)
```

---

### 2.2 Atmospheric Column Mass & Stoichiometry

Standard atmospheric boundary conditions:
- Surface pressure: $P_0 = 101,325.0 \text{ Pa} \ (\text{N}\cdot\text{m}^{-2})$
- Standard reference surface temperature: $T_0 = 288.15 \text{ K} \ (15.0 ^\circ\text{C})$
- Standard acceleration of gravity: $g_0 = 9.80665 \text{ m}\cdot\text{s}^{-2}$
- Universal gas constant: $R = 8.314462618 \text{ J}\cdot\text{mol}^{-1}\cdot\text{K}^{-1}$

#### 2.2.1 Hydrostatic Total Column Mass
From the hydrostatic equation $\frac{dP}{dz} = -\rho g_0$:
$$M_{atm}^{col} = \int_{0}^{\infty} \rho(z) \, dz = \frac{P_0}{g_0} = \frac{101325.0}{9.80665} \approx 10332.2745 \text{ kg}\cdot\text{m}^{-2}$$
For an H3 cell of area $A$:
$$M_{atm}(A) = A \cdot \frac{P_0}{g_0}$$

#### 2.2.2 Water Vapor Saturation and Molar Partitioning
Saturation vapor pressure $e^*(T_0)$ via the August-Roche-Magnus equation:
$$e^*(T_0) = 610.94 \cdot \exp\left(\frac{17.625 \cdot (T_0 - 273.15)}{T_0 - 273.15 + 243.04}\right) \text{ Pa}$$
At $T_0 = 288.15\text{ K}$ ($15.0^\circ\text{C}$):
$$e^*(288.15) = 610.94 \cdot \exp\left(\frac{17.625 \cdot 15.0}{15.0 + 243.04}\right) \approx 1705.62 \text{ Pa}$$

At baseline relative humidity $\phi = 0.60$ (60% mean ambient humidity):
$$P_{H_2O} = \phi \cdot e^*(T_0) = 0.60 \times 1705.62 \approx 1023.37 \text{ Pa}$$
Partial pressure of dry air:
$$P_{dry} = P_0 - P_{H_2O} = 101325.0 - 1023.37 = 100301.63 \text{ Pa}$$

Mole fractions in wet atmospheric column:
$$x_{v} = \frac{P_{H_2O}}{P_0} = \frac{1023.37}{101325.0} \approx 0.01009987 \ (1.010\%)$$
Dry fractions ($x_i^{dry}$):
- Nitrogen ($N_2$): $x_{N_2}^{dry} = 0.780840$
- Oxygen ($O_2$): $x_{O_2}^{dry} = 0.209460$
- Carbon Dioxide ($CO_2$): $x_{CO_2}^{dry} = 0.000420$ ($420 \text{ ppm}$)
- Argon & trace gases: $x_{trace}^{dry} = 0.009280$

Effective wet column mole fractions ($x_i = x_i^{dry} \cdot (1 - x_v)$):
$$x_{N_2} = 0.780840 \cdot (1 - 0.01009987) \approx 0.772953$$
$$x_{O_2} = 0.209460 \cdot (1 - 0.01009987) \approx 0.207344$$
$$x_{CO_2} = 0.000420 \cdot (1 - 0.01009987) \approx 0.00041576$$
$$x_{H_2O} = x_v \approx 0.01009987$$

Mean atmospheric molar mass $\bar{M}_{atm}$:
$$\bar{M}_{atm} = \sum_{i} x_i M_i$$
Where:
- $M_{N_2} = 0.0280134 \text{ kg/mol}$
- $M_{O_2} = 0.0319988 \text{ kg/mol}$
- $M_{CO_2} = 0.0440095 \text{ kg/mol}$
- $M_{H_2O} = 0.0180153 \text{ kg/mol}$
- $M_{trace} = 0.0399480 \text{ kg/mol}$ ($Ar$)

$$\bar{M}_{atm} \approx 0.028854 \text{ kg/mol}$$

Total moles of atmospheric gas per cell:
$$N_{atm}(A) = \frac{M_{atm}(A)}{\bar{M}_{atm}} = \frac{A \cdot P_0}{g_0 \cdot \bar{M}_{atm}}$$

Individual stock allocations (moles):
$$n_{N_2} = x_{N_2} \cdot N_{atm}(A)$$
$$n_{O_2} = x_{O_2} \cdot N_{atm}(A)$$
$$n_{CO_2} = x_{CO_2} \cdot N_{atm}(A)$$
$$n_{H_2O(g)} = x_{H_2O} \cdot N_{atm}(A)$$

---

### 2.3 Hydrosphere Baseline Densities

The default baseline state initializes standard terrestrial surface water per unit area:
- Liquid freshwater surface stock: $\sigma_{liquid} = 50.0 \text{ kg}\cdot\text{m}^{-2}$ (equivalent to 50 mm active surface film / ponding potential).
- Cryosphere (ice) baseline: $\sigma_{ice} = 0.0 \text{ kg}\cdot\text{m}^{-2}$ at $T_0 = 288.15\text{ K}$.
- Salinity baseline: $S_0 = 0.0 \text{ PSU}$ (continental default) or $35.0 \text{ PSU}$ (marine cell override).

Total hydrospheric mass:
$$M_{hydro}(A) = \sigma_{liquid} \cdot A$$

---

### 2.4 Lithosphere Upper Active Layer (1 m Soil Column)

Standard pedosphere profile depth $z_{soil} = 1.0 \text{ m}$ with bulk density $\rho_{bulk} = 1300.0 \text{ kg}\cdot\text{m}^{-3}$:
- Total dry matrix mass density: $\sigma_{soil} = 1300.0 \text{ kg}\cdot\text{m}^{-2}$.
- Soil Organic Carbon (SOC) density: $\sigma_{SOC} = 12.0 \text{ kg C}\cdot\text{m}^{-2}$ (global median active topsoil organic carbon).
- Soil Moisture density: $\theta_v = 0.20 \text{ m}^3/\text{m}^3 \implies \sigma_{soil\_water} = 200.0 \text{ kg}\cdot\text{m}^{-2}$.
- Inorganic Mineral mass density:
$$\sigma_{mineral} = \sigma_{soil} - \sigma_{SOC} = 1300.0 - 12.0 = 1288.0 \text{ kg}\cdot\text{m}^{-2}$$

Total lithospheric mass per cell:
$$M_{SOC}(A) = \sigma_{SOC} \cdot A$$
$$M_{mineral}(A) = \sigma_{mineral} \cdot A$$
$$M_{soil\_water}(A) = \sigma_{soil\_water} \cdot A$$

---

### 2.5 Biosphere Baseline Stock Densities

Global terrestrial mean biomass density equivalents at STP baseline:
- Autotroph biomass (living primary producers): $\sigma_{auto} = 2.50 \text{ kg wet biomass}\cdot\text{m}^{-2}$ (approx. $1.125 \text{ kg C}\cdot\text{m}^{-2}$).
- Heterotroph biomass (consumers & macrofauna): $\sigma_{hetero} = 0.015 \text{ kg wet biomass}\cdot\text{m}^{-2}$.
- Detritus / Necromass (litter layer): $\sigma_{detritus} = 0.75 \text{ kg dry matter}\cdot\text{m}^{-2}$.

Total biospheric mass per cell:
$$M_{auto}(A) = \sigma_{auto} \cdot A$$
$$M_{hetero}(A) = \sigma_{hetero} \cdot A$$
$$M_{detritus}(A) = \sigma_{detritus} \cdot A$$

---

### 2.6 Sensible & Latent Internal Energy Formulations

Sensible heat reference zero is taken at $0 \text{ K}$. Constant-volume heat capacities ($c_v$):
- Atmospheric gas mixture (diatomic dominant): $c_{v,atm} = c_{p,atm} - \frac{R}{\bar{M}_{atm}} = 1005.0 - 288.15 = 716.85 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$
- Liquid Water: $c_{p,liquid} \approx c_{v,liquid} = 4184.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$
- Soil Minerals: $c_{mineral} = 830.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$
- Soil Organic Carbon: $c_{SOC} = 1800.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$
- Living Biomass: $c_{bio} = 3600.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$
- Detritus: $c_{detritus} = 1500.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$

Latent heat of vaporization at $T_0$:
$$L_v(T_0) = 2.501 \times 10^6 - 2370.0 \cdot (T_0 - 273.15) \text{ J}\cdot\text{kg}^{-1}$$
At $T_0 = 288.15 \text{ K}$:
$$L_v(288.15) \approx 2.46545 \times 10^6 \text{ J}\cdot\text{kg}^{-1}$$

Total internal energy $U_{cell}$:
$$U_{cell} = U_{atm} + U_{hydro} + U_{litho} + U_{bio}$$
Where:
$$U_{atm} = M_{atm} \cdot c_{v,atm} \cdot T_0 + (n_{H_2O(g)} \cdot M_{H_2O}) \cdot L_v(T_0)$$
$$U_{hydro} = M_{hydro} \cdot c_{v,liquid} \cdot T_0$$
$$U_{litho} = \left( M_{mineral} c_{mineral} + M_{SOC} c_{SOC} + M_{soil\_water} c_{v,liquid} \right) \cdot T_0$$
$$U_{bio} = \left( (M_{auto} + M_{hetero}) c_{bio} + M_{detritus} c_{detritus} \right) \cdot T_0$$

---

### 2.7 Reference Entropy Formulation

Absolute entropy $S_{cell}$ at baseline equilibrium is computed per component:
$$S_{cell} = S_{atm} + S_{hydro} + S_{litho} + S_{bio}$$

For the atmospheric column, summing partial ideal gas entropies:
$$S_i = n_i \cdot \left[ S_{i,298.15}^\circ + c_{p,i} \ln\left(\frac{T_0}{298.15}\right) - R \ln\left(\frac{P_i}{P^\circ}\right) \right]$$
Where $P^\circ = 100,000 \text{ Pa}$ and standard molar entropies $S_{i,298.15}^\circ$ ($\text{J}\cdot\text{mol}^{-1}\cdot\text{K}^{-1}$):
- $N_2$: $191.61$
- $O_2$: $205.15$
- $CO_2$: $213.78$
- $H_2O(g)$: $188.84$

Condensed phases:
$$S_{hydro} = M_{hydro} \cdot s_{liquid}^\circ \quad (s_{liquid}^\circ \approx 3900.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1} \text{ at } 288.15\text{ K})$$
$$S_{litho} = \left( M_{mineral} \cdot s_{mineral}^\circ + M_{SOC} \cdot s_{SOC}^\circ + M_{soil\_water} \cdot s_{liquid}^\circ \right)$$
$$S_{bio} = (M_{auto} + M_{hetero} + M_{detritus}) \cdot s_{bio}^\circ \quad (s_{bio}^\circ \approx 1200.0 \text{ J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1})$$

---

## 3. Monadic Transition Equations

The instantiation of the baseline cell tensor represents the unit morphism $\eta$ in the spatial monad category:

```typescript
type H3Index = string;

interface SpatialMonad<State> {
  readonly value: State;
  map<B>(fn: (state: State) => B): SpatialMonad<B>;
  flatMap<B>(fn: (state: State) => SpatialMonad<B>): SpatialMonad<B>;
}
```

Stock transfer vector $\mathbf{\Delta X}$ across an operational timestep $\Delta t$:
$$\mathbf{X}_{t+\Delta t} = \mathbf{X}_t + \mathbf{\Delta X}_{flux} + \mathbf{\Delta X}_{source} - \mathbf{\Delta X}_{sink}$$

Conservation invariants enforced:
1. $\sum_{j \in \text{neighbors}} J_{mass, j} \cdot \Delta t + \Delta M_{cell} = 0$
2. $\Delta U_{cell} - \sum Q_{in} + \sum W_{out} = 0$
3. $\Delta S_{cell} - \sum \frac{Q_k}{T_k} \ge 0$

---

## 4. Concrete Stock Transfer & Delta Equations

### 4.1 Atmospheric Evapotranspiration Transfer (Hydrosphere $\to$ Atmosphere)
$$\Delta M_{vap} = \min\left(M_{hydro}, E_{pot} \cdot A \cdot \Delta t\right)$$
$$\Delta n_{H_2O(g)} = \frac{\Delta M_{vap}}{M_{H_2O}}$$
$$\Delta U_{hydro} = -\Delta M_{vap} \cdot c_{liquid} \cdot T_{cell}$$
$$\Delta U_{atm} = +\Delta M_{vap} \cdot (c_{v,vap} T_{cell} + L_v(T_{cell}))$$

### 4.2 Photosynthetic Fixation (Atmosphere $\to$ Biosphere)
$$6\,CO_2 + 6\,H_2O \longrightarrow C_6H_{12}O_6 + 6\,O_2$$
$$\Delta n_{CO_2} = -\Gamma_{GPP} \cdot A \cdot \Delta t$$
$$\Delta n_{O_2} = +\Gamma_{GPP} \cdot A \cdot \Delta t$$
$$\Delta M_{bio} = \Gamma_{GPP} \cdot A \cdot \Delta t \cdot \frac{M_{glucose}}{6}$$
$$\Delta U_{bio} = \Delta M_{bio} \cdot \Delta H_{combustion}^\circ$$

---

## 5. Algorithmic Implementation Architecture

```typescript
/**
 * Resolves standard geodesic area for an H3 cell index.
 */
export function getH3CellAreaM2(h3Index: string): number {
  const resolution = getH3Resolution(h3Index);
  if (resolution < 0 || resolution > 15) {
    throw new RangeError(`Invalid H3 resolution: ${resolution}`);
  }
  const BASE_AREA_RES_0 = 4.357419e12; // m²
  return BASE_AREA_RES_0 * Math.pow(7, -resolution);
}

/**
 * Creates the exact baseline STP thermodynamic state tensor for any H3 cell.
 */
export function createDefaultH3CellThermodynamicState(
  h3Index: string,
  overrides?: Partial<IH3CellThermodynamicState>
): IH3CellThermodynamicState {
  const resolution = getH3Resolution(h3Index);
  const areaM2 = getH3CellAreaM2(h3Index);
  const T0 = STP_CONSTANTS.T_STANDARD; // 288.15 K
  const P0 = STP_CONSTANTS.P_STANDARD; // 101325.0 Pa
  const g0 = STP_CONSTANTS.STANDARD_GRAVITY; // 9.80665 m/s²

  // Column mass
  const massAtmTotal = areaM2 * (P0 / g0);
  const totalAtmosphericMoles = massAtmTotal / STP_CONSTANTS.MOLAR_MASS_WET_AIR;

  // Wet air molar breakdown (RH = 60%)
  const atmosphere: IThermodynamicAtmosphereStock = Object.freeze({
    nitrogenMoles: totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_N2,
    oxygenMoles: totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_O2,
    co2Moles: totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_CO2,
    waterVaporMoles: totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_H2O,
    surfacePressurePa: P0,
    ...overrides?.atmosphere
  });

  const hydrosphere: IThermodynamicHydrosphereStock = Object.freeze({
    liquidWaterKg: areaM2 * 50.0,
    iceKg: 0.0,
    salinityPsu: 0.0,
    ...overrides?.hydrosphere
  });

  const lithosphere: IThermodynamicLithosphereStock = Object.freeze({
    soilOrganicCarbonKg: areaM2 * 12.0,
    inorganicMineralKg: areaM2 * 1288.0,
    soilMoistureKg: areaM2 * 200.0,
    ...overrides?.lithosphere
  });

  const biosphere: IThermodynamicBiosphereStock = Object.freeze({
    autotrophBiomassKg: areaM2 * 2.50,
    heterotrophBiomassKg: areaM2 * 0.015,
    detritusKg: areaM2 * 0.75,
    ...overrides?.biosphere
  });

  // Calculate internal energy U
  const uAtm = computeAtmosphericInternalEnergy(atmosphere, T0);
  const uHydro = hydrosphere.liquidWaterKg * STP_CONSTANTS.CP_WATER_LIQUID * T0;
  const uLitho = (
    lithosphere.inorganicMineralKg * STP_CONSTANTS.CP_MINERAL +
    lithosphere.soilOrganicCarbonKg * STP_CONSTANTS.CP_SOC +
    lithosphere.soilMoistureKg * STP_CONSTANTS.CP_WATER_LIQUID
  ) * T0;
  const uBio = (
    (biosphere.autotrophBiomassKg + biosphere.heterotrophBiomassKg) * STP_CONSTANTS.CP_BIOMASS +
    biosphere.detritusKg * STP_CONSTANTS.CP_DETRITUS
  ) * T0;

  const totalInternalEnergyJoules = uAtm + uHydro + uLitho + uBio;
  const totalEntropyJoulesPerKelvin = computeReferenceEntropy(
    atmosphere,
    hydrosphere,
    lithosphere,
    biosphere,
    T0
  );

  return Object.freeze({
    h3Index,
    resolution,
    areaM2,
    temperatureKelvin: overrides?.temperatureKelvin ?? T0,
    atmosphere,
    hydrosphere,
    lithosphere,
    biosphere,
    internalEnergyJoules: overrides?.internalEnergyJoules ?? totalInternalEnergyJoules,
    entropyJoulesPerKelvin: overrides?.entropyJoulesPerKelvin ?? totalEntropyJoulesPerKelvin
  });
}
```

---

## 6. Verification Criteria & Invariant Envelopes

1. **Mass Positive Definiteness**:
   $$\forall k \in \{N_2, O_2, CO_2, H_2O, \text{mineral}, \text{SOC}, \text{bio}\}, \quad M_k \ge 0$$
2. **Absolute Pressure Hydrostatic Balance**:
   $$\left| \frac{\sum_i (n_i M_i) \cdot g_0}{A} - P_{surface} \right| \le 10^{-5} \cdot P_{surface}$$
3. **Internal Energy Lower Bound**:
   $$T_{cell} > 0 \implies U_{cell} > 0$$
4. **Immutability Invariant**:
   `Object.isFrozen(cellState) === true` for all nested stock structures.