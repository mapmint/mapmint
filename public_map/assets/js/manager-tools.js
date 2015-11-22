// Filename: admin-basic.js


define([
    'module', 'jquery', 'metisMenu', 'xml2json', 'colorpicker'
], function(module, $, metisMenu, X2JS, colorpicker) {

    var legendSteps={};
    var geotypeClasses=[
	"point",
	"line",
	"polygon",
	"raster"
    ];
    var cbindings={
	"us": "uniqSymb",
	"uv": "uniqVal",
	"gs": "gradSymb",
	"cc": "contCol",
	"tl": "timeline"
    };


    var _x2js = new X2JS({
        arrayAccessFormPaths: [
            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
            'Capabilities.ServiceIdentification.Keywords'
        ],   
    });

    var initMenu=function(){
	$('#side-menu').metisMenu({ toggle: false });
    };

    var zoo=null;
    var initialize=function(){
	if(arguments[0]){
	    zoo=arguments[0];
	}
    }

    function displayVector(data,param,dsid,datasource,rdatasource,sfunc,efunc){
	console.log(data);
	var ldatasource=datasource.replace(/\./g,"_");
	var regs=[
	    new RegExp("\\[srs\\]","g"),
	    new RegExp("\\[encoding\\]","g")
	];
	var myRoot=$("#DS_"+dsid+"_"+ldatasource);
	myRoot.find(".panel-body").first().html('<div class="col-md-12">'+$("#dataSource_srs_template")[0].innerHTML.replace(regs[0],data.datasource.srs).replace(regs[1],data.datasource.encoding)+'</h4> <table id="DS_table_'+dsid+'_'+ldatasource+'" ></table></div>')
	if(!data.datasource.fields.field.length)
	    data.datasource.fields.field=[data.datasource.fields.field];
	var celem=myRoot.find(".panel-body").find("input[name=encoding]").next().children().first();
	celem.off('click');
	celem.click(function(){
	    $('#DS_table_'+dsid+'_'+ldatasource).dataTable().fnDraw();
	});
	var lcolumns=[];
	for(var i in data.datasource.fields.field){
	    console.log(data.datasource.fields.field);
	    lcolumns.push({"data":data.datasource.fields.field[i].id,"name":data.datasource.fields.field[i].id,"title":data.datasource.fields.field[i].id});
	}

	var cnt=0;
	var ldata=data;
	$('#DS_table_'+dsid+'_'+ldatasource).DataTable( {
	    data: [],
	    "dom": 'Zlfrtip',
	    "colReorder": true,
            "colResize": true,
	    "scrollY":  ($(window).height()/4)+"px",
	    "scrollCollapse": true,
	    "scrollX": true,
	    "sScrollX": "100%",
	    "sScrollXInner": "100%",
	    "bAutoWidth": false,
	    "bProcessing": true,
	    "bServerSide": true,
	    fixedHeader: true,
	    //searching: true,
	    //responsive: true,
	    deferRender: true,
	    rowId: "fid",
	    "sAjaxSource": "users",
	    select: {
		info: false,
	    },
	    "lengthMenu": [[10, 25, 50, 150], [10, 25, 50, 150]],
	    columns: lcolumns,
	    "fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
		console.log("Starting datatable download");
		console.log(aoData);
		sfunc();

		var llimit=[];
		for(j in {"iDisplayStart":0,"iDisplayLength":0,"iSortCol_0":0,"sSortDir_0":0,"sSearch":0})
		    for(i in aoData)
			if(aoData[i].name==j){
			    if(llimit.length==4 && aoData[i].value!="")
				llimit.push(aoData[i].value);
			    if(llimit.length<4)
				llimit.push(aoData[i].value);
			}
		console.log(llimit);

		console.log(lcolumns);

		var opts=zoo.getRequest({
		    identifier: "vector-tools.mmExtractVectorInfo",
		    dataInputs: [
			{"identifier":"dataSource","value":param,"dataType":"string"},
			{"identifier":"layer","value":rdatasource,"dataType":"string"},
			{"identifier":"getFeatures","value":"true","dataType":"boolean"},
			{"identifier":"page","value":(llimit[0]/llimit[1])+1,"dataType":"integer"},
			{"identifier":"limit","value":llimit[1],"dataType":"integer"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"sortname","value":(lcolumns[llimit[2]].data),"dataType":"string"},
			{"identifier":"encoding","value":$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").find("input[name=encoding]").val(),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","mimeType":"text/xml","type":"raw"}
		    ],
		    type: 'POST',
		    storeExecuteResponse: false
		});
		
		console.log(opts);
		opts["success"]=function() {
		    console.log(arguments);
		    var obj=_x2js.xml_str2json( arguments[2].responseText );

		    var data=[];
		    if(!obj.FeatureCollection.featureMember.length)
			obj.FeatureCollection.featureMember=[obj.FeatureCollection.featureMember];
		    for(var i in obj.FeatureCollection.featureMember){
			data.push(obj.FeatureCollection.featureMember[i]);
			data[data.length-1]["fid"]=dsid+"_"+datasource+"_"+(obj.FeatureCollection.featureMember[i][lcolumns[0].name].replace(/\./g,"__"));
		    }

		    var opts={
			"sEcho": cnt++, 
			"iDraw": cnt++, 
			"iTotalRecords": ldata.datasource.featureCount,
			"iTotalDisplayRecords": ldata.datasource.featureCount, 
			"aaData": (ldata.datasource.featureCount>0?data:[])
		    };
		    fnCallback(opts);

		    myRoot.find(".selected").removeClass("selected");
		    
		    if(ldata.datasource.featureCount==0){
			myRoot.DataTable().clear();
		    }
		    
		    efunc();
		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});
    }

    function callCreateLegend(map,layer,step,opts,lfunction){
	var params=[
	];
	if(step!=null)
	    params.push({
		"identifier": "mmStep",
		"value": step,
		"dataType":"integer"
	    });
	if(opts){
	    if($.isArray(opts))
		for(var i=0;i<opts.length;i++)
		    params.push(opts[i]);
	    else
		params.push(opts);
	}else{
	    params.push({"identifier": "name","value":map,"dataType":"string"});
	}
	params.push({"identifier": "layer","value":layer,"dataType":"string"});
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

    function loadStyleDisplay(ldata,params,myRoot){
	if(!ldata)
	    return;
	var myRootLocation=$("#mm_layer_property_style_display");
	if(myRoot)
	    myRootLocation=myRoot;

	console.log(myRootLocation.find("input[name=styleOpacity]"));
	
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
	console.log(myRootLocation.find("textarea[name=formula]"));
	myRootLocation.find("textarea[name=formula]").val(ldata.formula);
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
	
	loadStyleTable(ldata,params);
	
    }

    function loadStyleTable(ldata,params){
	var layer=ldata.name;
	var lparams=params;
	tableData=[];
	for(var j in ldata["Style"].classes){
	    tableData.push([j,'<img src="'+ldata["Style"].classes[j].legend+'" />',ldata["Style"].classes[j].name,layer+"_"+j]);
	}
	var myRootLocation=$("#mm_layer_property_style_display");
	myRootLocation.find("div.classesTable").children().remove();
	myRootLocation.find("div.classesTable").append('<table id="classes"></table>');
	var oTable = $('#classes').dataTable({
	    data: tableData,
	    "searching": false,
	    "paging":   false,
	    "ordering": false,
	    "info":     false,
	    "bAutoWidth": false,
	    "aoColumns": [
		//{ "sTitle": "","sWidth": "10px", "sClass": "details-control", "data": null },
		{ "sTitle": "Id","sWidth": "10px" },
		{ "sTitle": "Legend","sWidth": "40px" },
		{ "sTitle": "Name", "sClass": "center", "bSortable": false },
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

			if(lparams){
			    console.log(lparams);
			    for(var kk=0;kk<lparams.length;kk++){
				inputs.push(lparams[kk]);
			    }
			}else
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

    function generateLineTemplate(values){
	var template=$("#layer_property_table_line_template")[0].innerHTML;
	var oregs=["id","order","display","export","name","label","width","value"];
	var reg=[];
	for(var i=0;i<values.length;i++)
	    reg.push({
		"reg": new RegExp("\\["+oregs[i]+"\\]","g"),
		"value": values[i]
	    });
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

    function loadTableDefinition(obj,data,save,preview){
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
			data["gfi_fields"][i],
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
			ldata[i]["_name"],
		    ]);
		    cnt+=1;
		}
	    }
	var reg=new RegExp("\\[tbody\\]","g");
	var template=$("#layer_property_table_template")[0].innerHTML;
	$("#mm_layer_property_table_display").html(template.replace(reg,tbody));
	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );
	var table = $('#layer_property_table_table_display').DataTable( {
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
	    if(preview)
		preview($(this));
	    return false
	});
	$("#mm_layer_property_table_display").find("button").first().off('click');
	(function(save){
	    $("#mm_layer_property_table_display").find("button").first().click(function(){
		if(save)
		    save($(this));
		return false;
	    });
	})(save);

    }

    function getTableDesc(msUrl,map,layer,idata,func){
	$.ajax({
	    url: msUrl+"?map="+map+"&service=WFS&version=1.0.0&request=DescribeFeatureType&typename="+layer+"&_="+Date(),
	    success: function(){
		var obj=_x2js.xml_str2json( arguments[2].responseText );
		var ldata=obj.schema.complexType.complexContent.extension.sequence.element;
		var rdata={};
		if(obj.schema.complexType){
		    var ldata=obj.schema.complexType.complexContent.extension.sequence.element;
		    rdata={
			fields: [],
			aliases: [],
			sizes: []
		    };
		    for(i in ldata){
			rdata.fields.push(ldata[i]["_name"]);
			rdata.aliases.push(ldata[i]["_name"]);
			rdata.sizes.push(100);
		    }
		    func(obj,rdata,idata);
		}
	    }
	});
	
	
    }

    function classifyMap(closure,map,ldata,extraParams,func){
	var myLocation=$(closure).parent().parent();
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
	    "tileSize": "tiled"
	};
	var hasStep=$("#mm_layer_property_style_display").find("select[name=step_classification]").is(":visible");
	var cfield=(hasStep?"step_classification":"classification");
	
	params.push({"id":"mmType","value": cbindings[myLocation.find("select[name="+cfield+"]").val()]});
	if(cbindings[myLocation.find("select[name="+cfield+"]").val()])
	    params.push({"id":"type","value": cbindings[myLocation.find("select[name="+cfield+"]").val()]});
	
	console.log(myLocation);
	console.log(myLocation.find("input[type=text],input[type=range],textarea,select"));
	myLocation.find("input[type=text],input[type=range],textarea,select").each(function(){
	    console.log($(this).is(":visible") && !$(this).is(":disabled") && $(this).val()!=null);
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
	    "value": map,
	    "dataType": "string"
	});
	inputs.push({
	    "identifier": "layer",
	    "value": ldata.name,
	    "dataType": "string"
	});	
	if(extraParams)
	    for(var i=0;i<extraParams.length;i++)
		inputs.push(extraParams[i]);
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
		func(ldata,hasTiles);
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
	displayVector: displayVector,
	callCreateLegend: callCreateLegend,
	loadStyleDisplay: loadStyleDisplay,
	getTableDesc: getTableDesc,
	loadTableDefinition: loadTableDefinition,
	classifyMap: classifyMap
    };



});

    
