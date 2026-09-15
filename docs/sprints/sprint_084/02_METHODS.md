# Sprint 084: Process Mining & Research Specification
# Directional Bitmask Flux Routing & Topological Boundary Thermodynamics

## 1. Physical, Biological, and Fluid Dynamic Foundations

In discrete planetary systems modeled on a Discrete Global Grid System (DGGS) using H3 hexagonal tiling, continuous balance laws for conserved physical quantities (mass, momentum, and internal energy) are discretized over hexagonal control volumes $\mathcal{H}_i$.

Each interior hexagonal cell $c_i \in \mathcal{H}$ possesses an invariant topological valence of 6, with centroid-to-centroid directional unit vectors $\mathbf{e}_d$ for $d \in \{0, 1, 2, 3, 4, 5\}$ separated by uniform angular increments of $\Delta \theta = \pi/3$ radians ($60^\circ$):
$$\mathbf{e}_d = \left[ \cos\left(\theta_0 + \frac{d\pi}{3}\right), \, \sin\left(\theta_0 + \frac{d\pi}{3}\right) \right]^T$$

Where geometric cell edge length is $L_e$ and inter-cell centroid distance is $\Delta x = \sqrt{3} L_e$, the orthogonal facet cross-sectional area through which planetary stocks transit is $A_e = L_e \cdot H_k$, where $H_k$ represents the effective vertical depth of the computational layer (atmospheric boundary layer, oceanic mixed layer, or soil regolith column).

### 1.1 First Law Conservation Across Discrete Facets
For any conserved extensive state variable $X_k$ (carbon $M_C$, water $M_W$, mineral solute $M_M$, oxygen $M_{O_2}$, or thermal internal energy $U$), the discrete divergence theorem over cell $c_i$ yields the time rate of stock change:
$$\frac{d X_{i, k}}{dt} = \Sigma_{\text{source}, i, k} - \Sigma_{\text{sink}, i, k} - \sum_{d=0}^{5} \Phi_{d, k}(c_i)$$

where $\Phi_{d, k}(c_i)$ is the outgoing flux of stock $k$ traversing facet $d$.

### 1.2 Boundary Impermeability & Topographic Masking
In planetary systems, physical barriers (e.g., continental divides, mountain ranges exceeding planetary boundary layer height, or tectonic fault scarps) and thermodynamic phase barriers (e.g., land-sea interfaces for oceanic currents) restrict lateral flux. 

A channel is topologically open if and only if both the local cell $c_i$ and the opposing cell $c_j = \text{neighbor}(c_i, d)$ permit transport. Let $\mathcal{B}(c_i) \in [0, 63] \subset \mathbb{N}_0$ be the 6-bit channel bitmask for $c_i$. The directional edge admittance $\chi_d(c_i)$ is:
$$\chi_d(c_i) = \frac{\mathcal{B}(c_i) \ \& \ (1 \ll d)}{1 \ll d} = (\mathcal{B}(c_i) \gg d) \ \& \ 1 \in \{0, 1\}$$

The conjugate reciprocal edge index in cell $c_j$ is given by hexagonal point-reflection symmetry:
$$\bar{d} = (d + 3) \pmod 6$$

Thus, the mutual edge permeability operator $\Omega_{ij}(d)$ is the logical product:
$$\Omega_{ij}(d) = \chi_d(c_i) \land \chi_{\bar{d}}(c_j) \in \{0, 1\}$$

When $\Omega_{ij}(d) = 0$, the facet acts as an adiabatic, no-slip, zero-flux boundary:
$$\Phi_{d, k}^{\text{net}}(c_i \to c_j) \equiv 0$$

---

## 2. Formalized Stock Transfer Equations

The discrete transfer of matter and energy over time interval $\Delta t$ is governed by coupled advective and diffusive dynamics modulated by the topological permeability operator $\Omega_{ij}(d)$.

### 2.1 Advective Stock Transfer
Advective velocity along edge normal $\mathbf{e}_d$ is denoted $u_d \in \mathbb{R}$ [m/s]. Using an upwind formulation for thermodynamic stability:
$$C_{i \to j, k}^* = \begin{cases}
\frac{X_{i, k}}{V_i}, & \text{if } u_d \ge 0 \\
\frac{X_{j, k}}{V_j}, & \text{if } u_d < 0
\end{cases}$$

$$\Phi_{d, k}^{\text{adv}} = \Omega_{ij}(d) \cdot A_e \cdot u_d \cdot C_{i \to j, k}^*$$

### 2.2 Diffusive Stock Transfer
Diffusive exchange driven by concentration or potential gradient $\nabla C_k \approx \frac{C_{j, k} - C_{i, k}}{\Delta x}$:
$$\Phi_{d, k}^{\text{diff}} = -\Omega_{ij}(d) \cdot D_k \cdot A_e \cdot \frac{C_{j, k} - C_{i, k}}{\Delta x}$$
where $D_k$ is the kinematic diffusion coefficient [$m^2/s$].

### 2.3 Net Exchange Matrix per Channel $d$
$$\Delta X_{d, k} = \Delta t \cdot \left( \Phi_{d, k}^{\text{adv}} + \Phi_{d, k}^{\text{diff}} \right) \cdot \Omega_{ij}(d)$$

Exact conservation requires anti-symmetry:
$$\Delta X_{d, k}(c_i \to c_j) = -\Delta X_{\bar{d}, k}(c_j \to c_i)$$

---

## 3. Mass & Energy Balance Deltas (5 Core Dimensions)

Each cell vector $\mathbf{S}_i = [M_{W, i}, M_{C, i}, M_{M, i}, M_{O_2, i}, U_i]^T$ evolves under the masked spatial transport operator according to exact deltas:

### 3.1 Water Mass ($M_W$ [kg])
$$\Delta M_{W, i} = -\sum_{d=0}^{5} \Omega_{ij}(d) \cdot \Delta t \cdot \left[ A_e u_d \left( \frac{M_{W, i}}{V_i} \mathbb{I}_{u_d \ge 0} + \frac{M_{W, j}}{V_j} \mathbb{I}_{u_d < 0} \right) - D_W A_e \frac{M_{W, j}/V_j - M_{W, i}/V_i}{\Delta x} \right]$$

### 3.2 Carbon Stock ($M_C$ [kg])
Including dissolved organic carbon (DOC), particulate organic carbon (POC), and dissolved inorganic carbon (DIC):
$$\Delta M_{C, i} = -\sum_{d=0}^{5} \Omega_{ij}(d) \cdot \Delta t \cdot \left[ A_e u_d C_{C, i \to j}^* - D_C A_e \frac{C_{C, j} - C_{C, i}}{\Delta x} \right]$$

### 3.3 Mineral Nutrients ($M_M$ [kg])
Total bioavailable nitrogen and phosphorus mass:
$$\Delta M_{M, i} = -\sum_{d=0}^{5} \Omega_{ij}(d) \cdot \Delta t \cdot \left[ A_e u_d C_{M, i \to j}^* - D_M A_e \frac{C_{M, j} - C_{M, i}}{\Delta x} \right]$$

### 3.4 Dissolved Oxygen ($M_{O_2}$ [kg])
$$\Delta M_{O_2, i} = -\sum_{d=0}^{5} \Omega_{ij}(d) \cdot \Delta t \cdot \left[ A_e u_d C_{O_2, i \to j}^* - D_{O_2} A_e \frac{C_{O_2, j} - C_{O_2, i}}{\Delta x} \right]$$

### 3.5 Internal Enthalpy ($U$ [Joules])
Thermal energy advection and conduction (Fourier diffusion) with viscous friction dissipation:
$$U_i = M_{\text{fluid}, i} \cdot c_p \cdot T_i$$
$$\Phi_{d, U} = \Omega_{ij}(d) \left[ A_e u_d \left( \frac{U_i}{V_i}\mathbb{I}_{u_d \ge 0} + \frac{U_j}{V_j}\mathbb{I}_{u_d < 0} \right) - k_{\text{th}} A_e \frac{T_j - T_i}{\Delta x} \right]$$
$$\delta W_{\text{diss, } d} = \Omega_{ij}(d) \cdot \frac{\mu_{\text{visc}} A_e u_d^2}{\Delta x} \cdot \Delta t$$
$$\Delta U_i = -\sum_{d=0}^{5} \left( \Delta t \cdot \Phi_{d, U} - \frac{1}{2} \delta W_{\text{diss, } d} \right)$$

### 3.6 Entropy Production Verification (Second Law)
Irreversible entropy generation across the channel network is strictly non-negative:
$$\dot{S}_{\text{irr}} = \sum_{\text{cells } i} \sum_{d=0}^5 \Omega_{ij}(d) \left[ k_{\text{th}} A_e \frac{(T_j - T_i)^2}{T_i T_j \Delta x} + \frac{\mu_{\text{visc}} A_e u_d^2}{T_d \Delta x} + \sum_k D_k A_e R \frac{(C_{j, k} - C_{i, k})^2}{C_{ij, k} \Delta x} \right] \ge 0$$

If $\Omega_{ij}(d) = 0$ (direction masked), edge entropy production is zero, preventing fictitious non-equilibrium generation at impermeable barriers.

---

## 4. Executable Monad Method Formalization

The following TypeScript method specifications illustrate the operational integration of `DirectionBitmask` and `H3DirectionBitmask` into spatial simulation kernels.

```typescript
/**
 * Mathematical state vector for conserved thermodynamic stocks in a hexagonal cell.
 */
export interface CellStockTensor {
  readonly waterKg: number;
  readonly carbonKg: number;
  readonly mineralsKg: number;
  readonly oxygenKg: number;
  readonly internalEnergyJoules: number;
  readonly volumeM3: number;
  readonly temperatureKelvin: number;
}

/**
 * Geometric parameters for directional flux computation.
 */
export interface DirectionalGeometry {
  readonly edgeLengthM: number;
  readonly layerHeightM: number;
  readonly centroidDistanceM: number;
}

/**
 * Net conserved flux transfers calculated across all 6 directional facets.
 */
export interface FacetDeltas {
  dWaterKg: number;
  dCarbonKg: number;
  dMineralsKg: number;
  dOxygenKg: number;
  dEnergyJoules: number;
}

/**
 * Spatial Flux Operator executing conservative, masked advection-diffusion.
 */
export class DirectionalFluxOperator {
  /**
   * Evaluates mutual directional channel admissibility using zero-allocation bitwise arithmetic.
   *
   * @param sourceMask - DirectionBitmask of origin cell (0..63)
   * @param targetMask - DirectionBitmask of neighbor cell (0..63)
   * @param direction - Canonical H3DirectionIndex [0..5]
   * @returns boolean true if both sides of the facet permit transport
   */
  public static isChannelPermeable(
    sourceMask: number,
    targetMask: number,
    direction: 0 | 1 | 2 | 3 | 4 | 5
  ): boolean {
    const forwardOpen = (sourceMask & (1 << direction)) !== 0;
    const oppositeDir = (direction + 3) % 6;
    const backwardOpen = (targetMask & (1 << oppositeDir)) !== 0;
    return forwardOpen && backwardOpen;
  }

  /**
   * Computes conservative mass and energy transfers between cell i and cell j across edge d.
   */
  public static computeEdgeTransfer(
    stateI: CellStockTensor,
    stateJ: CellStockTensor,
    sourceMask: number,
    targetMask: number,
    direction: 0 | 1 | 2 | 3 | 4 | 5,
    normalVelocityMps: number,
    diffusionCoeffM2ps: number,
    thermalConductivityWpmK: number,
    geometry: DirectionalGeometry,
    dtSeconds: number
  ): FacetDeltas {
    // 1. Bitwise channel gating (Zero allocations)
    if (!this.isChannelPermeable(sourceMask, targetMask, direction)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0,
      };
    }

    const facetArea = geometry.edgeLengthM * geometry.layerHeightM;
    const invDx = 1.0 / geometry.centroidDistanceM;

    // 2. Upwind concentration determination
    const isForward = normalVelocityMps >= 0;
    const cW = isForward ? stateI.waterKg / stateI.volumeM3 : stateJ.waterKg / stateJ.volumeM3;
    const cC = isForward ? stateI.carbonKg / stateI.volumeM3 : stateJ.carbonKg / stateJ.volumeM3;
    const cM = isForward ? stateI.mineralsKg / stateI.volumeM3 : stateJ.mineralsKg / stateJ.volumeM3;
    const cO = isForward ? stateI.oxygenKg / stateI.volumeM3 : stateJ.oxygenKg / stateJ.volumeM3;
    const cU = isForward ? stateI.internalEnergyJoules / stateI.volumeM3 : stateJ.internalEnergyJoules / stateJ.volumeM3;

    // 3. Advective flux components [mass/energy per second]
    const advVolRate = normalVelocityMps * facetArea;
    const advW = advVolRate * cW;
    const advC = advVolRate * cC;
    const advM = advVolRate * cM;
    const advO = advVolRate * cO;
    const advU = advVolRate * cU;

    // 4. Diffusive flux components
    const diffW = -diffusionCoeffM2ps * facetArea * ((stateJ.waterKg / stateJ.volumeM3) - (stateI.waterKg / stateI.volumeM3)) * invDx;
    const diffC = -diffusionCoeffM2ps * facetArea * ((stateCConc(stateJ)) - (stateCConc(stateI))) * invDx;
    const diffM = -diffusionCoeffM2ps * facetArea * ((stateMConc(stateJ)) - (stateMConc(stateI))) * invDx;
    const diffO = -diffusionCoeffM2ps * facetArea * ((stateOConc(stateJ)) - (stateOConc(stateI))) * invDx;
    const condU = -thermalConductivityWpmK * facetArea * (stateJ.temperatureKelvin - stateI.temperatureKelvin) * invDx;

    // 5. Total integrated deltas
    return {
      dWaterKg: (advW + diffW) * dtSeconds,
      dCarbonKg: (advC + diffC) * dtSeconds,
      dMineralsKg: (advM + diffM) * dtSeconds,
      dOxygenKg: (advO + diffO) * dtSeconds,
      dEnergyJoules: (advU + condU) * dtSeconds,
    };
  }
}

function stateCConc(s: CellStockTensor): number { return s.carbonKg / s.volumeM3; }
function stateMConc(s: CellStockTensor): number { return s.mineralsKg / s.volumeM3; }
function stateOConc(s: CellStockTensor): number { return s.oxygenKg / s.volumeM3; }
```

---

## 5. Topological Barrier Invariants & Audit Checklist

1. **Mass Neutrality Guarantee:**
   $$\sum_{c \in \mathcal{H}} \Delta M_{k, c} \equiv 0 \quad (\pm 10^{-15} \text{ kg machine precision error limit})$$
   Enforced by using exact anti-symmetric pairing $\Delta X(i \to j) = -\Delta X(j \to i)$ across permeable facets.

2. **Permeability Bitmask Orthogonality:**
   Each of the 6 bits in `DirectionBitmask` represents an isolated, linearly independent direction vector:
   $$\text{popcount}(\mathcal{B}) = \sum_{d=0}^5 \frac{\mathcal{B} \ \& \ (1 \ll d)}{1 \ll d} \in [0, 6]$$
   - $\text{popcount} = 0$: Completely isolated cell (insular basin, bedrock barrier).
   - $\text{popcount} = 6$: Unconstrained fluid/trophic transport in isotropic porous medium.

3. **Inversion Symmetry:**
   $$\text{invertMask}(\mathcal{B}) = \bigvee_{d=0}^5 \left( (\mathcal{B} \ \& \ 2^d) \ne 0 \implies 2^{(d+3) \bmod 6} \right)$$
   Guarantees that reflection transformations preserve total channel connectivity without edge phase drift.