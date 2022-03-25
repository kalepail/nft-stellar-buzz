import seedrandom from 'seedrandom'

const colors = [
  '#FF0000', 
  '#FFFF00', 
  '#00FFFF', 
  '#0000FF', 
  '#FF00FF', 
  '#00FF00'
]

export default async (request) => {
  const { issuer, code } = request.params
  const rng = seedrandom.xor4096(`${issuer}:${code}`)

  const svg = `
    <!-- <?xml version="1.0" encoding="UTF-8"?> -->
    <svg width="600px" height="600px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" r="50%" id="radialGradient-1">
          <stop stop-color="${getRandomColor()}" stop-opacity="100%" offset="0%"></stop>
          <stop stop-color="#000000" stop-opacity="0%" offset="100%"></stop>
        </radialGradient>
        <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" r="50%" id="radialGradient-2">
          <stop stop-color="${getRandomColor()}" stop-opacity="100%" offset="0%"></stop>
          <stop stop-color="#000000" stop-opacity="0%" offset="100%"></stop>
        </radialGradient>
        <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" r="50%" id="radialGradient-3">
          <stop stop-color="${getRandomColor()}" stop-opacity="100%" offset="0%"></stop>
          <stop stop-color="#000000" stop-opacity="0%" offset="100%"></stop>
        </radialGradient>
        <radialGradient cx="50%" cy="50%" fx="50%" fy="50%" r="50%" id="radialGradient-4">
          <stop stop-color="${getRandomColor()}" stop-opacity="100%" offset="0%"></stop>
          <stop stop-color="#000000" stop-opacity="0%" offset="100%"></stop>
        </radialGradient>
      </defs>
      <g stroke="none" fill="none">
        <rect fill="#000000" x="0" y="0" width="100" height="100"></rect>
        <circle fill="url(#radialGradient-1)" style="mix-blend-mode: difference;" cx="0" cy="${getRandomCoordinate()}" r="${getRadius()}"></circle>
        <circle fill="url(#radialGradient-2)" style="mix-blend-mode: difference;" cx="100" cy="${getRandomCoordinate()}" r="${getRadius()}"></circle>
        <circle fill="url(#radialGradient-3)" style="mix-blend-mode: difference;" cx="${getRandomCoordinate()}" cy="0" r="${getRadius()}"></circle>
        <circle fill="url(#radialGradient-4)" style="mix-blend-mode: difference;" cx="${getRandomCoordinate()}" cy="100" r="${getRadius()}"></circle>
        <text font-family="Helvetica" font-size="4" font-weight="normal" fill="#FFFFFF">
          <tspan x="5" y="8">${issuer.substring(0, 28)}</tspan>
          <tspan x="5" y="14">${issuer.substring(28)}</tspan>
        </text>
        <text font-family="Helvetica" font-size="6" font-weight="normal" fill="#FFFFFF">
          <tspan x="5" y="93">/ ${code}</tspan>
        </text>
      </g>
    </svg>
  `

  function getRandomColor() {
    return colors[Math.floor(rng() * colors.length)]
  }
  function getRandomCoordinate() {
    return random(0, 100)
  }
  function getRadius() {
    return random(100, 200)
  }
  function random(min, max) {
    return Math.floor(rng() * (max - min + 1) + min)
  }

  return new Response(svg, { 
    headers: { 
      'Content-Type': 'image/svg+xml',
      'Access-Control-Allow-Origin': '*'
    } 
  })
}