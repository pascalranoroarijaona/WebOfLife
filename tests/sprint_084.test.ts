import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  H3DirectionBitmask,
  H3DirectionIndex,
  DirectionBitmask,
  DirectionalFluxOperator,
  CellStockTensor,
  DirectionalGeometry,
} from '../src/spatial/h3_types.js';

describe('Sprint 084 - RFC-084: H3 Direction Bitmask Specification & Directional Adjacency', () => {

  it('verifies bitwise disjointness and completeness of all 6 directional constants', () => {
    assert.strictEqual(H3DirectionBitmask.DIRECTION_0, 1 << 0);
    assert.strictEqual(H3DirectionBitmask.DIRECTION_1, 1 << 1);
    assert.strictEqual(H3DirectionBitmask.DIRECTION_2, 1 << 2);
    assert.strictEqual(H3DirectionBitmask.DIRECTION_3, 1 << 3);
    assert.strictEqual(H3DirectionBitmask.DIRECTION_4, 1 << 4);
    assert.strictEqual(H3DirectionBitmask.DIRECTION_5, 1 << 5);

    assert.strictEqual(H3DirectionBitmask.NONE, 0);
    assert.strictEqual(H3DirectionBitmask.ALL, 63);

    const orSum =
      H3DirectionBitmask.DIRECTION_0 |
      H3DirectionBitmask.DIRECTION_1 |
      H3DirectionBitmask.DIRECTION_2 |
      H3DirectionBitmask.DIRECTION_3 |
      H3DirectionBitmask.DIRECTION_4 |
      H3DirectionBitmask.DIRECTION_5;

    assert.strictEqual(orSum, H3DirectionBitmask.ALL);
    assert.strictEqual(orSum, 0x3f);
  });

  it('verifies BY_INDEX mapping matches power-of-two direction flags', () => {
    assert.strictEqual(H3DirectionBitmask.BY_INDEX.length, 6);
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(H3DirectionBitmask.BY_INDEX[i], 1 << i);
    }
  });

  it('tests hasDirection query functionality across single and combined bitmasks', () => {
    const mask0: DirectionBitmask = H3DirectionBitmask.DIRECTION_0;
    assert.strictEqual(H3DirectionBitmask.hasDirection(mask0, 0), true);
    assert.strictEqual(H3DirectionBitmask.hasDirection(mask0, 1), false);
    assert.strictEqual(H3DirectionBitmask.hasDirection(mask0, 2), false);

    const multiMask: DirectionBitmask =
      H3DirectionBitmask.DIRECTION_1 | H3DirectionBitmask.DIRECTION_4;
    assert.strictEqual(H3DirectionBitmask.hasDirection(multiMask, 0), false);
    assert.strictEqual(H3DirectionBitmask.hasDirection(multiMask, 1), true);
    assert.strictEqual(H3DirectionBitmask.hasDirection(multiMask, 2), false);
    assert.strictEqual(H3DirectionBitmask.hasDirection(multiMask, 3), false);
    assert.strictEqual(H3DirectionBitmask.hasDirection(multiMask, 4), true);
    assert.strictEqual(H3DirectionBitmask.hasDirection(multiMask, 5), false);

    assert.strictEqual(H3DirectionBitmask.hasDirection(H3DirectionBitmask.NONE, 0), false);
    assert.strictEqual(H3DirectionBitmask.hasDirection(H3DirectionBitmask.ALL, 3), true);
  });

  it('tests setDirection and clearDirection idempotent mutations', () => {
    let mask: DirectionBitmask = H3DirectionBitmask.NONE;

    // Set direction 2
    mask = H3DirectionBitmask.setDirection(mask, 2);
    assert.strictEqual(mask, H3DirectionBitmask.DIRECTION_2);
    assert.strictEqual(H3DirectionBitmask.hasDirection(mask, 2), true);

    // Idempotent set
    mask = H3DirectionBitmask.setDirection(mask, 2);
    assert.strictEqual(mask, H3DirectionBitmask.DIRECTION_2);

    // Set direction 5
    mask = H3DirectionBitmask.setDirection(mask, 5);
    assert.strictEqual(
      mask,
      H3DirectionBitmask.DIRECTION_2 | H3DirectionBitmask.DIRECTION_5
    );

    // Clear direction 2
    mask = H3DirectionBitmask.clearDirection(mask, 2);
    assert.strictEqual(mask, H3DirectionBitmask.DIRECTION_5);
    assert.strictEqual(H3DirectionBitmask.hasDirection(mask, 2), false);

    // Idempotent clear
    mask = H3DirectionBitmask.clearDirection(mask, 2);
    assert.strictEqual(mask, H3DirectionBitmask.DIRECTION_5);

    // Clear direction 5
    mask = H3DirectionBitmask.clearDirection(mask, 5);
    assert.strictEqual(mask, H3DirectionBitmask.NONE);
  });

  it('tests hexagonal symmetry and opposite direction calculation', () => {
    const expectedOpposites: Record<H3DirectionIndex, H3DirectionIndex> = {
      0: 3,
      1: 4,
      2: 5,
      3: 0,
      4: 1,
      5: 2,
    };

    for (let d = 0; d < 6; d++) {
      const dir = d as H3DirectionIndex;
      const opp = H3DirectionBitmask.oppositeDirection(dir);
      assert.strictEqual(opp, expectedOpposites[dir]);
      // Double opposition must return to the original direction
      assert.strictEqual(H3DirectionBitmask.oppositeDirection(opp), dir);
    }
  });

  it('tests reciprocal bitmask inversion with invertMask', () => {
    // Invert single direction
    const maskDir0 = H3DirectionBitmask.DIRECTION_0;
    const inv0 = H3DirectionBitmask.invertMask(maskDir0);
    assert.strictEqual(inv0, H3DirectionBitmask.DIRECTION_3);

    const maskDir1_4 = H3DirectionBitmask.DIRECTION_1 | H3DirectionBitmask.DIRECTION_4;
    const inv1_4 = H3DirectionBitmask.invertMask(maskDir1_4);
    assert.strictEqual(
      inv1_4,
      H3DirectionBitmask.DIRECTION_4 | H3DirectionBitmask.DIRECTION_1
    );

    // Invert ALL gives ALL
    assert.strictEqual(
      H3DirectionBitmask.invertMask(H3DirectionBitmask.ALL),
      H3DirectionBitmask.ALL
    );

    // Invert NONE gives NONE
    assert.strictEqual(
      H3DirectionBitmask.invertMask(H3DirectionBitmask.NONE),
      H3DirectionBitmask.NONE
    );

    // Double inversion is identity for all 64 bitmask combinations
    for (let m = 0; m < 64; m++) {
      assert.strictEqual(
        H3DirectionBitmask.invertMask(H3DirectionBitmask.invertMask(m)),
        m
      );
    }
  });

  it('evaluates directional channel permeability gating with DirectionalFluxOperator', () => {
    // Both sides open
    const srcMask = H3DirectionBitmask.DIRECTION_1; // opens dir 1
    const tgtMask = H3DirectionBitmask.DIRECTION_4; // opens dir 4 (opposite of 1)
    assert.strictEqual(
      DirectionalFluxOperator.isChannelPermeable(srcMask, tgtMask, 1),
      true
    );

    // Source open, target blocked
    const tgtBlocked = H3DirectionBitmask.DIRECTION_0;
    assert.strictEqual(
      DirectionalFluxOperator.isChannelPermeable(srcMask, tgtBlocked, 1),
      false
    );

    // Source blocked, target open
    assert.strictEqual(
      DirectionalFluxOperator.isChannelPermeable(H3DirectionBitmask.NONE, tgtMask, 1),
      false
    );

    // Both fully open
    assert.strictEqual(
      DirectionalFluxOperator.isChannelPermeable(
        H3DirectionBitmask.ALL,
        H3DirectionBitmask.ALL,
        0
      ),
      true
    );
  });

  it('verifies conservative thermodynamic edge transfer when impermeable vs permeable', () => {
    const stateI: CellStockTensor = {
      waterKg: 1000,
      carbonKg: 50,
      mineralsKg: 10,
      oxygenKg: 20,
      internalEnergyJoules: 4.184e6,
      volumeM3: 100,
      temperatureKelvin: 298.15,
    };

    const stateJ: CellStockTensor = {
      waterKg: 800,
      carbonKg: 40,
      mineralsKg: 8,
      oxygenKg: 16,
      internalEnergyJoules: 3.5e6,
      volumeM3: 100,
      temperatureKelvin: 295.15,
    };

    const geometry: DirectionalGeometry = {
      edgeLengthM: 1000,
      layerHeightM: 10,
      centroidDistanceM: 1732.05,
    };

    // 1. Blocked facet: must yield strictly 0 deltas
    const blockedTransfer = DirectionalFluxOperator.computeEdgeTransfer(
      stateI,
      stateJ,
      H3DirectionBitmask.NONE,
      H3DirectionBitmask.ALL,
      2, // direction 2
      1.5, // 1.5 m/s velocity
      0.01,
      0.6,
      geometry,
      60
    );

    assert.strictEqual(blockedTransfer.dWaterKg, 0);
    assert.strictEqual(blockedTransfer.dCarbonKg, 0);
    assert.strictEqual(blockedTransfer.dMineralsKg, 0);
    assert.strictEqual(blockedTransfer.dOxygenKg, 0);
    assert.strictEqual(blockedTransfer.dEnergyJoules, 0);

    // 2. Permeable facet: mutual channels open (dir 2 from source, dir 5 from target)
    const srcOpen = H3DirectionBitmask.DIRECTION_2;
    const tgtOpen = H3DirectionBitmask.DIRECTION_5;

    const permeableTransfer = DirectionalFluxOperator.computeEdgeTransfer(
      stateI,
      stateJ,
      srcOpen,
      tgtOpen,
      2,
      1.5,
      0.01,
      0.6,
      geometry,
      60
    );

    assert.ok(permeableTransfer.dWaterKg > 0, 'Advective positive water flux');
    assert.ok(permeableTransfer.dCarbonKg > 0, 'Advective positive carbon flux');
    assert.ok(permeableTransfer.dEnergyJoules > 0, 'Advective positive energy transfer');
  });
});