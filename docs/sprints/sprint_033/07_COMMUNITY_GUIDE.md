<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 033 Community Contributor & Onboarding Guide

Welcome to the **Web of Life** open-source community! This guide provides a developer-focused walkthrough of the features introduced in **Sprint 033**, which enforces strict topological conservation and input validation via H3 spatial token verification in TypeScript.

---

## 🚀 Quickstart & Environment Setup

Ensure you are working in a Node.js environment with TypeScript configured.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 033 verification test suite:**
   ```bash
   npx tsx tests/sprint_033.test.ts
   ```

---

## 🛠️ What's New in Sprint 033?

Sprint 033 introduces strict input validation within `src/spatial/h3_grid.ts`. Any spatial token containing non-hexadecimal characters immediately triggers an explicit error (`InvalidH3TokenError`), preventing phantom index mappings and maintaining the thermodynamic integrity of the simulation.

### Core Implementation
```typescript
export class InvalidH3TokenError extends Error {
  constructor(token: string) {
    super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
  }
}

export function validateH3Token(token: string): void {
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!token || !hexRegex.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}
```

---

## 🧩 Good First Issues & Extension Points

If you are looking to contribute to the Web of Life repository, here are two primary extension tracks tailored for external developers:

### 1. Building Custom Monads (`src/monads/`)
The Web of Life relies on functional and spatial monads to encapsulate simulation state transitions safely.
* **Good First Issue Idea:** Create a `TrophicMonad` in `src/monads/trophic_monad.ts` that safely manages energy transfers between predator and prey nodes, ensuring mass-energy conservation ($E_{\text{in}} = E_{\text{out}} + \text{Heat}$).
* **Extension Point:** Implement flatmap and bind operators for custom ecological state vectors.

### 2. Developing Custom WebGL Shaders (`src/shaders/`)
For contributors interested in GPU-accelerated ecological rendering and cellular automata visualization:
* **Good First Issue Idea:** Implement a WebGL fragment shader in `src/shaders/entropy_field.frag` to render real-time thermodynamic heat dissipation across spatial H3 cells.
* **Extension Point:** Bind uniform buffers to real-time simulation metrics coming from the TypeScript core loops.

---

## 📝 Running Tests & Contributing

Always run the full test suite before submitting a pull request:
```bash
npx tsx tests/sprint_033.test.ts
```

We look forward to your contributions in maintaining absolute topological and thermodynamic integrity across the Web of Life ecosystem!