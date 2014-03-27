    geolocation=new OpenLayers.Layer.Vector('geolocation',{renderers: System.renderer});
    map.addLayers([geolocation]);

    mapControls.geolocate.events.register("locationupdated",mapControls.geolocate,function(e) {
	geolocation.removeAllFeatures();
	var circle = new OpenLayers.Feature.Vector(
            OpenLayers.Geometry.Polygon.createRegularPolygon(
		new OpenLayers.Geometry.Point(e.point.x, e.point.y),
		e.position.coords.accuracy/2,
		40,
		0
            ),
            {},
            style
	);
	
	geolocation.addFeatures([
            new OpenLayers.Feature.Vector(
		e.point,
		{},
		{
                    graphicName: 'cross',
                    strokeColor: '#f00',
                    strokeWidth: 2,
                    fillOpacity: 0,
                    pointRadius: 10
		}
            ),
            circle
	]);
	if (firstGeolocation) {
            map.zoomToExtent(geolocation.getDataExtent());
            pulsate(circle);
            firstGeolocation = false;
            this.bind = true;
	}
    });

    mapControls.geolocate.events.register("locationfailed",this,function() {
	\$("<div class='ui-loader ui-overlay-shadow ui-body-e ui-corner-all'><h1>Sorry, location detection failed. Please try again.</h1></div>").css({ "display": "block", "opacity": 0.96, "top": \$(window).scrollTop() + 100 })
	    .appendTo( \$.mobile.pageContainer )
	    .delay( 1500 )
	    .fadeOut( 400, function(){
		\$(this).remove();
	    });
	//OpenLayers.Console.log('Location detection failed');
    });
