<!-- DevRel Onboarding & Contributor Guide -->

# Developer Relations & Community Contributor Guide: Sprint 015
**Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Target Stack:** TypeScript, Node.js

Welcome to the **Web of Life** open-source community! In Sprint 015, we introduced rigorous null-check guard clauses for incoming H3 string payloads within `src/spatial/h3_grid.ts`. This guide is designed to help new contributors onboard quickly, understand our architectural constraints, and find rewarding "Good First Issues" to tackle.

---

## 1. Getting Started & Development Setup

Whether you are building custom monads or contributing WebGL shaders, our development workflow runs entirely on Node.js and TypeScript. 

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   *(Note: This repository uses TypeScript and Node.js. Do not use `pip install` or Python tools.)*
   ```bash
   npm install
   ```

3. **Run the test suite:**
   We validate all sprint deliverables using `tsx` via `npx`. To run the Sprint 015 verification tests, execute:
   ```bash
   npx tsx tests/sprint_015.test.ts
   ```

---

## 2. Understanding Sprint 015: Spatial Guard Clauses

In `src/spatial/h3_grid.ts`, incoming H3 spatial payloads must be strictly validated to prevent computational entropy and phantom reference states. Here is a quick look at how the guard clause is implemented:

```typescript
export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new Error("Thermodynamic Violation [Sprint 015]: H3 payload cannot be null or undefined.");
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new Error("Thermodynamic Violation [Sprint 015]: H3 payload must be a non-empty string.");
  }
  return payload.trim();
}
```

When building new features, always ensure your inputs are guarded at system boundaries to comply with our thermodynamic conservation standards ($\Delta E = 0$).

---

## 3. Good First Issues for External Contributors

If you are looking for a place to make your first contribution, consider picking up one of these scoped tasks:

### Issue 1: Boundary Validation on Trophic Energy Flows
* **Target Module:** `src/biosphere/trophic.ts`
* **Objective:** Implement a type guard similar to `guardH3Payload` for incoming trophic mass distribution payloads to prevent negative energy values.
* **Acceptance Criteria:** Throw a descriptive error on negative or `null` energy inputs; add corresponding unit tests in `tests/sprint_015_trophic.test.ts`.

### Issue 2: Custom Monad State Serialization Guard
* **Target Module:** `src/monads/base_monad.ts`
* **Objective:** Add an immutable state-check decorator to ensure monad stocks cannot transition into undefined states during serialization cycles.
* **Acceptance Criteria:** Type-safe wrapper ensuring runtime preservation of stock values.

---

## 4. Extension Points: Building New Monads & WebGL Shaders

The Web of Life engine is built around composable monads and high-performance rendering pipelines. Here is how you can extend the core system:

### Extending Monads
To build a new simulation monad:
1. Extend the abstract base monad class in `src/monads/`.
2. Implement required state transition and entropy reduction interfaces.
3. Register your monad inside the central simulation loop (`src/engine/loop.ts`).

### Contributing WebGL Shaders
To add a new WebGL visualizer or spatial heat shader:
1. Place your GLSL shader code under `src/renderer/shaders/`.
2. Bind the shader uniform variables in `src/renderer/webgl_context.ts`.
3. Test rendering performance against spatial grids using our test runner (`npx tsx tests/renderer.test.ts`).

---

## 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit your changes with clear, semantic commit messages.
3. Run the complete test suite to ensure no regressions occur.
4. Open a Pull Request against the `main` branch on GitHub!