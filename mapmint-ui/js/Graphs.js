function refreshGraphFields(){
    var prefix="";
    var vars="";
    if(arguments.length>0){
	prefix=arguments[0];
	vars=";tid="+$("#p_tname").val();
    }
    if($("#graphs_steps").is(":visible") && $("#graphs_step").val()>0)
	vars+=";step="+($("#graphs_step")[0].selectedIndex-1);
    var tableName_G="indicateurs";
    tableNameG=prefix+"graphs";
    $("#graphs_id").val("");
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table="+tableName_G+";id="+System.nodeId+vars+";tab=graph&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		try{
		    try{
			if(System.refreshSteps)
			    addSteps(tableNameG+"_step");
			System.refreshSteps=true;
		    }catch(e){}
		    var data=$.parseJSON(xml.responseText);
		    for(var i in data){
			    if(!$.isArray(data[i])){
				if(i=="name")
				    $("#"+tableNameG+"_"+i+"_title").html(data[i]);
				if(data[i]!=null){
				    if(i!="step")
					$("#"+tableNameG+"_"+i).val(data[i]);
				    else
					$("#"+tableNameG+"_"+i+" > option")[data[i]+1].selected=true;
				}
				else{
				    if($("#"+tableNameG+"_"+i).length>0 && $("#"+tableNameG+"_"+i)[0].selectedIndex)
					$("#"+tableNameG+"_"+i).val(-1);
				    else
					$("#"+tableNameG+"_"+i).val("");
				}
			    }else{
				$("#"+tableNameG+"_"+i+" option:selected").removeAttr("selected");
				if(data[i].length)
				    for(var j=0;j<data[i].length;j++)
					$("#"+tableNameG+"_"+i+' option[value="'+data[i][j]+'"]').attr("selected", "selected");
				else
				    $('#'+tableNameG+'_'+i+' option[value="-1"]').attr("selected", "selected");
			    }
		    }
		}catch(e){alert("Error : "+e);}
		try{
		    $(".toolbar2").find("a.chart").each(function(){
			$(this).removeClass("desactivated");
		    });
		    $("#"+prefix+"chart").find(".loader-container").each(function(){
			$(this).hide();
		    });

		}catch(e){}

		if(System.doOnGraphLoad){
		    System.doOnGraphLoad();
		    System.doOnGraphLoad=null;
		}
		System.refreshSteps=true;
	    }
	}
    });
}

function refreshGraph(){
    if(!System.limit)
	System.limit=0;
    var res=System.ffeatures;
    if(res && res.featureMember) 
	if(!res.featureMember.length)
	    res.featureMember=[res.featureMember];
    filter="<Filter><OR>"
    if(res && res.featureMember){
	for(var j=0;j<res.featureMember.length;j++){
	    var feature=res.featureMember[j];
	    filter+="<PropertyIsLike wildcard='*' singleChar='.' escape='!'><PropertyName>"+System.full_index["indicateurs_territoires_key"]+"</PropertyName><Literal>"+feature[System.full_index["indicateurs_territoires_key"]]+"</Literal></PropertyIsLike>"
	}
    }
    filter+="</OR></Filter>";

    var node=(arguments.length==0 || arguments[0]=="agregate_"?$("#ltree").tree("getSelected"):{id:arguments[0]});
    System.nodeId=node.id;
    System.prefix="";
    var tblName="indexes.view_idx"+node.id
    System.doOnGraphLoad=function(){
	var suffix="";
	if($("#graphs_steps").is(":visible") && $("#graphs_step").val()>0)
	    suffix="_step"+($("#graphs_step")[0].selectedIndex-1);
	url=System.mapUrl+"?map="+(System.nodeId?System.dataPath+"/indexes_maps/project_"+(System.prefix!=""?"A"+$("#p_tname").val()+"_":"")+"GIndex"+System.nodeId+suffix+".map":System.indexMap)+"&service=WFS&version=1.0.0&request=GetFeature&typename="+tblName+"&PropertyName="+$("#"+System.prefix+"graphs_vx").val()+","+$("#graphs_vy").val()+"&maxfeatures="+(15+System.limit);
	data=null;
	method="GET";
	if(System.cUrl!=null){
	    url=System.mapUrl+"?map="+(System.nodeId?System.dataPath+"/indexes_maps/project_"+(System.prefix!=""?"A"+$("#p_tname").val()+"_":"")+"GIndex"+System.nodeId+suffix+".map":System.indexMap)
	    method="POST";
	    data='<wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:wfs="http://www.opengis.net/wfs" maxFeatures="'+(15+System.limit)+'" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-basic.xsd"><wfs:Query typeName="'+tblName+'"><wfs:PropertyName>'+$("#"+System.prefix+"graphs_vx").val()+'</wfs:PropertyName><wfs:PropertyName>'+$("#"+System.prefix+"graphs_vy").val()+'</wfs:PropertyName>'+filter+'</wfs:Query></wfs:GetFeature>';
	    System.graph_request=url;
	}else
	    System.graph_request=url.replace(/&/g,"&amp;");
	System.graph_data=data;
	System.graph_method=method;
	$.ajax({
	    type: method,
	    url: url,
	    dataType: 'xml',
	    data: data,
	    contentType: 'text/xml',
	    complete: function(xml,status) {
		if(this.type=="POST")
		    System.ffeatures=$.xml2json(xml.responseText);
		gml=new OpenLayers.Format.GML();
		var o=gml.read(xml.responseText);
		var values=new Array();
		var categories=new Array();
		var pseries=new Array();
		for(i in o)
		    if(o[i].data[$("#graphs_vy").val()]){
			/*alert(i);
			  alert(o[i].data[$("#g_f_x").val()]);*/
			//alert(o[i].data[$("#g_f_y").val()]);
			values.push(eval(o[i].data[$("#graphs_vy").val()]));
			categories.push(o[i].data[$("#"+System.prefix+"graphs_vx").val()]);
			pseries.push({"name": o[i].data[$("#"+System.prefix+"graphs_vx").val()],"y":eval(o[i].data[$("#graphs_vy").val()])});
		    }
		if($("#graphs_f_type").val()=="hist")
		    $(function () {
			var chart;
			$(document).ready(function() {
			    chart = new Highcharts.Chart({
				chart: {
				    renderTo: System.prefix+'graphDisplay',
				    type: 'column',
				    width:500,
				    height:350,
				    margin: [5, 20, 40, 25],
				    borderRadius: 0,
				    backgroundColor:'#efedcc'
				},
				credits: {
            			    enabled: false
        			},
				colors: [
   				    '#72ba37', 
   				    '#AA4643', 
   				    '#89A54E', 
   				    '#80699B', 
   				    '#3D96AE', 
   				    '#DB843D', 
   				    '#92A8CD', 
   				    '#A47D7C', 
   				    '#B5CA92'
				],
				title: {
				    text: $("#graphs_title").val()
				},
				xAxis: {
				    categories: categories,
				    title: {
					text: $("#"+System.prefix+"graphs_lx").val()
				    },
				    labels: {
					rotation: -45,
					align: 'right',
					style: {
					    fontSize: '12px',
					    fontFamily: 'Arial, sans-serif'
					}
				    }
				},
				yAxis: {
				    min: 0,
				    title: {
					text: $("#graphs_ly").val()
				    }
				},
				legend: {
				    enabled: false
				},
				tooltip: {
				    formatter: function() {
					if($("#graphs_tooltip").val()=="")
					    return '<b>'+ this.x +'</b><br/>'+
					    ' '+ Highcharts.numberFormat(this.y, 1) +
					    ' ';
					try{
					    return eval($("#graphs_tooltip").val());
					}catch(e){
					    return '<b>'+ this.x +'</b><br/>'+
						' '+ Highcharts.numberFormat(this.y, 1) +
						' ';
					}
				    }
				},
				series: [{
				    name: 'Value',
				    pointWidth: 25,
				    data: values,
				    dataLabels: {
					enabled: true,
					rotation: -90,
					color: '#FFFFFF',
					align: 'right',
					x: 0,
					y: 10,
					formatter: function() {
					    return this.y;
					},
				
					style: {
					    fontSize: '10px',
					    fontFamily: 'Verdana, sans-serif',
					pointWidth: 30}
				    }
				}]
			    });
			});
			
		    });
		else
		    $(function () {
			var chart;
			$(document).ready(function() {
			    chart = new Highcharts.Chart({
				chart: {
		      		    renderTo: System.prefix+'graphDisplay',
				    plotBackgroundColor: null,
				    plotBorderWidth: null,
				    plotShadow: false,
				    borderRadius: 0,
				    backgroundColor:'#efedcc',
				    width:500,
                                    height:350
				},
				title: {
				    text: $("#graphs_title").val()
				},
                                credits: {
                                    enabled: false
                                },
				tooltip: {
				    pointFormat: '{series.name}: <b>{point.percentage}%</b>',
				    percentageDecimals: 1
				},
				plotOptions: {
				    pie: {
					allowPointSelect: true,
					cursor: 'pointer',
					dataLabels: {
					    enabled: true,
					    color: '#707070',
					    connectorColor: '#a2a2a2',
					    formatter: function() {
						return '<b>'+ this.point.name +'</b>: '+ this.percentage +' %';
					    }
					}
				    }
				},
				series: [{
				    type: 'pie',
				    name: $("#graphs_ly").val(),
				    data: pseries
				}]
			    });
			});
			
		    });
		
	    }
	});
    }

    try{
	if(arguments[0]=="agregate_"){
	    System.prefix="agregate_";
	    tblName="indexes.agregate_t"+$("#p_tname").val()+"_idx_"+node.id
	    insertGraph(arguments[0]);
	}else{
	    if(arguments.length>0)
		insertGraph(arguments[0]);
	    else
		insertGraph();
	}
    }catch(e){
	// in case insertGraph is not defined (not in admin interface)
	System.doOnGraphLoad();
    }
}
