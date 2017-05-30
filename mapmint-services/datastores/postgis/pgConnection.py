
import psycopg2
import libxml2
import libxslt
import osgeo.ogr
import sys
import zoo
import json
try:
    from manage_users.manage_users import mm_md5
except:
    from manage_users import mm_md5

class pgConnection:
    def __init__(self,conf,dbfile):
        self.dbfile=dbfile
        self.conf=conf

    def parseConf(self):
	libxml2.initParser()
        doc = libxml2.parseFile(self.conf["main"]["dataPath"]+"/PostGIS/"+self.dbfile+".xml")
        styledoc = libxml2.parseFile(self.conf["main"]["dataPath"]+"/PostGIS/conn.xsl")
        style = libxslt.parseStylesheetDoc(styledoc)
        res=style.applyStylesheet(doc, None)
        self.db_string=res.content.replace("PG: ","")
        
    def connect(self):
        try:
            self.conn = psycopg2.connect(self.db_string)
            self.cur = self.conn.cursor()
            return True
        except Exception,e:
            self.conf["lenv"]["message"]="Unable to connect: "+str(e)
            return False

    def execute(self,req):
        try:
            self.ex=self.cur.execute(req)
            if req.count("SELECT")>0 or req.count("select")>0:
                return self.cur.fetchall()
            else:
                return True
        except Exception,e:
            self.conf["lenv"]["message"]="Unable to execute "+req.encode('utf-8')+" due to: "+str(e)
            #print >> sys.stderr,"Unable to execute "+req+str(e)
            return False

def listSchemas(conf,inputs,outputs):
        print >> sys.stderr,inputs["dataStore"]["value"]
	db=pgConnection(conf,inputs["dataStore"]["value"])
	db.parseConf()
	if db.connect():
		res=db.execute("select nspname as schema from pg_namespace WHERE nspname NOT LIKE 'information_schema' AND nspname NOT LIKE 'pg_%' ORDER BY nspname")
                if res:
                    outputs["Result"]["value"]=json.dumps(res)
		return zoo.SERVICE_SUCCEEDED
	else:
		print >> sys.stderr,"Unable to connect"
		return zoo.SERVICE_FAILED

def listTables(conf,inputs,outputs):
	import authenticate.service as auth
	if not(auth.is_ftable(inputs["schema"]["value"])):
		conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
		return zoo.SERVICE_FAILED
	db=pgConnection(conf,inputs["dataStore"]["value"])
	db.parseConf()
	if db.connect():
            req="select schemaname||'.'||tablename as tablename, tablename as display from pg_tables WHERE schemaname NOT LIKE 'information_schema' AND schemaname NOT LIKE 'pg_%' AND tablename NOT LIKE 'spatial_ref_sys' AND  tablename NOT LIKE 'geometry_columns' "
            if inputs.has_key("schema"):
                req+="AND schemaname='"+inputs["schema"]["value"]+"'"
            req+=" ORDER BY schemaname||'.'||tablename"
            res=db.execute(req)
            outputs["Result"]["value"]=json.dumps(res)
            return zoo.SERVICE_SUCCEEDED
		#return zoo.SERVICE_SUCCEEDED
        else:
            print >> sys.stderr,"Unable to connect"
            return zoo.SERVICE_FAILED

def listTablesAndViews(conf,inputs,outputs):
	db=pgConnection(conf,inputs["dataStore"]["value"])
	db.parseConf()
	if db.connect():
            req="select schemaname||'.'||tablename as tablename, tablename as display from pg_tables WHERE schemaname NOT LIKE 'information_schema' AND schemaname NOT LIKE 'pg_%' AND tablename NOT LIKE 'tmp%' AND tablename NOT LIKE 'spatial_ref_sys' AND  tablename NOT LIKE 'geometry_columns' "
            req1="select schemaname||'.'||viewname as tablename, viewname as display from pg_views WHERE schemaname NOT LIKE 'information_schema' AND schemaname NOT LIKE 'pg_%' "
            if inputs.has_key("schema"):
                req+=" AND schemaname='"+inputs["schema"]["value"]+"'"
                req1+=" AND schemaname='"+inputs["schema"]["value"]+"'"
            res=db.execute("SELECT * from ("+req+") as foo UNION ("+req1+") ORDER BY display")
            if res:
                outputs["Result"]["value"]=json.dumps(res)
		return zoo.SERVICE_SUCCEEDED
        else:
            print >> sys.stderr,"Unable to connect"
            return zoo.SERVICE_FAILED

def getDesc(cur,table):
    tmp=table.split('.')
    if len(tmp)==1 :
        tmp1=tmp[0]
        tmp=["public",tmp1];
    req="SELECT b.relname as t FROM pg_inherits, pg_class a, pg_class b WHERE inhrelid=a.oid AND inhparent=b.oid AND a.relname = '"+tmp[1]+"' AND a.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')"
    res0=cur.execute(req)
    res=cur.fetchall()
    if res!=False and len(res)>0:
        return "SELECT * FROM (SELECT DISTINCT ON (\"Pos\",\"Field\") * FROM ((SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='"+res[0][0]+"' AND pg_namespace.oid=relnamespace AND nspname='"+tmp[0]+"') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '"+res[0][0]+"') b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+res[0][0]+"' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+res[0][0]+"' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='"+res[0][0]+"' AND at2.attrelid=t.oid) AS foreigns ON foreigns.myid=a.\"Pos\") UNION (SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='"+tmp[1]+"' AND pg_namespace.oid=relnamespace AND nspname='"+tmp[0]+"') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '"+tmp[1]+"' and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"') ) b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+tmp[1]+"' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+tmp[1]+"' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='"+tmp[1]+"' and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"') AND at2.attrelid=t.oid) AS foreigns ON foreigns.myid=a.\"Pos\")) As foo) as foo1 ORDER BY \"Pos\",\"Key\""
    else:
        #print >> sys.stderr,"SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='"+tmp[1]+"' AND pg_namespace.oid=relnamespace AND nspname='"+tmp[0]+"') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '"+tmp[1]+"'  and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')) b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+tmp[1]+"' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0  and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+tmp[1]+"' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='"+tmp[1]+"' AND at2.attrelid=t.oid  and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')) AS foreigns ON foreigns.myid=a.\"Pos\""
        return "SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT * FROM (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='"+tmp[1]+"' AND pg_namespace.oid=relnamespace AND nspname='"+tmp[0]+"') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '"+tmp[1]+"'  and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')) b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+tmp[1]+"' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0  and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '"+tmp[1]+"' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='"+tmp[1]+"' AND at2.attrelid=t.oid  and t.relnamespace=(select oid from pg_namespace where nspname='"+tmp[0]+"')) AS foreigns ON foreigns.myid=a.\"Pos\" order by \"Key\"='PRI' or \"Key\"='FOR' desc) As f"

def getTableDescription(conf,inputs,outputs):
	import authenticate.service as auth
	#if not(auth.is_ftable(inputs["table"]["value"])):
	#	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	#	return zoo.SERVICE_FAILED
	db=pgConnection(conf,inputs["dataStore"]["value"])
	db.parseConf()
	if db.connect():
            tmp=inputs["table"]["value"].split('.')
            req=getDesc(db.cur,inputs["table"]["value"])
            print >> sys.stderr,req
            res=db.execute(req)
            if res!=False and len(res)>0:
                outputs["Result"]["value"]=json.dumps(res)
		return zoo.SERVICE_SUCCEEDED
            else:
                print >> sys.stderr,"unable to run request "+req
                return zoo.SERVICE_FAILED
        else:
            print >> sys.stderr,"Unable to connect"
            return zoo.SERVICE_FAILED

def getTableContent(conf,inputs,outputs):
	import authenticate.service as auth
	#if not(auth.is_ftable(inputs["table"]["value"])):
	#	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	#	return zoo.SERVICE_FAILED
        db=pgConnection(conf,inputs["dataStore"]["value"])
	db.parseConf()
        getTableDescription(conf,inputs,outputs)
        tmp=eval(outputs["Result"]["value"].replace("null","None"))
        pkey=0
        geom=[]
        files=[]
        fields=""
        for i in range(0,len(tmp)):
            if tmp[i][3]=="PRI":
                pkey=tmp[i][0]
            if tmp[i][2]=="geometry":
                geom+=[i]
            if tmp[i][2]=="bytea":
                files+=[i]
            if tmp[i][3]=="FOR" and not(inputs.has_key("force")):
                input1=inputs
                otbl=inputs["table"]["value"]
                inputs["table"]["value"]=tmp[i][4]
                getTableDescription(conf,inputs,outputs)
                tmp2=eval(outputs["Result"]["value"].replace("null","None"))
                pkey1=0
                for j in range(0,len(tmp2)):
                    if tmp2[j][3]=="PRI":
                        pkey1=j
                        break
                hasV=False
                for j in range(0,len(tmp2)):
                    if not(hasV) and (tmp2[j][2].count("char")>0 or tmp2[j][2].count("text")>0):
                        if fields!="":
                            fields+=","
                        hasV=True
                        fields+="(SELECT "+tmp2[j][1]+" FROM "+tmp[i][4]+" as a WHERE a."+tmp2[pkey][1]+"="+otbl+"."+tmp[i][1]+")"
                if not(hasV):
                    if fields!="":
                        fields+=","
                    fields+="(SELECT "+tmp2[0][1]+" FROM "+tmp[i][4]+" as a WHERE a."+tmp2[pkey][1]+"="+otbl+"."+tmp[i][1]+")"
                inputs["table"]["value"]=otbl
            else:
                if fields!="":
                    fields+=","
                fields+=tmp[i][1]
	if db.connect():
            tmp=inputs["table"]["value"].split(".")
            tmp[0]='"'+tmp[0]+'"'
            tmp[1]='"'+tmp[1]+'"'
            inputs["table"]["value"]=(".").join(tmp)
            req="select count(*) from "+inputs["table"]["value"]
            res=db.execute(req)
            if res!=False:
                total=res[0][0]
            req="select "
            if inputs.has_key("cols") and inputs["cols"]["value"]!="NULL":
                req+=inputs["cols"]["value"]
            else:
                req+=fields
            req+=" from "+inputs["table"]["value"]
            if inputs.has_key("clause") and inputs["clause"]["value"]!="NULL":
                req+=" WHERE "+inputs["clause"]["value"]
            if inputs.has_key("sortname") and inputs["sortname"]["value"]!="NULL":
                req+=" ORDER BY "+inputs["sortname"]["value"]+" "+inputs["sortorder"]["value"]
            if inputs.has_key("limit") and inputs["limit"]["value"]!="NULL":
                if inputs.has_key("page") and inputs["page"]["value"]!="":
                    req+=" OFFSET "+str((int(inputs["page"]["value"])-1)*int(inputs["limit"]["value"]))
                    page=inputs["page"]["value"]
                req+=" LIMIT "+inputs["limit"]["value"]
            else:
                page=1
                req+=" LIMIT 10"
            print >> sys.stderr,req
            res=db.execute(req)
            if res!=False:
                rows=[]
                for i in range(0,len(res)):
                    res0=[]
                    for k in range(0,len(res[i])):
                        try:
                            tmp=res[i][k].encode('utf-8')
                            print >> sys.stderr,dir(tmp)
                        except Exception,e:
                            print >> sys.stderr,e
                            tmp=str(res[i][k])
                        res0+=[str(tmp)]
                    if len(geom)>0:
                        for j in range(0,len(geom)):
                            res0[geom[j]]="GEOMETRY"
                    if len(files)>0:
                        for j in range(0,len(files)):
                            res0[files[j]]="BINARY FILE"
                    rows+=[{"id": res[i][pkey],"cell": res0}]
                outputs["Result"]["value"]=json.dumps({"page": page, "total": total,"rows": rows},ensure_ascii=False)
		return zoo.SERVICE_SUCCEEDED
            else:
                print >> sys.stderr,"unable to run request"
                return zoo.SERVICE_FAILED
        else:
            print >> sys.stderr,"Unable to connect"
            return zoo.SERVICE_FAILED
                
def deleteTuple(conf,inputs,outputs):
    db=pgConnection(conf,inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        res=db.execute("DELETE FROM "+inputs["table"]["value"]+" WHERE "+inputs["clause"]["value"])
        if res==False:
            conf=db.conf
            return zoo.SERVICE_FAILED
        else:
            db.conn.commit()
            outputs["Result"]["value"]="Tuple deleted"
            return zoo.SERVICE_SUCCEEDED
    else:
        conf=db.conf
        return zoo.SERVICE_FAILED

import psycopg2,json
from psycopg2.extensions import *
def editTuple(conf,inputs,outputs):
    getTableDescription(conf,inputs,outputs)
    desc=eval(outputs["Result"]["value"].replace("null","None"))
    tmp=json.loads(inputs["obj"]["value"])
    if inputs.has_key("clause") and inputs["clause"]["value"]!="NULL":
        req="UPDATE "+inputs["table"]["value"]+" set "
        fields=""
        tkeys=tmp.keys()
        for i in tkeys:
            fd=None
            for k in desc:
                if k[1]==i:
                    fd=k[2]
            if fd is not None:
                print >> sys.stderr,tmp
                print >> sys.stderr,fd
                td=testDesc(tmp[i],fd)
                if td is not None:
                    if fields!="":
                        fields+=", "
                    fields+='"'+i+'"='+td
        if inputs.keys().count("content")>0:
            if fields!="":
                fields+=","
            print >> sys.stderr,inputs["content"]["value"]
            tmp1=inputs["content"]["value"]
            fields+='"content"=%s' % adapt(inputs["content"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n',''))

        req+=fields+" WHERE "+inputs["clause"]["value"]
        outputs["Result"]["value"]="Tuple updated"
    else:
        req="INSERT INTO "+inputs["table"]["value"]+" "
        fields="("
        values="("
        cnt=0
        for i in tmp:
            fd=None
            for k in desc:
                if k[1]==i:
                    fd=k[2]
            td=testDesc(tmp[i],fd)
            if td is not None:
                if fields!="(":
                    fields+=","
                if values!="(":
                    values+=","
                fields+=i
                values+=td
            cnt+=1
        if inputs.keys().count("content")>0:
            if fields!="(":
                fields+=","
            if values!="(":
                values+=","
            fields+="content"
            values+='%s' % adapt(inputs["content"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n',''))
        fields+=")"
        values+=")"
        req+=fields+" VALUES "+values
        outputs["Result"]["value"]="Tuple inserted"
    print >> sys.stderr,req.encode("utf-8")
    db=pgConnection(conf,inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        try:
            res=db.execute(req)
            if res==False:
                conf["lenv"]["message"]=db.conf["lenv"]["message"]
                return zoo.SERVICE_FAILED
            db.conn.commit()
            print >> sys.stderr,res
            return zoo.SERVICE_SUCCEEDED
        except Exception,e:
            conf["lenv"]["message"]="Unable to run the request "+str(e)
            return zoo.SERVICE_FAILED

def testDesc(val,desc):
    if desc=="bool":
        if val=="t" or val:
            return "true"
        else:
            return "false"
    if desc.count("char")>0 or desc.count("text")>0:
        if desc.count("varchar(40)"):
            if val!='NULL':
                return "'"+mm_md5(val)+"'"
            else:
                return None
        else:
            if val!='NULL':
                tmp = adapt(val.encode('utf-8'))
                return str(tmp).decode('utf-8')
            else:
                return "NULL"
    else:
        if desc.count("date")>0:
            tmp=val.split("/")
            return "'"+tmp[2]+"-"+tmp[1]+"-"+tmp[0]+"'"
        else:
            if desc.count("geometry")>0:
                if val!='NULL':
                    return "'"+val+"'"
                else:
                    return val
            else:
                return val

def fetchType(conf,ftype):
    db=pgConnection(conf,conf["main"]["dbuserName"])
    db.parseConf()
    if db.connect():
        res=db.execute("SELECT code from mm_tables.ftypes where id="+ftype)
        if res:
            return str(res[0][0])
    return None

def addColumn(conf,inputs,outputs):
    print >> sys.stderr,inputs["dataStore"]["value"]
    db=pgConnection(conf,inputs["dataStore"]["value"])
    db.parseConf()
    req=[]
    if db.connect():
        if inputs["field_type"]["value"]!="18":
            req+=["ALTER TABLE quote_ident("+inputs["table"]["value"]+") ADD COLUMN "+inputs["field_name"]["value"]+" "+fetchType(conf,inputs["field_type"]["value"])]
            outputs["Result"]["value"]=zoo._("Column added")
        else:
            tblInfo=inputs["table"]["value"].split(".")
            if len(tblInfo)==1:
                tmp=tblInfo[0]
                tblInfo[0]="public"
                tblInfo[1]=tmpl
            req+=["SELECT AddGeometryColumn('"+tblInfo[0]+"','"+tblInfo[1]+"','wkb_geometry',(select srid from spatial_ref_sys where auth_name||':'||auth_srid = '"+inputs["proj"]["value"]+"'),'"+inputs["geo_type"]["value"]+"',2)"]
            outputs["Result"]["value"]=zoo._("Geometry column added.")
            if inputs.keys().count("geo_x")>0 and inputs.keys().count("geo_y")>0:
                req+=["CREATE TRIGGER mm_tables_"+inputs["table"]["value"].replace(".","_")+"_update_geom BEFORE UPDATE OR INSERT ON "+inputs["table"]["value"]+" FOR EACH ROW EXECUTE PROCEDURE automatically_update_geom_property('"+inputs["geo_x"]["value"]+"','"+inputs["geo_y"]["value"]+"','"+inputs["proj"]["value"]+"')"]
                outputs["Result"]["value"]+=" "+zoo._("Trigger in place")
            print >> sys.stderr,req
        for i in range(0,len(req)):
            if not(db.execute(req[i])):
                return zoo.SERVICE_FAILED
        db.conn.commit()
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"]=zoo._("Unable to connect")
    return zoo.SERVICE_FAILED
