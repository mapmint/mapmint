// Filename: admin-cfg.js

requirejs.config({
    baseUrl: 'assets',
    paths: {
        text: 'js/lib/require-text-2.0.12',
        hgn: 'js/lib/require-hgn-0.3.0',

	ol: 'js/lib/openlayers/ol',
	olpopup: 'js/lib/openlayers/ol-popup',

        jquery: 'js/lib/jquery/jquery-2.1.3.min',
        bootstrap: 'js/lib/bootstrap-3.1.1-dist/js/bootstrap.min',
	bootselect: 'js/lib/bootstrap-select.min',
        notify: 'js/lib/bootstrap-notify',

        hogan: 'js/lib/hogan/hogan-3.0.2',
        xml2json: 'js/lib/xml2json/xml2json.min',
        queryString: 'js/lib/query-string/query-string',
        wpsPayloads: 'js/lib/zoo/payloads',
        wpsPayload: 'js/lib/zoo/wps-payload',
        utils: 'js/lib/zoo/utils',
        zoo: 'js/lib/zoo/zoo',

        domReady: 'js/lib/domReady',
        app: 'js/login.js',
            
    },
    shim: {
	mmDataTables: {
	        deps: ['notify']
	},
	datepicker: {
	    deps: ['bootstrap'],
	},
        bootstrap: {
            deps: ['jquery'],
        },
	cmenu: {
	    deps: ['jquery'],
	},
	treeview: {
	    deps: ['jquery'],
	},
	bootselect: {
	    deps: ['bootstrap'],
	},
	slider: {
	    deps: ['bootstrap'],
	},
	dataTables: {
	    deps: ['jquery'],
	},
	buttons: {
	    deps: ['dataTables'],
	},
	buttonsCol: {
	    deps: ['buttons'],
	},
	colReorder: {
	    deps: ['dataTables'],
	},
	responsive: {
	    deps: ['dataTables'],
	},
	select: {
	    deps: ['dataTables'],
	},
	colResize: {
	    deps: ['dataTables'],
	},
        /*datatables: {
            deps: ['dataTables',]
        },*/
        notify: {
            deps: ['jquery','bootstrap'],
        },
        olpopup: {
            deps: ['ol'],
        },
        highcharts: {
	    exports: "Highcharts",
	    deps: ["jquery"]
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
        ol: {
            exports: 'ol',
        },
	app: {
	    deps: ['highcharts','mmDataTables','olpopup', 'slider','cmenu','treeview','notify','colResize','enquire','bootselect','select','responsive','notify']
	}
    },
    waitSeconds: 0
});


requirejs.config({ 
    config: {
        app: {
            url: 'http://zoo.dev.publicamundi.eu/cgi-bin/zoo_loader.fcgi',
            delay: 2000,
        }
    } 
});

requirejs.onResourceLoad = function (context, map, depArray) {
    console.log(map.name + ' : ' + map.url);
};

require(['domReady', 'app'], function(domReady, app) {

    domReady(function() {
	app.initialize();
    });
    window.cgalProcessing=app.cgalProcessing;
    window.app=app;
    if(app.datepicker)
	window.datepicker=app.datepicker;
});





