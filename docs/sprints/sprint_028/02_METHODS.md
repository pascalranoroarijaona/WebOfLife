<!-- Method Specifications -->

# Sprint 028: Thermodynamic Ledger Stabilization & Trophic Mechanics

## 1. Physical & Biological Process Formalization

Sprint 028 formalizes the exact mass-energy accounting, spatial nutrient distribution, and trophic cascade mechanics across the Web of Life ecosystem. 

### 1.1 First and Second Law Implementation
Every state transition within the monad ledger strictly obeys the conservation of atomic mass ($C, H, O, N$) and the generation of entropy ($\Delta S$).

$$\sum \text{Mass}_{\text{inputs}} = \sum \text{Mass}_{\text{outputs}} + \text{Mass}_{\text{excreted/resorbed}}$$

$$\Delta S_{\text{total}} = \Delta S_{\text{system}} + \frac{Q_{\text{dissipated}}}{T_{\text{ambient}}} \ge 0$$

### 1.2 Detritivore Scavenging & Carcass Decomposition
Upon organismal death, 100% of organic mass ($C, N, P$) is transferred into a `Carcass` state within the local `BiomePatch`. Detritivores consume this carcass, assimilating a fraction ($\eta_{\text{detritivore}} \approx 0.15$) into living biomass, respiring carbon dioxide ($CO_2$), excreting mineralized waste ($NH_4^+, PO_4^{3-}$), and leaving recalcitrant humic residue.

---

## 2. Mathematical Delta Specifications

### 2.1 Metabolic Dissipation & Heat Loss
For any metabolic or movement action consuming chemical energy $E_{chem}$ (measured in Joules):
- **Work Performed ($W$):** Fraction converted to kinetic energy or cellular synthesis.
- **Heat Dissipated ($Q$):** $Q = E_{chem} - W$
- **Entropy Increment:** $\Delta S = \frac{Q}{T}$ where $T = 298.15\text{ K}$ (default ambient temperature).

### 2.2 Spatial Nutrient Gradients
Nutrient availability at spatial coordinates $(x, y)$ follows a continuous diffusion-consumption model managed by `SpatialNode`:
- **Inflow:** Mineral weathering and detrital deposition.
- **Outflow:** Root uptake by autotrophs and leaching.

---

## 3. Executable Monad Methods

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional
from abc import ABC, abstractmethod

@dataclass
class ElementalStocks:
    carbon: float
    nitrogen: float
    phosphorus: float
    water: float

    def __add__(self, other: ElementalStocks) -> ElementalStocks:
        return ElementalStocks(
            carbon=self.carbon + other.carbon,
            nitrogen=self.nitrogen + other.nitrogen,
            phosphorus=self.phosphorus + other.phosphorus,
            water=self.water + other.water
        )

    def __sub__(self, other: ElementalStocks) -> ElementalStocks:
        return ElementalStocks(
            carbon=self.carbon - other.carbon,
            nitrogen=self.nitrogen - other.nitrogen,
            phosphorus=self.phosphorus - other.phosphorus,
            water=self.water - other.water
        )

    def is_non_negative(self) -> bool:
        return (self.carbon >= 0.0 and 
                self.nitrogen >= 0.0 and 
                self.phosphorus >= 0.0 and 
                self.water >= 0.0)


@dataclass
class ThermodynamicLedger:
    total_entropy: float = 0.0
    total_dissipated_heat: float = 0.0
    initial_system_mass: Optional[ElementalStocks] = None

    def record_dissipation(self, joules: float, ambient_temp: float = 298.15) -> None:
        """Logs heat loss and updates global entropy according to the Second Law."""
        if joules < 0:
            raise ValueError("Dissipated heat cannot be negative.")
        delta_s = joules / ambient_temp
        self.total_entropy += delta_s
        self.total_dissipated_heat += joules

    def audit_mass_conservation(self, current_mass: ElementalStocks) -> float:
        """Returns the mass discrepancy delta across the simulation graph. Must be 0.0."""
        if self.initial_system_mass is None:
            self.initial_system_mass = current_mass
            return 0.0
        
        diff = (
            abs(current_mass.carbon - self.initial_system_mass.carbon) +
            abs(current_mass.nitrogen - self.initial_system_mass.nitrogen) +
            abs(current_mass.phosphorus - self.initial_system_mass.phosphorus) +
            abs(current_mass.water - self.initial_system_mass.water)
        )
        return float(diff)


class SpatialNode(ABC):
    def __init__(self, coordinates: Tuple[float, float], carrying_capacity: float):
        self.coordinates = coordinates
        self.carrying_capacity = carrying_capacity

    @abstractmethod
    def query_nutrients(self) -> ElementalStocks:
        pass

    @abstractmethod
    def consume_nutrients(self, demand: ElementalStocks) -> ElementalStocks:
        pass


class BiomePatch(SpatialNode):
    def __init__(self, coordinates: Tuple[float, float], carrying_capacity: float, initial_pool: ElementalStocks):
        super().__init__(coordinates, carrying_capacity)
        self.nutrient_pool = initial_pool

    def query_nutrients(self) -> ElementalStocks:
        return self.nutrient_pool

    def consume_nutrients(self, demand: ElementalStocks) -> ElementalStocks:
        fulfilled = ElementalStocks(
            carbon=min(self.nutrient_pool.carbon, demand.carbon),
            nitrogen=min(self.nutrient_pool.nitrogen, demand.nitrogen),
            phosphorus=min(self.nutrient_pool.phosphorus, demand.phosphorus),
            water=min(self.nutrient_pool.water, demand.water)
        )
        self.nutrient_pool -= fulfilled
        return fulfilled

    def deposit_carcass(self, carcass_stocks: ElementalStocks) -> None:
        """Zero-loss transfer of dead biomass back into the environmental nutrient pool."""
        self.nutrient_pool += carcass_stocks


class DetritivoreMonad:
    @staticmethod
    def scavenge(carcass: ElementalStocks, patch: BiomePatch, ledger: ThermodynamicLedger) -> Tuple[ElementalStocks, ElementalStocks]:
        """
        Executes detritivorous scavenging. 
        Assimilates a fraction, respires/dissipates heat, and leaves residue.
        """
        assimilation_efficiency = 0.15
        
        assimilated = ElementalStocks(
            carbon=carcass.carbon * assimilation_efficiency,
            nitrogen=carcass.nitrogen * assimilation_efficiency,
            phosphorus=carcass.phosphorus * assimilation_efficiency,
            water=carcass.water * assimilation_efficiency
        )
        
        residue = carcass - assimilated
        
        # Thermodynamic accounting: metabolic heat dissipation from scavenging
        energy_released_joules = carcass.carbon * 10.5  # empirical coefficient for oxidation
        ledger.record_dissipation(energy_released_joules)
        
        # Return residue to patch
        patch.deposit_carcass(residue)
        
        return assimilated, residue