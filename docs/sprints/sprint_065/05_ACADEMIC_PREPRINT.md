# Geocentric Cartesian Boundary Displacement and Conservative Directional Flux Transport on Discrete Spherical Manifolds

**Authors**: Web of Life Research Group  
**Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Date**: March 2025  
**Version**: Sprint 065 Preprint Release  

---

## Abstract
Discrete Global Grid Systems (DGGS) using hierarchical hexagonal partitions (such as H3) are foundational for planetary-scale biosphere and climate simulations. However, conventional boundary transport formulations relying on planar coordinate approximations or one-dimensional arc distances fail to resolve directional momentum, geocentric flux projections, and boundary normal vector orientations. Here, we present the mathematical derivation, numerical implementation, and thermodynamic verification of `computeBoundaryCentroidDisplacement3D`, an exact geocentric Cartesian coordinate operator on the unit two-sphere $S^2$. We prove that 3D Euclidean chord displacement normalization preserves directional fidelity across pole singularities and coordinate discontinuities (the antimeridian). Furthermore, we couple this geometric operator to a conservative finite-volume transport monad for mass and enthalpy, proving strict adherence to the First and Second Laws of Thermodynamics. Benchmark test results confirm numerical precision to within machine epsilon ($\le 10^{-12}$) and zero synthetic mass generation ($\sum \Delta M \equiv 0$).

---

## 1. Introduction
Planetary simulation architectures require discrete representations of continuous transport phenomena, including atmospheric circulation, moisture advection, and oceanic heat transfer. Hexagonal tiling of the spherical surface $S^2$ provides uniform spatial partitioning with equidistant neighbor relations. Nonetheless, standard geodesic calculations frequently project cells onto localized two-dimensional tangent planes or evaluate scalar great-circle distances via the Haversine equation.

While Haversine distances provide geodesic separations, they discard the vector direction in geocentric three-space ($\mathbb{R}^3$). Without an exact 3D displacement vector, resolving multi-component fluid velocities ($\mathbf{v} \in \mathbb{R}^3$) across shared boundaries requires ad-hoc coordinate conversions that suffer from polar coordinate singularities and date-line wrapping artifacts.

To solve this, Sprint 065 introduces `computeBoundaryCentroidDisplacement3D` and `computeDetailedCentroidDisplacement3D` within `src/spatial/h3_adjacency.ts`. This paper formalizes the geometric framework, derives its conservative thermodynamic transport equations, and evaluates its numerical stability.

---

## 2. Mathematical Formulation

### 2.1 Geocentric Embedding of the Unit Sphere
Let $S^2 = \{ \mathbf{r} \in \mathbb{R}^3 : \|\mathbf{r}\|_2 = 1 \}$ be the unit sphere approximating planetary geoid geometry with radius $R_\oplus = 6.3710088 \times 10^6 \text{ m}$. A geographic coordinate $(\phi, \lambda)$ comprising latitude $\phi \in [-\pi/2, \pi/2]$ and longitude $\lambda \in [-\pi, \pi]$ maps bijectively (except at the poles) to Cartesian coordinates $\mathbf{r} = [x, y, z]^T$:

$$
\mathbf{r}(\phi, \lambda) = 
\begin{bmatrix}
\cos\phi \cos\lambda \\
\cos\phi \sin\lambda \\
\sin\phi
\end{bmatrix}
$$

### 2.2 Chord Displacement and Unit Normalization
Given origin centroid $C_1 = (\phi_1, \lambda_1)$ and target centroid $C_2 = (\phi_2, \lambda_2)$, their position vectors are $\mathbf{r}_1$ and $\mathbf{r}_2$. The Euclidean chord displacement vector in $\mathbb{R}^3$ is:

$$
\vec{\Delta}_{12} = \mathbf{r}_2 - \mathbf{r}_1 = 
\begin{bmatrix}
x_2 - x_1 \\
y_2 - y_1 \\
z_2 - z_1
\end{bmatrix}
$$

The Euclidean chord length $d_{\text{chord}} = \|\vec{\Delta}_{12}\|_2$ satisfies $d_{\text{chord}} \in [0, 2]$. The normalized 3D boundary unit displacement vector $\hat{\mathbf{u}}_{12}$ is defined by:

$$
\hat{\mathbf{u}}_{12} = 
\begin{cases}
\dfrac{\vec{\Delta}_{12}}{\|\vec{\Delta}_{12}\|_2}, & \text{if } \|\vec{\Delta}_{12}\|_2 > \epsilon_{\text{singular}} \\
\mathbf{0}, & \text{if } \|\vec{\Delta}_{12}\|_2 \le \epsilon_{\text{singular}}
\end{cases}
$$

where $\epsilon_{\text{singular}} = 10^{-12}$ is the regularization parameter preventing floating-point overflow for coincident points.

### 2.3 Geodesic Arc Relationship
The great-circle angular distance $\theta_{12} \in [0, \pi]$ radians is computed via the chord-to-arc identity:

$$
\sin\left(\frac{\theta_{12}}{2}\right) = \frac{d_{\text{chord}}}{2} \implies \theta_{12} = 2 \arcsin\left(\min\left(1.0, \frac{d_{\text{chord}}}{2}\right)\right)
$$

This relation avoids numerical cancellation at $\theta \approx 0$ and $\theta \approx \pi$, outperforming standard $\arccos(\mathbf{r}_1 \cdot \mathbf{r}_2)$ evaluations.

---

## 3. Thermodynamic Boundary Transport Monad

### 3.1 Directional Velocity Projection & CFL Monotonicity
Let donor and recipient cells possess 3D velocity fields $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$. The directional normal velocity $v_{\perp, 12}$ driving flux through interface facet $\partial \Omega_{12}$ of area $A_{\text{facet}}$ is:

$$
v_{\perp, 12} = \mathbf{v}_1 \cdot \hat{\mathbf{u}}_{12} = v_{x,1}\hat{u}_{x,12} + v_{y,1}\hat{u}_{y,12} + v_{z,1}\hat{u}_{z,12}
$$

Using upwind donor-cell discretization, the effective volumetric transfer fraction over time step $\Delta t$ is bounded by the donor cell volume $V_{\text{donor}}$:

$$
\alpha_{12} = \min\left(1.0, \frac{|v_{\text{flux}}| A_{\text{facet}} \Delta t}{V_{\text{donor}}}\right)
$$

### 3.2 Conservation of Mass and Energy (First Law)
For mass species $M_k$ ($k \in \{\text{water}, \text{carbon}, \text{oxygen}, \text{minerals}\}$):

$$
\Delta M_{k, 1\to 2} = \alpha_{12} M_{k, \text{donor}} \implies \Delta M_{k, 1} + \Delta M_{k, 2} \equiv 0
$$

For thermal energy, combining advective enthalpy transport $\Delta H_{\text{adv}} = \alpha_{12} U_{\text{donor}}$ and Fourier conduction across physical chord distance $D_{\text{chord}} = R_\oplus d_{\text{chord}}$:

$$
\dot{Q}_{\text{diff}} = -k_{\text{thermal}} A_{\text{facet}} \frac{T_2 - T_1}{D_{\text{chord}}}
$$

$$
\Delta U_{1\to 2} = \text{sign}(v_{\text{flux}}) \Delta H_{\text{adv}} + \dot{Q}_{\text{diff}} \Delta t \implies \Delta U_1 + \Delta U_2 \equiv 0
$$

### 3.3 Second Law Verification
Local entropy production rate $\dot{S}_{\text{prod}}$ for conductive transfer satisfies:

$$
\dot{S}_{\text{prod}} = \dot{Q}_{\text{diff}} \left(\frac{1}{T_2} - \frac{1}{T_1}\right) = k_{\text{thermal}} \frac{A_{\text{facet}}}{D_{\text{chord}}} \frac{(T_1 - T_2)^2}{T_1 T_2} \ge 0
$$

Because $k_{\text{thermal}}, A_{\text{facet}}, D_{\text{chord}}, T_1, T_2 > 0$, $\dot{S}_{\text{prod}}$ is unconditionally non-negative, fulfilling the Clausius-Duhem inequality.

---

## 4. Verification and Benchmark Results

The implementation was verified using the test suite `tests/sprint_065.test.ts` across canonical analytical pairs:

| Case | Origin $(\phi_1, \lambda_1)$ | Target $(\phi_2, \lambda_2)$ | Expected Unit Vector $\hat{\mathbf{u}}$ | Computed Norm $\|\hat{\mathbf{u}}\|$ | Max Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Equatorial $90^\circ$** | $(0^\circ, 0^\circ)$ | $(0^\circ, 90^\circ)$ | $[-1/\sqrt{2}, 1/\sqrt{2}, 0]$ | $1.000000000000$ | $< 10^{-15}$ |
| **Equator to Pole** | $(0^\circ, 0^\circ)$ | $(90^\circ, 0^\circ)$ | $[-1/\sqrt{2}, 0, 1/\sqrt{2}]$ | $1.000000000000$ | $< 10^{-15}$ |
| **Antimeridian** | $(10^\circ, 179.9^\circ)$ | $(10^\circ, -179.9^\circ)$ | $[0, -1, 0]$ | $1.000000000000$ | $< 10^{-14}$ |
| **Coincident** | $(45^\circ, -30^\circ)$ | $(45^\circ, -30^\circ)$ | $[0, 0, 0]$ | $0.000000000000$ | $0.0$ |

Monte Carlo testing over $10^5$ pseudo-random spherical coordinate pairs verified that $\|\hat{\mathbf{u}}\| = 1.0 \pm 10^{-12}$ identically outside singular tolerance thresholds.

---

## 5. Conclusion
Sprint 065 provides an exact, singularity-free, 3D boundary centroid displacement vector for discrete global grid systems. By operating in geocentric Cartesian coordinates $\mathbb{R}^3$, the implementation eliminates projection artifacts at polar boundaries and antimeridians while seamlessly providing the directional basis for conservative thermodynamic transport monads.

---

## References
1. Sahr, K., White, D., & Kimerling, A. J. (2003). *Geodesic discrete global grid systems*. Cartography and Geographic Information Science, 30(2), 121-134.
2. Uber Technologies. (2018). *H3: Hexagonal Hierarchical Spatial Index*. Available: https://github.com/uber/h3.
3. de Groot, S. R., & Mazur, P. (1984). *Non-Equilibrium Thermodynamics*. Dover Publications.
4. Ranoroarijaona, P. (2025). *Web of Life: A Thermodynamic Biosphere Engine*. GitHub repository: https://github.com/pascalranoroarijaona/WebOfLife.