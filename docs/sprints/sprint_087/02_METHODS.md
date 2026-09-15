# Sprint 087: Process Mining & Method Specifications
## Pentagon Base Cell Missing Direction Mapping & Thermodynamic Flux Invariance

- **Sprint**: 087
- **Module**: `src/spatial/h3_adjacency.ts`
- **Topic**: Formal Thermodynamic Processes, Conserved Stock Deltas, and Monadic Flux Transport across Icosahedral Disclinations
- **Author**: Process Mining & Research Scientist, Web of Life / Gaia Platform

---

## 1. Physical, Biological, and Fluid Process Foundations

### 1.1 The Continuous-to-Discrete Sphere Dilemma: The Euler Characteristic and Disclination Defects
The Earth's biosphere, atmosphere, and hydrosphere reside on a 2-manifold $\mathcal{M} \cong S^2$. When this continuous domain is discretized for discrete global simulation using a hexagonal Discrete Global Grid System (DGGS) at resolution 0 (122 base cells), the Euler characteristic imposes a topological invariant:
$$\chi(\mathcal{M}) = V - E + F = 2$$

For any spherical triangulation or its dual trivalent tessellation, Euler's formula dictates that a sphere cannot be tiled solely by 6-valent vertices (or regular hexagons). Exactly 12 disclination defects (angle deficit $\Delta \theta = \pi/3 = 60^\circ$) must be introduced. In the canonical H3 base cell layout, these 12 defects are realized as pentagonal base cells:
$$\mathcal{P} = \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\} \subset \{0, \dots, 121\}$$

In continuous differential geometry, mass and energy conservation across $\mathcal{M}$ is governed by the continuity equation:
$$\frac{\partial \rho_\alpha}{\partial t} + \nabla \cdot \mathbf{J}_\alpha = \mathcal{S}_\alpha$$
where $\rho_\alpha$ is the volume (or areal) density of conserved species $\alpha \in \{\text{Carbon}, \text{Water}, \text{Minerals}, \text{Oxygen}, \text{Internal Energy}\}$, $\mathbf{J}_\alpha$ is the total flux vector field (advective + diffusive), and $\mathcal{S}_\alpha$ is local source/sink production.

On the discretized manifold, the divergence operator $\nabla \cdot \mathbf{J}_\alpha$ is mapped to boundary aperture fluxes across cell facets. For a cell $b$, the continuous divergence integral becomes:
$$\int_{\Omega_b} (\nabla \cdot \mathbf{J}_\alpha) \, dA = \oint_{\partial \Omega_b} \mathbf{J}_\alpha \cdot \mathbf{n} \, dl = \sum_{d \in \mathcal{D}_{\text{active}}(b)} J_{\alpha, b \to \mathcal{A}(b, d)} \cdot L_{b, d}$$
where:
- $\mathcal{D}_{\text{active}}(b) = \{1, 2, 3, 4, 5, 6\}$ for regular hexagonal base cells $b \in \mathcal{H}$ ($|\mathcal{D}_{\text{active}}| = 6$).
- $\mathcal{D}_{\text{active}}(b) = \{1, 2, 3, 4, 5, 6\} \setminus \{\mu(b)\}$ for pentagonal base cells $b \in \mathcal{P}$ ($|\mathcal{D}_{\text{active}}| = 5$).
- $\mu(b): \mathcal{P} \to \{1, \dots, 6\}$ is the omitted direction determined by `determinePentagonBaseCellMissingDirection(b)`.

If an algorithm evaluates flux along direction $\mu(b)$, it evaluates a directional vector into a topological void ($\mathcal{A}(b, \mu(b)) = \emptyset$ or $-1$). If this missing flux is non-zero, state variables are lost or unphysical boundary terms enter the simulation domain, catastrophically violating the First Law of Thermodynamics:
$$\Delta M_{\text{system}} = \sum_{b} \rho_\alpha(t + \Delta t) A_b - \sum_b \rho_\alpha(t) A_b \ne \int \mathcal{S}_\alpha \, dt$$

---

## 2. Formalized Thermodynamic Processes

### 2.1 Process 1: Discrete Inter-Cell Atmospheric Water Vapor & Sensible Heat Diffusion
Atmospheric boundary layer moisture ($q$, kg H₂O/kg air) and sensible enthalpy ($h = c_p T$, J/kg air) diffuse across adjacent base cells driven by concentration and thermal gradients.

#### 2.1.1 Continuous Governing Equations
$$J_{q} = -\rho_{\text{air}} K_h \nabla q$$
$$J_{h} = -\rho_{\text{air}} c_p K_h \nabla T$$
where $K_h$ is the horizontal eddy diffusivity ($\text{m}^2/\text{s}$), $\rho_{\text{air}}$ is atmospheric column density ($\text{kg}/\text{m}^2$).

#### 2.1.2 Discrete Manifold Stencil Formulation
For base cell $b \in \{0, \dots, 121\}$ with neighbors $\mathcal{A}(b, d)$:
$$J_{q, b \to \mathcal{A}(b, d)} = \begin{cases} 
-D_{q} \frac{q_{\mathcal{A}(b, d)} - q_b}{\Delta x_{b, d}} \cdot L_{b, d} & \text{if } d \ne \mu(b) \text{ and } \mathcal{A}(b, d) \ne -1 \\
0 & \text{if } d = \mu(b) \text{ or } \mathcal{A}(b, d) = -1 
\end{cases}$$

For pentagon base cells, the effective metric distortion requires a re-normalization factor:
$$\omega(b) = \begin{cases} 1.0 & \text{if } b \in \mathcal{H} \\ \frac{6}{5} & \text{if } b \in \mathcal{P} \end{cases}$$
such that the discrete Laplacian $\nabla^2 \phi$ maintains isotropic diffusive relaxation on $S^2$:
$$\nabla^2 \phi_b = \frac{\omega(b)}{\sum_{d \in \mathcal{D}_{\text{active}}(b)} L_{b, d}} \sum_{d \in \mathcal{D}_{\text{active}}(b)} \frac{\phi_{\mathcal{A}(b, d)} - \phi_b}{\Delta x_{b, d}} L_{b, d}$$

### 2.2 Process 2: Overland Hydrological Runoff and Mineral Transport
Liquid water accumulation exceeding soil infiltration capacity generates overland runoff. Dissolved mineral stocks ($N$, $P$, $K$) are carried via advective bulk flow:
$$\mathbf{J}_{\text{min}} = C_{\text{min}} \mathbf{J}_{w, \text{adv}}$$
where $C_{\text{min}}$ is the mineral solute concentration ($\text{kg mineral} / \text{kg } H_2O$).

#### 2.2.1 Directional Gravitational Advection Potential
Flow between adjacent cells is dictated by hydraulic head differences:
$$\Delta H_{b \to k} = (z_b + d_b) - (z_k + d_k)$$
where $z$ is bedrock topography (m) and $d$ is surface water stage height (m).

For pentagonal cells, gravitational steepest-descent routing must restrict the search neighborhood to $\mathcal{D}_{\text{active}}(b) = \{1..6\} \setminus \{\mu(b)\}$. Directing flow down $\mu(b)$ would channel water and dissolved nutrients into an unallocated memory buffer or null sink, precipitating immediate nutrient leakage.

### 2.3 Process 3: Biospheric Canopy Gas Exchange and Carbon Diffusion
Atmospheric carbon dioxide ($CO_2$) exchange via eddy transport between terrestrial base cells:
$$J_{CO_2, b \to k} = -K_{CO_2} \left(\chi_{CO_2, k} - \chi_{CO_2, b}\right)$$
Coupled with photosynthetic assimilation ($GPP$) and autotrophic/heterotrophic respiration ($R_e$):
$$\frac{d M_{C, b}}{dt} = \sum_{d \in \mathcal{D}_{\text{active}}(b)} J_{CO_2, \mathcal{A}(b, d) \to b} + A_b \left( R_{e, b} - GPP_b \right)$$

---

## 3. Exact Mass and Energy Deltas

We define the conserved extensive state vector $\mathbf{S}_b$ for any base cell $b$ at time $t$ over timestep $\Delta t$:
$$\mathbf{S}_b(t) = \begin{bmatrix} M_{C, b} \\ M_{W, b} \\ M_{O_2, b} \\ M_{N, b} \\ M_{P, b} \\ U_b \end{bmatrix} \begin{array}{l} \text{(Carbon stock, kg C)} \\ \text{(Water stock, kg H}_2\text{O)} \\ \text{(Oxygen stock, kg O}_2\text{)} \\ \text{(Nitrogen stock, kg N)} \\ \text{(Phosphorus stock, kg P)} \\ \text{(Thermal internal energy, J)} \end{array}$$

### 3.1 Species Mass Conservation Equation
For each conserved species $\alpha \in \{C, W, O_2, N, P\}$ and thermal energy $U$:
$$\Delta S_{\alpha, b} = \sum_{d \in \mathcal{D}_{\text{active}}(b)} \Phi_{\alpha, \mathcal{A}(b, d) \to b} \Delta t - \sum_{d \in \mathcal{D}_{\text{active}}(b)} \Phi_{\alpha, b \to \mathcal{A}(b, d)} \Delta t + \Gamma_{\alpha, b} \Delta t$$

where:
1. $\Phi_{\alpha, j \to k}$ is the boundary flux rate from cell $j$ to cell $k$ ($\text{kg}/\text{s}$ or $\text{W}$).
2. $\Gamma_{\alpha, b}$ is the internal biochemical production/consumption rate ($\text{kg}/\text{s}$ or $\text{W}$).
3. Antisymmetry of boundary flux: $\Phi_{\alpha, j \to k} \equiv -\Phi_{\alpha, k \to j}$.

### 3.2 Omitted Direction Zero-Flux Boundary Condition
For all pentagon base cells $p \in \mathcal{P}$:
$$\Phi_{\alpha, p \to \text{invalid}} \equiv 0, \quad \Phi_{\alpha, \text{invalid} \to p} \equiv 0 \quad \forall \alpha$$
Formally:
$$d = \mu(p) \implies \Phi_{\alpha, p, d} = 0$$

### 3.3 Strict Global Invariant Bounds
Summing across all 122 base cells in the global manifold:
$$\sum_{b=0}^{121} \Delta S_{\alpha, b} = \sum_{b=0}^{121} \Gamma_{\alpha, b} \Delta t$$
In the absence of planetary source/sink exchanges with space (e.g. for non-volatile minerals $\alpha \in \{N, P\}$):
$$\sum_{b=0}^{121} \Gamma_{N, b} \equiv 0 \implies \sum_{b=0}^{121} S_{N, b}(t + \Delta t) - \sum_{b=0}^{121} S_{N, b}(t) \equiv 0 \quad (\pm 10^{-14} \text{ machine roundoff})$$

---

## 4. Executable Monad Method Implementations

Below is the concrete TypeScript monadic transport implementation formalizing the stock updates and topological boundary checks.

```typescript
/**
 * Thermodynamic Monad for Conserved Stock Transfers across Icosahedral DGGS Base Cells.
 * Enforces zero flux along omitted pentagon directions: determinePentagonBaseCellMissingDirection.
 */

import { Direction } from './h3_types';
import {
  determinePentagonBaseCellMissingDirection,
  isBaseCellPentagon,
  getBaseCellNeighbor
} from './h3_adjacency';

/**
 * Conserved chemical and thermal state stock vector for an individual base cell.
 */
export interface BaseCellStockVector {
  readonly carbonKg: number;        // Carbon stock (organic + inorganic) [kg C]
  readonly waterKg: number;         // Water stock (vapor + liquid + solid) [kg H2O]
  readonly oxygenKg: number;        // Molecular oxygen stock [kg O2]
  readonly nitrogenKg: number;      // Fixed + mineral nitrogen [kg N]
  readonly phosphorusKg: number;    // Bioavailable phosphorus [kg P]
  readonly thermalEnergyJoules: number; // Sensible + latent enthalpy [J]
}

/**
 * Directional flux differential package for cross-facet transport.
 */
export interface DirectionalStockFlux {
  readonly carbonFluxKg: number;
  readonly waterFluxKg: number;
  readonly oxygenFluxKg: number;
  readonly nitrogenFluxKg: number;
  readonly phosphorusFluxKg: number;
  readonly heatFluxJoules: number;
}

/**
 * Result of a globally conserved manifold redistribution step.
 */
export interface RedistributionResult {
  readonly updatedStocks: ReadonlyMap<number, BaseCellStockVector>;
  readonly totalCarbonDeltaKg: number;
  readonly totalWaterDeltaKg: number;
  readonly totalEnergyDeltaJoules: number;
  readonly omittedDirectionBoundaryCollisionsPrevented: number;
}

/**
 * Monad executing mass and enthalpy transport on the H3 base cell manifold.
 */
export class DiscreteManifoldFluxMonad {
  private readonly stocks: Map<number, BaseCellStockVector>;
  private boundaryCollisionsPrevented: number = 0;

  private constructor(initialStocks: Map<number, BaseCellStockVector>) {
    this.stocks = new Map(initialStocks);
  }

  public static of(stocks: Map<number, BaseCellStockVector>): DiscreteManifoldFluxMonad {
    return new DiscreteManifoldFluxMonad(stocks);
  }

  /**
   * Applies horizontal diffusion of water and thermal energy across valid facets.
   * Strictly suppresses flux routing through omitted directions on the 12 pentagon defects.
   *
   * @param diffusivityWater - Water transfer coefficient [m^2/s]
   * @param conductivityHeat - Thermal transfer coefficient [W/(m*K)]
   * @param dtSeconds - Simulation integration timestep [s]
   */
  public applyInterCellDiffusion(
    diffusivityWater: number,
    conductivityHeat: number,
    dtSeconds: number
  ): DiscreteManifoldFluxMonad {
    const nextStocks = new Map<number, BaseCellStockVector>();
    const netDeltas = new Map<number, {
      dC: number; dW: number; dO2: number; dN: number; dP: number; dU: number;
    }>();

    // Initialize delta accumulators
    for (let b = 0; b < 122; b++) {
      netDeltas.set(b, { dC: 0, dW: 0, dO2: 0, dN: 0, dP: 0, dU: 0 });
    }

    const VALID_APERTURES: Direction[] = [
      Direction.K_AXES,
      Direction.J_AXES,
      Direction.JK_AXES,
      Direction.I_AXES,
      Direction.IK_AXES,
      Direction.IJ_AXES
    ];

    // Iterate across all 122 base cells
    for (let sourceCell = 0; sourceCell < 122; sourceCell++) {
      const sourceState = this.stocks.get(sourceCell);
      if (!sourceState) continue;

      const missingDir = determinePentagonBaseCellMissingDirection(sourceCell);
      const isPent = isBaseCellPentagon(sourceCell);

      for (const dir of VALID_APERTURES) {
        // ENFORCEMENT: If this direction is the omitted direction for this pentagonal cell,
        // absolute zero flux is permitted.
        if (isPent && dir === missingDir) {
          this.boundaryCollisionsPrevented++;
          continue;
        }

        const targetNeighbor = getBaseCellNeighbor(sourceCell, dir);
        if (targetNeighbor < 0 || targetNeighbor >= 122) {
          // Null neighbor / non-manifold boundary
          continue;
        }

        // Avoid double-counting undirected edges by ordering cell indices
        if (sourceCell < targetNeighbor) {
          const targetState = this.stocks.get(targetNeighbor);
          if (!targetState) continue;

          // Compute diffusion gradient (positive = flux from source to target)
          // Hydrostatic water gradient (proportional to mass stock difference)
          const deltaWaterKg = (sourceState.waterKg - targetState.waterKg);
          const waterFluxRate = deltaWaterKg * diffusivityWater * 0.01; // conductance scaled
          const waterTransferred = Math.max(
            -targetState.waterKg * 0.5,
            Math.min(sourceState.waterKg * 0.5, waterFluxRate * dtSeconds)
          );

          // Thermal enthalpy diffusion
          const deltaHeatJoules = (sourceState.thermalEnergyJoules - targetState.thermalEnergyJoules);
          const heatFluxRate = deltaHeatJoules * conductivityHeat * 0.01;
          const heatTransferred = Math.max(
            -targetState.thermalEnergyJoules * 0.5,
            Math.min(sourceState.thermalEnergyJoules * 0.5, heatFluxRate * dtSeconds)
          );

          // Update deltas antisymmetrically (First Law conservation: J_ji = -J_ij)
          const srcD = netDeltas.get(sourceCell)!;
          const tgtD = netDeltas.get(targetNeighbor)!;

          srcD.dW -= waterTransferred;
          tgtD.dW += waterTransferred;

          srcD.dU -= heatTransferred;
          tgtD.dU += heatTransferred;
        }
      }
    }

    // Apply accumulated deltas to state vectors with non-negativity guarantees
    for (let b = 0; b < 122; b++) {
      const curr = this.stocks.get(b);
      if (!curr) continue;
      const d = netDeltas.get(b)!;

      nextStocks.set(b, {
        carbonKg: Math.max(0, curr.carbonKg + d.dC),
        waterKg: Math.max(0, curr.waterKg + d.dW),
        oxygenKg: Math.max(0, curr.oxygenKg + d.dO2),
        nitrogenKg: Math.max(0, curr.nitrogenKg + d.dN),
        phosphorusKg: Math.max(0, curr.phosphorusKg + d.dP),
        thermalEnergyJoules: Math.max(0, curr.thermalEnergyJoules + d.dU)
      });
    }

    const nextMonad = new DiscreteManifoldFluxMonad(nextStocks);
    nextMonad.boundaryCollisionsPrevented = this.boundaryCollisionsPrevented;
    return nextMonad;
  }

  /**
   * Finalizes and audits the thermodynamic integration, verifying mass and energy invariance.
   */
  public runAudit(initialMonad: DiscreteManifoldFluxMonad): RedistributionResult {
    let initialC = 0, initialW = 0, initialU = 0;
    let finalC = 0, finalW = 0, finalU = 0;

    for (let b = 0; b < 122; b++) {
      const initS = initialMonad.stocks.get(b);
      if (initS) {
        initialC += initS.carbonKg;
        initialW += initS.waterKg;
        initialU += initS.thermalEnergyJoules;
      }
      const finS = this.stocks.get(b);
      if (finS) {
        finalC += finS.carbonKg;
        finalW += finS.waterKg;
        finalU += finS.thermalEnergyJoules;
      }
    }

    return {
      updatedStocks: this.stocks,
      totalCarbonDeltaKg: finalC - initialC,
      totalWaterDeltaKg: finalW - initialW,
      totalEnergyDeltaJoules: finalU - initialU,
      omittedDirectionBoundaryCollisionsPrevented: this.boundaryCollisionsPrevented
    };
  }
}
```

---

## 5. Second Law Thermodynamic Validation & Dissipation Verification

### 5.1 Discrete Entropy Production Rate
Let $S_{\text{entropy}}$ denote the total thermodynamic entropy of the planetary base cell grid:
$$S_{\text{entropy}} = \sum_{b=0}^{121} C_{v, b} \ln T_b + \sum_{b=0}^{121} M_{W, b} s_{w, b}$$
The rate of entropy generation due to inter-cell thermal conduction is:
$$\sigma_{\text{th}} = \sum_{\langle j, k \rangle} J_{Q, j \to k} \left(\frac{1}{T_k} - \frac{1}{T_j}\right) = \sum_{\langle j, k \rangle} \kappa_{jk} \frac{(T_j - T_k)^2}{T_j T_k} \ge 0$$

If flux is inadvertently evaluated along the missing pentagon aperture $\mu(p)$, the gradient references a non-existent temperature $T_{\text{null}} = 0$ or undefined, producing an infinite or negative entropy spike:
$$\lim_{T_k \to 0} J_{Q, j \to k} \left(\frac{1}{T_k} - \frac{1}{T_j}\right) \to +\infty \quad \text{or unphysical sign inversion}$$

### 5.2 Preservation of Dissipation Inequality
By mapping $p \in \mathcal{P} \to \mu(p)$ via `determinePentagonBaseCellMissingDirection`:
1. The summation over edges $\langle j, k \rangle$ contains exclusively topological dual edges existing on the icosahedral manifold:
   $$\mathcal{E} = \{ (b, \mathcal{A}(b, d)) \mid b \in [0, 121], d \in \mathcal{D}_{\text{active}}(b) \}$$
   where $|\mathcal{E}| = \frac{110 \times 6 + 12 \times 5}{2} = \frac{660 + 60}{2} = 360$ edges.
2. Every term in $\sigma_{\text{th}}$ satisfies:
   $$\kappa_{jk} \frac{(T_j - T_k)^2}{T_j T_k} \ge 0 \quad \forall e \in \mathcal{E}$$
3. Global entropy production is strictly positive semi-definite:
   $$\frac{d S_{\text{entropy}}}{dt}\Bigg|_{\text{internal}} \ge 0$$
   satisfying the Second Law of Thermodynamics without boundary leak anomalies.