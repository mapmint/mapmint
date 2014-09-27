
function WPSGetHeader(name){
  return '<wps:Execute service="WPS" version="1.0.0" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ../wpsExecute_request.xsd"><ows:Identifier>'+name+'</ows:Identifier>';
}

function WPSGetFooter(){
  return "</wps:Execute>";
}

function WPSGetInputs(obj){
  var inputs="";
  for(var i=0;i<obj.length;i++){
    inputs+=WPSGetInput(obj[i]);
  }
  return '<wps:DataInputs>'+inputs+'</wps:DataInputs>';
}

function WPSGetInput(obj){
  if(obj.dataType)
    return WPSGetLiteralInput(obj);
  else
    return WPSGetComplexInput(obj);
}

function WPSGetLiteralInput(obj){
  return '<wps:Input><ows:Identifier>'+obj.name+'</ows:Identifier><wps:Data><wps:LiteralData><![CDATA['+obj.value+']]></wps:LiteralData></wps:Data></wps:Input>';
}

function WPSGetComplexInput(obj){
    var headers="";
    if(obj["method"]){
	for(i=0;i<obj["headers"].length;i++){
	    headers+='<wps:Header key="'+obj["headers"][i]["key"]+'" value="'+obj["headers"][i]["value"]+'" />';
	}
    }
    return '<wps:Input><ows:Identifier>'+obj.name+'</ows:Identifier>'+(obj["xlink:href"]?'<wps:Reference mimeType="'+obj.mimeType+'" xlink:href="'+obj["xlink:href"]+(obj["method"]?'" method="'+obj["method"]+'">'+headers+obj["body"]+'</wps:Reference>':'" />'):'<wps:Data><wps:ComplexData mimeType="'+(obj.mimeType?obj.mimeType:"text/xml")+'">'+(obj.mimeType=="application/json"?"<![CDATA[":"")+obj.value+(obj.mimeType=="application/json"?"]]>":"")+'</wps:ComplexData></wps:Data>')+'</wps:Input>';
}

function WPSGetOutput(obj){
    obj.form=(obj.form?obj.form:"RawDataOutput");
    return '<wps:ResponseForm><wps:'+(obj.form?obj.form:'RawDataOutput')+(obj.storeExecuteResponse?' storeExecuteResponse="'+obj.storeExecuteResponse+'"':"")+(obj.status?' status="'+obj.status+'"':"")+((obj.form=="RawDataOutput"&&obj.mimeType)?'mimeType="'+obj.mimeType+'"':"")+'>'+(obj.form!="RawDataOutput"?'<wps:Output '+((obj.form!="RawDataOutput"&&obj.mimeType)?'mimeType="'+obj.mimeType+'"':"")+' '+((obj.asReference)?'asReference="'+obj.asReference+'"':"")+'>':'')+'<ows:Identifier>'+obj.name+'</ows:Identifier>'+(obj.form!="RawDataOutput"?'</wps:Output>':'')+'</wps:'+(obj.form?obj.form:'RawDataOutput')+'></wps:ResponseForm>';
}

function WPSParseReference(xml){
    var mapUrl="";
    $(xml.responseXML).find("wps\\:Reference").each(function(){var tmp=this.getAttribute('href').split('\&');mapUrl=tmp[0];});
    $(xml.responseXML).find("Reference").each(function(){var tmp=this.getAttribute('href').split('\&');mapUrl=tmp[0];});
    return mapUrl;
}

function WPSParseStatusLocation(xml){
    var statusUrl=false;
    $(xml.responseXML).find("wps\\:ExecuteResponse").each(function(){var tmp=this.getAttribute('statusLocation');statusUrl=tmp;});
    $(xml.responseXML).find("ExecuteResponse").each(function(){var tmp=this.getAttribute('statusLocation');statusUrl=tmp;});
    return statusUrl;
}

function WPSParseStarted(xml){
    var statusUrl=false;
    $(xml.responseXML).find("wps\\:ProcessStarted").each(function(){var tmp=this.getAttribute('percentCompleted');statusUrl=[tmp,this.firstChild.data];});
    $(xml.responseXML).find("ProcessStarted").each(function(){var tmp=this.getAttribute('percentCompleted');statusUrl=[tmp,this.firstChild.data];});
    return statusUrl;
}


function WPSPull(xml,function0,function1,_function1){
    $.ajax({
	lxml: xml,
	type: "GET",
	url: WPSParseStatusLocation(xml),
	complete: function(xml,status){
	    var tmp0=$(xml.responseXML).find("ows\\:ExceptionText").text();
	    if(tmp0=="")
		tmp0=$(xml.responseXML).find("ExceptionText").text();
	    if(tmp0!=""){
		if($('#error-dialog')[0]){
		    $( "#error-dialog" ).window('close');
		    $( "#error-dialog" ).remove();
		}
		if(!$('#error-dialog')[0])
		    $("body").append('<div id="error-dialog" title="'+System.messages["Error message"]+'"></div>');
		$('#error-dialog').html("");
		$( "#error-dialog" ).window({
		    minimizable:false,
		    maximizable:false,
		    resizable: false,
		    width: 400,
		    height: 200
		});
		$('#error-dialog').html(tmp0);
		alert(_function1);
		_function1(xml);
	    }
	    var tmp=WPSParseStarted(xml);
	    if(tmp){
		function0(tmp[0],tmp[1]);
		var lxml=this.lxml;
		setTimeout(function(){
		    WPSPull(lxml,function0,function1);
		},1000);
	    }else{
		function1(xml);
	    }
	}
    });
}


function checkWPSResult(){
  var xml=arguments[0];
  var tmp=$(xml.responseXML).find("ows\\:ExceptionText").text();
  if(tmp=="")
    tmp=$(xml.responseXML).find("ExceptionText").text();
  if(xml.responseXML && tmp!=""){
    if(arguments.length==1 || arguments[1])
    	$.notifyBar({ cssClass: "error", html:  tmp});
    else if(arguments.length==3 && arguments[2]){
        if($('#error-dialog')[0]){
		$( "#error-dialog" ).window('close');
		$( "#error-dialog" ).remove();
        }

        if(!$('#error-dialog')[0])
	    $("body").append('<div id="error-dialog" title="'+System.messages["Error message"]+'"></div>');
	    $('#error-dialog').html("");
	    $( "#error-dialog" ).window({
		minimizable:false,
		maximizable:false,
		resizable: false
	    });
	    $('#error-dialog').html(tmp);	
    }
    return false;
  }
  else{
    if(arguments.length==1 || arguments[1]){
        if(xml.responseText) 
	    $.notifyBar({ cssClass: "success", html: xml.responseText });
        else
            $.notifyBar({ cssClass: "success", html: xml });
    }
    return true;
  }
}

