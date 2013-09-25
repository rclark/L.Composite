# L.Composite

A Leaflet layer that brings together an `L.TileLayer` and an `L.GeoJSON` layer.

## The problem:

Making an interactive web map becomes difficult if your dataset is very large. Instead of using the browser to render data as vector features, we often instead pre-render images and display those pre-rendered images instead of the data itself. This allows for quick maps, and for pretty visualization, but no interaction.

When you load massive amounts of vector data into the browser, the page takes forever to load and then the performance is terrible.

## How this tries to solve it

You generate a "composite" layer by specifying:

- the URL template that connects to a tile set and will be used to build an `L.TileLayer`,
- the URL for some GeoJSON,
- options for the layers.

The `L.TileLayer` will show up immediately, giving your page a quick, pretty face. It will also make an AJAX request for the GeoJSON right away.

Once the GeoJSON is returned, [JSTS](https://github.com/bjornharrtell/jsts) is used to create a spatial index of the GeoJSON features. Now, as your cursor moves across the map, the index is searched and the features under your cursor are added to an `L.GeoJSON` layer on the map.

The `L.GeoJSON` layer never has more than a few features in it at a time, and so the page remains performant, but you can do things like hover effects, popups, etc.

## It has a couple of dependencies
- [JSTS](https://github.com/bjornharrtell/jsts) for building a spatial index and doing intersections
- [jQuery](http://jquery.com) for making AJAX requests
- [Leaflet](http://leafletjs.com) for mapping

## This example...

`index.html`: Loads a pretty large polygon dataset from Github representing rock types across the state of Arizona. Once they're loaded, you'll see a "hover" event where the polygon under your cursor is highlighted.

You can look at it at http://rclark.github.io/L.Composite/