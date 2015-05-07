function showMap() {

    var vectorSource = new ol.source.Vector({});

    /*var locations = [
        { "lat": 53.3497645, "lon": -6.2602732, "label": "2 participants" },
        { "lat": 52.5170365, "lon": 13.3888599, "label": "1 participant" },
        { "lat": 41.1494555, "lon": -8.6107661, "label": "1 participant" },
        { "lat": 40.4237, "lon": -3.6811, "label": "2 participants" },
        { "lat": 50.8465565, "lon": 4.351697, "label": "14 participants" },
        { "lat": 50.0598, "lon": 14.4656, "label": "1 participant" },
        { "lat": 48.85600, "lon": 2.35127, "label": "56 participants" }
    ];*/ 
    var locations = [];

    for (var i = 0; i < locations.length; i++){
 
        var iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([locations[i].lon,
                                                           locations[i].lat],
                                                          'EPSG:4326',
                                                          'EPSG:3857')),
        label: locations[i].label,
        population: 4000,
        rainfall: 500
        });
        vectorSource.addFeature(iconFeature);
    }

    // Create the style
    var iconStyle = new ol.style.Style({
      image: new ol.style.Icon(({
          anchor: [0.5, 32],
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          opacity: 0.75,
          src: '${baseUrl}/img/icon-32x32.png'
      }))
    });

    var map = new ol.Map({
        layers: [ new ol.layer.Tile({source: new ol.source.TileJSON({ url: 'http://api.tiles.mapbox.com/v3/mapbox.geography-class.jsonp',
                                                                      crossOrigin: '' }) }),
                  new ol.layer.Vector({ source: vectorSource, style: iconStyle }) ],
        controls: ol.control.defaults({
            attributionOptions: ({ collapsible: false })
        }),
        //renderer: exampleNS.getRendererFromQueryString(),
        target: 'Map',
        view: new ol.View({
            center: ol.proj.transform([2.20, 48.84], 'EPSG:4326', 'EPSG:3857'),
            zoom: 3
        })
    });

    var element = document.getElementById('popup');

    var popup = new ol.Overlay({
        element: element,
        positioning: 'bottom-center',
        stopEvent: false
    });
    map.addOverlay(popup);

    // display popup on click
    map.on('click', function(evt) {
        $(element).popover('destroy');
        var feature = map.forEachFeatureAtPixel(evt.pixel,
                                                function(feature, layer) {
                                                    return feature;
                                                });
        if (feature) {
            var geometry = feature.getGeometry();
            var coord = geometry.getCoordinates();
            popup.setPosition(coord);
            $(element).popover({
                'placement': 'top',
                'html': true,
                'content': feature.get('label')
            });
            $(element).popover('show');
        }
    });

    // change mouse cursor when over marker
    map.on('pointermove', function(e) {
        if (e.dragging) {
            $(element).popover('destroy');
            return;
        }
        var pixel = map.getEventPixel(e.originalEvent);
        var hit = map.hasFeatureAtPixel(pixel);
        //map.getTarget().style.cursor = hit ? 'pointer' : '';
    });
}
