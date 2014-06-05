var map;
var mybounds, markers, layer, osm, gsat, mapControls, loadingPanel;
var wgs84,mercator;
var gfiControl;

var System={};
System.loading_progress=0;
System.toLoad=0;
System.loaded=0;
System.flexi_cnt=0
System.ProcessLayers=[]


function progress1() {
  $('#progress_bar .ui-progress').animateProgress(Math.round(((System.loaded-System.toLoad)*100)/System.loaded));
  $('#progress_bar .ui-progress').animateProgress(Math.round(((System.loaded-System.toLoad)*100)/System.loaded));
}


function registerLoadEvents(layer) {
  layer.events.register("loadstart", layer, function() {
      System.loaded++;
      System.toLoad++;
      $("#loading").show();
      //progress1();
    });
  layer.events.register("tileloaded", layer, function() { 
      var txt="<ul>";
      var tmp=0;
      for(var i=0;i<this.map.layers.length;i++){
	if(this.map.layers[i].visibility){
	  if(this.map.layers[i].numLoadingTiles>0)
	    txt+="<li>"+this.map.layers[i].name + " (" + this.map.layers[i].numLoadingTiles + " left)</li>";
	  tmp+=this.map.layers[i].numLoadingTiles;
	}
      }
      txt+="</ul>";
      $('#progress_txt').html(txt);
      if(tmp==0)
	$("#loading").fadeOut();
    });
  layer.events.register("loadend", layer, function() {
      doOnLayerLoad();
    });
  layer.events.register("loadcancel", layer, function() {
      doOnLayerLoad();
    });
}

function doOnLayerLoad(){
  System.toLoad--;
  //progress1();
  if(System.toLoad<=0){
    System.loaded=0;
    System.toLoad=0;
    $("#loading").fadeOut();
    /*$('#progress_bar .ui-progress').animateProgress(100, function() {
	$("#loading").hide();
	});*/
  }
}

var wgs84;
var mercator;

function init(){

  /*$("#layerswitcher").css({height: ($(window).height()/2)+"px"});
    $("#layers_list").css({height: (($(window).height()/2)-(46))+"px"});*/
  tinit();
  $("#layers_list").tree({checkbox: true,
	onCheck: function(node, checked){
	layersList[node.id.replace(/layer_/,"")].setVisibility(checked);
      },
	onContextMenu: function(e, node){
	if(node.iconCls){
	  try{
	  e.preventDefault();
	  $("#layers_list").tree('select', node.target);
	  System.mmNodeId=node.id;
	  $('#ltm').menu('show', {
	    left: e.pageX,
		top: e.pageY
		});
	  }catch(e){alert(e);}
	}
      }
    });
  $("._layer_class").each(function(){
      $(this).next().hide();
    });
  $("._group").each(function(){
      $(this).next().hide();
    });
  $(".base_layer").tipsy();
  
  wgs84=new OpenLayers.Projection("EPSG:4326");
  mercator=new OpenLayers.Projection("EPSG:900913");
  mybounds = new OpenLayers.Bounds(-179,-80,179,80);
  mybounds=mybounds.transform(wgs84,mercator);
  map = new OpenLayers.Map('map', {
        controls: [new OpenLayers.Control.Navigation({'zoomWheelEnabled': false})],
    	projection: "EPSG:900913",
    	units: "m",
    	numZoomLevel: 19,
    	maxExtent: mybounds
    });
  
  /*loadingPanel = new OpenLayers.Control.LoadingPanel({ 'div': OpenLayers.Util.getElement('loading'), roundedCorner:false });
    map.addControl(loadingPanel);*/

            
    
 var styleMap = new OpenLayers.StyleMap({
                    "default": new OpenLayers.Style(null, {
                        rules: [new OpenLayers.Rule({
                            symbolizer: {
                            "Point": {
                                    pointRadius: 4,
                                    graphicName: "circle",
                                    fillColor: "white",
                                    fillOpacity: 1,
                                    strokeWidth: 2,
                                    strokeOpacity: 1,
                                    strokeColor: "#808080"
                                },
                                "Line": {
                                    strokeWidth: 2,
                                    strokeOpacity: 1,
                                    strokeColor: "#808080",
                                    strokeDashstyle: "dash"
                                },
                                "Polygon": {
                                    strokeWidth: 2,
                                    strokeOpacity: 1,
                                    strokeColor: "#808080",
                                    strokeDashstyle: "dash",
                                    fillColor: "white",
                                    fillOpacity: 0.3
                                }
                            }
                        })]
                    })
                });
    


 startOverlay();

    
    	map.events.register("zoomend", null, updateSlider);
          

	gfiControl = new OpenLayers.Control();
	OpenLayers.Util.extend(gfiControl, {
	  draw: function () {
	      // this Handler.Box will intercept the shift-mousedown
	      // before Control.MouseDefault gets to see it
	      this.box = new OpenLayers.Handler.Box( gfiControl, 
						     {"done": this.notice});
	      this.box.activate();
	    },
	      
	      notice: function (bounds) {
	      $('#output-gfi').html("");
	      var ll = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.left, bounds.bottom)).transform(mercator,wgs84);
	      var ur = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.right, bounds.top)).transform(mercator,wgs84);

	      for(var i=0;i<queryLayersList.length;i++){
		if(queryLayersList[i].visibility){
		  var localI=i;
		$.ajax({
		  localI: i,
		      type: "GET",
		      url: zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=mapfile.getInitialInfo&DataInputs=map="+lastMap+";layer="+queryLayersList[i].real_name+"&RawDataOutput=Result",
		      dataType: 'xml',
		      complete:function(xml,status){
		      var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
		      if(tmp!=""){
			alert(tmp);
			return;
		      }
		      
		      colModel=[];
		      fields=[];
		      var localI=this.localI;

		      if(queryLayersList[this.localI].displayed_fields=="all"){
			var nbCol=0;
			$(xml.responseXML).find("field").each(function(){
			    $(this).find("id").each(function(){
				colModel[nbCol]={display: $(this).text(), name : $(this).text(), width: (nbCol==0?80:120), sortable : true, align: 'center'};
				fields[nbCol]=$(this).text();
				nbCol++;
			      });
			  });
		      }else{
			var tmp=queryLayersList[this.localI].displayed_fields.split(',');
			var tmp1=queryLayersList[this.localI].displayed_fields_width.split(',');
			var tmp2=queryLayersList[this.localI].displayed_fields_aliases.split(',');
			var nbCol=0;
			$(xml.responseXML).find("field").each(function(){
			    $(this).find("id").each(function(){
				for(var j=0;j<tmp.length;j++)
				  if(tmp[j]==$(this).text()){
				    colModel[nbCol]={display: (tmp2[j]&&tmp2[j]!="all"?tmp2[j]:$(this).text()), name : $(this).text(), width: (tmp1[j]?tmp1[j]:120), sortable : false, align: 'center'};
				    fields[nbCol]=$(this).text();		
				    nbCol++;
				  }
			      });
			  });
		      }

		      $('#output-gfi').append('<table id="flex'+localI+'" style="display:none"></table>');

		      try{
			var tmpName="#flex"+localI;
			$("#flex"+localI).flexigrid({
			  autoload: true,
			      url: msUrl,
			      ogcProtocol: "WFS",
			      ogcUrl: msUrl,
			      autozoom: false,
			      dataType: 'xml',
			      colModel: colModel,
			      usepager: false,
			      ltoolbar: true,
			      id: localI,
			      fields: fields,
			      sortname: fields[0],
			      sortorder: "asc",
			      dwDataSource: pmapfile,
			      dwLayer: queryLayersList[localI].real_name,
			      title: queryLayersList[localI].name,
			      useLimit: false,
			      noSelection: false,
			      showTableToggleBtn: true,
			      width: "100%",
			      height: 290,
			      onHide: function(hidden) {
			      finalLayers[(this.id*3)].setVisibility(!hidden);
			      finalLayers[(this.id*3)+1].setVisibility(!hidden);
			      finalLayers[(this.id*3)+2].setVisibility(!hidden);
			    },
			      params: [{name: "bbox", value: ll.lon.toFixed(4)+","+ll.lat.toFixed(4)+","+ur.lon.toFixed(4)+","+ur.lat.toFixed(4) }],
			      tableToggleBtns: [{name: 'zoomToSetExtent',title: 'Zoom to set extent', onclick: function(){
				  map.zoomToExtent(finalLayers[(this.id.replace(/zoomToSetExtent_/,"")*3)].getDataExtent());
			     }}]

			    });
			
		      }catch(e){alert(e);}
		      var pixels= queryLayersList[this.localI].map.getPixelFromLonLat(new OpenLayers.LonLat(ll.lon, ll.lat));
		      $('.dialog-gfi').window({
			width: 625,
			    height: 500,
			    maximizable:false,
			    resizable: false,
			    onClose: function(){
			    for(var i=0;i<finalLayers.length;i++){
			      finalLayers[i].removeFeatures(finalLayers[i].features);
			    }
			  }
			});
		    }
		  });
		}
	      System.flexi_cnt++;
	      }

	    }
	  });

        mapControls = {
    	zoomin: new OpenLayers.Control.ZoomBox({title:"Zoom in box", out: false}),
	getFeature: gfiControl,
    	line: new OpenLayers.Control.Measure(OpenLayers.Handler.Path,{
                persist: true,
                geodesic: true,
                handlerOptions: {layerOptions: {styleMap: styleMap}},
                eventListeners: {
                 "measure": handleMeasurements
                }
        }),
        polygon: new OpenLayers.Control.Measure(OpenLayers.Handler.Polygon,{
                persist: true,
                geodesic: true,
                handlerOptions: {layerOptions: {styleMap: styleMap}},
                eventListeners: {
                 "measure": handleMeasurements
                }
        })
      };
    	   	
map.events.register("mousemove", map, function(e) {
  				var pixel = new OpenLayers.Pixel(e.xy.x,e.xy.y);
  				var lonlat = map.getLonLatFromPixel(pixel);  
  				var lonlatGCS = lonlat.transform(new OpenLayers.Projection("EPSG:900913"),new OpenLayers.Projection("EPSG:4326")); 
  	
                OpenLayers.Util.getElement("coords").innerHTML = '' + Math.round(lonlatGCS.lon*1000000)/1000000 + ', ' + Math.round(lonlatGCS.lat*1000000)/1000000;
            });
  

  var tmp=new OpenLayers.LonLat(0,45);
  tmp=tmp.transform(
		    new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
		    new OpenLayers.Projection("EPSG:900913") // to Spherical Mercator Projection
		    );
		    
  map.setCenter(tmp,2);

  
    /*zoom controls*/
    $('a.zoomTo_in').click(function(ev){
      ev.stopPropagation();
      ev.preventDefault();
      var zoom = map.getZoom();
      map.zoomTo(zoom + 1);
      slider.slider('value', slider.slider('value') + 1);
    return false;
    });
    $('a.zoomTo_out').click(function(ev){
      ev.stopPropagation();
      ev.preventDefault();

      var zoom = map.getZoom();
      map.zoomTo(zoom - 1);
      slider.slider('value', slider.slider('value')-1);
    return false;
    });
                    
  /*zoomTo slider*/
 
var numzoomlevels = map.getNumZoomLevels();
  
var slider = $('span.slider').slider({
    orientation: "vertical",
    range: "min", 
    animate: true,
    min: 2,
    max: numzoomlevels,
    value: map.getZoom(),
    step: 1,
	 slide: function(event, ui) {
               map.zoomTo(ui.value);
           },
           change: function(event, ui) {
               map.zoomTo(ui.value);
           }

		}).hover(function()
            {
            	  	$('.ui-slider-vertical .ui-slider-handle').tipsy({live: true,title: function() { return map.getZoom(); }, gravity: 'w'})
            	});


}

// init() ends

function handleMeasurements(event) {
        var geometry = event.geometry;
    var units = event.units;
    var order = event.order;
    var measure = event.measure;
    var lonlat = geometry.getBounds().getCenterLonLat();
    var pixels= this.map.getPixelFromLonLat(new OpenLayers.LonLat(lonlat.lon, lonlat.lat));
   
    var out = "";
    if(order == 1) {
    var element = document.getElementById('output-lenght'); 
        out += "" + measure.toFixed(3) + " " + units;
        $(".dialog-lenght").dialog({
                        autoOpen: false,
                        height: 50,
                        width: 200,
                        position: [pixels.x,pixels.y],
                        resizable: false,
                        close: function(event, ui) {
                        	}
                });
        $(".dialog-lenght").dialog("open");
    } else {
    var element = document.getElementById('output-area');
        out += "" + measure.toFixed(3) + " " + units + "<sup>2</sup>";
        $(".dialog-area").dialog({
                        autoOpen: false,
                        height: 52,
                        width: 210,
                        position: [pixels.x,pixels.y],
                        resizable: false,
                        close: function(event, ui) {
                        	}

                });
                $(".dialog-area").dialog("open");
    }
    element.innerHTML = out;
}

	
function zoomto(x,y,z) {
    var point = new OpenLayers.LonLat(x,y);
    point.transform(wgs84,mercator);
    map.setCenter(point, z);
}



 function updateSlider() {

              $( "span.slider" ).slider( "option", "value", map.getZoom() );
              
        }
        
        
function toggleControl(element) {
  for(key in mapControls) {
    var control = mapControls[key];
    if(element.name == key && $(element).is('.ui-state-active')) {
      map.addControl(control);
      control.activate();
    } else {
      control.deactivate();
      if(control.box)
	control.box.deactivate();
    }
  }
}



     
$(function(){
	$(".fg-button:not(.ui-state-disabled)")
	.hover(
		function(){ 
			$(this).addClass("ui-state-hover"); 
		},
		function(){ 
			$(this).removeClass("ui-state-hover"); 
		}
	)
	.mousedown(function(){
			$(this).parents('.fg-buttonset-single:first').find(".fg-button.ui-state-active").removeClass("ui-state-active");
			if( $(this).is('.ui-state-active.fg-button-toggleable, .fg-buttonset-multi .ui-state-active') ){ $(this).removeClass("ui-state-active"); }
			else { $(this).addClass("ui-state-active"); }	
	})
	.mouseup(function(){
		if(! $(this).is('.fg-button-toggleable, .fg-buttonset-single .fg-button,  .fg-buttonset-multi .fg-button') ){
			$(this).removeClass("ui-state-active");
		}
	});
});  

$(function(){
	$(".ls-button:not(.ui-state-disabled)")
	.hover(
		function(){ 
			$(this).addClass("ui-state-hover"); 
		},
		function(){ 
			$(this).removeClass("ui-state-hover"); 
		}
	)
	.mousedown(function(){
			$(this).parents('.ls-buttonset-single:first').find(".ls-button.ui-state-active").removeClass("ui-state-active");
			if( $(this).is('.ui-state-active.ls-button-toggleable, .ls-buttonset-multi .ui-state-active') ){ $(this).removeClass("ui-state-active"); }
			else { $(this).addClass("ui-state-active"); }	
	})
	.mouseup(function(){
		if(! $(this).is('.ls-button-toggleable, .ls-buttonset-single .ls-button,  .ls-buttonset-multi .ls-button') ){
			$(this).removeClass("ui-state-active");
		}
	});
});   

		$(function(){
			
			
			$('select#speedC').selectmenu({style:'dropdown'});
			$('select#print-options').selectmenu({style:'dropdown'});

			
	
		});

        	    

$(document).ready(function() {

    
       
    
    
    $("#layerswitcher").toggle();
    
    
    $(".ls-toogler").click(function () { 
	$("#layerswitcher").toggle();
      });  

    $('.fg-toolbar a').tipsy({fade: true, offset:5, opacity: 1, gravity: 'nw'});

    $('.toolbar-noborder a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});


    $(".print").click(function () {
 	
	$('#print-window').window( 	{
	  collapsible:false,
	      minimizable:false,
	      maximizable:false,
	      draggable:true,
	      resizable: false
	      });	 	
	
	$('#print-window').window('open'); 
      }); 
    
    
    $(".edit-toolbar").click(function () {
	
	$( "#editing-toolbar" ).window({
	  collapsible:false,
	      minimizable:false,
	      maximizable:false,
	      draggable:true,
	      resizable: false
	      
	      });	
	$('#editing-toolbar').window('open'); 
      });

    $(".spatial-toolbar").click(function () {
	
	$( "#spatial-toolbar" ).window({
	  collapsible:false,
	      minimizable:false,
	      maximizable:false,
	      draggable:true,
	      resizable: false
	      
	      });	
	$('#spatial-toolbar').window('open'); 
      });

    $(".raster-toolbar").click(function () {
	
	$( "#raster-toolbar" ).window({
	  collapsible:false,
	      minimizable:false,
	      maximizable:false,
	      draggable:true,
	      resizable: false
	      
	      });	
	$('#raster-toolbar').window('open'); 
      });
    
    $(".terrain-toolbar").click(function () {
	
	$( "#terrain-toolbar" ).window({
	  collapsible:false,
	      minimizable:false,
	      maximizable:false,
	      draggable:true,
	      resizable: false
	      
	      });	
	$('#terrain-toolbar').window('open'); 
      });
    
    
    
    
    $(function() { 
	
	$("select#speedC").change(function() { 
	    
	    var x1 = $(this).find("option:selected").attr("value").split(',')[0];
	    var y1 = $(this).find("option:selected").attr("value").split(',')[1];
	    var z1 = $(this).find("option:selected").attr("value").split(',')[2];
	    zoomto(x1,y1,z1)
	      
	      });

      });
    
    
    
    
   $(".zoomTo").click(function () {
       try{
	 var i=System.mmNodeId.replace(/layer_/,"");
	 var bounds = new OpenLayers.Bounds(
			layersList[i].mmLc[0], layersList[i].mmLc[1],
			layersList[i].mmUc[0], layersList[i].mmUc[1]
	    );
	 var proj=new OpenLayers.Projection("EPSG:4326");
	 map.zoomToExtent(bounds.transform(proj, map.getProjectionObject()));
       }catch(e){}
     });
     








  });
// end ready


function singleGeom() {
  var aProcess=arguments[1];
  var tmpId=finalLayers[(arguments[0]*3)]?(arguments[0]*3):0;
  //alert(tmpId+" "+arguments[0]);

  if (finalLayers[tmpId+2].features.length == 0)
    return alert("No feature selected!");

  var started=true;
  //alert(finalLayers[tmpId+3].name);
  var dep=finalLayers[tmpId+3];

  var url = '/cgi-bin/zoo_loader.cgi?request=Execute&service=WPS&version=1.0.0&';
  if (aProcess == 'BufferPy') {
    var dist = document.getElementById('bufferDist')?document.getElementById('bufferDist').value:'1';
    if (isNaN(dist))
return alert("Distance is not a Number!");
    url+='Identifier=BufferPy&DataInputs=BufferDistance=0.01@datatype=interger;InputPolygon=Reference@xlink:href=';
  } else
    if(aProcess == "SimpleBBOX" || aProcess == "SimpleChain" || 
       aProcess == "Mask" || aProcess == "BufferMask" || 
       aProcess == "BufferRequest" || 
       aProcess == "SimpleChain1" || aProcess == "SimpleChain2")
      url += 'Identifier='+(aProcess == "SimpleChain2"?"BufferRequest":aProcess)+'&DataInputs=InputData=Reference@xlink:href=';
    else
      url += 'Identifier='+aProcess+'&DataInputs=InputPolygon=Reference@xlink:href=';
  var xlink = msUrl +"?map="+pmapfile+"&SERVICE=WFS&REQUEST=GetFeature&VERSION=1.0.0";
  xlink += '&typename='+arguments[2];
  //xlink += '&SRS='+control.protocol.srsName;

  /*bounds = new OpenLayers.Bounds();
  var f=new OpenLayers.Format.WKT();  
  var bbounds=f.read(select.features[0].geometry);
  var bounds=select.features[0].geometry.getVertices();
  var fbounds = new OpenLayers.Bounds();
  for(var t in bounds){
    fbounds.extend(bounds[t]);
    }*/

  xlink += '&FeatureID=';
  
  for(var i=0;i<finalLayers[tmpId+2].features.length;i++)
    xlink += (i>0?",":"") + finalLayers[tmpId+2].features[i].fid;
  url += encodeURIComponent(xlink);
  url += '&RawDataOutput=Result@mimeType=application/json';
  
  var request = new OpenLayers.Request.XMLHttpRequest();
  request.open('GET',url,true);
  request.onreadystatechange = function() {
    if(request.readyState == OpenLayers.Request.XMLHttpRequest.DONE) {
      var GeoJSON = new OpenLayers.Format.GeoJSON();
      var features = GeoJSON.read(request.responseText);
      finalLayers[tmpId+3].removeFeatures(finalLayers[tmpId+3].features);
      if(aProcess!="SimpleChain1" && aProcess!="SimpleChain2"
	 && aProcess!="BufferRequest")
	if(dep!=finalLayers[tmpId+3])
	  finalLayers[tmpId+3].removeFeatures(hover_.features);
      try{
	for(var j in features)
	  if(features[j].geometry){
	    features[j].geometry=features[j].geometry.transform(wgs84,mercator);
	  }
      }catch(e){alert(e);}
      finalLayers[tmpId+3].addFeatures(features);
      /*slist=$(".multi-process:not(.ui-state-disabled)");
      for(var i=0;i<slist.length;i++)
      slist[i].style.display='block';*/
    }
  }
  request.send();

  /*if(aProcess == "SimpleChain2" && started)
    singleProcessing("BufferMask",hover_);*/

}
