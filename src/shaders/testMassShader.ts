export const TestMassShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uHigh: { value: 0 },
    uBeatIntensity: { value: 0 },
    uIntracavityPower: { value: 1.0 },
  },

  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;

    void main() {
      vLocalPos = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = mvPosition.xyz;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uBass;
    uniform float uHigh;
    uniform float uBeatIntensity;
    uniform float uIntracavityPower;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPos;
    varying vec3 vLocalPos;

    // Bessel J0 analytical approximation for drumhead acoustic modes
    float besselJ0(float x) {
      float x2 = x * x;
      return cos(x * 0.94) * exp(-x2 * 0.038);
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(-vViewPosition);

      // Key laboratory illumination vector
      vec3 keyLight = normalize(vec3(0.55, 1.35, 0.75));
      vec3 halfVec = normalize(keyLight + viewDir);

      // 1. Dielectric Specular Highlight (Fused-Silica Optics, refractive index n = 1.458)
      float spec = pow(max(dot(normal, halfVec), 0.0), 96.0) * 0.85;

      // 2. Razor-thin Silhouette Fresnel Rim (Brewster / Total Internal Reflection)
      float NdotV = max(dot(normal, viewDir), 0.0);
      float fresnel = pow(1.0 - NdotV, 3.8);
      float rimLight = fresnel * (0.85 + uBeatIntensity * 1.25);

      // 3. Mirror Face vs Cylindrical Barrel Discrimination (Height = 1.0m, R = 1.7m)
      float rFace = length(vLocalPos.xz);
      float faceAngle = atan(vLocalPos.z, vLocalPos.x);
      bool isFace = abs(vLocalPos.y) > 0.485;

      vec3 surfaceColor = vec3(0.022); // Pure deep monolithic fused-silica obsidian void

      if (isFace) {
        // --- DIELECTRIC BRAGG MIRROR COATING (Bond et al. 2016) ---
        float w0 = 0.58;
        vec2 beamCoord = vLocalPos.xz / w0;
        float rSq = dot(beamCoord, beamCoord);

        // A. Fundamental Gaussian Laser Mode (TEM_00)
        float tem00 = exp(-2.0 * rSq);

        // B. Quadrupole Higher-Order Spatial Mode HG_20 (Bond et al. 2016)
        float hg20 = (4.0 * beamCoord.x * beamCoord.x - 2.0) * exp(-rSq);
        float modeMixing = uBass * 0.45 + uBeatIntensity * 0.35;
        
        // Coherent mode superposition: |TEM_00 + alpha * HG_20|^2
        float compositeLaser = pow(max(0.0, tem00 + hg20 * modeMixing), 1.6);
        float laserSpot = compositeLaser * (0.55 + uBeatIntensity * 0.85) * uIntracavityPower;

        // C. Optomechanical Parametric Instability: Acoustic Drumhead Modes (Evans et al. 2015 PRL)
        // Acoustic elastic resonance mode at ~15-40 kHz: J_0(k*r) * cos(2*theta)
        float drumheadAcoustic = besselJ0(rFace * 4.4) * cos(2.0 * faceAngle) * (uBass * 0.22);
        
        // D. Macroscopic Ponderomotive Quantum Recoil below SQL (Yu et al. 2020 Nature)
        float quantumRecoil = sin(uTime * 38.0 + rFace * 7.5) * (uIntracavityPower * 0.045);

        // E. Precision Optical Aperture Chamfer Ring at r = 1.48m
        float chamferDist = abs(rFace - 1.48);
        float chamferRing = (1.0 - smoothstep(0.0, 0.025, chamferDist)) * 0.75;

        // F. Inner Sub-Aperture Reference Circle at r = 0.85m
        float subAperture = (1.0 - smoothstep(0.0, 0.015, abs(rFace - 0.85))) * 0.35;

        // G. Anisotropic Dielectric Sheen along the optical crystal axis
        float radialSheen = pow(abs(dot(normalize(vLocalPos.xz), vec2(0.707, 0.707))), 16.0) * 0.18;

        surfaceColor += vec3(laserSpot) + vec3(chamferRing) + vec3(subAperture) + vec3(radialSheen)
                      + vec3(drumheadAcoustic) + vec3(quantumRecoil);
      } else {
        // --- GROUND FUSED-SILICA BARREL (Aston et al. 2012) ---
        // A. 4 Monolithic Laser Welding Ear Flats at 45, 135, 225, 315 degrees
        float angle = atan(vLocalPos.z, vLocalPos.x);
        float earFlat = pow(abs(cos(2.0 * angle)), 18.0) * 0.22;

        // B. Equator Optical Cavity Laser Reflection Band
        float equatorBand = exp(-pow(vLocalPos.y * 10.0, 2.0)) * (0.28 + uBass * 0.45);

        // C. Precision Vertical Micrometer Calibration Scale (128 ticks around barrel)
        float tickAngle = fract(angle * 20.3718); // 128 divisions
        float tick = (1.0 - smoothstep(0.0, 0.04, abs(tickAngle - 0.5))) * 0.15;

        // D. Upper & Lower Mechanical Bevel Rings
        float bevelEdge = smoothstep(0.42, 0.485, abs(vLocalPos.y)) * 0.45;

        surfaceColor += vec3(earFlat) + vec3(equatorBand) + vec3(tick) + vec3(bevelEdge);
      }

      // Master Composition: Monolithic Black Base + Surface Features + Specular + Rim
      vec3 finalColor = surfaceColor + vec3(spec) + vec3(rimLight);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
