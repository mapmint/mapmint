// Filename: app.js
/*
    This work was supported by a grant from the European Union's 7th Framework Programme (2007-2013)
    provided for the project PublicaMundi (GA no. 609608).
*/

require(['bootstrap', 'notify']);

define([
    'module', 'jquery', 'zoo', 'xml2json',
], function(module, $, Zoo, X2JS) {
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
    });
    
    var mymodal = $('#myModal');
    var mynotify = $('.top-right');
    

    function notify(text, type) {
        mynotify.notify({
            message: { text: text },
            type: type,
        }).show();
    }


    
    var initialize = function() {

        $('.sidebar-left .slide-submenu').on('click',function() {
          var thisEl = $(this);
          thisEl.closest('.sidebar-body').fadeOut('slide',function(){
            $('.mini-submenu-left').fadeIn();
            applyMargins();
          });
        });

        $('.mini-submenu-left').on('click',function() {
          var thisEl = $(this);
          $('.sidebar-left .sidebar-body').toggle('slide');
          thisEl.hide();
          applyMargins();
        });

        $(window).on("resize", applyMargins);


        applyInitialUIState();
        applyMargins();

	map = new OpenLayers.Map('map', {
	    controls: [
		new OpenLayers.Control.PanZoom(),
		//new OpenLayers.Control.Permalink(),
		//new OpenLayers.Control.LayerSwitcher(),
		new OpenLayers.Control.Navigation()
	    ],
	    maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
	    maxResolution: 156543.0399,
	    numZoomLevels: 19,
	    units: "m",
	    projection: new OpenLayers.Projection("EPSG:900913"),
	    displayProjection: new OpenLayers.Projection("EPSG:4326")
	});
        
	//gmap = new OpenLayers.Layer.Google("Google Map");
	
        baseOSM = new OpenLayers.Layer.OSM();

	arrayOSM = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
		    "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
		    "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
		    "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"];
	
        layerLS=new OpenLayers.Layer.OSM("MapQuest-OSM Tiles", arrayOSM);
	//map.addLayer(layerLS);
	map.addLayers([layerLS,baseOSM]);
	layer = new OpenLayers.Layer.Vector("Voronoi",{
	    styleMap: new OpenLayers.StyleMap({
		fillColor: "#ffffff",
		fillOpacity: 0.1,
		strokeColor: "#0a625c",
		strokeWidth: 1.5
	    })
	});
	map.addLayer(layer);
  
	SubwayStops = new OpenLayers.Layer.GML("Subway stops",
					       "./data/stations.gml",
					       {
						   format: OpenLayers.Format.GML,
						   styleMap: new OpenLayers.StyleMap({
						       pointRadius: 4,
						       fillColor: "#00a099",
						       fillOpacity: 1,
						       strokeColor: "#0a625c",
						       strokeWidth: 2
						   }),
						   visibility: true
					       });
	map.addLayer(SubwayStops);
  
	map.zoomToExtent(new OpenLayers.Bounds(240047.557702813,6234682.54296228,281304.353234602,6267347.78149257),true);
	

    }




//    $( ".osmbl" ).click(function() {
  //      map.setBaseLayer(baseOSM);
  //  });

  //  $( ".mqbl" ).click(function() {
  //      map.setBaseLayer(layerLS);
  //  });
    
    var filename="http://127.0.0.1/zoo-requirejs/data/stations.gml";
    function cgalProcessing(aProcess) {
    notify('Running '+aProcess+' service','info');
	zoo.execute({
	    identifier: "cgal."+aProcess,
            dataInputs: [{"identifier":"InputPoints","href":filename,"mimeType":"text/xml"}],
            dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
            type: 'POST',
            storeExecuteResponse: false,
            success: function(data) {
                notify(aProcess+' service run successfully','success');
		        var GeoJSON = new OpenLayers.Format.GeoJSON();
		        var features = GeoJSON.read((data));
		        layer.removeFeatures(layer.features);
		        layer.addFeatures(features);
            },
            error: function(data) {
		        notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
            }
        });
    }


      function applyMargins() {
        var leftToggler = $(".mini-submenu-left");
        if (leftToggler.is(":visible")) {
          $("#map .ol-zoom")
            .css("margin-left", 0)
            .removeClass("zoom-top-opened-sidebar")
            .addClass("zoom-top-collapsed");
        } else {
          $("#map .ol-zoom")
            .css("margin-left", $(".sidebar-left").width())
            .removeClass("zoom-top-opened-sidebar")
            .removeClass("zoom-top-collapsed");
        }
      }



      function isConstrained() {
        return $(".sidebar").width() == $(window).width();
      }

      function applyInitialUIState() {
        if (isConstrained()) {
          $(".sidebar-left .sidebar-body").fadeOut('slide');
          $('.mini-submenu-left').fadeIn();
        }
      }


    // Return public methods
    return {
        initialize: initialize,
	cgalProcessing: cgalProcessing
    };


});

