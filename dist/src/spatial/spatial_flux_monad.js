/**
 * src/spatial/spatial_flux_monad.ts
 * Conservative spatial advection and diffusion across verified conjugate cell boundaries.
 */
import { areCartesianUnitVectorsEqual3D, DEFAULT_ANGULAR_EPSILON } from './h3_adjacency.js';
export class SpatialFluxMonad {
    cellStocks;
    static R_GAS = 8.314462618; // J / (mol K)
    static MOLAR_HEAT_CAP_H2O = 75.38; // J / (mol K)
    static DIFF_COEFF_SOLUTE = 1.0e-9; // m^2 / s
    static THERMAL_COND_COEFF = 0.6; // W / (m K)
    constructor(cellStocks) {
        this.cellStocks = cellStocks;
    }
    totalSystemMass() {
        let h2o = 0;
        let carbon = 0;
        let oxygen = 0;
        let minerals = 0;
        if (this.cellStocks) {
            for (const stock of Object.values(this.cellStocks)) {
                h2o += stock.massH2O ?? 0;
                carbon += stock.massCarbon ?? 0;
                oxygen += stock.massOxygen ?? 0;
                minerals += stock.massMinerals ?? 0;
            }
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        if (!this.cellStocks)
            return;
        const stockA = this.cellStocks[delta.cellA];
        const stockB = this.cellStocks[delta.cellB];
        if (stockA && delta.deltaStockA) {
            stockA.massH2O += delta.deltaStockA.massH2O ?? 0;
            stockA.massCarbon += delta.deltaStockA.massCarbon ?? 0;
            stockA.massOxygen += delta.deltaStockA.massOxygen ?? 0;
            stockA.massMinerals += delta.deltaStockA.massMinerals ?? 0;
            stockA.energyJoules += delta.deltaStockA.energyJoules ?? 0;
        }
        if (stockB && delta.deltaStockB) {
            stockB.massH2O += delta.deltaStockB.massH2O ?? 0;
            stockB.massCarbon += delta.deltaStockB.massCarbon ?? 0;
            stockB.massOxygen += delta.deltaStockB.massOxygen ?? 0;
            stockB.massMinerals += delta.deltaStockB.massMinerals ?? 0;
            stockB.energyJoules += delta.deltaStockB.energyJoules ?? 0;
        }
    }
    /**
     * Verifies mutual conjugacy between cell edge facets using angular tolerance.
     * Tests: originV1 == neighborV2 AND originV2 == neighborV1
     */
    static verifyFacetConjugacy(facet, epsilon = DEFAULT_ANGULAR_EPSILON) {
        const forwardMatch = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2, epsilon) &&
            areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1, epsilon);
        return forwardMatch;
    }
    /**
     * Computes conservative mass and energy transfer across a verified interface.
     * Enforces exact skew-symmetry: deltaOrigin + deltaNeighbor == 0.
     */
    static computeFacetTransfer(origin, neighbor, facet, deltaTimeSeconds, epsilon = DEFAULT_ANGULAR_EPSILON) {
        const isConjugate = this.verifyFacetConjugacy(facet, epsilon);
        const zeroDelta = {
            deltaCarbonMol: 0,
            deltaNitrogenMol: 0,
            deltaPhosphorusMol: 0,
            deltaWaterMol: 0,
            deltaOxygenMol: 0,
            deltaThermalEnergyJoules: 0,
        };
        if (!isConjugate) {
            return {
                isValidConjugate: false,
                originDelta: zeroDelta,
                neighborDelta: zeroDelta,
                entropyProductionJPerK: 0,
            };
        }
        // Concentrations in mol / m^3
        const cOrigin = {
            C: origin.carbonMol / origin.volumeM3,
            N: origin.nitrogenMol / origin.volumeM3,
            P: origin.phosphorusMol / origin.volumeM3,
            H2O: origin.waterMol / origin.volumeM3,
            O2: origin.oxygenMol / origin.volumeM3,
        };
        const cNeighbor = {
            C: neighbor.carbonMol / neighbor.volumeM3,
            N: neighbor.nitrogenMol / neighbor.volumeM3,
            P: neighbor.phosphorusMol / neighbor.volumeM3,
            H2O: neighbor.waterMol / neighbor.volumeM3,
            O2: neighbor.oxygenMol / neighbor.volumeM3,
        };
        // Temperatures in K (approximated from water molar heat capacity)
        const tOrigin = Math.max(1.0, origin.thermalEnergyJoules / (Math.max(1.0, origin.waterMol) * this.MOLAR_HEAT_CAP_H2O));
        const tNeighbor = Math.max(1.0, neighbor.thermalEnergyJoules / (Math.max(1.0, neighbor.waterMol) * this.MOLAR_HEAT_CAP_H2O));
        const volumetricFlowRate = facet.normalVelocityMs * facet.areaM2; // m^3 / s
        // 1. Advective transfer (Upwind scheme)
        const computeAdvection = (cO, cN) => {
            const concentration = volumetricFlowRate >= 0 ? cO : cN;
            return concentration * volumetricFlowRate * deltaTimeSeconds;
        };
        const advC = computeAdvection(cOrigin.C, cNeighbor.C);
        const advN = computeAdvection(cOrigin.N, cNeighbor.N);
        const advP = computeAdvection(cOrigin.P, cNeighbor.P);
        const advH2O = computeAdvection(cOrigin.H2O, cNeighbor.H2O);
        const advO2 = computeAdvection(cOrigin.O2, cNeighbor.O2);
        const heatVolOrigin = origin.thermalEnergyJoules / origin.volumeM3;
        const heatVolNeighbor = neighbor.thermalEnergyJoules / neighbor.volumeM3;
        const advThermal = (volumetricFlowRate >= 0 ? heatVolOrigin : heatVolNeighbor) *
            volumetricFlowRate *
            deltaTimeSeconds;
        // 2. Diffusive transfer (Fick's Law)
        const diffAreaDist = (facet.areaM2 / Math.max(1.0, facet.distanceM)) * deltaTimeSeconds;
        const diffC = this.DIFF_COEFF_SOLUTE * (cOrigin.C - cNeighbor.C) * diffAreaDist;
        const diffN = this.DIFF_COEFF_SOLUTE * (cOrigin.N - cNeighbor.N) * diffAreaDist;
        const diffP = this.DIFF_COEFF_SOLUTE * (cOrigin.P - cNeighbor.P) * diffAreaDist;
        const diffH2O = this.DIFF_COEFF_SOLUTE * (cOrigin.H2O - cNeighbor.H2O) * diffAreaDist;
        const diffO2 = this.DIFF_COEFF_SOLUTE * (cOrigin.O2 - cNeighbor.O2) * diffAreaDist;
        // 3. Thermal Conduction (Fourier's Law)
        const condThermal = this.THERMAL_COND_COEFF * (tOrigin - tNeighbor) * diffAreaDist;
        // Total transfers from origin -> neighbor
        const transferC = advC + diffC;
        const transferN = advN + diffN;
        const transferP = advP + diffP;
        const transferH2O = advH2O + diffH2O;
        const transferO2 = advO2 + diffO2;
        const transferThermal = advThermal + condThermal;
        // Dissipation / Entropy production (Diffusive + Conductive components)
        let sDiff = 0;
        const species = [
            [diffC, cOrigin.C, cNeighbor.C],
            [diffN, cOrigin.N, cNeighbor.N],
            [diffP, cOrigin.P, cNeighbor.P],
            [diffH2O, cOrigin.H2O, cNeighbor.H2O],
            [diffO2, cOrigin.O2, cNeighbor.O2],
        ];
        for (const [flux, co, cn] of species) {
            if (co > 1e-12 && cn > 1e-12) {
                sDiff += flux * this.R_GAS * Math.log(co / cn);
            }
        }
        const sCond = condThermal * (1.0 / tNeighbor - 1.0 / tOrigin);
        const totalEntropyProduction = Math.max(0, sDiff + sCond);
        const originDelta = {
            deltaCarbonMol: -transferC,
            deltaNitrogenMol: -transferN,
            deltaPhosphorusMol: -transferP,
            deltaWaterMol: -transferH2O,
            deltaOxygenMol: -transferO2,
            deltaThermalEnergyJoules: -transferThermal,
        };
        const neighborDelta = {
            deltaCarbonMol: transferC,
            deltaNitrogenMol: transferN,
            deltaPhosphorusMol: transferP,
            deltaWaterMol: transferH2O,
            deltaOxygenMol: transferO2,
            deltaThermalEnergyJoules: transferThermal,
        };
        return {
            isValidConjugate: true,
            originDelta,
            neighborDelta,
            entropyProductionJPerK: totalEntropyProduction,
        };
    }
}
