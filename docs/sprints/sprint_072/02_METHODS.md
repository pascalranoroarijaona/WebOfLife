# Process Methods & Physical Kinetics Specification: Sprint 072
**RFC Reference:** RFC-072: Centroid-Relative Ordering and Outward-Normal Orientation of Shared Cell Boundaries  
**Domain:** Computational Biogeochemistry, Discrete Differential Geometry, Finite-Volume Hydrodynamics, and Non-Equilibrium Thermodynamics  

---

## 1. Physical and Biogeochemical Process Foundations

In discrete global grid systems (DGGS) using hierarchical hexagonal tessellations (H3), state variable divergence across topological boundaries is governed by the discrete divergence theorem:

$$\int_{\Omega_i} \nabla \cdot \mathbf{F}_k \, d\Omega = \oint_{\partial \Omega_i} \mathbf{F}_k \cdot \hat{\mathbf{n}} \, d\ell \approx \sum_{j \in \mathcal{N}(i)} \Phi_k(i \to j) \, L_{ij}$$

where:
- $\Omega_i$ is the area of hexagonal cell $c_i$ ($m^2$).
- $\partial \Omega_i$ is the perimeter bounding $c_i$ ($m$).
- $\mathcal{N}(i)$ is the index set of direct topological neighbors sharing an edge with $c_i$.
- $L_{ij} = \|\Gamma_{ij}\|$ is the metric length of the shared boundary $\Gamma_{ij} = \partial \Omega_i \cap \partial \Omega_j$ ($m$).
- $\hat{\mathbf{n}}_{i \to j}$ is the outward unit normal vector pointing strictly from the interior of $c_i$ toward $c_j$.
- $\Phi_k(i \to j)$ is the boundary-normal flux density of conserved quantity $k$ across $\Gamma_{ij}$.

### 1.1 State Stock Vector $\mathbf{U}(c_i)$

Each cell $c_i$ maintains an extensive stock vector $\mathbf{U}(c_i) \in \mathbb{R}^5_{\ge 0}$:

$$\mathbf{U}(c_i) = \begin{bmatrix} U_H(c_i) \\ U_W(c_i) \\ U_C(c_i) \\ U_O(c_i) \\ U_M(c_i) \end{bmatrix} = \begin{bmatrix} \text{Sensible Thermal Energy} & [\text{J}] \\ \text{Total Water Mass} & [\text{kg}] \\ \text{Conserved Carbon Mass} & [\text{kg C}] \\ \text{Dissolved Oxygen Mass} & [\text{kg } \text{O}_2] \\ \text{Active Nutrient/Mineral Mass} & [\text{kg } \text{P/N}] \end{bmatrix}$$

Intensive thermodynamic potentials and concentrations in $c_i$ are given by:
- Mean temperature: $T_i = \frac{U_H(c_i)}{C_{p, \text{eff}} \cdot M_{\text{cell}}(c_i)}$ $[\text{K}]$, with effective specific heat capacity $C_{p, \text{eff}} \approx 4184 \, \text{J} \cdot \text{kg}^{-1} \cdot \text{K}^{-1}$ for water-dominated biomes.
- Hydraulic head / water surface elevation: $h_i = z_{\text{bed}, i} + \frac{U_W(c_i)}{\rho_w \cdot A_{\text{cell}}}$ $[\text{m}]$, with $\rho_w = 1000 \, \text{kg} \cdot \text{m}^{-3}$.
- Carbon concentration: $C_i = \frac{U_C(c_i)}{V_i}$ $[\text{kg C} \cdot \text{m}^{-3}]$.
- Oxygen concentration: $[O_2]_i = \frac{U_O(c_i)}{V_i}$ $[\text{kg } \text{O}_2 \cdot \text{m}^{-3}]$.
- Mineral concentration: $M_i = \frac{U_M(c_i)}{V_i}$ $[\text{kg M} \cdot \text{m}^{-3}]$.

---

## 2. Mathematical Formalization of Edge Orientation

### 2.1 2D Tangent Plane Formulation

Let $c_A$ and $c_B$ be adjacent cells with centroids $\mathbf{c}_A = (x_A, y_A)$ and $\mathbf{c}_B = (x_B, y_B)$.
The shared edge consists of two unordered topological vertices $\mathbf{p}_1 = (x_1, y_1)$ and $\mathbf{p}_2 = (x_2, y_2)$.

1. **Candidate Edge Vector:**
   $$\mathbf{t} = \mathbf{p}_2 - \mathbf{p}_1 = (\Delta x, \Delta y) = (x_2 - x_1, y_2 - y_1)$$
   $$\|\mathbf{t}\| = \sqrt{(\Delta x)^2 + (\Delta y)^2}$$

2. **Right-Hand Outward Normal Candidate:**
   Traversing the segment $\mathbf{p}_1 \to \mathbf{p}_2$ in a counter-clockwise boundary loop, the right-hand orthogonal normal pointing outward into the adjacent space is:
   $$\mathbf{n}_{\text{cand}} = (\Delta y, -\Delta x)$$
   $$\hat{\mathbf{n}}_{\text{cand}} = \frac{1}{\|\mathbf{t}\|} (\Delta y, -\Delta x)$$

3. **Centroid Displacement Vector:**
   $$\mathbf{d}_{AB} = \mathbf{c}_B - \mathbf{c}_A = (x_B - x_A, y_B - y_A)$$

4. **Orientation Invariant Test:**
   The scalar orientation indicator $Q$ evaluates the directional alignment:
   $$Q = \hat{\mathbf{n}}_{\text{cand}} \cdot \mathbf{d}_{AB} = \frac{\Delta y (x_B - x_A) - \Delta x (y_B - y_A)}{\|\mathbf{t}\|}$$

   - **Case $Q > 0$:** The candidate tangent $\mathbf{p}_1 \to \mathbf{p}_2$ yields an outward normal pointing into $c_B$.
     $$V_{\text{start}} = \mathbf{p}_1, \quad V_{\text{end}} = \mathbf{p}_2, \quad \hat{\mathbf{n}}_{A \to B} = \hat{\mathbf{n}}_{\text{cand}}, \quad \text{isFlipped} = \text{false}$$
   - **Case $Q < 0$:** The endpoints must be inverted to reverse the outward normal:
     $$V_{\text{start}} = \mathbf{p}_2, \quad V_{\text{end}} = \mathbf{p}_1, \quad \hat{\mathbf{n}}_{A \to B} = -\hat{\mathbf{n}}_{\text{cand}}, \quad \text{isFlipped} = \text{true}$$
   - **Case $|Q| < \epsilon$ ($10^{-12}$ collinear degeneracy):** Fallback to lexicographical tie-break:
     If $(x_1 < x_2) \lor (x_1 = x_2 \land y_1 < y_2)$, keep $(\mathbf{p}_1, \mathbf{p}_2)$, else flip.

### 2.2 3D Spherical Manifold Formulation ($S^2 \subset \mathbb{R}^3$)

For global spherical coordinates, centroids $\mathbf{C}_A, \mathbf{C}_B \in S^2$ and vertices $\mathbf{P}_1, \mathbf{P}_2 \in S^2$ satisfy $\|\mathbf{C}\| = \|\mathbf{P}\| = 1$.

1. **Midpoint Normalization:**
   $$\mathbf{M}_{AB} = \frac{\mathbf{P}_1 + \mathbf{P}_2}{\|\mathbf{P}_1 + \mathbf{P}_2\|}$$

2. **Candidate Chord Tangent:**
   $$\mathbf{t} = \mathbf{P}_2 - \mathbf{P}_1$$

3. **Tangent-Plane Outward Normal:**
   On the spherical tangent plane at $\mathbf{M}_{AB}$, the outward vector perpendicular to $\mathbf{t}$ and tangent to the sphere is:
   $$\mathbf{n}_{\text{3D}} = \mathbf{t} \times \mathbf{M}_{AB}$$
   $$\hat{\mathbf{n}}_{3\text{D}} = \frac{\mathbf{n}_{\text{3D}}}{\|\mathbf{n}_{\text{3D}}\|}$$

4. **Centroid Chord Vector:**
   $$\mathbf{d}_{AB} = \mathbf{C}_B - \mathbf{C}_A$$

5. **Spherical Triple Product Orientation Test:**
   $$\Theta = \hat{\mathbf{n}}_{3\text{D}} \cdot \mathbf{d}_{AB} = \frac{(\mathbf{t} \times \mathbf{M}_{AB}) \cdot (\mathbf{C}_B - \mathbf{C}_A)}{\|\mathbf{t} \times \mathbf{M}_{AB}\|}$$

   - **Case $\Theta > 0$:** $(V_{\text{start}}, V_{\text{end}}) = (\mathbf{P}_1, \mathbf{P}_2)$ and $\hat{\mathbf{n}}_{A \to B} = \hat{\mathbf{n}}_{3\text{D}}$.
   - **Case $\Theta < 0$:** $(V_{\text{start}}, V_{\text{end}}) = (\mathbf{P}_2, \mathbf{P}_1)$ and $\hat{\mathbf{n}}_{A \to B} = -\hat{\mathbf{n}}_{3\text{D}}$.

---

## 3. Kinetic Transfer Equations Across Oriented Interface $\Gamma_{AB}$

Given the canonical outward normal $\hat{\mathbf{n}}_{A \to B}$, edge length $L_{AB}$, and cell centroid distance $D_{AB} = \|\mathbf{c}_B - \mathbf{c}_A\|$:

### 3.1 Process 1: Conductive / Diffusive Thermal Heat Exchange
Governed by discrete Fourier Conduction across $\Gamma_{AB}$:

$$\Phi_H(c_A \to c_B) = -k_{\text{th}} \frac{T_B - T_A}{D_{AB}} \left[\text{W} \cdot \text{m}^{-2} = \text{J} \cdot \text{s}^{-1} \cdot \text{m}^{-2}\right]$$

Entropy production rate per interface:

$$\dot{\sigma}_{AB} = \Phi_H(c_A \to c_B) \cdot L_{AB} \cdot \left(\frac{1}{T_B} - \frac{1}{T_A}\right) = k_{\text{th}} L_{AB} \frac{(T_B - T_A)^2}{D_{AB} T_A T_B} \ge 0 \quad \left[\text{W} \cdot \text{K}^{-1}\right]$$

Strict non-negativity guarantees compliance with the Second Law of Thermodynamics.

### 3.2 Process 2: Hydrodynamic Advection (Water Mass Transport)
Driven by the hydraulic gradient and ambient velocity field $\mathbf{v}_{AB} = (u, v)$:

$$v_{n} = \mathbf{v}_{AB} \cdot \hat{\mathbf{n}}_{A \to B} - K_{\text{hyd}} \frac{h_B - h_A}{D_{AB}} \quad \left[\text{m} \cdot \text{s}^{-1}\right]$$

Upwind concentration formulation for stable numerical flux:

$$\Phi_W(c_A \to c_B) = \begin{cases} 
\rho_w v_n \cdot \min(h_A - z_{\text{bed}, A}, \, d_{\max}), & \text{if } v_n \ge 0 \\
\rho_w v_n \cdot \min(h_B - z_{\text{bed}, B}, \, d_{\max}), & \text{if } v_n < 0
\end{cases} \quad \left[\text{kg} \cdot \text{m}^{-1} \cdot \text{s}^{-1}\right]$$

### 3.3 Process 3: Dissolved Carbon Advection-Diffusion (DIC & DOC)
Total boundary carbon flux incorporates passive advection and Fickian diffusion:

$$\Phi_C(c_A \to c_B) = \left(v_n C_{\text{upwind}} - D_C \frac{C_B - C_A}{D_{AB}}\right) \quad \left[\text{kg C} \cdot \text{m}^{-2} \cdot \text{s}^{-1}\right]$$

where:
$$C_{\text{upwind}} = \begin{cases} C_A, & v_n \ge 0 \\ C_B, & v_n < 0 \end{cases}$$

### 3.4 Process 4: Dissolved Oxygen Flux
Dissolved oxygen across the interface accounts for water exchange and concentration gradients:

$$\Phi_O(c_A \to c_B) = \left(v_n [O_2]_{\text{upwind}} - D_O \frac{[O_2]_B - [O_2]_A}{D_{AB}}\right) \quad \left[\text{kg } \text{O}_2 \cdot \text{m}^{-2} \cdot \text{s}^{-1}\right]$$

### 3.5 Process 5: Mineral Nutrient Flux (Phosphate / Nitrate)

$$\Phi_M(c_A \to c_B) = \left(v_n M_{\text{upwind}} - D_M \frac{M_B - M_A}{D_{AB}}\right) \quad \left[\text{kg M} \cdot \text{m}^{-2} \cdot \text{s}^{-1}\right]$$

---

## 4. Exact Mass-Energy Delta Balance Equations

For integration time step $\Delta t$ [s], the discrete mass and energy transfers between cell $c_A$ and $c_B$ across oriented boundary $\Gamma_{AB}$ are computed as:

$$\Delta \mathbf{U}_{AB} = \begin{bmatrix} 
\Delta U_H \\
\Delta U_W \\
\Delta U_C \\
\Delta U_O \\
\Delta U_M 
\end{bmatrix}_{AB} = \begin{bmatrix}
\Phi_H(c_A \to c_B) \\
\Phi_W(c_A \to c_B) \\
\Phi_C(c_A \to c_B) \\
\Phi_O(c_A \to c_B) \\
\Phi_M(c_A \to c_B)
\end{bmatrix} \cdot L_{AB} \cdot \Delta t$$

### 4.1 Stock Transfer Rules (The First Law Invariant)

For source cell $c_A$:
$$\mathbf{U}(c_A, t + \Delta t) = \mathbf{U}(c_A, t) - \Delta \mathbf{U}_{AB}$$

For neighbor cell $c_B$:
$$\mathbf{U}(c_B, t + \Delta t) = \mathbf{U}(c_B, t) + \Delta \mathbf{U}_{AB}$$

### 4.2 Skew-Symmetry Verification

When evaluated from cell $c_B$ toward $c_A$, the boundary orientation produces:
$$\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$$
$$v_{n}(B \to A) = -v_n(A \to B)$$
$$\frac{T_A - T_B}{D_{BA}} = -\frac{T_B - T_A}{D_{AB}}$$

Consequently:
$$\Phi_k(c_B \to c_A) = -\Phi_k(c_A \to c_B) \quad \forall k \in \{H, W, C, O, M\}$$
$$\Delta \mathbf{U}_{BA} = -\Delta \mathbf{U}_{AB}$$
$$\Delta \mathbf{U}_{AB} + \Delta \mathbf{U}_{BA} = \mathbf{0}$$

Net mass and energy creation across the manifold edge is identically zero, satisfying the First Law of Thermodynamics.

---

## 5. Executable Monad Method Specification

```typescript
/**
 * Spatial Boundary Monadic Transition Interface
 */
export interface BoundaryFluxState {
  readonly thermalEnergyJoules: number;
  readonly waterMassKg: number;
  readonly carbonMassKg: number;
  readonly oxygenMassKg: number;
  readonly mineralMassKg: number;
}

export interface FluxTransferDeltas {
  readonly deltaThermalJoules: number;
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaMineralKg: number;
}

export interface OrientedEdgeTransfer {
  readonly sourceCell: string;
  readonly targetCell: string;
  readonly outwardNormal: [number, number];
  readonly edgeLengthMeters: number;
  readonly deltas: FluxTransferDeltas;
}

/**
 * Pure monad operator evaluating oriented edge fluxes between cell A and cell B.
 */
export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  centroidA: [number, number],
  centroidB: [number, number],
  vertex1: [number, number],
  vertex2: [number, number],
  dtSeconds: number,
  diffusionCoeffs: {
    thermalK: number;
    waterConductivity: number;
    carbonDiffusivity: number;
    oxygenDiffusivity: number;
    mineralDiffusivity: number;
  },
  advectionVelocity: [number, number] = [0, 0]
): OrientedEdgeTransfer {
  // 1. Compute oriented edge geometry
  const oriented = orderSharedBoundaryEndpointsByCentroid(
    vertex1,
    vertex2,
    centroidA,
    centroidB
  );

  const [nx, ny] = oriented.outwardNormal;
  const edgeLen = oriented.length;

  // 2. Centroid displacement distance
  const dx = centroidB[0] - centroidA[0];
  const dy = centroidB[1] - centroidA[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-12) {
    throw new Error('Degenerate centroids: Cell A and Cell B are coincident.');
  }

  // 3. Normal velocity
  const [vx, vy] = advectionVelocity;
  const vNormal = vx * nx + vy * ny;

  // 4. Heat conduction (Fourier)
  const dTemp = (stateB.thermalEnergyJoules - stateA.thermalEnergyJoules) / 4184.0;
  const phiThermal = -diffusionCoeffs.thermalK * (dTemp / dist);

  // 5. Water hydraulic transport (Upwind advection + head diffusion)
  const dWater = stateB.waterMassKg - stateA.waterMassKg;
  const upwindWater = vNormal >= 0 ? stateA.waterMassKg : stateB.waterMassKg;
  const phiWater = vNormal * upwindWater - diffusionCoeffs.waterConductivity * (dWater / dist);

  // 6. Carbon transport
  const dCarbon = stateB.carbonMassKg - stateA.carbonMassKg;
  const upwindCarbon = vNormal >= 0 ? stateA.carbonMassKg : stateB.carbonMassKg;
  const phiCarbon = vNormal * upwindCarbon - diffusionCoeffs.carbonDiffusivity * (dCarbon / dist);

  // 7. Oxygen transport
  const dOxygen = stateB.oxygenMassKg - stateA.oxygenMassKg;
  const upwindOxygen = vNormal >= 0 ? stateA.oxygenMassKg : stateB.oxygenMassKg;
  const phiOxygen = vNormal * upwindOxygen - diffusionCoeffs.oxygenDiffusivity * (dOxygen / dist);

  // 8. Mineral transport
  const dMineral = stateB.mineralMassKg - stateA.mineralMassKg;
  const upwindMineral = vNormal >= 0 ? stateA.mineralMassKg : stateB.mineralMassKg;
  const phiMineral = vNormal * upwindMineral - diffusionCoeffs.mineralDiffusivity * (dMineral / dist);

  // 9. Scaled transfer deltas over boundary length and time step
  const metricFactor = edgeLen * dtSeconds;

  return {
    sourceCell: 'cellA',
    targetCell: 'cellB',
    outwardNormal: [nx, ny],
    edgeLengthMeters: edgeLen,
    deltas: {
      deltaThermalJoules: phiThermal * metricFactor,
      deltaWaterKg: phiWater * metricFactor,
      deltaCarbonKg: phiCarbon * metricFactor,
      deltaOxygenKg: phiOxygen * metricFactor,
      deltaMineralKg: phiMineral * metricFactor,
    },
  };
}
```

---

## 6. Convergence, Numerical Stability, and Invariant Verification Matrix

| Check Parameter | Mathematical Criteria | Acceptable Tolerance | Action on Failure |
|---|---|---|---|
| **Outward Dot Product** | $\hat{\mathbf{n}}_{A \to B} \cdot (\mathbf{c}_B - \mathbf{c}_A) > 0$ | $> 10^{-12}$ | Trigger vertex swap $(V_{\text{start}}, V_{\text{end}}) \to (V_{\text{end}}, V_{\text{start}})$ |
| **Antisymmetry Check** | $\hat{\mathbf{n}}_{B \to A} + \hat{\mathbf{n}}_{A \to B} = \mathbf{0}$ | $\|\text{sum}\| < 10^{-15}$ | Strict assertion failure; abort flux step |
| **Edge Norm Equivalence** | $\|\hat{\mathbf{n}}_{A \to B}\| = 1.0$ | $|\|\hat{\mathbf{n}}\| - 1.0| < 10^{-14}$ | Vector renormalization |
| **Total Energy Conservation** | $\sum_{\text{edges}} \left(\Delta U(c_A) + \Delta U(c_B)\right) = 0$ | Machine $\epsilon$ ($< 10^{-13}$) | Halt simulation loop on mass creation |
| **CFL Stability Limit** | $\Delta t \le \min_{ij} \left(\frac{D_{ij}}{2 \max(|v_n|, D_k / D_{ij})}\right)$ | Courant Number $C \le 0.5$ | Adaptive step bisection |

---

## 7. Implementation Roadmap for Core Modules

1. **`src/spatial/h3_types.ts`:**
   - Define `Point2D`, `Vector3D`, `ISharedBoundarySegment`, and `OrderedBoundaryResult`.
2. **`src/spatial/h3_adjacency.ts`:**
   - Implement `orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB)`.
   - Implement `orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB)`.
   - Implement `H3AdjacencyGraph.getOrientedBoundary(cellA, cellB)`.
3. **`src/spatial/spatial_flux_monad.ts`:**
   - Consume `orderSharedBoundaryEndpointsByCentroid` to evaluate conserved finite-volume divergence without sign flips.
4. **`tests/sprint_072.test.ts`:**
   - Execute verification suite checking all invariants under canonical hexagonal geometries, distorted planar projections, and unit spherical chords.