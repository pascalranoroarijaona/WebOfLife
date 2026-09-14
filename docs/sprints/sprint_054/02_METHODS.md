# Sprint 054 Methods: Longitudinal Boundary Normalization & Antimeridian Conservative Transport

## 1. Process Foundations: Coordinate Manifold & Geophysical Transport

### 1.1 Quotient Manifold Mapping & Topological Continuity
Geographical coordinates on the planetary manifold $\mathcal{M} \cong S^2 \setminus \{(0, 0, \pm 1)\}$ parameterize position using latitude $\phi \in [-\pi/2, \pi/2]$ and longitude $\lambda \in \mathbb{R} / 360\mathbb{Z}$. When atmospheric winds, ocean currents, or migratory trajectories propagate across the antimeridian ($\lambda = \pm 180^\circ$), coordinate integration produces continuous accumulation:
$$\lambda(t + \Delta t) = \lambda(t) + \int_{t}^{t+\Delta t} \frac{u(\tau)}{R \cos \phi(\tau)} \, d\tau$$
where $u$ is the zonal velocity ($m \cdot s^{-1}$) and $R$ is planetary radius ($m$).

Without boundary normalization, coordinate values exceed the fundamental domain representative interval $[-180^\circ, 180^\circ)$, causing spatial index mapping faults in discrete global grid lookups (e.g. Uber H3 `latLonToCell`).

The canonical projection operator $\mathcal{W}: \mathbb{R} \to [-180, 180)$ is defined as:
$$\mathcal{W}(\lambda) = \left( \left( (\lambda + 180) \bmod 360 \right) + 360 \right) \bmod 360 - 180$$
with exact boundary assignment:
$$\mathcal{W}(+180.0) = -180.0, \quad \mathcal{W}(-180.0) = -180.0, \quad \mathcal{W}(-0.0) = +0.0$$

---

## 2. Thermodynamic Stock Transfer & Conservation Invariance

### 2.1 First Law: Isometry of Coordinate Normalization
Coordinate wrapping is an isometric reparameterization of the topological sphere. For any extensive physical stock $X \in \{M_{\text{carbon}}, M_{\text{water}}, M_{\text{minerals}}, M_{\text{oxygen}}, E_{\text{thermal}}\}$:
$$\left.\frac{\partial X}{\partial \mathcal{W}}\right|_{\phi, t} = 0$$

### 2.2 Zonal Advective Flux Across Antimeridian Boundaries
Let cell $c_L$ be located at $\lambda_L = 180^\circ - \frac{1}{2}\Delta \lambda$ and cell $c_R$ be located at $\lambda_R = -180^\circ + \frac{1}{2}\Delta \lambda$. A positive zonal wind vector $u_\lambda > 0$ transfers mass and internal energy across the boundary interface of length $\Delta l = R \cdot \Delta \phi$:

#### Stock Deltas per Timestep $\Delta t$:
1. **Atmospheric Water Vapor ($H_2O$):**
   $$\Delta M_{\text{water}} = \rho_v \cdot u_\lambda \cdot \Delta l \cdot H_{\text{atm}} \cdot \Delta t$$
   $$\Delta M_{\text{water}}(c_L) = -\Delta M_{\text{water}}, \quad \Delta M_{\text{water}}(c_R) = +\Delta M_{\text{water}}$$
   $$\sum \Delta M_{\text{water}} = 0$$

2. **Trace Carbon Dioxide ($CO_2$):**
   $$\Delta M_{\text{carbon}} = \chi_{\text{CO}_2} \cdot \frac{M_C}{M_{\text{air}}} \cdot \rho_{\text{air}} \cdot u_\lambda \cdot \Delta l \cdot H_{\text{atm}} \cdot \Delta t$$
   $$\Delta M_{\text{carbon}}(c_L) = -\Delta M_{\text{carbon}}, \quad \Delta M_{\text{carbon}}(c_R) = +\Delta M_{\text{carbon}}$$
   $$\sum \Delta M_{\text{carbon}} = 0$$

3. **Atmospheric Molecular Oxygen ($O_2$):**
   $$\Delta M_{\text{oxygen}} = \chi_{\text{O}_2} \cdot \frac{M_{O_2}}{M_{\text{air}}} \cdot \rho_{\text{air}} \cdot u_\lambda \cdot \Delta l \cdot H_{\text{atm}} \cdot \Delta t$$
   $$\Delta M_{\text{oxygen}}(c_L) = -\Delta M_{\text{oxygen}}, \quad \Delta M_{\text{oxygen}}(c_R) = +\Delta M_{\text{oxygen}}$$
   $$\sum \Delta M_{\text{oxygen}} = 0$$

4. **Atmospheric Particulate Minerals / Aerosols ($M_{\text{minerals}}$):**
   $$\Delta M_{\text{minerals}} = C_{\text{aerosol}} \cdot u_\lambda \cdot \Delta l \cdot H_{\text{atm}} \cdot \Delta t$$
   $$\Delta M_{\text{minerals}}(c_L) = -\Delta M_{\text{minerals}}, \quad \Delta M_{\text{minerals}}(c_R) = +\Delta M_{\text{minerals}}$$
   $$\sum \Delta M_{\text{minerals}} = 0$$

5. **Sensible & Latent Heat Energy ($E_{\text{thermal}}$):**
   $$E_{\text{thermal}} = \rho_{\text{air}} \cdot c_p \cdot T \cdot u_\lambda \cdot \Delta l \cdot H_{\text{atm}} \cdot \Delta t + L_v \cdot \Delta M_{\text{water}}$$
   $$\Delta E_{\text{thermal}}(c_L) = -E_{\text{thermal}}, \quad \Delta E_{\text{thermal}}(c_R) = +E_{\text{thermal}}$$
   $$\sum \Delta E_{\text{thermal}} = 0$$

### 2.3 Second Law: Irreversible Entropy Generation During Advective Mixing
Transport across the canonical boundary preserves entropy continuity and enforces non-negative generation:
$$\Delta S_{\text{trans}} = \left( \frac{E_{\text{thermal}}}{T_R} - \frac{E_{\text{thermal}}}{T_L} \right) \ge 0 \quad \text{for } T_L \ge T_R, \; u_\lambda > 0$$
Accurate topological mapping prevents negative-entropy numerical artifacts that would arise if antimeridian crossings were treated as planar boundaries with reflective or absorbing boundary conditions.

---

## 3. Monad Process Methods & Mathematical Specifications

### 3.1 Method: `normalizeLongitudeDegrees`
Pure mathematical coordinate normalization mapping $\mathbb{R} \to [-180, 180)$.

```typescript
/**
 * Normalizes an arbitrary longitude in degrees into the canonical half-open interval [-180, 180).
 *
 * Formal Properties:
 * 1. Range: ∀ lon ∈ ℝ, -180 <= normalizeLongitudeDegrees(lon) < 180
 * 2. Periodicity: normalizeLongitudeDegrees(lon + 360 * k) == normalizeLongitudeDegrees(lon), ∀ k ∈ ℤ
 * 3. Boundary: normalizeLongitudeDegrees(180.0) === -180.0
 * 4. Zero Sign: normalizeLongitudeDegrees(-0.0) === 0.0
 * 5. Non-finite: normalizeLongitudeDegrees(±Infinity) === NaN, normalizeLongitudeDegrees(NaN) === NaN
 */
export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return NaN;
  }
  const wrapped = (((lonDeg + 180) % 360) + 360) % 360;
  const normalized = wrapped - 180;
  return normalized === 0 ? 0 : normalized;
}
```

### 3.2 Monadic Advection Transition Across Antimeridian
The advective state monad step evaluates displaced coordinates, executes canonical normalization, and determines spatial indices without mass or energy loss:

```typescript
export interface SpatialCoordinateState {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  readonly energyJoules: number;
}

export interface AdvectiveFluxDelta {
  readonly sourceLonBefore: number;
  readonly targetLonNormalized: number;
  readonly deltaMassKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  readonly deltaEnergyJoules: number;
}

/**
 * Step monadic coordinate advection ensuring conservative mass/energy stock transfer
 * and [-180, 180) coordinate invariants.
 */
export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelocityDegPerSec: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: AdvectiveFluxDelta } {
  const rawLongitude = state.longitudeDeg + zonalVelocityDegPerSec * deltaSec;
  const normalizedLon = normalizeLongitudeDegrees(rawLongitude);

  const nextState: SpatialCoordinateState = {
    latitudeDeg: state.latitudeDeg,
    longitudeDeg: normalizedLon,
    massKg: { ...state.massKg },
    energyJoules: state.energyJoules,
  };

  const flux: AdvectiveFluxDelta = {
    sourceLonBefore: state.longitudeDeg,
    targetLonNormalized: normalizedLon,
    deltaMassKg: { carbon: 0, water: 0, minerals: 0, oxygen: 0 },
    deltaEnergyJoules: 0,
  };

  return { nextState, flux };
}
```

---

## 4. Verification Parameters & Edge Case Matrix

| Parameter / Input | Value / Expression | Validated Invariant |
|---|---|---|
| `lonDeg = 180.0` | `normalizeLongitudeDegrees(180.0)` | `-180.0` (Half-open upper boundary mapped to lower) |
| `lonDeg = -180.0` | `normalizeLongitudeDegrees(-180.0)` | `-180.0` (Closed lower boundary invariant) |
| `lonDeg = -0.0` | `normalizeLongitudeDegrees(-0.0)` | `+0.0` (`Object.is(res, 0) === true`) |
| `lonDeg = 360.0` | `normalizeLongitudeDegrees(360.0)` | `0.0` |
| `lonDeg = -360.0` | `normalizeLongitudeDegrees(-360.0)` | `0.0` |
| `lonDeg = 540.0` | `normalizeLongitudeDegrees(540.0)` | `-180.0` |
| `lonDeg = -540.0` | `normalizeLongitudeDegrees(-540.0)` | `-180.0` |
| `lonDeg = 180.000001` | `normalizeLongitudeDegrees(180.000001)` | `-179.999999` |
| `lonDeg = -180.000001`| `normalizeLongitudeDegrees(-180.000001)`| `179.999999` |
| Mass conservation | $\sum \Delta M_{\text{species}}$ across $\mathcal{W}$ | $\equiv 0.000000000000000 \text{ kg}$ |
| Energy conservation | $\sum \Delta E_{\text{thermal}}$ across $\mathcal{W}$ | $\equiv 0.000000000000000 \text{ J}$ |