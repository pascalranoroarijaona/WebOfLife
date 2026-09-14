<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 18 Developer Onboarding & Community Guide: H3 Spatial Validation & Thermodynamic Monads

Welcome to the **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`) open-source community! This guide provides a developer-focused onboarding walkthrough for Sprint 18, detailing how to set up your TypeScript/Node.js workspace, run tests, and contribute new monads or WebGL shaders.

---

## 1. Quickstart & Environment Setup

Ensure you have **Node.js** (v18+) and **npm** installed on your system. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run Sprint 18 Tests:**
   We use `tsx` to execute TypeScript test files directly. Run the test suite for Sprint 18 with:
   ```bash
   npx tsx tests/sprint_018.test.ts
   ```

---

## 2. Sprint 18 Feature Overview: 15-Character H3 Length Validation

In Sprint 18, we introduced `isValidH3Length(index: unknown)` inside `src/spatial/h3_grid.ts`. This function ensures spatial topological integrity by verifying that H3 index strings strictly conform to a 15-character hexadecimal format before interacting with spatial monad stock transitions.

### Key Code Snippet (`src/spatial/h3_grid.ts`)
```typescript
const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export function isValidH3Length(index: unknown): boolean {
    if (typeof index !== 'string') {
        return false;
    }
    return H3_REGEX.test(index);
}
```

---

## 3. Good First Issues & Contribution Extension Points

We welcome external contributors! If you are looking to get your hands dirty, check out the following extension points designed for community growth.

### 3.1 Building New Monads
The simulation relies on monadic structures (e.g., `SpatialMonad`, `TrophicMonad`) to handle state transitions under strict thermodynamic laws (Matter Conservation, Solar Input Only).
* **Where to look:** `src/monads/`
* **Good First Issue Idea:** Implement a `TemporalMonad` that wraps ecological tick updates, ensuring time-step continuity ($\Delta t$) without unauthorized energy injections.
* **Template for a New Monad:**
  ```typescript
  export class TemporalMonad<T> {
      private constructor(private readonly state: T) {}

      public static unit<T>(value: T): TemporalMonad<T> {
          return new TemporalMonad(value);
      }

      public bind<U>(fn: (val: T) => TemporalMonad<U>): TemporalMonad<U> {
          // Enforce thermodynamic purity here
          return fn(this.state);
      }
  }
  ```

### 3.2 Building New WebGL Shaders
To visualize trophic energy flows and spatial grid partitions across the biosphere, we use high-performance WebGL shaders.
* **Where to look:** `src/shaders/` or `public/shaders/`
* **Good First Issue Idea:** Write a fragment shader that visualizes H3 cell activation heatmaps based on trophic energy absorption rates.
* **Testing Shaders:** Ensure your shader uniforms correctly ingest spatial buffer attributes from `src/spatial/h3_grid.ts`.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/amazing-monad`
2. Commit your changes following conventional commits: `git commit -m "feat(monads): introduce temporal monad framework"`
3. Push to GitHub: `git push origin feature/amazing-monad`
4. Open a Pull Request against `main` on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Happy coding, and may your thermodynamic entropy always decrease locally!