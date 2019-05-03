var fileCounter=0;

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
    return tmp[0];
}

/**
 * Fetch primary key
 */
function getPrimaryKey(conf,table){
    var req="select col from primary_keys where tbl='"+table+"'";
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var pkey=eval(myExecuteResult);
    if(pkey[0])
	return pkey[0]["col"];
    else
	return "ogc_fid";
}

/**
 * Fetch type
 */
function getType(conf,id){
    var req="select code from mm4me_ftypes where id='"+id+"'";
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var pkey=eval(myExecuteResult);
    return pkey[0]["code"];
}

function replayHistoryForTable(conf,obj,sqlResult,sqlContent,extra){
    /**
     * Fetch editable columns
     */
    var req="select distinct (name) as name, ftype, value from mm4me_edition_fields where eid in (SELECT id from mm4me_editions where step >=0 and ptid = (select id from mm4me_tables where name='"+obj["tbl"].replace(/_/,".")+"') ) and edition > 0 group by name";
    var myOutputs1= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"mimeType":"application/json","type": "complex"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult1=myProcess.Execute(myInputs,myOutputs1);
    alert(myExecuteResult1);

    var efields=eval(myExecuteResult1);
    var sqlPartContent="INSERT INTO "+(obj["tbl"].replace(/_/,"."))+" (";
    var initContent=sqlPartContent;
    var protect="$q$";
    var currentValues="";
    var lcnt=0;
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	//sqlContent+="[__"+ctype+"__]";
	if(ctype!="tbl_linked" && ctype!="tbl_link" && ctype!="link" && efields[j]["name"].indexOf("unamed_")<0){
	    if(lcnt>0){
		sqlPartContent+=", ";
		//currentValues+=", ";
	    }
	    sqlPartContent+=efields[j]["name"];
	    lcnt+=1;
	    //currentValues+=protect+currentTuple[0][efields[j]["name"]]+protect;
	}
    }
    var subSql="(select id from mm.users where login = '"+conf["senv"]["login"]+"')";
    
    /**
     * Fetch the corresponding tuple
     */
    var pkey=getPrimaryKey(conf,obj["tbl"]);
    var reqInit="select ";
    var reqCurrent="";
    var reqCurrent1="";
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	if(ctype=="bytea" || ctype=="geometry"){
	    if(ctype=="geometry"){
		if(reqCurrent!="")
		    reqCurrent+=", ";
		reqCurrent+='quote('+efields[j]["name"].replace("wkb_geometry","geometry")+') as '+efields[j]["name"];//+', writefile("'+conf["main"]["tmpPath"]+'/import_'+conf["lenv"]["usid"]+'_'+fileCounter+'.bin",'+efields[j]["name"]+') as wfile';
	    }
	    if(reqCurrent1!="")
		reqCurrent1+=", ";
	    reqCurrent1+='quote('+efields[j]["name"].replace("wkb_geometry","geometry")+') as '+efields[j]["name"];//+', writefile("'+conf["main"]["tmpPath"]+'/import_'+conf["lenv"]["usid"]+'_'+fileCounter+'.bin",'+efields[j]["name"]+') as wfile';
	    fileCounter+=1;
	}
	else{
	    if(efields[j]["name"].indexOf("unamed_")<0){
		if(reqCurrent!="")
		    reqCurrent+=", ";
		reqCurrent+=efields[j]["name"];
		if(reqCurrent1!="")
		    reqCurrent1+=", ";
		reqCurrent1+=efields[j]["name"];
	    }
	}
    }
    var reqEnd=" from "+obj["tbl"]+" WHERE "+pkey+"="+obj["pkey_value"];
    var req=reqInit+reqCurrent+reqEnd;
    var initReq=reqInit+reqCurrent1+reqEnd;
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"mimeType":"application/json","type": "complex"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var currentTuple=eval(myExecuteResult);
    alert("**** > "+myExecuteResult);
    var binaryValues=[];
    var geometryValues=[];
    alert("**** > "+req);
    lcnt=0;
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	//sqlContent.push("[__"+ctype+"__]");
	if(efields[j]["ftype"]!=11 && efields[j]["name"].indexOf("unamed_")<0){
	    if(lcnt>0){
		//sqlPartContent+=", ";
		currentValues+=", ";
	    }
	    //sqlPartContent+=efields[j]["name"];
	    var ctype=getType(conf,efields[j]["ftype"]);
	    if(ctype!="bytea" && ctype!="geometry" ){
		if(currentTuple[0][efields[j]["name"]]=="(null)")
		    currentValues+=(ctype=="ref"?"null":(ctype=="float"?"0":(ctype=="boolean"?"false":"''")));
	        else
		    currentValues+=protect+currentTuple[0][efields[j]["name"]]+protect;
	    }
	    else{
		if(ctype=="geometry")
		    geometryValues.push({"name": efields[j]["name"], "value":currentTuple[0][efields[j]["name"]]});
		else
		    binaryValues.push({"name": efields[j]["name"], "value":currentTuple[0][efields[j]["name"]]});
		currentValues+="NULL";
	    }
	    lcnt+=1;
	}
    }

    if(extra)
	for(var j in extra){
	    sqlPartContent+=","+j;
	    currentValues+=","+extra[j];
	}
    var subSql="(select id from mm.users where login = '"+conf["senv"]["login"]+"')";
    sqlPartContent+=", uid) VALUES ("+currentValues+","+subSql+") ";
    var hasReturnedId=false;
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	if((ctype=="bytea" || ctype=="geometry" || ctype=="tbl_linked" || ctype=="tbl_link" || ctype=="link") && !hasReturnedId){
	    sqlPartContent+=" RETURNING id";
	    hasReturnedId=true;
	    break;
	}
    }
    var referenceId=null;
    var inputDSN=getMapLayersInfo(conf);
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": sqlPartContent,"mimeType":"application/json"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    alert(sqlPartContent);
    alert(myExecuteResult);
    //sqlContent.push("[__"+myExecuteResult+"__]");
    if(hasReturnedId){
	var currentTuple=eval(myExecuteResult);
	referenceId=currentTuple[0]["id"];
	for(var j=0;j<efields.length;j++){
	    var ctype=getType(conf,efields[j]["ftype"]);
	    if(ctype=="bytea"){
		for(var kk=0;kk<binaryValues.length;kk++){
		    alert("BINARY VALUES ! "+kk);
		    for(var k=0;k<currentTuple.length;k++){
			try{
			    alert("************* !!!!!!"+1);
			    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
			    alert("************* !!!!!!"+2);
			    /*var myInputs={
				"table": {"value": obj["tbl"].replace(/_/,"."),"type":"string"},
				"field": {"value": binaryValues[kk]["name"],"type":"string"},
				"binaryString": {"value": binaryValues[kk]["value"],"type":"string"},
				"id": {"value": currentTuple[k]["id"],"type":"string"}
			    };*/
			    var myInputs={
				"table": {"value": obj["tbl"],"type":"string"},
				"tableName": {"value": obj["tbl"].replace(/_/,"."),"type":"string"},
				"field": {"value": binaryValues[kk]["name"],"type":"string"},
				"q": {"value": initReq,"mimeType":"application/json"},
				"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
				"dsoName": {"value": "","type":"string"},
				"id": {"value": currentTuple[k]["id"],"type":"string"}
			    };
			    alert("************* !!!!!!"+3);
			    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.recoverFileFromHexInDb');
			    alert("************* !!!!!!"+4);
			    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
			    alert("************* !!!!!!"+5);
			    alert(myExecuteResult);
			}catch(e){
			    alert("************* !!!!!!"+6);
			}
		    }
		}
		binaryValues=[];
	    }else{
		if(ctype=="geometry"){
		    for(var kk=0;kk<geometryValues.length;kk++){
			alert("GEOMETRY VALUES ! "+kk);
			for(var k=0;k<currentTuple.length;k++){
			    alert("GEOMETRY VALUES found in tuple ! "+k);
			    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
			    var myInputs={
				"table": {"value": obj["tbl"].replace(/_/,"."),"type":"string"},
				"field": {"value": geometryValues[kk]["name"],"type":"string"},
				"binaryString": {"value":  geometryValues[kk]["value"],"type":"string"},
				"id": {"value": currentTuple[k]["id"],"type":"string"},
				"type": {"value": "geometry","type":"string"}
			    };
			    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.recoverFileFromHex');
			    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
			    alert(myExecuteResult);
			}
		    }
		    geometryValues=[];
		}
	    }
	}
    }
    sqlContent.push(sqlPartContent);
    sqlResult.push("DELETE FROM "+obj["tbl"]+" WHERE "+pkey+"="+obj["pkey_value"]+";");


    alert(" ---------------------------------------- ");
    alert(" FINAL STEP import linked content ! ");
    alert(" ---------------------------------------- ");
    var req="select name, ftype, value from mm4me_edition_fields where eid in (SELECT id from mm4me_editions where step >=0 and ptid = (select id from mm4me_tables where name='"+obj["tbl"].replace(/_/,".")+"') ) and edition >= 0";
    var myOutputs1= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"mimeType":"application/json","type":"complex"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult1=myProcess.Execute(myInputs,myOutputs1);
    alert(myExecuteResult1);
    var efields=eval(myExecuteResult1);
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	alert(" ---------------------------------------- ");
	alert(ctype);
	alert(" ---------------------------------------- ");
	//sqlContent+="[__"+ctype+"__]";
	/*if(ctype=="tbl_linked" || ctype=="tbl_link" || ctype=="link"){
	    sqlContent.push("[__"+efields[j]["value"]+"__]");
	}*/
	var tmp=efields[j]["value"].split(';');
	if(ctype=="tbl_linked"){
	    var tbl=tmp[2].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    var lpkey=getPrimaryKey(conf,tbl);
	    var req="SELECT "+lpkey+" as id FROM "+tbl+" WHERE "+tmp[0]+" = '"+obj["pkey_value"]+"'";
	    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
	    var myInputs={
		"dsoName": {"value": "","type":"string"},
		"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
		"q": {"value": req,"type":"string"},
	    }
	    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
	    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
	    var currentTuple=eval(myExecuteResult);
	    for(var k=0;k<currentTuple.length;k++){
		var localTuple={
		    tbl: tbl,
		    pkey_value: currentTuple[k]["id"]
		};
		var extra={};
		extra[tmp[0]]=(referenceId==null?obj["pkey_value"]:referenceId);
		alert(" ---------------------------------------- ");
		alert("replayHistoryForTable " + localTuple["tbl"]);
		alert(ctype);
		alert(" ---------------------------------------- ");
		replayHistoryForTable(conf,localTuple,sqlResult,sqlContent,extra);
	    }	    
	}else{
	    if(ctype=="tbl_link"){
	    }
	    else{
		if(ctype=="link"){
		    var tbl=tmp[1].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
		    var lpkey=getPrimaryKey(conf,tbl);
		    var req="SELECT "+lpkey+" as id FROM "+tbl+" WHERE "+tmp[0]+" = '"+obj["pkey_value"]+"'";
		    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
		    var myInputs={
			"dsoName": {"value": "","type":"string"},
			"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
			"q": {"value": req,"type":"string"},
		    }
		    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
		    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
		    var currentTuple=eval(myExecuteResult);
		    for(var k=0;k<currentTuple.length;k++){
			var localTuple={
			    tbl: tbl,
			    pkey_value: currentTuple[k]["id"]
			};
			var extra={};
			extra[tmp[0]]=(referenceId==null?obj["pkey_value"]:referenceId);
			alert("replayHistoryForTable " + localTuple["tbl"]);
			replayHistoryForTable(conf,localTuple,sqlResult,sqlContent,extra);
		    }
		}
	    }
	}
    }
    
}

function replaySqliteHistory(conf,inputs,outputs){
    conf["lenv"]["message"]="Replay history log ...";
    ZOOUpdateStatus(conf,5);
    var sqlContent=[];
    var sqlResult=[];

    alert(conf["senv"]["last_file"]);
    var req="select tbl,pkey_value,edition_time,sql from history_log where sql like 'INSERT%' and tbl in (select replace(name,'.','_') from mm4me_tables where id in (select ptid from mm4me_views where visible))";
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"mimeType":"application/json"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    alert(myExecuteResult);
    var localResult=eval(myExecuteResult);
    for(var i=0;i<localResult.length;i++){
	var sqlPartContent="";
	conf["lenv"]["message"]="Replay step: "+(i+1);
	ZOOUpdateStatus(conf,14+((i)*(86/localResult.length)));
	replayHistoryForTable(conf,localResult[i],sqlResult,sqlContent,null);
    }

    sqlResult.push("DELETE FROM history_log");
    var json=new ZOO.Format.JSON();
    outputs["Result"]["value"]=json.write(sqlResult);
    outputs["Log"]["value"]=json.write(sqlContent);
    return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: outputs };
    
}

function createSqliteDB4ME(conf,inputs,outputs){
    var json=new ZOO.Format.JSON();
    var indexesToCreate=[];
    var dbFile0="mm4meedit_"+conf["lenv"]["usid"]+".db";
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
	"mm4me_gc": {
	    "table": "public.geometry_columns",
	    "clause": " where f_table_schema in (select split_part(name,'.',1) as schema from mm_tables.p_tables where id in (select ptid from mm_tables.p_editions where id in (select eid from mm_tables.p_edition_fields where ftype=18))) and f_table_name in (select split_part(name,'.',2) as schema from mm_tables.p_tables where id in (select ptid from mm_tables.p_editions where id in (select eid from mm_tables.p_edition_fields where ftype=18)))"
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

	indexesToCreate.push("CREATE INDEX "+i+"_idx ON "+i+" (id) ");
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	var myExecuteResult=myProcess.Execute(myInputs,{});
	var myExecuteResult0=myExecuteResult;
	alert(myExecuteResult);
	myInputs["OutputDSN"]={"value": dbFile0,"type":"string"};
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
    var mmPrimaryTables=[];
    for(var i=0;i<myExecuteResult0.length;i++){
	conf["lenv"]["message"]="Export structure:"+" "+myExecuteResult0[i]["name"];
	ZOOUpdateStatus(conf,((((50-16)/myExecuteResult0.length)*i)+16));
	alert("+++++ >"+i+" "+myExecuteResult0[i]);
	mmPrimaryTables.push(myExecuteResult0[i]["name"]);
	alert("+++++ >"+"SELECT * FROM "+myExecuteResult0[i]["name"]+" limit 0 ");
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
		indexesToCreate.push("CREATE INDEX "+myExecuteResult0[i]["name"].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4")+"_"+myExecuteResult01[j][1]+"_idx ON "+myExecuteResult0[i]["name"].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4")+" ("+myExecuteResult01[j][1]+")");
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
	var myExecuteResult2=myProcess2.Execute(myInputs,myOutputs1);
	alert(myExecuteResult2);

	var myInputs={
	    "append": {"value": "true","type":"string"},
	    "update": {"value": "true","type":"string"},
	    "InputDSN": {"value": inputDSN,"type":"string"},
	    "OutputDSN": {"value": dbFile0,"type":"string"},
	    "F": {"value": "SQLite","type":"string"},
	    "nln": {"value": myExecuteResult0[i]["name"].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4"),"type":"string"},
	    "sql": {"value": "SELECT * FROM "+myExecuteResult0[i]["name"]+" limit 0 ","type":"string"},
	}
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
	var myExecuteResult=myProcess.Execute(myInputs,{});
	alert(myExecuteResult);

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
	"q": {"value": "SELECT name,value,dependencies FROM "+dbs["mm4me_edition_fields"]["table"]+" "+dbs["mm4me_edition_fields"]["clause"]+" AND ftype=(select id from mm_tables.ftypes where ftype='e' and code='ref' and dependencies != '' and dependencies is not null)","type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var myExecuteResult0=eval(myExecuteResult);
    alert(myExecuteResult);
    alert(myExecuteResult0);
    var tablesImported=[];
    var indexesKeys={};
    for(var i=0;i<myExecuteResult0.length;i++){
	try{
	    alert(" **** "+myExecuteResult0[i]["dependencies"]);
	    var tmp=json.read(myExecuteResult0[i]["dependencies"]);
	    for(var j=0;j<tmp.length;j++){
		for(var k in tmp[j]){
		    indexesKeys[k]=tmp[j][k]["tfield"];
		}
	    }
	}catch(e){
	    alert(e);
	}
    }

    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": "SELECT name,value,dependencies FROM "+dbs["mm4me_edition_fields"]["table"]+" "+dbs["mm4me_edition_fields"]["clause"]+" AND ftype=(select id from mm_tables.ftypes where ftype='e' and code='ref')","type":"string"},
    }
    alert("O_o o_O "+"SELECT name,value,dependencies FROM "+dbs["mm4me_edition_fields"]["table"]+" "+dbs["mm4me_edition_fields"]["clause"]+" AND ftype=(select id from mm_tables.ftypes where ftype='e' and code='ref')");
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var myExecuteResult0=eval(myExecuteResult);
    alert(myExecuteResult);
    alert(myExecuteResult0);
    var tablesImported=[];
    var tablesImported0=[];
    var indexesKeys={};
    var lcnt0=0;
    for(var i=0;i<myExecuteResult0.length;i++){
	alert(myExecuteResult0[i]["value"]);
	var matched=myExecuteResult0[i]["value"].match(/(\w+)(\d*)\.(\d*)(\w+)/);
	if(matched!=null && matched[1]){
	    conf["lenv"]["message"]="Export reference tables: "+matched[0];
	    ZOOUpdateStatus(conf,(((20/myExecuteResult0.length)*i)+50));
	    alert("+++++ >"+i+" "+matched[0]);
	    var currentTable=matched[0];
	    var currentTableName=matched[0].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    if(indexesKeys[myExecuteResult0[i]["name"]]){
		indexesToCreate.push("CREATE INDEX "+currentTableName+"_"+indexesKeys[myExecuteResult0[i]["name"]]+"_idx ON "+currentTableName+" ("+indexesKeys[myExecuteResult0[i]["name"]]+")");
	    }
	    if(tablesImported.indexOf(matched[0])<0){
		tablesImported.push(matched[0]);
		var myOutputs= {};
		var myInputs={
		    "dsoName": {"value": "","type":"string"},
		    "dstName": {"value": conf["main"]["tmpPath"]+"/"+dbFile,"type":"string"},
		    "q": {"value": "BEGIN;DELETE FROM geometry_columns where f_table_name='"+currentTableName+"';COMMIT;BEGIN;DROP TABLE "+currentTableName+";COMMIT;","type":"string"},
		}
		var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
		var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
		alert("+++++++++\n\nDROP TABLE "+currentTableName+" "+myExecuteResult+" \n\n++++++++++++++\n" );
		var myInputs={
		    "overwrite": {"value": "true","type":"string"},
		    "InputDSN": {"value": inputDSN,"type":"string"},
		    "OutputDSN": {"value": dbFile,"type":"string"},
		    "F": {"value": "SQLite","type":"string"},
		    "nln": {"value": currentTableName,"type":"string"},
		    "sql": {"value": "SELECT * FROM "+currentTable+"  ","type":"string"},
		}
		//if(lcnt0>0){
		    myInputs["update"]={"value": "true","type":"string"};
		/*}
		lcnt0+=1;*/
		var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-converter.Ogr2Ogr');
		var myExecuteResult=myProcess.Execute(myInputs,{});
		alert(myExecuteResult);
		alert(myExecuteResult0[i]["name"]);
	    }
	    var myOutputs1= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	    var myInputs1={
		"table": {"value": currentTable,"type":"string"},
		"dataStore": {"value": conf["main"]["dbuserName"],"type":"string"}
	    };
	    var myProcess1 = new ZOO.Process(conf["main"]["serverAddress"],'datastores.postgis.getTableDescription');
	    var myExecuteResult01=myProcess1.Execute(myInputs1,myOutputs1);
	    alert(" **** ---- "+myExecuteResult01);
	    try{
		myExecuteResult01=eval(myExecuteResult01);
		//alert(myExecuteResult1);
		for(var j=0;j<myExecuteResult01.length;j++){
		    alert(myExecuteResult01[j][1]+" "+(myExecuteResult01[j][1].indexOf("id")>=0 && myExecuteResult01[j][3]!="FOR"))
		    if(myExecuteResult01[j][3]=="PRI"){
			indexesToCreate.push("CREATE INDEX "+currentTableName+"_"+myExecuteResult01[j][1]+"_idx ON "+currentTableName+" ("+myExecuteResult01[j][1]+")");
			alert("CREATE INDEX "+currentTableName+"_"+myExecuteResult01[j][1]+"_idx ON "+currentTableName+" ("+myExecuteResult01[j][1]+")");
			break;
		    }else{
			if(myExecuteResult01[j][1].indexOf("id")>=0 && myExecuteResult01[j][3]!="FOR"){
			    indexesToCreate.push("CREATE INDEX "+currentTableName+"_"+myExecuteResult01[j][1]+"_idx ON "+currentTableName+" ("+myExecuteResult01[j][1]+")");
			    alert("CREATE INDEX "+currentTableName+"_"+myExecuteResult01[j][1]+"_idx ON "+currentTableName+" ("+myExecuteResult01[j][1]+")");
			}
		    }
		}
	    }catch(e){
		alert("************************ !!!!!!!!!!! "+e);
	    }

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
	if(matched[matched.length-1] && tablesImported.indexOf(matched[matched.length-1])<0){
	    tablesImported.push(matched[matched.length-1]);
	    conf["lenv"]["message"]="Export link structure:"+" "+matched[matched.length-2];
	    ZOOUpdateStatus(conf,((10/myExecuteResult0.length)*i)+70);
	    alert("+++++ >"+i+" "+matched[matched.length-2]);
	    var currentTable=matched[matched.length-2];
	    var currentTableName=matched[matched.length-2].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
	    indexesToCreate.push("CREATE INDEX "+currentTableName+"_"+matched[matched.length-2]+"_idx ON "+currentTableName+" ("+matched[matched.length-2]+");");
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

	var currentTable=matched[matched.length-2];
	var currentTableName=matched[matched.length-2].replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");

	if(matched[matched.length-2] && tablesImported.indexOf(matched[matched.length-2])<0){
	    conf["lenv"]["message"]="Export link structure:"+" "+matched[matched.length-2];
	    ZOOUpdateStatus(conf,((10/myExecuteResult0.length)*i)+80);
	    alert("+++++ >"+i+" "+matched[matched.length-1]);
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
    for(var i=0;i<indexesToCreate.length;i++){
	conf["lenv"]["message"]="Create indexes ...";
	ZOOUpdateStatus(conf,((9/indexesToCreate.length)*i)+90);
	var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
	var myInputs={
	    "dsoName": {"value": "","type":"string"},
	    "dstName": {"value": conf["main"]["tmpPath"]+"/"+dbFile,"type":"string"},
	    "q": {"value": indexesToCreate[i],"type":"string"},
	}
	var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
	var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    }
    outputs["Result"]["generated_file"]=conf["main"]["tmpPath"]+"/"+dbFile;
    outputs["Result1"]["generated_file"]=conf["main"]["tmpPath"]+"/"+dbFile0;
    if(inputs["tileId"]["value"]==0)
    outputs["Result2"]["generated_file"]=conf["main"]["tmpPath"]+"/tiles.db";
    else
    outputs["Result2"]["generated_file"]=conf["main"]["tmpPath"]+"/tiles/mmTiles-g-"+inputs["tileId"]["value"]+".db";
    myInputs={
      "table": {"value": mmPrimaryTables,"isArray":true,"length": mmPrimaryTables.length,"dataType":"string"}
    }
    var myOutputs= {Result: { type: 'RawDataOutput', "mimeType": "application/json" }};
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'np.getBaseLayersForTable');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    alert(myExecuteResult);
    outputs["Result3"]["value"]=myExecuteResult;
    return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: outputs };
    
}
