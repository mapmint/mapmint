,profile_line: new OpenLayers.Control.Measure(OpenLayers.Handler.Path,{
    persist: true,
    geodesic: true,
    displaySystem: "$m.web.metadata.get("tuom")",
    handlerOptions: {layerOptions: {styleMap: styleMap}},
    eventListeners: {
        "measure": handleProfile
    }
})
