# Sprint 085: Process Mining & Method Specifications
## Biophysical Aperture Digit Mechanics, Hierarchical Stock Transfer, & Directional Flux Monads

- **Sprint**: 085
- **Author**: Process Mining & Research Scientist
- **Status**: Complete
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Related Systems**: `src/spatial/spatial_flux_monad.ts`, `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`

---

## 1. Thermodynamic & Biophysical Overview

In the Web of Life spatial simulation engine, the discrete global grid system (DGGS) based on Uber H3 decomposes the planetary surface into hierarchical hexagonal control volumes. Each H3 cell $\mathcal{C}_{r}$ at resolution $r \in [0, 15]$ acts as a non-equilibrium thermodynamic finite control volume holding extensive state vectors:

$$\mathbf{S} = \begin{bmatrix} M_{\text{C}} \\ M_{\text{N}} \\ M_{\text{P}} \\ M_{\text{H}_2\text{O}} \\ M_{\text{O}_2} \\ M_{\text{min}} \\ U \end{bmatrix} \quad \left( \begin{matrix} \text{Carbon mass } [\text{kg}] \\ \text{Nitrogen mass } [\text{kg}] \\ \text{Phosphorus mass } [\text{kg}] \\ \text{Water mass } [\text{kg}] \\ \text{Oxygen mass } [\text{kg}] \\ \text{Structural minerals } [\text{kg}] \\ \text{Internal thermal energy } [\text{J}] \end{matrix} \right)$$

H3 utilizes an **aperture-7** hexagonal hierarchy. Moving from resolution $r-1$ to resolution $r$, a parent hexagon $\mathcal{C}_{r-1}$ is recursively subdivided into 7 sub-cells indexed by directional aperture digits:

$$d_k \in \{0, 1, 2, 3, 4, 5, 6\}$$

- **Digit $0$**: The central co-axial hexagon, collinear with the parent centroid.
- **Digits $1 \dots 6$**: The six peripheral hexagons rotated by the aperture angle $\theta \approx 19.1066^\circ = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right)$ relative to the parent coordinate axes.
- **Digit $7$**: Padding / terminal sentinel denoting resolutions beyond cell depth ($k > r$).

The extraction of directional digits $d_k$ via `extractH3IndexApertureDigits` enables analytical trajectory reconstruction, directional advection vector computation, and conservative multi-resolution downscaling without empirical database queries or loss of mass-energy balance.

---

## 2. Aperture Geometry and Spatial Metrics

### 2.1 Area Scaling and Geometric Relations
For resolution $r$, the nominal cell area $A(r)$ scales strictly by a factor of 7:

$$A(r) = \frac{A(0)}{7^r}$$

Where $A(0)$ is the base cell area. While individual aperture-7 subdivisions produce slight hexagonal truncation at cell boundaries across resolutions, the aggregate measure of the 7 child hexagons preserves the partition area:

$$\sum_{d=0}^{6} A^{(d)}(r) = A(r-1)$$

### 2.2 Directional Azimuth Vectors
Each non-zero digit $d \in \{1, \dots, 6\}$ corresponds to a planar displacement unit vector $\hat{\mathbf{u}}_d$ in the local coordinate frame of the parent cell:

$$\theta_d(r) = \theta_{\text{base}} + (d - 1) \cdot \frac{\pi}{3} \pm r \cdot \theta_{\text{aperture}}$$

Where:
- $\theta_{\text{aperture}} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.33347317228 \text{ rad} \ (19.106605^\circ)$
- The sign alternates between resolutions ($\pm$) due to the Class II / Class III rotation alternating sequence in H3.
- $\hat{\mathbf{u}}_0 = \mathbf{0}$ (central child).
- $\hat{\mathbf{u}}_d = \begin{bmatrix} \cos(\theta_d(r)) \\ \sin(\theta_d(r)) \end{bmatrix}$ for $d \in \{1, \dots, 6\}$.

---

## 3. Biophysical Process Formalization

### 3.1 Process 1: Aperture-7 Conservative Downscaling (Hierarchical Partitioning)

When downscaling biophysical inventories from parent $\mathcal{C}_{r-1}$ to child cells $\{\mathcal{C}_{r}^{(d)}\}_{d=0}^{6}$, extensive stocks must strictly conserve total mass and energy, while intensive variables (temperature, concentration) exhibit spatial heterogeneity driven by sub-grid elevation, canopy structure, and microclimate.

#### 3.1.1 Mass and Energy Partition Weights
Let $w_d$ denote the dimensionless distribution weight for child cell $d$ ($0 \le d \le 6$) such that:

$$\sum_{d=0}^{6} w_d = 1.0, \quad w_d > 0 \quad \forall d$$

In a uniform isotropic partition, $w_d = \frac{1}{7} \approx 0.142857142857$. In a topography-informed partition:

$$w_d = \frac{\exp\left(-\beta \cdot \Delta z_d\right)}{\sum_{j=0}^{6} \exp\left(-\beta \cdot \Delta z_j\right)}$$

where $\Delta z_d$ is the relative elevation offset of sub-aperture $d$ and $\beta$ is the environmental lapse/gravity pooling parameter.

#### 3.1.2 Governing Deltas
For each chemical stock $s \in \{\text{C}, \text{N}, \text{P}, \text{H}_2\text{O}, \text{O}_2, \text{min}\}$:

$$\Delta M_{s}^{(d)} = w_d \cdot M_{s,\text{parent}} - 0 = + w_d \cdot M_{s,\text{parent}}$$
$$\Delta M_{s,\text{parent}} = - \sum_{d=0}^{6} \Delta M_{s}^{(d)} = - M_{s,\text{parent}}$$

$$\sum_{d=0}^{6} \Delta M_{s}^{(d)} + \Delta M_{s,\text{parent}} = 0 \quad \text{[Exact Invariant]}$$

For thermal internal energy $U = M_{\text{total}} \cdot c_v \cdot T$:

$$U_{\text{parent}} = \sum_{d=0}^{6} U^{(d)} = \sum_{d=0}^{6} \left( w_d M_{\text{parent}} \cdot c_v \cdot T_d \right)$$

Subject to non-negative entropy generation during internal re-distribution:

$$\Delta S_{\text{partition}} = \sum_{d=0}^{6} w_d M_{\text{parent}} c_v \ln\left(\frac{T_d}{T_{\text{parent}}}\right) \ge 0$$

---

### 3.2 Process 2: Directional Convective Flux Routing via Aperture Digits

Surface runoff, dissolved nutrient wash-off, and boundary-layer atmospheric advection flow along the vector field $\vec{v}_{\text{adv}} = (v_x, v_y)$. The target directional aperture digit $d^*$ is resolved by matching the flow direction against the parsed aperture azimuths $\hat{\mathbf{u}}_d$:

$$d^* = \arg\max_{d \in \{1,\dots,6\}} \left( \vec{v}_{\text{adv}} \cdot \hat{\mathbf{u}}_d \right)$$

#### 3.2.1 Advective Flux Equations
For control volume $\mathcal{C}$ with cross-sectional boundary width $L(r) = \frac{2}{\sqrt{3}} \sqrt{\frac{2 A(r)}{3\sqrt{3}}}$ and fluid layer depth $h_{\text{fluid}}$:

$$Q_{\text{fluid}} = \|\vec{v}_{\text{adv}}\| \cdot h_{\text{fluid}} \cdot L(r) \cdot \Delta t \quad [\text{m}^3]$$

$$\Delta M_{\text{H}_2\text{O}} = \rho_{\text{H}_2\text{O}} \cdot Q_{\text{fluid}} \quad [\text{kg}]$$

Dissolved chemical transport (solute concentrations $C_{\text{C}}, C_{\text{N}}, C_{\text{P}}$ in $\text{kg}/\text{m}^3$):

$$\Delta M_{\text{C}} = C_{\text{C}} \cdot Q_{\text{fluid}}$$
$$\Delta M_{\text{N}} = C_{\text{N}} \cdot Q_{\text{fluid}}$$
$$\Delta M_{\text{P}} = C_{\text{P}} \cdot Q_{\text{fluid}}$$

Advected thermal enthalpy:

$$\Delta H_{\text{adv}} = \Delta M_{\text{H}_2\text{O}} \cdot c_{p,\text{water}} \cdot (T_{\text{src}} - T_{\text{ref}})$$

---

### 3.3 Process 3: Sub-Aperture Boundary Diffusion

Diffusive mixing between adjacent child apertures $d_a$ and $d_b$ across an internal interface of length $l_{\text{edge}}(r) = \sqrt{\frac{2 A(r)}{3\sqrt{3}}}$:

$$\dot{M}_{s,\text{diff}} = - \mathcal{D}_s \cdot l_{\text{edge}}(r) \cdot h_{\text{layer}} \cdot \frac{C_{s, b} - C_{s, a}}{\Delta x_{ab}}$$

Where:
- $\mathcal{D}_s$ is the species molecular/eddy diffusion coefficient $[\text{m}^2/\text{s}]$.
- $\Delta x_{ab} = 2 \cdot r_{\text{hex}}(r)$ is the center-to-center distance between neighboring aperture sub-cells.
- Solute concentration $C_{s, i} = \frac{M_{s, i}}{V_i}$.

Entropy production for thermal conduction between sub-apertures:

$$\dot{\sigma} = \kappa \cdot l_{\text{edge}} \cdot h \cdot \frac{(T_a - T_b)^2}{T_a \cdot T_b \cdot \Delta x_{ab}} \ge 0 \quad [\text{W}/\text{K}]$$

---

## 4. Executable Monad Method Specifications

### 4.1 Monad Interface & State Contracts

```typescript
// In src/spatial/h3_types.ts or src/spatial/spatial_flux_monad.ts

export interface BiophysicalStockVector {
  readonly carbonKg: number;
  readonly nitrogenKg: number;
  readonly phosphorusKg: number;
  readonly waterKg: number;
  readonly oxygenKg: number;
  readonly mineralKg: number;
  readonly thermalJoules: number;
}

export interface FluxTransferRecord {
  readonly sourceIndex: bigint;
  readonly targetIndex: bigint;
  readonly transferredStocks: BiophysicalStockVector;
  readonly apertureDigitUsed: number;
  readonly entropyProducedJoulesPerKelvin: number;
}
```

### 4.2 Executable Methods

```typescript
import { H3DirectionDigit, H3ApertureDecomposition } from './h3_types';
import { extractH3IndexApertureDigits } from './h3_adjacency';

export class SpatialFluxMonad {
  private constructor(
    public readonly cellIndex: bigint,
    public readonly stocks: BiophysicalStockVector,
    public readonly apertureData: H3ApertureDecomposition
  ) {}

  public static of(
    cellIndex: bigint | string,
    stocks: BiophysicalStockVector
  ): SpatialFluxMonad {
    const apertureData = extractH3IndexApertureDigits(cellIndex, {
      validateMode: true,
      validateBaseCell: true,
      validatePaddingDigits: true,
    });
    return new SpatialFluxMonad(apertureData.index, stocks, apertureData);
  }

  /**
   * Partitions parent stocks across all 7 child apertures at resolution r + 1.
   * Enforces 100% strict conservation of mass and first-law thermodynamics.
   */
  public partitionStocksToChildren(
    weights?: readonly number[]
  ): readonly { childDigit: H3DirectionDigit; childStocks: BiophysicalStockVector }[] {
    const defaultWeight = 1.0 / 7.0;
    const effectiveWeights = weights ?? [
      defaultWeight, defaultWeight, defaultWeight,
      defaultWeight, defaultWeight, defaultWeight, defaultWeight
    ];

    if (effectiveWeights.length !== 7) {
      throw new Error("Partition weights must contain exactly 7 values (digits 0..6).");
    }

    const weightSum = effectiveWeights.reduce((acc, w) => acc + w, 0);
    if (Math.abs(weightSum - 1.0) > 1e-12) {
      throw new Error(`Partition weights must sum to 1.0; received sum=${weightSum}`);
    }

    let allocatedCarbon = 0;
    let allocatedWater = 0;
    let allocatedNitrogen = 0;
    let allocatedPhosphorus = 0;
    let allocatedOxygen = 0;
    let allocatedMinerals = 0;
    let allocatedThermal = 0;

    const partitions: { childDigit: H3DirectionDigit; childStocks: BiophysicalStockVector }[] = [];

    for (let d = 0; d < 7; d++) {
      const isLast = (d === 6);
      const w = effectiveWeights[d];

      // Use exact residual for the 7th child to eliminate floating point truncation drift
      const c = isLast ? this.stocks.carbonKg - allocatedCarbon : this.stocks.carbonKg * w;
      const n = isLast ? this.stocks.nitrogenKg - allocatedNitrogen : this.stocks.nitrogenKg * w;
      const p = isLast ? this.stocks.phosphorusKg - allocatedPhosphorus : this.stocks.phosphorusKg * w;
      const wtr = isLast ? this.stocks.waterKg - allocatedWater : this.stocks.waterKg * w;
      const o2 = isLast ? this.stocks.oxygenKg - allocatedOxygen : this.stocks.oxygenKg * w;
      const min = isLast ? this.stocks.mineralKg - allocatedMinerals : this.stocks.mineralKg * w;
      const th = isLast ? this.stocks.thermalJoules - allocatedThermal : this.stocks.thermalJoules * w;

      allocatedCarbon += c;
      allocatedNitrogen += n;
      allocatedPhosphorus += p;
      allocatedWater += wtr;
      allocatedOxygen += o2;
      allocatedMinerals += min;
      allocatedThermal += th;

      partitions.push({
        childDigit: d as H3DirectionDigit,
        childStocks: {
          carbonKg: c,
          nitrogenKg: n,
          phosphorusKg: p,
          waterKg: wtr,
          oxygenKg: o2,
          mineralKg: min,
          thermalJoules: th,
        }
      });
    }

    return partitions;
  }

  /**
   * Routes advective directional flux toward target aperture neighbor.
   */
  public routeDirectionalAdvectiveFlux(
    targetDigit: H3DirectionDigit,
    targetNeighborIndex: bigint,
    fluxFraction: number,
    sourceTempK: number,
    targetTempK: number
  ): { nextSource: SpatialFluxMonad; transfer: FluxTransferRecord } {
    if (targetDigit < 1 || targetDigit > 6) {
      throw new Error(`Advective flux must route to a peripheral aperture (1..6). Received: ${targetDigit}`);
    }
    if (fluxFraction < 0 || fluxFraction > 1.0) {
      throw new Error(`Flux fraction must be in [0, 1]. Received: ${fluxFraction}`);
    }

    const deltaC = this.stocks.carbonKg * fluxFraction;
    const deltaN = this.stocks.nitrogenKg * fluxFraction;
    const deltaP = this.stocks.phosphorusKg * fluxFraction;
    const deltaWtr = this.stocks.waterKg * fluxFraction;
    const deltaO2 = this.stocks.oxygenKg * fluxFraction;
    const deltaMin = this.stocks.mineralKg * fluxFraction;
    const deltaTh = this.stocks.thermalJoules * fluxFraction;

    // Second law check: entropy production of thermal mixing
    const entropyProduced = deltaTh > 0 && sourceTempK > 0 && targetTempK > 0
      ? deltaTh * Math.abs(1.0 / targetTempK - 1.0 / sourceTempK)
      : 0.0;

    const remainingStocks: BiophysicalStockVector = {
      carbonKg: this.stocks.carbonKg - deltaC,
      nitrogenKg: this.stocks.nitrogenKg - deltaN,
      phosphorusKg: this.stocks.phosphorusKg - deltaP,
      waterKg: this.stocks.waterKg - deltaWtr,
      oxygenKg: this.stocks.oxygenKg - deltaO2,
      mineralKg: this.stocks.mineralKg - deltaMin,
      thermalJoules: this.stocks.thermalJoules - deltaTh,
    };

    const transferred: BiophysicalStockVector = {
      carbonKg: deltaC,
      nitrogenKg: deltaN,
      phosphorusKg: deltaP,
      waterKg: deltaWtr,
      oxygenKg: deltaO2,
      mineralKg: deltaMin,
      thermalJoules: deltaTh,
    };

    const transferRecord: FluxTransferRecord = {
      sourceIndex: this.cellIndex,
      targetIndex: targetNeighborIndex,
      transferredStocks: transferred,
      apertureDigitUsed: targetDigit,
      entropyProducedJoulesPerKelvin: entropyProduced,
    };

    const nextSource = new SpatialFluxMonad(this.cellIndex, remainingStocks, this.apertureData);
    return { nextSource, transfer: transferRecord };
  }
}
```

---

## 5. Verification Equations and Invariant Assertions

1. **Mass Conservation Invariant**:
   $$\sum_{s \in \text{Stocks}} \left| M_{s,\text{parent}} - \sum_{d=0}^{6} M_{s}^{(d)} \right| \equiv 0.0 \quad (\epsilon_{\text{machine}} < 10^{-14})$$

2. **Aperture Digit Range Invariant**:
   $$\forall k \in [1, r], \quad d_k \in \{0, 1, 2, 3, 4, 5, 6\}$$
   $$\forall k \in [r + 1, 15], \quad d_k \equiv 7$$

3. **Reversibility and Entropy Invariant**:
   $$\dot{\sigma}_{\text{transfer}} = \dot{Q} \left( \frac{1}{T_{\text{dest}}} - \frac{1}{T_{\text{src}}} \right) \ge 0 \quad \forall \ T_{\text{src}} \ge T_{\text{dest}}$$

4. **Base Cell Boundary Check**:
   $$0 \le \text{baseCell} \le 121$$