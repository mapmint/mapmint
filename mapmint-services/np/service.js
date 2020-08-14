function createTempFile(conf,inputs,outputs){

  var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"],'np.dropTempFile');

  var inputs00={
    "fullPath": {"value": "true","type":"string"}
  }
  var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult00);

  var myOutputs0= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');

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
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
  
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
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.mmVectorInfo2Map');

  var inputs2={
    "force": {"value": "true","type":"string"},
    "dataSource": {"value": conf["main"]["tmpPath"]+"/temporary_index.csv","type":"string"}
  }
  var myExecuteResult2=myProcess2.Execute(inputs2,myOutputs2,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult2);

  var myOutputs2= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'np.setLastFile');

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
  var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"],'np.dropTable');

  var inputs00={
    "id": {"value": inputs["id"]["value"],"type":"string"}
  }
  var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult00);

  var myOutputs0= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');

  var inputs0={
    "fullPath": {"value": "true","type":"string"},
    "layer": {"value": "-1","type":"string"},
    "map": {"value": conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map","type":"string"}
  }
  var myExecuteResult0=myProcess0.Execute(inputs0,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);
  var tmp=eval(myExecuteResult0.replace(/None/g,"null"));

  var myOutputs1= {OutputedDataSourceName: { type: 'RawDataOutput', "mimeType": "application/json" }};
  var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
  
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

  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'np.joinIndexTable');
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
	var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"],'datastores.directories.cleanup');
	var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var inputs00={
	    "dsName": {"value": conf["main"]["dbuserName"],"type":"string"},
	    "dsType": {"value": "postgis","type":"string"}
	}
	var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
	alert("refresh!!",myExecuteResult00);
    }else{
	var myProcess00 = new ZOO.Process(conf["main"]["serverAddress"],'np.addLayerForIndex');
	var myOutputs00= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var inputs00={
	    "id": {"value": inputs["id"]["value"],"type":"string"}
	}
	var myExecuteResult00=myProcess00.Execute(inputs00,myOutputs00,"Cookie: MMID="+conf["senv"]["MMID"]);
	alert("refresh light !!",myExecuteResult00);	
    }

  var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'datastores.mmVectorInfo2MapJs');
  var inputs0={
    "dataStore": {"value": conf["main"]["dbuserName"],"type":"string"}
  }
  var myOutputs0= {
    "Result": { type: 'RawDataOutput', "mimeType": "application/json" }
  };
  var myExecuteResult0=myProcess0.Execute(inputs0,myOutputs0,"Cookie: MMID="+conf["senv"]["MMID"]);
  alert(myExecuteResult0);

  var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.mmExtractVectorInfo');
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
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
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
    myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.getIndexDisplayJs');
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
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	inputs["InputDSN"]={"value":tmp[0]};
	inputs["F"]={"value": formats[j]};
	inputs["sql"]={"value": "SELECT "+fields+", wkb_geometry from indexes.view_idx"+inputs["id"]["value"]};
	inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-"+inputs["id"]["value"]+"."+exts[j]};
	inputs["nln"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-"+inputs["id"]["value"]+""};	
	
	var myProcess0 = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.cleanUp');
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
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.publishIndex');
    myExecuteResult=myProcess.Execute(inputs,myOutputs,"Cookie: MMID="+conf["senv"]["MMID"]); 

   
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
    
}

function convertTo(conf,inputs,outputs){
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.getIndexRequest');
    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    var myExecuteResult0=myExecuteResult;

    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
    inputs["map"]={"value": conf["main"]["dbuserName"]+"ds_ows.map"};
    inputs["layer"]={"value": "-1"};
    inputs["fullPath"]={"value": "true"};
    var myExecuteResult1=myProcess1.Execute(inputs,myOutputs);
    var tmp=eval(myExecuteResult1.replace('None','null'));
    
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Converter');
    inputs["InputDSN"]={"value": tmp[0]};
    inputs["F"]={"value": "KML"};
    inputs["sql"]={"value": myExecuteResult};
    inputs["OutputDSN"]={"value": "TEMP_"+conf["senv"]["MMID"]+"-1.kml"};
    var myExecuteResult=myProcess.Execute(inputs,myOutputs);
    
    return {result: ZOO.SERVICE_SUCCEEDED, outputs: {"Result": {"value": myExecuteResult.replace(conf["main"]["serverAddress"],"")}} };
}

function getMapLayersInfo(conf){
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'mapfile.getMapLayersInfo');
    inputs={
	"map":{"value": conf["main"]["dbuserName"]+"ds_ows.map"},
	"layer":{"value": "-1"},
	"fullPath":{"value": "true"}
    };
    var myExecuteResult1=myProcess1.Execute(inputs,myOutputs);
    var tmp=eval(myExecuteResult1.replace('None','null'));
    return tmp;
}

function createSqliteDB4ME(conf,inputs,outputs){
    var dbFile="mm4medb_"+conf["lenv"]["usid"]+".db";
    var groups=conf["senv"]["group"].split(',');
    var dbs={
	"mm4me_editions": {
	    "table": "mm_tables.p_editions",
	    "clause": "where id in (select eid from mm_tables.p_edition_groups where gid in (select id from mm.groups where name in ('"+groups.join("','")+"')))",
	},
	"mm4me_edition_fields": {
	    "table": "mm_tables.p_edition_fields",
	    "clause": "where eid in (select eid from mm_tables.p_edition_groups where gid in (select id from mm.groups where name in ('"+groups.join("','")+"')))",
	},
	"mm4me_views": {
	    "table": "mm_tables.p_views",
	    "clause": "where id in (select vid from mm_tables.p_view_groups where gid in (select id from mm.groups where name in ('"+groups.join("','")+"')))",
	},
	"mm4me_view_fields": {
	    "table": "mm_tables.p_view_fields",
	    "clause": "where vid in (select vid from mm_tables.p_view_groups where gid in (select id from mm.groups where name in ('"+groups.join("','")+"')))",
	},
	"mm4me_ftypes": {
	    "table": "mm_tables.ftypes",
	    "clause": ""
	},
	"mm4me_themes": {
	    "table": "mm.themes",
	    "clause": ""
	},
	"mm4me_views_themes": {
	    "table": "mm_tables.p_view_themes",
	    "clause": ""
	},
	"mm4me_tables": {
	    "table": "mm_tables.p_tables",
	    "clause": "where id in (select ptid from mm_tables.p_views where id in (select vid from mm_tables.p_view_groups where gid in (select id from mm.groups where name in ('"+groups.join("','")+"')))) or id in (select ptid from mm_tables.p_editions where id in (select eid from mm_tables.p_edition_groups where gid in (select id from mm.groups where name in ('"+groups.join("','")+"'))))",
	},
    };
    var tmpTot=12;
    var inputDSN=getMapLayersInfo(conf);
    var cnt=0;
    for(var i in dbs){
	conf["lenv"]["message"]="Export table:"+" "+dbs[i]["table"];
	ZOOUpdateStatus(conf,cnt*2);
	var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var myInputs={
	    "append": {"value": "true","type":"string"},
	    "InputDSN": {"value": inputDSN,"type":"string"},
	    "OutputDSN": {"value": dbFile,"type":"string"},
	    "F": {"value": "SQLite","type":"string"},
	    "nln": {"value": i,"type":"string"},
	    "sql": {"value": "SELECT * FROM "+dbs[i]["table"]+" "+dbs[i]["clause"],"type":"string"},
	}
	if(cnt>0)
	    myInputs["update"]={"value": "true","type":"string"};
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	var myExecuteResult=myProcess.Execute(myInputs,{});
	var myExecuteResult0=myExecuteResult;
	alert(myExecuteResult);
	cnt+=1;
    }

    /**
     * Dump all table structures that can be edited/viewed first
     */
    var req="CREATE TABLE primary_keys (id integer primary key autoincrement, tbl text, col text)";
    var myOutputs= {};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["main"]["tmpPath"]+"/"+dbFile,"type":"string"},
	"q": {"value": req,"type":"string"},
    }
    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult2=myProcess2.Execute(myInputs,myOutputs);
    alert(myExecuteResult2);
    var req="CREATE TABLE history_log (id integer primary key autoincrement, tbl text, pkey_value var(255), sql text, edition_time integer(4) not null default (strftime('%s','now')))";
    var myOutputs= {};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["main"]["tmpPath"]+"/"+dbFile,"type":"string"},
	"q": {"value": req,"type":"string"},
    }
    var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult2=myProcess2.Execute(myInputs,myOutputs);
    alert(myExecuteResult2);

    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": "SELECT name FROM "+dbs["mm4me_tables"]["table"]+" "+dbs["mm4me_tables"]["clause"],"type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var myExecuteResult0=eval(myExecuteResult);
    alert(myExecuteResult);
    alert(myExecuteResult0);
    for(var i=0;i<myExecuteResult0.length;i++){
	conf["lenv"]["message"]="Export structure:"+" "+myExecuteResult0[i]["name"];
	ZOOUpdateStatus(conf,((((50-12)/myExecuteResult0.length)*i)+12));
	alert("+++++ >"+i+" "+myExecuteResult0[i]);
	var myInputs={
	    "append": {"value": "true","type":"string"},
	    "update": {"value": "true","type":"string"},
	    "InputDSN": {"value": inputDSN,"type":"string"},
	    "OutputDSN": {"value": dbFile,"type":"string"},
	    "F": {"value": "SQLite","type":"string"},
	    "nln": {"value": myExecuteResult0[i]["name"].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4"),"type":"string"},
	    "sql": {"value": "SELECT * FROM "+myExecuteResult0[i]["name"]+" limit 0 ","type":"string"},
	}
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	var myExecuteResult=myProcess.Execute(myInputs,{});
	alert(myExecuteResult);
	alert(myExecuteResult0[i]["name"]);
	/**
	 * Create description tables
	 */
	var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var myInputs1={
	    "table": {"value": myExecuteResult0[i]["name"],"type":"string"},
	    "dataStore": {"value": conf["main"]["dbuserName"],"type":"string"}
	};
	var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'datastores.postgis.getTableDescription');
	var myExecuteResult1=myProcess1.Execute(myInputs1,myOutputs1);
	var myExecuteResult01=eval(myExecuteResult1);
	alert(myExecuteResult1);
	var req="INSERT INTO primary_keys (tbl,col) VALUES ('"+myExecuteResult0[i]["name"].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4")+"',";
	for(var j=0;j<myExecuteResult01.length;j++){
	    if(myExecuteResult01[j][3]=="PRI"){
		req+="'"+myExecuteResult01[j][1]+"')";
		break;
	    }
	}
	var myOutputs= {};
	var myInputs={
	    "dsoName": {"value": "","type":"string"},
	    "dstName": {"value": conf["main"]["tmpPath"]+"/"+dbFile,"type":"string"},
	    "q": {"value": req,"type":"string"},
	}
	var myProcess2 = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
	var myExecuteResult2=myProcess2.Execute(myInputs,myOutputs);
	alert(myExecuteResult2);

    }
     

    /**
     * Extract all Reference tables content from the settings
     */
    alert(" +++++++++++-------------------------------+++++++++++ ");
    alert("Extract all Reference tables content from the settings");
    alert(" +++++++++++-------------------------------+++++++++++ ");
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": "SELECT value FROM "+dbs["mm4me_edition_fields"]["table"]+" "+dbs["mm4me_edition_fields"]["clause"]+" AND ftype=(select id from mm_tables.ftypes where ftype='e' and code='ref')","type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var myExecuteResult0=eval(myExecuteResult);
    alert(myExecuteResult);
    alert(myExecuteResult0);
    for(var i=0;i<myExecuteResult0.length;i++){
	var matched=myExecuteResult0[i]["value"].match(/(\w+)(\d*)\.(\d*)(\w+)/);
	if(matched[0]){
	    conf["lenv"]["message"]="Export reference tables:"+" "+matched[0];
	    ZOOUpdateStatus(conf,(((20/myExecuteResult0.length)*i)+50));
	    alert("+++++ >"+i+" "+matched[0]);
	    var currentTable=matched[0];
	    var currentTableName=matched[0].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    var myOutputs= {};
	    var myInputs={
		"dsoName": {"value": "","type":"string"},
		"dstName": {"value": conf["main"]["tmpPath"]+"/"+dbFile,"type":"string"},
		"q": {"value": "DROP TABLE "+currentTableName,"type":"string"},
	    }
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
	    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
	    alert(myExecuteResult);
	    var myInputs={
		"overwrite": {"value": "true","type":"string"},
		"update": {"value": "true","type":"string"},
		"InputDSN": {"value": inputDSN,"type":"string"},
		"OutputDSN": {"value": dbFile,"type":"string"},
		"F": {"value": "SQLite","type":"string"},
		"nln": {"value": currentTableName,"type":"string"},
		"sql": {"value": "SELECT * FROM "+currentTable+"  ","type":"string"},
	    }
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	    var myExecuteResult=myProcess.Execute(myInputs,{});
	    alert(myExecuteResult);
	    alert(myExecuteResult0[i]["name"]);
	}
    } 

    /**
     * Extract all Link Table tables content from the settings
     */
    alert(" +++++++++++-------------------------------+++++++++++ ");
    alert("Extract all Link Table tables content from the settings");
    alert(" +++++++++++-------------------------------+++++++++++ ");
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": "SELECT value FROM "+dbs["mm4me_edition_fields"]["table"]+" "+dbs["mm4me_edition_fields"]["clause"]+" AND ftype=(select id from mm_tables.ftypes where ftype='e' and code='tbl_link')","type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var myExecuteResult0=eval(myExecuteResult);
    alert(myExecuteResult);
    alert(myExecuteResult0);
    for(var i=0;i<myExecuteResult0.length;i++){
	var matched=myExecuteResult0[i]["value"].split(';');
	if(matched[matched.length-1]){
	    conf["lenv"]["message"]="Export link structure:"+" "+matched[matched.length-2];
	    ZOOUpdateStatus(conf,((10/myExecuteResult0.length)*i)+70);
	    alert("+++++ >"+i+" "+matched[matched.length-2]);
	    var currentTable=matched[matched.length-2];
	    var currentTableName=matched[matched.length-2].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    var myInputs={
		"append": {"value": "true","type":"string"},
		"update": {"value": "true","type":"string"},
		"InputDSN": {"value": inputDSN,"type":"string"},
		"OutputDSN": {"value": dbFile,"type":"string"},
		"F": {"value": "SQLite","type":"string"},
		"nln": {"value": currentTableName,"type":"string"},
		"sql": {"value": "SELECT * FROM "+currentTable+" limit 0 ","type":"string"},
	    }
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	    var myExecuteResult=myProcess.Execute(myInputs,{});
	    alert(myExecuteResult);
	    alert(myExecuteResult0[i]["name"]);
	}
    }  
  
    /**
     * Extract all Link Table tables content from the settings
     */
    alert(" +++++++++++-------------------------------+++++++++++ ");
    alert("Extract all Link Table tables content from the settings");
    alert(" +++++++++++-------------------------------+++++++++++ ");
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": "SELECT value FROM "+dbs["mm4me_edition_fields"]["table"]+" "+dbs["mm4me_edition_fields"]["clause"]+" AND ftype=(select id from mm_tables.ftypes where ftype='e' and code='tbl_linked')","type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var myExecuteResult0=eval(myExecuteResult);
    alert(myExecuteResult);
    alert(myExecuteResult0);
    for(var i=0;i<myExecuteResult0.length;i++){
	var matched=myExecuteResult0[i]["value"].split(';');
	if(matched[matched.length-1]){
	    conf["lenv"]["message"]="Export link structure:"+" "+matched[matched.length-2];
	    ZOOUpdateStatus(conf,((20/myExecuteResult0.length)*i)+80);
	    alert("+++++ >"+i+" "+matched[matched.length-1]);
	    var currentTable=matched[matched.length-2];
	    var currentTableName=matched[matched.length-2].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    var myInputs={
		"append": {"value": "true","type":"string"},
		"update": {"value": "true","type":"string"},
		"InputDSN": {"value": inputDSN,"type":"string"},
		"OutputDSN": {"value": dbFile,"type":"string"},
		"F": {"value": "SQLite","type":"string"},
		"nln": {"value": currentTableName,"type":"string"},
		"sql": {"value": "SELECT * FROM "+currentTable+" limit 0 ","type":"string"},
	    }
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	    var myExecuteResult=myProcess.Execute(myInputs,{});
	    alert(myExecuteResult);
	    alert(myExecuteResult0[i]["name"]);
	    var lmatched=matched[matched.length-1].match(/(\w+)(\d*)\.(\d*)(\w+)/);
	    /**
	     * UpdateStatus
	     */
	    conf["lenv"]["message"]="Export link table:"+" "+lmatched[0];
	    ZOOUpdateStatus(conf,((20/myExecuteResult0.length)*i)+80);
	    var currentTable=lmatched[0];
	    var currentTableName=lmatched[0].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    var myInputs={
		"append": {"value": "true","type":"string"},
		"update": {"value": "true","type":"string"},
		"InputDSN": {"value": inputDSN,"type":"string"},
		"OutputDSN": {"value": dbFile,"type":"string"},
		"F": {"value": "SQLite","type":"string"},
		"nln": {"value": currentTableName,"type":"string"},
		"sql": {"value": "SELECT * FROM "+currentTable+" ","type":"string"},
	    }
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	    var myExecuteResult=myProcess.Execute(myInputs,{});
	    alert(myExecuteResult);
	    alert(myExecuteResult0[i]["name"]);
	}
    }    

    outputs["Result"]["generated_file"]=conf["main"]["tmpPath"]+"/"+dbFile;
    return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: outputs };
    
}

function exportTableTo(conf,inputs,outputs){
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.clientViewTable');
	var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	for(i in inputs){
		if(!inputs[i]["mimeType"])
			inputs[i]["type"]="string";
		else
			inputs[i]["type"]="complex";
	}
	var myExecuteResult=myProcess.Execute(inputs,myOutputs,"Cookie: MMID="+conf["senv"]["MMID"]);
	alert("clientViewTable\n"+myExecuteResult);
	var inputDSN=getMapLayersInfo(conf);
	inputDSN+="";
        var myInputs={
		"overwrite": {"value": "true","type":"string"},
		"InputDSN": {"value": inputDSN.split(',')[0],"type":"string"},
		"OutputDSN": {"value": "export_"+conf["lenv"]["usid"]+"."+(inputs["type"]["value"]=="CSV"?"csv":(inputs["type"]["value"]=="ODS"?"ods":"xlsx")),"type":"string"},
		"F": {"value": inputs["type"]["value"],"type":"string"},
		"nln": {"value": "Export","type":"string"},
		"sql": {"value": myExecuteResult.replace(/"/g,"").replace(/,id/g,""),"type":"complex","mimeType":"application/json"},
	};
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	var myOutputs= {"OutputedDataSourceName": { type: 'RawDataOutput', "mimeType": "application/json" }};
	var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
	alert(myExecuteResult);
	var reg=RegExp(conf["main"]["serverAddress"]);
	outputs["Result"]["value"]=myExecuteResult.replace(reg,"");
	return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: outputs };
}
