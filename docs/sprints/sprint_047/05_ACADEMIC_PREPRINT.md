# Spherical Geodesic Edge Scaling and Boundary Flux Formulations on Discrete Global Grid Systems for Planetary Biosphere Simulation

**Pascal Ranoroarijaona**  
*Web of Life Project*  
GitHub: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## Abstract
Discrete Global Grid Systems (DGGS) based on icosahedral hexagonal apertures provide uniform spatial partitioning for planetary models. However, evaluating physical transport phenomena—such as Fickian mass diffusion, Fourier thermal conduction, and Saint-Venant hydraulic routing—requires rigorous metric calculations of boundary interface geometries across hierarchical resolutions. In this paper, we formulate the mathematical foundation of geodesic edge scaling on spherical truncated icosahedra under aperture-7 hexagonal decomposition. We introduce `calculateH3EdgeLengthMeters`, an exact, thermodynamically conservative boundary length operator spanning resolutions 0 through 15 on a spherical Earth geoid ($R_{\text{Earth}} = 6{,}371{,}000\text{ m}$). We demonstrate that pairing analytical inverse-square-root scaling ($L(r) \approx L_0 \cdot 7^{-r/2}$) with discrete empirical geodesic tables preserves First Law mass-energy conservation ($\sum \Delta M \equiv 0$) and Second Law entropy production non-negativity ($\sigma \ge 0$) across arbitrary spatial discretizations.

---

## 1. Introduction
Planetary simulation engines require multiscale spatial discretizations capable of modeling coupled biogeochemical cycles across orders of magnitude: from global ocean circulation ($10^6\text{ m}$) to localized riparian nutrient diffusion ($10^0\text{ m}$). Traditional latitude-longitude quadtree grids suffer from polar coordinate singularities and drastic cell-area distortions. Discrete Global Grid Systems (DGGS) based on Uber's H3 aperture-7 hexagonal hierarchy resolve these topological pathologies by subdividing the spherical surface into regular hexagonal cells with minimal area variance.

Despite widespread topological adoption, numerical dynamic modeling on DGGS often neglects exact geodesic boundary geometry. Transport fluxes across adjacent cells $i$ and $j$ depend on the contact edge length $L_{\text{edge}}$ and center-to-center separation distance $d_{ij}$. In this work, we present the mathematical derivation, discrete metric formulations, and numerical proofs implemented in Sprint 047 of the open-source *Web of Life* planetary simulation engine.

---

## 2. Mathematical Formalism

### 2.1 Aperture-7 Scaling and Spherical Decomposition
In an aperture-7 hexagonal DGGS, moving from resolution $r$ to $r+1$ scales the nominal area of each cell by a factor of 7:
$$A(r) = \frac{A(0)}{7^r}$$

On a Euclidean plane, the area $A$ of a regular hexagon with edge length $L$ is:
$$A = \frac{3\sqrt{3}}{2} L^2 \implies L = \sqrt{\frac{2A}{3\sqrt{3}}}$$

Substituting the recursive area decomposition yields the asymptotic edge scaling law:
$$L(r) = L_0 \cdot 7^{-r/2} = \frac{L_0}{(\sqrt{7})^r}$$
where the ratio between successive edge lengths is:
$$\lambda = \frac{L(r)}{L(r+1)} = \sqrt{7} \approx 2.645751311$$

On a spherical geoid of mean radius $R_{\text{Earth}} = 6{,}371{,}000\text{ m}$, the resolution 0 nominal edge length on the truncated icosahedral spherical surface is $L_0 \approx 1{,}107{,}712.59\text{ m}$.

### 2.2 Discrete Resolution Table
Due to spherical curvature and icosahedral gnomonic projection distortions, discrete geodesic averages for nominal edge lengths and center-to-center distances $d_{ij} = \sqrt{3} L_{\text{edge}}$ are tabulated across all discrete resolutions $r \in [0, 15]$:

| Resolution $r$ | Nominal Edge Length $L_{\text{edge}}$ (m) | Center Distance $d_{ij}$ (m) | Unit Contact Area ($h=1\text{m}$) ($\text{m}^2$) |
|:---:|:---:|:---:|:---:|
| 0  | $1{,}107{,}712.59$ | $1{,}918{,}614.97$ | $1{,}107{,}712.59$ |
| 1  | $418{,}676.01$     | $725{,}170.83$     | $418{,}676.01$     |
| 2  | $158{,}244.66$     | $274{,}087.63$     | $158{,}244.66$     |
| 3  | $59{,}810.86$      | $103{,}595.45$     | $59{,}810.86$      |
| 4  | $22{,}606.38$      | $39{,}155.40$      | $22{,}606.38$      |
| 5  | $8{,}544.41$       | $14{,}799.35$      | $8{,}544.41$       |
| 6  | $3{,}229.48$       | $5{,}593.62$       | $3{,}229.48$       |
| 7  | $1{,}220.63$       | $2{,}114.19$       | $1{,}220.63$       |
| 8  | $461.35$           | $799.08$           | $461.35$           |
| 9  | $174.38$           | $302.04$           | $174.38$           |
| 10 | $65.91$            | $114.16$           | $65.91$            |
| 11 | $24.91$            | $43.15$            | $24.91$            |
| 12 | $9.42$             | $16.32$            | $9.42$             |
| 13 | $3.56$             | $6.17$             | $3.56$             |
| 14 | $1.35$             | $2.34$             | $1.35$             |
| 15 | $0.51$             | $0.88$             | $0.51$             |

---

## 3. Boundary Transport Conservation Laws

### 3.1 Mass Diffusion across Hexagonal Boundaries
Fickian diffusion of dissolved chemical constituents (e.g., Dissolved Inorganic Carbon, Oxygen) across adjacent hexagonal columns of active column depth $h$ is governed by:
$$J_{m, ij} = -D \cdot \frac{C_j - C_i}{d_{ij}}$$
The total mass transferred during timestep $\Delta t$ across boundary contact area $A_{\text{contact}} = L_{\text{edge}} \cdot h$ is:
$$\Delta M_{ij} = J_{m, ij} \cdot A_{\text{contact}} \cdot \Delta t = -D \cdot \frac{C_j - C_i}{\sqrt{3} L_{\text{edge}}} \cdot (L_{\text{edge}} \cdot h) \cdot \Delta t = -\frac{D \cdot h}{\sqrt{3}} (C_j - C_i) \Delta t$$

Notice that $L_{\text{edge}}$ cancels analytically in the 1D ratio across uniform regular hexagons, while remaining essential for non-uniform interfaces, convective boundary layers, and contact area determinations. Pairwise anti-symmetry guarantees exact mass conservation:
$$\Delta M_{i} = -\Delta M_{ij}, \quad \Delta M_{j} = +\Delta M_{ij} \implies \Delta M_i + \Delta M_j = 0$$

### 3.2 Thermal Exchange and Entropy Production
Thermal conduction obeys Fourier's Law:
$$\Delta Q_{ij} = -\frac{\kappa \cdot h}{\sqrt{3}} (T_j - T_i) \Delta t$$
The corresponding rate of internal entropy production $\sigma_{\text{th}}$ is:
$$\sigma_{\text{th}} = \Delta Q_{i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) = \frac{\kappa \cdot h \cdot \Delta t}{\sqrt{3}} \cdot \frac{(T_i - T_j)^2}{T_i T_j} \ge 0$$
Because $\kappa, h, \Delta t, T_i, T_j > 0$, the Second Law of Thermodynamics holds unconditionally.

---

## 4. Implementation in the Web of Life Engine
The algorithm is implemented as `calculateH3EdgeLengthMeters(resolution: number): number` in `src/spatial/h3_adjacency.ts`. It provides $O(1)$ memory lookup for discrete integer resolutions $r \in [0, 15]$ with strict validation (`RangeError` on invalid or negative arguments), and evaluates the aperture-7 asymptotic fallback for non-integer inputs.

Tests in `tests/sprint_047.test.ts` verify:
1. Relative error bounds $< 0.01\text{ m}$ against the H3 standard geodesic table.
2. Monotonic decreasing property: $L_{\text{edge}}(r+1) < L_{\text{edge}}(r)$.
3. Conservation invariants in pairwise boundary diffusion steps.

---

## 5. Conclusion
Accurate spherical geodesic edge scaling bridges discrete geospatial indexing with continuous non-equilibrium thermodynamics. By embedding `calculateH3EdgeLengthMeters` into the Web of Life spatial monad architecture, the engine establishes a mathematically sound foundation for planetary-scale diffusion, convection, and ecological transport.
```

---