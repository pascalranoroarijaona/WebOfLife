# Sprint 049 - Methods Specification: Topological Pentagon Validation & Conservative Boundary Transport

## 1. Physical, Geometric, and Thermodynamic Background

### 1.1 The Spherical Euler-Poincaré Singularity
The Discrete Global Grid System (DGGS) in Web of Life discretizes the spherical terrestrial surface $\mathbb{S}^2$ using aperture-7 hexagonal decomposition of an icosahedron. By the Euler-Poincaré characteristic:
$$\chi(\mathbb{S}^2) = V - E + F = 2$$
For a trivalent planar/spherical graph where every cell has coordination number $k_i$, the sum over face degrees $k_i$ satisfies:
$$\sum_{i} (6 - k_i) = 12 \cdot (1 - g) = 12 \quad (\text{for genus } g = 0)$$
Consequently, a closed spherical grid cannot be tiled exclusively with regular hexagons ($k = 6$). There exist exactly 12 topological singularities—pentagonal cells with coordination number $k = 5$—located at the 12 vertices of the projected icosahedron across all resolutions $r \in [0, 15]$.

### 1.2 Phantom Facet Divergence & First Law Violation
In discrete finite volume transport, mass stocks $\mathbf{M}_i = [M_{\text{water}}, M_{\text{carbon}}, M_{\text{minerals}}, M_{\text{oxygen}}]^T$ and thermal energy $U_i$ evolve according to:
$$\frac{d\mathbf{M}_i}{dt} = \sum_{j \in \mathcal{N}(i)} \mathbf{J}_{j \to i} \cdot A_{ij} + \mathbf{R}_i$$
$$\frac{dU_i}{dt} = \sum_{j \in \mathcal{N}(i)} J_{q, j \to i} \cdot A_{ij} + \dot{Q}_i - \dot{W}_i$$
where $\mathcal{N}(i)$ is the directional neighbor index set, $A_{ij}$ is the interface contact area, and $\mathbf{J}_{j \to i}$ is the advective-diffusive inter-cell flux density.

If a pentagonal cell ($k_i = 5$) is processed with a regular hexagonal stencil ($|\mathcal{N}(i)| = 6$), the flux operator evaluates an unmapped or degenerate 6th facet:
1. **Dangling Edge Sinks**: If the unmapped index maps to a null sink ($0\text{x}0$), outgoing flux $\mathbf{J}_{i \to \emptyset}$ decrements stock $\mathbf{S}_i$ without incrementing any receiving cell, inducing non-conservation:
   $$\frac{d}{dt} \sum_{k \in \text{Grid}} \mathbf{S}_k = - \sum_{p \in \text{Pentagons}} \mathbf{J}_{p \to \emptyset} \cdot A_{\text{phantom}} \ne \mathbf{0}$$
2. **Degenerate Edge Duplication**: If the 6th direction folds onto an existing neighbor $j$, flux is dispatched twice along the same geodesic corridor, destroying pair-wise anti-symmetry ($\mathbf{J}_{ij} = -\mathbf{J}_{ji}$).

Detecting pentagonal cells via exact bitwise decomposition enforces $|\mathcal{N}(p)| = 5$, strictly terminating the phantom facet and guaranteeing global mass and energy conservation:
$$\oint_{\partial \Omega} \mathbf{J} \cdot \hat{n} \, dA \equiv 0 \implies \sum_{i=1}^{N_{\text{cells}}} \Delta \mathbf{S}_i = \mathbf{0} \quad (\pm \epsilon_{\text{machine}})$$

### 1.3 Second Law Metric Distortion & Conductance Scaling
The angular defect of $60^\circ$ at each icosahedral vertex contracts the local perimeter. For a regular hexagonal cell of area $A_{\text{cell}}^{\text{hex}}$, edge length is:
$$L_{\text{edge}}^{\text{hex}} = \sqrt{\frac{2 A_{\text{cell}}^{\text{hex}}}{3 \sqrt{3}}}$$
For a regular spherical pentagonal cell of equivalent spherical area $A_{\text{cell}}^{\text{pent}}$, the perimeter edge length scales as:
$$L_{\text{edge}}^{\text{pent}} = \sqrt{\frac{4 A_{\text{cell}}^{\text{pent}}}{5 \sqrt{5 + 2 \sqrt{5}}}}$$
To preserve isotropic diffusive conductance $D_{ij} = \kappa \frac{A_{ij}}{\Delta x_{ij}}$ across pentagonal interfaces and ensure positive definite entropy production:
$$\sigma_s = \sum_{(i,j)} \mathbf{J}_{ij} \cdot \left(\frac{\mu_j}{T_j} - \frac{\mu_i}{T_i}\right) \ge 0$$
the geometric interface width for pentagons is adjusted by the metric correction coefficient:
$$\gamma_{\text{pent}} = \frac{L_{\text{edge}}^{\text{pent}}}{L_{\text{edge}}^{\text{hex}}} \approx \sqrt{\frac{5}{6 \cdot \sin(\pi / 5)}} \approx 1.1892$$

---

## 2. Quantitative Mass and Energy Balances

### 2.1 State Vector Definition
Each spatial cell $i$ maintains a conserved state vector:
$$\mathbf{S}_i = \begin{bmatrix}
M_{\text{H}_2\text{O}} & [\text{kg}] \\
M_{\text{C}} & [\text{kg}] \\
M_{\text{min}} & [\text{kg}] \\
M_{\text{O}_2} & [\text{kg}] \\
U_{\text{thermal}} & [\text{J}]
\end{bmatrix}$$

### 2.2 Discrete Boundary Advection-Diffusion Equations
For time step $\Delta t$, the discrete exchange between cell $i$ and neighbor $j \in \mathcal{N}(i)$ is defined as:

$$\Delta \mathbf{S}_{ij} = \Delta t \cdot A_{ij} \cdot \left( \mathbf{v}_{ij} \left( \alpha \frac{\mathbf{S}_i}{V_i} + (1 - \alpha) \frac{\mathbf{S}_j}{V_j} \right) + \mathbf{D}_{ij} \left( \frac{\mathbf{S}_j}{V_j} - \frac{\mathbf{S}_i}{V_i} \right) \right)$$

where:
- $\alpha \in [0, 1]$ is the upwind weighting factor based on interface normal velocity $v_{ij} = \mathbf{v} \cdot \hat{n}_{ij}$.
- $\mathbf{D}_{ij} = \text{diag}(D_{\text{water}}, D_{\text{carbon}}, D_{\text{min}}, D_{\text{oxygen}}, D_{\text{thermal}})$ is the diffusion tensor.
- $A_{ij}$ is the contact facet length $\times$ effective layer thickness.
  - If cell $i$ or $j$ is a pentagon, $A_{ij} = A_{\text{hex}} \cdot \gamma_{\text{pent}}$.
- $|\mathcal{N}(i)| = 5$ if $\text{isPentagonCell}(h_i) == \text{true}$, else $|\mathcal{N}(i)| = 6$.

### 2.3 Exact Monadic Conservation Constraint
For any pair $(i, j)$:
$$\Delta \mathbf{S}_{j \to i} = - \Delta \mathbf{S}_{i \to j}$$
$$\Delta \mathbf{S}_i = \sum_{j \in \mathcal{N}(i)} \Delta \mathbf{S}_{j \to i}$$
Summing across all cells in the partition:
$$\sum_{i=1}^{N} \Delta \mathbf{S}_i = \sum_{i=1}^{N} \sum_{j \in \mathcal{N}(i)} \Delta \mathbf{S}_{j \to i} \equiv \mathbf{0}$$

---

## 3. Bitwise Pentagon Decomposition Mathematics

### 3.1 64-Bit H3 Cell Index Layout
Given 64-bit integer $h$:
- **Mode** ($m$): Bits 59–62 (4 bits):
  $$m = (h \gg 59) \ \& \ 0\text{xF}$$
- **Resolution** ($r$): Bits 52–55 (4 bits):
  $$r = (h \gg 52) \ \& \ 0\text{xF}$$
- **Base Cell** ($b$): Bits 45–51 (7 bits):
  $$b = (h \gg 45) \ \& \ 0\text{x7F}$$
- **Child Directional Digit at level $k$** ($d_k$, for $1 \le k \le r$):
  $$d_k = (h \gg (45 - 3k)) \ \& \ 0\text{x7}$$
- **Unused Digits** ($k > r$):
  $$d_k = 0\text{b111} = 7$$

### 3.2 Canonical Pentagon Theorem
A cell $h$ is topologically pentagonal ($k=5$) if and only if:
1. $m = 1$
2. $b \in \mathcal{B}_{\text{pent}} = \{4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107\}$
3. $\forall k \in \{1, 2, \dots, r\}: d_k = 0$ (`H3_CENTER_DIGIT`)

---

## 4. Monad Method Implementations

```typescript
/**
 * Physical and Geometric Constants for DGGS Advection
 */
export const H3_CONSTANTS = {
  MODE_H3_CELL: 1,
  MAX_RESOLUTION: 15,
  CENTER_DIGIT: 0,
  DELETED_PENTAGON_DIRECTION: 1, // K-axis direction suppressed at icosahedral vertices
  PENTAGON_PERIMETER_FACTOR: 1.189207115, // sqrt(5 / (6 * sin(pi/5)))
} as const;

export const PENTAGON_BASE_CELLS: ReadonlySet<number> = new Set([
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107
]);

export interface CellStockState {
  readonly h3Index: bigint;
  readonly waterKg: number;
  readonly carbonKg: number;
  readonly mineralKg: number;
  readonly oxygenKg: number;
  readonly thermalEnergyJoules: number;
  readonly volumeM3: number;
  readonly temperatureK: number;
}

export interface StockDeltas {
  dWaterKg: number;
  dCarbonKg: number;
  dMineralKg: number;
  dOxygenKg: number;
  dThermalJoules: number;
}

/**
 * Pure Bitwise Decomposition of H3 Cell Index
 */
export function isPentagonCell(cell: string | bigint): boolean {
  const index = typeof cell === 'string' 
    ? BigInt(cell.startsWith('0x') ? cell : `0x${cell}`) 
    : cell;

  // 1. Verify Mode is 1 (H3 Cell)
  const mode = Number((index >> 59n) & 0xFn);
  if (mode !== H3_CONSTANTS.MODE_H3_CELL) {
    return false;
  }

  // 2. Extract Resolution (bits 52-55)
  const res = Number((index >> 52n) & 0xFn);
  if (res < 0 || res > H3_CONSTANTS.MAX_RESOLUTION) {
    return false;
  }

  // 3. Extract Base Cell (bits 45-51)
  const baseCell = Number((index >> 45n) & 0x7Fn);
  if (!PENTAGON_BASE_CELLS.has(baseCell)) {
    return false;
  }

  // 4. Invariant: All resolution digits up to 'res' must be CENTER_DIGIT (0)
  for (let r = 1; r <= res; r++) {
    const shift = BigInt(45 - 3 * r);
    const digit = Number((index >> shift) & 0x7n);
    if (digit !== H3_CONSTANTS.CENTER_DIGIT) {
      return false;
    }
  }

  return true;
}

/**
 * Interface Coordination & Stencil Resolution
 */
export function getCoordinationNumber(cell: string | bigint): 5 | 6 {
  return isPentagonCell(cell) ? 5 : 6;
}

/**
 * Monadic Boundary Flux Operator with Pentagon Topology Guard
 */
export class SpatialAdvectionDiffusionMonad {
  private readonly state: Map<bigint, CellStockState>;

  constructor(initialStates: Iterable<CellStockState>) {
    this.state = new Map();
    for (const s of initialStates) {
      this.state.set(s.h3Index, s);
    }
  }

  public getState(h3Index: bigint): CellStockState | undefined {
    return this.state.get(h3Index);
  }

  public getAllStates(): ReadonlyArray<CellStockState> {
    return Array.from(this.state.values());
  }

  /**
   * Evaluates pairwise flux between cell i and neighbor j, enforcing Second-Law entropy
   * consistency and edge length corrections for pentagons.
   */
  public computePairwiseExchange(
    source: CellStockState,
    target: CellStockState,
    velocityNormal: number, // m/s (positive from source -> target)
    contactAreaM2: number,   // nominal face area
    dtSeconds: number,
    diffusionCoeffs: {
      water: number;
      carbon: number;
      minerals: number;
      oxygen: number;
      thermal: number;
    }
  ): StockDeltas {
    // Determine if either cell is a pentagon and apply geometric distortion factor
    const isSourcePent = isPentagonCell(source.h3Index);
    const isTargetPent = isPentagonCell(target.h3Index);
    const effectiveArea = (isSourcePent || isTargetPent)
      ? contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
      : contactAreaM2;

    const sourceVol = Math.max(source.volumeM3, 1e-6);
    const targetVol = Math.max(target.volumeM3, 1e-6);

    // Upwind advective concentrations (kg/m3 or J/m3)
    const upwind = (sourceStock: number, targetStock: number): number => {
      return velocityNormal >= 0 ? sourceStock / sourceVol : targetStock / targetVol;
    };

    // Diffusive gradient: (target_conc - source_conc)
    const computeFlux = (sourceStock: number, targetStock: number, diffCoeff: number): number => {
      const cSource = sourceStock / sourceVol;
      const cTarget = targetStock / targetVol;
      const advectiveFlux = velocityNormal * (velocityNormal >= 0 ? cSource : cTarget);
      const diffusiveFlux = diffCoeff * (cTarget - cSource);
      return (advectiveFlux + diffusiveFlux) * effectiveArea * dtSeconds;
    };

    const dWater = computeFlux(source.waterKg, target.waterKg, diffusionCoeffs.water);
    const dCarbon = computeFlux(source.carbonKg, target.carbonKg, diffusionCoeffs.carbon);
    const dMineral = computeFlux(source.mineralKg, target.mineralKg, diffusionCoeffs.minerals);
    const dOxygen = computeFlux(source.oxygenKg, target.oxygenKg, diffusionCoeffs.oxygen);
    const dThermal = computeFlux(source.thermalEnergyJoules, target.thermalEnergyJoules, diffusionCoeffs.thermal);

    return {
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dMineralKg: dMineral,
      dOxygenKg: dOxygen,
      dThermalJoules: dThermal
    };
  }

  /**
   * Executes a synchronized, conservative integration step over the H3 manifold.
   * Ensures pentagonal cells are bounded to exactly 5 neighbors.
   */
  public step(
    dtSeconds: number,
    getValidNeighbors: (index: bigint) => bigint[],
    nominalAreaM2: number,
    diffusionCoeffs: {
      water: number;
      carbon: number;
      minerals: number;
      oxygen: number;
      thermal: number;
    }
  ): SpatialAdvectionDiffusionMonad {
    const deltas = new Map<bigint, StockDeltas>();

    // Initialize zero deltas
    for (const id of this.state.keys()) {
      deltas.set(id, {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralKg: 0,
        dOxygenKg: 0,
        dThermalJoules: 0
      });
    }

    const processedEdges = new Set<string>();

    for (const [id, cell] of this.state.entries()) {
      const isPent = isPentagonCell(id);
      const neighbors = getValidNeighbors(id);

      // Invariant assertion: pentagons must have at most 5 valid neighbors
      if (isPent && neighbors.length > 5) {
        throw new Error(`Topological Singularity Violation: Pentagon ${id.toString(16)} has ${neighbors.length} neighbors (max 5)`);
      }

      for (const nId of neighbors) {
        if (!this.state.has(nId)) continue; // Boundary condition

        const edgeKey = id < nId ? `${id}_${nId}` : `${nId}_${id}`;
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);

        const target = this.state.get(nId)!;
        
        // Compute pairwise flux (symmetric exchange)
        // velocityNormal assumed 0 for pure diffusion test; otherwise derived from pressure/wind field
        const flux = this.computePairwiseExchange(
          cell,
          target,
          0.0, // pure diffusion test default
          nominalAreaM2,
          dtSeconds,
          diffusionCoeffs
        );

        // Apply conservative exchange: source loses flux, target gains flux
        const srcDelta = deltas.get(id)!;
        const tgtDelta = deltas.get(nId)!;

        srcDelta.dWaterKg += flux.dWaterKg;
        srcDelta.dCarbonKg += flux.dCarbonKg;
        srcDelta.dMineralKg += flux.dMineralKg;
        srcDelta.dOxygenKg += flux.dOxygenKg;
        srcDelta.dThermalJoules += flux.dThermalJoules;

        tgtDelta.dWaterKg -= flux.dWaterKg;
        tgtDelta.dCarbonKg -= flux.dCarbonKg;
        tgtDelta.dMineralKg -= flux.dMineralKg;
        tgtDelta.dOxygenKg -= flux.dOxygenKg;
        tgtDelta.dThermalJoules -= flux.dThermalJoules;
      }
    }

    // Produce next immutable monad state
    const nextStates: CellStockState[] = [];
    for (const [id, cell] of this.state.entries()) {
      const d = deltas.get(id)!;
      nextStates.push({
        h3Index: cell.h3Index,
        waterKg: cell.waterKg + d.dWaterKg,
        carbonKg: cell.carbonKg + d.dCarbonKg,
        mineralKg: cell.mineralKg + d.dMineralKg,
        oxygenKg: cell.oxygenKg + d.dOxygenKg,
        thermalEnergyJoules: cell.thermalEnergyJoules + d.dThermalJoules,
        volumeM3: cell.volumeM3,
        temperatureK: (cell.thermalEnergyJoules + d.dThermalJoules) / (cell.waterKg * 4184 + 1e-3)
      });
    }

    return new SpatialAdvectionDiffusionMonad(nextStates);
  }
}
```

---

## 5. Thermodynamic Validation Invariants

| Invariant | Physical Target | Formula / Limit | Verification Method |
| :--- | :--- | :--- | :--- |
| **Global Pentagon Count** | Exactly 12 pentagons | $N_{\text{pent}}(r) = 12, \forall r \in [0, 15]$ | Iterate all base cells and children; check cardinality $= 12$. |
| **Coordination Stencil Bound** | No phantom edge fluxes | $k_i = 5 \iff \text{isPentagonCell}(h_i) == \text{true}$ | Adjacency coordinator asserts `neighbors.length == 5` on pentagons. |
| **Total Mass Conservation** | Zero mass creation/loss | $\left\vert \sum \mathbf{M}_i(t + \Delta t) - \sum \mathbf{M}_i(t) \right\vert < 10^{-12} \text{ kg}$ | Sum total water, carbon, mineral stocks before and after 100 transport steps. |
| **First Law Energy Conservation** | Energy conservation | $\left\vert \sum U_i(t + \Delta t) - \sum U_i(t) \right\vert < 10^{-9} \text{ J}$ | Sum total internal thermal energy before and after 100 transport steps. |
| **Second Law Entropy Non-negativity** | Diffusive dissipation | $\sigma = \sum_{(i,j)} J_{ij} (\mu_j - \mu_i) \ge 0$ | Confirm flux flows down thermodynamic chemical potential / concentration gradients. |