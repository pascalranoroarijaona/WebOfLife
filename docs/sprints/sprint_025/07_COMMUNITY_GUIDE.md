<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 025: Developer Onboarding & Community Contribution Guide

Welcome to the **Web of Life** repository! This guide provides everything you need to get up to speed with **Sprint 025**, which introduces the formal resolution tier boundary check function (`0` to `15`) for Uber's H3 hierarchical hexagonal spatial index within `src/spatial/h3_grid.ts`.

---

## 🚀 Getting Started

Ensure you are working in the correct environment. Our tech stack is **TypeScript** and **Node.js**. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 025 Test Suite:**
   ```bash
   npx tsx tests/sprint_025.test.ts
   ```

---

## 🛠️ Core Architectural Concepts (Sprint 025)

In Sprint 025, we enforce strict geometric and thermodynamic boundaries across spatial partitioning tiers:
- **H3 Resolution Range:** Explicitly restricted to integers $r \in [0, 15]$.
- **Validation Utilities:** 
  - `isValidH3Resolution(resolution)`: Type guard checking integer bounds.
  - `assertValidH3Resolution(resolution)`: Throws a `RangeError` if bounds are violated.
- **Thermodynamic Invariants:**
  - **Law 1 (Mass Conservation):** Spatial refinement ($r \to r+1$) must strictly conserve elemental carbon, water, and mineral stocks across child cells.
  - **Law 2 (Energy Balance):** Solar energy flux scales directly with hexagonal surface area $A(r)$.

---

## 💡 Good First Issues & Contributor Extension Points

We love external contributors! If you are looking for ways to get involved with building new monads, spatial operators, or WebGL shaders, consider tackling one of the following extension points:

### 1. Build a New Spatial Monad Operator
* **Objective:** Extend `SpatialMonad` (`src/monads/spatial_monad.ts`) to support K-ring adjacency traversal while verifying resolution bounds.
* **Good First Issue Task:** Implement a `kRing(k: number): SpatialMonad[]` method that checks whether the neighbor indices fall within valid boundaries and computes neighbor adjacency without leaking memory.
* **Testing:** Write unit assertions in `tests/sprint_025.test.ts`.

### 2. Implement WebGL Shaders for H3 Resolution Tiers
* **Objective:** Visualize spatial resolution shifts dynamically using client-side WebGL shaders.
* **Good First Issue Task:** Create a WebGL fragment shader in `src/rendering/shaders/h3_resolution.frag` that modulates color saturation based on the active H3 resolution tier ($0$ to $15$).
* **Verification:** Ensure shader compilation and rendering pipelines execute smoothly via Node.js bindings or test harnesses.

---

## 🧪 Running Tests & Contributing

When submitting pull requests, always ensure your changes pass type checking and testing:
```bash
npx tsx tests/sprint_025.test.ts
```
Happy coding, and welcome to the Web of Life community!