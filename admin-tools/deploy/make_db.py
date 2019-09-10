#!/usr/bin/python


import configparser
import getopt, sys
import sqlite3
import smtplib
import hashlib
import random
import string


def usage():
    print('''
%s
    -u, --url      vhost de l'instance mapmint 
    -e, --email    adresse utilisateur
    -d, --dst      fichier destination
    La configuration utilise l'arborescence standard de mapmint
''' % (sys.argv[0]))


url = ""
email = ""
dst = ""
try:
    opts, args = getopt.getopt(sys.argv[1:], "u:e:d:h", ["url=", "email=", "dst="])
except getopt.GetoptError as err:
    print(str(err))
    usage()
    sys.exit(2)

for o, a in opts:
    if o in ("-u", "--url"):
        url = a
    elif o in ("-e", "--email"):
        email = a
    elif o in ("-d", "--dst"):
        dst = a
    elif o == "-h":
        usage()
        sys.exit()
    else:
        assert False, "unhandled option"

if url == "" or email == "" or dst == "":
    usage()
    sys.exit(2)

passwd = ''.join(random.choice(string.ascii_lowercase + string.digits) for x in range(8))
h = hashlib.new('ripemd160')
h.update(passwd)

conn = sqlite3.connect(dst)
c = conn.cursor()
req_create = '''CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                login varchar(25),
                nom varchar(255),
                prenom varchar(255),
                passwd varchar(40),
                mail varchar(255),
                tel varchar(30),
                last_con datetime,
                last_map varchar(255)
                )'''

password = h.hexdigest()

req = 'INSERT INTO users (login,nom,prenom,passwd,mail,tel,last_map) VALUES ("admin","trial","user","%s","%s","000000000","Demo_Project_1")' % (
password, email)

try:
    c.execute(req_create)
    c.execute(req)
    conn.commit()
except Exception as e:
    print(repr(e))
    exit(2)
c.close()

msg = '''http://%s
login : admin
password : %s

FTP de depot:

ftp://%s
login: %s
password : %s''' % (url, passwd, url, url.split('.')[0], passwd)
bcc = ['david@saggiorato.net']
toaddrs = [email] + bcc
header = "Subject: Mapmint Free trial\r\nFrom: trial@mapmint.com\r\nTo: %s\r\n\r\n" % (email)
server = smtplib.SMTP('localhost')
server.sendmail('david@mapmint.com', toaddrs, header + msg)

print(passwd)
