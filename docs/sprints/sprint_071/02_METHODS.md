# Sprint 071: Boundary Manifold Process Specifications & Thermodynamic Flux Deltas

## 1. Physical, Biogeochemical & Boundary Transport Mechanics

The discrete global grid system (DGGS) decomposes continuous planetary envelopes into discrete hexagonal/pentagonal finite volumes. To prevent non-physical mass leaks or artificial energy sinks at cell interfaces, trans-boundary advection and diffusion must be evaluated over strictly matched, coincident 3D boundary vertex pairs.

### 1.1 Differential Geometry of the Coincident Edge Interface

Let $C_A$ and $C_B$ be adjacent topological cells in $\mathbb{R}^3$ with centroid vectors $\mathbf{c}_A, \mathbf{c}_B \in \mathbb{R}^3$ and outward radial normals $\hat{\mathbf{n}}_A = \frac{\mathbf{c}_A}{\|\mathbf{c}_A\|_2}$, $\hat{\mathbf{n}}_B = \frac{\mathbf{c}_B}{\|\mathbf{c}_B\|_2}$.
Let discrete boundary vertex sets be $\mathcal{V}_A = \{ \mathbf{p}_0^A, \dots, \mathbf{p}_{n-1}^A \}$ and $\mathcal{V}_B = \{ \mathbf{q}_0^B, \dots, \mathbf{q}_{m-1}^B \}$.

Coincident vertex pairs are identified when Euclidean distance satisfies:
$$\mathcal{P} = \left\{ (i, j) \;\middle|\; \|\mathbf{p}_i^A - \mathbf{q}_j^B\|_2 \le \epsilon_{\text{geom}} \right\}$$
For topologically adjacent hexagonal/pentagonal cells, $|\mathcal{P}| = 2$, yielding index pairs $(i_1, j_1)$ and $(i_2, j_2)$.

#### Edge Metric Quantities
1. **Symmetric Coincident Edge Segment Endpoints**:
   $$\mathbf{v}_1 = \frac{1}{2}\left( \mathbf{p}_{i_1}^A + \mathbf{q}_{j_1}^B \right), \quad \mathbf{v}_2 = \frac{1}{2}\left( \mathbf{p}_{i_2}^A + \mathbf{q}_{j_2}^B \right)$$
2. **Interface Edge Vector & Length**:
   $$\mathbf{e}_{AB} = \mathbf{v}_2 - \mathbf{v}_1, \quad L_{AB} = \|\mathbf{e}_{AB}\|_2$$
3. **Interface Contact Area**:
   $$A_{AB} = L_{AB} \cdot h_{\text{layer}} \quad [\text{m}^2]$$
   where $h_{\text{layer}}$ is the effective fluid/soil boundary layer thickness $[\text{m}]$.
4. **Interface Midpoint**:
   $$\mathbf{m}_{AB} = \frac{1}{2}(\mathbf{v}_1 + \mathbf{v}_2)$$
5. **Trans-Boundary Outward Unit Normal Directed $A \to B$**:
   $$\mathbf{t}_{AB} = \mathbf{e}_{AB} \times \hat{\mathbf{n}}_A, \quad \hat{\mathbf{n}}_{AB} = \frac{\mathbf{t}_{AB}}{\|\mathbf{t}_{AB}\|_2} \cdot \operatorname{sgn}\left( \mathbf{t}_{AB} \cdot (\mathbf{c}_B - \mathbf{c}_A) \right)$$
6. **Centroid-to-Centroid Diffusion Distance**:
   $$d_{AB} = \|\mathbf{c}_B - \mathbf{c}_A\|_2 \quad [\text{m}]$$

---

## 2. Formalized Mass & Energy Transfer Dynamics

Across interface $A_{AB}$, exchange occurs via two coupled regimes:
1. **Fickian / Fourier Diffusion** (concentration and temperature gradients)
2. **Kinematic Advection** (bulk velocity field $\mathbf{u}_{AB}$ projected onto normal $\hat{\mathbf{n}}_{AB}$)

### 2.1 Advective Boundary Flux

Let $u_n = \mathbf{u} \cdot \hat{\mathbf{n}}_{AB}$ be the normal advection velocity $[\text{m}\cdot\text{s}^{-1}]$ at midpoint $\mathbf{m}_{AB}$.
Using upwind discretization:
$$\phi^*_{AB} = \begin{cases}
\phi_A, & u_n \ge 0 \\
\phi_B, & u_n < 0
\end{cases}$$
where $\phi \in \{ \rho_{\text{water}}, C_{\text{DIC}}, C_{\text{mineral}}, C_{\text{oxygen}}, \rho c_p T \}$ is the intensive volumetric stock density.

### 2.2 Diffusive Boundary Flux

By Fick's first law and Fourier's law of heat conduction:
$$J_{i, \text{diff}} = -D_i \cdot \frac{\phi_{i, B} - \phi_{i, A}}{d_{AB}} \quad [\text{kg}\cdot\text{m}^{-2}\cdot\text{s}^{-1} \text{ or } \text{J}\cdot\text{m}^{-2}\cdot\text{s}^{-1}]$$
where $D_i$ is the empirical diffusion coefficient:
- Water hydraulic diffusivity: $D_w \; [\text{m}^2\cdot\text{s}^{-1}]$
- Carbon / mineral solutes: $D_c, D_m \; [\text{m}^2\cdot\text{s}^{-1}]$
- Dissolved oxygen: $D_{o} \; [\text{m}^2\cdot\text{s}^{-1}]$
- Thermal conductivity: $k_{\text{th}} \; [\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}]$ (thermal diffusivity $\alpha = \frac{k_{\text{th}}}{\rho c_p}$)

### 2.3 Integrated Boundary Transfer Rates

Total rate of transport of stock $k$ across interface $A \to B$:
$$\dot{\Phi}_{k, AB} = A_{AB} \left( u_n \phi^*_{k, AB} - D_k \frac{\phi_{k, B} - \phi_{k, A}}{d_{AB}} \right)$$

---

## 3. Exact Mass & Enthalpy Deltas per Step $\Delta t$

For discrete time interval $\Delta t$:

| Stock Quantity | Symbol | Delta $\Delta S_A$ (Cell A) | Delta $\Delta S_B$ (Cell B) | Units |
| :--- | :--- | :--- | :--- | :--- |
| **Water Mass** | $M_w$ | $-\dot{\Phi}_{w, AB} \Delta t$ | $+\dot{\Phi}_{w, AB} \Delta t$ | $\text{kg}$ |
| **Carbon Mass (DIC/SOC)** | $M_c$ | $-\dot{\Phi}_{c, AB} \Delta t$ | $+\dot{\Phi}_{c, AB} \Delta t$ | $\text{kg C}$ |
| **Mineral Mass ($N, P$)** | $M_m$ | $-\dot{\Phi}_{m, AB} \Delta t$ | $+\dot{\Phi}_{m, AB} \Delta t$ | $\text{kg}$ |
| **Oxygen Mass ($O_2$)** | $M_o$ | $-\dot{\Phi}_{o, AB} \Delta t$ | $+\dot{\Phi}_{o, AB} \Delta t$ | $\text{kg } O_2$ |
| **Thermal Enthalpy** | $H$ | $-\dot{\Phi}_{H, AB} \Delta t$ | $+\dot{\Phi}_{H, AB} \Delta t$ | $\text{J}$ |

### 3.1 First Law Verification (Conservation Invariant)
For all state variables $k \in \{ M_w, M_c, M_m, M_o, H \}$:
$$\Delta S_{k, A} + \Delta S_{k, B} = -\dot{\Phi}_{k, AB} \Delta t + \dot{\Phi}_{k, AB} \Delta t = 0$$
$$\sum_{\text{cells}} \Delta S_k = 0 \quad \text{(Closed manifold invariant, machine precision } < 10^{-15}\text{)}.$$

### 3.2 Second Law Verification (Entropy Non-Negativity)
For purely diffusive thermal contact between cells at temperatures $T_A, T_B > 0$:
$$\dot{S}_{\text{gen}} = \dot{\Phi}_{H, \text{diff}} \left( \frac{1}{T_B} - \frac{1}{T_A} \right) = k_{\text{th}} A_{AB} \frac{T_A - T_B}{d_{AB}} \left( \frac{T_A - T_B}{T_A T_B} \right) = \frac{k_{\text{th}} A_{AB} (T_A - T_B)^2}{d_{AB} T_A T_B} \ge 0$$
Because $A_{AB} = L_{AB} \cdot h_{\text{layer}} > 0$, $d_{AB} > 0$, and $(T_A - T_B)^2 \ge 0$, local boundary entropy generation is strictly non-negative:
$$\dot{S}_{\text{gen}} \ge 0 \quad \forall (T_A, T_B) \in \mathbb{R}_{>0}^2.$$

---

## 4. Discrete Vector Pair Matching Algorithm

```
Algorithm findSharedBoundaryVertexPairs3D(verticesA, verticesB, epsilon):
  Input:
    verticesA: Array of Vector3D [p_0, ..., p_{n-1}], n in {5, 6}
    verticesB: Array of Vector3D [q_0, ..., q_{m-1}], m in {5, 6}
    epsilon: Positive scalar float (default 1e-4)
  Output:
    pairs: Array of BoundaryVertexPair3D

  1. pairs <- []
  2. For i = 0 to length(verticesA) - 1:
       p <- verticesA[i]
       minDist <- infinity
       bestJ <- -1
       For j = 0 to length(verticesB) - 1:
         q <- verticesB[j]
         d <- sqrt((p.x - q.x)^2 + (p.y - q.y)^2 + (p.z - q.z)^2)
         If d < minDist:
           minDist <- d
           bestJ <- j
       If minDist <= epsilon:
         Append to pairs: {
           indexA: i,
           indexB: bestJ,
           vertexA: p,
           vertexB: verticesB[bestJ],
           distance: minDist
         }
  3. Assert length(pairs) <= 2
  4. Return pairs
```

---

## 5. Monadic Boundary Flux Method Specification

```typescript
/**
 * Cell thermodynamic state representation within H3 spatial volume.
 */
export interface CellThermodynamicState {
  readonly h3Index: string;
  readonly centroid: Vector3D;
  readonly volumeM3: number;
  readonly waterKg: number;
  readonly carbonKg: number;
  readonly mineralsKg: number;
  readonly oxygenKg: number;
  readonly enthalpyJoules: number;
  readonly temperatureKelvin: number;
}

/**
 * Net conservative transfer payload across a shared boundary edge.
 */
export interface BoundaryFluxDelta {
  readonly edge: BoundaryEdge3D;
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnthalpyJoules: number;
  readonly entropyProducedJPerK: number;
}

/**
 * Executable boundary flux evaluation monad method.
 */
export function computeBoundaryFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  edge: BoundaryEdge3D,
  layerHeightMeters: number,
  bulkNormalVelocityMs: number,
  diffusionCoeffs: {
    waterDiffusivity: number;      // m^2/s
    carbonDiffusivity: number;     // m^2/s
    mineralDiffusivity: number;    // m^2/s
    oxygenDiffusivity: number;     // m^2/s
    thermalConductivity: number;   // W/(m K)
  },
  deltaSeconds: number
): { nextA: CellThermodynamicState; nextB: CellThermodynamicState; flux: BoundaryFluxDelta } {
  // 1. Boundary area
  const area = edge.edgeLength * layerHeightMeters;

  // 2. Centroid distance
  const dx = stateB.centroid.x - stateA.centroid.x;
  const dy = stateB.centroid.y - stateA.centroid.y;
  const dz = stateB.centroid.z - stateA.centroid.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist <= 0) {
    throw new Error('Collocated or degenerate cell centroids in boundary flux evaluation');
  }

  // 3. Volumetric concentrations
  const cWaterA = stateA.waterKg / stateA.volumeM3;
  const cWaterB = stateB.waterKg / stateB.volumeM3;
  const cCarbonA = stateA.carbonKg / stateA.volumeM3;
  const cCarbonB = stateB.carbonKg / stateB.volumeM3;
  const cMinA = stateA.mineralsKg / stateA.volumeM3;
  const cMinB = stateB.mineralsKg / stateB.volumeM3;
  const cOxA = stateA.oxygenKg / stateA.volumeM3;
  const cOxB = stateB.oxygenKg / stateB.volumeM3;

  // 4. Advective upwind selection
  const un = bulkNormalVelocityMs;
  const upwindWater = un >= 0 ? cWaterA : cWaterB;
  const upwindCarbon = un >= 0 ? cCarbonA : cCarbonB;
  const upwindMin = un >= 0 ? cMinA : cMinB;
  const upwindOx = un >= 0 ? cOxA : cOxB;

  // 5. Flux rates (kg/s)
  const fluxRateWater = area * (un * upwindWater - diffusionCoeffs.waterDiffusivity * (cWaterB - cWaterA) / dist);
  const fluxRateCarbon = area * (un * upwindCarbon - diffusionCoeffs.carbonDiffusivity * (cCarbonB - cCarbonA) / dist);
  const fluxRateMin = area * (un * upwindMin - diffusionCoeffs.mineralDiffusivity * (cMinB - cMinA) / dist);
  const fluxRateOx = area * (un * upwindOx - diffusionCoeffs.oxygenDiffusivity * (cOxB - cOxA) / dist);

  // 6. Thermal conduction and advective enthalpy (J/s)
  const volHeatCapA = stateA.enthalpyJoules / stateA.volumeM3;
  const volHeatCapB = stateB.enthalpyJoules / stateB.volumeM3;
  const upwindHeatCap = un >= 0 ? volHeatCapA : volHeatCapB;
  const conductiveHeatFlux = -diffusionCoeffs.thermalConductivity * area * (stateB.temperatureKelvin - stateA.temperatureKelvin) / dist;
  const fluxRateEnthalpy = area * un * upwindHeatCap + conductiveHeatFlux;

  // 7. Entropy production (J/K per second)
  const tA = stateA.temperatureKelvin;
  const tB = stateB.temperatureKelvin;
  const entropyRateThermal = conductiveHeatFlux * (1.0 / tB - 1.0 / tA); // >= 0
  const entropyProduced = Math.max(0, entropyRateThermal * deltaSeconds);

  // 8. Integrate over deltaSeconds
  const dWater = fluxRateWater * deltaSeconds;
  const dCarbon = fluxRateCarbon * deltaSeconds;
  const dMin = fluxRateMin * deltaSeconds;
  const dOx = fluxRateOx * deltaSeconds;
  const dEnthalpy = fluxRateEnthalpy * deltaSeconds;

  // 9. Conserved state updates
  const nextA: CellThermodynamicState = {
    ...stateA,
    waterKg: stateA.waterKg - dWater,
    carbonKg: stateA.carbonKg - dCarbon,
    mineralsKg: stateA.mineralsKg - dMin,
    oxygenKg: stateA.oxygenKg - dOx,
    enthalpyJoules: stateA.enthalpyJoules - dEnthalpy,
    temperatureKelvin: Math.max(0.1, stateA.temperatureKelvin - (dEnthalpy / (stateA.volumeM3 * 4.184e6)))
  };

  const nextB: CellThermodynamicState = {
    ...stateB,
    waterKg: stateB.waterKg + dWater,
    carbonKg: stateB.carbonKg + dCarbon,
    mineralsKg: stateB.mineralsKg + dMin,
    oxygenKg: stateB.oxygenKg + dOx,
    enthalpyJoules: stateB.enthalpyJoules + dEnthalpy,
    temperatureKelvin: Math.max(0.1, stateB.temperatureKelvin + (dEnthalpy / (stateB.volumeM3 * 4.184e6)))
  };

  const flux: BoundaryFluxDelta = {
    edge,
    deltaWaterKg: dWater,
    deltaCarbonKg: dCarbon,
    deltaMineralsKg: dMin,
    deltaOxygenKg: dOx,
    deltaEnthalpyJoules: dEnthalpy,
    entropyProducedJPerK: entropyProduced
  };

  return { nextA, nextB, flux };
}
```