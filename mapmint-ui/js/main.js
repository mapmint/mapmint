System.libpath="http://localhost/mm-trunk/mapmint-ui//js/";
System.require("MLayout");
System.require("Dashboard");
System.require("Territories");

System.require("Datawarehouse");
System.require("Styler");
System.require("Mapmanager");
System.shouldStart=true;

var layouts=[];
var cLayout=null;

function showInnerLayout ( name ) {
  cLayout=layouts[0];
  var altName=cLayout.name;
  for(var i=0;i<layouts.length;i++){
    if(name != layouts[i].name){
      altName = layouts[i].name;
      $( "#"+altName+"_button" )[0].parentNode.className="current";
      $( "#"+ altName ).hide();	// hide OTHER layout container
    }
    else
      cLayout=layouts[i];
  }
  
  $( "#"+name+"_button" )[0].parentNode.className="dashboard";
  if($( "#"+ name ).length==1)
    $( "#"+ name ).show();		// show THIS layout container

  // if layout is already initialized, then just resize it
  if(cLayout.layout)
    cLayout.layout.resizeAll();


  if($("#"+name).length==0){
    $('#progress_bar .ui-progress .ui-label').hide();
    $.ajax({
      type: "GET",
      url: System.libpath+"../layouts/"+name+".xml",
      dataType: "xml",
      complete: function(xml,status) {
	  $('#progress_bar .ui-progress').css('width', '65%');
	  $(".ui-layout-center").append(xml.responseText);
	  $('#progress_bar .ui-progress').css('width', '85%');
	  $('#progress_bar .ui-progress').css('width', '95%');
	  $('#'+name).css('height', '100%');
	  cLayout.layout=$('#'+name).layout( cLayout.layoutOptions );
	  cLayout.initialize();
	  //showInnerLayout(name);
	  $('#progress_bar .ui-progress').animateProgress(100, function() {
	  	$('#progress_bar .ui-progress').fadeOut(1000);
	  	});
	}
      });

  }


  cLayout.refresh();
  $('a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
    $('.ui-layout-toggler').tipsy({fade: true, offset:3, opacity: 1, gravity: 'w'});
    $('.toolbar a').tipsy({fade: true, offset:3, opacity: 1, gravity: 'nw'});
 

};

function resizeInnerLayout () {
  for(var i=0;i<layouts.length;i++)
    if(layouts[i].layout && $("#"+layouts[i].name).is(":visible"))
      layouts[i].layout.resizeAll();
};

function updateSize(){
  var li=0;
  for(var l in layouts){
    if(layouts[l].updateSize){ 
      try{
	layouts[l].updateSize();
      }catch(e){alert(e);}
    }
    li++;
  }
 }

$(document).ready(function () { 
    System.start=function(){
      outerLayout = $('body').layout({ 
	  //	resizable:				false
	  //,	closable:				false
	spacing_closed:			0
	    ,	spacing_open:			4
	    ,	south__size:			40
	    ,   south__spacing_open:0
	    ,   south__spacing_closed:0
	    ,	south__resizable:		false	// OVERRIDE the pane-default of 'resizable=true'
	    
	    ,	south__slidable:		false	
	    ,	south__closable:		false
	    ,	north__size:			100
	    ,	north__slidable:		false
	    ,   north__spacing_open:0
	    ,   north__spacing_closed:0
	    ,	north__closable:		false
	    , 	north__resizable:		false
	    ,	north__showOverflowOnHover:	true
	    ,	north__togglerLength_closed: '100%'	// toggle-button is full-width of resizer-bar
,center__showOverflowOnHover:     true	    
,	center__onresize:		resizeInnerLayout
 	    ,	resizeWhileDragging:	true
	    ,	triggerEventsWhileDragging: false
	    ,	onopen: function() {updateSize();}
	    ,   onclose: function() {updateSize();}
	    ,   onresize: function() {updateSize();}
	    });
      layouts=[new Dashboard("Dashboard")];

  $('.inner-center').html('<p><img src="../images/ajax-loader.gif" width="220" height="19" /></p>');
  showInnerLayout( "Dashboard" );
      
      for(var i=0;i<layouts.length;i++){
	$("#"+layouts[i].name+"_button").click( showInnerLayout.mbindWithArg($('testing'),layouts[i].name) );
      }
    }
    
    
    System.ensure_included();
  }); 


