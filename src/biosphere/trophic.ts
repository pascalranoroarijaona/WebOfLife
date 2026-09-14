import { EarthPOD } from '../earth_pod.js';

export enum TrophicLevel {
    PRIMARY_PRODUCER = 1, // Autotrophs (Solar conversion)
    PRIMARY_CONSUMER = 2, // Herbivores
    SECONDARY_CONSUMER = 3, // Carnivores / Omnivores
    APEX_PREDATOR = 4,    // Tertiary / Apex
    DECOMPOSER = 5        // Detritivores
}

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

export class DefaultTrophicNode implements TrophicNode {
    constructor(
        public id: string,
        public name: string,
        public level: TrophicLevel,
        public biomassJoules: number,
        public metabolicRate: number = 0.05
    ) {}

    public absorbEnergy(packet: EnergyPacket): void {
        this.biomassJoules += packet.joules;
    }

    public dissipateHeat(): number {
        const heat = this.biomassJoules * this.metabolicRate;
        this.biomassJoules = Math.max(0, this.biomassJoules - heat);
        return heat;
    }
}

export class TrophicEdge {
    constructor(
        public readonly predatorId: string,
        public readonly preyId: string,
        public efficiencyRate: number = 0.10 // Default 0.10 (Lindeman's 10% Rule)
    ) {
        if (efficiencyRate < 0.01 || efficiencyRate > 0.15) {
            throw new Error(`Lindeman efficiency rate ${efficiencyRate} must be between 0.01 and 0.15.`);
        }
    }

    public transfer(preyNode: TrophicNode, predatorNode: TrophicNode): void {
        const availableEnergy = preyNode.biomassJoules;
        const transferredEnergy = availableEnergy * this.efficiencyRate;
        const metabolicLoss = availableEnergy - transferredEnergy;

        // Execute state mutation via stock transition
        preyNode.biomassJoules -= availableEnergy;
        predatorNode.absorbEnergy({
            joules: transferredEnergy,
            sourceNodeId: preyNode.id,
            timestamp: Date.now()
        });
    }
}

export interface EcosystemGraphState {
    nodes: Map<string, TrophicNode>;
    edges: TrophicEdge[];
    totalSystemJoules: number;
    dissipatedHeatJoules: number;
}

export class TrophicStateMonad<T> {
    private constructor(private value: T) {}

    public static unit<T>(val: T): TrophicStateMonad<T> {
        return new TrophicStateMonad(val);
    }

    public bind<U>(fn: (val: T) => TrophicStateMonad<U>): TrophicStateMonad<U> {
        return fn(this.value);
    }

    public map<U>(fn: (val: T) => U): TrophicStateMonad<U> {
        return new TrophicStateMonad(fn(this.value));
    }

    public inspect(): T {
        return this.value;
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
        this.validateAcyclic(edge.predatorId, edge.preyId);
        this.edges.push(edge);
    }

    private validateAcyclic(predatorId: string, preyId: string): void {
        if (predatorId === preyId) {
            throw new Error('Cyclic trophic dependencies are prohibited by thermodynamic laws.');
        }

        // Depth-First Search for cycle detection
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        // Build temporary adjacency list including the new edge
        const adj = new Map<string, string[]>();
        for (const nId of this.nodes.keys()) {
            adj.set(nId, []);
        }
        for (const e of this.edges) {
            const list = adj.get(e.preyId) || [];
            list.push(e.predatorId);
            adj.set(e.preyId, list);
        }
        const newEdgeList = adj.get(preyId) || [];
        newEdgeList.push(predatorId);
        adj.set(preyId, newEdgeList);

        const hasCycle = (nodeId: string): boolean => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const neighbors = adj.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycle(neighbor)) return true;
                } else if (recursionStack.has(neighbor)) {
                    return true;
                }
            }
            recursionStack.delete(nodeId);
            return false;
        };

        for (const nodeKey of this.nodes.keys()) {
            if (!visited.has(nodeKey)) {
                if (hasCycle(nodeKey)) {
                    throw new Error('Cyclic trophic dependencies are prohibited by thermodynamic laws.');
                }
            }
        }
    }

    public stepEcosystemTick(): void {
        const state: EcosystemGraphState = {
            nodes: this.nodes,
            edges: this.edges,
            totalSystemJoules: this.getTotalBiomass(),
            dissipatedHeatJoules: 0
        };

        const finalStateMonad = stepEcosystemMonad(state);
        finalStateMonad.inspect();
    }

    public getNodes(): Map<string, TrophicNode> {
        return this.nodes;
    }

    public getEdges(): TrophicEdge[] {
        return this.edges;
    }

    public getTotalBiomass(): number {
        let total = 0;
        for (const node of this.nodes.values()) {
            total += node.biomassJoules;
        }
        return total;
    }
}

export function executeTrophicTransfer(
    state: EcosystemGraphState,
    edge: TrophicEdge
): TrophicStateMonad<EcosystemGraphState> {
    const preyNode = state.nodes.get(edge.preyId);
    const predatorNode = state.nodes.get(edge.predatorId);

    if (!preyNode || !predatorNode) {
        return TrophicStateMonad.unit(state);
    }

    const availableEnergy = preyNode.biomassJoules;
    const transferredEnergy = availableEnergy * edge.efficiencyRate;
    const metabolicHeat = availableEnergy - transferredEnergy;

    preyNode.biomassJoules -= availableEnergy;
    predatorNode.absorbEnergy({
        joules: transferredEnergy,
        sourceNodeId: preyNode.id,
        timestamp: Date.now()
    });

    state.dissipatedHeatJoules += metabolicHeat;

    return TrophicStateMonad.unit(state);
}

export function stepEcosystemMonad(state: EcosystemGraphState): TrophicStateMonad<EcosystemGraphState> {
    return TrophicStateMonad.unit(state)
        .map((currState) => {
            for (const node of currState.nodes.values()) {
                const heat = node.dissipateHeat();
                currState.dissipatedHeatJoules += heat;
            }
            return currState;
        })
        .bind((currState) => {
            let updatedState = currState;
            for (const edge of updatedState.edges) {
                const resultMonad = executeTrophicTransfer(updatedState, edge);
                updatedState = resultMonad.inspect();
            }
            return TrophicStateMonad.unit(updatedState);
        });
}