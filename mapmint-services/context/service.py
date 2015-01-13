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
import sys
import json
import time
import zoo
import authenticate.service as auth
import shortInteger

# Use this SQL command from sqlite3 command prompt before using this service
'''

SQLITE:
 CREATE TABLE contexts (
   id INTEGER PRIMARY KEY AUTOINCREMENT, 
   name varchar(25) UNIQUE,
   layers text,
   ext varchar(100)
 );

POSTGRESQL:
 CREATE TABLE contexts (
   id serial PRIMARY KEY, 
   name varchar(25) UNIQUE,
   layers text,
   ext varchar(100)
 );

'''

def saveContext(conf,inputs,outputs):
    print >> sys.stderr,"DEBUG 0000"
    #conn = sqlite3.connect(conf['main']['dblink'])
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    cur = con.conn.cursor()
    newNameId=str(time.time()).split('.')[0]
    name=shortInteger.shortURL(int(newNameId))
    layers=""
    if inputs["layers"].has_key('length'):
        for i in inputs["layers"]["value"]:
            if layers!='':
                layers+=","
            layers+=i
    else:
            layers+=inputs["layers"]["value"]
    req="INSERT INTO "+prefix+"contexts (name,layers,ext) VALUES ([_name_],[_layers_],[_extent_])"
    con.pexecute_req([req,{"name":{"value":name,"format":"s"},"layers":{"value":layers,"format":"s"},"extent":{"value":inputs["extent"]["value"],"format":"s"}}])
    con.conn.commit()
    outputs["Result"]["value"]=conf["main"]["applicationAddress"]+"public/"+conf["senv"]["last_map"]+";c="+name
    return zoo.SERVICE_SUCCEEDED

def loadContext(conf,inputs,outputs):
    con=auth.getCon(conf)
    prefix=auth.getPrefix(conf)
    con.connect()
    conn = con.conn
    cur = con.conn.cursor()
    name=inputs["name"]["value"]
    req="SELECT ext,layers from "+prefix+"contexts where name = [_name_]"
    con.pexecute_req([req,{"name":{"value":name,"format":"s"}}])
    con.conn.commit()
    res=con.cur.fetchall()
    outputs["Result"]["value"]=json.dumps({"ext": res[0][0],"layers": res[0][1].split(',')})
    return zoo.SERVICE_SUCCEEDED
