function createTempFile(conf,inputs,outputs){

  var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'dropTempFile');

  var inputs00={
    "fullPath": {"value": "true","type":"string"}
  }
  var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult00);

  var myOutputs0= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=mapfile",'getMapLayersInfo');

    map=inputs["map"]["value"];
    alert("MAP",inputs["map"]["value"]);
    var tmpDbName=map.split(':');
  var inputs0={
    "fullPath": {"value": "true","type":"string"},
    "layer": {"value": "-1","type":"string"}
  };
    if(tmpDbName.length>1)
	inputs0["map"]={"value": conf["main"]["dataPath"]+"/"+tmpDbName[0]+"/"+tmpDbName[1]+"ds_ows.map","type":"string"};
    else
	inputs0["map"]={"value": conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map","type":"string"};

  var myExecuteResult0=myProcess0.Execute(inputs0,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);
  var tmp=eval(myExecuteResult0.replace(/None/g,"null"));

  var myOutputs1= {OutputedDataSourceName: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-converter",'Ogr2Ogr');
  
  var inputs1={
    "OutputDSN": {"value": "temporary_index.csv","type":"string"},
    "InputDSN": {"value": tmp[0],"type":"string"},
    "overwrite": {"value": "true","type":"string"},
    "F": {"value": "CSV","type":"string"},
    "sql": {"value": inputs["sql"]["value"],"type":"string"}
  }
  var myExecuteResult1=myProcess1.Execute(inputs1,myOutputs1,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult1);

  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-tools",'mmVectorInfo2Map');

  var inputs2={
    "force": {"value": "true","type":"string"},
    "dataSource": {"value": conf["main"]["tmpPath"]+"/temporary_index.csv","type":"string"}
  }
  var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult2);

  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'setLastFile');

  var inputs2={
    "last_file": {"value": "temporary_index.csv","type":"string"}
  }
  var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult2);

  conf["senv"]["last_file"]=myExecuteResult2

  return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: {Result: {"value": myExecuteResult2}}};

}

function createIndex(conf,inputs,outputs){

  var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'dropTable');

  var inputs00={
    "id": {"value": inputs["id"]["value"],"type":"string"}
  }
  var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult00);

  var myOutputs0= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=mapfile",'getMapLayersInfo');

  var inputs0={
    "fullPath": {"value": "true","type":"string"},
    "layer": {"value": "-1","type":"string"},
    "map": {"value": conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map","type":"string"}
  }
  var myExecuteResult0=myProcess0.Execute(inputs0,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);
  var tmp=eval(myExecuteResult0.replace(/None/g,"null"));

  var myOutputs1= {OutputedDataSourceName: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-converter",'Ogr2Ogr');
  
  if(conf["senv"]["last_file"]=="None")
    conf["senv"]["last_file"]=conf["main"]["tmpPath"]+"/temporary_index.csv";
  var inputs1={
    "OutputDSN": {"value": tmp[0],"type":"string"},
    "InputDSN": {"value": conf["senv"]["last_file"],"type":"string"},
    "overwrite": {"value": "true","type":"string"},
    "F": {"value": "PostgreSQL","type":"string"},
    "nln": {"value": "indexes.idx_table_"+inputs["id"]["value"],"type":"string"},
    "sql": {"value": inputs["sql"]["value"],"type":"string"}
  }

  var myExecuteResult1=myProcess1.Execute(inputs1,myOutputs1,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult1);

  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'joinIndexTable');
  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var inputs2=inputs;
  for(i in inputs2)
    inputs2[i]["type"]=inputs[i]["dateType"];
  var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult2);

  return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: {Result: {"value": myExecuteResult2}}};

}

function refreshIndex(conf,inputs,outputs){
    if(inputs["force"]){
	var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=datastores/directories",'cleanup');
	var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var inputs00={
	    "dsName": {"value": conf["main"]["dbuserName"],"type":"string"},
	    "dsType": {"value": "postgis","type":"string"}
	}
	var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
	alert("refresh!!",myExecuteResult00);
    }else{
	var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'addLayerForIndex');
	var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var inputs00={
	    "id": {"value": inputs["id"]["value"],"type":"string"}
	}
	var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
	alert("refresh light !!",myExecuteResult00);	
    }

  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=datastores",'mmVectorInfo2MapJs');
  var inputs0={
    "dataStore": {"value": conf["main"]["dbuserName"],"type":"string"}
  }
  var myOutputs0= {
    "Result": { type: 'RawDataOutput', "mimeType": "application/json" }
  };
  var myExecuteResult0=myProcess0.Execute(inputs0,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);

  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-tools",'mmExtractVectorInfo');
  var inputs2={
    "dataSource": {"value": conf["main"]["dbuserName"],"type":"string"},
    "layer": {"value": "indexes.view_idx"+inputs["id"]["value"],"type":"string"}
  }
  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult2);

  return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: {Result: {"value": myExecuteResult2,"mimeType":"text/xml"}}};

}

function publishFullIndex(conf,inputs,outputs){

    var myOutputs= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=mapfile",'getMapLayersInfo');
    /**
     * Check what are the input DataStore and DataSource
     */
    var inputs1={
	"map": {"value": conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map","type":"string"},
	"fullPath": {"value": "true","type":"string"},
	"layer": {"value": "indexes.view_idx"+inputs["id"]["value"],"type":"string"}
    };
    
    var myExecuteResult1=myProcess.Execute(inputs1,myOutputs);
    tmp=eval(myExecuteResult1.replace(/None/g,null));
    alert(tmp);


    try{
    myOutputs= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" } };
    myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'getIndexDisplayJs');
    /**
     * Check what are the input DataStore and DataSource
     */
    inputs1={
	"id": {"value": inputs["id"]["value"],"type":"string"}
    };    
    myExecuteResult1=myProcess.Execute(inputs1,myOutputs);
    alert(myExecuteResult1);
    var fJ=new ZOO.Format.JSON();
    tmp0=fJ.read(myExecuteResult1.replace(/None/g,null));
    tmp0=tmp0["values"];
    var fields="";
    for(i=0;i<tmp0.length;i++){
	if(fields!="")
	    fields+=","
	fields+=tmp0[i]["name"]+' as "'+tmp0[i]["display"]+'"';
    }

    var myOutputs= {"OutputedDataSourceName": { type: 'RawDataOutput', "mimeType": "application/json" }};


    var exts=["kml","csv"]
    var formats=["KML","CSV"]
    for(j=0;j<formats.length;j++){
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-converter",'Ogr2Ogr');
	inputs["InputDSN"]={"value":tmp[0]};
	inputs["F"]={"value": formats[j]};
	inputs["sql"]={"value": "SELECT "+fields+", wkb_geometry from indexes.view_idx"+inputs["id"]["value"]};
	inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-"+inputs["id"]["value"]+"."+exts[j]};
	inputs["nln"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-"+inputs["id"]["value"]+""};	
	
	var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-converter",'cleanUp');
	inputs1={
	    "dso": {"value":inputs["OutputDSN"]["value"].replace(/.shp/g,""),"dataType":"string"},
	    "dstn": {"value":inputs["OutputDSN"]["value"].replace(/.shp/g,".zip"),"dataType":"string"}
	};
	myExecuteResult0=myProcess0.Execute(inputs1,myOutputs);

	var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    }
    }catch(e){
	alert(e);
    }

    myOutputs= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" } };
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'publishIndex');
    myExecuteResult=myProcess.Execute(inputs,myOutputs,"Cookie: MMID="+conf["senv"]["MMID"]); 

   
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
    
}

function convertTo(conf,inputs,outputs){
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=np",'getIndexRequest');
    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    var myExecuteResult0=myExecuteResult;

    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=mapfile",'getMapLayersInfo');
    inputs["map"]={"value": conf["main"]["dbuserName"]+"ds_ows.map"};
    inputs["layer"]={"value": "-1"};
    inputs["fullPath"]={"value": "true"};
    var myExecuteResult1=myProcess1.Execute(inputs,myOutputs);
    var tmp=eval(myExecuteResult1.replace('None','null'));
    
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-converter",'Converter');
    inputs["InputDSN"]={"value": tmp[0]};
    inputs["F"]={"value": "KML"};
    inputs["sql"]={"value": myExecuteResult};
    inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-1.kml"};
    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
}
