# RFC 004: Metabolic Thermodynamics & Extended Trophic Cascades

**Status:** Draft | **Author:** Chief Systems Architect | **Sprint:** 004  
**Applies To:** `web_of_life/ecosystem/`, `web_of_life/thermodynamics/`, `web_of_life/agents/`

---

## 1. Executive Summary & Objectives

Sprint 004 transitions the Web of Life simulation from basic mass-balance token tracking to a **physically bounded thermodynamic engine** governed strictly by the First and Second Laws of Thermodynamics. 

### Core Objectives:
1. **First Law Compliance (Matter Conservation):** All entities (Producers, Consumers, Decomposers, Dead Biomass Pools) operate as closed-loop matter containers. Carbon, Nitrogen, and Phosphorus atoms cannot be created or destroyed internally; they can only change state (organic, inorganic, atmospheric).
2. **Second Law Compliance (Solar Input & Entropy):** The sole external energy source is Solar Radiation ($Q_{in}$). All internal metabolic processes generate unrecoverable thermal dissipation ($Q_{loss}$), driving ecosystem entropy upward.
3. **Incremental Class Hierarchy:** Extend Sprint 003's base classes (`Organism`, `Resource`, `Environment`) without refactoring core contracts. Introduce specialized metabolic monads and state machine transitions.

---

## 2. Thermodynamic Laws & Mathematical Model

### 2.1 First Law: Mass Conservation
For any subsystem $S$ (Organism or Cell):
$$\frac{dM_S}{dt} = \sum \text{Ingestion} - \sum \text{Excretion} - \sum \text{Respiration}_m - \text{Mortality}$$
Where mass $M$ is tracked via elemental stoichiometry (C:N:P ratios).

### 2.2 Second Law: Energy Flow & Dissipation
Energy enters via Photosynthetically Active Radiation (PAR):
$$E_{stored} = \eta \cdot Q_{in} - R_{maintenance} - \text{Heat Loss}$$
Metabolic efficiency $\eta$ is bounded by Carnot-like ecological efficiency constraints ($\eta < 0.25$ for trophic transfers).

---

## 3. Class Hierarchy Additions

We extend the existing object-oriented structure incrementally.

```
Entity (Base)
├── Environment
│   ├── AtmosphericPool (Gas stocks: CO2, O2, N2)
│   └── SoilMatrix (Inorganic stocks: N, P, H2O, Dead Biomass)
└── Organism (Abstract)
    ├── Producer (Photosynthetic)
    │   └── C3Plant / C4Plant
    ├── Consumer (Heterotrophic)
    │   ├── Herbivore
    │   ├── Carnivore
    │   └── Omnivore
    └── Decomposer (Saprotrophic)
        └── BacterialCluster / FungalMycelium
```

### 3.1 Interface Contracts

```python
from abc import ABC, abstractmethod
from typing import Dict, Tuple

class IThermodynamicSystem(ABC):
    @abstractmethod
    def compute_energy_flux(self, dt: float) -> Tuple[float, float]:
        """Returns (Energy_Stored, Energy_Dissipated_Heat)"""
        pass

    @abstractmethod
    def enforce_mass_conservation(self) -> None:
        """Validates that atomic mass delta equals zero across transforms."""
        pass

class IMetabolicAgent(IThermodynamicSystem, ABC):
    @abstractmethod
    def ingest(self, resource_packet: Dict[str, float]) -> Dict[str, float]:
        """Consumes matter, returns waste/egestion packet."""
        pass

    @abstractmethod
    def respire(self, metabolic_rate: float) -> float:
        """Converts organic carbon to CO2 and thermal energy."""
        pass
```

---

## 4. Monad Stock Transitions

State updates are managed through deterministic, composable Monad pipelines to prevent side-effect leakage during high-frequency simulation ticks.

```
[Soil/Atmosphere Stocks] 
       │ (Uptake / Fixation)
       ▼
[Producer Monad] ──(Photosynthesis)──> [Biomass Stock]
       │                                     │
       │ (Herbivory Ingestion)               │ (Senescence / Death)
       ▼                                     ▼
[Consumer Monad] ────────────────────> [Detritus Pool]
       │                                     │
       │ (Respiration & Heat Loss)           │ (Mineralization)
       ▼                                     ▼
[Thermal Sink ($Q_{loss}$)]            [Soil Inorganic Pool]
```

### 4.1 State Transition Matrix
| Current State | Trigger | Next State | Stoichiometric Adjustment |
|---|---|---|---|
| `Alive` | Energy $< 0$ | `Dead` | Convert 100% biomass to `DetritusPool` |
| `Alive` | Mass $> \text{Capacity}$ | `Reproducing` | Split biomass into Parent + Offspring |
| `Detritus` | Decomposition Complete | `Mineralized` | Release $NH_4^+$, $PO_4^{3-}$, $CO_2$ |

---

## 5. Verification & Testing Strategy

1. **Mass-Balance Invariants:** Unit tests must assert that $\sum \text{Initial Atoms} == \sum \text{Final Atoms} \pm \epsilon$ ($10^{-9}$) across every global tick.
2. **Entropy Directionality Test:** Assert that total system thermal energy ($Q_{loss}$) is strictly non-decreasing ($\frac{dQ_{loss}}{dt} \ge 0$).
3. **Trophic Pyramid Stability:** Integration tests confirming biomass ratios follow the 10% rule across 3 trophic levels over 1,000 simulation steps.