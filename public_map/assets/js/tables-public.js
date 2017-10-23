// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic',"datepicker","fileinput","fileinput_local","managerTools","ol"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,datepicker,fileinput,fileinput_local,managerTools,ol) {
    

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

    var embedded=[];
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

    var importerUploadedFiles=[];
    var mainTableSelectedId=null;
    var mainTableFilter=[];
    var mainTableFiles={};
    var embeddedTableFilter=[];
    var embeddedTableFiles=[];
    var embeddedTableSelectedId=[];
    var tableDisplayed={};

    function displayTable(lid,ltype,tfields,rfields,tfilters){
	console.log("START DISPLAY TABLE");
	var cnt=0;
	var CRowSelected=[];
	var CFeaturesSelected=[];
	var CFeatures=[];
	//var rfields=mainTableRFields.join(",");
	console.log(lid);
	var myRootElement=$('#'+lid).parent().find(".btn-group").first().parent();

	tableDisplayed[lid]=$('#'+lid).DataTable( {
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
	    responsive: true,
	    deferRender: true,
	    crollCollapse:    true,
	    rowId: 'fid',
	    "sAjaxSource": "users",
	    select: false,
	    "lengthMenu": [[5, 10, 25, 50, 1000], [5, 10, 25, 50, "All"]],
	    aoColumns: tfields,
	    /*"aoColumns": [
		{ "sWidth": "10%", "target": 0 }, // 1st column width 
		{ "sWidth": "90%", "target": 1 }
	    ],*/
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
		    identifier: "np.clientViewTable",
		    dataInputs: [
			{"identifier":"table","value":ltype,"dataType":"string"},
			{"identifier":"offset","value":llimit[0],"dataType":"int"},
			{"identifier":"limit","value":llimit[1],"dataType":"int"},
			{"identifier":"page","value":page,"dataType":"int"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"sortname","value":(closestproperties.split(",")[llimit[2]]),"dataType":"string"},
			{"identifier":"filters","value":JSON.stringify(tfilters, null, ' '),"mimeType":"application/json"}
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
		    

		    $('[data-toggle="tooltip"]').tooltip({container: 'body'});
		    $('.inner_displayer').off('click');
		    $('.inner_displayer').on('click',function(){
			var closure=$(this);
			console.log($(this).parent().next());
			if($(this).is(':checked')){
			    $(this).parent().next().show();
			}else {
			    $(this).parent().next().hide();
			};
		    });

		    console.log('finish');
		    

		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});

	$('#'+lid+' tbody').off('click');
	$('#'+lid+' tbody').on('click', 'tr', function () {
	    console.log($(this));
	    var prefix=lid.replace(/mainListing_display/g,"");
	    console.log(prefix);
	    console.log(lid);
	    var row = $('#'+lid).DataTable().row($(this));
	    console.log(row);
	    console.log("ID: "+$(this).find("input[name=id]").val());

	    var test=$(this).hasClass("selected");
	    $('#'+lid+' tbody tr').each(function(){
		$(this).removeClass("selected");
		$('#'+lid).DataTable().row($(this)).deselect();
		CRowSelected.pop();
	    });
	    if(!test){
		if(lid=="mainListing_display")
		    mainTableSelectedId=$(this).find("input[name=id]").val();
		else{
		    embeddedTableSelectedId.push({name:lid,value:$(this).find("input[name=id]").val()});
		}
		CRowSelected.push(  lid+"_"+$(this).find("input[name=id]").val() );
		$(this).addClass("selected");
		$('#'+lid).DataTable().row($(this)).select();
		if(prefix.indexOf("input_")<0 && prefix.indexOf('embedded')<0)
		    $(".toActivate").each(function(){
			$(this).children().first().click();
			console.log($(this));
		    });

		var params=[
		    {"identifier":"tableId","value":$("input[name="+prefix+"mainTableId]").val(),"dataType": "integer"},
		    {"identifier":"id","value":$(this).find("input[name=id]").val(),"dataType": "integer"}
		];
		var cid=$(this).find("input[name=id]").val();

		if($("#associatedMap").length){
		    var lcnt=0;
		    $(this).find("td").each(function(){
			if(lcnt==1)
			    setMapSearch($(this).text());
			lcnt++;
		    });
		}
		    
		if(prefix.indexOf("input_")<0)
		adminBasic.callService("np.clientView",params,function(data){
		    for(i in data){
			console.log(i);
			console.log(data[i]);
			var myRoot=$("#"+prefix+"edit0_"+i);
			myRoot.find("input[name=edit_tuple_id]").val(cid);
			console.log(myRoot);
			for(j in data[i]){
			    console.log(data[i][j]);
			    if(data[i][j]){
			    if(/*data[i][j] && */!data[i][j].type){
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").val(data[i][j]).change();
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").each(function(){
				    if($(this).hasClass("htmlEditor")){
					$(this).code(data[i][j]);
				    }
				    console.log($(this));
				    if($(this).attr("type")=="checkbox"){
					console.log($(this));
					$(this).prop("checked",(data[i][j]==true?true:false));
				    }
				});
				if(data[i][j].indexOf && data[i][j].indexOf("POINT(")>=0){
				    var coordinates=data[i][j].replace(/POINT\(/,"").replace(/\)/,"").split(" ");
				    myRoot.find("input[name=edit_"+j+"_x]").val(coordinates[0]).change();
				    myRoot.find("input[name=edit_"+j+"_y]").val(coordinates[1]).change();
				    //console.log(pStr);
				}
			    }else{
				myRoot.find("input[name=edit_"+j+"]").each(function(){
				    var closure=$(this);
				    $(this).fileinput('destroy');
				    var cname=data[i][j]["filename"].split('/');
				    var display=data[i][j]["fileurl"];
				    var regs=[RegExp("tif","g"),RegExp("gif","g"),RegExp("png","g"),RegExp("jpg","g"),RegExp("jpeg","g")];
				    var isImage=false;
				    for(var l=0;l<regs.length;l++){
					if(data[i][j]["fileurl"]!=data[i][j]["fileurl"].replace(regs[l],"")){
					    isImage=true;
					    break;
					}
				    }
				    isRecognizedFileType=false;
				    var recognizedFileTypes=[
					[RegExp("pdf","g"),"fa-file-pdf-o"],
					[RegExp("doc","g"),"fa-file-word-o"],
					[RegExp("xls","g"),"fa-file-excel-o"],
					[RegExp("ppt","g"),"fa-file-powerpoint-o"],
					[RegExp("dbf","g"),"fa-table"],
					[RegExp("csv","g"),"fa-table"],
					[RegExp("zip","g"),"fa-file-zip-o"],
					["default","fa-external-link"]
				    ];
				    var iClass=recognizedFileTypes[recognizedFileTypes.length-1][1];
				    for(var l=0;l<recognizedFileTypes.length;l++){
					if(data[i][j]["fileurl"]!=data[i][j]["fileurl"].replace(recognizedFileTypes[l][0],"")){
					    isRecognizedFileType=true;
					    iClass=recognizedFileTypes[l][1];
					    break;
					}
				    }
				    $(this).fileinput({
					initialPreview: [
					    '<a href="'+data[i][j]["fileurl"]+'" target="_blank">'+(isImage?'<img src="'+data[i][j]["fileurl"]+'" style="height:160px" />':'<i class="fa '+iClass+'" aria-hidden="true" style="font-size: 10em;"></i>')+'</a>'
					],
					initialPreviewAsData: true,
					initialPreviewConfig: [
					    {caption: cname[cname.length-1], width: "120px"}
					],
					overwriteInitial: true,
					language: module.config().lang,
					uploadUrl: module.config().url+"?service=WPS&version=1.0.0&request=Execute&RawDataOutput=Result&Identifier=upload.saveOnServer0&dataInputs=filename="+closure.attr("name")+";"+closure.attr("name")+"=Reference@isFile=true;dest=none", 
					uploadAsync: true,
					maxFileCount: 1,
				    });
				    $(this).on('fileuploaded', function(event, data, previewId, index) {
					var form = data.form, files = data.files, extra = data.extra,
					    response = data.response, reader = data.reader;
					console.log('File uploaded triggered');
					mainTableFiles[closure.attr("name")]=data.response.files[0].fileName;
					console.log(data);
					console.log(data.response.files[0].fileName);
				    });
				    
				});
			    }
			    }else{
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").val(data[i][j]).change();
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").each(function(){
				    if($(this).hasClass("htmlEditor")){
					$(this).code(data[i][j]);
				    }
				    console.log($(this).attr("type"));
				    if($(this).attr("type")=="checkbox"){
					console.log($(this));
					$(this).prop("checked",(data[i][j]==true?true:false));
				    }
				});

			    }
			}
		    }
		    try{
			if(prefix==""){
			    console.log("____ loadEmbeddedTables ____");
			    loadEmbeddedTables(function(i){
				console.log("____ EmbeddedTables load "+embeddeds[i].id);
				//$("embedded_"+i+"_mainListing_display").dataTable().fnDraw();
				//$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
				console.log("____ EmbeddedTables loaded"+i);
				displayTable(embeddeds[i].id+"mainListing_display",$("input[name="+embeddeds[i].id+"mainTableViewId]").val(),embeddeds[i].mainTableFields,embeddeds[i].mainTableRFields.join(","),embeddedTableFilter[i]);
				$(".require-"+embeddeds[i].id+"select").hide();
			    });
			    console.log("____ loadEmbeddedTables");
			}
		    }catch(e){
			console.log(e);
			console.log("---- No embedded tables");
		    }
		    $(".notifications").notify({
			message: { text: "Tuple loaded." },
			type: 'success',
		    }).show();

		},function(data){
		    myRoot.append(data["ExceptionReport"]["Exception"]["ExceptionText"].toString());
		    $(".notifications").notify({
			message: { text: data },
			type: 'success',
		    }).show();
		});
		else{
		    console.log("**** TRAITEMENT DES INPUT TABLES"+"****");
		    $("input[name="+prefix+"link_val]").val($(this).find("input[name=id]").val());
		}
		
		$(".require-"+prefix+"select").show();
	    }else{
		$(".require-"+prefix+"select").hide();
		mainTableSelectedId=null;
	    }
	    console.log(row);
	});

	$(".mmFile").each(function(){
	    var closure=$(this);
	    console.log(closure.parent());
	    var isInput=(!closure.parent().hasClass("importer_upload"));
	    //console.log("***** MMFILE : "+closure.parent().attr('id'));
	    //var isInput=(closure.parent().parent().attr('id')&&closure.parent().parent().attr('id').indexOf("importer")>=0?false:true);
	    console.log("***** MMFILE : "+isInput);
	    var lparams={
		language: module.config().lang,
		uploadUrl: module.config().url+"?service=WPS&version=1.0.0&request=Execute&RawDataOutput=Result&Identifier=upload.saveOnServer0&dataInputs=filename="+closure.attr("name")+";"+closure.attr("name")+"=Reference@isFile=true;dest=none", // server upload action
		uploadAsync: true,
		done: function (e, data) {
		    console.log(data);
                    $.each(data.result.files, function (index, file) {
                        $('<p/>').text(file.name).appendTo('#files');
                    });
                }
	    };
	    if(isInput)
		lparams["maxFileCount"]=1;
	    console.log(lparams);
	    $(this).fileinput(lparams);
	    $(this).on('fileuploaded', function(event, data, previewId, index) {
		var form = data.form, files = data.files, extra = data.extra,
		    response = data.response, reader = data.reader;
		console.log('File uploaded triggered');
		console.log("***** MMFILE : "+isInput);
		if(isInput)
		    mainTableFiles[closure.attr("name")]=data.response.files[0].fileName;
		else{
		    importerUploadedFiles.push(data.response.files[0].fileName);
		    $('.importer_submit').show();
		    console.log(data.response.files[0]);
		    $(".importer_submit_log").append(
			$(managerTools.generateFromTemplate($("#importer_progress").html(),["id","file"],[importerUploadedFiles.length-1,data.files[0].name]))
		    );
		}
		console.log(data);
		console.log(data.response.files[0].fileName);
	    });
	});

	$('.importer_submit').hide();

    }

    function bindImport(){
	$("[data-mmaction=runImport]").click(function(){
	    console.log("run importer");
	    var loparams=[
		{"identifier": "id","value": $(this).parent().find('input[name="import_id"]').val(),"dataType":"string"}
	    ];
	    
	    for(var i=0;i<importerUploadedFiles.length;i++){
		var lparams=loparams;
		lparams.push({"identifier": "dstName","value": importerUploadedFiles[i],"dataType":"string"});
		console.log(lparams);
		(function(i){
		    var progress=$("#progress-process-"+i);
		    var infomsg=$("#infoMessage"+i);
		    zoo.execute({
			identifier: "np.massiveImport",
			type: "POST",
			mode: "async",
			storeExecuteResponse: true,
			status: true,
			dataInputs: lparams,
			dataOutputs: [
			    {"identifier":"Result","mimeType":"text/plain"},
			],
			success: function(data, launched){
			    console.log(data);
			    console.log("****** +++++++ Execute asynchrone launched: "+launched.sid, 'info');
			    console.log("****** +++++++ Execute asynchrone launched: "+launched.sid, 'info');
			    zoo.watch(launched.sid, {
				onPercentCompleted: function(data) {
				    console.log("**** PercentCompleted **** "+i);
				    console.log(data);
				    progress.css('width', (data.percentCompleted)+'%');
				    progress.text(data.text+' : '+(data.percentCompleted)+'%');
				    progress.attr("aria-valuenow",data.percentCompleted);
				    infomsg.html(data.text+' : '+(data.percentCompleted)+'%');
				},
				onProcessSucceeded: function(data) {
				    console.log("**** ProcessSucceeded **** "+i);
				    console.log(data);
				    progress.css('width', (100)+'%');
				    progress.text(data.text+' : '+(100)+'%');
				    progress.removeClass("progress-bar-info").addClass("progress-bar-success");
				    progress.attr("aria-valuenow",100);
				    progress.parent().next().html(data.text+' : '+(100)+'%');
				},
				onError: function(data) {
				    console.log("**** onError **** "+i);
				    console.log(data);
				    infomsg.html('<div class="alert alert-danger"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+data.result.ExceptionReport.Exception.ExceptionText.toString()+'</div>');
				}
			    });
			},
			error: function(data){
			    console.log("**** error **** "+i);
			    console.log(data);
			}
		    });
		})(i);
	    }
	    
	});
					    
    }
    
    function bindSave(){
	$("[data-mmaction=runPrint]").click(function(){
	    var closure=$(this);
	    $(this).addClass("disabled");
	    console.log($(this).children().first().next());
	    $(this).children().first().next().show();
	    $(this).children().first().hide();
	    var tableId=null;
	    var tupleId=null;
	    if($(this).parent().parent().attr('id').indexOf('embedded')>=0){
		var closure=$(this);
		for(var i=0;i<2;i++)
		    closure=closure.parent();
		tmp=closure.attr('id').split('report')
		for(var i=0;i<embeddedTableSelectedId.length;i++){
		    if(embeddedTableSelectedId[i].name==tmp[0]+"mainListing_display"){
			tupleId=embeddedTableSelectedId[i].value;
			tableId=$("#"+tmp[0]+"listing").find('input[name='+tmp[0]+'mainTableId]').val();
			break;
		    }
		}

	    }else{
		tableId=$('#listing').first().find('input[name=mainTableId]').val();
		tupleId=mainTableSelectedId;
	    }
	    console.log($(this).parent().parent().attr('id'));
	    console.log(mainTableSelectedId);
	    console.log(embeddedTableSelectedId);
	    console.log($('#listing').first().find('input[name=mainTableId]').val());
	    params=[
		{identifier: "tableId", value: tableId, dataType: "string"},
		{identifier: "id", value: tupleId, dataType: "string"},
		{identifier: "rid", value: $(this).parent().find('input[name="edit_report_id"]').val(), dataType: "string"},
		{"identifier":"filters","value":JSON.stringify(mainTableFilter, null, ' '),"mimeType":"application/json"}
	    ];
	    
	    closure=$(this);
	    adminBasic.callService("np.clientPrint",params,function(data){
		console.log(data)
		closure.removeClass("disabled");
		closure.children().first().show();
		closure.children().first().next().hide();
		closure.parent().parent().find(".report_display").html('');
		var ul=$(managerTools.generateFromTemplate($("#"+closure.parent().parent().attr("id")+"_link_list").html(),[],[]));
		for(i=0;i<data.length;i++){
		    var format="odt";
		    var classe="fa-file-text-o";
		    if(data[i].indexOf("pdf")>0){
			format="pdf";
			classe="fa-file-pdf-o";
		    }
		    if(data[i].indexOf("doc")>0){
			format="doc";
			classe="fa-file-word-o";
		    }
		    if(data[i].indexOf("html")>0){
			format="html";
			classe="fa-code";
		    }
		    ul.find(".list-group").append(
			managerTools.generateFromTemplate($("#"+closure.parent().parent().attr("id")+"_link").html(),["link","format","class"],[data[i],format,classe])
		    );
		}
		closure.parent().parent().find(".report_display").html(ul);
	    },function(data){
		closure.removeClass("disabled");
		closure.children().first().show();
		closure.children().first().next().hide();
		closure.parent().parent().find(".report_display").html('<div class="alert alert-danger">'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
	    });
	});
	$("[data-mmaction=save]").click(function(){
	    console.log('* Run save function');
	    var myRoot=$(this).parent();
	    console.log(myRoot);
	    var myRoot1=$(this).parent().parent();
	    console.log(myRoot1);
	    params=[];
	    var tupleReal={};
	    myRoot.find("script").each(function(){
		if($(this).attr('id').indexOf('runFirst')>=0)
		    return;
		console.log($(this));
		try{
		    console.log("**********- "+(myRoot1.attr('id').indexOf('embedded')<0));
		    console.log("**********- "+(!$(this).parent().attr('id')));
		    console.log("**********- "+($(this).parent().attr('id').indexOf("mm_table_editor_form")<0));
		}catch(e){
		    console.log(e);
		}
		console.log($(this).parent().parent().parent());
		console.log($(this).parent().parent().parent().parent());

		if((myRoot1.attr('id') &&  myRoot1.attr('id').indexOf('input')>=0) || (myRoot1.attr('id') && myRoot1.attr('id').indexOf('embedded')<0 && (!myRoot.attr('id') || myRoot.attr('id').indexOf("mm_table_editor_form")<0)))
		    return;
		console.log($(this).attr("name"));
		console.log($(this).attr("id"));
		console.log($(this)[0].innerHTML);
		tupleReal[$(this).attr("id").replace(/edition_/,"")]=$(this)[0].innerHTML;
	    });
	    var tuple={};
	    myRoot.find("input,textarea,select").each(function(){
		try{
		    // ISSUE WITH upload
		    console.log($(this));
		    var noDisplay=false;
		    try{
			console.log("**********- "+myRoot1.attr('id'))
			noDisplay=(($(this).attr("id").replace(/edition_/,"")=="tuple_id") ||
				   ($(this).attr("id").replace(/edition_/,"")=="table_id") ||
				   ($(this).attr("id").replace(/edition_/,"")=="edition_id") );
			console.log($(this).attr("id").replace(/edition_/,""));
			console.log("**********- "+(myRoot1.attr('id').indexOf('embedded')<0));
			console.log("**********- "+($(this).parent().parent().parent().parent().attr('id').indexOf("embedded_")>=0));
			console.log("**********- "+($(this).parent().parent().parent().attr('id').indexOf("embedded_")>=0));
		    }catch(e){
			console.log(e);
		    }
		    if(noDisplay || (myRoot1.attr('id').indexOf('embedded')<0 && (
			($(this).parent().parent().parent().parent().attr('id') &&
			 $(this).parent().parent().parent().parent().attr('id').indexOf("embedded_")>=0)
			    ||
			    ($(this).parent().parent().parent().attr('id') && $(this).parent().parent().parent().attr('id').indexOf("embedded_")>=0)) ) )
			return;
		    console.log($(this).parent().parent().parent());
		    console.log($(this).parent().parent().parent().parent());
		    if(!mainTableFiles[$(this).attr("name")]){
			if($(this).attr("name").indexOf("link_col")<0){
			    if($(this).attr("type")=="checkbox"){
				tuple[$(this).attr("id").replace(/edition_/,"")]=$(this).prop("checked");
			    }
			    else
				tuple[$(this).attr("id").replace(/edition_/,"")]=$(this).val();
			}
			else{
			    tuple[$(this).val()]=$(this).next().val();
			    tupleReal={};
			}
		    }
		    else{
			tuple[$(this).attr("id").replace(/edition_/,"")]=mainTableFiles[$(this).attr("name")];
			mainTableFiles[$(this).attr("name")]=null;
		    }
		}catch(e){
		    console.log($(this));
		}
	    });
	    console.log(myRoot1.attr('id'));
	    var parts=myRoot1.attr('id').split("_");
	    if(parts[0]=="embedded"){
		var ei=-1;
		console.log(ei);
		console.log(embeddedTableFilter);
		console.log(embeddeds);
		var tmp=parts[0]+"_"+parts[1]+"_";
		var elem=null;
		for(var kk=0;kk<embeddeds.length;kk++){
		    if(embeddeds[kk].id==tmp){
			ei=kk;
			break;
		    }
		}
		if(ei>=0){
		    var obj=embeddedTableFilter[ei][0];
		    console.log(obj);
		    for(var key in obj)
			if(key!="linkClause")
			    tuple[key]=obj[key];
		}
	    }
	    myRoot1.find("#edition_table_id").last().each(function(){
		params.push({identifier: "tableId", value: $(this).val(), dataType: "string"});
	    });
	    myRoot1.find("#edition_edition_id").last().each(function(){
		params.push({identifier: "editId", value: $(this).val(), dataType: "string"});
	    });
	    myRoot1.find("#edition_tuple_id").last().each(function(){
		params.push({identifier: "id", value: $(this).val(), dataType: "string"});
	    });
	    params.push({identifier: "tuple", value: JSON.stringify(tuple, null, ' '), mimeType: "application/json"});
	    params.push({identifier: "tupleReal", value: JSON.stringify(tupleReal, null, ' '), mimeType: "application/json"});
	    console.log(params);
	    adminBasic.callService("np.clientInsert",params,function(data){
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		console.log("RELOAD UPDATED LIST");
		console.log(myRoot1.parent().parent().parent().prev());
		var lRoot=myRoot1.parent().parent().parent().prev();
		var tlRoot=lRoot.find('li').first().children().first();
		try{
		    tlRoot.attr("href").indexOf("embedded")
		}catch(e){
		    lRoot=myRoot1.parent().prev();
		    tlRoot=lRoot.find('li').first().children().first();
		}
		lRoot.find('li').first().children().first().click();
		console.log(lRoot.find('li').first().children().first().attr("href"));
		if(tlRoot.attr("href").indexOf("embedded")>=0){
		    var tid=tlRoot.attr("href").replace(/#/g,"").replace(/listing/g,"mainListing_display");
		    $(".require-"+tid.replace(/mainListing_display/g,"select")).hide();
		    tableDisplayed[tid].rows().every( function () {
			tableDisplayed["mainListing_display"].row(this).deselect();
		    });
		    tableDisplayed[tid].columns.adjust().draw();
		}
		else if(tlRoot.attr("href")=="#listing"){
		    /*tableDisplayed["mainListing_display"].rows().each(function(){
			$(this).deselect();
		    });*/
		    $(".require-select").hide();
		    //tableDisplayed["mainListing_display"].destroy();
		    //console.log("fnDraw");
		    //tableDisplayed["mainListing_display"].draw();
		    //alert('ok');
		    $("#mainListing_display").find('tr').each(function(){
			console.log($(this));
			if($(this).hasClass("selected"))
			    console.log($(this));
			$(this).removeClass("selected");
			//$(this).click();
		    });
		    tableDisplayed["mainListing_display"].rows().every( function () {
			console.log(this);
			console.log(tableDisplayed["mainListing_display"].row(this));
			tableDisplayed["mainListing_display"].row(this).deselect();
		    });
		    tableDisplayed["mainListing_display"].columns.adjust().draw();
		    tableDisplayed["mainListing_display"].rows().every( function () {
			console.log(this);
			console.log(tableDisplayed["mainListing_display"].row(this));
			tableDisplayed["mainListing_display"].row(this).deselect();
		    });
		    $("#mainListing_display").find('tr').each(function(){
			console.log($(this));
			$(this).removeClass("selected");
			//$(this).click();
		    });
		    //displayTable("mainListing_display",$("input[name=mainTableViewId]").val(),mainTableFields,mainTableRFields.join(","),mainTableFilter);
		}
		//console.log(lRoot.next().find('.active').first().find('.dataTables_wrapper').first().attrd('id'));
	    },function(data){
		myRoot.append('<div class="alert alert-danger"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
	    });
	    console.log('* Save function end');
	    return false;
	});
    }

    function bindDelete(){
	$("[data-mmaction=delete]").click(function(){
	    console.log('* Run save function');
	    var myRoot=$(this).parent();
	    params=[];
	    var tuple={};
	    /*myRoot.find("input,textarea,select").each(function(){
		console.log($(this).attr("name"));
		console.log($(this).attr("id"));
		console.log($(this).val());
		if(!$(this).attr("id"))
		    return;
		tuple[$(this).attr("id").replace(/edition_/,"")]=$(this).val();
	    });*/
	    var myRoot1=$(this).parent().parent();
	    myRoot1.find("#edition_table_id").each(function(){
		params.push({identifier: "tableId", value: $(this).val(), dataType: "string"});
	    });
	    myRoot1.find("#edition_tuple_id").each(function(){
		params.push({identifier: "tupleId", value: $(this).val(), dataType: "string"});
	    });
	    params.push({identifier: "tuple", value: JSON.stringify(tuple, null, ' '), mimeType: "application/json"});
	    console.log(params);
	    adminBasic.callService("np.clientDelete",params,function(data){
		console.log(data);
		var lRoot=myRoot1.parent().prev();
		console.log(lRoot);
		lRoot.find('li').first().children().first().click();
		console.log(lRoot.find('li').first().children().first().attr("href"));
		var tlRoot=lRoot.find('li').first().children().first();
		if(tlRoot.attr("href").indexOf("embedded")>=0){
		    var tid=tlRoot.attr("href").replace(/#/g,"").replace(/listing/g,"mainListing_display");
		    $(".require-"+tid.replace(/mainListing_display/g,"select")).hide();
		    tableDisplayed[tid].rows().every( function () {
			tableDisplayed["mainListing_display"].row(this).deselect();
		    });
		    tableDisplayed[tid].columns.adjust().draw();
		}
		else if(tlRoot.attr("href")=="#listing"){
		    $("#mainListing_display").find('tr').each(function(){
			console.log($(this));
			if($(this).hasClass("selected"))
			    console.log($(this));
			$(this).removeClass("selected");
			//$(this).click();
		    });
		    $(".require-select").hide();
		    tableDisplayed["mainListing_display"].rows().every( function () {
			console.log(this);
			console.log(tableDisplayed["mainListing_display"].row(this));
			tableDisplayed["mainListing_display"].row(this).deselect();
		    });
		    tableDisplayed["mainListing_display"].columns.adjust().draw();
		}
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
	    },function(data){
		myRoot.append('<div class="alert alert-danger"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
	    });
	    console.log('* Save function end');
	    return false;
	});
    }

    function bindSearch(){
	$("[data-mmaction=search]").click(function(){
	    console.log('* Run search function');
	    var myRoot=$(this).parent();
	    params=[];
	    var tuple={};
	    var lines="";
	    myRoot.find("input,textarea").each(function(){
		if(!$(this).is(":disabled") && $(this).attr("id")!="edition_uid"){
		    try{
			tuple[$(this).attr("id").replace(/edition_/,"")]=$(this).val();
			lines+=managerTools.generateFromTemplate($("#filter_line_template")[0].innerHTML,["line"],[$(this).parent().parent().prev().html()+" - "+$(this).val()]);
		    }catch(e){
			console.log($(this));
		    }
		}
	    });
	    var clause="";
	    myRoot.find("select").each(function(){
		if(!$(this).is(":disabled")){
		    try{
			tuple[$(this).attr("id").replace(/edition_/,"")]=$(this).val();
			if($(this).attr("id")!="edition_linkClause"){
			    lines+=managerTools.generateFromTemplate($("#filter_line_template")[0].innerHTML,["line"],[$(this).parent().parent().prev().html()+" - "+$(this).find("option:selected").text()]);
			}else
			    clause=$(this).val();
		    }catch(e){
			console.log($(this));
		    }
		}
	    });
	    console.log('************** '+clause+' **********************');
	    $("#listing").prepend(managerTools.generateFromTemplate($("#filter_complete_template")[0].innerHTML,["type","id","cid","body"],[(clause!="OR"?"info":"primary"),mainTableFilter.length,mainTableFilter.length+1,lines]));
	    mainTableFilter.push(tuple);
	    $("#listing").find(".close").each(function(){
		$(this).off('click');
		$(this).on('click',function(e){
		    console.log($(this).parent().parent());
		    var cid=parseInt($(this).parent().attr('id').replace(/filter_/,""));
		    mainTableFilter.splice(cid,1);
		    var lRoot=$(this).parent().parent();
		    $(this).parent().remove();
		    console.log(cid);
		    lRoot.find(".alert").each(function(){
			var lcid=parseInt($(this).attr('id').replace(/filter_/,""));
			console.log(lcid);
			if(lcid>cid){
			    $(this).attr('id',"filter_"+(lcid+(cid-lcid)));
			    var content=$(this).find("strong").html();
			    console.log(content);
			    var cReg=new RegExp(" "+(lcid+1),"g");
			    console.log(" "+((lcid+(cid-lcid))+1));
			    console.log(" "+(cid+1));
			    console.log(content.replace(cReg," "+((lcid+(cid-lcid))+1)));
			    $(this).find("strong").html(content.replace(cReg," "+((lcid+(cid-lcid))+1)));
			}
		    });
		    $("#mainListing_display").dataTable().fnDraw();
		    $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
		});
	    });
	    $("#mainListing_display").dataTable().fnDraw();
	    $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	    console.log('* Search function end');
	    return false;
	});
    }

    function loadEmbeddedTables(func){
	embeddedTableFilter=[];
	//var prefix="embedded_"+i;
	for(var i=0;i<embeddeds.length;i++){
	    var prefix=embeddeds[i].id;
	    console.log(prefix);
	    if(tableDisplayed[prefix+"mainListing_display"]){
		console.log(tableDisplayed[prefix+"mainListing_display"]);
		tableDisplayed[prefix+"mainListing_display"].destroy();
	    }
	    embeddedTableFilter.push([]);
	    var oRoot=$("#"+prefix+"mainListing_display");
	    console.log(oRoot);
	    for(var j=0;j<6;j++){
		oRoot=oRoot.parent();
		console.log(oRoot);
	    }
	    console.log(oRoot);
	    var lRoot=oRoot.find("input").last();
	    console.log(lRoot);
	    if(lRoot.length==0){
		console.log("************ "+oRoot.parent().parent().parent());
		lRoot=oRoot.parent().parent().parent().find("input").last();
	    }
	    lRoot.each(function(){
		console.log($(this));
		var lid=oRoot.find("input[name="+prefix+"link_col]").val();
		console.log(lid);
		var obj={"linkClause":" AND "};
		obj[lid]=$(this).val();
		embeddedTableFilter[i].push(obj);
	    });
	    console.log(lRoot);
	    console.log(embeddedTableFilter);
	    try{
		func(i);
	    }catch(e){
		console.log('-----!!!!! ERROR: '+e);
	    }
	}
	console.log(embeddedTableFilter);
    }

    var changingFields=[];
    var initialize=function(){
	var closure=this;
	$('#side-menu').metisMenu({ toggle: false });

	$('#side-menu').css({"max-height": ($(window).height()-50)+"px","overflow":"scroll"});

	adminBasic.initialize(zoo);
	$(".mmdatastore").click(function(e){
	    document.location=$(this).attr("href");
	    return false;
	});

	displayTable("mainListing_display",$("input[name=mainTableViewId]").val(),mainTableFields,mainTableRFields.join(","),mainTableFilter);

	$(".tab-pane").find("script").each(function(){
	    console.log($(this));
	    if($(this).attr('name'))
	    try{
		changingFields.push(JSON.parse("{\""+$(this).attr('name')+"\":"+$(this).html()+"}"));
		
		console.log(changingFields);
		var lname=$(this).attr('name');
		/*
		 * Create the options array containing initial values
		 */
		$(this).parent().find('select[name='+$(this).attr('name')+']').first().find('option').each(function(){
		    //console.log(changingFields[changingFields.length-1][lname])
		    for(var i in changingFields[changingFields.length-1][lname]){
			for(var j in changingFields[changingFields.length-1][lname][i]){
			    changingFields[changingFields.length-1][lname][i][j]["options"].push($(this).val());
			}
		    }
		});
		/*
		 * Load all the corresponding values
		 */
		for(var i=0;i<changingFields[changingFields.length-1][lname].length;i++){
		    changingFields[changingFields.length-1][lname][i]["myEditId"]=$(this).parent().parent().attr('id').replace(/edit_/g,"").replace(/edit0_/g,"");
		    var closure=$(this);
		    for(var j in changingFields[changingFields.length-1][lname][i])
			if(j!="myEditId"){
			    console.log(lname);
			    
			    (function(closure,ref){
				zoo.execute({
				    "identifier": "template.display",
				    "type": "POST",
				    dataInputs: [
					{"identifier":"tmpl","value":"public/modules/tables/fetchDependencies_js","dataType":"string"},
					{"identifier":"elements","value":JSON.stringify(changingFields[changingFields.length-1]),"mimeType":"applicaiton/json"}
				    ],
				    dataOutputs: [
					{"identifier":"Result","type":"raw"},
				    ],
				    success: function(data){
					closure.parent().find('select[name='+closure.attr('name')+']').first().off('change');
					(function(data){
					    closure.parent().find('select[name='+closure.attr('name')+']').first().change(function(){
						/*console.log(ref)
						console.log($(this).val());
						console.log(data)
						console.log(data[$(this).val()])
						console.log($(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]"));*/
						$(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").html("");
						if(data[$(this).val()]['value'].length>0)
						    for(var j=0;j<data[$(this).val()]['value'].length;j++)
							$(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").append('<option value="'+data[$(this).val()]['value'][j][0]+'">'+data[$(this).val()]['value'][j][1]+'</option>');
						else
						    $(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").append('<option value="NULL">'+module.config().localizationStrings.tables.none+'</option>');
						$(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").change();
					    });
					    closure.parent().find('select[name='+closure.attr('name')+']').first().change();
					})(data);
					console.log("SUCCESS");
				    },
				    error: function(data){
					console.log("ERROR");
					console.log(data);
				    }
				});
			    })(closure,j);
			}
		}
		//console.log($(this).attr('name'));
	    }catch(e){
		console.log(e);
	    }
	});
	console.log(embedded);

	try{
	    for(var i=0;i<embeddeds.length;i++){
		$(".require-"+embeddeds[i].id+"_select").hide();
	    }
	}catch(e){
	    console.log("----- DEBUG :"+e);
	}
	try{
	    console.log("+++++++ "+iembeddeds);
	    for(var i=0;i<iembeddeds.length;i++){
		$(".require-"+iembeddeds[i]["id"]+"select").hide();
		console.log("+++++++ "+iembeddeds[i]["id"]+"mainListing_display");
		displayTable(iembeddeds[i]["id"]+"mainListing_display",$("input[name="+iembeddeds[i]["id"]+"mainTableViewId]").val(),iembeddeds[i].mainTableFields,iembeddeds[i].mainTableRFields.join(","),[]);
	    }
	}catch(e){
	    console.log("----- DEBUG :"+e);
	}
	try{
	    loadEmbeddedTables(function(i){
		displayTable("embedded_"+i+"_mainListing_display",$("input[name=embedded_"+i+"_mainTableViewId]").val(),embeddeds[i].mainTableFields,embeddeds[i].mainTableRFields.join(","),embeddedTableFilter[i]);
	    });
	}catch(e){
	    console.log("No embedded tables");
	}
	$(".require-select").hide();
	$("#listing_Toggler").click();
	bindSave();
	bindSearch();
	bindDelete();
	$("textarea.htmlEditor").each(function(){
	    var closure=$(this);
	    window.setTimeout(function () { 
		closure.summernote();
	    },500);
	});
	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
	    try{
		$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	    }catch(e){console.log(e)};
	} );

	bindImport();
	
	console.log("Start Table Public Module");

	$("#associatedMap").css({"min-height": ($(window).height()-280)+"px"});
	setTimeout(function(){
	    initializeMap();
	}, 100);
	//$( "#associatedMap" ).contents().find( "a" ).css( "background-color", "#BADA55" );


	//$("#associatedMap").load(function(){
	//alert("OK LOADED");
	//});
    };

    function initializeMap(){
	setTimeout(function(){
	    $("#map_Toggler").click();
	    setTimeout(function(){
		$("#associatedMap").contents().find("body").find( ".ol-zoom-extent" ).find("button").click();
		$("#listing_Toggler").click();
	    },100);
	},100);
	
    }

    var searchMap;
    function setMapSearch(){
	$("#associatedMap").contents().find( "#search_value").val(arguments[0]);
	$("#associatedMap").contents().find( "#search_value").typeahead('val',arguments[0],false);
	var win=$("#associatedMap")[0].contentWindow || $("#associatedMap")[0];
	var searchResults=win.app.getSearchValues();
	searchMap=win.app.getMap();

	var extent=searchResults[1][searchResults[0].indexOf(arguments[0])];
	console.log(extent);

	searchMap.getView().fit(extent,searchMap.getSize());

	var myGeom=ol.geom.Polygon.fromExtent(extent);
	var feature = new ol.Feature({
	    geometry: myGeom,
	    name: arguments[0]
	});
	win.app.addASelectedFeature([feature]);
	win.app.externalCallbacks["addLayer"]=function(a){
	    console.log("**--** OK **--**");
	    console.log(a);
	    console.log("**--** OK **--**");
	    for(var i=0;i<a.layers.length;i++)
		$("#addedLayers").append('<option data-map="'+a.mapfile+'" value="'+a.layers[i]+'">'+a.labels[i]+'</option>');
	    $("#addedLayers").off('change');
	    $("#addedLayers").on('change',function(){
		
		managerTools.getTableDesc(module.config().msUrl,$(this).find('option:selected').attr("data-map"),$(this).val(),null,function(obj,rdata,idata){
		    $("#layerExtract").find('select[name="field"]').html("");
		    for(var i=0;i<rdata.fields.length;i++)
			if(rdata.fields[i]!="msGeometry"){
			    $("#layerExtract").find('select[name="field"]').append('<option  data-type="'+rdata.types[i]+'" value="'+rdata.fields[i]+'">'+rdata.fields[i]+'</option>');
			}
		    $("#layerExtract").find('select[name="values"]').html("");
		    bindFilterLayer();
		    console.log(obj);
		    console.log(rdata);
		    console.log(idata);
		});
		$("#layerExtract").find('button').first().off('click');
		$("#layerExtract").find('button').first().on('click',function(){
		    console.log(" START FILTERING ");
		    var clauses=[];
		    var joins=[];
		    $(this).parent().parent().find("form").each(function(){
			clauses.push('<ogc:'+$(this).find('select[name="operator"]').val()+($(this).find('select[name="operator"]').val()=="PropertyIsLike"?" wildcard='*' singleChar='.' escape='!'":"")+'>'+
				     '<ogc:PropertyName>'+$(this).find('select[name="field"]').val()+'</ogc:PropertyName>'+
				     '<ogc:Literal>'+$(this).find('select[name="values"]').val()+'</ogc:Literal>'+
				     '</ogc:'+$(this).find('select[name="operator"]').val()+'>');
			if($(this).find('select[name="link_clause"]').is(":visible")){
			    joins.push($(this).find('select[name="link_clause"]').val());
			}
		    });
		    var filter="<ogc:Filter>";
		    if(joins.length>0){
			var previous="";
			var current=clauses[0];
			for(var i=0;i<joins.length;i++){
			    previous=current;
			    current='<ogc:'+joins[i]+'>'+
				previous+clauses[i+1]+
				'</ogc:'+joins[i]+'>';
			}
			filter+=current;
		    }
		    else
			filter+=clauses[0];
		    filter+="</ogc:Filter>";
		    var wfsUrl=module.config().msUrl+'?map='+module.config().dataPath+"/maps/search_Overlays_"+$("#addedLayers").val()+".map";
		    console.log($("#addedLayers").find("option:selected").attr("data-map"));
		    if($("#addedLayers").find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0)
			wfsUrl=module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map");
		    var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0" maxFeatures="1000" outputFormat="text/xml; subtype=gml/3.1.1">'+
			'<wfs:Query xmlns:ms="http://geolabs.fr/" typeName="'+$("#addedLayers").val()+'">'+
			filter+
			'</wfs:Query>'+
			'</wfs:GetFeature>';
		    zoo.execute({
			"identifier": "vector-tools.Append",
			"type": "POST",
			dataInputs: [
			    {"identifier":"InputEntity1","href": wfsUrl,"value": wfsRequest, "mimeType": "text/xml", "method": "POST","headers":[{"key":"Content-Type","value":"text/xml"}]}
			],
			dataOutputs: [
			    {"identifier":"Result","mimeType":"image/png"}
			],
			success: function(data){
			    console.log("SUCCESS !");
			    var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
			    var mapParts=ref.split('&');
			    console.log(mapParts[0]);
			    var mapParts=mapParts[0].split("=");
			    console.log(mapParts[1]);
			    win.app.addLayerToMap({
				mapfile: mapParts[1],
				layers: ["Result"],
				labels: [$("#layerTitle").val()],
				listHTML: $("#layerTitle").val(),
				cselection: ""
			    });
			    $("#layerExtract").find('form:gt(0)').remove();
			    $("#layerTitle").val("");
			    console.log(data);
			    console.log(mapParts);
			},
			error: function(data){
			    console.log("ERROR !");
			    console.log(data);
			}
		    });
		    
		    console.log(wfsUrl);
		    console.log(wfsRequest);
		    
		});
	    });
	}
	$('button[mm-action="processLayer"]').off('click');
	$('button[mm-action="processLayer"]').on('click',function(){
	    console.log("Run service !");
	    var params=[];
	    $(this).parent().find("div").each(function(){
		if($(this).is(":visible")){
		    $(this).find('input[type="text"]').each(function(){
			if($(this).is(":visible") || $(this).attr("data-transmission")=="force")
			    params.push({
				"identifier": $(this).attr("name"),
				"value": $(this).val(),
				"dataType": $(this).attr("data-type")
			    });
		    });
		    $(this).find('select[name="InputEntity2"]').each(function(){
			if($(this).is(":visible") || $(this).attr("data-transmission")=="force"){
			    var wfsUrl=module.config().msUrl+'?map='+module.config().dataPath+"/maps/search_Overlays_"+$(this).val()+".map";
			    console.log($(this).find("option:selected").attr("data-map"));
			    if($(this).find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0)
				wfsUrl=module.config().msUrl+'?map='+$(this).find("option:selected").attr("data-map");
			    var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0" maxFeatures="1000" outputFormat="text/xml; subtype=gml/3.1.1">'+
				'<wfs:Query xmlns:ms="http://geolabs.fr/" typeName="'+$(this).val()+'">'+
				'</wfs:Query>'+
				'</wfs:GetFeature>';
			    
			    params.push({
				"identifier": $(this).attr("name"),
				"href": wfsUrl,
				"value": wfsRequest,
				"mimeType":  "text/xml",
				"method": "POST",
				"headers": [{"key":"Content-Type","value":"text/xml"}]
			    });
			}
		    });
		    
		}
	    });
	    console.log(params);
	    var wfsUrl=module.config().msUrl+'?map='+module.config().dataPath+"/maps/search_Overlays_"+$("#addedLayers").val()+".map";
	    console.log($("#addedLayers").find("option:selected").attr("data-map"));
	    if($("#addedLayers").find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0)
		wfsUrl=module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map");
	    var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0" maxFeatures="1000" outputFormat="text/xml; subtype=gml/3.1.1">'+
		'<wfs:Query xmlns:ms="http://geolabs.fr/" typeName="'+$("#addedLayers").val()+'">'+
		'</wfs:Query>'+
		'</wfs:GetFeature>';
	    var param1="InputPolygon";
	    $("#processing").find('input[name="param1"]').each(function(){
		console.log($(this).parent());
		if($(this).parent().is(":visible")){
		    param1=$(this).val();
		    return ;
		}
	    });
	    params.push({"identifier":param1,"href": wfsUrl,"value": wfsRequest, "mimeType": "text/xml", "method": "POST","headers":[{"key":"Content-Type","value":"text/xml"}]});
	    zoo.execute({
		"identifier": "vector-tools."+$('select[name="processing_service"]').val()+"Py",
		"type": "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","mimeType":"image/png"}
		],
		success: function(data){
		    console.log("SUCCESS !");
		    var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
		    var mapParts=ref.split('&');
		    console.log(mapParts[0]);
		    var mapParts=mapParts[0].split("=");
		    console.log(mapParts[1]);
		    win.app.addLayerToMap({
			mapfile: mapParts[1],
			layers: ["Result"],
			labels: [$("#layerTitle").val()],
			listHTML: $("#layerTitle").val(),
			cselection: ""
		    });
		    $("#layerExtract").find('form:gt(0)').remove();
		    $("#layerTitle").val("");
		    console.log(data);
		    console.log(mapParts);
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		}
	    });
	    
	});
	$('button[mm-action="createGrid"]').off('click');
	$('button[mm-action="createGrid"]').on('click',function(){
	    zoo.execute({
		"identifier": "vector-tools.createGrid",
		"type": "POST",
		dataInputs: [
		    {"identifier":"id","value": mainTableSelectedId,"dataType":"string"},
		    {"identifier":"extent","value": extent[0]+","+extent[1]+","+extent[2]+","+extent[3], "dataType": "string"}
		],
		dataOutputs: [
		    {"identifier":"Result","mimeType":"text/plain"}
		],
		success: function(data){
		    console.log("SUCCESS !");
		    console.log(data);
		    var lmap=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Data"]["ComplexData"].toString();
		    console.log(lmap);
		    win.app.addALayer({map: lmap, layer: "currentGrid"});
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		}
	    });
	});
    }

    function bindFilterLayer(){
	$("#layerExtract").find('select[name="field"]').off('change');
	$("#layerExtract").find('select[name="field"]').on('change',function(){
	    var localContext=$(this);
	    zoo.execute({
		"identifier": "mapfile.getMapLayersInfo",
		"type": "POST",
		dataInputs: [
		    {"identifier":"map","value": ($("#addedLayers").find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0?$("#addedLayers").find("option:selected").attr("data-map"):module.config().dataPath+"/maps/project_Overlays.map"),"dataType":"string"},
		    {"identifier":"layer","value": $("#addedLayers").val(), "dataType": "string"},
		    {"identifier":"fullPath","value": "true","type":"string"}
		],
		dataOutputs: [
		    {"identifier":"Result","mimeType":"text/plain","type":"raw"}
		],
		success: function(data){
		    console.log("SUCCESS !");
		    console.log(data.replace(/None/,"NULL"));
		    var jsonObj=eval(data.replace(/None/,"null"));
		    //alert(data[1]);
		    console.log(jsonObj);
		    localContext.parent().next().next().find("select").last().html("");
		    zoo.execute({
			"identifier": "vector-tools.vectInfo",
			"type": "POST",
			dataInputs: [
			    {"identifier":"dstName","value": jsonObj[0],"dataType":"string"},
			    {"identifier":"dsoName","value": "","dataType":"string"},
			    {"identifier":"dialect","value": "sqlite","dataType":"string"},
			    {"identifier":"q","value": "SELECT DISTINCT "+localContext.val()+" as value FROM "+jsonObj[1]+" ORDER BY "+localContext.val(), "dataType": "string"}
			],
			dataOutputs: [
			    {"identifier":"Result","mimeType":"application/json",type:"raw"}
			],
			success: function(data){
			    console.log("SUCCESS !");
			    console.log(data);
			    for(i in data)
				localContext.parent().next().next().find("select").last().append('<option value="'+data[i].value+'">'+data[i].value+'</option>');
			    //var lmap=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Data"]["ComplexData"].toString();
			    //console.log(lmap);
			    //win.app.addALayer({map: lmap, layer: "currentGrid"});
			},
			error: function(data){
			    console.log("ERROR !");
			    console.log(data);
			}
		    });
		    //var lmap=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Data"]["ComplexData"].toString();
		    //console.log(lmap);
		    //win.app.addALayer({map: lmap, layer: "currentGrid"});
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		}
	    });
	    
	    /**/
	    
	});
    }

    
    // Return public methods
    return {
        initialize: initialize,
	datepicker: datepicker,
	embedded: embedded,
	initializeMap: initializeMap,
	bindFilterLayer: bindFilterLayer
    };



});

