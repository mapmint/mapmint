function searchTable(){
    System.tableName=arguments[0];
    $( "#"+arguments[0]+"_search" ).autocomplete({
	source: function(request,response){
	    $.ajax({
		type: "GET",
		url: System.zooUrl+"?metapath=mapfile&service=WPS&version=1.0.0&request=Execute&identifier=searchByName&DataInputs=tbl="+System.tableName+";val="+request.term+"&RawDataOutput=Result",
		success: function(xml,status){
		    var data=xml;
		    response(data);
		}});
	},
	minLength: 0, 
	select: function( event, ui ) {
	    setCurrentMap(ui.item.id);
	}
    });
}

$(document).ready(function () {
    searchTable("project");
    defaultInit();
    $("#datasources_list").flexigrid({noSelection: true,rp: 4, usepager: false, resizable: false,height: ($(window).height()-480)});
    startUploadForm("Publisher");
    createEditor("mmDescription");

    $("#uploader_filelist").css({"height": ($(window).height()/14)+"px"});
    $(".plupload_droptext").css({"height": ($(window).height()/14)+"px","line-height": (($(window).height()/14)-40)+"px"});

    updateBaseLayersList();

    $(".map_extent").click(function(e){
	$('#form_move_map_'+this.id).css({'display':'block'})
	  });

myLayout = $('body').layout({
		north__minSize:80,
		north__closable:false,
		north__resizable:false,
		north__spacing_open:0,
		north__spacing_closed:0,
		north__showOverflowOnHover:	true,
		west__minSize: .28,
		west__resizable: false,
		west__spacing_closed: 20,
		east__minSize: .28,
		east__resizable: false,
		east__closable:false,
		south__closable:false,
		south__resizable:false,
		south__minSize:40,
	});
	
$('div.ui-layout-resizer-west div.ui-layout-toggler').before('<span class="close-inv" onclick="myLayout.open(\'west\')" title="Open"></span>');
 
 var localCnt=0;
 $(".map-page").each(function(){localCnt++;});
 if(localCnt>1){
   $("#maps-pager").paginate({
     count: localCnt,
	 start: 1,
	 display: 5,
	 border: true,
	 border_color: '#fff',
	 text_color: '#fff',
	 background_color: '#808080',	
	 border_hover_color: '#ccc',
	 text_hover_color: '#000',
	 background_hover_color	: '#fff', 
	 images: false,
	 mouse: 'press',
	 onChange: function(page){
	 $('._current').removeClass('_current').hide();
	 $('#p'+page).addClass('_current').show();
       }
     });
 }
			

$(function(){
		$('#file').customFileInput();	
});

  $(function() {    

   $('#font-colorpicker').colorPicker();
  });
		
$( "#nav li a" ).button();
$( "a.save-config" ).button();
$( ".nb-container p a" ).button();
	
$('.toolbar a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
$('.toolbar2 a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
	
function megaHoverOver(){
	$(this).find(".sub").stop().fadeTo('fast', 1).show();
			
	(function($) { 
		jQuery.fn.calcSubWidth = function() {
			rowWidth = 0;
				$(this).find("ul").each(function() {					
					rowWidth += $(this).width(); 
				});	
			};
	})(jQuery); 
		
	if ( $(this).find(".row").length > 0 ) {
			var biggestRow = 0;	
			$(this).find(".row").each(function() {							   
				$(this).calcSubWidth();
				if(rowWidth > biggestRow) {
					biggestRow = rowWidth;
			}
		});
		$(this).find(".sub").css({'width' :biggestRow});
		$(this).find(".row:last").css({'margin':'0'});
			
	} else { 
					
			$(this).calcSubWidth();
			$(this).find(".sub").css({'width' : rowWidth});	
		}
	}
	
function megaHoverOut(){ 
	  $(this).find(".sub").stop().fadeTo('fast', 0, function() {
		  $(this).hide(); 
	  });
	}

var config = {    
	sensitivity: 1,  
	interval: 50,  
	over: megaHoverOver, 
	timeout: 50,    
	out: megaHoverOut 
	};

$("ul li .sub").css({'opacity':'0'});
$("ul li").hoverIntent(config);
	
$('#progress_bar .ui-progress').animateProgress(100, function() {
                $('#progress_bar .ui-progress').fadeOut(1000);
 
                });
                
 $("#logout").click(function () {

$( "#logout-message" ).window({
	modal: true,
	    collapsible:false,
    minimizable:false,
    maximizable:false,
    draggable:false,
	resizable: false
		});
}); 
					  endLoading();
             
  });


$(function () {
	var tabContainers = $('div.tabs-project > div');
	tabContainers.hide().filter(':first').show();
	$('div.toolbar2 a').click(function () {
	    if($(this).is("._nothidable"))
	      ;
	    else{
		tabContainers.hide();
		tabContainers.filter(this.hash).show();
	      }
	}).filter(':first').click();
});
                




MapMintNavPriv={
    edit: function(){
	$.ajax({
	    url: "./UsersManagement/NavWindow",//"$conf["main"]["serverAddress"]?metapath=template&service=WPS&version=1.0.0&request=Execute&Identifier=display&DataInputs=tmpl=Publisher/confirmRemove&RawDataOutput=Result",
	    complete: function(xml,status){
		if(!$('#navPriv').length>0)
		    $("body").append('<div id="navPriv" title="'+System.messages["Navigation Toolbar"]+' '+System.messages["Privileges"]+'"></div>');
		$('#navPriv').html("");
		$('#navPriv').append(xml.responseText);
		$('#navPriv').window({
		    width: 500,
		    height: 320,
		    maximizable:false,
		    resizable: false
		});
		$("#mmAccessNav").flexigrid({noSelection: true,rp: 4, usepager: false, resizable: false,height: 220});
	    }
	})
    },
    confirm: function(){
	System.navAccess=[];
	System.navStr="";
	for(var i=0;i<arguments[0].length;i++){
	    System.navAccess[i]=[];
	    if(System.navStr!="")
		System.navStr+="|";
	    $(".mm_access_"+arguments[0][i]).each(function(){
		if(System.navStr!="" && System.navStr[System.navStr.length-1]!="|")
		    System.navStr+=",";
		if($(this).attr("checked")){
		    System.navStr+="1";
		    System.navAccess[i]+=[1]
		}
		else{
		    System.navAccess[i]+=[0]
		    System.navStr+="0";
		}
	    });
	}
	postRequest=[];
	postRequest[postRequest.length]={name:'priv',value: System.navStr,dataType: "string"};
	var data=WPSGetHeader("saveNavPrivileges")+WPSGetInputs(postRequest)+WPSGetOutput({name:"Result"})+WPSGetFooter();
	$.ajax({
            type: "POST",
	    url: System.zooUrl+"?metapath=mapfile",
	    data: data,
	    contentType: "text/xml",
	    complete: function(xml,status) {
		if(checkWPSResult(xml))
		    $('#navPriv').window('close');
	    }
	});	
    }
}
