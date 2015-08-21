// Filename: main.js

requirejs.config({
    baseUrl: 'assets',
    paths: {
        jquery: 'js/lib/jquery/jquery-1.11.0.min',
        hogan: 'js/lib/hogan/hogan-3.0.2',
        xml2json: 'js/lib/xml2json/xml2json.min',
        queryString: 'js/lib/query-string/query-string',
        wpsPayloads: 'js/lib/zoo/payloads',
        wpsPayload: 'js/lib/zoo/wps-payload',
        utils: 'js/lib/zoo/utils',
        zoo: 'js/lib/zoo/zoo',
        domReady: 'js/lib/domReady',
        app: 'js/demo007-app',
    },
    shim: {
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
    },
});

requirejs.config({ 
    config: {
        app: {
            url: '/cgi-bin/zoo_loader.fcgi',
            delay: 2000,
        }
    } 
});

require(['domReady', 'app'], function(domReady, app) {
    domReady(function() {
        app.initialize();
    });
});
