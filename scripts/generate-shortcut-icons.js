const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ICONS_DIR = path.resolve(__dirname, '..', 'icons');

const icons = {
    'shortcut-calc': `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="calcBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c2e"/>
      <stop offset="100%" stop-color="#161618"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#30d158"/>
      <stop offset="100%" stop-color="#25a244"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#calcBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="#3a3a3c" stroke-width="2"/>
  
  <!-- Calculator Body -->
  <rect x="36" y="28" width="120" height="136" rx="20" fill="#1c1c1e" stroke="#48484a" stroke-width="3"/>
  
  <!-- Screen Display -->
  <rect x="48" y="40" width="96" height="30" rx="8" fill="#000000" stroke="#333336" stroke-width="1.5"/>
  <text x="136" y="62" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#30d158" text-anchor="end">123.45</text>
  
  <!-- Keypad Grid -->
  <!-- Row 1 -->
  <rect x="48" y="80" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="58" y="94" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">7</text>
  
  <rect x="73" y="80" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="83" y="94" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">8</text>
  
  <rect x="98" y="80" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="108" y="94" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">9</text>
  
  <rect x="123" y="80" width="21" height="18" rx="5" fill="#ff9f0a"/>
  <text x="133.5" y="94" font-family="sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">÷</text>

  <!-- Row 2 -->
  <rect x="48" y="104" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="58" y="118" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">4</text>
  
  <rect x="73" y="104" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="83" y="118" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">5</text>
  
  <rect x="98" y="104" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="108" y="118" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">6</text>
  
  <rect x="123" y="104" width="21" height="18" rx="5" fill="#ff9f0a"/>
  <text x="133.5" y="118" font-family="sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">×</text>

  <!-- Row 3 -->
  <rect x="48" y="128" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="58" y="142" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">1</text>
  
  <rect x="73" y="128" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="83" y="142" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">2</text>
  
  <rect x="98" y="128" width="20" height="18" rx="5" fill="#3a3a3c"/>
  <text x="108" y="142" font-family="sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">3</text>
  
  <rect x="123" y="128" width="21" height="18" rx="5" fill="url(#accentGrad)"/>
  <text x="133.5" y="142" font-family="sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">=</text>
</svg>`,

    'shortcut-search': `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="searchBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c2e"/>
      <stop offset="100%" stop-color="#161618"/>
    </linearGradient>
    <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2997ff"/>
      <stop offset="100%" stop-color="#0071e3"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#searchBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="#3a3a3c" stroke-width="2"/>
  
  <!-- Magnifying Glass -->
  <circle cx="86" cy="86" r="44" fill="none" stroke="url(#blueGlow)" stroke-width="14" stroke-linecap="round"/>
  <!-- Handle -->
  <line x1="118" y1="118" x2="152" y2="152" stroke="url(#blueGlow)" stroke-width="16" stroke-linecap="round"/>
  
  <!-- Subtle Currency symbol inside glass -->
  <text x="86" y="96" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">¤</text>
</svg>`,

    'shortcut-usd-eur': `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="bgUE" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c2e"/>
      <stop offset="100%" stop-color="#161618"/>
    </linearGradient>
    <linearGradient id="usdBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#30d158"/>
      <stop offset="100%" stop-color="#248a3d"/>
    </linearGradient>
    <linearGradient id="eurBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2997ff"/>
      <stop offset="100%" stop-color="#0062cc"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#bgUE)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="#3a3a3c" stroke-width="2"/>
  
  <!-- USD Circle -->
  <circle cx="56" cy="96" r="32" fill="url(#usdBadge)"/>
  <text x="56" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">$</text>
  
  <!-- Exchange Arrow -->
  <path d="M90,88 L104,88 L104,82 L116,92 L104,102 L104,96 L90,96 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M102,106 L88,106 L88,112 L76,102 L88,92 L88,98 L102,98 Z" fill="#8e8e93" opacity="0.6"/>

  <!-- EUR Circle -->
  <circle cx="136" cy="96" r="32" fill="url(#eurBadge)"/>
  <text x="136" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">€</text>
</svg>`,

    'shortcut-usd-rub': `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="bgUR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c2e"/>
      <stop offset="100%" stop-color="#161618"/>
    </linearGradient>
    <linearGradient id="usdBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#30d158"/>
      <stop offset="100%" stop-color="#248a3d"/>
    </linearGradient>
    <linearGradient id="rubBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff453a"/>
      <stop offset="100%" stop-color="#c92a2a"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#bgUR)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="#3a3a3c" stroke-width="2"/>
  
  <!-- USD Circle -->
  <circle cx="56" cy="96" r="32" fill="url(#usdBadge)"/>
  <text x="56" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">$</text>
  
  <!-- Exchange Arrow -->
  <path d="M90,88 L104,88 L104,82 L116,92 L104,102 L104,96 L90,96 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M102,106 L88,106 L88,112 L76,102 L88,92 L88,98 L102,98 Z" fill="#8e8e93" opacity="0.6"/>

  <!-- RUB Circle -->
  <circle cx="136" cy="96" r="32" fill="url(#rubBadge)"/>
  <text x="136" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">₽</text>
</svg>`,

    'shortcut-eur-usd': `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="bgEU" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c2e"/>
      <stop offset="100%" stop-color="#161618"/>
    </linearGradient>
    <linearGradient id="eurBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2997ff"/>
      <stop offset="100%" stop-color="#0062cc"/>
    </linearGradient>
    <linearGradient id="usdBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#30d158"/>
      <stop offset="100%" stop-color="#248a3d"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#bgEU)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="#3a3a3c" stroke-width="2"/>
  
  <!-- EUR Circle -->
  <circle cx="56" cy="96" r="32" fill="url(#eurBadge)"/>
  <text x="56" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">€</text>
  
  <!-- Exchange Arrow -->
  <path d="M90,88 L104,88 L104,82 L116,92 L104,102 L104,96 L90,96 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M102,106 L88,106 L88,112 L76,102 L88,92 L88,98 L102,98 Z" fill="#8e8e93" opacity="0.6"/>

  <!-- USD Circle -->
  <circle cx="136" cy="96" r="32" fill="url(#usdBadge)"/>
  <text x="136" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">$</text>
</svg>`,

    'shortcut-btc': `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="bgBTC" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2c2e"/>
      <stop offset="100%" stop-color="#161618"/>
    </linearGradient>
    <linearGradient id="btcGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f7931a"/>
      <stop offset="100%" stop-color="#c96d00"/>
    </linearGradient>
    <linearGradient id="usdBadge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#30d158"/>
      <stop offset="100%" stop-color="#248a3d"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#bgBTC)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="#3a3a3c" stroke-width="2"/>
  
  <!-- BTC Circle -->
  <circle cx="56" cy="96" r="32" fill="url(#btcGold)"/>
  <text x="56" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">₿</text>
  
  <!-- Exchange Arrow -->
  <path d="M90,88 L104,88 L104,82 L116,92 L104,102 L104,96 L90,96 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M102,106 L88,106 L88,112 L76,102 L88,92 L88,98 L102,98 Z" fill="#8e8e93" opacity="0.6"/>

  <!-- USD Circle -->
  <circle cx="136" cy="96" r="32" fill="url(#usdBadge)"/>
  <text x="136" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">$</text>
</svg>`
};

function generateIcons() {
    console.log('Generating shortcut icons...');
    for (const [name, svgContent] of Object.entries(icons)) {
        const svgPath = path.join(ICONS_DIR, `${name}.svg`);
        const pngPath = path.join(ICONS_DIR, `${name}.png`);
        
        fs.writeFileSync(svgPath, svgContent.trim(), 'utf8');
        try {
            execSync(`sips -s format png "${svgPath}" --out "${pngPath}" -z 192 192`, { stdio: 'ignore' });
            console.log(`✓ Created icons/${name}.png`);
        } catch (err) {
            console.error(`Failed to convert ${name}.svg:`, err.message);
        }
    }
    console.log('✨ Shortcut icons ready!');
}

if (require.main === module) {
    generateIcons();
}

module.exports = { generateIcons };
