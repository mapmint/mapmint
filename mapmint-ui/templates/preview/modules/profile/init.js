#import zoo
var points_layers1=false;
function loadProfile(){
    var json=new OpenLayers.Format.JSON();
    tmp=json.read(arguments[0]);
    coord=tmp["coordinates"];
    var values=[];
    var j=0;
    sspoints=[];
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

    var lonlat = arguments[1].getBounds().getCenterLonLat();
    var pixels= this.map.getPixelFromLonLat(new OpenLayers.LonLat(lonlat.lon, lonlat.lat));
#if $m.web.metadata.get('layout_t')=="mobile"
\$("<div class='ui-loader ui-overlay-shadow ui-body-d ui-corner-all'><h1>"+out+"</h1></div>").css({ "z-index": 10000, "display": "block", "opacity": 0.96, "top": \$(window).scrollTop() + 100 })
  .appendTo( \$("#map") )
  .delay( 1500 )
  .fadeOut( 400, function(){
    \$(this).remove();
    if(mapControls.line.active){
	mapControls.line.deactivate();
        toggleControl({"name":"line"});
    }else{
	mapControls.polygon.deactivate();
        toggleControl({"name":"polygon"});
    }
  });
#else
    \$(".dialog-profile").dialog({
        autoOpen: false,
        height: 430,
        width: 500,
        position: [pixels.x,pixels.y],
        resizable: false,
        onClose: function(event, ui) {
	    if(points_layer1.features.length>0)
		points_layer1.removeFeatures(points_layer1.features);
	    mapControls["profile_line"].handler.destroyPersistedFeature();
        }
    });
    \$(".output-profile").css({"height": "340px"});
    \$(".dialog-profile").dialog("open");
#end if
    if(points_layers1==false){
	points_layer1 = new OpenLayers.Layer.Vector("points1");
	points_layer1.styleMap=new OpenLayers.StyleMap({pointRadius: 4, fillColor: "#3E576F",
							fillOpacity: 0.8, strokeColor: "white"});
	map.addLayers([points_layer1]);
    }
    
    Highcharts.setOptions({
	lang: {
	    resetZoomTitle: "$zoo._("Reset to initial zoom level")",
	    resetZoom: "$zoo._("Reset zoom")"
	}
    });
    var chart = new Highcharts.Chart({
	chart: {
	    zoomType: 'x',
	    renderTo: 'output-profile'
	},
	title: {
	    text: "$zoo._('Elevation profile')"
	},
	xAxis: {
	    labels: {
		formatter: function(){
		    var tmp=this.value+"";
		    return tmp;
		    /*if(tmp.indexOf('.')!=0)
		      if(distances[tmp])
		      return parseDistance(Math.round(distances[tmp]*111120));*/
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
			    if(\$("#profileZoomOnMap").is(':checked'))
				map.zoomToExtent(System.curExtent);
			    if(!points_layers1){
				points_layer1 = new OpenLayers.Layer.Vector("points1");
				points_layer1.styleMap=new OpenLayers.StyleMap();
				map.addLayers([points_layer1]);
			    }
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
}


function handleProfile(event) {
    var geometry = event.geometry;
    var units = event.units;
    var order = event.order;
    var measure = event.measure;
    var lonlat = geometry.getBounds().getCenterLonLat();
    var pixels= this.map.getPixelFromLonLat(new OpenLayers.LonLat(lonlat.lon, lonlat.lat));
   
    var geojson=new OpenLayers.Format.GeoJSON();
    var params=[];
    var params0=[{name: "tmpl",value:"public/project_js",dataType: "string"}];
    for(i in pmapfiles){
	if(pmapfiles[i][pmapfiles[i].length-1]!=-1){
	    params[params.length]={name: "RasterFile",value:pmapfiles[i][pmapfiles[i].length-1],dataType: "string"};
	    params0[params0.length]={name: "layer",value:i,dataType: "string"};
	    //alert(i+" "+pmapfiles[i][pmapfiles[i].length-1]);
	}
    }
    params0[params0.length]={name: "geometry",value: geojson.write(event.geometry.transform(mercator,wgs84),false),mimeType: "application/json"};
    data=WPSGetHeader("template.display")+WPSGetInputs(params0)+WPSGetOutput({name:"Result"})+WPSGetFooter();
    params[params.length]={name: "Geometry","xlink:href": zooUrl, "method":"POST","headers":[{"key":"Content-Type","value":"text/xml"},{"key":"Cookie","value":"MMID=$conf["senv"]["MMID"]"}], "body": "<wps:Body>"+data+"</wps:Body>", mimeType: "application/json"};
    data=WPSGetHeader("raster-tools.GdalExtractProfile")+WPSGetInputs(params)+WPSGetOutput({name:"Profile"})+WPSGetFooter();
    params0[0]["value"]="public/project_inv_js";
    params0[params0.length-1]={name: "geometry","xlink:href": zooUrl, "method":"POST","headers":[{"key":"Content-Type","value":"text/xml"},{"key":"Cookie","value":"MMID=$conf["senv"]["MMID"]"}], "body": "<wps:Body>"+data+"</wps:Body>",mimeType: "application/json"};
    data=WPSGetHeader("template.display")+WPSGetInputs(params0)+WPSGetOutput({name:"Result"})+WPSGetFooter();

    $.ajax({
	type: "POST",
	url: System.zooUrl,
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    //urlContext = xml.responseText;
	    loadProfile(xml.responseText,geometry);
        }
    });
}
