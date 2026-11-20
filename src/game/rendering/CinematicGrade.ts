import * as THREE from 'three';

/**
 * A level's colour grade, applied after tone mapping. Shadows and highlights
 * take separate tints, so a scene can be cold in the dark and warm in the light.
 */
export interface ColorGrade {
  shadows: [number, number, number];
  highlights: [number, number, number];
  saturation: number;
  /** 0 is flat; 1 is a strong S-curve. */
  contrast: number;
  /** Added to the darkest tones. Negative crushes the blacks. */
  lift: number;
  vignette: number;
}

export const DEFAULT_GRADE: ColorGrade = {
  shadows: [0.9, 1.0, 1.12],
  highlights: [1.06, 1.0, 0.92],
  saturation: 1.14,
  contrast: 0.35,
  lift: 0,
  vignette: 0.5,
};

export const MAX_HAZE_SOURCES = 6;

/**
 * The last pass: colour grade, heat haze, a streak of motion blur on dashes,
 * vignette and film grain. Everything here works in display space.
 */
export const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uShadows: { value: new THREE.Vector3(...DEFAULT_GRADE.shadows) },
    uHighlights: { value: new THREE.Vector3(...DEFAULT_GRADE.highlights) },
    uSaturation: { value: DEFAULT_GRADE.saturation },
    uContrast: { value: DEFAULT_GRADE.contrast },
    uLift: { value: DEFAULT_GRADE.lift },
    uVignette: { value: DEFAULT_GRADE.vignette },
    uBlurDirection: { value: new THREE.Vector2() },
    uBlurAmount: { value: 0 },
    /** xy: screen position, z: radius in screen heights, w: strength. */
    uHaze: { value: Array.from({ length: MAX_HAZE_SOURCES }, () => new THREE.Vector4()) },
    uHazeCount: { value: 0 },
    uAspect: { value: 1 },
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uFxaa: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    #define MAX_HAZE ${MAX_HAZE_SOURCES}
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform vec3 uShadows;
    uniform vec3 uHighlights;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uLift;
    uniform float uVignette;
    uniform vec2 uBlurDirection;
    uniform float uBlurAmount;
    uniform vec4 uHaze[MAX_HAZE];
    uniform int uHazeCount;
    uniform float uAspect;
    uniform vec2 uTexel;
    uniform float uFxaa;
    varying vec2 vUv;

    float random(vec2 p) {
      return fract(sin(dot(p + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // A light FXAA, for when there's no multisampling to smooth the edges
    vec3 fxaa(vec2 uv) {
      vec3 rgbM = texture2D(tDiffuse, uv).rgb;
      vec3 rgbNW = texture2D(tDiffuse, uv + vec2(-1.0, -1.0) * uTexel).rgb;
      vec3 rgbNE = texture2D(tDiffuse, uv + vec2(1.0, -1.0) * uTexel).rgb;
      vec3 rgbSW = texture2D(tDiffuse, uv + vec2(-1.0, 1.0) * uTexel).rgb;
      vec3 rgbSE = texture2D(tDiffuse, uv + vec2(1.0, 1.0) * uTexel).rgb;
      vec3 luma = vec3(0.299, 0.587, 0.114);
      float lNW = dot(rgbNW, luma), lNE = dot(rgbNE, luma), lSW = dot(rgbSW, luma), lSE = dot(rgbSE, luma), lM = dot(rgbM, luma);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
      float scale = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
      dir = clamp(dir * scale, vec2(-8.0), vec2(8.0)) * uTexel;
      vec3 a = 0.5 * (texture2D(tDiffuse, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb + texture2D(tDiffuse, uv + dir * 0.5).rgb);
      float lB = dot(b, luma);
      return (lB < lMin || lB > lMax) ? a : b;
    }

    void main() {
      vec2 uv = vUv;

      // Heat haze: the air shimmers above fire
      for (int i = 0; i < MAX_HAZE; i++) {
        if (i >= uHazeCount) break;
        vec4 h = uHaze[i];
        vec2 d = (uv - h.xy) * vec2(uAspect, 1.0);
        // Strongest above the flame, fading out sideways and downwards
        float mask = exp(-dot(d, d) / (h.z * h.z)) * smoothstep(-h.z * 0.4, h.z * 0.3, uv.y - h.y);
        vec2 wobble = vec2(noise(uv * 38.0 + vec2(0.0, uTime * 2.6)), noise(uv * 38.0 + vec2(5.2, uTime * 3.1))) - 0.5;
        uv += wobble * mask * h.w * 0.012;
      }

      vec3 color = uFxaa > 0.5 ? fxaa(uv) : texture2D(tDiffuse, uv).rgb;

      // A streak of motion blur during a dash, strongest towards the edges of the screen
      if (uBlurAmount > 0.001) {
        float edge = smoothstep(0.08, 0.55, length(vUv - 0.5));
        vec2 step = uBlurDirection * uBlurAmount * edge * 0.006;
        vec3 sum = color;
        for (int i = 1; i <= 6; i++) {
          sum += texture2D(tDiffuse, uv - step * float(i)).rgb;
        }
        color = sum / 7.0;
      }

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

      // Split toning: one tint in the shadows, another in the highlights
      color *= mix(uShadows, uHighlights, smoothstep(0.08, 0.65, luma));

      // Lift (or crush) the blacks, then an S-curve for contrast, then saturation
      color = max(color + uLift * (1.0 - smoothstep(0.0, 0.35, luma)), 0.0);
      color = mix(color, color * color * (3.0 - 2.0 * color), uContrast);
      luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);

      // Vignette
      vec2 centered = vUv - 0.5;
      color *= 1.0 - smoothstep(0.35, 0.95, length(centered) * 1.15) * uVignette;

      // Grain shows most in the shadows, as it does on film
      color += (random(vUv) - 0.5) * uGrain * (1.0 - luma * 0.7);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};
