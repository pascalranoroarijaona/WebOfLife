<!-- Method Specifications -->

# Thermodynamic State Vector & Monadic Execution Methods (`src/thermodynamics/thermodynamic_structure.ts`)

This document details the concrete mathematical methods, thermodynamic process deltas, and monad transformations implementing the contracts specified in Sprint 012 (`src/thermodynamics/types.ts`).

---

## 1. Thermodynamic State Monad Implementation

The `ThermodynamicMonad` wraps any biogeochemical or thermal stock `T` alongside the system's `IThermodynamicStateVector`. Every state transition computes energy exchange, entropy flux, internal entropy generation ($\dot{S}_{\text{gen}}$), and exergy destruction ($\dot{I}$), enforcing the First and Second Laws of Thermodynamics.

### 1.1 Core Monad Execution Equation

Given a current stock state $S_t$ and thermodynamic state vector $\vec{V}_t = \{U, S, T_0, \dot{S}_{\text{gen}}, \dot{I}, \vec{B}\}$, a transformation over time step $\Delta t$ updates the system via:

$$\vec{V}_{t+\Delta t} = \vec{V}_t + \left( \frac{d\vec{V}}{dt} \right) \Delta t$$

Where the rate vector components are defined as:
1. **Internal Energy Rate:**
   $$\frac{dU}{dt} = \sum \dot{Q}_i + \sum \dot{m}_k \left( h_k + \frac{v_k^2}{2} + gz_k \right)$$
2. **Entropy Rate:**
   $$\frac{dS_{\text{sys}}}{dt} = \sum \frac{\dot{Q}_j}{T_j} + \sum \dot{m}_k s_k + \dot{S}_{\text{gen}}$$
3. **Exergy Destruction Rate:**
   $$\dot{I} = T_0 \dot{S}_{\text{gen}}$$

---

## 2. Executable Monad Method Specifications

### 2.1 Thermal Radiation & Conduction Step (`applyThermalFlux`)

Computes energy and entropy adjustments due to incoming solar shortwave/longwave radiation and boundary heat conduction.

```typescript
export function applyThermalFlux(
  stock: ThermalStock,
  state: IThermodynamicStateVector,
  qNet: number,
  boundaryTemp: number,
  dt: number
): [ThermalStock, IThermodynamicStateVector] {
  const T0 = state.referenceTemperature;
  
  // 1st Law: Internal energy change from heat flux
  const dU = qNet * dt;
  const newInternalEnergy = state.internalEnergy + dU;

  // 2nd Law: Entropy transfer via heat Q/T plus internal generation
  // Assuming a localized thermal gradient driven entropy generation
  const entropyTransfer = qNet / boundaryTemp;
  
  // Dissipative volumetric generation estimate: S_gen = Q_net * (1/T_boundary - 1/T_sys) approx
  const sysTemp = T0; // Local equilibrium approximation
  const dotSGen = Math.abs(qNet) * Math.max(0, (1 / boundaryTemp - 1 / sysTemp));
  const dotI = T0 * dotSGen;

  const dEntropy = (entropyTransfer + dotSGen) * dt;
  const newEntropy = state.entropy + dEntropy;

  const updatedState: IThermodynamicStateVector = {
    ...state,
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: dotI,
    boundaryFluxes: {
      ...state.boundaryFluxes,
      radiativeNet: qNet
    }
  };

  const updatedStock = {
    ...stock,
    temperature: sysTemp,
    thermalEnergy: newInternalEnergy
  };

  return [updatedStock, updatedState];
}
```

### 2.2 Biogeochemical Mass Transport Step (`applyMassTransport`)

Handles enthalpy and entropy transport associated with mass fluxes $\dot{m}_k$ (e.g., water cycle precipitation/evaporation, carbon gas exchange).

```typescript
export function applyMassTransport(
  stock: BiogeochemicalStock,
  state: IThermodynamicStateVector,
  massFluxes: Map<string, number>,
  specificEnthalpy: number,
  specificEntropy: number,
  dt: number
): [BiogeochemicalStock, IThermodynamicStateVector] {
  let totalMassRate = 0;
  massFluxes.forEach((flux) => {
    totalMassRate += flux;
  });

  const T0 = state.referenceTemperature;

  // Energy flux from mass transport [W]
  const energyFlux = totalMassRate * specificEnthalpy;
  const dU = energyFlux * dt;

  // Entropy transport from mass flows [W/K]
  const entropyTransportRate = totalMassRate * specificEntropy;
  
  // Irreversibility from mass mixing and chemical potential gradients
  const dotSGen = Math.abs(totalMassRate * specificEntropy * 0.05); // 5% dissipation benchmark
  const dotI = T0 * dotSGen;

  const newInternalEnergy = state.internalEnergy + dU;
  const newEntropy = state.entropy + (entropyTransportRate + dotSGen) * dt;

  const updatedState: IThermodynamicStateVector = {
    ...state,
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: dotI,
    boundaryFluxes: {
      ...state.boundaryFluxes,
      massFluxes: new Map(massFluxes)
    }
  };

  const updatedStock = {
    ...stock,
    totalMass: stock.totalMass + totalMassRate * dt
  };

  return [updatedStock, updatedState];
}
```

---

## 3. Invariant Validation Rules

Within the `ThermodynamicMonad.bind` execution pipeline, the following assertions are evaluated every tick:

1. **Clausius Inequality Enforcement:**
   $$\dot{S}_{\text{gen}} \ge 0$$
   *If violated, simulation halts with a `SecondLawViolation` exception.*

2. **Exergy Destruction Consistency:**
   $$\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$$
   *Verified within floating-point tolerance $\epsilon = 10^{-9}$ J/s.*

3. **Energy Closure Balance:**
   $$\left| \Delta U - \int (\dot{Q} + \sum \dot{m}h) dt \right| \le \epsilon_{\text{energy}}$$