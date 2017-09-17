/******************************************************************************
 * Author:   Gérald Fenoy, gerald.fenoy@cartoworks.com
 * Copyright (c) 2011-2014, Cartoworks Inc. 
 ******************************************************************************
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 ******************************************************************************/
function getInitialInfo(conf,inputs,outputs){
  // Pass the value as json
  //var myInputs = {map: { type: 'string', value: fGJ.write(inputData), mimeType: "application/json"}, BufferDistance: {type: 'float', "value": bDist } };  

  var myOutputs0= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.canAccessLayer');
  alert(inputs);
  var myExecuteResult0=myProcess0.Execute(inputs,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);
  if(myExecuteResult0=="false"){
      conf["lenv"]["message"]="You're not allowed to access this ressource !";
      alert(conf["lenv"]["message"]);
      return {result: ZOO.SERVICE_FAILED, conf: conf}
  }
  

  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
  alert(inputs);
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  alert(myExecuteResult);
  try{
      var tmp=eval(myExecuteResult.replace(/None/g,"null"));
      var myInputs;
      alert(tmp[0]);
      if((tmp[0][0]=='P' && tmp[0][1]=='G' && tmp[0][2]==':') || (tmp[0][0]=='M' && tmp[0][1]=='y' && tmp[0][5]==':')){
	  alert("OK");
	  myInputs = {"dataSource": { type: 'string', "value": tmp[0] }, "layer": { type: 'string', "value": tmp[1] }};
      }
      else
	  myInputs = {"dataSource": { type: 'string', "value": tmp[0] }, "layer": { type: 'string', "value": tmp[1] }};
      alert("OK0");
      alert(myInputs["dataSource"]["value"]);
      var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
      var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.mmExtractVectorInfo');
      var myExecuteResult1=myProcess1.Execute(myInputs,myOutputs);
      alert("OK1");
      alert(myExecuteResult1);
      alert("OK1");
      return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"mimeType": "text/xml",encoding: "utf-8", value: myExecuteResult1}}};

  }catch(e){
      conf["lenv"]["message"]=e;
      alert(conf["lenv"]["message"]);
      return {result: ZOO.SERVICE_FAILED, conf: conf}
  }
}

function saveLabelJS(conf,inputs,outputs){
    try{
	var myOutputs0= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.isPolygon');
	var myExecuteResult0=myProcess0.Execute(inputs,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
	alert(myExecuteResult0);
	if(myExecuteResult0=="True"){
	    var hasFill=false;
	    for(i in inputs)
		if(i=="mmFill"){
		    hasFill=true;
		    break;
		}
	    if(hasFill){
		url=conf["main"]["mapserverAddress"]+"?map="+conf["main"]["dataPath"]+"/maps/search_"+conf["senv"]["last_map"]+"_"+inputs["layer"]["value"]+".map&request=GetFeature&service=WFS&version=1.0.0&typename="+inputs["layer"]["value"];
		var inputs1= {"InputPolygon": { "type": "reference", "value": url, "mimeType": "text/xml"}};
		var myOutputs1= {"Result": { type: 'ResponseDocument', "mimeType": "text/xml", "asReference": true }};
		var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.PointOnSurface');
		var myExecuteResult1=myProcess1.Execute(inputs1,myOutputs1,"Cookie: MMID="+conf["senv"]["MMID"]);
		var w=new ZOO.Format.WPS();
		try{
		    tmp=w.read(myExecuteResult1);
		    for(i in tmp)
			alert(i,tmp[i]);
		    alert("Reference: ",tmp.value);
		    var mapfile=tmp.value.split('&');
		    mapfile=mapfile[0].split("=");
		    var inputs2=inputs;
		    var omap=inputs["map"]["value"];
		    inputs2["map"]["value"]=mapfile[1];
		    var lname=inputs["layer"]["value"];
		    inputs2["layer"]["value"]="Result";
		    inputs2["fullPath"]={"type": "boolean","value": "true"};
		    alert(mapfile[1]);
		    var myOutputs2= {"Result": { type: 'RawDataOutput'}};
		    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.saveLabel');
		    var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
		    alert(myExecuteResult2);
		    inputs2["omap"]={"type": "string","value": omap};
		    inputs2["layer"]["value"]=lname;
		    var myOutputs2= {"Result": { type: 'RawDataOutput'}};
		    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.addLabelLayer0');
		    var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
		    alert(myExecuteResult2);
		    
		    return {result: ZOO.SERVICE_SUCCEEDED, outputs: [{name:"Result","dataType": "string",value: myExecuteResult2}]}
		}catch(e){
		    alert(e);
		    return {result: ZOO.SERVICE_FAILED, conf: conf};
		}
            }else{
		var myOutputs2= {"Result": { type: 'RawDataOutput'}};
		var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.removeLabelLayer');
		var myExecuteResult2=myProcess2.Execute(inputs,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
		alert(myExecuteResult2);
		return {result: ZOO.SERVICE_SUCCEEDED, outputs: [{name:"Result","dataType": "string",value: myExecuteResult2}]}
            }
	}else{
	    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.saveLabel');
	    var myOutputs1= {"Result": { type: 'RawDataOutput', "dataType": "string" }};
	    var myExecuteResult1=myProcess1.Execute(inputs,myOutputs1,"Cookie: MMID="+conf["senv"]["MMID"]);
	    return {result: ZOO.SERVICE_SUCCEEDED, outputs: [{name:"Result","dataType": "string",value: myExecuteResult1}]}
	    
	}
	
    }catch(e){
	conf["lenv"]["message"]=e;
	alert(conf["lenv"]["message"]);
	return {result: ZOO.SERVICE_FAILED, conf: conf}
    }
}
