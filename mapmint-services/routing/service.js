function computeRouteProfile(conf,inputs,outputs){
  var myOutputs= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'routing.doUnion');
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  alert("*********** Parse error",myExecuteResult);
 
  var myOutputs1= {"Profile": { type: 'ResponseDocument', "mimeType": "application/json", "asReference": "true" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'routing.GdalExtractProfile');
  inputs["RasterFile"]={"value":"topofr.tif","dataType":"string"}
  var geom=false;
  var json=new ZOO.Format.GeoJSON();
  try{
    var tmp=json.read(myExecuteResult);
    geom=tmp[0].geometry;
  }catch(e){
    alert("*********** Parse error",e);
  }

  if(geom)
    inputs["Geometry"]={"value": json.write(geom),"dataType":"string"}
  else
    inputs["Geometry"]={"value": myExecuteResult,"dataType":"string"}
  var myExecuteResult1=myProcess1.Execute(inputs,myOutputs1);

    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult1, "mimeType": "text/xml"}} };
}
