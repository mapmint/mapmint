import osgeo.ogr
import osgeo.gdal
import sys
import os
import shutil
import json
import mm_access
import zoo

if sys.platform == 'win32':
    import ntfslink

    os.readlink = ntfslink.readlink
    os.symlink = ntfslink.symlink


def mmListOnlyDir(path):
    """
    Order all directories
    """
    dirs = sorted([d for d in os.listdir(path) if os.path.isdir(path + os.path.sep + d)])
    return dirs


def mmListDir(path):
    dirs = mmListOnlyDir(path)
    """
    Order all files
    """
    dirs.extend(sorted([f for f in os.listdir(path) if os.path.isfile(path + os.path.sep + f)]))
    return dirs


def getOriginalDir(conf, val):
    # TODO: confirm assumption: conf and conf["main"] are Python dictionary objects
    if ("isTrial" in conf["main"]) and conf["main"]["isTrial"] == "true":
        if val.count(conf["main"]["dataPath"] + "/ftp/") > 0:
            return val
        else:
            return conf["main"]["dataPath"] + "/ftp/" + val
    else:
        if val is not None:
            return val
        else:
            return "/"


def saveDir(conf, inputs, outputs):
    # TODO: confirm assumption: inputs, inputs["path"] and inputs["type"] are Python dictionary objects
    if ("path" in inputs) and ("value" in inputs["path"]):
        od = getOriginalDir(conf, inputs["path"]["value"])
    if ("value" in inputs["type"]) and inputs["type"]["value"] == "new":
        try:
            os.mkdir(conf["main"]["dataPath"] + "/ftp/" + inputs["name"]["value"])
            inputs["path"]["value"] = conf["main"]["dataPath"] + "/ftp/" + inputs["name"]["value"]
        except:
            er = sys.exc_info()
            # print >> sys.stderr, er
            conf["lenv"]["message"] = "Unable to create directory: " + er[1][1]
            return 4
    os.symlink(inputs["path"]["value"], conf["main"]["dataPath"] + "/dirs/" + inputs["name"]["value"])
    outputs["Result"]["value"] = "Directory added as a datastore"
    # conf["main"]["dataPath"]+"/dirs/"+inputs["name"]["value"]
    return 3


def removeDS(conf, inputs, outputs):
    original_dir = inputs["dst"]["value"]
    try:
        tmp = mmListDir(original_dir)
    except Exception as e:
        conf["lenv"]["message"] = "Unable to list files into directory: " + str(e)
        return 4
    tmpStr = ""
    for i in tmp:
        print(i, file=sys.stderr)
        if i.count(inputs["dso"]["value"]) > 0:
            try:
                os.unlink(original_dir + "/" + i)
                tmpStr += i + "<br/>"
            except Exception as e:
                tmpStr += "Unable to remove: " + i + " " + str(e) + "<br/>"
    outputs["Result"]["value"] = "Files deleted: " + tmpStr
    return 3


def listJson(conf, inputs, outputs):
    # TODO: confirm assumption: inputs is a Python dictionary object
    import os, glob, time, json
    if "path" in inputs:
        prefix = inputs["path"]["value"]
    files = list(filter(os.path.isfile, glob.glob(prefix + "*." + inputs["ext"]["value"])))
    files.sort(key=lambda x: -os.path.getmtime(x))
    outputs["Result"]["value"] = json.dumps(files, ensure_ascii=False)
    return zoo.SERVICE_SUCCEEDED


def display(conf, inputs, outputs):
    import mm_access
    default_dir = conf["main"]["dataPath"] + "/dirs/"
    original_dir = conf["main"]["dataPath"] + "/dirs/"
    label_dir = ""
    if 'dir' in inputs and "value" in inputs["dir"] and str(inputs["dir"]["value"]) != "NULL":
        original_dir = getOriginalDir(conf, inputs["dir"]["value"])
        label_dir = inputs["dir"]["value"]
    status = "closed"
    if 'state' in inputs and 'value' in inputs["state"]:
        status = inputs["state"]["value"]
    # print >> sys.stderr, conf["main"]["dataPath"]+"/dirs/"
    # print >> sys.stderr, original_dir
    # print >> sys.stderr, inputs["dir"]["value"]
    try:
        tmp = mmListDir(original_dir)
    except:
        return 4
    try:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir.split('/')[
                len(original_dir.split('/')) - 2] + '''</a></span>'''
    except:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir + '''</a></span>'''
    outputs["Result"]["value"] = ''' '''
    i = 0
    j = 0
    prefix = ""
    try:
        if inputs["type"]:
            prefix = original_dir
            argument2 = ",'default'"
            suffix = "/"
    except:
        prefix = ""
        argument2 = ""
        suffix = ""
    for t in tmp:
        try:
            # print >> sys.stderr,original_dir+t
            open(original_dir + t)
            hasValue = False
        except:
            i += 1
            dsn = original_dir + t + "/"
            print(dsn, file=sys.stderr)
            try:
                priv = mm_access.checkDataStorePriv(conf, dsn, "r") and mm_access.checkDataStorePriv(conf, dsn, "x")
            except Exception as e:
                priv = False
                print(e, file=sys.stderr)
            print(priv, file=sys.stderr)
            if os.access(original_dir + t, os.X_OK) and len(t.split('.')) == 1:
                j += 1
                hasValue = True
                outputs["Result"]["value"] += '''
    <li id="browseDirectoriesList''' + original_dir.replace('/', '__') + "" + t + '''__"'''
                outputs["Result"]["value"] += ''' state="''' + status + '''">'''
                if default_dir == original_dir:
                    outputs["Result"][
                        "value"] += '''<div class="checker"><span><input type="checkbox" onclick="if(this.checked) Distiller.loadDir(this.value''' + argument2 + ''');else Distiller.unloadDir(this.value);" value="''' + prefix + t + suffix + '''" name="" style="opacity: 0;" /></span></div>'''
                    outputs["Result"]["value"] += '''<span class="file">''' + t + '''</span>
'''
                else:
                    outputs["Result"][
                        "value"] += '''<div class="hitarea  expandable-hitarea" onclick="$mj('Datawarehouse.form.path').value=\'''' + prefix + t + '''/\'; layouts[1].loadDir(\'''' + prefix + t + suffix + '''\'''' + argument2 + ''');"></div><span class="folder">''' + t + '''</span>
'''
                outputs["Result"]["value"] += '''
    </li>
'''

    if j == 0:
        outputs["Result"]["value"] = ''' '''
    outputs["Result"]["value"] = '''<ul> ''' + outputs["Result"]["value"] + '''</ul>'''

    return 3


def list(conf, inputs, outputs):
    import mm_access
    default_dir = conf["main"]["dataPath"] + "/dirs/"
    original_dir = conf["main"]["dataPath"] + "/dirs/"
    label_dir = ""
    if 'dir' in inputs and "value" in inputs["dir"] and str(inputs["dir"]["value"]) != "NULL":
        original_dir = getOriginalDir(conf, inputs["dir"]["value"])
        label_dir = inputs["dir"]["value"]
    status = "closed"
    if 'state' in inputs and 'value' in inputs["state"]:
        status = inputs["state"]["value"]
    try:
        tmp = mmListDir(original_dir)
    except:
        return 4
    try:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir.split('/')[
                len(original_dir.split('/')) - 2] + '''</a></span>'''
    except:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir + '''</a></span>'''
    outputs["Result"]["value"] = ''' '''
    i = 0
    j = 0
    prefix = ""
    try:
        if inputs["type"]:
            prefix = original_dir
            argument2 = ",'default'"
            suffix = "/"
    except:
        prefix = ""
        argument2 = ""
        suffix = ""
    outputs["Result"]["value"] = ""
    for t in tmp:
        try:
            open(original_dir + t)
            hasValue = False
        except:
            i += 1
            tmpStr = original_dir + t
            if tmpStr[len(tmpStr) - 1] != "/":
                tmpStr += "/"
            if os.access(original_dir + t, os.X_OK) and mm_access.checkDataStorePriv(conf, tmpStr, "rwx") and len(
                    t.split('.')) == 1:
                j += 1
                hasValue = True
                outputs["Result"]["value"] += '''
    <li id="browseDirectoriesList''' + original_dir.replace('/', '__') + "" + t + '''__"'''
                outputs["Result"]["value"] += ''' state="''' + status + '''">'''
                if default_dir == original_dir:
                    outputs["Result"][
                        "value"] += '''<div class="checker"><span><input type="checkbox" onclick="if(this.checked) Distiller.loadDir(this.value''' + argument2 + ''');else Distiller.unloadDir(this.value);" value="''' + prefix + t + suffix + '''" name="" style="opacity: 0;" /></span></div>'''
                    outputs["Result"]["value"] += '''<span class="file">''' + t + '''</span>
'''
                else:
                    outputs["Result"][
                        "value"] += '''<div class="hitarea  expandable-hitarea" onclick="$mj('Datawarehouse.form.path').value=\'''' + prefix + t + '''/\'; layouts[1].loadDir(\'''' + prefix + t + suffix + '''\'''' + argument2 + ''');"></div><span class="folder">''' + t + '''</span>
'''
                outputs["Result"]["value"] += '''
    </li>
'''

    if j == 0:
        outputs["Result"]["value"] = ''' '''
    outputs["Result"]["value"] = '''<ul> ''' + outputs["Result"]["value"] + '''</ul>'''

    return 3


def displayJSON(conf, inputs, outputs):
    default_dir = conf["main"]["dataPath"] + "/dirs/"
    original_dir = conf["main"]["dataPath"] + "/dirs/"
    label_dir = ""
    status = "closed"
    if 'state' in inputs and "value" in inputs["state"]:
        status = inputs["state"]["value"]
    if 'dir' in inputs and "value" in inputs["dir"] and str(inputs["dir"]["value"]) != "NULL":
        original_dir = getOriginalDir(conf, inputs["dir"]["value"])
        label_dir = inputs["dir"]["value"]
    try:
        if inputs["type"]:
            prefix = original_dir
            argument2 = ",'default'"
            suffix = "/"
    except:
        prefix = ""
        argument2 = ""
        suffix = ""
    try:
        tmp = mmListDir(original_dir)
    except:
        conf["lenv"]["message"] = "Unable to access the specified directory"
        return 4
    output = []
    i = 0
    j = 0
    for t in tmp:
        try:
            open(original_dir + "/" + t)
            hasValue = False
            if ('state' in inputs and "value" in inputs["state"] and inputs["state"]["value"] != "open") or not (
                    'state' in inputs) and mm_access.checkDataStorePriv(conf, (original_dir + "/" + t),
                                                                        "r") and os.path.isdir(original_dir + "/" + t):
                output.append({"id": (original_dir + "/").replace('/', '__') + t, "text": t, "state": "open"})
        except:
            if os.access(original_dir + "/" + t, os.X_OK) and len(t.split('.')) == 1 and mm_access.checkDataStorePriv(
                    conf, (original_dir + "/"), "r"):
                j += 1
                hasValue = True
                output.append({"id": (original_dir + "/").replace('/', '__') + t, "text": t, "state": status})
        i += 1
    outputs["Result"]["value"] = json.dumps(output)
    return 3


def load(conf, inputs, outputs):
    a = inputs["name"]["value"]
    a = a.replace("__", "/")
    b = a[1:len(a) - 1].split("/")
    # print >> sys.stderr, a[0:len(a)-1]
    # print >> sys.stderr, b[len(b)-1]
    outputs["Result"]["value"] = json.dumps({"name": b[len(b) - 1], "link": os.readlink(a[0:len(a) - 1])})
    return 3


def image(conf, inputs, outputs):
    outputs["Result"]["value"] = open(inputs["file"]["value"], mode="rb").read()
    return zoo.SERVICE_SUCCEEDED


def details(conf, inputs, outputs):
    import time
    a = inputs["name"]["value"]
    a = a.replace("__", "/")
    b = a[1:len(a)].split("/")
    # print >> sys.stderr, a[0:len(a)-1]
    # print >> sys.stderr, b[len(b)-1]
    link = os.readlink(a).replace("//", "/")
    if link[len(link) - 1] == "/":
        link = link[0:len(link) - 1]
    try:
        oloc = locale.getlocale(locale.LC_ALL)
        locale.setlocale(locale.LC_ALL, '')
    except:
        pass
    try:
        mTime = time.strftime(conf["mm"]["dateFormat"].encode(locale.getlocale()[1]),
                              time.localtime(os.path.getmtime(a))).decode(locale.getlocale()[1], "replace")
    except Exception as e:
        pass
        mTime = time.strftime(conf["mm"]["dateFormat"].encode("utf-8"), time.localtime(os.path.getmtime(a))).decode(
            "utf-8", "replace")
    try:
        locale.setlocale(locale.LC_ALL, oloc)
    except:
        pass

    res = {"name": b[len(b) - 1], "link": link, "date": mTime}
    outputs["Result"]["value"] = json.dumps(res, ensure_ascii=False)

    return 3


def delete(conf, inputs, outputs):
    a = conf["main"]["dataPath"] + "/dirs/" + inputs["name"]["value"]
    mapfile = a + "/ds_ows.map"
    if inputs["name"]["value"].count(conf["main"]["dataPath"]) > 0:
        a = inputs["name"]["value"]
        mapfile = a + "/ds_ows.map"
        a = a[0:len(a) - 1]
    try:
        os.unlink(mapfile)
        os.unlink(a)
    except:
        er = sys.exc_info()
        conf["lenv"]["message"] = "Unable to drop directory (" + a[0:len(a) - 1] + "): " + er[1][1]
        return 4
    outputs["Result"]["value"] = "Datastore deleted"
    return 3


def getDirSize(folder):
    folder_size = 0
    print("==============================\n" + str(folder_size), file=sys.stderr)
    for (path, dirs, files) in os.walk(folder):
        print("==============================\n" + str(path), file=sys.stderr)
        print("==============================\n" + str(dirs), file=sys.stderr)
        print("==============================\n" + str(files), file=sys.stderr)
        for i in files:
            print("==============================\n" + str(i), file=sys.stderr)
            filename = os.path.join(path, i)
            print(
                "==============================\n" + str(path) + " " + filename + " " + str(os.path.getsize(filename)),
                file=sys.stderr)
            try:
                folder_size += os.path.getsize(filename)
            except:
                pass
    return folder_size


def getFormatedSize(size):
    Sizes = ['K', 'M', 'G', 'T']
    c = -1
    result = size
    if result != 0:
        for i in Sizes:
            if result / 1024.0 >= 1:
                c += 1
                result /= 1024.0
            else:
                break
    if c >= 0:
        return str(round(result)) + " " + Sizes[c] + "B"
    else:
        return str(result) + " B"


def cleanup(conf, inputs, outputs):
    import os
    nms = {"postgis": "PostGIS", "mysql": "MySQL", "wfs": "WFS", "wms": "WMS"}
    try:
        tmp = list(nms.keys())
        tmp0 = inputs["dsName"]["value"].split(":")
        if tmp.count(inputs["dsType"]["value"].lower()) == 0:
            os.unlink(inputs["dsName"]["value"] + "/ds_ows.map")
        else:
            if len(tmp0) >= 2:
                os.unlink(
                    conf["main"]["dataPath"] + "/" + nms[inputs["dsType"]["value"]] + "/" + tmp0[1] + "ds_ows.map")
            else:
                os.unlink(conf["main"]["dataPath"] + "/" + inputs["dsType"]["value"] + "/" + inputs["dsName"][
                    "value"] + "ds_ows.map")
    except Exception as e:
        conf["lenv"]["message"] = "Dir cleaned up failed: " + str(e)
        return 4
        pass
    outputs["Result"]["value"] = "Dir cleaned up"
    return 3
