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
import os.path
try:  
        from manage_users.manage_users import *
except:
        from manage_users import manage_users
import authenticate as auth

def removeDS(conf,inputs,outputs):
    #have to check before
    import datastores.directories.service as dirs
    import mapscript
    mj=mapscript.mapObj(inputs["dst"]["value"]+"/ds_ows.map")
    mj.removeLayer(mj.getLayerByName(inputs["dso"]["value"]).index)
    mj.save(conf["main"]["dataPath"]+"/ds_ows.map")
    return dirs.removeDS(conf,inputs,outputs)

def displayHTML(conf,inputs,outputs):
    #print >> sys.stderr,conf
    import datastores.directories.service as dirs
    #print >> sys.stderr,dir(dirs)
    inputs["state"]={"value":"open"}
    dirs.display(conf,inputs,outputs)
    dirStr=outputs["Result"]["value"]
    #print >> sys.stderr,outputs
    import postgis.service as dbs
    #Hard coded supported dbs !
    suported_dbs=["PostGIS","MySQL"]
    dbStrs={}
    for i in suported_dbs:
        dbs.display(conf,{"type":{"value":i}},outputs)
        dbStrs[i]=outputs["Result"]["value"]
    import datastores.wfs.service as wfs
    wfs.display(conf,{"type":{"value":"WFS"}},outputs)
    wfsStrs=outputs["Result"]["value"]
    wfs.display(conf,{"type":{"value":"WMS"}},outputs)
    wmsStrs=outputs["Result"]["value"]


    inputs["dirs"]={"value":dirStr}
    inputs["dbs"]={"value":dbStrs}
    inputs["wfs"]={"value":wfsStrs}
    inputs["wms"]={"value":wmsStrs}
    import template.service as tmpl
    tmpl.display(conf,{"tmpl":{"value":"Distiller"},"force":{"value":"true"}},outputs)
    return 3

def list(conf,inputs,outputs):
    elements={}
    import datastores.directories.service as dirs
    dirs.displayJSON(conf,{"state": {"value": "open"}},outputs)
    dirStr=eval(outputs["Result"]["value"])
    b=0
    for i in dirStr:
        if b==0:
            elements["Directories"]=[]
        elements["Directories"]+=[{"name": i["text"]}]
        b+=1
    import datastores.wfs.service as wfs
    import json

    wxs=["WFS","WMS"]
    for k in range(0,len(wxs)):
        outputs["Result"]["value"]='{"sub_elements":[]}'
        wfs.displayJSON(conf,{"state": {"value": "open"},"type":{"value":wxs[k]}},outputs)
        print >> sys.stderr,outputs["Result"]["value"]
        try:
            wfsStr=json.loads(outputs["Result"]["value"])
        except:
            wfsStr={"sub_elements":[]}
        b=0
        for i in wfsStr["sub_elements"]:
            if b==0:
                elements[wxs[k]]=[]
            elements[wxs[k]]+=[{"name": i["name"]}]
            b+=1

    import datastores.postgis.service as dbs
    suported_dbs=["PostGIS","MySQL"]
    dbStrs={}
    for i in suported_dbs:
        print >> sys.stderr,i
        dbs.displayJson(conf,{"type":{"value":i}},outputs)
        print >> sys.stderr,str(outputs["Result"]["value"])
        try:
            dbStrs[i]=json.loads(outputs["Result"]["value"])
            b=0
            for a in dbStrs[i]["sub_elements"]:
                tmpI={}
                if b==0:
                    elements[i]=[]
                b+=1
                outputs1={"Result":{}}
                inputs1={"type": {"value": i}, "name": {"value": a["name"]}}
                dbs.load(conf,inputs1,outputs1)
                print >> sys.stderr,"LOAD <=> "+str(outputs1)
                tmp=json.loads(outputs1["Result"]["value"])
                print >> sys.stderr,"tmp <=> "+str(tmp)
                li={}
                for c in tmp:
                    li[c]={}
                    li[c]["value"]=tmp[c].decode('utf-8')
                li["type"]={}
                li["type"]["value"]=i
                if dbs.test(conf,li,outputs)==3:
                    elements[i]+=[{"name": a["name"]}]
        except Exception,e:
            print >> sys.stderr, e
            pass
        print >> sys.stderr,"/"+i

    import json
    outputs["Result"]["value"]=json.dumps(elements)
    return 3


def options1(conf,inputs,outputs):
    import datastores.service as ds
    import mm_access
    ds.list(conf,inputs,outputs)
    elements=eval(outputs["Result"]["value"])
    print >>sys.stderr,str(elements)
    li=[]
    dsList=None
    dstnStr=""
    for a in elements:
        if a=="Directories":
            #print >> sys.stderr,"ELEMENTS A 0 "+str(elements[a][0])
            for j in range(0,len(elements[a])):
                if mm_access.checkDataStorePriv(conf,elements[a][j]["name"],"rx"):
                    dstnStr=elements[a][j]["name"]
                    print >> sys.stderr,"DSTN : "+dstnStr
                    outputs["Result"]["value"]="[]"
                    ds.listDataSource(conf,{"dstn":{"value": elements[a][j]["name"]+"/"}},outputs)
                    dsList=eval(outputs["Result"]["value"])
                    break
            #print >> sys.stderr,str(dsList)
        li+=[{"name": a}]
 
    import template.service as tmpl
    
    #print >> sys.stderr,conf
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map"
    import mapscript
    m = mapscript.mapObj(mapfile)
    levels=[m.web.metadata.get("mm_group_0")]
    try:
        level1=m.web.metadata.get("mm_group_1").split(',')
    except:
        level1=None
    try:
        level2=m.web.metadata.get("mm_group_2").split(';')
    except:
        level2=None
    if level1 is not None:
        for a in level1:
            levels+=["- "+a]
            if level2 is not None: 
                for b in level2:
                    tmp=b.split('|')
                    if len(tmp)>1 and tmp[1]==a:
                        tmp1=tmp[0].split(',')
                        for c in tmp1:
                            levels+=["-- "+c]
    import json
    outputs["Result"]["value"]=json.dumps(elements)

def options(conf,inputs,outputs):
    import datastores.service as ds
    import mm_access
    ds.list(conf,inputs,outputs)
    elements=eval(outputs["Result"]["value"])
    print >>sys.stderr,str(elements)
    li=[]
    dsList=None
    dstnStr=""
    for a in elements:
        if a=="Directories":
            #print >> sys.stderr,"ELEMENTS A 0 "+str(elements[a][0])
            for j in range(0,len(elements[a])):
                if mm_access.checkDataStorePriv(conf,elements[a][j]["name"],"rx"):
                    dstnStr=elements[a][j]["name"]
                    print >> sys.stderr,"DSTN : "+dstnStr
                    outputs["Result"]["value"]="[]"
                    ds.listDataSource(conf,{"dstn":{"value": elements[a][j]["name"]+"/"}},outputs)
                    dsList=eval(outputs["Result"]["value"])
                    break
            #print >> sys.stderr,str(dsList)
        li+=[{"name": a}]
 
    import template.service as tmpl
    
    #print >> sys.stderr,conf
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map"
    import mapscript
    m = mapscript.mapObj(mapfile)
    levels=[m.web.metadata.get("mm_group_0")]
    try:
        level1=m.web.metadata.get("mm_group_1").split(',')
    except:
        level1=None
    try:
        level2=m.web.metadata.get("mm_group_2").split(';')
    except:
        level2=None
    if level1 is not None:
        for a in level1:
            levels+=["- "+a]
            if level2 is not None: 
                for b in level2:
                    tmp=b.split('|')
                    if len(tmp)>1 and tmp[1]==a:
                        tmp1=tmp[0].split(',')
                        for c in tmp1:
                            levels+=["-- "+c]
    print >> sys.stderr,"TEMPLATE!"
    print >> sys.stderr,{"tmpl":{"value":"Manager/AddLayer"},"dstn": dstnStr,"elements": elements, "dsList": dsList, "groups": levels,"inputs":inputs}
    try:
        tmpl.display(conf,{"tmpl":{"value":"Manager/AddLayer"},"dstn": dstnStr,"elements": elements, "dsList": dsList, "groups": levels,"inputs":inputs},outputs)
    except Exception,e:
        print >> sys.stderr,e
    return 3

def listDataSource(conf,inputs,outputs):
    import mapscript
    import mm_access
    #print >> sys.stderr,inputs["dstn"]["value"].replace(conf["main"]["dataPath"]+"/dirs/","")
    mapfile=conf["main"]["dataPath"]+"/dirs/"+inputs["dstn"]["value"].replace(conf["main"]["dataPath"]+"/dirs/","")+"/ds_ows.map"
    #print >> sys.stderr,mapfile
    m=None
    try:
        print >> sys.stderr,mapfile
        m = mapscript.mapObj(mapfile)
    except Exception,e:
        print >> sys.stderr,e
        for i in ["PostGIS","MySQL"]:
            try:
                mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["dstn"]["value"]+"ds_ows.map"
                #print >> sys.stderr,mapfile
                m = mapscript.mapObj(mapfile)
            except Exception,e:
                print >> sys.stderr,e
                pass
        if m is None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
            return 4

    outputs["Result"]["value"]="["
    cnt=0
    for i in range(0,m.numlayers):
        j=m.getLayer(i)
        print >> sys.stderr,j.name+"not readable"
        if mm_access.checkLayerPriv(conf,m,j.name,"r"):
            if cnt>0:
                outputs["Result"]["value"]+=", "
            outputs["Result"]["value"]+="{'name': '"+j.name+"'}"
            cnt+=1
        else:
            print >> sys.stderr,j.name+"not readable"
    outputs["Result"]["value"]+="]"
    return 3

def startFromRoot(v):
    return v[0]=="/" or v[1]==":"

def getPath(conf,ds):
    if os.path.exists(ds) and startFromRoot(ds):
        if ds[len(ds)-1]=="/":
            return ds
        else:
            return ds+"/"
    else:
        print >> sys.stderr,ds
        if conf["mm"].has_key("supportedDbs"):
            for i in conf["mm"]["supportedDbs"].split(','):
                if os.path.exists(conf["main"]["dataPath"]+"/"+i+"/"+ds+".xml"):
                    return conf["main"]["dataPath"]+"/"+i+"/"+ds
        print >> sys.stderr,conf["mm"]["supportedDbs"]
        print >> sys.stderr,os.path.exists(conf["main"]["dataPath"]+"/dirs/"+ds)
        if os.path.exists(conf["main"]["dataPath"]+"/dirs/"+ds):
            if ds[len(ds)-1]!="/":
                return conf["main"]["dataPath"]+"/dirs/"+ds+"/"
            else:
                return conf["main"]["dataPath"]+"/dirs/"+ds
        print >> sys.stderr,conf["mm"]["supportedDbs"]
        if os.path.exists(conf["main"]["dataPath"]+"/WFS/"+ds.replace("WFS:","")+".txt"):
                return conf["main"]["dataPath"]+"/WFS/"+ds.replace("WFS:","")
        print >> sys.stderr,conf["mm"]["supportedDbs"]
        if os.path.exists(conf["main"]["dataPath"]+"/WMS/"+ds.replace("WMS:","")+".txt"):
                return conf["main"]["dataPath"]+"/WMS/"+ds.replace("WMS:","")

def saveDataStorePrivileges(conf,inputs,outputs):
    path=getPath(conf,inputs["dataStore"]["value"])
    cStr=""
    if inputs["group"].has_key("length"):
        for i in range(0,len(inputs["group"]["value"])):
            if cStr!="":
                cStr+="\n"
            cStr+=inputs["group"]["value"][i]
            for j in ["r","w","x"]:
                if inputs["ds_"+j]["value"][i]=="true":
                    inputs["ds_"+j]["value"][i]="1"
                else:
                    if inputs["ds_"+j]["value"][i]=="false":
                        inputs["ds_"+j]["value"][i]="0"
                cStr+=","+inputs["ds_"+j]["value"][i]
    else:
        cStr+=inputs["group"]["value"]
        for j in ["r","w","x"]:
            if inputs["ds_"+j]["value"]=="true":
                inputs["ds_"+j]["value"]="1"
            else:
                if inputs["ds_"+j]["value"]=="false":
                    inputs["ds_"+j]["value"]="0"
            cStr+=","+inputs["ds_"+j]["value"]
    f=open(path+".mmpriv","wb")
    f.write(cStr)
    f.close()
    outputs["Result"]["value"]=zoo._("Privileges saved")
    return zoo.SERVICE_SUCCEEDED

def getDataStorePrivileges(conf,inputs,outputs):
    import json
    path=getPath(conf,inputs["dataStore"]["value"])
    try:
        f=open(path+".mmpriv","rb")
        priv=f.read()
        privs=priv.split("\n")
        privf=[]
        for i in privs:
            privf+=[i.split(",")]
            outputs["Result"]["value"]=json.dumps(privf)
    except:
        outputs["Result"]["value"]=json.dumps([[conf["senv"]["group"],"1","1","1"]])
    return zoo.SERVICE_SUCCEEDED

def isFavSrs(conf,inputs,outputs):
    con=manage_users(conf["main"]["dblink"])
    con.connect(conf)
    clause="fav and "
    if inputs["srs_field"]["value"]=="id":
        clause+="code="
    else:
        clause+="name="
    clause+="[_val_]"
    v="SELECT count(*) from spatial_ref_sys WHERE "+clause
    try:
        con.pexecute_req([v,{"val":{"value":inputs["srs_id"]["value"],"format":"s"}}])
	val=con.cur.fetchone()
	print >> sys.stderr,val
	if val[0]>0:
        	outputs["Result"]["value"]="true"
	else:
		outputs["Result"]["value"]="false"
    except Exception,e:
	conf["lenv"]["message"]=zoo._("Error occured: ")+str(e)
	return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED

def saveFavSrs(conf,inputs,outputs):
    con=manage_users(conf["main"]["dblink"])
    con.connect(conf)
    var=0
    if inputs["fav"]["value"]=="true":
        var=1
    clause=""
    if inputs["srs_field"]["value"]=="id":
        clause+="code="
    else:
        clause+="name="
    clause+="[_val_]"
    v="UPDATE spatial_ref_sys set fav=[_fav_] WHERE "+clause
    try:
        con.pexecute_req([v,{"fav":{"value":str(var),"format":"s"},"val":{"value":inputs["srs_id"]["value"],"format":"s"}}])
        con.conn.commit()
        outputs["Result"]["value"]="SRS successfully updated"
    except Exception,e:
        outputs["Result"]["value"]="SRS update failed: "+str(e)
    return zoo.SERVICE_SUCCEEDED
