# Process Mining & Research Specification: Pentagon Directional Topology & Flux Monad

**Sprint:** 083  
**RFC Reference:** RFC-083 (Pentagon Directional Topology Specification)  
**Target Interfaces:** `PentagonDirectionalTopology`, `H3Direction` in `src/spatial/h3_types.ts`  
**Thermodynamic Scope:** Discrete Divergence Operator, 1st Law Mass & Energy Conservation on Geodesic Valence-5 Singularities, Advective-Diffusive Dispersal Bounds.

---

## 1. Physical, Biological & Geodesic Context

### 1.1 Geodesic Pentagonal Singularities
On any spherical discrete global grid derived from a subdivision of an icosahedron (such as Uber's H3 aperture-3 hexagonal discrete global grid system), Euler's polyhedral formula ($V - E + F = 2$) enforces that a closed 2-manifold of spherical topology cannot be tiled exclusively by regular hexagons. At every discrete resolution $r \in \mathbb{N}_0$, there exist exactly 12 topologically non-hexagonal cells:
$$|\mathcal{P}_r| = 12 \quad \forall r \ge 0$$
Each pentagon $p \in \mathcal{P}_r$ exhibits coordination number (valence) $k=5$, whereas hexagonal cells $h \in \mathcal{H}_r = \mathcal{V}_r \setminus \mathcal{P}_r$ exhibit coordination number $k=6$.

In canonical H3 coordinate space, adjacent directional facets are indexed by discrete directional labels $\mathcal{D} = \{1, 2, 3, 4, 5, 6\}$.
For any pentagon $p$, exactly one directional axis $d_\varnothing(p) \in \mathcal{D}$ is missing/degenerate:
$$\mathcal{D}_{\text{present}}(p) = \mathcal{D} \setminus \{ d_\varnothing(p) \}, \quad |\mathcal{D}_{\text{present}}(p)| = 5$$
$$\mathcal{D}_{\text{omitted}}(p) = \{ d_\varnothing(p) \}, \quad |\mathcal{D}_{\text{omitted}}(p)| = 1$$

### 1.2 Conservation Laws Across Singular Cells
The simulation tracks five conserved fundamental state stocks $\vec{S} \in \mathbb{R}^5_{\ge 0}$ per cell:
$$\vec{S} = \begin{bmatrix} S_C \\ S_W \\ S_M \\ S_O \\ S_E \end{bmatrix} = \begin{bmatrix} \text{Carbon Stock } (\text{mol C}) \\ \text{Water Stock } (\text{kg } \mathrm{H_2O}) \\ \text{Mineral/Nutrient Stock } (\text{mol P/N}) \\ \text{Dissolved/Gaseous Oxygen } (\text{mol } \mathrm{O_2}) \\ \text{Thermal Internal Energy } (\text{J}) \end{bmatrix}$$

For a regular hexagonal cell $h$, spatial mass-energy exchange operates across all 6 directional facets:
$$\left( \frac{\mathrm{d}\vec{S}_h}{\mathrm{d}t} \right)_{\text{transport}} = \sum_{d=1}^6 \vec{J}_{d \to h} A_{h, d} - \sum_{d=1}^6 \vec{J}_{h \to d} A_{h, d}$$
where $\vec{J}_{h \to d}$ is the directional flux vector density ($\text{unit} \cdot \mathrm{m^{-2} \cdot s^{-1}}$) and $A_{h,d}$ is the facet contact area ($\mathrm{m^2}$).

If this operator is naively applied to a pentagon cell $p$ assuming 6 uniform neighbors:
1. Routing flux toward $d_\varnothing(p)$ allocates mass into an unmapped coordinate buffer, producing immediate mass/energy destruction ($\Delta M < 0$).
2. Sampling gradient $\nabla \vec{S}$ across $d_\varnothing(p)$ yields `NaN`, `null`, or arbitrary memory drift.
3. The First Law of Thermodynamics ($\Delta E - Q + W = 0$) is violated.

Therefore, the discrete divergence operator on pentagon $p$ must be strictly bounded to $\mathcal{D}_{\text{present}}(p)$:
$$\left( \frac{\mathrm{d}\vec{S}_p}{\mathrm{d}t} \right)_{\text{transport}} = \sum_{d \in \mathcal{D}_{\text{present}}(p)} \left( \vec{J}_{d \to p} A_{p, d} - \vec{J}_{p \to d} A_{p, d} \right)$$
with the hard boundary condition:
$$\vec{J}_{p \to d_\varnothing(p)} \equiv \mathbf{0}, \quad \vec{J}_{d_\varnothing(p) \to p} \equiv \mathbf{0}$$

---

## 2. Mass & Energy Flux Equations on Pentagonal Facets

### 2.1 Facet Geometry & Metric Discretization
For a resolution $r$ cell:
- Standard hexagonal cell area: $A_{\text{hex}}(r)$
- Pentagonal cell area: $A_{\text{pent}}(r) \approx \frac{5}{6} A_{\text{hex}}(r)$
- Hexagon facet contact length: $L_{\text{hex}}(r)$
- Pentagon facet contact length: $L_{\text{pent}}(r) \approx L_{\text{hex}}(r) \cdot \sqrt{\frac{5}{6 \times \cos(\pi/5)}}$
- Effective cross-sectional interaction area for cell column depth $H$: $A_{p, d} = L_{\text{pent}}(r) \cdot H$.

### 2.2 Directional Advection-Diffusion Tensor
For each present direction $d \in \mathcal{D}_{\text{present}}(p)$ connecting pentagon $p$ to neighbor cell $n = \mathcal{N}_d(p)$:
1. **Advective Flux:**
   $$\vec{J}_{\text{adv}, p \to d} = \max(0, \vec{u}_{p, d} \cdot \hat{n}_{p, d}) \cdot \frac{\vec{S}_p}{V_p} + \min(0, \vec{u}_{p, d} \cdot \hat{n}_{p, d}) \cdot \frac{\vec{S}_n}{V_n}$$
   where $\vec{u}_{p, d}$ is the fluid velocity vector (wind/ocean current) and $\hat{n}_{p, d}$ is the unit outward normal along directional facet $d$.

2. **Diffusive / Gradient Flux (Fick's / Fourier's Law):**
   $$\vec{J}_{\text{diff}, p \to d} = -\mathbf{D} \frac{\frac{\vec{S}_n}{V_n} - \frac{\vec{S}_p}{V_p}}{\Delta x_{p, d}}$$
   where $\mathbf{D} = \mathrm{diag}(D_C, D_W, D_M, D_O, \alpha_T)$ is the diagonal diffusivity/conductivity tensor and $\Delta x_{p, d}$ is the inter-cell geodesic distance.

3. **Total Flux Vector:**
   $$\vec{J}_{p \to d} = \begin{cases} 
   \vec{J}_{\text{adv}, p \to d} + \vec{J}_{\text{diff}, p \to d}, & \text{if } d \in \mathcal{D}_{\text{present}}(p) \\
   \mathbf{0}, & \text{if } d = d_\varnothing(p)
   \end{cases}$$

### 2.3 Exact Mass and Energy Deltas per Simulation Step ($\Delta t$)
For pentagonal cell $p$, the exact stock balance over time-step $\Delta t$ is:

$$\begin{aligned}
\Delta S_{C, p} &= \Delta t \sum_{d \in \mathcal{D}_{\text{present}}(p)} A_{p, d} \left( J_{C, d \to p} - J_{C, p \to d} \right) \\
\Delta S_{W, p} &= \Delta t \sum_{d \in \mathcal{D}_{\text{present}}(p)} A_{p, d} \left( J_{W, d \to p} - J_{W, p \to d} \right) \\
\Delta S_{M, p} &= \Delta t \sum_{d \in \mathcal{D}_{\text{present}}(p)} A_{p, d} \left( J_{M, d \to p} - J_{M, p \to d} \right) \\
\Delta S_{O, p} &= \Delta t \sum_{d \in \mathcal{D}_{\text{present}}(p)} A_{p, d} \left( J_{O, d \to p} - J_{O, p \to d} \right) \\
\Delta S_{E, p} &= \Delta t \sum_{d \in \mathcal{D}_{\text{present}}(p)} A_{p, d} \left( J_{E, d \to p} - J_{E, p \to d} \right)
\end{aligned}$$

**Global Mass Conservation Invariant:**
Summing across the entire global discrete domain $\mathcal{V}_r = \mathcal{H}_r \cup \mathcal{P}_r$:
$$\sum_{i \in \mathcal{V}_r} \Delta \vec{S}_i \equiv \mathbf{0}$$
Because every active edge $(p, n)$ traversed by $d \in \mathcal{D}_{\text{present}}(p)$ maps to a reciprocal edge on neighbor $n$, and $d_\varnothing(p)$ has zero flux, no mass leaks from the spherical manifold.

---

## 3. Monad Implementation Specifications

### 3.1 Type Definitions (`src/spatial/h3_types.ts`)
The directional types must enforce immutability, exact direction values, and valence-5 topology:

```typescript
/**
 * Canonical directional indices in H3 discrete coordinate space.
 * Directions 1..6 represent adjacent cell neighbor facets.
 */
export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Directional topology of an H3 pentagonal cell.
 * Pentagons possess valence-5 connectivity, leaving exactly one
 * canonical directional facet omitted.
 */
export interface PentagonDirectionalTopology {
  /**
   * The 5 active directional axes connecting the pentagon to adjacent cells.
   * Guaranteed to contain exactly 5 distinct directions.
   */
  readonly presentDirections: readonly H3Direction[];

  /**
   * The single directional axis omitted from the pentagon's 6-neighborhood.
   * Any flux vector along this direction is strictly zero.
   */
  readonly omittedDirection: H3Direction;
}
```

### 3.2 Topological Invariant Guard Specification
Every instantiation of `PentagonDirectionalTopology` must satisfy three axiomatic checks:

$$\begin{cases}
(1) \quad |\text{presentDirections}| = 5 \\
(2) \quad \text{omittedDirection} \notin \text{presentDirections} \\
(3) \quad \text{set}(\text{presentDirections}) \cup \{\text{omittedDirection}\} = \{1, 2, 3, 4, 5, 6\}
\end{cases}$$

### 3.3 Executable Monadic Flux Method

```typescript
export interface StockVector {
  readonly carbon: number;    // mol C
  readonly water: number;     // kg H2O
  readonly minerals: number;  // mol P/N
  readonly oxygen: number;    // mol O2
  readonly energy: number;    // Joules
}

export interface DirectionalFlux {
  readonly direction: H3Direction;
  readonly delta: StockVector;
}

/**
 * Spatial Flux Monad step for Pentagonal Cells.
 * Routes stock transfers strictly along present directions.
 */
export class PentagonFluxMonad {
  /**
   * Validates structural invariants of the pentagon topology.
   */
  public static validateTopology(topology: PentagonDirectionalTopology): boolean {
    if (topology.presentDirections.length !== 5) {
      return false;
    }

    const directionSet = new Set<H3Direction>(topology.presentDirections);
    if (directionSet.size !== 5) {
      return false;
    }

    if (directionSet.has(topology.omittedDirection)) {
      return false;
    }

    const allDirections: H3Direction[] = [1, 2, 3, 4, 5, 6];
    return allDirections.every(d => d === topology.omittedDirection || directionSet.has(d));
  }

  /**
   * Applies directional fluxes across pentagonal cell boundaries.
   * Rejects any flux scheduled along `omittedDirection` with an invariant error.
   */
  public static computePentagonDeltas(
    topology: PentagonDirectionalTopology,
    inboundFluxes: readonly DirectionalFlux[],
    outboundFluxes: readonly DirectionalFlux[]
  ): StockVector {
    if (!this.validateTopology(topology)) {
      throw new Error("Invalid PentagonDirectionalTopology invariant violation");
    }

    // Guardrail: verify no flux attempted on omittedDirection
    const invalidInbound = inboundFluxes.find(f => f.direction === topology.omittedDirection);
    const invalidOutbound = outboundFluxes.find(f => f.direction === topology.omittedDirection);

    if (invalidInbound || invalidOutbound) {
      throw new Error(
        `First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`
      );
    }

    let netCarbon = 0;
    let netWater = 0;
    let netMinerals = 0;
    let netOxygen = 0;
    let netEnergy = 0;

    // Accumulate inbound fluxes across present directions
    for (const flux of inboundFluxes) {
      netCarbon += flux.delta.carbon;
      netWater += flux.delta.water;
      netMinerals += flux.delta.minerals;
      netOxygen += flux.delta.oxygen;
      netEnergy += flux.delta.energy;
    }

    // Deduct outbound fluxes across present directions
    for (const flux of outboundFluxes) {
      netCarbon -= flux.delta.carbon;
      netWater -= flux.delta.water;
      netMinerals -= flux.delta.minerals;
      netOxygen -= flux.delta.oxygen;
      netEnergy -= flux.delta.energy;
    }

    return {
      carbon: netCarbon,
      water: netWater,
      minerals: netMinerals,
      oxygen: netOxygen,
      energy: netEnergy,
    };
  }
}
```

---

## 4. Verification & Validation Metrics

| Test Case | Method | Expected Outcome |
| :--- | :--- | :--- |
| **Completeness** | Check union of `presentDirections` and `omittedDirection` | Exactly matches `{1, 2, 3, 4, 5, 6}` |
| **Disjointness** | `presentDirections.includes(omittedDirection)` | Returns `false` |
| **Cardinality** | `presentDirections.length` | Returns `5` |
| **Zero Omitted Flux** | Submit flux with `direction === omittedDirection` | Throws error; 0 mass delta committed |
| **Conservative Sum** | Route stocks between pentagon and 5 neighbors | Global sum $\sum \Delta S = 0$ within floating point tolerance ($10^{-14}$) |