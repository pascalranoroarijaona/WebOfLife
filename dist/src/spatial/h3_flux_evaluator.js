import { validateH3CellInterfaceMetrics, } from './h3_types.js';
/**
 * H3InterfaceFluxEvaluator
 * Computes thermodynamic and biophysical transport across adjacent H3 cell boundaries.
 * Enforces First Law (zero-sum stock conservation) and Second Law (non-negative entropy generation).
 */
export class H3InterfaceFluxEvaluator {
    static RHO_WATER = 1000.0; // kg/m^3
    static GRAVITY = 9.80665; // m/s^2
    static CP_WATER = 4184.0; // J/(kg*K)
    /**
     * Computes zero-sum mass, heat, and solute transfers across the interface over duration deltaSeconds.
     */
    static computeInterfaceFlux(metrics, stateA, stateB, deltaSeconds) {
        validateH3CellInterfaceMetrics(metrics);
        if (deltaSeconds <= 0) {
            return {
                deltaStockA: {},
                deltaStockB: {},
                waterFluxKgS: 0,
                heatFluxWatts: 0,
                carbonFluxKgS: 0,
                entropyProductionRateWattsPerK: 0,
            };
        }
        // 1. Hydraulic Head Gradient (incorporating surface elevation + water depth)
        const headA = stateA.waterDepthMeters;
        const headB = metrics.elevationDeltaMeters + stateB.waterDepthMeters;
        const deltaHead = headA - headB; // positive head indicates flow A -> B
        const hydraulicGrad = deltaHead / metrics.centroidDistanceMeters;
        // Darcy overland / subsurface discharge rate
        const unconstrainedWaterM3S = metrics.hydraulicPermeability *
            (this.RHO_WATER * this.GRAVITY) *
            hydraulicGrad *
            metrics.crossSectionalAreaM2;
        // Clamp volumetric rate to boundary limit
        const waterFluxM3S = Math.max(-metrics.maxVolumetricFluxLimitM3S, Math.min(metrics.maxVolumetricFluxLimitM3S, unconstrainedWaterM3S));
        const waterFluxKgS = waterFluxM3S * this.RHO_WATER;
        const totalWaterTransferredKg = waterFluxKgS * deltaSeconds;
        // 2. Thermal Flux (Diffusive Conduction + Advective Fluid Transport)
        const tempDelta = stateA.temperatureKelvin - stateB.temperatureKelvin;
        const conductiveWatts = metrics.thermalConductance *
            (metrics.crossSectionalAreaM2 / metrics.centroidDistanceMeters) *
            tempDelta;
        const advectiveWatts = waterFluxKgS >= 0
            ? waterFluxKgS * this.CP_WATER * stateA.temperatureKelvin
            : waterFluxKgS * this.CP_WATER * stateB.temperatureKelvin;
        const heatFluxWatts = conductiveWatts + advectiveWatts;
        const totalHeatTransferredJoules = heatFluxWatts * deltaSeconds;
        // Second Law Entropy Generation Rate (pure conduction down gradient)
        const entropyRate = conductiveWatts !== 0 && stateA.temperatureKelvin > 0 && stateB.temperatureKelvin > 0
            ? conductiveWatts * (1.0 / stateB.temperatureKelvin - 1.0 / stateA.temperatureKelvin)
            : 0.0;
        // 3. Advective Carbon Solute Transfer
        const carbonConcA = stateA.carbonKg / Math.max(stateA.waterKg, 1.0);
        const carbonConcB = stateB.carbonKg / Math.max(stateB.waterKg, 1.0);
        const carbonFluxKgS = waterFluxKgS >= 0
            ? waterFluxKgS * carbonConcA
            : waterFluxKgS * carbonConcB;
        const totalCarbonKg = carbonFluxKgS * deltaSeconds;
        // Return exact zero-sum transfers adhering to First Law
        return {
            deltaStockA: {
                waterKg: -totalWaterTransferredKg,
                heatJoules: -totalHeatTransferredJoules,
                carbonKg: -totalCarbonKg,
            },
            deltaStockB: {
                waterKg: +totalWaterTransferredKg,
                heatJoules: +totalHeatTransferredJoules,
                carbonKg: +totalCarbonKg,
            },
            waterFluxKgS,
            heatFluxWatts,
            carbonFluxKgS,
            entropyProductionRateWattsPerK: Math.max(0.0, entropyRate),
        };
    }
    /**
     * Computes conservative ecological biomass dispersal across the corridor facet.
     */
    static computeBioticDispersal(metrics, biomassDensityA, biomassDensityB, dispersalMobility, cellAreaM2, deltaSeconds) {
        validateH3CellInterfaceMetrics(metrics);
        const slopeFactor = Math.max(0.0, Math.cos(metrics.slopeRadians));
        const geometricFactor = metrics.sharedEdgeLengthMeters / metrics.centroidDistanceMeters;
        const densityDelta = biomassDensityA - biomassDensityB;
        const fluxKgS = metrics.bioticPermeability *
            slopeFactor *
            geometricFactor *
            dispersalMobility *
            densityDelta;
        const transferredKg = fluxKgS * cellAreaM2 * deltaSeconds;
        return {
            fluxKgS,
            deltaBiomassA: -transferredKg,
            deltaBiomassB: +transferredKg,
        };
    }
}
