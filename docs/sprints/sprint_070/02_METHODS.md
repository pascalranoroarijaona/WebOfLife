# Sprint 070 — Process Mining & Method Specifications
## Topological Adjacency Verification & Conservative Spatial Flux Routing on $\mathbb{S}^2$

---

### 1. Scientific & Geometric Context

In the Web of Life simulation engine, biogeochemical dynamics occur across discrete hexagonal/pentagonal cells on an icosahedral Discrete Global Grid System (DGGS, specifically H3 projected onto $\mathbb{S}^2$). Spatial transport of carbon, nitrogen, phosphorus, water, oxygen, and thermal energy between adjacent cells requires exact geometric conservation across shared polygon facets $\mathcal{F}_{ij} = \partial \Omega_i \cap \partial \Omega_j$.

When cell vertices $\mathbf{v} \in \mathbb{R}^3$ are projected onto the unit sphere ($\|\mathbf{v}\|_2 = 1$), floating-point rounding induces artificial boundary mismatch:
$$\Delta \mathbf{v} = \mathbf{v}_i^{(k)} - \mathbf{v}_j^{(l)} \ne \mathbf{0}$$
Without angular tolerance checking via $\operatorname{areCartesianUnitVectorsEqual3D}(\mathbf{u}, \mathbf{w}, \epsilon)$, two topologically identical vertices fail equality checks. This creates non-closed boundary loops, leading to:
1. **Orphaned Facet Areas**: $\Delta A_{ij} = |A_{ij} - A_{ji}| > 0$, causing divergence of the discrete velocity field $\nabla \cdot \mathbf{v} \ne 0$.
2. **First Law Violations**: Non-conservative spatial flux transfers producing artificial mass/energy leaks:
   $$\oint_{\partial \Omega} \mathbf{J} \cdot d\mathbf{A} \ne \sum_{\text{cells}} \Delta M_k$$
3. **Second Law Violations**: Spurious numerical gradients producing negative entropy production rates:
   $$\dot{S}_{\text{numerical}} = -\sum_{\text{edges}} J_k \cdot \nabla \mu_k < 0$$

By validating Cartesian unit vector equivalence within angular tolerance $\epsilon = 1.0 \times 10^{-9} \text{ rad}$, boundary facets satisfy pairwise metric symmetry ($A_{ij} = A_{ji}$ and $\mathbf{n}_{ij} = -\mathbf{n}_{ji}$), ensuring machine-precision mass and energy conservation.

---

### 2. Physical & Stoichiometric Stock Definitions

For any H3 discrete cell $\Omega_i$, the physical state is represented by the extensive state vector $\mathbf{S}_i$:

$$\mathbf{S}_i = \begin{bmatrix} M_{i, \text{C}} \\ M_{i, \text{N}} \\ M_{i, \text{P}} \\ M_{i, \text{H}_2\text{O}} \\ M_{i, \text{O}_2} \\ U_i \end{bmatrix} \quad \begin{matrix} \text{[mol C]} \\ \text{[mol N]} \\ \text{[mol P]} \\ \text{[mol H}_2\text{O]} \\ \text{[mol O}_2\text{]} \\ \text{[J (Thermal Energy)]} \end{matrix}$$

#### 2.1 State Vector Properties
- **Volume & Area**: Cell geodesic surface area $A_i \text{ [m}^2\text{]}$ and soil/fluid layer depth $h_i \text{ [m]}$, yielding volume $V_i = A_i h_i \text{ [m}^3\text{]}$.
- **Concentrations**: $c_{i, k} = \frac{M_{i, k}}{V_i} \text{ [mol}\cdot\text{m}^{-3}\text{]}$ for $k \in \{\text{C}, \text{N}, \text{P}, \text{H}_2\text{O}, \text{O}_2\}$.
- **Temperature**: $T_i = \frac{U_i}{\sum_k M_{i, k} \bar{C}_{p, k} + C_{\text{matrix}, i}} \text{ [K]}$, where $\bar{C}_{p, k}$ is the molar isobaric heat capacity and $C_{\text{matrix}, i}$ is the lithosphere/soil matrix heat capacity in $\text{J}\cdot\text{K}^{-1}$.

---

### 3. Spatial Transport Process Quantifications

#### 3.1 Boundary Facet Kinematics & Angular Equality Criterion
Given two adjacent cells $\Omega_i$ and $\Omega_j$, let the shared directed geodesic boundary edge be defined by endpoints $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{S}^2$ for cell $i$, and $\mathbf{w}_1, \mathbf{w}_2 \in \mathbb{S}^2$ for cell $j$. 

Conjugacy requires:
$$\begin{aligned}
\operatorname{areCartesianUnitVectorsEqual3D}(\mathbf{v}_1, \mathbf{w}_2, \epsilon) &= \text{true} \\
\operatorname{areCartesianUnitVectorsEqual3D}(\mathbf{v}_2, \mathbf{w}_1, \epsilon) &= \text{true}
\end{aligned}$$
where:
$$\theta(\mathbf{u}, \mathbf{w}) = \arccos\left(\operatorname{clamp}(\mathbf{u} \cdot \mathbf{w}, -1.0, 1.0)\right) \le \epsilon = 10^{-9} \text{ rad}$$

Once verified, the interface arc length $L_{ij}$ on a sphere of radius $R_{\text{Earth}} = 6,371,008 \text{ m}$ is:
$$L_{ij} = R_{\text{Earth}} \arccos\left(\operatorname{clamp}(\mathbf{v}_1 \cdot \mathbf{v}_2, -1.0, 1.0)\right) \text{ [m]}$$
Interface area $\mathcal{F}_{ij} = L_{ij} \cdot \min(h_i, h_j) \text{ [m}^2\text{]}$.
The unit normal vector pointing outward from cell $i$ to cell $j$ in the tangent plane is:
$$\mathbf{n}_{ij} = \frac{(\mathbf{v}_2 - \mathbf{v}_1) \times \mathbf{c}_i}{\|(\mathbf{v}_2 - \mathbf{v}_1) \times \mathbf{c}_i\|}$$
where $\mathbf{c}_i$ is the unit vector centroid of cell $i$. By symmetry, $\mathbf{n}_{ji} = -\mathbf{n}_{ij}$.

---

#### 3.2 Finite Volume Advection Deltas (Upwind Scheme)
Let $\mathbf{u}_{ij} = \mathbf{u}(\mathbf{x}_{ij}, t)$ be the fluid velocity vector at the shared edge interface $\mathcal{F}_{ij}$.
The normal volumetric flux is:
$$Q_{ij} = (\mathbf{u}_{ij} \cdot \mathbf{n}_{ij}) \mathcal{F}_{ij} \quad \left[\text{m}^3 \cdot \text{s}^{-1}\right]$$
Metric consistency guarantees skew-symmetry: $Q_{ji} = -Q_{ij}$.

The upwind advective molar flux for chemical species $k$ over discrete time step $\Delta t$ is:
$$\Phi_{i \to j, \text{adv}}^k = \Delta t \cdot \begin{cases}
Q_{ij} \, c_{i, k}, & Q_{ij} \ge 0 \\
Q_{ij} \, c_{j, k}, & Q_{ij} < 0
\end{cases} \quad [\text{mol}]$$

Thermal advection over $\Delta t$:
$$\Phi_{i \to j, \text{adv}}^U = \Delta t \cdot \begin{cases}
Q_{ij} \, \rho_i C_{p, i} T_i, & Q_{ij} \ge 0 \\
Q_{ij} \, \rho_j C_{p, j} T_j, & Q_{ij} < 0
\end{cases} \quad [\text{J}]$$

---

#### 3.3 Molecular & Hydrodynamic Diffusion Deltas (Fickian & Fourier)
Across cell centroid distance $d_{ij} = R_{\text{Earth}} \arccos\left(\operatorname{clamp}(\mathbf{c}_i \cdot \mathbf{c}_j, -1.0, 1.0)\right)$:

1. **Mass Diffusion** (chemical species $k$ with effective diffusion coefficient $D_k \text{ [m}^2 \cdot \text{s}^{-1}\text{]}$):
   $$\Phi_{i \to j, \text{diff}}^k = \Delta t \cdot D_k \mathcal{F}_{ij} \left(\frac{c_{i, k} - c_{j, k}}{d_{ij}}\right) \quad [\text{mol}]$$

2. **Thermal Conduction** (effective thermal conductivity $\kappa \text{ [W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}\text{]}$):
   $$\Phi_{i \to j, \text{cond}}^U = \Delta t \cdot \kappa \mathcal{F}_{ij} \left(\frac{T_i - T_j}{d_{ij}}\right) \quad [\text{J}]$$

---

#### 3.4 Coupled Discrete State Transitions
For edge $\mathcal{E}_{ij}$ connecting verified cell pair $(i, j)$:

$$\Delta \mathbf{S}_i = -\begin{bmatrix}
\Phi_{i \to j, \text{adv}}^{\text{C}} + \Phi_{i \to j, \text{diff}}^{\text{C}} \\
\Phi_{i \to j, \text{adv}}^{\text{N}} + \Phi_{i \to j, \text{diff}}^{\text{N}} \\
\Phi_{i \to j, \text{adv}}^{\text{P}} + \Phi_{i \to j, \text{diff}}^{\text{P}} \\
\Phi_{i \to j, \text{adv}}^{\text{H}_2\text{O}} + \Phi_{i \to j, \text{diff}}^{\text{H}_2\text{O}} \\
\Phi_{i \to j, \text{adv}}^{\text{O}_2} + \Phi_{i \to j, \text{diff}}^{\text{O}_2} \\
\Phi_{i \to j, \text{adv}}^U + \Phi_{i \to j, \text{cond}}^U
\end{bmatrix}, \quad
\Delta \mathbf{S}_j = -\Delta \mathbf{S}_i$$

Net Conservation Identity:
$$\Delta \mathbf{S}_i + \Delta \mathbf{S}_j = \mathbf{0}$$

---

### 4. Second Law & Entropy Production

Entropy production on facet $\mathcal{F}_{ij}$ due to diffusion and conduction:
$$\dot{S}_{ij} = \sum_{k} \Phi_{i \to j, \text{diff}}^k \cdot R \ln\left(\frac{c_{i, k}}{c_{j, k}}\right) + \Phi_{i \to j, \text{cond}}^U \cdot \left(\frac{1}{T_j} - \frac{1}{T_i}\right)$$

Since $\Phi_{i \to j, \text{diff}}^k \propto (c_{i, k} - c_{j, k})$ and $\ln(x/y)$ has the same sign as $(x - y)$, and $\Phi_{i \to j, \text{cond}}^U \propto (T_i - T_j)$ while $(1/T_j - 1/T_i) = \frac{T_i - T_j}{T_i T_j}$:
$$\dot{S}_{ij} \ge 0 \quad \forall i, j$$
Guaranteeing that no spurious spatial anti-diffusion or energy creation can occur.

---

### 5. Executable Monad Process Methods

Below are the executable monad functions formalizing adjacency verification, flux computation, and thermodynamic conservation.

```typescript
import { areCartesianUnitVectorsEqual3D, DEFAULT_ANGULAR_EPSILON } from './h3_adjacency';
import { CartesianVector3D } from './h3_types';

export interface CellBiogeochemicalStock {
  readonly cellIndex: string;
  readonly carbonMol: number;       // mol C
  readonly nitrogenMol: number;     // mol N
  readonly phosphorusMol: number;   // mol P
  readonly waterMol: number;         // mol H2O
  readonly oxygenMol: number;        // mol O2
  readonly thermalEnergyJoules: number; // J
  readonly volumeM3: number;        // m^3
  readonly centroid: CartesianVector3D;
}

export interface DirectedBoundaryFacet {
  readonly originCell: string;
  readonly neighborCell: string;
  readonly originV1: CartesianVector3D;
  readonly originV2: CartesianVector3D;
  readonly neighborV1: CartesianVector3D;
  readonly neighborV2: CartesianVector3D;
  readonly areaM2: number;
  readonly normalVelocityMs: number; // positive outward from origin
  readonly distanceM: number;
}

export interface StockTransferDelta {
  readonly deltaCarbonMol: number;
  readonly deltaNitrogenMol: number;
  readonly deltaPhosphorusMol: number;
  readonly deltaWaterMol: number;
  readonly deltaOxygenMol: number;
  readonly deltaThermalEnergyJoules: number;
}

export interface BoundaryTransferResult {
  readonly isValidConjugate: boolean;
  readonly originDelta: StockTransferDelta;
  readonly neighborDelta: StockTransferDelta;
  readonly entropyProductionJPerK: number;
}

export class SpatialFluxMonad {
  private static readonly R_GAS = 8.314462618; // J / (mol K)
  private static readonly MOLAR_HEAT_CAP_H2O = 75.38; // J / (mol K)
  private static readonly DIFF_COEFF_SOLUTE = 1.0e-9; // m^2 / s
  private static readonly THERMAL_COND_COEFF = 0.6; // W / (m K)

  /**
   * Verifies mutual conjugacy between cell edge facets using angular tolerance.
   * Tests: originV1 == neighborV2 AND originV2 == neighborV1
   */
  public static verifyFacetConjugacy(
    facet: DirectedBoundaryFacet,
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): boolean {
    const forwardMatch =
      areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2, epsilon) &&
      areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1, epsilon);

    return forwardMatch;
  }

  /**
   * Computes conservative mass and energy transfer across a verified interface.
   * Enforces exact skew-symmetry: deltaOrigin + deltaNeighbor == 0.
   */
  public static computeFacetTransfer(
    origin: CellBiogeochemicalStock,
    neighbor: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    deltaTimeSeconds: number,
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): BoundaryTransferResult {
    const isConjugate = this.verifyFacetConjugacy(facet, epsilon);
    const zeroDelta: StockTransferDelta = {
      deltaCarbonMol: 0,
      deltaNitrogenMol: 0,
      deltaPhosphorusMol: 0,
      deltaWaterMol: 0,
      deltaOxygenMol: 0,
      deltaThermalEnergyJoules: 0,
    };

    if (!isConjugate) {
      return {
        isValidConjugate: false,
        originDelta: zeroDelta,
        neighborDelta: zeroDelta,
        entropyProductionJPerK: 0,
      };
    }

    // Concentrations in mol / m^3
    const cOrigin = {
      C: origin.carbonMol / origin.volumeM3,
      N: origin.nitrogenMol / origin.volumeM3,
      P: origin.phosphorusMol / origin.volumeM3,
      H2O: origin.waterMol / origin.volumeM3,
      O2: origin.oxygenMol / origin.volumeM3,
    };

    const cNeighbor = {
      C: neighbor.carbonMol / neighbor.volumeM3,
      N: neighbor.nitrogenMol / neighbor.volumeM3,
      P: neighbor.phosphorusMol / neighbor.volumeM3,
      H2O: neighbor.waterMol / neighbor.volumeM3,
      O2: neighbor.oxygenMol / neighbor.volumeM3,
    };

    // Temperatures in K (approximated from water molar heat capacity)
    const tOrigin = Math.max(
      1.0,
      origin.thermalEnergyJoules / (Math.max(1.0, origin.waterMol) * this.MOLAR_HEAT_CAP_H2O)
    );
    const tNeighbor = Math.max(
      1.0,
      neighbor.thermalEnergyJoules / (Math.max(1.0, neighbor.waterMol) * this.MOLAR_HEAT_CAP_H2O)
    );

    const volumetricFlowRate = facet.normalVelocityMs * facet.areaM2; // m^3 / s

    // 1. Advective transfer (Upwind)
    const computeAdvection = (cO: number, cN: number): number => {
      const concentration = volumetricFlowRate >= 0 ? cO : cN;
      return concentration * volumetricFlowRate * deltaTimeSeconds;
    };

    const advC = computeAdvection(cOrigin.C, cNeighbor.C);
    const advN = computeAdvection(cOrigin.N, cNeighbor.N);
    const advP = computeAdvection(cOrigin.P, cNeighbor.P);
    const advH2O = computeAdvection(cOrigin.H2O, cNeighbor.H2O);
    const advO2 = computeAdvection(cOrigin.O2, cNeighbor.O2);

    const heatVolOrigin = (origin.thermalEnergyJoules / origin.volumeM3);
    const heatVolNeighbor = (neighbor.thermalEnergyJoules / neighbor.volumeM3);
    const advThermal = (volumetricFlowRate >= 0 ? heatVolOrigin : heatVolNeighbor) *
      volumetricFlowRate * deltaTimeSeconds;

    // 2. Diffusive transfer (Fick's Law)
    const diffAreaDist = (facet.areaM2 / Math.max(1.0, facet.distanceM)) * deltaTimeSeconds;
    const diffC = this.DIFF_COEFF_SOLUTE * (cOrigin.C - cNeighbor.C) * diffAreaDist;
    const diffN = this.DIFF_COEFF_SOLUTE * (cOrigin.N - cNeighbor.N) * diffAreaDist;
    const diffP = this.DIFF_COEFF_SOLUTE * (cOrigin.P - cNeighbor.P) * diffAreaDist;
    const diffH2O = this.DIFF_COEFF_SOLUTE * (cOrigin.H2O - cNeighbor.H2O) * diffAreaDist;
    const diffO2 = this.DIFF_COEFF_SOLUTE * (cOrigin.O2 - cNeighbor.O2) * diffAreaDist;

    // 3. Thermal Conduction (Fourier's Law)
    const condThermal = this.THERMAL_COND_COEFF * (tOrigin - tNeighbor) * diffAreaDist;

    // Total transfers from origin -> neighbor
    const transferC = advC + diffC;
    const transferN = advN + diffN;
    const transferP = advP + diffP;
    const transferH2O = advH2O + diffH2O;
    const transferO2 = advO2 + diffO2;
    const transferThermal = advThermal + condThermal;

    // Dissipation / Entropy production (Diffusive + Conductive components)
    let sDiff = 0;
    const species = [
      [diffC, cOrigin.C, cNeighbor.C],
      [diffN, cOrigin.N, cNeighbor.N],
      [diffP, cOrigin.P, cNeighbor.P],
      [diffH2O, cOrigin.H2O, cNeighbor.H2O],
      [diffO2, cOrigin.O2, cNeighbor.O2],
    ];
    for (const [flux, co, cn] of species) {
      if (co > 1e-12 && cn > 1e-12) {
        sDiff += flux * this.R_GAS * Math.log(co / cn);
      }
    }
    const sCond = condThermal * (1.0 / tNeighbor - 1.0 / tOrigin);
    const totalEntropyProduction = Math.max(0, sDiff + sCond);

    const originDelta: StockTransferDelta = {
      deltaCarbonMol: -transferC,
      deltaNitrogenMol: -transferN,
      deltaPhosphorusMol: -transferP,
      deltaWaterMol: -transferH2O,
      deltaOxygenMol: -transferO2,
      deltaThermalEnergyJoules: -transferThermal,
    };

    const neighborDelta: StockTransferDelta = {
      deltaCarbonMol: transferC,
      deltaNitrogenMol: transferN,
      deltaPhosphorusMol: transferP,
      deltaWaterMol: transferH2O,
      deltaOxygenMol: transferO2,
      deltaThermalEnergyJoules: transferThermal,
    };

    return {
      isValidConjugate: true,
      originDelta,
      neighborDelta,
      entropyProductionJPerK: totalEntropyProduction,
    };
  }
}
```

---

### 6. Process Mining & Verification Checklist

| Metric / Property | Expected Equation / Constraint | Monad Invariance |
|---|---|---|
| **Facet Angular Equality** | $\theta = \arccos(\operatorname{clamp}(\mathbf{u}\cdot\mathbf{w}, -1, 1)) \le 10^{-9}$ | `verifyFacetConjugacy(...) === true` |
| **Global Mass Conservation** | $\sum_{\text{cells}} \Delta M_k = 0$ | Skew-symmetric deltas: $\Delta \mathbf{S}_i = -\Delta \mathbf{S}_j$ |
| **Global Energy Conservation** | $\sum_{\text{cells}} \Delta U = 0$ | Skew-symmetric deltas: $\Delta U_i = -\Delta U_j$ |
| **Positivity of Entropy Production** | $\dot{S}_{ij} = \sum J_k \Delta \mu_k + J_U \Delta(1/T) \ge 0$ | Guaranteed by Fick/Fourier gradient descent |
| **Numerical Singularity Guard** | Clamping $\mathbf{u} \cdot \mathbf{w} \in [-1, 1]$ before $\arccos$ | Prevents `NaN` generation from IEEE 754 precision overshoot |