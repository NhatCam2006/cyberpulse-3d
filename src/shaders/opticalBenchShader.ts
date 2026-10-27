export const OpticalBenchShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uBass;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    float hairline(float dist, float widthPx) {
      float fw = fwidth(dist);
      return 1.0 - smoothstep(0.0, fw * widthPx, abs(dist));
    }

    void main() {
      // World coordinates across 36m x 36m optical table
      vec2 coord = vWorldPos.xz;
      float r = length(coord);

      if (r > 17.5) {
        discard;
      }

      // 1. Primary 1-Meter Metric Grid Lines
      vec2 gridDist = abs(fract(coord - 0.5) - 0.5);
      float gridX = hairline(gridDist.x, 1.1);
      float gridZ = hairline(gridDist.y, 1.1);
      float grid = max(gridX, gridZ) * 0.12;

      // 2. Precision Crosshair Registration Marks (+) at 2-Meter Intersections
      vec2 crossCoord = abs(fract(coord * 0.5 - 0.5) - 0.5) * 2.0;
      float isNearCross = step(crossCoord.x, 0.08) * step(crossCoord.y, 0.08);
      float crossLine = max(hairline(crossCoord.x, 1.0), hairline(crossCoord.y, 1.0)) * isNearCross * 0.28;

      // 3. Concentric Radial Range Rings at 4m, 8m, 12m, 16m
      float ring4  = hairline(r - 4.0,  1.1) * 0.22;
      float ring8  = hairline(r - 8.0,  1.1) * 0.18;
      float ring12 = hairline(r - 12.0, 1.1) * 0.15;
      float ring16 = hairline(r - 16.0, 1.1) * 0.12;
      float metricRings = ring4 + ring8 + ring12 + ring16;

      // 4. Subtle Radial Laser Vignette Falloff
      float vignette = 1.0 - smoothstep(12.0, 17.5, r);

      float totalLuminance = (grid + crossLine + metricRings) * vignette;

      gl_FragColor = vec4(vec3(totalLuminance), totalLuminance * 0.85);
    }
  `,
};
