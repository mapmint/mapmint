$(document).ready(function () {
myLayout = $('body').layout({
		north__minSize:60,
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
	
	bkLib.onDomLoaded(function() { nicEditors.allTextAreas() });
	
$('div.ui-layout-resizer-west div.ui-layout-toggler').before('<span class="close-inv" onclick="myLayout.open(\'west\')" title="Open"></span>');

			$("#demo5").paginate({
				count 		: 10,
				start 		: 1,
				display     : 5,
				border					: true,
				border_color			: '#fff',
				text_color  			: '#fff',
				background_color    	: '#808080',	
				border_hover_color		: '#ccc',
				text_hover_color  		: '#000',
				background_hover_color	: '#fff', 
				images					: false,
				mouse					: 'press',
				onChange     			: function(page){
											$('._current','#paginationdemo').removeClass('_current').hide();
											$('#p'+page).addClass('_current').show();
										  }
			});
			
$('.styleswitch').bind('click',
	 function(e){
	   $.stylesheetSwitch(this.getAttribute('rel'));
	   return false;
	 }
);

$(function(){
		$('#file').customFileInput();	
});

  $(function() {    

   $('#font-colorpicker').colorPicker();
  });
	
$.jGrowl.defaults.pool = 3;
	
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
});



                







