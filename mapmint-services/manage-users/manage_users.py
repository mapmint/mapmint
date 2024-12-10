import sys
import sqlite3
import psycopg2
import hashlib
import random
import string
import smtplib
import re
import zoo


from psycopg2.extensions import *
psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)




def mm_md5(c):
    h = hashlib.new('ripemd160')
    h.update(c.encode("utf-8"))
    return h.hexdigest()


def check_user_params(param, valeur):
    tab_reg = {}
    tab_reg['login'] = r'^([-.\w]+)\Z'
    tab_reg['firstname'] = r'^([\s\w]+)\Z'
    tab_reg['lastname'] = r'^([\s\w]+)\Z'
    tab_reg['mail'] = r'^([-_.@\w]+)\Z'
    tab_reg['phone'] = r'^(\+?[\d]+)\Z'
    try:
        ro = re.compile(tab_reg[param], re.UNICODE)
        if ro.match(valeur):
            return True
        else:
            return False
    except:
        ro = re.compile(r'^([-.\w]+)\Z', re.UNICODE)
        if ro.match(valeur):
            return True
        else:
            return False


def is_ftable(value):
    tab = r'^([\s\w]+)\Z'
    ro = re.compile(tab_reg[param], re.UNICODE)
    if ro.match(value):
        return True
    else:
        return False

def check_group_params(param, valeur):
    tab_reg = {}
    tab_reg['name'] = r'^([-.\w]+)\Z'
    try:
        if re.match(tab_reg[param], valeur):
            return True
        else:
            return False
    except:
        if re.match(r'^([-_.\s\w]+)\Z', valeur):
            return True
        else:
            return False


class manage_users:

    def __init__(self, db_file):
        self.db = db_file

    def connect(self, conf=None):
        if conf is not None:
            self.conf = conf
        try:
            self.db.index(".db")
            self.paramstyle = sqlite3.paramstyle
            self.conn = sqlite3.connect(self.db)
            self.cur = self.conn.cursor()
            self.conn.execute("PRAGMA foreign_keys = ON")
            self.dbtype = "sqlite"
            self.now = "datetime('now')"
            self.desc = "PRAGMA table_info(users)"
            return True
        except Exception as e:
            try:
                self.conn = psycopg2.connect(self.db)
                self.paramstyle = psycopg2.paramstyle
                self.cur = self.conn.cursor()
                self.dbtype = "PG"
                self.now = "now()"
                import authenticate.service as auth
                import datastores.postgis.pgConnection as pg
                self.prefix = auth.getPrefix(conf)
                self.desc = pg.getDesc(self.cur, self.prefix + "users")
                return True
            except Exception as e:
                try:
                    # Handle ODBC connection
                    import datastores.postgis.service as pg
                    import pyodbc
                    import authenticate.service as auth
                    self.paramstyle = "qmark"
                    self.conString=pg.createConString(self.conf,None,None)
                    self.conn = pyodbc.connect(self.conString)
                    self.cur = self.conn.cursor()
                    self.now="CURRENT_TIMESTAMP"
                    self.dbtype = "ODBC"
                    self.prefix = auth.getPrefix(conf)
                    import datastores.postgis.pgConnection as pg
                    self.desc = pg.getDescMSSQL(self.cur, self.prefix + "users")
                    #self.conn.setdecoding(pyodbc.SQL_CHAR, encoding='latin-1')
                    #self.conn.setencoding(encoding='latin-1')
                    return True
                except Exception as e:
                    zoo.error("Manage_users: "+str(e))
                    return False
        return True

    def writeLimit(self,offset,limit):
        loffset=offset
        llimit=limit
        if loffset is None:
            loffset="0"
        if llimit is None:
            llimit="1000000"
        if self.dbtype=="ODBC":
            return "OFFSET "+str(loffset)+" ROWS FETCH NEXT "+str(llimit)+" ROW ONLY"
        else:
            return "LIMIT "+str(llimit)+" OFFSET "+str(loffset)

    def close(self):
        try:
            self.conn.close()
        except Exception as e:
            zoo.error(str(e))
            return False
        return True

    def execute_req(self, req):
        try:
            self.cur.execute(req)
            self.conn.commit()
        except Exception as e:
            zoo.error(str(e))
            self.conn.commit()
            return False
        return True

    '''
    Example "SELECT * FROM table WHERE name=[_arg1_]" {"arg1": {value: "myval",format: "s"}} 
    '''

    def pexecute_req(self, req):
        # TODO: confirm assumption: req[1] is a Python 3 dictionary object
        params = None
        for i in req[1].keys():
            if self.paramstyle == "qmark":
                if params is None:
                    params = ()
                req[0] = req[0].replace("[_" + i + "_]", "?")
                params += (req[1][i]["value"],)
            else:
                if self.paramstyle == "pyformat":
                    if params is None:
                        params = {}
                    req[0] = req[0].replace("[_" + i + "_]", "%(" + i + ")" + req[1][i]["format"])
                    params[i] = req[1][i]["value"]
        try:
            self.cur.execute(req[0], params)
            #self.conn.commit()
        except Exception as e:
            zoo.error("ERROR SQL: " + req[0])
            zoo.error("ERROR SQL: " + str(e))
            self.conn.commit()
            return False
        return True

    def is_admin(self, login):
        groups = self.get_groups_user_by_login(login)
        zoo.info("GROUPS " + str(groups))
        for g in groups:
            if (g[1] == 'admin'):
                return True
        return False

    def get_users(self, order='login', sort='asc', offset=-1, number=-1):
        if (offset > -1 and number > -1):
            l = 'limit %d,%d' % (offset, number)
        else:
            l = ""
        req = 'select id,login,firstname,lastname,mail,phone,last_con,last_map from ' + self.prefix + 'users order by %s %s ' % (
        order, sort) + l
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchall()

    def get_user_by_login(self, login):
        req = 'select * from ' + self.prefix + 'users where login=\'%s\'' % (login)
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchone()

    def get_user_by_id(self, id_user):
        req = 'select * from ' + self.prefix + 'users where id=%d' % (id_user)
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchone()

    def add_user(self, d_user):
        # TODO: confirm assumption: d_user is a Python 3 dictionary object
        cle = []
        val = []
        for (k, v) in d_user.items():
            cle.append(k)
            if k == "passwd":
                val.append(mm_md5(v))
            else:
                val.append(v)
        cle_s = ",".join(cle)
        val_s = ",".join(['\'%s\'' % (i) for i in val])
        req = 'insert into ' + self.prefix + 'users (%s) values (%s)' % (cle_s, val_s)
        return self.execute_req(req)

    def update_user_by_id(self, d_user, id_user):
        # TODO: confirm assumption: d_user is a Python 3 dictionary object
        if 'id' in d_user or 'login' in d_user:
            return False
        if 'passwd' in d_user:
            d_user['passwd'] = mm_md5(d_user['passwd'])
        u = ",".join(["%s=\'%s\'" % (k, v) for k, v in d_user.items()])
        req = 'update ' + self.prefix + 'users set %s where id=%d' % (u, id_user)
        return self.execute_req(req)

    def update_user_by_login(self, d_user, login):
        if self.conf is not None:
            import authenticate.service as auth
            prefix = auth.getPrefix(self.conf)
        else:
            prefix = ""
        if 'id' in d_user:  # or 'login' in d_user.keys():
            return False
        if 'passwd' in d_user:
            d_user['passwd'] = mm_md5(d_user['passwd'])
        u = ",".join(["%s=\'%s\'" % (k, v) for k, v in list(d_user.items())])
        req = 'update ' + prefix + 'users set %s where login=\'%s\'' % (u, login)
        return self.execute_req(req)

    # def update_passwd(self,id_user,passwd = ''):
    #	if not passwd:
    #		passwd = ''.join(random.choice(string.ascii_lowercase + string.digits) for x in range(8)
    #	req = 'update users set passwd=\'%s\' where id = %d'%(mm_md5(passwd),id_user)

    def delete_user_by_id(self, id_user):
        req = 'delete from users where id=%d' % (id_user)
        return self.execute_req(req)

    def delete_user_by_login(self, login):
        req = 'delete from ' + self.prefix + 'users where login=\'%s\'' % (login)
        return self.execute_req(req)

    def get_group_by_name(self, name):
        req = 'select * from ' + self.prefix + 'groups where name=\'%s\'' % (name)
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchone()

    def get_groups(self, order='name', sort='asc', offset=-1, number=-1):
        if (offset > -1 and number > -1):
            l = 'limit %d,%d' % (offset, number)
        else:
            l = ""
        req = 'select * from ' + self.prefix + 'groups order by %s %s ' % (order, sort) + l
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchall()

    def get_group_by_id(self, id_group):
        req = 'select * from ' + self.prefix + 'groups where id=%d' % (id_group)
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchone()

    def add_group(self, name, desc):
        req = 'insert into ' + self.prefix + 'groups (name,description) values (\'%s\',\'%s\')' % (name, desc)
        return self.execute_req(req)

    def update_group_by_id(self, desc, id_group):
        req = 'update ' + self.prefix + 'groups set description=\'%s\' where id=%d' % (desc, id_group)
        return self.execute_req(req)

    def update_group_by_name(self, desc, name):
        req = 'update ' + self.prefix + 'groups set description=\'%s\' where name=\'%s\'' % (desc, name)
        return self.execute_req(req)

    def delete_group_by_id(self, id_group):
        req = 'delete from ' + self.prefix + 'groups where id=%d' % (id_group)
        return self.execute_req(req)

    def delete_group_by_name(self, name):
        req = 'delete from ' + self.prefix + 'groups where name=\'%s\'' % (name)
        return self.execute_req(req)

    def get_groups_user_by_id(self, id_user, order='name', sort='asc'):
        req = 'select groups.id , groups.name from ' + self.prefix + 'groups, ' + self.prefix + 'user_group  where user_group.id_group = groups.id and user_group.id_user = %d order by %s %s' % (
        id_user, order, sort)
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchall()

    def get_groups_user_by_login(self, login, order='name', sort='asc'):
        req = 'select groups.id , groups.name from ' + self.prefix + 'groups, ' + self.prefix + 'user_group  where user_group.id_group = groups.id and user_group.id_user = (select id from ' + self.prefix + 'users where login = \'%s\')  order by %s %s' % (
        login, order, sort)
        zoo.info(str(req))
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchall()

    def get_users_group_by_id(self, id_group, order='login', sort='desc'):
        req = 'select users.id, users.login from ' + self.prefix + 'users,' + self.prefix + 'user_group where user_group.id_user = users.id and user_group.id_group = %d order by %s %s' % (
        id_group, order, sort)
        try:
            self.cur.execute(req)
        except Exception as e:
            zoo.error(str(e))
            return None
        return self.cur.fetchall()

    def add_user_group_by_id(self, id_user, id_group):
        req = 'insert into ' + self.prefix + 'user_group (id_user,id_group) values (%d,%d)' % (id_user, id_group)
        return self.execute_req(req)
