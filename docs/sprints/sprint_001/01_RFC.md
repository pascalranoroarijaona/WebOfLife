# RFC 001: Directed Acyclic Trophic Graphs and Lindeman's Efficiency Matrix

## Metadata
- **Author:** Chief Systems Architect, Web of Life
- **Status:** APPROVED
- **Sprint:** Sprint 001
- **Target Implementation:** `src/biosphere/trophic.ts`
- **Dependencies:** `src/earth_pod.ts`

---

## 1. Overview & Architectural Objective
To simulate the energetic flow of an ecosystem accurately, the Web of Life engine requires a rigorous thermodynamic model of energy transfer between trophic levels. This RFC defines the architecture for Directed Acyclic Trophic Graphs (DATG) and Lindeman's 10% Efficiency Rule matrices within `src/biosphere/trophic.ts`.

In compliance with the **First and Second Laws of Thermodynamics**:
1. **Conservation of Matter/Energy (First Law):** Energy entering the ecosystem must equal the sum of biomass accumulation, metabolic heat dissipation, and egested waste. No energy is created or destroyed.
2. **Entropic Degradation (Second Law):** Energy transfers between trophic levels are bounded by Lindeman's efficiency parameters (nominally ~10%), with the remainder lost as metabolic heat (entropy).

---

## 2. Class Hierarchy & Interface Contracts

The system will extend the object-oriented architecture of the Web of Life ecosystem by introducing explicit taxonomic nodes, directed edges representing consumption vectors, and an overarching trophic matrix manager.

### 2.1 Interface Contracts

```typescript
export interface EnergyPacket {
    joules: number;
    sourceNodeId: string;
    timestamp: number;
}

export interface TrophicNode {
    id: string;
    name: string;
    level: TrophicLevel;
    biomassJoules: number;
    metabolicRate: number; // Basal metabolic dissipation per tick
    absorbEnergy(packet: EnergyPacket): void;
    dissipateHeat(): number;
}

export enum TrophicLevel {
    PRIMARY_PRODUCER = 1, // Autotrophs (Solar conversion)
    PRIMARY_CONSUMER = 2, // Herbivores
    SECONDARY_CONSUMER = 3, // Carnivores / Omnivores
    APEX_PREDATOR = 4,    // Tertiary / Apex
    DECOMPOSER = 5        // Detritivores
}
```

### 2.2 Class Additions

```typescript
import { Monad } from '../utils/monads'; // Assuming functional state containers

export class TrophicEdge {
    constructor(
        public readonly predatorId: string,
        public readonly preyId: string,
        public efficiencyRate: number // Default 0.10 (Lindeman's 10% Rule)
    ) {}

    public transfer(preyNode: TrophicNode, predatorNode: TrophicNode): void {
        const availableEnergy = preyNode.biomassJoules;
        const transferredEnergy = availableEnergy * this.efficiencyRate;
        const metabolicLoss = availableEnergy - transferredEnergy;

        // Execute state mutation via Monad stock transition
        preyNode.biomassJoules -= availableEnergy;
        predatorNode.absorbEnergy({
            joules: transferredEnergy,
            sourceNodeId: preyNode.id,
            timestamp: Date.now()
        });
    }
}

export class DirectedAcyclicTrophicGraph {
    private nodes: Map<string, TrophicNode> = new Map();
    private edges: TrophicEdge[] = [];

    public addNode(node: TrophicNode): void {
        if (this.nodes.has(node.id)) {
            throw new Error(`Node ${node.id} already exists in Trophic Graph.`);
        }
        this.nodes.set(node.id, node);
    }

    public addEdge(edge: TrophicEdge): void {
        // Validate Directed Acyclic property to prevent infinite loops of energy
        this.validateAcyclic(edge.predatorId, edge.preyId);
        this.edges.push(edge);
    }

    private validateAcyclic(predatorId: string, preyId: string): void {
        // Simple cycle detection implementation placeholder
        if (predatorId === preyId) {
            throw new Error('Cyclic trophic dependencies are prohibited by thermodynamic laws.');
        }
    }

    public stepEcosystemTick(): void {
        // 1. Process metabolic heat loss across all nodes
        for (const node of this.nodes.values()) {
            node.dissipateHeat();
        }

        // 2. Execute energy transfer matrices along edges
        for (const edge of this.edges) {
            const predator = this.nodes.get(edge.predatorId);
            const prey = this.nodes.get(edge.preyId);
            if (predator && prey) {
                edge.transfer(prey, predator);
            }
        }
    }
}
```

---

## 3. Monad Stock Transitions

To maintain strict immutability and state traceability in compliance with Earth Pod architecture, energy states are wrapped in a `TrophicStateMonad`. 

```typescript
export class TrophicStateMonad<T> {
    private constructor(private value: T) {}

    public static unit<T>(val: T): TrophicStateMonad<T> {
        return new TrophicStateMonad(val);
    }

    public bind<U>(fn: (val: T) => TrophicStateMonad<U>): TrophicStateMonad<U> {
        return fn(this.value);
    }

    public inspect(): T {
        return this.value;
    }
}
```

Energy balance per node per tick follows the invariant:
$$\Delta \text{Biomass} = \text{Solar Input} - \text{Metabolic Heat} - \text{Egested Waste} \pm \text{Trophic Transfers}$$

---

## 4. Verification and Testing Plan
1. **Unit Tests:** Verify that no energy is created when executing `DirectedAcyclicTrophicGraph.stepEcosystemTick()`.
2. **Lindeman Efficiency Validation:** Assert that secondary consumers receive strictly $\le 15\%$ of primary producer biomass, matching historical ecological data.
3. **Cycle Rejection:** Ensure attempts to instantiate self-feeding or circular trophic loops throw structural validation errors.