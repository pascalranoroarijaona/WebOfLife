<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 005 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 005**, which introduces rigorous Uber H3 spatial index string format validation and error code mapping within `src/spatial/h3_grid.ts`.

---

## 🛠️ Repository & Tech Stack Setup

We build simulations using modern **TypeScript** and **Node.js**. 

> **CRITICAL CONSTRAINTS:** 
> - Repository URL: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
> - **DO NOT** use Python tools (`pip`, `pytest`, etc.). All dependencies and execution pipelines run through Node.js.

### 1. Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Running Tests
Sprint test suites are written in TypeScript and executed via `tsx`:
```bash
npx tsx tests/sprint_005.test.ts
```

---

## 🧬 Core Concepts: Sprint 005

Sprint 005 implements deterministic validation gates for spatial partitions representing Earth's geodetic surface ($A_{\text{earth}} = \text{constant}$). 

- **Matter Conservation (1st Law):** Spatial grid validation classifies pre-existing geodetic partitions; $\Delta M_{\text{system}} = 0$.
- **Thermodynamic Dissipation (2nd Law):** CPU validation overhead consumes electrical energy, dissipating $Q_{\text{thermal}}$ into the Earth Pod simulation loop.

### Validation Service Interface
```typescript
import { H3ErrorCode, IH3ValidationResult, IH3GridService } from './h3_types';
import { H3Grid } from './src/spatial/h3_grid';

const gridService: IH3GridService = new H3Grid();
const result: IH3ValidationResult = gridService.validateIndex("8928308280fffff");
```

---

## 🚀 Good First Issues & Extension Points

We invite external contributors to help expand the Web of Life simulation architecture. Here are targeted extension points for building new monads or WebGL shaders.

### 1. Extending Monad Stocks (`Good First Issue`)
**Objective:** Implement a new `BiomassDecayMonad` that consumes invalid spatial fault states ($S_{\text{err}}$) and models nutrient recycling.
- **File to Create:** `src/monads/biomass_decay_monad.ts`
- **Starting Template:**
```typescript
import { H3ErrorCode } from '../spatial/h3_types';

export class BiomassDecayMonad {
  public processFault(code: H3ErrorCode): number {
    // Return localized nutrient flux units based on error severity
    switch (code) {
      case H3ErrorCode.INVALID_LENGTH:
        return 0.1;
      default:
        return 0.0;
    }
  }
}
```
- **Test Command:** `npx tsx tests/sprint_005.test.ts`

### 2. WebGL Spatial Heatmap Shaders (`Advanced Contribution`)
**Objective:** Create a WebGL fragment shader to render H3 spatial error states in real-time across the simulation viewport.
- **File to Extend:** `src/renderer/shaders/spatial_frag.glsl`
- **Specification:** Map `H3ErrorCode` enum integer values to color gradients (e.g., `SUCCESS` = Emerald Green, `INVALID_CHARACTER` = Crimson Red).

---

## 🤝 Contributing Guidelines
1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit changes following thermodynamic conservation headers.
4. Run your test suites: `npx tsx tests/sprint_005.test.ts`.
5. Open a Pull Request against `main`.

Happy coding, and welcome to the Web of Life!