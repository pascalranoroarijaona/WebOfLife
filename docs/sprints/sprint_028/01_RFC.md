# RFC 028: Spatial Equilibrium, Trophic Cascade Refinement, and Thermodynamic Ledger Stabilization

## Metadata
- **Status:** APPROVED
- **Sprint:** sprint_028
- **Author:** Chief Systems Architect
- **Dependencies:** RFC 027 (Metabolic Flux & Energy Quantization)

---

## 1. Sprint Goal & Executive Summary
Sprint 028 focuses on closing the thermodynamic feedback loop between spatial resource distribution, organismal movement costs, and multi-tier trophic cascades. Previous sprints established localized metabolic accounting and solar input bounds; Sprint 028 introduces spatial gradients for nutrient availability, enforces strict matter conservation across predatory interactions, and upgrades the Monad stock ledger to track entropy accumulation ($\Delta S$) dynamically.

---

## 2. Architectural Additions & Class Hierarchy

To preserve the incremental design philosophy of the Web of Life, we extend existing abstract base classes rather than introducing parallel hierarchies.

### 2.1 Spatial and Environmental Extension
```
Entity
└── SpatialNode (Abstract)
    ├── BiomePatch
    │   ├── NutrientPool (Composed)
    │   └── SunlightReceptor (Composed)
    └── ObstacleNode
```

- **`SpatialNode`**: Represents a discrete vertex in the environmental graph. Manages local carrying capacity and connectivity weights.
- **`BiomePatch`**: Concrete spatial container holding matter stocks ($C, N, P$) and exposing localized solar flux interfaces.
- **`NutrientPool`**: Tracks non-living organic and inorganic matter available for primary production.

### 2.2 Trophic & Monad Architecture
```
Organism
├── Autotroph
│   └── PhotosyntheticProducer
└── Heterotroph
    ├── Herbivore
    ├── Carnivore
    └── Detritivore (New in Sprint 028)
```

- **`Detritivore`**: Implements specialized monad stock transitions for scavenging dead biomass, ensuring zero matter loss upon organismal death.

---

## 3. Monad Stock Transitions & Thermodynamic Laws

The system operates strictly under the First and Second Laws of Thermodynamics:
1. **First Law (Conservation of Mass-Energy):** Total matter ($M_{total} = \sum M_{organisms} + \sum M_{environment}$) must remain constant across all tick transitions, minus energy radiated as heat.
2. **Second Law (Entropy Increase):** Every metabolic transformation must increment the global entropy ledger by $\Delta S \ge \frac{Q_{dissipated}}{T_{ambient}}$.

### 3.1 Monad State Transition Table

| Source State | Action / Event | Target State | Thermodynamic Constraint |
|---|---|---|---|
| `LiveOrganism` | `MetabolicProcess` | `DepletedOrganism` + `HeatDissipation` | $\Delta M_{system} = 0$, $\Delta S > 0$ |
| `LiveOrganism` | `Death` | `Carcass` | Exact transfer of elemental stocks ($C, N, P$) |
| `Carcass` | `Scavenge` (Detritivore) | Assimilated Biomass + `Residue` | Mass conservation preserved within trophic efficiency limits |

---

## 4. Interface Contracts

### 4.1 `IThermodynamicLedger`
```python
from abc import ABC, abstractmethod

class IThermodynamicLedger(ABC):
    @abstractmethod
    def audit_mass_conservation(self) -> float:
        """Returns the mass discrepancy delta across the entire simulation graph. Must be 0.0."""
        pass

    @abstractmethod
    def record_dissipation(self, joules: float, entropy_delta: float) -> None:
        """Logs heat loss and updates global entropy."""
        pass
```

### 4.2 `ISpatialNutrientSource`
```python
class ISpatialNutrientSource(ABC):
    @abstractmethod
    def query_nutrients(self, coordinates: tuple[float, float]) -> dict[str, float]:
        """Returns available mineral and organic stocks at the given spatial coordinates."""
        pass

    @abstractmethod
    def consume_nutrients(self, coordinates: tuple[float, float], demand: dict[str, float]) -> dict[str, float]:
        """Extracts requested nutrients, returning what was successfully fulfilled."""
        pass
```

---

## 5. Verification & Acceptance Criteria
1. **Conservation Test:** Automated unit tests must verify that over 1,000 simulation steps, total atomic mass ($C, H, O, N$) varies by less than $10^{-12}$ units.
2. **Entropy Growth Test:** Global entropy $\sum \Delta S$ must be monotonically non-decreasing.
3. **Trophic Balance:** Predator-prey oscillations must exhibit stable phase shifts without population crashes driven by numerical instability.