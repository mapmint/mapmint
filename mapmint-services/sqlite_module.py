# -*- coding: utf-8 -*-
import sqlite3
import sys

def request(conf,req):
    conn = sqlite3.connect(conf["main"]["dblink"])
    c = conn.cursor()
    c.execute(req)
    a=c.fetchall()
    conn.commit()
    conn.close()
    return a



