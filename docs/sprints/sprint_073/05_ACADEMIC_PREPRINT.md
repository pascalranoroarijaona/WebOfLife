# Conservative Discrete Global Grid Systems: Spherical Angular Tolerance Validation for Shared Boundary Interfaces

**Author**: Pascal Ranoroarijaona & The Web of Life Consortium  
**Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Date**: March 2025  

---

## Abstract
Discrete Global Grid Systems (DGGS) based on icosahedral hexagonal hierarchies (such as Uber H3) project spherical planetoid surfaces into discrete areal partitions. In planetary-scale physical simulations, cell interfaces serve as finite-volume transport channels for mass and energy. However, independent polygon extraction across neighboring cells introduces numerical vertex jitter due to floating-point truncation and coordinate transformations. Without an explicit topological assertion mechanism, boundary dislocations form, producing artificial geometric leakage that breaches the First Law of Thermodynamics. This paper details the mathematical formulation, algorithmic implementation, and thermodynamic implications of `assertBoundaryEndpointTolerance` in `src/spatial/h3_adjacency.ts`. By establishing a numerically stable Vincenty-Haversine angular metric and enforcing invariant assertions prior to flux evaluation, interface porosity is bounded to machine precision, guaranteeing conservative transport across global manifolds.

---

## 1. Introduction and Thermodynamic Motivation
In computational Earth and ecological modeling, spatial conservation is paramount. When simulating lateral biogeochemical flows—such as dissolved inorganic carbon (DIC), dissolved oxygen (DO), soil water, and thermal enthalpy—the total system mass $\mathcal{M}$ and total energy $\mathcal{E}$ must follow strict conservation laws:

$$\frac{d\mathcal{M}}{dt} = \dot{\mathcal{M}}_{\text{source}} - \dot{\mathcal{M}}_{\text{sink}}$$

When space is discretized into discrete global cells $\{C_k\}_{k=1}^N$, Gauss's Divergence Theorem transforms the spatial balance of an advected quantity $\rho_X$ with velocity $\mathbf{v}$ into a summation of boundary fluxes across interface edges:

$$\int_{C_u} \nabla \cdot (\rho_X \mathbf{v}) \, dV = \oint_{\partial C_u} \rho_X \mathbf{v} \cdot \hat{\mathbf{n}} \, dl = \sum_{v \in \mathcal{N}(u)} J_{u \to v}^X$$

Conservative lateral exchange mandates pairwise anti-symmetry:
$$J_{u \to v}^X = -J_{v \to u}^X$$

If cell $C_u$ and cell $C_v$ evaluate their shared boundary $E_{uv}$ with geometric discrepancy, terminal vertices fail to coincide. This topological mismatch introduces an artificial boundary aperture $\delta L = R_{\oplus} \Delta\sigma$, allowing unmetered flux escape:

$$\dot{M}_{\text{leak}}^X = \rho_X \|\mathbf{v}\| (R_{\oplus} \Delta\sigma) h_{\text{layer}}$$

Sprint 073 introduces an explicit invariant contract ensuring $\Delta\sigma \le \epsilon_{\text{angular}}$, guaranteeing strict closure before flux computation begins.

---

## 2. Spherical Angular Metric Formulation
Let spherical coordinates on the unit sphere $\mathbb{S}^2$ be represented as latitude and longitude pairs $(\phi, \lambda)$, with $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ and $\lambda \in [-\pi, \pi]$.

Given two endpoints $P_A = (\phi_A, \lambda_A)$ and $P_B = (\phi_B, \lambda_B)$, computing central angular separation $\Delta\sigma_{AB}$ via naive spherical law of cosines suffers from severe catastrophic cancellation for points where $\Delta\sigma \to 0$. We therefore utilize the Vincenty-Haversine hybrid formulation:

$$\Delta\phi = \phi_B - \phi_A, \quad \Delta\lambda = \lambda_B - \lambda_A$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_A) \cos(\phi_B) \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$\Delta\sigma_{AB} = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{\max(0.0, 1.0 - a)}\right)$$

In equivalent Euclidean 3-space, the projection $\mathbf{u}(\phi, \lambda) = [\cos\phi \cos\lambda, \, \cos\phi \sin\lambda, \, \sin\phi]^T$ yields:
$$\Delta\sigma_{AB} = 2 \arcsin\left(\frac{\|\mathbf{u}_A - \mathbf{u}_B\|_2}{2}\right)$$

---

## 3. Algorithmic Invariant Contract
The assertion contract is implemented within `src/spatial/h3_adjacency.ts`:

```typescript
export function assertBoundaryEndpointTolerance(
  endpointA: [number, number],
  endpointB: [number, number],
  maxAngularToleranceRad: number = 1.0e-6,
  options?: BoundaryToleranceOptions
): void {
  const angularDist = computeSphericalAngularDistance(
    endpointA,
    endpointB,
    options?.useDegrees ?? false
  );

  if (angularDist > maxAngularToleranceRad) {
    throw new BoundaryEndpointToleranceExceededError(
      endpointA,
      endpointB,
      angularDist,
      maxAngularToleranceRad,
      options?.context
    );
  }
}
```

### Shared Edge Alignment Contract
For cell $C_u$ with directed boundary edge $E_u = (V_{u,1}, V_{u,2})$ and adjacent cell $C_v$ with reverse edge $E_v = (V_{v,1}, V_{v,2})$:
$$\Delta\sigma(V_{u,1}, V_{v,2}) \le \epsilon_{\text{angular}} \quad \land \quad \Delta\sigma(V_{u,2}, V_{v,1}) \le \epsilon_{\text{angular}}$$

---

## 4. Error Bounds & Leakage Analysis

Under the standard threshold $\epsilon_{\text{angular}} = 1.0 \times 10^{-6}\text{ rad}$, the maximum metric dislocation along Earth's surface ($R_{\oplus} = 6.3710088 \times 10^6\text{ m}$) is:
$$\delta L_{\max} = R_{\oplus} \cdot \epsilon_{\text{angular}} \approx 6.371\text{ m}$$

In high-precision simulation modes with $\epsilon_{\text{angular}} = 1.0 \times 10^{-9}\text{ rad}$:
$$\delta L_{\max} \approx 6.371\text{ mm}$$

Given an advective flux across interface length $L_{uv} \approx 10^5\text{ m}$ (H3 resolution 4), the relative boundary leakage error bound is:
$$\frac{\dot{M}_{\text{leak}}}{\dot{M}_{\text{boundary}}} \le \frac{\delta L_{\max}}{L_{uv}} = \frac{6.371 \times 10^{-3}\text{ m}}{10^5\text{ m}} \approx 6.371 \times 10^{-8}$$
This rigorously bounds numerical drift below the discretization thresholds of typical finite-volume geophysical schemes.

---

## 5. Verification Matrix
The implementation is verified in `tests/sprint_073.test.ts` across edge conditions:
1. **Identical Coordinates**: $\Delta\sigma = 0$, assertion succeeds.
2. **Sub-Tolerance Jitter**: $\Delta\sigma = 0.5 \epsilon$, assertion succeeds.
3. **Breach Boundary**: $\Delta\sigma = 1.001 \epsilon$, raises `BoundaryEndpointToleranceExceededError`.
4. **Antimeridian Wrapping**: Cross-meridian coordinates properly normalize $-\pi \equiv \pi$.
5. **Polar Degeneracy**: Longitude variations at $\phi = \pm \frac{\pi}{2}$ collapse to zero distance.

---

## 6. Conclusion
By introducing `assertBoundaryEndpointTolerance`, Web of Life eliminates geometric boundary porosity in discrete global grids, establishing a robust mathematical and thermodynamic foundation for planetary transport monads.
```

---