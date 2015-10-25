/******************************************************************************
 * Author:   Gérald Fenoy, gerald.fenoy@cartoworks.com
 * Copyright (c) 2010-2014, Cartoworks Inc. 
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
 ****************************************************************************/

function georeference(conf,inputs,outputs){
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};

    /**
     * Copy original file into dataPath
     */
    var inputs0={
	"layer":{"value": conf["senv"]["mmGeoDSO"]}	
    }
    var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.copyLayerFile');
    alert("GCPs",inputs["gcp"]["value"].length);
    for(i in inputs["gcp"])
	alert(i+" = "+inputs["gcp"][i]);
    
    for(i=0;i<parseInt(inputs["gcp"]["length"]);i++)
	alert("GCPs",inputs["gcp"]["value_"+i]);
    var myExecuteResult=myProcess0.Execute(inputs0,myOutputs);
    alert("Copy original file into dataPath",myOutputs);

    /**
     * Add GCPs to the original file and store the result in tmpPath
     */
    var inputs1={
	"InputDSN": {"dataType":"string","value":conf["senv"]["mmGeoImg"]},
	"OutputDSN": {"dataType":"string","value":conf["senv"]["mmGeoDSO"]+"_georef"},
	"gcp": {"dataType": "string","value":inputs["gcp"]["value"],"isArray":"true"},
	"SRS": {"dataType":"string","value": "epsg:4326"}
    };
    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.Gdal_Translate');
    var myExecuteResult1=myProcess1.Execute(inputs1,myOutputs);
    alert("Add gcps ...",myExecuteResult1);

    /**
     * Copy resulting file into dataPath
     */
    inputs0["lfile"]={"value": myExecuteResult1};
    myProcess = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.copyLayerFile');
    try{
	var myExecuteResult0=myProcess.Execute(inputs0,myOutputs);
	alert("Copy original file into dataPath",myExecuteResult0);
    }catch(e){
	outputs["Result"]["value"]=myExecuteResult1;
	return {result: ZOO.SERVICE_FAILED, outputs: outputs};
    }
    
    /**
     * Apply GCPs to distord the file and store the result in tmpPath
     */
    var inputs2={
	"InputDSN": {"dataType":"string","value":conf["senv"]["mmGeoDSO"]+"_georef.tif"},
	"OutputDSN": {"dataType":"string","value":inputs["dso"]["value"]},
	"r": inputs["r"],
	"co": {"value": "COMPRESSION="+inputs["COMPRESSION"]["value"],"dataType":"string"}
    };
    if(inputs["trans"]["value"]!="tps"){
	inputs2["order"]={"dataType": "string","value": inputs["trans"]["value"]}
    }else
	inputs2["tps"]={"dataType": "boolean","value": "true"}
    if(inputs["hres"] && inputs["vres"]){
	inputs2["tr"]={"dataType":"string","value":inputs["hres"]+","+inputs["vres"]};
    }
    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.Gdal_Warp');
    var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs);
    alert("raster-tools.Gdal_Warp",myExecuteResult2);

    /**
     * Copy resulting file into dataPath
     */
    inputs0["lfile"]={"value": myExecuteResult2};
    inputs0["target"]={"value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]};
    myProcess = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.copyLayerFile');
    try{
	myExecuteResult0=myProcess.Execute(inputs0,myOutputs);
    }catch(e){
	outputs["Result"]["value"]=myExecuteResult2;
	return {result: ZOO.SERVICE_FAILED, outputs: outputs};	
    }
    alert("Copy original file into dataPath",myExecuteResult0);
    
    var inputs3={
	"dsType": {"dataType": "string","value": "mainDirectories"},
	"dsName": {"dataType": "string","value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]+"/"},
    };
    var myProcess3 = new ZOO.Process(conf["main"]["serverAddress"],'datastores.directories.cleanup');
    myExecuteResult0=myProcess3.Execute(inputs3,myOutputs);
    alert("datastores.directories.cleanup",myExecuteResult0);

    var inputs4={
	"dataSource": {"dataType": "string","value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]+"/"}
    };
    var myProcess4 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.mmVectorInfo2Map');
    myExecuteResult0=myProcess4.Execute(inputs4,myOutputs);
    alert("vector-tools.mmVectorInfo2Map",myExecuteResult0);
    var inputs4={
	"dataStore": {"dataType": "string","value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]+"/"}
    };
    var myProcess5 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.mmVectorInfo2MapPy');
    myExecuteResult0=myProcess5.Execute(inputs4,myOutputs);
    alert("vector-tools.mmVectorInfo2Map",myExecuteResult0);

    var inputs5={
	"dso": {"dataType": "string","value": conf["senv"]["mmGeoDSO"]},
	"layer": {"dataType": "string","value": [
	    conf["main"]["dataPath"]+"/"+conf["senv"]["mmGeoImg"],
	    conf["main"]["dataPath"]+"/"+conf["senv"]["mmGeoDSO"]+"_georef.tif",
	    conf["main"]["tmpPath"]+"/"+inputs["dso"]["value"]+".tif",
	    conf["main"]["tmpPath"]+"/"+conf["senv"]["mmGeoDSO"]+"_georef.tif"
	],"length": 4, "isArray":true}
    };
    var myProcess5 = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.dropLayerFile');
    myExecuteResult0=myProcess5.Execute(inputs5,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult0);

    outputs["Result"]["value"]=myExecuteResult2+ZOO._(" created");
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: outputs}
}


function cropImage(conf,inputs,outputs){
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};

    /**
     * Copy original file into dataPath
     */
    var inputs0={
	"layer":{"dataType":"string","value": inputs["dso"]["value"]},	
	"dsto":{"dataType":"string","value": inputs["dsto"]["value"]}	
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.copyLayerFile');
    var myExecuteResult=myProcess.Execute(inputs0,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult);

    /**
     * Gdal_Translate to apply ProjWin
     */
    var inputs1={
	"InputDSN": {"dataType":"string","value":myExecuteResult},
	"OutputDSN": {"dataType":"string","value":inputs["dsot"]["value"]+""},
	"SRS": {"dataType":"string","value":"EPSG:4326"},
	"ProjWin": {"dataType": "sting","value": inputs["ProjWin"]["value"]}
    };
    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'raster-tools.Gdal_Translate');
    var myExecuteResult1=myProcess1.Execute(inputs1,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult1);

    /**
     * Copy resulting file into dataPath
     */
    inputs0["lfile"]={"value": myExecuteResult1};
    inputs0["target"]={"value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]};
    myProcess = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.copyLayerFile');
    myExecuteResult0=myProcess.Execute(inputs0,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult0);
    
    var inputs3={
	"dsType": {"dataType": "string","value": "mainDirectories"},
	"dsName": {"dataType": "string","value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]+"/"}
    };
    var myProcess3 = new ZOO.Process(conf["main"]["serverAddress"],'datastores.directories.cleanup');
    myExecuteResult0=myProcess3.Execute(inputs3,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult0);

    var inputs4={
	"dataSource": {"dataType": "string","value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]+"/"}
    };
    var myProcess4 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.mmVectorInfo2Map');
    myExecuteResult0=myProcess4.Execute(inputs4,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult0);
    var inputs4={
	"dataStore": {"dataType": "string","value": conf["main"]["dataPath"]+"/dirs/"+inputs["dst"]["value"]+"/"}
    };
    var myProcess5 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.mmVectorInfo2MapPy');
    myExecuteResult0=myProcess5.Execute(inputs4,myOutputs);
    alert("vector-tools.mmVectorInfo2Map",myExecuteResult0);

    var inputs5={
	"dso": {"dataType": "string","value": conf["senv"]["mmGeoDSO"]},
	"layer": {"dataType": "string","value": [
	    conf["main"]["dataPath"]+"/"+inputs0["lfile"]["value"],
	    conf["main"]["dataPath"]+"/"+inputs["dsot"]["value"]+".tif",
	    conf["main"]["tmpPath"]+"/"+inputs0["lfile"]["value"]+".tif",
	    conf["main"]["tmpPath"]+"/"+inputs["dsot"]["value"]+".tif"
	],"length": 4, "isArray":true}
    };
    var myProcess5 = new ZOO.Process(conf["main"]["serverAddress"],'georeferencer.dropLayerFile');
    myExecuteResult0=myProcess5.Execute(inputs5,myOutputs);
    alert("Copy original file into dataPath",myExecuteResult0);

    outputs["Result"]["value"]=inputs["dsot"]["value"]+ZOO._(" created");
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: outputs}
}
