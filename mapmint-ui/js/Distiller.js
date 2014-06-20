System.flexi_cnt=0;

function loadFormWithObject(form,fields,object){
  var dbParams=fields;
  if(!object){
    for(var t=0;t<dbParams.length;t++){
      if($mj(form+"."+dbParams[t])){
	if(t!="stype")
	  $mj(form+"."+dbParams[t]).value="";
	else
	  try{$mj(form+"."+dbParams[t]).selectedIndex=0;}catch(e){}
      }
    }
  }else{
    var tmp=object;
    for(var t in tmp){
      if($mj(form+"."+t)){
	$mj(form+"."+t).value=tmp[t];
      }
    }
  }
}

MapMintDSManager=Class.create({
    runConvertion: function(){
	var params=[];
	if($("#chk1")[0].checked)
	    params[params.length]={"name":"s_srs","dataType":"string","value":"+init="+$("#s_srs").val()};
	if($("#tdso_chk_srs")[0].checked)
	    params[params.length]={"name":"t_srs","dataType":"string","value":"+init="+$("#tdso_srs").val()};
	params[params.length]={"name":"dst_in","dataType":"string","value":$("#dst_in").val()};
	params[params.length]={"name":"dso_in","dataType":"string","value":$("#dso_in").val()};
	params[params.length]={"name":"dso_f","dataType":"string","value":$("#tdso_format").val()};
	params[params.length]={"name":"dst_out","dataType":"string","value":$("#tdso").val()};
	params[params.length]={"name":"dso_out","dataType":"string","value":$("#out_name").val()};
	//alert($("#sql_chk")[0].checked);
	if($("#sql_chk")[0].checked)
	    params[params.length]={"name":"sql","dataType":"string","value":$("#sql").val()};
	if($("#ov1")[0].checked)
	    params[params.length]={"name":"overwrite","dataType":"string","value":"true"};
	else
	    params[params.length]={"name":"append","dataType":"string","value":"true"};
	var request=WPSGetHeader("vector-converter.convert")+WPSGetInputs(params)+WPSGetOutput({"name":"Result"})+WPSGetFooter();

	$.ajax({
	    type: "POST",
	    url: System.zooUrl,
	    data: request,
	    contentType: "text/xml",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    $( "#Ogr2OgrGUI-dialog" ).window("close");
		}
	    }
	});

    },
    remove: function(){
      	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.delete&DataInputs=name="+$mj("Distiller.datasource.name").value+";type="+$mj("Distiller.datasource.stype").value,
	    dataType: "text",
	    complete: function(xml,status) {
		var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
		if(tmp!="")
		    $.notifyBar({ cssClass: "error", html: tmp });
		else
		    $.notifyBar({ cssClass: "success", html: $(xml.responseXML).find("wps\\:LiteralData").text() });
		$( "#delete-database-dialog" ).window('close');
		MapMintDBManager.refresh($mj("Distiller.datasource.stype").value);
	    }
	});
    },
    startSetGeometryType: function(){
	$.ajax({
	    url: "./Distiller/SetGeometryType;geoType="+arguments[2]+";dst="+arguments[0]+";dso="+arguments[1],
	    complete: function(xml,status){
		if(!$('#sgt-dialog')[0])
		    $("body").append('<div id="sgt-dialog" title="Layer Geometry Type"></div>');
		$('#sgt-dialog').html("");
		$('#sgt-dialog').append(xml.responseText);
		$('#sgt-dialog').window({
		    width: 100,
		    height: 100,
		    maximizable:false,
		    resizable: false
		});
		
	    }
	});
    },
    setGeometryType: function(){
	$.ajax({
	    url: System.zooUrl+"?request=Execute&service=wps&version=1.0.0&Identifier=mapfile.setGeometryType&DataInputs=dst="+$(dst).val()+";dso="+$(dso).val()+";geoType="+$(geoType).val()+"&RawDataOutput=Result",
	    complete: function(xml,status){
		if(checkWPSResult(xml))
		    $('#sgt-dialog').window('close');
	    }
	});
    }
});

Ogr2OgrGUI=Class.create({
    initializeWindow: function(){
	$.ajax({
	    url: "./Distiller/VectorConverter;dst="+arguments[0]+";dso="+arguments[1],
	    complete: function(xml,status){
		if(!$('#Ogr2OgrGUI-dialog')[0])
		    $("body").append('<div id="Ogr2OgrGUI-dialog" title="'+System.messages["Vector Converter"]+'"></div>');
		$('#Ogr2OgrGUI-dialog').html("");
		$('#Ogr2OgrGUI-dialog').append(xml.responseText);
		$('#Ogr2OgrGUI-dialog').window({
		    width: 550,
		    height: 350,
		    maximizable:false,
		    resizable: false
		});

	    }
	});
    }
});

function exportAsZip(){
    $.ajax({
	url: System.zooUrl+"?request=Execute&service=WPS&version=1.0.0&Identifier=vector-converter.doZip&DataInputs=dst="+arguments[0]+";dso="+arguments[1]+";dstn="+arguments[1]+"_dl.zip&RawDataOutput=Result",
	complete: function(xml,status){
	    if(checkWPSResult(xml,false)){
		document.location=xml.responseText;
	    }
	}
    });
}

MapMintDBManager=Class.create({
    accessDST: function(){
	$.ajax({
	    type: "GET",
	    url: "./Distiller/PgWindow;dataStore="+$('#browser_selected_dsName').val(),
	    complete: function(xml,status) {
		if(!$('#databaseAccess-dialog')[0])
		    $('body').append('<div id="databaseAccess-dialog" title="'+System.messages["Database Access"]+'"></div>');
		$( "#databaseAccess-dialog" ).html("").append(xml.responseText);
		$( "#databaseAccess-dialog" ).window({
		    height: 500,
		    width: 720,
		    minimizable:false,
		    maximizable:false,
		    resizable: false
		});
	    }
	});

    },

    validTupleEditing: function(){
	var params="{";
	var clause="";
	$("#pg_editor").find('input').each(function(){
	    if(this.id){
		if(this.id=="clause")
		    clause=this.id.replace(/pg_tuple_/g,"")+"="+(this.value==""?"NULL":this.value);
		else{
		    params+=(params!="{"?",":"")+'"'+this.id.replace(/pg_tuple_/g,"")+'":"'+(this.value==""?"NULL":(this.type=="checkbox"?(this.checked?'t':'f'):$(this).val()))+'"';
		}
	    }
	});
	var content=null;
	$("#pg_editor").find('textarea').each(function(){
	    if(this.id!="pg_tuple_content")
		params+=(params!="{"?",":"")+'"'+this.id.replace(/pg_tuple_/g,"")+'":"'+$(this).val().replace(/\r\n|\r|\n/g,"\\\\n")+'"'
	    else
		content="<div>"+CKEDITOR.instances.pg_tuple_content.getData()+"</div>";
	});
	$("#pg_editor").find('select').each(function(){
	    params+=(params!="{"?",":"")+'"'+this.id.replace(/pg_tuple_/g,"")+'":"'+$(this).val()+'"'
	});
	params+="}"
	var request=WPSGetHeader("datastores.postgis.editTuple");
	var dataInputs=[];
	dataInputs[dataInputs.length]={"name": "dataStore","value": $('#browser_selected_dsName').val(),"dataType": "string"};
	dataInputs[dataInputs.length]={"name": "table","value": $('#pg_table').val(),"dataType": "string"};
	if($('#clause').val() && $('#clause').val()!="true")
	    dataInputs[dataInputs.length]={"name": "clause","value": $('#clause').val(),"dataType": "string"};
	dataInputs[dataInputs.length]={"name": "obj","value": params,"dataType": "string"};
	if(content!=null)
	    dataInputs[dataInputs.length]={"name": "content","value": content,"mimeType": "text/xml"};
	request+=WPSGetInputs(dataInputs)+WPSGetOutput({"name":"Result"})+WPSGetFooter();
	$.ajax({
	    type: "POST",
	    url: System.zooUrl,
	    data: request,
	    contentType: "text/xml",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    $( "#databaseEditor-dialog" ).window("close");
		    MapMintDBManager.loadTable();
		}
	    }
	});
    },

    refreshTablesList: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.listTables&DataInputs=dataStore="+$('#browser_selected_dsName').val()+";schema="+$('#pg_schema').val()+"&RawDataOutput=Result",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    var tmp=eval(xml.responseText);
		    $("#pg_table").html('<option value="-1">'+System.messages["Choose"]+'</option>');
		    for(i=0;i<tmp.length;i++)
			$("#pg_table").append('<option value="'+tmp[i][0]+'">'+tmp[i][1]+'</option>');
		}
	    }
	});	
    },

    editTuple: function(){
	var cnt=0;
	System.tupleID="";
	$('#pg_table_display tr').each(function(){
	    if($(this).hasClass('trSelected')){
		System.tupleID=this.id.replace(/row/g,"");
	    }
	    cnt+=1;
	});
	$.ajax({
	    type: "GET",
	    url: "./Distiller/PgEditorWindow;dataStore="+$('#browser_selected_dsName').val()+";table="+$('#pg_table').val()+(System.tupleID!=""?";clause="+System.pkey+"="+System.tupleID:""),
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    if(!$('#databaseEditor-dialog')[0])
			$('body').append('<div id="databaseEditor-dialog" title="'+System.messages["Database Editor"]+'"></div>');
		    $( "#databaseEditor-dialog" ).html("").append(xml.responseText);
		    $( "#databaseEditor-dialog" ).window({
			width: 600,
			height: 420,
			minimizable:false,
			maximizable:false,
			resizable: false
		    });
		    if (CKEDITOR.instances.pg_tuple_content) { CKEDITOR.instances.pg_tuple_content.destroy(true); }
		    CKEDITOR.replace('pg_tuple_content',{
			skin : 'v2',
			entities: false,
			basicEntities: false,
			toolbar:[
			    { name: 'document', items : [ 'Source','NewPage','Preview' ] },
			    { name: 'clipboard', items : [ 'Cut','Copy','Paste','PasteText','PasteFromWord','-','Undo','Redo' ] },
			    { name: 'editing', items : [ 'Find','Replace','-','SelectAll','-','Scayt' ] },
			    '/',
			    { name: 'insert', items : [ 'Image','Flash','Table','HorizontalRule','Smiley','SpecialChar','PageBreak','Iframe' ] },
			    { name: 'styles', items : [ 'Styles','Format' ] },
			    '/',
			    { name: 'basicstyles', items : [ 'Bold','Italic','Strike','-','RemoveFormat' ] },
			    { name: 'paragraph', items : [ 'NumberedList','BulletedList','-','Outdent','Indent','-','Blockquote' ] },
			    { name: 'links', items : [ 'Link','Unlink','Anchor' ] },
			    { name: 'colors', items : [ 'TextColor','BGColor' ] },
			    { name: 'tools', items : [ 'Maximize'] }
			]
		    });
		}
	    }
	});
    },

    deleteTuple: function(){
	$('#pg_table_display tr').each(function(){
	    if($(this).hasClass('trSelected')){
		System.tupleID=this.id.replace(/row/g,"");
	    }
	});
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.deleteTuple&DataInputs=dataStore="+$('#browser_selected_dsName').val()+";table="+$('#pg_table').val()+";clause="+System.pkey+"="+System.tupleID+"&RawDataOutput=Result",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    MapMintDBManager.loadTable();		    
		}
	    }
	});
    },

    loadTable: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.getTableDescription&DataInputs=dataStore="+$('#browser_selected_dsName').val()+";table="+$('#pg_table').val()+"&RawDataOutput=Result",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    var colModel=[];
		    var fields=[];
		    var tmp=eval(xml.responseText);
		    for(i=0;i<tmp.length;i++){
			if(i==0)
			    System.pkey=tmp[i][1];
			colModel[i]={display: tmp[i][1], name : tmp[i][1], width: (i==0?80:120), sortable : true, align: 'center'};
			fields[i]=tmp[i][1];
			if(tmp[i][3]=="PRI")
			    System.pkey=tmp[i][1];
		    }
		    
		    if($("#pg_table_display")[0])
			$("#flexPG").remove();
		    $("#databaseAccess-dialog").append('<table id="pg_table_display"></table>');
		    $("#pg_table_display").flexigrid({
			autoload: true,
			ogcProtocol: "MM",
			url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.getTableContent&RawDataOutput=Result&DataInputs=dataStore="+$('#browser_selected_dsName').val()+";table="+$('#pg_table').val(),
			id: "PG",
			singleSelect: true,
			buttons : [ {
			    name : System.messages['Add'],
			    bclass : 'add',
			    onpress : MapMintDBManager.editTuple
			},{
			    name : System.messages['Edit'],
			    bclass : 'edit',
			    onpress : MapMintDBManager.editTuple
			},{
			    name : System.messages['Delete'],
			    bclass : 'delete',
			    onpress : MapMintDBManager.deleteTuple
			}],
			dataType: 'json',
			colModel: colModel,
			usepager: true,
			sortname: tmp[0][1],
			sortorder: "asc",
			fields: fields,
			dwDataSource: $('#browser_selected_dsName').val(),
			dwLayer: $('#browser_selected_dsName').val(),
			title: $('#pg_table').val(),
			useLimit: true,
			limit: 10,
			showTableToggleBtn: true,
			width: "100%",
			height: 290 
			
		    });
		}
	    }
	});
		
    },
	    
    
  initializeAddWindow: function(){
      var dsType=arguments[0];
      var dsName=arguments[1];
      if(!Distiller.windows["add-database-dialog"]){
	  $.ajax({
	      type: "GET",
	      url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller_db_display&RawDataOutput=Result",
	      dataType: "text",
	      complete: function(xml,status) {
		  try{
		      $( 'body').append(xml.responseText);
		      if(!Distiller.windows)
			  Distiller.windows={};
		      if(!Distiller.windows["add-database-dialog"]){
			  Distiller.windows["add-database-dialog"]=true;
			  $( "#add-database-dialog" ).window({
			      minimizable:false,
			      maximizable:false,
			      resizable: false
			  });
			  $("#dlg-buttons a").button();
	              }
		      if(dsName!=null && dsType!=null){
			  $.ajax({
			      type: "GET",
			      url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
			      dataType: "text",
			      complete: function(xml,status) {
				  try{
				      var tmp=eval('('+xml.responseText+')');
				      loadFormWithObject("Distiller.pgisform",
							 Array("name","dbname","host","port",
							       "password","user","stype"),
							 tmp);
				  }catch(e){alert(e);}
			      }
			  });
		      }else{
			  loadFormWithObject("Distiller.pgisform",
					     Array("name","dbname","host","port",
						   "password","user","stype"));
		      }
		  }catch(e){alert(e);}
	      }
          });
      }else{
	  $( "#add-database-dialog" ).window({
	      minimizable:false,
	      maximizable:false,
	      resizable: false
	  });
	  if(dsName!=null && dsType!=null){
	      $.ajax({
		  type: "GET",
		  url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
		  dataType: "text",
		  complete: function(xml,status) {
		      try{
			  var tmp=eval('('+xml.responseText+')');
			  loadFormWithObject("Distiller.pgisform",
					     Array("name","dbname","host","port",
						   "password","user","stype"),
					     tmp);
		      }catch(e){alert(e);}
		  }
	      });
	  }else{
	      loadFormWithObject("Distiller.pgisform",
				 Array("name","dbname","host","port",
				       "password","user","stype"));
	}
      }
  },
    
    commit: function(){
	if (arguments[0]=='cancel'){
	    confirm('Delete ' + $('.trSelected',grid).length + ' items?');
	}
	else if (arguments[0]=='add'){
	    $.ajax({
		type: "GET",
		url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.save&DataInputs=name="+$mj("Distiller.pgisform.name").value+";dbname="+$mj("Distiller.pgisform.dbname").value+";user="+$mj("Distiller.pgisform.user").value+";password="+$mj("Distiller.pgisform.password").value+";host="+$mj("Distiller.pgisform.host").value+";port="+$mj("Distiller.pgisform.port").value+";type="+$mj("Distiller.pgisform.stype").value,
		dataType: "xml",
		complete: function(xml,status) {
		    $('#add-database-dialog').window('close');
		    MapMintDBManager.refresh($mj("Distiller.pgisform.stype").value);
		}
	});
	}
  },
    
    refresh: function(){
	var localArg=arguments[0];
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.displayJson&DataInputs=type="+arguments[0]+"&RawDataOutput=Result",
	    dataType: "xml",	
	    complete: function(xml,status) {
		$('#progress_bar .ui-progress').css('width', '65%');
		var tmp=null;
		try{
		    tmp=eval("("+xml.responseText+")");
		}catch(e){}
		var myData=[];
		if(tmp!=null)
		    for(var i=0;i<tmp.sub_elements.length;i++){
			myData[i]={id: "browseDirectoriesList"+tmp.sub_elements[i].name, text: tmp.sub_elements[i].name, state: "open"};
		    }
		var child;
		var stype=(tmp==null?((localArg=="PostGIS")?"postgisList":(localArg=="MySQL"?"mysqlList":"")):((tmp.name=="PostGIS")?"postgisList":(tmp.name=="MySQL"?"mysqlList":"")));
		child=$("#browser").tree('getChildren',$("#browser").tree('find',stype).target);
		try{
		    $("#browser").tree('append',{parent: $("#browser").tree('find',stype).target,data: myData});
		}catch(e){}
		for(i=0;i<child.length;i++){
		    $("#browser").tree('remove',child[i].target);
		}
		$('#progress_bar .ui-progress').animateProgress(100, function() {
		    $('#progress_bar .ui-progress').fadeOut(1000);
		});
	    }
	});
    },
    
    test: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.test&DataInputs=name="+$mj("Distiller.pgisform.name").value+";dbname="+$mj("Distiller.pgisform.dbname").value+";user="+$mj("Distiller.pgisform.user").value+";password="+$mj("Distiller.pgisform.password").value+";host="+$mj("Distiller.pgisform.host").value+";port="+$mj("Distiller.pgisform.port").value+";type="+$mj("Distiller.pgisform.stype").value+"&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
		checkWPSResult(xml);
	    }
	});
    },

    remove: function(){
	dsType=$mj("Distiller.pgisrform.stype").value;
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores."+((dsType=='postgis' || dsType=='mysql')?"postgis":((dsType=='WMS' || dsType=='WFS')?"wfs":"directories"))+".delete&DataInputs=name="+$mj("Distiller.pgisrform.name").value+";type="+$mj("Distiller.pgisrform.stype").value,
	    dataType: "text",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    if(dsType=="PostGIS" || dsType=="MySQL")
			MapMintDBManager.refresh($mj("Distiller.pgisrform.stype").value);
		    else
			document.location.reload(true);
		}
	    }
	});
    },

    initializeRemoveWindow: function(){
	var dsType=$('#browser_selected_type').val().replace(/List/,"");
	var dsName=$('#browser_selected_dsName').val().replace(/browseDirectoriesList/,"");
	if(dsType=="PostGIS" || dsType=="MySQL"){
	    dsType=(dsType=="MySQL"?"mysql":"postgis");
	    loadFormWithObject("Distiller.pgisrform",
			       Array("name"));
	}
	if(Distiller.windows["delete-database-dialog"]){
	    $( "#delete-database-dialog" ).window('close');
	    $( "#delete-database-dialog" ).parent().remove();
	}
	
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller_db_remove&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
		$( 'body').append(xml.responseText);
		if(!Distiller.windows)
		    Distiller.windows={};
		Distiller.windows["delete-database-dialog"]=true;
		$( "#delete-database-dialog" ).window({
		    minimizable:false,
		    maximizable:false,
		    resizable: false
		});
		$("#dlgr-buttons a").button();
		loadFormWithObject("Distiller.pgisform",
				   Array("name"));
		$.ajax({
		    type: "GET",
		    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores/"+((dsType=="postgis" || dsType=="mysql")?"postgis":((dsType=="wfs" || dsType=="wms")?"wfs":"directories"))+"load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
		    dataType: "text",
		    complete: function(xml,status){
			var tmp=eval('('+xml.responseText+')');
			loadFormWithObject("Distiller.pgisrform",
					   Array("name"),
					   tmp);
			loadFormWithObject("Distiller.pgisrform",
					   Array("stype"),
					   dsType);
		    }
		});
	    }
	});
    }
    
});

Distiller=MLayout.extend({
    id: 0,
    cnt: 0,
    dataTypes: [],
    args: [],
    windows: [],
    initializeDirWindow: function(){
	var localThis=arguments[0];
	var localArg1=arguments[1];
	if(!Distiller.windows["dialog-directory-new"]){
	    $.ajax({
		type: "GET",
		url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Datastore_dirs_display&RawDataOutput=Result",
		dataType: "text",
		complete: function(xml,status) {
		    try{
			$( 'body').append(xml.responseText);
			if(!Distiller.windows)
			    Distiller.windows={};
			if(!Distiller.windows["dialog-directory-new"]){
			    Distiller.windows["dialog-directory-new"]=true;
			    $( ".dialog-directory-new" ).window({
				minimizable:false,
				height: 400,
				width: 500,
				maximizable:false,
				resizable: false
			    });
			}
			localThis.loadDir("/","default");
			$( '.dialog-directory-new').window("open");
			$('.easyui-linkbutton').button();
			document.getElementById("Distiller.form.name").value="";
			document.getElementById("Distiller.form.path").value="";
			
			if(localArg1!=null){
			    tmp1=localArg1.split("/");
			    document.getElementById("Distiller.form.name").value=tmp1[tmp1.length-2];
			    document.getElementById("Distiller.form.path").value=localArg1;
			}
		    }catch(e){alert(e);}
		}
	    });
	}else{
	    $( '.dialog-directory-new').dialog("open");
	    document.getElementById("Distiller.form.name").value="";
	    document.getElementById("Distiller.form.path").value="";
	    if(localArg1!=null){
		tmp1=localArg1.split("/");
		document.getElementById("Distiller.form.name").value=tmp1[tmp1.length-2];
		document.getElementById("Distiller.form.path").value=localArg1;
	    }
	}
    },
    editDataStore: function(){
	var dsType=$('#browser_selected_type')[0].value.replace(/List/,"");
	var dsName=$('#browser_selected_dsName')[0].value.replace(/browseDirectoriesList/,"");
	if(dsType=="postgis" || dsType=="mysql"){
	    MapMintDBManager.initializeAddWindow((dsType=="mysql"?"MySQL":"PostGIS"),
						 dsName);
	    loadFormWithObject("Distiller.pgisform",
			       Array("name","dbname","host","port",
				     "password","user","stype"));
	    
	    //Distiller.loadDbFormValues(null);
	}
	else{
	    if(dsType=="wms" || dsType=="wfs"){
		OWService.initializeEditWindow(dsType,dsName,System.localThis);
	    }
	    else{
		var tmpDs=dsName.replace(/__/g,"/");
		Distiller.initializeDirWindow(System.localThis,tmpDs);
	    }
	}
    },
    loadIntoGeoreferencer: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=georeferencer.saveGeoreferencedProject&DataInputs=dst="+arguments[0]+";dso="+arguments[1]+"&RawDataOutput=Result",
	    dataType: "xml",	
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false))
		    document.location="./Georeferencer";
	    }
	});	
    },
    cleanDataStore: function(){
	var dsType=$('#browser_selected_type')[0].value.replace(/List/,"");
	var dsName=$('#browser_selected_dsName')[0].value.replace(/browseDirectoriesList/,"").replace(/__/g,"/");
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.directories.cleanup&DataInputs=dsType="+dsType+";dsName="+dsName+"&RawDataOutput=Result",
	    dataType: "xml",	
	    complete: function(xml,status) {
		if(checkWPSResult(xml))
		    document.location.reload(true);
	    }
	});      
    },
    directoriesListRefresh: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.directories.displayJson&DataInputs=state=open&RawDataOutput=Result",
	    dataType: "xml",	
	    complete: function(xml,status) {
		$('#progress_bar .ui-progress').css('width', '65%');
		/*if($mj("directoriesListing"))
		  $mj("directoriesListing").parentNode.removeChild($mj("directoriesListing"));*/
		try{
		    myData=eval("("+xml.responseText+")");
		}catch(e){}
		
		var child=$("#browser").tree('getChildren',$("#browser").tree('find',"mainDirectoriesList").target);
		try{
		    $("#browser").tree('append',{parent: $("#browser").tree('find',"mainDirectoriesList").target,data: myData});
		}catch(e){}
		for(i=0;i<child.length;i++){
		    $("#browser").tree('remove',child[i].target);
		}
		if(myData!=null)
		    for(var i=0;i<myData.length;i++){
			myData[i]["id"]="browseDirectoriesList"+myData[i].id;
		    }
		child=$("#browser").tree('getChildren',$("#browser").tree('find',"mainDirectoriesList").target);
		$('#browser').tree("append",{parent: $("#browser").tree('find',"mainDirectoriesList"),data: myData});
		for(i=0;i<child.length;i++){
		    $("#browser").tree('remove',child[i].target);
		}
		cLayout.refresh();
		$('#progress_bar .ui-progress').animateProgress(100, function() {
		    $('#progress_bar .ui-progress').fadeOut(1000);
		});
	    }
	});
    },
    DatasourceDirCommit: function(){
	if (arguments[0]=='cancel'){
	    confirm('Delete ' + $('.trSelected',grid).length + ' items?')
	}
	else if (arguments[0]=='add'){
	    var tmp=null;
	    $('input[name="Distiller.form.type"]').each(function(){
		if($(this).is("checked"))
		    tmp=$(this).val();
	    });
	    
	    $.ajax({
		type: "GET",
		url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.directories.saveDir&DataInputs=name="+$mj("Distiller.form.name").value+";path="+$mj("Distiller.form.path").value+";type="+tmp+"",
		dataType: "xml",
		complete: function(xml,status) {
		    var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
		    if(tmp=="")
			tmp=$(xml.responseXML).find("ExceptionText").text();
		    if(tmp!="")
			$.notifyBar({ cssClass: "error", html: tmp });
		    else{
			$.notifyBar({ cssClass: "success", html: $(xml.responseXML).find("wps\\:LiteralData").text() });
			$('.dialog-directory-new').window('close');
			document.location.reload(true);
		    }
		}
	    });
	}			
  },
    loadDirContent: function(){
	
    },
    loadDir: function(){
	if(!Distiller.references){
	    Distiller.references=[];
	    Distiller.references1=[];
	}
	Distiller.unloadDir(arguments[0]);
	/*
	 * We should not use cache if dataStore was modified ...
	 */
	for(var i=0;i<Distiller.references.length;i++){
	    if(arguments[0].replace(/__/g,"/")==Distiller.references[i])
		return;
	}
	$.ajax({
	    dwDataSource: arguments[0],
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier="+(arguments.length>1?"vector-tools":"datastores")+"."+(arguments.length>1?"mmExtractVectorInfo":"mmVectorInfo2MapJs")+"&DataInputs="+(arguments.length>1?"dataSource":"dataStore")+"="+arguments[0].replace(/__/g,"/")+(arguments.length>1?";type="+arguments[1]:"")+"&RawDataOutput=Result",
	    mmargs: arguments,
	    dataType: 'xml',
	    complete: function(xml,status){
		try{
		    var tmp= $.xml2json(xml.responseXML);
		    var localTmp=[];
		    var tt="";
		    if(!tmp.layer){
			$.notifyBar({ cssClass: "error", html: "No file found in the directory" });			
		    }
		    else{
			if(!tmp.layer.length){
			    tmp.layer=[tmp.layer];
			}
			for(var i=0;i<tmp.layer.length;i++){
			    localTmp[i]=tmp.layer[i].name;
			    tt+=i+" = "+localTmp[i]+"\n";
			}
		    }
		}catch(e){
		    alert(e);
		    var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
		    $.notifyBar({ cssClass: "error", html: tmp });
		}
		var localLength=Distiller.references.length;
		Distiller.references[Distiller.references.length]=this.dwDataSource;
		$.notifyBar({ cssClass: "success", html: System.messages["Wait loading datasources from datastore ..."] });
		var localCnt;
		
		if(this.mmargs["0"].indexOf("WMS:")>=0){

		    var tmp=$.xml2json(xml.responseXML);
		    if(tmp["layer"])
		    for(i=0;i<tmp["layer"].length;i++){
			/*for(j in tmp["layer"][i])
			    alert(j+" "+tmp["layer"][i][j]);*/
			var str='\
<div class="rDiv flexigrid" id="flex'+(System.flexi_cnt)+'" >\
<div class="trigger">\
<span class="distiller_raster"></span> '+this.dwDataSource.replace(/__/g,"/")+" / "+tmp["layer"][i].label+'\
<div class="delete ui-corner-all" id="delete" title="Delete"></div>\
';
			str+='<div id="open-in-manager" class="open-in-manager ui-corner-all" title="'+System.messages["Open in Manager"]+'" onclick="openInManager(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+tmp["layer"][i].name+'\');"></div>';
			str+='\
<div id="preview" class="preview ui-corner-all" onclick="loadPreview(\''+tmp["layer"][i].preview_link+'\');" title="'+System.messages["Preview"]+'"></div>\
<div id=\"uaccess\" class="uaccess ui-corner-all" onclick="MapMintUsersManager.editPrivilege(\''+tmp["layer"][i].name+'\',\''+this.dwDataSource.replace(/__/g,"/")+'\');" title="'+System.messages["Set privileges"]+'"></div>\
</div>\
<div class="toggle_container" id="flexi_toggler_'+(System.flexi_cnt)+'">\
<div class="block">\
<div id="chart'+(System.flexi_cnt)+'" class="plot" style="width:100%;height:300px;"></div>\
</div>\
</div>\
</div>\
';
			$('#datasources-container-id').append(str);
			Distiller.references[System.flexi_cnt]=this.dwDataSource.replace(/__/g,"/");
			$('#flexi_toggler_'+(System.flexi_cnt)).hide();
			System.flexi_cnt+=1;

		    }
		    else{
			$.notifyBar({ cssClass: "error", html: "No file found in the directory" });
		    }

		}
		else
		    if(localTmp)
			for(var localI=0;localI<localTmp.length;localI++){
			    var localTmp1=localTmp[localI];
			    var localCnt=System.flexi_cnt;
			    //Distiller.references[System.flexi_cnt]=localTmp[localI];
			    $.ajax({
				mmid: localLength,
				dwDataSource: this.dwDataSource,
				dwLayer: localTmp[localI],
				type: "GET",
				url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=vector-tools.mmExtractVectorInfo&DataInputs=dataSource="+this.dwDataSource.replace(/__/g,"/")+";layer="+localTmp[localI]+"&RawDataOutput=Result",
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
					}
					var localTmp1=tmp;
					
					
					if(tmp.fields){
					    
					    if(localTmp1.previewLink && localTmp1.previewLink.length==2)
						localTmp1.previewLink=localTmp1.previewLink[0];
					    $('#datasources-container-id').append('<table id="flex'+(System.flexi_cnt)+'" style="display:none"></table>');
					    Distiller.references[System.flexi_cnt]=this.dwDataSource.replace(/__/g,"/");
					    Distiller.references1[System.flexi_cnt]=this.dwLayer;
					    //alert(tmp.fields.field.length+" "+tmp.fields.field.id+" "+(tmp.fields.field.length?tmp.fields.field[0].id:tmp.fields.field.id));
					    try{
						if(!System.ds_flexigrids)
						    System.ds_flexigrids=Array();
						System.ds_flexigrids[System.flexi_cnt]=$("#flex"+(System.flexi_cnt)).flexigrid({
						    adminAccess: '<tr><td class="ndcol1"></td><td class="ndcol4"  onclick="addFeatureId(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\');">'+System.messages["Add a FID Column"]+'</td></tr>',
						    autoload: false,
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
						    tableToggleBtns: 
						    [
							{title: System.messages["Delete"],name: 'delete',onclick: function(){
							    var myId=this.id.split('_')[1];
							    Distiller.deleteDsConfirm(System.ds_flexigrids[myId][0].p.dwDataSource,System.ds_flexigrids[myId][0].p.dwLayer);
							}},
							{name: 'open-in-manager', title: ""+System.messages["Open in Manager"]+"", content: '<a href="#" class="change-format" onclick="openInManager(\''+this.dwDataSource+'\',\''+this.dwLayer+'\');">&nbsp;</a>'
							},
							{name: 'transform',title: System.messages['Convert'], dso:this.dwDataSource+'|'+this.dwLayer, onclick: function(){var arg=this.id.split("_");Ogr2OgrGUI.initializeWindow(Distiller.references[arg[1]],Distiller.references1[arg[1]]);}},
							{name: 'download',title: System.messages['Download'], dso:this.dwDataSource+'|'+this.dwLayer, onclick: function(){var arg=this.id.split("_");exportAsZip(Distiller.references[arg[1]],Distiller.references1[arg[1]]);}},
							{name: 'preview',title: System.messages['Preview'],onclick: function(){
							    loadPreview(localTmp1.previewLink?tmp.previewLink:"");
							}},
							{name: 'reproject',title: System.messages["Set projection"],content: '<a href="#" class="change-format" onclick="if(\''+tmp.srs+'\'==\'(unknown)\') startSetProjectionWindow(\''+this.dwDataSource+'\',\''+this.dwLayer+'\');">'+(tmp.srs!=""?tmp.srs:"No EPSG")+'</a>'},
							{name: 'uaccess',title: System.messages['Set privileges'], dso:this.dwDataSource+'|'+this.dwLayer, onclick: function(){var arg=this.id.split("_");var arg1=$(this).attr("dso").split("|")[1];MapMintUsersManager.editPrivilege(arg1,Distiller.references[arg[1]]);}},
						    ],
						    bottomToggleBtns:
						    [
							{content: '<span class="pEncoding">'+System.messages["Choose encoding:"]+'<input href="#" type="text" class="change-format" style="width: 80px;margin-top: 5px;" name="swenc_'+System.flexi_cnt+'" id="swenc_'+System.flexi_cnt+'" value="'+tmp.encoding+'" /></span>'}
						    ],
						    width: "100%",
						    height: 290 
						});
						$("#flex"+(System.flexi_cnt)).addClass('hideBody');  
					    }catch(e){alert("Flexigrid failed to be created "+e);}
					}else{
					    if(tmp.Band && !tmp.Band.length)
						tmp.Band=Array(tmp.Band);
					    if(tmp.Band){
						var str='\
<div class="rDiv flexigrid" id="flex'+(System.flexi_cnt)+'" >\
<div class="trigger">\
<span class="distiller_raster"></span> '+this.dwDataSource.replace(/__/g,"/")+" / "+this.dwLayer+'\
<div class="ptogtitle ui-corner-all" id="flexi_title_'+(System.flexi_cnt)+'" title="Toogle table">\
<span></span>\
</div>\
<div class="delete ui-corner-all" id="delete" title="Delete"></div>\
';
						if(tmp.origin)
						    str+='<div id="open-in-manager" class="open-in-manager ui-corner-all" title="'+System.messages["Open in Manager"]+'" onclick="openInManager(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\');"></div>';
						else
						    str+='<div id="open-in-manager" class="open-in-manager ui-corner-all" title="'+System.messages["Open in Georeferencer"]+'" onclick="Distiller.loadIntoGeoreferencer(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\');"></div>';
						str+='\
<div id="download" class="download ui-corner-all" onclick="exportAsZip(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\');" title="'+System.messages["Download"]+'"></div>\
<div id="preview" class="preview ui-corner-all" title="'+System.messages["Preview"]+'" onclick="loadRasterPreview(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\')" ></div>\
<div id="transform" class="transform ui-corner-all" title="'+System.messages["Transform"]+'" onclick="Raster.startDemWindow(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\');"></div>\
<div id="reproject" class="reproject ui-corner-all" title="'+System.messages["Change projection"]+'" onclick="startSetProjectionWindow(\''+this.dwDataSource.replace(/__/g,"/")+'\',\''+this.dwLayer+'\',true)">\
<a class="change-format" href="#">undefined</a>\
</div>\
<div id=\"uaccess\" class="uaccess ui-corner-all" onclick="MapMintUsersManager.editPrivilege(\''+this.dwLayer+'\',\''+this.dwDataSource.replace(/__/g,"/")+'\');" title="'+System.messages["Set privileges"]+'"></div>\
</div>\
<div class="toggle_container" id="flexi_toggler_'+(System.flexi_cnt)+'">\
<div class="block">\
<div id="chart'+(System.flexi_cnt)+'" class="plot" style="width:100%;height:300px;"></div>\
</div>\
</div>\
</div>\
';
						$('#datasources-container-id').append(str);
						Distiller.references[System.flexi_cnt]=this.dwDataSource.replace(/__/g,"/");
						$.jqplot.config.enablePlugins = true;
						mySeries=[];
						myLabels=[];
						var j=0;
						for(var i=0;i<tmp.Band.length;i++){
						    //alert("["+tmp.Band[i].histogram[0].Text+"]");
						    mySeries[j] = eval("["+tmp.Band[i].histogram+"]");
						    myLabels[j] = "Band "+(i+1);
						    j++;
						}
						plot2 = $.jqplot('chart'+System.flexi_cnt, mySeries, {
						    seriesDefaults:{
							rendererOptions:{ varyBarColor : true },
							lineWidth: 1.5,
							markerRenderer: $.jqplot.MarkerRenderer,
							markerOptions: {
							    show: false,
							    style: 'square',
							    lineWidth: 2,
							    size: 4,
							    color: '#666666',
							    shadow: true,
							    shadowAngle: 45,
							    shadowOffset: 1,
							    shadowDepth: 3,
							    shadowAlpha: 0.07
							}
						    },
						    
						    barRenderer: {barWidth: '1px'},
						    highlighter: { bringSeriesToFront: true, tooltipLocation: 'e', tooltipOffset: 0, formatString: '<div class="jqplot-highlighter">%s: <strong>%s</strong></div>' },
						    axesDefaults:{
							min: 0
						    },
						    cursor: {
							show: true,
							zoom: true     
						    },
						    grid: {background: '#FFFFFF', gridLineColor: '#b4b4b4', borderColor: '#b4b4b4', borderWidth:'1px', drawBorder:false},
						    legend: {show: true, location: 'nw', xoffset: -115, labels: myLabels },
						    seriesColors: [ "#3DA83B", "#86C55A", "#B3EF75"]
						});
						
						$('#flexi_toggler_'+(System.flexi_cnt)).hide();
						//$(".toggle_container").hide();
						
						$("#flexi_title_"+System.flexi_cnt)[0].local_id=System.flexi_cnt;
						$("#flexi_title_"+System.flexi_cnt).click(function(){
						    $("#flexi_toggler_"+this.local_id).slideToggle("slow");
						});
						
						$("div.ptogtitle, .delete, .open-in-mamanger, .download, .preview, .reproject").tipsy({fade: true, offset:3, opacity: 1, gravity: 'ne'}); 
						
						
					    }else
						return -1;
					}
					System.flexi_cnt+=1;
				    }catch(e){
					alert("MM Error : "+e);
					for(var i in e)
					    alert(i+" "+e[i]);
				    }
				}
			    });
			}
	    }
	});
	
    },
    unloadDir: function(){
	arguments[0]=arguments[0].replace(/__/g,"/");
	if(Distiller.references)
	    for(var i=0;i<Distiller.references.length;i++){
		try{
		    //alert(Distiller.references[i]+" "+arguments[0])
		    if(Distiller.references[i]==arguments[0] && $mj('flex'+i)){
			$mj('flex'+i).style.display=($mj('flex'+i).style.display=='none'?'block':'none');//parentNode.removeChild($mj('flex'+i));
			//Distiller.references[i]=false;
		    }
		}catch(e){alert("MM Error: "+e);}
	    }
    },
    last_dir: null,
    loaded_dirs: {},

    deleteDsConfirm: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller/removeDs;dst="+arguments[0]+";dso="+arguments[1]+";dsotype="+arguments[1].value+"&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    if(!$('#removeDs-dialog')[0])
			$("body").append('<div id="removeDs-dialog" title="Delete Data Source"></div>');
		    $('#removeDs-dialog').html("");
		
		    $( "#removeDs-dialog" ).window({
			minimizable:false,
			maximizable:false,
			resizable: false
		    });
		    $('#removeDs-dialog').html(xml.responseText);
		    $('.easyui-linkbutton').button();
		}
	    }
	});
    },

    deleteDs: function(){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.removeDS&DataInputs=dso="+$("#Distiller_deleteDS_name").val()+";dst="+$("#Distiller_deleteDS_dst").val()+";dsotype="+$("#Distiller_deleteDS_stype").val()+"&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
		if(checkWPSResult(xml,false)){
		    $('#removeDs-dialog').html(xml.responseText);
		    document.location.reload(true);
		}
	    }
	});
    },
    userManagement: function(){
	var dsType=$('#browser_selected_type')[0].value.replace(/List/,"");
	var dsName=$('#browser_selected_dsName')[0].value.replace(/browseDirectoriesList/,"").replace(/__/g,"/");
	$.ajax({
	    type: "GET",
	    url: "UsersManagement/DataStoreAccess;dataStore="+dsName,
	    dataType: "xml",	
	    complete: function(xml,status) {
		if($( "#umdt-dialog" ).length==0)
		    $("body").append('<div id="umdt-dialog" title="'+System.messages["Admin privileges"]+'"></div>');
		$('#umdt-dialog').html("");
		$('#umdt-dialog').append(xml.responseText);
		$("#umdt-dialog" ).window({
		    width: 350,
		    height: 300,
		    minimizable:false,
		    maximizable:false,
		    resizable: true
		});
	    }
	});
    },
    validDataStorePrivileges: function(){
    	var postRequest=[];
	postRequest[postRequest.length]={'name': "dataStore",value: $("#am_dataStore").val(),dataType: "string"};
	$('.ds_gselect').each(function(){
	    postRequest[postRequest.length]={'name': 'group',value: $(this).val(),dataType: "string"};
	});
	for(i in {"r":"","w":"","x":""})
	    $('.'+i+'_ds_um_group').each(function(){
		postRequest[postRequest.length]={'name': "ds_"+i,value: ($(this).attr("checked")?1:0),dataType: "string"};
	    });
	
	var data=WPSGetHeader("datastores.saveDataStorePrivileges")+WPSGetInputs(postRequest)+WPSGetOutput({name:"Result"})+WPSGetFooter();
	$.ajax({
	    type: "POST",
	    url: System.zooUrl,
	    data: data,
	    contentType: "text/xml",
	    complete: function(xml,status) {
	    	if(checkWPSResult(xml)){
		    $( "#umEditor-dialog" ).window('close');
		}
	    }
    	});
    },
    setUserPrivilegesForLayer: function(){
	alert(arguments[0]+" "+arguments[1]);
    }

});

Distiller.define({
    loadDir: function(){
	Distiller.last_dir=arguments[0];
	Distiller.last_node=arguments[1];
	
	if(arguments.length>=2 && arguments[1]!="default" && !Distiller.loaded_dirs[Distiller.last_dir]){
	    Distiller.last_node.origin_text=Distiller.last_node.text;
	    $("#browser4DirectoriesList__").tree('update',{target: Distiller.last_node.target, id: Distiller.last_node.id, text: Distiller.last_node.origin_text+" (loading...)"});
	}
	
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.directories."+(arguments[0]=="/"?"list":"displayJson")+"&DataInputs=dir="+Distiller.last_dir+(Distiller.last_dir=="/"?"":"/")+(arguments.length>1?";type="+arguments[1]:"")+"&RawDataOutput=Result",
	    dataType: "xml",
	    complete: function(xml,status) {
		if(!Distiller.loaded_dirs[Distiller.last_dir]){
		    Distiller.loaded_dirs[Distiller.last_dir]=true;
		    $('#progress_bar .ui-progress').css('width', '65%');
		    
		    var reg=/\//g;
		    var tmpId='#browseDirectoriesList'+Distiller.last_dir.replace(reg,"__");	      
		    if(Distiller.last_dir=='/')
			$(tmpId).html('<ul id="browser4DirectoriesList'+Distiller.last_dir.replace(reg,'__')+'" class="filetree treeview"  style="height: 185px;overflow:auto;"><li class="collapsable lastCollapsable"><div class="hitarea  expandable-hitarea" onclick=""></div>'+'<span class="folder">Directory '+Distiller.last_dir+': </span>'+xml.responseText+'</li></ul>');
		    else{
			$("#browser4DirectoriesList__").tree('update',{target: Distiller.last_node.target, id: Distiller.last_node.id, text: Distiller.last_node.origin_text});	  
			//alert(Distiller.last_node.id+" "+eval(xml.responseText));
			var tmp=eval(xml.responseText);
			/*for(var i=0;i<tmp.length;i++)
			  alert(tmp[i]["id"]);*/
			try{
			    $("#browser4DirectoriesList__").tree('append',{parent: Distiller.last_node.target, data: tmp});
			    $("#browser4DirectoriesList__").tree('toggle',Distiller.last_node.target);
			    $("#browser4DirectoriesList__").tree('toggle',Distiller.last_node.target);
			}catch(e){
			}
			//$(tmpId).append(xml.responseText);
		    }
		    $('#progress_bar .ui-progress').css('width', '95%');
		    if(!Distiller.browser4DirectoriesList)
			Distiller.browser4DirectoriesList=$("#browser4DirectoriesList__").tree({
			    checkbox: true,
			    onBeforeExpand:function(node){
				layouts[0].loadDir(node.id.replace("browseDirectoriesList","").replace(/__/g,"/"),node);
			    },
			    onCheck: function(node,ischeck){
				try{
				    var val=node.id;
				    if($("#browser4DirectoriesList__").tree('isLeaf',node.target)){
					val=$("#browser4DirectoriesList__").tree('getParent',node.target).id;
				    }
				    
				    if(ischeck)
					$mj('Distiller.form.path').value=val.replace("browseDirectoriesList","").replace(/__/g,"/");
				    //Distiller.loadDir(node.id);
				    else
					$mj('Distiller.form.path').value="/";
				}catch(e){}
			    }
			});
		    /*$("#directoriesList/"+Distiller.last_dir).tree({checkbox: true,
                      onClick:function(node){
                      //alert("hehe"+node.id);
                      }});*/
		    $('#progress_bar .ui-progress').animateProgress(100, function() {
			$('#progress_bar .ui-progress').fadeOut(1000);
		    });
		}
	    }
	});
    },

    initialize: function(){
	$(".addDB-toolbar dt a").click(function() {
	    $(".addDB-toolbar dd ul").show('slow');
	});
	
	$(".addDB-toolbar dd ul").mouseleave(function() {
	    $(".addDB-toolbar dd ul").hide('slow');
	});
      
	Distiller.dataTypes[0]={type: 'MySQL',loaded: true};
	Distiller.dataTypes[1]={type: 'PostGIS',loaded: true};
	Distiller.dataTypes[2]={type: 'dir',loaded: true};
	cLayout.refresh();
	//this.loadDir("/","default");  	
  	
	function test(com,grid)
	{
	    if (com=='Delete')
	    {
		confirm('Delete ' + $('.trSelected',grid).length + ' items?')
	    }
	    else if (com=='Add')
	  {
	      //alert('Add New Item');
	  }			
	}
	
	$('b.top').click
	(
	    function ()
	    {
		$(this).parent().toggleClass('fh');
	 }
	);
	
	System.localThis=this;
	$('.dir').button({
	    text: false
	}).click(function() {
	    Distiller.initializeDirWindow(System.localThis);
	    
	});
	
	$('.db').button({
	    text: false	
	}).click(function() {
		MapMintDBManager.initializeAddWindow();
	});
	
	
	$('.wfs').button({
	    text: false	
	}).click(function() {
	    System.wxsType="WFS";
	    MapMintWFSManager.initializeAddWindow();
	});

	$('.wms').button({
	    text: false	
	}).click(function() {
	    System.wxsType="WMS";
	    MapMintWFSManager.initializeAddWindow();
	});
	
	endLoading();
	
    },
    
    refresh: function(){
	$('.add-layer-vector, .add-layer-raster, .add-layer-wms, .add-layer-wfs, .add-layer-wcs').button({text: false});
	$('a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
	try{
	    for(var i=0;i<Distiller.dataTypes.length;i++)
		if(Distiller.dataTypes[i].loaded==false)
		    return -1;
	    $("#browser").tree({
		checkbox: true,
		onCheck:function(node, checked){
		    if($("#browser").tree('isLeaf',node.target)){
			//alert(node.id+" "+checked);
			reg=/browseDirectoriesList/;
			if(checked)
			    Distiller.loadDir((node.id+'').replace(reg,""));
			else
			    Distiller.unloadDir((node.id+'').replace(reg,""));
		    }
		},
		onContextMenu: function(e, node){
		    if($("#browser").tree('isLeaf',node.target)){
			e.preventDefault();
			var parentName=$("#browser").tree('getParent',node.target).id;
			$('#browser_selected_type').val(parentName);
			$('#browser_selected_dsName').val(node.id.replace(/browseDirectoriesList/,""));
			System.mmNodeId=node.id;
			$('#browser').tree('select', node.target);
			/*$('#browser_db_menu').emenu('show', {
			    left: e.pageX,
			    top: e.pageY
			});
			$("#db_menu_item").css({"display":((parentName=="postgisList")?"block":"none")});*/
			if(parentName=="postgisList"){
			    $('#browser_db_menu').emenu('show', {
				left: e.pageX,
				top: e.pageY
			    });
			}else{
			    //if(parentName=="mainDirectoriesList")
				$('#browser_menu').emenu('show', {
				    left: e.pageX,
				    top: e.pageY
				});
			    /*else
				$('#browser_ows_menu').emenu('show', {
				    left: e.pageX,
				    top: e.pageY
				});*/

			}
		    }
		}
	  }
			      );
	    $("#browser4DirectoriesList"+Distiller.last_dir).tree();
	}catch(e){alert("Tree error"+e);}
	
	
    },
    
    reloadDir:function(){
	Distiller.loaded_dirs[Distiller.Distiller.last_dir]=false;
    }
});

function loadRasterPreview(){
    $.ajax({
	type: "GET",
	url: "Distiller/previewLink;dst="+arguments[0]+";dso="+arguments[1]+"",
	dataType: "text",
	complete: function(xml,status) {
	    loadPreview(xml.responseText);
	}
    });    
}

function loadPreview(){
    
    var toto=$mj("preview-dialog-image");
    //alert(toto==null);
    if(toto==null)
	$("body").append('<div id="preview-dialog" title="'+System.messages["Preview"]+'"><img id="preview-dialog-image" alt="loading..." src="'+arguments[0]+'" /></div>');
    else{
	$mj( "preview-dialog-image" ).src="";
	$mj( "preview-dialog-image" ).src=arguments[0];
    }
    $( "#preview-dialog" ).window({
	width: 550,
	height: 500,
	minimizable:false,
	maximizable:false,
	resizable: true
    });
    return;
}

function addFeatureId(){
    
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=vector-converter.addFeatureId&DataInputs=InputDSTN="+arguments[0]+";InputDSON="+arguments[1]+"",
	dataType: "text",
	complete: function(xml,status) {
	    var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
	    if(tmp!="")
		$.notifyBar({ cssClass: "error", html: tmp });
	    else{
		$.notifyBar({ cssClass: "success", html: $(xml.responseXML).find("wps\\:LiteralData").text() });
		document.location.reload(true);
	    }
	//$( "#delete-database-dialog" ).window('close');
	    //MapMintDBManager.refresh($mj("Distiller.datasource.stype").value);
	}
    });  
}

function createTileindex(){
    var postRequest=[];
    var args="";
    
    postRequest[postRequest.length]={'name': "dir",value: $('#tdir')[0].value.replace(/__/g,"/").replace(/browseDirectoriesList/,""),dataType: "string"};
    
    postRequest[postRequest.length]={'name': "ext",value: $("#t_ext").val(),dataType: "string"};
    postRequest[postRequest.length]={'name': "iname",value: $("#tname").val(),dataType: "string"};
    $("#tprj").find("option:selected").each(function () {
	postRequest[postRequest.length]={'name': "srs",value: this.value,dataType: "string"};
    });
  
    $("#tileindex_dest").find("option:selected").each(function () {
	postRequest[postRequest.length]={'name': "idir",value: this.value,dataType: "string"};
    });
    
    var data=WPSGetHeader("raster-tools.createTindex")+WPSGetInputs(postRequest)+WPSGetOutput({name:"Result"})+WPSGetFooter();
    $.ajax({
        type: "POST",
	url: System.zooUrl,
	data: data,
	contentType: "text/xml",
	complete: function(xml,status) {
	    checkWPSResult(xml);
	}
    });
    
}

function mozaicImages(){
    var postRequest=[];
    var args="";
    
    postRequest[postRequest.length]={'name': "dir",value: $('#tdir').val().replace(/__/g,"/").replace(/browseDirectoriesList/,""),dataType: "string"};
    
    postRequest[postRequest.length]={'name': "ext",value: $("#t_ext").val(),dataType: "string"};
    postRequest[postRequest.length]={'name': "iname",value: $("#tname").val(),dataType: "string"};
    $("#tprj").find("option:selected").each(function () {
	postRequest[postRequest.length]={'name': "srs",value: this.value,dataType: "string"};
    });
  
    $("#tileindex_dest").find("option:selected").each(function () {
	postRequest[postRequest.length]={'name': "OutputDSN",value: System.dataPath+"/dirs/"+this.value+"/"+$("#tname").val()+".tif",dataType: "string"};
    });
    
    var data=WPSGetHeader("raster-tools.Gdal_Merge")+WPSGetInputs(postRequest)+WPSGetOutput({name:"Result"})+WPSGetFooter();
    $.ajax({
        type: "POST",
	url: System.zooUrl,
	data: data,
	contentType: "text/xml",
	complete: function(xml,status) {
	    checkWPSResult(xml);
	}
    });
    
}

function openInManager(dwDataSource,dwLayer){
    var data=WPSGetHeader("mapfile.openInManager")+WPSGetInputs([{"name": "dstn","value": dwDataSource.replace(/__/g,"/"),"dataType":"string"},{"name": "dson","value":dwLayer,"dataType":"string"}])+WPSGetOutput({name:"Result"})+WPSGetFooter();
    $.ajax({
        type: "POST",
	url: System.zooUrl,
	data: data,
	contentType: "text/xml",
	complete: function(xml,status) {
	    if(checkWPSResult(xml))
		document.location="./Manager";
	}
  });
}


MapMintWFSManager=Class.create({
    
    initializeAddWindow: function(){
	var dsType=arguments[0];
	var dsName=arguments[1];
	if(Distiller.windows["add-wfs-dialog"]){
	    $("#add-wfs-dialog").window('close');
	    $("#add-wfs-dialog").parent().remove();
	    Distiller.windows["add-wfs-dialog"]=false;
	} 
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller/wfs/display;type="+System.wxsType+"&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
		try{
		    $( 'body').append(xml.responseText);
		    if(!Distiller.windows)
			Distiller.windows={};
		    if(Distiller.windows["add-wfs-dialog"]){
			$("#add-wfs-dialog").window("close");
			$("#add-wfs-dialog").remove();
		    }
		    Distiller.windows["add-wfs-dialog"]=true;
		    $( "#add-wfs-dialog" ).window({
			minimizable:false,
			maximizable:false,
			resizable: false
		    });
		    $("#dlg-buttons a").button();
	        }catch(e){alert(e);}
	    }
        });
    },
    
    commit: function(){
	if (arguments[0]=='cancel'){
	    confirm('Delete ' + $('.trSelected',grid).length + ' items?');
	}
	else if (arguments[0]=='add' || arguments[0]=='test'){
	    ($("#Distiller_wfsform_name").val()?$("#Distiller_wfsform_name").val():$("#OWS_form_name").val())
	    var tdata=
		WPSGetHeader("datastores.wfs."+(arguments[0]=='add'?"save":"test"))+
		WPSGetInputs([
		    {
			name: "name",
			value: ($("#Distiller_wfsform_name").val() && $("#Distiller_wfsform_name").val()!=""?$("#Distiller_wfsform_name").val():$("#OWS_form_name").val()),
			dataType: "string"
		    },
		    {
			name: "url",
			value: ($("#Distiller_wfsform_url").val() && $("#Distiller_wfsform_url").val().replace(/&/g,"&amp;")!=""?$("#Distiller_wfsform_url").val().replace(/&/g,"&amp;"):$("#OWS_form_url").val()),
			dataType: "string"
		    },
		    {
			name: "type",
			value: ($("#Distiller_wfsform_wxsType").val() && $("#Distiller_wfsform_wxsType").val()!=""?$("#Distiller_wfsform_wxsType").val():$("#OWS_form_type").val()),
			dataType: "string"
		    }
		])+
		WPSGetOutput({"name":"Result"})+
		WPSGetFooter();
	    $.ajax({
		type: "POST",
		url: System.zooUrl,
		data: tdata,
		contentType: "text/xml",
		mtype: arguments[0],
		complete: function(xml,status) {
		    if(checkWPSResult(xml) && this.mtype!="test"){
			MapMintWFSManager.refresh($mj("Distiller_wfsform_wxsType").value);
			$('#add-wfs-dialog').window('close');
		    }
		}
	    });
	}
  },
    
    refresh: function(){
	var localArg=arguments[0];
	document.location.reload(true);
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.wfs.displayJson&DataInputs=type="+arguments[0]+"&RawDataOutput=Result",
	    dataType: "xml",	
	    complete: function(xml,status) {
		$('#progress_bar .ui-progress').css('width', '65%');
		var tmp=null;
		try{
		    tmp=eval("("+xml.responseText+")");
		}catch(e){}
		var myData=[];
		if(tmp!=null)
		    for(var i=0;i<tmp.sub_elements.length;i++){
			
			myData[i]={id: "browseDirectoriesList"+tmp.sub_elements[i].name, text: tmp.sub_elements[i].name, state: "open"};
		    }
		var child;
		var stype="wfsList";
		child=$("#browser").tree('getChildren',$("#browser").tree('find',"wfsList").target);
		try{
		    $("#browser").tree('append',{parent: $("#browser").tree('find',"wfsList").target,data: myData});
		}catch(e){}
		for(i=0;i<child.length;i++){
		    $("#browser").tree('remove',child[i].target);
		}
		$('#progress_bar .ui-progress').animateProgress(100, function() {
		    $('#progress_bar .ui-progress').fadeOut(1000);
		});
	    }
	});
    },
    
    remove: function(){
	dsType=$mj("Distiller.pgisrform.stype").value;
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores."+(($mj("Distiller.pgisrform.stype").value=='PostGIS' || $mj("Distiller.pgisrform.stype").value=='MySQL')?"postgis":"directories")+".delete&DataInputs=name="+$mj("Distiller.pgisrform.name").value+";type="+$mj("Distiller.pgisrform.stype").value,
	    dataType: "text",
	    complete: function(xml,status) {
	      var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
		if(tmp!="")
		    $.notifyBar({ cssClass: "error", html: tmp });
		else
		    $.notifyBar({ cssClass: "success", html: $(xml.responseXML).find("wps\\:LiteralData").text() });
		$( "#delete-database-dialog" ).window('close');
		if(dsType=="PostGIS" || dsType=="MySQL")
		    MapMintDBManager.refresh($mj("Distiller.pgisrform.stype").value);
		else
		    document.location.reload(true);
	    }
	});
    },
    
    initializeRemoveWindow: function(){
	var dsType=$('#browser_selected_type')[0].value.replace(/List/,"");
	var dsName=$('#browser_selected_dsName')[0].value.replace(/browseDirectoriesList/,"");
	if(dsType=="postgis" || dsType=="mysql"){
	    dsType=(dsType=="mysql"?"MySQL":"PostGIS");
	    loadFormWithObject("Distiller.pgisrform",
			       Array("name"));
	}
	if(!Distiller.windows["delete-database-dialog"]){
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller_db_remove&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
	      $( 'body').append(xml.responseText);
		if(!Distiller.windows)
		    Distiller.windows={};
		if(!Distiller.windows["delete-database-dialog"]){
		    Distiller.windows["delete-database-dialog"]=true;
		    $( "#delete-database-dialog" ).window({
			minimizable:false,
			maximizable:false,
			resizable: false
		    });
		    $("#dlgr-buttons a").button();
		    loadFormWithObject("Distiller.pgisform",
				       Array("name"));
		    $.ajax({
			type: "GET",
			url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores."+((dsType=="postgis" || dsType=="mysql")?"postgis":"directories")+".load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
			dataType: "text",
			complete: function(xml,status){
			    var tmp=eval('('+xml.responseText+')');
			    loadFormWithObject("Distiller.pgisrform",
					       Array("name"),
					       tmp);
			    loadFormWithObject("Distiller.pgisrform",
					       Array("stype"),
					       dsType);
			}
		    });
		}
	    }
	});
	}else{
	    $( "#delete-database-dialog" ).window({
		minimizable:false,
		maximizable:false,
		resizable: false
	    });
	    
	    loadFormWithObject("Distiller.pgisform",
			       Array("name"));
	    $.ajax({
		type: "GET",
		url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.postgis.load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
		dataType: "text",
		complete: function(xml,status){
		    var tmp=eval('('+xml.responseText+')');
		    loadFormWithObject("Distiller.pgisrform",
				       Array("name"),
				       tmp);
		}
	    });
	    
	}
    }
    
});

Raster={
    startDemWindow: function(){
	$.ajax({
	    url: "./Distiller/RasterWindow;dst="+arguments[0]+";dso="+arguments[1],
	    complete: function(xml,status){
		if($('#raster-dialog')[0]){
		    $('#raster-dialog').window('close');
		    $('#raster-dialog').remove();
		}
		$("body").append('<div id="raster-dialog" title="'+System.messages["Terrain Tools"]+' Type"></div>');
		$('#raster-dialog').html("");
		$('#raster-dialog').append(xml.responseText);
		$('#raster-dialog').window({
		    width: 250,
		    height: 400,
		    maximizable:false,
		    resizable: false
		});
		$(".hasInfo").tipsy({fade: true, offset:3, opacity: 1, gravity: 'se'});
	    }
	});
    }
}

function runGdalDem(){
    params=[];
    params.push({name: "InputDSN",value: $("#ofname").val(),dataType: "string"});
    if($("#raster_method").val()=="contour"){
	params.push({name: "OutputDSN",value: $("#ofdst").val()+$("#raster_oname").val()+".shp",dataType: "string"});
	params.push({name: "i",value: $("#contour_interval").val(),dataType: "string"});	
	params.push({name: "a",value: $("#contour_aname").val(),dataType: "string"});	
    }else{
	params.push({name: "OutputDSN",value: $("#ofdst").val()+$("#raster_oname").val()+".tif",dataType: "string"});
	params.push({name: "utility",value: $("#raster_method").val(),dataType: "string"});
	params.push({name: "s",value: $("#"+$("#raster_method").val()+"_scale").val(),dataType: "string"});
	if($("#raster_method").val()=="hillshade")
	    params.push({name: "z",value: $("#"+$("#raster_method").val()+"_zFactor").val(),dataType: "string"});
    }
    params.push({name: "b",value: $("#ofband").val(),dataType: "string"});
    
    $("#"+$("#raster_method").val()+"_p").find("inputs").each(function(){
	//alert($(this)[0]);
	reg=new RegExp($("#raster_method").val()+"_",'g');
	params.push({name: $(this)[0].id.replace(reg,""),value: $(this).val(),dataType: "string"});
    });

    var data=WPSGetHeader("raster-tools."+($("#raster_method").val()=="contour"?"Gdal_Contour":"Gdal_Dem"))+WPSGetInputs(params)+WPSGetOutput({"name":"Result"})+WPSGetFooter();

    $("#raster-dialog").find("input[type=submit]").hide();
    $.ajax({
	type: "POST",
	data: data,
	contentType: "text/xml",
	url: System.zooUrl,
	dataType: "xml",
	complete: function(xml,status){
	    if(checkWPSResult(xml,false)){
		$.notifyBar({ cssClass: "success", html: xml.responseText+System.messages[" has been successfully created"] });
		$("#raster-dialog").find("input[type=submit]").show();
	    }
	}
    });	 
}

OWService=Class.create({
    initializeEditWindow: function(){
	var dsType=arguments[0];
	var dsName=arguments[1].split(":")[1];
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller/wfs/display;type="+dsType+";name="+dsName+";etype=Edit&RawDataOutput=Result",
	    dataType: "text",
	    complete: function(xml,status) {
		try{
		    if(Distiller.windows["add-wfs-dialog"]){
			$( '#add-wfs-dialog').window("close");
			$( '#add-wfs-dialog').remove();
			Distiller.windows["add-wfs-dialog"]=false;
		    };
		    $( 'body').append(xml.responseText);
		    if(!Distiller.windows)
			Distiller.windows={};
		    if(!Distiller.windows["add-wfs-dialog"]){
			Distiller.windows["add-wfs-dialog"]=true;
			$( "#add-wfs-dialog" ).window({
			    minimizable:false,
			    height: 200,
			    width: 340,
			    maximizable:false,
			    resizable: false
			});
		    }
		    $( '.add-wfs-dialog').window("open");
		    $('.easyui-linkbutton').button();
		}catch(e){}
	    }
	});
    }
});

function startMergeWindow(){
  mmTIN={};
  if($("#tileindex-data-dialog")[0]){
    $("#tileindex-data-dialog").window('close');
    $("#tileindex-data-dialog").remove();
  }
  if(!$("#merge-data-dialog")[0])
    $("body").append('<div id="merge-data-dialog" title="'+System.messages["Mosaic a set of images"]+'"></div>');

  $.ajax({
        type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=upload.getForm&DataInputs=form=Distiller/TileWindow;type=merge&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	  $("#merge-data-dialog").html(xml.responseText);  
	  $("#browse_tile").next().children().tree({
	  	    checkbox: true,
		    onBeforeExpand:function(node){
			dirRefresh(node,$("#browse_tile").next().children(),function(myData,node2){
				mmTIN[node2.id]["ext"]=detectExt(myData);
			});
		    },
		    onCheck: function(node,ischeck){
		    	if(ischeck){
				if(mmTIN[node.id] && mmTIN[node.id]["ext"]){
					$('#t_ext')[0].value=mmTIN[node.id]["ext"];
				}
				$('#tdir').val(node.id);
			}
			else
				$('#tdir').val("");
		    }
	  });
  	  $("#merge-data-dialog").window({
	      minimizable:false,
	      maximizable:false,
	      resizable: false	  
	   });
	
      }
    });
}


function setProjection(){
    var postRequest=[];
    postRequest[postRequest.length]={'name': "dstn",value: $("#layer_dst")[0].value,dataType: "string"};
    postRequest[postRequest.length]={'name': "dson",value: $("#layer_dso")[0].value,dataType: "string"};
    postRequest[postRequest.length]={'name': "srs",value: $("#set_tprj")[0].value,dataType: "string"};
    postRequest[postRequest.length]={'name': "isRaster",value: (System.isRaster?System.isRaster:false),dataType: "string"};
    var data=WPSGetHeader("vector-converter.setSRS")+WPSGetInputs(postRequest)+WPSGetOutput({name:"Result"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	url: System.zooUrl,
	data: data,
	contentType: "text/xml",
	complete: function(xml,status) {
	    checkWPSResult(xml);
	    Distiller.loaded_dirs[Distiller.last_dir]=false;
      	}
    });
}

function startSetProjectionWindow(){
  if(arguments.length>2)
    System.isRaster=arguments[2];
  else
    System.isRaster=false;
  if($("#projection-data-dialog").length>0){
	$("#projection-data-dialog").window('close');
	$("#projection-data-dialog").remove();
  }
    $("body").append('<div id="projection-data-dialog" title="'+System.messages["Set Projection"]+'"></div>');

  $("#projection-data-dialog")[0].title="Set Project for "+arguments[1];
  var rpl=System.dataPath+'/dirs/';
  rpl=rpl.replace(/\//g,'__');
  var dstName=arguments[0].replace(/__/g,"/");/*.replace(rpl,"").replace("__","");*/
  var idir=arguments[0].replace(rpl,"").replace("__","");;

  $.ajax({
        type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=template.display&DataInputs=tmpl=Distiller/SetProjection;dstName="+dstName+";dsoName="+arguments[1]+"&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	  $("#projection-data-dialog").html(xml.responseText);  
  	  $("#projection-data-dialog").window({
	      minimizable:false,
	      maximizable:false,
	      resizable: false	  
	   });
	
      }
    });
}

function detectExt(myData){
    for(var i=0;i<myData.length;i++){
	var tmp=myData[i]['text'].split('.');
	if(tmp.length > 1 && (tmp[1]=="ecw" || tmp[1]=="tif")){
	    return tmp[1];
	}
    }
    return System.messages["Not found"];
}

function startTileWindow(){
    mmTIN={};
    if($("#merge-data-dialog")[0]){
	$("#merge-data-dialog").window('close');
	$("#merge-data-dialog").remove();
    }
    if(!$("#tileindex-data-dialog")[0])
	$("body").append('<div id="tileindex-data-dialog" title="'+System.messages["Add tileindex"]+'"></div>');
    
    $.ajax({
        type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=upload.getForm&DataInputs=form=Distiller/TileWindow&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	    $("#tileindex-data-dialog").html(xml.responseText);  
	    $("#browse_tile").next().children().tree({
	  	checkbox: true,
		onBeforeExpand:function(node){
		    dirRefresh(node,$("#browse_tile").next().children(),function(myData,node2){
			mmTIN[node2.id]["ext"]=detectExt(myData);
		    });
		},
		onCheck: function(node,ischeck){
		    if(ischeck){
			if(mmTIN[node.id] && mmTIN[node.id]["ext"]){
			    $('#t_ext')[0].value=mmTIN[node.id]["ext"];
			}
			$('#tdir').val(node.id);
		    }
		    else
			$('#tdir').val("");
		}
	    });
  	    $("#tileindex-data-dialog").window({
		minimizable:false,
		maximizable:false,
		resizable: false	  
	    });
	    
	}
    });
}


var mmTIN={};
function dirRefresh(){
    var node1=arguments[0];
    var myTree=arguments[1];
    var myFunc=arguments[2];
    var dir=node1.id.replace('browseDirectoriesList','').replace(/__/g,'/');
    var hasValue=false;
    for(var i in mmTIN)
	if(i==node1.id)
	    hasValue=true;
    if(!hasValue){
	mmTIN[node1.id]={text: node1.text};
	myTree.tree('update',{target: node1.target,text: mmTIN[node1.id]['text']+" (updating...)"});
	$.ajax({
	    type: "GET",
	    url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=datastores.directories.displayJson&DataInputs=dir="+dir+"&RawDataOutput=Result",
	    complete: function(xml,status) {
	  	var myData="None";
		try{
		    myData=eval("("+xml.responseText+")");
		}catch(e){alert(e);}
		if(myFunc)
		    myFunc(myData,node1);
		myTree.tree('append',{parent: node1.target,data: myData});
		myTree.tree('update',{target: node1.target,text: mmTIN[node1.id]["text"]});
		myTree.tree('toggle',node1.target);
		myTree.tree('toggle',node1.target);
	    }
	});
    }
}
