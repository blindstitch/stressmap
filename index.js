const baseWidth = 4;
const baseZoom = 12
const hoverBuffer = 3; // Buffer in pixels for easier hovering/clicking

// Template loading functions
let hoverTemplate = '';
let detailTemplate = '';

// Load templates
fetch('./tpl/hover-popup.html')
    .then(response => response.text())
    .then(html => { hoverTemplate = html; });

fetch('./tpl/detail-popup.html')
    .then(response => response.text())
    .then(html => { detailTemplate = html; });

// Template replacement function
function replaceTemplate(template, data) {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : '';
    });
}

mapboxgl.accessToken = 'pk.eyJ1IjoidHNjaGllZ2dtIiwiYSI6ImNrZHoyb25iYjMxMWQzM2p6eHlibHJkanIifQ.wj-SisFvNPgakxBy_1ZnHw';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    center: [-72.667638, 42.3164662], // Noho starting position [lng, lat]
    // style:'mapbox://styles/mapbox/dark-v11',
    style: 'mapbox://styles/mapbox/standard',
    config: {
        basemap: {
        lightPreset: 'day',
        showPlaceLabels: false,
        showPointOfInterestLabels: false,
        theme: 'monochrome',
        show3dObjects: false,
        showTransitLabels: true,
        showRoadLabels: true
        }
    },
    zoom: baseZoom // starting zoom
});

map.on('load', function () {
    map.addSource('LTS_source', {
        type: 'geojson',
        data: 'plots/LTS.json'
    });

    // Create popup for hover with smiley faces
    const hoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    // Smiley faces for different stress levels
    const stressFaces = {
        0: '😐', // no data - neutral
        1: '😊', // LTS 1
        2: '🙂', // LTS 2
        3: '😟', // LTS 3
        4: '😠', // LTS 4
        5: '😐'  // no data
    };

    const stressLabels = {
        0: 'No Data',
        1: 'Low Stress',
        2: 'Moderate Stress', 
        3: 'High Stress',
        4: 'Very High Stress',
        5: 'No Data'
    };
    const colors = [
        'black',
        // Colors based on 5 equally spaced from 'turbo' colormap
        '#28BCEB',
        '#A4FC3C',
        '#FB7E21',
        '#7A0403',
        'white'
    ]
    const no_data = 'no data'
    const LTS_names = [
        no_data, // black
        'Level of Traffic Stress 1',
        'Level of Traffic Stress 2',
        'Level of Traffic Stress 3',
        'Level of Traffic Stress 4',
        no_data // white
    ]

    map.addLayer({
        'id': 'lts-layer',
        'source': 'LTS_source',
        //'source-layer': 'lts', // replaces 'road-label-simple' which seems to work for light-v11 but not standard style
        'slot': 'middle',
        "type": "line",
        'paint': {
            'line-color': [
                'match',
                ['get', 'LTS'],
                0, colors[0],
                // Colors based on 5 equally spaced from 'turbo' colormap
                1, colors[1],
                2, colors[2],
                3, colors[3],
                4, colors[4],
                colors[5]
            ],
            "line-width": baseWidth,
            // 'line-opacity': 0.5,
        }
    }
    // 'road-label-simple' // Add layer below labels - doesn't exist in standard style
);

// Add invisible buffer layer for easier hovering/clicking
map.addLayer({
    'id': 'lts-buffer-layer',
    'source': 'LTS_source',
    'slot': 'middle',
    'type': 'line',
    'paint': {
        'line-color': 'rgba(0,0,0,0)', // transparent
        'line-width': baseWidth + (hoverBuffer * 2), // Add buffer on both sides
        'line-opacity': 0
    }
});

map.setFilter('lts-layer', ['<=', ['get', 'zoom'], map.getZoom()+1]);
map.setFilter('lts-buffer-layer', ['<=', ['get', 'zoom'], map.getZoom()+1]);

// create legend
const legend = document.getElementById('legend');

LTS_names.forEach((LTS_name, i) => {
    // Do not add black or white to the legend since they do not correspond to a LTS rating
    if (LTS_name === no_data) {
        return
    }
  const color = colors[i];
  const item = document.createElement('div');
  const key = document.createElement('span');
  key.className = 'legend-key';
  key.style.backgroundColor = color;

  const value = document.createElement('span');
  value.innerHTML = `${LTS_name}`;
  item.appendChild(key);
  item.appendChild(value);
  legend.appendChild(item);
});

    // When a click event occurs on a feature in the places layer, open a popup at the
    // location of the feature, with description HTML from its properties.
    map.on('click', 'lts-buffer-layer', (e) => {
        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice(); // I don't think this works with line strings
        
        const properties = e.features[0].properties;
        const description = replaceTemplate(detailTemplate, properties);

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
        }

        new mapboxgl.Popup()
            .setLngLat(e.lngLat) // Changed to use click location instead of feature location (I think)
            .setHTML(description)
            .setMaxWidth("600px")
            .addTo(map);
    });

    // Show smiley popup on hover
    map.on('mouseenter', 'lts-buffer-layer', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        
        const ltsValue = e.features[0].properties.LTS || 0;
        const face = stressFaces[ltsValue] || '😐';
        const label = stressLabels[ltsValue] || 'Unknown';
        
        const htmlContent = replaceTemplate(hoverTemplate, {
            emoji: face,
            label: label
        });
        
        hoverPopup.setLngLat(e.lngLat)
            .setHTML(htmlContent)
            .addTo(map);
    });

    // Hide popup on mouse leave
    map.on('mouseleave', 'lts-buffer-layer', () => {
        map.getCanvas().style.cursor = '';
        hoverPopup.remove();
    });

    map.on('zoom', () => {
        document.getElementById('zoom').textContent = map.getZoom().toFixed(2);
        map.setFilter('lts-layer', ['<=', ['get', 'zoom'], map.getZoom()+1]);
        map.setFilter('lts-buffer-layer', ['<=', ['get', 'zoom'], map.getZoom()+1]);
    });
})

