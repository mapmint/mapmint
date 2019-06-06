#!/usr/bin/python


import configparser
import getopt, sys


def usage():
    print('''
%s
    -b, --base_dir repertoire d'installation de l'instance mapmint
    -u, --url      vhost de l'instance mapmint 
    -f, --file     fichier de conf de reference
    -d, --dst      fichier destination
    La configuration utilise l'arborescence standard de mapmint
''' % (sys.argv[0]))


base_dir = ""
url = ""
fichier = ""
dst = ""

try:
    opts, args = getopt.getopt(sys.argv[1:], "b:u:f:d:h", ["base_dir=", "url=", "file=", "dst="])
except getopt.GetoptError as err:
    print(str(err))
    usage()
    sys.exit(2)

for o, a in opts:
    if o in ("-b", "--base_dir"):
        base_dir = a
    elif o in ("-u", "--url"):
        url = a
    elif o in ("-f", "--file"):
        fichier = a
    elif o in ("-d", "--dst"):
        dst = a
    elif o == "-h":
        usage()
        sys.exit()
    else:
        assert False, "unhandled option"

if base_dir == "" or url == "" or fichier == "" or dst == "":
    usage()
    sys.exit(2)

config_default = configparser.ConfigParser()
config_default.optionxform = str
config = configparser.ConfigParser()
config.optionxform = str
try:
    config_default.readfp(open(fichier))
except Exception as e:
    print('Erreur d\'acces a %s' % (fichier))
    sys.exit(2)

main_d = {}
main_d['rootUrl'] = 'http://' + url + '/public'
main_d['mmAddress'] = 'http://' + url + '/mm'
main_d['publicationPath'] = base_dir + '/www/public_map/'
main_d['dataPath'] = base_dir + "/data/"
main_d['publicationUrl'] = 'http://' + url + '/public_map/'
main_d['dblink'] = base_dir + "/mm.db"
main_d['tmpPath'] = base_dir + "/tmp/"
main_d['sessionPath'] = '/tmp'
main_d['cacheDir'] = base_dir + "/cache/"
main_d['templatesPath'] = base_dir + "/www/mm/templates/"
main_d['tmpUrl'] = '../../tmp/'
main_d['mmPath'] = base_dir + '/www/mm/'
main_d['serverAddress'] = 'http://' + url + '/cgi-bin/zoo_loader.cgi'
main_d['mapserverAddress'] = 'http://' + url + '/cgi-bin/mapserv'

mm_d = {}
mm_d['address'] = 'http://' + url
mm_d['mapcacheCfg'] = base_dir + '/conf/mapcache.xml'
mm_d['mapcacheUrl'] = 'http://' + url + '/cache/'

conf = {}
conf['main'] = main_d
conf['identification'] = {}
conf['provider'] = {}
conf['mm'] = mm_d
conf['env'] = {}

sections = config_default.sections()
for s in sections:
    i = config_default.items(s)
    config.add_section(s)
    for c in i:
        if c[0] in conf[s]:
            config.set(s, c[0], conf[s][c[0]])
        else:
            config.set(s, c[0], c[1])
try:
    with open(dst, 'w') as configfile:
        config.write(configfile)
except Exception as e:
    print('Erreur lors de l\'ecriture de % ' % (dst))
    sys.exit(2)
