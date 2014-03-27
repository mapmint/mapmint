#encoding UTF-8
  points_layer = new OpenLayers.Layer.Vector("points");
  points_layer.styleMap=new OpenLayers.StyleMap({pointRadius: 14,graphicYOffset: -24,graphicXOffset: -6,'externalGraphic': '$conf['main']['publicationUrl']/img/design/drapeau_noir.png'});
  points_layer.styleMap.addUniqueValueRules("default", "type", lookup);

#if $m.web.metadata.get('layout_t')!="mobile"
  points_layer.events.on({
    featureadded: function(e) {
	var tmpFeature=e.feature.clone();
	tmpFeature.attributes["idPoint"]=this.features[this.features.length-1].attributes["idPoint"];
	System.hover.styleMap["select"]=System.hover.styleMap["default"];
	System.hover.addFeatures([tmpFeature]);
    },
    featureremoved: function(e){
	for(i=0;i<System.hover.features.length;i++){
	    if(System.hover.features[i].data["idPoint"]==e.feature.attributes["idPoint"])
		System.hover.removeFeatures([System.hover.features[i]]);
	}
    }
  });
#end if

  route_layer1 = new OpenLayers.Layer.Vector("route1",{
      styleMap: new OpenLayers.StyleMap(new OpenLayers.Style({
	  strokeColor: "red",
	  strokeWidth: 16
      }))
  });

  points_layer1 = new OpenLayers.Layer.Vector("points1");
  points_layer1.styleMap=new OpenLayers.StyleMap({pointRadius: 24,'externalGraphic': '$conf['main']['publicationUrl']/img/design/velo_orange.png'});
  

  map.addLayers([points_layer,route_layer1,points_layer1]);

  draw_points = new DrawPoints(points_layer);
  //drag_points = new OpenLayers.Control.DragFeature(points_layer, {
  OpenLayers.Control.DragFeature.prototype.overFeature = function(feature) {
        var activated = false;
        if(!this.handlers.drag.dragging) {
            this.feature = feature;
	    //alert(" id point : "+this.feature.data["idPoint"]);
            this.handlers.drag.activate();
            activated = true;
            this.over = true;
            if (this.feature.data["idPoint"]) {
                OpenLayers.Element.addClass(this.map.viewPortDiv, this.displayClass + "Over");
            }
            this.onEnter(feature);
        } else {
            if(this.feature.data["idPoint"] == feature.data["idPoint"]) {
                this.over = true;
            } else {
                this.over = false;
            }
        }
        return activated;
    }
  drag_points = new OpenLayers.Control.DragFeature(System.hover, {
      autoActivate: false,
      onStart: function(feature,pixel){
	  if(!feature.data["idPoint"]){
	      drag_points.handlers.drag.deactivate();
	      return false;
	  }
      },
      onDrag: function(feature,pixel){
	  if(feature.data["idPoint"]){
	      for(i=0;i<points_layer.features.length;i++){
		  //alert(points_layer.features[i].attributes["idPoint"]+"=="+feature.data["idPoint"]);
		  if(points_layer.features[i].attributes["idPoint"]==feature.data["idPoint"]){
		      //points_layer.removeFeatures([points_layer.features[i]]);
		      //points_layer.addFeature(feature.clone());
		      var newPoint = new OpenLayers.LonLat(feature.geometry.x,feature.geometry.y);
		      points_layer.features[i].move(newPoint);
		      //points_layer.refresh();
		      //alert(feature.geometry.x+","+feature.geometry.y);
		      //
		      //
		      //alert(newPoint);
		      //points_layer.refresh();
		  }
	      }
	  }
	  else
	      return false;
      }
  });
  drag_points.onComplete = function() {
#if $m.web.metadata.get('layout_t')!="mobile"
      mmGeocode(draw_points,arguments[0]);
      pgrouting( points_layer );
#end if
  };

drag_points.handlers['drag'].stopDown = false;
drag_points.handlers['drag'].stopUp = false;
drag_points.handlers['drag'].stopClick = false;
drag_points.handlers['feature'].stopDown = false;
drag_points.handlers['feature'].stopUp = false;
drag_points.handlers['feature'].stopClick = false;

  
  mapControls["draw_points"]=draw_points;
  mapControls["drag_points"]=drag_points;
  map.addControls([draw_points, drag_points]);
#if $m.web.metadata.get('layout_t')=="mobile"
  toggleControl({name: "pan"});
#else
  displayRoadmap(-1);
  startSearch1("adresseLieu");
  startSearch1("adresseDepart");
  startSearch1("adresseArrivee");
  startSearch1("adresseDepart_rayon");
  startSearch1("adresseDepart_temps");
  startSearch1("adresseDepart_theme");
  startSearch1("adresseArrivee_theme");
  \$("#profileInfo").tipsy({gravity: "nw"});
#end if



