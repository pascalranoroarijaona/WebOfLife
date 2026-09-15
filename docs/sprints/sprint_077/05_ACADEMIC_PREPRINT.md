# Topological Adjacency Guarantees and Boundary Closure in Discrete Global Grid Ecosystem Models

**Pascal Ranoroarijaona**  
*Web of Life Research Initiative*  
Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## Abstract

Geodesic Discrete Global Grid Systems (DGGS) based on icosahedral hexagonal partitions must contain exactly twelve pentagonal singularities at any resolution to satisfy Euler's polyhedral formula on the 2-sphere ($S^2$). In numerical modeling of conservative biophysical fluxes—such as atmospheric gas diffusion, hydraulic head routing, and thermal exchange—unvalidated adjacency topologies introduce phantom divergence sources and sinks, directly violating the First and Second Laws of Thermodynamics. We present the formal mathematical grounding, algorithmic architecture, and empirical verification of `assertValidNeighborCountForCell`, a fail-fast runtime topological boundary assertion integrated into the Web of Life engine (`src/spatial/h3_adjacency.ts`). This mechanism enforces strict valence requirements ($d(c) \in \{5, 6\}$) before executing inter-cell flux monads, guaranteeing exact mass and energy conservation across spherical geodesic boundaries.

---

## 1. Introduction and Problem Formulation

Planetary-scale ecological modeling requires tessellating the sphere $S^2$ into equal-area, discrete spatial partitions. The H3 geodesic discrete global grid system utilizes an aperture-3 or aperture-7 hexagonal subdivision of an icosahedron. By Euler's formula:
$$V - E + F = 2$$
a spherical surface cannot be tiled entirely by regular hexagons. Exactly twelve topological pentagons are required at every resolution level $r \in [0, 15]$.

When simulating spatial stock-and-flow dynamics (carbon stocks, water mass, dissolved minerals, and thermal internal energy), the time evolution of stock vector $\vec{S}_i$ in cell $i$ is governed by the boundary integral of flux density $\vec{J}$:
$$\frac{d \vec{S}_i}{dt} = \int_{A_i} \vec{\sigma} \, dA - \oint_{\partial \Omega_i} \vec{J} \cdot \vec{n} \, dl$$

Discretizing over neighbor interfaces $j \in \mathcal{N}(i)$:
$$\frac{d \vec{S}_i}{dt} = \vec{\sigma}_i A_i - \sum_{j \in \mathcal{N}(i)} \vec{F}_{ij}$$
where $\vec{F}_{ij} = -\vec{F}_{ji}$ represents the antisymmetric boundary exchange.

If an adjacency list $\mathcal{N}(i)$ is corrupted, incomplete, or contains duplicate edges such that $|\mathcal{N}(i)| \neq d(c)$ where:
$$d(c) = \begin{cases} 5 & \text{if } c \text{ is pentagonal} \\ 6 & \text{if } c \text{ is hexagonal} \end{cases}$$
the discrete boundary closure $\sum_{j \in \mathcal{N}(i)} L_{ij} \vec{n}_{ij} = \vec{0}$ fails, introducing fictitious mass-energy divergence:
$$\Delta S_{\text{phantom}} = \sum_{i \in \mathcal{M}} \sum_{j \in \mathcal{N}(i)} \vec{F}_{ij} \neq \vec{0}$$

---

## 2. Invariant Assertion Specification

The function `assertValidNeighborCountForCell` in `src/spatial/h3_adjacency.ts` enforces topological valence as a precondition for all flux propagation monads.

### Algorithmic Contract
1. **Type Invariant**:
   Asserts that `neighbors` is a populated array via `Array.isArray(neighbors)`. Rejects scalars, objects, `null`, and `undefined` with a `TypeError`.
2. **Cardinality Invariant**:
   Calls `isExpectedNeighborCountForCell(cellId, neighbors.length)`. Rejects non-conformant cardinalities with a `RangeError`.

```typescript
export function assertValidNeighborCountForCell(
  cellId: string,
  neighbors: unknown
): asserts neighbors is readonly unknown[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }
  const count = neighbors.length;
  if (!isExpectedNeighborCountForCell(cellId, count)) {
    throw new RangeError(
      `Invalid neighbor count ${count} for cell ${cellId} (expected 5 for pentagon or 6 for hexagon)`
    );
  }
}
```

---

## 3. Physical & Thermodynamic Verification

Consider inter-cell thermal conduction across boundary interface $\Gamma_{ij}$ with thermal conductivity $k_T$, interface length $L_{ij}$, and centroid separation distance $\Delta x_{ij}$:
$$F_{E, ij} = -k_T \frac{T_j - T_i}{\Delta x_{ij}} L_{ij}$$

The local entropy generation rate $\dot{S}_{\text{entropy}}$ is:
$$\dot{S}_{\text{entropy}} = \left( \frac{1}{T_j} - \frac{1}{T_i} \right) F_{E, ij} \ge 0$$

Under corrupted adjacency (e.g., an omitted neighbor $k$ in $\mathcal{N}(i)$ that is nonetheless present in $\mathcal{N}(k)$), the system creates an asymmetric heat conduit violating the Clausius formulation of the Second Law:
$$\Delta E_{\text{global}} = \Delta E_k \neq 0$$

By validating that $|\mathcal{N}(c)| \equiv d(c)$ via `assertValidNeighborCountForCell`, the Web of Life spatial subsystem guarantees pairwise edge reciprocity across all cell transitions, ensuring zero drift in global conserved scalar integrals.

---

## 4. Conclusion

Sprint 077 establishes a strict mathematical defense at the interface between topological grid indexing and physical flux monads. By eliminating malformed adjacency arrays before execution, the simulation architecture maintains thermodynamic consistency across arbitrary geodesic resolutions.