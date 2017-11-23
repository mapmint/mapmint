import zoo
import sys
import urllib2
from lxml import etree
from psycopg2.extensions import *
import authenticate.service as auth
from StringIO import StringIO
from inspect import currentframe, getframeinfo
import mapscript

frameinfo = getframeinfo(currentframe())

myCookies = None

def get_linenumber():
    cf = currentframe()
    return cf.f_back.f_lineno

def CreateToken(conf,inputs,outputs):
    import time
    import shortInteger
    newNameId=str(time.time()).split('.')[0]
    name=shortInteger.shortURL(int(newNameId))
    prefix=auth.getPrefix(conf)
    req="INSERT INTO "+prefix+"tokens (id_group,value) VALUES ((SELECT id from "+prefix+"groups WHERE name='"+inputs["group"]["value"]+"'),'"+name+"')"
    c = auth.getCon(conf)
    res=c.cur.execute(req)
    c.conn.commit()
    outputs["Result"]["value"]=name
    return zoo.SERVICE_SUCCEEDED

def validToken(con,prefix,token):
    req="SELECT count(*) from "+prefix+"tokens WHERE value='"+token+"';"
    con.cur.execute(req)
    vals=con.cur.fetchone()
    if vals is not None and vals[0]>0:
        return True
    return False

def getGroupFromToken(con,prefix,token):
    req="SELECT name from "+prefix+"tokens,"+prefix+"groups WHERE "+prefix+"tokens.id_group="+prefix+"groups.id and value='"+token+"';"
    con.cur.execute(req)
    vals=con.cur.fetchone()
    if vals is not None:
        return vals[0]
    return None

def validIp(conf,con,prefix,oip,cType,names):
    mapfile=conf["main"]["dataPath"]+"/public_maps/project_"+names[0]+".map"
    m=mapscript.mapObj(mapfile)
    ips=m.web.metadata.get("mm_access_ip")
    ip=None
    if ips is not None:
        ip=ips.split(",")
    # PROJECT
    if cType==0:
        elements=ip
    # LAYER
    elif cType==1:
        l=m.getLayerByName(names[1])
        l.getMetadata("mm_access_ip")
        ip=None
        if ips is not None:
            ip=ips.split(",")
        elements=ip
    if elements is not None and len(elements)>0:
        return elements.count(oip)>0
    return True
    
def checkEntityPriv(conf,con,prefix,server,service,entity,priv,token):
    tmp=priv.split(",")
    fields=""
    for i in range(0,len(tmp)):
        if fields!="":
            fields+=" AND "
        fields+=tmp[i]
    try:
        req="SELECT "+fields+" from "+prefix+"servers,"+prefix+"layer_privileges, "+prefix+"tokens WHERE tokens.id_group=layer_privileges.id_group AND id_protocol=(SELECT id from "+prefix+"protocols where name='"+service.upper()+"') AND layer_privileges.entity='"+entity+"' AND layer_privileges.id_server=servers.id and name='"+server+"' AND value='"+token+"';"
        print >> sys.stderr,req
        con.cur.execute(req)
        vals=con.cur.fetchone()
        print >> sys.stderr,vals
        if vals is not None:
            print >> sys.stderr,vals[0]
            return vals[0]
    except Exception,e:
        print >> sys.stderr,e
    return True

def getEntities(c,prefix,service,request):
    tr="SELECT ename,pos,lname,id_category from "+prefix+"requests,"+prefix+"request_protocol,"+prefix+"protocols WHERE requests.id=request_protocol.id_request and protocols.id=request_protocol.id_protocol and upper(requests.name)='"+request.upper()+"' and protocols.name='"+service+"'"
    try:
        c.cur.execute(tr)
        return c.cur.fetchone()
    except:
        return None

def BasicRewrite(conf,inputs,outputs):
    if inputs["Query"].keys().count("fmimeType")==0 and inputs["Query"].keys().count("mimeType")>0:
        inputs["Query"]["fmimeType"]=inputs["Query"]["mimeType"]
    if inputs["Query"].keys().count("fmimeType")>0 and inputs["Query"]["fmimeType"].count("text/")==0:
        outputs["Result"]["value"]=inputs["Query"]["value"]
        outputs["Result"]["mimeType"]=inputs["Query"]["fmimeType"]
        res=outputs["Result"].pop("encoding")
    else:
        outputs["Result"]["mimeType"]="text/xml"
        c = auth.getCon(conf)
        prefix=auth.getPrefix(conf)
        sUrl=getUrl(conf,c,prefix,inputs["server"]["value"])
        outputs["Result"]["value"]=inputs["Query"]["value"].replace(sUrl,conf["main"]["owsSecurityUrl"]+"?server="+inputs["server"]["value"]+"&amp;token="+inputs["token"]["value"])
    return zoo.SERVICE_SUCCEEDED
    
def SecureResponse(conf,inputs,outputs):
    c = auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    sUrl=getUrl(conf,c,prefix,inputs["server"]["value"])
    if sUrl is None:
        conf["lenv"]["message"]=zoo._("No server found.")
        return zoo.SERVICE_FAILED
    vals=getEntities(c,prefix,inputs["service"]["value"],"GetCapabilities")
    context = etree.iterparse(StringIO(inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n','')), events=('end',), tag='{*}'+vals[0])
    lName="Name"
    toRemove=[]
    for event, elem in context:
        try:
            if inputs["service"]["value"]=="WPS":
                context0 = etree.iterparse(StringIO(etree.tostring(elem)), events=('end',), tag='{*}Identifier')
                lName="Identifier"
            else:
                context0 = etree.iterparse(StringIO(etree.tostring(elem)), events=('end',), tag='{*}Name')
            for event, elem in context0:
                print >> sys.stderr,elem.text.encode('utf-8')
                if not(checkEntityPriv(conf,c,prefix,inputs["server"]["value"],inputs["service"]["value"],elem.text.encode('utf-8'),"r",inputs["token"]["value"])):
                    toRemove+=[elem.text.encode('utf-8')]
        except Exception,e:
            print >> sys.stderr, e
            print >> sys.stderr, '%s <=> %s' % (elem.tag, elem.text)
        elem.clear()
        while elem.getprevious() is not None:
            del elem.getparent()[0]

    doc=etree.fromstring(inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n',''))
    nsp=doc.nsmap
    print >> sys.stderr,toRemove
    if len(toRemove)>0:
        for i in range(0,len(toRemove)):
            try:
                elems=doc.xpath('//'+inputs["service"]["value"].lower()+':'+vals[0]+'/ows:'+lName+'[text()="'+toRemove[i]+'"]',
                          namespaces=doc.nsmap)
            except Exception,e:
                print >> sys.stderr,doc.nsmap
                print >> sys.stderr,e
                elems=doc.xpath('//*[text()="'+toRemove[i]+'"]')
            for a in elems:
                a.getparent().getparent().remove(a.getparent())
                break
    
    outputs["Result"]["value"]=etree.tostring(doc).replace(sUrl,conf["main"]["owsSecurityUrl"]+"?server="+inputs["server"]["value"]+"&amp;token="+inputs["token"]["value"])
    outputs["Result"]["mimeType"]="text/xml"
    return zoo.SERVICE_SUCCEEDED


def checkDataStorePriv(conf,con,prefix,server,service,priv,token):
    tmp=priv.split(",")
    fields=""
    for i in range(0,len(tmp)):
        if fields!="":
            fields+=" AND "
        fields+=tmp[i]
    req="SELECT "+fields+" from "+prefix+"servers,"+prefix+"server_privileges, "+prefix+"tokens WHERE tokens.id_group=server_privileges.id_group AND id_protocol=(SELECT id from "+prefix+"protocols where name='"+service.upper()+"') AND server_privileges.id_server=servers.id and name='"+server+"' AND value='"+token+"';"
    try:
        con.cur.execute(req)
        vals=con.cur.fetchone()
        if vals is not None:
            return vals[0]
        else:
            return True
    except Exception,e:
        print >> sys.stderr,e
    return False

def getUrl(conf,con,prefix,server):
    return conf["main"]["mapserverAddress"]+"?map="+conf["main"]["dataPath"]+"/public_maps/project_"+server+".map"
    req="SELECT url from "+prefix+"servers WHERE name=%s"%adapt(server)
    try:
        res=con.cur.execute(req)
        vals=con.cur.fetchone()
        sUrl=vals[0]
    except Exception,e:
        conf["lenv"]["message"]=str(e)
        sUrl=None
    return sUrl

def tryIdentifyUser(conf,user,password):
    global myCookies
    if user is not None and user!="" and password is not None and password!="":
        import authenticate.service as auth
        outputs={"Result":{"value":""}}
        res=auth.logIn(conf,{"login":{"value":user},"password":{"value":password}},outputs)
        if res==zoo.SERVICE_SUCCEEDED:
            return True
        else:
            return False
    return False
    
def SecureAccess(conf,inputs,outputs):
    global myCookies
    mapfile=conf["main"]["dataPath"]+"/public_maps/project_"+inputs["server"]["value"]+".map"
    myMap=mapscript.mapObj(mapfile)
    c = auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    if not(validToken(c,prefix,inputs["token"]["value"])):
        conf["lenv"]["message"]=zoo._("Unable to validate your token!")
        return zoo.SERVICE_FAILED
    if not(validIp(conf,c,prefix,inputs["ip"]["value"],0,[inputs["server"]["value"]])):
        conf["lenv"]["message"]=zoo._("You are not allowed to access the ressource using this ip address!")
        return zoo.SERVICE_FAILED
    myAutorizedGroups=myMap.web.metadata.get('mm_access_groups').split(',')
    if myAutorizedGroups.count('public')==0 and not(tryIdentifyUser(conf,inputs["user"]["value"],inputs["password"]["value"])):
        conf["lenv"]["message"]=zoo._("You are not allowed to access the ressource using this user / password!")
        return zoo.SERVICE_FAILED
    if conf.keys().count("senv")==0:
        conf["senv"]={"group": getGroupFromToken(c,prefix,inputs["token"]["value"])}
    else:
        print >> sys.stderr,conf["senv"]
    myCurrentGroups=conf["senv"]["group"].split(',')
    isAuthorized=False
    for i in range(len(myCurrentGroups)):
        if myAutorizedGroups.count(myCurrentGroups[i])>0:
            isAuthorized=True
            break
    if not(isAuthorized):
        conf["lenv"]["message"]=zoo._("Your group is not allowed to access the ressource!")
        return zoo.SERVICE_FAILED
    if myCookies is not None:
        print >> sys.stderr," ** COOKIES"
        print >> sys.stderr,myCookies
        print >> sys.stderr," ** COOKIES"
    sUrl=getUrl(conf,c,prefix,inputs["server"]["value"])
    secureQuery= \
        '<wps:Execute service="WPS" version="1.0.0" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ../wpsExecute_request.xsd">'+\
        '<ows:Identifier>ows-security.[Identifier]</ows:Identifier>'+\
        '<wps:DataInputs>'+\
        '<wps:Input>'+\
        '<ows:Identifier>original</ows:Identifier>'+\
        '<wps:Data>'+\
        '[_oquery_]'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>server</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[_server_]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>service</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[_service_]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>request</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[_request_]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>token</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[_token_]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>Query</ows:Identifier>'+\
        '[_query_]'+\
        '</wps:Input>'+\
        '</wps:DataInputs>'+\
        '<wps:ResponseForm>'+\
        '<wps:RawDataOutput>'+\
        '<ows:Identifier>Result</ows:Identifier>'+\
        '</wps:RawDataOutput>'+\
        '</wps:ResponseForm>'+\
        '</wps:Execute>'
    try:
        if sUrl is None:
            return zoo.SERVICE_FAILED
    except Exception,e:
        print >> sys.stderr,frameinfo.filename, get_linenumber()
        print >> sys.stderr,e
    if inputs["Query"]["mimeType"]=="application/json":
        import json
        q=json.loads(inputs["Query"]["value"])
        lkeys=q.keys()
        for i in range(0,len(lkeys)):
            if lkeys[i].lower()!=lkeys[i]:
                q[lkeys[i].lower()]=q[lkeys[i]]
        if q.keys().count("request")<0:
            conf["lenv"]["message"]=zoo._("Parameter &lt;request&gt; was missing")
            return zoo.SERVICE_FAILED
        if q.keys().count("service")<0:
            conf["lenv"]["message"]=zoo._("Parameter &lt;service&gt; was missing")
            return zoo.SERVICE_FAILED
        if not(checkDataStorePriv(conf,c,prefix,inputs["server"]["value"],q["service"],"r,x",inputs["token"]["value"])):
            conf["lenv"]["message"]=zoo._("You're not allowed to access this ressource. Please contact your system administrator for more informations on access restriction settings.")
            return zoo.SERVICE_FAILED
        vals=getEntities(c,prefix,q["service"],q["request"])

        if vals is None or (vals is not None and vals[1]>=0):
            sUrl1=""
            for i in q.keys():
                if sUrl1!="":
                    sUrl1+="&amp;"
                sUrl1+=i+"="+q[i]
            if sUrl.count("?"):
                sUrl1=sUrl+"&amp;"+sUrl1
            else:
                sUrl1=sUrl+"?"+sUrl1

            xmlQuery=secureQuery.replace("[_oquery_]",'<wps:ComplexData mimeType="application/json"><![CDATA['+inputs["Query"]["value"]+']]></wps:ComplexData>')\
                .replace("[_server_]",inputs["server"]["value"])\
                .replace("[_service_]",q["service"])\
                .replace("[_request_]",q["request"])\
                .replace("[_token_]",inputs["token"]["value"])\
                .replace("[_query_]",'<wps:Reference xlink:href="'+sUrl1+'" mimeType="text/xml" />')\
                .replace("[Identifier]","SecureResponse")

            req=urllib2.Request(
                url=conf["main"]["serverAddress"],
                data=xmlQuery,
                headers={'Content-Type': 'text/xml',"Cookie": myCookies}
            )
            response = urllib2.urlopen(req)
            outputs["Result"]["value"]=response.read()
            outputs["Result"]["mimeType"]="text/xml"
            return zoo.SERVICE_SUCCEEDED
        else:
            if vals[1]<0:
                print >> sys.stderr,"Should treat before requesting the server"
                sUrl1=""
                for i in q.keys():
                    if sUrl1!="":
                        sUrl1+="&amp;"
                    if i.upper().count(vals[0].upper())==0:
                        sUrl1+=i+"="+q[i]
                    else:
                        tmp=q[i].split(',')
                        values=""
                        for j in range(0,len(tmp)):
                            priv="r"
                            if vals[3]==2:
                                priv+=",w"
                            if vals[3]==3:
                                priv+=",x"
                            if checkEntityPriv(conf,c,prefix,inputs["server"]["value"],q["service"],tmp[j],priv,inputs["token"]["value"]):
                                if values!="":
                                    values+=","
                                values+=tmp[j]
                        sUrl1+=i+"="+values
                if sUrl.count("?"):
                    sUrl1=sUrl+"&amp;"+sUrl1
                else:
                    sUrl1=sUrl+"?"+sUrl1
                print >> sys.stderr,sUrl1

                xmlQuery=secureQuery.replace("[_oquery_]",'<wps:ComplexData mimeType="application/json"><![CDATA['+inputs["Query"]["value"]+']]></wps:ComplexData>')\
                    .replace("[_server_]",inputs["server"]["value"])\
                    .replace("[_service_]",q["service"])\
                    .replace("[_request_]",q["request"])\
                    .replace("[_token_]",inputs["token"]["value"])\
                    .replace("[_query_]",'<wps:Reference xlink:href="'+sUrl1+'" mimeType="text/xml" />')\
                    .replace("[Identifier]","BasicRewrite")
                
                req=urllib2.Request(
                    url=conf["main"]["serverAddress"],
                    data=xmlQuery,
                    headers={'Content-Type': 'text/xml'}
                    )
                response = urllib2.urlopen(req)
                outputs["Result"]["value"]=response.read()
                lkeys=response.headers.keys()
                lvalues=response.headers.values()
                useDefault=True
                for i in range(0,len(lkeys)):
                    if "content-type"==lkeys[i] and lvalues[i].count("text/")==0:
                        useDefault=False
                        outputs["Result"]["mimeType"]=lvalues[i]
                        res=outputs["Result"].pop("encoding")
                        break
                if useDefault:
                    outputs["Result"]["mimeType"]="text/xml"
                return zoo.SERVICE_SUCCEEDED
    else:
        inputs["Query"]["value"]=inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n','')
        doc=etree.fromstring(inputs["Query"]["value"])
        req=doc.tag.split("}")
        if len(req)>0:
            req=req[len(req)-1]
        else:
            req=doc.tag
        vals=getEntities(c,prefix,doc.attrib["service"],req)
        if vals is None or vals[1]>=0:
            xmlQuery=secureQuery.replace("[_oquery_]",'<wps:ComplexData mimeType="application/json"><![CDATA[;]]></wps:ComplexData>')\
                .replace("[_server_]",inputs["server"]["value"])\
                .replace("[_service_]",doc.attrib["service"])\
                .replace("[_request_]",req)\
                .replace("[_token_]",inputs["token"]["value"])\
                .replace("[_query_]",'<wps:Reference xlink:href="'+sUrl+'" mimeType="text/xml" method="POST"><Header key="Content-Type" value="text/xml" /><Body>'+inputs["Query"]["value"]+'</Body></wps:Reference>')\
                .replace("[Identifier]","SecureResponse")

            req=urllib2.Request(
                url=conf["main"]["serverAddress"]+"?metapath=ows-security",
                data=xmlQuery,
                headers={'Content-Type': 'text/xml'}
            )
            response = urllib2.urlopen(req)
            outputs["Result"]["value"]=response.read()
            outputs["Result"]["mimeType"]="text/xml"
            return zoo.SERVICE_SUCCEEDED
        else:
            if vals[1]<0:
                print >> sys.stderr,"Should treat before requesting the server"
                sUrl1=""
                if doc.attrib["service"].upper()=="WFS":
                    expr="//*[@"+vals[2]+"]"
                    res=doc.xpath(expr)
                else:
                    context = etree.iterparse(StringIO(inputs["Query"]["value"].replace('<?xml version="1.0" encoding="utf-8"?>\n','')), events=('end',), tag='{*}'+vals[0])
                    res=[]
                    for event, elem in context:
                        context0 = etree.iterparse(StringIO(etree.tostring(elem)), events=('end',), tag='{*}Identifier')
                        lName="Identifier"
                        for event, elem in context0:
                            if not(checkEntityPriv(conf,c,prefix,inputs["server"]["value"],inputs["service"]["value"],elem.text.encode('utf-8'),"r",inputs["token"]["value"])):
                                res+=[elem]

                lName="Name"
                toRemove=[]
                for i in res:
                    priv="r"
                    if vals[3]==2:
                        priv+=",w"
                    if vals[3]==3:
                        priv+=",x"
                    if doc.attrib["service"].upper()=="WFS":
                        pval=i.attrib[vals[2]]
                        node=i
                    else:
                        pval=i.text()
                        node=i.getparent()
                    if not(checkEntityPriv(conf,c,prefix,inputs["server"]["value"],doc.attrib["service"],pval,priv,inputs["token"]["value"])):
                        doc.remove(node)
                        

                xmlQuery=secureQuery.replace("[_oquery_]",'<wps:ComplexData mimeType="application/json"><![CDATA['+inputs["Query"]["value"]+']]></wps:ComplexData>')\
                    .replace("[_server_]",inputs["server"]["value"])\
                    .replace("[_service_]",doc.attrib["service"])\
                    .replace("[_request_]",req)\
                    .replace("[_token_]",inputs["token"]["value"])\
                    .replace("[_query_]",'<wps:Reference xlink:href="'+sUrl+'" mimeType="text/xml" method="POST"><Header key="Content-Type" value="text/xml" /><Body>'+etree.tostring(doc)+'</Body></wps:Reference>')\
                    .replace("[Identifier]","BasicRewrite")
                
                req=urllib2.Request(
                    url=conf["main"]["serverAddress"],
                    data=xmlQuery,
                    headers={'Content-Type': 'text/xml'}
                    )
                try:
                    response = urllib2.urlopen(req)
                except Exception,e:
                    conf["lenv"]["message"]=zoo._("Unable to access the ressource: "+str(e))
                    return zoo.SERVICE_FAILED
                outputs["Result"]["value"]=response.read()
                lkeys=response.headers.keys()
                lvalues=response.headers.values()
                useDefault=True
                for i in range(0,len(lkeys)):
                    if "content-type"==lkeys[i] and lvalues[i].count("text/")==0:
                        useDefault=False
                        outputs["Result"]["mimeType"]=lvalues[i]
                        res=outputs["Result"].pop("encoding")
                        break
                if useDefault:
                    outputs["Result"]["mimeType"]="text/xml"
                return zoo.SERVICE_SUCCEEDED
        conf["lenv"]["message"]="Not yet implemented"
        return zoo.SERVICE_FAILED
