PREFIX=/usr/local


XSLT_LDFLAGS=-L/usr/local/lib -lxslt -lxml2 -lz -liconv -lm

ZOO_FILE=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//ulinet.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//service_internal_ms.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//service_internal.o
ZOO_DIR=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel/
ZRPATH=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//../
include ${ZRPATH}/zoo-kernel/ZOOMakefile.opts




CPPFLAGS        :=  -DZOO_SERVICE  -DUSE_CAIRO -DUSE_KML -DUSE_MS -I${ZOO_DIR}

BIN_LIST = cgi-env/service.zo

default : $(BIN_LIST)

cgi-env/service.zo: service.c
	g++ -I${INST_INCLUDE} ${GDAL_CFLAGS} ${MS_CFLAGS} ${CPPFLAGS} $(CFLAGS) $(CPPFLAGS) -shared -fpic $< ${GDAL_LIBS} ${MACOS_LD_NET_FLAGS} ${MS_LDFLAGS} ${MACOS_CFLAGS} ${MACOS_LD_FLAGS} -L${INST_LIB} -lzoo_service -o $@


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

