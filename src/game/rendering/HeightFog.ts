import * as THREE from 'three';

/**
 * Patches three.js's fog so it behaves more like air: thicker in the hollows,
 * thinner higher up, and with a low band of mist over the ground in the middle
 * distance. Far away, everything still fades fully into the sky colour.
 *
 * Applied once, before any material compiles. It only changes the shared fog
 * chunks, so every material that uses fog gets it.
 */
let isApplied = false;

export function applyHeightFog(): void {
  if (isApplied) return;
  isApplied = true;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;

  chunks.fog_pars_vertex = /* glsl */`
    #ifdef USE_FOG
      varying float vFogDepth;
      varying float vFogHeight;
    #endif
  `;

  // mvPosition exists in every shader that uses fog, sprites included
  chunks.fog_vertex = /* glsl */`
    #ifdef USE_FOG
      vFogDepth = - mvPosition.z;
      vFogHeight = (inverse(viewMatrix) * vec4(mvPosition.xyz, 1.0)).y;
    #endif
  `;

  chunks.fog_pars_fragment = /* glsl */`
    #ifdef USE_FOG
      uniform vec3 fogColor;
      varying float vFogDepth;
      varying float vFogHeight;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
    #endif
  `;

  chunks.fog_fragment = /* glsl */`
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
        // Thinner above the ground, but only up close: far off, the land still melts into the sky
        float heightFade = mix(1.0, mix(0.5, 1.0, exp(-max(vFogHeight - 1.0, 0.0) * 0.09)), 1.0 - smoothstep(70.0, 180.0, vFogDepth));
        fogFactor *= heightFade;
        // A band of mist lying on the ground, out in the middle distance
        float groundMist = (1.0 - smoothstep(0.0, 1.8, vFogHeight)) * smoothstep(8.0, 45.0, vFogDepth) * 0.28;
        fogFactor = max(fogFactor, groundMist);
      #else
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      #endif
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif
  `;
}
