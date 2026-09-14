import { describe, it } from "node:test";
import assert from "node:assert";
import { CANONICAL_H3_REGEX, assertCanonicalH3Pattern, isValidCanonicalH3, getResolution, H3Grid, createSpatialMonad, SpatialGridError, H3ValidationError, } from "../src/spatial/h3_grid.js";
describe("Sprint 039 — Canonical H3 Regex Assertions & Error Topologies", () => {
    const validIndices = [
        "8828308281fffff", // Resolution 8
        "8a2a1072b59ffff", // Resolution 10
        "85283473fffffff", // Resolution 5
        "801fffffffffffff", // Resolution 0
        "8f28308281fffff", // Resolution 15
        "85283473FFFFFFF", // Uppercase valid hex
        "8A2A1072B59FFFF", // Mixed uppercase hex
    ];
    describe("1. Acceptance of Valid Canonical H3 Tokens", () => {
        it("should accept valid Mode-1 canonical 15-character H3 tokens across resolutions 0-15", () => {
            for (const token of validIndices) {
                assert.doesNotThrow(() => assertCanonicalH3Pattern(token), `Expected valid token '${token}' to pass pattern assertion`);
                assert.strictEqual(isValidCanonicalH3(token), true);
            }
        });
        it("should confirm CANONICAL_H3_REGEX exact pattern matches", () => {
            assert.ok(CANONICAL_H3_REGEX instanceof RegExp);
            assert.strictEqual(CANONICAL_H3_REGEX.test("8828308281fffff"), true);
            assert.strictEqual(CANONICAL_H3_REGEX.test("8a2a1072b59ffff"), true);
            assert.strictEqual(CANONICAL_H3_REGEX.test("85283473fffffff"), true);
        });
    });
    describe("2. Rejection of Syntactically Invalid Tokens", () => {
        const invalidLengthCases = [
            { token: "8828308281ffff", reason: "Underlength (14 chars)" },
            { token: "8828308281ffffff", reason: "Overlength (16 chars)" },
            { token: "8", reason: "Single character" },
            { token: "", reason: "Empty string" },
        ];
        it("should reject tokens with non-15 string length", () => {
            for (const { token, reason } of invalidLengthCases) {
                assert.throws(() => assertCanonicalH3Pattern(token), (err) => {
                    assert.ok(err instanceof H3ValidationError, `Expected H3ValidationError for ${reason}`);
                    assert.strictEqual(err.token, token);
                    return true;
                });
                assert.strictEqual(isValidCanonicalH3(token), false);
            }
        });
        const invalidHexCases = [
            { token: "8828308281fffgz", reason: "Contains non-hex 'g' and 'z'" },
            { token: "8828308281fff-!", reason: "Contains non-hex symbols" },
            { token: "8828308281fff_1", reason: "Contains underscore" },
        ];
        it("should reject tokens containing non-hexadecimal characters", () => {
            for (const { token, reason } of invalidHexCases) {
                assert.throws(() => assertCanonicalH3Pattern(token), (err) => {
                    assert.ok(err instanceof H3ValidationError, `Expected H3ValidationError for ${reason}`);
                    assert.strictEqual(err.token, token);
                    return true;
                });
                assert.strictEqual(isValidCanonicalH3(token), false);
            }
        });
        const invalidModeCases = [
            { token: "7828308281fffff", reason: "Leading nibble is 7" },
            { token: "9828308281fffff", reason: "Leading nibble is 9" },
            { token: "0828308281fffff", reason: "Leading nibble is 0" },
            { token: "a828308281fffff", reason: "Leading nibble is a" },
            { token: "f828308281fffff", reason: "Leading nibble is f" },
        ];
        it("should reject tokens without canonical leading mode-1 nibble ('8')", () => {
            for (const { token, reason } of invalidModeCases) {
                assert.throws(() => assertCanonicalH3Pattern(token), (err) => {
                    assert.ok(err instanceof H3ValidationError, `Expected H3ValidationError for ${reason}`);
                    assert.strictEqual(err.token, token);
                    return true;
                });
                assert.strictEqual(isValidCanonicalH3(token), false);
            }
        });
        const whitespaceCases = [
            " 8828308281fffff ",
            "8828308281fffff ",
            " 8828308281fffff",
            "8828308 281fffff",
        ];
        it("should reject tokens with leading, trailing, or internal whitespace", () => {
            for (const token of whitespaceCases) {
                assert.throws(() => assertCanonicalH3Pattern(token), (err) => {
                    assert.ok(err instanceof H3ValidationError);
                    assert.strictEqual(err.token, token);
                    return true;
                });
                assert.strictEqual(isValidCanonicalH3(token), false);
            }
        });
        it("should reject non-string inputs with H3ValidationError preserving raw input token", () => {
            const nonStringInputs = [null, undefined, 123456789012345, {}, [], true];
            for (const input of nonStringInputs) {
                assert.throws(() => assertCanonicalH3Pattern(input), (err) => {
                    assert.ok(err instanceof H3ValidationError);
                    assert.strictEqual(err.token, input);
                    assert.match(err.message, /Token must be a string/);
                    return true;
                });
                assert.strictEqual(isValidCanonicalH3(input), false);
            }
        });
    });
    describe("3. Error Subtyping and Topology Invariants", () => {
        it("should conform to Error -> SpatialGridError -> H3ValidationError inheritance chain", () => {
            try {
                assertCanonicalH3Pattern("corrupted_index");
                assert.fail("Should have thrown H3ValidationError");
            }
            catch (err) {
                assert.ok(err instanceof H3ValidationError);
                assert.ok(err instanceof SpatialGridError);
                assert.ok(err instanceof Error);
                assert.strictEqual(err.name, "H3ValidationError");
                assert.strictEqual(err.token, "corrupted_index");
                assert.match(err.message, /Invalid canonical H3 index token 'corrupted_index'/);
            }
        });
    });
    describe("4. H3Grid Operations & Resolution Parsing", () => {
        it("should extract resolution correctly from canonical tokens", () => {
            assert.strictEqual(getResolution("8828308281fffff"), 8);
            assert.strictEqual(getResolution("8a2a1072b59ffff"), 10);
            assert.strictEqual(getResolution("85283473fffffff"), 5);
            assert.strictEqual(getResolution("801fffffffffffff"), 0);
            assert.strictEqual(getResolution("8f28308281fffff"), 15);
            assert.strictEqual(H3Grid.getResolution("8828308281fffff"), 8);
        });
        it("should guard H3Grid.getNeighbors with assertCanonicalH3Pattern", () => {
            const neighbors = H3Grid.getNeighbors("8828308281fffff");
            assert.strictEqual(neighbors.length, 6);
            for (const n of neighbors) {
                assert.strictEqual(isValidCanonicalH3(n), true);
            }
            assert.throws(() => H3Grid.getNeighbors("invalid_token"), (err) => err instanceof H3ValidationError);
        });
        it("should guard H3Grid.kRing with assertCanonicalH3Pattern and radius bounds", () => {
            const ring0 = H3Grid.kRing("8828308281fffff", 0);
            assert.deepStrictEqual(ring0, ["8828308281fffff"]);
            const ring1 = H3Grid.kRing("8828308281fffff", 1);
            assert.ok(ring1.length > 1);
            assert.ok(ring1.includes("8828308281fffff"));
            assert.throws(() => H3Grid.kRing("8828308281fffff", -1), (err) => err instanceof SpatialGridError);
            assert.throws(() => H3Grid.kRing("invalid_token", 1), (err) => err instanceof H3ValidationError);
        });
    });
    describe("5. SpatialMonad Conservation Invariants", () => {
        const healthyStocks = {
            carbon: 1000.0,
            water: 500.0,
            nitrogen: 50.0,
            phosphorus: 10.0,
            oxygen: 200.0,
            thermalEnergy: 1e6,
        };
        it("should instantiate SpatialMonad with valid canonical index and stocks", () => {
            const monad = createSpatialMonad("8828308281FFFFF", healthyStocks);
            assert.strictEqual(monad.h3Index, "8828308281fffff"); // Normalized to lowercase
            assert.strictEqual(monad.resolution, 8);
            assert.strictEqual(monad.stocks.carbon, 1000.0);
        });
        it("should reject SpatialMonad instantiation when token violates canonical pattern", () => {
            assert.throws(() => createSpatialMonad("8828308281ffff", healthyStocks), (err) => err instanceof H3ValidationError);
        });
        it("should reject SpatialMonad with negative stock maintaining mass conservation", () => {
            const leakingStocks = {
                ...healthyStocks,
                carbon: -0.001,
            };
            assert.throws(() => createSpatialMonad("8828308281fffff", leakingStocks), (err) => {
                assert.ok(err instanceof SpatialGridError);
                assert.match(err.message, /Non-physical negative stock detected/);
                return true;
            });
        });
    });
});
