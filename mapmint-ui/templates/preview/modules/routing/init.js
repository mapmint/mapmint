#encoding UTF-8
#import zoo

var points_layer=false,dd_layer=false,route_layer=false,route_layer1=false,points_layer1=false;
var geographic = new OpenLayers.Projection("EPSG:4326"),
    mercator = new OpenLayers.Projection("EPSG:900913");
var totalLength=0;
var sspoints=[];
var draw_points;
var drag_points;
var route_layer2=false;
//System.idPoint = null;
System.routingPoiCnt=0;
System.nbEtapes = 0;
System.nbEtapeFlags = 0;
// Vitesse par défaut : 15km/h en vélo
var defaultSpeed = 15;
var currentIdStepDisplayed = 0;
var previousIdStepDisplayed = -1;
var nbSteps = 0;

  var lookup = {
      "start": {pointRadius: 14,graphicYOffset: -24,graphicXOffset: -6,'externalGraphic': '$conf['main']['publicationUrl']/img/design/drapeau_bleu.png'},
      "end": {pointRadius: 14,graphicYOffset: -24,graphicXOffset: -6,'externalGraphic': '$conf['main']['publicationUrl']/img/design/drapeau_rouge.png'},
      "inter": {pointRadius: 14,graphicYOffset: -24,graphicXOffset: -6,'externalGraphic': '$conf['main']['publicationUrl']/img/design/drapeau_orange.png'},
      "incident": {pointRadius: 14,graphicYOffset: -24,graphicXOffset: -6,'externalGraphic': '$conf['main']['publicationUrl']/img/design/danger_bleu.png'}
  }

function parseDistance(){
    if(arguments[0]/1000>=1){
	var tmp=(arguments[0]/1000)+"";
	var tmp1=tmp.split(".");
	var tmp2=arguments[0]-(eval(tmp1[0])*1000);
	var tmp3=(tmp2+"").split('.');
	tmp3=tmp3[0]+"";
	return " "+tmp1[0]+(tmp2>=1?","+(tmp3[0]+tmp3[1])+" km ":"");	
    }else{
	var tmp=arguments[0]+"";
	var tmp1=tmp.split(".");
	return " "+tmp1[0]+" m ";	
    }
}

function parseMeter(){
  if(arguments[0]/1000>=0){
    var tmp=(arguments[0]/1000)+"";
    var tmp1=tmp.split(".");
    var tmp2=arguments[0]-(tmp1[0]*1000);
    var tmp3=(tmp2+"").split('.');
    return " "+tmp1[0]+" km "+(tmp2>=1?"et "+tmp3[0]+" m":"");
  }else{
    var tmp=(arguments[0]/1000)+"";
    var tmp1=tmp.split(".");
    return " "+tmp1[0]+" m";
  }
}


System.points=[];

function mmGeocode(obj,feature){
    if(feature){
	tmp=feature.geometry;
	System.idPoint=feature.attributes["idPoint"];
    }
    else{
	tmp=obj.layer.features[obj.layer.features.length-1].geometry;
	if(System.idPoint.indexOf("adresseEtape")<0)
	    obj.layer.features[obj.layer.features.length-1].attributes["idPoint"]=System.idPoint;
	else{
	    var tmpv=eval(System.idPoint.replace(/adresseEtape/g,""));
	    obj.layer.features[2+tmpv].attributes["idPoint"]=System.idPoint;
	    tmp=obj.layer.features[2+tmpv].geometry;
	}
    }
    var lonlat=new OpenLayers.LonLat(tmp.x,tmp.y).transform(map.getProjectionObject(),wgs84);
    if(System.idPoint){
	System.points[System.points.length]=System.idPoint;
    }
    System.n=System.points[System.points.length-1];
    \$.ajax({
	type: "GET",
	url: "$conf["main"]["serverAddress"]?metapath=routing&service=WPS&version=1.0.0&request=Execute&Identifier=reverseGeocode&DataInputs=x="+lonlat.lon+";y="+lonlat.lat+"&RawDataOutput=Result",
	dataType: "xml",
	complete: function(xml,status) {
	    try{
		var results=\$.parseJSON(xml.responseText);
		\$('#search_geocoding_results').empty();
		\$("#"+System.n).val("");
		\$("#"+System.n).val(results[0].label);
	    }catch(e){
		loadGCPWindow("windows/popupmessage?msg="+"$zoo._('No address found')","$zoo._('Information')",400,50);
	    }	    
	}
    });
    
}

DrawPoints = OpenLayers.Class(OpenLayers.Control.DrawFeature, {
    
    // this control is active by default
  autoActivate: false,

  initialize: function(layer, options) {
      // only points can be drawn
      this.handler = OpenLayers.Handler.Point;
      OpenLayers.Control.DrawFeature.prototype.initialize.apply(
	  this, [layer, this.handler, options]
      );
    },

   mmGeoCode: function(n){
       mmGeocode(this,false);
    },
	
   setCurrentFlag: function(idPoint){
       //alert(idPoint)
       if((idPoint=="adresseLieu") || (idPoint.indexOf("adresseDepart") != -1)){
	   if(this.layer.features.length>1){
	       var saveds=[];
	       for(var i=0;i<this.layer.features.length;i++){
		   saveds.push(this.layer.features[i].clone());
	       }
	       this.layer.removeFeatures(this.layer.features);
	       this.layer.addFeatures([saveds[saveds.length-1]]);
	       this.layer.addFeatures([saveds[0]]);
	       for(var i=1;i<saveds.length-1;i++)
		   this.layer.addFeatures([saveds[i]]);
	       
	       this.layer.features[1].attributes["type"]="end";
	   }
	   this.layer.features[0].attributes["type"]="start";
       }
       else if(idPoint.indexOf("adresseArrivee") != -1  || (idPoint.indexOf("adresseArrivee") != -1)){
	   if(this.layer.features.length>2){
	       var saveds=[];
	       for(var i=1;i<this.layer.features.length;i){
		   saveds.push(this.layer.features[i].clone());
		   this.layer.removeFeatures(this.layer.features[i]);
	       }
	       this.layer.addFeatures([saveds[saveds.length-1]]);
	       for(var i=0;i<saveds.length-1;i++)
		   this.layer.addFeatures([saveds[i]]);
	       
	       this.layer.features[0].attributes["type"]="start";
	   }
	   this.layer.features[1].attributes["type"]="end";
       }
       else if(idPoint.indexOf("adresseEtape") != -1  || (idPoint.indexOf("adresseEtape") != -1)){
	   if(this.layer.features.length>3){
	       var saveds=[];
	       var tmps=eval(idPoint.replace(/adresseEtape/g,""));
	       var saveds=[];
	       for(var i=2+tmps;i<this.layer.features.length;i){
		   saveds.push(this.layer.features[i].clone());
		   this.layer.removeFeatures(this.layer.features[i]);
	       }
	       this.layer.addFeatures([saveds[saveds.length-1]]);
	       this.layer.features[this.layer.features.length-1].attributes["type"]="inter";
	       this.layer.features[this.layer.features.length-1].attributes["idPoint"]="adresseEtape0";
	       for(var i=0;i<saveds.length-1;i++){
		   this.layer.addFeatures([saveds[i]]);
		   this.layer.features[this.layer.features.length-1].attributes["idPoint"]="adresseEtape"+(i+1);
		   this.layer.features[this.layer.features.length-1].attributes["type"]="inter";
	       }
	       
	       this.layer.features[0].attributes["type"]="start";
	       this.layer.features[1].attributes["type"]="end";
	   }
	   this.layer.features[this.layer.features.length-1].attributes["type"]="inter";
       }
       else if(idPoint.indexOf("adresseIncident") != -1){
	   this.layer.features[this.layer.features.length-1].attributes["type"]="incident";
       }
       else alert("flag error: " + idPoint);
   },
      
    drawFeature: function(geometry) {	
	OpenLayers.Control.DrawFeature.prototype.drawFeature.apply(
	    this, arguments	
	);
	
	if (this.layer.features.length>0){
#if $m.web.metadata.get('layout_t')!="mobile"
	    // Attribution du drapeau selon le type 
	    this.setCurrentFlag(System.idPoint);
	    this.mmGeoCode(System.idPoint);
	    // Zoom sur lieu
	    if(System.idPoint=="adresseLieu")
		map.zoomToExtent(points_layer.getDataExtent());
	    
#end if
	}

	\$("#"+System.idPoint).trigger("onchange");
	System.idPoint=false;

	this.deactivate();

	this.layer.redraw(true);
    }
  }
);

function _getSitesAround(){
    var params1=[
	{name: "InputEntity1","xlink:href": System.zooUrl+"?metapath=vector-tools&amp;service=WPS&amp;version=1.0.0&amp;request=Execute&amp;Identifier=BufferUnion&amp;DataInputs=InputPolygon=Reference@xlink:href="+encodeURIComponent(System.mapUrl+"&service=WFS&version=1.0.0&request=GetFeature&typename=Result")+";BufferDistance=0.02&amp;RawDataOutput=Result", mimeType: "application/json"},
	{name: "InputEntity2","xlink:href": msUrl+"?map="+pmapfile+"&amp;service=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename=Sites",mimeType: "text/xml"},
	{name: "line","xlink:href": System.mapUrl+"&amp;service=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename=Result", mimeType: "text/xml"}
    ];
    //alert("ok");
    var data1=WPSGetHeader("orderedIntersection")+WPSGetInputs(params1)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    //alert("ok "+data1);
    
    $.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=vector-tools",
	contentType: 'text/xml',
	data: data1,
	complete: function(xml,status) {
	    try{
#if $m.web.metadata.get('layout_t')=="mobile"
		var  gml=new OpenLayers.Format.GML();
		System.features=gml.read(xml.responseText);
		var chk=\$('#searchPOIType').val();
		var aDisplay=[];
		System.featuresf=[];
		for(i=0;i<System.features.length;i++){
		    try{
			if(System.features[i].attributes["ID_TEMPLAT"]==chk){
			    var display=true;
			    for(var j=0;j<aDisplay.length;j++){
				//alert(aDisplay[j]+" "+System.features[i].attributes["NOM_SITE"]);
				if(aDisplay[j]==System.features[i].attributes["NOM_SITE"]){
				    display=false;
				    //alert(display);
				    break;
				}
			    }
			    if(display){
				\$('<li>', {
				    "data-role": "fieldcontain"
				})
				    .append(\$('<a />', {
					text: System.features[i].attributes["NOM_SITE"]
				    })
					    .click(function() {
						try{
						    //alert("ok");
						    routingFormAddPOI();
						    alert(System.featuresf[i]);
						    var stmp=System.featuresf[i].geometry;
						    stmp1=stmp.transform(geographic,mercator);
						    alert(stmp);
						    points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))},null)]);
						    \$.mobile.changePage('#routingPage');
						}catch(e){alert(e);}
					    })
					   )
				    .appendTo('#routingPoiListContainer');
				aDisplay[aDisplay.length]=System.features[i].attributes["NOM_SITE"];
				alert(aDisplay[aDisplay.length-1]+" "+display);
				System.featuresf[System.featuresf.length]=System.features[i];
				alert(System.featuresf);
			    }
			}				
		    }catch(e){alert(e)}
		}
#if $m.web.metadata.get('layout_t')=="mobile"
		\$('#routingPoiListPage').trigger('pagecreate');
		\$('#routingPoiListPage').listview("refresh"); 
#end if
#else

		/*startpoint = points_layer.features[0].geometry.clone();
		startpoint.transform(mercator, geographic);

		endpoint = points_layer.features[1].geometry.clone();
		endpoint.transform(mercator, geographic);

		var params1=[
		    {name: "line","xlink:href": System.mapUrl+"&amp;service=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename=Result", mimeType: "text/xml"},
		    {name: "points",value: xml.responseText,mimeType: "application/json"},
		    {name: "spoint",value: startpoint.x+","+startpoint.y,dataType: "string"},
		    {name: "epoint",value: endpoint.x+","+endpoint.y,dataType: "string"}
		];

		var data1=WPSGetHeader("orderPoiAlongLine")+WPSGetInputs(params1)+WPSGetOutput({name: "Result"})+WPSGetFooter();
		$.ajax({
		    type: "POST",
		    url: System.zooUrl+"?metapath=vector-tools",
		    contentType: 'text/xml',
		    data: data1,
		    complete: function(xml,status) {*/
			loadPOI(xml);
		    /*}
		});*/
#end if
	    }catch(e){}
	}
    });
}

function getSitesAround(){
    //alert("ok");
    loadGCPWindow('windows/selectitineraire;std=true',
		  "$zoo._("Select arrival")",
		  400,
		  350,
		  null,
		  function(){
		      if(System.func){
			  //initChamps();
			  //removeAllFeatures();
			  //mmLayout.open('west');
			  System.func=false;
		      }
		  },
		  function(){
		      _getSitesAround();
		  }
		 );
		
    //alert("ok");
    //\$( "#loadgcp-window" ).window('onclose',function(){alert("ok");});
    //alert(System.mapUrl);
    //alert(System.zooUrl+"?metapath=vector-tools&service=WPS&version=1.0.0&request=Execute&Identifier=Buffer&DataInputs=InputEntity1=Reference@xlink:href="+encodeURIComponent(System.mapUrl+"&service=WFS&version=1.0.0&request=GetFeature&typename=Result")+";BufferDistance=0.001&RawDataOutput=Result");

  
#*    var params=[
	{name: "InputPolygon","xlink:href": System.mapUrl+"&amp;service=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename=Result",mimeType: "text/xml"},
	{name: "Distance","value": 0.001,dataType: "string"}
    ];
    var data=WPSGetHeader("Buffer")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    //alert(data);

    $.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=vector-tools",
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    try{
		var params1=[
		    {name: "InputEntity1","value": xml.responseText, mimeType: "text/json"},
		    {name: "InputEntity2","xlink:href": msUrl+"?map="+pmapfile+"&amp;service=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename=Sites",mimeType: "text/xml"}
		];
		var data1=WPSGetHeader("Intersection")+WPSGetInputs(params1)+WPSGetOutput({name: "Result"})+WPSGetFooter();
		$.ajax({
		    type: "POST",
		    url: System.zooUrl+"?metapath=vector-tools",
		    contentType: 'text/xml',
		    data: data1,
		    complete: function(xml,status) {
			try{
			    var  gml=new OpenLayers.Format.GML();
			    System.features=gml.read(xml.responseText);
			    var chk=\$('#searchPOIType').val();
			    var aDisplay=[];
			    System.featuresf=[];
			    for(i=0;i<System.features.length;i++){
				try{
				    if(System.features[i].attributes["ID_TEMPLAT"]==chk){
					var display=true;
					for(var j=0;j<aDisplay.length;j++){
					    //alert(aDisplay[j]+" "+System.features[i].attributes["NOM_SITE"]);
					    if(aDisplay[j]==System.features[i].attributes["NOM_SITE"]){
						display=false;
						//alert(display);
						break;
					    }
					}
					if(display){
					    \$('<li>', {
						"data-role": "fieldcontain"
					    })
						.append(\$('<a />', {
						    text: System.features[i].attributes["NOM_SITE"]
						})
							.click(function() {
							    try{
								//alert("ok");
								routingFormAddPOI();
								//alert(System.featuresf[i]);
								var stmp=System.featuresf[i].geometry;
								stmp1=stmp.transform(geographic,mercator);
								//alert(stmp);
								points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))},null)]);
								\$.mobile.changePage('#routingPage');
							    }catch(e){alert(e);}
							})
						       )
						.appendTo('#routingPoiListContainer');
					    aDisplay[aDisplay.length]=System.features[i].attributes["NOM_SITE"];
					    //alert(aDisplay[aDisplay.length-1]+" "+display);
					    System.featuresf[System.featuresf.length]=System.features[i];
					    //alert(System.featuresf);
#else

#end if
					}
				    }				
				}catch(e){alert(e)}
			    }
#if $m.web.metadata.get('layout_t')=="mobile"
			    \$('#routingPoiListPage').trigger('pagecreate');
			    \$('#routingPoiListPage').listview("refresh"); 
#end if			    
			}catch(e){}
		    }
		});
	    }catch(e){alert(e);}
	}
    });    
*#
}

function zoomOnPoi(c){
    var tmp=new OpenLayers.Bounds(c[0]-0.001,c[1]-0.001,c[0]+0.001,c[1]+0.001);
    var stmp=new OpenLayers.Geometry.Point(c[0],c[1]);
    stmp1=stmp.transform(geographic,mercator);
    points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp1,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))},null)]);
    map.zoomToExtent(tmp.transform(geographic,mercator))
#if $m.web.metadata.get('layout_t')=="mobile"
    \$('#mapPage').trigger("pageshow"); 
    \$.mobile.changePage("#mapPage");
#end if
}

function loadTrace(){
    try{
#if $m.web.metadata.get('layout_t')!="mobile"
	hideProfil('true');
#end if
	RoutingReinit();
	var params=[
	    {name: "trace",value: arguments[0],dataType: "string"}
	];
	var data=WPSGetHeader("loadRoute")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
	System.toLoad=arguments[0];
	System.routingProfileComputed=false;
#if $m.web.metadata.get('layout_t')=="mobile"
	$.mobile.showPageLoadingMsg();
#end if
	$.ajax({
	    type: "POST",
	    url: System.zooUrl+"?metapath=routing",
	    contentType: 'text/xml',
	    data: data,
	    complete: function(xml,status) {
		try{
		    var resObj=\$.parseJSON(xml.responseText);
		    for(i=0;i<resObj["points"].length;i++){
			var stmp=new OpenLayers.Geometry.Point(resObj["points"][i].coordinates[0],resObj["points"][i].coordinates[1]);
			stmp1=stmp.transform(geographic,map.getProjection());
			points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp1,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))},null)]);
		    }
		}catch(e){alert(e);}

#if $m.web.metadata.get('layout_t')=="mobile"
	\$.mobile.hidePageLoadingMsg();
	\$("#toolbarLink").attr("href","#routingPage");
	\$("#routingInfo").removeClass("hidden");
	\$("#routingSave").removeClass("hidden");
	\$("#routingProfile").removeClass("hidden");
	\$("#routingDownload").removeClass("hidden");
#else
	\$("#routingProfile").removeClass("hidden");
#end if
		
		System.toLoad=resObj.trace;
		System.mapUrl="$conf["main"]["mapserverAddress"]?map=$conf["main"]["dataPath"]/Paths/Saved_Result_"+System.toLoad+".map";
		if(!route_layer){
		route_layer=new OpenLayers.Layer.WMS("Result",
						     "$conf["main"]["mapserverAddress"]?map=$conf["main"]["dataPath"]/Paths/Saved_Result_"+System.toLoad+".map",
						     {layers: "Result",format: "image/png"},
						     {isBaseLayer: false, singleTile: false, ratio: 1}
						    );
		map.addLayer(route_layer);
		}
		
		try{
		    map.setLayerIndex(points_layer,map.layers.length-2);
		    map.setLayerIndex(route_layer,map.layers.length-4);
		    if(route_layer1)
		    map.setLayerIndex(route_layer1,map.layers.length-5);
		}catch(e){}
		route_layer.setVisibility(true);
		\$.ajax({
		    type: "GET",
	  	    url: "$conf["main"]["mapserverAddress"]?map=$conf["main"]["dataPath"]/Paths/Saved_Result_"+System.toLoad+".map&service=WMS&version=1.0.0&request=GetCapabilities",
	  	    dataType: "xml",
	  	    complete: function(xml,status) {
			var localCnt=0;
			var tmp=\$(xml.responseXML).find("Layer").each(
			    function(){
				\$(this).find('Layer').each(
				    function(){
					\$(this).find('LatLonBoundingBox').each(
					    function(){
						var tmp=new OpenLayers.Bounds(\$(this).attr("minx"),\$(this).attr("miny"),\$(this).attr("maxx"),\$(this).attr("maxy"));
						tmp.transform(geographic,mercator);
						System.curExtent=tmp;
						map.zoomToExtent(tmp);
						
#if $m.web.metadata.get('layout_t')=="mobile"
						\$('#mapPage').trigger("pageshow"); 
						\$.mobile.changePage("#mapPage");
#end if
						RoutingDisplayStep(0);
						try{
						    
						    startpoint = points_layer.features[0].geometry.clone();
						    startpoint.transform(mercator, geographic);
		    
						    finalpoint = points_layer.features[1].geometry.clone();
						    finalpoint.transform(mercator, geographic);
						    
						    System.inputs1=System.zooUrl+"?metapath=vector-tools&amp;service=WPS&amp;version=1.0.0&amp;request=Execute&amp;Identifier=UnionOneGeom&amp;DataInputs=InputEntity=Reference@xlink:href="+encodeURIComponent(System.mapUrl+"&service=WFS&version=1.0.0&request=GetFeature&typename=Result")+"&amp;RawDataOutput=Result"
						    requestProfile();
						}catch(e){alert(e);}
						
					    }
					);
					localCnt+=1;
				    }
				);
			    });
		    }});	
#if $m.web.metadata.get('layout_t')=="mobile"
	\$.mobile.hidePageLoadingMsg();
#end if
            }
	});
    }catch(e){
	alert(e);
    }
}

function deleteTrace(){
    try{
    var params=[
	{name: "trace",value: arguments[0],dataType: "string"}
    ];
    var data=WPSGetHeader("removeRoute")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
	tmp=arguments[0];
    $.ajax({
      type: "POST",
	  url: System.zooUrl+"?metapath=routing",
	  contentType: 'text/xml',
	  data: data,
	tmp: tmp,
	  complete: function(xml,status) {
	      listSavedPaths();
#if $m.web.metadata.get('layout_t')!="mobile"
	      removeGCPWindow();
	      loadGCPWindow("windows/popupmessage?msg="+"$zoo._('Route deleted')","$zoo._('Information')",300,50);
#end if
		  
        }
      });
    }catch(e){
	alert(e);
    }
}

function addOption(){
    var o = new Option(arguments[1][1],arguments[1][0]);
    \$(o).html(arguments[1][1]);
    \$("#"+arguments[0]).append(o);
}

function listSavedPaths(){
    try{
	var params=[
	    {name: "trace",value: arguments[0],dataType: "string"}
	];
	var data=WPSGetHeader("listRoute")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
	tmp=arguments[0];
	$.ajax({
	    type: "POST",
	    url: System.zooUrl+"?metapath=routing",
	    contentType: 'text/xml',
	    data: data,
	    tmp: tmp,
	    complete: function(xml,status) {
		var results=\$.parseJSON(xml.responseText);
		\$("#select_sauvegardes").html("");
		for(i=0;i<results.length;i++){
		    var o = new Option(results[i][1],results[i][0]);
		    \$(o).html(results[i][1]);
		    \$("#select_sauvegardes").append(o);
		    results
		}
            }
	});
    }catch(e){
	alert(e);
    }
}

function routingSave(){
    try{
	var params=[
	    {name: "url",value: System.mapUrl,dataType: "string"},
	    {name: "name",value: \$("#rname").val(),dataType: "string"}
	];
	for(var i=0;i<points_layer.features.length;i++){
	    var geo=points_layer.features[i].geometry;
	    var tmp=geo.transform(mercator,geographic);
	    params[params.length]={name: "point",value: tmp.x+","+tmp.y ,dataType: "string"};
	}
	System.shouldDisplay=true;
	if(arguments.length==1){
	    params[params.length]={name: "user",value: "anonymous",dataType: "string"};
	    System.shouldDisplay=false;
	}
	var data=WPSGetHeader("saveRouteForUser")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
	$.ajax({
	    type: "POST",
	    url: System.zooUrl+"?metapath=routing",
	    contentType: 'text/xml',
	    data: data,
	    complete: function(xml,status) {
		if(System.shouldDisplay){
#if $m.web.metadata.get('layout_t')!="mobile"
		    removeGCPWindow();
#end if
		    listSavedPaths();
#if $m.web.metadata.get('layout_t')!="mobile"
		    loadGCPWindow("windows/popupmessage?msg="+"$zoo._('The route has been saved into your routes history.')","$zoo._('Information')",400,50);
#end if
		}else{
		    System.shouldDisplay=true;
		    if(System.toCall)
			System.toCall(xml.responseText);
		}
            }
	});
    }catch(e){
	alert(e);
    }
}

function saveNews(){
    try{
	var params=[
	    {name: "title",value: \$("#ntitle").val(),dataType: "string"},
	    {name: "content",value: \$("#ncontent").val(),dataType: "string"}
	];
	if(points_layer.features && points_layer.features.length)
	    for(var i=0;i<points_layer.features.length;i++){
		var geo=points_layer.features[i].geometry;
		var tmp=geo.transform(mercator,geographic);
		params[params.length]={name: "point",value: tmp.x+","+tmp.y ,dataType: "string"};
	    }
	else{
	    params[params.length]={name: "lat",value: \$("#nlat").val(),dataType: "string"};
	    params[params.length]={name: "long",value: \$("#nlong").val(),dataType: "string"};
	}
	params[params.length]={name: "type",value: "2",dataType: "string"};
	if(\$("#ntype0")[0].checked)
	    params[params.length]={name: "type_incident",value: \$("#ntype0").val(),dataType: "string"};
	else
	    params[params.length]={name: "type_incident",value: \$("#ntype1").val(),dataType: "string"};
	
	var data=WPSGetHeader("savePOIUser")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
#if $m.web.metadata.get('layout_t')=="mobile"
    $.mobile.showPageLoadingMsg();
#end if
	$.ajax({
	    type: "POST",
	    url: System.zooUrl+"?metapath=routing",
	    contentType: 'text/xml',
	    data: data,
	    complete: function(xml,status) {
		RoutingReinit();
		//loadGCPWindow(false,'Actualités',300,200,{txt: xml.responseText});
		loadGCPWindow("windows/popupmessage?msg="+"$zoo._('The reported incident has been recorded. Thank you for your participation.')","$zoo._('Information')",400,50);
#if $m.web.metadata.get('layout_t')=="mobile"
	\$.mobile.hidePageLoadingMsg();
#end if
            }
	});
    }catch(e){
	alert(e);
    }
}

var startpoint = false;
var finalpoint = false;
var url=false;
System.mapUrl="";
var searchFunction;
var btRecherche="";

function runRouting(layer){
#if $m.web.metadata.get('layout_t')=="mobile"
    $.mobile.showPageLoadingMsg();
#end if
    System.routingProfileComputed=false;
    // transform the two geometries from EPSG:900913 to EPSG:4326
    startpoint = layer.features[0].geometry.clone();
    startpoint.transform(mercator, geographic);
	
    finalpoint = layer.features[1].geometry.clone();
    finalpoint.transform(mercator, geographic);
    
    var interpoint=[];
    suffix="";
    for(var i=2;i<layer.features.length;i++){
	interpoint.push(layer.features[i].geometry.clone());
	interpoint[interpoint.length-1].transform(mercator, geographic);
	suffix+=","+interpoint[interpoint.length-1].x+","+interpoint[interpoint.length-1].y;
    }
    
    if(route_layer){
	try{
	    map.removeLayer(route_layer);
	    map.removeLayer(route_layer1);
	    route_layer=false;
	    route_layer1=false;
	}catch(e){}
    }
    
#if $m.web.metadata.get('layout_t')=="mobile"
    \$("#routingInfo").addClass("hidden");
    \$("#routingDownload").addClass("hidden");
#end if
    \$("#routingProfile").addClass("hidden");
    \$("#routingSave").addClass("hidden");
    requestedProfile=false;
    \$.ajax({
	type: "GET",
	url: zooUrl+"?metapath=routing&service=WPS&request=Execute&version=1.0.0&Identifier=do&DataInputs=startPoint="+startpoint.x+","+startpoint.y+suffix+";endPoint="+finalpoint.x+","+finalpoint.y+(\$("#pp2")[0].checked?";priorize=true":(\$("#pp0")[0].checked?";distance=true":""))+"&ResponseDocument=Result@asReference=true@mimeType=application/json@useMapserver=true@mimeType=application/json",
	dataType: 'xml',
	complete:function(xml,status){
	    if(status=="success"){
		if(!checkWPSResult(xml,false)){
		    loadGCPWindow("windows/popupmessage?msg="+"$zoo._('Please set flags on a road or near by')","$zoo._('Information')",400,50);	
		    //\$("#bt_recherche").removeAttr("disabled");
		    if(btRecherche!=""){
			document.getElementById(btRecherche).onclick = searchFunction;
		    }
#if $m.web.metadata.get('layout_t')!="mobile"
		    removeGCPWindow();
#end if
		    \$("#link_export").hide();
		    \$("#link_print").hide();
		    return;
		}
#if $m.web.metadata.get('layout_t')=="mobile"
		\$.mobile.hidePageLoadingMsg();
		\$("#toolbarLink").attr("href","#routingPage");
		\$("#routingInfo").removeClass("hidden");
		\$("#routingSave").removeClass("hidden");
		\$("#routingProfile").removeClass("hidden");
		\$("#routingDownload").removeClass("hidden");
#else
		\$("#routingProfile").removeClass("hidden");
#end if
		//backButtonForGeocoding("#routingPage");
#if $m.web.metadata.get('layout_t')=="mobile"
		\$('#mapPage').trigger("pageshow"); 
		\$.mobile.changePage("#mapPage");
#end if
		if(route_layer){
		    try{
			map.removeLayer(route_layer);
			route_layer=false;
			map.removeLayer(route_layer1);
			route_layer1=false;
		    }catch(e){}
		}
		/*if(!System.selectPoi)
		    hideProfil('false');*/
		var mapUrl="";
		
		\$(xml.responseXML).find("wps\\:Reference").each(function(){var tmp=this.getAttribute('href').split('\&');mapUrl=tmp;});
		\$(xml.responseXML).find("Reference").each(function(){var tmp=this.getAttribute('href').split('\&');mapUrl=tmp;});
		
		/**
		 * Display the resulting WMS layer
		 */
		var tmp=mapUrl[0].split("=");
		route_layer=new OpenLayers.Layer.WMS("Result",
						     mapUrl[0],
						     {layers: "Result",format: "image/png"},
						     {isBaseLayer: false, singleTile: false, ratio: 1}
						    );
		map.addLayers([route_layer]);
		try{
		    map.setLayerIndex(route_layer,map.layers.length-4);
		}catch(e){}
		
		\$.ajax({
		    type: "GET",
		    url: zooUrl+"?metapath=routing&service=WPS&request=Execute&version=1.0.0&Identifier=applyStyleToRouteMap&DataInputs=map="+tmp[1]+"&RawDataOutput=Result",
		    dataType: 'xml',
		    complete:function(xml,status){
			route_layer.redraw(true);
			if(btRecherche!=""){
			    document.getElementById(btRecherche).onclick = searchFunction;
			}
#if $m.web.metadata.get('layout_t')!="mobile"
			removeGCPWindow();
#end if
		    }
		});
		
		System.mapUrl=mapUrl[0];
		\$.ajax({
		    type: "GET",
  		    url: mapUrl[0]+"&service=WMS&version=1.0.0&request=GetCapabilities",
  		    dataType: "xml",
  		    complete: function(xml,status) {
			var localCnt=0;
			var tmp=\$(xml.responseXML).find("Layer").each(
			    function(){
				\$(this).find('Layer').each(
				    function(){
					\$(this).find('LatLonBoundingBox').each(
					    function(){
						var tmp=new OpenLayers.Bounds(\$(this).attr("minx"),\$(this).attr("miny"),\$(this).attr("maxx"),\$(this).attr("maxy"));
						tmp.transform(geographic,mercator);
						System.curExtent=tmp;
						//alert("ok");
						map.zoomToExtent(tmp);
						//alert("ok");
						//System.mapUrl=mapUrl[0];
						//alert("ok");
						RoutingDisplayStep(0);
						//alert("ok");
						\$("#link_export").show();
						\$("#link_print").show();
					    }
					);
				    }
				);
			    });
			//map.addLayers([route_layer]);
#if $m.web.metadata.get('layout_t')!="mobile"
			System.inputs1=System.zooUrl+"?metapath=vector-tools&amp;service=WPS&amp;version=1.0.0&amp;request=Execute&amp;Identifier=UnionOneGeom&amp;DataInputs=InputEntity=Reference@xlink:href="+encodeURIComponent(System.mapUrl+"&service=WFS&version=1.0.0&request=GetFeature&typename=Result")+"&amp;RawDataOutput=Result"
			//alert(System.selectPoi);
			if(!System.selectPoi)
			    requestProfile();
			else
			    getSitesAround();
#end if		      
		    }});
		//getSitesAround();
		
		
		//alert(mapUrl);
	    }
	}
    });
    
    suffix="";
    var layer=points_layer;
    for(var i=2;i<layer.features.length;i++){
	interpoint.push(layer.features[i].geometry.clone());
	interpoint[interpoint.length-1].transform(mercator, geographic);
	suffix+=","+interpoint[interpoint.length-1].x+","+interpoint[interpoint.length-1].y;
    }
    
    url="/cgi-bin/zoo_loader.cgi?metapath=routing&service=WPS&request=Execute&version=1.0.0&Identifier=computeRouteProfile&DataInputs=startPoint="+startpoint.x+","+startpoint.y+suffix+";endPoint="+finalpoint.x+","+finalpoint.y+";mult=15&RawDataOutput=Result";

}

function pgrouting(layer) {
    btRecherche="";
#if $m.web.metadata.get('layout_t')!="mobile"
    hideProfil('true');
    initFdrMode();
#end if
    if (layer.features.length >= 2) {
	if(arguments.length>1){
	    btRecherche = arguments[1].toString();
	    searchFunction = document.getElementById(btRecherche).onclick;
	    document.getElementById(btRecherche).onclick = '';
	}
	//\$("#bt_recherche").removeAttr("onclick");
#if $m.web.metadata.get('layout_t')!="mobile"
	loadGCPWindow('windows/chargement','$zoo._("Calculation in progress ...")',385,40,null,function(){},function(){
	    runRouting(layer);
	});	
#else
	runRouting(layer);
#end if
    }
    
}

function stringTimeToMinutes(time) {
    time = time.split(/:/);
    return time[0] * 3600 + time[1] * 60;
}

function decimalTimeToHourMinutes(minutes) {
    var nbHeures = Math.floor(minutes);
    var nbMinutes = minutes - Math.floor(minutes);
    //alert("nb minutes = " + nbMinutes);
    nbMinutes = nbMinutes*60;
    nbMinutes = Math.round(nbMinutes);
    if(nbMinutes==60){
	nbHeures+=1;
	nbMinutes = 0;
    }
    znbMinutes = nbMinutes.toString();
    if(znbMinutes.length==1)
	znbMinutes = "0"+znbMinutes;
    return nbHeures + "h" + znbMinutes;
}

function calculDistance(time,speed){
    return (time * speed)/3600;
}

function calculTempsParcours(distance,speed){
    return distance/speed;
}


function drivingDistance(layer,mode) {
    btRecherche="";
#if $m.web.metadata.get('layout_t')!="mobile"
    initFdrMode();
#end if
    if (layer.features.length == 1) {
	
#if $m.web.metadata.get('layout_t')=="mobile"
	$.mobile.showPageLoadingMsg();
#else
	if(arguments.length>2){
	    btRecherche = arguments[2].toString();
	    //alert(btRecherche);
	    searchFunction = document.getElementById(btRecherche).onclick;
	    document.getElementById(btRecherche).onclick = '';
	}
	loadGCPWindow('windows/chargement','$zoo._("Calculation in progress ...")',385,40);
#end if
	// transform the two geometries from EPSG:900913 to EPSG:4326
	startpoint = layer.features[0].geometry.clone();
	startpoint.transform(mercator, geographic);
	
	if(dd_layer){
	    try{
		map.removeLayer(dd_layer);
		dd_layer=false;
		/*map.removeLayer(route_layer1);
		route_layer1=false;*/
	    }catch(e){}
	}
	
	var distance;
	if(mode=="rayon"){
	    distance = \$("#dd_distance").val();
	}
	else if(mode=="temps"){
	    
	    var time = stringTimeToMinutes(\$("#dd_time").val());
	    //alert("time:"+time);
	    var speed = \$("#dd_speed").val();
	    //alert("speed:"+speed);
	    distance = calculDistance(time,speed);
	}
	//alert("distance = "+distance+"km");
	
	\$.ajax({
	    type: "GET",
	    url: zooUrl+"?metapath=routing&service=WPS&request=Execute&version=1.0.0&Identifier=doDDPolygon&DataInputs=startPoint="+startpoint.x+","+startpoint.y+";distance="+((\$("#dd_distance").val()*1000)/111120)+"&ResponseDocument=Result@asReference=true@mimeType=image/png",
	    dataType: 'xml',
	    complete:function(xml,status){
		if(status=="success"){	
		    //alert("success dd");
#if $m.web.metadata.get('layout_t')=="mobile"
		    \$.mobile.hidePageLoadingMsg();
		    \$("#toolbarLink").attr("href","#ddPage");
#end if
		    //backButtonForGeocoding("#routingPage");
#if $m.web.metadata.get('layout_t')=="mobile"
		    \$('#mapPage').trigger("pageshow"); 
		    \$.mobile.changePage("#mapPage");
#end if
		    if(!checkWPSResult(xml,false,false)){
			try{
			    if(\$( "#loadgcp-window" ).length>0){
				\$("#loadgcp-window").remove();
			    }
			}catch(e){}
			initChamps();
			removeAllFeatures();
			if(btRecherche!=""){
			  document.getElementById(btRecherche).onclick = searchFunction;
			}
			// We sould probably add here some window providing information to the user that something went wrong when processing his request.
			return false;
		    }
		    var mapUrl="";
		    var mapUrl1="";
		    \$(xml.responseXML).find("wps\\:Reference").each(function(){mapUrl1=this.getAttribute('href');var tmp=this.getAttribute('href').split('\&');mapUrl=tmp;});
		    \$(xml.responseXML).find("Reference").each(function(){mapUrl1=this.getAttribute('href');var tmp=this.getAttribute('href').split('\&');mapUrl=tmp;});
		    dd_layer=new OpenLayers.Layer.WMS("ResultDDP",
						      mapUrl[0],
						      {layers: "Result",format: "image/png"},
						      {isBaseLayer: false}
						     );
		    dd_layer.setVisibility(true);
		    map.addLayers([dd_layer]);
		    try{
			map.setLayerIndex(dd_layer,map.layers.length-4);
		    }catch(e){}
		    System.mapUrl=mapUrl;
		    
		    if(btRecherche!=""){
			document.getElementById(btRecherche).onclick = searchFunction;
		    }
#if $m.web.metadata.get('layout_t')!="mobile"
		    removeGCPWindow();
#end if
		    System.selectPoi=true;
		    
		    for(var i=0;i<layersList.length;i++){
			if(layersList[i].real_name=="Sites"){
			    layersList[i].setVisibility(true);
			    layersList[i].removeFeatures(layersList[i].features);
			}
		    }

		    loadGCPWindow('windows/selectitineraire','Sélection itinéraire',400,350,
				  null,
				  function(){
				      if(System.func){
					  //initChamps();
					  //removeAllFeatures();
					  //mmLayout.open('west');
					  removePolygon();
					  if(System.selectPoi && points_layer.features.length>1)
					      points_layer.removeFeatures([points_layer.features[points_layer.features.length-1]]);
					  System.func=false;
					  System.selectPoi=flase;
				      }
				  },
				  function(){ 
				      try{
					  \$.ajax({
					      type: "GET",
  					      url: System.mapUrl[0]+"&service=WMS&version=1.0.0&request=GetCapabilities",
  					      dataType: "xml",
  					      complete: function(xml,status) {
						  var localCnt=0;
						  var tmp=\$(xml.responseXML).find("Layer").each(
						      function(){
							  \$(this).find('Layer').each(
							      function(){
								  \$(this).find('LatLonBoundingBox').each(
								      function(){
									  var tmp=new OpenLayers.Bounds(\$(this).attr("minx"),\$(this).attr("miny"),\$(this).attr("maxx"),\$(this).attr("maxy"));
									  tmp1=tmp.clone();
									  tmp.transform(geographic,mercator);
									  System.curExtent=tmp;
									  map.zoomToExtent(tmp);
									  //alert(tmp1);
									  var params=[
									      {"name":"InputEntity1","xlink:href":mapUrl[0]+"&amp;service=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename=Result","mimeType":"text/xml"},
									      {"name":"InputEntity2","xlink:href":"$conf["main"]["mapserverAddress"]?service=WFS&amp;request=GetFeature&amp;version=1.0.0&amp;typename=Sites&amp;bbox="+tmp1+"&amp;map="+System.mapfile,"mimeType":"text/xml"}
									  ];
									  var data=WPSGetHeader("Intersection")+WPSGetInputs(params)+WPSGetOutput({name: "Result"})+WPSGetFooter();
									  $.ajax({
									      type: "POST",
									      url: System.zooUrl+"?metapath=vector-tools",
									      contentType: 'text/xml',
									      data: data,
									      complete: function(xml,status) {
										  try{
										      for(var i=0;i<layersList.length;i++){
											  if(layersList[i].real_name=="Sites"){
											      var results=\$.parseJSON(xml.responseText);
											      layersList[i].setVisibility(true);
											      layersList[i].removeFeatures(layersList[i].features);
											      //alert(layersList[i].features.length);
											      for(var j=0;j<results.features.length;j++){
												  var stmp=new OpenLayers.Geometry.Point(results.features[j].geometry.coordinates[0],results.features[j].geometry.coordinates[1]);
												  var extent= new OpenLayers.Bounds(stmp.x-0.001,stmp.y-0.001,stmp.x+0.001,stmp.y+0.001);
												  stmp.transform(geographic,mercator);
												  layersList[i].addFeatures([new OpenLayers.Feature.Vector(stmp,results.features[j].properties)]);

											      }
											      //alert(layersList[i].real_name);
											      //layersList[i].redraw(false);
											      map.setLayerIndex(layersList[i],map.layers.length-2);
											      //alert(layersList[i].features.length);
											  }
										      }
										      //loadPOI(xml);
										  }catch(e){
										      alert("Handled error: "+e);
										  }
									      }
									  });
									  System.mapUrl=mapUrl[0];
									  RoutingDisplayStep(0);
									  \$("#link_export").show();
									  \$("#link_print").show();
								      }
								  );
							      }
							  );
						      });
						  //map.addLayers([dd_layer]);
					      }
					  });
				      }catch(e){alert(e);}
				  });
		    
		}
		else{
		    //alert("echec dd");
		    if(btRecherche!=""){
			document.getElementById(btRecherche).onclick = searchFunction;
		    }
#if $m.web.metadata.get('layout_t')!="mobile"
		    removeGCPWindow();
#end if
		    \$("#link_export").hide();
		    \$("#link_print").hide();
		}
	    }
	});
    }
}


function loadPOI(){
    var results=\$.parseJSON(arguments[0].responseText);
    System.addresses=new Array();
    \$('#select_itineraire').empty();
    for(var i=0;i<results.features.length;i++){
	try{
	    System.addresses[i]=results.features[i];
	    var o = new Option(results.features[i].properties["NOM_SITE"],i);
	    \$(o).html(results.features[i].properties["NOM_SITE"]);
	    \$("#select_itineraire").append(o);
	    \$(o).hover(function(){
		if(this.parentNode.selectedIndex<0 && !this.parentNode.multiple)
		    try{
			addPOI(System.addresses[this.value].geometry);
		    }catch(e){}
		else
		    if(this.parentNode.multiple){
			addPOI(System.addresses[this.value].geometry);
		    }
	    });
	    \$(o).click(function(){
		try{
		    if(!this.parentNode.multiple){
			points_layer.removeFeatures([points_layer.features[points_layer.features.length-1]]);
		    }
		    addPOI(System.addresses[this.value].geometry);
		}catch(e){}
	    });
	}catch(e){
	    alert(e);
	}
    }
}

function addPOI(){
    if(!System.flagStep){
	if(points_layer.features.length>=2)
	    points_layer.removeFeatures(points_layer.features[points_layer.features.length-1]);
	var geometry=arguments[0];
	var stmp=new OpenLayers.Geometry.Point(geometry.coordinates[0],geometry.coordinates[1]);
	var extent= new OpenLayers.Bounds(stmp.x-0.001,stmp.y-0.001,stmp.x+0.001,stmp.y+0.001);
	stmp.transform(geographic,mercator);
	points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))})]);
    }else{
	var nb=0;
	var  opts=\$("#select_itineraire")[0].options;
	for(var i=0;i<opts.length;i++)
	    if(opts[i].selected){
		nb+=1;
	    }
	if(nb==1)
	    nb=0;
	var len=points_layer.features.length;
	//alert(len+" "+nb);
	for(var i=2;i<len;i++)
	    points_layer.removeFeatures(points_layer.features[points_layer.features.length-1]);
	for(var i=0;i<opts.length;i++)
	    if(opts[i].selected){
		var geometry=System.addresses[i].geometry;
		var stmp=new OpenLayers.Geometry.Point(geometry.coordinates[0],geometry.coordinates[1]);
		var extent= new OpenLayers.Bounds(stmp.x-0.001,stmp.y-0.001,stmp.x+0.001,stmp.y+0.001);
		stmp.transform(geographic,mercator);
		points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))})]);
	    }
    }
}



function routingDownload(){
#if $m.web.metadata.get('layout_t')=="mobile"
    $.mobile.showPageLoadingMsg();
#end if
    var tmp=System.mapUrl.split('=');
    var tmp1=tmp[1].split('_');
    var tmp2=tmp1[1].split('.');
    \$.ajax({
        type: "GET",
	dataType: "html",
	url: "/cgi-bin/zoo_loader.cgi?metapath=vector-converter&request=Execute&service=WPS&version=1.0.0&Identifier="+(arguments[0]?"convertTo":"convertToKML")+"&DataInputs=InputDSTN=${conf["main"]["dataPath"]}/ZOO_DATA_Result_"+tmp2[0]+".json"+(arguments[0]?";format="+arguments[0]:"")+"&RawDataOutput=Result",
	success: function(xml){
#if $m.web.metadata.get('layout_t')=="mobile"
	    $.mobile.hidePageLoadingMsg();
#end if
	    \$("#export_dl_link").attr("href",xml);
	    \$("#export_dl_link").show();
	    \$('#routingDownloadContainer').attr('href',xml);
	}
    });  
}

function routingDetailsNext_old(){
    if(arguments[0]>=0)
	RoutingDisplayStep(System.routingCnt+2);
    else{
	if(System.routingCnt-2>0)
	    RoutingDisplayStep(System.routingCnt-2);
	else
	    RoutingDisplayStep(0);
    }
    //\$('#routingDetailsPage').page('destroy').page(); 
}

function routingDetailsNext(){
    if(arguments[0]>=0)
	RoutingDisplayStep(System.routingCnt+9);
    else{
	if(System.routingCnt-9>0)
	    RoutingDisplayStep(System.routingCnt-9);
	else
	    RoutingDisplayStep(0);
    }
}

System.pictos={
#import authenticate.service as auth
#import psycopg2
#set dbstr=auth.parseDb($conf["velodb"])
#set con=psycopg2.connect($dbstr)
#set cur=con.cursor()
#set ret=cur.execute("SELECT name,filename from velo.amenagements")
#set res=cur.fetchall()
#set j=0
#for i in $res
    "$i[0]": "$i[1]"#if $j+1<len($res)#,#end if#
#set j=$j+1
#end for
};

System.pictosRev={
#set cur=con.cursor()
#set ret=cur.execute("SELECT name,filename from velo.revetements")
#set res=cur.fetchall()
#set j=0
#for i in $res
    "$i[0]": "$i[1]"#if $j+1<len($res)#,#end if#
#set j=$j+1
#end for
};

function routingDisplayCurrentStep(){
    if(arguments[0]>=0){
	//alert("System.routingCnt => Etape" + arguments[0]);
	// alert('previous='+previousIdStepDisplayed + ' ,current='+currentIdStepDisplayed + ', now=' + arguments[0]);
	// if(currentIdStepDisplayed == arguments[0]){
	// previousIdStepDisplayed = currentIdStepDisplayed;
	// \$("#step_"+previousIdStepDisplayed).removeClass('step_selected');
	// currentIdStepDisplayed = 0;
	// previousIdStepDisplayed = -1;
	// routingZoomOnStepsFDR(-1);
	// }
	// else{
	routingZoomOnStepsFDR(arguments[0]);
	previousIdStepDisplayed = currentIdStepDisplayed;
	\$("#step_"+previousIdStepDisplayed).removeClass('step_selected');
	currentIdStepDisplayed = arguments[0];
	\$("#step_"+currentIdStepDisplayed).addClass('step_selected');
	\$("#step_"+currentIdStepDisplayed).focus();
	//}
    }
}

function routingDisplayPreviousStep(){
    previousIdStepDisplayed = currentIdStepDisplayed;
    \$("#step_"+previousIdStepDisplayed).removeClass('step_selected');
    currentIdStepDisplayed -= 1;
    if(currentIdStepDisplayed < 0)
	currentIdStepDisplayed = 0;
    routingDisplayCurrentStep(currentIdStepDisplayed);
}

function routingDisplayNextStep(){
    previousIdStepDisplayed = currentIdStepDisplayed;
    \$("#step_"+previousIdStepDisplayed).removeClass('step_selected');
    currentIdStepDisplayed += 1;
    //alert("nbSteps = " + nbSteps);
    if(currentIdStepDisplayed > nbSteps)
	currentIdStepDisplayed = nbSteps;
    routingDisplayCurrentStep(currentIdStepDisplayed);
}

function StopRoutingFDR(){
    routingDisplayCurrentStep(0);
    currentIdStepDisplayed = 0;
    previousIdStepDisplayed = -1;
}

var modePictos = "amenagement";
function ChangeRoutingDisplayStepMode(){
    System.routingCnt-=1;
    RoutingDisplayStep(0);
}

function RoutingDisplayStep(){
    System.routingCnt=arguments[0]+1;
    // if(arguments.length>1){
    // modePictos = arguments[1];	
    // }
    // alert("mode = " + modePictos);
    
#if $m.web.metadata.get('layout_t')=="mobile"
    $.mobile.showPageLoadingMsg();
    
    \$.ajax({
	type: "GET",
	dataType: "xml",
	url: System.mapUrl+"&request=GetFeature&service=WFS&version=1.0.0&typename=Result&featureid=Result."+(arguments[0])+",Result."+(arguments[0]+1)+",Result."+(arguments[0]+2)+",Result."+(arguments[0]+3)+",Result."+(arguments[0]+4),
	success: function(xml){
	    var gml = new OpenLayers.Format.GML();
	    var features=gml.read(xml);
	    if(features.length<2){
		$.mobile.hidePageLoadingMsg();
		System.routingCnt-=1;
		return;
	    }
	    var data=[];
	    var j=0;
	    var nbkm = 0;
	    System.steps=[];
	    System.stepsFDR=[];
	    for(var i=0;i<5;i++){
		\$("#_route_"+i).empty();
	    }
	    for(i in features){
		if(features[i].data){
		    var tmp=(features[i].data["length"]*111120)+"";
		    var tmp1=tmp.split(".");
		    
		    var dtype="revetement"
		    var curPicto="$conf["main"]["publicationUrl"]/img/design/amenagements/"+(features[i].data["tid"]!="1"?"route_danger.png":System.pictos[features[i].data[dtype]]);
		    \$('<span>Étape '+eval(System.routingCnt+"+"+i)+" : "+"avancez pendant "+(tmp1[0])+' mètres sur '+(features[i].attributes["name"]?features[i].attributes["name"]:"voie inconnue")+'.<img src="'+curPicto+'" title="'+features[i].data[dtype]+'" alt="'+features[i].data["nature"]+'" />'+"</span>")
			.appendTo(\$("#_route_"+i));
		    \$("#_route_"+i).parent().listview();
		}
		//alert(features[i].geometry);
		features[j].geometry=features[j].geometry.transform(geographic,map.getProjectionObject());
		System.steps[j]=features[j];
		System.stepsFDR[j]=features[j];
		j++;
	    }
	    $.mobile.hidePageLoadingMsg();
	}});
#else
    \$("#fdr_cadre").empty();
    \$.ajax({
        type: "GET",
	dataType: "xml",
	url: System.mapUrl+"&request=GetFeature&service=WFS&version=1.0.0&typename=Result"/*&featureid=Result."+(arguments[0])+",Result."+(arguments[0]+1)+",Result."+(arguments[0]+2)+",Result."+(arguments[0]+3)+",Result."+(arguments[0]+4)+",Result."+(arguments[0]+5)+",Result."+(arguments[0]+6)+",Result."+(arguments[0]+7)+",Result."+(arguments[0]+8)+",Result."+(arguments[0]+9)*/,
	success: function(xml){
	    var gml = new OpenLayers.Format.GML();
	    try{
	    var features=gml.read(xml);
	    // if(features.length<8){
	    // System.routingCnt-=1;
	    // clearTimeout(timeOut);
	    // return;
	    // }
	    var data=[];
	    var j=0;
	    var nbkm = 0;
	    var tempsParcours = 0;
	    System.steps=[];
	    System.stepsFDR=[];
	    for(var i=0;i<10;i++){
		\$("#_route_"+i).empty();
	    }
	    //alert("nb Features = " + features.length);
	    for(i in features){
	        if(features[i].data){
		    var tmp=(features[i].data["length"]*111120)+"";
		    var tmp1=tmp.split(".");
		    var classStep;
		    
		    // Elimination des étapes sur 0 mètres
		    if(tmp1[0]!=0){
			if(i % 2 == 0)
			    classStep = "step_odd";
			else 
			    classStep = "step_even";
			
			if(j==0)
			    \$('<tr onclick=\'routingDisplayCurrentStep('+i+');\'><td id="step_'+i+'" class="'+classStep+'"><span class="fdr_etape">Départ : '+(features[i].attributes["name"]?features[i].attributes["name"]:"voie inconnue")+".</span></td><td><img id='img_picto"+i+"' class='fdr_img_picto' src='$conf['main']['publicationUrl']/img/design/drapeau_bleu.png' title='Départ' alt='Départ'/></td></tr>").appendTo(\$("#fdr_cadre"));
			else if (j==features.length-1) 
			    \$('<tr onclick=\'routingDisplayCurrentStep('+i+');\'><td id="step_'+i+'" class="'+classStep+'"><span class="fdr_etape">Arrivée : '+(features[i].attributes["name"]?features[i].attributes["name"]:"voie inconnue")+".</span></td><td><img id='img_picto"+i+"' class='fdr_img_picto' src='$conf['main']['publicationUrl']/img/design/drapeau_rouge.png' title='Arrivée' alt='Arrivée'/></td></tr>").appendTo(\$("#fdr_cadre"));
			else
			{
			    var idEtape = i-1;
			    var curPicto="";
			    var titlePicto="";
			    if(currentFdrMode=='amenagement'){
				curPicto = "$conf["main"]["publicationUrl"]/img/design/amenagements/"+(features[i].data["tid"]!="1"?"route_danger.png":System.pictos[features[i].data["nature"]]);
				titlePicto = features[i].data["tid"]!="1"?"DANGER: HORS PLAN VÉLO":features[i].data["nature"];
			    }
			    else if(currentFdrMode=='revetement'){
				curPicto = "$conf["main"]["publicationUrl"]/img/design/revetements/"+(features[i].data["tid"]!="1"?"route_danger.png":System.pictosRev[features[i].data["revetement"]]);
				//titlePicto = features[i].data["revetement"];
				titlePicto = features[i].data["tid"]!="1"?features[i].data["nature"]:features[i].data["revetement"];
			    }
			    
			    // \$('<tr onclick=\'routingDisplayCurrentStep('+i+');\'><td id="step_'+i+'" class="'+classStep+'"><span class="fdr_etape">Étape '+eval(System.routingCnt+"+"+idEtape)+" : "+"avancez pendant "+(tmp1[0])+' mètres sur '+(features[i].attributes["name"]?features[i].attributes["name"]:"voie inconnue")+".</span></td><td><img id='img_picto"+i+"' class='fdr_img_picto'  alt0=\""+features[i].data["revetement"]+"\" alt=\""+features[i].data["nature"]+"\" src='"+curPicto+"'/></td></tr>")
			    // .appendTo(\$("#fdr_cadre"));
			    
			    \$('<tr onclick=\'routingDisplayCurrentStep('+i+');\'><td id="step_'+i+'" class="'+classStep+'"><span class="fdr_etape">Étape '+eval(System.routingCnt+"+"+idEtape)+" : "+"avancez pendant "+(tmp1[0])+' mètres sur '+(features[i].attributes["name"]?features[i].attributes["name"]:"voie inconnue")+".</span></td><td><img id='img_picto"+i+"' class='fdr_img_picto' alt='"+titlePicto+"' title='"+titlePicto+"' src='"+curPicto+"'/></td></tr>")
				.appendTo(\$("#fdr_cadre"));
			}
		    }
		}
		
		//alert(features[i].geometry);
		features[j].geometry=features[j].geometry.transform(geographic,map.getProjectionObject());
		System.steps[j]=features[j];
		System.stepsFDR[j]=features[j];
		nbkm += parseInt(tmp1[0])/1000;
		j++;
		
	    }
	    
	    //\$(".fdr_img_picto").tipsy({title: 'alt'});
	    //alert("nb Features end = " + features.length);
	    //alert("nb km = " + nbkm + "km");
	    nbSteps = features.length;
	    nbkm = nbkm.toFixed(2);
	    document.getElementById('distancevalue').innerHTML = nbkm + " km";
	    tempsParcours = calculTempsParcours(nbkm,defaultSpeed);
	    zTemps = decimalTimeToHourMinutes(tempsParcours);
	    document.getElementById('chronovalue').innerHTML = zTemps;
	    document.getElementById('defaultspeedvalue').innerHTML = defaultSpeed + " km/h";
	    nbkm = 0;
	    tempsParcours = 0;
	    }catch(e){
		System.retryRouteDisplay+=1;
		//RoutingDisplayStep(System.cStep);
	    }	    
	}});
#end if
    
}

#if $m.web.metadata.get('layout_t')=="mobile"
function routingFormAddPOI(){
    \$('<li data-role="fieldcontain" id="routingAddedPoi'+System.routingPoiCnt+'">')
	.append(\$('<fieldset class="ui-grid-a"><a data-role="button" onclick="routingForm(\$(\'#interType'+System.routingPoiCnt+'\').val());" class="ui-block-d" data-icon="interPoint" id="interPoint_'+System.routingPoiCnt+'">Étape</a><select id="interType'+System.routingPoiCnt+'" class="ui-block-d" onchange="routingForm(\$(this).val());"><option value="geocodingPage">Rechercher</option><option value="mapPage">Sur la carte</option><option value="mapPage">Ma position</option></select></fieldset>'))
	.appendTo(\$("#routingForm"));
    
    
    \$("#routingAddedPoi"+System.routingPoiCnt).fadeIn( 400, function(){\$(this).trigger("create");\$("#routingForm").listview("refresh");\$('interPoint_'+System.routingPoiCnt).trigger("create");\$('interType'+System.routingPoiCnt).selectmenu("refresh");\$("#routingDeletePoi").removeClass("hidden"); });
    
    
    System.routingPoiCnt+=1;
}

function routingFormDeletePOI(){
    if(System.routingPoiCnt>0){
	System.routingPoiCnt-=1;
	\$('#routingAddedPoi'+System.routingPoiCnt+'').fadeOut( 400, function(){\$(this).remove();\$("#routingForm").listview("refresh");
										//\$('#routingAddedPoi'+index+'').fadeOut( 400, function(){\$(this).remove();\$("#routingForm").listview("refresh");
										points_layer.removeFeatures([points_layer.features[points_layer.features.length-1]]);});
	
	//System.routingPoiCnt=points_layer.features.length;
	if(System.routingPoiCnt==0)
	    \$("#routingDeletePoi").addClass("hidden");
    }
    
    
}
#else
function routingFormAddPOI(){
    //if(System.routingPoiCnt>1){
    if(points_layer.features.length > 1){
	System.routingPoiCnt+=1;
	var currentIndex = System.nbEtapes+2;
	//alert('create Etape' + System.nbEtapes);
	//alert("Add >> Features count="+points_layer.features.length + ", System count="+System.routingPoiCnt);
	\$("#etapes_2").append('<form id="routingAddedPoi'+System.routingPoiCnt+'" action="#" onsubmit="return false;">'+
			       '<div>'+
			       //'<img src="$conf['main']['publicationUrl']/img/design/etape.png" alt="Etape" class="img_recherche" style="margin-bottom:0px;"/>'+
			       '<label class="lb_section_recherche txt_orange_black">$zoo._('STEP')</label>'+
			       '<img id="adresse_add_'+System.routingPoiCnt+'" src="$conf['main']['publicationUrl']/img/design/drapeau_orange.png" title="$zoo._('Set a step place')" class="button-no-border icon_recherche" height="18px" width="16px"'+
			       ' onclick="System.idPoint=\'adresseEtape'+System.nbEtapes+'\';globalResetAction(points_layer,'+currentIndex+');_routingForm();return false;" />'+
			       '<img src="$conf['main']['publicationUrl']/img/design/poi_blue_no_border.png" title="$zoo._('Search a point of interest')" class="button-no-border icon_recherche" height="18px" width="16px" '+ 
			       'onclick="loadGCPWindow(\'windows/selectpoi\',\'$zoo._('POI selection')\',500,290,\'adresseEtape'+ System.nbEtapes+'\');System.idPoint=\'adresseEtape'+System.nbEtapes+'\';globalResetAction(points_layer,'+currentIndex+');return false;"/>'+
			       '</div>'+
			       '<div>'+
			       '<input id="adresseEtape'+System.nbEtapes+'" name="adresseEtape'+System.nbEtapes+'" type="text" class="champ_recherche" value="" onfocus="System.idPoint=\'adresseEtape'+ System.nbEtapes+'\';globalResetAction(points_layer,'+currentIndex+');return false;"  onblur="if(this.value != \'\') {System.nbEtapeFlags +=1;}" onmouseover="this.title=this.value;" />'+
			       '</div>'+
			       '</form>');
	
	\$("#routingAddedPoi"+System.routingPoiCnt).fadeIn( 400, function(){
	    \$("#routingDeletePoi").removeClass("hidden");
	});
	
	// if(System.routingPoiCnt+1>4)
	// \$("#etapes_2").css({"overflow":"auto","height":(\$(document).height()-700)+"px"});
	startSearch1('adresseEtape'+ System.nbEtapes);
	eval('\$( "#adresse_add_'+System.routingPoiCnt+'").draggable({'+
	     'start: function() {'+
	     '	   System.idPoint="adresseEtape'+(System.routingPoiCnt-1)+'";'+
	     '	   globalResetAction(points_layer,'+(System.routingPoiCnt+1)+');'+
	     '	   _routingForm();'+
	     '},'+
	     'stop: function(){'+
	     '	  draw_points.handler.finalize();'+
	     '},'+
	     'scroll: false, revert: true, helper: "clone" });');

	//System.routingPoiCnt=points_layer.features.length;
	System.nbEtapes += 1;	
	//alertAction('routingFormAddPOI end');
    }
}

function routingFormDeletePOI(){
    if(System.nbEtapes>0)
	System.nbEtapes -= 1;
    var currentIndex = System.nbEtapes+2;
    //if(System.nbEtapes>0){
    //alert('delete Etape' + System.nbEtapes);
    //if(points_layer.features.length > 1){
    //alert("Delete > Features count="+points_layer.features.length + ", System count="+System.routingPoiCnt);
    //\$('#routingAddedPoi'+points_layer.features.length).fadeOut( 400, function(){
    \$('#routingAddedPoi'+System.routingPoiCnt).fadeOut( 400, function(){
	\$(this).remove();
	if(points_layer.features.length > 2 && System.nbEtapeFlags > System.nbEtapes){
	    //if(testNbPoints())
	    //points_layer.removeFeatures([points_layer.features[points_layer.features.length-1]]);
	    //alert('delete ' + currentIndex);
	    if(System.nbEtapeFlags>0)
		System.nbEtapeFlags -= 1;
	    points_layer.removeFeatures([points_layer.features[currentIndex]]);
	    //pgrouting(points_layer);
	}
    });
    System.routingPoiCnt-=1;
    //System.routingPoiCnt=points_layer.features.length;
    
    //}
    if(System.routingPoiCnt==0)
	\$("#routingDeletePoi").addClass("hidden");
    
    //alertAction('routingFormDeletePOI end');
}
#end if

// Compare le nombre réel de points et le nombre attendu
function testNbPoints(){
    alert("Features count="+points_layer.features.length + ", System count="+System.routingPoiCnt);
    if(points_layer.features.length == System.routingPoiCnt)
	return true;
    else
	return false;
}

function routingZoomOnSteps(){
    // if(route_layer2.length>0)
    // route_layer2.removeFeatures(route_layer2.features);
    if(!route_layer1){
	route_layer1 = new OpenLayers.Layer.Vector("Route details",{
	styleMap: new OpenLayers.Style({
	    fillColor:"red",
	    fillOpacity:1,
	    strokeOpacity:1,
	    fillColor:"red",
	    strokeColor:"red",
	    pointRadius: 10,
	    strokeWidth:16
	}),renderers: System.renderer
	});
	map.addLayers([route_layer1]);
    }
    else
        route_layer1.removeFeatures(route_layer1.features);
    map.setLayerIndex(route_layer1,map.layers.length-5);
    route_layer1.addFeatures(System.steps);
    map.zoomToExtent(route_layer1.getDataExtent());
}

function routingZoomOnStepsFDR(index){
    // if(route_layer1.length>0)
    // route_layer1.removeFeatures(route_layer1.features);
    if(!route_layer2){
	route_layer2 = new OpenLayers.Layer.Vector("Route details",{
	    styleMap: new OpenLayers.Style({
		fillOpacity:1,
		strokeOpacity:1,
		fillColor:"black",
		strokeColor:"#F1E82F",
		pointRadius:10,
		strokeWidth:16
	    }),renderers: System.renderer
	});
	map.addLayers([route_layer2]);
    }
    else
	route_layer2.removeFeatures(route_layer2.features);
    route_layer2.addFeatures(System.stepsFDR[index]);
    map.setLayerIndex(route_layer2,map.layers.length-6);
    
    var extent = route_layer2.getDataExtent();
    var marker = extent.getCenterLonLat();
    // var bounds = new OpenLayers.Bounds();
    // bounds.extend(new OpenLayers.LonLat(marker.lon,marker.lat));
    // bounds.toBBOX();
    
    //var extent2 = new OpenLayers.Bounds(extent.x,extent.y,extent.x,extent.y); 
    //var extent2 = new OpenLayers.Bounds(extent.x-0.001,extent.y-0.001,extent.x+0.001,extent.y+0.001); 
    // map.zoomToExtent(bounds);
    //alert(map.getZoomForExtent(extent));
    var zoomLevel = map.getZoomForExtent(extent)-2;
    map.setCenter(new OpenLayers.LonLat(marker.lon,marker.lat), zoomLevel);
    //map.zoomToExtent(route_layer2.getDataExtent());
}


var requestedProfile=false;
function requestProfile(){
#if $m.web.metadata.get('layout_t')=="mobile"
    $.mobile.showPageLoadingMsg();
#end if
    if(System.routingProfileComputed){
#if $m.web.metadata.get('layout_t')=="mobile"
	\$.mobile.hidePageLoadingMsg();
#end if
	return;
    }
    var params1=[
	{name: "Geometry","xlink:href": System.inputs1, mimeType: "application/json"},
	{name: "mult","value": "10",dataTye: "string"},
	{name: "RasterFile","value": "topofr.tif",dataType: "string"}
    ];
    var data1=WPSGetHeader("GdalExtractProfile")+WPSGetInputs(params1)+WPSGetOutput({name: "Profile","form":"ResponseDocument","asReference": "true"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=routing",
	contentType: 'text/xml',
	data: data1,
	complete: function(xml,status) {
	    loadProfileAndDisplay(xml);
	}
    });
    
}

function loadProfileAndDisplay(){
    //alert("ok");
    System.lineUrl=WPSParseReference(arguments[0]);
    \$.ajax({
	type: "GET",
	url: zooUrl+"?metapath=routing&service=WPS&request=Execute&version=1.0.0&Identifier=computeDistanceAlongLine&DataInputs=line=Reference@xlink:href="+System.lineUrl+"&RawDataOutput=Result@mimeType=application/json",
	complete:function(request,status){
	    //alert("ok");
	    var coord;
	    var distances=new Array();
	    var json=new OpenLayers.Format.JSON()
	    try{
		tmp=json.read(request.responseText);
		distances.push(0.0);
		distances0=json.read(tmp["features"][0]["properties"]["distance"]);
		for(i=0;i<distances0.length;i++){
		    distances0[i]=((distances0[i])+(i>0?distances0[i-1]:0));
		    distances.push(distances0[i]);
		}
		coord=tmp["features"][0]["geometry"]["coordinates"];
#if $m.web.metadata.get('layout_t')!="mobile"
		if(!System.selectPoi)
		    hideProfil('false');
#end if
		map.updateSize();
		//alert("ok");
	    }catch(e){
		alert(e);
	    }
	    var values=[];
	    var j=0;
	    sspoints=[];
	    
	    var stmp=new OpenLayers.Geometry.Point(coord[0][0],coord[0][1]);
	    
	    var ttmp=new OpenLayers.Geometry.Point(coord[coord.length-1][0],coord[coord.length-1][1]);
	    
	    if(startpoint.distanceTo(ttmp)<=startpoint.distanceTo(stmp))
		for(i=coord.length-1;i>=0;i--){
		    {
			if(coord[i][2]>=0)
			    values[j]=coord[i][2];
			else
			    values[j]=0;
			sspoints[j]=[coord[i][0],coord[i][1]];
			j+=1;
		    }
		}
	    else
		for(i=0;i<coord.length;i++){
		    {
			if(coord[i][2]>=0)
			    values[j]=coord[i][2];
			else
			    values[j]=0;
			sspoints[j]=[coord[i][0],coord[i][1]];
			j+=1;
		    }
		}
	    //alert("ok");

#if $m.web.metadata.get('layout_t')!="mobile"
	    \$('#routingProfileContainer').css({'height':'148px', 'width': (\$(document).width()-415)+'px','z-index': 1000});
	    \$('#divInnerNorth').css({'height':'50px', 'width': (\$(document).width()-415)+'px','z-index': 1000});
	    //\$('#map').css({'height': (\$(document).height()-450)+"px"});
	    //alert("ok");
	    
	    // Masquage de la zone de recherche
	    mmLayout.close('west');

	    map.updateSize();
	    //alert("ok");
	    map.zoomToExtent(System.curExtent);
	    //alert("ok");

	    // Premier affichage de la feuille de route
	    //\$('#feuillederoute').removeClass('hidden');
	    // Ouverture du panneau de feuille de route
	    //mmLayout.open('east');
	    // var innerLayout = \$('.middle-center').layout();
	    //Ouverture du panneau de profil
	    // innerLayout.open('south');
	    
	    // Alerte sécurité
	    //loadGCPWindow('windows/alerte_securite','   ',280,28);
	    //loadCenterPopup('windows/alerte_securite','Alerte',280,28);
#end if
	    var mmax=0;
	    for(var t=0;t<values.length;t++)
		if(values[t]>mmax)
		    mmax=values[t];
	    Highcharts.setOptions({
		lang: {
		    resetZoomTitle: "$zoo._("Reset to initial zoom level")",
		    resetZoom: "$zoo._("Reset zoom")"
		}
	    });
	    var chart = new Highcharts.Chart({
		chart: {
		    zoomType: 'x',
		    renderTo: 'routingProfileContainer'
		},
		title: {
		    text: "$zoo._('Elevation profile')"
		},
		xAxis: {
		    labels: {
			formatter: function(){
			    var tmp=this.value+"";
			    if(tmp.indexOf('.')!=0)
				if(distances[tmp])
				    return parseDistance(Math.round(distances[tmp]*111120));
			}
		    },
		    title: { text: 'Points' },
		    events: {
			afterSetExtremes: function(){
			    if(\$("#profileZoomOnMap").is(':checked')){
				if(!sspoints[parseInt(this.min)])
				    this.min=0;
				if(!sspoints[parseInt(this.max)])
				    this.max=sspoints.length-1;
				if(this.min==0 && this.max==sspoints.length-1){
				    if(route_layer1)
					route_layer1.removeFeatures(route_layer1.features);			    
			    	    map.zoomToExtent(System.curExtent);
				    return false;
				}
				\$.ajax({
				    type: "GET",
				    url: zooUrl+"?metapath=routing&service=WPS&request=Execute&version=1.0.0&Identifier=splitLine&DataInputs=startPoint="+sspoints[parseInt(this.min)]+";endPoint="+sspoints[parseInt(this.max)]+";line=Reference@xlink:href="+encodeURIComponent(System.lineUrl)+"&ResponseDocument=Result@asReference=true@mimeType=text/xml",
				    dataType: 'xml',
				    complete:function(xml,status){
					System.tmpMUrl=WPSParseReference(xml);
					\$.ajax({
					    type: "GET",
					    dataType: "xml",
					    url: System.tmpMUrl+"&request=GetFeature&service=WFS&version=1.0.0&typename=Result",
					    success: function(xml){
						if(route_layer1)
						    route_layer1.removeFeatures(route_layer1.features);
						var gml = new OpenLayers.Format.GML();
						var features=gml.read(xml);
						for(var j=0;j<features.length;j++)
						    features[j].geometry=features[j].geometry.transform(geographic,map.getProjectionObject());
						if(\$("#profileZoomOnMap").val()=='on'){
						    System.steps=features;
						    //System.stepsFDR=features;
						    routingZoomOnSteps();
						}
					    }
					});
				    }
				});
			    }
			    else{
				if(\$("#profileZoomOnMap").is(':checked')){
				    if(route_layer1)
					route_layer1.removeFeatures(route_layer1.features);			    
			    	    map.zoomToExtent(System.curExtent);
				}
				if(route_layer1)
				    route_layer1.removeFeatures(route_layer1.features);
			    }
			    //alert("ZOOM End : "+sspoints[parseInt(this.min)]+" "+sspoints[parseInt(this.max)]);
			}
		    },
		    maxZoom: 0
		},
		yAxis: {
		    max: mmax*2,
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
				    if(\$("#profileZoomOnMap").is(':checked'))
					map.zoomToExtent(System.curExtent);
				    if(points_layer1.features.length>0)
					points_layer1.removeFeatures(points_layer1.features);
				    var tmp=new OpenLayers.Geometry.Point(sspoints[this.x][0],sspoints[this.x][1]);
				    tmp.transform(wgs84,mercator);
				    points_layer1.removeFeatures(points_layer1.features);
				    points_layer1.addFeatures([new OpenLayers.Feature.Vector(tmp,null,null)]);
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
			if(points_layer1.features.length>0)
			    points_layer1.removeFeatures(points_layer1.features);
			var tmp=new OpenLayers.Geometry.Point(sspoints[this.x][0],sspoints[this.x][1]);
			tmp.transform(wgs84,mercator);
			points_layer1.removeFeatures(points_layer1.features);
			points_layer1.addFeatures([new OpenLayers.Feature.Vector(tmp,null,null)]);
			return '<h1>$zoo._("Altitude: ")'+Highcharts.numberFormat(this.y, 0)+"</h1>";
		    }
		},
		series: [{
		    name: '$zoo._('Elevation')',
		    type: 'area',
		    data: values
		}]
	    });
	    \$('.highcharts-tracker').mouseleave(function(){
		if(points_layer1.features.length>0)
		    points_layer1.removeFeatures(points_layer1.features);
	    });
	    \$('#routingProfileContainer').mouseleave(function(){
		if(points_layer1.features.length>0)
		    points_layer1.removeFeatures(points_layer1.features);
	    });
	    map.zoomToExtent(System.curExtent);
	    System.routingProfileComputed=true;
#if $m.web.metadata.get('layout_t')=="mobile"
	    \$.mobile.changePage('#routingProfilePage');
	    \$.mobile.hidePageLoadingMsg();
#end if
	    
	}
    });
}

function RoutingReinit(){
  if(route_layer){
    try{
      points_layer.removeFeatures(points_layer.features);
      map.removeLayer(route_layer);
      route_layer=false;
      map.removeLayer(route_layer1);
      route_layer1=false;
    }catch(e){}
  }
  else{
      if(dd_layer)
      try{
	  points_layer.removeFeatures(points_layer.features);
	  map.removeLayer(dd_layer);
	  dd_layer=false;
      }
      catch(e){
      }
  }
    //\$("#link_export").hide();
#if $m.web.metadata.get('layout_t')=="mobile"
  \$("#toolbarLink").attr("href","#toolbarPage");
  \$('#mapPage').trigger("pageshow"); 

  //\$('#mapPage').page('destroy').page(); 
  \$.mobile.changePage('#mapPage');
  \$.mobile.changePage('#toolbarPage');
#end if
}

function backButtonForGeocoding(backLink){
  \$("#toolbarLink").attr("href",backLink);
  /*\$('<div class="ui-loader1 ui-overlay-shadow ui-body-d ui-corner-all"><div data-role="controlgroup" data-type="horizontal"><a href="'+backLink+'" class="bckBtn" data-role="button" data-inline="true" data-icon="arrow-l" onclick="\$(this).fadeOut( 400, function(){\$(this).parent().remove();});">Retour</a>'+
     (backLink=="#geocodingPage"?'<a href="#routingPage" data-role="button" data-inline="true" class="bckBtn" onclick="\$(this).fadeOut( 400, function(){\$(this).parent().remove();});">Choisir</a>':'')
     +'</div>')
    .css({ "display": "block", "opacity": 0.96, "top": \$(window).scrollTop() + 100, "position": "absolute", "left": "50%", "z-index": "10000", "margin-left": "-130px", "margin-top": "-35px" })
    .appendTo( \$("#mapPage") );*/
  //\$('#mapPage').page('destroy').page(); 
}

function doRun(){
  toggleControl({"name":"search"});
  toggleControl({name: 'draw_points'});
  toggleControl({name: 'drag_points'});
  tselect[tselect.length-1].activate();
  /*try{
    tselect[tselect.length-1].deactivate();
  }catch(e){}*/
}

function codeAddressOld(address) {
  //var address = \$("#address")[0].value+" FRANCE";
#if $m.web.metadata.get('layout_t')=="mobile"
  $.mobile.showPageLoadingMsg();
#end if
  geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
#if $m.web.metadata.get('layout_t')=="mobile"
	$.mobile.hidePageLoadingMsg();
#end if
	System.addresses=new Array();
	\$('#search_geocoding_results').empty();
	for(var i=0;i<results.length;i++){
	  System.addresses[i]=results[i];
	  \$('<li id="place_'+i+'" data-icon="arrow-r" data-theme="d">')
	    .hide()
	    .append(\$('<a />', {
		href: "#mapPage",
		    text: results[i].formatted_address,
		    onclick: doRun()
		    }).append(\$('<span class="ui-icon-arrow-r">')))
	    .appendTo('#search_geocoding_results')
	    .click(function() {
		var tmp=this.id.split('_');
		geolocation.removeFeatures(geolocation.features);
		var tmp=this.id.split('_');
		
		backButtonForGeocoding("#geocodingPage");
		var sw = System.addresses[tmp[1]].geometry.viewport.getSouthWest();
		var ne = System.addresses[tmp[1]].geometry.viewport.getNorthEast();
		var extent= new OpenLayers.Bounds(sw.lng(),sw.lat(),ne.lng(),ne.lat()).transform(wgs84,mercator);
		var marker = extent.getCenterLonLat();
		map.zoomToExtent(extent);
		//geolocation.addMarker(new OpenLayers.Marker(marker,icon));
		
		//System.searchFields[\$("#slayer")[0].value][2][tmp[1]].geometry.transform(wgs84,mercator);
			  
		//alert(marker.lat+" "+marker.lon);
		points_layer.addFeatures([new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(marker.lon,marker.lat),{id:points_layer.features.length, name: System.addresses[tmp[1]]["formatted_address"], type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))})]);
		mapControls["drag_points"].activate();
#if $m.web.metadata.get('layout_t')=="mobile"
		\$.mobile.changePage('#mapPage');
#end if
		//map.zoomToExtent(System.searchFields[\$("#slayer")[0].value][2][tmp[1]].geometry.bounds);
	      })
	    .show();
	  \$('#search_geocoding_results').listview('refresh');
	  
	  
	}
	
	/*if(System.defaultBounds.contains(extent)){
	  map.zoomToExtent(extent);
	  markers.addMarker(new OpenLayers.Marker(marker,icon));
	  }else
	  alert("Adresse non trouvee.dans votre RVS");
	*/
      } else {
	alert("Adresse non trouvee.");
	for(i=0;i<markers.markers.length;i++)
	  markers.markers[i].erase();
      }
    });
}


function codeAddress(address) {
  //var address = \$("#address")[0].value+" FRANCE";
#if $m.web.metadata.get('layout_t')=="mobile"
  $.mobile.showPageLoadingMsg();
#end if
    System.address=address;
    
    \$.ajax({
	type: "GET",
	url: "$conf["main"]["serverAddress"]?metapath=routing&service=WPS&version=1.0.0&request=Execute&Identifier=geocodeAdresse&DataInputs=search="+System.address+"&RawDataOutput=Result",
	dataType: "xml",
	complete: function(xml,status) {
#if $m.web.metadata.get('layout_t')=="mobile"
	    $.mobile.hidePageLoadingMsg();
#end if
	    try{
		var results=\$.parseJSON(xml.responseText);
		System.addresses=new Array();
		\$('#search_geocoding_results').empty();
		for(var i=0;i<results.length;i++){
		    System.addresses[i]=results[i];
		    \$('<li id="place_'+i+'" data-icon="arrow-r" data-theme="d">')
			.hide()
			.append(\$('<a />', {
			    href: "#mapPage",
			    text: results[i].label,
			    onclick: doRun()
			}).append(\$('<span class="ui-icon-arrow-r">')))
			.appendTo('#search_geocoding_results')
			.click(function() {
			    var tmpId=this.id.split('_');

			    geolocation.removeFeatures(geolocation.features);
			    
			    backButtonForGeocoding("#geocodingPage");

			    var stmp=new OpenLayers.Geometry.Point(System.addresses[tmpId[1]].geometry.coordinates[0],System.addresses[tmpId[1]].geometry.coordinates[1]);
			    var extent= new OpenLayers.Bounds(stmp.x-0.001,stmp.y-0.001,stmp.x+0.001,stmp.y+0.001);
			    
			    stmp1=stmp.transform(geographic,mercator);

			    points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, name: System.addresses[tmpId[1]]["label"], type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))})]);

			    map.zoomToExtent(extent.transform(geographic,mercator));
			    mapControls["drag_points"].activate();

#if $m.web.metadata.get('layout_t')=="mobile"
			    \$.mobile.changePage('#mapPage');
#end if
			})
			.show();
		    \$('#search_geocoding_results').listview('refresh');
		    
		}
	    }catch(e){
		alert(e);
		alert("$zoo._("No address found")");
		for(i=0;i<markers.markers.length;i++)
		    markers.markers[i].erase();
	    }	    
	}
    });

}


function routingForm(a){
  if(a=="mapPage"){
    if(arguments.length>1)
	backButtonForGeocoding(arguments[1]);
    else
	backButtonForGeocoding('#routingPage');
    //toggleControl({name: 'draw_points'});
    mapControls['draw_points'].activate();
    mapControls["drag_points"].activate();
    //try{tselect[tselect.length-1].deactivate();}catch(e){}
  }
  $.mobile.changePage("#"+a);
}


function _routingForm(){
  //toggleControl({name: 'draw_points'});
  mapControls['draw_points'].activate();
  mapControls["drag_points"].activate();
  //try{tselect[tselect.length-1].deactivate();}catch(e){}
}

function displayRoadmap(a){
  if(a>0){
    \$('.ui-layout-east').removeClass('hidden');
    \$(".ui-layout-east").css({"z-index": "1"});
    \$('.ui-layout-center').css({"width": (\$(document).width()-(260+295))+"px"});
    \$('#map').css({"width": (\$(document).width()-(260+295))+"px"});
    map.updateSize();
    \$('#routingProfileContainer').css({"width": (\$(document).width()-(260+295))+"px"});
  }
  else{
    \$('.ui-layout-east').addClass('hidden');
    \$(".ui-layout-east").css({"z-index": "0"});
    \$('.ui-layout-center').css({"width": (\$(document).width()-(280+0))+"px"});
    \$('#map').css({"width": (\$(document).width()-(280+0))+"px"});
    map.updateSize();
    \$('#routingProfileContainer').css({"width": (\$(document).width()-(280+0))+"px"});
  }
}

var timeOut;
\$("#jFlowNext0").click(function(e,simulated){
    if(!simulated){
      clearTimeout(timeOut);
    }
  });
function autoAdvance(){
  \$("#jFlowNext0").trigger('click',[true]);
  timeOut = setTimeout(autoAdvance,4000);
};

function aZoomTo(){
    var geometry=arguments[0];
    var stmp=new OpenLayers.Geometry.Point(geometry.coordinates[0],geometry.coordinates[1]);
    var extent= new OpenLayers.Bounds(stmp.x-0.001,stmp.y-0.001,stmp.x+0.001,stmp.y+0.001);
    stmp.transform(geographic,mercator);
    points_layer.removeFeatures(points_layer.features);
    points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))})]);
    map.zoomToExtent(extent.transform(geographic,mercator));   
}

var currentTerm="";
function startSearch1(){
  System.addresses=new Array();
  \$( "#"+arguments[0] ).autocomplete({
    source: function(request,response){
	//codeAddress(request.term);
	currentTerm = SansAccents(request.term);
	//alert(currentTerm);
	System.address=currentTerm;
    
	\$.ajax({
	    type: "GET",
	    url: "$conf["main"]["serverAddress"]?metapath=routing&service=WPS&version=1.0.0&request=Execute&Identifier=geocodeAdresse&DataInputs=search="+System.address+"&RawDataOutput=Result",
	    dataType: "xml",
	    complete: function(xml,status) {
		try{
		    var results=\$.parseJSON(xml.responseText);
		    \$('#search_geocoding_results').empty();
		    var data=[];
		    for(var i=0;i<results.length;i++){
			System.addresses[i]=results[i];
			data[data.length]={	
			    id: i,
			    label: results[i].label,
			    tabindex: i
			}
		    }
		    response(data);
		}catch(e){
		    alert(e);
		    alert("$zoo._("No address found")");
		    for(i=0;i<markers.markers.length;i++)
			markers.markers[i].erase();
		}	    
	    }
	});
      },
    select: function( event, ui ) {
	geolocation.removeFeatures(geolocation.features);
	var tmp=["",ui.item.id];
#if $m.web.metadata.get('layout_t')!="mobile"
	backButtonForGeocoding("#geocodingPage");
#end if
	var tmpId=ui.item.id;
	var stmp=new OpenLayers.Geometry.Point(System.addresses[tmpId].geometry.coordinates[0],System.addresses[tmpId].geometry.coordinates[1]);
	var extent= new OpenLayers.Bounds(stmp.x-0.001,stmp.y-0.001,stmp.x+0.001,stmp.y+0.001);
	stmp1=stmp.transform(geographic,mercator);
	points_layer.addFeatures([new OpenLayers.Feature.Vector(stmp,{id:points_layer.features.length, name: System.addresses[tmpId]["label"], type: (points_layer.features.length==0?"start":(points_layer.features.length==1?"end":"inter"))})]);
	map.zoomToExtent(extent.transform(geographic,mercator));
	mapControls["drag_points"].activate();
	toggleControl({"name":"draw_points"})
	mapControls["drag_points"].activate();
	
	if(System.idPoint.indexOf("adresseEtape") != -1)
		System.nbEtapeFlags +=1;
     }
    });
	
#if $m.web.metadata.get('layout_t')!="mobile"
	\$("#"+System.idPoint).trigger("onchange");
#end if
}


function updateAdressTitle(){
	var adresse = \$( "#" + System.idPoint ).val();
	\$( "#"+ System.idPoint ).attr('title', adresse);
	//alert(adresse);
}

function globalResetAction(layer,index){
    if((System.idPoint=="adresseLieu") || (System.idPoint.indexOf("adresseDepart") != -1)){
	if(layer.features.length>0)
	    layer.removeFeatures([layer.features[0]]);
    }
    else if(System.idPoint.indexOf("adresseArrivee") != -1){
	if(layer.features.length>1)
	    layer.removeFeatures([layer.features[1]]);
    }
    else if(System.idPoint.indexOf("adresseEtape") != -1){
	var tmpi=eval(System.idPoint.replace(/adresseEtape/g,""));
	if(layer.features.length>tmpi+2){
	    layer.removeFeatures([layer.features[tmpi+2]]);
	}
    }
}

function alertAction(call){
alert(call + ': NbEtapes=' + System.nbEtapes +  ', NbEtapeFlags=' + System.nbEtapeFlags + ', NbFeatures=' + points_layer.features.length);

}


function removeFeatureIndex(layer,mode){
	//alert("Features count="+layer.features.length + ", System count="+System.routingPoiCnt);
	if(mode=='depart')
		index = 0;
	else if(mode=='arrivee')
		index = 1;
	else if(mode=='etape'){
		//alert("Etape : Features count="+layer.features.length + ", System count="+System.routingPoiCnt);
		//index = System.routingPoiCnt;
		index = layer.features.length;
		if (index < 2)
		index = 2;
	}
		
	if(layer.features.length > index){
		//alert('remove ' + index);
		layer.removeFeatures([layer.features[index]]);
		// if(System.routingPoiCnt>0)
			// if(idPoint.indexOf("adresseEtape") == -1)
				//System.routingPoiCnt-=1;
		//System.routingPoiCnt=points_layer.features.length;
	}
}

function removePolygon(){
  try{
      if(dd_layer){
	  map.removeLayer(dd_layer);
	  dd_layer=false;
      }
  }catch(e){
      //alert(e);
      //alert(e.message);
  }
}

function removeAllFeatures(){
  try{
      \$("#link_export").hide();
      \$("#link_print").hide();
   
      initFdrMode();
      
      System.routingPoiCnt=0;
      System.nbEtapes = 0;
      System.nbEtapeFlags = 0;
      currentIdStepDisplayed = 0;
      previousIdStepDisplayed = 0;
      nbSteps = 0;
      
      
      if(route_layer){
	  map.removeLayer(route_layer);
	  route_layer=false;
      }
      if(route_layer1){
	  map.removeLayer(route_layer1);
	  route_layer1=false;
      }
      if(route_layer2){
	  map.removeLayer(route_layer2);
	  route_layer2=false;
      }
      if(dd_layer){
	  map.removeLayer(dd_layer);
	  dd_layer=false;
      }
      for(var i=0;i<layersList.length;i++){
	  if(layersList[i].real_name=="Sites"){
	      layersList[i].removeFeatures(layersList[i].features);
	  }
      }
      
      map.setLayerIndex(System.hover,map.layers.length-1);
      map.setLayerIndex(points_layer,map.layers.length-2);
      map.setLayerIndex(points_layer1,map.layers.length-3);

      if(points_layer.features.length > 0)
	  points_layer.removeFeatures(points_layer.features);
      if(points_layer1.features.length > 0)
	  points_layer1.removeFeatures(points_layer1.features);
      
      \$("#etapes_2").empty();
      map.updateSize();
#if $m.web.metadata.get('layout_t')!="mobile"
      hideProfil('true');
#end if
      map.updateSize();
      
  }catch(e){
      alert("OK"+e);
	  //alert(e.message);
  }
}


/*
*  Sans Accents
*/
function SansAccents (my_string) {
            var new_string = "";
    //Const ACCENT = "àáâãäåòóôõöøèéêëìíîïùúûüÿñç-'&?|+*=]["
            var pattern_accent = new Array("à", "á", "â", "ã", "ä", "å", "ò", "ó", "ô", "õ", "ö", "ø", "é", "è", "ê", "ë", "ç", "ì", "í", "î", "ï", "ù","ú","û","ü","ÿ","ñ", "-", "'", "&", "=", "_");
            var pattern_replace_accent = new Array("a", "a", "a", "a", "a", "a", "o", "o", "o", "o", "o", "o", "e", "e", "e", "e", "c", "i", "i", "i", "i", "u","u","u","u","y","n", " ",  " ", " ", " ", " ");
            if (my_string && my_string!= "") {
                        new_string = preg_replace(pattern_accent, pattern_replace_accent, my_string.toLowerCase());
            }
            return new_string;
}
function preg_replace (array_pattern, array_pattern_replace, my_string)  {
    var new_string = String (my_string);
            for (i=0; i<array_pattern.length; i++) {
                        var reg_exp= RegExp(array_pattern[i], "gi");
                        var val_to_replace = array_pattern_replace[i];
                        new_string = new_string.replace (reg_exp, val_to_replace);
            }
            return new_string;
}
/* Fin Sans Accents */



