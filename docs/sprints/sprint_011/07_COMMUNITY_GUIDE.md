<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 011 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** contributor community! This guide covers the onboarding process for Sprint 011, focusing on Uber H3 spatial index verification, monad state transitions, and extension points for new contributors wanting to build custom monads or WebGL shaders.

## 1. Getting Started & Repository Setup

The official repository is hosted at:
[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

### Prerequisites
- Node.js (v18+ recommended)
- TypeScript ecosystem tools

### Installation & Test Execution
Never use Python tools like `pip` or `pytest`. This repository is strictly TypeScript and Node.js.

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies
npm install

# Run the test suite for Sprint 011
npx tsx tests/sprint_011.test.ts
```

---

## 2. Sprint 011 Architecture Overview

Sprint 011 introduces strict character set verification for Uber H3 spatial index strings inside `src/spatial/h3_grid.ts`. 

### Key Components:
- **`IH3Validator`**: Interface defining the validation contract.
- **`H3GridManager`**: Implements validation logic, enforcing lowercase hexadecimal matching (`[0-9a-f]`) and fixed-length constraints (15 characters).
- **Spatial Monad Integration**: Intercepts raw telemetry payloads, filtering invalid tokens before updating trophic energy stocks in `src/monads/spatial_monad.ts`.

---

## 3. "Good First Issues" for New Contributors

Looking to make your first contribution? Here are targeted tasks aligned with Sprint 011:

1. **Case-Insensitive Normalization Feature:**
   - *Issue:* Currently, uppercase hexadecimal strings are strictly rejected.
   - *Task:* Modify `H3GridManager.validateIndex()` to automatically lowercase input strings before running the regex test, and add a test case in `tests/sprint_011.test.ts`.
2. **Detailed Boundary Logging:**
   - *Issue:* Rejected H3 indices are dropped silently.
   - *Task:* Implement a thermodynamic violation logger in `src/spatial/h3_grid.ts` that captures malformed token metadata without leaking system enthalpy.

---

## 4. Extension Points for External Contributors

### 4.1 Building New Monads
To create a custom ecological or biochemical monad:
1. Extend the base monad structure under `src/monads/`.
2. Implement state transition gates similar to `SpatialMonad` in `src/monads/spatial_monad.ts`.
3. Ensure strict adherence to the First and Second Laws of Thermodynamics (matter conservation and deterministic solar/tick-driven execution).

### 4.2 Building New WebGL Shaders
To render spatial monad stocks visually:
1. Locate the rendering pipeline under the graphics/WebGL modules.
2. Hook into the validated output streams from `H3GridManager`.
3. Write custom fragment/vertex shaders that consume spatial index attributes safely.