# Sprint 061 Contributor & Developer Guide: Spherical Boundary Segment Displacement Vectors

Welcome to the **Web of Life** developer community! Whether you are a computational geometer, a WebGL/WebGPU graphics engineer, or an Earth systems monad architect, this guide will orient you on the geometric primitives added in **Sprint 061** and show you how to start building upon the simulation engine.

---

## 1. Executive Overview & Sprint 061 Context

In **Sprint 061**, we introduced the geometric primitive `computeBoundarySegmentVector3D` in `src/spatial/h3_adjacency.ts` along with foundational data interfaces in `src/spatial/h3_types.ts`.

### Why Unnormalized Boundary Segment Vectors?
The Web of Life engine discretizes planetary geometry ($\mathbb{S}^2$) using Uber's Discrete Global Grid System (DGGS) via H3 hexagonal and pentagonal cells. Lateral transport of physical stocks—such as sensible heat ($U$), atmospheric water vapor ($Q_{H_2O}$), dissolved inorganic carbon ($DIC$), and dissolved oxygen ($O_2$)—is governed by Finite Volume Methods (FVM).

Conservative interfacial transfer requires exact, oriented boundary facet vectors. When evaluating flux across a segment between vertices $\mathbf{v}_A$ and $\mathbf{v}_B$:
$$\vec{\mathbf{L}}_{AB} = \mathbf{v}_B - \mathbf{v}_A \in \mathbb{R}^3$$

Retaining the **unnormalized** displacement vector is critical:
1. **Preserved Edge Lengths**: Chord and geodesic arc lengths are directly computed from $\|\vec{\mathbf{L}}_{AB}\|_2$ without duplicate normalization.
2. **Antisymmetric Interfacial Flux**: $\vec{\mathbf{L}}_{BA} = -\vec{\mathbf{L}}_{AB}$ guarantees discrete First Law conservation ($\Phi_{i \to j} = -\Phi_{j \to i}$).
3. **Directed Normal Bases**: The cross product of the radial midpoint vector $\hat{\mathbf{r}}_{edge}$ and $\vec{\mathbf{L}}_{AB}$ produces the outward facet normal in the local tangent plane ($\vec{\mathbf{n}}_{facet} = \hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}$).
4. **Stokesian Circulation Invariant**: For any closed cell polygon, $\sum_{k=1}^N \vec{\mathbf{L}}_{k, k+1} \equiv \mathbf{0}$.

---

## 2. Quickstart: Setting Up the Development Environment

Our project is built entirely with **TypeScript** and **Node.js**.

### Prerequisites
- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Git**

### Step-by-Step Setup
Clone the official repository and install project dependencies:

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (strictly via npm)
npm install
```

### Running Sprint 061 Tests
To verify your environment and validate the Sprint 061 geometric implementation:

```bash
# Execute Sprint 061 test suite using tsx runner
npx tsx tests/sprint_061.test.ts
```

> ⚠️ **Note**: Do **not** use `pip`, `python`, or `pytest`. Web of Life is a pure TypeScript/Node.js monorepo.

---

## 3. Architecture Deep-Dive: `computeBoundarySegmentVector3D`

### Core Interfaces (`src/spatial/h3_types.ts`)
```typescript
/**
 * 3D Cartesian vector or point in planetary coordinate space (ECEF frame).
 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Directed boundary segment between two spherical vertices.
 */
export interface BoundarySegment3D {
  readonly start: Vector3D;
  readonly end: Vector3D;
  readonly displacement: Vector3D;
  readonly chordLength: number;
  readonly arcLength?: number;
}
```

### Core Primitive (`src/spatial/h3_adjacency.ts`)
```typescript
import { Vector3D } from './h3_types';

/**
 * Calculates the unnormalized displacement vector from vertex v1 to vertex v2.
 * Vector = v2 - v1 = (x2 - x1, y2 - y1, z2 - z1).
 *
 * Invariant: computeBoundarySegmentVector3D(v1, v2) === -computeBoundarySegmentVector3D(v2, v1)
 *
 * @param v1 Starting spherical boundary vertex in 3D Cartesian coordinates.
 * @param v2 Ending spherical boundary vertex in 3D Cartesian coordinates.
 * @returns Unnormalized Vector3D representing displacement from v1 to v2.
 * @throws Error if any coordinate is NaN or non-finite.
 */
export function computeBoundarySegmentVector3D(v1: Vector3D, v2: Vector3D): Vector3D {
  if (
    !Number.isFinite(v1.x) || !Number.isFinite(v1.y) || !Number.isFinite(v1.z) ||
    !Number.isFinite(v2.x) || !Number.isFinite(v2.y) || !Number.isFinite(v2.z)
  ) {
    throw new Error('computeBoundarySegmentVector3D: All vertex coordinates must be finite numbers');
  }

  return {
    x: v2.x - v1.x,
    y: v2.y - v1.y,
    z: v2.z - v1.z
  };
}
```

### Usage Example in Downstream Modules
```typescript
import { computeBoundarySegmentVector3D } from '../spatial/h3_adjacency';
import { Vector3D } from '../spatial/h3_types';

const vA: Vector3D = { x: 6371008.8, y: 0.0, z: 0.0 };
const vB: Vector3D = { x: 6370000.0, y: 113450.0, z: 0.0 };

// Compute unnormalized boundary segment displacement
const segment = computeBoundarySegmentVector3D(vA, vB);

// Calculate chord length
const chordLength = Math.sqrt(segment.x ** 2 + segment.y ** 2 + segment.z ** 2);
console.log(`Chord length: ${chordLength} meters`);
```

---

## 4. Extension Points for Contributors

We actively invite contributors to extend the simulation in two high-impact areas:

### Extension Point A: Custom Thermodynamic Monads
The simulation advances state by composing pure thermodynamic monads across grid cells. You can author a new monad that interacts through interfacial boundary facets:

1. **Marine Carbonate Monad (`src/monads/marine_carbonate.ts`)**:
   - Model the precipitation and dissolution of calcium carbonate ($\text{CaCO}_3$) across oceanic layers.
   - Utilize boundary segment normals to compute lateral export of alkalinity ($Alk$) and dissolved inorganic carbon ($DIC$).
2. **Volcanic Outgassing Monad (`src/monads/volcanic_plume.ts`)**:
   - Introduce point-source injection of $\text{SO}_2$ and $\text{CO}_2$ into atmospheric columns.
   - Use `computeBoundarySegmentVector3D` to calculate advective dispersion across pentagonal hot-spots.
3. **Riparian Sediment Transport Monad (`src/monads/sediment_transport.ts`)**:
   - Calculate shear stress along cell boundaries using the boundary segment tangent vector to route suspended sediment into coastal marine cells.

### Extension Point B: WebGL / WebGPU Shader Visualizations
Rendering planetary DGGS grids at high frame rates requires specialized shaders:

1. **Interfacial Normal Area Shaders (`src/rendering/shaders/facet_normals.vert.glsl`)**:
   - Stream boundary segments directly into vertex buffer objects (VBOs).
   - Render outward normal arrows dynamically scaled by physical flux magnitude ($\mathbf{u} \cdot \mathbf{A}_{AB}$).
2. **Stokesian Circulation Contours (`src/rendering/shaders/circulation.frag.glsl`)**:
   - Compute vorticity and velocity curl using closed boundary loops $\oint_{\partial \Omega} \mathbf{u} \cdot d\vec{\mathbf{l}}$.
   - Render animated flow streamlines across H3 cell edges using instantaneous boundary vectors.
3. **Atmospheric Moisture River Shaders (`src/rendering/shaders/moisture_rivers.frag.glsl`)**:
   - Visualize atmospheric filamentary moisture transports with glowing edge-aligned ribbons.

---

## 5. Curated "Good First Issues"

Ready to contribute? Pick up one of these beginner-friendly, well-scoped tasks!

### Issue #1: [Good First Issue] Implement Geodesic Arc Length Clamping Utility
- **Area**: `src/spatial/h3_adjacency.ts`
- **Description**: When computing arc lengths from chord lengths via $2 R \arcsin(l / 2R)$, floating-point rounding can occasionally produce $l / (2R) > 1.0$ for near-antipodal vertices, causing `Math.asin` to return `NaN`.
- **Task**: Add a safe helper function `computeSafeArcLength(chordLength: number, radius: number): number` that clamps the ratio to $[-1.0, 1.0]$. Add test cases covering extreme and antipodal chord lengths in `tests/sprint_061.test.ts`.
- **Difficulty**: ⭐☆☆☆☆

### Issue #2: [Good First Issue] Add Vector3D Zero and Collinear Check Helper
- **Area**: `src/spatial/h3_types.ts` & `src/spatial/h3_adjacency.ts`
- **Description**: Boundary geometry operations frequently need to check whether a displacement vector is effectively degenerate (magnitude within numerical tolerance $\epsilon = 10^{-12}$).
- **Task**: Implement `isVector3DZero(v: Vector3D, epsilon?: number): boolean` and `areVectorsCollinear3D(v1: Vector3D, v2: Vector3D, tolerance?: number): boolean`.
- **Difficulty**: ⭐☆☆☆☆

### Issue #3: [Good First Issue] WebGL Segment Line Buffer Builder
- **Area**: `src/rendering/geometry/segment_buffer.ts`
- **Description**: WebGL lines require interleaved `Float32Array` or `Float64Array` buffers containing coordinates $(x_1, y_1, z_1, x_2, y_2, z_2)$.
- **Task**: Implement `createSegmentVertexArray(segments: BoundarySegment3D[]): Float32Array` to convert an array of boundary segments into packed buffer coordinates for OpenGL/WebGL `gl.LINES` drawing.
- **Difficulty**: ⭐⭐☆☆☆

### Issue #4: [Good First Issue] Closed Polygon Stokes Loop Validator
- **Area**: `src/spatial/h3_adjacency.ts`
- **Description**: DGGS cells are closed polygons. A closed boundary loop must sum to zero displacement: $\sum_{k=1}^N \vec{\mathbf{L}}_{k, k+1} = \mathbf{0}$.
- **Task**: Write `validateClosedBoundaryLoop(vertices: Vector3D[], tolerance?: number): boolean` that verifies the loop closure condition and throws an informative descriptive error if the loop is unclosed.
- **Difficulty**: ⭐⭐☆☆☆

---

## 6. Contribution & Review Guidelines

To ensure mathematical precision and code quality, please adhere to the following:

1. **Pure Functions & Immutability**: Spatial operations should not mutate input vectors. Always return new frozen or immutable objects.
2. **Double-Precision Standards**: Use native 64-bit IEEE 754 floats (`number`). Do not downcast to single-precision (`Float32`) inside core spatial algorithms unless explicitly interfacing with WebGL vertex attributes.
3. **Zero Allocation in Inner Loops**: In intensive simulation loops, avoid creating transient objects if possible. Cache vectors or use flat typed buffers.
4. **Testing Checklist**:
   - Every new spatial utility must have unit tests under `tests/`.
   - Run `npx tsx tests/sprint_061.test.ts` before submitting a PR.
   - Verify that your code adheres to zero-warning linting (`npm run lint` if configured).

---

## 7. Community & Communication

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Discussions & RFCs**: Submit architectural proposals via GitHub Issues tagged with `[RFC]`.
- **PR Titles**: Please format PR titles with your sprint or feature scope, e.g., `feat(spatial): add computeSafeArcLength helper`.

Thank you for contributing to the open-source modeling of Earth's living systems!