AC_INIT([ZOO service], [1.0.0], [bugs@mapmint.com])

# Checks for programs.
AC_PROG_CC
AC_PROG_CXX

# Checks for header files.
AC_FUNC_ALLOCA
AC_CHECK_HEADERS([fcntl.h inttypes.h libintl.h malloc.h stddef.h stdlib.h string.h unistd.h])

# Checks for typedefs, structures, and compiler characteristics.
AC_HEADER_STDBOOL
AC_TYPE_INT16_T
AC_TYPE_INT32_T
AC_TYPE_INT8_T
AC_TYPE_PID_T
AC_TYPE_SIZE_T
AC_TYPE_UINT16_T
AC_TYPE_UINT32_T
AC_TYPE_UINT8_T

# Checks for library functions.
AC_FUNC_FORK
AC_FUNC_MALLOC
AC_FUNC_REALLOC
AC_CHECK_FUNCS([dup2 getcwd memset setenv strdup strstr])


#============================================================================
# Detect if GEOS is installed
#============================================================================

#AC_ARG_WITH([geos-config], 
#	[AS_HELP_STRING([--with-geos-config=FILE], [specify an alternative geos-config file])], 
#	[GEOS_CONFIG="$withval"], [GEOS_CONFIG=""])
#if test -z $GEOS_CONFIG;
#then
#	AC_PATH_PROG([GEOS_CONFIG], [geos-config])
#	if test -z $GEOS_CONFIG; 
#	then
#		AC_MSG_ERROR([could not find gdal-config from GEOS within the current path. You may need to try re-running configure with a --with-geos-config parameter.])
#	fi
#	
#else
#	if test -f $GEOS_CONFIG; then
#		AC_MSG_RESULT([Using user-specified geos-config file: $GEOS_CONFIG])
#	else
#		AC_MSG_ERROR([the user-specified geos-config file $GEOS_CONFIG does not exist])
#	fi
#fi
#
#GEOS_CFLAGS="`$GEOS_CONFIG --cflags`"
#GEOS_LIBS="`$GEOS_CONFIG --libs`"
#
#AC_SUBST([GEOS_CFLAGS])
#AC_SUBST([GEOS_LIBS])
#
##============================================================================
## Detect if gdal is installed
##============================================================================
#
#AC_ARG_WITH([gdal-config], 
#	[AS_HELP_STRING([--with-gdal-config=FILE], [specify an alternative gdal-config file])], 
#	[GDAL_CONFIG="$withval"], [GDAL_CONFIG=""])
#if test -z $GDAL_CONFIG;
#then
#	AC_PATH_PROG([GDAL_CONFIG], [gdal-config])
#	if test -z $GDAL_CONFIG; 
#	then
#		AC_MSG_ERROR([could not find gdal-config from libgdal within the current path. You may need to try re-running configure with a --with-gdal-config parameter.])
#	fi
#	
#else
#	if test -f $GDAL_CONFIG; then
#		AC_MSG_RESULT([Using user-specified gdal-config file: $GDAL_CONFIG])
#	else
#		AC_MSG_ERROR([the user-specified gdal-config file $GDAL_CONFIG does not exist])
#	fi
#fi
#
#GDAL_CFLAGS="`$GDAL_CONFIG --cflags`"
#GDAL_LIBS="`$GDAL_CONFIG --libs`"
#
#AC_SUBST([GDAL_CFLAGS])
#AC_SUBST([GDAL_LIBS])

# ===========================================================================
# Detect if libxml2 is installed
# ===========================================================================
#
#AC_ARG_WITH([xml2config], 
#	[AS_HELP_STRING([--with-xml2config=FILE], [specify an alternative xml2-config file])], 
#	[XML2CONFIG="$withval"], [XML2CONFIG=""])
#
#if test "x$XML2CONFIG" = "x"; then
#	# XML2CONFIG was not specified, so search within the current path
#	AC_PATH_PROG([XML2CONFIG], [xml2-config])
#
#	# If we couldn't find xml2-config, display a warning
#	if test "x$XML2CONFIG" = "x"; then
#		AC_MSG_ERROR([could not find xml2-config from libxml2 within the current path. You may need to try re-running configure with a --with-xml2config parameter.])
#	fi
#else
#	# XML2CONFIG was specified; display a message to the user
#	if test "x$XML2CONFIG" = "xyes"; then
#		AC_MSG_ERROR([you must specify a parameter to --with-xml2config, e.g. --with-xml2config=/path/to/xml2-config])
#	else
#		if test -f $XML2CONFIG; then
#			AC_MSG_RESULT([Using user-specified xml2-config file: $XML2CONFIG])
#		else
#			AC_MSG_ERROR([the user-specified xml2-config file $XML2CONFIG does not exist])
#		fi	
#	fi
#fi
#
## Extract the linker and include flags 
#XML2_LDFLAGS=`$XML2CONFIG --libs`
#XML2_CPPFLAGS=`$XML2CONFIG --cflags`
#
## Check headers file
#CPPFLAGS_SAVE="$CPPFLAGS"
#CPPFLAGS="$XML2_CPPFLAGS"
#AC_CHECK_HEADERS([libxml/tree.h libxml/parser.h libxml/xpath.h libxml/xpathInternals.h],
#		 [], [AC_MSG_ERROR([could not find headers include related to libxml2])])
#
## Ensure we can link against libxml2
#LIBS_SAVE="$LIBS"
#LIBS="$XML2_LDFLAGS"
#AC_CHECK_LIB([xml2], [xmlInitParser], [], [AC_MSG_ERROR([could not find libxml2])], [])
#
#AC_SUBST([XML2_CPPFLAGS])
#AC_SUBST([XML2_LDFLAGS])

#============================================================================
# Detect if mapserver is installed
#============================================================================

#AC_ARG_WITH([mapserver], 
#       [AS_HELP_STRING([--with-mapserver=PATH], [specify the path for MapServer compiled source tree])], 
#       [MS_SRC_PATH="$withval"], [MS_SRC_PATH=""])
#
#AC_MSG_RESULT([Using user-specified MapServer src path: $MS_SRC_PATH])
#
#if test -z $MS_SRC_PATH;
#then
#	AC_MSG_ERROR([the user-specified mapserver compiled source tree  $MS_SRC_PATH does not exist])
#else
#	MS_DIR=$MS_SRC_PATH
#	MS_CFLAGS=`$MS_SRC_PATH/mapserver-config --cflags`
#	MS_LIB="`$MS_SRC_PATH/mapserver-config --libs` $MS_SRC_PATH/libmapserver.a"
#fi
#
#AC_SUBST([MS_CFLAGS])
#AC_SUBST([MS_LIB])
#AC_SUBST([MS_DIR])

AC_ARG_WITH([zoo-kernel],
       [AS_HELP_STRING([--with-zoo-kernel=PATH], [specify the path for zoo-kernel compiled source tree])],
       [ZOO_SRC_PATH="$withval"], [ZOO_SRC_PATH=""])

AC_MSG_RESULT([Using user-specified  src path: $ZOO_SRC_PATH])

if test -z $ZOO_SRC_PATH;
then
	AC_MSG_ERROR([the user-specified zoo-kernel compiled source tree  $ZOO_SRC_PATH does not exist])
else
        ZOO_DIR=$ZOO_SRC_PATH
	ZOO_FILE="$ZOO_SRC_PATH/service_internal.o"
fi

AC_SUBST([ZOO_FILE])
AC_SUBST([ZOO_DIR])

AC_ARG_WITH([freetypeconfig],
        [AS_HELP_STRING([--with-freetypeconfig=FILE], [specify an alternative freetype-config file])],
        [FTCONFIG="$withval"], [FTCONFIG=""])

if test "x$FTCONFIG" = "x"; then
        # FTCONFIG was not specified, so search within the current path
        AC_PATH_PROG([FTCONFIG], [freetype-config])

        # If we couldn't find freetype-config, display a warning
        if test "x$FTCONFIG" = "x"; then
                AC_MSG_ERROR([could not find freetype-config within the current path. You may need to try re-running configure with a --with-freetypeconfig parameter.])
        fi
else
        # FTCONFIG was specified; display a message to the user
        if test "x$FTCONFIG" = "xyes"; then
                AC_MSG_ERROR([you must specify a parameter to --with-freetypeconfig, e.g. --with-freetypeconfig=/path/to/freetype-config])
        else
                if test -f $FTCONFIG; then
                        AC_MSG_RESULT([Using user-specified freetype-config file: $FTCONFIG])
                else
                        AC_MSG_ERROR([the user-specified freetype-config file $FTCONFIG does not exist])
                fi
        fi
fi
FT_CFLAGS=`freetype-config --cflags`
FT_LDFLAGS=`freetype-config --libs`

AC_SUBST([FT_LDFLAGS])
AC_SUBST([FT_CFLAGS])
AC_CONFIG_FILES([Makefile])
AC_OUTPUT
