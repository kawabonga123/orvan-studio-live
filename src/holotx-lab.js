const materials = [
  {
    name: 'Compresión',
    source: './holotx/compression.mp4',
    poster: './holotx/compression.jpg',
    headline: 'La imagen también puede tener pulso.',
    description: 'Una estructura precisa que se deforma sin perder su naturaleza material.',
  },
  {
    name: 'Túnel',
    source: './holotx/tunnel.mp4',
    poster: './holotx/tunnel.jpg',
    headline: 'Profundidad sin construir otro mundo.',
    description: 'Líneas, foco y movimiento convierten una superficie plana en un espacio físico.',
  },
  {
    name: 'Estratos',
    source: './holotx/layers.mp4',
    poster: './holotx/layers.jpg',
    headline: 'Materia digital con peso propio.',
    description: 'Capas luminosas que se pliegan lentamente y dejan aire suficiente para el contenido.',
  },
]

const stage = document.querySelector('.stage')
const video = document.querySelector('#background')
const eyebrow = document.querySelector('#eyebrow')
const headline = document.querySelector('#headline')
const description = document.querySelector('#description')
const buttons = [...document.querySelectorAll('.material')]
const next = document.querySelector('#next')
const effectSelector = document.querySelector('#effect-selector')
const requestedEffect = new URLSearchParams(window.location.search).get('effect')
const requestedMaterial = new URLSearchParams(window.location.search).get('material')
const effectMode = requestedEffect === 'wave' || requestedEffect === 'chroma' ? requestedEffect : 'spirit'
const effectName = 'Trama viva'
const embedded = new URLSearchParams(window.location.search).get('embed') === '1'

if (embedded) document.documentElement.classList.add('is-embedded')

effectSelector.value = effectMode
effectSelector.addEventListener('change', () => {
  const url = new URL(window.location.href)
  if (effectSelector.value === 'spirit') {
    url.searchParams.delete('effect')
  } else {
    url.searchParams.set('effect', effectSelector.value)
  }
  window.location.assign(url)
})

const initialMaterial = materials.findIndex((material) =>
  material.name.toLowerCase() === requestedMaterial || material.source.includes(`/${requestedMaterial}.`),
)
let active = initialMaterial === -1 ? 0 : initialMaterial
let switching = false

if (active !== 0) {
  const material = materials[active]
  stage.dataset.material = String(active)
  video.poster = material.poster
  video.src = material.source
  eyebrow.textContent = `Material 0${active + 1} — ${material.name}`
  headline.textContent = material.headline
  description.textContent = material.description
  buttons.forEach((button, index) => {
    const selected = index === active
    button.classList.toggle('is-active', selected)
    button.toggleAttribute('aria-current', selected)
  })
}

function selectMaterial(index) {
  if (switching || index === active) return
  switching = true
  stage.classList.add('is-switching')

  window.setTimeout(() => {
    const material = materials[index]
    active = index
    stage.dataset.material = String(index)
    video.poster = material.poster
    video.src = material.source
    eyebrow.textContent = `Material 0${index + 1} — ${material.name}`
    headline.textContent = material.headline
    description.textContent = material.description

    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index
      button.classList.toggle('is-active', selected)
      button.toggleAttribute('aria-current', selected)
    })

    video.play().catch(() => {})
    const reveal = () => {
      stage.classList.remove('is-switching')
      switching = false
    }
    video.addEventListener('canplay', reveal, { once: true })
    window.setTimeout(reveal, 900)
  }, 420)
}

buttons.forEach((button) => {
  button.addEventListener('click', () => selectMaterial(Number(button.dataset.index)))
})

next.addEventListener('click', () => selectMaterial((active + 1) % materials.length))

function createPointerEffect() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.querySelector('#liquid-canvas')
  stage.dataset.effect = effectMode
  stage.dataset.effectName = effectName
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  })
  if (!gl) return

  const vertexSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `

  const waveFragmentSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVideo;
    uniform vec2 uCenter;
    uniform vec2 uResolution;
    uniform vec2 uVideoSize;
    uniform float uAge;
    uniform float uStrength;

    vec2 coverUv(vec2 uv) {
      float canvasAspect = uResolution.x / uResolution.y;
      float videoAspect = uVideoSize.x / uVideoSize.y;
      if (videoAspect > canvasAspect) {
        uv.x = (uv.x - 0.5) * (canvasAspect / videoAspect) + 0.5;
      } else {
        uv.y = (uv.y - 0.5) * (videoAspect / canvasAspect) + 0.5;
      }
      return uv;
    }

    void main() {
      vec2 ratio = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 delta = (vUv - uCenter) * ratio;
      float distanceToCenter = length(delta);
      vec2 direction = delta / max(distanceToCenter, 0.001);
      float effectDistance = distanceToCenter * 0.454545;

      float front = uAge * 0.34;
      float ring = exp(-pow((effectDistance - front) * 27.0, 2.0));
      float wake = exp(-effectDistance * 7.0) * sin(effectDistance * 42.0 - uAge * 13.0);
      float decay = exp(-uAge * 1.55);
      float longDecay = exp(-uAge * 0.42);
      float viscousWake = exp(-effectDistance * 3.2) * sin(effectDistance * 18.0 - uAge * 4.0);
      float displacement = ((ring * 0.022 + wake * 0.004) * decay + viscousWake * 0.0065 * longDecay) * uStrength;
      vec2 displaced = vUv - direction * displacement / ratio;

      vec2 uv = coverUv(displaced);
      vec2 chroma = direction * displacement * 0.18 / ratio;
      vec3 base = texture2D(uVideo, uv).rgb;
      float light = max(base.r, max(base.g, base.b));
      float mask = smoothstep(0.08, 0.58, light);
      float red = texture2D(uVideo, coverUv(displaced + chroma)).r;
      float blue = texture2D(uVideo, coverUv(displaced - chroma)).b;
      vec3 refracted = vec3(red, base.g, blue);
      float opticalLife = max(decay, longDecay * 0.38);
      gl_FragColor = vec4(mix(base, refracted, mask * opticalLife * uStrength), 1.0);
    }
  `

  const spiritFragmentSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVideo;
    uniform vec2 uCenter;
    uniform vec2 uVelocity;
    uniform vec2 uResolution;
    uniform vec2 uVideoSize;
    uniform float uAge;
    uniform float uStrength;
    uniform float uTime;

    vec2 coverUv(vec2 uv) {
      float canvasAspect = uResolution.x / uResolution.y;
      float videoAspect = uVideoSize.x / uVideoSize.y;
      if (videoAspect > canvasAspect) {
        uv.x = (uv.x - 0.5) * (canvasAspect / videoAspect) + 0.5;
      } else {
        uv.y = (uv.y - 0.5) * (videoAspect / canvasAspect) + 0.5;
      }
      return uv;
    }

    void main() {
      vec2 ratio = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 delta = (vUv - uCenter) * ratio;
      float radius = length(delta);
      vec2 direction = delta / max(radius, 0.001);
      vec2 tangent = vec2(-direction.y, direction.x);
      float life = exp(-uAge * 0.34);
      float velocity = clamp(length(uVelocity) * 1.35, 0.0, 1.0);
      vec2 velocityDirection = uVelocity / max(length(uVelocity), 0.001);

      float body = exp(-radius * 3.6);
      vec2 flow = tangent * (0.010 + velocity * 0.016);
      flow -= velocityDirection * velocity * 0.014;
      vec2 displaced = vUv - flow * body * life * uStrength / ratio;

      vec2 chroma = tangent * body * life * uStrength * 0.0028 / ratio;
      vec3 base = texture2D(uVideo, coverUv(displaced)).rgb;
      float red = texture2D(uVideo, coverUv(displaced + chroma)).r;
      float blue = texture2D(uVideo, coverUv(displaced - chroma)).b;
      vec3 refracted = vec3(red, base.g, blue);

      float diffuseGlow = body * life * uStrength * 0.022;
      vec3 spiritLight = vec3(0.46, 0.72, 0.92) * diffuseGlow;

      gl_FragColor = vec4(mix(base, refracted, body * life * uStrength * 0.58) + spiritLight, 1.0);
    }
  `

  const chromaFragmentSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uVideo;
    uniform vec2 uResolution;
    uniform vec2 uVideoSize;
    uniform vec2 uTrail[8];
    uniform float uTrailAge[8];

    vec2 coverUv(vec2 uv) {
      float canvasAspect = uResolution.x / uResolution.y;
      float videoAspect = uVideoSize.x / uVideoSize.y;
      if (videoAspect > canvasAspect) {
        uv.x = (uv.x - 0.5) * (canvasAspect / videoAspect) + 0.5;
      } else {
        uv.y = (uv.y - 0.5) * (videoAspect / canvasAspect) + 0.5;
      }
      return uv;
    }

    void main() {
      vec2 ratio = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 flow = vec2(0.0);
      float diffusion = 0.0;

      for (int i = 0; i < 8; i++) {
        vec2 delta = (vUv - uTrail[i]) * ratio;
        float distanceToTrail = length(delta);
        vec2 direction = delta / max(distanceToTrail, 0.001);
        vec2 tangent = vec2(-direction.y, direction.x);
        float age = uTrailAge[i];
        float life = exp(-age * 7.4);
        float spread = 0.056 + min(age, 0.34) * 0.13;
        float cloud = exp(-(distanceToTrail * distanceToTrail) / max(spread * spread * 1.8, 0.001));
        float ripple = 0.82 + sin(distanceToTrail * 34.0 - age * 3.4 + float(i) * 1.7) * 0.18;
        float weight = cloud * ripple * life;
        flow += (tangent * 0.025 + direction * sin(age * 2.3 + float(i)) * 0.015) * weight;
        diffusion += weight;
      }

      float impact = clamp(diffusion, 0.0, 1.45);
      vec2 displaced = vUv - flow;
      float split = min(0.014, impact * 0.0090);
      vec2 redOffset = vec2(split, split * 0.24);
      vec2 blueOffset = vec2(-split * 0.68, split * 0.52);
      vec3 base = texture2D(uVideo, coverUv(displaced)).rgb;
      float red = texture2D(uVideo, coverUv(displaced + redOffset)).r;
      float blue = texture2D(uVideo, coverUv(displaced + blueOffset)).b;
      vec3 spectral = vec3(red, base.g, blue);
      vec3 color = mix(base, spectral, min(0.86, impact * 0.70));
      color += vec3(0.20, 0.025, 0.28) * impact * 0.58;
      color += vec3(0.0, 0.12, 0.18) * impact * 0.42;

      gl_FragColor = vec4(color, 1.0);
    }
  `

  const fragmentSource = effectMode === 'wave'
    ? waveFragmentSource
    : effectMode === 'chroma' ? chromaFragmentSource : spiritFragmentSource

  function compile(type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
    return shader
  }

  let program
  try {
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
  } catch {
    return
  }

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  gl.useProgram(program)
  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const uniforms = {
    center: gl.getUniformLocation(program, 'uCenter'),
    resolution: gl.getUniformLocation(program, 'uResolution'),
    videoSize: gl.getUniformLocation(program, 'uVideoSize'),
    age: gl.getUniformLocation(program, 'uAge'),
    strength: gl.getUniformLocation(program, 'uStrength'),
    velocity: gl.getUniformLocation(program, 'uVelocity'),
    time: gl.getUniformLocation(program, 'uTime'),
    trail: gl.getUniformLocation(program, 'uTrail[0]'),
    trailAge: gl.getUniformLocation(program, 'uTrailAge[0]'),
  }

  const pointer = {
    x: 0.62,
    y: 0.5,
    lastX: 0.62,
    lastY: 0.5,
    vx: 0,
    vy: 0,
    lastTime: performance.now(),
    lastTrailAt: -10000,
    impulseAt: -10,
    strength: 0,
    trail: Array.from({ length: 8 }, () => ({ x: 0.62, y: 0.5, time: -10000 })),
  }
  const trailPositions = new Float32Array(16)
  const trailAges = new Float32Array(8)

  function resize() {
    const scale = Math.min(1, 1280 / window.innerWidth, 900 / window.innerHeight)
    canvas.width = Math.max(1, Math.floor(window.innerWidth * scale))
    canvas.height = Math.max(1, Math.floor(window.innerHeight * scale))
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  function disturbAt(clientX, clientY, inputType = 'pointer') {
    const rect = canvas.getBoundingClientRect()
    const now = performance.now()
    const x = (clientX - rect.left) / rect.width
    const y = 1 - (clientY - rect.top) / rect.height
    const elapsed = Math.max(16, now - pointer.lastTime)
    const dx = x - pointer.lastX
    const dy = y - pointer.lastY
    const speed = Math.hypot(dx, dy) / elapsed * 1000
    pointer.vx = dx / elapsed * 1000
    pointer.vy = dy / elapsed * 1000
    if (effectMode === 'chroma') {
      const head = pointer.trail[0]
      const enoughDistance = Math.hypot(x - head.x, y - head.y) > 0.006
      if (now - pointer.lastTrailAt >= 26 && enoughDistance) {
        pointer.trail.pop()
        pointer.trail.unshift({ x, y, time: now })
        pointer.lastTrailAt = now
      } else {
        head.x = x
        head.y = y
        head.time = now
      }
    }
    pointer.x = x
    pointer.y = y
    pointer.lastX = x
    pointer.lastY = y
    pointer.lastTime = now
    pointer.impulseAt = now
    pointer.strength = Math.min(1.35, 0.42 + speed * 0.72)
    stage.dataset.lastInteraction = inputType
    requestInteractiveDraw()
  }

  function disturbNormalized(x, y, scrollVelocity = 0) {
    const rect = canvas.getBoundingClientRect()
    const clientX = rect.left + Math.min(1, Math.max(0, x)) * rect.width
    const clientY = rect.top + Math.min(1, Math.max(0, y)) * rect.height
    disturbAt(clientX, clientY, 'orvan')
    pointer.vy += Math.max(-1.4, Math.min(1.4, scrollVelocity / 1100))
    pointer.strength = Math.max(pointer.strength, Math.min(1.65, 0.72 + Math.abs(scrollVelocity) / 1600))
    if (effectMode === 'chroma' && Math.abs(scrollVelocity) > 40) {
      const scrollWake = Math.max(-0.16, Math.min(0.16, scrollVelocity / 6200))
      const now = performance.now()
      pointer.trail.forEach((point, index) => {
        const tail = index / Math.max(1, pointer.trail.length - 1)
        point.x = pointer.x
        point.y = Math.max(0, Math.min(1, pointer.y - scrollWake * tail))
        point.time = now - index * 42
      })
      pointer.lastTrailAt = now
    }
  }

  function disturbPointer(event) {
    if (event.pointerType === 'touch') return
    disturbAt(event.clientX, event.clientY)
  }

  const touch = { active: false, x: 0, y: 0 }

  function disturbTouch(event) {
    const point = event.touches[0] || event.changedTouches[0]
    if (!point) return
    touch.active = true
    touch.x = point.clientX
    touch.y = point.clientY
    disturbAt(touch.x, touch.y, 'touch')
  }

  function endTouch() {
    touch.active = false
  }

  function disturbWhileScrolling() {
    if (touch.active) disturbAt(touch.x, touch.y, 'touch')
  }

  function draw(now) {
    if (video.readyState < 2 || video.videoWidth === 0) return
    gl.bindTexture(gl.TEXTURE_2D, texture)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
    } catch {
      stage.classList.remove('has-liquid')
      return
    }
    gl.uniform2f(uniforms.center, pointer.x, pointer.y)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform2f(uniforms.videoSize, video.videoWidth, video.videoHeight)
    gl.uniform1f(uniforms.age, Math.max(0, (now - pointer.impulseAt) / 1000))
    gl.uniform1f(uniforms.strength, pointer.strength)
    gl.uniform2f(uniforms.velocity, pointer.vx, pointer.vy)
    gl.uniform1f(uniforms.time, now / 1000)
    if (effectMode === 'chroma') {
      pointer.trail.forEach((point, index) => {
        trailPositions[index * 2] = point.x
        trailPositions[index * 2 + 1] = point.y
        trailAges[index] = Math.max(0, (now - point.time) / 1000)
      })
      gl.uniform2fv(uniforms.trail, trailPositions)
      gl.uniform1fv(uniforms.trailAge, trailAges)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    pointer.vx *= 0.92
    pointer.vy *= 0.92
    stage.classList.add('has-liquid')
  }

  let interactiveFramePending = false
  function requestInteractiveDraw() {
    if (interactiveFramePending) return
    interactiveFramePending = true
    requestAnimationFrame((now) => {
      interactiveFramePending = false
      draw(now)
    })
  }

  function schedule() {
    if ('requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback((now) => {
        draw(now)
        schedule()
      })
      return
    }
    let previous = 0
    const frame = (now) => {
      if (now - previous >= 33) {
        draw(now)
        previous = now
      }
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  resize()
  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('scroll', disturbWhileScrolling, { passive: true })
  stage.addEventListener('pointermove', disturbPointer, { passive: true })
  stage.addEventListener('pointerdown', disturbPointer, { passive: true })
  stage.addEventListener('touchstart', disturbTouch, { passive: true })
  stage.addEventListener('touchmove', disturbTouch, { passive: true })
  stage.addEventListener('touchend', endTouch, { passive: true })
  stage.addEventListener('touchcancel', endTouch, { passive: true })
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'orvan:holotx-input') return
    disturbNormalized(event.data.x, event.data.y, event.data.scrollVelocity)
  })
  canvas.addEventListener('webglcontextlost', () => stage.classList.remove('has-liquid'))
  schedule()
}

createPointerEffect()
