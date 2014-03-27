var map;
function toggleControl(element) {
    for(key in Mapmanager.mapControls) {
	var control = Mapmanager.mapControls[key];

	if(element.name == key){
	    control.activate();
	} else {
	    control.deactivate();
	}
    }
};

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
	$(".dialog-lenght").dialog({
			autoOpen: false,
			height: 52,
			width: 200,
			position: [pixels.x,pixels.y],
			resizable: false,
			close: function(event, ui) {}
		});
	$(".dialog-lenght").dialog("open");
    } else {
    var element = document.getElementById('output-area');
	out += "" + measure.toFixed(3) + " " + units + "<sup>2</sup>";
	$(".dialog-area").dialog({
			autoOpen: false,
			height: 52,
			width: 210,
			position: [pixels.x,pixels.y],
			resizable: false
		});
		$(".dialog-area").dialog("open");
    }
    element.innerHTML = out;

}

	
Mapmanager=MLayout.extend();
Mapmanager.define({
  mapControls: null,
  map: null,
  initialize: function(){
      System.loaded=false;
      System.libpath="openlayers/";
      System.require("OpenLayers");
      System.start=this.loadOL.mbind(this);
      System.ensure_included();
    },
  updateSize: function(){
      if(this.map){
	var center = this.map.getCenter();
	this.map.updateSize();
	this.map.setCenter(center);
      }

					
    },
  loadOL: function(){
  	
      $('.pan, .zoombox, .zoommaxextent, .identify, .measure-dist, .measure-area').button({text: false});

      

	var extent = new OpenLayers.Bounds(-20037508, -20037508,20037508, 20037508.34)
	var options = {
		controls: [
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.KeyboardDefaults()
                    ],
		projection: new OpenLayers.Projection("EPSG:900913"),
		displayProjection: new OpenLayers.Projection("EPSG:4326"),
		units: "m",
		numZoomLevels: 18,
		minZoomLevel: 2,
		maxResolution: 156543.0339,
		maxExtent: new OpenLayers.Bounds(-20037508, -20037508,20037508, 20037508.34)
		

        };
	map = new OpenLayers.Map('map', options);
	this.map=map;
	var osm = new OpenLayers.Layer.OSM( {minZoomLevel: 9, maxZoomLevel:18});
	this.map.addLayers([osm]);
	
	var styleMap = new OpenLayers.StyleMap({
 	            "default": new OpenLayers.Style(null, {
	                rules: [new OpenLayers.Rule({
	                    symbolizer: {
	                    "Point": {
	                            pointRadius: 4,
 	                            graphicName: "circle",
	                            fillColor: "white",
 	                            fillOpacity: 1,
 	                            strokeWidth: 1,
 	                            strokeOpacity: 1,
 	                            strokeColor: "#666666"
 	                        },
 	                        "Line": {
 	                            strokeWidth: 2,
 	                            strokeOpacity: 1,
 	                            strokeColor: "#666666",
 	                            strokeDashstyle: "dash"
 	                        },
 	                        "Polygon": {
 	                            strokeWidth: 2,
 	                            strokeOpacity: 1,
 	                            strokeColor: "#666666",
 	                            strokeDashstyle: "dash",
	                            fillColor: "white",
	                            fillOpacity: 0.3
	                        }
 	                    }
 	                })]
 	            })
 	        });


    Mapmanager.mapControls = {
    	zoomtomaxextent: new OpenLayers.Control.ZoomToMaxExtent({title:"Zoom to max extent"}),
    	pan: new OpenLayers.Control.Pan({title:"Pan"}),
    	zoombox: new OpenLayers.Control.ZoomBox({title:"Zoom Box", out: false}),
    	measuredist: new OpenLayers.Control.Measure(OpenLayers.Handler.Path,{
    		persist: true,
    		geodesic: true,
    		handlerOptions: {layerOptions: {styleMap: styleMap}},
    		eventListeners: {
	         "measure": handleMeasurements
    		}
    	}),
    	measurearea: new OpenLayers.Control.Measure(OpenLayers.Handler.Polygon,{
    		persist: true,
    		geodesic: true,
    		handlerOptions: {layerOptions: {styleMap: styleMap}},
    		eventListeners: {
	         "measure": handleMeasurements
    		}
    	})
    }


    for(var key in Mapmanager.mapControls) {
		control = Mapmanager.mapControls[key];
		this.map.addControl(control);
    }
   
   	this.map.addControl(new OpenLayers.Control.MousePosition({div: document.getElementById("mposition")}));
	this.map.addControl(new OpenLayers.Control.ZoomPanel());
	
	
	this.map.setOptions({restrictedExtent: extent});
	this.map.setCenter(extent, 2);


    $('.toolbar a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
    
    

    
$(".close-toolbar").click(function () {
    $(".map-toolbar").hide("slow");
    });
    
    $("#rasterTools").click(function () {
    $(".raster-toolbar").draggable().show("slow");
    });
    
    $(".close-toolbar2").click(function () {
    $(".raster-toolbar").hide("slow");
    });


 	 	
$(".dropdown-toolbars dt a").click(function() {
		$(".dropdown-toolbars dd ul").show('slow');
	});
	
	$('.dropdown-toolbars dd ul').mouseleave(function() {
	$(".dropdown-toolbars dd ul").hide('slow');
});



},
    
refresh: function(){
 	
function uncheck(){
	$('input[id=editingToolbar]').attr('checked', false);	
}

function uncheck1(){
	$('input[id=spatialToolbar]').attr('checked', false);	
}

var xposEdit= ($(document).width() - 520);
var xposSpatial= ($(document).width() - 710);

$(".editing-toolbar").dialog({
	autoOpen: false,
	height: 72,
	width: 210,
	resizable: false,
	position: [xposEdit, 135],
	close: function(event, ui) { uncheck();}
});


		
$("#editingToolbar").click(function() {

	$(".editing-toolbar").dialog("open");


});

$(".spatial-toolbar").dialog({
	autoOpen: false,
	height: 72,
	width: 400,
		position: [xposSpatial, 225],
	resizable: false,
	close: function(event, ui) { uncheck1();}
});
		
$("#spatialToolbar").click(function() {
	$(".spatial-toolbar").dialog("open");
});

$('.pan, .zoombox, .zoom-to-max-extent, .identify, .measure-dist, .measure-area, .select-feature, .add-point, .add-line, .add-polygon, .delete-feature, .buffer, .simplify, .centroid, .boundary, .convexhull, .union, .intersection' ).button({text: false});

$('.save-as-map' ).button({text: false});
$("input:checkbox, input:radio, input:file").uniform();
;
 } 
    
    
    
  });
  

