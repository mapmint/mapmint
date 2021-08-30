function addFeatureId(conf,inputs,outputs){
  alert(inputs);
  var myOutputs= {Result: { type: 'ResponseDocument', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  alert(conf["main"]["dataPath"]);
  inputs["InputDSTN"]["value"]=inputs["InputDSTN"]["value"].replace(/conf["main"]["dataPath"]/,"");
  inputs["sql"]={"value": "SELECT fid AS MMID, * from "+inputs["InputDSON"]["value"]};
  inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-1.SHP"};
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  
  alert(myExecuteResult);

  var myOutputs1= {Result: { type: 'ResponseDocument', "mimeType": "application/json" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.saveLayer');
  alert(conf["main"]["dataPath"]);
  inputs["InputDSTN"]["value"]=inputs["InputDSTN"]["value"];
  inputs["InputDSN"]={"value": ""};
  inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+".SHP"};
  inputs["MMID"]={"value": conf["senv"]["MMID"]};
  var myExecuteResult1=myProcess1.Execute(inputs,myOutputs1);

  alert(myExecuteResult1);

  return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": "Map Update"}} };
}

function ConverterJs(conf,inputs,outputs){
  alert(inputs);
  var myOutputs= {Result: { type: 'ResponseDocument', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  alert(conf["main"]["dataPath"]);
  inputs["InputDSTN"]["value"]=inputs["InputDSTN"]["value"].replace(/conf["main"]["dataPath"]/,"");
  inputs["sql"]={"value": "SELECT fid AS MMID, * from "+inputs["InputDSON"]["value"]};
  inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-1.SHP"};
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  
  alert(myExecuteResult);

  var myOutputs1= {Result: { type: 'ResponseDocument', "mimeType": "application/json" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.saveLayer');
  alert(conf["main"]["dataPath"]);
  inputs["InputDSTN"]["value"]=inputs["InputDSTN"]["value"];
  inputs["InputDSN"]={"value": ""};
  inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+".SHP"};
  inputs["MMID"]={"value": conf["senv"]["MMID"]};
  var myExecuteResult1=myProcess1.Execute(inputs,myOutputs1);

  alert(myExecuteResult1);

  return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": "Map Update"}} };
}

function convert1(conf,inputs,outputs){
  var myOutputs= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
  /**
   * Check what are the input DataStore and DataSource
   */
  var inputs1={
      "map": {"value": inputs["dst_in"]["value"],"type":"string"},
      "fullPath": {"value": "true","type":"string"},
      "layer": {"value": inputs["dso_in"]["value"],"type":"string"}
  };
  var myExecuteResult1=myProcess.Execute(inputs1,myOutputs);
  alert(myExecuteResult1);
  var tmp1;
  try{tmp1=eval(myExecuteResult1.replace(/None/g,"null"));}
  catch(e){
      conf["lenv"]["message"]="Error occured: "+e;
      alert(e);
      return {result: ZOO.SERVICE_FAILED, conf: conf}
  }
  /**
   * Take care of encoding system defined for the input data to add
   * PGCLIENTENCODING or OGR_FORCE_ASCII when needed.
   */
    alert(tmp1[2]);
  if(tmp1[2]=="iso-8859-15" || tmp1[2]=="iso-8859-1" ){
      var input1={"section": {"value":"env","type":"string"}};
      for(i in conf["env"]){
	  input1[i]={"value": conf["env"][i],"type":"string"};
      }
      if(inputs["dso_f"]["value"]=="PostgreSQL")
	  input1["PGCLIENTENCODING"]={"value": "Latin1","type":"string"};
      else
	  input1["OGR_FORCE_ASCII"]={"value": "NO","type":"string"};
      var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'configuration.SaveConf');
      var res=myProcess0.Execute(input1,myOutputs);
      alert(res);
  }
  /**
   * Check what is the output DataStore
   */
  var inputs2={
      "map": {"value": (inputs["dso_f"]["value"]=="PostgreSQL"?conf["main"]["dataPath"]+"/PostGIS/"+inputs["dst_out"]["value"]:conf["main"]["dataPath"]+"/dirs/"+inputs["dst_out"]["value"]+"/")+"ds_ows.map","type":"string"},
      "fullPath": {"value":"true","type":"string"},
      "layer": {"value":"-1","type":"string"}
  };
  alert(inputs2["map"]["value"]);
  var myExecuteResult2=myProcess.Execute(inputs2,myOutputs);
  alert(myExecuteResult2);
  var tmp2;
  try{tmp2=eval(myExecuteResult2.replace(/None/g,"null"))}
  catch(e){
      conf["lenv"]["message"]="Error occured: "+e;
      alert(e);
      return {result: ZOO.SERVICE_FAILED, conf: conf, outputs: {"Result": {"value":""}}};
  }
  /**
   * Run the Converter service
   */
  var inputs3={
      "F": {"value":inputs["dso_f"]["value"],"type":"string"},
      "InputDSN": {"value": (tmp1[0].indexOf(".")>0?tmp1[0]:tmp1[0]+"/"+tmp1[1]+".shp"),"type":"string"},
      "OutputDSTN": {"value": tmp2[0]+(inputs["dso_f"]["value"]=="PostgreSQL"?"":"/"+inputs["dso_out"]["value"]),"type":"string"},
      "OutputDSN": {"value": inputs["dso_out"]["value"],"type":"string"},
      "nln": {"value": inputs["dso_out"]["value"],"type":"string"}
  };

  if(inputs["sql"] && inputs["sql"]["value"]!="NULL"){
    if(inputs["sql"]["value"].indexOf("OutputedDataSource")>0){
	//inputs["sql"]["value"]=inputs["sql"]["value"].replace(/OutputedDataSourceName/g,"\"SELECT\" ")
	//inputs["sql"]["type"]="complex";
    }
      inputs3["sql"]={"value":inputs["sql"]["value"].replace(/OutputedDataSourceName/g,'"SELECT"'),"type":"complex"};//,"type":"complex", "mimeType":"text/plain"};
  }
  if(inputs["simplify"] && inputs["simplify"]["value"]!="NULL"){
    inputs3["simplify"]={"value":inputs["simplify"]["value"],"type":"string"};
  }
  if(inputs["overwrite"] && inputs["overwrite"]["value"]!="NULL"){
    inputs3["overwrite"]={"value":inputs["overwrite"]["value"],"type":"string"};
  }
/*
  if(inputs["append"] && inputs["append"]["value"]!="NULL"){
    inputs3["append"]={"value":inputs["append"]["value"],"type":"string"};
  }
  if(inputs["nlt"] && inputs["nlt"]["value"]!="NULL"){
    inputs3["nlt"]={"value":inputs["nlt"]["value"],"type":"string"};
  }
    for(i in inputs){
	if(inputs3[i]==null){
	    alert(i);
	    inputs3[i]=inputs[i];
	}
    }*/
    for(i in inputs3){
	alert(i+" => "+inputs3[i]["value"]);
    }
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  var myFinalOutputs= {"Result": { "type": 'RawDataOutput', "dataType": "string" }};
  var myFinalResult=myProcess2.Execute(inputs3,myFinalOutputs);
  alert(myFinalResult);
  if(myFinalResult.indexOf("ExceptionReport")>=0){
      conf["lenv"]["message"]="Unable to convert your data.";
      return {result: ZOO.SERVICE_FAILED, conf: conf };
  }
  /**
   * Remove the PGCLIENTENCODING from the [env] section when needed.
   */
  if(tmp1[2]=="iso-8859-15" || tmp1[2]=="iso-8859-1" ){
      var input1={"section": {"value":"env","type":"string"},"force": {"value":"true","type":"string"}};
      for(i in conf["env"])
	  if(i!="PGCLIENTENCODING"){
	      input1[i]={"value": conf["env"][i],"type":"string"};
	  }
      var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'configuration.SaveConf');
      var res=myProcess.Execute(input1,myOutputs);
      var formats=["GeoJSON","KML","GeoRSS","GML","GPX"];
      for(var k=0;k<formats.length;k++)
      if(inputs["dso_f"]["value"]==formats[k]){
	  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'vecotr-converter.Recode');
	  var input2={
	      "file": {"value": tmp2[0]+"/"+inputs["dso_out"]["value"],"type": "string"},
	      "sEncoding": {"value": tmp1[2],"type":"string"},
	      "tEncoding": {"value": "utf-8","type":"string"}
	  };
	  var res=myProcess.Execute(input1,myOutputs);
      }
  }
  /**
   * When only (null) is returned by the Converter service, it means that
   * the table was sucessfully imported into PostgreSQL database.
   */
  if(myFinalResult=='(null)'){
      outputs["Result"]["value"]="Convertion successfully made";
      outputs["Result"]["mimeType"]="application/json";
  }
  else
      outputs["Result"]["value"]=myFinalResult;
  return {result: ZOO.SERVICE_SUCCEEDED, outputs: outputs };
}


function convert(conf,inputs,outputs){
  var myOutputs= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
  /**
   * Check what are the input DataStore and DataSource
   */
  var inputs1={
      "map": {"value": inputs["dst_in"]["value"]+"ds_ows.map","type":"string"},
      "fullPath": {"value": "true","type":"string"},
      "layer": {"value": inputs["dso_in"]["value"],"type":"string"}
  };
  var myExecuteResult1=myProcess.Execute(inputs1,myOutputs);
  alert(myExecuteResult1);
  var tmp1;
  try{tmp1=eval(myExecuteResult1.replace(/None/g,"null"));}
  catch(e){
      conf["lenv"]["message"]="Error occured: "+e;
      alert(e);
      return {result: ZOO.SERVICE_FAILED, conf: conf}
  }
  /**
   * Take care of encoding system defined for the input data to add
   * PGCLIENTENCODING or OGR_FORCE_ASCII when needed.
   */
    alert(tmp1[2]);
  if(tmp1[2]=="iso-8859-15" || tmp1[2]=="iso-8859-1" ){
      var input1={"section": {"value":"env","type":"string"}};
      for(i in conf["env"]){
	  input1[i]={"value": conf["env"][i],"type":"string"};
      }
      if(inputs["dso_f"]["value"]=="PostgreSQL")
	  input1["PGCLIENTENCODING"]={"value": "Latin1","type":"string"};
      else
	  input1["OGR_FORCE_ASCII"]={"value": "NO","type":"string"};
      var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'configuration.SaveConf');
      var res=myProcess0.Execute(input1,myOutputs);
      alert(res);
  }
  /**
   * Check what is the output DataStore
   */
  var inputs2={
      "map": {"value": (inputs["dso_f"]["value"]=="PostgreSQL"?conf["main"]["dataPath"]+"/PostGIS/"+inputs["dst_out"]["value"]:conf["main"]["dataPath"]+"/dirs/"+inputs["dst_out"]["value"]+"/")+"ds_ows.map","type":"string"},
      "fullPath": {"value":"true","type":"string"},
      "layer": {"value":"-1","type":"string"}
  };
  alert(inputs2["map"]["value"]);
  var myExecuteResult2=myProcess.Execute(inputs2,myOutputs);
  alert(myExecuteResult2);
  var tmp2;
  try{tmp2=eval(myExecuteResult2.replace(/None/g,"null"))}
  catch(e){
      conf["lenv"]["message"]="Error occured: "+e;
      alert(e);
      return {result: ZOO.SERVICE_FAILED, conf: conf, outputs: {"Result": {"value":""}}};
  }
  /**
   * Run the Converter service
   */
  var inputs3={
      "F": {"value":inputs["dso_f"]["value"],"type":"string"},
      "InputDSN": {"value": (tmp1[0].indexOf(".")>0?tmp1[0]:tmp1[0]+"/"+tmp1[1]+".shp"),"type":"string"},
      "OutputDSTN": {"value": tmp2[0]+(inputs["dso_f"]["value"]=="PostgreSQL"?"":"/"+inputs["dso_out"]["value"]),"type":"string"},
      "OutputDSN": {"value": (inputs["dso_f"]["value"]=="PostgreSQL"?"NULL":inputs["dso_out"]["value"]),"type":"string"},
      "nln": {"value": inputs["dso_out"]["value"],"type":"string"}
  };

  if(inputs["sql"] && inputs["sql"]["value"]!="NULL"){
    inputs3["sql"]={"value":inputs["sql"]["value"],"type":"complex","mimeType":"application/json"};
  }
  if(inputs["simplify"] && inputs["simplify"]["value"]!="NULL"){
    inputs3["simplify"]={"value":inputs["simplify"]["value"],"type":"string"};
  }
  if(inputs["overwrite"] && inputs["overwrite"]["value"]!="NULL"){
    inputs3["overwrite"]={"value":inputs["overwrite"]["value"],"type":"string"};
  }
  if(inputs["append"] && inputs["append"]["value"]!="NULL"){
    inputs3["append"]={"value":inputs["append"]["value"],"type":"string"};
  }
  if(inputs["nlt"] && inputs["nlt"]["value"]!="NULL"){
    inputs3["nlt"]={"value":inputs["nlt"]["value"],"type":"string"};
  }
    for(i in inputs){
	if(inputs3[i]==null){
	    alert(i);
	    inputs3[i]=inputs[i];
	}
    }
    for(i in inputs3){
	alert(i+" => "+inputs3[i]["value"]);
    }
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  var myFinalOutputs= {"Result": { "type": 'RawDataOutput', "dataType": "string" }};
  var myFinalResult=myProcess2.Execute(inputs3,myFinalOutputs);
  alert(myFinalResult);
  /**
   * Remove the PGCLIENTENCODING from the [env] section when needed.
   */
  if(tmp1[2]=="iso-8859-15" || tmp1[2]=="iso-8859-1" ){
      var input1={"section": {"value":"env","type":"string"},"force": {"value":"true","type":"string"}};
      for(i in conf["env"])
	  if(i!="PGCLIENTENCODING"){
	      input1[i]={"value": conf["env"][i],"type":"string"};
	  }
      var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'configuration.SaveConf');
      var res=myProcess.Execute(input1,myOutputs);
      var formats=["GeoJSON","KML","GeoRSS","GML","GPX"];
      for(var k=0;k<formats.length;k++)
      if(inputs["dso_f"]["value"]==formats[k]){
	  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'vecotr-converter.Recode');
	  var input2={
	      "file": {"value": tmp2[0]+"/"+inputs["dso_out"]["value"],"type": "string"},
	      "sEncoding": {"value": tmp1[2],"type":"string"},
	      "tEncoding": {"value": "utf-8","type":"string"}
	  };
	  var res=myProcess.Execute(input1,myOutputs);
      }
  }
  /**
   * When only (null) is returned by the Converter service, it means that
   * the table was sucessfully imported into PostgreSQL database.
   */
  if(myFinalResult=='(null)'){
      outputs["Result"]["value"]="Convertion successfully made";
      outputs["Result"]["mimeType"]="application/json";
  }
  else
      outputs["Result"]["value"]=myFinalResult;
  return {result: ZOO.SERVICE_SUCCEEDED, outputs: outputs };
}

function convertToKML(conf,inputs,outputs){
  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  inputs["InputDSTN"]["value"]=inputs["InputDSTN"]["value"].replace(/conf["main"]["dataPath"]/,"");
  inputs["F"]={"value": "KML"};
  inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-1.kml"};
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  
  return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
}

function convertTo(conf,inputs,outputs){

  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};


  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
  inputs["InputDSTN"]["value"]=inputs["InputDSTN"]["value"].replace(/conf["main"]["dataPath"]/,"");
  inputs["F"]={"value": inputs["format"]["value"]};
  inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-1."};
  if(inputs["format"]["value"]=="KML")
      inputs["OutputDSN"]["value"]+="kml"
  if(inputs["format"]["value"]=="GPX")
      inputs["OutputDSN"]["value"]+="gpx"
  if(inputs["format"]["value"]=="ESRI Shapefile")
      inputs["OutputDSN"]["value"]+="shp"


    var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.cleanUp');
	inputs1={
	    "dso": {"value":inputs["OutputDSN"]["value"].replace(/.shp/g,""),"dataType":"string"},
	    "dstn": {"value":inputs["OutputDSN"]["value"].replace(/.shp/g,".zip"),"dataType":"string"}
	};
    myExecuteResult0=myProcess0.Execute(inputs1,myOutputs);

  var myExecuteResult=myProcess.Execute(inputs,myOutputs);

    if(inputs["format"]["value"]=="ESRI Shapefile"){
	var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.doZip');
	alert(myExecuteResult.replace(/.shp/g,"").replace(/conf["main"]["tmpUrl"]/g,""),conf["main"]["tmpUrl"]);
	myExecuteResult=myProcess1.Execute(inputs1,myOutputs);
	var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.cleanUp');
	myExecuteResult2=myProcess2.Execute(inputs1,myOutputs);
    }

    
  return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
}

function setSRS(conf,inputs,outputs){
    alert(inputs);
    var myOutputs= {Result: { type: 'ResponseDocument', "mimeType": "application/json" }};
    var myProcess;
    if(inputs["isRaster"]["value"]=="true"){
	var myOutputs1= {"Result": { "type": 'RawDataOutput', "mimeType": "application/json" }};
	var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
	var inputs1={
	    "map": {"value": inputs["dstn"]["value"]+"ds_ows.map","type":"string"},
	    "fullPath": {"value": "true","type":"string"},
	    "layer": {"value": inputs["dson"]["value"],"type":"string"}
	};
	var myExecuteResult1=myProcess1.Execute(inputs1,myOutputs1);
	var tmp=eval(myExecuteResult1);
	myProcess= new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.Gdal_Translate');
	inputs["InputDSTN"]={"value": inputs["dstn"]["value"],"dataType": "string"};
	inputs["InputDSON"]={"value": inputs["dson"]["value"],"dataType": "string"};
	inputs["InputDSN"]={"value": tmp[2].replace(conf["main"]["dataPath"],""),"dataType": "string"};
	inputs["Format"]={"value": tmp[3],"dataType": "string"};
	inputs["SRS"]=inputs["srs"];
	inputs["SRS"]["value"]="+init="+inputs["srs"]["value"];
	inputs["OutputDSN"]={"value": "TEMP_"+inputs["dson"]["value"]};
    }else{
	myProcess= new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
	inputs["InputDSTN"]=inputs["dstn"];
	inputs["InputDSON"]={"value": inputs["dson"]["value"]}
	inputs["a_srs"]=inputs["srs"];
	inputs["a_srs"]["value"]="+init="+inputs["srs"]["value"];
	inputs["OutputDSN"]={"value": "TEMP_"+inputs["dson"]["value"]};
    }
    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    
    alert(myExecuteResult);

    inputs["idir"]={"value":inputs["dstn"]["value"].replace(conf["main"]["dataPath"]+"/dirs/","")};
    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.copyTileIndex');
    var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myExecuteResult2=myProcess2.Execute(inputs,myOutputs2);
    
    alert(myExecuteResult2);
    
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": "SRS set."}} };
}

function exportTo(conf,inputs,outputs){

    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};

    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'template.display');
    inputs["tmpl"]={"value": "public/detail"};
    inputs["map"]={"value": inputs["map"]["value"]};
    inputs["layer"]={"value": inputs["layer"]["value"]};
    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    alert("JS",myExecuteResult);
    var tmp=eval(myExecuteResult);
    alert("JS",myExecuteResult);

    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
    inputs["InputDSTN"]={"value": tmp[0]};
    inputs["sql"]={"value": tmp[1]};
    inputs["F"]={"value": inputs["format"]["value"]};
    inputs["OutputDSN"]={"value": "TEMP_"+conf["lenv"]["usid"]+"-1."};
    if(inputs["format"]["value"]=="KML")
	inputs["OutputDSN"]["value"]+="kml"
    if(inputs["format"]["value"]=="CSV")
	inputs["OutputDSN"]["value"]+="csv"
    if(inputs["format"]["value"]=="ESRI Shapefile")
	inputs["OutputDSN"]["value"]+="shp"
    
    
    var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.cleanUp');
    inputs1={
	"dso": {"value":inputs["OutputDSN"]["value"].replace(/.shp/g,""),"dataType":"string"},
	"dstn": {"value":inputs["OutputDSN"]["value"].replace(/.shp/g,".zip"),"dataType":"string"}
    };
    myExecuteResult0=myProcess0.Execute(inputs1,myOutputs);
    alert(myExecuteResult0);

    var myExecuteResult=myProcess.Execute(inputs,myOutputs);

    if(inputs["format"]["value"]=="ESRI Shapefile"){
	var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.doZip');
	alert(myExecuteResult.replace(/.shp/g,"").replace(/conf["main"]["tmpUrl"]/g,""),conf["main"]["tmpUrl"]);
	myExecuteResult=myProcess1.Execute(inputs1,myOutputs);
	//var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.cleanUp');
	//myExecuteResult2=myProcess2.Execute(inputs1,myOutputs);
    }
    
    
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
}
