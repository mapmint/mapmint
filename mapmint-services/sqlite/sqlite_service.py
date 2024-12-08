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
import sqlite3
import re
import hashlib


def mm_md5(c):
    h = hashlib.new('ripemd160')
    h.update(c)
    return h.hexdigest()


dict_func = {'md5': mm_md5}


def Get(conf, inputs, outputs):
    # TODO: confirm assumption: "conf" and conf["senv"] are Python 3 dictionary objects
    # if list(conf.keys()).count("senv") > 0 and list(conf["senv"].keys()).count("loggedin") > 0 and conf["senv"]["loggedin"] == "true":
    if "senv" in conf and "loggedin" in conf["senv"] and conf["senv"]["loggedin"] == "true":
        if re.match(r"(^\w+\Z)", inputs["table"]["value"]):
            limit = ""
            clause = ""
            if inputs["limit"]["value"] != "NULL":
                if re.match(r"(^\d+,\d+$)|(^\d+$)\Z", inputs["limit"]["value"]):
                    limit = " limit " + inputs["limit"]["value"]
                else:
                    conf["lenv"]["message"] = "invalid limit parameter :" + inputs["limit"]["value"]
                    return 4
            if inputs["search"]["value"] != "NULL":
                try:
                    m = json.loads(inputs["search"]["value"])
                except Exception as e:
                    zoo.error(str(e))
                    conf["lenv"]["message"] = "invalid search parameter :" + inputs["search"]["value"]
                    return 4
                try:
                    p = m.popitem()
                    clause = 'where %s="%s"' % (p[0], p[1])
                    # TODO: confirm assumption: "m" is a Python 3 dictionary object
                    # for k in list(m.keys()):
                    for k in m.keys():
                        clause = clause + ' and %s="%s"' % (m[k])
                except Exception as e:
                    zoo.error(str(e))
                    conf["lenv"]["message"] = "invalid sql clause request :" + inputs["search"]["value"]
                    return 4

            req = "select * from " + inputs["table"]["value"] + " " + clause + limit
            try:
                conn = sqlite3.connect(conf['main']['dblink'])
                cur = conn.cursor()
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = 'SQLITE Error : ' + repr(e)
                return 4
            try:
                cur.execute(req)
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = 'SQL Error'
                return 4
            outputs["Result"]["value"] = json.dumps(cur.fetchall())
            conn.close()
            return 3


        else:
            conf["lenv"]["message"] = "invalid limit parameter :" + inputs["limit"]["value"]
            return 4

    else:
        conf["lenv"]["message"] = "User not authenticated"
        return 4


def Add(conf, inputs, outputs):
    # TODO: confirm assumption: "conf" and conf["senv"] are Python 3 dictionary objects
    # if list(conf.keys()).count("senv") > 0 and list(conf["senv"].keys()).count("loggedin") > 0 and conf["senv"]["loggedin"] == "true":
    if "senv" in conf and "loggedin" in conf["senv"] and conf["senv"]["loggedin"] == "true":
        if re.match(r"(^\w+\Z)", inputs["table"]["value"]):
            try:
                row = json.loads(inputs["row"]["value"])
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = "invalid row parameter :" + inputs["row"]["value"]
                return 4
            try:
                conn = sqlite3.connect(conf['main']['dblink'])
                cur = conn.cursor()
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = 'SQLITE Error'
                return 4
            l = row.popitem()
            champs = '%s' % (l[0])
            valeurs = '"%s"' % (l[1])
            # TODO: confirm assumption: "row" is a Python 3 dictionary object
            # for r in list(row.keys()):
            for r in row.keys():
                champs = champs + ',%s' % (r)
                valeurs = valeurs + ',"%s"' % (row[r])
            req = 'insert into %s (%s) values (%s)' % (inputs["table"]["value"], champs, valeurs)
            try:
                cur.execute(req)
                conn.commit()
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = 'SQLITE Error : ' + repr(e)
                return 4

            conn.close()
        else:
            conf["lenv"]["message"] = "invalid table parameter :" + inputs["table"]["value"]
            return 4
        outputs["Result"]["value"] = inputs["row"]["value"]
        return 3
    else:
        conf["lenv"]["message"] = "User not authenticated"
        return 4


def Update(conf, inputs, outputs):
    # TODO: confirm assumption: "conf" and conf["senv"] are Python 3 dictionary objects
    # if list(conf.keys()).count("senv") > 0 and list(conf["senv"].keys()).count("loggedin") > 0 and conf["senv"]["loggedin"] == "true":
    if "senv" in conf and "loggedin" in conf["senv"] and conf["senv"]["loggedin"] == "true":
        if re.match(r"(^\w+\Z)", inputs["table"]["value"]):
            try:
                set_arg = json.loads(inputs["set"]["value"])
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = "invalid set parameter :" + inputs["set"]["value"]
                return 4
            try:
                search_arg = json.loads(inputs["search"]["value"])
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = "invalid search parameter :" + inputs["search"]["value"]
                return 4
            try:
                conn = sqlite3.connect(conf['main']['dblink'])
                cur = conn.cursor()
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = 'SQLITE Error'
                return 4
            l = set_arg.popitem()
            req = 'update %s set %s = "%s"' % (inputs["table"]["value"], l[0], l[1])
            # TODO: confirm assumption: "set_arg" is a Python 3 dictionary object
            # for r in list(set_arg.keys()):
            for r in set_arg.keys():
                req = req + ', %s = "%s"' % (r, set_arg[r])

            ll = search_arg.popitem()
            req = req + ' where %s = "%s"' % (ll[0], ll[1])
            # TODO: confirm assumption: "search_arg" is a Python 3 dictionary object
            # for rr in list(search_arg.keys()):
            for rr in search_arg.keys():
                req = req + ' and %s = "%s"' % (rr, search_arg[rr])
            try:
                cur.execute(req)
                conn.commit()
            except Exception as e:
                zoo.error(str(e))
                conf["lenv"]["message"] = 'SQLITE Error : ' + repr(e)
                return 4
            tc = conn.total_changes
            conn.close()
        else:
            conf["lenv"]["message"] = "invalid table parameter :" + inputs["table"]["value"]
            return 4
        outputs["Result"]["value"] = '{ "total_change" : %d , %s }' % (tc, inputs["set"]["value"])
        return 3
    else:
        conf["lenv"]["message"] = "User not authenticated"
        return 4
