Territories=MLayout.extend();

Territories.define({
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
        spacing_open:         10,
        south__closable: false,
        south__closable:false,
        south__resizable:false,
        south__minSize:40,
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

    $(".add-territory").click(function(){
	$("#eName").val("");
        $('#add-territory-dialog').window({
            width: 300,
            height: 150,
            left:150,
	    top:150,
            maximizable:false,
	    minimizable:false,
            resizable: false
        })
    });

    $(".view-territory").click(function(){
	if($("#territoires_dataSource").val()!="-1")
	    preview();
	else
	    alert("Merci de sélectionner un territoire ayant une données déjà associée");
    });

    $(".delete-territory").click(function(){
	if(System.nodeVal){
	    $("#edName").val(System.nodeVal);
            $('#delete-territory-dialog').window({
		width: 300,
		height: 150,
		left:150,
		top:150,
		maximizable:false,
		minimizable:false,
		resizable: false
            })
	}
    });

    searchTable("territoires");
    refreshList();
    
});


function preview(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=np&service=WPS&version=1.0.0&request=Execute&Identifier=getMapRequest&DataInputs=t_id="+System.nodeId+";preview=true&RawDataOutput=Result",
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
		    $("#t_preview")[0].src=xml.responseText;
		}catch(e){
		    alert(e);
		}
	    }
	}
    });
}

/**
 * Common part
 */
function updateElement(){
    var params={id: System.nodeId};
    $("#territoires_edition_ui").find("input").each(function(){
	params[$(this)[0].id.replace(/territoires_/,"")]=$(this).val();
    });
    $("#territoires_edition_ui").find("select").each(function(){
	if($(this)[0].multiple){
	    localId=$(this)[0].id.replace(/territoires_/,"");
	    params[localId]=[];
	    $(this).find("option:selected").each(function(){
		params[localId].push($(this).val());
	    });
	}
	else{
	    params[$(this)[0].id.replace(/territoires_/,"")]=$(this).val();
	}
    });
    params=[
	{name: "table", value: "territoires",dataType: "string"},
	{name: "territoires_groups_in", value: "t_id",dataType: "string"},
	{name: "territoires_groups_out", value: "g_id",dataType: "string"},
	{name: "t_hierarchy_in", value: "o_t_id",dataType: "string"},
	{name: "t_hierarchy_out", value: "p_t_id",dataType: "string"},
	{name: "tuple", value: $.stringify(params), mimeType: "application/json"}
    ];
    data=WPSGetHeader("updateElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl+"?metapath=np",
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
  
    $("#territoires_t_hierarchy option:disabled").removeAttr("disabled");
    $("#territoires_t_hierarchy option:selected").removeAttr("selected");
    $("#territoires_t_hierarchy option[value="+System.nodeId+"]").attr("disabled","disabled");

    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=np&service=WPS&version=1.0.0&request=Execute&Identifier=details&DataInputs=table=territoires;id="+System.nodeId+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		for(var i in data){
		    if(!$.isArray(data[i])){
			if(i=="name")
			    $("#territoires_"+i+"_title").html(data[i]);
			$("#territoires_"+i).val("");
			if(data[i]!=null)
			    $("#territoires_"+i).val(data[i]);
			else
			    $("#territoires_"+i).val(-1);
		    }else{
			$("#territoires_"+i+" option:selected").removeAttr("selected");
			if(data[i].length)
			    for(var j=0;j<data[i].length;j++)
				$("#territoires_"+i+' option[value="'+data[i][j]+'"]').attr("selected", "selected");
			else
			    $('#territoires_'+i+' option[value="-1"]').attr("selected", "selected");
		    }
		}
	    }
	}
    });
}

function getCurrentElements(obj){
  var res=Array();
  for(var i=0;i<obj.length;i++){
    res.push({"id":obj[i]["id"],"text":obj[i]["text"]});
    if(obj[i].children && obj[i].children.length>0){
      var tmp=getCurrentElements(obj[i].children);
      for(k=0;k<tmp.length;k++)
	res.push({"id":tmp[k]["id"],"text":tmp[k]["text"]});
    }
  }
  return res;
}

function saveOrder(){
    nodes=$('#ttlo').tree('getRoots');
    var params=new Array({name: "table", value: "territoires",dataType: "string"});
    for(i=0;i<nodes.length;i++){
	params.push({name: "node", value: nodes[i].id, dataType: "string"});
    }
    data=WPSGetHeader("orderElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl+"?metapath=np",
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshList();
		$('#view-order').window('close');
	    }
	}
    });
}

function setOrder(){
    if(!$("#view-order")[0]){
	$( "body" ).append('<div id="view-order" title="'+System.messages["Order"]+'"></div>');
    }
    $("#view-order").html("").append('<ul id="ttlo"></ul><div><input type="button" name="" id="" value="'+System.messages["Save"]+'" onclick="saveOrder()" /></div>');
    $.ajax({
	type: "GET",
	url: "./Territories_order;id="+System.mmNodeId,
	complete: function(xml,status) {
	    var data=$.parseJSON(xml.responseText);;
	    $('#ttlo').tree({
		data: data,
		dnd: true
	    });
	    $( "#view-order" ).window({
		collapsible:false,
		minimizable:false,
		maximizable:false,
		resizable: false
	    });
	    
	}
    });
}

function refreshList(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=np&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=table=territoires&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		$('#ltree').tree({ 
		    data: data,  
		    onSelect: function(node){
			System.nodeId=node.id;
			System.nodeVal=node.text;
			refreshDetails();
		    },
		    onContextMenu: function(e, node){
			e.preventDefault();
			$('#ltree').tree('select', node.target);
			var lnode=$('#ltree').tree('getParent',node.target);
			if(lnode)
			    System.mmNodeId=lnode.id;
			else
			    System.mmNodeId=null;
			$('#mm').emenu('show', {
			    left: e.pageX,
			    top: e.pageY
			});
		    }
		});
		var tmp=getCurrentElements(data);
		vals={};
		orig=Array();
		ord=Array();
		for(i=0;i<tmp.length;i++){
		  vals[""+tmp[i]["id"]]=tmp[i]["text"];
		  orig[i]=tmp[i]["id"];
		  ord[i]=tmp[i]["id"];
		}
		ord.sort(function(a,b){return a-b});
		$("#territoires_t_hierarchy option[value!='-1']").remove();
		for(i=0;i<ord.length;i++){
		  if(i==0)
		    $("#territoires_t_hierarchy").append('<option value="'+ord[i]+'">'+vals[ord[i]]+'</option>');
		  else
		    if(ord[i]!=ord[i-1])
		      $("#territoires_t_hierarchy").append('<option value="'+ord[i]+'">'+vals[ord[i]]+'</option>');
		}
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
	{name: "atable", value: "t_hierarchy",dataType: "sting"},
	{name: "akey", value: "o_t_id",dataType: "string"},
	{name: "atable", value: "territoires_groups",dataType: "sting"},
	{name: "akey", value: "t_id",dataType: "string"},
	{name: "id", value: System.nodeId,dataType: "string"}
    ];
    data=WPSGetHeader("deleteElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl+"?metapath=np",
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshList();
		$('#delete-territory-dialog').window('close');
	    }
	}
    });
}

function insertElement(){
    params=[
	{name: "table", value: "territoires",dataType: "string"},
	{name: "name", value: $("#eName").val(),dataType: "string"}
    ];
    data=WPSGetHeader("insertElement")+WPSGetInputs(params)+WPSGetOutput({"name": "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: "text/xml",
	url: System.zooUrl+"?metapath=np",
	data: data,
	complete: function(xml,status) {
	    if(checkWPSResult(xml)){
		refreshList();
		$('#add-territory-dialog').window('close');
	    }
	}
    });
}

function loadForm(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=np&service=WPS&version=1.0.0&request=Execute&Identifier=details&DataInputs=table=territoires;name='+arguments[0]+'&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
	    }
	}
    });    
}
