	if(baseLayers["mq"].length>=1){
	    for(i in baseLayers["mq"]){
		console.log(i);
		console.log(baseLayers["mq"][i]);
		var osm=new ol.layer.Tile({
		    name: "MapQuest_"+baseLayers["mq"][i],
		    attributions: "",
		    source: new ol.source.MapQuest({layer: baseLayers["mq"][i]})
		});
		myBL.push(osm);
	    }
	}

	if(baseLayers["mq"].length>=1){
	    for(i in baseLayers["mq"])
	    var osm=new ol.layer.Tile({
		style: 'Road',
		source: new ol.source.MapQuest({layer: 'osm'})
	    });
	    myBL.push(osm);
	}
	if(baseLayers["mq1"]==1){
	    var osm=new ol.layer.Tile({
		style: 'Aerial',
		source: new ol.source.MapQuest({layer: 'sat'})
	    });
	    myBL.push(osm);
	}
	
