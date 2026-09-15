<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 086 Contributor & Developer Guide: Directional Aperture Parsing for Pentagonal H3 Singularities

Welcome to the **WebOfLife** open-source contributor guide for Sprint 086! Whether you are a mathematical modeler, a systems programmer in TypeScript, or a graphics engineer passionate about WebGL, this guide will walk you through the newly introduced discrete global grid system (DGGS) features and show you how to build upon them.

---

## 1. Overview & What Was Built in Sprint 086

In spherical DGGS architectures based on the regular icosahedron (such as Uber's H3), the spherical surface is subdivided into 110 hexagonal base cells and exactly 12 pentagonal base cells centered at icosahedral vertices:
$$\mathcal{P}_{\text{base}} = \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$$

Unlike hexagonal cells which possess 6 coplanar neighbors and accept aperture-7 directional digits $d \in \{0, 1, 2, 3, 4, 5, 6\}$, pentagonal cells have only 5 immediate neighbors. The $K$-axis aperture direction ($d = 1$) is geometrically suppressed.

In Sprint 086, we introduced:
- `extractPentagonApertureDigits` and `H3PentagonApertureParser` in `src/spatial/h3_adjacency.ts`.
- `PentagonApertureResult` contract in `src/spatial/h3_types.ts`.
- First and Second Law thermodynamic boundary protections in `src/spatial/spatial_flux_monad.ts` preventing ghost fluxes across the deleted $d=1$ facet.

### Key Capabilities:
- Bitwise extraction of directional digits $[d_1, \dots, d_r]$ across resolutions $r \in [0, 15]$.
- Extraction of the non-zero directional digit sequence $\mathbf{D}_{\neq 0}$.
- Validation of pentagon invariants (flagging invalid $d=1$ digits on pentagonal lineages).
- Detection of pure topological pentagons (`nonZeroDigits.length === 0`).

---

## 2. Quickstart: Setting Up Your Environment

Our repository is hosted at:
[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

The engine is built entirely in **TypeScript** on **Node.js** (v18+ or v20+ recommended).

### Step 1: Clone and Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Step 2: Run Sprint 086 Tests
To verify your local environment against Sprint 086 additions:
```bash
npx tsx tests/sprint_086.test.ts
```

All 6 test suites covering base pentagons, higher-resolution pure pentagons, descendant branches, invalid digit checks, and thermodynamic flux conservation should pass with zero warnings.

---

## 3. Architecture & Code Tour

### Module Layout
```
src/spatial/
├── h3_types.ts            # Data contracts, PentagonApertureResult interface
├── h3_adjacency.ts        # H3PentagonApertureParser, extractPentagonApertureDigits
├── spatial_flux_monad.ts  # Conservative mass/energy transport across pentagon facets
└── h3_state_tensor.ts     # Cell thermodynamic state vectors (C, H2O, Min, O2, Energy)
```

### How to Use `extractPentagonApertureDigits` in Your Code

```typescript
import { extractPentagonApertureDigits } from "./src/spatial/h3_adjacency.js";

// Hex index for Base Cell 24 at resolution 3 with aperture branch [0, 2, 5]
const hexIndex = "83300a000000000"; // Example H3 index
const result = extractPentagonApertureDigits(hexIndex);

console.log(result.isPentagonBaseCell);       // true
console.log(result.isPurePentagon);           // false (has directional descendants)
console.log(result.allDigits);                // [0, 2, 5]
console.log(result.nonZeroDigits);            // [2, 5]
console.log(result.leadingNonZeroDigit);      // 2
console.log(result.hasInvalidPentagonDigit);  // false
```

---

## 4. Good First Issues & Extension Opportunities

We invite contributors to jump into these curated tasks:

### Issue A (Beginner): Implement Aperture Digit Formatter & SVG Diagram Generator
- **Goal**: Build a CLI utility in `src/cli/visualize_aperture.ts` that takes an H3 hex string and generates an ASCII or SVG representation of the aperture branch tree, highlighting whether the branch is pentagon-rooted and marking any prohibited $d=1$ traversal attempts in red.
- **Skillset**: TypeScript, Node CLI streams, basic SVG string generation.

### Issue B (Intermediate): WebGL Pentagonal Vertex Shader & Singularity Highlighting
- **Goal**: In the frontend visualization module (`src/rendering/shaders/`), write a WebGL GLSL fragment/vertex shader pair that renders icosahedral cells onto a unit sphere. For cells identified via `isPentagonBaseCell`, modulate the polygon geometry from 6 vertices to 5 vertices, scaling vertex positions according to the metric correction factor $\alpha_{\text{geom}} = 5/6$.
- **Files to Touch**:
  - `src/rendering/shaders/h3_cell.vert.glsl`
  - `src/rendering/shaders/h3_cell.frag.glsl`
  - `src/rendering/webgl_renderer.ts`
- **Extension Point**: Bind `PentagonApertureResult.isPurePentagon` as an instance attribute uniform (`a_is_pentagon`).

### Issue C (Advanced): Thermodynamic Wind/Advection Monad Across Pentagon Boundaries
- **Goal**: Implement `AdvectiveAtmosphericFluxMonad` in `src/spatial/monads/advection_monad.ts`. When computing velocity-driven wind advection vectors $(\vec{u})$ between neighboring H3 cells, calculate projected flux $J_{ij} = \vec{u} \cdot \vec{n}_{ij}$. For pentagonal cells, dynamically route mass exclusively across the 5 valid directional facets $\{2, 3, 4, 5, 6\}$, asserting strict zero-mass divergence ($\sum \Delta M \equiv 0$).
- **Test Pattern**: Write unit tests in `tests/monads/advection_pentagon.test.ts` verified using `npx tsx tests/monads/advection_pentagon.test.ts`.

---

## 5. Development Guidelines & Quality Invariants

When contributing pull requests to WebOfLife:
1. **Never Violate Thermodynamic Conservation**:
   - Total mass ($\Delta M_{\text{C}} + \Delta M_{\text{H}_2\text{O}} + \Delta M_{\text{min}} + \Delta M_{\text{O}_2} = 0$).
   - Thermal energy exchanges must satisfy anti-symmetry ($\mathbf{J}_{i \to j} = -\mathbf{J}_{j \to i}$).
   - Local entropy production rate must satisfy $\dot{\sigma}_s \ge 0$.
2. **Deterministic BigInt Bit Twiddling**:
   - Always cast H3 indexes to 64-bit BigInt literals (`BigInt("0x" + hex)`).
   - Mask shifts with unsigned bitwise operators (`& 7n`, `& 0xfn`, `& 0x7fn`).
3. **No External Heavy Dependencies**:
   - Core topology logic must remain zero-dependency TypeScript.
4. **Verification**:
   - Always run your tests with `npx tsx tests/sprint_086.test.ts` before submitting your PR.

Happy hacking, and welcome to the WebOfLife community!
```

---