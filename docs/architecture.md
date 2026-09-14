# Architecture: The Monad / POD Model — Mega-POD Terrestre

This document describes the conceptual and technical model behind Web of Life, now unified under a single object hierarchy: the **Mega-POD Terrestre** — a complete object-oriented representation of Earth as one thermodynamic structure composed of nested thermodynamic structures.

## 0. The Unifying Principle

Every entity in the simulation — a biogeochemical cycle, a sphere (atmosphere, biosphere...), a biome, a species, an individual human, or Earth itself — is an instance of the same abstract root class: **`ThermodynamicStructure`**. What differs between them is not their nature but their *specific implementation* of three abstract methods:

```ts
importFreeEnergy(tick: number): number;
exportEntropy(tick: number): number;
maintainFarFromEquilibrium(tick: number): EntropyState;

```

A cycle regulates transfer between reservoirs. A species consumes and produces biomass. A human additionally measures, verifies, and denominates value. All of them, underneath, are the same kind of object: a structure that imports free energy, exports entropy, and either holds its stock far from equilibrium — or collapses.

---

## 1. The Monad

A monad is the atomic unit of the simulation — a single organism, a population treated as one node, a material reservoir, or a human individual. Every monad has three parts:

### Stocks

Quantities of matter or energy currently held by the monad, e.g.:

```ts
stocks: {
  carbon: 120,
  water: 40,
  oxygen: 0,
  biomass: 80,
  energy: 30
}

```

Stocks are conserved — they can only change through flows to or from other monads, never created or destroyed outright (except at the Sun, the system's one open boundary).

### Flows

Directional transfers of stock between two monads, carried by graph edges (relations). A flow has:

* a `type` (energy, food, matter, decomposition, predation, parasitism, mutualism, competition, habitat, pollination, mycorrhiza, seed dispersal, nitrogen fixation, engineering)


* a `rate` or `stockDelta`

* a `sourceId` and `targetId` monad



### Methods

Named, executable actions a monad can perform that trigger one or more flows. E.g. a tree's `photosynthesize()` method:

1. Decrements the $\text{CO}_2$ and water reservoirs.


2. Increments the tree's own biomass and oxygen stock.


3. Increments the oxygen reservoir.


4. Writes an entry to the global ledger.



Methods are exposed in the UI inspector as clickable buttons — clicking one calls the underlying method and mutates the live graph state.

---

## 2. The POD Hierarchy (Mega-POD Terrestre)

```
StellarMonad (Solar Layer)      — the one genuinely open system boundary
   │
EarthPOD (singleton)            — finite matter, open energy income
   │
   ├── SpherePOD[]              — atmosphere, hydrosphere, lithosphere, biosphere
   │      │
   │      └── CyclePOD[]        — carbon, nitrogen, phosphorus, water cycles
   │             (reservoirs + transfer rates BETWEEN spheres)
   │
   ├── BiomePOD[]               — forest, ocean, savanna, tundra, urban...
   │      │
   │      └── SpeciesPOD[]      — a species/population within a biome
   │             │
   │             └── IndividualMonad[] — Satoshi-style atomic nodes
   │                    (only instantiated in full for HumanNodePOD)
   │
   └── MaterialReservoir[]      — non-living matter stocks (water, carbon,
          nitrogen, minerals, oxygen) that species draw from and return to

```

Each layer is itself just a `ThermodynamicStructure` with its own stocks — `EarthPOD` aggregates the total matter across all its children via `totalDescendantBiomass()`, and the "Conservation Check" HUD readout sums this to detect drift.

`CyclePOD` is the key structural addition: a cycle is not a relationship between structures — it is itself a thermodynamic structure, with its own reservoirs (as `Stocks` distributed across spheres) and its own entropy state (`STEADY` if inflows/outflows to each reservoir balance, `DEGRADING` if a reservoir is being drawn down abnormally — e.g. fossil carbon $\to$ atmosphere).

---

## 3. Conservation and the Ledger

Every method execution writes a line to the ledger:

```
 OAK_FOREST_0 :: photosynthesize() :: -12 CO2, -8 H2O, +9 biomass, +6 O2

```

This is deliberately blockchain/ledger-flavored: each transaction is atomic, timestamped, and (in principle) auditable. The long term goal is for total system matter to remain constant across an arbitrary sequence of method calls — energy is the only quantity allowed to enter the system from outside (via the Sun) and leave it (via waste heat / entropy).

---

## 4. Relationship Taxonomy

| Relation | Direction Example | Conserves Matter? | Notes |
| :--- | :--- | :--- | :--- |
| **energy** | Sun → Earth, Sun → Flora | No (open input) | The only non-conserved inflow |
| **food** | Flora → Fauna, Fauna → Human | Yes | Biomass transfer |
| **matter** | Reservoir ↔ Species | Yes | Bidirectional over time |
| **decomposition** | Fungi → Reservoir | Yes | Returns matter to cycle |
| **predation** | Wolf → Herbivore | Yes | Subtype of food |
| **parasitism** | Parasite → Host | Yes | Partial/ongoing drain |
| **parasitoidism** | Parasitoid → Host | Yes | Terminal, host dies |
| **mutualism** | Bee ↔ Flower | Yes (bidirectional) | Mutual benefit, animated both ways |
| **commensalism** | Remora → Shark | Negligible | Benefit one side, ~0 cost other |
| **amensalism** | Canopy → Understory | N/A (informational) | Inhibition without benefit |
| **competition** | Species ↔ Species | N/A (informational) | No stock transfer, graph-only |
| **habitat** | Flora → Fauna | N/A (informational) | Structural dependency |
| **pollination** | Fauna → Flora | Small (energy cost) | Enables flora reproduction |
| **mycorrhiza** | Flora ↔ Fungi | Yes (bidirectional) | Sugar ↔ mineral exchange |
| **seed** | Flora → Fauna → Flora | Small | Zoochory, myrmecochory |
| **nitrogen** | Microbe → Flora | Yes | Biological fixation |
| **engineering** | Earth/keystone → habitat | N/A (structural) | Beaver, elephant, coral |
| **cleptoparasitism** | Species → Species | Yes | Theft of collected resources |
| **host** | Vector ↔ Pathogen ↔ Host | Yes (tripartite) | Disease transmission network |

---

## 5. Atomic Decomposition View

Biomass stocks can optionally be broken down into approximate elemental composition (Carbon, Hydrogen, Oxygen, Nitrogen, trace elements) using standard organic matter ratios. This is a display layer on top of the stock system — it does not (yet) simulate individual atoms, but provides a plausible decomposition for visualization and for routing matter back into the correct material reservoirs on death/decay events.

---

## 6. Rendering and Interaction Layers

* **Canvas 2D** renders all nodes, orbits/trophic/biome layouts, relation edges, and animated flow packets.


* **Camera system** maintains a world-space transform (pan + zoom) applied uniformly at draw time; hit-testing is done in world space so interaction stays accurate at any zoom.


* **Inspector panel** (DOM, not canvas) reflects the currently selected monad's live state — now backed by real `ThermodynamicStructure` instances — and re-renders after every method execution.


* **Ledger panel** (DOM) is an append-only log of transactions, capped to the most recent N entries for performance.


* **Timeline scrubber** replays recorded snapshots of the full object graph state at any prior tick.



---

## 7. Population Dynamics

Species populations follow a discrete Lotka–Volterra-style update each tick, implemented as part of `SpeciesPOD.tick()`:

$$\frac{dN_{\text{prey}}}{dt} = r N_{\text{prey}} \left(1 - \frac{N_{\text{prey}}}{K}\right) - a N_{\text{prey}} N_{\text{pred}}$$

$$\frac{dN_{\text{pred}}}{dt} = b N_{\text{prey}} N_{\text{pred}} - m N_{\text{pred}}$$

Node radius and opacity in the canvas are direct functions of population, and a per-node sparkline in the inspector plots the recorded history.

---

## 8. Bridges to Sibling Repositories

`HumanNodePOD` explicitly exposes methods that are pointers into the other repos in the Cypherpunk$\to$Solarpunk thesis:

* `measureWellbeing()` $\to$ Wellbeing Framework (WU units)


* `verifyInformation()` $\to$ Trinity (deepfake-era verification)


* `proveThermodynamicWork()` $\to$ Sufficiency Protocol (ecological accounting backed by thermodynamic proof of work)


* `denominateInSolarUnits()` $\to$ The Sun Standard (monetizing entropy; `EarthPOD.solarInputWatts` is the physical anchor)



`IndividualMonad` (used for human nodes) carries an `identityHash` pointer into Wellbeing Identity and a `wellbeingUnits` field aggregated by `HumanNodePOD.totalWellbeingUnits()`.

---

## 9. Planned Extensions

* [x] Population dynamics with Lotka-Volterra oscillation


* [x] Biome/geography layout mode alongside orbital and trophic


* [ ] Timeline scrubber to replay prior ticks


* [ ] External data ingestion scaffold (GBIF/IUCN JSON schema + stubs)


* [ ] Real GBIF/IUCN API wiring via backend proxy (CORS + API key)


* [ ] Full TypeScript strict-mode build pipeline, replacing inline JS


* [ ] Unit tests asserting conservation of matter across arbitrary sequences of `tick()` and method calls


* [ ] Real-time geolocation ingestion (GeoJSON / EPSG:4326 spatial indexing) mapping `BiomePOD` instances to coordinates


* [ ] UML diagram generation from the class hierarchy
