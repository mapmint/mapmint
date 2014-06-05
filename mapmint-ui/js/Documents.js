var counter=0;
Documents=MLayout.extend();

Documents.define({
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
    
    $("#add-documents").click(function(){
	$("#eName").val("");
	$('#add-documents-dialog').window({
	    width: 300,
	    height: 150,
	    left:150,
            top:150,
	    maximizable:false,
	    minimizable:false,
	    resizable: false
	})
    });

    $("#delete-documents").click(function(){
	if(System.nodeVal){
	    $("#edName").val(System.nodeVal);
	    $('#delete-documents-dialog').window({
		width: 300,
		height: 150,
		left:150,
		top:150,
		maximizable:false,
		minimizable:false,
		resizable: false
	    });
	}
    });

    searchTable("documents");

    refreshList();
});

/**
 * Common part
 */
function updateElement(){
    $("#documents_description").val( CKEDITOR.instances.documents_description.getData().replace(/\"/g,"\\\"") );
    var params={id: System.nodeId};
    $("#documents_edition_ui").find("input").each(function(){
	if($(this)[0].id && $(this)[0].id.replace(/documents_/,"")!=$(this)[0].id)
	    params[$(this)[0].id.replace(/documents_/,"")]=$(this).val();
    });
    $("#documents_edition_ui").find("textarea").each(function(){
	if($(this)[0].id && $(this)[0].id.replace(/documents_/,"")!=$(this)[0].id)
	    params[$(this)[0].id.replace(/documents_/,"")]=$(this).val();
    });
    $("#documents_edition_ui").find("select").each(function(){
	if($(this)[0].multiple){
	    localId=$(this)[0].id.replace(/documents_/,"");
	    params[localId]=[];
	    $(this).find("option:selected").each(function(){
		params[localId].push($(this).val());
	    });
	}
	else{
	    params[$(this)[0].id.replace(/documents_/,"")]=$(this).val();
	}
    });

    

    params=[
	{name: "table", value: "documents",dataType: "string"},
	{name: "documents_groups_in", value: "d_id",dataType: "string"},
	{name: "documents_groups_out", value: "g_id",dataType: "string"},
	{name: "documents_themes_in", value: "d_id",dataType: "string"},
	{name: "documents_themes_out", value: "t_id",dataType: "string"},
	{name: "tuple", value: $.stringify(params), mimeType: "application/json"}
    ];
    data=WPSGetHeader("np.updateElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();

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

function refreshDetails(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table=documents;id="+System.nodeId+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		if(!data["file"] || data["file"]==""){
		    $('input:radio[name=doct]')[1].checked = true;
		    $('#file').hide();
		    $('#documents_file_link').hide();
		    $('#documents_url').show();
		}
		else{
		    $('input:radio[name=doct]')[0].checked = true;
		    $('#documents_url').hide();
		    $('#documents_file_link').html(data['file']);
		    $('#documents_file_link').attr("href",System.public_map_url+"/documents/"+data['file']);
		    $('#documents_file_link').show();
		    $('#file').show();
		}
		for(var i in data){
		    if(!$.isArray(data[i])){
			if(i=="name")
			    $("#documents_"+i+"_title").html(data[i]);
			$("#documents_"+i).val("");
			if(data[i]!=null)
			    $("#documents_"+i).val(data[i]);
			else
			    $("#documents_"+i).val(-1);
		    }else{
			$("#documents_"+i+" option:selected").removeAttr("selected");
			if(data[i].length)
			    for(var j=0;j<data[i].length;j++)
				$("#documents_"+i+' option[value="'+data[i][j]+'"]').prop("selected", "selected");
			else
			    $('#documents_'+i+' option[value="-1"]').prop("selected", "selected");
		    }
		}
		createEditor("documents_description");
	    }
	}
    });
}


function refreshList(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.list&DataInputs=table=documents&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
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
	{name: "table", value: "documents",dataType: "string"},
	{name: "atable", value: "documents_themes",dataType: "sting"},
	{name: "akey", value: "d_id",dataType: "string"},
	{name: "atable", value: "documents_groups",dataType: "sting"},
	{name: "akey", value: "d_id",dataType: "string"},
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
		$('#delete-documents-dialog').window('close');
	    }
	}
    });
}

function insertElement(){
    params=[
	{name: "table", value: "documents",dataType: "string"},
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
		$('#add-documents-dialog').window('close');
	    }
	}
    });
}
