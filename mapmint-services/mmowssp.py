from pprint import pformat

from twisted.python import log
from twisted.internet import reactor
from twisted.internet.defer import Deferred
from twisted.internet.protocol import Protocol
from twisted.web import server, resource
from twisted.web.client import Agent
from twisted.web.http_headers import Headers

import sys,json,urlparse
import urllib2
import cgi

class HelloResource(resource.Resource):
    isLeaf = True
    numberRequests = 0
    SecureAccessUrl = "http://localhost/cgi-bin/mm/zoo_loader.cgi"
    req_tmpl=\
        '<wps:Execute service="WPS" version="1.0.0" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ../wpsExecute_request.xsd">'+\
        '<ows:Identifier>ows-security.SecureAccess</ows:Identifier>'+\
        '<wps:DataInputs>'+\
        '<wps:Input>'+\
        '<ows:Identifier>server</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[server]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>token</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[token]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>user</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[user]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>password</ows:Identifier>'+\
        '<wps:Data>'+\
        '<wps:LiteralData>[password]</wps:LiteralData>'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>ip</ows:Identifier>'+\
        '<wps:Data>'+\
        '[ip_address]'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '<wps:Input>'+\
        '<ows:Identifier>Query</ows:Identifier>'+\
        '<wps:Data>'+\
        '[query]'+\
        '</wps:Data>'+\
        '</wps:Input>'+\
        '</wps:DataInputs>'+\
        '<wps:ResponseForm>'+\
        '<wps:RawDataOutput>'+\
        '<ows:Identifier>Result</ows:Identifier>'+\
        '</wps:RawDataOutput>'+\
        '</wps:ResponseForm>'+\
        '</wps:Execute>'

    def reparse(self,parsed_path):
        for i in parsed_path.keys():
            if i.lower()!=i:
                parsed_path[i.lower()]=parsed_path[i]
        
    def render_GET(self, request):
        import json
        #ip, port = self.transport.socket.getpeername()
        print >> sys.stderr,dir(request)#protocol.transport.getPeer()
        print >> sys.stderr,request.getHeader("x-real-ip")
        print >> sys.stderr,dir(request.transport)
        print >> sys.stderr,request.transport.getPeer().host
        print >> sys.stderr,request.getUser()
        print >> sys.stderr,request.getPassword()
        parsed_path = request.args
        self.reparse(parsed_path)
        log.msg(parsed_path)
        clientIp=request.getHeader("x-real-ip")
        if clientIp is None:
            clientIp=request.transport.getPeer().host
        if parsed_path.keys().count('token')==0:
            parsed_path["token"]="-1"
        if parsed_path.keys().count('request')>0:
            query={}
            for i in parsed_path.keys():
                if i!="server" and i!="token":
                    query[i]=parsed_path[i][0]
            res=self.req_tmpl.replace("[server]",parsed_path["server"][0]).replace("[token]",parsed_path["token"][0]).replace("[query]",'<wps:ComplexData mimeType="application/json">'+json.dumps(query)+'</wps:ComplexData>').replace("[ip_address]","<wps:LiteralData>"+clientIp+"</wps:LiteralData>").replace("[user]",request.getUser()).replace("[password]",request.getPassword())
            log.msg(res)
            req=urllib2.Request(url=self.SecureAccessUrl,
                            data=res,
                            headers={'Content-Type': 'application/xml'})
            try:
                response = urllib2.urlopen(req)
            except Exception,e:
                request.setHeader("content-type", "text/xml")
                return e.read()
            log.msg(response.info())
            lkeys=response.headers.keys()
            lvalues=response.headers.values()
            print >> sys.stderr,lkeys
            print >> sys.stderr,lvalues
            for i in range(0,len(lkeys)):
                if "transfer-encoding"!=lkeys[i]: 
                    request.setHeader(lkeys[i],lvalues[i])
            return response.read()
        self.numberRequests += 1
        request.setHeader("content-type", "text/plain")
        return "I am request #" + str(self.numberRequests) + "\n"

    def render_POST(self, request):
        try:
            query={}
            log.msg(request.args)
            pquery=request.content.read()
            log.msg(pquery)
            clientIp=request.getHeader("x-real-ip")
            if clientIp is None:
                clientIp=request.transport.getPeer().host
            res=self.req_tmpl.replace("[server]",request.args["server"][0]).replace("[token]",request.args["token"][0]).replace("[query]",'<wps:ComplexData mimeType="text/xml">'+pquery+'</wps:ComplexData>').replace("[ip_address]","<wps:LiteralData>"+clientIp+"</wps:LiteralData>").replace("[user]",request.getUser()).replace("[password]",request.getPassword())
            req=urllib2.Request(url=self.SecureAccessUrl,
                            data=res,
                            headers={'Content-Type': 'text/xml'})
            print >> sys.stderr,res
            response = urllib2.urlopen(req)
            print >> sys.stderr,request.headers
            log.msg(response.info())
            log.msg(res)
            return response.read()
        except Exception,e:
            print >> sys.stderr,"ERROR: "+str(e)
            log.msg(req)
            return '<html><body>You submitted: %s</body></html>\n' % (pquery,)

log.startLogging(sys.stderr)
reactor.listenTCP(8080, server.Site(HelloResource()))
reactor.run()
