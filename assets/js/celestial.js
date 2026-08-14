/* ============================================================
   CELESTIAL MODULE — Sun, Moon, Planets, Sky Map
   ============================================================ */

const Celestial = (() => {
  let planetData = null;
  let currentLat = 9.9312;
  let currentLng = 76.2673;

  // ── PLANET CALCULATIONS ──
  function getPlanetLongitude(planet, date) {
    const d = (date.valueOf() / 86400000) - 10957.5; // days since J2000
    const T = d / 36525;
    return ((planet.L0 + planet.L1 * T) % 360 + 360) % 360;
  }

  function getRahuLongitude(date) {
    const d = (date.valueOf() / 86400000) - 10957.5;
    const T = d / 36525;
    return ((125.0445 + (-1934.1363) * T) % 360 + 360) % 360;
  }

  function getZodiacSign(longitude) {
    const signs = ['Aries ♈', 'Taurus ♉', 'Gemini ♊', 'Cancer ♋', 'Leo ♌', 'Virgo ♍',
                   'Libra ♎', 'Scorpio ♏', 'Sagittarius ♐', 'Capricorn ♑', 'Aquarius ♒', 'Pisces ♓'];
    const idx = Math.floor(((longitude % 360 + 360) % 360) / 30);
    return signs[idx];
  }

  function getSunLongitude(date) {
    const d = (date.valueOf() / 86400000) - 10957.5;
    const T = d / 36525;
    const L0 = (280.46646 + 36000.76983 * T) % 360;
    const M = (357.52911 + 35999.05029 * T) * Math.PI / 180;
    const C = 1.9146 * Math.sin(M) + 0.02 * Math.sin(2 * M);
    return ((L0 + C) % 360 + 360) % 360;
  }

  // ── TIME FORMATTING ──
  function formatTime(date) {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatDegrees(deg) {
    return `${deg.toFixed(1)}°`;
  }

  // ── MOON PHASE NAME ──
  function getMoonPhaseName(phase) {
    if (phase < 0.0625) return 'NEW MOON';
    if (phase < 0.1875) return 'WAXING CRESCENT';
    if (phase < 0.3125) return 'FIRST QUARTER';
    if (phase < 0.4375) return 'WAXING GIBBOUS';
    if (phase < 0.5625) return 'FULL MOON';
    if (phase < 0.6875) return 'WANING GIBBOUS';
    if (phase < 0.8125) return 'LAST QUARTER';
    if (phase < 0.9375) return 'WANING CRESCENT';
    return 'NEW MOON';
  }

  // ── MOON PHASE SVG ──
  function renderMoonPhaseSVG(phase, fraction) {
    const container = document.getElementById('moonPhaseSvg');
    if (!container) return;

    const size = 70;
    const cx = size / 2;
    const cy = size / 2;
    const r = 28;

    // Calculate the moon illumination shape
    // Phase 0 = new, 0.5 = full
    // We draw two arcs to represent the illuminated portion

    let svg = `<svg viewBox="0 0 ${size} ${size}" class="moon-phase-svg" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
      <filter id="moonGlow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    // Dark side (background circle)
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--border-color)" opacity="0.3"/>`;

    // Illuminated portion
    if (fraction > 0.01) {
      // Calculate the curve of the terminator
      const sweep = phase < 0.5 ? 1 : 0; // waxing vs waning side
      const illuminatedSide = phase < 0.5 ? 'right' : 'left';

      // The terminator line position (how much is lit)
      const termX = r * Math.cos(Math.PI * 2 * phase);

      if (phase < 0.25) {
        // Waxing crescent: right side lit, terminator curves right
        svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${Math.abs(termX)} ${r} 0 0 ${termX > 0 ? 0 : 1} ${cx} ${cy - r} Z" 
                fill="var(--text-main)" opacity="0.8" filter="url(#moonGlow)"/>`;
      } else if (phase < 0.5) {
        // Waxing gibbous: right side lit, terminator curves left
        svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${Math.abs(termX)} ${r} 0 0 ${termX > 0 ? 1 : 0} ${cx} ${cy - r} Z" 
                fill="var(--text-main)" opacity="0.8" filter="url(#moonGlow)"/>`;
      } else if (phase < 0.75) {
        // Waning gibbous: left side lit, terminator curves right
        svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${Math.abs(termX)} ${r} 0 0 ${termX < 0 ? 0 : 1} ${cx} ${cy - r} Z" 
                fill="var(--text-main)" opacity="0.8" filter="url(#moonGlow)"/>`;
      } else {
        // Waning crescent: left side lit, terminator curves left
        svg += `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${Math.abs(termX)} ${r} 0 0 ${termX < 0 ? 1 : 0} ${cx} ${cy - r} Z" 
                fill="var(--text-main)" opacity="0.8" filter="url(#moonGlow)"/>`;
      }
    }

    // Outline
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--text-main)" stroke-width="0.5" opacity="0.5"/>`;

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  // ── SUN ARC SVG ──
  function renderSunArc(sunPos, sunTimes) {
    const container = document.getElementById('sunArcSvg');
    if (!container) return;

    const w = 280;
    const h = 120;
    const arcCx = w / 2;
    const arcCy = h - 15;
    const arcR = 90;

    let svg = `<svg viewBox="0 0 ${w} ${h}" class="sun-arc-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Horizon line
    svg += `<line x1="10" y1="${arcCy}" x2="${w - 10}" y2="${arcCy}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>`;
    svg += `<text x="15" y="${arcCy + 12}" font-size="7" fill="var(--text-muted)" font-family="var(--font-mono)">HORIZON</text>`;

    // Arc path (semicircle representing sun path)
    svg += `<path d="M ${arcCx - arcR} ${arcCy} A ${arcR} ${arcR} 0 0 1 ${arcCx + arcR} ${arcCy}" 
            fill="none" stroke="var(--text-main)" stroke-width="0.8" opacity="0.3" stroke-dasharray="3,3"/>`;

    // Calculate sun position on arc
    const now = new Date();
    const sunrise = sunTimes.sunrise;
    const sunset = sunTimes.sunset;

    if (sunrise && sunset) {
      const dayLength = sunset - sunrise;
      const elapsed = now - sunrise;
      const progress = Math.max(0, Math.min(1, elapsed / dayLength));

      // Sun position on arc
      const angle = Math.PI * (1 - progress); // π to 0
      const sx = arcCx + arcR * Math.cos(angle);
      const sy = arcCy - arcR * Math.sin(angle);

      // Only show sun if it's daytime
      if (progress > 0 && progress < 1) {
        // Traveled path (solid)
        const startAngle = Math.PI;
        const endAngle = angle;
        const pathPoints = [];
        for (let a = startAngle; a >= endAngle; a -= 0.05) {
          pathPoints.push(`${arcCx + arcR * Math.cos(a)},${arcCy - arcR * Math.sin(a)}`);
        }
        if (pathPoints.length > 1) {
          svg += `<polyline points="${pathPoints.join(' ')}" fill="none" stroke="var(--accent-orange)" stroke-width="2" opacity="0.6"/>`;
        }

        // Sun circle
        svg += `<circle cx="${sx}" cy="${sy}" r="8" fill="var(--accent-orange)" opacity="0.9">
                  <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite"/>
                </circle>`;
        svg += `<circle cx="${sx}" cy="${sy}" r="12" fill="none" stroke="var(--accent-orange)" stroke-width="0.5" opacity="0.4">
                  <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite"/>
                </circle>`;
        svg += `<text x="${sx}" y="${sy - 16}" text-anchor="middle" font-size="7" fill="var(--accent-orange)" font-family="var(--font-mono)">${formatDegrees(sunPos.altitude)} ALT</text>`;
      }

      // Sunrise label
      svg += `<text x="${arcCx - arcR}" y="${arcCy - 5}" text-anchor="middle" font-size="7" fill="var(--text-muted)" font-family="var(--font-mono)">↑ ${formatTime(sunrise)}</text>`;
      // Sunset label
      svg += `<text x="${arcCx + arcR}" y="${arcCy - 5}" text-anchor="middle" font-size="7" fill="var(--text-muted)" font-family="var(--font-mono)">${formatTime(sunset)} ↓</text>`;
    }

    // Night indicator (if sun is below horizon)
    if (sunPos.altitude < 0) {
      svg += `<text x="${arcCx}" y="${arcCy - 30}" text-anchor="middle" font-size="10" fill="var(--text-muted)" font-family="var(--font-mono)" letter-spacing="3">☾ NIGHT</text>`;
    }

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  // ── PLANET ORBIT SVG ──
  function renderPlanetOrbit(planets, date) {
    const container = document.getElementById('planetOrbitSvg');
    if (!container) return;

    const w = 400;
    const h = 220;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const maxR = 95;

    let svg = `<svg viewBox="0 0 ${w} ${h}" class="planet-orbit-svg" xmlns="http://www.w3.org/2000/svg">`;

    svg += `<defs>
      <filter id="planetGlow">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    // Sun at center
    svg += `<circle cx="${cx}" cy="${cy}" r="8" fill="var(--accent-orange)" filter="url(#planetGlow)">
              <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite"/>
            </circle>`;
    svg += `<text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="7" fill="var(--accent-orange)" font-family="var(--font-mono)">☉ SUN</text>`;

    // Orbit rings and planets
    const orbitData = [
      { key: 'mercury', r: 25 },
      { key: 'venus', r: 40 },
      { key: 'earth', r: 55, isEarth: true },
      { key: 'mars', r: 68 },
      { key: 'jupiter', r: 82 },
      { key: 'saturn', r: maxR }
    ];

    // Earth's longitude for reference
    const earthLon = (getSunLongitude(date) + 180) % 360;

    orbitData.forEach(orbit => {
      // Orbit ring
      svg += `<circle cx="${cx}" cy="${cy}" r="${orbit.r}" fill="none" stroke="var(--border-color)" stroke-width="0.5" opacity="0.3" stroke-dasharray="2,4"/>`;

      if (orbit.isEarth) {
        const rad = (earthLon - 90) * Math.PI / 180;
        const px = cx + orbit.r * Math.cos(rad);
        const py = cy + orbit.r * Math.sin(rad);
        svg += `<circle cx="${px}" cy="${py}" r="4" fill="#4488ff" filter="url(#planetGlow)"/>`;
        svg += `<text x="${px}" y="${py - 8}" text-anchor="middle" font-size="6" fill="#4488ff" font-family="var(--font-mono)">⊕ EARTH</text>`;
      } else if (planets[orbit.key]) {
        const planet = planets[orbit.key];
        const lon = getPlanetLongitude(planet, date);
        const rad = (lon - 90) * Math.PI / 180;
        const px = cx + orbit.r * Math.cos(rad);
        const py = cy + orbit.r * Math.sin(rad);

        svg += `<circle cx="${px}" cy="${py}" r="4" fill="${planet.color}" filter="url(#planetGlow)"/>`;
        svg += `<text x="${px}" y="${py - 8}" text-anchor="middle" font-size="6" fill="${planet.color}" font-family="var(--font-mono)">${planet.symbol} ${planet.name.toUpperCase()}</text>`;
      }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  // ── SKY DOME SVG ──
  function renderSkyDome(sunPos, moonPos) {
    const container = document.getElementById('skyDomeSvg');
    if (!container) return;

    const w = 400;
    const h = 200;
    const cx = w / 2;
    const cy = h - 10;
    const domeR = 170;

    let svg = `<svg viewBox="0 0 ${w} ${h}" class="sky-dome-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Horizon
    svg += `<line x1="10" y1="${cy}" x2="${w - 10}" y2="${cy}" stroke="var(--border-color)" stroke-width="1" opacity="0.5"/>`;

    // Dome arc
    svg += `<path d="M ${cx - domeR} ${cy} A ${domeR} ${domeR} 0 0 1 ${cx + domeR} ${cy}" 
            fill="none" stroke="var(--border-color)" stroke-width="0.5" opacity="0.3"/>`;

    // Altitude circles (30° and 60°)
    [30, 60].forEach(alt => {
      const r = domeR * (1 - alt / 90);
      svg += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" 
              fill="none" stroke="var(--border-color)" stroke-width="0.3" opacity="0.2" stroke-dasharray="2,4"/>`;
      svg += `<text x="${cx + r + 5}" y="${cy - 3}" font-size="6" fill="var(--text-muted)" font-family="var(--font-mono)" opacity="0.5">${alt}°</text>`;
    });

    // Direction labels
    svg += `<text x="${cx - domeR - 5}" y="${cy + 12}" text-anchor="end" font-size="8" fill="var(--text-muted)" font-family="var(--font-mono)">N</text>`;
    svg += `<text x="${cx + domeR + 5}" y="${cy + 12}" text-anchor="start" font-size="8" fill="var(--text-muted)" font-family="var(--font-mono)">S</text>`;
    svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" fill="var(--text-muted)" font-family="var(--font-mono)">E/W</text>`;

    // Plot sun
    if (sunPos && sunPos.altitude > -5) {
      const sunAlt = Math.max(0, sunPos.altitude);
      const normalizedAz = ((sunPos.azimuth - 180) / 180); // -1 to 1 across the dome
      const altFraction = sunAlt / 90;
      const sx = cx + normalizedAz * domeR * (1 - altFraction * 0.3);
      const sy = cy - altFraction * domeR * 0.95;

      svg += `<circle cx="${sx}" cy="${sy}" r="7" fill="var(--accent-orange)" opacity="0.9">
                <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite"/>
              </circle>`;
      svg += `<text x="${sx}" y="${sy - 12}" text-anchor="middle" font-size="7" fill="var(--accent-orange)" font-family="var(--font-mono)">☉</text>`;
    }

    // Plot moon
    if (moonPos && moonPos.altitude > -5) {
      const moonAlt = Math.max(0, moonPos.altitude);
      const normalizedAz = ((moonPos.azimuth - 180) / 180);
      const altFraction = moonAlt / 90;
      const mx = cx + normalizedAz * domeR * (1 - altFraction * 0.3);
      const my = cy - altFraction * domeR * 0.95;

      svg += `<circle cx="${mx}" cy="${my}" r="6" fill="var(--text-main)" opacity="0.8"/>`;
      svg += `<text x="${mx}" y="${my - 10}" text-anchor="middle" font-size="7" fill="var(--text-main)" font-family="var(--font-mono)">☽</text>`;
    }

    // Zenith marker
    svg += `<text x="${cx}" y="${cy - domeR + 15}" text-anchor="middle" font-size="6" fill="var(--text-muted)" font-family="var(--font-mono)" opacity="0.5">ZENITH</text>`;

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  // ── UPDATE ALL CELESTIAL DATA ──
  function update(lat, lng) {
    currentLat = lat;
    currentLng = lng;

    const now = new Date();

    // Sun data
    const sunPos = SunCalc.getPosition(now, lat, lng);
    const sunTimes = SunCalc.getTimes(now, lat, lng);

    // Moon data
    const moonPos = SunCalc.getMoonPosition(now, lat, lng);
    const moonIllum = SunCalc.getMoonIllumination(now);
    const moonTimes = SunCalc.getMoonTimes(now, lat, lng);

    // ── Update Sun Card ──
    updateElement('sunriseTime', formatTime(sunTimes.sunrise));
    updateElement('sunsetTime', formatTime(sunTimes.sunset));
    updateElement('solarNoonTime', formatTime(sunTimes.solarNoon));
    updateElement('goldenHourTime', formatTime(sunTimes.goldenHour));
    updateElement('sunAzimuth', formatDegrees(sunPos.azimuth));
    updateElement('sunAltitude', formatDegrees(sunPos.altitude));
    updateElement('dawnTime', formatTime(sunTimes.dawn));
    updateElement('duskTime', formatTime(sunTimes.dusk));

    // Sun zodiac
    const sunLon = getSunLongitude(now);
    updateElement('sunZodiac', getZodiacSign(sunLon));

    // Golden hour status
    const isGoldenHour = (sunTimes.goldenHour && sunTimes.sunset && 
                          now >= sunTimes.goldenHour && now <= sunTimes.sunset) ||
                         (sunTimes.sunrise && sunTimes.goldenHourEnd && 
                          now >= sunTimes.sunrise && now <= sunTimes.goldenHourEnd);
    const ghDot = document.getElementById('goldenHourDot');
    const ghText = document.getElementById('goldenHourText');
    if (ghDot) ghDot.className = `gh-dot ${isGoldenHour ? '' : 'inactive'}`;
    if (ghText) {
      ghText.textContent = isGoldenHour ? 'GOLDEN HOUR ACTIVE' : 'GOLDEN HOUR INACTIVE';
      ghText.className = `gh-text ${isGoldenHour ? 'active' : ''}`;
    }

    // Sun arc
    renderSunArc(sunPos, sunTimes);

    // ── Update Moon Card ──
    updateElement('moonPhaseName', getMoonPhaseName(moonIllum.phase));
    updateElement('moonIllumination', `${Math.round(moonIllum.fraction * 100)}%`);
    updateElement('moonriseTime', moonTimes.rise ? formatTime(moonTimes.rise) : '--:--');
    updateElement('moonsetTime', moonTimes.set ? formatTime(moonTimes.set) : '--:--');
    updateElement('moonAzimuth', formatDegrees(moonPos.azimuth));
    updateElement('moonAltitude', formatDegrees(moonPos.altitude));
    updateElement('moonDistance', `${Math.round(moonPos.distance).toLocaleString()} km`);
    updateElement('moonWaxing', moonIllum.waxing ? 'WAXING' : 'WANING');

    // Moon phase visual
    renderMoonPhaseSVG(moonIllum.phase, moonIllum.fraction);

    // ── Update Planet Card ──
    if (planetData) {
      const planets = planetData.planets;
      const planetListEl = document.getElementById('planetList');

      if (planetListEl) {
        let html = '';
        Object.keys(planets).forEach(key => {
          const p = planets[key];
          const lon = getPlanetLongitude(p, now);
          const zodiac = getZodiacSign(lon);
          html += `<div class="planet-item">
            <span class="planet-symbol" style="color:${p.color}">${p.symbol}</span>
            <div>
              <div class="planet-name">${p.name}</div>
              <div class="planet-longitude">${formatDegrees(lon)}</div>
            </div>
          </div>`;
        });

        // Rahu & Ketu
        const rahuLon = getRahuLongitude(now);
        const ketuLon = (rahuLon + 180) % 360;
        html += `<div class="planet-item">
          <span class="planet-symbol" style="color:#888">☊</span>
          <div><div class="planet-name">Rahu</div><div class="planet-longitude">${formatDegrees(rahuLon)}</div></div>
        </div>`;
        html += `<div class="planet-item">
          <span class="planet-symbol" style="color:#666">☋</span>
          <div><div class="planet-name">Ketu</div><div class="planet-longitude">${formatDegrees(ketuLon)}</div></div>
        </div>`;

        planetListEl.innerHTML = html;
      }

      // Zodiac belt
      const zodiacBelt = document.getElementById('zodiacPositions');
      if (zodiacBelt) {
        let zhtml = '';
        zhtml += `<span class="zodiac-pos"><span class="z-body">☉</span> ${getZodiacSign(sunLon)}</span>`;
        Object.keys(planets).forEach(key => {
          const p = planets[key];
          const lon = getPlanetLongitude(p, now);
          zhtml += `<span class="zodiac-pos"><span class="z-body">${p.symbol}</span> ${getZodiacSign(lon)}</span>`;
        });
        zodiacBelt.innerHTML = zhtml;
      }

      // Planet orbit visualization
      renderPlanetOrbit(planets, now);
    }

    // ── Sky Dome ──
    renderSkyDome(sunPos, moonPos);
  }

  function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  async function loadPlanetData() {
    try {
      const resp = await fetch('assets/data/planets.json');
      planetData = await resp.json();
    } catch (e) {
      console.warn('Could not load planet data:', e);
      // Fallback inline data
      planetData = {
        planets: {
          mercury: { name: "Mercury", symbol: "☿", L0: 252.2509, L1: 149472.6746, color: "#a0a0a0" },
          venus: { name: "Venus", symbol: "♀", L0: 181.9798, L1: 58517.8157, color: "#e8c56d" },
          mars: { name: "Mars", symbol: "♂", L0: 355.4330, L1: 19140.2993, color: "#cf5637" },
          jupiter: { name: "Jupiter", symbol: "♃", L0: 34.3515, L1: 3034.9057, color: "#c4956a" },
          saturn: { name: "Saturn", symbol: "♄", L0: 50.0774, L1: 1222.1138, color: "#e3d5a0" }
        }
      };
    }
  }

  async function init(lat, lng) {
    await loadPlanetData();
    update(lat, lng);

    // Auto-refresh every 30 seconds
    setInterval(() => update(currentLat, currentLng), 30000);
  }

  return { init, update };
})();
