$(document).ready(function() {

    $(".loader-container").hide();
    $.cookie('style', null, { expires: null, path: '/' });
    $.cookie('MMID', null, { expires: null, path: '/' });
    $.cookie('MMID', null, { expires: null, path: '/' });
    $.cookie('MMID', null, { expires: null, path: '/' });
    

    $("#validate").click(function(){
	$.ajax({
	  type: "GET",
	      url: System.zooUrl+"?metapath=authenticate&service=WPS&version=1.0.0&request=Execute&Identifier=logIn&DataInputs=login="+$('#email')[0].value+";password="+$('#password')[0].value+"&RawDataOutput=Result",
	  dataType: "xml",
	  complete: function(xml,status) {
	      if(xml.responseXML){
		var elog=$(xml.responseXML).find("ows\\:ExceptionText").text();
		if(elog=="")
		  elog=$(xml.responseXML).find("ExceptionText").text();
		$.notifyBar({ cssClass: "error", html:  elog});
	      }
	      else{
		$.notifyBar({ cssClass: "success", html: xml.responseText });
		document.location.reload(true);
	      }
	    }
	  });    
      });
    
  });
