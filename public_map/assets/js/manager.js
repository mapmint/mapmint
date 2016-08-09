// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic', 'ol','datasources','mmDataTables','rowReorder','colorpicker','slider',"sortable"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,ol,datasources,MMDataTable,rowReorder,colorpicker,slider,sortable) {
    

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

    var shouldInit=true;
    var map;
    var oLayers={};
    var myBaseLayers=[];
    var myMMDataTableObject;
    var geotypeClasses=[
	"point",
	"line",
	"polygon",
	"raster"
    ];

    function createParam(obj){
	return {
	    "identifier": $(obj).attr("name"),
	    "value": $(obj).val(),
	    "dataType": "string"
	}
    }

    function loadDataSource(map,layer){
	zoo.execute({
	    identifier: "mapfile.getInitialInfo",
	    type: "POST",
	    dataInputs: [
		{"identifier": "priv","value":"r","dataType":"string"},
		{"identifier": "map","value":map,"dataType":"string"},
		{"identifier": "layer","value":layer,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data.datasource.geometry);


		oLayers[layer]["queryParams"]={
		    fields: [],
		    aliases: [],
		    sizes: []
		};
		if(data.datasource.fields)
		    for(var i in data.datasource.fields.field){
			var ldata=data.datasource.fields.field;
			oLayers[layer]["queryParams"].fields.push(ldata[i]["id"]);
			oLayers[layer]["queryParams"].aliases.push(ldata[i]["id"]);
			oLayers[layer]["queryParams"].sizes.push(100);
		    }
		oLayers[layer]["map"]=module.config().dataPath+"/maps/search_"+$("#save-map").val()+"_"+layer+".map";
		console.log(oLayers);

		if(!data.datasource.geometry)
		    datasources.displayRaster(data,map,map,layer,$("#manaTableDisplay"),($(window).height()-$("nav").height())/2.2);
		else{
		    $("#manaTableDisplay").html("");
		    myMMDataTableObject = new MMDataTable({"selectLayer": selectLayer, "zook": zoo, oLayers: oLayers,msUrl: module.config().msUrl,pmapfile: module.config().dataPath+"/maps/search_"+$("save-map").val()+"_"+layer+".map",container:$("#manaTableDisplay"),config: module.config()});

		    myMMDataTableObject.display(layer,{
			url: module.config().msUrl,
			data: {
			    "map": module.config().dataPath+"/maps/search_"+$("save-map").val()+"_"+layer+".map",
			    version: "1.0.0",
			    service: "WFS",
			    request: 'GetFeature',
			    typename: layer
			}
		    });
		}
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

    function setMapHeight(){
	var mpheight= $(window).height() - $('.navbar-header').height();
	$('#map,#manaLayerOrder,#manaLayerProperties,#manaMap').height(mpheight);
    }

    function toggleStylerForms(elem,typ){
	var rootLocation=elem;
	for(var k in geotypeClasses){
	    console.log("Treat: "+geotypeClasses[k]+" "+typ+" "+k);
	    if(k==typ){
		rootLocation.find(".require-"+geotypeClasses[k]).show();
		rootLocation.find(".no-"+geotypeClasses[k]).hide();
	    }else{
		rootLocation.find(".require-"+geotypeClasses[k]).hide();
		rootLocation.find(".no-"+geotypeClasses[k]).show();
	    }
	}
    }


    var llevels=["first","second","third","forth"];
    var llevelInit=false;
    var mlegend=null;
    var mmenu=[[],[],[],[]];
    var legendSteps={};
    var colorRamps={};
    var layerLabels={};
    function addToLayerSwitcher(oid,data,level){
	for(var id in data){
	    if(id=="labels"){
		layerLabels[data["layer"]]=data[id];
	    }
	    else if(id=="steps"){
		legendSteps[data["layer"]]=data[id];
	    }
	    else if(id=="tiled"){
		colorRamps[data["layer"]]=data[id];
	    }else{
		console.log(id);
		if(level>0)
		    console.log(mmenu[level-1]);
		if($.isArray(data[id])){
		    //llevelInit=false;
		    mmenu[level].push(id);
		    var lid=id.replace(/ /g,"-_-");
		    var cid=id.replace(/-_-/g," ");
		    var regs=[
			new RegExp("\\[id\\]","g"),
			new RegExp("\\[lid\\]","g"),
			new RegExp("\\[level\\]","g")
		    ];
		    var myHTML=$("#layerswitcher_group_template")[0].innerHTML
			.replace(regs[0],cid)
			.replace(regs[1],lid)
			.replace(regs[2],llevels[level]);
		    if(!llevelInit){
			llevelInit=true;
			$("#layerswitcher").parent().append(myHTML);
		    }
		    else{
			$("#layerswitcher").parent().find('ul#'+oid).last().append(myHTML);
		    }
		    for(var index in data[id]){
			addToLayerSwitcher(id,data[id][index],level+1);
		    }
		}else{
		    var regs=[
			new RegExp("\\[id\\]","g")
		    ];
		    var myHTML=$("#layerswitcher_item_template")[0].innerHTML
			.replace(regs[0],data[id]);
		    if(!llevelInit){
			llevelInit=true;
			$("#layerswitcher").parent().append(myHTML);
		    }
		    else{
			console.log(data);
			$("#layerswitcher").parent().find('ul#'+oid).last().append(myHTML);
		    }
		}
	    }
	}
    }

    var llevelInit0=false;
    function addToLayerLegend(oid,data,level){
	for(var id in data)
	    if(id!="steps" && id!="tiled"){
		if($.isArray(data[id])){
		    var lid=id.replace(/ /g,"-_-");
		    var cid=id.replace(/-_-/g," ");
		    var regs=[
			new RegExp("\\[id\\]","g"),
			new RegExp("\\[lid\\]","g"),
			new RegExp("\\[level\\]","g")
		    ];
		    var myHTML=$("#layerLegend_group_template")[0].innerHTML
			.replace(regs[0],cid)
			.replace(regs[1],lid)
			.replace(regs[2],llevels[level]);
		    if(!llevelInit0){
			llevelInit0=true;
			$("#layerLegend_drag").append(myHTML);
		    }
		    else{
			$("#layerLegend_drag").find('ul#'+oid).last().append(myHTML);
		    }
		    for(var index in data[id]){
			addToLayerLegend(id,data[id][index],level+1);
		    }
		}else{
		    var regs=[
			new RegExp("\\[id\\]","g")
		    ];
		    console.log(data[id]);
		    var myHTML=$("#layerLegend_item_template")[0].innerHTML
			.replace(regs[0],data[id]);
		    if(!llevelInit){
			llevelInit=true;
			$("#layerLegend_drag").append(myHTML);
		    }
		    else{
			$("#layerLegend_drag").find('ul#'+oid).last().append(myHTML);
		    }
		}
	    }
    }

    function getLayerIndexByName(layer){
	var lindex=myBaseLayers.length;
	for(var i in oLayers){
	    if(i==layer){
		break;
	    }
	    lindex+=1;
	}
	return lindex;
    }

    function redrawLayer(layer,url,opts,itemIndex){
	var lindex=getLayerIndexByName(layer);
	console.log(layer);
	console.log(lindex);
	var iId=(itemIndex?itemIndex:0);
	var params={time_: (new Date()).getTime()};
	if(opts)
	    for(var a in opts)
		params[a]=opts[a];
	try{
	    map.getLayers().item(lindex).getSource().updateParams(params);
	}catch(e){
	    try{
		map.getLayers().item(lindex).getLayers().item(iId).getSource().updateParams(params);
	    }catch(e){
		console.log("Unable to update layer params.");
	    }
	}
	if(url){
	    try{
		map.getLayers().item(lindex).getSource().setUrl(url);
	    }catch(e){
		try{
		    map.getLayers().item(lindex).getLayers().item(iId).getSource().setUrl(url);
		}catch(e){
		    console.log("Unable to update layer url.");
		}
	    }
	}
	try{
	    map.getLayers().item(lindex).getSource().changed();
	}catch(e){
	    try{
		map.getLayers().item(lindex).getLayers().item(iId).getSource().changed();
	    }catch(e){
		console.log("Unable to change layer source.");
	    }
	}
	map.updateSize();
    }

    function changeSymbol(elem){
	elem.parent().children().removeClass("active");
	elem.toggleClass("active");
	elem.parent().parent().parent().next().first().html("");
	var rloc=elem.parent().parent().parent();
	var location=rloc.next().first();
	location.append(elem.find("a")[0].innerHTML);
	rloc.find("input[type=hidden]").first().val(elem.attr("id"));	
    }

    function setSymbol(elem,value){
	elem.find(".symbolsList").find("li#"+value).each(function(){
	    changeSymbol($(this));
	});
    }

    var cbindings={
	"us": "uniqSymb",
	"uv": "uniqVal",
	"gs": "gradSymb",
	"cc": "contCol",
	"tl": "timeline"
    };

    function loadGridTab(ldata){
	var lbindings={
	    "labelFormat": "labelFormat",
	}
	var tmp=["min","max"]
	var lab=["Arcs","Interval","Subdivide"]
	for(var i=0;i<tmp.length;i++)
	    for(var j=0;j<lab.length;j++)
		lbindings["symb_"+tmp[i]+lab[j]]=tmp[i]+lab[j];
	var rootLocation=$("#mm_layer_property_grid_display").children().first();
	for(var n in ldata.Style.grid){
	    var localN=(lbindings[n]?lbindings[n]:n);
	    if(ldata.Style.grid[n]){
		rootLocation.find("input[name="+localN+"],select[name="+localN+"]").val(ldata.Style.grid[n]).change();
		if(rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().length)
		    rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().prop("checked",true).change();
	    }else
		if(rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().length)
		    rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().prop("checked",false).change();
	}
	rootLocation.find("button").last().off("click");
	rootLocation.find("button").last().click(function(e){
	    try{
		saveGridSettings(ldata.name,ldata);
	    }catch(e){
		console.log("ERROR !");
		console.log(e);
	    }
	    return false;
	});
    }

    function saveGridSettings(layer,ldata){
	var lbindings={
	    "labelFormat": "mmLabelFormat",
	};
	var tmp=["min","max"]
	var lab=["Arcs","Interval","Subdivide"]
	for(var i=0;i<tmp.length;i++)
	    for(var j=0;j<lab.length;j++)
		lbindings[tmp[i]+lab[j]]="mm"+tmp[i]+lab[j];
	var params=[];
	var inputs=[];
	var rootLocation=$("#mm_layer_property_grid_display").children().first();
	rootLocation.find("input[type=text]").each(function(){
	    if($(this).is(":visible") && !$(this).is(":disabled"))
		params.push({"id":$(this).attr('name'),"value": $(this).val()});
	});
	for(var i in lbindings){
	    for(var j in params){
		if(params[j].id==i){
		    inputs.push({
			"identifier": lbindings[i],
			"value": params[j].value,
			"dataType": "string"
		    });
		    break;
		}
	    }
	}
	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "layer",
	    "value": ldata.name,
	    "dataType": "string"
	});
	console.log(inputs);
	zoo.execute({
	    identifier: "mapfile.saveLayerGrid",
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
		redrawLayer(layer);
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

    function loadLabelTab(ldata){
	var lbindings={
	    "field": "labelField",
	    "bufferSize": "labelBufferSize",
	    "angle": "labelAngle",
	    "cleanSize": "labelCleanSize",
	    "color": "labelFontColor",
	    "bufferColor": "labelBufferColor",
	    "position": "labelPosition",
	    "font": "labelFontFamilly",
	    "size": "labelFontSize"
	};
	console.log("loadLabelTab !");
	var rootLocation=$("#mm_layer_property_label_display").children().first();
	for(var n in ldata.Style.label){
	    var localN=(lbindings[n]?lbindings[n]:n);
	    console.log(n+" "+localN);
	    console.log(rootLocation.find("input[name="+localN+"],select[name="+localN+"]"));
	    if(n=="position"){
		rootLocation.find("input[name="+localN+"]").each(function(){
		    if($(this).attr('value')==ldata.Style.label[n])
			$(this).prop('checked',true);
		    else
			$(this).prop('checked',false);		    
		});
	    }
	    else
	    if(!rootLocation.find("textarea[name="+localN+"]").length){
		if(ldata.Style.label[n] || ldata.Style.label[n]==0){
		    rootLocation.find("input[name="+localN+"],select[name="+localN+"]").val(ldata.Style.label[n]).change();
		    if(rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().length)
			rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().prop("checked",true).change();
		}else
		    if(rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().length)
			rootLocation.find("input[name="+localN+"],select[name="+localN+"]").prev().first().children().first().prop("checked",false).change();
	    }
	    else{
		if(ldata.Style.label[n]){
		    rootLocation.find("textarea[name="+localN+"]").val(ldata.Style.label[n]);
		    rootLocation.find("textarea[name="+localN+"]").prev().first().children().first().prop("checked",true).change();
		}else{
		    rootLocation.find("textarea[name="+localN+"]").val("");
		    rootLocation.find("textarea[name="+localN+"]").prev().first().children().first().prop("checked",false).change();
		}
	    }
	}
	console.log("/loadLabelTab !");
	if(ldata.Style.label.field)
	    rootLocation.find("input[name=displayLabels]").prop("checked",true).change();
	if(ldata.Style.label.bufferSize)
	    rootLocation.find("input[name=displayBufferLabels]").prop("checked",true);
	rootLocation.find("button").last().off("click");
	rootLocation.find("button").last().click(function(e){
	    try{
		saveLabelSettings(ldata.name,ldata);
	    }catch(e){
		console.log("ERROR !");
		console.log(e);
	    }
	    return false;
	});
    }

    function recursGroup(data,layer){
	for(var i in data){
	    console.log(i);
	    if(i=="layer" && data[i]==layer){
		return data["labels"];
	    }
	    var res=recursGroup(data[i],layer);
	    if(res)
		return res;
	}
	return null;
    }

    function saveLabelSettings(layer,ldata){
	var lbindings={
	    "labelField": "label",
	    "labelBufferSize": "lbs",
	    "labelAngle": "angle",
	    "labelCleanSize": "bs",
	    "labelFontColor": "mmFill",
	    "labelBufferColor": "mmOut",
	    "labelPosition": "pos",
	    "labelFontFamilly": "f",
	    "labelFontSize": "fs"
	};
	var params=[];
	var inputs=[];
	var rootLocation=$("#mm_layer_property_label_display").children().first();
	rootLocation.find("input[type=radio]").each(function(){
	    if($(this).is(":visible") && $(this).is(":checked"))
		params.push({"id":$(this).attr('name'),"value": $(this).val().replace(/\#/g,"")});
	});
	rootLocation.find("input[type=text],select").each(function(){
	    if($(this).is(":visible") && !$(this).is(":disabled"))
		params.push({"id":$(this).attr('name'),"value": $(this).val().replace(/\#/g,"")});
	});
	console.log(params);
	for(var i in lbindings){
	    for(var j in params){
		if(params[j].id==i){
		    inputs.push({
			"identifier": lbindings[i],
			"value": params[j].value,
			"dataType": "string"
		    });
		    break;
		}
	    }
	}
	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "layer",
	    "value": ldata.name,
	    "dataType": "string"
	});
	var hasBs=false;
	for(var i in inputs){
	    if(inputs["identifier"]=="bs"){
		hasBs=true;
		break;
	    }
	}
	if(!hasBs){
	    inputs.push({
		"identifier": "label",
		"value": "GRID",
		"dataType": "string"
	    });
	    inputs.push({
		"identifier": "bs",
		"value": "0",
		"dataType": "integer"
	    });
	    /*inputs.push({
		"identifier": "pos",
		"value": "undefined",
		"dataType": "string"
	    });*/
	    
	}
	console.log(inputs);
	zoo.execute({
	    identifier: "mapfile.saveLabelJS",
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
		console.log(ldata);
		if(ldata.type==2){
		    //document.location.reload(false);
		    zoo.execute({
			identifier: "mapfile.getGroupList",
			type: "POST",
			dataInputs: [
			    {"identifier": "name","value":module.config().pmapfile,"dataType":"string"}
			],
			dataOutputs: [
			    {"identifier":"Result","type":"raw"},
			],
			success: function(data){
			    var mapUrl=module.config().msUrl+"?map="+recursGroup(data,ldata.name);
			    var lindex=getLayerIndexByName(ldata.name);
			    console.log(lindex);
			    try{
				map.getLayers().item(lindex).getLayers();
			    }catch(e){
				console.log(e);
				var lLayer=map.getLayers().item(lindex);
				lLayer.unset('map');
				console.log(lLayer.getSource().get('url'));
				console.log(lLayer.getSource().get('params'));
				console.log(lLayer.getSource().get('serverType'));
				var layer0=new ol.layer.Group({
				    visible: lLayer.getVisible(),
				    layers: [
					lLayer,
					new ol.layer.Tile({
					    source: new ol.source.TileWMS({
						url: mapUrl,
						params: {'LAYERS': "Result", 'TILED': true},
						serverType: 'mapserver'
					    })
					})
				    ]
				});
				map.getLayers().insertAt(lindex,layer0);
				map.getLayers().removeAt(lindex+1);
			    }
			    console.log(mapUrl);
			    redrawLayer(layer,mapUrl,null,1);
			    return false;
			},
			error: function(data){
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });
		}
		else
		    redrawLayer(layer);
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

    function loadStyleTable(ldata){
	var layer=ldata.name;
	tableData=[];
	for(var j in ldata["Style"].classes){
	    tableData.push([j,'<img src="'+ldata["Style"].classes[j].legend+'" />',ldata["Style"].classes[j].name,layer+"_"+j]);
	}
	$("#mm_layer_property_style_display").find("div.classesTable").children().remove();
	$("#mm_layer_property_style_display").find("div.classesTable").append('<table id="classes"></table>');
	var oTable = $('#classes').dataTable({
	    data: tableData,
	    "searching": false,
	    "paging":   false,
	    "ordering": false,
	    "info":     false,
	    "bAutoWidth": false,
	    "aoColumns": [
		//{ "sTitle": "","sWidth": "10px", "sClass": "details-control", "data": null },
		{ "sTitle": module.config().localizationStrings.manager.id,"sWidth": "10px" },
		{ "sTitle": module.config().localizationStrings.manager.legend,"sWidth": "40px" },
		{ "sTitle": module.config().localizationStrings.manager.name, "sClass": "center", "bSortable": false },
	    ],
	    rowId: 3
	});
	//(function(ldata){
	$('#classes tbody tr').on('click', function () {
	    console.log($(this));
	    var tr = $(this);
	    console.log(tr);
	    var row = $('#classes').DataTable().row(tr);
	    
	    if (row.child.isShown()) {
		// This row is already open - close it
		row.child.hide();
		tr.removeClass('shown');
	    } else {
		// Open this row
		var form=$("#class_styler_template")[0].innerHTML;
		var reg=new RegExp(layer+"_","g");
		var index=eval(tr.attr('id').replace(reg,""));
		console.log(index);
		//console.log(ldata);
		//console.log(ldata.Style.classes[index]);
		row.child(form).show();
		var myClass=ldata.Style.classes[index];
		
		var rootLocation=tr.next().first();
		for(var k in geotypeClasses){
		    if(k==ldata.type){
			rootLocation.find(".require-"+geotypeClasses[k]).show();
			rootLocation.find(".no-"+geotypeClasses[k]).hide();
		    }else{
			rootLocation.find(".require-"+geotypeClasses[k]).hide();
			if(!rootLocation.find(".no-"+geotypeClasses[k]).hasClass('require-gs')){
			    rootLocation.find(".no-"+geotypeClasses[k]).show();
			}else{
			    if($("#mm_layer_property_style_display").find("select[name=classification]").val()=="gs")
				rootLocation.find(".no-"+geotypeClasses[k]).show();								    
			}
		    }
		}
		
		
		rootLocation.find(".symbolsList").html("");
		for(var n in ldata.images){
		    var lpref="";
		    if(myClass.styles[0] && myClass.styles[0].symbol==ldata.images[n].id.replace(/Symbol_/g,"")){
			lpref='class="active"';
		    }
		    var lname=ldata.images[n].id.replace(/Symbol_/g,"");
		    rootLocation.find(".symbolsList").append('<li '+lpref+' id="'+lname+'"><a href="#">'+
							     '<img class="img-inline" src="'+ldata.images[n].value+'"/> '+
							     lname+
							     '</a></li>');
		    if(lpref!=""){
			rootLocation.find(".symbolsDisplay").html("");
			rootLocation.find(".symbolsDisplay").append($(".symbolsList").find('a').last()[0].innerHTML);
		    }
		}
		rootLocation.find(".symbolsList").find("li").click(function(e){
		    changeSymbol($(this));
		});
		
		
		var lbindings={
		    "stroke": "strokeColorValue",
		    "fill": "fillColorValue",
		    "expr": "classExpression0",
		    "name": "className",
		    "size": "classSize",
		    "width": "classWidth",
		    "owidth": "classOutlineWidth",
		    "pattern": "classPattern"
		};
		for(var n in myClass){
		    console.log(n);
		    console.log(rootLocation.find("input[name="+lbindings[n]+"]"));
		    if(!rootLocation.find("textarea[name="+(lbindings[n]?lbindings[n]:n)+"]").length){
			if(myClass[n]){
			    rootLocation.find("input[name="+(lbindings[n]?lbindings[n]:n)+"]").val(myClass[n]).change();
			    if(rootLocation.find("input[name="+(lbindings[n]?lbindings[n]:n)+"]").prev().first().children().first().length)
				rootLocation.find("input[name="+(lbindings[n]?lbindings[n]:n)+"]").prev().first().children().first().prop("checked",(myClass[n]=="#-1-1-1"?false:true)).change();
			}else
			    if(rootLocation.find("input[name="+(lbindings[n]?lbindings[n]:n)+"]").prev().first().children().first().length)
				rootLocation.find("input[name="+(lbindings[n]?lbindings[n]:n)+"]").prev().first().children().first().prop("checked",false).change();
		    }
		    else{
			if(myClass[n]){
			    rootLocation.find("textarea[name="+(lbindings[n]?lbindings[n]:n)+"]").val(myClass[n]);
			    rootLocation.find("textarea[name="+(lbindings[n]?lbindings[n]:n)+"]").prev().first().children().first().prop("checked",true).change();
			}else{
			    rootLocation.find("textarea[name="+(lbindings[n]?lbindings[n]:n)+"]").val("");
			    rootLocation.find("textarea[name="+(lbindings[n]?lbindings[n]:n)+"]").prev().first().children().first().prop("checked",false).change();
			}
		    }
		}
		console.log("DEBUG ");
		console.log(ldata);
		var sbindings={
		    "gap": "symbGap",
		    "size": "symbSize",
		    "width": "symbWidth",
		    "fill": "symbFillColorValue",
		    "stroke": "symbStrokeColorValue"
		};
		var hbindings={
		    "angle": "hatchAngle",
		    "size": "hatchSize",
		    "width": "hatchWidth"
		};
		if(ldata.type==2){
		    if(myClass.styles[0].symbol=="polygon_hatch"){
			rootLocation.find("input[name=hatchFillc]").prop("checked",true).change();
			for(var j in hbindings){
			    rootLocation.find('input[name='+hbindings["width"]+']').val(myClass.styles[0][j]);
			}
			rootLocation.find('input[name='+lbindings["width"]+']').val(myClass.styles[1].width);
		    }
		    if(myClass.styles[myClass.styles.length-1].symbol!=null &&
		       myClass.styles[myClass.styles.length-1].symbol!="polygon_hatch"){
			rootLocation.find("input[name=symbFillc]").prop("checked",true).change();
			for(var j in sbindings){
			    rootLocation.find('input[name='+sbindings[j]+']').val(myClass.styles[myClass.styles.length-1][j]);
			}
			setSymbol(rootLocation,myClass.styles[myClass.styles.length-1].symbol);
		    }
		}else{
		    if(myClass.styles[0].symbol)
			setSymbol(rootLocation,myClass.styles[0].symbol);
		}
		
		tr.addClass('shown');
		rootLocation.find(".cpicker").each(function(){
		    $(this).colorpicker({format: "hex",input: $(this).find("input[type=text]")});
		});
		rootLocation.find("button").last().click(function(e){
		    try{
		    var elem=$(this);
		    var params=[];
		    var edisabled=[];
		    elem.parent().parent().find("input[type=hidden]").each(function(){
			if($(this).parent().is(":visible"))
			    params.push({"id":$(this).attr('name'),"value": $(this).val()});
		    });
		    elem.parent().parent().find("input[type=text],textarea").each(function(){
			if($(this).is(":visible") && $(this).is(":disabled"))
			    edisabled.push($(this).attr('name'));
			if($(this).is(":visible") && !$(this).is(":disabled"))
			    params.push({"id":$(this).attr('name'),"value": $(this).val().replace(/\#/g,"")});
		    });
		    var cId=elem.parent().parent().parent().parent().prev().attr("id");
		    var tmp=cId.split("_");
		    var index=tmp[tmp.length-1];
		    var reg=new RegExp("_"+index,"g");
		    var cLayer=cId.replace(reg,"");
		    console.log(cLayer);
		    console.log(index);
		    console.log(params);
		    var ibindings={
			"className": "mmClassName",
			"fillColorValue": "mmFill",
			"strokeColorValue": "mmStroke",
			"classOutlineWidth": "mmStrokeWidth",
			"classWidth": "mmWidth",
			"classPattern": "pattern",
			"classExpression0": "mmExpr",
			"classSymbol": "mmSymb",
			"classSize": "mmSize",
			"hatchAngle": "mmAngle",
			"hatchSize": "mmSize",
			"hatchWidth": "mmHatchWidth",
			"symbSymbol": "mmSymbolFill",
			"symbFillColorValue": "mmSymbolFillColor",
			"symbStrokeColorValue": "mmSymbolStrokeColor",
			"symbSize": "mmSymbolSize",
			"symbWidth": "mmSymbolWidth",
			"symbGap": "mmSymbolGap"							    
		    };
		    var inputs=[];
		    for(var i in ibindings){
			for(var j in params){
			    if(params[j].id==i){
				inputs.push({
				    "identifier": ibindings[i],
				    "value": params[j].value,
				    "dataType": "string"
				});
				break;
			    }
			}
		    }
		    for(var i in inputs){
			if(inputs[i]["identifier"]=="mmHatchWidth"){
			    inputs.push({
				"identifier": "mmSymb",
				"value": "polygon_hatch",
				"dataType": "string"
			    });
			    break;
			}
		    }
		    
		    inputs.push({
			"identifier": "map",
			"value": $("#save-map").val(),
			"dataType": "string"
		    });
		    if($("#mm_layer_property_style_display").find("select[name=step_classification]").is(":visible"))
			inputs.push({
			    "identifier": "mmStep",
			    "value": $("#mm_layer_property_style_display").find("select[name=step]").val(),
			    "dataType": "string"
			});
		
		    var hasStep=$("#mm_layer_property_style_display").find("select[name=step_classification]").is(":visible");
		    var cfield=(hasStep?"step_classification":"classification");
		    inputs.push({
			"identifier": "mmType",
			"value": cbindings[$("#mm_layer_property_style_display").find("select[name="+cfield+"]").val()],
			"dataType": "string"
		    });
		    inputs.push({
			"identifier": "layer",
			"value": cLayer,
			"dataType": "string"
		    });
		    inputs.push({
			"identifier": "mmClass",
			"value": index,
			"dataType": "integer"
		    });
		    inputs.push({
			"identifier": "mmOpacity",
			"value": $("#mm_layer_property_style_display").find("input[type=range]").first().val(),
			"dataType": "integer"
		    });
		    if($("#mm_layer_property_style_display").find("select[name="+cfield+"]").val()=="us")
			inputs.push({"identifier": "force","value": "true","dataType": "boolean"});
		    
		    zoo.execute({
			identifier: "mapfile.saveLayerStyle0",
			type: "POST",
			dataInputs: inputs,
			dataOutputs: [
			    {"identifier":"Message"},
			    {"identifier":"Result"},
			],
			success: function(data){
			    console.log("SUCCESS");
			    console.log(data);
			    var outputs=data["ExecuteResponse"]["ProcessOutputs"]["Output"];
			    $(".notifications").notify({
				message: { text: outputs[0]["Data"]["LiteralData"]["__text"] },
				type: 'success',
			    }).show();
			    ldata.Style.classes[index]=JSON.parse(outputs[1]["Data"]["ComplexData"]["__cdata"]);
			    /* ici */
			    if(hasStep){
				console.log(elem);
				var originalValue=$("#mm_layer_property_style_display").find("select[name=step]").val();
				var lmapfile="timeline_"+module.config().pmapfile+"_"+cLayer+"_step"+originalValue+".map";
				var url=module.config().msUrl+"?map="+module.config().dataPath+"/maps/"+lmapfile;
				console.log(url);
				redrawLayer(layer,url);
				$("#"+cId).find("img").first().attr('src',ldata.Style.classes[index].legend);
			    }
			    else
				redrawLayer(layer);
			    var tmpVal=$("#"+cId).find("img").first().attr('src');
			    $("#"+cId).find("img").first().removeAttr("src").attr('src',tmpVal+"&timestamp=" + new Date().getTime());
			    for(var i in inputs){
				if(inputs[i]["identifier"]=="mmClassName"){
				    $("#"+cId).find("img").parent().next().html($("#"+cId).next().find("input[name=className]").val());
				    break;
				}
			    }
			},
			error: function(data){
			    console.log("ERROR");
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });
		    
		    console.log(inputs);
		    }catch(e){
			console.log(e);
		    }
		    return false;
		});
		
	    }
	});
    }

    function callCreateLegend(layer,step,lfunction){
	var params=[
	    {"identifier": "name","value":$("#save-map").val(),"dataType":"string"},
	    {"identifier": "layer","value":layer,"dataType":"string"}
	];
	if(step!=null)
	    params.push({
		"identifier": "mmStep",
		"value": step,
		"dataType":"integer"
	    });
	zoo.execute({
	    identifier: "mapfile.createLegend0",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		var ldata=JSON.parse(data);
		var myRootLocation=$("#mm_layer_property_style_display");
		lfunction(ldata);
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

    var contextualMenu={
	"zoomTo": {
	    "run": function(layer){
		var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
		var extent=ol.extent.applyTransform(oLayers[layer]["extent"], transformer);
		map.getView().fit(extent,map.getSize());
	    }
	},
	"properties": {
	    "run": function(layer){
		$("#main").removeClass("col-sm-12").addClass("col-sm-6");
		$(".mm_layerName").text(layer);
		$(".mm_layerName").append('<i class="fa fa-spinner fa-spin"></i>');

		$("#mm_layer_property_style_display,#mm_layer_property_property_display").height($(window).height()-($("nav").height())*3.5);
		$("#mm_layer_property_style_display,#mm_layer_property_property_display").css({"overflow-y":"auto","overflow-x":"hidden"});

		$("#manaLayerProperties").collapse("show").show();
		map.updateSize();

		$.ajax({
		    url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/project_"+$("#save-map").val()+".map&service=WFS&version=1.0.0&request=DescribeFeatureType&typename="+layer+"&_="+Date(),
		    success: function(){
			var obj=_x2js.xml_str2json( arguments[2].responseText );
			$("#manaLayerProperties").find('select.mmField').html("");
			$("#manaLayerProperties").find('input[type="checkbox"]').each(function(){
			    $(this).prop("checked",false).change();
			});
			if(obj.schema.complexType){
			    var ldata=obj.schema.complexType.complexContent.extension.sequence.element;
			    oLayers[layer]["queryParams"]={
				fields: [],
				aliases: [],
				sizes: []
			    };
			    var lcnt=0;
			    $("#manaLayerProperties").find('select.mmField').each(function(){
				for(i in ldata){
				    if(ldata[i]["_name"]!="msGeometry"){
					if(lcnt==0){
					    oLayers[layer]["queryParams"].fields.push(ldata[i]["_name"]);
					    oLayers[layer]["queryParams"].aliases.push(ldata[i]["_name"]);
					    oLayers[layer]["queryParams"].sizes.push(100);
					}
					$(this).append('<option value="'+ldata[i]["_name"]+'">'+ldata[i]["_name"]+'</option>');
				    }
				}
				lcnt+=1;
			    });
			}
			
			zoo.execute({
			    identifier: "mapfile.createLegend0",
			    type: "POST",
			    dataInputs: [
				{"identifier": "name","value":$("#save-map").val(),"dataType":"string"},
				{"identifier": "layer","value":layer,"dataType":"string"}
			    ],
			    dataOutputs: [
				{"identifier":"Result","type":"raw"},
			    ],
			    success: function(data){
				console.log("SUCCESS");
				var ldata=JSON.parse(data);
				var myRootLocation=$("#mm_layer_property_style_display");
				myRootLocation.find('.mmstep-list').change(function(){
				    var originalValue=$(this).val();
				    var lmapfile="timeline_"+module.config().pmapfile+"_"+layer+"_step"+originalValue+".map";
				    var url=module.config().msUrl+"?map="+module.config().dataPath+"/maps/"+lmapfile;
				    redrawLayer(layer,url);
				    console.log($(this).parent().next());
				    $(this).parent().next().addClass("disabled");
				    if($(this).val()==0){
					loadStyleDisplay(ldata);
					console.log($(this).parent().next());
					$(this).parent().next().removeClass("disabled");
				    }
				    else{
					if($(this).val()>0){
					    console.log($(this).parent().next());
					    loadStyleDisplay(ldata.mmSteps[$(this).val()-1]);
					    $(this).parent().next().removeClass("disabled");
					}
					if($(this).val()=='-1') 
					    $(this).parent().parent().next().show();
					else 
					    $(this).parent().parent().next().hide();
				    }
				    myRootLocation.find(".require-tl").show();
				    $(this).val(originalValue);
				    if(ldata.type!=3)
					myRootLocation.find(".require-raster").hide();
				});
				loadAllDisplay(ldata);
				loadTableDefinition(obj,ldata);
				$(".mm_layerName").find("i").remove();
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
		});
	    }
	},
	"query": {
	    "run": function(layer){
		//console.log(layer);
		//console.log(($(window).height()-$(".nav").height())/2);
		loadDataSource($('#save-map').val(),layer);
		$("#map").css({"height":(($(window).height()-$("nav").height())/2)+"px"});
		$("#manaTable").css({"height":(($(window).height()-$("nav").height())/2)+"px"});
		$("#manaTable").collapse("show");
		map.updateSize();
	    }
	},
	"remove": {
	    "run": function(layer){
		basic('removeLayer',null);
	    }
	},
    };

    var llcnt=0;

    function generateLineTemplate(values){
	var template=$("#layer_property_table_line_template")[0].innerHTML;
	var reg=[
	    {
		"reg": new RegExp("\\[id\\]","g"),
		"value": values[0]
	    },
	    {
		"reg": new RegExp("\\[order\\]","g"),
		"value": values[1]
	    },
	    {
		"reg": new RegExp("\\[display\\]","g"),
		"value": values[2]
	    },
	    {
		"reg": new RegExp("\\[export\\]","g"),
		"value": values[3]
	    },
	    {
		"reg": new RegExp("\\[name\\]","g"),
		"value": values[4]
	    },
	    {
		"reg": new RegExp("\\[label\\]","g"),
		"value": values[5]
	    },
	    {
		"reg": new RegExp("\\[width\\]","g"),
		"value": values[6]
	    },
	];
	for(var j=0;j<reg.length;j++)
	    template=template.replace(reg[j]["reg"],reg[j]["value"]);
	return template;
    }

    function getTableIndex(data,name){
	for(var i in data){
	    if(data[i]["_name"]==name)
		return i;
	}
	return -1;
    }

    function loadTableDefinition(obj,data){
	var alreadyDisplayed=[];
	var tbody="";
	if(!obj.schema.complexType)
	    return;
	var ldata=obj.schema.complexType.complexContent.extension.sequence.element;
	if(data["gfi_aliases"] && data["gfi_aliases"].length>0){
	    for(var i=0;i<data["gfi_aliases"].length;i++){
		if(data["gfi_fields"][i]){
		    tbody+=generateLineTemplate([
			getTableIndex(ldata,data["gfi_fields"][i]),
			i+1,
			'checked="checked"',
			(data["exp_fields"] && data["exp_fields"][i]?'checked="checked"':''),
			data["gfi_fields"][i],
			data["gfi_aliases"][i],
			(data["gfi_width"] && data["gfi_width"][i]?data["gfi_width"][i]:"110"),
		    ]);
		    alreadyDisplayed.push((data["gfi_fields"][i]?data["gfi_fields"][i]:ldata[i+1]["_name"]));
		}
	    }
	}
	var cnt=alreadyDisplayed.length;
	if(cnt<ldata.length-1)
	    for(var i in ldata){
		if(ldata[i]["_name"]!="msGeometry" && $.inArray(ldata[i]["_name"], alreadyDisplayed) == -1){
		    tbody+=generateLineTemplate([
			i,
			cnt+1,
			"",
			($.inArray(ldata[i]["_name"],data["exp_fields"])!==-1?'checked="checked"':""),
			ldata[i]["_name"],
			ldata[i]["_name"],
			(data["gfi_width"] && data["gfi_width"][i]?data["gfi_width"][i]:"110"),
		    ]);
		    cnt+=1;
		}
	    }
	var reg=new RegExp("\\[tbody\\]","g");
	var template=$("#layer_property_table_template")[0].innerHTML;
	$("#mm_layer_property_table_display").html(template.replace(reg,tbody));
	/*$("#mm_layer_property_table_display").find('input[type="checkbox"]').each(function(){
	    console.log($(this));
	    console.log($(this).attr("checked"));
	    if($(this).attr("checked"))
		$(this).prop("checked",true);
	});*/
	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );
	var table = $('#layer_property_table_table_display').DataTable( {
	    language: {
                url: module.config().translationUrl
            },
            rowReorder:       true,
	    "scrollX":        true,
	    "scrollY":        (($("#map").height())-($(".navbar").height()*4))+"px",
	    "scrollCollapse": true,
	    autoWidth:        false,
	    "paging":         false,
	    "info":           false,
	    "responsive":     true,
	    deferRender:      true,
	    bFilter:          false
	} );
	$("#mm_layer_property_table_display").find("button").last().off('click');
	$("#mm_layer_property_table_display").find("button").last().click(function(){
	    var params=[];
	    var params0=[];
	    $("#mm_layer_property_table_display").find("tbody").find("tr").each(function(){
		params0.push({"id":$(this).find("td").first().find("input[name=field_id]").val()});
		$(this).find("td").find("input").each(function(){
		    if($(this).attr('type')=="checkbox"){
			params.push({
			    "identifier": $(this).attr('name'),
			    "value": $(this).prop('checked')+"",
			    "dataType": "boolean"
			});
			if($(this).attr('name')=="display"){
			    if($(this).prop('checked')){
				params0[params0.length-1]["display"]=true;
				table.column(params0[params0.length-1]["name"]).visible(true);
			    }
			    else{
				params0[params0.length-1]["display"]=false;
				table.column(params0[params0.length-1]["name"]).visible(false);
			    }
			}
		    }else
			params.push({
			    "identifier": $(this).attr('name'),
			    "value": $(this).val(),
			    "dataType": "string"
			});
		});
	    });
	    console.log(params0);
	    console.log(params);
	    
	});
	$("#mm_layer_property_table_display").find("button").first().off('click');
	$("#mm_layer_property_table_display").find("button").first().click(function(){
	    var params=[];
	    $("#mm_layer_property_table_display").find("tbody").find("tr").each(function(){
		$(this).find("td").find("input").each(function(){
		    if($(this).attr('type')=="checkbox"){
			params.push({
			    "identifier": $(this).attr('name'),
			    "value": $(this).prop('checked')+"",
			    "dataType": "boolean"
			});
		    }else
			params.push({
			    "identifier": $(this).attr('name'),
			    "value": $(this).val(),
			    "dataType": "string"
			});
		});
	    });
	    params.push({
		"identifier": "map",
		"value": $("#save-map").val(),
		"dataType": "string"
	    });
	    params.push({
		"identifier": "layer",
		"value": data.name,
		"dataType": "string"
	    });
	    zoo.execute({
		identifier: "mapfile.saveLayerFields",
		type: "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    console.log(data);
		    $(".notifications").notify({
			message: { text: data },
			type: 'success',
		    }).show();			
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	    
	    console.log(params);
	    return false;
	});

    }

    function loadStyleDisplay(ldata){
	if(!ldata)
	    return;
	var myRootLocation=$("#mm_layer_property_style_display");

	if(ldata.Style.classes[0])
	    myRootLocation.find("input[name=styleOpacity]").val(ldata.Style.classes[0]["opacity"]).change();
	else
	    myRootLocation.find("input[name=styleOpacity]").val(100).change();

	if(ldata.type==3){
	    var lbindings={
		"interval": ["minBandValue","maxBandValue"],
	    };
	    if(ldata["bands"]!=null){
		var myData=ldata["bands"];
		for(k=0;k<myData.length;k++)
		    for(var kk in lbindings){
			if(ldata[kk] && ldata[kk].length){
			    for(var l in lbindings[kk]){
				myRootLocation.find("input[name="+lbindings[kk][l]+"]").val(ldata[kk][l]);
				myRootLocation.find("input[name="+lbindings[kk][l]+"]").next().first().html("");
				
			    }
			}
		    }
		for(var kk in lbindings){
		    for(var l in lbindings[kk]){
			if(ldata["band1"] && ldata["band1"].length)
			    myRootLocation.find("input[name="+lbindings[kk][l]+"]").next().first().html(ldata["band1"][l]);
		    }
		}
	    }
	}
	
	myRootLocation.find("input[name=nbclass]").val(ldata["Style"].numclasses);
	myRootLocation.find("select[name=discretization]").val(ldata["Style"].discretisation);
	var i="Style";
	//$("#mm_layer_property_style_display").find("select[name=classification]").val(-1).change();
	if(ldata[i].class==null || ldata[i].class=="us"){
	   myRootLocation.find("select[name=classification]").val("us").change();
	    $(".no-us").hide();
	}else{
	    //$(".no-us").show();
	    myRootLocation.find("select[name=classField]").val(ldata[i].class_field);
	    myRootLocation.find("select[name=classification]").val(ldata[i].class).change();
	}
	if(ldata[i].class=="gs"){
	    $(".require-gs").show();
	}else{
	    $(".require-gs").hide();
	}
	//toggleStylerForms($("#manaLayerProperties"),ldata.type);
	if(legendSteps[ldata["name"]]){
	    var d=legendSteps[ldata["name"]];
	    myRootLocation.find(".mmstep-list").find("option").each(function(){
		if($(this).attr("value")!="-1" && $(this).attr("value")!="-2"){
		    $(this).remove();
		}
	    });
	    for(var j=0;j<d.length;j++){
		myRootLocation.find(".mmstep-list").append('<option value="'+j+'">'+d[j]+'</option>');
	    }
	    myRootLocation.find(".mmstep-list").val(0);
	    var originalValue=myRootLocation.find("select[name=classification]").val();
	    myRootLocation.find("select[name=classification]").val("tl").change();
	    myRootLocation.find("select[name=step_classification]").val(originalValue).change();
	}
	
	
	myRootLocation.find("input[name=minColorValue]").first().val(ldata["colors"][3]).change();
	myRootLocation.find("input[name=maxColorValue]").first().val(ldata["colors"][4]).change();
	if(ldata[i].expr!=null){
	    myRootLocation.find("input[name=expression]").val(ldata[i].expr);
	    myRootLocation.find("input[name=expressionc]").prop("checked",true).change();
	}else{
	    myRootLocation.find("input[name=expressionc]").prop("checked",false).change();
	}
	
	loadStyleTable(ldata);
	
    }

    function loadAllDisplay(ldata){
	toggleStylerForms($("#manaLayerProperties"),ldata.type);
	$("#mm_layer_property_label_display").find('input[name="displayLabels"]').prop("checked",false).change();
	if(ldata.name.replace(/grid_/g,"")!=ldata.name){
	    $(".require-grid").show();
	    $("#mm_layer_property_label_display").find('input[name="displayLabels"]').prop("checked",true).change();
	    $(".no-grid").hide();
	    loadGridTab(ldata);
	}else{
	    $(".require-grid").hide();
	    $(".no-grid").each(function(){
		if(!$(this).hasClass("no-raster"))
		    $(this).show();
	    });
	    $("#mm_layer_property_label_display").find('input[name="displayLabels"]').prop("checked",false).change();
	}
	
	
	
	loadLabelTab(ldata);
	
	var bindings={
	    "offsite": "nodataColorValue",
	    "scaleMin": "minDisplay",
	    "scaleMax": "maxDisplay",
	    "labelMin": "minLabel",
	    "labelMax": "maxLabel",
	    "default_tmpl": "editor"
	};
	
	if(!ldata.Style["processing"])
	    $("select[name=resample]").val(ldata.Style["processing"]).change();
	else
	    $("select[name=resample]").val("NEAREST").change();

	//$("input[name=styleOpacity]").next().html(ldata.Style.classes[0]["opacity"]+"%");
	if(ldata["bands"]!=null){
	    var myData=ldata["bands"];
	    $("#manaLayerProperties").find('select.mmField').each(function(){
		for(i in myData){
		    $(this).append('<option value="'+myData[i].replace(/Band/g,"")+'">'+myData[i]+'</option>');
		}
	    });
	}
	
	if(ldata.datasource && ldata.datasource.type==1 && ldata.datasource.connection.indexOf("PG:")!==-1)
	    $(".only-pline").show();
	else
	    $(".only-pline").hide();

	bindLayerProperties(ldata);
	bindLayerStyle(ldata);
	bindLayerTemplates(ldata);
	bindLayerScales(ldata);
	
	$(".class-switcher").off('change');
	$(".class-switcher").change(function(){
	    console.log(".class-switcher CHANGE ! "+llcnt);
	    llcnt+=1;
	    var myRootLocation=$(this).parent().parent().parent();
	    var index=0;
	    var hasElement=true;
	    var closure=$(this);
	    myRootLocation.find('.class-switcher').each(function(){
		if(closure[0]==$(this)[0]){
		    hasElement=false;
		}
		else
		    if(hasElement)
			index+=1;
	    });
	    $(this).find('option').each(function(){
		if(!$(this).is(':selected'))
		    myRootLocation.find('.no-'+$(this).attr('value')).show();
	    });
	    $(this).find('option:selected').each(function(){
		myRootLocation.find('.no-'+$(this).attr('value')).hide();
	    });
	    if(index>0)
		myRootLocation.find(".require-tl").show();
	    if(ldata.type!=3)
		myRootLocation.find(".require-raster").hide();
	    myRootLocation.find(".require-add-step").hide();
	});

	var myRootLocation=$("#mm_layer_property_style_display");
	myRootLocation.find('.mmstep-add').off('click');
	myRootLocation.find('.mmstep-add').click(function(){
	    var params=[
		{"identifier": "layer","value":ldata.name,"dataType":"string"},
		{"identifier": "name","value":$(this).parent().find('input[name="stepName"]').val(),"dataType":"string"}
	    ];
	    if($("#mmPrefix").val()){
		params.push({
		    "identifier": "prefix",
		    "value": $("#mmPrefix").val(),
		    "dataType":"string"
		});
	    }
	    var closure=$(this);
	    $(this).prop("disabled",true);
	    $(this).parent().append('<i class="fa fa-spin fa-spinner fa-fw"> </i>');
	    var myElement=$(this);
	    zoo.execute({
		identifier: "mapfile.saveStep",
		type: "POST",
		dataInputs: params,
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
		    closure.parent().hide();
		    loadStepList(ldata.name,function(l,d){
			legendSteps[ldata.name]=d;
			myRootLocation.find(".mmstep-list").find("option").each(function(){
			    if($(this).attr("value")!="-1" && $(this).attr("value")!="-2"){
				$(this).remove();
			    }
			});
			for(var i=0;i<d.length;i++){
			    myRootLocation.find(".mmstep-list").append('<option value="'+i+'">'+d[i]+'</option>');
			}
			callCreateLegend(ldata.name,(d.length-1),function(data){
			    console.log(data);
			    ldata["mmSteps"].push(data);
			    myRootLocation.find(".mmstep-list").val((d.length-1)).change();
			    myElement.parent().find("i").first().remove();
			    myElement.prop("disabled",false);
			});
			
			//$("#mmm_properties").trigger("click");
			//myRootLocation.find(".mmstep-list").val((d.length-1)).change();
		    });
		},
		error: function(data){
		    console.log(data);
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	    return false;
	});
	myRootLocation.find('.mmstep-delete').off('click');
	myRootLocation.find('.mmstep-delete').click(function(){
	    var params=[
		{"identifier": "layer","value":ldata.name,"dataType":"string"},
		{"identifier": "name","value":$(this).parent().find('select[name="step"]').find('option:selected').html(),"dataType":"string"}
	    ];
	    if($("#mmPrefix").val()){
		params.push({
		    "identifier": "prefix",
		    "value": $("#mmPrefix").val(),
		    "dataType":"string"
		});
	    }
	    var closure=$(this);
	    zoo.execute({
		identifier: "mapfile.deleteStep",
		type: "POST",
		dataInputs: params,
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
		    closure.parent().hide();
		    loadStepList(ldata.name,function(l,d){
			legendSteps[ldata.name]=d;
			console.log(d);
			console.log(myRootLocation.find(".mmstep-list"));
			myRootLocation.find(".mmstep-list").find("option").each(function(){
			    console.log($(this).val());
			    if($(this).val()!=-1 && $(this).val()!=-2){
				$(this).remove();
			    }
			});
			for(var i=0;i<d.length;i++){
			    myRootLocation.find(".mmstep-list").append('<option value="'+i+'">'+d[i]+'</option>');
			}
			/*callCreateLegend(ldata.name,(d.length-1),function(data){
			    console.log(data);
			    //ldata["mmSteps"].push(data);
			    myRootLocation.find(".mmstep-list").val((d.length-1)).change();
			});*/
			//myRootLocation.find(".mmstep-list").val((d.length-1)).change();
			$("#mmm_properties").click();
		    });
		},
		error: function(data){
		    console.log(data);
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	    return false;
	});
	

	loadStyleDisplay(ldata);

	for(i in ldata){
	    if(ldata[i]!="false" && ldata[i]!="true"){
		if(i!="colors" && i!="Style" && i!="mmSteps" && i!="band1")
		    if(!$("#manaLayerProperties").find('textarea[name="'+(bindings[i]?bindings[i]:i)+'"]').length){
			console.log(i+" not textearea");
			//console.log($("#manaLayerProperties").find('select[name="'+(bindings[i]?bindings[i]:i)+'"]').length);
			if(!$("#manaLayerProperties").find('select[name="'+(bindings[i]?bindings[i]:i)+'"]').length){
			    console.log(i+" text");
			    console.log($("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]'));
			    $("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]').val(ldata[i]);
			    if($("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]').parent().find('input[type="checkbox"]').first().length){
				if(!ldata[i] || ldata[i]=="#-1-1-1" || ldata[i]=="")
				    $("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]').parent().find('input[type="checkbox"]').first().prop("checked",false).change();
				else{
				    $("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]').parent().find('input[type="checkbox"]').first().prop("checked",true).change();
				}
			    }
			    //console.log($("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]'));
			    //console.log(i);
			}
			else{
			    $("#manaLayerProperties").find('select.mmField[name="'+(bindings[i]?bindings[i]:i)+'"]').val(ldata[i]);
			    //console.log($("#manaLayerProperties").find('select[name="'+(bindings[i]?bindings[i]:i)+'"]'));
			    //console.log(i);
			}
		    }else{
			//console.log($("#manaLayerProperties").find('textarea[name="'+(bindings[i]?bindings[i]:i)+'"]'));
			$("#manaLayerProperties").find('textarea[name="'+(bindings[i]?bindings[i]:i)+'"]').val(ldata[i]);
			if((bindings[i]?bindings[i]:i)=="editor")
			    $(".mm-editor").code(ldata[i]);
		    }
	    }
	    else{
		$("#manaLayerProperties").find('input[name="'+(bindings[i]?bindings[i]:i)+'"]').prop("checked",ldata[i]=="true").change();
	    }
	}
	if(shouldInit){
	    window.setTimeout(function () { 
		$(".mm-editor").summernote({height: $(window).height()/3});
	    }, 50);
	    shouldInit=false;
	}
	$("#mm_layer_template_display").find("select[name=case]").change(function(e){
	    e.stopPropagation();
	    $(".mm-editor").code(ldata[($(this).val()=="click"?"click_tmpl":"default_tmpl")]);
	});
	
    }
    
    var selectedLayer=null;
    
    function unloadMapLayers(){
	for(var i=map.getLayers().getLength()-1;i>=myBaseLayers.length;i--){
	    map.removeLayer(map.getLayers().item(i));
	}
	$("#layerswitcher").next().remove();
	oLayers={};
    }

    function loadMapLayers(){
	zoo.execute({
	    identifier: "mapfile.getGroupList",
	    type: "POST",
	    dataInputs: [
		{"identifier": "name","value":module.config().pmapfile,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		mmenu=[[],[],[],[]];
		llevelInit=false;
		mlegend=data;
		if($("#layerswitcher").next().hasClass("active"))
		    $("#layerswitcher").next().remove();
		for(var i in data){
		    addToLayerSwitcher(i,data,0);
		    break;
		}
		$("#select-target-group").html("");
		for(var i=0;i<mmenu.length;i++){
		    for(var k=0;k<mmenu[i].length;k++){
			var tmpStr="";
			for(var j=0;j<i;j++)
			    tmpStr+="-";
			tmpStr+=" "+mmenu[i][k]; 
			$("#select-target-group").append('<option value="'+mmenu[i][k]+'">'+tmpStr+'</option>');
		    }
		}

		$('.li-layer').contextmenu({
		    target: "#context-menu"
		});
		$('.li-layer').bind("contextmenu",function(e){
		    $(".li-layer").removeClass("active");
		    $(e.currentTarget).addClass("active");
		    selectedLayer=$(e.currentTarget).children().first().children().first().val();
		    return false;
		});
		$(".mm-menu").each(function(){
		    $(this).on('click',function(){
			contextualMenu[$(this).attr("id").replace(/mmm_/,"")]["run"](selectedLayer);
		    });
		});

		$(".layer-cmenu").each(function(){
		    $(this).on('click',function(a){
			$(".li-layer").removeClass("active");
			$(this).parent().parent().parent().addClass("active");
			selectedLayer=$(this).parent().parent().children().first().val();
		    });
		});


		loadLayersFromWMS();
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

    function loadStepList(layer,func){
	var closure=$(this);
	var params=[
	    {"identifier": "layer","value":layer,"dataType":"string"}
	];

	zoo.execute({
	    identifier: "mapfile.listStep",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		if(func)
		    func(layer,data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function loadLayersFromWMS(){
	$.ajax(module.config().msUrl+'?map='+module.config().dataPath+"/maps/project_"+module.config().pmapfile+".map&service=WMS&request=GetCapabilities").then(function(response) {
	    var parser = new ol.format.WMSCapabilities();
	    var result = parser.read(response);
	    myWMSLayers=result;

	    for(var i in myWMSLayers["Capability"]["Layer"]["Layer"]){
		var ext=myWMSLayers["Capability"]["Layer"]["Layer"][i]["BoundingBox"][0]["extent"];
		var name=myWMSLayers["Capability"]["Layer"]["Layer"][i]["Name"];

		lmapfile="project_"+module.config().pmapfile+".map";
		if(legendSteps[name])
		    lmapfile="timeline_"+module.config().pmapfile+"_"+name+"_step0.map";
		if(colorRamps[name])
		    lmapfile="color_ramp_"+module.config().pmapfile+"_"+name+".map";
		var layer;
		if(name.indexOf("grid_")==-1){
		    if(!layerLabels[name])
			layer=new ol.layer.Tile({
			    visible: false,
			    source: new ol.source.TileWMS({
				url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/"+lmapfile,
				params: {'LAYERS': name, 'TILED': true},
				serverType: 'mapserver'
			    })
			});
		    else{
			layer=new ol.layer.Group({
			    visible: false,
			    layers: [
				new ol.layer.Tile({
				    source: new ol.source.TileWMS({
					url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/"+lmapfile,
					params: {'LAYERS': name, 'TILED': true},
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
					url: module.config().msUrl+"?map="+layerLabels[name],
					params: {'LAYERS': "Result", 'TILED': true},
					serverType: 'mapserver'
				    })
				})
			    ]
			});
		    }
		}
		else
		    layer=new ol.layer.Image({
			visible: false,
			source: new ol.source.ImageWMS({
			    ratio: 1,
			    url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/"+lmapfile,
			    params: {'LAYERS': name,"format":"image/png"},
			    serverType: ('mapserver')
			})
		    });

		map.addLayer(layer);
		oLayers[name]={"extent": [
		    ext[1],
		    ext[0],
		    ext[3],
		    ext[2]
		]};
		var lid=i;
		$('input[value="'+name+'"]').change(function(e){
		    var k=0;
		    for(var j in oLayers){
			if(j==$(this).val()){
			    map.getLayers().item(k+myBaseLayers.length).setVisible($(this).is(":checked"));
			    break;
			}
			k++;
		    }
		});
	    }
	    createSelectLayer();	    
	});
    }

    /**
     * Register the click event on .mmClassifier button for saving the
     * layer properties.
     * Search for HTML inputs/textarea/select in the HTML form and send them in
     * WPS request to the mapfile.setMapLayerProperties service.
     *
     * @param ldata the JSON object containing layer informations
     */
    function bindLayerStyle(ldata){
	$("#mm_layer_property_style_display").find("button.mmClassifier").off("click");
	$("#mm_layer_property_style_display").find("button.mmClassifier").click(function(e){
	    console.log("Classifiy");
	    var myLocation=$(this).parent().parent();
	    var params=[];
	    var edisabled=[];
	    var classifierBindings={
		"minBandValue": "min",
		"maxBandValue": "max",
		"classField": "field",
		"nodataColorValue": "nodata",
		"minColorValue": "from",
		"maxColorValue": "to",
		"styleOpacity": "mmOpacity",
		"nbclass": "nbClasses",
		"discretization": "method",
		"mmType": "mmType",
		"type": "type",
		"resample": "resm",
		"step": "mmStep",
		"tileSize": "tiled",
		"expression0": "mmMExpr"
	    };
	    var hasStep=$("#mm_layer_property_style_display").find("select[name=step_classification]").is(":visible");
	    var cfield=(hasStep?"step_classification":"classification");

	    params.push({"id":"mmType","value": cbindings[myLocation.find("select[name="+cfield+"]").val()]});
	    if(cbindings[myLocation.find("select[name="+cfield+"]").val()])
		params.push({"id":"type","value": cbindings[myLocation.find("select[name="+cfield+"]").val()]});

	    myLocation.find("input[type=text],input[type=range],textarea,select").each(function(){
		if($(this).is(":visible") && $(this).is(":disabled"))
		    edisabled.push($(this).attr('name'));
		if($(this).is(":visible") && !$(this).is(":disabled") && $(this).val()!=null)
		    params.push({"id":$(this).attr('name'),"value": $(this).val().replace(/\#/g,"")});
	    });
	    console.log(params);
	    var inputs=[];
	    var mmStep=-1;
	    var hasTiles=false;
	    for(var i in classifierBindings){
		for(var j in params){
		    if(params[j].id==i){
			if(params[j].value!=-1){
			    inputs.push({
				"identifier": classifierBindings[i],
				"value": params[j].value,
				"dataType": "string"
			    });
			    if(classifierBindings[i]=="tiled")
				hasTiles=true;
			}
			if(classifierBindings[i]=="mmStep")
			    mmStep=params[j].value;
			break;
		    }
		}
	    }
	    inputs.push({
		"identifier": "map",
		"value": $("#save-map").val(),
		"dataType": "string"
	    });
	    inputs.push({
		"identifier": "layer",
		"value": ldata.name,
		"dataType": "string"
	    });
	    
	    console.log(inputs);
	    zoo.execute({
		identifier: "mapfile.classifyMap0",
		type: "POST",
		dataInputs: inputs,
		dataOutputs: [
		    {"identifier":"Message"},
		    {"identifier":"Result"},
		],
		success: function(data){
		    var outputs=data["ExecuteResponse"]["ProcessOutputs"]["Output"];
		    $(".notifications").notify({
			message: { text: outputs[0]["Data"]["LiteralData"]["__text"] },
			type: 'success',
		    }).show();
		    var myNewData=JSON.parse(outputs[1]["Data"]["ComplexData"]["__cdata"]);
		    if(mmStep>=0){
			console.log(mmStep-1);
			loadStyleTable(myNewData);
			if(mmStep==0){
			    //ldata=JSON.parse(outputs[1]["Data"]["ComplexData"]["__cdata"]);
			    //loadStyleTable(ldata);
			    $("#mmm_properties").trigger("click");
			}
			else{
			    ldata["mmSteps"][mmStep-1]=JSON.parse(outputs[1]["Data"]["ComplexData"]["__cdata"]);
			}
		    }
		    else{
			ldata["Style"]=myNewData["Style"];
			loadStyleTable(ldata);
		    }
		    console.log("LDATA TYPE: "+ldata.type);
		    if(ldata.type==3){
			var mapUrl=module.config().msUrl+"?map="+module.config().dataPath+"/maps/project_"+$("#save-map").val()+".map";
			if(hasTiles)
			    mapUrl=module.config().msUrl+"?map="+module.config().dataPath+"/maps/color_ramp_"+$("#save-map").val()+"_"+ldata.name+".map";
			redrawLayer(ldata.name,mapUrl);
		    }
		    else
			redrawLayer(ldata.name);
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
	});
    }
    
    /**
     * Register the click event on .mm-save-layer button for saving the
     * layer properties.
     * Search for HTML inputs/textarea/select in the HTML form and send them in
     * WPS request to the mapfile.setMapLayerProperties service.
     *
     * @param ldata the JSON object containing layer informations
     */
    function bindLayerProperties(ldata){
	$("#mm_layer_property_display").find("button").off("click");
	$("#mm_layer_property_display").find("button").click(function(e){
	    console.log("Save Layer Properties");
	    var myLocation=$(this).parent().parent();
	    var params=[];
	    var edisabled=[];
	    var propertiesBindings={
		"name": "ln",
		"title": "a",
		"abstract": "ab",
		"keywords": "kl",
		"fees": "f",
		"query": "q",
		"export": "e",
		"filter": "_f",
		"zfilter": "zf",
		"search": "s",
		"squery": "sq"
	    };
	    console.log(myLocation);
	    var params=[];
	    params.push({
		"identifier": "map",
		"value": $("#save-map").val(),
		"dataType": "string"
	    });
	    params.push({
		"identifier": "layer",
		"value": ldata.name,
		"dataType": "string"
	    });
	    //console.log(ldata);
	    /*if(ldata.datasource && ldata.datasource.type==1 && ldata.datasource.connection.indexOf("PG:")!==-1)
		$(".only-pline").show();
	    else
		$(".only-pline").hide();*/
	    myLocation.find("input[type=text],input[type=checkbox],textarea,select").each(function(){
		console.log($(this).attr("name"));
		for(var i in propertiesBindings){
		    console.log(i+" "+$(this).attr("name"));
		    if(i==$(this).attr("name")){
			console.log(i+" "+$(this).attr("name")+" FOUND !");
			console.log($(this).attr("type"));
			console.log($(this).attr("type")=="checkbox");
			if($(this).attr("type")=="checkbox"){
			    params.push({
				"identifier": propertiesBindings[i],
				"value": $(this).is(":checked")+"",
				"dataType": "boolean"
			    });
			    console.log('select[name="'+$(this).attr("name")+'_field"]');
			    console.log(myLocation.find('select[name="'+$(this).attr("name")+'_field"]').first());
			    if(myLocation.find('select[name="'+$(this).attr("name")+'_field"]').first().length)
				params.push({
				    "identifier": propertiesBindings[i]+"f",
				    "value": myLocation.find('select[name="'+$(this).attr("name")+'_field"]').first().val(),
				    "dataType": "string"
				});
			}
			else{
			    params.push({
				"identifier": propertiesBindings[i],
				"value": $(this).val(),
				"dataType": "string"
			    });
			}
			
			break;
		    }
		}
	    });
	    console.log(params);
	    zoo.execute({
		identifier: "mapfile.setMapLayerProperties",
		type: "POST",
		dataInputs: params,
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
		    console.log(data);
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
	});
    }

    /**
     * Register the click event on .mm-save-layer button for saving the
     * layer tamplates.
     * Search for HTML inputs/textarea/select in the HTML form and send them in
     * WPS request to the mapfile.setMapLayerProperties service.
     *
     * @param ldata the JSON object containing layer informations
     */
    function bindLayerTemplates(ldata){
	$("#mm_layer_template_display").find("button").last().off("click");
	$("#mm_layer_template_display").find("button").last().click(function(e){
	    var myLocation=$(this).parent().parent();
	    var params=[];
	    params.push({
		"identifier": "map",
		"value": $("#save-map").val(),
		"dataType": "string"
	    });
	    params.push({
		"identifier": "layer",
		"value": ldata.name,
		"dataType": "string"
	    });
	    params.push({
		"identifier": "click",
		"value": (myLocation.find('select[name="case"]').val()=="click")+"",
		"dataType": "boolean"
	    });
	    params.push({
		"identifier": "content",
		"value": $('.mm-editor').code(),
		"mimeType": "text/plain"
	    });
	    zoo.execute({
		identifier: "mapfile.saveTemplate",
		type: "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    console.log("SUCCESS");
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
	});
    }

    /**
     * Register the click event on .mm-save-layer button for saving the
     * layer scales.
     * Search for HTML inputs in the HTML form and send them in
     * WPS request to the mapfile.setLayerScale service.
     *
     * @param ldata the JSON object containing layer informations
     */
    function bindLayerScales(ldata){
	$("#mm_layer_display_display").find("button.mm-layer-save").off("click");
	$("#mm_layer_display_display").find("button.mm-layer-save").click(function(e){
	    var myLocation=$(this).parent().parent();
	    var params=[];
	    params.push({
		"identifier": "map",
		"value": $("#save-map").val(),
		"dataType": "string"
	    });
	    params.push({
		"identifier": "layer",
		"value": ldata.name,
		"dataType": "string"
	    });
	    myLocation.find("input[type=text]").each(function(){
		params.push({
		    "identifier": "sv",
		    "value": ($(this).val()!=""?$(this).val():"-1"),
		    "dataType": "integer"
		});
		params.push({
		    "identifier": "st",
		    "value": $(this).attr("name"),
		    "dataType": "string"
		});

	    });
	    console.log(params);
	    //return false;
	    zoo.execute({
		identifier: "mapfile.setLayerScale",
		type: "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    console.log("SUCCESS");
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
	});
    }
    
    var initialize=function(){

	$("#page-wrapper,#main").css({"padding":"0"});

	$('[data-toggle="tooltip"]').tooltip({container: 'body'});

	$('.mm-scale').click(function(){
	    var view = map.getView();
	    var coords = view.getCenter();
	    var resolution = view.getResolution();    
	    var projection = view.getProjection();
	    var resolutionAtCoords = projection.getPointResolution(resolution, coords);
	    $(this).parent().prev().val(Math.round(resolutionAtCoords*0.3937*156543.04));
	    //$(this).parent().prev().val(resolution*0.3937*156543.04);
	});

	$('#blcolpicker').colorpicker({
	    format: "hex"
	}).on('changeColor', function(ev) {
	    console.log(ev.color.toHex());
	    var reg=new RegExp("\\#","");
	    $("#blcolpicker,#sbl").attr("src","http://placehold.it/24/"+ev.color.toHex().replace(reg,"")+"/"+ev.color.toHex().replace(reg,"")+"/");

	    console.log($("#blcolpicker").attr("src"));
	    zoo.execute({
		identifier: "template.display",
		type: "POST",
		dataInputs: [
		    {
			"identifier": "tmpl",
			"value": "wms_sld_xml",
			"dataType": "string"
		    },
		    {
			"identifier": "color",
			"value": ev.color.toHex(),
			"dataType": "string"
		    },
		],
		dataOutputs: [
		    {"identifier":"Result","asReference":"true"},
		],
		success: function(data){
		    for(var i=0;i<myBaseLayers.length-1;i++)
			myBaseLayers[i].setVisible(false);
		    myBaseLayers[myBaseLayers.length-1].setVisible(true);
		    myBaseLayers[myBaseLayers.length-1].getSource().updateParams({"SLD": data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"],time_: (new Date()).getTime()});
		    myBaseLayers[myBaseLayers.length-1].getSource().changed();
		},
		error: function(data){
		    console.log("ERROR");
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });

	});

	var gcnt=0;
	$(".dropdown-bl").find(".blp").each(function(){
	    var lgcnt=gcnt;
	    $(this).parent().click(function(){
		for(var i=0;i<myBaseLayers.length;i++)
		    myBaseLayers[i].setVisible(false);
		myBaseLayers[lgcnt].setVisible(true);
		$("#sbl").attr("src",$(this).find("img").attr("src"));
	    });
	    gcnt++;
	});
	
	var togglers=["loadMap","addLayer","addDir","addGrid"];
	var dtogglers=["addLayer","addDir","addGrid"];
	for(var i in togglers){
	    $('#mm_'+togglers[i]+'Toggler').click(function(e){
		e.stopPropagation();
		var target=$(this).attr('id').replace(/Toggler/g,"");
		for(var j in dtogglers){
		    if('mm_'+dtogglers[j]!=target){
			if($('#mm_'+dtogglers[j]+'Toggler').is(":visible"))
			    $('#mm_'+dtogglers[j]).addClass("hide");
		    }
		}
		$('#'+target).toggleClass("hide");
	    });
	}

	$('#mm_layerOrderToggler').click(function(e){
	    e.stopPropagation();
	    console.log(mlegend);
	    $("#mm_layer_order_display").html($("#layerOrder_template")[0].innerHTML);
	    $("#mm_layer_legend_display").html($("#layerLegend_template")[0].innerHTML);

	    llevelInit0=false;
	    for(var i in mlegend){
		addToLayerLegend(i,mlegend,0);
		break;
	    }
	    for(name in oLayers)
		$("#mm_layer_order_display").children().first().append('<li data-id="'+name+'" class="list-group-item">'+name+'</li>');
	    var group0=$("ul.draggable").sortable({
		group: 'draggable',
		delay: 100
	    });
	    var group = $("ol.serialization").sortable({
		group: 'serialization',
		delay: 100
	    });
	    $("#mm_layer_order_display").find("button").first().click(function(){
		var data = group0.sortable("serialize").get();
		var res=[];
		console.log(data);
		for(var i=0;i<data[0].length;i++){
		    console.log(data[0][i]);
		    res.push(data[0][i]["id"]);
		}
		var jsonString = JSON.stringify(res, null, ' ');
		zoo.execute({
		    identifier: "mapfile.updateLayersOrder",
		    type: "POST",
		    dataInputs: [
			{"identifier":"layers","value":jsonString,"dataType":"string"},
			{"identifier":"map","value":$("#save-map").val(),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    success: function(data){
			console.log(data);
			$(".notifications").notify({
			    message: { text: data },
			    type: 'success',
			}).show();
			loadMapLayers();
		    },
		    error: function(data){
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			    type: 'danger',
			}).show();
		    }
		});
	    });
	    $("#mm_layer_legend_display").find("button").last().click(function(){
		var data = group.sortable("serialize").get();
		var jsonString = JSON.stringify(data[0], null, ' ');
		zoo.execute({
		    identifier: "mapfile.updateMapOrder0",
		    type: "POST",
		    dataInputs: [
			{"identifier":"jsonStr","value":jsonString,"dataType":"string"},
			{"identifier":"map","value":$("#save-map").val(),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    success: function(data){
			console.log(data);
			$(".notifications").notify({
			    message: { text: data },
			    type: 'success',
			}).show();
			loadMapLayers();
		    },
		    error: function(data){
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			    type: 'danger',
			}).show();
		    }
		});
		console.log(jsonString);
	    });
	    $("#mm_layer_order_display").prepend($("#layerOrder_header_template")[0].innerHTML);
	    $("#mm_layer_legend_display").prepend($("#layerLegend_header_template")[0].innerHTML);
	    var target=$(this).attr('id').replace(/Toggler/g,"");
	    $("#main").removeClass("col-sm-12").addClass("col-sm-6");
	    $("#manaLayerOrder").collapse("show").show();
	    map.updateSize();

	    var togglers=["addDir"];
	    //var dtogglers=["addDir"];
	    console.log("******* click toggler on "+$("#mm_layer_legend_display").find('#mm_'+togglers[0]+'Toggler'));
	    for(var i=0;i<togglers.length;i++){
		console.log("******* click toggler on "+$("#mm_layer_legend_display").find('#mm_'+togglers[i]+'Toggler'));
		$("#mm_layer_legend_display").find('#mm_'+togglers[i]+'Toggler').click(function(e){
		    console.log("******* click toggler");
		    e.stopPropagation();
		    var target=$(this).attr('id').replace(/Toggler/g,"");
		    console.log(target);
		    /*for(var j in dtogglers){
			if('mm_'+dtogglers[j]!=target){
			    if($("#mm_layer_legend_display").find('#mm_'+dtogglers[j]+'Toggler').is(":visible"))
				$("#mm_layer_legend_display").find('#mm_'+dtogglers[j]).addClass("hide");
			}
		    }*/
		    $("#mm_layer_legend_display").find('#'+target).toggleClass("hide");
		    $("#mm_layer_legend_display").find('#'+target).find(".hide").toggleClass("hide");
		});
	    }

	});

	$('#side-menu').css({"max-height": ($(window).height()-50)+"px","overflow":"scroll"});

	$('#mm_layer_legend_display,#mm_layer_order_display').css({"max-height": ($(window).height()-100)+"px","overflow":"scroll"});


	$("#mm_layer_template_display").find("select[name=field]").change(function(){
	    $(".mm-editor").summernote('editor.insertText', '[item name='+$(this).val()+']');
	});


	console.log("Set Map Height !");
	setMapHeight();
	//$("#main").split({orientation:'horizontal', limit:300});
	//$('#manaMap div').width($(window).width()/2);
	//$("#manaMap").split({orientation:'vertical', limit:400});
	adminBasic.initialize(zoo);
	console.log("Set Map Height !");

	var olMapDiv = document.getElementById('map');
	console.log("Set Map Height !");

	var controls = [
	    //new ol.control.Attribution(),
	    new ol.control.Rotate({autoHide: true}),
	    new ol.control.Zoom(),
	    new ol.control.ZoomSlider()
	];


	var osm = new ol.layer.Tile({
            source: new ol.source.OSM(),
	    visible: true,
            name: 'osm'
        });
	myBaseLayers.push(osm);
	var mq0=new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: "osm"}),
	    visible: false,
	    name: 'mapquest-osm'
	});
	myBaseLayers.push(mq0);
	var mq1=new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: "sat"}),
	    visible: false,
	    name: 'mapquest-sat'
	});
	myBaseLayers.push(mq1);
	var cbl=new ol.layer.Tile({
	    visible: false,
	    source: new ol.source.TileWMS({
		url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/baselayer.map",
		params: {'LAYERS': "dummy", 'TILED': true},
		serverType: 'mapserver',
		visible: false
	    })
	});
	myBaseLayers.push(cbl);


	map = new ol.Map({
	    target: olMapDiv,
	    controls: controls,
	    layers: myBaseLayers,
	    interactions: ol.interaction.defaults({
		altShiftDragRotate: true,
		dragPan: false,
		rotate: true
	    }).extend([new ol.interaction.DragPan({kinetic: null})]),
	    view: new ol.View({
		center: [0, 0],
		zoom: 2
	    })
	});


	var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
	var ext=module.config().default_ext.split(',');
	for(var i=0;i<ext.length;i++)
		ext[i]=parseFloat(ext[i]);
	var extent=ol.extent.applyTransform(ext, transformer);
	map.getView().fit(extent,map.getSize());

	console.log("Start Manager");

	loadMapLayers();

	$('.cpicker').colorpicker({format: "hex"});
	window.setTimeout(function () { 
	    adminBasic.typeaheadMap(module,zoo,[$("#load-map"),$("#load-map")]);
	},100);

	console.log($("#save-map").next().find('button'));
	$("#save-map").next().find('button').click(function(e){
	    adminBasic.loadMap(zoo,[$("#save-map").val(),$("#save-map-orig").val()]);
	});

    };

    function createSelectLayer(){
	selectLayer = new ol.layer.Vector({
	    visible: true,
	    source: new ol.source.Vector({})
	});
	map.addLayer(selectLayer);
	//myBaseLayers.push(selectLayer);
    }

    var refreshDatasources=function(){
	console.log($("#select-datastore").val());
	$("#select-datasource").addClass("hide");
	if($("#select-datastore").val()!=-1)
	    zoo.execute({
		identifier: "mapfile.redrawDsList",
		type: "POST",
		dataInputs: [
		    {"identifier":"name","value":$("#select-datastore").val(),"dataType":"string"}
		],
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    console.log(data);
		    $("#select-datasource").html("");
		    for(i in data)
			$("#select-datasource").append('<option value="'+data[i]["value"]+'">'+data[i]["name"]+'</option>');
		    $("#select-datasource").removeClass("hide");
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
    }

    var applyStyle=function(elem){
	var params=[];
	elem.parent().parent().find("input[type=text],textarea").each(function(){
	    if($(this).is(":visible") && !$(this).is(":disabled"))
		params.push({"id":$(this).attr('name'),"value": $(this).val().replace(/\#/g,"")});
	});
	var cId=elem.parent().parent().parent().parent().prev().attr("id");
	var tmp=cId.split("_");
	var index=tmp[tmp.length-1];
	var reg=new RegExp("_"+index,"g");
	var cLayer=cId.replace(reg,"");
	console.log(cLayer);
	console.log(index);
	console.log(params);
	var ibindings={
	    "className": "mmClassName",
	    "fillColorValue": "mmFill",
	    "strokeColorValue": "mmStroke",
	    "classOutlineWidth": "mmStrokeWidth",
	    "classWidth": "mmWidth",
	};
	var inputs=[];
	for(var i in ibindings){
	    for(var j in params){
		if(params[j].id==i){
		    inputs.push({
			"identifier": ibindings[i],
			"value": params[j].value,
			"dataType": "string"
		    });
		    break;
		}
	    }
	}
	
	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "layer",
	    "value": cLayer,
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "mmClass",
	    "value": index,
	    "dataType": "integer"
	});
	inputs.push({
	    "identifier": "mmOpacity",
	    "value": $("#mm_layer_property_style_display").find("input[type=range]").first().val(),
	    "dataType": "integer"
	});
	inputs.push({"identifier": "force","value": "true","dataType": "boolean"});

	zoo.execute({
	    identifier: "mapfile.saveLayerStyle",
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
		var lindex=myBaseLayers.length;
		for(var i in oLayers){
		    if(i==cLayer){
			break;
		    }
		    lindex+=1;
		}
		console.log("change lindex "+lindex);
		map.getLayers().item(lindex).getSource().updateParams({time_: (new Date()).getTime()});
		map.getLayers().item(lindex).getSource().changed();
		map.updateSize();
		var tmpVal=$("#"+cId).find("img").first().attr('src');
		console.log(tmpVal+"&timestamp=" + new Date().getTime());
		$("#"+cId).find("img").first().removeAttr("src").attr('src',tmpVal+"&timestamp=" + new Date().getTime());
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});

	console.log(inputs);
	return false;
    }

    var operations={
	"removeLayer": {
	    "identifier": "mapfile.removeLayer",
	    "bindings": "layer",
	    "hide": [false]
	},
	"addGrid": {
	    "identifier": "mapfile.addGridToMap",
	    "bindings": "layer",
	    "hide": [true,2]
	},
	"addDir": {
	    "identifier": "mapfile.addGroupToMap",
	    "bindings": "group",
	    "hide": [true,2],
	    "func": function(){
		$("#mm_layerOrderToggler").click();
	    }
	},
	"addLayer": {
	    "identifier": "mapfile.loadMapForDs",
	    "bindings": {
		"selectDatastore": "dstName",
		"selectDatasource": "dsoName",
		"targetGroup": "dsgName"
	    },
	    "selector": "select",
	    "hide": [true,2],
	    "reload": [true],
	    "multiple": "selectDatasource"
	}

    }

    function complex(action,elem){
	var lbindings=operations[action]["bindings"];
	var params=[];
	var inputs=[];
	var rootLocation=elem.parent();
	rootLocation.find(operations[action]["selector"]).each(function(){
	    if($(this).is(":visible") && !$(this).is(":disabled"))
		params.push({"id":$(this).attr('name'),"value": $(this).val()});
	});
	for(var i in lbindings){
	    for(var j in params){
		if(params[j].id==i){
		    if(operations[action]["multiple"]!=i)
			inputs.push({
			    "identifier": lbindings[i],
			    "value": params[j].value,
			    "dataType": "string"
			});
		    else{
			var values=params[j].value;
			for(var k in values)
			    inputs.push({
				"identifier": lbindings[i],
				"value": values[k],
				"dataType": "string"
			    });
			
		    }
		    break;
		}
	    }
	}
	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	console.log(inputs);
	zoo.execute({
	    identifier: operations[action]["identifier"],
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
		if(operations[action]["hide"][0]){
		    var myElem=elem;
		    for(var i=0;i<operations[action]["hide"][1];i++)
			myElem=myElem.parent();
		    myElem.addClass("hide");
		}
		if(operations[action]["reload"][0] && operations[action]["reload"].length==1){
		    unloadMapLayers();
		    loadMapLayers();
		}else
		    if(operations[action]["reload"][0] && operations[action]["reload"][1]){
			operations[action]["reload"][1]();
		    }
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

    function basic(action,elem){
	var inputs=[];
	inputs.push({
	    "identifier": "map",
	    "value": $("#save-map").val(),
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": operations[action]["bindings"],
	    "value": (elem?elem.val():selectedLayer),
	    "dataType": "string"
	});
	zoo.execute({
	    identifier: operations[action]["identifier"],
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
		if(operations[action]["hide"][0]){
		    var myElem=elem;
		    for(var i=0;i<operations[action]["hide"][1];i++)
			myElem=myElem.parent();
		    myElem.addClass("hide");
		}
		unloadMapLayers();
		loadMapLayers();
		window.setTimeout(function () { 
		    if(operations[action]["func"]){
			operations[action]["func"]();
		    }
		}, 50);
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
    
    // Return public methods
    return {
        initialize: initialize,
	applyStyle: applyStyle,
	basic: basic,
	complex: complex,
	refreshDatasources: refreshDatasources,
	map: function(){
	    return map;
	}
    };



});

