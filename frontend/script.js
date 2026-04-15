let map;
let defaultMarker;
let bufferCircle;

document.addEventListener('DOMContentLoaded', () => {
    console.log("%c GEOPREDICT SPATIAL ENGINE \n %c System Architect & Lead Developer: Harsh Choubey ", "color:#FF3366; font-size:16px; font-weight:bold;", "color:white; background:#09090b; font-size:12px;");

    // Hide hint strictly after 4 seconds
    setTimeout(() => {
        const hint = document.getElementById('crosshair-hint');
        if (hint) hint.style.opacity = '0';
    }, 4000);

    map = L.map('map', {
        zoomControl: false 
    }).setView([20.5937, 78.9629], 5);

    // 1. ESRI World Imagery - Satellite Base
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    }).addTo(map);

    // 2. CartoDB Positron Only Labels (Draws names of places seamlessly over Satellite)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">Carto</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Persist Branding Edits via LocalStorage
    const titleH1 = document.querySelector('.hud-branding h1');
    const subtitleP = document.querySelector('.hud-branding p');
    if (localStorage.getItem('geoTitle')) titleH1.innerText = localStorage.getItem('geoTitle');
    if (localStorage.getItem('geoSub')) subtitleP.innerText = localStorage.getItem('geoSub');

    titleH1.addEventListener('input', () => localStorage.setItem('geoTitle', titleH1.innerText));
    subtitleP.addEventListener('input', () => localStorage.setItem('geoSub', subtitleP.innerText));

    let geoData = {};

    // Load Offline Data
    fetch('locations.json')
        .then(res => res.json())
        .then(data => {
            geoData = data;
            const stateSel = document.getElementById('state-select');
            Object.keys(geoData).sort().forEach(state => {
                const opt = document.createElement('option');
                opt.value = state;
                opt.textContent = state;
                stateSel.appendChild(opt);
            });
        }).catch(err => console.error("Failed to load offline dataset", err));

    // Handle Cascading Selects
    document.getElementById('state-select').addEventListener('change', (e) => {
        const state = e.target.value;
        const distSel = document.getElementById('district-select');
        const locSel = document.getElementById('location-select');
        const btn = document.getElementById('search-btn');
        
        distSel.innerHTML = '<option value="">SELECT DISTRICT</option>';
        locSel.innerHTML = '<option value="">SELECT PINCODE / LOCATION</option>';
        btn.disabled = true;
        locSel.disabled = true;

        if (state) {
            distSel.disabled = false;
            Object.keys(geoData[state]).sort().forEach(dist => {
                const opt = document.createElement('option');
                opt.value = dist;
                opt.textContent = dist;
                distSel.appendChild(opt);
            });
        } else {
            distSel.disabled = true;
        }
    });

    document.getElementById('district-select').addEventListener('change', (e) => {
        const dist = e.target.value;
        const state = document.getElementById('state-select').value;
        const locSel = document.getElementById('location-select');
        const btn = document.getElementById('search-btn');

        locSel.innerHTML = '<option value="">SELECT PINCODE / LOCATION</option>';
        btn.disabled = true;

        if (dist && state) {
            locSel.disabled = false;
            geoData[state][dist].sort((a,b) => a.loc.localeCompare(b.loc)).forEach((item, idx) => {
                const opt = document.createElement('option');
                opt.value = idx; // store array index
                opt.textContent = item.loc;
                locSel.appendChild(opt);
            });
        } else {
            locSel.disabled = true;
        }
    });

    document.getElementById('location-select').addEventListener('change', (e) => {
        document.getElementById('search-btn').disabled = !e.target.value;
    });

    // Handle Search functionality
    document.getElementById('search-btn').addEventListener('click', async () => {
        const state = document.getElementById('state-select').value;
        const dist = document.getElementById('district-select').value;
        const locIdx = document.getElementById('location-select').value;

        if (!state || !dist || !locIdx) return;

        const targetData = geoData[state][dist][locIdx];
        const lat = parseFloat(targetData.lat);
        const lon = parseFloat(targetData.lon);

        map.flyTo([lat, lon], 14, {animate: true, duration: 1.5});
        updateMapMarker(lat, lon, parseInt(document.getElementById('radius').value));
        document.getElementById('lat').value = lat.toFixed(4);
        document.getElementById('lon').value = lon.toFixed(4);
    });

    // Map Click Interceptor
    map.on('click', function(e) {
        // Hide hint
        const hint = document.getElementById('crosshair-hint');
        if (hint) hint.style.opacity = '0';

        const lat = parseFloat(e.latlng.lat).toFixed(4);
        const lon = parseFloat(e.latlng.lng).toFixed(4);
        document.getElementById('lat').value = lat;
        document.getElementById('lon').value = lon;
        
        const radius = parseInt(document.getElementById('radius').value);
        updateMapMarker(lat, lon, radius);
    });

    // Run Scan
    document.getElementById('run-btn').addEventListener('click', async () => {
        const lat = parseFloat(document.getElementById('lat').value);
        const lon = parseFloat(document.getElementById('lon').value);
        const radius = parseInt(document.getElementById('radius').value);

        if (isNaN(lat) || isNaN(lon)) return showToast('COORDINATES NOT LOCKED');

        updateMapMarker(lat, lon, radius);
        map.flyTo([lat, lon], getZoomLevelForRadius(radius), { animate: true, duration: 1 });

        setLoadingState(true);

        try {
            const result = await ApiService.evaluateLocation(lat, lon, radius);
            populateResults(result);
            showResultsPanel(true);
        } catch (error) {
            showToast(error.message);
            showResultsPanel(false);
        } finally {
            setLoadingState(false);
        }
    });

    document.getElementById('close-results').addEventListener('click', () => {
        showResultsPanel(false);
    });

    document.getElementById('radius').addEventListener('change', (e) => {
        const lat = parseFloat(document.getElementById('lat').value);
        const lon = parseFloat(document.getElementById('lon').value);
        if (!isNaN(lat) && !isNaN(lon)) {
            updateMapMarker(lat, lon, parseInt(e.target.value));
        }
    });
});

function updateMapMarker(lat, lon, radiusInMeters) {
    if(defaultMarker) map.removeLayer(defaultMarker);
    if(bufferCircle) map.removeLayer(bufferCircle);

    // Custom Tactical Marker
    const icon = L.divIcon({
        html: '<div style="width:12px;height:12px;background:#FF3366;border-radius:50%;box-shadow:0 0 15px #FF3366;border:2px solid white;"></div>',
        className: 'custom-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    defaultMarker = L.marker([lat, lon], {icon: icon}).addTo(map);
    
    bufferCircle = L.circle([lat, lon], {
        color: '#FF3366',
        fillColor: 'transparent',
        dashArray: '5, 5',
        radius: radiusInMeters,
        weight: 2
    }).addTo(map);
}

function getZoomLevelForRadius(radius) {
    if(radius <= 1000) return 15;
    if(radius <= 5000) return 13;
    return 11;
}

function setLoadingState(isLoading) {
    const btn = document.getElementById('run-btn');
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');

    if (isLoading) {
        btn.disabled = true;
        text.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        text.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

function showResultsPanel(show) {
    const panel = document.getElementById('results-layer');
    if (show) {
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function showToast(msg) {
    const t = document.getElementById('toast-container');
    document.getElementById('toast-msg').textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => {
        t.classList.add('hidden');
    }, 4000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
}

function populateResults(data) {
    const r = data.metrics;
    const l = data.location;
    
    document.getElementById('res-price').innerHTML = `₹${formatCurrency(r.estimated_price_sqft)} <span style="font-size:1rem;color:var(--fg-secondary);">/sq.ft</span>`;
    document.getElementById('res-location').textContent = l.place_name.toUpperCase();
    document.getElementById('res-pincode').textContent = l.nearest_pincode;
    
    document.getElementById('res-density').textContent = '+ ' + r.density_multiplier_pct.toFixed(0) + '%';
    document.getElementById('res-variety').textContent = r.variety_score;
    document.getElementById('res-bonus').textContent = `+ ${r.proximity_bonus_pct.toFixed(1)}%`;

    const container = document.getElementById('features-container');
    container.innerHTML = ''; 

    Object.entries(data.features).forEach(([category, info]) => {
        if(info.count > 0) {
            let distFormatted = info.avg_dist_m > 1000 
                ? (info.avg_dist_m/1000).toFixed(1) + 'km'
                : info.avg_dist_m.toFixed(0) + 'm';

            const pill = document.createElement('div');
            pill.className = 'pill';
            pill.innerHTML = `
                <span class="p-cat">${category}</span>
                <span class="p-val">${info.count} [${distFormatted}]</span>
            `;
            container.appendChild(pill);
        }
    });

    if (container.innerHTML === '') {
        container.innerHTML = '<span class="mono" style="color:var(--accent);">NO INFRASTRUCTURE DETECTED IN IMMEDIATE SECTOR AS PER THE LAST DATASET UPDATES</span>';
    }
}
