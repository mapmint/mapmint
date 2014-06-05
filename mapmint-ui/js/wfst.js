var efeature;
function getInsertRequest(){
  query='<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0" service="WFS"><wfs:Insert><'+System.mmNodeId+'>';
  for(var i=0;i< System.layerFields.length;i++){
    try{
      if(document.getElementById("l_"+System.layerFields[i]).value!="")
      query+='<'+System.layerFields[i]+'>'+document.getElementById("l_"+System.layerFields[i]).value+'</'+System.layerFields[i]+'>';
      document.getElementById("l_"+System.layerFields[i]).value="";
    }catch(e){/*alert(i+" "+e);*/}
  }
  try{
    var toto=new OpenLayers.Format.GML();
    var toto1=toto.buildGeometryNode(editable.features[0].geometry);
    var str=(new XMLSerializer()).serializeToString(toto1);
    query+='<msGeometry>'+str+'</msGeometry>';
  }catch(e){alert(e);}
  query+='</'+System.mmNodeId+'></wfs:Insert></wfs:Transaction>';
  editMode='NONE';
  mapControls.select=tselect;//new OpenLayers.Control.SelectFeature(wfsPolygon, {callbacks: {'click':feature_info}});
  map.addControl(mapControls.select);
  mapControls.select.activate();
  return query;
}

function getUpdateRequest(){
  query='<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0" service="WFS"><wfs:Update typeName="'+System.mmNodeId+'">';
  for(var i=0;i<System.layerFields.length;i++){
    try{
      query+='<wfs:Property><wfs:Name>'+System.layerFields[i]+'</wfs:Name><wfs:Value>'+$("#fe_"+System.layerFields[i])[0].value+'</wfs:Value></wfs:Property>';
    }catch(e){/*alert(i+" "+e);*/}
  }
  try{
    var toto=new OpenLayers.Format.GML();

    var toto1=toto.buildGeometryNode(finalLayers[2].features[0].geometry);
    var str=(new XMLSerializer()).serializeToString(toto1);
    query+='<wfs:Property><wfs:Name>msGeometry</wfs:Name><wfs:Value>'+str+'</wfs:Value></wfs:Property>';
  }catch(e){alert(e);}
  query+='<ogc:Filter><ogc:FeatureId fid="'+System.mmNodeId+'.'+efeature.attributes[System.layerFields[0]]+'" /></ogc:Filter>';
  query+='</wfs:Update></wfs:Transaction>';
  return query;
}

function getDeleteRequest(){
  query='<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0" service="WFS"><wfs:Delete typeName="'+System.mmNodeId+'">';
  query+='<ogc:Filter><ogc:FeatureId fid="'+System.mmNodeId+'.'+efeature.attributes[System.layerFields[0]]+'" /></ogc:Filter>';
  query+='</wfs:Delete></wfs:Transaction>';
  return query;
}


var editMode='Update';
function saveWFST(){

  query=editMode=='Insert'?getInsertRequest():editMode=='Delete'?getDeleteRequest():getUpdateRequest();

  pre_query='<wps:Execute service="WPS" version="1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ../wpsExecute_request.xsd"><ows:Identifier>wfs-t.Transaction</ows:Identifier><wps:DataInputs><wps:Input><ows:Identifier>Request</ows:Identifier><ows:Title>Playground area</ows:Title><wps:Data><wps:ComplexData mimeType="text/xml">';

  post_query='</wps:ComplexData></wps:Data></wps:Input><wps:Input><ows:Identifier>MapFile</ows:Identifier><ows:Title>Distance which people will walk to get to a playground.</ows:Title><wps:Data><wps:LiteralData>'+$("#mapName")[0].value+'</wps:LiteralData></wps:Data></wps:Input></wps:DataInputs><wps:ResponseForm><wps:RawDataOutput><wps:Output><ows:Identifier>Result</ows:Identifier></wps:Output></wps:RawDataOutput></wps:ResponseForm></wps:Execute>';

  var request = new OpenLayers.Request.XMLHttpRequest();
  request.open('POST',System.zooUrl,true);
  request.setRequestHeader('Content-Type','text/xml');
  /*request.onreadystatechange = function() {
    if(request.readyState == OpenLayers.Request.XMLHttpRequest.DONE) {
      wfsPolygon.refresh();
    }
    }*/
  request.send(pre_query+query+post_query);
  try{
    $("#dialog").dialog("close");
    for(var i in System.layerFields){
      try{
        $("#fe_"+i).value="";
      }catch(e){/*alert(i+" "+e);*/}
    }
  }catch(e){}

}
