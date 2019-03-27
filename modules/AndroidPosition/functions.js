define([
    'module', 'jquery', 'zoo', 'xml2json', 'ol', 'mmDataTables','typeahead',"managerTools"
], function(module, $, Zoo, X2JS,ol,MMDataTable,typeahead,managerTools) {

    var title="MapMint4ME GPS";
    
    var initialize = function(zoo,app) {
	console.log("Map-Client Module: Call invoke method");
	console.log("Map-Client Module: -- Register any event for adding your tool");
	this.cnt = 0;
	this.zoo = zoo;
	console.log(this.zoo);
	this.app=app;
        console.log(navigator.userAgent);
        if(navigator.userAgent.indexOf("Android")>=0)
	loadInMainModuleBar(zoo,app);
	//app.load_menu();
    }
    var mm4mefeaturesOverlay=null;
    
    var mm4meTrackGPS=function(){
 	console.log("mm4meTrackGPS");
var closure=this;
	zoo.execute({
	    identifier: "modules.AndroidPosition.getLocation",
	    dataInputs: [
		{"identifier":"res","value":"32","dataType":"integer"},
	    ],
	    dataOutputs: [
		{"identifier":"Result","mimeType":"application/json","type":"raw"},
	    ],
	    type: 'POST',
	    success: function(data){
		console.log("mm4meTrackGPS SUCCESS");
		console.log(closure.app);
		console.log(JSON.stringify(data));
		var geom=new ol.geom.Point(ol.proj.transform([parseFloat(data[0]),parseFloat(data[1])], 'EPSG:4326','EPSG:3857'));
		//var geom=new ol.geom.Point(ol.proj.transform(data, 'EPSG:4326','EPSG:3857'));
		if(mm4mefeaturesOverlay==null){
		console.log("mm4meTrackGPS ");
		console.log("mm4meTrackGPS ");
	mm4mefeaturesOverlay = new ol.layer.Vector({
	    source: new ol.source.Vector({
	    })
	});
		app.getMap().addLayer(mm4mefeaturesOverlay);
		console.log("mm4meTrackGPS ");
		mm4mefeaturesOverlay.getSource().addFeatures([new ol.Feature({geometry: geom})]);
		console.log("mm4meTrackGPS ");
		console.log("mm4meTrackGPS ");

		}else{
		console.log("mm4meTrackGPS ");
		console.log("mm4meTrackGPS ");
		mm4mefeaturesOverlay.getSource().clear();
		console.log("mm4meTrackGPS ");
		mm4mefeaturesOverlay.getSource().addFeatures([new ol.Feature({geometry: geom})]);	
		console.log("mm4meTrackGPS ");
		}
		/*else{
			featuresOverlay.getSource().clear();
			 featuresOverlay.getSource().addFeature(new ol.geom.Point(data));
		}*/


		//app.pointFeature.setGeometry(data);
		console.log("mm4meTrackGPS ");
		/*app.getMap().setView(new ol.View({
      center: geom.coordinates,
      zoom: 15
    }));	*/
		console.log(JSON.stringify(ol.extent.buffer(geom.getExtent(),2)));
		app.getMap().getView().fit(ol.extent.buffer(geom.getExtent(),200),app.getMap().getSize());
		console.log(data);
			
	    },
	    error: function(data){
		console.log("mm4meTrackGPS ERROR");
		console.log("mm4meTrackGPS ");
		console.log(JSON.stringify(data));
	    }		    
	});
 	console.log("/mm4meTrackGPS");
        if(isActive)
        setTimeout(function(){mm4meTrackGPS();},2000);
    }

    var loadInMainModuleBar = function(zoo){
	$(".toolbar").append('<li data-toggle="tooltip" data-placement="bottom" title="'+title+'"> <a href="#" id="mm4megpsAction" class="mm-action "><i class="fa fa-android"></i><b class="ncaret hidden-sm hidden-md hidden-lg"></b><span class="hidden-sm hidden-md hidden-lg">'+title+'</span></a> </li>');
	var closure=this;
	closure.zoo=zoo;
	$("#mm4megpsAction").off('click');
	$("#mm4megpsAction").on('click',function(){
            if($(this).parent().hasClass("active")){
	    }
	    else{
	    isActive=true;
	    $(this).parent().parent().find(".active").removeClass("active");
	    $(this).parent().addClass("active");
            $(".navbar").find(".navbar-collapse.in").collapse("hide");
            var saveLoc=document.location.href;
            document.location.href="intent://coillte.mapmint.com/getLocation?"+_MMID+"#Intent;scheme=https;category=android.intent.category.BROWSABLE;launchFlags=0x10000000;component=fr.geolabs.dev.mapmint4me/.MapMint4ME;end";

	    setTimeout(function(){mm4meTrackGPS();},2000);
	    }
	});
    };
    
    function deactivate(){
	console.log("DEACTIVATE MODULE!!!")
	$("#mm4megpsAction").parent().removeClass("active");
        isActive=false;
    }

    var isActive=false;
    var name = "My demo module";
    var id = "MyDemoModule";
    this.feature=null;
    this.zoo=null;
    
    // Return public methods
    return {
        initialize: initialize,
	name: name,
	id: id,
	deactivate: deactivate
    };



});

