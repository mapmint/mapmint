MACOS_CPP=-arch x86_64


PREFIX=/usr/local
ZOO_FILE=#/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//service_internal.o
ZOO_DIR=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel/

FT_LDFLAGS=-L/usr/local/lib -L/opt/X11/lib -lfreetype -lz -lbz2
FT_CFLAGS=-I/opt/X11/include/freetype2


ZRPATH=/Users/djay/MapMint/zoo-project-1.5.0/trunk/zoo-project/zoo-kernel//../
include ${ZRPATH}/zoo-kernel/ZOOMakefile.opts



CPPFLAGS        :=  -DZOO_SERVICE  -DUSE_KML -I${ZOO_DIR}

BIN_LIST = cgi-env/service.zo

default : $(BIN_LIST)

cgi-env/service.zo: service.c
	g++  ${FT_CFLAGS} ${CPPFLAGS} -shared -fpic $< ${ZOO_FILE} ${MACOS_LD_NET_FLAGS} ${FT_LDFLAGS} -lc  -lcrypto -lzoo_service ${GDAL_LDFLAGS} -o $@



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

