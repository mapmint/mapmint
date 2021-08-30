#import zoo
#import mapscript
#import mapfile.service as mms
System.TimelinedLayers=[];
#for i in range(0,$m.numlayers)
#set timelinr=False
#if $mms.getMetadata($m.getLayer($i),'mmClass')=="tl"
#set l=$m.getLayer($i)
System.TimelinedLayers.push("$l.name");
#set cid=$i
#try
#if 'prefix' in $inputs.keys()
#if not(timelinr)
#set m0=mapscript.mapObj($conf["main"]["dataPath"]+"/public_maps/project_indicateurs.map")
#set cid+=m0.numlayers
#set timelinr=True
#end if
layersList[$cid].url=msUrl+"?map=$conf["main"]["dataPath"]/indexes_maps/timeline_PIndex$(conf["senv"]["last_index"])_$(l.name.replace(".","_"))_step0.map";
#else
layersList[$cid].url=msUrl+"?map=$conf["main"]["dataPath"]/public_maps/timeline_$(conf["senv"]["last_map"])_$(l.name)_step0.map";
#set m0=None
#end if
#except
layersList[$cid].url=msUrl+"?map=$conf["main"]["dataPath"]/public_maps/timeline_$(conf["senv"]["last_map"])_$(l.name)_step0.map";
#set m0=None
#end try
#if ($m0 and $mms.getMetadata($m0.web,'layout_t')=="natureparif-indicateurs") or ($mms.getMetadata($m.web,'mmActivatedLayers') and $mms.getMetadata($m.web,'mmActivatedLayers').count($l.name)>0)
layersList[$cid].redraw(true);
#end if
#end if
#end for

System.protected=false;
map.events.register('changelayer', null, function(evt){
    if(evt.property === "visibility") {
	if(System.protected)
	    return;
	for(var i=0;i<System.TimelinedLayers.length;i++)
	    if(evt.layer.name==System.TimelinedLayers[i]){
		if(evt.layer.visibility){
		    \$("#timeliners").show();
		    System.protected=true;
		    for(var j=0;j<System.TimelinedLayers.length;j++)
			if(evt.layer.name!=System.TimelinedLayers[i]){
			    for(var k=0;k<layersList.length;k++){
				if(layersList[k].local_id==System.TimelinedLayers[j]){
				    layersList[k].setVisibility(false);
				}				       
			    }
			}
		    System.protected=false;
		}
		else{
		    \$("#timeliners").hide();
		}
		break;
	    }
    }
});

#if $timelinr
\$("#timelineindexes_view_idx$(conf["senv"]["last_index"])").show();
\$("#0step0").click();
#end if
