function handleMeasurements(event) {
    var geometry = event.geometry;
    var units = event.units;
    var order = event.order;
    var measure = event.measure;
    var lonlat = geometry.getBounds().getCenterLonLat();
    var pixels= this.map.getPixelFromLonLat(new OpenLayers.LonLat(lonlat.lon, lonlat.lat));
   
    var out = "";
    if(order == 1) {
    var element = document.getElementById('output-lenght'); 
        out += "" + measure.toFixed(3) + " " + units;
#if $m.web.metadata.get('layout_t')=="mobile"
\$("<div class='ui-loader ui-overlay-shadow ui-body-d ui-corner-all'><h1>"+out+"</h1></div>").css({ "z-index": 10000, "display": "block", "opacity": 0.96, "top": \$(window).scrollTop() + 100 })
  .appendTo( \$("#map") )
  .delay( 1500 )
  .fadeOut( 400, function(){
    \$(this).remove();
    if(mapControls.line.active){
	mapControls.line.deactivate();
        toggleControl({"name":"line"});
    }else{
	mapControls.polygon.deactivate();
        toggleControl({"name":"polygon"});
    }
  });
#else
        \$(".dialog-lenght").dialog({
                        autoOpen: false,
                        height: 50,
                        width: 200,
                        position: [pixels.x,pixels.y],
                        resizable: false,
                        close: function(event, ui) {
                        	}
                });
        \$(".dialog-lenght").dialog("open");
#end if
    } else {
    var element = document.getElementById('output-area');
        out += "" + measure.toFixed(3) + " " + units + "<sup>2</sup>";
#if $m.web.metadata.get('layout_t')=="mobile"
\$("<div class='ui-loader ui-overlay-shadow ui-body-d ui-corner-all'><h1>"+out+"</h1></div>").css({ "z-index": 10000, "display": "block", "opacity": 0.96, "top": \$(window).scrollTop() + 100 })
  .appendTo( \$("#map") )
  .delay( 1500 )
  .fadeOut( 400, function(){
     \$(this).remove();
    if(mapControls.line.active){
	mapControls.line.deactivate();
        toggleControl({"name":"line"});
    }else{
	mapControls.polygon.deactivate();
        toggleControl({"name":"polygon"});
    }
  });
#else
        \$(".dialog-area").dialog({
                        autoOpen: false,
                        height: 52,
                        width: 210,
                        position: [pixels.x,pixels.y],
                        resizable: false,
                        close: function(event, ui) {
                        	}

                });
                \$(".dialog-area").dialog("open");
#end if
    }
#if $m.web.metadata.get('layout_t')!="mobile"
    element.innerHTML = out;
#end if
}
