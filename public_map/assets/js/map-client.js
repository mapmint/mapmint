/**
 * Author : Gérald FENOY
 *
 * Copyright 2009-2017 GeoLabs SARL. All rights reserved.
 *
 * This work was supported by a grant from the European Union's 7th Framework 
* Programme (2007-2013) provided for the project PublicaMundi (GA no. 609608).
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
// Filename: map-client.js


define([
    'module', 'jquery', 'zoo', 'xml2json', 'ol', 'mmDataTables','typeahead',"managerTools"
], function(module, $, Zoo, X2JS,ol,MMDataTable,typeahead,managerTools) {

    (function(){
	var methods = ['addClass', 'removeClass'];
	
	$.each(methods, function (index, method) {
	    var originalMethod = $.fn[method];
	    
	    $.fn[method] = function () {
		var oldClass = this.attr("class");
		var result = originalMethod.apply(this, arguments);
		var newClass = this.attr("class");
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
    var flagStyles;
    var addedLayers=[];
    var previousLayers=[];
    var tiletoload={};
    var searchValues,searchExtents;
    var externalCallbacks={};
    var elevationProfiles=[];
    var shouldDisplayTabsForToggle=false;
    var positionFeature;
    
    function notify(text, type) {
        mynotify.notify({
            message: { text: text },
            type: type,
        }).show();
    }

    function setTreeHeight(){
	console.log("************ Tree view height !!!!!!");
	console.log($(window).height()- $('.navbar-header').height() - (2*$('.nav-tabs').height()) - $('#mmcdts').height() - 30);
	var theight= $(window).height() - ((3*$('.navbar-header').height()) + $('#mmcdts').height() + 35);
	$('.baselayers,.tree-container,.info-container,.sources-container').height(theight);
    }

    function setMapHeight(){
	if(!shouldDisplayTabsForToggle){
	    var mpheight= $(window).height() - $('.navbar-header').height() - ($('#table-wrapper').hasClass('in') && !shouldDisplayTabsForToggle?$('#table-wrapper').height():0);
	    $('#map').height(mpheight);
	}	    
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

    function bindSearchEngine(){
	$("nav").find(".search-panel").find(".dropdown-menu").find("a").each(function(){
	    $(this).click(function(e){
		if($(this).find("i.fa-check").length)
		    return;
		else{
		    var closure=$(this);
		    var tmpHTML=$("nav").find(".search-panel").find(".dropdown-menu").find("a").find("i.fa-check")[0].outerHTML;
		    $("nav").find(".search-panel").find(".dropdown-menu").find("a").find("i.fa-check").remove();
		    $(this).prepend(tmpHTML+" ");
		    $("nav").find("[role=search]").find('button').last().addClass("disabled");
		    startSearchEngine();
		}
	    });
	});
	startSearchEngine();
    }

    function displayFeatureInfo(evt,layer,localFunction){
	var wmsSource = new ol.source.TileWMS({
	    url: msUrl+"?map="+oLayers[layer]["searchMap"].replace(/_click/g,""),
	    params: {'LAYERS': layer},
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
	    localFunction(res);
	    //console.log(res);
	    //var coords = ol.coordinate.toStringXY(ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326'),2);
	    /*if(res.length>1)
		popup.show(evt.coordinate, '<div>' + res
			   +'</div>');
	    else
		popup.hide();*/
	});
    }

    var featuresCnt=0;
    function printFeatureInfo(gfLayer){
	return function(res){
	    if(res.length>1){
		featuresCnt+=1;
		if($(".window.active").length){
		    if(!$(".window.active").find("h4").first().find("select").length){
			var tmpTxt=$(".window.active").find("h4").first().text();
			$(".window.active").find("h4").first().html("<select><option value='"+(featuresCnt)+"'>"+tmpTxt+"</option></select>");
		    }
		    $(".window.active").find("h4").first().find("select").append("<option value='"+(featuresCnt+1)+"'>"+oLayers[gfLayer].alias+"</option>")
		    $(".window.active").find(".window-body").first().append("<div class='featureInfo' id='featureInfo_"+(featuresCnt+1)+"'><p>"+res.replace(/script1/g,"script")+"</p></div>");
		    $(".window.active").find("h4").first().find("select").off("change");
		    $(".window.active").find("h4").first().find("select").on("change",function(){
			$(".window.active").find(".featureInfo").hide();
			$(".window.active").find("#featureInfo_"+$(this).val()).show();
		    });
		   $(".window.active").find("h4").first().find("select").change();
		}else{
		    wm.createWindow({
			title: oLayers[gfLayer].alias,
			bodyContent: "<div class='featureInfo' id='featureInfo_"+(featuresCnt+1)+"'><p>"+res.replace(/script1/g,"script")+"</p></div>",
			footerContent: '',
			top: "79px"
		    });
		    $(".window.active").css({"width":"90%","top":"79px","left":"5%"});
		}
	    }else{
		if(hasAddedFeature){
		    selectLayer.getSource().clear();
		    hasAddedFeature=false;
		}
	    }
	}
    }
    
    function startSearchEngine(){
	$("nav").find(".search-panel").find(".dropdown-menu").find("a").each(function(){
	    if($(this).find("i.fa-check").length){
		//window.setTimeout(function () { 
		var substringMatcher = function(strs) {
		    return function findMatches(q, cb) {
			var matches, substringRegex;
			
			// an array that will be populated with substring matches
			matches = [];
			
			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');
			
			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
			    if (substrRegex.test(str)) {
				matches.push(str);
			    }
			});
			
			if(matches.length==0)
			    $.each(strs, function(i, str) {
				matches.push(str);
			    });
			
			cb(matches);
		    };
		};
		console.log($(this));
		var url=msUrl+"?map="+mapPath+"/search_"+mapProject+"_"+$(this).attr("data-name")+".map&version=1.1.0&service=WFS&request=GetFeature&typename="+$(this).attr("data-name")+"&propertyname=msGeometry,"+$(this).attr("data-field");
		var cfield=$(this).attr("data-field");
		$("nav").find("input[name=search_value]").val("Loading, please wait ...");
		$("nav").find("input[name=search_value]").attr("disabled",true);
		console.log(url);
		    $.ajax({
			url: url,
			method: 'GET',
			success: function(){
			    console.log(arguments);

			    var formatWFS = new ol.format.WFS(),
				features=formatWFS.readFeatures(arguments[0],{
				    dataProjection: ol.proj.get('EPSG:4326'),
				    featureProjection: ol.proj.get('EPSG:3857')
				});
			    
			    searchValues=[];
			    searchExtents=[];
			    for(var i=0;i<features.length;i++){
				if(cfield.indexOf(",")<0){ 
				    searchValues.push(features[i].get(cfield));
				    //console.log(features[i].get(cfield));
				    if(features[i].getGeometry()){
					searchExtents.push(features[i].getGeometry().getExtent());
				    }
				    else
					console.log(features[i]);
				}else{
				    var kk=cfield.split(",");
				    for(var jj=0;jj<kk.length;jj++)
					if(kk[jj]!=""){
					    searchValues.push(features[i].get(kk[jj]));
					    if(features[i].getGeometry()){
						searchExtents.push(features[i].getGeometry().getExtent());
					    }
					    else
						console.log(features[i]);
					}
				}
				
			    }
				
			    try{
				$("nav").find("input[name=search_value]").typeahead("destroy");
			    }catch(e){
				console.log(e);
			    }
                            $("nav").find("input[name=search_value]").attr("disabled",false);
			    $("nav").find("input[name=search_value]").typeahead(null, {
				name: 'countries',
				limit: 50,
				source: substringMatcher(searchValues),
				itemSelected: function(e){ 
				    console.log("UPDATER CALLED");
				    console.log(e);
				}
			    }).on("typeahead:selected", function(obj, datum, name) {
				$("nav").find("[role=search]").find('button').last().removeClass("disabled");
				$("nav").find("[role=search]").find('button').last().off('click');
				$("nav").find("[role=search]").find('button').last().click(function(){
				    map.getView().fit(searchExtents[searchValues.indexOf(datum)],map.getSize());				    
				});
			    });
			    $("nav").find("input[name=search_value]").val("");
                            $("nav").find("input[name=search_value]").prev().attr("disabled",false);
                            $("nav").find("input[name=search_value]").prev().css({"background-color":"#fff"});
			}
		    });
		    $('#scrollable-dropdown-menu .typeahead').click(function(){
			$(this).val("");
			$('#srsAdd').addClass("disabled");
		    });
		//}, 100);
		
	    }
	});
    }

    var myBaseLayersUrls=[];
    var myBaseLayerNames=[];

    function updateBSImages(){
	mmZoom=map.getView().getZoom();
	mmCenter=ol.proj.transform(map.getView().getCenter(),"EPSG:3857","EPSG:4326");
	var layers=map.getLayers();
	console.log(myBaseLayerNames);
	for(var l=0;l<myBaseLayers.length;l++){
	    console.log(l);
	    console.log(myBaseLayerNames[l]);
	    try{
		loadBaseLayerIcon(myBaseLayerNames[l],layers.item(l));
	    }catch(e){
		try{
		    loadBaseLayerIcon(myBaseLayerNames[l],layers.item(l).getLayers().item(1));
		}catch(e){
		    try{
			console.log(myBaseLayerNames[l].split("|")[0].replace(/ /g,"__"));
			console.log(layers.item(l));
			loadBaseLayerIcon(myBaseLayerNames[l].split("|")[0].replace(/ /g,"__"),layers.item(l));
		    }catch(e){
			console.log("Unable to display baselayer background image see http://mapmint.com/faq/BaseLayerDisplay");
		    }
		}
	    }
	}
    }

    function loadBaseLayerIcon(key,layer){
	var obj;
	var tmp;
	if(myBaseLayerNames.indexOf(key)<0){
	    console.log(key);
	    myBaseLayerNames.push(key);
	}
	
	var obj=layer.getSource().getTileGrid().getTileCoordForCoordAndZ(ol.proj.transform(mmCenter,"EPSG:4326","EPSG:3857"),Math.round(mmZoom));
	var tmp=layer.getSource().getTileUrlFunction()(obj,1.325,ol.proj.get("EPSG:3857"));
	var res=tmp.split('\n')[0];
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
			source:
			new ol.source.OSM({url:
					   (baseLayers["mq"][i]==osm?"//maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png":
					   "//{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png")
					  }),//new ol.source.MapQuest({layer: baseLayers["mq"][i]})
		    });
		    url=loadBaseLayerIcon(baseLayers["mq"][i],osm);
		    console.log("OK 0");
		    console.log(url);

		}
		else{
		    console.log(baseLayers["mq"][i]);
		    osm=new ol.layer.Group({
			visible: baseLayers["default"]==myBaseLayers.length?true:false,
			layers: [
			    new ol.layer.Tile({
				source: new ol.source.OSM({url: "//{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"}),
			    }),
			    new ol.layer.Tile({
				source: new ol.source.MapQuest({layer: 'hyb'})
			    })
			]
		    });
		    console.log("OK 1");
		    //url=loadBaseLayerIcon(baseLayers["mq"][i],osm.getLayers().item(1));
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
			    }),
			    "Planet": new ol.Attribution({
				html: '© 2018 Planet Labs Inc. All rights reserved. |'+
				    '<a href="https://planet.com/privacy">Privacy Policy</a> |'+
				    '<a href="https://planet.com/terms-of-use">Terms of Use</a> |'+
				    '<a href="https://planet.com/company/art">Art in Space</a>'
			    })
			};
			var urls= {
			    "ESRI": 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
				baseLayers["proprietary"]["layers"][i]+
				'/MapServer/tile/{z}/{y}/{x}',
			    "MapBox": "https://api.mapbox.com/v4/" + 
				baseLayers["proprietary"]["layers"][i] +
				"/{z}/{x}/{y}.png?access_token="+
				baseLayers["proprietary"]["key"],
			    "Planet": 'https://tiles.planet.com/basemaps/v1/planet-tiles/'+
				baseLayers["proprietary"]["layers"][i] +
				'/gmap/{z}/{x}/{y}.png?api_key='+
				baseLayers["proprietary"]["key"]
			};
			if(baseLayers["proprietary"]["layers"][i].indexOf("|")>0)
			    urls["Planet"]=baseLayers["proprietary"]["layers"][i].split("|")[1];
			layer=(baseLayers["proprietary"]["type"]!="Bing"?
			       new ol.layer.Tile({
				   visible: baseLayers["default"]==myBaseLayers.length?true:false,
				   source: new ol.source.XYZ({
				       attributions: [attributions[baseLayers["proprietary"]["type"]]],
				       url: urls[baseLayers["proprietary"]["type"]]
				   })
			       }):
			       new ol.layer.Tile({
				   visible: baseLayers["default"]==myBaseLayers.length?true:false,
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
			console.log("OK");
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

		    try{
			console.log("OK 0");
			console.log(baseLayers["proprietary"]["layers"][i].replace(/\./g,"_"));
			if(baseLayers["proprietary"]["layers"][i].split("|")<0)
			    try{
				url=loadBaseLayerIcon(baseLayers["proprietary"]["layers"][i].replace(/\./g,"_"),layer);
			    }catch(e){
			    }
			else
			    try{
				url=loadBaseLayerIcon(baseLayers["proprietary"]["layers"][i].split("|")[0].replace(/ /g,"__"),layer);
			    }catch(e){
			    }
			console.log("OK 1");
			console.log(url);
		    }catch(e){
			console.log(e);
		    }

		    myBaseLayers.push(layer);
		    //url=loadBaseLayerIcon(baseLayers["mq"][i],osm.getLayers().item(1));
		}
	    }
	}

	if(baseLayers["wmtsBaseLayers"] && baseLayers["wmtsBaseLayers"].length>0){
	    var wmtsAttrib="";
	    
	    for(i=0;i<baseLayers["wmtsBaseLayers"].length;i++){
		try{

		    console.log(wmtsAttrib);
		    layer=new ol.layer.Tile({
			visible: baseLayers["default"]==myBaseLayers.length?true:false,
			source: new ol.source.XYZ({
			    attributions: [new ol.Attribution({
				html: attributionsWMTS
			    })],
			    url: baseLayers["wmtsBaseLayers"][i].split("|")[1]
			})
		    });
		    
		    console.log("OK 0");
		    console.log(baseLayers["wmtsBaseLayers"][i].replace(/\./g,"_"));
		    try{
			url=loadBaseLayerIcon(baseLayers["wmtsBaseLayers"][i].split("|")[0].replace(/\./g,"_"),layer);
		    }catch(e){
			console.log(e);
		    }
		    console.log("OK 1");
		    console.log(url);
		    myBaseLayers.push(layer);
		}catch(e){
		    console.log(e);
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

	if(baseLayers["myBaseLayers"] && baseLayers["myBaseLayers"].length>=1){
	    for(var j=0;j<baseLayers["myBaseLayers"].length;j++){
		layer=new ol.layer.Tile({
		    visible: false,
		    source: new ol.source.TileWMS({
			url: cacheUrl,
			params: {'LAYERS': baseLayers["myBaseLayers"][j]+"Tile", 'TILED': true},
			serverType: 'mapserver'
		    })
		});
		myBaseLayers.push(layer);
	    }
	}

	baseLayers["myBaseLayers"]
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

    var timelines=[];
    var wm;
    var basic_counter = 0,
        table_counter = 0,
        form_counter = 0,
        parent_counter = 0,
        child_counter = 0;
    var localModules=[];
    
    var initialize = function() {

	var _closure=this;
	window.ol=ol;

	managerTools.initialize(zoo,map,myBaseLayers,module);
	
	console.log('START !');

	wm = new WindowManager({
            container: "#windowPane",
            windowTemplate: $('#basic_window_template').html()
	});
	window.wm = wm;

	try{
	    
	    $.ajax({
		type: "GET",
		url: zooUrl+"?request=Execute&version=1.0.0&service=WPS&Identifier=template.display&DataInputs=tmpl=preview/modules/loader_js&RawDataOutput=Result",
		complete: function(xml,status){
		    try{
			var scriptLocations=JSON.parse(xml.responseText);
			console.log(xml);
			for(var i=0;i<scriptLocations.length;i++)
			    try{
				requirejs([scriptLocations[i]], function(myModule) {
				    // Store the module in the localModules array
				    localModules.push(myModule);
				    // Initialize the module
				    myModule.initialize(zoo,_closure);
				    // Display information message about loading the module
				    console.log(" ** Map-Client module: "+myModule.name+" has been properly loaded");
				});
			    }catch(e){
				console.log(" ** Map-Client module: "+scriptLocations[i]+" failed to load!");
				console.log(e);
				console.log(" ** Map-Client module: "+scriptLocations[i]+" failed to load!");
			    }
		    }catch(e){
			console.log(" ** Map-Client module: not supported");
		    }
		}
	    });
	}catch(e){
	    console.log(" ***** Error dynamic loading of modules: "+e);
	}
	
	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );
	
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
		shouldDisplayTabsForToggle=true;
		if(!$("#resultwrap").length){
		    $('#mmtabs').append('<li id="resultwrap" class="active" role="result" data-toggle="tooltip" data-placement="bottom" title="Result"><a href="#result_container" aria-controls="settings" role="tab" data-toggle="tab"><i class="fa fa-table"></i></a></li>');
		    $('.tab-content').find("#mmcdts").before('<div role="tabpanel" class="tab-pane" id="result_container"></div>');
		}
		$('.nav-tabs li:eq(2) a').tab('show');
		$('.nav-tabs li:eq(0) a').tab('show');
		$('#mapcontainer').children().each(function(){
		    console.log("*** * ID ******",$(this).attr('id'));
		    if($(this).attr('id')!="main")
			$(this).detach().appendTo('#result_container');
		});
		if(shouldDisplayTabsForToggle)
		    $("#table-wrapper").removeClass("fixed-bottom");
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
		shouldDisplayTabsForToggle=false;
		$('.nav-tabs li:eq(0) a').tab('show');
		setTreeHeight();
	    }
	});
	
	
	$("#mm_layers_display").find(".cm").contextmenu({
	    target: "#context-menu"
	});


	try{
	    // Add Layer callback
	$("#addLayer-ui").find('button').first().click(function(){
	    console.log("Add a layer!");
	    var cvalue=-1;
	    var clayers=[];
	    var clabels=[];
	    var cselection="";
	    var listHTML="";
	    $(this).parent().next().find(".active").each(function(){
		console.log($(this));
		cselection=$(this).attr("id");
		$(this).find('.layer').find('input[type=checkbox]').each(function(){
		    if($(this).is(":checked")){
			if($(this).parent().attr("data-layer")){
			    clayers.push($(this).parent().attr("data-layer"));
			    clabels.push($(this).next().text());
			    console.log($(this).parent());
			}
			else
			    clayers.push($(this).attr("id"));
			if(cvalue==-1)
			    cvalue=$(this).val();
			else
			    if(cvalue!=$(this).val())
				cvalue=null;
			listHTML+=$(this).parent()[0].outerHTML;
			console.log($(this));
			$(this).trigger("click");
		    }
		});
	    });
	    
	    console.log(cvalue);
	    console.log(clayers);

	    myStr=clayers.join(",");
	    var cmapfile="";
	    if(cselection=="mm_overlays_wms_display")
		cmapfile=mapPath.replace(/public_maps/,"WMS")+cvalue+"ds_ows.map";
	    else
		cmapfile=mapPath.replace(/public_maps/,"maps")+"/project_Overlays.map";	

	    addLayerToMap({"mapfile":cmapfile,"layers":clayers,"labels":clabels,"listHTML":listHTML,"cselection":cselection});
	    
	});
	}catch(e){
	    console.log(e);
	}
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

	$("#context-menu").bind("removeClass",function(){
	    console.log("context-menu removed");
	    //$("[data-toggle=popover]").popover("hide");
	    //$(".tree li.layer").removeClass("layer-active");
	});
	$("#context-menu").bind("addClass",function(){
	    console.log("context-menu added");
	    //$(".tree li.layer").removeClass("layer-active");
	});

	//$(".tree li.layer").find(".ud").each(function(){
	window.setTimeout(function(){
	    $("#mm_layers_display").find(".ud").each(function(){
		console.log("**** DEBUG LOAD");
		console.log($(this));
		$(this).click();
		console.log($(this));
	    });
	},1000);
	
	$('.cm').bind("contextmenu",function(e){

	    console.log(e);
	    $(".tree li.layer").removeClass("layer-active");
	    console.log($(e.currentTarget).attr("id"));
	    console.log(e.currentTarget);
	    console.log("************* ID : "+$(this).attr("id"));
	    var cid;
	    if($(this).attr("id").indexOf("overlays_")==0){
		cid=eval($(this).attr("id").replace(/overlays_/,""));
		clayer="overlays_"+cid;
	    }
	    else{
		cid=eval($(this).attr("id").replace(/layer_/,""));
		clayer=getLayerById(cid);
	    }
	    $(this).addClass("layer-active");
            console.log(cid);
	    if(extentLayers["layer_extent_"+cid] && extentLayers["layer_extent_"+cid].getVisible()){
		console.log("remove open add close");
              $(".dropdown-menu").find(".glyphicon").removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
            }else{
		console.log("remove close add open");
              $(".dropdown-menu").find(".glyphicon").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
            }
	    console.log($(this));
	    console.log(oLayers[clayer]);
	    console.log(oLayers[clayer]["query"]);
	    var myRootLocation=$("#context-menu");
	    myRootLocation.find("#mmm_legend").parent().addClass("hidden");
	    $(this).find("i").each(function(){
		if($(this).data("href"))
		    myRootLocation.find("#mmm_legend").parent().removeClass("hidden");
	    });
	    for(i in {"export":0,"query":0,"zoomTo":0}){
		if(!oLayers[clayer][i])
		    myRootLocation.find("#mmm_"+i).parent().addClass("hidden");
		else
		    myRootLocation.find("#mmm_"+i).parent().removeClass("hidden");
		if(i=="zoomTo")
		    myRootLocation.find("#mmm_"+i).parent().removeClass("hidden");
	    }

	    myRootLocation.find("#mmm_opacity").off("input");
	    myRootLocation.find("#mmm_opacity").on("input",function(){
		myRootLocation.find("#mmm_range").val($(this).val()+"%");
		var cLayer=$(".tree").find(".layer-active");
		if(!cLayer.attr("id"))
		    cLayer=$(this).parent().parent().parent().parent().parent();
		if(cLayer.attr("id").indexOf("overlays_")==0){
		    var cid=parseInt(cLayer.attr("id").replace(/overlays_/,""));
		    addedLayers[cid].setOpacity($(this).val()/100);
		}
		else{
		    var cid=eval("myBaseLayers.length+"+getLayerIdById(cLayer.attr("id").replace(/layer_/,"").split("_")[0]));
		    var clayer=getLayerById(eval(cLayer.attr("id").replace(/layer_/,"")));
		    oLayers[clayer]["opacity"]=$(this).val()/100;
		    map.getLayers().item(cid).setOpacity($(this).val()/100);
		}
	    });


	    myRootLocation.find("#mmm_opacity").val(oLayers[clayer]["opacity"]*100);
	    myRootLocation.find("#mmm_range").val(Math.round(oLayers[clayer]["opacity"]*100).toFixed(0)+"%");

	    $('body, #context-menu > ul > li > a').on('click', function (e) {console.log("CLICK !! ");$(".tree").find(".layer-active").removeClass('layer-active');});
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
	    }),
	    loadTilesWhileAnimating: true
	});

	managerTools.defineMap(map);
	
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
	    if(oLayers[layerName].maps)
		timelines.push(layerName);
	    else
		if(externalCallbacks["loadLayer"])
		    externalCallbacks["loadLayer"](layerName);

	    if(oLayers[layerName].display=="raster"){
		console.log(oLayers[layerName]);
		var lmapfile=pmapfile;
		if(oLayers[layerName].maps)
		    lmapfile=oLayers[layerName].map;
		var layer;
		if(layerName.indexOf("grid_")===-1){
		    console.log(oLayers[layerName]);
		    if(!oLayers[layerName].labels){
			if(oLayers[layerName].dataType=="point"){
			    layer=new ol.layer.Tile({
				visible: oLayers[layerName]["activated"],
				source: new ol.source.XYZ({
				    url: msUrl+"?map="+lmapfile+"&layers="+layerName+"&mode=tile&tilemode=gmap&tile={x}+{y}+{z}"
				})
			    });
			    oLayers[layerName].real_name=layerName;
			}
			else
			    layer=new ol.layer.Tile({
				visible: oLayers[layerName]["activated"],
				source: new ol.source.TileWMS({
				    url: msUrl+"?map="+lmapfile,
				    params: {'LAYERS': layerName, 'TILED': true},
				    serverType: 'mapserver'
				})
			    });
		    }
		    else{
			layer=new ol.layer.Group({
			    visible: oLayers[layerName]["activated"],
			    layers: [
				new ol.layer.Tile({
				    source: new ol.source.TileWMS({
					url: msUrl+"?map="+lmapfile,
					params: {'LAYERS': layerName, 'TILED': true},
					serverType: 'mapserver'
				    })
				}),
				/*new ol.layer.Image({
				    source: new ol.source.ImageWMS({
					ratio: 1,
					url: module.config().msUrl+"?map="+layerLabels[name],
					params: {'LAYERS': "Result","format":"image/png"},
					serverType: ('mapserver')
				    })
				})*/
				new ol.layer.Tile({
				    source: new ol.source.TileWMS({
					url: msUrl+"?map="+oLayers[layerName].labels,
					params: {'LAYERS': "Result", 'TILED': true},
					serverType: 'mapserver'
				    })
				})
			    ]
			});
		    }

		}
		else{
		    layer=new ol.layer.Image({
			visible: oLayers[layerName]["activated"],
			source: new ol.source.ImageWMS({
			    ratio: 1,
			    url: msUrl+"?map="+lmapfile,
			    params: {'LAYERS': layerName,"format":"image/png"},
			    serverType: ('mapserver')
			})
		    });
		}
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
					//console.log(tmp0["Graphic"]["Mark"]["WellKnownName"]);
				    
					if(tmp0!="" && tmp0["Graphic"]["Mark"]["WellKnownName"]!=""){

					    console.log(tmp0["Graphic"]["Mark"]["WellKnownName"]);

					    var lobj={};
					    if(tmp0["Graphic"]["Size"])
						lobj["radius"]=eval(tmp0["Graphic"]["Size"].toString());
					    if(tmp0["Graphic"]["Mark"]["Fill"])
						lobj["fill"]=new ol.style.Fill({
						    color: tmp0["Graphic"]["Mark"]["Fill"]["CssParameter"].toString(),
						    opacity: 0.6
						});
					    if(tmp0["Graphic"]["Mark"]["Stroke"])
						lobj["stroke"]=new ol.style.Stroke({
						    color: tmp0["Graphic"]["Mark"]["Stroke"]["CssParameter"].toString(),
						    opacity: 0.4
						});
					    style=new ol.style.Style({
						image: new ol.style.Circle(lobj)
					    });
					    
					}else{
					    style=new ol.style.Style({
                                                image: new ol.style.Icon({
                                                    src: msUrl+"?map="+oLayers[this.localID].legend[0]+"&SERVICE=WMS&&version=1.0.0&request=Getmap&LAYERS="+this.localID+"&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=-0.2,-0.2,6.2,6.2&SRS=EPSG:4326&WIDTH="+(oLayers[this.localID].size*2)+"&HEIGHT="+(oLayers[this.localID].size*2)+"&mmtime1514554115.25&timestamp=1514554145466",
                                                })
                                            });
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

			if(oLayers[this.localID].dataType=="point"){
			    var clusterSource = new ol.source.Cluster({
				distance: 40,
				source: sourceVector
			    });
			    
			    if(styles[cnt]!=null)
				layerVector = new ol.layer.Vector({
				    visible: true,
				    style: style,
				    source: clusterSource
				});
			    else
				layerVector = new ol.layer.Vector({
				    visible: true,
				    source: clusterSource
				});
			}else{
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
			}
			
			cnt++;
			console.log(this.localID);
			
			$.ajax(msUrl+"?map="+oLayers[this.localID].map,{
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
			if(oLayers[this.localID]["activated"]!="true"){
                            layerVector.setVisible(false);
                        }
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


	$("#mm_layers_display").find('input[type="checkbox"]').each(function(){
	    console.log($(this).parent());
	    $(this).change(function(){
		//console.log($(this));
		if($(this).parent()[0]["id"].replace(/layer_/g,"")){
		    console.log($(this).parent()[0]["id"].replace(/layer_/g,""));
		    //console.log(map.getLayers());
		    console.log($(this).is(":checked"));
		    var cid=getLayerIdById(parseInt($(this).parent()[0]["id"].replace(/layer_/g,"")))+myBaseLayers.length;
		    //var tmp=eval(cid+"+(myBaseLayers.length>0?1:0)");
		    //console.log(tmp);
		    console.log(map.getLayers());
		    map.getLayers().item(cid).setVisible($(this).is(":checked"));
		    console.log(cid);
		    console.log(getLayerById(parseInt($(this).parent()[0]["id"].replace(/layer_/g,""))));
		    oLayers[getLayerById(parseInt($(this).parent()[0]["id"].replace(/layer_/g,"")))]["activated"]=$(this).is(":checked");
		    if($(this).parent().find(".carousel").length){
			if($(this).is(":checked"))
			    $(this).parent().find(".carousel").carousel("cycle");
			else
			    $(this).parent().find(".carousel").carousel("pause");
		    }
		}
		else{
		    var isChecked=$(this).is(":checked");
		    $(this).parent().find(".cm").each(function(){
			$(this).find("input[type='checkbox']").prop("checked",isChecked).change();
			/*console.log(myBaseLayers.length);
			console.log($(this)[0]["id"]);
			var tmp=eval($(this)[0]["id"].replace(/layer_/g,"")+'+myBaseLayers.length');
			console.log(tmp);
			console.log($(this).find("input").is(":checked"));
			map.getLayers().item(tmp).setVisible(($(this).find("input").is(":checked")));
			
			console.log($(this)[0]["id"]);*/
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

	var popup = [new ol.Overlay.Popup(),new ol.Overlay.Popup()];
	for(var i=0;i<popup.length;i++)
	    map.addOverlay(popup[i]);
        
	map.on('singleclick', function (evt) {
	    var selectedLayers=[];
	    console.log("CLICK !");
	    var feature = map.forEachFeatureAtPixel(evt.pixel,function (feature, layer) {
		if(layer){
		    console.log("CLICK !"+layer.get("name"));
		    console.log(oLayers[layer.get("name")]);
		    if(layer.get("name") && oLayers[layer.get("name")].click){
			console.log("CLICK !"+layer.get("name"));
			feature.set("layerName",layer.get("name"));
			selectedLayers.push(layer.get("name"));
		    }
		}
		return feature;
	    });
	    if(feature)
		console.log(feature.get("layerName"));
	    if (feature && feature.get("layerName")) {
		console.log("CLICK ! "+oLayers[feature.get("layerName")]["dataType"]);
		var geometry = feature.getGeometry();
		var coord = geometry.getCoordinates();
		if($(".window.active").length)
		    $(".window.active").remove();
		if(oLayers[feature.get("layerName")]["dataType"]=="point"){
		    (function(){
			System.onPrintlTemplate=function(feature,html){
			    console.log("*************** createWindow!");
			    wm.createWindow({
				title: oLayers[feature.get("layerName")].alias,
				bodyContent: "<p>"+html+"</p>",
				footerContent: ''
			    });
			    $(".window.active").css({"width":"90%","top":"79px","left":"5%"});
			}
			tryRun(feature,true);
		    })();
		    return;
		}else{
		    displayFeatureInfo(evt,feature.get("layerName"),function(res){
			$(".window.active").remove();
			if(res.length>1){
			    wm.createWindow({
				title: oLayers[feature.get("layerName")].alias,
				bodyContent: "<p>"+res.replace(/script1/g,"script")+"</p>",
				footerContent: '',
				top: "79px"
			    });
			    $(".window.active").css({"width":"90%","top":"79px","left":"5%"});
			}else{
			    if(hasAddedFeature){
				selectLayer.getSource().clear();
				hasAddedFeature=false;
			    }
			}
			    
		    });
		    /*
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
			wm.createWindow({
			    title: oLayers[feature.get("layerName")].alias,
			    bodyContent: "<p>"+res+"</p>",
			    footerContent: '',
			    top: "79px"
			});

		    });
		    console.log(url);
		    */
		}
	    } else {
		console.log("popup 1 hide !");
		
		popup[1].hide();
	    }
	    var gfLayer="";
	    featuresCnt=0;
	    $(".window.active").remove();
	    for(var i in oLayers){
		if(selectedLayers.indexOf(i)==-1 && oLayers[i]["click"] && oLayers[i]["activated"]){
		    console.log(oLayers[i]["searchMap"]);
		    gfLayer=i;
		    if(gfLayer!=""){
			var closure=gfLayer;
			displayFeatureInfo(evt,gfLayer,printFeatureInfo(closure));
			featuresCnt+=1;
		    }
		}
	    }
	});
	map.on('pointermove', function(evt) {
	    var selectedLayers=[];
	    var feature = map.forEachFeatureAtPixel(evt.pixel,function (feature, layer) {
		if(layer){
		    if(layer.get("name") && oLayers[layer.get("name")].over){
			feature.set("layerName",layer.get("name"));
			selectedLayers.push(layer.get("name"));
		    }
		}
		return feature;
	    });
	    console.log("pointermove");
	    console.log(evt);
	    console.log("pointermove");
	    
	    if (feature && feature.get("layerName")) {
		var geometry = feature.getGeometry();
		var coord = geometry.getCoordinates();
		console.log("popup position !");
		popup[1].setPosition(coord);
		
		if(oLayers[feature.get("layerName")]["dataType"]=="point"){
		    (function(){
			System.onPrintlTemplate=function(feature,html){
			    //var coords = ol.coordinate.toStringXY(ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326'),2);
			    var coords=evt.coordinate;
			    console.log("coords");
			    console.log(coords);
			    console.log("coords");
			    popup[1].show(evt.coordinate, '<div>' + html
					  +'</div>');
			}
			tryRun(feature);
		    })();
		}else{
		    /*var wmsSource = new ol.source.TileWMS({
			url: msUrl+"?map="+oLayers[feature.get("layerName")]["searchMap"].replace(/_click/g,""),
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
			    popup[1].show(evt.coordinate, '<div>' + res
					  +'</div>');
		    });*/
		    displayFeatureInfo(evt,feature.get("layerName"),function(res){
			if(res.length>1)
			    popup[1].show(evt.coordinate, '<div>' + res
				       +'</div>');
			else{
			    console.log("popup hide!");
			    popup[1].hide();
			}
		    });
		    console.log(url);
		}
	    }/* else {
		console.log("popup hide!");
		popup[1].hide();
	    }*/
	    var gfLayer="";
	    for(var i in oLayers)
		if(selectedLayers.indexOf(i)==-1 && oLayers[i]["over"] && oLayers[i]["activated"]){
		    console.log(oLayers[i]["search"]);
		    gfLayer=i;
		}
	    if(gfLayer!=""){
		displayFeatureInfo(evt,gfLayer,function(res){
		    if(res.length>1)
			popup[1].show(evt.coordinate, '<div>' + res
				      +'</div>');
		    else
			popup[1].hide();
		});
	    }

	});

	mapInteractions["default"]=new ol.interaction.Select({
	    style: function(feature, resolution) {
		//console.log(feature.getStyle());
		return [new ol.style.Style({
		    image: new ol.style.Circle({
			radius: 15,
			fill: new ol.style.Fill({
			    color: 'rgba(255,0,0,0.05)'
			    }),
			    stroke: new ol.style.Stroke({
				color: 'rgba(255,255,255,0.4)',
				width: 2
			    }),
			    text: new ol.style.Text({
				text: "Selected Feature",
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
	    visible: true,
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

	vstyles=[new ol.style.Style({
	    image: new ol.style.Icon({
		anchorOrigin: 'top-left',
		anchor: [0.25, 0.95],
		//anchor: [0, 0],
		//size: [24, 24],
		scale: 1/5,
		opacity: 1,
		anchorXUnits: 'fraction',
		anchorYUnits: 'fraction',
		src: "assets/fonts/f024.svg"
            })
	})];

	flagStyles=[];
	var colors=["000","ab0e0e","e09b6c"];
	var svgs={"f024":0,"f11e":0};
	for(a in svgs)
	    for(var i=0;i<colors.length;i++)
		flagStyles.push(new ol.style.Style({
		    image: new ol.style.Icon({
			anchorOrigin: 'top-left',
			anchor: [0.25, 0.95],
			//anchor: [0, 0],
			//size: [24, 24],
			scale: 1/5,
			opacity: 1,
			anchorXUnits: 'fraction',
			anchorYUnits: 'fraction',
			src: "modules/routing/flag.svg;color="+colors[i]+";svg="+a
		    })
		}));
	vstyles=[new ol.style.Style({
	    image: new ol.style.Icon({
		anchorOrigin: 'top-left',
		anchor: [0.25, 0.95],
		//anchor: [0, 0],
		//size: [24, 24],
		scale: 1/5,
		opacity: 1,
		anchorXUnits: 'fraction',
		anchorYUnits: 'fraction',
		src: "modules/routing/flag.svg;color=000"
            })
	})];

	vstylesSelected=[new ol.style.Style({
	    image: new ol.style.Icon({
		anchorOrigin: 'top-left',
		anchor: [0.25, 0.95],
		//anchor: [0, 0],
		//size: [24, 24],
		scale: 1/5,
		opacity: 1,
		anchorXUnits: 'fraction',
		anchorYUnits: 'fraction',
		src: "modules/routing/flag.svg;color=ab0e0e"
            })
	})];

	/*vstyles=[new ol.style.Style({
	    image: new ol.style.RegularShape({
		fill: new ol.style.Fill({color: "#FF0000"}),
		stroke: new ol.style.Stroke({color: "#FF0000",width: 2}),
		points: 4,
		radius: 10,
		radius2: 0,
		angle: 0
	    })
	})];

	vstylesSelected=[new ol.style.Style({
	    image: new ol.style.RegularShape({
		fill: new ol.style.Fill({color: "#FF0000"}),
		stroke: new ol.style.Stroke({color: "#FF0000",width: 2}),
		points: 4,
		radius: 10,
		radius2: 0,
		angle: 0
	    })
	})];*/

	features0 = new ol.Collection();
	featureOverlay0 = new ol.layer.Vector({
	    source: new ol.source.Vector({features: features0}),
	    style: vstyles
	});
	featureOverlay0.setMap(map);
	myToolsLayers.push(featureOverlay0);

	featureOverlay0.getSource().on("addfeature",function(e){
	    var len=featureOverlay0.getSource().getFeatures().length;
	    var index=-1;
	    var cindex=0;
	    for(var i=0;i<len;i++){
		if(!featureOverlay0.getSource().getFeatures()[i].get("fid")){
		    console.log(vectorLayerId);
		    featureOverlay0.getSource().getFeatures()[i].set("fid","vectorLayer_"+vectorLayerId)
		    console.log(featureOverlay0.getSource().getFeatures()[i].get("fid"));
		    index=vectorLayerId+1;
		}else{
		    var index=parseInt(featureOverlay0.getSource().getFeatures()[i].get("fid").replace(/vectorLayer_/g,""))+1;
		}
		//if(index
		if(index>0 && index<3)
		    featureOverlay0.getSource().getFeatures()[i].setStyle([flagStyles[(index-1)*3]]);
		else
		    featureOverlay0.getSource().getFeatures()[i].setStyle([flagStyles[2]]);
	    }
	});

	myMMDataTableObject = new MMDataTable({"selectLayer": selectLayer, "zook": zoo, "modules": localModules});
	if(shouldDisplayTabsForToggle){
	    myMMDataTableObject.height=$(window).height()-570;
	}
	loadContextualMenu();
	load_menu();
	$('[data-toggle="remove"]').on('click',function(e){
	    e.preventDefault();
	    console.log("data-toggle");
	    console.log("* DEBUG DJAY !!!!!!!");
	    console.log("* DEBUG DJAY !!!!!!!");
	    //console.log($("#mmm_table-wrapper-container").find(".active").get("id"));
	    $("#mmm_table-wrapper-container").find(".active").remove();
	    $("#mmm_table-wrapper-header").find(".active").remove();
	    if($("#mmm_table-wrapper-header").find("li a").length>1)
		$($("#mmm_table-wrapper-header").find("li a")[1]).tab('show');
	    else{
		$("#table-wrapper").collapse("hide");
		if(!shouldDisplayTabsForToggle){
		    setMapHeight();
		    map.updateSize();
		}else
		    $("#mapwrap").find("a").first().click();
	    }
	});

	$("[data-toggle=zoomToElement]").on('click',function(){
	    console.log(map.getSize());
	    var size=map.getSize();
	    var tmp=selectLayer.getSource().getExtent();
	    // Add y difference in south direction to take into account the bottom table layout 
	    tmp[1]=tmp[1]-(tmp[3]-tmp[1]);
	    //map.getView().fit(tmp,map.getSize());
	    map.getView().fit(selectLayer.getSource().getExtent(),{size: map.getSize()});
	});

	bindSearchEngine();


	for(var i in oLayers){
	    if(oLayers[i].maps){
		timelines.push(i);
		(function(i){
		    var myLayer=oLayers[i];/*
		    var objs=[
			$('#layer_'+myLayer.index+'_carousel').find('img'),
			$('#layer_'+myLayer.index+'_carousel').find('.carousel-inner')
		    ];
		    for(var i=0;i<objs.length;i++)*/
		    $('#layer_'+myLayer.index+'_carousel').find('img').css({"min-height":($('#layer_'+myLayer.index+'_carousel').find('.list-group').height()+(2*$('nav').height()))+"px"});
		    $('#layer_'+myLayer.index+'_carousel').find('.carousel-inner').css({"min-height":($('#layer_'+myLayer.index+'_carousel').find('.list-group').height()+(2*$('nav').height()))+"px"});

		    $('.carousel').carousel({
			interval: 5000
		    });
		    /*map.getLayers().item(myBaseLayers.length+myLayer.index).on("loadend",function(){
			console.log(arguments);
		    });*/
		    $('#layer_'+myLayer.rindex+'_carousel').on('slid.bs.carousel', function () {
			//console.log(myBaseLayers.length+myLayer.index);
			//console.log(myLayer.index);
			//console.log(myLayer.rindex);
			//console.log(map.getLayers().item(myBaseLayers.length+myLayer.index).getVisible())
			//console.log($(this).find('div.active'));
			if(map.getLayers().item(myBaseLayers.length+myLayer.index).getVisible() && $(this).find('div.active').attr("id")){
			    //console.log($(this));
			    var reg0=new RegExp("layer_"+myLayer.rindex+"_step","g");
			    //console.log($(this).find('div.active'));
			    var cid=parseInt($(this).find('div.active').attr("id").replace(reg0,""));
			    //console.log(cid);
			    //$(this).carousel('pause');
			    //console.log(myLayer.maps[cid]);
			    if(myLayer.layers && myLayer.layers[cid]){
				if(cid-1>=0 && previousLayers.length==0){
				    /*
				      previousLayers.push(new ol.layer.Tile({
				      visible: true,
				      source: new ol.source.TileWMS({
				      url: msUrl+"?map="+myLayer.maps[cid],
				      params: {'LAYERS': myLayer.layers[cid], 'TILED': true},
				      serverType: 'mapserver'
				      })
				      }));*/
				    //console.log(map.getLayers().item(myLayer.index+(myBaseLayers.length)));
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().updateParams({"LAYERS":myLayer.layers[cid]});
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().setUrl(msUrl+"?map="+myLayer.maps[cid]);
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().changed();
				    //console.log(myBaseLayers.length+myLayer.index);
				    //map.addLayer(previousLayers[0]);
				    console.log("Add layer");
				}else{
				    if(cid==0 && previousLayers.length>0){
					//map.removeLayer(previousLayers[0]);
					//previousLayers=[];
				    }
				    if(cid-1>=0){
					//previousLayers[previousLayers.length-1].setVisible(true);
					/*previousLayers[0].getSource().updateParams({"LAYERS":myLayer.layers[cid-1]});
					previousLayers[0].getSource().setUrl(msUrl+"?map="+myLayer.maps[cid-1]);
					previousLayers[0].getSource().changed();
					//map.getLayers().item(myBaseLayers.length+myLayer.index).getSource().updateParams({"LAYERS":myLayer.layers[cid]});
					$("#mm_layers_display").find(".layer_"+myLayer.index).addClass("hide");
					$("#mm_layers_display").find(".layer_"+myLayer.index+".step"+cid).removeClass("hide");
					map.getLayers().item(myBaseLayers.length+myLayer.index).getSource().setUrl(msUrl+"?map="+myLayer.maps[cid-1]);*/
				    }/*else{*/
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().updateParams({"LAYERS":myLayer.layers[cid]});
					/*map.getLayers().item(myBaseLayers.length+myLayer.index).getSource().updateParams({"LAYERS":myLayer.layers[cid]});
					$("#mm_layers_display").find(".layer_"+myLayer.index).addClass("hide");
					$("#mm_layers_display").find(".layer_"+myLayer.index+".step"+cid).removeClass("hide");
					map.getLayers().item(myBaseLayers.length+myLayer.index).getSource().setUrl(msUrl+"?map="+myLayer.maps[cid]);*/
				    //}
				    tiletoload["l"+cid]=0;
				    if(cid>0){
					map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().unByKey(tiletoload["key0"+(cid-1)]);
					map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().unByKey(tiletoload["key1"+(cid-1)]);
				    }
				    /*tiletoload["key0"+cid]=map.getLayers().item(myBaseLayers.length+myLayer.index).getSource().on("tileloadstart", function() {
					if(!tiletoload["l"+cid])
					    tiletoload["l"+cid]=0;
					tiletoload["l"+cid]+=1;
				    });
				    tiletoload["key1"+cid]=map.getLayers().item(myBaseLayers.length+myLayer.index).getSource().on("tileloadend", function() {
					tiletoload["l"+cid]-=1;
					//previousLayers.pop(0);
					console.log("Still to load "+tiletoload["l"+cid]);
					if(tiletoload["l"+cid]==0){
					    if(cid-1>=0){
						previousLayers[0].getSource().updateParams({"LAYERS":myLayer.layers[cid]});
						previousLayers[0].getSource().setUrl(msUrl+"?map="+myLayer.maps[cid]);
						previousLayers[0].getSource().changed();
					    }
					    /*else
					      previousLayers[previousLayers.length-1].setVisible(false);*
					}
				    },map.getLayers().item(myBaseLayers.length+myLayer.index).getSource());*/
				    //console.log(myLayer.index);
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().changed();
				    //console.log("Reset layer");
				}
				var lreg=new RegExp($(this).find('.active').prev().find('.carousel-caption').find('h4').html(),"g");
				try{
				    $(this).parent().parent().find('label').first().html($(this).parent().parent().find('label').html().replace(/Raster Timeline/g,$(this).find('.active').find('.carousel-caption').find('h4').html()).replace(lreg,$(this).find('.active').find('.carousel-caption').find('h4').html()));
				}catch(e){
				}
				//$(this).find(".carousel-inner").hide();
			    }
			    //else{
				//console.log(myBaseLayers.length)
				//console.log(myLayer.index);
			    $("#mm_layers_display").find(".layer_"+myLayer.index).addClass("hide");
			    $("#mm_layers_display").find(".layer_"+myLayer.index+".step"+cid).removeClass("hide");
			    //console.log(myBaseLayers.length+myLayer.index);
			    //console.log(myLayer);
			    try{
				map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().updateParams({"LAYERS":myLayer.layers[cid]});
				map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().setUrl(msUrl+"?map="+myLayer.maps[cid]);
			    }catch(e){
				try{
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().updateParams({"LAYERS": i});
				    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().setUrl(msUrl+"?map="+myLayer.maps[cid]);
				}catch(e){
					//console.log(e);
				    try{
					//console.log(msUrl+"?map="+myLayer.maps[cid]+"&layers="+"toto"+"&mode=tile&tilemode=gmap&tile={x}+{y}+{z}");
					map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().setUrl(msUrl+"?map="+myLayer.maps[cid]+"&layers="+myLayer.real_name+"&mode=tile&tilemode=gmap&tile={x}+{y}+{z}");
					map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().clear();
				    }catch(e){
					//console.log(e);
				    }
				}
			    }
			    map.getLayers().item(myLayer.index+(myBaseLayers.length)).getSource().changed();
			    //}
			    map.updateSize();
			}
		    });
		})(i);
	    }
	}

	map.getView().on('propertychange', function(e) {
	    switch (e.key) {
	    case 'resolution':
		console.log("#################################");
		console.log(e.oldValue);
		console.log(e);
		break;
	    }
	});

	console.log(" *****_________***** CHECK ENDLOADING *****_________*****");
	if(externalCallbacks["endLoading"])
	    externalCallbacks["endLoading"]();

    }

    var myMMDataTableObject;
    var tableDisplay=0;
    var stylerTemplate=null;
    var extentLayers={};
    
    var contextualMenu={
	"legend": {
	    "run": function(layer,element,event){
		console.log(layer,element,event);
		if(!$("#mmlegendTab").length){
		    $("#mmtabs").append($("#legendtab_header_template")[0].innerHTML);
		    $("#mmtabs").next().prepend($('<div role="tabpanel" class="tab-pane" id="mmlegendTab"></div>'));
		    if(stylerTemplate==null){
			zoo.execute({
			    identifier: "template.display",
			    dataInputs: [
				{
				    "identifier":"tmpl",
				    "value": "preview/modules/style/pannel",
				    "dataType": "string",
				}
			    ],
			    dataOutputs: [
				{"identifier":"Result","mimeType":"text/html","type":"raw"}
			    ],
			    type: 'POST',
			    storeExecuteResponse: false,
			    success: function(data){
				stylerTemplate=data;
				$("#mmlegendTab").append(data);
				/*var params=[
				    {"identifier":"prefix","value":"indexes","dataType":"string"},
				    {"identifier":"name","value":"Index"+localId,"dataType":"string"},
				    {"identifier":"orig","value":module.config().db,"dataType":"string"},
				    {"identifier":"id","value":localId,"dataType":"string"}
				];*/
				//console.log(params);
				var currentId=eval(layer.replace(/overlays_/g,""));
				managerTools.callCreateLegend(addedLayers[currentId]["map"],addedLayers[currentId]["lname"],null,null,function(data){
				    console.log(data);
				    try{
					$("#mm_layer_property_style_display").css({"height":(($(window).height()/2)+($(window).height()/4))+"px","overflow":"auto"});
					console.log(layer);
					$("#mm_layer_property_style_display").find("label").first().append('<input id="save-map" value="'+addedLayers[currentId]["map"]+'" type="hidden" />');
					$("#mm_layer_property_style_display").find("label").first().append('<input id="save-layer" value="'+layer+'" type="hidden" />');
					managerTools.loadStyleDisplay(data,[],null);
					//bindClassifier(ldata);
					//fetchIndexTableAndDisplay(data);
					//fetchIndicatorInfo(data);
				    }catch(e){
					console.log(e);
				    }
				    console.log(data);
				});
				
			    },
			    error: function(data){
				
			    }
			});
		    }else {
			$("#mmlegendTab").append(stylerTemplate);
			managerTools.callCreateLegend(addedLayers[currentId]["map"],addedLayers[currentId]["lname"],null,null,function(data){
			    console.log(data);
			    try{
				managerTools.loadStyleDisplay(data,[],null);
				bindClassifier(ldata);
				fetchIndexTableAndDisplay(data);
				//fetchIndicatorInfo(data);
			    }catch(e){
				console.log(e);
			    }
			    console.log(data);
			});
		    }
			//
		}
		$("#mmlegendAction").tab('show');

		return;
		var key=getLayerById(layer);
		console.log("OK "+key+" - "+layer);
		console.log(oLayers[key]);
		console.log($(this));
		$("#layer_"+layer).find('i').each(function(){
		    if($(this).data("href")){
			
			element.data("content",'<a href="'+$(this).data("href")+'" target="_blank"><div style="height:25px;width: 100px;overflow: none;background: url(\''+$(this).data("href")+'\') ;"></div></a>');
			if(!oLayers[key]["popover"]){
			    element.popover();
			    element.popover("show");
			    oLayers[key]["popover"]=true;
			}
			console.log(element.data("content"));
			console.log($(this).data("href"));
			event.stopPropagation();
		    }	
		});
		/*var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
		var extent=ol.extent.applyTransform(oLayers[key]["extent"], transformer);
		map.getView().fit(extent,map.getSize());*/
	    }
	},
	"zoomTo": {
	    "run": function(layer){
		var key=getLayerById(layer);
		if(key==null)
		    key=layer;
		var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
		try{
		    var extent=ol.extent.applyTransform(oLayers[key]["extent"], transformer);
		    map.getView().fit(extent,map.getSize());
		}catch(e){
		    console.log(layer);
		    console.log(Object.keys(oLayers).length);
		    var extent=ol.extent.applyTransform(addedLayers[key-Object.keys(oLayers).length]["extent"], transformer);
		    map.getView().fit(extent,map.getSize());
		}
	    }
	},
	"showExtent": {
	    "run": function(layer){
		var key=getLayerById(layer);
		if(key==null)
		    key=layer;
		var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
		try{
		    console.log(layer);
		    console.log($("#mmm_showExtent"));
		    var extent=ol.extent.applyTransform(oLayers[key]["extent"], transformer);
		    //if($("#mmm_showExtent").find(".glyphicon").hasClass("glyphicon-eye-open")){
		    console.log(extentLayers["layer_extent_"+layer]);
		    if(!extentLayers["layer_extent_"+layer]){
		      var feature = new ol.Feature({
                        geometry: new ol.geom.Polygon.fromExtent(extent)
                      });
		      console.log(oLayers[key]["extent"]);
		      var extentLayer=new ol.layer.Vector({
		        source: new ol.source.Vector({
		          features: [feature]
		        })
		      });
		      extentLayers["layer_extent_"+layer]=extentLayer;
		      map.addLayer(extentLayers["layer_extent_"+layer]);
		    }else
		      extentLayers["layer_extent_"+layer].setVisible(!extentLayers["layer_extent_"+layer].getVisible());
 console.log(extentLayers["layer_extent_"+layer]);
		    //$("#mmm_showExtent").find(".glyphicon").removeClass('glyphicon-eye-open').addClass('glyphicon-eye-close');
		   /* }else{
		      extentLayers["layer_extent_"+layer].setVisible(false);
		      $("#mmm_showExtent").find(".glyphicon").removeClass('glyphicon-eye-close').addClass('glyphicon-eye-open');
		    }*/
		    map.getView().fit(extent,map.getSize());
		}catch(e){
		    console.log(e);
		    console.log(layer);
		    console.log(Object.keys(oLayers).length);
		    console.log(Object.keys(oLayers).length);
		    var extent=ol.extent.applyTransform(addedLayers[key-Object.keys(oLayers).length]["extent"], transformer);
		    map.getView().fit(extent,map.getSize());
		}
	    }
	},
	"query": {
	    "run": function(layer){

		var key=getLayerById(layer);
		console.log(oLayers[key]);
		console.log(oLayers[key]);
		if(shouldDisplayTabsForToggle)
		    $('#mmtabs').find("li").last().find("a").tab('show');

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

			    
			    $("#mmm_table-wrapper-container").append('<div class="output-profile tab-pane active" id="output-histogram-'+key+'" style="height: '+(!shouldDisplayTabsForToggle?$(window).height()/3:$(window).height())+'px;"></div>');
			    
			    if(!$('#mmm_table-content-display_'+layer).length){
				$("#mmm_table-wrapper-header").append('<li role="presentation" class="active"><a id="mmm_table-content-display_'+key+'" title="'+oLayers[key]["alias"]+'" data-toggle="tab" data-target="#output-histogram-'+key+'" href="#output-histogram-'+layer+'"><i class="fa fa-area-chart"></i><b class="ncaret"> </b><span class="hidden-xs hidden-sm">'+oLayers[key]["alias"]+'</span> </a>  </li>');
			    }else
				$('#output-histogram-'+key).remove();

			    if(!$("#table-wrapper").hasClass("in"))
				$("#table-wrapper").collapse("show");

			    $('#mmm_table-content-display_'+key).tab("show");
			    $('.print-map-form-element').show();


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
		else{
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
		    $('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
			$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
		    } );
		    /*window.setTimeout(function(){
			setMapHeight();
			map.updateSize();
		    },1000);*/
		}
	    }
	},
	"export": {
	    "run": function(layer){
		var key=getLayerById(layer);

                var cId=0;
                var correctId=$("#context-menu.open").find("[data-id='sGSelectedFormat']").next().find("li.selected").data("original-index");
                $("#context-menu.open").find("select").first().find("option").each(function(){
                        if(cId==correctId)
                                $(this).prop("selected",true);
                        else
                                $(this).prop("selected",false);
                        cId++;
                });
		
		zoo.execute({
		    identifier: "vector-converter.exportTo",
		    type: "GET",
		    dataInputs: [
			{"identifier":"map","value":(key!=null?lastMap:addedLayers[layer-Object.keys(oLayers).length]["map"]),"dataType":"string"},
			{"identifier":"layer","value":(key!=null?layer:addedLayers[layer-Object.keys(oLayers).length]["lname"]),"dataType":"string"},
			{"identifier":"format","value":$("#context-menu.open").find("#sGSelectedFormat").val(),"dataType":"string"}
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
	    }
	}
    };

    function loadContextualMenu(){
	$("#mmm_opacity").on("input",function(){
	    var cLayer=$(".tree li").find(".layer-active");
	    if(!cLayer.attr("id"))
		cLayer=$(this).parent().parent().parent().parent().parent();
	    console.log(cLayer);
	    var cid=eval("myBaseLayers.length+"+(cLayer.attr("id").replace(/layer_/,"").split("_")[0]));
	    var clayer=getLayerById(eval(cLayer.attr("id").replace(/layer_/,"")));
	    oLayers[clayer]["opacity"]=$(this).val()/100;
	    map.getLayers().item(cid).setOpacity($(this).val()/100);
	    $(this).parent().find("#mmm_range").val($(this).val()+"%");
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
		if(oLayers[i])
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
	    var closure=$(this);
	    (function(closure){
		closure.off('click');
		closure.on('click',function(e){
		    console.log($(this));
		    var cLayer=$(".tree li").find(".layer-active");
		    if(!cLayer.length){
			cLayer=$(".tree").find("li.layer-active");
		    }
		    console.log(cLayer);
		    if(!cLayer.attr("id"))
			cLayer=closure.parent().parent().parent().parent();
		    console.log(cLayer);
		    console.log(e);
		    console.log(closure);
		    console.log(cLayer);
		    try{
			contextualMenu[closure.attr("id").replace(/mmm_/,"")]["run"](cLayer.attr("id").replace(/layer_/,""),closure,e);
		    }catch(e){
			if(cLayer.attr("id")!=cLayer.attr("id").replace(/overlays_/,"")){
			    console.log(addedLayers[cLayer.attr("id").replace(/overlays_/,"")]);
			    contextualMenu[closure.attr("id").replace(/mmm_/,"")]["run"](Object.keys(oLayers).length+(eval(cLayer.attr("id").replace(/overlays_/,""))),closure,e);
			    return;
			}
			closure.popover("hide");
			console.log(cLayer.attr("id").replace(/layer_/,""));
			console.log(cLayer.attr("id").replace(/overlays_/,""));
			
			oLayers[getLayerById(cLayer.attr("id").replace(/layer_/,""))]["popover"]=false;
		    }
		});
	    })(closure);
	});
    }

    var oldItem;
    function load_menu(){
	console.log("INVOKE LOAD MENU!!!");
	$("#header").find(".mm-action").each(function(){
		$(this).off('click');
		$(this).on('click',function(){
		    oldItem=$(this).parent().parent().find(".active").attr('id');
		    for(var i in menuItems){
			menuItems[i]["deactivate"]();
			if(!$(this).hasClass("do-not-select")){
			    $("#"+i).parent().removeClass("active");
			}
		    }
		console.log("LOCALMODULES");
		console.log(localModules);
		    for(var i in localModules){
			console.log("**** BROWSER localModules "+i);
			if(localModules[i]["deactivate"])
				localModules[i]["deactivate"]();
		    }
		    //oldItem=$(this).attr('id');
		    if(!$(this).hasClass("do-not-select")){
			$(this).parent().addClass("active");
		    }
		    if(menuItems[$(this).attr('id')])
		    menuItems[$(this).attr('id')]["activate"]();
		    else{
			for(var i in localModules){
				console.log("**** BROWSER localModules "+i);
				if(localModules[i].name==$(this).attr('id'))
					if(localModules[i]["activate"]) localModules[i]["activate"]();
			}
		    }
		    if(shouldDisplayTabsForToggle){
			$(".navbar").find(".navbar-collapse").collapse("hide");
		    }
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


    function getInteractions(){
	return mapInteractions;
    }
    function mmActivateDrawTool(args){
	var isActive=true;
	var toolName=args.name;
	var drawParameters={
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
	    })),
	    geometryFunction: (args.geometryFunction?args.geometryFunction:null)
	};
	if(!mapInteractions[args.name]){
	    mapInteractions[args.name] = new ol.interaction.Draw(drawParameters);
	    isActive=false;
	}else{
	    if(args.name=="gselectFeatures"){
		mapInteractions[args.name+"_prev"]=mapInteractions[args.name];
		mapInteractions[args.name] = new ol.interaction.Draw(drawParameters);
		isActive=false;
	    }
	}
	desactivateInteractions();
	map.addInteraction(mapInteractions[args.name]);
	if(!isActive){
	    if(args.mmModify){
		console.log("Add modify capability");
		mapInteractions[args.name+"_modify"] = new ol.interaction.Modify({
		    source: (args.source?args.source:drawSource)
		});
		map.addInteraction(mapInteractions[args.name+"_modify"]);
	    }
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
		if(!shouldDisplayTabsForToggle){
		    desactivateInteractions();
		    activateDefaultInteractions();
		    map.addInteraction(mapInteractions["zoomin"]);
		}else{
		    console.log("OK");
		    startSelectFeature("Box","zoomin");
		}
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
		if(!shouldDisplayTabsForToggle){
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
				console.log(oLayers[i]);
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
				    $('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
					$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
				    } );
				    console.log(localModules);
				}else{
				}
			    }
			    console.log(extent);
			});
		}else{
		    console.log("OK");
		    startSelectFeature("Box","getFeature");
		}
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
				$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
                                    $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
				} );
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
			    console.log(oLayers[layer]);
			    console.log(oLayers[layer]["query"]+" "+oLayers[layer]["type"]=="raster");
			    console.log(oLayers[layer]["query"] && oLayers[layer]["type"]=="raster");
			    if(oLayers[layer]["query"] && oLayers[layer]["type"]=="raster"){
				window["raster_query_"+layer]=function(){
				    return sVal1;
				};
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
				};
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
				};
				//console.log(oLayers[layer]);
				(function(layer){
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
					    "complexPayload_callback":"raster_query_level2_"+layer
					}
				    ],
				    dataOutputs: [
					{"identifier":"Result","type":"raw"}
				    ],
				    type: 'POST',
				    storeExecuteResponse: false,
				    success: function(data){
					console.log("SUCCESS");
					console.log(data);
					console.log(oLayers[layer]);
					var values=[];
					var sspoints=[];
					for(i in data.coordinates){
					    values.push(data.coordinates[i][2]);
					    sspoints.push([data.coordinates[i][0],data.coordinates[i][1]]);
					}
					$('.print-map-form-element').show();
					elevationProfiles.push(data);
					for(var i in {"container":0,"header":0})
					    $("#mmm_table-wrapper-"+i).find(".active").each(function(){
						$(this).removeClass("active");
					    });

					if(!$('#mmm_table-content-display_'+layer).length){
					    $("#mmm_table-wrapper-header").append('<li role="presentation" class="active"><a id="mmm_table-content-display_'+layer+'" title="'+oLayers[layer]["alias"]+'" data-toggle="tab" data-target="#output-profile-'+layer+'" href="#output-profile-'+layer+'"><i class="fa fa-area-chart"></i><b class="ncaret"> </b><span class="hidden-xs hidden-sm">'+oLayers[layer]["alias"]+'</span> </a>  </li>');
					}else
					    $('#output-profile-'+layer).remove();

					$("#mmm_table-wrapper-container").append('<div class="output-profile tab-pane active" id="output-profile-'+layer+'" style="width: 99%;height: '+(!shouldDisplayTabsForToggle?$(window).height()/3:$(window).height()-300)+'px;"></div>');
					

					$('#mmm_table-content-display_'+layer).tab("show");
					if(!$("#table-wrapper").hasClass("in")){
					    if(shouldDisplayTabsForToggle)
						$("#table-wrapper").removeClass("fixed-bottom");
					    $("#table-wrapper").collapse("show");
					    var mpheight= ($(window).height() - $('.navbar-header').height())/2;
					    if(!shouldDisplayTabsForToggle)
						$('#map').height(mpheight);
					    else{
                                                mpheight= ($(window).height() - $('.navbar-header').height());
                                                $('#table-wrapper').height(mpheight);
                                                $('#table-wrapper').attr('style','width: 99%');
                                                $('#table-wrapper').find('.well').attr("style","padding-left:0");
                                            }
					    map.updateSize();
					}
					$("#table-wrapper").on("removeClass",function(){
					    if(arguments.length>=2 && arguments[1] &&  arguments[1].indexOf(" in ")>=0 && arguments[2] && arguments[2].indexOf(" in ")<=0){
						if(!shouldDisplayTabsForToggle){
						setMapHeight();
						console.log("== ******* == DEBUG");
						map.updateSize();
						}
					    }
					    $("#table-wrapper").removeAttr("style");
					});
					$("#table-wrapper").on("addClass",function(){
					    if(arguments.length>=2 && arguments[1] &&  arguments[1].indexOf(" in ")>=0 && arguments[2] && arguments[2].indexOf(" in ")<=0){
						if(!shouldDisplayTabsForToggle){
						console.log("== ******* == DEBUG");
						setMapHeight();
						map.updateSize();
						}
					    }
					    $("#table-wrapper").removeAttr("style");
					});
					window.setTimeout(function () {
					    $("#table-wrapper").removeAttr("style");
					},1200);
					if(shouldDisplayTabsForToggle)
					    $('#mmtabs').find("li").last().find("a").tab('show');
					var chart = new Highcharts.Chart({
					    chart: {
						zoomType: 'x',
						renderTo: 'output-profile-'+layer
					    },
					    title: {
						text: oLayers[layer]["rQueryTitle"]
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
						    return '<h1>'+oLayers[layer]["rQueryTooltip"]+' '+Highcharts.numberFormat(this.y, 0)+"</h1>";
						}
					    },
					    series: [{
						name: 'Elevation',
						type: 'area',
						data: values
					    }]
					});
					window.setTimeout(function () {
					    $("#table-wrapper").removeAttr("style");
					},500);
				    },
				    error: function(data){
					console.log("ERROR");
					console.log(data);
				    }
				});
				})(layer);
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
		var hasPrintTab=false;
		if(!$("#mmprintTab").length){
		    $("#mmtabs").append($("#printtab_header_template")[0].innerHTML);
		    $("#mmtabs").next().prepend($('<div role="tabpanel" class="tab-pane" id="mmprintTab"></div>'));
		    $("#mmprintTab").append($("#printtab_template")[0].innerHTML);
		}else
			hasPrintTab=true;
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
		if(!hasPrintTab)
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
    function fetchlTemplate(features,click){
	var layer=features.get("layerName");
	if((click && oLayers[layer].click) ||
	  (!click && oLayers[layer].over))
	$.ajax({
	    type: "GET",
	    url: templatesUrl+(click?"click_":"")+features.get("layerName")+"_"+mapProject+"_tmpl.html",
	    complete: function(xml,status) {
		var res=xml.responseText.replace(/item name/g,"");
		var layer=features.get("layerName");
		System.lTemplates[layer]={};
		System.lTemplates[layer][(click?"click":"over")]=res;
		System.loadTemplates[layer]={};
		System.loadTemplates[layer][(click?"click":"over")]=false;
		try{
		    printlTemplate(features,click);
		}catch(e){
		    for(var j=0;j<features.length;j++){
			{
			    printlTemplate(features[j],click);
			}
		    }
		}	
	    }
	});
    }

    function printlTemplate(feature,click,multiple){
	if(!feature){
	    return;
	}
	var j=0;
	var layer=feature.get("layerName");
	if(!System.lTemplates0[layer]){
	    System.lTemplates0[layer]={};
	    System.lTemplates0[layer][(click?"click":"over")]=System.lTemplates[layer][(click?"click":"over")];
	}
	var res1=System.lTemplates[layer][(click?"click":"over")];
	var tmp="";
	var data=feature.getProperties();
	for(j in data){
	    console.log(j);
	    if(j!="msGeometry"){
		var reg=new RegExp("\\[=&quot;"+j+"&quot;\\]","g");	
		res1=res1.replace(reg,feature.get(j));
		var reg=new RegExp("\\[="+j+"\\]","g");
		res1=res1.replace(reg,feature.get(j));
	    }
	    if(j=="features"){
		var tmp=feature.get(j);
		var content='<div class="tab-content">';
		var header='<ul class="nav nav-tabs" role="tablist">';
		for(k in tmp){
		    header+='<li role="presentation" class="nav-link '+(k==0?'active':'')+'"><a class="nav-link" href="#feature_'+k+'" aria-controls="feature_'+k+'" role="tab" data-toggle="tab">Feature '+eval(k+'+1')+'</a></li>';
		    console.log(k);
		    console.log(tmp[k]);
		    tmp[k].set("layerName",layer);
		    content+='<div role="tabpanel" class="tab-pane '+(k==0?'active':'')+'" id="feature_'+k+'">'+
			printlTemplate(tmp[k],click,true)+
			'</div>';
		    //content+="<hr />";
		    //break;
		}
		header+='</ul>';
		if(tmp.length>1){
		    System.onPrintlTemplate(feature,'<div>'+header+content+'</div>');
		    $('.window.active').find('a').each(function(){
			console.log($(this));
			$(this).click(function (e) {
			    e.preventDefault()
			    $(this).tab('show');
			    $(this).parent().parent().find(".active").removeClass("active");
			    $(this).parent().addClass("active");
			});
		    });
		}else
		    System.onPrintlTemplate(feature,content);
		return;
	    }
	}
	if(!multiple)
	    System.onPrintlTemplate(feature,res1);
	else
	   return res1;
    }
    
    function tryRun(feature,click){
	if(!System.lTemplates0[layerName] || !System.lTemplates0[layerName][(click?"click":"over")])
	    fetchlTemplate(feature,click);
	else
	    printlTemplate(feature,click);
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

    function getLayerIdById(cid){
	for(i in oLayers){
	    if(oLayers[i]["rindex"]==cid){
		return oLayers[i]["index"];
	    }
	}
	return -1;
    }
    
    function getLayerById(cid){
	for(i in oLayers){
	    if(oLayers[i]["rindex"]==cid){
		return i;
	    }
	}
	return null;
    }

    // @see https://groups.google.com/forum/#!topic/ol3-dev/a7jcO3LPGac
    svgToImage = function(src, width, height) {
	var canvas = $('<canvas/>')[0],
	    context,
	    svgImage = new Image(),
	    image = new Image();
	
	canvas.height = height;
	canvas.width = width;
	
	context = canvas.getContext('2d');
	
	svgImage.src = src;
	context.drawImage(svgImage, 0, 0, width, height);
	image.src = canvas.toDataURL();
	return image;
    }

    var features0,featureOverlay0;
    var draw0;
    var vectorLayerId=0;

    function addInteraction() {
	var closure=arguments[0];

	console.log('addInteraction');
	var hasDraw0=true;
	var len=featureOverlay0.getSource().getFeatures().length;

	var cid=closure.parent().prev().attr("id");
	vectorLayerId=(cid=="end"?1:(cid=="start"?0:-1));
	console.log(closure.parent().prev().attr("id"));
	if(len>=2){
	    for(var i=0;i<len;i++){
		if(featureOverlay0.getSource().getFeatures()[i] &&
		   ((featureOverlay0.getSource().getFeatures()[i].get('fid')=="vectorLayer_0" && cid=="start") || 
		    (featureOverlay0.getSource().getFeatures()[i].get('fid')=="vectorLayer_1" && cid=="end"))){
		    features0.removeAt(i);
		    len=i;
		}
	    }
	}
	console.log(1+((len-1)*3));
	//if(!draw0){
	    draw0 = new ol.interaction.Draw({
		features: features0,
		type: /** @type {ol.geom.GeometryType} */ ('Point'),
		style: (len==1?[flagStyles[1+((len)*3)]]:[flagStyles[1]])
	    });
	    hasDraw0=false;
	//}
	map.addInteraction(draw0);
	//if(!hasDraw0)
	//draw0.off('drawend');
	    draw0.on('drawend',function(evt) {
		var coords=ol.proj.transform(evt.feature.getGeometry().getCoordinates(),map.getView().getProjection(),'EPSG:4326');
		//service=WPS&version=1.0.0&request=Execute&Identifier=routing.reverseGeocode&DataInputs=x=-17.48072498333403;y=14.721039482797247&RawDataOutput=Result&language=en-US&_=1446079261587
		zoo.execute({
		    identifier: "routing.reverseGeocode",
		    dataInputs: [
			{"identifier":"x","value":coords[0],"dataType":"float"},
			{"identifier":"y","value":coords[1],"dataType":"float"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    type: 'POST',
		    success: function(data){
			console.log("SUCCESS");
			console.log(closure.parent().prev());
			closure.parent().prev().val(data.address);
		    },
		    error: function(data){
			console.log("ERRROR");
			console.log(data);
		    }
		});
		map.removeInteraction(draw0);
		//evt.stopPropagation();
	    });
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
		$("#mm_layers_display").find("input[type=checkbox]:checked").each(function(){
		    if($(this).parent().attr("id")){
			console.log($(this).parent().attr("id"));
			activatedLayers.push($(this).parent().attr("id").replace(/layer_/g,""));
			console.log($(this).parent().attr("id").replace(/layer_/g,""));
		    }
		});
		/*for(var i=myBaseLayers.length;i<map.getLayers().getLength()-myToolsLayers.length;i++){
		    console.log(map.getLayers().item(i));
		    if(map.getLayers().item(i).getVisible()){
			//activatedLayers.push(i);
			
			activatedLayers.push(i-myBaseLayers.length);
			console.log("Activated: "+i+" , BL: "+myBaseLayers.length);
		    }
		}*/
		/*for(var i=myBaseLayers.length;i<1+map.getLayers().getLength()-myToolsLayers.length;i++){
		    if(map.getLayers().item(i).getVisible()){
			activatedLayers.push(i-myBaseLayers.length);
			console.log("Registred as activated: "+i);
		    }
		}*/
		var inputs=[
                        {"identifier":"layers","value":activatedLayers,"dataType":"string"},
                        {"identifier":"ext","value":tmpExt0,"dataType":"string"},
                        {"identifier":"tDoc","value":"MM-PrintedMap.pdf","dataType":"string"},
                        {"identifier":"map","value":lastMap,"dataType":"string"},
                        {"identifier":"bgMap","value":data,"dataType":"string"},
                        {"identifier":"zoom","value":map.getView().getZoom(),"dataType":"string"}
                    ];
               if($('.print-map-form-element').find("input[type=checkbox]").first().is(":checked")){
                       inputs.push({"identifier":"profile","value":JSON.stringify(elevationProfiles[elevationProfiles.length-1]),"mimeType":"application/json"});
                       inputs.push({"identifier":"iFormat","value":$('#iFormat').val()+"p","dataType":"string"});
               }else
                       inputs.push({"identifier":"iFormat","value":$('#iFormat').val(),"dataType":"string"});
 
		zoo.execute({
		    identifier: "print.printMap",
		    dataInputs: inputs,
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

    function createParam(obj){
	return {
	    "identifier": $(obj).attr("name"),
	    "value": $(obj).val(),
	    "dataType": "string"
	}
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
	$("#authenticate_logout").click(function(){
	    console.log("Logout!");
	    	var params=[];
	    $(this).parent().find("input").each(function(){
		console.log($(this).attr("type"));
		if($(this).attr("type")!="submit"){
		    if($(this).attr("type")=="checkbox"){
			if($(this).is(":checked"))
			    params.push(createParam(this));
		    }else{
			params.push(createParam(this));
		    }
		}
	    });
	    zoo.execute({
		identifier: "authenticate.clogOut",
		type: "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    $(".notifications").notify({
			message: { text: data },
			type: 'success',
		    }).show();
		    document.location.reload(false);
		},
		error: function(data){
		    console.log(data);
		    if($.isArray(data["ExceptionReport"]["Exception"])){
			for(var i=0;i<data["ExceptionReport"]["Exception"].length;i++)
			    $(".notifications").notify({
				message: { text:  data["ExceptionReport"]["Exception"][i]["ExceptionText"] },
				type: 'danger',
			    }).show();
		    }
		    else
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"] },
			    type: 'danger',
			}).show();
		}
	    });
	    return false;
	});
	
    }

    var hasAddedFeature=false;
    function addASelectedFeature(feature){
	selectLayer.getSource().clear();
	selectLayer.getSource().addFeatures(feature);
	hasAddedFeature=true;
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

    function getSearchValues(){
	return [searchValues,searchExtents];
    }

    function getMap(){
	return map;
    }

    function addLayerToMap(obj){
	console.log(obj);
	var cmapfile=obj.mapfile;
	var clayers=obj.layers;
	var clabels=obj.labels;
	var listHTML=obj.listHTML;
	var cselection=obj.cselection;
	console.log(cmapfile);
	console.log(clayers);
	console.log(clabels);
	console.log(externalCallbacks);
	if(externalCallbacks["addLayer"])
	    externalCallbacks["addLayer"](obj);
	
	var myStr=clayers.join(",");
	addedLayers.push(new ol.layer.Tile({
	    visible: true,
	    source: new ol.source.TileWMS({
		url: msUrl+"?map="+cmapfile,
		params: {'LAYERS': myStr, 'TILED': true},
		serverType: 'mapserver'
	    })
	}));
	console.log(map.getLayers());
	console.log(map.getLayers().getArray().length);
	addedLayers[addedLayers.length-1]["index"]=map.getLayers().getArray().length;
	map.addLayer(addedLayers[addedLayers.length-1]);

	$.ajax(msUrl+'?map='+cmapfile+"&service=WMS&request=GetCapabilities").then(function(response) {
	    var parser = new ol.format.WMSCapabilities();
	    var result = parser.read(response);
	    console.log(result);
	    myWMSLayers=result;
	    console.log(myWMSLayers);
	    var ext=myWMSLayers["Capability"]["Layer"]["Layer"][0]["BoundingBox"][0]["extent"];
	    addedLayers[addedLayers.length-1]["extent"]=[
		ext[1],
		ext[0],
		ext[3],
		ext[2]
	    ];
	    addedLayers[addedLayers.length-1]["map"]=cmapfile;
	    addedLayers[addedLayers.length-1]["lname"]=myWMSLayers["Capability"]["Layer"]["Layer"][0]["Name"];
	    addedLayers[addedLayers.length-1]["activated"]=true;
	    addedLayers[addedLayers.length-1]["export"]=true;
	    addedLayers[addedLayers.length-1]["query"]=true;
	});
	
	//msUrl+"?map="+cmapfile
	
	var reg=[
	    new RegExp("\\[nn\\]","g"),
	    new RegExp("\\[n\\]","g"),
	    new RegExp("\\[list\\]","g")
	];

	myStr=$("#addedLayer_item_template")[0].innerHTML.replace(reg[0],(addedLayers.length-1)+"").replace(reg[1],addedLayers.length+"").replace(reg[2],listHTML);
	$("#mm_layers_display").find(".tree").first().append(myStr);
	$("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)).find('button').first().each(function(){
	    $(this).click(function(){
		var myRoot=$(this).parent().parent().parent();
		var cid=parseInt(myRoot.attr('id').replace(/overlays_/g,""));
		map.removeLayer(addedLayers[cid]);
		myRoot.remove();
	    });
	});
	$("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)).find('input[type=checkbox]').first().each(function(){
	    $(this).click(function(){
		var myRoot=$(this).parent().parent().parent();
		var cid=parseInt(myRoot.attr('id').replace(/overlays_/g,""));			
		addedLayers[cid].setVisible($(this).is(':checked'));
	    });
	});
	clayer="overlays_"+(addedLayers.length-1);
	if(!oLayers[clayer])
	    oLayers[clayer]={'opacity':1,"data": addedLayers[addedLayers.length-1]};

	console.log( $("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)));
	$("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)).find("li.layer").each(function(){
	    console.log($(this));
	    if(cselection=="mm_overlays_wms_display")
		$(this).find("input[type=checkbox]").parent().prepend('<i class="fa fa-server"> </i>  ');
	    $(this).find("input[type=checkbox]").remove();
	});
	$("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)).find('.tree-toggle').click(function () {
	    $(this).parent().children('ul.tree').slideToggle(200);
	    $(this).find('.ud').toggleClass('fa-caret-square-o-down fa-caret-square-o-right');
	});
	$("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)).contextmenu({
	    target: "#context-menu"
	});
	$("#mm_layers_display").find("#overlays_"+(addedLayers.length-1)).bind("contextmenu",function(e){
	    console.log(e);
	    console.log($(this).attr("id").indexOf("overlays_"));
	    if($(this).attr("id").indexOf("overlays_")==0){
		cid=parseInt($(this).attr("id").replace(/overlays_/,""));
		clayer="overlays_"+cid;
	    }
	    else{
		cid=eval($(this).attr("id").replace(/layer_/,""));
		clayer=getLayerById(cid);
	    }
	    console.log(clayer);
	    if(!oLayers[clayer])
		oLayers[clayer]={'opacity':1};

	    $("#mm_layers_display").find(".tree").find(".layer-active").toggleClass("layer-active");
	    $(e.currentTarget).toggleClass("layer-active");
	    var myRootLocation=$("#context-menu");
	    for(i in {/*"export":0,*/"query":0/*,"zoomTo":0*/}){
		myRootLocation.find("#mmm_"+i).parent().addClass("hidden");
	    }
	    console.log(clayer);
	    myRootLocation.find("#mmm_opacity").off("input");
	    myRootLocation.find("#mmm_opacity").on("input",function(){
		myRootLocation.find("#mmm_range").val($(this).val()+"%");
		var cLayer=$("#mm_layers_display").find(".tree").find("li.layer-active").first();
		if(cLayer.attr("id").indexOf("overlays_")==0){
		    var cid=parseInt(cLayer.attr("id").replace(/overlays_/,""));
		    addedLayers[cid].setOpacity($(this).val()/100);
		    clayer="overlays_"+cid;
		}
		else{
		    var cid=eval("myBaseLayers.length+"+(cLayer.attr("id").replace(/layer_/,"").split("_")[0]));
		    var clayer=getLayerById(eval(cLayer.attr("id").replace(/layer_/,"")));
		    map.getLayers().item(cid).setOpacity($(this).val()/100);
		    clayer=getLayerById(cid);
		}
		oLayers[clayer]["opacity"]=$(this).val()/100;
	    });
	    myRootLocation.find("#mmm_opacity").val(oLayers[clayer]["opacity"]*100);
	    myRootLocation.find("#mmm_range").val(Math.round(oLayers[clayer]["opacity"]*100).toFixed(0)+"%");
	    $('body, #context-menu > ul > li > a').on('click', function (e) {console.log("CLICK !! ");$(".tree").find(".layer-active").removeClass('layer-active');});
	    return;
	});

    }
    
    function addALayer(obj){
	var wmsSource = new ol.source.TileWMS({
	    url: msUrl+"?map="+obj.map,
	    params: {'LAYERS': obj.layer},
	    serverType: 'mapserver',
	    crossOrigin: ''
	});
	layer=new ol.layer.Tile({
	    visible: true,
	    source: wmsSource
	});

	map.addLayer(layer);
    }

    function getLayers(){
	return oLayers;
    }

    function getSelectLayer(){
	return selectLayer;
    }

    function getDrawSource(){
	return drawSource;
    }

    function getMapInteractions(){
	return mapInteractions;
    }

    function startSelectFeature(value,name){
	var args={
	    name: "gselectFeature"+name,
	    type: (value=="Box"?"Circle":value),
	    geometryFunction: (value=="Box"?ol.interaction.Draw.createBox():null),
	    style: null,
	    endHandler: function(evt) {
		evt.preventDefault();
		var tmpFeature=evt.feature.clone();
		console.log(tmpFeature);
		console.log(name);
		if(name=="zoomin"){
		    //console.log(tmpFeature.getGeometry().transform("EPSG:3857","EPSG:4326").getExtent());
		    map.getView().fit(tmpFeature.getGeometry().getExtent(),map.getSize());
		}else{
		    // Create WFS Request
		    tmpFeature.getGeometry().transform("EPSG:3857","EPSG:4326");
		    for(var i in oLayers){
			console.log(oLayers[i]);
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
				    bbox: tmpFeature.getGeometry().getExtent()
				}
			    },true);
			    $('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
				$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
			    } );
			}else{
			}
		    }
		}
		window.setTimeout(function(){
		    if(name!="zoomin")
			$('#mmtabs').find("li").last().find("a").tab('show');
		    if(drawSource.getFeatures().length>0){
			drawSource.removeFeature(drawSource.getFeatures()[0]);
		    }
		    var cnt=0;
		    $("#mmm_table-wrapper-header").find("li").each(function(){
			if($(this).attr('role')=="presentation"){
			    console.log($(this));
			    console.log($(this).find("span.hidden-xs").first(),$("#table-wrapper").find("#mmm_table-wrapper-header-title:eq("+cnt+")"));
			    $("#table-wrapper").find(".tab-pane:eq("+cnt+")").prepend($(this).find("span.hidden-xs").first().text());
			}
			cnt++;
		    });
		},500);
	    }
	};
	console.log(args);
	mmActivateDrawTool(args);
	console.log(" **--** DRAW FROM NOW!");
    }
    
    // Return public methods
    return {
        initialize: initialize,
	setMapHeight: setMapHeight,
	printDocument: printDocument,
	addInteraction: addInteraction,
	addASelectedFeature: addASelectedFeature,
	getMap: getMap,
	getSearchValues: getSearchValues,
	addALayer: addALayer,
	addLayerToMap: addLayerToMap,
	externalCallbacks: externalCallbacks,
	getLayers: getLayers,
	getSelectLayer: getSelectLayer,
	desactivateInteractions: desactivateInteractions,
	activateDefaultInteractions: activateDefaultInteractions,
	getDrawSource: getDrawSource,
	mapInteractions: mapInteractions,
	mmActivateDrawTool: mmActivateDrawTool,
	getInteractions: getInteractions,
	positionFeature: positionFeature,
	load_menu: load_menu,
	shouldDisplayTabsForToggle: shouldDisplayTabsForToggle,
    };



});

