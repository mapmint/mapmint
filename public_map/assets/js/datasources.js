// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic'
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic) {
    

    var _x2js = new X2JS({
        arrayAccessFormPaths: [
            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
            'Capabilities.ServiceIdentification.Keywords'
        ],   
    });
    
    var zoo = new Zoo({
        url: module.config().url,
        delay: module.config().delay,
	language: module.config().language
    });

    function displayVector(data,param,dsid,datasource,location){
	console.log(data);
	//$("#DS_"+dsid+"_"+datasource).find(".panel-body").first().html('<div class="col-md-12"><table id="DS_table_'+dsid+'_'+datasource+'" ></table></div>');
	location.html('<div class="col-md-12"><table id="DS_table_'+dsid+'_'+datasource+'" ></table></div>');
	if(!data.datasource.fields.field.length)
	    data.datasource.fields.field=[data.datasource.fields.field];
	var lcolumns=[];
	for(var i in data.datasource.fields.field){
	    console.log(data.datasource.fields.field);
	    lcolumns.push({"data":data.datasource.fields.field[i].id,"name":data.datasource.fields.field[i].id,"title":data.datasource.fields.field[i].id});
	}

	var cnt=0;
	var ldata=data;
	$('#DS_table_'+dsid+'_'+datasource).DataTable( {
	    data: [],
	    "dom": 'Zlfrtip',
            "colResize": true,
	    "scrollY":  ($(window).height()/4)+"px",
	    "scrollCollapse": true,
	    "scrollX": true,
	    "sScrollX": "100%",
	    "sScrollXInner": "100%",
	    //"bAutoWidth": false,
	    "bProcessing": true,
	    "bServerSide": true,
	    fixedHeader: true,
	    //searching: true,
	    responsive: true,
	    deferRender: true,
	    rowId: "fid",
	    "sAjaxSource": "users",
	    select: {
		info: false,
	    },
	    "lengthMenu": [[10, 25, 50, 150], [10, 25, 50, 150]],
	    columns: lcolumns,
	    "fnServerData": function ( sSource, aoData, fnCallback, oSettings ) {
		console.log("Starting datatable download");
		console.log(aoData);


		var llimit=[];
		for(j in {"iDisplayStart":0,"iDisplayLength":0,"iSortCol_0":0,"sSortDir_0":0,"sSearch":0})
		    for(i in aoData)
			if(aoData[i].name==j){
			    if(llimit.length==4 && aoData[i].value!="")
				llimit.push(aoData[i].value);
			    if(llimit.length<4)
				llimit.push(aoData[i].value);
			}
		console.log(llimit);

		console.log(lcolumns);

		var opts=zoo.getRequest({
		    identifier: "vector-tools.mmExtractVectorInfo",
		    dataInputs: [
			{"identifier":"dataSource","value":param,"dataType":"string"},
			{"identifier":"layer","value":datasource,"dataType":"string"},
			{"identifier":"getFeatures","value":"true","dataType":"boolean"},
			{"identifier":"page","value":(llimit[0]/llimit[1])+1,"dataType":"integer"},
			{"identifier":"limit","value":llimit[1],"dataType":"integer"},
			{"identifier":"sortorder","value":llimit[3],"dataType":"string"},
			{"identifier":"sortname","value":(lcolumns[llimit[2]].data),"dataType":"string"},
		    ],
		    dataOutputs: [
			{"identifier":"Result","mimeType":"text/xml","type":"raw"}
		    ],
		    type: 'POST',
		    storeExecuteResponse: false
		});
		
		console.log(opts);
		opts["success"]=function() {
		    console.log(arguments);
		    var obj=_x2js.xml_str2json( arguments[2].responseText );

		    var data=[];
		    if(!obj.FeatureCollection.featureMember.length)
			obj.FeatureCollection.featureMember=[obj.FeatureCollection.featureMember];
		    for(var i in obj.FeatureCollection.featureMember){
			data.push(obj.FeatureCollection.featureMember[i]);
			data[data.length-1]["fid"]=dsid+"_"+datasource+"_"+(obj.FeatureCollection.featureMember[i][lcolumns[0].name].replace(/\./g,"__"));
		    }

		    var opts={
			"sEcho": cnt++, 
			"iDraw": cnt++, 
			"iTotalRecords": ldata.datasource.featureCount,
			"iTotalDisplayRecords": ldata.datasource.featureCount, 
			"aaData": (ldata.datasource.featureCount>0?data:[])
		    };
		    fnCallback(opts);

		    $('#DS_table_'+dsid+'_'+datasource).find(".selected").removeClass("selected");
		    
		    if(ldata.datasource.featureCount==0){
			$('#DS_table_'+dsid+'_'+datasource).DataTable().clear();
		    }


		};
		opts["error"]=function(){
		    notify('Execute failed:' +data.ExceptionReport.Exception.ExceptionText, 'danger');
		};
		oSettings.jqXHR = $.ajax( opts );
	    }
	});
    }

    var defaultColors=[
	"#ee0a38",
	"#169211",
	"#1415db",
	"#000000"
    ];
    function displayRaster(data,param,dsid,datasource,location,height){
	var Bands=[];
	if(data["datasource"]["Band"].length){
	    for(i in data["datasource"]["Band"])
		Bands.push({
		    name: "Band "+i,
		    color: defaultColors[i],
		    data: data["datasource"]["Band"]["histogram"].split(",")
		});
	}
	else
	    Bands.push({
		name: "Band 1",
		color: "#97b2a0",
		data: data["datasource"]["Band"]["histogram"].split(",")
	    });
	
	for(i in Bands)
	    for(j in Bands[i]["data"])
		Bands[i]["data"][j]=parseFloat(Bands[i]["data"][j]);
	
	//$("#DS_"+dsid+"_"+datasource).find(".panel-body").first().html('<div id="DS_table_'+dsid+'_'+datasource+'" class="col-md-12"></div>');
	location.html('<div id="DS_table_'+dsid+'_'+datasource+'" class="col-md-12"></div>');
	var chart = new Highcharts.Chart({
	    chart: {
		height: (height?height:500),
		zoomType: 'x',
		renderTo: 'DS_table_'+dsid+'_'+datasource
	    },
	    title: {
		text: "Raster Histogram"
	    },
	    xAxis: {
		labels: {
		    formatter: function(){
			var tmp=this.value+"";
			return tmp;
		    }
		},
		title: { text: 'Points' },
		maxZoom: 0
	    },
	    yAxis: {
		//max: mmax*2,
		title: { text: null },
		startOnTick: false,
		showFirstLabel: false
	    },
	    legend: {
		enabled: true
	    },
	    plotOptions: {
		area: {
		    cursor: 'pointer',
		    fillColor: {
			linearGradient: [0, 0, 0, 300],
			stops: [
			    [0, '#97b2a0'],
			    [1, 'rgba(255,255,255,0)']
			]
		    },
		    lineWidth: 1,
		    marker: {
			enabled: false,
			states: {
			    hover: {
				enabled: true,
				radius: 3
			    }
			}
		    },
		    shadow: false,
		    states: {
			hover: {
			    lineWidth: 1
			}
		    }
		}
	    },
	    tooltip: {
		formatter: function() {
		    return '<h1>'+this.x+': '+Highcharts.numberFormat(this.y, 0)+"</h1>";
		}
	    },
	    series: Bands
	});
	
    }

    // Return public methods
    return {
        displayRaster: displayRaster,
	displayVector: displayVector,
    };



});

