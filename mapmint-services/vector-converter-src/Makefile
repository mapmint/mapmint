#GDAL_SRC=./gdal_src/

#include $(GDAL_SRC)GDALmake.opt

ZOO_PATH=/Users/djay/MapMint/zoo-project/

CPPFLAGS        :=      $(GDAL_INCLUDE) -I$(GDAL_ROOT)/frmts $(CPPFLAGS) -DUSE_CAIRO -DUSE_KML -DUSE_MS -DDEBUGMS `mapserver-config --includes` -I/Users/djay/MapMint/zoo-project/zoo-project/zoo-kernel/ -I/Users/djay/MapMint/zoo-project/zoo-project/trunk/thirds/cgic206 -I/Users/djay/MapMint/src/mapserver-6.2.0 
DEP_LIBS        =       $(EXE_DEP_LIBS) $(XTRAOBJ)
BIN_LIST = cgi-env/service.zo

default:        $(BIN_LIST)

all: default

lib-depend:
	(cd $(GDAL_SRC)/gcore ; $(MAKE) )
	(cd $(GDAL_SRC)/port ; $(MAKE) )

CFLAGS=-DZOO_SERVICE -I/Users/djay/MapMint/zoo-project/zoo-project/zoo-kernel/


cgi-env/service.zo: service.c $(DEP_LIBS)
	g++ `xml2-config --cflags` `/Library/Frameworks/GDAL.framework/unix/bin/gdal-config --cflags` $(CFLAGS) $(CPPFLAGS) -shared -fpic $< `xslt-config --libs` `xml2-config --libs` `/Library/Frameworks/GDAL.framework/unix/bin/gdal-config --libs` ${ZOO_PATH}/zoo-project/zoo-kernel/ulinet.o ${ZOO_PATH}/zoo-project/zoo-kernel/service_internal_ms.o ${ZOO_PATH}/zoo-project/zoo-kernel/service_internal.o ${ZOO_PATH}/zoo-project/zoo-kernel/service_internal_js.o -lc -lintl -lcrypto -lmapserver -lintl -lmozjs185 -lcurl -lfcgi -framework SystemConfiguration -framework CoreFoundation -o $@

clean:
	rm -f cgi-env/*zo
