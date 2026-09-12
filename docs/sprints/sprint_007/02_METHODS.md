<!-- Method Specifications -->

# Biogeochemical CyclePOD Mathematical & Monadic Process Specifications

This document formalizes the exact mass-balance equations, flux rates, thermodynamic constraints, and executable monad transfer methods for Sprint 007 (`src/cycles/`).

---

## 1. Mathematical Framework for CyclePODs

Let a CyclePOD be defined as a closed, mass-conservative reservoir system represented by a state vector $\mathbf{M}(t) \in \mathbb{R}^n$, where each element $M_i(t)$ represents the mass (in kilograms or moles of the focal element: C, $\text{H}_2\text{O}$, N, or P) of reservoir $i$ at time $t$.

The system evolves according to the differential equation:
$$\frac{d\mathbf{M}}{dt} = \mathbf{S} \mathbf{F}(\mathbf{M}, I_{\text{solar}}, \Delta t)$$

Where:
- $\mathbf{S}$ is the stoichiometric incidence matrix defining network connectivity between reservoirs.
- $\mathbf{F}$ is the vector of directed transfer fluxes (mass per unit time).
- $I_{\text{solar}}$ is the normalized solar irradiance scalar input.

---

## 2. Cycle-Specific Flux Equations & Monad Methods

### 2.1 Carbon Cycle (`src/cycles/carbon.ts`)
* **Reservoirs ($i$):** 
  1. `atmosphere` ($M_{\text{atm}}$)
  2. `terrestrial_biosphere` ($M_{\text{bio}}$)
  3. `ocean_surface` ($M_{\text{ocean}}$)
  4. `lithosphere` ($M_{\text{lith}}$)

* **Flux Equations:**
  * **Photosynthesis ($F_{\text{photo}}$):** $k_{\text{photo}} \cdot M_{\text{atm}} \cdot I_{\text{solar}}$
  * **Respiration ($F_{\text{resp}}$):** $k_{\text{resp}} \cdot M_{\text{bio}}$
  * **Ocean Exchange ($F_{\text{oc\_diss}}, F_{\text{oc\_outg}}$):** $k_{\text{diss}} M_{\text{atm}} - k_{\text{outg}} M_{\text{ocean}}$
  * **Burial/Weathering ($F_{\text{burial}}$):** $k_{\text{burial}} \cdot M_{\text{bio}}$

* **Executable Monad Method:**
```typescript
public step(deltaSeconds: number, solarInput: number): void {
  const atm = this.getStock('atmosphere');
  const bio = this.getStock('terrestrial_biosphere');
  const ocean = this.getStock('ocean_surface');

  const fPhoto = this.coeffs.photo * atm * solarInput * deltaSeconds;
  const fResp = this.coeffs.resp * bio * deltaSeconds;
  const fDiss = this.coeffs.diss * atm * deltaSeconds;
  const fOutg = this.coeffs.outg * ocean * deltaSeconds;
  const fBurial = this.coeffs.burial * bio * deltaSeconds;

  this.transfer('atmosphere', 'terrestrial_biosphere', fPhoto);
  this.transfer('terrestrial_biosphere', 'atmosphere', fResp);
  this.transfer('atmosphere', 'ocean_surface', fDiss);
  this.transfer('ocean_surface', 'atmosphere', fOutg);
  this.transfer('terrestrial_biosphere', 'lithosphere', fBurial);
}
```

---

### 2.2 Water Cycle (`src/cycles/water.ts`)
* **Reservoirs ($i$):**
  1. `atmosphere_vapor` ($M_{\text{vap}}$)
  2. `ocean` ($M_{\text{oc}}$)
  3. `groundwater` ($M_{\text{gw}}$)
  4. `ice_caps` ($M_{\text{ice}}$)

* **Flux Equations:**
  * **Evaporation ($F_{\text{evap}}$):** $k_{\text{evap}} \cdot M_{\text{oc}} \cdot I_{\text{solar}}$
  * **Precipitation ($F_{\text{precip}}$):** $k_{\text{precip}} \cdot M_{\text{vap}}$
  * **Runoff ($F_{\text{runoff}}$):** $k_{\text{runoff}} \cdot M_{\text{gw}}$
  * **Melting/Freezing ($F_{\text{melt}}$):** $k_{\text{melt}} \cdot M_{\text{ice}} \cdot \max(0, I_{\text{solar}} - 1.0)$

* **Executable Monad Method:**
```typescript
public step(deltaSeconds: number, solarInput: number): void {
  const oc = this.getStock('ocean');
  const vap = this.getStock('atmosphere_vapor');
  const gw = this.getStock('groundwater');
  const ice = this.getStock('ice_caps');

  const fEvap = this.coeffs.evap * oc * solarInput * deltaSeconds;
  const fPrecip = this.coeffs.precip * vap * deltaSeconds;
  const fRunoff = this.coeffs.runoff * gw * deltaSeconds;
  const fMelt = this.coeffs.melt * ice * Math.max(0, solarInput - 0.5) * deltaSeconds;

  this.transfer('ocean', 'atmosphere_vapor', fEvap);
  this.transfer('atmosphere_vapor', 'groundwater', fPrecip * 0.8);
  this.transfer('atmosphere_vapor', 'ice_caps', fPrecip * 0.2);
  this.transfer('groundwater', 'ocean', fRunoff);
  this.transfer('ice_caps', 'ocean', fMelt);
}
```

---

### 2.3 Nitrogen Cycle (`src/cycles/nitrogen.ts`)
* **Reservoirs ($i$):**
  1. `atmosphere_n2` ($M_{\text{n2}}$)
  2. `soil_ammonia` ($M_{\text{nh3}}$)
  3. `soil_nitrate` ($M_{\text{no3}}$)
  4. `biomass` ($M_{\text{bio}}$)

* **Flux Equations:**
  * **Fixation ($F_{\text{fix}}$):** $k_{\text{fix}} \cdot M_{\text{n2}} \cdot I_{\text{solar}}$
  * **Ammonification/Nitrification ($F_{\text{nit}}$):** $k_{\text{nit}} \cdot M_{\text{nh3}}$
  * **Assimilation ($F_{\text{assim}}$):** $k_{\text{assim}} \cdot M_{\text{no3}} \cdot M_{\text{bio}}$
  * **Denitrification ($F_{\text{denit}}$):** $k_{\text{denit}} \cdot M_{\text{no3}}$

* **Executable Monad Method:**
```typescript
public step(deltaSeconds: number, solarInput: number): void {
  const n2 = this.getStock('atmosphere_n2');
  const nh3 = this.getStock('soil_ammonia');
  const no3 = this.getStock('soil_nitrate');
  const bio = this.getStock('biomass');

  const fFix = this.coeffs.fix * n2 * solarInput * deltaSeconds;
  const fNitrif = this.coeffs.nitrif * nh3 * deltaSeconds;
  const fAssim = this.coeffs.assim * no3 * bio * deltaSeconds;
  const fDenit = this.coeffs.denit * no3 * deltaSeconds;

  this.transfer('atmosphere_n2', 'soil_ammonia', fFix);
  this.transfer('soil_ammonia', 'soil_nitrate', fNitrif);
  this.transfer('soil_nitrate', 'biomass', fAssim);
  this.transfer('soil_nitrate', 'atmosphere_n2', fDenit);
}
```

---

### 2.4 Phosphorus Cycle (`src/cycles/phosphorus.ts`)
* **Reservoirs ($i$):**
  1. `lithosphere_apatite` ($M_{\text{apatite}}$)
  2. `soil_phosphate` ($M_{\text{po4}}$)
  3. `aquatic_sediment` ($M_{\text{sed}}$)
  4. `biomass` ($M_{\text{bio}}$)

* **Flux Equations:**
  * **Weathering ($F_{\text{weath}}$):** $k_{\text{weath}} \cdot M_{\text{apatite}} \cdot I_{\text{solar}}$
  * **Uptake ($F_{\text{uptake}}$):** $k_{\text{uptake}} \cdot M_{\text{po4}} \cdot M_{\text{bio}}$
  * **Runoff/Litterfall ($F_{\text{litter}}$):** $k_{\text{litter}} \cdot M_{\text{bio}}$
  * **Lithification ($F_{\text{lith}}$):** $k_{\text{lith}} \cdot M_{\text{sed}}$

* **Executable Monad Method:**
```typescript
public step(deltaSeconds: number, solarInput: number): void {
  const apatite = this.getStock('lithosphere_apatite');
  const po4 = this.getStock('soil_phosphate');
  const bio = this.getStock('biomass');
  const sed = this.getStock('aquatic_sediment');

  const fWeath = this.coeffs.weath * apatite * solarInput * deltaSeconds;
  const fUptake = this.coeffs.uptake * po4 * bio * deltaSeconds;
  const fLitter = this.coeffs.litter * bio * deltaSeconds;
  const fLith = this.coeffs.lith * sed * deltaSeconds;

  this.transfer('lithosphere_apatite', 'soil_phosphate', fWeath);
  this.transfer('soil_phosphate', 'biomass', fUptake);
  this.transfer('biomass', 'aquatic_sediment', fLitter);
  this.transfer('aquatic_sediment', 'lithosphere_apatite', fLith);
}
```

---

## 3. Thermodynamic Conservation Guarantees

1. **First Law (Mass Conservation Audit):**
   Every `BaseCycle` instance implements `validateConservation(tolerance)` where tolerance defaults to $10^{-6}$.
   $$\left| \sum_{i} M_i(t) - \sum_{i} M_i(0) \right| \leq 10^{-6}$$

2. **Non-Negative Reservoir Bounds:**
   The base `transfer(from, to, amount)` method enforces depletion limits:
   $$\text{actualTransfer} = \min(\text{getStock}(\text{from}), \max(0, \text{amount}))$$
   This prevents negative mass values under high transfer rate configurations.