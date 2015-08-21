
PREFIX=/usr/local

XSLT_LDFLAGS=-L/usr/local/lib -lxslt -lxml2 -lz -liconv -lm

ZOO_FILE=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//service_internal_ms.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//response_print.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//server_internal.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//lex.sr.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//service_conf.tab.o /Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//service_yaml.o
ZOO_DIR=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel/
ZRPATH=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//../
include ${ZRPATH}/zoo-kernel/ZOOMakefile.opts




CPPFLAGS        :=  -DZOO_SERVICE   -DUSE_CAIRO -DUSE_KML -DUSE_MS -I${ZOO_DIR} -I${ZOO_DIR}/../../thirds/cgic206

BIN_LIST = cgi-env/service.zo

default : $(BIN_LIST)

cgi-env/service.zo: service.c
	g++ ${XML2_CPPFLAGS} ${GDAL_CFLAGS} ${MS_CFLAGS} ${CPPFLAGS} -shared -fpic $< ${XSLT_LDFLAGS} ${XML2LDFLAGS}  ${ZOO_FILE} -lzoo_service ${MS_LDFLAGS} -lc  -lintl -lyaml -lcrypto  -lcurl -lfcgi -o $@

install:
	install -d ${PREFIX}/vector-tools/
	install $(BIN_LIST) 		${PREFIX}/vector-tools/
	install cgi-env/*.zcfg		${PREFIX}/vector-tools/
	install cgi-env/*.py		${PREFIX}/vector-tools/
	install cgi-env/*.js		${PREFIX}/vector-tools/
	cd ${PREFIX}/vector-tools/ && ln -s ../main.cfg
	cd ${PREFIX}/vector-tools/ && ln -s ../ZOO-api.js
	cd ${PREFIX}/vector-tools/ && ln -s ../ZOO-proj4js.js



clean : 
	rm -f cgi-env/*zo


