PREFIX=/usr/local


XML2CFLAGS=-I/usr/include/libxml2
XML2LDFLAGS=-L/usr/lib -lxml2

GDAL_CFLAGS=-I/usr/include/gdal
GDAL_LIBS=-L/usr/lib -lgdal

XSLT_LDFLAGS=-L/usr/lib/i386-linux-gnu -lxslt -lxml2

ZOO_FILE=/home/djay/src/zoo/zoo-project/zoo-kernel/ulinet.o /home/djay/src/zoo/zoo-project/zoo-kernel/service_internal_ms.o /home/djay/src/zoo/zoo-project/zoo-kernel/service_internal.o
ZOO_DIR=/home/djay/src/zoo/zoo-project/zoo-kernel



CPPFLAGS        :=  -DZOO_SERVICE  -DUSE_CAIRO -DUSE_KML -DUSE_MS -I${ZOO_DIR}

BIN_LIST = cgi-env/service.zo

default : $(BIN_LIST)

cgi-env/service.zo: service.c
	g++ ${GDAL_CFLAGS} $(CFLAGS) $(CPPFLAGS) -shared -fpic $< ${GDAL_LIBS} -o $@


install: 
	install -d ${PREFIX}/vector-converter/
	cd ${PREFIX}/vector-converter/ && ln -s ../main.cfg
	cd ${PREFIX}/vector-converter/ && ln -s ../ZOO-api.js
	cd ${PREFIX}/vector-converter/ && ln -s ../ZOO-proj4js.js
	install $(BIN_LIST)             ${PREFIX}/vector-converter/
	install cgi-env/*.zcfg          ${PREFIX}/vector-converter/
	install cgi-env/*.py            ${PREFIX}/vector-converter/
	install cgi-env/*.js            ${PREFIX}/vector-converter/





clean : 
	rm -f cgi-env/*zo

