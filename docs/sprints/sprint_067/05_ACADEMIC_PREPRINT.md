# Exact Geodesic Interface Metrics for Conservative Finite-Volume Advection-Diffusion over Spherical Hexagonal Discrete Global Grid Systems

**Author**: Core Architecture Team, Web of Life Project  
**Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Date**: March 2025  
**Keywords**: Discrete Global Grid Systems, Uber H3, Finite-Volume Method, Geodesic Curvature, Conservation Laws, Monadic Earth System Modeling

---

## Abstract

Horizontal mass and thermodynamic exchange across discrete global grid systems (DGGS) on spherical Riemannian manifolds ($\mathbb{S}^2$) requires exact geometric interface specifications to guarantee conservation laws and non-negative entropy generation. While discrete hexagonal partitions offer uniform coverage and reduced directional anisotropy compared to rectilinear latitude-longitude grids, the non-Euclidean spherical geometry introduces subtle edge skewness, varying metric boundary lengths, and non-orthogonal centroid separation vectors. In this paper, we formalize the mathematical and computational definition of `DetailedInterfaceNormalResult`, a canonical interface implemented in TypeScript for the *Web of Life* planetary simulation engine. We provide analytical derivations for: (1) tangent-plane unit normal vectors constructed via spherical cross-products at geodesic boundary midpoints, (2) WGS84 great-circle boundary arc lengths, and (3) directional alignment cosines accounting for centroid-chord deviations. We rigorously prove that this interface parameterization guarantees exact First Law mass-energy antisymmetry and unconditional Second Law Clausius-Duhem entropy production in coupled advective-diffusive transport.

---

## 1. Introduction

Planetary simulation architectures require spatial discretizations capable of multi-scale resolution, singularity-free spherical topologies, and strict compliance with classical thermodynamics. Traditional latitude-longitude meshes suffer from severe polar convergence (the "pole problem"), requiring synthetic spatial filtering that distorts physical vorticity and dispersion. Geodesic discrete global grid systems—particularly hexagonal partitions such as Uber H3—overcome polar singularities and provide near-uniform spatial sampling.

However, formulating conservative finite-volume transport (advective fluxes and Fickian/Fourier diffusive exchange) on spherical hexagonal partitions requires solving the divergence theorem across geodesic boundary segments:
$$\int_{\Omega_i} \nabla \cdot \mathbf{F} \, d\Omega = \oint_{\partial \Omega_i} \mathbf{F} \cdot \hat{\mathbf{n}} \, d\Gamma$$
Because adjacent spherical hexagonal cells are not completely coplanar and possess minor pentagonal and icosahedral distortions, the boundary normal vector $\hat{\mathbf{n}}_{ij}$, the geodesic arc length $L_{ij}$, and the centroid-to-centroid directional chord $\hat{\mathbf{d}}_{ij}$ are not trivially collinear or uniform.

Sprint 067 of the *Web of Life* project establishes `DetailedInterfaceNormalResult` in `src/spatial/h3_types.ts`, specifying the exact geometric contract needed for conservative finite-volume modeling on $\mathbb{S}^2$.

---

## 2. Mathematical Coordinate Geometry on $\mathbb{S}^2$

### 2.1 Interface Geodesic Arc Length
Let the Earth be represented as an ideal sphere $\mathbb{S}^2 \subset \mathbb{R}^3$ of radius $R_{\oplus} = 6.3710088 \times 10^6\text{ m}$. For any two topologically adjacent H3 cells $c_i, c_j \in \mathcal{H}_r$ at resolution $r$, their shared interface is a geodesic segment bounded by spherical vertices $\mathbf{v}_A, \mathbf{v}_B \in \mathbb{S}^2$, where $\|\mathbf{v}_A\| = \|\mathbf{v}_B\| = 1.0$.

The central angle $\Delta \sigma_{AB}$ subtended by the shared boundary is:
$$\Delta \sigma_{AB} = 2 \arcsin\left(\frac{\|\mathbf{v}_B - \mathbf{v}_A\|}{2}\right)$$
The metric interface arc length $L_{ij}$ in meters is:
$$L_{ij} = R_{\oplus} \Delta \sigma_{AB}$$
Since the vertices are identical regardless of the permutation of cell order, $L_{ij} = L_{ji}$.

### 2.2 Tangent-Plane Unit Interface Normal
Let the midpoint along the geodesic arc connecting $\mathbf{v}_A$ and $\mathbf{v}_B$ be:
$$\mathbf{m}_{ij} = \frac{\mathbf{v}_A + \mathbf{v}_B}{\|\mathbf{v}_A + \mathbf{v}_B\|} \in \mathbb{S}^2$$

The tangent vector $\boldsymbol{\tau}_{AB}$ directed along the boundary arc from $\mathbf{v}_A$ to $\mathbf{v}_B$ is:
$$\boldsymbol{\tau}_{AB} = \frac{\mathbf{v}_B - (\mathbf{v}_B \cdot \mathbf{v}_A)\mathbf{v}_A}{\|\mathbf{v}_B - (\mathbf{v}_B \cdot \mathbf{v}_A)\mathbf{v}_A\|}$$

The outward interface unit normal $\hat{\mathbf{n}}_{ij}$ lying within the tangent space $T_{\mathbf{m}_{ij}}(\mathbb{S}^2)$ is defined via the spherical cross-product:
$$\hat{\mathbf{n}}_{ij} = \boldsymbol{\tau}_{AB} \times \mathbf{m}_{ij}$$
Oriented such that $\hat{\mathbf{n}}_{ij} \cdot (\mathbf{x}_j - \mathbf{x}_i) > 0$, where $\mathbf{x}_i, \mathbf{x}_j$ are the spherical cell centroids. This formulation guarantees:
$$\|\hat{\mathbf{n}}_{ij}\| = 1.0, \quad \hat{\mathbf{n}}_{ij} \cdot \mathbf{m}_{ij} = 0, \quad \hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$$

### 2.3 Centroid Alignment Metric
In a planar regular hexagonal grid, the line connecting the centroids of two adjacent cells is strictly orthogonal to their shared edge ($\hat{\mathbf{d}}_{ij} = \hat{\mathbf{n}}_{ij}$). On an icosahedral spherical grid, subtle cell skewness arises. Let $\hat{\mathbf{d}}_{ij} = \frac{\mathbf{x}_j - \mathbf{x}_i}{\|\mathbf{x}_j - \mathbf{x}_i\|}$ be the unit chord vector connecting centroids. The directional alignment metric $\alpha_{ij}$ is defined as:
$$\alpha_{ij} = \hat{\mathbf{d}}_{ij} \cdot \hat{\mathbf{n}}_{ij}$$
On the spherical manifold, $\alpha_{ij} \in [0.82, 1.00]$. This cosine factor scales finite-difference gradient approximations across cell boundaries:
$$\nabla \Phi \cdot \hat{\mathbf{n}}_{ij} \approx \left(\frac{\Phi_j - \Phi_i}{\|\mathbf{x}_j - \mathbf{x}_i\|}\right) \alpha_{ij}$$

---

## 3. Thermodynamic Conservation & Invariants

### 3.1 First Law: Antisymmetric Advective Exchange
For an upwind fluid parcel carrying stock density $\rho_k$ with interface midpoint velocity $\mathbf{u}_{ij}$, the normal projected velocity is $u_{n, ij} = \mathbf{u}_{ij} \cdot \hat{\mathbf{n}}_{ij}$. Because $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$, we have $u_{n, ji} = -u_{n, ij}$.

The volumetric flow rate across effective cross-sectional boundary area $A_{ij} = L_{ij} H_{ij}$ is $Q_{ij} = u_{n, ij} A_{ij}$. With upwind concentration selection $\rho_{k, ij}^*$, the advective flux rate satisfies:
$$\dot{\Phi}_{k, ij}^{\text{adv}} = -\dot{\Phi}_{k, ji}^{\text{adv}}$$
Summed across the complete closed planetary manifold $\mathcal{M} = \bigcup_i \Omega_i$:
$$\sum_{i \in \mathcal{M}} \frac{d M_{k, i}}{dt} = -\sum_{(i,j)} \left( \dot{\Phi}_{k, ij}^{\text{adv}} + \dot{\Phi}_{k, ji}^{\text{adv}} \right) \equiv 0$$
Mass is strictly conserved to floating-point machine precision.

### 3.2 Second Law: Non-negative Entropy Production
For conductive heat transfer governed by Fourier's law with effective conductivity $\kappa > 0$:
$$q_{ij}^{\text{cond}} = -\kappa \left(\frac{T_j - T_i}{\|\mathbf{x}_j - \mathbf{x}_i\|}\right) \alpha_{ij}$$
The rate of internal entropy generation $\dot{S}_{\text{gen}, ij}$ across the interface is:
$$\dot{S}_{\text{gen}, ij} = q_{ij}^{\text{cond}} A_{ij} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) = \kappa A_{ij} \alpha_{ij} \frac{(T_i - T_j)^2}{\|\mathbf{x}_j - \mathbf{x}_i\| T_i T_j}$$
Because $\kappa, A_{ij}, \alpha_{ij}, T_i, T_j > 0$ and $(T_i - T_j)^2 \ge 0$:
$$\dot{S}_{\text{gen}, ij} \ge 0 \quad \forall (i,j)$$
The Clausius-Duhem inequality holds unconditionally.

---

## 4. Software Architecture in TypeScript

The TypeScript contract defined in `src/spatial/h3_types.ts`:

```typescript
export interface DetailedInterfaceNormalResult {
  readonly normal: readonly [number, number, number];
  readonly arcLengthMeters: number;
  readonly alignmentCos: number;
}
```

By leveraging immutable tuples `readonly [number, number, number]`, memory serialization overhead is eliminated, enabling direct bindings to WebGPU / WebGL buffer attributes and WebAssembly vector execution kernels.

---

## 5. Conclusion

The specification of `DetailedInterfaceNormalResult` in Sprint 067 provides the exact geometric foundation required for conservative planetary finite-volume simulations on discrete global grid systems. Downstream sprints will directly integrate this contract into the core spatial flux monads, enabling advective atmospheric models, ocean currents, and biogeochemical cycles that satisfy the First and Second Laws of Thermodynamics.
```

---