System.refreshSteps=true;

function initTableFields(){
    $("#table .gen").find("input").each(function(){
	$(this).val("");
    });
}

function refreshTableFields(){
    initTableFields();
    tableName="indicateurs";
    tableNameT=(arguments.length>0?arguments[0]:"")+"table";
    var vars="";
    if(arguments.length>1)
	vars=";tid="+arguments[1];
    if($("#table_steps").is(":visible") && $("#table_step").val()>0)
	vars+=";step="+($("#table_step")[0].selectedIndex-1);
    $.ajax({
	type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=np.details&DataInputs=table="+tableName+";id="+System.nodeId+";tab=table"+vars+"&RawDataOutput=Result",
	complete: function(xml,status) {
	    if(checkWPSResult(xml,false)){
		try{
		    if(System.refreshSteps)
			addSteps(tableNameT+"_step");
		    System.refreshSteps=true;
		}catch(e){
		    // In case addSteps is not defined
		}

		var data=$.parseJSON(xml.responseText);
		for(var i in data){
		    if(!$.isArray(data[i])){
			if(i=="name")
			    $("#"+tableNameT+"_"+i+"_title").html(data[i]);
			else{
			    if(data[i]!=null){
				if(i!="step")
				    $("#"+tableNameT+"_"+i).val(data[i]);
				else
				    $("#"+tableNameT+"_"+i+" > option")[data[i]+1].selected=true;
			    }
			    else{
				if($("#"+tableNameT+"_"+i)>0 && $("#"+tableNameT+"_"+i)[0].selectedIndex)
				    $("#"+tableNameT+"_"+i).val(-1);
				else
				    $("#"+tableNameT+"_"+i).val("");
			    }
			}
		    }else{
			$("#"+tableNameT+"_"+i+" option:selected").removeAttr("selected");
			if(data[i].length)
			    for(var j=0;j<data[i].length;j++)
				$("#"+tableNameT+"_"+i+' option[value="'+data[i][j]+'"]').attr("selected", "selected");
			else
			    $('#'+tableNameT+'_'+i+' option[value="-1"]').attr("selected", "selected");
		    }
		}
		try{
		    if(tableNameT=="table"){
			$(".toolbar2").find("a.table").each(function(){
			    $(this).removeClass("desactivated");
			});
			$(".tabs-project").find("#table > .loader-container").each(function(){
			    $(this).hide();
			});
		    }
		}catch(e){}
	    }
	}
    });
  
}
