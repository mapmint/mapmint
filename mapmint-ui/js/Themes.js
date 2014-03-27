Themes=MLayout.extend();

Themes.define({
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
    
    $(".add-theme").click(function(){
	$("#eName").val("");
	$('#add-themes-dialog').window({
	    width: 300,
	    height: 150,
	    left:150,
            top:150,
	    maximizable:false,
	    minimizable:false,
	    resizable: false
	})
    });

    $(".delete-theme").click(function(){
	if(System.nodeVal){
	    $("#edName").val(System.nodeVal);
	    $('#delete-themes-dialog').window({
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

    startColorPicker();

    refreshList();
});

function startColorPicker(){

    $("#customWidget > div").html('<div id="colorSelector2"><div style="background-color:#'+(arguments.length>0?arguments[0]:'9ACB6B')+'"></div></div><div id="colorpickerHolder2"></div>');

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
	    $("#themes_color").val(hex);
        }
    });

    $('#colorpickerHolder2>div').css('position', 'absolute');
    var widt = false;
    $('#colorSelector2').bind('click', function() {
        $('#colorpickerHolder2').stop().animate({height: widt ? 0 : 173}, 500);
        widt = !widt;
    });

}

/**
 * Common part
 */
function updateElement(){
    var params={id: System.nodeId};
    $("#themes_edition_ui").find("input").each(function(){
	if($(this)[0].id)
	    params[$(this)[0].id.replace(/themes_/,"")]=$(this).val();
    });
    $("#themes_edition_ui").find("select").each(function(){
	if($(this)[0].multiple){
	    localId=$(this)[0].id.replace(/themes_/,"");
	    params[localId]=[];
	    $(this).find("option:selected").each(function(){
		params[localId].push($(this).val());
	    });
	}
	else{
	    params[$(this)[0].id.replace(/themes_/,"")]=$(this).val();
	}
    });

    params=[
	{name: "table", value: "themes",dataType: "string"},
	{name: "themes_groups_in", value: "t_id",dataType: "string"},
	{name: "themes_groups_out", value: "g_id",dataType: "string"},
	{name: "indicateurs_themes_in", value: "t_id",dataType: "string"},
	{name: "indicateurs_themes_out", value: "i_id",dataType: "string"},
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

    $("#themes_pid option:disabled").removeAttr("disabled");
    $("#themes_pid option:selected").removeAttr("selected");
    $("#themes_pid option[value="+System.nodeId+"]").attr("disabled","disabled");

    $("#themes_themes_groups option:selected").removeAttr("selected");

    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=np&service=WPS&version=1.0.0&request=Execute&Identifier=details&DataInputs=table=themes;id="+System.nodeId+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var data=$.parseJSON(xml.responseText);
		for(var i in data){
		    if(!$.isArray(data[i])){
			if(i=="name")
			    $("#themes_"+i+"_title").html(data[i]);
			$("#themes_"+i).val("");
			if(data[i]!=null)
			    $("#themes_"+i).val(data[i]);
			else
			    $("#themes_"+i).val(-1);
		    }else{
			//$("#themes_"+i+" option:selected").removeAttr("selected");
			if(data[i].length){
			    for(var j=0;j<data[i].length;j++){
				$("#themes_"+i+' option[value="'+data[i][j]+'"]').prop("selected", "selected");
			    }
			}
			else
			    $('#themes_'+i+' option[value="-1"]').prop("selected", "selected");
			$('select[multiple]').blur().focus();
		    }
		}
		startColorPicker(data["color"]);
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

function refreshList(){
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=np&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=table=themes&RawDataOutput=Result",
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
		$("#themes_pid option[value!='-1']").remove();
		for(i=0;i<ord.length;i++){
		  if(i==0)
		    $("#themes_pid").append('<option value="'+ord[i]+'">'+vals[ord[i]]+'</option>');
		  else
		    if(ord[i]!=ord[i-1])
		      $("#themes_pid").append('<option value="'+ord[i]+'">'+vals[ord[i]]+'</option>');
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
	{name: "table", value: "themes",dataType: "string"},
	{name: "atable", value: "indicateurs_themes",dataType: "sting"},
	{name: "akey", value: "t_id",dataType: "string"},
	{name: "atable", value: "themes_groups",dataType: "sting"},
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
		$('#delete-themes-dialog').window('close');
	    }
	}
    });
}

function insertElement(){
    params=[
	{name: "table", value: "themes",dataType: "string"},
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
		$('#add-themes-dialog').window('close');
	    }
	}
    });
}
