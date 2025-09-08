// ==============================
// Application Leaflet VTT - App.js
// ==============================

// === Configuration Générale ===
const config = {
    defaultCenter: [48.64822242034096, 0.6728590452275891],
    defaultZoom: 13,
    gpxPath: 'data/',
    difficultyColors: {
        'vert': 'green',
        'bleu': 'blue',
        'rouge': 'red',
        'noir': 'black'
    },
    trackColors: {
        'vert': '#2ECC71',
        'bleu': '#3498DB',
        'rouge': '#E74C3C',
        'noir': '#2C3E50'
    },
    zoomSettings: {
        padding: [30, 30],
        maxZoom: 15,
        animate: true,
        duration: 0.8,
        easeLinearity: 0.3
    }
};

// === Données de parcours (simulées) ===
const allRoutes = [
    { name: "Le Tremblay", file: "parcours1.gpx", distance: 10, difficulty: "vert" },
    { name: "Le long du fer", file: "parcours2.gpx", distance: 18, difficulty: "bleu" },
    { name: "Le camp retranché de St Gilles", file: "parcours3.gpx", distance: 10, difficulty: "bleu" },
    { name: "L'Etoile du Perche et ses Etangs", file: "parcours4.gpx", distance: 28, difficulty: "bleu" },
    { name: "La Clairière de Bresolettes", file: "parcours5.gpx", distance: 31, difficulty: "bleu" },
    { name: "Les ruines du château de Gannes", file: "parcours6.gpx", distance: 28, difficulty: "bleu" },
    { name: "La butte aux loups", file: "parcours7.gpx", distance: 49, difficulty: "rouge" },
    { name: "La vue sur le Perche", file: "parcours8.gpx", distance: 52, difficulty: "rouge" },
    { name: "Les 10 villages", file: "parcours9.gpx", distance: 89, difficulty: "noir" },
];

// === Initialisation de la carte ===
const map = L.map('map', {zoomControl: false}).setView(config.defaultCenter, config.defaultZoom);

// ... (collez ici tout le reste de votre code JavaScript) ...
// (De "Définir les fonds de carte" jusqu'à la fin)

// Définir les fonds de carte
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' });
const topo = L.tileLayer('https://{s}.tile.opentomap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenTopoMap (CC-BY-SA)' });
const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'], attribution: '&copy; Google Maps' });
const googleTopo = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: 'Map data ©2024 Google' });

const baseMaps = { "OpenStreetMap": osm, "Carto Light": carto, "OpenTopoMap": topo, "Satellite": googleSat, "Topographique": googleTopo };

L.control.layers(baseMaps).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomright', metric: true, imperial: false }).addTo(map);

let currentLayer = null;
let hoverMarker = null;
let elevationChart = null;

// === Gestion du panneau mobile ===
const routePanel = document.getElementById('route-panel');
const openPanelBtn = document.getElementById('open-panel-btn');
const closePanelBtn = document.getElementById('close-panel-btn');

openPanelBtn.addEventListener('click', () => routePanel.classList.remove('hidden'));
closePanelBtn.addEventListener('click', () => routePanel.classList.add('hidden'));

// === Chargement d'un fichier GPX ===
function smooth(data, windowSize = 5) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - windowSize);
        const end = Math.min(data.length - 1, i + windowSize);
        const subset = data.slice(start, end + 1);
        const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
        result.push(avg);
    }
    return result;
}

function loadGPX(filename, difficulty) {
    document.getElementById('loader').classList.remove('hidden');
    if (currentLayer) map.removeLayer(currentLayer);
    if (hoverMarker) map.removeLayer(hoverMarker);
    if (elevationChart) elevationChart.destroy();
    document.getElementById('elevation-panel').classList.remove('hidden');

    const trackColor = config.trackColors[difficulty];
    const gpxLayer = new L.GPX(config.gpxPath + filename, {
        async: true,
        marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
        polyline_options: { color: trackColor, weight: 5 },
        parseElements: ['track', 'route']
    }).on('loaded', function (e) {
        document.getElementById('loader').classList.add('hidden');
        const polylineLayer = e.target.getLayers().find(l => l instanceof L.Polyline);
        if (!polylineLayer) {
            console.warn("Aucune couche de trace GPX trouvée.");
            return;
        }
        map.fitBounds(e.target.getBounds(), { padding: config.zoomSettings.padding });
        const points = polylineLayer.getLatLngs();
        const rawElevations = points.map(p => p.meta?.ele ?? p.alt ?? 0);
        const elevationDisplay = smooth(rawElevations, 5);
        let totalDistance = 0, elevationGain = 0, maxSlope = 0, elevationMin = Infinity, elevationMax = -Infinity, elevationLoss = 0;
        const chartData = [];
        for (let i = 0; i < points.length; i++) {
            const curr = points[i];
            elevationMin = Math.min(elevationMin, rawElevations[i]);
            elevationMax = Math.max(elevationMax, rawElevations[i]);
            if (i > 0) {
                const prev = points[i - 1];
                const dist = prev.distanceTo(curr);
                totalDistance += dist;
                const deltaAlt = rawElevations[i] - rawElevations[i - 1];
                if (deltaAlt > 0) elevationGain += deltaAlt;
                else elevationLoss += Math.abs(deltaAlt);
                if (dist > 3 && deltaAlt > 0) {
                    const slope = deltaAlt / dist;
                    if (slope > maxSlope) maxSlope = slope;
                }
            }
            chartData.push({ x: totalDistance / 1000, y: elevationDisplay[i] });
        }
        const totalDistanceKm = totalDistance / 1000;
        document.getElementById('route-stats').innerHTML = `
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-green-500 mr-1 text-base">trending_up</span>D+ cumulé</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationGain)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-red-500 mr-1 text-base">trending_down</span>D- cumulé</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationLoss)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-blue-500 mr-1 text-base">landscape</span>Élévation max</p><p class="text-xl font-bold text-gray-800">${Math.round(elevationMax)} m</p></div>
            <div class="bg-gray-50 p-3 rounded-lg"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-purple-500 mr-1 text-base">route</span>Distance</p><p class="text-xl font-bold text-gray-800">${totalDistanceKm.toFixed(2)} km</p></div>
            <div class="bg-gray-50 p-3 rounded-lg col-span-2 sm:col-span-1"><p class="text-xs text-gray-500 uppercase flex items-center justify-center"><span class="material-icons text-orange-500 mr-1 text-base">terrain</span>Pente max</p><p class="text-xl font-bold text-gray-800">${(maxSlope * 100).toFixed(1)} %</p></div>`;
        renderElevationChart(chartData, points, trackColor, totalDistanceKm);
    }).addTo(map);
    currentLayer = gpxLayer;
    document.getElementById('download-gpx').onclick = () => {
        const url = config.gpxPath + filename;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    document.getElementById('share-link').onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Le lien a été copié dans votre presse-papiers !");
    };
}

// === Rendu du graphique d'élévation ===
function renderElevationChart(chartData, latlngs, trackColor, totalDistance) {
    const canvas = document.getElementById('elevation-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (elevationChart) elevationChart.destroy();
    if (hoverMarker) map.removeLayer(hoverMarker);
    elevationChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ data: chartData, borderColor: trackColor, backgroundColor: trackColor + '26', borderWidth: 2, pointRadius: 0, tension: 0.2, fill: 'origin' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', position: 'bottom', min: 0, max: totalDistance, ticks: { callback: val => `${val.toFixed(1)} km`, color: '#6b7280', maxTicksLimit: 10 }, grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false } },
                y: { ticks: { callback: val => `${val} m`, color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false } }
            },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1f2937', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 8,
                callbacks: {
                    label: ctx => {
                        const index = ctx.dataIndex;
                        const currentElevation = ctx.parsed.y;
                        let slope = 0, elevationChange = 0;
                        if (index > 0) {
                            const prevElevation = chartData[index - 1].y;
                            const prevDistance = chartData[index - 1].x;
                            const currentDistance = chartData[index].x;
                            elevationChange = currentElevation - prevElevation;
                            const distanceInMeters = (currentDistance - prevDistance) * 1000;
                            if (distanceInMeters > 0) slope = (elevationChange / distanceInMeters) * 100;
                        }
                        let tooltipText = [`Altitude: ${Math.round(currentElevation)} m`];
                        if (index > 0) tooltipText.push(`Pente: ${slope.toFixed(1)} %`);
                        return tooltipText;
                    }
                }
            }},
            interaction: { intersect: false, mode: 'index' }
        }
    });
    canvas.addEventListener('mousemove', (event) => {
        const elements = elevationChart.getElementsAtEventForMode(event, 'index', { intersect: false }, true);
        if (elements.length > 0) {
            const latlng = latlngs[elements[0].index];
            if (!hoverMarker) {
                hoverMarker = L.circleMarker(latlng, { radius: 6, color: trackColor, fillColor: '#ffffff', fillOpacity: 1, weight: 2 }).addTo(map);
            } else {
                hoverMarker.setLatLng(latlng);
            }
        }
    });
    canvas.addEventListener('mouseleave', () => {
        if (hoverMarker) {
            map.removeLayer(hoverMarker);
            hoverMarker = null;
        }
    });
}

// === Génération des boutons de parcours et des filtres ===
let currentFilter = 'all';

function renderRouteButtons(filteredRoutes) {
    const listContainer = document.getElementById('route-list');
    listContainer.innerHTML = '';
    filteredRoutes.forEach(route => {
        const btn = document.createElement('button');
        btn.className = `route-btn flex w-full justify-between items-center p-3 rounded-md border-l-4 border-${config.difficultyColors[route.difficulty]}-500 bg-white hover:bg-gray-50 cursor-pointer transition-all duration-300 shadow-sm`;
        btn.setAttribute('data-gpx', route.file);
        btn.setAttribute('data-difficulty', route.difficulty);
        btn.innerHTML = `
            <div class="flex flex-col items-start">
                <p class="font-semibold text-gray-800">${route.name}</p>
                <p class="text-sm text-gray-600">${route.distance} km</p>
            </div>
            <span class="difficulty-badge text-xs font-bold px-2 py-1 rounded-full ${route.difficulty}">${route.difficulty.toUpperCase()}</span>
        `;
        btn.addEventListener('click', () => {
            const selectedDifficulty = btn.getAttribute('data-difficulty');
            loadGPX(route.file, selectedDifficulty);
            document.querySelectorAll('.route-btn').forEach(b => b.classList.remove('bg-gray-50'));
            btn.classList.add('bg-gray-50');

            if (window.innerWidth < 1024) {
                routePanel.classList.add('hidden');
            }
        });
        listContainer.appendChild(btn);
    });
}

// Gestion de la recherche et du filtre
document.getElementById('route-search').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const filtered = allRoutes.filter(route =>
        (currentFilter === 'all' || route.difficulty === currentFilter) &&
        route.name.toLowerCase().includes(searchTerm)
    );
    renderRouteButtons(filtered);
});

document.getElementById('difficulty-filter').addEventListener('click', function (e) {
    const target = e.target.closest('.filter-btn');
    if (target) {
        const difficulty = target.getAttribute('data-difficulty');
        currentFilter = difficulty;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-orange-500', 'text-white', 'hover:bg-orange-600');
            b.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        });
        target.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        target.classList.add('bg-orange-500', 'text-white', 'hover:bg-orange-600');
        const searchTerm = document.getElementById('route-search').value.toLowerCase();
        const filtered = allRoutes.filter(route =>
            (difficulty === 'all' || route.difficulty === difficulty) &&
            route.name.toLowerCase().includes(searchTerm)
        );
        renderRouteButtons(filtered);
    }
});

// Initialisation de la page
document.addEventListener('DOMContentLoaded', () => {
    renderRouteButtons(allRoutes);
});