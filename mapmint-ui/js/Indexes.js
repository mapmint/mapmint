System.require('Distiller')
System.limit=0;
Indexes=MLayout.extend();
counter=0;

Indexes.define({
  id: 0,
  layoutOptions: {
      contentSelector: ".lcontent",
     center__paneSelector: ".inner-center",
        west__paneSelector:   ".inner-west",
        west__size:           .28,
        west__draggable:          false,
        west__resizable: false,
	west__spacing_closed:10,
	west__spacing_open:8,
        east__paneSelector:   ".inner-east",
        east__size:           .28,
        east__closable:       false,
        east__draggable:          false,
        east__resizable: false,
        spacing_open:         4,
        spacing_closed:       4,
        //resizeWhileDragging:  true,
        onopen: function() {updateSize();},
        onclose: function() {updateSize();},
        onresize: function() {updateSize();}
    },
  initialize: function(){
      this.refresh();
      endLoading();
      this.id++;
    },
  refresh: function(){
      defaultInit();
    }

});

$(document).ready(function () {

    
    $("input[name$=group1]").change(function() {
        var test = $(this).val();
        $(".desc").hide();
        $("#" + test).show();
	$(".tbl_part").hide();
    });
    
    $("input[name$=group1]:checked").change();
    
    $("#agreg").css("display","none");
    $("#agregation_chk").click(function () {
	if($("#p_tname").val()!=-1)
	    $("#agreg").toggle(this.checked);
    });
    
    $("#stemp").css("display","none");
    $("#serietemporelle").click(function () {
	$("#stemp").toggle(this.checked);
    });
    
    
    $(".add-index").click(function(){
	$("#eName").val("");
        $('#add-index-dialog').window({
            width: 300,
            height: 150,
	    left:80,
	    top:150,
            maximizable:false,
	    minimizable:false,
            resizable: false
        })
    });

    $(".delete-index").click(function(){
	$("#dName").val(System.currentList[System.nodeId]);
	
        $('#remove-index-dialog').window({
            width: 300,
            height: 150,
	    left:80,
	    top:150,
            maximizable:false,
	    minimizable:false,
            resizable: false
        })
    });

    $(".sql_test").click(function(){
	testQuery();
    });    
    $(".sql_confirm").click(function(){
	runQuery();
    });    
    
    $('#colorpickerHolder2').ColorPicker({
	flat: true,
	color: '#00ff00',
	onSubmit: function(hsb, hex, rgb) {
	    $('#colorSelector2 div').css('backgroundColor', '#' + hex);
	    $("#s_color2").val(hex);
	}
    });
    
    $(' #colorpickerHolder3').ColorPicker({
        flat: true,
        color: '#00ff00',
        onSubmit: function(hsb, hex, rgb) {
	  $('#colorSelector3 div').css('backgroundColor', '#' + hex);
	  $("#s_color3").val(hex);
        }
    });
    
    $('#colorpickerHolder2>div, #colorpickerHolder3>div').css('position', 'absolute');
    var widt = false;
    $('#colorSelector2').bind('click', function() {
	$('#colorpickerHolder2').stop().animate({height: widt ? 0 : 173}, 500);
	widt = !widt;
    });
    $('#colorSelector3').bind('click', function() {
	$('#colorpickerHolder3').stop().animate({height: widt ? 0 : 173}, 500);
	widt = !widt;
    });

    searchTable("indicators");

    refreshList();
    
});

function publishIndexMap(){
    params=[
	{name: "id", value: System.nodeId, dataType: "sring"}
    ];
    data=WPSGetHeader("np."+(arguments.length>0?arguments[0]:"")+"publishFullIndex")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    checkWPSResult(xml);
	}
    });
}

function testQuery(){
    params=[
	{name: "dbname", value: $("#mmDbConnection").val(), dataType: "sring"},
	{name: "query", value: $("#mmSQLQuery").val(), dataType: "sring"}
    ];
    data=WPSGetHeader("np.testQuery")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    checkWPSResult(xml);
	}
    });
}

function runQuery(){
    params=[
	    {name: "map", value: (arguments.length>0?System.dbuserName:$("#mmDbConnection").val()), dataType: "sring"},
	    {name: "sql", value: (arguments.length>0?"SELECT * FROM "+$("#pg_table").val():$("#mmSQLQuery").val()), dataType: "sring"}
    ];
    data=WPSGetHeader("np.createTempFile")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	  if(checkWPSResult(xml,false)){
	    $("#dsContainer").html('<table id="flex_csv" class="hideBody"></table>');

		  dwDataSource=xml.responseText;
		  
		  $.ajax({
		    dwDataSource: dwDataSource,
			type: "GET",
			url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=vector-tools.mmVectorInfo2Map&DataInputs=dataSource="+dwDataSource.replace(/__/g,"/")+";force=1&RawDataOutput=Result",
			dataType: 'xml',
			complete: function(xml,status) {
			
			var tmp=$.xml2json(xml.responseXML);
			
			var localI=0;
			var localLength=0;
			var localTmp=new Array();
			$("#dsFileSelect").html("");
			for(i in tmp.layer){
			  localTmp.push(tmp.layer[i]);
			  if(tmp.layer[i]!="None")
			    $("#dsFileSelect").append("<option>"+tmp.layer[i]+"</option>");
			  localLength+=1;
			}
			$("#dsFileSelect").show();
			loadPageFromFile(this.dwDataSource,localLength);
			
		      }
		    });
		}
	  }
      });
}


function updateSelectWithFields(){
    var selIds=arguments[0];
    //alert(selIds);
    var tid=$("#indicateurs_indicators_territoires").val();
    if(arguments.length>1){
	tid=arguments[1]+";layer=indexes."+($("#agregation").is(":visible")?"agregate_t"+$("#p_tname").val()+"_idx_":"view_idx_")+System.nodeId;
	System.u0=true;
    }else
	System.u0=false;
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.getMapRequest&DataInputs=t_id="+tid+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		$.ajax({
		    type: "GET",
		    url: xml.responseText,
		    complete: function(xml,status){
			var i=0;
			var tmp=$(xml.responseXML).find("element").each(
			    function(){
				if($(this).attr("type")!="gml:GeometryPropertyType" &&
				   $(this).attr("type")!="ms:"+System.mmNodeId+"Type"){
				    if(i==0){
					for(var t=0;t<selIds.length;t++)
			      		    $("#"+selIds[t]).html("");
				    }
				    for(var t=0;t<selIds.length;t++)
					$("#"+selIds[t]).append('<option value="'+$(this).attr("name")+'" '+(System.selectedField0==$(this).attr("name")?'selected="true"':'')+'>'+$(this).attr("name")+" ("+$(this).attr("type")+')</option>');
				    i+=1;
				    if(System.onSelectField0){
				      System.onSelectField0();
				      System.onSelectField0=null;
				    }
				}
			    });
			
		    }
		});
	    }
	}
    });
    
}

/**
 * Common part
 */
var tableName="indicators";
function updateElement(){
    var params={id: System.nodeId};
    $("#"+tableName+"_edition_ui_step"+arguments[0]).find("input").each(function(){
	if($(this)[0].id!='indicateurs_indicators_keywords' && $(this)[0].id && $(this)[0].id.replace(/indicateurs_/,"")!=$(this)[0].id)
	    params[$(this)[0].id.replace(/indicateurs_/,"")]=$(this).val();
    });
    $("#indicateurs_description").val( CKEDITOR.instances.indicateurs_description.getData().replace(/\"/g,"\\\"") );
    $("#"+tableName+"_edition_ui_step"+arguments[0]).find("textarea").each(function(){
	params[$(this)[0].id.replace(/indicateurs_/,"")]=$(this).val();
    });


    $("#"+tableName+"_edition_ui_step"+arguments[0]).find("select").each(function(){
	if($(this)[0].multiple){
	    localId=$(this)[0].id.replace(/indicateurs_/,"");
	    params[localId]=[];
	    $(this).find("option:selected").each(function(){
		params[localId].push($(this).val());
	    });
	}
	else{
	    params[$(this)[0].id.replace(/indicateurs_/,"")]=$(this).val();
	}
    });
    //alert($.stringify(params));
    params=[
	{name: "table", value: tableName,dataType: "string"},
	{name: tableName+"_groups_in", value: "i_id",dataType: "string"},
	{name: tableName+"_groups_out", value: "g_id",dataType: "string"},
	{name: tableName+"_themes_in", value: "i_id",dataType: "string"},
	{name: tableName+"_themes_out", value: "t_id",dataType: "string"},
	{name: "t_hierarchy_in", value: "o_t_id",dataType: "string"},
	{name: "t_hierarchy_out", value: "p_t_id",dataType: "string"},
	{name: "keywords", value: $("#indicateurs_indicateurs_keywords").val(),dataType: "string"},
	{name: "tuple", value: $.stringify(params), mimeType: "application/json"}
    ];
    data=WPSGetHeader("np.updateElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    //alert(data);
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		System.noSelectAgain=true;
		refreshList();
	    }
	}
    });
}

function cleanUpSelect(){
    var localClean=arguments[1];
    var localId=0;
    $("#"+arguments[0]).find("option").each(function(){
	if(localId>localClean)
	    $(this).remove();
	localId+=1;
    });
}

function refreshDetails(){
    $(".toolbar2").find("a").each(function(){
	$(this).addClass("desactivated");
    });
    $(".tabs-project").find(".loader-container").each(function(){
	$(this).css({"height": ($("#indicateurs_edition_ui").height()-62)+"px"});
	$(this).show();
    });
    $("#indicateurs_edition_ui_step_metadata").find("input").val("");
    $(".tabs-project").find("input[type=text]").val("");
    $(".tabs-project").find("select").val("-1");
    $(".tabs-project").find("select").val(-1);
    $(".tabs-project").find("textarea").val("");
    var tmp=["mmsteps","table_step","graphs_step","repport_step"];
    for(i in tmp){
	$("#"+tmp[i]).val(-1);
	cleanUpSelect(tmp[i],(i>0?0:1));
    }
    /*$("#symbology").find("select").val("-1");
    $("#symbology").find("input").val("");
    $("#table").find("input").val("");
    $("#chart").find("input").val("");*/
    $("#mmPrefix").val("indexes");
    $("#mmDeleteStep").val(System.messages["Delete"]);

    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table="+tableName+";id="+System.nodeId+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		$("#metadata").click();
		var data=$.parseJSON(xml.responseText);
		System.full_index=data;
		if(!data["file"] || data["file"]==""){
		    $('input:radio[name=doct]')[1].checked = true;
		    $('#file0').hide();
		    $('#indicateurs_file_link0').hide();
		    $('#indicateurs_url').show();
		}
		else{
		    $('input:radio[name=doct]')[0].checked = true;
		    $('#indicateurs_url').hide();
		    $('#indicateurs_file_link0').html(data['file']);
		    $('#indicateurs_file_link0').attr("href",System.public_map_url+"/indicateurs/"+data['file']);
		    $('#indicateurs_file_link0').show();
		    //alert($('#indicateurs_file_link').attr("href"));
		    $('#file0').show();
		}
		for(var i in data){
		    if(!$.isArray(data[i])){
			if(i=="name"){
			    $("#"+tableName+"_"+i+"_title").html(data[i]+(eval(data["published"])?" ("+System.messages["published"]+")":""));
			}
			$("#"+tableName+"_"+i).val("");
			if(data[i]!=null)
			    $("#"+tableName+"_"+i).val(data[i]);
			else{
			    if($("#"+tableName+"_"+i)>0 && $("#"+tableName+"_"+i)[0].selectedIndex)
				$("#"+tableName+"_"+i).val(-1);
			    else
				$("#"+tableName+"_"+i).val("");
			}
		    }else{
			$("#"+tableName+"_"+i+" option:selected").removeAttr("selected");
			if(data[i].length)
			    for(var j=0;j<data[i].length;j++)
				$("#"+tableName+"_"+i+' option[value="'+data[i][j]+'"]').attr("selected", "selected");
			else
			    $('#'+tableName+'_'+i+' option[value="-1"]').attr("selected", "selected");
		    }
		}
		$(".toolbar2").find("a.metadata").each(function(){
		    $(this).removeClass("desactivated");
		});
		$(".tabs-project").find("#metadata > .loader-container").each(function(){
		    $(this).hide();
		});
		$(".iunpublish").removeClass("desactivated");
		$(".ipublish").removeClass("desactivated");
		if(data["file_link"]){
		  $("input[value='opt1']").prop("checked",true);
		  var test=$("input[value='opt1']").val();
		  $(".desc").hide();
		  $("#" + test).show();
		  $(".tbl_part").hide();
 		  $("#indicateurs_file_link").html("");
		  $("#indicateurs_territoires_filename").val(data["filename"]);
		  $("#indicateurs_file_link").attr("href",data["filename"]);
		  if(data["query"]==null || data["query"]=="null")
		    loadTableForFile();
		  else{
		    $("input[value='opt3']").prop("checked",true);
		    var test=$("input[value='opt3']").val();
		    $(".desc").hide();
		    $("#" + test).show();
		    $(".tbl_part").hide();
		    $("#mmSQLQuery").val(data["query"]);
		    $("#mmDbConnection").val(data["ds"]);
		    runQuery();
		  }
		  System.selectedField0=data["indicateurs_territoires_key"];
		  System.onSelectField0=function(){
		      System.onIndexRefresh=function(){
			  refreshLayerStyle();
			  refreshRepport();
			  //alert('load graph !');
		      }
		      refreshIndex();
		  }
		  updateSelectWithFields(['indicateurs_indicateurs_territoires_key']);
		}else{
		    //alert("First load");
		    $("#dsContainer").html("");
		    $(".toolbar2").find("a.data").each(function(){
			$(this).removeClass("desactivated");
		    });
		    $(".tabs-project").find("#data > .loader-container").each(function(){
			$(this).hide();
		    });
		    
		}
		createEditor("indicateurs_description");
	    }
	}
    });
}

function refreshAggregation(){
    $("#p_tname").find("option").each(function(){
	var t=$(this).val()==-1;
	if(t)
	    $(this).attr("selected","selected");
	else
	    $(this).remove();
    });
    $("#agregation_chk").prop('checked', false);
    $("#agreg").toggle(false);
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table=territoires;id="+$("#indicateurs_indicateurs_territoires").val()+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		$('.aggregation').removeClass('desactivated');
		var data=$.parseJSON(xml.responseText);
		if(System.refreshSteps)
		    addSteps("agregation_step");
		System.refreshSteps=true;
		for(var i in data){
		    if(i=="t_hierarchy"){
			if(data[i].length)
			    for(var j=0;j<data[i].length;j++)
				$('#p_tname').append($("<option></option>")
						     .attr("value",data[i][j])
						     .text(System.territories["id_"+data[i][j]]));
			else
			    $('#p_tname option[value="-1"]').attr("selected", "selected");
		    }
		}
	    }
	}
    });

}

function insertAgregate(){
    var vars="";
    if($("#agregate_steps").is(":visible") && $("#agregate_step").val()>0)
	vars+=";step="+($("#agregate_step")[0].selectedIndex-1);
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.createAgregate&DataInputs=table=public.territoires;field="+$('#s_fname').val()+";id="+System.nodeId+";tid="+$('#p_tname').val()+";formula="+$("#agregation_formula").val()+vars+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		//alert(xml.responseText);
		$("#agregate_flexi").html(xml.responseText);
		startLayerStyleFlexi();
	    }
	}
    });

}

function refreshList(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.list&DataInputs=table=indicators&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		System.currentList={};
		for(i=0;i<data.length;i++){
		    System.currentList[data[i]["id"]]=data[i]["text"];
		}
		$('#ltree').tree({ 
		    data: data,  
		    onSelect: function(node){
			System.nodeId=node.id;
			System.nodeVal=node.text;
			refreshDetails();
		    }
		});
		if(!System.noSelectAgain){
		    var tmp=$("#ltree").tree('getSelected');
		    var tmpr=$("#ltree").tree('getRoot');
		    if(!tmp && tmpr){
			$("#ltree").tree('select',tmpr.target);
		    }
		}else{
		  var node = $('#ltree').tree('find', System.nodeId);
		  $("#ltree").tree('select',node.target);
		}
		System.noSelectAgain=false;
	    }
	}
    });
}

function deleteElement(){
    params=[
	{name: "table", value: "territoires",dataType: "string"},
	{name: "id", value: System.nodeId,dataType: "string"}
    ];
    data=WPSGetHeader("np.deleteElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshList();
		$('#delete-territory-dialog').window('close');
	    }
	}
    });
}

function insertGraph(){
    var prefix="";
    if(arguments.length>0)
	prefix="agregate_";	
    params=[
	{name: "table", value: "graphs",dataType: "string"},
	{name: "name", value: $("#graphs_title").val(),dataType: "string"},
	{name: "type", value: $("#graphs_f_type").val(),dataType: "string"},
	{name: "lx", value: $("#"+prefix+"graphs_lx").val(),dataType: "string"},
	{name: "vx", value: $("#"+prefix+"graphs_vx").val(),dataType: "string"},
	{name: "ly", value: $("#graphs_ly").val(),dataType: "string"},
	{name: "vy", value: $("#graphs_vy").val(),dataType: "string"},
	{name: "tooltip", value: $("#graphs_tooltip").val(),dataType: "string"},
	{name: "formula", value: $("#graphs_formula").val(),dataType: "string"},
	{name: "it_id", value: "(SELECT id from indicateurs_territoires where i_id="+System.nodeId+($("#agregation").is(":visible")?" and t_id="+$("#p_tname").val():" and (not(agregation) or agregation is null)")+")",dataType: "string"}	
    ];
    if(arguments.length>0){
	test=false;
	params.push({
	    name: "tid",
	    value: $("#p_tname").val(),
	    dataType: "string"
	});
    }
    test=$("#"+prefix+"graphs_id").val()!='-1' && $("#"+prefix+"graphs_id").val()!='';
    if(test){
	params.push({
	    name: "id",
	    value: $("#"+prefix+"graphs_id").val(),
	    dataType: "string"
	});
    }
    if($("#graphs_steps").is(":visible") && $("#graphs_step").val()>0)
	params.push({"name":"step","value":($("#graphs_step")[0].selectedIndex-1),dataType: "string"});

    data=WPSGetHeader("np."+(test?"updateElem":"insertElem"))+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		if(prefix=="")
		    refreshGraphFields();
		else
		    refreshGraphFields(prefix);
		//alert("reload graph!");
	    }
	}
    });
}

function insertTable(){
    //alert($(".sasc").length);
    params=[
	{name: "table", value: "d_table",dataType: "string"},
	{name: "name", value: $("#table_title").val(),dataType: "string"},
	{name: "i_id", value: System.nodeId,dataType: "string"}
    ];
    if($("#table_steps").is(":visible") && $("#table_step").val()>0)
	params.push({name: "step", value: ($("#table_step")[0].selectedIndex-1),dataType: "string"});
    test=$("#table_id").val()!='-1' && $("#table_id").val()!='';
    if(test){
	params.push({
	    name: "id",
	    value: $("#table_id").val(),
	    dataType: "string"
	});
    }
    if($(".sasc").length>1){
	var cnt=0;
	$(".sasc").each(function(){
	    if(cnt==1)
		params.push({
		    name: "order_by",
		    value: $(this).html(),
		    dataType: "string"
		});
	    cnt+=1;
	});
    }
    data=WPSGetHeader("np."+(test?"updateElem":"insertElem"))+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshTableFields();
		//alert("reload table!");
	    }
	}
    });
}


function insertElement(){
    params=[
	{name: "table", value: "indicateurs",dataType: "string"},
	{name: "name", value: $("#eName").val(),dataType: "string"}
    ];
    data=WPSGetHeader("np.insertElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshList();
		$('#add-index-dialog').window('close');
	    }
	}
    });
}

function removeElement(){
    params=[
	{name: "table", value: "indicateurs",dataType: "string"},
	{name: "atable", value: "indicateurs_groups",dataType: "string"},
	{name: "akey", value: "i_id",dataType: "string"},
	{name: "atable", value: "d_table",dataType: "string"},
	{name: "akey", value: "i_id",dataType: "string"},
	{name: "atable", value: "r_table",dataType: "string"},
	{name: "akey", value: "i_id",dataType: "string"},
	{name: "atable", value: "indicateurs_groups",dataType: "string"},
	{name: "akey", value: "i_id",dataType: "string"},
	{name: "atable", value: "indicateurs_keywords",dataType: "string"},
	{name: "akey", value: "i_id",dataType: "string"},
	{name: "id", value: System.nodeId,dataType: "string"}
    ];
    data=WPSGetHeader("np.deleteElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshList();
		$('#remove-index-dialog').window('close');
	    }
	}
    });
}

$(function () {
    var tabContainers = $('div.tabs-project > div');
    tabContainers.hide().filter(':first').show();
    $('div.toolbar2 a').click(function () {
        if($(this).is("._nothidable"))
            ;
        else{
            tabContainers.hide();
            tabContainers.filter(this.hash).show();
        }
    }).filter(':first').click();
});



function loadTableForFile(){
  $("#dsContainer").html('<table id="flex_csv" class="hideBody"></table>');
  $.ajax({
    type: "GET",
    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.getLastFile&DataInputs=&RawDataOutput=Result",
    dataType: 'xml',
    complete: function(xml,status) {

	dwDataSource=xml.responseText;
	$("#indicateurs_territoires_filename").val(dwDataSource);

	$.ajax({
	  dwDataSource: dwDataSource,
	  type: "GET",
	  url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=vector-tools.mmVectorInfo2Map&DataInputs=dataSource="+dwDataSource.replace(/__/g,"/")+";force=1&RawDataOutput=Result",
	  dataType: 'xml',
	  complete: function(xml,status) {
	      
	      var tmp=$.xml2json(xml.responseXML);
	      
	      var localI=0;
	      var localLength=0;
	      var localTmp=new Array();
	      $("#dsFileSelect").html("");
	      for(i in tmp.layer){
		localTmp.push(tmp.layer[i]);
		if(tmp.layer[i]!="None")
		  $("#dsFileSelect").append("<option>"+tmp.layer[i]+"</option>");
		localLength+=1;
	      }
	      $("#dsFileSelect").show();
	      loadPageFromFile(this.dwDataSource,localLength);
	      
	    }
	  });
	
      }
    });
}


function loadPageFromFile(){
    System.loadId="flex_csv";
    if(arguments.length>2)
	System.loadId="agregate_dsContainer1";
    System.dsField=(arguments.length>2?arguments[2]:$("#dsFileSelect").val());
  $.ajax({
      mmid: arguments[1],
      dwDataSource: arguments[0],
      dwLayer: System.dsField,
      type: "GET",
      url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=vector-tools.mmExtractVectorInfo&DataInputs=dataSource="+arguments[0]+";layer="+System.dsField+"&RawDataOutput=Result",
      dataType: 'xml',
      complete: function(xml,status) {
	  colModel=[];
	  fields=[];
	  try{
	      var tmp=$.xml2json(xml.responseXML);
	      var nbCol=0;
	      
	      if(tmp.fields){
		  if(tmp.fields.field.length)
		      for(j=0;j<tmp.fields.field.length;j++){
			  colModel[nbCol]={display: tmp.fields.field[j].id, name : tmp.fields.field[j].id, width: (nbCol==0?80:120), sortable : true, align: 'center'};
			  fields[nbCol]=tmp.fields.field[j].id;
			  nbCol++;
		      }
		  else{
		      colModel[nbCol]={display: tmp.fields.field.id, name : tmp.fields.field.id, width: (nbCol==0?80:120), sortable : true, align: 'center'};
		      fields[nbCol]=tmp.fields.field.id;
		      nbCol++;
		  }
		  var localTmp1=tmp;
		  
		  
		  var lopts={
		      autoload: true,
		      url: System.zooUrl,
		      dataType: 'xml',
		      colModel: colModel,
		      usepager: true,
		      sortname: (tmp.fields.field.length?tmp.fields.field[0].id:tmp.fields.field.id),
		      sortorder: "asc",
		      id: System.flexi_cnt,
		      fields: fields,
		      dwDataSource: this.dwDataSource.replace(/__/g,"/"),
		      dwLayer: this.dwLayer,
		      dwDataType: (tmp.geometry=='Polygon'?'polygon':(tmp.geometry=='Point'?'point':'line')),
		      mmid: this.mmid,
		      nbElements: tmp.featureCount,
		      title: this.dwDataSource.replace(/__/g,"/")+" / "+tmp.name.replace(/__/g,"/"),
		      useLimit: true,
		      limit: 10,
		      showTableToggleBtn: true,
		      width: "100%",
		      height: 290 
		  };
		  if(System.loadId=="agregate_dsContainer1"){
		      lopts["showTableToggleBtn"]=true;
		      lopts["tableToggleBtns"]= 
			  [
			      {title: System.messages["Display parameters"],name: 'table0',onclick: function(){
				  var myId=this.id.split('_')[1];
				  loadIndexDisplaySettings($("#p_tname").val());
			      }}
			  ];
		  }
		  $("#"+System.loadId).flexigrid(lopts);
		  if(System.loadId!="agregate_dsContainer1"){
		      $("#flex0").addClass('hideBody');  
		      $(".tbl_part").show();
		  }
	      }
	  }catch(e){alert(e);}
      }
  });
}


function parseParams(){
  var fields="";
  var fkey="";
  var fields_width="";
  var cnt=0;

  var params=new Array();
  params=[
	  ];

  if($("input[value='opt3']").is(":checked")){
    if($("#mmDbConnection").val()!="-1")
      params.push({name: "dbname", value: $("#mmDbConnection").val(), dataType: "sring"});
    if($("#mmSQLQuery").val()!="")
      params.push({name: "query", value: $("#mmSQLQuery").val(), dataType: "sring"});
  }

  $("#dsContainer .hDiv").find("th").each(function(){
      if(this.style.display!='none'){
	if(cnt==0)
	  params.push({"name": "field","value":$(this).text(),dataType:"string"})
	  fkey=$(this).text();
	fields+=(cnt>0?",":"")+$(this).text();
	fields_width+=(cnt>0?',':'')+$(this).width();
	params.push({"name": "rcol","value":$(this).text(),dataType:"string"})
	cnt++;
      }
    });

  // table indicateurs_indicateurs_territoires
  params.push({"name": "territoire","value":$("#indicateurs_indicateurs_territoires").val(),dataType:"string"});

  // field indicateurs_indicateurs_territoires_key
  params.push({"name": "field","value":$("#indicateurs_indicateurs_territoires_key").val(),dataType:"string"});

  // field indicateurs_territoires_filename
  if($("#indicateurs_territoires_filename").val()!="" && $("#indicateurs_territoires_filename").val()!="None")
    params.push({"name": "filename","value":$("#indicateurs_territoires_filename").val(),dataType:"string"});

  params.push({"name": "type","value":($("input[value='opt1']").is(":checked")?"file":$("input[value='opt2']").is(":checked")?"table":"sql"),dataType:"string"});
  var node=$("#ltree").tree("getSelected");
  params.push({"name": "id","value":node.id,dataType:"string"})
  
  params.push({"name": "sql","value":"SELECT "+fields+" FROM \""+$("#dsFileSelect").val()+"\"",dataType:"string"});

  params.push({"name": "layer","value":$("#dsFileSelect").val(),dataType:"string"});

  return params;
}

function createIndex(){

  params=parseParams();

  data=WPSGetHeader("np.createIndex")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
  $.ajax({
    type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	if(checkWPSResult(xml)){
	    System.onIndexRefresh=function(){
		refreshLayerStyle();
	    };
	  refreshIndex();
	}
      }
    });
  

}

function refreshIndex(){
  var node=$("#ltree").tree("getSelected");
  System.mmNodeId="indexes.view_idx"+System.nodeId;

  $.ajax({
    type: "GET",
	//contentType: "text/xml",
	url: System.zooUrl+"?service=wps&version=1.0.0&request=Execute&Identifier=np.refreshIndex&DataInputs=id="+node.id+"&RawDataOutput=Result@mimeType=text/xml",
	//data: data,
	complete: function(xml,status) {
	if(checkWPSResult(xml,false)){
	  refreshAggregation();
	  colModel=[];
	  fields=[];
	  try{
	    var tmp=$.xml2json(xml.responseXML);
	    var nbCol=0;

	    $(".fselect").html("<option>"+System.messages["Choose"]+"</option>");
	    if(tmp.fields){
	      if(tmp.fields.field.length)
		for(j=0;j<tmp.fields.field.length;j++){
		  colModel[nbCol]={display: tmp.fields.field[j].id, name : tmp.fields.field[j].id, width: (nbCol==0?80:120), sortable : true, align: 'center'};
		  fields[nbCol]=tmp.fields.field[j].id;
		  $(".fselect").append("<option>"+fields[nbCol]+"</option>");
		  nbCol++;
		}
	      else{
		colModel[nbCol]={display: tmp.fields.field.id, name : tmp.fields.field.id, width: (nbCol==0?80:120), sortable : true, align: 'center'};
		fields[nbCol]=tmp.fields.field.id;
		$(".fselect").append("<option>"+fields[nbCol]+"</option>");
		nbCol++;
	      }
	    }

	      if(System.onIndexRefresh){
		  System.onIndexRefresh();
		  System.onIndexRefresh=null;
	      }


	    var localTmp1=tmp;

	    
	    if(tmp.fields){
  
	      try{
		$("#dsContainer1").html('<table id="flex_csv1" class="hideBody"></table>');
		  System.flex1=$("#flex_csv1").flexigrid({
		      autoload: true,
		      url: System.zooUrl,
		      dataType: 'xml',
		      colModel: colModel,
		      usepager: true,
		      sortname: (tmp.fields.field.length?tmp.fields.field[0].id:tmp.fields.field.id),
		      sortorder: "asc",
		      id: 1,
		      fields: fields,
		      dwDataSource: System.dbuser,
		      dwLayer: tmp.name,
		      dwDataType: (tmp.geometry=='Polygon'?'polygon':(tmp.geometry=='Point'?'point':'line')),
		      mmid: this.mmid,
		      nbElements: tmp.featureCount,
		      title: "Index ( "+tmp.name+" )",
		      useLimit: true,
		      limit: 10,
		      showTableToggleBtn: true,
		      tableToggleBtns: 
		      [
			  {title: System.messages["Display parameters"],name: 'table0',onclick: function(){
			      var myId=this.id.split('_')[1];
			      loadIndexDisplaySettings();
			  }}
		      ],
		      bottomToggleBtns:
		      [
			  {content: '<span class="pEncoding">'+System.messages["Choose encoding:"]+'<input href="#" type="text" class="change-format" style="width: 80px;margin-top: 5px;" name="swenc_1" id="swenc_1" value="'+tmp.encoding+'" /></span>'}
		      ],
		      width: "100%",
		      height: 290 
		  });
		  $(".toolbar2").find("a.data").each(function(){
		      $(this).removeClass("desactivated");
		  });
		  $(".tabs-project").find("#data > .loader-container").each(function(){
		      $(this).hide();
		  });

	      }catch(e){alert("Flexigrid failed to be created "+e);}
	    }
	  }
	  catch(e){
	    alert(e);
	  }
	  
	}
      }
    });
}

var toRunAfter=[];

function saveLayerStyle(){
    var dvalue="";
    try{
	dvalue=$("#s_ctype").val();
	if(dvalue=="timeline")
	    dvalue=$("#dropdown1").val();
    }catch(e){
	dvalue="uniqSymb";
    }
    localArg=arguments[0];
    localArg1=(arguments>2?arguments[2]:null);
    var lhatch=$("#class-hatch_check")[0]?$("#class-hatch_check")[0]:$("#hatch_check")[0];
    var prefix=(arguments.length>2?"class-":(arguments.length>1?"class-style-":(arguments.length>0?"class-":"")));
    var prefix1=(arguments.length>2?"class_":(arguments.length>1?"class_style_":(arguments.length>0?"class_":"")));
    var localArgs=arguments;


    var url=System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=mapfile.saveLayerStyle&DataInputs=";
    var newcName="";
    try{
	url+="prefix=indexes;map="+($("#agregation").is(":visible")?"A"+$("#p_tname").val()+"_":"")+"Index"+System.nodeId;
	url+=";layer=indexes."+($("#agregation").is(":visible")?"agregate_t"+$("#p_tname").val()+"_idx_":"view_idx")+System.nodeId;
	url+=";mmClassName="+$("#"+prefix+"cName").val();
	newCName=$("#"+prefix+"cName").val();
	if($("#"+prefix+"cExpressionC")[0].checked){
	    url+=";mmExpr="+$("#"+prefix+"cExpression").val();
	}
	url+=";mmClassName="+$("#"+prefix+"cName").val();
	if(arguments.length>2)
	    url+=";mmStep="+arguments[2];
	url+=";mmType="+dvalue;
	if(System.rasterLayer==1)
	    url+=";mmOpacity="+$("#opacity").val().replace("%","")+";resm="+$("#resMethod").val()+(arguments.length==0?";force=true":"");
	else{
	    url+=";mmSymb="+((lhatch && lhatch.checked==true) && arguments.length<=1?"polygon_hatch;mmHatchWidth="+$("#"+(lhatch.id=="class-hatch_check"?"class-":"")+"hatch_width").val()+";mmAngle="+$("#"+(lhatch.id=="class-hatch_check"?"class-":"")+"hatch_angle").val():((lhatch && lhatch.checked==false)?"":$("#"+prefix1+"symbolSelected").val()));
	    url+=";mmFill="+$("#"+prefix+"fill-colorpicker").val().replace("#","");
	    url+=";mmStroke="+$("#"+prefix+"stroke-colorpicker").val().replace("#","");
	    url+=($("#"+prefix+"stroke-width")[0]?";mmStrokeWidth="+$("#"+prefix+"stroke-width").val():"");
	    url+=";mmWidth="+$("#"+prefix1+"layerWidth").val();
	    url+=";mmSize="+((lhatch && lhatch.checked==false) && arguments.length<=1?"-1.0":$("#"+(lhatch && lhatch.checked==true && arguments.length<=1?(lhatch.id=="class-hatch_check"?"class-":"")+"hatch_size":prefix1+"layerSize")).val());
	    url+=";mmOpacity="+$("#opacity").val().replace("%","");
	    url+=";"+(arguments.length>0?"mmClass="+arguments[0]:"mmClass=0");
	    url+=(arguments.length>1 && arguments[1]!=null?";mmStyle="+arguments[1]:"");
	    url+=(arguments.length==2?";mmStep="+arguments[2]:"");
	    url+=(arguments.length==0?";force=true":"");
	    url+=($('#'+prefix+'stroke-colorpicker-chk')[0]?($('#'+prefix+'stroke-colorpicker-chk')[0].checked?"":";noStroke=true"):"");
            url+=($('#'+prefix+'fill-colorpicker-chk')[0]?($('#'+prefix+'fill-colorpicker-chk')[0].checked?"":";noFill=true"):"");
	    url+=($('#'+prefix+'pattern_check')[0]&&$('#'+prefix+'pattern_check')[0].checked?";pattern="+$('#'+prefix+'pattern').val():"");
	    url+=($("#"+prefix1+"layerGap")[0]?";mmGap="+$("#"+prefix1+"layerGap").val():"");
	    url+=($("#"+prefix1+"symbol_check")[0] && $("#"+prefix1+"symbol_check")[0].checked==false?";noSymbolFill=true":"");
	}
	url+="&RawDataOutput=Result";
    }catch(e){
	alert(e);
    }
    
    $.ajax({
	localArgs: localArgs,
	type: "GET",
	prefix1: prefix1,
	prefix: prefix,
	url: url,
	dataType: "xml",
	complete: function(xml,status){
	    $.notifyBar({ cls: "success", html: xml.responseText });

	
	    if(localArg>=0){
	      $("#"+this.prefix1+"Legend")[0].src=System.mapUrl+"?map="+System.dataPath+"/indexes_maps/map4legend_Index"+System.nodeId+"_indexes_view_idx"+System.nodeId+(localArgs.length>2?"_step"+localArgs[2]:"")+".map&service=WMS&version=1.0.0&request=Getmap&LAYERS=indexes.view_idx"+System.nodeId+(localArg>0?"_"+(localArg+1):"")+"&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=-1.5,-1.5,7.5,7.5&SRS=EPSG:4326&WIDTH=24&HEIGHT=24&mmTime="+Math.random();
	    }else{
	      if($("#Legend")[0]){
		$("#Legend")[0].src=System.mapUrl+"?map=/Users/djay/Sites/data/maps/map4legend_"+$("#mapName")[0].value+"_"+System.mmNodeId+".map&service=WMS&version=1.0.0&request=Getmap&LAYERS="+System.mmNodeId+"&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=-1.5,-1.5,7.5,7.5&SRS=EPSG:4326&WIDTH=24&HEIGHT=24&mmTime="+Math.random();
	      }
	    }

	    refreshLayerStyle();

	}
    });	 
    
}



function editClass(){
  //alert($("#agregation").is(":visible"));
  params=[
	  {"name":"prefix","value":"indexes","dataType":"string"},
      {"name":"name","value":($("#agregation").is(":visible")?"A"+$("#p_tname").val()+"_":"")+"Index"+System.nodeId+($("#agregate_step").is(":visible")?"_step"+($("#agregate_step")[0].selectedIndex-1):""),"dataType":"string"},
	  {"name":"layer","value":"indexes."+($("#agregation").is(":visible")?"agregate_t"+$("#p_tname").val()+"_idx_"+System.nodeId:"view_idx"+System.nodeId),"dataType":"string"},
	  {"name":"orig","value":System.dbuserName,"dataType":"string"},
	  {"name":"id","value":System.nodeId,"dataType":"string"},
	  {"name": "mmClass","value": arguments[0],"dataType":"string"}
	  ];
  if(arguments.length>1)
    params.push({"name": "mmStep","value": arguments[1],"dataType":"string"});
    data=WPSGetHeader("mapfile.createLegend")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
      type: "POST",
	  contentType: "text/xml",
	  url: System.zooUrl,
	  data: data,
	  complete: function(xml,status) {
	  $( "#class-dialog" ).html(xml.responseText);
	  $( "#class-dialog" ).window({
	    minimizable:false,
		maximizable:false,
		resizable: false,
		height:260,
		width:370
		});
	  $('#class-fill-colorpicker').colorPicker();
	  $('#class-stroke-colorpicker').colorPicker();
	  for(i=0;i<toRunAfter.length;i++)
	    toRunAfter[i]();
	  $( "#slider-opacity" ).slider({
		    value:$("#opacity")[0].value.replace("%",""),
		    min: 0,
		    max: 100,
		    step: 1,
		    slide: function( event, ui ) {
			$("#opacity").val(ui.value +  "%" );
		    }	
		});
	}
      });
}

function classifyMap(){
    var localArg=arguments[0];
    if(arguments.length>1)
	var localArg0="A"+arguments[1]+"_";
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?request=Execute&service=WPS&version=1.0.0&Identifier=mapfile.classifyMap&DataInputs=prefix=indexes;orig="+System.dbuserName+";layer=indexes.view_idx"+System.nodeId+";map="+(localArg0?localArg0:"")+"Index"+System.nodeId+";field="+$("#s_fname").val()+";from="+$("#s_color2").val().replace("#","")+";to="+$("#s_color3").val().replace("#","")+""+($("#s_ctype").val()=="gradSymb" || ($("#dropdown1").val()=="gradSymb" && $("#dropdown1").is(":visible"))?";type=gs":"")+($("#s_ctype").val()=="uniqVal"?"":";nbClasses="+$("#s_nbc").val())+";formula="+$("#s_formula").val()+($("#s_ctype").val()=="timeline"?";mmStep="+($("#mmsteps")[0].selectedIndex-2)+";mmType="+$("#dropdown1").val():";type="+$("#s_ctype").val())+($("#dropdownd").val()!=-1?";method="+$("#dropdownd").val().replace("%",""):"")+(localArg0?";agregate=true":"")+";mmOpacity=45&RawDataOutput=Result",
	dataType: "xml",
	complete: function(xml,status){
	    if(localArg=="cc"){
		$("#ccLegend")[0].src="http://127.0.0.1/np-bin/zoo_loader.cgi?request=Execute&service=WPS&version=1.0.0&Identifier=classifier.getClassifierImage&DataInputs=from="+$("#cc-min-colorpicker").val().replace("#","")+";to="+$("#cc-max-colorpicker").val().replace("#","")+";nbClass=24&RawDataOutput=Result";
	    }
	    $("#indexStyle"+(localArg0?"A":"")).html(xml.responseText);
	    $(".flexiClasses"+(localArg0?"A":"")).flexigrid({
		title: 'Classes', 
		noSelection: true,
		height: 220, 
		rp: 4, 
		usepager: false, 
		resizable: false
	    });
	    
	}
    });	 
}

System.cpi=2;
function _startColorPicker(){
  tColor='#00ff00';
  if(arguments.length>0){
    tColor='#'+arguments[0];
  }

  $('#customWidget2 > div').html('<div id="colorSelector2"><div style="background-color:'+tColor+'"></div></div><div id="colorpickerHolder2"></div>');

  $("#s_color2").val(tColor.replace("#",""));

  $('#colorpickerHolder2').ColorPicker({
    flat: true,
	color: tColor,
	onSubmit: function(hsb, hex, rgb) {
	$('#colorSelector2 div').css('backgroundColor', '#' + hex);
	$("#s_color2").val(hex);
      }
    });
  
  tColor='#00ff00';
  if(arguments.length>1){
    tColor='#'+arguments[1];
  }
  $("#s_color3").val(tColor.replace("#",""));
  $('#customWidget3 > div').html('<div id="colorSelector3"><div style="background-color:'+tColor+'"></div></div><div id="colorpickerHolder3"></div>');

    $(' #colorpickerHolder3').ColorPicker({
        flat: true,
        color: tColor,
        onSubmit: function(hsb, hex, rgb) {
	  $('#colorSelector3 div').css('backgroundColor', '#' + hex);
	  $("#s_color3").val(hex);
        }
    });
    
    $('#colorpickerHolder2>div, #colorpickerHolder3>div').css('position', 'absolute');
    var widt = false;
    $('#colorSelector2').bind('click', function() {
	$('#colorpickerHolder2').stop().animate({height: widt ? 0 : 173}, 500);
	widt = !widt;
    });
    $('#colorSelector3').bind('click', function() {
	$('#colorpickerHolder3').stop().animate({height: widt ? 0 : 173}, 500);
	widt = !widt;
    });

}


function startColorPicker(){

    $("#customWidget2 > div").html('<div id="colorSelector2"><div style="background-color:#'+(arguments.length>0?arguments[0]:'9ACB6B')+'"></div></div><div id="colorpickerHolder2"></div>');

    var tColor="ff0000";
    if(arguments.length>0){
	$('#colorSelector2 div').css('backgroundColor', '#' + arguments[0]);
	tColor=arguments[0];
    }

    
    $('#colorpickerHolder2').ColorPicker({
        flat: true,
        color: "#"+tColor,
        onSubmit: function(hsb, hex, rgb) {
            $('#colorSelector2 div').css('backgroundColor', '#' + hex);
	    $("#s_color2").val(hex);
        }
    });

    $('#colorpickerHolder2>div').css('position', 'absolute');
    var widt = false;
    $('#colorSelector2').bind('click', function() {
        $('#colorpickerHolder2').stop().animate({height: widt ? 0 : 173}, 500);
        widt = !widt;
    });

}

function startLayerStyleFlexi(){
    $(".flexiClassesA").flexigrid(
	{
	    title: 'Classes', 
	    noSelection: true,
	    height: 220, 
	    rp: 4, 
	    usepager: false, 
	    showTableToggleBtn: true,
	    tableToggleBtns: 
	    [
		{
		    title: System.messages["Display table parameters"],name: 'table',onclick: function(){
			var myId=this.id.split('_')[1];
			loadAgregatedIndexDisplaySettings();
		    }
		},
		{
		    title: System.messages["Display graph parameters"],name: 'chart',onclick: function(){
			var myId=this.id.split('_')[1];
			loadAgregatedIndexGraphSettings();
		    }
		},
		{
		    title: System.messages["Display repport parameters"],name: 'repport',onclick: function(){
			var myId=this.id.split('_')[1];
			loadAgregatedIndexRepportSettings();
		    }
		}
	    ],
	    resizable: false});
}

function refreshLayerStyle(){
  params=[
      {"name":"prefix","value":"indexes","dataType":"string"},
      {"name":"name","value":($("#agregation").is(":visible")?"A"+$("#p_tname").val()+"_":"")+"Index"+System.nodeId+($("#agregate_step").is(":visible") && $("#agregate_step")[0].selectedIndex-1>=0?"_step"+($("#agregate_step")[0].selectedIndex-1):""),"dataType":"string"},
      {"name":"layer","value":"indexes."+($("#agregation").is(":visible")?"agregate_t"+$("#p_tname").val()+"_idx_":"view_idx")+System.nodeId+($("#agregate_step").is(":visible") && $("#agregate_step")[0].selectedIndex-1>=0?"_step"+($("#agregate_step")[0].selectedIndex-1):""),"dataType":"string"},
      {"name":"orig","value":System.dbuserName,"dataType":"string"},
      {"name":"id","value":System.nodeId,"dataType":"string"}
  ];

    if($('.tl').is(":visible")){
	lindex=-2;
	$("#mmsteps option").each(function(){
	    if($(this).is(":selected"))
	       return;
	    else
		lindex++;
	});
	params.push({"name": "mmStep","value": lindex,"dataType":"string"});
    }
  data=WPSGetHeader("mapfile.createLegend")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
  $.ajax({
      type: "POST",
      contentType: "text/xml",
      url: System.zooUrl,
      data: data,
      complete: function(xml,status) {
	  if(checkWPSResult(xml,false)){
	      if($("#agregation").is(":visible")){
		  $("#agregate_flexi").html(xml.responseText);
		  startLayerStyleFlexi();
	      }else{
		  $("#indexStyle").html(xml.responseText);
		  $(".flexiClasses").flexigrid({
		      title: 'Classes', 
		      noSelection: true,
		      height: 220, 
		      rp: 4, 
		      usepager: false, 
		      resizable: false
		  });
		  $(".toolbar2").find("a.symbology").each(function(){
		      $(this).removeClass("desactivated");
		  });
		  $(".tabs-project").find("#symbology > .loader-container").each(function(){
		      $(this).hide();
		  });

		  refreshGraphFields();
		  refreshTableFields();
	      }
	  }
      }
    });

  params=[
	  {"name":"id","value":System.nodeId,"dataType":"string"}
  ];
  if(arguments.length>0)
      params.push({"name":"step","value":arguments[0],"dataType":"string"});

  data=WPSGetHeader("np.getIndexStyle")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
  $.ajax({
    type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		tmp=$.parseJSON(xml.responseText);
		$('#s_fname').val(tmp.var);
		$('#s_formula').val(tmp.formula);
		$('#s_nbc').val(tmp.nbc);
		$('#s_ctype').val((tmp.ctype=="gs"?"gradSymb":(tmp.ctype=="tl"?"timeline":(tmp.ctype=="uv"?"uniqValue":""))));
		$('#dropdownd').val((tmp.cmethod?tmp.cmethod:-1));
		if(tmp.ctype=="tl"){
		    $('.tl').show();
		    //$("#mmsteps").val(-1);
		    $("#dropdown1").val(tmp.cctype);
		    System.runAfterStep=function(){
			if(!System.break)
			    $("#mmsteps").val(-1);
			else
			    $("#mmsteps").val(System.stepId0);
		    };
		    MMStyler.Timeline.refreshStepList();
		    System.startWindowStep=function(){
			System.break=true;
			System.stepId0=$("#mmsteps").val();
			refreshLayerStyle($("#mmsteps")[0].selectedIndex-2);
		    };
		}
		else{
		    $('.tl').hide();
		    System.startWindowStep=function(){};
		}
		if($("#s_ctype").val()=='gradSymb')
		    $('#discret').show(); 
		else $('#discret').hide();
		_startColorPicker(tmp.icol,tmp.ocol);
	    }

      }
    });

}

function saveIndexDisplaySettings(){
  params=[
	  {"name":"tmpl","value":"Indexes/tableDisplaySettings","dataType":"string"},
	  {"name":"id","value":System.nodeId,"dataType":"string"}
	  ];
  if($("#table_steps").is(":visible") && $("#table_step").val()>0)
      params.push({"name":"step","value":($("#table_step")[0].selectedIndex-1),"dataType":"string"});
  if(arguments.length>0)
      params.push({
	  "name":"tid",
	  "value":arguments[0],
	  "dataType":"string"
      });

  if($("#agregate_step")[0] && $("#agregate_step")[0].selectedIndex-1>=0)
      params.push({
	  "name":"step",
	  "value":$("#agregate_step")[0].selectedIndex-1,
	  "dataType":"string"
      });

  tuples=[]
  for(var i=0;i<$("#dtable_fnb").val();i++){
      var params0={
	      "display": $("#dtable_display_"+i).is(':checked')+"",
		"search": $("#dtable_search_"+i).is(':checked')+"",
		"pos": $("#dtable_pos_"+i).val(),
		"var": $("#dtable_var_"+i).val(),
		"label": $("#dtable_label_"+i).val(),
		"value": $("#dtable_value_"+i).val(),
		"width": $("#dtable_width_"+i).val(),
      };
      if($('#agregation').is(":visible") && $("#agregate_step")[0].selectedIndex-1>=0){
	  params0["step"]=$("#agregate_step")[0].selectedIndex-1;
      }
    params.push({
      name:"tuple",
	  value:JSON.stringify(params0),
	  mimeType: "application/json"
	  });
  }
  data=WPSGetHeader("np.saveIndexDisplaySettings")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
  $.ajax({
    type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	checkWPSResult(xml);
      }
    });
}

function refreshIndexDisplay(){
  System.removed=0;
  $("#dsContainer1 .hDiv").find("th").each(function(){
      for(var i=0;i<$("#dtable_fnb").val();i++){
	if($("#dtable_var_"+i).val()==$(this).text()){
	  var ii=$("#dtable_varid_"+i).val();
	  ii-=3;
	  var ncol = $("th[axis='col"+ii+"']",$("#dsContainer1 .hDiv"))[0];
	  var n = $('thead th',$("#dsContainer1 .hDiv")).index(ncol);
	  var cb = $('input[value='+ii+']',$("#dsContainer1 .nDiv"))[0];
	  
	  $('th:visible div:eq('+n+')',$("#dsContainer1 .hDiv")).css('width',$("#dtable_width_"+i).val());
	  $('tr',$("#dsContainer1 .bDiv")).each (
				  function ()
				  {
				    $('td:visible div:eq('+n+')',this).css('width',$("#dtable_width_"+i).val());
				  }
				  );

	  if($("#dtable_display_"+i).is(':checked')){
	    ncol.hide = false;
	    $(ncol).show();
	    cb.checked = true;
	  }
	  else{
	    ncol.hide = true;
	    $(ncol).hide();
	    cb.checked = false;
	  }
	  
	  $('tbody tr',$("#dsContainer1 .bDiv")).each
	    (
	     function ()
	     {
	       if ($("#dtable_display_"+i).is(':checked'))
		 $('td:eq('+n+')',this).show();
	       else
		 $('td:eq('+n+')',this).hide();
	     }
	     );							
	    
	  }
	}
      });
}

function loadIndexDisplaySettings(){
  $("#tablesettings-dialog").window("close");
  $("#tablesettings-dialog").remove();
  $("body").append('<div id="tablesettings-dialog" title="Paramétrage de l\'affichage"></div>');
  $('#tablesettings-dialog').html("");

  params=[
	  {"name":"tmpl","value":"Indexes/tableDisplaySettings","dataType":"string"},
	  {"name":"id","value":System.nodeId,"dataType":"string"}
	  ];
  if($("#table_steps").is(":visible") && $("#table_step").val()>0)
      params.push({"name":"step","value":($("#table_step")[0].selectedIndex-1),"dataType":"string"});

    if($("#agregate_step")[0] && $("#agregate_step")[0].selectedIndex-1>=0)
      params.push({
	  "name":"step",
	  "value":$("#agregate_step")[0].selectedIndex-1,
	  "dataType":"string"
      });
	

  if(arguments.length>0)
      params.push({
	  "name":"tid",
	  "value":arguments[0],
	  "dataType":"string"
      });
  fieldss="";
  fields="";
  fields_width="";
  cnt=0;
    $("#"+(arguments.length>0?"agregate_table":'dsContainer1')+" .hDiv").find("th").each(function(){
      if(this.style.display!='none'){
	if($(this).hasClass("sorted"))
	  fieldss+=$(this).text();
	fields+=(cnt>0?",":"")+$(this).text();
	fields_width+=(cnt>0?',':'')+$(this).width();
	cnt+=1;
	
      }
    });

  params.push({"name": "rord","value":fieldss,dataType:"string"});
  params.push({"name": "rcol","value":fields,dataType:"string"});
  params.push({"name": "rwidth","value":fields_width,dataType:"string"});

  data=WPSGetHeader("template.display")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();

    $.ajax({
    type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	if(checkWPSResult(xml,false)){
	  $('#tablesettings-dialog').append(xml.responseText);
	  $("#flex_display2").flexigrid();
	  $( "#tablesettings-dialog" ).window({
	    minimizable:false,
		maximizable:false,
		resizable: false
		});
	}
	}
      });
}

function preview(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.getMapRequest&DataInputs=t_id="+($("#agregation").is(":visible")?$("#p_tname").val():$("#indicateurs_indicateurs_territoires").val())+";preview=true&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		try{
		    $('#preview-territory-dialog').window({
			width: 400,
			height: 300,
			left:150,
			top:150,
			maximizable:false,
			minimizable:false,
			resizable: false
		    });
		    var treg=new RegExp(System.indexMap,"g");
		    var tmpName="project_"+($("#agregation").is(":visible")?"A"+$("#p_tname").val()+"_":"")+"Index"+System.nodeId+($("#agregate_step")[0].selectedIndex-1>=0?"_step"+($("#agregate_step")[0].selectedIndex-1):"")+".map";
		    if($("#mmsteps")[0].selectedIndex-2>=0)
			tmpName="timeline_Index"+System.nodeId+"_indexes_view_idx"+System.nodeId+(/*$("#agregate_steps").is(":visible")?*/"_step"+($("#mmsteps")[0].selectedIndex-2)/*:""*/)+".map";//project_"+($("#agregation").is(":visible")?"A"+$("#p_tname").val()+"_":"")+"Index"+System.nodeId+".map";
		    if($("#agregate_steps").is(":visible") && $("#agregate_steps")[0].selectedIndex>0)
			tmpName="project_"+($("#agregation").is(":visible")?"A"+$("#p_tname").val()+"_":"")+"Index"+System.nodeId+($("#mmsteps")[0].selectedIndex>0?"_step"+($("#agregate_steps")[0].selectedIndex-1):"")+".map";
		    //alert(tmpName);
		    var cSrc=xml.responseText.replace(treg,System.dataPath+"/indexes_maps/"+tmpName);
		    var tmp=cSrc.split("LAYERS=")
		    cSrc=tmp[0]+"LAYERS=indexes."+($("#agregation").is(":visible")?"agregate_t"+$("#p_tname").val()+"_idx_":"view_idx")+System.nodeId+($("#agregate_steps").is(":visible") && $("#agregate_step")[0].selectedIndex>0?"_step"+($("#agregate_step")[0].selectedIndex-1):"");
		    if(!System._cnt)
			System._cnt=0;
		    System._cnt+=1;
		    $("#t_preview")[0].src=cSrc+"&t="+System._cnt;
		}catch(e){
		    alert(e);
		}
	    }
	}
    });
}

function refreshAgregate(){
    var tableName="indicateurs";
    tableName2="agregation";
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table="+tableName+";id="+System.nodeId+";tab="+tableName2+"_"+$("#p_tname").val()+($("#agregate_steps").is(":visible") && $("#agregate_step")[0].selectedIndex>0?";step="+($("#agregate_step")[0].selectedIndex-1):"")+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		if(System.refreshSteps)
		    addSteps("agregate_step");
		System.refreshSteps=true;
		var hasValue=false;
		for(var i in data){
		    $("#"+tableName2+"_"+i).val("");
		    if(data[i]!=null){
			$("#"+tableName2+"_"+i).val(data[i]);
			$("#agregation_chk").prop('checked', true);
			$("#agreg").toggle(true);
			refreshLayerStyle();
			hasValue=true;
		    }
		}
		if(!hasValue){
		    $("#agregation_chk").prop('checked', false);
		    $("#agreg").toggle(false);
		}
	    }
	}
    });
}

function refreshRepport(){
    $("#repport_editor").hide();
    var tableName="indicateurs";
    tableName2="repport";
    var vars="";
    if($("#repport_steps").is(":visible") && $("#repport_step").val()>0){
	vars+=";step="+($("#repport_step")[0].selectedIndex-1);
    }
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table="+tableName+";id="+System.nodeId+";tab="+tableName2+vars+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		var hasValue=false;
		for(var i in data){
		    $("#repport_doc_url").attr('href',data["doc_url"]);
		    $("#repport_doc_url").html(data["doc"]);
		    hasValue=true;
		}
		if(!hasValue){
		    $("#repport_doc_url").attr('href',System.public_map_url+"idx_templates/default_"+$("#graphs_f_type").val()+".odt");
		    $("#repport_doc_url").html("default_"+$("#graphs_f_type").val()+".odt");
		}
		editRepport();
	    }
	}
    });
}

function editRepport(){
    System.prefix=(arguments.length>0?"agregate_":"");
    var vars=(arguments.length>0?";tid="+$("#p_tname").val():"");
    if($("#repport_doc_url").html()!=""){
	var tableName="indicateurs";
	tableName2="repport";
	if($("#repport_steps").is(":visible") && $("#repport_step").val()>0){
	    vars+=";step="+($("#repport_step")[0].selectedIndex-1);
	}
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Indexes/repportSettings;table="+tableName+";id="+System.nodeId+";tab="+tableName2+";template="+$("#repport_doc_url").html()+vars+"&RawDataOutput=Result",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    $(".repport").removeClass('desactivated')
		    $("#"+System.prefix+"repport_editor").html(xml.responseText);
		    if(System.refreshSteps)
			addSteps(System.prefix+"repport_step");
		    System.refreshSteps=true;
		    $("#"+System.prefix+"repport_display2").flexigrid(
			{
			    mmid: 1000,
			    title: 'Paramétrage de rapport', 
			    noSelection: true,
			    height: 220, 
			    rp: 4,
			    usepager: false, 
			    resizable: false
			}
		    );
		    $("#"+System.prefix+"repport_editor").show();
		    try{
			$(".toolbar2").find("a.symbology").each(function(){
			    $(this).removeClass("desactivated");
			});
		    }catch(e){}

		}else
		    $("#repport_editor").hide();
	    }
	});
    }
}

function addSteps(){
    var tid=arguments[0];
    if($("#s_ctype").val()=="timeline"){
	$('#'+tid).html("");
	var $options = $("#mmsteps > option").clone();
	$('#'+tid).append($options);
	$('#'+tid).find('option[value="add"]').each(function(){
	    $(this).remove();
	});
	$("#"+tid+"s").show();
    }else{
	$("#"+tid+"s").hide();
    }
}

function saveRepport(){
    System.prefix=(arguments.length>0?arguments[0]:"");
    var params=[
	{name: "id", value: System.nodeId, dataType: "sring"}
    ];
    if(arguments.length>0)
	params.push({name: "tid", value: $("#p_tname").val(), dataType: "sring"});
    $("#"+System.prefix+"repport_display2").find("input[type=checkbox]").each(function(){
	var tmp=(this.id+"").split('_');
	var params0={name: "tuple", value:'{"id":'+tmp[tmp.length-1]+',"display":"'+$(this).is(":checked")+'","var":"'+$("#"+System.prefix+"rtable_name_"+tmp[tmp.length-1]).val()+'","type":'+$("#"+System.prefix+"rtable_type_"+tmp[tmp.length-1]).val()+',"value":"'+ $("#"+System.prefix+"rtable_value_"+tmp[tmp.length-1]).val()+'"}',mimeType: "application/json"};
	if($('#agregation').is(":visible") && $("#agregate_step")[0].selectedIndex-1>=0){
	    params0["step"]=$("#agregate_step")[0].selectedIndex-1;
	}
	params.push(params0);

    });
    if($("#repport_steps").is(":visible") && $("#repport_step").val()>0){
	params.push({name: "step", value: ($("#repport_step")[0].selectedIndex-1), dataType: "sring"});
    }    
    if($('#agregation').is(":visible") && $("#agregate_step")[0].selectedIndex-1>=0) {
	params.push({name: "step", value: ($("#agregate_step")[0].selectedIndex-1), dataType: "sring"});
    }    
    data=WPSGetHeader("np.saveRepportSettings")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl,
	data: data,
	complete: function(xml,status) {
	    checkWPSResult(xml);
	}
    });
}

function saveRepportFile(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.saveRepportFile&DataInputs=id="+System.nodeId+"&RawDataOutput=Result",
	dataType: 'xml',
	complete: function(xml,status) {
	    if(checkWPSResult(xml))
		refreshRepport();
	}
    });
}

function loadAgregatedIndexGraphSettings(){
    $("#rgraphsettings-dialog").window('close');
    $("#rgraphsettings-dialog").remove();
    $("body").append('<div id="rgraphsettings-dialog" title="Paramétrage du graph / Agrégation"></div>');
    $('#rgraphsettings-dialog').html("");
    $.ajax({
	type: "GET",
	url: "./Indexes/GraphPart;prefix=a",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		$('#rgraphsettings-dialog').append(xml.responseText);
		$("#rgraphsettings-dialog" ).window({
		    minimizable:false,
		    maximizable:false,
		    height: 550,
		    width: 750,
		    resizable: false
		});
		System.onSelectField0=function(){
		    refreshGraphFields("agregate_");
		}
		updateSelectWithFields(['agregate_graphs_vx','agregate_graphs_vy'],$("#p_tname").val());
		//refreshGraphFields("agregate_");
	    }
	}
    });
    
}

function loadAgregatedIndexDisplaySettings(){
    $("#rtablesettings-dialog").window('close');
    $("#rtablesettings-dialog").remove();
    $("body").append('<div id="rtablesettings-dialog" title="Paramétrage de l\'affichage / Agrégation"></div>');
    $('#rtablesettings-dialog').html("");
    $.ajax({
	type: "GET",
	url: "./Indexes/TablePart;prefix=a",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		$('#rtablesettings-dialog').append(xml.responseText);
		loadPageFromFile(System.dbuserName,10,"indexes.agregate_t"+$("#p_tname").val()+"_idx_"+System.nodeId+($("#agregate_steps").is(":visible") && $("#agregate_step")[0].selectedIndex>0?"_step"+($("#agregate_step")[0].selectedIndex-1):""));
		$( "#rtablesettings-dialog" ).window({
		    top: 200,
		    minimizable:false,
		    maximizable:false,
		    width: 650,
		    resizable: false
		});
		//refreshTableFields("agregate_",$("#p_tname").val());
	    }
	}
    });
    
}

function loadAgregatedIndexRepportSettings(){
    $("#rrepportsettings-dialog").window('close');
    $("#rrepportsettings-dialog").remove();
    $("body").append('<div id="rrepportsettings-dialog" title="Paramétrage du repport / Agrégation"></div>');
    $('#rrepportsettings-dialog').html("");
    $.ajax({
	type: "GET",
	url: "./Indexes/DocPart;prefix=a",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		$('#rrepportsettings-dialog').append(xml.responseText);
		editRepport("agregate_");
		$("#rrepportsettings-dialog" ).window({
		    minimizable:false,
		    maximizable:false,
		    height: 350,
		    width: 750,
		    resizable: false
		});
	    }
	}
    });
}

function previewRepport(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.previewDoc&DataInputs=oDoc="+$("#repport_doc_url").text()+($("#repport_step").val()!="-1" && ($("#repport_step")[0].selectedIndex-1)>=0?";step="+($("#repport_step")[0].selectedIndex-1):"")+";id="+System.nodeId+(arguments.length==1?";tid="+$("#p_tname").val():"")+($("#agregate_step")[0] && $("#agregate_step")[0].selectedIndex-1>=0?";step="+($("#agregate_step")[0].selectedIndex-1):"")+";preview=true&ResponseDocument=Result@asReference=true",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false,true)){
		try{
		    var lUrl="";
		    $(xml.responseXML).find("Reference").each(function(){
			lUrl=$(this).attr("href");
		    });
		    $(xml.responseXML).find("wps\\:Reference").each(function(){
			lUrl=$(this).attr("href");
		    });
		    $("#prd_link").attr("href",lUrl);
		    var reg=new RegExp(System.tmpUrl,"g");
		    $.ajax({
			type: "GET",
			url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=print.preview&DataInputs=file="+lUrl.replace(reg,System.tmpPath)+";res=75&ResponseDocument=Result@asReference=true",
			complete: function(xml,status) {
			    if(checkWPSResult(xml,false)){
				var lUrl="";
				$(xml.responseXML).find("Reference").each(function(){
				    lUrl=$(this).attr("href");
				});
				$(xml.responseXML).find("wps\\:Reference").each(function(){
				    lUrl=$(this).attr("href");
				});
				$("#r_preview").attr("src",lUrl);
				$('#preview-repport-dialog').window({
				    width: 450,
				    height: 620,
				    maximizable:false,
				    minimizable:false,
				    resizable: false
				});
			    }
			}
		    });
		}catch(e){}
	    }
	}
    });
}
