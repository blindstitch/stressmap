const baseWidth = 4;
const baseZoom = 12

// Template loading functions
let detailTemplate = '';
// Load templates
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
map.setFilter('lts-layer', ['<=', ['get', 'zoom'], map.getZoom()]);

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
    map.on('click', 'lts-layer', (e) => {
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

    // Change the cursor to a pointer when the mouse is over the LTS layer.
    map.on('mouseenter', 'lts-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'lts-layer', () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('zoom', () => {
        document.getElementById('zoom').textContent = map.getZoom().toFixed(2);
        map.setFilter('lts-layer', ['<=', ['get', 'zoom'], map.getZoom()]);
    });
})

