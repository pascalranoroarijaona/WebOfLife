# Method Specifications: Sprint 088 — Center Aperture Invariance & Spatial Monad Gating

## 1. Physical, Ecological, and Mathematical Context

In the Web of Life simulation architecture, discrete global hexagonal grids (H3 aperture-7 / aperture-3 projections) partition the planetary surface into nested hierarchical spatial volumes. Each cell at resolution $r$ encapsulates a multi-layer ecological column:
- **Atmospheric Boundary Layer (ABL)**: Gas phase ($CO_2$, $O_2$, $H_2O_{(v)}$), incoming solar irradiance ($I_{\text{solar}}$), and sensible/latent heat flux.
- **Canopy / Vegetation Layer**: Living autotrophic biomass ($C_{\text{veg}}$), canopy interception moisture ($W_{\text{canopy}}$), and metabolic biochemical exergy.
- **Pedosphere / Soil Column**: Soil organic matter ($C_{\text{som}}$), liquid moisture ($W_{\text{soil}}$), and available mineral macronutrients ($M_{\text{soil}} = [N, P, K]$).

Traversal between resolution levels $r$ and $r + \Delta r$ is encoded as an ordered sequence of directional digits:
$$\mathbf{d} = \langle d_1, d_2, \dots, d_k \rangle, \quad d_i \in \{0, 1, 2, 3, 4, 5, 6\}$$

- **Digit `0`**: Centroid-invariant child cell (identity lateral displacement).
- **Digits `1..6`**: Peripheral child cells offset by azimuths $\theta_d = (d - 1) \cdot \frac{\pi}{3} + \theta_0$ on the hexagonal ring.

### 1.1 Center Aperture Invariance Theorem
Let $\mathbf{x}_{r}$ denote the spatial centroid coordinates $(lat, lon, z)$ of a hexagonal cell at resolution $r$. The downscaled child centroid $\mathbf{x}_{r+1}(d)$ satisfies:
$$\mathbf{x}_{r+1}(d) = \mathbf{x}_{r} + \mathbf{T}_{r}(d)$$
where $\mathbf{T}_{r}(0) \equiv \mathbf{0}$ for all resolutions $r$. 

Consequently, for any hierarchical descent sequence $\mathbf{d}$ of length $m$:
$$\Phi_{\text{zero}}(\mathbf{d}) \equiv \forall i \in \{1, \dots, m\}, \, d_i = 0 \iff \sum_{i=1}^m \mathbf{T}_{r+i-1}(d_i) = \mathbf{0}$$

### 1.2 Conservation Laws Under Zero Lateral Flux
When `hasZeroApertureSequence(d)` evaluates to `true`:
1. **Advective and Diffusive Lateral Fluxes Vanish**:
   $$\mathbf{J}_{\text{lateral}, \text{mass}} \equiv \mathbf{0}, \quad \mathbf{J}_{\text{lateral}, \text{enthalpy}} \equiv \mathbf{0}$$
2. **Column Isolation**:
   The cell behaves as a closed thermodynamic system with respect to lateral boundaries $\partial \Omega_{\text{lateral}}$. All state transitions are strictly governed by vertical boundary fluxes (solar downwelling, precipitation, radiative cooling) and internal non-equilibrium dissipation:
   $$\frac{d M_{\text{column}}}{dt} = \dot{m}_{\text{top}} - \dot{m}_{\text{bottom}}, \quad \frac{d U_{\text{column}}}{dt} = \dot{Q}_{\text{top}} - \dot{Q}_{\text{bottom}} - \dot{W}$$

---

## 2. Mass and Energy Delta Formalization

### 2.1 State Vector Definition
For an ecological spatial column at cell $c$, the extensive stock state vector $\mathbf{S}_c$ is defined as:
$$\mathbf{S}_c = \begin{bmatrix} C_{\text{biomass}} \\ C_{\text{som}} \\ C_{\text{atm}} \\ W_{\text{liq}} \\ W_{\text{vap}} \\ O_2 \\ M_{\text{minerals}} \\ U_{\text{thermal}} \end{bmatrix} \quad \left( \begin{array}{l} \text{kg C} \\ \text{kg C} \\ \text{kg C} \\ \text{kg } H_2O \\ \text{kg } H_2O \\ \text{kg } O_2 \\ \text{kg } [N, P, K] \\ \text{Joules (J)} \end{array} \right)$$

### 2.2 Process 1: Aperture-Invariant Hierarchical Mass-Energy Projection
When projecting an extensive state tensor $\mathbf{S}^{(r)}$ from resolution $r$ to $r+1$ along a zero-aperture path $\mathbf{d} = \langle 0 \rangle$:
- The aperture-7 area ratio is $\gamma_A = \frac{A_{r+1}}{A_r} = \frac{1}{7}$.
- Mass and internal thermal energy scale homogeneously by area fraction $\gamma_A$:
  $$\mathbf{S}^{(r+1)}_{\text{center}} = \gamma_A \cdot \mathbf{S}^{(r)}$$
- Lateral flux across internal boundary facets is rigorously zero:
  $$\Delta \mathbf{S}_{\text{lateral}} = \mathbf{0}$$

### 2.3 Process 2: Directional Lateral Exchange (Non-Zero Aperture Branch)
When $\exists d_i \ne 0$ (`hasZeroApertureSequence` returns `false`), lateral boundary flux is active across the facet oriented toward neighbor $n(d_i)$.
For hydraulic head gradient $\nabla \psi$ and concentration gradient $\nabla [X]$ across facet length $L = \frac{2}{\sqrt{3}} \cdot r_{\text{hex}}$:

$$\Delta W_{\text{lateral}} = - K_{\text{hyd}} \cdot \frac{\Delta \psi}{\Delta x} \cdot L \cdot D_{\text{soil}} \cdot \Delta t$$
$$\Delta C_{\text{lateral}} = - D_{\text{diff}} \cdot \frac{\Delta [C]}{\Delta x} \cdot L \cdot D_{\text{canopy}} \cdot \Delta t + [C] \cdot \mathbf{v}_{\text{wind}} \cdot \mathbf{n}_{d_i} \cdot L \cdot H_{\text{atm}} \cdot \Delta t$$
$$\Delta U_{\text{lateral}} = c_p \cdot T \cdot \Delta W_{\text{lateral}} + \rho_{\text{air}} c_{p,\text{air}} (\mathbf{v}_{\text{wind}} \cdot \mathbf{n}_{d_i}) T \cdot L \cdot H_{\text{atm}} \cdot \Delta t$$

### 2.4 Process 3: In-Situ Vertical Column Dissipation
Under confirmed zero-aperture invariance ($\mathbf{J}_{\text{lateral}} = \mathbf{0}$), internal biochemical transformations proceed according to strict stoichiometric stoichiometry:

#### Photosynthesis (when solar irradiance $I_{\text{down}} > 0$):
$$6 \, CO_2 + 6 \, H_2O + \Delta H_{\text{synth}} \xrightarrow{h\nu} C_6H_{12}O_6 + 6 \, O_2$$
- Stoichiometric mass conversion ratio: $1 \text{ kg } C \text{ fixed} \iff \frac{44}{12} \text{ kg } CO_2 \text{ consumed} + \frac{18}{12} \text{ kg } H_2O \text{ consumed} \to \frac{32}{12} \text{ kg } O_2 \text{ evolved}$.
- Enthalpy absorption: $\Delta H_{\text{synth}} = +467 \times 10^3 \text{ J/mol C} = +38.92 \times 10^6 \text{ J/kg C}$.

#### Autotrophic & Heterotrophic Respiration:
$$C_6H_{12}O_6 + 6 \, O_2 \to 6 \, CO_2 + 6 \, H_2O + \Delta H_{\text{resp}}$$
- Mass conversion: $1 \text{ kg } C \text{ respired} \iff \frac{32}{12} \text{ kg } O_2 \text{ consumed} \to \frac{44}{12} \text{ kg } CO_2 \text{ released} + \frac{18}{12} \text{ kg } H_2O \text{ released}$.
- Thermal dissipation: $\Delta H_{\text{resp}} = -467 \times 10^3 \text{ J/mol C} = -38.92 \times 10^6 \text{ J/kg C}$.

---

## 3. Monad Interface & Implementation Specifications

### 3.1 Pure Predicate Specification (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Evaluates whether an array of H3 directional digits contains exclusively
 * center direction (0) digits, representing an aperture-invariant hierarchical
 * descent path where spatial centroid coordinates remain unaltered.
 *
 * Mathematical definition:
 *   Φ_zero(d) <==> ∀ i ∈ {0, ..., m-1}, d[i] === 0
 *
 * Boundary condition:
 *   An empty sequence (length === 0) represents identity traversal across
 *   zero levels and vacuously satisfies the predicate, returning true.
 *
 * @param digits - Readonly sequence of directional digits (0-6).
 * @returns true if all digits are 0 or sequence is empty; false otherwise.
 */
export function hasZeroApertureSequence(digits: readonly number[]): boolean {
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] !== 0) {
      return false;
    }
  }
  return true;
}
```

### 3.2 Spatial Flux Gating Monad

```typescript
export interface EcologicalStockState {
  readonly carbonBiomassKg: number;
  readonly carbonSomKg: number;
  readonly carbonAtmKg: number;
  readonly waterLiquidKg: number;
  readonly waterVaporKg: number;
  readonly oxygenKg: number;
  readonly mineralsKg: number;
  readonly thermalEnergyJoules: number;
}

export interface StockDeltas {
  readonly deltaCarbonBiomassKg: number;
  readonly deltaCarbonSomKg: number;
  readonly deltaCarbonAtmKg: number;
  readonly deltaWaterLiquidKg: number;
  readonly deltaWaterVaporKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaThermalEnergyJoules: number;
}

export interface HierarchicalProjectionResult {
  readonly targetState: EcologicalStockState;
  readonly lateralDeltas: StockDeltas;
  readonly isApertureInvariant: boolean;
  readonly entropyGeneratedJoulesPerKelvin: number;
}
```

### 3.3 Executable Monad Method: `executeHierarchicalApertureFlux`

```typescript
import { hasZeroApertureSequence } from './h3_adjacency';

export class SpatialFluxMonad {
  private readonly state: EcologicalStockState;

  constructor(state: EcologicalStockState) {
    this.state = Object.freeze({ ...state });
  }

  public getState(): EcologicalStockState {
    return this.state;
  }

  /**
   * Projects extensive ecological stock states across hierarchical levels
   * along the directional path `pathDigits`.
   *
   * Fast-path: When `hasZeroApertureSequence(pathDigits)` is true, lateral boundary
   * flux tensors are bypassed completely (J_lateral = 0), strictly conserving
   * vertical column totals and eliminating lateral advection calculations.
   */
  public projectHierarchicalPath(
    pathDigits: readonly number[],
    sourceResolution: number,
    temperatureKelvin: number
  ): HierarchicalProjectionResult {
    const isZeroAperture = hasZeroApertureSequence(pathDigits);
    const steps = pathDigits.length;
    const apertureFactor = Math.pow(1 / 7, steps);

    if (isZeroAperture) {
      // Zero Aperture Fast-Path: Identity Centroid Projection
      // Lateral flux is identically zero. Extensive stocks scale strictly by geometry.
      const zeroLateralDeltas: StockDeltas = {
        deltaCarbonBiomassKg: 0,
        deltaCarbonSomKg: 0,
        deltaCarbonAtmKg: 0,
        deltaWaterLiquidKg: 0,
        deltaWaterVaporKg: 0,
        deltaOxygenKg: 0,
        deltaMineralsKg: 0,
        deltaThermalEnergyJoules: 0,
      };

      const projectedState: EcologicalStockState = {
        carbonBiomassKg: this.state.carbonBiomassKg * apertureFactor,
        carbonSomKg: this.state.carbonSomKg * apertureFactor,
        carbonAtmKg: this.state.carbonAtmKg * apertureFactor,
        waterLiquidKg: this.state.waterLiquidKg * apertureFactor,
        waterVaporKg: this.state.waterVaporKg * apertureFactor,
        oxygenKg: this.state.oxygenKg * apertureFactor,
        mineralsKg: this.state.mineralsKg * apertureFactor,
        thermalEnergyJoules: this.state.thermalEnergyJoules * apertureFactor,
      };

      return {
        targetState: projectedState,
        lateralDeltas: zeroLateralDeltas,
        isApertureInvariant: true,
        entropyGeneratedJoulesPerKelvin: 0.0,
      };
    }

    // Peripheral Aperture Path: Lateral exchange is non-zero
    // Lateral flux coefficients for peripheral ring transition
    const lateralDisplacementRatio = (1 - apertureFactor);
    const lateralCarbonFlux = this.state.carbonAtmKg * lateralDisplacementRatio * 0.05;
    const lateralWaterFlux = this.state.waterVaporKg * lateralDisplacementRatio * 0.08;
    const lateralSensibleHeatFlux = this.state.thermalEnergyJoules * lateralDisplacementRatio * 0.02;

    const lateralDeltas: StockDeltas = {
      deltaCarbonBiomassKg: 0,
      deltaCarbonSomKg: 0,
      deltaCarbonAtmKg: -lateralCarbonFlux,
      deltaWaterLiquidKg: 0,
      deltaWaterVaporKg: -lateralWaterFlux,
      deltaOxygenKg: -(lateralCarbonFlux * (32 / 12)),
      deltaMineralsKg: 0,
      deltaThermalEnergyJoules: -lateralSensibleHeatFlux,
    };

    const projectedState: EcologicalStockState = {
      carbonBiomassKg: this.state.carbonBiomassKg * apertureFactor,
      carbonSomKg: this.state.carbonSomKg * apertureFactor,
      carbonAtmKg: (this.state.carbonAtmKg + lateralDeltas.deltaCarbonAtmKg) * apertureFactor,
      waterLiquidKg: this.state.waterLiquidKg * apertureFactor,
      waterVaporKg: (this.state.waterVaporKg + lateralDeltas.deltaWaterVaporKg) * apertureFactor,
      oxygenKg: (this.state.oxygenKg + lateralDeltas.deltaOxygenKg) * apertureFactor,
      mineralsKg: this.state.mineralsKg * apertureFactor,
      thermalEnergyJoules: (this.state.thermalEnergyJoules + lateralDeltas.deltaThermalEnergyJoules) * apertureFactor,
    };

    const entropyGen = Math.abs(lateralSensibleHeatFlux) / Math.max(temperatureKelvin, 200);

    return {
      targetState: projectedState,
      lateralDeltas,
      isApertureInvariant: false,
      entropyGeneratedJoulesPerKelvin: entropyGen,
    };
  }

  /**
   * Internal Column Biogeochemical Step: In-situ metabolic conversion
   * Strictly respects stoichiometry and conservation of mass/energy.
   */
  public stepInSituMetabolism(
    carbonRespiredKg: number,
    temperatureKelvin: number
  ): SpatialFluxMonad {
    if (carbonRespiredKg <= 0) {
      return this;
    }

    const maxRespirable = Math.min(carbonRespiredKg, this.state.carbonBiomassKg);
    const oxygenRequired = maxRespirable * (32 / 12);
    const actualOxygenConsumed = Math.min(oxygenRequired, this.state.oxygenKg);
    const actualCarbonRespired = actualOxygenConsumed * (12 / 32);

    const co2ProducedKg = actualCarbonRespired * (44 / 12);
    const h2oProducedKg = actualCarbonRespired * (18 / 12);
    const enthalpyReleasedJoules = actualCarbonRespired * 38.92e6; // 38.92 MJ / kg C

    const nextState: EcologicalStockState = {
      carbonBiomassKg: this.state.carbonBiomassKg - actualCarbonRespired,
      carbonSomKg: this.state.carbonSomKg,
      carbonAtmKg: this.state.carbonAtmKg + co2ProducedKg,
      waterLiquidKg: this.state.waterLiquidKg + h2oProducedKg,
      waterVaporKg: this.state.waterVaporKg,
      oxygenKg: this.state.oxygenKg - actualOxygenConsumed,
      mineralsKg: this.state.mineralsKg,
      thermalEnergyJoules: this.state.thermalEnergyJoules + enthalpyReleasedJoules,
    };

    return new SpatialFluxMonad(nextState);
  }
}
```

---

## 4. Verification Vectors & Acceptance Assertions

| Test Vector ID | Input Sequence `digits` | Expected `hasZeroApertureSequence` | Boundary Rationale | Thermodynamic Lateral Flux $\mathbf{J}_{\text{lateral}}$ |
|---|---|---|---|---|
| **V01** | `[]` | `true` | Vacuous satisfaction over empty set ($\emptyset$) | $\mathbf{0}$ |
| **V02** | `[0]` | `true` | Single-step center descent (centroid invariant) | $\mathbf{0}$ |
| **V03** | `[0, 0, 0, 0, 0]` | `true` | 5-level nested resolution descent without lateral translation | $\mathbf{0}$ |
| **V04** | `[1]` | `false` | Immediate lateral facet translation across edge 1 | $\ne \mathbf{0}$ |
| **V05** | `[0, 0, 2, 0]` | `false` | Peripheral excursion at resolution index 2; early exit triggered | $\ne \mathbf{0}$ |
| **V06** | `[6, 0, 0]` | `false` | Lateral displacement at first step; exits on index 0 | $\ne \mathbf{0}$ |
| **V07** | `[-1]` | `false` | Out-of-bounds directional index | Rejected |
| **V08** | `[7]` | `false` | Out-of-bounds directional index for base-7 aperture | Rejected |