import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

export const SentientShaderMaterial = shaderMaterial(
  // WebGL Uniforms
  {
    uTime: 0.0,
    uDarkMode: 1.0, // 1.0 = true (dark mode), 0.0 = false (light mode)
    uThemeColor: new THREE.Color('#FBE04C'),
    uGradientAngle: 0.0, // in degrees
    uGradientSpread: 0.5,
    uGradientFalloff: 0.5,
    uBreathType: 0.0, // 0.0 = individual-nodes, 1.0 = uniform
    uIntensity: 0.35,
    uCadence: 1.0,
    uIsSvg: 0.0, // 1.0 = true (SVG), 0.0 = false (primitives)
  },

  // VERTEX SHADER: The Breath
  `
    uniform float uTime;
    uniform float uBreathType;
    uniform float uIntensity;
    uniform float uCadence;
    uniform float uIsSvg;

    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    // Simplex 3D Noise by Stefan Gustavson
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - D.yyy;

      i = mod(i, 289.0 );
      vec4 p = permute( permute( permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      float n_ = 1.0/7.0;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vPosition = position;
      vNormal = normal;

      vec3 newPosition = position;

      if (uBreathType > 0.5) {
        // Uniform breathing: the entire mesh scales as one unit
        float scale = 1.0 + sin(uTime * 3.0 * uCadence) * uIntensity * 0.15;
        newPosition = position * scale;
      } else {
        // Individual-nodes breathing: each vertex displaced independently
        if (uIsSvg > 0.5) {
          // SVG extrusions have degenerate normals (flat 0,0,±1 on faces, zero on edges).
          // Displacing along those makes the whole shape bob uniformly.
          // Instead, compute a unique 3D displacement vector per vertex using 3 offset noise samples.
          vec3 noiseCoords = position * 0.003;
          float noiseX = snoise(noiseCoords + vec3(0.0, 0.0, 0.0));
          float noiseY = snoise(noiseCoords + vec3(31.416, 0.0, 0.0));
          float noiseZ = snoise(noiseCoords + vec3(0.0, 73.156, 0.0));

          // Each vertex gets its own phase from its unique noise fingerprint
          float phaseX = sin(uTime * 3.0 * uCadence + noiseX * 6.2831);
          float phaseY = sin(uTime * 3.0 * uCadence + noiseY * 6.2831);
          float phaseZ = sin(uTime * 3.0 * uCadence + noiseZ * 6.2831);

          vec3 displacement = vec3(phaseX, phaseY, phaseZ) * uIntensity * 35.0;
          newPosition = position + displacement;
        } else {
          // Primitives have well-defined normals — displace along normal
          vec3 noiseCoords = position * 1.5;
          float noiseVal = snoise(noiseCoords);
          float displacement = sin(uTime * 3.0 * uCadence + noiseVal * 6.2831) * uIntensity * 0.25;
          newPosition = position + normal * displacement;
        }
      }

      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  // FRAGMENT SHADER: The Optics
  `
    uniform float uTime;
    uniform float uDarkMode;
    uniform vec3 uThemeColor;
    uniform float uGradientAngle;
    uniform float uGradientSpread;
    uniform float uGradientFalloff;
    uniform float uIsSvg;

    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // 1. Determine base color (White for dark mode, Black for light mode)
      vec3 baseColor = (uDarkMode > 0.5) ? vec3(1.0) : vec3(0.0);

      // 2. Convert gradient angle from degrees to radians
      float angleRad = uGradientAngle * 3.14159265 / 180.0;

      // 3. Create 2D rotation matrix based on the angle
      mat2 rotMatrix = mat2(
        cos(angleRad), -sin(angleRad),
        sin(angleRad),  cos(angleRad)
      );

      // 4. Rotate local position coordinates (XY plane) to determine gradient vector
      vec2 localPos = (uIsSvg > 0.5) ? vPosition.xy * 0.01 : vPosition.xy;
      vec2 rotatedPos = rotMatrix * localPos;

      // 5. Calculate smoothstep parameters based on spread and falloff
      // Spread: dictates how far the themeColor bleeds across the object (center of transition)
      // Falloff: dictates the sharpness/width of the transition line
      float center = (1.0 - uGradientSpread) * 5.0 - 2.5; // Map spread to coordinates bounds [-2.5, 2.5]
      float width = (1.0 - uGradientFalloff) * 3.0 + 0.05; // Map falloff to transition width [0.05, 3.05]

      float edge0 = center - width * 0.5;
      float edge1 = center + width * 0.5;

      // Calculate the gradient value between 0.0 and 1.0
      float gradVal = smoothstep(edge0, edge1, rotatedPos.x);

      // 6. Blend uThemeColor with baseColor based on the calculated smoothstep transition
      vec3 finalColor = mix(uThemeColor, baseColor, gradVal);

      // 7. Perspective enhancements (Depth Falloff and Fresnel Outline Glow)
      // Depth falloff: Fade out the back of the object so it transitions into deep space
      float maxDepth = (uIsSvg > 0.5) ? 160.0 : 1.8;
      float depthFade = smoothstep(-maxDepth, maxDepth * 0.5, vPosition.z);

      // Fresnel outline glow: Silhouettes facing away from the camera glow brighter (only for primitives with valid normals)
      float viewGlow = 1.0;
      if (uIsSvg < 0.5 && length(vNormal) > 0.1) {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        // High glow at parallel viewing angles (perpendicular normals)
        viewGlow = pow(1.0 - abs(dot(normal, viewDir)), 2.5) * 0.8 + 0.2;
      }

      // 8. Output color with alpha mapped to the 3D perspective depth-fade
      gl_FragColor = vec4(finalColor, 0.85 * depthFade * viewGlow);
    }
  `
);
