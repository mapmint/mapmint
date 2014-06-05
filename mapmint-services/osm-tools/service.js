function importOSMPoints(conf,inputs,outputs){
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'osm-tools.createShpFromOSMP');
  inputs["osm"]={type: "complex", xlink: conf["mm"]["osmApiUrl"]+"node[not(way)][bbox="+inputs["bbox"]["value"]+"]"};
  var myOutputs= {"Result": { type: 'RawDataOutput', "mimeType": "text/plain" } };
    alert(inputs["osm"]["xlink"]);
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult,"dataType": "string"} }};
}

function importOSMLines(conf,inputs,outputs){
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'osm-tools.createShpFromOSML');
  inputs["osm"]={type: "complex", xlink: conf["mm"]["osmApiUrl"]+"way[highway=*][bbox="+inputs["bbox"]["value"]+"]"};
  var myOutputs= {"Result": { type: 'RawDataOutput', "mimeType": "text/plain" } };
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult,"dataType": "string"} }};
}
