function loadFormWithObject(form,fields,object){
  var dbParams=fields;
  if(!object){
    for(var t=0;t<dbParams[t];t++){
      if($mj(form+"."+dbParams[t])){
	if(t!="stype")
	  $mj(form+"."+dbParams[t]).value="";
	else
	  try{$mj(form+"."+dbParams[t]).selectedIndex=-1;}catch(e){}
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

MapMintDBManager=Class.create({

  initializeAddWindow: function(){
      var dsType=arguments[0];
      var dsName=arguments[1];
      if(!Distiller.windows["add-database-dialog"]){
	$.ajax({
	  type: "GET",
	  url: "/cgi-bin/zoo_loader.cgi?metapath=template&service=WPS&version=1.0.0&request=Execute&Identifier=display&DataInputs=tmpl=Distiller_db_display&RawDataOutput=Result",
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
		    url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
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
	    url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
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
	  url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=save&DataInputs=name="+$mj("Distiller.pgisform.name").value+";dbname="+$mj("Distiller.pgisform.dbname").value+";user="+$mj("Distiller.pgisform.user").value+";password="+$mj("Distiller.pgisform.password").value+";host="+$mj("Distiller.pgisform.host").value+";port="+$mj("Distiller.pgisform.port").value+";type="+$mj("Distiller.pgisform.stype").value,
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
	url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=displayJson&DataInputs=type="+arguments[0]+"&RawDataOutput=Result",
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
	url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=test&DataInputs=name="+$mj("Distiller.pgisform.name").value+";dbname="+$mj("Distiller.pgisform.dbname").value+";user="+$mj("Distiller.pgisform.user").value+";password="+$mj("Distiller.pgisform.password").value+";host="+$mj("Distiller.pgisform.host").value+";port="+$mj("Distiller.pgisform.port").value+";type="+$mj("Distiller.pgisform.stype").value,
	dataType: "text",
	complete: function(xml,status) {
	    var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
	    if(tmp!="")
	      $.notifyBar({ cls: "error", html: tmp });
	    else
	      $.notifyBar({ cls: "success", html: $(xml.responseXML).find("wps\\:LiteralData").text() });
	  }
      });
    },

  remove: function(){
	$.ajax({
	  type: "GET",
	  url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=delete&DataInputs=name="+$mj("Distiller.pgisrform.name").value+";type="+$mj("Distiller.pgisrform.stype").value,
	  dataType: "text",
	  complete: function(xml,status) {
	      var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
	      if(tmp!="")
		$.notifyBar({ cls: "error", html: tmp });
	      else
		$.notifyBar({ cls: "success", html: $(xml.responseXML).find("wps\\:LiteralData").text() });
	      $( "#delete-database-dialog" ).window('close');
	      MapMintDBManager.refresh($mj("Distiller.pgisrform.stype").value);
	    }
	});
    },

  initializeRemoveWindow: function(){
      var dsType=$('#browser_selected_type')[0].value.replace(/List/,"");
      var dsName=$('#browser_selected_dsName')[0].value.replace(/browseDirectoriesList/,"");
      if(dsType=="postgis" || dsType=="mysql"){
	dsType=(dsType=="mysql"?"MySQL":"PostGIS");
	Distiller.loadDbFormValues(null);
      }
      if(!Distiller.windows["delete-database-dialog"]){
	$.ajax({
	  type: "GET",
	  url: "/cgi-bin/zoo_loader.cgi?metapath=template&service=WPS&version=1.0.0&request=Execute&Identifier=display&DataInputs=tmpl=Distiller_db_remove&RawDataOutput=Result",
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
		  url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
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
	  url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=load&DataInputs=type="+dsType+";name="+dsName+"&RawDataOutput=Result",
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

Distiller=MLayout.extend({
  id: 0,
  cnt: 0,
  dataTypes: [],
  args: [],
  windows: [],
  initializeDirWindow: function(){
      var localThis=arguments[0];
      if(!Distiller.windows["dialog-directory-new"]){
	$.ajax({
	  type: "GET",
	  url: "/cgi-bin/zoo_loader.cgi?metapath=template&service=WPS&version=1.0.0&request=Execute&Identifier=display&DataInputs=tmpl=Datastore_dirs_display&RawDataOutput=Result",
	  dataType: "text",
	  complete: function(xml,status) {
	      try{
		$( 'body').append(xml.responseText);
		if(!Distiller.windows)
		  Distiller.windows={};
		if(!Distiller.windows["dialog-directory-new"]){
		  Distiller.windows["dialog-directory-new"]=true;
		  $(".dialog-directory-new").dialog({
		    autoOpen: false,
		    height: 400,
		    width: 500,
		    resizable: false
		  });
		 }
		localThis.loadDir("/","default");
		$( '.dialog-directory-new').dialog("open");
	      }catch(e){alert(e);}
    }
	  });
      }else{
	$( '.dialog-directory-new').dialog("open");
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
      else
	Distiller.initializeDirWindow();
  },
  directoriesListRefresh: function(){
	$.ajax({
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=&RawDataOutput=Result",
		dataType: "xml",	
		complete: function(xml,status) {
			$('#progress_bar .ui-progress').css('width', '65%');
			if($mj("directoriesListing"))
				$mj("directoriesListing").parentNode.removeChild($mj("directoriesListing"));
			$('#mainDirectoriesList').append(xml.responseText);
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
		$.ajax({
			type: "GET",
			url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=saveDir&DataInputs=name="+$mj("Distiller.form.name").value+";path="+$mj("Distiller.form.path").value+";type="+$("input[name=Distiller.form.type]:checked")[0].value+"&RawDataOutput=Result",
			dataType: "xml",
			complete: function(xml,status) {
				Distiller.directoriesListRefresh();
			}
		});
		
	}			
  },
  loadDir: function(){
      if(!Distiller.references)
	Distiller.references=[];
      Distiller.unloadDir(arguments[0]);
      for(var i=0;i<Distiller.references.length;i++)
	if(arguments[0]==Distiller.references[i])
	  return;
      $.ajax({
	dwDataSource: arguments[0],
	type: "GET",
	url: "/cgi-bin/zoo_loader.cgi?metapath=vector-tools&service=WPS&version=1.0.0&request=Execute&Identifier=mmExtractVectorInfo&DataInputs=dataSource="+arguments[0].replace(/__/g,"/")+(arguments.length>1?";type="+arguments[1]:"")+"&RawDataOutput=Result",
	dataType: 'xml',
	complete: function(xml,status){
	    try{
	      var tmp=$.xmlToJSON(xml.responseXML);
	      var localTmp=[];
	      var tt="";
	      for(var i=0;i<tmp.name.length;i++){
		localTmp[i]=tmp.name[i].Text;
		tt+=i+" = "+localTmp[i]+"\n";
	      }
	    }catch(e){alert("MM Error : "+e);}
	    var localCnt;
	    if(localTmp)
	      for(var localI=0;localI<localTmp.length;localI++){
		var localTmp1=localTmp[localI];
		var localCnt=Distiller.cnt;
		//Distiller.references[Distiller.cnt]=localTmp[localI];
		$.ajax({
		  dwDataSource: this.dwDataSource,
		  dwLayer: localTmp[localI],
		  type: "GET",
		  url: "/cgi-bin/zoo_loader.cgi?metapath=vector-tools&service=WPS&version=1.0.0&request=Execute&Identifier=mmExtractVectorInfo&DataInputs=dataSource="+this.dwDataSource.replace(/__/g,"/")+";layer="+localTmp[localI]+"&RawDataOutput=Result",
		  dataType: 'xml',
		  complete: function(xml,status) {
		  colModel=[];
		  fields=[];
		  try{
		    var tmp=$.xmlToJSON(xml.responseXML);
		    var nbCol=0;
		    for(i=0;i<tmp.fields.length;i++){
		      for(j=0;j<tmp.fields[i].field.length;j++){
			colModel[nbCol]={display: tmp.fields[i].field[j].id[0].Text, name : tmp.fields[i].field[j].id[0].Text, width: (nbCol==0?80:120), sortable : true, align: 'center'};
			fields[nbCol]=tmp.fields[i].field[j].id[0].Text;		
			nbCol++;
		      }
		    }
		    $('#datasources-container-id').append('<table id="flex'+(Distiller.cnt)+'" style="display:none"></table>');
		    Distiller.references[Distiller.cnt]=this.dwDataSource.replace(/__/g,"/");
		    $("#flex"+(Distiller.cnt)).flexigrid({
		      autoload: false,
		      url: '/cgi-bin/zoo_loader.cgi',
		      dataType: 'xml',
		      colModel: colModel,
		      usepager: (tmp.featureCount[0].Text>10?true:false),
		      sortname: tmp.fields[0].field[0].id[0].Text,
		      sortorder: "asc",
		      fields: fields,
		      dwDataSource: this.dwDataSource.replace(/__/g,"/"),
		      dwLayer: this.dwLayer,
		      dwDataType: (tmp.geometry[0].Text=='Polygon'?'polygon':(tmp.geometry[0].Text=='Point'?'point':'line')),
		      nbElements: tmp.featureCount[0].Text,
		      title: this.dwDataSource.replace(/__/g,"/")+" / "+tmp.name[0].Text.replace(/__/g,"/"),
		      useLimit: true,
		      limit: 10,
		      showTableToggleBtn: true,
		      tableToggleBtns: 
			[
			 {title: "Delete",name: 'delete'},
			 {name: 'open-in-manager', title: "Open in Manager"},
			 {name: 'download',title: 'Download'},
			 {name: 'preview',title: 'Preview'},
			 {name: 'reproject',title: 'Change projection',content: '<a href="#" class="change-srs">EPSG:4326</a>'},
			 {name: 'convert', title: 'Change format', content: '<a href="#" class="change-format">SHP</a>',onclick: function () {
			     alert('ok');			       
			     $( "#change-format-dialog" ).window({
			       minimizable:false,
			       maximizable:false,
			       resizable: false
			     })}}
		        ],
		      width: "100%",
		      height: 290 
		    });
		    Distiller.cnt+=1;
		    System.flexi_cnt=Distiller.cnt;
		    $('.flexigrid').addClass('hideBody');  
		  }catch(e){alert("MM Error : "+e);}
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
	    //Distiller.references[i]="";
	  }
	}catch(e){alert("MM Error: "+e);}
	}
  },
  last_dir: null
});

Distiller.define({
  loadDir: function(){
	Distiller.last_dir=arguments[0];
	$.ajax({
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=dir="+Distiller.last_dir+(arguments.length>1?";type="+arguments[1]:"")+"&RawDataOutput=Result",
		dataType: "xml",
		complete: function(xml,status) {
	      $('#progress_bar .ui-progress').css('width', '65%');
	      
	      var reg=/\//g;
	      var tmpId='#browseDirectoriesList'+Distiller.last_dir.replace(reg,"_");
	      $(tmpId).append('<h1>HeyHo</h1>');

	      if(Distiller.last_dir=='/')
		$(tmpId).html('<ul id="browser4DirectoriesList'+Distiller.last_dir.replace(reg,'_')+'" class="filetree treeview"  style="height: 185px;overflow:auto;"><li class="collapsable lastCollapsable"><div class="hitarea  expandable-hitarea" onclick=""></div>'+'<span class="folder">Directory '+Distiller.last_dir+': </span>'+xml.responseText+'</li></ul>');
	      else
		$(tmpId).append(xml.responseText);
	      $('#progress_bar .ui-progress').css('width', '95%');
	      if(!Distiller.browser4DirectoriesList)
		Distiller.browser4DirectoriesList=$("#browser4DirectoriesList_").tree({
		  checkbox: true,
		  onClick:function(node){
		      //$("#"+node.id).append("<h1>HeyHo</h1>");
		      $("#browser4DirectoriesList_").tree('append',{parent: $('#browser4DirectoriesList_').tree('getSelected').target,
			    data:[
				  {  
				  "id": 13,
				    "text":"Raspberry"  
				  },{ 
				  "id": 14,
				    "text":"Cantaloupe"  
				  }
				  ]});
		      layouts[0].loadDir(node.id.replace("browseDirectoriesList","").replace(/_/g,"/"));
		    },
		  onCheck: function(node,check){
		      if(check) 
			Distiller.loadDir(node.id);
		      else 
			Distiller.unloadDir(node.id);
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
	});
    },

  initialize: function(){
      $(".addDB-toolbar dt a").click(function() {
	  $(".addDB-toolbar dd ul").show('slow');
	});
      
      $(".addDB-toolbar dd ul").mouseleave(function() {
	  $(".addDB-toolbar dd ul").hide('slow');
	});
      
      Distiller.dataTypes[0]={type: 'MySQL',loaded: false};
      Distiller.dataTypes[1]={type: 'PostGIS',loaded: false};
      Distiller.dataTypes[2]={type: 'dir',loaded: false};
      $.ajax({
	type: "GET",
	url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=type=MySQL&RawDataOutput=Result",
	dataType: "xml",	
	complete: function(xml,status) {
        Distiller.dataTypes[0]['loaded']=true;
	$('#progress_bar .ui-progress').css('width', '65%');
	$('#mysqlList').append(xml.responseText);
	cLayout.refresh();
	$('#progress_bar .ui-progress').animateProgress(100, function() {
	    $('#progress_bar .ui-progress').fadeOut(1000);
	  });
	  }
      });
      $.ajax({
	type: "GET",
	url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=type=PostGIS&RawDataOutput=Result",
	dataType: "xml",	
	complete: function(xml,status) {
	    Distiller.dataTypes[1]['loaded']=true;
	    $('#progress_bar .ui-progress').css('width', '65%');
	    $('#postgisList').append(xml.responseText);
	    cLayout.refresh();
	    $('#progress_bar .ui-progress').animateProgress(100, function() {
		$('#progress_bar .ui-progress').fadeOut(1000);
	      });
	  }
      });
      $.ajax({
	type: "GET",
	url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=state=open&RawDataOutput=Result",
	dataType: "xml",
	complete: function(xml,status) {
	    Distiller.dataTypes[2]['loaded']=true;
	    $('#progress_bar .ui-progress').css('width', '65%');
	    $('#mainDirectoriesList').append(xml.responseText);
	    cLayout.refresh();
	    $('#progress_bar .ui-progress').animateProgress(100, function() {
		$('#progress_bar .ui-progress').fadeOut(1000);
	      });
	  }
      });
      //this.loadDir("/","default");  	
  	
      function test(com,grid)
      {
	if (com=='Delete')
	  {
	    confirm('Delete ' + $('.trSelected',grid).length + ' items?')
	      }
	else if (com=='Add')
	  {
	    alert('Add New Item');
	  }			
      }
      
      $('b.top').click
	(
	 function ()
	 {
	   $(this).parent().toggleClass('fh');
	 }
	 );
      
      var localThis=this;
      $('.dir').button({
	text: false
	    }).click(function() {
		Distiller.initializeDirWindow(localThis);
		
	      });
      
      $('.db').button({
	text: false	
	    }).click(function() {
		MapMintDBManager.initializeAddWindow();
	      });
      
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
	      //alert(node.id+" "+checked);
	      reg=/browseDirectoriesList/;
	      if(checked)
		Distiller.loadDir((node.id+'').replace(reg,""));
	      else
		Distiller.unloadDir((node.id+'').replace(reg,""));
	    },
	    onContextMenu: function(e, node){
	      if($("#browser").tree('isLeaf',node.target)){
		e.preventDefault();
		var parentName=$("#browser").tree('getParent',node.target).id;
		$('#browser_selected_type')[0].value=parentName;
		$('#browser_selected_dsName')[0].value=node.id;
		$('#browser').tree('select', node.target);
		$('#browser_menu').menu('show', {
		  left: e.pageX,
		  top: e.pageY
		});
	      }
	    }
	  }
        );
	$("#browser4DirectoriesList"+Distiller.last_dir).tree();
      }catch(e){alert("Tree error"+e);}
	

    }
  });
