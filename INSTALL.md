# ![logo](mapmint-ui/img/mapmint-logo-small.png "MapMint") Installation guide

<h3>Install all the dependencies (Ubuntu 14.04 LTS)</h3>

```sudo apt-get install flex bison libfcgi-dev libxml2 libxml2-dev curl
openssl autoconf apache2 python-software-properties subversion git
libmozjs185-dev python-dev build-essential libfreetype6-dev
libproj-dev libgdal1-dev libcairo2-dev apache2-dev libxslt1-dev
python-cheetah cssmin python-psycopg2 python-gdal python-libxslt1
postgresql-9.3  r-base cmake gdal-bin libapache2-mod-fcgid```

<h3>Initial settings</h3>

We will refer to the ```$SRC``` variable in all step of this short documentation, so make sure to run the following command and use the same terminal until the end of the setup process.

```
export SRC=/home/djay/src
mkdir $SRC
```

<h3>Download ZOO-Project and MapMint</h3>

```
cd $SRC/
svn checkout http://www.zoo-project.org/svn/trunk zoo
git clone https://github.com/mapmint/mapmint.git
```


<h3>Install MapServer</h3>

```
cd $SRC/
wget http://download.osgeo.org/mapserver/mapserver-6.2.0.tar.gz
tar -xvf mapserver-6.2.0.tar.gz

cd mapserver-6.2.0
./configure --with-wfs --with-python --with-freetype=/usr/ --with-ogr --with-gdal --with-proj --with-geos --with-cairo --with-kml --with-wmsclient --with-wfsclient --with-wcs --with-sos --with-python=/usr/bin/python2.7 --without-gif --with-apache-module --with-apxs=/usr/bin/apxs2 --with-apr-config=/usr/bin/apr-1-config --enable-python-mapscript --with-zlib --prefix=/usr/
sed "s:mapserver-6.2.0-mm/::g;s:mapserver-6.2.0/::g" -i ../mapmint/thirds/ms-6.2.0-full.patch
patch -p0 < $SRC/mapmint/thirds/ms-6.2.0-full.patch 

make
sudo make install
```

<h3>Install MapCache</h3>

```
cd $SRC
git clone https://github.com/mapserver/mapcache.git
cd mapcache/
cmake .
make 
sudo make install

wget http://geolabs.fr/dl/mapcache.xml
sudo cp mapcache.xml /usr/libc/cgi-bin/
```

Create or edit the ```/etc/ld.so.conf.d/zoo.conf``` and add ```/usr/local/lib```
then run the following command:

```
sudo ldconfig
```

<h3>Install ZOO-Project and the C Services</h3>

```
cd $SRC/zoo/thirds/cgic206
sed "s:lib64:lib:g" -i Makefile 
make
cd $SRC/zoo/zoo-project/zoo-kernel
autoconf
./configure ./configure --with-mapserver=$SRC/mapserver-6.2.0/ --with-python --with-pyvers=2.7 --with-js=/usr/ --with-xsltconfig=/usr/bin/xslt-config
sed "s:/usr/lib/x86_64-linux-gnu/libapr-1.la::g" -i ZOOMakefile.opts
make
cp zoo_loader.cgi ../../../mapmint/mapmint-services/

cd $SRC/zoo/zoo-project/zoo-services/ogr/ogr2ogr
make
cp cgi-env/* $SRC/mapmint/mapmint-services/vector-converter/

cd $SRC/zoo/zoo-project/zoo-services/ogr/base-vect-ops
make
cp cgi-env/* $SRC/mapmint/mapmint-services/vector-tools/

cd $SRC/zoo/zoo-project/zoo-services/gdal
for i in contour dem grid profile translate warp ; do
echo $i
cd $i
make; sudo cp cgi-env/* $SRC/mapmint/mapmint-services/raster-tools/
cd ..
done
```

<h3>Build MapMint C Services</h3>

```
cd $SRC/mapmint/mapmint-services
for i in *-src ; do
echo $i
cd $i
autoconf
./configure --with-zoo-kernel=$SRC/zoo/zoo-project/zoo-kernel --with-mapserver=$SRC/mapserver-6.2.0
make
cd ..
done
```

<h3>Install QREncode service</h3>

```
cd $SRC
wget http://fukuchi.org/works/qrencode/qrencode-3.4.1.tar.gz
tar xvf qrencode-3.4.1.tar.gz
./configure
make 
sudo make install
sudo ldconfig -v
cd ~$SRC/zoo/zoo-project/zoo-services/qrencode/
make
sudo cp cgi-env/* /usr/lib/cgi-bin/mm/
```

<h3>Install R</h3>

MapMint use specific R packages for giving the administrator access to discretisation options in the Styler window.

```
sudo R
install.packages("e1071")
install.packages("classInt")
```

<h3>Final tweeks</h3>

```
sudo ln -s /home/djay/src/mapmint/mapmint-ui/ /var/www/html/ui
sudo ln -s /home/djay/src/mapmint/public_map/ /var/www/html/pm

sudo ln -s /home/djay/src/mapmint/mapmint-services/ /usr/lib/cgi-bin/mm

sudo a2enmod fcgid
sudo a2enmod cgid
sudo a2enmod rewrite
```

Edit the apache2 configuration file with the following command:
```
sudo vi /etc/apache2/apache2.conf 
```

Then make sure the Directory block for /var/www looks like the following, in other case correct it:

```
<Directory /var/www/>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
</Directory>

FcgidInitialEnv "MAPCACHE_CONFIG_FILE" "/usr/lib/cgi-bin/mapcache.xml"
ScriptAlias /cache      //usr/lib/cgi-bin/mapcache.fcgi

<Location /cache>
        Order Allow,Deny
        Allow from all
        SetHandler fcgid-script
</Location>

```

Restart the apache web server

```
sudo /etc/init.d/apache2 restart
```

Download and use databases required by MapMint
```
sudo mkdir /var/data
cd /var/data
sudo wget http://geolabs.fr/dl/mm.db

sudo wget http://geolabs.fr/dl/mmdb.sql

sudo /etc/init.d/postgresql start

createdb -E utf-8 mmdb
psql mmdb -f mmdb.sql
```

Create required directories

```
sudo cp $SRC/mapmint/template/data/* /var/data
sudo mkdir /var/data/{templates,dirs}
sudo mkdir -p /var/www/html/tmp/descriptions
sudo mkdir -p /var/www/html/pm/styles

wget http://geolabs.fr/dl/fonts.tar.bz2
sudo mkdir /var/data/fonts
sudo tar -xvf fonts.tar.bz2 -C /var/data/fonts

cp $SRC/mapmint/mapmint-ui/js/.htaccess $SRC/mapmint/public_map/
sudo chown -R www-data:www-data /var/data
sudo chown www-data:www-data /usr/lib/cgi-bin/main.cfg
sudo chown www-data:www-data /usr/lib/cgi-bin/mapcache.xml
sudo chown -R www-data:www-data /var/www/html/pm/styles

```

Now you should edit the ```main.cfg``` file located in ```$SRC/mapmint/mapmint-services``` to fit with your setup. Then you should be ready to access your new MapMint installation through the following url: http://[HOST]:[PORT]/ui/Dashboard .

Initially, your admin login is ```test``` and the password is ```demo02```. You are invited to remove this defalut account from the admin user interface.

You should add at least one datastore in the ```/var/data/ftp/``` directory by creating new directory inside it and add your GIS data in this sub-directory.
