from pprint import pformat

from twisted.python import log
from twisted.internet import reactor
from twisted.internet.defer import Deferred
from twisted.internet.protocol import Protocol
from twisted.web import server, resource
from twisted.web.client import Agent
from twisted.web.http_headers import Headers

import sys, json, urllib.parse
import urllib.request, urllib.error, urllib.parse
import cgi


class HelloResource(resource.Resource):
    isLeaf = True
    numberRequests = 0
    SecureAccessUrl = "http://host1/cgi-bin/mm/zoo_loader.cgi"
    req_tmpl = \
        '<wps:Execute service="WPS" version="1.0.0" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 ../wpsExecute_request.xsd">' + \
        '<ows:Identifier>ows-security.SecureAccess</ows:Identifier>' + \
        '<wps:DataInputs>' + \
        '<wps:Input>' + \
        '<ows:Identifier>server</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[server]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>token</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[token]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>user</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[user]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>password</ows:Identifier>' + \
        '<wps:Data>' + \
        '<wps:LiteralData>[password]</wps:LiteralData>' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>ip</ows:Identifier>' + \
        '<wps:Data>' + \
        '[ip_address]' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '<wps:Input>' + \
        '<ows:Identifier>Query</ows:Identifier>' + \
        '<wps:Data>' + \
        '[query]' + \
        '</wps:Data>' + \
        '</wps:Input>' + \
        '</wps:DataInputs>' + \
        '<wps:ResponseForm>' + \
        '<wps:RawDataOutput>' + \
        '<ows:Identifier>Result</ows:Identifier>' + \
        '</wps:RawDataOutput>' + \
        '</wps:ResponseForm>' + \
        '</wps:Execute>'

    def setDefaultHeaders(self, request):
        request.setHeader('Server', 'MapMint OWS-Security')
        request.setHeader('X-Fowarded-By', 'MapMint OWS-Security')

    def reparse(self, parsed_path):
        # TODO: confirm assumption: "parsed_path" is a Python 3 dictionary object
        # for i in list(parsed_path.keys()):
        for i in parsed_path.keys():
            if i.lower() != i:
                parsed_path[i.lower()] = parsed_path[i]

    def render_GET(self, request):
        self.setDefaultHeaders(request)
        import json
        # ip, port = self.transport.socket.getpeername()
        print(dir(request), file=sys.stderr)  # protocol.transport.getPeer()
        print(request.getHeader("x-real-ip"), file=sys.stderr)
        print(request.path, file=sys.stderr)
        print(request.transport.getPeer().host, file=sys.stderr)
        print(request.getUser(), file=sys.stderr)
        print(request.getPassword(), file=sys.stderr)
        rcontent = request.path.split('/')
        print(rcontent, file=sys.stderr)
        parsed_path = request.args
        self.reparse(parsed_path)
        # TODO: confirm assumption: "parsed_path" is a Python 3 dictionary object
        # if list(parsed_path.keys()).count("token") > 0 and list(parsed_path.keys()).count("server"):
        if "token" in parsed_path > 0 and "server" in parsed_path:
            params = [parsed_path["server"][0], parsed_path["token"][0]]
        else:
            params = [rcontent[3], rcontent[2]]
        log.msg(parsed_path)
        clientIp = request.getHeader("x-real-ip")
        if clientIp is None:
            clientIp = request.transport.getPeer().host
        # TODO: confirm assumption: "parsed_path" is a Python 3 dictionary object
        # if list(parsed_path.keys()).count('token') == 0:
        if 'token' not in parsed_path:
            parsed_path["token"] = "-1"
        # TODO: confirm assumption: "parsed_path" is a Python 3 dictionary object
        # if list(parsed_path.keys()).count('request') > 0:
        if 'request' in parsed_path:
            query = {}
            # TODO: confirm assumption: "parsed_path" is a Python 3 dictionary object
            # for i in list(parsed_path.keys()):
            for i in parsed_path.keys():
                if i != "server" and i != "token":
                    query[i] = parsed_path[i][0]
            res = self.req_tmpl.replace("[server]", params[0]).replace("[token]", params[1]).replace("[query]", '<wps:ComplexData mimeType="application/json">' + json.dumps(query) + '</wps:ComplexData>').replace("[ip_address]", "<wps:LiteralData>" + clientIp + "</wps:LiteralData>").replace("[user]",
                                                                                                                                                                                                                                                                                                   request.getUser()).replace(
                "[password]", request.getPassword())
            log.msg(res)
            req = urllib.request.Request(url=self.SecureAccessUrl,
                                         data=res,
                                         headers={'Content-Type': 'application/xml'})
            try:
                response = urllib.request.urlopen(req)
            except Exception as e:
                request.setResponseCode(e.code)
                request.setHeader("WWW-Authenticate", 'Basic realm="MapMint OWS-Security", charset="UTF-8"')
                request.setHeader("content-type", "text/xml")
                return e.read()
            log.msg(response.info())
            lkeys = list(response.headers.keys())
            lvalues = list(response.headers.values())
            print(lkeys, file=sys.stderr)
            print(lvalues, file=sys.stderr)
            for i in range(0, len(lkeys)):
                if "transfer-encoding" != lkeys[i]:
                    request.setHeader(lkeys[i], lvalues[i])
            return response.read()
        self.numberRequests += 1
        request.setHeader("content-type", "text/plain")
        return "I am request #" + str(self.numberRequests) + "\n"

    def render_POST(self, request):
        self.setDefaultHeaders(request)
        try:
            query = {}
            rcontent = request.path.split('/')
            log.msg(request.args)
            pquery = request.content.read()
            log.msg(pquery)
            # TODO: confirm assumption: "request.args" is a Python 3 dictionary object
            # if list(request.args.keys()).count("token") > 0 and list(request.args.keys()).count("server"):
            if "token" in request.args and "server" in request.args:
                params = [request.args["server"][0], request.args["token"][0]]
            else:
                params = [rcontent[3], rcontent[2]]
            clientIp = request.getHeader("x-real-ip")
            if clientIp is None:
                clientIp = request.transport.getPeer().host
            res = self.req_tmpl.replace("[server]", rcontent[3]).replace("[token]", rcontent[2]).replace("[query]", '<wps:ComplexData mimeType="text/xml">' + pquery + '</wps:ComplexData>').replace("[ip_address]", "<wps:LiteralData>" + clientIp + "</wps:LiteralData>").replace("[user]", request.getUser()).replace(
                "[password]", request.getPassword())
            req = urllib.request.Request(url=self.SecureAccessUrl,
                                         data=res,
                                         headers={'Content-Type': 'text/xml'})
            print(res, file=sys.stderr)
            response = urllib.request.urlopen(req)
            print(request.headers, file=sys.stderr)
            log.msg(response.info())
            log.msg(res)
            return response.read()
        except Exception as e:
            print("ERROR: " + str(e), file=sys.stderr)
            log.msg(req)
            return '<html><body>You submitted the following request which is not supported: %s</body></html>\n' % (pquery,)


log.startLogging(sys.stderr)
reactor.listenTCP(8080, server.Site(HelloResource()))
reactor.run()
