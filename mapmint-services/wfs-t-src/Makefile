ZOO_PATH=/Users/djay/zoo-project-1.2.0/trunk/zoo-project/
CFLAGS= -I./mapserver_src/ -I${ZOO_PATH}/zoo-kernel/ -I./ `xml2-config --cflags` `python-config --cflags | sed 's:-arch i386::g'`  `gdal-config --cflags` -DLINUX_FREE_ISSUE #-DDEBUG
CC=gcc

cgi-env/wfst_sp.zo: service.c
	g++ `./mapserver_src//mapserver-config --cflags` `./mapserver_src//mapserver-config --defines` ${CFLAGS} -shared -fpic -o cgi-env/wfst_sp.zo ./mapserver_src/mapogcfilter.o ./service.c -lgd -L/usr/local/lib -lgd -ljpeg -lfreetype -lz -lpng -lz  ./mapserver_src/libmapserver.a `gdal-config --libs` `./mapserver_src//mapserver-config --libs`

#-lX11 -lXpm

clean:
	rm -f cgi-env/wfst_sp.zo
