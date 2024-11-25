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
#import libxml2
import sys, os
import osgeo.ogr


def createShpFromOSMP(conf, inputs, outputs):
    # Parse OSM data
    content = inputs["osm"]["value"]
    doc = libxml2.parseMemory(content, len(content))

    # Get all fields available from the dataset
    nodes = doc.xpathEval('/osm/node/tag')
    fields = {}
    for i in range(len(nodes)):
        cc = nodes[i].xpathEval('@k')[0].getContent()
        # TODO: confirm assumption: "fields" is a Python 3 dictionary object
        # if list(fields.keys()).count(cc) == 0:
        if cc not in fields:
            fields[cc] = len(nodes[i].xpathEval('@v')[0].getContent())
        else:
            if len(nodes[i].xpathEval('@v')[0].getContent()) > fields[cc]:
                fields[cc] = len(nodes[i].xpathEval('@v')[0].getContent())
    zoo.info(str(fields))

    # Create Datasource
    drv = osgeo.ogr.GetDriverByName("ESRI Shapefile")
    zoo.info(dir(drv))
    ds = drv.CreateDataSource(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/" + inputs["dson"]["value"] + ".shp")

    zoo.info(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/" + inputs["dson"]["value"] + ".shp")
    lyr = ds.CreateLayer(inputs["dson"]["value"], None, osgeo.ogr.wkbPoint)

    # Create Fields
    field_defn = osgeo.ogr.FieldDefn("MMID", osgeo.ogr.OFTInteger)
    if lyr.CreateField(field_defn) != 0:
        conf["lenv"]["message"] = "Creating MMID field failed."
        return 4

    # TODO: confirm assumption: "fields" is a Python 3 dictionary object
    # for i in list(fields.keys()):
    for i in fields.keys():
        field_defn = osgeo.ogr.FieldDefn(i.replace(":", "_"), osgeo.ogr.OFTString)
        field_defn.SetWidth(fields[i])
        if lyr.CreateField(field_defn) != 0:
            conf["lenv"]["message"] = zoo._("Creating ") + i + zoo._(" field failed.")
            return 4

    # Pass through all nodes available
    nodes = doc.xpathEval('/osm/node')
    for i in range(len(nodes)):
        feat = osgeo.ogr.Feature(lyr.GetLayerDefn())
        feat.SetField("MMID", nodes[i].xpathEval('@id')[0].getContent())
        # TODO: confirm assumption: "fields" is a Python 3 dictionary object
        # for j in list(fields.keys()):
        for j in fields.keys():
            tmp = nodes[i].xpathEval('tag[@k=\'' + j + '\']')
            zoo.info(str(tmp))
            if len(tmp) > 0:
                zoo.info(tmp[0].xpathEval('@v')[0].getContent())
                feat.SetField(j.replace(":", "_")[:10], tmp[0].xpathEval('@v')[0].getContent())
        pt = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
        pt.SetPoint_2D(0, float(nodes[i].xpathEval('@lon')[0].getContent()), float(nodes[i].xpathEval('@lat')[0].getContent()))
        feat.SetGeometry(pt)
        if lyr.CreateFeature(feat) != 0:
            conf["lenv"]["message"] = zoo._("Failed to create feature in shapefile.")
            return zoo.SERVICE_FAILED
        feat.Destroy()
    ds = None

    try:
        zoo.info(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/ds_ows.map")
        os.unlink(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/ds_ows.map")
    except:
        pass
    outputs["Result"]["value"] = "Shapefile created"
    return 3


def createShpFromOSML(conf, inputs, outputs):
    # Parse OSM data
    content = inputs["osm"]["value"]
    doc = libxml2.parseMemory(content, len(content))

    # Get all fields available from the dataset
    nodes = doc.xpathEval('/osm/way/tag')
    fields = {}
    for i in range(len(nodes)):
        cc = nodes[i].xpathEval('@k')
        zoo.info(str(cc))
        if cc is not None and len(cc) > 0:
            cc = cc[0].getContent()
            # TODO: confirm assumption: "fields" is a Python 3 dictionary object
            # if list(fields.keys()).count(cc) == 0:
            if cc not in fields:
                fields[cc] = len(nodes[i].xpathEval('@v')[0].getContent())
            else:
                if len(nodes[i].xpathEval('@v')[0].getContent()) > fields[cc]:
                    fields[cc] = len(nodes[i].xpathEval('@v')[0].getContent())
    zoo.info(str(fields))

    # Create Datasource
    drv = osgeo.ogr.GetDriverByName("ESRI Shapefile")
    ds = drv.CreateDataSource(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/" + inputs["dson"]["value"] + ".shp")

    zoo.info(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/" + inputs["dson"]["value"] + ".shp")
    lyr = ds.CreateLayer(inputs["dson"]["value"], None, osgeo.ogr.wkbLineString)

    # Create Fields
    field_defn = osgeo.ogr.FieldDefn("MMID", osgeo.ogr.OFTInteger)
    if lyr.CreateField(field_defn) != 0:
        conf["lenv"]["message"] = zoo._("Creating MMID field failed.")
        return zoo.SERVICE_FAILED

    # TODO: confirm assumption: "fields" is a Python 3 dictionary object
    # for i in list(fields.keys()):
    for i in fields.keys():
        field_defn = osgeo.ogr.FieldDefn(i.replace(":", "_"), osgeo.ogr.OFTString)
        field_defn.SetWidth(fields[i])
        if lyr.CreateField(field_defn) != 0:
            conf["lenv"]["message"] = zoo._("Creating ") + i + zoo._(" field failed.")
            return zoo.SERVICE_FAILED

    # Pass through all ways available
    nodes = doc.xpathEval('/osm/way')
    for i in range(len(nodes)):
        feat = osgeo.ogr.Feature(lyr.GetLayerDefn())
        feat.SetField("MMID", nodes[i].xpathEval('@id')[0].getContent())
        # TODO: confirm assumption: "fields" is a Python 3 dictionary object
        # for j in list(fields.keys()):
        for j in fields.keys():
            tmp = nodes[i].xpathEval('tag[@k=\'' + j + '\']')
            zoo.info(str(tmp))
            if len(tmp) > 0:
                print(tmp[0].xpathEval('@v')[0].getContent(), file=sys.stderr)
                feat.SetField(j.replace(":", "_")[:10], tmp[0].xpathEval('@v')[0].getContent())
        line = osgeo.ogr.Geometry(osgeo.ogr.wkbLineString)
        nodes1 = nodes[i].xpathEval('./nd')
        for j in nodes1:
            ref = j.xpathEval('@ref')[0].getContent()
            nd = doc.xpathEval("/osm/node[@id='" + ref + "']")
            zoo.info(ref + " " + str(nd))
            if len(nd) > 0:
                line.AddPoint_2D(float(nd[0].xpathEval('@lon')[0].getContent()), float(nd[0].xpathEval('@lat')[0].getContent()))
        feat.SetGeometry(line)
        if lyr.CreateFeature(feat) != 0:
            conf["lenv"]["message"] = zoo._("Failed to create feature in shapefile.")
            return 4
        feat.Destroy()
    ds = None

    try:
        zoo.info(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/ds_ows.map")
        os.unlink(conf["main"]["dataPath"] + "/dirs/" + inputs["dstn"]["value"] + "/ds_ows.map")
    except:
        pass
    outputs["Result"]["value"] = zoo._("Shapefile created")
    return 3
