export const LaserBeamShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uHigh: { value: 0 },
    uBeatIntensity: { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vLocalPos;

    void main() {
      vUv = uv;
      vLocalPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uBass;
    uniform float uHigh;
    uniform float uBeatIntensity;

    varying vec2 vUv;
    varying vec3 vLocalPos;

    void main() {
      // Cylindrical coordinates: vLocalPos.y is along beam length [-18.0 .. +18.0]
      float zBeam = vLocalPos.y;
      float rCross = length(vLocalPos.xz);

      // 1. Core Gaussian Beam Waist Profile (TEM_00 mode)
      float beamWaist = 0.012;
      float coreIntensity = exp(-2.0 * (rCross * rCross) / (beamWaist * beamWaist));

      // 2. Optical Standing-Wave Intensity Nodes (lambda/2 spatial nodes traveling at c)
      float kWave = 3.8;
      float standingNode = pow(cos(zBeam * kWave - uTime * 14.0), 2.0);
      float nodeModulation = mix(0.75, 1.35, standingNode) * (1.0 + uHigh * 0.5);

      // 3. Longitudinal Cavity Bounce Pulse (280 round-trips photon containment)
      float bouncePulse = sin(zBeam * 0.45 - uTime * 6.0) * (uBeatIntensity * 0.4);

      // 4. End-Station Beam Baffling Falloff
      float endFalloff = 1.0 - smoothstep(16.0, 18.0, abs(zBeam));

      // 5. Total Beam Luminance
      float finalLuminance = coreIntensity * nodeModulation * (0.85 + bouncePulse) * endFalloff;

      gl_FragColor = vec4(vec3(finalLuminance), finalLuminance * 0.95);
    }
  `,
};
