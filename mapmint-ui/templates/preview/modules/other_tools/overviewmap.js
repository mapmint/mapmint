
var overview = new OpenLayers.Control.OverviewMap({ div: \$('#overviewmap')[0]},{ 
    mapOptions: {
	numZoomLevels: 1,
        units: "m", 
        minExtent: map.maxExtent.clone()
    }
}); 
map.addControl(overview); 

#if $m.web.metadata.get('mmOT').count("MMOVMapFixed")
if(System.initZoomLevel-3>=0){
    overview.maxRatio=map.getResolutionForZoom(System.initZoomLevel-4)/map.getResolutionForZoom(19);
    overview.minRatio=map.getResolutionForZoom(System.initZoomLevel-1)/map.getResolutionForZoom(0);
}
#end if
