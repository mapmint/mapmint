// Filename: login.js


define([
    'module', 'jquery', 'zoo','notify', 'metisMenu', 'summernote', 'xml2json','typeahead', 'adminBasic', 'ol','datasources','mmDataTables','rowReorder','colorpicker','slider',"sortable"
], function(module, $,Zoo,notify, metisMenu, summernote, X2JS,typeahead,adminBasic,ol,datasources,MMDataTable,rowReorder,colorpicker,slider,sortable) {
    

    (function(){
	var methods = ['addClass', 'removeClass'];
	
	$.each(methods, function (index, method) {
	    var originalMethod = $.fn[method];
	    
	    $.fn[method] = function () {
		var oldClass = this.className;
		var result = originalMethod.apply(this, arguments);
		var newClass = this.className;
		this.trigger(method, [oldClass, newClass]);	    
		return result;
	    };
	});
	
    })();

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

    var shouldInit=true;
    var size;
    var map,map0;
    var draw0,draw,draw1; // global so we can remove it later
    var features0,featureOverlay0;
    var features1,featureOverlay1;
    var vstyles,vstylesSelected;
    var oLayers={};
    var myBaseLayers=[];
    var myMMDataTableObject;
    var geotypeClasses=[
	"point",
	"line",
	"polygon",
	"raster"
    ];

    function loadMap(zoo,val){
	var inputs=[
	    {
		"identifier": "dso",
		"value": module.config().georef.dso,
		"dataType": "string"
	    },
	    {
		"identifier": "force",
		"value": "true",
		"dataType": "string"
	    },
	    {
		"identifier": "map",
		"value": val[0],
		"dataType": "string"
	    }
	];
	zoo.execute({
	    identifier: "georeferencer.saveGeorefProject",
	    type: "POST",
	    dataInputs: inputs,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		console.log("SUCCESS");
		console.log(data);
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		document.location.reload(false);
	    },
	    error: function(data){
		console.log("ERROR");
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    function gcpGesture(obj){
	if($("#"+obj.id).children().length)
	    $("#"+obj.id).html("");
	else{
	    zoo.execute({
		identifier: "template.display",
		type: "POST",
		dataInputs: [
		    {
			"identifier": "tmpl",
			"value": "Georeferencer/GCPForm_bs",
			"dataType": "string"
		    },
		    {
			"identifier": "type",
			"value": obj.kind,
			"dataType": "string"
		    },
		],
		dataOutputs: [
		    {"identifier":"Result","type":"raw"},
		],
		success: function(data){
		    $("#"+obj.id).html(data);
		},
		error: function(data){
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });
	}
    }

    var gcpInputs=[null,"imgx","imgy","mapx","mapy"];

    var InitialCallBacks={
	"save": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		gcpGesture({
		    "id": "gcpSave",
		    "kind": "save",
		});
	    });
	},
	"load": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		gcpGesture({
		    "id": "gcpLoad",
		    "kind": "load",
		});
	    });
	},
	"add": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		addInteraction();
	    });
	},
	"edit": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		if($("#gcp-editor").hasClass('in')){
		    $("#gcp-editor").collapse('hide');
		    return ;
		}
		if(!$(this).hasClass("disabled")){
		    var cnt=0;
		    $("#gcpTable").find("tr.selected").find('td').each(function(){
			if(gcpInputs[cnt]!=null)
			    $("#gcp-editor").find('input[name="'+gcpInputs[cnt]+'"]').val($(this).html());
			cnt+=1;
		    });
		    $("#gcp-editor").collapse('show');
		}
	    });
	},
	"delete": function(obj){
	    $(obj).off("click");
	    $(obj).click(function(e){
		$("#gcpTable").find("tr.selected").each(function(){
		    $(this).remove();
		    var id=parseInt($(this).attr('id').replace(/gcp_/,""));
		    console.log(id);
		    features0.removeAt(id);
		    features1.removeAt(id);

		});
	    });
	}
    };

    function createParam(obj){
	return {
	    "identifier": $(obj).attr("name"),
	    "value": $(obj).val(),
	    "dataType": "string"
	}
    }

    function setMapHeight(){
	var mpheight= $(window).height() - $('.navbar-header').height();
	$('#map,#manaLayerProperties,#manaMap').height(mpheight);
    }

    function boxSelection() {
	var hasDraw1=true;
	if(!draw1){
	    draw1 = new ol.interaction.DragBox({
		condition: ol.events.condition.always,
		style: new ol.style.Style({
		    stroke: new ol.style.Stroke({
			color: [0, 0, 255, 1]
		    })
		})
	    });
	    hasDraw1=false;
	}
	map.addInteraction(draw1);
	if(!hasDraw1){
	    draw1.on('boxstart', function(e) {
		$("#cropForm").addClass("hide");
		if(map.getLayers().getLength()>myBaseLayers.length+1)
		    map.getLayers().item(map.getLayers().getLength()-1).getSource().clear();
	    });
	    draw1.on('boxend', function(e) {
		$("#cropForm").removeClass("hide");
		var extent = draw1.getGeometry().getExtent();
		console.log(extent);
		var feature = new ol.Feature({
		    geometry: draw1.getGeometry().clone(),
		    name: 'My Area to Crop'
		});
		featureOverlay0 = new ol.layer.Vector({
		    visible: true,
		    source: new ol.source.Vector({features: [feature],projection:map.getView().getProjection()}),
		    style: new ol.style.Style({
			stroke: new ol.style.Stroke({
			    color: [0, 0, 255, 1]
			})
		    })
		});
		map.addLayer(featureOverlay0);
		map.removeInteraction(draw1);
	    });
	}
    }

    function addInteraction() {
	var hasDraw0=true;
	if(!draw0){
	    draw0 = new ol.interaction.Draw({
		features: features0,
		type: /** @type {ol.geom.GeometryType} */ ('Point'),
		style: vstyles
	    });
	    hasDraw0=false;
	}
	map0.addInteraction(draw0);
	if(!hasDraw0)
	    draw0.on('drawend',function(evt) {
		var coords=evt.feature.getGeometry().getCoordinates();
		reg=[
		    {
			"reg": new RegExp("\\[id\\]","g"),
			"value": features0.getLength()
		    },
		    {
			"reg": new RegExp("\\[ix\\]","g"),
			"value": coords[0]
		    },
		    {
			"reg": new RegExp("\\[iy\\]","g"),
			"value": (size[1]-coords[1])
		    },
		    {
			"reg": new RegExp("\\[mx\\]","g"),
			"value": 0
		    },
		    {
			"reg": new RegExp("\\[my\\]","g"),
			"value": 0
		    },
		];
		var template=$("#georeferencer_gcp_line_template")[0].innerHTML;
		for(var i=0;i<reg.length;i++){
		    template=template.replace(reg[i].reg,reg[i].value);
		}
		if(features0.getLength()==0)
		    $("#gcpTable").find("tbody").html(template);
		else
		    $("#gcpTable").find("tbody").append(template);
		$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
		map0.removeInteraction(draw0);
		var hasDraw=true;
		if(!draw){
		    draw = new ol.interaction.Draw({
			features: features1,
			type: /** @type {ol.geom.GeometryType} */ ('Point'),
			style: vstyles
		    });
		    hasDraw=false;
		}
		map.addInteraction(draw);
		if(!hasDraw)
		    draw.on('drawend',function(evt) {
			var coords1=ol.proj.transform(evt.feature.getGeometry().getCoordinates(),map.getView().getProjection(),'EPSG:4326');
			var cnt=0;
			var icnt=0;
			$("#gcpTable").find("#gcp_"+(features0.getLength()-1)).find("td").each(function(){
			    if(cnt>=3){
				$(this).html(coords1[icnt]);
				icnt++;
			    }
			    cnt+=1;
			});
			$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
			map.removeInteraction(draw);
		    });	    
	    });
    }
    
    var modifies=[null,null];
    var modifyId=null;
    function addEdition(id){
	modifyId=id;
	var hasModify=true;
	if(!modifies[0] || !modifies[1]){
	    modifies[0] = new ol.interaction.Modify({
		features: features0,
		// the SHIFT key must be pressed to delete vertices, so
		// that new vertices can be drawn at the same position
		// of existing vertices
		deleteCondition: function(event) {
		    return ol.events.condition.shiftKeyOnly(event) &&
			ol.events.condition.singleClick(event);
		}
	    });
	    modifies[1] = new ol.interaction.Modify({
		features: features1,
		// the SHIFT key must be pressed to delete vertices, so
		// that new vertices can be drawn at the same position
		// of existing vertices
		deleteCondition: function(event) {
		    return ol.events.condition.shiftKeyOnly(event) &&
			ol.events.condition.singleClick(event);
		}
	    });
	    hasModify=false
	}
	var maps=[map0,map];
	for(var i=0;i<modifies.length;i++)
	    maps[i].addInteraction(modifies[i]);
	if(!hasModify){
	    modifies[0].on('modifyend',function(evt) {
		var collection = evt.features;
		console.log('left part');
		movePoint(evt.features.item(modifyId),1,2);
	    });
	    modifies[1].on('modifyend',function(evt) {
		console.log(evt);
		console.log(arguments);
		console.log('right part');
		movePoint(evt.features.item(modifyId),3,4,true);
	    });
	}
    }

    function movePoint(feature,borneMin,borneMax,reprojection){
	var cnt=0;
	var coords=feature.getGeometry().getCoordinates();
	if(reprojection)
	    coords=ol.proj.transform(coords,'EPSG:3857','EPSG:4326');
	else
	    coords=[coords[0],(size[1]-coords[1])];
	$('#gcpTable tbody').find("tr.selected").find('td').each(function(){
	    if(cnt==borneMin)
		$(this).html(coords[0]);
	    if(cnt==borneMax)
		$(this).html(coords[1]);
	    cnt+=1;
	});
    }

    function stopEdition(){
	var maps=[map0,map];
	for(var i=0;i<modifies.length;i++)
	    maps[i].removeInteraction(modifies[i]);
    }

    var initialize=function(){

	$("#page-wrapper,#main").css({"padding":"0"});

	$('[data-toggle="tooltip"]').tooltip({container: 'body'});

	/*$('.mm-scale').click(function(){
	    var view = map.getView();
	    var coords = view.getCenter();
	    var resolution = view.getResolution();    
	    var projection = view.getProjection();
	    var resolutionAtCoords = projection.getPointResolution(resolution, coords);
	    $(this).parent().prev().val(Math.round(resolutionAtCoords*0.3937*156543.04));
	    //$(this).parent().prev().val(resolution*0.3937*156543.04);
	});*/

	$('#blcolpicker').colorpicker({
	    format: "hex"
	}).on('changeColor', function(ev) {
	    console.log(ev.color.toHex());
	    var reg=new RegExp("\\#","");
	    $("#blcolpicker,#sbl").attr("src","http://placehold.it/24/"+ev.color.toHex().replace(reg,"")+"/"+ev.color.toHex().replace(reg,"")+"/");

	    console.log($("#blcolpicker").attr("src"));
	    zoo.execute({
		identifier: "template.display",
		type: "POST",
		dataInputs: [
		    {
			"identifier": "tmpl",
			"value": "wms_sld_xml",
			"dataType": "string"
		    },
		    {
			"identifier": "color",
			"value": ev.color.toHex(),
			"dataType": "string"
		    },
		],
		dataOutputs: [
		    {"identifier":"Result","asReference":"true"},
		],
		success: function(data){
		    for(var i=0;i<myBaseLayers.length-2;i++)
			myBaseLayers[i].setVisible(false);
		    myBaseLayers[myBaseLayers.length-2].setVisible(true);
		    myBaseLayers[myBaseLayers.length-2].getSource().updateParams({"SLD": data["ExecuteResponse"]["ProcessOutputs"]["Output"]["Reference"]["_href"],time_: (new Date()).getTime()});
		    myBaseLayers[myBaseLayers.length-2].getSource().changed();
		},
		error: function(data){
		    console.log("ERROR");
		    $(".notifications").notify({
			message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
			type: 'danger',
		    }).show();
		}
	    });

	});

	var gcnt=0;
	$(".dropdown-bl").find(".blp").each(function(){
	    var lgcnt=gcnt;
	    $(this).parent().click(function(){
		for(var i=0;i<myBaseLayers.length;i++)
		    myBaseLayers[i].setVisible(false);
		myBaseLayers[lgcnt].setVisible(true);
		$("#sbl").attr("src",$(this).find("img").attr("src"));
	    });
	    gcnt++;
	});
	
	var togglers=["loadMap","addLayer","addDir","addGrid"];
	var dtogglers=["addLayer","addDir","addGrid"];
	for(var i in togglers){
	    $('#mm_'+togglers[i]+'Toggler').click(function(e){
		e.stopPropagation();
		var target=$(this).attr('id').replace(/Toggler/g,"");
		for(var j in dtogglers){
		    if('mm_'+dtogglers[j]!=target){
			if($('#mm_'+dtogglers[j]+'Toggler').is(":visible"))
			    $('#mm_'+dtogglers[j]).addClass("hide");
		    }
		}
		$('#'+target).toggleClass("hide");
	    });
	}

	$('#side-menu').css({"max-height": ($(window).height()-50)+"px","overflow":"scroll"});

	$('#mm_layer_legend_display,#mm_layer_order_display').css({"max-height": ($(window).height()-100)+"px","overflow":"scroll"});


	console.log("Set Map Height !");
	setMapHeight();
	//$("#main").split({orientation:'horizontal', limit:300});
	//$('#manaMap div').width($(window).width()/2);
	//$("#manaMap").split({orientation:'vertical', limit:400});
	adminBasic.initialize(zoo);

	var olMapDiv = document.getElementById('map');

	var controls = [
	    //new ol.control.Attribution(),
	    new ol.control.Rotate({autoHide: true}),
	    new ol.control.Zoom(),
	    new ol.control.ZoomSlider()
	];


	var osm = new ol.layer.Tile({
            source: new ol.source.OSM(),
	    visible: true,
            name: 'osm'
        });
	myBaseLayers.push(osm);
	    /*
	var mq0=new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: "osm"}),
	    visible: false,
	    name: 'mapquest-osm'
	});
	myBaseLayers.push(mq0);
	var mq1=new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: "sat"}),
	    visible: false,
	    name: 'mapquest-sat'
	});
	myBaseLayers.push(mq1);
	*/
	var cbl=new ol.layer.Tile({
	    visible: false,
	    source: new ol.source.TileWMS({
		url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/baselayer.map",
		params: {'LAYERS': "dummy", 'TILED': true},
		serverType: 'mapserver',
		visible: false
	    })
	});
	myBaseLayers.push(cbl);

	$("#imap").height($(window).height()/2.4);
	$(".gcpTable-container").css({height:($(window).height()-($("#imap").height())-($(".navbar").height()*2.5))+"px","overflow-y":"auto","overflow-x":"none"});
	size=module.config().georef.size.split(',');
	var extent=[0, 0, parseFloat(size[0]), parseFloat(size[1])];
	size=[parseFloat(size[0]), parseFloat(size[1])];
	var projection = new ol.proj.Projection({
	    code: 'xkcd-image',
	    units: 'pixels',
	    extent: extent
	});
	map0 = new ol.Map({
	    target: "imap",
	    layers: [
		new ol.layer.Image({
		    source: new ol.source.ImageStatic({
			attributions: [
			    new ol.Attribution({
				html: ' '
			    })
			],
			url: module.config().tmpUrl+'/'+module.config().georef.img,
			projection: projection,
			imageExtent: extent
		    }),
		    active: true
		})
	    ],
	    interactions: ol.interaction.defaults({
		altShiftDragRotate: true,
		dragPan: false,
		rotate: true
	    }).extend([new ol.interaction.DragPan({kinetic: null})]),
	    view: new ol.View({
		projection: projection,
		center: ol.extent.getCenter(extent),
		//center: [64, 64],
		zoom: 1
	    })
	});

	var c1 = ol.proj.transform([-180,-90], 'EPSG:4326','EPSG:3857');
	var c2 = ol.proj.transform([180,90], 'EPSG:4326','EPSG:3857');
	myBaseLayers.push(new ol.layer.Image({
	    visible: true,
	    source: new ol.source.ImageWMS({
		visible: true,
		attributions: [new ol.Attribution({
		    html: ' '
		})],
		ratio: 1,
		url: module.config().msUrl+"?map="+module.config().dataPath+"/maps/project_Georeferencer.map",
		params: {'LAYERS': "grid_level10,grid_level1,grid_level01,grid_level001,grid_level0001","format":"image/png"},
		serverType: ('mapserver')
	    })
	}));

	map = new ol.Map({
	    target: olMapDiv,
	    controls: controls,
	    layers: myBaseLayers,
	    interactions: ol.interaction.defaults({
		altShiftDragRotate: true,
		dragPan: false,
		rotate: true
	    }).extend([new ol.interaction.DragPan({kinetic: null})]),
	    view: new ol.View({
		center: [0, 0],
		zoom: 3
	    })
	});

	vstyles=[new ol.style.Style({
	    image: new ol.style.RegularShape({
		fill: new ol.style.Fill({color: "#000000"}),
		stroke: new ol.style.Stroke({color: "#000000",width: 2}),
		points: 4,
		radius: 10,
		radius2: 0,
		angle: 0
	    })
	})];

	vstylesSelected=[new ol.style.Style({
	    image: new ol.style.RegularShape({
		fill: new ol.style.Fill({color: "#FF0000"}),
		stroke: new ol.style.Stroke({color: "#FF0000",width: 2}),
		points: 4,
		radius: 10,
		radius2: 0,
		angle: 0
	    })
	})];

	features0 = new ol.Collection();
	featureOverlay0 = new ol.layer.Vector({
	    source: new ol.source.Vector({features: features0,projection:projection}),
	    style: vstyles
	});
	featureOverlay0.setMap(map0);

	features1 = new ol.Collection();
	featureOverlay1 = new ol.layer.Vector({
	    source: new ol.source.Vector({features: features1}),
	    style: vstyles
	});
	featureOverlay1.setMap(map);


	$(".gcpTable-container").prev().find("button").each(function(){
	    if($(this).attr("data-mmaction"))
		try{
		    InitialCallBacks[$(this).attr("data-mmaction")](this);
		}catch(e){
		    console.log("CallBack issue ("+$(this).attr("data-mmaction")+"): "+e);
		}	    
	});

	$('a[data-toggle="tab"]').on( 'shown.bs.tab', function (e) {
            $.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
	} );

	var table = $('#gcpTable').DataTable( {
            rowReorder:       false,
	    "scrollX":        true,
	    "scrollY":        ($(window).height()-($("#imap").height())-($(".navbar").height()*3.6))+"px",
	    "scrollCollapse": true,
	    autoWidth:        false,
	    "paging":         false,
	    "ordering":          false,
	    "info":           false,
	    "responsive":     false,
	    deferRender:      true,
	    bFilter:          false,
	    select: {
		info: false,
	    },
	} );
	$('#gcpTable tbody').on('click', 'tr', function () {
	    console.log("CURRENT CLICK! ");
	    var id = this.id+"";
	    console.log("CURRENT ID: "+id);
	    if(id){
		if($(this).hasClass("selected")){
		    $(this).removeClass("selected");
		    $(".require-select").addClass("disabled");
		    features0.item(parseInt($(this).attr('id').replace(/gcp_/,""))).setStyle(vstyles);
		    features1.item(parseInt($(this).attr('id').replace(/gcp_/,""))).setStyle(vstyles);
		    stopEdition();
		}else{
		    $('#gcpTable tbody').find("tr").each(function(){
			$(this).removeClass("selected");
			features0.item(parseInt($(this).attr('id').replace(/gcp_/,""))).setStyle(vstyles);
			features1.item(parseInt($(this).attr('id').replace(/gcp_/,""))).setStyle(vstyles);
		    });
		    $('#'+id).addClass("selected");
		    features0.item(parseInt(id.replace(/gcp_/,""))).setStyle(vstylesSelected);
		    features1.item(parseInt(id.replace(/gcp_/,""))).setStyle(vstylesSelected);
		    //$('#gcpTable').DataTable().row("#"+id).select();
		    $(".require-select").removeClass("disabled");
		    addEdition(parseInt(id.replace(/gcp_/,"")));
		}
	    }
	});
	//addInteraction();
	console.log("Start Manager");

	window.setTimeout(function () { 
	    adminBasic.typeaheadMap(module,zoo,[$("#load-map"),$("#load-map")],"prefix=georeferencer_",loadMap);
	},100);

	$("#save-map").next().find('button').click(function(e){
	    console.log("load Map");
	    loadMap(zoo,[$("#save-map").val(),$("#save-map-orig").val()]);
	});

	$('input[type=range]').on('input', function () {
	    if(map.getLayers().getLength()>myBaseLayers.length){
		map.getLayers().item(myBaseLayers.length).setOpacity($(this).val()/100);
	    }
	});

	$(".geoCrop").on('click',function(){
	    boxSelection();
	});
    };

    var saveGCP=function(){
	var params=[
	    {
		"identifier": "dso",
		"value": module.config().georef.dso,
		"dataType": "string"
	    },
	];
	var myRootLocation=$("#gcpSave");
	if(myRootLocation.find('select[name="csvfile0"]').is(":visible"))
	    params.push({
		"identifier": "force",
		"value": "true",
		"dataType": "boolean"
	    }); 
	params.push({
	    "identifier": "file",
	    "value": (myRootLocation.find('input[name="filename"]').is(":visible")?myRootLocation.find('input[name="filename"]').val():myRootLocation.find('select[name="csvfile0"]').val()),
	    "dataType": "string"		
	});
	myRootLocation=$("#gcpTable");
	myRootLocation.find('tbody').find("tr").each(function(){
	    var gcp="";
	    var cnt=0;
	    $(this).find("td").each(function(){
		if(cnt>0 && cnt<5){
		    gcp+=",";
		}
		gcp+=$(this).html();
		cnt+=1;
	    });
	    params.push({
		"identifier": "gcp",
		"value": gcp,
		"dataType": "string"		
	    });
	    
	});
	zoo.execute({
	    identifier: "georeferencer.saveGCPAsCSV",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		$("#gcpSave").html("");
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    var loadGCP=function(){
	var params=[
	    {
		"identifier": "dso",
		"value": module.config().georef.dso,
		"dataType": "string"
	    },
	];
	var myRootLocation=$("#gcpLoad");
	params.push({
	    "identifier": "file",
	    "value": myRootLocation.find('select[name="csvfile"]').val(),
	    "dataType": "string"		
	});
	myRootLocation=$("#gcpTable");
	myRootLocation.find("tbody").html("");
	zoo.execute({
	    identifier: "georeferencer.loadGCP",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		myRootLocation.find("tbody").html("");
		featureOverlay0.getSource().clear();
		featureOverlay1.getSource().clear();
		for(var j=0;j<data.length;j++){
		    reg=[
			new RegExp("\\[id\\]","g"),
			new RegExp("\\[ix\\]","g"),
			new RegExp("\\[iy\\]","g"),
			new RegExp("\\[mx\\]","g"),
			new RegExp("\\[my\\]","g"),
		    ];
		    var template=$("#georeferencer_gcp_line_template")[0].innerHTML;
		    for(var i=0;i<reg.length;i++){
			template=template.replace(reg[i],data[j][i]);
		    }
		    var feature = new ol.Feature({
			geometry: new ol.geom.Point([data[j][1],(size[1]-data[j][2])]),
			labelPoint: new ol.geom.Point([data[j][1]+2,(size[1]-data[j][2])+2]),
			name: 'My GCP '+j,
			mmid: j 
		    });
		    featureOverlay0.getSource().addFeature(feature);
		    var point=ol.proj.transform([parseFloat(data[j][3]),parseFloat(data[j][4])],'EPSG:4326',map.getView().getProjection());
		    var point1=ol.proj.transform([parseFloat(data[j][3])+1.0,parseFloat(data[j][4])+1.0],'EPSG:4326',map.getView().getProjection());
		    var feature1 = new ol.Feature({
			geometry: new ol.geom.Point(point),
			labelPoint: new ol.geom.Point(point1),
			name: 'My GCP '+j,
			mmid: j 
		    });
		    featureOverlay1.getSource().addFeature(feature1);
		    $("#gcpTable").find("tbody").append(template);
		}
		map.getView().fit(featureOverlay1.getSource().getExtent(),map.getSize());
		map0.getView().fit(featureOverlay0.getSource().getExtent(),map0.getSize());
		$.fn.dataTable.tables( {visible: true, api: true} ).columns.adjust();
		$("#gcpLoad").html("");
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    };

    var cropImage=function(){
	$("#cropForm").find("button").last().addClass('disabled');
	$("#cropForm").find("button").next().removeClass('hide');

	var reg=new RegExp(module.config().dataPath+"/dirs/","g");
	var params=[
	    {
		"identifier": "dso",
		"value": currentDSO,
		"dataType": "string"  
	    },
	    {
		"identifier": "dsto",
		"value": currentDST,
		"dataType": "string"  
	    },
	];
	$("#cropForm").find('input[type="text"],select').each(function(){
	    if($(this).is(":visible")){
		params.push({
		    "identifier": $(this).attr("name"),
		    "value": $(this).val(),
		    "dataType": "string"  
		});	    
	    }
	});
	var extent=map.getLayers().item(map.getLayers().getLength()-1).getSource().getExtent();
	var ext0=ol.proj.transform([extent[0],extent[1]],map.getView().getProjection(),'EPSG:4326')
	var ext1=ol.proj.transform([extent[2],extent[3]],map.getView().getProjection(),'EPSG:4326')
	params.push({
	    "identifier": "ProjWin",
	    "value": ext0[0]+","+ext1[1]+","+ext1[0]+","+ext0[1],
	    "dataType": "string"  
	});	    
	console.log(params);
	//return ;

	zoo.execute({
	    identifier: "georeferencer.cropImage",
	    type: "POST",
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","type":"raw"},
	    ],
	    success: function(data){
		$("#cropForm").find("button").last().removeClass('disabled');
		$("#cropForm").find("button").next().addClass('hide');
		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		console.log(module.config().msUrl+"?map="+module.config().dataPath+"/dirs/"+$("#cropForm").find('select[name="dst"]').val()+"/ds_ows.map");
		var myLayer=new ol.layer.Tile({
		    attributions: [
			new ol.Attribution({
			    html: ' '
			})
			],
		    visible: true,
		    opacity: 0.45,
		    source: new ol.source.TileWMS({
			url: module.config().msUrl+"?map="+module.config().dataPath+"/dirs/"+$("#cropForm").find('select[name="dst"]').val()+"/ds_ows.map",
			params: {'LAYERS': $("#cropForm").find('input[name="dsot"]').val(), 'TILED': true},
			serverType: 'mapserver'
		    })
		});
		
		currentDSO=$("#cropForm").find('input[name="dsot"]').val();
		currentDST=$("#cropForm").find('select[name="dst"]').val();
		while(map.getLayers().getLength()>myBaseLayers.length){
		    map.removeLayer(map.getLayers().item(myBaseLayers.length));
		}
		map.addLayer(myLayer);
		map.getLayers().item(map.getLayers().getLength()-1).setVisible(false);
		map.getLayers().item(map.getLayers().getLength()-1).setVisible(true);
	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    var currentDSO,currentDST;

    var georeferenceImage=function(){
	$("#geoForm").find("button").last().addClass('disabled');
	$("#geoForm").find("button").next().removeClass('hide');
	var params=[
	];
	var dst=null;
	$("#geoForm").find('input[type="text"],select').each(function(){
	    if($(this).is(":visible")){
		params.push({
		    "identifier": $(this).attr("name"),
		    "value": $(this).val(),
		    "dataType": "string"  
		});
		if($(this).attr("name")=="dst")
		    dst=$(this).val();
	    }
	});
	myRootLocation=$("#gcpTable");
	myRootLocation.find('tbody').find("tr").each(function(){
	    var gcp="";
	    var cnt=0;
	    $(this).find("td").each(function(){
		if(cnt>1 && cnt<5){
		    gcp+=",";
		}
		if(cnt>0)
		    gcp+=$(this).html();
		cnt+=1;
	    });
	    params.push({
		"identifier": "gcp",
		"value": gcp,
		"dataType": "string"		
	    });
	    
	});
	currentDSO=$("#geoForm").find('input[name="dso"]').val();
	console.log("currentDSO "+currentDSO);
	currentDST=$("#geoForm").find('select[name="dst"]').val();
	$(".geotools").addClass('hide');
	zoo.execute({
	    identifier: "georeferencer.georeference",
	    type: "POST",
	    storeExecuteResponse: true,
	    status: true,
	    dataInputs: params,
	    dataOutputs: [
		{"identifier":"Result","mimeType":"text/plain"},
	    ],
	    success: function(data, launched){
              zoo.watch(launched.sid, {
		      onPercentCompleted: function(data) {
                         console.log("**** PercentCompleted ****");
                         console.log(data);
			      if($("#georeferencerLog").length==0)
			      $("#geoForm").find('li').last().append('<div id="georeferencerLog"></div>');
                         $("#georeferencerLog").html("<p>"+data.text+" ("+data.percentCompleted+"% completed)</p>");
                         //progress.css('width', (data.percentCompleted)+'%');
                         //progress.text(data.text+' : '+(data.percentCompleted)+'%');
                      },
		      onProcessSucceeded: function(data) {

		console.log(data);
			      $("#georeferencerLog").remove();

		$("#geoForm").find("button").last().removeClass('disabled');
		$("#geoForm").find("button").next().addClass('hide');

		$(".notifications").notify({
		    message: { text: data },
		    type: 'success',
		}).show();
		$(".geotools").removeClass('hide');
		console.log(module.config().msUrl+"?map="+module.config().dataPath+"/dirs/"+currentDST+"/ds_ows.map");
		var myLayer=new ol.layer.Tile({
		    attributions: [
			new ol.Attribution({
			    html: ' '
			})
			],
		    visible: true,
		    opacity: 0.45,
		    source: new ol.source.TileWMS({
			url: module.config().msUrl+"?map="+module.config().dataPath+"/dirs/"+currentDST+"/ds_ows.map",
			params: {'LAYERS': currentDSO, 'TILED': true},
			serverType: 'mapserver'
		    })
		});
		console.log($("#geoForm").find('input[name="dso"]').val());
		console.log(myLayer);
		console.log(map.getLayers().item(map.getLayers().getLength()-1));
		//map.getLayers().push(layer);
		if(map.getLayers().getLength()>myBaseLayers.length)
		    map.removeLayer(map.getLayers().item(myBaseLayers.length));
		map.addLayer(myLayer);
		console.log($("#geoForm").find('input[name="dso"]').val());
		console.log(map.getLayers());
		map.getLayers().item(map.getLayers().getLength()-1).setVisible(false);
		map.getLayers().item(map.getLayers().getLength()-1).setVisible(true);
                      }
	      });

	    },
	    error: function(data){
		$(".notifications").notify({
		    message: { text: data["ExceptionReport"]["Exception"]["ExceptionText"].toString() },
		    type: 'danger',
		}).show();
	    }
	});
    }

    var saveGCPEditing=function(){
	var cnt=0;
	var id=null;
	var data=[];
	$("#gcpTable").find("tr.selected").find('td').each(function(){
	    if(gcpInputs[cnt]!=null)
		$(this).html($("#gcp-editor").find('input[name="'+gcpInputs[cnt]+'"]').val());
	    else
		id=parseFloat($(this).html());
	    data.push(parseFloat($(this).html()));
	    cnt+=1;
	});
	//console.log(featureOverlay0.getSource().getFeatures()[id]);
	//console.log(featureOverlay1.getSource().getFeatures()[id]);
	features0.item(id).setGeometry(new ol.geom.Point([data[1],(size[1]-data[2])]));	
	var point=new ol.geom.Point(ol.proj.transform([data[3],data[4]],'EPSG:4326',map.getView().getProjection()));
	features1.item(id).setGeometry(point);

	$("#gcp-editor").collapse("hide");
    };
  
    // Return public methods
    return {
        initialize: initialize,
        saveGCP: saveGCP,
	saveGCPEditing: saveGCPEditing,
        loadGCPFile: loadGCP,
        cropImage: cropImage,
	georeferenceImage: georeferenceImage,
	map: function(){
	    return map;
	}
    };



});

