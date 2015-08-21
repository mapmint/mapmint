		    var _x2js = new X2JS();
		    var featureCount=0;
		    /*$.ajax({
			"type": "GET",
			"url": msUrl+"?map="+oLayers[key]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&propertyname="+columns[0].name+"&typename="+key,	
			"success": function(document,status,data){
			    var cnt=0;
			    console.log(data);
			    var obj=_x2js.xml_str2json( data.responseText );
			    console.log(obj);
			    featureCount=obj["FeatureCollection"]["featureMember"].length;
			    console.log("COUNT "+featureCount);*/
		    $('#mm_table-content').DataTable( {
			data: [],
			"fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
			    /*var params={};
			    console.log(aoData);
			    var myAoData=[];
			    for(i in aoData)
				if(aoData[i].name=="iDisplayLength"){
				    myAoData.push({name:"maxfeatures",value:aoData[i].value});
				    break;
				}
			    var hasProp=false;
			    if(!hasProp){
				for(i in aoData)
				    if(aoData[i].name=="sColumns"){
					myAoData.push({name:"propertyname",value:aoData[i].value});
					break;
				    }
			    }
			    console.log(hasProp);
			    for(i in aoData)
				if(aoData[i].name=="iSortCol_0"){
				    for(j in aoData)
					if(aoData[j].name=="sColumns"){
					    var tmp=aoData[j].value.split(",");
					    myAoData.push({name:"orderby",value: tmp[aoData[i].value]});
					}
				}*/
			    console.log(aoData);

			    oSettings.jqXHR = $.ajax( {
				"type": "GET",
				"url": sSource,
				"data": aoData,
				"success": function(document,status,data){
				    console.log(data);
				    var _x2js = new X2JS();
				    var obj=_x2js.xml_str2json( data.responseText );
				    console.log(obj);

				    var tuples=[];
				    for(i in obj["FeatureCollection"]["featureMember"]){
					var tuple=[];
					for(j in obj["FeatureCollection"]["featureMember"][i])
					    if(j[0]!="_"){
						for(k in obj["FeatureCollection"]["featureMember"][i][j]){
						    if(k[0]!="_" && k!="boundedBy" && k!="msGeometry"){ 
							tuple.push(obj["FeatureCollection"]["featureMember"][i][j][k]);
						    }						    
						}
					    }

					tuples.push(tuple);
				    }
				    console.log({
					"sEcho": cnt+1, 
					"iTotalRecords": featureCount, 
					"iTotalDisplayRecords": tuples.length,
					"aaData": tuples
				    });
				    return fnCallback({
					"sEcho": cnt++, 
					"iDraw": cnt++, 
					"iTotalRecords": featureCount, 
					"iTotalDisplayRecords": featureCount,//tuples.length,
					"aaData": tuples
				    });

				}
			    } );
			},
			"ajax": {
			    "url": msUrl+"?map="+oLayers[key]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&typename="+key,
			    "data": function ( d ) {
				console.log(d);
				var params={};
				d.maxfeatures=d.length;
				d.propertyname="";
				for(var i in d.columns){
				    d.propertyname+=d.columns[i]["name"]+",";
				}
				d.orderby=d.columns[d.order[0]["column"]]["name"];
				console.log(d);
				//d = params;
				// d.custom = $('#myInput').val();
				// etc
			    }
			},
			"dom": 'Zlfrtip',
			"colResize": {
			    "resizeCallback": function(column) {
				alert("Column Resized");
			    }
			},
			"processing": true,
			//"sAjaxSource": msUrl+"?map="+oLayers[key]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&typename="+key,
			"serverSide": true,
			colReorder: true,
			fixedHeader: true,
			searching: false,
			responsive: true,
			select: true,
			columns: columns
		    } );
			/*}
		    });*/





    var tableDisplay=0;
    var contextualMenu={
	"zoomTo": {
	    "run": function(layer){
		var key=getLayerById(layer);
		var transformer = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');
		var extent=ol.extent.applyTransform(oLayers[key]["extent"], transformer);
		map.getView().fit(extent,map.getSize());
	    }
	},
	"query": {
	    "run": function(layer){
		var key=getLayerById(layer);
		console.log(key);
		$("#table-wrapper").toggleClass("collapse");
		$("#table-wrapper").toggleClass("in");
		$("#table-wrapper").removeAttr("style");
		if(!$("#table-wrapper").hasClass("collapse")){
		    if(tableDisplay!=0)
			$("#mm_table-content").parent().remove();
		    tableDisplay++;
		    $("#table-wrapper-container").append('<table id="mm_table-content" class="display" width="100%"></table>');
		    $("#mmm_table-wrapper-header").append('<li role="presentation" class="active"><a href="#">Home</a></li>');
		    
		    var columns=[];
		    var properties="";
		    var order="";
		    var j=0;
		    for(var i in oLayers[key]["queryParams"]["fields"]){
			columns.push({ 
			    data: oLayers[key]["queryParams"]["fields"][i], 
			    name: oLayers[key]["queryParams"]["fields"][i], 
			    title: oLayers[key]["queryParams"]["aliases"][i] 
			});
			properties+=oLayers[key]["queryParams"]["fields"][i]+",";
			if(i==0)
			    order=oLayers[key]["queryParams"]["fields"][i];
			j++;
		    }
		    properties+="msGeometry";
		    var _x2js = new X2JS();
		    var featureCount=0;
		    var cnt=0;
		    $('#mm_table-content').DataTable( {
			data: [],
			"lengthMenu": [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
			"fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
			    console.log(aoData);

			    oSettings.jqXHR = $.ajax( {
				"type": "GET",
				"url": msUrl+"?map="+oLayers[key]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&typename="+key,
				"data": aoData,
				"success": function(document,status,data){
				    var _x2js = new X2JS();
				    var obj=_x2js.xml_str2json( data.responseText );

				    var tuples=[];
				    for(i in obj["FeatureCollection"]["featureMember"]){
					var tuple={};
					for(j in obj["FeatureCollection"]["featureMember"][i])
					    if(j[0]!="_"){
						for(k in obj["FeatureCollection"]["featureMember"][i][j]){
						    if(k[0]!="_" && k!="boundedBy" && k!="msGeometry"){ 
							tuple[k]=obj["FeatureCollection"]["featureMember"][i][j][k];
						    }						    
						}
					    }
					tuples.push(tuple);
				    }
				    return fnCallback({
					"sEcho": 1, 
					//"iDraw": cnt++, 
					"iTotalRecords": tuples.length, 
					"iTotalDisplayRecords": 10,
					"aaData": tuples
				    });

				}
			    } );
			},
			"ajax": msUrl+"?map="+oLayers[key]["map"]+"&version=1.0.0&service=WFS&request=GetFeature&typename="+key+"&propertyname="+properties,
			fixedHeader: true,
			searching: false,
			responsive: true,
			select: true,
			columns: columns
		    } );
		    $("#mm_table-content_length").addClass("hidden");
			/*}
		    });*/
		    console.log("COUNT "+featureCount);
		}
	    }
	}
    };



				continue;

				var locali=layer;
				//var layer=locali;
				console.log("DEBUG I:"+layer);
				window["Intersecto0_"+layer]=function(){
				    var format=new ol.format.WFS();
				    var lRequest=(format.writeGetFeature({
					featureTypes: [layer]/*,
					geometryName: "msGeometry",
					srsName: "EPSG:4326",
					/*propertyNames: lprop,*
					bbox: /*(localUrl.data.bbox?
						[
						localUrl.data.bbox[1],
					       localUrl.data.bbox[0],
					       localUrl.data.bbox[3],
					       localUrl.data.bbox[2]
					       ]
					       :[-180,-90,180,90]//)*/
				    }));
				    console.log(lRequest);
				    return lRequest.outerHTML.replace(/1.1.0/,"1.0.0");
				};
				(function(localId){
				    zoo.execute({
					identifier: "vector-tools.Intersection0",
					dataInputs: [
					    {
						"identifier": "InputEntity1",
						"value": sVal,
						"mimeType":"application/json"
					    },
					    {
						"identifier": "InputEntity2",
						"href": msUrl+"?map="+pmapfile,
						"method": "POST",
						"mimeType":"text/xml",
						"headers": [{"key": "Content-Type","value":"text/xml"}],
						"complexPayload_callback": "Intersecto0_"+layer
					    }
					],
					dataOutputs: [{"identifier":"Result","mimeType":"image/png"}],
					type: 'POST',
					storeExecuteResponse: false,
					success: function(data) {
					    myMMDataTableObject.display(localId,{
						lurl: data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"].split("&")[0]
					    },true);
					    
					    /*var format=new ol.format.GeoJSON();
					      {
					      if(oLayers[i]["queryParams"] && oLayers[i]["queryParams"]["fields"]){
					      console.log(i);
					      var key=i;
					      console.log(i);
					      }
					      }*/
					    //console.log(extent);
					    /*vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
					      selectedFeatures.push(feature);
					      info.push(feature.get('name'));
					      });
					      if (info.length > 0) {
					      infoBox.innerHTML = info.join(', ');
					      }*/
					
					    /*notify(aProcess+' service run successfully','success');
					    var GeoJSON = new OpenLayers.Format.GeoJSON();
					    var features = GeoJSON.read((data));
					    layer.removeFeatures(layer.features);
					    layer.addFeatures(features);*/
					},
					error: function(data) {
					    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
					}
				    });
				})(layer);
