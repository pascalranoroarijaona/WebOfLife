# Hierarchical Aperture-7 Class III Coordinate Rotation Angle Computation in Discrete Global Grid Thermodynamic Systems

**Pascal Ranoroarijaona**  
*Chief Systems Architect, Web of Life Project*  
`pascal@weboflife.net` — https://github.com/pascalranoroarijaona/WebOfLife

---

## Abstract
Discrete Global Grid Systems (DGGS) based on Aperture-7 hexagonal hierarchies, such as the Uber H3 spatial index, exhibit rotational shifts between hierarchical resolution tiers. Odd resolution transitions (Class III) introduce an irrational angular displacement $\theta_{\text{ap7}} = \arcsin(\sqrt{3} / (2\sqrt{7})) \approx 0.333473172$ radians ($\approx 19.106605^\circ$) relative to principal icosahedral coordinate axes. In multi-scale thermodynamic simulations, advective and diffusive spatial fluxes of mass, heat, and nutrients traversing heterogeneous resolution interfaces must undergo coordinate transformation to prevent spurious numerical diffusion and ensure strict compliance with the First and Second Laws of Thermodynamics. In this paper, we formalize the signed discrete transition function $\text{countClassIIIApertureSteps}(r_1, r_2)$ and cumulative rotation calculation $\text{computeClassIIIRotationAngleRadians}(r_1, r_2)$. We prove that the resulting $\mathrm{SO}(2)$ orthogonal coordinate rotation preserves vector $L_2$ norm, divergence scalar fields, and guarantees non-negative entropy generation across multi-resolution discrete global manifolds.

---

## 1. Introduction & Physical Motivation
Multi-resolution planetary biogeochemical models require tessellating the sphere into uniform, equal-area partitions while supporting adaptive mesh refinement (AMR). Hexagonal Discrete Global Grid Systems structured under Aperture-7 subdivision provide near-optimal packing and uniform neighbor distance. However, unlike dyadic quadtrees or Aperture-3/4 subdivisions, Aperture-7 grids alternate between two distinct topological orientations:
- **Class II**: Even resolutions ($r \in \{0, 2, 4, \dots\}$), where cell vertices align symmetrically with the base icosahedral edges.
- **Class III**: Odd resolutions ($r \in \{1, 3, 5, \dots\}$), which undergo an inherent rotation $\theta_{\text{ap7}}$ relative to the parent coordinate basis.

When spatial vector fields $\mathbf{J} \in \mathbb{R}^2$ representing energy ($W/\text{m}^2$) or mass ($kg/(\text{m}^2\cdot s)$) propagate across cells of mismatched resolution, uncorrected vectors induce projection errors that corrupt mass-energy divergence:
$$\nabla \cdot \mathbf{J} \neq \nabla' \cdot \mathbf{J}_{\text{uncorrected}}$$
This preprint details the mathematical foundations, discrete algebraic methods, and invariant preservation implemented in `src/spatial/h3_adjacency.ts` within the open-source **Web of Life** engine.

---

## 2. Mathematical Formalism

### 2.1 Fundamental Constant
The geometric transition of Aperture-7 hexagon centroids across adjacent resolutions forms a right triangle on the hexagonal lattice with opposite side $\sqrt{3}/2$ and hypotenuse $\sqrt{7}$, yielding:
$$\theta_{\text{ap7}} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) = \arctan\left(\frac{\sqrt{3}}{5}\right) \approx 0.33347317229183211765 \text{ rad}$$

### 2.2 Discrete Step Count & Parity Mapping
Let $r_1, r_2 \in [0, 15] \cap \mathbb{Z}$ represent valid H3 resolution tiers. An Aperture-7 step from $r \to r+1$ introduces a Class III rotation if and only if $r+1$ is odd. The net signed Class III aperture steps $n_{\text{III}}(r_1, r_2)$ are defined by:
$$n_{\text{III}}(r_1, r_2) = \operatorname{sgn}(r_2 - r_1) \sum_{k=\min(r_1, r_2)}^{\max(r_1, r_2) - 1} \mathbf{1}_{\{ (k+1) \equiv 1 \pmod 2 \}}$$

Properties:
1. **Identity**: $n_{\text{III}}(r, r) = 0$
2. **Antisymmetry**: $n_{\text{III}}(r_1, r_2) = -n_{\text{III}}(r_2, r_1)$
3. **Transitivity**: $n_{\text{III}}(r_1, r_2) + n_{\text{III}}(r_2, r_3) = n_{\text{III}}(r_1, r_3)$

### 2.3 Angular Scaling & Modular Normalization
The cumulative rotation angle $\Theta(r_1, r_2)$ is:
$$\Theta(r_1, r_2) = n_{\text{III}}(r_1, r_2) \cdot \theta_{\text{ap7}}$$
When normalized onto $[-\pi, \pi)$:
$$\Theta_{\text{norm}} = \Theta - 2\pi \left\lfloor \frac{\Theta + \pi}{2\pi} \right\rfloor$$

---

## 3. Thermodynamic Invariant Proofs

### Theorem 1: First Law Conservation (Norm Invariance)
**Statement**: Let $\mathbf{J} \in \mathbb{R}^2$ be a flux vector at resolution $r_1$. Under transformation $\mathbf{J}' = \mathbf{R}(\Theta) \mathbf{J}$ with $\Theta = \Theta(r_1, r_2)$, the kinetic energy density and flux magnitude satisfy $\|\mathbf{J}'\|_2 = \|\mathbf{J}\|_2$.  
**Proof**: The rotation matrix $\mathbf{R}(\Theta) \in \mathrm{SO}(2)$ has determinant $\det(\mathbf{R}) = \cos^2\Theta + \sin^2\Theta = 1$ and $\mathbf{R}^T \mathbf{R} = \mathbf{I}$. Therefore:
$$\|\mathbf{J}'\|_2^2 = \mathbf{J}'^T \mathbf{J}' = (\mathbf{R}\mathbf{J})^T (\mathbf{R}\mathbf{J}) = \mathbf{J}^T \mathbf{R}^T \mathbf{R} \mathbf{J} = \mathbf{J}^T \mathbf{I} \mathbf{J} = \|\mathbf{J}\|_2^2$$
No matter or energy is created or destroyed by resolution transformation. $\blacksquare$

### Theorem 2: Second Law Conservation (Entropy Generation Invariance)
**Statement**: The rate of entropy production per unit volume $\sigma = -\frac{1}{T^2} \mathbf{J}_q \cdot \nabla T$ under thermal diffusion is strictly invariant under Class III rotation.  
**Proof**: In transformed coordinates, $\mathbf{J}_q' = \mathbf{R}\mathbf{J}_q$ and $\nabla' T = \mathbf{R}\nabla T$. The scalar product satisfies:
$$\mathbf{J}_q' \cdot \nabla' T = (\mathbf{R}\mathbf{J}_q)^T (\mathbf{R}\nabla T) = \mathbf{J}_q^T \mathbf{R}^T \mathbf{R} \nabla T = \mathbf{J}_q \cdot \nabla T$$
Thus:
$$\sigma' = -\frac{1}{T^2} (\mathbf{J}_q' \cdot \nabla' T) = -\frac{1}{T^2} (\mathbf{J}_q \cdot \nabla T) = \sigma \ge 0$$
No spurious numerical entropy dissipation or negative entropy generation is introduced across resolution boundaries. $\blacksquare$

---

## 4. Empirical Verification Matrix

| $r_1$ | $r_2$ | Expected $n_{\text{III}}$ | Raw Angle (rad) | Normalized Angle (rad) | Physical Status |
|:-----:|:-----:|:-------------------------:|:---------------:|:----------------------:|:----------------|
| 0 | 0 | 0 | 0.000000000 | 0.000000000 | Identity |
| 0 | 1 | +1 | 0.333473172 | 0.333473172 | Class II $\to$ Class III |
| 1 | 0 | -1 | -0.333473172 | -0.333473172 | Antisymmetric Reversal |
| 0 | 2 | +1 | 0.333473172 | 0.333473172 | Step through Res 1 |
| 1 | 2 | 0 | 0.000000000 | 0.000000000 | Odd to Even (no switch) |
| 0 | 7 | +4 | 1.333892689 | 1.333892689 | Multi-octave cascade |
| 0 | 15 | +8 | 2.667785378 | 2.667785378 | Maximum standard span |
| 15 | 0 | -8 | -2.667785378 | -2.667785378 | Maximum reverse span |

---

## 5. Implementation in TypeScript

```typescript
export const APERTURE_7_ROTATION_RAD: number = 0.3334731722918321;

export function countClassIIIApertureSteps(startRes: number, targetRes: number): number {
  if (!Number.isInteger(startRes) || startRes < 0 || startRes > 15) {
    throw new RangeError(`startRes must be integer in [0, 15], got: ${startRes}`);
  }
  if (!Number.isInteger(targetRes) || targetRes < 0 || targetRes > 15) {
    throw new RangeError(`targetRes must be integer in [0, 15], got: ${targetRes}`);
  }
  if (startRes === targetRes) return 0;
  const forward = targetRes > startRes;
  const min = forward ? startRes : targetRes;
  const max = forward ? targetRes : startRes;
  let steps = 0;
  for (let r = min; r < max; r++) {
    if ((r + 1) % 2 !== 0) steps++;
  }
  return forward ? steps : -steps;
}

export function computeClassIIIRotationAngleRadians(
  startRes: number,
  targetRes: number,
  normalize: boolean = true
): number {
  const steps = countClassIIIApertureSteps(startRes, targetRes);
  const rawAngle = steps * APERTURE_7_ROTATION_RAD;
  if (!normalize) return rawAngle;
  const twoPi = 2 * Math.PI;
  const wrapped = rawAngle - twoPi * Math.floor((rawAngle + Math.PI) / twoPi);
  return wrapped === Math.PI ? -Math.PI : wrapped;
}
```

---

## 6. Conclusion
Sprint 095 establishes an exact, physically conservative mathematical formulation for coordinate rotation across hierarchical Aperture-7 hexagonal grids. By coupling integer Class III parity transition counting with $\mathrm{SO}(2)$ orthogonal vector transformations, the **Web of Life** engine guarantees thermodynamic conservation and entropy invariants across multi-resolution simulation domains.
```

---