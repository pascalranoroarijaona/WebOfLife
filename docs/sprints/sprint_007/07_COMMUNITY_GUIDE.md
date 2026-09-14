<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 007 Community & Developer Onboarding Guide

Welcome to the **Web of Life** developer community! This guide serves as your onboarding handbook for **Sprint 007**, which introduces robust Uber H3 spatial index format validation and deterministic error code mapping within `src/spatial/h3_grid.ts`.

Whether you are looking to understand how spatial monads safeguard our planetary simulation against thermodynamic addressing leakage or want to contribute your own custom monads and WebGL shaders, this document will get you up to speed.

---

## 1. Getting Started

### Prerequisites & Setup
Our entire stack is built on **TypeScript and Node.js**. 

> **CRITICAL NOTE:** This repository does **NOT** use Python (`pip`, `pytest`, etc.). All dependency management is handled via `npm`, and testing is executed via `npx tsx`.

Clone the repository and install dependencies:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint Tests
To verify your environment and run the test suite for Sprint 007, execute:
```bash
npx tsx tests/sprint_007.test.ts
```

---

## 2. Sprint 007 Architecture Overview: `H3GridValidator`

Sprint 007 implements strict validation rules for Uber H3 hexagonal spatial indices. In the Web of Life simulation, spatial coordinates act as addressing containers for mass and energy stocks. Validating string tokens ensures zero spatial corruption and prevents invalid energetic propagation.

### Key Components
- **`H3ErrorCode`**: Standardized diagnostic codes (`0x01` through `0x06`) mapping null values, length anomalies, invalid hex characters, resolution bounds out of range `[0, 15]`, and base cell violations `[0, 121]`.
- **`H3GridValidator`**: A stateless static validator class in `src/spatial/h3_grid.ts` exposing `validateString(h3Index)`, `parseResolution(h3Index)`, and `parseBaseCell(h3Index)`.
- **`SpatialMonad` Integration**: Wraps incoming string tokens, routing valid cells into encapsulated spatial states and invalid cells into guarded error states.

---

## 3. Good First Issues & Contribution Opportunities

We love external contributors! If you want to jump into the codebase, here are two curated **Good First Issues** designed around Sprint 007's architecture:

### Issue #701: Implement `ERR_H3_OUT_OF_RANGE` Edge-Case Guard
- **Difficulty**: Beginner
- **Description**: Extend `H3GridValidator.validateString` in `src/spatial/h3_grid.ts` to explicitly check if the parsed bitmask exceeds planetary grid constraints, returning `H3ErrorCode.ERR_H3_OUT_OF_RANGE` when bitwise overflow occurs.
- **Where to look**: `src/spatial/h3_grid.ts` and `tests/sprint_007.test.ts`.

### Issue #702: Add Custom Jest/Vitest Assertions for Spatial Monads
- **Difficulty**: Intermediate
- **Description**: Create a test helper utility in `tests/helpers/spatial_assertions.ts` that allows test writers to assert `expect(monad).toHaveValidH3Resolution(res)` cleanly.
- **Where to look**: `src/monads/spatial_monad.ts` and `tests/`.

---

## 4. Extension Points: Building New Monads or WebGL Shaders

Want to expand the simulation engine? Here is how you can hook into our architecture:

### A. Building a New Monad
All simulation stocks (energetic, biochemical, or spatial) are governed by monadic structures upholding conservation laws. To build a new monad (e.g., `ThermodynamicMonad`):
1. Create your file under `src/monads/your_monad.ts`.
2. Implement standard monad operations (`of`, `map`, `bind`, `extract`).
3. Ensure strict adherence to the First Law (mass/energy conservation) and Second Law (internal entropy generation via computational dissipation).
4. Register your monad in `src/index.ts`.

### B. Building a New WebGL Shader
For visual rendering of planetary hexagons and energy stocks:
1. Place your GLSL shaders in `src/shaders/` (e.g., `h3_heat_map.vert` and `h3_heat_map.frag`).
2. Bind shader uniforms to spatial monad state metadata (such as resolution and validation status).
3. Verify rendering pipeline compatibility with our WebGL context wrapper in `src/renderer/`.

---

## 5. Submitting Your Contribution
1. Create a feature branch: `git checkout -b feature/sprint-007-enhancement`
2. Run your tests: `npx tsx tests/sprint_007.test.ts`
3. Push your branch and open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Happy coding, and may your entropy remain low!