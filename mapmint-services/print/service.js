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
function printMapImage(conf,inputs,outputs){
    var myOutputs0= {"Result": { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs0= {
	tmpl: { "value":"preview/tobbox18_js" ,"dataType": "string" },
	lat: { "value": inputs["lat"]["value"] ,"dataType": "string" },
	lon: { "value":inputs["lon"]["value"] ,"dataType": "string" }
    };
    var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'template.display');
    alert(inputs);
    var myExecuteResult0=myProcess0.Execute(myInputs0,myOutputs0);//,"Cookie: MMID="+conf["senv"]["MMID"]);
    alert(myExecuteResult0);
    var tmp=eval(myExecuteResult0);

    var ext=tmp[0][0]+","+tmp[0][1]+","+tmp[1][0]+","+tmp[1][1];
    var ext1=tmp[0][0]+","+tmp[1][1]+","+tmp[1][0]+","+tmp[0][1];
    var bl="base_layers/default.xml";
    try{
	bl="base_layers/"+inputs["bl"]["value"]+".xml";
    }catch(e){
    }
    var myInputs1= {
	InputDSN: { "value": bl ,"dataType": "string" },
	OutputDSN: { "value": "PRINTED_MAP_"+conf["lenv"]["usid"] ,"dataType": "string" },
	Format: { "value": "png","dataType": "string" },
	OutSize: { "value": "1024,768","dataType": "string" },
	ProjWin: { "value": ext1,"dataType": "string" }
    };
    var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "text/plain" }};
    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.translate');
    alert(inputs);
    var myExecuteResult1=myProcess1.Execute(myInputs1,myOutputs1);//,"Cookie: MMID="+conf["senv"]["MMID"]);
    alert(myExecuteResult1);

    var myInputs2= {
	layers: { "value": "0" ,"dataType": "string" },
	ext: { "value": ext, "dataType": "string" },
	iFormat: { "value": "A4l","dataType": "string" },
	map: { "value": inputs["map"]["value"],"dataType": "string" },
	bgMap: { "value": myExecuteResult1,"dataType": "string" },
	zoom: { "value": "18","dataType": "string" },
	tDoc: { "value": "MM-PrintedMap.pdf","dataType": "string" }
    };
    var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "text/plain" }};
    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'print.printOnlyMap');
    alert(inputs);
    var myExecuteResult2=myProcess2.Execute(myInputs2,myOutputs2);//,"Cookie: MMID="+conf["senv"]["MMID"]);
    alert(myExecuteResult2);
    outputs["Result"]["generated_file"]=myExecuteResult2;
    //outputs["Result"]["value"]=myExecuteResult2;
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: outputs};

}
