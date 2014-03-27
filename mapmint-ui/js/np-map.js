var map, vectorLayer,osm;
var mybounds;
var wgs84,mercator;
function init(){
map = new OpenLayers.Map('map', 
  {
        controls: [],
    	displayProjection: new OpenLayers.Projection("EPSG:4326"),
    	projection: new OpenLayers.Projection("EPSG:900913"),
    	units: "m",
	maxExtent: mybounds
    }
 );
wgs84=new OpenLayers.Projection("EPSG:4326");
mercator=new OpenLayers.Projection("EPSG:900913");
mybounds = new OpenLayers.Bounds(1.44059549462,48.1108970807,3.56582363189,49.248280617).transform(wgs84,mercator);


    arrayOSM = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
    	          "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
         	  "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
         	  "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"];
    osm=new OpenLayers.Layer.OSM("MapQuest Streets", arrayOSM, {attribution: "Données <a href='http://www.mapquest.com/' target='_blank'><img src='http://developer.mapquest.com/content/osm/mq_logo.png' /> MapQuest</a>"});
    map.addLayer(osm);

            var style = new OpenLayers.StyleMap({
                "default": new OpenLayers.Style({
                    pointRadius: "${type}", // sized according to type attribute
                    fillColor: "#88B33A",
		cursor:"pointer",
		fillOpacity: 0.3,
                    strokeColor: "#6C5F59",
                    strokeWidth: 2,
                    graphicZIndex: 1
                }),
                "select": new OpenLayers.Style({
                    fillColor: "#E3682F",
			fillOpacity:0.5,
                    strokeColor: "#E31224",
strokeWidth:3,
                    graphicZIndex: 2
})
            });

var vectorLayer = new OpenLayers.Layer.Vector("Departements", {
    strategies: [new OpenLayers.Strategy.BBOX()],
    projection: wgs84,
    styleMap: style,
attribution: "<a href='http://data.un.org'>IGN GeoFLA &copy;</a>",
	protocol: new OpenLayers.Protocol.HTTP({
      url: "http://np.trial.mapmint.com/dep.json",
      format: new OpenLayers.Format.GeoJSON()
})
});
                map.addLayers([vectorLayer]);

                // OpenLayers.Control.Attribution is one of the default
                // controls - only needs to be added when the map instance is
                // created with the controls option
                //map.addControl(new OpenLayers.Control.Attribution());

var options = {
               hover: true,
               onSelect: function(feature) { 
		var ndp= feature.attributes.name;
		var nbr= feature.attributes.dep;
		$("#info").html("<h1 class='inf'>" + nbr + "<span>" + ndp + "</span></h1>");
		$("#info").show();
		},
		onUnselect:function() {
		$("#info").hide();
                } 

 }

var select = new OpenLayers.Control.SelectFeature(vectorLayer, options);
map.addControl(select);
select.activate();

$("#info").hide();
map.addControl(new OpenLayers.Control.Attribution());
map.zoomToExtent(mybounds);
map.zoomIn();

}



$(document).ready(function(){
	
	var items = $('#stage li'),
		itemsByTags = {};
	
	// Looping though all the li items:
	
	items.each(function(i){
		var elem = $(this),
			tags = elem.data('tags').split(',');
		
		// Adding a data-id attribute. Required by the Quicksand plugin:
		elem.attr('data-id',i);
		
		$.each(tags,function(key,value){
			
			// Removing extra whitespace:
			value = $.trim(value);
			
			if(!(value in itemsByTags)){
				// Create an empty array to hold this item:
				itemsByTags[value] = [];
			}
			
			// Each item is added to one array per tag:
			itemsByTags[value].push(elem);
		});
		
	});

	// Creating the "Everything" option in the menu:
	createList('Tout les thèmes',items);

	// Looping though the arrays in itemsByTags:
	$.each(itemsByTags,function(k,v){
		createList(k,v);
	});
	
    $('#filter a').click(function(e){
	var link = $(this);
	
	link.addClass('active').siblings().removeClass('active');
	
	// Using the Quicksand plugin to animate the li items.
	// It uses data('list') defined by our createList function:
		
	$('#stage').quicksand(link.data('list').find('li'));
	e.preventDefault();
    });
	
	$('#filter a:first').click();
	
	function createList(text,items){
		
		// This is a helper function that takes the
		// text of a menu button and array of li items
		
		// Creating an empty unordered list:
		var ul = $('<ul>',{'class':'hidden'});
		
		$.each(items,function(){
			// Creating a copy of each li item
			// and adding it to the list:
			
			$(this).clone().appendTo(ul);
		});

		ul.appendTo('#container');

		// Creating a menu item. The unordered list is added
		// as a data parameter (available via .data('list'):
		
		var a = $('<a>',{
			html: text,
			href:'#',
			data: {list:ul}
		}).appendTo('#filter');
	}
});
