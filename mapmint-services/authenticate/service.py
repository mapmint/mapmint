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

from Cheetah.Template import Template
import sys
import os
import shutil
import json
import gettext
import hashlib
import time
import zoo

try:
    from manage_users.manage_users import *
except:
    from manage_users import manage_users


def loginFlux(conf, h):
    import requests
    print(" ***************** TEST 1 **************", file=sys.stderr)
    dataParam = {'mp': h.hexdigest(), 'email': conf["senv"]["mail"]}
    print(str(dataParam), file=sys.stderr)
    urlCon = "http://sigcod.geolabs.fr/flux/Services/service_connect"
    try:
        print(" ***************** TEST 2 **************", file=sys.stderr)
        myRequest = requests.post(urlCon, data=dataParam)
        print(" ***************** TEST 3 **************", file=sys.stderr)
        print(myRequest.headers["set-cookie"].split(";")[2].split(",")[1], file=sys.stderr)
        conf["senv"]["ecookie"] = myRequest.headers["set-cookie"].split(";")[2].split(",")[1] + "; path=/"
        conf["senv"]["ecookie_length"] = str(1)
        print(dir(myRequest), file=sys.stderr)
        conf["lenv"]["ecookie"] = myRequest.headers["set-cookie"].split(";")[2].split(",")[1] + "; path=/"
        conf["lenv"]["ecookie_length"] = str(1)
        print(" ***************** TEST 4 **************", file=sys.stderr)
        return zoo.SERVICE_SUCCEEDED
    except:
        print(" ***************** EXCEPT **************", file=sys.stderr)
        conf["lenv"]["message"] = zoo._("Unable to connect to flux")
        return zoo.SERVICE_FAILED


def setDefaultExtent(conf, inputs, outputs):
    conf["senv"]["default_extent"] = inputs["bbox"]["value"]
    import mmsession
    mmsession.save(conf)
    outputs["Result"]["value"] = zoo._("Default extent set.")
    return zoo.SERVICE_SUCCEEDED


def parseDb(db):
    dbstr = ""
    for i in db:
        if i != "schema":
            dbstr += " " + i + "=" + db[i]
    print(dbstr, file=sys.stderr)
    return dbstr


def is_ftable(value):
    import re
    if value is None:
        return False
    tab = r'^([.\s\w]+)\Z'
    ro = re.compile(tab, re.UNICODE)
    if ro.match(value):
        return True
    else:
        return False


def getCon(conf):
    if conf["main"]["dbuser"] in conf["main"] and conf["main"]["dbuser"] == "dblink":
        con = manage_users(conf["main"][conf["main"]["dbuser"]])
    else:
        if conf["main"]["dbuser"] in conf:
            con = manage_users(parseDb(conf[conf["main"]["dbuser"]]))
    con.connect(conf)
    return con


def getPrefix(conf):
    if conf["main"]["dbuser"] in conf and "schema" in conf[conf["main"]["dbuser"]]:
        prefix = conf[conf["main"]["dbuser"]]["schema"] + "."
    else:
        prefix = ""
    return prefix


def sendMail(conf, typ, dest, login, passwd):
    import smtplib
    from email.mime.text import MIMEText
    f0 = open(conf["smtp"][typ + "_body"])
    msgTxt = zoo._(f0.read()).replace("[passwd]", passwd).replace("[login]", login).encode('utf-8')
    msg = MIMEText(msgTxt, _charset='utf-8')
    f1 = open(conf["smtp"][typ + "_subject"])
    msg['Subject'] = zoo._(f1.read()).replace('\n', '').encode("utf-8")
    if 'ufrom' in conf["smtp"]:
        msg["From"] = "<" + conf["smtp"]["from"] + "> " + zoo._(conf["smtp"]["ufrom"])
    else:
        msg["From"] = conf["smtp"]["from"]
    msg["To"] = dest
    serv = smtplib.SMTP(conf["smtp"]["host"], conf["smtp"]["port"])
    if "login" in conf["smtp"]:
        serv.login(conf["smtp"]["login"], conf["smtp"]["passwd"])
    serv.sendmail(conf["smtp"]["from"], [dest], msg.as_string())


def getLostPassword(conf, inputs, outputs):
    import random, string
    if not ("smtp" in conf):
        conf["lenv"]["message"] = zoo._(
            "SMTP is not properly configured on your instance, please follow instructions from the official documentation.")
        return zoo.SERVICE_FAILED
    passwd = ''.join(random.choice(string.ascii_lowercase + string.digits) for x in range(8))
    con = getCon(conf)
    prefix = getPrefix(conf)
    con.connect()
    conn = con.conn
    cur = conn.cursor()
    conn.pexecute_req(["SELECT login,mail from " + prefix + "users where login=[_login_] or email=[_login1_]",
                       {"login": {"value": inputs["login"]["value"], "format": "s"},
                        "login": {"value": inputs["login"]["value"], "format": "s"}}])
    a = conn.cur.fetchall()
    if len(a) > 0:
        try:
            passwd = ''.join(random.choice(string.ascii_lowercase + string.digits) for x in range(8))
            h = hashlib.new('ripemd160')
            h.update(passwd)
            conn.cur.pexecute_req(['update ' + prefix + 'users set passwd=[_password_] where login=[_login_]',
                                   {"password": {"value": h.hexdigest(), "format": "s"},
                                    "login": {"value": a[0][0], "format": "s"}}])
            conn.commit()
            sendMail(conf, "recovery", a[0][1], a[0][0], passwd)
        except Exception as e:
            conf["lenv"]["message"] = zoo._("Unable to send the mail containing your new password: ") + str(e)
            return zoo.SERVICE_FAILED
    else:
        conf["lenv"]["message"] = zoo._("Nor login nor email address correspond to the value provided")
        return zoo.SERVICE_FAILED
    outputs["Result"]["value"] = zoo._("You will receive an email containing your new password")
    return zoo.SERVICE_SUCCEEDED


def saveUserPreferences(conf, inputs, outputs):
    con = getCon(conf)
    con.connect()
    conn = con.conn
    prefix = getPrefix(conf)
    j = 0
    sqlStr = ""
    if "length" in inputs["fields"]:
        for i in inputs["fields"]["value"]:
            if i != "login" and inputs["values"]["value"][j] != "NULL":
                if sqlStr != "":
                    sqlStr += ", "
                if i == "passwd":
                    h = hashlib.new('ripemd160')
                    h.update(inputs["values"]["value"][j])
                    sqlStr += i + "='" + h.hexdigest() + "'"
                else:
                    sqlStr += i + "='" + inputs["values"]["value"][j] + "'"
            j += 1
    else:
        sqlStr += inputs["fields"]["value"] + "='" + inputs["values"]["value"] + "'"
    print(sqlStr, file=sys.stderr)
    cur = conn.cursor()
    try:
        sql = "UPDATE " + prefix + "users set " + sqlStr + " where login=[_login_]"
        con.pexecute_req([sql, {"login": {"value": conf["senv"]["login"], "format": "s"}}])
        conn.commit()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to update user preferences: ") + str(e)
        return zoo.SERVICE_FAILED
    outputs["Result"]["value"] = zoo._("User preferences saved.")
    return zoo.SERVICE_SUCCEEDED


def registerUser(conf, inputs, outputs):
    con = getCon(conf)
    prefix = getPrefix(conf)
    con.connect()
    conn = con.conn
    j = 0
    fieldsStr = ""
    valuesStr = ""
    login = ""
    mail = ""
    params = {}
    for i in inputs["fields"]["value"]:
        if inputs["values"]["value"][j] != "NULL" and inputs["fields"]["value"][j] != "s_group_id":
            if fieldsStr != "":
                fieldsStr += ", "
                valuesStr += ", "
            if i == "passwd":
                h = hashlib.new('ripemd160')
                h.update(inputs["values"]["value"][j])
                # valuesStr+="'"+h.hexdigest()+"'"
                valuesStr += "[_passwd_]"
                params[i] = {"value": h.hexdigest(), "format": "s"}
                fieldsStr += i
            else:
                if i == "login":
                    login = inputs["values"]["value"][j]
                else:
                    if i == "mail":
                        mail = inputs["values"]["value"][j]
                # valuesStr+="'"+inputs["values"]["value"][j]+"'"
                params[i] = {"value": inputs["values"]["value"][j], "format": "s"}
                valuesStr += "[_" + i + "_]"
                fieldsStr += i
        j += 1
    cur = conn.cursor()
    try:
        sql = "INSERT INTO " + prefix + "users (" + fieldsStr + ") VALUES(" + valuesStr + ")"
        print(sql, file=sys.stderr)
        con.pexecute_req([sql, params])
        sql = "INSERT INTO " + prefix + "user_group (id_group,id_user) VALUES([_id_group_],(select last_value from " + prefix + (
            prefix.replace(".", "_")) + "users_idseq))"
        con.pexecute_req([sql, {
            "id_group": {"value": inputs["values"]["value"][inputs["fields"]["value"].index("s_group_id")],
                         "format": "s"}}])
        if "smtp" in conf:
            sendMail(conf, "register", mail, login, "XXX")
        conn.commit()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Unable to register the user: ") + str(e)
        return zoo.SERVICE_FAILED
    outputs["Result"]["value"] = zoo._("User have been successfully registered.")
    return zoo.SERVICE_SUCCEEDED


def clogIn(conf, inputs, outputs):
    # TODO: confirm assumption: conf is Python dictionary
    if "senv" in conf and "loggedin" in conf["senv"] and conf["senv"]["loggedin"] == "true":
        conf["lenv"]["message"] = zoo._("No need to authenticate")
        return zoo.SERVICE_FAILED
    con = getCon(conf)
    prefix = getPrefix(conf)
    conn = con.conn
    h = hashlib.new('ripemd160')
    h.update(inputs['password']['value'])
    c = conn.cursor()
    try:
        con.pexecute_req([
                             " SELECT users.*,(select max(adm) from " + prefix + "groups," + prefix + "user_group where " + prefix + "groups.id=id_group and id_user=" + prefix + "users.id) FROM " + prefix + "users WHERE (login=[_login_] OR mail=[_login_]) AND passwd=[_password_]",
                             {"login": {"value": inputs['login']['value'], "format": "s"},
                              "password": {"value": h.hexdigest(), "format": "s"}}])
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Error when processing SQL query: ") + str(e)
        return zoo.SERVICE_FAILED
    a = con.cur.fetchall()

    if len(a) > 0:
        # Set all the Session environment variables using the users 
        # table content.
        print(a, file=sys.stderr)
        cid = "MM" + conf["lenv"]["usid"]
        conf["lenv"]["cookie"] = "MMID=" + cid + "; path=/"
        if "senv" not in conf:
            cid = "MM" + conf["lenv"]["usid"]
            conf["lenv"]["cookie"] = "MMID=" + cid + "; path=/"
            conf["lenv"]["cookieArray"] = "MMID=" + cid + "; path=/"
            conf["senv"] = {}
            conf["senv"]["MMID"] = cid
        import requests
        c.execute(con.desc)
        desc = c.fetchall()
        for i in desc:
            if isinstance(a[0][i[0]], int):
                conf["senv"][i[1]] = str(a[0][i[0]])
            else:
                if a[0][i[0]] is not None:
                    try:
                        conf["senv"][i[1]] = a[0][i[0]].encode('utf-8')
                    except:
                        conf["senv"][i[1]] = a[0][i[0]]
                else:
                    conf["senv"][i[1]] = str(a[0][i[0]])

        for i in desc:
            if i[1] == 'login':
                print(" ***************** TEST **************", file=sys.stderr)
                # conf["senv"]["login"]=a[0][i[0]].encode('utf-8')
                dataParam = {'mp': h.hexdigest(), 'email': conf["senv"]["mail"]}
                print(str(dataParam), file=sys.stderr)
                urlCon = "http://sigcod.geolabs.fr/flux/Services/service_connect"
                try:
                    print(" ***************** TEST **************", file=sys.stderr)
                    myRequest = requests.post(urlCon, data=dataParam)

                    print(" ***************** TEST **************", file=sys.stderr)
                    print(myRequest.headers["set-cookie"].split(";")[2].split(",")[1], file=sys.stderr)
                    conf["senv"]["ecookie"] = myRequest.headers["set-cookie"].split(";")[2].split(",")[1] + "; path=/"
                    conf["senv"]["ecookie_length"] = str(1)
                    print(dir(myRequest), file=sys.stderr)
                    conf["lenv"]["ecookie"] = myRequest.headers["set-cookie"].split(";")[2].split(",")[1] + "; path=/"
                    conf["lenv"]["ecookie_length"] = str(1)
                    print(" ***************** TEST **************", file=sys.stderr)
                except:
                    conf["lenv"]["message"] = zoo._("Unable to connect to flux")
                    return zoo.SERVICE_FAILED

                break
        conf["senv"]["loggedin"] = "true"
        if "isTrial" in conf["main"] and conf["main"]["isTrial"] == "true":
            conf["senv"]["isTrial"] = "true"
        else:
            conf["senv"]["isTrial"] = "false"
        conf["senv"]["group"] = getGroup(conf, con, inputs['login']['value'])
        if a[0][len(desc)] == 1:
            conf["senv"]["isAdmin"] = "true"
        else:
            conf["senv"]["isAdmin"] = "false"
        # conf["lenv"]["cookie"]="MMID=MM"+conf["lenv"]["usid"]+"; path=/"
        outputs["Result"]["value"] = zoo._("User ") + conf["senv"]["login"] + zoo._(" authenticated")
        sql = " UPDATE " + prefix + "users set last_con=" + con.now + " WHERE login=[_login_]"
        con.pexecute_req([sql, {"login": {"value": inputs['login']['value'], "format": "s"}}])
        conn.commit()
        # print >> sys.stderr, str(conf["senv"])
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("Unable to connect with the provided login and password")
        return zoo.SERVICE_FAILED

    sys.path += [conf["main"]["templatesPath"]]
    conf["lenv"]["message"] = zoo._("Should never occur")
    return zoo.SERVICE_FAILED


def clogOut(conf, inputs, outputs):
    # TODO: confirm assumption: conf is Python dictionary
    # TODO: confirm assumption: conf["senv"] is Python dictionary
    if "senv" in conf and "loggedin" in conf["senv"] and conf["senv"]["loggedin"] == "true":
        outputs["Result"]["value"] = zoo._("User disconnected")
        conf["senv"]["loggedin"] = "false"
        conf["senv"]["login"] = "anonymous"
        conf["senv"]["group"] = "public"
        conf["lenv"]["ecookie_length"] = "1"
        conf["lenv"]["ecookie"] = "sid=empty"
        conf["lenv"]["cookie"] = "MMID=" + conf["lenv"]["usid"] + "; expires=" + time.strftime(
            "%a, %d-%b-%Y %H:%M:%S GMT", time.gmtime()) + "; path=/"
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("User not authenticated")
        return zoo.SERVICE_FAILED
    conf["lenv"]["message"] = zoo._("User not authenticated")
    return zoo.SERVICE_FAILED


def logOut(conf, inputs, outputs):
    # TODO: confirm assumption: conf is Python dictionary
    # TODO: confirm assumption: conf["senv"] is Python dictionary
    if "senv" in conf and "loggedin" in conf["senv"] and conf["senv"]["loggedin"] == "true":
        outputs["Result"]["value"] = zoo._("User disconnected")
        conf["senv"]["loggedin"] = "false"
        conf["senv"]["login"] = "anonymous"
        conf["senv"]["group"] = "public"
        conf["lenv"]["ecookie_length"] = "1"
        conf["lenv"]["ecookie"] = "sid=empty; path=/"
        conf["senv"]["ecookie_length"] = "1"
        conf["senv"]["ecookie"] = "sid=empty; path=/"
        conf["lenv"]["cookie"] = "MMID=" + conf["lenv"]["usid"] + "; expires=" + time.strftime(
            "%a, %d-%b-%Y %H:%M:%S GMT", time.gmtime()) + "; path=/"
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("User not authenticated")
        return zoo.SERVICE_FAILED
    conf["lenv"]["message"] = zoo._("User not authenticated")
    return zoo.SERVICE_FAILED


def getGroup(conf, con, login):
    try:
        prefix = getPrefix(conf)

        req = "select groups.name from " + prefix + "users," + prefix + "user_group," + prefix + "groups WHERE " + prefix + "users.id=id_user AND " + prefix + "groups.id=id_group AND login='" + login + "'"
        con.pexecute_req([req, {"login": {"value": login, "format": "s"}}])
        a = con.cur.fetchall()
        res = ""
        for i in range(0, len(a)):
            for j in range(0, len(a[i])):
                if res != "":
                    res += ","
                res += a[i][j]
        return res
    except Exception as e:
        print(zoo._("Error when processing SQL query: ") + str(e), file=sys.stderr)
        return None


def isSadm(conf):
    con = getCon(conf)
    con.conf = conf
    prefix = getPrefix(conf)
    req = "select sadm from " + prefix + "groups where id in (select id_group from " + prefix + "user_group where id_user=[_uid_]) order by sadm desc"
    con.pexecute_req([req, {"uid": {"value": conf["senv"]["id"], "format": "s"}}])
    a = con.cur.fetchall()
    return a[0][0]


def logIn(conf, inputs, outputs):
    # TODO: confirm assumption: conf is Python dictionary
    if "senv" in conf and conf["senv"] and conf["senv"]["loggedin"] == "true":
        conf["lenv"]["message"] = zoo._("No need to authenticate")
        return zoo.SERVICE_FAILED
    con = getCon(conf)
    con.conf = conf
    prefix = getPrefix(conf)
    # con.connect(conf)
    try:
        conn = con.conn
    except:
        conf["lenv"]["message"] = zoo._("Unable to connect to the User Database.")
        return zoo.SERVICE_FAILED
    h = hashlib.new('ripemd160')
    h.update(inputs['password']['value'].encode())
    h.hexdigest()
    c = conn.cursor()
    try:
        req = " SELECT users.*,Array((select " + prefix + "groups.name from " + prefix + "groups, " + prefix + "user_group where " + prefix + "groups.id=id_group and " + prefix + "users.id=id_user)) as gname FROM " + prefix + "users," + prefix + "user_group," + prefix + "groups WHERE " + prefix + "users.id=id_user AND " + prefix + "groups.id=id_group AND adm=1 AND login=[_login_] AND passwd=[_password_]"
        con.pexecute_req([req, {"login": {"value": inputs["login"]["value"], "format": "s"},
                                "password": {"value": h.hexdigest(), "format": "s"}}])

    except Exception as e:
        conf["lenv"]["message"] = zoo._("Error when processing SQL query: ") + str(e)
        return zoo.SERVICE_FAILED
    try:
        a = con.cur.fetchall()
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Error when retrieving data for the SQL query: ") + str(e)
        return zoo.SERVICE_FAILED

    if len(a) > 0:
        cid = "MM" + conf["lenv"]["usid"]
        conf["lenv"]["cookie"] = "MMID=" + cid + "; path=/"

        # cid=str(time.time()).split(".")[0]
        # conf["lenv"]["cookie"]="MMID=MM"+cid+"; path=/"

        conf["senv"] = {}
        conf["senv"]["MMID"] = "MM" + cid
        # Set all the Session environment variables using the users 
        # table content.
        # print >> sys.stderr,con.desc
        c.execute(con.desc)
        desc = c.fetchall()
        for i in desc:
            if isinstance(a[0][i[0]], int):
                conf["senv"][i[1]] = str(a[0][i[0]])
            else:
                if a[0][i[0]] is not None:
                    try:
                        conf["senv"][i[1]] = a[0][i[0]].encode('utf-8')
                    except:
                        conf["senv"][i[1]] = a[0][i[0]]
                else:
                    conf["senv"][i[1]] = str(a[0][i[0]])

        conf["senv"]["group"] = getGroup(conf, con, inputs['login']['value'])
        conf["senv"]["loggedin"] = "true"
        conf["senv"]["isAdmin"] = "true"

        if "isTrial" in conf["main"] and conf["main"]["isTrial"] == "true":
            conf["senv"]["isTrial"] = "true"
        else:
            conf["senv"]["isTrial"] = "false"

        outputs["Result"]["value"] = zoo._("User ") + conf["senv"]["login"] + zoo._(" authenticated")
        sql = " UPDATE " + prefix + "users set last_con=" + con.now + " WHERE login=[_login_]"
        con.pexecute_req([sql, {"login": {"value": inputs["login"]["value"], "format": "s"}}])
        conn.commit()
        try:
            loginFlux(conf, h)
        except:
            pass
        # print(str(conf["senv"]), file=sys.stderr)
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("Unable to connect with the provided login and password")
        return zoo.SERVICE_FAILED

    sys.path += [conf["main"]["templatesPath"]]
    conf["lenv"]["message"] = zoo._("Should never occur")
    return zoo.SERVICE_FAILED
