include ${ZRPATH}/zoo-kernel/ZOOMakefile.opts
CFLAGS=${MS_CFLAGS} ${ZOO_CFLAGS} ${XML2CFLAGS} ${GDAL_CFLAGS} ${PYTHONCFLAGS} -DLINUX_FREE_ISSUE #-DDEBUG
CC=gcc

cgi-env/service.zo: service.c service1.c
	g++ ${CFLAGS} -shared -fpic -o cgi-env/service.zo ./service.c ./service1.c ${GDAL_LIBS} ${MACOS_LD_FLAGS} -lzoo_service -lfcgi

install:
	install -d ${CGI_DIR}/gdal/translate
	install cgi-env/* ${CGI_DIR}/gdal/translate



clean:
	rm -f cgi-env/*.zo
