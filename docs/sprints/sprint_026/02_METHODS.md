<!-- Method Specifications -->

# Sprint 026: Thermodynamic Equilibrium & Trophic Cascade Architecture - Method Specifications

This document outlines the physical, biological, and industrial process formulations, mass/energy balance equations, and executable monad method implementations for RFC 026.

---

## 1. Physical & Biochemical Process Parameters

All biological and thermodynamic transitions within the Web of Life simulation adhere to strict stoichiometry and conservation laws. The primary conversion factors, efficiencies, and metabolic constants are defined below:

| Parameter | Symbol | Value / Range | Units | Description |
| :--- | :--- | :--- | :--- | :--- |
| Photosynthetic Efficiency | $\eta_{photo}$ | $0.015 - 0.035$ | dimensionless | Fraction of incident solar PAR converted to chemical energy |
| Herbivore Assimilation Efficiency | $\epsilon_{herb}$ | $0.30 - 0.50$ | dimensionless | Fraction of ingested plant biomass assimilated by herbivores |
| Carnivore Assimilation Efficiency | $\epsilon_{carn}$ | $0.70 - 0.90$ | dimensionless | Fraction of ingested prey biomass assimilated by carnivores |
| Carbon Mass Fraction in Biomass | $C_{frac}$ | $0.47$ | $\text{kg C} / \text{kg Biomass}$ | Dry-weight carbon content of organic matter |
| Nitrogen Mass Fraction in Biomass | $N_{frac}$ | $0.07$ | $\text{kg N} / \text{kg Biomass}$ | Dry-weight nitrogen content of organic matter |
| Basal Metabolic Coefficient | $b_m$ | $0.001$ | $\text{J} / (\text{kg} \cdot \text{s})$ | Scalar for resting metabolic heat dissipation |
| Enthalpy of Glucose Combustion | $\Delta H_c$ | $2.82 \times 10^6$ | $\text{J} / \text{mol}$ | Standard energy density for chemical bond tracking |

---

## 2. Mass and Energy Conservation Equations

### 2.1 First Law Conservation (Matter & Energy)
For any subsystem $S$, total mass ($M$) of carbon, nitrogen, and energy ($E$) must satisfy:
$$\frac{d}{dt} \left( \sum_{i \in S} M_i \right) = \sum \dot{M}_{in} - \sum \dot{M}_{out}$$
$$\frac{d}{dt} \left( \sum_{i \in S} E_i \right) = E_{solar\_in} - \dot{Q}_{dissipated}$$

### 2.2 Second Law Entropy Generation
Every metabolic step generates entropy ($\Delta S$), calculated via dissipated heat ($Q$) and environmental temperature ($T_{env}$):
$$\Delta S_{gen} = \frac{\dot{Q}_{dissipated}}{T_{env}} \ge 0$$

---

## 3. Executable Monad Method Specifications

Below is the concrete Python implementation of the monad stock state transformations, satisfying the interface contracts defined in RFC 026.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, Tuple, Optional
from dataclasses import dataclass, field

# -------------------------------------------------------------------------
# Interface Contracts
# -------------------------------------------------------------------------

class IThermodynamicSystem(ABC):
    @abstractmethod
    def get_energy_stock(self) -> float:
        """Returns internal free energy (Joules)."""
        pass

    @abstractmethod
    def dissipate_heat(self, joules: float) -> None:
        """Releases thermal energy to the environmental sink."""
        pass


class IMaterialPool(ABC):
    @abstractmethod
    def transfer_mass(self, target: 'IMaterialPool', stoichiometry: Dict[str, float]) -> bool:
        """Atomic mass transfer respecting conservation laws."""
        pass


# -------------------------------------------------------------------------
# Environmental and Material Pools
# -------------------------------------------------------------------------

@dataclass
class SoilMatrix(IMaterialPool):
    detritus_carbon: float = 10000.0  # kg C
    detritus_nitrogen: float = 1500.0 # kg N
    thermal_sink: float = 0.0         # Joules

    def transfer_mass(self, target: IMaterialPool, stoichiometry: Dict[str, float]) -> bool:
        # Generic soil-to-organism uptake (e.g., nitrogen uptake by plants)
        c_req = stoichiometry.get("C", 0.0)
        n_req = stoichiometry.get("N", 0.0)
        
        if self.detritus_carbon >= c_req and self.detritus_nitrogen >= n_req:
            self.detritus_carbon -= c_req
            self.detritus_nitrogen -= n_req
            return True
        return False

    def absorb_waste(self, c_mass: float, n_mass: float, heat: float) -> None:
        self.detritus_carbon += c_mass
        self.detritus_nitrogen += n_mass
        self.thermal_sink += heat


# -------------------------------------------------------------------------
# Organism Base & Trophic Monads
# -------------------------------------------------------------------------

class Organism(IThermodynamicSystem, IMaterialPool, ABC):
    def __init__(self, biomass: float, energy: float):
        self.biomass = biomass
        self.energy = energy
        self.entropy_generated = 0.0

    @abstractmethod
    def metabolize(self, delta_time: float) -> float:
        """Executes basal metabolism, applying Second Law losses. Returns heat dissipated."""
        pass

    @abstractmethod
    def ingest(self, source: IMaterialPool, energy_amount: float) -> Tuple[float, float]:
        """Trophic ingestion handling assimilation efficiencies. Returns (assimilated_energy, egested_mass)."""
        pass

    def get_energy_stock(self) -> float:
        return self.energy

    def dissipate_heat(self, joules: float) -> None:
        if joules < 0:
            raise ValueError("Cannot dissipate negative heat (violates 2nd law).")
        self.energy -= joules
        self.entropy_generated += joules / 298.15  l# Assumed standard ambient temp 298K


@dataclass
class Autotroph(Organism):
    photosynthetic_efficiency: float = 0.025
    carbon_fraction: float = 0.47
    
    def __init__(self, biomass: float, energy: float):
        super().__init__(biomass, energy)

    def metabolize(self, delta_time: float) -> float:
        # Basal maintenance respiration
        basal_cost = self.biomass * 0.001 * delta_time
        heat_loss = min(self.energy, basal_cost)
        self.dissipate_heat(heat_loss)
        return heat_loss

    def ingest(self, source: IMaterialPool, energy_amount: float) -> Tuple[float, float]:
        # Autotrophs do not ingest; exergy comes via solar photon flux
        return (0.0, 0.0)

    def photosynthesize(self, solar_flux: float, delta_time: float, soil: SoilMatrix) -> float:
        """Converts solar flux into chemical bond energy via C3/C4 dynamics."""
        captured_energy = solar_flux * self.photosynthetic_efficiency * delta_time
        
        # Stoichiometric nutrient requirement check (C:N ratio approx 10:1)
        c_needed = (captured_energy / 2.82e6) * 12.0 * self.carbon_fraction
        n_needed = c_needed / 10.0
        
        if soil.transfer_mass(self, {"C": c_needed, "N": n_needed}):
            self.energy += captured_energy
            self.biomass += c_needed / self.carbon_fraction
            return captured_energy
        return 0.0

    def transfer_mass(self, target: IMaterialPool, stoichiometry: Dict[str, float]) -> bool:
        c_req = stoichiometry.get("C", 0.0)
        biomass_req = c_req / self.carbon_fraction
        
        if self.biomass >= biomass_req:
            self.biomass -= biomass_req
            self.energy -= biomass_req * 18000.0  # Approx energy density of plant biomass J/g
            return True
        return False


@dataclass
class Heterotroph(Organism):
    assimilation_efficiency: float = 0.40  # Herbivore default
    carbon_fraction: float = 0.47
    nitrogen_fraction: float = 0.07

    def __init__(self, biomass: float, energy: float, trophic_level: str = "herbivore"):
        super().__init__(biomass, energy)
        if trophic_level == "carnivore":
            self.assimilation_efficiency = 0.80
        else:
            self.assimilation_efficiency = 0.40

    def metabolize(self, delta_time: float) -> float:
        basal_cost = self.biomass * 0.002 * delta_time
        heat_loss = min(self.energy, basal_cost)
        self.dissipate_heat(heat_loss)
        return heat_loss

    def ingest(self, source: IMaterialPool, energy_amount: float) -> Tuple[float, float]:
        """Consumes prey/plant matter, assimilating a fraction and egesting the rest."""
        stoichiometry = {
            "C": (energy_amount / 18000.0) * self.carbon_fraction,
            "N": (energy_amount / 18000.0) * self.nitrogen_fraction
        }
        
        if source.transfer_mass(self, stoichiometry):
            assimilated_energy = energy_amount * self.assimilation_efficiency
            egested_energy = energy_amount * (1.0 - self.assimilation_efficiency)
            
            self.energy += assimilated_energy
            self.dissipate_heat(egested_energy) # Incur Second Law thermodynamic tax on unassimilated waste
            
            return assimilated_energy, egested_energy
        return 0.0, 0.0

    def transfer_mass(self, target: IMaterialPool, stoichiometry: Dict[str, float]) -> bool:
        c_req = stoichiometry.get("C", 0.0)
        biomass_req = c_req / self.carbon_fraction
        
        if self.biomass >= biomass_req:
            self.biomass -= biomass_req
            self.energy -= biomass_req * 20000.0
            return True
        return False


# -------------------------------------------------------------------------
# Trophic Monad Pipeline Container
# -------------------------------------------------------------------------

@dataclass
class TrophicMonadState:
    soil: SoilMatrix
    producers: list[Autotroph] = field(default_factory=list)
    consumers: list[Heterotroph] = field(default_factory=list)
    total_system_energy: float = 0.0
    total_system_carbon: float = 0.0


class TrophicMonad:
    """Executes deterministic step-wise transformations across trophic tiers."""
    
    @staticmethod
    def step(state: TrophicMonadState, solar_flux: float, delta_time: float) -> TrophicMonadState:
        # 1. Primary Production Tick
        for producer in state.producers:
            producer.photosynthesize(solar_flux, delta_time, state.soil)
            producer.metabolize(delta_time)

        # 2. Consumer Trophic Tick (Grazing / Predation)
        for consumer in state.consumers:
            consumer.metabolize(delta_time)
            # Example predation loop: feed on first available producer with biomass
            for producer in state.producers:
                if producer.biomass > 1.0:
                    grazed_energy = 500.0 * delta_time
                    assimilated, egested = consumer.ingest(producer, grazed_energy)
                    if assimilated > 0:
                        # Egested waste returns to soil matrix
                        c_waste = (egested / 18000.0) * 0.47
                        n_waste = c_waste / 10.0
                        state.soil.absorb_waste(c_waste, n_waste, egested)
                    break

        # 3. Recalculate Conservation Invariants
        c_total = state.soil.detritus_carbon
        c_total += sum(p.biomass * p.carbon_fraction for p in state.producers)
        c_total += sum(c.biomass * c.carbon_fraction for c in state.consumers)
        
        state.total_system_carbon = c_total
        state.total_system_energy = state.soil.thermal_sink + \
                                    sum(p.energy for p in state.producers) + \
                                    sum(c.energy for c in state.consumers)
        
        return state
```