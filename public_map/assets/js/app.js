// Filename: main.js

requirejs.config({
    baseUrl: 'assets',
    paths: {
        text: 'js/lib/require-text-2.0.12',
        hgn: 'js/lib/require-hgn-0.3.0',

	openlayers: 'js/lib/openlayers/ol',

        jquery: 'js/lib/jquery/jquery-2.1.1.min',
        bootstrap: 'js/lib/bootstrap-3.1.1-dist/js/bootstrap.min',
        notify: 'js/lib/bootstrap-notify',
        treeview: 'js/lib/treeview',
	contextmenu: 'js/lib/bootstrap-contextmenu',
	slider: 'js/lib/bootstrap-slider',

        hogan: 'js/lib/hogan/hogan-3.0.2',
        xml2json: 'js/lib/xml2json/xml2json.min',
        queryString: 'js/lib/query-string/query-string',
        wpsPayloads: 'js/lib/zoo/payloads',
        wpsPayload: 'js/lib/zoo/wps-payload',
        utils: 'js/lib/zoo/utils',
        zoo: 'js/lib/zoo/zoo',
        
        domReady: 'js/lib/domReady',

        app: 'js/cgal-app',
            
    },
    shim: {
        bootstrap: {
            deps: ['jquery'],
        },
        notify: {
            deps: ['jquery'],
        },
        wpsPayloads: {
	        deps: ['hogan'],
	    },
        wpsPayload: {
	    deps: ['wpsPayloads'],
            exports: 'wpsPayload',
        },
        hogan: {
            exports: 'Hogan',
        },
        xml2json: {
          exports: "X2JS",
        },
        queryString: {
            exports: 'queryString',
        },
        openlayers: {
            exports: 'OpenLayers',
        },
	app: {
	    deps: ['openlayers','myApp']
	}
    },
    
});


requirejs.config({ 
    config: {
        app: {
            url: 'http://zoo.dev.publicamundi.eu/cgi-bin/zoo_loader.fcgi',
            delay: 2000,
        }
    } 
});

require(['domReady', 'jquery', 'app'], function(domReady, $, app) {

    alert($);
    domReady(function() {
$('#ex1').slider({
	formatter: function(value) {
		return value + '%';
	}

});

$("[data-toggle=tooltip]").tooltip();


$('.dropdown-menu').on({
	"click":function(e){
      e.stopPropagation();
    }
});

$('.ol-overviewmap').find('span').html('<i class=\"fa fa-cube\"></i>');

var controls = [
                new ol.control.Attribution(),
               
 new ol.control.MousePosition({
                    undefinedHTML: 'outside',
                    projection: 'EPSG:4326',
                    coordinateFormat: function(coordinate) {
                        return ol.coordinate.format(coordinate, '{x}, {y}', 4);
                    }
                }),



    new ol.control.OverviewMap(),
 
                new ol.control.Rotate({
                    autoHide: false
                }),
                new ol.control.ScaleLine(),
                new ol.control.Zoom(),
                new ol.control.ZoomSlider(),
                new ol.control.ZoomToExtent(),
                new ol.control.FullScreen()
            ];

var dragZoom = new ol.interaction.DragZoom({condition: 
ol.events.condition.always}); 
$('.ol-zoombox').on('click', function() {
map.addInteraction(dragZoom); 
});
dragZoom.on('boxend', function(evt) { 
  map.removeInteraction(dragZoom); 
}); 


var map = new ol.Map({
          target: "map",
          controls: controls,
          layers: [
            new ol.layer.Tile({
              source: new ol.source.OSM()
            })
          ],
interactions: ol.interaction.defaults({shiftDragZoom: false}) ,
          view: new ol.View({
            center: [0, 0],
            zoom: 2
          })
        });

map.addControl(controls);

    });
    window.cgalProcessing=app.cgalProcessing;
    window.app=app;
});





