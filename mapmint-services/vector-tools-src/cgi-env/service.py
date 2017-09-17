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
from osgeo import *
import osgeo.ogr
import osgeo.gdal
import libxml2
import os
import sys
import zoo

layerName=None

def test(conf,inputs,outputs):
    conf["lenv"]["message"]="Error message"
    return zoo.SERVICE_FAILED

def readFileFromBuffer(data,ext,sql=None):
    try:
        geometry=[]
        #print >> sys.stderr,'/vsimem//temp1'+ext
        #print >> sys.stderr,data
        osgeo.gdal.FileFromMemBuffer('/vsimem//temp1'+ext,data)
        ds = osgeo.ogr.Open('/vsimem//temp1'+ext)
        if sql is not None:
            if sql.count("from")==0:
                layerName=ds.GetLayerByIndex(0).GetName()
                sql+=" from "+layerName
            lyr=ds.ExecuteSQL( sql, None, None )
            print >> sys.stderr,lyr
        else:
            lyr = ds.GetLayer(0)
            print >> sys.stderr,lyr
        feat = lyr.GetNextFeature()
        while feat is not None:
            geometry+=[feat.Clone()]
            feat.Destroy()
            feat = lyr.GetNextFeature()
        ds.Destroy()
        osgeo.gdal.Unlink('/vsimem//temp1'+ext)
        return geometry
    except Exception,e:
        #print >> sys.stderr,e
        return []

def buildFeatureFromGeomtry(conf,geom,driverName,ext):
    drv = osgeo.ogr.GetDriverByName( driverName )
    ds = drv.CreateDataSource( "/vsimem//store"+conf["lenv"]["sid"]+"0."+ext )
    lyr = ds.CreateLayer( "Result", None, osgeo.ogr.wkbUnknown )
    field_defn = osgeo.ogr.FieldDefn( "Name", osgeo.ogr.OFTString )
    field_defn.SetWidth( len("Result10000") )
    lyr.CreateField ( field_defn )
    feat = osgeo.ogr.Feature(lyr.GetLayerDefn())
    feat.SetField( "Name", "Input0" )
    feat.SetGeometry(geom)
    lyr.CreateFeature(feat)
    ds.Destroy()
    return [feat]

def createGeometryFromWFS(conf,my_wfs_response,sql=None):
    try:
        geom=osgeo.ogr.CreateGeometryFromGML(my_wfs_response.replace('<?xml version="1.0" encoding="utf-8"?>\n','').replace('<?xml version="1.0" encoding="utf-8"?>',''))
    except:
        geom=None
    try:
        if geom is None:
            if not(conf["lenv"].has_key("cnt")):
                conf["lenv"]["cnt"]=0
            else:
                conf["lenv"]["cnt"]+=1
            return readFileFromBuffer(my_wfs_response,str(conf["lenv"]["cnt"]),sql)
        else:
            return buildFeatureFromGeomtry(conf,geom,"GML","xml")
    except:
        print >> sys.stderr,"Unable to load file input data !!!\n\n\n"

def createLayerFromJson(conf,obj,sql=None):
    geom=osgeo.ogr.CreateGeometryFromJson(obj)
    if geom is None:
        return readFileFromBuffer(obj,".json",sql)
    else:
        return buildFeatureFromGeomtry(conf,geom,"GeoJSON","json")

def extractInputs(conf,obj,sql=None):
    if obj["mimeType"]=="application/json":
        return createLayerFromJson(conf,obj["value"],sql)
    else:
        return createGeometryFromWFS(conf,obj["value"],sql)
    
def outputResult(conf,obj,geom):
    driverName = "GML"
    extension = [ ".xml" , ".xsd" ]
    if obj["mimeType"]=="application/json":
        driverName = "GeoJSON"
        extension = [ ".js" ]
    if obj.keys().count("schema")>0 and \
            obj["schema"]=="http://schemas.opengis.net/kml/2.2.0/ogckml22.xsd":
        driverName = "KML"
        extension = [ ".kml" ]
    drv = osgeo.ogr.GetDriverByName( driverName )
    # Create virtual file 
    ds = drv.CreateDataSource( "/vsimem/store"+conf["lenv"]["sid"]+extension[0] )
    lyr = ds.CreateLayer( "Result", None, osgeo.ogr.wkbUnknown )
    i=0
    while i < len(geom):
        hasFid0=False
        fid0I=-1
        if i==0 and driverName!="GeoJSON":
            poDstFDefn=geom[i].GetDefnRef()
            if poDstFDefn is not None:
                nDstFieldCount = poDstFDefn.GetFieldCount()
                j=0
                for iField in range(nDstFieldCount):
                    poSrcFieldDefn = poDstFDefn.GetFieldDefn(iField)
                    if poSrcFieldDefn.GetNameRef()=="fid0":
                        hasFid0=True
                        fid0I=j
                    oFieldDefn = osgeo.ogr.FieldDefn(poSrcFieldDefn.GetNameRef(),poSrcFieldDefn.GetType())
                    oFieldDefn.SetWidth( poSrcFieldDefn.GetWidth() )
                    oFieldDefn.SetPrecision( poSrcFieldDefn.GetPrecision() )
                    lyr.CreateField( oFieldDefn )
                    j+=1
        #if hasFid0:
        #    geom[i].setFid(geom[i].get)
        lyr.CreateFeature(geom[i].Clone())
        geom[i].Destroy()
        i+=1
    ds.Destroy()
    vsiFile=osgeo.gdal.VSIFOpenL("/vsimem/store"+conf["lenv"]["sid"]+extension[0],"r")
    i=0
    while osgeo.gdal.VSIFSeekL(vsiFile,0,os.SEEK_END)>0:
        i+=1
    fileSize=osgeo.gdal.VSIFTellL(vsiFile)
    osgeo.gdal.VSIFSeekL(vsiFile,0,os.SEEK_SET)
    obj["value"]=osgeo.gdal.VSIFReadL(fileSize,1,vsiFile)
    osgeo.gdal.Unlink("/vsimem/store"+conf["lenv"]["sid"]+extension[0])

def orderPoiAlongLine(conf,inputs,outputs):
    import shapely
    from shapely.geometry import LineString, Point
    #spoint=extractInputs(conf,inputs["spoint"])
    #spoint0=inputs["spoint"]["value"].split(",")
    #spoint=Point(float(spoint0[0]),float(spoint0[1]))
    #epoint0=inputs["epoint"]["value"].split(",")
    #epoint=Point(float(epoint0[0]),float(epoint0[1]))
    #line=LineString([(float(spoint0[0]),float(spoint0[1])),(float(epoint0[0]),float(epoint0[1]))])
    points=extractInputs(conf,inputs["points"])
    pointd=[]
    inputs2=inputs
    inputs2["InputEntity"]=inputs["line"]
    UnionOneGeom(conf,inputs2,outputs)
    line=extractInputs(conf,outputs["Result"])
    linef=shapely.wkt.loads(line[0].GetGeometryRef().ExportToWkt())
    for i in range(0,len(points)):
        tmp=shapely.wkt.loads(points[i].GetGeometryRef().ExportToWkt())
        tmpp=points[i].Clone()
        tmpv=linef.project(tmp)
        pointd+=[[tmpv,points[i]]]
    pointd.sort(key=lambda x: x[0])
    rgeometries=[]
    for i in range(0,len(pointd)):
        rgeometries+=[pointd[i][1].Clone()]
    outputResult(conf,outputs["Result"],rgeometries)
    return zoo.SERVICE_SUCCEEDED

def orderedIntersection(conf,inputs,outputs):
    #print >> sys.stderr,"START !!"
    Intersection(conf,inputs,outputs)
    inputs2=inputs
    inputs2["points"]=outputs["Result"]
    return orderPoiAlongLine(conf,inputs,outputs)

def demo(conf,inputs,outputs):
    outputs["Result"]["value"]=inputs["InputData"]["value"]
    outputs["Result"]["mimeType"]=inputs["InputData"]["mimeType"]
    return zoo.SERVICE_SUCCEEDED

def access(conf,inputs,outputs):
    print >> sys.stderr,str(inputs);
    osgeo.gdal.FileFromMemBuffer('/vsimem//temp1',inputs["InputData"]["value"])
    ds = osgeo.ogr.Open('/vsimem//temp1')
    print >> sys.stderr,ds
    displayCnt=0
    geometry=[]
    if inputs["sql"].keys().count("value")>0:
        lyr=ds.ExecuteSQL( inputs["sql"]["value"], None, None )
        cnt=lyr.GetFeatureCount()
        print >> sys.stderr,dir(lyr)
        if cnt>0:
            if cnt==1:
                feat=lyr.GetNextFeature()
                if feat is not None:
                    geometry+=[feat.Clone()]
            else:
                for i in range(int(inputs["offset"]["value"]),int(inputs["offset"]["value"])+int(inputs["limit"]["value"])):
                    if i < cnt:
                        feat=lyr.GetFeature(i)
                        if feat is not None:
                            geometry+=[feat.Clone()]
    else:
        lyr = ds.GetLayer(0)
        cnt=lyr.GetFeatureCount()
        if cnt>0:
            for i in range(int(inputs["offset"]["value"]),int(inputs["offset"]["value"])+int(inputs["limit"]["value"])):
                if i < cnt:
                    feat=lyr.GetFeature(i)
                    if feat is not None:
                        geometry+=[feat.Clone()]
    #cnt=lyr.GetFeatureCount()
    outputs["Count"]["value"]=str(cnt)
    ds.Destroy()
    osgeo.gdal.Unlink('/vsimem//temp1')
    outputResult(conf,outputs["Result"],geometry)
    return zoo.SERVICE_SUCCEEDED


def BufferPy(conf,inputs,outputs):
    return Buffer(conf,inputs,outputs)

def Buffer(conf,inputs,outputs):
    #print >> sys.stderr, "Starting service ..."
    try:
        bdist=float(inputs["BufferDistance"]["value"])
    except:
        bdist=1
    #print >> sys.stderr, bdist
    #print >> sys.stderr, inputs["InputPolygon"]
    geometry=extractInputs(conf,inputs["InputPolygon"])
    i=0
    rgeometries=[]
    while i < len(geometry):
        tmp=geometry[i].Clone()
        resg=geometry[i].GetGeometryRef().Buffer(bdist)
        tmp.SetGeometryDirectly(resg)
        rgeometries+=[tmp]
        geometry[i].Destroy()
        resg.thisown=False 
        tmp.thisown=False
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    i=0
    return zoo.SERVICE_SUCCEEDED

def BoundaryPy(conf,inputs,outputs):
    geometry=extractInputs(conf,inputs["InputPolygon"])
    i=0
    rgeometries=[]
    while i < len(geometry):
        tmp=geometry[i].Clone()
        resg=geometry[i].GetGeometryRef()
        resg=resg.GetBoundary()
        tmp.SetGeometryDirectly(resg)
        rgeometries+=[tmp]
        geometry[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return zoo.SERVICE_SUCCEEDED

def PointOnSurface(conf,inputs,outputs):
    geometry=extractInputs(conf,inputs["InputPolygon"])
    i=0
    rgeometries=[]
    while i < len(geometry):
        tmp=geometry[i].Clone()
        resg=geometry[i].GetGeometryRef()
        if resg.GetGeometryType()!=3:
            resg=resg.ConvexHull()
        resg0=resg.PointOnSurface()
        #print >> sys.stderr,"GEO "+str(resg.ExportToWkt())
        if resg0 is None:
            resg0=resg.Centroid()
        tmp.SetGeometryDirectly(resg0)
        rgeometries+=[tmp]
        geometry[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return zoo.SERVICE_SUCCEEDED

def CentroidPy(conf,inputs,outputs):
    geometry=extractInputs(conf,inputs["InputPolygon"])
    i=0
    rgeometries=[]
    while i < len(geometry):
        tmp=geometry[i].Clone()
        resg=geometry[i].GetGeometryRef()
        if resg.GetGeometryType()!=3:
            resg=resg.ConvexHull()
        resg0=resg.Centroid()
        tmp.SetGeometryDirectly(resg0)
        rgeometries+=[tmp]
        geometry[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return zoo.SERVICE_SUCCEEDED

def CentroidPy1(conf,inputs,outputs):
    geometry=extractInputs(conf,inputs["InputPolygon"])
    i=0
    rgeometries=[]
    while i < len(geometry):
        tmp=geometry[i].Clone()
        resg=geometry[i].GetGeometryRef()
        if resg.GetGeometryType()!=3:
            resg=resg.ConvexHull()
        print >> sys.stderr,str(resg)
        resg=resg.Centroid()
        if tmp.GetGeometryRef().Intesects(resg):
            tmp.SetGeometryDirectly(resg)
        else:
            resg=geometry[i].GetGeometryRef()
            print >> sys.stderr,str(resg.PointOnSurface())
            resg=resg.PointOnSurface()
            print >> sys.stderr,str(resg)
            tmp.SetGeometryDirectly(resg)
        rgeometries+=[tmp]
        geometry[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return zoo.SERVICE_SUCCEEDED

def ConvexHullPy(conf,inputs,outputs):
    geometry=extractInputs(conf,inputs["InputPolygon"])
    i=0
    rgeometries=[]
    while i < len(geometry):
        tmp=geometry[i].Clone()
        resg=geometry[i].GetGeometryRef().ConvexHull()
        tmp.SetGeometryDirectly(resg)
        rgeometries+=[tmp]
        geometry[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return zoo.SERVICE_SUCCEEDED



def EnvelopePy(conf,inputs,outputs):
    #print >> sys.stderr, inputs
    try:
        bdist=float(inputs["BufferDistance"]["value"])
    except:
        bdist=10
    geometry=extractInputs(conf,inputs["InputPolygon"])
    tmp=geometry[0].GetGeometryRef().GetEnvelope()
    outputs["Result"]["value"]=str(tmp[0])+','+str(tmp[2])+','+str(tmp[1])+','+str(tmp[3])+','+'urn:ogc:def:crs:OGC:1.3:CRS84'
    #print >> sys.stderr,outputs["Result"]
    return 3

def UnionPy(conf,inputs,outputs):
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    geometry2=extractInputs(conf,inputs["InputEntity2"])
    rgeometries=[]
    i=0
    while i < len(geometry1):
        j=0
        while j < len(geometry2):
            tres=geometry1[i].Union(geometry2[j])
            if not(tres.IsEmpty()):
                rgeometries+=[tres]
            j+=1
        geometry1[i].Destroy()
        i+=1
    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return 3

def BufferUnion(conf,inputs,outputs):
    #print >> sys.stderr,"OK 0"
    Buffer(conf,inputs,outputs)
    #print >> sys.stderr,"OK 1"
    inputs1={
        "InputEntity": {
            "value": outputs["Result"]["value"],
            "mimeType": "application/json"
            }
        }
    #print >> sys.stderr,"OK 2"
    UnionOne(conf,inputs1,outputs)
    #print >> sys.stderr,"OK 3"
    return zoo.SERVICE_SUCCEEDED

def UnionOne(conf,inputs,outputs):
    import sys
    #print >> sys.stderr,"DEBG"
    geometry1=extractInputs(conf,inputs["InputEntity"])
    #print >> sys.stderr,"DEUBG"
    i=0
    geometryRes=None
    #print >> sys.stderr,"DEUBG"
    while i < len(geometry1):
        j=0
        if i==0:
            geometryRes=geometry1[i].Clone()
        else:
            tres=geometryRes.GetGeometryRef().Union(geometry1[i].GetGeometryRef())
            if not(tres.IsEmpty()):
                geometryRes.SetGeometryDirectly(tres.Clone())
                tres.Destroy()
        geometry1[i].Destroy()
        i+=1
    outputs["Result"]["value"]=geometryRes.ExportToJson()
    #outputResult(conf,outputs["Result"],rgeometries)
    return 3

def UnionOneBis(conf,inputs):
    import sys
    #print >> sys.stderr,"DEBG"
    geometry1=extractInputs(conf,inputs["InputEntity"])
    #print >> sys.stderr,"DEUBG"
    i=0
    geometryRes=None
    #print >> sys.stderr,"DEUBG"
    while i < len(geometry1):
        j=0
        if i==0:
            geometryRes=geometry1[i].Clone()
        else:
            tres=geometryRes.GetGeometryRef().Union(geometry1[i].GetGeometryRef())
        geometry1[i].Destroy()
        i+=1
    if not(tres.IsEmpty()):
        geometryRes.SetGeometryDirectly(tres.Clone())
        tres.Destroy()
    #outputs["Result"]["value"]=geometryRes.ExportToJson()
    #outputResult(conf,outputs["Result"],rgeometries)
    return geometryRes

points=[]

class Classifier:
    def __init__(self,origin):
        self.cnt=0
        self.origin=origin

    def getClass(self,x):
        #print >> sys.stderr,self.origin[self.cnt]
        if x[0]==self.origin[self.cnt][0] and x[1]==self.origin[self.cnt][1]:
            return 0
        #print >> sys.stderr,x
        geometryRes=osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
        geometryRes.AddPoint_2D(x[0],x[1])
        geometryResO=osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
        geometryResO.AddPoint_2D(self.origin[self.cnt][0],self.origin[self.cnt][1])
        val=geometryResO.Distance(geometryRes)
        self.cnt+=1
        #print >> sys.stderr,self.cnt
        #print >> sys.stderr,val
        return val

def UnionOneGeom(conf,inputs,outputs):
    import sys
    import shapely
    import shapely.wkt
    geometry1=extractInputs(conf,inputs["InputEntity"])
    i=0
    geometryRes=osgeo.ogr.Geometry(osgeo.ogr.wkbLineString)
    points=[]
    origin=[]
    while i < len(geometry1):
        j=0
        tmp=geometry1[i].GetGeometryRef()
        line=shapely.wkt.loads(tmp.ExportToWkt())
        tpoints=tmp.GetPoints()
        if tpoints is not None:
            if i==0:
                end0=tmp.GetPoint(tmp.GetPointCount()-1)
                #print >> sys.stderr,"END 0 "+str(end0)
                end0G=osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                end0G.AddPoint_2D(end0[0],end0[1])
            else:
                start=tmp.GetPoint(0)
                end=tmp.GetPoint(tmp.GetPointCount()-1)
                #print >> sys.stderr,"START "+str(start)
                #print >> sys.stderr,"END "+str(end)
                #print >> sys.stderr,"END "+str(end)
                #print >> sys.stderr,"LINE "+str(tpoints)
                startG=osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                startG.AddPoint_2D(start[0],start[1])
                endG=osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                endG.AddPoint_2D(end[0],end[1])
                if end0G.Distance(startG)< end0G.Distance(endG):
                    tpoints.sort(key=lambda x: line.project(shapely.wkt.loads('POINT('+str(x[0])+' '+str(x[1])+')')))
                else:
                    dist=line.project(shapely.wkt.loads(endG.ExportToWkt()))
                    #print >> sys.stderr,endG.ExportToWkt()
                    tpoints.sort(key=lambda x: dist-line.project(shapely.wkt.loads('POINT('+str(x[0])+' '+str(x[1])+')')))
                end0G=endG
            points+=tpoints
            geometry1[i].Destroy()
        i+=1
    cnt=0
    c=Classifier(origin)
    #points.sort(key=lambda x: c.getClass(x))
    for a in points:
        geometryRes.AddPoint(a[0],a[1])
    outputs["Result"]["value"]=geometryRes.ExportToJson()
    return 3

def Intersection(conf,inputs,outputs):

    print >> sys.stderr, "Starting service ..."
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    #print >> sys.stderr, "Starting 1 ... "+inputs["InputEntity1"]["mimeType"]
    geometry2=extractInputs(conf,inputs["InputEntity2"])
    #print >> sys.stderr, "Starting 2 ... "+inputs["InputEntity2"]["mimeType"]

    #print >> sys.stderr,str(len(geometry1))+" "+str(len(geometry2))

    rgeometries=[]
    fids=[]
    i=0
    while i < len(geometry1):
        j=0
        while j < len(geometry2):
            tmp=geometry2[j].Clone()
            resg=geometry2[j].GetGeometryRef()
            #resg=resg.Intersection(geometry1[i].GetGeometryRef())
            resg=geometry1[i].GetGeometryRef().Intersection(resg)
            tmp.SetGeometryDirectly(resg)
            #print >> sys.stderr, dir(tmp)
            if resg is not None and not(resg.IsEmpty()) and fids.count(tmp.GetFID())==0:
                rgeometries+=[tmp]
                fids+=[tmp.GetFID()]
            else:
                tmp.Destroy()
            j+=1
        geometry1[i].Destroy()
        i+=1
    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return 3

def IntersectionPy(conf,inputs,outputs):
    return Intersection(conf,inputs,outputs)

def Intersection0(conf,inputs,outputs):

    print >> sys.stderr, "Starting service ..."
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    #print >> sys.stderr, "Starting 1 ... "+inputs["InputEntity1"]["mimeType"]
    geometry2=extractInputs(conf,inputs["InputEntity2"],"select gml_id as fid0,* ")
    #print >> sys.stderr, "Starting 2 ... "+inputs["InputEntity2"]["mimeType"]

    if inputs.has_key("InputEntity3") and inputs["InputEntity3"]["value"]:
        geometry3=extractInputs(conf,inputs["InputEntity3"])

    #print >> sys.stderr,str(len(geometry1))+" "+str(len(geometry2))

    rgeometries=[]
    fids=[]
    i=0
    while i < len(geometry1):
        j=0
        while j < len(geometry2):
            tmp=geometry2[j].Clone()
            resg=geometry2[j].GetGeometryRef()
            #resg=resg.Intersection(geometry1[i].GetGeometryRef())
            #resg=geometry1[i].GetGeometryRef().Intersection(resg)
            #tmp.SetGeometryDirectly(resg)
            #print >> sys.stderr, dir(tmp)
            #print >> sys.stderr,dir(resg)
            if geometry1[i].GetGeometryRef().Intersects(resg):
                if inputs.has_key("InputEntity3") and inputs["InputEntity3"]["value"]:
                    k=0
                    hasVal=False
                    while k < len(geometry3):
                        #resg=geometry3[k].GetGeometryRef().Intersection(resg)
                        #print >> sys.stderr,"*******\n"+str(resg.GetGeometryType())
                        #print >> sys.stderr,geometry3[k].GetGeometryRef().Intersects(resg)
                        if geometry3[k].GetGeometryRef().Equals(resg):
                            hasVal=True
                            break
                        k+=1
                    if not(hasVal):
                        rgeometries+=[tmp]
                        fids+=[tmp.GetFID()]
                else:
                #print >> sys.stderr,dir(resg)
                #tmp.SetGeometryDirectly(resg.Empty())
                    rgeometries+=[tmp]
                    fids+=[tmp.GetFID()]
            else:
                tmp.Destroy()
            j+=1
        geometry1[i].Destroy()
        i+=1
    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1

    if len(rgeometries)==0:
        conf["lenv"]["message"]=zoo._("No feature found !")
        return zoo.SERVICE_FAILED
    
    outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return zoo.SERVICE_SUCCEEDED

def nullGeo(conf,inputs,outputs):

    print >> sys.stderr, "Starting service ..."
    for i in inputs["InputEntity1"]:
        if i!="value":
            print >> sys.stderr, i+" "+inputs["InputEntity1"][i]
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    rgeometries=[]
    fids=[]
    i=0
    
    while i < len(geometry1):
        tmp=geometry1[i].Clone()
        resg=geometry1[i].GetGeometryRef()
        tmp.SetGeometryDirectly(resg.Empty())
        rgeometries+=[tmp]
        fids+=[tmp.GetFID()]
        geometry1[i].Destroy()
        i+=1
    i=0

    if inputs.has_key("InputEntity2") and inputs["InputEntity2"]["value"]:
        geometry2=extractInputs(conf,inputs["InputEntity2"])
        while i < len(geometry2):
            tmp=geometry2[i].Clone()
            resg=geometry2[i].GetGeometryRef()
            tmp.SetGeometryDirectly(resg.Empty())
            rgeometries+=[tmp]
            fids+=[tmp.GetFID()]
            geometry2[i].Destroy()
            i+=1

    outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return 3

def getFeaturesCopy(conf,inputs,outputs):

    print >> sys.stderr, "Starting service ..."
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    rgeometries=[]
    fids=[]
    i=0
    if inputs.has_key("InputEntity2") and inputs["InputEntity2"]["value"]:
        geometry2=extractInputs(conf,inputs["InputEntity2"])

    while i < len(geometry1):
        tmp=geometry1[i].Clone()
        rgeometries+=[tmp]
        geometry1[i].Destroy()
        i+=1

    outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return 3

def Append(conf,inputs,outputs):

    print >> sys.stderr, "Starting service ..."
    geometry1=extractInputs(conf,inputs["InputEntity1"])

    rgeometries=[]
    fids=[]
    i=0
    
    while i < len(geometry1):
        tmp=geometry1[i].Clone()
        rgeometries+=[tmp]
        fids+=[tmp.GetFID()]
        geometry1[i].Destroy()
        i+=1
    i=0
    if inputs.has_key("InputEntity2") and inputs["InputEntity2"]["value"]!="NULL":
        geometry2=extractInputs(conf,inputs["InputEntity2"])
        while i < len(geometry2):
            tmp=geometry2[i].Clone()
            rgeometries+=[tmp]
            fids+=[tmp.GetFID()]
            geometry2[i].Destroy()
            i+=1


    if len(rgeometries)==0:
        conf["lenv"]["message"]="No feature found !"
        return zoo.SERVICE_FAILED
    outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return zoo.SERVICE_SUCCEEDED

def Remove(conf,inputs,outputs):
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    geometry2=extractInputs(conf,inputs["InputEntity2"])

    rgeometries=[]
    fids=[]
    i=0
    
    while i < len(geometry1):
        tmp=geometry1[i].Clone()
        j=len(geometry2)-1
        noDisplay=False
        while j >=0 :
            tmp0=geometry2[j].Clone()
            if tmp0.GetGeometryRef().Equals(tmp.GetGeometryRef()):
                noDisplay=True
                j=0
                #break
            j-=1
            tmp0.Destroy()
        print >> sys.stderr,noDisplay
        if not(noDisplay):
            rgeometries+=[tmp.Clone()]
        
        tmp.Destroy()
        i+=1

    i=0
    while i < len(geometry1):
        geometry1[i].Destroy()
        i+=1

    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1

    if len(rgeometries)==0:
        conf["lenv"]["message"]="No feature found"
        print >> sys.stderr,"/outputResult exception"
        return zoo.SERVICE_FAILED
    outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return zoo.SERVICE_SUCCEEDED

def DifferencePy(conf,inputs,outputs):
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    geometry2=extractInputs(conf,inputs["InputEntity2"])
    rgeometries=[]
    i=0
    while i < len(geometry1):
        j=0
        while j < len(geometry2):
            tmp=geometry2[j].Clone()
            resg=geometry1[i].GetGeometryRef()
            resg=resg.Difference(geometry2[i].GetGeometryRef())
            tmp.SetGeometryDirectly(resg)
            if not(resg.IsEmpty()):
                rgeometries+=[tmp]
            j+=1
        geometry1[i].Destroy()
        i+=1
    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return 3

def SymDifferencePy(conf,inputs,outputs):
    #print >> sys.stderr,inputs
    geometry1=extractInputs(conf,inputs["InputEntity1"])
    #geometry2=extractInputs(conf,inputs["InputEntity2"])
    outputs1={"Result":{"mimeType":"application/json"}}
    res=UnionOneGeom(conf,{"InputEntity":inputs["InputEntity2"]})
    rgeometries=[]
    i=0
    while i < len(geometry1):
        j=0
        while j < len(geometry2):
            tmp=geometry2[j].Clone()
            resg=geometry1[i].GetGeometryRef()
            resg=resg.SymmetricDifference(geometry2[i].GetGeometryRef())
            tmp.SetGeometryDirectly(resg)
            rgeometries+=[tmp]
            j+=1
        geometry1[i].Destroy()
        i+=1
    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1
    outputResult(conf,outputs["Result"],rgeometries)
    return 3

def CreateRegularGrid(conf,inputs,outputs):
    ext=inputs["extent"]["value"].split(",")
    query="SELECT ST_AsGeoJSON(geom) AS geomWKT FROM ST_RegularGrid(ST_Transform(ST_SetSRID(ST_GeomFromText('LINESTRING("+ext[0]+" "+ext[1]+", -"+ext[2]+" "+ext[3]+")',0),3857),32628),1,100,100,false);"
    import authenticate.service as auth
    con=auth.getCon(conf)
    con.connect()
    cur=con.conn.cursor()
    res=cur.execute(query)
    return zoo.SERVICE_SUCCEEDEED
