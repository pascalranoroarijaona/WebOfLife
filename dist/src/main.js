import { EarthPOD, bootstrapMegaPod, EntropyState } from './earth_pod.js';
console.log("🌍 WebOfLife Planetary Monad Engine Initializing...");
const { sun, earth } = bootstrapMegaPod();
console.log(`✅ ${earth.name} bootstrapped successfully with Stellar Monad ${sun.name}.`);
console.log(`Initial Planetary State: ${earth.entropyState}`);
let tickCount = 0;
const intervalId = setInterval(() => {
    tickCount++;
    const report = earth.fullTick(tickCount);
    if (tickCount % 5 === 0) {
        console.log(`[Tick ${tickCount}] State: ${earth.entropyState} | ` +
            `Total Biomass: ${earth.totalDescendantBiomass()} kg_equivalent_carbon`);
    }
    if (tickCount >= 20) {
        clearInterval(intervalId);
        console.log("🏁 Initial Engine Simulation Cycle Complete.");
    }
}, 300);
export { earth, sun, bootstrapMegaPod, EarthPOD, EntropyState };
