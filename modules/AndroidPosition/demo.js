function setLocation(conf,inputs,outputs){
  var zoo_url=conf["main"]["serverAddress"];
  var myProcess = new ZOO.Process(zoo_url,'modules.AndroidPosition.defineLocation');
  var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  myExecuteResult1=myProcess.Execute(inputs,myOutputs1,"Cookie: MMID="+inputs["MMID"]["value"]+";");
  outputs["Result"]["value"]="Done ("+myExecuteResult1+")";
  return {"result": ZOO.SERVICE_SUCCEEDED, "outputs": outputs};
}
