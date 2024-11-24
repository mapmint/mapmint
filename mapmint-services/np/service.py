# -*- coding: utf-8 -*-
###############################################################################
#  Author:   Gérald Fenoy, gerald.fenoy@cartoworks.com
#  Copyright (c) 2010-2014, Cartoworks Inc. 
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
import zoo
import sys
import psycopg2
from psycopg2.extensions import *
import re
import authenticate.service as auth
from types import *

myList=list

psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)



def unzip(conf,inputs,outputs):
    import zipfile
    f=open(inputs["zip"]["cache_file"])
    z=zipfile.ZipFile(f)
    fullDir=conf["main"]["tmpPath"]+"/zip_"+conf["lenv"]["usid"]
    z.extractall(path=fullDir)
    import glob,os,shutil
    rpath=fullDir
    tmp=glob.glob(rpath+"/*")
    for i in range(len(tmp)):
        source=tmp[i]
        tmp0=tmp[i].split("/")
        destination="/"
        for j in range(len(tmp0)-1):
            destination+=tmp0[j]+"/"
        destination+=tmp0[len(tmp0)-1].replace(".2","_2").replace("-","_")
        shutil.move(source,destination)
    outputs["Result"]["value"]=fullDir
    return zoo.SERVICE_SUCCEEDED


'''
JQuery ui tree json format:
[
	{ 
		"id": "", "text": "Local node", "children": [
                    { "id": "", "text": "Local node child 1" }
                ]
        }
]
'''

def sendMail(conf, inputs, outputs):
    zoo.info("Start")
    import smtplib
    from email.mime.text import MIMEText
    f0 = open(inputs["body"]["cache_file"])
    msgTxt = f0.read()
    msg = MIMEText(msgTxt, "html", _charset='utf-8')
    msg['Subject']=inputs["subject"]["value"]
    if 'ufrom' in conf["smtp"]:
        msg["From"] = "<" + conf["smtp"]["from"] + "> " + zoo._(conf["smtp"]["ufrom"])
    else:
        msg["From"] = conf["smtp"]["from"]
    msg["To"] = inputs["dest"]["value"]
    serv = smtplib.SMTP(conf["smtp"]["host"], conf["smtp"]["port"])
    if "login" in conf["smtp"]:
        serv.login(conf["smtp"]["login"], conf["smtp"]["passwd"])
    serv.sendmail(conf["smtp"]["from"], [msg["To"]], msg.as_string())
    outputs["Result"]["value"]=zoo._("Message sent")
    return zoo.SERVICE_SUCCEEDED


def setIndexQuote(conf, inputs, outputs):
    if conf["senv"]["login"] == "anonymous":
        conf["lenv"]["message"] = zoo._("Unable to use this service when you're not logued in")
        return zoo.SERVICE_FAILED
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    tprefix = auth.getPrefix(conf)
    req = "SELECT count(*) from " + tprefix + "indicators_favoris WHERE i_id=[_id_] and u_id=(SELECT id from " + tprefix + "users WHERE login=[_login_])"
    res = con.pexecute_req([req, {"id": {"value": inputs["id"]["value"], "format": "s"}, "login": {"value": conf["senv"]["login"], "format": "s"}}])
    vals = con.cur.fetchone()
    if vals is not None and vals[0] > 0:
        req = "UPDATE " + tprefix + "indicators_favoris set note=[_quote_] WHERE i_id=[_id_] and u_id=(SELECT id from " + tprefix + "users WHERE login=[_login_])"
        con.pexecute_req([req, {"quote": {"value": inputs["quote"]["value"], "format": "s"}, "id": {"value": inputs["id"]["value"], "format": "s"}, "login": {"value": conf["senv"]["login"], "format": "s"}}])
        outputs["Result"]["value"] = zoo._("Index quote updated.")
    else:
        req = "INSERT INTO " + tprefix + "indicators_favoris (i_id,u_id,note) VALUES ([_id_],(SELECT id from " + tprefix + "users WHERE login=[_login_]),[_quote_])"
        con.pexecute_req([req, {"id": {"value": inputs["id"]["value"], "format": "s"}, "login": {"value": conf["senv"]["login"], "format": "s"}, "quote": {"value": inputs["quote"]["value"], "format": "s"}}])
        outputs["Result"]["value"] = zoo._("Index quote saved.")
    con.conn.commit()

    return zoo.SERVICE_SUCCEEDED


def splitGroup(conf):
    res = ""
    c = conf["senv"]["group"].split(',')
    for i in range(len(c)):
        if res != "":
            res += " OR "
        res += "name='" + c[i] + "'"
    return res

def getBaseLayersForTable(conf,inputs,outputs):
    import os,mapscript,json
    import mapfile.service as mmap
    bl=[]
    if "length" in inputs["table"]:
        for i in range(len(inputs["table"]["value"])):
            mapPath=conf["main"]["dataPath"]+"/public_maps/project_"+(inputs["table"]["value"][i].replace(".","___"))+".map"
            if os.path.exists(mapPath):
                m=mapscript.mapObj(mapPath)
                if mmap.getMetadata(m.web,"mmProprietaryBaseLayers")=="Bing":
                    bl+=[{"bing":{"key":mmap.getMetadata(m.web,"mmBAK"),"layers":mmap.getMetadata(m.web,"mmPBaseLayers").split(','),"all_layers": conf["mm"]["bbLayers"].split(","),"all_layer_labels": conf["mm"]["bbLayerAlias"].split(",")}}]
                if mmap.getMetadata(m.web,"mmWMTSBLURL") is not None:
                    bl+=[{"wmts":{"attribution":open(mmap.getMetadata(m.web,"mmWMTSAttribution").replace(conf["main"]["tmpUrl"],conf["main"]["tmpPath"])).read(),"layers":mmap.getMetadata(m.web,"mmWMTSBaseLayers").split(',')}}]
    else:
        mapPath=conf["main"]["dataPath"]+"/public_maps/project_"+(inputs["table"]["value"].replace(".","___"))+".map"
        if os.path.exists(mapPath):
            m=mapscript.mapObj(mapPath)
            if mmap.getMetadata(m.web,"mmProprietaryBaseLayers")=="Bing":
                bl+=[{"bing":{"key":mmap.getMetadata(m.web,"mmBAK"),"layers":mmap.getMetadata(m.web,"mmPBaseLayers").split(','),"all_layers": conf["mm"]["bbLayers"].split(","),"all_layer_labels": conf["mm"]["bbLayerAlias"].split(",")}}]
            if mmap.getMetadata(m.web,"mmWMTSBLURL") is not None:
                bl+=[{"wmts":{"attribution":open(mmap.getMetadata(m.web,"mmWMTSAttribution").replace(conf["main"]["tmpUrl"],conf["main"]["tmpPath"])).read(),"layers":mmap.getMetadata(m.web,"mmWMTSBaseLayers").split(',')}}]
    outputs["Result"]["value"]=json.dumps(bl)
    return zoo.SERVICE_SUCCEEDED


def getIndexQuote(conf, inputs, outputs):
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    tprefix = auth.getPrefix(conf)
    clause = "("
    params = {}
    if "length" in inputs["id"]:
        for i in range(int(inputs["id"]["length"])):
            if clause != "(":
                clause += " or "
            clause += " i_id=[_id_" + str(i) + "_]"
            params["id_" + str(i)] = {"value": inputs["id"]["value"][i], "format": "s"}
        clause += ")"
    else:
        clause = " i_id=[_id_]"
        params["id"] = {"value": inputs["id"]["value"], "format": "s"}
    if conf["senv"]["login"] == "anonymous":
        req = "SELECT i_id,avg(note),true from " + tprefix + "indicators_favoris WHERE " + clause + " GROUP BY i_id"
    else:
        req = "SELECT i_id,note,false from " + tprefix + "indicators_favoris WHERE " + clause + " and u_id=(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "')"
    res = con.pexecute_req([req, params])
    vals = con.cur.fetchall()
    if "length" in inputs["id"]:
        res = []
        for j in range(len(vals)):
            for i in range(int(inputs["id"]["length"])):
                try:
                    if inputs["id"]["value"].count(str(vals[j][0])) > 0:
                        res += [{"id": str(vals[j][0]), "val": str(vals[j][1]), "ro": str(vals[j][2]).lower()}]
                        break
                except Exception as e:
                    zoo.error(str(i))
                    zoo.error(str(e))
                    zoo.error(inputs["id"]["value"][i])
                    # res+=[{"id": inputs["id"]["value"][i],"val": str(0)}]
                zoo.error(str(res))
        for i in range(int(inputs["id"]["length"])):
            isIn = False
            for j in range(len(res)):
                if res[j]["id"] == inputs["id"]["value"][i]:
                    isIn = True
                    break
            if not (isIn):
                res += [{"id": inputs["id"]["value"][i], "val": str(0)}]
        import json
        outputs["Result"]["value"] = json.dumps(res)
        return zoo.SERVICE_SUCCEEDED
    zoo.error(str(vals))
    if vals is not None and len(vals) > 0:
        outputs["Result"]["value"] = str(vals[0][1])
    else:
        outputs["Result"]["value"] = "false"
    return zoo.SERVICE_SUCCEEDED


def setFavoriteMap(conf, inputs, outputs):
    if conf["senv"]["login"] == "anonymous":
        conf["lenv"]["message"] = zoo._("Unable to use this service when you're not logued in")
        return zoo.SERVICE_FAILED
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    tprefix = auth.getPrefix(conf)
    req = "SELECT count(*) from " + tprefix + "favoris WHERE map='" + conf["senv"]["last_map"] + "' and u_id=(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "')"
    res = cur.execute(req)
    vals = cur.fetchone()
    if vals is not None and vals[0] > 0:
        req = "DELETE FROM " + tprefix + "favoris WHERE map='" + conf["senv"]["last_map"] + "' and u_id=(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "')"
        outputs["Result"]["value"] = zoo._("Map removed from your favorite list.")
    else:
        req = "INSERT INTO " + tprefix + "favoris (map,u_id) VALUES ('" + conf["senv"]["last_map"] + "',(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "'))"
        outputs["Result"]["value"] = zoo._("Map added to your favorite list.")
    cur.execute(req)
    con.conn.commit()

    return zoo.SERVICE_SUCCEEDED


def isFavoriteMap(conf, inputs, outputs):
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    tprefix = auth.getPrefix(conf)
    if con.dbtype=="ODBC":
        req = "SELECT count(*) from " + tprefix + "favoris WHERE CAST(map as varchar(max))='" + conf["senv"]["last_map"] + "' and u_id=(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "')"
    else:
        req = "SELECT count(*) from " + tprefix + "favoris WHERE map='" + conf["senv"]["last_map"] + "' and u_id=(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "')"
    zoo.info(str(req))
    res = cur.execute(req)
    vals = cur.fetchone()
    if vals is not None and vals[0] > 0:
        outputs["Result"]["value"] = "true"
    else:
        outputs["Result"]["value"] = "false"
    return zoo.SERVICE_SUCCEEDED


def searchByName(conf, inputs, outputs):
    import json
    res = []
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    tprefix = auth.getPrefix(conf)
    suffix0 = " where "
    suffix01 = ""
    suffix10 = ""
    if "t_id" in inputs and inputs["t_id"]["value"] != "NULL":
        suffix10 = " and t_id=" + inputs["t_id"]["value"]
    if "tid" in inputs and inputs["tid"]["value"] != "NULL":
        if inputs["tid"]["value"] != "fav":
            suffix0 = ", " + inputs["tbl"]["value"] + "_themes WHERE " + inputs["tbl"]["value"] + ".id=" + inputs["tbl"]["value"] + "_themes.i_id and t_id=" + inputs["tid"]["value"] + " and "
        else:
            suffix0 = ", " + inputs["tbl"]["value"] + "_favoris WHERE " + inputs["tbl"]["value"] + ".id=" + inputs["tbl"]["value"] + "_favoris.i_id and u_id=(SELECT id from " + tprefix + "users WHERE login='" + conf["senv"]["login"] + "') and "
            suffix01 = " ORDER BY " + inputs["tbl"]["value"] + "_favoris.note DESC"
    prefix = inputs["tbl"]["value"] + "."
    tmp = conf["senv"]["group"].split(',')
    lclause = " name = 'public' "
    for j in range(0, len(tmp)):
        if lclause != "":
            lclause += " or "
        extern = adapt(tmp[j])
        extern.encoding("utf-8")
        lclause += " name = " + str(etern)
    suffix1 = " (SELECT id FROM " + tprefix + "groups WHERE " + lclause + ") "
    suffix20 = "(SELECT DISTINCT i_id FROM ((select DISTINCT i_id from " + inputs["tbl"][
        "value"] + "_themes where t_id in (select DISTINCT t_id from " + tprefix + "themes_groups where g_id in " + suffix1 + ")) INTERSECT (select DISTINCT i_id from " + tprefix + "indicators_territories where t_id in ( select DISTINCT t_id from territories,territories_groups where territories.id=territories_groups.t_id " + suffix10 + " and g_id in " + suffix1 + "))) as foo)"
    suffix2 = " and " + tprefix + "indicators.id in " + suffix20 + " and "
    suffix0 = ", " + inputs["tbl"]["value"] + "_groups " + suffix0 + " " + inputs["tbl"]["value"] + "_groups.i_id=" + inputs["tbl"]["value"] + ".id " + suffix2 + inputs["tbl"]["value"] + "_groups.g_id in " + suffix1 + " and "
    req = " SELECT DISTINCT ON (" + prefix + "id) " + prefix + "id," + prefix + "name from " + inputs["tbl"]["value"] + suffix0 + " name like '%" + inputs["val"]["value"] + "%' "
    zoo.info(str(req))
    cur.execute(req)
    vals = cur.fetchall()
    rpath = conf["main"]["dataPath"] + "/indexes_maps/project_PIndex"
    for i in vals:
        if "public" in inputs and inputs["public"]["value"] == "true":
            try:
                f = open(rpath + str(i[0]) + ".map", "r")
                res += [{"id": i[0], "label": i[1], "value": i[1]}]
            except Exception as e:
                pass
        else:
            res += [{"id": i[0], "label": i[1], "value": i[1]}]
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def parseDocAttr(conf, inputs, outputs):
    import json
    res = []
    import zipfile
    if "fullpath" in inputs:
        if inputs["fullpath"]["value"] == "true":
            fh = open(inputs["template"]["value"], "rb")
        else:
            if inputs["fullpath"]["value"] == "tmp":
                fh = open(conf["main"]["tmpPath"] + "data_tmp_1111" + conf["senv"]["MMID"] + "/" + inputs["template"]["value"], "rb")
    else:
        fh = open(conf["main"]["publicationPath"] + "/idx_templates/" + inputs["template"]["value"], "rb")
    z = zipfile.ZipFile(fh)
    for name in z.namelist():
        if name.count("content.xml"):
            c_content = z.read(name).decode("utf-8")
            zoo.info(str(c_content))
            tmp=c_content.split("[_")
            for i in range(0, len(tmp)):
                if tmp[i].count("_]") > 0:
                    if res.count(tmp[i].split("_]")[0]) == 0:
                        res += [tmp[i].split("_]")[0]]
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def setCurrentIndex(conf, inputs, outputs):
    import mapscript
    conf["senv"]["last_index"] = inputs["id"]["value"]
    inputs0 = {"table": {"value": "indicators"}, "id": inputs["id"]}
    if 'tid' in inputs:
        inputs0["tid"] = inputs["tid"]
    inputs0["public"] = {"value": "true"}
    details(conf, inputs0, outputs)
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/project_PIndex" + inputs["id"]["value"] + ".map")
    if m.getLayer(0).metadata.get('mmSteps'):
        import json
        tmp = json.loads(outputs["Result"]["value"])
        tmp["nbSteps"] = len(m.getLayer(0).metadata.get('mmSteps').split(','))
        outputs["Result"]["value"] = json.dumps(tmp, ensure_ascii=False).encode("utf-8")
    # outputs["Result"]["value"]=zoo._("Current index saved")
    return zoo.SERVICE_SUCCEEDED


def setCurrentTerritory(conf, inputs, outputs):
    conf["senv"]["t_id"] = inputs["t_id"]["value"]
    outputs["Result"]["value"] = "Session successfully updated"
    return zoo.SERVICE_SUCCEEDED


def getPublishedIndex(conf):
    import glob, os, shutil
    rpath = conf["main"]["dataPath"] + "/indexes_maps/"
    tmp = glob.glob(rpath + "/project_PIndex*.map")
    tmp.sort(key=lambda x: 1 / os.path.getmtime(os.path.join(x)))
    return tmp


def getLastPublishedIndex(conf):
    import glob, os, shutil
    rpath = conf["main"]["dataPath"] + "/indexes_maps/"
    tmp = glob.glob(rpath + "project_PIndex*.map")
    tmp.sort(key=lambda x: 1 / os.path.getmtime(os.path.join(x)))
    if len(tmp) > 0:
        return tmp[0].replace(conf["main"]["dataPath"] + "/indexes_maps/project_PIndex", "").replace(".map", "")
    return "-1"


def getIndexDisplay(conf, inputs, outputs):
    id = inputs["id"]["value"]
    req = "select label,width from dtable where it_id=(select id from " + tprefix + "indicators_territories where i_id=" + id + ") order by pos"
    req = "select label,width from dtable where it_id=(select id from " + tprefix + "indicators_territories where i_id=[_id_]) order by pos"
    params = {"id": {"value": id, "format": "s"}}
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    con.pexecute_req([req, params])
    vals = con.cur.fetchall()
    res = '<table class="flexiClasses"><thead><tr>'
    for i in range(0, len(vals)):
        res += '<th width="' + str(vals[0][1]) + '" align="center">' + str(vals[0][0]) + '</th>'
    res += '</tr></thead><tbody>'
    for i in range(0, 10):
        res += "<tr>"
        for i in range(0, len(vals)):
            res += "<td></td>"
        res += "</tr>"

    res += "</tbody></table>"
    outputs["Result"]["value"] = res
    return zoo.SERVICE_SUCCEEDED


def getIndexDisplayJs(conf, inputs, outputs):
    prefix = auth.getPrefix(conf)
    id = inputs["id"]["value"]
    id0 = ""
    if "tid" in inputs and inputs["tid"]["value"] != "null":
        id += " and agregation and t_id=" + inputs["tid"]["value"]
        if "step" in inputs:
            id0 += " and step = " + inputs["step"]["value"]
        else:
            id0 += " and step is null"
    else:
        if "step" in inputs:
            id += " and (not(agregation) or agregation is null) and step = " + inputs["step"]["value"]
            id0 += " and step = " + inputs["step"]["value"]
        else:
            id += " and (not(agregation) or agregation is null) and step is null"
            id0 += " and step is null"
    req0 = "select name,order_by from " + prefix + "d_table where i_id=" + inputs["id"]["value"] + id0 + ""
    zoo.info(str(req0))
    req = "select var,label,width from " + prefix + "dtable where it_id=(select id from " + tprefix + "indicators_territories where i_id=" + id + ") " + id0 + " order by pos"
    zoo.info(str(req))
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    cur.execute(req0)
    val = cur.fetchone()
    if val is not None:
        title = str(val[0].encode('utf-8')) #.decode('utf-8')
        order_by = val[1]
    else:
        title = ""
        order_by = None

    cur.execute(req)
    val = cur.fetchall()
    res = []
    for i in range(0, len(val)):
        zoo.info(str(val[i][1].encode("utf-8")))
        res += [{"name": val[i][0], "display": str(val[i][1].encode('utf-8')).decode('utf-8'), "width": val[i][2], "sortable": 'true', "align": 'center'}]
        if order_by is None:
            order_by = res[0]["name"]
    import json

    if "tid" in inputs:
        outputs["Result"]["value"] = json.dumps({"title": title, "ord": res[0]["name"], "values": res}, ensure_ascii=False).encode("utf-8")
    else:
        outputs["Result"]["value"] = json.dumps({"title": title, "ord": order_by, "values": res}, ensure_ascii=False).encode("utf-8")

    return zoo.SERVICE_SUCCEEDED


def getIndexRequest(conf, inputs, outputs):
    fields = []
    id = inputs["id"]["value"]
    reqSuffix = ""
    tablePrefix = "indexes.view_idx"
    if "tid" in inputs:
        tablePrefix = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_"
        reqSuffix += " and agregation and t_id=" + inputs["tid"]["value"]
    else:
        reqSuffix += " and (not(agregation) or agregation is null)"
    clause = ""
    if "query" in inputs and inputs["query"]["value"][0] != '<':
        clause_ext = adapt(inputs["query"]["value"].replace("*", "%"))
        clause_ext.encoding="utf-8"
        clause = inputs["qtype"]["value"] + " LIKE " + str(clause_ext)
    reqSuffix0 = ""
    dtableSuffix = " and step is null"
    tableName = tablePrefix + id
    if "step" in inputs:
        dtableSuffix = " and step = " + inputs["step"]["value"]
        if "tid" in inputs:
            tableName += "_step" + inputs["step"]["value"]
    endReq = " order by " + inputs["sortname"]["value"] + " " + inputs["sortorder"]["value"]
    if "_id" in inputs:
        reqSuffix0 += " WHERE " + inputs["_id"]["value"]
        endReq = ""
    req = "select value,var,label from dtable where it_id=(select id from " + tprefix + "indicators_territories where i_id=" + id + reqSuffix + ") " + dtableSuffix + " order by pos"
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    zoo.info(str(req))
    cur.execute(req)
    vals = cur.fetchall()
    field_to_display = ""
    fields_to_display = []
    for i in range(0, len(vals)):
        if field_to_display != "":
            field_to_display += ","
        field_to_display += vals[i][0].encode('utf-8') + ' AS "' + vals[i][2].encode('utf-8') + '"'
        zoo.info(vals[i][2].encode('utf-8'))
        fields += [vals[i][1]]
        fields_to_display += [vals[i][0]]
    if clause != "":
        req = "select count(*) from " + tablePrefix + id + " WHERE " + clause
    else:
        req = "select count(*) from " + tablePrefix + id + " " + clause
    zoo.info(str(req))
    cur.execute(req)
    val = cur.fetchone()
    if "sortorder" in inputs:
        for j in range(0, len(fields)):
            zoo.info(fields[j])
            zoo.info(inputs["sortname"]["value"])
            if fields[j] == inputs["sortname"]["value"]:
                sortN = fields_to_display[j]
                break
    else:
        sortN = fields_to_display[0]
    cnt = val[0]
    if clause != "":
        if reqSuffix0 != "":
            req = "select " + field_to_display + ",wkb_geometry from " + tableName + reqSuffix0 + " AND " + clause + endReq
        else:
            req = "select " + field_to_display + ",wkb_geometry from " + tableName + reqSuffix0 + " WHERE " + clause + endReq
    else:
        req = "select " + field_to_display + ",wkb_geometry from " + tableName + reqSuffix0 + endReq
    outputs["Result"]["value"] = req
    return zoo.SERVICE_SUCCEEDED


def _getIndexValues(conf, inputs, fields):
    id = inputs["id"]["value"]
    reqSuffix = ""
    tablePrefix = "indexes.view_idx"
    if "tid" in inputs and inputs["tid"]["value"] != "null":
        tablePrefix = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_"
        reqSuffix += " and agregation and t_id=" + inputs["tid"]["value"]
    else:
        reqSuffix += " and (not(agregation) or agregation is null)"
    clause = ""
    if "query" in inputs and inputs["query"]["value"] != "":
        clause_ext = adapt(inputs["query"]["value"].replace("*", "%"))
        clause_ext.encoding="utf-8"
        clause = inputs["qtype"]["value"] + " LIKE " + str(clause_ext)
    reqSuffix0 = ""
    dtableSuffix = " and step is null"
    tableName = tablePrefix + id
    if "step" in inputs:
        dtableSuffix = " and step = " + inputs["step"]["value"]
        # if "tid" in inputs.keys():
        #    tableName+="_step"+inputs["step"]["value"]
    endReq = " order by " + inputs["sortname"]["value"] + " " + inputs["sortorder"]["value"] + " limit " + inputs["limit"]["value"] + " offset " + str(int(inputs["limit"]["value"]) * (int(inputs["page"]["value"]) - 1))
    if "_id" in inputs:
        reqSuffix0 += " WHERE " + inputs["_id"]["value"]
        endReq = ""
    req = "select value,var from dtable where it_id=(select id from " + tprefix + "indicators_territories where i_id=" + id + reqSuffix + ") " + dtableSuffix + " order by pos"
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    zoo.info(str(req))
    cur.execute(req)
    vals = cur.fetchall()
    field_to_display = ""
    fields_to_display = []
    # fields=[]
    for i in range(0, len(vals)):
        if field_to_display != "":
            field_to_display += ","
        field_to_display += vals[i][0]
        fields += [vals[i][1]]
        fields_to_display += [vals[i][0]]
    if clause != "":
        req = "select count(*) from " + tablePrefix + id + " WHERE " + clause
    else:
        req = "select count(*) from " + tablePrefix + id + " " + clause
    zoo.info(str(req))
    cur.execute(req)
    val = cur.fetchone()
    if "sortorder" in inputs:
        for j in range(0, len(fields)):
            zoo.info(fields[j])
            zoo.info(inputs["sortname"]["value"])
            if fields[j] == inputs["sortname"]["value"]:
                sortN = fields_to_display[j]
                break
    else:
        sortN = fields_to_display[0]
    cnt = val[0]
    if clause != "":
        if reqSuffix0 != "":
            req = "select " + field_to_display + " from " + tableName + reqSuffix0 + " AND " + clause + endReq
        else:
            req = "select " + field_to_display + " from " + tableName + reqSuffix0 + " WHERE " + clause + endReq
    else:
        req = "select " + field_to_display + " from " + tableName + reqSuffix0 + endReq
    zoo.info(str(req))
    cur.execute(req.encode("utf-8"))
    val = cur.fetchall()
    return [cnt, val]


def getIndexValues(conf, inputs, outputs):
    fields = []
    val = _getIndexValues(conf, inputs, fields)
    res = '<FeatureCollection cnt="' + str(val[0]) + '">'
    val = val[1]
    for i in range(0, len(val)):
        res += "<featureMember>"
        for j in range(0, len(fields)):
            try:
                res += ("<" + fields[j] + ">").encode("utf-8") + val[i][j].encode("utf-8") + ("</" + fields[j] + ">").encode("utf-8")
            except Exception as e:
                try:
                    res += ("<" + fields[j] + ">").encode("utf-8") + str(val[i][j]).encode("utf-8") + ("</" + fields[j] + ">").encode("utf-8")
                except:
                    res += ("<" + fields[j] + ">").encode("utf-8") + str(val[i][j]) + ("</" + fields[j] + ">").encode("utf-8")
                zoo.error(str(e))
        res += "</featureMember>"
    res += "</FeatureCollection>"
    outputs["Result"]["value"] = res
    return zoo.SERVICE_SUCCEEDED


def getIndex(conf, inputs, outputs):
    import authenticate.service as auth
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    cur.execute("SELECT id, name, description from " + tprefix + "indicators where id=" + inputs["id"]["value"])
    vals = cur.fetchall()
    res = {}
    for i in range(0, len(cur.description)):
        res[cur.description[i].name] = vals[0][i]
    try:
        import time, os
        immap = conf["main"]["dataPath"] + "/indexes_maps/project_PIndex" + str(vals[0][0]) + ".map"
        res["pdate"] = time.strftime(conf["mm"]["dateFormat"], time.localtime(os.path.getmtime(immap)))
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Error occur whenre trying to access the index map") + str(e)
        return zoo.SERVICE_FAILED
    import mapscript
    tmp = getPublishedIndex(conf)
    mm = mapscript.mapObj(tmp[0])
    a = mm.getLayer(0).getExtent()
    a.project(mapscript.projectionObj(mm.getLayer(0).getProjection()), mapscript.projectionObj("EPSG:4326"))
    x = ((a.maxx - a.minx) / 2) + a.minx
    y = ((a.maxy - a.miny) / 2) + a.miny
    res["mlink"] = conf["main"]["mapserverAddress"] + "?map=" + (tmp[0]) + "&LAYERS=" + mm.getLayer(0).name + "&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=" + str(a.minx) + "," + str(a.miny) + "," + str(a.maxx) + "," + str(a.maxy) + "&SRS=EPSG:4326&WIDTH=150"
    import json
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def publishIndex(conf, inputs, outputs):
    import glob, os, shutil, sys
    import mapscript
    rpath = conf["main"]["dataPath"] + "/indexes_maps/"
    passed = False
    try:
        for name in glob.glob(rpath + "/*_Index" + inputs["id"]["value"] + "*.map"):
            shutil.copy(name, name.replace("Index", "PIndex"))
            m = mapscript.mapObj(name.replace("Index", "PIndex"))
            m.web.metadata.set('cache_file', "TEMP_" + conf["senv"]["MMID"] + "-" + inputs["id"]["value"] + "")
            if not (passed):
                inputs0 = {"file": {"value": "TEMP_" + conf["senv"]["MMID"] + "-" + inputs["id"]["value"] + ""}}
                zoo.info("START")
                csv2ods(conf, inputs0, outputs)
                zoo.info("END")
                passed = True
            m.save(name.replace("Index", "PIndex"))
        for name in glob.glob(rpath + "/*_GIndex" + inputs["id"]["value"] + "*.map"):
            shutil.copy(name, name.replace("GIndex", "PGIndex"))
        outputs["Result"]["value"] = zoo._("Index successfully published")
        sys.stderr.close()
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to access any index file")
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_FAILED


def unpublishIndex(conf, inputs, outputs):
    import glob, os, shutil
    rpath = conf["main"]["dataPath"] + "/indexes_maps/"
    try:
        for name in glob.glob(rpath + "/*_PIndex" + inputs["id"]["value"] + "*.map"):
            os.unlink(name)
        for name in glob.glob(rpath + "/*_GIndex" + inputs["id"]["value"] + "*.map"):
            os.unlink(name)
        outputs["Result"]["value"] = zoo._("Index successfully unpublished")
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to access any index file")
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_FAILED


#        if name.count("zip")==0:
#            d.write(name.replace("\\","/"),os.path.basename(name), zipfile.ZIP_DEFLATED)

def getIndexStyle(conf, inputs, outputs):
    import mapscript, json
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/project_Index" + inputs["id"]["value"] + ".map")
    l = m.getLayer(0);
    zoo.info(dir(l))
    try:
        tmp = l.metadata.get("mmColor").split(" ")
        icol = '%02x%02x%02x' % (int(tmp[0]), int(tmp[1]), int(tmp[2]))
    except:
        icol = 'ffffff'
    try:
        tmp = l.metadata.get("mmOutColor").split(" ")
        ocol = '%02x%02x%02x' % (int(tmp[0]), int(tmp[1]), int(tmp[2]))
    except:
        ocol = '777777'
    zoo.error((l.metadata.get("mmClass") == "tl"))
    if l.metadata.get("mmClass") == "tl":
        if "step" in inputs:
            idx = inputs["step"]["value"]
            m1 = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/timeline_Index" + inputs["id"]["value"] + "_indexes_view_idx" + inputs["id"]["value"] + "_step" + inputs["step"]["value"] + ".map")
        else:
            idx = "0"
            m1 = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/timeline_Index" + inputs["id"]["value"] + "_indexes_view_idx" + inputs["id"]["value"] + "_step0.map")
        l1 = m1.getLayer(0)
        try:
            tmp = l1.metadata.get("mmColor").split(" ")
            icol = '%02x%02x%02x' % (int(tmp[0]), int(tmp[1]), int(tmp[2]))
        except:
            icol = 'ffffff'
        try:
            tmp = l1.metadata.get("mmOutColor").split(" ")
            ocol = '%02x%02x%02x' % (int(tmp[0]), int(tmp[1]), int(tmp[2]))
        except:
            ocol = '777777'
        outputs["Result"]["value"] = json.dumps({"var": l1.metadata.get("mmField"), "formula": l1.metadata.get("mmFormula"), "ctype": l.metadata.get("mmClass"), "nbc": l1.numclasses, "icol": icol, "ocol": ocol, "cctype": l1.metadata.get("mmClass"), "cmethod": l1.metadata.get("mmMethod"), "step": idx});
    else:
        if l.metadata.get("mmMethod") is not None:
            outputs["Result"]["value"] = json.dumps({"var": l.metadata.get("mmField"), "formula": l.metadata.get("mmFormula"), "ctype": "gs", "cmethod": l.metadata.get("mmMethod"), "nbc": l.numclasses, "icol": icol, "ocol": ocol});
        else:
            outputs["Result"]["value"] = json.dumps({"var": l.metadata.get("mmField"), "formula": l.metadata.get("mmFormula"), "ctype": l.metadata.get("mmClass"), "cmethod": l.metadata.get("mmMethod"), "nbc": l.numclasses, "icol": icol, "ocol": ocol});
    return zoo.SERVICE_SUCCEEDED


def saveIndexTable(conf, inputs, outputs):
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    inputs0 = {
        "table": inputs["table"],
        "name": inputs["name"],
        "i_id": inputs["i_id"],
    }
    # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
    if "id" in inputs:
        inputs0["id"] = inputs["id"]
    # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
    if "id" not in inputs:
        insertElem(conf, inputs0, outputs)
        # obj=detailsIndicateurs(conf,inputs,cur,inputs["i_id"]["value"],"table",prefix)
    else:
        updateElem(conf, inputs0, outputs)
        # obj=detailsIndicateurs(conf,inputs,cur,inputs["i_id"]["value"],"table",prefix)
    inputs1 = {"id": {"value": inputs["i_id"]["value"]}, "tuple": inputs["tuple"]}
    return saveIndexDisplaySettings(conf, inputs1, outputs)


def saveIndexDisplaySettings(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)

    if not (inputs["tuple"]["value"].__class__.__name__ in ('list', 'tuple')):
        inputs["tuple"]["value"] = [inputs["tuple"]["value"]]

    ofields = ""
    ovals = ""
    oSuffix = ""
    if "step" in inputs:
        ofields = ",step"
        ovals = "," + inputs["step"]["value"]
        oSuffix = " and step=" + inputs["step"]["value"]
    reqSuffix = " and (not(agregation) or agregation is null)"
    if "tid" in inputs:
        reqSuffix = " and t_id=" + inputs["tid"]["value"] + " and agregation"
    req = "delete from " + prefix + "dtable where it_id=(select id from " + prefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ")" + oSuffix
    cur.execute(req)
    con.conn.commit()

    for i in range(0, len(inputs["tuple"]["value"])):
        zoo.info(inputs["tuple"]["value"][i])
        tmp = json.loads(inputs["tuple"]["value"][i])
        zoo.info(str(tmp))
        tmp = eval(inputs["tuple"]["value"][i])
        zoo.info(str(tmp))
        try:
            zoo.info(tmp["label"])
            val_ext = adapt(tmp["value"])
            val_ext.encoding = "utf-8"
            tmp0 = "%s" % val_ext
            #adapt(tmp["value"])
            tmp["value"] = str(tmp0)
            label_ext = adapt(tmp["label"])
            label_ext.encoding="utf-8"
            tmp0 = "%s" % label_ext
            zoo.info(str(tmp0))
            tmp["label"] = str(tmp0)
            var_ext = adapt(tmp["var"])
            var_ext.encoding="utf-8"
            tmp0 = "%s" % var_ext
            tmp["var"] = str(tmp0)
            if tmp["pos"] == "":
                tmp["pos"] = "(select count(*) from " + prefix + "dtable where it_id=(select id from " + prefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + "))" + oSuffix
            zoo.info(tmp["value"])
            req = "INSERT INTO " + prefix + "dtable (it_id,display,search,pos,var,label,value,width" + ofields + ") VALUES ((select id from " + prefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ")," + tmp["display"] + "," + tmp["search"] + "," + tmp["pos"] + "," + tmp["var"] + "," + \
                  tmp["label"] + "," + tmp["value"] + "," + tmp["width"] + "" + ovals + ")"
            zoo.info(str(req))
            cur.execute(req)
            con.conn.commit()
        except Exception as e:
            con.conn.commit()
            zoo.error(str(e))
            pass
    outputs["Result"]["value"] = zoo._("Index display settings saved")
    return zoo.SERVICE_SUCCEEDED


def saveRepportFile(conf, inputs, outputs):
    import shutil
    tmp = conf["senv"]["last_file"].split("/")
    shutil.copy(conf["senv"]["last_file"], conf["main"]["publicationPath"] + "/idx_templates/" + tmp[len(tmp) - 1])
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    cur.execute("DELETE FROM " + prefix + "r_table where i_id=" + inputs["id"]["value"] + ";INSERT INTO " + prefix + "r_table (i_id,doc) VALUES (" + inputs["id"]["value"] + ",'" + tmp[len(tmp) - 1] + "')")
    con.conn.commit()
    outputs["Result"]["value"] = "Repport file succesfully uploaded"
    return zoo.SERVICE_SUCCEEDED


def saveRepportFile0(conf, inputs, outputs):
    import shutil
    tmp = conf["senv"]["last_file"].split("/")
    shutil.copy(conf["senv"]["last_file"], conf["main"]["publicationPath"] + "/idx_templates/" + tmp[len(tmp) - 1])
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    cur.execute("DELETE FROM " + prefix + "r_table where i_id=" + inputs["id"]["value"] + ";INSERT INTO " + prefix + "r_table (i_id,doc) VALUES (" + inputs["id"]["value"] + ",'" + tmp[len(tmp) - 1] + "')")
    con.conn.commit()
    outputs["Message"]["value"] = "Repport file succesfully uploaded"
    return parseDocAttr(conf, {"template": {"value": tmp[len(tmp) - 1]}}, outputs)


def saveRepportSettings(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)

    if not (inputs["tuple"]["value"].__class__.__name__ in ('list', 'tuple')):
        inputs["tuple"]["value"] = [inputs["tuple"]["value"]]

    reqSuffix = " and (not(agregation) or agregation is null)"
    reqSuffix0 = " and step is null"
    fields0 = ""
    values0 = ""
    if "tid" in inputs:
        reqSuffix = " and t_id=" + inputs["tid"]["value"]
    if "step" in inputs:
        reqSuffix0 = " and step=" + inputs["step"]["value"]
        fields0 = ",step"
        values0 = "," + inputs["step"]["value"]
    req = "delete from " + prefix + "rtable where it_id=(select id from " + prefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ")" + reqSuffix0
    cur.execute(req)
    con.conn.commit()

    for i in range(0, len(inputs["tuple"]["value"])):
        tmp = json.loads(inputs["tuple"]["value"][i])
        tmp = eval(inputs["tuple"]["value"][i])
        try:
            var_ext = adapt(tmp["value"])
            var_ext.encoding = "utf-8"
            tmp0 = "%s" % var_ext #adapt(tmp["value"])
            tmp["value"] = str(tmp0)
            display_ext = adapt(tmp["display"])
            display_ext.encoding = "utf-8"
            tmp0 = "%s" % display_ext #adapt(tmp["display"])
            tmp["display"] = str(tmp0)
            var_ext = adapt(tmp["var"])
            var_ext.encoding = "utf-8"
            tmp0 = "%s" % var_ext #adapt(tmp["var"])
            tmp["var"] = str(tmp0)
            if not ("pos" in tmp):
                tmp["pos"] = "(select id from " + prefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ")"
            req = "INSERT INTO " + prefix + "rtable (it_id,display,var,typ,value" + fields0 + ") VALUES (" + tmp["pos"] + "," + tmp["display"] + "," + tmp["var"] + "," + str(tmp["type"]) + "," + tmp["value"] + "" + values0 + ")"
            cur.execute(req)
            con.conn.commit()
        except Exception as e:
            zoo.error("ERROR !!" + str(e))
            con.conn.commit()
            pass
    outputs["Result"]["value"] = zoo._("Repport settings saved")
    return zoo.SERVICE_SUCCEEDED


def fetchPrimaryKey(cur, tblName):
    # Extract informations about Primary key or fallback to default "ogc_fid"
    import datastores.postgis.pgConnection as pg
    try:
        cur.execute(pg.getDesc(cur, tblName))
    except:
        cur.execute(pg.getDescMSSQL(cur, tblName))
    vals = cur.fetchall()
    cfield = None
    for i in range(0, len(vals)):
        if i == 0:
            cfield = vals[i][1]
        if vals[i][3] == "PRI":
            cfield = vals[i][1]
            return cfield
    return cfield


def createAgregate(conf, inputs, outputs):
    import mapscript
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    # Extract datasource from territories
    req = "SELECT datasource from territories where id=" + inputs["tid"]["value"]
    cur.execute(req)
    vals = cur.fetchall()
    for i in range(0, len(vals)):
        tblName = vals[i][0]

    # Extract informations about Primary key or fallback to default "ogc_fid"
    import datastores.postgis.pgConnection as pg
    cur.execute(pg.getDesc(cur, tblName))
    vals = cur.fetchall()
    cfield = None
    geomc = None
    for i in range(0, len(vals)):
        zoo.info(vals[i])
        if vals[i][3] == "PRI":
            cfield = vals[i][1]
        if vals[i][2] == "geometry":
            geomc = vals[i][1]
        if cfield is not None and geomc is not None:
            break

    formula = inputs["formula"]["value"]
    tbl0Name = "indexes.view_idx" + inputs["id"]["value"]
    aTblName = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx" + inputs["id"]["value"]
    aVName = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_" + inputs["id"]["value"]
    reqSuffix = ""
    mapSuffix = ""
    reqSuffix0 = ""
    fields0 = ""
    values0 = ""
    field0 = inputs["field"]["value"]
    if "step" in inputs:
        # tbl0Name="indexes.view_idx_"+inputs["id"]["value"]+"_"+inputs["step"]["value"]
        mapSuffix = "_step" + inputs["step"]["value"]
        aTblName += "_step" + inputs["step"]["value"]
        aVName += "_step" + inputs["step"]["value"]
        reqSuffix += " and step=" + inputs["step"]["value"]
        m0 = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/timeline_Index" + inputs["id"]["value"] + "_indexes_view_idx" + inputs["id"]["value"] + "_step" + inputs["step"]["value"] + ".map")
        field0 = m0.getLayer(0).metadata.get("mmField")
        reqSuffix0 = ""
        fields0 = ",step"
        values0 = "," + inputs["step"]["value"]

    formula = formula.replace("[_X_]", field0).replace("[_T_]", tbl0Name)
    req = "DROP TABLE " + aTblName + " CASCADE;"
    try:
        cur.execute(req)
        con.conn.commit()
    except Exception as e:
        zoo.error(str(e))
        con.conn.commit()
    req = "CREATE TABLE " + aTblName + " as (SELECT min(" + tblName + "." + cfield + ") as " + cfield + ", " + formula + " as " + field0 + " from " + tblName + "," + tbl0Name + " WHERE ST_Within(" + tbl0Name + ".wkb_geometry," + tblName + ".wkb_geometry) group by " + tblName + "." + cfield + "); ALTER TABLE " + aTblName + " add constraint " + aTblName.replace(
        ".", "_") + "_pkey primary key(" + cfield + "); CREATE VIEW " + aVName + " AS (select " + tblName + ".*," + field0 + " from " + tblName + ", " + aTblName + " where " + tblName + "." + cfield + "=" + aTblName + "." + cfield + ");"
    try:
        zoo.info(str(req))
        cur.execute(req)
        con.conn.commit()
    except Exception as e:
        con.conn.commit()
        conf["lenv"]["message"] = zoo._("Issue occurs: " + str(e))
        return zoo.SERVICE_FAILED

    req = "DELETE FROM " + tprefix + "indicators_territories WHERE i_id=" + inputs["id"]["value"] + " and t_id=" + inputs["tid"]["value"] + reqSuffix0 + ";INSERT INTO " + tprefix + "indicators_territories (i_id,t_id,agregation) VALUES (" + inputs["id"]["value"] + "," + inputs["tid"]["value"] + ",true)";
    try:
        zoo.info(str(req))
        cur.execute(req)
        con.conn.commit()
        addLayerForIndex(conf, inputs, outputs)
    except Exception as e:
        con.conn.commit()
        conf["lenv"]["message"] = zoo._("Issue occurs: " + str(e))
        return zoo.SERVICE_FAILED

    subreq = "(SELECT id from " + tprefix + "indicators_territories where i_id=" + inputs["id"]["value"] + " and (not(agregation) or agregation is null))"
    formula_ext = adapt(inputs["formula"]["value"])
    formula_ext.encoding="utf-8"
    req = "DELETE FROM agregation where it_id=" + subreq + ";INSERT INTO agregation (it_id,t_id,formula) VALUES (" + subreq + "," + inputs["tid"]["value"] + "," + str(formula_ext)  + ")"
    cur.execute(req)
    con.conn.commit()

    if "step" in inputs:
        m = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/timeline_Index" + inputs["id"]["value"] + "_indexes_view_idx" + inputs["id"]["value"] + "_step" + inputs["step"]["value"] + ".map")
    else:
        m = mapscript.mapObj(conf["main"]["dataPath"] + "/indexes_maps/project_Index" + inputs["id"]["value"] + ".map")
    m.getLayer(0).name = aVName
    m.getLayer(0).data = aVName
    m.getLayer(0).metadata.set("ows_name", aVName)
    m.getLayer(0).metadata.set("ows_title", aVName)
    if "step" in inputs:
        m.save(conf["main"]["dataPath"] + "/indexes_maps/project_A" + inputs["tid"]["value"] + "_Index" + inputs["id"]["value"] + "_step" + inputs["step"]["value"] + ".map")
    else:
        m.save(conf["main"]["dataPath"] + "/indexes_maps/project_A" + inputs["tid"]["value"] + "_Index" + inputs["id"]["value"] + ".map")
    l = m.getLayer(0)
    import mapfile.service as mapfile
    zoo.info(dir(l.getClass(0)))
    form = l.metadata.get('mmColor').split(" ")
    for i in range(0, len(form)):
        if form[i] != "":
            form[i] = int(form[i])
    to = l.metadata.get('mmOutColor').split(" ")
    for i in range(0, len(to)):
        if to[i] != "":
            to[i] = int(to[i])
    form.pop(len(form) - 1)
    to.pop(len(to) - 1)
    zoo.info(str(form))
    zoo.info(str(to))
    inputs1 = {
        "prefix": {"value": "indexes"},
        "orig": {"value": conf["main"]["dbuserName"]},
        "layer": {"value": aVName},
        "map": {"value": "A" + inputs["tid"]["value"] + "_Index" + inputs["id"]["value"] + mapSuffix},
        "field": {"value": field0},
        "from": {"value": '%02x%02x%02x' % (form[0], form[1], form[2])},
        "to": {"value": '%02x%02x%02x' % (to[0], to[1], to[2])},
        "nbClasses": {"value": l.numclasses},
        "type": {"value": l.metadata.get("mmClass")},
        "formula": {"value": l.metadata.get("mmFormula")},
        "mmOpacity": {"value": str(l.getClass(0).getStyle(0).opacity)},
        "noDataUpdate": {"value": "true"}
    }
    if l.metadata.get("mmMethod") is not None:
        inputs1["method"] = {"value": l.metadata.get("mmMethod")}
    zoo.info(str(inputs1))
    outputs1 = {"Result": {"value": ""}}
    mapfile.classifyMap(conf, inputs1, outputs)

    # conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_Index"+inputs["id"]["value"]+".map")
    # outputs["Result"]["value"]=zoo._("Agregate successfully created")
    return zoo.SERVICE_SUCCEEDED


def joinIndexTable(conf, inputs, outputs):
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    tblName = "indexes.idx_table_" + inputs["id"]["value"]
    zoo.info(str(inputs))
    req = "select datasource from " + prefix + "territories where id='" + inputs["territory"]["value"] + "'"
    zoo.info(str(req))
    cur.execute(req)
    vals = cur.fetchall()
    zoo.info(str(vals))

    fields = ""
    # TODO: possible optimization: assume inputs["rcol"] is a Python 3 dictionary object
    zoo.info(myList(inputs["rcol"].keys()))
    zoo.info(inputs["rcol"]["value"][0])
    for i in ["rcol", "field"]:
        # TODO: confirm assumption: inputs[i] is a Python 3 dictionary object
        if "length" not in inputs[i]:
            inputs[i]["value"] = inputs[i]["value"].split(",")

    for i in inputs["rcol"]["value"]:
        if fields != "":
            fields += ","
        fields += tblName + "." + i + " AS o" + i

    zoo.info(inputs["field"]["value"])

    try:
        import os
        os.unlink(conf["main"]["dataPath"] + "/indexes_maps/project_Index" + inputs["id"]["value"] + ".map")
    except Exception as e:
        zoo.error(str(e))
        pass
    req = "CREATE view indexes.view_idx" + inputs["id"]["value"] + " AS (SELECT foo.*," + fields + " FROM " \
          + tblName + "," \
          + "(" \
          + "SELECT * FROM " + vals[0][0] \
          + ") as foo where foo." + inputs["field"]["value"][1] + "=" + tblName + "." + inputs["field"]["value"][0] + "::varchar(255))"
    zoo.info(str(req))
    cur.execute(req)
    con.conn.commit()

    req = "SELECT populate_geometry_columns('indexes.view_idx" + inputs["id"]["value"] + "'::regclass);"
    cur.execute(req)
    con.conn.commit()

    req = "delete from " + prefix + "dtable where it_id=(select id from " + prefix + "indicators_territories where i_id='" + inputs["id"]["value"] + "');delete from " + prefix + "d_table where i_id=" + inputs["id"][
        "value"] + ";delete from " + prefix + "graphs where it_id=(select id from " + prefix + "indicators_territories where i_id='" + inputs["id"]["value"] + "');delete from " + prefix + "indicators_territories where i_id='" + inputs["id"]["value"] + "'"
    cur.execute(req)
    con.conn.commit()

    filename = "NULL"
    if "filename" in inputs and inputs["filename"]["value"] != "NULL":
        filename_ext = adapt(inputs["filename"]["value"])
        filename_ext.encoding="utf-8"
        filename = "%s" % filename_ext.getquoted()
        #filename = "%s" % adapt(inputs["filename"]["value"]).getquoted()
    query = "NULL"
    if "query" in inputs and inputs["query"]["value"] != "":
        query_ext = adapt(inputs["query"]["value"])
        query_ext.encoding="utf-8"
        query = "%s" % query_ext.getquoted()
        #query = "%s" % adapt(inputs["query"]["value"]).getquoted()
    ds = "NULL"
    if "dbname" in inputs and inputs["dbname"]["value"] != "-1":
        dbname_ext = adapt(inputs["dbname"]["value"])
        dbname_ext.encoding = "utf-8"
        ds = "%s" % dbname_ext.getquoted()
        #ds = "%s" % adapt(inputs["dbname"]["value"]).getquoted()
    req = "insert into " + prefix + "indicators_territories (i_id,o_key_link,t_id,filename,tbl_link,tbl_key_link,fields,query,ds) VALUES (" + inputs["id"]["value"] + ",'" + inputs["field"]["value"][1] + "'," + inputs["territory"]["value"] + "," + filename + ",'" + inputs["layer"]["value"] + "','" + \
          inputs["field"]["value"][0] + "','" + "indexes.idx_table_" + inputs["id"]["value"] + "." + inputs["field"]["value"][0] + "," + fields + "'," + query + "," + ds + ")"
    zoo.info(str(req))
    cur.execute(req)
    con.conn.commit()

    outputs["Result"]["value"] = zoo._("View was successfully created, index is ready to use.")
    return zoo.SERVICE_SUCCEEDED


def dropTempFile(conf, inputs, outputs):
    import os
    try:
        os.unlink(conf["main"]["tmpPath"] + "/temporary_index.csv")
    except Exception as e:
        zoo.error(str(e))
    outputs["Result"]["value"] = zoo._("Table was successfully removed.")
    return zoo.SERVICE_SUCCEEDED


def dropTable(conf, inputs, outputs):
    con = auth.getCon(conf)
    cur = con.conn.cursor()
    try:
        con.conn.commit()
        req = "DROP VIEW indexes.view_idx" + inputs["id"]["value"] + " CASCADE"
        cur.execute(req)
        con.conn.commit()
    except Exception as e:
        zoo.error(str(e))
        pass
    try:
        con.conn.commit()
        req = "DROP TABLE indexes.idx_table_" + inputs["id"]["value"] + "  CASCADE"
        cur.execute(req)
        con.conn.commit()
    except Exception as e:
        zoo.error(str(e))
        pass
    outputs["Result"]["value"] = zoo._("Index was successfully removed.")
    return zoo.SERVICE_SUCCEEDED


def getLastFile(conf, inputs, outputs):
    if "last_file" in conf["senv"]:
        outputs["Result"]["value"] = conf["senv"]["last_file"]
    else:
        outputs["Result"]["value"] = "None"
    return zoo.SERVICE_SUCCEEDED


def setLastFile(conf, inputs, outputs):
    import mmsession
    import sys
    zoo.info("OK DEBUG " + str(conf["senv"]))
    zoo.info("OK DEBUG " + str(inputs))
    conf["senv"]["last_file"] = conf["main"]["tmpPath"] + "/" + inputs["last_file"]["value"]
    zoo.info(str(conf["senv"]))
    zoo.info(conf["senv"]["last_file"])
    if mmsession.save(conf) == zoo.SERVICE_SUCCEEDED:
        outputs["Result"]["value"] = conf["senv"]["last_file"]
        zoo.info("SAVED CONF !!!!")
        return zoo.SERVICE_SUCCEEDED
    else:
        return zoo.SERVICE_FAILED


# con=psycopg2.connect("user=djay host=127.0.0.1 port=5432 dbname=demogis")
# cur=con.cursor()
def testQuery(conf, inputs, outputs):
    from manage_users.manage_users import manage_users
    import datastores.postgis.service as pg
    import json
    tmp = inputs["dbname"]["value"].split(':')
    pg.load(conf, {"name": {"value": tmp[1]}, "type": {"value": tmp[0]}}, outputs)
    zoo.info(outputs["Result"]["value"])
    v = json.loads(outputs["Result"]["value"])
    dbs = ""
    notAllowed = ['stype', 'name']
    for i in v:
        if notAllowed.count(i) == 0:
            dbs += " " + i + "=" + v[i]
    try:
        con = psycopg2.connect(dbs)
    except:
        try:
            from lxml import etree
            import osgeo.ogr as ogr
            doc = etree.parse(conf["main"]["dataPath"] + "/" + tmp[0] + "/" + tmp[1] + ".xml")
            styledoc = etree.parse(conf["main"]["dataPath"] + "/" + tmp[0] + "/conn.xsl")
            style = etree.XSLT(styledoc)
            result = style(doc)
            zoo.info(str(result))
            ds = ogr.Open(result.content)
            res = ds.ExecuteSQL(inputs["query"]["value"], None, None)
            n = res.GetFeatureCount()
            if n > 0:
                outputs["Result"]["value"] = zoo._("Number of fetched elements from your query: ") + str(n)
            else:
                outputs["Result"]["value"] = zoo._("Your query sounds correct but didn't return any result")
                # con=mdb.connect(dbs)
            return zoo.SERVICE_SUCCEEDED
        except Exception as e:
            conf["lenv"]["message"] = zoo._("Unable to access the database") + str(e)
            return zoo.SERVICE_FAILED
    try:
        cur = con.cursor()
        cur.execute(inputs["query"]["value"])
        vals = cur.fetchall()
        if len(vals) > 0:
            outputs["Result"]["value"] = zoo._("Number of fetched elements from your query: ") + str(len(vals))
        else:
            outputs["Result"]["value"] = zoo._("Your query sounds correct but didn't return any result")
        con.close()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to run your query for the following reason: ") + str(e)
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED


def getMapRequest(conf, inputs, outputs):
    import mapscript
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    req0 = "SELECT datasource from " + prefix + "territories where id=" + inputs["t_id"]["value"]
    cur.execute(req0)
    vals = cur.fetchall()
    dsn = ""
    if len(vals) > 0:
        dsn = vals[0][0].replace("public.", "")
    else:
        conf["lenv"]["message"] = zoo._("No territory found for the id provided")
        return zoo.SERVICE_FAILED
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/PostGIS/" + conf["main"]["dbuserName"] + "ds_ows.map")
    for i in range(0, m.numlayers):
        l = m.getLayer(i)
        if l.data == dsn:
            outputs["Result"]["value"] = conf["main"]["mapserverAddress"] + "?map=" + conf["main"]["dataPath"] + "/PostGIS/" + conf["main"]["dbuserName"] + "ds_ows.map"
            if "preview" in inputs and inputs["preview"]["inRequest"] == "true":
                ext = l.getExtent()
                ext.project(mapscript.projectionObj(l.getProjection()), mapscript.projectionObj("EPSG:4326"))
                minw = 300
                minh = 200
                diffX = ext.maxx - ext.minx
                diffY = ext.maxy - ext.miny
                if diffX > diffY:
                    w = (200 * diffX) / diffY
                    h = 200
                else:
                    w = 300
                    h = (300 * diffY) / diffX
                outputs["Result"]["value"] += "&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=" + str(ext.minx) + "," + str(ext.miny) + "," + str(ext.maxx) + "," + str(ext.maxy) + "&SRS=EPSG:4326&WIDTH=" + str(w) + "&HEIGHT=" + str(h) + "&LAYERS=" + dsn
            else:
                if "layer" in inputs:
                    dsn = inputs["layer"]["value"]
                outputs["Result"]["value"] += "&SERVICE=WFS&VERSION=1.0.0&REQUEST=DescribeFeatureType&typename=" + dsn
            break
    return zoo.SERVICE_SUCCEEDED


def getMapRequest0(conf, inputs, outputs):
    getMapRequest(conf, inputs, outputs)
    import urllib.request, urllib.error, urllib.parse
    u = urllib.request.urlopen(outputs["Result"]["value"])
    outputs["Result"]["value"] = u.read()
    return zoo.SERVICE_SUCCEEDED


def listDefault(tbl, cur, clause=None):
    if clause is None:
        cur.execute("SELECT * from " + tbl + " order by id desc")
    else:
        cur.execute("SELECT * from " + tbl + clause)

    vals = cur.fetchall()
    elems = []
    for i in range(0, len(vals)):
        elems += [{"id": vals[i][0], "text": vals[i][1]}]
    return elems


def listThemes(cur, prefix, group='public', clause=None, clause1=None):
    zoo.info("GROUPS :" + group)
    req0 = "select * from " + prefix + "themes where "
    if clause is not None:
        req0 += clause
    else:
        req0 += " pid is null "
    if group.count("admin") == 0:
        groups = group.split(',')
        lclause = "";
        for i in range(0, len(groups)):
            if lclause != "":
                lclause += " OR "
            lclause += "name='" + groups[i] + "'"
        req0 += " and id in (SELECT t_id from " + prefix + "themes_groups where g_id in (SELECT id from " + prefix + "groups where " + lclause + " or name='public'))"
    if clause1 is not None:
        req0 += " AND " + clause1
    req0 += " order by ord"
    zoo.info("\n+++++++REQ0 === " + req0)
    res = cur.execute(req0)
    vals = cur.fetchall()
    elems = []
    for i in range(0, len(vals)):
        celem = {"id": vals[i][0], "text": vals[i][1], "color": vals[i][3]}
        tmp = listThemes(cur, prefix, group, "pid=" + str(vals[i][0]), clause1)
        if len(tmp) > 0:
            celem["children"] = tmp
        elems += [celem]
    return elems


def listExtent(conf, cur, tbl):
    import datastores.directories.service as ds
    import os
    if "senv" in conf:
        zoo.info(conf["senv"])
    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
        req0 = "select id, title, CONCAT( CAST(geom.STPointN(1).STX as varchar),',',CAST(geom.STPointN(1).STY as varchar),',',CAST(geom.STPointN(3).STX as varchar),',',CAST(geom.STPointN(3).STY as varchar)) as extent from (select *, wkb_geometry.STEnvelope() as geom from " + tbl + ") as foo"
    else:
        req0 = "select id, title as text, replace(replace(replace(ST_Extent(ST_transform(wkb_geometry,3857))::text,' ',','),'BOX(',''),')','') as ext from " + tbl + " group by id order by id desc"
    zoo.info("\n+++++++REQ0 === " + req0)
    res = cur.execute(req0)
    vals = cur.fetchall()
    elems = []
    for i in range(0, len(vals)):
        # elems+=[{"id": vals[i][0],"text":vals[i][1],"ext":vals[i][2],"size":ds.getFormatedSize(os.path.getsize(conf["main"]["tmpPath"]+"/tiles/mmTiles-g-"+str(vals[i][0])+".db"))}]
        try:
            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                coords=vals[i][2].split(',')
                import mapscript
                myShape1=mapscript.pointObj(float(coords[0]),float(coords[1]))
                ret=myShape1.project(mapscript.projectionObj("epsg:4326"),mapscript.projectionObj("epsg:3857"))
                zoo.info("RESULT projection: "+str(ret))
                myShape2=mapscript.pointObj(float(coords[2]),float(coords[3]))
                ret=myShape2.project(mapscript.projectionObj("epsg:4326"),mapscript.projectionObj("epsg:3857"))
                zoo.info("RESULT projection: "+str(ret))
                values=str(myShape1.x)+','+str(myShape1.y)+','+str(myShape2.x)+','+str(myShape2.y)
                try:
                    elems += [{"id": vals[i][0], "text": vals[i][1], "ext": values,
                        "size": ds.getFormatedSize(os.path.getsize(conf["main"]["tmpPath"] + "/tiles/mmTiles-g-" + str(vals[i][0]) + ".db"))}]
                except:
                    elems += [{"id": vals[i][0], "text": vals[i][1], "ext": values,
                        "size": "0Mb"}]
            else:
                elems += [{"id": vals[i][0], "text": vals[i][1], "ext": vals[i][2],
                    "size": ds.getFormatedSize(os.path.getsize(conf["main"]["tmpPath"] + "/tiles/mmTiles-g-" + str(vals[i][0]) + ".db"))}]
                # elems[len(elems)-1]["size"]=ds.getFormatedSize(os.path.getsize(conf["main"]["tmpPath"]+"/tiles/mmTiles-g-"+str(vals[i][0])+".db")
        except Exception as e:
            zoo.error(str(e))
            elems += [{"id": vals[i][0], "text": vals[i][1], "ext": vals[i][2], "size": "0Mb"}]
        # try:
        #    elems[len(elems)-1]["size"]=ds.getFormatedSize(os.path.getsize(conf["main"]["tmpPath"]+"/tiles/mmTiles-g-"+str(vals[i][0])+".db")
        # except Exception as e:
        #    elems[len(elems)-1]["size"]=0

    return elems


def flatElements(l, res):
    for i in range(0, len(l)):
        res["id_" + str(l[i]["id"])] = l[i]["text"]
        if "children" in l[i]:
            flatElements(l[i]["children"], res)


def flatTerritoires(l, res):
    for i in range(0, len(l)):
        res["id_" + str(l[i]["id"])] = l[i]["text"]
        if "children" in l[i]:
            flatTerritoires(l[i]["children"], res)


def listTerritoires(cur, prefix, group='public', clause=None, clause1=None):
    req0 = "select * from " + prefix + "territories where id "
    req1 = "select o_t_id from " + prefix + "t_hierarchy "
    if clause is not None:
        req0 += ""
        req1 += " where " + clause
    else:
        req0 += " not "
    req0 += " in ( " + req1 + " ) "
    if group.count("admin") == 0:
        groups = group.split(',')
        lclause = ""
        for i in range(0, len(groups)):
            if lclause != "":
                lclause += " OR "
            lclause += "name='" + groups[i] + "'"
        req0 += " and id in (SELECT t_id from " + prefix + "territories_groups where g_id=(SELECT id from " + prefix + "groups where " + lclause + " or name='public'))"
    req2 = req0
    if clause1 is not None:
        req0 += " AND " + clause1
    req0 += " order by ord"
    req2 += " order by ord"
    res = cur.execute(req0)
    vals = cur.fetchall()
    elems = []
    for i in range(0, len(vals)):
        celem = {"id": vals[i][0], "text": vals[i][1]}
        tmp = listTerritoires(cur, prefix, group, "p_t_id=" + str(vals[i][0]), clause1)
        if len(tmp) > 0:
            celem["children"] = tmp
        elems += [celem]
    if len(vals) == 0:
        res = cur.execute(req2)
        vals = cur.fetchall()
        elems = []
        for i in range(0, len(vals)):
            tmp = listTerritoires(cur, prefix, group, "p_t_id=" + str(vals[i][0]), clause1)
            if len(tmp) > 0:
                elems += tmp
    return elems


def list(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    res = None
    if not (auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    if inputs["table"]["value"] == "territories":
        res = listTerritoires(cur, prefix, conf["senv"]["group"])
    else:
        if inputs["table"]["value"] == "themes":
            res = listThemes(cur, prefix, conf["senv"]["group"])
        else:
            if inputs["table"]["value"] == "mm.extents":
                res = listExtent(conf, cur, inputs["table"]["value"])
            elif inputs["table"]["value"] == "idicateurs":
                res = listDefault(prefix + inputs["table"]["value"], cur, " order by ord")
            else:
                if inputs["table"]["value"].count('.') > 0:
                    # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                    if "cond" in inputs:
                        res = listDefault(inputs["table"]["value"], cur, inputs["cond"]["value"])
                    else:
                        res = listDefault(inputs["table"]["value"], cur)
                else:
                    res = listDefault(prefix + inputs["table"]["value"], cur)
    if res is not None:
        for i in res:
            i["selected"] = True
            break
        outputs["Result"]["value"] = json.dumps(res)
    else:
        conf["lenv"]["message"] = "Unable to access table"
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED


def orderElement(conf, inputs, outputs):
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    if "length" in inputs["node"]:
        for i in range(0, int(inputs["node"]["length"])):
            cur.execute("UPDATE " + inputs["table"]["value"] + " set ord=" + str(i + 1) + " WHERE id=" + inputs["node"]["value"][i])
    else:
        cur.execute("UPDATE " + inputs["table"]["value"] + " set ord=1 WHERE id=" + inputs["node"]["value"])
    con.conn.commit()
    con.conn.close()
    outputs["Result"]["value"] = zoo._("Elements were ordered successfully")
    return zoo.SERVICE_SUCCEEDED


def insertElement(conf, inputs, outputs):
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    if not (auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    try:
        col_sufix = ""
        val_sufix = ""
        if inputs["table"]["value"].count(".") > 0:
            prefix = ""
            # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
            inputsKeys = inputs.keys()
            # if inputsKeys.count('title'):
            if 'title' in inputsKeys:
                col_sufix = ",title"
                title_ext=adapt(inputs["title"]["value"])
                title_ext.encoding="utf-8"
                val_sufix = "," + str(title_ext)
            if len(inputsKeys) > 2:  # maybe affected
                for i in inputsKeys:  # maybe affected
                    zoo.info(str(i))
                    if i != "table" and i != "name" and i != "title":
                        col_sufix += "," + i
                        value_ext=adapt(inputs[i]["value"])
                        value_ext.encoding="utf-8"
                        val_sufix += "," + str(value_ext)
        else:
            prefix = auth.getPrefix(conf)
        name_ext=adapt(inputs["name"]["value"])
        name_ext.encoding="utf-8"
        zoo.info("INSERT INTO " + prefix + inputs["table"]["value"] + " (name" + col_sufix + ") VALUES (" + str(name_ext) + "" + val_sufix + ")")
        cur.execute("INSERT INTO " + prefix + inputs["table"]["value"] + " (name" + col_sufix + ") VALUES (" + str(name_ext) + "" + val_sufix + ")")
        outputs["Result"]["value"] = zoo._("Done")
    except Exception as e:
        conf["lenv"]["message"] = zoo._("An error occured when processing your request: ") + str(e)
        return zoo.SERVICE_FAILED
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def createGraphView(conf, inputs, con, cur):
    prefix = auth.getPrefix(conf)
    req = "SELECT i_id from " + prefix + "indicators_territories where id=" + inputs["it_id"]["value"]
    cur.execute(req)
    vals = cur.fetchone()
    id = str(vals[0])
    tblName = "indexes.view_idx_g_" + id + ""
    otblName = "indexes.view_idx" + id
    if "tid" in inputs:
        tblName = "indexes.view_idx_g_" + id + "_t_" + inputs["tid"]["value"]
        otblName = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_" + id

    import mapscript
    if "tid" in inputs:
        omapfile = conf["main"]["dataPath"] + "/indexes_maps/project_A" + inputs["tid"]["value"] + "_Index" + id + ".map"
    else:
        omapfile = conf["main"]["dataPath"] + "/indexes_maps/project_Index" + id + ".map"
    m = mapscript.mapObj(omapfile)
    ext = m.getLayer(0).extent
    m.setExtent(ext.minx, ext.miny, ext.maxx, ext.maxy);
    if "step" in inputs:
        tmp = m.getLayer(0).metadata.get("mmSteps").split(",")
        # if tmp.count(inputs["step"]["value"])>0:
        #    tblName+="_"+str(tmp.index(inputs["step"]["value"]))
        tblName += "_" + str(inputs["step"]["value"])
    req = "DROP VIEW " + tblName
    try:
        cur.execute(req)
        con.commit()
    except Exception as e:
        zoo.error(str(e))
        con.commit()
    formula = inputs["formula"]["value"]
    vx = inputs["vx"]["value"]
    vy = inputs["vy"]["value"]
    req = "CREATE VIEW " + tblName + " AS (SELECT ogc_fid,wkb_geometry," + vx + "," + (formula.replace("[_X_]", inputs["vy"]["value"])) + " as " + vy + " FROM " + otblName + ") "
    if "tid" in inputs:
        req = "CREATE VIEW " + tblName + " AS (SELECT ogc_fid,wkb_geometry," + vx + "," + ("[_X_]".replace("[_X_]", inputs["vy"]["value"])) + " as " + vy + " FROM " + otblName + ") "
    zoo.error(str(req))
    try:
        cur.execute(req)
        con.commit()
    except Exception as e:
        zoo.error(str(e))
        con.commit()
    if "step" in inputs:
        tmp = m.getLayer(0).metadata.get("mmSteps").split(",")
        if "tid" in inputs:
            omapfile = conf["main"]["dataPath"] + "/indexes_maps/project_A" + inputs["tid"]["value"] + "_Index" + id + ".map"
        else:
            omapfile = conf["main"]["dataPath"] + "/indexes_maps/timeline_Index" + id + "_indexes_view_idx" + id + "_step" + str(inputs["step"]["value"]) + ".map"
            id += "_step" + str(inputs["step"]["value"])
        m = mapscript.mapObj(omapfile)
    m.getLayer(0).data = tblName
    m.setExtent(ext.minx, ext.miny, ext.maxx, ext.maxy);
    if "tid" in inputs:
        m.save(conf["main"]["dataPath"] + "/indexes_maps/project_A" + inputs["tid"]["value"] + "_GIndex" + id + ".map")
    else:
        if "step" in inputs:
            zoo.info((conf["main"]["dataPath"] + "/indexes_maps/project_GIndex" + id + ".map"))
            m.save(conf["main"]["dataPath"] + "/indexes_maps/project_GIndex" + id + ".map")  # "_step"+inputs["step"]["value"]+".map")
        else:
            m.save(conf["main"]["dataPath"] + "/indexes_maps/project_GIndex" + id + ".map")


def insertElem(conf, inputs, outputs):
    prefix = auth.getPrefix(conf)
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    if not (auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    try:
        fields = ""
        values = ""
        # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
        for i in inputs.keys():
            if i != "table" and i != "tid" and inputs[i]["value"] != "":
                if not (auth.is_ftable(inputs["table"]["value"])):
                    conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
                    return zoo.SERVICE_FAILED
                if fields != "":
                    fields += ","
                fields += i
                if values != "":
                    values += ","
                if i.count("_id") > 0:
                    values += inputs[i]["value"]
                else:
                    tmp = adapt(inputs[i]["value"])
                    tmp.encoding="utf-8"
                    values += str(tmp)

        req = "INSERT INTO " + prefix + inputs["table"]["value"] + " (" + fields + ") VALUES (" + values + ")"
        zoo.info(str(req))
        cur.execute(req)
        con.conn.commit()
        if inputs["table"]["value"] == "graphs":
            outputs["Result"]["value"] = zoo._("Done (with graph view creation)")
            createGraphView(conf, inputs, con.conn, cur)
        else:
            outputs["Result"]["value"] = zoo._("Done")
    except Exception as e:
        conf["lenv"]["message"] = zoo._("An error occured when processing your request: ") + str(e)
        return zoo.SERVICE_FAILED
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def updateElem(conf, inputs, outputs):
    prefix = auth.getPrefix(conf)
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    if not (auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    try:
        fields = ""
        values = ""
        # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
        for i in inputs.keys():
            if i != "table" and i != "id" and i != "tid" and inputs[i]["value"] != "":
                if fields != "":
                    fields += ","
                fields += i + "="
                if i.count("_id") > 0:
                    fields += inputs[i]["value"]
                else:
                    tmp = adapt(inputs[i]["value"])
                    tmp.encoding="utf-8"
                    fields += str(tmp)

        clause = ""
        if 'tid' in inputs:
            zoo.info("")
        tableName = prefix + inputs["table"]["value"]
        if inputs["table"]["value"].count('.') > 0:
            tableName = inputs["table"]["value"]
        req = "UPDATE " + tableName + " set " + fields + " where id=" + inputs["id"]["value"]
        zoo.info(str(req))
        cur.execute(req)
        con.conn.commit()
        if inputs["table"]["value"] == "graphs":
            outputs["Result"]["value"] = zoo._("Done (with graph view creation)")
            createGraphView(conf, inputs, con.conn, cur)
        else:
            outputs["Result"]["value"] = zoo._("Done")
    except Exception as e:
        conf["lenv"]["message"] = zoo._("An error occured when processing your request: ") + str(e)
        return zoo.SERVICE_FAILED
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def updateKeywords(conf, cur, nom, i_id, k):
    prefix = auth.getPrefix(conf)
    tmp = adapt(nom)
    tmp.encoding="utf-8"
    req0 = "SELECT id from " + prefix + "keywords where "
    req0 += " nom = ".encode("utf-8") + str(tmp)
    cur.execute(req0)
    vals = cur.fetchone()
    tmp = adapt(nom)
    tmp.encoding="utf-8"
    tmp0 = str(tmp)
    if vals is not None and len(vals) > 0:
        clause = " id = " + str(vals[0])
        req = "UPDATE " + prefix + "keywords set nom = " + tmp0 + " where " + clause
    else:
        req = "INSERT INTO " + prefix + "keywords (nom) VALUES (" + tmp0 + ")"
    cur.execute(req)
    if k == 0:
        req = "DELETE FROM " + prefix + "indicators_keywords where i_id=" + i_id + ";"
    else:
        req = ""
    req += "INSERT INTO " + prefix + "indicators_keywords(i_id,k_id) VALUES (" + i_id + ",(" + req0 + "))"
    cur.execute(req)


def updateElement(conf, inputs, outputs):
    import json
    zoo.info(inputs["tuple"]["value"])
    obj = json.loads(inputs["tuple"]["value"].replace("\n", "").replace("\t", ""))

    if not ("id" in obj):
        conf["lenv"]["message"] = zoo._("Please provide an id for the tuple to update")
        return zoo.SERVICE_FAILED

    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()

    li_id = str(obj["id"])
    zoo.info("li_d")
    zoo.info(str(li_id))
    zoo.info(str(obj))
    zoo.info("li_d")

    if "keywords" in inputs:
        tmp0 = inputs["keywords"]["value"].split(',')
        if len(tmp0) == 1:
            tmp0 = inputs["keywords"]["value"].split(';')
        for k in range(0, len(tmp0)):
            zoo.info("li_d")
            updateKeywords(conf, cur, tmp0[k], li_id, k)
            zoo.info("li_d")
            con.conn.commit()
            zoo.info("li_d")

    prefix = auth.getPrefix(conf)
    tableName = prefix + inputs["table"]["value"]
    if inputs["table"]["value"].count('.') > 0:
        tableName = prefix + inputs["table"]["value"]
    req0 = "UPDATE " + tableName + " set "
    clause = "id=[_id_]"
    # clause="id="+str(obj["id"])
    # TODO: confirm assumption: "obj" is a Python 3 dictionary object
    keys = obj.keys()
    cnt = 0
    req1 = None
    req2 = None
    avoidReq1 = False
    params = {}
    for i in keys:  # maybe affected
        if i is None or obj[i] == "":
            continue
        if i == "id":
            continue
        if not (obj[i].__class__.__name__ in ('list', 'tuple')):
            if cnt > 0:
                req0 += ", "
            try:
                if obj[i] != "-1" and obj[i] != "":
                    # tmp = adapt(obj[i].encode('utf-8'))
                    req0 += i + " = [_" + i + "_]"
                    params[i] = {"value": obj[i], "format": "s"}
                    # req0+= i +" = "+str(tmp).decode("utf-8")
                else:
                    req0 += " " + i + "=NULL"
            except Exception as e:
                zoo.error(str(e))
                req0 += " " + i + "=[_" + i + "_]"
                params[i] = {"value": obj[i], "format": "s"}
                # req0+=" "+i+"="+obj[i]
                # req0+=" "+i+"="+obj[i]
            cnt += 1
        else:
            for j in range(0, len(obj[i])):
                ntname = prefix + i
                if not (avoidReq1):
                    req1 = "DELETE FROM " + ntname + " WHERE " + inputs[i + "_in"]["value"] + "=" + str(obj["id"])
                    cur.execute(req1)
                    zoo.info(str(req1))
                    req1 = None
                    avoidReq1 = True
                if obj[i][j] != "-1":
                    if req2 is None:
                        req2 = []
                    req2 += ["INSERT INTO " + ntname + " (" + inputs[i + "_in"]["value"] + "," + inputs[i + "_out"]["value"] + ") VALUES (" + str(obj["id"]) + "," + obj[i][j] + ")"]
                    # if req2 is not None:
                #    cur.execute(req2)
                #    req2=None
            avoidReq1 = False
    req0 += " WHERE " + clause
    params["id"] = {"value": obj["id"], "format": "s"}

    zoo.info(str(req0.encode("utf-8")))

    try:
        con.pexecute_req([req0, params])
        # cur.execute(req0)
        if req1 is not None:
            cur.execute(req1)
        if req2 is not None:
            for i in range(0, len(req2)):
                cur.execute(req2[i])
        # cur.execute(req2)
        con.conn.commit()
        con.conn.close()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to run the SQL request: ") + str(e)
        return zoo.SERVICE_FAILED

    try:
        if ["documents", "indicators"].count(inputs["table"]["value"]) > 0:
            import shutil
            shutil.copy(conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["senv"]["MMID"] + "/" + obj['filename'], conf["main"]["publicationPath"] + "/" + inputs["table"]["value"] + "/" + obj['filename'])
    except Exception as e:
        zoo.error(zoo._("Unable to copy uploaded file: ") + str(e))
        pass
    outputs["Result"]["value"] = zoo._("Done")
    return zoo.SERVICE_SUCCEEDED


def deleteElement(conf, inputs, outputs):
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    prefix = auth.getPrefix(conf)
    if not (auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    if "atable" in inputs and inputs["atable"]["value"] != "NULL":
        if inputs["table"]["value"].count('.') > 0:
            prefix = ""
        if inputs["atable"]["value"].__class__.__name__ in ('list', 'tuple'):
            for i in range(0, len(inputs["atable"]["value"])):
                if not (auth.is_ftable(inputs["atable"]["value"][i])):
                    conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
                    return zoo.SERVICE_FAILED
                req = "DELETE FROM " + prefix + inputs["atable"]["value"][i] + " WHERE " + inputs["akey"]["value"][i] + "=[_id_]"
                con.pexecute_req([req, {"id": {"value": inputs["id"]["value"], "format": "s"}}])
                con.conn.commit()
        else:
            if not (auth.is_ftable(inputs["atable"]["value"])):
                conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
                return zoo.SERVICE_FAILED
            req = "DELETE FROM " + prefix + inputs["atable"]["value"] + " WHERE " + inputs["akey"]["value"] + "=[_id_]"
            con.pexecute_req([req, {"id": {"value": inputs["id"]["value"], "format": "s"}}])
            con.conn.commit()
    try:
        if inputs["table"]["value"] == "themes":
            con.pexecute_req(["DELETE FROM " + prefix + inputs["table"]["value"] + " where id=[_id_]", {"id": {"value": inputs["id"]["value"], "format": "s"}}])
        else:
            if inputs["table"]["value"].count('.') == 0 and inputs["table"]["value"] != "p_tables":
                con.pexecute_req(["DELETE FROM " + prefix + inputs["table"]["value"] + " where id=[_id_]", {"id": {"value": inputs["id"]["value"], "format": "s"}}])
            else:
                if inputs["table"]["value"] == "p_tables":
                    con.pexecute_req(["DELETE FROM mm_tables." + inputs["table"]["value"] + " where id=[_id_]", {"id": {"value": inputs["id"]["value"], "format": "s"}}])
                else:
                    con.pexecute_req(["DELETE FROM " + inputs["table"]["value"] + " where id=[_id_]", {"id": {"value": inputs["id"]["value"], "format": "s"}}])
            if inputs["table"]["value"] == "indicators":
                import glob, os, shutil
                rpath = conf["main"]["dataPath"] + "/indexes_maps/"
                try:
                    os.unlink(rpath + "project_PIndex" + inputs["id"]["value"] + ".map")
                except:
                    pass
        outputs["Result"]["value"] = zoo._("Element deleted")
    except Exception as e:
        conf["lenv"]["message"] = zoo._("An error occured when processing your request: ") + str(e)
        return zoo.SERVICE_FAILED
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def detailsDocuments(con, val, prefix):
    req0 = "select id,name,description,filename,url from " + prefix + "documents where id=[_id_]"
    con.pexecute_req([req0, {"id": {"value": str(val), "format": "s"}}])
    vals = con.cur.fetchall()
    res = {}
    if len(vals) > 0:
        res["id"] = vals[0][0]
        res["name"] = vals[0][1]
        res["description"] = vals[0][2]
        res["file"] = vals[0][3]
        res["url"] = vals[0][4]

    req1 = "select * from " + prefix + "themes where id in (select t_id from " + prefix + "documents_themes where d_id=[_id_])"
    con.pexecute_req([req1, {"id": {"value": str(val), "format": "s"}}])
    vals = con.cur.fetchall()
    res["documents_themes"] = []
    if len(vals) > 0:
        for i in range(0, len(vals)):
            res["documents_themes"] += [vals[i][0]]
    req2 = "select * from " + prefix + "groups where id in (select g_id from " + prefix + "documents_groups where d_id=[_id_])"
    con.pexecute_req([req2, {"id": {"value": str(val), "format": "s"}}])
    try:
        vals0 = con.cur.fetchall()
        res["documents_groups"] = []
        if len(vals0) > 0:
            for j in range(0, len(vals0)):
                res["documents_groups"] += [vals0[j][0]]
    except:
        res["documents_groups"] += []

    return res


def detailsThemes(con, val, prefix):
    req0 = "select id,name,description,color,pid from " + prefix + "themes where id=[_id_]"
    con.pexecute_req([req0, {"id": {"value": str(val), "format": "s"}}])
    vals = con.cur.fetchall()
    res = {}
    if len(vals) > 0:
        res["id"] = vals[0][0]
        res["name"] = vals[0][1]
        res["description"] = vals[0][2]
        res["color"] = vals[0][3]
        res["pid"] = vals[0][4]

    req1 = "select id from " + prefix + "indicators where id in (select i_id from " + prefix + "indicators_themes where t_id=[_t_id_])"
    try:
        con.pexecute_req([req1, {"t_id": {"value": str(val), "format": "s"}}])
        vals = con.cur.fetchall()
        res["indicators_themes"] = []
        if len(vals) > 0:
            for i in range(0, len(vals)):
                res["indicators_themes"] += [vals[i][0]]
    except Exception as e:
        zoo.error(dir(con.cur))
        zoo.error(str(e))
        con.cur.connection.commit()
        pass
    req2 = "select * from " + prefix + "groups where id in (select g_id from " + prefix + "themes_groups where t_id=[_t_id_])"
    con.pexecute_req([req2, {"t_id": {"value": str(val), "format": "s"}}])
    vals = con.cur.fetchall()
    res["themes_groups"] = []
    if len(vals) > 0:
        for i in range(0, len(vals)):
            res["themes_groups"] += [vals[i][0]]
    return res


def detailsTerritoires(cur, val, prefix):
    req0 = "select * from " + prefix + "territories where id=" + str(val)
    cur.execute(req0)
    vals = cur.fetchall()
    res = {}
    if len(vals) > 0:
        res["id"] = vals[0][0]
        res["name"] = vals[0][1]
        res["dataSource"] = vals[0][2]

    req1 = "select * from " + prefix + "territories where id in (select p_t_id from " + prefix + "t_hierarchy where o_t_id=" + str(val) + ")"
    cur.execute(req1)
    vals = cur.fetchall()
    res["t_hierarchy"] = []
    if len(vals) > 0:
        for i in range(0, len(vals)):
            res["t_hierarchy"] += [vals[i][0]]

    req2 = "select * from " + prefix + "groups where id in (select g_id from " + prefix + "territories_groups where t_id=" + str(val) + ")"
    cur.execute(req2)
    vals = cur.fetchall()
    res["territories_groups"] = []
    if len(vals) > 0:
        for i in range(0, len(vals)):
            res["territories_groups"] += [vals[i][0]]
    return res


def detailsIndicateurs(conf, inputs, cur, val, tab, prefix):
    res = {}
    if tab == "metadata":
        req0 = "SELECT id, name, description, sources, filename, url from " + prefix + "indicators where id=" + val
        cur.execute(req0)
        vals = cur.fetchall()
        if len(vals) > 0:
            res["id"] = vals[0][0]
            res["name"] = vals[0][1]
            res["description"] = vals[0][2]
            res["sources"] = vals[0][3]
            res["file"] = vals[0][4]
            res["url"] = vals[0][5]

        suffix = " and (not(agregation) or agregation is null)"
        req1 = "select count(*) from " + prefix + "indicators_territories where i_id=" + val + suffix
        zoo.info(str(req1))
        cur.execute(req1)
        vals = cur.fetchall()
        if len(vals) > 0 and vals[0][0] > 0:
            req2 = "SELECT t_id, o_key_link, filename, tbl_link, tbl_key_link, query, ds, id from " + prefix + "indicators_territories where i_id=" + val + suffix
            zoo.info(str(req2))
            cur.execute(req2)
            vals = cur.fetchall()
            if len(vals) > 0:
                lval = str(vals[0][2]).split('/')
                res["indicators_territories"] = vals[0][0]
                res["indicators_territories_key"] = vals[0][1]
                res["file_link"] = str(vals[0][2])
                res["file_name"] = lval[len(lval) - 1]
                res["file_url"] = str(vals[0][2]).replace(conf["main"]["tmpPath"], conf["main"]["tmpUrl"])
                res["tbl_link"] = vals[0][3]
                res["tbl_key_link"] = vals[0][4]
                res["query"] = vals[0][5]
                res["ds"] = vals[0][6]
                res["it_id"] = vals[0][7]

        req0 = "select count(*) from " + prefix + "indicators_keywords where i_id=" + val
        zoo.info(str(req0))
        cur.execute(req0)
        vals = cur.fetchall()
        if len(vals) > 0 and vals[0][0] > 0:
            req2 = "SELECT nom from " + prefix + "keywords where id in (SELECT k_id from " + prefix + "indicators_keywords where i_id=" + val + ")"
            zoo.info(str(req2))
            cur.execute(req2)
            vals = cur.fetchall()
            if len(vals) > 0:
                for k in range(0, len(vals)):
                    if "indicators_keywords" in res:
                        res["indicators_keywords"] += "," + str(vals[k][0].encode("utf-8").decode('utf-8'))
                    else:
                        res["indicators_keywords"] = str(vals[k][0].encode("utf-8")).decode('utf-8')

        req2 = "select * from " + prefix + "groups where id in (select g_id from " + prefix + "indicators_groups where i_id=" + str(val) + ")"
        cur.execute(req2)
        vals = cur.fetchall()
        res["indicators_groups"] = []
        if len(vals) > 0:
            for i in range(0, len(vals)):
                res["indicators_groups"] += [vals[i][0]]

        zoo.info(str(inputs))
        if "public" in inputs:
            req22 = 'select t_id from ' + prefix + 'indicators_territories,' + prefix + 'territories where "+tprefix+"indicators_territories.t_id=territories.id and "+tprefix+"indicators_territories.i_id=' + str(res["id"]) + ' and agregation;'
            zoo.info(str(req22))
            cur.execute(req22)
            vals = cur.fetchall()
            res["agregation"] = []
            res["agregation_pkeys"] = []
            if len(vals) > 0:
                for i in range(0, len(vals)):
                    res["agregation"] += [vals[i][0]]
                    req23 = "select var from dtable where it_id in (select " + tprefix + "indicators_territories.id from " + tprefix + "indicators_territories, " + tprefix + "indicators where " + tprefix + "indicators_territories.i_id=indicateurs.id and " + tprefix + "indicators.id=" + str(
                        res["id"]) + " and t_id=" + str(vals[i][0]) + "and agregation) and pos=0"
                    cur.execute(req23)
                    vals23 = cur.fetchall()
                    if len(vals23) > 0:
                        for j in range(0, len(vals23)):
                            res["agregation_pkeys"] += [vals23[j][0]]

            req2 = "select name from " + prefix + "themes where id in (select t_id from " + prefix + "indicators_themes where i_id=" + str(val) + ")"
        else:
            req2 = "select id from " + prefix + "themes where id in (select t_id from " + prefix + "indicators_themes where i_id=" + str(val) + ")"
        cur.execute(req2)
        vals = cur.fetchall()
        res["indicators_themes"] = []
        if len(vals) > 0:
            for i in range(0, len(vals)):
                try:
                    res["indicators_themes"] += [str(vals[i][0].encode('utf-8')).decode('utf-8')]
                except:
                    res["indicators_themes"] += [str(vals[i][0])]
    else:
        tab0 = tab.split("_")
        suffix = " and (not(agregation) or agregation is null)"
        reqSuffix1 = " and step is null"
        if "tid" in inputs:
            suffix = " and t_id=" + inputs["tid"]["value"]
        if "step" in inputs:
            reqSuffix1 = " and step=" + inputs["step"]["value"]
        if tab == "graph":
            zoo.info("Load graph !!")
            req0 = "SELECT name, type, lx, vx, ly, vy, tooltip, id, formula,step from " + prefix + "graphs where it_id=(SELECT id from " + prefix + "indicators_territories where i_id=" + val + " " + suffix + ")" + reqSuffix1
            cur.execute(req0)
            vals = cur.fetchall()
            if len(vals) > 0:
                res["title"] = vals[0][0]
                res["type"] = vals[0][1]
                res["lx"] = vals[0][2]
                res["vx"] = vals[0][3]
                res["ly"] = vals[0][4]
                res["vy"] = vals[0][5]
                res["tooltip"] = vals[0][6]
                res["id"] = vals[0][7]
                res["formula"] = vals[0][8]
                res["step"] = vals[0][9]
        elif tab == "table":
            zoo.info("Load table !!")
            req0 = "SELECT name, id, order_by, step,(select t_id from " + prefix + "indicators_territories where i_id=" + val + " " + suffix + ") from " + prefix + "d_table where i_id=" + val + reqSuffix1
            zoo.info(req0 + " !!")

            cur.execute(req0)
            vals = cur.fetchall()
            if len(vals) > 0:
                res["title"] = vals[0][0]
                res["id"] = vals[0][1]
                res["order_by"] = vals[0][2]
                res["step"] = vals[0][3]
                res["t_id"] = vals[0][4]

                fields = ["id", "pos", "var", "label", "value", "display", "search", "width", "step"]
                myStr = ",".join(fields)
                req1 = "SELECT " + myStr + " from " + prefix + "dtable where it_id=(select id from " + prefix + "indicators_territories where i_id=" + val + " " + suffix + ")"
                cur.execute(req1)
                zoo.info(str(req1))
                vals1 = cur.fetchall()
                if len(vals1) > 0:
                    res["fields"] = []
                    for i in range(0, len(vals1)):
                        cobj = {}
                        for j in range(0, len(fields)):
                            cobj[fields[j]] = vals1[i][j]
                        res["fields"] += [cobj]

        elif tab0[0] == "agregation":
            zoo.info("Load agregate !!")
            req0 = "SELECT formula FROM " + prefix + "agregation where it_id=(SELECT id from " + prefix + "indicators_territories where i_id=" + val + suffix + " order by id limit 1) and t_id=" + tab0[1]
            zoo.info(req0 + " !!")

            cur.execute(req0)
            vals = cur.fetchall()
            if len(vals) > 0:
                res["formula"] = vals[0][0]
        elif tab0[0] == "repport":
            zoo.info("Load repport !!")
            req0 = "SELECT doc FROM " + prefix + "r_table where i_id=" + val + reqSuffix1
            zoo.info(req0 + " !!")

            cur.execute(req0)
            vals = cur.fetchall()
            if len(vals) > 0:
                res["doc"] = vals[0][0]
                res["docUrl"] = conf["main"]["publicationUrl"] + "/idx_templates/" + vals[0][0]
                outputs1 = {"Result": {"value": ""}}
                res0 = parseDocAttr(conf, {"template": {"value": res["doc"]}}, outputs1)
                import json
                res["docFields"] = json.loads(outputs1["Result"]["value"])
                fields = ["id", "var", "typ", "value", "display", "step"]
                myStr = ",".join(fields)
                req1 = "SELECT " + myStr + " from " + prefix + "rtable where it_id=(select id from " + prefix + "indicators_territories where i_id=" + val + " " + suffix + ")"
                cur.execute(req1)
                zoo.info(str(req1))
                vals1 = cur.fetchall()
                if len(vals1) > 0:
                    res["fields"] = []
                    for i in range(0, len(vals1)):
                        cobj = {}
                        for j in range(0, len(fields)):
                            cobj[fields[j]] = vals1[i][j]
                        res["fields"] += [cobj]

    return res


def getTableElements(conf, con, cur, res, att, tbl, col):
    import datastores.postgis.pgConnection as pg
    import json
    hasTheme = False
    try:
        if con.dbtype=="ODBC":
            req = "select *," + \
                    "displayname1 = " + \
                    "    CONCAT('[',STUFF((SELECT DISTINCT CONCAT(', ' , tid) " + \
                    "           FROM mm_tables.p_"+tbl+"_themes  " + \
                    "           where mm_tables.p_"+tbl+"s.id=mm_tables.p_"+tbl+"_themes."+ col + \
                    "           FOR XML PATH('')), 1, 2, ''),']'), " + \
                    "displayname2 = " + \
                    "   CONCAT('[', STUFF((SELECT DISTINCT CONCAT(', ' , gid) " + \
                    "           FROM mm_tables.p_"+tbl+"_groups  " + \
                    "      where mm_tables.p_"+tbl+"s.id=mm_tables.p_"+tbl+"_groups."+ col + \
                    "          FOR XML PATH('')), 1, 2, ''),']')" + \
                    "        from mm_tables.p_"+tbl+"s where ptid="+res["id"]+";"

        else:
            req = "select *,array(select tid from mm_tables.p_" + tbl + "_themes where mm_tables.p_" + tbl + "s.id=mm_tables.p_" + tbl + "_themes." + col + "),array(select gid from mm_tables.p_" + tbl + "_groups where mm_tables.p_" + tbl + "s.id=mm_tables.p_" + tbl + "_groups." + col + ") from mm_tables.p_" + tbl + "s where ptid=" + \
                res["id"] + ";"
        zoo.info(str(req))
        cur.execute(req)
        #con.conn.commit()
        hasTheme = True
    except:
        con.conn.commit()
        zoo.error(str(res))
        zoo.error(str(tbl))
        zoo.error(str(col))
        req = "select *,array((select gid from mm_tables.p_" + tbl + "_groups where mm_tables.p_" + tbl + "s.id=mm_tables.p_" + tbl + "_groups." + col + ")) from mm_tables.p_" + tbl + "s where ptid=" + res["id"] + ";"
        cur.execute(req)
        #con.conn.commit()
    res1 = cur.fetchall()
    res[att] = []
    for j in range(len(res1)):
        tmp = res1[j]
        outputs1 = {"Result": {}}
        tres1 = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.p_" + tbl + "_fields"}}, outputs1)
        tres1 = json.loads(outputs1["Result"]["value"])
        tres2 = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.p_" + tbl + "s"}}, outputs1)
        tres2 = json.loads(outputs1["Result"]["value"])
        req = "select * from mm_tables.p_" + tbl + "_fields where " + col + "=" + str(tmp[0]) + ";"
        cur.execute(req)
        values = []
        vals = cur.fetchall()
        values1 = {}
        zoo.info(str(tres1))
        zoo.info(str(tres2))
        for k in range(len(tres2)):
            zoo.info(tres2[k][2])
            if tres2[k][2] == "bytea" or tres2[k][2] == "varbinary":
                try:
                    obj = unpackFile(conf, tmp[k])
                    values1[tres2[k][1]] = obj["name"]
                except:
                    try:
                        values1[tres2[k][1]] = str(tmp[k].decode('utf-8'))
                    except:
                        try:
                            values1[tres2[k][1]] = str(tmp[k].replace("\\\\","\\"))
                            zoo.error(str(tmp[k].replace("\\\\","\\")))
                        except Exception as e:
                            values1[tres2[k][1]] = str(tmp[k])
            else:
                try:
                    values1[tres2[k][1]] = str(tmp[k].decode('utf-8'))
                except Exception as e:
                    try:
                        values1[tres2[k][1]] = str(tmp[k].replace("\\\\","\\"))
                        zoo.error(str(tmp[k].replace("\\\\","\\"))+"\n")
                    except Exception as e:
                        values1[tres2[k][1]] = str(tmp[k])
        if hasTheme:
            values1["themes"] = str(tmp[len(tres2)])
            if len(tmp)>len(tres2) + 1:
                values1["groups"] = str(tmp[len(tres2) + 1])
        else:
            values1["groups"] = str(tmp[len(tres2)])
        for l in range(len(vals)):
            lfields = {}
            for k in range(len(tres1)):
                try:
                    lfields[tres1[k][1]] = str(vals[l][k].decode('utf-8')).decode('utf-8')
                except:
                    try:
                        lfields[tres1[k][1]] = str(vals[l][k].replace("\\\\","\\"))
                    except:
                        lfields[tres1[k][1]] = str(vals[l][k])
            values += [lfields]
        res[att] += [{"fields": values, "view": values1}]


def details(conf, inputs, outputs):
    import json, time, os
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()
    res = None
    if inputs["table"]["value"] == "territories":
        res = detailsTerritoires(cur, inputs["id"]["value"], prefix)
    else:
        if inputs["table"]["value"] == "themes":
            res = detailsThemes(con, inputs["id"]["value"], prefix)
        if inputs["table"]["value"] == "indicators":
            if "tab" in inputs:
                res = detailsIndicateurs(conf, inputs, cur, inputs["id"]["value"], inputs["tab"]["value"], prefix)
                if "doc" in res:
                    res["doc_url"] = conf["main"]["publicationUrl"] + "/idx_templates/" + res["doc"]
            else:
                res = detailsIndicateurs(conf, inputs, cur, inputs["id"]["value"], "metadata", prefix)
                res["_graph"] = detailsIndicateurs(conf, inputs, cur, inputs["id"]["value"], "graph", prefix)
                res["_table"] = detailsIndicateurs(conf, inputs, cur, inputs["id"]["value"], "table", prefix)
                res["_repport"] = detailsIndicateurs(conf, inputs, cur, inputs["id"]["value"], "repport", prefix)
                try:
                    inputs0 = {
                        "prefix": {"value": "indexes"},
                        "name": {"value": "Index" + inputs["id"]["value"]},
                        "orig": {"value": conf["main"]["dbuserName"]},
                        "id": {"value": inputs["id"]["value"]}  # ,
                        # "layer": {"value":"indexes.view_idx"+inputs["id"]["value"]}*/
                    }
                    outputs0 = {
                        "Result": {"value": ""}
                    }
                    import mapfile.service as mapfile
                    mapfile.createLegend0(conf, inputs0, outputs0)
                    res["_style"] = json.loads(outputs0["Result"]["value"])
                except Exception as e:
                    zoo.error(" ********************************** ")
                    zoo.error(str(e))
                    zoo.error(" ********************************** ")
                    res["_style"] = {}
                try:
                    mpath = conf["main"]["dataPath"] + '/indexes_maps/project_PIndex' + str(res["id"]) + ".map"
                    open(mpath)
                    res["published"] = "true"
                    import locale
                    oloc = locale.setlocale(locale.LC_ALL, None)
                    zoo.info(conf["main"]["language"])
                    locale.setlocale(locale.LC_ALL, conf["main"]["language"].replace("-", "_") + ".utf-8")
                    res["pdate"] = str(time.strftime(conf["mm"]["dateFormat"], time.localtime(os.path.getmtime(mpath))).decode('utf-8'))
                    import mapscript
                    m = mapscript.mapObj(mpath)
                    res["cache_file"] = m.web.metadata.get('cache_file')
                except IOError:
                    res["published"] = "false"
            conf["senv"]["last_index"] = inputs["id"]["value"]
        if inputs["table"]["value"] == "documents":
            zoo.info("*** OK TREAT DOCUMENTS !!")
            res = detailsDocuments(con, inputs["id"]["value"], prefix)
        if inputs["table"]["value"].count("."):
            import datastores.postgis.pgConnection as pg
            outputs0 = [{"Result": {"value": ""}}, {"Result": {"value": ""}}, {"Result": {"value": ""}}, {"Result": {"value": ""}}, {"Result": {"value": ""}}]
            tres = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": inputs["table"], "clause": {"value": "id='" + inputs["id"]["value"] + "'"}}, outputs0[0])
            zoo.info("TableDescription")
            zoo.info(outputs0[0]["Result"]["value"])
            outputs1 = [{"Result": {"value": ""}}]
            tres = pg.getTableContent(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": inputs["table"], "clause": {"value": "id='" + inputs["id"]["value"] + "'"}}, outputs0[1])
            zoo.info("TableContent")
            zoo.info(outputs0[1]["Result"]["value"])
            desc = json.loads(outputs0[0]["Result"]["value"])
            content = json.loads(outputs0[1]["Result"]["value"])
            res = {}
            zoo.info(outputs0[1]["Result"]["value"])
            for i in range(0, len(desc)):
                zoo.info(desc[i][1])
                zoo.info(content)
                res[str(desc[i][1])] = content["rows"][0]["cell"][i]
                zoo.info(desc[i][1])
            if inputs["table"]["value"] == '"mm_tables"."importers"':

                req = "select template,ARRAY((select tid from mm_tables.importer_themes where mm_tables.importers.id=mm_tables.importer_themes.iid)),ARRAY((select gid from mm_tables.importer_groups where mm_tables.importers.id=mm_tables.importer_groups.iid)),tid from mm_tables.importers where id=" + res["id"] + ";"
                zoo.info(" --------- " + str(req) + " --------- ")
                cur.execute(req)
                res1 = cur.fetchall()
                for j in range(len(res1)):
                    res["tid"] = res1[j][3]
                    try:
                        lfile = unpackFile(conf, res1[j][0])
                        tmp = lfile["name"].split("/")
                        res["template_name"] = tmp[len(tmp) - 1]
                        res["otemplate"] = lfile["name"]
                        conf["senv"]["last_file"] = lfile["name"]
                        res["template"] = lfile["name"].replace(conf["main"]["tmpPath"], conf["main"]["tmpUrl"])
                    except:
                        continue
                    res["themes"] = res1[j][1]
                    res["groups"] = res1[j][2]
                tres = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.pages"}, "clause": {"value": "iid='" + res["id"] + "'"}}, outputs0[2])
                ldesc = json.loads(outputs0[2]["Result"]["value"])

                req = "select * from mm_tables.pages where iid=" + res["id"] + ";"
                cur.execute(req)
                res1 = cur.fetchall()
                res["pages"] = {}
                lres = []
                for j in range(len(res1)):
                    lobj = {}
                    for l in range(0, len(ldesc)):
                        lobj[str(ldesc[l][1])] = res1[j][l]

                    tres = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.page_fields"}, "clause": {"value": "pid='" + str(res1[j][0]) + "'"}}, outputs0[3])
                    zoo.info("******** -- " + str(outputs0[3]) + " -- **************")
                    ldesc1 = json.loads(outputs0[3]["Result"]["value"])
                    req = "select * from mm_tables.page_fields where pid=" + str(res1[j][0]) + ";"
                    zoo.info("******** -- " + str(req) + " -- **************")
                    cur.execute(req)
                    res2 = cur.fetchall()
                    lfields = []
                    for k in range(len(res2)):
                        lobj1 = {}
                        for l in range(0, len(ldesc1)):
                            lobj1[str(ldesc1[l][1])] = res2[k][l]
                        lfields += [lobj1]

                    lobj["fields"] = lfields

                    tres = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.page_geom"}, "clause": {"value": "pid='" + str(res1[j][0]) + "'"}}, outputs0[3])
                    zoo.info("******** -- " + str(outputs0[3]) + " -- **************")
                    ldesc2 = json.loads(outputs0[3]["Result"]["value"])
                    req = "select * from mm_tables.page_geom where pid=" + str(res1[j][0]) + ";"
                    zoo.info("******** -- " + str(req) + " -- **************")
                    cur.execute(req)
                    res3 = cur.fetchall()
                    zoo.info("******** -- " + str(res3) + " -- **************")
                    lfields = []
                    for k in range(len(res3)):
                        lobj1 = {}
                        for l in range(0, len(ldesc2)):
                            lobj1[str(ldesc2[l][1]).decode("utf-8")] = res3[k][l]
                        lfields += [lobj1]
                        tres = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.page_geom_fields"}, "clause": {"value": "pid='" + str(res3[k][0]) + "'"}}, outputs0[4])
                        ldesc3 = json.loads(outputs0[4]["Result"]["value"])
                        req = "select * from mm_tables.page_geom_fields where pid=" + str(res3[k][0]) + ";"
                        zoo.info(str(req))
                        cur.execute(req)
                        res4 = cur.fetchall()
                        lfields1 = []
                        for kk in range(len(res4)):
                            lobj2 = {}
                            for l in range(0, len(ldesc3)):
                                lobj2[str(ldesc3[l][1]).decode("utf-8")] = res4[kk][l]
                            lfields1 += [lobj2]
                        lfields[len(lfields) - 1]["fields"] = lfields1
                    lobj["georef"] = lfields

                    res["pages"][lobj["name"]] = lobj

            if inputs["table"]["value"] == '"mm_tables"."p_tables"':
                getTableElements(conf, con, cur, res, "mmEdits", "edition", "eid")
                zoo.info("************* REPORTS *****\n")
                getTableElements(conf, con, cur, res, "mmReports", "report", "rid")
                tres = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": res["name"]}}, outputs0[2])
                if con.dbtype=="ODBC":
                    req = "select *," + \
                            " displayname1 = " + \
                            " CONCAT('[',STUFF((SELECT DISTINCT CONCAT(', ' , tid)" + \
                            "        FROM mm_tables.p_view_themes " + \
                            "      where mm_tables.p_views.id=mm_tables.p_view_themes.vid " + \
                            "          FOR XML PATH('')), 1, 2, ''),']')," + \
                            "displayname2 =  " + \
                            "    CONCAT('[',STUFF((SELECT DISTINCT CONCAT(', ' , gid) " + \
                            "           FROM mm_tables.p_view_groups  " + \
                            "      where mm_tables.p_views.id=mm_tables.p_view_groups.vid " + \
                            "          FOR XML PATH('')), 1, 2, ''),']') " + \
                            "from mm_tables.p_views where ptid=" + res["id"] + ";"
                else:
                    req = "select *,ARRAY(select tid from mm_tables.p_view_themes where mm_tables.p_views.id=mm_tables.p_view_themes.vid),ARRAY(select gid from mm_tables.p_view_groups where mm_tables.p_views.id=mm_tables.p_view_groups.vid) from mm_tables.p_views where ptid=" + res["id"] + ";"
                cur.execute(req)
                res1 = cur.fetchall()
                res["mmViews"] = []
                for j in range(len(res1)):
                    tmp = res1[j]
                    outputs1 = {"Result": {}}
                    tres1 = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.p_view_fields"}}, outputs1)
                    tres1 = json.loads(outputs1["Result"]["value"])
                    tres2 = pg.getTableDescription(conf, {"dataStore": {"value": conf["main"]["dbuserName"]}, "table": {"value": "mm_tables.p_views"}}, outputs1)
                    tres2 = json.loads(outputs1["Result"]["value"])
                    req = "select * from mm_tables.p_view_fields where vid=" + str(tmp[0]) + ";"
                    cur.execute(req)
                    values = []
                    vals = cur.fetchall()
                    values1 = {}
                    zoo.info(str(tres1))
                    for k in range(len(tres2)):
                        try:
                            values1[tres2[k][1]] = str(tmp[k].decode('utf-8'))
                        except:
                            values1[tres2[k][1]] = str(tmp[k])
                    values1["themes"] = str(tmp[len(tres2)])
                    values1["groups"] = str(tmp[len(tres2) + 1])
                    for l in range(len(vals)):
                        lfields = {}
                        for k in range(len(tres1)):
                            try:
                                lfields[tres1[k][1]] = str(vals[l][k].decode('utf-8'))
                            except:
                                lfields[tres1[k][1]] = str(vals[l][k])
                        values += [lfields]
                    res["mmViews"] += [{"fields": values, "view": values1}]
                res["mmDesc"] = json.loads(outputs0[2]["Result"]["value"])
    if "file_link" in res:
        conf["senv"]["last_file"] = res["file_link"]
    if res is not None:
        zoo.info(str(res))
        # outputs["Result"]["value"]=json.dumps(res,ensure_ascii=False).encode('utf-8')
        outputs["Result"]["value"] = json.dumps(res)
    else:
        conf["lenv"]["message"] = "Unable to access table"
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED


def csv2ods(conf, inputs, outputs):
    try:
        f = open(conf["main"]["tmpPath"] + "/" + inputs["file"]["value"] + ".csv")
        ivalues = f.read()
        ivalues = ivalues.split("\n")
        values = []
        script = "# -*- coding: utf-8 -*-\nimport print.PaperMint as PaperMint\n"
        script += "pm=PaperMint.LOClient()\n"
        for i in range(len(ivalues)):
            values += [ivalues[i].split(",")]
        import json, os
        options = ""
        for i in range(0, len(values[0])):
            if options != "":
                options += "/"
            options += "2"
        options = "9/44,39,76,1," + options
        script += 'pm.csv2ods1("' + conf["main"]["tmpPath"] + "/" + inputs["file"]["value"] + '.csv","' + conf["main"]["tmpPath"] + "/" + inputs["file"]["value"] + '.ods",' + json.dumps(options) + ')\nimport sys\nprint("quit",file=sys.stderr)\nsys.exit(0)\n'
        from subprocess import Popen, PIPE
        err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'w', 0)
        # os.dup2(err_log.fileno(), sys.stderr.fileno())
        process = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)
        process.stdin.write(script)
        process.stdin.close()
        process.wait()
        # sys.stderr.flush()
        # sys.stderr.close()
        conf["lenv"]["message"] = str(process.stdout.readline())
        outputs["Result"]["value"] = conf["main"]["tmpUrl"] + inputs["file"]["value"] + '.ods'
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = e
        return zoo.SERVICE_FAILED


def previewDoc(conf, inputs, outputs):
    import json, os
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()

    tablePrefix = "indexes.view_idx"
    table1Prefix = "indexes.view_idx_"
    graphPrefix = "indexes.view_idx_g_"
    graphSuffix = ""
    if "step" in inputs:
        graphSuffix = "_" + inputs["step"]["value"]
    if "tid" in inputs:
        tablePrefix = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_"
        table1Prefix = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_"
        graphPrefix = "indexes.view_idx_g_"
        graphSuffix = "_t_" + inputs["tid"]["value"]
    _oid = "(SELECT max(ogc_fid) from " + tablePrefix + inputs["id"]["value"] + ")"
    oid = "(select wkb_geometry from " + tablePrefix + inputs["id"]["value"] + " where ogc_fid=" + _oid + ")"
    all_ids = "(SELECT ogc_fid FROM " + tablePrefix + inputs["id"]["value"] + " WHERE ST_Touches(wkb_geometry," + oid + "))"
    req = "SELECT * FROM " + graphPrefix + inputs["id"]["value"] + graphSuffix + " WHERE ogc_fid=" + _oid + " OR ogc_fid in " + all_ids
    req1 = "SELECT * FROM " + table1Prefix + inputs["id"]["value"] + " WHERE ogc_fid=" + _oid + " OR ogc_fid in " + all_ids
    if "step" in inputs:
        if "tid" in inputs:
            req1 = "SELECT * FROM " + table1Prefix + inputs["id"]["value"] + "_step" + inputs["step"]["value"] + " WHERE ogc_fid=" + _oid + " OR ogc_fid in " + all_ids
        else:
            req1 = "SELECT * FROM " + table1Prefix + inputs["id"]["value"] + "_" + inputs["step"]["value"] + " WHERE ogc_fid=" + _oid + " OR ogc_fid in " + all_ids
    zoo.info(str(req1))
    res = cur.execute(req)
    vals = cur.fetchall()
    rvals = [[""], [], []]
    for i in range(0, len(vals)):
        rvals[1] += [vals[i][2].replace("\\","")]
        rvals[2] += [[vals[i][3].replace("\\","")]]
    fields = []
    # Load the map
    import mapscript
    mapfile = conf["main"]["dataPath"] + "/indexes_maps/project_Index" + inputs["id"]["value"] + ".map"
    if "step" in inputs:
        mapfile = conf["main"]["dataPath"] + "/indexes_maps/timeline_Index" + inputs["id"]["value"] + "_indexes_view_idx" + inputs["id"]["value"] + "_step" + inputs["step"]["value"] + ".map"
    zoo.info(str(mapfile))
    m = mapscript.mapObj(mapfile)
    zoo.info(str(mapfile))
    for i in range(m.numlayers):
        m.getLayer(i).status = mapscript.MS_ON
    m.setProjection("init=epsg:900913")
    req = "SELECT * FROM (SELECT st_xmin(wkb_geometry)||' '||st_ymin(wkb_geometry)||' '||st_xmax(wkb_geometry)||' '||st_ymax(wkb_geometry) as wkb_geometry FROM (SELECT ST_Transform(ST_Union(wkb_geometry),900913) as wkb_geometry FROM " + table1Prefix + inputs["id"][
        "value"] + " WHERE ogc_fid=" + _oid + " OR ogc_fid in " + all_ids + ") as foo) As foo1"
    res = cur.execute(req)
    vals0 = cur.fetchall()
    zoo.info(str(vals0))
    ext = vals0[0][0].split(' ')
    m.setExtent(float(ext[0]), float(ext[1]), float(ext[2]), float(ext[3]))
    m.setSize(1024 * 3, 768 * 3)
    zoo.info(str(req1))
    m.getLayer(0).data = req1
    for i in range(0, m.getLayer(0).numclasses):
        m.getLayer(0).getClass(i).getStyle(0).updateFromString("STYLE OUTLINECOLOR 255 0 0 WIDTH 1.2 END")
    i = m.draw()
    import time
    savedImage = conf["main"]["tmpPath"] + "/print_" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + ".png"
    try:
        os.unlink(savedImage)
    except:
        pass
    i.save(savedImage)

    zoo.error(str(vals0))
    inputs0 = inputs
    outputs0 = {"Result": {"value": ""}}
    getIndexDisplayJs(conf, inputs, outputs0)
    zoo.error(str(outputs0))
    tmp = json.loads(outputs0["Result"]["value"]);
    tmp = tmp["values"]
    lfields = []
    for i in range(0, len(tmp)):
        lfields += [tmp[i]["display"]]
        if i == 0:
            inputs0["sortname"] = {"value": tmp[0]["name"]}
    inputs0["sortorder"] = {"value": "asc"}
    inputs0["limit"] = {"value": "10"}
    inputs0["page"] = {"value": "1"}
    inputs0["_id"] = {"value": "ogc_fid=" + _oid + " OR ogc_fid in " + all_ids}
    zoo.info(str(inputs0))
    tvals = _getIndexValues(conf, inputs0, fields)
    zoo.info(str(tvals))
    from subprocess import Popen, PIPE
    if "oo" in conf and "external" in conf["oo"] and conf["oo"]["external"] == "true":
        sys.stderr.flush()
        err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'w', 0)
        os.dup2(err_log.fileno(), sys.stderr.fileno())
        process = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)
        script = "import print.PaperMint as PaperMint\n"
        script += "pm=PaperMint.LOClient()\n"
        script += "pm.loadDoc('" + conf["main"]["publicationPath"] + "/idx_templates/" + inputs["oDoc"]["value"] + "')\n"
        # print("fields: \n"+json.dumps([lfields]+tvals[1]), file=sys.stderr)
        script += "pm.addTable(\"[_table_]\"," + json.dumps([lfields] + tvals[1]) + ")\n"
        script += 'pm.searchAndReplaceImage("[_map_]","' + savedImage + '")\n'
        script += "pm.statThis(\"[_diag_]\"," + json.dumps(rvals).replace("\\","") + ")\n"

        reqSuffix = ""
        if "tid" in inputs:
            reqSuffix += " and agregation and t_id=" + inputs["tid"]["value"]
        else:
            reqSuffix += " and (not(agregation) or agregation is null)"

        reqSuffix1 = ""
        if "step" in inputs:
            reqSuffix1 += " and step=" + inputs["step"]["value"]
        else:
            reqSuffix1 += " and step is null"
        req = "select var,value from rtable where it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ") " + reqSuffix1 + " and typ=0"

        res = cur.execute(req)
        vals1 = cur.fetchall()
        for i in range(0, len(vals1)):
            req0 = ("select ").decode("utf-8") + vals1[i][1] + (" as ").decode("utf-8") + vals1[i][0] + (" from " + tablePrefix + inputs["id"]["value"] + " WHERE ogc_fid=" + _oid).decode("utf-8")
            zoo.info(req0.decode('utf-8'))
            cur.execute(req0)
            vals2 = cur.fetchone()
            script += "pm.searchAndReplace('[_" + vals1[i][0] + "_]'," + json.dumps(vals2[0]) + ")\n"

        req1 = "select var,value from rtable where it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ") " + reqSuffix1 + " and typ=6"
        res1 = cur.execute(req1)
        vals2 = cur.fetchall()
        for i in range(0, len(vals2)):
            req0 = "SELECT sources FROM " + tprefix + "indicators WHERE id=" + inputs["id"]["value"]
            zoo.info(req0.decode('utf-8'))
            cur.execute(req0)
            vals3 = cur.fetchone()
            if vals3[0] is not None:
                script += "pm.searchAndReplace('[_" + vals2[i][0] + "_]'," + json.dumps(vals3[0]) + ")\n"
            else:
                script += "pm.searchAndReplace('[_" + vals2[i][0] + "_]','')\n"

        docPath = conf["main"]["tmpPath"] + "/preview_tmp_" + conf["senv"]["MMID"] + ".pdf"
        script += "pm.saveDoc('" + docPath + "')\n"
        docPath = conf["main"]["tmpPath"] + "/preview_tmp_" + conf["senv"]["MMID"] + ".odt"
        script += "pm.saveDoc('" + docPath + "')\n"
        docPath = conf["main"]["tmpPath"] + "/preview_tmp_" + conf["senv"]["MMID"] + ".pdf"
        script += "pm.saveDoc('" + docPath + "')\n"
        script += "pm.unloadDoc('" + conf["main"]["publicationPath"] + "/idx_templates/" + inputs["oDoc"]["value"] + "')\n"
        process.stdin.write(script)
        process.stdin.close()
        conf["lenv"]["message"] = str(process.stdout.readline())
        sys.stderr.flush()
        sys.stderr.close()
        err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'r', 0)
        conf["lenv"]["message"] += str(err_log.read())
    try:
        outputs["Result"]["value"] = open(docPath, "r").read()
        import os
        os.unlink(docPath)
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] += str(e)
        pass
    return zoo.SERVICE_FAILED


def addLayerForIndex(conf, inputs, outputs):
    import mapscript
    lName = "indexes.view_idx" + inputs["id"]["value"]
    reqSuffix = " and (not(agregation) or agregation is null)"
    if "tid" in inputs:
        lName = "indexes.agregate_t" + inputs["tid"]["value"] + "_idx_" + inputs["id"]["value"]
        reqSuffix = " and (agregation and t_id = " + inputs["tid"]["value"] + ")"
    if "step" in inputs:
        lName += "_step" + inputs["step"]["value"]
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/PostGIS/" + conf["main"]["dbuserName"] + "ds_ows.map")
    if m.getLayerByName(lName) is not None:
        m.removeLayer(m.getLayerByName(lName).index)
    zoo.info(dir(m))
    zoo.info(lName)
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()
    cur.execute("select datasource from " + prefix + "territories where id in (select t_id from " + prefix + "indicators_territories where i_id=" + inputs["id"]["value"] + reqSuffix + ")")
    vals = cur.fetchone()
    l = m.getLayerByName(vals[0].replace("public.", ""))
    zoo.info(dir(l))
    l1 = l.clone()
    zoo.info(dir(l1))
    l1.name = lName
    l1.data = lName
    zoo.info(m.insertLayer(l1))
    m.save(conf["main"]["dataPath"] + "/PostGIS/" + conf["main"]["dbuserName"] + "ds_ows.map")
    outputs["Result"]["value"] = "The mapfile was successfully updated"
    zoo.info(outputs["Result"]["value"])
    return zoo.SERVICE_SUCCEEDED


def printOdt(conf, script, process, idx, id, cid, f_out, typ=None, tid=None, step=None):
    import json, os, shutil
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()

    tablePrefix = "indexes.view_idx"
    table1Prefix = "indexes.view_idx_"
    graphPrefix = "indexes.view_idx_g_"
    graphSuffix = ""

    if tid is not None:
        tablePrefix = "indexes.agregate_t" + str(tid) + "_idx_"
        table1Prefix = "indexes.agregate_t" + str(tid) + "_idx_"
        graphPrefix = "indexes.view_idx_g_"
        graphSuffix = "_t_" + str(tid)
    if step is not None:
        graphSuffix = "_" + str(step)

    _oid = str(id)
    oid = "(select wkb_geometry from " + tablePrefix + idx + " where ogc_fid=" + _oid + ")"
    all_ids = "(" + cid + ")"
    req0 = "SELECT * FROM " + graphPrefix + idx + graphSuffix + " WHERE ogc_fid in " + all_ids
    req1 = "SELECT * FROM " + table1Prefix + idx + " WHERE ogc_fid in " + all_ids

    if step is not None:
        if tid is not None:
            req1 = "SELECT * FROM " + table1Prefix + idx + "_step" + str(step) + " WHERE ogc_fid in " + all_ids
        else:
            req1 = "SELECT * FROM " + table1Prefix + idx + "_" + str(step) + " WHERE ogc_fid in " + all_ids

    zoo.info(str(req1))
    zoo.info(str(req0))
    res = cur.execute(req0)
    vals = cur.fetchall()
    rvals = [[""], [], []]
    for i in range(0, len(vals)):
        rvals[1] += [vals[i][2]]
        rvals[2] += [[vals[i][3]]]
    fields = []
    # Load the map
    import mapscript
    mapfile = conf["main"]["dataPath"] + "/indexes_maps/project_PIndex" + idx + ".map"
    if tid is not None:
        mapfile = conf["main"]["dataPath"] + "/indexes_maps/project_A" + str(tid) + "_PIndex" + idx + ".map"
    if step is not None:
        mapfile = conf["main"]["dataPath"] + "/indexes_maps/timeline_PIndex" + idx + "_indexes_view_idx" + idx + "_step" + str(step) + ".map"
    m = mapscript.mapObj(mapfile)
    for i in range(m.numlayers):
        m.getLayer(i).status = mapscript.MS_ON
    m.setProjection("init=epsg:900913")
    req = "SELECT * FROM (SELECT st_xmin(wkb_geometry)||' '||st_ymin(wkb_geometry)||' '||st_xmax(wkb_geometry)||' '||st_ymax(wkb_geometry) as wkb_geometry FROM (SELECT ST_Transform(ST_Union(wkb_geometry),900913) as wkb_geometry FROM " + table1Prefix + idx + " WHERE ogc_fid in " + all_ids + ") as foo) As foo1"
    res = cur.execute(req)
    vals0 = cur.fetchall()
    zoo.info(str(vals0))
    ext = vals0[0][0].split(' ')
    m.setExtent(float(ext[0]), float(ext[1]), float(ext[2]), float(ext[3]))
    m.setSize(1024 * 1.5, 768 * 1.5)
    zoo.info(str(req1))
    m.getLayer(0).data = req1
    mLocation = m.clone()
    zoo.info("*************************")
    zoo.info(str(mLocation))
    zoo.info("*************************")
    coeff = 1;
    size = (1024 * coeff, 768 * coeff)
    import math
    n0 = math.log((((20037508.34 * 2) * size[0]) / (256 * (float(ext[2]) - float(ext[0])))), 2)
    m0 = math.log(((20037508.34 * size[1]) / (256 * (float(ext[3]) - float(ext[1])))), 2)
    if n0 > m0:
        zl = int(n0)
    else:
        zl = int(m0)
    import pp.service as p
    p.addBgLayer(conf, m, size, zl, ext)
    mmClasses = [["Classes"], [], []]

    reqSuffix = ""
    if tid is not None:
        reqSuffix += " and agregation and t_id=" + str(tid)
    else:
        reqSuffix += " and (not(agregation) or agregation is null)"

    lreq0 = "SELECT value from rtable where var='classes' and it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + idx + reqSuffix + ")"
    zoo.info(lreq0 + "\n\n*******")
    cur.execute(lreq0)
    lvals0 = cur.fetchone()
    if lvals0 is not None:
        lvals0 = lvals0[0]
    else:
        lvals0 = ""
    zoo.info(str(lvals0))
    zoo.info("\n\n*******")
    mmName = m.getLayer(0).metadata.get("mmName")
    for i in range(0, m.getLayer(0).numclasses):
        m.getLayer(0).getClass(i).getStyle(0).updateFromString("STYLE OUTLINECOLOR 255 255 255 WIDTH 1.2 END")
        lreq = "SELECT COUNT(*) FROM (" + req1 + ") as foo WHERE " + m.getLayer(0).getClass(i).getExpressionString().replace("[", '"').replace("]", '"' + lvals0)
        zoo.info(lreq + "\n\n*******")
        cur.execute(lreq)
        lvals = cur.fetchone()
        mmClasses[1] += [m.getLayer(0).getClass(i).name]
        mmClasses[2] += [[str(lvals[0])]]
    zoo.info(str(mmClasses))

    i = m.draw()
    import time
    savedImage = conf["main"]["tmpPath"] + "/print_" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + ".png"
    try:
        os.unlink(savedImage)
    except:
        pass
    i.save(savedImage)

    zoo.error(str(vals0))
    if tid is not None:
        inputs0 = {"id": {"value": idx}, "tid": {"value": tid}}
    else:
        inputs0 = {"id": {"value": idx}}
    if step is not None:
        inputs0["step"] = {"value": step}
    outputs0 = {"Result": {"value": ""}}
    getIndexDisplayJs(conf, inputs0, outputs0)
    zoo.info(outputs0["Result"]["value"])
    tmp = json.loads(outputs0["Result"]["value"])
    lfields = []
    tmp = tmp["values"]
    zoo.info(str(tmp))
    for i in range(0, len(tmp)):
        lfields += [tmp[i]["display"]]
    inputs0["sortname"] = {"value": tmp[0]["name"]}
    inputs0["sortorder"] = {"value": "asc"}
    inputs0["limit"] = {"value": "10"}
    inputs0["page"] = {"value": "1"}
    inputs0["_id"] = {"value": "ogc_fid in " + all_ids}
    tvals = _getIndexValues(conf, inputs0, fields)

    if "oo" in conf and "external" in conf["oo"] and conf["oo"]["external"] == "true":
        # script+="pm.loadDoc('"+conf["main"]["publicationPath"]+"/idx_templates/"+inputs["oDoc"]["value"]+"')\n"
        rreq = "select doc from " + prefix + "r_table where i_id=" + idx
        cur.execute(rreq)
        rvals0 = cur.fetchone()
        if rvals0 is not None:
            docPath = conf["main"]["publicationPath"] + "/idx_templates/" + rvals0[0]
        else:
            rreq = "select count(*) from graphs where type='hist' and it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + idx + reqSuffix + ")"
            cur.execute(rreq)
            rvals0 = cur.fetchone()
            if rvals0[0] > 0:
                docPath = conf["main"]["publicationPath"] + "/idx_templates/default_hist.odt"
            else:
                docPath = conf["main"]["publicationPath"] + "/idx_templates/default_circ.odt"
        shutil.copy(docPath, docPath.replace(".odt", "_" + _oid + "_init.odt").replace(conf["main"]["publicationPath"] + "/idx_templates/", conf["main"]["tmpPath"] + "/"))
        docPath = docPath.replace(".odt", "_" + _oid + "_init.odt").replace(conf["main"]["publicationPath"] + "/idx_templates/", conf["main"]["tmpPath"] + "/")
        script += "pm.loadDoc('" + docPath + "')\n"
        saveDocPath = docPath
        if typ is None:
            script += "pm.addTable(\"[_table_]\"," + json.dumps([lfields] + tvals[1]) + ")\n"
            script += 'pm.searchAndReplaceImage("[_map_]","' + savedImage + '")\n'
            script += "pm.statThis(\"[_diag_]\"," + json.dumps(rvals) + ")\n"
        else:
            script += "pm.exportStatAsImage(\"diag\",\"[_diag_]\"," + json.dumps(rvals) + ")\n"

        outputs1 = {"Result": {"value": ""}}
        zoo.info("parseDocAttr " + saveDocPath)
        if typ is None:
            res = parseDocAttr(conf, {"fullpath": {"value": "true"}, "template": {"value": saveDocPath}}, outputs1)
            tmp = json.loads(outputs1["Result"]["value"])
            for i in tmp:
                if i == "classes":
                    script += "pm.statThis(\"[_classes_]\"," + json.dumps(mmClasses) + ")\n"
                else:
                    if i not in ["table", "diag", "map"]:
                        req = "select value,typ from rtable where it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + idx + reqSuffix + ") and step is null and var='" + i + "'"
                        cur.execute(req)
                        lvals = cur.fetchone()
                        if lvals is not None:
                            if lvals[1] == 0:
                                req0 = lvals[0].decode('utf-8')
                                zoo.info(str(req0))
                                try:
                                    con.conn.commit()
                                    cur.execute(req0)
                                    lvals1 = cur.fetchone()
                                except:
                                    con.conn.commit()
                                    lvals1 = [lvals[0].decode('utf-8')]
                                if lvals1 is not None:
                                    script += "pm.searchAndReplace('[_" + i + "_]'," + json.dumps(lvals1[0]) + ")\n"
                                else:
                                    script += "pm.searchAndReplace('[_" + i + "_]','')\n"
                            if lvals[1] == 3:
                                req0 = lvals[0].replace("[_X_]", mmName).replace("[_T_]", tablePrefix + idx).replace("[_F_in_]", all_ids).replace("[_F_out_]", f_out)
                                zoo.info(str(req0))
                                cur.execute(req0)
                                lvals1 = cur.fetchall()
                                if lvals1 is not None:
                                    script += "pm.addTable(\"[_" + i + "_]\"," + json.dumps(lvals1).replace("null", zoo._("None")) + ")\n"
                            if lvals[1] == 4:
                                req0 = lvals[0].replace("[_X_]", mmName).replace("[_T_]", tablePrefix + idx).replace("[_F_in_]", all_ids).replace("[_F_out_]", f_out)
                                zoo.info(str(req0))
                                zoo.info(str(i))
                                cur.execute(req0)
                                lvals1 = cur.fetchall()
                                if lvals1 is not None:
                                    script += "pm.statThis(\"[_" + i + "_]\"," + json.dumps(lvals1).replace("null", zoo._("None")).replace("\\","") + ")\n"
                            if lvals[1] == 5:
                                req0 = "SELECT description FROM " + tprefix + "indicators WHERE id=" + idx
                                cur.execute(req0)
                                lvals1 = cur.fetchone()
                                if lvals1 is not None and lvals1[0] is not None:
                                    fname = conf["main"]["tmpPath"] + "/tmp_" + conf["senv"]["MMID"] + ".html"
                                    f = open(fname, "wb")
                                    f.write(lvals1[0])
                                    f.close()
                                    script += "pm.goToWord('[_" + i + "_]');"
                                    script += "pm.insertDoc(\"" + fname + "\")\n"
                                    script += "pm.searchAndReplace('[_" + i + "_]',\"\")\n"
                                else:
                                    script += "pm.searchAndReplace('[_" + i + "_]',\"\")\n"
                            if lvals[1] == 6:
                                req0 = "SELECT sources FROM " + tprefix + "indicators WHERE id=" + idx
                                zoo.info(str(req0))
                                cur.execute(req0)
                                lvals1 = cur.fetchone()
                                if lvals1 is not None and lvals1[0] is not None:
                                    script += "pm.searchAndReplace('[_" + i + "_]'," + json.dumps(lvals1[0]) + ")\n"
                                else:
                                    script += "pm.searchAndReplace('[_" + i + "_]',\"\")\n"
                            if lvals[1] == 7:
                                l0 = mLocation.getLayer(0)
                                req2 = "SELECT * FROM " + table1Prefix + idx + " WHERE ogc_fid in " + all_ids
                                l0.data = req2
                                for ij in range(1, l0.numclasses):
                                    l0.removeClass(1)
                                l0.getClass(0).removeStyle(0)
                                l0.getClass(0).updateFromString("CLASS STYLE OPACITY 25 COLOR 255 0 0 OUTLINECOLOR 255 255 255 WIDTH 1.2 END END")
                                l0.getClass(0).setExpression(None)
                                l1 = l0.clone()
                                req = "SELECT datasource FROM territories where id = (SELECT t_id from " + tprefix + "indicators_territories where i_id=" + idx + reqSuffix + ")"
                                zoo.info(str(req))
                                cur.execute(req)
                                vals = cur.fetchone()
                                req11 = "SELECT ogc_fid FROM " + vals[0] + " WHERE " + f_out
                                req3 = "SELECT * FROM " + table1Prefix + idx + " WHERE ogc_fid in (" + req11 + ")"
                                l1.getClass(0).removeStyle(0)
                                l1.getClass(0).updateFromString("CLASS STYLE OPACITY 25 COLOR 0 0 255 OUTLINECOLOR 255 255 255 WIDTH 1.2 END END")
                                l1.data = req3
                                l1.name += "_Compare"
                                l0.status = mapscript.MS_ON
                                l1.status = mapscript.MS_ON
                                mLocation.insertLayer(l1)
                                req = "SELECT * FROM (SELECT st_xmin(wkb_geometry),st_ymin(wkb_geometry),st_xmax(wkb_geometry),st_ymax(wkb_geometry) FROM (SELECT ST_Transform(ST_Union(wkb_geometry),900913) as wkb_geometry FROM " + table1Prefix + idx + " WHERE ogc_fid in (" + req11 + ") OR ogc_fid in " + all_ids + " ) as foo) As foo1"
                                zoo.info(str(req))
                                res = cur.execute(req)
                                vals0 = cur.fetchone()
                                mLocation.setExtent(vals0[0], vals0[1], vals0[2], vals0[3])
                                ext = (vals0[0], vals0[1], vals0[2], vals0[3])
                                mLocation.save("/tmp/demo.map")
                                coeff = 1;
                                size = (1024 * coeff, 768 * coeff)
                                import math
                                n0 = math.log((((20037508.34 * 2) * size[0]) / (256 * (float(ext[2]) - float(ext[0])))), 2)
                                m0 = math.log(((20037508.34 * size[1]) / (256 * (float(ext[3]) - float(ext[1])))), 2)
                                if n0 > m0:
                                    zl = int(n0)
                                else:
                                    zl = int(m0)
                                import pp.service as p
                                p.addBgLayer(conf, mLocation, size, zl, ext)

                                im = mLocation.draw()
                                savedImage = conf["main"]["tmpPath"] + "/print_" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + ".png"
                                try:
                                    os.unlink(savedImage)
                                except:
                                    pass
                                im.save(savedImage)
                                script += 'pm.searchAndReplaceImage("[_' + i + '_]","' + savedImage + '")\n'

        # rreq="select doc from rtable where i_id="+idx
        zoo.info(str(tmp))
        zoo.info("\n\n--------------")

        req = "select var,value from rtable where it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + idx + reqSuffix + ") and step is null and typ=0"
        # if "step" in inputs.keys():
        #    req="select var,value from rtable where it_id=(SELECT id from "+tprefix+"indicators_territories where i_id="+idx+reqSuffix+") and step = "+inputs["step"]["value"]+" and typ=0"
        res = cur.execute(req)
        saveReq = req
        vals1 = cur.fetchall()
        # for i in range(0,len(vals1)):
        #    req0=("select ").encode("utf-8")+vals1[i][1]+(" as ").encode("utf-8")+vals1[i][0]+(" from "+tablePrefix+idx+" WHERE ogc_fid="+_oid).encode("utf-8")
        #    cur.execute(req0)
        #    vals2=cur.fetchone()
        #    try:
        #        script+="pm.searchAndReplace('[_"+vals1[i][0]+"_]',"+json.dumps(vals2[0])+")\n"
        #    except:
        #        pass

        docPath = conf["main"]["tmpPath"] + "/preview_tmp_" + conf["lenv"]["usid"] + "_" + _oid + ".odt"
        script += "pm.saveDoc('" + docPath + "')\n"
        script += "pm.saveDoc('" + docPath.replace(".odt", "_final.odt") + "')\n"
        script += "pm.unloadDoc('" + saveDocPath + "')\n"
        script += "import sys\nimport shutil\nprint('OK FINISHED',file=sys.stderr)\n"
        script += "print('OK FINISHED',file=sys.stderr)\n"
        # script+="pm.unloadDoc('"+conf["main"]["publicationPath"]+"/idx_templates/"+inputs["oDoc"]["value"]+"')\n"
        script = script.encode("utf-8")
        zoo.info("OK start")
        zoo.info("--------------------------------------------")
        zoo.info(str(script))
        zoo.info("--------------------------------------------")
        from subprocess import Popen, PIPE
        process1 = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)
        process1.stdin.write(script)
        process1.stdin.close()
        process1.wait()
        # shutil.copy(docPath,docPath.replace(".odt","_final.odt"))
        #
        zoo.info("OK finished")
        return docPath.replace(".odt", "_final.odt")
    
    zoo.info("OK finished")
    return zoo.SERVICE_FAILED


def viewRepport(conf, inputs, outputs):
    import json, os, shutil
    from subprocess import Popen, PIPE
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()

    conf["lenv"]["message"] = "Fetch items"
    zoo.update_status(conf, 10)
    field = inputs["field"]["value"]
    clause0 = ""
    clause = ""
    if "length" in inputs["in_val"]:
        for i in range(0, int(inputs["in_val"]["length"])):
            in_val_ext = adapt(inputs["in_val"]["value"][i])
            in_val_ext.encoding = "utf8"
            tmp0 = "%s" % in_val_ext.getquoted()
            if clause != "":
                clause += " OR "
            clause += field + "=" + tmp0
    else:
        in_val_ext = adapt(inputs["in_val"]["value"])
        in_val_ext.encoding = "utf8"
        tmp0 = "%s" % in_val_ext.getquoted()
        clause += field + "=" + tmp0

    clause_out = ""
    clause_out0 = ""
    if "out_val" in inputs:
        if "length" in inputs["out_val"]:
            for i in range(0, int(inputs["out_val"]["length"])):
                out_val_ext=adapt(inputs["out_val"]["value"][i])
                out_val_ext.encoding = "utf-8"
                tmp0 = "%s" % out_val_ext.getquoted()
                if clause_out != "":
                    clause_out += " OR "
                    clause_out0 += field + "=" + tmp0
                clause_out += field + "=" + tmp0
        else:
            out_val_ext=adapt(inputs["out_val"]["value"])
            out_val_ext.encoding = "utf-8"
            tmp0 = "%s" % out_val_ext.getquoted()
            clause_out += field + "=" + tmp0

    req = "SELECT datasource FROM territories where id = " + inputs["tid"]["value"]
    cur.execute(req)
    vals = cur.fetchone()
    req = "SELECT ogc_fid FROM " + vals[0] + " WHERE " + clause
    saveReq = req
    tbl = vals[0]

    conf["lenv"]["message"] = "Start PaperMint client"
    zoo.update_status(conf, 10)
    sys.stderr.flush()
    err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'w', 0)
    os.dup2(err_log.fileno(), sys.stderr.fileno())
    process = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)

    script = "import sys\nimport shutil\n"
    script += "import print.PaperMint as PaperMint\n"
    script += "pm=PaperMint.LOClient()\n"
    process.stdin.write(script)
    # Check for agregation
    if 'length' in inputs["idx"]:
        clause = "("
        for i in range(0, int(inputs["idx"]["length"])):
            if clause != "(":
                clause += " OR "
            clause += "i_id=" + inputs["idx"]["value"][i]
        clause += ")"
    else:
        clause = "i_id=" + inputs["idx"]["value"]
    nreq0 = "select CASE WHEN agregation is NULL THEN false ELSE agregation END from " + tprefix + "indicators_territories where " + clause + " and t_id=" + inputs["tid"]["value"]
    cur.execute(nreq0)
    lres = cur.fetchone()
    agregation = lres[0]
    if agregation is None:
        agregation = False
    zoo.info("AGREGATION: " + str(agregation))

    # Treate Context Indexes
    nreq = "select " + tprefix + "indicators_territories.i_id from " + tprefix + "indicators_groups, " + tprefix + "indicators_territories, velo.groups where " + tprefix + "indicators_groups.i_id=" + tprefix + "indicators_territories.i_id and " + tprefix + "indicators_groups.g_id=velo.groups.id and name='context' and t_id=" + \
           inputs["tid"]["value"]
    cur.execute(nreq)
    idxs = cur.fetchall()
    if len(idxs) > 0:
        cval = inputs["idx"]["value"]
        if "length" in inputs["idx"]:
            inputs["idx"]["length"] = str(int(inputs["idx"]["length"]) + len(idxs))
        else:
            inputs["idx"]["length"] = str(1 + len(idxs))
            inputs["idx"]["value"] = [cval]
        for i in range(0, len(idxs)):
            inputs["idx"]["value"] += [str(idxs[i][0])]
            notAccepted = len(inputs["idx"]["value"]) - 1
    cur.execute(req)
    vals = cur.fetchall()
    req = "SELECT ogc_fid FROM " + tbl + " WHERE " + clause_out
    doc = []
    final_doc = ""
    import shutil
    for i in range(0, len(vals)):
        zoo.info(vals[i][0])
        if "length" in inputs["idx"]:
            for j in range(0, int(inputs["idx"]["length"])):
                zoo.info(inputs["idx"]["value"][j])
                conf["lenv"]["message"] = zoo._("Producing document ") + str(j + 1) + zoo._(" on ") + inputs["idx"]["length"]
                zoo.update_status(conf, 12 + (((j + 1) * 60) / int(inputs["idx"]["length"])))
                if agregation:
                    doc_tmp = printOdt(conf, script, process, inputs["idx"]["value"][j], vals[i][0], saveReq, clause_out, tid=inputs["tid"]["value"])
                else:
                    if "step" in inputs:
                        lstep = inputs["step"]["value"]
                    else:
                        lstep = None
                    if j == notAccepted:
                        lstep = None
                    idx = inputs["idx"]["value"][j]
                    try:
                        mapfile = conf["main"]["dataPath"] + "/indexes_maps/project_PIndex" + idx + ".map"
                        import mapscript
                        tmp1 = mapscript.mapObj(mapfile)
                        tmp0 = tmp1.getLayer(0).metadata.get("mmSteps")
                        tmp2 = tmp1.getLayer(0).metadata.get("mmClass")
                    except Exception as e:
                        tmp0 = None
                        tmp1 = None
                        tmp2 = None
                    if tmp0 is None and tmp1 is None and inputs["tid"]["value"] != "null":
                        mapfile = conf["main"]["dataPath"] + "/indexes_maps/project_A" + str(inputs["tid"]["value"]) + "_PIndex" + idx + ".map"
                        tmp0 = mapscript.mapObj(mapfile).getLayer(0).metadata.get("mmSteps")
                    if tmp2 == "tl" and tmp0 is not None:
                        tmp0 = tmp0.split(',')
                        for k in range(0, len(tmp0)):
                            doc_tmp = printOdt(conf, script, process, inputs["idx"]["value"][j], vals[i][0], saveReq, clause_out, step=str(k))
                            if k + 1 < len(tmp0):
                                final_doc = doc_tmp.replace(".odt", "_" + str(k) + "_" + str(j) + ".odt")
                                shutil.copy(doc_tmp, final_doc)
                                doc += [final_doc]
                    else:
                        doc_tmp = printOdt(conf, script, process, inputs["idx"]["value"][j], vals[i][0], saveReq, clause_out)
                final_doc = doc_tmp.replace(".odt", "_" + str(j) + ".odt")
                shutil.copy(doc_tmp, final_doc)
                doc += [final_doc]
                # shutil.copy(doc[len(doc)-1],doc[len(doc)-1].replace(".odt",str(i+j)+"_00.odt"))
        else:
            zoo.info(inputs["idx"]["value"])
            zoo.info(vals[i][0])
            zoo.info(str(req))
            conf["lenv"]["message"] = zoo._("Producing document")
            zoo.update_status(conf, 52)
            if agregation:
                doc += [printOdt(conf, script, process, inputs["idx"]["value"], vals[i][0], saveReq, clause_out, tid=inputs["tid"]["value"])]
            else:
                doc += [printOdt(conf, script, process, inputs["idx"]["value"], vals[i][0], saveReq, clause_out)]
            # shutil.copy(doc[len(doc)-1],doc[len(doc)-1].replace(".odt",str(i)+"_00.odt"))
        break
    zoo.info(str(doc))
    conf["lenv"]["message"] = zoo._("Compiling documents in PDF format")
    zoo.update_status(conf, 92)
    if (len(doc) >= 2):
        for i in range(len(doc)):
            zoo.info("Append doc !")
            if i == 0:
                final_doc = doc[i].replace(".odt", "_" + str(i) + ".odt")
                shutil.copy(doc[i], final_doc)
                script += "pm.loadDoc('" + final_doc + "')\n"
            else:
                zoo.info(doc[i])
                script += "pm.appendDoc('" + doc[i] + "')\n"
        final_doc = final_doc.replace(".odt", ".pdf")
        script += "pm.saveDoc('" + final_doc + "')\nsys.exit(0)\n"
    else:
        final_doc = doc[0].replace(".odt", ".pdf")
        script += "pm.loadDoc('" + doc[0] + "')\n"
        script += "pm.saveDoc('" + final_doc + "')\n"
        script += "pm.unloadDoc('" + doc[0] + "')\n"

    zoo.info("OK Start\n\n-------------------------------------------")
    zoo.info(str(script))
    process.stdin.write(script)
    process.stdin.close()
    conf["lenv"]["message"] = str(process.stdout.readline())
    sys.stderr.flush()

    # err_log=file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'r', 0)
    # conf["lenv"]["message"]=str(err_log.readl())
    process.wait()

    try:
        outputs["Result"]["value"] = open(final_doc, "rb").read()
        import os
        os.unlink(final_doc)
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = str(e)
        return zoo.SERVICE_FAILED


def viewStatOnly(conf, inputs, outputs):
    import json, os, shutil, time
    from subprocess import Popen, PIPE
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()

    conf["lenv"]["message"] = "Fetch items"
    zoo.update_status(conf, 10)

    reqSuffix = ""
    if "tid" in inputs:
        reqSuffix += " and agregation and t_id=" + inputs["tid"]["value"]
    else:
        reqSuffix += " and (not(agregation) or agregation is null)"

    clause = "SELECT id FROM " + tprefix + "indicators_territories where i_id = " + inputs["id"]["value"] + reqSuffix

    req = "select vx,vy,name from graphs where it_id in (" + clause + ")"
    cur.execute(req)
    vals = cur.fetchone()
    zoo.info(str(req))
    zoo.info(str(vals))

    import vector_tools.service as vt
    elems = vt.readFileFromBuffer(inputs["elem"]["value"], "xml")
    if vals[2] is not None:
        rvals = [[vals[2]], [], []]
    else:
        rvals = [[""], [], []]
    for i in range(0, len(elems)):
        elem = json.loads(elems[i].ExportToJson())
        rvals[1] += [elem["properties"][vals[0]]]
        rvals[2] += [[float(elem["properties"][vals[1]])]]

    idx = inputs["id"]["value"]
    req = "select doc from " + prefix + "r_table where i_id=" + idx
    zoo.info(str(req))
    cur.execute(req)
    vals = cur.fetchone()

    _oid = conf["senv"]["MMID"] + (str(time.time()).replace(".", ""))

    if vals is not None:
        docPath = conf["main"]["publicationPath"] + "/idx_templates/" + vals[0]
    else:
        rreq = "select count(*) from graphs where type='hist' and it_id=(SELECT id from " + tprefix + "indicators_territories where i_id=" + idx + reqSuffix + ")"
        cur.execute(rreq)
        rvals0 = cur.fetchone()
        if rvals0[0] > 0:
            docPath = conf["main"]["publicationPath"] + "/idx_templates/default_hist.odt"
        else:
            docPath = conf["main"]["publicationPath"] + "/idx_templates/default_circ.odt"
    fdocPath = docPath.replace(".odt", "_" + _oid + "_init.odt").replace(conf["main"]["publicationPath"] + "/idx_templates/", conf["main"]["tmpPath"] + "/")
    shutil.copy(docPath, fdocPath)
    final_doc = fdocPath.replace("init", "final")
    fdocPath1 = final_doc.replace(".odt", ".png")

    conf["lenv"]["message"] = "Start PaperMint client"
    zoo.update_status(conf, 10)
    sys.stderr.flush()
    err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'w', 0)
    os.dup2(err_log.fileno(), sys.stderr.fileno())
    process = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)

    zoo.info("START ---")
    script = "import sys\nimport shutil\n"
    script += "import print.PaperMint as PaperMint\n"
    script += "pm=PaperMint.LOClient()\n"
    conf["lenv"]["message"] = "Generate document"
    zoo.update_status(conf, 20)
    script += "pm.loadDoc('" + fdocPath + "')\n"
    script += "pm.exportStatAsImage(\"" + fdocPath1 + "\",'[_diag_]'," + json.dumps(rvals) + ")\n"
    script += "pm.saveDoc('" + final_doc + "')\n"
    script += "pm.unloadDoc('" + fdocPath + "')\n"
    zoo.info(str(script))
    zoo.info("--- END")
    process.stdin.write(script)
    process.stdin.close()
    conf["lenv"]["message"] = str(process.stdout.readline())
    zoo.info(str(rvals))
    sys.stderr.flush()
    # err_log=file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'r', 0)
    # conf["lenv"]["message"]=str(err_log.readl())
    process.wait()
    conf["lenv"]["message"] = "Return document"
    zoo.update_status(conf, 90)

    try:
        outputs["Result"]["value"] = open(fdocPath1, "rb").read()
        import os
        os.unlink(final_doc)
        os.unlink(fdocPath)
        os.unlink(fdocPath1)
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = str(e)
        return zoo.SERVICE_FAILED


def insert(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    if not (auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    try:
        if inputs["table"]["value"] == "mm_tables.p_editions":
            req = "SELECT name from mm_tables.p_tables where id=" + inputs["ptid"]["value"]
            res = cur.execute(req)
            vals = cur.fetchone()
            tbl = vals[0]
            try:
                #res = cur.execute("ALTER TABLE " + tbl + " ADD COLUMN uid int4 references mm.users(id);")
                if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and  conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                    res = cur.execute("ALTER TABLE " + tbl + " ADD uid integer CHECK(dbo.is_user(uid)=1)")
                else:
                    res = cur.execute("ALTER TABLE " + tbl + " ADD COLUMN uid int4 CHECK(is_user(uid));")
            except Exception as e:
                zoo.error("Add column failed: " + str(e))
                pass
            con.conn.commit()
            if tbl.count("mm_ghosts.") == 0:
                if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                    req = "SELECT dbo.generate_create_ghost_table_statement('" + vals[0] + "')"
                else:
                    req = "SELECT generate_create_ghost_table_statement('" + vals[0] + "')"
                res = cur.execute(req)
                vals = cur.fetchone()
                try:
                    res = cur.execute("BEGIN;" + vals[0] + ";COMMIT;")
                except:
                    pass
                con.conn.commit()
                try:
                    req = "DROP TRIGGER mm_tables_" + tbl.replace(".", "_") + "_update_history on " + tbl + ";"
                    res = cur.execute(req)
                except Exception as e:
                    zoo.error(str(e))
                    pass
                con.conn.commit()
                try:
                    req = "CREATE TRIGGER mm_tables_" + tbl.replace(".", "_") + "_update_history BEFORE UPDATE OR DELETE OR INSERT ON " + tbl + " FOR EACH ROW EXECUTE PROCEDURE update_ghosts()"
                    res = cur.execute(req)
                except Exception as e:
                    zoo.error(str(e))
                    pass
                con.conn.commit()
        col_sufix = ""
        val_sufix = ""
        columns = json.loads(inputs["columns"]["value"])
        for i in range(len(columns)):
            content = None
            zoo.info("COLUMN i: " + columns[i])
            if i > 0:
                col_sufix += ","
                val_sufix += ","
            # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
            if "id" not in inputs:
                zoo.info("OK ")
                zoo.info("OK 1 "+columns[i])
                col_sufix += columns[i]
                zoo.info("OK ")
                zoo.info(str(inputs[columns[i]]["value"]))
                if columns[i] == "file":
                    content = packFile(conf, conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["senv"]["MMID"] + "/" + inputs[columns[i]]["value"], columns[i])
                    if con.dbtype=="ODBC":
                        val_sufix += "?"
                    else:
                        val_sufix += "%s"
                else:
                    value_ext=adapt(inputs[columns[i]]["value"])
                    value_ext.encoding="utf-8"
                    val_sufix += str(value_ext)
            else:
                if columns[i] == "file":
                    content = packFile(conf, conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["senv"]["MMID"] + "/" + inputs[columns[i]]["value"], columns[i])
                    if con.dbtype=="ODBC":
                        col_sufix += columns[i] + "=?"
                    else:
                        col_sufix += columns[i] + "=%s"
                else:
                    try:
                        if len(inputs[columns[i]]["value"]) == 0 or inputs[columns[i]]["value"] == "NULL":
                            col_sufix += columns[i] + "=NULL"
                        else:
                            value_ext=adapt(inputs[columns[i]]["value"])
                            value_ext.encoding="utf-8"
                            col_sufix += columns[i] + "=" + str(value_ext)
                    except:
                        if len(inputs[columns[i]]["value"]) == 0 or inputs[columns[i]]["value"] == "NULL":
                            col_sufix += columns[i] + "=NULL"
                        else:
                            value_ext=adapt(inputs[columns[i]]["value"])
                            value_ext.encoding="utf-8"
                            col_sufix += columns[i] + "=" + str(value_ext)
        if len(columns) > 0:
            # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
            if "id" not in inputs:
                if con.dbtype=="ODBC":
                    req = "INSERT INTO " + inputs["table"]["value"] + " (" + col_sufix + ") OUTPUT Inserted.ID VALUES (" + (val_sufix) + ") "
                else:
                    req = "INSERT INTO " + inputs["table"]["value"] + " (" + col_sufix + ") VALUES (" + (val_sufix) + ") RETURNING id"
                zoo.info(str(req.encode('utf-8')))
                if content is not None:
                    if con.dbtype=="ODBC":
                        import pyodbc
                        cur.execute(req.replace("file","_file"), (pyodbc.Binary(content),))
                    else:
                        cur.execute(req, (psycopg2.Binary(content),))
                else:
                    cur.execute(req)
                cid = str(cur.fetchone()[0])
            else:
                val_sufix = "id=" + inputs["id"]["value"]
                req = "UPDATE " + inputs["table"]["value"] + " set " + col_sufix + " WHERE " + val_sufix
                zoo.info(str(req.encode('utf-8')))
                if content is not None:
                    if con.dbtype=="ODBC":
                        import pyodbc
                        cur.execute(req.replace("file","_file"), (pyodbc.Binary(content),))
                    else:
                        cur.execute(req, (psycopg2.Binary(content),))
                else:
                    cur.execute(req)
                cid = inputs["id"]["value"]
            outputs["id"]["value"] = json.dumps(cid)
        else:
            # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
            if "id" in inputs:
                outputs["id"]["value"] = inputs["id"]["value"]
            else:
                outputs["id"]["value"] = "-1"
            cid = outputs["id"]["value"]
        # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
        if "links" in inputs:
            links = json.loads(inputs["links"]["value"])
            lkeys = myList(links)#.keys())
            for j in range(len(lkeys)):
                obj = json.loads(inputs[lkeys[j]]["value"])
                req = "DELETE FROM " + links[lkeys[j]]["table"] + " where " + links[lkeys[j]]["ocol"] + "=" + cid + ";"
                try:
                    cur.execute(req)
                    zoo.info(str(req))
                    con.conn.commit()
                    req = ""
                except:
                    con.conn.commit()
                    req = ""
                zoo.error(str(req))
                for k in range(len(obj)):
                    if links[lkeys[j]]["ocol"] != links[lkeys[j]]["tid"]:
                        req = "INSERT INTO " + links[lkeys[j]]["table"] + " (" + links[lkeys[j]]["ocol"] + "," + links[lkeys[j]]["tid"] + ") VALUES (" + cid + "," + obj[k] + ");"
                    else:
                        lcols = myList(obj[k].keys())
                        col_sufix = links[lkeys[j]]["ocol"]
                        val_sufix = cid
                        for i in range(len(lcols)):
                            zoo.info(str(obj[k][lcols[i]].encode('utf-8')))
                            col_sufix += "," + lcols[i]
                            val_ext=adapt(obj[k][lcols[i]])
                            val_ext.encoding="utf-8"
                            val_sufix += "," + str(val_ext)
                        req = "INSERT INTO " + links[lkeys[j]]["table"] + " (" + col_sufix + ") VALUES (" + val_sufix + ");"
                    cur.execute(req)
                    con.conn.commit()
        outputs["Result"]["value"] = zoo._("Done")
    except Exception as e:
        import traceback
        zoo.error(traceback.format_exc())
        conf["lenv"]["message"] = zoo._("An error occured when processing your request: ") + str(e) + " \n" + str(traceback.format_exc())
        return zoo.SERVICE_FAILED
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def packFile(conf, fileName, field):
    binary_file = open(fileName, "rb")
    prefix = bytearray(fileName.encode('utf-8'))  # bytearray from the original file name
    res = prefix + bytearray(512 - len(prefix)) + binary_file.read()
    return res


def unpackFile(conf, content):
    fileName = conf["main"]["tmpPath"] + "/tmp_data" + conf["lenv"]["usid"] + ".bin"
    binary_file = open(fileName, "wb")
    binary_file.write(content)
    binary_file.close()
    binary_file = open(fileName, "rb")
    head = binary_file.read(512)
    return {"name": head.decode('utf-8').split("\x00")[0], "content": binary_file.read()}


def clientDelete(conf, inputs, outputs):
    import json
    from datastores.postgis import pgConnection as pg
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    try:
        req = "SELECT name FROM mm_tables.p_tables WHERE id=" + inputs["tableId"]["value"]
        cur.execute(req)
        val = cur.fetchone()
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            req = pg.getDescMSSQL(cur, val[0])
        else:
            req = pg.getDesc(cur, val[0])
        cur.execute(req)
        vals = cur.fetchall()
        cId = None
        for i in range(len(vals)):
            if vals[i][3] == 'PRI':
                cid = vals[i][1]
                break
        if cid is not None:
            req = "DELETE FROM " + val[0] + " WHERE " + cid + "=" + inputs["tupleId"]["value"]
            try:
                cur.execute(req)
            except Exception as e:
                conf["lenv"]["message"] = zoo._("Unable to delete element: " + str(e))
                return zoo.SERVICE_FAILED
            con.conn.commit()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to delete element: " + str(e))
        return zoo.SERVICE_FAILED
    outputs["Result"]["value"] = zoo._('Done')
    return zoo.SERVICE_SUCCEEDED


def recoverFileFromHexInDb(conf, inputs, outputs):
    from vector_tools import vectSql
    res = vectSql.vectInfo(conf, inputs, outputs)
    import json
    jsObj = json.loads(outputs["Result"]["value"])
    zoo.info(jsObj[0][inputs["field"]["value"]])
    lInputs = {"table": inputs["tableName"], "field": inputs["field"], "binaryString": {"value": jsObj[0][inputs["field"]["value"]]}, "id": inputs["id"]}
    return recoverFileFromHex(conf, lInputs, outputs)
    # return zoo.SERVICE_SUCCEEDED


def recoverFileFromHex(conf, inputs, outputs):
    # dec_string = int(inputs["binaryString"]["value"], 16)
    bin_ostring = inputs["binaryString"]["value"]
    bin_string = bytearray.fromhex(bin_ostring[2:len(bin_ostring) - 1]) #bin_ostring[2:len(bin_ostring) - 1].decode('hex')  # bin(int(bin_ostring[2:len(bin_ostring)-1],16))
    try:
        lfile = unpackFile(conf, bin_string)
        fileName = conf["main"]["tmpPath"] + "/" + lfile["name"].replace("/", "_")
        binary_file = open(fileName, "wb")
        binary_file.write(lfile["content"])
        binary_file.close()
        inputs["file"] = {"value": fileName}
        return saveUploadedFile(conf, inputs, outputs)
    except Exception as e:
        zoo.error("ERROR 1 " + str(e))
        con = auth.getCon(conf)
        con.connect()
        try:
            cur = con.conn.cursor()
            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                import mapscript
                feature = mapscript.shapeObj()
                feature = feature.fromWKT(str(bin_string,"utf-8").replace(',',' '))
                feature.project(mapscript.projectionObj("epsg:4326"),mapscript.projectionObj("epsg:32631"))
                if "pkey" in inputs:
                    pkey=inputs["pkey"]["value"]
                else:
                    pkey=fetchPrimaryKey(cur, inputs["table"]["value"])
                zoo.info(dir(feature))
                zoo.info(" ** PKEY: "+ pkey + " " + inputs["pkey"]["value"])
                zoo.info("UPDATE " + inputs["table"]["value"] + " set " + inputs["field"]["value"] + "=geometry::STGeomFromText('" + feature.toWKT() + "',"+(conf["main"]["crs"].replace("epsg:",""))+") WHERE "+pkey+"=" + inputs["id"]["value"])
                cur.execute("UPDATE " + inputs["table"]["value"] + " set " + inputs["field"]["value"] + "=geometry::STGeomFromText('" + feature.toWKT() + "',"+(conf["main"]["crs"].replace("epsg:",""))+") WHERE "+pkey+"=" + inputs["id"]["value"])
            else:
                cur.execute("UPDATE " + inputs["table"]["value"] + " set " + inputs["field"]["value"] + "=ST_SetSRID(ST_GeometryFromText('" + str(bin_string,"utf-8") + "'),4326) WHERE id=" + inputs["id"]["value"])
            con.conn.commit()
            return zoo.SERVICE_SUCCEEDED
        except Exception as e:
            zoo.error("ERROR 2 " + str(e))
            zoo.error(str(e))
            con.conn.commit()
            return zoo.SERVICE_FAILED


def saveUploadedFile(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    content = packFile(conf, inputs["file"]["value"], inputs["field"]["value"])
    zoo.info(str(content))
    if con.dbtype=="ODBC":
        import pyodbc
        zoo.info(("UPDATE " + inputs["table"]["value"] + " set " + inputs["field"]["value"] + "=? WHERE id=" + inputs["id"]["value"]).replace("file","_file"))
        req="UPDATE " + inputs["table"]["value"] + " set " + inputs["field"]["value"] + "=? WHERE id=" + inputs["id"]["value"]
        cur.execute(req.replace("file","_file"), (pyodbc.Binary(content),))
    else:
        cur.execute("UPDATE " + inputs["table"]["value"] + " set " + inputs["field"]["value"] + "=%s WHERE id=" + inputs["id"]["value"], (psycopg2.Binary(content),))
    con.conn.commit()
    if inputs["file"]["value"].count('mdb'):
        import os, subprocess
        try:
            os.mkdir(inputs["file"]["value"] + "_dir")
        except:
            pass
        table_names = subprocess.Popen(["/usr/local/bin/mdb-tables", inputs["file"]["value"]],
                                       stdout=subprocess.PIPE).communicate()[0]
        tables = table_names.split(" ")
        sys.stdout.flush()
        for table in tables:
            zoo.info(" <-> ----> " + str(table))
            if table != '':
                csv_content = subprocess.Popen(["/usr/local/bin/mdb-export", inputs["file"]["value"], table],
                                               stdout=subprocess.PIPE).communicate()[0]
                cfile = open(inputs["file"]["value"] + "_dir/" + table + ".csv", "w")
                cfile.write(csv_content)
                cfile.close()
    outputs["Result"]["value"] = zoo._('Done')
    return zoo.SERVICE_SUCCEEDED


def clientImportDataset(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    try:
        req = "SELECT name from mm_tables.p_tables where id=" + inputs["tableId"]["value"]
        res = cur.execute(req)
        vals = cur.fetchone()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a tableId: ") + req + str(e)
        return zoo.SERVICE_FAILED
    tableName = vals[0]
    pkey = fetchPrimaryKey(cur, tableName)
    if not (auth.is_ftable(tableName)):
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a table")
        return zoo.SERVICE_FAILED
    try:
        req = "SELECT * FROM (SELECT DISTINCT ON(mm_tables.p_edition_fields.name) mm_tables.p_edition_fields.edition as eid,mm_tables.p_edition_fields.id,mm_tables.p_edition_fields.name,(select code from mm_tables.ftypes where id=mm_tables.p_edition_fields.ftype),mm_tables.p_edition_fields.value FROM mm_tables.p_editions,mm_tables.ftypes,mm_tables.p_edition_fields,mm.groups,mm_tables.p_edition_groups where mm_tables.p_edition_fields.ftype=mm_tables.ftypes.id and mm_tables.p_editions.id=mm_tables.p_edition_fields.eid and mm.groups.id=mm_tables.p_edition_groups.gid and mm_tables.p_editions.id=" + \
              inputs["editId"]["value"] + " and mm_tables.p_editions.id=mm_tables.p_edition_groups.eid and ptid=" + inputs["tableId"]["value"] + " and mm.groups.id in (SELECT id from mm.groups where " + splitGroup(conf) + ")) as a ORDER BY a.id"
        res = cur.execute(req)
        originalColumns = cur.fetchall()
        req1 = "INSERT INTO " + tableName + " ("
        req = "SELECT "
        for i in range(len(originalColumns)):
            if originalColumns[i][2] == "wkb_geometry":
                req += " st_multi(" + originalColumns[i][2] + ")"
            else:
                req += " " + originalColumns[i][2]
            req1 += " " + originalColumns[i][2]
            if i + 1 < len(originalColumns):
                req += ","
                req1 += ","
        req += " FROM " + inputs["importedData"]["value"]
        req1 += ") (" + req + ")"
        res = cur.execute(req1)
        con.conn.commit()
        zoo.info(str(originalColumns))
        zoo.info(srt(req1))
    except Exception as e:
        zoo.error(str(e))
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED


def clientInsert(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    #con.connect()
    cur = con.conn.cursor()
    try:
        req = "SELECT name from mm_tables.p_tables where id=" + inputs["tableId"]["value"]
        res = cur.execute(req)
        vals = cur.fetchone()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a tableId: ") + req + str(e)
        return zoo.SERVICE_FAILED
    tableName = vals[0]
    pkey = fetchPrimaryKey(cur, tableName)
    #if not (auth.is_ftable(tableName)):
    #    conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a table")
    #    return zoo.SERVICE_FAILED
    try:
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            req = "SELECT * FROM (SELECT mm_tables.p_edition_fields.edition as eid,mm_tables.p_edition_fields.id,mm_tables.p_edition_fields.name,(select code from mm_tables.ftypes where id=mm_tables.p_edition_fields.ftype) as tt,mm_tables.p_edition_fields.value FROM mm_tables.p_editions,mm_tables.ftypes,mm_tables.p_edition_fields,mm.groups,mm_tables.p_edition_groups where mm_tables.p_edition_fields.ftype=mm_tables.ftypes.id and (mm_tables.ftypes.basic=0) and mm_tables.p_editions.id=mm_tables.p_edition_fields.eid and mm.groups.id=mm_tables.p_edition_groups.gid and mm_tables.p_editions.id=" + \
                    inputs["editId"]["value"] + " and mm_tables.p_editions.id=mm_tables.p_edition_groups.eid and ptid=" + inputs["tableId"]["value"] + " and mm.groups.id in (SELECT id from mm.groups where " + splitGroup(conf) + ")) as a ORDER BY a.id"
        else:
            req = "SELECT * FROM (SELECT DISTINCT ON(mm_tables.p_edition_fields.name) mm_tables.p_edition_fields.edition as eid,mm_tables.p_edition_fields.id,mm_tables.p_edition_fields.name,(select code from mm_tables.ftypes where id=mm_tables.p_edition_fields.ftype),mm_tables.p_edition_fields.value FROM mm_tables.p_editions,mm_tables.ftypes,mm_tables.p_edition_fields,mm.groups,mm_tables.p_edition_groups where mm_tables.p_edition_fields.ftype=mm_tables.ftypes.id and not(mm_tables.ftypes.basic) and mm_tables.p_editions.id=mm_tables.p_edition_fields.eid and mm.groups.id=mm_tables.p_edition_groups.gid and mm_tables.p_editions.id=" + \
                    inputs["editId"]["value"] + " and mm_tables.p_editions.id=mm_tables.p_edition_groups.eid and ptid=" + inputs["tableId"]["value"] + " and mm.groups.id in (SELECT id from mm.groups where " + splitGroup(conf) + ")) as a ORDER BY a.id"
        zoo.info(str(req))
        res = cur.execute(req)
        originalColumns = cur.fetchall()
        zoo.info("originalColumns")
        zoo.info(str(originalColumns))
        dcols = []
        dvals = []
        specialFields = []
        for i in range(len(originalColumns)):
            dcols += [{"name": originalColumns[i][2], "type": originalColumns[i][3], "value": originalColumns[i][4]}]  # name type
            specialFields += [originalColumns[i][2]]
        zoo.info("DCOLS")
        zoo.info(str(dcols))
        col_sufix = ""
        val_sufix = ""
        tuple = json.loads(inputs["tuple"]["value"])
        tupleReal = json.loads(inputs["tupleReal"]["value"])
        realKeys = myList(tupleReal)#.keys())
        keys = myList(tuple)#.keys())
        columns = realKeys + keys
        zoo.info(str(columns))
        cnt = 0
        for i in range(len(columns)):
            if specialFields.count(columns[i]) == 0 and columns[i].count("untitled")==0 and columns[i].count("unamed")==0 :
                zoo.info(columns[i])
                if cnt > 0:
                    col_sufix += ","
                    val_sufix += ","
                # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                zoo.info(str(sys.stdout.encoding))
                if "id" not in inputs:
                    zoo.info("TUPLE 0" + str(i))
                    col_sufix += columns[i]
                    if i >= len(realKeys):
                        try:
                            val_ext=adapt(tuple[columns[i]])
                            val_ext.encoding="utf-8"
                            if len(str(val_ext))>2:
                                val_sufix += str(val_ext)
                            else:
                                val_sufix += "null"
                        except:
                            zoo.error(" * " + str(tuple[columns[i]]))
                            #val_ext=adapt(tuple[columns[i]])
                            #val_ext.encoding="utf-8"
                            val_ext=tuple[columns[i]]
                            val_sufix += str(val_ext)
                    else:
                        zoo.info(" * " + str(tupleReal[columns[i]]))
                        val_ext=adapt(tupleReal[columns[i]])
                        val_ext.encoding="utf-8"
                        val_sufix += str(val_ext)
                else:
                    zoo.info("TUPLE 1" + str(i))
                    if i >= len(realKeys):
                        zoo.info("TUPLE 2")
                        try:
                            zoo.info(" * " + str(tuple[columns[i]]))
                            val_ext=adapt(tuple[columns[i]])
                            val_ext.encoding="utf-8"
                            zoo.info(" * " + str(val_ext))
                            if len(str(val_ext)) == 2:
                                col_sufix += columns[i] + "=NULL"
                            else:
                                val1_ext=adapt(tuple[columns[i]])
                                val1_ext.encoding="utf-8"
                                col_sufix += columns[i] + "=" + str(val1_ext)
                            zoo.info(" * " + str(val_ext))
                        except:
                            col_sufix += columns[i] + "=" + str(tuple[columns[i]])
                    else:
                        zoo.info("TUPLE 3")
                        val_ext=adapt(tupleReal[columns[i]])
                        val_ext.encoding="utf-8"
                        col_sufix += columns[i] + "=" +str(val_ext)
                cnt += 1
            elif columns[i].count("unamed")==0:
                hasElement = False
                if dcols[specialFields.index(columns[i])]["type"] == "tbl_list":
                    if cnt > 0:
                        col_sufix += ","
                        val_sufix += ","
                    # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                    val_ext=adapt(tuple[columns[i]])
                    val_ext.encoding="utf-8"
                    if "id" not in inputs:
                        col_sufix += columns[i]
                        val_sufix += str(val_ext)
                    else:
                        col_sufix += columns[i] + "=" + str(val_ext)
                else:
                    if dcols[specialFields.index(columns[i])]["type"] == "geometry":
                        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                            zoo.info(dcols[specialFields.index(columns[i])])
                            import mapscript
                            myShape=mapscript.shapeObj.fromWKT()
                            myShape.project(mapscript.projectionObj("epsg:4326"),mapscript.projectionObj(lObj[1]))
                            val_sufix += "STGeomFromText("+ myShape.toWKT() +")"
                        else:
                            tmp = tableName.split(".")
                            req = "select srid from geometry_columns WHERE f_table_schema='" + tmp[0] + "' AND f_table_name='" + tmp[1] + "'"
                            res = cur.execute(req)
                            vals0 = cur.fetchone()
                            if i > 0:
                                col_sufix += ","
                                val_sufix += ","
                            col_sufix += columns[i]
                            geo_ext=adapt(tuple[columns[i]])
                            geo_ext.encoding="utf-8"
                            val_sufix += "ST_SetSRID(ST_GeometryFromText(" + str(geo_ext) + ")," + str(vals0[0]) + ")"
                    else:
                        if dcols[specialFields.index(columns[i])]["type"] == "varchar(32)":
                            import manage_users.manage_users as mu
                            if i >= len(realKeys):
                                mm_md5_ext =adapt(mu.mm_md5(tuple[columns[i]]))
                                mm_md5_ext.encoding="utf-8"
                                dvals += [str(mm_md5_ext)]
                            else:
                                mm_md5_ext =adapt(mu.mm_md5(tupleReal[columns[i]]))
                                mm_md5_ext.encoding="utf-8"
                                dvals += [str(mm_md5_ext)]
                        else:
                            if i >= len(realKeys):
                                dvals += [tuple[columns[i]]]
                            else:
                                dvals += [tupleReal[columns[i]]]

        # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
        if "id" not in inputs:
            zoo.info("COLS")
            zoo.info(str(col_sufix))
            zoo.info("VALS")
            val_sufix = val_sufix.replace("'NULL'", "NULL")
            zoo.info(str(val_sufix))
            if con.dbtype=="ODBC":
                req = "INSERT INTO " + tableName + " (" + col_sufix + ") OUTPUT Inserted."+str(pkey)+" VALUES (" + val_sufix + ") " 
            else:
                req = "INSERT INTO " + tableName + " (" + col_sufix + ") VALUES (" + val_sufix + ") RETURNING " + str(pkey)
            zoo.info("VALS")
            zoo.info(str(req.encode("utf-8")))
            cur.execute(req)
            zoo.info("VALS")
            cid = str(cur.fetchone()[0])
            zoo.info("VALS")
        else:
            f = fetchPrimaryKey(cur, tableName)
            val_sufix = f + "=" + inputs["id"]["value"]
            zoo.info(str(tableName))
            zoo.info(str(col_sufix.encode("utf-8")))
            zoo.info(str(val_sufix))
            col_sufix = col_sufix.replace("'NULL'", "NULL")
            req = "UPDATE " + tableName + " set " + col_sufix + " WHERE " + val_sufix
            zoo.info(str(req.encode("utf-8")))
            cur.execute(req)
            cid = inputs["id"]["value"]
        for i in range(len(dcols)):
            zoo.info("+++++ 00 --- " + str(dcols[i]))
            if dcols[i]["type"] == "geometry_reference":
                # cur.execute("UPDATE "+tableName+" set "+dcols[i]["name"]+"=%s WHERE "+pkey+"="+cid,(psycopg2.Integer(),))
                zoo.info("+++++ OM +++++" + str(dvals))
                import osgeo
                import osgeo.gdal
                # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                hasBeenExecuted=False
                if "InputGeometry" in inputs:
                    try:
                        ds = osgeo.ogr.Open(inputs["InputGeometry"]["cache_file"])
                        layer = ds.GetLayerByIndex(0)
                        feat = layer.GetNextFeature()
                        geometry = None
                        index=-1
                        cnt=0
                        while feat is not None:
                            if index==-1:
                                index=feat.GetFieldIndex(inputs["InputGeometryField"]["value"].split(';')[1])
                            geometry = feat.GetFieldAsString(index)
                            zoo.info("+++++ OM +++++ [" + str(geometry)+"]")
                            geometry = feat.GetFieldAsInteger(index)
                            zoo.info("+++++ OM +++++ [" + str(geometry)+"]")
                            if "id" not in inputs and feat is not None and cnt>0:
                                val_sufix = val_sufix.replace("'NULL'", "NULL")
                                zoo.info("INSERT INTO " + tableName + " (" + col_sufix + ") VALUES (" + val_sufix + ") RETURNING " + str(pkey))
                                if con.dbtype=="ODBC":
                                    req = "INSERT INTO " + tableName + " (" + col_sufix + ") OUTPUT Inserted."+str(pkey)+" VALUES (" + val_sufix + ") "
                                else:
                                    req = "INSERT INTO " + tableName + " (" + col_sufix + ") VALUES (" + val_sufix + ") RETURNING " + str(pkey)
                                cur.execute(req)
                                cid = str(cur.fetchone()[0])
                            zoo.info("+++++ OM +++++ [" + str(geometry)+"]")
                            zoo.info(str(feat))
                            feat.Destroy()
                            zoo.info("UPDATE " + tableName + " set " + dcols[i]["name"] + "=" + str(geometry) + " WHERE " + pkey + "=" + cid)
                            cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=" + str(geometry) + " WHERE " + pkey + "=" + cid, ())
                            hasBeenExecuted=True
                            zoo.info(str(feat))
                            zoo.info("+++++ OM +++++ [" + str(geometry)+"]")
                            feat = layer.GetNextFeature()
                            zoo.info(str(feat))
                            zoo.info("+++++ OM +++++ [" + str(geometry)+"]")
                            cnt+=1
                    except Exception as e:
                        zoo.error(str(e))
                        geometry = inputs["InputGeometry"]["value"]
                    zoo.error("+++++ OM +++++ [" + str(geometry)+"]")
                    if not(hasBeenExecuted):

                        zoo.info("UPDATE " + tableName + " set " + dcols[i]["name"] + "=" + str(geometry) + " WHERE " + pkey + "=" + cid)
                        cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=" + str(geometry) + " WHERE " + pkey + "=" + cid, ())
            if dcols[i]["type"] == "geometry":
                # cur.execute("UPDATE "+tableName+" set "+dcols[i]["name"]+"=%s WHERE "+pkey+"="+cid,(psycopg2.Integer(),))
                zoo.info("+++++ OM +++++" + str(dvals))
                import osgeo
                import osgeo.gdal
                # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                if "InputGeometry" in inputs:
                    try:
                        ds = osgeo.ogr.Open(inputs["InputGeometry"]["cache_file"])
                        layer = ds.GetLayerByIndex(0)
                        feat = layer.GetNextFeature()
                        geometry = None
                        while feat is not None:
                            geometry = feat.GetGeometryRef().ExportToWkt()
                            feat.Destroy()
                            feat = layer.GetNextFeature()
                    except:
                        geometry = inputs["InputGeometry"]["value"]
                    zoo.info("+++++ OM +++++" + str(geometry))
                    if str(geometry).count("POINT")>0:
                        if dcols[i]["value"] != "":
                            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                                tmp=dcols[i]["value"].split(";")
                                import mapscript
                                myShape=mapscript.shapeObj.fromWKT(geometry)
                                myShape.project(mapscript.projectionObj("epsg:4326"),mapscript.projectionObj(tmp[1]))
                                #val_sufix += "STGeomFromText("+ myShape.toWKT() +")"
                                cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=geometry::STGeomFromText('" + str(myShape.toWKT()) + "',"+(tmp[1].replace("epsg:",""))+") WHERE " + pkey + "=" + cid, ())
                            else:
                                cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_Transform(ST_SetSRID((ST_GeometryFromText('" + str(geometry) + "')),4326),"+(dcols[i]["value"].replace("EPSG:",""))+") WHERE " + pkey + "=" + cid, ())
                        else:
                            cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_SetSRID((ST_GeometryFromText('" + str(geometry) + "')),4326) WHERE " + pkey + "=" + cid, ())
                    else:
                        if dcols[i]["value"] != "":
                            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                                tmp=dcols[i]["value"].split(";")
                                import mapscript
                                myShape=mapscript.shapeObj.fromWKT(geometry)
                                myShape.project(mapscript.projectionObj("epsg:4326"),mapscript.projectionObj(tmp[1]))
                                #val_sufix += "STGeomFromText("+ myShape.toWKT() +")"
                                cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=geometry::STGeomFromText('" + str(myShape.toWKT()) + "',"+(tmp[1].replace("epsg:",""))+") WHERE " + pkey + "=" + cid, ())
                            else:
                                zoo.info("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_Transform(ST_SetSRID(ST_Multi(ST_GeometryFromText('" + str(geometry) + "')),4326),"+(dcols[i]["value"].replace("EPSG:",""))+") WHERE " + pkey + "=" + cid)
                                #cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_Transform(ST_SetSRID(ST_Multi(ST_GeometryFromText('" + str(geometry) + "')),4326),"+(dcols[i]["value"].replace("EPSG:",""))+") WHERE " + pkey + "=" + cid, ())
                                cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_Transform(ST_SetSRID((ST_GeometryFromText('" + str(geometry) + "')),4326),"+(dcols[i]["value"].replace("EPSG:",""))+") WHERE " + pkey + "=" + cid, ())
                        else:
                            #cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_SetSRID(ST_Multi(ST_GeometryFromText('" + str(geometry) + "')),4326) WHERE " + pkey + "=" + cid, ())
                            cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=ST_SetSRID((ST_GeometryFromText('" + str(geometry) + "')),4326) WHERE " + pkey + "=" + cid, ())

            if dcols[i]["type"] == "varchar(32)":
                zoo.info(dcols[i])
                zoo.info("+++++ OM +++++" + str(dvals))
                cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=" + dvals[0] + " WHERE " + pkey + "=" + cid)

            if dcols[i]["type"] == "bytea":
                zoo.info(dcols[i])
                # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                if "id" in inputs:
                    cid = inputs["id"]["value"]
                try:
                    content = packFile(conf, tuple[dcols[i]["name"]], dcols[i]["name"])
                    zoo.info(str(content))
                    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                        import pyodbc
                        cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=? WHERE " + pkey + "=" + cid, (pyodbc.Binary(content),))
                    else:
                        cur.execute("UPDATE " + tableName + " set " + dcols[i]["name"] + "=%s WHERE " + pkey + "=" + cid, (psycopg2.Binary(content),))
                except Exception as e:
                    zoo.error(str(e))

            if dcols[i]["type"] == "tbl_linked":
                lcomponents = dcols[i]["value"].split(';')
                # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
                if "id" in inputs:
                    cid = inputs["id"]["value"]
                # Remove possible previous tuple refering this element
                try:
                    req = "DELETE FROM " + lcomponents[2] + " where " + lcomponents[0] + " = " + cid
                    zoo.info(str(req))
                    cur.execute(req)
                except:
                    con.conn.commit()
                zoo.error("-------" + str(tuple[dcols[i]["name"]]))
                if dcols[i]["name"] in tuple and tuple[dcols[i]["name"]] is not None:
                    for j in range(len(tuple[dcols[i]["name"]])):
                        try:
                            req = "INSERT INTO " + lcomponents[2] + " (" + lcomponents[0] + "," + lcomponents[1] + ") VALUES (" + cid + "," + str(tuple[dcols[i]["name"]][j]) + ")"

                            zoo.info(str(req))
                            cur.execute(req)
                        except:
                            con.conn.commit()
            con.conn.commit()

        outputs["Result"]["value"] = zoo._("Done")
    except Exception as e:
        import traceback
        conf["lenv"]["message"] = zoo._("An error occured when processing your request: ") + str(e) + "\n" + str(traceback.format_exc())
        return zoo.SERVICE_FAILED
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED

def replaceFilter(conf,value):
    result=value;
    for a in conf["senv"]:
        result=result.replace("[_senv_"+a+"_]",conf["senv"][a])
    return result

def _clientPrint(conf, inputs, cur, tableId, cid, filters, operators=None, rid=None, rName=None):
    import json
    try:
        req = "SELECT name from mm_tables.p_tables where id=" + tableId
        res = cur.execute(req)
        vals = cur.fetchone()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a tableId: ") + req + str(e)
        return None
    tableName = vals[0]
    if rName is None:
        if rid is not None:
            clause = " AND mm_tables.p_reports.id = " + rid
        else:
            clause = ""
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            req = "SELECT mm_tables.p_reports.id,mm_tables.p_reports.name,mm_tables.p_reports._file,mm_tables.p_reports.clause,mm_tables.p_reports.element FROM mm_tables.p_reports,mm.groups,mm_tables.p_report_groups where mm.groups.id=mm_tables.p_report_groups.gid and mm_tables.p_reports.id=mm_tables.p_report_groups.rid and ptid=" + tableId + clause + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + \
                    conf["senv"]["id"] + "') order by mm_tables.p_reports.id asc"
        else:
            req = "SELECT mm_tables.p_reports.id,mm_tables.p_reports.name,mm_tables.p_reports.file,mm_tables.p_reports.clause,mm_tables.p_reports.element FROM mm_tables.p_reports,mm.groups,mm_tables.p_report_groups where mm.groups.id=mm_tables.p_report_groups.gid and mm_tables.p_reports.id=mm_tables.p_report_groups.rid and ptid=" + tableId + clause + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + \
                    conf["senv"]["id"] + "') order by mm_tables.p_reports.id asc"
    else:
        rName_ext=adapt(rName)
        rName_ext.encoding="utf-8"
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            req = "SELECT mm_tables.p_reports.id,mm_tables.p_reports.name,mm_tables.p_reports._file,mm_tables.p_reports.clause,mm_tables.p_reports.element FROM mm_tables.p_reports,mm.groups,mm_tables.p_report_groups where mm.groups.id=mm_tables.p_report_groups.gid and mm_tables.p_reports.id=mm_tables.p_report_groups.rid and ptid=" + tableId + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + \
                    conf["senv"]["id"] + "') and mm_tables.p_reports.name=" + str(rName_ext) + " order by mm_tables.p_reports.id asc"
        else:
            req = "SELECT mm_tables.p_reports.id,mm_tables.p_reports.name,mm_tables.p_reports.file,mm_tables.p_reports.clause,mm_tables.p_reports.element FROM mm_tables.p_reports,mm.groups,mm_tables.p_report_groups where mm.groups.id=mm_tables.p_report_groups.gid and mm_tables.p_reports.id=mm_tables.p_report_groups.rid and ptid=" + tableId + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + \
                    conf["senv"]["id"] + "') and mm_tables.p_reports.name=" + str(rName_ext) + " order by mm_tables.p_reports.id asc"
    zoo.info(str(req))
    res = cur.execute(req)
    ovals0 = cur.fetchall()
    zoo.info(str(ovals0))
    if len(ovals0) == 0:
        conf["lenv"]["message"] = zoo._("Unable to find any report for the current element")
        return None
    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
        req = "SELECT * FROM (SELECT mm_tables.p_report_fields.rid as rid,mm_tables.p_report_fields.id,mm_tables.p_report_fields.name,(select code from mm_tables.ftypes where mm_tables.ftypes.id=mm_tables.p_report_fields.ftype) as code,mm_tables.p_report_fields.value FROM mm_tables.p_reports,mm_tables.p_report_fields,mm.groups,mm_tables.p_report_groups where mm_tables.p_reports.id=mm_tables.p_report_fields.rid and mm.groups.id=mm_tables.p_report_groups.gid and mm_tables.p_reports.id=mm_tables.p_report_groups.rid and ptid=" + tableId + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + \
                conf["senv"]["id"] + "') and mm_tables.p_reports.id=" + str(ovals0[0][0]) + ") as a ORDER BY a.id"
    else:
        req = "SELECT * FROM (SELECT DISTINCT ON(mm_tables.p_report_fields.name) mm_tables.p_report_fields.rid as rid,mm_tables.p_report_fields.id,mm_tables.p_report_fields.name,(select code from mm_tables.ftypes where mm_tables.ftypes.id=mm_tables.p_report_fields.ftype),mm_tables.p_report_fields.value FROM mm_tables.p_reports,mm_tables.p_report_fields,mm.groups,mm_tables.p_report_groups where mm_tables.p_reports.id=mm_tables.p_report_fields.rid and mm.groups.id=mm_tables.p_report_groups.gid and mm_tables.p_reports.id=mm_tables.p_report_groups.rid and ptid=" + tableId + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + \
                conf["senv"]["id"] + "') and mm_tables.p_reports.id=" + str(ovals0[0][0]) + ") as a ORDER BY a.id"
    zoo.info(str(req))
    zoo.info("SQL")
    res = cur.execute(req)
    vals0 = cur.fetchall()
    rcolumns = []
    postDocuments = []
    for i in range(len(vals0)):
        zoo.info(vals0[i][3])
        zoo.info(str(vals0[i]))
        if vals0[i][3] != "multiple_doc":
            if vals0[i][3] != "filter":
                rcolumns += [vals0[i][4]]
            else:
                rcolumns += [replaceFilter(conf,vals0[i][4])]
        else:
            postDocuments += [vals0[i][4]]
    rfields = (",".join(rcolumns))
    zoo.info("*********** [" + str(postDocuments) + "] ***********")
    zoo.info("*********** [" + str(ovals0) + "] ***********")
    zoo.info("*********** [" + str(rcolumns) + "] ***********")
    import time
    #time.sleep(10)
    if not (ovals0[0][4]):
        clause = ovals0[0][3]
        if len(filters) > 0:
            if clause != "":
                clause += " AND " + buildClause(filters,operators)
            else:
                clause = buildClause(filters,operators)
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            rfields = rfields.replace("[_CLAUSE_]", clause.replace("true","1=1"))
        else:
            rfields = rfields.replace("[_CLAUSE_]", clause)
        # rreq="SELECT DISTINCT "+rfields+" from "+tableName+" where "+clause
        rreq = "SELECT " + rfields
    else:
        if len(filters) > 0:
            clause = buildClause(filters,operators)
        else:
            clause=""
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            rfields = rfields.replace("[_CLAUSE_]", clause.replace("true","1=1"))
        else:
            rfields = rfields.replace("[_CLAUSE_]", clause)
        zoo.info("*********** [" + str(clause) + "] ***********")
        pKey=fetchPrimaryKey(cur,tableName)
        if clause!="":
            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                rreq = "SELECT " + rfields + " from " + tableName + " where " + pKey + "=" + cid + " AND " + ovals0[0][3] + " AND " + clause.replace("true","1=1")
            else:
                rreq = "SELECT " + rfields + " from " + tableName + " where "+ pKey +"=" + cid + " AND " + ovals0[0][3] + " AND " + clause
        else:
            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                rreq = "SELECT " + rfields + " from " + tableName + " where "+ pKey +"=" + cid + " AND " + ovals0[0][3].replace("true","1=1")
            else:
                rreq = "SELECT " + rfields + " from " + tableName + " where "+ pKey +"=" + cid + " AND " + ovals0[0][3]
    zoo.info(" *$*$*$ RREQ "+rreq)
    zoo.info(str(vals0))
    res = cur.execute(rreq)
    rrvals = None
    if ovals0[0][4]:
        rrvals = cur.fetchall()
        rvals = rrvals[0]
    else:
        rvals = cur.fetchone()
    zoo.info("*********** [" + str(rvals) + "] ***********")
    if "noPrint" in inputs and inputs["noPrint"]["value"] == "true":
        return rvals
    lfile = unpackFile(conf, ovals0[0][2])
    # fres[ovals[i][0]][cvals[j][1]]={"type":"bytes","filename":file["name"],"fileurl":file["name"].replace(conf["main"]["tmpPath"],conf["main"]["tmpUrl"])}

    docPath = conf["main"]["tmpPath"] + "/report_" + tableName.replace(".", "_") + "_" + cid + "_" + conf["lenv"]["usid"] + "_init.odt"
    docPath1 = conf["main"]["tmpPath"] + "/report_" + tableName.replace(".", "_") + "_" + cid + "_" + conf["lenv"]["usid"] + "_final.odt"
    tDocPath = []
    lexts = ["html", "pdf", "doc"]
    for i in range(len(lexts)):
        tDocPath += [conf["main"]["tmpPath"] + "/report_" + tableName.replace(".", "_") + "_" + cid + "_" + conf["lenv"]["usid"] + "_final." + lexts[i]]
    myFile = open(docPath, "wb")
    myFile.write(lfile["content"])
    myFile.close()

    conf["lenv"]["message"] = "Start SQL query"
    try:
        zoo.update_status(conf, 10)
    except Exception as e:
        zoo.error(str(e))
    from subprocess import Popen, PIPE
    import os
    # sys.stderr.flush()
    script = "import sys\nimport shutil\nimport time\n"
    script += "import print.PaperMint as PaperMint\n"
    script += "pm=PaperMint.LOClient()\n"
    #script += "pm.setVar('tmpPath','"+conf["main"]["tmpPath"]+"')\n"
    #script += "pm.setVar('usid','"+conf["lenv"]["usid"]+"')\n"
    script += "pm.loadDoc('" + docPath + "')\n"
    #import json
    #script += "pm.setConf('"+ json.dumps(conf) +"')\n"
    rcnt = 0
    pcnt = 0
    for i in range(len(vals0)):
        if rName is None:
            conf["lenv"]["message"] = "Run SQL query"
            try:
                zoo.update_status(conf, 10 + (((i + 1) * 50) / len(vals0)))
            except Exception as e:
                zoo.error(str(e))

        if vals0[i][3] == "default":
            script += "pm.searchAndReplace('[_" + vals0[i][2] + "_]'," + json.dumps(rvals[rcnt]) + ")\n"
            rcnt += 1
        else:
            if vals0[i][3] == "html":
                script += "pm.goToWord('[_" + vals0[i][2] + "_]');"
                fname = conf["main"]["tmpPath"] + "/report_tmp_" + conf["lenv"]["usid"] + ".html"
                hfile = open(fname, "w")
                hfile.write(rvals[rcnt])
                hfile.close()
                script += "pm.insertDoc(\"" + fname + "\")\n"
                script += "pm.searchAndReplace('[_" + vals0[i][2] + "_]',\"\")\n"
                rcnt += 1
            else:
                if vals0[i][3] == "paragraph_sql_array":
                    #script += "pm.addParagraph('[_" + vals0[i][2] + "_]'," + json.dumps(eval(str(rvals[rcnt], "utf-8").replace("'{", "[").replace("}'", "]"))) + ")\n"
                    script += "pm.addParagraph('[_" + vals0[i][2] + "_]'," + json.dumps(eval(str(str(rvals[rcnt]), "utf-8").replace("'{", "[").replace("}'", "]"))) + ")\n"
                    rcnt += 1
                else:
                    if vals0[i][3] == "sql_array":
                        zoo.info("*** 0 ***" + str(rvals[rcnt]))
                        zoo.info("*** 1 ***" + str(rvals[rcnt]).replace("'{", "[").replace("}'", "]").replace("{", "[").replace("}", "]").replace('\\\\',''))
                        cval1=str(rvals[rcnt]).replace("'{", "[").replace("}'", "]").replace("{", "[").replace("}", "]").replace('\\\\','')
                        zoo.info("*** 2 ***" + str(cval1))
                        try:
                            script += "pm.addTable('[_" + vals0[i][2] + "_]'," + json.dumps(eval(cval1)).replace(", null", "") + ")\n"
                        except:
                            script += "pm.addTable('[_" + vals0[i][2] + "_]'," + json.dumps(cval1).replace(", null", "") + ")\n"
                        rcnt += 1
                    else:
                        if vals0[i][3] == "diagram":
                            try:
                                # script+="pm.statThis('[_"+vals0[i][2]+"_]',"+json.dumps(eval(unicode(str(rvals[rcnt]),"utf-8").replace("'{","[").replace("}'","]")),ensure_ascii=False)+")\ntime.sleep(0.01)\n"
                                script += "pm.statThis('[_" + vals0[i][2] + "_]'," + str(rvals[rcnt]).replace("'{", "[").replace("}'", "]").replace("\\","").replace("\n","") + ")\ntime.sleep(1)\n"
                                script += "print('" + vals0[i][2] + "',file=sys.stderr)\nsys.stderr.flush()\ntime.sleep(1)\n"
                            except Exception as e:
                                zoo.error("ERROR 0 !")
                                zoo.error(str(e))
                                # sys.setdefaultencoding('utf8')
                                try:
                                    script += "pm.statThis('[_" + vals0[i][2] + "_]'," + json.dumps(eval(str(rvals[rcnt]).replace("'{", "[").replace("}'", "]").replace("\\","").replace("\n",""))) + ")\ntime.sleep(0.01)\n"
                                    script += "print('" + vals0[i][2] + "',file=sys.stderr)\nsys.stderr.flush()\n"
                                except Exception as e:
                                    zoo.error("ERROR 1 !")
                                    zoo.error(str(e))

                            rcnt += 1
                        else:
                            if vals0[i][3] == "multiple_doc":
                                tmp = postDocuments[pcnt].split(';')
                                zoo.info("**** TMP **** "+str(tmp))
                                if len(tmp)>=2:
                                    f = fetchPrimaryKey(cur, tableName)
                                    f1 = fetchPrimaryKey(cur, tmp[1])
                                    tmp_ext=adapt(tmp[1])
                                    tmp_ext.encoding="utf-8"
                                    req1 = "(SELECT id from mm_tables.p_tables where CAST(name as varchar)=" + str(tmp_ext) + ")"
                                    req = "SELECT CAST(" + f1 + " as varchar) from " + tmp[1] + " WHERE " + tmp[0] + "=(select " + f + " from " + tableName + " where " + f + "=" + cid + " AND " + ovals0[0][3] + ")"
                                    if len(tmp) == 4:
                                        req += " ORDER BY " + tmp[3] + " desc" 
                                    zoo.info(str(req))
                                    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                                        cur.execute(req.replace("true","1=1"))
                                    else:
                                        cur.execute(req)
                                    lvals = cur.fetchall()
                                    for j in range(len(lvals)):
                                        ldocs = _clientPrint(conf, inputs, cur, req1, lvals[j][0], filters, operators, rid, tmp[2])
                                        zoo.info(str(ldocs))
                                        zoo.info(conf["lenv"]["message"])
                                        # if j==0:
                                        script += "pm.goToWord('[_" + vals0[i][2] + "_]')\n"
                                        script += "pm.insertDoc(\"" + ldocs[0] + "\")\n"
                                        script += 'pm.doc.Text.insertString( pm.cursor, "[_' + vals0[i][2] + '_]\\n" , 0 )\n'
                                        #script += 'pm.doc.Text.insertString( pm.cursor, "[_' + vals0[i][2] + '_]" , 0 )\n'
                                        #script += "from com.sun.star.text.ControlCharacter import PARAGRAPH_BREAK, LINE_BREAK\n"
                                        #script += "pm.doc.Text.insertControlCharacter( pm.cursor, PARAGRAPH_BREAK , 0 )\n"
                                        #script += "pm.doc.Text.insertControlCharacter( pm.cursor, LINE_BREAK , 0 )\n"
                                        #script += "pm.searchAndReplace('[_" + vals0[i][2] + "_]',\"\")\n"
                                        #script += 'pm.doc.Text.insertString( pm.cursor, "[_' + vals0[i][2] + '_]" , 0 )\n'
                                        #script += "pm.doc.Text.insertControlCharacter( pm.cursor, LINE_BREAK , 0 )\n"
                                        #script += "pm.doc.Text.insertControlCharacter( pm.cursor, PARAGRAPH_BREAK , 0 )\n"
                                        if j + 1 == len(lvals):
                                            script += "pm.searchAndReplace('[_" + vals0[i][2] + "_]',\"\")\n"
                                    pcnt += 1
                            else:
                                toAppend=""
                                tmp=json.loads(inputs["filter_labels"]["value"])
                                if len(tmp)==0:
                                    tmp=[zoo._("None")]
                                script += "pm.searchAndReplace('[_" + vals0[i][2] + "_]'," + json.dumps(zoo._("General filter: ")+rvals[rcnt]+"\n"+zoo._("Personalized filter: ")+("\n".join(tmp)).replace("<","de fin :").replace(">","de début :")) + ")\n"
                                rcnt += 1

    script += "pm.saveDoc('" + docPath1 + "')\n"
    if rName is None:
        for i in range(len(lexts)):
            script += "pm.saveDoc('" + tDocPath[i] + "')\n"
    zoo.info(str(script))
    script += "pm.unloadDoc('" + docPath + "')\nquit()\n"
    conf["lenv"]["message"] = "Start PaperMint client"
    zoo.update_status(conf, 50)
    err_log = open(conf["main"]["tmpPath"] + '/tmp_err_log_file_' + conf["lenv"]["usid"], 'w')
    os.dup2(err_log.fileno(), sys.stderr.fileno())
    scriptFile = conf["main"]["tmpPath"] + "/script_" + conf["lenv"]["usid"] + ".py"
    f = open(scriptFile, "w")
    f.write(script.replace("null","'Néant'"))
    f.close()

    # process = Popen([conf["oo"]["path"],scriptFile],stdin=PIPE,stdout=PIPE)
    process = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)
    lines = open(scriptFile, "r").read().split("\n")
    for i in range(len(lines)):
        # conf["lenv"]["message"]=zoo._("Produce file step: ")+str(i)
        # zoo.update_status(conf,50+(i*35/len(lines)))
        sys.stderr.write(lines[i] + "\r\n")
        sys.stderr.flush();
        process.stdin.write(bytes(lines[i]+ "\n\n","utf-8"))
        process.stdin.flush();
    # process.stdin.write(script)
    process.stdin.flush()
    process.stdin.close()
    conf["lenv"]["message"] = str(process.stdout.readline())
    sys.stderr.flush()
    process.wait()
    conf["lenv"]["message"] = "End PaperMint client"
    zoo.update_status(conf, 85)
    if rName is None:
        return [docPath1] + tDocPath
    else:
        return [docPath1]


def clientPrint(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    fres = {}
    if "rid" in inputs:
        docs = _clientPrint(conf, inputs, cur, inputs["tableId"]["value"], inputs["id"]["value"], filters=json.loads(inputs["filters"]["value"]), rid=inputs["rid"]["value"])
    else:
        docs = _clientPrint(conf, inputs, cur, inputs["tableId"]["value"], inputs["id"]["value"], filters=json.loads(inputs["filters"]["value"]))

    if "noPrint" in inputs and inputs["noPrint"]["value"] == "true":
        outputs["Result"]["value"] = json.dumps(docs)
        return zoo.SERVICE_SUCCEEDED

    for i in range(len(docs)):
        docs[i] = docs[i].replace(conf["main"]["tmpPath"], conf["main"]["tmpUrl"])
    outputs["Result"]["value"] = json.dumps(docs)
    return zoo.SERVICE_SUCCEEDED


def clientView(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    fres = {}
    try:
        req = "SELECT name from mm_tables.p_tables where id=" + inputs["tableId"]["value"]
        res = cur.execute(req)
        vals = cur.fetchone()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a tableId: ") + req + str(e)
        return zoo.SERVICE_FAILED
    tableName = vals[0]
    req = "SELECT mm_tables.p_editions.id,mm_tables.p_editions.name FROM mm_tables.p_editions,mm.groups,mm_tables.p_edition_groups where mm.groups.id=mm_tables.p_edition_groups.gid and mm_tables.p_editions.id=mm_tables.p_edition_groups.eid and ptid=" + inputs["tableId"]["value"] + " and mm.groups.id in (SELECT id from mm.groups where " + splitGroup(conf) + ") and (mm_tables.p_editions.step=-2 or mm_tables.p_editions.step=-10 or mm_tables.p_editions.step>=0 ) order by mm_tables.p_editions.step asc"
    zoo.error(" -------- 0 -------- ")
    zoo.error(str(req))
    zoo.error(" -------- 0 -------- ")
    res = cur.execute(req)
    ovals = cur.fetchall()
    tableId = ovals[0][0]
    zoo.error(str(ovals))
    req = "SELECT * FROM (SELECT  mm_tables.p_edition_fields.edition as eid,mm_tables.p_edition_fields.id,mm_tables.p_edition_fields.name,(select code from mm_tables.ftypes where mm_tables.ftypes.id=mm_tables.p_edition_fields.ftype) as tt,mm_tables.p_edition_fields.value,mm_tables.p_edition_fields.edition FROM mm_tables.p_editions,mm_tables.p_edition_fields,mm.groups,mm_tables.p_edition_groups where mm_tables.p_editions.id=mm_tables.p_edition_fields.eid and mm.groups.id=mm_tables.p_edition_groups.gid and mm_tables.p_editions.id=mm_tables.p_edition_groups.eid and ptid=" + \
          inputs["tableId"]["value"] + " and mm.groups.id in (SELECT id_group from mm.user_group where mm.user_group.id_user='" + conf["senv"]["id"] + "') and (mm_tables.p_editions.step=-2 or mm_tables.p_editions.step>=0 )) as a ORDER BY a.id"
    zoo.error(" -------- 1 -------- ")
    zoo.error(str(req))
    zoo.error(" -------- 1 -------- ")
    res = cur.execute(req)
    vals = cur.fetchall()
    zoo.error(str(vals))
    columns = []
    fcolumns = []
    rcolumns = []
    files = {}
    for i in range(len(vals)):
        zoo.info(vals[i][3])
        if vals[i][2].count("unamed") == 0 or (vals[i][3] == "tbl_linked" and vals[i][3] != "link"):
            columns += [vals[i][2]]
        else:
            # columns+=[vals[i][2]]
            fcolumns += [vals[i][2]]
        if vals[i][3] == "tbl_linked":
            components = vals[i][4].split(';')
            zoo.info(str(components))
            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                rcolumns += ["(SELECT (SELECT " + components[1] + " FROM " + components[2] + " WHERE " + components[0] + "=" + tableName + ".id)) as " + vals[i][2]]
            else:
                rcolumns += ["(SELECT ARRAY(SELECT " + components[1] + " FROM " + components[2] + " WHERE " + components[0] + "=" + tableName + ".id)) as " + vals[i][2]]
        else:
            if vals[i][3] == "bytea":
                files[vals[i][2]] = 1
            if vals[i][3] == "geometry":
                if vals[i][4]!="":
                    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                        rcolumns += ["\""+vals[i][2]+"\".STAsText() as " + vals[i][2]]
                    else:
                        rcolumns += ["ST_AsText(ST_Transform(" + vals[i][2] + ",4326)) as " + vals[i][2]]
                else:
                    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                        rcolumns += ["\""+vals[i][2]+"\".STAsText() as " + vals[i][2]]
                    else:
                        rcolumns += ["ST_AsText(" + vals[i][2] + ") as " + vals[i][2]]
            else:
                if vals[i][3] != "link" and vals[i][3] != "tbl_link" and vals[i][2].count("unamed") == 0:
                    if vals[i][5]:
                        if vals[i][3].count("date") > 0:
                            if vals[i][3] == "date":
                                rcolumns += [vals[i][2] + "::text"]
                            else:
                                if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
                                    rcolumns += ["CAST(CAST(" + vals[i][2] + " as datetimeoffset) as varchar)"]
                                else:
                                    rcolumns += ["split_part((" + vals[i][2] + "::timestamp AT TIME ZONE 'Z')::text,' ',1)||'T'||split_part(split_part((" + vals[i][2] + "::timestamp AT TIME ZONE 'Z')::text,' ',2),':',1)||':'||split_part(split_part((" + vals[i][2] + "::timestamp AT TIME ZONE 'Z')::text,' ',2),':',2)"]
                        else:
                            rcolumns += [vals[i][2]]
                    else:
                        if vals[i][3].count("date") > 0:
                            if vals[i][3] == "date":
                                rcolumns += [vals[i][2] + "::text"]
                            else:
                                rcolumns += ["split_part((" + vals[i][2] + "::timestamp AT TIME ZONE 'Z')::text,' ',1)||'T'||split_part(split_part((" + vals[i][2] + "::timestamp AT TIME ZONE 'Z')::text,' ',2),':',1)||':'||split_part(split_part((" + vals[i][2] + "::timestamp AT TIME ZONE 'Z')::text,' ',2),':',2)"]
                        else:
                            rcolumns += [vals[i][2]]
    rfields = (",".join(rcolumns))
    columns += fcolumns
    zoo.info(str(rfields))
    f = fetchPrimaryKey(cur, tableName)
    if rfields == "":
        rfields = "'None'"
    rreq = "SELECT " + rfields + " from " + tableName + " where " + f + "=" + inputs["id"]["value"]
    zoo.info(" --------2 -------- ")
    zoo.info(str(rreq))
    zoo.info(str(columns))
    zoo.info(" ------- 2 --------- ")
    res = cur.execute(rreq)
    rvals = cur.fetchone()
    restrictedTypes = ["Datetime", "Date", "Boolean", "Reference"]
    for i in range(len(ovals)):
        fres[ovals[i][0]] = {}
        req = "SELECT * FROM (SELECT mm_tables.p_edition_fields.edition as eid,mm_tables.p_edition_fields.id,mm_tables.p_edition_fields.name,(select name from mm_tables.ftypes where id=mm_tables.p_edition_fields.ftype) as tt ,mm_tables.p_edition_fields.dependencies, mm_tables.p_edition_fields.value FROM mm_tables.p_editions,mm_tables.p_edition_fields,mm.groups,mm_tables.p_edition_groups where mm_tables.p_editions.id=mm_tables.p_edition_fields.eid and mm.groups.id=mm_tables.p_edition_groups.gid and mm_tables.p_editions.id=" + str(
            ovals[i][0]) + " and mm_tables.p_editions.id=mm_tables.p_edition_groups.eid and ptid=" + inputs["tableId"]["value"] + " and mm.groups.id in (SELECT id from mm.groups where " + splitGroup(conf) + ")) as a ORDER BY a.id"
        zoo.info(" ------- 3 --------- ")
        zoo.info(str(req))
        zoo.info(" ------- 3 --------- ")
        res = cur.execute(req)
        cvals = cur.fetchall()
        for j in range(len(cvals)):
            zoo.info("\n ***** START --  "+str(cvals[j]))
            zoo.info("\n ***** START --  "+str(columns))
            zoo.info("\n ***** START --  "+str(rvals))
            # TODO: confirm assumption: "files" is a Python 3 dictionary object
            if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL" and cvals[j][3]=="Geometry":
                zoo.info("Geometry")
                lObj=cvals[j][5].split(";")
                myWkt=rvals[columns.index(cvals[j][2])]
                import mapscript 
                myShape=mapscript.shapeObj.fromWKT(myWkt)
                myShape.project(mapscript.projectionObj(lObj[1]),mapscript.projectionObj("epsg:4326"))
                fres[ovals[i][0]][cvals[j][1]] = myShape.toWKT()
            elif cvals[j][2] in files:
                if rvals[rcolumns.index(cvals[j][2])] is not None:
                    file = unpackFile(conf, rvals[rcolumns.index(cvals[j][2])])
                    fres[ovals[i][0]][cvals[j][1]] = {"type": "bytes", "filename": file["name"], "fileurl": file["name"].replace(conf["main"]["tmpPath"], conf["main"]["tmpUrl"])}
            else:
                if rvals is not None and columns.count(cvals[j][2]) > 0 and columns.index(cvals[j][2]) < len(rvals):
                    if restrictedTypes.count(cvals[j][3]) > 0:
                        if cvals[j][3] == "Reference":
                            zoo.info("*** START ***\n"+str(cvals[j]))
                            try:
                                import json
                                myObj = json.loads(cvals[j][4])
                                zoo.info("*** START ***\n"+str(myObj))
                                # TODO: confirm assumption: myObj[0] is a Python 3 dictionary object
                                if "myself" in myObj[0]:
                                    myObj[0]["myself"]
                                    zoo.info(" **** MYSELF: " + str(myObj[0]["myself"]))
                                    zoo.info(" **** MYSELF: " + str(cvals[j][5]))
                                    zoo.info(" **** MYSELF: " + str(len(myObj[0]["myself"])))
                                    zoo.info(" **** MYSELF: " + str(myList(myObj[0]["myself"][0].keys())))
                                    alphabet = "abcdefghijklmnopqrstuvwxxyz"
                                    tmpCnt = 0
                                    tmpReq = ""
                                    tmpParams = ""
                                    tmpClause = ""
                                    hasDep = False
                                    initialReq = cvals[j][5]
                                    if len(myObj[0]["myself"]) >= 1:
                                        for uv in range(len(myObj[0]["myself"])):
                                            zoo.info(str(myObj[0]["myself"][uv]))
                                            for uv1 in (myObj[0]["myself"][uv]):
                                                zoo.info(str(myObj[0]["myself"][uv][uv1]))
                                                zoo.info(str(myObj[0]["myself"][uv][uv1]["sql_query"]) + " AS " + alphabet[tmpCnt])
                                                if tmpParams != "":
                                                    tmpParams += ", "
                                                    tmpReq += ", "
                                                tmpReq += "(" + myObj[0]["myself"][uv][uv1]["sql_query"] + ") AS " + alphabet[tmpCnt]
                                                tmpParams += alphabet[tmpCnt] + "." + myObj[0]["myself"][uv][uv1]["tfield"]
                                                initialReq = initialReq.replace("from", ", " + myObj[0]["myself"][uv][uv1]["tfield"] + " from")
                                                # tmpParams+=alphabet[tmpCnt]+"."+ myObj[0]["myself"][uv][uv1]["tfield"] +"=="
                                                tmpCnt = tmpCnt + 1
                                                # TODO: confirm assumption:  is a Python 3 dictionary object
                                                if "dependents" in myObj[0]["myself"][uv][uv1]:
                                                    for uw in range(len(myObj[0]["myself"][uv][uv1]["dependents"])):
                                                        for uw1 in myObj[0]["myself"][uv][uv1]["dependents"][uw]:
                                                            zoo.info(str(myObj[0]["myself"][uv][uv1]["dependents"][uw][uw1]["sql_query"].replace("from", ", " + myObj[0]["myself"][uv][uv1]["tfield"] + " from")) + " AS " + alphabet[tmpCnt])
                                                            if tmpParams != "":
                                                                tmpParams += ", "
                                                            if tmpReq != "":
                                                                tmpReq += ", "
                                                            tmpParams += alphabet[tmpCnt] + "." + myObj[0]["myself"][uv][uv1]["dependents"][uw][uw1]["tfieldf"]
                                                            tmpClause += alphabet[tmpCnt - 1] + "." + myObj[0]["myself"][uv][uv1]["tfield"] + "=" + alphabet[tmpCnt] + "." + myObj[0]["myself"][uv][uv1]["tfield"];
                                                            tmpReq += " (" + myObj[0]["myself"][uv][uv1]["dependents"][uw][uw1]["sql_query"].replace("from", ", " + myObj[0]["myself"][uv][uv1]["tfield"] + " from") + ") AS " + alphabet[tmpCnt]
                                                            tmpCnt = tmpCnt + 1
                                                            tmpReq += ", (" + initialReq.replace("from", ", " + myObj[0]["myself"][uv][uv1]["dependents"][uw][uw1]["tfieldf"] + " from") + ") AS " + alphabet[tmpCnt]
                                                            tmpClause += " AND " + alphabet[tmpCnt - 1] + "." + myObj[0]["myself"][uv][uv1]["dependents"][uw][uw1]["tfieldf"] + "=" + alphabet[tmpCnt] + "." + myObj[0]["myself"][uv][uv1]["dependents"][uw][uw1]["tfieldf"];
                                                            tmpClause += " AND " + alphabet[tmpCnt] + ".id=" + str(rvals[columns.index(cvals[j][2])])
                                                            hasDep = True
                                        zoo.info(str(tmpParams))
                                        tmpRes = []
                                        if not (hasDep):
                                            fres[ovals[i][0]][str(cvals[j][1]) + "_bind"] = []
                                            zoo.info(str(tmpClause))
                                            tmpReq += ", (" + initialReq + ") AS a1"
                                            for uv2 in range(len(myObj[0]["myself"])):
                                                for uv3 in myObj[0]["myself"][uv2]:
                                                    if tmpClause != "":
                                                        tmpClause += " " + myObj[0]["myself"][uv2][uv3]["cond_join"] + " "
                                                    tmpClause += alphabet[uv2] + "." + myObj[0]["myself"][uv2][uv3]["tfield"] + "=a1." + myObj[0]["myself"][uv2][uv3]["tfield"]
                                                    tmpRes += [uv3]
                                            tmpClause += " AND a1.id=" + str(rvals[columns.index(cvals[j][2])])
                                        zoo.info(str(tmpReq))
                                        zoo.info(str(tmpParams))
                                        zoo.info(str(tmpClause))
                                        if tmpClause != "":
                                            tmpReq = "SELECT " + tmpParams + " FROM " + tmpReq + " WHERE " + tmpClause
                                            zoo.info(str(tmpReq))
                                            res10 = cur.execute(tmpReq)
                                            res10 = cur.fetchone()
                                            fres[ovals[i][0]][str(cvals[j][1]) + "_mdep"] = []
                                            for uv0 in range(tmpCnt):
                                                fres[ovals[i][0]][str(cvals[j][1]) + "_mdep"] += [str(res10[uv0])]
                                        if len(tmpRes) > 0:
                                            fres[ovals[i][0]][str(cvals[j][1]) + "_bind"] += [str(tmpRes)]
                                        zoo.info(str(tmpReq))
                                else:
                                    fres[ovals[i][0]][cvals[j][1]] = rvals[columns.index(cvals[j][2])].title()


                            except Exception as e:
                                import inspect
                                s = inspect.stack()
                                zoo.error(s[0])
                                zoo.error("File:"+s[0][3]+" ("+str(s[0][2])+") "+str(e))
                                con.conn.commit()
                                fres[ovals[i][0]][cvals[j][1]] = str(rvals[columns.index(cvals[j][2])])
                        else:
                            if cvals[j][3]=="Date" or cvals[j][3]=="Datetime":
                                fres[ovals[i][0]][cvals[j][1]] = str(rvals[columns.index(cvals[j][2])])
                            else:
                                fres[ovals[i][0]][cvals[j][1]] = rvals[columns.index(cvals[j][2])]
                            zoo.info("+++ DD "+str(j)+" ++++"+str(fres))
                    else:
                        fres[ovals[i][0]][cvals[j][1]] = (rvals[columns.index(cvals[j][2])])
                        zoo.info("+++ DD "+str(j)+" ++++"+str(fres))
                        zoo.info("+++ DD ++++"+str(columns))
                        zoo.info("+++ DD "+str(columns.index(cvals[j][2]))+" ++++"+str(rvals[columns.index(cvals[j][2])]))
                    zoo.info("+++ 0 +++ " + str(cvals[j]))
                else:
                    zoo.info("+++ 1 +++ " + str(cvals[j]))
                    try:
                        import json
                        tmpObj = json.loads(cvals[j][4])
                        tmpReq = ""
                        tmpCnt = 0
                        for vv in range(len(tmpObj)):
                            for ww in tmpObj[vv]:
                                tmpReq += " CASE WHEN " + ww + " is not null THEN " + str(vv) + " ELSE "
                        tmpReq += " -1 "
                        for vv in range(len(tmpObj)):
                            tmpReq += " END "
                        zoo.info("+++ 1 +++ " + str(tmpReq))
                        tmpReq = "SELECT " + tmpReq + " as v FROM " + tableName + " WHERE " + f + "=" + inputs["id"]["value"]
                        res0 = cur.execute(tmpReq)
                        res0 = cur.fetchone()
                        zoo.info("+++ 1 +++ " + str(res0))
                        fres[ovals[i][0]][cvals[j][1]] = res0[0]
                    except Exception as e:
                        zoo.info("+++ 999999 +++ " + str(e))
                        fres[ovals[i][0]][cvals[j][1]] = "Not found"
        # fres["ref"]=inputs["id"]["value"]

    outputs["Result"]["value"] = json.dumps(fres)
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def buildClause(filters,operators=None):
    res = ""
    zoo.info(" ******* *FILTER "+str(filters))
    for i in range(len(filters)):
        if res != "":
            res += " " + filters[i]["linkClause"] + " "
        try:
            lkeys = myList(filters[i].keys())
        except:
            return res
        zoo.error(str(lkeys))
        tres = ""
        for k in range(len(lkeys)):
            zoo.info(lkeys[k])
            if lkeys[k] != "linkClause":
                if tres != "":
                    tres += " AND "
                if operators is not None and lkeys[k] in operators[i]:
                    ops={"eq":"=","lt":"<","gt":">"}
                    tres += "( " + lkeys[k] + " "+ops[operators[i][lkeys[k]]]+" '" + str(filters[i][lkeys[k]]) + "' ) "
                else:
                    try:
                        tmp = int(filters[i][lkeys[k]])
                        tres += "( " + lkeys[k] + " = " + str(int(filters[i][lkeys[k]])) + " ) "
                    except:
                        filters_ext=adapt(filters[i][lkeys[k]].replace("*", "%"))
                        filters_ext.encoding="utf-8"
                        #tres += "( " + lkeys[k] + "::varchar LIKE " + str(filters_ext) + " ) "
                        tres += "( CAST(" + lkeys[k] + " as varchar) LIKE " + str(filters_ext) + " ) "
            zoo.error(str(tres))
        res += " ( " + tres + " ) "
    zoo.error(str(res))
    if res != "":
        res = " ( " + res + " ) "
    zoo.info("CLAUSE BUILT: "+res)
    return res


def parseClause(conf,clause):
    if clause is None:
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            return "1=1"
        else:
            return "true"
    else:
        for i in conf["senv"]:
            clause=clause.replace("[_senv_"+i+"_]",str(conf["senv"][i]))
        zoo.info(" ------ CLAUSE: "+clause)
        zoo.info(" ------ CLAUSE: "+conf["main"]["dbuser"])
        zoo.info(" ------ CLAUSE: "+str("type" in conf[conf["main"]["dbuser"]]))
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL" and clause=="true":
            zoo.info("MSSQL")
            return "1=1"
        else:
            zoo.info("NO MSSQL")
            return clause

def clientViewTable(conf, inputs, outputs):
    import json
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    fres = {}
    try:
        req = "SELECT (select name from mm_tables.p_tables where id=ptid),name,clause from mm_tables.p_views where id=" + inputs["table"]["value"]
        zoo.info(str(req))
        res = cur.execute(req)
        zoo.info(str(req))
        vals = cur.fetchone()
        zoo.info(str(req))
        table = vals[0]
        name = vals[1]
        zoo.info(str(req))
        clause = parseClause(conf,vals[2])
        zoo.info(str(req))
        zoo.info("**** "+clause)
        import datastores.postgis.pgConnection as pg
        if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
            zoo.info(str(req))
            cur.execute(pg.getDescMSSQL(cur, table))
        else:
            zoo.info(str(req))
            cur.execute(pg.getDesc(cur, table))
        defs = cur.fetchall()

    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to identify your parameter as a View Id: ") + req + str(e)
        return zoo.SERVICE_FAILED
    req=None
    if conf["main"]["dbuser"] in conf and "type" in conf[conf["main"]["dbuser"]] and conf[conf["main"]["dbuser"]]["type"]=="MSSQL":
        req = "SELECT mm_tables.p_view_fields.id,mm_tables.p_view_fields.alias,mm_tables.p_view_fields.value,mm_tables.p_view_fields.visible,mm_tables.p_view_fields.search,mm_tables.p_view_fields.class,mm_tables.p_view_fields.name FROM mm_tables.p_views,mm_tables.p_view_fields where mm_tables.p_views.id=mm_tables.p_view_fields.vid and mm_tables.p_view_fields.visible=1 and mm_tables.p_views.id=" + inputs["table"]["value"]
    else:
        req = "SELECT mm_tables.p_view_fields.id,mm_tables.p_view_fields.alias,mm_tables.p_view_fields.value,mm_tables.p_view_fields.visible,mm_tables.p_view_fields.search,mm_tables.p_view_fields.class,mm_tables.p_view_fields.name FROM mm_tables.p_views,mm_tables.p_view_fields where mm_tables.p_views.id=mm_tables.p_view_fields.vid and mm_tables.p_view_fields.visible and mm_tables.p_views.id=" + \
          inputs["table"]["value"]
    classifiers = ["asc", "desc"]
    values = []
    classifier = ""
    zoo.info(str(req))
    res = cur.execute(req)
    vals = cur.fetchall()
    for i in range(len(vals)):
        values += [vals[i][2]]
        if vals[i][5] is not None:
            classifier = table + "." + vals[i][6] + " " + classifiers[(vals[i][5] - 1)]
    if "sortname" in inputs:
        for i in range(len(vals)):
            if vals[i][6] == inputs["sortname"]["value"]:
                classifier = table + "." + vals[i][6] + " " + inputs["sortorder"]["value"]
    if "filters" in inputs:
        filters = json.loads(inputs["filters"]["value"])
        try:
            operators = json.loads(inputs["operators"]["value"])
        except:
            operators = None
        if len(filters) > 0:
            if clause != "":
                clause += " AND " + buildClause(filters,operators)
            else:
                clause = buildClause(filters,operators)
    req1 = "SELECT count(*) FROM " + table + " WHERE " + clause
    zoo.info(str(req1))
    res = cur.execute(req1)
    fres["total"] = cur.fetchone()[0]
    if "page" in inputs:
        fres["page"] = inputs["page"]["value"]
    else:
        fres["page"] = "1"
    con.conn.commit()
    cid = fetchPrimaryKey(cur, table)
    zoo.info("***** " + str(values))
    zoo.info("****** " + str(cid))
    zoo.info("******* " + str(clause))
    zoo.info("******* " + str(classifier))
    req1 = "SELECT " + (",".join(values + [cid])) + " FROM " + table + " WHERE " + clause + " ORDER BY " + classifier + " " + con.writeLimit(inputs["offset"]["value"],inputs["limit"]["value"]) #" LIMIT " + inputs["limit"]["value"] + " OFFSET " + inputs["offset"]["value"]
    if "force" in inputs and inputs["force"]["value"]=="true":
        outputs["Result"]["value"]=json.dumps(req1)
        return zoo.SERVICE_SUCCEEDED
    res = cur.execute(req1)
    vals = cur.fetchall()
    fres["rows"] = []
    zoo.info(str(defs))
    for i in range(len(vals)):
        lobj = {"cell": [], "id": vals[i][len(vals[i]) - 1]}
        for j in range(len(vals[i])):
            if j == 0:
                if defs[j][2] != "bytea":
                    lobj["cell"] += ['<input type="hidden" name="id" value ="' + str(vals[i][len(vals[i]) - 1]) + '" />' + str(vals[i][j])]
                else:
                    lobj["cell"] += ['<input type="hidden" name="id" value ="' + str(vals[i][len(vals[i]) - 1]) + '" />' + "file"]
            else:
                if j + 1 < len(vals[i]):
                    if defs[j][2] != "bytea":
                        lobj["cell"] += [vals[i][j]]
                    else:
                        try:
                            file = unpackFile(conf, vals[i][j])
                            displayName = file["name"].split("/")
                            lobj["cell"] += [displayName[len(displayName) - 1]]
                        except Exception as e:
                            lobj["cell"] += [zoo._("No file found")]
        fres["rows"] += [lobj]
    con.conn.commit()

    outputs["Result"]["value"] = json.dumps(fres)
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED


def massiveImport(conf, inputs, outputs):
    import json
    cid = -1
    con = auth.getCon(conf)
    #con.connect()
    cur = con.conn.cursor()
    req = "SELECT name,type,ofield,otype,tablename,id,isreference,(select count(*)>0 from mm_tables.pages where iid=" + inputs["id"]["value"] + " and isreference) from mm_tables.pages where iid=" + inputs["id"]["value"] + " ORDER BY isreference desc"
    zoo.info(str(req))
    res = cur.execute(req)
    vals = cur.fetchall()
    referenceTable = None
    import vector_tools.vectSql as vectSql
    for i in range(len(vals)):
        conf["lenv"]["message"] = zoo._("Importing " + str(i) + " / " + str(len(vals)))
        try:
            zoo.update_status(conf, int((i * 100) / len(vals)))
        except:
            continue
        req1 = "select name,value,(select code from mm_tables.ftypes where id=type),rlabel from mm_tables.page_fields where pid=" + str(vals[i][5])
        zoo.error(str(req1))
        res1 = cur.execute(req1)
        vals1 = cur.fetchall()
        req2 = "select id,srs from mm_tables.page_geom where pid=" + str(vals[i][5])
        zoo.error(str(req2))
        res2 = cur.execute(req2)
        vals2 = cur.fetchall()
        try:
            zoo.info(str(('SELECT * FROM "' + vals[i][0] + '" order by ' + vals[i][2] + ' ' + vals[i][3] + '').decode('utf-8')))
        except:
            zoo.error(('SELECT * FROM "' + vals[i][0] + '" order by ' + vals[i][2] + ' ' + vals[i][3] + ''))
        res = vectSql.vectInfo(conf, {"q": {"value": str(('SELECT * FROM "' + vals[i][0] + '" order by ' + vals[i][2] + ' ' + vals[i][3] + ''))}, "dstName": {"value": inputs["dstName"]["value"]}}, outputs)
        res = json.loads(outputs["Result"]["value"])
        try:
            zoo.info(str(('SELECT * FROM "' + vals[i][0] + '" order by ' + vals[i][2] + ' ' + vals[i][3] + '').decode('utf-8')))
        except:
            zoo.error(('SELECT * FROM "' + vals[i][0] + '" order by ' + vals[i][2] + ' ' + vals[i][3] + ''))
        tname = "imports.\"tmp_" + vals[i][4].replace(".", "___") + "_" + conf["lenv"]["usid"] + "\""
        tname_1 = vals[i][4]
        # reqTemp0="CREATE TEMPORARY TABLE "+tname+" ("
        reqTemp0 = "CREATE TABLE " + tname + " ("
        reqTemp0_1 = "CREATE TABLE " + tname_1 + " (id serial PRIMARY KEY, "
        reqTemp0_1_suffix = ""
        vals3 = []
        if len(vals2) > 0:
            from geopy import geocoders
            geocoder = eval("geocoders." + conf["main"]["geocoder"] + "()")
            req3 = "select id,column_name,separator from mm_tables.page_geom_fields where pid=" + str(vals2[0][0])
            res3 = cur.execute(req3)
            vals3 = cur.fetchall()
            names = tname_1.split('.')
            if len(vals3) > 2:
                reqTemp0_1_suffix = "SELECT AddGeometryColumn ('" + names[0] + "','" + names[1] + "','wkb_geometry',4326,'POINT',2);"
            else:
                reqTemp0_1_suffix = "SELECT AddGeometryColumn ('" + names[0] + "','" + names[1] + "','wkb_geometry'," + vals2[0][1] + ",'POINT',2);"
            req4 = "select id, "
            for kk in range(len(vals3)):
                if req4 != "select id, ":
                    req4 += " || "
                req_suffix = ""
                if len(vals3) > kk + 1 and vals3[kk + 1][2] is not None:
                    req_suffix = " || $q$" + vals3[kk + 1][2] + "$q$ "
                req4 += " CASE WHEN " + vals3[kk][1] + " is not NULL and " + vals3[kk][1] + " != '(null)' THEN " + vals3[kk][1] + "" + req_suffix + " ELSE '' END "
            req4 += " as address from " + tname_1
        else:
            req4 = None
        reqTemp = reqTemp0
        reqTemp_1 = reqTemp0_1
        cattr = ""
        reqInsertTemp = "INSERT INTO " + tname + " VALUES ("
        reqs = []
        if vals[i][1] == 2:
            for j in vals1:
                if cattr != "":
                    cattr += ", "
                if reqTemp_1 != reqTemp0_1:
                    reqTemp_1 += ", "
                if reqTemp != reqTemp0:
                    reqTemp += ", "
                    reqInsertTemp += ", "
                cattr += j[0]
                reqTemp += j[0] + " " + j[2]
                reqTemp_1 += j[0] + " " + j[2]
                refs = j[1].split('||')
                value = ""
                for k in range(len(refs)):
                    ref = eval(refs[k])
                    if vals[i][2].count("Field") == 0:
                        fieldName = j[3]
                    else:
                        fieldName = "Field" + str(ref[0] + 1)
                    value += res[ref[1]][fieldName]
                try:
                    field_ext=adapt(value.replace(",", "."))
                    field_ext.encoding="utf-8"
                    cur.execute("SELECT " + str(field_ext) + "::" + j[2])
                    reqInsertTemp += str(field_ext) + "::" + j[2]
                except Exception as e:
                    zoo.error(str(e))
                    con.conn.commit()
                    reqInsertTemp += "NULL"
            reqTemp += ")"
            reqTemp_1 += ")"
            reqInsertTemp += ")"
            referenceTable = vals[i][4]
        else:
            for j in vals1:
                if cattr != "":
                    cattr += ", "
                if reqTemp_1 != reqTemp0_1:
                    reqTemp_1 += ", "
                if reqTemp != reqTemp0:
                    reqTemp += ", "
                cattr += j[0]
                reqTemp_1 += j[0] + " " + j[2]
                reqTemp += j[0] + " " + j[2]
            reqTemp += ")"
            if vals[i][6]:
                cattr += ", fkey"
            if vals[i][7] and referenceTable is not None:
                reqTemp_1 += ", fkey int4 references " + referenceTable + "(id) ON DELETE CASCADE"
            reqTemp_1 += ")"
            refs = vals1[0][1].split('||')
            ref = eval(refs[0])
            for k in range(ref[1], len(res)):
                reqIS0 = ""
                reqIS = reqIS0
                reqIS1 = reqIS0
                for j in vals1:
                    if reqIS != reqIS0:
                        reqIS += ", "
                        reqIS1 += ", "
                    refs = j[1].split('||')
                    value = ""
                    valueX = ""
                    for l in range(len(refs)):
                        ref = eval(refs[l])
                        if ref[1] >= 0 and ref[0] >= 0:
                            if vals[i][2].count("Field") == 0:
                                fieldName = j[3]
                            else:
                                fieldName = "Field" + str(ref[0] + 1)
                        else:
                            fieldName = str(j[3]) #.decode("utf-8"))
                        zoo.info(vals[i][2].count("Field"))
                        zoo.info(res[k])
                        value += res[k][fieldName]  # .decode('utf-8')]
                        valueX += "(null)"
                    try:
                        zoo.info("+++++++++++----- 0 -------=++++++++++++++++")
                        zoo.info(adapt(value))
                        zoo.info("+++++++++++----- 1 -------=++++++++++++++++")
                        if isinstance(value, str):
                            zoo.info("+++++++++++----- 11 -------=++++++++++++++++")
                            value = value #.decode("utf-8")
                            zoo.info(str(value))
                        # toto=adapt(value.encode("utf-8"))
                        zoo.info("+++++++++++----- 2 -------=++++++++++++++++")
                        req = ("SELECT " + str(adapt(value)).replace(",", ".") + "::" + j[2])
                        zoo.info("+++++++++++----- 3 -------=++++++++++++++++")
                        cur.execute(req)
                        zoo.info("+++++++++++----- 4 -------=++++++++++++++++")
                        reqIS += str(adapt(value)).replace(",", ".") + "::" + j[2]
                        zoo.info("+++++++++++----- 5 -------=++++++++++++++++")
                    except Exception as e:
                        zoo.error("+++++++++++----- XXXXXXXXXXXXX -------=++++++++++++++++")
                        zoo.error(str(e))
                        zoo.error("+++++++++++----- XXXXXXXXXXXXX -------=++++++++++++++++")
                        con.conn.commit()
                        reqIS += "NULL"
                    try:
                        valueX_ext=adapt(valueX)
                        valueX_ext.encoding="utf-8"
                        cur.execute("SELECT " + str(valueX_ext).replace(",", ".") + "::" + j[2])
                        reqIS1 += str(valueX_ext).replace(",", ".") + "::" + j[2]
                    except:
                        con.conn.commit()
                        reqIS1 += "NULL"
                if reqIS1 != reqIS:
                    zoo.info(str(reqIS))
                    reqs += [reqIS]
            # reqInsertTemp+=",".join(reqs)+")"
        # isReference ?
        reqInsertTemp_1 = "INSERT INTO " + tname_1 + " (" + cattr
        if vals[i][7] and not (vals[i][6]):
            reqInsertTemp_1 += ", fkey) "
            if con.dbtype=="ODBC":
                reqInsertTemp_1 += " OUTPUT Inserted.ID "
            reqInsertTemp_1 += " (SELECT *," + str(cid) + " from " + tname + ")"
        else:
            reqInsertTemp_1 += ") (SELECT * from " + tname + ")"
        if vals[i][6]:
            if con.dbtype!="ODBC":
                reqInsertTemp_1 += " RETURNING id"
        zoo.info("******* 0 *********")
        zoo.info("******* 1 *********")
        zoo.info("******* 2 *********")
        zoo.info("******* 3 *********")
        zoo.info("******* 4 *********")
        con.pexecute_req([reqTemp, {}])
        con.pexecute_req([reqTemp_1, {}])
        if len(reqs) == 0:
            zoo.info("******* 5 *********")
            zoo.info(str(reqInsertTemp))

            zoo.info("****************")
            con.pexecute_req([reqInsertTemp, {}])
        for j in range(len(reqs)):
            reqInsertTemp1 = reqInsertTemp + reqs[j] + ")"
            zoo.info("******* 6 *********")
            zoo.info(str(reqInsertTemp1.encode("utf-8")))
            zoo.info("******* 7 *********")
            con.pexecute_req([reqInsertTemp1.encode("utf-8"), {}])
        con.pexecute_req([reqInsertTemp_1, {}])
        if vals[i][6]:
            cid = con.cur.fetchone()[0]

        if req4 is not None:
            res4 = cur.execute(req4)
            vals4 = cur.fetchall()
            for kk in range(len(vals4)):
                for jj in range(4):
                    try:
                        zoo.info("OK 1")
                        obj = geocoder.geocode(vals4[kk][1].encode('utf-8'))
                        zoo.info("OK 2")
                        zoo.info("OK 3")
                        zoo.info(dir(obj))
                        zoo.info("OK 4")
                        if len(vals3) > 2:
                            srid = 4326
                        else:
                            srid = vlas2[0][1]
                        reqTemp0_1_suffix += "UPDATE " + tname_1 + " set wkb_geometry=ST_SetSRID(ST_GeometryFromText('POINT(" + str(obj.longitude) + " " + str(obj.latitude) + ")')," + str(srid) + ") where id = " + str(vals4[kk][0]) + ";"
                        zoo.info("OK 5")
                        break
                    except Exception as e:
                        zoo.error("Cannot find coordinates for address (" + str(jj) + "): " + vals4[kk][1].encode('utf-8'))
                        zoo.error(str(e))
            con.pexecute_req([reqTemp0_1_suffix, {}])

    outputs["Result"]["value"] = zoo._("File imported successfully")
    return zoo.SERVICE_SUCCEEDED


def recursflo(obj):
    # TODO: confirm assumption: "obj" is a Python 3 dictionary object
    if "dependents" in obj:
        return recursflo(obj["dependents"][0])
    else:
        return obj


def findLatestOptions(obj):
    objKeys = myList(obj.keys())
    zoo.info(" *****-----***** " + str(obj))
    zoo.info(" *****-----***** " + str(objKeys))
    for k in range(len(objKeys)):
        for j in range(len(obj[objKeys[k]])):
            zoo.info(" *****-----***** " + str(objKeys[k]))
            zoo.info(" *****-----***** " + str(j))
            zoo.info(" *****-----***** " + str(obj[objKeys[k]][j]))
            hasDependents = False
            for l in obj[objKeys[k]][j]:
                zoo.info(" *****----- INNERL ***** " + str(l))
                hasDependents = True
                # TODO: confirm assumption: obj[objKeys[k]][j][l] is a Python 3 dictionary object
                if "dependents" in obj[objKeys[k]][j][l]:
                    for k1 in range(len(obj[objKeys[k]][j][l]["dependents"])):
                        return recursflo(obj[objKeys[k]][j][l])
                else:
                    return obj[objKeys[k]][j]
            zoo.info(" *****----- DEPENDENTS ***** " + str(hasDependents))

    return None
