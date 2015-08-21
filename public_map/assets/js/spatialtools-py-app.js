// Filename: app.js
/*
    This work was supported by a grant from the European Union's 7th Framework Programme (2007-2013)
    provided for the project PublicaMundi (GA no. 609608).
*/

//require(['bootstrap', 'notify']);

define([
    'module', 'jquery', 'zoo', 'xml2json',
], function(module, $, Zoo, X2JS) {
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
    });
    
    var mymodal = $('#myModal');
    
    
    /**
     *
     * Complex payload callback functions
     */
    //
    window.complexPayload_InputPolygon_JSON = function() {
        return '{"type":"Polygon","coordinates":[[[-102.036758,36.988972],[-106.860657,36.989491],[-109.047821,36.996643],[-109.055199,38.24493],[-109.052864,39.518196],[-109.050591,40.210545],[-109.047638,40.998474],[-107.918037,41.00341],[-104.051201,41.003227],[-102.620789,41.000225],[-102.047279,40.998077],[-102.04557,40.697323],[-102.036758,36.988972]]]}';
    }

    window.complexPayload_GML = function() {
        return '<wfs:GetFeature xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.1.0" maxFeatures="10" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><wfs:Query typeName="states" srsName="EPSG:4326"><ogc:Filter xmlns:ogc="http://www.opengis.net/ogc"><ogc:BBOX><ogc:PropertyName>the_geom</ogc:PropertyName><gml:Envelope xmlns:gml="http://www.opengis.net/gml" srsName="EPSG:4326"><gml:lowerCorner>-98.417969 29.498046625</gml:lowerCorner><gml:upperCorner>-97.53906275 30.376952875</gml:upperCorner></gml:Envelope></ogc:BBOX></ogc:Filter></wfs:Query></wfs:GetFeature>';
    }


    function notify(text, type) {
        /*mynotify.notify({
            message: { text: text },
            type: type,
        }).show();*/
    }
    
    function showModal(title, body) {
        mymodal.find('.modal-body').text('');
        mymodal.find('.modal-body').append(body);
        mymodal.find('.modal-title').text(title);
        var options = {};
        mymodal.modal(options);
    }

    OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;

    var map, SubwayStops, layer;



    var pop;

    function onPopupClose(){
	if(pop)
	    map.removePopup(pop);
    }

    function createPopup(){
	var tmp=arguments[0].geometry.getCentroid();
	if(pop)
	    map.removePopup(pop);
	var attrs='<div style="color: #000;"><table>';
	for(var i in arguments[0].data)
	    if(i!="gml_id")
		attrs+="<tr><td width='100' style='font-weight: bold;'>"+i+"</td><td>"+arguments[0].data[i]+"</td></tr>";
	attrs+="</table></div>";
	pop=new OpenLayers.Popup.FramedCloud("Information",
					     arguments[0].geometry.getBounds().getCenterLonLat(),
					     new OpenLayers.Size(100,100),
					     "<h2>"+arguments[0].data.name+"</h2>"+attrs,
					     null, true,onPopupClose);
	map.addPopup(pop);
    }
    
    function unSelect(){
	if(pop)
	    map.removePopup(pop);
	//alert(arguments[0]);
    }

    function parseMapServerId(){
	try{
	    var sf=arguments[0].split(".");
	    return sf[0]+"."+sf[1].replace(/ /g,'');
	}catch(e){}
    }

    function toggleControl(element) {
	for(key in mapControls) {
	    var control = mapControls[key];
	    //alert ($(element).is('.ui-state-active'));
	    if(element.name == key && $(element).is('.ui-state-active')) {
		control.activate();
	    } else {
		control.deactivate();
	    }
	}
    }

    function restartDisplay(){
	var tmp=[select,hover_,hover,multi];
	for(i=0;i<tmp.length;i++)
	    if(tmp[i].features.length>=1)
		tmp[i].removeFeatures(tmp[i].features);
	slist=$(".single-process:not(.ui-state-disabled)");
	for(var i=0;i<slist.length;i++)
	    slist[i].style.display='none';
	mlist=$(".multi-process:not(.ui-state-disabled)");
	for(var i=0;i<mlist.length;i++)
	    mlist[i].style.display='none';
    }

    function singleProcessing(aProcess) {
	if (select.features.length == 0)
	    return alert("No feature selected!");
	if(multi.features.length>=1)
  	    multi.removeFeatures(multi.features);
	var started=true;
	var dep=hover;
	if(arguments.length>1){
	    dep=arguments[1];
	    started=false;
	}
	var xlink = control.protocol.url +"&SERVICE=WFS&REQUEST=GetFeature&VERSION=1.0.0";
	xlink += '&typename='+control.protocol.featurePrefix;
	xlink += ':'+control.protocol.featureType;
	xlink += '&SRS='+control.protocol.srsName;
	xlink += '&FeatureID='+parseMapServerId(select.features[0].fid);
	var inputs=[{"identifier":"InputPolygon","href":xlink,"mimeType":"text/xml"}];

	var isChain2=false;
	if(aProcess=="SimpleChain2"){
	    aProcess="BufferRequest";
	    isChain2=true;
	}

	for(var i in activatedServices)
	    if(aProcess==i){
		inputs[0].identifier="InputData";
		break;
	    }
	if (aProcess == 'Buffer' || aProcess == 'BufferPy') {
	    inputs.push({"identifier":"BufferDistance","value":"0.001","dataType":"integer"})
	}

	    
	/*var my_request=zoo.getRequest({identifier: aProcess,
				       dataInputs: inputs,
				       dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
				       type: 'POST',
				       storeExecuteResponse: false});

	var my_request1=zoo.getRequest({identifier: aProcess,
					dataInputs: [{"identifier":"InputPolygon","complexPayload": my_request.data,"href":my_request.url,"headers":[{"key":"Content-Type","value":"text/xml"}],"method": "POST","mimeType":"text/xml"}],
				       dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
				       type: 'POST',
				       storeExecuteResponse: false});

	alert(my_request1.data);
	console.log(my_request);*/
	console.log(inputs);
        zoo.execute({
            identifier: aProcess,
            dataInputs: inputs,
            dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
            type: 'POST',
            storeExecuteResponse: false,
            success: function(data) {
		notify('Execute succeded', 'success');
		console.log(data);
		var GeoJSON = new OpenLayers.Format.GeoJSON();
		var features = GeoJSON.read(JSON.stringify(data));
		console.log(features);
		dep.removeFeatures(dep.features);
		if(aProcess!="SimpleChain1" && aProcess!="SimpleChain2"
		   && aProcess!="BufferRequest")
		    if(dep!=hover_)
			hover_.removeFeatures(hover_.features);
		for(var j in features){
		    features[j].geometry=features[j].geometry.transform(wgs84,mercator);
		}
		dep.addFeatures(features);
            },
            error: function(data) {
		notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
            }
        });
		
	if(isChain2 && started)
	    singleProcessing("BufferMask",hover_);
	
    }

    function multiProcessing(aProcess) {
	if (select.features.length == 0 || hover.features.length == 0)
	    return alert("No feature created!");

	var xlink = control.protocol.url +"&SERVICE=WFS&REQUEST=GetFeature&VERSION=1.0.0";
	xlink += '&typename='+control.protocol.featurePrefix;
	xlink += ':'+control.protocol.featureType;
	xlink += '&SRS='+control.protocol.srsName;
	xlink += '&FeatureID='+select.features[0].fid;
	var GeoJSON = new OpenLayers.Format.GeoJSON();
	lfeatures=[];
	for(var i in hover.features){
	    lfeatures.push(hover.features[i].clone());
	    lfeatures[i].geometry=lfeatures[i].geometry.transform(mercator,wgs84);
	}
	var inputs=[{"identifier":"InputEntity1","href":xlink,"mimeType":"text/xml"},
		   {"identifier":"InputEntity2","value":GeoJSON.write(lfeatures),"mimeType":"application/json"}];

        zoo.execute({
            identifier: aProcess,
            dataInputs: inputs,
            dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
            type: 'POST',
            storeExecuteResponse: false,
            success: function(data) {
		notify('Execute succeded', 'success');
		console.log(data);
		var GeoJSON = new OpenLayers.Format.GeoJSON();
		var features = GeoJSON.read(JSON.stringify(data));
		if(multi.features)
		    multi.removeFeatures(multi.features);
		for(var j in features){
		    features[j].geometry=features[j].geometry.transform(wgs84,mercator);
		}
		multi.addFeatures(features);
            },
            error: function(data) {
		notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
            }
        });

    }
    
    function activateService(){
	try{
	    $("#buttonBar").append('<a href="#" class="fg-button ui-state-default ui-text-only ui-corner-all single-process process" title="'+(arguments[0]!="SimpleChain2"?arguments[0]:"BufferRequestAndMask")+'" name="'+(arguments[0]!="SimpleChain2"?arguments[0]:"BufferRequestAndMask")+'" onclick="app.singleProcessing(\''+(arguments[0]!="SimpleChain2"?arguments[0]:"SimpleChain2")+'\');"> '+(arguments[0]!="SimpleChain2" && arguments[0]!="BufferMask" && arguments[0]!="BufferRequest"?arguments[0]:(arguments[0]!="BufferMask" && arguments[0]!="BufferRequest"?"Buffer Request and Mask":arguments[0]!="BufferRequest"?"Buffer Mask":"Buffer Request"))+' </a>');
	    
	    elist=$('.process');
	    for(var i=0;i<elist.length;i++){
		elist[i].style.display='none';
	    }
	    
	}catch(e){
	    alert(e);
	}
    }


    
    //
    var initialize = function() {
        self = this;        
        
        // DescribeProcess button
        $('.btn.describeprocess').on('click', function(e) {
            e.preventDefault();
            self.describeProcess(this.dataset);
        });
        
        // GetCapabilities button
        $('.btn.getcapabilities').on('click', function(e) {
            e.preventDefault();
            self.getCapabilities(this.dataset);
        });
        
        // Execute synchrone button
        $('.btn.executesynchrone').on('click', function(e) {
            e.preventDefault();
            self.executeSynchrone(this.dataset);
        });
        
        // Launch executeasynchrone button
        $('.btn.executeasynchrone').on('click', function(e) {
            e.preventDefault();
            self.executeAsynchrone(this.dataset);
        });
        
        // Launch longProcess button
        $('.btn.longprocess').on('click', function(e) {
            e.preventDefault();
            self.longProcessDemo(this.dataset);
        });
        
        
        // Misc tests
        $('.btn.testalert').on('click', function(e) {
          e.preventDefault();
          var type = this.dataset.type;
          notify('This is a message.', type);
        });

	zoo.getCapabilities({
	    type: 'POST',
	    success: function(data){
		var processes=data["Capabilities"]["ProcessOfferings"]["Process"];
		for(var i in activatedServices){
		    for(var j=0;j<processes.length;j++)
			if(i==processes[j].Identifier){
			    activateService(i);
			    activatedServices[i]=true;
			    if(activatedServices["BufferRequest"] && activatedServices["BufferMask"] && !hasSimpleChain){
				activateService("SimpleChain2");
				activatedServices["BufferRequestAndMask"]=true;
				hasSimpleChain=true;
			    }
			    if(i=="BufferMask")
				if(activatedServices["BufferRequest"]){
				    activateService("SimpleChain2");
				    activatedServices["BufferRequestAndMask"]=true;
				}
			    break;
			}
		}
	    }
	});

	wgs84=new OpenLayers.Projection("EPSG:4326"); // transform from WGS 1984
	mercator=new OpenLayers.Projection("EPSG:900913"); // to Spherical Mer
	
	var mybounds = new OpenLayers.Bounds(-109.060636, 36.992427,
					     -102.042531, 41.004493);
	mybounds=mybounds.transform(wgs84,mercator);
	map = new OpenLayers.Map('map', {
	    projection: new OpenLayers.Projection("EPSG:900913"),
	    units: "m",
	    maxExtent: mybounds,
	    controls: [
		new OpenLayers.Control.Navigation()
	    ]
	});
	
	arrayOSM = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
		    "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
		    "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
		    "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"];
	layerLS=new OpenLayers.Layer.OSM("MapQuest-OSM Tiles", arrayOSM);
	
	layer = new OpenLayers.Layer.WMS("ways",
					 main_url,
					 {layers: typename, transparent:'true', format: 'image/png'},
					 {isBaseLayer: false, sphericalMercator: true, visibility: true, opacity: 0.6}
					);
	layer.setVisibility(true);
	
	var myStyleMap=new OpenLayers.StyleMap({
	    "default": new OpenLayers.Style({
		strokeColor: "#5555ee",
		pointRadius: 4,
		strokeWidth: 4
	    })
	});
	
	var myStyleMap1=new OpenLayers.StyleMap({
	    "default": new OpenLayers.Style({
		strokeColor: "#000000",
		pointRadius: 4,
		strokeWidth: 1
	    }, {
		rules: [
		    
		    new OpenLayers.Rule({
			filter: new OpenLayers.Filter.Comparison({
			    type: OpenLayers.Filter.Comparison.LIKE,
			    property: "name",
			    value: "Cafe:%"
			}),
			symbolizer: {
			    fillColor: "#ffaaaa",
			    pointRadius: 4,
			    strokeWidth: 1
			}
		    }),
		    new OpenLayers.Rule({
			filter: new OpenLayers.Filter.Comparison({
			    type: OpenLayers.Filter.Comparison.LIKE,
			    property: "name",
			    value: "Restaurant:*"
			}),
			symbolizer: {
			    fillColor: "#aaffaa",
			    pointRadius: 4,
			    strokeWidth: 1
			}
		    }),
		    new OpenLayers.Rule({
			filter: new OpenLayers.Filter.Comparison({
			    type: OpenLayers.Filter.Comparison.LIKE,
			    property: "name",
			    value: "Cafe:*"
			}),
			symbolizer: {
			    fillColor: "#444444",
			    fillOpacity: 1,
			    strokeOpacity: 0.4,
			    pointRadius: 4,
			    strokeWidth: 1
			}
		    }),
		    new OpenLayers.Rule({
			filter: new OpenLayers.Filter.Comparison({
			    type: OpenLayers.Filter.Comparison.LIKE,
			    property: "name",
			    value: "Hotel:*"
			}),
			symbolizer: {
			    fillColor: "#aaaaff",
			    fillOpacity: 1,
			    strokeOpacity: 0.4,
			    pointRadius: 4,
			    strokeWidth: 1
			}
		    }),
		    new OpenLayers.Rule({
			filter: new OpenLayers.Filter.Comparison({
			    type: OpenLayers.Filter.Comparison.LIKE,
			    property: "name",
			    value: "Recycling"
			}),
			symbolizer: {
			    fillColor: "#66ff66",
			    pointRadius: 4,
			    strokeWidth: 1
			}
		    }),
		    new OpenLayers.Rule({
			filter: new OpenLayers.Filter.Comparison({
			    type: OpenLayers.Filter.Comparison.LIKE,
			    property: "fid",
			    value: "29547"
			}),
			symbolizer: {
			    fillColor: "#ffffff",
			    pointRadius: 6,
			    strokeWidth: 1
			}
		    }),
		    new OpenLayers.Rule({
			elseFilter: true,
			symbolizer: {
			    fillColor: "#aaaaff",
			    opacity: 0.7,
			    pointRadius: 4,
			    fillOpacity: 0.4,
			    strokeWidth: 1
			}
		    })
		]
	    })
	});
	
	select1 = new OpenLayers.Layer.Vector("Selection", {styleMap:
							    myStyleMap
							   });
	select = new OpenLayers.Layer.Vector("Selection", {styleMap:
							   myStyleMap
							  });
	hover_ = new OpenLayers.Layer.Vector("Hover_", {styleMap:
							new OpenLayers.Style({
							    fillColor:"grey",
							    fillOpacity:0.4,
							    strokeColor:"grey",
							    strokeOpacity:0.6,
							    strokeWidth:4
							})
						       });
	hover = new OpenLayers.Layer.Vector("Hover", {styleMap:myStyleMap1
						      /*new OpenLayers.Style({
							fillColor:"pink",
							fillOpacity:0.6,
							strokeColor:"red",
							strokeOpacity:1,
							strokeWidth:2,
							pointRadius: 3.5
							})*/
						     });
	multi = new OpenLayers.Layer.Vector("Multi", {styleMap:
						      new OpenLayers.Style({
							  fillColor:"yellow",
							  fillOpacity:0.6,
							  strokeColor:"red",
							  strokeOpacity:1,
							  strokeWidth:4
						      })
						     });
	map.addLayers([ layerLS, layer, select, hover_, hover, multi]);
	
	var protocol = OpenLayers.Protocol.WFS.fromWMSLayer(layer, {
            featurePrefix: 'ms',
	    geometryName: 'msGeometry',
	    featureType: typename,
	    srsName: "EPSG:900913",
	    version: "1.0.0"
	});
	
	control = new OpenLayers.Control.GetFeature({
            protocol: protocol,
	    box: false,
	    hover: false,
	    multipleKey: "shiftKey",
	    toggleKey: "ctrlKey"
	});
	
	
	control.events.register("featureselected", this, function(e) {
	    e.feature.geometry=e.feature.geometry.transform(wgs84,mercator);
	    select.addFeatures([e.feature]);
	    elist=$(".single-process:not(.ui-state-disabled)");
	    for(var i=0;i<elist.length;i++)
		elist[i].style.display='block';
	    if(hover.features.length>=1){
		slist=$(".multi-process:not(.ui-state-disabled)");
		for(var i=0;i<slist.length;i++)
		    slist[i].style.display='block';
	    }
	});
	control.events.register("featureunselected", this, function(e) {
	    select.removeFeatures([e.feature]);
	});
	control.events.register("hoverfeature", this, function(e) {
	    hover.addFeatures([e.feature]);
	});
	control.events.register("outfeature", this, function(e) {
	    hover.removeFeatures([e.feature]);
	});
	map.addControl(control);
	control.activate();
	
	control1=new OpenLayers.Control.SelectFeature(hover,{hover: true, clickFeature:createPopup, onUnselect:unSelect});
	map.addControl(control1);
	control1.activate();
	
	var tmp=new OpenLayers.LonLat(-122.684273,45.512334); 
	tmp=tmp.transform(
	    new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
	    new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
	);
	map.setCenter(tmp,16);
	
	
	//alert(map.getExtent().transform(mercator,wgs84));
	mapControls=map.controls;
	
    }
    
    //
    var getCapabilities = function (params) {
	
        //var target = $(params.target);
        
        zoo.getCapabilities({
            type: params.method,
            success: function(data) {
                
                // Define some usefull functions for templating.
                data.setUpIndex = function() {
                    return ++window['INDEX']||(window['INDEX']=0);
                };
                data.getIndex = function() {
                    return window['INDEX'];
                };
                data.resetIndex = function() {
                    window['INDEX']=null;
                    return;
                };
		console.log(data);
                // Render.
                var accordion = tpl_getCapabilities(data);
                //target.append(accordion);
                showModal("test", accordion)

                // Details button
                $('.showdetails').on('click', function(e) {
                    e.preventDefault();
                    console.log(this.dataset);

                    var $this = $(this);
                    var $collapse = $this.closest('.panel-body').find('.collapse');

                    zoo.describeProcess({
                        identifier: this.dataset.identifier,
                        success: function(data) {
                            var details =  tpl_describeProcess(data);

                            $collapse.hide();
                            $collapse.text('');
                            $collapse.append(details);
                            $collapse.show();
                        },
                        error: function(data) {
                            $collapse.hide();
                            $collapse.text('');
                            $collapse.append("ERROR");
                            $collapse.show();
                        }
                    });
                });
            },
            error: function(data) {
                notify('GetCapabilities failed', 'danger');
                //target.append('ERROR');
            }
        });
    };
    
    //
    var describeProcess = function(params) {
        //var target = $(params.target);

        zoo.describeProcess({
            identifier: params.identifier,
            type: params.method,
            success: function(data) {
                var details =  tpl_describeProcess(data);
                //target.text('');
                //target.append(details);
                
                var title = 'DescribeProcess '+params.identifier;
                showModal(title, details);
                
            },
            error: function(data) {
                notify('DescribeProcess failed', 'danger');
            }
        });
    };
    
    //
    var executeSynchrone = function(params) {
        var target = $(params.target);
        
        notify('Calling Execute synchrone ...', 'info');
        
        zoo.execute({
          identifier: params.identifier,
          dataInputs: params.inputs ? JSON.parse(params.inputs) : null,
          dataOutputs: params.outputs ? JSON.parse(params.outputs) : null,
          type: params.method,
          storeExecuteResponse: false,
          success: function(data) {
            notify('Execute succeded', 'success');
            var details =  tpl_executeResponse(data);
            target.text('');
            target.append(details);
            
            var output = data.ExecuteResponse.ProcessOutputs.Output;
            console.log('======== OUTPUT ========');
            console.log(output);
            if (output.hasOwnProperty('Data')) {
                console.log("FOUND DATA");
                if (output.Data.hasOwnProperty('ComplexData')) {
                    console.log("FOUND COMPLEX DATA");
                    if (output.Data.ComplexData.hasOwnProperty('__cdata')) {
                        console.log('FOUND CDATA');
                        showModal('Execute '+params.identifier, output.Data.ComplexData.__cdata);
                    }
                    else {
                        console.log('SHOWING COMPLEX DATA');
                        console.log(output.Data.ComplexData);
                        var _x2js = new X2JS({
                            arrayAccessFormPaths: [
                            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
                            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
                            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
                            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
                            'Capabilities.ServiceIdentification.Keywords'
                            ],   
                        });
                        showModal('Execute '+params.identifier, _x2js.json2xml_str(output.Data.ComplexData));
                    }
                }
            } else if (output.hasOwnProperty('Reference')) {
                console.log("FOUND REFERENCE");
                showModal('Execute '+params.identifier, output.Reference._href);
            }
          },
          error: function(data) {
            notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
          }
        });
        
    };
    
    //
    var executeAsynchrone = function(params) {
        var target = $(params.target);
        
        notify('Calling Execute asynchrone ...', 'info');
        
        zoo.execute({
          identifier: params.identifier,
          dataInputs: params.inputs ? JSON.parse(params.inputs) : null,
          dataOutputs: params.outputs ? JSON.parse(params.outputs) : null,
          type: params.method,
          storeExecuteResponse: true,
          status: true,
          
          success: function(data) {
            console.log("**** SUCCESS ****");
            notify('Execute succeded', 'success');
            var details =  tpl_executeResponse_async(data);
            target.text('');
            target.append(details);          
          },
          error: function(data) {
            notify('Execute failed', 'danger');
          }
        });
        
    }
    
    //
    var longProcessDemo = function(params) {
        
        var progress = $(params.target);
        progress.removeClass("progress-bar-success").addClass("progress-bar-info");

        zoo.execute({
          identifier: params.identifier,
          type: params.method,
          dataInputs: params.inputs ? JSON.parse(params.inputs) : null,
          dataOutputs: params.outputs ? JSON.parse(params.outputs) : null,
          storeExecuteResponse: true,
          status: true,
          success: function(data, launched) {
            console.log("**** SUCCESS ****");
            console.log(launched);
            notify("Execute asynchrone launched: "+launched.sid, 'info');

            // Polling status
            zoo.watch(launched.sid, {
                onPercentCompleted: function(data) {
                    console.log("**** PercentCompleted ****");
                    console.log(data);

                    progress.css('width', (data.percentCompleted)+'%');
                    progress.text(data.text+' : '+(data.percentCompleted)+'%');
                    
                },
                onProcessSucceeded: function(data) {
                    //console.log("**** ProcessSucceeded ****");
                    //console.log(data);
                    
                    progress.css('width', (100)+'%');
                    progress.text(data.text+' : '+(100)+'%');
                    progress.removeClass("progress-bar-info").addClass("progress-bar-success");
                    
                    // TODO: multiple output
                    if (data.result.ExecuteResponse.ProcessOutputs) {
                        var output = data.result.ExecuteResponse.ProcessOutputs.Output;
                        var id = output.Identifier.__text;
                        var text = output.Data.LiteralData.__text;
                        console.log(id+': '+text);
                        notify("Execute asynchrone "+id+': '+text, 'success');
                    }
                },
                onError: function(data) {
                    console.log("**** onError ****");
                    console.log(data);
                    notify("Execute asynchrone failed", 'danger');
                },        
            });
          },
          error: function(data) {
            console.log("**** ERROR ****");
            console.log(data);
            notify("Execute asynchrone failed", 'danger');
            
          },

        });
    };

    // Return public methods
    return {
        initialize: initialize,
        singleProcessing: singleProcessing,
        multiProcessing: multiProcessing,
        restartDisplay: restartDisplay,
        describeProcess: describeProcess,
        getCapabilities: getCapabilities,
        executeSynchrone: executeSynchrone,
        executeAsynchrone: executeAsynchrone,
        longProcessDemo: longProcessDemo
    };


});

