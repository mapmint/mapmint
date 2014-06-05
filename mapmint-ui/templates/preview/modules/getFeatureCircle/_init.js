	gfiControlCircle = new OpenLayers.Control();
	OpenLayers.Util.extend(gfiControlCircle, {
	  draw: function () {
	      // this Handler.Box will intercept the shift-mousedown
	      // before Control.MouseDefault gets to see it
	      this.box = new OpenLayers.Handler.RegularPolygon( gfiControlCircle, 
						     {"done": this.notice},
						     {sides: 40});
	      this.box.activate();
	    },
	      
	  notice: function (bounds) {
	  	  var gml = new OpenLayers.Format.GeoJSON; 
		  featureGML=gml.write(new OpenLayers.Feature.Vector(bounds.transform(mercator,wgs84)));
	      \$('#output-gfi').html("");

	      for(var i=0;i<queryLayersList.length;i++){
		if(queryLayersList[i].visibility){

		  req=WPSGetHeader("Intersection")+WPSGetInputs([{"name": "InputEntity1","value": featureGML,"mimeType": "application/json"},{"name": "InputEntity2", "xlink:href": msUrl+"?map="+mapPath+"/project_${conf["senv"]["last_map"]}.map&amp;SERVICE=WFS&amp;VERSION=1.0.0&amp;REQUEST=GetFeature&amp;typeName=ms:"+queryLayersList[i].local_id,"mimeType": "text/xml"}])+WPSGetOutput({"name": "Result","mimeType": "text/xml"})+WPSGetFooter();

		  var localI=i;
		\$.ajax({
		  localI: i,
		      type: "GET",
		      url: zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=mapfile.getInitialInfo&DataInputs=map="+lastMap+";layer="+queryLayersList[i].real_name+"&RawDataOutput=Result",
		      dataType: 'xml',
		      complete:function(xml,status){
		      var tmp=\$(xml.responseXML).find("ows\\:ExceptionText").text();
		      if(tmp!=""){
			alert(tmp);
			return;
		      }
		      
		      colModel=[];
		      fields=[];
		      var localI=this.localI;

		      if(queryLayersList[this.localI].displayed_fields=="all"){
			var nbCol=0;
			\$(xml.responseXML).find("field").each(function(){
			    \$(this).find("id").each(function(){
				colModel[nbCol]={display: \$(this).text(), name : \$(this).text(), width: (nbCol==0?80:120), sortable : true, align: 'center'};
				fields[nbCol]=\$(this).text();
				nbCol++;
			      });
			  }); 
		      }else{
			var tmp=queryLayersList[this.localI].displayed_fields.split(',');
			var tmp1=queryLayersList[this.localI].displayed_fields_width.split(',');
			var tmp2=queryLayersList[this.localI].displayed_fields_aliases.split(',');
			var nbCol=0;
			\$(xml.responseXML).find("field").each(function(){
			    \$(this).find("id").each(function(){
				for(var j=0;j<tmp.length;j++)
				  if(tmp[j]==\$(this).text()){
				    colModel[nbCol]={display: (tmp2[j]&&tmp2[j]!="all"?tmp2[j]:\$(this).text()), name : \$(this).text(), width: (tmp1[j]?tmp1[j]:120), sortable : false, align: 'center'};
				    fields[nbCol]=\$(this).text();		
				    nbCol++;
				  }
			      });
			  });
		      }

		      \$('#output-gfi').append('<table id="flex'+localI+'" style="display:none"></table>');

		      try{
			var tmpName="#flex"+localI;
			\$("#flex"+localI).flexigrid({
			  autoload: true,
			      url: msUrl,
			      ogcProtocol: "WFS",
			      ogcUrl: zooUrl,
			      autozoom: false,
			      dataType: 'xml',
			      contentType: 'text/xml',
			      colModel: colModel,
			      usepager: false,
			      ltoolbar: true,
			      id: localI,
			      fields: fields,
			      sortname: fields[0],
			      method: "post",
			      sortorder: "asc",
			      dwDataSource: pmapfiles[queryLayersList[localI].real_name][0],
			      dwLayer: queryLayersList[localI].real_name,
#if $m.web.metadata.get("mmVT")
#set vt=$m.web.metadata.get("mmVT").split(',')
#set nb=len($vt)+1
#set cnt=1
			      mmVectorOps: (vtLayers[queryLayersList[this.localI].real_name]?[
#if $vt.count("buffer")>0
			      		   {"process": "BufferPy","class":"buffer","lib":"Buffer","hasText":true,"unit": "#if $m.web.metadata.get('tuom')=="metric"#m#else##if $m.web.metadata.get('tuom')=="geographic"#°#else#foot#end if##end if#"}#if $cnt <$nb#,#end if#
#set cnt=$cnt+1
#end if
#if $vt.count("spatial-buffer")
#set cnt=$cnt+1
			      		   {"process": "BufferMask","class":"spatial-buffer","lib":"Mask"#if $vt.count("buffer")==0#,"hasText":true,"unit": "#if $m.web.metadata.get('tuom')=="metric"#m#else##if $m.web.metadata.get('tuom')=="geographic"#°#else#foot#end if##end if##end if#}#if $cnt<$nb#,#end if#
#end if
#if $vt.count("centroid")
#set cnt=$cnt+1
			      		   {"process": "CentroidPy","class":"centroid","lib":"Centroid"}#if $cnt <$nb#,#end if#
#end if
#if $vt.count("boundary")
#set cnt=$cnt+1
			      		   {"process": "BoundaryPy","class":"boundary","lib":"Boundary"}#if $cnt<$nb#,#end if#
#end if
#if $vt.count("convexhull")
#set cnt=$cnt+1
			      		   {"process": "ConvexHullPy","class":"convexhull","lib":"ConvexHull"}#if $cnt<$nb#,#end if#
#end if
#if $vt.count("spatial-query")
#set cnt=$cnt+1
#set lq=[]
#for ll in range($m.numlayers)
#set lll=$m.getLayer($ll)
#if $lll.metadata.get("mmSpatialQueryType")!="none"
#if $lll.metadata.get("mmSpatialQueryType")=="contained" or $lll.metadata.get("mmSpatialQueryType")=="both"
#set $lq+=[$ll]
#end if
#end if
#end for
#set l=0
#if len($lq)>0
			      		   ,(svtLayers[queryLayersList[this.localI].real_name]?{"process": "SpatialQuery","class":"spatial-query","lib":"SpatialQuery","hasChoice":[{
#for i in $lq
"value":"$m.getLayer($i).name","text":"#if $m.getLayer($i).metadata.get("ows_title")==""#$m.getLayer($i).name#else#$m.getLayer($i).metadata.get("ows_title")#end if#"
#if $l+1<len($lq)
,
#end if
#set l=$l+1
#end for
}]}:null)
#if cnt<$nb#,#end if#
#end if
#end if
			      ]:null),
#end if
			      title: queryLayersList[localI].name,
			      useLimit: false,
			      noSelection: false,
			      showTableToggleBtn: true,
			      width: "100%",
			      height: 290,
			      onHide: function(hidden) {
			      finalLayers[(this.id*4)].setVisibility(!hidden);
			      finalLayers[(this.id*4)+1].setVisibility(!hidden);
			      finalLayers[(this.id*4)+2].setVisibility(!hidden);
			      finalLayers[(this.id*4)+3].setVisibility(!hidden);
			    },
			      pparams: req,
			      tableToggleBtns: [{name: 'zoomToSetExtent',title: 'Zoom to set extent', onclick: function(){
				  map.zoomToExtent(finalLayers[(this.id.replace(/zoomToSetExtent_/,"")*4)].getDataExtent());
			     }}]

			    });
			
		      }catch(e){alert(e);}
		      \$('.dialog-gfi').window({
			width: 625,
			    height: 400,
			    maximizable:false,
			    resizable: false,
			    onClose: function(){
			    for(var i=0;i<finalLayers.length;i++){
			      try{
			      finalLayers[i].removeFeatures(finalLayers[i].features);
			      }catch(e){}
			    }
			      processResultLayer.removeFeatures(processResultLayer.features);
			  }
			});
		    }
		  });
		}
	      System.flexi_cnt++;
	      }

	    }
	  });
