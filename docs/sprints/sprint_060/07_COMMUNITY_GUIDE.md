<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 060 Developer Relations & Community Contributor Guide

Welcome to **Web Of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`), a simulation architecture enforcing thermodynamic rigour across planetary biogeochemical cycles. Sprint 060 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator** (`src/thermodynamics/state_validator.ts`), which automates validation of the First and Second Laws of Thermodynamics across simulated ecosystems.

Whether you are an open-source contributor looking for "Good First Issues" or a developer wanting to extend the simulation with new monads or WebGL shaders, this guide will get you up to speed quickly.

---

## 1. Getting Started & Setup

This repository is built using **TypeScript and Node.js**. 

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Test Execution
Clone the repository and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

To run the verification tests for Sprint 060, execute:

```bash
npx tsx tests/sprint_060.test.ts
```

---

## 2. Core Architecture: `StateValidator`

The `StateValidator` evaluates inventory discrepancies by taking actual stock deltas ($\Delta S_{\text{actual}}$) and comparing them against expected flux-derived deltas ($\Delta S_{\text{flux}} = \sum \text{Inputs} - \sum \text{Outputs}$).

### Key Interfaces (`src/thermodynamics/types.ts`)
```typescript
export interface DiscrepancyResult {
    stockId: string;
    actualDelta: number;
    expectedDelta: number;
    absoluteDifference: number;
    isWithinTolerance: boolean;
}

export interface ValidationReport {
    timestamp: number;
    isValid: boolean;
    maxDiscrepancy: number;
    discrepancies: DiscrepancyResult[];
}
```

### Usage Example (`src/thermodynamics/state_validator.ts`)
```typescript
import { StateVector } from './state_vector';
import { StateValidator } from './state_validator';

const validator = new StateValidator(1e-6);
const prevVector = new StateVector();
const currVector = new StateVector();

// Populate stocks...
const fluxes = new Map<string, number>([['CARBON_ATMOSPHERE', 12.5]]);
const report = validator.validateStateVector(prevVector, currVector, fluxes);

if (!report.isValid) {
    console.warn(`Thermodynamic violation detected! Max discrepancy: ${report.maxDiscrepancy}`);
}
```

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution? Here are three scoped "Good First Issues" aligned with Sprint 060 architecture:

1. **GFI-01: Custom Tolerance Configuration per Stock Reservoir**
   - *Description:* Extend `StateValidator` to accept a `Map<string, number>` of custom tolerances rather than a single global $\epsilon = 10^{-6}$, allowing high-volume water reservoirs to permit wider floating-point margins than delicate carbon stocks.
   - *Starter File:* `src/thermodynamics/state_validator.ts`

2. **GFI-02: Automated Audit Logger Export**
   - *Description:* Implement a utility function `exportValidationReportMarkdown(report: ValidationReport): string` that formats validation failures into structured Markdown tables suitable for automated PR review comments.
   - *Starter File:* `src/thermodynamics/audit_exporter.ts` (New file)

3. **GFI-03: Phosphorus Cycle Inventory Extension**
   - *Description:* Add a new biogeochemical stock handler for Phosphorus (`PHOSPHORUS_LITHO`) incorporating weathering input fluxes and sedimentation output fluxes.
   - *Starter File:* `src/thermodynamics/biogeochemistry/phosphorus.ts` (New file)

---

## 4. Extension Points: Building New Monads & WebGL Shaders

### Extending Monad Processes
To introduce a new thermodynamic monad process:
1. Extend the base monad interface in `src/thermodynamics/monad_process.ts`.
2. Implement your kinetic rate equations and ensure mass conservation bounds are respected.
3. Register your monad outputs with `StateValidator` to verify compliance against the First Law of Thermodynamics.

### Extending WebGL Shaders
For visualising thermodynamic fluxes and stock concentrations in real time:
1. Locate the shader pipeline under `src/renderer/shaders/`.
2. Pass `ValidationReport` metrics (such as `maxDiscrepancy`) as uniforms to dynamically shift ecosystem colour profiles (e.g., tinting aberrant pods red when `isValid === false`).
```glsl
uniform float u_maxDiscrepancy;
// Apply color modulation based on thermodynamic health
```

---
Happy coding, and welcome to the Web of Life community!