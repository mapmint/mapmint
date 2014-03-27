MLayout=Class.create();
MLayout.define({
  _init: function(){
      //name: the id of DOM element representing the layout
      this.name=arguments[0];
    },
  layout: null,
  layoutOptions: {
      contentSelector: ".lcontent",
      center__paneSelector: ".inner-center",
      west__paneSelector:   ".inner-west",
      west__size:           .28,
      west__draggable:	  false,
      west__resizable:    false,
      east__paneSelector:   ".inner-east",
      east__size:           .28,
      east__closable:	      false,
      east__draggable:	  false,	
      spacing_open:         8,
      spacing_closed:       8,
      resizeWhileDragging:  true,
      onopen: function() {updateSize();},
      onclose: function() {updateSize();},
      onresize: function() {updateSize();}
    },
    
  initialize: function(){
    },
  refresh: function(){
 	$('.ui-layout-toggler').tipsy({fade: true, offset:3, opacity: 1, gravity: 'w'});
    }
  });
