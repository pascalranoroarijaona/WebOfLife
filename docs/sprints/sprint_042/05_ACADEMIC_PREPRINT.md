# Non-Equilibrium Planetary Column Thermodynamics Discretized on Hexagonal Hierarchical Spatial Meshes

**Author**: Pascal Ranoroarijaona & The WebOfLife Core Research Group  
**Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Sprint**: 042  
**Date**: October 2023  
**Status**: Academic Preprint & Public Research Outreach

---

## Abstract

Global planetary simulations require rigorous coupling between discrete spatial topologies and fundamental conservation laws. We present a discrete non-equilibrium thermodynamic formulation for planetary columns integrated over the Uber H3 discrete global grid system ($H3$). Each hexagonal cell column is formalized as an open control volume characterized by a 23-dimensional state tensor spanning thermal energy, composite heat capacity, radiative fluxes (shortwave absorption, longwave Stefan-Boltzmann dissipation), latent energy partitions, and invariant mass stocks across water phases and biogeochemical elements ($\text{C}, \text{N}, \text{P}$). We enforce the First and Second Laws of Thermodynamics at the interface level through immutable records, functional monadic transitions, and strict non-negative entropy generation invariants ($\sigma_c \ge 0$). This work provides the mathematical and computational foundation for massively distributed, energetically conservative Earth system modeling implemented in TypeScript.

---

## 1. Introduction & Physical Motivation

Coupled Earth System Models (ESMs) often suffer from numerical dissipation, energy drift, and mass non-conservation when transitioning between staggered continuous spatial meshes and non-linear physical parameterizations. Furthermore, spherical topological singularities (such as polar coordinate pinches in lat-long grids) create severe numerical artifacts and timestep constraints (CFL conditions).

The H3 hexagonal discrete global grid system provides equal-area hexagonal tessellations of the sphere with uniform topological adjacency ($|\mathcal{N}(c)| = 6$ for standard hexagonal cells, with exactly 12 pentagonal cells globally). However, existing discrete global grid implementations treat cells primarily as passive geographic indexers rather than thermodynamic control volumes.

In Sprint 042 of **WebOfLife**, we bridge this divide by formulating each hexagonal column as a non-equilibrium thermodynamic control volume governed by:
1. Exact First Law mass closure across vapor, liquid, and ice phases, as well as elemental carbon, nitrogen, and phosphorus stocks.
2. Exact First Law internal thermal energy conservation under solar insolation, longwave radiative cooling, and boundary transport.
3. Strict Second Law irreversible entropy production ($\sigma_c \ge 0$).

---

## 2. Control Volume Column Topology

Each hexagonal cell $c \in \mathcal{H}_r$ at resolution $r$ defines an atmospheric-lithospheric vertical column bounded horizontally by surface area $A_c\,[\text{m}^2]$ and elevation $z_c\,[\text{m}]$:

```
                 Top-of-Atmosphere / Deep Space (T_space = 2.725 K)
                 =================================================
                                    ^                 |
                 \Phi_{lw}^{out}    |                 | \Phi_{sw}^{in}
             (Stefan-Boltzmann)     |                 v
                               +----+-----------------+----+
                               |     H3 Atmospheric Column |
                               |     Dry Air, Water Vapor, |
                               |     CO2, N2, Aerosols     |
                               +----+-----------------+----+
                                    ^                 |
                  Latent & Sensible |                 | Direct Insolation
                       Turbulent    |                 v
                               +----+-----------------+----+
                               |   Surface / Lithosphere   |
   H3 Cell (k) <============== |   Liquid H2O, Ice/Snow,   | ==============> H3 Cell (m)
   Inter-cell Advective/       |   Biomass, Soil Carbon,   | Advective / Diffusive
   Diffusive Mass & Energy     |   Nitrogen, Phosphorus    | Flux Boundary
                               +---------------------------+
```

### 2.1 State Vector Representation

The instantaneous state of each hexagonal column is defined by vector $\mathbf{x}_c \in \mathbb{R}^{23}$:
$$\mathbf{x}_c = \begin{bmatrix}
A_c & z_c & U_c & T_c & C_{v, c} & \alpha_c & \epsilon_c & \Phi_{\text{sw}, c}^{\text{in}} & \Phi_{\text{sw}, c}^{\text{out}} & \Phi_{\text{lw}, c}^{\text{out}} & \Phi_{\text{sens}, c} & \Phi_{\text{lat}, c} & S_c & \sigma_c & M_d & M_{w} & M_{l} & M_{i} & M_{v} & M_{\text{C}} & M_{\text{N}} & M_{\text{P}}
\end{bmatrix}^T$$

---

## 3. Governing Thermodynamic Equations

### 3.1 First Law Formulation
The internal energy $U_c$ evolves according to incoming radiative exergy, outgoing blackbody emissions, turbulent fluxes, and adjacent cell transfers:
$$\frac{dU_c}{dt} = \left( (1 - \alpha_c)\Phi_{\text{sw}, c}^{\text{in}} - \epsilon_c \sigma T_c^4 - \Phi_{\text{sens}, c} - \Phi_{\text{lat}, c} \right) A_c + \sum_{k \in \mathcal{N}(c)} J_{E, k \to c}$$

Composite heat capacity $C_{v, c}$ aggregates lithospheric bedrock and multi-phase fluid columns:
$$C_{v, c} = M_d c_{v, d} + M_l c_w + M_i c_{\text{ice}} + M_v c_{v, \text{vap}} + M_{\text{lith}} c_{\text{soil}}$$
Absolute column temperature is dynamically evaluated as:
$$T_c = \frac{U_c}{C_{v, c}}$$

### 3.2 Second Law & Local Entropy Production
Local irreversibility $\sigma_c$ accounts for thermal degradation of incident solar radiation ($T_{\text{sun}} \approx 5778\,\text{K}$) to ambient column temperature $T_c$, as well as phase transition hysteresis:
$$\sigma_c = A_c (1 - \alpha_c)\Phi_{\text{sw}, c}^{\text{in}} \left( \frac{1}{T_c} - \frac{1}{T_{\text{sun}}} \right) + \left| \dot{Q}_{\text{lat}} \right| \cdot \left| \frac{1}{T_c} - \frac{1}{T_{\text{freeze}}} \right| \ge 0$$

### 3.3 Mass Conservation & Closure
The system enforces strict water conservation across phase shifts:
$$M_w = M_l + M_i + M_v, \quad \left| \frac{M_w - (M_l + M_i + M_v)}{M_w} \right| \le 10^{-7}$$
Isolated conservation holds for total dry air and biogeochemical elements:
$$\frac{d}{dt} \sum_{c \in \mathcal{H}} M_{k, c} = 0, \quad \forall k \in \{d, \text{C}, \text{N}, \text{P}\}$$

---

## 4. Software Realization & Monadic Architecture

Implemented in `src/spatial/h3_state_tensor.ts`, the module provides:
1. `H3CellThermodynamicState`: Readonly interface contract defining all scalar observables.
2. `H3CellThermodynamicRecord`: Pure immutable implementation with runtime verification of thermodynamic invariants (`assertInvariants()`) and copy-on-write transitions (`withUpdates()`).
3. `H3StateTensorContainer`: Indexed sparse/dense collection managing planetary lattices with batch reductions for conserved totals.

Pure state evolutions are mapped functionally via `SpatialMonad<H3CellThermodynamicRecord>`:
$$\mathcal{M}_{t + \Delta t} = \mathcal{M}_t.\text{bind}(f_{\text{radiation}}).\text{bind}(f_{\text{phase}}).\text{bind}(f_{\text{advection}})$$

---

## 5. Verification & Validation

The test suite in `tests/sprint_042.test.ts` executes automated checks confirming:
- Stefan-Boltzmann emission matches analytic $\epsilon \sigma T^4$ to within $10^{-6}\,\text{W/m}^2$.
- Water closure rejection triggers whenever $|M_w - \sum M_{\text{phase}}| > 10^{-7} M_w$.
- Entropy generation rates remain strictly positive across all non-equilibrium transitions.
- Mass and internal energy sums remain invariant across conservative advection exchanges.

---

## 6. Conclusion & Outlook

Sprint 042 provides the foundational thermodynamic state tensor for discrete hexagonal Earth simulations. Future sprints will leverage this tensor to drive high-resolution atmospheric boundary layer turbulence, biogeochemical stoichiometric carbon pumps, and WebGL GPGPU field compute pipelines.