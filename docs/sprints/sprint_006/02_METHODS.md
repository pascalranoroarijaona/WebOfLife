```md
<!-- Method Specifications -->

# Biogeochemical CyclePOD Method Specifications (Sprint 006)

This document formalizes the exact mass transfer equations, stock reservoirs, and monad execution methods for the four core biogeochemical cycles: Carbon, Water, Nitrogen, and Phosphorus. All equations adhere to mass conservation ($\sum \Delta S = 0$) and are implemented as state-transition monad methods within the Web of Life (Gaia) simulation engine.

---

## 1. Carbon Cycle (`src/cycles/carbon.ts`)

### 1.1 Reservoirs ($S_C$)
- `atmosphere`: Atmospheric $CO_2$ mass ($S_{\text{atm}}$) [Gigatons C, GtC]
- `ocean_dissolved_inorganic`: Dissolved inorganic carbon ($S_{\text{ocean}}$) [GtC]
- `biosphere_terrestrial`: Living and dead organic matter on land ($S_{\text{bio}}$) [GtC]
- `lithosphere_sediments`: Carbonate rocks and fossil fuels ($S_{\text{litho}}$) [GtC]

### 1.2 Flux Equations ($F_{i \to j}$) per time step $\Delta t$
1. **Photosynthesis ($F_{\text{atm} \to \text{bio}}$):** Driven by solar flux ($\Phi_{\text{solar}}$) and atmospheric $CO_2$ availability.
   $$F_{\text{atm} \to \text{bio}} = k_{\text{photo}} \cdot \left(\frac{S_{\text{atm}}}{S_{\text{atm}, 0}}\right) \cdot \left(\frac{\Phi_{\text{solar}}}{\Phi_{0}}\right)$$
2. **Terrestrial Respiration ($F_{\text{bio} \to \text{atm}}$):** Temperature and biomass-dependent respiration.
   $$F_{\text{bio} \to \text{atm}} = k_{\text{resp}} \cdot S_{\text{bio}}$$
3. **Ocean-Atmosphere Gas Exchange ($F_{\text{atm} \rightleftharpoons \text{ocean}}$):** Henry's Law partial pressure gradient equilibration.
   $$F_{\text{atm} \to \text{ocean}} = k_{a \to o} \cdot S_{\text{atm}}$$
   $$F_{\text{ocean} \to \text{atm}} = k_{o \to a} \cdot S_{\text{ocean}}$$
4. **Weathering & Burial ($F_{\text{litho} \to \text{ocean}}$ & $F_{\text{ocean} \to \text{litho}}$):** Slow geochemical cycling.
   $$F_{\text{litho} \to \text{ocean}} = k_{\text{weather}}$$
   $$F_{\text{ocean} \to \text{litho}} = k_{\text{burial}} \cdot S_{\text{ocean}}$$

### 1.3 Executable Monad Method
```typescript
public stepCarbon(dt: number, solarFlux: number): void {
  const f_photo = this.k_photo * (this.stocks.get('atmosphere')! / this.S_atm_init) * (solarFlux / this.Solar_init);
  const f_resp = this.k_resp * this.stocks.get('biosphere_terrestrial')!;
  const f_atm_ocean = this.k_a_o * this.stocks.get('atmosphere')!;
  const f_ocean_atm = this.k_o_a * this.stocks.get('ocean_dissolved_inorganic')!;
  const f_weather = this.k_weather;
  const f_burial = this.k_burial * this.stocks.get('ocean_dissolved_inorganic')!;

  // State Updates
  this.updateStock('atmosphere', (-f_photo + f_resp - f_atm_ocean + f_ocean_atm) * dt);
  this.updateStock('biosphere_terrestrial', (f_photo - f_resp) * dt);
  this.updateStock('ocean_dissolved_inorganic', (f_atm_ocean - f_ocean_atm + f_weather - f_burial) * dt);
  this.updateStock('lithosphere_sediments', (f_burial - f_weather) * dt);
}
```

---

## 2. Water Cycle (`src/cycles/water.ts`)

### 2.1 Reservoirs ($S_W$)
- `oceans`: Global liquid water volume ($S_{\text{oceans}}$) [$kg$ or $m^3$]
- `atmosphere_vapor`: Atmospheric water vapor ($S_{\text{vapour}}$) [$kg$]
- `ice_caps`: Glaciers and permanent ice sheets ($S_{\text{ice}}$) [$kg$]
- `terrestrial_groundwater`: Soil moisture and aquifers ($S_{\text{ground}}$) [$kg$]

### 2.2 Flux Equations ($F_{i \to j}$)
1. **Evaporation ($F_{\text{oceans} \to \text{vapour}}$):** Proportional to solar irradiance and surface temperature.
   $$F_{\text{oceans} \to \text{vapour}} = k_{\text{evap}} \cdot \left(\frac{\Phi_{\text{solar}}}{\Phi_{0}}\right) \cdot S_{\text{oceans}}$$
2. **Precipitation ($F_{\text{vapour} \to \text{ground/oceans}}$):** Condensation dependent on vapor saturation capacity.
   $$F_{\text{vapour} \to \text{ground}} = k_{\text{precip}} \cdot S_{\text{vapour}}$$
3. **Runoff ($F_{\text{ground} \to \text{oceans}}$):** Gravitational drainage from land to sea.
   $$F_{\text{ground} \to \text{oceans}} = k_{\text{runoff}} \cdot S_{\text{ground}}$$
4. **Melting / Freezing ($F_{\text{ice} \rightleftharpoons \text{ground}}$):** Thermal equilibrium shifts.
   $$F_{\text{ice} \to \text{ground}} = k_{\text{melt}} \cdot \left(\frac{\Phi_{\text{solar}}}{\Phi_{0}}\right) \cdot S_{\text{ice}}$$
   $$F_{\text{ground} \to \text{ice}} = k_{\text{freeze}} \cdot S_{\text{ground}}$$

### 2.3 Executable Monad Method
```typescript
public stepWater(dt: number, solarFlux: number): void {
  const f_evap = this.k_evap * (solarFlux / this.Solar_init) * this.stocks.get('oceans')!;
  const f_precip = this.k_precip * this.stocks.get('atmosphere_vapor')!;
  const f_runoff = this.k_runoff * this.stocks.get('terrestrial_groundwater')!;
  const f_melt = this.k_melt * (solarFlux / this.Solar_init) * this.stocks.get('ice_caps')!;
  const f_freeze = this.k_freeze * this.stocks.get('terrestrial_groundwater')!;

  this.updateStock('oceans', (f_precip * 0.7 + f_runoff - f_evap) * dt);
  this.updateStock('atmosphere_vapor', (f_evap - f_precip) * dt);
  this.updateStock('terrestrial_groundwater', (f_precip * 0.3 - f_runoff + f_melt - f_freeze) * dt);
  this.updateStock('ice_caps', (f_freeze - f_melt) * dt);
}
```

---

## 3. Nitrogen Cycle (`src/cycles/nitrogen.ts`)

### 3.1 Reservoirs ($S_N$)
- `atmosphere_n2`: Inert atmospheric nitrogen gas ($S_{\text{N2}}$) [$kg$]
- `soil_ammonium`: Bioavailable $NH_4^+$ ($S_{\text{NH4}}$) [$kg$]
- `soil_nitrate`: Bioavailable $NO_3^-$ ($S_{\text{NO3}}$) [$kg$]
- `biosphere_organic_n`: Plant and microbial biomass nitrogen ($S_{\text{bioN}}$) [$kg$]

### 3.2 Flux Equations ($F_{i \to j}$)
1. **Nitrogen Fixation ($F_{\text{N2} \to \text{NH4}}$):** Rhizobia / lightning fixation driven by biological activity.
   $$F_{\text{N2} \to \text{NH4}} = k_{\text{fix}} \cdot \Phi_{\text{solar}}$$
2. **Nitrification ($F_{\text{NH4} \to \text{NO3}}$):** Microbial oxidation.
   $$F_{\text{NH4} \to \text{NO3}} = k_{\text{nitrif}} \cdot S_{\text{NH4}}$$
3. **Plant Uptake ($F_{\text{soil} \to \text{bioN}}$):** Assimilation of ammonium and nitrate.
   $$F_{\text{soil} \to \text{bioN}} = k_{\text{uptake}} \cdot (S_{\text{NH4}} + S_{\text{NO3}})$$
4. **Denitrification ($F_{\text{NO3} \to \text{N2}}$):** Anaerobic reduction back to atmosphere.
   $$F_{\text{NO3} \to \text{N2}} = k_{\text{denitrif}} \cdot S_{\text{NO3}}$$

### 3.3 Executable Monad Method
```typescript
public stepNitrogen(dt: number, solarFlux: number): void {
  const f_fix = this.k_fix * solarFlux;
  const f_nitrif = this.k_nitrif * this.stocks.get('soil_ammonium')!;
  const f_uptake = this.k_uptake * (this.stocks.get('soil_ammonium')! + this.stocks.get('soil_nitrate')!);
  const f_denitrif = this.k_denitrif * this.stocks.get('soil_nitrate')!;
  const f_mineralization = this.k_min * this.stocks.get('biosphere_organic_n')!;

  this.updateStock('atmosphere_n2', (f_denitrif - f_fix) * dt);
  this.updateStock('soil_ammonium', (f_fix + f_mineralization - f_nitrif - f_uptake * 0.5) * dt);
  this.updateStock('soil_nitrate', (f_nitrif - f_denitrif - f_uptake * 0.5) * dt);
  this.updateStock('biosphere_organic_n', (f_uptake - f_mineralization) * dt);
}
```

---

## 4. Phosphorus Cycle (`src/cycles/phosphorus.ts`)

### 4.1 Reservoirs ($S_P$)
- `lithosphere_apatite`: Rock phosphate reserves ($S_{\text{apatite}}$) [$kg$]
- `soil_phosphate`: Soluble and particulate soil phosphate ($S_{\text{soilP}}$) [$kg$]
- `aquatic_dissolved_p`: Rivers, lakes, and ocean dissolved phosphorus ($S_{\text{aquaticP}}$) [$kg$]
- `biosphere_p`: Flora and fauna phosphorus biomass ($S_{\text{bioP}}$) [$kg$]

### 4.2 Flux Equations ($F_{i \to j}$)
1. **Weathering ($F_{\text{apatite} \to \text{soilP}}$):** Physical and chemical breakdown of rocks.
   $$F_{\text{apatite} \to \text{soilP}} = k_{\text{p_weather}} \cdot S_{\text{apatite}}$$
2. **Plant Uptake ($F_{\text{soilP} \to \text{bioP}}$):** Root absorption.
   $$F_{\text{soilP} \to \text{bioP}} = k_{\text{p_uptake}} \cdot S_{\text{soilP}}$$
3. **Runoff & Sedimentation ($F_{\text{soilP} \to \text{aquaticP}} \iff F_{\text{aquaticP} \to \text{apatite}}$):**
   $$F_{\text{soilP} \to \text{aquaticP}} = k_{\text{runoffP}} \cdot S_{\text{soilP}}$$
   $$F_{\text{aquaticP} \to \text{apatite}} = k_{\text{sediment}} \cdot S_{\text{aquaticP}}$$

### 4.3 Executable Monad Method
```typescript
public stepPhosphorus(dt: number): void {
  const f_weather = this.k_weather * this.stocks.get('lithosphere_apatite')!;
  const f_uptake = this.k_uptake * this.stocks.get('soil_phosphate')!;
  const f_return = this.k_return * this.stocks.get('biosphere_p')!;
  const f_runoff = this.k_runoff * this.stocks.get('soil_phosphate')!;
  const f_sediment = this.k_sediment * this.stocks.get('aquatic_dissolved_p')!;

  this.updateStock('lithosphere_apatite', (f_sediment - f_weather) * dt);
  this.updateStock('soil_phosphate', (f_weather + f_return - f_uptake - f_runoff) * dt);
  this.updateStock('biosphere_p', (f_uptake - f_return) * dt);
  this.updateStock('aquatic_dissolved_p', (f_runoff - f_sediment) * dt);
}
```

---

## 5. Global Mass Conservation Invariant Check

Every cycle verifies its mass invariant at the end of each `.step()` execution:
$$\left| \sum S_i(t) - \sum S_i(0) \right| < 1.0 \times 10^{-12}$$
If violated, a thermodynamic divergence exception is thrown, halting simulation execution to preserve the First Law of Thermodynamics.