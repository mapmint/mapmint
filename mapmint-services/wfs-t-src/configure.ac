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
# Detect if gdal is installed
#============================================================================

AC_ARG_WITH([gdal-config], 
	[AS_HELP_STRING([--with-gdal-config=FILE], [specify an alternative gdal-config file])], 
	[GDAL_CONFIG="$withval"], [GDAL_CONFIG=""])
if test -z $GDAL_CONFIG;
then
	AC_PATH_PROG([GDAL_CONFIG], [gdal-config])
	if test -z $GDAL_CONFIG; 
	then
		AC_MSG_ERROR([could not find gdal-config from libgdal within the current path. You may need to try re-running configure with a --with-gdal-config parameter.])
	fi
	
else
	if test -f $GDAL_CONFIG; then
		AC_MSG_RESULT([Using user-specified gdal-config file: $GDAL_CONFIG])
	else
		AC_MSG_ERROR([the user-specified gdal-config file $GDAL_CONFIG does not exist])
	fi
fi

GDAL_CFLAGS="`$GDAL_CONFIG --cflags`"
GDAL_LIBS="`$GDAL_CONFIG --libs`"

AC_SUBST([GDAL_CFLAGS])
AC_SUBST([GDAL_LIBS])

# ===========================================================================
# Detect if libxml2 is installed
# ===========================================================================

AC_ARG_WITH([xml2config], 
	[AS_HELP_STRING([--with-xml2config=FILE], [specify an alternative xml2-config file])], 
	[XML2CONFIG="$withval"], [XML2CONFIG=""])

if test "x$XML2CONFIG" = "x"; then
	# XML2CONFIG was not specified, so search within the current path
	AC_PATH_PROG([XML2CONFIG], [xml2-config])

	# If we couldn't find xml2-config, display a warning
	if test "x$XML2CONFIG" = "x"; then
		AC_MSG_ERROR([could not find xml2-config from libxml2 within the current path. You may need to try re-running configure with a --with-xml2config parameter.])
	fi
else
	# XML2CONFIG was specified; display a message to the user
	if test "x$XML2CONFIG" = "xyes"; then
		AC_MSG_ERROR([you must specify a parameter to --with-xml2config, e.g. --with-xml2config=/path/to/xml2-config])
	else
		if test -f $XML2CONFIG; then
			AC_MSG_RESULT([Using user-specified xml2-config file: $XML2CONFIG])
		else
			AC_MSG_ERROR([the user-specified xml2-config file $XML2CONFIG does not exist])
		fi	
	fi
fi

# Extract the linker and include flags 
XML2_LDFLAGS=`$XML2CONFIG --libs`
XML2_CPPFLAGS=`$XML2CONFIG --cflags`

# Check headers file
CPPFLAGS_SAVE="$CPPFLAGS"
CPPFLAGS="$XML2_CPPFLAGS"
AC_CHECK_HEADERS([libxml/tree.h libxml/parser.h libxml/xpath.h libxml/xpathInternals.h],
		 [], [AC_MSG_ERROR([could not find headers include related to libxml2])])

# Ensure we can link against libxml2
LIBS_SAVE="$LIBS"
LIBS="$XML2_LDFLAGS"
AC_CHECK_LIB([xml2], [xmlInitParser], [], [AC_MSG_ERROR([could not find libxml2])], [])

AC_SUBST([XML2_CPPFLAGS])
AC_SUBST([XML2_LDFLAGS])

#============================================================================
# Detect if mapserver is installed
#============================================================================

AC_ARG_WITH([mapserver], 
       [AS_HELP_STRING([--with-mapserver=PATH], [specify the path for MapServer compiled source tree])], 
       [MS_SRC_PATH="$withval"], [MS_SRC_PATH=""])

AC_MSG_RESULT([Using user-specified MapServer src path: $MS_SRC_PATH])

if test -z $MS_SRC_PATH;
then
	AC_MSG_ERROR([the user-specified mapserver compiled source tree  $MS_SRC_PATH does not exist])
else
	MS_DIR=$MS_SRC_PATH
	MS_CFLAGS=`$MS_SRC_PATH/mapserver-config --cflags`
	MS_LIB="$MS_SRC_PATH/libmapserver.a `$MS_SRC_PATH/mapserver-config --libs`"
	MS_FILE=$MS_SRC_PATH/mapogcfilter.o
fi

AC_SUBST([MS_FILE])
AC_SUBST([MS_CFLAGS])
AC_SUBST([MS_LIB])
AC_SUBST([MS_DIR])

AC_ARG_WITH([zoo-kernel],
       [AS_HELP_STRING([--with-zoo-kernel=PATH], [specify the path for zoo-kernel compiled source tree])],
       [ZOO_SRC_PATH="$withval"], [ZOO_SRC_PATH=""])

AC_MSG_RESULT([Using user-specified  src path: $ZOO_SRC_PATH])

if test -z $ZOO_SRC_PATH;
then
	AC_MSG_ERROR([the user-specified zoo-kernel compiled source tree  $ZOO_SRC_PATH does not exist])
else
        ZOO_DIR=$ZOO_SRC_PATH
fi

AC_SUBST([ZOO_DIR])

AC_ARG_WITH([xsltconfig],
        [AS_HELP_STRING([--with-xsltconfig=FILE], [specify an alternative xslt-config file])],
        [XSLTCONFIG="$withval"], [XML2CONFIG=""])

if test "x$XML2CONFIG" = "x"; then
        # XML2CONFIG was not specified, so search within the current path
        AC_PATH_PROG([XSLTCONFIG], [xslt-config])

        # If we couldn't find xml2-config, display a warning
        if test "x$XSLTCONFIG" = "x"; then
                AC_MSG_ERROR([could not find xslt-config from libxml2 within the current path. You may need to try re-running configure with a --with-xsltconfig parameter.])
        fi
else
        # XSLTCONFIG was specified; display a message to the user
        if test "x$XSLTCONFIG" = "xyes"; then
                AC_MSG_ERROR([you must specify a parameter to --with-xsltconfig, e.g. --with-xsltconfig=/path/to/xslt-config])
        else
                if test -f $XSLTCONFIG; then
                        AC_MSG_RESULT([Using user-specified xslt-config file: $XSLTCONFIG])
                else
                        AC_MSG_ERROR([the user-specified xslt-config file $XSLTCONFIG does not exist])
                fi
        fi
fi

XSLT_LDFLAGS=`xslt-config --libs`

AC_SUBST([XSLT_LDFLAGS])

AC_CONFIG_FILES([Makefile])
AC_OUTPUT
