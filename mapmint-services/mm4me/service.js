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
    return tmp;
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
    var req="select distinct (name) as name, ftype, value from mm4me_edition_fields where eid in (SELECT id from mm4me_editions where step >=0 and ptid = (select id from mm4me_tables where name='"+obj["tbl"].replace(/_/,".")+"') ) and edition > 0 ";
    var myOutputs1= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult1=myProcess.Execute(myInputs,myOutputs1);
    var efields=eval(myExecuteResult1);
    var sqlPartContent="INSERT INTO "+(obj["tbl"].replace(/_/,"."))+" (";
    var initContent=sqlPartContent;
    var protect="$q$";
    var currentValues="";
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	//sqlContent+="[__"+ctype+"__]";
	if(ctype!="tbl_linked" && ctype!="tbl_link" && ctype!="link"){
	    if(j>0){
		sqlPartContent+=", ";
		//currentValues+=", ";
	    }
	    sqlPartContent+=efields[j]["name"];
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
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	if(ctype=="bytea"){
	    if(reqCurrent!="")
		reqCurrent+=", ";
	    reqCurrent+='quote('+efields[j]["name"]+') as '+efields[j]["name"];//+', writefile("'+conf["main"]["tmpPath"]+'/import_'+conf["lenv"]["usid"]+'_'+fileCounter+'.bin",'+efields[j]["name"]+') as wfile';
	    fileCounter+=1;
	}
	else{
	    if(efields[j]["name"].indexOf("unamed_")<0){
		if(reqCurrent!="")
		    reqCurrent+=", ";
		reqCurrent+=efields[j]["name"];
	    }
	}
    }
    var reqEnd=" from "+obj["tbl"]+" WHERE "+pkey+"="+obj["pkey_value"];
    var req=reqInit+reqCurrent+reqEnd;
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    var currentTuple=eval(myExecuteResult);
    
    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
	//sqlContent.push("[__"+ctype+"__]");
	if(efields[j]["ftype"]!=11){
	    if(j>0){
		//sqlPartContent+=", ";
		currentValues+=", ";
	    }
	    //sqlPartContent+=efields[j]["name"];
	    currentValues+=protect+currentTuple[0][efields[j]["name"]]+protect;
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
	if(ctype=="tbl_linked" || ctype=="tbl_link" || ctype=="link"){
	    sqlPartContent+=" RETURNING id";
	    hasReturnedId=true;
	}
    }
    var referenceId=null;
    var inputDSN=getMapLayersInfo(conf);
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": inputDSN,"type":"string"},
	"q": {"value": sqlPartContent,"type":"string"},
    }
    var myProcess = new ZOO.Process(conf["main"]["serverAddress"],'vector-tools.vectInfo');
    var myExecuteResult=myProcess.Execute(myInputs,myOutputs);
    //sqlContent.push("[__"+myExecuteResult+"__]");
    if(hasReturnedId){
	var currentTuple=eval(myExecuteResult);
	referenceId=currentTuple[0]["id"];
    }
    sqlContent.push(sqlPartContent);
    sqlResult.push("DELETE FROM "+obj["tbl"]+" WHERE "+pkey+"="+obj["pkey_value"]+";");

    for(var j=0;j<efields.length;j++){
	var ctype=getType(conf,efields[j]["ftype"]);
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

    var req="select tbl,pkey_value,edition_time,sql from history_log where sql like 'INSERT%' and tbl in (select replace(name,'.','_') from mm4me_tables where id in (select ptid from mm4me_views where visible))";
    var myOutputs= {"Result":{  type: 'RawDataOutput', "mimeType": "application/json" }};
    var myInputs={
	"dsoName": {"value": "","type":"string"},
	"dstName": {"value": conf["senv"]["last_file"],"type":"string"},
	"q": {"value": req,"type":"string"},
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

    var json=new ZOO.Format.JSON();
    outputs["Result"]["value"]=json.write(sqlResult);
    outputs["Log"]["value"]=json.write(sqlContent);
    return {result: ZOO.SERVICE_SUCCEEDED, conf: conf, outputs: outputs };
    
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
