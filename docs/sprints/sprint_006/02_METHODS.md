```md
<!-- Method Specifications -->

# Method Specifications: Sprint 006 - Biogeochemical CyclePOD Instances

## 1. Overview & Objectives
This document formalizes the exact mass transfer equations, reservoir definitions, and thermodynamic constraints for the four planetary biogeochemical cycles managed within the Web of Life simulation engine: Carbon, Water, Nitrogen, and Phosphorus. 

All cycle implementations enforce strict mass conservation ($\sum \Delta S_i = 0$) in accordance with the First Law of Thermodynamics, alongside entropy production accounting governed by solar flux inputs ($\Phi_{solar}$).

---

## 2. Carbon Cycle Specifications (`src/cycles/carbon.ts`)

### 2.1 Reservoirs ($S_C$)
- $S_{atm}$: Atmosphere ($CO_2$ and $CH_4$, expressed in Gigatons of Carbon, GtC)
- $S_{ocean}$: Ocean Dissolved Inorganic Carbon (DIC: $CO_{2(aq)}, HCO_3^-, CO_3^{2-}$)
- $S_{bio}$: Terrestrial & Marine Biosphere Biomass
- $S_{litho}$: Lithosphere (carbonate rocks, kerogen, fossil fuel reserves)

### 2.2 Flux Equations ($F_{i \to j}$)
- **Photosynthesis ($F_{atm \to bio}$):**
  $$F_{atm \to bio} = k_{photo} \cdot \frac{S_{atm}}{S_{atm} + K_{m,CO2}} \cdot \Phi_{solar} \cdot \left(\frac{S_{bio}}{S_{bio,max}}\right)$$
- **Respiration & Decomposition ($F_{bio \to atm}$):**
  $$F_{bio \to atm} = k_{resp} \cdot S_{bio} \cdot e^{\beta (T - T_0)}$$
- **Ocean-Atmosphere Gas Exchange ($F_{atm \rightleftharpoons ocean}$):**
  $$F_{atm \to ocean} = k_{sol} \cdot \left( \frac{S_{atm}}{V_{atm}} - H_{cc} \cdot \frac{S_{ocean}}{V_{ocean}} \right)$$
  $$F_{ocean \to atm} = k_{desol} \cdot \frac{S_{ocean}}{V_{ocean}}$$
- **Weathering & Burial ($F_{ocean \to litho}$ & $F_{litho \to atm}$):**
  $$F_{ocean \to litho} = k_{burial} \cdot S_{ocean}$$
  $$F_{litho \to atm} = k_{weather} \cdot S_{litho} \quad (\text{or anthropogenic emission scaling})$$

---

## 3. Water Cycle Specifications (`src/cycles/water.ts`)

### 3.1 Reservoirs ($S_W$)
- $S_{oceans}$: Global Oceans and surface water bodies ($Gt$ or $km^3$)
- $S_{atm\_vapor}$: Atmospheric water vapor
- $S_{ice}$: Glaciers, ice caps, and permanent snow cover
- $S_{ground}$: Terrestrial groundwater and soil moisture

### 3.2 Flux Equations ($F_{i \to j}$)
- **Evaporation ($F_{oceans \to atm\_vapor}$ & $F_{ground \to atm\_vapor}$):**
  $$F_{evap} = k_{evap} \cdot \Phi_{solar} \cdot \left(1 - \frac{S_{atm\_vapor}}{S_{atm\_max}}\right) \cdot S_{source}$$
- **Precipitation ($F_{atm\_vapor \to oceans}$ & $F_{atm\_vapor \to ground}$ & $F_{atm\_vapor \to ice}$):**
  $$F_{precip} = k_{precip} \cdot \max\left(0, S_{atm\_vapor} - S_{atm\_threshold}\right)$$
- **Runoff ($F_{ground \to oceans}$):**
  $$F_{runoff} = k_{runoff} \cdot S_{ground}$$
- **Melting / Freezing ($F_{ice} \rightleftharpoons F_{oceans}$ / $F_{ground}$):**
  $$F_{melt} = k_{melt} \cdot \max(0, T - 0^\circ C) \cdot S_{ice}$$
  $$F_{freeze} = k_{freeze} \cdot \max(0, 0^\circ C - T) \cdot S_{oceans}$$

---

## 4. Nitrogen Cycle Specifications (`src/cycles/nitrogen.ts`)

### 4.1 Reservoirs ($S_N$)
- $S_{atm\_n2}$: Atmospheric Molecular Nitrogen ($N_2$)
- $S_{soil\_nh4}$: Soil Ammonium ($NH_4^+$)
- $S_{soil\_no3}$: Soil Nitrate ($NO_3^-$)
- $S_{bio\_n}$: Biosphere Organic Nitrogen (amino acids, proteins in biomass)

### 4.2 Flux Equations ($F_{i \to j}$)
- **Biological & Atmospheric Nitrogen Fixation ($F_{atm\_n2 \to soil\_nh4}$):**
  $$F_{fix} = k_{fix} \cdot \Phi_{solar} \cdot S_{bio\_n} \cdot \frac{S_{atm\_n2}}{S_{atm\_n2} + K_{m,N2}}$$
- **Nitrification ($F_{soil\_nh4 \to soil\_no3}$):**
  $$F_{nitrif} = k_{nitrif} \cdot S_{soil\_nh4} \cdot \theta_{soil\_moisture}$$
- **Plant Uptake ($F_{soil \to bio\_n}$):**
  $$F_{uptake} = k_{uptake} \cdot (S_{soil\_nh4} + S_{soil\_no3}) \cdot \frac{S_{bio\_max} - S_{bio\_n}}{S_{bio\_max}}$$
- **Denitrification ($F_{soil\_no3 \to atm\_n2}$):**
  $$F_{denitrif} = k_{denitrif} \cdot S_{soil\_no3} \cdot (1 - \text{O}_{2,\text{soil\_saturation}})$$

---

## 5. Phosphorus Cycle Specifications (`src/cycles/phosphorus.ts`)

### 5.1 Reservoirs ($S_P$)
- $S_{litho\_apatite}$: Lithospheric Apatite and phosphate rock
- $S_{soil\_p}$: Soil Reactive Phosphorus (available orthophosphates)
- $S_{aquatic\_p}$: Aquatic Dissolved Phosphorus (rivers, lakes, oceans)
- $S_{bio\_p}$: Biosphere Organic Phosphorus (ATP, nucleic acids, bone structures)

### 5.2 Flux Equations ($F_{i \to j}$)
- **Geochemical Weathering ($F_{litho\_apatite \to soil\_p}$):**
  $$F_{weather} = k_{weather\_p} \cdot S_{litho\_apatite} \cdot \left(1 + \gamma_{\text{organic\_acids}}\right)$$
- **Plant/Biosphere Uptake ($F_{soil\_p \to bio\_p}$ & $F_{aquatic\_p \to bio\_p}$):**
  $$F_{uptake\_p} = k_{uptake\_p} \cdot S_{source\_p} \cdot \frac{S_{bio\_p\_max} - S_{bio\_p}}{S_{bio\_p\_max}}$$
- **Runoff and Sedimentation ($F_{soil\_p \to aquatic\_p}$ & $F_{aquatic\_p \to litho\_apatite}$):**
  $$F_{runoff\_p} = k_{runoff\_p} \cdot S_{soil\_p} \cdot F_{water\_runoff}$$
  $$F_{sedimentation} = k_{sed} \cdot S_{aquatic\_p}$$

---

## 6. Executable Monad Method Contract (`ICyclePOD`)

Below is the concrete definition of the simulation step routine executed by each cycle POD within `EarthPOD`:

```typescript
export class BaseCyclePOD implements ICyclePOD {
  public name: string = "BaseCycle";
  protected stocks: Map<string, number> = new Map();

  public getStocks(): ReadonlyMap<string, number> {
    return this.stocks;
  }

  public step(deltaSeconds: number, solarFlux: number): void {
    // 1. Evaluate flux rates based on current stocks, solarFlux, and kinetics
    // 2. Execute discrete stock transfers: S_i(t + dt) = S_i(t) + (Inflows - Outflows) * dt
    // 3. Enforce mass conservation invariant check
  }

  public validateMassBalance(initialTotal: number): boolean {
    let currentTotal = 0;
    for (const mass of this.stocks.values()) {
      currentTotal += mass;
    }
    const delta = Math.abs(currentTotal - initialTotal);
    if (delta > 1e-12) {
      throw new Error(`Mass balance violation in ${this.name}: Delta ${delta} exceeds tolerance.`);
    }
    return true;
  }
}
```