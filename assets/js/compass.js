/* ============================================================
   COMPASS MODULE — SVG Compass Rose + Device Orientation
   ============================================================ */

const Compass = (() => {
  let currentHeading = 0;
  let targetHeading = 0;
  let animFrame = null;
  let orientationSupported = false;
  let demoMode = true;
  let demoAngle = 0;

  const CARDINALS = [
    { deg: 0, label: 'N', major: true },
    { deg: 45, label: 'NE', major: false },
    { deg: 90, label: 'E', major: true },
    { deg: 135, label: 'SE', major: false },
    { deg: 180, label: 'S', major: true },
    { deg: 225, label: 'SW', major: false },
    { deg: 270, label: 'W', major: true },
    { deg: 315, label: 'NW', major: false }
  ];

  function getCardinalName(deg) {
    deg = ((deg % 360) + 360) % 360;
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function createSVG() {
    const container = document.getElementById('compassSvg');
    if (!container) return;

    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 155;
    const innerR = 130;
    const tickR = 145;

    let svg = `<svg viewBox="0 0 ${size} ${size}" class="compass-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Definitions
    svg += `<defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glowStrong">
        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    // Rotating group (the dial rotates, needle stays fixed)
    svg += `<g id="compassDial" transform="rotate(0, ${cx}, ${cy})">`;

    // Outer rings
    svg += `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="var(--border-color)" stroke-width="1" opacity="0.5"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="var(--border-color)" stroke-width="0.5" opacity="0.3"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="100" fill="none" stroke="var(--border-color)" stroke-width="0.5" opacity="0.2"/>`;

    // Degree tick marks (every 5°, major every 30°)
    for (let deg = 0; deg < 360; deg += 1) {
      const rad = (deg - 90) * Math.PI / 180;
      const isMajor30 = deg % 30 === 0;
      const isMajor10 = deg % 10 === 0;
      const isMajor5 = deg % 5 === 0;

      let r1, r2, sw, op;
      if (isMajor30) {
        r1 = outerR - 2; r2 = innerR + 5; sw = 1.5; op = 0.9;
      } else if (isMajor10) {
        r1 = outerR - 2; r2 = tickR - 5; sw = 1; op = 0.5;
      } else if (isMajor5) {
        r1 = outerR - 2; r2 = tickR; sw = 0.5; op = 0.3;
      } else {
        r1 = outerR - 2; r2 = outerR - 6; sw = 0.3; op = 0.15;
      }

      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy + r2 * Math.sin(rad);

      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
              stroke="var(--text-main)" stroke-width="${sw}" opacity="${op}"/>`;

      // Degree numbers every 30°
      if (isMajor30 && deg % 90 !== 0) {
        const numR = innerR - 10;
        const nx = cx + numR * Math.cos(rad);
        const ny = cy + numR * Math.sin(rad);
        svg += `<text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="central"
                font-family="var(--font-mono)" font-size="9" fill="var(--text-muted)" opacity="0.7"
                transform="rotate(${deg}, ${nx}, ${ny})">${deg}°</text>`;
      }
    }

    // Cardinal & intercardinal labels
    CARDINALS.forEach(c => {
      const rad = (c.deg - 90) * Math.PI / 180;
      const labelR = c.major ? innerR - 22 : innerR - 14;
      const x = cx + labelR * Math.cos(rad);
      const y = cy + labelR * Math.sin(rad);
      const size = c.major ? 16 : 10;
      const color = c.label === 'N' ? 'var(--accent-red)' : 
                    c.label === 'S' ? 'var(--accent-orange)' : 'var(--text-main)';
      const filter = c.major ? 'filter="url(#glow)"' : '';

      svg += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
              font-family="var(--font-main)" font-size="${size}" font-weight="700"
              fill="${color}" ${filter}
              transform="rotate(${c.deg}, ${x}, ${y})">${c.label}</text>`;
    });

    // Cross-hair lines
    svg += `<line x1="${cx}" y1="${cy - 80}" x2="${cx}" y2="${cy + 80}" stroke="var(--border-color)" stroke-width="0.3" opacity="0.3"/>`;
    svg += `<line x1="${cx - 80}" y1="${cy}" x2="${cx + 80}" y2="${cy}" stroke="var(--border-color)" stroke-width="0.3" opacity="0.3"/>`;

    svg += `</g>`; // end compassDial

    // Fixed center elements (don't rotate)
    // Needle — North pointer (triangle)
    svg += `<polygon points="${cx},${cy - 65} ${cx - 8},${cy} ${cx + 8},${cy}" 
            fill="var(--accent-red)" opacity="0.9" filter="url(#glowStrong)"/>`;
    // South pointer
    svg += `<polygon points="${cx},${cy + 65} ${cx - 8},${cy} ${cx + 8},${cy}" 
            fill="var(--text-muted)" opacity="0.5"/>`;

    // Center hub
    svg += `<circle cx="${cx}" cy="${cy}" r="12" fill="var(--card-bg)" stroke="var(--text-main)" stroke-width="2" filter="url(#glow)"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="var(--text-main)" filter="url(#glow)"/>`;

    // Fixed bearing indicator at top
    svg += `<polygon points="${cx},${cy - outerR + 5} ${cx - 6},${cy - outerR - 8} ${cx + 6},${cy - outerR - 8}" 
            fill="var(--text-main)" filter="url(#glow)"/>`;

    svg += `</svg>`;

    container.innerHTML = svg;
  }

  function updateDial(heading) {
    const dial = document.getElementById('compassDial');
    if (dial) {
      // Rotate dial opposite to heading so N stays in correct direction
      dial.setAttribute('transform', `rotate(${-heading}, 170, 170)`);
    }

    // Update heading display
    const headingEl = document.getElementById('compassHeading');
    const cardinalEl = document.getElementById('compassCardinal');
    if (headingEl) headingEl.textContent = `${Math.round(heading)}°`;
    if (cardinalEl) cardinalEl.textContent = getCardinalName(heading);
  }

  function smoothUpdate() {
    // Smooth interpolation for heading
    let diff = targetHeading - currentHeading;
    // Take shortest path around 360°
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Apply deadzone to prevent jitter (if diff is very small, ignore it)
    if (Math.abs(diff) < 0.2) {
      diff = 0;
    }

    // Heavier damping for stability (0.02 instead of 0.08)
    currentHeading += diff * 0.02;
    currentHeading = ((currentHeading % 360) + 360) % 360;

    updateDial(currentHeading);
    animFrame = requestAnimationFrame(smoothUpdate);
  }

  function initDeviceOrientation() {
    if ('DeviceOrientationEvent' in window) {
      // iOS 13+ requires permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.getElementById('compassSvg').addEventListener('click', async () => {
          try {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
              orientationSupported = true;
              demoMode = false;
              updateModeTag();
            }
          } catch (e) {
            console.warn('Device orientation permission denied');
          }
        }, { once: true });
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
        // Check after a short delay if we actually got data
        setTimeout(() => {
          if (!orientationSupported) {
            startDemoMode();
          }
        }, 1500);
      }
    } else {
      startDemoMode();
    }
  }

  function handleOrientation(e) {
    if (e.alpha !== null) {
      orientationSupported = true;
      demoMode = false;
      updateModeTag();

      // webkitCompassHeading for iOS, otherwise compute from alpha
      let heading;
      if (e.webkitCompassHeading !== undefined) {
        heading = e.webkitCompassHeading;
      } else {
        heading = 360 - e.alpha;
      }
      targetHeading = heading;
    }
  }

  function startDemoMode() {
    demoMode = true;
    updateModeTag();

    // Gentle oscillating demo
    function demoTick() {
      demoAngle += 0.3;
      targetHeading = (Math.sin(demoAngle * 0.02) * 180 + 180 + Math.sin(demoAngle * 0.005) * 90) % 360;
    }
    setInterval(demoTick, 50);
  }

  function updateModeTag() {
    const modeEl = document.getElementById('compassMode');
    if (modeEl) {
      modeEl.textContent = demoMode ? 
        'DEVICE_ORIENTATION: UNAVAILABLE // DEMO_MODE' : 
        'DEVICE_ORIENTATION: ACTIVE // LIVE_TRACKING';
    }
  }

  function init() {
    createSVG();
    smoothUpdate();
    initDeviceOrientation();
    initMagnetometer();

    // Start demo mode as default fallback after 2s
    setTimeout(() => {
      if (!orientationSupported) {
        startDemoMode();
      }
    }, 2000);
  }

  // ── MAGNETOMETER SUPPORT ──
  let magField = 0;
  let magStatus = "UNAVAILABLE";

  function initMagnetometer() {
    if ('Magnetometer' in window) {
      try {
        const mag = new Magnetometer({ frequency: 10 });
        mag.addEventListener('reading', () => {
          magField = Math.sqrt(mag.x * mag.x + mag.y * mag.y + mag.z * mag.z);
          magStatus = "ACTIVE";
          updateMagDisplay();
        });
        mag.addEventListener('error', event => {
          magStatus = "ERROR: " + event.error.name;
          startMockMag();
        });
        mag.start();
      } catch (e) {
        startMockMag();
      }
    } else {
      startMockMag();
    }
  }

  function startMockMag() {
    // Fakes Earth's baseline magnetic field (25-65 µT) if no hardware sensor is found
    magStatus = "SIMULATED (NO SENSOR)";
    setInterval(() => {
      // Base around 45 µT with ±1 µT natural fluctuation
      magField = 45 + (Math.sin(Date.now() / 1000) * 0.5) + (Math.random() * 0.5);
      updateMagDisplay();
    }, 500);
  }

  function updateMagDisplay() {
    const el = document.getElementById('magneticFieldDisplay');
    if (el) el.textContent = magField.toFixed(1) + ' µT';
    
    const statusEl = document.getElementById('magStatusTag');
    if (statusEl) statusEl.textContent = 'MAG SENSOR: ' + magStatus;
  }

  function getHeading() {
    return currentHeading;
  }

  return { init, getHeading, getCardinalName };
})();
