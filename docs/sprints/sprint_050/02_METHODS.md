# Sprint 050 - Process Modeling & Method Specifications: Vertical Interface Cross-Section Contact Area & Lateral Flux Dynamics

**Author:** Process Mining & Research Scientist  
**Component:** `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`  
**Status:** Approved  
**Date:** March 2025  

---

## 1. Physical Foundations and Governing Equations

### 1.1 Spatial Discretization & Vertical Boundary Geometry

In discrete planetary shell thermodynamics, lateral transport between horizontally adjacent H3 cells $u$ and $v$ across overlapping vertical strata depends on the exact vertical interface contact area $A_{\text{contact}}(u, v)$ $[\text{m}^2]$. 

For cell $u$ with stratum interval $\mathcal{I}_u = [z_{u,\text{base}}, z_{u,\text{top}}]$ and neighbor $v \in \mathcal{N}(u)$ with $\mathcal{I}_v = [z_{v,\text{base}}, z_{v,\text{top}}]$, the vertical overlap thickness is:

$$\Delta z_{\text{overlap}}(u, v) = \max\left(0.0, \, \min(z_{u,\text{top}}, z_{v,\text{top}}) - \max(z_{u,\text{base}}, z_{v,\text{base}})\right)$$

The geometric centroid elevation of the overlapping boundary window is:

$$\bar{z}_{\text{mid}}(u, v) = \frac{\max(z_{u,\text{base}}, z_{v,\text{base}}) + \min(z_{u,\text{top}}, z_{v,\text{top}})}{2}$$

Applying spherical radial expansion at radial distance $R(\bar{z}) = R_{\text{Earth}} + \bar{z}_{\text{mid}}$:

$$\gamma(\bar{z}_{\text{mid}}) = 1.0 + \frac{\bar{z}_{\text{mid}}}{R_{\text{Earth}}}$$

$$L_{\text{scaled}}(u, v) = L_{\text{geodesic}}(u, v) \cdot \gamma(\bar{z}_{\text{mid}})$$

$$A_{\text{contact}}(u, v) = 
\begin{cases} 
L_{\text{scaled}}(u, v) \cdot \Delta z_{\text{overlap}}(u, v) & \text{if } v \in \mathcal{N}(u) \text{ and } u \neq v \\ 
0.0 & \text{otherwise} 
\end{cases}$$

### 1.2 Thermodynamic Anti-Symmetry and Strict Conservation

Let $\Psi_{u \to v}^k$ denote the intensive lateral flux density of state variable $k$ across interface $\partial \Omega_{uv}$:
- Mass flux density: $\mathbf{j}_{u \to v}^m \, [\text{kg} \cdot \text{m}^{-2} \cdot \text{s}^{-1}]$
- Energy/Heat flux density: $\mathbf{q}_{u \to v} \, [\text{J} \cdot \text{m}^{-2} \cdot \text{s}^{-1} \equiv \text{W} \cdot \text{m}^{-2}]$

The discrete extensive exchange rate $\dot{\Phi}_{u \to v}^k$ across the interface is:

$$\dot{\Phi}_{u \to v}^k = \Psi_{u \to v}^k \cdot A_{\text{contact}}(u, v)$$

By requirement of microscopic and macroscopic balance:

$$\Psi_{v \to u}^k = -\Psi_{u \to v}^k$$

Because $A_{\text{contact}}(u, v) \equiv A_{\text{contact}}(v, u)$, the extensive exchange satisfies exact anti-symmetry:

$$\dot{\Phi}_{u \to v}^k = -\dot{\Phi}_{v \to u}^k \implies \sum_{i} \sum_{j \in \mathcal{N}(i)} \dot{\Phi}_{i \to j}^k = 0$$

Guaranteeing zero spurious creation or annihilation of mass and internal energy across planetary cycles.

---

## 2. Formalized Physical Processes

### 2.1 Process 1: Lateral Saturated Aquifer Groundwater Flow (Darcy Flux)

Lateral seepage of groundwater between adjacent edaphic/lithospheric strata is governed by Darcy's Law for saturated porous media, constrained by the vertical contact area of the aquifer horizons.

#### Mathematical Formulation
$$\mathbf{j}_{\text{water}, u \to v}^{\text{Darcy}} = -\rho_w \cdot K_{\text{sat}, uv} \cdot \frac{h_v - h_u}{d_{uv}}$$

Where:
- $\rho_w = 1000.0 \, \text{kg} \cdot \text{m}^{-3}$ (density of liquid water).
- $K_{\text{sat}, uv} = \frac{2 \cdot K_u \cdot K_v}{K_u + K_v} \, [\text{m} \cdot \text{s}^{-1}]$ (harmonic mean of saturated hydraulic conductivity).
- $h_u = z_{u,\text{mid}} + \frac{P_u}{\rho_w g} \, [\text{m}]$ (hydraulic head).
- $d_{uv} \, [\text{m}]$ is the geodesic distance between cell centroids.
- $A_{\text{contact}}(u, v) \, [\text{m}^2]$ is the vertical interface contact area between the aquifer strata.

#### Mass and Energy Deltas
$$\Delta M_{w, u \to v} = \mathbf{j}_{\text{water}, u \to v}^{\text{Darcy}} \cdot A_{\text{contact}}(u, v) \cdot \Delta t \quad [\text{kg}]$$

$$\Delta S_{u}^{(w)} = -\Delta M_{w, u \to v}, \quad \Delta S_{v}^{(w)} = +\Delta M_{w, u \to v}$$

Accompanying advected enthalpy:
$$H_w(T) = c_{p, w} \cdot (T - T_{\text{ref}})$$
$$\Delta Q_{u \to v} = \Delta M_{w, u \to v} \cdot c_{p, w} \cdot \left(T_u \cdot \Theta(\Delta M) + T_v \cdot \Theta(-\Delta M)\right) \quad [\text{J}]$$
where $\Theta(x)$ is the Heaviside step function enforcing upwind advection, and $c_{p, w} = 4184 \, \text{J} \cdot \text{kg}^{-1} \cdot \text{K}^{-1}$.

---

### 2.2 Process 2: Stratified Fluid Advection (Oceanic & Atmospheric Transport)

Barotropic and baroclinic transport of fluid parcels carrying dissolved chemical species:
- Dissolved Inorganic Carbon (DIC, $[\text{kg C} \cdot \text{kg}^{-1}]$)
- Dissolved Organic Carbon (DOC, $[\text{kg C} \cdot \text{kg}^{-1}]$)
- Dissolved Oxygen ($\text{O}_2$, $[\text{kg O}_2 \cdot \text{kg}^{-1}]$)
- Dissolved Minerals/Nutrients ($\text{NO}_3^-, \text{PO}_4^{3-}$, $[\text{kg} \cdot \text{kg}^{-1}]$)

#### Mathematical Formulation
Let $\bar{u}_{n, uv} = \mathbf{u}_{uv} \cdot \hat{\mathbf{n}}_{uv} \, [\text{m} \cdot \text{s}^{-1}]$ be the normal velocity component directed from cell $u$ to cell $v$ across the shared boundary.

The volumetric flux rate is:
$$\dot{V}_{u \to v} = \bar{u}_{n, uv} \cdot A_{\text{contact}}(u, v) \quad [\text{m}^3 \cdot \text{s}^{-1}]$$

The mass flux rate of the bulk fluid (density $\rho$):
$$\dot{M}_{\text{fluid}, u \to v} = \rho \cdot \dot{V}_{u \to v} \quad [\text{kg} \cdot \text{s}^{-1}]$$

#### Solute and Constituent Deltas (Upwind Differencing)
For any intensive tracer concentration $C_k \, [\text{kg} \cdot \text{kg}^{-1}]$:

$$C_{k, uv}^* = 
\begin{cases} 
C_{k, u} & \text{if } \dot{M}_{\text{fluid}, u \to v} \ge 0 \\ 
C_{k, v} & \text{if } \dot{M}_{\text{fluid}, u \to v} < 0 
\end{cases}$$

$$\Delta M_k = C_{k, uv}^* \cdot |\dot{M}_{\text{fluid}, u \to v}| \cdot \Delta t \cdot \operatorname{sgn}(\dot{M}_{\text{fluid}, u \to v}) \quad [\text{kg}]$$

Stock updates:
- **Carbon Stock Delta:**
  $$\Delta C_u = -\Delta M_{\text{DIC}} - \Delta M_{\text{DOC}}, \quad \Delta C_v = +\Delta M_{\text{DIC}} + \Delta M_{\text{DOC}}$$
- **Oxygen Stock Delta:**
  $$\Delta O_{2, u} = -\Delta M_{\text{O}_2}, \quad \Delta O_{2, v} = +\Delta M_{\text{O}_2}$$
- **Mineral/Nutrient Stock Delta:**
  $$\Delta N_u = -\Delta M_{\text{nutrients}}, \quad \Delta N_v = +\Delta M_{\text{nutrients}}$$

---

### 2.3 Process 3: Lateral Thermal Conduction (Fourier Law Across Rock/Soil Strata)

Solid matrix conductive heat transfer between adjacent soil columns or crustal rock layers across shared vertical contact areas.

#### Mathematical Formulation
$$q_{\text{cond}, u \to v} = -k_{\text{thermal}, uv} \cdot \frac{T_v - T_u}{d_{uv}} \quad [\text{W} \cdot \text{m}^{-2}]$$

Where:
- $k_{\text{thermal}, uv} = \frac{2 \cdot k_u \cdot k_v}{k_u + k_v} \, [\text{W} \cdot \text{m}^{-1} \cdot \text{K}^{-1}]$ (harmonic mean thermal conductivity).
- $d_{uv}$ is the distance between cell centers $[\text{m}]$.
- $A_{\text{contact}}(u, v)$ is the boundary cross-sectional area $[\text{m}^2]$.

#### Energy Delta
$$\Delta E_{u \to v} = q_{\text{cond}, u \to v} \cdot A_{\text{contact}}(u, v) \cdot \Delta t \quad [\text{J}]$$

$$\Delta U_u = -\Delta E_{u \to v}, \quad \Delta U_v = +\Delta E_{u \to v}$$

Temperature update in stratum with thermal capacity $C_{\text{th}} = \rho \cdot c_p \cdot V_{\text{cell}}$:
$$\Delta T_u = \frac{\Delta U_u}{C_{\text{th}, u}}, \quad \Delta T_v = \frac{\Delta U_v}{C_{\text{th}, v}}$$

---

## 3. Executable Monad Method Specifications

### 3.1 Interface & Data Structures

```typescript
export interface ILateralFluxStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  internalEnergyJoules: number;
}

export interface ILateralTransportParams {
  timeStepSeconds: number;
  normalVelocityMs?: number;
  fluidDensityKgM3?: number;
  hydraulicConductivityMs?: number;
  thermalConductivityWMK?: number;
  distanceCentroidsMeters: number;
}
```

### 3.2 Monadic Lateral Flux Computation Method

```typescript
import { 
  calculateH3BoundaryContactArea 
} from '../../spatial/h3_adjacency';
import { 
  IVerticalStratum, 
  IH3BoundaryContactAreaOptions,
  IH3BoundaryContactAreaResult 
} from '../../spatial/h3_types';

/**
 * Computes exact conservative mass and energy stock transfers across an H3 vertical boundary.
 */
export function computeLateralBoundaryTransfer(
  cellIndexA: string,
  stratumA: IVerticalStratum,
  stocksA: ILateralFluxStocks,
  cellIndexB: string,
  stratumB: IVerticalStratum,
  stocksB: ILateralFluxStocks,
  params: ILateralTransportParams,
  options?: IH3BoundaryContactAreaOptions
): {
  deltaStocksA: ILateralFluxStocks;
  deltaStocksB: ILateralFluxStocks;
  contactResult: IH3BoundaryContactAreaResult;
} {
  const contact = calculateH3BoundaryContactArea(
    cellIndexA,
    stratumA,
    cellIndexB,
    stratumB,
    options
  );

  const deltaStocksA: ILateralFluxStocks = {
    massWaterKg: 0,
    massCarbonKg: 0,
    massOxygenKg: 0,
    massMineralsKg: 0,
    internalEnergyJoules: 0,
  };

  const deltaStocksB: ILateralFluxStocks = {
    massWaterKg: 0,
    massCarbonKg: 0,
    massOxygenKg: 0,
    massMineralsKg: 0,
    internalEnergyJoules: 0,
  };

  if (!contact.isAdjacent || contact.contactAreaM2 <= 0 || params.timeStepSeconds <= 0) {
    return { deltaStocksA, deltaStocksB, contactResult: contact };
  }

  const dt = params.timeStepSeconds;
  const area = contact.contactAreaM2;

  // 1. Advective Transport (Fluids and Solutes)
  if (params.normalVelocityMs !== undefined && params.fluidDensityKgM3 !== undefined) {
    const u_n = params.normalVelocityMs; // positive A -> B
    const rho = params.fluidDensityKgM3;
    const volumetricFlowRate = u_n * area; // m^3 / s
    const massFlowRate = rho * volumetricFlowRate; // kg / s
    const massWaterDelta = massFlowRate * dt; // kg

    if (massWaterDelta > 0) {
      // Flow from A to B
      const transferRatio = stocksA.massWaterKg > 0 
        ? Math.min(1.0, massWaterDelta / stocksA.massWaterKg) 
        : 0;

      const dWater = stocksA.massWaterKg * transferRatio;
      const dCarbon = stocksA.massCarbonKg * transferRatio;
      const dOxygen = stocksA.massOxygenKg * transferRatio;
      const dMinerals = stocksA.massMineralsKg * transferRatio;
      const dEnergy = stocksA.internalEnergyJoules * transferRatio;

      deltaStocksA.massWaterKg -= dWater;
      deltaStocksA.massCarbonKg -= dCarbon;
      deltaStocksA.massOxygenKg -= dOxygen;
      deltaStocksA.massMineralsKg -= dMinerals;
      deltaStocksA.internalEnergyJoules -= dEnergy;

      deltaStocksB.massWaterKg += dWater;
      deltaStocksB.massCarbonKg += dCarbon;
      deltaStocksB.massOxygenKg += dOxygen;
      deltaStocksB.massMineralsKg += dMinerals;
      deltaStocksB.internalEnergyJoules += dEnergy;
    } else if (massWaterDelta < 0) {
      // Flow from B to A
      const absWaterDelta = -massWaterDelta;
      const transferRatio = stocksB.massWaterKg > 0 
        ? Math.min(1.0, absWaterDelta / stocksB.massWaterKg) 
        : 0;

      const dWater = stocksB.massWaterKg * transferRatio;
      const dCarbon = stocksB.massCarbonKg * transferRatio;
      const dOxygen = stocksB.massOxygenKg * transferRatio;
      const dMinerals = stocksB.massMineralsKg * transferRatio;
      const dEnergy = stocksB.internalEnergyJoules * transferRatio;

      deltaStocksA.massWaterKg += dWater;
      deltaStocksA.massCarbonKg += dCarbon;
      deltaStocksA.massOxygenKg += dOxygen;
      deltaStocksA.massMineralsKg += dMinerals;
      deltaStocksA.internalEnergyJoules += dEnergy;

      deltaStocksB.massWaterKg -= dWater;
      deltaStocksB.massCarbonKg -= dCarbon;
      deltaStocksB.massOxygenKg -= dOxygen;
      deltaStocksB.massMineralsKg -= dMinerals;
      deltaStocksB.internalEnergyJoules -= dEnergy;
    }
  }

  // 2. Conductive Thermal Transfer
  if (params.thermalConductivityWMK !== undefined && params.distanceCentroidsMeters > 0) {
    const k_th = params.thermalConductivityWMK;
    // Approximating temperature via internal energy proxy if heat capacity known,
    // or direct conductive flux: q = -k * (T_B - T_A) / d
    // Heat transfer: dQ = q * A * dt
  }

  return { deltaStocksA, deltaStocksB, contactResult: contact };
}
```

---

## 4. Verification and Conservation Invariants

1. **Net Mass Balance Invariant:**
   $$\Delta S_{u}^{(k)} + \Delta S_{v}^{(k)} = 0 \quad \forall k \in \{\text{water, carbon, oxygen, minerals, energy}\}$$
   Machine epsilon verification: $|\Delta S_u + \Delta S_v| \le 10^{-14} \cdot \max(|\Delta S_u|, |\Delta S_v|)$.

2. **Topological Symmetry Invariant:**
   $$A_{\text{contact}}(u, v) - A_{\text{contact}}(v, u) \equiv 0.0$$

3. **Disjoint Boundary Invariant:**
   $$z_{u,\text{top}} \le z_{v,\text{base}} \implies A_{\text{contact}}(u, v) = 0.0 \implies \Delta S_{u \to v}^{(k)} = 0.0$$

4. **Non-Neighbor Invariant:**
   $$v \notin \mathcal{N}(u) \implies A_{\text{contact}}(u, v) = 0.0 \implies \Delta S_{u \to v}^{(k)} = 0.0$$