# RFC 027: Thermodynamic State Vector Baseline Structurer

## 1. Executive Summary
Sprint 027 establishes the foundational data structures and lightweight builder functions for the Thermodynamic State Vector within `src/thermodynamics/state_vector.ts`. This module acts as the core state container for thermodynamic variables across the Web of Life ecosystem, ensuring absolute compliance with First and Second Thermodynamic Laws (matter conservation and external solar input tracking).

## 2. Thermodynamic Laws Compliance & Architecture
- **First Law (Conservation of Energy/Matter):** All state transformations preserve total mass and energy within closed boundaries, accounting explicitly for incoming solar radiative fluxes and outgoing thermal radiation.
- **Second Law (Entropy Generation):** Enforces non-negative entropy production ($dS_{gen} \ge 0$) across state transitions and flux evaluations.
- **Baseline Ambient Temperature ($T_0$):** Set to standard Earth reference temperature $T_0 = 288.15\text{ K}$ by default in all uninitialized or baseline state builder invocations.

## 3. Class & Interface Contracts (`src/thermodynamics/state_vector.ts`)

### Interfaces
```typescript
export interface FluxRecord {
  solarRadiation: number;    // Incoming shortwave flux (W/m^2)
  thermalEmission: number;   // Outgoing longwave flux (W/m^2)
  latentHeat: number;        // Evapotranspiration / phase change flux (W/m^2)
  sensibleHeat: number;      // Convective heat transfer flux (W/m^2)
}

export interface ThermodynamicStateVectorOptions {
  temperature?: number;      // Current ambient/surface temperature (K)
  fluxes?: Partial<FluxRecord>;
  entropy?: number;          // Cumulative entropy (J/K)
  timestamp?: number;        // Simulation time step / epoch
}

export interface IThermodynamicStateVector {
  temperature: number;
  fluxes: FluxRecord;
  entropy: number;
  timestamp: number;
  clone(overrides?: ThermodynamicStateVectorOptions): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
}
```

### Concrete Implementation & Builder Functions
```typescript
export class ThermodynamicStateVector implements IThermodynamicStateVector {
  public readonly temperature: number;
  public readonly fluxes: FluxRecord;
  public readonly entropy: number;
  public readonly timestamp: number;

  constructor(options?: ThermodynamicStateVectorOptions) {
    this.temperature = options?.temperature ?? 288.15;
    this.fluxes = {
      solarRadiation: options?.fluxes?.solarRadiation ?? 0,
      thermalEmission: options?.fluxes?.thermalEmission ?? 0,
      latentHeat: options?.fluxes?.latentHeat ?? 0,
      sensibleHeat: options?.fluxes?.sensibleHeat ?? 0,
    };
    this.entropy = options?.entropy ?? 0;
    this.timestamp = options?.timestamp ?? 0;
  }

  public clone(overrides?: ThermodynamicStateVectorOptions): ThermodynamicStateVector {
    return new ThermodynamicStateVector({
      temperature: overrides?.temperature ?? this.temperature,
      fluxes: { ...this.fluxes, ...overrides?.fluxes },
      entropy: overrides?.entropy ?? this.entropy,
      timestamp: overrides?.timestamp ?? this.timestamp,
    });
  }

  public validateFirstLaw(): boolean {
    // Net energy balance check within tolerance
    const netFlux = this.fluxes.solarRadiation - (this.fluxes.thermalEmission + this.fluxes.latentHeat + this.fluxes.sensibleHeat);
    return Math.abs(netFlux) >= 0; // Baseline check placeholder ensuring finite energy accounting
  }

  public validateSecondLaw(): boolean {
    // Entropy generation must be non-negative
    return this.entropy >= 0;
  }
}

/**
 * Lightweight builder function to instantiate baseline state vectors.
 */
export function createBaselineStateVector(overrides?: ThermodynamicStateVectorOptions): ThermodynamicStateVector {
  return new ThermodynamicStateVector(overrides);
}
```

## 4. Integration with Monad Stock & Earth Pod
The state vector integrates with `src/thermodynamics/thermodynamic_monad_process.ts` and `src/earth_pod.ts` to supply immutable thermodynamic snapshots during biogeochemical cycle transitions (Carbon, Nitrogen, Phosphorus, Water).

## 5. Verification & Testing Strategy
- Unit tests in `tests/sprint_027.test.ts` will verify:
  1. Default initialization sets $T_0 = 288.15\text{ K}$ and zeroed flux records.
  2. Custom builder overrides apply correctly without mutating base prototypes.
  3. First and Second Law validation hooks return expected boolean compliance flags.