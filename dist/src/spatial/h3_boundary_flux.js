/**
 * =============================================================================
 * WEB OF LIFE - SPATIAL MONAD BOUNDARY FLUX ENGINE
 * Methods Spec: Discrete Hexagonal Boundary Fluxes & Interface Transport
 * =============================================================================
 */
/**
 * Evaluates discrete conservation fluxes across an H3 cell boundary interface.
 */
export function computeCellInterfaceFluxes(origin, neighbor, metrics, dispersionCoeffM2S = 1e-4) {
    const GRAVITY = 9.80665;
    const RHO_WATER = 1000.0; // kg/m^3
    const CP_WATER = 4184.0; // J/(kg*K)
    const T_REF_K = 273.15;
    // 1. Piezometric hydraulic velocity (m/s)
    const dh = metrics.elevationGradientM + metrics.pressureDeltaPa / (RHO_WATER * GRAVITY);
    const hydraulicGrad = dh / Math.max(metrics.interCellDistanceM, 1e-3);
    const velocityMs = -metrics.advectiveTransmissivity * metrics.hydraulicConductivity * hydraulicGrad;
    // 2. Volumetric and Mass Water Flux (kg/s)
    const volFluxM3S = velocityMs * metrics.effectiveCrossSectionM2;
    const waterMassFluxKgS = volFluxM3S * RHO_WATER;
    // Upwind concentration selection
    const isOutflow = waterMassFluxKgS >= 0;
    const originVol = Math.max(origin.columnVolumeM3, 1e-6);
    const neighborVol = Math.max(neighbor.columnVolumeM3, 1e-6);
    const cDocOrigin = origin.docMassKg / originVol;
    const cDocNeighbor = neighbor.docMassKg / neighborVol;
    const cDocDonor = isOutflow ? cDocOrigin : cDocNeighbor;
    const cPocOrigin = origin.pocMassKg / originVol;
    const cPocNeighbor = neighbor.pocMassKg / neighborVol;
    const cPocDonor = isOutflow ? cPocOrigin : cPocNeighbor;
    const cNOrigin = origin.nitrogenMassKg / originVol;
    const cNNeighbor = neighbor.nitrogenMassKg / neighborVol;
    const cNDonor = isOutflow ? cNOrigin : cNNeighbor;
    const cPOrigin = origin.phosphorusMassKg / originVol;
    const cPNeighbor = neighbor.phosphorusMassKg / neighborVol;
    const cPDonor = isOutflow ? cPOrigin : cPNeighbor;
    const cDoOrigin = origin.dissolvedOxygenKg / originVol;
    const cDoNeighbor = neighbor.dissolvedOxygenKg / neighborVol;
    const cDoDonor = isOutflow ? cDoOrigin : cDoNeighbor;
    const dDistance = Math.max(metrics.interCellDistanceM, 1e-3);
    const area = metrics.effectiveCrossSectionM2;
    // 3. Solute Fluxes (Advection + Fickian Diffusion)
    const docFluxKgS = area * (velocityMs * cDocDonor - dispersionCoeffM2S * ((cDocNeighbor - cDocOrigin) / dDistance));
    const pocFluxKgS = area * (velocityMs * cPocDonor); // POC is non-diffusive particulate
    const nitrogenFluxKgS = area * (velocityMs * cNDonor - dispersionCoeffM2S * ((cNNeighbor - cNOrigin) / dDistance));
    const phosphorusFluxKgS = area * (velocityMs * cPDonor - dispersionCoeffM2S * ((cPNeighbor - cPOrigin) / dDistance));
    const dissolvedOxygenFluxKgS = area * (velocityMs * cDoDonor - dispersionCoeffM2S * ((cDoNeighbor - cDoOrigin) / dDistance));
    // 4. Energy Flux (Fourier Conduction + Sensible Heat Advection)
    const qCondWatts = -metrics.thermalConductance * area * ((neighbor.temperatureK - origin.temperatureK) / dDistance);
    const tDonor = isOutflow ? origin.temperatureK : neighbor.temperatureK;
    const qAdvWatts = waterMassFluxKgS * CP_WATER * (tDonor - T_REF_K);
    const energyFluxWatts = qCondWatts + qAdvWatts;
    // 5. Entropy production rate (W/K)
    const tMean = 0.5 * (origin.temperatureK + neighbor.temperatureK);
    const entropyProductionRateWK = Math.max(0, -qCondWatts * ((neighbor.temperatureK - origin.temperatureK) / (tMean * tMean)));
    return {
        originIndex: metrics.originIndex,
        neighborIndex: metrics.neighborIndex,
        waterMassFluxKgS,
        energyFluxWatts,
        docFluxKgS,
        pocFluxKgS,
        nitrogenFluxKgS,
        phosphorusFluxKgS,
        dissolvedOxygenFluxKgS,
        entropyProductionRateWK,
    };
}
/**
 * Accumulates boundary interface fluxes into net conservative state deltas for a cell.
 */
export function integrateInterfaceDeltas(cellIndex, fluxes, dtSeconds) {
    let deltaWaterMassKg = 0;
    let deltaInternalEnergyJ = 0;
    let deltaDocMassKg = 0;
    let deltaPocMassKg = 0;
    let deltaNitrogenMassKg = 0;
    let deltaPhosphorusMassKg = 0;
    let deltaDissolvedOxygenKg = 0;
    for (const flux of fluxes) {
        if (flux.originIndex === cellIndex) {
            // Outward flux reduces stock
            deltaWaterMassKg -= dtSeconds * flux.waterMassFluxKgS;
            deltaInternalEnergyJ -= dtSeconds * flux.energyFluxWatts;
            deltaDocMassKg -= dtSeconds * flux.docFluxKgS;
            deltaPocMassKg -= dtSeconds * flux.pocFluxKgS;
            deltaNitrogenMassKg -= dtSeconds * flux.nitrogenFluxKgS;
            deltaPhosphorusMassKg -= dtSeconds * flux.phosphorusFluxKgS;
            deltaDissolvedOxygenKg -= dtSeconds * flux.dissolvedOxygenFluxKgS;
        }
        else if (flux.neighborIndex === cellIndex) {
            // Inward flux from conjugate origin increases stock
            deltaWaterMassKg += dtSeconds * flux.waterMassFluxKgS;
            deltaInternalEnergyJ += dtSeconds * flux.energyFluxWatts;
            deltaDocMassKg += dtSeconds * flux.docFluxKgS;
            deltaPocMassKg += dtSeconds * flux.pocFluxKgS;
            deltaNitrogenMassKg += dtSeconds * flux.nitrogenFluxKgS;
            deltaPhosphorusMassKg += dtSeconds * flux.phosphorusFluxKgS;
            deltaDissolvedOxygenKg += dtSeconds * flux.dissolvedOxygenFluxKgS;
        }
    }
    return {
        cellIndex,
        deltaWaterMassKg,
        deltaInternalEnergyJ,
        deltaDocMassKg,
        deltaPocMassKg,
        deltaNitrogenMassKg,
        deltaPhosphorusMassKg,
        deltaDissolvedOxygenKg,
    };
}
