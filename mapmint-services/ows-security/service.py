import zoo
import sys
import urllib.request, urllib.error, urllib.parse
from lxml import etree
from psycopg2.extensions import *
import authenticate.service as auth
from io import StringIO
from inspect import currentframe, getframeinfo
import mapscript

frameinfo = getframeinfo(currentframe())

myCookies = None


def get_linenumber():
    cf = currentframe()
    return cf.f_back.f_lineno


def CreateToken(conf, inputs, outputs):
    import time
    import shortInteger
    newNameId = str(time.time()).split('.')[0]
    name = shortInteger.shortURL(int(newNameId))
    prefix = auth.getPrefix(conf)
    req = "INSERT INTO " + prefix + "tokens (id_group,value) VALUES ((SELECT id from " + prefix + "groups WHERE name='" + inputs["group"]["value"] + "'),'" + name + "')"
    c = auth.getCon(conf)
    res = c.cur.execute(req)
    c.conn.commit()
    outputs["Result"]["value"] = name
    return zoo.SERVICE_SUCCEEDED


def validToken(con, prefix, token):
    req = "SELECT count(*) from " + prefix + "tokens WHERE value='" + token + "';"
    con.cur.execute(req)
    vals = con.cur.fetchone()
    if vals is not None and vals[0] > 0:
        return True
    return False


def getGroupFromToken(con, prefix, token):
    req = "SELECT name from " + prefix + "tokens," + prefix + "groups WHERE " + prefix + "tokens.id_group=" + prefix + "groups.id and value='" + token + "';"
    con.cur.execute(req)
    vals = con.cur.fetchone()
    if vals is not None:
        return vals[0]
    return None


def validIp(conf, con, prefix, oip, cType, names):
    mapfile = conf["main"]["dataPath"] + "/public_maps/project_" + names[0] + ".map"
    m = mapscript.mapObj(mapfile)
    ips = m.web.metadata.get("mm_access_ip")
    ip = None
    if ips is not None and ips != "":
        ip = ips.split(",")
    # PROJECT
    if cType == 0:
        elements = ip
    # LAYER
    elif cType == 1:
        l = m.getLayerByName(names[1])
        l.getMetadata("mm_access_ip")
        ip = None
        if ips is not None:
            ip = ips.split(",")
        elements = ip
    if elements is not None and len(elements) > 0:
        return elements.count(oip) > 0
    return True


def checkEntityPriv(conf, con, prefix, server, service, entity, priv, token):
    tmp = priv.split(",")
    fields = ""
    for i in range(0, len(tmp)):
        if fields != "":
            fields += " AND "
        fields += tmp[i]
    try:
        req = "SELECT " + fields + " from " + prefix + "servers," + prefix + "layer_privileges, " + prefix + "tokens WHERE tokens.id_group=layer_privileges.id_group AND id_protocol=(SELECT id from " + prefix + "protocols where name='" + service.upper() + "') AND layer_privileges.entity='" + entity + "' AND layer_privileges.id_server=servers.id and name='" + server + "' AND value='" + token + "';"
        # print(req, file=sys.stderr)
        con.cur.execute(req)
        vals = con.cur.fetchone()
        # print(vals, file=sys.stderr)
        if vals is not None:
            # print(vals[0], file=sys.stderr)
            return vals[0]
    except Exception as e:
        print(e, file=sys.stderr)
    return True


def getEntities(c, prefix, service, request):
    tr = "SELECT ename,pos,lname,id_category from " + prefix + "requests," + prefix + "request_protocol," + prefix + "protocols WHERE requests.id=request_protocol.id_request and protocols.id=request_protocol.id_protocol and upper(requests.name)='" + request.upper() + "' and protocols.name='" + service + "'"
    try:
        c.cur.execute(tr)
        return c.cur.fetchone()
    except:
        return None


def BasicRewrite(conf, inputs, outputs):
    # TODO: confirm assumption: inputs["Query"] is a Python 3 dictionary object
    # if list(inputs["Query"].keys()).count("fmimeType") == 0 and list(inputs["Query"].keys()).count("mimeType") > 0:
    if ("fmimeType" not in inputs["Query"]) and ("mimeType" in inputs["Query"]):
        inputs["Query"]["fmimeType"] = inputs["Query"]["mimeType"]
    # TODO: confirm assumption: inputs["Query"] is a Python 3 dictionary object
    # if list(inputs["Query"].keys()).count("fmimeType") > 0 and inputs["Query"]["fmimeType"].count("text/") == 0:
    if "fmimeType" in inputs["Query"] and ("text/" not in inputs["Query"]["fmimeType"]):
        outputs["Result"]["value"] = inputs["Query"]["value"]
        outputs["Result"]["mimeType"] = inputs["Query"]["fmimeType"]
        res = outputs["Result"].pop("encoding")
    else:
        outputs["Result"]["mimeType"] = "text/xml"
        c = auth.getCon(conf)
        prefix = auth.getPrefix(conf)
        sUrl = getUrl(conf, c, prefix, inputs["server"]["value"])
        # outputs["Result"]["value"]=inputs["Query"]["value"].replace(sUrl,conf["main"]["owsSecurityUrl"]+"?server="+inputs["server"]["value"]+"&amp;token="+inputs["token"]["value"])
        outputs["Result"]["value"] = inputs["Query"]["value"].replace(sUrl, conf["main"]["owsSecurityUrl"] + inputs["token"]["value"] + "/" + inputs["server"]["value"] + "/").replace('<AccessConstraints>none</AccessConstraints>',
                                                                                                                                                                                       '<wms:AccessConstraints xmlns:wms="http://www.opengis.net/wms" xmlns:ows_security="http://www.opengis.net/security/1.0" xmlns:ows="http://www.opengis.net/ows/1.1">https://www.opengis.net/def/security/1.0/cc/wms130</wms:AccessConstraints>')
        print('<wms:AccessConstraints xmlns:wms="http://www.opengis.net/wms" xmlns:ows_security="http://www.opengis.net/security/1.0" xmlns:ows="http://www.opengis.net/ows/1.1">https://www.opengis.net/def/security/1.0/cc/wms130</wms:AccessConstraints>', file=sys.stderr)
        outputs["Result"]["mimeType"] = inputs["Query"]["fmimeType"]
    return zoo.SERVICE_SUCCEEDED


tmpl = '''<?xml version="1.0"?>

<!DOCTYPE WMT_MS_Capabilities SYSTEM "http://schemas.opengis.net/wms/1.1.1/WMS_MS_Capabilities.dtd"[
<!--
==============================================================
OWS Common Security Extension to annotate security 
Definition of element ows:OperationsMetadata replicating the 
definition from the OWS Common Schema to become available as DTD
==============================================================
-->
<!ELEMENT VendorSpecificCapabilities (ows_security:SecurityExtendedCapabilities)>

<!ELEMENT ows_security:SecurityExtendedCapabilities (ows:OperationsMetadata+)>
<!ATTLIST ows_security:SecurityExtendedCapabilities xmlns:ows_security CDATA #FIXED "http://www.opengis.net/security/1.0">

<!ELEMENT ows:OperationsMetadata (ows:Operation*)>
<!ATTLIST ows:OperationsMetadata xmlns:ows CDATA #FIXED "http://www.opengis.net/ows/1.1">

<!ELEMENT ows:Operation (ows:DCP+) >
<!ATTLIST ows:Operation name CDATA #REQUIRED>

<!ELEMENT ows:DCP (ows:HTTP) >
<!ELEMENT ows:HTTP (ows:Get | ows:Post)+ >

<!ELEMENT ows:Get (ows:Constraint+)>
<!ATTLIST ows:Get xmlns:xlink CDATA #FIXED "http://www.w3.org/1999/xlink" xlink:type CDATA #FIXED "simple" xlink:href CDATA #REQUIRED >

<!ELEMENT ows:Post (ows:Constraint+)>
<!ATTLIST ows:Post xmlns:xlink CDATA #FIXED "http://www.w3.org/1999/xlink" xlink:type CDATA #FIXED "simple" xlink:href CDATA #REQUIRED >

<!ELEMENT ows:Constraint (ows:AllowedValues | ows:NoValues | ows:ValuesReference | ows:Meaning)+>
<!ATTLIST ows:Constraint name CDATA #REQUIRED>

<!ELEMENT ows:AllowedValues (ows:Value+)>

<!ELEMENT ows:Value (#PCDATA)>

<!ELEMENT ows:NoValues EMPTY>

<!ELEMENT ows:ValuesReference (#PCDATA)>
<!ATTLIST ows:ValuesReference reference CDATA #REQUIRED>

<!ELEMENT ows:Meaning (#PCDATA)>
<!ATTLIST ows:Meaning reference CDATA #REQUIRED>
]>
'''


def addWSSCSParam(conf, inputs, outputs):
    import json
    outputs["Result"]["value"] = outputs["Result"]["value"].replace('GetSchemaExtension"', 'GetSchemaExtension http://www.opengis.net/security/1.0 http://rs.tb13.secure-dimensions.de/schemas/ExtendedSecurityCapabilities.xsd" xmlns:xlink="http://www.w3.org/1999/xlink"')
    currentRequest = json.loads(inputs["original"]["value"])
    print(currentRequest, file=sys.stderr)
    request = {}
    # TODO: confirm assumption: "currentRequest" is a Python 3 dictionary object
    # for i in list(currentRequest.keys()):
    for i in currentRequest.keys():
        if i.lower() == "service":
            request["service"] = currentRequest[i]
        else:
            if i.lower() == "request":
                request["request"] = currentRequest[i]
            elif i.lower() == "version":
                request["version"] = currentRequest[i]
    if request["service"].upper() == "WMS":
        # TODO: confirm assumption: "request" is a Python 3 dictionary object
        # if list(request.keys()).count('version') == 0:
        if 'version' not in request:
            request["version"] = "1.3.0"
        # TODO: confirm assumption: "request" is a Python 3 dictionary object
        # if list(request.keys()).count('version') > 0 and request["version"] == "1.3.0":
        if ('version' in request) and request["version"] == "1.3.0":
            schemas = ' xmlns:wms="http://www.opengis.net/wms" xmlns:ows="http://www.opengis.net/ows/1.1"'
            outputs["Result"]["value"] = outputs["Result"]["value"].replace('<AccessConstraints>none</AccessConstraints>',
                                                                            '<wms:AccessConstraints xmlns:wms="http://www.opengis.net/wms" xmlns:ows_security="http://www.opengis.net/security/1.0" xmlns:ows="http://www.opengis.net/ows/1.1">https://www.opengis.net/def/security/1.0/cc/wms130</wms:AccessConstraints>')
        else:
            schemas = ""
            outputs["Result"]["value"] = outputs["Result"]["value"].replace('<WMT_MS_Capabilities', tmpl + '\n<WMT_MS_Capabilities').replace('<AccessConstraints>none</AccessConstraints>', '<AccessConstraints>https://www.opengis.net/def/security/1.0/cc/wms111</AccessConstraints>')
        context0 = etree.XML(outputs["Result"]["value"])
        requests = context0.xpath("/*/*/*[name()='Request']/*")
        strToReplace = ""
        print(requests, file=sys.stderr)
        for i in requests:
            name = i.xpath("name()")
            print(name, file=sys.stderr)
            protected = ["getmap", "getfeatureinfo"]
            if protected.count(name.lower()) > 0:
                strToReplace += '<ows:Operation name="' + name + '"><ows:DCP><ows:HTTP><ows:Get xlink:type="simple" xlink:href="' + conf["main"]["owsSecurityUrl"] + inputs["token"]["value"] + "/" + inputs["server"][
                    "value"] + "/" + '"><ows:Constraint name="urn:ogc:def:security:1.0:authentication"><ows:ValuesReference ows:reference="urn:ogc:def:security:authentication:ietf:2617:Basic"/><ows:Meaning ows:reference="https://www.tb13.secure-dimensions.de/authnCodeList#HTTP_BASIC"/></ows:Constraint><ows:Constraint name="urn:ogc:def:security:1.0:https"><ows:NoValues/></ows:Constraint><ows:Constraint name="urn:ogc:def:security:1.0:cors"><ows:NoValues/></ows:Constraint><ows:Constraint name="urn:ogc:def:security:1.0:exception-handling"><ows:NoValues/></ows:Constraint></ows:Get></ows:HTTP></ows:DCP></ows:Operation>'
            else:
                strToReplace += '<ows:Operation name="' + name + '"><ows:DCP><ows:HTTP><ows:Get xlink:type="simple" xlink:href="' + conf["main"]["owsSecurityUrl"] + inputs["token"]["value"] + "/" + inputs["server"][
                    "value"] + "/" + '"><ows:Constraint name="urn:ogc:def:security:1.0:https"><ows:NoValues/></ows:Constraint><ows:Constraint name="urn:ogc:def:security:1.0:cors"><ows:NoValues/></ows:Constraint><ows:Constraint name="urn:ogc:def:security:1.0:exception-handling"><ows:NoValues/></ows:Constraint></ows:Get></ows:HTTP></ows:DCP></ows:Operation>'
        toReplaceFinal = '<ows_security:ExtendedSecurityCapabilities xmlns:ows_security="http://www.opengis.net/security/1.0"' + schemas + '><ows:OperationsMetadata>' + strToReplace + '</ows:OperationsMetadata></ows_security:ExtendedSecurityCapabilities>'
        # TODO: confirm assumption: "request" is a Python 3 dictionary object
        # if list(request.keys()).count('version') == 0 or request["version"] != "1.3.0":
        if ("version" not in request) or request["version"] != "1.3.0":
            toReplaceFinal = '<VendorSpecificCapabilities>' + toReplaceFinal + '</VendorSpecificCapabilities>'

        outputs["Result"]["value"] = outputs["Result"]["value"].replace('</Exception>', '</Exception>' + toReplaceFinal)
    else:
        if request["service"].upper() == "WCS":
            conf["lenv"]["message"] = zoo._("Not allowed!")
            return zoo.SERVICE_FAILED

        outputs["Result"]["value"] = outputs["Result"]["value"].replace('<ows:AccessConstraints>none</ows:AccessConstraints>', '<ows:AccessConstraints>https://www.opengis.net/def/security/1.0/cc/owsCommon</ows:AccessConstraints>')
        context0 = etree.XML(outputs["Result"]["value"])
        # root=context0.getroot()
        print("******", file=sys.stderr)
        print(context0, file=sys.stderr)
        print(context0.attrib, file=sys.stderr)
        print("******", file=sys.stderr)
        #
        if outputs["Result"]["value"].count("http://www.opengis.net/ows/1.1") > 0:
            owsSchema = "http://www.opengis.net/ows/1.1"
        else:
            owsSchema = "http://www.opengis.net/ows"
        requests = context0.xpath("/*/*/*[name()='ows:Operation']/*")
        # if len(requests)==0:
        #    requests=context0.xpath("/*/*[name()='ows:Operation']/*")
        print(requests, file=sys.stderr)
        for j in requests:
            name = j.xpath("name()")
            requestName = j.xpath("./..")[0].attrib['name']
            if name == "ows:DCP":
                inrequests = j.xpath("./*/*")
                for k in inrequests:
                    print(k, file=sys.stderr)
                    print(k.attrib, file=sys.stderr)
                    names = ['urn:ogc:def:security:1.0:https', 'urn:ogc:def:security:1.0:cors', 'urn:ogc:def:security:1.0:exception-handling']
                    for i in names:
                        elem = etree.Element('{' + owsSchema + '}Constraint', dict(name=i))
                        etree.SubElement(elem, '{' + owsSchema + '}Value')
                        k.append(elem)
                    if requestName.count("Describe") == 0 and requestName.count("GetCapabilities") == 0:
                        names = ['urn:ogc:def:security:1.0:authentication']
                        for i in names:
                            elem = etree.Element('{' + owsSchema + '}Constraint', dict(name=i))
                            c0elem = etree.Element('{' + owsSchema + '}ValuesReference')
                            c0elem.attrib['{' + owsSchema + '}reference'] = "urn:ogc:def:security:authentication:ietf:2617:Basic"
                            elem.append(c0elem)
                            # etree.SubElement(elem,'{http://www.opengis.net/ows}ValuesReference')
                            c1elem = etree.Element('{' + owsSchema + '}Meaning')
                            c1elem.attrib['{' + owsSchema + '}reference'] = "https://www.tb13.secure-dimensions.de/authnCodeList#HTTP_BASIC"
                            elem.append(c1elem)
                            # etree.SubElement(elem,'{http://www.opengis.net/ows}Meaning')
                            k.append(elem)
            print(name, file=sys.stderr)
        outputs["Result"]["value"] = etree.tostring(context0, pretty_print=True)


def SecureResponse(conf, inputs, outputs):
    c = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    sUrl = getUrl(conf, c, prefix, inputs["server"]["value"])
    # print(" ** ", file=sys.stderr)
    # print(inputs, file=sys.stderr)
    # print(" ** ", file=sys.stderr)

    if sUrl is None:
        conf["lenv"]["message"] = zoo._("No server found.")
        return zoo.SERVICE_FAILED
    # TODO: confirm assumption: inputs["Query"] is a Python 3 dictionary object
    # if list(inputs["Query"].keys()).count("fmimeType") == 0 and list(inputs["Query"].keys()).count("mimeType") > 0:
    if ("fmimeType" not in inputs["Query"]) and ("mimeType" in inputs["Query"]):
        inputs["Query"]["fmimeType"] = inputs["Query"]["mimeType"]
        outputs["Result"]["mimeType"] = inputs["Query"]["fmimeType"]
        if inputs["Query"]["fmimeType"] != "text/xml":
            outputs["Result"]["value"] = inputs["Query"]["value"]
            outputs["Result"]["mimeType"] = inputs["Query"]["fmimeType"]
            return zoo.SERVICE_SUCCEEDED
    vals = getEntities(c, prefix, inputs["service"]["value"], "GetCapabilities")
    if vals is not None:
        context = etree.iterparse(StringIO(inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n', '')), events=('end',), tag='{*}' + vals[0])
    else:
        context = []
    lName = "Name"
    toRemove = []
    for event, elem in context:
        try:
            if inputs["service"]["value"] == "WPS":
                context0 = etree.iterparse(StringIO(etree.tostring(elem)), events=('end',), tag='{*}Identifier')
                lName = "Identifier"
            else:
                context0 = etree.iterparse(StringIO(etree.tostring(elem)), events=('end',), tag='{*}Name')
            for event, elem in context0:
                print(elem.text.encode('utf-8'), file=sys.stderr)
                if not (checkEntityPriv(conf, c, prefix, inputs["server"]["value"], inputs["service"]["value"], elem.text.encode('utf-8'), "r", inputs["token"]["value"])):
                    toRemove += [elem.text.encode('utf-8')]
        except Exception as e:
            print(e, file=sys.stderr)
            print('%s <=> %s' % (elem.tag, elem.text), file=sys.stderr)
        elem.clear()
        while elem.getprevious() is not None:
            del elem.getparent()[0]

    doc = etree.fromstring(inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n', ''))
    nsp = doc.nsmap
    print(toRemove, file=sys.stderr)
    if len(toRemove) > 0:
        for i in range(0, len(toRemove)):
            try:
                elems = doc.xpath('//' + inputs["service"]["value"].lower() + ':' + vals[0] + '/ows:' + lName + '[text()="' + toRemove[i] + '"]',
                                  namespaces=doc.nsmap)
            except Exception as e:
                print(doc.nsmap, file=sys.stderr)
                print(e, file=sys.stderr)
                elems = doc.xpath('//*[text()="' + toRemove[i] + '"]')
            for a in elems:
                a.getparent().getparent().remove(a.getparent())
                break
    print(inputs["original"], file=sys.stderr)
    # outputs["Result"]["value"]=etree.tostring(doc).replace(sUrl,conf["main"]["owsSecurityUrl"]+"?server="+inputs["server"]["value"]+"&amp;token="+inputs["token"]["value"])
    outputs["Result"]["value"] = etree.tostring(doc).replace(sUrl + "&amp;", conf["main"]["owsSecurityUrl"] + inputs["token"]["value"] + "/" + inputs["server"]["value"] + "/?")
    addWSSCSParam(conf, inputs, outputs)
    # TODO: confirm assumption: inputs["Query"] is a Python 3 dictionary object
    # if list(inputs["Query"].keys()).count("fmimeType") == 0 and list(inputs["Query"].keys()).count("mimeType") > 0:
    if ("fmimeType" not in inputs["Query"]) and ("mimeType" in inputs["Query"]):
        inputs["Query"]["fmimeType"] = inputs["Query"]["mimeType"]
    if inputs["Query"]["fmimeType"].count('application/vnd.ogc.wms_xml') > 0:
        outputs["Result"]["mimeType"] = "text/xml"
    else:
        outputs["Result"]["mimeType"] = inputs["Query"]["fmimeType"]  # "text/xml"
    return zoo.SERVICE_SUCCEEDED


def checkDataStorePriv(conf, con, prefix, server, service, priv, token):
    tmp = priv.split(",")
    fields = ""
    for i in range(0, len(tmp)):
        if fields != "":
            fields += " AND "
        fields += tmp[i]
    req = "SELECT " + fields + " from " + prefix + "servers," + prefix + "server_privileges, " + prefix + "tokens WHERE tokens.id_group=server_privileges.id_group AND id_protocol=(SELECT id from " + prefix + "protocols where name='" + service.upper() + "') AND server_privileges.id_server=servers.id and name='" + server + "' AND value='" + token + "';"
    try:
        con.cur.execute(req)
        vals = con.cur.fetchone()
        if vals is not None:
            return vals[0]
        else:
            return True
    except Exception as e:
        print(e, file=sys.stderr)
    return False


def getUrl(conf, con, prefix, server):
    return conf["main"]["owsMapserverAddress"] + "?map=" + conf["main"]["dataPath"] + "/public_maps/project_" + server + ".map"
    req = "SELECT url from " + prefix + "servers WHERE name=%s" % adapt(server)
    try:
        res = con.cur.execute(req)
        vals = con.cur.fetchone()
        sUrl = vals[0]
    except Exception as e:
        conf["lenv"]["message"] = str(e)
        sUrl = None
    return sUrl


def tryIdentifyUser(conf, user, password):
    global myCookies
    if user is not None and user != "" and password is not None and password != "":
        import authenticate.service as auth
        outputs = {"Result": {"value": ""}}
        res = auth.clogIn(conf, {"login": {"value": user}, "password": {"value": password}, "no-trace": {"value": None}}, outputs)
        if res == zoo.SERVICE_SUCCEEDED:
            return True
        else:
            return False
    return False


def SecureAccess(conf, inputs, outputs):
    global myCookies
    mapfile = conf["main"]["dataPath"] + "/public_maps/project_" + inputs["server"]["value"] + ".map"
    try:
        myMap = mapscript.mapObj(mapfile)
    except:
        conf["lenv"]["message"] = zoo._("Unable to find any project with this name!")
        return zoo.SERVICE_FAILED
    c = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    if not (validToken(c, prefix, inputs["token"]["value"])):
        conf["lenv"]["message"] = zoo._("Unable to validate your token!")
        return zoo.SERVICE_FAILED
    if not (validIp(conf, c, prefix, inputs["ip"]["value"], 0, [inputs["server"]["value"]])):
        conf["lenv"]["message"] = zoo._("You are not allowed to access the ressource using this ip address!")
        return zoo.SERVICE_FAILED
    q = None
    if inputs["Query"]["mimeType"] == "application/json":
        import json
        q = json.loads(inputs["Query"]["value"])
    myAutorizedGroups = myMap.web.metadata.get('mm_access_groups').split(',')
    if myAutorizedGroups.count('public') == 0 and not (q is None or q["request"].upper() == "GETCAPABILITIES" or q["request"].upper() == "GETLEGENDGRAPHIC") and not (tryIdentifyUser(conf, inputs["user"]["value"], inputs["password"]["value"])):
        conf["lenv"]["message"] = zoo._("You are not allowed to access the ressource using this user / password!")
        conf["lenv"]["status_code"] = "401 Unauthorized"
        print(conf["lenv"], file=sys.stderr)
        return zoo.SERVICE_FAILED
    # TODO: confirm assumption: "conf" is a Python 3 dictionary object
    # if list(conf.keys()).count("senv") == 0:
    if "senv" not in conf:
        conf["senv"] = {"group": getGroupFromToken(c, prefix, inputs["token"]["value"])}
    else:
        print(conf["senv"], file=sys.stderr)
    try:
        myCurrentGroups = conf["senv"]["group"].split(',')
    except Exception as e:
        myCurrentGroups = []
    isAuthorized = False
    print(" ****** ", file=sys.stderr)
    print(myCurrentGroups, file=sys.stderr)
    print(myAutorizedGroups, file=sys.stderr)
    print(" ****** ", file=sys.stderr)
    for i in range(len(myCurrentGroups)):
        if myAutorizedGroups.count(myCurrentGroups[i]) > 0:
            isAuthorized = True
            break
    if not (isAuthorized):
        conf["lenv"]["message"] = zoo._("Your group is not allowed to access the ressource!")
        conf["lenv"]["status_code"] = "403 Forbidden"
        return zoo.SERVICE_FAILED
    if myCookies is not None:
        print(" ** COOKIES", file=sys.stderr)
        print(myCookies, file=sys.stderr)
        print(" ** COOKIES", file=sys.stderr)
    sUrl = getUrl(conf, c, prefix, inputs["server"]["value"])
    secureQuery = \
        '<wps:Execute service="WPS" version="1.0.0" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ../wpsExecute_request.xsd">' + \
        '<ows:Identifier>ows-security.[Identifier]</ows:Identifier>' + \
        '<wps:DataInputs>' + \
        '<wps:Input>' + \
        '<ows:Identifier>original</ows:Identifier>' + \
        '<wps:Data>' + \
        '[_oquery_]' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>server</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[_server_]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>service</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[_service_]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>request</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[_request_]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>token</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[_token_]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>Query</ows:Identifier>' + \
        '[_query_]' + \
        '</wps:Input>' + \
        '</wps:DataInputs>' + \
        '<wps:ResponseForm>' + \
        '<wps:RawDataOutput>' + \
        '<ows:Identifier>Result</ows:Identifier>' + \
        '</wps:RawDataOutput>' + \
        '</wps:ResponseForm>' + \
        '</wps:Execute>'
    try:
        if sUrl is None:
            return zoo.SERVICE_FAILED
    except Exception as e:
        print(frameinfo.filename, get_linenumber(), file=sys.stderr)
        print(e, file=sys.stderr)
    print(" +++++++++++++++++++ " + inputs["Query"]["mimeType"], file=sys.stderr)
    if inputs["Query"]["mimeType"] == "application/json":
        import json
        q = json.loads(inputs["Query"]["value"])
        lkeys = list(q.keys())
        for i in range(0, len(lkeys)):
            if lkeys[i].lower() != lkeys[i]:
                q[lkeys[i].lower()] = q[lkeys[i]]
        # TODO: confirm assumption: "conf" is a Python 3 dictionary object
        # if list(q.keys()).count("request") == 0:
        if "request" not in q:
            conf["lenv"]["message"] = zoo._("Parameter &lt;request&gt; was missing")
            return zoo.SERVICE_FAILED
        # TODO: confirm assumption: "q" is a Python 3 dictionary object
        # if list(q.keys()).count("service") == 0:
        if "service" not in q:
            if q["request"].upper() == "GETMAP" or q["request"].upper() == "GETFEATUREINFO":
                q["service"] = "WMS"
            else:
                conf["lenv"]["message"] = zoo._("Parameter &lt;service&gt; was missing")
                return zoo.SERVICE_FAILED
        if not (checkDataStorePriv(conf, c, prefix, inputs["server"]["value"], q["service"], "r,x", inputs["token"]["value"])):
            conf["lenv"]["message"] = zoo._("You're not allowed to access this ressource. Please contact your system administrator for more informations on access restriction settings.")
            return zoo.SERVICE_FAILED
        vals = getEntities(c, prefix, q["service"], q["request"])

        if vals is None or (vals is not None and vals[1] >= 0):
            sUrl1 = ""
            # TODO: confirm assumption: "q" is a Python 3 dictionary object
            # for i in list(q.keys()):
            for i in q.keys():
                if sUrl1 != "":
                    sUrl1 += "&amp;"
                sUrl1 += i + "=" + q[i]
            if sUrl.count("?"):
                sUrl1 = sUrl + "&amp;" + sUrl1
            else:
                sUrl1 = sUrl + "?" + sUrl1

            xmlQuery = secureQuery.replace("[_oquery_]", '<wps:ComplexData mimeType="application/json"><![CDATA[' + inputs["Query"]["value"] + ']]></wps:ComplexData>') \
                .replace("[_server_]", inputs["server"]["value"]) \
                .replace("[_service_]", q["service"]) \
                .replace("[_request_]", q["request"]) \
                .replace("[_token_]", inputs["token"]["value"]) \
                .replace("[_query_]", '<wps:Reference xlink:href="' + sUrl1 + '" mimeType="text/xml" />') \
                .replace("[Identifier]", "SecureResponse")

            req = urllib.request.Request(
                url=conf["main"]["owsServerAddress"],  # rserverAddress"],
                data=xmlQuery,
                headers={'Content-Type': 'text/xml', "Cookie": myCookies}
            )
            try:
                response = urllib.request.urlopen(req)
                outputs["Result"]["value"] = response.read()
            except Exception as e:
                conf["lenv"]["message"] = str(e.read())
                return zoo.SERVICE_FAILED
            lkeys = list(response.headers.keys())
            lvalues = list(response.headers.values())
            useDefault = True
            for i in range(0, len(lkeys)):
                # print(" --------- KEY : "+lkeys[i], file=sys.stderr)
                if "content-type" == lkeys[i]:  # and lvalues[i].count("text/")==0:
                    useDefault = False
                    outputs["Result"]["mimeType"] = lvalues[i]
                    res = outputs["Result"].pop("encoding")
                    break
            if useDefault:
                outputs["Result"]["mimeType"] = "text/xml"
            # print(dir(response), file=sys.stderr)
            # outputs["Result"]["mimeType"]="text/xml"
            response.close()
            # TODO: confirm assumption: "conf" is a Python 3 dictionary object
            # if list(conf.keys()).count("senv") > 0:
            if "senv" in conf:
                conf.pop("senv", None)
            return zoo.SERVICE_SUCCEEDED
        else:
            if vals[1] < 0:
                print("Should treat before requesting the server", file=sys.stderr)
                sUrl1 = ""
                # TODO: confirm assumption: "q" is a Python 3 dictionary object
                # for i in list(q.keys()):
                for i in q.keys():
                    if sUrl1 != "":
                        sUrl1 += "&amp;"
                    if i.upper().count(vals[0].upper()) == 0:
                        sUrl1 += i + "=" + q[i]
                    else:
                        tmp = q[i].split(',')
                        values = ""
                        for j in range(0, len(tmp)):
                            priv = "r"
                            if vals[3] == 2:
                                priv += ",w"
                            if vals[3] == 3:
                                priv += ",x"
                            if checkEntityPriv(conf, c, prefix, inputs["server"]["value"], q["service"], tmp[j], priv, inputs["token"]["value"]):
                                if values != "":
                                    values += ","
                                values += tmp[j]
                        sUrl1 += i + "=" + values
                if sUrl.count("?"):
                    sUrl1 = sUrl + "&amp;" + sUrl1
                else:
                    sUrl1 = sUrl + "?" + sUrl1
                print(sUrl1, file=sys.stderr)

                xmlQuery = secureQuery.replace("[_oquery_]", '<wps:ComplexData mimeType="application/json"><![CDATA[' + inputs["Query"]["value"] + ']]></wps:ComplexData>') \
                    .replace("[_server_]", inputs["server"]["value"]) \
                    .replace("[_service_]", q["service"]) \
                    .replace("[_request_]", q["request"]) \
                    .replace("[_token_]", inputs["token"]["value"]) \
                    .replace("[_query_]", '<wps:Reference xlink:href="' + sUrl1 + '" mimeType="text/xml" />') \
                    .replace("[Identifier]", "BasicRewrite")

                req = urllib.request.Request(
                    url=conf["main"]["serverAddress"],
                    data=xmlQuery,
                    headers={'Content-Type': 'text/xml'}
                )
                response = urllib.request.urlopen(req)
                outputs["Result"]["value"] = response.read()
                lkeys = list(response.headers.keys())
                lvalues = list(response.headers.values())
                useDefault = True
                for i in range(0, len(lkeys)):
                    # print(" --------- KEY : "+lkeys[i]+" "+lvalues[i], file=sys.stderr)
                    if "content-type" == lkeys[i]:  # and lvalues[i].count("text/")==0:
                        useDefault = False
                        outputs["Result"]["mimeType"] = lvalues[i]
                        res = outputs["Result"].pop("encoding")
                        break
                if useDefault:
                    outputs["Result"]["mimeType"] = "text/xml"
                response.close()
                # TODO: confirm assumption: "conf" is a Python 3 dictionary object
                # if list(conf.keys()).count("senv") > 0:
                if "senv" in conf:
                    conf.pop("senv", None)

                return zoo.SERVICE_SUCCEEDED
    else:
        inputs["Query"]["value"] = inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>', '').replace('\n', '')
        doc = etree.fromstring(inputs["Query"]["value"])
        req = doc.tag.split("}")
        if len(req) > 0:
            req = req[len(req) - 1]
        else:
            req = doc.tag
        vals = getEntities(c, prefix, doc.attrib["service"], req)
        if vals is None or vals[1] >= 0:
            xmlQuery = secureQuery.replace("[_oquery_]", '<wps:ComplexData mimeType="application/json"><![CDATA[;]]></wps:ComplexData>') \
                .replace("[_server_]", inputs["server"]["value"]) \
                .replace("[_service_]", doc.attrib["service"]) \
                .replace("[_request_]", req) \
                .replace("[_token_]", inputs["token"]["value"]) \
                .replace("[_query_]", '<wps:Reference xlink:href="' + sUrl + '" mimeType="text/xml" method="POST"><Header key="Content-Type" value="text/xml" /><Body>' + inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>', '').replace('\n', '') + '</Body></wps:Reference>') \
                .replace("[Identifier]", "SecureResponse")

            req = urllib.request.Request(
                url=conf["main"]["serverAddress"],
                data=xmlQuery,
                headers={'Content-Type': 'text/xml'}
            )
            response = urllib.request.urlopen(req)
            outputs["Result"]["value"] = response.read()
            lkeys = list(response.headers.keys())
            lvalues = list(response.headers.values())
            useDefault = True
            for i in range(0, len(lkeys)):
                if "content-type" == lkeys[i] and lvalues[i].count("text/") == 0:
                    useDefault = False
                    outputs["Result"]["mimeType"] = lvalues[i]
                    res = outputs["Result"].pop("encoding")
                    break
            if useDefault:
                outputs["Result"]["mimeType"] = "text/xml"
            # outputs["Result"]["mimeType"]="text/xml"
            response.close()
            # TODO: confirm assumption: "conf" is a Python 3 dictionary object
            # if list(conf.keys()).count("senv") > 0:
            if "senv" in conf:
                conf.pop("senv", None)
            return zoo.SERVICE_SUCCEEDED
        else:
            if vals[1] < 0:
                print("Should treat before requesting the server", file=sys.stderr)
                sUrl1 = ""
                if doc.attrib["service"].upper() == "WFS":
                    expr = "//*[@" + vals[2] + "]"
                    res = doc.xpath(expr)
                else:
                    context = etree.iterparse(StringIO(inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n', '')), events=('end',), tag='{*}' + vals[0])
                    res = []
                    for event, elem in context:
                        context0 = etree.iterparse(StringIO(etree.tostring(elem)), events=('end',), tag='{*}Identifier')
                        lName = "Identifier"
                        for event, elem in context0:
                            if not (checkEntityPriv(conf, c, prefix, inputs["server"]["value"], inputs["service"]["value"], elem.text.encode('utf-8'), "r", inputs["token"]["value"])):
                                res += [elem]

                lName = "Name"
                toRemove = []
                for i in res:
                    priv = "r"
                    if vals[3] == 2:
                        priv += ",w"
                    if vals[3] == 3:
                        priv += ",x"
                    if doc.attrib["service"].upper() == "WFS":
                        pval = i.attrib[vals[2]]
                        node = i
                    else:
                        pval = i.text()
                        node = i.getparent()
                    if not (checkEntityPriv(conf, c, prefix, inputs["server"]["value"], doc.attrib["service"], pval, priv, inputs["token"]["value"])):
                        doc.remove(node)

                xmlQuery = secureQuery.replace("[_oquery_]", '<wps:ComplexData mimeType="application/json"><![CDATA[' + inputs["Query"]["value"] + ']]></wps:ComplexData>') \
                    .replace("[_server_]", inputs["server"]["value"]) \
                    .replace("[_service_]", doc.attrib["service"]) \
                    .replace("[_request_]", req) \
                    .replace("[_token_]", inputs["token"]["value"]) \
                    .replace("[_query_]", '<wps:Reference xlink:href="' + sUrl + '" mimeType="text/xml" method="POST"><Header key="Content-Type" value="text/xml" /><Body>' + etree.tostring(doc) + '</Body></wps:Reference>') \
                    .replace("[Identifier]", "BasicRewrite")

                req = urllib.request.Request(
                    url=conf["main"]["serverAddress"],
                    data=xmlQuery,
                    headers={'Content-Type': 'text/xml'}
                )
                try:
                    response = urllib.request.urlopen(req)
                except Exception as e:
                    conf["lenv"]["message"] = zoo._("Unable to access the ressource: " + str(e))
                    return zoo.SERVICE_FAILED
                outputs["Result"]["value"] = response.read()
                lkeys = list(response.headers.keys())
                lvalues = list(response.headers.values())
                useDefault = True
                for i in range(0, len(lkeys)):
                    if "content-type" == lkeys[i] and lvalues[i].count("text/") == 0:
                        useDefault = False
                        outputs["Result"]["mimeType"] = lvalues[i]
                        res = outputs["Result"].pop("encoding")
                        break
                if useDefault:
                    outputs["Result"]["mimeType"] = "text/xml"
                response.close()
                # TODO: confirm assumption: "conf" is a Python 3 dictionary object
                # if list(conf.keys()).count("senv") > 0:
                if "senv" in conf:
                    conf.pop("senv", None)
                return zoo.SERVICE_SUCCEEDED
        conf["lenv"]["message"] = "Not yet implemented"
        return zoo.SERVICE_FAILED
