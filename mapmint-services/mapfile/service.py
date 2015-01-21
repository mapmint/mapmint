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
from Cheetah.Template import Template
import os
import sys
import zoo
import mm_access

if sys.platform == 'win32':
	import ntfslink
	os.readlink=ntfslink.readlink
	os.symlink=ntfslink.symlink

def canAccessLayer(conf,inputs,outputs):
    import mapscript,mm_access
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=str(mm_access.checkLayerPriv(conf,m,inputs["layer"]["value"],inputs["priv"]["value"])).lower()
    return zoo.SERVICE_SUCCEEDED

def searchByName(conf,inputs,outputs):
	import json
	res=[]
	print >> sys.stderr,os.listdir(conf["main"]["dataPath"]+"/maps/")
	for i in os.listdir(conf["main"]["dataPath"]+"/maps/"):
		if i.count("project_")>0 and i.count("_Untitled_0")==0 and i.count(inputs["val"]["value"])>0:
			mapn=i.replace("project_","").replace(".map","")
			res+=[{"id":mapn,"label":mapn,"value":mapn}]
	outputs["Result"]["value"]=json.dumps(res)
	return zoo.SERVICE_SUCCEEDED

def setGeometryType(conf,inputs,outputs):
    import mapscript
    mapfile=mapscript.mapObj(inputs["dst"]["value"]+"/ds_ows.map")
    lay=mapfile.getLayerByName(inputs["dso"]["value"])
    lay.type=int(inputs["geoType"]["value"])
    mapfile.save(inputs["dst"]["value"]+"/ds_ows.map")
    outputs["Result"]["value"]=zoo._("Gometry Type Updated")
    return zoo.SERVICE_SUCCEEDED
    
def saveFlyAddress(conf,inputs,outputs):
	import mapscript
	m = mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
	m.web.metadata.set("mmFlyAddress",inputs["flyAddress"]["value"])
	m.save(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
	outputs["Result"]["value"]=zoo._("Map saved")
	return zoo.SERVICE_SUCCEEDED

def saveComplexSearch(conf,inputs,outputs):
	import mapscript
	m = mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
	l=m.getLayerByName(inputs["layer"]["value"])
	l.metadata.set("mmCS","true")
	tmp=["colonne_class","alias_class","ids_class","sessions_class","values_class","deps_class","orders_class","multiples_class","subscription","legend"]
	tmp0=inputs.keys()
	for i in tmp:
		if tmp0.count(i)>0:
			l.metadata.set("mmCS_"+i,inputs[i]["value"])
		else:
			try:
				l.metadata.remove("mmCS_"+i)
			except:
				pass
	m.save(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
	outputs["Result"]["value"]=zoo._("Complex Search parameters saved.")
	return zoo.SERVICE_SUCCEEDED

def getFlyAddress(conf,inputs,outputs):
	import mapscript
	m = mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
	outputs["Result"]["value"]=str(m.web.metadata.get("mmFlyAddress"))
	return zoo.SERVICE_SUCCEEDED

def saveProjectMap(m,mapfile):
    m.save(mapfile)
    print >> sys.stderr,"Save : "+mapfile
    fi=open(mapfile,"r")
    tmp=fi.read()
    fi.close()
    if tmp!="":
        fo=open(mapfile,"w")
        fo.write(tmp.replace("CONNECTIONTYPE GRATICULE",""))
        fo.close()

def removeMap(conf,inputs,outputs):
    import time,sqlite3
    defaultMap=""
    try:
        nbMaps=0
        outputs["Result"]["value"]="Project was totally removed"
        for i in os.listdir(conf["main"]["dataPath"]+"/maps/"):
            if i.count("project_")>0 and i.count("_Untitled_0_")==0:
                nbMaps+=1
        if nbMaps > 1:
            for i in os.listdir(conf["main"]["dataPath"]+"/maps/"):
                if i.count("_"+inputs["map"]["value"]+"_")>0 or i.count("project_"+inputs["map"]["value"]+".map")>0:
                    os.unlink(conf["main"]["dataPath"]+"/maps/"+i)
                else:
                    if defaultMap=="" and i.count("project_")>0 and i.count(".map")>0 :
                        defaultMap=i.replace("project_","").replace(".map","")
            for i in os.listdir(conf["main"]["dataPath"]+"/public_maps/"):
                if i.count("_"+inputs["map"]["value"]+"_")>0 or i.count("project_"+inputs["map"]["value"]+".map")>0:
                    os.unlink(conf["main"]["dataPath"]+"/public_maps/"+i)
                try:
                    if os.readlink(conf["main"]["dataPath"]+"/public_maps/"+i).count("project_"+inputs["map"]["value"]+".map"):
                        os.unlink(conf["main"]["dataPath"]+"/public_maps/"+i)
                except:
                    pass
        else:
            outputs["Result"]["value"]=zoo._("Project cannot be removed because it is the last one available.")

        import libxml2
        doc=libxml2.parseDoc(open(conf["mm"]["mapcacheCfg"],'r').read())
        root=doc.xpathEval('/mapcache')
        nodes=doc.xpathEval('/mapcache/source[@name="'+inputs["mmProjectName"]["value"]+'"]')

        for j in range(len(nodes)):
            root[0].removeChild(nodes[j])

        nodes=doc.xpathEval('/mapcache/tileset[@name="'+inputs["mmProjectName"]["value"]+'Tile"]')
        for j in range(len(nodes)):
            root[0].removeChild(nodes[j])

        f=open(conf["mm"]["mapcacheCfg"],'w')
        doc.saveTo(f)
        f.close


    except:
        pass
    
    if defaultMap!="":
        conn = sqlite3.connect(conf['main']['dblink'])
        conn.execute("update users set last_map='"+defaultMap+"' where login='"+conf["senv"]["login"]+"'")
        conf["senv"]["last_map"]=defaultMap
        print >> sys.stderr,"DEFAULT MAP : "+defaultMap
        conn.commit()
        conn.close()
        conf["lenv"]["cookie"]="MMID=MM"+str(time.time()).split(".")[0]+"; path=/"
    return zoo.SERVICE_SUCCEEDED

def removeAllLayers(m,lname):
    index=m.numlayers-1
    while index >= 0:
        l=m.getLayer(index)
        if l is not None and l.name!=lname:
            m.removeLayer(index)
        index-=1


def options(conf,inputs,outputs):
    import datastores.service as ds
    #print >> sys.stderr,ds
    ds.list(conf,inputs,outputs)
    elements=eval(outputs["Result"]["value"])
    li=[]
    dsList=None
    n=0
    for a in elements:
        if n==0:
            listDataSource(conf,{"name":{"value": elements[a][0]["name"]}},outputs)
            dsList=eval(outputs["Result"]["value"])
        li+=[{"name": a}]
        n+=1

    import template.service as tmpl
    tmpl.display(conf,{"tmpl":{"value":"Manager/AddLayer"},"elements": elements, "dsList": dsList},outputs)
    return zoo.SERVICE_SUCCEEDED

def openInManager(conf,inputs,outputs):
    import mm_access
    if not(mm_access.checkDataSourcePriv(conf,None,inputs["dstn"]["value"],inputs["dson"]["value"],"r")):
        conf["lenv"]["message"]=zoo._("You're not allowed to access the ressource")
	return zoo.SERVICE_FAILED
    import mapscript,sqlite3,time
    print >> sys.stderr,inputs["dstn"]["value"].replace(conf["main"]["dataPath"]+"/dirs/","")
    mapfile=conf["main"]["dataPath"]+"/dirs/"+inputs["dstn"]["value"].replace(conf["main"]["dataPath"]+"/dirs/","")+"/ds_ows.map"
    print >> sys.stderr,mapfile
    m=None
    try:
        m = mapscript.mapObj(mapfile)
    except:
        for i in ["PostGIS","MySQL","WFS","WMS"]:
            try:
                mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["dstn"]["value"].replace("WFS:","").replace("WMS:","")+"ds_ows.map"
                print >> sys.stderr,mapfile
                m = mapscript.mapObj(mapfile)
            except:
                pass
        if m is None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
            return 4

    cnt=0

    m.setProjection("EPSG:4326")
    i=m.numlayers-1
    print >> sys.stderr,i
    while i >= 0:
        l=m.getLayer(i)
        print >> sys.stderr,l.name
        if l.name!=inputs["dson"]["value"]:
            m.removeLayer(i)
        else:
            l.setMetaData("mm_group","Group")
	    l.setMetaData("mmDSTN",inputs["dstn"]["value"])
        i-=1

    m.web.metadata.set("mm_group_0","Layers")
    m.web.metadata.set("mm_group_1","Legend,")
    m.web.metadata.set("mm_group_2","Group,|Legend;")

    m.save(conf["main"]["dataPath"]+"/maps/project_Untitled_0.map")
    import authenticate.service as auth
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    conn = con.conn.cursor()
    #conn = sqlite3.connect(conf['main']['dblink'])
    conn.execute("update "+prefix+"users set last_map='Untitled_0' where login='"+conf["senv"]["login"]+"'")
    conf["senv"]["last_map"]="Untitled_0"
    con.conn.commit()
    con.conn.close()
    #conf["lenv"]["cookie"]="MMID=MM"+str(time.time()).split(".")[0]+"; path=/"
    outputs["Result"]["value"]=zoo._("Project Untitled_0 is now available in your Manager.")
    import mmsession
    mmsession.save(conf)
    return zoo.SERVICE_SUCCEEDED


def refreshLayerInfo(conf,inputs,outputs):
    import mm_access,mapscript
    lmap=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
    llayer=lmap.getLayerByName(inputs["layer"]["value"])
    print >> sys.stderr,llayer.metadata.get("mmDSTN")
    dstn=llayer.metadata.get("mmDSTN")
    mapfile=conf["main"]["dataPath"]+"/dirs/"+dstn.replace(conf["main"]["dataPath"]+"/dirs/","")+"/ds_ows.map"
    print >> sys.stderr,mapfile
    m=None
    try:
        m = mapscript.mapObj(mapfile)
    except:
        for i in ["PostGIS","MySQL","WFS","WMS"]:
            try:
                mapfile=conf["main"]["dataPath"]+"/"+i+"/"+dstn.replace("WFS:","").replace("WMS:","")+"ds_ows.map"
                print >> sys.stderr,mapfile
                m = mapscript.mapObj(mapfile)
            except:
                pass
        if m is None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
            return 4

    cnt=0

    m.setProjection("EPSG:4326")
    i=m.numlayers-1
    while i >= 0:
        l=m.getLayer(i)
        if l.name!=llayer.data:
            m.removeLayer(i)
        i-=1

    llayer.setProjection(m.getLayer(0).getProjection())
    ext=m.getLayer(0).getExtent()
    print >> sys.stderr,ext
    llayer.setExtent(ext.minx,ext.miny,ext.maxx,ext.maxy)

    lmap.save(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
    outputs["Result"]["value"]=zoo._("Layer %s is now up-to-date in your %s project." % (inputs["layer"]["value"], inputs["map"]["value"]))
    import mmsession
    mmsession.save(conf)
    return zoo.SERVICE_SUCCEEDED

def listDataSource(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/dirs/"+inputs["name"]["value"]+"/ds_ows.map"
    m=None
    isWMS=False
    try:
        m = mapscript.mapObj(mapfile)
    except:
        for i in ["PostGIS","MySQL","WFS","WMS"]:
            try:
                mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["name"]["value"].replace("WFS:","").replace("WMS:","")+"ds_ows.map"
                print >> sys.stderr,mapfile
                m = mapscript.mapObj(mapfile)
		if inputs["name"]["value"].count('WMS'):
			isWMS=True
            except:
                pass
        if m is None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
            return 4
    res=[]
    outputs["Result"]["value"]="["
    for i in range(0,m.numlayers):
        j=m.getLayer(i)
	if mm_access.checkDataSourcePriv(conf,m,inputs["name"]["value"],j.name,"r"):
		if not(isWMS):
			res+=[j.name]
		else:
			res+=[{"name":j.metadata.get("ows_title"),"value":j.name}]
    if not(isWMS):
	    res.sort()
    for i in range(0,len(res)):
        if i>0:
            outputs["Result"]["value"]+=", "
	if not(isWMS):
		outputs["Result"]["value"]+="{'name': \""+res[i]+"\"}"
	else:
		outputs["Result"]["value"]+="{'name': \""+res[i]["name"]+"\",'value': \""+res[i]["value"]+"\"}"
    outputs["Result"]["value"]+="]"
    return zoo.SERVICE_SUCCEEDED

def mmDataStoreHasMap(conf,inputs,outputs):
    import mapscript
    mapfile=inputs["dataStore"]["value"]+"ds_ows.map"
    m=None
    print >> sys.stderr, mapfile
    try:
        m = mapscript.mapObj(mapfile)
    except Exception,e:
	print >> sys.stderr,e
        for i in ["PostGIS","MySQL","WFS","WMS"]:
            try:
                mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["dataStore"]["value"].replace("WFS:","").replace("WMS:","")+"ds_ows.map"
		print >> sys.stderr, mapfile
                m = mapscript.mapObj(mapfile)
            except:
                pass
        if m is None:
		outputs["Result"]["value"]="false"
		return zoo.SERVICE_SUCCEEDED
    if m is not None:
        outputs["Result"]["value"]="true"
    else:
        outputs["Result"]["value"]="false"
    return zoo.SERVICE_SUCCEEDED

def mmVectorInfo2MapPy(conf,inputs,outputs):
    import mapscript
    import libxml2
    mapfile=inputs["dataStore"]["value"]+"ds_ows.map"
    m=None
    print >> sys.stderr,mapfile
    try:
        m = mapscript.mapObj(mapfile)
    except Exception,e:
        print >> sys.stderr,e
        for i in ["PostGIS","MySQL","WFS","WMS"]:
            try:
                mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["dataStore"]["value"].replace("WFS:","").replace("WMS:","")+"ds_ows.map"
                print >> sys.stderr,"MAPFILE 0 "+mapfile
                m = mapscript.mapObj(mapfile)
                print >> sys.stderr,"MAPFILE 1 "+mapfile
		print >> sys.stderr,m.getLayer(0).type
		print >> sys.stderr,mapscript.MS_WMS
		print >> sys.stderr,m.getLayer(0).connectiontype
		if m.getLayer(0).connectiontype==mapscript.MS_WMS:
			
			print >> sys.stderr,m.web.metadata.get("ows_srs")
			m.web.metadata.set("ows_srs","EPSG:4326 EPSG:900913 EPSG:900914")
			print >> sys.stderr,m.web.metadata.get("ows_srs")
			print >> sys.stderr,dir(m)
			for i in range(0,m.numlayers):
				l=m.getLayer(i)
				con=l.connection
				tmp0=con.split("BBOX=")
				print >> sys.stderr,tmp0[1]
				tmp1=tmp0[1].split("&")
				if len(tmp1)>0:
					tmp=tmp1[0].split(",")
				else:
					tmp=tmp0[1].split(",")
				try:
					for i in range(0,len(tmp)):
						tmp[i]=eval(tmp[i])
					try:
						tmp1=con.split("SRS=")
						if tmp1 is None:
							tmp1=con.split("CRS=")
						if tmp1 is not None:
							tmp1=tmp1[1].split("&")
							l.setProjection(tmp1[0])
					except:
						pass

					if tmp0[0].count("format")==0 and tmp0[0].count("FORMAT")==0:
						tmp0[0]+="format=image/png"
					if tmp0[0].count("width")==0 and tmp0[0].count("height")==0:
						tmp0[0]+="&width=500&height=400"
						
					l.connection=tmp0[0]+"&BBOX="+str(tmp[0])+","+str(tmp[1])+","+str(tmp[2])+","+str(tmp[3])
					if not(l.processing):
						updateProcessing(layer,"RESAMPLE=NEAREST")
					l.setExtent(tmp[0],tmp[1],tmp[2],tmp[3])
				except Exception, e:
					print >> sys.stderr,e
			m.save(mapfile)
                print >> sys.stderr,mapfile
            except Exception,e:
		    print >> sys.stderr,e
		    pass
        if m is None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
            return 4
    doc=libxml2.newDoc("1.0")
    rnode = libxml2.newNode('datasource')
    print >> sys.stderr,mapfile
    for i in range(0,m.numlayers):
	print >> sys.stderr,mapfile
        j=m.getLayer(i)
	print >> sys.stderr,j
	print >> sys.stderr,j.name
	if mm_access.checkDataSourcePriv(conf,m,inputs["dataStore"]["value"].replace("WFS:","").replace("WMS:",""),j.name,"r"):
		node = libxml2.newNode('layer')
		node1 = libxml2.newNode('name')
		node1.addChild(libxml2.newText(j.name))
		node.addChild(node1)
		node1 = libxml2.newNode('geometry')
		val="Polygon"
		if j.type==mapscript.MS_LAYER_POINT:
			val="Point"
		else:
			if j.type==mapscript.MS_LAYER_LINE:
				val="Line String"
			else:
				if j.type==mapscript.MS_LAYER_RASTER:
					val="raster"

		node1.addChild(libxml2.newText(val))
		node.addChild(node1)

		if j.connectiontype==mapscript.MS_WMS:
			node1 = libxml2.newNode('label')
			node1.addChild(libxml2.newText(j.metadata.get('ows_title')))
			node.addChild(node1)
			
			node1 = libxml2.newNode('preview_link')
			node1.addChild(libxml2.newText(j.connection))
			node.addChild(node1)


		rnode.addChild(node)
    print >> sys.stderr,sys.stderr,mapfile
    doc.setRootElement(rnode)
    print >> sys.stderr,sys.stderr,mapfile
    outputs["Result"]["value"]=doc.serialize()
    print >> sys.stderr,sys.stderr,mapfile
    return zoo.SERVICE_SUCCEEDED

def redrawDsList(conf,inputs,outputs):
    listDataSource(conf,inputs,outputs)
    #print >> sys.stderr,outputs
    tmp=eval(outputs["Result"]["value"])
    for a in range(0,len(tmp)):
	    if not(tmp[a].has_key("value")):
		    tmp[a]["value"]=tmp[a]["name"]
    import json
    outputs["Result"]["value"]=json.dumps(tmp)
    return zoo.SERVICE_SUCCEEDED

def loadMapForDs(conf,inputs,outputs):
    outputs1=outputs
    if isinstance(inputs["dsoName"]["value"], (list, tuple)):
        inputs1={}
        for i in inputs.keys():
            if(i!="dsoName"):
                inputs1[i]=inputs[i]
        for i in range(0,len(inputs["dsoName"]["value"])):
            print >> sys.stderr,inputs["dsoName"]
            inputs1["dsoName"]={"value": inputs["dsoName"]["value"][i]}
            _loadMapForDs(conf,inputs1,outputs)
    else:
        _loadMapForDs(conf,inputs,outputs)
    outputs["Result"]["value"]=zoo._("Layer added to the Map.")
    return zoo.SERVICE_SUCCEEDED

def _loadMapForDs(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    #print >> sys.stderr, mapfile
    mc=False
    mc1=False
    try:
        m = mapscript.mapObj(mapfile)
        #print >> sys.stderr, "OK opening existing mapfile"
    except:
        mapfile=conf["main"]["dataPath"]+"/dirs/"+inputs["dstName"]["value"]+"/ds_ows.map"
        #print >> sys.stderr, mapfile
        #print >> sys.stderr, "OK"
        try:
            m = mapscript.mapObj(mapfile)
            mc=True
            #print >> sys.stderr, mapfile
            #print >> sys.stderr, "OK"
        except:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
            return 4

    #print >> sys.stderr, mc
    m1=m.clone()
    #print >> sys.stderr, "OK"
    if mc:
        i=m1.numlayers
        j=0
        #print >> sys.stderr, m1
        m1.web.metadata.set("mm_group_0","Layers")
        while i >=0 :
            #print >> sys.stderr,i
            #print >> sys.stderr,m1.getLayer(i)
            if m.getLayer(i) is not None and not(m.getLayer(i).name==inputs["dsoName"]["value"]):
                #print >> sys.stderr,"Remove layer : "+str(i)
                m1.getLayer(i).status=-1
                m1.removeLayer(i)
                #print >> sys.stderr,i
            elif m.getLayer(i) is not None:
                #print >> sys.stderr,i
                #print >> sys.stderr,m1.getLayer(i)
                m1.getLayer(i).metadata.set("mm_group","Layers")
            i-=1
    else:
        mapfile=conf["main"]["dataPath"]+"/dirs/"+inputs["dstName"]["value"]+"/ds_ows.map"
        try:
            m2 = mapscript.mapObj(mapfile)
            mc=True
        except:
            for i in ["PostGIS","MySQL","WFS","WMS"]:
                try:
                    mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["dstName"]["value"].replace("WFS:","").replace("WMS:","")+"ds_ows.map"
                    print >> sys.stderr,mapfile
                    m2 = mapscript.mapObj(mapfile)
                    break
                except:
                    pass
            if m2 is None:
                conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
                return 4
        for i in range(0,m2.numlayers):
            if m2.getLayer(i).name==inputs["dsoName"]["value"]:
                demo=m2.getLayer(i).clone()
                demo.metadata.set("mm_group",inputs["dsgName"]["value"])
		demo.metadata.set("mmDSTN",inputs["dstName"]["value"])
                m1.insertLayer(demo)
    m1.setProjection("EPSG:4326")
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    #print >> sys.stderr, m1
    #print >> sys.stderr, mapfile
    saveProjectMap(m1,mapfile)

    initMintMapfile(conf,m1,inputs["map"]["value"],inputs["dsoName"]["value"])
    
    outputs["Result"]["value"]="Map saved."
    return zoo.SERVICE_SUCCEEDED

def refreshLayersList(conf,inputs,outputs):
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["name"]["value"]+".map"
    #print >> sys.stderr,mapfile
    try:
        ll=getLayersList(conf,mapfile)
        int(ll)
        return zoo.SERVICE_FAILED
    except:
        #print >> sys.stderr,ll
        outputs["Result"]["value"]=ll
        return zoo.SERVICE_SUCCEEDED
    return zoo.SERVICE_SUCCEEDED

def getLayersList(conf,mapfile):
    import mapscript
    try:
        m = mapscript.mapObj(mapfile)
    except:
        conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
        return 4
    res="["
    for i in range(0,m.numlayers):
        j=m.getLayer(i)
        if i>0:
            res+=", "
        res+="{'name': '"+j.name+"'}"
    res+="]"
    return res

def getGroupList(conf,mapfile):
    import mapscript,sys
    print >> sys.stderr,"DEBUG: "+str(mapfile)
    try:
        m = mapscript.mapObj(mapfile)
        #print >> sys.stderr,m
        #conf["main"]["m"]=m
    except:
        if conf is not None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
        return 4
    print >> sys.stderr,"DEBUG"
    res="["
    allGroups=[]
    resGroups={}
    for i in range(0,3):
        #try:
        groups=m.web.metadata.get("mm_group_"+str(i))
        print >> sys.stderr,"mm_group_"+str(i)+" = "+groups
        if groups is None:
            continue
        if i==0:
            #print >> sys.stderr,groups
            resGroups[groups]=[]
            #print >> sys.stderr,resGroups
            allGroups+=[groups]
            #print >> sys.stderr,allGroups
        elif i==1:
            for j in groups.split(","):
                print >> sys.stderr,"JJ "+j
                if j!="":
                    print >> sys.stderr,"groups "+allGroups[i-1]
                    resGroups[allGroups[i-1]]+=[{j: []}]
                    print >> sys.stderr,"res "+str(resGroups)
        else:
            for j in groups.split(";"):
                inheritance=j.split("|")
                elem=None
                #print >> sys.stderr,"Inheritance "+str(inheritance)
                for k in resGroups:
                    if len(inheritance)>1 and k==inheritance[1]:
                        elem=resGroups[k]
                        break
                if elem is None:
                    for k in resGroups:
                        #print >> sys.stderr,k
                        for l in range(0,len(resGroups[k])):
                            #print >> sys.stderr,l
                            for n in resGroups[k][l]:
                                #print >> sys.stderr,n
                                if len(inheritance)>1 and n==inheritance[1]:
                                    elem=resGroups[k][l][n]
                                    break
                #print >> sys.stderr,elem
                if elem is not None:
                    for k in inheritance[0].split(","):
                        if k!="":
                            elem+=[{k: []}]
                #print >> sys.stderr,resGroups
            #print >> sys.stderr,resGroups
        #except:
        #    print >> sys.stderr,"No group for level "+str(i)
        #    break
        #print >> sys.stderr," RES GROUP : "+str(resGroups)
        for i in range(0,m.numlayers):
            j=m.getLayer(i)
            if j is not None:
                g=j.metadata.get("mm_group")
                if g is None:
                    break
                d=getThemArray(resGroups,g)
                #print >> sys.stderr,"BLAH\n"
                #print >> sys.stderr,g
                #print >> sys.stderr,resGroups
                #print >> sys.stderr,j
                #print >> sys.stderr,[]+[{"layer": j.name}]
                addLayerToThem(resGroups,g,{"layer": j.name});
            #d+=[{"layer": j.name}]
                #print >> sys.stderr,resGroups

    return resGroups

def getThemArray(obj,search):
    for k in obj:
        #print >> sys.stderr, " Compare "+k+" "+search
        if k==search:
            return obj[k]
    for k in obj:
        for l in range(0,len(obj[k])):
            for m in obj[k][l]:
                #print >> sys.stderr, " Compare "+m+" "+search
                if m==search:
                    return obj[k][l][m]
    for k in obj:
        for l in range(0,len(obj[k])):
            for m in obj[k][l]:
                for n in range(0,len(obj[k][l][m])):
                    for o in obj[k][l][m][n]:
                        #print >> sys.stderr, " Compare "+o+" "+search
                        if o==search:
                            return obj[k][l][m][n][o]
    return None

def addLayerToThem(obj,search,value):
    #print >> sys.stderr,obj
    for k in obj:
        #print >> sys.stderr, " Compare "+k+" "+search
        if k==search:
            if obj[k].count(value)==0:
                obj[k]+=[value]
            return None
    for k in obj:
        try:
            for l in range(0,len(obj[k])):
                addLayerToThem(obj[k][l],search,value)
        except:
            pass
    return None

def recursMapList(conf,group):
    res=[]
    print >> sys.stderr,str(group)
    for i in group:
        print >> sys.stderr,str(group[i])
        if type(group[i]).__name__=="str":
            import mapscript
            m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
            l=m.getLayerByName(group[i])
            if l is not None:
                if l.name and l.name.count("grid_")>0:
                    return [{"id": group[i],"text": group[i],"mmType": 0}]
            if l is not None:
                return [{"id": group[i],"text": group[i],"mmType": l.type, "nclasses":l.numclasses}]
            else:
                return [{"id": group[i],"text": group[i]}]
        else:
            if len(group[i])>=0:
                res1=[]
                for j in range(0,len(group[i])):
                    #print >> sys.stderr,"recursMap "+str(group[i][j])
                    res1+=recursMapList(conf,group[i][j])
                res+=[{"id": i,"text": i, "children": res1}]
            else:
                if conf is not None:
                    import mapscript
                    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
                    if type(group[i]).__name__=="str":
                        l=m.getLayerByName(group[i])
                        #if l.name.count("grid_")>0:
                        #    return [{"id": group[i],"text": group[i],"mmType": 0}]
                        if l is not None:
				res+=[{"id": group[i],"text": group[i],"mmType": l.type, "nclasses":l.numclasses}]
                        else:
                            res+=[{"id": i,"text": str(group[i])}]
                else:
                    res+=[{"id": i,"text": i}]
    return res

def getSimpleMapList(conf,inputs,outputs):
    import mapscript
    import json
    try:
        m = mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["name"]["value"]+".map")
    except:
        if conf is not None:
            conf["lenv"]["message"]=zoo._("Unable to open the mapfile")
        return 4
    res=[]
    for i in range(0,m.numlayers):
        res+=[m.getLayer(i).name]
    outputs["Result"]["value"]=json.dumps(res)
    return 3

def getMapList(conf,inputs,outputs):
    if inputs.has_key("prefix"):
        d=getGroupList(conf,conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"maps/project_"+inputs["name"]["value"]+".map")            
    else:
        d=getGroupList(conf,conf["main"]["dataPath"]+"/maps/project_"+inputs["name"]["value"]+".map")            
    import sys
    #print >> sys.stderr,conf["main"]
    import json
    #outputs["Result"]["value"]=json.dumps([res])
    print >> sys.stderr,"GROUPS "+str(d)
    outputs["Result"]["value"]=json.dumps(recursMapList(conf,d))
    return 3

def recursGroupList1(group,pref):
    res=[]
    for i in group:
        res+=[{"value": i, "text": pref+i}]
        #print >> sys.stderr,type(group[i]).__name__
        if type(group[i]).__name__=="str":
            return []
        else:
            for j in range(0,len(group[i])):
                #print >> sys.stderr,group[i][j]
                res+=recursGroupList1(group[i][j],i+" / ")
    return res

def getGroupList1(conf,inputs,outputs):
    d=getGroupList(conf,conf["main"]["dataPath"]+"/maps/project_"+inputs["name"]["value"]+".map")
    #print >> sys.stderr, recursGroupList1(d,"")
    outputs["Result"]["value"]=str(d)
    return 3
        
def createLegend(conf,inputs,outputs):
    print >>sys.stderr,"INPUTS "+str(inputs)
    import math
    import mapscript
    mapPath=conf["main"]["dataPath"]+"/maps/"
    if inputs.has_key("prefix"):
	    if inputs["prefix"]["value"]=="indexes":
		    try:
			    open(conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps/project_"+inputs["name"]["value"]+".map")
		    except:
			    if inputs.has_key("orig"):
				m=mapscript.mapObj(conf["main"]["dataPath"]+"/PostGIS/"+inputs["orig"]["value"]+"ds_ows.map")
			    else:
				m=mapscript.mapObj(conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps/project_Index"+conf["senv"]["last_index"]+".map")			    
			    removeAllLayers(m,inputs["layer"]["value"])
			    saveProjectMap(m,conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps/project_"+inputs["name"]["value"]+".map")
			    pass
	    mapPath=conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps/"
    #d=getGroupList(conf,mapPath+"project_"+inputs["name"]["value"]+".map")
    if inputs.has_key("mmStep"):
	try:
		m=mapscript.mapObj(mapPath+"/timeline_"+inputs["name"]["value"]+"_"+inputs["layer"]["value"]+"_step"+inputs["mmStep"]["value"]+".map")
	except:
		m=mapscript.mapObj(mapPath+"/timeline_Index"+conf["senv"]["last_index"]+"_indexes_view_idx"+conf["senv"]["last_index"]+"_step"+inputs["mmStep"]["value"]+".map")
	inputs["isStep"]={"value": "true"}
    else:
	m=mapscript.mapObj(mapPath+"/project_"+inputs["name"]["value"]+".map")
	l=m.getLayerByName(inputs["layer"]["value"])
	if l.metadata.get("mmClass")=="tl":
		m=mapscript.mapObj(mapPath+"/timeline_"+inputs["name"]["value"]+"_"+inputs["layer"]["value"].replace(".","_")+"_step0.map")
		inputs["isStep"]={"value": "true"}
    print >> sys.stderr,mapPath+" \n\n project \n\n\n"
    i=0
    inColor=""
    outColor=""
    oldM=m.clone()
    mmClass=0
    if inputs.keys().count("mmClass")>0:
        mmClass=int(inputs["mmClass"]["value"])
    mmStyle=0
    if inputs.keys().count("mmStyle")>0:
        mmStyle=int(inputs["mmStyle"]["value"])
    i=m.numlayers-1
    layers=[]
    numClasses=1
    while i >= 0:
        if m.getLayer(i).name==inputs["layer"]["value"]:
            if m.getLayer(i).getClass(mmClass) is not None:
                if m.getLayer(i).getClass(mmClass).numstyles<=2:
                    print >> sys.stderr,"Create new style for symbol fill"
                    m.getLayer(i).getClass(mmClass).insertStyle(m.getLayer(i).getClass(mmClass).getStyle(0).clone())
                ic=m.getLayer(i).getClass(mmClass).getStyle(mmStyle).color
                oc=m.getLayer(i).getClass(mmClass).getStyle(mmStyle).outlinecolor
                if m.getLayer(i).getClass(mmClass).numstyles>1:
                    oc=m.getLayer(i).getClass(mmClass).getStyle(1).outlinecolor
                numClasses=m.getLayer(i).numclasses
                inColor='#%02x%02x%02x' % (ic.red,ic.green,ic.blue)
                outColor='#%02x%02x%02x' % (oc.red,oc.green,oc.blue)
        else:
            m.removeLayer(i)
        i-=1


    ct=oldM.getLayer(0).connectiontype

    #if oldM.getLayer(0).connectiontype!=mapscript.MS_WMS:
    i=oldM.numlayers-1
    #else:
    #i=-1

    while i >= 0 :
        if oldM.getLayer(i).name==inputs["layer"]["value"]:
            if oldM.getLayer(i).getClass(mmClass) is not None:
                if oldM.getLayer(i).getClass(mmClass).numstyles<=2:
                    print >> sys.stderr,"Create new style for symbol fill"
                    oldM.getLayer(i).getClass(mmClass).insertStyle(oldM.getLayer(i).getClass(mmClass).getStyle(0).clone())

                ic=oldM.getLayer(i).getClass(mmClass).getStyle(mmStyle).color
                oc=oldM.getLayer(i).getClass(mmClass).getStyle(mmStyle).outlinecolor
                if oldM.getLayer(i).getClass(mmClass).numstyles>1:
                    oc=oldM.getLayer(i).getClass(mmClass).getStyle(1).outlinecolor
                inColor='#%02x%02x%02x' % (ic.red,ic.green,ic.blue)
                outColor='#%02x%02x%02x' % (oc.red,oc.green,oc.blue)
            nbClasses=oldM.getLayer(i).numclasses-1
            j=nbClasses
            oldM.getLayer(i).setProjection("EPSG:4326")
            layers+=[oldM.getLayer(i).clone()]
            while j >= 0:
                if j < nbClasses:
                    layers+=[layers[0].clone()]
                oldM.getLayer(i).setProjection("EPSG:4326")
                if j!=mmClass:
                    oldM.getLayer(i).removeClass(j)
                else:
                    oldM.getLayer(i).getClass(j).setExpression(None)
                j-=1
            k=0
            for j in layers:
                j.name+="_"+str(k+1)
                j.metadata.set("ows_name",j.name)
                #print >> sys.stderr,j.name
                l=j.numclasses-1
                while l >= 0:
                    if l!=k:
                        j.removeClass(l)
                    else:
                        j.getClass(l).setExpression(None)
                    l-=1
                #print >> sys.stderr,"INSERT Layer: "+j.name
                oldM.insertLayer(j)
                k+=1
	i-=1 

    layer=oldM.getLayerByName(inputs["layer"]["value"])
    if layer is None:
	    layer=oldM.getLayer(0)
    layer.connection=None
    layer.data=None
    feature=mapscript.shapeObj(layer.type)
    if layer.type==mapscript.MS_LAYER_POINT:
	    feature=feature.fromWKT("POINT(3 3)")
    elif layer.type==mapscript.MS_LAYER_LINE:
	    feature=feature.fromWKT("LINESTRING(0 0,2 4,4 2,6 6)")
    else:
	    angle1=(2*math.pi)/5
	    angle2=math.pi-((4*math.pi)/5)
	    feature=feature.fromWKT("POLYGON((6 3,"+str(3+(3*math.cos(angle1)))+" "+str(3+(3*math.sin(angle1)))+","+str(3-(3*math.cos(angle2)))+" "+str(3+(3*math.sin(angle2)))+","+str(3-(3*math.cos(angle2)))+" "+str(3-(3*math.sin(angle2)))+","+str(3+(3*math.cos(angle1)))+" "+str(3-(3*math.sin(angle1)))+",6 3))")

    layer.addFeature(feature)

    if numClasses > 1:
        i=numClasses
        while i > 0:
            #print >> sys.stderr,"Produce layer "+layer.name+"_"+str(i)
            l=oldM.getLayerByName(layer.name+"_"+str(i))
            l.connection=None
            l.data=None
            l.addFeature(feature)
            i-=1
    layer.setExtent(-1,-1,-1,-1)
    layer.setProjection("EPSG:4326")
    
    index=oldM.numlayers-1

    while index >= 0:
        l=oldM.getLayer(index)
        #print >> sys.stderr,"LNAME 11 "+l.name+" == "+layer.name
        if l is not None and l.name.count(layer.name)>0:
            l.setExtent(-1,-1,-1,-1)            
            l.minscaledenom=-1
            l.maxscaledenom=-1
            l.labelminscaledenom=-1
            l.labelmaxscaledenom=-1
        else:
            oldM.removeLayer(index)
        index-=1

    
    mapfile0=mapPath+"/map4legend_"+inputs["name"]["value"]+"_"+inputs["layer"]["value"].replace(".","_")+".map"
    mapfile1=mapPath+"/map4symbols_"+inputs["name"]["value"]+".map"
    if inputs.has_key("mmStep"):
	    mapfile0=mapPath+"/map4legend_"+inputs["name"]["value"]+"_"+inputs["layer"]["value"].replace(".","_")+"_step"+inputs["mmStep"]["value"]+".map"
	    mapfile1=mapPath+"/map4symbols_"+inputs["name"]["value"]+"_"+inputs["layer"]["value"].replace(".","_")+"_step"+inputs["mmStep"]["value"]+".map"

    saveProjectMap(oldM,mapfile0)
    img_url=conf["main"]["mapserverAddress"]+"?map="+mapfile0+"&LAYERS="+inputs["layer"]["value"]+"&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=-1.5,-1.5,7.5,7.5&SRS=EPSG:4326&WIDTH=24&HEIGHT=24"
    saveProjectMap(m,mapfile1)
    if inputs["name"]["value"].count("grid_")>0:
        m=mapscript.mapObj(mapfile1)
    i=0
    images=[]

 
    if ct!=mapscript.MS_WMS:
	    while i < m.getNumSymbols():
		    m.symbolset.getSymbol(i)
		    symb=m.symbolset.getSymbol(i)
		    if symb.name is not None and symb.name.count('polygon_')==0:
			    layer=mapscript.layerObj(m)
			    layer.type=mapscript.MS_LAYER_POINT
			    feature=mapscript.shapeObj(mapscript.MS_SHAPE_POINT)
			    layer.addFeature(feature.fromWKT("POINT(0.001 0.001)"))
			    layer.connection=None
			    layer.name="Symbol_"+symb.name
			    layer.data=None
			    layer.tileitem=None
			    layer.units=mapscript.MS_PIXELS
			    layer.sizeunits=mapscript.MS_PIXELS
			    layer.toleranceunits=mapscript.MS_PIXELS
			    tmpClass=mapscript.classObj(layer)
			    tmpClass.name="Symbol_"+symb.name+"0"
			    tmpStyle=mapscript.styleObj(tmpClass)
			    tmpStyle.updateFromString('STYLE COLOR 0 0 0 OUTLINECOLOR 225 225 225 SYMBOL "'+symb.name+'" SIZE 20 END')
			    layer.status=True
			    img_name="Symbol_"+symb.name+".png"
			    m.setSize(24,24)
			    m.setExtent(0,0,0.002,0.002)
			    tmpImage=m.draw()#
			    images+=[{"id": layer.name,"value": conf["main"]["mapserverAddress"]+"?map="+mapfile1+"&LAYERS="+layer.name+"&SRS=EPSG%3A4326&amp;FORMAT=image%2Fpng&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&EXCEPTIONS=application%2Fvnd.ogc.se_inimage&BBOX=0,0,0.002,0.002&WIDTH=24&HEIGHT=24&format=png"}]
			    tmpImage=tmpClass.createLegendIcon(m,layer,24,24)
            #print >> sys.stderr,tmpImage
            #print >> sys.stderr,conf["main"]["dataPath"]+"/maps/"+img_name
            #print >> sys.stderr,"Try to save"
			    tmpImage.write(mapPath+"/"+img_name)
		    i+=1

    try:
        inColor1=oldM.getLayerByName(inputs["layer"]["value"]).metadata.get("mmColor").split(" ")
        #print >> sys.stderr,"InColor: "+str(inColor1)
        outColor1=oldM.getLayerByName(inputs["layer"]["value"]).metadata.get("mmOutColor").split(" ")
        #print >> sys.stderr,outColor1
        inColor1='#%02x%02x%02x' % (int(inColor1[0]),int(inColor1[1]),int(inColor1[2]))
        outColor1='#%02x%02x%02x' % (int(outColor1[0]),int(outColor1[1]),int(outColor1[2]))
    except:
        inColor1=None
        outColor1=None

    nameSpace = {'conf': conf,'inputs': inputs, 'outputs': outputs, 'images': images, 'colors': [inColor,outColor,img_url,inColor1,outColor1],"m": m}

    if inputs.has_key("prefix"):
	    if inputs.has_key("mmClass"):
		    t = Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/UniqSymb.tmpl",searchList=nameSpace)
	    else:
		    t = Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/ClassLegend.tmpl",searchList=nameSpace)
    else:
	    if inputs.keys().count("mmClass")==0:
		    t = Template(file=conf["main"]["templatesPath"]+"/Manager/Styler.tmpl",searchList=nameSpace)
	    else:
		    t = Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/UniqSymb.tmpl",searchList=nameSpace)
    outputs["Result"]["value"]=t.__str__()
    saveProjectMap(m,mapfile1)
    conf["lenv"]["message"]=zoo._("An error occured (")+str(images)+")"
    #outputs["Result"]["value"]=str(images)
    return 3

def listMap(conf,inputs,outputs):
    import os,glob,time
    import locale
    res=[]
    prefix="";
    if inputs.keys().count("prefix")>0:
        prefix=inputs["prefix"]["value"]
    files = filter(os.path.isfile, glob.glob(conf["main"]["dataPath"]+"/"+prefix+"maps/" + "project_*.map"))
    if inputs.keys().count('orderList'):
        files.sort(key=lambda x: -os.path.getmtime(x))
    else:
        files.sort()
    import json
    for i in files:
        print >> sys.stderr,"Project map "+str(i)
        i=i.replace(conf["main"]["dataPath"]+"/"+prefix+"maps/","").replace(conf["main"]["dataPath"]+"/"+prefix+"maps\\","")
        print >> sys.stderr,str(i)+' '+conf["main"]["dataPath"]+"/"+prefix+"maps/"+i
        if i!="project_Untitled_0.map":
            try:
		    oloc=locale.getlocale(locale.LC_ALL)
		    locale.setlocale(locale.LC_ALL,'')
	    except:
		    pass
	    try:
	    	mTime=time.strftime(conf["mm"]["dateFormat"].encode(locale.getlocale()[1]),time.localtime(os.path.getmtime(conf["main"]["dataPath"]+"/"+prefix+"maps/"+i))).decode(locale.getlocale()[1])
	    except Exception,e:
		mTime=time.strftime(conf["mm"]["dateFormat"].encode("utf-8"),time.localtime(os.path.getmtime(conf["main"]["dataPath"]+"/"+prefix+"maps/"+i))).decode("utf-8")
            res+=[{"id": i.replace("project_","").replace(".map",""),"value": i, "mTime": mTime.encode('utf-8')}]
	    try:
		    locale.setlocale(locale.LC_ALL,oloc)
	    except:
		    pass
        print >> sys.stderr,str(i)+' '+str(i)
    outputs["Result"]["value"]=json.dumps(res,ensure_ascii=False)
    return 3

def saveMap(conf,inputs,outputs):
    import mapscript
    import sqlite3
    import time
    try:
        m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["mapOrig"]["value"]+".map")
        m.web.metadata.set("mmProjectName",inputs["map"]["value"])
	if m.web.metadata.get("mmTitle")=="" or m.web.metadata.get("mmTitle") is None :
		m.web.metadata.set("mmTitle",inputs["map"]["value"])
        saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
	import authenticate.service as auth
        con = auth.getCon(conf)
        prefix = auth.getPrefix(conf)
	conn = con.conn.cursor()
        conn.execute("update "+prefix+"users set last_map='"+inputs["map"]["value"]+"' where login='"+conf["senv"]["login"]+"'")
        conf["senv"]["last_map"]=inputs["map"]["value"]
        con.conn.commit()
        con.conn.close()
	import mmsession
	mmsession.save(conf)
        #conf["lenv"]["cookie"]="MMID=MM"+str(time.time()).split(".")[0]+"; path=/"
        for i in range(m.numlayers):
            if m.getLayer(i) and m.getLayer(i).type!=mapscript.MS_LAYER_RASTER:
                lname=m.getLayer(i).name
                layer=m.getLayer(i)
                if lname.count("grid_")==0:
                    outputs1={"Result": {"value": ""}}
                    inputs["name"]={"value":inputs["map"]["value"]}
                    inputs["layer"]={"value":lname}
                    createLegend(conf,inputs,outputs1)
                    try:
                        f = open(conf["main"]["publicationPath"]+'/styles/'+layer.name+'_'+conf["senv"]["last_map"]+"_sld.xml", 'w')
                        f.write(layer.generateSLD())
                        f.close()

                    except:
                        print >> sys.stderr,"Unable to create the file: "+conf["main"]["publicationPath"]+'/styles/'+layer.name+'_'+conf["senv"]["last_map"]+"_sld.xml"
                    
                    for j in range(1,m.getLayer(i).numclasses):
                        m.getLayer(i).removeClass(m.getLayer(i).numclasses-1)
                    m.getLayer(i).getClass(0).setExpression(None)
                    initMintMapfile(conf,m,inputs["map"]["value"],lname)

        outputs["Result"]["value"]=zoo._("Map saved")
        return 3
    except Exception,e:
        conf["lenv"]["message"]=zoo._("An error occured when trying to save the map: ")+str(e)
        return 4

def setRGB(myColor,fillColor):
    myColor.red=fillColor[0]
    myColor.green=fillColor[1]
    myColor.blue=fillColor[2]

def addGroup(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    try:
        pref=m.web.metadata.get("mm_group_"+inputs["id"]["value"])
        if int(inputs["id"]["value"]) > 1:
            m.web.metadata.set("mm_group_"+inputs["id"]["value"],pref+inputs["name"]["value"]+"|"+inputs["inherit"]["value"])
        else:
            tmp=pref.split(",")
            res=""
            ind=0
            for i in range(0,len(tmp)):
                if ind >0:
                    res+=","
                if tmp[i]!="":
                    ind+=1
                    res+=tmp[i]
            res+=""
            m.web.metadata.set("mm_group_"+inputs["id"]["value"],pref+inputs["name"]["value"])
    except:
        m.web.metadata.set("mm_group_"+inputs["id"]["value"],inputs["name"]["value"])
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    return 4

def saveLayerStyle(conf,inputs,outputs):
    import mapscript
    mapPath=conf["main"]["dataPath"]+"/maps"
    if inputs.has_key("prefix"):
	    mapPath=conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps"
    if inputs.has_key("mmStep"):
	    m=mapscript.mapObj(mapPath+"/timeline_"+inputs["map"]["value"]+"_"+inputs["layer"]["value"].replace(".","_")+"_step"+inputs["mmStep"]["value"]+".map")
    else:
	    m=mapscript.mapObj(mapPath+"/project_"+inputs["map"]["value"]+".map")
    layer=m.getLayerByName(inputs["layer"]["value"])

    try:
        noColor=False
        fillColor=None
        strokeColor=None
        if inputs.has_key("mmFill") and inputs["mmFill"]["value"]!="":
            fillColor=[int(n, 16) for n in (inputs["mmFill"]["value"][:2],inputs["mmFill"]["value"][2:4],inputs["mmFill"]["value"][4:6])]
        if inputs.has_key("mmStroke") and inputs["mmStroke"]["value"]!="":
            strokeColor=[int(n, 16) for n in (inputs["mmStroke"]["value"][:2],inputs["mmStroke"]["value"][2:4],inputs["mmStroke"]["value"][4:6])]
        if fillColor is None and strokeColor is None:
            noColor=True
        #layer.setMetaData("mmStrokeColor",inputs["mmStroke"]["value"])
        #layer.setMetaData("mmFillColor",inputs["mmFill"]["value"])
    except:
        noColor=True

    if inputs.keys().count("mmClass"):
        nClass=int(inputs["mmClass"]["value"])
    else:
        nClass=0


    print >> sys.stderr,"Edit the "+str(nClass)+" classe "
    mmStyle=0
    if inputs.keys().count("mmStyle")>0:
        mmStyle=int(inputs["mmStyle"]["value"])
        if layer.getClass(nClass).numstyles<=2:
            print >> sys.stderr,"Create new style for symbol fill"
            layer.getClass(nClass).insertStyle(layer.getClass(nClass).getStyle(0).clone())
            layer.getClass(nClass).getStyle(2).angle=0

    if inputs.has_key("mmClassName") and layer.getClass(nClass) is not None:
	    layer.getClass(nClass).name=inputs["mmClassName"]["value"]
    if inputs.has_key("mmExpr"):
	    layer.getClass(nClass).setExpression(inputs["mmExpr"]["value"])
	    print >> sys.stderr,layer.getClass(nClass).getExpressionString()


    print >> sys.stderr,"Edit the "+str(nClass)+" classe "+str(not(noColor))
    if not(noColor):
        layer.getClass(nClass).getStyle(mmStyle).opacity=int(inputs["mmOpacity"]["value"])
        if inputs.keys().count('noFill') > 0:
            layer.getClass(nClass).getStyle(mmStyle).color.setRGB(-1,-1,-1)
        else:
            setRGB(layer.getClass(nClass).getStyle(mmStyle).color,fillColor)
            print >> sys.stderr,"Fill  "+str(fillColor)

        if inputs.keys().count('noStroke') > 0:
            layer.getClass(nClass).getStyle(mmStyle).outlinecolor.setRGB(-1,-1,-1)
        else:
            setRGB(layer.getClass(nClass).getStyle(mmStyle).outlinecolor,strokeColor)
            print >> sys.stderr,"Stroke "+str(strokeColor)
    if inputs.keys().count("mmStrokeWidth") > 0:
        layer.getClass(nClass).getStyle(mmStyle).outlinewidth=float(inputs["mmStrokeWidth"]["value"])

    if inputs.keys().count("force")>0:
        layer.metadata.set("mmClass","us")
        j=layer.numclasses-1
        while j >= 0:
            if j!=0:
                layer.removeClass(j)
            else:
                if inputs.keys().count("mmExpr")==0:
			layer.getClass(j).setExpression(None)
		if inputs.keys().count('noFill'):
                        layer.getClass(j).getStyle(mmStyle).color.setRGB(-1,-1,-1)
		else:
                        setRGB(layer.getClass(j).getStyle(mmStyle).color,fillColor)
		if inputs.keys().count('noStroke'):
                        layer.getClass(j).getStyle(mmStyle).outlinecolor.setRGB(-1,-1,-1)
		else:
                        setRGB(layer.getClass(j).getStyle(mmStyle).outlinecolor,strokeColor)
            j-=1
    if inputs.keys().count("mmSize"):
        layer.getClass(nClass).getStyle(mmStyle).size=float(inputs["mmSize"]["value"])
    if inputs.keys().count("mmAngle"):
	try:
		layer.getClass(nClass).getStyle(mmStyle).angle=float(inputs["mmAngle"]["value"])
	except:
		layer.getClass(nClass).getStyle(mmStyle).angle=inputs["mmAngle"]["value"]
    if inputs.keys().count("mmSymb") > 0 and inputs["mmSymb"]["value"]!="":
        layer.getClass(nClass).getStyle(mmStyle).symbolname=inputs["mmSymb"]["value"].replace("Symbol_","")
        if inputs["mmSymb"]["value"]=="polygon_hatch":
            print >> sys.stderr,"layer.getClass(nClass).numstyles 1 - "+str(layer.getClass(nClass).numstyles)
            if layer.getClass(nClass).numstyles==1:
                layer.getClass(nClass).insertStyle(layer.getClass(nClass).getStyle(0).clone())
                print >> sys.stderr,"layer.getClass(nClass).numstyles 2 - "+str(layer.getClass(nClass).numstyles)

            layer.getClass(nClass).getStyle(1).color.setRGB(-1,-1,-1)
            layer.getClass(nClass).getStyle(1).symbol=0
            layer.getClass(nClass).getStyle(1).angle=0
            layer.getClass(nClass).getStyle(1).symbolname=None
            layer.getClass(nClass).getStyle(1).size=-1
            layer.getClass(nClass).getStyle(1).patternlength=0
            print >> sys.stderr,"layer.getClass(nClass).numstyles 3 - "+str(layer.getClass(nClass).numstyles)
            style=layer.getClass(nClass).getStyle(1)
            setRGB(style.outlinecolor,strokeColor)
    else:
        if inputs.keys().count("mmSymb") > 0:
            layer.getClass(nClass).getStyle(mmStyle).symbol=0
            layer.getClass(nClass).getStyle(mmStyle).symbolname=None

    if layer.type != mapscript.MS_LAYER_RASTER:
        if inputs.keys().count("mmStyle")==0:
            if inputs.keys().count("pattern") > 0:
                print >> sys.stderr,"PATTERN (" +inputs["pattern"]["value"]+")"
                layer.getClass(nClass).getStyle(0).patternlength=0
                layer.getClass(nClass).getStyle(0).linecap=mapscript.MS_CJC_BUTT
                layer.setMetaData("mmPattern_"+str(nClass),inputs["pattern"]["value"])
                layer.getClass(nClass).getStyle(0).updateFromString("STYLE PATTERN "+inputs["pattern"]["value"]+" END END")
                if layer.type==mapscript.MS_LAYER_POLYGON:
                    print >> sys.stderr,"NUMSTYLES "+str(layer.getClass(nClass).numstyles)
                    if layer.getClass(nClass).numstyles==1:
                        layer.getClass(nClass).insertStyle(layer.getClass(nClass).getStyle(0).clone())
                    myStyle=layer.getClass(nClass).getStyle(1)
                    layer.getClass(nClass).getStyle(0).outlinecolor.setRGB(-1,-1,-1)
                    layer.getClass(nClass).getStyle(0).patternlength=0
                    layer.getClass(nClass).getStyle(1).color.setRGB(-1,-1,-1)
                    layer.getClass(nClass).getStyle(1).symbol=0
                    layer.getClass(nClass).getStyle(1).angle=0
                    layer.getClass(nClass).getStyle(1).symbolname=None
                    layer.getClass(nClass).getStyle(1).size=-1
                    layer.getClass(nClass).getStyle(1).patternlength=0
                    layer.getClass(nClass).getStyle(1).updateFromString("STYLE PATTERN "+inputs["pattern"]["value"]+" END END")
            else:
                layer.getClass(nClass).getStyle(mmStyle).patternlength=0
                layer.getClass(nClass).getStyle(mmStyle).linecap=mapscript.MS_CJC_ROUND
                if layer.type==mapscript.MS_LAYER_POLYGON and layer.getClass(nClass).numstyles>1:
                    if noColor:
                        layer.getClass(nClass).removeStyle(1)
                    else:
                        layer.getClass(nClass).getStyle(1).patternlength=0
                        layer.getClass(nClass).getStyle(1).linecap=mapscript.MS_CJC_ROUND
    else:
        if inputs.has_key("resm"):
            updateProcessing(layer,inputs["resm"])
        if layer.numclasses==0:
            layer.opacity=int(inputs["mmOpacity"]["value"])
	if inputs.keys().count("mmOffsite")>0:
            layer.offsite.setHex("#"+inputs["mmOffsite"]["value"])
	else:
            layer.offsite.setRGB(-1,-1,-1)

    if inputs.has_key("mmOpacity"):
	layer.opacity=int(inputs["mmOpacity"]["value"])
    if inputs.keys().count("mmGap") > 0 :
        layer.getClass(nClass).getStyle(mmStyle).gap=float(inputs["mmGap"]["value"])
    if inputs.keys().count("mmWidth") > 0 :
        layer.getClass(nClass).getStyle(mmStyle).width=float(inputs["mmWidth"]["value"])
        if layer.getClass(nClass).numstyles>1:
            layer.getClass(nClass).getStyle(1).width=float(inputs["mmWidth"]["value"])
            if inputs.keys().count("mmHatchWidth")>0:
                layer.getClass(nClass).getStyle(0).width=float(inputs["mmHatchWidth"]["value"])

    if inputs.keys().count('noStroke') and layer.getClass(nClass).numstyles > 1:
        layer.getClass(nClass).removeStyle(1)

    if inputs.keys().count("noSymbolFill")>0:
        if layer.getClass(nClass).numstyles>2:
            layer.getClass(nClass).removeStyle(2)

    m.web.metadata.set("wms_feature_info_mime_type","text/html")
    if layer.name.count("grid_")>0:
        layer.connectiontype=-1

    if inputs.has_key("mmStep"):
	    saveProjectMap(m,mapPath+"/timeline_"+inputs["map"]["value"]+"_"+inputs["layer"]["value"].replace(".","_")+"_step"+inputs["mmStep"]["value"]+".map")
    else:
	    saveProjectMap(m,mapPath+"/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]="Layer Style saved."
    outputs1={"Result": {"value": ""}}
    inputs["name"]={"value":inputs["map"]["value"]}
    createLegend(conf,inputs,outputs1)
    if layer.type==mapscript.MS_LAYER_RASTER  and layer.numclasses>1:
	    if layer.metadata.get("mmTiled") is not None:
		    createColorRamp(conf,m,layer,int(layer.metadata.get("mmTiled")));
	    else:
		    createColorRamp(conf,m,layer);
    try:
	    if inputs.has_key("mmStep"):
		    f = open(conf["main"]["publicationPath"]+'/styles/'+layer.name+'_'+conf["senv"]["last_map"]+"_step"+inputs["mmStep"]["value"]+"_sld.xml", 'w')
	    else:
		    f = open(conf["main"]["publicationPath"]+'/styles/'+layer.name+'_'+conf["senv"]["last_map"]+"_sld.xml", 'w')
	    f.write(layer.generateSLD())
	    f.close()
    except:
	    pass
    return 3

def updateProcessing(layer,resm):
    processings=[]
    for i in range(layer.numprocessing):
        processings+=[layer.getProcessing(i)]
    layer.clearProcessing()
    for i in range(layer.numprocessing):
        if processings[i].count("RESAMPLE=")==0:
            layer.setProcessing(processings[i])
    layer.setProcessing("RESAMPLE="+resm["value"])

def createColorRamp(conf,m,layer,useTile=0):
    import mapscript,sys
    print >> sys.stderr,layer.numclasses
    color_file=open(conf["main"]["tmpPath"]+"/color_"+conf["senv"]["last_map"]+"_"+layer.name+".clr","w+")    
    for i in range(0,layer.numclasses):
	    exp=layer.getClass(i).getExpressionString()
	    print >> sys.stderr,exp
	    tmp=exp.split(" AND ")
	    if len(tmp)==2:
		    min=tmp[0].split('>')
		    tmp0=float(min[1].replace(" ","").replace("=","").replace(")",""))
		    max=tmp[1].split('<')
		    tmp1=float(max[1].replace(" ","").replace("=","").replace(")",""))
	    else:
		    min=tmp[0].split('=')
		    tmp0=float(min[1].replace(" ","").replace("=","").replace(")",""))
		    tmp1=tmp0
	    tmpColor=layer.getClass(i).getStyle(0).color
	    color_file.write(str(tmp0+((tmp1-tmp0)/2))+' '+str(tmpColor.red)+' '+str(tmpColor.green)+' '+str(tmpColor.blue)+' '+'\n')
	    print >> sys.stderr,str(tmp0+((tmp1-tmp0)/2))+' '+str(tmpColor.red)+' '+str(tmpColor.green)+' '+str(tmpColor.blue)+' '+'\n'
    if layer.metadata.get("mm_interval")!="" and layer.metadata.get("Band1_interval")!=layer.metadata.get("mm_interval"):
	    mi=layer.metadata.get("mm_interval").split(" ")
	    bi=layer.metadata.get("Band1_interval").split(" ")
	    if float(mi[0])>float(bi[0]):
		    color_file.write(bi[0]+" 0 0 0 0\n")
	    if float(mi[1])<float(bi[1]):
		    color_file.write(bi[1]+" 0 0 0 0\n")
    color_file.close()
    import urllib2
    tmp0=layer.data.split("/")
    print >>sys.stderr,conf["main"]["serverAddress"]+"?service=WPS&version=1.0.0&request=Execute&Identifier=raster-tools.Gdal_Dem&DataInputs=InputDSN="+layer.data+";OutputDSN="+conf["main"]["dataPath"]+"/"+tmp0[len(tmp0)-1].replace(".","_"+conf["senv"]["last_map"]+"_colored.")+";utility=color-relief;cfn="+conf["main"]["tmpPath"]+"/color_"+conf["senv"]["last_map"]+"_"+layer.name+".clr;a=true&RawDataOutput=Result"
    response = urllib2.urlopen(conf["main"]["serverAddress"]+"?service=WPS&version=1.0.0&request=Execute&Identifier=raster-tools.Gdal_Dem&DataInputs=InputDSN="+layer.data+";OutputDSN="+conf["main"]["dataPath"]+"/"+tmp0[len(tmp0)-1].replace(".","_"+conf["senv"]["last_map"]+"_colored.")+";utility=color-relief;cfn="+conf["main"]["tmpPath"]+"/color_"+conf["senv"]["last_map"]+"_"+layer.name+".clr;a=true&RawDataOutput=Result")
    value = response.read()
    print >> sys.stderr,useTile
    if useTile>0:
	    import osgeo.gdal
	    d=osgeo.gdal.Open(layer.data)
	    xsize = d.RasterXSize
	    ysize = d.RasterYSize
	    twidth=xsize/useTile
	    theight=ysize/useTile
	    import glob,os
	    try:
		    os.mkdir(conf["main"]["tmpPath"]+"/"+conf["senv"]["last_map"]+"_"+layer.name)
	    except:
		    pass
	    j=0
	    tmp0=value.replace(conf["main"]["dataPath"],"")
	    tmp0=tmp0.split(".")[0]
	    for j in range(0,useTile):
		    for i in range(0,useTile):
			    srcwin=str(i*twidth)+","+str(j*theight)+","+str(twidth)+","+str(theight)
			    response = urllib2.urlopen(conf["main"]["serverAddress"]+"?service=WPS&version=1.0.0&request=Execute&Identifier=raster-tools.Gdal_Translate&DataInputs=InputDSN="+value.replace(conf["main"]["dataPath"],"")+";OutputDSN="+conf["senv"]["last_map"]+"_"+layer.name+"/"+tmp0+"_tile"+str(j)+"_"+str(i)+";SrcWin="+srcwin+"&RawDataOutput=Result")
			    print >> sys.stderr,response.read()
	    import shutil
	    try:
		    shutil.rmtree(conf["main"]["dataPath"]+"/"+conf["senv"]["last_map"]+"_"+layer.name)
	    except Exception,e:
		    print >> sys.stderr,e
		    pass
	    shutil.move(conf["main"]["tmpPath"]+"/"+conf["senv"]["last_map"]+"_"+layer.name,conf["main"]["dataPath"]+"/"+conf["senv"]["last_map"]+"_"+layer.name)
	    test = conf["main"]["dataPath"]+'/tile_'+conf["senv"]["last_map"]+'_'+layer.name+'*'
	    r = glob.glob(test)
	    for i in r:
		    try:
			    os.remove(i)
		    except:
			    pass
	    response = urllib2.urlopen(conf["main"]["serverAddress"]+"?service=WPS&version=1.0.0&request=Execute&Identifier=raster-tools.tindex&DataInputs=idir=..;iname=tile_"+conf["senv"]["last_map"]+"_"+layer.name+";dir=../"+conf["senv"]["last_map"]+"_"+layer.name+";ext=tif&RawDataOutput=Result")
	    value=conf["main"]["dataPath"]+"/tile_"+conf["senv"]["last_map"]+"_"+layer.name+".shp"
	    print >> sys.stderr,response.read()
	    
    print >> sys.stderr,value
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/color_ramp_"+conf["senv"]["last_map"]+"_"+layer.name+".map")
    m2=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/color_ramp_"+conf["senv"]["last_map"]+"_"+layer.name+".map")
    removeAllLayers(m2,layer.name)
    l=m2.getLayerByName(layer.name)
    a=l.numclasses
    while a > 0:
	    l.removeClass(0)
	    a-=1
    l.updateFromString("LAYER OPACITY "+str(layer.getClass(0).getStyle(0).opacity)+" END")
    if useTile>0:
	    l.data=None
	    l.tileindex=value
    else:
	    l.data=value
    m2.save(conf["main"]["dataPath"]+"/maps/color_ramp_"+conf["senv"]["last_map"]+"_"+layer.name+".map")
    

def classifyMap(conf,inputs,outputs):
    import mapscript
    import sqlite3
    import time
    import json
    import sys
    import classifier.service as cs
    #try:
    mapPath=conf["main"]["dataPath"]+"/maps"
    if inputs.has_key('prefix'):
	    mapPath=conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps"
    mapfile=mapPath+"/project_"+inputs["map"]["value"]+".map"
    
    
    isStep=False
    if inputs .has_key("mmStep"):
	    m=mapscript.mapObj(mapfile)
	    l=m.getLayerByName(inputs["layer"]["value"])
	    l.metadata.set("mmClass","tl")
	    saveProjectMap(m,mapfile)
	    mapfile=mapPath+"/timeline_"+inputs["map"]["value"]+"_"+l.name.replace(".","_")+"_step"+inputs["mmStep"]["value"]+".map"
	    isStep=True
    m=mapscript.mapObj(mapfile)
    m1=m.clone()
    #sys.path+=["../"]
    #print >> sys.stderr,sys.path
    import vector_tools.vectSql as vt
    layer=m.getLayerByName(inputs["layer"]["value"])
    #print >> sys.stderr,layer


    if layer.encoding is None:
        layer.encoding="utf-8"

    layer.metadata.set("mmField",inputs["field"]["value"])
    layerName=inputs["layer"]["value"]
    if inputs.has_key("formula") and inputs["layer"]["value"].count("indexes.") and not(inputs.has_key("noDataUpdate") and inputs["noDataUpdate"]["value"]):
	layer.metadata.set("mmFormula",inputs["formula"]["value"])
	import authenticate.service as auth
	con=auth.getCon(conf)
	cur=con.conn.cursor()
	cid=inputs["layer"]["value"].replace("indexes.view_idx","")
	ocid=cid
	if inputs.has_key("mmStep"):
		cid+="_"+inputs["mmStep"]["value"]
	try:
		cur.execute("DROP VIEW indexes.view_idx_"+cid)
	except Exception,e:
		print >> sys.stderr,e
		con.conn.commit()
	try:
		con.conn.commit()
		cur.execute("CREATE VIEW indexes.view_idx_"+cid+" AS (SELECT ogc_fid,wkb_geometry,"+(inputs["formula"]["value"].replace("[_X_]",inputs["field"]["value"]))+" as "+inputs["field"]["value"]+" from indexes.view_idx"+ocid+")")
		layer.data="indexes.view_idx_"+cid
		layerName=layer.data
	except Exception,e:
		print >> sys.stderr,e
		con.conn.commit()
	con.conn.commit()

    cond=""
    if inputs.keys().count("mmMExpr")>0 and inputs["mmMExpr"]["value"]!="":
	    cond=" WHERE "+inputs["mmMExpr"]["value"].replace("\"[","").replace("]\"","")
	    cond=cond.replace("[","").replace("]","")
    lInputs={"encoding": {"value": layer.encoding},"dsoName": {"value": layer.name}, "dstName": {"value": layer.connection},"q": {"value": "SELECT DISTINCT "+inputs["field"]["value"]+" FROM "+layerName+" "+cond+" ORDER BY "+inputs["field"]["value"]+" ASC"}}

    rClass=False
    if layer.metadata.get("mmMethod"):
	    layer.metadata.remove("mmMethod")
    if inputs.has_key("type"):
	if inputs.has_key("method") and conf["main"].has_key("Rpy2") and conf["main"]["Rpy2"]=="true":
		lInputs1={"encoding": {"value": layer.encoding},"dsoName": {"value": layer.name}, "dstName": {"value": layer.connection},"q": {"value": "SELECT "+inputs["field"]["value"]+" as val FROM "+layerName}}
		vt.vectInfo(conf,lInputs,outputs)
		ll=json.loads(outputs["Result"]["value"])
		vals=[]
		for i in range(0,len(ll)):
			for j in ll[i]:
				vals+=[ll[i][j]]
		try:
			classif=json.loads(cs._discretise(vals,inputs["nbClasses"]["value"],inputs["method"]["value"]))
		except Exception,e:
			conf["lenv"]["message"]=str(e)
			return zoo.SERVICE_FAILED
		layer.metadata.set("mmMethod",inputs["method"]["value"])
		rClass=True
		print >> sys.stderr,"OKOK\n\n"
		print >> sys.stderr,classif
        if inputs["type"]["value"]=="gs":
            lInputs={"encoding": {"value": layer.encoding},"dsoName": {"value": layer.name}, "dstName": {"value": layer.connection},"q": {"value": "SELECT MIN("+inputs["field"]["value"]+") as min, MAX("+inputs["field"]["value"]+") as max FROM "+layerName}}

    #print >> sys.stderr,lInputs
    output1={"Result": {"value":""}}
    isRaster=-1
    try:
	if not(rClass):
		print >> sys.stderr,"OK"
                print >> sys.stderr,lInputs
		vt.vectInfo(conf,lInputs,outputs)
		print >> sys.stderr,"OK"
		#print >> sys.stderr,outputs["Result"]["value"]
	tmp=eval(outputs["Result"]["value"])
    except Exception,e:
        try:
	    k=inputs.keys()
	    print >> sys.stderr,e.message
	    print >> sys.stderr,"/ERROR"
	    
	    if inputs["mmType"]["value"]!="uniqVal":
		    if k.count("min")==0 :
			    import osgeo.gdal
			    d=osgeo.gdal.Open(layer.data)
			    b=d.GetRasterBand(int(inputs["field"]["value"]))
			    layer.clearProcessing()
			    layer.setProcessing("BAND="+inputs["field"]["value"])
			    tmp=[{"min": b.GetMinimum(),"max": b.GetMaximum()}]
		    else:
			    tmp=[{"min": inputs["min"]["value"],"max": inputs["max"]["value"]}]
			    layer.metadata.set("mm_interval",inputs["min"]["value"]+" "+inputs["max"]["value"])
	    else:
		    import osgeo.gdal
		    import sys
		    import math
		    d=osgeo.gdal.Open(layer.data)
		    xsize = d.RasterXSize
		    ysize = d.RasterYSize
		    print >> sys.stderr,inputs["field"]["value"]
		    b=d.GetRasterBand(int(inputs["field"]["value"]))
		    raster = b.ReadAsArray( )
		    print >> sys.stderr,raster
		    count = {}
		    tmp=[]
		    for col in range( xsize ):
			    for row in range( ysize ):
				    cell_value = raster[row, col]
				    if math.isnan(cell_value):
					    cell_value = 'Null'
					    
				    # add cell_value to dictionary
				    try:
					    count[cell_value] += 1
				    except:
					    count[cell_value] = 1
					    tmp+=[{"pixel": cell_value}]
		    sorted(tmp, key=lambda x: x["pixel"])
		    layer.clearProcessing()
		    layer.setProcessing("BAND="+inputs["field"]["value"])
		    #tmp=[{"min": b.GetMinimum(),"max": b.GetMaximum()}]
		    #print >> sys.stderr,tmp
		    
            inputs["field"]["value"]="pixel"
            isRaster=1
        except Exception, e:
            conf["lenv"]["message"]=zoo._("Unable to classify using this raster band.")+str(e)
            return zoo.SERVICE_FAILED

    if inputs.has_key("resm"):
        updateProcessing(layer,inputs["resm"])

    i=layer.numclasses-1
    while i >= 0:
        layer.removeClass(i)
        i-=1

    i=0
    if inputs.keys().count("mmType")>0:
        if inputs["mmType"]["value"]=="uniqVal":
            layer.metadata.set("mmClass","uv")
        elif inputs["mmType"]["value"]=="gradSymb":
            layer.metadata.set("mmClass","gs")
        else:
            layer.metadata.set("mmClass","cc")
    else:
        layer.metadata.set("mmClass","uv")

    
    lOutputs={"Result": {"value": ""}}
    #print >> sys.stderr,inputs
    sr=eval('0x'+inputs["from"]["value"][:2])
    sg=eval('0x'+inputs["from"]["value"][2:4])
    sb=eval('0x'+inputs["from"]["value"][4:6])
    er=eval('0x'+inputs["to"]["value"][:2])
    eg=eval('0x'+inputs["to"]["value"][2:4])
    eb=eval('0x'+inputs["to"]["value"][4:6])
    layer.metadata.set("mmColor",str(sr)+" "+str(sg)+" "+str(sb)+" ")
    layer.metadata.set("mmOutColor",str(er)+" "+str(eg)+" "+str(eb)+" ")
    try:
	    nbClasses=len(tmp)
    except:
	    pass
    colspan=0
    if inputs.keys().count("nbClasses")>0:
        nbClasses=int(inputs["nbClasses"]["value"])
        #print >> sys.stderr,"Colspan: "+str(tmp[0])
	try:
		colspan=(float(tmp[0]["max"])-float(tmp[0]["min"]))/float(nbClasses)
	except:
		pass
    if rClass:
	    nbClasses=len(classif)


    cs.write_png_in_mem(lOutputs, 1, nbClasses, cs.gradient([
                (1.0, (sr, sg, sb), (er, eg, eb)),
                ]))
	#cs._discretise()
    #print >> sys.stderr, lOutputs
    #print >> sys.stderr, lOutputs["Result1"]["value"]

    tmpColor=lOutputs["Result1"]["value"]
    l=m.getLayerByName(layer.name)


    #if l.type==mapscript.MS_LAYER_RASTER and nbClasses>1:
    #	    color_file=open(conf["main"]["tmpPath"]+"/color_"+conf["senv"]["last_map"]+"_"+layer.name+".clr","w+")

    while i < nbClasses:
	try:
		tmpClass=mapscript.classObj(layer)
		tmpClass.name="Class_"+str(i)
		
		style=mapscript.styleObj(tmpClass)

		style.color.red=tmpColor[i][0]
		style.color.green=tmpColor[i][1]
		style.color.blue=tmpColor[i][2]
		
		style.outlinecolor.red=tmpColor[i][0]
		style.outlinecolor.green=tmpColor[i][1]
		style.outlinecolor.blue=tmpColor[i][2]

		style.opacity=int(inputs["mmOpacity"]["value"])

		if layer.type==mapscript.MS_LAYER_POINT:
			style.size=15
			style.symbolname="circle"
        
			#print >> sys.stderr,"Keys: "+str(inputs.keys().count("nbClasses"))
        
		layer.metadata.set("mmName",inputs["field"]["value"])
		try:
			minVal=int(tmp[0]["min"])
		except:
			try:
				minVal=float(tmp[0]["min"])
			except:
				
				pass

		precond=""
		if inputs.keys().count("mmMExpr") > 0:
			precond=" AND "+inputs["mmMExpr"]["value"]+" "
			layer.metadata.set("mmMExpr",inputs["mmMExpr"]["value"])
		else:
			try:
				layer.metadata.remove("mmMExpr")
			except:
				pass
		if inputs.keys().count("nbClasses")>0:
			if rClass:
				if i==0:
					tmpClass.setExpression('( ( ['+inputs["field"]["value"]+'] >= '+str(classif[i][0])+' ) AND ( ['+inputs["field"]["value"]+'] <= '+str(classif[i][1])+' ) '+precond+' )')
				else:
					tmpClass.setExpression('( ( ['+inputs["field"]["value"]+'] > '+str(classif[i][0])+' ) AND ( ['+inputs["field"]["value"]+'] <= '+str(classif[i][1])+' ) '+precond+' )')
			elif i==0:
				tmpClass.setExpression('( ( ['+inputs["field"]["value"]+'] >= '+str(minVal+(colspan*i))+' ) AND ( ['+inputs["field"]["value"]+'] <= '+str(minVal+(colspan*(i+1)))+' ) '+precond+' )')
			else:
				tmpClass.setExpression('( ( ['+inputs["field"]["value"]+'] > '+str(minVal+(colspan*i))+' ) AND ( ['+inputs["field"]["value"]+'] <= '+str(minVal+(colspan*(i+1)))+' ) '+precond+' )')
                
		else:
			for j in tmp[i]:
				try:
					if j=="pixel":
						tmpClass.setExpression('( ['+j+'] = '+str(tmp[i][j])+' '+precond+' )')
					else:
						try:
							tmpClass.setExpression('( ['+j+'] = '+str(int(tmp[i][j]))+' '+precond+' )')
						except:
							tmpClass.setExpression('( "['+j+']" = '+json.dumps(tmp[i][j])+' '+precond+' )')
				except Exception,e:
					print >> sys.stderr,e
					iEnc=layer.encoding
					oEnc=m.web.metadata.get("ows_encoding")
					tmpClass.setExpression('( "['+j+']" = "'+tmp[i][j].decode(oEnc).encode(iEnc)+'" '+precond+' )')
				print >> sys.stderr,tmpClass.getExpressionString()
				if inputs.has_key("mmFAS") and inputs["mmFAS"]["value"]=="true":
					try:
						style.size=eval(inputs["mmFASF"]["value"].replace(j,tmp[i][j]));
						layer.metadata.set("mmFAS","true")
						layer.metadata.set("mmFASF",inputs["mmFASF"]["value"])
					except Exception,e:
						print >> sys.stderr,e
				else:
					try:
						layer.metadata.remove("mmFAS")
						layer.metadata.remove("mmFASF")
					except:
						pass
				layer.metadata.set("mmName",tmp[i][j])
				tmpClass.name=tmp[i][j]
	except Exception,e:
		#print >> sys.stderr,e
		pass
        i+=1
    if l.type==mapscript.MS_LAYER_RASTER  and nbClasses>1:
	    if inputs.keys().count("tiled"):
		    l.metadata.set("mmTiled",inputs["tiled"]["value"])
		    createColorRamp(conf,m,l,int(inputs["tiled"]["value"]));
	    else:
		    try:
			    l.metadata.remove("mmTiled")
		    except:
			    pass
		    createColorRamp(conf,m,l);
    inputs["name"]=inputs["map"]
    if inputs.keys().count("mmType")>0:
        nameSpace={"conf": conf, "inputs": inputs, "outputs": outputs, "m": m, "mmType": inputs["mmType"]["value"]}
    else:
        nameSpace={"conf": conf, "inputs": inputs, "outputs": outputs, "m": m, "mmType": "uniqVal"}
    t=Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/ClassLegend.tmpl",searchList=nameSpace)
    outputs["Result"]["value"]=t.__str__()
    saveProjectMap(m,mapfile)
    if isRaster < 0:
        outputs1={"Result": {"value": ""}}
        createLegend(conf,inputs,outputs1)
    return 3

def saveOpacity(conf,inputs,outputs):
    import mapscript
    import sqlite3
    import time
    import json
    import classifier.service as cs
    #try:
    mapPath=conf["main"]["dataPath"]+"/maps"
    if inputs.has_key('prefix'):
	    mapPath=conf["main"]["dataPath"]+"/"+inputs["prefix"]["value"]+"_maps"
    mapfile=mapPath+"/project_"+inputs["name"]["value"]+".map"
    
    
    isStep=False
    if inputs.has_key("mmStep"):
	    m=mapscript.mapObj(mapfile)
	    l=m.getLayerByName(inputs["layer"]["value"])
	    l.metadata.set("mmClass","tl")
	    saveProjectMap(m,mapfile)
	    mapfile=mapPath+"/timeline_"+inputs["name"]["value"]+"_"+l.name.replace(".","_")+"_step"+inputs["mmStep"]["value"]+".map"
	    isStep=True
    m=mapscript.mapObj(mapfile)
    m1=m.clone()
    i=0
    layer=m.getLayerByName(inputs["layer"]["value"])
    if layer.metadata.get("mmClass")=="gs" and layer.type==mapscript.MS_LAYER_RASTER:
    	mapfile1=mapPath+"/color_ramp_"+inputs["name"]["value"]+"_"+inputs["layer"]["value"]+".map"
	m1=mapscript.mapObj(mapfile1)
	layer1=m1.getLayerByName(inputs["layer"]["value"])
	layer1.opacity=int(inputs["mmOpacity"]["value"])
	layer1.updateFromString("LAYER OPACITY "+str(inputs["mmOpacity"]["value"])+" END")
	while i < layer1.numclasses:
		try:
			layer1.getClass(i).getStyle(0).opacity=int(inputs["mmOpacity"]["value"])
		except:
			continue
        	i+=1
	saveProjectMap(m1,mapfile1)	
    if layer.encoding is None:
        layer.encoding="utf-8"
    i=0
    while i < layer.numclasses:
	try:
		layer.getClass(i).getStyle(0).opacity=int(inputs["mmOpacity"]["value"])
	except:
		pass
        i+=1
    inputs["map"]=inputs["name"]
    if inputs.keys().count("mmType")>0:
        nameSpace={"conf": conf, "inputs": inputs, "outputs": outputs, "m": m, "mmType": inputs["mmType"]["value"]}
    else:
        nameSpace={"conf": conf, "inputs": inputs, "outputs": outputs, "m": m, "mmType": "uniqVal"}
    t=Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/ClassLegend.tmpl",searchList=nameSpace)
    outputs["Result"]["value"]=t.__str__()
    saveProjectMap(m,mapfile)
    outputs1={"Result": {"value": ""}}
    createLegend(conf,inputs,outputs)
    return 3

def saveLabel(conf,inputs,outputs):
    import mapscript
    print >> sys.stderr,str(inputs)
    if inputs.has_key("fullPath") and inputs["fullPath"]["value"]=="true":
	    m=mapscript.mapObj(inputs["map"]["value"])
    else:
	    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    layer=m.getLayerByName(inputs["layer"]["value"])

    hasLabel=False
    try:
        hasLabel=(inputs.has_key("label") and inputs["label"].has_key("value") and inputs["label"]["value"]!="")
    except:
        hasLabel=False
    if inputs.keys().count("label") == 0: 
        layer.labelitem=None
        j=layer.numclasses-1
        while j>=0:
            try:
		    layer.getClass(j).label.size=-1.0
	    except:
		    try:
			    layer.getClass(j).removeLabel(0)
		    except:
			    continue
            j-=1
        saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
        outputs["Result"]["value"]=zoo._("Map saved")
        return 3

    if inputs.has_key("label") and inputs["label"].has_key("value") and inputs["label"]["value"]!="GRID" and inputs["label"]["value"]!="":
        layer.labelitem=inputs["label"]["value"]
        
    
    

    j=layer.numclasses-1
    while j>=0:
	print >> sys.stderr,j
	try:
		layer.getClass(j).removeLabel(0)
	except Exception,e:
		print >> sys.stderr,e
		
        if not(inputs.has_key("label")) or not(inputs["label"].has_key("value")):
            j-=1
            pass
        if inputs.has_key("mmFill"):
	    l=mapscript.labelObj()

            l.type=mapscript.MS_TRUETYPE
            l.antialias = mapscript.MS_TRUE
            l.partials = False
            l.encoding=layer.encoding
        
            # Set color, font and size
            setRGB(l.color,[int(n, 16) for n in (inputs["mmFill"]["value"][:2],inputs["mmFill"]["value"][2:4],inputs["mmFill"]["value"][4:6])])
            l.font=inputs["f"]["value"]
            l.size=float(inputs["fs"]["value"])
        
            # Never force display when no space available
            l.force=False
        
            # Set the default outline color and the buffer size
            if inputs.keys().count("lbs")>0:
                setRGB(l.outlinecolor,[int(n, 16) for n in (inputs["mmOut"]["value"][:2],inputs["mmOut"]["value"][2:4],inputs["mmOut"]["value"][4:6])])
                l.outlinewidth=int(inputs["lbs"]["value"])
            else:
                l.outlinewidth=0
            # Set angle
    	    try:
	        angle=float(inputs["angle"]["value"])
	    except Exception,e:
	        print >> sys.stderr,e
	        angle=inputs["angle"]["value"]
            if angle==0:
                if inputs["label"]["value"]!="GRID":
                    l.anglemode = mapscript.MS_FOLLOW
            else:
	        l.anglemode = mapscript.MS_NONE
	        try:
		    l.angle = angle
		    try:
			layer.metadata.remove("label_angle_field")
		    except Excepion,e:
			pass
		    print >> sys.stderr,dir(layer.metadata)
	        except Exception,e:
		    l.updateFromString("LABEL ANGLE "+angle+" END")
		    layer.metadata.set("label_angle_field",angle)
            # Set buffer
            l.buffer=int(inputs["bs"]["value"])
            # Set position
            if inputs["label"]["value"]!="GRID":
                l.position=eval("mapscript.MS_"+inputs["pos"]["value"].upper())
            else:
                l.position=mapscript.MS_AUTO
	
	    try:
		layer.getClass(j).removeLabel(0)
	    except Exception,e:
		print >> sys.stderr,e
	    try:
		layer.getClass(j).addLabel(l)
		print >> sys.stderr,"Label added"
	    except Exception,e:
		print >> sys.stderr,e
        j-=1
    
    if inputs.has_key("fullPath") and inputs["fullPath"]["value"]=="true":
	    saveProjectMap(m,inputs["map"]["value"])
    else:
	    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return zoo.SERVICE_SUCCEEDED

def isPolygon(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    l=m.getLayerByName(inputs["layer"]["value"])
    outputs["Result"]["value"]=str(l.type==mapscript.MS_LAYER_POLYGON)
    return zoo.SERVICE_SUCCEEDED

def removeLabelLayer(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
    i=m.numlayers-1
    while i >= 0:
        l0=m.getLayer(i)
        if l0.name==inputs["layer"]["value"]+"_mmlabel":
            m.removeLayer(i)
        i-=1
    m.save(conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return zoo.SERVICE_SUCCEEDED

def addLabelLayer(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["omap"]["value"]+".map")
    i=m.numlayers-1
    while i >= 0:
	    l0=m.getLayer(i)
	    if l0.name==inputs["layer"]["value"]+"_mmlabel":
		    m.removeLayer(i)
	    i-=1
    m1=mapscript.mapObj(inputs["map"]["value"])
    l=m1.getLayerByName("Result")
    l.name=inputs["layer"]["value"]+"_mmlabel"
    l.getClass(0).removeStyle(0)
    try:
	    m.insertLayer(l,m.getLayerByName(inputs["layer"]["value"]).index+1)
    except Exception,e:
	    print >> sys.stderr,e
	    m.insertLayer(l)
    m.save(conf["main"]["dataPath"]+"/maps/project_"+inputs["omap"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return zoo.SERVICE_SUCCEEDED

def getMapLayersInfo(conf,inputs,outputs):
    import mapscript
    print >> sys.stderr,"LAYER: "+str(inputs)
    if inputs.has_key("fullPath") and inputs["fullPath"]["value"]=="true":
	m=None
	try:
		m=mapscript.mapObj(inputs["map"]["value"])
	except:
		for i in ["PostGIS","MySQL","WFS","WMS"]:
			try:
				mapfile=conf["main"]["dataPath"]+"/"+i+"/"+inputs["map"]["value"].replace("WFS:","").replace("WMS:","")
				print >> sys.stderr,mapfile
				m = mapscript.mapObj(mapfile)
			except:
				pass
	if m is None:
		conf["lenv"]["message"]="Unable to load the mapfile."
		return zoo.SERVICE_FAILED

	print >> sys.stderr,"IF: "+inputs["map"]["value"]
    else:
        m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
	print >> sys.stderr,"ELSE: "+conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    if inputs["layer"]["value"]=="-1":
	    l=m.getLayer(0)
	    print >> sys.stderr,"IF: "+inputs["layer"]["value"]+" "+str(l)
    else:
	    for i in range(0,m.numlayers):
		    print >> sys.stderr,m.getLayer(i).name
	    l=m.getLayerByName(inputs["layer"]["value"])
	    print >> sys.stderr,"ELSE: "+inputs["layer"]["value"]+" "+str(l)
    print >> sys.stderr,"LAYER: "+inputs["layer"]["value"]+" "+str(l)
    if l.type!=mapscript.MS_LAYER_RASTER:
        if not(inputs.has_key("fullPath")):
		if l.connection[0:3]!="PG:":
			outputs["Result"]["value"]=str([l.connection,l.data])
		else:
			outputs["Result"]["value"]=str([l.metadata.get("mmDSTN"),l.data])
	else:
		outputs["Result"]["value"]=str([l.connection,l.data,l.encoding])
    else:
        data=""
        tmpA=l.data.split("/")
        j=0
        #print >> sys.stderr, tmpA
        for i in tmpA:
            if i!="" and j+1!=len(tmpA):
                
		if sys.platform=='win32':
			if data!="":
				data+="/"	
			data+=i
		else:
			data+="/"+i
            j+=1
	import gdal
	gf=gdal.Open(l.data)
        outputs["Result"]["value"]=str([data+"/",inputs["layer"]["value"],l.data,gf.GetDriver().ShortName])
    return 3

def getMapLayerProperties(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    nameSpace = {'conf': conf,'inputs': inputs, 'outputs': outputs, "m": m}
    t = Template(file=conf["main"]["templatesPath"]+"/Manager/LayerProperties.tmpl",searchList=nameSpace)
    outputs["Result"]["value"]=t.__str__()
    return 3

def setMapLayerProperties(conf,inputs,outputs):
    import mapscript
    import urllib
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    l=m.getLayerByName(inputs["layer"]["value"])
    print >> sys.stderr,l
    l.name=inputs["ln"]["value"];
    m.web.metadata.set("wms_feature_info_mime_type","text/html")
    l.metadata.set("ows_name",inputs["ln"]["value"])
    if conf["main"].has_key("3D") and conf["main"]["3D"]=="true" and inputs["lfly"]["value"]!="":
	    l.metadata.set("mmFly",inputs["lfly"]["value"])
    l.metadata.set("mmAlias",urllib.unquote(inputs["a"]["value"]))
    l.metadata.set("ows_title",urllib.unquote(inputs["a"]["value"]))
    l.metadata.set("mmQuery",inputs["q"]["value"])
    l.metadata.set("mmExport",inputs["e"]["value"])
    if inputs.has_key("routing"):
    	l.metadata.set("mmRouting",inputs["routing"]["value"])
    tmp=["s","_f","zf"]
    tmpn=["Search","Filter","ZFilter"]
    for i in range(0,3):
	    l.metadata.set("mm"+tmpn[i],inputs[tmp[i]]["value"])
	    if inputs[tmp[i]]["value"]!="false":
		    l.metadata.set("mm"+tmpn[i]+"Field",inputs[tmp[i]+"f"]["value"])
	    else:
		    try:
			    l.metadata.remove("mm"+tmpn[i]+"Field")
		    except:
			    pass
    l.metadata.set("mmSpatialQuery",inputs["sq"]["value"])
    l.metadata.set("mmSpatialQueryType",inputs["sqt"]["value"])
    l.metadata.set("ows_abstract",urllib.unquote(inputs["ab"]["value"]))
    l.metadata.set("ows_keywordlist",urllib.unquote(inputs["kl"]["value"]))
    l.metadata.set("ows_fees",urllib.unquote(inputs["f"]["value"]))
    if inputs["q"]["value"]=="true":
        i=0
        l.header=conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_header.html"
        try:
            open(conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_header.html","r")
        except:
            f=open(conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_header.html","w")
            f.write("<!-- MapServer Template -->\n<div>")
            f.close()
        l.footer=conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_footer.html"
        try:
            open(conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_footer.html","r")
        except:
            f=open(conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_footer.html","w")
            f.write("<!-- MapServer Template -->\n</div>")
            f.close()
        while i < l.numclasses:
            l.getClass(i).template=conf["main"]["dataPath"]+"/templates/"+l.name+"_"+inputs["map"]["value"]+"_tmpl.html"
            i+=1
    nameSpace = {'conf': conf,'inputs': inputs, 'outputs': outputs, "m": m}
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    
    initMintMapfile(conf,m,inputs["map"]["value"],inputs["layer"]["value"])

    mf=inputs["map"]["value"]
    lname=inputs["layer"]["value"]
    m0=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/search_"+mf+"_"+lname+".map")
    if m0.getLayer(0).metadata.get('mmFilterField') or m0.getLayer(0).metadata.get('mmZFilterField'):
	import json
	import vector_tools.vectSql as vt
	print >> sys.stderr,m0.getLayer(0).data
	print >> sys.stderr,m0.getLayer(0).connection
	layer=m0.getLayer(0)
	if layer.metadata.get('mmFilterField'):
		sql="SELECT DISTINCT "+layer.metadata.get('mmFilterField')+" FROM "+layer.data+" ORDER BY "+layer.metadata.get('mmFilterField')+" ASC"
	else:
		sql="SELECT DISTINCT "+layer.metadata.get('mmZFilterField')+" FROM "+layer.data+" ORDER BY "+layer.metadata.get('mmZFilterField')+" ASC"

	lInputs={"encoding": {"value": layer.encoding},"dsoName": {"value": layer.name}, "dstName": {"value": layer.connection},"q": {"value": sql}}
	output1={"Result": {"value":""}}
	vt.vectInfo(conf,lInputs,outputs)
	print >> sys.stderr,outputs["Result"]["value"]
	tmp=json.loads(outputs["Result"]["value"].decode("utf-8"))
	for i in range(0,len(tmp)):
		filter=""
		fval=""
		ffilter=""
		for k in tmp[i]:
			filter=' AND "['+k+']" = "'+tmp[i][k]+'" )'
			fval=tmp[i][k]
			ffilter="<PropertyIsEqualTo><PropertyName>"+k+"</PropertyName><Literal>"+tmp[i][k]+"</Literal></PropertyIsEqualTo>"
		for j in range(0,layer.numclasses):
			if layer.getClass(j).getExpressionString() is not None:
				if layer.encoding is not None:
					tmp0=layer.getClass(j).getExpressionString().decode(layer.encoding)
					tmp0=tmp0.replace(")",filter)
					layer.getClass(j).setExpression(tmp0.encode(layer.encoding))
				else:
					layer.getClass(j).setExpression(layer.getClass(j).getExpressionString().replace(")",filter))
			else:
				layer.getClass(j).setExpression(filter.replace("AND ","(",1))
		
		layer.connectiontype=mapscript.MS_WFS
		layer.connection=conf["main"]["mapserverAddress"]+"?map="+conf["main"]["dataPath"]+"/maps/search_"+mf+"_"+lname+".map"
		layer.metadata.set("wfs_typename",lname)
		layer.metadata.set("wfs_version","1.0.0")
		layer.metadata.set("wfs_filter",ffilter)
		wgs84=mapscript.projectionObj("+init=epsg:4326")
		ext=layer.getExtent()
		p0=mapscript.pointObj(ext.minx,ext.miny)
		p1=mapscript.pointObj(ext.maxx,ext.maxy)
		p0.project(mapscript.projectionObj(m.getLayer(0).getProjection()),wgs84)
		p1.project(mapscript.projectionObj(m.getLayer(0).getProjection()),wgs84)	
		layer.setExtent(p0.x,p0.y,p1.x,p1.y)
		layer.setProjection("+init=epsg:4326")
		saveProjectMap(m0,conf["main"]["dataPath"]+"/maps/search_"+mf+"_"+lname+"_"+fval+".map")
		f = open(conf["main"]["publicationPath"]+'/styles/'+layer.name+'_'+fval+"_"+conf["senv"]["last_map"]+"_sld.xml", 'w')
		f.write(layer.generateSLD())
		f.close()		
		m0=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/search_"+mf+"_"+lname+".map")
		layer=m0.getLayer(0)
	print >> sys.stderr,tmp
    outputs["Result"]["value"]="Layer properties saved."
    return 3

def computeExtent(ext):
    if ext.minx<10:
        return [ext.minx-1,ext.miny-1,ext.maxx+1,ext.maxy+1]
    if ext.minx<100:
        return [ext.minx-10,ext.miny-10,ext.maxx+10,ext.maxy+10]
    if ext.minx<1000:
        return [ext.minx-100,ext.miny-100,ext.maxx+100,ext.maxy+100]
    if ext.minx<10000:
        return [ext.minx-1000,ext.miny-1000,ext.maxx+1000,ext.maxy+1000]
    else:
        return [ext.minx-10000,ext.miny-10000,ext.maxx+10000,ext.maxy+10000]
    

def initMintMapfile(conf,m,mf,lname):
    removeAllLayers(m,lname)
    l=m.getLayer(0)
    try:
        m.setProjection(l.getProjection())
        tmpExt=l.getExtent()
        if tmpExt is not None:
            tmp=computeExtent(tmpExt)
            print >> sys.stderr,str(tmp)
            m.setExtent(tmp[0],tmp[1],tmp[2],tmp[3])
            l.setExtent(tmp[0],tmp[1],tmp[2],tmp[3])
    except:
        pass
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/search_"+mf+"_"+lname+".map")
    print >> sys.stderr,m.getLayer(0)
    i=0
    if m.getLayer(0):
	    while i < m.getLayer(0).numclasses:
		    m.getLayer(0).getClass(i).template=conf["main"]["dataPath"]+"/templates/click_"+l.name+"_"+mf+"_tmpl.html"
		    print >> sys.stderr,l.getClass(i).template
		    i+=1
	    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/search_click_"+mf+"_"+lname+".map")
    #except:
    #    pass

def removeLayer(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    i=0
    while i < m.numlayers:
        if m.getLayer(i).name==inputs["layer"]["value"]:
            m.removeLayer(i)
        i+=1
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return 3

def setLayerScale(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    i=0
    while i < m.numlayers:
        if m.getLayer(i).name==inputs["layer"]["value"]:
            m.getLayer(i).metadata.set("mm"+inputs["st"]["value"]+"Scale",str(int(float(inputs["sv"]["value"]))))
            if inputs["st"]["value"]=="Min":
                m.getLayer(i).minscaledenom=int(float(inputs["sv"]["value"]))
            else:
                if m.getLayer(i).minscaledenom==int(float(inputs["sv"]["value"])):
                    m.getLayer(i).minscaledenom=-1
                m.getLayer(i).maxscaledenom=int(float(inputs["sv"]["value"]))
        i+=1
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return 3

def setLayerLabelScale(conf,inputs,outputs):
    import mapscript
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    i=0
    while i < m.numlayers:
        if m.getLayer(i).name==inputs["layer"]["value"]:
            m.getLayer(i).metadata.set("mmLabel"+inputs["st"]["value"]+"Scale",str(int(float(inputs["sv"]["value"]))))
            if inputs["st"]["value"]=="Min":
                m.getLayer(i).labelminscaledenom=int(float(inputs["sv"]["value"]))
            else:
                m.getLayer(i).labelmaxscaledenom=int(float(inputs["sv"]["value"]))
        i+=1
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return 3


def saveMapFor(conf,inputs,outputs):
    import mapscript
    import urllib
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    m.getLayerByName(inputs["layers"]["value"]).metadata.set("mm"+inputs["type"]["value"]+"Fields",inputs["fields"]["value"])
    if inputs.keys().count("fwidth") > 0:
        m.getLayerByName(inputs["layers"]["value"]).metadata.set("mm"+inputs["type"]["value"]+"FieldsWidth",inputs["fwidth"]["value"])
    else:
        #print >> sys.stderr,inputs["faliases"]["value"]
        m.getLayerByName(inputs["layers"]["value"]).metadata.set("mm"+inputs["type"]["value"]+"FieldsAliases",urllib.unquote(inputs["faliases"]["value"]))
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return 3

def doGroupLists(mmGroups,layers,groups,i):
    #print >> sys.stderr, i
    if groups.keys().count("children") > 0:
        if mmGroups[i]=='':
            mmGroups[i]=groups["id"]
        else:
            if mmGroups[i].count(";")>0:
                mmGroups[i]+=groups["id"]
            else:
                mmGroups[i]+=","+groups["id"]
        for j in range(0,len(groups["children"])):
            doGroupLists(mmGroups,layers,groups["children"][j],i+1)
        if i == 1 and mmGroups[i+1][len(mmGroups[i+1])-1]!=';':
            mmGroups[i+1]+=',|'+groups["id"]+";"
            print >> sys.stderr,mmGroups[i+1]
    else:
        tmp=mmGroups[i-1].split(',')
        if tmp[len(tmp)-1].count(";"):
            tmp[len(tmp)-1]=tmp[len(tmp)-1].split(";")[1]
        layers+=[{"name": groups["id"], "group": tmp[len(tmp)-1]}]

def updateMapOrder(conf,inputs,outputs):    
    import mapscript
    mmGroups=['','','']
    layers=[]

    doGroupLists(mmGroups,layers,eval(inputs["jsonStr"]["value"])[0],0)
    print >> sys.stderr,str(mmGroups)
    print >> sys.stderr,str(layers)
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    i=0
    while i < 3:
        m.web.metadata.set("mm_group_"+str(i),mmGroups[i])
        i+=1
    for a in layers:
        l=m.getLayerByName(a["name"])
        if l is not None:
            l.setMetaData("mm_group",a["group"])
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return 3

def updateLayersOrder(conf,inputs,outputs):
    import mapscript

    layers=eval(inputs['layers']['value'])
    i=0
    myLayers=mapscript.intarray(len(layers))
    m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    while i < len(layers):
        #print >> sys.stderr,layers[i]
        layer=m.getLayerByName(layers[i])
        myLayers[i]=layer.index
        i+=1
    #print >> sys.stderr,myLayers
    m.setLayersDrawingOrder(myLayers)
    saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    outputs["Result"]["value"]=zoo._("Map saved")
    return 3

def addGroupToMap(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    m = mapscript.mapObj(mapfile)
    m.web.metadata.set("mm_group_0","Layers")
    if m.web.metadata.get("mm_group_1")!="":
        tmp=m.web.metadata.get("mm_group_1").split(",")
        res=""
        ind=0
        for i in tmp:
            if i!="" and i!=inputs["group"]["value"]:
                if ind>0:
                    res+=","
                res+=i
                ind+=1
        print >> sys.stderr,res+","+inputs["group"]["value"]
        m.web.metadata.set("mm_group_1",res+","+inputs["group"]["value"])
    else:
        m.web.metadata.set("mm_group_1",inputs["group"]["value"])
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Directory added.")
    return 3

def renameGroupInMap(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    m = mapscript.mapObj(mapfile)
    m.web.metadata.set("mm_group_0","Layers")
    m.web.metadata.set("mm_group_1",m.web.metadata.get("mm_group_1").replace(inputs["oldgroup"]["value"],inputs["group"]["value"]))
    m.web.metadata.set("mm_group_2",m.web.metadata.get("mm_group_2").replace(inputs["oldgroup"]["value"],inputs["group"]["value"]))

    for i in range(m.numlayers):
        if m.getLayer(i).getMetaData("mm_group")==inputs["oldgroup"]["value"]:
            m.getLayer(i).setMetaData("mm_group",m.getLayer(i).getMetaData("mm_group").replace(inputs["oldgroup"]["value"],inputs["group"]["value"]))
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Directory renamed.")
    return 3

def removeGroupFromMap(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    m = mapscript.mapObj(mapfile)
    m.web.metadata.set("mm_group_0","Layers")
    if len(m.web.metadata.get("mm_group_1").split(','))>1  and m.web.metadata.get("mm_group_1").split(',')[1]!="":
        m.web.metadata.set("mm_group_1",m.web.metadata.get("mm_group_1").replace(inputs["group"]["value"],"").replace(",,",","))
    else:
        conf["lenv"]["message"]=zoo._("Unable to remove the group as it is the only one remaining.")
        return 4
    if len(m.web.metadata.get("mm_group_2").split(','))>1 and m.web.metadata.get("mm_group_2").split(',')[1]!="":
        m.web.metadata.set("mm_group_2",m.web.metadata.get("mm_group_2").replace(inputs["group"]["value"],"").replace(",,",","))
    else:
        conf["lenv"]["message"]=zoo._("Unable to remove the group as it is the only one remaining.")
        return 4

    for i in range(m.numlayers):
        if m.getLayer(i).getMetaData("mm_group")==inputs["group"]["value"]:
            m.getLayer(i).setMetaData("mm_group","Layers")

    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Directory deleted.")
    return 3

def updateMapcacheCfg(conf,inputs,outputs):
    rL=inputs["rasterLayers"]["value"].split(',')
    aL=inputs["mmActivatedLayers"]["value"].split(',')
    fL=""
    for i in aL:
        if rL.count(i)>0:
            if fL!="":
                fL+=","
            fL+=i
    print >> sys.stderr,fL
    if fL is None:
        # No need for updating the cache
        return 3

    import libxml2
    doc=libxml2.parseDoc(open(conf["mm"]["mapcacheCfg"],'r').read())
    root=doc.xpathEval('/mapcache')
    nodes=doc.xpathEval('/mapcache/source[@name="'+inputs["mmProjectName"]["value"]+'"]')

    from Cheetah.Template import Template
    searchList={"conf": conf,"inputs": inputs,"outputs": outputs,"layers": fL}
    xmlSection=Template(file=conf["main"]["templatesPath"]+"/mapcacheLayer.tmpl",searchList=searchList).__str__()

    #print >> sys.stderr,xmlSection
    doc1=libxml2.parseMemory(xmlSection,len(xmlSection))
    aNodes=doc1.xpathEval('/mapcache/*')

    if len(nodes)==0:
        for j in range(0,len(aNodes)):
            root[0].addChild(aNodes[j])
    else:
        nodes[0].replaceNode(aNodes[0])
        nodes=doc.xpathEval('/mapcache/tileset[@name="'+inputs["mmProjectName"]["value"]+'Tile"]')
        nodes[0].replaceNode(aNodes[1])
    f=open(conf["mm"]["mapcacheCfg"],'w')
    #print >> sys.stderr, doc
    doc.saveTo(f)
    f.close
    return 3

def saveLayerPrivileges(conf,inputs,outputs):
	import mapscript
	if inputs.has_key("dataStore"):
		import datastores.service as ds
		mapfile=ds.getPath(conf,inputs["dataStore"]["value"])+"ds_ows.map"
	else:
		mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
	m = mapscript.mapObj(mapfile)
	tmpS=""
	layer=m.getLayerByName(inputs["layer"]["value"])
	if inputs["group"].has_key("length"):
		for i in range(0,len(inputs["group"]["value"])):
			if tmpS!="":
				tmpS+=","
			layer.metadata.set("mm_access_"+inputs["group"]["value"][i],inputs["group_r"]["value"][i]+','+inputs["group_w"]["value"][i]+','+inputs["group_x"]["value"][i])
			tmpS+=inputs["group"]["value"][i]
	else:
		tmpS+=inputs["group"]["value"]
		layer.metadata.set("mm_access_"+inputs["group"]["value"],inputs["group_r"]["value"]+','+inputs["group_w"]["value"]+','+inputs["group_x"]["value"])
	layer.metadata.set("mm_access_groups",tmpS)
	m.save(mapfile)
	outputs["Result"]["value"]=zoo._("Layer privileges saved.")
	return 3

def saveNavPrivileges(conf,inputs,outputs):
	import mapscript
	mapfile=conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map"
	m = mapscript.mapObj(mapfile)
	m.web.metadata.set("mm_access_nav",inputs["priv"]["value"])
	m.save(mapfile)
	outputs["Result"]["value"]=zoo._("Privileges saved")
	return zoo.SERVICE_SUCCEEDED

def getDescription(conf,m):
	description=""
	try:
		description=open(m.web.metadata.get("ows_abstract").replace(conf["main"]["tmpUrl"],conf["main"]["tmpPath"])).read()
	except:
		description=m.web.metadata.get("ows_abstract")
	return description

def getShortDescription(conf,m):
	try:
		description=open(m.web.metadata.get("ows_abstract").replace(conf["main"]["tmpUrl"],conf["main"]["tmpPath"])).read().replace("\t","")
		# Extract text content from HTML (supposed to be welel formed
		# XML file)
		from xml.sax.handler import ContentHandler
		import xml.sax
		desc=""
		class textHandler(xml.sax.handler.ContentHandler):
			def __init__(self):
				self.flag = 0
				self.desc=""
			def characters(self, ch):
				self.desc+=" "+ch
		tmp=textHandler()
		import HTMLParser
		h = HTMLParser.HTMLParser()
		#print >> sys.stderr,"<xml>"+h.unescape(description)+"</xml>"
		xml.sax.parseString("<xml>".encode("utf-8")+h.unescape(description).encode("utf-8")+"</xml>".encode("utf-8"),tmp)
		description=tmp.desc[:100]
	except Exception,e:
		print >> sys.stderr,e
		description=m.web.metadata.get("ows_abstract")[:100]
	return description

def saveLegendIconsForLayer(conf,m,lm,layer,i,step=None):
	import time,mapscript
	lm.setSize(20,20)
	lm.setExtent(-1.5,-1.5,7.5,7.5)
	if layer.numclasses==1:
		lm.getLayer(0).status=mapscript.MS_ON
		lsavedImage=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(i)+"_"+str(time.clock()).split(".")[1]+".png"
			#print >> sys.stderr,"OK 1"
		try:
			os.unlink(lsavedImage)
		except:
			pass
		img=lm.draw()
		img.save(lsavedImage)
		layer.metadata.set("mmIcon",lsavedImage.replace(conf["main"]["tmpPath"],conf["main"]["tmpUrl"]))
	else:
		files=[]
		if step is None:
			lm=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/map4legend_"+conf["senv"]["last_map"]+"_"+layer.name+".map")
		else:
			lm=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/map4legend_"+conf["senv"]["last_map"]+"_"+layer.name+"_step"+str(step)+".map")
		lm.setSize(20,20)
		lm.setExtent(-1.5,-1.5,7.5,7.5)
		for k in range(0,layer.numclasses):
			for j in range(0,lm.numlayers):
				lm.getLayer(j).status=mapscript.MS_OFF
			print >> sys.stderr,"LAYER NAME "+layer.name+"_"+str(k+1)
			if lm.getLayerByName(layer.name+"_"+str(k+1)) is not None:
				lm.getLayerByName(layer.name+"_"+str(k+1)).status=mapscript.MS_ON
			lsavedImage=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(i)+"_"+str(time.clock()).split(".")[1]+"_"+str(k)+".png"
			print >> sys.stderr,"OK 2"
			try:
				os.unlink(lsavedImage)
			except:
				pass
			img=lm.draw()
			img.save(lsavedImage)
			print >> sys.stderr,"mmIcon_"+str(k)
			layer.metadata.set("mmIcon_"+str(k),lsavedImage.replace(conf["main"]["tmpPath"],conf["main"]["tmpUrl"]))
			files+=[lsavedImage]
		lsavedSprite=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(i)+"_"+str(time.clock()).split(".")[1]+"_sprite.png"
		import mmSprites
		mmSprites.combine(files,lsavedSprite)
		layer.metadata.set("mmSprite",lsavedSprite.replace(conf["main"]["tmpPath"],conf["main"]["tmpUrl"]))
		print >> sys.stderr,lsavedSprite
		

def saveLegendIcons(conf,m):
	import mapscript
	for i in range(0,m.numlayers):
		layer=m.getLayer(i)
		try:
			print >> sys.stderr,"mmCLASS: " + str(layer.metadata.get('mmClass'))
			mmClass=layer.metadata.get('mmClass')
			if mmClass=="tl":
				mmSteps=layer.metadata.get('mmSteps').split(',')
				for k in range(0,len(mmSteps)):
					m0=mapscript.mapObj(conf["main"]["dataPath"]+"/public_maps/timeline_"+conf["senv"]["last_map"]+"_"+layer.name+"_step"+str(k)+".map")
					layer=m0.getLayer(0)
					print >> sys.stderr,"mmCLASS: " + str(layer.numclasses)
					lm=mapscript.mapObj(conf["main"]["dataPath"]+"/public_maps/map4legend_"+conf["senv"]["last_map"]+"_"+layer.name+"_step"+str(k)+".map")
					saveLegendIconsForLayer(conf,m0,lm,layer,i,k)
					m0.save(conf["main"]["dataPath"]+"/public_maps/timeline_"+conf["senv"]["last_map"]+"_"+layer.name+"_step"+str(k)+".map")
			else:
				lm=mapscript.mapObj(conf["main"]["dataPath"]+"/public_maps/map4legend_"+conf["senv"]["last_map"]+"_"+layer.name+".map")
				saveLegendIconsForLayer(conf,m,lm,layer,i)
		except Exception,e:
			print >> sys.stderr,e
			continue

def savePublishMap(conf,inputs,outputs):

    updateMapcacheCfg(conf,inputs,outputs)

    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    destMapfile=mapfile.replace("maps","public_maps")
    m = mapscript.mapObj(mapfile)
    args=["mmPopupList","mmWindowList","mmProjectName","mmTitle","mmKeywords","mmAuthor","mmCopyright","mmRestricted","mmMBaseLayers","mmPBaseLayers","mmProprietaryBaseLayers","mmOSMBaseLayers","mmActivatedBaseLayers","mmBAK","mmOT","mmVT","mmNav","mmBProject","mmRenderer","default_minx","default_maxx","default_miny","default_maxy","max_minx","max_miny","max_maxx","max_maxy","mmActivatedLayers","layout_t","mmProjectName","vectorLayers","rasterLayers","mmLayoutColor","base_osm","tuom","tprj","fsize","ffamily","font-colorpicker"]
    isPassed=-1
    for i in args:
        if inputs.keys().count(i)>0:
            m.web.metadata.set(i,inputs[i]["value"]);
            if i=="mmProjectName" and isPassed<0:
                import os
                try:
                    os.unlink(conf["main"]["dataPath"]+"/public_maps/"+inputs[i]["value"])
                except:
                    pass
                saveProjectMap(m,destMapfile)
                os.symlink(destMapfile,conf["main"]["dataPath"]+"/public_maps/"+inputs[i]["value"])
                isPassed=1
        else:
            try:
                m.web.metadata.remove(i);
            except:
                pass
    argf=["default_minx","default_maxx","default_miny","default_maxy","max_minx","max_miny","max_maxx","max_maxy"]
    for i in argf:
        if inputs.keys().count(i)==0:
            try:
                m.web.metadata.remove(i)
            except:
                pass


    if inputs.has_key("mmDescription"):
	    import time,random
	    cid=time.clock()+random.randrange(100000)
	    cid=str(cid).split(".")[0]
	    open(conf["main"]["tmpPath"]+"/descriptions/desc_"+conf["senv"]["MMID"]+"_"+cid+".html","w").write(inputs["mmDescription"]["value"].replace("&39;","&#39;"))
	    m.web.metadata.set("ows_abstract",conf["main"]["tmpUrl"]+"/descriptions/desc_"+conf["senv"]["MMID"]+"_"+cid+".html")
	    
    if inputs.has_key("mm_access_groups"):
	    if inputs["mm_access_groups"].has_key("length"):
		    tmpS=""
		    for j in range(0,len(inputs["mm_access_groups"]["value"])):
			    if tmpS!="":
				    tmpS+=","
			    tmpS+=inputs["mm_access_groups"]["value"][j]
		    m.web.metadata.set("mm_access_groups",tmpS)
	    else:
		    m.web.metadata.set("mm_access_groups",inputs["mm_access_groups"]["value"])
    if inputs.has_key("mm_themes_class"):
	    if inputs["mm_themes_class"].has_key("length"):
		    tmpS=""
		    for j in range(0,len(inputs["mm_themes_class"]["value"])):
			    if tmpS!="":
				    tmpS+=","
			    tmpS+=inputs["mm_themes_class"]["value"][j]
		    m.web.metadata.set("mm_themes_class",tmpS)
	    else:
		    m.web.metadata.set("mm_themes_class",inputs["mm_themes_class"]["value"])

    minScales=inputs["minScales"]["value"].split(',')
    maxScales=inputs["maxScales"]["value"].split(',')
    lminScales=inputs["lminScales"]["value"].split(',')
    lmaxScales=inputs["lmaxScales"]["value"].split(',')
    for l in range(0,m.numlayers):

        if len(minScales)>l and minScales[l]!="":
            m.getLayer(l).minscaledenom=int(minScales[l])
            m.getLayer(l).metadata.set('mmMinScale',minScales[l])
        else:
            try:
                m.getLayer(l).minscaledenom=-1
                m.getLayer(l).metadata.remove('mmMinScale')
            except:
                pass
        if len(minScales)>l and maxScales[l]!="":
            m.getLayer(l).maxscaledenom=int(maxScales[l])
            m.getLayer(l).metadata.set('mmMaxScale',maxScales[l])
        else:
            try:
                m.getLayer(l).maxscaledenom=-1
                m.getLayer(l).metadata.remove('mmMaxScale')
            except:
                pass
        if len(lminScales)>l and lminScales[l]!="":
            m.getLayer(l).labelminscaledenom=int(lminScales[l])
            m.getLayer(l).metadata.set('mmLabelMinScale',lminScales[l])
        else:
            try:
                m.getLayer(l).labelminscaledenom=-1
                m.getLayer(l).metadata.remove('mmLabelMinScale')
            except:
                pass
        if len(lmaxScales)>l and lmaxScales[l]!="":
            m.getLayer(l).labelmaxscaledenom=int(lmaxScales[l])
            m.getLayer(l).metadata.set('mmLabelMaxScale',lmaxScales[l])
        else:
            try:
                m.getLayer(l).labelmaxscaledenom=-1
                m.getLayer(l).metadata.remove('mmLabelMaxScale')
            except:
                pass

        
        if m.getLayer(l).metadata.get('mmMinScale') is not None and m.getLayer(l).metadata.get('mmMinScale')!='None':
            m.getLayer(l).minscaledenom=int(m.getLayer(l).metadata.get('mmMinScale'))
        if m.getLayer(l).metadata.get('mmMaxScale') is not None and m.getLayer(l).metadata.get('mmMaxScale')!='None':
            m.getLayer(l).maxscaledenom=int(m.getLayer(l).metadata.get('mmMaxScale'))
        if m.getLayer(l).metadata.get('mmLabelMinScale') is not None and m.getLayer(l).metadata.get('mmLabelMinScale')!='None':
            m.getLayer(l).labelminscaledenom=int(m.getLayer(l).metadata.get('mmLabelMinScale'))
        if m.getLayer(l).metadata.get('mmLabelMaxScale') is not None and m.getLayer(l).metadata.get('mmLabelMaxScale')!='None':
            m.getLayer(l).labelmaxscaledenom=int(m.getLayer(l).metadata.get('mmLabelMaxScale'))
        if inputs["mmProprietaryBaseLayers"]["value"]==conf["mm"]["biName"]:
            m.getLayer(l).metadata.set("ows_srs","EPSG:4326 EPSG:900913 EPSG:900914")
    m.web.metadata.set("ows_title",inputs["mmTitle"]["value"]);

    saveProjectMap(m,mapfile)
    saveProjectMap(m,destMapfile)

    import shutil
    for i in os.listdir(conf["main"]["dataPath"]+"/maps/"):
        if i.count("_"+inputs["map"]["value"]+"_")>0:
            shutil.copy(conf["main"]["dataPath"]+"/maps/"+i,conf["main"]["dataPath"]+"/public_maps/"+i)

    saveLegendIcons(conf,m)
    saveProjectMap(m,destMapfile)

    outputs["Result"]["value"]=zoo._("Project saved")
    return 3

def savePublishPreview(conf,inputs,outputs):
	import mapscript
	mapfile=conf["main"]["dataPath"]+"/public_maps/project_"+inputs["map"]["value"]+".map"
	destMapfile=mapfile.replace("public_maps","maps")
	m = mapscript.mapObj(mapfile)
	generatePreview(conf,m)
	saveProjectMap(m,mapfile)
	saveProjectMap(m,destMapfile)
	outputs["Result"]["value"]=zoo._("Project preview generated")
	return zoo.SERVICE_SUCCEEDED

def readTemplate(conf,inputs,outputs):
    ext=inputs["ext"]["value"]
    if inputs.keys().count("click") and inputs["click"]["value"]=="true":
        try:
            f=open(conf["main"]["dataPath"]+"/templates/click_"+inputs["layer"]["value"]+"_"+inputs["map"]["value"]+"_"+ext+".html","r")
        except:
            f=open(conf["main"]["dataPath"]+"/templates/"+inputs["layer"]["value"]+"_"+inputs["map"]["value"]+"_"+ext+".html","r")
    else:
        f=open(conf["main"]["dataPath"]+"/templates/"+inputs["layer"]["value"]+"_"+inputs["map"]["value"]+"_"+ext+".html","r")
    outputs["Result"]["value"]=f.read().replace("<!-- MapServer Template -->\n","")
    return 3

def saveTemplate(conf,inputs,outputs):
    import mapscript
    ext="tmpl"
    if inputs.keys().count("name")>0:
        ext=inputs["name"]["value"]
    if inputs.keys().count("click") and inputs["click"]["value"]=="true":
        f=open(conf["main"]["dataPath"]+"/templates/click_"+inputs["layer"]["value"]+"_"+inputs["map"]["value"]+"_"+ext+".html","w")
        m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
        m.getLayerByName(inputs["layer"]["value"]).setMetaData("mmClick","true")
        saveProjectMap(m,conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
    else:
        f=open(conf["main"]["dataPath"]+"/templates/"+inputs["layer"]["value"]+"_"+inputs["map"]["value"]+"_"+ext+".html","w")
    f.write("<!-- MapServer Template -->\n"+inputs['content']["value"].replace("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n",""))
    f.close()
    outputs["Result"]["value"]=zoo._("Template saved")
    return 3

def getStyleForLayer(conf,inputs,outputs):
    f = open(conf["main"]["dataPath"]+'/styles/'+inputs["layer"]["value"].name+'_'+conf["senv"]["last_map"]+"_sld.xml", 'w')
    outputs["Result"]["value"]=f.read()
    return 3

def setResample(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    m = mapscript.mapObj(mapfile)
    layer=m.getLayerByName(inputs["layer"]["value"])
    layer.clearProcessing()
    layer.setProcessing("RESAMPLE="+inputs["resm"]["value"])
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Resampling method saved.")
    return 3

def saveStep(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map"
    m = mapscript.mapObj(mapfile)
    hasIMap=1
    layer=m.getLayerByName(inputs["layer"]["value"])
    if layer is None:
	try:
		mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_Index"+conf["senv"]["last_index"]+".map"
	except:
		conf["senv"]["last_index"]=inputs["layer"]["value"].replace("indexes.view_idx","")
		mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_Index"+inputs["layer"]["value"].replace("indexes.view_idx","")+".map"		
	m = mapscript.mapObj(mapfile)
	layer=m.getLayer(0)
	hasIMap=0
    steps=layer.metadata.get('mmSteps')
    if steps is not None:
	    steps=steps.split(",")
	    for i in range(0,len(steps)):
		    if steps[i]=="":
			    steps.pop(i)
	    print >> sys.stderr,steps
    else:
	    steps=[]
    orderedSteps=""
    if steps is not None:
	    for i in steps:
		    print >> sys.stderr,i
		    if orderedSteps!="":
			    orderedSteps+=","
		    orderedSteps+=i
		    if i==inputs["name"]["value"]:
			    conf["lenv"]["message"]=zoo._("The step ")+inputs["name"]["value"]+zoo._(" already exists.")
			    return zoo.SERVICE_FAILED
    if orderedSteps!="":
	    orderedSteps+=","
    orderedSteps+=inputs["name"]["value"]
    layer.metadata.set('mmSteps',orderedSteps)
    saveProjectMap(m,mapfile)
    if hasIMap>0:
	mapfile=conf["main"]["dataPath"]+"/maps/timeline_"+conf["senv"]["last_map"]+"_"+layer.name+"_step"+str(len(steps))+".map"
    else:
	mapfile=conf["main"]["dataPath"]+"/indexes_maps/timeline_Index"+conf["senv"]["last_index"]+"_"+(layer.name.replace(".","_"))+"_step"+str(len(steps))+".map"
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Step added to existsing steps.")
    return 3

def deleteStep(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map"
    m = mapscript.mapObj(mapfile)
    layer=m.getLayerByName(inputs["layer"]["value"])
    if layer is None:
	mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_Index"+conf["senv"]["last_index"]+".map"
	m = mapscript.mapObj(mapfile)
	layer=m.getLayer(0)
    steps=layer.metadata.get('mmSteps')
    if steps is not None:
	    steps=steps.split(",")
	    print >> sys.stderr,steps
    orderedSteps=""
    cindex=0
    cnt=0
    if steps is not None:
	    for i in steps:
		    print >> sys.stderr,i
		    if i!=inputs["name"]["value"]:
			    if orderedSteps!="":
				    orderedSteps+=","
			    orderedSteps+=i
		    else:
			    cindex=cnt
		    cnt+=1
    print >> sys.stderr,cnt
    print >> sys.stderr,cindex
    if cindex<cnt-1:
	    import shutil
	    for i in range(cindex,cnt):
		    print >> sys.stderr,"Rename "+str(i+1)+" to "+str(i)
		    shutil.move(conf["main"]["dataPath"]+"/maps/timeline_"+conf["senv"]["last_map"]+"_"+inputs["layer"]["value"]+"_step"+str(i+1)+".map",conf["main"]["dataPath"]+"/maps/timeline_"+conf["senv"]["last_map"]+"_"+inputs["layer"]["value"]+"_step"+str(i)+".map")
    layer.metadata.set('mmSteps',orderedSteps)
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Step ")+inputs["name"]["value"]+zoo._(" removed successfully")
    return 3

def listStep(conf,inputs,outputs):
    import mapscript,json
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+conf["senv"]["last_map"]+".map"
    m = mapscript.mapObj(mapfile)
    layer=m.getLayerByName(inputs["layer"]["value"])
    if layer is None:
	mapfile=conf["main"]["dataPath"]+"/indexes_maps/project_Index"+conf["senv"]["last_index"]+".map"
	m = mapscript.mapObj(mapfile)
	layer=m.getLayer(0)
    steps=layer.metadata.get('mmSteps')
    if steps is not None:
	    steps=steps.split(",")
	    for i in range(0,len(steps)):
		    if steps[i]=="":
			    steps.pop(i)
	    outputs["Result"]["value"]=json.dumps(steps);
    else:
	    outputs["Result"]["value"]="NULL";
    return 3

def saveLayerGrid(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    m=mapscript.mapObj(mapfile)
    layer=m.getLayerByName(inputs["layer"]["value"])
    gridParams=('mmminArcs','mmmaxArcs','mmminInterval','mmmaxInterval','mmminSubdivide','mmmaxSubdivide','mmLabelFormat')
    gridStr="LAYER\n GRID\n"
    for i in gridParams:
        if inputs.keys().count(i) and inputs[i]["value"]!="-1":
            layer.metadata.set(i,inputs[i]["value"])
            if i=="mmLabelFormat":
                gridStr+=i.upper().replace("MM","")+" '"+inputs[i]["value"]+"'\n"
            else:
                gridStr+=i.upper().replace("MM","")+" "+inputs[i]["value"]+"\n"
    gridStr+=" END\nEND\n"
    print >> sys.stderr,gridStr
    layer.connectiontype=-1
    layer.connection=None
    layer.tileitem=None
    layer.updateFromString(gridStr)
    #try:
    #    layer.setConnectionType(-1,"")
    #except:
    #    pass
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Grid configuration saved.")
    return 3

def addGridToMap(conf,inputs,outputs):
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    m=mapscript.mapObj(mapfile)
    layer=mapscript.layerObj(m)
    layer.updateFromString('''LAYER
 NAME "grid_'''+inputs["layer"]["value"]+'''"
 METADATA
   "DESCRIPTION" "Grid"
   "mm_group"    "'''+m.web.metadata.get("mm_group_0")+'''"
   "mmLabelFormat" "DDMM"
   "mmmaxArcs" "25"
   "mmmaxInterval" "25"
   "mmmaxSubdivide" "2"
 END
 TYPE LINE
 STATUS ON
 CLASS
   NAME "Graticule"
   COLOR 0 0 0
   LABEL
     COLOR  255 0 0
     FONT "arial"
     TYPE truetype
     SIZE 8
     POSITION AUTO
     PARTIALS FALSE
     BUFFER 5
     OUTLINECOLOR 255 255 255
   END
END
PROJECTION
    "init=epsg:4326"
END
GRID
  LABELFORMAT "DDMM"
  MAXARCS 25
  MAXINTERVAL 25
  MAXSUBDIVIDE 2
END
END # Layer''')
    saveProjectMap(m,mapfile)
    outputs["Result"]["value"]=zoo._("Grid Layer was successfully added to the project.")
    return 3 

def getLayers(conf,inputs,outputs):
	import mapscript
	m=mapscript.mapObj(conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map")
	layers=[]
	if inputs["id"].has_key("length"):
		for i in range(0,len(inputs["id"]["value"])):
			l=m.getLayer(int(inputs["id"]["value"][i]))
			layers+=[l.name]
	else:
		l=m.getLayer(int(inputs["id"]["value"]))
		layers+=[l.name]
	import json
	outputs["Result"]["value"]=json.dumps(layers)
	return zoo.SERVICE_SUCCEEDED

def generatePreview(conf,m):
	import mapscript,urllib2
	wgs84=mapscript.projectionObj("+init=epsg:4326")
	spher=mapscript.projectionObj("+init=epsg:900913")
	p0=mapscript.pointObj(-179.5,-89.5)
	p1=mapscript.pointObj(179.5,89.5)
	if m.web.metadata.get('default_minx') or m.web.metadata.get('max_minx'):
		prefix="max"
		if m.web.metadata.get('default_minx'):
			prefix="default"
		p0=mapscript.pointObj(float(m.web.metadata.get(prefix+'_minx')),float(m.web.metadata.get(prefix+'_miny')))
		p1=mapscript.pointObj(float(m.web.metadata.get(prefix+'_maxx')),float(m.web.metadata.get(prefix+'_maxy')))
	else:
		ext=m.getLayer(0).getExtent()
		p0=mapscript.pointObj(ext.minx,ext.miny)
		p1=mapscript.pointObj(ext.maxx,ext.maxy)
		try:
			p0.project(mapscript.projectionObj(m.getLayer(0).getProjection()),wgs84)
			p1.project(mapscript.projectionObj(m.getLayer(0).getProjection()),wgs84)
		except:
			pass
	p0.project(wgs84,spher)
	p1.project(wgs84,spher)
	ext=[p0.x,p0.y,p1.x,p1.y]
	
	print >> sys.stderr,ext
	print >> sys.stderr,(conf["main"]["serverAddress"]+'?service=WPS&version=1.0.0&request=Execute&Identifier=raster-tools.translate&DataInputs=InputDSN=base_layers/mq-osm.xml;OutputDSN=tmp_MM1369836649;Format=GTiff;OutSize=1024,768;ProjWin="+ext[0]+","+ext[3]+","+ext[2]+","+ext[1]+"&RawDataOutput=Result')
	response = urllib2.urlopen(conf["main"]["serverAddress"]+"?service=WPS&version=1.0.0&request=Execute&Identifier=raster-tools.translate&DataInputs=InputDSN=base_layers/mq-osm.xml;OutputDSN=tmp_MM1369836649;Format=GTiff;OutSize=1024,768;ProjWin="+str(ext[0])+","+str(ext[3])+","+str(ext[2])+","+str(ext[1])+"&RawDataOutput=Result")
	html=response.read()

	print >> sys.stderr,html
	
	ll=""
	if m.web.metadata.get('mmActivatedLayers'):
		layers=m.web.metadata.get('mmActivatedLayers').split(',')
		for i in range(len(layers)):
			if ll!="":
				ll+=","
			ll+=""+str(m.getLayerByName(layers[i]).index)
	else:
		ll+="0"

	import pp.service as pp
	inputs0={
		"layers": {"value": ll},
		"ext": {"value":str(ext[0])+","+str(ext[1])+","+str(ext[2])+","+str(ext[3])},
		"iFormat": {"value": "preview"},
		"tDoc": {"value": "MM-PreviewMap.pdf"},
		"bgMap": {"value": html},
		"map": {"value": conf["senv"]["last_map"]}
	}
	import os
	conf["senv"]["prescr"]="import sys\nsys.path+=['"+(os.getcwd()+"/print/")+"']\n"
	outputs0={"Result":{"value":""}}
	pp.printMap(conf,inputs0,outputs0)
	
	print >> sys.stderr,outputs0["Result"]["value"]
	f=open(conf["main"]["tmpPath"]+"/preview_project_"+conf["senv"]["MMID"]+".pdf","wb")
	f.write(outputs0["Result"]["value"])
	f.close()

	outputs1={"Result":{"value":""}}
	inputs0={
	"file": {"value":conf["main"]["tmpPath"]+"/preview_project_"+conf["senv"]["MMID"]+".pdf"},
	"res": {"value":"42"}
	}
	pp.preview(conf,inputs0,outputs1)
	import time,random
	cid=time.clock()+random.randrange(100000)
	cid=str(cid).split(".")[0]
	filename=conf["main"]["tmpPath"]+"/preview_project_"+conf["senv"]["MMID"]+"_"+cid+".png"
	f=open(filename,"wb")
	f.write(outputs1["Result"]["value"])
	f.close()
	m.web.metadata.set("previewUrl",filename.replace(conf["main"]["tmpPath"],conf["main"]["tmpUrl"]))
	#print >> sys.stderr,outputs1
	conf["senv"].pop("prescr")

def setDefaultExtent(conf,inputs,outputs):
	conf["senv"]["default_extent"]=inputs["bbox"]["value"]
	import mmsession
	mmsession.save(conf)
	outputs["Result"]["value"]=zoo._("Default extent set.")
	return zoo.SERVICE_SUCCEEDED

