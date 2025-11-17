// Elements
const qEl = document.getElementById('q');
const googleBtn = document.getElementById('googleSearch');
const getBtn = document.getElementById('getWeather');
const clearBtn = document.getElementById('clear');
const notice = document.getElementById('notice');

const placeEl = document.getElementById('place');
const lastUpdatedEl = document.getElementById('lastUpdated');
const tempEl = document.getElementById('temp');
const condEl = document.getElementById('cond');
const iconEl = document.getElementById('icon');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const forecastEl = document.getElementById('forecast');
const darkToggle = document.getElementById('darkToggle');
const heroTemp = document.getElementById('heroTemp');
const heroPlace = document.getElementById('heroPlace');
const heroCond = document.getElementById('heroCond');
const heroIcon = document.getElementById('heroIcon');
const rightTime = document.getElementById('rightTime');
const rightCond = document.getElementById('rightCond');
const hourChartEl = document.getElementById('hourChart');
let hourChart;
let currentHourly = [];

// Background video support removed to restore prior state

// Theme
function applyTheme(dark){ document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', dark ? '1' : '0'); }
darkToggle.addEventListener('change', ()=> applyTheme(darkToggle.checked));
const saved = localStorage.getItem('dark') === '1'; darkToggle.checked = saved; applyTheme(saved);

// API key: prompt user when needed. We no longer keep a key input on the page.
function getKey(){
  // If a key was previously stored in localStorage use it, otherwise prompt the user.
  const stored = localStorage.getItem('OWM_KEY');
  if(stored) return stored;
  const k = window.prompt('Enter your OpenWeatherMap API key (get one at https://openweathermap.org)');
  if(!k){
    setNotice('API key required to fetch weather. Get one at https://openweathermap.org');
    return '';
  }
  return k.trim();
}

// Utilities
function setNotice(msg){ notice.textContent = msg }
// Set the "Last updated" display. If `summary` is provided, show the summary
// (e.g. "Rainy • Humidity: 80% • Wind: 5 m/s"). Otherwise fall back to a timestamp.
function setLastUpdated(summary){
  if(summary){
    lastUpdatedEl.textContent = summary;
  } else {
    lastUpdatedEl.textContent = new Date().toLocaleString();
  }
}

// Google weather search
googleBtn.addEventListener('click', ()=>{
  const q = qEl.value.trim(); if(!q) return setNotice('Type a city or country to search');
  const url = 'https://www.google.com/search?q=' + encodeURIComponent('weather ' + q);
  window.open(url, '_blank');
});

// Clear
clearBtn.addEventListener('click', ()=>{
  qEl.value=''; placeEl.textContent='—'; tempEl.textContent='—'; condEl.textContent='—'; iconEl.style.display='none'; humidityEl.textContent='—'; windEl.textContent='—'; forecastEl.innerHTML=''; setNotice('Cleared');
});

// Main: get lat/lon via geocoding, then call onecall
async function fetchWeather(query){
  const key = getKey();
  if(!key) return setNotice('No OpenWeatherMap API key saved — get one at openweathermap.org and Save Key');
  try{
    setNotice('Resolving location...');
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${key}`);
    if(!geoRes.ok){
      const body = await geoRes.text().catch(()=>'');
      if(geoRes.status === 401) {
        setNotice('Error: Invalid API key (401). Check your OpenWeatherMap key.');
        return;
      }
      setNotice(`Error: Geocoding failed (${geoRes.status}) ${body ? '- ' + body.slice(0,200) : ''}`);
      return;
    }
    const geo = await geoRes.json();
    if(!geo || !geo.length){ setNotice('Location not found. Try "City" or "City, Country"'); return; }
    const loc = geo[0];
    const lat = loc.lat, lon = loc.lon; const placeName = [loc.name, loc.state, loc.country].filter(Boolean).join(', ');

    setNotice('Fetching weather...');
    const onecallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${key}`;
    const wRes = await fetch(onecallUrl);
    if(!wRes.ok){
      const body = await wRes.text().catch(()=>'');
      if(wRes.status === 401){ setNotice('Error: Invalid API key (401) when fetching weather.'); return; }
      setNotice(`Error: Weather fetch failed (${wRes.status}) ${body ? '- ' + body.slice(0,200) : ''}`);
      return;
    }
    const w = await wRes.json();

    // Current
    placeEl.textContent = placeName;
    const curTemp = Math.round(w.current.temp);
    tempEl.textContent = curTemp + '°C';
    condEl.textContent = w.current.weather && w.current.weather[0] ? w.current.weather[0].description : '';
    // hero
    if(heroTemp) heroTemp.textContent = curTemp + '°';
    if(heroPlace) heroPlace.textContent = placeName;
    if(heroCond) heroCond.textContent = condEl.textContent;
    humidityEl.textContent = (w.current.humidity ?? '—') + '%';
    windEl.textContent = (w.current.wind_speed ?? '—') + ' m/s';
    // Choose background/icon from local `icons/` (download PNGs from freeiconspng.com)
    // Mapping: use broad weather group names to choose an appropriate PNG filename.
    const conditionMain = w.current.weather && w.current.weather[0] ? (w.current.weather[0].main || '').toLowerCase() : '';
    const iconMap = {
      clear: 'icons/clear.png',
      clouds: 'icons/clouds.png',
      rain: 'icons/rain.png',
      drizzle: 'icons/drizzle.png',
      thunderstorm: 'icons/thunder.png',
      snow: 'icons/snow.png',
      mist: 'icons/mist.png',
      haze: 'icons/mist.png',
      fog: 'icons/mist.png'
    };

    let bgUrl = '';
    if(conditionMain){
      // try exact mapping first
      bgUrl = iconMap[conditionMain] || '';
    }

    if(bgUrl){
      // apply local background if present
      const heroEl = document.getElementById('hero');
      if(heroEl){ heroEl.style.backgroundImage = `url("${bgUrl}")`; }
      if(heroIcon){ heroIcon.style.display = 'none'; }
      // still set the small icon element to openweathermap icon as fallback
      if(w.current.weather && w.current.weather[0]){
        const ico = w.current.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${ico}@2x.png`;
        iconEl.src = iconUrl; iconEl.style.display = '';
      }
      if(rightCond){ rightCond.textContent = (w.current.weather[0].main || '').toString(); }
    } else {
      // fallback to OpenWeatherMap icon if no local image
      if(w.current.weather && w.current.weather[0]){
        const ico = w.current.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${ico}@2x.png`;
        iconEl.src = iconUrl; iconEl.style.display = '';
        if(heroIcon){ heroIcon.src = iconUrl; heroIcon.style.display = ''; }
        if(rightCond){ rightCond.textContent = (w.current.weather[0].main || '').toString(); }
      } else { iconEl.style.display='none' }
    }

    // right-side time/condition formatting
    if(rightTime){
      const now = new Date(w.current.dt * 1000);
      const opts = {weekday:'long', hour:'numeric', minute:'2-digit'};
      rightTime.textContent = now.toLocaleString(undefined, opts);
    }

    // Forecast (daily) - show 7 days
    forecastEl.innerHTML='';
    (w.daily || []).slice(0,7).forEach(day =>{
      const d = new Date(day.dt * 1000);
      const name = d.toLocaleDateString(undefined,{weekday:'short'});
      const icon = day.weather && day.weather[0] ? day.weather[0].icon : '';
      const desc = day.weather && day.weather[0] ? day.weather[0].main : '';
      const min = Math.round(day.temp.min), max = Math.round(day.temp.max);
      const node = document.createElement('div'); node.className='day';
      node.innerHTML = `<div style="font-weight:600">${name}</div><img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt=""/><div class="muted">${desc}</div><div style="margin-top:6px">${max}° / ${min}°</div>`;
      forecastEl.appendChild(node);
    });

    // Build a short summary for the right column's "Last updated" field
    const summary = `${condEl.textContent || ''} • Humidity: ${w.current.humidity ?? '—'}% • Wind: ${w.current.wind_speed ?? '—'} m/s`;
    setLastUpdated(summary);
    setNotice('');

    // Prepare hourly data for next 24 hours
    currentHourly = (w.hourly || []).slice(0,24);
    setupHourlyChart();
  }catch(err){ console.error(err); setNotice('Error: '+err.message); }
}

getBtn.addEventListener('click', ()=>{
  const q = qEl.value.trim(); if(!q) return setNotice('Please enter a city or country');
  fetchWeather(q);
});

// News fetching: query news about weather and compute percentage mentioning severe keywords
// News integration removed

// Hourly chart setup and updates
function setupHourlyChart(){
  if(!hourChartEl) return;
  const labels = currentHourly.map(h => new Date(h.dt*1000).getHours()+':00');
  const temps = currentHourly.map(h => Math.round(h.temp));
  const pops = currentHourly.map(h => Math.round((h.pop||0)*100));
  const winds = currentHourly.map(h => Math.round(h.wind_speed));

  const dataTemp = { labels, datasets:[{data:temps, borderColor:'hsl(200,80%,60%)', backgroundColor:'rgba(37,99,235,0.12)', fill:true, tension:0.3}] };
  const dataPop = { labels, datasets:[{data:pops, borderColor:'hsl(210,60%,60%)', backgroundColor:'rgba(59,130,246,0.12)', fill:true, tension:0.3}] };
  const dataWind = { labels, datasets:[{data:winds, borderColor:'hsl(40,90%,60%)', backgroundColor:'rgba(245,158,11,0.08)', fill:true, tension:0.3}] };

  // create chart if missing
  if(!hourChart){
    hourChart = new Chart(hourChartEl.getContext('2d'), { type:'line', data:dataTemp, options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false}} } });
  } else {
    hourChart.data = dataTemp; hourChart.update();
  }

  // attach metric buttons
  document.querySelectorAll('button[data-metric]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.metric==='temp');
    btn.onclick = ()=>{
      const m = btn.dataset.metric;
      document.querySelectorAll('button[data-metric]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(m==='temp'){ hourChart.data = dataTemp; hourChart.options.scales.y.beginAtZero=false; }
      if(m==='pop'){ hourChart.data = dataPop; hourChart.options.scales.y.beginAtZero=true; }
      if(m==='wind'){ hourChart.data = dataWind; hourChart.options.scales.y.beginAtZero=true; }
      hourChart.update();
    };
  });
}

// allow Enter key
qEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') getBtn.click(); });

// no on-page API key field; keeping localStorage support in case a key was stored previously

// Parachute toys removed to restore previous UI state
