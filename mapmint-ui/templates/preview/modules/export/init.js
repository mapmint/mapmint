function startExport(){
    \$(".dialog-export").show();
    \$(".dialog-export").window({
	width:248,
	height:174,
	collapsible: false,
	maximizable:false,
	minimizable:false,
	resizable:false
    });
}


function exportData(){
#if $m.web.metadata.get('layout_t')=="mobile"
    $.mobile.showPageLoadingMsg();
#end if
    alert("$conf["senv"]["last_map"] <=> "+System.mmNodeId);
    \$.ajax({
	type: "GET",
        dataType: "html",
	url: zooUrl+"?metapath=vector-converter&request=Execute&service=WPS&version=1.0.0&Identifier="+"exportTo"+"&DataInputs=map=$conf["senv"]["last_map"];layer="+System.mmNodeId.replace(/layer_/g,"")+";format="+\$("#select_export").val()+"&RawDataOutput=Result",
	success: function(xml){
#if $m.web.metadata.get('layout_t')=="mobile"
	    $.mobile.hidePageLoadingMsg();
#end if
	    \$("#export_dl_link").attr("href",xml);
	    \$("#export_dl_link").show();
	    \$('#routingDownloadContainer').attr('href',xml);
	}
    });
}