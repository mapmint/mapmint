// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic', 'ol','datasources','mmDataTables','colorpicker','slider'
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,ol,datasources,MMDataTable,colorpicker,slider) {
    

    var _x2js = new X2JS({
        arrayAccessFormPaths: [
            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
            'Capabilities.ServiceIdentification.Keywords'
        ],   
    });
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
	language: module.config().language
    });

    function publishMap(){
	var lbindings={
	    "labelFormat": "mmLabelFormat",
	};
	var inputs=[];

	var val=$("textarea[name=projectDescription]").code();
	inputs.push({
	    "identifier": "mmDescription",
	    "value": (val.indexOf("<div>")==0?"":"<div>")+val+(val.indexOf("<div>")==0?"":"</div>"),
	    "mimeType": "text/plain"
	});


	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmProjectName",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	//mmDescription

	var tmp=["Title","Keywords","Author","Copyright"];
	for(var i=0;i<tmp.length;i++){
	    if($("#mm_property_display").find("input[name=project"+tmp[i]+"]").val()!="")
		inputs.push({
		    "identifier": "mm"+tmp[i],
		    "value": $("#mm_property_display").find("input[name=project"+tmp[i]+"]").val(),
		    "dataType": "string"
		});
	}

	inputs.push({
	    "identifier": "layout_t",
	    "value": "leftcol_bs",
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmBAK",
	    "value": $("#mmBAK").val(),
	    "dataType": "string"
	});

	inputs.push({
	    "identifier": "mmLayoutColor",
	    "value": "green",
	    "dataType": "string"
	});

	var rasterLayers=[];
	var vectorLayers=[];
	var activatedLayers=[];
	var popups=[];
	var windows=[];
	$("input[type=radio]:checked").each(function(){
	    if($(this).val()=="raster"){
		rasterLayers.push($(this).attr("id").replace(/layer_type1_/g,""));
	    }else
		vectorLayers.push($(this).attr("id").replace(/layer_type_/g,""));
	});
	$("input[name=activate]:checked").each(function(){
	    activatedLayers.push($(this).attr("id").replace(/is_activated_layer_/g,""));
	});
	$("input[name=popup]:checked").each(function(){
	    popups.push($(this).attr("id").replace(/layer_has_popup_/g,""));
	});
	$("input[name=windows]:checked").each(function(){
	    windows.push($(this).attr("id").replace(/layer_has_click_/g,""));
	});
	var minmaxArray=[[],[],[],[]];
	$("#datasources_list").find("tr").each(function(){
	    var cnt=0;
	    $(this).find("input[type=text]").each(function(){
		minmaxArray[cnt].push($(this).val());
		cnt+=1;
	    });
	});

	var minmaxValues=["minScales","maxScales","lminScales","lmaxScales"];
	for(var i=0;i<minmaxValues.length;i++){
	    inputs.push({
		"identifier": minmaxValues[i],
		"value": minmaxArray[i].join(','),
		"dataType": "string"
	    });
	}


	inputs.push({
	    "identifier": "mmMBaseLayers",
	    "value": $("#mapquest").val().join(','),
	    "dataType": "string"
	});

	inputs.push({
	    "identifier": "mmLSPos",
	    "value": $('select[name="layerswitcherPosition"]').val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmLSAct",
	    "value": $('select[name="layerswitcherOpen"]').val(),
	    "dataType": "string"
	});

	$(".um_groups_f").find("select").each(function(){
	    inputs.push({
		"identifier": "mm_access_groups",
		"value": $(this).val(),
		"dataType": "string"
	    });	    
	});
	$(".tm_themes_f").find("select").each(function(){
	    inputs.push({
		"identifier": "mm_themes_class",
		"value": $(this).val(),
		"dataType": "string"
	    });	    
	});

	var tools=["mmNav","mmOT","mmVT"];
	for(var i=0;i<tools.length;i++){
	    inputs.push({
		"identifier": tools[i],
		"value": $("#"+tools[i]).val().join(','),
		"dataType": "string"
	    });
	}

	$("#mm_mapp_display").find("input[type=text]").each(function(){
	    console.log($(this));
	    if($(this).val()!="")
		inputs.push({
		    "identifier": $(this).attr("id"),
		    "value": $(this).val(),
		    "dataType": "string"
		});
	});
	inputs.push({
	    "identifier": "mmOSMBaseLayers",
	    "value": ""+$("#base_osm").is(":checked"),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "base_osm",
	    "value": ""+$("#base_osm").is(":checked"),
	    "dataType": "string"
	});

	inputs.push({
	    "identifier": "mmPBaseLayers",
	    "value": $("#"+$("#mmBBDefault").val()).val().join(','),
	    "dataType": "string"
	});

	inputs.push({
	    "identifier": "mmProprietaryBaseLayers",
	    "value": $("#mmBBDefault").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmBProject",
	    "value": ($("#mmBProject").val()!=-1?$("#mmBProject").val():""),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmActivatedBaseLayers",
	    "value": $("#base_layer_active_sel").val(),
	    "dataType": "string"
	});

	inputs.push({
	    "identifier": "ffamily",
	    "value": $("#mm_mapp_display").find("select[name=layoutFont]").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "fsize",
	    "value": $("#mm_mapp_display").find("select[name=layoutFontSize]").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "fsize",
	    "value": $("#mm_mapp_display").find("select[name=layoutFontColor]").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "tprj",
	    "value": $("#tprj").val(),
	    "dataType": "string"
	});



	inputs.push({
	    "identifier": "mmWindowList",
	    "value": windows.join(','),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmPopupList",
	    "value": popups.join(','),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmActivatedLayers",
	    "value": activatedLayers.join(','),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "vectorLayers",
	    "value": vectorLayers.join(','),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "rasterLayers",
	    "value": rasterLayers.join(','),
	    "dataType": "string"
	});

	zoo.execute({
	    identifier: "mapfile.savePublishMap",
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
	return false;
    }

    function publishPreview(){
	$(".notifications").notify({
	    message: { text: "Start publication" },
	    type: 'success',
	}).show();
	zoo.execute({
	    identifier: "mapfile.savePublishPreview",
	    type: "POST",
	    dataInputs: [
		{
		    "identifier": "map",
		    "value": module.config().pmapfile,
		    "dataType": "string"
		}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function removeProject(){
	zoo.execute({
	    identifier: "mapfile.removeMap",
	    type: "POST",
	    dataInputs: [
		{
		    "identifier": "map",
		    "value": module.config().pmapfile,
		    "dataType": "string"
		}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		document.location.reload(false);
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function updateBaseLayers(){
	$("#base_layer_active").html("");
	loadBaseLayers();
    }

    function loadBaseLayers(){
	var baselayers=[];
	var proprietary=false;
	$("#mm_baselayers_display").find('select').each(function(){
	    if($(this).attr("id")!="mmBBDefault"){
		$(this).find("option:selected").each(function(){
		    if($(this).attr("value")!=-1)
			$("#base_layer_active").append($(this)[0].outerHTML);
		});
	    }
	    else{
		proprietary=true;
	    }
	});
	var i=1;
	if($("#base_osm").is(":checked")){
	    $("#base_layer_active").prepend('<option value="1">OpenStreetMap</option>');
	}
	$("#base_layer_active").find("option").each(function(){
	    $(this).attr("value",i);
	    $(this).prop("selected",false);
	    var lowLimit=($("#base_osm").is("checked")?1:0);
	    if(i-1>lowLimit && i-1 <= $("#mapquest").find("option:selected").length+lowLimit){
		var origin=$(this).text();
		$(this).text("MapQuest "+origin);
	    }else{
		if(i-1>lowLimit){
		    var origin=$(this).text();
		    $(this).text($("#mmBBDefault").val()+" "+origin);
		}
	    }
	    i+=1;
	});
	$("#base_layer_active").val($("#base_layer_active_sel").val());
	console.log(baselayers);
    }

    var actions={
	"publish": publishMap,
	"publishPreview": publishPreview
    };
    var initialize=function(){

	adminBasic.initialize(true);
	loadBaseLayers();
	$("#manaMap").find(".btn-group").first().find("button").click(function(e){
	    if($(this).attr("data-act"))
		actions[$(this).attr("data-act")]();
	});
	$("#removeModal").find(".modal-footer").find("button").last().click(function(e){
	    removeProject();
	});
	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );

	$(".tab-pane").css({"max-height":($(window).height()-(4*$("nav").height()))+"px","overflow-x":"hidden","overflow-y":"auto"});
	console.log("Start Publisher");
	$('#datasources_list').DataTable( {
	    autoWidth: false,
	    "scrollY":  ($(window).height()/2)+"px",
	    "scrollCollapse": true,
	    "scrollX":        true,
            "paging":         false,
            "ordering":       false,
            "info":           false,
	    "responsive":     true,
	    deferRender:      true,
	    crollCollapse:    true,
	    bFilter:          false
	} );
	$('table.gen').DataTable( {
	    "scrollCollapse": true,
	    "scrollX":        true,
            "paging":         false,
            "ordering":       false,
            "info":           false,
	    "responsive":     true,
	    deferRender:      true,
	    crollCollapse:    true,
	    bFilter:          false
	} );
	// DataTables with reponsive parameter requires the following for re-activating the input radio
	$("#mm_olayers_display").find("input[type=radio]").each(function(){
	    if($(this).attr("checked"))
		$(this).prop("checked",true);
	});

	$('.cpicker').colorpicker();

	$(".gselectAdd").click(function(e){
	    var rootNode=$(this).parent().parent();
	    var toDuplicate=$(this).parent().next();
	    rootNode.append(toDuplicate[0].outerHTML);
	    rootNode.find(".gselect").last().attr("id","um_group_"+($(".gselect").length-1));
	    return false;
	});
	$(".gselectDel").click(function(e){
	    var rootNode=$(this).parent().parent();
	    var toRemove=rootNode.find(".gselect").last();	    
	    toRemove.remove();
	    return false;
	});

	window.setTimeout(function () { 
	    adminBasic.typeaheadMap(module,zoo,[$("#save-map"),$("#save-map")]);
	},100);
	window.setTimeout(function () { 
	    $(".mm-editor").summernote({height: 150});
	}, 110);

    };

    // Return public methods
    return {
        initialize: initialize,
	updateBaseLayers: updateBaseLayers,
    };



});

