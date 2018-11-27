
PREFIX=/usr/local

XSLT_LDFLAGS=-lxslt -lxml2

ZOO_FILE=/home/src/zoo/zoo-project/zoo-kernel/service_internal_ms.o /home/src/zoo/zoo-project/zoo-kernel/response_print.o /home/src/zoo/zoo-project/zoo-kernel/server_internal.o /home/src/zoo/zoo-project/zoo-kernel/lex.sr.o /home/src/zoo/zoo-project/zoo-kernel/lex.cr.o /home/src/zoo/zoo-project/zoo-kernel/main_conf_read.tab.o /home/src/zoo/zoo-project/zoo-kernel/service_conf.tab.o
ZOO_DIR=/home/src/zoo/zoo-project/zoo-kernel
ZRPATH=/home/src/zoo/zoo-project/zoo-kernel/../
include ${ZOO_DIR}/ZOOMakefile.opts




CPPFLAGS        :=  -DZOO_SERVICE   -DUSE_CAIRO -DUSE_KML -DUSE_MS -I${ZOO_DIR} -I${ZOO_DIR}/../../thirds/cgic206

BIN_LIST = cgi-env/service.zo

default : $(BIN_LIST)

cgi-env/service.zo: service.c
	g++ ${ZOO_CFLAGS} -I${INST_INCLUDE} ${FCGI_CFLAGS} ${YAML_CFLAGS} ${MACOS_CFLAGS} ${XML2CFLAGS} ${GDAL_CFLAGS} ${MS_CFLAGS} ${CPPFLAGS} -shared -fpic $< ${ZOO_FILE} ${XSLT_LDFLAGS} ${XML2LDFLAGS} -L${INST_LIB} -lzoo_service ${ZOO_LDFLAGS} -I${INST_INCLUDE} ${FCGI_CFLAGS} ${YAML_CFLAGS} ${MACOS_CFLAGS} ${XML2CFLAGS} ${GDAL_LIBS} ${MS_LDFLAGS} -lc ${MACOS_LD_FLAGS} ${MACOS_LD_NET_FLAGS} -lcrypto  -lcurl -lfcgi ${YAML_LDFLAGS} -o $@

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


