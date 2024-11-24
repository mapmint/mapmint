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
import mapscript

if sys.platform == 'win32':
    import ntfslink

    os.readlink = ntfslink.readlink
    os.symlink = ntfslink.symlink


def copyLayerFile(conf, inputs, outputs):
    # TODO: confirm assumption: inputs is a Python 3 dictionary object
    import mapscript
    import shutil
    if "dsto" in inputs:
        m = mapscript.mapObj(conf["main"]["dataPath"] + "/dirs/" + inputs["dsto"]["value"] + "/ds_ows.map")
    else:
        m = mapscript.mapObj(
            conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["layer"]["value"] + ".map")
    if ("lfile" in inputs) and inputs["lfile"]["value"] != "NULL":
        ofile = inputs["lfile"]["value"]
    else:
        if "dsto" in inputs:
            ofile = m.getLayerByName(inputs["layer"]["value"]).data
        else:
            ofile = m.getLayer(0).data
    if ("target" in inputs) and inputs["target"]["value"] != "NULL":
        shutil.copy2(ofile, inputs["target"]["value"])
    else:
        shutil.copy2(ofile, conf["main"]["dataPath"])
    if "dsto" in inputs:
        outputs["Result"]["value"] = ofile.split("/")[len(ofile.split("/")) - 1]
    else:
        outputs["Result"]["value"] = zoo._("Layer copied")
    return zoo.SERVICE_SUCCEEDED


def dropLayerFile(conf, inputs, outputs):
    # TODO: confirm assumption: inputs is a Python 3 dictionary object
    import mapscript
    import shutil
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")
    if "layer" in inputs:
        ofile = inputs["layer"]["value"]
    else:
        ofileName = m.getLayer(0).data.split("/")
        ofile = ofileName[len(ofileName) - 1]
    if type(ofile) is list:
        outputs["Result"]["value"] = ""
        for i in ofile:
            if outputs["Result"]["value"] != "":
                outputs["Result"]["value"] += ","
            outputs["Result"]["value"] += str(i)
            try:
                os.remove(i)
            except:
                continue
    else:
        outputs["Result"]["value"] += ofile
        os.remove(ofile)
    outputs["Result"]["value"] += zoo._(" deleted")
    return zoo.SERVICE_SUCCEEDED


def loadGCP(conf, inputs, outputs):
    import json
    if "srs" in inputs:
        import osgeo.ogr
        import osgeo.osr
        srcSR = osgeo.osr.SpatialReference()
        # The following value should be extracted from spatial_ref_sys table
        srcSR.ImportFromEPSG(int(inputs["srs"]["value"]))
        destSR = osgeo.osr.SpatialReference()
        destSR.ImportFromEPSG(4326)
        srTrans = osgeo.osr.CoordinateTransformation(srcSR, destSR)
        zoo.info(str(srTrans))
    f = open(conf["main"]["dataPath"] + "/georeferencer_maps/" + inputs["dso"]["value"] + "/" + inputs["file"][
        "value"] + ".csv", "r")
    res = []
    a = f.readlines()
    for line in a:
        tmp = line.split(";")
        res1 = []
        for i in range(0, len(tmp)):
            if "srs" in inputs and i >= len(tmp) - 2:
                tmp[i].replace("\n", "")
                pt = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
                pt.SetPoint_2D(0, float(tmp[i].replace("\n", "")), float(tmp[i + 1].replace("\n", "")))
                pt.Transform(srTrans)
                res1 += [pt.GetX()]
                res1 += [pt.GetY()]
                break
            else:
                res1 += [tmp[i].replace("\n", "")]
        res += [res1]
    f.close()
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def listGeoreferencedProject(conf, inputs, outputs):
    import json
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")
    res = []
    tmp = m.web.metadata.get("mmGCPCSV")
    if tmp is None:
        conf["lenv"]["message"] = zoo._("Unable to find any CSV files associated with the file.")
        return zoo.SERVICE_FAILED
    if tmp and tmp.count(",") > 0:
        tmp = tmp.split(",")
    else:
        tmp = [tmp]
    for i in range(0, len(tmp)):
        res += [tmp[i]]
    outputs["Result"]["value"] = json.dumps(res);
    return zoo.SERVICE_SUCCEEDED


def saveGeoreferencedProject(conf, inputs, outputs):
    # TODO: confirm assumption: inputs is a Python 3 dictionary object
    import mmsession
    import mapfile.service as ms

    mapfile = inputs["dst"]["value"] + "ds_ows.map"
    m = mapscript.mapObj(mapfile)
    ms.removeAllLayers(m, inputs["dso"]["value"])

    m.web.metadata.set("mmGeoDST", inputs["dst"]["value"])
    conf["senv"]["mmGeoDST"] = inputs["dst"]["value"]

    m.web.metadata.set("mmGeoDSO", inputs["dso"]["value"])
    conf["senv"]["mmGeoDSO"] = inputs["dso"]["value"]
    conf["senv"]["mmGeoMap"] = inputs["dso"]["value"]

    import shutil
    ofile = m.getLayer(0).data
    shutil.copy2(ofile, conf["main"]["tmpPath"])
    conf["senv"]["mmGeoImg"] = ofile.split('/')[len(ofile.split('/')) - 1]

    if "gcpfile" in inputs:
        m.web.metadata.set("mmGeoGCPFile", inputs["gcpfile"]["value"])
        conf["senv"]["mmGeoGCPFile"] = inputs["gcpfile"]["value"]
    if "size" in inputs:
        m.web.metadata.set("mmGeoSize", inputs["size"]["value"])
        conf["senv"]["mmGeoSize"] = inputs["size"]["value"]
    mmsession.save(conf)
    if not (os.path.isfile(
            conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")):
        m.save(conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")
    outputs["Result"]["value"] = zoo._("Georeference Project saved")
    return zoo.SERVICE_SUCCEEDED


def saveGeorefProject(conf, inputs, outputs):
    import mmsession
    import mapfile.service as ms

    mapfile = conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["map"]["value"] + ".map"
    m = mapscript.mapObj(mapfile)
    conf["senv"]["mmGeoDST"] = m.web.metadata.get("mmGeoDST")
    conf["senv"]["mmGeoDSO"] = m.web.metadata.get("mmGeoDSO")
    if "dso" in inputs and inputs["dso"]["value"] == "NULL":
        inputs["dso"]["value"] = m.getLayer(0).name
    conf["senv"]["mmGeoMap"] = inputs["dso"]["value"]

    import shutil
    ofile = m.getLayer(0).data
    shutil.copy2(ofile, conf["main"]["tmpPath"])
    conf["senv"]["mmGeoImg"] = ofile.split('/')[len(ofile.split('/')) - 1]

    mmsession.save(conf)
    try:
        os.mkdir(conf["main"]["dataPath"] + "/georeferencer_maps/" + inputs["dso"]["value"])
    except:
        pass

    if not (os.path.isfile(
            conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")) or (
            "force" in inputs and inputs["force"]["value"] == "true"):
        try:
            import glob
            for name in glob.glob(
                    conf["main"]["dataPath"] + "/georeferencer_maps/" + inputs["map"]["value"] + "/*.csv"):
                shutil.copy2(name, conf["main"]["dataPath"] + "/georeferencer_maps/" + inputs["dso"]["value"])
        except Exception as e:
            zoo.error(str(e))
            pass
        m.save(conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")
    outputs["Result"]["value"] = zoo._("Georeference Project saved")
    return zoo.SERVICE_SUCCEEDED


def saveGCPAsCSV(conf, inputs, outputs):
    # TODO: confirm assumption: inputs is a Python 3 dictionary object
    if os.path.isfile(conf["main"]["dataPath"] + "/georeferencer_maps/" + inputs["dso"]["value"] + "/" + inputs["file"][
        "value"] + ".csv") and not ("force" in inputs and inputs["force"]["value"] == "true"):
        conf["lenv"][
            "message"] = "Unable to create your GCP file, it seems that there is already a file with the same name for the project. To force the replacement of the current file by the one you are creating, please run with the  checked."
        return zoo.SERVICE_FAILED
    f = open(conf["main"]["dataPath"] + "/georeferencer_maps/" + inputs["dso"]["value"] + "/" + inputs["file"][
        "value"] + ".csv", "w")
    if "gcp" in inputs:
        for i in range(0, len(inputs["gcp"]["value"])):
            zoo.info(inputs["gcp"]["value"][i])
            f.write(inputs["gcp"]["value"][i].replace(",", ";") + "\n")
    f.close()
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")

    if m.web.metadata.get("mmGCPCSV") is not None and m.web.metadata.get("mmGCPCSV") != "":
        tmp = m.web.metadata.get("mmGCPCSV")
        if tmp.count(inputs["file"]["value"]) == 0:
            m.web.metadata.set("mmGCPCSV", tmp + "," + inputs["file"]["value"])
            conf["senv"]["mmGCPCSV"] = tmp + "," + inputs["file"]["value"]
    else:
        m.web.metadata.set("mmGCPCSV", inputs["file"]["value"])
        conf["senv"]["mmGCPCSV"] = inputs["file"]["value"]

    m.save(conf["main"]["dataPath"] + "/georeferencer_maps/project_" + inputs["dso"]["value"] + ".map")
    outputs["Result"]["value"] = zoo._("CSV file saved.")
    return zoo.SERVICE_SUCCEEDED
