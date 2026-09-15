# Deterministic Shared Boundary Geodesic Extraction for Conservative Finite-Volume Flux Transport on Discrete Spherical Manifolds

**Pascal Ranoroarijaona**  
*Web of Life Modeling Consortium*  
*Repository:* [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## Abstract

Planetary-scale biogeochemical and thermodynamic simulations require strict conservation of mass, momentum, and enthalpy across discrete global control volumes. On spherical geodesic discretizations—such as the icosahedral Snyder aperture-3 hexagonal grid (H3)—isotropic centroid-distance transport formulations introduce spatial truncation errors up to $\sim 15\%$ due to cell distortion, irregular edge orientations, and pentagonal singularities. We formulate and implement `extractSharedBoundaryVertices3D`, an analytical geometric operator that extracts deterministic 3D Cartesian boundary endpoints $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$ for any pair of adjacent control volumes on a spherical manifold $S_R^2$. By establishing exact interface normals $\hat{\mathbf{n}}_{ij}$, geodesic arc lengths $L_{ij}$, and interface cross-sectional exchange areas $A_{ij}$, this formulation guarantees machine-precision antisymmetry ($\hat{\mathbf{n}}_{ij} \equiv -\hat{\mathbf{n}}_{ji}$) and exact zero-sum First Law conservation for coupled advective-diffusive stock transport. We demonstrate the mathematical formulation, numerical stability criteria, and implementation within the Web of Life open-source simulation architecture.

---

## 1. Introduction

Discrete Global Grid Systems (DGGS) based on spherical geodesic tessellations provide uniform spatial indexing for planetary Earth system models. However, mapping continuum transport equations:
$$\frac{\partial \rho_X}{\partial t} + \nabla \cdot (\mathbf{u} \rho_X) = \nabla \cdot (D_X \nabla \rho_X) + \dot{S}_X$$
onto non-Euclidean spherical meshes requires rigorous geometric closure at cell interfaces. In standard discrete formulations, flux exchanges between adjacent control volumes $c_i$ and $c_j$ are often approximated using inter-centroid distances $d_{ij} = \|\mathbf{x}_j - \mathbf{x}_i\|$ and idealized mean facet lengths $\bar{L}$.

This approximation introduces fundamental physical defects:
1. **Geometric Asymmetry:** When cell $c_i$ evaluates $c_j$ using a local coordinate projection differing from $c_j$'s projection of $c_i$, evaluated interface areas deviate ($A_{ij} \neq A_{ji}$), introducing artificial source/sink terms that violate mass and energy conservation.
2. **Pentagonal Apex Singularities:** Icosahedral projections contain exactly 12 pentagonal cells across any global resolution. Isotropic hexagonal transport schemes fail at pentagonal-hexagonal interfaces.
3. **Misaligned Interface Normals:** The true facet outward normal $\hat{\mathbf{n}}_{ij}$ is orthogonal to the geodesic boundary arc, which does not generally coincide with the centroid separation vector $\mathbf{x}_j - \mathbf{x}_i$.

To resolve these defects, Sprint 068 of the Web of Life engine introduces `extractSharedBoundaryVertices3D`, achieving analytical closure for finite-volume boundary flux integration.

---

## 2. Geometric Formulation on $S_R^2$

Let a discrete cell $c \in \mathcal{H}$ be bounded on sphere $S_R^2 = \{ \mathbf{x} \in \mathbb{R}^3 : \|\mathbf{x}\| = R \}$ by an ordered vertex polygon $\mathcal{P}(c) = (\mathbf{u}_0, \mathbf{u}_1, \dots, \mathbf{u}_{k-1})$ where $k \in \{5, 6\}$. 

### 2.1 Coincident Vertex Detection
For two adjacent cells $c_A, c_B \in \mathcal{H}$, candidate vertices $\mathbf{a} \in \mathcal{P}(c_A)$ and $\mathbf{b} \in \mathcal{P}(c_B)$ are identified as coincident under tolerance $\epsilon = 10^{-5} \cdot R$:
$$\|\mathbf{a} - \mathbf{b}\| < \epsilon$$
The intersection yields exactly two shared boundary vertices $\{\mathbf{p}_1, \mathbf{p}_2\}$.

### 2.2 Directed Interface Orientation
To guarantee strict antisymmetry, the shared vertices are ordered into a directed tuple $[\mathbf{v}_1, \mathbf{v}_2]$ such that the interface tangent $\mathbf{t} = \mathbf{v}_2 - \mathbf{v}_1$ and outward normal:
$$\mathbf{m} = \mathbf{t} \times \mathbf{x}_{c_A}, \quad \hat{\mathbf{n}}_{AB} = \frac{\mathbf{m}}{\|\mathbf{m}\|}$$
satisfies $\hat{\mathbf{n}}_{AB} \cdot (\mathbf{x}_{c_B} - \mathbf{x}_{c_A}) > 0$. If negative, vertices are swapped $[\mathbf{v}_1, \mathbf{v}_2] \leftarrow [\mathbf{p}_2, \mathbf{p}_1]$.

Consequently:
$$\hat{\mathbf{n}}_{BA} \equiv -\hat{\mathbf{n}}_{AB}$$
$$L_{AB} \equiv L_{BA} = R \arccos\left(\text{clamp}\left(\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}, -1.0, 1.0\right)\right)$$

---

## 3. Finite-Volume Advective-Diffusive Flux Dynamics

Across the physical interface facet $A_{ij} = L_{ij} \Delta z$, coupled conservative transport of stock $X \in \{ M_{\text{H}_2\text{O}}, M_{\text{C}}, M_{\text{O}_2}, M_{\text{min}}, H \}$ is computed via an upwind advective-diffusive formulation:

$$J_{X, ij} = u_n \rho_{X, \text{upwind}} - D_X \frac{\rho_{X, j} - \rho_{X, i}}{d_{ij}}$$
where $u_n = \mathbf{u}_{ij} \cdot \hat{\mathbf{n}}_{ij}$, and:
$$\rho_{X, \text{upwind}} = \begin{cases}
\rho_{X, i} & \text{if } u_n \ge 0 \\
\rho_{X, j} & \text{if } u_n < 0
\end{cases}$$

Thermal conduction obeys Fourier's Law with irreversible entropy generation rate:
$$\dot{S}_{\text{gen}, ij} = A_{ij} k_{\text{th}} \frac{(T_i - T_j)^2}{T_i T_j d_{ij}} \ge 0$$
satisfying the Second Law of Thermodynamics $\dot{S}_{\text{gen}} \ge 0$.

---

## 4. Verification and Empirical Invariants

The test suite in `tests/sprint_068.test.ts` validates the mathematical criteria across all cell pairings:
1. **Metric Antisymmetry:** $\hat{\mathbf{n}}_{AB} \cdot \hat{\mathbf{n}}_{BA} = -1.0 \pm 10^{-7}$.
2. **Zero-Sum Balance:** $\Delta X_i + \Delta X_j = 0.000000000000$ to machine precision across all transferred stocks.
3. **Topological Invariance:** Correct extraction for pentagon-hexagon pairings without numerical divergence.

The complete open-source implementation is accessible at [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).