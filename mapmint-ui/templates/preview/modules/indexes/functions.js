#encoding UTF-8
#import zoo
function idx_activate(){
    if(arguments[0]=="table" || arguments[0]=="removeAll" ){
	for(i in idxCtrl){
	    if(i!=arguments[0]){
		idxCtrl[i].deactivate();
		if(idxCtrl[i].box)
		    idxCtrl[i].box.deactivate();
	    }
	}
	if(arguments[0]=="table")
	    getTerritoriesTable();
	else
	    removeAllSelectedFeatures();
	return;
    }
    for(i in idxCtrl){
	if(i!=arguments[0]){
	    idxCtrl[i].deactivate();
	    if(idxCtrl[i].box)
		idxCtrl[i].box.deactivate();
	}
	else{
	    if(arguments[0]!="table"){
		map.addControl(idxCtrl[arguments[0]]);
		idxCtrl[arguments[0]].activate();
		if(idxCtrl[i].box)
		    idxCtrl[i].box.activate();
	    }
	}
    }
}

function removeAllSelectedFeatures(){
    if(System.si=="in")
	toggleRepportSubmit(false);
    \$('#basket_'+System.si).html('');
    for(i=System.cfeatures.length-1;i>=0;i--){
	if(System.cfeatures[i]["mmtype"]==System.si)
	    System.cfeatures.pop(i);
    }
    if(System.overlays[System.si]){
	map.removeLayer(System.overlays[System.si]);
	System.overlays[System.si]=false;
    }
    if(System.allOverlays){
	try{
	    params=[];
	    params.push({"name": "InputEntity1","xlink:href": System.allOverlays+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result&amp;bbox="+bounds0.getBounds()+"&amp;times="+(Date()+"").split(' ')[4],"mimeType": "text/xml"});
	    params.push({"name": "InputEntity2","xlink:href": ((System.si=="in")?System.inMap:System.outMap)+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result&amp;times="+(Date()+"").split(' ')[4],"mimeType": "text/xml"});
	    req=WPSGetHeader("Remove")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
	    $.ajax({
		type: "POST",
		url: System.zooUrl+"?metapath=vector-tools",
		contentType: 'text/xml',
		data: req,
		complete: function(xml,status) {
		    System.allOverlays=WPSParseReference(xml);
		}
	    });
	}catch(e){}
    }
    if(System.si=="in"){
	System.inMap=false;
	System.inMap0=false;
    }else{
	System.outMap=false;
	System.outMap0=false;
    }
}

function displayIndexInfo(i,ll,ur){
    idxRequestFeatures({
	map: pmapfiles[queryLayersList[i].real_name][0],
	typename: queryLayersList[i].real_name,
	bbox: ll.lon.toFixed(4)+","+ll.lat.toFixed(4)+","+ur.lon.toFixed(4)+","+ur.lat.toFixed(4)
    });
}

function getIndexInfo(i,ll,ur){
    var ll=ll;
    var ur=ur;
    \$.ajax({
	localI: i,
	ll: ll,
	ur: ur,
	type: "GET",
	url: zooUrl+"?metapath=mapfile&service=WPS&version=1.0.0&request=Execute&Identifier=getInitialInfo&DataInputs=map="+lastMap+";layer="+queryLayersList[i].real_name+"&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	    var tmp=\$(xml.responseXML).find("ows\\:ExceptionText").text();
	    if(!tmp)
		tmp=\$(xml.responseXML).find("ExceptionText").text();
	    if(tmp!=""){
		return;
	    }
	    var localI=this.localI;
	    
	    idxRequestFeatures({
		map: pmapfiles[queryLayersList[localI].real_name][0],
		typename: queryLayersList[localI].real_name,
		bbox: ll.lon.toFixed(4)+","+ll.lat.toFixed(4)+","+ur.lon.toFixed(4)+","+ur.lat.toFixed(4),
		i: this.localI
	    });
	}
    });
}

function idxRequestFeatures(){
    var cid0=0;
    for(i=0;i<layersList.length;i++){
	if(layersList[i].name==queryLayersList[arguments[0].i].name){
	    cid0=i;
	    break;
	}   
    }
    var cid=map.getLayerIndex(finalLayers[(cid0*4)+1]);
    //map.removeLayer(finalLayers[(cid0*4)+1]);
    \$.ajax({	
	type: "GET",
	layer: queryLayersList[arguments[0].i].real_name,
	i: arguments[0].i,
	url: "./modules/indexes/project_js;layer="+queryLayersList[arguments[0].i].real_name+";ext="+arguments[0]["bbox"],
	complete:function(xml,status){
	    tmp=eval(xml.responseText);
	    var sld="<StyledLayerDescriptor version=\"1.0.0\"><NamedLayer><Name>"+this.layer+"</Name><UserStyle><Title>hatch with background</Title><FeatureTypeStyle><Rule><Name>default</Name><Filter><BBOX><PropertyName>msGeometry</PropertyName><Box><coordinates>"+tmp[0]+","+tmp[1]+" "+tmp[2]+","+tmp[3]+"</coordinates></Box></BBOX></Filter><PolygonSymbolizer><Fill><CssParameter name=\"fill\">#880000</CssParameter></Fill></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>";
	    var tmp=new OpenLayers.Layer.WMS(
		"Select",
		queryLayersList[this.i].url,
		{
		    format: "image/png",
		    layers: queryLayersList[this.i].params["LAYERS"],
		    styles: "default",
		    sld_body: sld
		},
		{useCanvas: System.useCanvas,isBaseLayer: false}
	    );
	    tmp.setVisibility(true);
	    map.addLayer(tmp);
	    map.setLayerIndex(tmp,cid);
	    idxReadFeatures(xml);
	}
    });
    //finalLayers[(arguments[0].i*4)+1].redraw(true);
    /*
    \$.ajax({	
	type: "GET",
	url: msUrl+"?map="+arguments[0]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&typename="+arguments[0]["typename"]+"&bbox="+arguments[0]["bbox"],
	dataType: 'xml',
	complete:function(xml,status){
	    idxReadFeatures(xml);
	}
    });
    */
}

function toggleRepportSubmit(){
    if(arguments[0])
	\$("#repport_submit").show();
    else
	\$("#repport_submit").hide();
}

System.loadTemplate={};
function idxReadFeatures(xml){
    fRead=new OpenLayers.Format.GeoJSON({
	'internalProjection': map.getProjectionObject(), 
	'externalProjection': new OpenLayers.Projection("EPSG:4326")
    });
    var localFeatures=fRead.read(xml.responseText);
    if(!System.loadTemplate[\$('#it1 option:selected').text()])
	System.loadTemplate[\$('#it1 option:selected').text()]=false;
    System[System.si+"_length"]=localFeatures.length;
    for(var j=0;j<localFeatures.length;j++){
	if(!System.iltemplates[\$('#it1 option:selected').text()] && !System.loadTemplate[\$('#it1 option:selected').text()]){
	    System.loadTemplate[\$('#it1 option:selected').text()]=true;
	    fetchTemplate(localFeatures);
	}
	else{
	    try{
		printTemplate(localFeatures[j]);
	    }catch(e){}
	}
    }
}

function getTerritoriesTable(){
    for(var i=0;i<queryLayersList.length;i++){
	if(queryLayersList[i].real_name==\$('#it1 option:selected').text()){
	    var localI=i;
	    getTerritoryTable(i);
	    System.flexi_cnt++;
	    break;
	}
    }
}

function getTerritoryTable(i){
    \$.ajax({
	localI: i,
	type: "GET",
	url: zooUrl+"?metapath=mapfile&service=WPS&version=1.0.0&request=Execute&Identifier=getInitialInfo&DataInputs=map="+lastMap+";layer="+queryLayersList[i].real_name+"&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	    var tmp=\$(xml.responseXML).find("ows\\:ExceptionText").text();
	    if(tmp!=""){
		return;
	    }
	    
	    colModel=[];
	    searchitems=[];
	    fields=[];
	    featurecnt=0;
	    var localI=this.localI;

	    \$(xml.responseXML).find("featureCount").each(function(){
		featurecnt=\$(this).text();		    
	    });
	    
	    if(queryLayersList[this.localI].displayed_fields=="all"){
		var nbCol=0;
		\$(xml.responseXML).find("field").each(function(){
		    \$(this).find("id").each(function(){
			colModel[nbCol]={display: \$(this).text(), name : \$(this).text(), width: (nbCol==0?80:120), sortable : true, align: 'center'};
			searchitems[nbCol]={display: \$(this).text(), name : \$(this).text()};

			fields[nbCol]=\$(this).text();
			nbCol++;
		    });
		});
	    }else{
		var tmp=queryLayersList[this.localI].displayed_fields.split(',');
		var tmp1=queryLayersList[this.localI].displayed_fields_width.split(',');
		var tmp2=queryLayersList[this.localI].displayed_fields_aliases.split(',');
		var nbCol=0;
		\$(xml.responseXML).find("field").each(function(){
		    \$(this).find("id").each(function(){
			for(var j=0;j<tmp.length;j++)
			    if(tmp[j]==\$(this).text()){
				colModel[nbCol]={display: (tmp2[j]&&tmp2[j]!="all"?tmp2[j]:\$(this).text()), name : \$(this).text(), width: (tmp1[j]?tmp1[j]:120), sortable : false, align: 'center'};
				searchitems[nbCol]={display: (tmp2[j]&&tmp2[j]!="all"?tmp2[j]:\$(this).text()), name : \$(this).text()};
				fields[nbCol]=\$(this).text();		
				nbCol++;
			    }
		    });
		});
	    }

	    \$('#output-gfi').html('<table id="flex'+localI+'" style="display:none"></table>');
	    
	    try{
		var tmpName="#flex"+localI;
		\$("#flex"+localI).flexigrid({
		    autoload: true,
		    url: msUrl,
		    ogcProtocol: "WFS",
		    ogcUrl: msUrl,
		    autozoom: false,
		    dataType: 'xml',
		    colModel: colModel,
		    searchitems: searchitems,
		    usepager: true,
		    ltoolbar: false,
		    cfailed: true,
		    id: this.localI,
		    fields: fields,
		    sortname: fields[0],
		    sortorder: "asc",
		    dwDataSource: pmapfiles[queryLayersList[localI].real_name][0],
		    dwLayer: queryLayersList[localI].real_name,
		    title: queryLayersList[localI].name,
		    useLimit: false,
		    nbElements: featurecnt,
		    noSelection: false,
		    showTableToggleBtn: true,
		    width: "100%",
		    height: 290,
		    onHide: function(hidden) {
			finalLayers[(this.id*4)].setVisibility(!hidden);
			finalLayers[(this.id*4)+1].setVisibility(!hidden);
			finalLayers[(this.id*4)+2].setVisibility(!hidden);
			finalLayers[(this.id*4)+3].setVisibility(!hidden);
		    },
		    params: [{name: "maxfeatures", value: 15 }],
		    tableToggleBtns: [
			{name: 'zoomToSetExtent',title: '$zoo._("Zoom to set extent").replace("'","\\'")', onclick: function(){
			    map.zoomToExtent(finalLayers[(this.id.replace(/zoomToSetExtent_/,"")*4)].getDataExtent());
			}},
			{name: 'addSelectedItems',title: '$zoo._("Add selected items").replace("'","\\'")', onclick: function(){
			    geojson=new OpenLayers.Format.GeoJSON({
				'internalProjection': map.getProjectionObject(), 
				'externalProjection': new OpenLayers.Projection("EPSG:4326")
			    });
			    var tmpIdp=this.id.replace(/addSelectedItems_/,"");
			    var tmpId0=tmpIdp*4;
			    var tmpId=tmpId0+2;
			    filter="<Filter><OR>"
			    //var lfeatures=geojson.write(finalLayers[tmpId].features);
			    //alert(lfeatures);
			    try{
				for(i=0;i<finalLayers[tmpId].features.length;i++){
				    var feature=finalLayers[tmpId].features[i];
				    /*if(!System.iltemplates[\$('#it1 option:selected').text()]){
				      try{
				      fetchTemplate(feature);
				      }catch(e){
				      alert("fecthTemplate: "+e);
				      }
				      }
				      else
				      printTemplate(feature);*/
				    filter+="<PropertyIsLike wildcard='*' singleChar='.' escape='!'><PropertyName>"+System.full_index["indicateurs_territoires_key"]+"</PropertyName><Literal>"+(feature.data && feature.data[System.full_index["indicateurs_territoires_key"]]?feature.data[System.full_index["indicateurs_territoires_key"]]:feature.attributes[System.full_index["indicateurs_territoires_key"]])+"</Literal></PropertyIsLike>"
				    
				}
				filter+="</OR></Filter>";
				//alert(msUrl+"?service=WFS&amp;request=GetFeature&amp;verion=1.0.0&amp;map="+pmapfiles[queryLayersList[tmpIdp].real_name][0]+"&amp;typename="+queryLayersList[tmpIdp].real_name+"&amp;filter="+(filter.replace(/</g,"&lt;").replace(/>/g,"&gt;")));
				
				//req0=WPSGetHeader("nullGeo")+WPSGetInputs([{"name": "InputEntity1", "xlink:href": msUrl+"?map="+pmapfiles[queryLayersList[tmpIdp].real_name][0]+"&amp;typename="+queryLayersList[tmpIdp].real_name+"&amp;__tt="+Date()+"&amp;filter="+(filter.replace(/</g,"&lt;").replace(/>/g,"&gt;")),"mimeType": "text/xml"}])+WPSGetOutput({"name": "Result","form":"RawDataOutput","mimeType": "application/json","asReference":"true"})+WPSGetFooter();
				rbody='<wps:Body><wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-basic.xsd"><wfs:Query typeName="'+queryLayersList[tmpIdp].real_name+'">'+filter+'</wfs:Query></wfs:GetFeature></wps:Body>';
				var params=[];
				if(System.inMap || System.outMap){
				    if(!System.allOverlays){
					if((System.si=="in") && System.outMap)
					    params.push({"name": "InputEntity2","xlink:href": System.outMap+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
					else
					    if(System.inMap)
						params.push({"name": "InputEntity2","xlink:href": System.inMap+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
				    }else
					params.push({"name": "InputEntity2","xlink:href": System.allOverlays+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result&amp;__tt="+Date(),"mimeType": "text/xml"});
				    
				}
				params.push({"name": "InputEntity1", "xlink:href": msUrl+"?map="+pmapfiles[queryLayersList[tmpIdp].real_name][0],"method":"POST","headers":[{"key":"Content-Type","value":"text/xml"}],"body": rbody,"mimeType": "text/xml"});
				req=WPSGetHeader("getFeaturesCopy")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
				$.ajax({
				    type: "POST",
				    url: System.zooUrl+"?metapath=vector-tools",
				    contentType: 'text/xml',
				    data: req,
				    complete: function(xml,status) {
					//urlContext = xml.responseText;
					var params=[];
					if(System.si=="in"){
					    if(System.inMap){
						System.inMap0=System.inMap;
						params.push({"name": "InputEntity1", "xlink:href": System.inMap0+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
					    }
					    System.inMap=WPSParseReference(xml);
					    
					    //alert((params.length+1)+" "+System.inMap);
					    //alert(xml);
					    params.push({"name": "InputEntity"+(params.length+1), "xlink:href": System.inMap+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
					    
					}else{
					    if(System.outMap){
						System.outMap0=System.outMap;
						params.push({"name": "InputEntity2", "xlink:href": System.outMap0+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
					    }
					    System.outMap=WPSParseReference(xml);
					    params.push({"name": "InputEntity1", "xlink:href": System.outMap+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
					}
					req0=WPSGetHeader("nullGeo")+WPSGetInputs([{"name": "InputEntity1", "xlink:href": ((System.si=="in")?System.inMap:System.outMap)+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=ms:Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"}])+WPSGetOutput({"name": "Result","form":"RawDataOutput","mimeType": "application/json","asReference":"true"})+WPSGetFooter();
					indexes_reaction(req0,params);
				    }
				});
			    }catch(e){
				//alert(e);
			    }
			    //alert("ok");
			    finalLayers[tmpId0].getDataExtent();
			}
			}
		    ]
		    
		});
		
	    }catch(e){alert(e);}
	    \$('.dialog-gfi').window({
		width: 625,
		height: 500,
		resizable: false,
		maximizable:false,
		resizable: false,
		onClose: function(){
		    for(var i=0;i<finalLayers.length;i++){
			finalLayers[i].removeFeatures(finalLayers[i].features);
		    }
		    processResultLayer.removeFeatures(processResultLayer.features);
		}
	    });
	}
    });
}

System.iltemplates={};
function fetchTemplate(){
    //alert("$conf["main"]["templatesAddress"]"+\$('#it1 option:selected').text()+"_$(conf["senv"]["last_map"])_tmpl.html");
    //alert(arguments[0]);
    //System
    \$.ajax({
	type: "GET",
	url: "$conf["main"]["templatesAddress"]"+\$('#it1 option:selected').text()+"_$(conf["senv"]["last_map"])_tmpl.html",
	mm_features: arguments[0],
	complete: function(xml,status) {
	    var res=xml.responseText.replace(/item name/g,"");		
	    System.iltemplates[\$('#it1 option:selected').text()]=res;
	    System.loadTemplate[\$('#it1 option:selected').text()]=false;
	    var features=this.mm_features;
	    //alert("FEATURES: "+features);
	    try{
		printTemplate(features);
	    }catch(e){
		//alert("Error in printTemplate: "+e);
		for(var j=0;j<features.length;j++){
		    {
			//alert("feature "+j);
			printTemplate(features[j]);
		    }
		}
	    }	
	}
    });
}

System.iltemplates0={};
function printTemplate(feature){
    //alert(arguments[0]);
    if(!feature){
	//alert("arguments[0] is null !");
	return;
    }
    
    var j=0;

    //alert('ok -2');
    if(!System.iltemplates0[\$('#it1 option:selected').text()])
	System.iltemplates0[\$('#it1 option:selected').text()]=System.iltemplates[\$('#it1 option:selected').text()];
    //alert('ok -1');
    var res1=System.iltemplates[\$('#it1 option:selected').text()];
    //alert('ok 0');
    for(j in feature.data){
	if(j!="msGeometry"){
	    preres1=res1;
	    res1=res1.replace("[="+j+"]",feature.data[j]);
	    if(preres1!=res1){
		System.sifield=j;
	    }
	}
    }
    //alert('ok 1');
    /*for(j in feature.attributes){
	if(j!="msGeometry"){
	    preres1=res1;
	    res1=res1.replace("[="+j+"]",feature.attributes[j]);
	    if(preres1!=res1){
		System.sifield=j;
	    }
	}
    }*/
    if(!System.cfeatures)
	System.cfeatures=[];
    for(i=0;i<System.cfeatures.length;i++){
	if(System.cfeatures[i]["val"]==feature.attributes[System.sifield]){
		return;
	    }
    }

    var tmpFeature=feature.clone();
    tmpFeature.attributes["idx_type"]=System.si;
    tmpFeature.attributes["idx_id"]=TerritoriesSelected.features.length;
    if(!System.si0)
	System.si0=0;
    res1='<div id="'+System.si+'_'+System.si0+'"><input name="toto_'+System.si0+'" id="toto_'+System.si0+'" value="'+feature.data[System.full_index["indicateurs_territoires_key"]]+'" type="hidden" /><a href="#" class="sdelete" onclick="idxRemoveFeature(\$(this).parent().attr(\'id\').replace(/'+System.si+'_/g,\'\'));\$(this).parent().remove();"></a>'+res1+'</div>';
    //TerritoriesSelected.addFeatures([tmpFeature]);
    var tmp=System.sifield;
    System.cfeatures.push({"val": feature.attributes[System.full_index["indicateurs_territoires_key"]],"mmtype": System.si});
    \$("#basket_"+System.si).append(res1);
    System.si0+=1;
}

function idxRemoveFeature(id){
    filter="<Filter>"
    filter+="<PropertyIsLike wildcard='*' singleChar='.' escape='!'><PropertyName>"+System.full_index["indicateurs_territoires_key"]+"</PropertyName><Literal>"+\$("#toto_"+id).val()+"</Literal></PropertyIsLike>"
    filter+="</Filter>"
    var tmpIdp=0;
    for(var i=0;i<queryLayersList.length;i++){
	if(queryLayersList[i].real_name==\$('#it1 option:selected').text()){
	    tmpIdp=i;
	    break;
	}
    }
    rbody='<wps:Body><wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-basic.xsd"><wfs:Query typeName="'+queryLayersList[tmpIdp].real_name+'">'+filter+'</wfs:Query></wfs:GetFeature></wps:Body>';
    if(System.allOverlays){
	try{
	    params=[];
	    params.push({"name": "InputEntity1","xlink:href": System.allOverlays+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result&amp;times="+(Date()+"").split(' ')[4],"mimeType": "text/xml"});
	    params.push({"name": "InputEntity2", "xlink:href": msUrl+"?map="+pmapfiles[queryLayersList[tmpIdp].real_name][0],"method":"POST","headers":[{"key":"Content-Type","value":"text/xml"}],"body": rbody,"mimeType": "text/xml"});
	    
	    req=WPSGetHeader("Remove")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
	    $.ajax({
		type: "POST",
		url: System.zooUrl+"?metapath=vector-tools",
		contentType: 'text/xml',
		data: req,
		complete: function(xml,status) {
		    System.allOverlays=WPSParseReference(xml);
		}
	    });
	}catch(e){}
    }
    params=[];
    params.push({"name": "InputEntity1","xlink:href": ((System.si=="in")?System.inMap:System.outMap)+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result&amp;times="+(Date()+"").split(' ')[4],"mimeType": "text/xml"});
    params.push({"name": "InputEntity2", "xlink:href": msUrl+"?map="+pmapfiles[queryLayersList[tmpIdp].real_name][0],"method":"POST","headers":[{"key":"Content-Type","value":"text/xml"}],"body": rbody,"mimeType": "text/xml"});
    req=WPSGetHeader("Remove")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=vector-tools",
	contentType: 'text/xml',
	data: req,
	complete: function(xml,status) {
	    if(System.si=="in")
		System.inMap=WPSParseReference(xml);
	    else
		System.outMap=WPSParseReference(xml);
	    var sld="<StyledLayerDescriptor version=\"1.0.0\"><NamedLayer><Name>Result</Name><UserStyle><Title>hatch with background</Title><FeatureTypeStyle><Rule><Name>default</Name><PolygonSymbolizer><Fill><CssParameter name=\"fill\">"+((System.si=="in")?"#FF0000":"#0000FF")+"</CssParameter></Fill><Stroke><CssParameter name=\"stroke\">#ffffff</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>";
	    if(System.overlays[System.si]){
		map.removeLayer(System.overlays[System.si]);
	    }
	    System.overlays[System.si]=new OpenLayers.Layer.WMS(
		"Select"+System.si,
		((System.si=="in")?System.inMap:System.outMap),
		{
		    format: "image/png",
		    layers: "Result",
		    styles: "default",
		    sld_body: sld
		},
		{useCanvas: System.useCanvas,isBaseLayer: false}
	    );
	    System.overlays[System.si].setVisibility(true);
	    System.overlays[System.si].setOpacity(0.3);
	    map.addLayer(System.overlays[System.si]);
	    map.setLayerIndex(System.overlays[System.si],map.layers.length-1);

	}
    });
    
    
    //System.cfeatures=[];
    //return;
    for(i=0;i<TerritoriesSelected.features.length;i++){
	alert(TerritoriesSelected.features[i].attributes["idx_id"]);
	if(TerritoriesSelected.features[i].attributes["idx_id"]==id){
	    alert(TerritoriesSelected.features[i].attributes["idx_id"]);
	    try{
		TerritoriesSelected.removeFeatures([TerritoriesSelected.features[i]]);
	    }catch(e){alert(e);}
	}
    }
}

function idxPrintDocument(){
    params=[
	{"name": "idx","value":System.index,dataType:"string"},
	{"name": "field","value":System.full_index["indicateurs_territoires_key"],dataType:"string"}
    ];
    for(i=0;i<System.cfeatures.length;i++){
	params.push({"name": System.cfeatures[i]["mmtype"]+"_val","value":System.cfeatures[i]["val"],dataType:"string"});
    }
    \$("#idxs_list").find("div").each(function(){
	params.push({"name": "idx","value":\$(this).attr('id').replace(/idx_/g,""),dataType:"string"});
    });
    params.push({"name": "tid","value":\$('#it1').val(),dataType:"string"});
    
    data=WPSGetHeader("viewRepport")+WPSGetInputs(params)+WPSGetOutput({name:"Result",form: "ResponseDocument","status": "true","storeExecuteResponse": "true", "asReference": "true"})+WPSGetFooter();
    \$("#doc_progress_bar_c").show();
    \$('#repport_submit').hide();
    \$.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=np",
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    WPSPull(xml,
		    function(){
			\$('#doc_progress_bar .ui-progress').animateProgress(arguments[0]);
			\$('#doc_progress_bar_c .loading').html(arguments[1]);
		    },
		    function(){
			var ref0=WPSParseReference(arguments[0]);
			if(ref0){
    			    \$("#doc_progress_bar_c").hide();
			    \$('#repport_submit').show();
			    var reg0=new RegExp(System.tmpUrl,"g");
			    \$.ajax({
				type: "GET",
				url: zooUrl+"?metapath=print&service=WPS&version=1.0.0&request=Execute&Identifier=preview&DataInputs=res=42;file="+ref0.replace(reg0,System.tmpPath)+"&ResponseDocument=Result@asReference=true",
				complete: function(xml,status){
				    if(\$('#print-preview-dialog')[0]){
					\$("#print-preview-dialog").window('close');
					\$("#print-preview-dialog").remove();
				    }
				    \$("body").append('<div id="print-preview-dialog" title="$zoo._("Preview printed Document").replace("'","\\'")"><div id="print-content"><a href="'+ref0+'" target="_blank" class="vidx">Télécharger le rapport</a><a href="'+ref0+'" target="_blank"><img id="preview-link" src="'+WPSParseReference(xml)+'?r='+Date()+'"/></a></div></div></div>')
				    
				    var prpos=\$(window).width() - 750;
				    \$("#print-preview-dialog").window({
					closed: false,
					top: 100,
					left: prpos,
					width: 420,
					height: 381,
					resizable:false,
					minimizable: false,
					maximizable:false,
					collapsible:false
				    });
				}
			    });
			}
		    },
		    function(){
			\$("#doc_progress_bar_c").hide();
			\$('#repport_submit').show();
		    });

	
        }
    });
}

var OverlaysLayers=[];
function mmAddOverlayLayers(){
    var params=[
	{"name": "map","value":"idxOverlays",dataType:"string"}
    ];

    var nodes=\$("#overlays_list").tree('getChecked');
    var legend=[];
    for(i in nodes)
	if(nodes[i]["id"]){
	    params.push({"name": "id","value": nodes[i]["id"].replace(/layer_/g,""),dataType:"string"});
	    var j = parseInt(nodes[i]["id"].replace(/layer_/g,""));
	    legend.push({
		"id": "layer_"+(layersList.length),
		"text": nodes[i]["text"],
		"children": \$("#overlays_list").tree('getChildren',nodes[i]["target"])
	    });
	    \$("#overlays_list").tree('uncheck',nodes[i].target);
	}


    \$("#layers_list").tree('append',{
	parent: \$("#layers_list").tree('getRoot').target,
	data:[
	    {
		"id": "layer_"+(layersList.length),
		checked: true,
		text: '<a href="#" class="sdelete" onclick="removeOverlays(\$(this));"></a>'+System.messages["Overlay Layers"]+" "+(OverlaysLayers.length+1),
		children: legend
	    }
	]
    });
    var cnt=0;
    \$("div").find("[node-id='layer_"+layersList.length+"']").each(function(){
	if(cnt==0){
	    cnt+=1;
	    return;
	}
	var child=\$(this).children();
	for(i=0;i<child.length;i++){
	    if(\$(child[i]).attr("class")!=\$(child[i]).attr("class").replace(/tree-checkbox/g,"")){
		\$(child[i]).hide();		
	    }
	}
    });
    \$(".tree_overlays_layer_class").next().hide();

    var data=WPSGetHeader("getLayers")+WPSGetInputs(params)+WPSGetOutput({name:"Result"})+WPSGetFooter();   

    $.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=mapfile",
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    var tmp=\$.parseJSON(xml.responseText);
	    var layers="";
	    for(i=0;i<tmp.length;i++){
		if(layers!="")
		    layers+=",";
		layers+=tmp[i];
	    }
	    OverlaysLayers[OverlaysLayers.length]=new OpenLayers.Layer.WMS(
		"Overlay Layers "+OverlaysLayers.length,
		System.mapUrl+"?map="+System.dataPath+"/maps/project_idxOverlays.map",
		{layers: layers,format: "image/png"},
		{useCanvas: System.useCanvas,isBaseLayer: false}
	    );
	    OverlaysLayers[OverlaysLayers.length-1].setVisibility(true);
	    map.addLayer(OverlaysLayers[OverlaysLayers.length-1]);
	    layersList[layersList.length]=OverlaysLayers[OverlaysLayers.length-1];
	    if(System.fullList.length>0)
		System.fullList.push({name: layersList[layersList.length-1].name, id: (layersList.length-1),text: "Overlay Layers "+(OverlaysLayers.length-1)});

	}
    });
}

function removeOverlays(){
    //\$("#layer_list").tree('pop',arguments[0].parent().parent());
    layersList[parseInt(arguments[0].parent().parent().attr('node-id').replace(/layer_/g,""))].setVisibility(false);
    for(i=0;i<System.fullList.length;i++)
	if(System.fullList[i].id==parseInt(arguments[0].parent().parent().attr('node-id').replace(/layer_/g,"")))
	    System.fullList.pop(i);
    arguments[0].parent().parent().parent().remove();
}

var WMSLayers=[];
function mmAddWMSLayers(){
    var nodes=\$("#wms_list").tree('getChecked');
    var tmp={"text":""}
    var layers="";
    var legend=[];
    for(i in nodes)
	if(nodes[i]["id"]){
	    if(layers!="")
		layers+=",";
	    layers+=nodes[i]["id"];
	    tmp=\$("#wms_list").tree('getParent',nodes[i].target);
	    legend.push({
		"id": "layer_"+i+"_"+(layersList.length),
		"text": nodes[i]["text"],
		"children": \$("#wms_list").tree('getChildren',nodes[i]["target"])
	    });
	    \$("#wms_list").tree('uncheck',nodes[i].target);
	}
    \$("#layers_list").tree('append',{
	parent: \$("#layers_list").tree('getRoot').target,
	data:[
	    {
		"id": "layer_"+(layersList.length),
		checked: true,
		text: '<a href="#" class="sdelete" onclick="removeOverlays(\$(this));"></a>'+System.messages["WMS Layers"]+" "+(WMSLayers.length+1),
		children: legend
	    }
	]
    });
    WMSLayers[WMSLayers.length]=new OpenLayers.Layer.WMS(
	"WMS Layers "+(WMSLayers.length+1),
	System.mapUrl+"?map="+System.dataPath+"/WMS/"+tmp.text+"ds_ows.map",
	{layers: layers,format: "image/png"},
	{useCanvas: System.useCanvas,isBaseLayer: false}
    );
    WMSLayers[WMSLayers.length-1].setVisibility(true);
    map.addLayer(WMSLayers[WMSLayers.length-1]);
    layersList[layersList.length]=WMSLayers[WMSLayers.length-1];
    if(System.fullList.length>0)
	System.fullList.push({name: layersList[layersList.length-1].name, id: (layersList.length-1),text: "WMS Layers "+(WMSLayers.length)});
}



function indexes_reaction(req0,params){
    $.ajax({
	type: "POST",
	url: System.zooUrl+"?metapath=vector-tools",
	contentType: 'text/xml',
	data: req0,
	complete: function(xml,status) {
	    idxReadFeatures(xml);
	    
	    req=WPSGetHeader("Append")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
	    $.ajax({
		type: "POST",
		url: System.zooUrl+"?metapath=vector-tools",
		contentType: 'text/xml',
		data: req,
		complete: function(xml,status) {
		    if(System.si=="in"){
			System.inMap=WPSParseReference(xml);
			toggleRepportSubmit(System[System.si+"_length"]>0);
		    }
		    else
			if(System.outMap)
			    System.outMap=WPSParseReference(xml);
		    var sld="<StyledLayerDescriptor version=\"1.0.0\"><NamedLayer><Name>Result</Name><UserStyle><Title>hatch with background</Title><FeatureTypeStyle><Rule><Name>default</Name><PolygonSymbolizer><Fill><CssParameter name=\"fill\">"+((System.si=="in")?"#FF0000":"#0000FF")+"</CssParameter></Fill><Stroke><CssParameter name=\"stroke\">#ffffff</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>";
		    if(System.overlays[System.si]){
			map.removeLayer(System.overlays[System.si]);
		    }
		    System.overlays[System.si]=new OpenLayers.Layer.WMS(
			"Select"+System.si,
			((System.si=="in")?System.inMap:System.outMap),
			{
			    format: "image/png",
			    layers: "Result",
			    styles: "default",
			    sld_body: sld
			},
			{useCanvas: System.useCanvas,isBaseLayer: false}
		    );
		    System.overlays[System.si].setVisibility(true);
		    System.overlays[System.si].setOpacity(0.3);
		    map.addLayer(System.overlays[System.si]);
		    map.setLayerIndex(System.overlays[System.si],map.layers.length-1);
		    
		    var params=[{"name": "InputEntity1", "xlink:href": ((System.si=="in")?System.inMap:System.outMap)+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result","mimeType": "text/xml"}];
		    params.push();
		    if(System.allOverlays){
			var tmp=params[0]["xlink:href"];
			params=[{"name": "InputEntity1", "xlink:href": System.allOverlays+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result","mimeType": "text/xml"}];
			params.push({"name": "InputEntity2", "xlink:href": tmp,"mimeType": "text/xml"});
		    }
		    req=WPSGetHeader("Append")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
		    $.ajax({
			type: "POST",
			url: System.zooUrl+"?metapath=vector-tools",
			contentType: 'text/xml',
			data: req,
			complete: function(xml,status) {
			    System.allOverlays=WPSParseReference(xml);
			}
		    });
		    //alert(System.mapUrl+"\?map=");
		    
		    //alert(System.inMap);
		}
	    });
	}
    });
    
}
