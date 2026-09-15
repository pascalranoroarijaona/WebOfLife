# Sprint 073 — Process Mining & Method Specifications: Spherical Boundary Topology & Conservative Interface Fluxes

## 1. Executive Physical & Thermodynamic Overview

In discrete global grid systems (DGGS) operating on spherical planetary manifolds (Earth mean radius $R_{\oplus} \approx 6.3710088 \times 10^6 \text{ m}$), spatial adjacency between adjacent cells $C_u$ and $C_v$ defines bidirectional transport channels for mass (water, carbon, dissolved minerals, oxygen) and energy (sensible and latent heat).

A shared boundary arc $E_{uv} = \partial C_u \cap \partial C_v$ is parameterized by terminal vertices:
$$P_1 = (\phi_1, \lambda_1), \quad P_2 = (\phi_2, \lambda_2)$$
When evaluated independently from neighboring cell geometric registries, numerical jitter or projection shear can produce endpoint divergence:
$$\Delta\sigma = \arccos\left(\sin\phi_A \sin\phi_B + \cos\phi_A \cos\phi_B \cos(\lambda_A - \lambda_B)\right)$$
If $\Delta\sigma > \epsilon_{\text{angular}}$, an artificial geometric dislocation (topological gap or overlap) $\delta L = R_{\oplus} \Delta\sigma$ forms. Across this unclosed boundary manifold, lateral flux divergence deviates from zero, producing non-physical phantom sinks or sources (mass/energy leakage), violating the First Law of Thermodynamics:

$$\oint_{\partial \Omega} \mathbf{J} \cdot \hat{\mathbf{n}} \, dl \neq 0 \implies \frac{d}{dt}\int_{\Omega} \rho \, dV \ne \sum \dot{S}_{\text{in}} - \sum \dot{S}_{\text{out}}$$

Sprint 073 formalizes the mathematical and thermodynamic assertion method `assertBoundaryEndpointTolerance` to eliminate boundary porosity prior to evaluating conservative transport monads.

---

## 2. Mathematical Formalization: Great-Circle Metric & Boundary Alignment

### 2.1 Numerically Stable Central Angular Distance
Given spherical coordinates $P_A = (\phi_A, \lambda_A)$ and $P_B = (\phi_B, \lambda_B)$ in radians, angular separation $\Delta\sigma_{AB}$ is computed using the Vincenty-Haversine hybrid formulation to prevent catastrophic cancellation at small distances:

$$\Delta\phi = \phi_B - \phi_A, \quad \Delta\lambda = \lambda_B - \lambda_A$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_A) \cos(\phi_B) \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$\Delta\sigma_{AB} = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{\max(0.0, 1.0 - a)}\right)$$

Alternatively, converting to unit Cartesian vectors $\mathbf{u}_A, \mathbf{u}_B \in \mathbb{S}^2 \subset \mathbb{R}^3$:
$$\mathbf{u} = \begin{bmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{bmatrix}, \quad \Delta\sigma_{AB} = 2 \arcsin\left(\frac{\|\mathbf{u}_A - \mathbf{u}_B\|_2}{2}\right)$$

### 2.2 Tolerance Invariant Assertion
For a configured maximum angular tolerance $\epsilon_{\text{angular}}$ (nominal threshold: $1.0 \times 10^{-6}\text{ rad} \approx 6.371\text{ m}$; high-precision threshold: $1.0 \times 10^{-9}\text{ rad} \approx 6.371\text{ mm}$):

$$\Delta\sigma_{AB} \le \epsilon_{\text{angular}}$$

If breached:
$$\text{raise } \text{BoundaryEndpointToleranceExceededError}(P_A, P_B, \Delta\sigma_{AB}, \epsilon_{\text{angular}})$$

---

## 3. Boundary Transport Fluxes & Thermodynamic Invariants

Once topological closure is verified ($\Delta\sigma \le \epsilon_{\text{angular}}$), the shared edge length $L_{uv}$ and interface cross-sectional area $A_{uv}$ are uniquely determined:
$$L_{uv} = R_{\oplus} \cdot \Delta\sigma(P_{\text{start}}, P_{\text{end}}), \quad A_{uv} = L_{uv} \cdot h_{\text{layer}}$$
where $h_{\text{layer}}$ is the depth/height of the interacting environmental column layer (m).

### 3.1 Pairwise Conservation Invariants
For any conserved state variable $X \in \{\text{Mass}_{\text{water}}, \text{Mass}_{\text{carbon}}, \text{Mass}_{\text{minerals}}, \text{Mass}_{\text{oxygen}}, \text{Energy}\}$:
$$J_{u \to v}^X = -J_{v \to u}^X$$
$$\Delta X_u = -J_{u \to v}^X \cdot \Delta t, \quad \Delta X_v = +J_{u \to v}^X \cdot \Delta t$$
$$\sum_{k \in \{u, v\}} \Delta X_k = 0$$

### 3.2 Leakage Bounds Under Geometric Dislocation
If an unvalidated edge with angular gap $\delta\sigma_{\text{gap}}$ were admitted into the flux pipeline, the boundary leakage rate would scale as:
$$\dot{M}_{\text{leak}}^X = \rho_X \cdot \|\mathbf{v}_{\text{advect}}\| \cdot (R_{\oplus} \delta\sigma_{\text{gap}}) \cdot h_{\text{layer}}$$
$$\dot{E}_{\text{leak}} = \left(\rho c_p T\right) \cdot \|\mathbf{v}_{\text{advect}}\| \cdot (R_{\oplus} \delta\sigma_{\text{gap}}) \cdot h_{\text{layer}}$$
Enforcing $\delta\sigma_{\text{gap}} \le \epsilon_{\text{angular}} = 1.0 \times 10^{-9}\text{ rad}$ bounds numerical boundary leakage to:
$$\dot{M}_{\text{leak}} \le \mathcal{O}(10^{-9}) \cdot \dot{M}_{\text{boundary}}$$
guaranteeing machine-precision conservation across simulation ticks.

---

## 4. Concrete Mass and Energy Deltas per Process

### 4.1 Boundary Advective Fluid & Solute Transport
Let fluid velocity normal to interface $E_{uv}$ be $v_{\perp, uv} = \mathbf{v} \cdot \hat{\mathbf{n}}_{uv} \text{ [m/s]}$.
Volumetric discharge rate:
$$Q_{uv} = v_{\perp, uv} \cdot A_{uv} = v_{\perp, uv} \cdot (R_{\oplus} \Delta\sigma_{uv}) \cdot h_{\text{layer}} \quad [\text{m}^3/\text{s}]$$

Directional upwind state assignment:
$$\xi^* = \begin{cases} u & \text{if } Q_{uv} \ge 0 \\ v & \text{if } Q_{uv} < 0 \end{cases}$$

State deltas over time step $\Delta t$:
1. **Water Mass ($\text{H}_2\text{O}$)**:
   $$\Delta M_{\text{water}, u} = -Q_{uv} \cdot \rho_w \cdot \Delta t \quad [\text{kg}]$$
   $$\Delta M_{\text{water}, v} = +Q_{uv} \cdot \rho_w \cdot \Delta t \quad [\text{kg}]$$
2. **Dissolved Inorganic Carbon (DIC)**:
   $$\Delta M_{\text{carbon}, u} = -Q_{uv} \cdot C_{\text{DIC}, \xi^*} \cdot \Delta t \quad [\text{kg}]$$
   $$\Delta M_{\text{carbon}, v} = +Q_{uv} \cdot C_{\text{DIC}, \xi^*} \cdot \Delta t \quad [\text{kg}]$$
3. **Dissolved Oxygen ($\text{DO}$)**:
   $$\Delta M_{\text{oxygen}, u} = -Q_{uv} \cdot C_{\text{DO}, \xi^*} \cdot \Delta t \quad [\text{kg}]$$
   $$\Delta M_{\text{oxygen}, v} = +Q_{uv} \cdot C_{\text{DO}, \xi^*} \cdot \Delta t \quad [\text{kg}]$$
4. **Dissolved Minerals (Nitrogen/Phosphorus/Silica)**:
   $$\Delta M_{\text{minerals}, u} = -Q_{uv} \cdot C_{\text{minerals}, \xi^*} \cdot \Delta t \quad [\text{kg}]$$
   $$\Delta M_{\text{minerals}, v} = +Q_{uv} \cdot C_{\text{minerals}, \xi^*} \cdot \Delta t \quad [\text{kg}]$$
5. **Thermal Energy ($\Delta H$)**:
   $$\Delta H_u = -Q_{uv} \cdot \rho_w c_{p, w} T_{\xi^*} \cdot \Delta t \quad [\text{J}]$$
   $$\Delta H_v = +Q_{uv} \cdot \rho_w c_{p, w} T_{\xi^*} \cdot \Delta t \quad [\text{J}]$$

---

## 5. Monad Implementation Specifications

### 5.1 Coordinate Normalization & Great-Circle Distance
```typescript
/**
 * Normalizes spherical coordinates into standard bounds:
 * lat in [-pi/2, pi/2], lng in [-pi, pi].
 */
export function normalizeSphericalCoords(
  coords: [number, number],
  useDegrees: boolean = false
): [number, number] {
  let [lat, lng] = coords;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180;
    lng = (lng * Math.PI) / 180;
  }
  // Clamp latitude to poles
  const clampedLat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  // Wrap longitude to [-pi, pi]
  let wrappedLng = ((lng + Math.PI) % (2 * Math.PI));
  if (wrappedLng < 0) wrappedLng += 2 * Math.PI;
  wrappedLng -= Math.PI;

  return [clampedLat, wrappedLng];
}

/**
 * Computes numerically stable central angular distance between two points on S^2.
 */
export function computeSphericalAngularDistance(
  p1: [number, number],
  p2: [number, number],
  inDegrees: boolean = false
): number {
  const [lat1, lng1] = normalizeSphericalCoords(p1, inDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(p2, inDegrees);

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);

  const a =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;

  const clampedA = Math.max(0, Math.min(1, a));
  return 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0, 1 - clampedA)));
}
```

### 5.2 Domain Exception & Assertion Contract
```typescript
export class BoundaryEndpointToleranceExceededError extends Error {
  public readonly endpointA: [number, number];
  public readonly endpointB: [number, number];
  public readonly angularDistanceRad: number;
  public readonly toleranceRad: number;

  constructor(
    endpointA: [number, number],
    endpointB: [number, number],
    angularDistanceRad: number,
    toleranceRad: number,
    context?: string
  ) {
    super(
      `Boundary endpoint angular tolerance exceeded${context ? ` in ${context}` : ""}: ` +
      `angular distance ${angularDistanceRad.toExponential(4)} rad exceeds tolerance ${toleranceRad.toExponential(4)} rad ` +
      `between [${endpointA.join(", ")}] and [${endpointB.join(", ")}].`
    );
    this.name = "BoundaryEndpointToleranceExceededError";
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.angularDistanceRad = angularDistanceRad;
    this.toleranceRad = toleranceRad;
  }
}

export interface BoundaryToleranceOptions {
  useDegrees?: boolean;
  context?: string;
}

export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6; // ~6.37 meters on Earth

/**
 * Asserts that two spherical boundary endpoints coincide within maxAngularToleranceRad.
 * Halts execution with BoundaryEndpointToleranceExceededError if topology is breached.
 */
export function assertBoundaryEndpointTolerance(
  endpointA: [number, number],
  endpointB: [number, number],
  maxAngularToleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
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

### 5.3 Interface Validation in Adjacency Graph Assembly
When registering adjacent cell edge $E_{uv} = (V_{u, 1}, V_{u, 2})$ and reverse edge $E_{vu} = (V_{v, 1}, V_{v, 2})$:
```typescript
export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  useDegrees: boolean = false
): void {
  // Edge V must be the reverse orientation of Edge U
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, {
    useDegrees,
    context: "Edge alignment endpoint U[0] <-> V[1]",
  });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, {
    useDegrees,
    context: "Edge alignment endpoint U[1] <-> V[0]",
  });
}
```

---

## 6. Verification and Boundary Audit Table

| Scenario | Input Point A | Input Point B | Format | Expected $\Delta\sigma$ | Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Identical Coords** | `[0.123, 0.456]` | `[0.123, 0.456]` | Radians | $0.0 \text{ rad}$ | Pass |
| **Sub-tolerance Jitter** | `[0.0, 0.0]` | `[1.0e-7, 0.0]` | Radians | $1.0 \times 10^{-7} \text{ rad}$ | Pass ($\le 10^{-6}$) |
| **Over-tolerance Gap** | `[0.0, 0.0]` | `[2.0e-6, 0.0]` | Radians | $2.0 \times 10^{-6} \text{ rad}$ | Throws `BoundaryEndpointToleranceExceededError` |
| **Antimeridian Wrapping** | `[0.0, 3.141592]` | `[0.0, -3.141592]` | Radians | $\approx 1.3 \times 10^{-6} \text{ rad}$ | Throws / Passes depending on exact $\Delta\lambda$ |
| **Polar Singularity** | `[90.0, 0.0]` | `[90.0, 120.0]` | Degrees | $0.0 \text{ rad}$ (same north pole) | Pass |
| **Degree Coordinates** | `[45.000000, 10.0]` | `[45.000005, 10.0]`| Degrees | $\approx 8.7 \times 10^{-8} \text{ rad}$ | Pass with `useDegrees: true` |

This specification guarantees strict topological consistency across discrete spherical boundaries, preventing numerical mass/energy leakage before flux monads execute.