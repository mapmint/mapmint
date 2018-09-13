// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic',"datepicker","fileinput","fileinput_local",'highcharts'
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,datepicker,fileinput,fileinput_local,Highcharts) {
    

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

    function createParam(obj){
	return {
	    "identifier": $(obj).attr("name"),
	    "value": $(obj).val(),
	    "dataType": "string"
	}
    }

    function displayTable(param,ltype,lid,fields,rfields){
	var cnt=0;
	var CRowSelected=[];
	var CFeaturesSelected=[];
	var CFeatures=[];

	console.log(lid);
	var myRootElement=$('#'+lid).parent().find(".btn-group").last().parent();

	zoo.execute({
	    identifier: "template.display",
	    type: "POST",
	    dataInputs: [
		{
		    "identifier": "tmpl",
		    "value": "Distiller/PgEditorWindow0_bs",
		    "dataType": "string"
		},
		{
		    "identifier": "dataStore",
		    "value": param,
		    "dataType": "string"
		},
		{
		    "identifier": "table",
		    "value": ltype,
		    "dataType": "string"
		},
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		//console.log(data);
		console.log(lid);
		myRootElement.append(data);

		$("."+lid+"BaseEditForm").on("addClass",function(){
		    var closure=this;
		    console.log("closure");
		    console.log($(closure));
		    $("."+lid+"BaseEditForm").each(function(){
			if($(this).attr('id')!=$(closure).attr('id') && $(this).hasClass("in")){
			    $(this).removeClass("in");
			}
		    });
		});

		$("."+lid+"SubmitForm").click(function(e){
		    console.log("VALIDATE FORM !");
		    var params=[];
		    params.push({"identifier": "dataStore","value": param,"dataType": "string"});
		    params.push({"identifier": "table","value": ltype,"dataType": "string"});
		    var set={};
		    var rType=null;
		    var attId="obj";
		    var ltype1=$(this).parent().find("#um_utype").val();
		    var pIdentifier="datastores.postgis."+(ltype1=="delete"?"deleteTuple":"editTuple");
		    var myForm=$(this).parent()
		    
		    var reg0=new RegExp(ltype+'_',"g");
		    var reg1=new RegExp(ltype+'s_',"g");
		    
		    $(this).parent().find("input,textarea,select").each(function(){
			if($(this).attr('id')=="um_utype"){
			    rType=$(this).val();
			    params.push({identifier: "type",value: $(this).val(),dataType: "string"});
			}
			else{
			    if($(this).attr("name")){
				if($(this).attr("name")!="id"){
				    if($(this).is(":visible")){
					if($(this).attr("type")=="checkbox"){
					    set[$(this).attr("name").replace(reg0,"")]=$(this).is(":checked");
					}
					else
					    set[$(this).attr("name").replace(reg0,"")]=$(this).val();
				    }
				    else{
					console.log("OK 0");
					console.log($(this));
					console.log($(this).val());
				    }
				}
				else{
				    console.log("OK 1");
				    console.log($(this));
				    console.log($(this).val());
				    if($(this).val()!="")
					params.push({identifier: "clause",value: 'id='+$(this).val().replace(reg1,""),dataType: "string"});
				}
			    }
			}
		    });
		    params.push({identifier: attId,value: JSON.stringify(set),mimeType: "application/json"});
		    //if(rType!="insert")
		    
		    console.log(CRowSelected[0]);
		    
		    //params.push({identifier: "login",value: user.login,dataType: "string"});
		    console.log(params);
		    //return false;
		    zoo.execute({
			identifier: pIdentifier,
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
			    var dataTable = $('#'+lid).dataTable();
			    CRowSelected=[];
			    CFeaturesSelected=[];
			    $("#"+lid).dataTable().fnDraw();
			    if(rType=="insert"){
				myRootElement.find("#insert-tuple").find("input").each(function(){
				    if($(this).attr("name"))
					$(this).val("");
				});
			    }else{
				$('.require-select').addClass("disabled");
			    }
			    $('.'+lid+'BaseEditForm').removeClass("in");
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
		
	    },
	    error: function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});

	$('#'+lid).DataTable( {
	    language: {
                url: module.config().translationUrl
            },
	    data: [],
	    "dom": 'Zlfrtip',
            "colResize": true,
	    autoWidth: false,
	    "scrollY":  ($(window).height()/2)+"px",
	    "scrollCollapse": true,
	    "scrollX": true,
	    //"sScrollX": "100%",
	    //"sScrollXInner": "100%",
	    "bAutoWidth": false,
	    "bProcessing": true,
	    "bServerSide": true,
	    fixedHeader: true,
	    //searching: true,
	    responsive: true,
	    deferRender: true,
	    crollCollapse:    true,
	    rowId: 'fid',
	    "sAjaxSource": "users",
	    select: {
		info: false,
	    },
	    "lengthMenu": [[5, 10, 25, 50, 1000], [5, 10, 25, 50, "All"]],
	    columns: fields,
	    "rowCallback": function( row, data ) {
		console.log(CRowSelected);
		console.log(data.DT_RowId);
		$(row).removeClass('selected');
		console.log($(row));
		console.log($.inArray(data.DT_RowId, CRowSelected) !== -1 );
		if ( $.inArray(data.DT_RowId, CRowSelected) !== -1 ) {
		    console.log(data.DT_RowId);
		    console.log($('#'+lid).DataTable());
		    $('#'+lid).DataTable().row($(row)).select();
		    //$(row).addClass('selected');
		}else{
		    $('#'+lid).DataTable().row($(row)).deselect();
		    //$(row).removeClass('selected');
		}
	    },
	    "fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
		console.log("Starting datatable download");
		console.log(aoData);


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

		var closestproperties=rfields;
		var page=llimit[0]+1;
		console.log(page);
		if(page!=1){
		    page=(llimit[0]/llimit[1])+1;
		    console.log(page);
		}
		console.log(page);

		var opts=zoo.getRequest({
		    identifier: "datastores.postgis.getTableContent",
		    dataInputs: [
			{"identifier":"dataStore","value":param,"dataType":"string"},
			{"identifier":"table","value":ltype,"dataType":"string"},
			{"identifier":"offset","value":llimit[0],"dataType":"int"},
			{"identifier":"limit","value":llimit[1],"dataType":"int"},
			{"identifier":"page","value":page,"dataType":"int"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"search","value":llimit[llimit.length-1],"dataType":"string"},
			{"identifier":"sortname","value":(closestproperties.split(",")[llimit[2]]),"dataType":"string"},
			{"identifier":"fields","value":closestproperties.replace(/,msGeometry/g,""),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","mimeType":"application/json","type":"raw"}
		    ],
		    type: 'POST',
		    storeExecuteResponse: false
		});
		
		console.log(opts);
		opts["success"]=function(rdata) {
		    features=rdata;
		    featureCount=rdata["total"];
		    var data=[];
		    CFeatures=[];
		    console.log(features);
		    for(var i in features.rows){
			console.log(features.rows[i]);
			var lparams={
			    "fid": lid+"_"+features.rows[i].id			    
			}
			var tmp=rfields.split(',');
			for(var kk=0;kk<tmp.length;kk++)
			    lparams[tmp[kk]]=features.rows[i].cell[kk];
			data.push(lparams);
			CFeatures.push(data[data.length-1]);
		    }

		    var opts={
			"sEcho": cnt++, 
			"iDraw": cnt++, 
			"iTotalRecords": featureCount, 
			"iTotalDisplayRecords": featureCount, 
			"aaData": (featureCount>0?data:[])
		    };
		    console.log(opts);
		    fnCallback(opts);

		    for(d in data){
			if ( $.inArray(data[d].fid+"", CRowSelected) !== -1 ) {
			    console.log(data[d].fid);
			    $('#'+lid).DataTable().row($("#"+data[d].fid)).select();
			}else{
			    $('#'+lid).DataTable().row($("#"+data[d].fid)).deselect();
			}
		    }

		    
		    if(featureCount==0){
			$('#'+lid+'Table').DataTable().clear();
			console.log("clear table");
		    }
		    
		    console.log(CRowSelected);
		    var existing=$('#'+lid+'_info').children('span.select-info');
		    if(existing.length)
			existing.remove();
		    var lreg=new RegExp("\\[dd\\]","g");
		    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
			$('<span class="select-item"/>').append((CRowSelected.length>1?module.config().localizationStrings.dataTables.selection:module.config().localizationStrings.dataTables.selection0).replace(lreg,CRowSelected.length))
		    ));
		    console.log('finish');
		    

		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});

	$('#'+lid+' tbody').on('click', 'tr', function () {
	    console.log("CURRENT CLICK! ");
	    var id = this.id+"";
	    console.log("CURRENT ID: "+id);
	    var reg0=new RegExp(ltype+'_',"g");
	    var index = $.inArray(id, CRowSelected);
	    if ( index == -1 ) {
		if(CRowSelected.length>0){
		    console.log("#"+CRowSelected[0]);
		    $('#'+lid).DataTable().row($("#"+CRowSelected[0])).deselect();
		    CRowSelected.pop(CRowSelected[0]);
		    CFeaturesSelected.pop(CFeaturesSelected[0]);
		}
		if(CFeaturesSelected.length==0)
		    myRootElement.find(".require-select").removeClass("disabled");
		    
		CRowSelected.push( id );

		$('#'+lid).DataTable().row("#"+id).select();

		console.log(CFeatures.length);
		for(var i=0;i<CFeatures.length;i++){
		    console.log(CFeatures[i]["fid"]);
		    if(CFeatures[i]["fid"]==id)
		       CFeaturesSelected.push( CFeatures[i] );
		}
		$("."+lid+"EditForm").find("input,textarea,select").each(function(){
		    console.log(ltype+' _');
		    console.log("NAME: "+$(this).attr("name")+' _');
		    console.log("ID: "+$(this).attr("id")+' _');
		    console.log("NAME: "+$(this).val()+' _');
		    var attribute=null;
		    if($(this).attr("name")){
			attribute=$(this).attr("name").replace(reg0,'');
			if(attribute=="id")
			    attribute="fid";
			    console.log(CFeaturesSelected[0][attribute]+'_');
			console.log("RNAME: "+attribute+'_');
		    }
		    if($(this).attr("type")=="checkbox")
			$(this).prop("checked",false);
		    if($(this).attr("name"))
			console.log($(this).attr("name"));

		    if($(this).attr("name") && CFeaturesSelected[0][attribute]){
			console.log($(this).attr("name"));
			if($(this).attr("type")!="checkbox"){
			    $(this).val(CFeaturesSelected[0][attribute].replace(reg0,""));
			    $(this).find('option').each(function(){
				if($(this).text()==CFeaturesSelected[0][attribute]){
				    $(this).prop("selected",true);
				}else
				    $(this).prop("selected",false);
			    });
			}
			else{
			    console.log(CFeaturesSelected[0][attribute].replace(reg0,""));
			    $(this).prop("checked",CFeaturesSelected[0][attribute].replace(reg0,"")=="1"||CFeaturesSelected[0][attribute].replace(reg0,"")=="True");
			}
		    }
		});


	    } else {
		$("."+lid+"BaseEditForm").removeClass("in");
		console.log("REMOVE "+index);
		CRowSelected.pop(index);
		console.log(CFeaturesSelected);
		CFeaturesSelected.pop(index);
		console.log(CFeaturesSelected);
		$('#'+lid).DataTable().row("#"+id).deselect();
		if(CFeaturesSelected==0)
		    myRootElement.find(".require-select").addClass("disabled");
	    }
	    var existing=$('#'+lid+'_info').children('span.select-info');
	    if(existing.length)
		existing.remove();
	    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
		$('<span class="select-item"/>').append((CFeaturesSelected.length!=CRowSelected.length?'dd rows selected (ee total selected)'.replace(/dd/g,CRowSelected.length).replace(/ee/g,CFeaturesSelected.length):'dd rows selected'.replace(/dd/g,CRowSelected.length)))
	    ));
	} );

    }

    function displayVector(data,param,dsid,datasource){
	console.log(data);
	var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");
	var regs=[
	    new RegExp("\\[srs\\]","g"),
	    new RegExp("\\[encoding\\]","g")
	];
	$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().html('<div class="col-md-12">'+$("#dataSource_srs_template")[0].innerHTML.replace(regs[0],data.datasource.srs).replace(regs[1],data.datasource.encoding)+'</h4> <table id="DS_table_'+dsid+'_'+ldatasource+'" ></table></div>')
	if(!data.datasource.fields.field.length)
	    data.datasource.fields.field=[data.datasource.fields.field];
	var celem=$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").find("input[name=encoding]").next().children().first();
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
	    language: {
                url: module.config().translationUrl
            },
	    data: [],
	    "dom": 'Zlfrtip',
            "colResize": true,
	    "scrollY":  ($(window).height()/4)+"px",
	    "scrollCollapse": true,
	    "scrollX": true,
	    "sScrollX": "100%",
	    "sScrollXInner": "100%",
	    //"bAutoWidth": false,
	    "bProcessing": true,
	    "bServerSide": true,
	    fixedHeader: true,
	    //searching: true,
	    responsive: true,
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
			{"identifier":"layer","value":datasource,"dataType":"string"},
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
			data[data.length-1]["fid"]=dsid+"_"+datasource+"_"+(obj.FeatureCollection.featureMember[i][lcolumns[0].name].replace(/\./g,"__").replace(/:/g,"__"));
		    }

		    var opts={
			"sEcho": cnt++, 
			"iDraw": cnt++, 
			"iTotalRecords": ldata.datasource.featureCount,
			"iTotalDisplayRecords": ldata.datasource.featureCount, 
			"aaData": (ldata.datasource.featureCount>0?data:[])
		    };
		    fnCallback(opts);

		    $('#DS_table_'+dsid+'_'+ldatasource).find(".selected").removeClass("selected");
		    
		    if(ldata.datasource.featureCount==0){
			$('#DS_table_'+dsid+'_'+ldatasource).DataTable().clear();
		    }


		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});
    }

    function displayRaster(data,param,dsid,datasource){
	var Bands=[];
	var colors=["#ff0000","#00ff00","#0000ff","#000000","#ffff99","#f2af81","#81f2f1","#e181f2"]
	if(data["datasource"]["Band"].length){
	    for(i in data["datasource"]["Band"])
		Bands.push({
		    name: "Band "+i,
		    data: data["datasource"]["Band"][i]["histogram"].split(","),
		    color: colors[i]
		});
	}
	else
	    Bands.push({
		name: "Band 1",
		data: data["datasource"]["Band"]["histogram"].split(","),
		color: "#7c7c7c"
	    });
	
	for(i in Bands)
	    for(j in Bands[i]["data"])
		Bands[i]["data"][j]=parseFloat(Bands[i]["data"][j]);
	
	$("#DS_"+dsid+"_"+datasource).find(".panel-body").first().html('<div id="DS_table_'+dsid+'_'+datasource+'" class="col-md-12"></div>')
	var chart = new Highcharts.Chart({
	    chart: {
		zoomType: 'x',
		renderTo: 'DS_table_'+dsid+'_'+datasource
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
		enabled: true
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
	
    }

    function runRaster(elem){
	var myLocation=elem.parent();
	var inputs=[];
	var op=myLocation.find("#raster_method").val();
	var params={
	    "raster_method": "utility",
	    "ofband": "b",
	    "ofname": "InputDSN"
	};
	for(var i in params){
	    inputs.push({
		"identifier": params[i],
		"value": myLocation.find("#"+i).val(),
		"dataType": "string"
	    });
	}
	var extra=(op!="contour"?
		   {
		       "scale": "s",
		       "zFactor": "z",
		   }:
		   {
		       "interval": "i",
		       "aname": "a",
		   });
	for(var i in extra){
	    inputs.push({
		"identifier": extra[i],
		"value": myLocation.find("#"+op+"_"+i).val(),
		"dataType": "string"
	    });
	}

	inputs.push({
	    "identifier": "OutputDSN",
	    "value": myLocation.find("#ofdst").val()+myLocation.find("#raster_oname").val()+(op=="contour"?".shp":".tif"),
	    "dataType": "string"
	});
	
	console.log(inputs);

	var myRootLocation=myLocation.parent().parent();
	myRootLocation.addClass("panel-warning");
	zoo.execute({
	    identifier: "raster-tools."+(op=="contour"?"Gdal_Contour":"Gdal_Dem"),
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		myRootLocation.removeClass("panel-warning");
		myRootLocation.addClass("panel-success");
		myLocation.parent().collapse();
		myLocation.parent().removeClass("in");
		myLocation.remove();
		window.setTimeout(function () { 
		    myRootLocation.removeClass("panel-success");
		}, 1000);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
	
    }
    
    function runConversion(elem){
	try{
	var myLocation=elem.parent();
	var inputs=[];
	var checkboxes={
	    "chk1": {
		"id": "s_srs",
		"value": "s_srs",
		"isSrs": true
	    },
	    "tdso_chk_srs": {
		"id": "t_srs",
		"value": "tdso_srs",
		"isSrs": true
	    },
	    "sql_chk": {
		"id": "sql",
		"value": "sql",
		"isSrs": false
	    },
	    "chkType": {
		"id": "nlt",
		"value": "force_geometry_type",
		"isSrs": false
	    },
	};
	for(var i in checkboxes){
	    if(myLocation.find("input#"+i).is(":checked")){
		inputs.push({
		    "identifier": checkboxes[i]["id"],
		    "value": (checkboxes[i]["isSrs"]?"+init=":"")+myLocation.find("#"+checkboxes[i]["value"]).val(),
		    "dataType": "string"
		});
	    }
	}
	if(myLocation.find("input#ov1").is(":checked")){
	    inputs.push({
		"identifier": "overwrite",
		"value": "true",
		"dataType": "boolean"
	    });
	}else{
	    inputs.push({
		"identifier": "append",
		"value": "true",
		"dataType": "boolean"
	    });
	}
	var params={
	    "dst_in": "dst_in",
	    "dso_in": "dso_in1",
	    "dso_f": "tdso_format",
	    "dst_out": "tdso",
	    "dso_out": "out_name"
	};
	for(var i in params){
	    inputs.push({
		"identifier": i,
		"value": myLocation.find("#"+params[i]).val(),
		"dataType": "string"
	    });
	}

	console.log(inputs);
	var myRootLocation=myLocation.parent().parent();
	myRootLocation.addClass("panel-warning");
	zoo.execute({
	    identifier: "vector-converter.convert",
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		myRootLocation.removeClass("panel-warning");
		myRootLocation.addClass("panel-success");
		myLocation.parent().collapse();
		myLocation.parent().removeClass("in");
		myLocation.remove();
		window.setTimeout(function () { 
		    myRootLocation.removeClass("panel-success");
		}, 1000);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
	}catch(e){
	    console.log(e);
	}
	return false;
    }

    function deleteDatastore(elem){
	var inputs=[];
	var params={
	    "name": "data-store",
	    "type": "data-store-type",
	};
	for(var i in params)
	    inputs.push({
		"identifier": i,
		"value": elem.attr(params[i]),
		"dataType": "string" 
	    });
	var dsType=elem.attr("data-store-type");
	zoo.execute({
	    identifier: "datastores."+((dsType=='postgis' || dsType=='mysql')?"postgis":((dsType=='WMS' || dsType=='WFS')?"wfs":"directories"))+".delete",
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		$('#removeDSModal').modal("hide");
		document.location.reload(false);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    }

    function deleteDatasource(elem){
	var inputs=[];
	var params={
	    "dst": "data-store",
	    "dso": "data-source",
	};
	for(var i in params)
	    inputs.push({
		"identifier": i,
		"value": elem.attr(params[i]),
		"dataType": "string" 
	    });
	inputs.push({
	    "identifier": "dsotype",
	    "value": "undefined",
	    "dataType": "string" 
	});
	zoo.execute({
	    identifier: "datastores.removeDS",
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$(".notifications").notify({
		    message: { html: data },
		    type: 'success',
		}).show();
		$('#removeModal').modal("hide");
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    }

    function bindPrivileges(dsid,lid,param,dataType){
	if($("#DS_"+dsid).find(".panel-body").first().find("#"+lid).length){
	    if(lid=="datasourcePrivileges")
		$("#DS_"+dsid).find(".panel-body").first().collapse('hide');
	    $("#DS_"+dsid).find(".panel-body").first().find("#"+lid).remove();
	    return;
	}
	var params=[
	    {
		"identifier": "tmpl",
		"value": "UsersManagement/"+(lid=="datastorePrivileges"?"DataStoreAccess_bs":"LayerAccess_bs"),
		"dataType": "string"
	    },
	    {
		"identifier": "dataStore",
		"value": param,
		"dataType": "string"
	    },
	    {
		"identifier": "dsType",
		"value": dataType,
		"dataType": "string"
	    },
	];
	if(lid=="datasourcePrivileges"){
	    params.push({
		"identifier": "layer",
		"value": arguments[4],
		"dataType": "string"		
	    });
	}
	zoo.execute({
	    identifier: "template.display",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$("#DS_"+dsid).find(".panel-body").first().prepend(data);
		if($("#DS_"+dsid).find(".panel-body").first().find("select").length==1){
		    $("#DS_"+dsid).find(".panel-body").first().find(".gselectDel").hide();
		}
		$("#DS_"+dsid).find(".panel-body").first().find(".gselectAdd").click(function(){
		    try{
			var newElement=$(this).parent().next().next().next().clone();
			console.log($(this).parent().next().next().next());
			console.log(newElement);
			$(this).parent().parent().append($(newElement)[0].outerHTML);
			if($("#DS_"+dsid).find(".panel-body").first().find("select").length>1){
			    $("#DS_"+dsid).find(".panel-body").first().find(".gselectDel").show();
			}
		    }catch(e){
			alert(e);
		    }
		    return false;
		});
		$("#DS_"+dsid).find(".panel-body").first().find(".gselectDel").click(function(){
		    try{
			console.log($(this).parent().parent().find(".row").last());
			$(this).parent().parent().find(".row").last().remove();
			if($("#DS_"+dsid).find(".panel-body").first().find("select").length>1){
			    $("#DS_"+dsid).find(".panel-body").first().find(".gselectDel").show();
			}else
			    $("#DS_"+dsid).find(".panel-body").first().find(".gselectDel").hide();
		    }catch(e){
			alert(e);
		    }
		    return false;
		});
		$("#DS_"+dsid).find(".panel-body").first().children().first().find("button").last().click(function(){
		    var params=[];
		    $(this).parent().parent().find("select").each(function(){
			params.push({
			    "identifier": $(this).attr("name"),
			    "value": $(this).val(),
			    "dataType": "string"
			});
		    });
		    $(this).parent().parent().find('input[type="checkbox"]').each(function(){
			params.push({
			    "identifier": (lid=="datastorePrivileges"?"ds_":"group_")+$(this).attr("name"),
			    "value": $(this).is(":checked"),
			    "dataType": "boolean"
			});
		    });
		    params.push({
			"identifier": "dataStore",
			"value": param,
			"dataType": "string"
		    });

		    if(lid!="datastorePrivileges"){
			params.push({
			    "identifier": "layer",
			    "value": $(this).parent().parent().find('#am_layerName').val(),
			    "dataType": "string"
			});
			params.push({
			    "identifier": "map",
			    "value": "empty",
			    "dataType": "string"
			});
		    }

		    zoo.execute({
			identifier: (lid=="datastorePrivileges"?"datastores.saveDataStorePrivileges":"mapfile.saveLayerPrivileges"),
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
			    $("#DS_"+dsid).find(".panel-body").first().find("#"+lid).remove();
			    if(lid!="datastorePrivileges"){
				$("#DS_"+dsid).find(".panel-body").first().collapse('hide');
			    }
			    console.log(data);
			},
			error: function(data){
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });
		});
		if($("#DS_"+dsid).find(".panel-body").first().hasClass("collapse") 
		   && 
		   !$("#DS_"+dsid).find(".panel-body").first().hasClass("in") )
		    $("#DS_"+dsid).find(".panel-body").first().collapse('show');

	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
	
    }
    
    var Datastores={};
    var DSPreviews={};

    var raster_extensions={
	"GeoTIFF": "tif"
    };

    function addDir(){
	var params=[];
	params.push({
	    "identifier": "name",
	    "value": $("#add-directory").find('input[name="name"]').val(),
	    "dataType": "string"
	});
	params.push({
	    "identifier": "type",
	    "value": $("#add-directory").find('#Distiller_form_type:checked').val(),
	    "dataType": "string"
	});
	params.push({
	    "identifier": "path",
	    "value": ($("#add-directory").find('#Distiller_form_type:checked').val()=="new"?$("#add-directory").find('input[name="path"]').val():$("#add-directory").find('input[name="browse"]:checked').val()),
	    "dataType": "string"
	});
	zoo.execute({
	    identifier: "datastores.directories.saveDir",
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
		document.location.reload(true);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function loadDB(myLocation,serviceName){
	var inputs=[];
	var localFunc=function(){};
	if(arguments.length>2)
	    localFunc=arguments[2];
	myLocation.find("input,select").each(function(){
	    inputs.push({
		"identifier": $(this).attr("name"),
		"value": $(this).val(),
		"dataType": "string"
	    });
	});
	zoo.execute({
	    identifier: serviceName,
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		localFunc();
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    };

    var OWSSetupCallBacks={
	"add": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		e.preventDefault();
		e.stopPropagation();
		loadDB($(this).parent(),"datastores.wfs.save",function(){
		    document.location.reload(false);
		});
	    });
	},
	"test": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		e.preventDefault();
		e.stopPropagation();
		loadDB($(this).parent(),"datastores.wfs.test");
	    });
	},
    };

    var DBSetupCallBacks={
	"add": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		e.preventDefault();
		e.stopPropagation();
		loadDB($(this).parent(),"datastores.postgis.save",function(){
		    document.location.reload(false);
		});
	    });
	},
	"test": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		e.preventDefault();
		e.stopPropagation();
		loadDB($(this).parent(),"datastores.postgis.test");
	    });
	},
    };

    function doCleanup(data,param,dsid,dataType,obj){
	zoo.execute({
	    identifier: "datastores.directories.cleanup",
	    type: "POST",
	    dataInputs: [
		{
		    "identifier": "dsType",
		    "value": dataType,
		    "dataType": "string"
		},
		{
		    "identifier": "dsName",
		    "value": param,
		    "dataType": "string"
		},
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadDatastore(param,dsid,dataType);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});

    }

    function bindAddColumnToTable(myRoot,ds){
	console.log(" bindAddColumnToTable !");
	myRoot.find("button").last().off("click");
	myRoot.find("button").last().click(function(){
	    var params=[];
	    if($(".field-require-geometry").is(":visible")){
		if($(".field-require-geometry-point-active").is(":visible")){
		    params.push({identifier:"geo_x", "value": myRoot.find("select[name=field_geometry_x]").val(),dataType:"string"});
		    params.push({identifier:"geo_y", "value": myRoot.find("select[name=field_geometry_y]").val(),dataType:"string"});
		}
		params.push({identifier:"proj", "value": myRoot.find("#field_geometry_tprj").val(),dataType:"string"});
		params.push({identifier:"geo_type", "value": myRoot.find("select[name=field_geometry_type]").val(),dataType:"string"});
	    }
	    params.push({identifier:"field_name", "value": myRoot.find("input[name=field_name]").val(),dataType:"string"});
	    params.push({identifier:"field_type", "value": myRoot.find("select[name=field_type]").val(),dataType:"string"});
	    params.push({identifier:"table", "value": $("#pg_table").val(),dataType:"string"});
	    params.push({identifier:"dataStore", "value": ds,dataType:"string"});

	    zoo.execute({
		identifier: "datastores.postgis.addColumn",
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
		    $("#pg_table").change();
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });

	});

    }

    var DSTSetupCallBacks={
	"delete": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		$('#removeDSModal').modal("show");
		$("#removeDSModal").find(".modal-footer").find("button").last().attr("data-store",param);
		$("#removeDSModal").find(".modal-footer").find("button").last().attr("data-store-type",dataType);
	    });
	},
	"remove": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		$(".tooltip").remove();
		$("#DS_"+dsid).remove();
	    });
	},
	"toggle": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		if($(this).find('i').first().hasClass("fa-toggle-up")){
		    $("#DS_"+dsid).find(".panel-body").first().collapse('hide');
		    $(this).find('i').first().removeClass("fa-toggle-up").addClass("fa-toggle-down");
		}else{
		    $("#DS_"+dsid).find(".panel-body").first().collapse('show');
		    $(this).find('i').first().removeClass("fa-toggle-down").addClass("fa-toggle-up");
		}
	    });
	},
	"open": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		var params=[{"identifier": "dstn","value":param,"dataType":"string"}];
		for(var i=0;i<selectedDatasource["DS_"+dsid].length;i++){
		    params.push({
			"identifier": "dson",
			"value": selectedDatasource["DS_"+dsid][i],
			"dataType": "string"
		    });
		}
		zoo.execute({
		    identifier: "mapfile.openInManager",
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
			document.location="./Manager_bs";
		    },
		    error: function(data){
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			    type: 'danger',
			}).show();
		    }
		});
	    });
	},
	"privileges": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		bindPrivileges(dsid,"datastorePrivileges",param,dataType);
		return false;
	    });
	},
	"select": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		var myLocalRoot=$(obj).parent().parent().parent().parent().parent();
		myLocalRoot.find(".panel-body").first().each(function(){
		    $(this).find('.panel-heading').each(function(){
			$(this).find('.fa-square-o,.fa-check-square-o').each(function(){
			    $(this).trigger('click');
			});
		    });
		});
	    });
	},
	"db-access": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		console.log("fetch db access template");
		if($("#DS_"+dsid).find(".panel-body").first().find("#db_access").length)
		    $("#DS_"+dsid).find(".panel-body").first().find("#db_access").remove();
		zoo.execute({
		    identifier: "template.display",
		    type: "POST",
		    dataInputs: [
			{
			    "identifier": "tmpl",
			    "value": "Distiller/PgWindow_bs",
			    "dataType": "string"
			},
			{
			    "identifier": "dataStore",
			    "value": param,
			    "dataType": "string"
			},
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    success: function(data){
			console.log("SUCCESS");
			$("#DS_"+dsid).find(".panel-body").first().prepend(data);
			$("#DS_"+dsid).find(".panel-body").first().find("#pg_schema").change(function(){
			    console.log("Schema changed to "+$(this).val());
			    adminBasic.loadTablesList(param,$(this).val(),$("#DS_"+dsid).find(".panel-body").first().find("#pg_table"),true);
			});
			$("#DS_"+dsid).find(".panel-body").first().find("#pg_table").change(function(){
			    console.log("Table changed to "+$(this).val());
			    var cval=$(this).val();
			    var cvalid=$(this).val().replace(/\./g,"_").replace(/:/g,"_");
			    zoo.execute({
				identifier: "datastores.postgis.getTableDescription",
				type: "POST",
				dataInputs: [
				    {
					"identifier": "table",
					"value": $(this).val(),
					"dataType": "string"
				    },
				    {
					"identifier": "dataStore",
					"value": param,
					"dataType": "string"
				    },
				],
				dataOutputs: [
				    {"identifier":"Result","type":"raw"},
				],
				success: function(data){
				    console.log("SUCCESS");
				    //console.log(data);
				    var reg0=new RegExp("\\[table\\]","g");
				    var reg1=new RegExp("\\[tableid\\]","g");
				    if($("#DS_"+dsid).find(".panel-body").first().find(".db_access_display").length)
					$("#DS_"+dsid).find(".panel-body").first().find(".db_access_display").remove();
				    $("#DS_"+dsid).find(".panel-body").first().find("#db_access").append(
					$("#dataSource_db_access_template")[0].innerHTML.replace(reg0,cval).replace(reg1,cvalid)
				    );
				    var ifields=[];
				    fields=[];
				    rfields="";
				    for(var i=0;i<data.length;i++){
					console.log(data[i]);
					rfields+=data[i][1];
					if(i+1<data.length)
					    rfields+=",";
					if(data[i][2]=="int4" || data[i][2]=="float8" )
					    ifields.push(data[i][1]);
					fields.push({
					    "data":data[i][1],
					    "name":data[i][1],
					    "title":data[i][1],
					    "width": "10%"
					});
				    }
				    console.log(fields);
				    console.log(rfields);
				    //console.log($("#DS_"+dsid).find(".panel-body").first().find(".db_access_display"));
				    $(".field-require-geometry").hide();
				    $(".field-require-geometry-point").hide();
				    $(".field-require-geometry-point-active").hide();
				    $("#DB_table_field_type").off('change');
				    $("#DB_table_field_type").change(function(){
					$("#DB_table_field_geometry_type").off('change');
					$("#DB_table_field_geometry_type").change(function(){
					    if($(this).val()=="POINT")
						$(".field-require-geometry-point").show();
					    else{
						$(".field-require-geometry-point").hide();
						$(".field-require-geometry-point-active").hide();
					    }
					});
					$("#DB_table_field_geometry_type_active").off("click");
					$("#DB_table_field_geometry_type_active").click(function(){
					    if($(this).is(':checked')){
						$(".field-require-geometry-point-active").show();
					    }
					    else
						$(".field-require-geometry-point-active").hide();
					   
					});
					// GEOMETRY TYPE (18)
					if($(this).val()==18){
					    $(this).parent().parent().parent().find("input[name=field_name]").val("wkb_geometry");
					    $(this).parent().parent().parent().find("input[name=field_name]").prop("disabled",true);
					    $(".field-require-geometry").show();
					    $("#DB_table_field_geometry_type").change();
					}
					else{
					    $(".field-require-geometry").hide();
					    $(".field-require-geometry-point").hide();
					    $(".field-require-geometry-point-active").hide();
					}
				    });
				    for(var i=0;i<ifields.length;i++){
					$("#DB_table_field_geometry_x").append("<option>"+ifields[i]+"</option>");
					$("#DB_table_field_geometry_y").append("<option>"+ifields[i]+"</option>");
				    }
				    console.log("***** bindAddColumnToTable \n\n");
				    bindAddColumnToTable($("#DS_"+dsid).find("#insert-table"),param);
				    displayTable(param,cval,cvalid,fields,rfields);
				},
				error: function(data){
				    $(".notifications").notify({
					message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
					type: 'danger',
				    }).show();
				}
			    });

			});
		    },
		    error: function(data){
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			    type: 'danger',
			}).show();
		    }
		});

	    });
	},
	"settings": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		console.log(dataType);
		var myLocation=$("#DS_"+dsid).find(".panel-body").first();
		if(!$("#DS_"+dsid).find(".panel-body").first().find("form").length){
		    var hasLocation=false;
		    if(!myLocation.children().length)
			hasLocation=true;
		    console.log(dataType);
		    if(dataType=="mainDirectories"){
			myLocation.prepend($("#add-directory").find("form").first()[0].outerHTML);
		    }
		    else{
			if(dataType[0]=="W" && dataType[2]=="S"){
			    myLocation.prepend($("#add-ows").find("form").first()[0].outerHTML);
			    myLocation.find("form").first().find("button").each(function(){
				if($(this).attr("data-mmaction"))
				    try{
					OWSSetupCallBacks[$(this).attr("data-mmaction")](this);
				    }catch(e){
					console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
				    }	    
			    });
			    
			}
			else{
			    myLocation.prepend($("#add-database").find("form").first()[0].outerHTML);
			    myLocation.find("form").first().find("button").each(function(){
				if($(this).attr("data-mmaction"))
				    try{
					DBSetupCallBacks[$(this).attr("data-mmaction")](this);
				    }catch(e){
					console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
				    }	    
			    });
			}
		    }

		    console.log(myLocation.find("#database_add"));
		    console.log(myLocation.find("#add-wfs-dialog"));

		    var lmappings={
			"url": "link",
			"stype": "type",
			"browse": "link"
		    };
		    var vmappings={
			"postgis": "PostGIS",
			"mysql": "MySQL"
		    };
		    $("nav").find(".mmdatastore").each(function(){
			if($(this).attr("data-store-name")==dsid){
			    var closure=$(this);
			    var cattr=$(this).attr("name");
			    myLocation.find("form").first().find("input,select").each(function(){
				var cattr=$(this).attr("name");
				if(lmappings[cattr])
				    cattr=lmappings[cattr];
				var cvalue=closure.attr("data-store-"+cattr);
				if(vmappings[cvalue])
				    cvalue=vmappings[cvalue];
				if($(this).attr("type")!="radio"){
				    if(closure.attr("data-store-"+cattr)){
					$(this).val(cvalue);
				    }
				}
				else{
				    console.log($(this).attr("type"));
				    console.log($(this));
				    myLocation.find("form").first().find('input[name="'+$(this).attr("name")+'"]').each(function(){
					console.log($(this).val());
					console.log(cvalue);
					console.log($(this));
					if($(this).val()==cvalue)
					    $(this).prop("checked",true);
					else
					    $(this).prop("checked",false);
				    });
				}
			    });
			}
		    });
		    if(hasLocation)
			myLocation.collapse('show');
		}else{
		    myLocation.find("form").remove();
		    if(!myLocation.children().length)
			myLocation.collapse('hide');
		}
	    });
	},
	"refresh": function(data,param,dsid,dataType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		doCleanup(data,param,dsid,dataType,obj);
	    });
	},
	"mozaic": function(data,param,dsid,dataType,obj){
	    var ldata=data;
	    $(obj).off("click");
	    $(obj).click(function(e){
		if($("#DS_"+dsid).find(".panel-body").first().find("#mozaic-form").length){
		    $("#DS_"+dsid).find(".panel-body").first().find("#mozaic-form").remove();
		    return;
		}
		console.log(selectedDatasourceTypes["DS_"+dsid]);
		for(var i=0;i<selectedDatasourceTypes["DS_"+dsid].length;i++)
		    if(selectedDatasourceTypes["DS_"+dsid][i]!="raster"){
			$("#DS_"+dsid).find(".panel-body").first().prepend($("#dataStore_mozaic_error_template")[0].innerHTML);
			return;
		    }
		console.log("launch mozaic module");
		console.log(dsid);
		console.log(selectedDatasource);
		console.log(selectedDatasourceTypes);
		$("#DS_"+dsid).find(".panel-body").first().prepend($("#dataStore_mozaic_template")[0].innerHTML);
		$("#mozaic-submit").click(function(){
		    $("#DS_"+dsid).find(".panel-body").first().find("#mozaic-form").find(".fa-spin").removeClass('hide');
		    var params=[
			{
			    "identifier": "dst",
			    "value": dsid,
			    "dataType": "string"
			},
			{
			    "identifier": "iname",
			    "value": $("#mozaic-form").find('input[name="mozaic_name"]').val(),
			    "dataType": "string"
			},
		    ];
		    for(var i=0;i<selectedDatasource["DS_"+dsid].length;i++){
			params.push({
			    "identifier": "dso",
			    "value": selectedDatasource["DS_"+dsid][i],
			    "dataType": "string"
			});
		    }		    
		    zoo.execute({
			identifier: "raster-tools.Gdal_Merge",
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
			    $("#DS_"+dsid).find(".panel-body").first().find("#mozaic-form").remove();
			    $("#DS_"+dsid).find(".panel-body").first().find("#mozaic-form").find(".fa-spin").addClass('hide');
			    doCleanup(ldata,param,dsid,dataType,obj);
			    //loadDatastore(param,dsid,dataType);
			    //console.log(data);
			},
			error: function(data){
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });		    
		});
		return;
	    });
	},
	"upload": function(data,param,dsid,dataType,obj){
	    var ldata=data;
	    $(obj).off("click");
	    $(obj).click(function(e){
		if($("#DS_"+dsid).find(".panel-body").first().find("#uploader-form").length){
		    $("#DS_"+dsid).find(".panel-body").first().find("#uploader-form").remove();
		    return false;
		}
		var reg=new RegExp("\\[datastore\\]","g");
		$("#DS_"+dsid).find(".panel-body").first().prepend($("#uploader_form_template")[0].innerHTML.replace(reg,dsid));

		$("#input-"+dsid).fileinput({
		    language: module.config().lang,
		    uploadUrl: module.config().url+"?service=WPS&version=1.0.0&request=Execute&RawDataOutput=Result&Identifier=upload.saveOnServer0&dataInputs=file=upload;dest="+dsid, // server upload action
		    uploadAsync: true,
		    maxFileCount: 5
		});
		$('#input-'+dsid).on('filebatchuploadcomplete', function(event, files, extra) {
		    console.log('File batch upload complete'); 
		    zoo.execute({
			identifier: "upload.checkFile",
			type: "POST",
			dataInputs: [
			    {
				"identifier": "dest",
				"value": dsid,
				"dataType": "string"
			    }
			],
			dataOutputs: [
			    {"identifier":"Result","type":"raw"},
			],
			success: function(data){
			    console.log("SUCCESS");
			    console.log(data);
			    console.log($("#DS_"+dsid).find(".file-input"));
			    var accepted="";
			    var refused="";
			    var lreg=[
				new RegExp("\\[accepted\\]","g"),
				new RegExp("\\[refused\\]","g"),
				new RegExp("\\[content\\]","g"),
				new RegExp("\\[filename\\]","g"),
			    ];
			    for(i in data.accepted)
				accepted+=$("#uploader_result_row_template")[0].innerHTML.replace(lreg[3],data.accepted[i]);
			    console.log(accepted);
			    for(i in data.refused)
				refused+=$("#uploader_result_row_template")[0].innerHTML.replace(lreg[3],data.refused[i]);
			    console.log(refused);
			    var acceptedl=$("#uploader_result_list_template")[0].innerHTML.replace(lreg[2],accepted);
			    var refusedl=$("#uploader_result_list_template")[0].innerHTML.replace(lreg[2],refused);
			    var acceptedl1=(data.accepted.length>0?$("#uploader_resulta_template")[0].innerHTML.replace(lreg[0],acceptedl):"");
			    var refusedl1=(data.refused.length>0?$("#uploader_resultr_template")[0].innerHTML.replace(lreg[1],refusedl):"");
			    var tmpl=$("#uploader_result_template")[0].innerHTML.replace(lreg[0],acceptedl1).replace(lreg[1],refusedl1);
			    $("#DS_"+dsid).find(".file-input").first().html(tmpl);
			},
			error: function(data){
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });
		});

	    });
	},
	"tileindex": function(data,param,dsid,dataType,obj){
	    var ldata=data;
	    $(obj).off("click");
	    $(obj).click(function(e){
		if($("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").length){
		    $("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").remove();
		    return;
		}
		console.log(selectedDatasourceTypes["DS_"+dsid]);
		console.log("launch mozaic module");
		console.log(dsid);
		console.log(selectedDatasource);
		console.log(selectedDatasourceTypes);
		$("#DS_"+dsid).find(".panel-body").first().prepend($("#dataStore_tileindex_template")[0].innerHTML);
		console.log($("#add-directory").find(".form-group").last());
		$("#tileindex-form").find(".row").last().html($("#add-directory").find(".form-group").last()[0].outerHTML);
		$("#tileindex-submit").click(function(){
		    $("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").find(".fa-spin").removeClass('hide');
		    if($("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").find("#tileindex_type").val()=="raster"){
			var params=[
			    {
				"identifier": "idir",
				"value": dsid,
				"dataType": "string"
			    },
			    {
				"identifier": "dir",
				"value": $("#tileindex-form").find('input[name="browse"]:checked').val()+"/",
				"dataType": "string"
			    },
			    {
				"identifier": "iname",
				"value": $("#tileindex-form").find('input[name="tileindex_name"]').val(),
				"dataType": "string"
			    },
			    {
				"identifier": "ext",
				"value": $("#tileindex-form").find('input[name="filenameExt"]').val(),
				"dataType": "string"
			    },
			    {
				"identifier": "srs",
				"value": $("#tileindex-form").find('input#tileindextprj').val(),
				"dataType": "string"
			    },
			];
			zoo.execute({
			    identifier: "raster-tools.createTindex",
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
				$("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").remove();
				$("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").find(".fa-spin").addClass('hide');
				doCleanup(ldata,param,dsid,dataType,obj);
				//loadDatastore(param,dsid,dataType);
				//console.log(data);
			    },
			    error: function(data){
				$(".notifications").notify({
				    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				    type: 'danger',
				}).show();
			    }
			});
		    }else{
			var params=[
			    {
				"identifier": "idir",
				"value": dsid,
				"dataType": "string"
			    },
			    			    {
				"identifier": "path",
				"value": $("#tileindex-form").find('input[name="browse"]:checked').val()+"/",
				"dataType": "string"
			    },
			    {
				"identifier": "OutputName",
				"value": $("#tileindex-form").find('input[name="tileindex_name"]').val(),
				"dataType": "string"
			    },
			    {
				"identifier": "ext",
				"value": $("#tileindex-form").find('input[name="filenameExt"]').val(),
				"dataType": "string"
			    },
			    {
				"identifier": "srs",
				"value": $("#tileindex-form").find('input#tileindextprj').val(),
				"dataType": "string"
			    },
			];
			zoo.execute({
			    identifier: "vector-tools.createTindex",
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
				$("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").remove();
				$("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").find(".fa-spin").addClass('hide');
				doCleanup(ldata,param,dsid,dataType,obj);
				//loadDatastore(param,dsid,dataType);
				//console.log(data);
			    },
			    error: function(data){
				$(".notifications").notify({
				    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				    type: 'danger',
				}).show();
				$("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").remove();
				$("#DS_"+dsid).find(".panel-body").first().find("#tileindex-form").find(".fa-spin").addClass('hide');
			    }
			});
		    }
		});
		return;
	    });
	},
    };

    var selectedDatasource={};
    var selectedDatasourceTypes={};
    var DSSetupCallBacks={
	"select": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");
		e.preventDefault();
		if(!Datastores["DS_"+dsid+"_"+ldatasource])
		    Datastores["DS_"+dsid+"_"+ldatasource]=(geometryType=="raster"?"raster":"vector");
		else{
		    if(Datastores["DS_"+dsid+"_"+ldatasource]!=geometryType && 
		       (Datastores["DS_"+dsid+"_"+ldatasource]=="raster"
			|| geometryType=="raster"))
			Datastores["DS_"+dsid+"_"+ldatasource]="mixed";
		    else
			Datastores["DS_"+dsid+"_"+ldatasource]="vector";
		}
		var panelRoot=$("#DS_"+dsid+"_"+ldatasource).children().children();
		var panelRoot1=panelRoot.parent().parent().parent().parent();
		if($(obj).children().first().hasClass('fa-square-o')){
		    $(obj).children().first().removeClass("fa-square-o").addClass("fa-check-square-o");
		    panelRoot.removeClass("panel-default").addClass("panel-success");
		    if(!selectedDatasource["DS_"+dsid]){
			selectedDatasource["DS_"+dsid]=[];
			selectedDatasourceTypes["DS_"+dsid]=[];
		    }
		    selectedDatasource["DS_"+dsid].push(datasource);
		    selectedDatasourceTypes["DS_"+dsid].push(geometryType);
		}
		else{
		    $(obj).children().first().removeClass("fa-square-check-o").addClass("fa-square-o");
		    panelRoot.removeClass("panel-success").addClass("panel-default");
		    panelRoot1.removeClass("panel-success").addClass("panel-default");
		    selectedDatasource["DS_"+dsid].pop(selectedDatasource["DS_"+dsid].indexOf(datasource));
		    selectedDatasourceTypes["DS_"+dsid].pop(selectedDatasourceTypes["DS_"+dsid].indexOf(datasource));
		}
		if(panelRoot1.children().find(".panel").length==panelRoot1.find(".panel-success").length){
		    panelRoot1.removeClass("panel-default").addClass("panel-success");
		    panelRoot1.find(".panel-heading").first().find(".btn-group").find("button,a").first().find('i').removeClass("fa-minus-square-o").addClass("fa-check-square-o ");
		}
		else{
		    if(panelRoot1.find(".panel-success").length){
			panelRoot1.find(".panel-heading").first().find(".btn-group").find("button,a").first().find('i').removeClass("fa-square-o").addClass("fa-minus-square-o ");
			panelRoot1.find(".panel-heading").first().find(".btn-group").last().find(".require-select").removeClass("hide");
		    }
		    else{
			panelRoot1.find(".panel-heading").first().find(".btn-group").find("button,a").first().find('i').removeClass("fa-minus-square-o").addClass("fa-square-o ");
			panelRoot1.find(".panel-heading").first().find(".btn-group").last().find(".require-select").addClass("hide");
		    }
		}

	    });
	},
	"privileges": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		bindPrivileges(dsid+"_"+datasource.replace(/\./g,"_").replace(/:/g,"_"),"datasourcePrivileges",param,geometryType,datasource);
	    });
	},
	"preview": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");
		if($(obj).is("a")){
		    e.preventDefault();
		    e.stopPropagation();
		}
		if(!DSPreviews["DS_"+dsid+"_"+ldatasource]){
		    var tmpPopover=$(obj).popover({
			html: true,
			placement: ($(obj).is("a")?'bottom':'left'),
			trigger: 'click',
			container: 'body',
			viewport: { "selector": "#DS_"+dsid+"_"+ldatasource, "padding": 0 },
			content: function(){console.log("temp"); return '<i class="fa fa-spinner fa-spin"></i>';}
		    });
		    $(obj).popover('toggle');
		    zoo.execute({
			identifier: "template.display",
			type: "POST",
			dataInputs: [
			    {"identifier": "tmpl","value":"Distiller/previewLink","dataType":"string"},
			    {"identifier": "dst","value":param,"dataType":"string"},
			    {"identifier": "dso","value":datasource,"dataType":"string"}
			],
			dataOutputs: [
			    {"identifier":"Result","type":"raw"},
			],
			success: function(data){
			    DSPreviews["DS_"+dsid+"_"+ldatasource]=data;
			    $(obj).popover('destroy');
			    $(obj).popover({
				html: true,
				placement: ($(obj).is("a")?'bottom':'left'),
				trigger: 'click',
				container: 'body',
				viewport: { "selector": "#DS_"+dsid+"_"+ldatasource, "padding": 0 },
				content: function(){return '<div><img style="width:500px" class="img-responsive" src="'+ DSPreviews["DS_"+dsid+"_"+ldatasource] + '" /></div>';}
			    });
			    $(obj).popover('hide');
			    $(obj).popover('show');
			    if(!$(obj).is("a"))
				$(window).on("click",function(){
				    if(arguments[0].target!=obj){
					$(obj).popover('hide');
				    }
				});
			},
			error: function(data){
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });

		}
	    });
	},
	"process": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		e.preventDefault();
		console.log(geometryType);
		var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");

		var initial=!$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().find('#vectorProcessing').length;

		if(initial){
		    $("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().html("");
		    $("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().append(
			$("#dataSource_"+(geometryType=="raster"?geometryType:"vector")+"_Process_template")[0].innerHTML
		    );
		    if(geometryType!="raster"){
			$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().find("input#dst_in").val(param);
			$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().find("input#dso_in,input#dso_in1").val(datasource);
			$("#DS_"+dsid+"_"+ldatasource)
			    .find(".panel-body")
			    .first()
			    .find("input#out_name")
			    .val("new_"+datasource);
			$("#DS_"+dsid+"_"+ldatasource)
			    .find(".panel-body")
			    .first()
			    .find("textarea#sql")
			    .val("SELECT * FROM "+datasource);
			$("#DS_"+dsid+"_"+ldatasource)
			    .find(".panel-body")
			    .first()
			    .find("button")
			    .last()
			    .click(function(e){
				runConversion($(this));
				return false;
			    });
		    }else{
			console.log(data);
			var bands=data.datasource.Band;
			if(!bands.length)
			    bands=[data.datasource.Band];
			for(var i=0;i<bands.length;i++)
			    $("#DS_"+dsid+"_"+ldatasource)
			    .find(".panel-body")
			    .first()
			    .find("select#ofband").append(
				'<option value="'+(i+1)+'">Band '+(i+1)+'</option>'
			    );
			window.setTimeout(function(){
			    $("#DS_"+dsid+"_"+ldatasource).find('[data-toggle="tooltip"]').tooltip({container: 'body'});
			},50);

			$("#DS_"+dsid+"_"+ldatasource).find(".raster_p").hide();
			$("#DS_"+dsid+"_"+ldatasource).find(".raster_azimuth").hide();
			$("#DS_"+dsid+"_"+ldatasource).find("#ofname").val(param+datasource+"."+raster_extensions[data.datasource.dataType]);
			$("#DS_"+dsid+"_"+ldatasource).find("#ofdst").val(param);
			$("#DS_"+dsid+"_"+ldatasource)
			    .find(".panel-body")
			    .first()
			    .find("button")
			    .last()
			    .click(function(e){
				runRaster($(this));
				return false;
			    });
		    }
		}
		    
		if(!initial)
		    $("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().collapse('toggle');
		else
		    $("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().collapse('show');
	    });
	},
	"toggle": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		e.preventDefault();
		var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");
		var initial=$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().hasClass("in");
		if( $(obj).children().first().hasClass("fa-toggle-down") && initial){
		    initial=!initial;
		}else
		    $("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().collapse('toggle');
		if(initial)
		    $(obj).children().first().removeClass("fa-toggle-up").addClass("fa-toggle-down");
		else{
		    $(obj).children().first().removeClass("fa-toggle-down").addClass("fa-toggle-up");
		    if(geometryType=="raster")
			displayRaster(data,param,dsid,datasource);
		    else
			displayVector(data,param,dsid,datasource);
		}
		
	    });
	},
	"georeference": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		zoo.execute({
		    identifier: "georeferencer.saveGeoreferencedProject",
		    type: "POST",
		    dataInputs: [
			{
			    "identifier": "dst",
			    "value": param,
			    "dataType": "string"
			},
			{
			    "identifier": "dso",
			    "value": datasource,
			    "dataType": "string"
			},
			{
			    "identifier": "size",
			    "value": data.datasource.size,
			    "dataType": "string"
			},
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    success: function(data){
			console.log("SUCCESS");
			$(".notifications").notify({
			    message: { text: data },
			    type: 'success',
			}).show();
			document.location="./Georeferencer_bs";
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
	},
	"open": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		zoo.execute({
		    identifier: "mapfile.openInManager",
		    type: "POST",
		    dataInputs: [
			{"identifier": "dstn","value":param,"dataType":"string"},
			{"identifier": "dson","value":datasource,"dataType":"string"}
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
			document.location="./Manager_bs";
		    },
		    error: function(data){
			console.log("ERROR");
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			    type: 'danger',
			}).show();
		    }
		});

		console.log(data,param,dsid,datasource,geometryType,obj);
	    });
	},
	"download": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		zoo.execute({
		    identifier: "vector-converter.doZip",
		    type: "POST",
		    dataInputs: [
			{"identifier": "dst","value":param,"dataType":"string"},
			{"identifier": "dso","value":datasource,"dataType":"string"},
			{"identifier": "dstn","value":datasource+"_dl.zip","dataType":"string"},
		    ],
		    dataOutputs: [
			{"identifier":"Result","type":"raw"},
		    ],
		    success: function(data){
			window.open(data,"_blank");
		    },
		    error: function(data){
			$(".notifications").notify({
			    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			    type: 'danger',
			}).show();
		    }
		});

		console.log(data,param,dsid,datasource,geometryType,obj);
	    });
	},
	"delete": function(data,param,dsid,datasource,geometryType,obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		var myRootLocation=$(obj);
		for(var i=0;i<5;i++)
		    myRootLocation=myRootLocation.parent();
		myRootLocation.removeClass("panel-default").addClass("panel-danger");
		$('#removeModal').modal("show");
		$("#removeModal").find(".modal-footer").find("button").first().click(function(){
		    myRootLocation.removeClass("panel-danger").addClass("panel-default");
		});
		$("#removeModal").find(".modal-footer").find("button").last().attr("data-store",param);
		$("#removeModal").find(".modal-footer").find("button").last().attr("data-source",datasource);
	    });
	}
    }

    function doOnLoadDataSource(param,dsid,datasource,geometryType,ldata,originType,data){
        var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");
	$("#DS_"+dsid+"_"+ldatasource).find(".panel").first().removeClass("panel-warning").addClass("panel-default");
	$("#DS_"+dsid+"_"+ldatasource).find(".panel-body").first().html("").collapse();
	$("#DS_"+dsid+"_"+ldatasource).find(".panel-heading").first().find("button,a").each(function(){
	    if($(this).attr("data-mmaction"))
		try{
		    DSSetupCallBacks[$(this).attr("data-mmaction")](data,param,dsid,datasource,geometryType,this,ldata);
		}catch(e){
		    console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
		}
	});
	window.setTimeout(function(){
	    $("#DS_"+dsid+"_"+ldatasource).find('[data-toggle="tooltip"]').tooltip({container: 'body'});
	},50);
	if(data!=null){
	    var font="";
	    if(data.datasource.geometry.indexOf("Polygon")>=0)
		font="mm mm-polygon";
	    else{
		if(data.datasource.geometry.indexOf("Line String")>=0)
		    font="mm mm-line";
		else{
		    font="mm mm-point";
		}
	    }
	    $("#DS_"+dsid+"_"+ldatasource).find('.fa-question').removeClass("fa fa-question").addClass(font);
	}
    }
    
    function loadDataSource(param,dsid,datasource,geometryType,ldata,originType){
	console.log(originType);
	var ldatasource=datasource.replace(/\./g,"_").replace(/:/g,"_");
	zoo.execute({
	    identifier: "vector-tools.mmExtractVectorInfo",
	    type: "POST",
	    dataInputs: [
		{"identifier": "dataSource","value":(originType[0]=="W"?originType+":":"")+param,"dataType":"string"},
		{"identifier": "layer","value":datasource,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		if(data.datasource.size && !data.datasource.origin){
		    $("#DS_"+dsid+"_"+ldatasource).find(".panel-heading").first().find("button,a").each(function(){
			if($(this).attr("data-mmaction")=="georeference"){
			    $(this).removeClass("hide");
			    $("#DS_"+dsid+"_"+ldatasource).find(".panel-heading").first().find("button,a").each(function(){
				if($(this).attr("data-mmaction")=="open")
				    $(this).addClass("hide");
			    });
			}
		    });
		}
		doOnLoadDataSource(param,dsid,datasource,geometryType,ldata,originType,data);
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

    function loadDatastore(param,localDSId,localDataType){
	zoo.execute({
	    identifier: "datastores.mmVectorInfo2MapJs",
	    type: "POST",
	    dataInputs: [{"identifier": "dataStore","value":(localDataType[0]=="W"?localDataType+":":"")+param,"dataType":"string"}],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		if(data.datasource==""){
		    $("#DS_"+localDSId).find(".panel").first().removeClass("panel-warning").addClass("panel-danger");
		    $("#DS_"+localDSId).find(".panel-body").html($("#dataStoreEmpty_template")[0].innerHTML);
		    $(".notifications").notify({
			message: { html: $("#dataStoreEmpty_template")[0].innerHTML },
			type: 'danger',
		    }).show();
		}else{
		    $("#DS_"+localDSId).find(".panel").first().removeClass("panel-warning").addClass("panel-default");
		    if(!data.datasource.layer || !data.datasource.layer.length)
			data.datasource.layer=[data.datasource.layer];
		    $("#DS_"+localDSId).find(".panel-body").first().html("");
		    var reg0=new RegExp("\\[datastore\\]","g");
		    var reg1=new RegExp("\\[nb\\]","g");
		    $(".notifications").notify({
			message: { html: $("#dataStoreLoaded_template")[0].innerHTML.replace(reg0,localDSId).replace(reg1,data.datasource.layer.length) },
			type: 'success',
		    }).show();
		    
		    for(i in data.datasource.layer){
			var reg=new RegExp("\\[datasource\\]","g");
			var reg1=new RegExp("\\[font\\]","g");
			if(data.datasource.layer[i].geometry=="raster"){
			    font="fa fa-image";
			}
			else{
			    font="fa fa-question";
			}
			console.log("FONT !! "+font);
			console.log(data.datasource.layer[i].name.replace(/\./g,"_").replace(/\:/g,"_"));
			$("#DS_"+localDSId).find(".panel-body").first().append($($("#dataSource_template")[0].innerHTML.replace(reg1,font).replace(reg,(localDataType=="WMS"?data.datasource.layer[i].label:data.datasource.layer[i].name))).attr("id","DS_"+localDSId+"_"+data.datasource.layer[i].name.replace(/\./g,"_").replace(/:/g,"_")));
			console.log(localDataType);
			if(localDataType!="WMS")
			    loadDataSource(param,localDSId,data.datasource.layer[i].name,data.datasource.layer[i].geometry,data,localDataType);
			else{
			    doOnLoadDataSource(param,localDSId,data.datasource.layer[i].name,data.datasource.layer[i].geometry,data,localDataType,null);
			}
		    }
		}
		$("#DS_"+localDSId).find(".panel-heading").first().find("button,a").each(function(){
		    if($(this).attr("data-mmaction"))
			try{
			    DSTSetupCallBacks[$(this).attr("data-mmaction")](data,param,localDSId,localDataType,$(this));
			}catch(e){
			    console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
			}
			if($(this).attr("data-toggle")=="tooltip")
			  $(this).tooltip({container: 'body'});
		    });
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

    var initialize=function(){
	var closure=this;
	$('#side-menu').metisMenu({ toggle: false });

	$('#side-menu').css({"max-height": ($(window).height()-50)+"px","overflow":"scroll"});

	adminBasic.initialize(zoo);

	$(".mmdatastore").click(function(e){
	    var localDSId=$(this).text();
	    var localDataType=$(this).attr('data-store-type');
	    if(!$('#DS_'+$(this).text()).length){
		var reg=new RegExp("\\[datastore\\]","g");
		var reg1=new RegExp("\\[font\\]","g");
		var font="server";
		var tests=["fa-database","fa-folder","fa-server"];
		var isFolder=false;
		var isDb=false;
		for(var i in tests)
		    if($(this).find("i").first().hasClass(tests[i])){
			font=tests[i];
			if(tests[i]=="fa-folder")
			    isFolder=true;
			if(tests[i]=="fa-database")
			    isDb=true;
		    }
		$($("#dataStore_template")[0].innerHTML.replace(reg1,font).replace(reg,$(this).text())).attr("id","DS_"+$(this).text()).appendTo("#distDetails");
		if(isDb)
		   $("#DS_"+$(this).text()).find(".require-db").parent().show();
		else
		   $("#DS_"+$(this).text()).find(".require-db").parent().hide();
		if(!$("#distDetails").hasClass("active")){
		    $("#distOverviewAction").removeClass("active");
		    $("#distOverviewAction").parent().removeClass("active");
		    $("#distOverview").removeClass("active");
		    $("#distDetails").addClass("active");
		    //$(this).tab("show");
		}
		var param=$(this).text();
		if(isFolder)
		    param=module.config().dataPath+"/dirs/"+$(this).text()+"/";
		loadDatastore(param,localDSId,localDataType);
		console.log(module.config().dataPath);
		console.log(param);
	    }
	    else{
		$("#distOverviewAction").removeClass("active");
		$("#distOverviewAction").parent().removeClass("active");
		if(!$("#distDetails").hasClass("active")){
		    $("#distOverview").removeClass("active");
		    $("#distDetails").addClass("active");
		    //$(this).tab("show");
		}
	    }
		
	});

	$("#removeModal").find(".modal-footer").find("button").last().click(function(e){
	    deleteDatasource($(this));
	});
	$("#removeDSModal").find(".modal-footer").find("button").last().click(function(e){
	    deleteDatastore($(this));
	});

	$("#add-directory").find("button").each(function(){
	    $(this).click(function(){
		addDir();
		return false;
	    });
	});

	$("#database_add").find("button").each(function(){
	    if($(this).attr("data-mmaction"))
		try{
		    DBSetupCallBacks[$(this).attr("data-mmaction")](this);
		}catch(e){
		    console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
		}	    
	});
	$("#add-wfs-dialog").find("button").each(function(){
	    if($(this).attr("data-mmaction"))
		try{
		    OWSSetupCallBacks[$(this).attr("data-mmaction")](this);
		}catch(e){
		    console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
		}	    
	});


	console.log("Start Distiller");

    };

    // Return public methods
    return {
        initialize: initialize,
	datepicker: datepicker
    };



});

