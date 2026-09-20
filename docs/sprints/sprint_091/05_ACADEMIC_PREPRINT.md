# Aperture Classification and Hexagonal Orientation Dynamics in Discrete Global Grid Systems for Conservative Thermodynamic Transport

**Pascal Ranoro-Arijaona**  
*Gaia Web of Life Research Initiative*  
Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## Abstract
Planetary-scale discrete global grid systems (DGGS) tiling the sphere with hexagonal partitions inherently face orientation shifts across spatial hierarchical scales. In Uber H3 Aperture-7 tessellations, successive refinement levels undergo an area reduction factor of 7 and a discrete coordinate axis rotation of $\alpha \approx 19.1063^\circ$. In this work, we demonstrate that neglecting aperture parity across cell boundaries introduces systematic angular projection error in directional advective-diffusive fluxes, causing non-physical numerical divergence and spurious entropy generation. We formalize and evaluate `getApertureClassForResolution(res)` within the open-source Gaia Web of Life engine, establishing deterministic alternating parity between `CLASS_II` (even resolutions) and `CLASS_III` (odd resolutions). We prove that aperture-aligned boundary normal transformations preserve mass-energy conservation under the First Law of Thermodynamics and eliminate artificial entropy sinks under the Second Law.

---

## 1. Introduction
Discrete global grid systems (DGGS) based on icosahedral hexagonal apertures provide superior angular uniformity, isotropic adjacency, and minimized distortion compared to traditional latitude-longitude grids. However, Aperture-7 hierarchies partition space such that child hexagons are tilted relative to their parent cells.

In physical and biological simulation environments—such as the thermodynamic modeling of carbon, water, and enthalpy stocks in the Gaia Web of Life project—inter-cell transport is computed via surface normal projections $\mathbf{J} \cdot \mathbf{n}_k$. An unrotated boundary assumption induces an angular error $\delta \theta = \alpha \approx 19.1063^\circ$, leading to numerical flux drift:
$$\epsilon_{\text{proj}} = |\cos(\phi - \alpha) - \cos\phi| > 0$$

## 2. Mathematical Formalism
Let resolution index be $r \in \mathbb{N}_0$. The aperture orientation class follows:
$$\text{ApertureClass}(r) = \begin{cases}
\text{CLASS\_II}, & \text{if } r \equiv 0 \pmod 2 \\
\text{CLASS\_III}, & \text{if } r \equiv 1 \pmod 2
\end{cases}$$

The rotation angle $\alpha$ is derived analytically from the Aperture-7 centroid displacement:
$$\alpha = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.333473172 \text{ rad} \ (19.1062629^\circ)$$

The boundary face unit normals $\mathbf{n}_k(r)$ for $k \in \{0, \dots, 5\}$ are evaluated via the 2D rotation operator $\mathbf{R}(\theta_r)$:
$$\mathbf{n}_k(r) = \mathbf{R}(\theta_r) \begin{pmatrix} \cos\left(\frac{k\pi}{3}\right) \\ \sin\left(\frac{k\pi}{3}\right) \end{pmatrix}, \quad \theta_r = \begin{cases} 0, & r \equiv 0 \pmod 2 \\ \alpha, & r \equiv 1 \pmod 2 \end{cases}$$

## 3. Thermodynamic Conservation Invariants
1. **First Law (Mass-Energy Conservation)**: The directional flux across interface edge $k$ between adjacent cells $i$ and $j$ satisfies anti-symmetry $\Phi_{s, i \to j} = -\Phi_{s, j \to i}$. Under the aperture-corrected normal vectors, the global stock sum satisfies:
   $$\sum_{i \in \Omega} \Delta M_{s, i} = 0$$
2. **Second Law (Non-Negative Entropy Generation)**:
   $$\dot{S}_{\text{gen}, i \to j} = \Phi_{U} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) + \sum_s \Phi_s \left( \frac{\mu_{s, i}}{T_i} - \frac{\mu_{s, j}}{T_j} \right) \ge 0$$
   Aperture-corrected normal alignment prevents spurious sign reversals of $\dot{S}_{\text{gen}}$.

## 4. Implementation and Empirical Verification
Implemented in TypeScript within `src/spatial/h3_adjacency.ts`, the pure mapping function satisfies $O(1)$ time complexity and zero heap allocation overhead. All validation suites (`npx tsx tests/sprint_091.test.ts`) confirm parity correctness from resolution 0 through 15 and enforce rigorous boundary safety (throwing `RangeError` on invalid inputs).
```

---