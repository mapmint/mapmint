// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic', 'ol','datasources','mmDataTables','rowReorder','colorpicker','slider',"sortable","colReorder","managerTools","dataTables"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,ol,datasources,MMDataTable,rowReorder,colorpicker,slider,sortable,colReorder,managerTools,dataTables) {
    

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
    var reg0=new RegExp("tables_","");
    var reloadElement=true;
    var tableName="p_tables";
    var fileName="";
    var System_infoTable=null;
    var uploadedFile=null;

    /**
     * loadElements is a function used to load all the elements for displaying the corresponding dataTable
     */
    function loadElements(table,init){
	zoo.execute({
	    identifier: "np.list",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "mm_tables."+table,"dataType":"string"}
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
			loadAnElement(localId,true);
		    }
		}
		else
		    for(var i=0;i<data.length;i++){
			if(data[i]["selected"]){
			    if($("#listElements").find("#document_"+data[i]["id"]).length){
				$("#listElements").find("#document_"+data[i]["id"]).click();
			    }else{
				loadAnElement(data[i]["id"],true);
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

    /**
     * fillForm is a function used to display the tuple stored in the data parameter
     */
    function fillForm(data){
	$(".project-title").html(data["name"]+' <i class="fa fa-'+(data["published"]=="false"?"exclamation":"check")+'"> </i>');
	var myRootLocation=$(".theForm");
	var reg=new RegExp("tables_","");

	myRootLocation.find("textarea").each(function(){
	    if(!$(this).attr("id"))
		return;
	    console.log($(this).attr("id"));
	    console.log($(this).attr("id").replace(reg,""));
	    if($(this).attr("id").replace(reg,"")=="description"){
		console.log($(this).attr("id"));
		$(this).code(data[$(this).attr("id").replace(reg,"")]);
	    }
	    else
		$(this).val(data[$(this).attr("id").replace(reg,"")]).change();
	});

	
	myRootLocation.find("input[type=text],input[type=hidden],select").each(function(){
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


	console.log(data.mmDesc);

	if(System_infoTable)
	    System_infoTable.destroy();
	System_infoTable=$('#infoTable').DataTable( {
            data: data.mmDesc,
	    paging:  false,
	    searching: false,
	    autoWidth: false,
            columns: [
		{ title: "Position",width: "5%" },
		{ title: "Name",width: "25%" },
		{ title: "Type",width: "5%" },
		{ title: "Key",width: "5%" },
		{ title: "Ref. Table",width: "10%" },
		{ title: "Ref. Field",width: "5%" }
            ]
	} );
	
	myRootLocation.find("#pg_schema").off("change");
	myRootLocation.find("#pg_schema").change(function(){
	    adminBasic.loadTablesList(module.config().db,$(this).val(),myRootLocation.find("#pg_table"),
				      function(){
					  myRootLocation.find("#pg_table").val(data["name"]);
				      });
	});

	if(data["name"]!=null){
	    var tmp=data["name"].split('.');
	    myRootLocation.find("#pg_schema").val(tmp[0]).change();
	}


    }

    /**
     * bindOrder is a function used when the user change the column to be ordered
     */
    function bindOrder(){
	$("#layer_property_table_table_display").find("input[name=order]").off('click');
	$("#layer_property_table_table_display").find("input[name=order]").on('click',function(e){
	    if($(this).is(':checked')){
		$("#layer_property_table_table_display").find("input[name=order]").each(function(){
		    $(this).prop("checked",false);
		    $(this).next().hide();
		});
		$(this).prop("checked",true);
		$(this).next().show();
	    }
	});
    }

    function loadAView(data,id){
	var cbody="";
	console.log(!data.mmViews[id]);
	if(!data.mmViews[id]){
	    console.log(data.mmDesc);
	    $("#tables_view_id").val("-1");
	    $("#tables_view_title").val("");
	    $("#tables_view_clause").val("");
	    $("#tables_view_visible").prop("checked",true);
	    var tmp=["groups","themes"];
	    for(var i=0;i<tmp.length;i++){
		$("#tables_view_"+tmp[i]).find("option").each(function(){
		    $(this).prop("selected",false);
		});
	    }
	    for(var i=0;i<data.mmDesc.length;i++){
		cbody+=managerTools.generateLineTemplate(
		    [
			"id",
			"order",
			"orderType",
			"asc",
			"desc",
			"display",
			"search",
			"name",
			"label",
			"value",
			"width"
		    ],
		    [
			i,
			(i==0?"checked=checked":""),
			(i!=0?'style="display:none"':''),
			(i==0?"checked=checked":""),
			"",
			"checked=checked",
			"checked=checked",
			data.mmDesc[i][1],
			data.mmDesc[i][1],
			data.mmDesc[i][1],
			"20%"
		    ]
		);
	    }
	    $("#mm_layer_property_table_display").html(managerTools.generateFromTemplate($("#layer_property_table_template").html(),["tbody"],[cbody]));
	    $('#layer_property_table_table_display').DataTable({
		rowReorder:       true,
		"scrollX":        true,
		"scrollY":        (($("#indicators_form_eye").height())-($(".navbar").height()*6))+"px",
		"scrollCollapse": true,
		autoWidth:        false,
		"paging":         false,
		//"info":           false,
		//"responsive":     true,
		//deferRender:      true,
		bFilter:          false
	    });
	    bindOrder();
	    bindAddRow();
	    bindDeleteRow();
	    return;
	}else{
	    for(var i in data.mmViews[id].view){
		console.log(i);
		if(data.mmViews[id].view[i].indexOf("]")<0){
		    console.log(i);
		    console.log((data.mmViews[id].view[i]=="True"));
		    if(i=="visible")
			$("#tables_view_visible").prop("checked",(data.mmViews[id].view[i]=="True"));
		    else
			$("#tables_view_"+i.replace(/name/g,"title")).val(data.mmViews[id].view[i]);
		}
		else{
		    console.log(i);
		    var obj=JSON.parse(data.mmViews[id].view[i]);
		    console.log(obj);
		    for(var j=0;j<obj.length;j++)
			$("#tables_view_"+i).find("option").each(function(){
			    if($(this).attr("value")==obj[j]){
				console.log($(this).attr("value"));
				console.log(obj[j]);
				console.log($(this).attr("value")==obj[j]);
				$(this).prop("selected",true);
			    }
			});
		}
		console.log($("#tables_view_"+i));
	    }
	    for(var i=0;i<data.mmViews[id].fields.length;i++){
		console.log(data.mmViews[id].fields[i]);
		cbody+=managerTools.generateLineTemplate(
		    [
			"id",
			"order",
			"orderType",
			"asc",
			"desc",
			"display",
			"search",
			"name",
			"label",
			"value",
			"width"
		    ],
		    [
			i,
			(data.mmViews[id].fields[i].class!="None"?"checked=checked":""),
			(data.mmViews[id].fields[i].class!="None"?"":'style="display:none"'),
			(data.mmViews[id].fields[i].class=="1"?"selected='selected'":""),
			(data.mmViews[id].fields[i].class=="2"?"selected='selected'":""),
			(data.mmViews[id].fields[i].view=="True"?"checked=checked":""),
			(data.mmViews[id].fields[i].search=="True"?"checked=checked":""),
			(data.mmViews[id].fields[i].name!=null?data.mmViews[id].fields[i].name:data.mmViews[id].fields[i].alias),
			data.mmViews[id].fields[i].alias,
			data.mmViews[id].fields[i].value,
			data.mmViews[id].fields[i].width
		    ]
		);
	    }
	    $("#mm_layer_property_table_display").html(managerTools.generateFromTemplate($("#layer_property_table_template")[0].innerHTML,["tbody"],[cbody]));
	    $('#layer_property_table_table_display').DataTable({
		rowReorder:       true,
		"scrollX":        true,
		"scrollY":        (($("#indicators_form_eye").height())-($(".navbar").height()*6))+"px",
		"scrollCollapse": true,
		autoWidth:        false,
		"paging":         false,
		//"info":           false,
		//"responsive":     true,
		//deferRender:      true,
		bFilter:          false
	    });
	    bindOrder();
	    bindAddRow();
	    bindDeleteRow();
	}
    }

    function loadAnEdit(data,id){
	var ebody="";
	console.log(!data.mmEdits[id]);
	var tmp=["groups","themes"];
	for(var i=0;i<tmp.length;i++){
	    $("#tables_edition_"+tmp[i]).find("option").each(function(){
		$(this).prop("selected",false);
	    });
	}
	if(!data.mmEdits[id]){
	    $("#tables_edition_id").val("-1");
	    $("#tables_edition_title").val("");
	    $("#tables_edition_step").val("");
	    console.log(data.mmDesc);
	    for(var i=0;i<data.mmDesc.length;i++){
		ebody+=managerTools.generateFromTemplate(
		    $("#edition_line_template").html(),
		    [
			"id",
			"display",
			"search",
			"name",
			"label",
			"value",
			"width"
		    ],
		    [
			i,
			"checked=checked",
			"checked=checked",
			data.mmDesc[i][1],
			data.mmDesc[i][1],
			data.mmDesc[i][1],
			"100%"
		    ]
		);
	    }	    
	    $("#mm_edition_table_display").html("");
	    console.log($("#mm_edition_table_display"));
	    $("#mm_edition_table_display").html(managerTools.generateFromTemplate($("#edition_template").html(),["tbody"],[ebody]));
	    console.log(managerTools.generateFromTemplate($("#edition_template").html(),["tbody"],[ebody]));
	    $('#edition_table_display').DataTable({
		rowReorder:       true,
		"scrollX":        true,
		"scrollY":        (($("#indicators_form_eye").height())-($(".navbar").height()*6))+"px",
		"scrollCollapse": true,
		autoWidth:        false,
		"paging":         false,
		//"info":           false,
		//"responsive":     true,
		//deferRender:      true,
		bFilter:          false
	    });
	    bindOrder();
	    bindAddRow();
	    bindDeleteRow();
	    return;
	}else{
	    for(var i in data.mmEdits[id].view){
		if(data.mmEdits[id].view[i].indexOf("]")<0)
		    $("#tables_edition_"+i.replace(/name/g,"title")).val(data.mmEdits[id].view[i]);
		else{
		    var obj=JSON.parse(data.mmEdits[id].view[i]);
		    for(var j=0;j<obj.length;j++)
			$("#tables_edition_"+i).find("option").each(function(){
			    console.log($(this).attr("value"));
			    console.log(obj[j]);
			    console.log($(this).attr("value")==obj[j]);
			    if($(this).attr("value")==obj[j]){
				$(this).prop("selected",true);
			    }
			});
		}
		console.log($("#tables_edition_"+i));
	    }
	    for(var i=0;i<data.mmEdits[id].fields.length;i++){
		console.log(data.mmEdits[id].fields[i]);
		ebody+=managerTools.generateFromTemplate(
		    $("#edition_line_template")[0].innerHTML,
		    [
			"id",
			"display",
			"name",
			"label",
			"dependencies",
			"value",
			"width"
		    ],
		    [
			i,
			(data.mmEdits[id].fields[i].edition=="True"?"checked=checked":""),
			data.mmEdits[id].fields[i].name,
			data.mmEdits[id].fields[i].alias,
			data.mmEdits[id].fields[i].dependencies,
			data.mmEdits[id].fields[i].value,
			"100%"
		    ]
		);
	    }
	    $("#mm_edition_table_display").html(managerTools.generateFromTemplate($("#edition_template")[0].innerHTML,["tbody"],[ebody]));
	    var i=0;
	    $("#mm_edition_table_display").find("select[name=ftype]").each(function(){
		$(this).val(data.mmEdits[id].fields[i].ftype);
		i+=1;
		$(this).find("option:selected").each(function(){
		    if($(this).text()=="Reference"){
			$(this).parent().parent().find("textarea").show();
		    }else
			$(this).parent().parent().find("textarea").hide();
		});
		$(this).off('change');
		$(this).change(function(){
		    if($(this).find('option:selected').text()=="Reference"){
			$(this).parent().find("textarea").show();
		    }else
			$(this).parent().find("textarea").hide();
		});
	    });

	    $('#edition_table_display').DataTable({
		rowReorder:       true,
		"scrollX":        true,
		"scrollY":        (($("#indicators_form_eye").height())-($(".navbar").height()*6))+"px",
		"scrollCollapse": true,
		autoWidth:        false,
		"paging":         false,
		//"info":           false,
		//"responsive":     true,
		//deferRender:      true,
		bFilter:          false
	    });
	    bindOrder();
	    bindAddRow();
	    bindDeleteRow();
	}
    }

    function loadAReport(data,id){
	var ebody="";
	console.log(!data.mmReports[id]);
	if(!data.mmReports[id]){
	    $("#tables_report_id").val("-1");
	    $("#tables_report_title").val("");
	    $("#tables_report_clause").val("");
	    var tmp=["groups"];
	    for(var i=0;i<tmp.length;i++){
		$("#tables_report_"+tmp[i]).find("option").each(function(){
		    $(this).prop("selected",false);
		});
	    }
	    for(var i=0;i<data.mmDesc.length;i++){
		ebody+=managerTools.generateFromTemplate(
		    $("#report_line_template").html(),
		    [
			"id",
			"display",
			"search",
			"name",
			"label",
			"value",
			"width"
		    ],
		    [
			i,
			"checked=checked",
			"checked=checked",
			data.mmDesc[i][1],
			data.mmDesc[i][1],
			data.mmDesc[i][1],
			"100%"
		    ]
		);
	    }	    
	    $("#mm_report_table_display").html(managerTools.generateFromTemplate($("#report_template").html(),["tbody"],[ebody]));
	    $('#report_table_display').DataTable({
		rowReorder:       true,
		"scrollX":        true,
		"scrollY":        (($("#indicators_form_eye").height())-($(".navbar").height()*6))+"px",
		"scrollCollapse": true,
		autoWidth:        false,
		"paging":         false,
		//"info":           false,
		//"responsive":     true,
		//deferRender:      true,
		bFilter:          false
	    });
	    bindOrder();
	    bindAddRow();
	    bindDeleteRow();
	    return;
	}else{
	    for(var i in data.mmReports[id].view){
		if(data.mmReports[id].view[i].indexOf("]")<0)
		    $("#tables_report_"+i.replace(/name/g,"title")).val(data.mmReports[id].view[i]);
		else{
		    var obj=JSON.parse(data.mmReports[id].view[i]);
		    for(var j=0;j<obj.length;j++)
			$("#tables_report_"+i).find("option").each(function(){
			    console.log($(this).attr("value"));
			    console.log(obj[j]);
			    console.log($(this).attr("value")==obj[j]);
			    if($(this).attr("value")==obj[j])
				$(this).prop("selected",true);
			});
		}
		console.log($("#tables_report_"+i));
	    }
	    for(var i=0;i<data.mmReports[id].fields.length;i++){
		console.log(data.mmReports[id].fields[i]);
		ebody+=managerTools.generateFromTemplate(
		    $("#report_line_template").html(),
		    [
			"id",
			"name",
			"value",
			"width"
		    ],
		    [
			i,
			data.mmReports[id].fields[i].name,
			data.mmReports[id].fields[i].value,
			(data.mmReports[id].fields[i].edition=="True"?"checked=checked":""),
			"100%"
		    ]
		);
	    }
	    $("#mm_report_table_display").html(managerTools.generateFromTemplate($("#report_template")[0].innerHTML,["tbody"],[ebody]));
	    var i=0;
	    $("#mm_report_table_display").find("select[name=ftype]").each(function(){
		$(this).val(data.mmReports[id].fields[i].ftype);
		i+=1;
	    });

	    $('#report_table_display').DataTable({
		rowReorder:       true,
		"scrollX":        true,
		"scrollY":        (($("#indicators_form_eye").height())-($(".navbar").height()*6))+"px",
		"scrollCollapse": true,
		autoWidth:        false,
		"paging":         false,
		//"info":           false,
		//"responsive":     true,
		//deferRender:      true,
		bFilter:          false
	    });
	    bindOrder();
	    bindAddRow();
	    bindDeleteRow();
	}
    }
	
    function loadAnElement(id,localTest){
	localId=id;
	//console.log("loadATheme -> "+id);
	$(".fa-spin").removeClass("hide");
	zoo.execute({
	    identifier: "np.details",
	    type: "POST",
	    dataInputs: [
		{"identifier": "table","value": "mm_tables."+tableName,"dataType":"string"},
		{"identifier": "id","value": id,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log('ok 001');
		fillForm(data);
		console.log($("#view_selector_template").html());
		$("#tables_view_selector").off("change");
		$("#tables_view_selector").change(function(){
		    loadAView(data,$(this).find("option:selected").val());
		});
		if(data.mmViews.length==0){
		    var cbody="";
		    $("#tables_view_selector").html($("#view_selector_template").html());
		    loadAView(data,-1);
		    $("#tables_view_selector").val(data.mmViews.length-1).change();
		}else{
		    var cbody="";
		    var ebody="";
		    console.log(data.mmViews[0].fields.length);
		    if(data.mmViews.length>0){
			$("#tables_view_selector").html($("#view_selector_template").html());
			for(var i=0;i<data.mmViews.length;i++){
			    $("#tables_view_selector").append('<option value="'+i+'">'+data.mmViews[i].view.name+'</option>');
			}
			$("#tables_view_selector").val(data.mmViews.length-1).change();
		    }
		}
		$("#tables_edition_selector").off("change");
		$("#tables_edition_selector").change(function(){
		    loadAnEdit(data,$(this).find("option:selected").val());
		});
		if(data.mmEdits.length==0){
		    var cbody="";
		    $("#tables_edition_selector").html($("#edition_selector_template").html());
		    loadAnEdit(data,-1);
		    $("#tables_edition_selector").val(data.mmEdits.length-1).change();
		}else{
		    var cbody="";
		    var ebody="";
		    console.log(data.mmEdits[0].fields.length);
		    if(data.mmEdits.length>0){
			$("#tables_edition_selector").html($("#edition_selector_template").html());
			for(var i=0;i<data.mmEdits.length;i++){
			    $("#tables_edition_selector").append('<option value="'+i+'">'+data.mmEdits[i].view.name+'</option>');
			}
			$("#tables_edition_selector").val(data.mmEdits.length-1).change();
		    }
		}
		$("#tables_report_selector").off("change");
		$("#tables_report_selector").change(function(){
		    loadAReport(data,$(this).find("option:selected").val());
		});
		if(data.mmReports.length==0){
		    var cbody="";
		    $("#tables_report_selector").html($("#edition_selector_template").html());
		    loadAReport(data,-1);
		    $("#tables_report_selector").val(data.mmReports.length-1).change();
		}else{
		    var cbody="";
		    var ebody="";
		    console.log(data.mmReports[0].fields.length);
		    if(data.mmReports.length>0){
			$("#tables_report_selector").html($("#edition_selector_template").html());
			for(var i=0;i<data.mmReports.length;i++){
			    $("#tables_report_selector").append('<option value="'+i+'">'+data.mmReports[i].view.name+'</option>');
			}
			$("#tables_report_selector").val(data.mmReports.length-1).change();
		    }
		}

		bindAddRow();bindDeleteRow();
		console.log(data.mmDesc);

		if(localTest){
		    $("#tablesForm").find(".nav").find("li").first().children().trigger("click");
		    var lcnt=0;
		    $("#tablesForm").find('.nav').first().find('[role=presentation]').each(function(){
			if(lcnt>1){
			    $(this).prop("disabled",false);
			    $(this).removeClass("disabled");
			}
			lcnt+=1;
		    });
		}
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


    function bindAddRow(){
	var nbItem=[
	    $('#layer_property_table_table_display').DataTable().rows().count(),
	    $('#edition_table_display').DataTable().rows().count()
	];
	var tmp={
	    "indicators_form_eye": [
		"layer_property_table_table_display",
		[
		    managerTools.generateFromTemplate($("#view_table_line_c0_template")[0].innerHTML,['id'],[nbItem[0]]),
		    managerTools.generateFromTemplate($("#view_table_line_c1_template")[0].innerHTML,['order','asc','desc','orderType'],["","","",'style="display:none"']),
		    managerTools.generateFromTemplate($("#view_table_line_c2_template")[0].innerHTML,['display'],[""]),
		    managerTools.generateFromTemplate($("#view_table_line_c3_template")[0].innerHTML,['search'],[""]),
		    managerTools.generateFromTemplate($("#view_table_line_c4_template")[0].innerHTML,['name'],["unamed_"+nbItem[0]]),
		    managerTools.generateFromTemplate($("#view_table_line_c5_template")[0].innerHTML,['label'],["Label "+nbItem[0]]),
		    managerTools.generateFromTemplate($("#view_table_line_c6_template")[0].innerHTML,['value'],["Value "+nbItem[0]]),
		    managerTools.generateFromTemplate($("#view_table_line_c7_template")[0].innerHTML,['width'],["20%"])
		]
	    ],
	    "indicators_form_edit": [
		"edition_table_display",
		[
		    managerTools.generateFromTemplate($("#edition_c0_template")[0].innerHTML,['id'],[nbItem[1]]),
		    managerTools.generateFromTemplate($("#edition_c1_template")[0].innerHTML,['display'],[""]),
		    managerTools.generateFromTemplate($("#edition_c2_template")[0].innerHTML,['name'],["unamed_"+nbItem[1]]),
		    managerTools.generateFromTemplate($("#edition_c3_template")[0].innerHTML,['label'],["Label "+nbItem[1]]),
		    managerTools.generateFromTemplate($("#edition_c4_template")[0].innerHTML,['label'],["Label "+nbItem[1]]),
		    managerTools.generateFromTemplate($("#edition_c5_template")[0].innerHTML,['value'],["Value "+nbItem[1]])
		]
	    ],
	    
	};
	
	for(var i in tmp){
	    $("#"+i).find('button.addRow').first().off("click");
	    (function(i){
		$("#"+i).find('button.addRow').first().on("click",function(){
		    console.log(tmp[i]);
		    nbItem=$('#'+tmp[i][0]).DataTable().rows().count();
		    $('#'+tmp[i][0]).dataTable().fnAddData(tmp[i][1]);
		    bindAddRow();
		    bindDeleteRow();
		    bindOrder();
		});
	    })(i);
	}

    }

    function bindDeleteRow(){
	var tmp={
	    "indicators_form_eye": [
		"layer_property_table_table_display"
	    ],
	    "indicators_form_edit": [
		"edition_table_display"
	    ],	    
	};
	for(var i in tmp){
	    $("#"+tmp[i][0]).find('i.fa-trash').each(function(){
		$(this).parent().off("click");
	    });
	    (function(i){
		$("#"+tmp[i][0]).find('i.fa-trash').each(function(){
		    $(this).parent().on("click",function(e){
			console.log(tmp[i]);
			$('#'+tmp[i][0]).dataTable().fnDeleteRow($(this).parent().parent());
			return true;
		    });
		});
	    })(i);	  
	}
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
	    if(!$(this).attr("id") || $(this).attr("id")=="tables_keywords")
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
		{"identifier": "table","value": tableName,"dataType":"string"},
		{"identifier": "keywords", value: $("#tables_keywords").val(),dataType: "string"},
		{"identifier": "tables_groups_in", value: "i_id",dataType: "string"},
		{"identifier": "tables_groups_out", value: "g_id",dataType: "string"},
		{"identifier": "tables_themes_in", value: "i_id",dataType: "string"},
		{"identifier": "tables_themes_out", value: "t_id",dataType: "string"},
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
		{"identifier": "table","value": "mm_tables."+tableName,"dataType":"string"},
		{"identifier": "name","value": $("#adder").find('#pg_table').val(),"dataType":"string"},
		{"identifier": "title","value": $("#adder").find('input[name="dname"]').val(),"dataType":"string"},
		{"identifier": "description","value": $("#adder").find('input[name="dname"]').val(),"dataType":"string"}
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
		{"identifier": "table","value": tableName,"dataType":"string"},
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
			{"identifier":"table","value":"mm_tables.p_tables","dataType":"string"},
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
		    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
			$('<span class="select-item"/>').append('dd rows selected'.replace(/dd/g,CRowSelected.length))
		    ));
		    
		    loadElements(tableName,localInit);

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
		loadAnElement(localId,true);

	    } else {
		$("."+lid+"BaseEditForm").removeClass("in");
		CRowSelected.pop(index);
		CFeaturesSelected.pop(index);
		$('#'+lid).DataTable().row("#"+id).deselect();
	    }
	    var existing=$('#'+lid+'_info').children('span.select-info');
	    if(existing.length)
		existing.remove();
	    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
		$('<span class="select-item"/>').append((CFeaturesSelected.length!=CRowSelected.length?'dd rows selected (ee total selected)'.replace(/dd/g,CRowSelected.length).replace(/ee/g,CFeaturesSelected.length):'dd rows selected'.replace(/dd/g,CRowSelected.length)))
	    ));
	});
    }

    var fetchInfoAndDisplay=function(data){
	fileName=data;
	var ldata=data;
	zoo.execute({
	    identifier: "vector-tools.mmVectorInfo2Map",
	    type: "POST",
	    dataInputs: [
		{"identifier":"dataSource","value":ldata,"dataType":"string"},
		{"identifier":"force","value":"1","dataType":"integer"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		if(data.datasource){
		    var val="";
		    $("select[name=ifile_page]").html('');
		    if($.isArray(data.datasource.layer)){
			for(var i=0;i<data.datasource.layer.length;i++){
			    val=data.datasource.layer[i].name;
			    $("select[name=ifile_page]").append("<option>"+val+"</option>");
			}
		    }else{
			val=data.datasource.layer.name;
			$("select[name=ifile_page]").append("<option>"+val+"</option>");
		    }
		    getVectorInfo(ldata,val,function(data){
			var reg=new RegExp("\\[datasource\\]","g");
			var reg1=new RegExp("\\[font\\]","g");
			font="fa fa-table";
			console.log("FONT !! "+font);
			console.log($("#DS_indicatorTable_indicator"));
			if($("#DS_indicatorTable_indicator").length)
			    $("#DS_indicatorTable_indicator").remove();
			$("[data-mmaction=join]").first().parent().append($($("#dataSource_template")[0].innerHTML.replace(reg1,font).replace(reg,val)).attr("id","DS_indicatorTable_indicator"));
			managerTools.displayVector(data,ldata,"indicatorTable","indicator",val,
						function(){
						    $("#DS_indicatorTable_indicator").find(".panel").addClass("panel-warning").removeClass("panel-default");
						    $("[data-mmaction=join]").addClass("disabled");
						},
						function(){
						    $("#DS_indicatorTable_indicator").find(".panel").removeClass("panel-warning").addClass("panel-default");
						    $("[data-mmaction=join]").removeClass("disabled");
						}); 
		    });
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

    function getLastFile(func){
	zoo.execute({
	    identifier: "np.getLastFile",
	    type: "POST",
	    dataInputs: [ ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    }


    function getIndicatorInfo(func){
	zoo.execute({
	    identifier: "np.refreshIndex",
	    type: "POST",
	    dataInputs: [
		{"identifier":"id","value":localId,"dataType":"integer"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    }

    function getVectorInfo(dataSource,layer,func){
	zoo.execute({
	    identifier: "vector-tools.mmExtractVectorInfo",
	    type: "POST",
	    dataInputs: [
		{"identifier":"dataSource","value":dataSource,"dataType":"string"},
		{"identifier":"layer","value":layer,"dataType":"integer"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    }

    function fetchFields(datasource,func){
	zoo.execute({
	    identifier: "np.getMapRequest0",
	    type: "POST",
	    dataInputs: [
		{"identifier":"t_id","value":datasource,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		//var obj=_x2js.xml_str2json( data );
		console.log(data.schema.complexType.complexContent.extension.sequence.element);
		if($.isArray(data.schema.complexType.complexContent.extension.sequence.element)){
		    $("#documents_tables_field").html("");
		    for(var i=0;i<data.schema.complexType.complexContent.extension.sequence.element.length;i++){
			var cname=data.schema.complexType.complexContent.extension.sequence.element[i]._name;
			if(cname!="msGeometry")
			    $("#documents_tables_field").append('<option>'+cname+'</option>');
		    }
		}
		if(func)
		    func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});	
    }

    var llcnt=0;

    function insertElem(params,test,func){
	zoo.execute({
	    identifier: "np."+(test?"updateElem":"insertElem"),
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});		
    }

    function insert(params,test,func){
	zoo.execute({
	    identifier: "np.insert",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log(data);
		func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});		
    }

    function callService(service,params,func,outputs){
	var dataOutputs=[
	    {"identifier":"Result","type":"raw"},
	];
	if(outputs)
	    dataOutputs=outputs;
	zoo.execute({
	    identifier: service,
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: dataOutputs,
	    success: function(data){
		func(data);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});		
    }

    function fetchIndicatorInfo(lfunc){
	getIndicatorInfo(function(data){

	    $(".class-switcher").off('change');
	    $(".class-switcher").change(function(){
		console.log(".class-switcher CHANGE ! "+llcnt);
		llcnt+=1;
		var myRootLocation=$(this).parent().parent().parent();
		var index=0;
		var hasElement=true;
		var closure=$(this);
		myRootLocation.find('.no-us').show();
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
		if(data.type!=3)
		    myRootLocation.find(".require-raster").hide();
		myRootLocation.find(".require-add-step").hide();
	    });

	    managerTools.displayVector(data,module.config().db,"indicatorTable","dataTable","indexes.view_idx"+localId,
				       function(){
					   $("#DS_indicatorTable_dataTable").find(".panel").addClass("panel-warning").removeClass("panel-default");
				       },
				       function(){
					   $("#DS_indicatorTable_dataTable").find(".panel").removeClass("panel-warning").addClass("panel-default");
				       }); 

	    //$(".class-switcher").trigger("change");
	    if(lfunc)
		lfunc(data);
	});
    }
    
    function fetchIndexTableAndDisplay(ldata,func){
	console.log('call managerTools.getTableDesc');
	managerTools.getTableDesc(module.config().msUrl,module.config().dataPath+"/PostGIS/"+module.config().db+"ds_ows.map","indexes.view_idx"+localId,ldata,function(obj,rdata,idata){
	    managerTools.loadTableDefinition(obj,idata,function(elem){
		console.log('toto');
		var prefix="";
		if(arguments.length>1)
		    prefix="agregate_";	
		
		///var params=produceParams(prefix);
		var params=[
		    {identifier: "table", value: "d_table",dataType: "string"},
		    {identifier: "name", value: $("#documents_table_title").val(),dataType: "string"},
		    {identifier: "i_id", value: localId,dataType: "string"}	
		];
		if($("#agregation").is(":visible")){
		    test=false;
		    params.push({
			identifier: "tid",
			value: $("#p_tname").val(),
			dataType: "string"
		    });
		}
		test=$("#documents_"+prefix+"table_id")[0] && $("#documents_"+prefix+"table_id").val()!='-1' && $("#documents_"+prefix+"table_id").val()!='';
		if(test){
		    params.push({
			identifier: "id",
			value: localId,
			dataType: "string"
		    });
		}
		if($("#documents_table_steps").is(":visible") && $("#table_step").val()>0)
		    params.push({"identifier":"step","value":($("#documents_table_step")[0].selectedIndex-1),dataType: "string"});
		
		
		$("#mm_layer_property_table_display").find("tbody").find("tr").each(function(){
		    var params0={
			"pos":"",
			"display":"",
			"search":"",
			"var":"",
			"label":"",
			"value":"",
			"width":""
		    };
		    var cnt=0;
		    $(this).find("td").find("input").each(function(){
			if($(this).attr('type')=="checkbox"){
			    var lcnt1=0;
			    for(var k in params0){
				if(lcnt1==cnt)
				    params0[k]=$(this).prop('checked')+"";
				lcnt1+=1;
			    }
			}else{
			    var lcnt1=0;
			    for(var k in params0){
				if(lcnt1==cnt)
				    params0[k]=$(this).val();
				lcnt1+=1;
			    }
			}
			cnt+=1;
		    });
		    params.push({
			identifier:"tuple",
			value:JSON.stringify(params0),
			mimeType: "application/json"
		    });
		});
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
		callService("np.saveIndexTable",params,function(data){
		    $(".notifications").notify({
			message: { text: data },
			type: 'success',
		    }).show();
		});
		
	    });
	    console.log("getTableDesc end");
	    console.log($(".mmFields"));
	    $(".mmFields,.mmField").html("");
	    console.log(rdata);
	    for(var i=0;i<rdata.fields.length;i++){
		if(rdata.fields[i]!="msGeometry")
		    $(".mmFields,.mmField").append('<option>'+rdata.fields[i]+'</option>');
		console.log($(".mmFields"));
	    }
	    /*$("#tables_form_table").find("button").first().click(function(){
	      });*/
	    
	    if(func)
		func(rdata);
	    managerTools.loadStyleDisplay(ldata,[
		{"identifier": "map","value": "Index"+localId,"dataType":"string"},
		{"identifier": "prefix","value": "indexes","dataType":"string"},
		{"identifier": "name","value": "Index"+localId,"dataType":"string"},
		{"identifier": "orig","value": module.config().db,"dataType":"string"},
		{"identifier": "id","value": localId,"dataType":"int"},
		{"identifier": "formula","value": $('#mm_layer_property_style_display').find("textarea[name=formula]").val(),"dataType":"int"},
	    ]);
	    bindClassifier(ldata);

	});
	var reg=new RegExp("\\[datasource\\]","g");
	var reg1=new RegExp("\\[font\\]","g");
	font="fa fa-table";
	
	if($("#DS_indicatorTable_dataTable").length)
	    $("#DS_indicatorTable_dataTable").remove();
	$("#tables_form_table").append($($("#dataSource_template")[0].innerHTML.replace(reg1,font).replace(reg,"indexes.view_idx"+localId)).attr("id","DS_indicatorTable_dataTable"));
	fetchIndicatorInfo();
    }

    var initialize=function(){
	
	adminBasic.initialize(zoo);
	managerTools.initialize(zoo);

	window.setTimeout(function () { 
	    $("textarea#tables_description").summernote();
	},10);

	$('[data-toggle="tooltip"]').tooltip({container: 'body'});

	startDataTable("id,name,title",[
	    {
		"data": "id",
		"name": "id",
		"sWidth": "10%"
	    },
	    {
		"data": "name",
		"name": "name",
		"sWidth": "40%"
	    },
	    {
		"data": "title",
		"name": "title",
		"sWidth": "40%"
	    },
	]);

	$("#adder").find("button").click(function(){
	    addAnElement();
	    $("#adder").removeClass("in");
	});
	$("#deleter").find("button").click(function(){
	    deleteAnElement(localId);
	    $("#deleter").removeClass("in");
	});

	/*$(".tab-pane").css({"max-height":($(window).height()-($(".navbar").height()*3.5))+"px","overflow-y":"auto","overflow-x":"hidden"});
	$("#page-wrapper").find("[role=presentation]").first().children().first().click();
	

	console.log($("#page-wrapper").find("[role=presentation]").first());
	*/

	$("#pg_schema").change(function(){
	    adminBasic.loadTablesList(module.config().db,$(this).val(),$("#pg_table"));
	});

	$("#pg_table").change(function(){
	    runSql(true,$("input[name=data_table_dbname]").val(),"SELECT * FROM "+$(this).val());
	});

	$("#tables_tables_table").change(function(){
	    if($(this).val()!=-1)
		fetchFields($(this).val());
	});

	$("#indicators_form_gear").find("button").last().click(function(e){
	    insertElem([
		{"identifier": "table","value": "mm_tables."+tableName,"dataType":"string"},
		{"identifier": "id","value": $("#indicators_form_gear").find("#tables_id").val(),"dataType":"string"},
		{"identifier": "name","value": $("#indicators_form_gear").find("#pg_table").val(),"dataType":"string"},
		{"identifier": "title","value": $("#indicators_form_gear").find("#tables_title").val(),"dataType":"string"},
		{"identifier": "description","value": $("#indicators_form_gear").find('#tables_description').code(),"mimeType":"application/json"}
	    ],true,function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
	    });
	});

	$("#indicators_form_eye").find("button").last().click(function(e){
	    var objs=[];
	    var reg2=new RegExp('tables_view_',"g");
	    $("#layer_property_table_table_display").find('tr').each(function(){
		var obj={};
		$(this).find("input[name=oname]").each(function(){
		    obj['name']=$(this).val();
		});
		$(this).find("input[type=text],textarea").each(function(){
		    obj[$(this).attr('name')]=$(this).val();
		    console.log($(this));
		});
		$(this).find("input[type=checkbox]").each(function(){
		    if($(this).attr('name')!="order")
			obj[$(this).attr('name')]=$(this).is(":checked")+"";
		    else{
			if($(this).is(":checked"))
			    obj["class"]=$(this).next().val();
		    }
		    console.log($(this));
		});
		$(this).find("select").each(function(){
		    if($(this).attr('name')!="orderType"){
			if($(this).find("option:selected").length>1){
			    obj[$(this).attr('name')]=[];
			    var oid=$(this).attr('name');
			    $(this).find("option:selected").each(function(){
				obj[oid].push($(this).val());
			    });
			}else
			    obj[$(this).attr('name')]=$(this).val();

			//obj[$(this).attr('name')]=$(this).val();
			console.log($(this));
		    }
		});
		for(var i in obj){
		    objs.push(obj);
		    break;
		}
	    });
	    console.log(objs);
	    var multiples=[[],[]];
	    var tmp=["groups","themes"];
	    for(var i=0;i<tmp.length;i++){
		$("#tables_view_"+tmp[i]).find("option:selected").each(function(){
		    multiples[i].push($(this).val());
		});
	    }
	    console.log(multiples);
	    var obj1={
		"name": $("#tables_view_title").val(),
		"clause": $("#tables_view_clause").val(),
		"views_groups": JSON.stringify(multiples[0], null, ' '),
		"views_themes": JSON.stringify(multiples[1], null, ' ')
	    };
	    if($("#tables_view_id").val()!=-1){
		obj1["id"]=$("#tables_view_id").val();
	    }
	    console.log(obj1);
	    var params=[
		{"identifier": "table","value": "mm_tables.p_views","dataType":"string"},
		{"identifier": "columns","value": JSON.stringify(["ptid","name","clause","visible"], null, ' '),"mimeType":"application/json"},
		{"identifier": "links","value": JSON.stringify({"view_groups":{"table":"mm_tables.p_view_groups","ocol":"vid","tid":"gid"},"view_themes":{"table":"mm_tables.p_view_themes","ocol":"vid","tid":"tid"},"vfields":{"table":"mm_tables.p_view_fields","ocol":"vid","tid":"vid"}}, null, ' '),"mimeType":"application/json"},
		{"identifier": "ptid","value": $("#tables_id").val(),"dataType":"string"},
		{"identifier": "name","value": $("#tables_view_title").val(),"dataType":"string"},
		{"identifier": "clause","value": $("#tables_view_clause").val(),"dataType":"string"},
		{"identifier": "visible","value": $("#tables_view_visible").is(":checked"),"dataType":"string"},
		{"identifier": "view_groups","value": JSON.stringify(multiples[0], null, ' '),"mimeType":"application/json"},
		{"identifier": "view_themes","value": JSON.stringify(multiples[1], null, ' '),"mimeType":"application/json"},
		{"identifier": "vfields","value": JSON.stringify(objs, null, ' '),"mimeType":"application/json"}
	    ];
	    if($("#tables_view_id").val()!=-1)
		params.push({"identifier": "id","value": $("#tables_view_id").val(),"dataType":"string"});
	    insert(params,($("#tables_view_id").val()!=-1),function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadAnElement($("#tables_id").val(),false);
	    });
	});

	$("#indicators_form_edit").find("button").last().click(function(e){
	    var objs=[];
	    var reg2=new RegExp('tables_edition_',"g");
	    $("#edition_table_display").find('tr').each(function(){
		var obj={};
		$(this).find("input[name=oname]").each(function(){
		    obj['name']=$(this).val();
		});
		$(this).find("input[type=text],textarea").each(function(){
		    obj[$(this).attr('name')]=$(this).val();
		    console.log($(this));
		});
		$(this).find("input[type=checkbox]").each(function(){
		    if($(this).attr('name')!="order")
			obj[$(this).attr('name')]=$(this).is(":checked")+"";
		    else{
			if($(this).is(":checked"))
			    obj["class"]=$(this).next().val();
		    }
		    console.log($(this));
		});
		$(this).find("select").each(function(){
		    if($(this).attr('name')!="orderType"){
			if($(this).find("option:selected").length>1){
			    obj[$(this).attr('name')]=[];
			    var oid=$(this).attr('name');
			    $(this).find("option:selected").each(function(){
				obj[oid].push($(this).val());
			    });
			}else
			    obj[$(this).attr('name')]=$(this).val();

			//obj[$(this).attr('name')]=$(this).val();
			console.log($(this));
		    }
		});
		for(var i in obj){
		    objs.push(obj);
		    break;
		}
	    });
	    console.log(objs);
	    var multiples=[[],[]];
	    var tmp=["groups","themes"];
	    for(var i=0;i<tmp.length;i++){
		$("#tables_edition_"+tmp[i]).find("option:selected").each(function(){
		    multiples[i].push($(this).val());
		});
	    }
	    console.log(multiples);
	    var obj1={
		"name": $("#tables_edition_title").val(),
		"step": $("#tables_edition_step").val(),
		"views_groups": JSON.stringify(multiples[0], null, ' '),
		"views_themes": JSON.stringify(multiples[1], null, ' ')
	    };
	    if($("#tables_edition_id").val()!=-1){
		obj1["id"]=$("#tables_edition_id").val();
	    }
	    console.log(obj1);
	    var params=[
		{"identifier": "table","value": "mm_tables.p_editions","dataType":"string"},
		{"identifier": "columns","value": JSON.stringify(["ptid","name","step"], null, ' '),"mimeType":"application/json"},
		{"identifier": "links","value": JSON.stringify({"edition_groups":{"table":"mm_tables.p_edition_groups","ocol":"eid","tid":"gid"},"edition_themes":{"table":"mm_tables.p_edition_themes","ocol":"eid","tid":"tid"},"vfields":{"table":"mm_tables.p_edition_fields","ocol":"eid","tid":"eid"}}, null, ' '),"mimeType":"application/json"},
		{"identifier": "ptid","value": $("#tables_id").val(),"dataType":"string"},
		{"identifier": "name","value": $("#tables_edition_title").val(),"dataType":"string"},
		{"identifier": "step","value": $("#tables_edition_step").val(),"dataType":"string"},
		{"identifier": "edition_groups","value": JSON.stringify(multiples[0], null, ' '),"mimeType":"application/json"},
		{"identifier": "edition_themes","value": JSON.stringify(multiples[1], null, ' '),"mimeType":"application/json"},
		{"identifier": "vfields","value": JSON.stringify(objs, null, ' '),"mimeType":"application/json"}
	    ];
	    if($("#tables_edition_id").val()!=-1)
		params.push({"identifier": "id","value": $("#tables_edition_id").val(),"dataType":"string"});
	    insert(params,($("#tables_edition_id").val()!=-1),function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadAnElement($("#tables_id").val(),false);
	    });
	});

	$("#indicators_form_print").find("button").first().click(function(e){
	    uploadedFile=$(this).prev().find('input[type=file]').first().val().split('\\').pop();
	    $(this).next().on('load',function(){
		var params=[
		    {"identifier": "template","value": uploadedFile,"dataType":"string"},
		    {"identifier": "fullpath","value": "tmp","dataType":"string"}
		];
		callService("np.parseDocAttr",params,function(data){
		    var cbody="";
		    for(var i=0;i<data.length;i++){
			cbody+=managerTools.generateFromTemplate($("#report_line_template").html(),
								 ["id","name","value"],
								 [data[i],data[i],data[i]]);
		    }
		    $("#mm_report_table_display").html(managerTools.generateFromTemplate($("#report_template").html(),["tbody"],[cbody]));
		    $('#report_table_display').DataTable({
			rowReorder:       true,
			"scrollX":        true,
			"scrollCollapse": true,
			autoWidth:        true,
			"paging":         false,
			//"info":           false,
			//"responsive":     true,
			//deferRender:      true,
			bFilter:          false
		    });

		});
	    });
	    $(this).prev().submit();
	    console.log(uploadedFile);
	});

	$("#indicators_form_print").find("button").last().click(function(e){
	    alert('ok run');
	    var objs=[];
	    $("#report_table_display").find('tr').each(function(){
		var obj={};
		$(this).find("input[name=oname]").each(function(){
		    obj['name']=$(this).val();
		});
		$(this).find("input[type=text],textarea").each(function(){
		    obj[$(this).attr('name')]=$(this).val();
		    console.log($(this));
		});
		$(this).find("select").each(function(){
		    if($(this).attr('name')!="orderType"){
			if($(this).find("option:selected").length>1){
			    obj[$(this).attr('name')]=[];
			    var oid=$(this).attr('name');
			    $(this).find("option:selected").each(function(){
				obj[oid].push($(this).val());
			    });
			}else
			    obj[$(this).attr('name')]=$(this).val();

			//obj[$(this).attr('name')]=$(this).val();
			console.log($(this));
		    }
		});
		for(var i in obj){
		    objs.push(obj);
		    break;
		}
	    });
	    console.log(objs);
	    var multiples=[[],[]];
	    var tmp=["groups"];
	    for(var i=0;i<tmp.length;i++){
		$("#tables_report_"+tmp[i]).find("option:selected").each(function(){
		    multiples[i].push($(this).val());
		});
	    }
	    console.log(multiples);
	    var obj1={
		"name": $("#tables_report_title").val(),
		"step": $("#tables_report_step").val(),
		"views_groups": JSON.stringify(multiples[0], null, ' '),
	    };
	    if($("#tables_report_id").val()!=-1){
		obj1["id"]=$("#tables_report_id").val();
	    }
	    console.log(obj1);
	    var params=[
		{"identifier": "table","value": "mm_tables.p_reports","dataType":"string"},
		{"identifier": "columns","value": JSON.stringify(["ptid","name","clause","element"], null, ' '),"mimeType":"application/json"},
		{"identifier": "links","value": JSON.stringify({"edition_groups":{"table":"mm_tables.p_report_groups","ocol":"rid","tid":"gid"},"vfields":{"table":"mm_tables.p_report_fields","ocol":"rid","tid":"rid"}}, null, ' '),"mimeType":"application/json"},
		{"identifier": "ptid","value": $("#tables_id").val(),"dataType":"string"},
		{"identifier": "name","value": $("#tables_report_title").val(),"dataType":"string"},
		{"identifier": "clause","value": $("#tables_report_clause").val(),"dataType":"string"},
		{"identifier": "element","value": $("#tables_report_element").val(),"dataType":"string"},
		{"identifier": "edition_groups","value": JSON.stringify(multiples[0], null, ' '),"mimeType":"application/json"},
		{"identifier": "vfields","value": JSON.stringify(objs, null, ' '),"mimeType":"application/json"}
	    ];
	    if(uploadedFile!=null){
		params[1]={"identifier": "columns","value": JSON.stringify(["ptid","name","clause","element","file"], null, ' '),"mimeType":"application/json"};
		params.push({"identifier": "file","value": uploadedFile,"dataType":"string"});	
	    }
	    if($("#tables_report_id").val()!=-1)
		params.push({"identifier": "id","value": $("#tables_report_id").val(),"dataType":"string"});
	    insert(params,($("#tables_report_id").val()!=-1),function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		uploadedFile=null;
		loadAnElement($("#tables_id").val(),false);
	    });
	});

	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );
	
	console.log("Start Tables");

    };

    function runSql(execute,dbname,sql){
	zoo.execute({
	    identifier: (execute?"np.createTempFile":"np.testQuery"),
	    type: "POST",
	    dataInputs: [
		{"identifier":(execute?"map":"dbname"),"value":(dbname?dbname:$("#documents_indicators_database").val()),"dataType":"string"},
		{"identifier":(execute?"sql":"query"),"value":(sql?sql:$("#documents_data_query").val()),"dataType":"integer"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		if(execute)
		    fetchInfoAndDisplay(data);
		else
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
    }

    // Return public methods
    return {
        initialize: initialize,
	saveAnElement: saveAnElement
    };



});

