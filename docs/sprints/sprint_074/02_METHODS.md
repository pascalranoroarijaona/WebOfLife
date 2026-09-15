# Process Mining & Thermodynamic Delta Specification: Sprint 074
**Topological Invariant Enforcement and `PentagonalCoordinationViolationError`**

---

## 1. Domain & Physical Systems Research

### 1.1 Topo-Geometrical Invariants on the Icosahedral Aperture-3 DGGS
The Gaia spatial simulation engine discretizes the planetary surface ($\mathbb{S}^2$) using an aperture-3 hexagonal Discrete Global Grid System (DGGS, based on Uber H3). By the Gauss-Bonnet theorem and Euler's polyhedral formula:
$$\chi(\mathbb{S}^2) = V - E + F = 2$$
In any vertex-degree-3 spherical tessellation comprising $F_5$ pentagons and $F_6$ hexagons:
$$2E = 3V = 5F_5 + 6F_6$$
$$V = \frac{5F_5 + 6F_6}{3}, \quad E = \frac{5F_5 + 6F_6}{2}$$
$$\chi(\mathbb{S}^2) = \frac{5F_5 + 6F_6}{3} - \frac{5F_5 + 6F_6}{2} + (F_5 + F_6) = \frac{F_5}{6} = 2 \implies F_5 = 12$$

Thus, across all resolutions $r \ge 0$, exactly 12 pentagonal cell singularities exist. 
- **Hexagonal cell coordination:** $k = |N(c_{\text{hex}})| \equiv 6$
- **Pentagonal cell coordination:** $k = |N(c_{\text{pent}})| \equiv 5$

### 1.2 Non-Conservative Mass-Energy Leakage Under Valence Corruption
Let $S_i$ be an extensive state vector of conserved stocks at cell $c_i$:
$$S_i = \begin{bmatrix} M_{\text{C}} \\ M_{\text{H}_2\text{O}} \\ M_{\text{minerals}} \\ M_{\text{O}_2} \\ E_{\text{thermal}} \end{bmatrix}_i$$
For finite-volume cell $c_i$ with area $A_i$ and perimeter boundary segments $\{e_{ij}\}_{j=1}^k$ with lengths $l_{ij}$, the continuous advective-diffusive flux divergence is discretized as:
$$\frac{dS_i}{dt} = -\frac{1}{A_i} \sum_{j \in N(c_i)} \mathbf{J}_{ij} \cdot \mathbf{n}_{ij} \, l_{ij} + \dot{\Omega}_{\text{metabolic}, i}$$
where:
- $\mathbf{J}_{ij}$ is the inter-cell flux tensor (mass/energy per unit boundary length per second),
- $\mathbf{n}_{ij}$ is the outward-pointing unit normal across edge $e_{ij}$,
- Directed edge anti-symmetry guarantees exact conservation across shared faces:
  $$\mathbf{J}_{ij} \cdot \mathbf{n}_{ij} \, l_{ij} = -\mathbf{J}_{ji} \cdot \mathbf{n}_{ji} \, l_{ji}$$

#### Spurious Delta on Coordination Failure
If a pentagonal singularity ($k_{\text{expected}} = 5$) is processed with a corrupted neighbor degree $k_{\text{actual}} \neq 5$:
1. **Over-coordination ($k_{\text{actual}} = 6$ via fictitious edge $e_{i6}$):**
   $$\Delta S_{\text{leak}} = \oint_{\text{unpaired}} \mathbf{J}_{i6} \cdot \mathbf{n}_{i6} \, l_{i6} \, \Delta t \neq 0$$
   Because no reciprocal edge exists on adjacent cells ($j \notin N(c_i)$), an unclosed boundary flux loop injects or destroys scalar mass and enthalpy without an entropy production conjugate, violating the First Law:
   $$\sum_{i \in \text{Grid}} \Delta S_i \neq 0$$
2. **Under-coordination ($k_{\text{actual}} < 5$ due to boundary truncation):**
   Unaccounted edge boundaries omit physical interfacial transport across active hydrological, ecological, or atmospheric fronts, stranding stock deltas and corrupting the spatial Laplacian $\nabla^2 S$.

Halting execution via `PentagonalCoordinationViolationError(cellIndex, 5, actualCount)` establishes fail-fast semantics before numerical divergence corrupts the thermodynamic state tensor.

---

## 2. Stock Vector Formalization & Thermodynamic State

Each discrete cell $c_i$ holds a state stock vector $S_i(t) \in \mathbb{R}^5_+$:

| Stock Name | Symbol | Units | Physical / Thermodynamic Definition |
| :--- | :--- | :--- | :--- |
| **Biomass Carbon** | $M_{\text{C}}$ | $\text{kg C}$ | Organic carbon contained in vegetation, microbial biomass, and detritus. |
| **Water Mass** | $M_{\text{H}_2\text{O}}$ | $\text{kg H}_2\text{O}$ | Surface and vadose-zone soil water. |
| **Bio-available Minerals** | $M_{\text{min}}$ | $\text{kg NPK}$ | Soluble reactive nitrogen ($NO_3^-, NH_4^+$), phosphorus, and potassium. |
| **Dissolved / Soil Oxygen** | $M_{\text{O}_2}$ | $\text{kg O}_2$ | Free molecular oxygen available for aerobic metabolic oxidation. |
| **Thermal Energy** | $E_{\text{th}}$ | $\text{MJ}$ | Sensible and latent heat content: $E_{\text{th}} = \sum_k M_k c_{p,k} (T_i - T_{\text{ref}})$. |

### 2.1 Conservative Interfacial Flux Formulation
The discrete edge flux vector between cell $c_i$ and neighbor $c_j$ over time step $\Delta t$ is:
$$\Delta S_{ij} = \mathbf{J}_{ij} \cdot l_{ij} \Delta t$$
$$\Delta S_{ij} = \begin{bmatrix}
\Delta M_{\text{C}, ij} \\
\Delta M_{\text{H}_2\text{O}, ij} \\
\Delta M_{\text{min}, ij} \\
\Delta M_{\text{O}_2, ij} \\
\Delta E_{\text{th}, ij}
\end{bmatrix} = 
\begin{bmatrix}
v_{ij} \overline{\rho}_{\text{C}, ij} l_{ij} + D_{\text{C}} \frac{\rho_{\text{C}, j} - \rho_{\text{C}, i}}{d_{ij}} l_{ij} \\
v_{ij} \overline{\rho}_{\text{H}_2\text{O}, ij} l_{ij} + K_h \frac{h_j - h_i}{d_{ij}} l_{ij} \\
v_{ij} \overline{\rho}_{\text{min}, ij} l_{ij} + D_{\text{min}} \frac{\rho_{\text{min}, j} - \rho_{\text{min}, i}}{d_{ij}} l_{ij} \\
v_{ij} \overline{\rho}_{\text{O}_2, ij} l_{ij} + D_{\text{O}_2} \frac{\rho_{\text{O}_2, j} - \rho_{\text{O}_2, i}}{d_{ij}} l_{ij} \\
v_{ij} \overline{\rho}_{\text{H}_2\text{O}, ij} c_{p,w} \overline{T}_{ij} l_{ij} + \kappa_{\text{th}} \frac{T_j - T_i}{d_{ij}} l_{ij}
\end{bmatrix} \Delta t$$
where:
- $v_{ij} = -v_{ji}$ is normal advective velocity across the dual edge,
- $d_{ij}$ is geodesic centroid-to-centroid distance,
- $l_{ij}$ is metric dual edge length:
  $$l_{\text{hex}} = \frac{2}{\sqrt{3}} \sqrt{\frac{2 A_6}{3\sqrt{3}}}, \quad l_{\text{pent}} = \frac{2}{\sqrt{5}} \sqrt{\frac{4 A_5}{5 \cot(\pi/5)}}$$

### 2.2 Invariant Conservation Identity
To satisfy the First Law across the closed planetary grid $\mathcal{G} = \{c_1, \dots, c_N\}$:
$$\sum_{i=1}^N \sum_{j \in N(c_i)} \Delta S_{ij} \equiv \mathbf{0}$$
If any pentagonal cell has an undetected extra edge or omitted edge ($|N(c_{\text{pent}})| \ne 5$), skew-symmetry breaks:
$$\sum_{i=1}^N \sum_{j \in N(c_i)} \Delta S_{ij} = \sum_{\text{anomalous } e_{ik}} \mathbf{J}_{ik} l_{ik} \Delta t \ne \mathbf{0}$$

---

## 3. Executable Monad Method Specification

The Spatial Flux State Monad evaluates cell adjacency before computing transport deltas. If coordination fails, the monad short-circuits evaluation by raising `PentagonalCoordinationViolationError`.

### 3.1 Adjacency Validation Monad Method

```typescript
import { PentagonalCoordinationViolationError } from '../spatial/h3_adjacency';

export interface CellThermodynamicState {
  cellIndex: string;
  isPentagon: boolean;
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  thermalEnergyMJ: number;
  temperatureKelvin: number;
}

export interface EdgeFluxDelta {
  fromCell: string;
  toCell: string;
  edgeLengthM: number;
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaMineralsKg: number;
  deltaOxygenKg: number;
  deltaThermalEnergyMJ: number;
}

export class SpatialFluxMonad {
  private constructor(
    private readonly state: Map<string, CellThermodynamicState>,
    private readonly adjacencyMap: Map<string, string[]>
  ) {}

  public static of(
    state: Map<string, CellThermodynamicState>,
    adjacencyMap: Map<string, string[]>
  ): SpatialFluxMonad {
    return new SpatialFluxMonad(state, adjacencyMap);
  }

  /**
   * Topological Invariant Guard:
   * Asserts that all pentagonal cells exhibit exact coordination degree k = 5.
   * Hexagonal cells assert coordination degree k = 6.
   * Throws PentagonalCoordinationViolationError if pentagonal valence is violated.
   */
  public assertTopologicalInvariants(): SpatialFluxMonad {
    for (const [cellIndex, cellState] of this.state.entries()) {
      const neighbors = this.adjacencyMap.get(cellIndex) ?? [];
      const actualCount = neighbors.length;

      if (cellState.isPentagon) {
        const expectedCount = 5;
        if (actualCount !== expectedCount) {
          throw new PentagonalCoordinationViolationError(
            cellIndex,
            expectedCount,
            actualCount
          );
        }
      } else {
        const expectedCount = 6;
        if (actualCount !== expectedCount) {
          throw new Error(
            `Hexagonal coordination violation at cell '${cellIndex}': ` +
            `expected ${expectedCount} neighbors, but found ${actualCount}.`
          );
        }
      }
    }
    return this;
  }

  /**
   * Computes conservative mass and heat transport deltas across all valid dual edges.
   */
  public computeIntercellFluxes(
    dtSeconds: number,
    advectionVelocityMPerS: number,
    dispersionCoeffM2PerS: number
  ): EdgeFluxDelta[] {
    // Enforce topological invariants prior to flux evaluation
    this.assertTopologicalInvariants();

    const edgeDeltas: EdgeFluxDelta[] = [];
    const processedEdges = new Set<string>();

    for (const [cellIndex, source] of this.state.entries()) {
      const neighbors = this.adjacencyMap.get(cellIndex)!;
      const metricEdgeLength = source.isPentagon ? 582.4 : 512.3; // Resolution-dependent boundary length (m)
      const distanceM = 1000.0; // Distance between centroids (m)

      for (const neighborIndex of neighbors) {
        const edgeKey = [cellIndex, neighborIndex].sort().join('<->');
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);

        const target = this.state.get(neighborIndex);
        if (!target) continue;

        // Diffusive / Gradient-driven mass transfer
        const dC = (target.carbonKg - source.carbonKg) / distanceM;
        const dH2O = (target.waterKg - source.waterKg) / distanceM;
        const dMin = (target.mineralsKg - source.mineralsKg) / distanceM;
        const dO2 = (target.oxygenKg - source.oxygenKg) / distanceM;
        const dTemp = (target.temperatureKelvin - source.temperatureKelvin) / distanceM;

        const fluxC = dispersionCoeffM2PerS * dC * metricEdgeLength * dtSeconds;
        const fluxH2O = dispersionCoeffM2PerS * dH2O * metricEdgeLength * dtSeconds;
        const fluxMin = dispersionCoeffM2PerS * dMin * metricEdgeLength * dtSeconds;
        const fluxO2 = dispersionCoeffM2PerS * dO2 * metricEdgeLength * dtSeconds;
        const fluxHeat = 4.184e-3 * fluxH2O * dTemp; // MJ from water heat capacity

        edgeDeltas.push({
          fromCell: cellIndex,
          toCell: neighborIndex,
          edgeLengthM: metricEdgeLength,
          deltaCarbonKg: fluxC,
          deltaWaterKg: fluxH2O,
          deltaMineralsKg: fluxMin,
          deltaOxygenKg: fluxO2,
          deltaThermalEnergyMJ: fluxHeat
        });
      }
    }

    return edgeDeltas;
  }
}
```

---

## 4. Test Vectors & Failure Modes

### 4.1 Vector 1: Valid Pentagonal Topology ($k = 5$)
- **Input Cell:** `0x821c07fffffffff` (`isPentagon: true`)
- **Neighbors:** `['0x821c00fffffffff', '0x821c01fffffffff', '0x821c02fffffffff', '0x821c03fffffffff', '0x821c04fffffffff']`
- **Actual Neighbor Count:** 5
- **Expected Count:** 5
- **Result:** `assertTopologicalInvariants()` passes; flux summation is skew-symmetric:
  $$\sum \Delta S_{\text{edges}} = 0$$

### 4.2 Vector 2: Over-Coordinated Pentagonal Anomaly ($k = 6$)
- **Input Cell:** `0x821c07fffffffff` (`isPentagon: true`)
- **Neighbors:** `[n1, n2, n3, n4, n5, n6]`
- **Actual Neighbor Count:** 6
- **Expected Count:** 5
- **Result:** Throws `PentagonalCoordinationViolationError`:
  - `name`: `'PentagonalCoordinationViolationError'`
  - `cellIndex`: `'0x821c07fffffffff'`
  - `expectedCount`: 5
  - `actualCount`: 6
  - `message`: `"Pentagonal coordination violation at cell '0x821c07fffffffff': expected 5 neighbors, but found 6."`

### 4.3 Vector 3: Truncated / Boundary-Corrupted Pentagonal Singularity ($k = 4$)
- **Input Cell:** `0x821c07fffffffff` (`isPentagon: true`)
- **Neighbors:** `[n1, n2, n3, n4]`
- **Actual Neighbor Count:** 4
- **Expected Count:** 5
- **Result:** Throws `PentagonalCoordinationViolationError(cellIndex, 5, 4)` before state vector corruption occurs.