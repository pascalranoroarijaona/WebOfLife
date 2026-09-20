# Sprint 092: Process Mining & Research Specification
## Boundary Enforcement for Aperture-7 Spatial Transport (`assertValidApertureResolution`)

---

## 1. Physical & Mathematical Foundations

### 1.1 Aperture-7 Discrete Global Grid System (DGGS) Geometry
In the Web of Life planetary simulation engine, the discrete spatial domain is partitioned using the aperture-7 hexagonal tessellation defined on a truncated icosahedron projected onto the WGS84 ellipsoid.

The hierarchy of resolution levels $r \in \mathcal{R} = \{0, 1, \dots, 15\} \subset \mathbb{Z}_{\ge 0}$ defines the spatial scale of all state stocks:
- **Base Resolution ($r = 0$)**: 122 base cells (110 hexagons, 12 pentagons), each of mean area:
  $$A_0 \approx 4.357449416 \times 10^6 \text{ km}^2 = 4.357449416 \times 10^{12} \text{ m}^2$$
- **Recursive Area Scaling**: At resolution $r$, cell surface area $A(r)$ scales monotonically by the aperture factor $\lambda = \frac{1}{7}$:
  $$A(r) = A_0 \cdot 7^{-r}$$
- **Characteristic Hexagonal Spacing & Edge Length**:
  For an idealized regular planar hexagon inscribed on the local tangent plane:
  $$A(r) = \frac{3\sqrt{3}}{2} L(r)^2 \implies L(r) = \sqrt{\frac{2 A(r)}{3\sqrt{3}}} = \sqrt{\frac{2 A_0}{3\sqrt{3}}} \cdot 7^{-r/2}$$
  The inter-cell centroid-to-centroid distance $d(r)$ between adjacent face-sharing cells is:
  $$d(r) = \sqrt{3} L(r) = \sqrt{\frac{2 A_0}{\sqrt{3}}} \cdot 7^{-r/2}$$
  The shared boundary interface length $l_{ij}(r)$ between two adjacent hexagons is:
  $$l_{ij}(r) = L(r) = \sqrt{\frac{2 A_0}{3\sqrt{3}}} \cdot 7^{-r/2}$$

### 1.2 Resolution Limits & Truncation Boundary
- **Lower Bound ($r = 0$)**: Planetary scale macro-cells.
- **Upper Bound ($r = 15$)**: 
  $$A(15) = \frac{4.357449416 \times 10^{12} \text{ m}^2}{7^{15}} \approx 0.8953 \text{ m}^2$$
  $$L(15) \approx \sqrt{\frac{2 \times 0.8953}{3\sqrt{3}}} \approx 0.587 \text{ m}$$
  Resolutions $r > 15$ exceed the 64-bit unsigned integer encoding capacity of the H3 index format (60 bits allocated for hierarchical index paths: 15 resolution levels $\times$ 3 bits per aperture-7 branch).

---

## 2. Multiscale Conservative Transport Dynamics

### 2.1 State Vector Definition
Each spatial cell $i$ at resolution $r$ holds a localized extensive state vector $\mathbf{S}_i \in \mathbb{R}^5_{\ge 0}$:
$$\mathbf{S}_i = \begin{bmatrix} M_{\text{C}, i} \\ M_{\text{H}_2\text{O}, i} \\ M_{\text{O}_2, i} \\ M_{\text{min}, i} \\ U_i \end{bmatrix} \quad \begin{aligned}
&\text{(Carbon mass, kg)} \\
&\text{(Water mass, kg)} \\
&\text{(Dissolved/atmospheric oxygen, kg)} \\
&\text{(Mineral nutrient mass: N, P, K, kg)} \\
&\text{(Internal thermal energy, J)}
\end{aligned}$$

The intensive quantities are derived via cell area $A(r)$ and active boundary height $h_{\text{eff}}$ (defining cell volume $V_i(r) = A(r) \cdot h_{\text{eff}}$):
- **Concentrations**: $C_{\alpha, i} = \frac{M_{\alpha, i}}{V_i(r)}$ for species $\alpha \in \{\text{C}, \text{H}_2\text{O}, \text{O}_2, \text{min}\}$.
- **Temperature**: $T_i = \frac{U_i}{\sum_\alpha M_{\alpha, i} c_{p, \alpha}}$, where $c_{p, \alpha}$ is specific heat capacity ($\text{J}\cdot\text{kg}^{-1}\cdot\text{K}^{-1}$).

### 2.2 Discrete Adjacency & Laplacian Metric
Let $\mathcal{N}_r(i)$ be the set of immediate topological neighbors of cell $i$ at aperture resolution $r$ ($|\mathcal{N}_r(i)| = 6$ for hexagons, $5$ for the 12 pentagonal singularities).

The inter-cell conductance $\kappa_{ij}(r)$ for diffusive flux across the shared boundary interface $l_{ij}(r)$ over distance $d(r)$ is:
$$\kappa_{ij}(r) = \mathcal{D}_\alpha \frac{l_{ij}(r) \cdot h_{\text{eff}}}{d(r)} = \mathcal{D}_\alpha \frac{L(r) \cdot h_{\text{eff}}}{\sqrt{3} L(r)} = \frac{\mathcal{D}_\alpha h_{\text{eff}}}{\sqrt{3}}$$
where $\mathcal{D}_\alpha$ is the physical diffusivity ($\text{m}^2/\text{s}$) or thermal conductivity ($\text{W}\cdot\text{m}^{-1}\cdot\text{K}^{-1}$).

Note that the spatial conductance metric $\kappa_{ij}(r)$ is invariant to $r$ only when isotropic planar dimensions cancel out; however, total flux per timestep $\Delta t$ scales with the gradient $\nabla \mathbf{S} \approx \frac{\mathbf{S}_j - \mathbf{S}_i}{d(r)}$:
$$J_{\alpha, ij}(r) = -\mathcal{D}_\alpha \frac{l_{ij}(r) h_{\text{eff}}}{d(r)} (C_{\alpha, j} - C_{\alpha, i}) = -\frac{\mathcal{D}_\alpha h_{\text{eff}}}{\sqrt{3}} \left( \frac{M_{\alpha, j}}{V_j(r)} - \frac{M_{\alpha, i}}{V_i(r)} \right)$$

---

## 3. Failure Modes from Corrupted Resolution Ingestion

If an unvalidated resolution candidate $r^* \notin \mathcal{R}$ enters the spatial flux kernel:

1. **Fractional Resolution Drift ($r^* \in \mathbb{R} \setminus \mathbb{Z}$)**:
   - In H3 bitwise address calculation, fractional components are truncated or cause bit-shifting corruption:
     $$\text{res\_bits} = (r^* \& 0x0F)$$
   - Topological neighbor lookups fail to find coincident faces, causing non-reciprocal adjacency pairs:
     $$j \in \mathcal{N}_{r^*}(i) \centernot\implies i \in \mathcal{N}_{r^*}(j)$$
   - Asymmetric flux evaluation:
     $$\sum_{i} \sum_{j \in \mathcal{N}_{r^*}(i)} J_{ij} \ne 0 \implies \frac{d M_{\text{total}}}{dt} \ne 0 \quad \text{(Violation of First Law)}$$

2. **Negative Resolution ($r^* < 0$)**:
   - Negative bitwise shift operands in JavaScript trigger undefined behavior or 32-bit wrap-around ($r^* = -1 \implies 0xFFFFFFFF$).
   - Cell volume calculation extrapolates to infinite or inverted area:
     $$A(-1) = A_0 \cdot 7^1 = 3.05 \times 10^{13} \text{ m}^2 > A_{\text{Earth}}$$

3. **Super-Maximal Resolution ($r^* > 15$)**:
   - Bitwise mask overflow overwrites parent index bits and directional sequence bits, causing cyclic self-adjacency loops ($i \in \mathcal{N}(i)$).
   - Inverted temperature gradients generate negative entropy:
     $$\dot{\sigma} = \sum_{\langle i, j \rangle} J_{U, ij} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) < 0 \quad \text{(Violation of Second Law)}$$

---

## 4. Executable Monad Method Specification

### 4.1 Boundary Guard Function: `assertValidApertureResolution`

```typescript
export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export class InvalidApertureResolutionError extends RangeError {
  public readonly resolution: unknown;

  constructor(resolution: unknown, reason: string) {
    super(
      `[H3Adjacency] Invalid aperture resolution (${String(resolution)}): ${reason}. ` +
      `Must be an integer between 0 and 15 inclusive.`
    );
    this.name = 'InvalidApertureResolutionError';
    this.resolution = resolution;
    Object.setPrototypeOf(this, InvalidApertureResolutionError.prototype);
  }
}

/**
 * Enforces non-negative integer resolution in [0, 15] for H3 aperture-7 spatial calculations.
 * 
 * @param resolution Numeric candidate representing H3 grid resolution
 * @throws {InvalidApertureResolutionError} If input violates type, finite, integer, or range boundaries
 */
export function assertValidApertureResolution(resolution: number): asserts resolution is H3Resolution {
  if (typeof resolution !== 'number' || !Number.isFinite(resolution)) {
    throw new InvalidApertureResolutionError(resolution, 'Value must be a finite number');
  }
  if (!Number.isInteger(resolution)) {
    throw new InvalidApertureResolutionError(resolution, 'Value must be an integer');
  }
  if (resolution < 0) {
    throw new InvalidApertureResolutionError(resolution, 'Resolution cannot be negative (min: 0)');
  }
  if (resolution > 15) {
    throw new InvalidApertureResolutionError(resolution, 'Resolution exceeds maximum H3 aperture (max: 15)');
  }
}
```

### 4.2 Spatial Hex Monad State & Conservative Transfer

```typescript
export interface CellStocks {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  mineralsKg: number;
  thermalEnergyJoules: number;
}

export interface FluxDeltas {
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaOxygenKg: number;
  deltaMineralsKg: number;
  deltaThermalEnergyJoules: number;
  entropyProductionJoulesPerKelvin: number;
}

export interface AdjacencyEdge {
  fromCell: string;
  toCell: string;
  sharedLengthMeters: number;
  centroidDistanceMeters: number;
}
```

### 4.3 Monadic Stock Transition Equations

For each directed adjacency edge $e = (i, j)$ with valid resolution $r \in [0, 15]$:

1. **Volumetric & Geometric Scaling**:
   $$A(r) = A_0 \cdot 7^{-r}$$
   $$L(r) = \sqrt{\frac{2 A(r)}{3\sqrt{3}}}, \quad d(r) = \sqrt{3} L(r), \quad V(r) = A(r) \cdot h_{\text{eff}}$$

2. **Hydrological Mass Transfer**:
   $$\Delta M_{\text{H}_2\text{O}, ij} = \Delta t \cdot \mathcal{K}_{\text{hyd}} \cdot \frac{L(r) h_{\text{eff}}}{d(r)} \cdot \left( \frac{M_{\text{H}_2\text{O}, i}}{A(r)} - \frac{M_{\text{H}_2\text{O}, j}}{A(r)} \right)$$
   $$\Delta M_{\text{H}_2\text{O}, i} \leftarrow \Delta M_{\text{H}_2\text{O}, i} - \Delta M_{\text{H}_2\text{O}, ij}$$
   $$\Delta M_{\text{H}_2\text{O}, j} \leftarrow \Delta M_{\text{H}_2\text{O}, j} + \Delta M_{\text{H}_2\text{O}, ij}$$

3. **Thermal Energy Transfer & Entropy Verification**:
   $$T_i = \frac{U_i}{C_{v, i}}, \quad T_j = \frac{U_j}{C_{v, j}}$$
   $$q_{ij} = \Delta t \cdot \kappa_{\text{th}} \cdot \frac{L(r) h_{\text{eff}}}{d(r)} \cdot (T_i - T_j)$$
   $$\Delta U_i \leftarrow \Delta U_i - q_{ij}, \quad \Delta U_j \leftarrow \Delta U_j + q_{ij}$$
   $$\Delta S_{ij} = q_{ij} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) = q_{ij} \frac{T_i - T_j}{T_i T_j} \ge 0$$
   Because $q_{ij} \propto (T_i - T_j)$, the entropy generation $\Delta S_{ij} \ge 0$ is strictly guaranteed if and only if geometric conductances are non-negative and symmetric, which is enforced by $r \in [0, 15]$.

4. **Biogeochemical Solute Transfers (Carbon, Oxygen, Minerals)**:
   For species $\alpha \in \{\text{C}, \text{O}_2, \text{min}\}$:
   $$\Delta M_{\alpha, ij} = \Delta t \cdot \mathcal{D}_\alpha \cdot \frac{L(r) h_{\text{eff}}}{d(r)} \cdot \left( \frac{M_{\alpha, i}}{V(r)} - \frac{M_{\alpha, j}}{V(r)} \right)$$
   $$\sum_{k \in \text{cells}} \Delta M_{\alpha, k} \equiv 0$$

---

## 5. Formal Verification Vectors

The test harness evaluates compliance against the following physical invariant table:

| Vector ID | Target Resolution $r$ | Guard Expectation | Mass Delta ($\sum \Delta M$) | Entropy Delta ($\Delta S$) | Invariant State |
|:---|:---|:---|:---|:---|:---|
| **V-01** | `0` | Pass (Valid) | $0.0 \text{ kg}$ | $\ge 0.0 \text{ J/K}$ | Valid (Global macro-scale) |
| **V-02** | `7` | Pass (Valid) | $0.0 \text{ kg}$ | $\ge 0.0 \text{ J/K}$ | Valid (Regional biome scale) |
| **V-03** | `15` | Pass (Valid) | $0.0 \text{ kg}$ | $\ge 0.0 \text{ J/K}$ | Valid (Plot / micro-scale) |
| **V-04** | `-1` | Throws `InvalidApertureResolutionError` | Intercepted | Intercepted | Prevented unphysical expansion |
| **V-05** | `16` | Throws `InvalidApertureResolutionError` | Intercepted | Intercepted | Prevented 64-bit coordinate overflow |
| **V-06** | `4.2` | Throws `InvalidApertureResolutionError` | Intercepted | Intercepted | Prevented fractal geometry leak |
| **V-07** | `NaN` | Throws `InvalidApertureResolutionError` | Intercepted | Intercepted | Prevented numerical corrupt state |
| **V-08** | `Infinity` | Throws `InvalidApertureResolutionError` | Intercepted | Intercepted | Prevented asymptotic singularity |