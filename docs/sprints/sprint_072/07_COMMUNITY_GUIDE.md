<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 072 Contributor Guide: Thermodynamic State Vectors & Monads

Welcome to **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`), a TypeScript and Node.js-based simulation engine coupling biogeochemical thermodynamics with functional monad architectures and real-time WebGL rendering.

This developer onboarding guide covers the core features introduced in Sprint 072 (`computeAbsoluteStockDelta`), provides instructions for setting up your development environment, and highlights **Good First Issues** and extension points for external contributors interested in building custom monads or WebGL shaders.

---

## 1. Getting Started & Environment Setup

Ensure you have **Node.js** (v18+ recommended) installed. Clone the repository and install dependencies using standard Node packages:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We use `tsx` for running TypeScript test suites directly. To run the tests for Sprint 072, execute:

```bash
npx tsx tests/sprint_072.test.ts
```

To run the full test suite across all sprints:
```bash
npm test
```

---

## 2. Sprint 072 Feature Overview: Thermodynamic State Validation

Sprint 072 introduces the pure helper function `computeAbsoluteStockDelta(actual, expected)` within `src/thermodynamics/state_validator.ts`. 

### Why It Matters
In our thermodynamic engine, biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) are modeled as state vectors. To comply with the First Law of Thermodynamics (matter conservation) and feed precise error gradients into Second Law dissipation monads, the system computes element-wise absolute discrepancies:

$$\Delta(k) = \left| \text{actual}_k - \text{expected}_k \right|$$

### Code Implementation (`src/thermodynamics/state_validator.ts`)
```typescript
export function computeAbsoluteStockDelta(
    actual: Record<string, number>,
    expected: Record<string, number>
): Record<string, number> {
    const allKeys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    const deltas: Record<string, number> = {};

    for (const key of allKeys) {
        const actualVal = actual[key] ?? 0;
        const expectedVal = expected[key] ?? 0;
        deltas[key] = Math.abs(actualVal - expectedVal);
    }
    return deltas;
}
```

---

## 3. Good First Issues for External Contributors

If you are looking for ways to contribute to the Web of Life ecosystem, here are three well-defined **Good First Issues** designed for new contributors:

### Issue A: Implement Carbon-Specific Tolerance Monad Wrapper
* **Description:** Create a higher-order monad function `withCarbonTolerance(deltaRecord, threshold)` that inspects the `'C'` key from `computeAbsoluteStockDelta` and triggers a warning event if $\Delta(\text{'C'}) > \text{threshold}$.
* **Target File:** `src/thermodynamics/monads/carbon_monad.ts`
* **Skills Needed:** TypeScript, Functional Composition, Basic Monads.

### Issue B: Add Edge-Case Unit Tests for Sparse Water Pools
* **Description:** Write comprehensive unit test cases in a new or existing test file that passes heavily asymmetric dictionaries (e.g., `actual` containing only `{'H2O': 500}` and `expected` containing `{'C': 12, 'N': 14}`) to verify zero-default resilience.
* **Target File:** `tests/sprint_072.test.ts`
* **Skills Needed:** TypeScript, Unit Testing (`node:test` or standard assertion libraries via `npx tsx`).

### Issue C: WebGL Shader Uniform Binding for Thermodynamic Stress
* **Description:** Expose the maximum calculated stock delta as a uniform float (`u_thermoStress`) to the WebGL rendering pipeline so that ecosystem nodes visually pulse or shift coloration under high thermodynamic disequilibrium.
* **Target File:** `src/renderer/shaders/ecosystem.frag` & `src/renderer/pipeline.ts`
* **Skills Needed:** GLSL, WebGL, TypeScript.

---

## 4. Extension Points: Building New Monads & WebGL Shaders

### Extending the Monad Architecture
The Web of Life uses functional monads to encapsulate side-effect-free ecological transitions. To build a new monad:
1. Define your state interface in `src/monads/types.ts`.
2. Implement your monadic container wrapping a value and a bind/map operation.
3. Integrate thermodynamic state validators (like `computeAbsoluteStockDelta`) inside your monad's validation step to ensure physical laws are not violated during state transformations.

### Extending WebGL Shaders
To visualize ecosystem states:
1. Place custom vertex and fragment shaders inside `src/renderer/shaders/`.
2. Bind simulation parameters (e.g., temperature, entropy dissipation rates, stock deltas) to shader uniforms via `src/renderer/pipeline.ts`.
3. Test shader compilation and rendering performance locally using `npx tsx tests/renderer.test.ts`.

---
*Happy coding, and welcome to the Web of Life community!*