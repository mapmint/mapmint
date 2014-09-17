var zoo_url;

function Buffer(inputData,bDist){

  // Create all required ZOO.formats
  var fJ=new ZOO.Format.JSON();
  var fGJ=new ZOO.Format.GeoJSON();
  var fWPS=new ZOO.Format.WPS();

  // Pass the value as json
  var myInputs = {InputPolygon: { type: 'complex', value: fGJ.write(inputData), mimeType: "application/json"}, BufferDistance: {type: 'float', "value": bDist } };  
  var myOutputs= {Result: { type: 'RawDatautput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(zoo_url,'vector-tools.BufferPy');
  var myExecuteResult=myProcess.Execute(myInputs,myOutputs);

  // Parse the result and extract JSON geometry
  alert(myExecuteResult);
  //var bufferResult=fWPS.read(myExecuteResult);
  var bufferResultAsGeoJSON=fJ.read(myOutputs);
  return fGJ.read(bufferResultAsGeoJSON);

}

function BufferWOParse(inputData,bDist){

  // Create all required ZOO.formats
  var fJ=new ZOO.Format.JSON();
  var fGJ=new ZOO.Format.GeoJSON();
  var fWPS=new ZOO.Format.WPS();

  // Pass the value as json
  var myInputs = {InputPolygon: { type: 'complex', value: fGJ.write(inputData), mimeType: "application/json"}, BufferDistance: {type: 'float', "value": bDist } };  
  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(zoo_url,'vector-tools.BufferPy');
  var myExecuteResult=myProcess.Execute(myInputs,myOutputs);

  // Parse the result and extract JSON geometry
  return myExecuteResult;

}

function BufferMask(conf,inputs,outputs){

  zoo_url=conf["main"]["serverAddress"];
  
  // Create all required ZOO.formats
  var fGJ=new ZOO.Format.GeoJSON();
  var fGML=new ZOO.Format.GML();
alert("ok",inputs["InputData"]["value"]);
  // Read the input GML
  var inputData=fGML.read(inputs["InputData"]["value"]);
alert("ok");

  // Compute big Buffer
  zoo_url=conf["main"]["serverAddress"];
  var bufferResultAsJSON=Buffer(inputData,2.5);

  // Create the Buffer result BBOX 
  var bbox = new ZOO.Bounds();
  var bounds=bufferResultAsJSON[0].geometry.getVertices();
  for(var t in bounds){
    bbox.extend(bounds[t]);
  }
  var finalG=bbox.toGeometry();

  // Compute Buffer standard buffer
  var bufferResultAsJSON=BufferWOParse(inputData,inputs["BufferDistance"]["value"]);
  
  // Request Difference service using Buffer result and features in the BBOX
  var result=new ZOO.Feature(finalG,{"fid": "1","name": "Result1000"});  
  var myProcess2 = new ZOO.Process(zoo_url,'+"vector-tools.DifferencePy');
  var myInputs2 = {InputEntity1: { type: 'complex',  value: fGJ.write(bbox.toGeometry()), mimeType: "application/json" }, InputEntity2: { type: 'complex',  value: bufferResultAsJSON, mimeType: "application/json"} };
  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" } };
  var myExecuteResult4=myProcess2.Execute(myInputs2,myOutputs2);

  return {result: ZOO.SERVICE_SUCCEEDED, outputs: [ {name:"Result", mimeType: "application/json", value: myExecuteResult4} ] };

}

function SpatialQuery(conf,inputs,outputs){
  zoo_url=conf["main"]["serverAddress"];
  
  // Create all required ZOO.formats
  var fGJ=new ZOO.Format.GeoJSON();
  var fGML=new ZOO.Format.GML();

  // Read the input GML
  var inputData=fGML.read(inputs["InputData"]["value"]);

  // Compute Buffer
  zoo_url=conf["main"]["serverAddress"];
  var bufferResultAsJSON=BufferWOParse(inputData,inputs["BufferDistance"]["value"]);

  // Create the Buffer result BBOX 
  var myProcess3 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.EnvelopePy');
  var myInputs3 = {InputPolygon: { type: 'complex',  value: bufferResultAsJSON, mimeType: "application/json"}};
  var myOutputs3= {Result: { type: 'RawDataOutput', "mimeType": "application/json" } };
  var myExecuteResult3=myProcess3.Execute(myInputs3,myOutputs3);

  var data=myExecuteResult3;
    alert(data);
  data = data.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
  data = new XML(data);

  var lc = data..*::LowerCorner;
  lc=lc.split(' ');

  var uc = data..*::UpperCorner;
  uc=uc.split(' ');
  
  // Request Intersection service using Buffer result and WFS request using the
  // BBOX
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.IntersectionPy');
  var myInputs2 = {InputEntity1: { type: 'complex',  value: bufferResultAsJSON, mimeType: "application/json"}, InputEntity2: { type: 'complex',  xlink: conf["main"]["mapserverAddress"]+"?map="+conf["main"]["dataPath"]+"/public_maps/project_"+conf["senv"]["last_map"]+".map&amp;SERVICE=WFS&amp;version=1.0.0&amp;request=GetFeature&amp;typename="+inputs["layer"]["value"]+"&amp;SRS=EPSG:4326&amp;BBOX="+lc[0]+","+lc[1]+","+uc[0]+","+uc[1], mimeType: "text/xml" } };
  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": outputs["Result"]["mimeType"] } };
  var myExecuteResult4=myProcess2.Execute(myInputs2,myOutputs2);

  return {result: ZOO.SERVICE_SUCCEEDED, outputs: [ {name:"Result", mimeType: outputs["Result"]["mimeType"], value: myExecuteResult4} ] };

}


