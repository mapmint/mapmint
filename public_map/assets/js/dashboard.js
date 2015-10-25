// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic'
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic) {
    

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

    function userTables(ltype,lid,fields,rfields){
	var cnt=0;
	var CRowSelected=[];
	var CFeaturesSelected=[];
	var CFeatures=[];

	$("."+ltype+"BaseEditForm").on("addClass",function(){
	    var closure=this;
	    $("."+ltype+"BaseEditForm").each(function(){
		if($(this).attr('id')!=$(closure).attr('id') && $(this).hasClass("in")){
		    $(this).removeClass("in");
		}
	    });
	});

	var myRootLocation=$('#'+lid).parent().parent();

	$('#'+lid).DataTable( {
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
		var opts=zoo.getRequest({
		    identifier: "manage-users.getTableFeatures",
		    dataInputs: [
			{"identifier":"table","value":ltype+"s","dataType":"string"},
			{"identifier":"offset","value":llimit[0],"dataType":"int"},
			{"identifier":"limit","value":llimit[1],"dataType":"int"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"search","value":llimit[llimit.length-1],"dataType":"string"},
			{"identifier":"sortname","value":(closestproperties.split(",")[llimit[2]]),"dataType":"string"},
			{"identifier":"fields","value":closestproperties.replace(/,msGeometry/g,""),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","mimeType":"application/json"},
			{"identifier":"Count","dataType":"string"}
		    ],
		    type: 'POST',
		    storeExecuteResponse: false
		});
		
		console.log(opts);
		opts["success"]=function() {
		    console.log(arguments);
		    var obj=_x2js.xml_str2json( arguments[2].responseText );
		    console.log(obj);
		    var outputs=obj["ExecuteResponse"]["ProcessOutputs"]["Output"];
		    for(var i in outputs){
			if(outputs[i]["Identifier"].toString()=="Count")
			    featureCount=eval(outputs[i]["Data"]["LiteralData"].toString());
			if(outputs[i]["Identifier"].toString()=="Result")
			    features=JSON.parse(outputs[i]["Data"]["ComplexData"].toString());
		    }
		    var data=[];
		    CFeatures=[];
		    console.log(features);
		    for(var i in features.rows){
			console.log(features.rows[i]);
			var lparams={
			    "groups": features.rows[i].group,
			    "fid": ltype+"s_"+features.rows[i].id			    
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
		    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
			$('<span class="select-item"/>').append('dd rows selected'.replace(/dd/g,CRowSelected.length))
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
		    $(".require-"+ltype+"-select").removeClass("disabled");
		    
		CRowSelected.push( id );

		$('#'+lid).DataTable().row("#"+id).select();

		console.log(CFeatures.length);
		for(var i=0;i<CFeatures.length;i++){
		    console.log(CFeatures[i]["fid"]);
		    if(CFeatures[i]["fid"]==id)
		       CFeaturesSelected.push( CFeatures[i] );
		}
		$("."+ltype+"EditForm").find("input").each(function(){
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
			if($(this).attr("type")!="checkbox")
			    $(this).val(CFeaturesSelected[0][attribute].replace(reg0,""));
			else{
			    console.log(CFeaturesSelected[0][attribute].replace(reg0,""));
			    $(this).prop("checked",CFeaturesSelected[0][attribute].replace(reg0,"")=="1");
			}
		    }
		});

		var cnt=0;
		$(".um_groups_f").find("select").each(function(){
		    if(cnt>0)
			$(this).remove();
		    cnt+=1;
		});
		var myNewElement=null;
		$(".um_groups_f").find("select").each(function(){
		    myNewElement=$(this).clone();
		});

		console.log(CFeaturesSelected[0]);
		for(var i=0;i<CFeaturesSelected[0].groups.length;i++)
		    $("#update-"+ltype).find(".um_groups_f").each(function(){
			$(this).append($(myNewElement).attr("id","um_group_"+i)[0].outerHTML);
			$(this).find("select").last().val(CFeaturesSelected[0].groups[i][1]);
			console.log($(this).parent().parent().find("select").length);
			if($(this).find("select").length>1)
			    $(this).find(".gselectDel").show();
			else
			    $(this).find(".gselectDel").hide();
		    });
		


	    } else {
		$("."+ltype+"BaseEditForm").removeClass("in");
		console.log("REMOVE "+index);
		CRowSelected.pop(index);
		console.log(CFeaturesSelected);
		CFeaturesSelected.pop(index);
		console.log(CFeaturesSelected);
		$('#'+lid).DataTable().row("#"+id).deselect();
		if(CFeaturesSelected==0)
		    $(".require-"+ltype+"-select").addClass("disabled");
	    }
	    var existing=$('#'+lid+'_info').children('span.select-info');
	    if(existing.length)
		existing.remove();
	    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
		$('<span class="select-item"/>').append((CFeaturesSelected.length!=CRowSelected.length?'dd rows selected (ee total selected)'.replace(/dd/g,CRowSelected.length).replace(/ee/g,CFeaturesSelected.length):'dd rows selected'.replace(/dd/g,CRowSelected.length)))
	    ));
	} );

	console.log("***************************************");
	console.log("."+ltype+"SubmitForm");
	console.log(myRootLocation);
	console.log(myRootLocation.find("."+ltype+"SubmitForm"));
	console.log($('#'+lid).parent().find("."+ltype+"SubmitForm"));
	myRootLocation.find("."+ltype+"SubmitForm").click(function(e){
	    var params=[];
	    var set={};
	    var rType=null;
	    var attId="set";
	    var pIdentifier="manage-users.Update"+(ltype=="group"?"Group":"User");
	    var myForm=$(this).parent()

	    var reg0=new RegExp(ltype+'_',"g");
	    var reg1=new RegExp(ltype+'s_',"g");

	    $(this).parent().find("input").each(function(){
		if($(this).attr('id')=="um_utype"){
		    rType=$(this).val();
		    params.push({identifier: "type",value: $(this).val(),dataType: "string"});
		    if(rType=="insert"){
			if(ltype=="user")
			    pIdentifier="manage-users.AddUser";
			attId=ltype;
		    }
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
			    if($(this).val()!="")
				params.push({identifier: "clause",value: 'id='+$(this).val().replace(reg1,""),dataType: "string"});
			}
		    }
		}
	    });	    
	    $(this).parent().find("select").each(function(){
		if($(this).attr('name')=="group")
		    params.push({identifier: $(this).attr("name").replace(reg0,""),value: $(this).val(),dataType: "string"});
	    });
	    params.push({identifier: attId,value: JSON.stringify(set),mimeType: "application/json"});
	    //if(rType!="insert")
	    if(ltype=="user" && rType!="insert")
		params.push({identifier: "login",value: set.login,dataType: "string"});

	    
	    console.log(CRowSelected[0]);

	    //params.push({identifier: "login",value: user.login,dataType: "string"});
		
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
			$("#insert-"+ltype).find("input").each(function(){
			    if($(this).attr("name"))
				$(this).val("");
			});
		    }else{
			$('.require-'+ltype+'-select').addClass("disabled");
		    }
		    $('.'+ltype+'BaseEditForm').removeClass("in");
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

    }
    
    var initialize=function(){
	var closure=this;

	adminBasic.initialize(zoo);

	$('#side-menu').css({"max-height": ($(window).height()-50)+"px","overflow":"scroll"});
	//console.log($(window).height());



	$(".gselectDel").hide();
	//console.log(myForms);
	$(".gselectAdd").click(function(e){
	    var myNewElement=$("#insert-user").find("select").last().clone();
	    $(this).parent().parent().append($(myNewElement).attr("id","um_group_"+$(this).parent().parent().find("select").length)[0].outerHTML);
	    if($(this).parent().parent().find("select").length>1)
		$(this).parent().parent().find(".gselectDel").show();
	    else
		$(this).find(".gselectDel").hide();
	    return false;
	});
	$(".gselectDel").click(function(e){
	    if($(this).parent().parent().find("select").length>1)
		$(this).parent().parent().find("select").last().remove();
	    if($(this).parent().parent().find("select").length==1)
		$(this).hide();
	    return false;
	});

	$("#dashOverview,#dashUsers").on("addClass",function(){
	    $(".sidebar").find(".nav-third-level").each(function(){
		$(this).removeClass("in");
		$(this).find(".active").removeClass("active");
	    });
	});
	
	console.log($(".userBaseEditForm").find("form").length);
	$(".userBaseEditForm").find("form").each(function(){
	    $(document).on("focus",".userBaseEditForm input",function(){
		$(this).validator();
	    });
	});
	console.log($(".userBaseEditForm").find("form").length);

	$(".userBaseEditForm").on("addClass",function(){
	    var closure=this;
	    $(".userBaseEditForm").each(function(){
		if($(this).attr('id')!=$(closure).attr('id') && $(this).hasClass("in")){
		    $(this).removeClass("in");
		}
	    });
	});


	var myForms=[];
	$(".mmform").each(function(){
	    myForms.push($(this).attr("id"));
	    $(this).find("button").each(function(){
		$(this).click(function(e){
		    var params=[];
		    $($(this).data("target")).find("textarea").each(function(){
			if($(this).attr("name") && $(this).val())
			    params.push({
				"identifier": $(this).attr("name"),
				"value": ($(this).code().indexOf("<div>")==0?"":"<div>")+$(this).code()+($(this).code().indexOf("<div>")==0?"":"</div>"),
				"mimeType": "text/plain"
			    });
		    });
		    $($(this).data("target")).find("input").each(function(){
			if($(this).attr("name") && $(this).val())
			    params.push(createParam(this));
		    });
		    console.log(params);
		    zoo.execute({
			identifier: "configuration.SaveConf",
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
			},
			error: function(data){
			    $(".notifications").notify({
				message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
				type: 'danger',
			    }).show();
			}
		    });
		    return true;
		});
	    });
	    
	    
	    $(this).find("textarea").each(function(){
		var closure=$(this);
		window.setTimeout(function () { 
		    closure.summernote();
		},500);
	    });

	});

	window.setTimeout(function () { 
	    var substringMatcher = function(strs) {
		return function findMatches(q, cb) {
		    var matches, substringRegex;
		    
		    // an array that will be populated with substring matches
		    matches = [];
		    
		    // regex used to determine if a string contains the substring `q`
		    substrRegex = new RegExp(q, 'i');
		    
		    // iterate through the pool of strings and for any string that
		    // contains the substring `q`, add it to the `matches` array
		    $.each(strs, function(i, str) {
			if (substrRegex.test(str)) {
			    matches.push(str);
			}
		    });
		    
		    cb(matches);
		};
	    };

	    $.ajax({
		url: "./srs_list.js",
		method: 'GET',
		success: function(){
		    var srsList=eval(arguments[0]);
		    $('#scrollable-dropdown-menu .typeahead').typeahead(null, {
			name: 'countries',
			limit: 50,
			source: substringMatcher(srsList),
			itemSelected: function(e){ 
			    console.log("UPDATER CALLED");
			    console.log(e);
			}
		    }).on("typeahead:selected", function(obj, datum, name) {
			console.log(obj, datum, name);
			$('#scrollable-dropdown-menu .typeahead').blur();
			$('#srsAdd').removeClass("disabled");
			$('#srsAdd').attr("value",datum);
		    });
		    
		}
	    });
	    $('#scrollable-dropdown-menu .typeahead').click(function(){
		$(this).val("");
		$('#srsAdd').addClass("disabled");
	    });
	}, 100);
	
	$('#srsAdd,.srsDel').click(function(){
	    console.log($(this));
	    console.log($(this).val());
	    $(this).data("value");
	    var closure=this;
	    var favSrs=($(this).attr("id")=="srsAdd"?true:false);
	    zoo.execute({
		identifier: "datastores.saveFavSrs",
		type: "POST",
		dataInputs: [
		    {"identifier": "srs_field","value": "id","dataType":"string"},
		    {"identifier": "srs_id","value": $(this).attr("value"),"dataType":"string"},
		    {"identifier": "fav","value": (favSrs?"true":"false"),"dataType":"boolean"},
		],
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    $('#scrollable-dropdown-menu .typeahead').val("");
		    $(".notifications").notify({
			message: { text: data },
			type: 'success',
		    }).show();
		    if(!favSrs){
			$(closure).parent().remove();
			$("#srsNb").html(eval($("#srsNb").text()+"-1"));
		    }else{
			$("#srsNb").html(eval($("#srsNb").text()+"+1"));
			var myNewElement=$("#dashSrsBody .list-group").find("a").last().clone();
			$("#dashSrsBody .list-group").append($(myNewElement)[0].outerHTML);
			$("#dashSrsBody .list-group").find("a").last().children().first().text($(closure).attr("value"));
			$("#dashSrsBody .list-group").find("button").last().attr("value",$(closure).val());
		    }
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });

	    return false;
	});

	/*
	$(".userSubmitForm").click(function(e){
	    var params=[];
	    var user={};
	    var rType=null;
	    var attId="set";
	    var pIdentifier="manage-users.UpdateUser";
	    var myForm=$(this).parent()
	    $(this).parent().find("input").each(function(){
		if($(this).attr('id')=="um_utype"){
		    rType=$(this).val();
		    params.push({identifier: "type",value: $(this).val(),dataType: "string"});
		    if(rType=="insert"){
			pIdentifier="manage-users.AddUser";
			attId="user";
		    }
		}
		else{
		    if($(this).attr("name")){
			if($(this).attr("name")!="user_fid")
			    if($(this).is(":visible"))
				user[$(this).attr("name").replace(/user_/g,"")]=$(this).val();
			else
			    if($(this).val()!="")
				params.push({identifier: "clause",value: 'id='+$(this).val(),dataType: "string"});
		    }
		}
	    });	    
	    $(this).parent().find("select").each(function(){
		if($(this).attr('name')=="group")
		    params.push({identifier: $(this).attr("name").replace(/user_/g,""),value: $(this).val(),dataType: "string"});
	    });
	    params.push({identifier: attId,value: JSON.stringify(user),mimeType: "application/json"});
	    //if(rType!="insert")
	    params.push({identifier: "login",value: user.login,dataType: "string"});
		
	    console.log(params);
	    console.log(rType);
	    zoo.execute({
		identifier: pIdentifier,
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
		    var dataTable = $('#dashUsersTable').dataTable();
		    CRowSelected=[];
		    CFeaturesSelected=[];
		    $("#dashUsersTable").dataTable().fnDraw();
		    if(rType=="insert"){
			$("#insert-user").find("input").each(function(){
			    if($(this).attr("name"))
				$(this).val("");
			});
		    }else{
			$(".require-select").addClass("disabled");
		    }
		    $(".userBaseEditForm").removeClass("in");
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
	*/

	var cnt=0;

	window.setTimeout(function () { 
	var CRowSelected=[];
	var CFeaturesSelected=[];
	var CFeatures=[];

	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );

	    /*
	$('#dashUsersTable').DataTable( {
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
	    columns: [
		{"data":"login","name":"login","title":"login","width":"10%"},
		{"data":"lastname","name":"lastname","title":"lastname","width":"15%"},
		{"data":"firstname","name":"firstname","title":"firstname","width":"15%"},
		{"data":"mail","name":"mail","title":"email","width":"30%"},
		{"data":"phone","name":"phone","title":"phone","width":"20%"}
	    ],
	    "rowCallback": function( row, data ) {
		console.log(CRowSelected);
		console.log(data.DT_RowId);
		$(row).removeClass('selected');
		console.log($(row));
		console.log($.inArray(data.DT_RowId, CRowSelected) !== -1 );
		if ( $.inArray(data.DT_RowId, CRowSelected) !== -1 ) {
		    console.log(data.DT_RowId);
		    console.log($('#dashUsersTable').DataTable());
		    $('#dashUsersTable').DataTable().row($(row)).select();
		    //$(row).addClass('selected');
		}else{
		    $('#dashUsersTable').DataTable().row($(row)).deselect();
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

		var closestproperties="login,lastname,firstname,mail,phone";
		var opts=zoo.getRequest({
		    identifier: "manage-users.getTableFeatures",
		    dataInputs: [
			{"identifier":"table","value":"users","dataType":"string"},
			{"identifier":"offset","value":llimit[0],"dataType":"int"},
			{"identifier":"limit","value":llimit[1],"dataType":"int"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"search","value":llimit[llimit.length-1],"dataType":"string"},
			{"identifier":"sortname","value":(closestproperties.split(",")[llimit[2]]),"dataType":"string"},
			{"identifier":"fields","value":closestproperties.replace(/,msGeometry/g,""),"dataType":"string"}
		    ],
		    dataOutputs: [
			{"identifier":"Result","mimeType":"application/json"},
			{"identifier":"Count","dataType":"string"}
		    ],
		    type: 'POST',
		    storeExecuteResponse: false
		});
		
		console.log(opts);
		opts["success"]=function() {
		    console.log(arguments);
		    var obj=_x2js.xml_str2json( arguments[2].responseText );
		    console.log(obj);
		    var outputs=obj["ExecuteResponse"]["ProcessOutputs"]["Output"];
		    for(var i in outputs){
			if(outputs[i]["Identifier"].toString()=="Count")
			    featureCount=eval(outputs[i]["Data"]["LiteralData"].toString());
			if(outputs[i]["Identifier"].toString()=="Result")
			    features=JSON.parse(outputs[i]["Data"]["ComplexData"].toString());
		    }
		    var data=[];
		    CFeatures=[];
		    console.log(features);
		    for(var i in features.rows){
			console.log(features.rows[i]);
			data.push({
			    "groups": features.rows[i].group,
			    "fid": "users_"+features.rows[i].id,
			    "login": features.rows[i].cell[0],
			    "lastname": features.rows[i].cell[1],
			    "firstname": features.rows[i].cell[2],
			    "mail": features.rows[i].cell[3],
			    "phone": features.rows[i].cell[4]			    
			});
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
			    $('#dashUsersTable').DataTable().row($("#"+data[d].fid)).select();
			}else{
			    $('#dashUsersTable').DataTable().row($("#"+data[d].fid)).deselect();
			}
		    }

		    
		    if(featureCount==0){
			$('#dashUsersTable').DataTable().clear();
			console.log("clear table");
		    }
		    
		    console.log(CRowSelected);
		    var existing=$('#dashUsersTable_info').children('span.select-info');
		    if(existing.length)
			existing.remove();
		    $('#dashUsersTable_info').append($('<span class="select-info"/>').append(
			$('<span class="select-item"/>').append('dd rows selected'.replace(/dd/g,CRowSelected.length))
		    ));
		    console.log('finish');
		    

		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});

	$('#dashUsersTable tbody').on('click', 'tr', function () {
	    var id = this.id+"";
	    console.log("CURRENT ID: "+id);
	    var index = $.inArray(id, CRowSelected);
	    if ( index == -1 ) {
		if(CFeaturesSelected.length==0)
		    $(".require-select").removeClass("disabled");
		
		CRowSelected.push( id );

		$('#dashUsersTable').DataTable().row("#"+id).select();

		console.log(CFeatures.length);
		for(var i=0;i<CFeatures.length;i++){
		    console.log(CFeatures[i]["fid"]);
		    if(CFeatures[i]["fid"]==id)
		       CFeaturesSelected.push( CFeatures[i] );
		}
		$(".userEditForm").find("input").each(function(){
		    if($(this).attr("name") && CFeaturesSelected[0][$(this).attr("name").replace(/user_/g,'')]){
			$(this).val(CFeaturesSelected[0][$(this).attr("name").replace(/user_/g,'')].replace(/users_/g,""));
		    }
		});

		var cnt=0;
		$(".um_groups_f").find("select").each(function(){
		    if(cnt>0)
			$(this).remove();
		    cnt+=1;
		});
		var myNewElement=null;
		$(".um_groups_f").find("select").each(function(){
		    myNewElement=$(this).clone();
		});

		console.log(CFeaturesSelected[0]);
		for(var i=0;i<CFeaturesSelected[0].groups.length;i++)
		    $("#update-user").find(".um_groups_f").each(function(){
			$(this).append($(myNewElement).attr("id","um_group_"+i)[0].outerHTML);
			$(this).find("select").last().val(CFeaturesSelected[0].groups[i][1]);
			console.log($(this).parent().parent().find("select").length);
			if($(this).find("select").length>1)
			    $(this).find(".gselectDel").show();
			else
			    $(this).find(".gselectDel").hide();
		    });
		


	    } else {
		$(".userBaseEditForm").removeClass("in");
		console.log("REMOVE "+index);
		CRowSelected.pop(index);
		console.log(CFeaturesSelected);
		CFeaturesSelected.pop(index);
		console.log(CFeaturesSelected);
		$('#dashUsersTable').DataTable().row("#"+id).deselect();
		if(CFeaturesSelected==0)
		    $(".require-select").addClass("disabled");
	    }
	    var existing=$('#dashUsersTable_info').children('span.select-info');
	    if(existing.length)
		existing.remove();
	    $('#dashUsersTable_info').append($('<span class="select-info"/>').append(
		$('<span class="select-item"/>').append((CFeaturesSelected.length!=CRowSelected.length?'dd rows selected (ee total selected)'.replace(/dd/g,CRowSelected.length).replace(/ee/g,CFeaturesSelected.length):'dd rows selected'.replace(/dd/g,CRowSelected.length)))
	    ));
	} );
*/
	},100);
	console.log("Start Dashboard");
	$(".btn-lg").on("click",function(){
	    var params=[];
	    $(this).parent().find("input").each(function(){
		if($(this).attr("type")=="checkbox"){
		    if($(this).is(":checked"))
			params.push(createParam(this));
		}else{
		    params.push(createParam(this));
		}
	    });
	    zoo.execute({
		identifier: "authenticate.logIn",
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
		    document.location.reload(false);
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	    return false;
	});


	    
	userTables(
	    "user",
	    "dashUsersTable",
	    [
		{"data":"login","name":"login","title":"login","width":"10%"},
		{"data":"lastname","name":"lastname","title":"lastname","width":"15%"},
		{"data":"firstname","name":"firstname","title":"firstname","width":"15%"},
		{"data":"mail","name":"mail","title":"email","width":"30%"},
		{"data":"phone","name":"phone","title":"phone","width":"10%"}
	    ],
	    "login,lastname,firstname,mail,phone"
	);
	    
	userTables(
	    "group",
	    "dashGroupsTable",
	    [
		{"data":"name","name":"name","title":"name","width":"10%"},
		{"data":"description","name":"description","title":"description","width":"15%"}
	    ],
	    "name,description,adm"
	);

    };

    // Return public methods
    return {
        initialize: initialize
    };



});

