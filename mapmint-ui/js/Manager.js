 
function updateSize(){
  var li=0;
  for(var l in layouts){
    if(layouts[l].updateSize){ 
      try{
	layouts[l].updateSize();
      }catch(e){alert(e);}
    }
    li++;
  }
}


function reload(){
  var node = $('#tt2').tree('getSelected');
  if (node){
    $('#tt2').tree('reload', node.target);
  } else {
    $('#tt2').tree('reload');
  }
}

function getChildren(){
  var node = $('#tt2').tree('getSelected');
  if (node){
    var children = $('#tt2').tree('getChildren', node.target);
  } else {
    var children = $('#tt2').tree('getChildren');
  }
  var s = '';
  for(var i=0; i<children.length; i++){
    s += children[i].text + ',';
  }
  alert(s);
}
function getChecked(){
  var nodes = $('#tt2').tree('getChecked');
  var s = '';
  for(var i=0; i<nodes.length; i++){
    if (s != '') s += ',';
    s += nodes[i].text;
  }
  alert(s);
}
function getSelected(){
  var node = $('#tt2').tree('getSelected');
  alert(node.text);
}
function collapse(){
  var node = $('#tt2').tree('getSelected');
  $('#tt2').tree('collapse',node.target);
}
function expand(){
  var node = $('#tt2').tree('getSelected');
  $('#tt2').tree('expand',node.target);
}
function collapseAll(){
  var node = $('#tt2').tree('getSelected');
  if (node){
    $('#tt2').tree('collapseAll', node.target);
  } else {
    $('#tt2').tree('collapseAll');
  }
}
function expandAll(){
  var node = $('#tt2').tree('getSelected');
  if (node){
    $('#tt2').tree('expandAll', node.target);
  } else {
    $('#tt2').tree('expandAll');
  }
}
function append(){
  var node = $('#tt2').tree('getSelected');
  $('#tt2').tree('append',{
    parent: (node?node.target:null),
	data:[{
	text:'new1',
	    checked:true
	    }]
	});
}
function remove(){
  var node = $('#tt2').tree('getSelected');
  $('#tt2').tree('remove', node.target);
}
function update(){
  var node = $('#tt2').tree('getSelected');
  if (node){
    node.text = '<span style="font-weight:bold">new text</span>';
    node.iconCls = 'icon-save';
    $('#tt2').tree('update', node);
  }
}
function isLeaf(){
  var node = $('#tt2').tree('getSelected');
  var b = $('#tt2').tree('isLeaf', node.target);
  alert(b);
}

MapMintDsRefresh=function(){
  $.getJSON(
	    System.zooUrl+"?metapath=mapfile&request=Execute&service=WPS&version=1.0.0&Identifier=redrawDsList&DataInputs=name="+arguments[0]+"&RawDataOutput=Result",
  {id: arguments[0], ajax: 'true'}, 
	    function(j){
	      var options = '';
	      for (var i = 0; i < j.length; i++) {
		options += '<option value="' + j[i].value + '">' + j[i].name + '</option>';
	      }
	      $("select#select-datasource").html(options);
	    }
	    )
}

function addLayer(){
    var dsoNames="";
    var j=0;
    $("#select-datasource").each(function(){
	for(i=0;i<this.options.length;i++){
	    if(this.options[i].selected){
		if(j>=1)
		    dsoNames+=";";
		dsoNames+="dsoName="+this.options[i].value;
		j+=1;
	    }
	}
    });
  $.ajax({
    type: "GET",
	url: System.zooUrl+"?metapath=mapfile&service=WPS&version=1.0.0&request=Execute&Identifier=loadMapForDs&DataInputs=map="+$('#mapName')[0].value+";dstName="+$("#select-datastore")[0].value+";"+dsoNames+";dsgName="+$("#select-group")[0].value+"",
    dataType: "xml",
    complete: function(xml,status) {
	var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
	if(tmp!="")
	  $.notifyBar({ cssClass: "error", html: tmp });
	else{  
	  $( "#add-layer-dialog" ).window('close');
	  startMapList();
	}
      }
    });
}

function refreshMapLayers(){
  $.ajax({
    type: "GET",
    url: System.zooUrl+"?metapath=mapfile&service=WPS&version=1.0.0&request=Execute&Identifier=getLayersList&DataInputs=name="+$("#mapName")[0].value+"&RawDataOutput=Result",
    dataType: "json",
    complete: function(xml,status) {
	var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
	if(tmp!="")
	  $.notifyBar({ cssClass: "error", html: tmp });
	else  
	  $( "#add-layer-dialog" ).window('close');
      }
    });
}

function refreshTablesList(){
    var localTarget=arguments[1];
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=listTablesAndViews&DataInputs=dataStore="+$('#complex_ds').val()+";schema="+$('#'+arguments[0]).val()+"&RawDataOutput=Result",
	tid: arguments[0],
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var tmp=eval(xml.responseText);
		$("#"+localTarget).html('<option value="-1">'+System.messages["Choose"]+'</option>');
		for(i=0;i<tmp.length;i++)
		    $("#"+localTarget).append('<option value="'+tmp[i][0]+'">'+tmp[i][1]+'</option>');
	    }
	}
    });	
}

function refreshFieldsList(){
    var localTarget=[];
    for(i=1;i<arguments.length;i++)
	localTarget.push(arguments[i]);
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=getTableDescription&DataInputs=dataStore="+$('#complex_ds').val()+";table="+$('#'+arguments[0]).val()+"&RawDataOutput=Result",
	tid: arguments[0],
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		var tmp=eval(xml.responseText);
		for(t=0;t<localTarget.length;t++){
		    $("#"+localTarget[t]).html('<option value="-1">'+System.messages["Choose"]+'</option>');
		    for(i=0;i<tmp.length;i++)
			$("#"+localTarget[t]).append('<option value="'+tmp[i][1]+'">'+tmp[i][1]+'</option>');
		}
	    }
	}
    });	
}

function runComplexParam(){
    $.ajax({
	type: "GET",
	url: "./Manager/ComplexSearch;layer="+System.mmNodeId+"&RawDataOutput=Result",
	tid: arguments[0],
	complete: function(xml,status) {
	    if(!$('#complex-params')[0])
		$("body").append('<div id="complex-params" title="'+System.messages['Complex Search Engine Parameters']+'"></div>');
	    $('#complex-params').html("");
	    $('#complex-params').append(xml.responseText);
	    $("#FieldsSorted2").flexigrid({id:"cs"});
	    $("#FieldsSorted2 tbody").sortable();
	    $('#complex-params').window({
		width: 1125,
		height: 620,
		maximizable:false,
		resizable: false,
		onClose: function(){
		    
		}
	    });
	    $(".hasInfo").tipsy({fade: true, offset:3, opacity: 1, gravity: 'se'});
	}
    });
}

function saveComplexParam(){
    var dataInputs=[{name: "map",value: $("#mapName")[0].value,dataType: "string"},{name: "layer",value: System.mmNodeId,dataType: "string"}];
    var sorted=0;
    var args={};
    var fields=[
	["colonne_class","sfield"],
	["alias_class","afield"],
	["ids_class","ifield"],
	["sessions_class","s1field"],
	["values_class","vfield"],
	["deps_class","vfield"],
	["orders_class","ofield",true],
	["multiples_class","mfield",true]
    ];
    $("#FieldsSorted2").find("tr").each(function(){
	for(i=0;i<fields.length;i++){
	    if(!args[fields[i][0]])
		args[fields[i][0]]=[];
	    $(this).find("input."+fields[i][0]).each(function(){
		if(fields[i].length>2)
		    args[fields[i][0]].push($(this).is(":checked"));
		else
		    args[fields[i][0]].push($(this).val());
	    });
	}
    });
    for(i=0;i<fields.length;i++){    
	dataInputs.push({name: fields[i][0],value: JSON.stringify(args[fields[i][0]]),mimeType: "application/json"});
    }
    if($("#tbl_abo").is(":checked")){
	dataInputs.push({name: "subscription",value: JSON.stringify({"tbl":$("#tbl_abo_table").val(),"id": $("#tbl_abo_champ_id").val(),"sessid": $("#tbl_abo_session_id").val()}),mimeType: "application/json"});
    }
    var tmp={"tbl_legend": $("#legend_table").val(),"ofield":$("#orig_column").val(),"tfield":$("#target_column").val(),"color":$("#target_color").val(),"min":$("#target_min").val(),"max":$("#target_max").val()};
    dataInputs.push({name: "legend",value: JSON.stringify(tmp),mimeType: "application/json"});
    var data=WPSGetHeader("saveComplexSearch")+WPSGetInputs(dataInputs)+WPSGetOutput({name: "Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	contentType: 'text/xml',
	url: System.zooUrl+"?metapath=mapfile",
	data: data,
	complete: function(xml,status) {
	    checkWPSResult(xml);
	}
    });		  

}