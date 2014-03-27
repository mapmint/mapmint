
	var myLayout, middleLayout, innerLayout_Center, innerLayout_South; 

	$(document).ready(function () {
		

            
		myLayout = $('body').layout({
		west__showOverflowOnHover: true
		
		,	west__minSize:			300
		, 	west__onresize: 'middleLayout.resizeAll'

		,   center__onresize: 'middleLayout.resizeAll' 
		,	north__resizable:	false
		,	closable:				true	// pane can open & close
		,	resizable:				true	// when open, pane can be resized 
		,	slidable:				true	// when closed, pane can 'slide' open over other panes - closes on mouse-out
		,	north__slidable:		false	
		,	north__closable:		false
		,	north__showOverflowOnHover:	true
		,	north__togglerLength_closed: '100%'	// toggle-button is full-width of resizer-bar
		,	north__spacing_closed:	0		// big resizer-bar when open (zero height)
		,	south__resizable:		false	// OVERRIDE the pane-default of 'resizable=true'
		,	south__spacing_open:	0		// no resizer-bar when open (zero height)
		,	south__spacing_closed:	20		// big resizer-bar when open (zero height) 


		});
		
		middleLayout = $('.ui-layout-subcenter').layout({

			center__paneSelector:	".middle-center"
			,	center__initClosed:				false
			,   south__paneSelector:	".middle-south"
			,	south__size:				'10%'
			,	south__initClosed:				false
			,	spacing_open:			0	// ALL panes
			,	spacing_closed:			0 // ALL panes
		});
		
				

		 	});
