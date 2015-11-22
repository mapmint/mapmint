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

AC_ARG_WITH([zoo-kernel],
       [AS_HELP_STRING([--with-zoo-kernel=PATH], [specify the path for zoo-kernel compiled source tree])],
       [ZOO_SRC_PATH="$withval"], [ZOO_SRC_PATH=""])

AC_MSG_RESULT([Using user-specified  src path: $ZOO_SRC_PATH])

if test -z $ZOO_SRC_PATH;
then
	AC_MSG_ERROR([the user-specified zoo-kernel compiled source tree  $ZOO_SRC_PATH does not exist])
else
        ZOO_DIR=$ZOO_SRC_PATH
	ZOO_FILE="$ZOO_SRC_PATH/service_internal_ms.o $ZOO_SRC_PATH/response_print.o $ZOO_SRC_PATH/server_internal.o"
fi

AC_SUBST([ZOO_FILE])
AC_SUBST([ZOO_DIR])

AC_ARG_WITH([xsltconfig],
        [AS_HELP_STRING([--with-xsltconfig=FILE], [specify an alternative xslt-config file])],
        [XSLTCONFIG="$withval"], [XML2CONFIG=""])

if test "x$XSLTCONFIG" = "x"; then
        # XSLTCONFIG was not specified, so search within the current path
        AC_PATH_PROG([XSLTCONFIG], [xslt-config])

        # If we couldn't find xslt-config, display a warning
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
