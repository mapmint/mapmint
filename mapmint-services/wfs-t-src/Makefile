
PREFIX=/usr/local

XSLT_LDFLAGS=-lxslt -lxml2

ZOO_DIR=/home/src/zoo/zoo-project/zoo-kernel
ZRPATH=/home/src/zoo/zoo-project/zoo-kernel/../
include ${ZRPATH}/zoo-kernel/ZOOMakefile.opts



CPPFLAGS        :=       -DUSE_CAIRO -DUSE_KML -DUSE_MS -I${ZOO_DIR}

BIN_LIST = cgi-env/wfst_sp.zo

default : $(BIN_LIST)

cgi-env/wfst_sp.zo: service.c
	g++ ${XML2_CPPFLAGS} ${GDAL_CFLAGS} ${MS_CFLAGS} ${CPPFLAGS} -shared -fpic $< ${XSLT_LDFLAGS} ${XML2LDFLAGS}  ${ZRPATH}/zoo-kernel/${MS_FILE}  ${MS_LIB} -lc  -lcrypto  -lcurl -lfcgi -o $@ ${GDAL_LIBS} 

install: 
	install -d ${PREFIX}/wfs-t/
	install $(BIN_LIST)             ${PREFIX}/wfs-t/
	install cgi-env/*.zcfg          ${PREFIX}/wfs-t/
	cd ${PREFIX}/wfs-t/ && ln -s ../main.cfg
	cd ${PREFIX}/wfs-t/ && ln -s ../ZOO-api.js
	cd ${PREFIX}/wfs-t/ && ln -s ../ZOO-proj4js.js




clean : 
	rm -f cgi-env/*zo

