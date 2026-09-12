# Request for Comments (RFC): Sprint 010
## Thermodynamic State Vector Interface (`src/thermodynamics/types.ts`)

- **Status:** Draft / Proposed
- **Author:** Chief Systems Architect
- **Target Sprint:** Sprint 010
- **Modules Affected:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`, `src/earth_pod.ts`

---

## 1. Overview & Objective

Sprint 010 establishes strict, formal type contracts for thermodynamic state vectors within the Web of Life simulation engine. Building upon previous elemental cycles (Carbon, Nitrogen, Phosphorus, Water) and baseline thermodynamic structures, this sprint formalizes internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux arrays in `src/thermodynamics/types.ts`.

Adhering strictly to the **First and Second Laws of Thermodynamics**, the system treats the Earth Pod as an open thermodynamic system receiving exergy solely via solar radiation flux, while internal metabolic and biogeochemical processes irreversibly generate entropy.

---

## 2. Thermodynamic Foundations

### 2.1 First Law of Thermodynamics (Energy Conservation)
The total energy change within the system boundary ($E_{\text{sys}}$) is balanced by net heat transfer, work interactions, and mass/energy flows:
$$\frac{dE_{\text{sys}}}{dt} = \dot{Q}_{\text{in}} - \dot{Q}_{\text{out}} + \dot{W}_{\text{net}} + \sum \dot{m}_{\text{in}}h_{\text{in}} - \sum \dot{m}_{\text{out}}h_{\text{out}}$$
In our closed-mass, open-energy Earth Pod model, matter is strictly conserved ($\sum \dot{m} = 0$), and external energy input is restricted to solar radiation flux ($\Phi_{\text{solar}}$).

### 2.2 Second Law of Thermodynamics (Entropy Balance & Exergy Destruction)
The entropy change of the system is governed by:
$$\frac{dS_{\text{sys}}}{dt} = \sum \frac{\dot{Q}_k}{T_k} + \dot{S}_{\text{gen}}$$
where $\dot{S}_{\text{gen}} \ge 0$ (Clausius inequality / Law of Incremental Entropy Generation).

The **Exergy Destruction Rate** ($\dot{I}$) quantifies thermodynamic irreversibility and is tied directly to ambient reference temperature $T_0$:
$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

---

## 3. Interface Contracts (`src/thermodynamics/types.ts`)

The following TypeScript interfaces and types will be defined in `src/thermodynamics/types.ts`:

```typescript
/**
 * Represents boundary thermal and radiative flux vectors across the Earth Pod interface.
 */
export interface BoundaryFluxVector {
  solarRadiationIn: number;   // [W] Incoming solar shortwave flux
  thermalRadiationOut: number;// [W] Outgoing longwave thermal radiation
  sensibleHeatFlux: number;   // [W] Convective/conductive boundary sensible heat
  latentHeatFlux: number;     // [W] Evapotranspirative latent heat flux
  netMassEnthalpyFlux: number;// [W] Net enthalpy carried by boundary mass transfers (if any)
}

/**
 * Thermodynamic State Vector tracking fundamental state properties,
 * entropy generation rates, and exergy destruction.
 */
export interface ThermodynamicStateVector {
  timestamp: number;          // [s] Simulation epoch time
  ambientTemperature: number; // T_0 [K] Reference ambient temperature
  systemTemperature: number;  // T [K] Effective internal system temperature
  internalEnergy: number;     // U [J] Total internal energy of system stocks
  totalEntropy: number;       // S [J/K] Total system entropy
  entropyGenerationRate: number; // S_gen_dot [W/K] Internal irreversible entropy generation rate
  exergyDestructionRate: number;// I_dot [W] Exergy destruction rate (T_0 * S_gen_dot)
  boundaryFluxes: BoundaryFluxVector;
}

/**
 * Contract for any subsystem, cycle, or organism container participating 
 * in thermodynamic evaluation and entropy auditing.
 */
export interface IThermodynamicSystem {
  getStateVector(): ThermodynamicStateVector;
  computeEntropyGeneration(dt: number): number;
  verifySecondLaw(): boolean;
}
```

---

## 4. Class Hierarchy & Incremental Design

To maintain seamless backward compatibility with `src/thermodynamics/thermodynamic_structure.ts` and `src/earth_pod.ts`:
1. **`ThermodynamicStructure`** will implement or wrap `IThermodynamicSystem`, exposing methods to compute $\dot{S}_{\text{gen}}$ and $\dot{I}$ at each simulation tick.
2. **Cycle Integrations (`Carbon`, `Nitrogen`, `Phosphorus`, `Water`)** will contribute to internal energy transformations and metabolic heat dissipation, directly feeding into `entropyGenerationRate`.
3. **Validation Guards** will assert that $\dot{S}_{\text{gen}} \ge 0$ and $\dot{I} \ge 0$ at every integration step, throwing critical thermodynamic violations if entropy is spuriously consumed.

---

## 5. Acceptance Criteria & Verification

- **Type Safety:** `src/thermodynamics/types.ts` compiles cleanly with strict TypeScript configurations.
- **Second Law Enforcement:** Automated test suites in `tests/sprint_010.test.ts` (to be created) will verify that $\dot{S}_{\text{gen}} \ge 0$ across diverse metabolic states and radiative loads.
- **Exergy Consistency:** Assert that $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$ holds within floating-point tolerance ($10^{-6}$).