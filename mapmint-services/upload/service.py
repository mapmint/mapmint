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


def getForm(conf, inputs, outputs):
    import datastores.service as ds
    import mm_access
    ds.list(conf, inputs, outputs)
    elements = eval(outputs["Result"]["value"])
    dirs = []
    j = 0
    for i in range(0, len(elements["Directories"])):
        print(elements["Directories"][i]["name"] + " rwx", file=sys.stderr)
        if mm_access.checkDataStorePriv(conf, elements["Directories"][i]["name"], "rwx"):
            dirs += [elements["Directories"][i]["name"]]
        j += 1
    import template.service as tmpl
    inputs1 = inputs
    inputs1["tmpl"] = {"value": inputs["form"]["value"]}
    inputs1["dirs"] = dirs
    tmpl.display(conf, inputs1, outputs)
    return 3


def saveOnServer(conf, inputs, outputs):
    import shutil
    print("************ ok1 " + str(inputs), file=sys.stderr)
    # TODO: confirm assumption: "conf" is a Python 3 dictionary object
    # if list(conf.keys()).count("senv") > 0:
    if "senv" in conf:
        dir = conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["senv"]["MMID"]
    else:
        dir = conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["lenv"]["usid"]
    try:
        shutil.os.mkdir(dir)
    except Exception as e:
        print(str(e), file=sys.stderr)
        pass
    field = "file"
    if "filename" in inputs:
        field = inputs["filename"]["value"]
    print("************ ok2 " + str(inputs), file=sys.stderr)
    tmp = inputs[field]["lref"].split("/")
    print("************ ok3 " + str(inputs), file=sys.stderr)
    outFileName = dir + "/" + tmp[len(tmp) - 1]
    print("************ ok4 " + str(inputs), file=sys.stderr)
    shutil.move(inputs[field]["lref"], outFileName);
    # TODO: confirm assumption: "conf" is a Python 3 dictionary object
    # if list(conf.keys()).count("senv") > 0:
    if "senv" in conf:
        conf["senv"]["last_file"] = outFileName
        conf["senv"]["last_ufile"] = outFileName
        # import mmsession
        # mmsession.save(conf)
        # conf["lenv"]["cookie"]="MMID=MM"+conf["senv"]["MMID"]+"; path=/"
        print("************ XXX " + str(conf["senv"]), file=sys.stderr)
    print("************ ok5 " + str(outFileName), file=sys.stderr)
    outputs["Result"]["value"] = "Your " + tmp[len(tmp) - 1] + " file was uploaded on the server"
    print("************ ok6 " + str(inputs), file=sys.stderr)
    return 3


def saveOnServer0(conf, inputs, outputs):
    import shutil, json
    print("ok1 INPUTS " + str(inputs), file=sys.stderr)
    print("ok1 " + str(conf), file=sys.stderr)
    dir = conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["senv"]["MMID"]
    try:
        shutil.os.mkdir(dir)
    except Exception as e:
        print(str(e), file=sys.stderr)
        pass
    field = "file"
    print(inputs, file=sys.stderr)
    if "filename" in inputs:
        field = inputs["filename"]["value"]
    tmp = inputs[field]["lref"].split("/")
    outFileName = dir + "/" + tmp[len(tmp) - 1]
    shutil.move(inputs[field]["lref"], outFileName);
    conf["senv"]["last_file"] = outFileName
    conf["senv"]["last_ufile"] = outFileName
    import mmsession
    mmsession.save(conf)
    res = {"files": [{"message": zoo._("Your [file] file was uploaded on the server").replace("\[file\]", tmp[len(tmp) - 1]), "fileName": outFileName}]}
    outputs["Result"]["value"] = json.dumps(res)
    return 3


def checkFile(conf, inputs, outputs):
    import shutil
    import osgeo.gdal
    import osgeo.ogr
    dir = conf["main"]["tmpPath"] + "/data_tmp_1111" + conf["senv"]["MMID"]
    accepted = []
    anames = []
    dnames = []
    deleted = []
    tmp = shutil.os.listdir(dir)
    for i in range(0, len(tmp)):
        tmp1 = tmp[i].split(".")
        t = None
        for j in range(0, len(accepted)):
            print("Accepted / tmp1", file=sys.stderr)
            print(anames, file=sys.stderr)
            print(tmp1, file=sys.stderr)
            if tmp1[0] == anames[j].split(".")[0]:
                print("OK", file=sys.stderr)
                t = "OK"
                break
        if t is None:
            t = osgeo.ogr.Open(dir + "/" + tmp[i])
        if t is None:
            t = osgeo.gdal.Open(dir + "/" + tmp[i])
            if t is not None:
                b = t.GetRasterBand(0)
                t = b
        if t is None:
            deleted += [i]
            dnames += [tmp[i]]
        else:
            accepted += [i]
            anames += [tmp[i]]

    k = 0
    i = len(deleted) - 1
    print(str(deleted) + " " + str(dnames), file=sys.stderr)
    while i >= 0:
        for j in range(0, len(accepted)):
            if len(dnames) > i and anames[j].split(".")[0] == dnames[i].split(".")[0]:
                accepted += [deleted[i]]
                anames += [dnames[i]]
                deleted.pop(i)
                dnames.pop(i)
        i -= 1

    deletedList = []
    for i in range(0, len(deleted)):
        try:
            shutil.os.unlink(dir + "/" + tmp[deleted[i]])
        except:
            pass
        deletedList += [tmp[deleted[i]]]

    acceptedList = []
    for i in range(0, len(accepted)):
        print(i, file=sys.stderr)
        # try:
        shutil.move(dir + "/" + tmp[accepted[i]], conf["main"]["dataPath"] + "/dirs/" + inputs["dest"]["value"] + "/" + tmp[accepted[i]])
        acceptedList += [tmp[accepted[i]]]
        # except:
        #    deletedList+=[tmp[accepted[i]]]

    try:
        shutil.os.unlink(conf["main"]["dataPath"] + "/dirs/" + inputs["dest"]["value"] + "/ds_ows.map")
    except:
        pass
    try:
        shutil.os.rmdir(dir)
    except:
        pass
    import json
    outputs["Result"]["value"] = json.dumps({"accepted": anames, "refused": dnames})
    return 3
