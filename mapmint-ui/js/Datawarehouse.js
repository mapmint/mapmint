Datawarehouse=MLayout.extend({
  id: 0,
  cnt: 0,
  dataTypes: [],
  args: [],
  postgisListRefresh: function(){
	$.ajax({
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=type="+arguments[0]+"&RawDataOutput=Result",
		dataType: "xml",	
		complete: function(xml,status) {
			$('#progress_bar .ui-progress').css('width', '65%');
			if($mj("postgisListing"))
				$mj("postgisListing").parentNode.removeChild($mj("postgisListing"));
			$('#postgisList').append(xml.responseText);
			cLayout.refresh();
			$('#progress_bar .ui-progress').animateProgress(100, function() {
				$('#progress_bar .ui-progress').fadeOut(1000);
			});
		}
	});
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
  DatasourcePostGISCommit: function(){
	if (arguments[0]=='cancel'){
		confirm('Delete ' + $('.trSelected',grid).length + ' items?')
	}
	else if (arguments[0]=='add'){
		$.ajax({
			type: "GET",
			url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=save&DataInputs=name="+$mj("Datawarehouse.pgisform.name").value+";dbname="+$mj("Datawarehouse.pgisform.dbname").value+";user="+$mj("Datawarehouse.pgisform.user").value+";password="+$mj("Datawarehouse.pgisform.password").value+";host="+$mj("Datawarehouse.pgisform.host").value+";port="+$mj("Datawarehouse.pgisform.port").value+";type="+$("input[type=radio][name=Datawarehouse.pgisform.type]:checked").attr('value')+"&RawDataOutput=Result",
			dataType: "xml",
			complete: function(xml,status) {
				Datawarehouse.postgisListRefresh("PostGIS");
			}
		});
		
	}			
  },
  DatasourceDirCommit: function(){
	if (arguments[0]=='cancel'){
		confirm('Delete ' + $('.trSelected',grid).length + ' items?')
	}
	else if (arguments[0]=='add'){
		$.ajax({
			type: "GET",
			url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=saveDir&DataInputs=name="+$mj("Datawarehouse.form.name").value+";path="+$mj("Datawarehouse.form.path").value+";type="+$("input[name=Datawarehouse.form.type]:checked")[0].value+"&RawDataOutput=Result",
			dataType: "xml",
			complete: function(xml,status) {
				Datawarehouse.directoriesListRefresh();
			}
		});
		
	}			
  },
  loadDir: function(){
	if(!Datawarehouse.references)
	  Datawarehouse.references=[];
       Datawarehouse.unloadDir(arguments[0]);
       for(var i=0;i<Datawarehouse.references.length;i++)
		if(arguments[0]==Datawarehouse.references[i])
			return;
       $.ajax({
		dwDataSource: arguments[0],
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=vector-tools&service=WPS&version=1.0.0&request=Execute&Identifier=mmExtractVectorInfo&DataInputs=dataSource="+arguments[0]+(arguments.length>1?";type="+arguments[1]:"")+"&RawDataOutput=Result",
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
		var localCnt=Datawarehouse.cnt;
		//Datawarehouse.references[Datawarehouse.cnt]=localTmp[localI];
       $.ajax({
		dwDataSource: this.dwDataSource,
		dwLayer: localTmp[localI],
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=vector-tools&service=WPS&version=1.0.0&request=Execute&Identifier=mmExtractVectorInfo&DataInputs=dataSource="+this.dwDataSource+";layer="+localTmp[localI]+"&RawDataOutput=Result",
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
			$('#datasources-container-id').append('<table id="flex'+(Datawarehouse.cnt)+'" style="display:none"></table>');
			Datawarehouse.references[Datawarehouse.cnt]=this.dwDataSource;
			$("#flex"+(Datawarehouse.cnt)).flexigrid({
				autoload: false,
				url: '/cgi-bin/zoo_loader.cgi',
				dataType: 'xml',
				colModel: colModel,
				usepager: (tmp.featureCount[0].Text>10?true:false),
				sortname: tmp.fields[0].field[0].id[0].Text,
				sortorder: "asc",
				fields: fields,
				dwDataSource: this.dwDataSource,
				dwLayer: this.dwLayer,
			      dwDataType: (tmp.geometry[0].Text=='Polygon'?'polygon':(tmp.geometry[0].Text=='Point'?'point':'line')),
				nbElements: tmp.featureCount[0].Text,
				title: this.dwDataSource+" / "+tmp.name[0].Text,
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
			Datawarehouse.cnt+=1;
			$('.flexigrid').addClass('hideBody');  
			}catch(e){alert("MM Error : "+e);}
		}
	});
	}
	}
	}
	);
	
  },
  unloadDir: function(){
	for(var i=0;i<Datawarehouse.references.length;i++){
		try{
			if(Datawarehouse.references[i]==arguments[0] && $mj('flex'+i)){
				$mj('flex'+i).style.display=($mj('flex'+i).style.display=='none'?'block':'none');//parentNode.removeChild($mj('flex'+i));
				//Datawarehouse.references[i]="";
			}
		}catch(e){alert("MM Error: "+e);}
	}
  },
  last_dir: null
});

Datawarehouse.define({
  loadDir: function(){
	Datawarehouse.last_dir=arguments[0];
	$.ajax({
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=dir="+Datawarehouse.last_dir+(arguments.length>1?";type="+arguments[1]:"")+"&RawDataOutput=Result",
		dataType: "xml",
		complete: function(xml,status) {
	      $('#progress_bar .ui-progress').css('width', '65%');
	      
	      alert('lastDir : '+Datawarehouse.last_dir);
	      var reg=/\//g;
	      var tmpId='#browseDirectoriesList'+Datawarehouse.last_dir.replace(reg,"_");
	      alert(tmpId);
	      $(tmpId).append('<h1>HeyHo</h1>');
	      alert(tmpId);
	      alert($('#browseDirectoriesList'+Datawarehouse.last_dir)+'\n'+xml.responseText);
	      if(Datawarehouse.last_dir=='/')
		$(tmpId).html('<ul id="browser4DirectoriesList'+Datawarehouse.last_dir.replace(reg,'_')+'" class="filetree treeview"  style="height: 185px;overflow:auto;"><li class="collapsable lastCollapsable"><div class="hitarea  expandable-hitarea" onclick=""></div>'+'<span class="folder">Directory '+Datawarehouse.last_dir+': </span>'+xml.responseText+'</li></ul>');
	      else
		$(tmpId).append(xml.responseText);
	      $('#progress_bar .ui-progress').css('width', '95%');
	      if(!Datawarehouse.browser4DirectoriesList)
		Datawarehouse.browser4DirectoriesList=$("#browser4DirectoriesList_").tree({
		  checkbox: true,
		  onClick:function(node){
		      alert(node.id.replace("browseDirectoriesList","").replace(/_/g,"/"));
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
		      layouts[1].loadDir(node.id.replace("browseDirectoriesList","").replace(/_/g,"/"));
		    },
		  onCheck: function(node,check){
		      if(check) 
			Datawarehouse.loadDir(node.id);
		      else 
			Datawarehouse.unloadDir(node.id);
		    }
		  });
	      /*$("#directoriesList/"+Datawarehouse.last_dir).tree({checkbox: true,
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

    Datawarehouse.dataTypes[0]={type: 'MySQL',loaded: false};
    Datawarehouse.dataTypes[1]={type: 'PostGIS',loaded: false};
    Datawarehouse.dataTypes[2]={type: 'dir',loaded: false};
	$.ajax({
		type: "GET",
		url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/postgis&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=type=MySQL&RawDataOutput=Result",
		dataType: "xml",	
		complete: function(xml,status) {
            Datawarehouse.dataTypes[0]['loaded']=true;
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
            Datawarehouse.dataTypes[1]['loaded']=true;
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
		url: "/cgi-bin/zoo_loader.cgi?metapath=datastores/directories&service=WPS&version=1.0.0&request=Execute&Identifier=list&DataInputs=&RawDataOutput=Result",
		dataType: "xml",	
		complete: function(xml,status) {
            Datawarehouse.dataTypes[2]['loaded']=true;
			$('#progress_bar .ui-progress').css('width', '65%');
			$('#mainDirectoriesList').append(xml.responseText);
			cLayout.refresh();
			$('#progress_bar .ui-progress').animateProgress(100, function() {
				$('#progress_bar .ui-progress').fadeOut(1000);
			});
		}
	});
        this.loadDir("/","default");  	
  	
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







		$(".dialog-postgis-new").dialog({
			autoOpen: false,
			height: 320,
			width: 320,
			resizable: false,
			buttons: {
				'Add': function() {
					Datawarehouse.DatasourcePostGISCommit('add');
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
		$('.test-pg-connection').button({
			text: false	
		}).click(function() {
		$( '.dialog-postgis-new').dialog("close");
		});
		
		$('.db').button({
			text: false	
		}).click(function() {
		$( '.dialog-postgis-new').dialog("open");
		});
		
		$(".dialog-directory-new").dialog({
			autoOpen: false,
			height: 400,
			width: 500,
			resizable: false,
			buttons: {
				'Add': function() {
					Datawarehouse.DatasourceDirCommit('add');
					$(this).dialog('close');
				},
				'Cancel': function() {
					Datawarehouse.DatasourceDirCommit('cacel');
					$(this).dialog('close');
				}
			}
		});
		
$('.dir').button({
			text: false	
		}).click(function() {
		$( '.dialog-directory-new').dialog("open");
		});
		

    
$(".dialog-add-vector").dialog({
			autoOpen: false,
			height: 180,
			width: 300,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
$('.add-layer-vector').button({
			text: false	
		}).click(function() {
		$( '.dialog-add-vector').dialog("open");
		});
		
$(".dialog-add-raster").dialog({
			autoOpen: false,
			height: 180,
			width: 300,
			resizable: false,
			buttons: {
				'Add': function() {
					$(this).dialog('close');
				},
				'Cancel': function() {
					$(this).dialog('close');
				}
			}
		});
		
$('.add-layer-raster').button({
			text: false	
		}).click(function() {
		$( '.dialog-add-raster').dialog("open");
		});
		
    },
  refresh: function(){
      //$("input:checkbox, input:radio, input:file").uniform();
  	  	$('.add-layer-vector, .add-layer-raster, .add-layer-wms, .add-layer-wfs, .add-layer-wcs').button({text: false});
      $('a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
      try{
      for(var i=0;i<Datawarehouse.dataTypes.length;i++)
        if(Datawarehouse.dataTypes[i].loaded==false)
            return -1;
	$("#browser").tree({
	    checkbox: true,
	    onClick:function(node){
	      //alert("hehe"+node.id);
	    },
	    onCheck:function(node, checked){
	      //alert(node.id+" "+checked);
	      reg=/browseDirectoriesList/;
	      if(checked)
		Datawarehouse.loadDir((node.id+'').replace(reg,""));
	      else
		Datawarehouse.unloadDir((node.id+'').replace(reg,""));
	    }
	  }
        );
	//$("#browser4DirectoriesList"+Datawarehouse.last_dir).tree();
      }catch(e){alert("Tree error"+e);}
	

    }
  });
