# Local Darboux Frame Completion and In-Plane Normal Vector Projection on Discrete Geodesic 2-Sphere Manifolds for Conservative Earth System Modeling

**Pascal Ranoroarijaona**  
*The Web of Life Project*  
Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
Sprint 063 Technical Report

---

## Abstract

Discrete global grid systems (DGGS) on spherical surfaces $S^2 \subset \mathbb{R}^3$ are foundational to modern geodesic atmospheric and oceanic transport models. Conservative finite-volume schemes require rigorous determination of boundary normal flux vectors across shared cell facets. In this work, we present the algorithmic formulation and physical verification of `computeBoundaryHorizontalNormal3D`, completing the local orthonormal Darboux frame $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ at shared geodesic boundary midpoints. Formulated as the normalized Cartesian cross product $\hat{\mathbf{n}}_h = \operatorname{normalize}(\hat{\mathbf{t}} \times \hat{\mathbf{r}})$, the horizontal normal satisfies strict radial orthogonality $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \equiv 0$, preventing spurious numerical vertical leakage of horizontal momentum and mass fluxes. We demonstrate exact first-law mass and enthalpy conservation across shared cell facets, formulate second-law irreversible entropy production under Fourier and Fickian gradients, and evaluate the algorithm against degenerate geometric edge cases.

---

## 1. Introduction

Planetary simulation on discrete geodesic meshes—such as hexagonal Voronoi tessellations derived from the icosahedral H3 grid—circumvents the coordinate singularities ("pole problems") inherent to legacy latitude-longitude grids. However, finite-volume fluid dynamics on the two-sphere require projecting continuous vector fields (such as fluid velocity $\mathbf{u}$ and thermal gradients $\nabla T$) onto boundary facets between neighboring cells $c_i$ and $c_j$.

Previous increments established:
1. Geodesic boundary midpoint computation $\mathbf{m} \in S^2_R$ (Sprint 061).
2. Boundary unit tangent vector computation $\hat{\mathbf{t}} \in T_{\mathbf{m}}S^2_R$ (Sprint 062).

Sprint 063 addresses the missing degree of freedom: the **in-plane horizontal unit normal vector** $\hat{\mathbf{n}}_h \in T_{\mathbf{m}}S^2_R$, which points perpendicularly outward from the boundary edge along the sphere's local tangent plane.

---

## 2. Geometric Formulation

Let $S^2_R = \{ \mathbf{x} \in \mathbb{R}^3 : \|\mathbf{x}\| = R \}$ denote a spherical planet of radius $R$. For a shared boundary edge defined by vertices $\mathbf{v}_1, \mathbf{v}_2 \in S^2_R$:

1. **Midpoint and Radial Normal**:
   $$\mathbf{m} = R \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|}, \qquad \hat{\mathbf{r}} = \frac{\mathbf{m}}{\|\mathbf{m}\|}$$

2. **Midpoint Unit Tangent Vector**:
   $$\hat{\mathbf{t}} = \frac{\mathbf{v}_2 - (\mathbf{v}_2 \cdot \hat{\mathbf{r}}) \hat{\mathbf{r}}}{\|\mathbf{v}_2 - (\mathbf{v}_2 \cdot \hat{\mathbf{r}}) \hat{\mathbf{r}}\|}, \quad \text{with } \hat{\mathbf{t}} \cdot \hat{\mathbf{r}} = 0, \; \|\hat{\mathbf{t}}\| = 1$$

3. **In-Plane Horizontal Unit Normal Vector**:
   $$\mathbf{n}_{\text{raw}} = \hat{\mathbf{t}} \times \hat{\mathbf{r}} = \begin{pmatrix}
   t_y r_z - t_z r_y \\
   t_z r_x - t_x r_z \\
   t_x r_y - t_y r_x
   \end{pmatrix}$$
   
   $$\hat{\mathbf{n}}_h = \begin{cases}
   \frac{\mathbf{n}_{\text{raw}}}{\|\mathbf{n}_{\text{raw}}\|}, & \|\mathbf{n}_{\text{raw}}\| > \varepsilon \\
   \mathbf{0}, & \text{otherwise}
   \end{cases}$$
   where $\varepsilon = 10^{-12}$.

### Orthonormal Basis Properties
The triad $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ forms a right-handed orthonormal basis in $\mathbb{R}^3$:
$$\hat{\mathbf{t}} \cdot \hat{\mathbf{n}}_h = 0, \quad \hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} = 0, \quad \hat{\mathbf{t}} \cdot \hat{\mathbf{r}} = 0$$
$$\det([\hat{\mathbf{t}} \; \hat{\mathbf{n}}_h \; \hat{\mathbf{r}}]) = +1$$

---

## 3. Physical Governance & Finite-Volume Transport

### 3.1 Interfacial Advective Flux
For atmospheric layer thickness $\Delta z$ and geodesic edge length $L_{ij}$, the facet cross-section is $A_{f, ij} = L_{ij} \Delta z$. Directed interfacial normal velocity between cell $c_i$ and neighbor $c_j$ is:
$$u_{n, ij} = \mathbf{u}(\mathbf{m}) \cdot \hat{\mathbf{n}}_{ij}, \qquad \hat{\mathbf{n}}_{ij} = \operatorname{sgn}(\langle \hat{\mathbf{n}}_h, \mathbf{x}_j - \mathbf{x}_i \rangle) \hat{\mathbf{n}}_h$$

The total advected mass of tracer $k$ across time step $\Delta t$ using first-order Godunov upwinding is:
$$\Delta M_{k, ij} = \dot{M}_{ij} \chi^*_{k, ij} \Delta t = (\rho^*_{ij} u_{n, ij} A_{f, ij}) \chi^*_{k, ij} \Delta t$$
where $\rho^*$ and $\chi^*$ are sampled from cell $c_i$ if $u_{n, ij} \ge 0$, and cell $c_j$ if $u_{n, ij} < 0$.

### 3.2 Anti-Symmetry and Global Conservation
Because $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$, upwind advection satisfies exact anti-symmetry:
$$\Delta M_{k, ij} = -\Delta M_{k, ji} \implies \sum_{e \in \mathcal{E}} \Delta M_{k, e} \equiv 0$$
Global conservation is guaranteed down to machine precision.

### 3.3 Zero Radial Leakage Guarantee
Because $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \equiv 0$, horizontal advective velocity fields $\mathbf{u}_h \in T_{\mathbf{m}}S^2$ project identically to zero along the vertical gravitational axis:
$$\mathbf{u}_h \cdot \hat{\mathbf{r}} \equiv 0$$
This eliminates fictitious vertical transport driven by horizontal pressure gradients.

### 3.4 Second-Law Irreversible Entropy Production
Diffusive exchange across facet $e_{ij}$ driven by Fourier temperature gradients produces entropy:
$$\dot{S}_{\text{facet}, ij} = k_{\text{thermal}} A_{f, ij} \frac{(T_i - T_j)^2}{T_i T_j d_{ij}} \ge 0$$
Ensuring the boundary normal aligns precisely with the geodesic tangent plane guarantees non-negative entropy generation without numerical dissipation artifacts.

---

## 4. Verification and Empirical Tests

The implementation was validated using automated test runner `npx tsx tests/sprint_063.test.ts`:
1. **Equatorial Geodesic Boundary**: Edge aligned east-west $(\hat{\mathbf{t}} = (0, 1, 0))$ at $(R, 0, 0)$ evaluated to pure meridional normal $\hat{\mathbf{n}}_h = (0, 0, -1)$.
2. **Meridional Geodesic Boundary**: Edge aligned north-south $(\hat{\mathbf{t}} = (0, 0, 1))$ at $(R, 0, 0)$ evaluated to pure zonal normal $\hat{\mathbf{n}}_h = (0, 1, 0)$.
3. **Rotational Invariance**: Arbitrary spherical rotations maintained inner products $|\hat{\mathbf{n}}_h \cdot \hat{\mathbf{t}}| < 10^{-12}$ and $|\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}}| < 10^{-12}$.
4. **Degeneracy Stability**: Collinear or vanishing input vectors safely yielded zero vectors $(0, 0, 0)$ without numerical overflow or NaN.

---

## 5. Conclusion

Sprint 063 provides the structural link connecting geodesic discrete grid topology to finite-volume transport mechanics on $S^2$. The pure geometric functions `computeBoundaryHorizontalNormal3D` and `computeBoundaryHorizontalNormalFromEndpoints3D` guarantee orthonormality, eliminate radial leakage, and establish the complete Darboux frame for planetary Earth system simulations.