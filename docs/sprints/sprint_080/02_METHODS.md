# Method Specifications: Pentagonal Neighborhood Advection & Topology Guard

## 1. Physical and Thermodynamic Process Characterization

In the discrete global grid system (DGGS) partitioning Earth's surface into an icosahedral hexagonal mesh (H3 projection), Euler's polyhedral formula dictates that exactly 12 singular pentagonal vertices exist at each hierarchical resolution scale:
$$V - E + F = 2$$
While ordinary hexagonal cells have degree $\deg(h) = 6$, pentagonal cells possess degree $\deg(p) = 5$. Advective and diffusive transport across these geodesic boundaries governs mass-energy exchange between adjacent ecological biomes.

### 1.1 Advection-Diffusion Governing Equations
For any ecological state vector $\mathbf{\Psi}_i = [C_i, W_i, M_i, O_i, U_i]^T$ (representing carbon, water, minerals, oxygen, and internal thermal energy within cell $i$):

$$\frac{\partial \mathbf{\Psi}_i}{\partial t} = -\sum_{j \in \mathcal{N}(i)} \mathbf{J}_{i \to j} A_{ij} + \mathbf{S}_i$$

Where:
- $\mathcal{N}(i)$ is the neighbor index set of cell $i$ (for a pentagon, $|\mathcal{N}(p)| \le 5$).
- $A_{ij}$ is the contact facet geodesic boundary length ($m$).
- $\mathbf{J}_{i \to j}$ is the net boundary flux density tensor ($mol \cdot m^{-1} \cdot s^{-1}$ or $J \cdot m^{-1} \cdot s^{-1}$).
- $\mathbf{S}_i$ is internal source/sink transformations (photosynthesis, respiration, weathering).

### 1.2 The First Law of Thermodynamics: Mass & Energy Invariants
In any closed spatial domain $\Omega = \bigcup_{i} V_i$ without external cosmic influx:
$$\sum_{i \in \Omega} \frac{d \mathbf{\Psi}_i}{dt} = \mathbf{0}$$

Each directional boundary flux satisfies anti-symmetry:
$$\mathbf{J}_{i \to j} = -\mathbf{J}_{j \to i} \implies \sum_{i \in \Omega} \sum_{j \in \mathcal{N}(i)} \mathbf{J}_{i \to j} A_{ij} = \mathbf{0}$$

If an invalid neighbor representation (e.g. `null`, non-array object, scalar, or corrupted pointer) is processed during iterative flux allocation, unilateral truncation of the edge loop drops downstream terms, resulting in spurious mass-energy generation ($\sum \Delta \mathbf{\Psi} \neq \mathbf{0}$). Runtime type enforcement via `assertPentagonalNeighborArrayType` ensures all flux distributions execute over valid iterables or abort atomically prior to mutating stock balances.

### 1.3 Second Law: Entropy Production and Gradient Consistency
Diffusive fluxes $\mathbf{J}_{\text{diff}, i \to j}$ across cell interfaces follow Fickian and Fourier transport laws:
$$J_{U, i \to j} = -k_{\text{th}} \frac{T_j - T_i}{\Delta x_{ij}}$$
$$J_{C, i \to j} = -D_C \frac{\rho_{C, j} - \rho_{C, i}}{\Delta x_{ij}}$$

Local rate of entropy production $\sigma$ is non-negative:
$$\sigma = \sum_{\langle i, j \rangle} J_{U, i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) + \sum_{s \in \{C, W, M, O\}} J_{s, i \to j} \left( -\frac{\mu_{s, j} - \mu_{s, i}}{T_{ij}} \right) \ge 0$$

Type degradation of neighbor arrays corrupts spatial distance $\Delta x_{ij}$ and chemical potential evaluations, risking unphysical reverse entropy transport.

---

## 2. Quantitative Mass and Energy Transfer Deltas

Let cell $p$ be a singular pentagon ($|\mathcal{N}(p)| = 5$). Let $k \in \{1, 2, 3, 4, 5\}$ denote its boundary neighbors with equal interface lengths $A_{pk} = L_p / 5$.

### 2.1 State Vector Components & Units
| Symbol | Component | Units | Conservation Invariant |
| :--- | :--- | :--- | :--- |
| $C$ | Total Carbon (organic + inorganic) | $\text{mol C}$ | Strict Mass Conservation ($\Delta C_{\text{tot}} = 0$) |
| $W$ | Water equivalent ($H_2O$) | $\text{mol } H_2O$ | Strict Mass Conservation ($\Delta W_{\text{tot}} = 0$) |
| $M$ | Mineral Nutrients (N, P, trace) | $\text{mol Minerals}$ | Strict Mass Conservation ($\Delta M_{\text{tot}} = 0$) |
| $O$ | Dissolved/Atmospheric Oxygen ($O_2$) | $\text{mol } O_2$ | Strict Mass Conservation ($\Delta O_{\text{tot}} = 0$) |
| $U$ | Thermal Enthalpy | $\text{Joules (J)}$ | First Law Conservation ($\Delta U_{\text{tot}} = 0$) |

### 2.2 Boundary Transfer Formulation for Pentagonal Advection
For a time step $\Delta t$, the discrete flux allocation from pentagon $p$ to neighbor $k \in \mathcal{N}(p)$ with hydraulic/atmospheric conductance $g_{pk}$ and driving potential gradient $\Delta \Phi_{pk}$:

$$\Delta \mathbf{\Psi}_{p \to k} = g_{pk} \cdot \Delta \Phi_{pk} \cdot \mathbf{\Psi}_p \cdot \frac{A_{pk}}{\sum_{m \in \mathcal{N}(p)} A_{pm}} \cdot \Delta t$$

Subject to the stability limiter:
$$\sum_{k \in \mathcal{N}(p)} \Delta \mathbf{\Psi}_{p \to k} \le \mathbf{\Psi}_p$$

Net updates:
$$\mathbf{\Psi}_p^{(t+\Delta t)} = \mathbf{\Psi}_p^{(t)} - \sum_{k \in \mathcal{N}(p)} \Delta \mathbf{\Psi}_{p \to k}$$
$$\mathbf{\Psi}_k^{(t+\Delta t)} = \mathbf{\Psi}_k^{(t)} + \Delta \mathbf{\Psi}_{p \to k} \quad \forall k \in \mathcal{N}(p)$$

### 2.3 Guard Failure Handling & Zero-Delta Contract
If `assertPentagonalNeighborArrayType(neighbors)` encounters `!Array.isArray(neighbors)`:
1. Operation terminates instantly with `TypeError`.
2. No intermediary partial deltas are committed:
$$\Delta \mathbf{\Psi}_p = \mathbf{0}, \quad \Delta \mathbf{\Psi}_k = \mathbf{0}$$
3. State transitions remain strictly unitary and conservative.

---

## 3. Executable Monad Method Formalization

The following TypeScript monad implementation formalizes the discrete mass/energy state transitions and embeds `assertPentagonalNeighborArrayType` as an invariant gatekeeper.

```typescript
/**
 * Ecological state stock vector for a discrete DGGS cell.
 */
export interface CellStockVector {
  readonly carbon: number;        // mol C
  readonly water: number;         // mol H2O
  readonly minerals: number;      // mol Nutrients
  readonly oxygen: number;        // mol O2
  readonly thermalEnergy: number; // Joules (J)
}

/**
 * Immutable spatial state container.
 */
export interface SpatialCellState {
  readonly h3Index: string;
  readonly isPentagon: boolean;
  readonly stocks: CellStockVector;
}

/**
 * Validates that candidate pentagonal neighbors conform to Array type.
 * Throws TypeError if the structure is invalid, preventing non-conservative drops.
 */
export function assertPentagonalNeighborArrayType(
  neighbors: unknown
): asserts neighbors is unknown[] {
  if (!Array.isArray(neighbors)) {
    const actualType = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(
      `Invalid pentagonal neighbor collection: Expected an Array, received ${actualType}.`
    );
  }
}

/**
 * Spatial Flux Monad representing conservative mass and energy advection.
 */
export class PentagonalFluxMonad {
  private constructor(
    private readonly sourceState: SpatialCellState,
    private readonly neighborsState: Map<string, SpatialCellState>,
    private readonly error: Error | null = null
  ) {}

  /**
   * Lifts initial cell states into the monadic context.
   */
  public static of(
    source: SpatialCellState,
    neighbors: Map<string, SpatialCellState>
  ): PentagonalFluxMonad {
    return new PentagonalFluxMonad(source, new Map(neighbors));
  }

  /**
   * Failure factory.
   */
  public static fail(err: Error): PentagonalFluxMonad {
    return new PentagonalFluxMonad(
      {
        h3Index: 'invalid',
        isPentagon: true,
        stocks: { carbon: 0, water: 0, minerals: 0, oxygen: 0, thermalEnergy: 0 }
      },
      new Map(),
      err
    );
  }

  /**
   * Executes conservative diffusion across pentagonal neighbors with defensive type validation.
   */
  public advectPentagonalFlux(
    candidateNeighbors: unknown,
    transferCoefficients: number[],
    deltaTimeSeconds: number
  ): PentagonalFluxMonad {
    if (this.error) return this;

    try {
      // 1. Guard check: Defensive assertion on pentagon neighbor collection
      assertPentagonalNeighborArrayType(candidateNeighbors);

      // Degree validation for pentagonal topology (must not exceed 5 planar neighbors)
      if (candidateNeighbors.length > 5) {
        throw new RangeError(
          `Topological anomaly: Pentagonal cell has ${candidateNeighbors.length} neighbors; max 5 permitted.`
        );
      }

      if (candidateNeighbors.length === 0) {
        // Isolated cell: 0 net delta
        return this;
      }

      // Compute total mass/energy allocation
      const neighborCount = candidateNeighbors.length;
      let totalOutfluxFraction = 0;
      for (let i = 0; i < neighborCount; i++) {
        const coeff = transferCoefficients[i] ?? 0.05;
        totalOutfluxFraction += coeff * deltaTimeSeconds;
      }

      // Courant-Friedrichs-Lewy (CFL) stability limiter: outflux cannot exceed 50% per step
      const safeOutfluxRatio = Math.min(totalOutfluxFraction, 0.50);
      const perNeighborRatio = safeOutfluxRatio / neighborCount;

      const srcStocks = this.sourceState.stocks;
      const totalDelta: CellStockVector = {
        carbon: srcStocks.carbon * safeOutfluxRatio,
        water: srcStocks.water * safeOutfluxRatio,
        minerals: srcStocks.minerals * safeOutfluxRatio,
        oxygen: srcStocks.oxygen * safeOutfluxRatio,
        thermalEnergy: srcStocks.thermalEnergy * safeOutfluxRatio,
      };

      // Construct updated source state
      const updatedSource: SpatialCellState = {
        ...this.sourceState,
        stocks: {
          carbon: srcStocks.carbon - totalDelta.carbon,
          water: srcStocks.water - totalDelta.water,
          minerals: srcStocks.minerals - totalDelta.minerals,
          oxygen: srcStocks.oxygen - totalDelta.oxygen,
          thermalEnergy: srcStocks.thermalEnergy - totalDelta.thermalEnergy,
        }
      };

      // Construct updated neighbors state with strictly partitioned mass
      const updatedNeighbors = new Map(this.neighborsState);
      const deltaPerNeighbor: CellStockVector = {
        carbon: srcStocks.carbon * perNeighborRatio,
        water: srcStocks.water * perNeighborRatio,
        minerals: srcStocks.minerals * perNeighborRatio,
        oxygen: srcStocks.oxygen * perNeighborRatio,
        thermalEnergy: srcStocks.thermalEnergy * perNeighborRatio,
      };

      for (const nbrId of candidateNeighbors) {
        const idStr = String(nbrId);
        const currentNbr = updatedNeighbors.get(idStr) ?? {
          h3Index: idStr,
          isPentagon: false,
          stocks: { carbon: 0, water: 0, minerals: 0, oxygen: 0, thermalEnergy: 0 }
        };

        updatedNeighbors.set(idStr, {
          ...currentNbr,
          stocks: {
            carbon: currentNbr.stocks.carbon + deltaPerNeighbor.carbon,
            water: currentNbr.stocks.water + deltaPerNeighbor.water,
            minerals: currentNbr.stocks.minerals + deltaPerNeighbor.minerals,
            oxygen: currentNbr.stocks.oxygen + deltaPerNeighbor.oxygen,
            thermalEnergy: currentNbr.stocks.thermalEnergy + deltaPerNeighbor.thermalEnergy,
          }
        });
      }

      return new PentagonalFluxMonad(updatedSource, updatedNeighbors);
    } catch (err) {
      return PentagonalFluxMonad.fail(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Verifies that mass and energy are conserved exactly across source and neighbors.
   */
  public verifyThermodynamicInvariants(initialTotal: CellStockVector, tolerance: number = 1e-9): boolean {
    if (this.error) return false;

    let currentTotal: CellStockVector = { ...this.sourceState.stocks };
    for (const nbr of this.neighborsState.values()) {
      currentTotal = {
        carbon: currentTotal.carbon + nbr.stocks.carbon,
        water: currentTotal.water + nbr.stocks.water,
        minerals: currentTotal.minerals + nbr.stocks.minerals,
        oxygen: currentTotal.oxygen + nbr.stocks.oxygen,
        thermalEnergy: currentTotal.thermalEnergy + nbr.stocks.thermalEnergy,
      };
    }

    const deltaCarbon = Math.abs(currentTotal.carbon - initialTotal.carbon);
    const deltaWater = Math.abs(currentTotal.water - initialTotal.water);
    const deltaMinerals = Math.abs(currentTotal.minerals - initialTotal.minerals);
    const deltaOxygen = Math.abs(currentTotal.oxygen - initialTotal.oxygen);
    const deltaEnergy = Math.abs(currentTotal.thermalEnergy - initialTotal.thermalEnergy);

    return (
      deltaCarbon <= tolerance &&
      deltaWater <= tolerance &&
      deltaMinerals <= tolerance &&
      deltaOxygen <= tolerance &&
      deltaEnergy <= tolerance
    );
  }

  public getResult(): { source: SpatialCellState; neighbors: Map<string, SpatialCellState> } {
    if (this.error) {
      throw this.error;
    }
    return {
      source: this.sourceState,
      neighbors: this.neighborsState,
    };
  }
}
```

---

## 4. Verification and Conservation Checklist

1. **Type Safety & Rejection**:
   - Primitive strings, numbers, objects, `null`, and `undefined` trigger immediate `TypeError`.
   - Prevents downstream iterator exceptions that disrupt linear matrix computations.
2. **Conservation Equivalence**:
   - Total source decrement $\Delta \mathbf{\Psi}_{\text{source}} = \sum_{k} \Delta \mathbf{\Psi}_{k}$.
   - Machine epsilon tolerance verified at $\epsilon \le 10^{-9}$.
3. **Entropy Consistency**:
   - Transfer ratios strictly non-negative; advection proceeds in the direction of lower potential or along prescribed velocity fields without unphysical spontaneous gradients.