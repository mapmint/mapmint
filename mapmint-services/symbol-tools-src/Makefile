MACOS_CPP=-arch x86_64


PREFIX=/usr/local
ZOO_FILE=/home/src/zoo/zoo-project/zoo-kernel/service_internal.o
ZOO_DIR=/home/src/zoo/zoo-project/zoo-kernel

FT_LDFLAGS=-lfreetype
FT_CFLAGS=-I/usr/include/freetype2 -I/usr/include/libpng16


ZRPATH=/home/src/zoo/zoo-project/zoo-kernel/../
include ${ZOO_DIR}/ZOOMakefile.opts



CPPFLAGS        :=  -DZOO_SERVICE  -DUSE_KML -I${ZOO_DIR}

BIN_LIST = cgi-env/service.zo

default : $(BIN_LIST)

cgi-env/service.zo: service.c
	g++  ${ZOO_CFLAGS}  ${FT_CFLAGS} ${CPPFLAGS} -shared -fpic $< ${MACOS_LD_NET_FLAGS} ${FT_LDFLAGS} -lc  -L${INST_LIB} -lzoo_service ${GDAL_LIBS} ${MACOS_LD_FLAGS} ${MACOS_LD_NET_FLAGS} ${ZOO_LDFLAGS} -lcrypto -o $@



install: 
	install -d ${PREFIX}/symbol-tools/
	install $(BIN_LIST)             ${PREFIX}/symbol-tools/
	install cgi-env/*.zcfg          ${PREFIX}/symbol-tools/
	install cgi-env/*.py            ${PREFIX}/symbol-tools/
	install cgi-env/*.js            ${PREFIX}/symbol-tools/
	cd ${PREFIX}/symbol-tools/ && ln -s ../main.cfg
	cd ${PREFIX}/symbol-tools/ && ln -s ../ZOO-api.js
	cd ${PREFIX}/symbol-tools/ && ln -s ../ZOO-proj4js.js


clean : 
	rm -f cgi-env/*zo

