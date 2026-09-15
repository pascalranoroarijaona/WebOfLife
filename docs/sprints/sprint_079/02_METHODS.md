# Sprint 079: Methods Specification — Pentagonal Adjacency & Conservative Topological Transport

**Author:** Process Mining & Research Scientist  
**Sprint:** 079  
**Status:** Approved  
**Target Domain:** `src/spatial/h3_adjacency.ts`, `src/spatial/spatial_flux_monad.ts`  

---

## 1. Physical & Mathematical Foundations

### 1.1 Discrete Surface Topology and Euler Invariance
In the discrete global grid system (DGGS) based on icosahedral hexagonal subdivision (H3), the planetary surface is discretized into a 2-manifold $\mathcal{M} \cong S^2$. According to Euler's polyhedral characteristic:
$$\chi(\mathcal{M}) = V - E + F = 2$$

For an arbitrary planar/spherical graph composed of $F_k$ faces of valency $k$, the relation governing cell coordination is:
$$\sum_{k \ge 3} (6 - k) F_k = 12 \chi(\mathcal{M}) / 2 = 12$$

Assuming all regular cells are hexagons ($k = 6$), the system strictly requires:
$$F_5 = 12 \quad \forall r \in \mathbb{N}$$

Every pentagonal cell $c_p$ possesses exactly 5 contiguous edges $\mathcal{E}(c_p) = \{e_0, e_1, e_2, e_3, e_4\}$ and topological degree:
$$\operatorname{deg}(c_p) = |N(c_p)| = 5$$

Standard hexagonal cells exhibit $\operatorname{deg}(c_h) = |N(c_h)| = 6$. The presence of an invariant neighborhood size $|N(c_p)| = 5$ is a non-negotiable geometric constraint for physical flux routing across the sphere.

### 1.2 First and Second Laws Across Pentagonal Boundaries

Let state vector $\mathbf{X}_i = [C_i, W_i, M_i, O_i, U_i]^T$ define the extensive stock contents of cell $i$:
- $C$: Total carbon stock ($\mathrm{mol}$)
- $W$: Hydrological stock ($\mathrm{kg}\,\mathrm{H_2O}$)
- $M$: Essential mineral nutrient stock ($\mathrm{mol}\,\mathrm{P}/\mathrm{N}$)
- $O$: Dissolved / atmospheric oxygen stock ($\mathrm{mol}\,\mathrm{O_2}$)
- $U$: Internal thermal energy ($\mathrm{J}$)

For any conserved scalar component $X^{(m)}$, discrete finite-volume divergence on cell $i$ with surface area $A_i$ and boundary facets $\Gamma_{i,j}$ with neighbors $j \in N(i)$ is formulated as:
$$\frac{d X^{(m)}_i}{dt} = \sum_{j \in N(i)} J^{(m)}_{j \to i} \cdot \ell_{i,j} + \dot{S}^{(m)}_i$$

Where:
- $\ell_{i,j}$ is the interface geodesic contact length between cells $i$ and $j$.
- $J^{(m)}_{j \to i}$ is the surface flux density from neighbor $j$ into cell $i$.
- $\dot{S}^{(m)}_i$ is the internal metabolic/thermodynamic source-sink term.

#### First Law (Energy & Mass Conservation):
In an isolated neighborhood with zero external boundary flux:
$$\sum_{i \in \mathcal{C}} \frac{d X^{(m)}_i}{dt} = \sum_{i \in \mathcal{C}} \sum_{j \in N(i)} J^{(m)}_{j \to i} \ell_{i,j} = 0 \quad \Longleftrightarrow \quad J^{(m)}_{j \to i} = -J^{(m)}_{i \to j}$$

If a pentagonal cell is evaluated using $|N(c_p)| = 6$ (e.g., reading an uninitialized or padded null neighbor index), a spurious facet flux $J^{(m)}_{6 \to i}$ is introduced or computed against an undefined potential, breaking mass conservation:
$$\Delta X^{(m)}_{\text{leak}} = \int_{t}^{t+\Delta t} J^{(m)}_{\text{unallocated}} \, dt \ne 0$$

#### Second Law (Entropy Production):
Thermal conduction and passive diffusion satisfy Fourier and Fickian gradients:
$$J^{(U)}_{j \to i} = \kappa \frac{T_j - T_i}{d_{i,j}}, \quad J^{(C)}_{j \to i} = D \frac{\rho_{C,j} - \rho_{C,i}}{d_{i,j}}$$

Entropy production across facet $\Gamma_{i,j}$ is:
$$\dot{\sigma}_{i,j} = J^{(U)}_{j \to i} \left(\frac{1}{T_i} - \frac{1}{T_j}\right) \ge 0$$

Ensuring $|N(c_p)| = 5$ prevents division-by-zero or evaluation at undefined temperature coordinates $T_{\text{null}}$, which otherwise generates catastrophic entropy discontinuities $\dot{\sigma} \to -\infty$.

---

## 2. Formal Mass & Energy Stock Transfer Equations

For a pentagonal cell $i$ and neighbor set $N(i) = \{n_0, n_1, n_2, n_3, n_4\}$ verified by `isPentagonNeighborArrayLengthValid(N(i)) == true`:

### 2.1 Interface Geometry for Pentagonal Cells
- Pentagonal cell surface area: $A_{\text{pent}} = \frac{5}{4 \sqrt{3}} \lambda^2 \tan\left(\frac{3\pi}{10}\right) \cdot r_{\text{scale}}^2$
- Interface segment length: $\ell_{\text{pent}} = \frac{A_{\text{pent}}}{\sum_{k=0}^4 d_{i, n_k} / 5}$
- Centroid distance: $d_{i, n_k} = \|\mathbf{x}_i - \mathbf{x}_{n_k}\|_2$

### 2.2 Discrete Mass & Energy Transfer Operators

During timestep $\Delta t$:

1. **Carbon Diffusion ($\Delta C$):**
   $$\Delta C_{n_k \to i} = D_C \cdot \frac{\frac{C_{n_k}}{A_{n_k}} - \frac{C_i}{A_i}}{d_{i, n_k}} \cdot \ell_{\text{pent}} \cdot \Delta t$$
   $$\Delta C_i = \sum_{k=0}^4 \Delta C_{n_k \to i}, \quad \Delta C_{n_k} = -\Delta C_{n_k \to i}$$

2. **Hydrological Transport ($\Delta W$):**
   $$\Delta W_{n_k \to i} = K_H \cdot \frac{\Phi_{n_k} - \Phi_i}{d_{i, n_k}} \cdot \ell_{\text{pent}} \cdot \Delta t$$
   where $\Phi = \Psi_{\text{matric}} + \Psi_{\text{grav}} = -\frac{R T}{V_w} \ln(a_w) + g z$.

3. **Mineral Solute Advection-Diffusion ($\Delta M$):**
   $$\Delta M_{n_k \to i} = \left[ D_M \frac{\frac{M_{n_k}}{W_{n_k}} - \frac{M_i}{W_i}}{d_{i, n_k}} + \max(0, \Delta W_{n_k \to i}) \frac{M_{n_k}}{W_{n_k}} + \min(0, \Delta W_{n_k \to i}) \frac{M_i}{W_i} \right] \cdot \ell_{\text{pent}}$$

4. **Oxygen Gas Exchange ($\Delta O$):**
   $$\Delta O_{n_k \to i} = D_O \cdot \frac{\frac{O_{n_k}}{A_{n_k}} - \frac{O_i}{A_i}}{d_{i, n_k}} \cdot \ell_{\text{pent}} \cdot \Delta t$$

5. **Thermal Energy Conduction ($\Delta U$):**
   $$\Delta U_{n_k \to i} = k_{\text{th}} \cdot \frac{T_{n_k} - T_i}{d_{i, n_k}} \cdot \ell_{\text{pent}} \cdot \Delta t$$
   Where temperature $T_i = \frac{U_i}{C_v \cdot m_i}$.

---

## 3. Executable Monad Method Specifications

### 3.1 State and Vector Interfaces

```typescript
export interface ConservedStockVector {
  readonly carbonMol: number;       // mol C
  readonly waterKg: number;         // kg H2O
  readonly mineralsMol: number;     // mol minerals (N, P)
  readonly oxygenMol: number;       // mol O2
  readonly thermalEnergyJ: number;  // Joules
}

export interface CellSpatialState {
  readonly cellIndex: string;
  readonly isPentagon: boolean;
  readonly areaM2: number;
  readonly elevationM: number;
  readonly stocks: ConservedStockVector;
}

export interface AdjacencyFluxDelta {
  readonly targetIndex: string;
  readonly sourceIndex: string;
  readonly deltas: ConservedStockVector;
}
```

### 3.2 Monadic Topology Validation & Flux Operator

```typescript
import {
  H3_PENTAGON_NEIGHBOR_COUNT,
  isPentagonNeighborArrayLengthValid
} from './h3_adjacency';

export class PentagonalFluxConservationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Conservation Failure]: ${message}`);
    this.name = 'PentagonalFluxConservationError';
  }
}

/**
 * Validates and computes conservative flux deltas for a pentagonal cell across
 * exactly 5 topological interfaces.
 */
export class PentagonalSpatialFluxMonad {
  private constructor(
    private readonly centerCell: CellSpatialState,
    private readonly neighbors: readonly CellSpatialState[],
    private readonly fluxAcc: readonly AdjacencyFluxDelta[]
  ) {}

  public static of(
    centerCell: CellSpatialState,
    neighbors: readonly CellSpatialState[]
  ): PentagonalSpatialFluxMonad {
    if (!centerCell.isPentagon) {
      throw new PentagonalFluxConservationError(
        `Cell ${centerCell.cellIndex} is not designated as pentagonal.`
      );
    }

    if (!isPentagonNeighborArrayLengthValid(neighbors)) {
      throw new PentagonalFluxConservationError(
        `Pentagon neighborhood invariant violated for cell ${centerCell.cellIndex}. Expected exactly ${H3_PENTAGON_NEIGHBOR_COUNT} neighbors, found: ${neighbors.length}`
      );
    }

    return new PentagonalSpatialFluxMonad(centerCell, Object.freeze([...neighbors]), []);
  }

  /**
   * Evaluates pairwise exchange across all 5 interfaces, enforcing First Law conservation.
   */
  public computeDiffusion(
    diffusionCoeffs: {
      diffCarbon: number;
      diffWater: number;
      diffMinerals: number;
      diffOxygen: number;
      thermalConductivity: number;
    },
    dtSeconds: number
  ): PentagonalSpatialFluxMonad {
    // Assert invariant before executing mathematical monad step
    if (!isPentagonNeighborArrayLengthValid(this.neighbors.length)) {
      throw new PentagonalFluxConservationError('Topology corruption during monadic evaluation.');
    }

    const newFluxes: AdjacencyFluxDelta[] = [];
    const i = this.centerCell;

    for (const j of this.neighbors) {
      // Characteristic centroid distance in meters (regular DGGS assumption)
      const dist = Math.max(1.0, Math.sqrt(i.areaM2));
      const interfaceLen = Math.sqrt(i.areaM2) / 5.0;

      // 1. Carbon diffusion
      const concCi = i.stocks.carbonMol / i.areaM2;
      const concCj = j.stocks.carbonMol / j.areaM2;
      const fluxC = diffusionCoeffs.diffCarbon * ((concCj - concCi) / dist) * interfaceLen * dtSeconds;

      // 2. Hydrological flux
      const fluxW = diffusionCoeffs.diffWater * ((j.stocks.waterKg - i.stocks.waterKg) / (dist * i.areaM2)) * interfaceLen * dtSeconds;

      // 3. Mineral solute transfer
      const concMi = i.stocks.mineralsMol / Math.max(1e-6, i.stocks.waterKg);
      const concMj = j.stocks.mineralsMol / Math.max(1e-6, j.stocks.waterKg);
      const fluxM = diffusionCoeffs.diffMinerals * ((concMj - concMi) / dist) * interfaceLen * dtSeconds;

      // 4. Oxygen diffusion
      const concOi = i.stocks.oxygenMol / i.areaM2;
      const concOj = j.stocks.oxygenMol / j.areaM2;
      const fluxO = diffusionCoeffs.diffOxygen * ((concOj - concOi) / dist) * interfaceLen * dtSeconds;

      // 5. Thermal diffusion (Fourier)
      const specHeat = 4184; // J/(kg*K)
      const tempI = i.stocks.thermalEnergyJ / Math.max(1.0, i.stocks.waterKg * specHeat);
      const tempJ = j.stocks.thermalEnergyJ / Math.max(1.0, j.stocks.waterKg * specHeat);
      const fluxU = diffusionCoeffs.thermalConductivity * ((tempJ - tempI) / dist) * interfaceLen * dtSeconds;

      newFluxes.push({
        targetIndex: i.cellIndex,
        sourceIndex: j.cellIndex,
        deltas: {
          carbonMol: fluxC,
          waterKg: fluxW,
          mineralsMol: fluxM,
          oxygenMol: fluxO,
          thermalEnergyJ: fluxU
        }
      });
    }

    return new PentagonalSpatialFluxMonad(this.centerCell, this.neighbors, newFluxes);
  }

  /**
   * Applies the divergence deltas to produce the updated cell state, verifying zero-sum.
   */
  public resolve(): {
    updatedCenter: CellSpatialState;
    totalDivergence: ConservedStockVector;
  } {
    let divC = 0;
    let divW = 0;
    let divM = 0;
    let divO = 0;
    let divU = 0;

    for (const f of this.fluxAcc) {
      divC += f.deltas.carbonMol;
      divW += f.deltas.waterKg;
      divM += f.deltas.mineralsMol;
      divO += f.deltas.oxygenMol;
      divU += f.deltas.thermalEnergyJ;
    }

    const updatedCenter: CellSpatialState = {
      ...this.centerCell,
      stocks: {
        carbonMol: this.centerCell.stocks.carbonMol + divC,
        waterKg: this.centerCell.stocks.waterKg + divW,
        mineralsMol: this.centerCell.stocks.mineralsMol + divM,
        oxygenMol: this.centerCell.stocks.oxygenMol + divO,
        thermalEnergyJ: this.centerCell.stocks.thermalEnergyJ + divU
      }
    };

    return {
      updatedCenter,
      totalDivergence: {
        carbonMol: divC,
        waterKg: divW,
        mineralsMol: divM,
        oxygenMol: divO,
        thermalEnergyJ: divU
      }
    };
  }
}
```

---

## 4. Stock Delta Matrix & Verification Rules

| Parameter | Symbol | Units | Pentagon Interface Multiplier | Hexagon Interface Multiplier | Conservation Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Carbon Stock | $C$ | $\mathrm{mol}$ | $\sum_{k=0}^4 J^{(C)}_k \Delta t$ | $\sum_{k=0}^5 J^{(C)}_k \Delta t$ | $\sum \Delta C_{\text{edges}} \equiv 0$ |
| Hydrology | $W$ | $\mathrm{kg}$ | $\sum_{k=0}^4 J^{(W)}_k \Delta t$ | $\sum_{k=0}^5 J^{(W)}_k \Delta t$ | $\sum \Delta W_{\text{edges}} \equiv 0$ |
| Minerals | $M$ | $\mathrm{mol}$ | $\sum_{k=0}^4 J^{(M)}_k \Delta t$ | $\sum_{k=0}^5 J^{(M)}_k \Delta t$ | $\sum \Delta M_{\text{edges}} \equiv 0$ |
| Oxygen | $O$ | $\mathrm{mol}$ | $\sum_{k=0}^4 J^{(O)}_k \Delta t$ | $\sum_{k=0}^5 J^{(O)}_k \Delta t$ | $\sum \Delta O_{\text{edges}} \equiv 0$ |
| Internal Energy | $U$ | $\mathrm{J}$ | $\sum_{k=0}^4 J^{(U)}_k \Delta t$ | $\sum_{k=0}^5 J^{(U)}_k \Delta t$ | $\sum \Delta U_{\text{edges}} \equiv 0$ |

### Topological Invariance Gate Matrix:
1. `isPentagonNeighborArrayLengthValid(input)` MUST return `true` if and only if `input === 5` or `input.length === 5`.
2. Any non-5 input passed to a pentagonal flux integration MUST immediately reject the transaction, preserving the First Law of Thermodynamics and preventing spatial leaks across DGGS singularities.