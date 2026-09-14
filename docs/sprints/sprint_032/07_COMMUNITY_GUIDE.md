<!-- DevRel Onboarding & Contributor Guide -->

# Developer Relations & Community Onboarding: Sprint 032
**Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
**Tech Stack**: TypeScript, Node.js

Welcome to the **Web of Life** open-source community! Sprint 032 introduces crucial architectural enhancements to our spatial subsystem: **H3 Token Payload Validation** via regular expression matching (`/^[0-9a-fA-F]{15}$/`). This guide will help you get set up, run tests, and discover ways to contribute by building new monads or WebGL shaders.

---

## 🚀 Quickstart for New Contributors

To get your local development environment running, ensure you have **Node.js** installed, then execute the following commands in your terminal:

```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies (DO NOT use pip or other package managers)
npm install

# 3. Run the Sprint 032 test suite to verify your setup
npx tsx tests/sprint_032.test.ts
```

---

## 🧪 Testing Guidelines

We enforce strict test-driven development and thermodynamic conservation. Whenever you add features, make sure your tests validate both functional correctness and energy state transitions.

Run individual sprint test files using `tsx`:
```bash
npx tsx tests/sprint_032.test.ts
```

---

## 💡 Good First Issues for External Contributors

Looking to make your first contribution? Here are two designated tasks tailored for newcomers:

### 1. Build a Custom Monad: `NutrientTransportMonad`
* **Objective**: Create a new monad under `src/monads/` that handles nitrogen and phosphorus cycling alongside energy stocks.
* **Extension Point**: Implement the `SpatialMonad` interface or extend `SpatialMonad` from `src/monads/spatial_monad.ts`.
* **Acceptance Criteria**: 
  - Must deduct metabolic costs during transport.
  - Must include unit tests verifying mass conservation ($\Delta = 0$ for matter, bounded energy expenditure).
  - Run verification using `npx tsx tests/sprint_nutrient.test.ts`.

### 2. Build a WebGL Shader: `CellularEntropyHeatmapShader`
* **Objective**: Implement a fragment shader in `src/rendering/shaders/` to visualize the thermodynamic sink states introduced in Sprint 032.
* **Extension Point**: Hook into the WebGL rendering pipeline managed in `src/rendering/renderer.ts`.
* **Acceptance Criteria**: 
  - Shader must render invalid H3 token payload rejections as thermal dissipation gradients.
  - Must compile without WebGL warnings and integrate cleanly with the main render loop.

---

## 🤝 Community & Support
- **Issues & PRs**: Submit pull requests directly to `main` via feature branches.
- **Discussions**: Join our community architecture discussions on GitHub Discussions to propose new spatial grid layers or thermodynamic constraints.

Happy coding, and keep your entropy low!