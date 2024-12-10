# -*- coding: utf-8 -*-
###############################################################################
#  Author:   Gérald Fenoy, gerald.fenoy@geolabs.fr
#  Copyright (c) 2010-2019, Cartoworks Inc. 
############################################################################### 
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the "Software"),
#  to deal in the Software without restriction, including without limitation
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,
#  and/or sell copies of the Software, and to permit persons to whom the
#  Software is furnished to do so, subject to the following conditions:
# 
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
# 
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#  DEALINGS IN THE SOFTWARE.
################################################################################
import psycopg2
import lxml
# import libxslt
from lxml import etree
import osgeo.ogr
import sys
import zoo
import json

try:
    from manage_users.manage_users import mm_md5
except:
    from manage_users import mm_md5


class pgConnection:
    def __init__(self, conf, dbfile):
        self.dbfile = dbfile
        self.conf = conf

    def parseConf(self):
        try:
            doc = etree.parse(self.conf["main"]["dataPath"] + "/PostGIS/" + self.dbfile + ".xml")
            styledoc = etree.parse(self.conf["main"]["dataPath"] + "/PostGIS/conn.xsl")
            style = etree.XSLT(styledoc)
        except:
            doc = etree.parse(self.conf["main"]["dataPath"] + "/MSSQL/" + self.dbfile + ".xml")
            styledoc = etree.parse(self.conf["main"]["dataPath"] + "/MSSQL/conn.xsl")
            style = etree.XSLT(styledoc)
        res = style(doc)
        if "type" in self.conf[self.conf["main"]["dbuser"]]:
            self.db_string = str(res).replace(self.conf[self.conf["main"]["dbuser"]]["type"]+":" ,"")
        else:
            self.db_string = str(res).replace("PG: ", "")

    def connect(self):
        try:
            self.conn = psycopg2.connect(self.db_string)
            self.cur = self.conn.cursor()
            return True
        except Exception as e:
            try:
                import pyodbc
                self.conn = pyodbc.connect(self.db_string)
                self.cur = self.conn.cursor() 
                return True
            except Exception as e:
                self.conf["lenv"]["message"] = "Unable to connect: " + str(e)
                return False

    def writeLimit(self,offset,limit):
        loffset=offset
        llimit=limit
        if loffset is None:
            loffset="0"
        if llimit is None:
            llimit="1000000"
        if "type" in self.conf[self.conf["main"]["dbuser"]] and self.conf[self.conf["main"]["dbuser"]]["type"]=="MSSQL":
            return "OFFSET "+str(loffset)+" ROWS FETCH NEXT "+str(llimit)+" ROW ONLY"
        else:
            return "LIMIT "+str(llimit)+" OFFSET "+str(loffset)

    def execute(self, req):
        try:
            self.ex = self.cur.execute(req)
            if req.count("SELECT") > 0 or req.count("select") > 0:
                res=self.cur.fetchall()
                toReturn=[]
                for i in range(len(res)):
                    itoReturn=[]
                    for j in range(len(res[i])):
                        itoReturn+=[res[i][j]]
                    toReturn+=[itoReturn]
                return toReturn
            else:
                return True
        except Exception as e:
            self.conf["lenv"]["message"] = "Unable to execute " + req + " due to: " + str(e)
            return False


def listSchemas(conf, inputs, outputs):
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        res=None
        if "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            res = db.execute(
                    "select name from sys.schemas order by name")
        else:
            res = db.execute(
                    "select nspname as schema from pg_namespace WHERE nspname NOT LIKE 'information_schema' AND nspname NOT LIKE 'pg_%' ORDER BY nspname")
        if res:
            outputs["Result"]["value"] = json.dumps(res)
        return zoo.SERVICE_SUCCEEDED
    else:
        zoo.info("Unable to connect")
        return zoo.SERVICE_FAILED


def listTables(conf, inputs, outputs):
    import authenticate.service as auth
    if not (auth.is_ftable(inputs["schema"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        if "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            req = "select SCHEMA_NAME(schema_id) + '.' + name as tablename, name as display from sys.tables"
            if "schema" in inputs:
                req += " WHERE SCHEMA_NAME(schema_id) = '"+ inputs["schema"]["value"] +"'"
            req += " ORDER BY CONCAT(schema_id , '.') + name"
        else:
            req = "select schemaname||'.'||tablename as tablename, tablename as display from pg_tables WHERE schemaname NOT LIKE 'information_schema' AND schemaname NOT LIKE 'pg_%' AND tablename NOT LIKE 'spatial_ref_sys' AND  tablename NOT LIKE 'geometry_columns' "
            if "schema" in inputs:
                req += "AND schemaname='" + inputs["schema"]["value"] + "'"
            req += " ORDER BY schemaname||'.'||tablename"
        res = db.execute(req)
        outputs["Result"]["value"] = json.dumps(res)
        return zoo.SERVICE_SUCCEEDED
    # return zoo.SERVICE_SUCCEEDED
    else:
        zoo.info("Unable to connect")
        return zoo.SERVICE_FAILED


def listTablesAndViews(conf, inputs, outputs):
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        req = "select schemaname||'.'||tablename as tablename, tablename as display from pg_tables WHERE schemaname NOT LIKE 'information_schema' AND schemaname NOT LIKE 'pg_%' AND tablename NOT LIKE 'tmp%' AND tablename NOT LIKE 'spatial_ref_sys' AND  tablename NOT LIKE 'geometry_columns' "
        req1 = "select schemaname||'.'||viewname as tablename, viewname as display from pg_views WHERE schemaname NOT LIKE 'information_schema' AND schemaname NOT LIKE 'pg_%' "
        if "schema" in inputs:
            req += " AND schemaname='" + inputs["schema"]["value"] + "'"
            req1 += " AND schemaname='" + inputs["schema"]["value"] + "'"
        res = db.execute("SELECT * from (" + req + ") as foo UNION (" + req1 + ") ORDER BY display")
        if res:
            outputs["Result"]["value"] = json.dumps(res)
            return zoo.SERVICE_SUCCEEDED
    else:
        zoo.info("Unable to connect")
        return zoo.SERVICE_FAILED


def getDescMSSQL(cur,table):
    tmp = table.split('.')
    if len(tmp) == 1:
        tmp1 = tmp[0]
        tmp = ["public", tmp1];
    req = "select " + \
        "       col.column_id-1 as \"Pos\", " + \
        "       col.name as \"Name\"," + \
        "       TYPE_NAME(col.system_type_id) +" + \
        "       case when TYPE_NAME(col.system_type_id)='varchar' then CONCAT('(', col.max_length) +')' else '' end  as \"Type\", " + \
        "       case when col.is_identity=1 then 'PRI' else case when fk.object_id is not null then 'FOR' else null end end as \"Key1\", " + \
        "       schema_name(pk_tab.schema_id) + '.' + pk_tab.name as ref_table," + \
        "       pk_col.name as ref_column_name " + \
        "from sys.tables tab" + \
        "     inner join sys.columns col " + \
        "      on col.object_id = tab.object_id" + \
        "     left outer join sys.foreign_key_columns fk_cols" + \
        "      on fk_cols.parent_object_id = tab.object_id" + \
        "        and fk_cols.parent_column_id = col.column_id" + \
        "     left outer join sys.foreign_keys fk" +\
        "      on fk.object_id = fk_cols.constraint_object_id" + \
        "     left outer join sys.tables pk_tab" + \
        "      on pk_tab.object_id = fk_cols.referenced_object_id" + \
        "     left outer join sys.columns pk_col" + \
        "      on pk_col.column_id = fk_cols.referenced_column_id " + \
        "        and pk_col.object_id = fk_cols.referenced_object_id " + \
        "WHERE tab.name='"+ tmp[1] +"' and schema_name(tab.schema_id)='"+ tmp[0] +"' " + \
        "order by schema_name(tab.schema_id) + '.' + tab.name, col.column_id "
    return req


def getDesc(cur, table):
    tmp = table.split('.')
    if len(tmp) == 1:
        tmp1 = tmp[0]
        tmp = ["public", tmp1];
    req = "SELECT b.relname as t FROM pg_inherits, pg_class a, pg_class b WHERE inhrelid=a.oid AND inhparent=b.oid AND a.relname = '" + \
          tmp[1] + "' AND a.relnamespace=(select oid from pg_namespace where nspname='" + tmp[0] + "')"
    res0 = cur.execute(req)
    res = cur.fetchall()
    if res != False and len(res) > 0:
        return "SELECT * FROM (SELECT DISTINCT ON (\"Pos\",\"Field\") * FROM ((SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='" + \
               res[0][0] + "' AND pg_namespace.oid=relnamespace AND nspname='" + tmp[
                   0] + "') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '" + \
               res[0][
                   0] + "') b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '" + \
               res[0][
                   0] + "' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '" + \
               res[0][
                   0] + "' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='" + \
               res[0][
                   0] + "' AND at2.attrelid=t.oid) AS foreigns ON foreigns.myid=a.\"Pos\") UNION (SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='" + \
               tmp[1] + "' AND pg_namespace.oid=relnamespace AND nspname='" + tmp[
                   0] + "') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '" + \
               tmp[1] + "' and t.relnamespace=(select oid from pg_namespace where nspname='" + tmp[
                   0] + "') ) b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '" + \
               tmp[
                   1] + "' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '" + \
               tmp[
                   1] + "' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='" + \
               tmp[1] + "' and t.relnamespace=(select oid from pg_namespace where nspname='" + tmp[
                   0] + "') AND at2.attrelid=t.oid) AS foreigns ON foreigns.myid=a.\"Pos\")) As foo) as foo1 ORDER BY \"Pos\",\"Key\""
    else:
        return "SELECT DISTINCT on (\"Pos\") \"Pos\"-1 as \"Pos\",\"Field\",\"Type\",\"Key\", \"Ref\", \"RefCol\", \"RefCols\",array_upper(\"RefCols\",1) from (SELECT * FROM (SELECT attnum AS \"Pos\", attname AS \"Field\",CASE WHEN atttypmod >0 THEN b.typname || '(' || atttypmod-4 || ')' ELSE b.typname END AS \"Type\" FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname='" + \
               tmp[1] + "' AND pg_namespace.oid=relnamespace AND nspname='" + tmp[
                   0] + "') AND a.attnum > 0 AND NOT a.attisdropped ORDER BY attnum) a LEFT JOIN (SELECT conkey,c.conname AS constraint_name, CASE c.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOR' WHEN 'p' THEN 'PRI' WHEN 'u' THEN 'UNIQUE' END AS \"Key\", t3.nspname||'.'||t2.relname AS \"Ref\", (SELECT attname from pg_catalog.pg_attribute WHERE attrelid=c.confrelid AND confkey[1] = attnum) AS \"RefCol\"  FROM pg_constraint c LEFT JOIN pg_class t ON c.conrelid = t.oid LEFT JOIN pg_class t2 ON c.confrelid = t2.oid LEFT JOIN pg_namespace t3 ON t2.relnamespace=t3.oid WHERE t.relname = '" + \
               tmp[1] + "'  and t.relnamespace=(select oid from pg_namespace where nspname='" + tmp[
                   0] + "')) b ON get_nb_of(conkey,\"Pos\")>0 LEFT JOIN (SELECT DISTINCT ON (at2.attnum) c.*, at2.attnum AS \"myid\", ARRAY(SELECT attname  AS \"RefCol\"  FROM pg_constraint AS c, pg_catalog.pg_attribute, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '" + \
               tmp[
                   1] + "' AND attrelid=confrelid AND get_nb_of(confkey,attnum) > 0  and t.relnamespace=(select oid from pg_namespace where nspname='" + \
               tmp[
                   0] + "')) AS \"RefCols\", at2.attnum, at2.attname AS atn, get_index_of(conkey,at2.attnum) AS \"RealOrigColNum\", at1.attnum, at1.attname, get_index_of(confkey,at1.attnum) AS \"RealRefColNum\",  t.relname as orig, t2.relname as ref FROM pg_constraint AS c, pg_catalog.pg_attribute AS at1, pg_catalog.pg_attribute AS at2, pg_class t, pg_class t2 WHERE c.conrelid = t.oid AND c.confrelid = t2.oid AND t.relname = '" + \
               tmp[
                   1] + "' AND at1.attrelid=confrelid AND get_nb_of(conkey,at2.attnum) > 0 AND get_nb_of(confkey,at1.attnum) > 0 AND t.relname='" + \
               tmp[1] + "' AND at2.attrelid=t.oid  and t.relnamespace=(select oid from pg_namespace where nspname='" + \
               tmp[0] + "')) AS foreigns ON foreigns.myid=a.\"Pos\" order by \"Key\"='PRI' or \"Key\"='FOR' desc) As f"


def getTableDescription(conf, inputs, outputs):
    import authenticate.service as auth
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        tmp = inputs["table"]["value"].split('.')
        if "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            req = getDescMSSQL(db.cur, inputs["table"]["value"])
        else:
            req = getDesc(db.cur, inputs["table"]["value"])
        res = db.execute(req)
        if res != False and len(res) > 0:
            outputs["Result"]["value"] = json.dumps(res)
            return zoo.SERVICE_SUCCEEDED
        else:
            zoo.info(" ---- unable to run request " + req)
            return zoo.SERVICE_FAILED
    else:
        zoo.info("Unable to connect")
        return zoo.SERVICE_FAILED


def getTableContent(conf, inputs, outputs):
    import authenticate.service as auth
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    getTableDescription(conf, inputs, outputs)
    tmp = eval(outputs["Result"]["value"].replace("null", "None"))
    pkey = 0
    geom = []
    files = []
    fields = ""
    for i in range(0, len(tmp)):
        if tmp[i][3] == "PRI":
            pkey = tmp[i][0]
        if tmp[i][2] == "geometry":
            geom += [i]
        if tmp[i][2] == "bytea":
            files += [i]
        if tmp[i][3] == "FOR" and not ("force" in inputs):
            input1 = inputs
            otbl = inputs["table"]["value"]
            inputs["table"]["value"] = tmp[i][4]
            getTableDescription(conf, inputs, outputs)
            tmp2 = eval(outputs["Result"]["value"].replace("null", "None"))
            pkey1 = 0
            for j in range(0, len(tmp2)):
                if tmp2[j][3] == "PRI":
                    pkey1 = j
                    break
            hasV = False
            for j in range(0, len(tmp2)):
                if not (hasV) and (tmp2[j][2].count("char") > 0 or tmp2[j][2].count("text") > 0):
                    if fields != "":
                        fields += ","
                    hasV = True
                    fields += "(SELECT " + tmp2[j][1] + " FROM " + tmp[i][4] + " as a WHERE a." + tmp2[pkey][
                        1] + "=" + otbl + "." + tmp[i][1] + ")"
            if not (hasV):
                if fields != "":
                    fields += ","
                fields += "(SELECT " + tmp2[0][1] + " FROM " + tmp[i][4] + " as a WHERE a." + tmp2[pkey][
                    1] + "=" + otbl + "." + tmp[i][1] + ")"
            inputs["table"]["value"] = otbl
        else:
            if fields != "":
                fields += ","
            fields += tmp[i][1]
    if db.connect():
        tmp1 = inputs["table"]["value"].split(".")
        tmp1[0] = '"' + tmp1[0] + '"'
        tmp1[1] = '"' + tmp1[1] + '"'
        inputs["table"]["value"] = (".").join(tmp1)
        req = "select count(*) from " + inputs["table"]["value"]
        if "clause" in inputs and inputs["clause"]["value"] != "NULL":
            req += " WHERE " + inputs["clause"]["value"]
        if "search" in inputs and inputs["search"]["value"] != "NULL" and inputs["search"]["value"] != "asc":
            req += " WHERE "
            cnt = 0
            for i in range(0, len(tmp)):
                if cnt > 0:
                    req += " OR "
                req += " CAST("+ tmp[i][1] + " as varchar) like '%" + inputs["search"]["value"] + "%'"
                cnt += 1
        res = db.execute(req)
        if res != False:
            total = res[0][0]
        req = "select "
        if "cols" in inputs and inputs["cols"]["value"] != "NULL":
            req += inputs["cols"]["value"]
        else:
            req += fields
        req += " from " + inputs["table"]["value"]
        if "clause" in inputs and inputs["clause"]["value"] != "NULL":
            req += " WHERE " + inputs["clause"]["value"]
        if "search" in inputs and inputs["search"]["value"] != "NULL" and inputs["search"]["value"] != "asc":
            req += " WHERE "
            cnt = 0
            for i in range(0, len(tmp)):
                if cnt > 0:
                    req += " OR "
                req += " CAST(" + tmp[i][1] + " as varchar) like '%" + inputs["search"]["value"] + "%'"
                cnt += 1
        if "sortname" in inputs and inputs["sortname"]["value"] != "NULL":
            hasOrder=False
            for k in range(len(tmp)):
                if tmp[k][1]==inputs["sortname"]["value"] and tmp[k][2].count("text")>0:
                    req += " ORDER BY CAST(" + inputs["sortname"]["value"] + " as varchar) " + inputs["sortorder"]["value"]
                    hasOrder=True
                    break
            if not(hasOrder):
                req += " ORDER BY " + inputs["sortname"]["value"] + " " + inputs["sortorder"]["value"]
        if "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            if not("sortname" in inputs) or inputs["sortname"]["value"] == "NULL":
                req += " ORDER BY " + tmp[0][1]
            if "limit" in inputs and inputs["limit"]["value"] != "NULL":
                if "page" in inputs and inputs["page"]["value"] != "":
                    req += " OFFSET " + str((int(inputs["page"]["value"]) - 1) * int(inputs["limit"]["value"])) + " ROW "
                    page = inputs["page"]["value"]
                else:
                    req += " OFFSET 0 ROW "
                req += " FETCH NEXT "+ inputs["limit"]["value"] +" ROWS ONLY "
            else:
                page = 1
                req += " OFFSET 0 ROW FETCH NEXT 10 ROWS ONLY "
        else:
            if "limit" in inputs and inputs["limit"]["value"] != "NULL":
                if "page" in inputs and inputs["page"]["value"] != "":
                    req += " OFFSET " + str((int(inputs["page"]["value"]) - 1) * int(inputs["limit"]["value"]))
                    page = inputs["page"]["value"]
                req += " LIMIT " + inputs["limit"]["value"]
            else:
                page = 1
                req += " LIMIT 10"
        zoo.info(str(req))
        res = db.execute(req)
        if res != False:
            rows = []
            for i in range(0, len(res)):
                res0 = []
                for k in range(0, len(res[i])):
                    try:
                        tmp = str(res[i][k].decode('utf-8'))
                    except Exception as e:
                        zoo.error(str(e))
                        tmp = str(res[i][k])
                    res0 += [str(tmp)]
                if len(geom) > 0:
                    for j in range(0, len(geom)):
                        res0[geom[j]] = "GEOMETRY"
                if len(files) > 0:
                    for j in range(0, len(files)):
                        res0[files[j]] = "BINARY FILE"
                rows += [{"id": res[i][pkey], "cell": res0}]
            outputs["Result"]["value"] = json.dumps({"page": page, "total": total, "rows": rows}, ensure_ascii=False)
            return zoo.SERVICE_SUCCEEDED
        else:
            zoo.info(" ----- unable to run request")
            return zoo.SERVICE_FAILED
    else:
        zoo.info("Unable to connect")
        return zoo.SERVICE_FAILED


def getTableContent1(conf, inputs, outputs):
    import authenticate.service as auth
    # if not(auth.is_ftable(inputs["table"]["value"])):
    #	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
    #	return zoo.SERVICE_FAILED
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    getTableDescription(conf, inputs, outputs)
    tmp = eval(outputs["Result"]["value"].replace("null", "None"))
    pkey = 0
    geom = []
    files = []
    fields = ""
    for i in range(0, len(tmp)):
        if tmp[i][3] == "PRI":
            pkey = tmp[i][0]
        if tmp[i][2] == "geometry":
            geom += [i]
        if tmp[i][2] == "bytea":
            files += [i]
        if tmp[i][3] == "FOR" and not ("force" in inputs):
            input1 = inputs
            otbl = inputs["table"]["value"]
            inputs["table"]["value"] = tmp[i][4]
            getTableDescription(conf, inputs, outputs)
            tmp2 = eval(outputs["Result"]["value"].replace("null", "None"))
            pkey1 = 0
            for j in range(0, len(tmp2)):
                if tmp2[j][3] == "PRI":
                    pkey1 = j
                    break
            hasV = False
            for j in range(0, len(tmp2)):
                if not (hasV) and (tmp2[j][2].count("char") > 0 or tmp2[j][2].count("text") > 0):
                    if fields != "":
                        fields += ","
                    hasV = True
                    fields += "(SELECT " + tmp2[j][1] + " FROM " + tmp[i][4] + " as a WHERE a." + tmp2[pkey][
                        1] + "=" + otbl + "." + tmp[i][1] + ")"
            if not (hasV):
                if fields != "":
                    fields += ","
                fields += "(SELECT " + tmp2[0][1] + " FROM " + tmp[i][4] + " as a WHERE a." + tmp2[pkey][
                    1] + "=" + otbl + "." + tmp[i][1] + ")"
                inputs["table"]["value"] = otbl
            else:
                if fields != "":
                    fields += ","
                fields += tmp[i][1]

    if db.connect():
        tmp1 = inputs["table"]["value"].split(".")
        tmp1[0] = '"' + tmp1[0] + '"'
        tmp1[1] = '"' + tmp1[1] + '"'
        inputs["table"]["value"] = (".").join(tmp1)
        req = "select count(*) from " + inputs["table"]["value"]
        if "clause" in inputs and inputs["clause"]["value"] != "NULL":
            req += " WHERE " + inputs["clause"]["value"]
        if "search" in inputs and inputs["search"]["value"] != "NULL" and inputs["search"]["value"] != "asc":
            req += " WHERE "
            cnt = 0
            for i in range(0, len(tmp)):
                if cnt > 0:
                    req += " OR "
                req += tmp[i][1] + "::varchar like '%" + inputs["search"]["value"] + "%'"
                cnt += 1
        res = db.execute(req)
        if res != False:
            total = res[0][0]
        req = "select "
        if "cols" in inputs and inputs["cols"]["value"] != "NULL":
            req += inputs["cols"]["value"]
        else:
            req += fields
        req += " from " + inputs["table"]["value"]
        if "clause" in inputs and inputs["clause"]["value"] != "NULL":
            req += " WHERE " + inputs["clause"]["value"]
        if "search" in inputs and inputs["search"]["value"] != "NULL" and inputs["search"]["value"] != "asc":
            req += " WHERE "
            cnt = 0
            for i in range(0, len(tmp)):
                if cnt > 0:
                    req += " OR "
                req += tmp[i][1] + "::varchar like '%" + inputs["search"]["value"] + "%'"
                cnt += 1
        if "sortname" in inputs and inputs["sortname"]["value"] != "NULL":
            req += " ORDER BY " + inputs["sortname"]["value"] + " " + inputs["sortorder"]["value"]
        if "limit" in inputs and inputs["limit"]["value"] != "NULL":
            if "page" in inputs and inputs["page"]["value"] != "":
                req += " OFFSET " + str((int(inputs["page"]["value"]) - 1) * int(inputs["limit"]["value"]))
                page = inputs["page"]["value"]
                req += " LIMIT " + inputs["limit"]["value"]
        else:
            page = 1
            req += " LIMIT 10"
        res = db.execute(req)
        if res != False:
            rows = []
            for i in range(0, len(res)):
                res0 = []
                for k in range(0, len(res[i])):
                    try:
                        tmp = str(res[i][k].decode('utf-8'))
                    except Exception as e:
                        zoo.error(str(e))
                        tmp = str(res[i][k])
                    res0 += [str(tmp)]
                    if len(geom) > 0:
                        for j in range(0, len(geom)):
                            res0[geom[j]] = "GEOMETRY"
                    if len(files) > 0:
                        for j in range(0, len(files)):
                            res0[files[j]] = "BINARY FILE"
                    rows += [{"id": res[i][pkey], "cell": res0}]
            outputs["Result"]["value"] = json.dumps({"page": page, "total": total, "rows": rows}, ensure_ascii=False)
            return zoo.SERVICE_SUCCEEDED
        else:
            zoo.info(" ------ unable to run request")
            return zoo.SERVICE_FAILED
    else:
        zoo.info("Unable to connect")
        return zoo.SERVICE_FAILED


def deleteTuple(conf, inputs, outputs):
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        res = db.execute("DELETE FROM " + inputs["table"]["value"] + " WHERE " + inputs["clause"]["value"])
        if res == False:
            conf = db.conf
            return zoo.SERVICE_FAILED
        else:
            db.conn.commit()
            outputs["Result"]["value"] = "Tuple deleted"
            return zoo.SERVICE_SUCCEEDED
    else:
        conf = db.conf
        return zoo.SERVICE_FAILED


import psycopg2, json
from psycopg2.extensions import *


def editTuple(conf, inputs, outputs):
    # TODO: confirm assumption: inputs is a Python 3 dictionary object
    getTableDescription(conf, inputs, outputs)
    desc = eval(outputs["Result"]["value"].replace("null", "None"))
    tmp = json.loads(inputs["obj"]["value"])
    if "clause" in inputs and inputs["clause"]["value"] != "NULL":
        req = "UPDATE " + inputs["table"]["value"] + " set "
        fields = ""
        tkeys = list(tmp.keys())
        for i in tkeys:
            fd = None
            for k in desc:
                if k[1] == i:
                    fd = k[2]
            if fd is not None:
                td = testDesc(tmp[i], fd)
                if td is not None:
                    if fields != "":
                        fields += ", "
                    fields += '"' + i + '"=' + td
        if "content" in inputs:
            if fields != "":
                fields += ","
            tmp1 = inputs["content"]["value"]
            fields += '"content"=%s' % adapt(
                inputs["content"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n', ''))

        req += fields + " WHERE " + inputs["clause"]["value"]
        outputs["Result"]["value"] = "Tuple updated"
    else:
        req = "INSERT INTO " + inputs["table"]["value"] + " "
        fields = "("
        values = "("
        cnt = 0
        for i in tmp:
            fd = None
            for k in desc:
                if k[1] == i:
                    fd = k[2]
            td = testDesc(tmp[i], fd)
            if td is not None:
                if fields != "(":
                    fields += ","
                if values != "(":
                    values += ","
                fields += i
                values += td
            cnt += 1
        if list(inputs.keys()).count("content") > 0:
            if fields != "(":
                fields += ","
            if values != "(":
                values += ","
            fields += "content"
            values += '%s' % adapt(inputs["content"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n', ''))
        fields += ")"
        values += ")"
        req += fields + " VALUES " + values
        outputs["Result"]["value"] = "Tuple inserted"
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    if db.connect():
        try:
            res = db.execute(req)
            if res == False:
                conf["lenv"]["message"] = db.conf["lenv"]["message"]
                return zoo.SERVICE_FAILED
            db.conn.commit()
            return zoo.SERVICE_SUCCEEDED
        except Exception as e:
            conf["lenv"]["message"] = "Unable to run the request " + str(e)
            return zoo.SERVICE_FAILED


def testDesc(val, desc):
    if desc == "bool":
        if val == "t" or val:
            return "true"
        else:
            return "false"
    if desc.count("char") > 0 or desc.count("text") > 0:
        if desc.count("varchar(40)"):
            if val != 'NULL':
                return "'" + mm_md5(val) + "'"
            else:
                return None
        else:
            if val != 'NULL':
                tmp = adapt(val)#.encode('utf-8').decode('utf-8'))
                tmp.encoding = "utf-8"
                return str(tmp)#.decode('utf-8')
            else:
                return "NULL"
    else:
        if desc.count("date") > 0:
            tmp = val.split("/")
            return "'" + tmp[2] + "-" + tmp[1] + "-" + tmp[0] + "'"
        else:
            if desc.count("geometry") > 0:
                if val != 'NULL':
                    return "'" + val + "'"
                else:
                    return val
            else:
                return val


def fetchType(conf, ftype):
    db = pgConnection(conf, conf["main"]["dbuserName"])
    db.parseConf()
    if db.connect():
        res = db.execute("SELECT code from mm_tables.ftypes where id=" + ftype)
        if res:
            return str(res[0][0])
    return None


def addColumn(conf, inputs, outputs):
    db = pgConnection(conf, inputs["dataStore"]["value"])
    db.parseConf()
    req = []
    if db.connect():
        if inputs["field_type"]["value"] != "18":
            req += ["ALTER TABLE quote_ident(" + inputs["table"]["value"] + ") ADD COLUMN " + inputs["field_name"][
                "value"] + " " + fetchType(conf, inputs["field_type"]["value"])]
            outputs["Result"]["value"] = zoo._("Column added")
        else:
            tblInfo = inputs["table"]["value"].split(".")
            if len(tblInfo) == 1:
                tmp = tblInfo[0]
                tblInfo[0] = "public"
                tblInfo[1] = tmpl
            req += ["SELECT AddGeometryColumn('" + tblInfo[0] + "','" + tblInfo[
                1] + "','wkb_geometry',(select srid from spatial_ref_sys where auth_name||':'||auth_srid = '" +
                    inputs["proj"]["value"] + "'),'" + inputs["geo_type"]["value"] + "',2)"]
            outputs["Result"]["value"] = zoo._("Geometry column added.")
            if list(inputs.keys()).count("geo_x") > 0 and list(inputs.keys()).count("geo_y") > 0:
                req += ["CREATE TRIGGER mm_tables_" + inputs["table"]["value"].replace(".",
                                                                                       "_") + "_update_geom BEFORE UPDATE OR INSERT ON " +
                        inputs["table"][
                            "value"] + " FOR EACH ROW EXECUTE PROCEDURE automatically_update_geom_property('" +
                        inputs["geo_x"]["value"] + "','" + inputs["geo_y"]["value"] + "','" + inputs["proj"][
                            "value"] + "')"]
                outputs["Result"]["value"] += " " + zoo._("Trigger in place")
        for i in range(0, len(req)):
            if not (db.execute(req[i])):
                return zoo.SERVICE_FAILED
        db.conn.commit()
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("Unable to connect")
    return zoo.SERVICE_FAILED
