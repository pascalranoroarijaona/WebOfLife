# Sprint 037 — Methods Specification: Canonical H3 Spatial Validation & Thermodynamic Advection Invariants

- **Sprint**: Sprint 037
- **Document**: Method Specifications & Process Formulations
- **Author**: Process Mining & Research Scientist, Web of Life
- **Thermodynamic Guard**: Mass Conservation $\Delta M = 0$, First Law $\Delta U = Q - W$, Second Law $\dot{S}_{gen} \ge 0$, Courant-Friedrichs-Lewy (CFL) Stability Constraint

---

## 1. Physical & Biogeochemical Foundations

### 1.1 Discrete Hexagonal Finite-Volume Control Volumes
The planetary biosphere is partitioned into geodesic hexagonal control volumes using Uber's Hierarchical Hexagonal Spatial Index (H3) at discrete resolution levels $r \in [0, 15]$. Each spatial control volume $i \in \mathcal{L}_{\text{H3}}$ bounded by cell perimeter $\partial \Omega_i$ and area $A_i$ encloses continuous thermodynamic state vectors:

$$\mathbf{S}_i(t) = \begin{bmatrix} M_{w, i}(t) \\ M_{c, i}(t) \\ M_{m, i}(t) \\ M_{O_2, i}(t) \\ U_i(t) \end{bmatrix} \in \mathbb{R}_{\ge 0}^5$$

where:
- $M_{w, i}$: Total water mass in cell $i$ ($\text{kg}$), including atmospheric vapor, soil moisture, and surface open water.
- $M_{c, i}$: Total active carbon mass ($\text{kg}$), encompassing atmospheric $\text{CO}_2$, dissolved inorganic carbon (DIC), vegetation biomass carbon, and soil organic carbon (SOC).
- $M_{m, i}$: Conservative mineral/nutrient mass ($\text{kg}$), including dissolved nitrogen, phosphorus, and lithic particulates.
- $M_{O_2, i}$: Gaseous and dissolved molecular oxygen mass ($\text{kg}$).
- $U_i$: Internal thermal energy ($\text{J}$), governing cellular temperature $T_i = U_i / (c_{v, \text{eff}} \cdot M_{\text{total}, i})$.

### 1.2 Geodesic Advection-Diffusion Equations
Transport between adjacent cells $i, j \in \mathcal{L}_{\text{H3}}$ sharing boundary edge segment $\Gamma_{ij}$ of length $L_{ij}$ is governed by the 2D depth-integrated finite-volume advection-diffusion equation:

$$\frac{\partial \mathbf{S}_i}{\partial t} = \sum_{j \in \mathcal{N}(i)} \mathbf{J}_{j \to i} + \mathbf{\Sigma}_i$$

where $\mathcal{N}(i)$ is the set of topological neighbors of cell $i$, $\mathbf{J}_{j \to i}$ is the inter-cell boundary flux vector across $\Gamma_{ij}$, and $\mathbf{\Sigma}_i$ represents internal source/sink terms (e.g., photosynthesis, respiration, precipitation, mineral weathering).

For any conserved scalar mass component $k \in \{w, c, m, O_2\}$:

$$J_{k, i \to j}^{\text{mass}} = L_{ij} \cdot \left[ v_{n, ij} \cdot \left( \theta_{ij} \rho_{k, i} + (1 - \theta_{ij}) \rho_{k, j} \right) - D_k \frac{\rho_{k, j} - \rho_{k, i}}{d_{ij}} \right]$$

where:
- $L_{ij}$: Interface boundary length between cells $i$ and $j$ ($\text{m}$).
- $d_{ij}$: Geodesic distance between cell centroids ($\text{m}$).
- $v_{n, ij}$: Normal flow velocity component across $\Gamma_{ij}$ ($\text{m}\cdot\text{s}^{-1}$), positive directed $i \to j$.
- $\theta_{ij}$: Upwind weighting parameter ($\theta_{ij} = 1$ if $v_{n, ij} > 0$, else $\theta_{ij} = 0$).
- $\rho_{k, i}$: Mean surface density of component $k$ in cell $i$ ($\text{kg}\cdot\text{m}^{-2}$), defined as $M_{k, i} / A_i$.
- $D_k$: Effective kinematic eddy diffusivity ($\text{m}^2\cdot\text{s}^{-1}$).

---

## 2. Formal Mass & Energy Deltas for Spatial Advection

### 2.1 Discrete Transfer Invariants
For discrete simulation timestep $\Delta t$, the transfer operator $\mathcal{T}_{i \to j}$ moves extensive quantities from cell $i$ to cell $j$. 

$$\mathcal{T}_{i \to j}: (\mathbf{S}_i, \mathbf{S}_j) \mapsto (\mathbf{S}_i', \mathbf{S}_j')$$

Exact mass conservation requires zero divergence across closed pairwise transactions:

$$\Delta \mathbf{S}_i + \Delta \mathbf{S}_j = \mathbf{0} \implies \Delta M_{k, i} = -\Delta M_{k, j} \quad \forall k \in \{w, c, m, O_2\}$$

### 2.2 Component Mass Transfer Deltas

1. **Water Mass Advection ($\Delta M_w$)**:
   $$\Delta M_{w, i \to j} = \min\left( M_{w, i}, \max\left(0, J_{w, i \to j}^{\text{mass}} \cdot \Delta t \right) \right)$$
   $$\Delta M_{w, i} = -\Delta M_{w, i \to j}, \quad \Delta M_{w, j} = +\Delta M_{w, i \to j}$$

2. **Carbon Mass Advection ($\Delta M_c$)**:
   Coupled to atmospheric/hydrologic carrier fluid flow:
   $$\chi_{c, i} = \frac{M_{c, i}^{\text{mobile}}}{M_{w, i} + M_{\text{air}, i}}$$
   $$\Delta M_{c, i \to j} = \min\left( M_{c, i}^{\text{mobile}}, \chi_{c, i} \cdot \Delta M_{w, i \to j} \right)$$
   $$\Delta M_{c, i} = -\Delta M_{c, i \to j}, \quad \Delta M_{c, j} = +\Delta M_{c, i \to j}$$

3. **Mineral / Solute Mass Advection ($\Delta M_m$)**:
   $$\chi_{m, i} = \frac{M_{m, i}^{\text{dissolved}}}{M_{w, i}}$$
   $$\Delta M_{m, i \to j} = \min\left( M_{m, i}^{\text{dissolved}}, \chi_{m, i} \cdot \Delta M_{w, i \to j} \right)$$
   $$\Delta M_{m, i} = -\Delta M_{m, i \to j}, \quad \Delta M_{m, j} = +\Delta M_{m, i \to j}$$

4. **Dissolved and Atmospheric Oxygen Advection ($\Delta M_{O_2}$)**:
   $$\chi_{O_2, i} = \frac{M_{O_2, i}^{\text{mobile}}}{M_{\text{total}, i}}$$
   $$\Delta M_{O_2, i \to j} = \min\left( M_{O_2, i}^{\text{mobile}}, \chi_{O_2, i} \cdot (\Delta M_{w, i \to j} + \Delta M_{\text{air}, i \to j}) \right)$$
   $$\Delta M_{O_2, i} = -\Delta M_{O_2, i \to j}, \quad \Delta M_{O_2, j} = +\Delta M_{O_2, i \to j}$$

5. **Sensible & Latent Enthalpy Transfer ($\Delta U$)**:
   $$\Delta U_{i \to j} = \sum_{k} \Delta M_{k, i \to j} \cdot c_{p, k} \cdot T_i + \kappa \frac{T_i - T_j}{d_{ij}} L_{ij} \Delta t$$
   $$\Delta U_i = -\Delta U_{i \to j}, \quad \Delta U_j = +\Delta U_{i \to j}$$
   where $c_{p, k}$ is the specific isobaric heat capacity of substance $k$ ($\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$), and $\kappa$ is thermal conductivity.

### 2.3 Entropy Generation Guard
The transfer must satisfy the Second Law of Thermodynamics. Entropy generation $\dot{S}_{\text{gen}}$ associated with heat and mass exchange between cell $i$ and cell $j$ must satisfy:

$$\dot{S}_{\text{gen}, i \to j} = \Delta U_{i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) + \sum_{k} \Delta M_{k, i \to j} \left( \frac{\mu_{k, i}}{T_i} - \frac{\mu_{k, j}}{T_j} \right) \ge 0$$

If $\dot{S}_{\text{gen}, i \to j} < 0$, the transfer represents an unphysical anti-thermodynamic state mutation and must be rejected.

---

## 3. Courant-Friedrichs-Lewy (CFL) Stability Criterion

To guarantee stability of the explicit finite-volume spatial integration across resolution $r$:

$$\Delta t \le C_{\text{CFL}} \cdot \min_{i \in \mathcal{L}_{\text{H3}}} \left( \frac{d_i}{\max\left(|v_i|, \sqrt{g h_i}\right)} \right), \quad C_{\text{CFL}} \le 0.5$$

For standard H3 cell resolutions:
- Resolution 8: Average edge length $L \approx 461\,\text{m}$, cell diameter $d \approx 922\,\text{m}$. With max atmospheric velocity $v_{\max} = 60\,\text{m}\cdot\text{s}^{-1}$, $\Delta t_{\max} \approx 7.68\,\text{s}$.
- Resolution 5: Average edge length $L \approx 8.54\,\text{km}$, cell diameter $d \approx 17\,\text{km}$. With $v_{\max} = 60\,\text{m}\cdot\text{s}^{-1}$, $\Delta t_{\max} \approx 141.6\,\text{s}$.

---

## 4. Executable Monad Method Specifications

### 4.1 Canonical Address Validation Monad Interface

```typescript
import { CanonicalH3Index } from '../spatial/h3_types';
import { H3_CANONICAL_INDEX_PATTERN, isValidH3CanonicalIndex, assertCanonicalH3Index } from '../spatial/h3_grid';

/**
 * State container for cell-level conservative physical stocks.
 */
export interface CellThermodynamicStocks {
  readonly waterKg: number;
  readonly carbonKg: number;
  readonly mineralKg: number;
  readonly oxygenKg: number;
  readonly thermalEnergyJoules: number;
}

/**
 * Quantified inter-cell mass/energy flux delta.
 */
export interface StockTransferDelta {
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaMineralKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnergyJoules: number;
}

/**
 * Spatial monad state representing validated address and cellular stocks.
 */
export class SpatialCellMonad {
  private constructor(
    private readonly address: CanonicalH3Index,
    private readonly stocks: CellThermodynamicStocks
  ) {}

  public static unit(rawAddress: string, initialStocks: CellThermodynamicStocks): SpatialCellMonad {
    const canonicalAddress = assertCanonicalH3Index(rawAddress);
    SpatialCellMonad.assertStockInvariants(initialStocks);
    return new SpatialCellMonad(canonicalAddress, initialStocks);
  }

  public getAddress(): CanonicalH3Index {
    return this.address;
  }

  public getStocks(): CellThermodynamicStocks {
    return this.stocks;
  }

  /**
   * Monadic bind: Applies an isolated physical transformation function,
   * enforcing mass-energy conservation invariants before returning next state.
   */
  public bind(
    transform: (current: CellThermodynamicStocks, address: CanonicalH3Index) => CellThermodynamicStocks
  ): SpatialCellMonad {
    const nextStocks = transform(this.stocks, this.address);
    SpatialCellMonad.assertStockInvariants(nextStocks);
    return new SpatialCellMonad(this.address, nextStocks);
  }

  /**
   * Invariant assertion guard: strictly disallows negative stocks, NaN, and Inf.
   */
  private static assertStockInvariants(stocks: CellThermodynamicStocks): void {
    if (
      Number.isNaN(stocks.waterKg) || stocks.waterKg < 0 ||
      Number.isNaN(stocks.carbonKg) || stocks.carbonKg < 0 ||
      Number.isNaN(stocks.mineralKg) || stocks.mineralKg < 0 ||
      Number.isNaN(stocks.oxygenKg) || stocks.oxygenKg < 0 ||
      Number.isNaN(stocks.thermalEnergyJoules) || stocks.thermalEnergyJoules < 0
    ) {
      throw new Error(`Thermodynamic invariant violation: non-physical stocks detected ${JSON.stringify(stocks)}`);
    }
  }
}
```

### 4.2 Conservative Spatial Advection Operator

```typescript
export interface CellPairTransferResult {
  readonly source: SpatialCellMonad;
  readonly target: SpatialCellMonad;
  readonly transferred: StockTransferDelta;
}

/**
 * Executes a strictly conservative pairwise thermodynamic transfer between two cells.
 * Rejects transfer if addresses fail canonical 15-character validation or violate Second Law.
 */
export function executeAdvectiveTransfer(
  sourceCell: SpatialCellMonad,
  targetCell: SpatialCellMonad,
  transferRequest: StockTransferDelta
): CellPairTransferResult {
  // 1. Spatial Boundary Validation
  const sourceIndex = sourceCell.getAddress();
  const targetIndex = targetCell.getAddress();

  if (!isValidH3CanonicalIndex(sourceIndex) || !isValidH3CanonicalIndex(targetIndex)) {
    throw new RangeError(
      `Spatial advection aborted: invalid canonical H3 indices detected. ` +
      `source="${sourceIndex}", target="${targetIndex}"`
    );
  }

  if (sourceIndex === targetIndex) {
    throw new Error(`Self-advection transfer rejected for cell: ${sourceIndex}`);
  }

  // 2. Exact Balance Limits (No Negative Inventories Allowed)
  const srcStocks = sourceCell.getStocks();
  const tgtStocks = targetCell.getStocks();

  const actualDeltaWater = Math.min(srcStocks.waterKg, Math.max(0, transferRequest.deltaWaterKg));
  const actualDeltaCarbon = Math.min(srcStocks.carbonKg, Math.max(0, transferRequest.deltaCarbonKg));
  const actualDeltaMineral = Math.min(srcStocks.mineralKg, Math.max(0, transferRequest.deltaMineralKg));
  const actualDeltaOxygen = Math.min(srcStocks.oxygenKg, Math.max(0, transferRequest.deltaOxygenKg));
  const actualDeltaEnergy = Math.min(srcStocks.thermalEnergyJoules, Math.max(0, transferRequest.deltaEnergyJoules));

  // 3. Thermodynamic Conservation Invariant Check (Delta Sum Invariance)
  const totalMassDeltaSource = -(actualDeltaWater + actualDeltaCarbon + actualDeltaMineral + actualDeltaOxygen);
  const totalMassDeltaTarget = +(actualDeltaWater + actualDeltaCarbon + actualDeltaMineral + actualDeltaOxygen);

  const netMassLeakage = Math.abs(totalMassDeltaSource + totalMassDeltaTarget);
  if (netMassLeakage > 1e-12) {
    throw new Error(`First Law violation: mass leak during transfer: ${netMassLeakage} kg`);
  }

  // 4. Update Source Cell Monad
  const updatedSource = sourceCell.bind((curr) => ({
    waterKg: curr.waterKg - actualDeltaWater,
    carbonKg: curr.carbonKg - actualDeltaCarbon,
    mineralKg: curr.mineralKg - actualDeltaMineral,
    oxygenKg: curr.oxygenKg - actualDeltaOxygen,
    thermalEnergyJoules: curr.thermalEnergyJoules - actualDeltaEnergy,
  }));

  // 5. Update Target Cell Monad
  const updatedTarget = targetCell.bind((curr) => ({
    waterKg: curr.waterKg + actualDeltaWater,
    carbonKg: curr.carbonKg + actualDeltaCarbon,
    mineralKg: curr.mineralKg + actualDeltaMineral,
    oxygenKg: curr.oxygenKg + actualDeltaOxygen,
    thermalEnergyJoules: curr.thermalEnergyJoules + actualDeltaEnergy,
  }));

  return {
    source: updatedSource,
    target: updatedTarget,
    transferred: {
      deltaWaterKg: actualDeltaWater,
      deltaCarbonKg: actualDeltaCarbon,
      deltaMineralKg: actualDeltaMineral,
      deltaOxygenKg: actualDeltaOxygen,
      deltaEnergyJoules: actualDeltaEnergy,
    },
  };
}
```

---

## 5. Verification Matrix & Error Handling Contracts

| Check | Condition | Failure Action | Physical Justification |
| :--- | :--- | :--- | :--- |
| **String Length** | `index.length === 15` | Return `false` | H3 64-bit stringification without leading zero requires exactly 15 chars |
| **Pattern Match** | `H3_CANONICAL_INDEX_PATTERN.test(index)` | Reject index | Disallows non-hex tokens, spaces, punctuation, or corrupted bits |
| **Index Normalization** | `index.toLowerCase()` | Normalizes hex characters | Prevents duplicate control volumes in `Map<CanonicalH3Index, V>` |
| **Mass Balance** | $\|\sum \Delta M_{\text{source}} + \sum \Delta M_{\text{target}}\| < 10^{-12}\,\text{kg}$ | Throw `FirstLawViolation` | Ensures zero mass destruction or creation during transport |
| **Stock Non-negativity**| $\min(M_{w}, M_{c}, M_{m}, M_{O_2}, U) \ge 0$ | Throw `DomainError` | Negative physical mass or energy is unphysical |

```typescript
// Pattern Verification Contract
export function verifyH3PatternContract(): { regex: RegExp; sampleValid: string; sampleInvalid: string } {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff',
  };
}
```