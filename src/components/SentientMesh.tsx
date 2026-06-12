"use client";

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, extend, useLoader } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import { SVGLoader, ParametricGeometry } from 'three-stdlib';
import { SentientShaderMaterial } from './shaders/SentientShaderMaterial';

// Register the custom shader material with React Three Fiber
extend({ SentientShaderMaterial });

export interface SentientMeshProps {
  activeObject: 'low-poly-fabric' | 'sphere' | 'box' | 'torus-knot' | 'cylinder' | 'klein-bottle' | 'mobius-strip' | 'svg';
  svgUrl?: string;
  complexity: 'low' | 'medium' | 'high';
  darkMode: boolean;
  themeColor: string;
  gradientAngle: number; // 0 to 360 degrees
  gradientSpread: number; // 0.0 to 1.0
  gradientFalloff: number; // 0.0 to 1.0
  breathType: 'individual-nodes' | 'uniform';
  intensity: number; // 0.0 to 2.0
  cadence: number; // 0.0 to 1.0
  pitch?: number; // X-axis rotation (radians)
  yaw?: number; // Y-axis rotation (radians)
  roll?: number; // Z-axis rotation (radians)
}


// Safe utility to subdivide straight lines/curves into multiple segments to inject more vertices
function subdividePath(path: THREE.Path, divisions: number): THREE.Path {
  const newPath = new THREE.Path();
  if (!path || !path.curves || path.curves.length === 0) return newPath;

  try {
    const firstCurve = path.curves[0];
    if (firstCurve && typeof firstCurve.getPoint === 'function') {
      const startPoint = firstCurve.getPoint(0);
      if (startPoint) {
        newPath.moveTo(startPoint.x, startPoint.y);
      }
    }

    for (const curve of path.curves) {
      if (curve && typeof curve.getPoint === 'function') {
        for (let i = 1; i <= divisions; i++) {
          const pt = curve.getPoint(i / divisions);
          if (pt) {
            newPath.lineTo(pt.x, pt.y);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error subdividing path:', e);
  }
  return newPath;
}

function subdivideShape(shape: THREE.Shape, divisions: number): THREE.Shape {
  const newShape = new THREE.Shape();
  if (!shape || !shape.curves || shape.curves.length === 0) return newShape;

  try {
    const firstCurve = shape.curves[0];
    if (firstCurve && typeof firstCurve.getPoint === 'function') {
      const startPoint = firstCurve.getPoint(0);
      if (startPoint) {
        newShape.moveTo(startPoint.x, startPoint.y);
      }
    }

    for (const curve of shape.curves) {
      if (curve && typeof curve.getPoint === 'function') {
        for (let i = 1; i <= divisions; i++) {
          const pt = curve.getPoint(i / divisions);
          if (pt) {
            newShape.lineTo(pt.x, pt.y);
          }
        }
      }
    }

    if (shape.holes && Array.isArray(shape.holes)) {
      newShape.holes = shape.holes.map((hole) => subdividePath(hole, divisions));
    }
  } catch (e) {
    console.error('Error subdividing shape:', e);
  }
  return newShape;
}

export default function SentientMesh({
  activeObject = 'sphere',
  svgUrl,
  complexity = 'high',
  darkMode = true,
  themeColor = '#ff4040',
  gradientAngle = 0,
  gradientSpread = 0.5,
  gradientFalloff = 0.5,
  breathType = 'individual-nodes',
  intensity = 0.35,
  cadence = 0.5,
  pitch = 0,
  yaw = 0,
  roll = 0,
}: SentientMeshProps) {
  const materialRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // 1. Handle SVG Loading safely (using rules of hooks - pass a fallback URL if svg is not selected)
  const defaultSvgFallback = '/img/logo/SVG/SM Logo icon.svg';
  const urlToLoad = activeObject === 'svg' && svgUrl ? svgUrl : defaultSvgFallback;
  const svgData = useLoader(SVGLoader, urlToLoad);

  // 2. Extract SVG shapes, subdivide curves to inject more vertices, and cache them
  const shapes = useMemo(() => {
    if (!svgData) return [];
    const rawShapes = svgData.paths.flatMap((path) => path.toShapes(true));
    
    // Choose division density based on complexity (inject up to 40 vertices per straight segment)
    const divisions = complexity === 'low' ? 3 : complexity === 'medium' ? 12 : 40;
    return rawShapes.map((shape) => subdivideShape(shape, divisions));
  }, [svgData, complexity]);

  // 3. Generate EdgesGeometry for SVG to remove triangulation wireframe lines
  const edgesGeometry = useMemo(() => {
    if (activeObject !== 'svg' || shapes.length === 0) return null;
    
    // Wire complexity to curveSegments (curved paths density) and steps (extrusion depth subdivisions)
    const curveSegs = complexity === 'low' ? 6 : complexity === 'medium' ? 24 : 128;
    const stepsVal = complexity === 'low' ? 1 : complexity === 'medium' ? 3 : 12;

    const extrude = new THREE.ExtrudeGeometry(shapes, { 
      depth: 320, 
      bevelEnabled: false,
      curveSegments: curveSegs,
      steps: stepsVal
    });
    
    // Center the geometry's vertices to enable symmetrical gradient mapping in the shader
    extrude.center();
    
    const edges = new THREE.EdgesGeometry(extrude);
    
    // Add dummy normals attribute to avoid WebGL attribute-binding warnings in the shader
    const count = edges.attributes.position.count;
    const dummyNormals = new Float32Array(count * 3);
    edges.setAttribute('normal', new THREE.BufferAttribute(dummyNormals, 3));
    
    extrude.dispose();
    return edges;
  }, [shapes, activeObject, complexity]);

  // Parametric shape functions for mathematical structures
  const parametricGeometries = useMemo(() => {
    // Figure-8 Klein Bottle
    const kleinFn = (u: number, v: number, target: THREE.Vector3) => {
      u *= Math.PI * 2;
      v *= Math.PI * 2;
      
      const r = 1.5;
      const x = (r + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.cos(u);
      const y = (r + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)) * Math.sin(u);
      const z = Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v);
      
      target.set(x * 0.9, y * 0.9, z * 0.9);
    };

    // Möbius Strip
    const mobiusFn = (u: number, v: number, target: THREE.Vector3) => {
      u = u - 0.5; // u is now in [-0.5, 0.5]
      v = v * 2 * Math.PI;

      const a = 1.5; // major radius
      const x = (a + u * Math.cos(v / 2)) * Math.cos(v);
      const y = (a + u * Math.cos(v / 2)) * Math.sin(v);
      const z = u * Math.sin(v / 2);

      target.set(x, y, z);
    };

    const slices = complexity === 'low' ? 16 : complexity === 'medium' ? 40 : 80;
    const stacks = complexity === 'low' ? 16 : complexity === 'medium' ? 40 : 80;

    const kleinGeom = new ParametricGeometry(kleinFn, slices, stacks);
    const mobiusGeom = new ParametricGeometry(mobiusFn, slices, stacks);

    return {
      klein: kleinGeom,
      mobius: mobiusGeom,
    };
  }, [complexity]);

  // Clean up geometries on unmount to avoid memory leaks
  React.useEffect(() => {
    return () => {
      parametricGeometries.klein.dispose();
      parametricGeometries.mobius.dispose();
    };
  }, [parametricGeometries]);

  // 4. Update shader time uniform on every frame — mesh/lines stay anchored, only vertices breathe
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime();
    }
  });

  // 5. Render appropriate geometry based on complexity & activeObject selection
  const renderGeometry = () => {
    switch (activeObject) {
      case 'low-poly-fabric': {
        const segments = complexity === 'low' ? 6 : complexity === 'medium' ? 24 : 60;
        // Plane oriented in the viewport
        return <planeGeometry args={[3.0, 3.0, segments, segments]} />;
      }
      case 'box': {
        const segments = complexity === 'low' ? 2 : complexity === 'medium' ? 6 : 12;
        return <boxGeometry args={[2.0, 2.0, 2.0, segments, segments, segments]} />;
      }
      case 'torus-knot': {
        const p = 2;
        const q = 3;
        const tubularSegments = complexity === 'low' ? 32 : complexity === 'medium' ? 64 : 128;
        const radialSegments = complexity === 'low' ? 4 : complexity === 'medium' ? 8 : 16;
        return <torusKnotGeometry args={[1.0, 0.35, tubularSegments, radialSegments, p, q]} />;
      }
      case 'cylinder': {
        const radialSegments = complexity === 'low' ? 8 : complexity === 'medium' ? 32 : 64;
        const heightSegments = complexity === 'low' ? 6 : complexity === 'medium' ? 24 : 48;
        return <cylinderGeometry args={[0.8, 0.8, 2.2, radialSegments, heightSegments]} />;
      }
      case 'klein-bottle': {
        return <primitive object={parametricGeometries.klein} attach="geometry" />;
      }
      case 'mobius-strip': {
        return <primitive object={parametricGeometries.mobius} attach="geometry" />;
      }
      case 'sphere':
      default: {
        const widthSegments = complexity === 'low' ? 8 : complexity === 'medium' ? 32 : 64;
        const heightSegments = complexity === 'low' ? 6 : complexity === 'medium' ? 24 : 48;
        return <sphereGeometry args={[1.8, widthSegments, heightSegments]} />;
      }
    }
  };

  const shaderEl = (
    /* @ts-ignore: Custom sentient shader registered via extend */
    <sentientShaderMaterial
      ref={materialRef}
      attach="material"
      wireframe={activeObject !== 'svg'}
      transparent={true}
      uTime={0.0}
      uDarkMode={darkMode ? 1.0 : 0.0}
      uThemeColor={new THREE.Color(themeColor)}
      uGradientAngle={gradientAngle}
      uGradientSpread={gradientSpread}
      uGradientFalloff={gradientFalloff}
      uBreathType={breathType === 'uniform' ? 1.0 : 0.0}
      uIntensity={intensity}
      uCadence={cadence}
      uIsSvg={activeObject === 'svg' ? 1.0 : 0.0}
    />
  );

  if (activeObject === 'svg') {
    if (!edgesGeometry) return null;
    return (
      <Center>
        <lineSegments
          ref={meshRef as any}
          scale={[0.003, -0.003, 0.003]}
          geometry={edgesGeometry}
          rotation={[pitch, yaw, roll]}
        >
          {shaderEl}
        </lineSegments>
      </Center>
    );
  }

  return (
    <Center>
      <mesh
        ref={meshRef}
        scale={[1, 1, 1]}
        rotation={[pitch, yaw, roll]}
      >
        {renderGeometry()}
        {shaderEl}
      </mesh>
    </Center>
  );
}
