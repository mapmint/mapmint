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
import sys, os, shutil
import zoo


def saveLayer(conf, inputs, outputs):
    dirs = os.listdir(inputs["InputDSTN"]["value"])
    for i in dirs:
        ii = i.split('.')
        if ii[0] == inputs["InputDSON"]["value"]:
            os.unlink(inputs["InputDSTN"]["value"] + "/" + i)
    dirs = os.listdir(conf["main"]["tmpPath"])
    for i in dirs:
        ii = i.split('.')
        if ii[0] == "TEMP_" + inputs["MMID"]["value"] + "-1":
            shutil.move(conf["main"]["tmpPath"] + "/" + i, inputs["InputDSTN"]["value"] + "/" + inputs["InputDSON"]["value"] + "." + ii[1])
            # shutil.move(conf["main"]["tmpPath"]+"/"+i,inputs["InputDSTN"]["value"]+"/"+inputs["InputDSON"]["value"]+"."+ii[1])
            try:
                os.unlink(conf["main"]["tmpPath"] + "/" + i)
                os.unlink(conf["main"]["tmpPath"] + "/" + i.replace("-1", ""))
            except:
                pass
    outputs["Result"]["value"] = "Demo";
    try:
        os.unlink(inputs["InputDSTN"]["value"] + "/ds_ows.map")
    except:
        pass
    return 3


def Recode(conf, inputs, outputs):
    import shutil
    try:
        source = open(inputs["file"]["value"])
        target = open(inputs["file"]["value"] + "1", "w")
        target.write(str(source.read(), inputs["sEncoding"]["value"]).encode(inputs["tEncoding"]["value"]))
        source.close()
        target.close()
        shutil.move(inputs["file"]["value"] + "1", inputs["file"]["value"])
        outputs["Result"]["value"] = zoo._("File converted")
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = str(e)
        return zoo.SERVICE_FAILED


def doZip(conf, inputs, outputs):
    import zipfile
    import glob, os
    try:
        os.remove(conf["main"]["tmpPath"] + "/" + inputs["dstn"]["value"])
    except Exception as e:
        print(e, file=sys.stderr)
        pass
    d = zipfile.ZipFile(conf["main"]["tmpPath"] + "/" + inputs["dstn"]["value"], 'w')
    rpath = conf["main"]["tmpPath"]
    if "dst" in inputs and inputs["dst"]["value"] != "NULL":
        rpath = inputs["dst"]["value"]
    for name in glob.glob(rpath + "/" + inputs["dso"]["value"] + ".*"):
        if name.count("zip") == 0:
            d.write(name.replace("\\", "/"), os.path.basename(name), zipfile.ZIP_DEFLATED)
    d.close()
    outputs["Result"]["value"] = conf["main"]["tmpUrl"] + inputs["dstn"]["value"]
    return 3


def cleanUp(conf, inputs, outputs):
    import glob, os
    tmp = inputs["dso"]["value"].split('.')
    for name in glob.glob(conf["main"]["tmpPath"] + "/" + tmp[0] + ".*"):
        os.remove(name.replace("\\", "/"))
    outputs["Result"]["value"] = zoo._("Cleanup done")
    return 3
