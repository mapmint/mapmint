// Filename: main.js

requirejs.config({
    baseUrl: 'assets',
    paths: {
        text: 'js/lib/require-text-2.0.12',
        hgn: 'js/lib/require-hgn-0.3.0',

	openlayers: 'js/lib/openlayers/OpenLayers',

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
	    deps: ['openlayers']
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

require(['domReady', 'app'], function(domReady, app) {
    domReady(function() {
        app.initialize();
    });
    window.cgalProcessing=app.cgalProcessing;
    window.app=app;
});





