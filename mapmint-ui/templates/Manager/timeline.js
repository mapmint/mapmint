#import zoo

MMStyler={
    startWindow: function(){
	if(arguments.length>0)
	    System.styleIsStep=arguments[0];
	else
	    System.styleIsStep=false;
	if(System.startWindowStep)
	    System.startWindowStep();
	\$.ajax({
	    type: "GET",
	    url: "$conf["main"]["serverAddress"]?metapath=mapfile&service=WPS&version=1.0.0&request=Execute&Identifier=createLegend&DataInputs=name="+(\$("#mapName").val()?\$("#mapName").val():"Index"+System.nodeId)+";layer="+System.mmNodeId+(System.styleIsStep?";mmStep="+(\$("#mmsteps")[0].selectedIndex-2):"")+(\$("#mmPrefix").val()?";prefix="+\$("#mmPrefix").val():"")+"&RawDataOutput=Result",
	    dataType: "xml",
	    complete: function(xml,status) {
		if(\$("#mapName").val()){
		    updateSelectWithFields(["gsField","ccField","usField","labelField","labelAngleField"]);
		    \$( "#style-dialog" ).html(xml.responseText);
		    \$( "#style-dialog" ).window({
			minimizable:false,
			maximizable:false,
			resizable: false,
			height:460,
			width:500
		    });
		    \$(".hasInfo").tipsy({fade: true, offset:3, opacity: 1, gravity: 'se'});
		}else
		    \$("#indexStyle").html(xml.responseText);
		try{
		    \$(".flexiClasses").flexigrid({title: 'Classes', noSelection: true,height: (\$("#dropdown").val()=='gradSymb'?140:180), rp: 4, usepager: false, resizable: false});
		}catch(e){}
		if(\$("#opacity").val())
		    \$( "#slider-opacity" ).slider({
			value:\$("#opacity").val().replace("%",""),
			min: 0,
			max: 100,
			step: 1,
			slide: function( event, ui ) {
			    \$("#opacity").val(ui.value +  "%" );
			}	
		    });
		
		if(\$('#dropdown').val()=="uniqSymb")
		    \$("#opacityOnly").hide();
		try{
		    \$("#ccLegend")[0].src="$conf["main"]["serverAddress"]?metaPath=classifier&request=Execute&service=WPS&version=1.0.0&Identifier=getClassifierImage&DataInputs=from="+\$("#cc-min-colorpicker")[0].value.replace("#","")+";to="+\$("#cc-max-colorpicker")[0].value.replace("#","")+";nbClass=24&RawDataOutput=Result"
		}catch(e){}
		try{
		    \$(function () {
                        var tabContainers = \$('div.style-tabs > div');
                        tabContainers.hide().filter(':first').show();
                        
                        \$('div.style-tabs ul.style-tabs-nav a').click(function () {
                            tabContainers.hide();
                            tabContainers.filter(this.hash).show();
                            \$('div.style-tabs ul.style-tabs-nav a').removeClass('selected');
                            \$(this).addClass('selected');
                            return false;
                        }).filter(':first').click();
                    });
                }catch(e){}
		try{
		    \$('#divuniqSymb, #divgradSymb, #divcontCol, #divuniqVal').hide();
		    \$('#dropdown').change(function() {
			if(\$("#dropdown").val()!="timeline"){
			    \$(".tl").hide();
			    \$('.box').hide();
			    \$('#div' + \$(this).val()).show();
			}else{
			    \$(".tl").show();
			}
		    });
		    \$('#dropdown1').change(function() {
			\$('.box').hide();
			\$('#div' + \$(this).val()).show();
		    });
		}catch(e){}
		\$('.box').hide();
		if(\$('#dropdown')[0]){
		    if(\$('#dropdown').val()!="timeline")
			\$('#div' +\$('#dropdown').val()).show();
		    else{
			\$('#div' +\$('#dropdown1').val()).show();
			for(i=0;i<map.layers.length;i++)
			    if(map.layers[i].local_id==System.mmNodeId){
				map.layers[i].url="$conf["main"]["mapserverAddress"]?map=$conf["main"]["dataPath"]/maps/timeline_"+\$("#mapName")[0].value+"_"+System.mmNodeId+"_step"+(\$("#mmsteps")[0].selectedIndex-2)+".map";
				map.layers[i].redraw(true);
			    }
		    }
		}
		else
		    \$('#divuniqSymb').show();
		
		\$(function() {    
		    try{
			\$('#fill-colorpicker').colorPicker();
			\$('#stroke-colorpicker').colorPicker();
			\$('#nodata-colorpicker').colorPicker();
			\$('#cc-min-colorpicker').colorPicker();
			\$('#cc-max-colorpicker').colorPicker();
			\$('#font-colorpicker').colorPicker();
			\$('#us-min-colorpicker').colorPicker();
			\$('#us-max-colorpicker').colorPicker();
			\$('#gs-min-colorpicker').colorPicker();
			\$('#gs-max-colorpicker').colorPicker();
			\$('#buffer-font-colorpicker').colorPicker();
			System.isRaster=false;
		    }catch(e){
			alert(e);
			System.isRaster=true;
		    }
		    for(var i=0;i<toRunAfter.length;i++){
   			toRunAfter[i]();
		    }
		}); 

	    }
	});
    },
    Timeline: {
	startStepEditor: function (){
	    \$.ajax({
		type: "GET",
		url: "Manager/Styler/AddStep",
		complete: function(xml,status) {
		    
     		    if(\$( "#view-addstep-dialog" )[0]){
			\$( "#view-addstep-dialog" ).window('close');
			\$( "#view-addstep-dialog" ).parent().remove();
		    }
		    \$( "body" ).append('<div id="view-addstep-dialog" title="$zoo._("Add step in timeline")"></div>');
      		    \$( "#view-addstep-dialog" ).html("");
		    \$( "#view-addstep-dialog" ).append(xml.responseText);
		    \$( "#view-addstep-dialog" ).window({
			collapsible:false,
			minimizable:false,
			maximizable:false,
			draggable:true,
			resizable: false
		    });
		}
	    });
	},
	saveStep: function (){
	    \$.ajax({
		type: "GET",
		url: System.zooUrl+"?metapath=mapfile&version=1.0.0&service=WPS&request=Execute&service=WPS&Identifier="+(arguments.length==0?"saveStep":"removeStep")+"&dataInputs=layer="+System.mmNodeId+";name="+\$("#mmStepName").val()+(\$("#mmPrefix").val()?";prefix="+\$("#mmPrefix").val():"")+"&RawDataOutput=Result",
		complete: function(xml,status) {
		    if(checkWPSResult(xml)){
			\$( "#view-addstep-dialog" ).window('close');
			\$( "#view-addstep-dialog" ).parent().remove();
			MMStyler.Timeline.refreshStepList();
		    }
		}
	    });
	},
	deleteStep: function (){
	    \$.ajax({
		type: "GET",
		url: System.zooUrl+"?metapath=mapfile&version=1.0.0&service=WPS&request=Execute&service=WPS&Identifier=deleteStep&dataInputs=layer="+System.mmNodeId+";name="+\$("#mmsteps").val()+"&RawDataOutput=Result",
		complete: function(xml,status) {
		    if(checkWPSResult(xml)){
			\$( "#view-addstep-dialog" ).window('close');
			\$( "#view-addstep-dialog" ).parent().remove();
			MMStyler.Timeline.refreshStepList();
		    }
		}
	    });
	},
	refreshStepList: function(){
	    \$.ajax({
		type: "GET",
		url: System.zooUrl+"?metapath=mapfile&version=1.0.0&service=WPS&request=Execute&service=WPS&Identifier=listStep&dataInputs=layer="+System.mmNodeId+"&RawDataOutput=Result",
		complete: function(xml,status) {
		    if(checkWPSResult(xml,false)){
			json=new OpenLayers.Format.JSON();
			var tmp=json.read(xml.responseText);
			\$('#mmsteps option').each(function() {
			    if ( \$(this).val() != '-1' && \$(this).val() != 'add') {
				\$(this).remove();
			    }
			});
			for(i=0;i<tmp.length;i++){
			    if(i==0)
				System.stepId=tmp[i];
			    var o = new Option(tmp[i],tmp[i]);
			    \$(o).html(tmp[i]);
			    \$("#mmsteps").append(o);
			}
			if(System.runAfterStep)
			    System.runAfterStep();
			if(!System.break)
			    \$("#mmDeleteStep").hide();
		    }
		}
	    });
	}
    }
}

