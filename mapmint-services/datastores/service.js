var zoo_url;

function mmVectorInfo2MapJs(conf,inputs,outputs){
    var myInputs=inputs;
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    zoo_url=conf["main"]["serverAddress"]+"?metapath=mapfile";
    var myProcess = new ZOO.Process(zoo_url,'mmDataStoreHasMap');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs,"Cookie: MMID="+conf["senv"]["MMID"]+";");
    alert("ok",myExecuteResult);
    var myExecuteResult1;
    if(!eval(myExecuteResult)){
	var myInputs1=inputs;
	myInputs1["dataSource"]=myInputs1["dataStore"];
	zoo_url=conf["main"]["serverAddress"]+"?metapath=vector-tools";
	var myProcess = new ZOO.Process(zoo_url,'mmVectorInfo2Map');
	var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "text/xml" }};
	myExecuteResult1=myProcess.Execute(myInputs1,myOutputs1,"Cookie: MMID="+conf["senv"]["MMID"]+";");
	alert(myExecuteResult1);
	return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result":{"mimeType":"text/xml","encoding":"utf-8","value":myExecuteResult1}} };
    }
    zoo_url=conf["main"]["serverAddress"]+"?metapath=mapfile";
    var myProcess = new ZOO.Process(zoo_url,'mmVectorInfo2MapPy');
    myExecuteResult1=myProcess.Execute(myInputs,myOutputs,"Cookie: MMID="+conf["senv"]["MMID"]+";");
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result":{"mimeType":"text/xml","encoding":"utf-8","value":myExecuteResult1}} };
}

