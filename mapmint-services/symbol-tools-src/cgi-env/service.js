function getSymbolChooser4TTF(conf,inputs,outputs){
  /*
   * Should be better to use xlink:href here rather than two services call
   */
  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};

  for(i in inputs)
    if(i=="ttf"){
	if(inputs["ttf"]["value"]!="images"){
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'symbol-tools.getSymbols');
	    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
	}
	inputs["ttf"].value=inputs["ttf"].value.replace(".TTF","").replace(".ttf","");
	if(inputs["ttf"]["value"]!="images")
	    inputs["charcodes"]={"value": myExecuteResult};
    }
  inputs["map"]={"value": conf["senv"]["last_map"]};
  inputs["tmpl"]={"value":"Manager/Styler/Symbols.sym.tmpl"};
  
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'symbol-tools.getAllSymbolsForTTF');
  var myExecuteResult1=myProcess1.Execute(inputs,myOutputs);

  return {result: 3, outputs: {"Result": {"value": myExecuteResult1, "mimeType": "text/html"} } }
}
