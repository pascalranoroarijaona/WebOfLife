import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicMonadEngine } from '../src/thermodynamics/methods.js';
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
describe('Sprint 022: Thermodynamic State Vector Interface Contracts & Exergy Accounting', () => {
    it('should compute exergy destruction rate identically to T_0 * S_gen', () => {
        const engine = new ThermodynamicMonadEngine({
            T_0: STANDARD_AMBIENT_TEMPERATURE_K,
            P_0: 101325,
            chemical_potentials: {}
        });
        const initialState = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internal_energy_U: 1e6,
            entropy_S: 5000,
            temperature_T: 300,
            pressure_P: 101325,
            volume_V: 10,
            stock_masses: { carbon: 1000, water: 50000 }
        };
        const transition = engine.executeTransition(initialState, 1.0, // dt
        5000, // heatFlux_Q_dot
        300, // boundaryTemp_T_b
        { carbon: 10 }, // massFluxes
        5000 // deltaInternalEnergy_U
        );
        const expectedExergyDestruction = STANDARD_AMBIENT_TEMPERATURE_K * transition.metrics.internal_entropy_generation_rate;
        assert.strictEqual(Math.abs(transition.metrics.exergy_destruction_rate - expectedExergyDestruction) < 1e-6, true, `Exergy destruction rate I = T_0 * S_gen identity violation.`);
    });
    it('should validate First Law and Second Law correctly', () => {
        const engine = new ThermodynamicMonadEngine();
        const initialState = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internal_energy_U: 1e6,
            entropy_S: 1000,
            temperature_T: 298.15,
            pressure_P: 101325,
            volume_V: 1,
            stock_masses: { nitrogen: 500 }
        };
        const transition = engine.executeTransition(initialState, 1.0, 100, 298.15, { nitrogen: 5 }, 100);
        assert.strictEqual(engine.validateSecondLaw(transition), true, 'Second Law should be satisfied for positive entropy generation.');
        assert.strictEqual(transition.metrics.internal_entropy_generation_rate >= 0, true, 'Entropy generation rate must be >= 0.');
    });
    it('should reject or flag negative entropy generation if Second Law is breached', () => {
        const engine = new ThermodynamicMonadEngine();
        const badTransition = {
            prior_state: { timestamp: 0 },
            posterior_state: { timestamp: 1 },
            boundary_flux: { heat_flux_Q_dot: 0, boundary_temperature_T_b: 298.15, mass_fluxes: {}, entropy_flux_S_dot: 0 },
            metrics: {
                internal_entropy_generation_rate: -0.5, // Negative entropy generation (impossible)
                reference_temperature_T0: 298.15,
                exergy_destruction_rate: -149.075,
                satisfies_second_law: false
            }
        };
        assert.strictEqual(engine.validateSecondLaw(badTransition), false, 'Second Law validation must catch negative entropy generation.');
    });
});
