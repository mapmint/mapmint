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
import lxml
import os
import sys
import zoo

layerName = None

try:
    from osgeo import ogr, osr, gdal
except:
    sys.exit('ERROR: cannot find GDAL/OGR modules')


# example GDAL error handler function
class GdalErrorHandler(object):
    def __init__(self):
        self.err_level = gdal.CE_None
        self.err_no = 0
        self.err_msg = ''

    def setConf(self, obj):
        self.conf = obj

    def handler(self, err_level, err_no, err_msg):
        self.err_level = err_level
        self.err_no = err_no
        self.conf["lenv"]["message"] = err_msg
        self.err_msg = err_msg


def gdal_error_handler(err_class, err_num, err_msg):
    errtype = {
        gdal.CE_None: 'None',
        gdal.CE_Debug: 'Debug',
        gdal.CE_Warning: 'Warning',
        gdal.CE_Failure: 'Failure',
        gdal.CE_Fatal: 'Fatal'
    }
    err_msg = err_msg.replace('\n', ' ')
    err_class = errtype.get(err_class, 'None')
    #msg='Error Number: %s' % (str(err_num))


def test(conf, inputs, outputs):
    conf["lenv"]["message"] = "Error message"
    return zoo.SERVICE_FAILED


def readFileFromBuffer(data, ext, sql=None):
    try:
        geometry = []
        osgeo.gdal.FileFromMemBuffer('/vsimem//temp1' + ext, data)
        ds = osgeo.ogr.Open('/vsimem//temp1' + ext)
        if sql is not None:
            if sql.count("from") == 0:
                layerName = ds.GetLayerByIndex(0).GetName()
                sql += " from " + layerName
            lyr = ds.ExecuteSQL(sql, dialect="spatialite")
            zoo.info(str(lyr))
        else:
            lyr = ds.GetLayer(0)
            zoo.info(str(lyr))
        zoo.info(lyr.GetFeatureCount())
        feat = lyr.GetNextFeature()
        while feat is not None:
            geometry += [feat.Clone()]
            feat.Destroy()
            feat = lyr.GetNextFeature()
        ds.Destroy()
        osgeo.gdal.Unlink('/vsimem//temp1' + ext)
        return geometry
    except Exception as e:
        return []


def buildFeatureFromGeomtry(conf, geom, driverName, ext):
    drv = osgeo.ogr.GetDriverByName(driverName)
    ds = drv.CreateDataSource("/vsimem//store" + conf["lenv"]["sid"] + "0." + ext)
    lyr = ds.CreateLayer("Result", None, osgeo.ogr.wkbUnknown)
    field_defn = osgeo.ogr.FieldDefn("Name", osgeo.ogr.OFTString)
    field_defn.SetWidth(len("Result10000"))
    lyr.CreateField(field_defn)
    feat = osgeo.ogr.Feature(lyr.GetLayerDefn())
    feat.SetField("Name", "Input0")
    feat.SetGeometry(geom)
    lyr.CreateFeature(feat)
    ds.Destroy()
    return [feat]


def createGeometryFromWFS(conf, my_wfs_response, sql=None):
    try:
        geom = osgeo.ogr.CreateGeometryFromGML(my_wfs_response.replace('<?xml version="1.0" encoding="utf-8"?>\n', '').replace('<?xml version="1.0" encoding="utf-8"?>', ''))
    except:
        geom = None
    try:
        if geom is None:
            if not ("cnt" in conf["lenv"]):
                conf["lenv"]["cnt"] = 0
            else:
                conf["lenv"]["cnt"] += 1
            return readFileFromBuffer(my_wfs_response, str(conf["lenv"]["cnt"]), sql)
        else:
            return buildFeatureFromGeomtry(conf, geom, "GML", "xml")
    except:
        zoo.error("Unable to load file input data !!!\n\n\n")


def createLayerFromJson(conf, obj, sql=None):
    geom = osgeo.ogr.CreateGeometryFromJson(obj)
    if geom is None:
        return readFileFromBuffer(obj, ".json", sql)
    else:
        return buildFeatureFromGeomtry(conf, geom, "GeoJSON", "json")


def extractInputs(conf, obj, sql=None):
    # TODO: confirm assumption: "obj" is a Python 3 dictionary object
    # if list(obj.keys()).count("cache_file"):
    if "cache_file" in obj:
        zoo.info(str(obj))
        geometry = []
        ds = osgeo.ogr.Open(obj["cache_file"])
        if sql is not None:
            if sql.count("from") == 0:
                layerName = ds.GetLayerByIndex(0).GetName()
                sql += " from " + layerName
            lyr = ds.ExecuteSQL(sql, dialect="spatialite")
        else:
            lyr = ds.GetLayer(0)
        feat = lyr.GetNextFeature()
        while feat is not None:
            geometry += [feat.Clone()]
            feat.Destroy()
            feat = lyr.GetNextFeature()
        ds.Destroy()
        return geometry
    if obj["mimeType"] == "application/json":
        return createLayerFromJson(conf, obj["value"], sql)
    else:
        return createGeometryFromWFS(conf, obj["value"], sql)


def outputResult(conf, obj, geom):
    driverName = "GML"
    extension = [".xml", ".xsd"]
    if obj["mimeType"] == "application/json":
        driverName = "GeoJSON"
        extension = [".js"]
    # TODO: confirm assumption: "obj" is a Python 3 dictionary object
    # if list(obj.keys()).count("schema") > 0 and \
    if "schema" in obj and \
            obj["schema"] == "http://schemas.opengis.net/kml/2.2.0/ogckml22.xsd":
        driverName = "KML"
        extension = [".kml"]
    drv = osgeo.ogr.GetDriverByName(driverName)
    # Create virtual file
    ds = drv.CreateDataSource("/vsimem/store" + conf["lenv"]["sid"] + extension[0])
    lyr = ds.CreateLayer("Result", None, osgeo.ogr.wkbUnknown)
    i = 0
    while i < len(geom):
        hasFid0 = False
        fid0I = -1
        if i == 0 and driverName != "GeoJSON":
            poDstFDefn = geom[i].GetDefnRef()
            if poDstFDefn is not None:
                nDstFieldCount = poDstFDefn.GetFieldCount()
                j = 0
                for iField in range(nDstFieldCount):
                    poSrcFieldDefn = poDstFDefn.GetFieldDefn(iField)
                    if True or poSrcFieldDefn.GetNameRef() != "gml_id":
                        if poSrcFieldDefn.GetNameRef() == "fid0":
                            hasFid0 = True
                            fid0I = j
                        oFieldDefn = osgeo.ogr.FieldDefn(poSrcFieldDefn.GetNameRef(), poSrcFieldDefn.GetType())
                        oFieldDefn.SetWidth(poSrcFieldDefn.GetWidth())
                        oFieldDefn.SetPrecision(poSrcFieldDefn.GetPrecision())
                        lyr.CreateField(oFieldDefn)
                        j += 1
        # if hasFid0:
        #    geom[i].setFid(geom[i].get)
        lyr.CreateFeature(geom[i].Clone())
        geom[i].Destroy()
        i += 1
    ds.Destroy()
    vsiFile = osgeo.gdal.VSIFOpenL("/vsimem/store" + conf["lenv"]["sid"] + extension[0], "r")
    i = 0
    while osgeo.gdal.VSIFSeekL(vsiFile, 0, os.SEEK_END) > 0:
        i += 1
    fileSize = osgeo.gdal.VSIFTellL(vsiFile)
    osgeo.gdal.VSIFSeekL(vsiFile, 0, os.SEEK_SET)
    obj["value"] = osgeo.gdal.VSIFReadL(fileSize, 1, vsiFile)
    osgeo.gdal.Unlink("/vsimem/store" + conf["lenv"]["sid"] + extension[0])


def orderPoiAlongLine(conf, inputs, outputs):
    import shapely
    from shapely.geometry import LineString, Point
    # spoint=extractInputs(conf,inputs["spoint"])
    # spoint0=inputs["spoint"]["value"].split(",")
    # spoint=Point(float(spoint0[0]),float(spoint0[1]))
    # epoint0=inputs["epoint"]["value"].split(",")
    # epoint=Point(float(epoint0[0]),float(epoint0[1]))
    # line=LineString([(float(spoint0[0]),float(spoint0[1])),(float(epoint0[0]),float(epoint0[1]))])
    points = extractInputs(conf, inputs["points"])
    pointd = []
    inputs2 = inputs
    inputs2["InputEntity"] = inputs["line"]
    UnionOneGeom(conf, inputs2, outputs)
    line = extractInputs(conf, outputs["Result"])
    linef = shapely.wkt.loads(line[0].GetGeometryRef().ExportToWkt())
    for i in range(0, len(points)):
        tmp = shapely.wkt.loads(points[i].GetGeometryRef().ExportToWkt())
        tmpp = points[i].Clone()
        tmpv = linef.project(tmp)
        pointd += [[tmpv, points[i]]]
    pointd.sort(key=lambda x: x[0])
    rgeometries = []
    for i in range(0, len(pointd)):
        rgeometries += [pointd[i][1].Clone()]
    outputResult(conf, outputs["Result"], rgeometries)
    return zoo.SERVICE_SUCCEEDED


def orderedIntersection(conf, inputs, outputs):
    Intersection(conf, inputs, outputs)
    inputs2 = inputs
    inputs2["points"] = outputs["Result"]
    return orderPoiAlongLine(conf, inputs, outputs)


def demo(conf, inputs, outputs):
    outputs["Result"]["value"] = inputs["InputData"]["value"]
    outputs["Result"]["mimeType"] = inputs["InputData"]["mimeType"]
    return zoo.SERVICE_SUCCEEDED


def access(conf, inputs, outputs):
    osgeo.gdal.FileFromMemBuffer('/vsimem//temp1', inputs["InputData"]["value"])
    ds = osgeo.ogr.Open('/vsimem//temp1')
    zoo.info(str(ds))
    if ds is None:
        ds = osgeo.ogr.Open(inputs["InputData"]["cache_file"])
    displayCnt = 0
    geometry = []
    sqlResults = []
    # TODO: confirm assumption: inputs["sql"] is a Python 3 dictionary object
    # if list(inputs["sql"].keys()).count("value") > 0:
    if "value" in inputs["sql"]:
        lyr = ds.ExecuteSQL(inputs["sql"]["value"], None, 'SQLITE')
        if lyr is None:
            conf["lenv"]["message"] = zoo._("Unable to execute your request: " + inputs["sql"]["value"])
            cnt = 0
            # return zoo.SERVICE_FAILED
        else:
            cnt = lyr.GetFeatureCount()
            for a in range(0, cnt):
                if int(inputs["offset"]["value"]) + int(inputs["limit"]["value"]) > a:
                    tfeat = lyr.GetNextFeature()
                if int(inputs["offset"]["value"]) + int(inputs["limit"]["value"]) > a and a >= int(inputs["offset"]["value"]):
                    # lyr.FindFieldIndex(lyr.GetFIDColumn())
                    sqlResults += [tfeat.GetFID()]
        zoo.info(dir(lyr))
        if cnt > 0:
            if cnt == 1:
                # feat=lyr.GetNextFeature()
                # feat=sqlResults[0]
                feat = lyr.GetFeature(sqlResults[0])
                if feat is not None:
                    geometry += [feat.Clone()]
            else:
                ci = 0
                for i in range(int(inputs["offset"]["value"]), int(inputs["offset"]["value"]) + int(inputs["limit"]["value"])):
                    if i < cnt:
                        # feat=lyr.GetNextFeature()
                        # feat=sqlResults[i]
                        zoo.info(" ***** DEBUG " + str(i) + " [" + str(sqlResults[ci]) + "]")
                        feat = lyr.GetFeature(sqlResults[ci])
                        ci += 1
                        if feat is not None:
                            geometry += [feat.Clone()]
    else:
        lyr = ds.GetLayer(0)
        cnt = lyr.GetFeatureCount()
        if cnt > 0:
            for i in range(int(inputs["offset"]["value"]), int(inputs["offset"]["value"]) + int(inputs["limit"]["value"])):
                if i < cnt:
                    feat = lyr.GetFeature(i)
                    if feat is not None:
                        geometry += [feat.Clone()]
    # cnt=lyr.GetFeatureCount()
    outputs["Count"]["value"] = str(cnt)
    ds.Destroy()
    osgeo.gdal.Unlink('/vsimem//temp1')
    outputResult(conf, outputs["Result"], geometry)
    return zoo.SERVICE_SUCCEEDED


def BufferPy(conf, inputs, outputs):
    return Buffer(conf, inputs, outputs)


def Buffer(conf, inputs, outputs):
    try:
        bdist = float(inputs["BufferDistance"]["value"])
    except:
        bdist = 1
    geometry = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    rgeometries = []
    while i < len(geometry):
        conf["lenv"]["message"] = str(i) + " / " + str(len(geometry)) + " Run Buffer Operation .."
        try:
            zoo.update_status(conf, int((i * 100) / len(geometry)))
        except:
            zoo.error("ok")
        tmp = geometry[i].Clone()
        resg = geometry[i].GetGeometryRef().Buffer(bdist)
        tmp.SetGeometryDirectly(resg)
        rgeometries += [tmp]
        geometry[i].Destroy()
        # tmp.Destroy()
        # resg.thisown=False
        # tmp.thisown=False
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    # conf["lenv"]["message"]="Buffer Operation run successfully"
    # zoo.update_status(conf,100)
    i = 0
    return zoo.SERVICE_SUCCEEDED


def BoundaryPy(conf, inputs, outputs):
    geometry = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    rgeometries = []
    while i < len(geometry):
        tmp = geometry[i].Clone()
        resg = geometry[i].GetGeometryRef()
        resg = resg.GetBoundary()
        tmp.SetGeometryDirectly(resg)
        rgeometries += [tmp]
        geometry[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return zoo.SERVICE_SUCCEEDED


def PointOnSurface(conf, inputs, outputs):
    geometry = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    rgeometries = []
    while i < len(geometry):
        tmp = geometry[i].Clone()
        resg = geometry[i].GetGeometryRef()
        if resg.GetGeometryType() != 3:
            resg = resg.ConvexHull()
        resg0 = resg.PointOnSurface()
        if resg0 is None:
            resg0 = resg.Centroid()
        tmp.SetGeometryDirectly(resg0)
        rgeometries += [tmp]
        geometry[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return zoo.SERVICE_SUCCEEDED


def CentroidPy(conf, inputs, outputs):
    geometry = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    rgeometries = []
    while i < len(geometry):
        tmp = geometry[i].Clone()
        resg = geometry[i].GetGeometryRef()
        if resg.GetGeometryType() != 3:
            resg = resg.ConvexHull()
        resg0 = resg.Centroid()
        tmp.SetGeometryDirectly(resg0)
        rgeometries += [tmp]
        geometry[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return zoo.SERVICE_SUCCEEDED


def CentroidPy1(conf, inputs, outputs):
    geometry = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    rgeometries = []
    while i < len(geometry):
        tmp = geometry[i].Clone()
        resg = geometry[i].GetGeometryRef()
        if resg.GetGeometryType() != 3:
            resg = resg.ConvexHull()
        zoo.info(str(resg))
        resg = resg.Centroid()
        if tmp.GetGeometryRef().Intesects(resg):
            tmp.SetGeometryDirectly(resg)
        else:
            resg = geometry[i].GetGeometryRef()
            zoo.info(str(resg.PointOnSurface()))
            resg = resg.PointOnSurface()
            zoo.info(str(resg))
            tmp.SetGeometryDirectly(resg)
        rgeometries += [tmp]
        geometry[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return zoo.SERVICE_SUCCEEDED


def ConvexHullPy(conf, inputs, outputs):
    geometry = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    rgeometries = []
    while i < len(geometry):
        tmp = geometry[i].Clone()
        resg = geometry[i].GetGeometryRef().ConvexHull()
        tmp.SetGeometryDirectly(resg)
        rgeometries += [tmp]
        geometry[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return zoo.SERVICE_SUCCEEDED


def EnvelopePy(conf, inputs, outputs):
    try:
        bdist = float(inputs["BufferDistance"]["value"])
    except:
        bdist = 10
    geometry = extractInputs(conf, inputs["InputPolygon"])
    tmp = geometry[0].GetGeometryRef().GetEnvelope()
    outputs["Result"]["value"] = str(tmp[0]) + ',' + str(tmp[2]) + ',' + str(tmp[1]) + ',' + str(tmp[3]) + ',' + 'urn:ogc:def:crs:OGC:1.3:CRS84'
    return 3


def UnionPy(conf, inputs, outputs):
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    geometry2 = extractInputs(conf, inputs["InputEntity2"])
    rgeometries = []
    i = 0
    while i < len(geometry1):
        j = 0
        while j < len(geometry2):
            tres = geometry1[i].Union(geometry2[j])
            if not (tres.IsEmpty()):
                rgeometries += [tres]
            j += 1
        geometry1[i].Destroy()
        i += 1
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return 3


def BufferUnion(conf, inputs, outputs):
    Buffer(conf, inputs, outputs)
    inputs1 = {
        "InputEntity": {
            "value": outputs["Result"]["value"],
            "mimeType": "application/json"
        }
    }
    UnionOne(conf, inputs1, outputs)
    return zoo.SERVICE_SUCCEEDED


def UnionOne(conf, inputs, outputs):
    import sys
    geometry1 = extractInputs(conf, inputs["InputEntity"])
    i = 0
    geometryRes = None
    while i < len(geometry1):
        j = 0
        if i == 0:
            geometryRes = geometry1[i].Clone()
        else:
            tres = geometryRes.GetGeometryRef().Union(geometry1[i].GetGeometryRef())
            if not (tres.IsEmpty()):
                geometryRes.SetGeometryDirectly(tres.Clone())
                tres.Destroy()
        geometry1[i].Destroy()
        i += 1
    outputs["Result"]["value"] = geometryRes.ExportToJson()
    # outputResult(conf,outputs["Result"],rgeometries)
    return 3


def UnionOnePy(conf, inputs, outputs):
    import sys
    eHandler = GdalErrorHandler()
    eHandler.setConf(conf)
    gdal.PushErrorHandler(eHandler.handler)
    zoo.info("DEBG LOAD")
    geometry1 = extractInputs(conf, inputs["InputPolygon"])
    zoo.info("DEUBG / LOAD")
    i = 0
    geometryRes = None
    multi = osgeo.ogr.Geometry(osgeo.ogr.wkbMultiPolygon)
    geometryRes = [geometry1[0].Clone()]
    while i < len(geometry1):
        zoo.info(" STEP " + str(i))
        geom = geometry1[i].GetGeometryRef()
        if geom is not None and not (geom.IsValid()):
            zoo.info(" ******** STEP " + str(geom.IsValid()))
        if geom is not None and geom.GetGeometryType() == osgeo.ogr.wkbGeometryCollection or geom.GetGeometryType() == osgeo.ogr.wkbMultiPolygon:
            for kk in range(geom.GetGeometryCount()):
                zoo.info(" STEP 1 " + str(kk))
                multi.AddGeometry(validateGeom(geom.GetGeometryRef(kk)).Clone())
        else:
            multi.AddGeometry(validateGeom(geom).Clone())
        zoo.info("DEBG ISET")
        geometry1[i].Destroy()
        i += 1
    zoo.info("DEBG SET")
    geom = multi.UnionCascaded()
    try:
        geometryRes[0].SetGeometryDirectly(geom.Clone())
    except:
        conf["lenv"]["message"] = zoo._("Unable to make union of the given geometries")
        return zoo.SERVICE_FAILED
    zoo.error("DEBG / SET")
    # outputs["Result"]["value"]=geometryRes.ExportToJson()
    outputResult(conf, outputs["Result"], geometryRes)
    gdal.PopErrorHandler()
    return 3


def UnionOnePy1(conf, inputs, outputs):
    import sys
    zoo.info("DEBG LOAD")
    geometry1 = extractInputs(conf, inputs["InputPolygon"])
    zoo.info("DEUBG / LOAD")
    i = 0
    geometryRes = None
    multi = osgeo.ogr.Geometry(osgeo.ogr.wkbMultiPolygon)
    # for g in geometries:
    #
    # return multi.UnionCascaded()
    geometryRes = geometry1[0].Clone()
    while i < len(geometry1):
        zoo.info(" STEP " + str(i))
        geom = geometry1[i].GetGeometryRef()
        if geom is not None and not (geom.IsValid()):
            zoo.info(" ******** STEP " + str(geom.IsValid()))
        if geom is not None and geom.GetGeometryType() == osgeo.ogr.wkbGeometryCollection or geom.GetGeometryType() == osgeo.ogr.wkbMultiPolygon:
            multi1 = osgeo.ogr.Geometry(osgeo.ogr.wkbMultiPolygon)
            for kk in range(geom.GetGeometryCount()):
                zoo.info(" STEP 1 " + str(kk))
                multi1.AddGeometry(geom.GetGeometryRef(kk).Clone())
            if multi1 is not None and not (multi1.IsEmpty()):
                tmpGeom = multi1.UnionCascaded()
                if tmpGeom is not None:
                    zoo.info(" ******** STEP " + str(tmpGeom.IsValid()))
                if tmpGeom is not None and not (tmpGeom.IsEmpty()) and tmpGeom.IsValid():
                    geom = tmpGeom
                else:
                    geom = multi1
        zoo.info("DEBG ISET")
        if geom is not None:
            zoo.info(" STEP " + str(geom.IsValid()))
        multi.AddGeometry(validateGeom(geom).Clone())
        zoo.info("DEBG ISET")
        geometry1[i].Destroy()
        i += 1
    zoo.info("DEBG SET")
    geom = multi.UnionCascaded()
    geometryRes.SetGeometryDirectly(geom.Clone())
    zoo.info("DEBG / SET")
    outputs["Result"]["value"] = geometryRes.ExportToJson()
    # outputResult(conf,outputs["Result"],rgeometries)
    return 3


def UnionOnePy0(conf, inputs, outputs):
    import sys
    geometry1 = extractInputs(conf, inputs["InputPolygon"])
    i = 0
    geometryRes = None
    multi = osgeo.ogr.Geometry(osgeo.ogr.wkbMultiPolygon)
    # for g in geometries:
    #
    # return multi.UnionCascaded()
    geometryRes = geometry1[0].Clone()
    while i < len(geometry1):
        multi.AddGeometry(geometry1[i].GetGeometryRef())
        j = 0
        if i == 0:
            geometryRes = geometry1[i].Clone()
            geom = geometryRes.GetGeometryRef()
            if geom.GetGeometryType() == osgeo.ogr.wkbGeometryCollection or geom.GetGeometryType() == osgeo.ogr.wkbMultiPolygon:
                tmpGeom = geom.GetGeometryRef(0)
                for kk in range(1, geom.GetGeometryCount()):
                    tmp0 = validateGeom(tmpGeom).Union(validateGeom(geom.GetGeometryRef(kk)))
                    if tmp0 is not None and not (tmp0.IsEmpty()):
                        tmpGeom = validateGeom(tmp0).Clone()
                        tmp0.Destroy()
                if tmpGeom is not None and not (tmpGeom.IsEmpty()):
                    geom = tmpGeom
            geometryRes.SetGeometryDirectly(validateGeom(geom).Clone())
        else:
            geom = geometryRes.GetGeometryRef()
            tres = geom.Union(validateGeom(geometry1[i].GetGeometryRef()))
            if tres is not None and not (tres.IsEmpty()):
                if tres.GetGeometryType() == osgeo.ogr.wkbGeometryCollection or tres.GetGeometryType() == osgeo.ogr.wkbMultiPolygon:
                    tmpGeom = tres.GetGeometryRef(0)
                    for kk in range(1, tres.GetGeometryCount()):
                        tmp0 = validateGeom(tmpGeom).Union(validateGeom(tres.GetGeometryRef(kk)))
                        if tmp0 is not None and not (tmp0.IsEmpty()):
                            tmpGeom = validateGeom(tmp0).Clone()
                            tmp0.Destroy()
                    if tmpGeom is not None and not (tmpGeom.IsEmpty()):
                        tres = tmpGeom
                geometryRes.SetGeometryDirectly(validateGeom(tres).Clone())
                tres.Destroy()
        geometry1[i].Destroy()
        i += 1
    geometryRes.SetGeometryDirectly(multi.UnionCascaded())
    outputs["Result"]["value"] = geometryRes.ExportToJson()
    # outputResult(conf,outputs["Result"],rgeometries)
    return 3


def UnionOneBis(conf, inputs):
    import sys
    geometry1 = extractInputs(conf, inputs["InputEntity"])
    i = 0
    geometryRes = None
    multi = osgeo.ogr.Geometry(osgeo.ogr.wkbMultiPolygon)
    while i < len(geometry1):
        j = 0
        multi.AddGeometry(geometry1[i].Clone())
        # if i==0:
        #    geometryRes=geometry1[i].Clone()
        # else:
        #    try:
        #        tres=geometryRes.GetGeometryRef().Union(geometry1[i].GetGeometryRef().Buffer(0.0))
        #    except:
        #        continue
        geometry1[i].Destroy()
        i += 1
    if not (multi.IsEmpty()):
        geometryRes.SetGeometryDirectly(multi.UnionCascaded().Clone())
        tres.Destroy()
    # outputs["Result"]["value"]=geometryRes.ExportToJson()
    # outputResult(conf,outputs["Result"],rgeometries)
    return geometryRes


points = []


class Classifier:
    def __init__(self, origin):
        self.cnt = 0
        self.origin = origin

    def getClass(self, x):
        if x[0] == self.origin[self.cnt][0] and x[1] == self.origin[self.cnt][1]:
            return 0
        geometryRes = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
        geometryRes.AddPoint_2D(x[0], x[1])
        geometryResO = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
        geometryResO.AddPoint_2D(self.origin[self.cnt][0], self.origin[self.cnt][1])
        val = geometryResO.Distance(geometryRes)
        self.cnt += 1
        return val


def UnionOneGeom(conf, inputs, outputs):
    import sys
    import shapely
    import shapely.wkt
    geometry1 = extractInputs(conf, inputs["InputEntity"])
    i = 0
    geometryRes = osgeo.ogr.Geometry(osgeo.ogr.wkbLineString)
    points = []
    origin = []
    while i < len(geometry1):
        conf["lenv"]["message"] = "(" + str(i) + "/" + str(len(geometry1)) + ") " + zoo._("Running process...")
        try:
            zoo.update_status(conf, int((i * 100) / len(geometry1)))
        except:
            continue
        j = 0
        tmp = geometry1[i].GetGeometryRef()
        line = shapely.wkt.loads(tmp.ExportToWkt())
        tpoints = tmp.GetPoints()
        if tpoints is not None:
            if i == 0:
                end0 = tmp.GetPoint(tmp.GetPointCount() - 1)
                end0G = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                end0G.AddPoint_2D(end0[0], end0[1])
            else:
                start = tmp.GetPoint(0)
                end = tmp.GetPoint(tmp.GetPointCount() - 1)
                startG = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                startG.AddPoint_2D(start[0], start[1])
                endG = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                endG.AddPoint_2D(end[0], end[1])
                if end0G.Distance(startG) < end0G.Distance(endG):
                    tpoints.sort(key=lambda x: line.project(shapely.wkt.loads('POINT(' + str(x[0]) + ' ' + str(x[1]) + ')')))
                else:
                    dist = line.project(shapely.wkt.loads(endG.ExportToWkt()))
                    tpoints.sort(key=lambda x: dist - line.project(shapely.wkt.loads('POINT(' + str(x[0]) + ' ' + str(x[1]) + ')')))
                end0G = endG
            points += tpoints
            geometry1[i].Destroy()
        i += 1
    cnt = 0
    c = Classifier(origin)
    # points.sort(key=lambda x: c.getClass(x))
    for a in points:
        geometryRes.AddPoint(a[0], a[1])
    outputs["Result"]["value"] = geometryRes.ExportToJson()
    return 3


def FusionIntersectsPy(conf, inputs, outputs):
    zoo.info("***** 1: " + str(inputs))
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    geometry2 = extractInputs(conf, inputs["InputEntity2"])
    zoo.info("***** 1: " + str(len(geometry1)) + " 2: " + str(len(geometry2)))
    rgeometries = []
    fids = []
    i = 0
    rmulti = ogr.Geometry(ogr.wkbMultiPolygon)
    for i in range(len(geometry1)):
        conf["lenv"]["message"] = "(" + str(i) + "/" + str(len(geometry1)) + ") " + zoo._("Running process...")
        try:
            zoo.update_status(conf, int((i * 100) / len(geometry1)))
        except:
            continue
        resg0 = geometry1[i].GetGeometryRef().Clone()
        zoo.error("****** 3: " + str(resg0))
        j = 0
        for j in range(len(geometry2)):
            if geometry1[i].GetGeometryRef().GetGeometryType() == osgeo.ogr.wkbMultiPolygon:
                for k in range(geometry1[i].GetGeometryRef().GetGeometryCount()):
                    if geometry1[i].GetGeometryRef().GetGeometryRef(k).Intersects(geometry2[j].GetGeometryRef()):
                        zoo.info("****** 2: " + str(geometry2[j].GetGeometryRef()))
                        zoo.info("****** 2: " + str(geometry2[j].GetGeometryRef().IsValid()))
                        zoo.info("****** 2: " + str(geometry2[j].GetGeometryRef().IsEmpty()))
                        zoo.info("****** 3: " + str(resg0.IsValid()))
                        zoo.info("****** 3: " + str(resg0.IsEmpty()))
                        zoo.info("****** 3: " + str(resg0))
                        tmp = geometry2[j].Clone()
                        zoo.info("****** 3: " + str(dir(tmp)))
                        tmp.SetGeometryDirectly(geometry1[i].GetGeometryRef().GetGeometryRef(k).Clone())
                        zoo.info("****** 3: " + str(dir(tmp)))
                        isPresent = False
                        for l in range(len(rgeometries)):
                            if rgeometries[l].GetGeometryRef().Equals(tmp.GetGeometryRef()):
                                isPresent = True
                                break
                        # if rmulti.GetGeometryCount()>0 and rmulti.Contains(tmp.GetGeometryRef()):
                        #    isPresent=True
                        if not (isPresent):
                            # rmulti.AddGeometry(tmp.GetGeometryRef())
                            rgeometries += [tmp.Clone()]
                            fids += [tmp.GetFID()]
                        tmp.Destroy()
            else:
                if resg0.Intersects(geometry2[j].GetGeometryRef()):
                    zoo.info("****** 2: " + str(geometry2[j].GetGeometryRef()))
                    zoo.info("****** 2: " + str(geometry2[j].GetGeometryRef().IsValid()))
                    zoo.info("****** 2: " + str(geometry2[j].GetGeometryRef().IsEmpty()))
                    zoo.info("****** 3: " + str(resg0.IsValid()))
                    zoo.info("****** 3: " + str(resg0.IsEmpty()))
                    zoo.info("****** 3: " + str(resg0))
                    tmp = geometry2[j].Clone()
                    zoo.info("****** 3: " + str(dir(tmp)))
                    tmp.SetGeometryDirectly(resg0.Clone())
                    zoo.info("****** 3: " + str(dir(tmp)))
                    isPresent = False
                    for l in range(len(rgeometries)):
                        if rgeometries[l].GetGeometryRef().Equals(tmp.GetGeometryRef()):
                            isPresent = True
                            break
                    # if rmulti.GetGeometryCount()>0 and rmulti.Contains(tmp.GetGeometryRef()):
                    #    isPresent=True
                    if not (isPresent):
                        rgeometries += [tmp.Clone()]
                        fids += [tmp.GetFID()]
                    tmp.Destroy()
        # resg.Destroy()
        geometry1[i].Destroy()
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1
    zoo.info("outputResult")
    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info("/outputResult")
    return 3


def Intersection(conf, inputs, outputs):
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    geometry2 = extractInputs(conf, inputs["InputEntity2"])
    zoo.info("***** 1: " + str(len(geometry1)) + " 2: " + str(len(geometry2)))
    rgeometries = []
    fids = []
    i = 0
    for i in range(len(geometry1)):
        conf["lenv"]["message"] = "(" + str(i) + "/" + str(len(geometry1)) + ") " + zoo._("Running process...")
        try:
            zoo.update_status(conf, int((i * 100) / len(geometry1)))
        except Exception as e:
            zoo.error("----- ERROR : "+str(e))
        j = 0
        for j in range(len(geometry2)):
            tmp = geometry2[j].Clone()
            # resg=validateGeom(geometry2[j].GetGeometryRef())
            resg = geometry2[j].GetGeometryRef()
            # resg=resg.Intersection(geometry1[i].GetGeometryRef())
            if len(geometry1) == 1:
                conf["lenv"]["message"] = "(" + str(j) + "/" + str(len(geometry2)) + ") " + zoo._("Run intersection process...")
                try:
                    zoo.update_status(conf, int((j * 100) / len(geometry2)))
                except Exception as e:
                    zoo.error("----- ERROR : "+str(e))
            if geometry1[i].GetGeometryRef().GetGeometryType() == osgeo.ogr.wkbMultiPolygon:
                for k in range(geometry1[i].GetGeometryRef().GetGeometryCount()):
                    try:
                        # tmpGeom=validateGeom(geometry1[i].GetGeometryRef().GetGeometryRef(k))
                        tmpGeom = geometry1[i].GetGeometryRef().GetGeometryRef(k)
                        if tmpGeom.Intersects(resg):
                            tmp1 = geometry2[j].Clone()
                            resg1 = tmpGeom.Intersection(resg)
                            # tmp1.SetGeometryDirectly(validateGeom(resg1))
                            tmp1.SetGeometryDirectly(resg1)
                            tmp1.SetFID(len(rgeometries))
                            if resg1 is not None and not (resg1.IsEmpty()):  # and fids.count(tmp.GetFID())==0:
                                rgeometries += [tmp1]
                                fids += [tmp.GetFID()]
                            else:
                                tmp1.Destroy()
                    except Exception as e:
                        # tmp1.Destroy()
                        zoo.error(str(e))
                tmp.Destroy()
            else:
                # resg=validateGeom(geometry1[i].GetGeometryRef()).Intersection(validateGeom(resg))
                # resg=validateGeom(geometry1[i].GetGeometryRef()).Intersection(resg)
                resg = geometry1[i].GetGeometryRef().Intersection(resg)
                try:
                    # tmp.SetGeometryDirectly(validateGeom(resg))
                    tmp.SetGeometryDirectly(resg)
                    tmp.SetFID(len(rgeometries))
                    if resg is not None and not (resg.IsEmpty()):  # and fids.count(tmp.GetFID())==0:
                        rgeometries += [tmp]
                        fids += [tmp.GetFID()]
                    else:
                        tmp.Destroy()
                except Exception as e:
                    zoo.error(str(e))
        geometry1[i].Destroy()
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info("/outputResult")
    return 3


def IntersectionPy(conf, inputs, outputs):
    return Intersection(conf, inputs, outputs)


def Intersection0(conf, inputs, outputs):
    zoo.info("Starting service ...")
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    geometry2 = extractInputs(conf, inputs["InputEntity2"], "select gml_id as fid0,* ")

    if "InputEntity3" in inputs and inputs["InputEntity3"]["value"]:
        geometry3 = extractInputs(conf, inputs["InputEntity3"])


    rgeometries = []
    fids = []
    i = 0
    while i < len(geometry1):
        j = 0
        while j < len(geometry2):
            tmp = geometry2[j].Clone()
            resg = geometry2[j].GetGeometryRef()
            # resg=resg.Intersection(geometry1[i].GetGeometryRef())
            # resg=geometry1[i].GetGeometryRef().Intersection(resg)
            # tmp.SetGeometryDirectly(resg)
            if geometry1[i].GetGeometryRef().Intersects(resg):
                if "InputEntity3" in inputs and inputs["InputEntity3"]["value"]:
                    k = 0
                    hasVal = False
                    while k < len(geometry3):
                        # resg=geometry3[k].GetGeometryRef().Intersection(resg)
                        if geometry3[k].GetGeometryRef().Equals(resg):
                            hasVal = True
                            break
                        k += 1
                    if not (hasVal):
                        rgeometries += [tmp]
                        fids += [tmp.GetFID()]
                else:
                    # tmp.SetGeometryDirectly(resg.Empty())
                    rgeometries += [tmp]
                    fids += [tmp.GetFID()]
            else:
                tmp.Destroy()
            j += 1
        geometry1[i].Destroy()
        i += 1
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1

    if len(rgeometries) == 0:
        conf["lenv"]["message"] = zoo._("No feature found !")
        return zoo.SERVICE_FAILED

    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info("/outputResult")
    return zoo.SERVICE_SUCCEEDED


def nullGeo(conf, inputs, outputs):
    zoo.info("Starting service ...")
    for i in inputs["InputEntity1"]:
        if i != "value":
            zoo.info(i + " " + inputs["InputEntity1"][i])
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    rgeometries = []
    fids = []
    i = 0

    while i < len(geometry1):
        tmp = geometry1[i].Clone()
        resg = geometry1[i].GetGeometryRef()
        tmp.SetGeometryDirectly(resg.Empty())
        rgeometries += [tmp]
        fids += [tmp.GetFID()]
        geometry1[i].Destroy()
        i += 1
    i = 0

    if "InputEntity2" in inputs and inputs["InputEntity2"]["value"]:
        geometry2 = extractInputs(conf, inputs["InputEntity2"])
        while i < len(geometry2):
            tmp = geometry2[i].Clone()
            resg = geometry2[i].GetGeometryRef()
            tmp.SetGeometryDirectly(resg.Empty())
            rgeometries += [tmp]
            fids += [tmp.GetFID()]
            geometry2[i].Destroy()
            i += 1

    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info("/outputResult")
    return 3


def getFeaturesCopy(conf, inputs, outputs):
    zoo.info("Starting service ...")
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    rgeometries = []
    fids = []
    i = 0
    if "InputEntity2" in inputs and inputs["InputEntity2"]["value"]:
        geometry2 = extractInputs(conf, inputs["InputEntity2"])

    while i < len(geometry1):
        tmp = geometry1[i].Clone()
        rgeometries += [tmp]
        geometry1[i].Destroy()
        i += 1

    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info("/outputResult")
    return 3


def Append(conf, inputs, outputs):
    zoo.info("Starting service ...")
    geometry1 = extractInputs(conf, inputs["InputEntity1"])

    rgeometries = []
    fids = []
    i = 0

    while i < len(geometry1):
        tmp = geometry1[i].Clone()
        if tmp is None:
            zoo.info("Unable to create a clone of your feature, does it contain a FID column?")
        rgeometries += [tmp]
        fids += [tmp.GetFID()]
        geometry1[i].Destroy()
        i += 1
    i = 0
    if "InputEntity2" in inputs and inputs["InputEntity2"]["value"] != "NULL":
        geometry2 = extractInputs(conf, inputs["InputEntity2"])
        while i < len(geometry2):
            tmp = geometry2[i].Clone()
            rgeometries += [tmp]
            fids += [tmp.GetFID()]
            geometry2[i].Destroy()
            i += 1

    if len(rgeometries) == 0:
        conf["lenv"]["message"] = "No feature found !"
        return zoo.SERVICE_FAILED
    zoo.info(str(rgeometries))
    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info(outputs["Result"])
    zoo.info("/outputResult")
    return zoo.SERVICE_SUCCEEDED


def Remove(conf, inputs, outputs):
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    geometry2 = extractInputs(conf, inputs["InputEntity2"])

    rgeometries = []
    fids = []
    i = 0

    while i < len(geometry1):
        tmp = geometry1[i].Clone()
        j = len(geometry2) - 1
        noDisplay = False
        while j >= 0:
            tmp0 = geometry2[j].Clone()
            if tmp0.GetGeometryRef().Equals(tmp.GetGeometryRef()):
                noDisplay = True
                j = 0
                # break
            j -= 1
            tmp0.Destroy()
        zoo.info(str(noDisplay))
        if not (noDisplay):
            rgeometries += [tmp.Clone()]

        tmp.Destroy()
        i += 1

    i = 0
    while i < len(geometry1):
        geometry1[i].Destroy()
        i += 1

    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1

    if len(rgeometries) == 0:
        conf["lenv"]["message"] = "No feature found"
        zoo.info("/outputResult exception")
        return zoo.SERVICE_FAILED
    outputResult(conf, outputs["Result"], rgeometries)
    zoo.info("/outputResult")
    return zoo.SERVICE_SUCCEEDED


def DifferencePy(conf, inputs, outputs):
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    geometry2 = extractInputs(conf, inputs["InputEntity2"])
    rgeometries = []
    i = 0
    while i < len(geometry1):
        j = 0
        while j < len(geometry2):
            tmp = geometry2[j].Clone()
            resg = geometry1[i].GetGeometryRef()
            resg = resg.Difference(geometry2[i].GetGeometryRef())
            tmp.SetGeometryDirectly(resg)
            if not (resg.IsEmpty()):
                rgeometries += [tmp]
            j += 1
        geometry1[i].Destroy()
        i += 1
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return 3


def SymDifferencePy(conf, inputs, outputs):
    geometry1 = extractInputs(conf, inputs["InputEntity1"])
    # geometry2=extractInputs(conf,inputs["InputEntity2"])
    outputs1 = {"Result": {"mimeType": "application/json"}}
    geometry2 = UnionOneBis(conf, {"InputEntity": inputs["InputEntity2"]})
    rgeometries = []
    i = 0
    while i < len(geometry1):
        j = 0
        while j < len(geometry2):
            tmp = geometry2[j].Clone()
            resg = geometry1[i].GetGeometryRef()
            try:
                resg = resg.SymmetricDifference(geometry2[i].GetGeometryRef())
            except:
                continue
            tmp.SetGeometryDirectly(validateGeom(resg))
            rgeometries += [tmp]
            j += 1
        geometry1[i].Destroy()
        i += 1
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1
    outputResult(conf, outputs["Result"], rgeometries)
    return 3


def ExteriorRingPy(conf, inputs, outputs):
    geometry1 = extractInputs(conf, inputs["InputPolygon"])
    outputs1 = {"Result": {"mimeType": "application/json"}}
    rgeometries = []
    i = 0
    while i < len(geometry1):
        tmp = geometry1[i].Clone()
        resg = geometry1[i].GetGeometryRef().Buffer(0.0)
        zoo.info("OK")
        zoo.info(str(resg))
        zoo.info("OK")
        zoo.info(geometry1[i].GetGeometryRef())
        nbrRings = resg.GetGeometryCount()
        for i in range(nbrRings):
            tmp1 = resg.GetGeometryRef(i)
            line = osgeo.ogr.Geometry(osgeo.ogr.wkbLineString)
            for j in range(tmp1.GetPointCount()):
                pt = tmp1.GetPoint(j)
                line.AddPoint(pt[0], pt[1])
            tmp.SetGeometryDirectly(line.Clone())
            line.Destroy()
            break

        rgeometries += [tmp]
        geometry1[i].Destroy()
        i += 1
    i = 0
    outputResult(conf, outputs["Result"], rgeometries)
    return 3


def CreateRegularGrid(conf, inputs, outputs):
    ext = inputs["extent"]["value"].split(",")
    query = "SELECT ST_AsGeoJSON(geom) AS geomWKT FROM ST_RegularGrid(ST_Transform(ST_SetSRID(ST_GeomFromText('LINESTRING(" + ext[0] + " " + ext[1] + ", -" + ext[2] + " " + ext[3] + ")',0),3857),32628),1,100,100,false);"
    import authenticate.service as auth
    con = auth.getCon(conf)
    con.connect()
    cur = con.conn.cursor()
    res = cur.execute(query)
    return zoo.SERVICE_SUCCEEDEED


def validateGeom(geom):
    if geom.GetGeometryType() == osgeo.ogr.wkbGeometryCollection:
        return geom
    elif geom.GetGeometryType() == osgeo.ogr.wkbPolygon:
        if not (geom.IsValid()):
            try:
                tres = geom.Buffer(0.0)
                if tres is not None and not (tres.IsEmpty()):
                    return tres
                else:
                    return geom
            except Exception as e:
                zoo.error(str(e))
                return geom
        else:
            return geom
    else:
        return geom
