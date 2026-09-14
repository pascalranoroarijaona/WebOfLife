<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 023 Contributor Guide: Spatial Resolution Tiers & Monad Integrity

Welcome to the **Web of Life** developer community! In Sprint 023, we introduced rigorous spatial resolution tier ($0-15$) boundary checks within `src/spatial/h3_grid.ts` and integrated these constraints directly into the `SpatialMonad` state-transition lifecycle.

Whether you are looking to build custom monads or author WebGL shaders for real-time biosphere visualization, this guide will help you get up to speed quickly using our TypeScript and Node.js toolchain.

---

## 🚀 Quickstart for New Contributors

To set up your local development environment and verify your build, run the following commands in your terminal:

```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies
npm install

# 3. Run the Sprint 023 verification test suite
npx tsx tests/sprint_023.test.ts
```

*Note: Never use `pip install` or Python testing frameworks; the WebOfLife repository is strictly a TypeScript and Node.js codebase.*

---

## 🛡️ Core Feature Overview: H3 Spatial Bounds

Uber's H3 hierarchical hexagonal spatial index partitions our simulation geosphere across 16 discrete resolution tiers ($0$ through $15$). Sprint 023 guarantees that all spatial operations uphold these bounds to prevent index corruption and ensure adherence to thermodynamic conservation principles ($\Delta M = 0$, $\Delta E = 0$).

### Key Functions Added (`src/spatial/h3_grid.ts`)
- **`isValidH3Resolution(resolution: number): boolean`**: Pure validation helper.
- **`assertH3Resolution(resolution: number): void`**: Guard function throwing a descriptive `RangeError` if bounds are violated.

### Monad Integration (`src/monads/spatial_monad.ts`)
The `SpatialMonad` class invokes `assertH3Resolution` upon both instantiation and refinement:

```typescript
import { assertH3Resolution } from '../spatial/h3_grid';
import { H3Index, Resolution } from '../spatial/h3_types';

export class SpatialMonad {
  constructor(
    private readonly index: H3Index,
    private readonly resolution: Resolution,
    private stock: SpatialStock
  ) {
    assertH3Resolution(resolution);
  }

  public refine(targetResolution: Resolution): SpatialMonad {
    assertH3Resolution(targetResolution);
    return new SpatialMonad(this.index, targetResolution, { ...this.stock });
  }
}
```

---

## 💡 Good First Issues for External Contributors

If you are eager to contribute to the Web of Life, here are three curated "Good First Issues" aligned with our architecture:

1. **GFI-1: Implement Resolution Tier Boundary Unit Tests**
   - **Target:** `tests/sprint_023.test.ts`
   - **Task:** Write comprehensive test cases covering edge cases such as floating-point inputs ($7.5$), extreme negative numbers, and out-of-bounds indices ($16$).
2. **GFI-2: Add Thermodynamic Logging to Spatial Monad Refinement**
   - **Target:** `src/monads/spatial_monad.ts`
   - **Task:** Emit telemetry events during `refine()` verifying that mass ($\Delta M$) and energy ($\Delta E$) remain identically zero across tier transitions.
3. **GFI-3: Extend H3 Adjacency Guard Validation**
   - **Target:** `src/spatial/h3_adjacency.ts`
   - **Task:** Integrate `assertH3Resolution` into neighbor traversal ring generators to ensure adjacency lookups never query invalid spatial manifolds.

---

## 🎨 Extension Points: Building New Monads & WebGL Shaders

### 1. Building Custom Monads
To create a new domain-specific monad (e.g., `CarbonMonad` or `SolarMonad`), follow our functional-reactive monad pattern:
- Implement pure state transformation methods.
- Enforce invariant boundary checks during construction.
- Ensure immutable stock returns via `Readonly<T>` interfaces.

### 2. Authoring WebGL Shaders
For contributors interested in rendering spatial grids:
- Bind H3 resolution uniforms to your WebGL pipeline.
- Utilize the validated resolution tiers ($0-15$) to scale vertex displacement and fragment coloring according to hexagonal density.