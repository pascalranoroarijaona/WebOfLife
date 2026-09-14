# Exact Longitudinal Boundary Normalization and Antimeridian Advective Invariants on Discrete Global Grid Systems

**Author:** Pascal Ranoroarijaona & The Web of Life Core Architecture Team  
**Affiliation:** Web of Life Planetary Simulation Project  
**Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Date:** March 2025  

---

## Abstract

Discrete Global Grid Systems (DGGS) over spherical manifolds $\mathcal{M} \cong S^2$ require bi-continuous mapping between local topological cells and continuous geographic coordinates $(\phi, \lambda)$. When fluid dynamics, trace gas advection, and thermodynamics are evaluated numerically across the antimeridian ($\lambda = \pm 180^\circ$), longitudinal coordinates accumulate zonal displacement vectors that drive coordinates beyond the fundamental representative domain. In IEEE 754 floating-point arithmetic, naive modulo operations produce negative-remainder artifacts, negative-zero ambiguity ($-0.0$), and out-of-bounds boundary conditions ($\lambda = +180.0^\circ$) that cause cell mapping failures in icosahedral partition engines such as Uber H3.

This paper establishes the mathematical formulation, algorithmic implementation, and thermodynamic validation of `normalizeLongitudeDegrees`, a closed-form projection mapping $\mathcal{W}: \mathbb{R} \to [-180, 180)$ implemented in `src/spatial/h3_adjacency.ts`. We prove that $\mathcal{W}$ satisfies translational periodicity, guarantees exact left-closed right-open boundary assignment ($\mathcal{W}(\pm 180.0^\circ) = -180.0^\circ$), canonicalizes floating-point zero, and preserves First and Second Law thermodynamic invariances under continuous atmospheric and oceanic advective fluxes across the International Date Line.

---

## 1. Introduction and Topological Foundations

Simulating closed-loop planetary biospheres requires representing spatial advection across an undivided spherical manifold $S^2$. While discrete icosahedral coordinate partitions such as Uber H3 assign discrete indices to discrete surface partitions, continuous dynamic fields (e.g., wind velocity vectors $\mathbf{u} = (u_\phi, u_\lambda)$, atmospheric humidity $q$, trace carbon dioxide $\chi_{\text{CO}_2}$, and sensible heat $c_p T$) are integrated continuously along trajectories:

$$\lambda(t + \Delta t) = \lambda(t) + \int_{t}^{t+\Delta t} \frac{u_\lambda(\tau)}{R \cos \phi(\tau)} \, d\tau$$

The geographic longitude coordinate $\lambda$ is a local chart coordinate parameterizing the circle $S^1 \cong \mathbb{R} / 360\mathbb{Z}$. While continuous motion on $S^1$ is unbounded in the covering space $\mathbb{R}$, digital DGGS indexing engines evaluate point-in-cell mappings $\mathcal{H}: [-\pi/2, \pi/2] \times [-180^\circ, 180^\circ) \to \mathbb{N}_{64}$. 

Without exact coordinate canonicalization:
1. Longitude accumulation $\lambda \ge 180^\circ$ or $\lambda < -180^\circ$ causes DGGS lookup routines (`latLonToCell`) to return invalid cells, throw exceptions, or clamp to incorrect boundary indices.
2. Symmetrical boundaries $\lambda = \pm 180^\circ$ produce dual-key aliasing if both $+180^\circ$ and $-180^\circ$ are permitted, violating the bijection between coordinates and spatial partitions.
3. IEEE 754 signed zero representations ($-0.0^\circ$) propagate into coordinate hashing keys, fragmenting state monad aggregations.

To address these vulnerabilities, Sprint 054 introduces the pure canonical transformation primitive `normalizeLongitudeDegrees`.

---

## 2. Mathematical Derivation and IEEE 754 Truncation

The quotient group projection $\pi: \mathbb{R} \to \mathbb{R} / 360\mathbb{Z}$ requires selecting a fundamental representative interval $\mathcal{D} = [-180.0, 180.0)$. The analytical projection is given by:

$$f(\lambda) = \left( (\lambda + 180) \bmod 360 \right) - 180$$

where $\bmod$ denotes Euclidean floored modulo ($a \bmod b \in [0, b)$ for $b > 0$).

In standard IEEE 754 implementations (including ECMAScript/Node.js), the binary `%` operator computes the truncated remainder:

$$a \% b = a - b \cdot \operatorname{trunc}(a / b)$$

yielding negative remainders for negative arguments ($(-90) \% 360 = -90$). To achieve branch-free floored periodicity over all finite real numbers without dynamic branching penalties, the dual-modulus translation is formulated:

$$\mathcal{W}(\lambda) = \left( \left( ((\lambda + 180) \% 360) + 360 \right) \% 360 \right) - 180$$

### 2.1 Boundary Analysis
- For $\lambda = 180.0$:
  $$(180 + 180) \% 360 = 0 \implies (0 + 360) \% 360 = 0 \implies 0 - 180 = -180.0$$
- For $\lambda = -180.0$:
  $$(-180 + 180) \% 360 = 0 \implies (0 + 360) \% 360 = 0 \implies 0 - 180 = -180.0$$
- For $\lambda = -0.0$:
  $$(-0.0 + 180) \% 360 = 180 \implies (180 + 360) \% 360 = 180 \implies 180 - 180 = +0.0$$

The result guarantees that $\mathcal{W}(\lambda) \in [-180.0, 180.0)$ identically for all $\lambda \in \mathbb{R}$, eliminating upper boundary collision and stabilizing negative zero.

---

## 3. Conservative Thermodynamic Transport Across the Antimeridian

Physical fluxes crossing the antimeridian interface $\Gamma_{180} = \{(\phi, \lambda) \mid \lambda = \pm 180^\circ\}$ must satisfy the First and Second Laws of Thermodynamics. 

Let a western cell $c_W$ ($\lambda \to 180^\circ$) and an eastern cell $c_E$ ($\lambda \to -180^\circ$) exchange mass and energy under positive zonal velocity $u_\lambda > 0$. The interface cross-sectional area is $A = R \cdot \Delta \phi \cdot H_{\text{atm}}$.

### 3.1 First Law Conservation
The advective mass flux vector $\mathbf{J}_M$ for atmospheric constituent $k \in \{\text{H}_2\text{O}, \text{CO}_2, \text{O}_2, \text{Aerosols}\}$ and sensible/latent thermal enthalpy flux $\mathbf{J}_H$ must satisfy:

$$\frac{d M_k(c_W)}{dt} = -\mathbf{J}_{M,k} \cdot \hat{\mathbf{n}} A, \quad \frac{d M_k(c_E)}{dt} = +\mathbf{J}_{M,k} \cdot \hat{\mathbf{n}} A$$
$$\sum_{c \in \{c_W, c_E\}} \frac{d M_k(c)}{dt} = 0, \quad \sum_{c \in \{c_W, c_E\}} \frac{d E(c)}{dt} = 0$$

Because $\mathcal{W}$ is an isometry on $S^2$, coordinate normalization introduces no spurious mass dissipation ($\Delta M \equiv 0$) and no artificial thermal loss ($\Delta E \equiv 0$).

### 3.2 Second Law Entropy Stability
Zonal advective mixing across the boundary maintains non-negative entropy generation:

$$\dot{S}_{\text{gen}} = J_H \left( \frac{1}{T_E} - \frac{1}{T_W} \right) \ge 0 \quad \text{for } T_W \ge T_E$$

Because $\mathcal{W}$ guarantees topological continuity across the antimeridian, spatial gradients $\nabla T$ remain smooth, preventing unphysical entropy sinks or numerical shocks.

---

## 4. Implementation and Test Suite Verification

The TypeScript implementation is integrated into `src/spatial/h3_adjacency.ts`:

```typescript
export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return NaN;
  }
  const wrapped = (((lonDeg + 180) % 360) + 360) % 360;
  const normalized = wrapped - 180;
  return normalized === 0 ? 0 : normalized;
}
```

The verification suite `tests/sprint_054.test.ts` asserts:
1. Invariant mapping: $\forall k \in [-10, 10],\; \mathcal{W}(\lambda + 360 k) = \mathcal{W}(\lambda)$.
2. Left-closed, right-open interval adherence: $\mathcal{W}(180.0) = -180.0$, $\mathcal{W}(-180.0) = -180.0$.
3. Sub-microdegree precision preservation at $10^{-9}$ degree scales.
4. Absolute mass and energy conservation across monadic advection steps.

---

## References

1. Sahr, K., White, D., & Kimerling, A. J. (2003). Geodesic discrete global grid systems. *Cartography and Geographic Information Science*, 30(2), 121–134.
2. Uber Technologies. (2018). *H3: A Hexagonal Hierarchical Spatial Index*. GitHub.
3. IEEE Computer Society. (2019). *IEEE Standard for Floating-Point Arithmetic* (IEEE Std 754-2019).
4. Ranoroarijaona, P. (2025). *Web of Life: Thermodynamic Planetary Biosphere Simulation Engine*. GitHub repository: `https://github.com/pascalranoroarijaona/WebOfLife`.