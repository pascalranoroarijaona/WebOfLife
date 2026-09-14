# Method Specifications: Thermodynamic Overrides & Boundary Flux Ledgering

- **Sprint:** 045
- **Author:** Process Mining & Research Scientist
- **Subsystem:** `src/spatial/h3_state_tensor.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`
- **Thermodynamic Domain:** Mass-Energy Conservation (First Law), Thermal State Coupling & Boundary Ledgering (Second Law)

---

## 1. Thermodynamic & Chemical Foundations

### 1.1 First Law Formulation for Open Spatial Manifolds
An individual hexagonal cell $i \in \Omega$ within an $H_3$ spatial grid functions as an open thermodynamic control volume. When an external forcing agent (e.g., vulcanism, atmospheric river influx, carbon capture/injection, albedo alteration) updates cell state variables via `applyThermodynamicOverrides`, the transformation represents a boundary flux $\Phi_{\text{override}}$ applied across an infinitesimal boundary layer:

$$\Delta M_i = M_i^{(t+1)} - M_i^{(t)} = \sum_{k \in \mathcal{K}_{\text{matter}}} \left( m_{i,k}^{\text{post}} - m_{i,k}^{\text{pre}} \right)$$

$$\Delta U_i = U_i^{(t+1)} - U_i^{(t)} = \Delta U_{\text{sensible}, i} + \sum_{k \in \mathcal{K}_{\text{matter}}} \Delta m_{i,k} \cdot h_{k}^{\circ}$$

where:
- $\mathcal{K}_{\text{matter}} = \{\text{water}, \text{soil\_organic\_carbon}, \text{vegetation\_biomass}, \text{atmospheric\_co2}, \text{mineral\_nitrogen}\}$.
- $h_{k}^{\circ}$ is the specific chemical formation enthalpy of species $k$ at reference temperature $T_0 = 298.15\,\text{K}$.
- $U_{\text{sensible}, i}$ is the macroscopic thermal internal energy of cell $i$.

The total external mass and energy injected into the system is compiled into the override ledger $\mathcal{L}_{\text{override}}$:
$$\Delta M_{\text{override}} = \sum_{i=1}^{N_{\text{cells}}} \Delta M_i, \quad \Delta U_{\text{override}} = \sum_{i=1}^{N_{\text{cells}}} \Delta U_i$$

### 1.2 Thermal Heat Capacity & State Coupling
Thermal energy $U_{\text{sensible}, i}$ and absolute temperature $T_i$ are thermodynamically conjugate variables coupled through the cell's composite heat capacity $C_{p, i}$ $[\text{J}\cdot\text{K}^{-1}]$:

$$C_{p, i} = \sum_{k} m_{i,k} \cdot c_{p,k} + m_{\text{regolith}, i} \cdot c_{p,\text{regolith}}$$

#### Specific Heat Capacities ($c_{p,k}$ at $298.15\,\text{K}$):
| Chemical / Physical Stock ($k$) | Specific Heat $c_{p,k}$ ($\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$) | Enthalpy Reference $h_k^\circ$ ($\text{J}\cdot\text{kg}^{-1}$) |
| :--- | :--- | :--- |
| Liquid Water ($\text{H}_2\text{O}$) | $4184.0$ | $-15.87 \times 10^6$ |
| Soil Organic Carbon ($\text{SOC}$) | $1800.0$ | $-32.79 \times 10^6$ (caloric eq.) |
| Vegetation Biomass (Dry Matter) | $1900.0$ | $-17.50 \times 10^6$ |
| Atmospheric $\text{CO}_2$ | $846.0$ | $-8.94 \times 10^6$ |
| Mineral Nitrogen ($\text{NO}_3^- / \text{NH}_4^+$ eq.) | $1200.0$ | $-2.85 \times 10^6$ |
| Regolith / Bedrock Matrix | $840.0$ | $0.00$ (reference crust) |

When an override updates $T_i \to T_i^{\text{new}}$ without specifying $U_{\text{sensible}, i}$, the sensible heat channel is updated via:
$$U_{\text{sensible}, i}^{\text{new}} = C_{p, i}^{\text{new}} \cdot T_i^{\text{new}}$$
$$\Delta U_{\text{sensible}, i} = U_{\text{sensible}, i}^{\text{new}} - U_{\text{sensible}, i}^{\text{old}}$$

Conversely, when sensible heat is directly modified $U_{\text{sensible}, i} \to U_{\text{sensible}, i}^{\text{new}}$ without an explicit temperature override:
$$T_i^{\text{new}} = \frac{U_{\text{sensible}, i}^{\text{new}}}{C_{p, i}^{\text{new}}}$$

If both $T_i$ and $U_{\text{sensible}, i}$ are provided, consistency is checked to within a tolerance $\varepsilon_U = 10^{-3}\,\text{J}$. In `strictThermodynamicBounds` mode, inconsistencies trigger a `ThermodynamicInconsistencyError`; under non-strict mode, $U_{\text{sensible}, i}$ is reconciled to $C_{p, i} \cdot T_i$.

### 1.3 Second Law Bounds & Admissibility Criteria
1. **Third Law Absolute Zero Limit**:
   $$T_i \ge T_{\text{min}} = 2.7315\,\text{K} \quad (\text{Cosmic Microwave Background limit})$$
2. **Positivity of Matter Densities**:
   $$m_{i,k} \ge 0.0\,\text{kg} \quad \forall k \in \mathcal{K}_{\text{matter}}$$
   Negative mass is strictly non-physical. Setting $m_{i,k} < 0$ in strict mode raises `NegativeMassForbiddenError`; in clamping mode it is rectified to $0.0\,\text{kg}$.
3. **Radiative Emissivity / Albedo Boundedness**:
   $$\alpha_i \in [0.0, 1.0]$$
   Reflectance bounds outside $[0, 1]$ violate radiant energy conservation.
4. **Entropy Ledgering**:
   An abrupt override injects or removes entropy across the system boundary:
   $$\Delta S_{\text{override}, i} = \frac{\Delta U_{\text{sensible}, i}}{T_i} + \sum_k \Delta m_{i,k} \cdot s_k^\circ$$

---

## 2. Stock Transfer & Override Equations

### 2.1 Direct Scalar Delta Formulations
For any cell $i$ with state vector $\mathbf{x}_i \in \mathbb{R}^C$ where $C$ is the channel dimension:

$$\mathbf{x}_i = \begin{bmatrix}
T_i \\
m_{i, \text{water}} \\
m_{i, \text{soc}} \\
m_{i, \text{bio}} \\
m_{i, \text{co2}} \\
m_{i, \text{mineral\_n}} \\
U_{i, \text{sensible}} \\
\alpha_i
\end{bmatrix}$$

Let the override record be $\mathbf{\theta}_i = \{ (\text{field}_j, v_j) \}$.

#### Channel Delays & Deltas:
- **Water Mass ($\text{kg}$)**:
  $$\Delta m_{i, \text{water}} = v_{\text{water}} - m_{i, \text{water}}^{\text{pre}}$$
- **Soil Organic Carbon Mass ($\text{kg}$)**:
  $$\Delta m_{i, \text{soc}} = v_{\text{soc}} - m_{i, \text{soc}}^{\text{pre}}$$
- **Vegetation Biomass Mass ($\text{kg}$)**:
  $$\Delta m_{i, \text{bio}} = v_{\text{bio}} - m_{i, \text{bio}}^{\text{pre}}$$
- **Atmospheric $\text{CO}_2$ Mass ($\text{kg}$)**:
  $$\Delta m_{i, \text{co2}} = v_{\text{co2}} - m_{i, \text{co2}}^{\text{pre}}$$
- **Mineral Nitrogen Mass ($\text{kg}$)**:
  $$\Delta m_{i, \text{mineral\_n}} = v_{\text{mineral\_n}} - m_{i, \text{mineral\_n}}^{\text{pre}}$$
- **Total Net Cell Mass Delta ($\text{kg}$)**:
  $$\Delta M_i = \Delta m_{i, \text{water}} + \Delta m_{i, \text{soc}} + \Delta m_{i, \text{bio}} + \Delta m_{i, \text{co2}} + \Delta m_{i, \text{mineral\_n}}$$

### 2.2 Energy Balance Delta
The net energy change injected by the override into cell $i$ accounts for thermal internal energy and chemical stock modifications:

$$\Delta U_i = \Delta U_{\text{sensible}, i} + \Delta U_{\text{chem}, i}$$

where:
$$\Delta U_{\text{sensible}, i} = U_{i, \text{sensible}}^{\text{post}} - U_{i, \text{sensible}}^{\text{pre}}$$
$$\Delta U_{\text{chem}, i} = \sum_{k \in \mathcal{K}_{\text{matter}}} \Delta m_{i, k} \cdot h_k^\circ$$

If `recomputeSensibleHeat` is enabled and $T_i$ is modified without an explicit sensible heat value:
$$C_{p, i}^{\text{post}} = m_{\text{regolith}, i} \cdot c_{p,\text{regolith}} + \sum_{k \in \mathcal{K}_{\text{matter}}} m_{i, k}^{\text{post}} \cdot c_{p, k}$$
$$U_{i, \text{sensible}}^{\text{post}} = C_{p, i}^{\text{post}} \cdot T_i^{\text{post}}$$
$$\Delta U_{\text{sensible}, i} = U_{i, \text{sensible}}^{\text{post}} - U_{i, \text{sensible}}^{\text{pre}}$$

---

## 3. Monadic State Transition Formalism

In the monadic spatial pipeline, `SpatialMonad` wraps the raw `H3StateTensor` $\mathcal{T}$ and its execution context $\mathcal{E} = \langle t, \mathcal{L}_{\text{history}} \rangle$:

$$\mathcal{M}_t = \text{SpatialMonad}(\mathcal{T}_t, \mathcal{E}_t)$$

The override transition is defined as an endomorphic Kleisli arrow:
$$\text{applyOverrides}: (\text{OverridesMap}, \text{Options}) \to (\text{SpatialMonad} \to \text{SpatialMonad})$$

### Monadic Commutative Diagram:
```
           M_t = (T_t, L_t)
                  │
                  │  bind(applyThermodynamicOverrides(overrides, opts))
                  ▼
          M_(t+1) = (T_(t+1), L_(t+1))
          
where:
  T_(t+1) = T_t modified in-place (Float64Array buffer stride mutation)
  L_(t+1) = L_t ∪ { ThermodynamicOverrideReport }
```

### Invariant Guarantees:
1. **Identity Law**:
   $$\mathcal{M}.\text{bind}(t \to \text{applyThermodynamicOverrides}(t, \emptyset)) \equiv \mathcal{M}$$
   Applying empty overrides yields zero mass/energy delta and unmodified buffer hashes.
2. **Associativity / Composability**:
   $$\text{applyOverrides}(\mathbf{\theta}_B) \circ \text{applyOverrides}(\mathbf{\theta}_A) \equiv \text{applyOverrides}(\mathbf{\theta}_A \cup \mathbf{\theta}_B)$$
   for disjoint cell sets $A \cap B = \emptyset$.

---

## 4. Executable Monad Method Specifications

### 4.1 Interface Definitions (`src/spatial/h3_types.ts`)

```typescript
/**
 * Physical channel layout indices within H3StateTensor stride buffer.
 */
export const enum ThermodynamicChannel {
  TEMPERATURE_KELVIN = 0,
  WATER_MASS_KG = 1,
  SOIL_ORGANIC_CARBON_KG = 2,
  VEGETATION_BIOMASS_KG = 3,
  ATMOSPHERIC_CO2_KG = 4,
  MINERAL_NITROGEN_KG = 5,
  SENSIBLE_HEAT_JOULES = 6,
  ALBEDO = 7,
  CHANNEL_COUNT = 8,
}

/**
 * Standard specific heat capacities (J / kg / K) and enthalpy reference values.
 */
export const THERMODYNAMIC_CONSTANTS = {
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 50_000.0,
  SPECIFIC_HEAT: {
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
  },
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
    REGOLITH: 0.0,
  },
} as const;

export interface CellThermodynamicOverride {
  temperatureKelvin?: number;
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  sensibleHeatJoules?: number;
  albedo?: number;
}

export type H3ThermodynamicOverridesMap =
  | Map<string, CellThermodynamicOverride>
  | Record<string, CellThermodynamicOverride>;

export interface CellThermodynamicDeltaRecord {
  h3Index: string;
  cellIndex: number;
  massDeltaKg: number;
  energyDeltaJoules: number;
  thermalEnergyDeltaJoules: number;
  chemicalEnergyDeltaJoules: number;
  overriddenFields: (keyof CellThermodynamicOverride)[];
}

export interface ThermodynamicOverrideReport {
  timestamp: number;
  cellCountModified: number;
  netMassDeltaKg: number;
  netEnergyDeltaJoules: number;
  netThermalEnergyDeltaJoules: number;
  netChemicalEnergyDeltaJoules: number;
  cellReports: CellThermodynamicDeltaRecord[];
}

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  allowMassDestruction?: boolean;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
}
```

### 4.2 Core Algorithm Specification (`src/spatial/h3_state_tensor.ts`)

```typescript
import {
  CellThermodynamicOverride,
  CellThermodynamicDeltaRecord,
  ThermodynamicOverrideReport,
  H3ThermodynamicOverridesMap,
  OverrideOptions,
  ThermodynamicChannel,
  THERMODYNAMIC_CONSTANTS,
} from './h3_types';

export class ThermodynamicDomainViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicDomainViolationError';
  }
}

export class NegativeMassForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NegativeMassForbiddenError';
  }
}

export class CellOutOfBoundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CellOutOfBoundsError';
  }
}

/**
 * Calculates the composite heat capacity Cp (J / K) of a cell based on current mass stocks.
 */
export function computeCellHeatCapacity(
  buffer: Float64Array,
  cellOffset: number,
  regolithMassKg: number = THERMODYNAMIC_CONSTANTS.DEFAULT_REGOLITH_MASS_KG
): number {
  const c = THERMODYNAMIC_CONSTANTS.SPECIFIC_HEAT;
  const water = buffer[cellOffset + ThermodynamicChannel.WATER_MASS_KG];
  const soc = buffer[cellOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
  const bio = buffer[cellOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
  const co2 = buffer[cellOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
  const n = buffer[cellOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];

  return (
    regolithMassKg * c.REGOLITH +
    water * c.WATER +
    soc * c.SOIL_ORGANIC_CARBON +
    bio * c.VEGETATION_BIOMASS +
    co2 * c.ATMOSPHERIC_CO2 +
    n * c.MINERAL_NITROGEN
  );
}

/**
 * Computes chemical enthalpy for matter stocks in cell (Joules).
 */
export function computeCellChemicalEnthalpy(
  buffer: Float64Array,
  cellOffset: number
): number {
  const h = THERMODYNAMIC_CONSTANTS.SPECIFIC_ENTHALPY;
  const water = buffer[cellOffset + ThermodynamicChannel.WATER_MASS_KG];
  const soc = buffer[cellOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
  const bio = buffer[cellOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
  const co2 = buffer[cellOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
  const n = buffer[cellOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];

  return (
    water * h.WATER +
    soc * h.SOIL_ORGANIC_CARBON +
    bio * h.VEGETATION_BIOMASS +
    co2 * h.ATMOSPHERIC_CO2 +
    n * h.MINERAL_NITROGEN
  );
}

/**
 * Applies partial thermodynamic overrides across specified H3 cells within the state tensor.
 * Validates domain boundaries, updates contiguous Float64Array buffers in-place,
 * and compiles a thermodynamic conservation audit report.
 */
export function applyThermodynamicOverrides(
  tensor: H3StateTensor,
  overrides: H3ThermodynamicOverridesMap,
  options: OverrideOptions = {}
): ThermodynamicOverrideReport {
  const strict = options.strictThermodynamicBounds ?? true;
  const minTemp = options.minTemperatureKelvin ?? THERMODYNAMIC_CONSTANTS.MIN_TEMPERATURE_KELVIN;
  const recomputeHeat = options.recomputeSensibleHeat ?? true;
  const regolithMass = options.regolithMassKg ?? THERMODYNAMIC_CONSTANTS.DEFAULT_REGOLITH_MASS_KG;

  const entries = overrides instanceof Map ? overrides.entries() : Object.entries(overrides);

  let netMassDeltaKg = 0.0;
  let netEnergyDeltaJoules = 0.0;
  let netThermalDeltaJoules = 0.0;
  let netChemicalDeltaJoules = 0.0;
  const cellReports: CellThermodynamicDeltaRecord[] = [];

  const buffer = tensor.buffer;
  const stride = ThermodynamicChannel.CHANNEL_COUNT;

  for (const [h3Index, override] of entries) {
    const cellIdx = tensor.getCellIndex(h3Index);
    if (cellIdx === -1) {
      if (strict) {
        throw new CellOutOfBoundsError(`H3 cell ${h3Index} does not exist in spatial tensor.`);
      }
      continue;
    }

    const baseOffset = cellIdx * stride;
    const overriddenFields: (keyof CellThermodynamicOverride)[] = [];

    // Pre-state capture
    const preWater = buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG];
    const preSoc = buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
    const preBio = buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
    const preCo2 = buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
    const preN = buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
    const preMass = preWater + preSoc + preBio + preCo2 + preN;

    const preSensibleHeat = buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES];
    const preChemicalEnthalpy = computeCellChemicalEnthalpy(buffer, baseOffset);

    // Apply Matter Stock Overrides
    if (override.waterMassKg !== undefined) {
      let val = override.waterMassKg;
      if (val < 0) {
        if (strict) throw new NegativeMassForbiddenError(`Negative water mass ${val} at ${h3Index}`);
        val = 0.0;
      }
      buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG] = val;
      overriddenFields.push('waterMassKg');
    }

    if (override.soilOrganicCarbonKg !== undefined) {
      let val = override.soilOrganicCarbonKg;
      if (val < 0) {
        if (strict) throw new NegativeMassForbiddenError(`Negative SOC ${val} at ${h3Index}`);
        val = 0.0;
      }
      buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG] = val;
      overriddenFields.push('soilOrganicCarbonKg');
    }

    if (override.vegetationBiomassKg !== undefined) {
      let val = override.vegetationBiomassKg;
      if (val < 0) {
        if (strict) throw new NegativeMassForbiddenError(`Negative biomass ${val} at ${h3Index}`);
        val = 0.0;
      }
      buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG] = val;
      overriddenFields.push('vegetationBiomassKg');
    }

    if (override.atmosphericCo2Kg !== undefined) {
      let val = override.atmosphericCo2Kg;
      if (val < 0) {
        if (strict) throw new NegativeMassForbiddenError(`Negative CO2 ${val} at ${h3Index}`);
        val = 0.0;
      }
      buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG] = val;
      overriddenFields.push('atmosphericCo2Kg');
    }

    if (override.mineralNitrogenKg !== undefined) {
      let val = override.mineralNitrogenKg;
      if (val < 0) {
        if (strict) throw new NegativeMassForbiddenError(`Negative mineral N ${val} at ${h3Index}`);
        val = 0.0;
      }
      buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG] = val;
      overriddenFields.push('mineralNitrogenKg');
    }

    // Apply Albedo Override
    if (override.albedo !== undefined) {
      let val = override.albedo;
      if (val < 0.0 || val > 1.0) {
        if (strict) throw new ThermodynamicDomainViolationError(`Albedo ${val} out of bounds [0, 1] at ${h3Index}`);
        val = Math.max(0.0, Math.min(1.0, val));
      }
      buffer[baseOffset + ThermodynamicChannel.ALBEDO] = val;
      overriddenFields.push('albedo');
    }

    // Apply Thermal / Sensible Heat Coupling
    let tempOverridden = false;
    if (override.temperatureKelvin !== undefined) {
      let val = override.temperatureKelvin;
      if (val < minTemp) {
        if (strict) {
          throw new ThermodynamicDomainViolationError(
            `Temperature ${val} K below minimum threshold ${minTemp} K at ${h3Index}`
          );
        }
        val = minTemp;
      }
      buffer[baseOffset + ThermodynamicChannel.TEMPERATURE_KELVIN] = val;
      overriddenFields.push('temperatureKelvin');
      tempOverridden = true;
    }

    if (override.sensibleHeatJoules !== undefined) {
      buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES] = override.sensibleHeatJoules;
      overriddenFields.push('sensibleHeatJoules');
      if (!tempOverridden && recomputeHeat) {
        const cp = computeCellHeatCapacity(buffer, baseOffset, regolithMass);
        buffer[baseOffset + ThermodynamicChannel.TEMPERATURE_KELVIN] = override.sensibleHeatJoules / cp;
      }
    } else if (tempOverridden && recomputeHeat) {
      const cp = computeCellHeatCapacity(buffer, baseOffset, regolithMass);
      const postTemp = buffer[baseOffset + ThermodynamicChannel.TEMPERATURE_KELVIN];
      buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES] = cp * postTemp;
    }

    // Post-state capture & Delta computation
    const postWater = buffer[baseOffset + ThermodynamicChannel.WATER_MASS_KG];
    const postSoc = buffer[baseOffset + ThermodynamicChannel.SOIL_ORGANIC_CARBON_KG];
    const postBio = buffer[baseOffset + ThermodynamicChannel.VEGETATION_BIOMASS_KG];
    const postCo2 = buffer[baseOffset + ThermodynamicChannel.ATMOSPHERIC_CO2_KG];
    const postN = buffer[baseOffset + ThermodynamicChannel.MINERAL_NITROGEN_KG];
    const postMass = postWater + postSoc + postBio + postCo2 + postN;

    const postSensibleHeat = buffer[baseOffset + ThermodynamicChannel.SENSIBLE_HEAT_JOULES];
    const postChemicalEnthalpy = computeCellChemicalEnthalpy(buffer, baseOffset);

    const cellMassDelta = postMass - preMass;
    const thermalEnergyDelta = postSensibleHeat - preSensibleHeat;
    const chemicalEnergyDelta = postChemicalEnthalpy - preChemicalEnthalpy;
    const totalCellEnergyDelta = thermalEnergyDelta + chemicalEnergyDelta;

    netMassDeltaKg += cellMassDelta;
    netEnergyDeltaJoules += totalCellEnergyDelta;
    netThermalDeltaJoules += thermalEnergyDelta;
    netChemicalDeltaJoules += chemicalEnergyDelta;

    cellReports.push({
      h3Index,
      cellIndex: cellIdx,
      massDeltaKg: cellMassDelta,
      energyDeltaJoules: totalCellEnergyDelta,
      thermalEnergyDeltaJoules: thermalEnergyDelta,
      chemicalEnergyDeltaJoules: chemicalEnergyDelta,
      overriddenFields,
    });
  }

  return {
    timestamp: Date.now(),
    cellCountModified: cellReports.length,
    netMassDeltaKg,
    netEnergyDeltaJoules,
    netThermalEnergyDeltaJoules: netThermalDeltaJoules,
    netChemicalEnergyDeltaJoules: netChemicalDeltaJoules,
    cellReports,
  };
}
```

### 4.3 SpatialMonad Method Binding (`src/monads/spatial_monad.ts`)

```typescript
export class SpatialMonad {
  constructor(
    private readonly tensor: H3StateTensor,
    private readonly overrideLedger: ThermodynamicOverrideReport[] = []
  ) {}

  /**
   * Monadic bind operation applying partial thermodynamic overrides to H3 cells.
   * Returns a new SpatialMonad wrapper with updated internal tensor state
   * and an appended boundary flux audit report.
   */
  public applyOverrides(
    overrides: H3ThermodynamicOverridesMap,
    options?: OverrideOptions
  ): SpatialMonad {
    const report = applyThermodynamicOverrides(this.tensor, overrides, options);
    return new SpatialMonad(this.tensor, [...this.overrideLedger, report]);
  }

  public getTensor(): H3StateTensor {
    return this.tensor;
  }

  public getOverrideLedger(): readonly ThermodynamicOverrideReport[] {
    return this.overrideLedger;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this.overrideLedger.reduce((sum, r) => sum + r.netMassDeltaKg, 0.0);
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this.overrideLedger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0.0);
  }
}
```

---

## 5. Verification Conditions & Edge Cases

| Scenario | Input Condition | Expected Behavior |
| :--- | :--- | :--- |
| **Zero Override** | Empty Map `{}` | Report: 0 cells, 0.0 mass delta, 0.0 energy delta. Buffer unchanged. |
| **Negative Mass (Strict)** | `waterMassKg: -10.0`, `strict: true` | Throws `NegativeMassForbiddenError`. Buffer unmodified. |
| **Negative Mass (Non-Strict)** | `waterMassKg: -10.0`, `strict: false`| Clamps to `0.0 kg`. Mass delta tracks pre-mass subtraction. |
| **Sub-CMB Temperature (Strict)**| `temperatureKelvin: 1.0`, `strict: true` | Throws `ThermodynamicDomainViolationError` ($T < 2.7315\,\text{K}$). |
| **Thermal Recalculation** | `temperatureKelvin: 310.0`, `recompute: true` | Recalculates $U_{\text{sensible}} = C_p(m) \cdot 310.0$; updates delta ledger. |
| **Out-of-Bounds Cell (Strict)**| H3 index not in tensor index map | Throws `CellOutOfBoundsError`. |
| **Albedo Boundary Violation** | `albedo: 1.5`, `strict: false` | Clamped to `1.0`. `overriddenFields` logs `'albedo'`. |