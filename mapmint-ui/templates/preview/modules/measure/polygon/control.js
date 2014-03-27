,polygon: new OpenLayers.Control.Measure(OpenLayers.Handler.Polygon,{
    persist: true,
    geodesic: true,
    displaySystem: "$m.web.metadata.get("tuom")",
    handlerOptions: {layerOptions: {styleMap: styleMap}},
    eventListeners: {
        "measure": handleMeasurements
    }
})
