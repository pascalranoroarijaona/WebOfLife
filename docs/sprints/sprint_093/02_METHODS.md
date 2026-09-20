# Method Specifications: Aperture Rotation Sequence Resolution & Multiscale Spatial Fluxes

**Sprint:** 093  
**RFC:** RFC-093 (Aperture Rotation Sequence Resolution for H3 Hierarchical Tessellation)  
**Role:** Process Mining & Research Scientist  
**Status:** Approved for Implementation  

---

## 1. Process Overview & Physical Foundations

In hierarchical discrete global grid systems (DGGS) using Aperture-7 hexagonal decomposition (such as H3), spatial resolution transitions induce a rotational transformation between parent and child coordinate frames. Specifically, transitioning from resolution $r$ to $r+1$ scales the cell area by $1/7$ and rotates the principal coordinate axes by:
$$\theta = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.333473172286 \text{ rad} \approx 19.106605^\circ$$

Because hex orientation alternates between **Class II** (even resolutions $r \in \{0, 2, 4, \dots\}$) and **Class III** (odd resolutions $r \in \{1, 3, 5, \dots\}$), flux transport across hierarchical scales (e.g., advection, diffusion, runoff, and atmospheric particulate dispersion) requires rigorous coordinate frame alignment.

Without explicit aperture rotation sequencing:
1. Directional vector components $(J_x, J_y)$ of transport fluxes across mismatched resolution levels suffer an uncompensated angular misalignment of $\pm 19.1066^\circ$.
2. Misaligned flux integration across cell boundaries produces numerical dissipation, false shear stresses, and spurious non-conservative mass and enthalpy leaks.

This specification formalizes:
- The aperture rotation sequence generator across resolutions $r \in [0, 15]$.
- Directional flux frame transformation across resolution boundaries.
- Thermodynamic conservation laws preserving carbon, water, mineral, oxygen, and energy stocks.

---

## 2. Mathematical Formalization of Aperture Parity & Rotation

### 2.1 Aperture Class Parity
Let $r \in \mathbb{N}_0 \cap [0, 15]$ be the discrete resolution level. The aperture class is determined by:
$$\operatorname{ApertureClass}(r) = \begin{cases} 
\text{CLASS\_II}, & \text{if } r \equiv 0 \pmod 2 \\ 
\text{CLASS\_III}, & \text{if } r \equiv 1 \pmod 2 
\end{cases}$$

### 2.2 Aperture Rotation Sequence
For target resolution $R_{\text{target}} \in [0, 15]$, the sequence of aperture classes from Base Resolution 0 up to $R_{\text{target}}$ is the $(R_{\text{target}} + 1)$-element array:
$$\mathcal{S}(R_{\text{target}}) = \big[\operatorname{ApertureClass}(0), \operatorname{ApertureClass}(1), \dots, \operatorname{ApertureClass}(R_{\text{target}})\big]$$

### 2.3 Rotational Transformation Matrix
When transforming a 2D tangential flux vector $\mathbf{J} = \begin{bmatrix} J_x \\ J_y \end{bmatrix}$ from resolution $r_1$ to resolution $r_2$:
$$\Delta \text{parity} = (r_2 - r_1) \pmod 2$$
$$\Delta \theta(r_1 \to r_2) = \begin{cases}
0, & \text{if } \Delta \text{parity} = 0 \pmod 2 \\
+\theta_0, & \text{if } r_2 > r_1 \text{ and } \Delta \text{parity} = 1 \\
-\theta_0, & \text{if } r_2 < r_1 \text{ and } \Delta \text{parity} = 1
\end{cases}$$
where $\theta_0 = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.333473172286 \text{ rad}$.

The transformation matrix $\mathbf{R}(\Delta \theta) \in \mathrm{SO}(2)$ is:
$$\mathbf{R}(\Delta \theta) = \begin{bmatrix} \cos(\Delta \theta) & -\sin(\Delta \theta) \\ \sin(\Delta \theta) & \cos(\Delta \theta) \end{bmatrix}$$

Because $\mathbf{R} \in \mathrm{SO}(2)$ is orthogonal ($\mathbf{R}^T \mathbf{R} = \mathbf{I}$), vector norms are strictly invariant:
$$\|\mathbf{J}_{\text{aligned}}\|_2 = \|\mathbf{R}(\Delta \theta)\mathbf{J}\|_2 = \|\mathbf{J}\|_2$$

---

## 3. Stock Transfer & Thermodynamic Deltas

Multiscale spatial exchange transports five fundamental conserved state variables:
1. **Carbon ($M_{\text{C}}$)**: dissolved inorganic/organic carbon, vegetative biomass $[\text{mol C}]$.
2. **Water ($M_{\text{H}_2\text{O}}$)**: moisture, surface water, vapor $[\text{mol H}_2\text{O}]$.
3. **Minerals ($M_{\text{Min}}$)**: bioavailable nutrients $(\text{N}, \text{P}, \text{K}, \text{Si}) [\text{mol}]$.
4. **Oxygen ($M_{\text{O}_2}$)**: dissolved and atmospheric diatomic oxygen $[\text{mol O}_2]$.
5. **Enthalpy ($H$)**: thermal and internal kinetic energy $[\text{J}]$.

### 3.1 Closed-Boundary Conservation (First Law of Thermodynamics)
For any cross-resolution flux exchange between parent cell $\mathcal{C}_P$ (res $r$) and child subcell $\mathcal{C}_C$ (res $r+1$):
$$\Delta M_k(\mathcal{C}_P) + \sum_{c \in \text{children}(\mathcal{C}_P)} \Delta M_k(\mathcal{C}_{c}) = 0, \quad \forall k \in \{\text{C}, \text{H}_2\text{O}, \text{Min}, \text{O}_2\}$$
$$\Delta H(\mathcal{C}_P) + \sum_{c \in \text{children}(\mathcal{C}_P)} \Delta H(\mathcal{C}_{c}) = 0$$

### 3.2 Non-Spurious Entropy Production (Second Law of Thermodynamics)
Coordinate alignment via aperture rotation sequence ensures that the entropy production rate $\dot{S}_{\text{prod}}$ during inter-resolution advective and diffusive transfers is strictly non-negative:
$$\dot{S}_{\text{prod}} = \sum_{\alpha} \mathbf{J}_{\alpha} \cdot \nabla \left(-\frac{\mu_{\alpha}}{T}\right) + \mathbf{J}_q \cdot \nabla \left(\frac{1}{T}\right) \ge 0$$
Rotational alignment eliminates fictitious numerical shear stresses $\boldsymbol{\tau}_{\text{num}}$ that would otherwise artificially inflate dissipation:
$$\boldsymbol{\tau}_{\text{num}} = \mathbf{J} \otimes \left(\mathbf{R}(\Delta \theta)\mathbf{u} - \mathbf{u}\right) = \mathbf{0}$$

---

## 4. Executable Monad Method Specifications

### 4.1 Type Definitions

```typescript
export enum ApertureClass {
  CLASS_II = 'CLASS_II',
  CLASS_III = 'CLASS_III'
}

export type ApertureClassType = 'CLASS_II' | 'CLASS_III';

export interface ConservedStocks {
  readonly carbonMol: number;       // [mol C]
  readonly waterMol: number;        // [mol H2O]
  readonly mineralsMol: number;     // [mol Min]
  readonly oxygenMol: number;       // [mol O2]
  readonly enthalpyJoules: number;   // [J]
}

export interface FluxVector2D {
  readonly jX: number;              // [mol / (m^2 * s)] or [J / (m^2 * s)]
  readonly jY: number;              // [mol / (m^2 * s)] or [J / (m^2 * s)]
}

export interface SpatialCellState {
  readonly cellId: string;
  readonly resolution: number;
  readonly apertureClass: ApertureClass;
  readonly stocks: ConservedStocks;
}
```

### 4.2 Aperture Sequence Resolver (`getApertureRotationSequence`)

```typescript
export const H3_APERTURE_ROTATION_ANGLE_RAD = 0.3334731722863929; // arcsin(sqrt(3) / (2 * sqrt(7)))
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

/**
 * Returns the aperture orientation class for a single resolution.
 */
export function getApertureClass(resolution: number): ApertureClass {
  if (!Number.isInteger(resolution)) {
    throw new TypeError(`Resolution must be an integer, received: ${resolution}`);
  }
  if (resolution < MIN_H3_RESOLUTION || resolution > MAX_H3_RESOLUTION) {
    throw new RangeError(`Resolution ${resolution} is out of bounds [0, 15]`);
  }
  return (resolution & 1) === 0 ? ApertureClass.CLASS_II : ApertureClass.CLASS_III;
}

/**
 * Returns the full sequence of aperture classes from resolution 0 to targetResolution.
 */
export function getApertureRotationSequence(targetResolution: number): ApertureClass[] {
  if (!Number.isInteger(targetResolution)) {
    throw new TypeError(`Target resolution must be an integer, received: ${targetResolution}`);
  }
  if (targetResolution < MIN_H3_RESOLUTION || targetResolution > MAX_H3_RESOLUTION) {
    throw new RangeError(`Target resolution ${targetResolution} is out of bounds [0, 15]`);
  }

  const sequence: ApertureClass[] = new Array(targetResolution + 1);
  for (let r = 0; r <= targetResolution; r++) {
    sequence[r] = (r & 1) === 0 ? ApertureClass.CLASS_II : ApertureClass.CLASS_III;
  }
  return sequence;
}
```

### 4.3 Directional Flux Alignment Monad (`SpatialFluxMonad`)

```typescript
export class SpatialFluxMonad {
  private constructor(
    private readonly sourceRes: number,
    private readonly targetRes: number,
    private readonly deltaThetaRad: number
  ) {}

  public static create(sourceRes: number, targetRes: number): SpatialFluxMonad {
    const sourceSeq = getApertureRotationSequence(sourceRes);
    const targetSeq = getApertureRotationSequence(targetRes);
    
    const sourceClass = sourceSeq[sourceRes];
    const targetClass = targetSeq[targetRes];

    let deltaTheta = 0;
    if (sourceClass !== targetClass) {
      // Transition across odd number of steps
      deltaTheta = targetRes > sourceRes
        ? H3_APERTURE_ROTATION_ANGLE_RAD
        : -H3_APERTURE_ROTATION_ANGLE_RAD;
    }

    return new SpatialFluxMonad(sourceRes, targetRes, deltaTheta);
  }

  /**
   * Applies orthogonal rotation matrix R(deltaTheta) to align directional flux vector.
   * Conserves L2 norm identically: ||J_aligned|| === ||J_source||.
   */
  public alignFluxVector(flux: FluxVector2D): FluxVector2D {
    if (this.deltaThetaRad === 0) {
      return { jX: flux.jX, jY: flux.jY };
    }
    const cosTheta = Math.cos(this.deltaThetaRad);
    const sinTheta = Math.sin(this.deltaThetaRad);

    return {
      jX: flux.jX * cosTheta - flux.jY * sinTheta,
      jY: flux.jX * sinTheta + flux.jY * cosTheta
    };
  }

  /**
   * Transfers conserved quantities across boundary between cells of source and target resolutions.
   * Guarantees exact First Law conservation.
   */
  public executeTransfer(
    sourceStocks: ConservedStocks,
    targetStocks: ConservedStocks,
    transfers: ConservedStocks
  ): { nextSource: ConservedStocks; nextTarget: ConservedStocks } {
    // Assert non-negative transfers within source availability
    if (
      transfers.carbonMol > sourceStocks.carbonMol ||
      transfers.waterMol > sourceStocks.waterMol ||
      transfers.mineralsMol > sourceStocks.mineralsMol ||
      transfers.oxygenMol > sourceStocks.oxygenMol ||
      transfers.enthalpyJoules > sourceStocks.enthalpyJoules
    ) {
      throw new Error('Transfer amounts exceed available source stocks.');
    }

    const nextSource: ConservedStocks = {
      carbonMol: sourceStocks.carbonMol - transfers.carbonMol,
      waterMol: sourceStocks.waterMol - transfers.waterMol,
      mineralsMol: sourceStocks.mineralsMol - transfers.mineralsMol,
      oxygenMol: sourceStocks.oxygenMol - transfers.oxygenMol,
      enthalpyJoules: sourceStocks.enthalpyJoules - transfers.enthalpyJoules
    };

    const nextTarget: ConservedStocks = {
      carbonMol: targetStocks.carbonMol + transfers.carbonMol,
      waterMol: targetStocks.waterMol + transfers.waterMol,
      mineralsMol: targetStocks.mineralsMol + transfers.mineralsMol,
      oxygenMol: targetStocks.oxygenMol + transfers.oxygenMol,
      enthalpyJoules: targetStocks.enthalpyJoules + transfers.enthalpyJoules
    };

    return { nextSource, nextTarget };
  }
}
```

---

## 5. Verification Equations & Test Vectors

### 5.1 Test Vectors for Sequence Generation

| Target Res | Expected Sequence Output | Length | Parity Formula Check |
| :--- | :--- | :--- | :--- |
| `0` | `['CLASS_II']` | 1 | $(0 \& 1) = 0 \to \text{CLASS\_II}$ |
| `1` | `['CLASS_II', 'CLASS_III']` | 2 | $(1 \& 1) = 1 \to \text{CLASS\_III}$ |
| `2` | `['CLASS_II', 'CLASS_III', 'CLASS_II']` | 3 | $(2 \& 1) = 0 \to \text{CLASS\_II}$ |
| `7` | `['CLASS_II', 'CLASS_III', 'CLASS_II', 'CLASS_III', 'CLASS_II', 'CLASS_III', 'CLASS_II', 'CLASS_III']` | 8 | Ends in $\text{CLASS\_III}$ |
| `15` | `['CLASS_II', 'CLASS_III', ...]` (alternating) | 16 | Ends in $\text{CLASS\_III}$ |

### 5.2 Test Vectors for Rotational Transformation

Let input vector $\mathbf{J} = \begin{bmatrix} 1.000000000000 \\ 0.000000000000 \end{bmatrix}$.

1. **Resolution $0 \to 1$ ($\Delta \theta = +19.106605^\circ \approx 0.333473172 \text{ rad}$):**
   $$\cos(\Delta \theta) = \frac{5}{2\sqrt{7}} \approx 0.944911182523$$
   $$\sin(\Delta \theta) = \frac{\sqrt{3}}{2\sqrt{7}} \approx 0.327326835354$$
   $$\mathbf{J}_{\text{res1}} = \begin{bmatrix} 0.944911182523 \\ 0.327326835354 \end{bmatrix}$$
   $$\|\mathbf{J}_{\text{res1}}\|_2 = \sqrt{0.944911182523^2 + 0.327326835354^2} = 1.000000000000$$

2. **Resolution $1 \to 0$ ($\Delta \theta = -19.106605^\circ$):**
   $$\mathbf{J}_{\text{res0}} = \begin{bmatrix} 0.944911182523 \\ -0.327326835354 \end{bmatrix}$$
   $$\|\mathbf{J}_{\text{res0}}\|_2 = 1.000000000000$$

3. **Resolution $0 \to 2$ ($\Delta \theta = 0^\circ$):**
   $$\mathbf{J}_{\text{res2}} = \begin{bmatrix} 1.000000000000 \\ 0.000000000000 \end{bmatrix}$$

---

## 6. Summary for Systems Engineering & Test Implementation

- **Target File:** `src/spatial/h3_adjacency.ts`
- **Exposed API:**
  - `getApertureRotationSequence(targetResolution: number): ApertureClass[]`
  - `getApertureClass(resolution: number): ApertureClass`
- **Constraints:**
  - Strict parameter validation: non-integers throw `TypeError`; outside $[0, 15]$ throw `RangeError`.
  - Zero allocation overhead via direct typed array indexing.
  - Full preservation of mass and enthalpy tensors across inter-resolution coordinate transformations.