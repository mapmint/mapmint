/***
@title:
Fixed Center

@version:
1.3

@author:
David Tang

@date:
2010-12-06 - performance issues update
2010-06-27 - updated plugin to use fixed positioning instead of absolute
2010-06-17 - released version 1 of the plugin

@url
www.david-tang.net

@copyright:
2010 David Tang

@requires:
jquery

@does:
This plugin centers an element on the page using fixed positioning and keeps the element centered 
if you scroll horizontally or vertically.

@howto:
jQuery('#my-element').fixedCenter(); would center the element with ID 'my-element' using absolute positioning 

*/
(function(){
	jQuery.fn.fixedCenter = function(){
		return this.each(function(){
			var element = jQuery(this), win = jQuery(window);
			centerElement();
			
			jQuery(window).bind('resize',function(){
				centerElement();
			});

			function centerElement(){
				var elementWidth, elementHeight, windowWidth, windowHeight, X2, Y2;
				elementWidth = element.outerWidth();
				elementHeight = element.outerHeight();
				windowWidth = win.width();
				windowHeight = win.height();	
				X2 = (windowWidth/2 - elementWidth/2) + "px";
				Y2 = (windowHeight/2 - elementHeight/2) + "px";
				jQuery(element).css({
					'left':X2,
					'top':Y2,
					'position':'fixed'
				});						
			} //centerElement function
		});
	}
})();
