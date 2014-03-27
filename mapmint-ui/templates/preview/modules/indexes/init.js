function readIndexForGeo(featureGeoJSON,lbounds){
	
    for(var i=0;i<queryLayersList.length;i++){
	if(queryLayersList[i].real_name==\$('#it1 option:selected').text()){
	    var params=[{"name": "InputEntity1","value": featureGeoJSON,"mimeType": "application/json"},{"name": "InputEntity2", "xlink:href": msUrl+"?map="+mapPath+"/project_${conf["senv"]["last_map"]}.map&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=ms:"+queryLayersList[i].local_id+"&amp;bbox="+lbounds.getBounds(),"mimeType": "text/xml"}];
	    if(System.inMap || System.outMap){
		if(!System.allOverlays){
		    if((System.si=="in") && System.outMap)
			params.push({"name": "InputEntity3","xlink:href": System.outMap+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
		    else
			if(System.inMap)
			    params.push({"name": "InputEntity3","xlink:href": System.inMap+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result"+"&amp;__tt="+Date(),"mimeType": "text/xml"});
		}else
		    params.push({"name": "InputEntity3","xlink:href": System.allOverlays+"&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=Result&amp;bbox="+lbounds.getBounds()+"&amp;__tt="+Date(),"mimeType": "text/xml"});
		
	    }
	    req=WPSGetHeader("Intersection0")+WPSGetInputs(params)+WPSGetOutput({"name": "Result","form":"ResponseDocument","mimeType": "image/png","asReference":"true"})+WPSGetFooter();
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
	}
    }
}

var myStyleMap=new OpenLayers.StyleMap({
	"default": new OpenLayers.Style({
		strokeColor: "#eeeeee",
		pointRadius: 5,
		strokeWidth: 1
	}, {
		rules: [
			new OpenLayers.Rule({
				filter: new OpenLayers.Filter.Comparison({
					type: OpenLayers.Filter.Comparison.LIKE,
					property: "idx_type",	
					value: "in"
				}),
				symbolizer: {
					fillColor: "#880000",
					pointRadius: 5
				}
			}),
			new OpenLayers.Rule({
				filter: new OpenLayers.Filter.Comparison({
					type: OpenLayers.Filter.Comparison.LIKE,
					property: "idx_type",	
					value: "out"
				}),
				symbolizer: {
					fillColor: "#000088",
					pointRadius: 5
				}
			}),
			new OpenLayers.Rule({
				elseFilter: true,
				symbolizer: {
					fillColor: "#aaaa00",
					opacity: 0.3,
					pointRadius: 5
				}
			})
		]
	})
});

TerritoriesSelected=new OpenLayers.Layer.Vector("TerritoriesSelected", {
    styleMap: myStyleMap,
    renderers: System.renderer
});
map.addLayer(TerritoriesSelected);
System.overlays={};

idxCirControl = new OpenLayers.Control();
OpenLayers.Util.extend(idxCirControl, {
    
    draw: function () {
	// this Handler.Box will intercept the shift-mousedown
	// before Control.MouseDefault gets to see it
	this.box = new OpenLayers.Handler.RegularPolygon( idxCirControl, 
							  {"done": this.notice},
							  {sides: 40});
	this.box.activate();
    },
    
    notice: function (bounds) {
	\$('#output-gfi').html("");
	var geojson = new OpenLayers.Format.GeoJSON; 
	featureGeoJSON=geojson.write(new OpenLayers.Feature.Vector(bounds.transform(mercator,wgs84)));
	readIndexForGeo(featureGeoJSON,bounds);
    }
});


idxStdControl = new OpenLayers.Control();
OpenLayers.Util.extend(idxStdControl, {
    draw: function () {
	// this Handler.Box will intercept the shift-mousedown
	// before Control.MouseDefault gets to see it
	this.box = new OpenLayers.Handler.Box( idxStdControl, 
					       {"done": this.notice});
	this.box.activate();
    },
    notice: function (bounds) {
	var geojson = new OpenLayers.Format.GeoJSON; 
	
	var ll = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.left, bounds.bottom)).transform(map.getProjectionObject(),wgs84);
	var ur = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.right, bounds.top)).transform(map.getProjectionObject(),wgs84);
	bounds1 = new OpenLayers.Bounds();
	bounds1.extend(ll);
	bounds1.extend(ur);
	bounds0=bounds1.toGeometry();
	var attributes = {name: "my name", bar: "foo"};
	featureGeoJSON=geojson.write(new OpenLayers.Feature.Vector(bounds0,attributes));

	readIndexForGeo(featureGeoJSON,bounds0);

    }
});

OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
    defaultHandlerOptions: {
        'single': true,
        'double': false,
        'pixelTolerance': 0,
        'stopSingle': false,
        'stopDouble': false
    },
    
    initialize: function(options) {
        this.handlerOptions = OpenLayers.Util.extend(
            {}, this.defaultHandlerOptions
        );
        OpenLayers.Control.prototype.initialize.apply(
            this, arguments
        ); 
        this.handler = new OpenLayers.Handler.Click(
            this, {
                'click': this.notice
            }, this.handlerOptions
        );
    }, 
    
    notice: function(e) {
        var lonlat = map.getLonLatFromViewPortPx(e.xy);
        bounds3=lonlat;
	var ll=new OpenLayers.LonLat(bounds3.lon-100, bounds3.lat-100);
	var ur=new OpenLayers.LonLat(bounds3.lon+100, bounds3.lat+100);
	bounds2 = new OpenLayers.Bounds();
	bounds2.extend(ll);
	bounds2.extend(ur);
	bounds2.transform(map.getProjectionObject(),wgs84);
	bounds4=bounds2.toGeometry();
	var attributes = {name: "my name", bar: "foo"};
	var geojson = new OpenLayers.Format.GeoJSON; 
	featureGeoJSON=geojson.write(new OpenLayers.Feature.Vector(bounds4,attributes));
	readIndexForGeo(featureGeoJSON,bounds4);


    }
    
});

idxPoiControl = new OpenLayers.Control.Click();


toggleRepportSubmit(false);

idxCtrl={"infopoint": idxPoiControl, "info": idxStdControl,"infocircle": idxCirControl};
map.addControls([idxPoiControl,idxStdControl,idxCirControl]);

for(var i in idxCtrl)
    mapControls[i]=idxCtrl[i];
for(i in mapControls){
    toggleControl({"name":i});
    break;
}

