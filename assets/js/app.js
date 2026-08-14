/* ============================================================
   APP MODULE — Initialization and Geolocation
   ============================================================ */

const App = (() => {
  // Default coordinates (Kochi, India as fallback)
  let lat = 9.9312;
  let lng = 76.2673;

  function initGeolocation() {
    const locStatus = document.getElementById('locationStatus');
    const coordDisplay = document.getElementById('coordinatesDisplay');
    
    if ("geolocation" in navigator) {
      if (locStatus) locStatus.textContent = "ACQUIRING GPS LOCK...";
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          const alt = position.coords.altitude || 0;
          
          if (locStatus) locStatus.textContent = "GPS LOCK: ACQUIRED";
          if (coordDisplay) {
            coordDisplay.innerHTML = `LAT: ${lat.toFixed(4)}°<br>LNG: ${lng.toFixed(4)}°<br>ALT: ${alt.toFixed(1)}m`;
          }
          
          // Initialize celestial tracking with real coordinates
          Celestial.init(lat, lng);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          if (locStatus) locStatus.textContent = "GPS LOCK: FAILED (USING DEFAULT)";
          if (coordDisplay) {
            coordDisplay.innerHTML = `LAT: ${lat.toFixed(4)}°<br>LNG: ${lng.toFixed(4)}°<br>ALT: 0.0m`;
          }
          
          // Initialize with default
          Celestial.init(lat, lng);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      if (locStatus) locStatus.textContent = "GPS HARDWARE: UNAVAILABLE";
      Celestial.init(lat, lng);
    }
  }

  function initTimeLoop() {
    const timeEl = document.getElementById('sysTime');
    const dateEl = document.getElementById('sysDate');
    
    function updateClock() {
      const now = new Date();
      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + 
                            now.getMilliseconds().toString().padStart(3, '0').substring(0, 2);
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit' 
        }).replace(/\//g, '.');
      }
      requestAnimationFrame(updateClock);
    }
    
    requestAnimationFrame(updateClock);
  }

  function initUI() {
    // Start scanline animation
    const crt = document.querySelector('.crt-overlay');
    if (crt) {
      crt.style.animation = 'flicker 0.15s infinite';
    }
  }

  function initAudio() {
    const btn = document.getElementById('audioBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!window.speechSynthesis) {
        alert("Audio telemetry requires a modern browser (Safari/Chrome/Edge). Try opening this link outside of the in-app browser!");
        return;
      }

      // Read current values directly from DOM to get formatted text
      const heading = document.getElementById('compassHeading')?.textContent || 'Unknown';
      const cardinal = document.getElementById('compassCardinal')?.textContent || 'Unknown';
      const magField = document.getElementById('magneticFieldDisplay')?.textContent || 'Unknown';
      
      const sunAz = document.getElementById('sunAzimuth')?.textContent || 'Unknown';
      const sunAlt = document.getElementById('sunAltitude')?.textContent || 'Unknown';
      const moonPhase = document.getElementById('moonPhaseName')?.textContent || 'Unknown';

      const speechText = `
        Current Heading: ${heading}, ${cardinal}.
        Magnetic Field Strength: ${magField}.
        Sun Azimuth: ${sunAz}.
        Sun Altitude: ${sunAlt}.
        Current Lunar Phase: ${moonPhase.toLowerCase()}.
      `;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 1.0;
      utterance.pitch = 0.9;
      
      // Try to find a synthetic/robotic voice if possible
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      if (englishVoices.length > 0) {
        // Simple heuristic to get a clear voice, often the first English one is good
        utterance.voice = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Microsoft')) || englishVoices[0];
      }

      window.speechSynthesis.speak(utterance);
      
      // Visual feedback
      btn.style.boxShadow = "0 0 15px var(--accent-orange)";
      btn.textContent = "PLAYING...";
      
      utterance.onend = () => {
        btn.style.boxShadow = "none";
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg> AUDIO STATUS`;
      };
    });
  }

  function bootstrap() {
    console.log("PERSONAL COMPASS BOOT SEQUENCE INITIATED...");
    
    // 1. Initialize UI Effects
    initUI();
    
    // 2. Start Time Loop
    initTimeLoop();
    
    // 3. Initialize Compass (Sensors)
    Compass.init();
    
    // 4. Acquire Location and Start Celestial Math
    initGeolocation();

    // 5. Initialize Audio System
    initAudio();
  }

  return { bootstrap };
})();

// Boot on load
window.addEventListener('DOMContentLoaded', App.bootstrap);

