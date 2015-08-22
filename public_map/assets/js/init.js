// Filename: app.js
/*
    This work was supported by a grant from the European Union's 7th Framework Programme (2007-2013)
    provided for the project PublicaMundi (GA no. 609608).
*/


define([
    'module', 'jquery', 'zoo', 'xml2json', 'ol', 'mmDataTables'
], function(module, $, Zoo, X2JS,ol,MMDataTable) {

(function(){
    var methods = ['addClass', 'removeClass'];

    $.each(methods, function (index, method) {
	var originalMethod = $.fn[method];

	$.fn[method] = function () {
	    var oldClass = this.className;
	    var result = originalMethod.apply(this, arguments);
	    var newClass = this.className;
	    this.trigger(method, [oldClass, newClass]);	    
	    return result;
	};
    });

})();
    
    var zoo = new Zoo({
        url: zooUrl,
        delay: module.config().delay,
    });
    
    var map,pmap;
    var gmap;
    var mmview;
    var accuracyFeature,positionFeature;
    var mapInteractions={};
    var drawSource;
    var geolocation;
    var selectLayer,printLayer;
    var mymodal = $('#myModal');
    var mynotify = $('.top-right');
    var wgs84Sphere = new ol.Sphere(6378137);

    function notify(text, type) {
        mynotify.notify({
            message: { text: text },
            type: type,
        }).show();
    }


    function setTreeHeight(){
	var theight= $("html").height() - $('.navbar-header').height() - (2*$('.nav-tabs').height()) - $('#mmcdts').height() - 30;
	$('.baselayers,.tree-container,.info-container,.sources-container').height(theight);
    }

    function setMapHeight(){
	var mpheight= $(window).height() - $('.navbar-header').height();
	$('#map').height(mpheight);
    }

    $(window).resize(function() {
	setMapHeight();
	setTreeHeight();
	map.updateSize();
    });

    function isMobile() {
	try{ document.createEvent("TouchEvent"); return true; }
	catch(e){ return false; }
    }

    var myBaseLayersUrls=[];
    var myBaseLayerNames=[];

    function updateBSImages(){
	mmZoom=map.getView().getZoom();
	mmCenter=ol.proj.transform(map.getView().getCenter(),"EPSG:3857","EPSG:4326");
	var layers=map.getLayers();
	for(var l=0;l<myBaseLayers.length;l++){
	    try{
		loadBaseLayerIcon(myBaseLayerNames[l],layers.item(l));
	    }catch(e){
		try{
		    loadBaseLayerIcon(myBaseLayerNames[l],layers.item(l).getLayers().item(1));
		}catch(e){
		    console.log("Unable to display baselayer background image see http://mapmint.com/faq/BaseLayerDisplay");
		}
	    }
	}
    }

    function loadBaseLayerIcon(key,layer){
	var obj=layer.getSource().getTileGrid().getTileCoordForCoordAndZ(ol.proj.transform(mmCenter,"EPSG:4326","EPSG:3857"),mmZoom);
	var tmp=layer.getSource().getTileUrlFunction()(obj,1.325,ol.proj.get("EPSG:3857"));
	var res=tmp.split('\n')[0];
	if(myBaseLayerNames.indexOf(key)<0)
	    myBaseLayerNames.push(key);
	$("#base_layer_"+key+"_img").attr("src",res);
	return res;
    }

    var initBaseLayers = function(){
	if(baseLayers["osm"]==1){
	    var osm = new ol.layer.Tile({
                source: new ol.source.OSM(),
		visible: baseLayers["default"]==myBaseLayers.length?true:false,
                name: 'osm'
            });
	    myBaseLayers.push(osm);
	    url=loadBaseLayerIcon("OSM",osm);
	    console.log("OK 0");
	    console.log(url);
	}
	if(baseLayers["mq"].length>=1){
	    for(i in baseLayers["mq"]){
		var osm;
		console.log(baseLayers["mq"][i]);
		if(baseLayers["mq"][i]!='hyb'){
		    osm=new ol.layer.Tile({
			visible: baseLayers["default"]==myBaseLayers.length?true:false,
			source: new ol.source.MapQuest({layer: baseLayers["mq"][i]})
		    });
		    url=loadBaseLayerIcon(baseLayers["mq"][i],osm);
		    console.log("OK 0");
		    console.log(url);

		}
		else{
		    osm=new ol.layer.Group({
			visible: baseLayers["default"]==myBaseLayers.length?true:false,
			layers: [
			    new ol.layer.Tile({
				source: new ol.source.MapQuest({layer: 'sat'})
			    }),
			    new ol.layer.Tile({
				source: new ol.source.MapQuest({layer: 'hyb'})
			    })
			]
		    });
		    console.log("OK 1");
		    url=loadBaseLayerIcon(baseLayers["mq"][i],osm.getLayers().item(1));
		    console.log("OK 0");
		    console.log(url);
		}
		myBaseLayers.push(osm);
	    }
	}

	if(baseLayers["proprietary"]["type"]!="Google"){
	if(baseLayers["proprietary"]["layers"] && baseLayers["proprietary"]["layers"].length>=1){
	    var resolutions = [];
	    var matrixIds = [];
	    var proj3857 = ol.proj.get('EPSG:3857');
	    var maxResolution = ol.extent.getWidth(proj3857.getExtent()) / 256;
	    
	    for (var i = 0; i < 18; i++) {
		matrixIds[i] = i.toString();
		resolutions[i] = maxResolution / Math.pow(2, i);
	    }
	    
	    var tileGrid = new ol.tilegrid.WMTS({
		origin: [-20037508, 20037508],
		resolutions: resolutions,
		matrixIds: matrixIds
	    });

	    var layer;
	    for(i in baseLayers["proprietary"]["layers"]){
		if(baseLayers["proprietary"]["type"]!="IGN"){
		    var attributions = {
			"ESRI": new ol.Attribution({
			    html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
				'rest/services/'+
				baseLayers["proprietary"]["layers"][i]+
				'/MapServer">ArcGIS</a>'
			}),
			"MapBox": new ol.Attribution({
			    html: '<a href="http://mapbox.com/about/maps">Terms &amp; Feedback</a>'
			})
		    };
		    var urls= {
			"ESRI": 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
			    baseLayers["proprietary"]["layers"][i]+
			    '/MapServer/tile/{z}/{y}/{x}',
			"MapBox": "https://api.mapbox.com/v4/" + 
			    baseLayers["proprietary"]["layers"][i] +
			    "/{z}/{x}/{y}.png?access_token="+
			    baseLayers["proprietary"]["key"]
		    };
		    layer=(baseLayers["proprietary"]["type"]!="Bing"?
			   new ol.layer.Tile({
			       visible: baseLayers["default"]==myBaseLayers.length?true:false,
			       source: new ol.source.XYZ({
				   attributions: [attributions[baseLayers["proprietary"]["type"]]],
				   url: urls[baseLayers["proprietary"]["type"]]
			       })
			   }):
			   new ol.layer.Tile({
			       visible: false,
			       preload: Infinity,
			       source: new ol.source.BingMaps({
				   key: baseLayers["proprietary"]["key"],
				   imagerySet: baseLayers["proprietary"]["layers"][i],
				   // use maxZoom 19 to see stretched tiles instead of the BingMaps
				   // "no photos at this zoom level" tiles
				   maxZoom: 19
			       })
			   })
			  );
		}
		else{
		    var ign_source = new ol.source.WMTS({
			url: 'http://wxs.ign.fr/' + baseLayers["proprietary"]["key"] + '/wmts',
			layer: baseLayers["proprietary"]["layers"][i],
			matrixSet: 'PM',
			format: 'image/jpeg',
			projection: 'EPSG:3857',
			tileGrid: tileGrid,
			style: 'normal',
			attributions: [new ol.Attribution({
			    html: '<a href="http://www.geoportail.fr/" target="_blank">' +
				'<img src="http://api.ign.fr/geoportail/api/js/latest/' +
				'theme/geoportal/img/logo_gp.gif"></a>'
			})]
		    });
		    
		    layer = new ol.layer.Tile({
			visible: baseLayers["default"]==myBaseLayers.length?true:false,
			source: ign_source
		    });
		}

		url=loadBaseLayerIcon(baseLayers["proprietary"]["layers"][i].replace(/\./g,"_"),layer);
		console.log("OK 0");
		console.log(url);

		myBaseLayers.push(layer);
		//url=loadBaseLayerIcon(baseLayers["mq"][i],osm.getLayers().item(1));
	    }
	}
	}
	if(baseLayers["proprietary"]["type"]=="Google"){
	    var gMapDiv = document.getElementById('gmap');
	    gMapDiv.style.height=olMapDiv.style.height;
	    gMapDiv.style.width=olMapDiv.style.width;

	    gmap = new google.maps.Map(document.getElementById('gmap'), {
		disableDefaultUI: true,
		keyboardShortcuts: false,
		draggable: false,
		disableDoubleClickZoom: true,
		scrollwheel: false,
		streetViewControl: false
	    });
	
	    mmview = new ol.View({
		// make sure the view doesn't go beyond the 22 zoom levels of Google Maps
		maxZoom: 21
	    });
	    mmview.on('change:center', function() {
		var center = ol.proj.transform(mmview.getCenter(), 'EPSG:3857', 'EPSG:4326');
		gmap.setCenter(new google.maps.LatLng(center[1], center[0]));
	    });
	    mmview.on('change:resolution', function() {
		gmap.setZoom(mmview.getZoom());
	    });
	}
	
    };

    var finalizeBaseLayers=function(){
	if(baseLayers["proprietary"]["type"]=="Google"){
	    map.setView(mmview);
	    mmview.setCenter([0, 0]);
	    mmview.setZoom(1);
	    olMapDiv.parentNode.removeChild(olMapDiv);
	    //gmap.setMapTypeId(google.maps.MapTypeId.TERRAIN);
	    gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(olMapDiv);
	}
    }

    var myBaseLayers=[];
    var myToolsLayers=[];
    var olMapDiv;

    var initialize = function() {

	console.log('START !');

	enquire.register("screen and (max-width:980px)", {
	    setup : function() {
		setMapHeight();
		setTreeHeight();
	    },
	    match : function() {
		$('#mmtabs').prepend('<li id="mapwrap" class="active" role="map" data-toggle="tooltip" data-placement="bottom" title="Map"><a href="#mapcontainer" aria-controls="settings" role="tab" data-toggle="tab"><i class="i i-map"></i></a></li>');
		$('.tab-content').prepend('<div role="tabpanel" class="tab-pane" id="mapcontainer"></div>');
		$('.nav-tabs li:eq(2) a').tab('show');
		$('.nav-tabs li:eq(0) a').tab('show');
		$('#main-wrapper').children().each(function(){
		    $(this).detach().appendTo('#mapcontainer');
		});
		$('#map').css("position","relative");
		var mnheight= $(window).height() - $('.navbar-header').height() - $('.nav-tabs').height() - $('#mmcdts').height() - 4;      
		$('#map').height(mnheight);
		setTreeHeight();
		
	    },
	    unmatch : function() {
		$('#mapcontainer').children().each(function(){
		    $(this).detach().appendTo('#main-wrapper');
		});
		$('#mapwrap, #mapcontainer').remove();
		//$('#map').height(mpheight);
		$('#map').css("width","100%");
		$('#map').css({'position':'relative','top' : '0'});
		setMapHeight();
		map.updateSize();
		$('.nav-tabs li:eq(0) a').tab('show');
		setTreeHeight();
	    }
	});
	
	
	$(".cm").contextmenu({
	    target: "#context-menu"
	});

	authenticateSetup();
	//$("[rel='dropdown']").dropdown("toggle");

	$('.selectpicker').selectpicker();

	$('.dropdown-menu button').on({
	    "click":function(e){
		e.stopPropagation();
		console.log(e);
		return false;
	    }
	});
	$('.dropdown-menu .dropdown-toggle').on({
	    "click":function(e){
		e.stopPropagation();
		console.log(e);
		try{
		    console.log($(this).parent().data('open'));
		    
		    //$(this).parent().dropdown("toggle");
		    
		    //$("[rel='dropdown']").dropdown("toggle");
		    $(this).parent().find(".dropdown-menu").each(function(){
			if($(this).hasClass('inner')){
			    $(this).addClass('show');
			    $(this).find("a").each(function(){
				$(this).on('click',function(e){
				    //e.stopPropagation();
				    $(this).parent().parent().parent().parent().removeClass('open');
				});
			    });
			}
			else
			    $(this).removeClass('open');
		    });
		    $(this).parent().toggleClass('open');
		    if($(this).parent().data('open')) {
			$(this).parent().data('open', false);
		    } else
			$(this).parent().data('open', true);
		    console.log($(this).parent().data('open'));
		}catch(e){
		    console.log(e);
		}
	    }
	});

	$('.cm').bind("contextmenu",function(e){
	    //alert('Context Menu event has fired!'); 
	    $(".tree li").find(".active").toggleClass("active");
	    $(this).toggleClass("active");
	    console.log($(this).attr("id"));
	    var cid=eval($(this).attr("id").replace(/layer_/,""));
	    clayer=getLayerById(cid);
	    console.log(oLayers[clayer]["query"]);
	    
	    for(i in {"export":0,"query":0}){	    
		if(!oLayers[clayer][i])
		    $("#mmm_"+i).parent().addClass("hidden");
		else
		    $("#mmm_"+i).parent().removeClass("hidden");
	    }


	    $("#mmm_opacity").val(oLayers[clayer]["opacity"]*100);
	    $("#mmm_range").val(Math.round(oLayers[clayer]["opacity"]*100).toFixed(0)+"%");

	    $('body, #context-menu > ul > li > a').on('click', function (e) {$(".tree li").find(".active").removeClass('active');});
	    return false;
	});
	
	$( ".tp, .op" ).click(function() {
	    $( "#sidebar-wrapper").toggle();
	    $( ".op").toggle();
	    $('#map').css("position","relative");
	    $("#main-wrapper").toggleClass("fw");
	    $(".ol-zoomslider").toggleClass("ol-zsm");
	    $(".ol-zoom-extent").toggleClass("ol-zmm");
	    $(".ol-zoom").toggleClass("ol-zzm");   
	    map.updateSize();
	}); 

	var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
	original_extent=ol.extent.applyTransform(original_extent, transformer);

	
	var controls = [
	    new ol.control.Attribution(),
	    new ol.control.Rotate({autoHide: true}),
	    new ol.control.Zoom(),
	];

	/*new ol.control.MousePosition({
	  undefinedHTML: 'outside',
	  projection: 'EPSG:4326',
	  coordinateFormat: function(coordinate) {
	  return ol.coordinate.format(coordinate, '{x}, {y}', 4);
	  }
	  }),
	  new ol.control.OverviewMap(), 
	  new ol.control.ScaleLine(),
	  new ol.control.ZoomSlider(),
	  new ol.control.ZoomToExtent({"label":"E","extent":original_extent})/*,
	  new ol.control.FullScreen()
	  ];*/
	var optionals={
	    "zoomtomaxextent": new ol.control.ZoomToExtent({"label":"E","extent":original_extent}),
	    "MousePosition": new ol.control.MousePosition({
		undefinedHTML: 'outside',
		projection: 'EPSG:4326',
		coordinateFormat: function(coordinate) {
		    return ol.coordinate.format(coordinate, '{x}, {y}', 4);
		}
	    }),
	    "ScaleBar": new ol.control.ScaleLine(),
	    "MMOVMap": new ol.control.OverviewMap(),
	    /*"MMOVMapFixed":{
		"active":-1,
		"index":-1
	    },*/
	    "MMPanZoom": new ol.control.ZoomSlider()
	};
	for(j in optionals){
	    for(i in mmToolNames){
		if(mmToolNames[i]==j){
		    console.log("PUSH CONTROL: "+j)
		    controls.push(optionals[j]);
		    break;
		}
	    }
	}
	/*for(j in optionals){
	    for(i in mmToolNames){
		if(mmToolNames[i]==j){
		    controls.push(optionals[j]["control"]);
		    break;
		}
	    }		
	}*/

	var myWMSLayers;
	
	olMapDiv = document.getElementById('map');
	initBaseLayers();
	map = new ol.Map({
	    target: olMapDiv,
	    controls: controls,
	    layers: myBaseLayers,
	    interactions: ol.interaction.defaults({
		altShiftDragRotate: true,
		dragPan: false,
		rotate: true
	    }).extend([new ol.interaction.DragPan({kinetic: null})]),//ol.interaction.defaults({shiftDragZoom: false}) ,
	    view: new ol.View({
		extent: original_extent,
		center: [0, 0],
		zoom: 2
	    })
	});

	map.getView().fit(original_extent,map.getSize());

	geolocation = new ol.Geolocation({
	    projection: map.getView().getProjection()
	});
	accuracyFeature = new ol.Feature();
	geolocation.on('change:accuracyGeometry', function() {
	    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
	    map.getView().fit(accuracyFeature.getGeometry().getExtent(),map.getSize());
	});

	var noTracking=true;
	positionFeature = new ol.Feature();
	positionFeature.setStyle(new ol.style.Style({
	    image: new ol.style.Circle({
		radius: 6,
		fill: new ol.style.Fill({
		    color: '#3399CC'
		}),
		stroke: new ol.style.Stroke({
		    color: '#fff',
		    width: 2
		})
	    })
	}));
	
	geolocation.on('change:position', function() {
	    var accuracy = geolocation.getAccuracy();
	    var heading = geolocation.getHeading() || 0;
	    var speed = geolocation.getSpeed() || 0;
	    var m = Date.now();
	    var coordinates = geolocation.getPosition();
	    positionFeature.setGeometry(coordinates ?
					new ol.geom.Point(coordinates) : null);
	    if(noTracking){
		geolocation.setTracking(false);
	    }
	});
	

	layers=[];

	var styles=[];
	var vectors=[];
	var cnt=0;
	for(layerName in oLayers){
	    console.log(layerName);
	    console.log(oLayers[layerName]);
	    if(oLayers[layerName].display=="raster"){
		var layer=new ol.layer.Tile({
		    visible: oLayers[layerName]["activated"],
		    source: new ol.source.TileWMS({
			url: msUrl+"?map="+pmapfile,
			params: {'LAYERS': layerName, 'TILED': true},
			serverType: 'mapserver'
		    })
		});
		layers.push(layer);
		map.addLayer(layer);
	    }else{
		console.log(oLayers[layerName].display);
		console.log(pubUrl);
		console.log(lastMap);
		var d=new Date();

		map.addLayer(layerVector = new ol.layer.Vector());

		console.log("/styles/"+layerName+"_"+(oLayers[layerName].filter?System.iniFilterValue+"_":"")+lastMap+"_sld.xml?timestamp="+d.getTime());
		$.ajax({
		    type: "GET",
		    localID: layerName,
		    url: pubUrl+"/styles/"+layerName+"_"+(oLayers[layerName].filter?System.iniFilterValue+"_":"")+lastMap+"_sld.xml",
		    complete: function(xml,status){
			var style;
			console.log(this.localID);
			console.log(oLayers[this.localID]);
			console.log(this.localID);
			if(xml.responseText!=""){
			    var _x2js = new X2JS();
			    var obj=_x2js.xml_str2json( xml.responseText );
			    console.log(obj);
			    

			    if(oLayers[this.localID].dataType=="point"){
				try{
				    var tmp1=obj["StyledLayerDescriptor"]["NamedLayer"]["UserStyle"]["FeatureTypeStyle"]["Rule"];
				    console.log(tmp1);

				    if(tmp1.length){
					var pointsStyles=[];
					var pointsConditions=[];
					for(var j=0;j<tmp1.length;j++){
					    console.log(tmp1[j]);
					    pointsConditions.push(tmp1[j]["Filter"]);
					    var tmp0=tmp1[j]["PointSymbolizer"];
					    var options={};
					    options["radius"]=tmp0["Graphic"]["Size"].toString();
					    if(tmp0["Graphic"]["Mark"]["Fill"])
						options["fill"]=new ol.style.Fill({
						    color: tmp0["Graphic"]["Mark"]["Fill"]["CssParameter"].toString(),
						    opacity: 0.6
						});
					    if(tmp0["Graphic"]["Mark"]["Stroke"])
						options["stroke"]=new ol.style.Fill({
						    color: tmp0["Graphic"]["Mark"]["Stroke"]["CssParameter"].toString(),
						    width: 1,
						    opacity: 0.6
						});

					    pointsStyles.push(new ol.style.Style({
						image: new ol.style.Circle(options)
					    }));
					}
					style=(function(feature, resolution){
					    for(var k=0;k<pointsConditions.length;k++){
						if(pointsConditions[k]["PropertyIsEqualTo"]){
						    var filter=pointsConditions[k]["PropertyIsEqualTo"];
						    if(
							feature.get(filter["PropertyName"].toString())==
							    filter["Literal"].toString()
						      ){
							return [pointsStyles[k]];
						    }
						}
					    }
					    return [pointsStyles[0]];
					});
					console.log(pointsConditions);
					console.log(pointsStyles);
				    }else{
					console.log(obj["StyledLayerDescriptor"]["NamedLayer"]["UserStyle"]["FeatureTypeStyle"]["Rule"]["PointSymbolizer"]);
					var tmp0=obj["StyledLayerDescriptor"]["NamedLayer"]["UserStyle"]["FeatureTypeStyle"]["Rule"]["PointSymbolizer"];
					console.log(tmp0["Graphic"]["Mark"]["WellKnownName"]);
				    
					if(tmp0["Graphic"]["Mark"]["WellKnownName"]=="square"){

					    console.log(tmp0["Graphic"]["Mark"]["WellKnownName"]);

					    style=new ol.style.Style({
						image: new ol.style.Circle({
						    radius: eval(tmp0["Graphic"]["Size"].toString()+"*10"),
						    fill: new ol.style.Fill({
							color: tmp0["Graphic"]["Mark"]["Fill"]["CssParameter"].toString(),
							opacity: 0.6
						    }),
						    stroke: new ol.style.Stroke({
							color: tmp0["Graphic"]["Mark"]["Stroke"]["CssParameter"].toString(),
							opacity: 0.4
						    })
						})});
					    
					}
				    }
				    styles.push(style);
				}catch(e){
				    console.log(e);
				}
			    }
			}
			var sourceVector;

			loadFeatures = function(response) {
			    formatWFS = new ol.format.WFS(),
			    sourceVector.addFeatures(formatWFS.readFeatures(response,{
				dataProjection: ol.proj.get('EPSG:4326'),
				featureProjection: ol.proj.get('EPSG:3857')
			    }));
			};

			sourceVector = new ol.source.Vector({
			});

			if(styles[cnt]!=null)
			    layerVector = new ol.layer.Vector({
				visible: true,
				style: style,
				source: sourceVector
			    });
			else
			    layerVector = new ol.layer.Vector({
				visible: true,
				source: sourceVector
			    });
			
			cnt++;
			console.log(this.localID);
			$.ajax(msUrl+"?map="+pmapfile,{
			    type: 'GET',
			    data: {
				service: 'WFS',
				version: '1.1.0',
				request: 'GetFeature',
				typename: this.localID,
				srsName: 'EPSG:4326'/*,
						      bbox: extent.join(',') + ',EPSG:3857'*/
			    },
			}).done(loadFeatures);

			layerVector.set("name",this.localID);
			//map.addLayer(layerVector);
			
			var col=map.getLayers();
			var j=0;
			for(i in oLayers){
			    if(i==this.localID)
				break;
			    j++;
			}
			col.removeAt(j+myBaseLayers.length);
			col.insertAt(j+myBaseLayers.length,layerVector);
			if(j+myBaseLayers.length!=col.getLength()){
			    console.log(j+myBaseLayers.length);
			    console.log(col.getLength());
			    
			}
		    }
		});
	    }
	}

	$("#mm_bs_display").on("addClass",function(){
	    updateBSImages();
	});
	finalizeBaseLayers();

	var featuresOverlay = new ol.layer.Vector({
	    map: map,
	    source: new ol.source.Vector({
		features: [accuracyFeature, positionFeature]
	    })
	});
	myToolsLayers.push(featuresOverlay);


	$('input[type="checkbox"]').each(function(){
	    console.log($(this).parent());
	    $(this).change(function(){
		//console.log($(this));
		if($(this).parent()[0]["id"].replace(/layer_/g,"")){
		    console.log($(this).parent()[0]["id"].replace(/layer_/g,""));
		    //console.log(map.getLayers());
		    console.log($(this).is(":checked"));
		    var tmp=eval($(this).parent()[0]["id"].replace(/layer_/g,"")+"+myBaseLayers.length");
		    console.log(tmp);
		    map.getLayers().item(eval($(this).parent()[0]["id"].replace(/layer_/g,"")+'+myBaseLayers.length')).setVisible($(this).is(":checked"));
		}
		else{
		    $(this).parent().find(".cm").each(function(){
			console.log(myBaseLayers.length);
			console.log($(this)[0]["id"]);
			var tmp=eval($(this)[0]["id"].replace(/layer_/g,"")+'+myBaseLayers.length');
			console.log(tmp);
			console.log($(this).find("input").is(":checked"));
			map.getLayers().item(tmp).setVisible(($(this).find("input").is(":checked")));
			console.log($(this)[0]["id"]);
		    });
		}
	    });
	});
	
	$(".base_layer").on('click',function(e){
		$(this).parent().parent().find(".active").removeClass("active");
		var tmpId=eval($(this).parent().attr("id").replace(/bl_/g,""));
		for(var i=0;i<myBaseLayers.length;i++)
		    if(i!=tmpId)
			map.getLayers().item(i).setVisible(false);
		var tmp=$(this).attr("id").replace(/base_layer_/g,"").replace(/_/g,".");
		console.log(tmp);
		var tmp0=tmp.split('.');
		console.log(tmp0);
		if(tmp0.length>1 && tmp0[0]=="google")
		    gmap.setMapTypeId(eval(tmp));
		else{
		    map.getLayers().item(tmpId).setVisible(true);
		}
		$(this).parent().addClass("active");
	});

	/*var bid=0;
	$(".base_layer").each(function(){
	    var lbid=bid;
	    $(this).click(function(){
		console.log($(this));
		$(this).parent().parent().find(".active").removeClass("active");
		var tmpId=eval($(this).parent().attr("id").replace(/bl_/g,""));
		for(var i=0;i<myBaseLayers.length;i++)
		    if(i!=tmpId)
			map.getLayers().item(i).setVisible(false);
		var tmp=$(this).children()[0]["id"].replace(/base_layer_/g,"").replace(/_/g,".");
		var tmp0=tmp.split('.');
		if(tmp0.length>1 && tmp0[0]=="google")
		    gmap.setMapTypeId(eval($(this).children()[0]["id"].replace(/base_layer_/g,"").replace(/_/g,".")));
		else{
		    map.getLayers().item(tmpId).setVisible(true);
		}
		$(this).addClass("active");
	    });
	    bid++;
	});*/

	var popup = new ol.Overlay.Popup();
	map.addOverlay(popup);
        
	map.on('click', function (evt) {
	    var feature = map.forEachFeatureAtPixel(evt.pixel,function (feature, layer) {
		if(layer)
		    feature.set("layerName",layer.get("name"));
		return feature;
	    });
	    if (feature && feature.get("layerName")) {
		var geometry = feature.getGeometry();
		var coord = geometry.getCoordinates();
		popup.setPosition(coord);
		
		if(oLayers[feature.get("layerName")]["dataType"]=="point"){
		    System.onPrintlTemplate=function(feature,html){
			//var coords = ol.coordinate.toStringXY(ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326'),2);
			popup.show(evt.coordinate, '<div>' + html
				   +'</div>');
		    }
		    tryRun(feature);
		}else{
		    var wmsSource = new ol.source.TileWMS({
			url: msUrl+"?map="+oLayers[feature.get("layerName")]["search"],
			params: {'LAYERS': feature.get("layerName")},
			serverType: 'mapserver',
			crossOrigin: ''
		    });
		    var url = wmsSource.getGetFeatureInfoUrl(
			evt.coordinate, map.getView().getResolution(), 'EPSG:3857',
			{'INFO_FORMAT': 'text/html'});
		    $.ajax({
			type: "GET",
			url: url
		    }).done(function(res){
			//console.log(res);
			//var coords = ol.coordinate.toStringXY(ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326'),2);
			popup.show(evt.coordinate, '<div>' + res
				   +'</div>');
		    });
		    console.log(url);
		}
	    } else {
		popup.hide();
	    }
	});

	mapInteractions["default"]=new ol.interaction.Select({
	    style: function(feature, resolution) {
		//console.log(feature.getStyle());
		return [new ol.style.Style({
		    image: new ol.style.Circle({
			radius: 10,
			fill: new ol.style.Fill({
			    color: '#FF0000'
			    }),
			    stroke: new ol.style.Stroke({
				color: '#fff',
				width: 5
			    }),
			    text: new ol.style.Text({
				//text: feature.get('name'),
				font: '15px Verdana,sans-serif',
				fill: '#FFFFFFF',
				stroke:'#333333',
				offsetY: 25
			    })
			}),   
			condition: function(e) {
			    return e.originalEvent.type=='mousemove';
			}
		    })];
		}
	});
	map.addInteraction(mapInteractions["default"]);

	mapInteractions["zoomin"] = new ol.interaction.DragZoom({condition: ol.events.condition.always}); 

	drawSource = new ol.source.Vector();

	var vector = new ol.layer.Vector({
	    source: drawSource,
	    style: new ol.style.Style({
		fill: new ol.style.Fill({
		    color: 'rgba(255, 255, 255, 0.2)'
		}),
		stroke: new ol.style.Stroke({
		    color: '#ffcc33',
		    width: 2
		}),
		image: new ol.style.Circle({
		    radius: 7,
		    fill: new ol.style.Fill({
			color: '#ffcc33'
		    })
		})
	    })
	});

	map.addLayer(vector);

	selectLayer = new ol.layer.Vector({
	    visible: true,
	    source: new ol.source.Vector({})
	});
	map.addLayer(selectLayer);
	myToolsLayers.push(selectLayer);

	myMMDataTableObject = new MMDataTable({"selectLayer": selectLayer, "zook": zoo});

	loadContextualMenu();
	load_menu();
	$('[data-toggle="remove"]').on('click',function(e){
	    console.log("data-toggle");
	    console.log("* DEBUG DJAY !!!!!!!");
	    console.log("* DEBUG DJAY !!!!!!!");
	    //console.log($("#mmm_table-wrapper-container").find(".active").get("id"));
	    $("#mmm_table-wrapper-container").find(".active").remove();
	    $("#mmm_table-wrapper-header").find(".active").remove();
	    if($("#mmm_table-wrapper-header").find("li a").length>1)
		$($("#mmm_table-wrapper-header").find("li a")[1]).tab('show');
	    else
		$("#table-wrapper").collapse("hide");
	    e.preventDefault();
	});

	$("[data-toggle=zoomToElement]").on('click',function(){
	    console.log(map.getSize());
	    var size=map.getSize();
	    //size[1]/=2;
	    map.getView().fit(selectLayer.getSource().getExtent(),map.getSize());
	});



    }

    var myMMDataTableObject;
    var tableDisplay=0;
    var contextualMenu={
	"zoomTo": {
	    "run": function(layer){
		var key=getLayerById(layer);
		var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
		var extent=ol.extent.applyTransform(oLayers[key]["extent"], transformer);
		map.getView().fit(extent,map.getSize());
	    }
	},
	"query": {
	    "run": function(layer){

		var key=getLayerById(layer);
		console.log(oLayers[key]);
		if(oLayers[key]["dataType"]=="raster"){
		    zoo.execute({
			"identifier": "mapfile.getInitialInfo",
			"type": "POST",
			dataInputs: [
			    {"identifier":"map","value":lastMap,"dataType":"string"},
			    {"identifier":"layer","value":key,"dataType":"string"}
			],
			dataOutputs: [
			    {"identifier":"Result","type":"raw"},
			],
			success: function(data){
			    console.log("SUCCESS");
			    console.log(data);
			    var layer=key;

			    var Bands=[];
			    if(data["datasource"]["Band"].length){
				for(i in data["datasource"]["Band"])
				    Bands.push({
					name: "Band "+i,
					data: data["datasource"]["Band"]["histogram"].split(",")
				    });
			    }
			    else
				Bands.push({
				    name: "Band 1",
				    data: data["datasource"]["Band"]["histogram"].split(",")
				});

			    for(i in Bands)
				for(j in Bands[i]["data"])
				    Bands[i]["data"][j]=parseFloat(Bands[i]["data"][j]);

			    for(var i in {"container":0,"header":0})
				$("#mmm_table-wrapper-"+i).find(".active").each(function(){
				    $(this).removeClass("active");
				});

			    $("#mmm_table-wrapper-container").append('<div class="output-profile tab-pane active" id="output-histogram-'+key+'" style="height: '+($(window).height()/3)+'px;"></div>');
			    
			    if(!$('#mmm_table-content-display_'+layer).length){
				$("#mmm_table-wrapper-header").append('<li role="presentation" class="active"><a id="mmm_table-content-display_'+key+'" title="'+oLayers[key]["alias"]+'" data-toggle="tab" data-target="#output-histogram-'+key+'" href="#output-histogram-'+layer+'"><i class="fa fa-area-chart"></i><b class="ncaret"> </b><span class="hidden-xs hidden-sm">'+oLayers[key]["alias"]+'</span> </a>  </li>');
			    }else
				$('#output-histogram-'+key).remove();

			    if(!$("#table-wrapper").hasClass("in"))
				$("#table-wrapper").collapse("show");

			    $('#mmm_table-content-display_'+key).tab("show");

			    var chart = new Highcharts.Chart({
				chart: {
				    zoomType: 'x',
				    renderTo: 'output-histogram-'+key
				},
				title: {
				    text: "Raster Histogram"
				},
				xAxis: {
				    labels: {
					formatter: function(){
					    var tmp=this.value+"";
					    return tmp;
					}
				    },
				    title: { text: 'Points' },
				    maxZoom: 0
				},
				yAxis: {
				    //max: mmax*2,
				    title: { text: null },
				    startOnTick: false,
				    showFirstLabel: false
				},
				legend: {
				    enabled: false
				},
				plotOptions: {
				    area: {
					cursor: 'pointer',
					fillColor: {
					    linearGradient: [0, 0, 0, 300],
					    stops: [
						[0, '#74B042'],
						[1, 'rgba(255,255,255,0)']
					    ]
					},
					lineWidth: 1,
					marker: {
					    enabled: false,
					    states: {
						hover: {
						    enabled: true,
						    radius: 3
						}
					    }
					},
					shadow: false,
					states: {
					    hover: {
						lineWidth: 1
					    }
					}
				    }
				},
				tooltip: {
				    formatter: function() {
					return '<h1>'+this.x+': '+Highcharts.numberFormat(this.y, 0)+"</h1>";
				    }
				},
				series: Bands
			    });
			    
			},
			error: function(data){
			    console.log("ERROR");
			    console.log(data);
			}
		    });
		}
		else
		    myMMDataTableObject.display(key,{
			url: msUrl,
			data: {
			    "map":oLayers[key]["map"],
			    version: "1.0.0",
			    service: "WFS",
			    request: 'GetFeature',
			    typename: key
			}
		    });

	    }
	},
	"export": {
	    "run": function(layer){
		
		var key=getLayerById(layer);
		zoo.execute({
		    identifier: "vector-converter.exportTo",
		    type: "GET",
		    dataInputs: [
			{"identifier":"map","value":lastMap,"dataType":"string"},
			{"identifier":"layer","value":layer,"dataType":"string"},
			{"identifier":"format","value":$("#sGSelectedFormat").val(),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    success: function(data){
			console.log("SUCCESS");
			console.log(data);
			window.open(data,"_blank");
		    },
		    error: function(data){
			console.log("ERROR");
			console.log(data);
		    }
		    
		});
		
		/*$.ajax({
		    type: "GET",
		    dataType: "html",
		    url: zooUrl+"?request=Execute&service=WPS&version=1.0.0&Identifier=vector-converter.exportTo"+"&DataInputs=map="+lastMap+";layer="+layer+";format="+$("#sGSelectedFormat").val()+"&RawDataOutput=Result",
		    success: function(xml){
			window.open();
			$("#export_dl_link").attr("href",xml);
			$("#export_dl_link").show();
			$('#routingDownloadContainer').attr('href',xml);
		    }
		});*/

	    }
	}
    };

    function loadContextualMenu(){
	$("#mmm_opacity").on("change",function(){
	    var cLayer=$(".tree li").find(".active");
	    var cid=eval("myBaseLayers.length+"+cLayer.attr("id").replace(/layer_/,""));
	    var clayer=getLayerById(eval(cLayer.attr("id").replace(/layer_/,"")));
	    oLayers[clayer]["opacity"]=$(this).val()/100;
	    map.getLayers().item(cid).setOpacity($(this).val()/100);
	});

	$.ajax(msUrl+'?map='+pmapfile+"&service=WMS&request=GetCapabilities").then(function(response) {
	    var parser = new ol.format.WMSCapabilities();
	    var result = parser.read(response);
	    console.log(result);
	    myWMSLayers=result;
	    console.log(myWMSLayers);
	    var j=0;
	    for(var i in pmapfiles){
		var ext=myWMSLayers["Capability"]["Layer"]["Layer"][j]["BoundingBox"][0]["extent"];
		oLayers[i]["extent"]=[
		    ext[1],
		    ext[0],
		    ext[3],
		    ext[2]
		];
		j++;
	    }
	});
	$(".mm-menu").each(function(){
	    console.log($(this));
	    $(this).on('click',function(){
		var cLayer=$(".tree li").find(".active");
		contextualMenu[$(this).attr("id").replace(/mmm_/,"")]["run"](cLayer.attr("id").replace(/layer_/,""));
	    });
	});
    }

    var oldItem;
    function load_menu(){
	$("#header").find(".mm-action").each(function(){
		$(this).on('click',function(){
		    oldItem=$(this).parent().parent().find(".active").attr('id');
		    for(var i in menuItems){
			menuItems[i]["deactivate"]();
			if(!$(this).hasClass("do-not-select")){
			    $("#"+i).parent().removeClass("active");
			}
		    }
		    //oldItem=$(this).attr('id');
		    if(!$(this).hasClass("do-not-select")){
			$(this).parent().addClass("active");
		    }
		    menuItems[$(this).attr('id')]["activate"]();
		});
	});
    }

    /**
     * Currently drawn feature.
     * @type {ol.Feature}
     */
    var sketch;


    /**
     * The help tooltip element.
     * @type {Element}
     */
    var helpTooltipElement;


    /**
     * Overlay to show the help messages.
     * @type {ol.Overlay}
     */
    var helpTooltip;


    /**
     * The measure tooltip element.
     * @type {Element}
     */
    var measureTooltipElement;


    /**
     * Overlay to show the measurement.
     * @type {ol.Overlay}
     */
    var measureTooltip;


    /**
     * Message to show when the user is drawing a polygon.
     * @type {string}
     */
    var continuePolygonMsg = 'Click to continue drawing the polygon';


    /**
     * Message to show when the user is drawing a line.
     * @type {string}
     */
    var continueLineMsg = 'Click to continue drawing the line';
    
    function mmActivateDrawTool(args){
	var isActive=true;
	var toolName=args.name;
	if(!mapInteractions[args.name]){
	    mapInteractions[args.name] = new ol.interaction.Draw({
		source: (args.source?args.source:drawSource),
		type: (args.type?args.type:'Circle'),
		style: (args.style?args.style:new ol.style.Style({
		    fill: new ol.style.Fill({
			color: 'rgba(255, 255, 255, 0.2)'
		    }),
		    stroke: new ol.style.Stroke({
			color: 'rgba(0, 0, 0, 0.5)',
			lineDash: [10, 10],
			width: 2
		    }),
		    image: new ol.style.Circle({
			radius: 5,
			stroke: new ol.style.Stroke({
			    color: 'rgba(0, 0, 0, 0.7)'
			}),
			fill: new ol.style.Fill({
			    color: 'rgba(255, 255, 255, 0.2)'
			})
		    })
		}))
	    });
	    isActive=false;
	}
	desactivateInteractions();
	map.addInteraction(mapInteractions[args.name]);
	if(!isActive){
	    mapInteractions[args.name].on('drawstart',(args.startHandler?args.startHandler:function(evt) {
		if(drawSource.getFeatures().length>0){
		    drawSource.removeFeature(drawSource.getFeatures()[0]);
		}
		// set sketch
		sketch = evt.feature;
	    }));
	    
	    mapInteractions[args.name].on('drawend', args.endHandler);
	}
    }
    

    var urlContext;
    function saveContext(func){
	console.log("SAVE CONTEXT START");
	var ext=ol.proj.transformExtent(map.getView().calculateExtent(map.getSize()),'EPSG:3857','EPSG:4326');
	console.log(ext);
	var params=[{"identifier":"extent", value: ext, dataType: "string"}];
	var layers=map.getLayers();
	console.log(map.getLayers());
	for(var i=0;i<layers.getLength();i++){
	    console.log(i+" "+myBaseLayers.length+" "+oLayers.length);
	    console.log(layers.item(i).getVisible());
	    if(i>myBaseLayers.length && 
	       getLayerById(i-myBaseLayers.length) &&
	       layers.item(i).getVisible()){
		console.log(layers.item(i).getVisible());
		params.push({identifier: "layers",value:getLayerById(i-myBaseLayers.length),dataType: "string"});
	    }
	}
	console.log(params);
	(function(func){
	zoo.execute({
	    identifier: "context.saveContext",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"}
	    ],
	    type: 'POST',
	    storeExecuteResponse: false,
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		func(data);
	    },
	    error: function(data){
		console.log("ERROR");
		console.log(data);
	    }
	})})(func);
    }
    var popupWindow;
    
    function loadSharingWindow(){
	var hauteur=(arguments.length>2?arguments[2]:480);
	var largeur=(arguments.length>3?arguments[3]:480);
	var top=(screen.height-hauteur)/2;
	var left=(screen.width-largeur)/2;
	var options = "menubar=no,scrollbars=yes,statusbar=no,resizable=yes";
	if(popupWindow)
	    popupWindow.close();
	popupWindow=window.open(arguments[1],"_blank");
	popupWindow.focus();
    }



    var menuItems={
	"control": {
	    activate: function(){
		desactivateInteractions();
		activateDefaultInteractions();
	    },
	    deactivate: function(){
	    }
	},
	"zoomin": {
	    activate: function(){
		desactivateInteractions();
		activateDefaultInteractions();
		map.addInteraction(mapInteractions["zoomin"]);
	    },
	    deactivate: function(){
		map.removeInteraction(mapInteractions["zoomin"]);
	    }
	},
	"geolocate": {
	    activate: function(){
		noTracking=true;
		geolocation.setTracking(true);
		//geolocation.setTracking(false);
	    },
	    deactivate: function(){
		geolocation.setTracking(false);
		positionFeature.setGeometry(null);
		accuracyFeature.setGeometry(null);
	    }
	},
	"track": {
	    activate: function(){
		noTracking=false;
		geolocation.setTracking(true);
	    },
	    deactivate: function(){
		geolocation.setTracking(false);
	    }
	},
	"line": {
	    activate: function(){
		launchMeasureTools("line");
	    },
	    deactivate: function(){
		if(drawSource.getFeatures().length>0){
		    drawSource.removeFeature(drawSource.getFeatures()[0]);
		    $(".mtooltip-static").parent().remove();
		}
	    }
	},
	"polygon": {
	    activate: function(){
		launchMeasureTools("area");
	    },
	    deactivate: function(){
		if(drawSource.getFeatures().length>0){
		    drawSource.removeFeature(drawSource.getFeatures()[0]);
		    $(".mtooltip-static").parent().remove();
		}
	    }
	},
	"getFeature": {
	    activate: function(){
		var isActive=true;
		if(!mapInteractions["getFeature"]){
		    mapInteractions["getFeature"] = new ol.interaction.DragBox({
			condition: ol.events.condition.always,
			style: new ol.style.Style({
			    stroke: new ol.style.Stroke({
				color: [0, 0, 255, 1]
			    })
			})
		    });
		    isActive=false;
		}
		desactivateInteractions();
		map.addInteraction(mapInteractions['getFeature']);

		if(!isActive)
		    mapInteractions["getFeature"].on('boxend', function(e) {
			var extent = mapInteractions["getFeature"].getGeometry().getExtent();
			var transformer = ol.proj.getTransform('EPSG:3857','EPSG:4326');
			var ext=ol.extent.applyTransform(extent, transformer);
			for(var i in oLayers){
			    if(oLayers[i]["queryParams"] && oLayers[i]["queryParams"]["fields"]){
				var key=i;
				myMMDataTableObject.display(key,{
				    url: msUrl,
				    data: {
					"map":oLayers[key]["map"],
					version: "1.0.0",
					service: "WFS",
					request: 'GetFeature',
					typename: key,
					bbox: ext
				    }
				},true);
			    }
			}
			console.log(extent);
		    });

	    },
	    deactivate: function(){
		map.removeInteraction(mapInteractions["getFeature"]);
		if(drawSource.getFeatures().length>0){
		    drawSource.removeFeature(drawSource.getFeatures()[0]);
		    $(".mtooltip-static").parent().remove();
		}

	    }
	},
	"getFeatureCircle": {
	    activate: function(){
		mmActivateDrawTool({
		    name: "getFeatureCircle",
		    type: "Circle",
		    endHandler: function(evt) {
			var format1=new ol.format.GML3({featureNS: "gml", curve:false});
			var poly=ol.geom.Polygon.fromCircle(evt.feature.getGeometry());
			var sVal1=format1.writeGeometryNode(poly,{
			    dataProjection: ol.proj.get('EPSG:4326'),
			    featureProjection: ol.proj.get('EPSG:3857')
			});
			var layer;
			for(layer in oLayers){
			    if(oLayers[layer]["queryParams"] && oLayers[layer]["queryParams"]["fields"]){
				myMMDataTableObject.display(layer,{
				    url: msUrl,
				    data: {
					"map":oLayers[layer]["map"],
					version: "1.0.0",
					service: "WFS",
					request: 'GetFeature',
					typename: layer
				    },
				    feature: sVal1
				},true);

			    }

			}
		    }
		});
	    },
	    deactivate: function(){
		map.removeInteraction(mapInteractions["getFeature"]);
		if(drawSource.getFeatures().length>0){
		    drawSource.removeFeature(drawSource.getFeatures()[0]);
		    $(".mtooltip-static").parent().remove();
		}

	    }
	},
	"tshare": {
	    activate: function(){
		saveContext(function(data){
		    console.log("QRCODE RESULT");
		    $("#qrcodeUrl").val(data);
		    var urlTwitter = "http://www.twitter.com/share?url="+data+"&text=We would like to share the following Map : ";
		    loadSharingWindow("Twitter",urlTwitter,480,520);

		});
	    },
	    deactivate: function(){
	    }
	},
	"permalink": {
	    activate: function(){
		console.log("permalink start");
		console.log(oldItem);
		if(!$("#qrcodeTab").length){
		    $("#mmtabs").append($("#permalink_header_template")[0].innerHTML);
		    //Load the template page to display the result
		    $.ajax({
			url: 'modules/sharing/default',
			method: 'GET',
			success: function(){
			    console.log(arguments);
			    $("#mmtabs").next().prepend($('<div role="tabpanel" class="tab-pane" id="qrcodeTab"></div>'));
			    $("#qrcodeTab").append(arguments[0]);
			    $("#qrcodeAction").tab('show');
			    $("#qrcodeTab").bind("removeClass",function(){
				console.log(arguments);
				$("#qrcodeAction").parent().remove();
				$(this).remove();
			    });
			}
		    });
		}
		else
		    $("#qrcodeAction").tab('show');
		saveContext(function(data){
		    console.log("QRCODE RESULT");
		    $("#qrcodeUrl").val(data);
		    zoo.execute({
			identifier: "QREncode",
			dataInputs: [
			    {"identifier":"Text","value": data,"dataType": "string"}
			],
			dataOutputs: [
			    {"identifier":"QR","mimeType": "image/png","asReference":"true"}
			],
			type: 'POST',
			storeExecuteResponse: false,
			success: function(data){
			    console.log("SUCCESS");
			    console.log(data);
			    console.log(data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"]);
			    console.log($("#qrcodeImg"));
			    var d=new Date();
			    $("#qrcodeClock").html(d.getHours()+": "+d.getMinutes()+": "+d.getSeconds());
			    $("#qrcodeImg").attr("src",data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"]);
			},
			error: function(data){
			    console.log("ERROR");
			    console.log(data);
			}
		    });
		});
	    },
	    deactivate: function(){
	    }
	},
	"fshare": {
	    activate: function(){
		console.log("fshare start");
		console.log(oldItem);

		saveContext(function(data){
		    console.log("QRCODE RESULT");
		    $("#qrcodeUrl").val(data);
		    var originUrl=data;
		    zoo.execute({
			identifier: "QREncode",
			dataInputs: [
			    {"identifier":"Text","value": data,"dataType": "string"}
			],
			dataOutputs: [
			    {"identifier":"QR","mimeType": "image/png","asReference":"true"}
			],
			type: 'POST',
			storeExecuteResponse: false,
			success: function(data){
			    console.log("SUCCESS");
			    console.log(data);
			    console.log(data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"]);
			    console.log($("#qrcodeImg"));
			    var d=new Date();
			    $("#qrcodeClock").html(d.getHours()+": "+d.getMinutes()+": "+d.getSeconds());
			    var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
			    $("#qrcodeImg").attr("src",ref);
			    var urlFB = "http://www.facebook.com/sharer.php?s=100&p[title]=MapMint Sharing&p[url]="+originUrl+"&p[images][0]="+encodeURIComponent(ref);
			    loadSharingWindow("Facebook",urlFB,480,480);
			},
			error: function(data){
			    console.log("ERROR");
			    console.log(data);
			}
		    });
		});
	    },
	    deactivate: function(){
	    }
	},
	"profile_line": {
	    activate: function(){
		mmActivateDrawTool({
		    name: "profile_line",
		    type: "LineString",
		    endHandler: function(evt) {
			var format1=new ol.format.GeoJSON();
			//var poly=ol.geom.Polygon.fromCircle(evt.feature.getGeometry());
			var lgeom=evt.feature.getGeometry().clone();
			console.log(lgeom.getCoordinates());
			var coords=lgeom.getCoordinates();
			for(i in coords)
			    coords[i]=coords[i].reverse();
			var sVal1=format1.writeGeometry(evt.feature.getGeometry(),{
			    dataProjection: ol.proj.get('EPSG:4326'),
			    featureProjection: ol.proj.get('EPSG:3857')
			});
			console.log(lgeom.getCoordinates());
			console.log(sVal1);
			var layer;
			for(layer in oLayers){
			    console.log(oLayers[layer]["query"]+" "+oLayers[layer]["type"]=="raster");
			    console.log(oLayers[layer]["query"] && oLayers[layer]["type"]=="raster");
			    if(oLayers[layer]["query"] && oLayers[layer]["type"]=="raster"){
				window["raster_query_"+layer]=function(){
				    return sVal1;
				}
				window["raster_query_level1_"+layer]=function(){
				    var tmp=zoo.getRequest({
					identifier: "template.display",
					dataInputs: [
					    {"identifier":"tmpl","value":"public/project_js","dataType":"string"},
					    {"identifier":"layer","value":layer,"dataType":"string"},
					    {
						"identifier":"geometry",
						"mimeType":"application/json",
						"value": sVal1
					    }
					],
					dataOutputs: [
					    {"identifier":"Result","type":"raw"}
					],
					type: 'POST',
					storeExecuteResponse: false
				    });
				    return tmp.data;
				}
				window["raster_query_level2_"+layer]=function(){
				    var tmp=zoo.getRequest({
					identifier: "raster-tools.GdalExtractProfile",
					dataInputs: [
					    {"identifier":"RasterFile","value":oLayers[layer]["rQuery"],"dataType":"string"},
					    {
						"identifier":"Geometry",
						"mimeType":"application/json",
						headers: [
						    { key: "Content-Type", value: "text/xml"},
						    { key: "Cookie", value: _MMID}
						],
						href: zoo.url,
						method: "POST",
						"complexPayload_callback":"raster_query_level1_"+layer
					    }
					],
					dataOutputs: [
					    {"identifier":"Profile","type":"raw"}
					],
					type: 'POST',
					storeExecuteResponse: false
				    });
				    return tmp.data;
				}
				zoo.execute({
				    identifier: "template.display",
				    dataInputs: [
					{"identifier":"tmpl","value":"public/project_inv_js","dataType":"string"},
					{"identifier":"layer","value":layer,"dataType":"string"},
					{
					    "identifier":"geometry",
					    "mimeType":"application/json",
					    "href": zoo.url,
					    "method": "POST",
					    "headers": [
						{ key: "Content-Type", value: "text/xml"},
						{ key: "Cookie", value: _MMID}
					    ],
					    "complexPayload_callback":"raster_query_level2_"+layer}
				    ],
				    dataOutputs: [
					{"identifier":"Result","type":"raw"}
				    ],
				    type: 'POST',
				    storeExecuteResponse: false,
				    success: function(data){
					console.log("SUCCESS");
					console.log(data);
					var values=[];
					var sspoints=[];
					for(i in data.coordinates){
					    values.push(data.coordinates[i][2]);
					    sspoints.push([data.coordinates[i][0],data.coordinates[i][1]]);
					}
					
					for(var i in {"container":0,"header":0})
					    $("#mmm_table-wrapper-"+i).find(".active").each(function(){
						$(this).removeClass("active");
					    });

					if(!$('#mmm_table-content-display_'+layer).length){
					    $("#mmm_table-wrapper-header").append('<li role="presentation" class="active"><a id="mmm_table-content-display_'+layer+'" title="'+oLayers[layer]["alias"]+'" data-toggle="tab" data-target="#output-profile-'+layer+'" href="#output-profile-'+layer+'"><i class="fa fa-area-chart"></i><b class="ncaret"> </b><span class="hidden-xs hidden-sm">'+oLayers[layer]["alias"]+'</span> </a>  </li>');
					}else
					    $('#output-profile-'+layer).remove();

					$("#mmm_table-wrapper-container").append('<div class="output-profile tab-pane active" id="output-profile-'+layer+'" style="height: '+($(window).height()/3)+'px;"></div>');

					$('#mmm_table-content-display_'+layer).tab("show");
					if(!$("#table-wrapper").hasClass("in"))
					    $("#table-wrapper").collapse("show");
					var chart = new Highcharts.Chart({
					    chart: {
						zoomType: 'x',
						renderTo: 'output-profile-'+layer
					    },
					    title: {
						text: "Elevation profile"
					    },
					    xAxis: {
						labels: {
						    formatter: function(){
							var tmp=this.value+"";
							return tmp;
						    }
						},
						title: { text: 'Points' },
						maxZoom: 0
					    },
					    yAxis: {
						//max: mmax*2,
						title: { text: null },
						startOnTick: false,
						showFirstLabel: false
					    },
					    legend: {
						enabled: false
					    },
					    plotOptions: {
						area: {
						    cursor: 'pointer',
						    point: {
							events: {
							    click: function() {
								selectLayer.getSource().clear();
								var lgeom=new ol.geom.Point([sspoints[this.x][0],sspoints[this.x][1]]);
								lgeom=lgeom.transform('EPSG:4326','EPSG:3857');
								selectLayer.getSource().addFeature(new ol.Feature({
								    geometry: lgeom
								}));
							    }
							}
						    },
						    fillColor: {
							linearGradient: [0, 0, 0, 300],
							stops: [
							    [0, '#74B042'],
							    [1, 'rgba(255,255,255,0)']
							]
						    },
						    lineWidth: 1,
						    marker: {
							enabled: false,
							states: {
							    hover: {
								enabled: true,
								radius: 3
							    }
							}
						    },
						    shadow: false,
						    states: {
							hover: {
							    lineWidth: 1
							}
						    }
						}
					    },
					    tooltip: {
						formatter: function() {
						    selectLayer.getSource().clear();
						    var lgeom=new ol.geom.Point([sspoints[this.x][0],sspoints[this.x][1]]);
						    lgeom=lgeom.transform('EPSG:4326','EPSG:3857');
						    selectLayer.getSource().addFeature(new ol.Feature({
							geometry: lgeom
						    }));
						    return '<h1>Altitude: '+Highcharts.numberFormat(this.y, 0)+"</h1>";
						}
					    },
					    series: [{
						name: 'Elevation',
						type: 'area',
						data: values
					    }]
					});
					
				    },
				    error: function(data){
					console.log("ERROR");
					console.log(data);
				    }
				});

			    }
			}
		    }
		});
	    },
	    deactivate: function(){
		map.removeInteraction(mapInteractions["getFeature"]);
		if(drawSource.getFeatures().length>0){
		    drawSource.removeFeature(drawSource.getFeatures()[0]);
		    $(".mtooltip-static").parent().remove();
		}

	    }
	},
	"favorite": {
	    activate: function(){
		zoo.execute({
		    identifier: "np.setFavoriteMap",
		    dataInputs: [],
		    dataOutputs: [{"identifier":"Result","type":"raw"}],
		    type: 'POST',
		    storeExecuteResponse: false,
		    success: function(data) {
			$("#favorite").find("i").each(function(){
			    if($(this).hasClass("fa-star"))
				$(this).addClass("fa-star-o").removeClass("fa-star");
			    else
				$(this).addClass("fa-star").removeClass("fa-star-o");
			});
			console.log("SUCCESS");
			console.log(data);
		    },
		    error: function(data) {
			console.log("SUCCESS");
			console.log(data);
		    }
		});
		
	    },
	    deactivate: function(){
	    }
	},
	"print": {
	    activate: function(){
		if(!$("#mmprintTab").length){
		    $("#mmtabs").append($("#printtab_header_template")[0].innerHTML);
		    $("#mmtabs").next().prepend($('<div role="tabpanel" class="tab-pane" id="mmprintTab"></div>'));
		    $("#mmprintTab").append($("#printtab_template")[0].innerHTML);
		}
		$("#mmprintAction").tab('show');
		$("#mmprintTab").bind("removeClass",function(){
		    console.log(arguments);
		    $("#mmprintAction").parent().remove();
		    $(this).remove();
		});
		$("#iFormat").change(function(){
		    updatePrintDisplay();
		});
		tmpExt1=getPrintComputeExtent();
		printLayer=new ol.layer.Vector({
		    source: new ol.source.Vector()
		});
		var my2BS=[];
		for(i in myBaseLayers)
		    if(map.getLayers().item(i).getVisible())
			my2BS.push(map.getLayers().item(i));
		my2BS.push(printLayer);
		pmap=new ol.Map({
		    target: $("#print-map")[0],
		    controls: [],
		    layers: my2BS,
		    interactions: ol.interaction.defaults({
			altShiftDragRotate: true,
			dragPan: false,
			rotate: true
		    }).extend([new ol.interaction.DragPan({kinetic: null})]),//ol.interaction.defaults({shiftDragZoom: false}) ,
		    view: new ol.View({
			extent: tmpExt1,
			center: [0, 0],
			zoom: 2
		    })
		});
		printLayer.getSource().clear();
		printLayer.getSource().addFeature(new ol.Feature({geometry: ol.geom.Polygon.fromExtent(tmpExt1)}));
		pmap.getView().fit(map.getView().calculateExtent(map.getSize()),pmap.getSize());
		//$('#iFormat').selectpicker();

		if(!printHasLoaded){
		    map.getView().on('change:center', function() {
			updatePrintDisplay();
		    });
		    map.getView().on('change:resolution', function() {
			updatePrintDisplay();
		    });
		    printHasLoaded=true;
		}
	    },
	    deactivate: function(){
		$("#pmap").children().remove();
	    }
	},
    };

    
    var printHasLoaded=false;
    function updatePrintDisplay(){
	if(!$("#mmprintTab").length)
	    return;
	var tmpExt1=getPrintComputeExtent();
	printLayer.getSource().clear();
	printLayer.getSource().addFeature(new ol.Feature({geometry: ol.geom.Polygon.fromExtent(tmpExt1)}));
	pmap.getView().fit(map.getView().calculateExtent(map.getSize()),pmap.getSize());
    }

    var coeff=1;
    var mmPrintSizes={
	"A4l": [(1024*coeff),(768*coeff)],
	"A4": [(768*coeff),(1024*coeff)]
    }

    function getPrintComputeExtent(){
	var ext=map.getView().calculateExtent(map.getSize());
	bufferSize=1;//600*(map.getResolution());
	
	var tmpExt=ext;
	width=mmPrintSizes[$('#iFormat').val()][0];
	cwidth=tmpExt[2]-tmpExt[0];
	wdelta=cwidth/width
	
	height=mmPrintSizes[$('#iFormat').val()][1];
	cheight=tmpExt[3]-tmpExt[1];
	hdelta=cheight/height;
	
	delta=parseFloat(width)/parseFloat(height);
	
	Wd=(mmPrintSizes[$('#iFormat').val()][0]*map.getView().getResolution())/2;
	Hd=(mmPrintSizes[$('#iFormat').val()][1]*map.getView().getResolution())/2;
	
	x0=(tmpExt[0]+((tmpExt[2]-tmpExt[0])/2));
	y0=(tmpExt[3]+((tmpExt[1]-tmpExt[3])/2))
	
	return [x0-Wd,y0-Hd,x0+Wd,y0+Hd];
	
    }

    function desactivateInteractions(){
	for(var i in mapInteractions){
	    console.log(i);
	    map.removeInteraction(mapInteractions[i]);
	}
    }
    function activateDefaultInteractions(){
	for(var i in mapInteractions){
	    if(i=="default")
		map.addInteraction(mapInteractions[i]);
	}
    }

    function launchMeasureTools(typeSelect){
	var type = (typeSelect == 'area' ? 'Polygon' : 'LineString');
	var isActive=true;
	if(!mapInteractions["line"]){
	    mapInteractions["line"] = new ol.interaction.Draw({
		    source: drawSource,
		    type: 'LineString',
		    style: new ol.style.Style({
			fill: new ol.style.Fill({
			    color: 'rgba(255, 255, 255, 0.2)'
			}),
			stroke: new ol.style.Stroke({
			    color: 'rgba(0, 0, 0, 0.5)',
			    lineDash: [10, 10],
			    width: 2
			}),
			image: new ol.style.Circle({
			    radius: 5,
			    stroke: new ol.style.Stroke({
				color: 'rgba(0, 0, 0, 0.7)'
			    }),
			    fill: new ol.style.Fill({
				color: 'rgba(255, 255, 255, 0.2)'
			    })
			})
		    })
	    });
	    mapInteractions["area"] = new ol.interaction.Draw({
		source: drawSource,
		type: 'Polygon',
		style: new ol.style.Style({
		    fill: new ol.style.Fill({
			color: 'rgba(255, 255, 255, 0.2)'
		    }),
		    stroke: new ol.style.Stroke({
			color: 'rgba(0, 0, 0, 0.5)',
			lineDash: [10, 10],
			width: 2
		    }),
		    image: new ol.style.Circle({
			radius: 5,
			stroke: new ol.style.Stroke({
			    color: 'rgba(0, 0, 0, 0.7)'
			}),
			fill: new ol.style.Fill({
				color: 'rgba(255, 255, 255, 0.2)'
			})
		    })
		})
	    });
	    isActive=false;
	}
	desactivateInteractions();
	map.addInteraction(mapInteractions[typeSelect]);

	createMeasureTooltip();
	createHelpTooltip();
	
	var listener;
	if(!isActive) {
	    for(var i in {"line":0,"area":0}){
		mapInteractions[i].on('drawstart',
				      function(evt) {
					  if(drawSource.getFeatures().length>0){
					      drawSource.removeFeature(drawSource.getFeatures()[0]);
					      $(".mtooltip-static").parent().remove();
					  }
					  // set sketch
					  sketch = evt.feature;
					  
					  /** @type {ol.Coordinate|undefined} */
					  var tooltipCoord = evt.coordinate;
					  
					  listener = sketch.getGeometry().on('change', function(evt) {
					      var geom = evt.target;
					      var output;
					      if (geom instanceof ol.geom.Polygon) {
						  output = formatArea(/** @type {ol.geom.Polygon} */ (geom));
						  tooltipCoord = geom.getInteriorPoint().getCoordinates();
					      } else if (geom instanceof ol.geom.LineString) {
						  output = formatLength( /** @type {ol.geom.LineString} */ (geom));
						  tooltipCoord = geom.getLastCoordinate();
					      }
					      measureTooltipElement.innerHTML = output;
					      measureTooltip.setPosition(tooltipCoord);
					  });
				      }, this);
		
		mapInteractions[i].on('drawend',
				      function(evt) {
					  measureTooltipElement.className = 'mtooltip mtooltip-static';
					  measureTooltip.setOffset([0, -7]);
					  // unset sketch
					  sketch = null;
					  // unset tooltip so that a new one can be created
					  measureTooltipElement = null;
					  createMeasureTooltip();
					  ol.Observable.unByKey(listener);
				      }, this);
	    }
	}
    }

    /**
     * Creates a new help tooltip
     */
    function createHelpTooltip() {
	if (helpTooltipElement) {
	    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
	}
	helpTooltipElement = document.createElement('div');
	helpTooltipElement.className = 'mtooltip ';
	helpTooltip = new ol.Overlay({
	    element: helpTooltipElement,
	    offset: [15, 0],
	    positioning: 'center-left'
	});
	map.addOverlay(helpTooltip);
    }


    /**
     * Creates a new measure tooltip
     */
    function createMeasureTooltip() {
	if (measureTooltipElement) {
	    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
	}
	measureTooltipElement = document.createElement('div');
	measureTooltipElement.className = 'mtooltip mtooltip-measure';
	measureTooltip = new ol.Overlay({
	    element: measureTooltipElement,
	    offset: [0, -15],
	    positioning: 'bottom-center'
	});
	map.addOverlay(measureTooltip);
    }

    /**
     * format length output
     * @param {ol.geom.LineString} line
     * @return {string}
     */
    var formatLength = function(line) {
	var length;
	{
	    var coordinates = line.getCoordinates();
	    length = 0;
	    var sourceProj = map.getView().getProjection();
	    for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
		var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
		var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
		length += wgs84Sphere.haversineDistance(c1, c2);
	    }
	} 
	var output;
	if (length > 100) {
	    output = (Math.round(length / 1000 * 100) / 100) +
		' ' + 'km';
	} else {
	    output = (Math.round(length * 100) / 100) +
		' ' + 'm';
	}
	console.log(output);
	return output;
    };


    /**
     * format length output
     * @param {ol.geom.Polygon} polygon
     * @return {string}
     */
    var formatArea = function(polygon) {
	var area;
	{
	    var sourceProj = map.getView().getProjection();
	    var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
		sourceProj, 'EPSG:4326'));
	    var coordinates = geom.getLinearRing(0).getCoordinates();
	    area = Math.abs(wgs84Sphere.geodesicArea(coordinates));
	}
	var output;
	if (area > 10000) {
	    output = (Math.round(area / 1000000 * 100) / 100) +
		' ' + 'km<sup>2</sup>';
	} else {
	    output = (Math.round(area * 100) / 100) +
		' ' + 'm<sup>2</sup>';
	}
	console.log(output);
	return output;
    };
    
    // recenters the view by putting the given coordinates at 3/4 from the top or
    // the screen
    function getCenterWithHeading(position, rotation, resolution) {
	var size = map.getSize();
	var height = size[1];

	return [
	    position[0] - Math.sin(rotation) * height * resolution * 1 / 4,
	    position[1] + Math.cos(rotation) * height * resolution * 1 / 4
	];
    }

    var System={};
    System.lTemplates={};
    System.lTemplates0={};
    System.loadTemplates={};
    function fetchlTemplate(features){
	$.ajax({
	    type: "GET",
	    url: templatesUrl+features.get("layerName")+"_"+mapProject+"_tmpl.html",
	    complete: function(xml,status) {
		var res=xml.responseText.replace(/item name/g,"");
		var layer=features.get("layerName");
		System.lTemplates[layer]=res;
		System.loadTemplates[layer]=false;
		try{
		    printlTemplate(features);
		}catch(e){
		    for(var j=0;j<features.length;j++){
			{
			    printlTemplate(features[j]);
			}
		    }
		}	
	    }
	});
    }

    function printlTemplate(feature){
	if(!feature){
	    return;
	}
	var j=0;
	var layer=feature.get("layerName");
	if(!System.lTemplates0[layer])
	    System.lTemplates0[layer]=System.lTemplates[layer];
	var res1=System.lTemplates[layer];
	var tmp="";
	var data=feature.getProperties();
	for(j in data){
	    if(j!="msGeometry"){
		var reg=new RegExp("\\[=&quot;"+j+"&quot;\\]","g");	
		res1=res1.replace(reg,feature.get(j));
		var reg=new RegExp("\\[="+j+"\\]","g");
		res1=res1.replace(reg,feature.get(j));
	    }
	}
	System.onPrintlTemplate(feature,res1);
    }
    
    function tryRun(feature){
	if(!System.lTemplates0[layerName])
	    fetchlTemplate(feature);
	else
	    printlTemplate(feature);
    }
    

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

    function getLayerById(cid){
	var clayer=null;
	var j=0;
	for(i in oLayers){
	    if(j==cid){
		clayer=i;
		return clayer;
	    }
	    j++;
	}
	return clayer;
    }

    var printDocument = function() {
	console.log("run print");
	$("#print-loader").show();
	var realExt=getPrintComputeExtent();
	var tmpExt0=[realExt[0],realExt[1],realExt[2],realExt[3]];
	var tmpExt=[realExt[0],realExt[3],realExt[2],realExt[1]];
	var d=new Date();
	$("#print-loader-info").html($("#printtab_loading_bg_template")[0].innerHTML);
	zoo.execute({
	    identifier: "raster-tools.translate",
	    dataInputs: [
		{"identifier":"InputDSN","value":"base_layers/default.xml","dataType":"string"},
		{"identifier":"OutputDSN","value":"tmp_"+_MMID.replace(/MMID=/g,""),"dataType":"string"},
		{"identifier":"Format","value":"GTiff","dataType":"string"},
		{"identifier":"OutSize","value":mmPrintSizes[$('#iFormat').val()],"dataType":"string"},
		{"identifier":"ProjWin","value":tmpExt,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    type: 'POST',
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$("#print-loader-info").html($("#printtab_loading_print_template")[0].innerHTML);
		var activatedLayers=[];
		for(var i=myBaseLayers.length;i<map.getLayers().getLength()-myToolsLayers.length;i++){
		    if(map.getLayers().item(i).getVisible())
			activatedLayers.push(i-myBaseLayers.length);
		}
		zoo.execute({
		    identifier: "print.printMap",
		    dataInputs: [
			{"identifier":"layers","value":activatedLayers,"dataType":"string"},
			{"identifier":"ext","value":tmpExt0,"dataType":"string"},
			{"identifier":"iFormat","value":$('#iFormat').val(),"dataType":"string"},
			{"identifier":"tDoc","value":"MM-PrintedMap.pdf","dataType":"string"},
			{"identifier":"map","value":lastMap,"dataType":"string"},
			{"identifier":"bgMap","value":data,"dataType":"string"},
			{"identifier":"zoom","value":map.getView().getZoom(),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","asReference":"true"},
		    ],
		    type: 'POST',
		    success: function(data){
			console.log("SUCCESS");
			console.log(data);
			console.log(data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"]);
			$("#print-loader-info").html($("#printtab_loading_print_success_template")[0].innerHTML);
			$("#printtab_res_link").attr("href",data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"]);
			printPreview(data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"].toString());
		    },
		    error: function(data){
			console.log("ERROR");
			console.log(data);
			$("#print-loader-info").html($("#printtab_loading_print_error_template")[0].innerHTML);
			$("#print-error-details").html(data["ExceptionReport"]["Exception"]["ExceptionText"].toString());
			
		    }
		});
	    },
	    error: function(data){
		console.log("ERRROR");
		console.log(data);
	    }
	});

    }

    function authenticateSetup(){
	$("#authenticate_setup").click(function(){
	    $("#mmtabs").append($("#auth_header_template")[0].innerHTML);
	    //Load the template page to display the result
	    $.ajax({
		url: 'modules/auth/login',
		method: 'GET',
		success: function(){
		    console.log(arguments);
		    $("#mmtabs").next().prepend($('<div role="tabpanel" class="tab-pane" id="authTab"></div>'));
		    $("#authTab").append(arguments[0]);
		    $("#authAction").tab('show');
		    $("#authTab").bind("removeClass",function(){
			console.log(arguments);
			$("#authAction").parent().remove();
			$(this).remove();
		    });
		}
	    })
	});
    }

    function printPreview(){
	var reg=new RegExp(tmpUrl,"g");
	zoo.execute({
	    identifier: "print.preview",
	    dataInputs: [
		{"identifier":"res","value":"32","dataType":"integer"},
		{"identifier":"file","value":arguments[0].replace(reg,tmpPath),"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","asReference":"true"},
	    ],
	    type: 'POST',
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		var tmp=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"].toString();
		$("#print-preview-img").attr("src",tmp);
	    },
	    error: function(data){
		console.log("ERROR");
		console.log(data);
	    }		    
	});
    }
    // Return public methods
    return {
        initialize: initialize,
	printDocument: printDocument,
	cgalProcessing: cgalProcessing
    };



});

