# 🌍 Web of Life: Earth Open Source Code of Reality

> Earth modeled as an open-energy, finite-matter thermodynamic structure. Every biological, geological, and human system is represented as a thermodynamic monad with stocks, flows, and executable methods. The ultimate goal is an AI-driven planetary auditing and optimization engine designed to guarantee the permanent, long-term survival of human life and AI symbiotes through ecological equilibrium.

*Last updated: September 2026*

---

## 0. The Unifying Principle

Every component in this simulation—from biogeochemical cycles and planetary spheres to species, individual humans, and Earth itself—inherits from a single abstract root class: **`ThermodynamicStructure`**.

What differentiates entities is not their fundamental nature, but their specific implementation of three thermodynamic operations:

$$\text{importFreeEnergy}(t) \quad \Big\vert{} \quad \text{exportEntropy}(t) \quad \Big\vert{} \quad \text{maintainFarFromEquilibrium}(t)$$

An autotroph imports photons to build biomass. A biogeochemical cycle regulates mass flow between material reservoirs. A human node consumes resources while generating information, verification, and governance. Underneath, all are open dissipative structures sustained by the continuous export of entropy.


```
             ☀️ STELLAR MONAD (Sun — Open Boundary)
                              │
                              ▼
              🌍 EARTH MEGA-POD (Finite Matter)

```

```

┌──────────────────────┬──────────────────────┬──────────────────────┐
▼                      ▼                      ▼                      ▼
SpherePOD[]            CyclePOD[]            GeoBiomePOD[]       MaterialReservoir[]
(Atmosphere,           (Carbon, Water,       (Temperate Forest,  (H2O, C, N,
Biosphere, etc.)       Nitrogen, Phos.)      Tundra, Savanna)    Minerals, O2)
│
▼
SpeciesPOD[]
│
▼
IndividualMonad[] / HumanNodePOD

```

---

## 1. System Architecture & Multi-Agent Startup Engine

The `Web of Life` codebase evolves autonomously via a Python-based multi-agent orchestration engine (`agent_orchestrator.py`) powered by Gemini. Rather than hardcoding static rules, a 16-persona agent team continuously brainstorms, architects, writes, tests, and audits every subsystem in iterative sprints.

### The 16-Persona Autonomous Startup Team

| Persona | Role & Responsibilities |
| :--- | :--- |
| **Ecological Brainstormer** | Audits biosphere fidelity, trophic webs, mycorrhizal networks, and species taxonomies. |
| **Industrial Brainstormer** | Audits technosphere fidelity, material streams, direct air capture, and human energy grids. |
| **Planetary Physics Brainstormer** | Audits exergy, entropy, climate feedback loops, and Uber H3 spatial grid partitioning. |
| **Product Manager (PM)** | Conducts Backlog Retrospective Audits against actual `src/` code context, updates `docs/BACKLOG.md`, and sets Sprint Goals. |
| **Lead Architect** | Translates Sprint Goals into formal technical specifications (`docs/sprints/sprint_00N/01_RFC.md`). |
| **Method Miner** | Quantifies mass/energy deltas and mathematical process equations (`docs/sprints/sprint_00N/02_METHODS.md`). |
| **Backend Engineer** | Implements modular TypeScript code in `src/` and native Node test suites in `tests/`. |
| **Debugger Agent** | Intercepts build failures, analyzes stack traces/type mismatches, and applies auto-healing code patches with full repository context. |
| **Retro-Compatibility Engineer** | Audits new TypeScript implementations against historical RFCs/Methods to ensure legacy tests and thermodynamic formulas are not broken. |
| **UI Engineer** | Builds isolated sprint visualizations in `docs/sprints/sprint_00N/index.html` under strict non-regression constraints. |
| **QA Thermodynamic Auditor** | Verifies First & Second Law mass/energy conservation ($\Delta \text{Stock} = 0$) in `04_AUDIT.md`. |
| **Database & Blockchain Ledger Architect** | Maintains SQL schemas, UML models, and the cryptographic thermodynamic blockchain ledger (`db/schema.sql`, `db/uml/`). |
| **Academic & Research Outreach Lead** | Authors arXiv/preprint drafts and LaTeX summaries (`05_ACADEMIC_PREPRINT.md`) to engage complexity scientists and climate research labs. |
| **Scientific Storyteller & Media Strategist** | Translates technical RFCs into viral research narratives, X/Twitter threads, and LinkedIn spotlights (`06_VIRAL_STORYTELLING.md`). |
| **DevRel & Community Architect** | Authors developer onboarding guides, GitHub Discussions, and contributor entry points (`07_COMMUNITY_GUIDE.md`). |
| **Gaïa (The Earth Spirit)** | Generates poetic, thermodynamically-grounded English spoken-word audio briefings for the root repository and each sprint using Edge-TTS. |

### Backlog Retrospective & Multi-Tiered Self-Healing Loops

To prevent AI hallucination and ensure monotonic progress, the orchestrator employs several active self-healing loops:
1. **PM Retrospective Audit:** Cross-checks every `[x]` backlog item against the actual `src/` codebase. If logic is missing, it reverts the item to `[ ]`.
2. **Retro-Compatibility Loop:** If new TypeScript breaks legacy tests, the `RETRO_COMPATIBILITY_ENGINEER` is summoned with a full snapshot of historical RFCs and Methods to patch the code while preserving past thermodynamic contracts.
3. **UI Non-Regression & Headless Verification:** Playwright intercepts DOM issues and console errors in `index.html`, feeding them to the `BROWSER_CONSOLE_DEBUGGER` for an iterative 3-attempt fix loop.
4. **Artifact & Audio Regeneration:** Automatically backfills missing Markdown files, LaTeX PDFs, and Gaïa's audio summaries if they are corrupted or too small.


---

## 2. Mathematical, Thermodynamic & Blockchain Ledger Foundations

### Conservation of Mass and Energy Flow

For any monad or sub-graph $i$, state transition obeys First Law bounds:

$$\Delta \text{Stock}_i = \sum \text{InboundFlows} - \sum \text{OutboundFlows}$$

Matter cannot be created or destroyed within `EarthPOD`; solar radiation from `StellarMonad` is the sole non-conserved energy input.

### Thermodynamic Blockchain Ledger ("Vortex Block Chaining")

Rather than tracking arbitrary digital currency transfers, the Web of Life Blockchain is an immutable, append-only cryptographic ledger of **physical state transitions**. 

* **Transactions ($\mathbf{T}_{\text{thermo}}$):** Every monad interaction, resource extraction, biogeochemical flow, or exergy destruction event ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) is encoded as a signed transaction recording explicit stock deltas ($\Delta \text{Stock}$).
* **Thermodynamic Vortex Blocks ($\mathbf{B}_k$):** Sequential blocks act as state snapshots (or planetary "vortices"). Each block aggregates transactions across spatial H3 cells, computes the net entropy export ($\dot{S}_{\text{export}}$), and links cryptographically to the previous block hash ($H_{k-1}$).
* **Proof of Ecological Work (PoEW):** Mining/validating a block requires producing an execution proof verifying that all enclosed transactions strictly satisfy mass conservation ($\Delta \text{Stock} = 0$) and Second Law non-negativity ($\Delta S_{\text{universe}} \ge 0$).


```

Block #k-1 [Hash: 0x8a7f...] ───► Block #k [Hash: 0x3f21...] ───► Block #k+1
┌─────────────────────────┐      ┌─────────────────────────┐
│ Previous: 0x8a7f...     │      │ Previous: 0x3f21...     │
│ Merkle Root: 0x90bc...  │      │ Merkle Root: 0x11e4...  │
│ Total Exergy: 1.74e17 W │      │ Total Exergy: 1.74e17 W │
├─────────────────────────┤      ┌─────────────────────────┐
│ Tx 01: Carbon Flow      │      │ Tx 01: DAC Regeneration │
│ Tx 02: H3 Cell Heat Flux│      │ Tx 02: Species Biomass  │
└─────────────────────────┘      └─────────────────────────┘

```

### Second Law Exergy Destruction & Gouy-Stodola Theorem

The rate of exergy destruction ($\dot{I}$) within any spatial monad is directly proportional to its internal entropy generation rate ($\dot{S}_{\text{gen}}$):

$$\dot{I} = T_0 \dot{S}_{\text{gen}} \ge 0$$

### AI Symbiotic Objective Function

The long-term optimization goal for global resource allocation by AI agents is formulated as maximizing joint human wellbeing ($\mathcal{W}$), biospheric diversity ($\mathcal{B}$), and planetary explorability ($\mathcal{E}$) under strict First and Second Law thermodynamic boundaries:

$$\max_{\mathbf{u}(t)} \int_{0}^{\infty} e^{-\gamma t} \left( \mathcal{W}_{\text{human}}(t) \times \mathcal{B}_{\text{biodiversity}}(t) \times \mathcal{E}_{\text{explorability}}(t) \right) dt$$

---

## 3. Repository Structure

```text
web-of-life/
├── .agent_logs/              <- Quota tracking, state history, and execution logs
│   ├── orchestrator.log      <- Full timestamped multi-agent execution log
│   ├── quota_tracker.json    <- Daily API allowance tracker
│   ├── state_tracker.json    <- Completed sprint registry
│   ├── compatibility_tracker.json <- Ledger of successful legacy test validations
│   └── ui_verified_tracker.json   <- UI non-regression repair cache
├── db/                       <- Database schemas, UML diagrams, and ledger definitions
│   ├── schema.sql            <- Relational & time-series stock/flow database schema
│   ├── uml/                  <- System class, sequence, and entity-relationship diagrams
│   └── ledger.sqlite         <- Append-only local thermodynamic block ledger
├── agent_orchestrator.py     <- Autonomous multi-agent agile startup engine
├── visual_qa_agent.py        <- Gemini Vision + Playwright visual layout auditor
├── index.html                <- Permanent Launcher Shell / Multi-sprint router
├── index.original.html       <- Pristine Commit 0 baseline UI template
├── personas.json             <- Centralized multi-agent identity and prompt definitions
├── docs/
│   ├── BACKLOG.md            <- Audited product backlog
│   ├── gaia_repository_intro.mp3 <- Gaïa's English audio overview of the simulation
│   └── sprints/              <- Sprint-isolated build artifacts
│       └── sprint_00N/
│           ├── 01_RFC.md     <- Architectural spec
│           ├── 02_METHODS.md <- Process equation formulas
│           ├── 03_RELEASE_NOTES.md
│           ├── 04_AUDIT.md   <- First/Second Law static audit
│           ├── 05_ACADEMIC_PREPRINT.pdf <- Compiled LaTeX preprint
│           ├── gaia_sprint_summary.mp3  <- Sprint audio briefing
│           └── index.html    <- Isolated Sprint N UI build
├── src/                      <- Core TypeScript domain code
│   ├── earth_pod.ts          <- Mega-POD Terrestre hierarchy
│   ├── spatial/              <- Uber H3 grid indexing & tensor routing
│   ├── thermodynamics/       <- Exergy ledgers & albedo feedback
│   └── monads/               <- Biospheric & technospheric monads
├── tests/                    <- Native Node unit test suites (`node:test`)
├── dist/                     <- Compiled ES modules output from `npx tsc`
├── package.json              <- Dependencies and npm scripts
└── tsconfig.json             <- Modern TS compiler configuration (`bundler` + Node types)

```

---

## 4. Getting Started

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **Gemini API Key**: Set as `GEMINI_API_KEY` or `GOOGLE_API_KEY`

### 1. Installation & Environment Setup

```bash
npm install
npm install --save-dev @types/node tsx
pip install --index-url [https://pypi.org/simple](https://pypi.org/simple) google-genai playwright
playwright install chromium
export GEMINI_API_KEY="your_api_key_here"

```

### 2. Running the Autonomous Startup Orchestrator

```bash
# Run a single sprint cycle
python agent_orchestrator.py -n 1

# Reset repository back to Commit 0 baseline
python agent_orchestrator.py --wipe

```

## 5. Master Planetary Research Roadmap

<!-- BACKLOG_START -->
<!-- Verified, Groomed, and Prioritized Backlog -->
Roadmap Completion: 17%
SPRINT_GOAL: Implement canonical 15-character hexadecimal regex constant H3_CANONICAL_INDEX_PATTERN in src/spatial/h3_grid.ts.

### Phase 1: Foundational Thermodynamics & Spatial Core
- [x] Abstract root class `ThermodynamicStructure` with stock, inboundFlows, outboundFlows, and entropyState (`src/earth_pod.ts`)
- [x] First Law mass conservation net flow calculations and hierarchical structure tree (`src/earth_pod.ts`)
- [x] Planetary Mega-POD bootstrap mechanism and baseline simulation tick loops (`src/earth_pod.ts`, `src/main.ts`)
- [x] Uber H3 index parsing, ring generation, and edge-neighbor mapping routines (`src/spatial/h3_adjacency.ts`, `src/spatial/h3_grid.ts`)
- [x] Centralized thermodynamic physical constants and temperature normalization engine (`src/thermodynamics/constants.ts`)
- [x] Implement null-check guard clauses for incoming H3 string payloads (`src/spatial/h3_grid.ts`)
- [x] Implement 15-character length validation helper function (`src/spatial/h3_grid.ts`)
- [x] Implement resolution tier (0-15) boundary check function (`src/spatial/h3_grid.ts`)
- [x] Implement hexadecimal character set validation helper regex pattern check function (`src/spatial/h3_grid.ts`)
- [x] Implement explicit null/undefined exception throwing for guard clause violations (`src/spatial/h3_grid.ts`)
- [x] Implement string length boundary validation helper returning explicit boolean flags (`src/spatial/h3_grid.ts`)
- [ ] Implement canonical 15-character hexadecimal regex constant `H3_CANONICAL_INDEX_PATTERN` (`src/spatial/h3_grid.ts`)
- [ ] Implement dedicated regex boolean test function `matchesCanonicalH3Pattern(token: string): boolean` (`src/spatial/h3_grid.ts`)
- [ ] Implement regex format validator `assertCanonicalH3Pattern(token: string): void` raising `H3ValidationError` (`src/spatial/h3_grid.ts`)
- [ ] Implement global regex extraction utility `extractCanonicalH3Tokens(text: string): string[]` (`src/spatial/h3_grid.ts`)
- [ ] Implement standalone unit test verifying hexadecimal string validation constraints (`tests/sprint_035.test.ts`)
- [ ] Implement Uber H3 spatial ring generation utility functions (`src/spatial/h3_grid.ts`)
- [ ] Implement Uber H3 edge-neighbor mapping functions (`src/spatial/h3_grid.ts`)
- [ ] Discrete Topographic Insolation and Solar Zenith Angle formulation (`src/thermodynamics/insolation.ts`)
- [ ] Spatial-Thermodynamic State Tensor Routing and boundary heat flux operator (`src/spatial/tensor_router.ts`)
- [ ] Exergy & Entropy Generation Accounting and Gouy-Stodola theorem validation (`src/thermodynamics/exergy.ts`)
- [ ] Reference functions for thermal exergy streams using ambient temperature and source temperatures (`src/thermodynamics/carnot.ts`)
- [ ] Latent heat phase transitions and hydro-thermodynamic enthalpy feedback (`src/thermodynamics/phase_change.ts`)
- [ ] Stefan-Boltzmann incoming/outgoing energy balance equations with dynamic cloud-cover and albedo multipliers (`src/thermodynamics/radiative_balance.ts`)
- [ ] Dynamic Albedo & Cryospheric Radiation Balance Feedback (`src/thermodynamics/albedo.ts`)
- [ ] Biogeochemical Mass-Conservation Reservoirs for C, N, P, and Water (`src/monads/biogeochemical_cycles.ts`)

### Phase 2: Biosphere & Ecological Dynamics
- [x] Directed Acyclic Trophic Graphs and Lindeman's Efficiency energy transfer matrices (`src/biosphere/trophic.ts`)
- [ ] Plant Functional Types (PFT) and Consumer Guild trait interfaces (`src/biosphere/traits.ts`)
- [ ] Allometric metabolic scaling and Kleiber's Law basal respiration calculator (`src/biosphere/allometry.ts`)
- [ ] Implement `CSRMatrix` interface holding `values: number[]`, `columnIndices: number[]`, and `rowOffsets: number[]` (`src/biosphere/trophic_matrix.ts`)
- [ ] Implement `csrMultiplyVector` energy flux propagator across trophic interaction networks (`src/biosphere/trophic_matrix.ts`)
- [ ] Implement Gauss-Seidel steady-state biomass solver updating node biomass stocks (`src/biosphere/trophic_solver.ts`)
- [ ] Implement spectral radius and relative residual convergence checks ($\epsilon < 10^{-6}$) (`src/biosphere/trophic_solver.ts`)
- [ ] Implement C:N:P elemental stoichiometric constraint checker matching atomic baseline (`src/biosphere/redfield_ratio.ts`)
- [ ] Implement nutrient limitation penalty modifier scaling primary productivity (`src/biosphere/redfield_ratio.ts`)
- [ ] Holling Type II predator ingestion rate function with handling time parameters (`src/biosphere/holling_kinetics.ts`)
- [ ] Holling Type III sigmoidal consumption function with prey-switching refuge thresholds (`src/biosphere/holling_kinetics.ts`)
- [ ] Implement fungal sink strength calculation function $S_f = \frac{C_{\text{received}}}{N_{\text{transferred}} + P_{\text{transferred}}}$ for mycorrhizal networks (`src/biosphere/mycorrhizal_flows.ts`)
- [ ] Implement spatial hyphal network conductivity matrix mapping carbon translocation efficiency (`src/biosphere/mycorrhizal_flows.ts`)
- [ ] Add fungal maintenance respiration penalty function factoring in temperature-dependent soil enzyme activation energies (`src/biosphere/mycorrhizal_flows.ts`)
- [ ] Shannon-Wiener entropy metric calculation across spatial H3 node communities (`src/biosphere/diversity_metrics.ts`)
- [ ] Simpson's dominance and evenness index calculator (`src/biosphere/diversity_metrics.ts`)
- [ ] Stochastic Extinction, Bottleneck, and Minimum Viable Population engine (`src/biosphere/population_genetics.ts`)
- [ ] Implement dual-pool Soil Organic Matter tracking (Active and Passive SOM pools) (`src/geobiome/soil_matrix.ts`)
- [ ] Implement microbial necromass and temperature-dependent decomposition kinetics (`src/geobiome/soil_matrix.ts`)

### Phase 3: Technosphere & Industrial Metabolism
- [ ] Define `MaterialStream`, `EnergyCarrier`, and process thermodynamic condition interfaces (`src/technosphere/types.ts`)
- [ ] Abstract class `IndustrialProcessMonad extends ThermodynamicStructure` with First/Second Law enthalpy balances (`src/technosphere/industrial_monad.ts`)
- [ ] Implement minimum theoretical separation work calculation $\Delta G_{\text{sep}} = -RT \sum y_i \ln(y_i)$ (`src/technosphere/dac_thermodynamics.ts`)
- [ ] Solid-sorbent thermal regeneration energy requirement function for TSA cycles (`src/technosphere/dac.ts`, `src/technosphere/dac_solid_sorbent.ts`)
- [ ] Liquid-solvent calcium carbonate calcination enthalpy balance for caustic recovery (`src/technosphere/dac.ts`, `src/technosphere/dac_liquid_calciner.ts`)
- [ ] Parasitic electrical and thermal load simulation routing for solid and liquid DAC monads (`src/technosphere/dac.ts`)
- [ ] Implement stoichiometry solvers for olivine/basalt carbonation mass balances (`src/technosphere/basalt_carbonation.ts`)
- [ ] Model dissolution kinetics, local pH buffering, and exothermic reaction heat routing across subsurface H3 geological monads (`src/technosphere/basalt_carbonation.ts`)
- [ ] Implement carbothermal reduction stock-flow calculator for metallurgical silicon production (`src/technosphere/semiconductors_silicon.ts`)
- [ ] Siemens reactor chemical vapor deposition (CVD) mass-yield equations for polysilicon (`src/technosphere/semiconductors_silicon.ts`)
- [ ] Ultrapure water (UPW) and acid etching consumption balancer per semiconductor node (`src/technosphere/semiconductors_fab.ts`)
- [ ] Data center compute monad calculating FLOPs per Joule and thermal dissipation (`src/technosphere/compute_monad.ts`)
- [ ] Distance-dependent Joule heating loss calculation and thermal waste routing across H3 edges (`src/technosphere/energy_grid.ts`)
- [ ] Regional electrical transmission network capacity constraints and brownout penalties (`src/technosphere/energy_grid.ts`)
- [ ] Carnot efficiency bounding function and fuel-to-work conversion monads for thermal power plants (`src/technosphere/power_plants.ts`)
- [ ] Gouy-Stodola exergy destruction validation middleware for industrial sector Second Law auditing (`src/technosphere/exergy_grid.ts`)
- [ ] Heavy metal, microplastic, and xenobiotic industrial pollution spatial diffusion and bioaccumulation monads (`src/technosphere/industrial_pollution.ts`)
- [ ] Technospheric thermal waste routing interface into planetary boundary layers and biogeochemical cycles (`src/monads/technosphere_coupling.ts`)

### Phase 4: Blockchain Ledger & AI Symbiosis
- [ ] Implement RFC 8785 key-sorting and whitespace-stripping deterministic canonicalization (`src/ledger/vortex_serialization.ts`)
- [ ] Thermodynamic Vortex Block Chaining (`src/ledger/vortex_ledger.ts`)
- [ ] Verification middleware independently re-executing First and Second Law checks across block transactions (`src/ledger/poew_validator.ts`)
- [ ] Proof of Ecological Work (PoEW) validation middleware (`src/ledger/poew.ts`)
- [ ] SQLite schema definitions for append-only temporal vortex blocks (`db/schema.sql`)
- [ ] Multi-objective Pareto scoring function integrating human wellbeing, biospheric diversity, and planetary explorability (`src/optimization/pareto_objective.ts`)
- [ ] Multi-Objective AI Optimization Objective function integrating wellbeing, diversity, and explorability (`src/optimization/ai_symbiosis.ts`)

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

<!-- BACKLOG_END -->

---

## 6. Philosophy: The Earth as a Thermodynamic Blockchain

This project treats ecology as rigorous thermodynamic accounting, conceptualizing the **Earth Mega-POD as a macroscopic blockchain**. 

In this paradigm:
*   **Transactions** are the continuous exchanges of energy, matter, and information between biological and industrial sub-PODs.
*   **Consensus** is achieved through the strict laws of physics: a transaction is only valid if it perfectly respects the First Law of Thermodynamics ($\Delta \text{Mass} = 0$, Energy in = Energy out).
*   **Proof of Ecological Work (PoEW)** replaces arbitrary cryptographic hashing. The "work" is the actual exergy destroyed and entropy generated ($\Delta S \ge 0$) by maintaining far-from-equilibrium living systems. 
*   **Blocks** are sequential temporal snapshots (planetary "vortices") of the Earth's total thermodynamic state.

By rendering the code of reality explicit, transparent, and computable as an immutable ledger of physical limits, we enable artificial intelligence and humanity to co-steer Earth toward sustainable, long-term state persistence.

## License

MIT — see [LICENSE](https://github.com/pascalranoroarijaona/WebOfLife/blob/main/LICENSE).
