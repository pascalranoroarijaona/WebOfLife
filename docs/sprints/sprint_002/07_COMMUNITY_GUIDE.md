<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 002 Contributor & Onboarding Guide: Spatial Topologies & H3 Adjacency

Welcome to the **Web of Life** developer community! Sprint 002 introduces robust geospatial discretization to our biosphere and Earth pod simulation engines using Uber's H3 hexagonal hierarchical spatial indexing framework. 

As an open-source contributor, your work directly powers how simulated biomes, biogeochemical flows, and trophic energy transformations interact across spherical surfaces. This guide walks you through setting up your environment, understanding our architectural patterns (TypeScript, Node.js, Monads), and identifying concrete pathways to make your first contribution.

---

## 1. Quickstart & Environment Setup

We maintain a strict TypeScript and Node.js toolchain. **Do not use Python commands (`pip`, `pytest`)**. Everything runs via Node and `tsx`.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run Sprint 002 Verification Tests:**
   Verify your environment by running the test harness directly via `npx tsx`:
   ```bash
   npx tsx tests/sprint_002.test.ts
   ```

---

## 2. Core Architecture Overview

Sprint 002 focuses on two primary components located in `src/spatial/h3_adjacency.ts` and `src/monads/spatial_monad.ts`:

- **`H3AdjacencyEngine`**: Parses and validates 15-character hexadecimal H3 strings (`/^[0-9a-f]{15}$/`), generates $k$-ring neighborhoods adhering to $N(k) = 3k^2 + 3k + 1$, and maps edge neighbors.
- **`SpatialMonad<T>`**: Encapsulates spatial control volumes ($\Omega_i$) to execute pure state transitions—such as Fickian mass/energy diffusion across hexagonal boundaries—while enforcing strict thermodynamic conservation laws (First Law: $\Delta M_{\text{system}} = 0$).

---

## 3. "Good First Issues" for External Contributors

If you are looking to pick up your first ticket in the repository, consider tackling one of these scoped tasks:

### Issue #201: Implement Pentagon Base-Cell Boundary Exception Handling
- **Description:** Standard H3 hexagonal cells always possess exactly 6 edge neighbors. However, 12 base cells in the H3 grid contain pentagonal distortions. Currently, `getEdgeNeighbors()` assumes 6 neighbors uniformly.
- **Task:** Update `src/spatial/h3_adjacency.ts` to detect pentagonal base cells and return the correct subset of 5 edge neighbors.
- **Files to touch:** `src/spatial/h3_adjacency.ts`, `tests/sprint_002.test.ts`
- **Starting point:** Look at `baseCell` extraction in `parseIndex`.

### Issue #202: Monadic Logging Middleware for Spatial Fluxes
- **Description:** To assist debugging simulation divergences, we need a logging wrapper for `SpatialMonad`.
- **Task:** Implement a `tap()` or `log()` method on `SpatialMonad<T>` that prints stock transitions without mutating the underlying state container.
- **Files to touch:** `src/monads/spatial_monad.ts`

---

## 4. Extension Points: Building New Monads & WebGL Shaders

For advanced contributors wanting to extend the Web of Life simulation engine:

### 4.1 Creating Custom Monads
To model non-linear ecological phenomena (e.g., stochastic disease outbreaks or dynamic carbon sequestration), you can build custom monads that interoperate with `SpatialMonad`:
```typescript
import { SpatialMonad } from '../monads/spatial_monad';
import { CellStockState } from '../spatial/h3_adjacency';

export class BiogeochemicalMonad {
    public static applyPhotosynthesis(monad: SpatialMonad<CellStockState>, solarRate: number): SpatialMonad<CellStockState> {
        return monad.map(state => ({
            ...state,
            carbonMass: state.carbonMass + (solarRate * 0.05)
        }));
    }
}
```

### 4.2 Integrating WebGL Shaders for H3 Rendering
As we scale to global resolutions ($r \geq 4$), rendering hundreds of thousands of hexagons on the client side requires WebGL acceleration. 
- **Extension Point:** Create vertex and fragment shaders in `src/renderer/shaders/` to ingest H3 boundary vertex buffers.
- **Pipeline:** Bind output arrays from `H3AdjacencyEngine.generateKRing()` directly to WebGL attribute pointers for real-time thermal gradient visualization.

---

## 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/sprint-002-enhancement`
2. Write unit tests for your changes.
3. Execute the test suite: `npx tsx tests/sprint_002.test.ts`
4. Push your branch and open a Pull Request against `main`.

Happy coding, and welcome aboard the Web of Life!