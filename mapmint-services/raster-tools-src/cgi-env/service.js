function createTindex(conf,inputs,outputs){
  
  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.tindex');
  inputs["iname"]["value"]="tile_"+inputs["iname"]["value"];
  inputs["dir"]["value"]=inputs["dir"]["value"].replace(conf["main"]["dataPath"]+"/ftp/","")
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);

  alert(myExecuteResult);

  inputs["InputDSTN"]={"value": conf["main"]["dataPath"]+"/dirs/"+inputs["idir"]["value"]}
  inputs["InputDSON"]={"value": inputs["iname"]["value"]}
  inputs["a_srs"]=inputs["srs"];
  inputs["a_srs"]["value"]="+init="+inputs["a_srs"]["value"];
  inputs["OutputDSN"]={"value": "TEMP_"+inputs["iname"]["value"]}

  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myExecuteResult1=myProcess1.Execute(inputs,myOutputs1);

  
  alert(myExecuteResult1);

  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.copyTileIndex');
  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myExecuteResult2=myProcess2.Execute(inputs,myOutputs2);

  alert(myExecuteResult2);

    return {result: 3, outputs: {"Result": {"value": ZOO._("TileIndex file created")}}};
}
