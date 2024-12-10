import zoo
import sys
import os
import shutil

import osgeo.ogr
from lxml import etree

def createConString(conf,inputs,outputs):
    if not(conf["main"]["dbuser"] in conf):
        return str(None)
    xcontent = '<connection><dbname>' + conf[conf["main"]["dbuser"]]["dbname"] + '</dbname><user>' + \
        conf[conf["main"]["dbuser"]]["user"] + '</user><password>' + \
        conf[conf["main"]["dbuser"]]["password"] + '</password><host>' + \
        conf[conf["main"]["dbuser"]]["host"] + '</host><port>' + \
        conf[conf["main"]["dbuser"]]["port"] + '</port></connection>'
    doc = etree.fromstring(xcontent)
    styledoc = etree.parse(conf["main"]["dataPath"] + "/" + conf[conf["main"]["dbuser"]]["type" ]+ "/conn.xsl")
    style = etree.XSLT(styledoc)
    result = style(doc)
    return str(result).replace(conf[conf["main"]["dbuser"]]["type"]+":","")


def test(conf, inputs, outputs):
    xcontent = '<connection><dbname>' + inputs["dbname"]["value"] + '</dbname><user>' + inputs["user"][
        "value"] + '</user><password>' + inputs["password"]["value"] + '</password><host>' + inputs["host"][
                   "value"] + '</host><port>' + inputs["port"]["value"] + '</port></connection>'
    doc = etree.fromstring(xcontent)
    styledoc = etree.parse(conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/conn.xsl")
    style = etree.XSLT(styledoc)
    result = style(doc)
    ds = osgeo.ogr.Open(str(result))
    if ds is None:
        conf["lenv"]["message"] = zoo._("Unable to connect to ") + inputs["name"]["value"]
        return 4
    else:
        outputs["Result"]["value"] = zoo._("Connection to ") + str(inputs["name"]["value"]) + zoo._(
            " successfull")
    ds = None
    return 3


def load(conf, inputs, outputs):
    # To define
    dbParams = ['dbname', 'user', 'password', 'host', 'port']
    values = "{"
    try:
        #parse_options = libxml2.XML_PARSE_DTDLOAD + libxml2.XML_PARSE_NOENT
        #libxml2.initParser()
        xqf = etree.parse(
            conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".xml")
        cnt = 0
        for j in dbParams:
            try:
                items = xqf.xpath("/connection/" + j)
                for i in items:
                    if cnt > 0:
                        values += ', '
                    values += '"' + str(j)  + '": "' + i.text + '"'
                    cnt += 1
            except Exception as e:
                zoo.error(str(e))
                values += '"' + j + '": ""'
                cnt += 1
                pass
    except Exception as e:
        zoo.error(str(e))
        conf["lenv"]["message"] = zoo._("Unable to parse the file")
        return 4
    outputs["Result"]["value"] = values + ', "name": "' + inputs["name"]["value"] + '", "stype": "' + inputs["type"][
        "value"] + '"' + "}"
    return 3


def details(conf, inputs, outputs):
    dbParams = ['dbname', 'user', 'password', 'host', 'port']
    res = {}
    values = "{"
    try:
        xqf = etree.parse(
            conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".xml"
            )
        cnt = 0
        for j in dbParams:
            try:
                items = xqf.xpath("/connection/" + j)
                for i in items:
                    res[i.name] = str(i.text)
            except:
                res[j] = ""
                pass
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to parse the file: ") + str(e)
        return zoo.SERVICE_FAILED
    import json
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def delete(conf, inputs, outputs):
    try:
        os.unlink(conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".xml")
        os.unlink(
            conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + "ds_ows.map")
    except:
        conf["lenv"]["message"] = zoo._("Unable to access the database configuration file to remove")
        return 4
    outputs["Result"]["value"] = zoo._("Database ") + inputs["name"]["value"] + zoo._(
        " was successfully removed from the Datastores")
    return 3


def save(conf, inputs, outputs):
    try:
        f = open(conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/" + inputs["name"]["value"] + ".xml", 'w')
    except:
        return 4
    try:
        f.write("<connection><dbname>" +
                inputs["dbname"]["value"]
                + "</dbname><user>" +
                inputs["user"]["value"]
                + "</user><password>" +
                inputs["password"]["value"]
                + "</password><host>" +
                inputs["host"]["value"]
                + "</host><port>" +
                inputs["port"]["value"]
                + "</port></connection>");
    except:
        return 4
    outputs["Result"]["value"] = "File " + inputs["name"]["value"] + " created"
    return 3


def displayJson(conf, inputs, outputs):
    default_dir = conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/"
    original_dir = conf["main"]["dataPath"] + "/" + inputs["type"]["value"] + "/"
    label_dir = ""
    res = {}
    try:
        tmp = os.listdir(original_dir)
    except:
        return 4
    try:
        res["name"] = original_dir.split('/')[len(original_dir.split('/')) - 2].replace(".xml", "")
        res["sub_elements"] = []
    except:
        if original_dir != default_dir:
            res["name"] = original_dir.replace(".xml", "")
            res["sub_elements"] = []
    j = 0
    for t in tmp:
        try:
            tmp1 = original_dir + t
            tmp1.index(".xml")
            j += 1;
            res["sub_elements"] += [{"name": t.replace(".xml", ""), "type": inputs["type"]["value"]}]
        except Exception as e:
            zoo.error(str(e))
            continue

    import json
    outputs["Result"]["value"] = json.dumps(res);
    return zoo.SERVICE_SUCCEEDED


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
     <span class="folder"><a href="#">''' + original_dir.split('/')[len(original_dir.split('/')) - 2].replace(".xml",
                                                                                                              "") + '''</a></span>'''
        outputs["Result"]["value"] = '''
    <ul id="postgisListing''' + label_dir + '''">
'''
    except:
        if original_dir != default_dir:
            outputs["Result"]["value"] = '''
     <span class="folder"><a href="#">''' + original_dir.replace(".xml", "") + '''</a></span>'''
        outputs["Result"]["value"] = '''
    <ul id="postgisListing''' + label_dir + '''">
'''

    i = 0
    j = 0
    for t in tmp:

        try:
            i += 1
            tmp1 = original_dir + t
            tmp1.index(".xml")
            if j > 0:
                outputs["Result"]["value"] += '''
    </li>
'''
            j += 1;
            outputs["Result"]["value"] += '''
    <li id="browseDirectoriesList''' + t.replace(".xml", "") + '''" class="collapsable"'''
            outputs["Result"]["value"] += '''>'''
            outputs["Result"][
                "value"] += '''<div class="checker"><span><input type="checkbox" onclick="if(this.checked) Datawarehouse.loadDir(this.value,\'''' + \
                            inputs["type"][
                                "value"] + '''\');else Datawarehouse.unloadDir(this.value);" value="''' + t.replace(
                ".xml", "") + '''" name="" style="opacity: 0;" /></span></div>'''
            outputs["Result"]["value"] += '''<span class="file">''' + t.replace(".xml", "") + '''</span>
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
