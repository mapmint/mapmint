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
  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=mapfile",'canAccessLayer');
  alert(inputs);
  var myExecuteResult0=myProcess0.Execute(inputs,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);
  if(myExecuteResult0=="false"){
      conf["lenv"]["message"]="You're not allowed to access this ressource !";
      alert(conf["lenv"]["message"]);
      return {result: ZOO.SERVICE_FAILED, conf: conf}
  }
  

  var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=mapfile",'getMapLayersInfo');
  alert(inputs);
  var myExecuteResult=myProcess.Execute(inputs,myOutputs);
  alert(myExecuteResult);
  try{
    var tmp=eval(myExecuteResult.replace(/None/g,"null"));
    var myInputs;
  alert(tmp[0]);
  if(tmp[0][0]=='P' && tmp[0][1]=='G' && tmp[0][2]==':')
    myInputs = {"dataSource": { type: 'string', "value": tmp[0] }, "layer": { type: 'string', "value": tmp[1] }};
  else
    myInputs = {"dataSource": { type: 'string', "value": tmp[0] }, "layer": { type: 'string', "value": tmp[1] }};
  alert(myInputs["dataSource"]["value"]);
  var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"]+"?metapath=vector-tools",'mmExtractVectorInfo');
  var myExecuteResult1=myProcess1.Execute(myInputs,myOutputs);
  alert(myExecuteResult1);

  return {result: ZOO.SERVICE_SUCCEEDED, outputs: [{name:"Result","mimeType": "text/xml",encoding: "utf-8", value: myExecuteResult1}]}

  }catch(e){
      conf["lenv"]["message"]=e;
      alert(conf["lenv"]["message"]);
      return {result: ZOO.SERVICE_FAILED, conf: conf}
  }
}
