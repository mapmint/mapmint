#import mapfile.service as mms
/*zoomTo slider*/
var numzoomlevels = map.getNumZoomLevels();
System.slider = \$('span.slider').slider({
    orientation: "vertical",
    range: "min",
    animate: true,
    min: System.initZoomLevel/*-1*/,
    max: numzoomlevels,
    value: map.getZoom(),
    step: 1,
    slide: function(event, ui) {
        map.zoomTo(ui.value);
    },
    change: function(event, ui) {
        map.zoomTo(ui.value);
    }
}).hover(function(){
#if $mms.getMetadata($m.web,'layout_t')!="mobile"
    \$('.ui-slider-vertical .ui-slider-handle').tipsy({live: true,title: function() { return (map.getZoom()); }, gravity: 'w'})
#end if
});

/*zoom controls*/
\$('a.zoomTo_in').click(function(ev){
    ev.stopPropagation();
    ev.preventDefault();
    var tmp=System.slider.slider("option",'value');
    System.slider.slider("option",'value', tmp + 1);
    return false;
});
\$('a.zoomTo_out').click(function(ev){
    ev.stopPropagation();
    ev.preventDefault();
    var tmp=System.slider.slider('option','value');
    System.slider.slider('option','value', tmp - 1);
    return false;
});
