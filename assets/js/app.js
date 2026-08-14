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
  }

  return { bootstrap };
})();

// Boot on load
window.addEventListener('DOMContentLoaded', App.bootstrap);
