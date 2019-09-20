// Filename: tables-public.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic',"datepicker","fileinput","fileinput_local","managerTools","ol","highcharts"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,datepicker,fileinput,fileinput_local,managerTools,ol,Highcharts) {
    

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
    var wm;
    var mynotify = $('.top-right');
    var myMapIframe;
    
    function displayTable(lid,ltype,tfields,rfields,tfilters,rorder){
	console.log("START DISPLAY TABLE");
	var cnt=0;
	var CRowSelected=[];
	var CFeaturesSelected=[];
	var CFeatures=[];
	//var rfields=mainTableRFields.join(",");
	console.log(lid);
	var myRootElement=$('#'+lid).parent().find(".btn-group").first().parent();

	var orderInit=[];
	try{
	    orderInit=$('input[name="'+lid.replace(/Listing_display/,"")+'TableOrder"]').val().split(' ');
	    if(orderInit[0].indexOf("::")>=0)
		orderInit[0]=orderInit[0].split("::")[0];
	    orderInit[0]=rfields.split(',').indexOf(orderInit[0]);
	}catch(e){
	}
	
	tableDisplayed[lid]=$('#'+lid).DataTable( {
	    language: {
                url: module.config().translationUrl
            },
	    retrieve: true,
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
	    responsive: false,
	    deferRender: true,
	    crollCollapse:    true,
	    rowId: 'fid',
	    "sAjaxSource": "users",
	    select: false,
	    "order": [orderInit],
	    //order: [orderInit],
	    //order: [(rorder?rorder:[1,"asc"])],
	    "lengthMenu": [[5, 10, 25, 50, 1000], [5, 10, 25, 50, "All"]],
	    aoColumns: tfields,
	    /*"aoColumns": [
		{ "sWidth": "10%", "target": 0 }, // 1st column width 
		{ "sWidth": "90%", "target": 1 }
	    ],*/
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

		/*if(tfilters.length>1){
		    tfilters=[tfilters[tfilters.length-1]];
		}*/
		//var orderInit=$('input[name="'+lid+'TableOrder"]').val().split(' ');
		
		var opts=zoo.getRequest({
		    identifier: "np.clientViewTable",
		    dataInputs: [
			{"identifier":"table","value":ltype,"dataType":"string"},
			{"identifier":"offset","value":llimit[0],"dataType":"int"},
			{"identifier":"limit","value":llimit[1],"dataType":"int"},
			{"identifier":"page","value":page,"dataType":"int"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"sortname","value":closestproperties.split(",")[llimit[2]],"dataType":"string"},
			//{"identifier":"sortorder","value":(orderInit.length>1?orderInit[1]:llimit[3]),"dataType":"string"},
			//{"identifier":"sortname","value":(orderInit.length>0?orderInit[0]:closestproperties.split(",")[llimit[2]]),"dataType":"string"},
			{"identifier":"search","value":$('#'+lid+'_wrapper').find("input[type=search]").first().val(),"dataType":"string"},
			{"identifier":"filters","value":JSON.stringify(tfilters, null, ' '),"mimeType":"application/json"}
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
		    

		    $('[data-toggle="tooltip"]').tooltip({container: 'body'});
		    $('.inner_displayer').off('click');
		    $('.inner_displayer').on('click',function(){
			var closure=$(this);
			if($(this).is(':checked')){
			    $(this).parent().next().show();
			}else {
			    $(this).parent().next().hide();
			};
		    });

		    

		};
		opts["error"]=function(){
		    var myData=$.parseXML(arguments[0].responseText);
		    $('#'+lid).parent().append('<div class="alert alert-danger"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+$(arguments[0].responseXML).text().replace("\n","<br />")+'</div>');
		    notify('Execute failed');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});

	/*$('#'+lid).DataTable( {
	
	});*/
	
	$('#'+lid+' tbody').off('click');
	$('#'+lid+' tbody').on('click', 'tr', function () {
	    var prefix=lid.replace(/mainListing_display/g,"");
	    var row = $('#'+lid).DataTable().row($(this));
	    console.log("ID: "+$(this).find("input[name=id]").val());

	    try{
		for(var i=0;i<geometryFields.length;i++){
		    $("input[name='"+geometryFields[i]+"_mmcheck']").prop("checked",false);
		    $("input[name='"+geometryFields[i]+"_mmcheck']").change();
		}
	    }catch(e){
		console.log(" ### No geoemtry field (begin)");
		console.log(e);
		console.log(" ### No geoemtry field (end)");
	    }
	    
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
		    embeddedTableSelectedId/*[$("input[name="+prefix+"mainTableLevel]").val()]*/.push({name:lid,value:$(this).find("input[name=id]").val()});
		}
		CRowSelected.push(  lid+"_"+$(this).find("input[name=id]").val() );
		$(this).addClass("selected");
		$('#'+lid).DataTable().row($(this)).select();
		if(prefix.indexOf("input_")<0 && prefix.indexOf('embedded')<0)
		    $(".toActivate").each(function(){
			$(this).children().first().click();
		    });

		var params=[
		    {"identifier":"tableId","value":$("input[name="+prefix+"mainTableId]").val(),"dataType": "integer"},
		    {"identifier":"id","value":$(this).find("input[name=id]").val(),"dataType": "integer"}
		];
		var cid=$(this).find("input[name=id]").val();

		if($("#associatedMap").length){
		    var lcnt=0;
		    try{
			$(this).find("td").each(function(){
			    if(lcnt==1)
				setMapSearch($(this).text());
			    lcnt++;
			});
		    }catch(e){
		    }
		}
		    
		if(prefix.indexOf("input_")<0)
		adminBasic.callService("np.clientView",params,function(data){
		    for(i in data){
			var myRoot=$("#"+prefix+"edit0_"+i);
			myRoot.find("input[name=edit_tuple_id]").val(cid);
			for(j in data[i]){

			    if(data[i][j]){
			    if(/*data[i][j] && */!data[i][j].type){
				if(data[i][j+"_mdep"]){
				    for(var kk=0;kk<data[i][j+"_mdep"].length;kk++){
				    	myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").parent().find("select"+":eq("+kk+")").val(data[i][j+"_mdep"]).change();
					myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").parent().find("select"+":eq("+kk+")").attr("data-cvalue",data[i][j]);
				    }
 				}
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").val(data[i][j]).change();
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").each(function(){
				    if($(this).hasClass("htmlEditor")){
					$(this).summernote('code',data[i][j]);
				    }
				    /*console.log($(this).attr("type"));
				    console.log($(this).prop("multiple"));
				    if($(this).prop("multiple")){
					console.log($(this));
					$(this).find('option').each(function(){
					    $(this).prop("selected",false);
					    for(var k=0;k<data[i][j].length;k++)
						if(data[i][j][k]==$(this).val())
						    $(this).prop("selected",true);						    
					});
				    }*/
				    if($(this).attr("type")=="checkbox"){
					$(this).prop("checked",(data[i][j]=="True"?true:false));
				    }
				});
				if(data[i][j].indexOf && data[i][j].indexOf("POINT(")>=0){
				    var coordinates=data[i][j].replace(/POINT\(/,"").replace(/\)/,"").split(" ");
				    myRoot.find("input[name=edit_"+j+"_x]").val(coordinates[0]).change();
				    myRoot.find("input[name=edit_"+j+"_y]").val(coordinates[1]).change();
				}
				if(data[i][j].indexOf && (data[i][j].indexOf("POLYGON(")>=0 || data[i][j].indexOf("LINESTRING(")>=0 || data[i][j].indexOf("POINT(")>=0)){
				    try{
				    var fWKT=new ol.format.WKT();
				    var myGeom=fWKT.readGeometry(data[i][j]).transform("EPSG:4326","EPSG:3857");
				    myMapIframe=$("#associatedMap")[0].contentWindow || $("#associatedMap")[0];
				    searchMap=myMapIframe.app.getMap();
				    myContent=myMapIframe.$(document).find("#map");
				    searchMap.getView().fit(myGeom.getExtent(), { size: [myContent.width(),myContent.height()], nearest: false });
				    var feature = new ol.Feature({
					geometry: myGeom,
					name: "Element"
				    });
				    myMapIframe.app.addASelectedFeature([feature]);
				    }catch(e){
					console.log("No map  "+e);
				    }
				}
			    }else{
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").each(function(){
				    var closure=$(this);
				    $(this).fileinput('destroy');
				    var cname=data[i][j]["filename"].split('/');
				    var display=data[i][j]["fileurl"];
				    var regs=[RegExp("tif","g"),RegExp("gif","g"),RegExp("png","g"),RegExp("jpg","g"),RegExp("jpeg","g"),RegExp("JPG","g")];
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
					mainTableFiles[closure.attr("name")]=data.response.files[0].fileName;
				    });
				    
				});
			    }
			    }else{
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").val(data[i][j]).change();
				myRoot.find("input[name=edit_"+j+"],select[name=edit_"+j+"],textarea[name=edit_"+j+"]").each(function(){
				    if($(this).hasClass("htmlEditor")){
					$(this).summernote('code', data[i][j]);
				    }
				    if($(this).attr("type")=="checkbox"){
					$(this).prop("checked",(data[i][j]==true?true:false));
				    }
				});

			    }
			}
		    }
		    try{
			if(prefix==""){
			    console.log("____ loadEmbeddedTables ____");
			    loadEmbeddedTables(/*$("input[name="+prefix+"mainTableLevel]").val(),*/function(i){
				console.log($("input[name="+prefix+"mainTableLevel]").val());
				console.log("____ EmbeddedTables load "+embeddeds[i].id);
				//$("embedded_"+i+"_mainListing_display").dataTable().fnDraw();
				//$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
				console.log("____ EmbeddedTables loaded "+i);
				if(embeddeds[i].level==1 || embeddeds[i].id=="embedded_1024_")
				    displayTable(embeddeds[i].id+"mainListing_display",$("input[name="+embeddeds[i].id+"mainTableViewId]").val(),embeddeds[i].mainTableFields,embeddeds[i].mainTableRFields.join(","),embeddedTableFilter[i]);
				$(".require-"+embeddeds[i].id+"select").hide();
			    });
			    console.log("____ loadEmbeddedTables");
			}else{
			    console.log("ELSE ____ loadEmbeddedTables ____ "+prefix+" ");
			    for(var i=0;i<embeddeds.length;i++){
				console.log(embeddeds[i]);
				console.log(embeddeds[i].level);
				console.log(prefix+"mainTableLevel");
				console.log(eval($("input[name="+prefix+"mainTableLevel]").val())+1);
				if(eval($("input[name="+prefix+"mainTableLevel]").val())+1==embeddeds[i].level){
				    console.log(embeddeds[i].level);
				    var lprefix=embeddeds[i].id;
				    console.log(prefix);
				    try{
					if(tableDisplayed[lprefix+"mainListing_display"]){
					    console.log(tableDisplayed[lprefix+"mainListing_display"]);
					    tableDisplayed[lprefix+"mainListing_display"].destroy();
					}
				    }catch(e){
					console.log(e);
				    }
				    var oRoot=$("#"+lprefix+"mainListing_display");
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
					//console.log($(this));
					var lid=oRoot.find("input[name="+lprefix+"link_col]").val();
					console.log(lid);
					var obj={"linkClause":" AND "};
					obj[lid]=$(this).val();
					console.log(obj);
					console.log(embeddedTableFilter[i]);
					embeddedTableFilter[i].push(obj);
					console.log(embeddedTableFilter[i]);
				    });
				    console.log(lRoot);
				    console.log(embeddedTableFilter);
				    try{
					console.log("RUN DISPLAY TABLE !");
					displayTable(embeddeds[i].id+"mainListing_display",$("input[name="+embeddeds[i].id+"mainTableViewId]").val(),embeddeds[i].mainTableFields,embeddeds[i].mainTableRFields.join(","),[embeddedTableFilter[i][embeddedTableFilter[i].length-1]]);
					//func(i);
				    }catch(e){
					console.log('-----!!!!! ERROR: '+e);
				    }

				}
			    }
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
		    $("input[name="+prefix+"link_val]").val($(this).find("input[name=id]").val());
		}
		
		$(".require-"+prefix+"select").show();
	    }else{
		$(".require-"+prefix+"select").hide();
		mainTableSelectedId=null;
	    }
	});

	$(".mmFile").each(function(){
	    var closure=$(this);
	    var isInput=(!closure.parent().hasClass("importer_upload"));
	    console.log("***** MMFILE : "+isInput);
	    var lparams={
		language: module.config().lang,
		uploadUrl: module.config().url+"?service=WPS&version=1.0.0&request=Execute&RawDataOutput=Result&Identifier=upload.saveOnServer0&dataInputs=filename="+closure.attr("name")+";"+closure.attr("name")+"=Reference@isFile=true;dest=none", // server upload action
		uploadAsync: true,
		done: function (e, data) {
                    $.each(data.result.files, function (index, file) {
                        $('<p/>').text(file.name).appendTo('#files');
                    });
                }
	    };
	    if(isInput)
		lparams["maxFileCount"]=1;
	    $(this).fileinput(lparams);
	    $(this).on('fileuploaded', function(event, data, previewId, index) {
		var form = data.form, files = data.files, extra = data.extra,
		    response = data.response, reader = data.reader;
		if(isInput)
		    mainTableFiles[closure.attr("name")]=data.response.files[0].fileName;
		else{
		    importerUploadedFiles.push(data.response.files[0].fileName);
		    $('.importer_submit').show();
		    $(".importer_submit_log").append(
			$(managerTools.generateFromTemplate($("#importer_progress").html(),["id","file"],[importerUploadedFiles.length-1,data.files[0].name]))
		    );
		}
	    });
	});

	$('.importer_submit').hide();

    }

    function bindImport(){
	$("[data-mmaction=runImport]").click(function(){
	    var loparams=[
		{"identifier": "id","value": $(this).parent().find('input[name="import_id"]').val(),"dataType":"string"}
	    ];
	    
	    for(var i=0;i<importerUploadedFiles.length;i++){
		var lparams=loparams;
		lparams.push({"identifier": "dstName","value": importerUploadedFiles[i],"dataType":"string"});
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
			    zoo.watch(launched.sid, {
				onPercentCompleted: function(data) {
				    progress.css('width', (data.percentCompleted)+'%');
				    progress.text(data.text+' : '+(data.percentCompleted)+'%');
				    progress.attr("aria-valuenow",data.percentCompleted);
				    infomsg.html(data.text+' : '+(data.percentCompleted)+'%');
				},
				onProcessSucceeded: function(data) {
				    progress.css('width', (100)+'%');
				    progress.text(data.text+' : '+(100)+'%');
				    progress.removeClass("progress-bar-info").addClass("progress-bar-success");
				    progress.attr("aria-valuenow",100);
				    progress.parent().next().html(data.text+' : '+(100)+'%');
				},
				onError: function(data) {
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

    function notify(text, type) {
        mynotify.notify({
            message: { text: text },
            type: type,
        }).show();
    }

    function bindSave(){
	$("[data-mmaction=runPrint]").click(function(){
	    var closure=$(this);
	    $(this).addClass("disabled");
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
	    params=[
		{identifier: "tableId", value: tableId, dataType: "string"},
		{identifier: "id", value: tupleId, dataType: "string"},
		{identifier: "rid", value: $(this).parent().find('input[name="edit_report_id"]').val(), dataType: "string"},
		{"identifier":"filters","value":JSON.stringify(mainTableFilter, null, ' '),"mimeType":"application/json"}
	    ];
	    
	    closure=$(this);
	    var progress=closure.parent().find(".progress-bar").first();
	    progress.parent().show();

	    zoo.execute({
		identifier: 'np.clientPrint',
		type: 'POST',
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","mimeType":"application/json"},
		],
		storeExecuteResponse: true,
		status: true,
		success: function(data, launched) {
		    zoo.watch(launched.sid, {
			onPercentCompleted: function(data) {
			    progress.css('width', (data.percentCompleted)+'%');
			    progress.text(data.text+' : '+(data.percentCompleted)+'%');
			    progress.attr("aria-valuenow",data.percentCompleted);
			},
			onProcessSucceeded: function(data) {
			    progress.css('width', (100)+'%');
			    progress.text(data.text+' : '+(100)+'%');
			    if (data.result.ExecuteResponse.ProcessOutputs) {
				progress.css('width', (100)+'%');
				progress.text(data.text+' : '+(100)+'%');
				progress.attr("aria-valuenow",100);
				closure.removeClass("disabled");
				closure.children().first().show();
				closure.children().first().next().hide();
				closure.parent().parent().find(".report_display").html('');
				var ul=$(managerTools.generateFromTemplate($("#"+closure.parent().parent().attr("id")+"_link_list").html(),[],[]));
				var ldata=eval(data.result.ExecuteResponse.ProcessOutputs.Output.Data.ComplexData["__cdata"]);
				for(i=0;i<ldata.length;i++){
				    var format="odt";
				    var classe="fa-file-text-o";
				    if(ldata[i].indexOf("pdf")>0){
					format="pdf";
					classe="fa-file-pdf-o";
				    }
				    if(ldata[i].indexOf("doc")>0){
					format="doc";
					classe="fa-file-word-o";
				    }
				    if(ldata[i].indexOf("html")>0){
					format="html";
					classe="fa-code";
				    }
				    ul.find(".list-group").append(
					managerTools.generateFromTemplate($("#"+closure.parent().parent().attr("id")+"_link").html(),["link","format","class"],[ldata[i],format,classe])
				    );
				}
				closure.parent().parent().find(".report_display").html(ul);
				progress.parent().hide();
			    }
			},
			onError: function(data) {
			    console.log("**** onError ****");
			    console.log(data);
			    console.log("**** ERROR ****");
			    console.log(data);
			    notify("Execute asynchrone failed", 'danger');
			    closure.removeClass("disabled");
			    closure.children().first().show();
			    closure.children().first().next().hide();
			    closure.parent().parent().find(".report_display").html('<div class="alert alert-danger">'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
			},
		    });
		},
		error: function(data) {
		    console.log("**** ERROR ****");
		    console.log(data);
		    notify("Execute asynchrone failed", 'danger');
		    closure.removeClass("disabled");
		    closure.children().first().show();
		    closure.children().first().next().hide();
		    closure.parent().parent().find(".report_display").html('<div class="alert alert-danger">'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
		}
	    });
	});

	$("[data-mmaction=save]").click(function(){
	    var myRoot=$(this).parent();
	    var myRoot1=$(this).parent().parent();
	    params=[];
	    var tupleReal={};
	    myRoot.find("script").each(function(){
		if($(this).attr('id') && $(this).attr('id').indexOf('runFirst')>=0)
		    return;
		try{
		    console.log("**********- "+(myRoot1.attr('id').indexOf('embedded')<0));
		    console.log("**********- "+(!$(this).parent().attr('id')));
		    console.log("**********- "+($(this).parent().attr('id').indexOf("mm_table_editor_form")<0));
		}catch(e){
		    console.log(e);
		}

		if((myRoot1.attr('id') &&  myRoot1.attr('id').indexOf('input')>=0) || (myRoot1.attr('id') && myRoot1.attr('id').indexOf('embedded')<0 && (!myRoot.attr('id') || myRoot.attr('id').indexOf("mm_table_editor_form")<0)))
		    return;
		if($(this).attr('id') && $(this).attr("id")!="template_layerQuery_display" && $(this).attr("id").replace(/edition_/,"")!="importer_progress" && $(this).attr("id").indexOf("_template")<0)
		    tupleReal[$(this).attr("id").replace(/edition_/,"")]=$(this)[0].innerHTML;
	    });
	    var tuple={};
	    myRoot.find("textarea").each(function(){
		if($(this).hasClass("htmlEditor")){
		    console.log($(this));
		    try{
			if($(this).summernote)
			    tuple[$(this).attr("id").replace(/edition_/,"")]=$(this).summernote("code");
		    }catch(e){
			console.log("*** CATCHED ERROR");
			console.log(e);
			console.log("*** /CATCHED ERROR");
		    }
		}
	    });
	    myRoot.find("input,textarea,select").each(function(){
		if($(this).hasClass("htmlEditor") || $(this).hasClass("note-codable"))
		    return;
		if(!$(this).find('option:selected').attr("data-map") && (($(this).is(":visible") || $(this).attr('id')=="edition_uid")  && $(this).attr('id') || $(this).is("textarea")) && $(this).attr('id') && $(this).attr('id').indexOf("_mmtype")<0 && $(this).attr('id').indexOf("_mmlayer")<0 && $(this).attr('id').indexOf("_geotype")<0){
		    try{
			// ISSUE WITH upload
			var noDisplay=false;
			/*try{
			    console.log("**********- "+myRoot1.attr('id'))
			    console.log($(this));
			    console.log("**********- "+($(this).parent().parent().parent().parent().attr('id') && $(this).parent().parent().parent().parent().attr('id').indexOf("embedded_")>=0));
			    console.log("**********- "+($(this).parent().parent().parent().attr('id') && $(this).parent().parent().parent().attr('id').indexOf("embedded_")>=0));
			    noDisplay=($(this).attr("id")==null ||
				       ($(this).attr("id")!=null && $(this).attr("id").replace(/edition_/,"")=="tuple_id") ||
				       ($(this).attr("id")!=null && $(this).attr("id").replace(/edition_/,"")=="table_id") ||
				       ($(this).attr("id")!=null && $(this).attr("id").replace(/edition_/,"")=="edition_id") );
			    console.log("**********- "+(myRoot1.attr('id').indexOf('embedded')<0));
			    console.log("**********- "+noDisplay);
			}catch(e){
			    console.log(e);
			}*/
			if(noDisplay || (myRoot1.attr('id').indexOf('embedded')<0 && (
			    ($(this).parent().parent().parent().parent().attr('id') &&
			     $(this).parent().parent().parent().parent().attr('id').indexOf("embedded_")>=0)
				||
				($(this).parent().parent().parent().attr('id') && $(this).parent().parent().parent().attr('id').indexOf("embedded_")>=0)) ) )
			    return;
			console.log($(this).parent().parent().parent());
			console.log($(this).parent().parent().parent().parent());
			console.log("++++++ "+$(this).attr("id").replace(/edition_/,""));
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
			console.log("!!!!!!!! ERROR "+$(this).attr("id"));
		    }
		}else{
		    var tmpMap=$(this).find('option:selected').attr("data-map");
		    if(tmpMap){
			console.log("******** OM *********");
			params.push({"identifier":"InputGeometry","href": module.config().msUrl+"?map="+tmpMap+"&service=WFS&version=1.0.0&request=GetFeature&typename="+$(this).find('option:selected').val(), "mimeType": "text/xml", "method": "GET"});
			console.log(module.config().msUrl+"?map="+tmpMap+"&service=WFS&version=1.0.0&request=GetFeature&typename="+$(this).find('option:selected').val());
			console.log("******** OM *********");
		    }
		    if($(this).val()=="draw"){
			console.log("SHOULD USE GEOMETRYINPUT FROM OL DRAW");
			console.log(searchMap);
			/*
			  GEOMETRYINPUT
			*/
			if(currentDrawnElement=="" || currentDrawnElement==null){
			    var tmpFeature=myMapIframe.app.getDrawSource().getFeatures()[0].clone();
			    console.log(tmpFeature);
			    console.log("###### DO SOMETHING WITH THE GEOMETRY!");
			    var fwkt=new ol.format.WKT();
			    currentDrawnElement=fwkt.writeGeometry(tmpFeature.getGeometry().transform('EPSG:3857','EPSG:4326'));
			    console.log(currentDrawnElement);

			}
			params.push({"identifier":"InputGeometry","value": currentDrawnElement, "mimeType": "text/plain"});
			currentDrawnElement=null;
		    }
		}
	    });
	    var parts=myRoot1.attr('id').split("_");
	    if(parts[0]=="embedded"){
		var ei=-1;
		var tmp=parts[0]+"_"+parts[1]+"_";
		var elem=null;
		for(var kk=0;kk<embeddeds.length;kk++){
		    console.log(embeddeds[kk]);
		    console.log(tmp);
		    if(embeddeds[kk].id==tmp){
			ei=kk;
			break;
		    }
		}
		if(ei>=0){
		    var obj=embeddedTableFilter[ei][embeddeds[ei].level-1];
		    console.log(obj);
		    for(var key in obj)
			if(key!="linkClause")
			    tuple[key]=obj[key];
		}
	    }
	    /*myRoot1.find("#edition_table_id").last().each(function(){
		params.push({identifier: "tableId", value: $(this).val(), dataType: "string"});
	    });*/
	    /*myRoot1.find("#edition_edition_id").last().each(function(){
		params.push({identifier: "editId", value: $(this).val(), dataType: "string"});
		});*/
	    console.log(myRoot1);
	    console.log(myRoot1.find("#edition_table_id"));
	    params.push({identifier: "tableId", value: myRoot.next().val(), dataType: "string"});
	    params.push({identifier: "editId", value: myRoot.next().next().val(), dataType: "string"});
	    myRoot1.find("#edition_tuple_id").last().each(function(){
		if($(this).val()!="-1")
		    params.push({identifier: "id", value: $(this).val(), dataType: "string"});
	    });
	    params.push({identifier: "tuple", value: JSON.stringify(tuple, null, ' '), mimeType: "application/json"});
	    /*if(tupleReal["template_layerQuery_display"])
		params.push({identifier: "tupleReal", value: JSON.stringify({}, null, ' '), mimeType: "application/json"});
	    else*/
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
		if(lRoot.find('li').first().children().first().attr("href").indexOf("embedded")>=0 && tlRoot.attr("href").indexOf("embedded")>=0){
		    var tid=tlRoot.attr("href").replace(/#/g,"").replace(/listing/g,"mainListing_display");
		    $(".require-"+tid.replace(/mainListing_display/g,"select")).hide();
		    tableDisplayed[tid].CRowSelected=[];
		    tableDisplayed[tid].rows().every( function () {
			tableDisplayed[tid].row(this).deselect();
		    });
		    tableDisplayed[tid].columns.adjust().draw();
		    $(lRoot.find('li').first().children().first().attr("href")).find('tr').each(function(){
			console.log($(this));
			$(this).removeClass("selected");
			//$(this).click();
		    });
		    console.log(tlRoot);

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
	    if(myMapIframe){
		var myInteractions=myMapIframe.app.getInteractions();
		myMapIframe.app.desactivateInteractions();
		if(myMapIframe.app.getDrawSource().getFeatures().length>0){
		    myMapIframe.app.getDrawSource().removeFeature(myMapIframe.app.getDrawSource().getFeatures()[0]);
		}
		myMapIframe.$(".mm-action").first().click();
	    }
	    console.log('* Save function end');
	    return false;
	});

	$("[data-mmaction=import1]").click(function(){
	    console.log('* Run import datasource function');
	    var myRoot=$(this).parent();
	    console.log(myRoot);
	    var myRoot1=$(this).parent().parent();
	    console.log(myRoot1);
	    var params=[];
	    var linkId=null;
	    myRoot1.find("#edition_tuple_id").last().each(function(){
		if($(this).val()!="-1"){
		    params.push({identifier: "id", value: $(this).val(), dataType: "string"});
		    linkId=$(this).val();
		}
	    });
	    var tmp=myRoot1.find('input[name=columnNames]').val().split(',');
	    var fields="";
	    for(var i=1;i<tmp.length-1;i++){
		fields+=tmp[i];
	    }
	    console.log("SELECT "+linkId+" as "+tmp[0]+", "+fields+" from "+myRoot1.find("#import_mmlayer").val());
	    params.push({"identifier":"sql","value":"SELECT "+linkId+" as "+tmp[0]+", "+fields+" from "+myRoot1.find("#import_mmlayer").val(),"mimeType":"text/plain"});
	    params.push({"identifier":"overwrite","value":"true","dataType":"string"});
	    params.push({"identifier":"dst_in","value":myRoot1.find("#import_mmlayer").find("option:selected").data("map"),"dataType":"string"});
	    params.push({"identifier":"dso_in","value":myRoot1.find("#import_mmlayer").val(),"dataType":"string"});
	    params.push({"identifier":"dso_f","value":"PostgreSQL","dataType":"string"});
	    params.push({"identifier":"dst_out","value":module.config().db,"dataType":"string"});
	    var d=new Date();
	    var tableName="imports.data_"+d.getTime();
	    params.push({"identifier":"dso_out","value":tableName,"dataType":"string"});
	    zoo.execute({
		"identifier": "vector-converter.convert1",
		"type": "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","mimeType":"application/json"}
		],
		success: function(data){
		    console.log("SUCCESS !");
		    console.log(data);
		    var params0=[];
		    params0.push({"identifier":"importedData","value":tableName,"dataType":"string"});
		    params0.push({"identifier":"tableId","value":myRoot1.find('input[name="edit_table_id"]').val(),"dataType":"string"});
		    params0.push({"identifier":"editId","value":myRoot1.find('input[name="edit_edition_id"]').val(),"dataType":"string"});
		    zoo.execute({
			"identifier": "np.clientImportDataset",
			"type": "POST",
			dataInputs: params0,
			dataOutputs: [
			    {"identifier":"Result","mimeType":"application/json"}
			],
			storeExecuteResponse: true,
			status: true,
			success: function(data){
			    console.log("SUCCESS !");
			    console.log(data);
			    var cid=0;
			    
			    for(var i in zoo.launched)
				cid=i;

			    zoo.watch(cid, {
				onPercentCompleted: function(data) {
				},
				onProcessSucceeded: function(data) {
				    if (data.result.ExecuteResponse.ProcessOutputs) {
					console.log("SUCCESS !");
					/*var ref=data.result["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
					var mapParts=ref.split('&');
					console.log(mapParts[0]);
					var mapParts=mapParts[0].split("=");
					console.log(mapParts[1]);
					myMapIframe.app.addLayerToMap({
					    mapfile: mapParts[1],
					    layers: ["Result"],
					    labels: [currentElement.parent().find('input[name="processLayer_'+cid+'"]').val()],//$("#layerTitle").val()],
					    listHTML: currentElement.parent().find('input[name="processLayer_'+cid+'"]').val(),//$("#layerTitle").val(),
					    cselection: ""
					});
					$("#layerExtract").find('form:gt(0)').remove();
					console.log(data);
					console.log(mapParts);

					$(".notifications").notify({
					    message: { text: data.text },
					    type: 'success',
					    }).show();*/
					console.log(data);
					$(".notifications").notify({
					    message: { text: "Fait" },
					    type: 'success',
					}).show();
				    }
				},
				onError: function(data) {
				    /*progress.attr("aria-valuenow",100);
				    progress.css('width', (100)+'%');
				    progress.text(data.text+' : '+(100)+'%');*/
				    try{
					$(".notifications").notify({
					    message: { text: data["result"]["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
					    type: 'danger',
					}).show();
				    }catch(e){
					console.log(" !! CANNOT RUN NOTIFY !! ");
					console.log(e);
				    }
				},
			    });
			    
			},
			error: function(data){
			    console.log(data);
			    myRoot.append('<div class="alert alert-danger alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
			}
		    });

		    /*var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
		    var mapParts=ref.split('&');
		    console.log(mapParts[0]);
		    var mapParts=mapParts[0].split("=");
		    console.log(mapParts[1]);
		    myMapIframe.app.addLayerToMap({
			mapfile: mapParts[1],
			layers: ["Result"],
			labels: [$("#layerTitle").val()],
			listHTML: $("#layerTitle").val(),
			cselection: ""
		    });
		    $("#layerExtract").find('form:gt(0)').remove();
		    $("#layerTitle").val("");
		    console.log(data);
		    console.log(mapParts);*/
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		    myRoot.append('<div class="alert alert-danger alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
		}
	    });

	    console.log(params);
	    console.log('* Import datasource function end');
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
	    console.log(embeddeds[i].level);
	    var prefix=embeddeds[i].id;
	    console.log(prefix);
	    try{
		if(tableDisplayed[prefix+"mainListing_display"]){
		    console.log(tableDisplayed[prefix+"mainListing_display"]);
		    tableDisplayed[prefix+"mainListing_display"].destroy();
		}
	    }catch(e){
		console.log(e);
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

    function recordProcessingService(){
	$("select[name='processing_service']").off('change');
	$("select[name='processing_service']").on('change',function(){
	    $(this).find('option').each(function(){
		console.log($(this).is(':selected'));
		var closure=$(this);
		if($(this).is(':selected')){
		    if($(this).attr("data-display").indexOf("pselection")<0){
			$('#'+closure.attr('data-display')).find('select').first().html('');
			$('#addedLayers').find('option').each(function(){
			    if(!$(this).is(':selected'))
				$('#'+closure.attr('data-display')).find('select').first().append($(this).clone());
			});
		    }else{
			$('#'+closure.attr('data-display')).find('select:not(:eq(0))').html('');
			$('#addedLayers').find('option').each(function(){
			    if(!$(this).is(':selected'))
				$('#'+closure.attr('data-display')).find('select:not(:eq(0))').append($(this).clone());
			});
		    }
		    $('#'+$(this).attr('data-display')).show();
		}else
		    $('#'+$(this).attr('data-display')).hide();
	    });
	    $("select[name='drawFeatureType']").change();
	});
    }
    
    var changingFields=[];
    var changingFieldsUseless=[];
    var initialize=function(){

	console.log("OK");
	var closure=this;
	$( '.dropdown-menu a.dropdown-toggle' ).on( 'click', function ( e ) {
            var $el = $( this );
            var $parent = $( this ).offsetParent( ".dropdown-menu" );
            if ( !$( this ).next().hasClass( 'show' ) ) {
		$( this ).parents( '.dropdown-menu' ).first().find( '.show' ).removeClass( "show" );
            }
            var $subMenu = $( this ).next( ".dropdown-menu" );
            $subMenu.toggleClass( 'show' );
            
            $( this ).parent( "li" ).toggleClass( 'show' );
	    
            $( this ).parents( 'li.nav-item.dropdown.show' ).on( 'hidden.bs.dropdown', function ( e ) {
		$( '.dropdown-menu .show' ).removeClass( "show" );
            } );
            
            if ( !$parent.parent().hasClass( 'navbar-nav' ) ) {
		$el.next().css( { "top": $el[0].offsetTop, "left": $parent.outerWidth() - 4 } );
            }
	    
            return false;
	} );
	recordProcessingService();
	console.log("OK");
	
	//$('#side-menu').metisMenu({ toggle: false });
	console.log("OK");

	$('#side-menu').css({"max-height": ($(window).height()-50)+"px","overflow":"auto"});
	try{   
	    console.log(embeddeds);
	}catch(e){
	    console.log(e);
	}
	console.log("OK");
	adminBasic.initialize(zoo);
	console.log("OK");
	try{   
	    console.log(embeddeds);
	}catch(e){
	    console.log(e);
	}
	console.log("OK");
	$(".mmdatastore").click(function(e){
	    document.location=$(this).attr("href");
	    return false;
	});
	console.log("OK");

	try{   
	    console.log(embeddeds);
	}catch(e){
	    console.log(e);
	}
	console.log("OK");
	displayTable("mainListing_display",$("input[name=mainTableViewId]").val(),mainTableFields,mainTableRFields.join(","),mainTableFilter);
	console.log("OK");
	try{   
	    console.log(embeddeds);
	}catch(e){
	    console.log(e);
	}

	console.log("OK");
	$(".tab-pane").find("script").each(function(){
	    console.log($(this));
	    if($(this).attr('name'))
		try{
		    console.log($(this).html());
		    if($(this).attr('name').indexOf("geometryField")>0){
			//$("body").append("<script>"+$(this).html()+"</script>");
			eval($(this).html());
			return;
		    }
		    console.log("!!!! convert to JSON");
		    console.log("{\""+$(this).attr('name')+"\":"+$(this).html()+"}");
		    changingFields.push(JSON.parse("{\""+$(this).attr('name')+"\":"+$(this).html()+"}"));
		    console.log("!!!! convert to JSON OK");
		    
		    console.log(changingFields[changingFields.lngth-1]);
		    var lname=$(this).attr('name');
		    var firstItem=[null,null];
		    for(var i in changingFields[changingFields.length-1][lname]){
			firstItem[0]=i;
			for(var j in changingFields[changingFields.length-1][lname][i]){
			    firstItem[1]=j;
			    break;
			}
			break;
		    }
		    if(changingFields[changingFields.length-1][lname][firstItem[0]][firstItem[1]]["options"]){
			/*
			 * Create the options array containing initial values
			 */
			$(this).parent().find('select[name='+$(this).attr('name')+']').first().find('option').each(function(){
			    //console.log(changingFields[changingFields.length-1][lname])
			    for(var i in changingFields[changingFields.length-1][lname]){
				for(var j in changingFields[changingFields.length-1][lname][i]){
				    if(changingFields[changingFields.length-1][lname][i][j]["tfield"]!="none")
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
				    console.log("****** "+ i+"  ___ "+j+" ******");
				    if(changingFields[changingFields.length-1][lname][i][j]["tfield"]!="none")
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
							    try{
								$(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").html("");
								if(data[$(this).val()]['value'].length>0)
								    for(var j=0;j<data[$(this).val()]['value'].length;j++)
									$(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").append('<option value="'+data[$(this).val()]['value'][j][0]+'">'+data[$(this).val()]['value'][j][1]+'</option>');
								else
								    $(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").append('<option value="NULL">'+module.config().localizationStrings.tables.none+'</option>');
								$(this).parent().parent().parent().parent().find("[name=edit_"+data[$(this).val()]['id']+"]").change();
							    }catch(e){
								console.log("MM ERROR: "+e);
							    }
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
				    else{
					console.log(changingFields[changingFields.length-1][lname][i]);
					
					(function(closure,ref){
					    closure.parent().find('select[name='+closure.attr('name')+']').first().off('change');
					    closure.parent().find('select[name='+closure.attr('name')+']').first().change(function(){
						console.log("*****\n OK *****");
						console.log(ref);
						for(var ti=0;ti<ref.length;ti++)
						    for(var tj in ref[ti]){
							console.log(ref[ti][tj]);
							if(ref[ti][tj]["options"]){
							    console.log(tj);
							    console.log(closure);
							    console.log(ref[ti][tj]);
							    console.log('input,select,textarea#edition_'+tj+'');
							    console.log(closure.parent().find('input#edition_'+tj+',select#edition_'+tj+''));
							    if(ref[ti][tj]["options"][0]==$(this).val()){
								console.log(" ****** \n DISPLAY \n ****** ");
								console.log(closure.parent().find('input#edition_'+tj+',select#edition_'+tj+''));
								closure.parent().find('input#edition_'+tj+',select#edition_'+tj+'').parent().parent().show();
							    }
							    else{
								console.log(" ****** \n HIDE \n ****** ");
								console.log(closure.parent().find('input#edition_'+tj+',select#edition_'+tj+''));
								closure.parent().find('input#edition_'+tj+',select#edition_'+tj+'').parent().parent().hide();
							    }
							}
						    }
						console.log("*****\n OK *****");					
					    });
					    closure.parent().find('select[name='+closure.attr('name')+']').first().change();
					})(closure,changingFields[changingFields.length-1][lname]);
				    }
				    
				}
			}
		    }else{
			console.log(" ----- OTHER CASES");
			console.log(changingFields[changingFields.length-1][lname]);
			var celement=$(this).next().find("input[name='"+lname+"'],select[name='"+lname+"'],textarea[name='"+lname+"']").first();
			var element=celement.clone();
			console.log($(this).parent());
			for(var i in changingFields[changingFields.length-1][lname]){
			    var refObject=(changingFields[changingFields.length-1]);
			    for(var j in changingFields[changingFields.length-1][lname][i]){
				console.log(changingFields[changingFields.length-1][lname][i][j]);
				for(var k in changingFields[changingFields.length-1][lname][i][j]){
				    console.log(changingFields[changingFields.length-1][lname][i][j][k]);
				    for(var l in changingFields[changingFields.length-1][lname][i][j][k]){
					var myObject=changingFields[changingFields.length-1][lname][i][j][k][l];

					if(myObject["dependents"]){
					    for(var i1 in myObject["dependents"]){
						for(var j1 in myObject["dependents"][i1]){
						    var myObjectInner=myObject["dependents"][i1][j1];
						    console.log(myObjectInner);
						    celement.parent().prepend('<div class="row">'+
									      '<div class="col-sm-4"><label>'+myObjectInner["label"]+'</label></div>'+
									      '<div class="col-sm-8"><select class="form-control" data-transmission="none" name="'+j1+'"></select></div>'+
									      '</div>');
						}
					    }
					}
					
					celement.parent().prepend('<div class="row">'+
								  '<div class="col-sm-4"><label>'+myObject["label"]+'</label></div>'+
								  '<div class="col-sm-8"><select class="form-control" data-transmission="none" name="'+l+'"></select></div>'+
								  '</div>');
					(function(myObject,celement,l,refObject){
					    zoo.execute({
						"identifier": "template.display",
						"type": "POST",
						dataInputs: [
						    {"identifier":"tmpl","value":"public/modules/tables/fetchDependencies_js","dataType":"string"},
						    {"identifier":"elements","value":JSON.stringify([myObject]),"mimeType":"application/json"}
						],
						dataOutputs: [
						    {"identifier":"Result","type":"raw"},
						],
						success: function(data){
						    console.log(data);
						    var myElement=celement.parent().find("select[name='"+l+"']");
						    var myElement1=myElement;
						    for(var i in data){
							myElement.append('<option value="'+data[i][0]+'">'+data[i][1]+'</option>');
							for(var i1 in myObject["dependents"]){
							    for(var j1 in myObject["dependents"][i1]){
								myObject["dependents"][i1][j1]["options"].push(data[i][0]);
							    }
							}
						    }
						    if(myObject["dependents"]){
							bindEndDependencies(myObject,celement,l,myElement1,refObject);							
						    }else{
							console.log(myObject);
							console.log(refObject);
							console.log(celement);
							for(var jj in refObject)
							    for(var kk in refObject[jj][0]["myself"])
								for(var ll in refObject[jj][0]["myself"][kk]){
								celement.parent().find("select[name="+ll+"]").off('change');
								(function(a,b,c,d){
								celement.parent().find("select[name="+ll+"]").on('change',function(){
									console.log("MYSELF");
						console.log(celement);
									console.log(a);
									console.log(b);
									console.log(c);
									console.log(d);
									var originalElement=$(this);
									var tmpClause="";
									var tmpId=0;
									for(var i in refObject){
									    tmpId=i.replace(/edit_/,"");
									    for(var j in refObject[i][0]["myself"])
										for(var k in refObject[i][0]["myself"][j]){
											if(tmpClause!="")
												tmpClause+=" "+refObject[i][0]["myself"][j][k]['cond_join']+" ";
											tmpClause+=" "+refObject[i][0]["myself"][j][k]['tfield']+" "+refObject[i][0]["myself"][j][k]['operator']+" "+(refObject[i][0]["myself"][j][k]['operator']=="like"?"'":"")+(celement.parent().find("select[name="+k+"]").val())+(refObject[i][0]["myself"][j][k]['operator']=="like"?"'":"");
										}
									}
									console.log(tmpClause);
									zoo.execute({
                                                				"identifier": "template.display",
                                                				"type": "POST",
                                                				dataInputs: [
                                                    					{"identifier":"tmpl","value":"public/modules/tables/fetchDependencies1_js","dataType":"string"},
                                                    					{"identifier":"element","value":tmpId,"dataType":"float"},
											{"identifier":"cond","value":tmpClause,"mimeType":"applicatioin/json"},
                                                				],
                                                				dataOutputs: [
                                                    					{"identifier":"Result","type":"raw"},
                                                				],
                                                				success: function(data){
											tmpId1="edit_"+tmpId;
											var tempVal=celement.parent().find("select[name='"+tmpId1+"']").val();
											celement.parent().find("select[name='"+tmpId1+"']").html("");
											for(var j in data){
												celement.parent().find("select[name='"+tmpId1+"']").append('<option value="'+data[j][0]+'">'+data[j][1]+'</option>');
											}
											if(originalElement.attr("data-cvalue"))
												celement.parent().find("select[name='"+tmpId1+"']").val(originalElement.attr("data-cvalue")).change();
											else
												celement.parent().find("select[name='"+tmpId1+"']").val(tempVal).change();
										},
										error: function(){
										}
									});
									
	
								});
								})(jj,kk,l,refObject);
							    }
						    }

						},
						error: function(data){
						    console.log("ERROR");
						    console.log(data);
						}
					    });
					})(myObject,celement,l,refObject);
				    }
				}
			    }
			}
			console.log($(this).parent().find("input[name='"+lname+"'],select[name='"+lname+"'],textarea[name='"+lname+"']"));
			console.log(" ----- / OTHER CASES");
		    }
		    //console.log($(this).attr('name'));
		}catch(e){
		    console.log(e);
		}
	});
	console.log(embedded);
	console.log("OK");

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
	    loadEmbeddedTables(/*$("input[name=embedded_"+i+"_mainTableLevel]").val(),*/function(i){
		displayTable("embedded_"+i+"_mainListing_display",$("input[name=embedded_"+i+"_mainTableViewId]").val(),embeddeds[i].mainTableFields,embeddeds[i].mainTableRFields.join(","),embeddedTableFilter[i]);
	    });
	}catch(e){
	    console.log("No embedded tables");
	}
	try{
	    for(var i=0;i<geometryFields.length;i++){
		console.log("**** geometryFields[i]",geometryFields[i]);
		$("select[name='"+geometryFields[i]+"_mmtype']").off("change");
		$("select[name='"+geometryFields[i]+"_mmtype']").on("change",function(){
		    console.log($(this));
		    var tmp=$(this).attr("name").replace(/mmtype/g,"mmlayer");
		    if($(this).val()=="draw"){
			console.log("DRAW FROM HERE!");
			console.log($("select[name='"+tmp+"']"));
			$("select[name='"+tmp+"']").hide();
			startDrawTool($(this));
			$("#map_Toggler").click();
		    }else{
			console.log("Use created layer!");
			$("select[name='"+tmp+"']").show();
		    }
		});
		console.log(" ************** $$$$$$$$$$$$$$$$ OKOKOKOKOKOKOKKOKOKO");
		$("input[name='"+geometryFields[i]+"_mmcheck']").prop("checked",false);
		$("input[name='"+geometryFields[i]+"_mmcheck']").change();
	    }
	}catch(e){
	    console.log("No geometry field found");
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
	console.log("OK");

	bindImport();
	console.log("OK");
	
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

    var sqlQueries;
    var sqlQueriesCallbacks=null;
    
    function loadSqlList(){
	sqlQueries=[];
	sqlQueriesCallbacks=null;
	zoo.execute({
	    "identifier": "template.display",
	    "type": "POST",
	    dataInputs: [
		{"identifier":"tmpl","value": "public/modules/tables/sqlQuery_js","dataType":"string"},
		{"identifier":"tid","value": $("#sqlQueryTid").val(),"dataType":"integer"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","mimeType":"application/json","type": "raw"}
	    ],
	    success: function(data){
		console.log(data);
		$("#sqlQueryIdentifiers").off("change");
		$("#sqlQueryIdentifiers").find("option:gt(0)").remove();
		for(var i=0;i<data.length;i++){
		    sqlQueries.push(data[i]);
		    $("#sqlQueryIdentifiers").append('<option value="'+i+'">'+data[i]["name"]+'</option>');
		}
		$("#sqlQueryIdentifiers").on("change",function(){
		    sqlQueriesCallbacks=null;
		    try{
			var currentElement=sqlQueries[$(this).val()];
			sqlQueriesCallbacks=function(){
			    try{
				$("#queryLayerDiagramTitle").val(currentElement["name"]);
				$("#queryLayerDiagramType").val(currentElement["g_type"]);
				$("#queryLayerDiagramX").val(currentElement["x_col"]);
				$("#queryLayerDiagramY").val(currentElement["y_col"]);
				$("#layerQueryParameters").find('button').first().click();
			    }catch(e){
				console.log("currentElement not defined!");
			    }
			};
			$("#sqlQuery").val(sqlQueries[$(this).val()]["query"]);
		    }catch(e){
			console.log("sqlQueryIdentifiers not defined!");
		    }
		});
	    },
	    error: function(data){
		console.log(data);
	    }
	});
    }
    
    function initializeMap(){
	setTimeout(function(){
	    $("#map_Toggler").click();
	    setTimeout(function(){
		$("#associatedMap").contents().find("body").find( ".ol-zoom-extent" ).find("button").click();
		$("#listing_Toggler").click();
	    },100);
	},100);
	try{
	    myMapIframe= $("#associatedMap")[0].contentWindow;
	    console.log(myMapIframe);
	    loopTillAppLoaded(myMapIframe);
	}catch(e){
	    console.log(e);
	}   
    }

    function loopTillAppLoaded(win){
	if(!win.app){
	    setTimeout(function(){loopTillAppLoaded(win)},0.1);
	    console.log("*** WAIT ***");
	}
	else{
	    loadSqlList();
	    $("#layerTitle").parent().find(".tab-pane").css({
		"height": ($(window).height()-440)+"px",
		"overflow": "auto"
	    });
	    console.log("*** OK ***");
	    $("#map_Toggler").on('click',function(){
		console.log("********** OK TRIGGER");
		setTimeout(function(){
		    win.app.setMapHeight();
		},10);
	    });
	    var layers=win.app.getLayers();
	    for(var i in layers){
		$("#addedLayers").append('<option data-map="'+layers[i].searchMap+'" value="'+i+'">'+layers[i].alias+'</option>');
		registerAddedLayersEvent();
	    }
	    setMapSearch("");

	}
    }

    function registerAddedLayersEvent(){
	myMapIframe=$("#associatedMap")[0].contentWindow || $("#associatedMap")[0];
	$("#addedLayers").off('change');
	$("#addedLayers").on('change',function(){
	    var tableDescRef=$(this);
	    managerTools.getTableDesc(module.config().msUrl,$(this).find('option:selected').attr("data-map"),$(this).val(),null,function(obj,rdata,idata){
		$("#layerExtract").find('select[name="field"]').html("");
		var properties="";
		for(var i=0;i<rdata.fields.length;i++)
		    if(rdata.fields[i]!="msGeometry"){
			$("#layerExtract").find('select[name="field"]').append('<option  data-type="'+rdata.types[i]+'" value="'+rdata.fields[i]+'">'+rdata.fields[i]+'</option>');
			if(i>1 && rdata.fields[i]!="gml_id")
			    properties+=","
			if(rdata.fields[i]!="gml_id")
			properties+=rdata.fields[i];
		    }
		properties+=",msGeometry";
		tableDescRef.find('option:selected').attr("data-properties",properties);
		$("#layerExtract").find('select[name="values"]').html("");
		bindFilterLayer();
		bindReport();
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
		var properties=$("#addedLayers").find('option:selected').attr("data-properties").split(',');
		var propertiesXML="";
		for(var j=0;j<properties.length;j++) {
		    propertiesXML+="<wfs:PropertyName>"+properties[j]+"</wfs:PropertyName>";
		}
		
		var wfsUrl=module.config().msUrl+'?map='+module.config().dataPath+"/maps/search_Overlays_"+$("#addedLayers").val()+".map";
		console.log($("#addedLayers").find("option:selected").attr("data-map"));
		if($("#addedLayers").find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0)
		    wfsUrl=module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map");
		//maxFeatures="1000000" 
		var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0" outputFormat="text/xml; subtype=gml/3.1.1">'+
		    '<wfs:Query xmlns:ms="http://geolabs.fr/" typeName="'+$("#addedLayers").val()+'">'+propertiesXML+
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
			myMapIframe.app.addLayerToMap({
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
	    $("select[name='processing_service']").change();
	});
	$("select[name='processing_service']").change();
    }

    var draw;
    var currentDrawnElement=null;
    function startDrawTool(elem){
	var ltype="LineString";
	console.log($("input[name='"+elem.attr("name").replace(/mmtype/g,"geotype")+"']"));
	if($("input[name='"+elem.attr("name").replace(/mmtype/g,"geotype")+"']").val()=="MULTIPOLYGON")
	    ltype="Polygon";
	if($("input[name='"+elem.attr("name").replace(/mmtype/g,"geotype")+"']").val()=="MULTIPOINT")
	    ltype="Point";
	var args={
	    name: "gselectFeatures",
	    type: ltype,
	    geometryFunction: null,
	    style: null,
	    mmModify:true,
	    endHandler: function(evt) {
		evt.preventDefault();
		var tmpFeature=evt.feature.clone();
		console.log(tmpFeature);
		console.log("###### DO SOMETHING WITH THE GEOMETRY!");
		var fwkt=new ol.format.WKT();
		/*var coords=tmpFeature.getGeometry().getCoordinates();
		for(i in coords)
		    coords[i]=coords[i].reverse();
		tmpFeature.getGeometry().setCoordinates(coords);*/
		currentDrawnElement=fwkt.writeGeometry(tmpFeature.getGeometry().transform('EPSG:3857','EPSG:4326'));
		console.log(currentDrawnElement);
	    }
	};
	if(hasFeature){
	    console.log(myMapIframe.app.getDrawSource());
	    if(myMapIframe.app.getDrawSource().getFeatures().length>0){
		myMapIframe.app.getDrawSource().removeFeature(myMapIframe.app.getDrawSource().getFeatures()[0]);
	    }
	    if(myMapIframe.app.getSelectLayer().getSource().getFeatures()[0])
		myMapIframe.app.getDrawSource().addFeature(myMapIframe.app.getSelectLayer().getSource().getFeatures()[0].clone());
	}
	myMapIframe.app.mmActivateDrawTool(args);
    }
    
    function startSelectFeatures(){
	var value = $("select[name='drawFeatureType']:visible").val();
        if (value !== 'None') {
	    var args={
		name: "gselectFeatures",
		type: (value=="Box"?"Circle":value),
		geometryFunction: (value=="Box"?ol.interaction.Draw.createBox():null),
		style: null,
		endHandler: function(evt) {
		    evt.preventDefault();
		    var tmpFeature=evt.feature.clone();
		    console.log(tmpFeature);
		    // Create WFS Request
		    var format1=new ol.format.WFS();
		    if(eval(module.config().msVersion.split(".")[0])<7){
			var proj = new ol.proj.Projection({
			    code: "EPSG:4326",//'http://www.opengis.net/gml/srs/epsg.xml#4326',
			    axis: 'enu'
			});
			ol.proj.addEquivalentProjections([ol.proj.get('EPSG:4326'), proj]);
		    }
		    try{
			var wfsRequest=format1.writeGetFeature({
			    featureNS: "wfs",
			    featurePrefix: "wfs",
			    featureTypes: [$("#addedLayers").val()],
			    geometryName: "msGeometry",
			    srsName: 'EPSG:4326',
			    version: "2.0.0",
			    filter: new ol.format.filter.Intersects("msGeometry",tmpFeature.getGeometry().clone().transform("EPSG:3857","EPSG:4326"),"EPSG:4326")
			});
		    }catch(e){
			console.log(" **** Catched error",e);
			var wfsRequest=format1.writeGetFeature({
			    featureNS: "wfs",
			    featurePrefix: "wfs",
			    featureTypes: [$("#addedLayers").val()],
			    geometryName: "msGeometry",
			    srsName: 'EPSG:4326',
			    version: "2.0.0",
			    filter: new ol.format.filter.Intersects("msGeometry",ol.geom.Polygon.fromCircle(tmpFeature.getGeometry(),1024,0).transform("EPSG:3857","EPSG:4326"),"EPSG:4326")
			});
		    }
		    console.log(wfsRequest);
		    // Create WPS POST Request to be embedded to call the Append service
		    var opts=zoo.getRequest({
			identifier: "vector-converter.Ogr2Ogr",
			dataInputs: [
			    {
				"identifier":"InputDS",
				"href": module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map"),
				"value": (eval(module.config().msVersion.split(".")[0])>=7?$(wfsRequest)[0].outerHTML:$(wfsRequest)[0].outerHTML.replace(/1.1.0/g,"1.0.0")),
				"mimeType": "text/xml",
				"method": "POST",
				"headers": [
				    {
					"key":"Content-Type",
					"value":"text/xml"
				    }
				]
			    },
			    {"identifier":"InputDSN","value": module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map"),"dataType":"string"},
			    {"identifier":"OutputDSN","value": "QueryResult"+(new Date().valueOf())+".json","dataType":"string"},
			    {"identifier":"dialect","value": "sqlite","dataType":"string"},
			    {"identifier":"F","value": "GeoJSON","dataType":"string"},
			    {"identifier": "s_srs", "value": "+proj=latlong +datum=WGS84 +axis=neu +wktext", "dataType":"string"},
			    {"identifier": "t_srs", "value": "+proj=latlong +datum=WGS84 +axis=enu +wktext", "dataType":"string"}
			],
			dataOutputs: [
			    {"identifier":"OutputedDataSourceName","mimeType":"application/json","type": "raw"}
			],
			type: 'POST',
			storeExecuteResponse: false
		    });
		    console.log(opts);
		    window["gselectFeatures_request"]=function(){
			console.log(wfsRequest.innerHTML);
			//var tmp=document.createElement("div");
			//tmp.appendChild(wfsRequest.cloneNode(false));
			return opts.data;
		    };
		    console.log(module.config());
		    // Create DataInputs parameter to pass to the Append service
		    var myDataInputs=[
			{
			    "identifier":"InputEntity1",
			    "href": module.config().url,
			    "value": opts.data,
			    "mimeType":"text/xml",
			    "method": "POST",
			    "headers":[
				{
				    "key":"Content-Type",
				    "value":"text/xml"
				}
			    ]
			}
		    ];
		    if($("#pselection1").is(":visible")){
			var wfsRequest1=format1.writeGetFeature({
			    featureNS: "wfs",
			    featurePrefix: "wfs",
			    featureTypes: [$("select[name='InputEntity3']:visible").val()],
			    srsName: 'EPSG:4326'
			});

			// Create WPS POST Request to be embedded to call the Append service
			var opts1=zoo.getRequest({
			    identifier: "vector-converter.Ogr2Ogr",
			    dataInputs: [
				{
				    "identifier":"InputDS",
				    "href": module.config().msUrl+'?map='+$("select[name='InputEntity3']:visible").find("option:selected").attr("data-map"),
				    "value": $(wfsRequest1)[0].outerHTML,
				    "mimeType": "text/xml",
				    "method": "POST",
				    "headers": [
					{
					    "key":"Content-Type",
					    "value":"text/xml"
					}
				    ]
				},
				{"identifier":"InputDSN","value":  module.config().msUrl+'?map='+$("select[name='InputEntity3']:visible").find("option:selected").attr("data-map"),"dataType":"string"},
				{"identifier":"OutputDSN","value": "QueryResult"+(new Date().valueOf())+".json","dataType":"string"},
				{"identifier":"dialect","value": "sqlite","dataType":"string"},
				{"identifier":"F","value": "GeoJSON","dataType":"string"},
				{"identifier": "s_srs", "value": "+proj=latlong +datum=WGS84 +axis=neu +wktext", "dataType":"string"},
				{"identifier": "t_srs", "value": "+proj=latlong +datum=WGS84 +axis=enu +wktext", "dataType":"string"}
			    ],
			    dataOutputs: [
				{"identifier":"OutputedDataSourceName","mimeType":"application/json","type": "raw"}
			    ],
			    type: 'POST',
			    storeExecuteResponse: false
			});

			myDataInputs.push({
			    "identifier":"InputEntity2",
			    "href": module.config().url,
			    "value": opts1.data,
			    "mimeType":"text/xml",
			    "method": "POST",
			    "headers":[
				{
				    "key":"Content-Type",
				    "value":"text/xml"
				}
			    ]			    
			});
		    }
		    // Invoke the Append WPS service
		    zoo.execute({
			identifier: "vector-tools.Append",
			dataInputs: myDataInputs,
			dataOutputs: [
			    {"identifier":"Result","mimeType":"image/png"}
			],
			type: 'POST',
			storeExecuteResponse: false,
			success: function(data){
			    console.log("SUCCESS !");
			    var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
			    var mapParts=ref.split('&');
			    console.log(mapParts[0]);
			    var mapParts=mapParts[0].split("=");
			    console.log(mapParts[1]);
			    myMapIframe.app.addLayerToMap({
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
			}
		    });
		    
		}
	    };
	    console.log(args);
	    myMapIframe.app.mmActivateDrawTool(args);
	    console.log(" **--** DRAW FROM NOW!");
        }
    }
    
    var searchMap;
    var geometryFieldsFirstRun=true;
    var originalExtent=null;
    var hasFeature=false;

    function sensible(){
	$("#associatedMap").contents().find( "#search_value").val(arguments[0]);
	$("#associatedMap").contents().find( "#search_value").typeahead('val',arguments[0],false);
	myMapIframe=$("#associatedMap")[0].contentWindow || $("#associatedMap")[0];
	var searchResults=myMapIframe.app.getSearchValues();
	searchMap=myMapIframe.app.getMap();
	if(searchResults[0]){
	    var extent=searchResults[1][searchResults[0].indexOf(arguments[0])];
	    console.log(extent);
	    if(!extent)
		hasFeature=true;
	    else
		hasFeature=false;
	    
	    searchMap.getView().fit(extent, { size: [myContent.width(),myContent.height()], nearest: false });
	    //searchMap.getView().fit(extent,searchMap.getSize());
	
	    var myGeom=ol.geom.Polygon.fromExtent(extent);
	    var feature = new ol.Feature({
		geometry: myGeom,
		name: arguments[0]
	    });
	    myMapIframe.app.addASelectedFeature([feature]);

	    originalExtent=feature.clone();
	    var myContent=myMapIframe.$(document).find("#map");
	}
    }
    
    function setMapSearch(){
	myMapIframe=$("#associatedMap")[0].contentWindow || $("#associatedMap")[0];
	var searchResults=myMapIframe.app.getSearchValues();
	searchMap=myMapIframe.app.getMap();

	myMapIframe.app.externalCallbacks["addLayer"]=function(a){
	    console.log("**--** OK **--**");
	    console.log(a);
	    console.log("**--** OK **--**");
	    for(var i=0;i<a.layers.length;i++)
		$("#addedLayers").append('<option data-map="'+a.mapfile+'" value="'+a.layers[i]+'">'+a.labels[i]+'</option>');
	    try{
		if(geometryFields){
		    console.log(geometryFields);
		    if(geometryFieldsFirstRun){
			for(var j=0;j<geometryFields.length;j++){
			    $("select[name='"+geometryFields[j]+"_mmlayer']").html("");
			}
			geometryFieldsFirstRun=false;
		    }
		    for(var j=0;j<geometryFields.length;j++)
			for(var i=0;i<a.layers.length;i++){
			    $("select[name='"+geometryFields[j]+"_mmlayer']").append('<option data-map="'+a.mapfile+'" value="'+a.layers[i]+'">'+a.labels[i]+'</option>');
			}
		}
	    }catch(e){
		console.log("No geometryFields: "+e);
	    }
	    registerAddedLayersEvent();
	};

	$('button[mm-action="processLayer"]').off('click');
	$('button[mm-action="processLayer"]').on('click',function(){
	    var currentElement=$(this);
	    console.log("Run service !");
	    if($("select[name='processing_service']").val().indexOf("Selection")>=0){
		startSelectFeatures();
		return;
	    }
	    var params=[];
	    var layer1,layer2,serviceName;
	    layer1=null;
	    layer2=null
	    serviceName=$("select[name='processing_service']").find("option:selected").text();
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
			    // maxFeatures="1000000"
			    var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0" outputFormat="text/xml; subtype=gml/3.1.1">'+
				'<wfs:Query xmlns:ms="http://geolabs.fr/" typeName="'+$(this).val()+'">'+
				'</wfs:Query>'+
				'</wfs:GetFeature>';
			    if(originalExtent && $(this).parent().find("input[name='fixExtent']").is(":checked")){
				var format1=new ol.format.WFS();
				wfsRequest=format1.writeGetFeature({
				    featureNS: "wfs",
				    featurePrefix: "wfs",
				    featureTypes: [$(this).val()],
				    geometryName: "msGeometry",
				    srsName: 'EPSG:4326',
				    version: "2.0.0",
				    filter: new ol.format.filter.Intersects("msGeometry",originalExtent.getGeometry().clone().transform("EPSG:3857","EPSG:4326"),"EPSG:4326")
				});
				wfsRequest=(eval(module.config().msVersion.split(".")[0])>=7?$(wfsRequest)[0].outerHTML:$(wfsRequest)[0].outerHTML.replace(/1.1.0/g,"1.0.0"));
			    }
			    layer2=$(this).find("option:selected").text();
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
	    layer1=$("#addedLayers").find("option:selected").text();
	    if($("#addedLayers").find("option:selected").attr("data-map") && $("#addedLayers").find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0)
		wfsUrl=module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map");
	    l2=$(this).find("option:selected").text();

	    //maxFeatures="1000000"
	    var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0"  outputFormat="text/xml; subtype=gml/3.1.1">'+
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

	    var myDataInputs=null;
	    if(originalExtent && $(this).parent().find("input[name='fixExtent']").is(":checked")){
		var format1=new ol.format.WFS();
		wfsRequest=format1.writeGetFeature({
		    featureNS: "wfs",
		    featurePrefix: "wfs",
		    featureTypes: [$("#addedLayers").val()],
		    geometryName: "msGeometry",
		    srsName: 'EPSG:4326',
		    version: "2.0.0",
		    filter: new ol.format.filter.Intersects("msGeometry",originalExtent.getGeometry().clone().transform("EPSG:3857","EPSG:4326"),"EPSG:4326")
		});
		wfsRequest=(eval(module.config().msVersion.split(".")[0])>=7?$(wfsRequest)[0].outerHTML:$(wfsRequest)[0].outerHTML.replace(/1.1.0/g,"1.0.0"));
		// Create WPS POST Request to be embedded to call the Append service
		var opts=zoo.getRequest({
		    identifier: "vector-converter.Ogr2Ogr",
		    dataInputs: [
			{
			    "identifier":"InputDS",
			    "href": module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map"),
			    "value": wfsRequest,
			    "mimeType": "text/xml",
			    "method": "POST",
			    "headers": [
				{
				    "key":"Content-Type",
				    "value":"text/xml"
				}
			    ]
			},
			{"identifier":"InputDSN","value": module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map"),"dataType":"string"},
			{"identifier":"OutputDSN","value": "QueryResult"+(new Date().valueOf())+".xml","dataType":"string"},
			{"identifier":"dialect","value": "sqlite","dataType":"string"},
			{"identifier":"F","value": "GML","dataType":"string"},
			{"identifier": "s_srs", "value": "+proj=latlong +datum=WGS84 +axis=neu +wktext", "dataType":"string"},
			{"identifier": "t_srs", "value": "+proj=latlong +datum=WGS84 +axis=enu +wktext", "dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"OutputedDataSourceName","mimeType":"application/json","type": "raw"}
		    ],
		    type: 'POST',
		    storeExecuteResponse: false
		});
		console.log(opts);
		window["gselectFeatures_request"]=function(){
		    console.log(wfsRequest.innerHTML);
		    //var tmp=document.createElement("div");
		    //tmp.appendChild(wfsRequest.cloneNode(false));
		    return opts.data;
		};
		console.log(module.config());
		// Create DataInputs parameter to pass to the Append service
		myDataInputs=[
		    {
			"identifier":param1,
			"href": module.config().url,
			"value": opts.data,
			"mimeType":"text/xml",
			"method": "POST",
			"headers":[
			    {
				"key":"Content-Type",
				"value":"text/xml"
			    }
			]
		    }
		];

	    }

	    if($('select[name="processing_service"]').val()=="Voronoi" ||
	       $('select[name="processing_service"]').val()=="RVoronoi"){
		param1="InputPoints";
		var fwkt=new ol.format.GeoJSON();
		var feature = new ol.Feature({
		    geometry: originalExtent.getGeometry().clone().transform("EPSG:3857","EPSG:4326"),
		    name: "Extent"
		});
		var myGeom=fwkt.writeFeatures([feature]);
		params.push({"identifier":"InputPolygon","value": myGeom, "mimeType": "application/json"});
	    }
	    if(originalExtent && $(this).parent().find("input[name='fixExtent']").is(":checked") && myDataInputs!=null){
		params.push(myDataInputs[0]);
	    }else
		params.push({"identifier":param1,"href": wfsUrl,"value": wfsRequest, "mimeType": "text/xml", "method": "POST","headers":[{"key":"Content-Type","value":"text/xml"}]});
	    console.log(params);
            if($('select[name="processing_service"]').val()=="createGrid")
                zoo.execute({
                    "identifier": "vector-tools.createGrid",
                    "type": "POST",
                    dataInputs: params,
                    dataOutputs: [
                        {"identifier":"Result","mimeType":"text/plain"}
                    ],
                    success: function(data){
                        console.log("SUCCESS !");
                        console.log(data);
                        var lmap=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Data"]["ComplexData"].toString();
                        console.log(lmap);
                        console.log(myMapIframe);

			myMapIframe.app.addLayerToMap({
                            mapfile: lmap,
                            layers: ["currentGrid"],
                            labels: [$("#layerTitle").val()],
                            listHTML: $("#layerTitle").val(),
                            cselection: ""
                        });

			$("#layerTitle").val("");
			
			$(".notifications").notify({
			    message: { text: data.text },
			    type: 'success',
			}).show();
                        //myMapIframe.app.addALayer({map: lmap, layer: "currentGrid"});
                    },
                    error: function(data){
                        console.log("ERROR !");
                        console.log(data);
                    }
                });
            else{
	    /*zoo.execute({
		"identifier": ($('select[name="processing_service"]').val()=="RVoronoi"?"RVoronoi2":"vector-tools."+$('select[name="processing_service"]').val()),//+($('select[name="processing_service"]').val()!="Voronoi"?"Py":"")),
		"type": "POST",
		dataInputs: params,
		dataOutputs: [
		    {"identifier":"Result","mimeType":"image/png"}
		],
		success: function(data){
		    if (data.ExecuteResponse.ProcessOutputs) {
			console.log("SUCCESS !");
			var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
			var mapParts=ref.split('&');
			console.log(mapParts[0]);
			var mapParts=mapParts[0].split("=");
			console.log(mapParts[1]);
			myMapIframe.app.addLayerToMap({
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
			
		    }
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		}
		});*/

	    
		zoo.execute({
		    "identifier": ($('select[name="processing_service"]').val()=="RVoronoi"?"RVoronoi2":"vector-tools."+$('select[name="processing_service"]').val()),//"vector-tools."+$('select[name="processing_service"]').val()+($('select[name="processing_service"]').val()!="Voronoi"?"Py":""),
		    "type": "POST",
		    dataInputs: params,
		    dataOutputs: [
			{"identifier":"Result","mimeType":"image/png"}
		    ],
		    storeExecuteResponse: true,
		    status: true,
		    success: function(data){
			var cid=0;
			for(var i in zoo.launched)
			    cid=i;

			currentElement.parent().append(managerTools.generateFromTemplate($("#processLayer_template").html(),["_N_","_V_","_P_","L1","S","L2"],[cid,$("#layerTitle").val(),"",layer1,serviceName,layer2]));
			
			$("#layerTitle").val("");

			var progress=currentElement.parent().find('input[name="processLayer_'+cid+'"]').first().parent().next().children().first();
			progress.parent().show();
			progress.removeClass("progress-bar-success");
			progress.attr("aria-valuenow",0);
			progress.css('width', (0)+'%');
			zoo.watch(cid, {
			    onPercentCompleted: function(data) {
				progress.css('width', (eval(data.percentCompleted))+'%');
				progress.attr("aria-valuenow",eval(data.percentCompleted));
				progress.text(data.text+' : '+(data.percentCompleted)+'%');
			    },
			    onProcessSucceeded: function(data) {
				progress.attr("aria-valuenow",100);
				progress.css('width', (100)+'%');
				progress.text(data.text+' : '+(100)+'%');
				progress.addClass("progress-bar-success");
				if (data.result.ExecuteResponse.ProcessOutputs) {
				    console.log("SUCCESS !");
				    var ref=data.result["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
				    var mapParts=ref.split('&');
				    console.log(mapParts[0]);
				    var mapParts=mapParts[0].split("=");
				    console.log(mapParts[1]);
				    myMapIframe.app.addLayerToMap({
					mapfile: mapParts[1],
					layers: ["Result"],
					labels: [currentElement.parent().find('input[name="processLayer_'+cid+'"]').val()],//$("#layerTitle").val()],
					listHTML: currentElement.parent().find('input[name="processLayer_'+cid+'"]').val(),//$("#layerTitle").val(),
					cselection: ""
				    });
				    $("#layerExtract").find('form:gt(0)').remove();
				    console.log(data);
				    console.log(mapParts);

				    $(".notifications").notify({
					message: { text: data.text },
					type: 'success',
				    }).show();
				}
			    },
			    onError: function(data) {
				progress.attr("aria-valuenow",100);
				progress.css('width', (100)+'%');
				progress.text(data.text+' : '+(100)+'%');
				try{
				    $(".notifications").notify({
					message: { text: data["result"]["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
					type: 'danger',
				    }).show();
				}catch(e){
				    console.log(" !! CANNOT RUN NOTIFY !! ");
				    console.log(e);
				}
			    },
			});
		    },
		    error: function(data){
			console.log("ERROR !");
			console.log(data);
		    }
		});
	    }
	});

	$("#associatedMap").contents().find( "#search_value").val(arguments[0]);
	$("#associatedMap").contents().find( "#search_value").typeahead('val',arguments[0],false);
	myMapIframe=$("#associatedMap")[0].contentWindow || $("#associatedMap")[0];
	var searchResults=myMapIframe.app.getSearchValues();
	searchMap=myMapIframe.app.getMap();
	if(searchResults[0]){
	    var myContent=myMapIframe.$(document).find("#map");
	    var extent=searchResults[1][searchResults[0].indexOf(arguments[0])];
	    console.log(extent);
	    if(!extent)
		hasFeature=true;
	    else
		hasFeature=false;
	    
	    searchMap.getView().fit(extent, { size: [myContent.width(),myContent.height()], nearest: false });
	    //searchMap.getView().fit(extent,searchMap.getSize());
	    
	    var myGeom=ol.geom.Polygon.fromExtent(extent);
	    var feature = new ol.Feature({
		geometry: myGeom,
		name: arguments[0]
	    });
	    myMapIframe.app.addASelectedFeature([feature]);

	    originalExtent=feature.clone();

	    $("#pcreategrid").find("input[name='id']").val(mainTableSelectedId);
	    $("#pcreategrid").find("input[name='extent']").val(extent[0]+","+extent[1]+","+extent[2]+","+extent[3]);
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
			console.log(myMapIframe);
			myMapIframe.app.addLayerToMap({
			    mapfile: lmap,
			    layers: ["currentGrid"],
			    labels: [$("#layerTitle").val()],
			    listHTML: $("#layerTitle").val(),
			    cselection: ""
			});

			//myMapIframe.app.addALayer({map: lmap, layer: "currentGrid"});
		    },
		    error: function(data){
			console.log("ERROR !");
			console.log(data);
		    }
		});
	    });
	}

	
	//sensible();
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
			    //myMapIframe.app.addALayer({map: lmap, layer: "currentGrid"});
			},
			error: function(data){
			    console.log("ERROR !");
			    console.log(data);
			}
		    });
		    //var lmap=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Data"]["ComplexData"].toString();
		    //console.log(lmap);
		    //myMapIframe.app.addALayer({map: lmap, layer: "currentGrid"});
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		}
	    });
	    
	    /**/
	    
	});
    }

    function bindReport(){
	$("#sql").find('button').off('click');
	$("#sql").find('button').on('click',function(){
	    var localContext=$(this);
	    console.log(localContext);
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
		    var wfsUrl=module.config().msUrl+'?map='+module.config().dataPath+"/maps/search_Overlays_"+$("#addedLayers").val()+".map";
		    console.log($("#addedLayers").find("option:selected").attr("data-map"));
		    if($("#addedLayers").find("option:selected").attr("data-map").indexOf("project_Overlays.map")<0)
			wfsUrl=module.config().msUrl+'?map='+$("#addedLayers").find("option:selected").attr("data-map");
		    var properties=$("#addedLayers").find('option:selected').attr("data-properties").split(',');
		    var propertiesXML="";
		    for(var j=0;j<properties.length;j++) {
			if(properties[j]!="")
			    propertiesXML+="<wfs:PropertyName>"+properties[j]+"</wfs:PropertyName>";
		    }

		    var wfsRequest='<wfs:GetFeature xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" xmlns:wfs="http://www.opengis.net/wfs" service="WFS" version="1.0.0"  outputFormat="text/xml; subtype=gml/3.1.1">'+
			'<wfs:Query xmlns:ms="http://geolabs.fr/" typeName="'+$("#addedLayers").val()+'">'+propertiesXML+
			'</wfs:Query>'+
			'</wfs:GetFeature>';

		    var voutputs=[
			{"identifier":"OutputedDataSourceName","mimeType":"application/json",type:"raw"}
		    ];
		    if($("#sql").find("input[type=checkbox]").first().is(":checked")){
			voutputs=[
			    {"identifier":"OutputedDataSourceName","mimeType":"image/png"}
			];
		    }
		    zoo.execute({
			"identifier": "vector-converter.Ogr2Ogr",
			"type": "POST",
			dataInputs: [
			    {"identifier":"InputDS","href": wfsUrl,"value": wfsRequest, "mimeType": "text/xml", "method": "POST","headers":[{"key":"Content-Type","value":"text/xml"}]},
			    {"identifier":"InputDSN","value": jsonObj[0],"dataType":"string"},
			    {"identifier":"OutputDSN","value": "QueryResult"+(new Date().valueOf())+".json","dataType":"string"},
			    {"identifier":"dialect","value": "sqlite","dataType":"string"},
			    {"identifier":"F","value": "GeoJSON","dataType":"string"},
			    {"identifier":"sql","value": localContext.parent().find('textarea').val().replace(/<T>/g,'"'+jsonObj[1]+'"'), "mimeType": "application/json"}
			],
			dataOutputs: voutputs,
			success: function(data){
			    console.log("SUCCESS !");
			    console.log(data);
			    if($("#sql").find("input[type=checkbox]").first().is(":checked")){
				var ref=data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"];
				var mapParts=ref.split('&');
				console.log(mapParts[0]);
				var mapParts=mapParts[0].split("=");
				console.log(mapParts[1]);
				myMapIframe.app.addLayerToMap({
				    mapfile: mapParts[1],
				    layers: ["OutputedDataSourceName"],
				    labels: [$("#layerTitle").val()],
				    listHTML: $("#layerTitle").val(),
				    cselection: ""
				});
				$("#layerExtract").find('form:gt(0)').remove();
				$("#layerTitle").val("");
				console.log(data);
				console.log(mapParts);

			    }
			    else{
			    if($("#layerTitle").val().indexOf("Table Filter:")<0 && $("#sqlQueryIdentifiers").find("option:selected").text().indexOf("Table Filter:")<0){
				var contentHTML='<table id="myDataTable" class="display"  cellspacing="0" width="100%">';
				for(var i=0;i<data["features"].length;i++){
				    if(i==0){
					contentHTML+="<thead>";
					for(var j in data["features"][i]["properties"]){
					    contentHTML+="<th>"+j+"</th>";
					}
					contentHTML+="</thead>";
				    }
				    if(i==0)
					contentHTML+="<tbody>";
				    contentHTML+="<tr>";
				    for(var j in data["features"][i]["properties"]){
					contentHTML+="<td>"+data["features"][i]["properties"][j]+"</td>";
				    }				    
				    contentHTML+="</tr>";
				    if(i==0)
					contentHTML+="</tbody>";
				}
				contentHTML+='</table>';
				console.log(contentHTML);
				var tmp=$("#template_layerQuery_display")[0].innerHTML.replace(/CONTENT/g,contentHTML);
				$("#queryLayerResult").html(tmp);
				    
				    // Fill the X and Y field select lists
				    if(data["features"].length>0){
					$("#queryLayerDiagramX").html("");
					$("#queryLayerDiagramY").html("");
					var cnt=0;
					for(var j in data["features"][0]["properties"]){
					    $("#queryLayerDiagramX").append("<option "+(cnt==1?'disabled="true"':"")+">"+j+"</option>");
					    $("#queryLayerDiagramY").append("<option "+(cnt==0?'disabled="true"':"")+">"+j+"</option>");
					    cnt++;
					}
				    }
				    $("#my-modal").find('table').DataTable({
					language: {
					    url: module.config().translationUrl
					},
					fixedHeader: true,
					responsive: false,
					deferRender: true,
					crollCollapse:    true,
				    });
				    $("#my-modal").find("button").first().off('click');
				    $("#my-modal").find("button").last().off('click');
				    (function(ldata){
					$("#layerQueryParameters").find("button").first().on('click',function(){
					    console.log(ldata);
					    printQueryGraph(ldata);
					});
				    if(sqlQueriesCallbacks!=null)
					sqlQueriesCallbacks();
				    $("#my-modal").find("button").last().on('click',function(){
					console.log(ldata);
					console.log($("#sqlQuery").val());
					console.log($("#queryLayerDiagramTitle").val());
					console.log($("#queryLayerDiagramType").val());
					console.log($("#queryLayerDiagramX").val());
					console.log($("#queryLayerDiagramY").val());
					var lparams=[
				            {"identifier": "table",value:"mm_tables.query_references",dataType:"string"},
				            {"identifier": "query",value:$("#sqlQuery").val(),mimeType:"text/plain"},
				            {"identifier": "name",value:$("#queryLayerDiagramTitle").val(),dataType:"string"},
				            {"identifier": "g_type",value:$("#queryLayerDiagramType").val(),dataType:"string"},
				            {"identifier": "x_col",value:$("#queryLayerDiagramX").val(),dataType:"string"},
				            {"identifier": "y_col",value:$("#queryLayerDiagramY").val(),dataType:"string"},
					    {"identifier": "table_id",value:$('#listing').first().find('input[name=mainTableId]').val(),dataType:"string"},
					];
					var procId="np.insertElement";
					if($("#sqlQueryIdentifiers").val()!="-1") {
					    lparams.push({"identifier": "id",value:$("#sqlQueryIdentifiers").val(),dataType:"string"});
					    procId="np.updateElement";
					}
					zoo.execute({
					    "identifier": procId,
					    "type": "POST",
					    dataInputs: lparams,
					    dataOutputs: [
						{"identifier":"Result","type":"raw"},
					    ],
					    success: function(data){
						console.log("SUCCESS");
						console.log(data);
						console.log("SUCCESS");
					    },
					    error: function(data){
						console.log("ERROR");
						console.log(data);
						console.log("ERROR");
					    }
					});
					console.log(lparams);
					console.log(params);
					//printQueryGraph(ldata);
				    });
				})(data);
				$("#layerQueryParameters").find("button").first().click();
				$('#my-modal').modal('show');
				$('#home-tab').click();
				$('#my-modal').draggable({ handle: ".modal-header" });
			    }else{
				var cfilters=[];
				console.log("Register station filter");
				for(i=0;i<data["features"].length;i++){
				    cfilters.push({"x": data["features"][i]["properties"]["x"],"y": data["features"][i]["properties"]["y"],"linkClause": "OR"});
				}
				console.log(cfilters);
				var ctable=null;
				try{
				    ctable=$("#layerTitle").val().split(":")[1].replace(/ /g,"");
				}catch(e){
				    ctable=$("#sqlQueryIdentifiers").find('option:selected').text().split(":")[1].replace(/ /g,"");
				}
				console.log(ctable);
				zoo.execute({
				    "identifier": "template.display",
				    "type": "POST",
				    dataInputs: [
					{"identifier":"tmpl","value":"public/modules/tables/reports","dataType":"string"},
					{"identifier":"table","value":ctable,"dataType":"string"},
				    ],
				    dataOutputs: [
					{"identifier":"Result","type":"raw"},
				    ],
				    success: function(data){
					console.log("SUCCESS");
					console.log(data);
					$("#queryLayerResult").html(data);
					$("#queryLayerResult").find(".btn").off("click");
					$("#queryLayerResult").find(".btn").on("click", function(){
					    //	$("[data-mmaction=runPrint]").click(function(){
					    var closure=$(this);
					    $(this).addClass("disabled");
					    console.log($(this).children().first().next());
					    $(this).children().first().next().show();
					    $(this).children().first().hide();
					    var tableId=null;
					    var tupleId=null;

					    tableId=$(this).parent().find('input[name=report_table_id]').val();

					    params=[
						{identifier: "tableId", value: tableId, dataType: "string"},
						{identifier: "id", value: -1, dataType: "string"},
						{identifier: "rid", value: $(this).parent().find('input[name="report_report_id"]').val(), dataType: "string"},
						{"identifier":"filters","value":JSON.stringify(cfilters, null, ' '),"mimeType":"application/json"}
					    ];
					    
					    closure=$(this);
					    var progress=closure.parent().find(".progress-bar").first();
					    progress.css('display','block');
					    progress.parent().show();
					    zoo.execute({
						identifier: 'np.clientPrint',
						type: 'POST',
						dataInputs: params,
						dataOutputs: [
						    {"identifier":"Result","mimeType":"application/json"},
						],
						storeExecuteResponse: true,
						status: true,
						success: function(data, launched) {
						    zoo.watch(launched.sid, {
							onPercentCompleted: function(data) {
							    console.log("**** PercentCompleted ****");
							    console.log(data);
							    progress.css('width', (data.percentCompleted)+'%');
							    progress.text(data.text+' : '+(data.percentCompleted)+'%');
							    progress.attr("aria-valuenow",data.percentCompleted);
							    //infomsg.html(data.text+' : '+(data.percentCompleted)+'%');
							},
							onProcessSucceeded: function(data) {
							    progress.css('width', (100)+'%');
							    progress.text(data.text+' : '+(100)+'%');
							    progress.attr("aria-valuenow",100);
							    closure.removeClass("disabled");
							    closure.children().first().show();
							    closure.children().first().next().hide();
							    closure.parent().parent().find(".report_display").html('');
							    var ul=$(managerTools.generateFromTemplate($("#"+closure.parent().parent().attr("id")+"_link_list").html(),[],[]));
							    if (data.result.ExecuteResponse.ProcessOutputs) {
								console.log("**** onSuccess ****");
								console.log(data.result.ExecuteResponse.ProcessOutputs.Output.Data.ComplexData["__cdata"]);
								var ldata=eval(data.result.ExecuteResponse.ProcessOutputs.Output.Data.ComplexData["__cdata"]);
								for(i=0;i<ldata.length;i++){
								    var format="odt";
								    var classe="fa-file-text-o";
								    if(ldata[i].indexOf("pdf")>0){
									format="pdf";
									classe="fa-file-pdf-o";
								    }
								    if(ldata[i].indexOf("doc")>0){
									format="doc";
									classe="fa-file-word-o";
								    }
								    if(ldata[i].indexOf("html")>0){
									format="html";
									classe="fa-code";
								    }
								    ul.find(".list-group").append(
									managerTools.generateFromTemplate($("#"+closure.parent().parent().attr("id")+"_link").html(),["link","format","class"],[ldata[i],format,classe])
								    );
								}
								closure.parent().parent().find(".report_display").html(ul);
								progress.parent().hide();
							    }
							},
							onError: function(data) {
							    console.log("**** onError ****");
							    console.log(data);
							},
						    });
						},
						error: function(data) {
						    console.log("**** ERROR ****");
						    console.log(data);
						    notify("Execute asynchrone failed", 'danger');
						    closure.removeClass("disabled");
						    closure.children().first().show();
						    closure.children().first().next().hide();
						    closure.parent().parent().find(".report_display").html('<div class="alert alert-danger">'+data["ExceptionReport"]["Exception"]["ExceptionText"].toString()+'</div>');
						}
					    });

					    /*adminBasic.callService("np.clientPrint",params,function(data){
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
					    });*/
					//	});

					});
					console.log("SUCCESS");
				    },
				    error: function(data){
					console.log("ERROR");
					console.log(data);
					console.log("ERROR");
				    }
				});

			    }
			}
			},
			error: function(data){
			    console.log("ERROR !");
			    console.log(data);
			    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
			}
		    });
		},
		error: function(data){
		    console.log("ERROR !");
		    console.log(data);
		}
	    });
	    
	    /**/
	    
	});
    }

    function printQueryGraph(data){
	var field_x=$("#queryLayerDiagramX").val();
	var field_y=$("#queryLayerDiagramY").val();
	var categories=[];
	var series=[{
	    "name": $("#queryLayerDiagramTitle").val(),
	    "data": []
	}];
	if($("#queryLayerDiagramType").val()=='pie'){
	    series=[];
	    for(var i=0;i<data["features"].length;i++){
		categories.push({
		    "name": data["features"][i]["properties"][field_x],
		    "y": data["features"][i]["properties"][field_y]
		});
	    }    
	    series.push({
		"name": field_y,
		"data": categories 
	    });
	    console.log(series);
	}else
	    for(var i=0;i<data["features"].length;i++){
		categories.push(data["features"][i]["properties"][field_x]);
		series[0]["data"].push(data["features"][i]["properties"][field_y]);
	    }
	Highcharts.chart("layerQueryDiagram", {
	    chart: {
		type: $("#queryLayerDiagramType").val(),
		renderTo: $('#layerQueryDiagram')
	    },
	    title: {
		text: $("#queryLayerDiagramTitle").val(),
		align: 'high'
            },
	    xAxis: {
		categories: ($("#queryLayerDiagramType").val()!='pie')?categories:[],
		crosshair: true
	    },
	    yAxis: {
		min: 0,
		title: {
		    text: ''
		}
	    },
	    tooltip: {
		shared: true,
		useHTML: true
	    },
	    plotOptions: {
		column: {
		    pointPadding: 0.1,
		    borderWidth: 0.1
		},		
	    },
	    series: series
	});
    }

    function bindEndDependencies(myObject,celement,l,myElement1,oObject){
	console.log(l);
	console.log(oObject);
	var myElement=celement.parent().find("select[name='"+l+"']");
	console.log(myElement);
	if(myObject["dependents"])
	    for(var i1 in myObject["dependents"]){
		for(var j1 in myObject["dependents"][i1]){
		    var myObjectInner=myObject["dependents"][i1][j1];
		    console.log(myObjectInner);
		    zoo.execute({
			"identifier": "template.display",
			"type": "POST",
			dataInputs: [
			    {"identifier":"tmpl","value":"public/modules/tables/fetchDependencies_js","dataType":"string"},
			    {"identifier":"elements","value":JSON.stringify([myObjectInner]),"mimeType":"application/json"}
			],
			dataOutputs: [
			    {"identifier":"Result","type":"raw"},
			],
			success: function(data){
			    console.log(data);
			    var myElement=celement.parent().find("select[name='"+j1+"']");
			    for(var i in data){
				for(var j in data[i]){
				    if(myObjectInner["options"].indexOf(data[i][j][0])<0){
					myObjectInner["options"].push(data[i][j][0]);
					console.log(data[i][j][0]);
				    }
				}
			    }
			    for(var i in data[0]){
				myElement.append('<option value="'+data[0][i][0]+'">'+data[0][i][1]+'</option>');
			    }
			    myElement1.off("change");
			    myElement1.on("change",function(){
				console.log("Pre dependents !");
				for(var i1 in myObject["dependents"]){
				    for(var j1 in myObject["dependents"][i1]){
					var myElement0=celement.parent().find("select[name='"+j1+"']");
					myElement0.html("");
					var myObjectInner=myObject["dependents"][i1][j1];
					console.log(myObjectInner);
					console.log(data);
					for(var li in data[$(this).val()]){
					    myElement0.append('<option value="'+data[$(this).val()][li][0]+'">'+data[$(this).val()][li][1]+'</option>');
					    console.log(li);
					}
					myElement0.change();
				    }
				}
				console.log(myObject);
				console.log(l);
			    });
			    myElement1.change();
			    if(!myObjectInner["dependents"]){
				console.log("Run the same comedy again for on change on myElement !");
				bindEndDependencies(myObjectInner,celement,l,myElement1,oObject);
			    }
			},
			error: function(data){
			    console.log("ERROR");
			    console.log(data);
			}
		    });
		}
	    }
	else{
	    console.log("Run the same comedy again for on change on myElement !");
	    zoo.execute({
		"identifier": "template.display",
		"type": "POST",
		dataInputs: [
		    {"identifier":"tmpl","value":"public/modules/tables/fetchDependencies_js","dataType":"string"},
		    {"identifier":"elements","value":JSON.stringify(oObject),"mimeType":"application/json"}
		],
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    console.log(data);
		    var myElement=celement.parent().find("select#"+celement.attr("id").replace(/runFirst_/g,"")+"");
		    console.log(myElement);
		    console.log(myObject);
		    console.log(l);
		    myElement.prev().find("select").last().off("change");
		    myElement.prev().find("select").last().on("change",function(){
			console.log("Run the same comedy again for on change on myElement !");
			console.log(data);
			console.log(data[$(this).val()]);
			try{
			    /*$(this).parent().next().html("");*/
			    var myElement0=$(this).parent().parent().parent().find("select[name='edit_"+data[$(this).val()]["id"]+"']");
			    myElement0.html("");
			    for(var li in data[$(this).val()]["value"]){
				myElement0.append('<option value="'+data[$(this).val()]["value"][li][0]+'">'+data[$(this).val()]["value"][li][1]+'</option>');
				console.log(li);
			    }
			    myElement0.change();
			}catch(e){
			    console.log(e);
			}
		    });
		    myElement.prev().find("select").last().change();
		},
		error: function(data){
		    console.log("ERROR");
		    console.log(data);
		}
	    });

	}

	/*myElement.off("change");
	  myElement.on("change",function(){
	  console.log("Pre dependents !");
	  for(var i1 in myObject["dependents"]){
	  for(var j1 in myObject["dependents"][i1]){
	  var myObjectInner=myObject["dependents"][i1][j1];
	  console.log(myObjectInner);
	  }
	  }
	  console.log(myObject);
	  console.log(l);
	  });*/

    }
    
    function getWin(){
	return win;
    }
    
    // Return public methods
    return {
        initialize: initialize,
	datepicker: datepicker,
	embedded: embedded,
	initializeMap: initializeMap,
	bindFilterLayer: bindFilterLayer,
	win: getWin
    };



});


