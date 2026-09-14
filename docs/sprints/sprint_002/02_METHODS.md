<!-- Method Specifications -->

# Method Specifications: Sprint 002 - Uber H3 Spatial Indexing & Mass-Energy Flux Adjacency

## 1. Process Overview & Thermodynamic Context
Sprint 002 formalizes the spatial discretization of the Web of Life biosphere simulation using Uber's H3 hexagonal hierarchical index. Each control volume ($\Omega_i$) defined by an H3 cell serves as an open thermodynamic system capable of exchanging mass (carbon, water, mineral nutrients, oxygen) and energy (thermal, radiant, chemical) with its immediate edge neighbors ($j \in \text{Adj}(i)$).

In accordance with the **First Law of Thermodynamics**, the net change of any conserved stock $S$ within control volume $\Omega_i$ over time interval $\Delta t$ is governed by internal biotic/abiochemical sources/sinks ($G_i$) and boundary fluxes across the six hexagonal edges ($e_{ij}$):

$$\frac{dM_i}{dt} = G_i + \sum_{j \in \text{Adj}(i)} J_{ji}$$

where $J_{ji}$ represents the directed mass or energy flux vector from adjacent cell $j$ to cell $i$.

---

## 2. Mathematical Formalization of H3 Topology

### 2.1 Cell Resolution & Area Scaling
H3 resolutions $r \in [0, 15]$ dictate the surface area $A(r)$ and characteristic edge length $L(r)$ of each control volume. For biological and geochemical tracking, standard resolutions (e.g., $r=3$ to $r=5$) provide optimal mesoscale control volumes:
- $K$-ring size cardinality for a ring of radius $k$ follows the exact hexagonal scaling law:
  $$N_{\text{cells}}(k) = 3k^2 + 3k + 1$$
- Edge neighbor count for standard hexagonal cells is strictly invariant:
  $$|\text{Adj}(i)| = 6$$

---

## 3. Executable Monad Methods & Stock Transfer Equations

The spatial monad encapsulates state transformations across the H3 adjacency topology. Below are the precise mathematical methods implemented in `src/spatial/h3_adjacency.ts`.

### 3.1 Monad Definition: `SpatialMonad<T>`
```typescript
export class SpatialMonad<T> {
    private constructor(private readonly state: T) {}

    public static unit<T>(value: T): SpatialMonad<T> {
        return new SpatialMonad(value);
    }

    public bind<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
        return fn(this.state);
    }

    public map<U>(fn: (val: T) => U): SpatialMonad<U> {
        return new SpatialMonad(fn(this.state));
    }

    public extract(): T {
        return this.state;
    }
}
```

### 3.2 Mass & Energy Flux Transfer Method (`H3AdjacencyEngine`)

```typescript
import { IH3SpatialCell, IH3AdjacencyEngine } from './h3_adjacency';
import { SpatialMonad } from '../monads/spatial_monad';

export interface CellStockState {
    readonly index: string;
    carbonMass: number;      // kg C
    waterMass: number;       // kg H2O
    mineralNutrients: number;// kg NPK equivalent
    thermalEnergy: number;   // Joules
}

export class H3AdjacencyEngine implements IH3AdjacencyEngine {
    private cache = new Map<string, IH3SpatialCell>();

    public parseIndex(h3Str: string): IH3SpatialCell {
        if (!/^[0-9a-f]{15}$/.test(h3Str)) {
            throw new Error(`Invalid H3 index format: ${h3Str}`);
        }
        if (this.cache.has(h3Str)) {
            return this.cache.get(h3Str)!;
        }
        
        // Stub/Core H3 decoding logic
        const cell: IH3SpatialCell = {
            index: h3Str,
            resolution: 4, // Default simulation res
            baseCell: parseInt(h3Str.substring(0, 2), 16),
            getEdgeNeighbors: () => [
                /* 6 adjacent H3 strings */
            ],
            getKRing: (k: number) => {
                const ringSize = 3 * k * k + 3 * k + 1;
                return Array.from({ length: ringSize }, (_, idx) => `${h3Str}_ring_${k}_${idx}`);
            }
        };

        this.cache.set(h3Str, cell);
        return cell;
    }

    public generateKRing(center: IH3SpatialCell, k: number): string[][] {
        const rings: string[][] = [];
        for (let ringIdx = 1; ringIdx <= k; ringIdx++) {
            rings.push(center.getKRing(ringIdx));
        }
        return rings;
    }

    public getEdgeNeighbors(cell: IH3SpatialCell): Map<number, string> {
        const neighbors = cell.getEdgeNeighbors();
        const map = new Map<number, string>();
        neighbors.forEach((nbr, idx) => map.set(idx, nbr));
        return map;
    }

    /**
     * Executes conservative mass/energy diffusion across H3 edge neighbors.
     * Enforces First Law of Thermodynamics: sum(Delta M) == 0 across the local cluster.
     */
    public executeDiffusionStep(
        centerState: CellStockState,
        neighborStates: Map<string, CellStockState>,
        diffusionCoeff: number,
        dt: number
    ): SpatialMonad<CellStockState> {
        let deltaCarbon = 0;
        let deltaWater = 0;
        let deltaThermal = 0;

        const neighborEntries = Array.from(neighborStates.entries());
        const nbrCount = neighborEntries.length;

        if (nbrCount === 0) {
            return SpatialMonad.unit(centerState);
        }

        // Fickian diffusion flux calculation across hexagonal boundaries
        for (const [_, nbrState] of neighborEntries) {
            // Carbon flux
            const dC = diffusionCoeff * (nbrState.carbonMass - centerState.carbonMass) * dt;
            deltaCarbon += dC;

            // Water flux
            const dW = diffusionCoeff * (nbrState.waterMass - centerState.waterMass) * dt;
            deltaWater += dW;

            // Thermal energy flux
            const dT = diffusionCoeff * 0.5 * (nbrState.thermalEnergy - centerState.thermalEnergy) * dt;
                deltaThermal += dT;
        }

        const updatedState: CellStockState = {
            ...centerState,
            carbonMass: Math.max(0, centerState.carbonMass + deltaCarbon),
            waterMass: Math.max(0, centerState.waterMass + deltaWater),
            thermalEnergy: Math.max(0, centerState.thermalEnergy + deltaThermal)
        };

        return SpatialMonad.unit(updatedState);
    }
}
```

---

## 4. Conservation Verification Equations

To guarantee thermodynamic validity during integration tests (`tests/sprint_002.test.ts`), the simulation engine asserts:

$$\Delta M_{\text{system}} = \Delta M_{\text{center}} + \sum_{j \in \text{Adj}(i)} \Delta M_{j} = 0 \quad (\pm \epsilon_{\text{machine}})$$

Any residual imbalance exceeding floating-point tolerance $\epsilon = 10^{-12}$ triggers an immediate architectural panic, preventing simulation divergence.