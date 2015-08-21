// Filename: examples.js



requirejs.config({
    baseUrl: 'assets',
    paths: {
        text: 'js/lib/require-text-2.0.12',
        hgn: 'js/lib/require-hgn-0.3.0',
		
        //jquery: ['//code.jquery.com/jquery-1.11.0.min.js','js/lib/jquery/jquery-1.11.0.min'],
        jquery: 'js/lib/jquery/jquery-1.11.0.min',
                
        bootstrap: 'js/lib/bootstrap-3.1.1-dist/js/bootstrap.min',
        notify: 'js/lib/bootstrap-notify',
                
        hogan: 'js/lib/hogan/hogan-2.0.0.min',
        xml2json: 'js/lib/xml2json/xml2json.min',
        queryString: 'js/lib/query-string/query-string',
        wpsPayload: 'js/lib/zoo/wps-payload',
        utils: 'js/lib/zoo/utils',
        zoo: 'js/lib/zoo/zoo',
        
        domReady: 'js/lib/domReady',
        app: 'js/examples-app',
            
    },
    shim: {
        bootstrap: {
            deps: ['jquery'],
        },
        notify: {
            deps: ['jquery'],
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
        wpsPayload: {
            exports: 'wpsPayload',
        },
    },
    
});


requirejs.config({ 
    config: {
        app: {
            url: 'http://zoo-server/cgi-bin/zoo_loader.cgi',
            delay: 2000,
        }
    } 
});

require(['domReady', 'app'], function(domReady, app) {
    domReady(function() {
        app.initialize();
    });
});




