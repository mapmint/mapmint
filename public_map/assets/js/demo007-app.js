// Filename: app.js
/*
    This work was supported by a grant from the European Union's 7th Framework Programme (2007-2013)
    provided for the project PublicaMundi (GA no. 609608).
*/

//require(['bootstrap', 'notify']);

define([
    'module', /*'jquery',*/ 'zoo', /*'xml2json',*/
    'wpsPayload'
], function(module, /*$,*/ Zoo, /*X2JS,*/ wpsPayload) {
    
    var myZooObject = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
    });
    
    var initialize = function() {
        self = this;        

	var request_params = {
	    request: 'GetCapabilities',
	    language: 'en-US'
	};
	console.log(wpsPayload.getPayload(request_params));

	var request_params = {
	    Identifier: ["Buffer","Centroid"],
	    language: 'en-US'
        };
	console.log(wpsPayload.getPayload_DescribeProcess(request_params));

	var request_params = {
	    request: 'Execute',
	    Identifier: "Buffer",
	    DataInputs: [{"identifier":"InputPolygon","href":"http://www.zoo-project.org:8082/geoserver/ows?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.0.0&typename=topp:states&SRS=EPSG:4326&FeatureID=states.16","mimeType":"text/xml"}],
	    DataOutputs: [{"identifier":"Result","mimeType":"application/json"}], 
	    language: 'en-US'
	};
	console.log(wpsPayload.getPayload(request_params));

	/*var myZooObject = new Zoo({
	    url: "http://localhost/cgi-bin/zoo_loader.fcgi",
	    delay: 2500
	});*/
        myZooObject.getCapabilities({
	    type: 'POST',
	    success: function(data){
		for(i in data["Capabilities"]["ProcessOfferings"]["Process"])
		    console.log(data["Capabilities"]["ProcessOfferings"]["Process"][i]["Identifier"]["__text"]);
	    }
	});

	myZooObject.describeProcess({
	    type: 'POST',
	    identifier: "all",
	    success: function(data){
	        console.log(data);
	    }
	});

	myZooObject.execute({
	    identifier: "Buffer",
	    dataInputs: [{"identifier":"InputPolygon","href":"http://www.zoo-project.org:8082/geoserver/ows?SERVICE=WFS&REQUEST=GetFeature&VERSION=1.0.0&typename=topp:states&SRS=EPSG:4326&FeatureID=states.16","mimeType":"text/xml"}],
	    dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
	    type: 'POST',
	    success: function(data) {
		console.log(data);
	    }/*,
	    error: function(data){
		console.log(data);
	    }*/
	});
    }

    // Return public methods
    return {
        initialize: initialize
    };


});
