const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
in vec2 vUv;
out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(
    0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
    0.0
  );
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.02;
    amplitude *= 0.48;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;

  float t = uTime * 0.07;
  float n1 = fbm(p * 1.35 + vec2(t * 0.9, t * 0.55));
  float n2 = fbm(p * 1.85 - vec2(t * 0.45, t * 0.75) + 4.2);
  float n3 = fbm(p * 1.05 + vec2(-t * 0.35, t * 0.5) + 9.1);
  float n4 = fbm(p * 2.25 + vec2(t * 0.25, -t * 0.4) + 2.7);

  float cloud1 = smoothstep(-0.15, 0.85, n1);
  float cloud2 = smoothstep(0.0, 0.95, n2);
  float cloud3 = smoothstep(-0.05, 0.9, n3);
  float cloud4 = smoothstep(0.1, 1.0, n4);

  vec3 base = vec3(0.961, 0.961, 0.961);
  vec3 blue = vec3(0.145, 0.388, 0.922);
  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 rose = vec3(0.957, 0.447, 0.714);
  vec3 teal = vec3(0.176, 0.831, 0.749);
  vec3 amber = vec3(0.992, 0.878, 0.612);

  vec3 color = base;
  color = mix(color, blue, cloud1 * 0.11);
  color = mix(color, violet, cloud2 * 0.09);
  color = mix(color, rose, cloud3 * 0.08);
  color = mix(color, teal, cloud4 * 0.07);
  color = mix(color, amber, smoothstep(0.35, 0.95, n1 * 0.5 + n3 * 0.5) * 0.05);

  float vignette = 1.0 - dot(p * 0.55, p * 0.55);
  color = mix(base, color, clamp(vignette, 0.72, 1.0));

  fragColor = vec4(color, 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export type GasWebGLHandle = {
  draw: (timeSeconds: number) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
};

export function initGasWebGL(canvas: HTMLCanvasElement): GasWebGLHandle | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });

  if (!gl) return null;

  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  if (!program) return null;

  const positionLocation = gl.getAttribLocation(program, "aPosition");
  const timeLocation = gl.getUniformLocation(program, "uTime");
  const resolutionLocation = gl.getUniformLocation(program, "uResolution");

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  let width = 0;
  let height = 0;

  const resize = (nextWidth: number, nextHeight: number) => {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };

  const draw = (timeSeconds: number) => {
    gl.useProgram(program);
    gl.uniform1f(timeLocation, timeSeconds);
    gl.uniform2f(resolutionLocation, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const destroy = () => {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };

  return { draw, resize, destroy };
}
