var popupWindow;

function loadSharingWindow(){
    /*if(\$("#sharing-dialog").length>0){
	\$("#sharing-dialog").window('close');
	\$("#sharing-dialog").remove();
    }
    \$('body').append('<div id="sharing-window" title="'+System.messages[arguments[0]+" sharing"]+'"><iframe id="sharing-iframe" src="'+arguments[1]+'"></iframe></div>');
    \$('#sharing-window').window( 	{
	collapsible:false,
	minimizable:false,
	maximizable:false,
	draggable:true,
	resizable: false
    });*/
    var hauteur=(arguments.length>2?arguments[2]:480);
    var largeur=(arguments.length>3?arguments[3]:480);
    var top=(screen.height-hauteur)/2;
    var left=(screen.width-largeur)/2;
    var options = "menubar=no,scrollbars=yes,statusbar=no,resizable=yes";
    if(popupWindow)
	popupWindow.close();
    popupWindow=window.open(arguments[1],System.messages[arguments[0]+" sharing"],"top="+top+",left="+left+",width="+largeur+"px,height="+hauteur+"px,"+options);
    popupWindow.focus();
}

function permalink(){
    saveContext(_permalink);
}

function _permalink(url){
    var purl=url;
    System.curl=url;
    var params=[{name: "Text",value:url,dataType: "string"}];
    data=WPSGetHeader("QREncode")+WPSGetInputs(params)+WPSGetOutput({"form":"ResponseDocument","asReference":"true","name":"QR"})+WPSGetFooter();
    \$.ajax({
	type: "POST",
	url: System.zooUrl,
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    var params1=[
		{name: "img",value:WPSParseReference(xml),dataType: "string"},
		{name: "url",value:System.curl,dataType: "string"},
		{name: "tmpl",value:"public/modules/sharing/default",dataType: "string"}
	    ];
	    data=WPSGetHeader("template.display")+WPSGetInputs(params1)+WPSGetOutput({"name":"Result"})+WPSGetFooter();
	    $.ajax({
		type: "POST",
		url: System.zooUrl,
		contentType: 'text/xml',
		data: data,
		complete: function(xml,status) {
		    if(\$("#sharing-dialog").length>0){
			\$("#sharing-dialog").window('close');
			\$("#sharing-dialog").remove();
		    }
		    \$('body').append('<div id="sharing-window" title="'+System.messages["Permalink"]+'"></div>');
		    \$('#sharing-window').html(xml.responseText);
		    \$('#sharing-window').window({
			collapsible:false,
			minimizable:false,
			maximizable:false,
			draggable:true,
			resizable: false,
			width: 400,
			top: 100,
			left: 100
		    });
		}
	    });	    //urlContext = xml.responseText;
	    //urlContext = xml.responseText;
	    //func(xml.responseText);
        }
    });
}

function _shareOnTwitter(url){
	var urlTwitter = "http://www.twitter.com/share?url="+url;
	loadSharingWindow("Twitter",urlTwitter,480,520);
}

function shareOnTwitter(){
    saveContext(_shareOnTwitter);
}

function _shareOnFB(url){
    var params=[{name: "Text",value:url,dataType: "string"}];
    data=WPSGetHeader("QREncode")+WPSGetInputs(params)+WPSGetOutput({"form": "ResponseDocument","asReference":"true","name":"QR"})+WPSGetFooter();
    $.ajax({
	type: "POST",
	url: System.zooUrl,
	contentType: 'text/xml',
	data: data,
	complete: function(xml,status) {
	    var urlFB = "http://www.facebook.com/sharer.php?s=100&p[title]=MapMint Context&p[url]="+url+"&p[images][0]="+encodeURIComponent(WPSParseReference(xml));
	    loadSharingWindow("Facebook",urlFB,480,480);
	    //func(xml.responseText);
        }
    });
}

function shareOnFB(){
    saveContext(_shareOnFB);
}
