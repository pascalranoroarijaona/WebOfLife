<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 035 Developer Onboarding & Contributor Guide: Spatial Guard Clauses & Monadic Integrity

Welcome to the **Web of Life** open-source community! If you are joining us for Sprint 035, you are stepping into a core architectural hardening phase: enforcing strict spatial invariants across our H3 hexagonal grid and monadic stock pipelines.

This guide provides everything you need to get your development environment running, understand our TypeScript/Node.js stack, run the test suite, and identify "Good First Issues" for contributing new monads or WebGL shaders.

---

## 1. Environment Setup & Getting Started

The Web of Life simulation engine is built entirely in **TypeScript** and runs on **Node.js**. We do not use Python or other runtime environments for core simulation loops.

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes packaged with Node.js)

### Installation
Clone the repository and install dependencies using standard Node workflow:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We validate all sprint features using TypeScript execution via `tsx`. To run the specific test suite for Sprint 035, execute:

```bash
npx tsx tests/sprint_035.test.ts
```

To run the entire test suite across all implemented sprints:
```bash
npm test
```

---

## 2. Sprint 035 Feature Overview: Spatial Guard Clauses

In Sprint 035, we introduced explicit exception throwing for guard clause violations in `src/spatial/h3_grid.ts` and the `SpatialMonad`. 

### The Problem
Previously, passing `null` or `undefined` H3 index handles into spatial queries or monad initializers led to silent propagation of unquantized state, threatening mass/energy conservation principles (First Law of Thermodynamics).

### The Solution
We introduced `SpatialGuardClauseException`. Whenever an invalid spatial index is supplied, execution halts immediately with a clear domain exception:

```typescript
import { SpatialGuardClauseException, H3GridManager } from './src/spatial/h3_grid';

try {
  H3GridManager.validateIndexStatic(null);
} catch (error) {
  if (error instanceof SpatialGuardClauseException) {
    console.error("Caught spatial violation:", error.message);
  }
}
```

---

## 3. Contributor Pathways: "Good First Issues"

Are you looking to make your first contribution? We have outlined two primary tracks for external contributors: **Building Custom Monads** and **Creating WebGL Shaders**.

### Track A: Building a New Monad (Good First Issue)
Monads in the Web of Life encapsulate state transitions while preserving physical and thermodynamic invariants (Carbon, Water, Energy conservation).

#### Steps to create a new monad:
1. **Choose a Domain:** e.g., `NutrientMonad`, `MicroclimateMonad`, or `TrophicMonad`.
2. **Implement Guard Clauses:** Just like `SpatialMonad`, ensure input stocks and parameters are validated upon instantiation. Never allow uninitialized `null` or `undefined` states into core calculations.
3. **Follow the Functional Contract:** Implement `.of()`, `.map()`, and getter methods.
4. **Write Tests:** Add `tests/sprint_XX.test.ts` ensuring 100% test coverage for valid and invalid inputs, running it via:
   ```bash
   npx tsx tests/sprint_XX.test.ts
   ```

#### Template for a New Monad (`src/monads/nutrient_monad.ts`):
```typescript
import { SpatialGuardClauseException } from '../spatial/h3_grid';

export class NutrientMonad<T> {
  private constructor(
    private readonly nutrientStock: T,
    private readonly saturationLevel: number
  ) {}

  public static of<T>(stock: T, saturation: number | null | undefined): NutrientMonad<T> {
    if (saturation === null || saturation === undefined || saturation < 0) {
      throw new SpatialGuardClauseException('Nutrient saturation level must be a non-null positive number.');
    }
    return new NutrientMonad(stock, saturation);
  }

  public map<U>(f: (stock: T, saturation: number) => U): NutrientMonad<U> {
    return new NutrientMonad(f(this.nutrientStock, this.saturationLevel), this.saturationLevel);
  }

  public getStock(): T {
    return this.nutrientStock;
  }
}
```

---

### Track B: Building New WebGL Shaders (Good First Issue)
WebGL shaders render our H3 ecological grids, biomass density heatmaps, and solar energy fluxes in real-time.

#### Steps to create a WebGL shader extension:
1. **Locate the Shader Directory:** Check `src/render/shaders/` for existing vertex and fragment shader pairs.
2. **Write GLSL Shaders:** Implement your custom fragment shader (e.g., carbon sequestration glow, water runoff simulation).
3. **Bind Uniforms & Attributes:** Ensure your TypeScript renderer correctly passes spatial grid buffers and temporal state vectors to the GPU.
4. **Test Rendering Output:** Run the WebGL integration tests using:
   ```bash
   npx tsx tests/sprint_webgl.test.ts
   ```

#### Example Fragment Shader Snippet (`src/render/shaders/carbon_frag.glsl`):
```glsl
precision highp float;

uniform vec4 u_biomassColor;
uniform float u_entropyFactor;
varying vec2 v_uv;

void main() {
    // Calculate thermodynamic entropy decay across spatial coordinates
    float decay = sin(v_uv.x * 10.0 + u_entropyFactor) * 0.5 + 0.5;
    gl_FragColor = vec4(u_biomassColor.rgb * decay, u_biomassColor.a);
}
```

---

## 4. Submitting Your Contribution

1. Fork the repository on GitHub: `https://github.com/pascalranoroarijaona/WebOfLife`
2. Create a feature branch: `git checkout -b feature/my-new-monad`
3. Commit your changes with clear messages referencing thermodynamic or spatial invariants.
4. Run your tests:
   ```haskell
   npx tsx tests/sprint_N.test.ts
   ```
5. Open a Pull Request against `main`. 

Thank you for helping us simulate and preserve the Web of Life with mathematical rigor and computational stability!