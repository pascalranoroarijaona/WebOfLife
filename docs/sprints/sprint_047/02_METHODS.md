# Sprint 047: Spherical Geodesic Edge Scaling & Boundary Flux Methods

## 1. Executive Process Specification

In the Web of Life simulation architecture, inter-cell transport between adjacent spatial cells $i$ and $j$ at discrete H3 resolution $r$ is governed by physical boundary geometry. The boundary interface between two adjacent regular hexagonal cells is defined by:
1. **Shared Geodesic Edge Length**: $L_{\text{edge}}(r) = \text{calculateH3EdgeLengthMeters}(r)$
2. **Column Cross-Sectional Area**: $A_{\text{contact}}(r, h) = L_{\text{edge}}(r) \cdot h$, where $h$ is the fluid/soil active layer depth in meters.
3. **Inter-Cell Center Distance**: $d_{ij}(r) = \sqrt{3} \cdot L_{\text{edge}}(r)$ (center-to-center distance between regular hexagons of edge $L_{\text{edge}}$).

This document formalizes the exact mass-energy transfer equations, delta updates, and executable spatial monad state transitions utilizing `calculateH3EdgeLengthMeters`.

---

## 2. Geometric & Scaling Reference Table

For H3 resolutions $r \in [0, 15]$, the reference edge lengths $L_{\text{edge}}(r)$, inter-cell distances $d_{ij}(r)$, and unit boundary area ($h = 1 \text{ m}$) are defined as follows:

| Resolution $r$ | Edge Length $L_{\text{edge}}$ (m) | Center Distance $d_{ij} = \sqrt{3} L_{\text{edge}}$ (m) | Unit Contact Area $A_{\text{contact}}$ ($h=1\text{ m}$) ($\text{m}^2$) | Nominal Cell Area $A_{\text{cell}}$ ($\text{m}^2$) |
|:---:|:---:|:---:|:---:|:---:|
| 0  | $1{,}107{,}712.59$ | $1{,}918{,}614.97$ | $1{,}107{,}712.59$ | $4{,}250{,}546{,}847{,}700$ |
| 1  | $418{,}676.01$     | $725{,}170.83$     | $418{,}676.01$     | $607{,}220{,}978{,}240$   |
| 2  | $158{,}244.66$     | $274{,}087.63$     | $158{,}244.66$     | $86{,}745{,}854{,}035$    |
| 3  | $59{,}810.86$      | $103{,}595.45$     | $59{,}810.86$      | $12{,}392{,}264{,}862$    |
| 4  | $22{,}606.38$      | $39{,}155.40$      | $22{,}606.38$      | $1{,}770{,}323{,}552$     |
| 5  | $8{,}544.41$       | $14{,}799.35$      | $8{,}544.41$       | $252{,}903{,}365$         |
| 6  | $3{,}229.48$       | $5{,}593.62$       | $3{,}229.48$       | $36{,}129{,}052$          |
| 7  | $1{,}220.63$       | $2{,}114.19$       | $1{,}220.63$       | $5{,}161{,}293$           |
| 8  | $461.35$           | $799.08$           | $461.35$           | $737{,}328$               |
| 9  | $174.38$           | $302.04$           | $174.38$           | $105{,}333$               |
| 10 | $65.91$            | $114.16$           | $65.91$            | $15{,}048$                |
| 11 | $24.91$            | $43.15$            | $24.91$            | $2{,}150$                 |
| 12 | $9.42$             | $16.32$            | $9.42$             | $307$                     |
| 13 | $3.56$             | $6.17$             | $3.56$             | $43.9$                    |
| 14 | $1.35$             | $2.34$             | $1.35$             | $6.27$                    |
| 15 | $0.51$             | $0.88$             | $0.51$             | $0.90$                    |

---

## 3. Physical Processes & Transfer Equations

### 3.1 Process 1: Fickian Solute & Mineral Mass Diffusion across Shared Edge
Inter-cell diffusion of dissolved constituents (Dissolved Inorganic Carbon [DIC], Dissolved Organic Carbon [DOC], dissolved Oxygen [$\text{O}_2$], and mineral nutrients [N, P, K]) across hexagonal interface $e_{ij}$.

#### Governing Equations:
$$J_{m, k} = -D_k \cdot \nabla C_k \approx -D_k \cdot \frac{C_{k, j} - C_{k, i}}{d_{ij}}$$
$$\Delta M_{k, ij} = J_{m, k} \cdot A_{\text{contact}} \cdot \Delta t = -D_k \cdot \frac{C_{k, j} - C_{k, i}}{\sqrt{3} \cdot L_{\text{edge}}(r)} \cdot (L_{\text{edge}}(r) \cdot h) \cdot \Delta t$$
Simplifying edge length $L_{\text{edge}}(r)$ in the ratio:
$$\Delta M_{k, ij} = -\frac{D_k \cdot h}{\sqrt{3}} \cdot (C_{k, j} - C_{k, i}) \cdot \Delta t$$
Where:
- $C_{k, i} = \frac{M_{k, i}}{V_i} = \frac{M_{k, i}}{A_{\text{cell}}(r) \cdot h}$ is the volumetric concentration of chemical species $k$ in cell $i$ ($\text{kg/m}^3$ or $\text{mol/m}^3$).
- $D_k$ is the molecular/eddy diffusion coefficient ($\text{m}^2/\text{s}$).
- $h$ is active column depth ($\text{m}$).
- $\Delta t$ is simulation time delta ($\text{s}$).

#### Conservation and Delta Pair:
$$\Delta M_{k, i} = -\Delta M_{k, ij} = \frac{D_k \cdot h}{\sqrt{3}} \cdot (C_{k, j} - C_{k, i}) \cdot \Delta t$$
$$\Delta M_{k, j} = +\Delta M_{k, ij} = -\frac{D_k \cdot h}{\sqrt{3}} \cdot (C_{k, j} - C_{k, i}) \cdot \Delta t$$
$$\Delta M_{k, i} + \Delta M_{k, j} = 0 \quad (\text{Strict First Law Mass Invariant})$$

---

### 3.2 Process 2: Fourier Conductive Thermal Exchange across Shared Boundary
Heat conduction driven by temperature differential $\Delta T = T_j - T_i$ between adjacent spatial hexagonal columns.

#### Governing Equations:
$$J_{q, ij} = -\kappa \cdot \frac{T_j - T_i}{d_{ij}}$$
$$\Delta Q_{ij} = J_{q, ij} \cdot A_{\text{contact}} \cdot \Delta t = -\kappa \cdot \frac{T_j - T_i}{\sqrt{3} \cdot L_{\text{edge}}(r)} \cdot (L_{\text{edge}}(r) \cdot h) \cdot \Delta t = -\frac{\kappa \cdot h}{\sqrt{3}} \cdot (T_j - T_i) \cdot \Delta t$$
Where:
- $\kappa$ is the thermal conductivity of the medium ($\text{W}/(\text{m}\cdot\text{K})$ or $\text{J}/(\text{s}\cdot\text{m}\cdot\text{K})$).
- $T_i, T_j$ are cell temperatures in Kelvin ($\text{K}$).
- $\Delta Q_{ij}$ is thermal energy exchanged in Joules ($\text{J}$).

#### Temperature State Updates:
$$\Delta T_i = \frac{\Delta Q_{ij}}{C_{\text{th}, i}} = \frac{-\Delta Q_{ji}}{C_{\text{th}, i}}$$
$$\Delta T_j = \frac{-\Delta Q_{ij}}{C_{\text{th}, j}}$$
Where $C_{\text{th}, i} = \rho \cdot c_p \cdot A_{\text{cell}}(r) \cdot h$ is the cell total volumetric heat capacity ($\text{J/K}$).

#### Second Law Entropy Production Invariant:
$$\sigma_{\text{th}} = \Delta Q_{i \to j} \cdot \left(\frac{1}{T_j} - \frac{1}{T_i}\right) = \frac{\kappa \cdot h \cdot \Delta t}{\sqrt{3}} \cdot (T_i - T_j) \cdot \frac{T_i - T_j}{T_i \cdot T_j} = \frac{\kappa \cdot h \cdot \Delta t}{\sqrt{3}} \cdot \frac{(T_i - T_j)^2}{T_i \cdot T_j} \ge 0$$
Since $\kappa > 0$, $h > 0$, $T_i > 0$, $T_j > 0$, entropy production $\sigma_{\text{th}} \ge 0$ unconditionally.

---

### 3.3 Process 3: Darcy / Saint-Venant Surface Hydraulic Edge Flux
Hydraulic flux of surface water volume between cells driven by surface water elevation (hydraulic head) difference $H_i - H_j$:

#### Governing Equations:
Volumetric flow rate across boundary interface:
$$Q_{V, ij} = -K_{\text{hyd}} \cdot \frac{H_j - H_i}{d_{ij}} \cdot A_{\text{flow}}$$
$$A_{\text{flow}} = L_{\text{edge}}(r) \cdot \bar{h}_{\text{surface}}, \quad \bar{h}_{\text{surface}} = \max\left(0, \frac{h_{\text{water}, i} + h_{\text{water}, j}}{2}\right)$$
$$d_{ij} = \sqrt{3} \cdot L_{\text{edge}}(r)$$
$$Q_{V, ij} = -\frac{K_{\text{hyd}}}{\sqrt{3}} \cdot (H_j - H_i) \cdot \bar{h}_{\text{surface}}$$
$$\Delta V_{\text{water}, ij} = Q_{V, ij} \cdot \Delta t$$
$$\Delta M_{\text{water}, ij} = \rho_{\text{water}} \cdot \Delta V_{\text{water}, ij}$$

Where:
- $H_i = z_{\text{bedrock}, i} + h_{\text{water}, i}$ is hydraulic head ($\text{m}$).
- $K_{\text{hyd}}$ is hydraulic conveyance / conductivity coefficient ($\text{m/s}$).
- $\rho_{\text{water}} = 1{,}000 \text{ kg/m}^3$.

---

## 4. State Variable Delays and Mass-Energy Balance Matrix

For an exchange step $\Delta t$ between cell $i$ and neighbor $j$:

| State Stock | Cell $i$ Delta ($\Delta S_i$) | Cell $j$ Delta ($\Delta S_j$) | Net Exchange ($\Delta S_i + \Delta S_j$) | Primary Driver |
|---|---|---|---|---|
| **Water Mass** ($M_{\text{H}_2\text{O}}$) | $-Q_{V, ij} \cdot \rho_{\text{water}} \cdot \Delta t$ | $+Q_{V, ij} \cdot \rho_{\text{water}} \cdot \Delta t$ | $0.0 \text{ kg}$ | Hydraulic Head $\nabla H$ |
| **Carbon Stock** ($M_{\text{C}}$) | $-\Delta M_{\text{DOC}, ij} - C_{\text{adv}, C} \cdot Q_{V, ij} \Delta t$ | $+\Delta M_{\text{DOC}, ij} + C_{\text{adv}, C} \cdot Q_{V, ij} \Delta t$ | $0.0 \text{ kg}$ | $\nabla C_{\text{DOC}}$ + Advection |
| **Dissolved $\text{O}_2$** ($M_{\text{O}_2}$) | $-\Delta M_{\text{O}_2, ij} - C_{\text{adv}, \text{O}_2} \cdot Q_{V, ij} \Delta t$ | $+\Delta M_{\text{O}_2, ij} + C_{\text{adv}, \text{O}_2} \cdot Q_{V, ij} \Delta t$ | $0.0 \text{ kg}$ | $\nabla C_{\text{O}_2}$ + Advection |
| **Minerals/Nutrients** ($M_{\text{min}}$) | $-\Delta M_{\text{min}, ij} - C_{\text{adv}, \text{min}} \cdot Q_{V, ij} \Delta t$ | $+\Delta M_{\text{min}, ij} + C_{\text{adv}, \text{min}} \cdot Q_{V, ij} \Delta t$ | $0.0 \text{ kg}$ | $\nabla C_{\text{min}}$ + Advection |
| **Thermal Energy** ($E_{\text{th}}$) | $-\Delta Q_{ij} - c_p \cdot \Delta M_{\text{water}, ij} \cdot T_{\text{upwind}}$ | $+\Delta Q_{ij} + c_p \cdot \Delta M_{\text{water}, ij} \cdot T_{\text{upwind}}$ | $0.0 \text{ J}$ | $\nabla T$ + Convection |

---

## 5. Monad Method Signatures & Implementation Formalisms

```typescript
import { calculateH3EdgeLengthMeters } from '../spatial/h3_adjacency';

/**
 * Geometric metrics for an H3 cell boundary interface.
 */
export interface IH3BoundaryInterface {
  readonly resolution: number;
  readonly edgeLengthMeters: number;
  readonly centerDistanceMeters: number;
  calculateContactArea(activeDepthMeters: number): number;
}

/**
 * Creates boundary geometry contract from resolution.
 */
export function createH3BoundaryInterface(resolution: number): IH3BoundaryInterface {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  const centerDistanceMeters = Math.sqrt(3) * edgeLengthMeters;

  return {
    resolution,
    edgeLengthMeters,
    centerDistanceMeters,
    calculateContactArea(activeDepthMeters: number): number {
      if (activeDepthMeters < 0) {
        throw new RangeError(`activeDepthMeters must be non-negative, got ${activeDepthMeters}`);
      }
      return edgeLengthMeters * activeDepthMeters;
    }
  };
}

/**
 * Monad step for symmetric pairwise diffusion of a scalar stock across cell boundary.
 */
export interface IDiffusionExchangeResult {
  readonly deltaStockSource: number;
  readonly deltaStockTarget: number;
  readonly fluxRate: number;
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffusionCoeff: number,
  resolution: number,
  activeDepthMeters: number,
  deltaSeconds: number
): IDiffusionExchangeResult {
  const boundary = createH3BoundaryInterface(resolution);
  const contactArea = boundary.calculateContactArea(activeDepthMeters);
  
  const cSource = stockSource / volumeSource;
  const cTarget = stockTarget / volumeTarget;
  const concentrationGradient = (cTarget - cSource) / boundary.centerDistanceMeters;
  
  // Fick's first law: J = -D * dC/dx
  const fluxRate = -diffusionCoeff * concentrationGradient; // kg/(m^2 * s) or mol/(m^2 * s)
  const transfer = fluxRate * contactArea * deltaSeconds;

  // Stability clamp: ensure transfer does not exceed available stock
  const clampedTransfer = Math.max(-stockTarget, Math.min(stockSource, transfer));

  return {
    deltaStockSource: -clampedTransfer,
    deltaStockTarget: clampedTransfer,
    fluxRate
  };
}
```

---

## 6. Verification Conditions & Invariants

1. **Analytical vs Tabular Boundary Equivalence**:
   $$\left| \text{calculateH3EdgeLengthMeters}(r) - L_{\text{table}}(r) \right| < 10^{-2} \quad \forall r \in [0, 15]$$
2. **Monotonicity**:
   $$L_{\text{edge}}(r+1) < L_{\text{edge}}(r) \quad \forall r \in [0, 14]$$
   $$\frac{L_{\text{edge}}(r)}{L_{\text{edge}}(r+1)} \approx \sqrt{7} \approx 2.64575$$
3. **Conservative Pairing**:
   Every inter-cell flux calculated using $L_{\text{edge}}(r)$ satisfies $\sum \Delta M_{\text{all cells}} \equiv 0$ and $\sum \Delta E_{\text{all cells}} \equiv 0$.