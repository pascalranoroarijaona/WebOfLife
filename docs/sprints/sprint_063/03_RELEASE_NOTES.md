# Sprint 063 Release Notes: 3D Horizontal Boundary Normal Vector Computation

**Sprint Duration:** Sprint 063  
**Module:** `src/spatial/h3_adjacency.ts`  
**Status:** Completed & Verified  

---

## Executive Summary

Sprint 063 delivers the mathematical completion of the boundary Darboux frame on the spherical discrete geodesic grid $S^2 \subset \mathbb{R}^3$. Building directly upon the boundary midpoint localization (`computeSharedBoundaryMidpoint3D`, Sprint 061) and boundary arc unit tangent vector computation (`computeBoundaryTangentVector3D`, Sprint 062), this sprint introduces `computeBoundaryHorizontalNormal3D` and its companion overload `computeBoundaryHorizontalNormalFromEndpoints3D`.

The newly implemented functions compute the unoriented, in-plane horizontal unit normal vector $\hat{\mathbf{n}}_h \in T_{\mathbf{m}}S^2$ across cell-cell boundary interfaces. This provides the exact geometric operator required for calculating horizontal advective fluxes, barotropic mass transport, oceanic geostrophic currents, and Fickian diffusion without fictitious vertical projection.

---

## Architectural Context & Pipeline Evolution

In the discrete finite-volume formulation of the Web of Life engine, horizontal transport processes between adjacent H3 hexagonal/pentagonal cells require an orthonormal basis evaluated at the facet midpoint $\mathbf{m}$:

$$\begin{array}{rcccl}
\text{Sprint 061} & : & \mathbf{v}_1, \mathbf{v}_2 & \longrightarrow & \text{Midpoint } \mathbf{m} = \text{computeSharedBoundaryMidpoint3D}(\mathbf{v}_1, \mathbf{v}_2) \\
\text{Sprint 062} & : & \mathbf{v}_1, \mathbf{v}_2 & \longrightarrow & \text{Tangent } \hat{\mathbf{t}} = \text{computeBoundaryTangentVector3D}(\mathbf{v}_1, \mathbf{v}_2) \\
\mathbf{\text{Sprint 063}} & : & \hat{\mathbf{t}}, \hat{\mathbf{r}} & \longrightarrow & \text{Horizontal Normal } \hat{\mathbf{n}}_h = \text{computeBoundaryHorizontalNormal3D}(\hat{\mathbf{t}}, \hat{\mathbf{r}})
\end{array}$$

Together with the radial unit normal $\hat{\mathbf{r}} = \mathbf{m} / \|\mathbf{m}\|$, the triad $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ establishes an explicit, right-handed orthonormal Darboux frame at each cell boundary interface:

```
           ^ Radial Normal (r)
           |
           |
           +-----> Boundary Tangent (t)
          /
         /
        v Horizontal Boundary Normal (n_h)
```

---

## Mathematical & Physical Governance

### 1. Vector Formulation & Orthonormality Contract
For a shared boundary edge between cells $c_i$ and $c_j$ with unit tangent $\hat{\mathbf{t}}$ and radial surface normal $\hat{\mathbf{r}}$:

$$\mathbf{n}_{\text{raw}} = \hat{\mathbf{t}} \times \hat{\mathbf{r}} = \begin{pmatrix}
t_y r_z - t_z r_y \\
t_z r_x - t_x r_z \\
t_x r_y - t_y r_x
\end{pmatrix}$$

The horizontal normal is evaluated and safeguarded against numerical cancellation:

$$\hat{\mathbf{n}}_h = \begin{cases}
\frac{\mathbf{n}_{\text{raw}}}{\|\mathbf{n}_{\text{raw}}\|}, & \|\mathbf{n}_{\text{raw}}\| > \varepsilon \\
(0, 0, 0), & \text{otherwise}
\end{cases}$$

where $\varepsilon = 10^{-12}$ by default. The resulting triad guarantees:
- $\langle \hat{\mathbf{t}}, \hat{\mathbf{n}}_h \rangle = 0 \pm 10^{-12}$
- $\langle \hat{\mathbf{n}}_h, \hat{\mathbf{r}} \rangle = 0 \pm 10^{-12}$
- $\|\hat{\mathbf{n}}_h\| = 1 \pm 10^{-12}$ (for non-degenerate inputs)

### 2. First Law of Thermodynamics: Conservation of Mass and Energy
Horizontal advective flux $\Phi_{M, ij}$ across boundary $e_{ij}$ of length $L_{ij}$ and layer thickness $\Delta z$ is projected onto the normal:

$$\Phi_{M, ij} = \int_{e_{ij}} (\mathbf{J}_M \cdot \hat{\mathbf{n}}_{ij}) \, d\ell = (\mathbf{J}_M(\mathbf{m}) \cdot \hat{\mathbf{n}}_{ij}) L_{ij} \Delta z$$

Because $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \equiv 0$, horizontal advective velocities cannot project onto the local vertical column, guaranteeing zero fictitious vertical leakage. Furthermore, anti-symmetry $\hat{\mathbf{n}}_{ij} = -\hat{\mathbf{n}}_{ji}$ ensures strict numerical conservation:

$$\sum_{\text{cells } i} \sum_{j \in \mathcal{N}(i)} \Phi_{M, ij} = 0$$

### 3. Second Law of Thermodynamics: Non-Negative Entropy Production
Diffusive entropy dissipation across boundary interfaces:

$$\dot{S}_{\text{facet}} = L_{ij} \Delta z \cdot \kappa \frac{(T_i - T_j)^2}{T_i T_j d_{ij}} \ge 0$$

strictly requires that temperature and chemical potential gradients are projected orthogonally across cell boundaries. Non-orthogonal leakage would induce artificial anti-dissipative instabilities; the exact orthonormality of $\hat{\mathbf{n}}_h$ prevents spurious negative entropy generation.

---

## API Specification & Interface Changes

### Additions to `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Computes the unoriented horizontal boundary unit normal vector in 3D Cartesian coordinates.
 * The horizontal normal lies in the tangent plane of the planetary sphere at the boundary midpoint
 * and is orthogonal to both the boundary edge tangent vector and the radial surface normal.
 *
 * Mathematically: n_h = normalize(tangent x radialNormal)
 *
 * @param tangent - Unit tangent vector along the boundary edge (t)
 * @param radialNormal - Radial outward unit normal vector at the edge midpoint (r)
 * @param epsilon - Numerical tolerance for non-zero cross product norm (default: 1e-12)
 * @returns Unit Vector3D representing the unoriented horizontal normal, or zero vector if degenerate
 */
export function computeBoundaryHorizontalNormal3D(
  tangent: Vector3D,
  radialNormal: Vector3D,
  epsilon: number = 1e-12
): Vector3D;

/**
 * Convenience helper computing the horizontal boundary normal directly from edge endpoints
 * and midpoint Cartesian coordinates.
 *
 * @param v1 - First endpoint of the boundary edge
 * @param v2 - Second endpoint of the boundary edge
 * @param midpoint - Boundary midpoint vector
 * @param epsilon - Numerical tolerance (default: 1e-12)
 * @returns Unit Vector3D representing the horizontal boundary normal
 */
export function computeBoundaryHorizontalNormalFromEndpoints3D(
  v1: Vector3D,
  v2: Vector3D,
  midpoint: Vector3D,
  epsilon: number = 1e-12
): Vector3D;
```

---

## Verification & Test Strategy

Unit test coverage implemented in `tests/sprint_063.test.ts` covers the full operational envelope:

1. **Equatorial Geodesic Normal Verification**:
   - Boundary directed east-west ($\hat{\mathbf{t}} = (0, 1, 0)$) at the equator on the prime meridian ($\hat{\mathbf{r}} = (1, 0, 0)$).
   - Validates that $\hat{\mathbf{n}}_h = (0, 0, -1)$ pointing southward along the meridian.
2. **Meridional Geodesic Normal Verification**:
   - Boundary directed northwards ($\hat{\mathbf{t}} = (0, 0, 1)$) at the prime meridian equator ($\hat{\mathbf{r}} = (1, 0, 0)$).
   - Validates that $\hat{\mathbf{n}}_h = (0, 1, 0)$ pointing eastward along the parallel.
3. **General Spherical Position & Unit Norm Invariance**:
   - Tested across non-trivial arbitrary spherical coordinates $(\phi = 37^\circ, \lambda = -122^\circ)$.
   - Validates $\|\hat{\mathbf{n}}_h\| = 1.0 \pm 10^{-12}$.
4. **Orthogonality Invariant Checks**:
   - Evaluates $\langle \hat{\mathbf{n}}_h, \hat{\mathbf{t}} \rangle = 0 \pm 10^{-12}$.
   - Evaluates $\langle \hat{\mathbf{n}}_h, \hat{\mathbf{r}} \rangle = 0 \pm 10^{-12}$.
5. **Degeneracy & Singularity Handling**:
   - Parallel input vectors ($\hat{\mathbf{t}} \parallel \hat{\mathbf{r}}$) and zero-length input vectors return `(0, 0, 0)` without throwing runtime exceptions or producing `NaN`/`Infinity`.

---

## Backward Compatibility & Non-Breaking Status

- **Additive Changes Only**: All changes introduce new functions without altering existing method signatures in `src/spatial/h3_adjacency.ts`.
- **Zero Runtime Regressions**: No existing interfaces or data structures were altered. Existing boundary midpoint and tangent APIs continue to function identically.