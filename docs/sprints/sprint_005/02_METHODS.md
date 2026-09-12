<!-- Method Specifications -->

# Biogeochemical CyclePOD Method Specifications

## 1. Overview
This document specifies the exact mass/energy deltas, stock reservoirs, and monad transfer equations for the four core Biogeochemical CyclePOD instances (`CarbonCyclePOD`, `WaterCyclePOD`, `NitrogenCyclePOD`, and `PhosphorusCyclePOD`) defined in RFC 005. All processes obey strict mass conservation ($\sum \Delta \text{stocks} = 0$) and thermodynamic energy dissipation constraints driven by solar forcing.

---

## 2. Carbon Cycle (`src/cycles/carbon.ts`)

### 2.1 Reservoirs
- **`atmosphere`**: Gaseous $CO_2$ ($Gt \ C$)
- **`ocean`**: Dissolved inorganic carbon ($Gt \ C$)
- **`biosphere`**: Living and dead organic matter ($Gt \ C$)
- **`lithosphere`**: Carbonates and fossilized kerogen ($Gt \ C$)

### 2.2 Flux Equations & Monadic State Transitions
Primary production is driven by solar irradiance ($S_{in}$), scaled by atmospheric $CO_2$ availability and temperature.

$$\Phi_{\text{photosynthesis}} = k_p \cdot S_{in} \cdot \left(\frac{\text{atmosphere}}{K_c + \text{atmosphere}}\right) \cdot \Delta t$$

$$\Phi_{\text{respiration}} = k_r \cdot \text{biosphere} \cdot \Delta t$$

$$\Phi_{\text{outgassing}} = k_o \cdot \text{ocean} \cdot \Delta t$$

$$\Phi_{\text{weathering}} = k_w \cdot \text{atmosphere} \cdot \Delta t$$

#### State Update Monad
$$\Delta M_{\text{carbon}} = (-\Phi_{\text{photosynthesis}} + \Phi_{\text{respiration}} + \Phi_{\text{outgassing}} - \Phi_{\text{weathering}}) + \dots = 0$$

---

## 3. Water Cycle (`src/cycles/water.ts`)

### 3.1 Reservoirs
- **`atmosphere`**: Water vapor ($kg$)
- **`surfaceWater`**: Oceans, lakes, and rivers ($kg$)
- **`groundwater`**: Subsurface aquifers ($kg$)
- **`iceCaps`**: Glaciers and permanent ice sheets ($kg$)

### 3.2 Flux Equations & Monadic State Transitions
Evaporation is driven directly by thermal energy derived from solar input.

$$\Phi_{\text{evaporation}} = k_e \cdot S_{in} \cdot \text{surfaceWater} \cdot \Delta t$$

$$\Phi_{\text{precipitation}} = k_p \cdot \text{atmosphere} \cdot \Delta t$$

$$\Phi_{\text{runoff}} = k_r \cdot \text{surfaceWater} \cdot \Delta t$$

$$\Phi_{\text{percolation}} = k_m \cdot \text{surfaceWater} \cdot \Delta t$$

$$\Phi_{\text{melt}} = k_m \cdot S_{in} \cdot \text{iceCaps} \cdot \Delta t$$

#### State Update Monad
$$\Delta M_{\text{water}} = (-\Phi_{\text{evaporation}} + \Phi_{\text{precipitation}} + \dots) = 0$$

---

## 4. Nitrogen Cycle (`src/cycles/nitrogen.ts`)

### 4.1 Reservoirs
- **`atmosphere`**: Inert $N_2$ gas ($kg \ N$)
- **`soilAmmonium`**: $NH_4^+$ pool ($kg \ N$)
- **`soilNitrate`**: $NO_3^-$ pool ($kg \ N$)
- **`biomassN`**: Plant and microbial organic nitrogen ($kg \ N$)

### 4.2 Flux Equations & Monadic State Transitions
Nitrogen fixation requires metabolic energy coupling from primary production.

$$\Phi_{\text{fixation}} = k_f \cdot S_{in} \cdot \left(\frac{\text{atmosphere}}{\text{atmosphere} + K_n}\right) \cdot \Delta t$$

$$\Phi_{\text{nitrification}} = k_{nit} \cdot \text{soilAmmonium} \cdot \Delta t$$

$$\Phi_{\text{assimilation}} = k_a \cdot (\text{soilAmmonium} + \text{soilNitrate}) \cdot \Delta t$$

$$\Phi_{\text{denitrification}} = k_d \cdot \text{soilNitrate} \cdot \Delta t$$

#### State Update Monad
$$\Delta M_{\text{nitrogen}} = 0 \quad (\text{Across closed atmosphere-soil-biomass domain})$$

---

## 5. Phosphorus Cycle (`src/cycles/phosphorus.ts`)

### 5.1 Reservoirs
- **`lithosphereP`**: Apatite and rock-bound phosphate ($kg \ P$)
- **`soilP`**: Inorganic and organic soil phosphorus ($kg \ P$)
- **`marineP`**: Dissolved and particulate marine phosphorus ($kg \ P$)

### 5.2 Flux Equations & Monadic State Transitions
The phosphorus cycle lacks a significant atmospheric phase and is entirely geochemically driven by weathering and runoff.

$$\Phi_{\text{weatheringP}} = k_{pw} \cdot \text{lithosphereP} \cdot \Delta t$$

$$\Phi_{\text{runoffP}} = k_{pr} \cdot \text{soilP} \cdot \Delta t$$

$$\Phi_{\text{sedimentationP}} = k_{ps} \cdot \text{marineP} \cdot \Delta t$$

#### State Update Monad
$$\Delta M_{\text{phosphorus}} = (-\Phi_{\text{weatheringP}} + \Phi_{\text{weatheringP}} \dots) = 0$$

---

## 6. Thermodynamic Integration & Validation Contract
Every `CyclePOD` method execution returns a `ThermodynamicState<ReservoirMap>` wrapper verifying:
1. **First Law:** $\sum \text{stocks}_{\text{post}} = \sum \text{stocks}_{\text{pre}}$ (Within floating-point epsilon $\epsilon < 10^{-12}$).
2. **Second Law:** Entropy generated $\Delta S \ge 0$, proportional to thermal dissipation from solar flux conversions.