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

    var llevels=["first","second","third","forth"];
    var llevelInit=false;
    var reg0=new RegExp("documents_","");
    var reloadElement=true;


    function loadElements(table,init){
	zoo.execute({
	    identifier: "np.list",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": table,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		if(!reloadElement)
		    return;
		if(init){
		    if($("#listElements").find("#document_"+localId).length){
			console.log($("#listElements").find("#document_"+localId).hasClass("selected"));
			if(!$("#listElements").find("#document_"+localId).hasClass("selected"))
			    $("#listElements").find("#document_"+localId).click();
			else{
			    for(var i=0;i<2;i++)
				$("#listElements").find("#document_"+localId).click();
			}
		    }else{
			loadAnElement(localId);
		    }
		}
		else
		    for(var i=0;i<data.length;i++){
			if(data[i]["selected"]){
			    if($("#listElements").find("#document_"+data[i]["id"]).length){
				$("#listElements").find("#document_"+data[i]["id"]).click();
			    }else{
				loadAnElement(data[i]["id"]);
			    }
			    break;
			}
		    }
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function fileUrlSelection(data){
	$("input#file").val("");
	if(data["url"]==null){
	    $("input[name=doct]").first().prop("checked",true);
	    $("input[name=doct]").first().click();
	    $("#documents_file_link").attr("href",module.config().publicationUrl+"/documents/"+data["file"]);
	    $("#documents_file_link").html(data["file"]);
	}
	else{
	    $("input[name=doct]").last().prop("checked",true);
	    $("input[name=doct]").last().click();
	    $("#documents_file_link").attr("href","");
	    $("#documents_file_link").html("");
	}
    }

    function fillForm(data){
	$(".project-title").html(data["name"]);
	var myRootLocation=$(".theForm");
	var reg=new RegExp("documents_","");

	myRootLocation.find("textarea").each(function(){
	    if(!$(this).attr("id"))
		return;
	    if($(this).attr("id").replace(reg,"")=="description"){
		$(this).code(data[$(this).attr("id").replace(reg,"")]);
	    }
	    else
		$(this).val(data[$(this).attr("id").replace(reg,"")]).change();
	});

	myRootLocation.find("input[type=text],select").each(function(){
	    if(!$(this).attr("id"))
		return;
	    if($(this).attr("type")=="text"){
		if($(this).attr("id").replace(/color/g,"")!=$(this).attr("id")){
		    if(data[$(this).attr("id").replace(reg,"")])
			$(this).val("#"+data[$(this).attr("id").replace(reg,"")]).change();
		    else
			$(this).val("#000").change();
		}
		else
		    $(this).val(data[$(this).attr("id").replace(reg,"")])
	    }else{
		$(this).find('option').prop('selected', false);
		if($.isArray(data[$(this).attr("id").replace(reg,"")])){
		    var obj=data[$(this).attr("id").replace(reg,"")];
		    var oid=$(this).attr("id").replace(reg,"");
		    if(obj.length==0)
			$(this).find('option[value="-1"]').prop("selected",true);
		    for(var i=0;i<obj.length;i++){
			$(this).find('option[value="'+obj[i]+'"]').prop("selected",true);
		    }
		}else{
		    $(this).val((data[$(this).attr("id").replace(reg,"")]!=null?data[$(this).attr("id").replace(reg,"")]:-1));
		    
		}
	    }
	});
    }

    function loadAnElement(id){
	localId=id;
	//console.log("loadATheme -> "+id);
	$(".fa-spin").removeClass("hide");
	zoo.execute({
	    identifier: "np.details",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "documents","dataType":"string"},
		{"identifier": "id","value": id,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		fileUrlSelection(data);
		$(".fa-spin").addClass("hide");
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function createJsonFromForm(form){
	var params={};
	form.find('textarea').each(function(){
	    if(!$(this).attr("id"))
		return;
	    var cid=$(this).attr('id').replace(reg0,"");
	    if(cid=="description")
		params[cid]=$(this).code();
	    else
		params[cid]=$(this).val();
	});
	form.find('input[type="text"]').each(function(){
	    if(!$(this).attr("id"))
		return;
	    if($(this).attr("id").replace(/color/g,"")!=$(this).attr("id"))
		params[$(this).attr('id').replace(reg0,"")]=$(this).val().replace(/#/,"");
	    else
		params[$(this).attr('id').replace(reg0,"")]=$(this).val();
	});
	form.find('select').each(function(){
	    if(!$(this).attr("id"))
		return;
	    if($(this).find("option:selected").length>1){
		params[$(this).attr('id').replace(reg0,"")]=[];
		var oid=$(this).attr('id').replace(reg0,"");
		$(this).find("option:selected").each(function(){
		    params[oid].push($(this).val());
		});
	    }else
		params[$(this).attr('id').replace(reg0,"")]=$(this).val();
	});
	return params;
    }

    function bindSave(){
	$(".theForm").find("button").click(function(){
	    $('#documents_filename').val($('#file').val());$('#fileUpload').submit();
	});
    }

    var lid="listElements";
    function saveAnElement(){
	var id=localId;
	$(".fa-spin").removeClass("hide");
	var obj=createJsonFromForm($(".theForm"));
	obj["id"]=id;
	localId=id;
	obj["filename"]=$('input#file').val();
	localInit=true;
	zoo.execute({
	    identifier: "np.updateElement",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "documents","dataType":"string"},
		{"identifier": "documents_groups_in", value: "d_id",dataType: "string"},
		{"identifier": "documents_groups_out", value: "g_id",dataType: "string"},
		{"identifier": "documents_themes_in", value: "d_id",dataType: "string"},
		{"identifier": "documents_themes_out", value: "t_id",dataType: "string"},
		{"identifier": "tuple","value": JSON.stringify(obj, null, ' '),"mimeType":"application/json"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		$(".fa-spin").addClass("hide");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		reloadElement=true;
		$("#"+lid).dataTable().fnDraw();
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function addAnElement(){
	$(".fa-spin").removeClass("hide");
	zoo.execute({
	    identifier: "np.insertElement",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "documents","dataType":"string"},
		{"identifier": "name","value": $("#adder").find('input[name="dname"]').val(),"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		$(".fa-spin").addClass("hide");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		localInit=false;
		reloadElement=true;
		$("#"+lid).dataTable().fnDraw();
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function deleteAnElement(id){
	$(".fa-spin").removeClass("hide");
	zoo.execute({
	    identifier: "np.deleteElement",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "documents","dataType":"string"},
		{"identifier": "atable","value": "documents_themes","dataType":"string"},
		{"identifier": "akey","value": "d_id","dataType":"string"},
		{"identifier": "atable","value": "documents_groups","dataType":"string"},
		{"identifier": "akey","value": "d_id","dataType":"string"},
		{"identifier": "id","value": id,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$(".fa-spin").addClass("hide");
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		localInit=false;
		reloadElement=true;
		$("#"+lid).dataTable().fnDraw();
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    var localInit=false;
    var localItem=-1;

    function startDataTable(rfields,fields){
	var cnt=0;
	var CRowSelected=[];
	var CFeaturesSelected=[];
	var CFeatures=[];
	var lid="listElements";

	$('#listElements').DataTable( {
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
	    ordering: "id",
	    rowId: 'fid',
	    "sAjaxSource": "users",
	    select: {
		info: false,
	    },
	    "lengthMenu": [[5, 10, 25, 50, 1000], [5, 10, 25, 50, "All"]],
	    columns: fields,
	    "rowCallback": function( row, data ) {
		$(row).removeClass('selected');
		if ( $.inArray(data.DT_RowId, CRowSelected) !== -1 ) {
		    $('#'+lid).DataTable().row($(row)).select();
		}else{
		    $('#'+lid).DataTable().row($(row)).deselect();
		}
	    },
	    "fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
		var llimit=[];
		for(j in {"iDisplayStart":0,"iDisplayLength":0,"iSortCol_0":0,"sSortDir_0":0,"sSearch":0})
		    for(i in aoData)
			if(aoData[i].name==j){
			    if(llimit.length==4 && aoData[i].value!="")
				llimit.push(aoData[i].value);
			    if(llimit.length<4)
				llimit.push(aoData[i].value);
			}
		
		var closestproperties=rfields;
		var page=llimit[0]+1;
		if(page!=1){
		    page=(llimit[0]/llimit[1])+1;
		}
		
		var opts=zoo.getRequest({
		    identifier: "datastores.postgis.getTableContent",
		    dataInputs: [
			{"identifier":"dataStore","value":module.config().db,"dataType":"string"},
			{"identifier":"table","value":"mm.documents","dataType":"string"},
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
		
		opts["success"]=function(rdata) {
		    features=rdata;
		    featureCount=rdata["total"];
		    var data=[];
		    CFeatures=[];
		    for(var i in features.rows){
			var lparams={
			    "fid": "document_"+features.rows[i].id			    
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
		    fnCallback(opts);

		    for(d in data){
			if ( $.inArray(data[d].fid+"", CRowSelected) !== -1 ) {
			    $('#'+lid).DataTable().row($("#"+data[d].fid)).select();
			}else{
			    $('#'+lid).DataTable().row($("#"+data[d].fid)).deselect();
			}
		    }

		    
		    if(featureCount==0){
			$('#'+lid+'Table').DataTable().clear();
		    }
		    
		    var existing=$('#'+lid+'_info').children('span.select-info');
		    if(existing.length)
			existing.remove();
		    var lreg=new RegExp("\\[dd\\]","g");
		    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
			$('<span class="select-item"/>').append((CRowSelected.length>1?module.config().localizationStrings.dataTables.selection:module.config().localizationStrings.dataTables.selection0).replace(lreg,CRowSelected.length).replace(lreg,CRowSelected.length))
		    ));
		    
		    loadElements("documents",localInit);

		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});

	var ltype="document";
	//var myRootElement=$('#'+lid).parent().find(".btn-group").first().parent();
	$('#'+lid+' tbody').on('click', 'tr', function () {
	    if(!this.id)
		return;
	    var id = this.id+"";
	    var reg0=new RegExp(ltype+'s_',"g");
	    var index = $.inArray(id, CRowSelected);
	    if ( index == -1 ) {
		if(CRowSelected.length>0){
		    $('#'+lid).DataTable().row($("#"+CRowSelected[0])).deselect();
		    CRowSelected.pop(CRowSelected[0]);
		    CFeaturesSelected.pop(CFeaturesSelected[0]);
		}
		/*if(CFeaturesSelected.length==0)
		    myRootElement.find(".require-select").removeClass("disabled");*/
		    
		CRowSelected.push( id );

		$('#'+lid).DataTable().row("#"+id).select();

		for(var i=0;i<CFeatures.length;i++){
		    if(CFeatures[i]["fid"]==id)
		       CFeaturesSelected.push( CFeatures[i] );
		}

		reg=new RegExp(ltype+"_","g");
		localId=id.replace(reg,"");
		reloadElement=false;
		loadAnElement(localId);

	    } else {
		$("."+lid+"BaseEditForm").removeClass("in");
		CRowSelected.pop(index);
		CFeaturesSelected.pop(index);
		$('#'+lid).DataTable().row("#"+id).deselect();
	    }
	    var existing=$('#'+lid+'_info').children('span.select-info');
	    if(existing.length)
		existing.remove();
	    var lreg=[
		new RegExp("\\[dd\\]","g"),
		new RegExp("\\[ee\\]","g")
	    ];
	    var currentLoc=(CFeaturesSelected.length!=CRowSelected.length?(CRowSelected.length>1?module.config().localizationStrings.dataTables.selectionm:module.config().localizationStrings.dataTables.selectionm0):(CRowSelected.length>1?module.config().localizationStrings.dataTables.selection:module.config().localizationStrings.dataTables.selection0));
	    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
		$('<span class="select-item"/>').append(currentLoc.replace(lreg[0],CRowSelected.length).replace(lreg[1],CFeaturesSelected.length))
	    ));
	});
    }

    var initialize=function(){
	
	adminBasic.initialize(zoo);
	window.setTimeout(function () { 
	    $("textarea#documents_description").summernote();
	},10);

	$('[data-toggle="tooltip"]').tooltip({container: 'body'});
	startDataTable("id,name",[
	    {
		"data": "id",
		"name": "id",
		"width": "10%"
	    },
	    {
		"data": "name",
		"name": "name",
		"width": "80%"
	    },
	]);
	bindSave();

	$("#adder").find("button").click(function(){
	    addAnElement();
	    $("#adder").removeClass("in");
	});
	$("#deleter").find("button").click(function(){
	    deleteAnElement(localId);
	    $("#deleter").removeClass("in");
	});

	console.log("Start Documents");

    };

    // Return public methods
    return {
        initialize: initialize,
	saveAnElement: saveAnElement
    };



});

