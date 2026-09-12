<!-- Method Specifications -->

# Sprint 004 Method Specifications: Metabolic Thermodynamics & Extended Trophic Cascades

This document formalizes the physical, biological, and industrial processes required by **RFC 004: Metabolic Thermodynamics & Extended Trophic Cascades**. It establishes exact mass and energy deltas (carbon, water, minerals, oxygen, energy) and expresses these ecosystem processes as executable monad methods with concrete stock transfer equations.

---

## 1. Thermodynamic Constants & Stoichiometric Ratios

All biological matter and environmental pools adhere to strict elemental stoichiometry based on the Redfield-derived terrestrial biological ratios, scaled for atomic mass units (AMU) and molar conversions:

* **Carbon (C) Atomic Weight:** $12.011 \text{ g/mol}$
* **Nitrogen (N) Atomic Weight:** $14.007 \text{ g/mol}$
* **Phosphorus (P) Atomic Weight:** $30.974 \text{ g/mol}$
* **Oxygen (O) Atomic Weight:** $15.999 \text{ g/mol}$
* **Hydrogen (H) Atomic Weight:** $1.008 \text{ g/mol}$
* **Standard Stoichiometric Ratio (C : N : P):** $106 : 16 : 1$ (Molar basis for aquatic/microbial baseline, adapted to $45\% \text{ C}$, $4\% \text{ N}$, $0.5\% \text{ P}$ by dry biomass weight for terrestrial producers and consumers).
* **Max Ecological Efficiency ($\eta_{max}$):** $0.25$ (Lindeman's Efficiency limit / Carnot thermodynamic bound).
* **Photosynthetically Active Radiation (PAR) Conversion Factor:** $4.84 \times 10^6 \text{ J/mol C}$ fixed.

---

## 2. Process Specifications & Mass-Energy Deltas

### 2.1 Photosynthesis (Producer Monad)
Plants fix atmospheric $CO_2$ and soil moisture into glucose using solar radiation ($Q_{in}$), releasing molecular oxygen ($O_2$).

* **Chemical Equation:** 
  $$6CO_2 + 6H_2O + \text{PAR } (2870 \text{ kJ/mol}) \longrightarrow C_6H_{12}O_6 + 6O_2$$
* **Mass/Energy Delta per Mole of Carbon Fixed ($dt$):**
  $$\Delta M_{CO2} = -12.011 - 2(15.999) = -44.009 \text{ g}$`
  $$\Delta M_{H2O} = -6 \left(\frac{1}{6}\right) [2(1.008) + 15.999] = -18.015 \text{ g}$$
  $$\Delta M_{Biomass(C)} = +12.011 \text{ g}$$
  $$\Delta M_{O2} = +6 \left(\frac{1}{6}\right) [2(15.999)] = +31.998 \text{ g}$$
  $$\Delta Q_{in} = +478.33 \text{ kJ} \quad (\text{Energy absorbed from PAR})$$
  $$\Delta Q_{loss} = +(1 - \eta_{photosynthesis}) \cdot Q_{in} \quad (\text{Heat dissipation, } \eta \approx 0.04 - 0.06)$$

---

### 2.2 Respiration (Cellular / Metabolic Maintenance)
All living organisms (Producers, Consumers, Decomposers) oxidize organic carbon to sustain basal metabolic rates ($R_{maintenance}$), releasing $CO_2$ and thermal heat ($Q_{loss}$).

* **Chemical Equation:**
  $$C_6H_{12}O_6 + 6O_2 \longrightarrow 6CO_2 + 6H_2O + \text{Energy } (2870 \text{ kJ/mol}) + Q_{loss}$$
* **Mass/Energy Delta per Unit Respiration Rate ($r_m$):**
  $$\Delta M_{Biomass(C)} = -r_m \cdot 12.011 \text{ g}$$
  $$\Delta M_{O2} = -r_m \cdot 31.998 \text{ g}$$
  $$\Delta M_{CO2} = +r_m \cdot 44.009 \text{ g}$$
  $$\Delta M_{H2O} = +r_m \cdot 18.015 \text{ g}$$
  $$\Delta Q_{loss} = +r_m \cdot 2870 \text{ kJ} \quad (\text{100% converted to entropy } \frac{dQ_{loss}}{dt} \ge 0)$$

---

### 2.3 Herbivory / Carnivory Ingestion & Assimilation (Consumer Monad)
Consumers ingest prey/producer biomass. A fraction is assimilated into consumer tissue, and the remainder is egested as detritus (feces/urine).

* **Ingestion Stoichiometry Packet:**
  $$\text{Resource Packet} = \{ C: C_{ing}, N: N_{ing}, P: P_{ing}, H_2O: H_{2O\_ing}, \text{Energy}: E_{ing} \}$$
* **Assimilation Efficiency ($\epsilon_a$):** Typically $0.10$ to $0.40$ depending on trophic level.
* **Mass/Energy Delta for Consumer Ingestion:**
  $$\Delta M_{Consumer(C)} = \epsilon_a \cdot C_{ing}$$
  $$\Delta M_{Detritus(C)} = (1 - \epsilon_a) \cdot C_{ing} + \text{Excreted Nitrogenous Waste } (NH_3 / urea)$$
  $$\Delta Q_{loss} = (1 - \epsilon_a) \cdot E_{ing} \cdot \text{Metabolic Inefficiency}$$

---

### 2.4 Senescence, Mortality, and Mineralization (Decomposer Monad)
When an organism dies ($Energy < 0$ or Age limit reached), 100% of its biomass is transferred to the `DetritusPool`. Saprotrophic bacteria and fungi mineralize organic matter into inorganic soil nutrients.

* **Decomposition / Mineralization Chemical Conversion:**
  $$\text{Organic Biomass} + O_2 \xrightarrow{\text{Decomposer}} CO_2 + H_2O + NH_4^+ + PO_4^{3-}$$
* **Mass/Energy Delta per Unit Decomposition ($d_r$):**
  $$\Delta M_{Detritus} = -d_r$$
  $$\Delta M_{Soil\_Inorganic(N)} += +d_r \cdot \text{Stoichiometric Fraction } (0.04)$$
  $$\Delta M_{Soil\_Inorganic(P)} += +d_r \cdot \text{Stoichiometric Fraction } (0.005)$$
  $$\Delta M_{Atmosphere(CO2)} += +d_r \cdot \text{Stoichiometric Fraction } (0.45)$$
  $$\Delta Q_{loss} = +d_r \cdot \text{Enzymatic Dissipation Energy}$$

---

## 3. Executable Monad Methods & Stock Transfer Equations

The following Python module specification implements the monad state transitions and thermodynamic boundary checks for Sprint 004.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Tuple
from abc import ABC, abstractmethod

@dataclass
class ElementalStocks:
    carbon: float = 0.0      # grams C
    nitrogen: float = 0.0    # grams N
    phosphorus: float = 0.0  # grams P
    oxygen: float = 0.0      # grams O2
    water: float = 0.0       # grams H2O
    energy_stored: float = 0.0 # Joules
    q_loss: float = 0.0      # Cumulative dissipated heat (Joules)

    def total_mass(self) -> float:
        return self.carbon + self.nitrogen + self.phosphorus + self.oxygen + self.water

class IThermodynamicSystem(ABC):
    @abstractmethod
    def compute_energy_flux(self, dt: float) -> Tuple[float, float]:
        """Returns (Energy_Stored, Energy_Dissipated_Heat)"""
        pass

    @abstractmethod
    def enforce_mass_conservation(self, initial_mass: float, current_mass: float, tolerance: float = 1e-9) -> None:
        """Validates that atomic mass delta equals zero across transforms."""
        pass

class ThermodynamicMonad:
    """
    Composible State Monad wrapper ensuring immutable stock transformations
    and First/Second Law compliance across simulation ticks.
    """
    def __init__(self, stocks: ElementalStocks):
        self._stocks = stocks
        self._initial_system_mass = stocks.total_mass()

    @property
    def stocks(self) -> ElementalStocks:
        return self._stocks

    def bind(self, transition_fn) -> ThermodynamicMonad:
        """Applies a pure state transition function, returning a new monad instance."""
        new_stocks = transition_fn(self._stocks)
        
        # Enforce First Law (Mass Conservation Check)
        initial_m = self._stocks.total_mass() + getattr(transition_fn, '_mass_sink_delta', 0.0)
        final_m = new_stocks.total_mass()
        
        # Allow epsilon tolerance for atomic rounding
        if abs(initial_m - final_m) > 1e-6:
            raise ValueError(
                f"First Law Violation: Mass invariant broken! Initial: {initial_m}, Final: {final_m}"
            )
            
        # Enforce Second Law (Entropy / Q_loss Non-Decreasing Check)
        if new_stocks.q_loss < self._stocks.q_loss:
            raise RuntimeError(
                f"Second Law Violation: Entropy decreased! Previous Q_loss: {self._stocks.q_loss}, New Q_loss: {new_stocks.q_loss}"
            )

        return ThermodynamicMonad(new_stocks)

# --- Concrete Transition Functions ---

def photosynthetic_fixation(stocks: ElementalStocks, par_energy: float, efficiency: float = 0.05) -> ElementalStocks:
    """
    Executes photosynthesis: Converts inorganic CO2 and H2O into organic biomass,
    releasing O2. Generates baseline thermal dissipation Q_loss.
    """
    fixed_carbon = (par_energy * efficiency) / 4.84e6  # moles C -> scaled to mass
    mass_c = fixed_carbon * 12.011
    mass_o2 = fixed_carbon * (31.998 / 12.011) * 12.011
    mass_co2 = fixed_carbon * (44.009 / 12.011)
    mass_h2O = fixed_carbon * (18.015 / 12.011) * (1/6) # stoichiometric proportion

    dissipated_heat = par_energy * (1.0 - efficiency)

    return ElementalStocks(
        carbon=stocks.carbon + mass_c,
        nitrogen=stocks.nitrogen,
        phosphorus=stocks.phosphorus,
        oxygen=stocks.oxygen + mass_o2,
        water=stocks.water - mass_h2O,
        energy_stored=stocks.energy_stored + (par_energy * efficiency),
        q_loss=stocks.q_loss + dissipated_heat
    )

def cellular_respiration(stocks: ElementalStocks, metabolic_rate: float) -> ElementalStocks:
    """
    Executes respiration: Oxidizes biomass carbon, producing CO2, H2O, and 100% Q_loss.
    """
    oxidized_c = metabolic_rate * 12.011
    released_co2 = oxidized_c * (44.009 / 12.011)
    released_h2o = oxidized_c * (18.015 / 12.011) * (1/6)
    released_heat = metabolic_rate * 2870.0 * 1000.0 # Joules

    return ElementalStocks(
        carbon=max(0.0, stocks.carbon - oxidized_c),
        nitrogen=stocks.nitrogen,
        phosphorus=stocks.phosphorus,
        oxygen=max(0.0, stocks.oxygen - (oxidized_c * (31.998 / 12.011))),
        water=stocks.water + released_h2o,
        energy_stored=max(0.0, stocks.energy_stored - released_heat),
        q_loss=stocks.q_loss + released_heat
    )
```

---

## 4. Verification & Testing Invariants

To satisfy Sprint 004 integration requirements, automated test suites must validate:
1. **Global Mass-Balance Invariant:** $\sum M_{\text{Environment}} + \sum M_{\text{Organisms}} + \sum M_{\text{Detritus}} = \text{Constant} \pm 10^{-9}\text{g}$ across all ticks.
2. **Second Law Monotonicity:** $\Delta Q_{\text{loss}} \ge 0$ for every agent update step without exception.
3. **Lindeman 10% Efficiency Rule:** Across steady-state trophic simulations (Producer $\rightarrow$ Herbivore $\rightarrow$ Carnivore), biomass production ratios must average $0.09 \le \frac{B_{n+1}}{B_n} \le 0.12$.