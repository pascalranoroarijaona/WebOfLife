# RFC 042: H3CellThermodynamicState Interface and Spatial Thermodynamic State Tensor

**Status**: Approved  
**Author**: Chief Systems Architect  
**Sprint**: 042  
**Target File**: `src/spatial/h3_state_tensor.ts`  
**Related Modules**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/h3_adjacency.ts`, `src/thermodynamics/constants.ts`, `src/monads/spatial_monad.ts`

---

## 1. Abstract

Sprint 042 establishes the fundamental bridge between discrete hexagonal spatial partitioning ($H3$ discrete global grid systems) and non-equilibrium planetary thermodynamics. We define the `H3CellThermodynamicState` interface and its supporting object-oriented structures in `src/spatial/h3_state_tensor.ts`. Each hexagonal cell column is formalized as an open thermodynamic control volume with explicit, scalar thermodynamic state variables: internal thermal energy, kinetic/latent energy, absolute temperature, heat capacity, entropy, radiative fluxes (shortwave absorption, longwave dissipation), and conserved mass stocks (water, elemental carbon, nitrogen, phosphorus, and dry air).

This specification formalizes the class hierarchies, interface contracts, pure transition monads, and algebraic invariants guaranteeing strict adherence to the First and Second Laws of Thermodynamics across the discrete spatial lattice.

---

## 2. Motivation and Problem Statement

Prior sprints introduced the geometric topological layer (`h3_grid.ts`, `h3_adjacency.ts`, `h3_types.ts`) and monolithic planetary pods (`earth_pod.ts`). However, spatial simulations lacked a standardized, strongly typed control-volume state definition for individual H3 cells. 

Without a rigorous per-cell thermodynamic state contract:
1. Local energy fluxes (sensible heat, latent heat, Stefan-Boltzmann radiative cooling) could not be calculated with local conservation guarantees.
2. Advective and diffusive inter-cell flows could violate non-negativity and elemental mass conservation.
3. Entropy production rate ($d_i S / dt$) across adjacent hexagonal boundaries lacked a scalar tensor baseline.

Sprint 042 resolves these deficiencies by introducing `H3CellThermodynamicState` as the canonical unit of planetary spatial thermodynamics.

---

## 3. First and Second Law Thermodynamic Guarantees

Every instance of `H3CellThermodynamicState` represents an open thermodynamic system bounded by cell area $A_c$ ($m^2$) and an atmospheric/lithospheric column height.

### 3.1 First Law: Energy and Mass Conservation
The internal energy $U_c$ (J) evolves strictly according to:
$$\frac{dU_c}{dt} = \Phi_{\text{sw}}^{\text{in}} - \Phi_{\text{sw}}^{\text{ref}} - \Phi_{\text{lw}}^{\text{out}} + \sum_{k \in \mathcal{N}(c)} J_{E, k \to c} + \dot{Q}_{\text{anthro}}$$

where:
- $\Phi_{\text{sw}}^{\text{in}} = S_0 \cdot \cos(\theta_z) \cdot A_c$ is incoming insolation.
- $\Phi_{\text{sw}}^{\text{ref}} = \alpha \cdot \Phi_{\text{sw}}^{\text{in}}$ is shortwave reflection governed by albedo $\alpha \in [0, 1]$.
- $\Phi_{\text{lw}}^{\text{out}} = \epsilon \sigma T_c^4 A_c$ is Stefan-Boltzmann thermal radiation to deep space ($T_{\text{space}} \approx 2.725\,\text{K}$).
- $\sum_{k} J_{E, k \to c}$ is the sum of boundary fluxes between adjacent H3 neighbors.

Total column mass $M_{\text{total}}$ is partitioned into invariant elemental stocks:
$$M_{\text{total}} = M_{\text{dry\_air}} + M_{\text{H}_2\text{O}} + M_{\text{C}} + M_{\text{N}} + M_{\text{P}}$$
No reaction, transformation, or advection process may introduce or destroy matter: $\Delta M_{\text{isolated}} = 0$.

### 3.2 Second Law: Positive Entropy Generation
Local entropy $S_c$ ($\text{J}\cdot\text{K}^{-1}$) and irreversible entropy production $\sigma_c$ ($\text{W}\cdot\text{K}^{-1}$) must satisfy:
$$\sigma_c = \frac{dS_c}{dt} - \sum_j \frac{\Phi_j}{T_j} \ge 0$$
Degradation of high-temperature solar exergy ($T_{\text{sun}} \approx 5778\,\text{K}$) into low-temperature terrestrial heat ($T_c \approx 250 - 320\,\text{K}$) and eventual dissipation to space ($T_{\text{space}} \approx 2.7\,\text{K}$) guarantees positive net entropy generation across the spatial grid.

---

## 4. Class Hierarchy and Interface Architecture

```
                                  +-----------------------------+
                                  |   H3CellThermodynamicState  |
                                  |         (Interface)         |
                                  +--------------+--------------+
                                                 |
                                                 | implements
                                                 v
                                  +-----------------------------+
                                  |  H3CellThermodynamicRecord  |
                                  |      (Immutable Class)      |
                                  +--------------+--------------+
                                                 |
                                                 | aggregated by
                                                 v
+------------------------+        +-----------------------------+
|    SpatialMonad<T>     | <----> |  H3StateTensorContainer     |
| (Functional Evolution) |        | (Sparse/Dense Tensor Index) |
+------------------------+        +-----------------------------+
```

### 4.1 Interface Contract: `H3CellThermodynamicState`

Located in `src/spatial/h3_state_tensor.ts`:

```typescript
export interface H3CellThermodynamicState {
  /** Hexagonal cell index (H3 index encoded as 64-bit hex string) */
  readonly h3Index: string;

  /** Effective cell surface area in square meters (m^2) */
  readonly areaM2: number;

  /** Topographic surface elevation above mean sea level (m) */
  readonly elevationM: number;

  // --- Thermal & Energetic Scalar Properties ---
  /** Internal thermal energy in Joules (J) */
  readonly internalEnergyJ: number;

  /** Absolute surface/column temperature in Kelvin (K) */
  readonly temperatureK: number;

  /** Effective column heat capacity in Joules per Kelvin (J/K) */
  readonly heatCapacityJK: number;

  /** Top-of-atmosphere / surface optical albedo in [0.0, 1.0] */
  readonly albedo: number;

  /** Thermal surface emissivity in [0.0, 1.0] */
  readonly emissivity: number;

  // --- Radiative & Thermal Fluxes (W / m^2) ---
  /** Incoming solar shortwave irradiance (W/m^2) */
  readonly shortwaveInWm2: number;

  /** Outgoing reflected shortwave flux (W/m^2) */
  readonly shortwaveOutWm2: number;

  /** Outgoing longwave thermal radiation flux (W/m^2) */
  readonly longwaveOutWm2: number;

  /** Sensible turbulent heat flux (W/m^2, positive upward) */
  readonly sensibleHeatFluxWm2: number;

  /** Latent heat flux from phase transitions (W/m^2, positive upward) */
  readonly latentHeatFluxWm2: number;

  // --- Entropy State ---
  /** Total entropy of the cell column (J/K) */
  readonly entropyJPerK: number;

  /** Rate of internal entropy generation (W/K, must be >= 0) */
  readonly entropyProductionRateJKs: number;

  // --- Mass Stocks (kg) ---
  /** Atmospheric dry air column mass (kg) */
  readonly dryAirMassKg: number;

  /** Total water mass stock across all phases (kg) */
  readonly totalWaterMassKg: number;

  /** Partitioned liquid water mass (kg) */
  readonly liquidWaterMassKg: number;

  /** Partitioned ice/snow mass (kg) */
  readonly iceMassKg: number;

  /** Partitioned water vapor mass (kg) */
  readonly vaporMassKg: number;

  /** Total elemental carbon stock (biomass + soil organic + CO2) (kg) */
  readonly carbonMassKg: number;

  /** Total elemental nitrogen stock (reactive + N2) (kg) */
  readonly nitrogenMassKg: number;

  /** Total elemental phosphorus stock (kg) */
  readonly phosphorusMassKg: number;
}
```

### 4.2 Immutable Implementation: `H3CellThermodynamicRecord`

```typescript
export class H3CellThermodynamicRecord implements H3CellThermodynamicState {
  constructor(
    public readonly h3Index: string,
    public readonly areaM2: number,
    public readonly elevationM: number,
    public readonly internalEnergyJ: number,
    public readonly temperatureK: number,
    public readonly heatCapacityJK: number,
    public readonly albedo: number,
    public readonly emissivity: number,
    public readonly shortwaveInWm2: number,
    public readonly shortwaveOutWm2: number,
    public readonly longwaveOutWm2: number,
    public readonly sensibleHeatFluxWm2: number,
    public readonly latentHeatFluxWm2: number,
    public readonly entropyJPerK: number,
    public readonly entropyProductionRateJKs: number,
    public readonly dryAirMassKg: number,
    public readonly totalWaterMassKg: number,
    public readonly liquidWaterMassKg: number,
    public readonly iceMassKg: number,
    public readonly vaporMassKg: number,
    public readonly carbonMassKg: number,
    public readonly nitrogenMassKg: number,
    public readonly phosphorusMassKg: number
  ) {
    this.assertInvariants();
  }

  /**
   * Enforces physical invariants:
   * 1. Temperatures strictly > 0 K
   * 2. Non-negative mass stocks
   * 3. Mass closure: totalWater == liquid + ice + vapor within floating-point tolerance
   * 4. Albedo and Emissivity in [0, 1]
   * 5. Entropy production rate >= 0
   */
  private assertInvariants(): void;

  /** Pure copy-and-update mutator */
  public withUpdates(patch: Partial<H3CellThermodynamicState>): H3CellThermodynamicRecord;

  /** Computes instantaneous net radiative balance in W/m^2 */
  public get netRadiativeFluxWm2(): number;

  /** Computes total column mass in kg */
  public get totalMassKg(): number;
}
```

### 4.3 Container: `H3StateTensorContainer`

Encapsulates the discrete spatial collection of cell thermodynamic records, providing indexed lookups, spatial batch reduction, and First Law aggregation:

```typescript
export class H3StateTensorContainer {
  private readonly states: Map<string, H3CellThermodynamicRecord>;

  constructor(initialStates?: Iterable<H3CellThermodynamicRecord>);

  public get(h3Index: string): H3CellThermodynamicRecord | undefined;
  public set(state: H3CellThermodynamicRecord): void;
  public has(h3Index: string): boolean;
  public get size(): number;
  public keys(): IterableIterator<string>;
  public values(): IterableIterator<H3CellThermodynamicRecord>;

  /** Computes global conserved total mass across all registered cells */
  public computeTotalMassKg(): number;

  /** Computes global internal energy across all registered cells */
  public computeTotalInternalEnergyJ(): number;

  /** Computes global entropy sum */
  public computeTotalEntropyJPerK(): number;
}
```

---

## 5. Mathematical Formulations & State Derivations

### 5.1 Temperature-Energy Relation
Temperature is derived or checked from internal energy and heat capacity:
$$T_c = \frac{U_c}{C_{v, c}}$$
where $C_{v, c}$ is the composite heat capacity:
$$C_{v, c} = M_{\text{dry\_air}} c_{v, \text{air}} + M_{\text{liquid}} c_{w} + M_{\text{ice}} c_{\text{ice}} + M_{\text{vapor}} c_{v, \text{vap}} + C_{\text{lithosphere}}$$

### 5.2 Water Mass Consistency
$$\Delta M_{\text{water\_residual}} = |M_{\text{total\_water}} - (M_{\text{liquid}} + M_{\text{ice}} + M_{\text{vapor}})| \le \epsilon_{\text{tol}} \cdot M_{\text{total\_water}}$$
with $\epsilon_{\text{tol}} = 10^{-7}$.

### 5.3 Radiative Balance
$$\Phi_{\text{net}} = \Phi_{\text{sw}}^{\text{in}} - \Phi_{\text{sw}}^{\text{out}} - \Phi_{\text{lw}}^{\text{out}} - \Phi_{\text{sensible}} - \Phi_{\text{latent}}$$
$$\Phi_{\text{sw}}^{\text{out}} = \alpha \cdot \Phi_{\text{sw}}^{\text{in}}$$
$$\Phi_{\text{lw}}^{\text{out}} = \epsilon \cdot \sigma \cdot T_c^4$$

---

## 6. Monadic Integration Contract

`H3CellThermodynamicRecord` interfaces directly with `SpatialMonad<T>`:
```typescript
import { SpatialMonad } from '../monads/spatial_monad';

export type H3ThermodynamicMonad = SpatialMonad<H3CellThermodynamicRecord>;
```
Transitions over the hexagonal lattice will be composable via functional transformations:
$$\mathcal{M}_{t + \Delta t} = \mathcal{M}_t.\text{bind}(f_{\text{radiation}}).\text{bind}(f_{\text{advection}}).\text{bind}(f_{\text{phase\_change}})$$

---

## 7. Verification and Test Plan

1. **Instantiation and Immutability Test**:
   - Verify `H3CellThermodynamicRecord` rejects negative temperatures ($T \le 0\,\text{K}$).
   - Verify rejection of negative mass components.
   - Verify rejection of albedo / emissivity outside $[0, 1]$.
   - Verify rejection of water phase non-closure ($|total - (liquid + ice + vapor)| > \epsilon$).
2. **First Law Mass and Energy Preservation**:
   - Ensure `H3StateTensorContainer.computeTotalMassKg()` accurately sums column masses.
   - Ensure `withUpdates` returns a new immutable instance without mutating the origin.
3. **Radiative and Thermal Flux Sanity**:
   - Stefan-Boltzmann emission matches $\epsilon \sigma T^4$ to within $10^{-6}\,\text{W/m}^2$.
   - Net flux calculation verifies energy conservation sign conventions.
4. **Spatial Adjacency Linkage**:
   - Verify state indices integrate seamlessly with `H3Grid` and `H3Adjacency` from Sprint 041.

---

## 8. Migration and Backward Compatibility

- No existing APIs in `src/spatial/h3_grid.ts` or `src/thermodynamics/constants.ts` are deprecated or broken.
- New file `src/spatial/h3_state_tensor.ts` will be introduced.
- Tests will be added in `tests/sprint_042.test.ts`.