// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic', 'ol','datasources','mmDataTables','rowReorder','colorpicker','slider',"sortable","colReorder","managerTools"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,ol,datasources,MMDataTable,rowReorder,colorpicker,slider,sortable,colReorder,managerTools) {
    

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
    var tableName="mm_tables.importers";
    var fileName="";

    var isAttributes=true;
    var attributes=[];
    var attributes_index=[];
    var values=[];

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

    function fillGeoreferencing(data){
	console.log("**********-------------*************");
	var cnt=0;
	$("select[name='georef_field']").each(function(){
	    if(cnt>0)
		$(this).parent().parent().remove();
	    cnt++;
	});
	for(var key in data.pages){
	    console.log(data.pages[key]["georef"]);
	    if(data.pages[key]["georef"] && data.pages[key]["georef"].length>0){
		console.log("**********-------------*************");
		for(var i=0;i<data.pages[key]["georef"].length;i++){
		    var currentGeoref=data.pages[key]["georef"][i];
		    $("#document_georef_id").val(currentGeoref.id);
		    console.log($("#document_georef_id").val());
		    console.log("**********-------------*************");
		    console.log("    REQUIRE TO LOAD THE FIELDS !");
		    $("#documents_georef_method").val(currentGeoref.fields.length==0?-1:currentGeoref.fields.length>2?"georef":"coord").change();
		    for(var i=0;i<currentGeoref.fields.length;i++){
			if(i>0){
			    $("a.georef_add").click();
			    console.log("**********------ CLICK -------*************");
			}
			console.log("select[name='georef_field']:eq("+i+")");
			console.log($("select[name='georef_field']:eq("+i+")"));
			console.log(currentGeoref.fields[i]["column_name"]);
			$("select[name='georef_field']:eq("+i+")").val(currentGeoref.fields[i]["column_name"]);
			if(i>0){
			    console.log("input[name='georef_sep']:eq("+(i-1)+")");
			    console.log($("input[name='georef_sep']:eq("+(i-1)+")"));
			    $("input[name='georef_sep']:eq("+(i-1)+")").val(currentGeoref.fields[i]["separator"]);
			}

			console.log(currentGeoref.fields[i]);
		    }
		    console.log("**********-------------*************");
		}
		console.log("**********-------------*************");
	    }
	}
    }
    
    var hasBeenDone=false;
    function fillForm(data){
	$(".project-title").html(data["name"]+' <i class="fa fa-'+(data["published"]=="false"?"exclamation":"check")+'"> </i>');
	var myRootLocation=$(".theForm");
	var reg=new RegExp("documents_","");

	$("#indicators_form_link").find("#documents_template_name").val(data["template_name"]);
	$("#indicators_form_link").find("#documents_ifilename").val(data["otemplate"]);
	$("#indicators_form_link").find("#documents_template_link").attr("href",data["template"]).text(data["template_name"]);

	//var cData=data;
	(function(cData){
	    getLastFile(function(data){
		console.log(hasBeenDone);
		fetchInfoAndDisplay(data,function(){
		    if(!hasBeenDone){
			$("#pages_fields_table_display").prev().remove();
			$("#pages_fields_table_display").remove();
			var cPage=cData["pages"][$("#documents_ifile_page").val()];
			console.log("+++++>");
			console.log(cPage);
			console.log("<+++++");
			if(cPage["ofield"]){
			    console.log("+++++>");
			    console.log(cPage);
			    console.log("<+++++");
			    $("#pages_id").val(cPage["id"]);
			    if(cPage["isreference"])
				$("#documents_page_isreference").prop("checked",true);
			    else
				$("#documents_page_isreference").prop("checked",false);
			    $("#documents_page_type").val(cPage["type"]).change();
			    $("#documents_page_tablename").val(cPage["tablename"]);
			    var cid=0;
			    try{
				cid=eval((cPage["ofield"].replace(/Field/g,"")+"-1"));
			    }catch(e){
				try{
				    var columns=$("#DS_table_indicatorTable_indicator").dataTable().fnSettings().aoColumns;
				    for(var kk=0;kk<columns.length;kk++)
					if(columns[kk].data==cPage["ofield"]){
					    cid=kk;
					    break;
					}
				}catch(e){
				    console.log("!! MM ERROR "+e);
				}
			    }
			    var closure={
				"field": cid,
				"type": cPage["otype"]
			    };
			    console.log("Now fix the order to "+closure["field"]+" "+closure["type"]+"!");
			    try{
				managerTools.datasources[data].order([closure["field"],closure["type"]]).draw();
			    }catch(e){
				console.log("****** ERROR ");
				console.log(e);
				console.log("****** ERROR ");
				
			    }
			    var tbody="";
			    //console.log(managerTools.generateFromTemplate($("#page_fields_table_template").html(),["tbody"],[tbody]));
			    $("#page_table_init").html(managerTools.generateFromTemplate($("#page_fields_table_template").html(),["tbody"],[tbody]));
			    $("#pages_fields_table_display").DataTable({
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
			    hasBeenDone=true;

			    $(".processImportData").off('click');
			    $(".processImportData").click(function(){
				console.log('processImportData !');
				var dstName=$("#documents_ifilename").val();
				dstName=dstName+(dstName.indexOf(".mdb")>0?"_dir":'');
				var lparams=[
				    {"identifier": "id","value": localId,"dataType":"string"},
				    {"identifier": "dstName","value": dstName,"dataType":"string"}
				];
				
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
				    success: function(data){
					console.log(data);
					var progress=$("#indicators_form_table").find(".progress-bar").first();
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
						    progress.text(data.result.ExecuteResponse.ProcessOutputs.Output.Data.LiteralData.__text );
						    $(".notifications").notify({
							message: { text: data.result.ExecuteResponse.ProcessOutputs.Output.Data.LiteralData.__text },
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
						    console.log(e);
						    var progress=$("#indicators_form_table").find(".progress-bar").first();
						    progress.attr("aria-valuenow",100);
						    progress.css('width', (100)+'%');
						    progress.text(data.text+' : '+(100)+'%');
						    try{
							$(".notifications").notify({
							    message: { text: data["result"]["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
							    type: 'danger',
							}).show();
						    }catch(e){
							console.log(e);
						    }
						}
					    },
					});

				    },
				    error: function(data){
					console.log(data);
				    }
				});
			    });

			    $(".savePageSettings").off('click');
			    $(".savePageSettings").click(function(){
				console.log('savePageSettings !');
				var mapping={
				    "name": "field_name",
				    "type": "field_type",
				    "rlabel": "field_label",
				    "label": "field_label_index",
				    "value": "value",
				    "clause": "clause",
				};
				var objs=[];
				$("#pages_fields_table_display").find("tbody").find('tr').each(function(){
				    var obj={};
				    for(var i in mapping){
					obj[i]=$(this).find("input[name="+mapping[i]+"],select[name="+mapping[i]+"],textarea[name="+mapping[i]+"]").val();
				    }
				    objs.push(obj);
				});
				var params=[
				    {"identifier": "table","value": "mm_tables.pages","dataType":"string"},
				    {"identifier": "columns","value": JSON.stringify([], null, ' '),"mimeType":"application/json"},
				    {"identifier": "links","value": JSON.stringify({"fields":{"table":"mm_tables.page_fields","ocol":"pid","tid":"pid"}}, null, ' '),"mimeType":"application/json"},
				    {"identifier": "fields","value": JSON.stringify(objs, null, ' '),"mimeType":"application/json"},
				    {"identifier": "id","value": $("#pages_id").val(),"dataType":"string"}
				];

				insert(params,($("#pages_id").val()!=-1),function(data){
				    console.log(data);
				    $(".notifications").notify({
					message: { text: data },
					type: 'success',
				    }).show();
				    //loadAnElement($("#tables_id").val(),false);
				});

				console.log(params);
			    });

			    $("select[name='georef_method']").off('change');
			    $("select[name='georef_method']").change(function(){
				console.log($(this).val());
				if($(this).val()=="coord")
				    $(this).parent().parent().next().show();
				else
				    $(this).parent().parent().next().hide();
				if($(this).val()=="-1")
				    $(this).parent().parent().next().next().hide();
				else
				    $(this).parent().parent().next().next().show();
			    });
			    $("select[name='georef_method']").change();
			    $("a.georef_add").off('click');
			    $("a.georef_add").click(function(e){
				e.stopPropagation();
				$(this).parent().parent().parent().parent().find("div.form-group").last().after($(this).parent().parent().parent().clone());
				//$(this).parent().parent().parent().after($(this).parent().parent().parent().clone())
				//$(this).parent().parent().parent().next().find(".btn-group").remove();
				$(this).parent().parent().parent().parent().find("div.form-group").last().find(".btn-group").remove();
				if($("select[name='georef_method']").val()=="georef"){
				    //$(this).parent().parent().parent().next().find("label").append($("#template_georef_separator").html());
				    $(this).parent().parent().parent().parent().find("div.form-group").last().find("label").append($("#template_georef_separator").html());
				}
				if($("select[name='georef_field']").length==1)
				    $("a.georef_delete").addClass("disabled");
				if($("select[name='georef_field']").length>1)
				    $("a.georef_delete").removeClass("disabled");
				console.log($(this));
			    });
			    $("a.georef_delete").off('click');
			    $("a.georef_delete").click(function(e){
				e.stopPropagation();
				$(this).parent().parent().parent().parent().find("div.form-group").last().remove();
				console.log($("select[name='georef_field']").length);
				if($("select[name='georef_field']").length==1)
				    $(this).addClass("disabled");
				console.log($(this));
			    });
			    if($("select[name='georef_field']").length==1)
				$("a.georef_delete").addClass("disabled");
			    
			    try{
				$("#DS_table_indicatorTable_indicator").dataTable().fnSettings().aoDrawCallback.push( {
				    "fn": function () {
					console.log("****** TABLE REFRESH !");
					if(cData["pages"][$("#documents_ifile_page").val()]["fields"].length>0){
					    console.log("****** TABLE REFRESH WITH VALUES !");
					    var tbody="";
					    $("#documents_georef_field").html("");
					    for(var i=0;i<cData["pages"][$("#documents_ifile_page").val()]["fields"].length;i++){
						var celem=cData["pages"][$("#documents_ifile_page").val()]["fields"][i];
						tbody+=managerTools.generateFromTemplate($("#page_fields_line_template").html(),
											 ["id","name","label","label_index","value","clause"],
											 [i+1,celem["name"],celem["rlabel"],celem["label"],celem["value"],celem["clause"]]);
						$("#documents_georef_field").append('<option>'+celem["name"]+'</option>');
					
						try{
						    var tmp=celem["label"].split('||');
						    for(var j=0;j<tmp.length;j++){
							var tmp1=tmp[j].split(',');
							var coords=[];
							for(var k=0;k<tmp1.length;k++){
							    coords.push(parseInt(tmp1[k].replace(/\(|\)/g,"")));
							}
							console.log(coords);
							console.log($("#DS_table_indicatorTable_indicator").DataTable());
							var element=null;
							if(coords[1]>=0){
							    console.log($("#DS_table_indicatorTable_indicator").DataTable().cells(coords[1],coords[0]));
							    console.log($("#DS_table_indicatorTable_indicator").DataTable().cell(coords[1],coords[0]));
							    element=$($("#DS_table_indicatorTable_indicator").DataTable().cells(coords[1],coords[0]).nodes());
							}else
							    element=$($("#DS_table_indicatorTable_indicator").DataTable().column(coords[0]).header());
							console.log($(element));
							element.addClass("alert alert-success");
							element.append(' <span class="badge progress-bar-info">'+(i+1)+'</span>');
							
						    }
						    tmp=celem["value"].split('||');
						    for(var j=0;j<tmp.length;j++){
							var tmp1=tmp[j].split(',');
							var coords=[];
							for(var k=0;k<tmp1.length;k++){
							    coords.push(parseInt(tmp1[k].replace(/\(|\)/g,"")));
							}
							var element=$($("#DS_table_indicatorTable_indicator").DataTable().cell(coords[1],coords[0]).node());
							console.log(element);
							element.addClass("alert alert-danger");
							element.append(' <span class="badge progress-bar-info">'+(i+1)+'</span>');
							
						    }
						}catch(e){
						    console.log("******************"+e+"_____");
						};
					    }
					    $("#pages_fields_table_display").find("tbody").html(tbody);
					    var cnt=0;
					    $("#pages_fields_table_display").find('tbody').find('tr').each(function(){
						$(this).find('select[name=field_type]').first().val(cData["pages"][$("#documents_ifile_page").val()]["fields"][cnt]["type"]);
						cnt+=1;
					    });
					}
					fillGeoreferencing(cData);
				    },
				    "sName": "user"
				} );
			    }catch(e){
				alert(e);
			    }
			    /*$("#DS_table_indicatorTable_indicator").DataTable().fnDrawCallback=function(){
				console.log("****** TABLE REFRESH !");
			    };*/


			    if(cData["pages"][$("#documents_ifile_page").val()]["length"]!=null)
				$("#DS_table_indicatorTable_indicator").DataTable().page.len(cData["pages"][$("#documents_ifile_page").val()]["length"]).draw();



			}else{
			    $("#pages_id").val(-1);
			}
			

			console.log($('#DS_table_indicatorTable_indicator tbody'));


			$('#DS_table_indicatorTable_indicator tbody').on( 'click', 'td', function () {
			    console.log('Clicked');
			    console.log($("#DS_table_indicatorTable_indicator").DataTable().cell( this ));
			    if($(this).hasClass("alert")){
				if(!$(this).find('span').first().hasClass("progress-bar-info")){
				    $(this).removeClass("alert "+(isAttributes?"alert-success":"alert-danger"));
				    $(this).find('span').first().remove();
				    if(isAttributes){
					attributes_index.pop(attributes.indexOf($(this).text()));
					attributes.pop(attributes.indexOf($(this).text()));
				    }else
					values.pop(values.indexOf('('+$("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index().column+','+$("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index().row+')'));
				}
			    }
			    else{
				if(!$(this).find('span').first().hasClass("progress-bar-info")){
				    $(this).addClass("alert "+(isAttributes?"alert-success":"alert-danger"));
				    if(isAttributes){
					attributes.push($(this).text());
					attributes_index.push('('+$("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index().column+','+$("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index().row+')');
					if($("#pages_fields_table_display").find("tbody").find('tr').find('td').first().attr('colspan')==6)
					    $(this).append(' <span class="badge">'+(1)+'</span>');
					else
					    $(this).append(' <span class="badge">'+($("#pages_fields_table_display").find("tbody").find('tr').length+1)+'</span>');
				    }
				    else{
					values.push('('+$("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index().column+','+$("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index().row+')');
					console.log($("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index());
					$(this).append(' <span class="badge">'+($("#pages_fields_table_display").find("tbody").find('tr').length)+'</span>');
				    }
				}
			    }
			    console.log($("#DS_table_indicatorTable_indicator").DataTable().cell( this ).index());
			} );

			$(".addRow").first().click(function(){
			    alert("add row to table");
			    console.log($("#page_fields_line_template").html());
			    $("#pages_fields_table_display").find("tbody").append(managerTools.generateFromTemplate($("#page_fields_line_template").html(),["id","name","label","true","ignore","value"],[$("#pages_fields_table_display").find("tbody").find('tr').length,"true",0,""]));
			});

			$("[data-mmaction=useColumnNV]").off('click');
			$("[data-mmaction=useColumnNV]").click(function(){
			    var columns=$("#DS_table_indicatorTable_indicator").dataTable().fnSettings().aoColumns;
			    $("#pages_fields_table_display").find("tbody").html("");
			    for(var kk=0;kk<columns.length;kk++){
				console.log(columns[kk].data);
				console.log($("#pages_fields_table_display").find("tbody").find('tr').length);
	    			$("#pages_fields_table_display").find("tbody").append(managerTools.generateFromTemplate($("#page_fields_line_template").html(),["id","name","label","ignore","value","clause","label_index"],[$("#pages_fields_table_display").find("tbody").find('tr').length+1,columns[kk].data,columns[kk].data,0,"","true","("+kk+",-1)"]));
				$("#pages_fields_table_display").find("tbody").find('tr').last().find("textarea").last().val("("+kk+",0)");
				var element=$($("#DS_table_indicatorTable_indicator").DataTable().column(kk).header());
				element.addClass("alert alert-success");
				element.append(' <span class="badge progress-bar-info">'+(kk+1)+'</span>');
				var element=$($("#DS_table_indicatorTable_indicator").DataTable().cells(0,kk).nodes());
				element.addClass("alert alert-danger");
				element.append(' <span class="badge progress-bar-info">'+(kk+1)+'</span>');

			    }

			});

			$("[data-mmaction=setAttribute]").off('click');
			$("[data-mmaction=setAttribute]").click(function(){
			    isAttributes=false;	
			    $("#pages_fields_table_display").find("tbody").find("td").first().each(function(){
				if($(this).attr("colspan")==6)
				    $(this).parent().remove();
			    });
	    		    $("#pages_fields_table_display").find("tbody").append(managerTools.generateFromTemplate($("#page_fields_line_template").html(),["id","name","label","ignore","value","clause","label_index"],[$("#pages_fields_table_display").find("tbody").find('tr').length+1,attributes.join("_"),attributes.join("_"),0,"","true",attributes_index.join(' || ')]));
			});

			$("[data-mmaction=setValue]").off('click');
			$("[data-mmaction=setValue]").click(function(){
			    isAttributes=true;
			    var tmp=$("#pages_fields_table_display").find("tbody").find('tr').last().find("textarea").last().val(values.join(' || '));

			    for(var i=0;i<attributes.length;i++){
				var tmp=attributes_index[i].split('||');
				var aCoords=[];
				for(var j=0;j<tmp.length;j++){
				    var tmp1=tmp[j].split(',');
				    aCoords.push([]);
				    for(var k=0;k<tmp1.length;k++){
					aCoords[aCoords.length-1][k]=tmp1[k].replace(/\(|\)/g, "");
				    }
				    console.log($($("#DS_table_indicatorTable_indicator").DataTable().cell( aCoords[aCoords.length-1][1],aCoords[aCoords.length-1][0] ).node()).find(".badge").addClass("progress-bar-info"));
				}
				console.log(aCoords);
			    }
			    for(var i=0;i<values.length;i++){
				var tmp=values[i].split('||');
				var aCoords=[];
				for(var j=0;j<tmp.length;j++){
				    var tmp1=tmp[j].split(',');
				    aCoords.push([]);
				    for(var k=0;k<tmp1.length;k++){
					aCoords[aCoords.length-1][k]=tmp1[k].replace(/\(|\)/g, "");
				    }
				    console.log($($("#DS_table_indicatorTable_indicator").DataTable().cell( aCoords[aCoords.length-1][1],aCoords[aCoords.length-1][0] ).node()).find(".badge").addClass("progress-bar-info"));
				}
				console.log(aCoords);
			    }

			    attributes_index=[];
			    attributes=[];
			    values=[];
			    
	    		    //$("#pages_fields_table_display").find("tbody").append(managerTools.generateFromTemplate($("#page_fields_line_template").html(),["id","name","label","ignore","value"],[$("#pages_fields_table_display").find("tbody").find('tr').length,attributes.join("_"),attributes.join("_"),"true",0,""]));
			});

		    }
		});
	    });
	})(data);

	myRootLocation.find("textarea").each(function(){
	    if(!$(this).attr("id"))
		return;
	    if($(this).attr("id").replace(reg,"")=="description"){
		$(this).summernote("code",data[$(this).attr("id").replace(reg,"")]);
	    }
	    else
		$(this).val(data[$(this).attr("id").replace(reg,"")]).change();
	});

	$(".tab-content").find("select").find("option").each(function(){
	    $(this).prop('selected', false);
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
		    $(this).val(data[$(this).attr("id").replace(reg,"")]);
	    }else{
		console.log($(this));
		$(this).find('option').each(function(){$(this).prop('selected', false);});
		if($.isArray(data[$(this).attr("id").replace(reg,"")])){
		    var obj=data[$(this).attr("id").replace(reg,"")];
		    var oid=$(this).attr("id").replace(reg,"");
		    if(obj.length==0)
			$(this).find('option[value="-1"]').prop("selected",true);
		    for(var i=0;i<obj.length;i++){
			//(this).find('option').each(function(){if($(this).val()==obj[j])$(this).prop('selected', true);});
			$(this).find('option[value="'+obj[i]+'"]').prop("selected",true);
		    }
		}else{
		    $(this).val((data[$(this).attr("id").replace(reg,"")]!=null?data[$(this).attr("id").replace(reg,"")]:-1));
		    
		}
	    }
	});

    }

    function fillGraphForm(data){
	var myRootLocation=$("#indicators_form_pie-chart");
	var prefix="documents_graphs_";
	myRootLocation.find("input[type=text],input[type=hidden],select,textarea").each(function(){
	    if(!$(this).attr("id"))
		return;
	    var myReg=new RegExp(prefix,"g");
	    var cid=$(this).attr("id").replace(myReg,"");
	    console.log(cid);
	    if($(this).attr("type")=="text" || !$(this).attr("type") || $(this).attr("type")=="hidden"){
		if(cid.replace(/color/g,"")!=cid){
		    if(data[cid])
			$(this).val("#"+data[cid]).change();
		    else
			$(this).val("#000").change();
		}
		else
		    $(this).val(data[cid])
	    }else{
		$(this).find('option').prop('selected', false);
		if($.isArray(data[cid])){
		    var obj=data[cid];
		    var oid=cid;
		    if(obj.length==0)
			$(this).find('option[value="-1"]').prop("selected",true);
		    for(var i=0;i<obj.length;i++){
			$(this).find('option[value="'+obj[i]+'"]').prop("selected",true);
		    }
		}else{
		    $(this).val((data[cid]!=null?data[cid]:-1));
		    
		}
	    }
	});
    }

    function fillDefaultRepport(data){
	var myRootLocation=$("#indicators_form_file-text-o");
	var lines="";
	var freg=new RegExp("\\[content\\]","g");
	var regs=[
	    new RegExp("\\[x\\]","g"),
	    new RegExp("\\[name\\]","g")
	];
	var tmpl=$("#document_settings_line_template")[0].innerHTML;
	for(var i=0;i<data.length;i++){
	    lines+=tmpl.replace(regs[0],i).replace(regs[1],data[i]);
	}
	var content=$("#document_settings_container_template")[0].innerHTML.replace(freg,lines);
	$("#documents_repport_editor").html(content);
	var defaultTypes={
	    "map": 1,
	    "table": 3,
	    "diag": 4
	};
	var noOptionTypes=[
	    "1","2","5","6","7"
	];
	$("#documents_repport_editor").find("table").find("select").each(function(){
	    if(defaultTypes[$(this).parent().prev().find('input').val()]){
		$(this).val(defaultTypes[$(this).parent().prev().find('input').val()]);
		$(this).prop("disabled",true);
		$(this).parent().prev().prev().find('input').prop("disabled",true);
		$(this).parent().next().find('textarea').hide();
	    }else{
		$(this).change(function(){
		    if($.inArray($(this).val(),noOptionTypes)>=0)
			$(this).parent().next().find("textarea").hide();
		    else
			$(this).parent().next().find("textarea").show();
		});
	    }
	});
	$("#documents_repport_editor").find("table").DataTable({
	    "bPaginate": false,
	    "bFilter": false,
	    "bInfo": false,
	    "bAutoWidth": false,
	    "scrollY":  ($(window).height()/2)+"px",
	});
	$("[data-mmaction=save-doc]").click(function(){
	    saveRepport();	    
	});

    }

    function fillRepport(data){
	for(var i=0;i<data.length;i++){
	    for(var a in data[i]){
		if($("#rtable_"+a+"_"+i).attr("type")!="checkbox")
		    $("#rtable_"+a+"_"+i).val(data[i][a]);
		else
		    $("#rtable_"+a+"_"+i).prop("checked",data[i][a]);
	    }
	}
    }
    
    function saveRepport(){
	var params=[
	    {identifier: "id", value: localId, dataType: "sring"}
	];
	if(arguments.length>0)
	    params.push({name: "tid", value: $("#p_tname").val(), dataType: "sring"});
	$("#repport_display2").find("input[type=checkbox]").each(function(){
	    var tmp=($(this).attr("id")+"").split('_');
	    var params0={identifier: "tuple", value:'{"id":'+tmp[tmp.length-1]+',"display":"'+$(this).is(":checked")+'","var":"'+$("#rtable_name_"+tmp[tmp.length-1]).val()+'","type":'+$("#rtable_type_"+tmp[tmp.length-1]).val()+',"value":"'+ $("#rtable_value_"+tmp[tmp.length-1]).val()+'"}',mimeType: "application/json"};
	    var obj={
		"id":tmp[tmp.length-1],
		"display":$(this).is(":checked")+"",
		"var":$("#rtable_name_"+tmp[tmp.length-1]).val(),
		"type":$("#rtable_type_"+tmp[tmp.length-1]).val(),
		"value":$("#rtable_value_"+tmp[tmp.length-1]).val()
	    };
	    params.push({identifier: "tuple", value:JSON.stringify(obj, null, ' '),mimeType: "application/json"});
	    
	});
	if($("#repport_steps").is(":visible") && $("#repport_step").val()>0){
	    params.push({identifier: "step", value: ($("#repport_step")[0].selectedIndex-1), dataType: "sring"});
	}    
	if($('#agregation').is(":visible") && $("#agregate_step")[0].selectedIndex-1>=0) {
	    params.push({identifier: "step", value: ($("#agregate_step")[0].selectedIndex-1), dataType: "sring"});
	}    
	callService("np.saveRepportSettings",params,function(data){
	    $(".notifications").notify({
		message: { text: data },
		type: 'success',
	    }).show();
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
		{"identifier": "table","value": tableName,"dataType":"string"},
		{"identifier": "id","value": id,"dataType":"string"}
	    ],
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		fillForm(data);
		//fillGeoreferencing(data);
		fileUrlSelection(data);
		$("#indicatorForm").find(".nav").find("li").first().trigger("click");
		if(data.it_id){
		    console.log(data["_style"]);
		    //managerTools.loadStyleDisplay(data["_style"]);
		    //bindClassifier(data["_style"]);
		    fetchIndexTableAndDisplay(data["_style"],function(d){
			var lcnt0=0;
			$("#layer_property_table_table_display_wrapper").find("table tbody").find("tr").each(function(){
			    var lcnt=0;
			    var fields=["pos","display","search","var","label","value","width"]
			    if(data["_table"]["fields"])
				$(this).find("td").each(function(){
				    if($(this).find("input").length){
					if($(this).find("input").attr("type")!="checkbox")
					    $(this).find("input").val(data["_table"]["fields"][lcnt0][fields[lcnt]]);
					else
					    $(this).find("input").prop("checked",data["_table"]["fields"][lcnt0][fields[lcnt]]);
				    }
				    if(lcnt==3){
					var tmp=$(this).children().first().html();
					$(this).html(data["_table"]["fields"][lcnt0][fields[lcnt]]+tmp);
				    }
				    lcnt+=1;
				});
			    lcnt0+=1;
			});
			if(data["_repport"]["docFields"]){
			    $("#documents_afile_link").attr("href",data["_repport"]["doc"]);
			    $("#documents_afile_link").attr("href",data["_repport"]["docUrl"]).text(data["_repport"]["docUrl"]);
			    fillDefaultRepport(data["_repport"]["docFields"]);
			    if(data["_repport"]["fields"])
				fillRepport(data["_repport"]["fields"]);
			}else{
			    
			}
			if(data["_table"]["id"]){
			    $("#documents_table_title").val(data["_table"]["title"]);
			    $("#documents_table_id").val(data["_table"]["id"]);
			}else{
			    $("#documents_table_title").val("");
			    $("#documents_table_id").val(-1);
			}
			    
			fillGraphForm(data["_graph"]);
		    });
		    $("#documents_indicators_table").val(data["indicators_territories"]).change();
		    console.log(data["query"]);
		    console.log(data["query"]);
		    console.log(data["query"]!=null);
		    console.log((data["query"]?"query":"file"));
		    //$("input[name=indicator_data_type]").val((data["query"]?"query":"file")).change();
		    $("input[name=indicator_data_type]").each(function(){
			console.log((data["query"]?"query":"file"));
			console.log($(this).val()==(data["query"]?"query":"file"));
			if($(this).val()==(data["query"]?"query":"file"))
			    $(this).trigger("click");
		    });
		    var fields=["query"];
		    for(var i=0;i<fields.length;i++){
			$("#documents_data_"+fields[i]).val(data[fields[i]]);			
		    }
		    console.log($("#DS_indicatorTable_indicator"));
		    if(data["file_link"] && !data["query"]){
			$("#documents_ifile_link").attr("href",data["file_url"]).text(data["file_name"]);
			fetchInfoAndDisplay(data["file_link"]);
		    }else{
			if(data["query"])
			    runSql(true);
			else{
			    $("#DS_indicatorTable_indicator").remove();
			    $("#documents_ifile_link").attr('href','#').text('');
			}
		    }

		    /*var lcnt=0;
		    $("#indicatorForm").find('.nav').first().find('[role=presentation]').each(function(){
			if(lcnt>1){
			    $(this).removeClass("disabled");
			    $(this).prop("disabled",false);
			}
			lcnt+=1;
		    });*/

		}else{
		    console.log($("#DS_indicatorTable_indicator"));
		    $("#DS_indicatorTable_indicator").remove();
		    $("#documents_ifile_link").attr('href','#').text('');
		    /*var lcnt=0;
		    console.log($("#indicatorForm").find('.nav').first());
		    console.log($("#indicatorForm").find('.nav').first().find('[role=presentation]'));
		    $("#indicatorForm").find('.nav').first().find('[role=presentation]').each(function(){
			if(lcnt>1){
			    $(this).prop("disabled",true);
			    $(this).addClass("disabled");
			}
			lcnt+=1;
		    });*/
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

    function createJsonFromForm(form){
	var params={};
	form.find('textarea').each(function(){
	    if(!$(this).attr("id"))
		return;
	    var cid=$(this).attr('id').replace(reg0,"");
	    if(cid=="description")
		params[cid]=$(this).summernote("code");
	    else
		params[cid]=$(this).val();
	});
	form.find('input[type="text"]').each(function(){
	    if(!$(this).attr("id") || $(this).attr("id")=="indicators_keywords")
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
		{"identifier": "table","value": tableName,"dataType":"string"},
		{"identifier": "keywords", value: $("#indicators_keywords").val(),dataType: "string"},
		{"identifier": "indicators_groups_in", value: "i_id",dataType: "string"},
		{"identifier": "indicators_groups_out", value: "g_id",dataType: "string"},
		{"identifier": "indicators_themes_in", value: "i_id",dataType: "string"},
		{"identifier": "indicators_themes_out", value: "t_id",dataType: "string"},
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
		{"identifier": "table","value": tableName,"dataType":"string"},
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
			{"identifier":"table","value":"mm_tables.importers","dataType":"string"},
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
	    hasBeenDone=false;
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
	    $('#'+lid+'_info').append($('<span class="select-info"/>').append(
		$('<span class="select-item"/>').append((CFeaturesSelected.length!=CRowSelected.length?'dd rows selected (ee total selected)'.replace(/dd/g,CRowSelected.length).replace(/ee/g,CFeaturesSelected.length):'dd rows selected'.replace(/dd/g,CRowSelected.length)))
	    ));
	});
    }

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

    var fetchInfoAndDisplay=function(data,ffunc){
	fileName=data;
	var ldata=data;
	console.log("********************** "+ldata.indexOf("mdb"));
	if(ldata.indexOf(".mdb")>0)
	    ldata+="_dir/";
	/*if(ldata.indexOf(".csv")>0){
	    var tmp=ldata.split('/');
	    ldata="";
	    for(var i=0;i<ldata.length-1;i++)
		ldata+=tmp[i]+"/";
	    console.log("********************** "+ldata);
	}*/
	zoo.execute({
	    //identifier: "vector-tools.mmVectorInfo2Map",
	    identifier: "datastores.mmVectorInfo2MapJs",
	    type: "POST",
	    dataInputs: [
		//{"identifier":"dataSource","value":ldata,"dataType":"string"},
		{"identifier":"dataStore","value":ldata,"dataType":"string"},
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
			    if(i==0)
			       val=data.datasource.layer[i].name;
			    $("select[name=ifile_page]").append("<option>"+data.datasource.layer[i].name+"</option>");
			}
		    }else{
			val=data.datasource.layer.name;
			$("select[name=ifile_page]").append("<option>"+val+"</option>");
		    }
			$("select[name=ifile_page]").off('change');
			$("select[name=ifile_page]").change(function(){
			    $("#pages_id").val(-1);
			    var lval=$(this).val();
			    hasBeenDone=false;
			    getVectorInfo(ldata,$(this).val(),function(data){
				var reg=new RegExp("\\[datasource\\]","g");
				var reg1=new RegExp("\\[font\\]","g");
				font="fa fa-table";
				//console.log("FONT !! "+font);
				//console.log($("#DS_indicatorTable_indicator"));
				if($("#DS_indicatorTable_indicator").length)
				    $("#DS_indicatorTable_indicator").remove();
				$("[data-mmaction=join]").first().parent().append($($("#dataSource_template")[0].innerHTML.replace(reg1,font).replace(reg,$("select[name=ifile_page]").val())).attr("id","DS_indicatorTable_indicator"));
				managerTools.displayVector(data,ldata,"indicatorTable","indicator",lval,
							   function(){
							       $("#DS_indicatorTable_indicator").find(".panel").addClass("panel-warning").removeClass("panel-default");
							       $("[data-mmaction=join]").addClass("disabled");
							   },
							   function(){
							       $("#DS_indicatorTable_indicator").find(".panel").removeClass("panel-warning").addClass("panel-default");
							       $("[data-mmaction=join]").removeClass("disabled");
							       try{
								   ffunc();
							       }catch(e){
							       }
							   });
			    });
			});
			$("select[name=ifile_page]").find('option').first().prop("selected",true).change();
		    /*getVectorInfo(ldata,val,function(data){
			var reg=new RegExp("\\[datasource\\]","g");
			var reg1=new RegExp("\\[font\\]","g");
			font="fa fa-table";
			console.log("FONT !! "+font);
			console.log($("#DS_indicatorTable_indicator"));
			if($("#DS_indicatorTable_indicator").length)
			    $("#DS_indicatorTable_indicator").remove();
			$("[data-mmaction=join]").first().parent().append($($("#dataSource_template")[0].innerHTML.replace(reg1,font).replace(reg,$("select[name=ifile_page]").val())).attr("id","DS_indicatorTable_indicator"));
			managerTools.displayVector(data,ldata,"indicatorTable","indicator",val,
						function(){
						    $("#DS_indicatorTable_indicator").find(".panel").addClass("panel-warning").removeClass("panel-default");
						    $("[data-mmaction=join]").addClass("disabled");
						},
						function(){
						    $("#DS_indicatorTable_indicator").find(".panel").removeClass("panel-warning").addClass("panel-default");
						    $("[data-mmaction=join]").removeClass("disabled");
						    try{
							ffunc();
						    }catch(e){
						    }
						}); 
		    });*/
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
		//console.log(data);
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
		    $("#documents_indicators_field").html("");
		    for(var i=0;i<data.schema.complexType.complexContent.extension.sequence.element.length;i++){
			var cname=data.schema.complexType.complexContent.extension.sequence.element[i]._name;
			if(cname!="msGeometry")
			    $("#documents_indicators_field").append('<option>'+cname+'</option>');
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

    function insertElem(params,func){
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
	    /*$("#indicators_form_table").find("button").first().click(function(){
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
	$("#indicators_form_table").append($($("#dataSource_template")[0].innerHTML.replace(reg1,font).replace(reg,"indexes.view_idx"+localId)).attr("id","DS_indicatorTable_dataTable"));
	fetchIndicatorInfo();
    }

    function bindClassifier(ldata){
	$("#mm_layer_property_style_display").find("button.mmClassifier").off("click");
	$("#mm_layer_property_style_display").find("button.mmClassifier").click(function(e){
	    var params=[
		{"identifier": "prefix","value": "indexes","dataType":"string"},
		{"identifier": "name","value": "Index"+localId,"dataType":"string"},
		{"identifier": "orig","value": module.config().db,"dataType":"string"},
		{"identifier": "id","value": localId,"dataType":"int"},
		{"identifier": "formula","value": $('#mm_layer_property_style_display').find("textarea[name=formula]").val(),"dataType":"int"},
	    ];
	    try{
		managerTools.classifyMap(this,"Index"+localId,ldata,params,function(data){
		    console.log(data);
		});
	    }catch(e){
		console.log(e);
	    }
	    return false;
	});
    }    

    function refreshLayerStyle(){
	var params=[
	    {"identifier":"prefix","value":"indexes","dataType":"string"},
	    {"identifier":"name","value":"Index"+localId,"dataType":"string"},
	    {"identifier":"orig","value":module.config().db,"dataType":"string"},
	    {"identifier":"id","value":localId,"dataType":"string"}
	];
	console.log(params);

	managerTools.callCreateLegend(null,"indexes.view_idx"+localId,null,params,function(data){
	    console.log(data);
	    try{
		fetchIndexTableAndDisplay(data);
		//fetchIndicatorInfo(data);
	    }catch(e){
		console.log(e);
	    }
	    console.log(data);
	});
    }

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

    var initialize=function(){
	
	adminBasic.initialize(zoo);
	managerTools.initialize(zoo);
	window.setTimeout(function () { 
	    $("textarea#documents_description").summernote();
	},10);

	$('[data-toggle="tooltip"]').tooltip({container: 'body'});
	startDataTable("id,name",[
	    {
		"data": "id",
		"name": "id",
		"sWidth": "10%"
	    },
	    {
		"data": "name",
		"name": "name",
		"sWidth": "80%"
	    },
	]);
	bindSave();

	$("#documents_page_type").change(function(){
	    if($(this).val()==1)
		$(".processImportData").show();
	    else
		$(".processImportData").hide();
	});
	$("#adder").find("button").click(function(){
	    addAnElement();
	    $("#adder").removeClass("in");
	});
	$("#deleter").find("button").click(function(){
	    deleteAnElement(localId);
	    $("#deleter").removeClass("in");
	});

	$(".tab-pane").css({"max-height":($(window).height()-($(".navbar").height()*3.5))+"px","overflow-y":"auto","overflow-x":"hidden"});
	$("#page-wrapper").find("[role=presentation]").first().children().first().click();
	

	$("[data-mmaction=georef_save]").off('click');
	$("[data-mmaction=georef_save]").click(function(){
	    var columns=["pid"];
	    if($("#tprj").is(":visible"))
		columns.push("srs");
	    var params=[
		{"identifier": "table","value": "mm_tables.page_geom","dataType":"string"},
		{"identifier": "columns","value": JSON.stringify(columns, null, ' '),"mimeType":"application/json"},
	    	{"identifier": "links","value": JSON.stringify({"fields":{"table":"mm_tables.page_geom_fields","ocol":"pid","tid":"pid"}}, null, ' '),"mimeType":"application/json"},
		{"identifier": "pid","value": $("#pages_id").val(),"dataType":"string"},
		{"identifier": "iid","value": $("#pages_id").val(),"dataType":"string"}
	    ];
	    if($("#tprj").is(":visible"))
		params.push({"identifier": "srs","value": $("#tprj").val(),"dataType":"string"});
	    var fcnt=0;
	    var lfields=[];
	    $("select[name='georef_field']").each(function(){
		if(fcnt>0){
		    lfields.push({"column_name": $(this).val(), "separator": $("input[name='georef_sep']:eq("+(fcnt-1)+")").val()});

		    console.log(lfields);
		    console.log(lfields.length-1);
		    console.log(lfields[lfields.lengh-1]);
		    //lfields[lfields.lengh-1]["separator"]=$("input[name='georef_sep']:eq("+(fcnt-1)+")").val();
		    //separators.push($("input[name='georef_sep']:eq("+(fcnt-1)+")").val());
		}else{
		    lfields.push({"column_name": $(this).val()});
		}
		fcnt+=1;
	    });
	    params.push({"identifier": "fields","value": JSON.stringify(lfields, null, ' '),"mimeType":"application/json"});
	    //params.push({"identifier": "separators","value": JSON.stringify(separators, null, ' '),"mimeType":"application/json"});
	    console.log(params);
	    insert(params,($("#tables_view_id").val()!=-1),function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadAnElement($("#documents_id").val(),false);
	    });
	});
	
	$("[data-mmaction=join]").off('click');
	$("[data-mmaction=join]").click(function(){
	    console.log($(this));
	    var params=[
		{"identifier": "table","value": "mm_tables.pages","dataType":"string"},
		{"identifier": "columns","value": JSON.stringify(["name","tablename","type","ofield","otype","length","iid","isreference"], null, ' '),"mimeType":"application/json"},
		{"identifier": "name","value": $(this).prev().prev().prev().prev().find('select').val(),"dataType":"string"},
		{"identifier": "isreference","value": $(this).prev().prev().prev().find('input[type=checkbox]').is(":checked"),"dataType":"string"},
		{"identifier": "type","value": $(this).prev().prev().find('select').val(),"dataType":"string"},
		{"identifier": "tablename","value": $(this).prev().find('input').val(),"dataType":"string"},
		{"identifier": "length","value": $("select[name=DS_table_indicatorTable_indicator_length]").val(),"dataType":"string"},
		{"identifier": "ofield","value": managerTools.sort["field"],"dataType":"string"},
		{"identifier": "otype","value": managerTools.sort["type"],"dataType":"string"},
		{"identifier": "iid","value": $("#documents_id").val(),"dataType":"string"},
	    ];

	    if($("#pages_id").val()!=-1){
		params.push({"identifier": "id","value": $("#pages_id").val(),"dataType":"string"});
	    }

	    insert(params,($("#tables_view_id").val()!=-1),function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		loadAnElement($("#documents_id").val(),false);
	    });

	    console.log(managerTools.sort);
	    var  myLocation=$(this);
	    for(var i=0;i<2;i++){
		myLocation=myLocation.prev();
		console.log(myLocation.find('select').val());
	    }


	    console.log($(this).prev());
	    console.log($(this).prev().prev());
	});

	$("[data-mmaction=import]").click(function(){
	    $("#iuploader").off("load");
	    $("#iuploader").on("load",function(){
		console.log(arguments);
		getLastFile(function(data){
		    fetchInfoAndDisplay(data);
		    console.log(data);
		    alert('Run Save File in DB: '+data);
		    zoo.execute({
			identifier: "np.saveUploadedFile",
			type: "POST",
			dataInputs: [
			    {"identifier": "table","value": "mm_tables.importers","dataType":"string"},
			    {"identifier": "id","value": $("#documents_id").val(),"dataType":"string"},
			    {"identifier": "field","value": "template","dataType":"string"},
			    {"identifier": "file","value": data,"dataType":"string"}
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
	    $("#ifileUpload").submit();
	});

	$("#indicators_form_info").find("button").last().click(function(e){
	    var tmp=["groups","themes"];
	    var multiples=[[],[]];
	    for(var i=0;i<tmp.length;i++){
		$("#documents_"+tmp[i]).find("option:selected").each(function(){
		    multiples[i].push($(this).val());
		});
	    }
	    var params=[
		{"identifier": "table","value": "mm_tables.importers","dataType":"string"},
		{"identifier": "columns","value": JSON.stringify(["name","description","tid"], null, ' '),"mimeType":"application/json"},
		{"identifier": "links","value": JSON.stringify({"importer_groups":{"table":"mm_tables.importer_groups","ocol":"iid","tid":"gid"},"importer_themes":{"table":"mm_tables.importer_themes","ocol":"iid","tid":"tid"}}, null, ' '),"mimeType":"application/json"},
		{"identifier": "name","value": $("#documents_name").val(),"dataType":"string"},
		{"identifier": "description","value": $("#documents_description").val(),"dataType":"string"},
		{"identifier": "tid","value": ($("#documents_tid").val()!="None"?$("#documents_tid").val():"NULL"),"dataType":"string"},
		{"identifier": "importer_groups","value": JSON.stringify(multiples[0], null, ' '),"mimeType":"application/json"},
		{"identifier": "importer_themes","value": JSON.stringify(multiples[1], null, ' '),"mimeType":"application/json"},
	    ];
	    
	    if($("#documents_id").val()!=-1)
		params.push({"identifier": "id","value": $("#documents_id").val(),"dataType":"string"});
	    insert(params,($("#documents_id").val()!=-1),function(data){
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		uploadedFile=null;
		loadAnElement($("#documents_id").val(),false);
	    });

	});

	console.log($("#page-wrapper").find("[role=presentation]").first());
	console.log("Start Importer Module");

	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );

    };

    function editLine(){
	alert('Activate line editing !');
    }

    // Return public methods
    return {
        initialize: initialize,
	saveAnElement: saveAnElement,
	editLine: editLine
    };



});

