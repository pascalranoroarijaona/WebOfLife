<!-- Verified Backlog content with retrospective [ ] and [ ] checks -->
Roadmap Completion: 0%
SPRINT_GOAL: Implement `GeoBiomePOD` coordinates and spatial anchors (`src/spatial/geo_biome_pod.ts`) to establish spatial partitioning across the planetary monad engine.

## WebOfLife Master Backlog

### Phase 0 — Core Monad Engine (Completed)
- [ ] Abstract `ThermodynamicStructure` class hierarchy.
- [ ] Biogeochemical `CyclePOD` instances (Carbon, Water, Nitrogen, Phosphorus).
- [ ] Live Canvas 2D orbital/trophic renderer with interactive inspector.
- [ ] Executable monad methods and stock-and-flow ledger.

### Phase 1 — Geospatial Grid, Technosphere & Biosphere Telemetry (In Progress)
- [ ] `GeoBiomePOD` coordinates and spatial anchors (`src/spatial/geo_biome_pod.ts`).
- [ ] Projection mapping and Geo View layout toggle in UI (`src/spatial/projection_mapping.ts`, `src/spatial/projection_helpers.ts`).
- [ ] Integration of Uber H3 spatial index for hexagonal global partitioning (`src/h3_spatial.ts`).
- [ ] Extended Gouy-Stodola Exergy Destruction Mapping (`src/thermodynamics/extended_exergy_ledger.ts`, `src/thermodynamics/exergy_ledger.ts`).
- [ ] **Explicit Gut Microbiome & Endosymbiotic Metabolic Monads (`src/biosphere/endosymbiosis.ts`):** Model host-microbiome metabolic exchanges as internal secondary monad layers within `SpeciesPOD`.
- [ ] **Stoichiometric Nutrient Cycling & Elemental Limitation (`src/biosphere/stoichiometric_cycling.ts`):** Implement C:N:P elemental ratio tracking within `SpeciesPOD` and `CyclePOD` monads to model Liebig's Law of Managing Minimums.
- [ ] **Autonomous Human Method & Process Mining Engine:** AI agent pipeline searching the web to extract, categorize, and formalize all human technological, industrial, and social processes as executable `HumanNodePOD` methods with exact matter/energy stock deltas.
- [ ] **Exhaustive Species & Biological Method Harvester:** Automated ingestion of global biodiversity databases (GBIF, IUCN Red List, NCBI Taxonomy, Encyclopedia of Life) to dynamically instantiate all Earth species into `SpeciesPOD` monads with their complete ecological method taxonomies.
- [ ] Ingestion of satellite feeds (Sentinel-2 NDVI, MODIS thermal, NASA OCO carbon flux).
- [ ] gRPC sensor mesh pipeline for ground-level IoT and flux towers.
- [ ] Gamified Stewardship Policy Engine ("Planetary Tycoon"): Allow human players to tweak global resource dispatch vectors ($\mathbf{u}(t)$) and observe live impacts on global entropy export ($\dot{S}_{\text{export}}$) and species survival.
- [ ] Live Telemetry Stream Adapters: Build REST/WebSocket ingestion modules connecting `src/ingestion/` to GBIF, NASA Power, Copernicus CAMS, and FLUXNET feeds.
- [ ] Dynamic Functional Trait-Based Species Assembly (`src/biosphere/functional_traits.ts`): Upgrade biodiversity tracking from static species counts to continuous multi-trait spaces.
- [ ] Mycorrhizal Carbon-Nutrient Trading Dynamics (`src/biosphere/mycorrhizal_network.ts`): Implement explicit subterranean source-sink exchange protocols for fungal-plant nutrient trading.
- [ ] Multi-Trophic Jacobian Stability & Cascade Propagation (`src/biosphere/trophic_jacobian.ts`): Expand Lotka-Volterra formulations into complete $n \times n$ community interaction matrices and compute real-time Jacobian eigenvalues.
- [ ] Phenological Thermal Time & Growing Degree-Day Triggers (`src/biosphere/phenology.ts`): Drive seasonal transitions and biological triggers via cumulative Growing Degree Days (GDD) and chill-hours.
- [ ] Stochastic Disturbance Regimes & Succession Regimes (`src/biosphere/succession_regimes.ts`): Integrate spatial cellular automata or state-and-transition models for natural wildfire, windthrow, and pest outbreak events.
- [ ] Phytoplankton-Zooplankton Stoichiometric Feedback & Bloom Dynamics (`src/biosphere/marine_pelagic.ts`): Model marine pelagic food webs with explicit light attenuation and viral lysis loops.
- [ ] Rare Earth Element (REE) & Critical Mineral Upstream Supply Chain Tracking: Implement declining ore-grade yield formulas, energy penalties, and acid-rock drainage vectors for raw extraction monads ($\text{Li}$, $\text{Co}$, $\text{Nd}$, $\text{Cu}$, $\text{P}$).
- [ ] Semiconductor Lithography & Cleanroom Resource Loops: Model ultra-pure water (UPW) consumption ratios, chemical waste streams, and specialty electronic gas supply chains.
- [ ] Direct Air Capture Sorbent Degradation & Thermal Regeneration Thermodynamics: Simulate solid amine vs. liquid solvent DAC thermal regeneration energy penalties, chemical half-life decay, and grid-connected parasitic loads.
- [ ] Renewable Energy Grid Intermittency & Storage Degradation Matrices: Add high-resolution dispatch constraints to $\mathbf{u}(t)$, tracking battery capacity fade and pumped-storage round-trip efficiency losses.
- [ ] Industrial Tailings Dam Geotechnical Failure Risks: Couple structural integrity models of wet tailings storage with heavy metal leachate mobilization rates into adjacent hydrological `CyclePOD` nodes.
- [ ] Anthropogenic Waste Heat Flux ($\dot{Q}_{\text{waste}}$) Microclimate Coupling: Map localized thermal pollution directly into lower troposphere boundary layer monads to simulate regional albedo and convective anomalies.
- [ ] Circular Economy & Closed-Loop Hydrometallurgical Recycling: Enforce mass-balance recovery rates for photovoltaic kerf loss, wind turbine composites, and end-of-life battery recycling nodes.
- [ ] Multi-Resolution Hierarchical Indexing (`src/spatial/h3_resolution_hierarchy.ts`): Dynamic switching between H3 resolutions (Res 0 to 15) for regional zoom versus global planetary macro-states.
- [ ] Vectorized H3 K-Ring Adjacency & Tensor Flux Operators (`src/spatial/h3_topology.ts`): Optimized tensor representations of hexagonal neighborhoods for boundary flux calculations.
- [ ] Raster-to-H3 Spatial Data Assimilation Engine (`src/spatial/raster_assimilation.ts`): Automated ingestion pipeline for NetCDF/GeoTIFF raster datasets into hexagonal `GeoBiomePOD` cell states.
- [ ] Empirical Food Web Topology & Adjacency Matrices (`src/biosphere/food_web_matrix.ts`): Implement sparse $N \times N$ trophic interaction matrices derived from real-world datasets for multi-trophic consumer-resource flow calculations.
- [ ] GBIF & IUCN Taxon-to-Monad Ingest Pipeline (`src/biosphere/taxonomic_harvester.ts`): Create an automated ingestion layer mapping real taxonomic trees and conservation status directly into active `SpeciesPOD` node parameters.
- [ ] Environmental DNA (eDNA) & Biodiversity Telemetry Streams (`src/biosphere/edna_stream.ts`): Build data ingestion stream for eDNA metabarcoding to dynamically update local biodiversity indices in near-real-time.
- [ ] Mycorrhizal Source-Sink Carbon-Nutrient Trading Engine (`src/biosphere/mycorrhizal_network.ts`): Model explicit subterranean fungal hyphae networks facilitating underground carbon-for-nutrient trading between disparate plant species.
- [ ] State-and-Transition Biome Succession & Disturbance Modules (`src/biosphere/biome_succession.ts`): Implement stochastic state-and-transition models and phenological triggers to simulate post-disturbance forest regeneration and biome shifts.
- [ ] Marine Pelagic Stoichiometric Feedback & Viral Lysis Loops (`src/biosphere/marine_pelagic.ts`): Model ocean surface mixing layers with phytoplankton-zooplankton-bacteria loops, variable stoichiometry, and viral shunt dynamics.

### New Biospheric Brainstormer Additions
- [ ] **Empirical Food Web Topology & Sparse Adjacency Matrices (`src/biosphere/food_web_matrix.ts`):** Transition away from isolated pairwise Lotka-Volterra formulations by implementing sparse $N \times N$ consumer-resource interaction matrices derived from empirical datasets (e.g., EltonDB, GLOBI) to simulate multi-trophic energy cascade propagation.
- [ ] **Mycorrhizal Source-Sink Carbon-Nutrient Trading Engine (`src/biosphere/mycorrhizal_network.ts`):** Model explicit subterranean fungal hyphae networks facilitating underground carbon-for-nutrient ($N, P$) trading, market-like reciprocal rewards, and directional source-sink exchanges between disparate plant species.
- [ ] **GBIF & IUCN Taxon-to-Monad Automated Ingestion Pipeline (`src/biosphere/taxonomic_harvester.ts`):** Implement a live ingestion wrapper mapping global biodiversity databases (GBIF, IUCN Red List, NCBI Taxonomy) directly into active `SpeciesPOD` node parameters, functional groups, and conservation status thresholds.
- [ ] **State-and-Transition Biome Succession & Disturbance Modules (`src/biosphere/biome_succession.ts`):** Implement stochastic state-and-transition models (STMs) and cumulative phenological triggers to simulate post-disturbance forest regeneration, soil moisture depletion tipping points, and multi-decadal biome shifts.
- [ ] **Marine Pelagic Stoichiometric Feedback & Viral Lysis Loops (`src/biosphere/marine_pelagic.ts`):** Model ocean surface mixing layers with explicit phytoplankton-zooplankton-bacteria loops, variable elemental stoichiometry ($C:N:P$), light attenuation, and viral shunt dynamics governing dissolved organic matter (DOM) recycling.
- [ ] **Dynamic Functional Trait-Based Species Assembly (`src/biosphere/functional_traits.ts`):** Upgrade biodiversity tracking from static species counts to continuous multi-trait spaces (specific leaf area, seed mass, root rooting depth) governing environmental filtering and competitive exclusion across H3 cells.
- [ ] **Environmental DNA (eDNA) & Biodiversity Telemetry Streams (`src/biosphere/edna_stream.ts`):** Build ingestion adapters for eDNA metabarcoding streams to dynamically update local biodiversity richness indices, species presence probabilities, and invasive species detection in `GeoBiomePOD` cells.
- [ ] **Acoustic & Structural Habitat Complexity Indices (`src/biosphere/habitat_acoustics.ts`):** Implement spatial soundscape entropy and structural vertical stratification metrics across `GeoBiomePOD` nodes to quantify wilderness intactness, acoustic niche occupation, and habitat degradation.
- [ ] **Seed Bank Dormancy & Soil Seed Memory Monads (`src/biosphere/seed_bank.ts`):** Simulate subterranean propagule persistence, temperature/smoke-activated germination triggers, and viability decay curves for robust post-wildfire and post-drought ecological resilience modeling.

### New Technosphere Brainstormer Additions
- [ ] **Solid Amine vs. Liquid Solvent DAC Kinetics (`src/technosphere/dac_kinetics.ts`):** Implement explicit thermal-regeneration energy penalties ($>100^\circ\text{C}$ steam loops for solid-supported amines vs. $900^\circ\text{C}$ calcination kilns for liquid KOH solvents), chemical sorbent half-life degradation rates, and parasitic electrical loads tied directly to regional grid carbon intensity.
- [ ] **Bistable Mineral Carbonation & Accelerated Weathering Monads (`src/technosphere/mineral_carbonation.ts`):** Simulate exothermicity, water mass-balance requirements, and particle-size crushing energy overheads for converting industrial $\mathrm{CO}_2$ and silicate rock flour into stable carbonate minerals ($\mathrm{MgCO}_3$, $\mathrm{CaCO}_3$).
- [ ] **Inverter-Based Resource (IBR) Synthetic Inertia & Short-Circuit Constraints (`src/technosphere/grid_stability.ts`):** Track grid frequency stability limits, phase-locked loop (PLL) trip thresholds, and synthetic inertia deficits across high-penetration solar/wind H3 nodes.
- [ ] **Battery Energy Storage System (BESS) Degradation & Thermal Runaway Monads (`src/technosphere/battery_degradation.ts`):** Implement capacity fade formulas driven by depth-of-discharge (DoD), C-rate stress matrices, and round-trip exergy efficiency losses over operational lifecycles.
- [ ] **Ultra-Pure Water (UPW) Closed-Loop Recycling & Chemical Waste Streams (`src/technosphere/semiconductor_fab.ts`):** Model mega-liter per day ultrapure water intake, hydrofluoric acid neutralization, and perfluorocarbon (PFC) exhaust scrubber abatement efficiency in advanced node semiconductor fabrication plants.
- [ ] **Semiconductor Gas Scavenging & Perfluorocarbon (PFC) Destruction Loops (`src/technosphere/fab_abatement.ts`):** High-temperature thermal/catalytic abatement modeling for ultra-potent greenhouse gases in plasma etching chambers.
- [ ] **Declining Ore-Grade Yield Curves & Acid-Rock Drainage Monads (`src/technosphere/extraction_depletion.ts`):** Implement dynamic energy-per-ton escalation formulas as copper, lithium, and rare-earth ore grades decline, alongside toxic heavy-metal leachate mobilization into adjacent hydrological `CyclePOD` nodes.
- [ ] **Wet Tailings Dam Structural Liquefaction & Leachate Plume Dynamics (`src/technosphere/tailings_failure.ts`):** Coupled geomechanical pore-pressure models for wet tailings storage simulating seismic liquefaction, sludge-basin wall failures, and downstream ecosystem inundation.
- [ ] **Rare Earth Element (REE) & Critical Mineral Refining Bottlenecks (`src/technosphere/refining_losses.ts`):** Explicit multi-stage hydrometallurgical and pyrometallurgical separation modules accounting for reagent consumption and radioactive co-extraction.
- [ ] **Haber-Bosch Nitrogen Fixation Exergy & Off-Gassing Feedbacks (`src/technosphere/haber_bosch.ts`):** Couple natural gas feedstock consumption, high-pressure/temperature synthesis efficiency limits, and agricultural runoff nitrous oxide ($\mathrm{N}_2\mathrm{O}$) radiative forcing directly into nitrogen/carbon `CyclePOD` balances.
- [ ] **Data Center & Hyper-Scale Compute Waste Heat Rejection (`src/technosphere/compute_metabolism.ts`):** Model Power Usage Effectiveness (PUE), Water Usage Effectiveness (WUE), and localized tropospheric sensible heat flux ($\dot{Q}_{\text{waste}}$) injection from AI training clusters into urban boundary layer monads.
- [ ] **Legacy Industrial Superfund Site & Persistent Organic Pollutant (POP) Migration (`src/technosphere/superfund_migration.ts`):** Implement multi-decade groundwater leaching models for legacy chemical plants, PCB storage, and unlined municipal landfills intersecting hydrological `CyclePOD` nodes.
- [ ] **Commercial Aviation & Maritime Shipping Bunker Fuel Emissions Monads (`src/technosphere/transportation_metabolism.ts`):** Model long-range logistical transport loops, heavy fuel oil (HFO) and Jet-A consumption matrices, tropospheric contrail radiative forcing, and marine sulfur scrubber discharge vectors.

### New Physics & Spatial Brainstormer Additions
- [ ] **Dynamic H3 Mesh Refinement & Adaptive Resolution (`src/spatial/h3_adaptive_mesh.ts`):** Automated local h3-resolution splitting/merging heuristics driven by thermodynamic shocks.
- [ ] **H3 Compacted Set Flux Routing (`src/spatial/h3_tensor_routing.ts`):** Vectorized tensor matrix multiplication for mass and energy transfers across discontinuous H3 sets.
- [ ] **Multi-Resolution H3 Inter-Grid Aggregation (`src/spatial/h3_multires_aggregation.ts`):** Operators to upscale/downscale state vectors between macro and micro H3 cells.
- [ ] **Dynamic Cloud-Radiative Forcing & Aerosol Feedback (`src/physics/cloud_aerosol_forcing.ts`):** Coupled shortwave/longwave cloud optical depth modules modeling aerosol indirect effects.
- [ ] **Non-Subsurface Hydrology & Darcy-Flow Soil Moisture (`src/physics/subsurface_hydrology.ts`):** Multi-layer Richards equation soil moisture dynamics coupled to root water uptake and groundwater aquifers.
- [ ] **Dynamic Ice Sheet & Glacier Mass Balance (`src/physics/cryosphere_dynamics.ts`):** Surface mass balance equations tracking basal melting, calving front retreat, and elevation-feedback melt rates.
- [ ] **Carnot-Efficiency Thermodynamic Boundary Constraints (`src/thermodynamics/carnot_limits.ts`):** Enforcement of maximum theoretical work and heat-engine conversion limits on technospheric power generation.
- [ ] **Biogeochemical Dissipative Structure Stability Metrics (`src/thermodynamics/dissipative_stability.ts`):** Real-time evaluation of Prigogine’s minimum entropy production theorem and Glansdorff-Prigogine stability criteria.
- [ ] **3D Baroclinic Atmosphere-Ocean Coupled Boundary Layer (`src/transport/coupled_boundary_layer.ts`):** Explicit flux exchange mechanics for momentum, sensible heat, latent heat, and gas transfer across air-sea interface.
- [ ] **Lagrangian Particle Tracking for Aerosols & Marine Plankton (`src/transport/lagrangian_transport.ts`):** Particle-in-cell advection algorithms for long-range atmospheric dust and oceanic larval drift.
- [ ] **Meso-Scale Eddy Transport & Lateral Mixing Parameterization (`src/transport/ocean_eddies.ts`):** Sub-grid scale parameterizations for lateral tracer mixing and eddy-induced transport in global ocean circulation.

### Orchestrator Architectural Refactors
- [ ] **AST & Git Diff Context Windowing:** Pass AST export headers or `git diff` summaries to agents instead of raw TypeScript files to prevent token bloat.
- [ ] **Asynchronous Brainstorming Pipeline:** Wrap the 3 Brainstormer agent calls in `asyncio.gather()` to run them in parallel.
- [ ] **SQLite Stock Transaction Ledger:** Transition from in-memory arrays to an append-only SQLite ledger (`.agent_logs/ledger.db` ) for tracking thermodynamic stock transitions ($\Delta \text{Stock} = \text{In} - \text{Out}$).

### Phase 2 — Thermodynamic Audit & Exergy Ledger (Pending)
- [ ] Real-time mass and exergy balance verification across all sensor streams.
- [ ] Anomalous entropy dissipation detection and exergy destruction accounting ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).
- [ ] Cryptographic proof of ecological work backed by physical sensor data.
- [ ] Radiative Forcing, Stefan-Boltzmann, and Albedo-Temperature feedback loops.
- [ ] Permafrost melt, methane clathrate release, and evapotranspiration latent heat flux coupling.
- [ ] Raster-to-H3 spatial data mappers and Data Assimilation Engine (EnKF / Kalman Filtering).

### Phase 3 — Symbiotic AI Objective & Control Dynamics (Pending)
- [ ] Multi-Agent Reinforcement Learning (MARL) for planetary resource routing.
- [ ] Model Predictive Control (MPC) ensuring all `CyclePOD` instances remain in `EntropyState.STEADY`.
- [ ] Dynamic optimal policy calculation for global energy, water, and agricultural flows.

### Phase 4 — Closed-Loop Autonomous Actuation (Pending)
- [ ] Automated control signals sent to smart microgrids and precision agricultural networks.
- [ ] Integration with autonomous rewilding drones and ocean restoration systems.
- [ ] Reflexive localized feedback loop mapping macroeconomic human actions directly to biospheric equilibrium.

<!-- BACKLOG_END -->