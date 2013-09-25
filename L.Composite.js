L.Composite = L.Class.extend({
  includes: L.Mixin.Events,
  
  initialize: function (options) {
    // options should include:
    //  - tileUrl: A URL template for this layer's visible representation
    //  - tileOptions (optional): Any [config options for the L.TileLayer](http://leafletjs.com/reference.html#tilelayer-options)
    //  - geojsonUrl: A URL that retrieves GeoJSON data for this layer as a FeatureCollection, 
    //      or a [Github blob API call](http://developer.github.com/v3/git/blobs/#get-a-blob)
    //  - geojsonOptions (optional): [Config options for the L.GeoJSON layer](http://leafletjs.com/reference.html#geojson-options)
    
    L.Util.setOptions(this, options);
    
    var tileUrl = options.tileUrl || '',
        tileOptions = options.tileOptions || {},
        geojsonUrl = options.geojsonUrl || '',
    
        defaultStyle = { opacity: 0, fillOpacity: 0 },
        geojsonOptions = options.geojsonOptions || {};
          
    if (typeof geojsonOptions.style !== 'function') {
      geojsonOptions.style = L.Util.extend(defaultStyle, geojsonOptions.style);
    }
    
    // Setup the tile and geojson layers
    var geojsonLayer = this._geojsonLayer = L.geoJson(null, geojsonOptions);
    this._tileLayer = L.tileLayer(tileUrl, tileOptions);
    this._data = {type: 'FeatureCollection', features: []};
    
    // When the data is loaded, parse it, triggering the index to build
    this.on('dataLoaded', this.parseData, this);
    
    this.once('dataRefreshed', function (event) {
      // This is a hack so that you can use CSS on the GeoJSON layer's SVG elements
      var layers = geojsonLayer.getLayers();
      if (layers.length > 0) {
        layers[0]._container.parentNode.classList.add('composite-data-layer');
      }
    });
    
    // Make an AJAX request for some GeoJSON
    if (geojsonUrl !== '' && $) {
      $.ajax({
        url: geojsonUrl,
        dataType: 'json',
        success: L.bind(this.dataRecieved, this)
      });
    }
  },
  
  dataRecieved: function (data, status, xhr) {
    // Got data. Make sure its a valid GeoJSON FeatureCollection
    var geojson = {type: "FeatureCollection", features: []};
    
    // If the response is from a Github API request, decode the base64 content
    if (data.hasOwnProperty('content') && data.url === this.options.geojsonUrl) {
      var content = data.content.replace(/\s/g, '');
      data = atob(content);
      geojson = JSON.parse(data);
    } else if (data.type === 'FeatureCollection') {
      geojson = data;
    }
    
    // Signal that the data is ready
    this.fire('dataLoaded', {data: geojson});
  },
  
  parseData: function (event) {
    // Builds a spatial index from GeoJSON data
    var reader = new jsts.io.GeoJSONReader(),
        data = this._data = reader.read(event.data),
        index = this._index = new jsts.index.strtree.STRtree();
    
    data.features.forEach(function (feature) {
      var envelope = feature.geometry.getEnvelopeInternal();
      index.insert(envelope, feature);
    });
    
    // Indicate that the index is ready
    this._indexReady = true;
    this.fire('indexReady');
  },
  
  highlightFeature: function (event) {
    // Adjust the contents of the L.GeoJSON layer. Expects a [Leaflet Mouse Event](http://leafletjs.com/reference.html#mouse-event)
    var feature = this._intersect(event.latlng),
        writer = new jsts.io.GeoJSONWriter(),
        features = null;
    
    function jstsToGeoJSON(jstsFeature) {
      // Convert a jsts feature to GeoJSON
      return L.Util.extend({}, jstsFeature, {
        geometry: writer.write(jstsFeature.geometry)
      });
    }
    
    if (feature.type === 'Feature') {
      features = jstsToGeoJSON(feature);
    } else if (feature.length > 0) {
      features = feature.map(jstsToGeoJSON);
    }
    
    if (features) {
      this._geojsonLayer.clearLayers();
      this._geojsonLayer.addData(features);
      this.fire('dataRefreshed');
    }
  },
  
  _intersect: function (latlng, singleFeature) {
    // Finds data that intersects the passed in L.LatLng. Parameters are:
    // - latlng: and L.LatLng of the point that you want to find intersecting features for
    // - singleFeature (optional): Boolean. Do you want to get back only the specific feature that
    //    intersects the point? Or are a small set of features with overlapping envelopes okay?
    if (this._indexReady) {
      var point = this._latlngToPoint(latlng),
          matches = this._index.query(point.getEnvelopeInternal())
      
      if (singleFeature) {
        for (var i = 0; i < matches.length; i++) {
          if (matches[i].geometry.intersects(point)) { // this is expensive.
            return matches[i];
          }
        } 
      } else {
        return matches;
      }
    }
    
    return [];
  },
  
  _latlngToPoint: function (latlng) {
    // Converts a L.LatLng to a jsts Point
    var geometryFactory = new jsts.geom.GeometryFactory(),
        coord = new jsts.geom.Coordinate(latlng.lng, latlng.lat);
    return geometryFactory.createPoint(coord);
  },
  
  onAdd: function (map) {
    // Add the sub-layers to the map
    this._tileLayer.addTo(map);
    this._geojsonLayer.addTo(map);
    
    // Adjust the GeoJSON layer's contents whenever the mouse moves
    map.on('mousemove', this.highlightFeature, this);
  },
  
  addTo: function (map) {
    this.onAdd(map);
  },
  
  onRemove: function (map) {
    map.removeLayer(this._tileLayer);
    map.removeLayer(this._geojsonLayer);
    map.off('mousemove', this.highlightFeature);
  },
});

L.composite = function (options) {
  return new L.Composite(options);  
};