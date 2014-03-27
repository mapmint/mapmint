#!/usr/bin/python

import ConfigParser
import getopt, sys

def usage():
	print '''
%s
	-b, --base_dir repertoire d'installation de l'instance mapmint
	-u, --url      vhost de l'instance mapmint 
	-d, --dst      fichier destination
	La configuration utilise l'arborescence standard de mapmint
'''%(sys.argv[0])

base_dir = ""
url = ""
dst = ""


try:
	opts, args = getopt.getopt(sys.argv[1:], "b:u:d:h", ["base_dir=", "url=","dst="])
except getopt.GetoptError, err:
	print str(err)
	usage()
	sys.exit(2)

for o, a in opts:
	if o in ("-b","--base_dir"):
		base_dir = a
	elif o in ("-u","--url"):
		url = a
	elif o in ("-d","--dst"):
		dst = a
	elif o == "-h":
		usage()
		sys.exit()
	else:
		assert False, "unhandled option"
		
if base_dir == "" or url == "" or dst == "":
	usage()
	sys.exit(2)


rewrite = '''   
	RewriteEngine on
	RewriteCond %{REQUEST_FILENAME} !-f
	RewriteCond %{REQUEST_FILENAME} !-d
	RewriteRule ^(.*)$ /cgi-bin/zoo_loader.cgi?metapath=template&request=Execute&service=WPS&version=1.0.0&Identifier=display&DataInputs=tmpl=$1&RawDataOutput=Result [L,QSA]
'''


conf_apache = '''<VirtualHost *:80>
        ServerAdmin webmaster@localhost
        ServerName %s
        DocumentRoot %s
        RedirectMatch ^/$ %s
        <Directory />
                Options FollowSymLinks
                AllowOverride None
        </Directory>
        <Directory %s>
                Options -Indexes FollowSymLinks MultiViews
                AllowOverride All
                Order allow,deny
                allow from all
		%s
		
		</Directory>
		Alias /tmp %s/tmp

        <Directory %s/tmp>
                AllowOverride None
                Options -Indexes FollowSymLinks MultiViews
                Order allow,deny
                Allow from all
        </Directory>
        
        ScriptAlias /cgi-bin/ %s
        <Directory "%s">
                AllowOverride None
                Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
                Order allow,deny
                Allow from all
        </Directory>
        ErrorLog /var/log/apache2/%s-error.log
        LogLevel warn
        CustomLog /var/log/apache2/%s-access.log combined
</VirtualHost>'''%(url,base_dir+'/www','http://'+url+'/Dashboard',base_dir+'/www',rewrite,base_dir,base_dir,base_dir+'/cgi-bin/',base_dir+'/cgi-bin',url,url)

try:
	df = open(dst,'w')
	df.write(conf_apache)
	df.close()
except Exception,e:
	print 'impossible de crer la configuration du vhost %s'%(dst)
	sys.exit(2)



