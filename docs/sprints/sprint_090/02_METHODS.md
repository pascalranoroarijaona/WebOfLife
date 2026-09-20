# Method Specifications: Sprint 090 - Pure Pentagon Resolution Verification & Aperture Flux Kernels

**Author**: Process Mining & Research Scientist  
**Sprint**: 090  
**Status**: Ready for Implementation  
**Target Components**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_grid.ts`, `src/spatial/h3_types.ts`, `tests/sprint_090.test.ts`  
**Dependencies**: Sprint 089 (Pentagonal Vertex and Directional Adjacency Kernels)

---

## 1. Physical & Mathematical Foundations

### 1.1 Aperture-7 Geometry & Discrete Global Grid Rotations
The discrete global grid system (DGGS) partitions the planetary icosahedron through hierarchical Aperture-7 ($\mathrm{Ap}7$) hexagonal decomposition, producing $12$ topological pentagonal singularities located at the icosahedron vertices:
$$\mathcal{V}_{\text{pent}} = \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$$

Each refinement step $r \to r+1$ scales cell area by a factor of $\lambda_A = 1/7$ and edge length by $\lambda_L = 1/\sqrt{7}$. Under $\mathrm{Ap}7$ subdivision, successive grid resolutions oscillate between Class II and Class III orientations:
- **Class II ($r \equiv 0 \pmod 2$)**: Symmetrical alignment. Coordinate axes align with the icosahedral base cell axes. The aperture rotation angle is:
  $$\theta_{\mathrm{ap}}(r) = 0 \quad (\text{mod } 2\pi)$$
- **Class III ($r \equiv 1 \pmod 2$)**: Skewed alignment. The coordinate axes rotate by the characteristic Aperture-7 twist angle:
  $$\theta_{\mathrm{ap}}(r) = (-1)^{\lfloor r/2 \rfloor} \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx \pm 19.106262983^{\circ} \quad (\pm 0.333473172 \text{ rad})$$

### 1.2 Pure Pentagon Resolution Invariance
A pentagonal cell index $H = (m, r, b, d_1, \dots, d_r)$ represents a **Pure Pentagon Resolution Index** if and only if:
1. $m = 1$ (`H3_CELL_MODE`).
2. $b \in \mathcal{V}_{\text{pent}}$ (originates from an icosahedral pentagonal vertex).
3. $\forall k \in [1, r], \, d_k = 0$ (`DIRECTION_CENTER`).
4. $r \pmod 2 = 0$ with $r \in [0, 15]$ (Class II resolution, eliminating aperture twist).

When $r$ is an unrotated Class II resolution, the five outgoing normal vectors $\hat{n}_k$ ($k \in \{0, \dots, 4\}$) of the pentagon's edges lie along pristine spherical geodesics co-planar with the five great circle arcs meeting at the icosahedral vertex:
$$\psi_k = \psi_0 + k \cdot \frac{2\pi}{5} = \psi_0 + k \cdot 72^{\circ}, \quad k \in \{0, 1, 2, 3, 4\}$$
where $\psi_0$ is the orientation offset of base cell $b$. Because $\theta_{\mathrm{ap}} = 0$, edge normal vectors do not require coordinate transformation matrices before computing boundary flux tensors.

---

## 2. Quantitative Thermodynamic Governance

### 2.1 Boundary Flux Formulation at 5-Fold Singularities
Let $V_p$ denote the spatial control volume of pentagon $p$ with area $A_p$ and 5 bounding edges $\partial V_{p,k}$ of length $L_{p,k} = L_p$.
The rate of change of an extensive thermodynamic stock $S \in \{M_{\mathrm{CO_2}}, M_{\mathrm{H_2O}}, M_{\mathrm{dust}}, M_{\mathrm{O_2}}, H_{\text{thermal}}\}$ within cell $p$ satisfies the Integral Continuity Equation:
$$\frac{\mathrm{d}S_p}{\mathrm{d}t} = -\oint_{\partial V_p} \vec{J}_S \cdot \hat{n} \, \mathrm{d}l + \dot{\Omega}_S = -\sum_{k=0}^{4} J_{S, k} \cdot L_{p, k} + \dot{\Omega}_S$$
where:
- $\vec{J}_S = \vec{J}_{S, \text{adv}} + \vec{J}_{S, \text{diff}}$ is the total flux density vector across the edge.
- $\hat{n}_k$ is the outward unit normal of edge $k$.
- $\dot{\Omega}_S$ represents internal biochemical or geochemical production/consumption rates.

### 2.2 Rotational Coordinate Invariance and Numerical Entropy Dissipation
Across edge $k$ between pentagon $p$ and adjacent neighbor $q_k$, the spatial gradient is computed from cell-centered intensive potentials $\phi \in \{T, P, \mu_{\mathrm{H_2O}}, \mu_{\mathrm{CO_2}}\}$:
$$\nabla \phi \approx \frac{\phi_{q_k} - \phi_p}{\Delta x_{pq}} \hat{n}_k$$
where $\Delta x_{pq}$ is the geodesic centroid distance.

When aperture rotation is present ($r$ odd, Class III), the actual geometric face normal $\hat{n}_k'$ is tilted by $\theta_{\mathrm{ap}}$:
$$\hat{n}_k' = \mathbf{R}(\theta_{\mathrm{ap}}) \hat{n}_k = \begin{bmatrix} \cos \theta_{\mathrm{ap}} & -\sin \theta_{\mathrm{ap}} \\ \sin \theta_{\mathrm{ap}} & \cos \theta_{\mathrm{ap}} \end{bmatrix} \hat{n}_k$$
Failure to rotate flux tensors on odd resolutions introduces artificial numerical vorticity:
$$\nabla \times \vec{J}_{\text{spurious}} = \frac{1}{A_p} \sum_{k=0}^{4} (\vec{J} \cdot \hat{t}_k) L_k \ne 0$$
which drives non-physical numerical entropy generation $\dot{S}_{\text{num}} > 0$.

For a **Pure Pentagon Resolution Index** ($r \equiv 0 \pmod 2$), $\mathbf{R}(\theta_{\mathrm{ap}}) = \mathbf{I}$, guaranteeing:
$$\nabla \times \vec{J}_{\text{diff}} \equiv 0$$
$$\dot{S}_{\text{irr}} = \sum_{k=0}^{4} \frac{J_{Q, k} \cdot L_k}{T_p \cdot T_{q_k}} (T_p - T_{q_k}) \ge 0$$
satisfying the Second Law of Thermodynamics without rotational correction overhead.

---

## 3. Stock Deltas and Advective-Diffusive Balances

Each spatial flux step across the 5 pentagonal boundaries exchanges mass and thermal enthalpy over integration time-step $\Delta t$.

### 3.1 Mass Transfer Deltas
For each conserved chemical constituent $\alpha \in \{\mathrm{CO_2}, \mathrm{H_2O}, \mathrm{dust}, \mathrm{O_2}\}$:
$$\Delta M_{\alpha, p \to q_k} = \left[ v_{n, k} \cdot \bar{\rho}_{\alpha, k} - D_\alpha \frac{\rho_{\alpha, q_k} - \rho_{\alpha, p}}{\Delta x_{pq}} \right] \cdot L_p \cdot \Delta t$$
where:
- $v_{n, k} = \vec{v}_k \cdot \hat{n}_k$ is the normal atmospheric advection velocity ($\text{m/s}$).
- $\bar{\rho}_{\alpha, k}$ is the upwind concentration ($\text{kg/m}^3$):
  $$\bar{\rho}_{\alpha, k} = \begin{cases} \rho_{\alpha, p}, & v_{n, k} \ge 0 \\ \rho_{\alpha, q_k}, & v_{n, k} < 0 \end{cases}$$
- $D_\alpha$ is the isotropic molecular/eddy diffusivity ($\text{m}^2/\text{s}$).
- $L_p$ is edge boundary length ($\text{m}$).

### 3.2 Thermal Enthalpy Deltas
Thermal energy exchange includes advected enthalpy and Fourier heat conduction:
$$\Delta H_{p \to q_k} = \left[ v_{n, k} \cdot \bar{\rho} \cdot c_p \cdot \bar{T}_k - \kappa_{\text{thermal}} \frac{T_{q_k} - T_p}{\Delta x_{pq}} \right] \cdot L_p \cdot \Delta t$$
where:
- $c_p$ is the isobaric specific heat capacity ($\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$).
- $\kappa_{\text{thermal}}$ is thermal conductivity ($\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}$).
- $\bar{T}_k$ is the upwind temperature ($\text{K}$).

### 3.3 Conservation Delta Table

| Stock | Symbol | Edge Transfer Formula $\Delta S_{p \to q_k}$ | Cell Net Change $\Delta S_p$ |
| :--- | :--- | :--- | :--- |
| **Atmospheric Carbon Dioxide** | $M_{\mathrm{CO_2}}$ (kg) | $(v_{n, k} \bar{\rho}_{\mathrm{CO_2}} - D_{\mathrm{CO_2}} \nabla_k \rho_{\mathrm{CO_2}}) L_p \Delta t$ | $-\sum_{k=0}^{4} \Delta M_{\mathrm{CO_2}, p \to q_k}$ |
| **Water Vapor** | $M_{\mathrm{H_2O}}$ (kg) | $(v_{n, k} \bar{\rho}_{\mathrm{H_2O}} - D_{\mathrm{H_2O}} \nabla_k \rho_{\mathrm{H_2O}}) L_p \Delta t$ | $-\sum_{k=0}^{4} \Delta M_{\mathrm{H_2O}, p \to q_k}$ |
| **Mineral Aerosols / Dust** | $M_{\mathrm{dust}}$ (kg) | $(v_{n, k} \bar{\rho}_{\mathrm{dust}} - D_{\mathrm{dust}} \nabla_k \rho_{\mathrm{dust}}) L_p \Delta t$ | $-\sum_{k=0}^{4} \Delta M_{\mathrm{dust}, p \to q_k}$ |
| **Atmospheric Oxygen** | $M_{\mathrm{O_2}}$ (kg) | $(v_{n, k} \bar{\rho}_{\mathrm{O_2}} - D_{\mathrm{O_2}} \nabla_k \rho_{\mathrm{O_2}}) L_p \Delta t$ | $-\sum_{k=0}^{4} \Delta M_{\mathrm{O_2}, p \to q_k}$ |
| **Thermal Enthalpy** | $H_{\text{thermal}}$ (J) | $(v_{n, k} \bar{\rho} c_p \bar{T} - \kappa \nabla_k T) L_p \Delta t$ | $-\sum_{k=0}^{4} \Delta H_{p \to q_k}$ |

**First Law Closure**:
$$\sum_{p \in \text{Domain}} \Delta S_p = 0 \quad (\forall S \in \{M, H\} \text{ under closed boundary conditions})$$

---

## 4. Executable Monad Method Specifications

### 4.1 Pure Pentagon Resolution Index Verification Method
Location: `src/spatial/h3_adjacency.ts`

```typescript
import {
  H3Index,
  PENTAGON_BASE_CELLS,
  H3_MAX_RESOLUTION,
  H3_MIN_RESOLUTION,
  DIRECTION_CENTER
} from './h3_types';
import { getResolution, getBaseCell, getIndexDigit } from './h3_grid';

/**
 * Evaluates whether a given H3 cell index or numeric resolution represents a pure pentagon
 * resolution index.
 *
 * A cell index is a pure pentagon resolution index if:
 * 1. It is a valid pentagon cell:
 *    - Base cell belongs to the 12 icosahedral pentagonal vertices.
 *    - All directional digits from level 1 to r are DIRECTION_CENTER (0).
 * 2. It resides at a Class II resolution (r % 2 === 0), retaining base cell orientation
 *    without aperture rotation.
 *
 * If passed a numeric resolution directly, returns true if and only if the resolution
 * preserves base cell orientation without aperture rotation (i.e. even integer in [0, 15]).
 *
 * @param target - The H3 index (as hex string or bigint) or a resolution integer (0-15).
 * @param resolution - Optional resolution override when target is an index.
 * @returns true if the index or resolution retains base cell orientation without aperture rotation.
 */
export function isPurePentagonResolutionIndex(
  target: string | bigint | number,
  resolution?: number
): boolean {
  // Overload 1: Target is a numeric resolution
  if (typeof target === 'number') {
    if (!Number.isInteger(target)) {
      return false;
    }
    if (target < H3_MIN_RESOLUTION || target > H3_MAX_RESOLUTION) {
      return false;
    }
    return target % 2 === 0;
  }

  // Overload 2: Target is an H3 Cell Index (string hex or bigint)
  const cellIndex = target;
  const res = resolution !== undefined ? resolution : getResolution(cellIndex);

  // Validate resolution bounds and Class II parity (even resolution)
  if (!Number.isInteger(res) || res < H3_MIN_RESOLUTION || res > H3_MAX_RESOLUTION) {
    return false;
  }
  if (res % 2 !== 0) {
    // Class III resolution has aperture rotation skew (~19.1063 degrees)
    return false;
  }

  // Validate base cell is one of the 12 pentagonal vertices
  const baseCell = getBaseCell(cellIndex);
  if (!PENTAGON_BASE_CELLS.has(baseCell)) {
    return false;
  }

  // Validate concentric center-child trajectory: all digits 1..res must be DIRECTION_CENTER (0)
  for (let level = 1; level <= res; level++) {
    const digit = getIndexDigit(cellIndex, level);
    if (digit !== DIRECTION_CENTER) {
      return false;
    }
  }

  return true;
}
```

### 4.2 Monadic Spatial Flux Gating Integration
Location: `src/spatial/h3_adjacency.ts` / Monad Kernel

```typescript
export interface PentagonThermodynamicStocks {
  carbonDioxideKg: number;
  waterVaporKg: number;
  dustKg: number;
  oxygenKg: number;
  enthalpyJoules: number;
}

export interface FluxTransferDeltas {
  dCO2: number;
  dH2O: number;
  dDust: number;
  dO2: number;
  dEnthalpy: number;
}

export const APERTURE_ROTATION_RAD = 0.33347317229; // arcsin(sqrt(3) / (2 * sqrt(7)))

/**
 * Computes boundary flux transfer between a pentagon and its neighbor, dynamically
 * bypassing rotational tensor transformation if the cell is a pure pentagon resolution index.
 */
export function computePentagonBoundaryDelta(
  sourceCell: string | bigint,
  neighborCell: string | bigint,
  sourceStocks: PentagonThermodynamicStocks,
  neighborStocks: PentagonThermodynamicStocks,
  faceLengthMeters: number,
  centroidDistanceMeters: number,
  advectionVelocityNormal: number, // m/s (positive = outward)
  diffusionCoefficient: number,    // m^2/s
  dtSeconds: number
): { sourceDelta: FluxTransferDeltas; neighborDelta: FluxTransferDeltas } {
  const isPure = isPurePentagonResolutionIndex(sourceCell);

  // Effective velocity component: if Class III (odd resolution), project with aperture rotation
  const effectiveVn = isPure
    ? advectionVelocityNormal
    : advectionVelocityNormal * Math.cos(APERTURE_ROTATION_RAD);

  // Transfer function per stock
  const computeTransfer = (cSource: number, cNeighbor: number): number => {
    // Upwind advective concentration
    const cUpwind = effectiveVn >= 0 ? cSource : cNeighbor;
    const advectiveFlux = effectiveVn * cUpwind;
    // Fickian diffusive flux
    const diffusiveFlux = -diffusionCoefficient * ((cNeighbor - cSource) / centroidDistanceMeters);
    const totalFlux = advectiveFlux + diffusiveFlux;
    return totalFlux * faceLengthMeters * dtSeconds;
  };

  const transferCO2 = computeTransfer(sourceStocks.carbonDioxideKg, neighborStocks.carbonDioxideKg);
  const transferH2O = computeTransfer(sourceStocks.waterVaporKg, neighborStocks.waterVaporKg);
  const transferDust = computeTransfer(sourceStocks.dustKg, neighborStocks.dustKg);
  const transferO2 = computeTransfer(sourceStocks.oxygenKg, neighborStocks.oxygenKg);
  const transferEnthalpy = computeTransfer(sourceStocks.enthalpyJoules, neighborStocks.enthalpyJoules);

  return {
    sourceDelta: {
      dCO2: -transferCO2,
      dH2O: -transferH2O,
      dDust: -transferDust,
      dO2: -transferO2,
      dEnthalpy: -transferEnthalpy
    },
    neighborDelta: {
      dCO2: transferCO2,
      dH2O: transferH2O,
      dDust: transferDust,
      dO2: transferO2,
      dEnthalpy: transferEnthalpy
    }
  };
}
```

---

## 5. Formal Invariants & Assertion Gates

### 5.1 Parity and Geometric Invariant Tests
Every execution of `isPurePentagonResolutionIndex` adheres to deterministic mathematical gates:
1. **Resolution Parity Gate**:
   $$\forall r \in [0, 15], \quad \text{isPurePentagonResolutionIndex}(r) = \begin{cases} \text{true}, & r \in \{0, 2, 4, 6, 8, 10, 12, 14\} \\ \text{false}, & r \in \{1, 3, 5, 7, 9, 11, 13, 15\} \end{cases}$$
2. **Topological Singularity Gate**:
   $$\text{isPentagon}(H) \implies b \in \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\} \land \left(\forall k \in [1, r], \, d_k = 0\right)$$
   $$\text{isPurePentagonResolutionIndex}(H) \implies \text{isPentagon}(H) \land (r \equiv 0 \pmod 2)$$

### 5.2 Stock Conservation Assertions
Under any boundary flux step between cell $p$ and neighbor $q$:
$$\left| \Delta S_p + \Delta S_q \right| < 1.0 \times 10^{-15} \quad (\forall S \in \{M_{\mathrm{CO_2}}, M_{\mathrm{H_2O}}, M_{\mathrm{dust}}, M_{\mathrm{O_2}}, H_{\text{thermal}}\})$$

### 5.3 Zero Aperture Distortion Gate
When `isPurePentagonResolutionIndex(cell) === true`:
$$\|\mathbf{R}(\theta_{\mathrm{ap}}) - \mathbf{I}\|_F = 0$$
No rotation matrix multiplications are executed, preserving bit-exact floating point determinism across parallel simulation tensors.