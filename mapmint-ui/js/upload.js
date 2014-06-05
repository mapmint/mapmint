function startUploadWindow(){
  $.ajax({
        type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=upload.getForm&DataInputs=form=Upload&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	  if(!$("#upload-data-dialog")[0])
	    $("body").append('<div id="upload-data-dialog" title="'+System.messages["Upload Files"]+'"></div>');    
	  $("#upload-data-dialog").html(xml.responseText);  
	  
	  $("#upload-data-dialog").window({
		  minimizable:false,
		  maximizable:false,
		  resizable: false	  
	  });
	
      }
    });
}

function startUploadForm(){
  // Setup html5 version
    var args={
	// General settings
        runtimes : 'html5',
	url : System.zooUrl+'?service=WPS&version=1.0.0&request=Execute&Identifier=upload.saveOnServer&dataInputs=file=upload;dest='+$("#upload_dest")[0].value,
	max_file_size : '10mb',
	chunk_size : '10mb',
	unique_names : true
    };
    if(arguments[0]=="Publisher")
	args["multiple_queues"]=false;
    $("#uploader").pluploadQueue(args);
    $("#upload_form").css({visibility: "visible"});
}

function startCheck(){
  $.ajax({
        type: "GET",
	url: System.zooUrl+"?service=WPS&version=1.0.0&request=Execute&Identifier=upload.checkFile&DataInputs=dest="+$("#upload_dest")[0].value+"&RawDataOutput=Result",
	dataType: 'xml',
	complete:function(xml,status){
	  $("#uploader").html("");
	  var list="";
	  try{tmp=eval("["+xml.responseText+"]");}catch(e){alert(e);}
	  for(var i=0;i<tmp[0]["accepted"].length;i++)
	    list+="<li>"+tmp[0]["accepted"][i]+"</li>";
	  $("#uploader").append("<h2>Accepted files in "+$("#upload_dest")[0].value+":</h2><ul>"+list+"</ul>");
	  list="";
	  for(var i=0;i<tmp[0]["refused"].length;i++)
	    list+="<li>"+tmp[0]["refused"][i]+"</li>";
	  if(tmp[0]["refused"].length>1)
	    $("#uploader").append("<h2>Files not accepted:</h2> <ul>"+list+"</ul>");

      }
    });
}


