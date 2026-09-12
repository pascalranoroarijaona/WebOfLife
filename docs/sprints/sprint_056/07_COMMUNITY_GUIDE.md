<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 056 Contributor Guide: Thermodynamic State Vector Stock Conservation Delta Calculator

Welcome to the **Web of Life** open-source community! This onboarding guide is designed for developers and contributors looking to understand, test, and extend the thermodynamic simulation features introduced in **Sprint 056**.

---

## 1. Getting Started

The Web of Life repository is built using **TypeScript** and **Node.js**. 

To set up your development environment and run tests, ensure you have Node.js (v18+) installed, then execute the following commands in your terminal:

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies
npm install

# Run the test suite for Sprint 056
npx tsx tests/sprint_056.test.ts
```

---

## 2. Core Architecture Overview (Sprint 056)

Sprint 056 introduces the `StateValidator` (`src/thermodynamics/state_validator.ts`), which bridges boundary flux rates and discrete simulation time steps to calculate and validate expected stock deltas.

```
┌────────────────────────────────────────────────────────┐
│                      EarthPod                          │
│                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │   Thermodynamic       │   │    StateVector        │ │
│  │   Structure           │──►│    (Stocks & Fluxes)  │ │
│  └───────────────────────┘   └──────────┬────────────┘ │
│                                         │              │
│                              ┌──────────▼────────────┐ │
│                              │   StateValidator      │ │
│                              │   (Delta Calculator)  │ │
│                              └───────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Key Files:
- `src/thermodynamics/types.ts`: Type definitions for `IFlowRateVector` and `IDeltaCalculationResult`.
- `src/thermodynamics/state_validator.ts`: Core calculation and validation engine.
- `tests/sprint_056.test.ts`: Automated test suite verifying mass conservation and flux integrations.

---

## 3. Good First Issues & Extension Points

We welcome external contributors! If you want to contribute to the thermodynamic subsystems, here are two prime extension points:

### Extension Point A: Building New Biogeochemical Monads
You can extend the existing element types (`carbon`, `nitrogen`, `phosphorus`, `water`, `energy`) or create custom monad calculators for trace gases or pollutants.

1. Register your new element type in `src/thermodynamics/types.ts`:
   ```typescript
   export interface IFlowRateVector {
       element: 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'energy' | 'methane';
       inflows: Map<string, number>;
       outflows: Map<string, number>;
   }
   ```
2. Implement custom flux validation rules in a new validator class or subclass `StateValidator`.

### Extension Point B: Integrating Custom WebGL Shaders for Flux Visualization
If you are interested in frontend rendering or WebGL shaders, you can bind the outputs of `StateValidator` to fragment shaders representing planetary heat dissipation or carbon density heatmaps.
- Explore `src/rendering/shaders/` to wire simulation state deltas into uniform buffers.

---

## 4. Contributing Workflow
1. Fork the repository on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes (`git commit -m 'feat: add methane thermodynamic monad'`).
4. Run your tests locally (`npx tsx tests/sprint_056.test.ts`).
5. Open a Pull Request!