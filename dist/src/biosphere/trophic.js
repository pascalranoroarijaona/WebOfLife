export var TrophicLevel;
(function (TrophicLevel) {
    TrophicLevel[TrophicLevel["PRIMARY_PRODUCER"] = 1] = "PRIMARY_PRODUCER";
    TrophicLevel[TrophicLevel["PRIMARY_CONSUMER"] = 2] = "PRIMARY_CONSUMER";
    TrophicLevel[TrophicLevel["SECONDARY_CONSUMER"] = 3] = "SECONDARY_CONSUMER";
    TrophicLevel[TrophicLevel["APEX_PREDATOR"] = 4] = "APEX_PREDATOR";
    TrophicLevel[TrophicLevel["DECOMPOSER"] = 5] = "DECOMPOSER"; // Detritivores
})(TrophicLevel || (TrophicLevel = {}));
export class DefaultTrophicNode {
    id;
    name;
    level;
    biomassJoules;
    metabolicRate;
    constructor(id, name, level, biomassJoules, metabolicRate = 0.05) {
        this.id = id;
        this.name = name;
        this.level = level;
        this.biomassJoules = biomassJoules;
        this.metabolicRate = metabolicRate;
    }
    absorbEnergy(packet) {
        this.biomassJoules += packet.joules;
    }
    dissipateHeat() {
        const heat = this.biomassJoules * this.metabolicRate;
        this.biomassJoules = Math.max(0, this.biomassJoules - heat);
        return heat;
    }
}
export class TrophicEdge {
    predatorId;
    preyId;
    efficiencyRate;
    constructor(predatorId, preyId, efficiencyRate = 0.10 // Default 0.10 (Lindeman's 10% Rule)
    ) {
        this.predatorId = predatorId;
        this.preyId = preyId;
        this.efficiencyRate = efficiencyRate;
        if (efficiencyRate < 0.01 || efficiencyRate > 0.15) {
            throw new Error(`Lindeman efficiency rate ${efficiencyRate} must be between 0.01 and 0.15.`);
        }
    }
    transfer(preyNode, predatorNode) {
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
export class TrophicStateMonad {
    value;
    constructor(value) {
        this.value = value;
    }
    static unit(val) {
        return new TrophicStateMonad(val);
    }
    bind(fn) {
        return fn(this.value);
    }
    map(fn) {
        return new TrophicStateMonad(fn(this.value));
    }
    inspect() {
        return this.value;
    }
}
export class DirectedAcyclicTrophicGraph {
    nodes = new Map();
    edges = [];
    addNode(node) {
        if (this.nodes.has(node.id)) {
            throw new Error(`Node ${node.id} already exists in Trophic Graph.`);
        }
        this.nodes.set(node.id, node);
    }
    addEdge(edge) {
        this.validateAcyclic(edge.predatorId, edge.preyId);
        this.edges.push(edge);
    }
    validateAcyclic(predatorId, preyId) {
        if (predatorId === preyId) {
            throw new Error('Cyclic trophic dependencies are prohibited by thermodynamic laws.');
        }
        // Depth-First Search for cycle detection
        const visited = new Set();
        const recursionStack = new Set();
        // Build temporary adjacency list including the new edge
        const adj = new Map();
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
        const hasCycle = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            const neighbors = adj.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycle(neighbor))
                        return true;
                }
                else if (recursionStack.has(neighbor)) {
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
    stepEcosystemTick() {
        const state = {
            nodes: this.nodes,
            edges: this.edges,
            totalSystemJoules: this.getTotalBiomass(),
            dissipatedHeatJoules: 0
        };
        const finalStateMonad = stepEcosystemMonad(state);
        finalStateMonad.inspect();
    }
    getNodes() {
        return this.nodes;
    }
    getEdges() {
        return this.edges;
    }
    getTotalBiomass() {
        let total = 0;
        for (const node of this.nodes.values()) {
            total += node.biomassJoules;
        }
        return total;
    }
}
export function executeTrophicTransfer(state, edge) {
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
export function stepEcosystemMonad(state) {
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
