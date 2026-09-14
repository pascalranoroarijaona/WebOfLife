# Process Methodology & Physical Formalization: Sprint 055
**Target Subsystem:** `src/spatial/h3_adjacency.ts`  
**Process Focus:** Geodesic Angular Normalization & Directional Advective Stock Transfers  
**Author:** Process Mining & Research Scientist, Web of Life Project  

---

## 1. Physical & Geodesic Process Foundations

### 1.1 Spherical Topology and Geodesic Advection
In the discrete global grid system (DGGS) based on the Uber H3 hierarchical hexagonal projection, planetary surface processes are simulated over discrete hexagonal cells $H_i \in \mathcal{H}$. Adjacent cells $H_i$ and $H_j$ are coupled across shared geodesic edges $\Gamma_{ij}$ of length $L_{ij}$.

Physical advection across cell boundaries transports conserved extensive quantities:
- **Mass Stocks:** Carbon ($M_C$), Water ($M_{H_2O}$), Minerals ($M_{min}$), Oxygen ($M_{O_2}$)
- **Energy Stocks:** Internal thermal energy ($U_{th}$) and advective kinetic energy ($E_k$)

The advective flux vector field $\mathbf{u}(\mathbf{x}) = (u_\lambda, u_\phi)$ represents horizontal velocity along zonal ($\lambda$) and meridional ($\phi$) coordinates. The directional bearing $\theta_{ij} \in \mathbb{R}$ between cell centroids $\mathbf{x}_i$ and $\mathbf{x}_j$ dictates the projection of $\mathbf{u}$ onto the outward normal unit vector $\hat{\mathbf{n}}_{ij}$ of edge $\Gamma_{ij}$:

$$\hat{\mathbf{n}}_{ij} = \begin{bmatrix} \cos(\theta_{ij}) \\ \sin(\theta_{ij}) \end{bmatrix}$$

### 1.2 The Modulo Branch-Cut Discontinuity Problem
Planar trigonometry routinely yields bearings $\theta \notin [-\pi, \pi)$ due to:
1. Cumulative angular drift from Coriolis rotation: $d\theta/dt = -2\Omega \sin\phi$.
2. Cyclic accumulation in multi-step Lagrangian parcel trajectories.
3. Spherical branch cuts at the antimeridian ($\pm\pi$) and pole singularities.

When raw angular values accumulate without bounded canonical normalization, floating-point divergence occurs:
- As $|\theta| \gg 2\pi$, precision of $\cos\theta$ and $\sin\theta$ degrades due to floating-point argument reduction errors.
- Discontinuous jumps across non-normalized boundaries violate the local Lipschitz continuity of flux limiters (e.g., Total Variation Diminishing schemes), leading to spurious numerical mass creation or destruction ($\nabla \cdot \mathbf{u} \neq 0$ in quiescent fields).

### 1.3 The Quotient Group Isomorphism
Angular coordinates belong to the quotient group $\mathbb{T} = \mathbb{R} / 2\pi\mathbb{Z}$. The canonical normalization operator $\psi: \mathbb{R} \to [-\pi, \pi)$ enforces the bijection:

$$\psi(\theta) = \theta - 2\pi \left\lfloor \frac{\theta + \pi}{2\pi} \right\rfloor$$

with strict IEEE 754 branch-cut compliance:
$$\psi(\pi) = -\pi, \quad \psi(-\pi) = -\pi, \quad \psi(0) = 0$$

---

## 2. Mass & Energy Flux Formulations

Let cell $H_i$ have area $A_i$, and let boundary $\Gamma_{ij}$ have length $L_{ij}$ with outward normal bearing $\hat{\theta}_{ij} = \psi(\theta_{ij})$.

### 2.1 Advective Normal Velocity
The velocity component normal to boundary interface $\Gamma_{ij}$ is:

$$u_{n, ij} = \mathbf{u}_i \cdot \hat{\mathbf{n}}_{ij} = \|\mathbf{u}_i\| \cos(\phi_{\mathbf{u}, i} - \hat{\theta}_{ij})$$

where $\phi_{\mathbf{u}, i} = \psi(\text{atan2}(v_i, u_i))$ is the normalized flow velocity angle.

Using an upwind formulation, the directional volume flux rate $\Phi_{V, ij}$ ($\text{m}^3 \cdot \text{s}^{-1}$) across $\Gamma_{ij}$ is:

$$\Phi_{V, ij} = L_{ij} \cdot h_{ij} \cdot \max(0, u_{n, ij})$$

where $h_{ij}$ is the effective fluid layer depth (atmospheric scale height or oceanic mixed-layer depth).

### 2.2 Conserved Stock Transfer Equations

For any advected intensive stock density $\rho_X = M_X / V_i$ (where $X \in \{C, H_2O, min, O_2\}$):

$$\Delta M_{X, i \to j} = \Phi_{V, ij} \cdot \rho_{X, i} \cdot \Delta t$$

#### 1. Carbon Stock Delta ($M_C$)
Transport of dissolved/gaseous carbon dioxide and particulate organic carbon:
$$\Delta M_{C, i} = - \sum_{j \in \mathcal{N}(i)} \Delta M_{C, i \to j} + \sum_{k \in \mathcal{N}(i)} \Delta M_{C, k \to i}$$
$$\Delta M_{C, j} = + \Delta M_{C, i \to j}$$
$$\text{Net Delta: } \Delta M_{C, i} + \Delta M_{C, j} = 0 \quad [\text{kg C}]$$

#### 2. Water Stock Delta ($M_{H_2O}$)
Advective transport of atmospheric specific humidity / precipitable water:
$$\Delta M_{H_2O, i \to j} = \Phi_{V, ij} \cdot \rho_{H_2O, i} \cdot \Delta t$$
$$\Delta M_{H_2O, i} + \Delta M_{H_2O, j} = 0 \quad [\text{kg } H_2O]$$

#### 3. Mineral Stock Delta ($M_{min}$)
Aeolian dust and marine suspended mineral particulate transport:
$$\Delta M_{min, i \to j} = \Phi_{V, ij} \cdot \rho_{min, i} \cdot \Delta t$$
$$\Delta M_{min, i} + \Delta M_{min, j} = 0 \quad [\text{kg minerals}]$$

#### 4. Oxygen Stock Delta ($M_{O_2}$)
Advection of atmospheric and oceanic dissolved oxygen:
$$\Delta M_{O_2, i \to j} = \Phi_{V, ij} \cdot \rho_{O_2, i} \cdot \Delta t$$
$$\Delta M_{O_2, i} + \Delta M_{O_2, j} = 0 \quad [\text{kg } O_2]$$

#### 5. Energy Stock Delta ($E_{total} = U_{th} + E_k$)
The total transferred energy combines specific internal enthalpy $c_p T_i$ and kinetic energy per unit mass $\frac{1}{2}\|\mathbf{u}_i\|^2$:

$$e_{total, i} = c_{p, fluid} \cdot T_i + \frac{1}{2}\|\mathbf{u}_i\|^2$$

$$\Delta E_{i \to j} = \Phi_{V, ij} \cdot \rho_{fluid, i} \cdot e_{total, i} \cdot \Delta t$$

$$\Delta E_i = - \sum_{j \in \mathcal{N}(i)} \Delta E_{i \to j} + \sum_{k \in \mathcal{N}(i)} \Delta E_{k \to i}$$
$$\text{Net Delta: } \Delta E_i + \Delta E_j = 0 \quad [\text{Joules}]$$

### 2.3 First & Second Law Compliance Verification
- **First Law (Conservation):**
  $$\sum_{i \in \mathcal{H}} \left( \frac{d M_{X, i}}{dt} \right)_{\text{advection}} = 0, \quad \sum_{i \in \mathcal{H}} \left( \frac{d E_i}{dt} \right)_{\text{advection}} = 0$$
- **Second Law (Entropy Production):**
  Angular coordinate transformation $\psi: \theta \mapsto \hat{\theta}$ is an isometric projection on $\mathbb{T}$, producing zero entropy:
  $$\Delta S_{\text{projection}} = 0 \quad \text{J} \cdot \text{K}^{-1}$$
  Upwind advection dissipates kinetic energy only via physical Reynolds stresses and viscosity, not numerical branch-cut jumps.

---

## 3. Concrete Stock Transfer Equations & State Matrices

### 3.1 Cell State Vector
Each hexagonal cell state at discrete time $t$ is represented by the extensive state vector $\mathbf{S}_i(t)$:

$$\mathbf{S}_i(t) = \begin{bmatrix} M_{C, i} \\ M_{H_2O, i} \\ M_{min, i} \\ M_{O_2, i} \\ E_i \end{bmatrix} \in \mathbb{R}_{\ge 0}^5$$

### 3.2 Coupling Matrix Across Directed Edge $e = (i \to j)$
For cell $i$ with neighbor $j$, given edge normal bearing $\theta_{ij} \in \mathbb{R}$:

$$\hat{\theta}_{ij} = \text{normalizeAngleRadians}(\theta_{ij})$$

Relative flow orientation:
$$\Delta \theta_{ij} = \text{normalizeAngleRadians}(\phi_{\mathbf{u}, i} - \hat{\theta}_{ij})$$

Normal transmission coefficient:
$$\kappa_{ij} = \max\left(0, \cos(\Delta \theta_{ij})\right)$$

Edge flux transfer volume:
$$\delta V_{ij} = \Delta t \cdot L_{ij} \cdot h_{ij} \cdot \|\mathbf{u}_i\| \cdot \kappa_{ij}$$

The state transfer delta vector $\mathbf{\Delta S}_{i \to j}$ is:

$$\mathbf{\Delta S}_{i \to j} = \frac{\delta V_{ij}}{V_i} \cdot \mathbf{S}_i(t)$$

subject to Courant-Friedrichs-Lewy (CFL) stability:
$$\sum_{j \in \mathcal{N}(i)} \frac{\delta V_{ij}}{V_i} \le 1.0$$

---

## 4. Executable Monad Method Specifications

### 4.1 `normalizeAngleRadians` Specification

```typescript
/**
 * Canonical angular wrapper mapping any real radian value into the half-open fundamental domain [-π, π).
 * 
 * Mathematical Formulation:
 *   ψ(θ) = θ - 2π * floor((θ + π) / (2π))
 * 
 * Boundary Conditions:
 *   - +π wraps to -π
 *   - -π remains -π
 *   - Non-finite values (NaN, +Infinity, -Infinity) return verbatim
 * 
 * @param radians - Input angle in radians (arbitrary real number)
 * @returns Canonical angle in radians in [-Math.PI, Math.PI)
 */
export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) {
    return radians;
  }
  const TWO_PI = 2 * Math.PI;
  // Shift by π to move canonical range [-π, π) to [0, 2π)
  let angle = (radians + Math.PI) % TWO_PI;
  if (angle < 0) {
    angle += TWO_PI;
  }
  // Shift back to [-π, π)
  const normalized = angle - Math.PI;
  
  // Guard against IEEE 754 precision boundary snap where normalized could equal Math.PI
  if (normalized === Math.PI) {
    return -Math.PI;
  }
  return normalized;
}
```

### 4.2 Monad State Transition: `AdvectiveTransportMonad`

```typescript
export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
}

export interface AdvectiveEdgeContext {
  edgeLengthMeters: number;
  layerDepthMeters: number;
  cellVolumeM3: number;
  flowVelocityMs: number;
  flowAngleRadians: number;
  boundaryBearingRadians: number; // Raw bearing between centroids
  timeDeltaSeconds: number;
}

export interface AdvectiveTransferResult {
  deltaStocks: HexCellStocks;
  normalizedBearing: number;
  effectiveNormalVelocityMs: number;
  volumeTransferredM3: number;
}

/**
 * Computes strictly conservative mass/energy stock transfer across a hexagonal boundary edge.
 *
 * @param source - Source cell stock inventory
 * @param context - Boundary physical and geometrical parameters
 * @returns Advective transfer delta vector to be subtracted from source and added to target
 */
export function computeAdvectiveEdgeTransfer(
  source: Readonly<HexCellStocks>,
  context: Readonly<AdvectiveEdgeContext>
): AdvectiveTransferResult {
  // 1. Angular normalization through canonical wrapper
  const normBoundaryBearing = normalizeAngleRadians(context.boundaryBearingRadians);
  const normFlowAngle = normalizeAngleRadians(context.flowAngleRadians);
  
  // 2. Relative incidence angle
  const relativeAngle = normalizeAngleRadians(normFlowAngle - normBoundaryBearing);
  
  // 3. Normal transmission coefficient (upwind projection)
  const normalProjection = Math.cos(relativeAngle);
  const effectiveNormalVelocityMs = normalProjection > 0 
    ? context.flowVelocityMs * normalProjection 
    : 0.0;

  // 4. Volumetric flux calculation
  const fluxVolumeM3 = effectiveNormalVelocityMs * 
                       context.edgeLengthMeters * 
                       context.layerDepthMeters * 
                       context.timeDeltaSeconds;

  // CFL limiter: volume transferred cannot exceed source volume
  const clampedVolumeM3 = Math.min(Math.max(0.0, fluxVolumeM3), context.cellVolumeM3);
  const transferFraction = context.cellVolumeM3 > 0 ? clampedVolumeM3 / context.cellVolumeM3 : 0.0;

  // 5. Conserved stock transfer deltas
  const deltaStocks: HexCellStocks = {
    carbonKg: source.carbonKg * transferFraction,
    waterKg: source.waterKg * transferFraction,
    mineralsKg: source.mineralsKg * transferFraction,
    oxygenKg: source.oxygenKg * transferFraction,
    energyJoules: source.energyJoules * transferFraction,
  };

  return {
    deltaStocks,
    normalizedBearing: normBoundaryBearing,
    effectiveNormalVelocityMs,
    volumeTransferredM3: clampedVolumeM3,
  };
}
```

---

## 5. Verification Invariants & Assertions

Every implementation of `normalizeAngleRadians` and its dependent monad functions must satisfy:

1. **Range Invariant:**
   $$\forall \theta \in \mathbb{R}_{\text{finite}}, \quad -\pi \le \text{normalizeAngleRadians}(\theta) < \pi$$
2. **Boundary Discontinuity Contract:**
   $$\text{normalizeAngleRadians}(\pi) = -\pi$$
   $$\text{normalizeAngleRadians}(-\pi) = -\pi$$
3. **Periodicity Preservation:**
   $$\forall k \in \mathbb{Z}, \quad \text{normalizeAngleRadians}(\theta + 2\pi k) = \text{normalizeAngleRadians}(\theta) \quad (\pm 10^{-14})$$
4. **Conservation of Extensive Stocks:**
   $$\Delta \mathbf{S}_i + \Delta \mathbf{S}_j = \mathbf{0}$$
5. **Non-Negativity Constraint:**
   $$\mathbf{S}_i(t + \Delta t) \ge \mathbf{0}$$