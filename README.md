# SentientMesh

`sentient-mesh` is a high-performance, responsive React Three Fiber (R3F) component that renders an undulating, breathing 3D wireframe mesh with smooth mathematical gradients and custom shader dynamics.

It supports rendering standard 3D primitives (spheres, boxes, cylinders, torus knots) as well as complex mathematical topologies (Möbius strips, Klein bottles) and dynamic SVG curves.

---

## Installation

Ensure you have the required peer dependencies installed:

```bash
npm install three @react-three/fiber @react-three/drei three-stdlib
```

Then install the library (from npm or locally):

```bash
npm install sentient-mesh
```

---

## Basic Usage

Mount the `SentientMesh` component inside an R3F `<Canvas>` element:

```tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SentientMesh } from 'sentient-mesh';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <SentientMesh
          activeObject="mobius-strip"
          complexity="high"
          darkMode={true}
          themeColor="#FBE04C"
          gradientAngle={45}
          gradientSpread={0.5}
          gradientFalloff={0.5}
          breathType="individual-nodes"
          intensity={0.35}
          cadence={0.5}
        />
        
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
```

---

## Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `activeObject` | `SentientMeshShape` (e.g. `'sphere' \| 'box' \| 'torus-knot' \| 'cylinder' \| 'klein-bottle' \| 'mobius-strip' \| 'low-poly-fabric' \| 'svg' \| 'wormhole' \| 'black-hole' \| 'white-hole' \| 'torus' \| 'hyperboloid' \| 'dinis-surface' \| 'enneper-surface'`) | `'sphere'` | The target 3D shape or geometry to render. You can import the array of all available shapes using `SENTIENT_MESH_SHAPES` constant. |
| `svgUrl` | `string` | `undefined` | Path to load the SVG file from (only used if `activeObject="svg"`). |
| `complexity` | `'low' \| 'medium' \| 'high'` | `'high'` | Subdivision density of the geometry vertices. |
| `darkMode` | `boolean` | `true` | Toggles the base wireframe color (White in dark mode, Black in light mode). |
| `themeColor` | `string` | `'#ff4040'` | The hex color blended along the gradient transition. |
| `gradientAngle` | `number` | `0` | Angle in degrees (0-360) defining the gradient rotation direction. |
| `gradientSpread` | `number` | `0.5` | Extent of the color bleed (0.0 to 1.0). |
| `gradientFalloff` | `number` | `0.5` | Smoothness/width of the transition edge (0.0 to 1.0). |
| `breathType` | `'individual-nodes' \| 'uniform'` | `'individual-nodes'` | Breathing style: individual nodes undulate independently via noise, or the entire mesh breathes uniformly. |
| `intensity` | `number` | `0.35` | Amplitude of the breathing/wave displacement (0.0 to 2.0). |
| `cadence` | `number` | `0.5` | Speed multiplier of the breathing cycles (0.0 to 1.0). |

---

## License

MIT
