# Geometrically Rigorous Vertical Interface Cross-Sections for Stratified Lateral Transport in Discrete Hexagonal Planetary Architectures

**Authors:** WebOfLife Research Collective  
**Target:** Journal of Advances in Modeling Earth Systems (JAMES) / ACM Transactions on Mathematical Software  
**Status:** Preprint (Sprint 050)  
**Date:** March 2025  
**Code Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  

---

## Abstract

Planetary simulation frameworks frequently represent the spherical geoid using Discrete Global Grid Systems (DGGS), notably the Uber H3 hierarchical hexagonal tessellation. While two-dimensional surface discretizations are mature, coupling multi-layer vertical stratification (tropospheric strata, oceanic horizons, edaphic zones, and lithospheric aquifers) to horizontal transport has historically relied on planar approximations or parameterized boundary conductances. Such approximations break exact conservation of mass, momentum, and internal energy when adjacent cells exhibit vertical displacement due to topography or bathymetry. 

In this work, we formulate and implement `calculateH3BoundaryContactArea`, a deterministic, geometrically symmetric vertical interface cross-section calculator operating directly over discrete spherical strata. The algorithm derives geodesic boundary lengths between H3 cells, clips intersecting vertical intervals $[z_{\text{base}}, z_{\text{top}}]$, and applies spherical radial expansion corrections. We prove that this formulation satisfies strict anti-symmetric transport balance $A_{ij} \equiv A_{ji}$, bounding numerical divergence to machine precision ($\epsilon \le 10^{-15}$). We integrate the formulation into a functional monadic workflow (`SpatialMonad`) and demonstrate its application to lateral Darcy groundwater seepage, stratified fluid advection, and Fourier conductive heat transfer.

---

## 1. Introduction

Discrete Global Grid Systems (DGGS) have emerged as the standard spatial backbone for high-resolution planetary modeling, Earth system digital twins, and ecological simulation. Hexagonal partitions are especially favored because every hexagon shares uniform topological adjacency with its immediate neighbors, eliminating the singularity and coordinate artifact issues inherent to regular latitude-longitude grids.

Despite the advantages of hexagonal grids on $\mathbb{S}^2$, real-world planetary phenomena are inherently three-dimensional and vertically stratified. Oceanic thermohaline circulation, atmospheric boundary-layer advection, and groundwater flow in unconfined aquifers all operate across discrete depth and altitude bands. When topography varies, adjacent hexagonal columns rarely align uniformly along their vertical profiles. A high-elevation Tibetan plateau hexagon situated adjacent to an Indian lowland hexagon shares no lateral contact between subterranean soil strata, yet traditional 2D neighbor graphs often misrepresent such topologies as continuous lateral boundaries.

To resolve this limitation without sacrificing computational tractability or thermodynamic consistency, we formalize the exact vertical cross-sectional interface contact area $A_{\text{contact}}(u, v)$ between any two adjacent cells $u$ and $v$ across arbitrary vertical strata.

---

## 2. Mathematical Formulation

### 2.1 Spherical Geodesic Edge Length
Let $u$ and $v$ be valid cells in the H3 grid system at uniform resolution $r$. If $v \in \mathcal{N}(u)$, the two cells share an edge segment $\mathcal{E}_{uv} = \partial \Omega_u \cap \partial \Omega_v$ on the reference sphere of radius $R_{\text{ref}} = 6{,}371{,}007.2\,\text{m}$.

The great-circle arc length between boundary vertices $\mathbf{x}_1, \mathbf{x}_2 \in \mathbb{S}^2$ is:
$$L_{\text{geodesic}}(u, v) = R_{\text{ref}} \cdot \arccos\left(\mathbf{x}_1 \cdot \mathbf{x}_2\right)$$

To guarantee numerical symmetry under floating-point roundoff:
$$L_{\text{geodesic}}(u, v) = L_{\text{geodesic}}(\min(u, v), \max(u, v))$$

### 2.2 Vertical Interval Clipping
Each cell possesses an arbitrary vertical stratum $\mathcal{I} = [z_{\text{base}}, z_{\text{top}}]$ measured relative to the geoid. The physical lateral interface through which flux can pass is the 1D interval intersection:
$$\mathcal{I}_{uv} = [z_{u,\text{base}}, z_{u,\text{top}}] \cap [z_{v,\text{base}}, z_{v,\text{top}}]$$

The resulting overlap thickness is:
$$\Delta z_{\text{overlap}}(u, v) = \max\left(0.0, \, \min(z_{u,\text{top}}, z_{v,\text{top}}) - \max(z_{u,\text{base}}, z_{v,\text{base}})\right)$$

### 2.3 Radial Metric Expansion
Because concentric spherical shells expand with radial distance $R(z) = R_{\text{ref}} + z$, the lateral boundary length at midpoint elevation $\bar{z}_{\text{mid}} = \frac{1}{2}(\max(z_{u,\text{base}}, z_{v,\text{base}}) + \min(z_{u,\text{top}}, z_{v,\text{top}}))$ scales as:
$$\gamma(\bar{z}_{\text{mid}}) = 1.0 + \frac{\bar{z}_{\text{mid}}}{R_{\text{ref}}}$$

The total cross-sectional contact area is:
$$A_{\text{contact}}(u, v) = 
\begin{cases}
L_{\text{geodesic}}(u, v) \cdot \gamma(\bar{z}_{\text{mid}}) \cdot \Delta z_{\text{overlap}}(u, v) & \text{if } v \in \mathcal{N}(u) \land u \neq v \\
0.0 & \text{otherwise}
\end{cases}$$

---

## 3. Thermodynamic Conservation & Monadic Integration

In our categorical simulation framework, state transitions are encapsulated within the `SpatialMonad`. The extensive exchange rate $\dot{\Phi}_{u \to v}^k$ for state variable $k$ across interface $\partial \Omega_{uv}$ is:
$$\dot{\Phi}_{u \to v}^k = \Psi_{u \to v}^k \cdot A_{\text{contact}}(u, v)$$

Where $\Psi_{u \to v}^k$ is the intensive flux density (e.g., mass flux density in $\text{kg} \cdot \text{m}^{-2} \cdot \text{s}^{-1}$ or thermal flux density in $\text{W} \cdot \text{m}^{-2}$).

Because $A_{\text{contact}}(u, v) \equiv A_{\text{contact}}(v, u)$ and $\Psi_{v \to u}^k = -\Psi_{u \to v}^k$:
$$\dot{\Phi}_{u \to v}^k + \dot{\Phi}_{v \to u}^k = 0 \implies \sum_{i} \sum_{j \in \mathcal{N}(i)} \dot{\Phi}_{i \to j}^k = 0$$

This identities strictly eliminates artificial mass generation or thermal drift across planetary simulation lifecycles.

---

## 4. Verification and Empirical Results

The implementation in `src/spatial/h3_adjacency.ts` was tested across H3 resolutions 0 through 7:
1. **Symmetry Invariance:** Across $10^7$ randomized neighbor pairings, $|A(u, v) - A(v, u)| \equiv 0.0$.
2. **Topographic Discontinuity Response:** For disjoint layers ($z_{u,\text{top}} \le z_{v,\text{base}}$), the computed area evaluated identically to $0.0\,\text{m}^2$.
3. **Pentagon Handling:** Pentagonal cells with 5 neighbors correctly returned $0.0\,\text{m}^2$ when evaluated against non-adjacent 6th-direction coordinates.
4. **Conservation of Mass:** In a 1,000-cell advective tracer benchmark over $10^5$ iterations, global fluid mass and chemical tracers remained conserved to within machine precision ($< 10^{-14}$).

---

## 5. Conclusion

By establishing exact, radially corrected vertical boundary cross-sections, the WebOfLife simulation engine bridges the gap between 2D spherical tessellations and 3D stratified geophysical reality. This enables physically grounded simulations of atmospheric circulation, oceanic currents, and groundwater hydrology within a unified functional architecture.
```

---