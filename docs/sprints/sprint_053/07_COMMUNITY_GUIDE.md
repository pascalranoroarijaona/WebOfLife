<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 053 Contributor Guide: Geodesic Invariant Enforcement (`assertValidLatitudeDegrees`)

Welcome to Sprint 053 of the **Web of Life** planetary modeling engine! Whether you are a seasoned computational physicist, a functional programming enthusiast, or a graphics engineer passionate about Earth systems modeling, we are thrilled to have you in our open-source community.

The repository is hosted at:
👉 **[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)**

---

## 1. Quickstart & Developer Environment

Web of Life is built entirely with **TypeScript** and **Node.js**. We do not use Python, so please never run `pip install` or `pytest`.

### 1.1 Prerequisites
- **Node.js** (v18.x or v20.x LTS recommended)
- **npm** (v9.x or higher)

### 1.2 Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 1.3 Running Sprint Verification Tests
To execute and verify the test suite for Sprint 053, run:
```bash
npx tsx tests/sprint_053.test.ts
```

All boundary checks, invariant assertions, and monad state validation tests should pass cleanly.

---

## 2. Sprint 053 Feature Deep-Dive

### The Geodesic Invariant Problem
In planetary simulation, geographic space is modeled as a 2-sphere manifold $\mathcal{S}^2$ parameterized by latitude $\phi \in [-90^\circ, 90^\circ]$ and longitude $\lambda \in (-180^\circ, 180^\circ]$. While longitude is periodic ($\mathbb{R} / 360^\circ\mathbb{Z}$), latitude forms a closed non-periodic manifold segment with physical boundaries at the poles:
$$\partial M_{\text{lat}} = \{-90^\circ, +90^\circ\}$$

If latitude values escape this physical domain (e.g. from numerical drift, unclipped interpolation, or coordinate swapping), downstream geophysical models fail catastrophically:
1. **Solar Insolation Breakdown**: Top-of-Atmosphere (TOA) insolation equations evaluate $\cos \theta_z = \sin\phi\sin\delta + \cos\phi\cos\delta\cos h$. Values outside $[-90^\circ, 90^\circ]$ invert zenith angles, resulting in unphysical negative solar flux or spontaneous energy generation, directly violating the First Law of Thermodynamics.
2. **Atmospheric Dynamic Instability**: The Coriolis parameter $f(\phi) = 2\Omega\sin\phi$ inverts or diverges beyond the poles, causing artificial negative vorticity and violating the Second Law of Thermodynamics.
3. **Metric Tensor Singularities**: Great-circle distance calculations $\arccos(\dots)$ ingest arguments outside $[-1, 1]$, generating `NaN` values that propagate through diffusion tensors.

### The Solution: `assertValidLatitudeDegrees`
Located in `src/spatial/h3_adjacency.ts`, `assertValidLatitudeDegrees` enforces strict geodesic boundaries across all adjacency and coordinate ingestion paths:

```typescript
export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(
      `Latitude out of physical geodesic range [-90, 90] degrees: received ${latDeg}`
    );
  }
}
```

This function halts corrupted state transitions *before* any mutable or monadic state update commits.

---

## 3. Good First Issues for New Contributors

Looking to make your first pull request? Here are curated issues ready for external contributors:

### Issue #1: Implement `assertValidLongitudeDegrees` and Normalization Utility
- **Subsystem**: `src/spatial/h3_adjacency.ts` / `src/spatial/h3_types.ts`
- **Difficulty**: Beginner (`good first issue`)
- **Description**: While latitude is bounded to $[-90, 90]$, longitude $\lambda$ is periodic over $(-180, 180]$ degrees. Implement `normalizeLongitudeDegrees(lonDeg: number): number` to wrap longitudes into $(-180, 180]$ and `assertValidLongitudeDegrees(lonDeg: number): void` for APIs requiring pre-normalized coordinates.
- **Verification**: Add test cases in `tests/sprint_053.test.ts` covering $\lambda = \pm 180^\circ, \pm 180.0001^\circ, 360^\circ, -540^\circ, \text{NaN}, \pm\infty$.

### Issue #2: Integrate Boundary Validation into Centroid Ingestion in `h3_grid.ts`
- **Subsystem**: `src/spatial/h3_grid.ts`
- **Difficulty**: Beginner (`good first issue`)
- **Description**: Ensure that when H3 cells are converted to centroid coordinates `cellToLatLng`, `assertValidLatitudeDegrees` is asserted on the extracted latitude prior to indexing spatial thermodynamic properties.
- **Verification**: Run `npx tsx tests/sprint_053.test.ts`.

---

## 4. Advanced Contributor Extension Points

For experienced contributors looking to build new simulation monads or WebGL visualization shaders:

### Extension Point A: Atmospheric Zonal Advection Monad
- **File Target**: `src/monads/advection_monad.ts`
- **Description**: Build a pure functional monad that steps atmospheric horizontal momentum using geostrophic wind approximations:
  $$u_g = -\frac{1}{\rho f}\frac{\partial P}{\partial y}, \quad v_g = \frac{1}{\rho f}\frac{\partial P}{\partial x}$$
  where $f = 2\Omega \sin(\phi)$.
- **Requirement**: Use `assertValidLatitudeDegrees` inside the monad's `bind` step to ensure non-singular Coriolis computations, avoiding pole singularities where $\cos\phi \to 0$.

### Extension Point B: WebGL Planetary Day/Night & Insolation Terminator Shader
- **File Target**: `src/client/shaders/insolation_terminator.frag`
- **Description**: Write a WebGL fragment shader visualizing real-time top-of-atmosphere solar irradiance on the 3D globe.
- **GLSL Uniforms**:
  - `uniform float u_solarDeclination;` (radians)
  - `uniform float u_hourAngle;` (radians)
  - `uniform float u_solarConstant;` ($1361.0 \text{ W/m}^2$)
- **Fragment Logic**:
  ```glsl
  varying vec2 v_latLonDegrees;

  void main() {
    float latRad = radians(clamp(v_latLonDegrees.x, -90.0, 90.0));
    float cosZenith = sin(latRad) * sin(u_solarDeclination) +
                      cos(latRad) * cos(u_solarDeclination) * cos(u_hourAngle);
    float insolation = u_solarConstant * max(0.0, cosZenith);
    vec3 dayColor = vec3(0.9, 0.85, 0.7) * (insolation / u_solarConstant);
    vec3 nightColor = vec3(0.02, 0.03, 0.08);
    gl_FragColor = vec4(mix(nightColor, dayColor, clamp(cosZenith * 5.0, 0.0, 1.0)), 1.0);
  }
  ```

---

## 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Ensure strict TypeScript compilation: `npx tsc --noEmit`
3. Run all sprint test suites:
   ```bash
   npx tsx tests/sprint_053.test.ts
   ```
4. Commit with descriptive semantic messages: `git commit -m "feat(spatial): add longitude normalization helper"`
5. Open a Pull Request at [https://github.com/pascalranoroarijaona/WebOfLife/pulls](https://github.com/pascalranoroarijaona/WebOfLife/pulls).

Thank you for contributing to open Earth-system scientific modeling!