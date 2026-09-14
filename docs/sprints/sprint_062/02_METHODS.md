# Sprint 062: Process Mining & Method Specifications

## 1. Physical & Mathematical Foundations

### 1.1 Segment Geometry and Radial Unit Normal Vector
In spherical Discrete Global Grid Systems (DGGS) like H3, cells are mapped onto a sphere or reference ellipsoid of radius $R$ centered at planetary origin $\mathbf{O} = [0, 0, 0]^T$. A cell boundary segment between two adjacent cells is defined by vertices $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$.

The chord midpoint vector $\mathbf{m}$ is:
$$\mathbf{m} = \frac{1}{2}(\mathbf{v}_1 + \mathbf{v}_2)$$

The normalized radial normal unit vector $\hat{\mathbf{n}}_{\text{rad}}$ defines the local zenith (vertical outward normal) at the segment midpoint:
$$\hat{\mathbf{n}}_{\text{rad}} = \frac{\mathbf{m}}{\|\mathbf{m}\|_2} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|_2}$$

Where $\|\mathbf{u}\|_2 = \sqrt{u_x^2 + u_y^2 + u_z^2}$.

### 1.2 Singularity and Epsilon Guard
When $\mathbf{v}_1$ and $\mathbf{v}_2$ are antipodal ($\mathbf{v}_1 = -\mathbf{v}_2$) or degenerate ($\mathbf{v}_1 = \mathbf{v}_2 = \mathbf{0}$):
$$\|\mathbf{v}_1 + \mathbf{v}_2\|_2 < \epsilon \quad (\epsilon = 10^{-12})$$
Under this singularity threshold, normal division is undefined ($0/0$). The algorithm defaults to the canonical polar zenith $\hat{\mathbf{n}}_{\text{rad}} = [0, 0, 1]^T$ (or deterministic fallback based on context), preventing IEEE-754 `NaN` or `Infinity` propagation.

### 1.3 Thermodynamic and Flux Decomposition Invariants
The radial normal unit vector $\hat{\mathbf{n}}_{\text{rad}}$ provides the local vertical axis for the inter-cell boundary triad $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_{\text{lat}}, \hat{\mathbf{n}}_{\text{rad}})$, where:
- $\hat{\mathbf{t}} = \frac{\mathbf{v}_2 - \mathbf{v}_1}{\|\mathbf{v}_2 - \mathbf{v}_1\|_2}$ (tangent unit vector along edge)
- $\hat{\mathbf{n}}_{\text{rad}} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|_2}$ (outward radial normal)
- $\hat{\mathbf{n}}_{\text{lat}} = \hat{\mathbf{t}} \times \hat{\mathbf{n}}_{\text{rad}}$ (lateral normal crossing boundary on spherical tangent plane)

For any surface or atmospheric vector field $\mathbf{F} \in \mathbb{R}^3$ (such as wind velocity, moisture transport, or heat flux), the flux across the boundary facet can be decomposed into:
1. **Vertical/Radial Component**: $F_{\text{rad}} = \mathbf{F} \cdot \hat{\mathbf{n}}_{\text{rad}}$ (updraft, convective heat flux, radiative escape)
2. **Lateral Advective Component**: $F_{\text{lat}} = \mathbf{F} \cdot \hat{\mathbf{n}}_{\text{lat}}$ (inter-cell transport across facet)
3. **Along-Boundary Shear**: $F_{\text{tan}} = \mathbf{F} \cdot \hat{\mathbf{t}}$ (parallel shear stress)

---

## 2. Mass & Energy Deltas in Flux Projections

The computation of `computeBoundarySegmentRadialNormal3D` is a pure geometric transformation:
$$\Delta M_{\text{geom}} = 0 \, \text{kg}, \quad \Delta E_{\text{geom}} = 0 \, \text{J}, \quad \Delta S_{\text{universe}} \ge 0$$

However, when applied in thermodynamic transport processes across boundary segments (e.g., surface-atmosphere boundary layer exchange, horizontal advective exchange between H3 cells), the projected fluxes induce discrete stock transfers.

### 2.1 Boundary Facet Inter-Cell Advective Transfer
For two adjacent H3 cells $A$ and $B$ sharing segment $S_{AB}$ of length $L_s$ and atmospheric layer depth $\Delta z$:
- Boundary facet area: $A_f = L_s \cdot \Delta z \, [\text{m}^2]$
- Advective velocity normal to facet: $u_{\text{lat}} = \mathbf{u} \cdot \hat{\mathbf{n}}_{\text{lat}} \, [\text{m/s}]$
- Volumetric exchange rate: $\dot{V}_{AB} = u_{\text{lat}} A_f \, [\text{m}^3/\text{s}]$

#### Stock Deltas per Timestep $\Delta t$:
1. **Water Vapor Mass Transfer**:
   $$\Delta M_{\text{H}_2\text{O}} = \dot{V}_{AB} \cdot \rho_{\text{air}} \cdot q_v \cdot \Delta t \, [\text{kg}]$$
   $$\text{Cell}_A[\text{H}_2\text{O}] \gets \text{Cell}_A[\text{H}_2\text{O}] - \Delta M_{\text{H}_2\text{O}}$$
   $$\text{Cell}_B[\text{H}_2\text{O}] \gets \text{Cell}_B[\text{H}_2\text{O}] + \Delta M_{\text{H}_2\text{O}}$$

2. **Sensible Heat Transfer**:
   $$\Delta H = \dot{V}_{AB} \cdot \rho_{\text{air}} \cdot c_p \cdot (T_A - T_B) \cdot \Delta t \, [\text{J}]$$
   $$\text{Cell}_A[\text{ThermalEnergy}] \gets \text{Cell}_A[\text{ThermalEnergy}] - \Delta H$$
   $$\text{Cell}_B[\text{ThermalEnergy}] \gets \text{Cell}_B[\text{ThermalEnergy}] + \Delta H$$

3. **Carbon Dioxide / Trace Gas Transfer**:
   $$\Delta M_{\text{CO}_2} = \dot{V}_{AB} \cdot \rho_{\text{air}} \cdot X_{\text{CO}_2} \cdot \left(\frac{M_{\text{CO}_2}}{M_{\text{air}}}\right) \cdot \Delta t \, [\text{kg}]$$

### 2.2 Solar Zenith Angle Calculation on Boundary Facets
The incident shortwave solar radiation at the segment midpoint depends on the radial normal $\hat{\mathbf{n}}_{\text{rad}}$ and solar direction vector $\hat{\mathbf{s}}$:
$$\cos \theta_z = \max\left(0, \hat{\mathbf{s}} \cdot \hat{\mathbf{n}}_{\text{rad}}\right)$$
$$I_{\text{sw}} = I_0 \cdot \tau_{\text{atm}} \cdot \cos \theta_z \, [\text{W/m}^2]$$
$$\Delta E_{\text{solar}} = I_{\text{sw}} \cdot A_{\text{mid}} \cdot \Delta t \, [\text{J}]$$

---

## 3. Monad Method Formalization

### 3.1 Function Signature & Type Contract
```typescript
import { Vector3D } from './h3_types';

export interface BoundarySegment3D {
  readonly v1: Vector3D;
  readonly v2: Vector3D;
}

export function computeBoundarySegmentRadialNormal3D(
  segment: BoundarySegment3D,
  epsilon?: number
): Vector3D;

export function computeBoundarySegmentRadialNormal3DFromPoints(
  v1: Vector3D,
  v2: Vector3D,
  epsilon?: number
): Vector3D;
```

### 3.2 Algorithmic Execution Steps
1. **Unpack Coordinates**:
   Let $\mathbf{v}_1 = [x_1, y_1, z_1]^T$ and $\mathbf{v}_2 = [x_2, y_2, z_2]^T$.
2. **Compute Midpoint Direction**:
   $$x_m = x_1 + x_2, \quad y_m = y_1 + y_2, \quad z_m = z_1 + z_2$$
3. **Compute Euclidean Norm**:
   $$r = \sqrt{x_m^2 + y_m^2 + z_m^2}$$
4. **Degeneracy Check**:
   $$\text{threshold} = \epsilon > 0 \;?\; \epsilon : 10^{-12}$$
   If $r \le \text{threshold}$:
   - Return fallback unit vector $[0, 0, 1]^T$.
5. **Normalize**:
   $$x_n = \frac{x_m}{r}, \quad y_n = \frac{y_m}{r}, \quad z_n = \frac{z_m}{r}$$
6. **Return Output**:
   Return $[x_n, y_n, z_n]^T \in \mathbb{S}^2$.

---

## 4. Verification & Invariance Assertions

| Test Vector / Scenario | Input Segment $(v_1, v_2)$ | Expected Output $\hat{\mathbf{n}}_{\text{rad}}$ | Tolerance |
|---|---|---|---|
| Equatorial Segment | $([1, 0, 0], [0, 1, 0])$ | $[\frac{\sqrt{2}}{2}, \frac{\sqrt{2}}{2}, 0]$ | $\pm 10^{-12}$ |
| Northern Arctic Facet | $([0, 1, 1], [1, 0, 1])$ | $[\frac{1}{\sqrt{6}}, \frac{1}{\sqrt{6}}, \frac{2}{\sqrt{6}}]$ | $\pm 10^{-12}$ |
| Polar Apex Parallel | $([-0.5, 0, 1], [0.5, 0, 1])$ | $[0, 0, 1]$ | $\pm 10^{-12}$ |
| Antipodal Degeneracy | $([1, 0, 0], [-1, 0, 0])$ | $[0, 0, 1]$ (fallback) | Exact |
| Scaled Invariance | $([2, 0, 0], [0, 2, 0])$ | $[\frac{\sqrt{2}}{2}, \frac{\sqrt{2}}{2}, 0]$ | $\pm 10^{-12}$ |
| Unit Length Invariance | Any non-degenerate $v_1, v_2$ | $\|\hat{\mathbf{n}}_{\text{rad}}\|_2 = 1.0$ | $\pm 10^{-14}$ |
| Orthogonality to Tangent (Spherical) | $\|v_1\| = \|v_2\|$ | $\hat{\mathbf{t}} \cdot \hat{\mathbf{n}}_{\text{rad}} = 0$ | $\pm 10^{-12}$ |