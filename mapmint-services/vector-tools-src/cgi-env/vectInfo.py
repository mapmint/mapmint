#!/usr/bin/env python
# /******************************************************************************
# * $Id$
# *
# * Project:  OpenGIS Simple Features Reference Implementation
# * Purpose:  Python port of a simple client for viewing OGR driver data.
# * Author:   Even Rouault, <even dot rouault at mines dash paris dot org>
# *
# * Port from ogrinfo.cpp whose author is Frank Warmerdam
# *
# ******************************************************************************
# * Copyright (c) 2010, Even Rouault
# * Copyright (c) 1999, Frank Warmerdam
# *
# * Permission is hereby granted, free of charge, to any person obtaining a
# * copy of this software and associated documentation files (the "Software"),
# * to deal in the Software without restriction, including without limitation
# * the rights to use, copy, modify, merge, publish, distribute, sublicense,
# * and/or sell copies of the Software, and to permit persons to whom the
# * Software is furnished to do so, subject to the following conditions:
# *
# * The above copyright notice and this permission notice shall be included
# * in all copies or substantial portions of the Software.
# *
# * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
# * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# * DEALINGS IN THE SOFTWARE.
# ****************************************************************************/

# Note : this is the most direct port of ogrinfo.cpp possible
# It could be made much more Python'ish !

import sys

try:
    from osgeo import gdal
    from osgeo import ogr
except:
    import gdal
    import ogr

bReadOnly = False
bVerbose = True
bSummaryOnly = False
nFetchFID = ogr.NullFID
papszOptions = None


def EQUAL(a, b):
    return a.lower() == b.lower()


# /************************************************************************/
# /*                                main()                                */
# /************************************************************************/

def vectInfo(conf, inputs, outputs):
    global bReadOnly
    global bVerbose
    global bSummaryOnly
    global nFetchFID
    global papszOptions

    pszWHERE = None
    pszDataSource = None
    papszLayers = None
    poSpatialFilter = None
    nRepeatCount = 1
    bAllLayers = False
    pszSQLStatement = None
    pszDialect = None
    options = {}

    pszSQLStatement = inputs["q"]["value"]
    pszDataSource = inputs["dstName"]["value"]
    papszLayers.append(inputs["dsoName"]["value"])

    # /* -------------------------------------------------------------------- */
    # /*      Open data source.                                               */
    # /* -------------------------------------------------------------------- */
    poDS = None
    poDriver = None

    poDS = ogr.Open(pszDataSource, not bReadOnly)
    if poDS is None and not bReadOnly:
        poDS = ogr.Open(pszDataSource, False)
        if poDS is not None and bVerbose:
            zoo.info("Had to open data source read-only.")
            bReadOnly = True

    # /* -------------------------------------------------------------------- */
    # /*      Report failure                                                  */
    # /* -------------------------------------------------------------------- */
    if poDS is None:
        zoo.info("FAILURE:\n" \
              "Unable to open datasource `%s' with the following drivers." % pszDataSource)
        conf["lenv"]["message"] = "FAILURE:\n" \
                                  "Unable to open datasource `%s' with the following drivers." % pszDataSource
        for iDriver in range(ogr.GetDriverCount()):
            zoo.info("  -> %s" % ogr.GetDriver(iDriver).GetName())
            conf["lenv"]["message"] += "  -> %s" % ogr.GetDriver(iDriver).GetName()
        return 4

    poDriver = poDS.GetDriver()

    # /* -------------------------------------------------------------------- */
    # /*      Some information messages.                                      */
    # /* -------------------------------------------------------------------- */
    if bVerbose:
        zoo.info("INFO: Open of `%s'\n" \
              "      using driver `%s' successful." % (pszDataSource, poDriver.GetName()))

    poDS_Name = poDS.GetName()
    if str(type(pszDataSource)) == "<type 'unicode'>" and str(type(poDS_Name)) == "<type 'str'>":
        poDS_Name = str(poDS_Name, "utf8")
    if bVerbose and pszDataSource != poDS_Name:
        zoo.info("INFO: Internal data source name `%s'\n" \
              "      different from user name `%s'." % (poDS_Name, pszDataSource))

    # /* -------------------------------------------------------------------- */
    # /*      Special case for -sql clause.  No source layers required.       */
    # /* -------------------------------------------------------------------- */
    if pszSQLStatement is not None:
        poResultSet = None

        nRepeatCount = 0  # // skip layer reporting.

        if papszLayers is not None:
            zoo.info("layer names ignored in combination with -sql.")

        poResultSet = poDS.ExecuteSQL(pszSQLStatement, poSpatialFilter,
                                      pszDialect)

        if poResultSet is not None:
            if pszWHERE is not None:
                poResultSet.SetAttributeFilter(pszWHERE)

            ReportOnLayer(poResultSet, None, None, options)
            poDS.ReleaseResultSet(poResultSet)

    # gdal.Debug( "OGR", "GetLayerCount() = %d\n", poDS.GetLayerCount() )

    for iRepeat in range(nRepeatCount):
        if papszLayers is None:
            # /* -------------------------------------------------------------------- */
            # /*      Process each data source layer.                                 */
            # /* -------------------------------------------------------------------- */
            for iLayer in range(poDS.GetLayerCount()):
                poLayer = poDS.GetLayer(iLayer)

                if poLayer is None:
                    zoo.info("FAILURE: Couldn't fetch advertised layer %d!" % iLayer)
                    return 1

                if not bAllLayers:
                    line = "%d: %s" % (iLayer + 1, poLayer.GetLayerDefn().GetName())

                    if poLayer.GetLayerDefn().GetGeomType() != ogr.wkbUnknown:
                        line = line + " (%s)" % ogr.GeometryTypeToName(poLayer.GetLayerDefn().GetGeomType())

                    zoo.info(str(line))
                else:
                    if iRepeat != 0:
                        poLayer.ResetReading()

                    ReportOnLayer(poLayer, pszWHERE, poSpatialFilter, options)

        else:
            # /* -------------------------------------------------------------------- */
            # /*      Process specified data source layers.                           */
            # /* -------------------------------------------------------------------- */
            for papszIter in papszLayers:
                poLayer = poDS.GetLayerByName(papszIter)
                if poLayer is None:
                    zoo.info("FAILURE: Couldn't fetch requested layer %s!" % papszIter)
                    return 1

                if iRepeat != 0:
                    poLayer.ResetReading()

                ReportOnLayer(poLayer, pszWHERE, poSpatialFilter, options)

    # /* -------------------------------------------------------------------- */
    # /*      Close down.                                                     */
    # /* -------------------------------------------------------------------- */
    poDS.Destroy()

    return 0


# /************************************************************************/
# /*                               Usage()                                */
# /************************************************************************/

def Usage():
    zoo.info("Usage: ogrinfo [--help-general] [-ro] [-q] [-where restricted_where]\n"
          "               [-spat xmin ymin xmax ymax] [-fid fid]\n"
          "               [-sql statement] [-al] [-so] [-fields={YES/NO}]\n"
          "               [-geom={YES/NO/SUMMARY}][--formats]\n"
          "               datasource_name [layer [layer ...]]")
    return 1


# /************************************************************************/
# /*                           ReportOnLayer()                            */
# /************************************************************************/

def ReportOnLayer(poLayer, pszWHERE, poSpatialFilter, options):
    poDefn = poLayer.GetLayerDefn()

    # /* -------------------------------------------------------------------- */
    # /*      Set filters if provided.                                        */
    # /* -------------------------------------------------------------------- */
    if pszWHERE is not None:
        poLayer.SetAttributeFilter(pszWHERE)

    if poSpatialFilter is not None:
        poLayer.SetSpatialFilter(poSpatialFilter)

    # /* -------------------------------------------------------------------- */
    # /*      Report various overall information.                             */
    # /* -------------------------------------------------------------------- */
    zoo.info("")

    zoo.info("Layer name: %s" % poDefn.GetName())

    if bVerbose:
        zoo.info("Geometry: %s" % ogr.GeometryTypeToName(poDefn.GetGeomType()))

        zoo.info("Feature Count: %d" % poLayer.GetFeatureCount())

        oExt = poLayer.GetExtent(True)
        if oExt is not None:
            zoo.info("Extent: (%f, %f) - (%f, %f)" % (oExt[0], oExt[1], oExt[2], oExt[3]))

        if poLayer.GetSpatialRef() is None:
            pszWKT = "(unknown)"
        else:
            pszWKT = poLayer.GetSpatialRef().ExportToPrettyWkt()

        zoo.info("Layer SRS WKT:\n%s" % pszWKT)

        if len(poLayer.GetFIDColumn()) > 0:
            zoo.info("FID Column = %s" % poLayer.GetFIDColumn())

        if len(poLayer.GetGeometryColumn()) > 0:
            zoo.info("Geometry Column = %s" % poLayer.GetGeometryColumn())

        for iAttr in range(poDefn.GetFieldCount()):
            poField = poDefn.GetFieldDefn(iAttr)

            zoo.info("%s: %s (%d.%d)" % ( \
                poField.GetNameRef(), \
                poField.GetFieldTypeName(poField.GetType()), \
                poField.GetWidth(), \
                poField.GetPrecision()))

    # /* -------------------------------------------------------------------- */
    # /*      Read, and dump features.                                        */
    # /* -------------------------------------------------------------------- */
    poFeature = None

    if nFetchFID == ogr.NullFID and not bSummaryOnly:

        poFeature = poLayer.GetNextFeature()
        while poFeature is not None:
            DumpReadableFeature(poFeature, options)
            poFeature = poLayer.GetNextFeature()

    elif nFetchFID != ogr.NullFID:

        poFeature = poLayer.GetFeature(nFetchFID)
        if poFeature is None:
            zoo.info("Unable to locate feature id %d on this layer." % nFetchFID)

        else:
            DumpReadableFeature(poFeature, options)

    return


def DumpReadableFeature(poFeature, options=None):
    poDefn = poFeature.GetDefnRef()
    zoo.info("OGRFeature(%s):%ld" % (poDefn.GetName(), poFeature.GetFID()))

    if 'DISPLAY_FIELDS' not in options or EQUAL(options['DISPLAY_FIELDS'], 'yes'):
        for iField in range(poDefn.GetFieldCount()):

            poFDefn = poDefn.GetFieldDefn(iField)

            line = "  %s (%s) = " % ( \
                poFDefn.GetNameRef(), \
                ogr.GetFieldTypeName(poFDefn.GetType()))

            if poFeature.IsFieldSet(iField):
                line = line + "%s" % (poFeature.GetFieldAsString(iField))
            else:
                line = line + "(null)"

            zoo.info(str(line))

    if poFeature.GetStyleString() is not None:

        if 'DISPLAY_STYLE' not in options or EQUAL(options['DISPLAY_STYLE'], 'yes'):
            zoo.info("  Style = %s" % GetStyleString())

    poGeometry = poFeature.GetGeometryRef()
    if poGeometry is not None:
        if 'DISPLAY_GEOMETRY' not in options or not EQUAL(options['DISPLAY_GEOMETRY'], 'no'):
            DumpReadableGeometry(poGeometry, "  ", options)

    zoo.info('')

    return


def DumpReadableGeometry(poGeometry, pszPrefix, options):
    if pszPrefix == None:
        pszPrefix = ""

    if 'DISPLAY_GEOMETRY' in options and EQUAL(options['DISPLAY_GEOMETRY'], 'SUMMARY'):

        line = ("%s%s : " % (pszPrefix, poGeometry.GetGeometryName()))
        eType = poGeometry.GetGeometryType()
        if eType == ogr.wkbLineString or eType == ogr.wkbLineString25D:
            line = line + ("%d points" % poGeometry.GetPointCount())
            zoo.info(str(line))
        elif eType == ogr.wkbPolygon or eType == ogr.wkbPolygon25D:
            nRings = poGeometry.GetGeometryCount()
            if nRings == 0:
                line = line + "empty"
            else:
                poRing = poGeometry.GetGeometryRef(0)
                line = line + ("%d points" % poRing.GetPointCount())
                if nRings > 1:
                    line = line + (", %d inner rings (" % (nRings - 1))
                    for ir in range(0, nRings - 1):
                        if ir > 0:
                            line = line + ", "
                        poRing = poGeometry.GetGeometryRef(ir + 1)
                        line = line + ("%d points" % poRing.GetPointCount())
                    line = line + ")"
            zoo.info(str(line))

        elif eType == ogr.wkbMultiPoint or \
                eType == ogr.wkbMultiPoint25D or \
                eType == ogr.wkbMultiLineString or \
                eType == ogr.wkbMultiLineString25D or \
                eType == ogr.wkbMultiPolygon or \
                eType == ogr.wkbMultiPolygon25D or \
                eType == ogr.wkbGeometryCollection or \
                eType == ogr.wkbGeometryCollection25D:

            line = line + "%d geometries:" % poGeometry.GetGeometryCount()
            zoo.info(str(line))
            for ig in range(poGeometry.GetGeometryCount()):
                subgeom = poGeometry.GetGeometryRef(ig)
                from sys import version_info
                if version_info >= (3, 0, 0):
                    exec('print("", end=" ")')
                else:
                    exec('print("",)')
                DumpReadableGeometry(subgeom, pszPrefix, options)
        else:
            zoo.info(str(line))

    elif 'DISPLAY_GEOMETRY' not in options or EQUAL(options['DISPLAY_GEOMETRY'], 'yes') \
            or EQUAL(options['DISPLAY_GEOMETRY'], 'WKT'):

        zoo.info("%s%s" % (pszPrefix, poGeometry.ExportToWkt()))

    return


if __name__ == '__main__':
    version_num = int(gdal.VersionInfo('VERSION_NUM'))
    if version_num < 1800:  # because of ogr.GetFieldTypeName
        zoo.info('ERROR: Python bindings of GDAL 1.8.0 or later required')
        sys.exit(1)

    sys.exit(main(sys.argv))
