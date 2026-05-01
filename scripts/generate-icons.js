const fs = require('fs');
const path = require('path');

// Create SVG icon
const svgIcon = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#07070d"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  
  <!-- Glow effect -->
  <circle cx="256" cy="220" r="180" fill="url(#glow)"/>
  
  <!-- Outer ring -->
  <circle cx="256" cy="220" r="140" fill="none" stroke="#c9a84c" stroke-width="2" opacity="0.3"/>
  <circle cx="256" cy="220" r="110" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.2"/>
  
  <!-- Compass needle N -->
  <polygon points="256,100 268,215 256,230 244,215" fill="#c9a84c" opacity="0.9"/>
  <!-- Compass needle S -->
  <polygon points="256,340 268,225 256,230 244,225" fill="#4a5568" opacity="0.7"/>
  <!-- Compass needle E -->
  <polygon points="376,220 261,232 256,220 261,208" fill="#c9a84c" opacity="0.5"/>
  <!-- Compass needle W -->
  <polygon points="136,220 251,232 256,220 251,208" fill="#4a5568" opacity="0.4"/>
  
  <!-- Center dot -->
  <circle cx="256" cy="220" r="10" fill="#c9a84c"/>
  <circle cx="256" cy="220" r="4" fill="#07070d"/>
  
  <!-- Headphone icon at bottom -->
  <path d="M186,380 Q186,340 256,340 Q326,340 326,380" fill="none" stroke="#c9a84c" stroke-width="8" stroke-linecap="round" opacity="0.8"/>
  <rect x="172" y="375" width="24" height="44" rx="12" fill="#c9a84c" opacity="0.8"/>
  <rect x="316" y="375" width="24" height="44" rx="12" fill="#c9a84c" opacity="0.8"/>
  
  <!-- Brand name -->
  <text x="256" y="455" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="600" letter-spacing="8" fill="#c9a84c" opacity="0.9">PODWALK</text>
</svg>`;

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('SVG icon created');
