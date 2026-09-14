<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 008 Developer Onboarding & Community Contribution Guide

Welcome, Developer & Open-Source Contributor! 

This guide provides everything you need to get up to speed with **Sprint 008** of the **Web of Life** repository (`https://github.com/pascalranoroarijaona/WebOfLife`). In this sprint, we harden our spatial computation stack by implementing rigorous regex and character set validation for Uber H3 index strings within `src/spatial/h3_grid.ts` and integrating it directly into `SpatialMonad` (`src/monads/spatial_monad.ts`).

---

## 1. Quickstart & Environment Setup

Our tech stack is strictly **TypeScript and Node.js**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 008 test suite:**
   ```bash
   npx tsx tests/sprint_008.test.ts
   ```

---

## 2. Core Architectural Highlights of Sprint 008

- **The Thermodynamic Boundary Gate:** Spatial indices represent physical bounding boxes on the Gaia Earth Pod. Malformed strings risk leaking entropy (biomass or energy mapped to non-existent nodes). We prevent this using `isValidH3Index(index: string)` powered by our strict regex `/^[0-9a-fA-F]{15}$/`.
- **Monadic Safety:** `SpatialMonad.of(rawString)` evaluates untrusted inputs, safely encapsulating valid states or trapping corruption before adjacency matrices (`src/spatial/h3_adjacency.ts`) compute trophic flows.

---

## 3. Good First Issues & Extension Points

Want to contribute? Here are two distinct tracks for open-source contributors looking to build new monads or WebGL shaders.

### Track A: Building a New Custom Monad (Good First Issue)
If you want to implement a brand new domain monad (e.g., `EnergyMonad` or `CarbonFluxMonad`), follow the patterns established in `SpatialMonad`:
1. **Create your source file:** `src/monads/energy_monad.ts`.
2. **Enforce Thermodynamic Bounds:** Ensure your constructor or static `.of()` method checks physical laws (e.g., energy cannot be negative; total system energy must remain conserved).
3. **Write Unit Tests:** Create `tests/sprint_008_energy_monad.test.ts` testing both valid bounds and edge cases (NaN, negative inputs, overflow).
4. **Extension Point Example:**
   ```ts
   export class EnergyMonad {
     private constructor(private readonly joules: number | null, private readonly err: string | null) {}
     
     public static of(input: number): EnergyMonad {
       if (typeof input !== 'number' || input < 0 || Number.isNaN(input)) {
         return new EnergyMonad(null, "Thermodynamic violation: Negative or NaN energy.");
       }
       return new EnergyMonad(input, null);
     }
     
     public isRight(): boolean { return this.joules !== null; }
   }
   ```

### Track B: Building New WebGL Shaders for Spatial Visualization (Good First Issue)
If you are passionate about graphics and real-time simulation rendering:
1. **Locate the Shaders Directory:** `src/rendering/shaders/` (or create it if bootstrapping visual pipelines).
2. **Write a Fragment Shader:** Create a WebGL fragment shader that visualizes H3 spatial boundaries or thermodynamic heat dissipation across the Gaia Earth Pod.
3. **Integration Hook:** Expose a TypeScript wrapper in `src/rendering/spatial_renderer.ts` that compiles your GLSL shaders and links them to `SpatialMonad` coordinate states.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/sprint-008-your-extension`
2. Commit your changes with clear semantic messages.
3. Verify your tests pass: `npx tsx tests/sprint_008.test.ts`
4. Push and open a Pull Request against `https://github.com/pascalranoroarijaona/WebOfLife`.

Happy coding, and keep your entropy low!