import sys
import os
import shutil
import osgeo.ogr
# import libxslt
from lxml import etree
import zoo


def load(conf, inputs, outputs):
    # To define
    values = "{"
    try:
        import os
        pl = inputs["name"]["value"].split(":")
        zoo.info(str(pl))
        zoo.info(conf["main"]["dataPath"] + "/" + pl[0].upper() + "/" + pl[1])
        if os.path.exists(conf["main"]["dataPath"] + "/" + pl[0].upper() + "/" + pl[1] + ".txt"):
            values += '"name": "' + pl[1] + '"'
    except Exception as e:
        zoo.error(str(e))
        conf["lenv"]["message"] = zoo._("Unable to parse the file")
        return 4
    outputs["Result"]["value"] = values + ', "link": "' + inputs["name"]["value"] + '", "stype": "' + pl[0] + '"' + "}"
    return 3


def details(conf, inputs, outputs):
    res = {}
    try:
        import os
        pl = inputs["name"]["value"].split(":")
        if os.path.exists(conf["main"]["dataPath"] + "/" + pl[0].upper() + "/" + pl[1] + ".txt"):
            res["name"] = pl[1]
            res["stype"] = pl[0]
            f = open(conf["main"]["dataPath"] + "/" + pl[0].upper() + "/" + pl[1] + ".txt", 'r')
            res["link"] = f.read()
            f.close()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to parse the file")
        return 4
    import json
    outputs["Result"]["value"] = json.dumps(res)
    return 3


def delete(conf, inputs, outputs):
    try:
        os.unlink(conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".txt")
    except:
        conf["lenv"]["message"] = zoo._("Unable to access the Data Store configuration file to remove")
        return 4
    try:
        os.unlink(
            conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + "ds_ows.map")
        os.unlink(conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".mmpriv")
    except:
        pass
    outputs["Result"]["value"] = zoo._("Database ") + inputs["name"]["value"] + zoo._(
        " was successfully removed from the Data Stores")
    return 3


def save(conf, inputs, outputs):
    try:
        f = open(conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".txt", 'w')
    except:
        return 4
    try:
        f.write(inputs["url"]["value"] + "\n");
    except:
        return 4
    outputs["Result"]["value"] = zoo._("Data Store ") + inputs["name"]["value"] + zoo._(" created")
    return 3


def test(conf, inputs, outputs):
    try:
        if inputs["type"]["value"].upper() == "WMS":
            import osgeo.gdal
            ds = osgeo.gdal.Open(inputs["type"]["value"] + ":" + inputs["url"]["value"])
            ds.GetDriver()
        else:
            import osgeo.ogr
            ds = osgeo.ogr.Open(inputs["type"]["value"] + ":" + inputs["url"]["value"])
            ds.GetDriver()
        outputs["Result"]["value"] = zoo._("Test connecting the Data Store ") + inputs["name"]["value"] + zoo._(
            " run successfully")
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to access the Data Store:") + str(e)
        return zoo.SERVICE_FAILED


def display(conf, inputs, outputs):
    default_dir = conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/"
    original_dir = conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/"
    label_dir = ""
    try:
        tmp = os.listdir(original_dir)
    except:
        return 4
    try:
        outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir.split('/')[len(original_dir.split('/')) - 2].replace(".txt",
                                                                                                              "") + '''</a></span>'''
        outputs["Result"]["value"] = '''
    <ul id="wfsListing''' + label_dir + '''">
'''
    except:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir.replace(".txt", "") + '''</a></span>'''
        outputs["Result"]["value"] = '''
    <ul id="wfsListing''' + label_dir + '''">
'''

    i = 0
    j = 0
    for t in tmp:
        try:
            i += 1
            tmp1 = original_dir + t
            tmp1.index(".txt")
            if j > 0:
                outputs["Result"]["value"] += '''
    </li>
'''
            j += 1;
            outputs["Result"]["value"] += '''
    <li id="browseDirectoriesList''' + inputs["type"]["value"] + ''':''' + t.replace(".txt",
                                                                                     "") + '''" class="collapsable"'''
            outputs["Result"]["value"] += '''>'''
            outputs["Result"][
                "value"] += '''<div class="checker"><span><input type="checkbox" onclick="alert('ok');if(this.checked) Datawarehouse.loadDir(this.value,\'''' + \
                            inputs["type"]["value"] + '''\');else Datawarehouse.unloadDir(this.value);" value="''' + \
                            inputs["type"]["value"] + ''':''' + t.replace(".txt",
                                                                          "") + '''" name="" style="opacity: 0;" /></span></div>'''
            outputs["Result"]["value"] += '''<span class="file">''' + t.replace(".txt", "") + '''</span>
'''

        except:
            continue
    if len(tmp) > 0:
        outputs["Result"]["value"] += '''
    </li>
'''

    outputs["Result"]["value"] += '''
    </ul>
'''
    if j == 0:
        outputs["Result"]["value"] = ''' '''

    return 3


def displayJSON(conf, inputs, outputs):
    default_dir = conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/"
    original_dir = conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/"
    label_dir = ""
    try:
        tmp = os.listdir(original_dir)
    except:
        return 4
    try:
        outputs["Result"]["value"] = '''{ "name": "''' + original_dir.split('/')[
            len(original_dir.split('/')) - 2].replace(".txt", "") + '''", "sub_elements": [ '''
    except:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''{ "name": "''' + original_dir.replace(".txt",
                                                                                  "") + '''", "sub_elements": [ '''

    i = 0
    j = 0
    for t in tmp:

        try:
            i += 1
            tmp1 = original_dir + t
            tmp1.index(".txt")
            if j > 0:
                outputs["Result"]["value"] += ''', '''
            j += 1;
            outputs["Result"]["value"] += '''{"name": "''' + t.replace(".txt", "") + '''", "type": "''' + \
                                          inputs["type"]["value"] + '''"}'''
        except:
            continue

    outputs["Result"]["value"] += '''] }'''
    if j == 0:
        outputs["Result"]["value"] = ''' '''

    return 3
