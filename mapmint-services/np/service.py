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

psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)

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

def setIndexQuote(conf,inputs,outputs):
    if conf["senv"]["login"]=="anonymous":
        conf["lenv"]["message"]=zoo._("Unable to use this service when you're not logued in")
        return zoo.SERVICE_FAILED
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    tprefix=auth.getPrefix(conf)
    req="SELECT count(*) from indicateurs_favoris WHERE i_id=[_id_] and u_id=(SELECT id from "+tprefix+"users WHERE login=[_login_])" 
    res=con.pexecute_req([req,{"id":{"value":inputs["id"]["value"],"format":"s"},"login":{"value":conf["senv"]["login"],"format":"s"}}])
    vals=con.cur.fetchone()
    if vals is not None and vals[0]>0:
        req="UPDATE indicateurs_favoris set note=[_quote_] WHERE i_id=[_id_] and u_id=(SELECT id from "+tprefix+"users WHERE login=[_login_])"
    	con.pexecute_req([req,{"quote":{"value":inputs["quote"]["value"],"format":"s"},"id":{"value":inputs["id"]["value"],"format":"s"},"login":{"value":conf["senv"]["login"],"format":"s"}}])
        outputs["Result"]["value"]=zoo._("Index quote updated.")
    else:
        req="INSERT INTO indicateurs_favoris (i_id,u_id,note) VALUES ([_id_],(SELECT id from "+tprefix+"users WHERE login=[_login_]),[_quote_])"
    	con.pexecute_req([req,{"id":{"value":inputs["id"]["value"],"format":"s"},"login":{"value":conf["senv"]["login"],"format":"s"},"quote":{"value":inputs["quote"]["value"],"format":"s"}}])
        outputs["Result"]["value"]=zoo._("Index quote saved.")
    con.conn.commit()
    
    return zoo.SERVICE_SUCCEEDED

def splitGroup(conf):
    res=""
    c=conf["senv"]["group"].split(',')
    for i in c:
        if res!="":
            res+=" AND "
        res+="name='"+i+"'"
    return res


def getIndexQuote(conf,inputs,outputs):
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    tprefix=auth.getPrefix(conf)
    clause="("
    params={}
    if inputs["id"].has_key("length"):
        for i in range(int(inputs["id"]["length"])):
            if clause != "(":
                clause+=" or "
            clause+=" i_id=[_id_"+str(i)+"_]"
            params["id_"+str(i)]={"value":inputs["id"]["value"][i],"format":"s"}
        clause+=")"
    else:
        clause=" i_id=[_id_]"
        params["id"]={"value":inputs["id"]["value"],"format":"s"}
    if conf["senv"]["login"]=="anonymous":
        req="SELECT i_id,avg(note),true from indicateurs_favoris WHERE "+clause+" GROUP BY i_id" 
    else:
        req="SELECT i_id,note,false from indicateurs_favoris WHERE "+clause+" and u_id=(SELECT id from "+tprefix+"users WHERE login='"+conf["senv"]["login"]+"')" 
    res=con.pexecute_req([req,params])
    vals=con.cur.fetchall()
    if inputs["id"].has_key("length"):
        res=[]
        for j in range(len(vals)):
            for i in range(int(inputs["id"]["length"])):
                try:
                    if inputs["id"]["value"].count(str(vals[j][0]))>0:
                        res+=[{"id": str(vals[j][0]),"val": str(vals[j][1]),"ro":str(vals[j][2]).lower()}]
                        break
                except Exception,e:
                    print >> sys.stderr,i
                    print >> sys.stderr,e
                    print >> sys.stderr,inputs["id"]["value"][i]
                    #res+=[{"id": inputs["id"]["value"][i],"val": str(0)}]
                print >> sys.stderr,res
        for i in range(int(inputs["id"]["length"])):
            isIn=False
            for j in range(len(res)):
                if res[j]["id"]==inputs["id"]["value"][i]:
                    isIn=True
                    break
            if not(isIn):
                res+=[{"id": inputs["id"]["value"][i],"val": str(0)}]
        import json
        outputs["Result"]["value"]=json.dumps(res)
        return zoo.SERVICE_SUCCEEDED
    print >> sys.stderr,vals
    if vals is not None and len(vals)>0:
        outputs["Result"]["value"]=str(vals[0][1])
    else:
        outputs["Result"]["value"]="false"
    return zoo.SERVICE_SUCCEEDED


def setFavoriteMap(conf,inputs,outputs):
    if conf["senv"]["login"]=="anonymous":
        conf["lenv"]["message"]=zoo._("Unable to use this service when you're not logued in")
        return zoo.SERVICE_FAILED
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    tprefix=auth.getPrefix(conf)
    req="SELECT count(*) from "+tprefix+"favoris WHERE map='"+conf["senv"]["last_map"]+"' and u_id=(SELECT id from "+tprefix+"users WHERE login='"+conf["senv"]["login"]+"')" 
    res=cur.execute(req)
    vals=cur.fetchone()
    if vals is not None and vals[0]>0:
        req="DELETE FROM "+tprefix+"favoris WHERE map='"+conf["senv"]["last_map"]+"' and u_id=(SELECT id from "+tprefix+"users WHERE login='"+conf["senv"]["login"]+"')"
        outputs["Result"]["value"]=zoo._("Map removed from your favorite list.")
    else:
        req="INSERT INTO "+tprefix+"favoris (map,u_id) VALUES ('"+conf["senv"]["last_map"]+"',(SELECT id from "+tprefix+"users WHERE login='"+conf["senv"]["login"]+"'))"
        outputs["Result"]["value"]=zoo._("Map added to your favorite list.")
    cur.execute(req)
    con.conn.commit()
    
    return zoo.SERVICE_SUCCEEDED

def isFavoriteMap(conf,inputs,outputs):
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    tprefix=auth.getPrefix(conf)
    req="SELECT count(*) from "+tprefix+"favoris WHERE map='"+conf["senv"]["last_map"]+"' and u_id=(SELECT id from "+tprefix+"users WHERE login='"+conf["senv"]["login"]+"')" 
    res=cur.execute(req)
    vals=cur.fetchone()
    if vals is not None and vals[0]>0:
        outputs["Result"]["value"]="true"
    else:
        outputs["Result"]["value"]="false"
    return zoo.SERVICE_SUCCEEDED
    
def searchByName(conf,inputs,outputs):
    import json
    res=[]
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    tprefix=auth.getPrefix(conf)
    suffix0=" where "
    suffix01=""
    suffix10=""
    if inputs.has_key("t_id") and inputs["t_id"]["value"]!="NULL":
        suffix10=" and t_id="+inputs["t_id"]["value"]
    if inputs.has_key("tid") and inputs["tid"]["value"]!="NULL":
        if inputs["tid"]["value"]!="fav":
            suffix0=", "+inputs["tbl"]["value"]+"_themes WHERE "+inputs["tbl"]["value"]+".id="+inputs["tbl"]["value"]+"_themes.i_id and t_id="+inputs["tid"]["value"]+" and "
        else:
            suffix0=", "+inputs["tbl"]["value"]+"_favoris WHERE "+inputs["tbl"]["value"]+".id="+inputs["tbl"]["value"]+"_favoris.i_id and u_id=(SELECT id from "+tprefix+"users WHERE login='"+conf["senv"]["login"]+"') and "
            suffix01=" ORDER BY "+inputs["tbl"]["value"]+"_favoris.note DESC"
    prefix=inputs["tbl"]["value"]+"."
    tmp=conf["senv"]["group"].split(',')
    lclause=" name = 'public' "
    for j in range(0,len(tmp)):
        if lclause!="":
            lclause+=" or "
        lclause+=" name = "+str(adapt(tmp[j]))
    suffix1=" (SELECT id FROM "+tprefix+"groups WHERE "+lclause+") "
    suffix20="(SELECT DISTINCT i_id FROM ((select DISTINCT i_id from "+inputs["tbl"]["value"]+"_themes where t_id in (select DISTINCT t_id from "+tprefix+"themes_groups where g_id in "+suffix1+")) INTERSECT (select DISTINCT i_id from indicateurs_territoires where t_id in ( select DISTINCT t_id from territoires,territoires_groups where territoires.id=territoires_groups.t_id "+suffix10+" and g_id in "+suffix1+"))) as foo)"
    suffix2=" and indicateurs.id in "+suffix20+" and "
    suffix0=", "+inputs["tbl"]["value"]+"_groups "+suffix0+" "+inputs["tbl"]["value"]+"_groups.i_id="+inputs["tbl"]["value"]+".id "+suffix2+inputs["tbl"]["value"]+"_groups.g_id in "+suffix1+" and "
    req=" SELECT DISTINCT ON ("+prefix+"id) "+prefix+"id,"+prefix+"name from "+inputs["tbl"]["value"]+suffix0+" name like '%"+inputs["val"]["value"]+"%' "
    print >> sys.stderr,req
    cur.execute(req)
    vals=cur.fetchall()
    rpath=conf["main"]["dataPath"]+"/indexes_maps/project_PIndex"
    for i in vals:
        if inputs.has_key("public") and inputs["public"]["value"]=="true":
            try:
                f=open(rpath+str(i[0])+".map","r")
                res+=[{"id": i[0],"label":i[1],"value":i[1]}]
            except Exception,e:
                pass
        else:
            res+=[{"id": i[0],"label":i[1],"value":i[1]}]
    outputs["Result"]["value"]=json.dumps(res)
    return zoo.SERVICE_SUCCEEDED

def parseDocAttr(conf,inputs,outputs):
    import json
    res=[]
    import zipfile
    if inputs.has_key("fullpath") and inputs["fullpath"]["value"]=="true":
        fh = open(inputs["template"]["value"],"rb")
    else:
        fh = open(conf["main"]["publicationPath"]+"/idx_templates/"+inputs["template"]["value"],"rb")
    z = zipfile.ZipFile(fh)
    for name in z.namelist():
        if name.count("content.xml"):
            tmp=z.read(name).split("[_")
            for i in range(0,len(tmp)):
                if tmp[i].count("_]")>0:
                    #print >> sys.stderr,tmp[i]
                    if res.count(tmp[i].split("_]")[0])==0:
                        res+=[tmp[i].split("_]")[0]]
                        #print >> sys.stderr,res
    outputs["Result"]["value"]=json.dumps(res)
    return zoo.SERVICE_SUCCEEDED
    
def setCurrentIndex(conf,inputs,outputs):
    import mapscript
    conf["senv"]["last_index"]=inputs["id"]["value"]
    inputs0={"table":{"value":"indicateurs"},"id":inputs["id"]}
    if inputs.has_key('tid'):
        inputs0["tid"]=inputs["tid"]
    inputs0["public"]={"value":"true"}
    details(conf,inputs0,outputs)
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/project_PIndex"+inputs["id"]["value"]+".map")
    if m.getLayer(0).metadata.get('mmSteps'):
	import json
	tmp=json.loads(outputs["Result"]["value"])
	tmp["nbSteps"]=len(m.getLayer(0).metadata.get('mmSteps').split(','))
    	outputs["Result"]["value"]=json.dumps(tmp,ensure_ascii=False).encode("utf-8")
    #outputs["Result"]["value"]=zoo._("Current index saved")
    return zoo.SERVICE_SUCCEEDED

def setCurrentTerritory(conf,inputs,outputs):
    conf["senv"]["t_id"]=inputs["t_id"]["value"]
    outputs["Result"]["value"]="Session successfully updated"
    return zoo.SERVICE_SUCCEEDED

def getPublishedIndex(conf):
    import glob,os,shutil
    rpath=conf["main"]["dataPath"]+"/indexes_maps/"
    tmp=glob.glob(rpath+"/project_PIndex*.map")
    tmp.sort(key=lambda x: 1/os.path.getmtime(os.path.join(x)))
    return tmp

def getLastPublishedIndex(conf):
    import glob,os,shutil
    rpath=conf["main"]["dataPath"]+"/indexes_maps/"
    tmp=glob.glob(rpath+"project_PIndex*.map")
    tmp.sort(key=lambda x: 1/os.path.getmtime(os.path.join(x)))
    if len(tmp)>0:
    	return tmp[0].replace(conf["main"]["dataPath"]+"/indexes_maps/project_PIndex","").replace(".map","")
    return "-1"


def getIndexDisplay(conf,inputs,outputs):
    id=inputs["id"]["value"]
    req="select label,width from dtable where it_id=(select id from indicateurs_territoires where i_id="+id+") order by pos"
    req="select label,width from dtable where it_id=(select id from indicateurs_territoires where i_id=[_id_]) order by pos"
    params={"id":{"value":id,"format":"s"}}
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    con.pexecute_req([req,params])
    vals=con.cur.fetchall()
    res='<table class="flexiClasses"><thead><tr>'
    for i in range(0,len(vals)):
        res+='<th width="'+str(vals[0][1])+'" align="center">'+str(vals[0][0])+'</th>'
    res+='</tr></thead><tbody>'
    for i in range(0,10):
        res+="<tr>"
        for i in range(0,len(vals)):
            res+="<td></td>"
        res+="</tr>"
        
    res+="</tbody></table>"
    outputs["Result"]["value"]=res
    return zoo.SERVICE_SUCCEEDED

def getIndexDisplayJs(conf,inputs,outputs):
    id=inputs["id"]["value"]
    id0=""
    if inputs.has_key("tid") and inputs["tid"]["value"]!="null":
        id+=" and agregation and t_id="+inputs["tid"]["value"]
        if inputs.has_key("step"):
            id0+=" and step = "+inputs["step"]["value"]
        else:
            id0+=" and step is null"
    else:
        if inputs.has_key("step"):
            id+=" and (not(agregation) or agregation is null) and step = "+inputs["step"]["value"]
            id0+=" and step = "+inputs["step"]["value"]
        else:
            id+=" and (not(agregation) or agregation is null) and step is null"
            id0+=" and step is null"
    req0="select name,order_by from d_table where i_id="+inputs["id"]["value"]+id0+""
    print >> sys.stderr,req0
    req="select var,label,width from dtable where it_id=(select id from indicateurs_territoires where i_id="+id+") "+id0+" order by pos"
    print >> sys.stderr,req
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    cur.execute(req0)
    val=cur.fetchone()
    if val is not None:
    	title=str(val[0].encode('utf-8')).decode('utf-8')
        order_by=val[1]
    else:
	title=""
	order_by=None
	
    cur.execute(req)
    val=cur.fetchall()
    res=[]
    for i in range(0,len(val)):
        print >> sys.stderr,str(val[i][1].encode("utf-8"))
        res+=[{"name": val[i][0],"display": str(val[i][1].encode('utf-8')).decode('utf-8'), "width": val[i][2],"sortable" : 'true', "align": 'center'}]
    	if order_by is None:
		order_by=res[0]["name"]
    import json

    if inputs.has_key("tid"):
    	outputs["Result"]["value"]=json.dumps({"title":title,"ord":res[0]["name"], "values": res},ensure_ascii=False).encode("utf-8")
    else:
    	outputs["Result"]["value"]=json.dumps({"title":title,"ord":order_by, "values": res},ensure_ascii=False).encode("utf-8")

    #print >> sys.stderr,outputs["Result"]["value"]
    return zoo.SERVICE_SUCCEEDED

def getIndexRequest(conf,inputs,outputs):
    fields=[]
    id=inputs["id"]["value"]
    reqSuffix=""
    tablePrefix="indexes.view_idx"
    if inputs.has_key("tid"):
        tablePrefix="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"
        reqSuffix+=" and agregation and t_id="+inputs["tid"]["value"]
    else:
        reqSuffix+=" and (not(agregation) or agregation is null)"
    clause=""
    if inputs.has_key("query") and inputs["query"]["value"][0]!='<':
        clause=inputs["qtype"]["value"]+" LIKE "+str(adapt(inputs["query"]["value"].replace("*","%")))
    reqSuffix0=""
    dtableSuffix=" and step is null"
    tableName=tablePrefix+id
    if inputs.has_key("step"):
        dtableSuffix=" and step = "+inputs["step"]["value"]
        if inputs.has_key("tid"):
            tableName+="_step"+inputs["step"]["value"]
    endReq=" order by "+inputs["sortname"]["value"]+" "+inputs["sortorder"]["value"]
    if inputs.has_key("_id"):
        reqSuffix0+=" WHERE "+inputs["_id"]["value"]
        endReq=""
    req="select value,var,label from dtable where it_id=(select id from indicateurs_territoires where i_id="+id+reqSuffix+") "+dtableSuffix+" order by pos"
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    print >> sys.stderr,req
    cur.execute(req)
    vals=cur.fetchall()
    field_to_display=""
    fields_to_display=[]
    for i in range(0,len(vals)):
        if field_to_display!="":
            field_to_display+=","
        field_to_display+=vals[i][0].encode('utf-8')+' AS "'+vals[i][2].encode('utf-8')+'"'
        print >> sys.stderr,vals[i][2].encode('utf-8')
        fields+=[vals[i][1]]
        fields_to_display+=[vals[i][0]]
    if clause!="":
        req="select count(*) from "+tablePrefix+id+" WHERE "+clause
    else:
        req="select count(*) from "+tablePrefix+id+" "+clause
    print >> sys.stderr,req
    cur.execute(req)
    val=cur.fetchone()
    if inputs.has_key("sortorder"):
        for j in range(0,len(fields)):
            print >> sys.stderr,fields[j]
            print >> sys.stderr,inputs["sortname"]["value"]
            if fields[j]==inputs["sortname"]["value"]:
                sortN=fields_to_display[j]
                break
    else:
        sortN=fields_to_display[0]
    cnt=val[0]
    if clause!="":
        if reqSuffix0!="":
            req="select "+field_to_display+",wkb_geometry from "+tableName+reqSuffix0+" AND "+clause+endReq
        else:
            req="select "+field_to_display+",wkb_geometry from "+tableName+reqSuffix0+" WHERE "+clause+endReq
    else:
        req="select "+field_to_display+",wkb_geometry from "+tableName+reqSuffix0+endReq
    outputs["Result"]["value"]=req
    return zoo.SERVICE_SUCCEEDED

def _getIndexValues(conf,inputs,fields):
    id=inputs["id"]["value"]
    reqSuffix=""
    tablePrefix="indexes.view_idx"
    if inputs.has_key("tid") and inputs["tid"]["value"]!="null":
        tablePrefix="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"
        reqSuffix+=" and agregation and t_id="+inputs["tid"]["value"]
    else:
        reqSuffix+=" and (not(agregation) or agregation is null)"
    clause=""
    if inputs.has_key("query") and inputs["query"]["value"]!="":
        clause=inputs["qtype"]["value"]+" LIKE "+str(adapt(inputs["query"]["value"].replace("*","%")))
    reqSuffix0=""
    dtableSuffix=" and step is null"
    tableName=tablePrefix+id
    if inputs.has_key("step"):
        dtableSuffix=" and step = "+inputs["step"]["value"]
        #if inputs.has_key("tid"):
        #    tableName+="_step"+inputs["step"]["value"]
    endReq=" order by "+inputs["sortname"]["value"]+" "+inputs["sortorder"]["value"]+" limit "+inputs["limit"]["value"]+" offset "+str(int(inputs["limit"]["value"])*(int(inputs["page"]["value"])-1))
    if inputs.has_key("_id"):
        reqSuffix0+=" WHERE "+inputs["_id"]["value"]
        endReq=""
    req="select value,var from dtable where it_id=(select id from indicateurs_territoires where i_id="+id+reqSuffix+") "+dtableSuffix+" order by pos"
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    print >> sys.stderr,req
    cur.execute(req)
    vals=cur.fetchall()
    field_to_display=""
    fields_to_display=[]
    #fields=[]
    for i in range(0,len(vals)):
        if field_to_display!="":
            field_to_display+=","
        field_to_display+=vals[i][0]
        fields+=[vals[i][1]]
        fields_to_display+=[vals[i][0]]
    if clause!="":
        req="select count(*) from "+tablePrefix+id+" WHERE "+clause
    else:
        req="select count(*) from "+tablePrefix+id+" "+clause
    print >> sys.stderr,req
    cur.execute(req)
    val=cur.fetchone()
    if inputs.has_key("sortorder"):
        for j in range(0,len(fields)):
            print >> sys.stderr,fields[j]
            print >> sys.stderr,inputs["sortname"]["value"]
            if fields[j]==inputs["sortname"]["value"]:
                sortN=fields_to_display[j]
                break
    else:
        sortN=fields_to_display[0]
    cnt=val[0]
    if clause!="":
        if reqSuffix0!="":
            req="select "+field_to_display+" from "+tableName+reqSuffix0+" AND "+clause+endReq
        else:
            req="select "+field_to_display+" from "+tableName+reqSuffix0+" WHERE "+clause+endReq
    else:
        req="select "+field_to_display+" from "+tableName+reqSuffix0+endReq
    print >> sys.stderr,req
    cur.execute(req.encode("utf-8"))
    val=cur.fetchall()
    return [cnt,val]

def getIndexValues(conf,inputs,outputs):
    fields=[]
    val=_getIndexValues(conf,inputs,fields)
    res='<FeatureCollection cnt="'+str(val[0])+'">'
    val=val[1]
    for i in range(0,len(val)):
        res+="<featureMember>"
        for j in range(0,len(fields)):
            try:
                res+=("<"+fields[j]+">").encode("utf-8")+val[i][j].encode("utf-8")+("</"+fields[j]+">").encode("utf-8")
            except Exception,e:
                try:
                    res+=("<"+fields[j]+">").encode("utf-8")+str(val[i][j]).encode("utf-8")+("</"+fields[j]+">").encode("utf-8")
                except:
                    res+=("<"+fields[j]+">").encode("utf-8")+str(val[i][j])+("</"+fields[j]+">").encode("utf-8")
                print >> sys.stderr,e
        res+="</featureMember>"
    res+="</FeatureCollection>"
    outputs["Result"]["value"]=res
    return zoo.SERVICE_SUCCEEDED

def getIndex(conf,inputs,outputs):
    import authenticate.service as auth
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    prefix=auth.getPrefix(conf)
    cur.execute("SELECT id, name, description from indicateurs where id="+inputs["id"]["value"])
    vals=cur.fetchall()
    res={}
    for i in range(0,len(cur.description)):
        res[cur.description[i].name]=vals[0][i]
    try:
        import time,os
        immap=conf["main"]["dataPath"]+"/indexes_maps/project_PIndex"+str(vals[0][0])+".map"
        res["pdate"]=time.strftime(conf["mm"]["dateFormat"],time.localtime(os.path.getmtime(immap)))
    except Exception,e:
        conf["lenv"]["message"]=zoo._("Error occur whenre trying to access the index map")+str(e)
        return zoo.SERVICE_FAILED
    import mapscript
    tmp=getPublishedIndex(conf)
    mm=mapscript.mapObj(tmp[0])
    a=mm.getLayer(0).getExtent()
    a.project(mapscript.projectionObj(mm.getLayer(0).getProjection()),mapscript.projectionObj("EPSG:4326"))
    x=((a.maxx-a.minx)/2)+a.minx
    y=((a.maxy-a.miny)/2)+a.miny
    res["mlink"]=conf["main"]["mapserverAddress"]+"?map="+(tmp[0])+"&LAYERS="+mm.getLayer(0).name+"&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX="+str(a.minx)+","+str(a.miny)+","+str(a.maxx)+","+str(a.maxy)+"&SRS=EPSG:4326&WIDTH=150"
    import json
    outputs["Result"]["value"]=json.dumps(res)
    return zoo.SERVICE_SUCCEEDED

def publishIndex(conf,inputs,outputs):
    import glob,os,shutil,sys
    import mapscript
    rpath=conf["main"]["dataPath"]+"/indexes_maps/"
    passed=False
    try:
        for name in glob.glob(rpath+"/*_Index"+inputs["id"]["value"]+"*.map"):
            shutil.copy(name,name.replace("Index","PIndex"))
            m=mapscript.mapObj(name.replace("Index","PIndex"))
            m.web.metadata.set('cache_file',"TEMP_"+conf["senv"]["MMID"]+"-"+inputs["id"]["value"]+"")
            if not(passed):
                inputs0={"file":{"value":"TEMP_"+conf["senv"]["MMID"]+"-"+inputs["id"]["value"]+""}}
                print >> sys.stderr,"START"
                csv2ods(conf,inputs0,outputs)
                print >> sys.stderr,"END"
                passed=True
            m.save(name.replace("Index","PIndex"))
        for name in glob.glob(rpath+"/*_GIndex"+inputs["id"]["value"]+"*.map"):
            shutil.copy(name,name.replace("GIndex","PGIndex"))
        outputs["Result"]["value"]=zoo._("Index successfully published")
        sys.stderr.close()
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]=zoo._("Unable to access any index file")
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_FAILED

def unpublishIndex(conf,inputs,outputs):
    import glob,os,shutil
    rpath=conf["main"]["dataPath"]+"/indexes_maps/"
    try:
        for name in glob.glob(rpath+"/*_PIndex"+inputs["id"]["value"]+"*.map"):
            os.unlink(name)
        for name in glob.glob(rpath+"/*_GIndex"+inputs["id"]["value"]+"*.map"):
            os.unlink(name)
        outputs["Result"]["value"]=zoo._("Index successfully unpublished")
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]=zoo._("Unable to access any index file")
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_FAILED

#        if name.count("zip")==0:
#            d.write(name.replace("\\","/"),os.path.basename(name), zipfile.ZIP_DEFLATED)

def getIndexStyle(conf,inputs,outputs):
    import mapscript,json
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/project_Index"+inputs["id"]["value"]+".map")
    l=m.getLayer(0);
    print >> sys.stderr,dir(l)
    try:
        tmp=l.metadata.get("mmColor").split(" ")
        icol='%02x%02x%02x'%(int(tmp[0]),int(tmp[1]),int(tmp[2]))
    except:
        icol='ffffff'
    try:
        tmp=l.metadata.get("mmOutColor").split(" ")
        ocol='%02x%02x%02x'%(int(tmp[0]),int(tmp[1]),int(tmp[2]))
    except:
        ocol='777777'
    print >> sys.stderr,(l.metadata.get("mmClass")=="tl")
    if l.metadata.get("mmClass")=="tl":
        if inputs.has_key("step"):
            idx=inputs["step"]["value"]
            m1=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+inputs["id"]["value"]+"_indexes_view_idx"+inputs["id"]["value"]+"_step"+inputs["step"]["value"]+".map")
        else:
            idx="0"
            m1=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+inputs["id"]["value"]+"_indexes_view_idx"+inputs["id"]["value"]+"_step0.map")
        l1=m1.getLayer(0)
        try:
            tmp=l1.metadata.get("mmColor").split(" ")
            icol='%02x%02x%02x'%(int(tmp[0]),int(tmp[1]),int(tmp[2]))
        except:
            icol='ffffff'
        try:
            tmp=l1.metadata.get("mmOutColor").split(" ")
            ocol='%02x%02x%02x'%(int(tmp[0]),int(tmp[1]),int(tmp[2]))
        except:
            ocol='777777'
        outputs["Result"]["value"]=json.dumps({"var":l1.metadata.get("mmField"),"formula":l1.metadata.get("mmFormula"),"ctype": l.metadata.get("mmClass"),"nbc":l1.numclasses,"icol":icol,"ocol":ocol,"cctype": l1.metadata.get("mmClass"),"cmethod": l1.metadata.get("mmMethod"),"step":idx});
    else:
        if l.metadata.get("mmMethod") is not None:
            outputs["Result"]["value"]=json.dumps({"var":l.metadata.get("mmField"),"formula":l.metadata.get("mmFormula"),"ctype": "gs","cmethod": l.metadata.get("mmMethod"),"nbc":l.numclasses,"icol":icol,"ocol":ocol});
        else:
            outputs["Result"]["value"]=json.dumps({"var":l.metadata.get("mmField"),"formula":l.metadata.get("mmFormula"),"ctype": l.metadata.get("mmClass"),"cmethod": l.metadata.get("mmMethod"),"nbc":l.numclasses,"icol":icol,"ocol":ocol});
    return zoo.SERVICE_SUCCEEDED


def saveIndexDisplaySettings(conf,inputs,outputs):
    import json
    con=auth.getCon(conf)
    cur=con.conn.cursor()

    if not(inputs["tuple"]["value"].__class__.__name__ in ('list', 'tuple')):
        inputs["tuple"]["value"]=[inputs["tuple"]["value"]]

    ofields=""
    ovals=""
    oSuffix=""
    if inputs.has_key("step"):
        ofields=",step"
        ovals=","+inputs["step"]["value"]
        oSuffix=" and step="+inputs["step"]["value"]
    reqSuffix=" and (not(agregation) or agregation is null)"
    if inputs.has_key("tid"):
        reqSuffix=" and t_id="+inputs["tid"]["value"]+" and agregation"
    req="delete from dtable where it_id=(select id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+")"+oSuffix
    cur.execute(req)
    con.conn.commit()

    for i in range(0,len(inputs["tuple"]["value"])):
        print >> sys.stderr,inputs["tuple"]["value"][i]
        tmp=json.loads(inputs["tuple"]["value"][i])
        print >> sys.stderr,tmp
        tmp=eval(inputs["tuple"]["value"][i])
        print >> sys.stderr,tmp
        try:
            print >> sys.stderr,tmp["label"]
            tmp0 = "%s" % adapt(tmp["value"])
            tmp["value"]=str(tmp0)
            tmp0 = "%s" % adapt(tmp["label"])
            print >> sys.stderr,tmp0
            tmp["label"]=str(tmp0)
            tmp0 = "%s" % adapt(tmp["var"])
            tmp["var"]=str(tmp0)
            if tmp["pos"]=="":
                tmp["pos"]="(select count(*) from dtable where it_id=(select id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+"))"+oSuffix
            print >> sys.stderr,tmp["value"]
            req="INSERT INTO dtable (it_id,display,search,pos,var,label,value,width"+ofields+") VALUES ((select id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+"),"+tmp["display"]+","+tmp["search"]+","+tmp["pos"]+","+tmp["var"]+","+tmp["label"]+","+tmp["value"]+","+tmp["width"]+""+ovals+")"
            print >> sys.stderr,req
            cur.execute(req)
            con.conn.commit()
        except Exception,e:
            con.conn.commit()
            print >> sys.stderr,e
            pass
    outputs["Result"]["value"]=zoo._("Index display settings saved")
    return zoo.SERVICE_SUCCEEDED

def saveRepportFile(conf,inputs,outputs):
    print >> sys.stderr,conf["senv"]
    import shutil
    tmp=conf["senv"]["last_file"].split("/")
    shutil.copy(conf["senv"]["last_file"],conf["main"]["publicationPath"]+"/idx_templates/"+tmp[len(tmp)-1])
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    cur.execute("DELETE FROM r_table where i_id="+inputs["id"]["value"]+";INSERT INTO r_table (i_id,doc) VALUES ("+inputs["id"]["value"]+",'"+tmp[len(tmp)-1]+"')")
    con.conn.commit()
    outputs["Result"]["value"]="Repport file succesfully uploaded"
    return zoo.SERVICE_SUCCEEDED

def saveRepportSettings(conf,inputs,outputs):
    import json
    con=auth.getCon(conf)
    cur=con.conn.cursor()

    if not(inputs["tuple"]["value"].__class__.__name__ in ('list', 'tuple')):
        inputs["tuple"]["value"]=[inputs["tuple"]["value"]]


    reqSuffix=" and (not(agregation) or agregation is null)"
    reqSuffix0=" and step is null"
    fields0=""
    values0=""
    if inputs.has_key("tid"):
        reqSuffix=" and t_id="+inputs["tid"]["value"]
    if inputs.has_key("step"):        
        reqSuffix0=" and step="+inputs["step"]["value"]
        fields0=",step"
        values0=","+inputs["step"]["value"]
    req="delete from rtable where it_id=(select id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+")"+reqSuffix0
    cur.execute(req)
    con.conn.commit()

    for i in range(0,len(inputs["tuple"]["value"])):
        tmp=json.loads(inputs["tuple"]["value"][i])
        tmp=eval(inputs["tuple"]["value"][i])
        try:
            tmp0 = "%s" % adapt(tmp["value"])
            tmp["value"]=str(tmp0)
            tmp0 = "%s" % adapt(tmp["display"])
            tmp["display"]=str(tmp0)
            tmp0 = "%s" % adapt(tmp["var"])
            tmp["var"]=str(tmp0)
            if not(tmp.has_key("pos")):
                tmp["pos"]="(select id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+")"
            req="INSERT INTO rtable (it_id,display,var,typ,value"+fields0+") VALUES ("+tmp["pos"]+","+tmp["display"]+","+tmp["var"]+","+str(tmp["type"])+","+tmp["value"]+""+values0+")"
            cur.execute(req)
            con.conn.commit()
        except Exception,e:
            print >> sys.stderr,"ERROR !!"+str(e)
            con.conn.commit()
            pass
    outputs["Result"]["value"]=zoo._("Repport settings saved")
    return zoo.SERVICE_SUCCEEDED

def createAgregate(conf,inputs,outputs):
    import mapscript
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    # Extract datasource from territories
    req="SELECT datasource from territoires where id="+inputs["tid"]["value"]
    cur.execute(req)
    vals=cur.fetchall()
    for i in range(0,len(vals)):
        tblName=vals[i][0]

    # Extract informations about Primary key or fallback to default "ogc_fid"
    import datastores.postgis.pgConnection as pg
    cur.execute(pg.getDesc(cur,tblName))
    vals=cur.fetchall()
    cfield=None
    geomc=None
    for i in range(0,len(vals)):
        print >> sys.stderr,vals[i]
        if vals[i][3]=="PRI":
            cfield=vals[i][1]
        if vals[i][2]=="geometry":
            geomc=vals[i][1]
        if cfield is not None and geomc is not None: 
            break

    formula=inputs["formula"]["value"]
    tbl0Name="indexes.view_idx"+inputs["id"]["value"]
    aTblName="indexes.agregate_t"+inputs["tid"]["value"]+"_idx"+inputs["id"]["value"]
    aVName="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"+inputs["id"]["value"]
    reqSuffix=""
    mapSuffix=""
    reqSuffix0=""
    fields0=""
    values0=""
    field0=inputs["field"]["value"]
    if inputs.has_key("step"):
        #tbl0Name="indexes.view_idx_"+inputs["id"]["value"]+"_"+inputs["step"]["value"]
        mapSuffix="_step"+inputs["step"]["value"]
        aTblName+="_step"+inputs["step"]["value"]
        aVName+="_step"+inputs["step"]["value"]
        reqSuffix+=" and step="+inputs["step"]["value"]
        m0=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+inputs["id"]["value"]+"_indexes_view_idx"+inputs["id"]["value"]+"_step"+inputs["step"]["value"]+".map")
        field0=m0.getLayer(0).metadata.get("mmField")
        reqSuffix0=""
        fields0=",step"
        values0=","+inputs["step"]["value"]
        
    
    formula=formula.replace("[_X_]",field0).replace("[_T_]",tbl0Name)
    req="DROP TABLE "+aTblName+" CASCADE;"
    try:
        cur.execute(req)
        con.conn.commit()
    except Exception,e:
        print >> sys.stderr,e
        con.conn.commit()
    req="CREATE TABLE "+aTblName+" as (SELECT min("+tblName+"."+cfield+") as "+cfield+", "+formula+" as "+field0+" from "+tblName+","+tbl0Name+" WHERE ST_Within("+tbl0Name+".wkb_geometry,"+tblName+".wkb_geometry) group by "+tblName+"."+cfield+"); ALTER TABLE "+aTblName+" add constraint "+aTblName.replace(".","_")+"_pkey primary key("+cfield+"); CREATE VIEW "+aVName+" AS (select "+tblName+".*,"+field0+" from "+tblName+", "+aTblName+" where "+tblName+"."+cfield+"="+aTblName+"."+cfield+");"
    try:
        print >> sys.stderr,req
        cur.execute(req)
        con.conn.commit()
    except Exception,e:
        con.conn.commit()
        conf["lenv"]["message"]=zoo._("Issue occurs: "+str(e))
        return zoo.SERVICE_FAILED


    req="DELETE FROM indicateurs_territoires WHERE i_id="+inputs["id"]["value"]+" and t_id="+inputs["tid"]["value"]+reqSuffix0+";INSERT INTO indicateurs_territoires (i_id,t_id,agregation) VALUES ("+inputs["id"]["value"]+","+inputs["tid"]["value"]+",true)";
    try:
        print >> sys.stderr,req
        cur.execute(req)
        con.conn.commit()
        addLayerForIndex(conf,inputs,outputs)
    except Exception,e:
        con.conn.commit()
        conf["lenv"]["message"]=zoo._("Issue occurs: "+str(e))
        return zoo.SERVICE_FAILED

    subreq="(SELECT id from indicateurs_territoires where i_id="+inputs["id"]["value"]+" and (not(agregation) or agregation is null))"
    req="DELETE FROM agregation where it_id="+subreq+";INSERT INTO agregation (it_id,t_id,formula) VALUES ("+subreq+","+inputs["tid"]["value"]+","+str(adapt(inputs["formula"]["value"]))+")"
    cur.execute(req)
    con.conn.commit()

    if inputs.has_key("step"):
        m=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+inputs["id"]["value"]+"_indexes_view_idx"+inputs["id"]["value"]+"_step"+inputs["step"]["value"]+".map")
    else:
        m=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/project_Index"+inputs["id"]["value"]+".map")
    m.getLayer(0).name=aVName
    m.getLayer(0).data=aVName
    m.getLayer(0).metadata.set("ows_name",aVName)
    m.getLayer(0).metadata.set("ows_title",aVName)
    if inputs.has_key("step"):
        m.save(conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_Index"+inputs["id"]["value"]+"_step"+inputs["step"]["value"]+".map")
    else:
        m.save(conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_Index"+inputs["id"]["value"]+".map")
    l=m.getLayer(0)
    import mapfile.service as mapfile
    print >> sys.stderr,dir(l.getClass(0))
    form=l.metadata.get('mmColor').split(" ")
    for i in range(0,len(form)):
        if form[i]!="":
            form[i]=int(form[i])
    to=l.metadata.get('mmOutColor').split(" ")
    for i in range(0,len(to)):
        if to[i]!="":
            to[i]=int(to[i])
    form.pop(len(form)-1)
    to.pop(len(to)-1)
    print >> sys.stderr,form
    print >> sys.stderr,to
    inputs1={
    "prefix": {"value":"indexes"},
    "orig": {"value":conf["main"]["dbuserName"]},
    "layer": {"value": aVName},
    "map": {"value":"A"+inputs["tid"]["value"]+"_Index"+inputs["id"]["value"]+mapSuffix},
    "field": {"value": field0},
    "from": {"value": '%02x%02x%02x' % (form[0],form[1],form[2]) },
    "to": {"value": '%02x%02x%02x' % (to[0],to[1],to[2])},
    "nbClasses": {"value": l.numclasses},
    "type": {"value": l.metadata.get("mmClass")},
    "formula": {"value": l.metadata.get("mmFormula")},
    "mmOpacity": {"value": str(l.getClass(0).getStyle(0).opacity)},
    "noDataUpdate": {"value": "true"}
    }
    if l.metadata.get("mmMethod") is not None:
        inputs1["method"]={"value": l.metadata.get("mmMethod")}
    print >> sys.stderr,inputs1
    outputs1={"Result":{"value":""}}
    mapfile.classifyMap(conf,inputs1,outputs)

    
    #conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_Index"+inputs["id"]["value"]+".map")
    #outputs["Result"]["value"]=zoo._("Agregate successfully created")
    return zoo.SERVICE_SUCCEEDED

def joinIndexTable(conf,inputs,outputs):
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    tblName="indexes.idx_table_"+inputs["id"]["value"]
    print >> sys.stderr,inputs
    req="select datasource from territoires where id='"+inputs["territoire"]["value"]+"'"
    print >> sys.stderr,req
    cur.execute(req)
    vals=cur.fetchall()
    print >> sys.stderr,vals

    fields=""
    if not(inputs["rcol"]["value"].__class__.__name__ in ('list', 'tuple')):
        fields=inputs["rcol"]["value"]
    else:
        cnt=0
        for i in inputs["rcol"]["value"]:
            if fields!="":
                fields+=","
            if cnt>0:
                fields+=tblName+"."+i
            cnt+=1
    print >> sys.stderr,inputs["field"]["value"]
    
    req="CREATE view indexes.view_idx"+inputs["id"]["value"]+" AS (SELECT foo.*,"+fields+" FROM "\
        +tblName+","\
        +"("\
        +"SELECT * FROM "+vals[0][0]\
        +") as foo where foo."+inputs["field"]["value"][1]+"="+tblName+"."+inputs["field"]["value"][0]+"::varchar(255))"
    print >> sys.stderr,req
    cur.execute(req)
    con.conn.commit()

    req="delete from dtable where it_id=(select id from indicateurs_territoires where i_id='"+inputs["id"]["value"]+"');delete from d_table where i_id="+inputs["id"]["value"]+";delete from graphs where it_id=(select id from indicateurs_territoires where i_id='"+inputs["id"]["value"]+"');delete from indicateurs_territoires where i_id='"+inputs["id"]["value"]+"'"
    cur.execute(req)
    con.conn.commit()

    filename="NULL"
    if inputs.has_key("filename") and inputs["filename"]["value"]!="NULL":
        filename= "%s" % adapt(inputs["filename"]["value"]).getquoted()
    query="NULL"
    if inputs.has_key("query") and inputs["query"]["value"]!="":
        query= "%s" % adapt(inputs["query"]["value"]).getquoted()
    ds="NULL"
    if inputs.has_key("dbname") and inputs["dbname"]["value"]!="-1":
        ds = "%s" % adapt(inputs["dbname"]["value"]).getquoted()
    req="insert into indicateurs_territoires (i_id,o_key_link,t_id,filename,tbl_link,tbl_key_link,fields,query,ds) VALUES ("+inputs["id"]["value"]+",'"+inputs["field"]["value"][1]+"',"+inputs["territoire"]["value"]+","+filename+",'"+inputs["layer"]["value"]+"','"+inputs["field"]["value"][0]+"','"+"indexes.idx_table_"+inputs["id"]["value"]+"."+inputs["field"]["value"][0]+","+fields+"',"+query+","+ds+")"
    print >> sys.stderr,req
    cur.execute(req)
    con.conn.commit()


    outputs["Result"]["value"]=zoo._("View was successfully created, index is ready to use.")
    return zoo.SERVICE_SUCCEEDED

def dropTempFile(conf,inputs,outputs):
    import os
    try:
        os.unlink(conf["main"]["tmpPath"]+"/temporary_index.csv")
    except Exception,e:
        print >> sys.stderr,str(e)
    outputs["Result"]["value"]=zoo._("Table was successfully removed.")
    return zoo.SERVICE_SUCCEEDED

def dropTable(conf,inputs,outputs):
    con=auth.getCon(conf)
    cur=con.conn.cursor()
    try:
        con.conn.commit()
        req="DROP VIEW indexes.view_idx"+inputs["id"]["value"]+" CASCADE"
        cur.execute(req)
        con.conn.commit()
    except Exception,e:
        print >> sys.stderr,e
        pass
    try:
        con.conn.commit()
        req="DROP TABLE indexes.idx_table_"+inputs["id"]["value"]+"  CASCADE"
        cur.execute(req)
        con.conn.commit()
    except Exception,e:
        print >> sys.stderr,e
        pass
    outputs["Result"]["value"]=zoo._("Index was successfully removed.")
    return zoo.SERVICE_SUCCEEDED

def getLastFile(conf,inputs,outputs):
    if conf["senv"].has_key("last_file"):
        outputs["Result"]["value"]=conf["senv"]["last_file"]
    else:
        outputs["Result"]["value"]="None"
    return zoo.SERVICE_SUCCEEDED

def setLastFile(conf,inputs,outputs):
    import mmsession
    import sys
    print >> sys.stderr,"OK DEBUG "+str(conf["senv"])
    print >> sys.stderr,"OK DEBUG "+str(inputs)
    conf["senv"]["last_file"]=conf["main"]["tmpPath"]+"/"+inputs["last_file"]["value"]
    print >> sys.stderr,str(conf["senv"])
    print >> sys.stderr,conf["senv"]["last_file"]
    if mmsession.save(conf)==zoo.SERVICE_SUCCEEDED:
        outputs["Result"]["value"]=conf["senv"]["last_file"]
        print >> sys.stderr,"SAVED CONF !!!!"
        return zoo.SERVICE_SUCCEEDED
    else:
        return zoo.SERVICE_FAILED

#con=psycopg2.connect("user=djay host=127.0.0.1 port=5432 dbname=demogis")
#cur=con.cursor()
def testQuery(conf,inputs,outputs):
    from manage_users.manage_users import manage_users
    import datastores.postgis.service as pg
    import json
    tmp=inputs["dbname"]["value"].split(':')
    pg.load(conf,{"name":{"value":tmp[1]},"type":{"value":tmp[0]}},outputs)
    print >> sys.stderr,outputs["Result"]["value"]
    v=json.loads(outputs["Result"]["value"])
    dbs=""
    notAllowed=['stype','name']
    for i in v:
        if notAllowed.count(i)==0:
            dbs+=" "+i+"="+v[i]
    try:
        con=psycopg2.connect(dbs)
    except:
        try:
            import libxml2,libxslt
            import osgeo.ogr as ogr
            doc=libxml2.parseFile(conf["main"]["dataPath"]+"/"+tmp[0]+"/"+tmp[1]+".xml")
            styledoc = libxml2.parseFile(conf["main"]["dataPath"]+"/"+tmp[0]+"/conn.xsl")
            style = libxslt.parseStylesheetDoc(styledoc)
            result = style.applyStylesheet(doc, None)
            print >> sys.stderr,result.content
            ds = ogr.Open( result.content )
            res=ds.ExecuteSQL( inputs["query"]["value"], None, None)
            n = res.GetFeatureCount()
            if n>0:
                outputs["Result"]["value"]=zoo._("Number of fetched elements from your query: ")+str(n)
            else:
                outputs["Result"]["value"]=zoo._("Your query sounds correct but didn't return any result")
                #con=mdb.connect(dbs)
            return zoo.SERVICE_SUCCEEDED
        except Exception,e:
            conf["lenv"]["message"]=zoo._("Unable to access the database")+str(e)
            return zoo.SERVICE_FAILED
    try:
        cur=con.cursor()
        cur.execute(inputs["query"]["value"])
        vals=cur.fetchall()
        if len(vals)>0:
            outputs["Result"]["value"]=zoo._("Number of fetched elements from your query: ")+str(len(vals))
        else:
            outputs["Result"]["value"]=zoo._("Your query sounds correct but didn't return any result")
        con.close()
    except Exception,e:
        conf["lenv"]["message"]=zoo._("Unable to run your query for the following reason: ")+str(e)
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED

def getMapRequest(conf,inputs,outputs):
    import mapscript
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    prefix=auth.getPrefix(conf)
    req0="SELECT datasource from "+prefix+"territoires where id="+inputs["t_id"]["value"]
    cur.execute(req0)
    vals=cur.fetchall()
    dsn=""
    if len(vals)>0:
        dsn=vals[0][0].replace("public.","")
    else:
        conf["lenv"]["message"]=zoo._("No territory found for the id provided")
        return zoo.SERVICE_FAILED
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map")
    for i in range(0,m.numlayers):
        l=m.getLayer(i)
        if l.data==dsn:
            outputs["Result"]["value"]=conf["main"]["mapserverAddress"]+"?map="+conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map"
            if inputs.has_key("preview") and inputs["preview"]["inRequest"]=="true":
                ext=l.getExtent()
                ext.project(mapscript.projectionObj(l.getProjection()),mapscript.projectionObj("EPSG:4326"))
                minw=300
                minh=200
                diffX=ext.maxx-ext.minx
                diffY=ext.maxy-ext.miny
                if diffX>diffY:
                    w=(200*diffX)/diffY
                    h=200
                else:
                    w=300
                    h=(300*diffY)/diffX
                outputs["Result"]["value"]+="&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX="+str(ext.minx)+","+str(ext.miny)+","+str(ext.maxx)+","+str(ext.maxy)+"&SRS=EPSG:4326&WIDTH="+str(w)+"&HEIGHT="+str(h)+"&LAYERS="+dsn
            else:
                if inputs.has_key("layer"):
                    dsn=inputs["layer"]["value"]
                outputs["Result"]["value"]+="&SERVICE=WFS&VERSION=1.0.0&REQUEST=DescribeFeatureType&typename="+dsn
            break
    return zoo.SERVICE_SUCCEEDED

def listDefault(tbl,cur,clause=None):
    if clause is None:
        cur.execute("SELECT * from "+tbl+" order by id desc")
    else:
        cur.execute("SELECT * from "+tbl+clause)
        
    vals=cur.fetchall()
    elems=[]
    for i in range(0,len(vals)):
        elems+=[{"id": vals[i][0],"text":vals[i][1]}]
    return elems

def listThemes(cur,prefix,group='public',clause=None,clause1=None):
    print >> sys.stderr,"GROUPS :"+group
    req0="select * from "+prefix+"themes where "
    if clause is not None:
        req0+=clause
    else:
        req0+=" pid is null "
    if group.count("admin")==0:
        groups=group.split(',')
        lclause="";
        for i in range(0,len(groups)):
            if lclause!="":
                lclause+=" OR "
            lclause+="name='"+groups[i]+"'"
        req0+=" and id in (SELECT t_id from "+prefix+"themes_groups where g_id in (SELECT id from "+prefix+"groups where "+lclause+" or name='public'))"
    if clause1 is not None:
        req0+=" AND "+clause1
    req0+=" order by ord"
    print >> sys.stderr,"\n+++++++REQ0 === "+req0
    res=cur.execute(req0)
    vals=cur.fetchall()
    elems=[]
    for i in range(0,len(vals)):
        celem={"id": vals[i][0],"text":vals[i][1]}
        tmp=listThemes(cur,prefix,group,"pid="+str(vals[i][0]),clause1)
        if len(tmp)>0:
            celem["children"]=tmp
        elems+=[celem]
    return elems

def flatElements(l,res):
    for i in range(0,len(l)):
        res["id_"+str(l[i]["id"])]=l[i]["text"]
        if l[i].has_key("children"):
            flatElements(l[i]["children"],res)

def flatTerritoires(l,res):
    for i in range(0,len(l)):
        res["id_"+str(l[i]["id"])]=l[i]["text"]
        if l[i].has_key("children"):
            flatTerritoires(l[i]["children"],res)
        
def listTerritoires(cur,prefix,group='public',clause=None,clause1=None):
    req0="select * from "+prefix+"territoires where id "
    req1="select o_t_id from "+prefix+"t_hierarchy "
    if clause is not None:
        req0+=""
        req1+=" where "+clause
    else:
        req0+=" not " 
    req0+= " in ( "+req1+" ) "
    if group.count("admin")==0:
        groups=group.split(',')
        lclause=""
        for i in range(0,len(groups)):
            if lclause!="":
                lclause+=" OR "
            lclause+="name='"+groups[i]+"'"        
        req0+=" and id in (SELECT t_id from "+prefix+"territoires_groups where g_id=(SELECT id from "+prefix+"groups where "+lclause+" or name='public'))"
    req2=req0
    if clause1 is not None:
	req0+=" AND "+clause1
    req0+=" order by ord"
    req2+=" order by ord"
    res=cur.execute(req0)
    vals=cur.fetchall()
    elems=[]
    for i in range(0,len(vals)):
        celem={"id": vals[i][0],"text":vals[i][1]}
        tmp=listTerritoires(cur,prefix,group,"p_t_id="+str(vals[i][0]),clause1)
        if len(tmp)>0:
            celem["children"]=tmp
        elems+=[celem]
    if len(vals)==0:
	res=cur.execute(req2)
	vals=cur.fetchall()
	elems=[]
	for i in range(0,len(vals)):
		tmp=listTerritoires(cur,prefix,group,"p_t_id="+str(vals[i][0]),clause1)
		if len(tmp)>0:
			elems+=tmp
    return elems


def list(conf,inputs,outputs):
    import json
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    prefix=auth.getPrefix(conf)
    res=None
    if not(auth.is_ftable(inputs["table"]["value"])):
	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	return zoo.SERVICE_FAILED
    if inputs["table"]["value"]=="territoires":
        res=listTerritoires(cur,prefix,conf["senv"]["group"])
    else:
        if inputs["table"]["value"]=="themes":
            res=listThemes(cur,prefix,conf["senv"]["group"])
        else:
            if inputs["table"]["value"]=="idicateurs":
                res=listDefault(prefix+inputs["table"]["value"],cur," order by ord")
            else:
                res=listDefault(prefix+inputs["table"]["value"],cur)
    if res is not None:
        for i in res:
            i["selected"]=True
            break
        outputs["Result"]["value"]=json.dumps(res)
    else:
        conf["lenv"]["message"]="Unable to access table"
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED

def orderElement(conf,inputs,outputs):
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    if inputs["node"].has_key("length"):
        for i in range(0,int(inputs["node"]["length"])):
            cur.execute("UPDATE "+inputs["table"]["value"]+" set ord="+str(i+1)+" WHERE id="+inputs["node"]["value"][i])
    else:
        cur.execute("UPDATE "+inputs["table"]["value"]+" set ord=1 WHERE id="+inputs["node"]["value"])
    con.conn.commit()
    con.conn.close()
    outputs["Result"]["value"]=zoo._("Elements were ordered successfully")
    return zoo.SERVICE_SUCCEEDED

def insertElement(conf,inputs,outputs):
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    if not(auth.is_ftable(inputs["table"]["value"])):
	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	return zoo.SERVICE_FAILED
    try:
        prefix=auth.getPrefix(conf)
        cur.execute("INSERT INTO "+prefix+inputs["table"]["value"]+" (name) VALUES ("+str(adapt(inputs["name"]["value"]))+")")
        outputs["Result"]["value"]=zoo._("Done")
    except Exception,e:
        conf["lenv"]["message"]=zoo._("An error occured when processing your request: ")+str(e)
        return zoo.SERVICE_FAILED
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED

def createGraphView(conf,inputs,con,cur):
    req="SELECT i_id from indicateurs_territoires where id="+inputs["it_id"]["value"]
    cur.execute(req)
    vals=cur.fetchone()
    id=str(vals[0])
    tblName="indexes.view_idx_g_"+id+""
    otblName="indexes.view_idx"+id
    if inputs.has_key("tid"):
        tblName="indexes.view_idx_g_"+id+"_t_"+inputs["tid"]["value"]
        otblName="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"+id

    import mapscript
    if inputs.has_key("tid"):
        omapfile=conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_Index"+id+".map"
    else:
        omapfile=conf["main"]["dataPath"]+"/indexes_maps/project_Index"+id+".map"
    m=mapscript.mapObj(omapfile)
    ext=m.getLayer(0).extent
    m.setExtent(ext.minx,ext.miny,ext.maxx,ext.maxy);
    if inputs.has_key("step"):
        tmp=m.getLayer(0).metadata.get("mmSteps").split(",")
        #if tmp.count(inputs["step"]["value"])>0:
        #    tblName+="_"+str(tmp.index(inputs["step"]["value"]))
        tblName+="_"+str(inputs["step"]["value"])
    req="DROP VIEW "+tblName
    try:
        cur.execute(req)
        con.commit()
    except Exception,e:
        print >> sys.stderr,e
        con.commit()
    formula=inputs["formula"]["value"]
    vx=inputs["vx"]["value"]
    vy=inputs["vy"]["value"]
    req="CREATE VIEW "+tblName+" AS (SELECT ogc_fid,wkb_geometry,"+vx+","+(formula.replace("[_X_]",inputs["vy"]["value"]))+" as "+vy+" FROM "+otblName+") "
    if inputs.has_key("tid"):
        req="CREATE VIEW "+tblName+" AS (SELECT ogc_fid,wkb_geometry,"+vx+","+("[_X_]".replace("[_X_]",inputs["vy"]["value"]))+" as "+vy+" FROM "+otblName+") "
    print >> sys.stderr,req
    try:
        cur.execute(req)
        con.commit()
    except Exception,e:
        print >> sys.stderr,e
        con.commit()
    if inputs.has_key("step"):
        tmp=m.getLayer(0).metadata.get("mmSteps").split(",")
        if inputs.has_key("tid"):
            omapfile=conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_Index"+id+".map"
        else:
            omapfile=conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+id+"_indexes_view_idx"+id+"_step"+str(inputs["step"]["value"])+".map"
            id+="_step"+str(inputs["step"]["value"])
        m=mapscript.mapObj(omapfile)
    m.getLayer(0).data=tblName
    m.setExtent(ext.minx,ext.miny,ext.maxx,ext.maxy);
    if inputs.has_key("tid"):
        m.save(conf["main"]["dataPath"]+"/indexes_maps/project_A"+inputs["tid"]["value"]+"_GIndex"+id+".map")
    else:
        if inputs.has_key("step"):
            print >> sys.stderr,(conf["main"]["dataPath"]+"/indexes_maps/project_GIndex"+id+".map")
            m.save(conf["main"]["dataPath"]+"/indexes_maps/project_GIndex"+id+".map")#"_step"+inputs["step"]["value"]+".map")
        else:
            m.save(conf["main"]["dataPath"]+"/indexes_maps/project_GIndex"+id+".map")
    
def insertElem(conf,inputs,outputs):
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    if not(auth.is_ftable(inputs["table"]["value"])):
	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	return zoo.SERVICE_FAILED
    try:
        fields=""
        values=""
        for i in inputs.keys():
            if i!="table" and i!="tid" and inputs[i]["value"]!="":
    		if not(auth.is_ftable(inputs["table"]["value"])):
			conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
			return zoo.SERVICE_FAILED
                if fields!="":
                    fields+=","
                fields+=i
                if values!="":
                    values+=","
                if i.count("_id")>0:
                    values += inputs[i]["value"]
                else:
                    tmp = adapt(inputs[i]["value"])
                    values += str(tmp)

        req="INSERT INTO "+inputs["table"]["value"]+" ("+fields+") VALUES ("+values+")"
        print >> sys.stderr,req
        cur.execute(req)
        con.conn.commit()
        if inputs["table"]["value"]=="graphs":
            outputs["Result"]["value"]=zoo._("Done (with graph view creation)")
            createGraphView(conf,inputs,con.conn,cur)
        else:
            outputs["Result"]["value"]=zoo._("Done")
    except Exception,e:
        conf["lenv"]["message"]=zoo._("An error occured when processing your request: ")+str(e)
        return zoo.SERVICE_FAILED
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED

def updateElem(conf,inputs,outputs):
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    if not(auth.is_ftable(inputs["table"]["value"])):
	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	return zoo.SERVICE_FAILED
    try:
        fields=""
        values=""
        for i in inputs.keys():
            if i!="table" and i!="id" and i!="tid" and inputs[i]["value"]!="":
                if fields!="":
                    fields+=","
                fields+=i+"="
                if i.count("_id")>0:
                    fields += inputs[i]["value"]
                else:
                    tmp = adapt(inputs[i]["value"])
                    fields += str(tmp)

	clause=""
	if inputs.has_key('tid'):
		print >> sys.stderr,""
        req="UPDATE "+inputs["table"]["value"]+" set "+fields+" where id="+inputs["id"]["value"]
        print >> sys.stderr,req
        cur.execute(req)
        con.conn.commit()
        if inputs["table"]["value"]=="graphs":
            outputs["Result"]["value"]=zoo._("Done (with graph view creation)")
            createGraphView(conf,inputs,con.conn,cur)
        else:
            outputs["Result"]["value"]=zoo._("Done")
    except Exception,e:
        conf["lenv"]["message"]=zoo._("An error occured when processing your request: ")+str(e)
        return zoo.SERVICE_FAILED
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED

def updateKeywords(cur,nom,i_id,k):
    tmp = adapt(nom)
    req0="SELECT id from keywords where "
    req0+= " nom = ".encode("utf-8")+str(tmp)
    cur.execute(req0)
    vals=cur.fetchone()
    tmp = adapt(nom)
    tmp0= str(tmp)
    if vals is not None and len(vals)>0:
        clause= " id = " + str(vals[0])
        req="UPDATE keywords set nom = "+tmp0+" where "+clause
    else:
        req="INSERT INTO keywords (nom) VALUES ("+tmp0+")"
    cur.execute(req)
    if k==0:
        req="DELETE FROM indicateurs_keywords where i_id="+i_id+";"
    else:
        req=""
    req+="INSERT INTO indicateurs_keywords(i_id,k_id) VALUES ("+i_id+",("+req0+"))"
    cur.execute(req)
    
def updateElement(conf,inputs,outputs):
    import json
    print >> sys.stderr,inputs["tuple"]["value"]
    obj=json.loads(inputs["tuple"]["value"].replace("\n","").replace("\t",""))
    
    if not(obj.has_key("id")):
        conf["lenv"]["message"]=zoo._("Please provide an id for the tuple to update")
        return zoo.SERVICE_FAILED

    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()

    li_id=str(obj["id"])
    print >> sys.stderr,"li_d"
    print >> sys.stderr,li_id
    print >> sys.stderr,obj
    print >> sys.stderr,"li_d"

    
    if inputs.has_key("keywords"):
        tmp0=inputs["keywords"]["value"].split(',')
        if len(tmp0)==1:
            tmp0=inputs["keywords"]["value"].split(';')
        for k in range(0,len(tmp0)):
            print >> sys.stderr,"li_d"
            updateKeywords(cur,tmp0[k],li_id,k)
            print >> sys.stderr,"li_d"
            con.conn.commit()
            print >> sys.stderr,"li_d"
        
    prefix=auth.getPrefix(conf)
    req0="UPDATE "+prefix+inputs["table"]["value"]+" set "
    clause="id=[_id_]"
    #clause="id="+str(obj["id"])
    keys=obj.keys()
    cnt=0
    req1=None
    req2=None
    avoidReq1=False
    params={}
    for i in keys:
        if i is None or obj[i] == "":
            continue
        if i=="id":
            continue
        if not(obj[i].__class__.__name__ in ('list', 'tuple')):
            if cnt>0:
                req0+=", "
            try:
                if obj[i]!="-1" and obj[i]!="":
                    #tmp = adapt(obj[i].encode('utf-8'))
                    req0+= i +" = [_"+i+"_]"
                    params[i]={"value":obj[i],"format":"s"}
                    #req0+= i +" = "+str(tmp).decode("utf-8")
                else:
                    req0+=" "+i+"=NULL"
            except Exception,e :
                print >> sys.stderr,e
                req0+=" "+i+"=[_"+i+"_]"
                params[i]={"value":obj[i],"format":"s"}
                #req0+=" "+i+"="+obj[i]
                #req0+=" "+i+"="+obj[i]
            cnt+=1
        else:
            for j in range(0,len(obj[i])):
		ntname=prefix+i
                if not(avoidReq1):
                    req1="DELETE FROM "+ntname+" WHERE "+inputs[i+"_in"]["value"]+"="+str(obj["id"])
                    cur.execute(req1)
                    print >> sys.stderr,req1
                    req1=None
                    avoidReq1=True
                if obj[i][j]!="-1":
                    if req2 is None:
			req2=[]
                    req2+=["INSERT INTO "+ntname+" ("+inputs[i+"_in"]["value"]+","+inputs[i+"_out"]["value"]+") VALUES ("+str(obj["id"])+","+obj[i][j]+")"] 
                #if req2 is not None:
                #    print >> sys.stderr,req2
                #    cur.execute(req2)
                #    req2=None
            avoidReq1=False
    req0+=" WHERE "+clause
    params["id"]={"value":obj["id"],"format":"s"}

    print >> sys.stderr,req0.encode("utf-8")

    try:
        con.pexecute_req([req0,params])
        #cur.execute(req0)
        if req1 is not None:
            cur.execute(req1)
        if req2 is not None:
	    for i in range(0,len(req2)):
		cur.execute(req2[i])
            #cur.execute(req2)
        con.conn.commit()
        con.conn.close()
    except Exception,e:
        conf["lenv"]["message"]=zoo._("Unable to run the SQL request: ")+str(e)
        return zoo.SERVICE_FAILED

    try:
        if ["documents","indicateurs"].count(inputs["table"]["value"])>0 :
            import shutil
            shutil.copy(conf["main"]["tmpPath"]+"/data_tmp_1111"+conf["senv"]["MMID"]+"/"+obj['filename'],conf["main"]["publicationPath"]+"/"+inputs["table"]["value"]+"/"+obj['filename'])
    except Exception,e:
        print >> sys.stderr,zoo._("Unable to copy uploaded file: ")+str(e)
        pass
    outputs["Result"]["value"]=zoo._("Done")
    return zoo.SERVICE_SUCCEEDED

def deleteElement(conf,inputs,outputs):
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    prefix=auth.getPrefix(conf)
    if not(auth.is_ftable(inputs["table"]["value"])):
        conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
        return zoo.SERVICE_FAILED
    if inputs.has_key("atable") and inputs["atable"]["value"]!="NULL":
        if inputs["atable"]["value"].__class__.__name__ in ('list', 'tuple'):
            for i in range(0,len(inputs["atable"]["value"])):
                if not(auth.is_ftable(inputs["atable"]["value"][i])):
                    conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
                    return zoo.SERVICE_FAILED
                req="DELETE FROM "+prefix+inputs["atable"]["value"][i]+" WHERE "+inputs["akey"]["value"][i]+"=[_id_]"
                con.pexecute_req([req,{"id":{"value":inputs["id"]["value"],"format":"s"}}])
                con.conn.commit()
        else:
            if not(auth.is_ftable(inputs["atable"]["value"])):
                conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
                return zoo.SERVICE_FAILED
            req="DELETE FROM "+prefix+inputs["atable"]["value"]+" WHERE "+inputs["akey"]["value"]+"=[_id_]"
            con.pexecute_req([req,{"id":{"value":inputs["id"]["value"],"format":"s"}}])
            con.conn.commit()
    try:
        if inputs["table"]["value"]=="themes":
            con.pexecute_req(["DELETE FROM "+prefix+inputs["table"]["value"]+" where id=[_id_]",{"id":{"value":inputs["id"]["value"],"format":"s"}}])
        else:
            con.pexecute_req(["DELETE FROM "+prefix+inputs["table"]["value"]+" where id=[_id_]",{"id":{"value":inputs["id"]["value"],"format":"s"}}])
            if inputs["table"]["value"]=="indicateurs":
                import glob,os,shutil
                rpath=conf["main"]["dataPath"]+"/indexes_maps/"
                try:
                    os.unlink(rpath+"project_PIndex"+inputs["id"]["value"]+".map")
                except:
                    pass
        outputs["Result"]["value"]=zoo._("Element deleted")
    except Exception,e:
        conf["lenv"]["message"]=zoo._("An error occured when processing your request: ")+str(e)
        return zoo.SERVICE_FAILED
    con.conn.commit()
    con.conn.close()
    return zoo.SERVICE_SUCCEEDED

def detailsDocuments(con,val,prefix):
    req0="select id,name,description,filename,url from "+prefix+"documents where id=[_id_]"
    con.pexecute_req([req0,{"id":{"value":str(val),"format":"s"}}])
    vals=con.cur.fetchall()
    res={}
    if len(vals)>0:
        res["id"]=vals[0][0]
        res["name"]=vals[0][1]
        res["description"]=vals[0][2]
        res["file"]=vals[0][3]
        res["url"]=vals[0][4]
    
    req1="select * from "+prefix+"themes where id in (select t_id from "+prefix+"documents_themes where d_id=[_id_])"
    con.pexecute_req([req1,{"id":{"value":str(val),"format":"s"}}])
    vals=con.cur.fetchall()
    res["documents_themes"]=[]
    if len(vals)>0:
        for i in range(0,len(vals)):
            res["documents_themes"]+=[vals[i][0]]
            req2="select * from "+prefix+"groups where id in (select g_id from "+prefix+"documents_groups where d_id=[_id_])"
            con.pexecute_req([req2,{"id":{"value":str(val),"format":"s"}}])
            try:
            	vals0=con.cur.fetchall()
            	res["documents_groups"]=[]
            	if len(vals0)>0:
                	for j in range(0,len(vals0)):
                    		res["documents_groups"]+=[vals0[j][0]]
            except:
		res["documents_groups"]+=[]

    return res

def detailsThemes(con,val,prefix):
    req0="select id,name,description,color,pid from "+prefix+"themes where id=[_id_]"
    con.pexecute_req([req0,{"id":{"value":str(val),"format":"s"}}])
    vals=con.cur.fetchall()
    res={}
    if len(vals)>0:
        res["id"]=vals[0][0]
        res["name"]=vals[0][1]
        res["description"]=vals[0][2]
        res["color"]=vals[0][3]
        res["pid"]=vals[0][4]
    
    req1="select id from indicateurs where id in (select i_id from indicateurs_themes where t_id=[_t_id_]"
    try:
    	con.pexecute_req([req1,{"t_id":{"value":str(val),"format":"s"}}])
    	vals=cur.fetchall()
    	res["indicateurs_themes"]=[]
    	if len(vals)>0:
        	for i in range(0,len(vals)):
            		res["indicateurs_themes"]+=[vals[i][0]]
    except:
	print >> sys.stderr,dir(con.cur)
	con.cur.connection.commit()
    	pass
    req2="select * from "+prefix+"groups where id in (select g_id from "+prefix+"themes_groups where t_id=[_t_id_])"
    con.pexecute_req([req2,{"t_id": {"value":str(val),"format":"s"}}])
    vals=con.cur.fetchall()
    res["themes_groups"]=[]
    if len(vals)>0:
        for i in range(0,len(vals)):
            res["themes_groups"]+=[vals[i][0]]
    return res

def detailsTerritoires(cur,val,prefix):
    req0="select * from "+prefix+"territoires where id="+str(val)
    cur.execute(req0)
    vals=cur.fetchall()
    res={}
    if len(vals)>0:
        res["id"]=vals[0][0]
        res["name"]=vals[0][1]
        res["dataSource"]=vals[0][2]
    
    req1="select * from "+prefix+"territoires where id in (select p_t_id from "+prefix+"t_hierarchy where o_t_id="+str(val)+")"
    cur.execute(req1)
    vals=cur.fetchall()
    res["t_hierarchy"]=[]
    if len(vals)>0:
        for i in range(0,len(vals)):
            res["t_hierarchy"]+=[vals[i][0]]

    req2="select * from "+prefix+"groups where id in (select g_id from "+prefix+"territoires_groups where t_id="+str(val)+")"
    cur.execute(req2)
    vals=cur.fetchall()
    res["territoires_groups"]=[]
    if len(vals)>0:
        for i in range(0,len(vals)):
            res["territoires_groups"]+=[vals[i][0]]
    return res

def detailsIndicateurs(inputs,cur,val,tab,prefix):
    res={}
    if tab=="metadata":
        req0="SELECT id, name, description, sources, filename, url from "+prefix+"indicateurs where id="+val
        cur.execute(req0)
        vals=cur.fetchall()
        if len(vals)>0:
            res["id"]=vals[0][0]
            res["name"]=vals[0][1]
            res["description"]=vals[0][2]
            res["sources"]=vals[0][3]
            res["file"]=vals[0][4]
            res["url"]=vals[0][5]

        suffix=" and (not(agregation) or agregation is null)"
        req1="select count(*) from "+prefix+"indicateurs_territoires where i_id="+val+suffix
        print >> sys.stderr,req1
        cur.execute(req1)
        vals=cur.fetchall()
        if len(vals)>0 and vals[0][0]>0:
            req2="SELECT t_id, o_key_link, filename, tbl_link, tbl_key_link, query, ds from "+prefix+"indicateurs_territoires where i_id="+val+suffix
            print >> sys.stderr,req2
            cur.execute(req2)
            vals=cur.fetchall()
            if len(vals)>0:
                res["indicateurs_territoires"]=vals[0][0]
                res["indicateurs_territoires_key"]=vals[0][1]
                res["file_link"]=str(vals[0][2])
                res["tbl_link"]=vals[0][3]
                res["tbl_key_link"]=vals[0][4]
                res["query"]=vals[0][5]
                res["ds"]=vals[0][6]

        req0="select count(*) from "+prefix+"indicateurs_keywords where i_id="+val
        print >> sys.stderr,req0
        cur.execute(req0)
        vals=cur.fetchall()
        if len(vals)>0 and vals[0][0]>0:
            req2="SELECT nom from keywords where id in (SELECT k_id from "+prefix+"indicateurs_keywords where i_id="+val+")"
            print >> sys.stderr,req2
            cur.execute(req2)
            vals=cur.fetchall()
            if len(vals)>0:
                for k in range(0,len(vals)):
                    if res.has_key("indicateurs_keywords"):
                        res["indicateurs_keywords"]+=","+str(vals[k][0].encode("utf-8")).decode('utf-8')
                    else:
                        res["indicateurs_keywords"]=str(vals[k][0].encode("utf-8")).decode('utf-8')

        req2="select * from "+prefix+"groups where id in (select g_id from "+prefix+"indicateurs_groups where i_id="+str(val)+")"
        cur.execute(req2)
        vals=cur.fetchall()
        res["indicateurs_groups"]=[]
        if len(vals)>0:
            for i in range(0,len(vals)):
                res["indicateurs_groups"]+=[vals[i][0]]

        print >> sys.stderr,inputs
        if inputs.has_key("public"):
            req22='select t_id from '+prefix+'indicateurs_territoires,'+prefix+'territoires where indicateurs_territoires.t_id=territoires.id and indicateurs_territoires.i_id='+str(res["id"])+' and agregation;'
            print >> sys.stderr,req22
            cur.execute(req22)
            vals=cur.fetchall()
            res["agregation"]=[]
            res["agregation_pkeys"]=[]
            if len(vals)>0:
                for i in range(0,len(vals)):
                    res["agregation"]+=[vals[i][0]]
                    req23="select var from dtable where it_id in (select indicateurs_territoires.id from indicateurs_territoires, indicateurs where indicateurs_territoires.i_id=indicateurs.id and indicateurs.id="+str(res["id"])+" and t_id="+str(vals[i][0])+"and agregation) and pos=0"
                    cur.execute(req23)
                    vals23=cur.fetchall()
                    if len(vals23)>0:
                    	for j in range(0,len(vals23)):
                    		res["agregation_pkeys"]+=[vals23[j][0]]


            
            req2="select name from "+prefix+"themes where id in (select t_id from "+prefix+"indicateurs_themes where i_id="+str(val)+")"
        else:
            req2="select id from "+prefix+"themes where id in (select t_id from "+prefix+"indicateurs_themes where i_id="+str(val)+")"
        cur.execute(req2)
        vals=cur.fetchall()
        res["indicateurs_themes"]=[]
        if len(vals)>0:
            for i in range(0,len(vals)):
                try:
                    res["indicateurs_themes"]+=[str(vals[i][0].encode('utf-8')).decode('utf-8')]
                except:
                    res["indicateurs_themes"]+=[str(vals[i][0])]
    else:
        tab0=tab.split("_")
        suffix=" and (not(agregation) or agregation is null)"
        reqSuffix1=" and step is null"
        if inputs.has_key("tid"):
            suffix=" and t_id="+inputs["tid"]["value"]
        if inputs.has_key("step"):
            reqSuffix1=" and step="+inputs["step"]["value"]
        if tab=="graph":
            print >> sys.stderr,"Load graph !!"
            req0="SELECT name, type, lx, vx, ly, vy, tooltip, id, formula,step from graphs where it_id=(SELECT id from indicateurs_territoires where i_id="+val+" "+suffix+")"+reqSuffix1
            cur.execute(req0)
            vals=cur.fetchall()
            if len(vals)>0:
                res["title"]=vals[0][0]
                res["f_type"]=vals[0][1]
                res["lx"]=vals[0][2]
                res["vx"]=vals[0][3]
                res["ly"]=vals[0][4]
                res["vy"]=vals[0][5]
                res["tooltip"]=vals[0][6]
                res["id"]=vals[0][7]
                res["formula"]=vals[0][8]
                res["step"]=vals[0][9]
        elif tab=="table":
            print >> sys.stderr,"Load table !!"
            req0="SELECT name, id, order_by, step from d_table where i_id="+val+reqSuffix1
            print >> sys.stderr,req0+" !!"
            
            cur.execute(req0)
            vals=cur.fetchall()
            if len(vals)>0:
                res["title"]=vals[0][0]
                res["id"]=vals[0][1]
                res["order_by"]=vals[0][2]
                res["step"]=vals[0][3]
        elif tab0[0]=="agregation":
            print >> sys.stderr,"Load agregate !!"
            req0="SELECT formula FROM agregation where it_id=(SELECT id from indicateurs_territoires where i_id="+val+suffix+" order by id limit 1) and t_id="+tab0[1]
            print >> sys.stderr,req0+" !!"
            
            cur.execute(req0)
            vals=cur.fetchall()
            if len(vals)>0:
                res["formula"]=vals[0][0]
        elif tab0[0]=="repport":
            print >> sys.stderr,"Load repport !!"
            req0="SELECT doc FROM r_table where i_id="+val+reqSuffix1
            print >> sys.stderr,req0+" !!"
            
            cur.execute(req0)
            vals=cur.fetchall()
            if len(vals)>0:
                res["doc"]=vals[0][0]

    return res

def details(conf,inputs,outputs):
    import json,time,os
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur=con.conn.cursor()
    res=None
    if not(auth.is_ftable(inputs["table"]["value"])):
	conf["lenv"]["message"]=zoo._("Unable to identify your parameter as table or field name")
	return zoo.SERVICE_FAILED
    if inputs["table"]["value"]=="territoires":
        res=detailsTerritoires(cur,inputs["id"]["value"],prefix)
    else:
        if inputs["table"]["value"]=="themes":
            res=detailsThemes(con,inputs["id"]["value"],prefix)
        if inputs["table"]["value"]=="indicateurs":
            if inputs.has_key("tab"):
                res=detailsIndicateurs(inputs,cur,inputs["id"]["value"],inputs["tab"]["value"],prefix)
                if res.has_key("doc"):
                    res["doc_url"]=conf["main"]["publicationUrl"]+"/idx_templates/"+res["doc"]        
            else:
                res=detailsIndicateurs(inputs,cur,inputs["id"]["value"],"metadata",prefix)
                try:
                    mpath=conf["main"]["dataPath"]+'/indexes_maps/project_PIndex'+str(res["id"])+".map"
                    open(mpath)
                    res["published"]="true"
                    import locale
                    oloc=locale.setlocale(locale.LC_ALL,None)
                    print >> sys.stderr,conf["main"]["language"]
                    locale.setlocale(locale.LC_ALL,conf["main"]["language"].replace("-","_")+".utf-8")
                    res["pdate"]=unicode(time.strftime(conf["mm"]["dateFormat"],time.localtime(os.path.getmtime(mpath))).decode('utf-8'))
                    import mapscript
                    m=mapscript.mapObj(mpath)
                    res["cache_file"]=m.web.metadata.get('cache_file')
                except IOError:
                    res["published"]="false"

            conf["senv"]["last_index"]=inputs["id"]["value"]
        if inputs["table"]["value"]=="documents":
            res=detailsDocuments(con,inputs["id"]["value"],prefix)
    if res.has_key("file_link"):
        conf["senv"]["last_file"]=res["file_link"]
    if res is not None:
        print >> sys.stderr,res
        outputs["Result"]["value"]=json.dumps(res,ensure_ascii=False).encode('utf-8')
        #outputs["Result"]["value"]=json.dumps(res)
    else:
        conf["lenv"]["message"]="Unable to access table"
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED

def csv2ods(conf,inputs,outputs):
    try:
        f=open(conf["main"]["tmpPath"]+"/"+inputs["file"]["value"]+".csv")
        ivalues=f.read()
        ivalues=ivalues.split("\n")
        values=[]
        script="import print.PaperMint as PaperMint\n"
        script+="pm=PaperMint.LOClient()\n"
        for i in range(len(ivalues)):
            values+=[ivalues[i].split(",")]
        import json,os
        options=""
        for i in range(0,len(values[0])):
            if options!="":
                options+="/"
            options+="2"
        options="9/44,39,76,1,"+options
        script+='pm.csv2ods1("'+conf["main"]["tmpPath"]+"/"+inputs["file"]["value"]+'.csv","'+conf["main"]["tmpPath"]+"/"+inputs["file"]["value"]+'.ods",'+json.dumps(options)+')\nimport sys\nprint("quit",file=sys.stderr)\nsys.exit(0)\n'
        from subprocess import Popen, PIPE
        err_log = file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'w', 0)
        #os.dup2(err_log.fileno(), sys.stderr.fileno())
        process = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)
        process.stdin.write(script)
        process.stdin.close()
        process.wait()
        #sys.stderr.flush()
        #sys.stderr.close()
        conf["lenv"]["message"]=str(process.stdout.readline())
        outputs["Result"]["value"]=conf["main"]["tmpUrl"]+inputs["file"]["value"]+'.ods'
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]=e
        return zoo.SERVICE_FAILED
    
def previewDoc(conf,inputs,outputs):
    import json,os
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur=con.conn.cursor()

    tablePrefix="indexes.view_idx"
    table1Prefix="indexes.view_idx_"
    graphPrefix="indexes.view_idx_g_"
    graphSuffix=""
    if inputs.has_key("step"):
	graphSuffix="_"+inputs["step"]["value"]
    if inputs.has_key("tid"):
        tablePrefix="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"
        table1Prefix="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"
        graphPrefix="indexes.view_idx_g_"
        graphSuffix="_t_"+inputs["tid"]["value"]
    _oid="(SELECT max(ogc_fid) from "+tablePrefix+inputs["id"]["value"]+")"
    oid="(select wkb_geometry from "+tablePrefix+inputs["id"]["value"]+" where ogc_fid="+_oid+")"
    all_ids="(SELECT ogc_fid FROM "+tablePrefix+inputs["id"]["value"]+" WHERE ST_Touches(wkb_geometry,"+oid+"))"
    req="SELECT * FROM "+graphPrefix+inputs["id"]["value"]+graphSuffix+" WHERE ogc_fid="+_oid+" OR ogc_fid in "+all_ids
    req1="SELECT * FROM "+table1Prefix+inputs["id"]["value"]+" WHERE ogc_fid="+_oid+" OR ogc_fid in "+all_ids
    if inputs.has_key("step"):
        if inputs.has_key("tid"):
            req1="SELECT * FROM "+table1Prefix+inputs["id"]["value"]+"_step"+inputs["step"]["value"]+" WHERE ogc_fid="+_oid+" OR ogc_fid in "+all_ids
        else:
            req1="SELECT * FROM "+table1Prefix+inputs["id"]["value"]+"_"+inputs["step"]["value"]+" WHERE ogc_fid="+_oid+" OR ogc_fid in "+all_ids
    print >> sys.stderr,req1
    res=cur.execute(req)
    vals=cur.fetchall()
    rvals=[[""],[],[]]
    for i in range(0,len(vals)):
        rvals[1]+=[vals[i][2]]
        rvals[2]+=[[vals[i][3]]]
    fields=[]
    # Load the map
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_Index"+inputs["id"]["value"]+".map"
    if inputs.has_key("step"):
        mapfile=conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+inputs["id"]["value"]+"_indexes_view_idx"+inputs["id"]["value"]+"_step"+inputs["step"]["value"]+".map"
    print >> sys.stderr,mapfile
    m=mapscript.mapObj(mapfile)
    print >> sys.stderr,mapfile
    for i in range(m.numlayers):
        m.getLayer(i).status=mapscript.MS_ON
    m.setProjection("init=epsg:900913")
    req="SELECT * FROM (SELECT st_xmin(wkb_geometry)||' '||st_ymin(wkb_geometry)||' '||st_xmax(wkb_geometry)||' '||st_ymax(wkb_geometry) as wkb_geometry FROM (SELECT ST_Transform(ST_Union(wkb_geometry),900913) as wkb_geometry FROM "+table1Prefix+inputs["id"]["value"]+" WHERE ogc_fid="+_oid+" OR ogc_fid in "+all_ids+") as foo) As foo1"
    res=cur.execute(req)
    vals0=cur.fetchall()
    print >> sys.stderr,vals0
    ext=vals0[0][0].split(' ')
    m.setExtent(float(ext[0]),float(ext[1]),float(ext[2]),float(ext[3]))
    m.setSize(1024*3,768*3)
    print >> sys.stderr,req1
    m.getLayer(0).data=req1
    for i in range(0,m.getLayer(0).numclasses):
        m.getLayer(0).getClass(i).getStyle(0).updateFromString("STYLE OUTLINECOLOR 255 0 0 WIDTH 1.2 END")
    i=m.draw()
    import time
    savedImage=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(time.clock()).split(".")[1]+".png"
    try:
        os.unlink(savedImage)
    except:
        pass
    i.save(savedImage)

    print >> sys.stderr,vals0
    inputs0=inputs
    outputs0={"Result":{"value":""}}
    getIndexDisplayJs(conf,inputs,outputs0)
    print >> sys.stderr,outputs0
    tmp=json.loads(outputs0["Result"]["value"]);
    tmp=tmp["values"]
    lfields=[]
    for i in range(0,len(tmp)):
        lfields+=[tmp[i]["display"]]
	if i==0:
    		inputs0["sortname"]={"value": tmp[0]["name"]}
    inputs0["sortorder"]={"value": "asc"}
    inputs0["limit"]={"value": "10"}
    inputs0["page"]={"value": "1"}
    inputs0["_id"]={"value": "ogc_fid="+_oid+" OR ogc_fid in "+all_ids}
    print >> sys.stderr,str(inputs0)
    tvals=_getIndexValues(conf,inputs0,fields)
    print >> sys.stderr,tvals
    from subprocess import Popen, PIPE
    if conf.has_key("oo") and conf["oo"].has_key("external") and conf["oo"]["external"]=="true":
        sys.stderr.flush()
        err_log = file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'w', 0)
        os.dup2(err_log.fileno(), sys.stderr.fileno())
        process = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)
        script="import print.PaperMint as PaperMint\n"
        script+="pm=PaperMint.LOClient()\n"
        script+="pm.loadDoc('"+conf["main"]["publicationPath"]+"/idx_templates/"+inputs["oDoc"]["value"]+"')\n"
        #print >> sys.stderr,"fields: \n"+json.dumps([lfields]+tvals[1])
        script+="pm.addTable(\"[_table_]\","+json.dumps([lfields]+tvals[1])+")\n"
        script+='pm.searchAndReplaceImage("[_map_]","'+savedImage+'")\n'
        script+="pm.statThis(\"[_diag_]\","+json.dumps(rvals)+")\n"

        reqSuffix=""
        if inputs.has_key("tid"):
            reqSuffix+=" and agregation and t_id="+inputs["tid"]["value"]
        else:
            reqSuffix+=" and (not(agregation) or agregation is null)"

        reqSuffix1=""
        if inputs.has_key("step"):
            reqSuffix1+=" and step="+inputs["step"]["value"]
        else:
            reqSuffix1+=" and step is null"
        req="select var,value from rtable where it_id=(SELECT id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+") "+reqSuffix1+" and typ=0"

        res=cur.execute(req)
        vals1=cur.fetchall()
        #print >> sys.stderr,vals1
        for i in range(0,len(vals1)):
            req0=("select ").encode("utf-8")+vals1[i][1]+(" as ").encode("utf-8")+vals1[i][0]+(" from "+tablePrefix+inputs["id"]["value"]+" WHERE ogc_fid="+_oid).encode("utf-8")
            print >> sys.stderr,req0.encode('utf-8')
            cur.execute(req0)
            vals2=cur.fetchone()
            #print >> sys.stderr,vals2
            script+="pm.searchAndReplace('[_"+vals1[i][0]+"_]',"+json.dumps(vals2[0])+")\n"

            
        req1="select var,value from rtable where it_id=(SELECT id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+") "+reqSuffix1+" and typ=6"
        res1=cur.execute(req1)
        vals2=cur.fetchall()
        #print >> sys.stderr,vals1
        for i in range(0,len(vals2)):
            req0="SELECT sources FROM indicateurs WHERE id="+inputs["id"]["value"]
            print >> sys.stderr,req0.encode('utf-8')
            cur.execute(req0)
            vals3=cur.fetchone()
            #print >> sys.stderr,vals2
            if vals3[0] is not None:
                script+="pm.searchAndReplace('[_"+vals2[i][0]+"_]',"+json.dumps(vals3[0])+")\n"
            else:
                script+="pm.searchAndReplace('[_"+vals2[i][0]+"_]','')\n"
        
        docPath=conf["main"]["tmpPath"]+"/preview_tmp_"+conf["senv"]["MMID"]+".pdf"
        script+="pm.saveDoc('"+docPath+"')\n"
        docPath=conf["main"]["tmpPath"]+"/preview_tmp_"+conf["senv"]["MMID"]+".odt"
        script+="pm.saveDoc('"+docPath+"')\n"
        docPath=conf["main"]["tmpPath"]+"/preview_tmp_"+conf["senv"]["MMID"]+".pdf"
        script+="pm.saveDoc('"+docPath+"')\n"
        script+="pm.unloadDoc('"+conf["main"]["publicationPath"]+"/idx_templates/"+inputs["oDoc"]["value"]+"')\n"
        process.stdin.write(script)
        process.stdin.close()
        conf["lenv"]["message"]=str(process.stdout.readline())
        sys.stderr.flush()
        sys.stderr.close()
        err_log=file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'r', 0)
        conf["lenv"]["message"]+=str(err_log.read())
    try:
        outputs["Result"]["value"]=open(docPath,"r").read()
        import os
        os.unlink(docPath)
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]+=str(e)
        pass
    return zoo.SERVICE_FAILED

def addLayerForIndex(conf,inputs,outputs):
    import mapscript
    lName="indexes.view_idx"+inputs["id"]["value"]
    reqSuffix=" and (not(agregation) or agregation is null)"
    if inputs.has_key("tid"):
        lName="indexes.agregate_t"+inputs["tid"]["value"]+"_idx_"+inputs["id"]["value"]
        reqSuffix=" and (agregation and t_id = "+inputs["tid"]["value"]+")"
    if inputs.has_key("step"):
        lName+="_step"+inputs["step"]["value"]
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map")
    if m.getLayerByName(lName) is not None:
        m.removeLayer(m.getLayerByName(lName).index)
    print >> sys.stderr,dir(m)
    print >> sys.stderr,lName
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur=con.conn.cursor()
    cur.execute("select datasource from territoires where id in (select t_id from indicateurs_territoires where i_id="+inputs["id"]["value"]+reqSuffix+")")
    vals=cur.fetchone()
    l=m.getLayerByName(vals[0].replace("public.",""))
    print >> sys.stderr,dir(l)
    l1=l.clone()
    print >> sys.stderr,dir(l1)
    l1.name=lName
    l1.data=lName
    print >> sys.stderr,m.insertLayer(l1)
    m.save(conf["main"]["dataPath"]+"/PostGIS/"+conf["main"]["dbuserName"]+"ds_ows.map")
    outputs["Result"]["value"]="The mapfile was successfully updated"
    print >> sys.stderr,outputs["Result"]["value"]
    return zoo.SERVICE_SUCCEEDED

def printOdt(conf,script,process,idx,id,cid,f_out,typ=None,tid=None,step=None):
    import json,os,shutil
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur=con.conn.cursor()

    tablePrefix="indexes.view_idx"
    table1Prefix="indexes.view_idx_"
    graphPrefix="indexes.view_idx_g_"
    graphSuffix=""

    if tid is not None:
        tablePrefix="indexes.agregate_t"+str(tid)+"_idx_"
        table1Prefix="indexes.agregate_t"+str(tid)+"_idx_"
        graphPrefix="indexes.view_idx_g_"
        graphSuffix="_t_"+str(tid)
    if step is not None:
	graphSuffix="_"+str(step)
    
    _oid=str(id)
    oid="(select wkb_geometry from "+tablePrefix+idx+" where ogc_fid="+_oid+")"
    all_ids="("+cid+")"
    req0="SELECT * FROM "+graphPrefix+idx+graphSuffix+" WHERE ogc_fid in "+all_ids
    req1="SELECT * FROM "+table1Prefix+idx+" WHERE ogc_fid in "+all_ids

    if step is not None:
        if tid is not None:
            req1="SELECT * FROM "+table1Prefix+idx+"_step"+str(step)+" WHERE ogc_fid in "+all_ids
        else:
            req1="SELECT * FROM "+table1Prefix+idx+"_"+str(step)+" WHERE ogc_fid in "+all_ids

    print >> sys.stderr,req1
    print >> sys.stderr,req0
    res=cur.execute(req0)
    vals=cur.fetchall()
    rvals=[[""],[],[]]
    for i in range(0,len(vals)):
        rvals[1]+=[vals[i][2]]
        rvals[2]+=[[vals[i][3]]]
    fields=[]
    # Load the map
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_PIndex"+idx+".map"
    if tid is not None:
        mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_A"+str(tid)+"_PIndex"+idx+".map"
    if step is not None:
        mapfile=conf["main"]["dataPath"]+"/indexes_maps/timeline_PIndex"+idx+"_indexes_view_idx"+idx+"_step"+str(step)+".map"
    m=mapscript.mapObj(mapfile)
    for i in range(m.numlayers):
        m.getLayer(i).status=mapscript.MS_ON
    m.setProjection("init=epsg:900913")
    req="SELECT * FROM (SELECT st_xmin(wkb_geometry)||' '||st_ymin(wkb_geometry)||' '||st_xmax(wkb_geometry)||' '||st_ymax(wkb_geometry) as wkb_geometry FROM (SELECT ST_Transform(ST_Union(wkb_geometry),900913) as wkb_geometry FROM "+table1Prefix+idx+" WHERE ogc_fid in "+all_ids+") as foo) As foo1"
    res=cur.execute(req)
    vals0=cur.fetchall()
    print >> sys.stderr,vals0
    ext=vals0[0][0].split(' ')
    m.setExtent(float(ext[0]),float(ext[1]),float(ext[2]),float(ext[3]))
    m.setSize(1024*1.5,768*1.5)
    print >> sys.stderr,req1
    m.getLayer(0).data=req1
    mLocation=m.clone()
    print >> sys.stderr,"*************************"
    print >> sys.stderr,mLocation
    print >> sys.stderr,"*************************"
    coeff=1;
    size=(1024*coeff,768*coeff)
    import math
    n0=math.log((((20037508.34*2)*size[0])/(256*(float(ext[2])-float(ext[0])))),2)
    m0=math.log(((20037508.34*size[1])/(256*(float(ext[3])-float(ext[1])))),2)
    if n0 > m0:
        zl=int(n0)
    else:
        zl=int(m0)
    import pp.service as p
    p.addBgLayer(conf,m,size,zl,ext)
    mmClasses=[["Classes"],[],[]]

    reqSuffix=""
    if tid is not None:
        reqSuffix+=" and agregation and t_id="+str(tid)
    else:
        reqSuffix+=" and (not(agregation) or agregation is null)"


    lreq0="SELECT value from rtable where var='classes' and it_id=(SELECT id from indicateurs_territoires where i_id="+idx+reqSuffix+")"
    print >> sys.stderr,lreq0+"\n\n*******"
    cur.execute(lreq0)
    lvals0=cur.fetchone()
    if lvals0 is not None:
        lvals0=lvals0[0]
    else:
        lvals0=""
    print >> sys.stderr,lvals0
    print >> sys.stderr,"\n\n*******"
    mmName=m.getLayer(0).metadata.get("mmName")
    for i in range(0,m.getLayer(0).numclasses):
        m.getLayer(0).getClass(i).getStyle(0).updateFromString("STYLE OUTLINECOLOR 255 255 255 WIDTH 1.2 END")
        lreq="SELECT COUNT(*) FROM ("+req1+") as foo WHERE "+m.getLayer(0).getClass(i).getExpressionString().replace("[",'"').replace("]",'"'+lvals0)
        print >> sys.stderr,lreq+"\n\n*******"
        cur.execute(lreq)
        lvals=cur.fetchone()
        mmClasses[1]+=[m.getLayer(0).getClass(i).name]
        mmClasses[2]+=[[str(lvals[0])]]
    print >> sys.stderr,mmClasses
        

    i=m.draw()
    import time
    savedImage=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(time.clock()).split(".")[1]+".png"
    try:
        os.unlink(savedImage)
    except:
        pass
    i.save(savedImage)

    print >> sys.stderr,vals0
    if tid is not None:
    	inputs0={"id":{"value":idx},"tid":{"value":tid}}
    else:
    	inputs0={"id":{"value":idx}}
    if step is not None:
	inputs0["step"]={"value":step}
    outputs0={"Result":{"value":""}}
    getIndexDisplayJs(conf,inputs0,outputs0)
    print >> sys.stderr,outputs0["Result"]["value"]
    tmp=json.loads(outputs0["Result"]["value"])
    lfields=[]
    tmp=tmp["values"]
    print >> sys.stderr,tmp
    for i in range(0,len(tmp)):
        lfields+=[tmp[i]["display"]]
    inputs0["sortname"]={"value": tmp[0]["name"]}
    inputs0["sortorder"]={"value": "asc"}
    inputs0["limit"]={"value": "10"}
    inputs0["page"]={"value": "1"}
    inputs0["_id"]={"value": "ogc_fid in "+all_ids}
    #print >> sys.stderr,str(inputs0)
    tvals=_getIndexValues(conf,inputs0,fields)
    #print >> sys.stderr,tvals

    if conf.has_key("oo") and conf["oo"].has_key("external") and conf["oo"]["external"]=="true":
        #script+="pm.loadDoc('"+conf["main"]["publicationPath"]+"/idx_templates/"+inputs["oDoc"]["value"]+"')\n"
        rreq="select doc from r_table where i_id="+idx
        cur.execute(rreq)
        rvals0=cur.fetchone()
        if rvals0 is not None:
            docPath=conf["main"]["publicationPath"]+"/idx_templates/"+rvals0[0]
        else:
            rreq="select count(*) from graphs where type='hist' and it_id=(SELECT id from indicateurs_territoires where i_id="+idx+reqSuffix+")"
            cur.execute(rreq)
            rvals0=cur.fetchone()
            if rvals0[0]>0:
                docPath=conf["main"]["publicationPath"]+"/idx_templates/default_hist.odt"
            else:
                docPath=conf["main"]["publicationPath"]+"/idx_templates/default_circ.odt"
        shutil.copy(docPath,docPath.replace(".odt","_"+_oid+"_init.odt").replace(conf["main"]["publicationPath"]+"/idx_templates/",conf["main"]["tmpPath"]+"/"))
        docPath=docPath.replace(".odt","_"+_oid+"_init.odt").replace(conf["main"]["publicationPath"]+"/idx_templates/",conf["main"]["tmpPath"]+"/")
        script+="pm.loadDoc('"+docPath+"')\n"
        saveDocPath=docPath
        #print >> sys.stderr,"fields: \n"+json.dumps([lfields]+tvals[1])
        if typ is None:
            script+="pm.addTable(\"[_table_]\","+json.dumps([lfields]+tvals[1])+")\n"
            script+='pm.searchAndReplaceImage("[_map_]","'+savedImage+'")\n'
            script+="pm.statThis(\"[_diag_]\","+json.dumps(rvals)+")\n"
        else:
            script+="pm.exportStatAsImage(\"diag\",\"[_diag_]\","+json.dumps(rvals)+")\n"

        outputs1={"Result": {"value": ""}}
        print >> sys.stderr,"parseDocAttr "+saveDocPath
        if typ is None:
            res=parseDocAttr(conf,{"fullpath":{"value":"true"},"template":{"value":saveDocPath}},outputs1)
            tmp=json.loads(outputs1["Result"]["value"])
            for i in tmp:
                if i=="classes":
                    script+="pm.statThis(\"[_classes_]\","+json.dumps(mmClasses)+")\n"
                else:
                    if i not in ["table","diag","map"]:
                        req="select value,typ from rtable where it_id=(SELECT id from indicateurs_territoires where i_id="+idx+reqSuffix+") and step is null and var='"+i+"'"
                        cur.execute(req)
                        lvals=cur.fetchone()
                        if lvals is not None:
                            if lvals[1]==0:
                                req0=lvals[0].encode('utf-8')
                                print >> sys.stderr,req0
                                try:
                                    con.conn.commit()
                                    cur.execute(req0)
                                    lvals1=cur.fetchone()
                                except:
                                    con.conn.commit()
                                    lvals1=[lvals[0].encode('utf-8')]
                                if lvals1 is not None:
                                    script+="pm.searchAndReplace('[_"+i+"_]',"+json.dumps(lvals1[0])+")\n"
                                else:
                                    script+="pm.searchAndReplace('[_"+i+"_]','')\n"
                            if lvals[1]==3:
                                req0=lvals[0].replace("[_X_]",mmName).replace("[_T_]",tablePrefix+idx).replace("[_F_in_]",all_ids).replace("[_F_out_]",f_out)
                                print >> sys.stderr,req0
                                cur.execute(req0)
                                lvals1=cur.fetchall()
                                if lvals1 is not None:
                                    script+="pm.addTable(\"[_"+i+"_]\","+json.dumps(lvals1).replace("null",zoo._("None"))+")\n"
                            if lvals[1]==4:
                                req0=lvals[0].replace("[_X_]",mmName).replace("[_T_]",tablePrefix+idx).replace("[_F_in_]",all_ids).replace("[_F_out_]",f_out)
                                print >> sys.stderr,req0
                                print >> sys.stderr,i
                                cur.execute(req0)
                                lvals1=cur.fetchall()
                                if lvals1 is not None:
                                    script+="pm.statThis(\"[_"+i+"_]\","+json.dumps(lvals1).replace("null",zoo._("None"))+")\n"
                            if lvals[1]==5:
                                req0="SELECT description FROM indicateurs WHERE id="+idx
                                cur.execute(req0)
                                lvals1=cur.fetchone()
                                if lvals1 is not None and lvals1[0] is not None:
                                    fname=conf["main"]["tmpPath"]+"/tmp_"+conf["senv"]["MMID"]+".html"
                                    f=open(fname,"wb")
                                    f.write(lvals1[0])
                                    f.close()
                                    script+="pm.goToWord('[_"+i+"_]');"
                                    script+="pm.insertDoc(\""+fname+"\")\n"
                                    script+="pm.searchAndReplace('[_"+i+"_]',\"\")\n"
                                else:
                                    script+="pm.searchAndReplace('[_"+i+"_]',\"\")\n"
                            if lvals[1]==6:
                                req0="SELECT sources FROM indicateurs WHERE id="+idx
                                print >> sys.stderr,req0
                                cur.execute(req0)
                                lvals1=cur.fetchone()
                                if lvals1 is not None and lvals1[0] is not None:
                                    script+="pm.searchAndReplace('[_"+i+"_]',"+json.dumps(lvals1[0])+")\n"
                                else:
                                    script+="pm.searchAndReplace('[_"+i+"_]',\"\")\n"
                            if lvals[1]==7:
                                l0=mLocation.getLayer(0)
                                req2="SELECT * FROM "+table1Prefix+idx+" WHERE ogc_fid in "+all_ids
                                l0.data=req2
                                for ij in range(1,l0.numclasses):
                                    l0.removeClass(1)
                                l0.getClass(0).removeStyle(0)
                                l0.getClass(0).updateFromString("CLASS STYLE OPACITY 25 COLOR 255 0 0 OUTLINECOLOR 255 255 255 WIDTH 1.2 END END")
                                l0.getClass(0).setExpression(None)
                                l1=l0.clone()
                                req="SELECT datasource FROM territoires where id = (SELECT t_id from indicateurs_territoires where i_id="+idx+reqSuffix+")"
                                print >> sys.stderr,req
                                cur.execute(req)
                                vals=cur.fetchone()
                                req11="SELECT ogc_fid FROM "+vals[0]+" WHERE "+f_out
                                req3="SELECT * FROM "+table1Prefix+idx+" WHERE ogc_fid in ("+req11+")"
                                l1.getClass(0).removeStyle(0)
                                l1.getClass(0).updateFromString("CLASS STYLE OPACITY 25 COLOR 0 0 255 OUTLINECOLOR 255 255 255 WIDTH 1.2 END END")
                                l1.data=req3
                                l1.name+="_Compare"
                                l0.status=mapscript.MS_ON
                                l1.status=mapscript.MS_ON
                                mLocation.insertLayer(l1)
                                req="SELECT * FROM (SELECT st_xmin(wkb_geometry),st_ymin(wkb_geometry),st_xmax(wkb_geometry),st_ymax(wkb_geometry) FROM (SELECT ST_Transform(ST_Union(wkb_geometry),900913) as wkb_geometry FROM "+table1Prefix+idx+" WHERE ogc_fid in ("+req11+") OR ogc_fid in "+all_ids+" ) as foo) As foo1"
                                print >> sys.stderr,req
                                res=cur.execute(req)
                                vals0=cur.fetchone()
                                mLocation.setExtent(vals0[0],vals0[1],vals0[2],vals0[3])
                                ext=(vals0[0],vals0[1],vals0[2],vals0[3])
                                mLocation.save("/tmp/demo.map")
                                coeff=1;
                                size=(1024*coeff,768*coeff)
                                import math
                                n0=math.log((((20037508.34*2)*size[0])/(256*(float(ext[2])-float(ext[0])))),2)
                                m0=math.log(((20037508.34*size[1])/(256*(float(ext[3])-float(ext[1])))),2)
                                if n0 > m0:
                                    zl=int(n0)
                                else:
                                    zl=int(m0)
                                import pp.service as p
                                p.addBgLayer(conf,mLocation,size,zl,ext)

                                im=mLocation.draw()
                                savedImage=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(time.clock()).split(".")[1]+".png"
                                try:
                                    os.unlink(savedImage)
                                except:
                                    pass
                                im.save(savedImage)
                                script+='pm.searchAndReplaceImage("[_'+i+'_]","'+savedImage+'")\n'
                            
        #rreq="select doc from rtable where i_id="+idx
        print >> sys.stderr,tmp
        print >> sys.stderr,"\n\n--------------"

        req="select var,value from rtable where it_id=(SELECT id from indicateurs_territoires where i_id="+idx+reqSuffix+") and step is null and typ=0"
        #if inputs.has_key("step"):
        #    req="select var,value from rtable where it_id=(SELECT id from indicateurs_territoires where i_id="+idx+reqSuffix+") and step = "+inputs["step"]["value"]+" and typ=0"
        #print >> sys.stderr,req
        res=cur.execute(req)
        saveReq=req
        vals1=cur.fetchall()
        #print >> sys.stderr,vals1
        #for i in range(0,len(vals1)):
        #    req0=("select ").encode("utf-8")+vals1[i][1]+(" as ").encode("utf-8")+vals1[i][0]+(" from "+tablePrefix+idx+" WHERE ogc_fid="+_oid).encode("utf-8")
        #    print >> sys.stderr,req0.encode('utf-8')
        #    cur.execute(req0)
        #    vals2=cur.fetchone()
        #    #print >> sys.stderr,vals2
        #    try:
        #        script+="pm.searchAndReplace('[_"+vals1[i][0]+"_]',"+json.dumps(vals2[0])+")\n"
        #    except:
        #        pass
        
        docPath=conf["main"]["tmpPath"]+"/preview_tmp_"+conf["lenv"]["usid"]+"_"+_oid+".odt"
        script+="pm.saveDoc('"+docPath+"')\n"
        script+="pm.saveDoc('"+docPath.replace(".odt","_final.odt")+"')\n"
        script+="pm.unloadDoc('"+saveDocPath+"')\n"
        script+="import sys\nimport shutil\nprint('OK FINISHED',file=sys.stderr)\n"
        script+="print('OK FINISHED',file=sys.stderr)\n"
        #script+="pm.unloadDoc('"+conf["main"]["publicationPath"]+"/idx_templates/"+inputs["oDoc"]["value"]+"')\n"
        script=script.encode("utf-8")
        print >> sys.stderr,"OK start"
        print >> sys.stderr,"--------------------------------------------"
        print >> sys.stderr,script
        print >> sys.stderr,"--------------------------------------------"
        from subprocess import Popen, PIPE
        process1 = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)        
        process1.stdin.write(script)
        process1.stdin.close()
        process1.wait()
        #shutil.copy(docPath,docPath.replace(".odt","_final.odt"))
        #

        #print >> sys.stderr,process.stdin.read()
        print >> sys.stderr,"OK finished"
        return docPath.replace(".odt","_final.odt")
        
    print >> sys.stderr,"OK finished"
    return zoo.SERVICE_FAILED

def viewRepport(conf,inputs,outputs):
    import json,os,shutil
    from subprocess import Popen, PIPE
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur=con.conn.cursor()

    conf["lenv"]["message"]="Fetch items"
    zoo.update_status(conf,10)
    field=inputs["field"]["value"]
    clause0=""
    clause=""
    if inputs["in_val"].has_key("length"):
        for i in range(0,int(inputs["in_val"]["length"])):
            tmp0 = "%s" % adapt(inputs["in_val"]["value"][i]).getquoted()
            if clause!="":
                clause+=" OR "
            clause+=field+"="+tmp0
    else:
        tmp0 = "%s" % adapt(inputs["in_val"]["value"]).getquoted()
        clause+=field+"="+tmp0

    clause_out=""
    clause_out0=""
    if inputs.has_key("out_val"):
        if inputs["out_val"].has_key("length"):
            for i in range(0,int(inputs["out_val"]["length"])):
                tmp0 = "%s" % adapt(inputs["out_val"]["value"][i]).getquoted()
                if clause_out!="":
                    clause_out+=" OR "
                    clause_out0+=field+"="+tmp0
                clause_out+=field+"="+tmp0
        else:
            tmp0 = "%s" % adapt(inputs["out_val"]["value"]).getquoted()
            clause_out+=field+"="+tmp0

    req="SELECT datasource FROM territoires where id = "+inputs["tid"]["value"]
    cur.execute(req)
    vals=cur.fetchone()
    req="SELECT ogc_fid FROM "+vals[0]+" WHERE "+clause
    saveReq=req
    tbl=vals[0]

    conf["lenv"]["message"]="Start PaperMint client"
    zoo.update_status(conf,10)
    sys.stderr.flush()
    err_log = file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'w', 0)
    os.dup2(err_log.fileno(), sys.stderr.fileno())
    process = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)

    script="import sys\nimport shutil\n"
    script+="import print.PaperMint as PaperMint\n"
    script+="pm=PaperMint.LOClient()\n"
    process.stdin.write(script)
    # Check for agregation
    if inputs["idx"].has_key('length'):
	clause="("
	for i in range(0,int(inputs["idx"]["length"])):
		if clause!="(":
			clause+=" OR "
		clause+="i_id="+inputs["idx"]["value"][i]
	clause+=")"
    else:
	clause="i_id="+inputs["idx"]["value"]
    nreq0="select CASE WHEN agregation is NULL THEN false ELSE agregation END from indicateurs_territoires where "+clause+" and t_id="+inputs["tid"]["value"]
    cur.execute(nreq0)
    lres=cur.fetchone()
    agregation=lres[0]
    if agregation is None:
    	agregation=False
    print >> sys.stderr,"AGREGATION: "+str(agregation)

    # Treate Context Indexes
    nreq="select indicateurs_territoires.i_id from indicateurs_groups, indicateurs_territoires, velo.groups where indicateurs_groups.i_id=indicateurs_territoires.i_id and indicateurs_groups.g_id=velo.groups.id and name='context' and t_id="+inputs["tid"]["value"]
    cur.execute(nreq)
    idxs=cur.fetchall()
    if len(idxs)>0:
        cval=inputs["idx"]["value"]
        if inputs["idx"].has_key("length"):
            inputs["idx"]["length"]=str(int(inputs["idx"]["length"])+len(idxs))
        else:
            inputs["idx"]["length"]=str(1+len(idxs))
            inputs["idx"]["value"]=[cval]
        for i in range(0,len(idxs)):
            inputs["idx"]["value"]+=[str(idxs[i][0])]
            notAccepted=len(inputs["idx"]["value"])-1
    cur.execute(req)
    vals=cur.fetchall()
    req="SELECT ogc_fid FROM "+tbl+" WHERE "+clause_out
    doc=[]
    final_doc=""
    import shutil
    for i in range(0,len(vals)):
        print >> sys.stderr,vals[i][0]
        if inputs["idx"].has_key("length"):
            for j in range(0,int(inputs["idx"]["length"])):
                print >> sys.stderr,inputs["idx"]["value"][j]
                conf["lenv"]["message"]=zoo._("Producing document ")+str(j+1)+zoo._(" on ")+inputs["idx"]["length"]
                zoo.update_status(conf,12+(((j+1)*60)/int(inputs["idx"]["length"])))
                if agregation:
                	doc_tmp=printOdt(conf,script,process,inputs["idx"]["value"][j],vals[i][0],saveReq,clause_out,tid=inputs["tid"]["value"])
                else:
			if inputs.has_key("step"):
				lstep=inputs["step"]["value"]
			else:
				lstep=None
			if j==notAccepted:
				lstep=None
			idx=inputs["idx"]["value"][j]
			try:
    				mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_PIndex"+idx+".map"
				import mapscript
				tmp1=mapscript.mapObj(mapfile)
				tmp0=tmp1.getLayer(0).metadata.get("mmSteps")
				tmp2=tmp1.getLayer(0).metadata.get("mmClass")
			except Exception,e:
				tmp0=None
				tmp1=None
				tmp2=None
    			if tmp0 is None and tmp1 is None and inputs["tid"]["value"]!="null":
        			mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_A"+str(inputs["tid"]["value"])+"_PIndex"+idx+".map"
				tmp0=mapscript.mapObj(mapfile).getLayer(0).metadata.get("mmSteps")
			if tmp2=="tl" and tmp0 is not None:
				tmp0=tmp0.split(',')
				for k in range(0,len(tmp0)):
                			doc_tmp=printOdt(conf,script,process,inputs["idx"]["value"][j],vals[i][0],saveReq,clause_out,step=str(k))
					if k+1<len(tmp0):
						final_doc=doc_tmp.replace(".odt","_"+str(k)+"_"+str(j)+".odt")
						shutil.copy(doc_tmp,final_doc)
						doc+=[final_doc]
			else:
				doc_tmp=printOdt(conf,script,process,inputs["idx"]["value"][j],vals[i][0],saveReq,clause_out)
                final_doc=doc_tmp.replace(".odt","_"+str(j)+".odt")
                shutil.copy(doc_tmp,final_doc)
                doc+=[final_doc]
                #shutil.copy(doc[len(doc)-1],doc[len(doc)-1].replace(".odt",str(i+j)+"_00.odt"))
        else:
            print >> sys.stderr,inputs["idx"]["value"]
            print >> sys.stderr,vals[i][0]
            print >> sys.stderr,req
            conf["lenv"]["message"]=zoo._("Producing document")
            zoo.update_status(conf,52)
            if agregation:
            	doc+=[printOdt(conf,script,process,inputs["idx"]["value"],vals[i][0],saveReq,clause_out,tid=inputs["tid"]["value"])]
            else:
            	doc+=[printOdt(conf,script,process,inputs["idx"]["value"],vals[i][0],saveReq,clause_out)]
            #shutil.copy(doc[len(doc)-1],doc[len(doc)-1].replace(".odt",str(i)+"_00.odt"))
        break
    print >> sys.stderr,doc
    conf["lenv"]["message"]=zoo._("Compiling documents in PDF format")
    zoo.update_status(conf,92)
    if(len(doc)>=2):
        for i in range(len(doc)):
            print >> sys.stderr,"Append doc !"
            if i==0:
                final_doc=doc[i].replace(".odt","_"+str(i)+".odt")
                shutil.copy(doc[i],final_doc)
                script+="pm.loadDoc('"+final_doc+"')\n"
            else:
                print >> sys.stderr,doc[i]
                script+="pm.appendDoc('"+doc[i]+"')\n"
        final_doc=final_doc.replace(".odt",".pdf")
        script+="pm.saveDoc('"+final_doc+"')\nsys.exit(0)\n"
    else:
        final_doc=doc[0].replace(".odt",".pdf")
        script+="pm.loadDoc('"+doc[0]+"')\n"
        script+="pm.saveDoc('"+final_doc+"')\n"
        script+="pm.unloadDoc('"+doc[0]+"')\n"

    print >> sys.stderr,"OK Start\n\n-------------------------------------------"
    print >> sys.stderr,script
    process.stdin.write(script)
    process.stdin.close()
    conf["lenv"]["message"]=str(process.stdout.readline())
    sys.stderr.flush()
    
    #err_log=file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'r', 0)
    #conf["lenv"]["message"]=str(err_log.readl())
    process.wait()

    try:
        outputs["Result"]["value"]=open(final_doc,"rb").read()
        import os
        os.unlink(final_doc)
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]=str(e)
        return zoo.SERVICE_FAILED


def viewStatOnly(conf,inputs,outputs):
    import json,os,shutil,time
    from subprocess import Popen, PIPE
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur=con.conn.cursor()

    conf["lenv"]["message"]="Fetch items"
    zoo.update_status(conf,10)

    reqSuffix=""
    if inputs.has_key("tid"):
        reqSuffix+=" and agregation and t_id="+inputs["tid"]["value"]
    else:
        reqSuffix+=" and (not(agregation) or agregation is null)"

    clause="SELECT id FROM indicateurs_territoires where i_id = "+inputs["id"]["value"]+reqSuffix

    req="select vx,vy,name from graphs where it_id in ("+clause+")"
    cur.execute(req)
    vals=cur.fetchone()
    print >> sys.stderr,req
    print >> sys.stderr,vals

    import vector_tools.service as vt
    elems=vt.readFileFromBuffer(inputs["elem"]["value"],"xml")
    if vals[2] is not None:
        rvals=[[vals[2]],[],[]]
    else:
        rvals=[[""],[],[]]
    for i in range(0,len(elems)):
        elem=json.loads(elems[i].ExportToJson())
        rvals[1]+=[elem["properties"][vals[0]]]
        rvals[2]+=[[float(elem["properties"][vals[1]])]]

    idx=inputs["id"]["value"]
    req="select doc from r_table where i_id="+idx
    print >> sys.stderr,req
    cur.execute(req)
    vals=cur.fetchone()

    _oid=conf["senv"]["MMID"]+(str(time.time()).replace(".",""))
    
    if vals is not None:
        docPath=conf["main"]["publicationPath"]+"/idx_templates/"+vals[0]
    else:
        rreq="select count(*) from graphs where type='hist' and it_id=(SELECT id from indicateurs_territoires where i_id="+idx+reqSuffix+")"
        cur.execute(rreq)
        rvals0=cur.fetchone()
        if rvals0[0]>0:
            docPath=conf["main"]["publicationPath"]+"/idx_templates/default_hist.odt"
        else:
            docPath=conf["main"]["publicationPath"]+"/idx_templates/default_circ.odt"
    fdocPath=docPath.replace(".odt","_"+_oid+"_init.odt").replace(conf["main"]["publicationPath"]+"/idx_templates/",conf["main"]["tmpPath"]+"/")
    shutil.copy(docPath,fdocPath)
    final_doc=fdocPath.replace("init","final")
    fdocPath1=final_doc.replace(".odt",".png")

    conf["lenv"]["message"]="Start PaperMint client"
    zoo.update_status(conf,10)
    sys.stderr.flush()
    err_log = file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'w', 0)
    os.dup2(err_log.fileno(), sys.stderr.fileno())
    process = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)

    print >> sys.stderr,"START ---"
    script="import sys\nimport shutil\n"
    script+="import print.PaperMint as PaperMint\n"
    script+="pm=PaperMint.LOClient()\n"
    conf["lenv"]["message"]="Generate document"
    zoo.update_status(conf,20)
    script+="pm.loadDoc('"+fdocPath+"')\n"
    script+="pm.exportStatAsImage(\""+fdocPath1+"\",'[_diag_]',"+json.dumps(rvals)+")\n"
    script+="pm.saveDoc('"+final_doc+"')\n"
    script+="pm.unloadDoc('"+fdocPath+"')\n"
    print >> sys.stderr,script
    print >> sys.stderr,"--- END"
    process.stdin.write(script)
    process.stdin.close()
    conf["lenv"]["message"]=str(process.stdout.readline())
    print >> sys.stderr,rvals
    sys.stderr.flush()
    #err_log=file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'r', 0)
    #conf["lenv"]["message"]=str(err_log.readl())
    process.wait()
    conf["lenv"]["message"]="Return document"
    zoo.update_status(conf,90)

    
    try:
        outputs["Result"]["value"]=open(fdocPath1,"rb").read()
        import os
        os.unlink(final_doc)
        os.unlink(fdocPath)
        os.unlink(fdocPath1)
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]=str(e)
        return zoo.SERVICE_FAILED


