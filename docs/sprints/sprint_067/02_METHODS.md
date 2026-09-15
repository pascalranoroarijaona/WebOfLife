```md
# Process Methods Specification: Finite-Volume Interface Fluxes via DetailedInterfaceNormalResult

## 1. Process Overview & Physical Domain

Sprint 067 introduces `DetailedInterfaceNormalResult` in `src/spatial/h3_types.ts` to govern horizontal finite-volume transport across spherical discrete global grid systems (H3 DGGS on $\mathbb{S}^2$). In conservative planetary simulation, horizontal exchange across polygonal boundaries constitutes the primary mechanism for:
1. **Atmospheric & Oceanic Advective Transport**: Horizontal transport of mass (dry air, liquid water, dissolved tracer species, carbon dioxide, oxygen) driven by projected normal velocity fields $\mathbf{u} \cdot \hat{\mathbf{n}}_{ij}$.
2. **Diffusive & Conductive Exchange**: Thermal equilibration via Fourier conduction and tracer dispersion via Fickian diffusion scaled by metric arc length $L_{ij}$ and directional alignment metric $\cos(\theta_{ij}) = \hat{\mathbf{d}}_{ij} \cdot \hat{\mathbf{n}}_{ij}$.
3. **Biological & Trophic Monad Migration**: Active and passive spatial foraging, biomass dispersal, and nutrient drift across adjacent hexagonal territories.

This document formalizes the exact mass-energy deltas and monad execution algorithms utilizing `DetailedInterfaceNormalResult`.

---

## 2. Mathematical Formalization & Physical Deltas

### 2.1 Geometric Quantities from `DetailedInterfaceNormalResult`

For adjacent cells $i$ and $j$ on a sphere of radius $R_{\oplus} = 6.3710088 \times 10^6\text{ m}$:
- **Normal vector**: $\hat{\mathbf{n}}_{ij} = [n_x, n_y, n_z]^T \in \mathbb{R}^3$, such that $\|\hat{\mathbf{n}}_{ij}\| = 1.0$ and $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$.
- **Interface Arc Length**: $L_{ij} = R_{\oplus} \Delta \sigma_{ij}$ [$\text{m}$], where $\Delta \sigma_{ij}$ is the central angle between the interface vertices $\mathbf{v}_A, \mathbf{v}_B$. Note $L_{ji} = L_{ij}$.
- **Alignment Cosine**: $\alpha_{ij} = \hat{\mathbf{d}}_{ij} \cdot \hat{\mathbf{n}}_{ij} \in [0.8, 1.0]$, where $\hat{\mathbf{d}}_{ij} = \frac{\mathbf{x}_j - \mathbf{x}_i}{\|\mathbf{x}_j - \mathbf{x}_i\|}$. Note $\alpha_{ji} = \alpha_{ij}$.
- **Effective Cross-Sectional Area**: For a fluid or soil column of depth $H_{ij}$ [$\text{m}$]:
  $$A_{ij} = L_{ij} \cdot H_{ij} \quad [\text{m}^2]$$

---

### 2.2 Advective Mass and Energy Exchange (First-Order Upwind Flux)

Let state vector $\mathbf{S}_i = [M_{\text{air}}, M_{\text{water}}, M_{\text{DIC}}, M_{\text{oxygen}}, M_{\text{minerals}}, E_{\text{thermal}}]^T$ represent extensive stocks in cell $i$.
Let $\mathbf{u}_{ij} \in \mathbb{R}^3$ [$\text{m}\cdot\text{s}^{-1}$] be the fluid velocity at the interface midpoint.

1. **Normal Velocity Projection**:
   $$u_{n, ij} = \mathbf{u}_{ij} \cdot \hat{\mathbf{n}}_{ij} \quad [\text{m}\cdot\text{s}^{-1}]$$
   Satisfies anti-symmetry: $u_{n, ji} = -u_{n, ij}$.

2. **Volumetric Flux Rate**:
   $$Q_{ij} = u_{n, ij} \cdot A_{ij} \quad [\text{m}^3\cdot\text{s}^{-1}]$$

3. **Upwind State Concentration**:
   For any stock density $\rho_{k, i} = \frac{S_{k, i}}{V_i}$ (where $V_i = \text{Area}_i \cdot H_i$):
   $$\rho_{k, ij}^* = \begin{cases} \rho_{k, i}, & \text{if } u_{n, ij} \ge 0 \\ \rho_{k, j}, & \text{if } u_{n, ij} < 0 \end{cases}$$

4. **Mass Flux Rates**:
   $$\dot{\Phi}_{k, ij}^{\text{adv}} = Q_{ij} \cdot \rho_{k, ij}^* \quad [\text{kg}\cdot\text{s}^{-1}\text{ or }\text{J}\cdot\text{s}^{-1}]$$

---

### 2.3 Diffusive / Conductive Fluxes with Alignment Correction

Diffusion across non-orthogonal spherical Voronoi / Delaunay meshes requires scaling by the alignment cosine $\alpha_{ij}$ to project the centroid-to-centroid gradient along the interface normal:

1. **Mass Diffusion (Fick's First Law)**:
   For tracer concentration $C_k = M_k / V$:
   $$J_{k, ij}^{\text{diff}} = -D_k \cdot \left(\frac{C_{k, j} - C_{k, i}}{\|\mathbf{x}_j - \mathbf{x}_i\|}\right) \cdot \alpha_{ij} \quad [\text{kg}\cdot\text{m}^{-2}\cdot\text{s}^{-1}]$$
   $$\dot{\Phi}_{k, ij}^{\text{diff}} = J_{k, ij}^{\text{diff}} \cdot A_{ij} \quad [\text{kg}\cdot\text{s}^{-1}]$$

2. **Thermal Conduction (Fourier's Law)**:
   For temperature $T_i, T_j$ [$\text{K}$] and effective thermal conductivity $\kappa$ [$\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}$]:
   $$q_{ij}^{\text{cond}} = -\kappa \cdot \left(\frac{T_j - T_i}{\|\mathbf{x}_j - \mathbf{x}_i\|}\right) \cdot \alpha_{ij} \quad [\text{W}\cdot\text{m}^{-2}]$$
   $$\dot{\Phi}_{E, ij}^{\text{cond}} = q_{ij}^{\text{cond}} \cdot A_{ij} \quad [\text{W} = \text{J}\cdot\text{s}^{-1}]$$

---

### 2.4 Mass and Energy Conservation Balances

Over integration interval $\Delta t$:
$$\Delta S_{k, i \to j} = \left(\dot{\Phi}_{k, ij}^{\text{adv}} + \dot{\Phi}_{k, ij}^{\text{diff}}\right) \Delta t$$

Total conservative stock updates:
$$\Delta S_{k, i} = -\sum_{j \in \mathcal{N}(i)} \Delta S_{k, i \to j}$$
$$\Delta S_{k, j} = +\sum_{i \in \mathcal{N}(j)} \Delta S_{k, i \to j}$$

Because $\dot{\Phi}_{k, ji} = -\dot{\Phi}_{k, ij}$, mass and energy are conserved to numerical machine precision:
$$\sum_{i \in \mathcal{M}} \Delta S_{k, i} \equiv 0$$

---

### 2.5 Thermodynamic Entropy Generation

The entropy generation rate $\dot{S}_{\text{gen}, ij}$ across the interface for thermal transport must strictly obey the Second Law:
$$\dot{S}_{\text{gen}, ij} = \dot{\Phi}_{E, ij}^{\text{cond}} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) = \kappa A_{ij} \alpha_{ij} \frac{(T_i - T_j)^2}{\|\mathbf{x}_j - \mathbf{x}_i\| T_i T_j} \ge 0$$
Since $\kappa > 0$, $A_{ij} > 0$, $\alpha_{ij} > 0$, and $T_i, T_j > 0$, $\dot{S}_{\text{gen}, ij} \ge 0$ unconditionally holds.

---

## 3. Monadic Stock Transfer Specification

### 3.1 Interface Metric Monad Primitive

```typescript
import { DetailedInterfaceNormalResult } from '../spatial/h3_types';

export interface InterfaceFluxState {
  readonly massAirKg: number;
  readonly massWaterKg: number;
  readonly massCarbonKg: number;
  readonly massOxygenKg: number;
  readonly massMineralsKg: number;
  readonly thermalEnergyJoules: number;
}

export interface CellGeometryState {
  readonly centroid: readonly [number, number, number];
  readonly volumeM3: number;
  readonly columnHeightM: number;
  readonly stocks: InterfaceFluxState;
}

export interface InterfaceAdvectionTransferResult {
  readonly deltaOrigin: InterfaceFluxState;
  readonly deltaDestination: InterfaceFluxState;
  readonly entropyGeneratedJPerK: number;
}
```

### 3.2 Executable Transfer Equation

```typescript
/**
 * Evaluates conservative advective and diffusive mass-energy transfer across an H3 cell interface
 * using DetailedInterfaceNormalResult.
 */
export function computeInterfaceTransfer(
  metric: DetailedInterfaceNormalResult,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocityMidpointMPerS: readonly [number, number, number],
  diffusionCoeffM2PerS: number,
  thermalConductivityWPerMK: number,
  heatCapacityJPerKgK: number,
  dtSeconds: number
): InterfaceAdvectionTransferResult {
  const [nx, ny, nz] = metric.normal;
  const [vx, vy, vz] = velocityMidpointMPerS;

  // 1. Normal velocity projection u_n = v . n
  const uNormal = vx * nx + vy * ny + vz * nz;

  // 2. Cross-sectional boundary area A = L * H
  const meanHeight = 0.5 * (cellA.columnHeightM + cellB.columnHeightM);
  const interfaceAreaM2 = metric.arcLengthMeters * meanHeight;

  // 3. Volumetric rate
  const volumetricRateM3PerS = uNormal * interfaceAreaM2;

  // 4. Centroid separation distance
  const dx = cellB.centroid[0] - cellA.centroid[0];
  const dy = cellB.centroid[1] - cellA.centroid[1];
  const dz = cellB.centroid[2] - cellA.centroid[2];
  const distanceCentroids = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

  // Temperature approximation from thermal energy: T = E / (M_total * c_p)
  const massTotalA = cellA.stocks.massAirKg + cellA.stocks.massWaterKg + cellA.stocks.massMineralsKg;
  const massTotalB = cellB.stocks.massAirKg + cellB.stocks.massWaterKg + cellB.stocks.massMineralsKg;
  const tempA = cellA.stocks.thermalEnergyJoules / (massTotalA * heatCapacityJPerKgK + 1e-9);
  const tempB = cellB.stocks.thermalEnergyJoules / (massTotalB * heatCapacityJPerKgK + 1e-9);

  // Helper for advection + diffusion of a scalar stock
  const computeStockDelta = (stockA: number, stockB: number, diffCoeff: number): number => {
    const concA = stockA / cellA.volumeM3;
    const concB = stockB / cellB.volumeM3;

    // Upwind advective concentration
    const concUpwind = uNormal >= 0 ? concA : concB;
    const fluxAdv = volumetricRateM3PerS * concUpwind;

    // Fickian diffusive flux with alignment correction
    const gradConc = (concB - concA) / distanceCentroids;
    const fluxDiff = -diffCoeff * gradConc * metric.alignmentCos * interfaceAreaM2;

    return (fluxAdv + fluxDiff) * dtSeconds;
  };

  const deltaAir = computeStockDelta(cellA.stocks.massAirKg, cellB.stocks.massAirKg, 0.0);
  const deltaWater = computeStockDelta(cellA.stocks.massWaterKg, cellB.stocks.massWaterKg, diffusionCoeffM2PerS);
  const deltaCarbon = computeStockDelta(cellA.stocks.massCarbonKg, cellB.stocks.massCarbonKg, diffusionCoeffM2PerS);
  const deltaOxygen = computeStockDelta(cellA.stocks.massOxygenKg, cellB.stocks.massOxygenKg, diffusionCoeffM2PerS);
  const deltaMinerals = computeStockDelta(cellA.stocks.massMineralsKg, cellB.stocks.massMineralsKg, 0.0);

  // Thermal energy transfer (advection + Fourier conduction)
  const energyDensityA = cellA.stocks.thermalEnergyJoules / cellA.volumeM3;
  const energyDensityB = cellB.stocks.thermalEnergyJoules / cellB.volumeM3;
  const energyDensityUpwind = uNormal >= 0 ? energyDensityA : energyDensityB;
  const energyFluxAdv = volumetricRateM3PerS * energyDensityUpwind;

  const gradTemp = (tempB - tempA) / distanceCentroids;
  const heatFluxCond = -thermalConductivityWPerMK * gradTemp * metric.alignmentCos * interfaceAreaM2;
  const deltaEnergy = (energyFluxAdv + heatFluxCond) * dtSeconds;

  // Second Law: Entropy generation from conduction
  const entropyGenRate =
    thermalConductivityWPerMK *
    interfaceAreaM2 *
    metric.alignmentCos *
    (Math.pow(tempA - tempB, 2) / (distanceCentroids * tempA * tempB + 1e-12));
  const entropyGenerated = entropyGenRate * dtSeconds;

  return {
    deltaOrigin: {
      massAirKg: -deltaAir,
      massWaterKg: -deltaWater,
      massCarbonKg: -deltaCarbon,
      massOxygenKg: -deltaOxygen,
      massMineralsKg: -deltaMinerals,
      thermalEnergyJoules: -deltaEnergy
    },
    deltaDestination: {
      massAirKg: deltaAir,
      massWaterKg: deltaWater,
      massCarbonKg: deltaCarbon,
      massOxygenKg: deltaOxygen,
      massMineralsKg: deltaMinerals,
      thermalEnergyJoules: deltaEnergy
    },
    entropyGeneratedJPerK: Math.max(0, entropyGenerated)
  };
}
```

---

## 4. Verification Parameters & Precision Constraints

| Parameter | Symbol | Reference Value | Units | Tolerance / Constraint |
|:---|:---:|:---|:---:|:---|
| Normal Vector Norm | $\|\hat{\mathbf{n}}_{ij}\|$ | $1.000000000000$ | dimensionless | $\pm 10^{-12}$ |
| Interface Arc Length | $L_{ij}$ | Computed per H3 resolution | $\text{m}$ | $L_{ij} > 0$, skew-symmetric ($L_{ij} = L_{ji}$) |
| Alignment Cosine | $\alpha_{ij}$ | $[0.820, 1.000]$ | dimensionless | $0.800 \le \alpha_{ij} \le 1.000$ |
| Mass Conservation Sum | $\sum \Delta M$ | $0.0$ | $\text{kg}$ | $|\Delta M_i + \Delta M_j| < 10^{-15}\text{ kg}$ |
| Energy Conservation Sum | $\sum \Delta E$ | $0.0$ | $\text{J}$ | $|\Delta E_i + \Delta E_j| < 10^{-12}\text{ J}$ |
| Entropy Generation | $\dot{S}_{\text{gen}}$ | $\ge 0.0$ | $\text{J}\cdot\text{K}^{-1}\cdot\text{s}^{-1}$ | Non-negative strictly guaranteed |

This specification guarantees that adopting `DetailedInterfaceNormalResult` produces exact thermodynamic balance across arbitrary multi-resolution spherical H3 configurations.