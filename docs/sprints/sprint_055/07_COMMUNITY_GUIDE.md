# Contributor & DevRel Guide: Sprint 055 — Geodesic Angular Normalization (`normalizeAngleRadians`)

Welcome to the **Web of Life** open-source contributor ecosystem! Whether you are an aspiring open-source contributor, a mathematical simulation engineer, a WebGL graphics hacker, or a category theory enthusiast, this guide will walk you through the architectural updates delivered in Sprint 055 and show you how to build your first contribution on top of our discrete global grid system (DGGS).

---

## 1. Executive Overview: What Was Built in Sprint 055?

In Sprint 055, we resolved a fundamental topological challenge in planetary geodesic simulation: **angular branch-cut discontinuities** and cyclic divergence during horizontal advective transport across Uber H3 hexagonal cells.

Planar approximations and unbounded angles induce numerical errors when computing geodesic bearings, relative neighbor offsets, Coriolis deflections, and horizontal advection velocity vectors $\mathbf{u} = (u_\lambda, u_\phi)$ across hexagonal facets. 

Sprint 055 introduces:
- **`normalizeAngleRadians(radians: number): number`** in `src/spatial/h3_adjacency.ts`:
  A canonical projection mapping any arbitrary real angle $\theta \in \mathbb{R}$ bijectively onto the half-open fundamental domain $[-\pi, \pi)$ modulo $2\pi$.
- **Strict IEEE 754 Float Safety**: Resilient handling of branch points ($+\pi \mapsto -\pi$), negative inputs, boundary snap conditions, and non-finite numbers (`NaN`, `+Infinity`, `-Infinity`).
- **First & Second Law Thermodynamic Invariance**: Ensures directional vector decompositions and upwind volumetric flux limiters across shared hexagonal boundaries conserve mass and kinetic energy without introducing synthetic momentum or entropy.

---

## 2. Quickstart & Local Development Setup

The Web of Life simulation engine is built with **Node.js** and **TypeScript**. We use native TypeScript execution for ultra-fast iterative testing.

### 2.1 Repository Setup

Clone the official repository:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
```

### 2.2 Install Dependencies

Install project dependencies using `npm`:

```bash
npm install
```

> **Note for Contributors:** Do **not** use Python tooling (`pip` or `pytest`). The runtime environment is strictly TypeScript on Node.js.

### 2.3 Run the Sprint 055 Test Suite

Execute the dedicated Sprint 055 test suite using `npx tsx`:

```bash
npx tsx tests/sprint_055.test.ts
```

All 15 test cases (spanning zero identity, boundary wrapping, extreme multi-turn angles, and IEEE 754 non-finite propagation) should pass with sub-$10^{-14}$ floating-point precision.

---

## 3. Architecture Deep Dive

### 3.1 The Quotient Group $\mathbb{T} = \mathbb{R} / 2\pi\mathbb{Z}$

Angles on the sphere are isomorphic to the quotient circle group $\mathbb{R} / 2\pi\mathbb{Z}$. When tracking fluid velocity vectors $\mathbf{u}_i$ across cell boundaries $\Gamma_{ij}$, we must project raw angles into the canonical half-open domain $[-\pi, \pi)$:

$$\psi(\theta) = \theta - 2\pi \left\lfloor \frac{\theta + \pi}{2\pi} \right\rfloor$$

In `src/spatial/h3_adjacency.ts`, this is implemented as:

```typescript
const TWO_PI = 2 * Math.PI;

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) {
    return radians; // Propagate NaN and +/-Infinity
  }
  let angle = (radians + Math.PI) % TWO_PI;
  if (angle < 0) {
    angle += TWO_PI;
  }
  const normalized = angle - Math.PI;
  return normalized === Math.PI ? -Math.PI : normalized;
}
```

### 3.2 Upwind Geodesic Advection Across Hexagonal Edges

When advective transport occurs between hexagonal cell $H_i$ and neighbor $H_j$, the relative orientation determines the volume flux $\Phi_{V, ij}$:

```
     Hex Cell H_i              Hex Cell H_j
   +--------------+          +--------------+
   |              |  Gamma_ij|              |
   |   u_i (flow) |--------->|              |
   |      \       |  n_ij    |              |
   |       \theta |  (bearing)|             |
   +--------------+          +--------------+
```

1. **Normalized Normal Vector**: $\hat{\theta}_{ij} = \text{normalizeAngleRadians}(\theta_{ij})$
2. **Relative Incidence Angle**: $\Delta\theta_{ij} = \text{normalizeAngleRadians}(\phi_{\mathbf{u}, i} - \hat{\theta}_{ij})$
3. **Transmission Coefficient**: $\kappa_{ij} = \max(0, \cos(\Delta\theta_{ij}))$
4. **Conservation of Extensive Stocks**:
   $$\Delta \mathbf{S}_{i \to j} + \Delta \mathbf{S}_{j \to i} = \mathbf{0}$$

---

## 4. Good First Issues & Contributor Extension Points

Looking to make your mark on the Web of Life project? We have prepared several high-impact extension points suited for both monad-focused system engineers and graphics developers.

---

### Extension Point 1: Build an `AtmosphericVorticityMonad`
- **Area:** Categorical Monads & Atmospheric Dynamics
- **Location:** `src/monads/atmospheric_vorticity_monad.ts`
- **Difficulty:** Good First Issue (Intermediate)
- **Description:**  
  Hexagonal cells experience planetary and relative vorticity $\zeta = \mathbf{k} \cdot (\nabla \times \mathbf{u})$. Using `normalizeAngleRadians`, calculate the closed circulation integral around the 6 neighbors $\mathcal{N}(H_i)$ of an H3 cell:
  $$\Gamma_i = \oint_{\partial H_i} \mathbf{u} \cdot d\mathbf{l} \approx \sum_{k=1}^6 \|\mathbf{u}_k\| \cos\big(\text{normalizeAngleRadians}(\theta_{\mathbf{u}, k} - \theta_{\text{edge}, k})\big) L_k$$
- **Acceptance Criteria:**
  1. Wrap circulation state in a monadic wrapper `AtmosphericVorticityMonad`.
  2. Implement unit tests verifying zero vorticity in a constant uniform wind field.
  3. Ensure all angles are normalized using `normalizeAngleRadians`.

---

### Extension Point 2: WebGL2 Directional Vector Advection Shader
- **Area:** WebGL / GPU Rendering
- **Location:** `src/render/shaders/hex_advection_vector.frag.glsl`
- **Difficulty:** Intermediate
- **Description:**  
  Visualize the advective flow field across H3 centroids on an interactive 3D globe.
- **Tasks:**
  1. Implement GLSL ES 3.0 fragment shader logic mirroring `normalizeAngleRadians`:
     ```glsl
     float normalizeAngle(float rad) {
         float twoPi = 6.283185307179586;
         float a = mod(rad + 3.141592653589793, twoPi);
         if (a < 0.0) a += twoPi;
         float res = a - 3.141592653589793;
         return res == 3.141592653589793 ? -3.141592653589793 : res;
     }
     ```
  2. Render dynamic streamlines or arrow glyphs colored by advection velocity magnitude $\|\mathbf{u}\|$.
  3. Ensure no visual artifacting or flickering across the $\pm\pi$ antimeridian branch cut.

---

### Extension Point 3: Oceanic Ekman Pumping Monad
- **Area:** Physical Oceanography & Stock Transport
- **Location:** `src/monads/oceanic_ekman_monad.ts`
- **Difficulty:** Intermediate
- **Description:**  
  Wind stress on the ocean surface induces Ekman transport deflected by $45^\circ$ (via Coriolis) relative to normalized wind direction.
- **Tasks:**
  1. Compute surface shear stress vector $\boldsymbol{\tau} = \rho_{\text{air}} C_D \|\mathbf{u}_{\text{wind}}\| \mathbf{u}_{\text{wind}}$.
  2. Compute deflected transport angle:
     $$\theta_{\text{Ekman}} = \text{normalizeAngleRadians}\left(\theta_{\text{wind}} \pm \frac{\pi}{4}\right)$$
     (sign depends on Northern vs. Southern hemisphere latitude).
  3. Update nutrient vertical upwelling flux stocks ($M_{min}$) based on Ekman divergence.

---

### Extension Point 4: WebAssembly/SIMD Batch Angular Normalizer
- **Area:** Performance Optimization
- **Location:** `src/spatial/h3_simd_angles.ts`
- **Difficulty:** Advanced
- **Description:**  
  In massive simulations with $10^6+$ active cells, computing `normalizeAngleRadians` iteratively in JS can become CPU-bound.
- **Tasks:**
  1. Benchmark vectorized array processing of angle normalization using typed arrays (`Float64Array`).
  2. Provide a batch utility `normalizeAngleArray(angles: Float64Array): void` that performs in-place mutation.
  3. Add performance benchmarks comparing scalar vs. batch execution.

---

## 5. Contribution Workflow & PR Checklist

To ensure rapid review and integration of your Pull Requests, follow this workflow:

### Step 1: Create a Feature Branch
```bash
git checkout -b feature/issue-vorticity-monad
```

### Step 2: Implement and Follow Coding Standards
- **Zero Runtime Errors:** Code must compile with TypeScript strict mode enabled (`noImplicitAny`, `strictNullChecks`).
- **Pure Functions:** Favor pure mathematical functions and monadic wrappers over mutable global state.
- **IEEE 754 Compliance:** Always test edge cases (`0`, $\pi$, $-\pi$, multi-turn multiples, `NaN`, `Infinity`).

### Step 3: Run Sprint Tests & Linter
```bash
# Verify Sprint 055 regression tests
npx tsx tests/sprint_055.test.ts

# Run your new test suite (e.g., tests/sprint_055_vorticity.test.ts)
npx tsx tests/sprint_055_vorticity.test.ts
```

### Step 4: Submit a Pull Request
- Target branch: `main`
- Reference relevant issue numbers in the PR description (e.g., `Fixes #142`).
- Include test output and benchmark numbers if applicable.

---

## 6. Community Support & Office Hours

Need help getting your shader compiling or tuning your monadic stock equations?
- **GitHub Discussions:** [WebOfLife Discussions](https://github.com/pascalranoroarijaona/WebOfLife/discussions)
- **Issue Tracker:** [GitHub Issues](https://github.com/pascalranoroarijaona/WebOfLife/issues)
- **PR Reviews:** DevRel and Core Systems Architects review PRs weekly.

Welcome aboard! Let's simulate the living Earth together.