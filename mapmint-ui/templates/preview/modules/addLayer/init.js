var WMSLayers=[];
function mmAddWMSLayers(){
    var nodes=\$("#wms_list").tree('getChecked');
    var tmp={"text":""}
    var layers="";
    var legend=[];
    for(i in nodes)
        if(nodes[i]["id"]){
            if(layers!="")
                layers+=",";
            layers+=nodes[i]["id"];
            tmp=\$("#wms_list").tree('getParent',nodes[i].target);
            legend.push({
                "id": "layer_"+i+"_"+(layersList.length),
                "text": nodes[i]["text"],
                "children": \$("#wms_list").tree('getChildren',nodes[i]["target"])
            });
            \$("#wms_list").tree('uncheck',nodes[i].target);
        }
    \$("#layers_list").tree('append',{
        parent: \$("#layers_list").tree('getRoot').target,
        data:[
            {
                "id": "layer_"+(layersList.length),
                checked: true,
                text: '<a href="#" class="sdelete" onclick="removeOverlays(\$(this));"></a>'+System.messages["WMS Layers"]+" "+(WMSLayers.length+1),
                children: legend
            }
        ]
    });
    WMSLayers[WMSLayers.length]=new OpenLayers.Layer.WMS(
        "WMS Layers "+(WMSLayers.length+1),
        msUrl+"?map="+System.dataPath+"/WMS/"+tmp.text+"ds_ows.map",
        {layers: layers,format: "image/png"},
        {useCanvas: System.useCanvas,isBaseLayer: false}
    );
    WMSLayers[WMSLayers.length-1].setVisibility(true);
    map.addLayer(WMSLayers[WMSLayers.length-1]);
    layersList[layersList.length]=WMSLayers[WMSLayers.length-1];
    if(System.fullList.length>0)
        System.fullList.push({name: layersList[layersList.length-1].name, id: (layersList.length-1),text: "WMS Layers "+(WMSLayers.length)});
}

