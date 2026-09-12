<!-- Method Specifications -->

# Thermodynamic State Vector Property Validator Helper - Process & Method Specifications

## 1. Executive Process Overview
The Thermodynamic State Vector Property Validator Helper (`src/thermodynamics/state_validator.ts`) enforces strict thermodynamic and mass-balance boundary conditions on all state vectors entering or exiting monad computational pipelines within the Web of Life simulation engine. 

As a pure functional validator, it evaluates conservation laws (First and Second Laws of Thermodynamics) without throwing runtime exceptions, returning explicit diagnostic error strings for invalid states.

---

## 2. Thermodynamic Accounting & Conservation Equations

### 2.1 First Law: Conservation of Energy & Matter
For any valid state vector $S = (\mathcal{E}, \mathcal{S}_{ent}, T, \mathbf{X})$, the total internal energy $\mathcal{E}$ and stock inventories $X_i \in \mathbf{X}$ must satisfy non-negativity and finite real bounds:

$$\mathcal{E} \in \mathbb{R}, \quad \mathcal{E} \geq 0$$

$$\forall X_i \in \mathbf{X}, \quad X_i \in \mathbb{R}, \quad X_i \geq 0$$

### 2.2 Second Law: Entropy & Thermal Bounds
Entropy ($\mathcal{S}_{ent}$) and Absolute Temperature ($T$) must adhere to physical realizability constraints (Third Law / absolute zero boundary):

$$\mathcal{S}_{ent} \in \mathbb{R}, \quad \mathcal{S}_{ent} \geq 0$$

$$T \in \mathbb{R}, \quad T \geq 0$$

---

## 3. Executable Monad Method & State Transfer Equations

The validation process acts as a guard monad filter, wrapping state transitions to guarantee that no illegal thermodynamic state propagates through biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water).

### 3.1 Mathematical Mapping
Let $\mathbb{M}(S)$ represent the monad state container. The validation function $\mathcal{V}$ is defined as:

$$\mathcal{V}(S) = \begin{cases} 
\text{Valid}, & \text{if } \bigwedge_{k} \text{check}_k(S) = \text{true} \\ 
\text{Invalid}(\mathbf{E}), & \text{otherwise} 
\end{cases}$$

Where $\mathbf{E}$ is the vector of accumulated error strings corresponding to violated checks.

### 3.2 TypeScript Implementation Specification (`src/thermodynamics/state_validator.ts`)

```ts
/**
 * @file state_validator.ts
 * @description Pure validation function for thermodynamic state vectors.
 */

import { ThermodynamicState } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the presence, type, and physical bounds of thermodynamic state properties.
 * Adheres to First and Second Law constraints without throwing exceptions.
 * 
 * @param state - The raw or typed state object to validate.
 * @returns ValidationResult containing validation status and diagnostic error strings.
 */
export function validateStateProperties(state: any): ValidationResult {
  const errors: string[] = [];

  if (!state || typeof state !== 'object') {
    return {
      valid: false,
      errors: ['State must be a non-null object.'],
    };
  }

  // 1. Energy validation
  if (typeof state.energy !== 'number' || isNaN(state.energy)) {
    errors.push("Property 'energy' must be defined and of type 'number'.");
  } else if (state.energy < 0) {
    errors.push("Property 'energy' must be greater than or equal to 0.");
  }

  // 2. Entropy validation
  if (typeof state.entropy !== 'number' || isNaN(state.entropy)) {
    errors.push("Property 'entropy' must be defined and of type 'number'.");
  } else if (state.entropy < 0) {
    errors.push("Property 'entropy' must be greater than or equal to 0.");
  }

  // 3. Temperature validation
  if (typeof state.temperature !== 'number' || isNaN(state.temperature)) {
    errors.push("Property 'temperature' must be defined and of type 'number'.");
  } else if (state.temperature < 0) {
    errors.push("Property 'temperature' must be greater than or equal to 0 (Absolute Zero boundary).");
  }

  // 4. Stocks validation
  if (!state.stocks || typeof state.stocks !== 'object') {
    errors.push("Property 'stocks' must be defined, non-null, and an object/Map.");
  } else {
    const stockEntries = state.stocks instanceof Map 
      ? Array.from(state.stocks.entries()) 
      : Object.entries(state.stocks);

    if (stockEntries.length === 0 && !(state.stocks instanceof Map && state.stocks.size === 0)) {
      // Optional: allow empty stocks or enforce minimum inventory depending on RFC.
    }

    for (const [key, value] of stockEntries) {
      if (typeof value !== 'number' || isNaN(value as number)) {
        errors.push(`Stock inventory '${key}' must be a valid number.`);
      } else if ((value as number) < 0) {
        errors.push(`Stock inventory '${key}' must be non-negative (>= 0).`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 4. Integration Verification & Test Vectors

| Test Case ID | Input State Vector (`energy`, `entropy`, `temperature`, `stocks`) | Expected `valid` | Expected Diagnostic `errors` |
| :--- | :--- | :--- | :--- |
| **TC-01** | `1000.0, 50.0, 298.15, { C: 100, H2O: 500 }` | `true` | `[]` |
| **TC-02** | `-100.0, 50.0, 298.15, { C: 100 }` | `false` | `["Property 'energy' must be greater than or equal to 0."]` |
| **TC-03** | `1000.0, -10.0, 298.15, { C: 100 }` | `false` | `["Property 'entropy' must be greater than or equal to 0."]` |
| **TC-04** | `1000.0, 50.0, -5.0, { C: 100 }` | `false` | `["Property 'temperature' must be greater than or equal to 0 (Absolute Zero boundary)."]` |
| **TC-05** | `1000.0, 50.0, 298.15, { C: -50 }` | `false` | `["Stock inventory 'C' must be non-negative (>= 0)."]` |
| **TC-06** | `undefined, 50.0, 298.15, null` | `false` | Multiple presence errors. |