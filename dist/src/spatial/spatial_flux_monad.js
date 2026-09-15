import { computeEdgeCartesianMetrics, evaluateInterfacialTransferMonad } from './h3_adjacency.js';
export { computeEdgeCartesianMetrics, evaluateInterfacialTransferMonad };
/**
 * Spatial flux monad orchestrating finite-volume interfacial stock transfers.
 */
export class SpatialFluxMonad {
    stocks = new Map();
    constructor(initialStocks) {
        if (initialStocks) {
            for (const [id, stock] of Object.entries(initialStocks)) {
                this.setStock(id, stock);
            }
        }
    }
    setStock(cellId, stock) {
        this.stocks.set(cellId, { ...stock });
    }
    getStock(cellId) {
        const s = this.stocks.get(cellId);
        return s ? { ...s } : undefined;
    }
    /**
     * Applies an interfacial transfer delta adhering to First Law conservation.
     */
    applyInterfacialTransfer(delta) {
        const donor = this.stocks.get(delta.donorCell);
        const receiver = this.stocks.get(delta.receiverCell);
        if (!donor || !receiver) {
            throw new Error(`Missing stock state for donor ${delta.donorCell} or receiver ${delta.receiverCell}`);
        }
        // Mass conservation: donor loss = receiver gain
        donor.massH2O -= delta.deltaH2O;
        receiver.massH2O += delta.deltaH2O;
        donor.massCarbon -= delta.deltaCarbon;
        receiver.massCarbon += delta.deltaCarbon;
        donor.massOxygen -= delta.deltaOxygen;
        receiver.massOxygen += delta.deltaOxygen;
        donor.massMinerals -= delta.deltaMinerals;
        receiver.massMinerals += delta.deltaMinerals;
        // Energy update
        donor.energyJoules -= Math.abs(delta.deltaEnergy);
        receiver.energyJoules += Math.abs(delta.deltaEnergy);
    }
    /**
     * Total system mass across all monitored cells for invariant verification.
     */
    totalSystemMass() {
        let h2o = 0;
        let carbon = 0;
        let oxygen = 0;
        let minerals = 0;
        for (const s of this.stocks.values()) {
            h2o += s.massH2O;
            carbon += s.massCarbon;
            oxygen += s.massOxygen;
            minerals += s.massMinerals;
        }
        return { h2o, carbon, oxygen, minerals };
    }
}
