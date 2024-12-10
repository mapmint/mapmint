/******************************************************************************
 * $Id: ogr2ogr.cpp 24203 2012-04-06 19:10:30Z rouault $
 *
 * Project:  OpenGIS Simple Features Reference Implementation
 * Purpose:  Simple client for translating between formats.
 * Author:   Frank Warmerdam, warmerdam@pobox.com
 *
 ******************************************************************************
 * Copyright (c) 1999, Frank Warmerdam
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 ****************************************************************************/

#include "ogrsf_frmts.h"
#include "ogr_p.h"
#include "cpl_conv.h"
#include "cpl_string.h"
#include "ogr_api.h"
#include "gdal.h"
#ifdef ZOO_SERVICE
#include "service.h"
#endif

CPL_CVSID("$Id: ogr2ogr.cpp 24203 2012-04-06 19:10:30Z rouault $");

#ifdef ZOO_SERVICE
extern "C" {
#endif

static int bSkipFailures = FALSE;
static int nGroupTransactions = 200;
static int bPreserveFID = FALSE;
static int nFIDToFetch = OGRNullFID;

static void Usage(int bShort = TRUE);

typedef enum
{
    NONE,
    SEGMENTIZE,
    SIMPLIFY_PRESERVE_TOPOLOGY,
} GeomOperation;

static int TranslateLayer(
#if GDAL_VERSION_MAJOR >= 2
			  GDALDataset
#else 
			  OGRDataSource
#endif
			  *poSrcDS, 
                           OGRLayer * poSrcLayer,
#if GDAL_VERSION_MAJOR >= 2
			  GDALDataset
#else 
			  OGRDataSource
#endif
			  *poDstDS,
                           char ** papszLSCO,
                           const char *pszNewLayerName,
                           int bTransform, 
                           OGRSpatialReference *poOutputSRS,
                           int bNullifyOutputSRS,
                           OGRSpatialReference *poSourceSRS,
                           char **papszSelFields,
                           int bAppend, int eGType,
                           int bOverwrite,
                           GeomOperation eGeomOp,
                           double dfGeomOpParam,
                           char** papszFieldTypesToString,
                           long nCountLayerFeatures,
                           int bWrapDateline,
                           OGRGeometry* poClipSrc,
                           OGRGeometry *poClipDst,
                           int bExplodeCollections,
                           const char* pszZField,
                           const char* pszWHERE,
                           GDALProgressFunc pfnProgress,
                           void *pProgressArg);


/* -------------------------------------------------------------------- */
/*                  CheckDestDataSourceNameConsistency()                */
/* -------------------------------------------------------------------- */

static
void CheckDestDataSourceNameConsistency(const char* pszDestFilename,
                                        const char* pszDriverName)
{
    int i;
    char* pszDestExtension = CPLStrdup(CPLGetExtension(pszDestFilename));

    /* TODO: Would be good to have driver metadata like for GDAL drivers ! */
    static const char* apszExtensions[][2] = { { "shp"    , "ESRI Shapefile" },
                                               { "dbf"    , "ESRI Shapefile" },
                                               { "sqlite" , "SQLite" },
                                               { "db"     , "SQLite" },
                                               { "mif"    , "MapInfo File" },
                                               { "tab"    , "MapInfo File" },
                                               { "s57"    , "S57" },
                                               { "bna"    , "BNA" },
                                               { "csv"    , "CSV" },
                                               { "gml"    , "GML" },
                                               { "kml"    , "KML/LIBKML" },
                                               { "kmz"    , "LIBKML" },
                                               { "json"   , "GeoJSON" },
                                               { "geojson", "GeoJSON" },
                                               { "dxf"    , "DXF" },
                                               { "gdb"    , "FileGDB" },
                                               { "pix"    , "PCIDSK" },
                                               { "sql"    , "PGDump" },
                                               { "gtm"    , "GPSTrackMaker" },
                                               { "gmt"    , "GMT" },
                                               { NULL, NULL }
                                              };
    static const char* apszBeginName[][2] =  { { "PG:"      , "PG" },
                                               { "MySQL:"   , "MySQL" },
                                               { "CouchDB:" , "CouchDB" },
                                               { "GFT:"     , "GFT" },
                                               { "MSSQL:"   , "MSSQLSpatial" },
                                               { "ODBC:"    , "ODBC" },
                                               { "OCI:"     , "OCI" },
                                               { "SDE:"     , "SDE" },
                                               { "WFS:"     , "WFS" },
                                               { NULL, NULL }
                                             };

    for(i=0; apszExtensions[i][0] != NULL; i++)
    {
        if (EQUAL(pszDestExtension, apszExtensions[i][0]) && !EQUAL(pszDriverName, apszExtensions[i][1]))
        {
            char* pcaMessage=(char*) malloc((155+strlen(pszDestExtension)+strlen(apszExtensions[i][1])+strlen(pszDriverName))*sizeof(char));
            sprintf(pcaMessage,
                    "Warning: The target file has a '%s' extension, which is normally used by the %s driver,"
                    "but the requested output driver is %s. Is it really what you want ?",
                    pszDestExtension,
                    apszExtensions[i][1],
                    pszDriverName);
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            break;
        }
    }

    for(i=0; apszBeginName[i][0] != NULL; i++)
    {
        if (EQUALN(pszDestFilename, apszBeginName[i][0], strlen(apszBeginName[i][0])) &&
            !EQUAL(pszDriverName, apszBeginName[i][1]))
        {
            char* pcaMessage=(char*) malloc((151+strlen(apszBeginName[i][1])+strlen(pszDriverName))*sizeof(char));
            sprintf(pcaMessage,
                    "Warning: The target file has a name which is normally recognized by the %s driver, "
                    "but the requested output driver is %s. Is it really what you want ?",
                    apszBeginName[i][1],
                    pszDriverName);
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            break;
        }
    }

    CPLFree(pszDestExtension);
}

/************************************************************************/
/*                            IsNumber()                               */
/************************************************************************/

static int IsNumber(const char* pszStr)
{
    if (*pszStr == '-' || *pszStr == '+')
        pszStr ++;
    if (*pszStr == '.')
        pszStr ++;
    return (*pszStr >= '0' && *pszStr <= '9');
}

/************************************************************************/
/*                           LoadGeometry()                             */
/************************************************************************/

static OGRGeometry* LoadGeometry( const char* pszDS,
                                  const char* pszSQL,
                                  const char* pszLyr,
                                  const char* pszWhere)
{
    OGRLayer            *poLyr;
    OGRFeature          *poFeat;
    OGRGeometry         *poGeom = NULL;
#if GDAL_VERSION_MAJOR >= 2
      GDALDataset *poDS =
	(GDALDataset*) GDALOpenEx( pszDS,
				   GDAL_OF_VECTOR,
				   NULL, NULL, NULL );
#else        
    OGRDataSource       *poDS;
    poDS = OGRSFDriverRegistrar::Open( pszDS, FALSE );
#endif
    if (poDS == NULL)
        return NULL;

    if (pszSQL != NULL)
        poLyr = poDS->ExecuteSQL( pszSQL, NULL, NULL ); 
    else if (pszLyr != NULL)
        poLyr = poDS->GetLayerByName(pszLyr);
    else
        poLyr = poDS->GetLayer(0);
        
    if (poLyr == NULL)
    {
        char* pcaMessage=(char*) malloc((49)*sizeof(char));
        sprintf( pcaMessage, "Failed to identify source layer from datasource." );
        ZOO_DEBUG(pcaMessage);
        free(pcaMessage);
#if GDAL_VERSION_MAJOR < 2
        OGRDataSource::DestroyDataSource(poDS);
#endif
        return NULL;
    }
    
    if (pszWhere)
        poLyr->SetAttributeFilter(pszWhere);
        
    while ((poFeat = poLyr->GetNextFeature()) != NULL)
    {
        OGRGeometry* poSrcGeom = poFeat->GetGeometryRef();
        if (poSrcGeom)
        {
            OGRwkbGeometryType eType = wkbFlatten( poSrcGeom->getGeometryType() );
            
            if (poGeom == NULL)
                poGeom = OGRGeometryFactory::createGeometry( wkbMultiPolygon );

            if( eType == wkbPolygon )
                ((OGRGeometryCollection*)poGeom)->addGeometry( poSrcGeom );
            else if( eType == wkbMultiPolygon )
            {
                int iGeom;
                int nGeomCount = OGR_G_GetGeometryCount( (OGRGeometryH)poSrcGeom );

                for( iGeom = 0; iGeom < nGeomCount; iGeom++ )
                {
                    ((OGRGeometryCollection*)poGeom)->addGeometry(
                                ((OGRGeometryCollection*)poSrcGeom)->getGeometryRef(iGeom) );
                }
            }
            else
            {
                char* pcaMessage=(char*) malloc((37)*sizeof(char));
                sprintf( pcaMessage, "ERROR: Geometry not of polygon type." );
                ZOO_DEBUG(pcaMessage);
                free(pcaMessage);
                OGRGeometryFactory::destroyGeometry(poGeom);
                OGRFeature::DestroyFeature(poFeat);
                if( pszSQL != NULL )
                    poDS->ReleaseResultSet( poLyr );
#if GDAL_VERSION_MAJOR < 2
                OGRDataSource::DestroyDataSource(poDS);
#endif
                return NULL;
            }
        }
    
        OGRFeature::DestroyFeature(poFeat);
    }
    
    if( pszSQL != NULL )
        poDS->ReleaseResultSet( poLyr );
#if GDAL_VERSION_MAJOR < 2
    OGRDataSource::DestroyDataSource(poDS);
#endif
    
    return poGeom;
}


/************************************************************************/
/*                     OGRSplitListFieldLayer                           */
/************************************************************************/

typedef struct
{
    int          iSrcIndex;
    OGRFieldType eType;
    int          nMaxOccurences;
    int          nWidth;
} ListFieldDesc;

class OGRSplitListFieldLayer : public OGRLayer
{
    OGRLayer                    *poSrcLayer;
    OGRFeatureDefn              *poFeatureDefn;
    ListFieldDesc               *pasListFields;
    int                          nListFieldCount;
    int                          nMaxSplitListSubFields;

    OGRFeature                  *TranslateFeature(OGRFeature* poSrcFeature);

  public:
                                 OGRSplitListFieldLayer(OGRLayer* poSrcLayer,
                                                        int nMaxSplitListSubFields);
                                ~OGRSplitListFieldLayer();

    int                          BuildLayerDefn(GDALProgressFunc pfnProgress,
                                                void *pProgressArg);

    virtual OGRFeature          *GetNextFeature();
    virtual OGRFeature          *GetFeature(long nFID);
    virtual OGRFeatureDefn      *GetLayerDefn();

    virtual void                 ResetReading() { poSrcLayer->ResetReading(); }
    virtual int                  TestCapability(const char*) { return FALSE; }

    /*    virtual int                  GetFeatureCount( int bForce = TRUE )
    {
        return poSrcLayer->GetFeatureCount(bForce);
	}*/

    virtual OGRSpatialReference *GetSpatialRef()
    {
        return poSrcLayer->GetSpatialRef();
    }

    virtual OGRGeometry         *GetSpatialFilter()
    {
        return poSrcLayer->GetSpatialFilter();
    }

    virtual OGRStyleTable       *GetStyleTable()
    {
        return poSrcLayer->GetStyleTable();
    }

    virtual void                 SetSpatialFilter( OGRGeometry *poGeom )
    {
        poSrcLayer->SetSpatialFilter(poGeom);
    }

    virtual void                 SetSpatialFilterRect( double dfMinX, double dfMinY,
                                                       double dfMaxX, double dfMaxY )
    {
        poSrcLayer->SetSpatialFilterRect(dfMinX, dfMinY, dfMaxX, dfMaxY);
    }

    virtual OGRErr               SetAttributeFilter( const char *pszFilter )
    {
        return poSrcLayer->SetAttributeFilter(pszFilter);
    }
};

/************************************************************************/
/*                    OGRSplitListFieldLayer()                          */
/************************************************************************/

OGRSplitListFieldLayer::OGRSplitListFieldLayer(OGRLayer* poSrcLayer,
                                               int nMaxSplitListSubFields)
{
    this->poSrcLayer = poSrcLayer;
    if (nMaxSplitListSubFields < 0)
        nMaxSplitListSubFields = INT_MAX;
    this->nMaxSplitListSubFields = nMaxSplitListSubFields;
    poFeatureDefn = NULL;
    pasListFields = NULL;
    nListFieldCount = 0;
}

/************************************************************************/
/*                   ~OGRSplitListFieldLayer()                          */
/************************************************************************/

OGRSplitListFieldLayer::~OGRSplitListFieldLayer()
{
    if( poFeatureDefn )
        poFeatureDefn->Release();

    CPLFree(pasListFields);
}

/************************************************************************/
/*                       BuildLayerDefn()                               */
/************************************************************************/

int  OGRSplitListFieldLayer::BuildLayerDefn(GDALProgressFunc pfnProgress,
                                            void *pProgressArg)
{
    CPLAssert(poFeatureDefn == NULL);
    
    OGRFeatureDefn* poSrcFieldDefn = poSrcLayer->GetLayerDefn();
    
    int nSrcFields = poSrcFieldDefn->GetFieldCount();
    pasListFields =
            (ListFieldDesc*)CPLCalloc(sizeof(ListFieldDesc), nSrcFields);
    nListFieldCount = 0;
    int i;
    
    /* Establish the list of fields of list type */
    for(i=0;i<nSrcFields;i++)
    {
        OGRFieldType eType = poSrcFieldDefn->GetFieldDefn(i)->GetType();
        if (eType == OFTIntegerList ||
            eType == OFTRealList ||
            eType == OFTStringList)
        {
            pasListFields[nListFieldCount].iSrcIndex = i;
            pasListFields[nListFieldCount].eType = eType;
            if (nMaxSplitListSubFields == 1)
                pasListFields[nListFieldCount].nMaxOccurences = 1;
            nListFieldCount++;
        }
    }

    if (nListFieldCount == 0)
        return FALSE;

    /* No need for full scan if the limit is 1. We just to have to create */
    /* one and a single one field */
    if (nMaxSplitListSubFields != 1)
    {
        poSrcLayer->ResetReading();
        OGRFeature* poSrcFeature;

        int nFeatureCount = 0;
        if (poSrcLayer->TestCapability(OLCFastFeatureCount))
            nFeatureCount = poSrcLayer->GetFeatureCount();
        int nFeatureIndex = 0;

        /* Scan the whole layer to compute the maximum number of */
        /* items for each field of list type */
        while( (poSrcFeature = poSrcLayer->GetNextFeature()) != NULL )
        {
            for(i=0;i<nListFieldCount;i++)
            {
                int nCount = 0;
                OGRField* psField =
                        poSrcFeature->GetRawFieldRef(pasListFields[i].iSrcIndex);
                switch(pasListFields[i].eType)
                {
                    case OFTIntegerList:
                        nCount = psField->IntegerList.nCount;
                        break;
                    case OFTRealList:
                        nCount = psField->RealList.nCount;
                        break;
                    case OFTStringList:
                    {
                        nCount = psField->StringList.nCount;
                        char** paList = psField->StringList.paList;
                        int j;
                        for(j=0;j<nCount;j++)
                        {
                            int nWidth = strlen(paList[j]);
                            if (nWidth > pasListFields[i].nWidth)
                                pasListFields[i].nWidth = nWidth;
                        }
                        break;
                    }
                    default:
                        CPLAssert(0);
                        break;
                }
                if (nCount > pasListFields[i].nMaxOccurences)
                {
                    if (nCount > nMaxSplitListSubFields)
                        nCount = nMaxSplitListSubFields;
                    pasListFields[i].nMaxOccurences = nCount;
                }
            }
            OGRFeature::DestroyFeature(poSrcFeature);

            nFeatureIndex ++;
            if (pfnProgress != NULL && nFeatureCount != 0)
                pfnProgress(nFeatureIndex * 1.0 / nFeatureCount, "", pProgressArg);
        }
    }

    /* Now let's build the target feature definition */

    poFeatureDefn =
            OGRFeatureDefn::CreateFeatureDefn( poSrcFieldDefn->GetName() );
    poFeatureDefn->Reference();
    poFeatureDefn->SetGeomType( poSrcFieldDefn->GetGeomType() );

    int iListField = 0;
    for(i=0;i<nSrcFields;i++)
    {
        OGRFieldType eType = poSrcFieldDefn->GetFieldDefn(i)->GetType();
        if (eType == OFTIntegerList ||
            eType == OFTRealList ||
            eType == OFTStringList)
        {
            int nMaxOccurences = pasListFields[iListField].nMaxOccurences;
            int nWidth = pasListFields[iListField].nWidth;
            iListField ++;
            int j;
            if (nMaxOccurences == 1)
            {
                OGRFieldDefn oFieldDefn(poSrcFieldDefn->GetFieldDefn(i)->GetNameRef(),
                                            (eType == OFTIntegerList) ? OFTInteger :
                                            (eType == OFTRealList) ?    OFTReal :
                                                                        OFTString);
                poFeatureDefn->AddFieldDefn(&oFieldDefn);
            }
            else
            {
                for(j=0;j<nMaxOccurences;j++)
                {
                    CPLString osFieldName;
                    osFieldName.Printf("%s%d",
                        poSrcFieldDefn->GetFieldDefn(i)->GetNameRef(), j+1);
                    OGRFieldDefn oFieldDefn(osFieldName.c_str(),
                                            (eType == OFTIntegerList) ? OFTInteger :
                                            (eType == OFTRealList) ?    OFTReal :
                                                                        OFTString);
                    oFieldDefn.SetWidth(nWidth);
                    poFeatureDefn->AddFieldDefn(&oFieldDefn);
                }
            }
        }
        else
        {
            poFeatureDefn->AddFieldDefn(poSrcFieldDefn->GetFieldDefn(i));
        }
    }

    return TRUE;
}


/************************************************************************/
/*                       TranslateFeature()                             */
/************************************************************************/

OGRFeature *OGRSplitListFieldLayer::TranslateFeature(OGRFeature* poSrcFeature)
{
    if (poSrcFeature == NULL)
        return NULL;
    if (poFeatureDefn == NULL)
        return poSrcFeature;

    OGRFeature* poFeature = OGRFeature::CreateFeature(poFeatureDefn);
    poFeature->SetFID(poSrcFeature->GetFID());
    poFeature->SetGeometryDirectly(poSrcFeature->StealGeometry());
    poFeature->SetStyleString(poFeature->GetStyleString());

    OGRFeatureDefn* poSrcFieldDefn = poSrcLayer->GetLayerDefn();
    int nSrcFields = poSrcFeature->GetFieldCount();
    int iSrcField;
    int iDstField = 0;
    int iListField = 0;
    int j;
    for(iSrcField=0;iSrcField<nSrcFields;iSrcField++)
    {
        OGRFieldType eType = poSrcFieldDefn->GetFieldDefn(iSrcField)->GetType();
        OGRField* psField = poSrcFeature->GetRawFieldRef(iSrcField);
        switch(eType)
        {
            case OFTIntegerList:
            {
                int nCount = psField->IntegerList.nCount;
                if (nCount > nMaxSplitListSubFields)
                    nCount = nMaxSplitListSubFields;
                int* paList = psField->IntegerList.paList;
                for(j=0;j<nCount;j++)
                    poFeature->SetField(iDstField + j, paList[j]);
                iDstField += pasListFields[iListField].nMaxOccurences;
                iListField++;
                break;
            }
            case OFTRealList:
            {
                int nCount = psField->RealList.nCount;
                if (nCount > nMaxSplitListSubFields)
                    nCount = nMaxSplitListSubFields;
                double* paList = psField->RealList.paList;
                for(j=0;j<nCount;j++)
                    poFeature->SetField(iDstField + j, paList[j]);
                iDstField += pasListFields[iListField].nMaxOccurences;
                iListField++;
                break;
            }
            case OFTStringList:
            {
                int nCount = psField->StringList.nCount;
                if (nCount > nMaxSplitListSubFields)
                    nCount = nMaxSplitListSubFields;
                char** paList = psField->StringList.paList;
                for(j=0;j<nCount;j++)
                    poFeature->SetField(iDstField + j, paList[j]);
                iDstField += pasListFields[iListField].nMaxOccurences;
                iListField++;
                break;
            }
            default:
                poFeature->SetField(iDstField, psField);
                iDstField ++;
                break;
        }
    }

    OGRFeature::DestroyFeature(poSrcFeature);

    return poFeature;
}

/************************************************************************/
/*                       GetNextFeature()                               */
/************************************************************************/

OGRFeature *OGRSplitListFieldLayer::GetNextFeature()
{
    return TranslateFeature(poSrcLayer->GetNextFeature());
}

/************************************************************************/
/*                           GetFeature()                               */
/************************************************************************/

OGRFeature *OGRSplitListFieldLayer::GetFeature(long nFID)
{
    return TranslateFeature(poSrcLayer->GetFeature(nFID));
}

/************************************************************************/
/*                        GetLayerDefn()                                */
/************************************************************************/

OGRFeatureDefn* OGRSplitListFieldLayer::GetLayerDefn()
{
    if (poFeatureDefn == NULL)
        return poSrcLayer->GetLayerDefn();
    return poFeatureDefn;
}

/************************************************************************/
/*                                main()                                */
/************************************************************************/

#ifdef ZOO_SERVICE
#ifdef WIN32
__declspec(dllexport)
#endif
int Converter(maps*& conf,maps*& inputs,maps*& outputs)
#else
int main( int nArgc, char ** papszArgv )
#endif
{
    int          bQuiet = FALSE;
    int          bFormatExplicitelySet = FALSE;
    const char  *pszFormat = "ESRI Shapefile";
    char  *pszDataSource = NULL;
    char  *pszDestDataSource = NULL;
    char  *pszwebDestData = NULL;
    char        **papszLayers = NULL;
    char        **papszDSCO = NULL, **papszLCO = NULL;
    int         bTransform = FALSE;
    int         bAppend = FALSE, bUpdate = FALSE, bOverwrite = FALSE;
    const char  *pszOutputSRSDef = NULL;
    const char  *pszSourceSRSDef = NULL;
    OGRSpatialReference *poOutputSRS = NULL;
    int         bNullifyOutputSRS = FALSE;
    OGRSpatialReference *poSourceSRS = NULL;
    char        *pszNewLayerName = NULL;
    const char  *pszWHERE = NULL;
    OGRGeometry *poSpatialFilter = NULL;
    const char  *pszSelect;
    char        **papszSelFields = NULL;
    const char  *pszSQLStatement = NULL;
    const char  *pszDialect = NULL;
    int         eGType = -2;
    GeomOperation eGeomOp = NONE;
    double       dfGeomOpParam = 0;
    char        **papszFieldTypesToString = NULL;
    int          bDisplayProgress = FALSE;
    GDALProgressFunc pfnProgress = NULL;
    void        *pProgressArg = NULL;
    int          bWrapDateline = FALSE;
    int          bClipSrc = FALSE;
    OGRGeometry* poClipSrc = NULL;
    const char  *pszClipSrcDS = NULL;
    const char  *pszClipSrcSQL = NULL;
    const char  *pszClipSrcLayer = NULL;
    const char  *pszClipSrcWhere = NULL;
    OGRGeometry *poClipDst = NULL;
    const char  *pszClipDstDS = NULL;
    const char  *pszClipDstSQL = NULL;
    const char  *pszClipDstLayer = NULL;
    const char  *pszClipDstWhere = NULL;
    int          bSplitListFields = FALSE;
    int          nMaxSplitListSubFields = -1;
    int          bExplodeCollections = FALSE;
    const char  *pszZField = NULL;

    char* pcaMessage=(char*) malloc((14)*sizeof(char));
    sprintf(pcaMessage,"Hello OGR2OGR");
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    /* Check strict compilation and runtime library version as we use C++ API */
#ifndef ZOO_SERVICE
    if (! GDAL_CHECK_VERSION("ogr2ogr"))
#ifdef ZOO_SERVICE
	{
		setMapInMaps(conf,"lenv","message","Unable to check gdal version for ogr2ogr_service.zo");
		return SERVICE_FAILED;
	}
#else
        exit(1);
#endif
#endif

/* -------------------------------------------------------------------- */
/*      Register format(s).                                             */
/* -------------------------------------------------------------------- */
    OGRRegisterAll();

#ifdef ZOO_SERVICE
    map *tmpMap=NULL;
    char dataPath[1024];
    tmpMap=getMapFromMaps(conf,"main","dataPath");
    if(tmpMap!=NULL)
      sprintf(dataPath,"%s",tmpMap->value);
    tmpMap=NULL;
    char tempPath[1024];
    tmpMap=getMapFromMaps(conf,"main","tmpPath");
    if(tmpMap!=NULL){
      sprintf(tempPath,"%s",tmpMap->value);
    }
    
    tmpMap=NULL;
    char serverAddress[1024];
    tmpMap=getMapFromMaps(conf,"main","serverAddress");
    if(tmpMap!=NULL){
      sprintf(serverAddress,"%s",tmpMap->value);
    }
    
    tmpMap=NULL;
    char tmpurl[1024];
    tmpMap=getMapFromMaps(conf,"main","tmpurl");
    if(tmpMap!=NULL){
      sprintf(tmpurl,"%s",tmpMap->value);
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"F","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      bFormatExplicitelySet = TRUE;
      pszFormat=tmpMap->value;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"DSCO","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  papszDSCO = CSLAddString(papszDSCO, tmpMap->value );
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"LCO","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  papszLCO = CSLAddString(papszLCO, tmpMap->value );
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"preserve_fid","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  bPreserveFID = TRUE;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"skipfailure","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      bSkipFailures = TRUE;
      nGroupTransactions = 1; /* #2409 */
    }

    /* if exist, overwrite the data with the same name */
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"overwrite","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      bOverwrite = TRUE;
      bUpdate = TRUE;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"append","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"TRUE",4)==0){
      bAppend = TRUE;
      bUpdate = TRUE;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"update","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"TRUE",4)==0){
      bUpdate = TRUE;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"fid","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      nFIDToFetch = atoi(tmpMap->value);
    }

    /*map* pmTmpSql=getMapFromMaps(inputs,"sql","cache_file");
    dumpMaps(inputs);
    if(pmTmpSql!=NULL){
      FILE* f0 = fopen (pmTmpSql->value, "rb");
      if(f0!=NULL){
	long flen;
	char *fcontent;
	fseek (f0, 0, SEEK_END);
	flen = ftell (f0);
	fseek (f0, 0, SEEK_SET);
	fcontent = (char *) malloc ((flen + 1) * sizeof (char));
	fread(fcontent,flen,1,f0);
	fcontent[flen]=0;
	fclose(f0);
	pszSQLStatement=zStrdup(fcontent);
	fprintf(stderr,"%s %d (%s)\n",__FILE__,__LINE__,fcontent);
	free(fcontent);
      }
    }else{
      pmTmpSql=getMapFromMaps(inputs,"sql","value");
      if(pmTmpSql!=NULL && strncasecmp(pmTmpSql->value,"NULL",4)!=0){
	pszSQLStatement = zStrdup(pmTmpSql->value);
      }
      }*/
    pszSQLStatement = getValueFromMaps(inputs,"sql");
    char* pcaMessage=(char*) malloc((11+strlen(__FILE__)+strlen(__LINE__)+strlen(pszSQLStatement))*sizeof(char));
    sprintf(pcaMessage,"%s %d (%s)",__FILE__,__LINE__,pszSQLStatement);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"nln","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      pszNewLayerName = zStrdup(tmpMap->value);
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"nlt","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  if( EQUAL(tmpMap->value,"NONE") )
		  eGType = wkbNone;
	  else if( EQUAL(tmpMap->value,"GEOMETRY") )
		  eGType = wkbUnknown;
	  else if( EQUAL(tmpMap->value,"POINT") )
		  eGType = wkbPoint;
	  else if( EQUAL(tmpMap->value,"LINESTRING") )
		  eGType = wkbLineString;
	  else if( EQUAL(tmpMap->value,"POLYGON") )
		  eGType = wkbPolygon;
	  else if( EQUAL(tmpMap->value,"GEOMETRYCOLLECTION") )
		  eGType = wkbGeometryCollection;
	  else if( EQUAL(tmpMap->value,"MULTIPOINT") )
		  eGType = wkbMultiPoint;
	  else if( EQUAL(tmpMap->value,"MULTILINESTRING") )
		  eGType = wkbMultiLineString;
	  else if( EQUAL(tmpMap->value,"MULTIPOLYGON") )
		  eGType = wkbMultiPolygon;
	  else if( EQUAL(tmpMap->value,"GEOMETRY25D") )
		  eGType = wkbUnknown | wkb25DBit;
	  else if( EQUAL(tmpMap->value,"POINT25D") )
		  eGType = wkbPoint25D;
	  else if( EQUAL(tmpMap->value,"LINESTRING25D") )
		  eGType = wkbLineString25D;
	  else if( EQUAL(tmpMap->value,"POLYGON25D") )
		  eGType = wkbPolygon25D;
	  else if( EQUAL(tmpMap->value,"GEOMETRYCOLLECTION25D") )
		  eGType = wkbGeometryCollection25D;
	  else if( EQUAL(tmpMap->value,"MULTIPOINT25D") )
		  eGType = wkbMultiPoint25D;
	  else if( EQUAL(tmpMap->value,"MULTILINESTRING25D") )
		  eGType = wkbMultiLineString25D;
	  else if( EQUAL(tmpMap->value,"MULTIPOLYGON25D") )
		  eGType = wkbMultiPolygon25D;
	  else	  
	  {
          char* pcaMessage=(char*) malloc((30)*sizeof(char));
		  sprintf( pcaMessage, "-nlt %s: type not recognised.", 
			  tmpMap->value );
          ZOO_DEBUG(pcaMessage);
          free(pcaMessage);
		  exit( 1 );
	  }
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"tg","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  nGroupTransactions = atoi(tmpMap->value);
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"s_srs","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      pszSourceSRSDef = strdup(tmpMap->value);
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"a_srs","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      pszOutputSRSDef = strdup(tmpMap->value);
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"t_srs","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      pszOutputSRSDef = strdup(tmpMap->value);
      bTransform = TRUE;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"SPAT","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      char *tmp=tmpMap->value;
      char *t=strtok(tmp,",");
      int cnt=0;
      double dfULX, dfULY, dfLRX, dfLRY;
      while(t!=NULL){
        switch(cnt){
        case 0:
          dfULX = atof(t);
          break;
        case 1:
          dfULY = atof(t);
          break;
        case 2:
          dfLRX = atof(t);
          break;
        case 3:
          dfLRY = atof(t);
          break;
        }
        char* pcaMessage=(char*) malloc((3+strlen(t))*sizeof(char));
        sprintf(pcaMessage,"%s",t);
        ZOO_DEBUG(pcaMessage);
        free(pcaMessage);
        char* pcaMessage=(char*) malloc((18+strlen(dfULX)+strlen(dfULY)+strlen(dfLRX)+strlen(dfLRY))*sizeof(char));
        sprintf(pcaMessage,"%f - %f - %f - %f",dfULX,dfULY,dfLRX,dfLRY);
        ZOO_DEBUG(pcaMessage);
        free(pcaMessage);
        t=strtok(NULL,",");
        cnt++;
      }

      OGRLinearRing  oRing;
      
      oRing.addPoint( dfULX, dfULY );
      oRing.addPoint( dfULX, dfLRY );
      oRing.addPoint( dfLRX, dfLRY );
      oRing.addPoint( dfLRX, dfULY );
      oRing.addPoint( dfULX, dfULY );
      poSpatialFilter = new OGRPolygon();
      ((OGRPolygon *) poSpatialFilter)->addRing( &oRing );
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"where","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  pszWHERE = tmpMap->value;
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"select","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
	  pszSelect = tmpMap->value;
	  papszSelFields = CSLTokenizeStringComplex(pszSelect, " ,", 
		  FALSE, FALSE );
    }

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"segmentize","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      eGeomOp = SEGMENTIZE;
      dfGeomOpParam = atof(tmpMap->value);
    }

    /*tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"segmentize","value");
    if(tmpMap!=NULL){
	  dfMaxSegmentLength = atof(tmpMap->value);
    }*/

    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"InputDSN","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      if(strncasecmp(tmpMap->value,"PG:",2)==0){
	pszDataSource=strdup(tmpMap->value);
      }
      else
	if(strncasecmp(dataPath,tmpMap->value,strlen(dataPath))==0){
	  pszDataSource=strdup(tmpMap->value);
	}else{
	  pszDataSource=(char*)malloc(sizeof(char)*(strlen(dataPath)+strlen(tmpMap->value)+2));
	  sprintf((char*)pszDataSource,"%s/%s",dataPath,tmpMap->value);
	}
    }

    char* pcaMessage=(char*) malloc((15+strlen(pszDataSource))*sizeof(char));
    sprintf(pcaMessage,"DataStore: %s ",pszDataSource);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"InputDSTN","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      if(strncasecmp(dataPath,tmpMap->value,strlen(dataPath))==0){
	pszDataSource=strdup(tmpMap->value);
      }else{
	pszDataSource=(char*)malloc(sizeof(char)*(strlen(dataPath)+strlen(tmpMap->value)+2));
	sprintf((char*)pszDataSource,"%s/%s",dataPath,tmpMap->value);
      }
    }

    tmpMap=getMapFromMaps(inputs,"InputDSON","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      papszLayers = CSLAddString( papszLayers, tmpMap->value );
    }


    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"OutputDSTN","value");
    if(tmpMap!=NULL && strncasecmp(tmpMap->value,"NULL",4)!=0){
      char *tmp0=strdup(tmpMap->value);
      pszDestDataSource=strdup(tmp0);
      pszwebDestData=strdup(tmp0);
    }else{
      tmpMap=getMapFromMaps(inputs,"OutputDSN","value");
      if(tmpMap!=NULL){
	pszDestDataSource=(char*)malloc(sizeof(char)*(strlen(tempPath)+strlen(tmpMap->value)+4));
	sprintf((char*)pszDestDataSource,"%s/%s",tempPath,tmpMap->value/*,ext*/);
	pszwebDestData=(char*)malloc(sizeof(char)*(strlen(serverAddress)+strlen(tmpurl)+strlen(tmpMap->value)+4));
	sprintf((char*)pszwebDestData,"%s%s/%s",serverAddress,tmpurl,tmpMap->value/*,ext*/);
      }
    }


    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"simplify","value");
    if(tmpMap!=NULL){
      eGeomOp = SIMPLIFY_PRESERVE_TOPOLOGY;
      dfGeomOpParam = atof(tmpMap->value);
    }
    char* pcaMessage=(char*) malloc((11+strlen(pszDestDataSource))*sizeof(char));
    sprintf(pcaMessage,"Message %s",pszDestDataSource);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);


#else
/* -------------------------------------------------------------------- */
/*      Processing command line arguments.                              */
/* -------------------------------------------------------------------- */
    nArgc = OGRGeneralCmdLineProcessor( nArgc, &papszArgv, 0 );
    
    if( nArgc < 1 )
        exit( -nArgc );

    for( int iArg = 1; iArg < nArgc; iArg++ )
    {
        if( EQUAL(papszArgv[iArg], "--utility_version") )
        {
            printf("%s was compiled against GDAL %s and is running against GDAL %s\n",
                   papszArgv[0], GDAL_RELEASE_NAME, GDALVersionInfo("RELEASE_NAME"));
            return 0;
        }
        else if ( EQUAL(papszArgv[iArg], "--long-usage") )
        {
            Usage(FALSE);
        }

        else if( EQUAL(papszArgv[iArg],"-q") || EQUAL(papszArgv[iArg],"-quiet") )
        {
            bQuiet = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-f") && iArg < nArgc-1 )
        {
            bFormatExplicitelySet = TRUE;
            pszFormat = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-dsco") && iArg < nArgc-1 )
        {
            papszDSCO = CSLAddString(papszDSCO, papszArgv[++iArg] );
        }
        else if( EQUAL(papszArgv[iArg],"-lco") && iArg < nArgc-1 )
        {
            papszLCO = CSLAddString(papszLCO, papszArgv[++iArg] );
        }
        else if( EQUAL(papszArgv[iArg],"-preserve_fid") )
        {
            bPreserveFID = TRUE;
        }
        else if( EQUALN(papszArgv[iArg],"-skip",5) )
        {
            bSkipFailures = TRUE;
            nGroupTransactions = 1; /* #2409 */
        }
        else if( EQUAL(papszArgv[iArg],"-append") )
        {
            bAppend = TRUE;
            bUpdate = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-overwrite") )
        {
            bOverwrite = TRUE;
            bUpdate = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-update") )
        {
            bUpdate = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-fid") && papszArgv[iArg+1] != NULL )
        {
            nFIDToFetch = atoi(papszArgv[++iArg]);
        }
        else if( EQUAL(papszArgv[iArg],"-sql") && papszArgv[iArg+1] != NULL )
        {
            pszSQLStatement = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-dialect") && papszArgv[iArg+1] != NULL )
        {
            pszDialect = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-nln") && iArg < nArgc-1 )
        {
            pszNewLayerName = CPLStrdup(papszArgv[++iArg]);
        }
        else if( EQUAL(papszArgv[iArg],"-nlt") && iArg < nArgc-1 )
        {
            int bIs3D = FALSE;
            CPLString osGeomName = papszArgv[iArg+1];
            if (strlen(papszArgv[iArg+1]) > 3 &&
                EQUALN(papszArgv[iArg+1] + strlen(papszArgv[iArg+1]) - 3, "25D", 3))
            {
                bIs3D = TRUE;
                osGeomName.resize(osGeomName.size() - 3);
            }
            if( EQUAL(osGeomName,"NONE") )
                eGType = wkbNone;
            else if( EQUAL(osGeomName,"GEOMETRY") )
                eGType = wkbUnknown;
            else
            {
                eGType = OGRFromOGCGeomType(osGeomName);
                if (eGType == wkbUnknown)
                {
                    char* pcaMessage=(char*) malloc((30+strlen(papszArgv[iArg+1]))*sizeof(char));
                    sprintf( pcaMessage, "-nlt %s: type not recognised.",
                            papszArgv[iArg+1] );
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    exit( 1 );
                }
            }
            if (eGType != wkbNone && bIs3D)
                eGType |= wkb25DBit;

            iArg++;
        }
        else if( (EQUAL(papszArgv[iArg],"-tg") ||
                  EQUAL(papszArgv[iArg],"-gt")) && iArg < nArgc-1 )
        {
            nGroupTransactions = atoi(papszArgv[++iArg]);
        }
        else if( EQUAL(papszArgv[iArg],"-s_srs") && iArg < nArgc-1 )
        {
            pszSourceSRSDef = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-a_srs") && iArg < nArgc-1 )
        {
            pszOutputSRSDef = papszArgv[++iArg];
            if (EQUAL(pszOutputSRSDef, "NULL") ||
                EQUAL(pszOutputSRSDef, "NONE"))
            {
                pszOutputSRSDef = NULL;
                bNullifyOutputSRS = TRUE;
            }
        }
        else if( EQUAL(papszArgv[iArg],"-t_srs") && iArg < nArgc-1 )
        {
            pszOutputSRSDef = papszArgv[++iArg];
            bTransform = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-spat") 
                 && papszArgv[iArg+1] != NULL 
                 && papszArgv[iArg+2] != NULL 
                 && papszArgv[iArg+3] != NULL 
                 && papszArgv[iArg+4] != NULL )
        {
            OGRLinearRing  oRing;

            oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+2]) );
            oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+4]) );
            oRing.addPoint( atof(papszArgv[iArg+3]), atof(papszArgv[iArg+4]) );
            oRing.addPoint( atof(papszArgv[iArg+3]), atof(papszArgv[iArg+2]) );
            oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+2]) );

            poSpatialFilter = OGRGeometryFactory::createGeometry(wkbPolygon);
            ((OGRPolygon *) poSpatialFilter)->addRing( &oRing );
            iArg += 4;
        }
        else if( EQUAL(papszArgv[iArg],"-where") && papszArgv[iArg+1] != NULL )
        {
            pszWHERE = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-select") && papszArgv[iArg+1] != NULL)
        {
            pszSelect = papszArgv[++iArg];
            papszSelFields = CSLTokenizeStringComplex(pszSelect, " ,", 
                                                      FALSE, FALSE );
        }
        else if( EQUAL(papszArgv[iArg],"-segmentize") && iArg < nArgc-1 )
        {
            eGeomOp = SEGMENTIZE;
            dfGeomOpParam = atof(papszArgv[++iArg]);
        }
        else if( EQUAL(papszArgv[iArg],"-simplify") && iArg < nArgc-1 )
        {
            eGeomOp = SIMPLIFY_PRESERVE_TOPOLOGY;
            dfGeomOpParam = atof(papszArgv[++iArg]);
        }
        else if( EQUAL(papszArgv[iArg],"-fieldTypeToString") && iArg < nArgc-1 )
        {
            papszFieldTypesToString =
                    CSLTokenizeStringComplex(papszArgv[++iArg], " ,", 
                                             FALSE, FALSE );
            char** iter = papszFieldTypesToString;
            while(*iter)
            {
                if (EQUAL(*iter, "Integer") ||
                    EQUAL(*iter, "Real") ||
                    EQUAL(*iter, "String") ||
                    EQUAL(*iter, "Date") ||
                    EQUAL(*iter, "Time") ||
                    EQUAL(*iter, "DateTime") ||
                    EQUAL(*iter, "Binary") ||
                    EQUAL(*iter, "IntegerList") ||
                    EQUAL(*iter, "RealList") ||
                    EQUAL(*iter, "StringList"))
                {
                    /* Do nothing */
                }
                else if (EQUAL(*iter, "All"))
                {
                    CSLDestroy(papszFieldTypesToString);
                    papszFieldTypesToString = NULL;
                    papszFieldTypesToString = CSLAddString(papszFieldTypesToString, "All");
                    break;
                }
                else
                {
                    char* pcaMessage=(char*) malloc((49+strlen(*iter))*sizeof(char));
                    sprintf(pcaMessage, "Unhandled type for fieldtypeasstring option : %s",
                            *iter);
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    Usage();
                }
                iter ++;
            }
        }
        else if( EQUAL(papszArgv[iArg],"-progress") )
        {
            bDisplayProgress = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-wrapdateline") )
        {
            bWrapDateline = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-clipsrc") && iArg < nArgc-1 )
        {
            VSIStatBufL  sStat;
            bClipSrc = TRUE;
            if ( IsNumber(papszArgv[iArg+1])
                 && papszArgv[iArg+2] != NULL 
                 && papszArgv[iArg+3] != NULL 
                 && papszArgv[iArg+4] != NULL)
            {
                OGRLinearRing  oRing;

                oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+2]) );
                oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+4]) );
                oRing.addPoint( atof(papszArgv[iArg+3]), atof(papszArgv[iArg+4]) );
                oRing.addPoint( atof(papszArgv[iArg+3]), atof(papszArgv[iArg+2]) );
                oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+2]) );

                poClipSrc = OGRGeometryFactory::createGeometry(wkbPolygon);
                ((OGRPolygon *) poClipSrc)->addRing( &oRing );
                iArg += 4;
            }
            else if ((EQUALN(papszArgv[iArg+1], "POLYGON", 7) ||
                      EQUALN(papszArgv[iArg+1], "MULTIPOLYGON", 12)) &&
                      VSIStatL(papszArgv[iArg+1], &sStat) != 0)
            {
                char* pszTmp = (char*) papszArgv[iArg+1];
                OGRGeometryFactory::createFromWkt(&pszTmp, NULL, &poClipSrc);
                if (poClipSrc == NULL)
                {
                    char* pcaMessage=(char*) malloc((71)*sizeof(char));
                    sprintf( pcaMessage, "FAILURE: Invalid geometry. Must be a valid POLYGON or MULTIPOLYGON WKT");
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    Usage();
                }
                iArg ++;
            }
            else if (EQUAL(papszArgv[iArg+1], "spat_extent") )
            {
                iArg ++;
            }
            else
            {
                pszClipSrcDS = papszArgv[iArg+1];
                iArg ++;
            }
        }
        else if( EQUAL(papszArgv[iArg],"-clipsrcsql") && iArg < nArgc-1 )
        {
            pszClipSrcSQL = papszArgv[iArg+1];
            iArg ++;
        }
        else if( EQUAL(papszArgv[iArg],"-clipsrclayer") && iArg < nArgc-1 )
        {
            pszClipSrcLayer = papszArgv[iArg+1];
            iArg ++;
        }
        else if( EQUAL(papszArgv[iArg],"-clipsrcwhere") && iArg < nArgc-1 )
        {
            pszClipSrcWhere = papszArgv[iArg+1];
            iArg ++;
        }
        else if( EQUAL(papszArgv[iArg],"-clipdst") && iArg < nArgc-1 )
        {
            VSIStatBufL  sStat;
            if ( IsNumber(papszArgv[iArg+1])
                 && papszArgv[iArg+2] != NULL 
                 && papszArgv[iArg+3] != NULL 
                 && papszArgv[iArg+4] != NULL)
            {
                OGRLinearRing  oRing;

                oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+2]) );
                oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+4]) );
                oRing.addPoint( atof(papszArgv[iArg+3]), atof(papszArgv[iArg+4]) );
                oRing.addPoint( atof(papszArgv[iArg+3]), atof(papszArgv[iArg+2]) );
                oRing.addPoint( atof(papszArgv[iArg+1]), atof(papszArgv[iArg+2]) );

                poClipDst = OGRGeometryFactory::createGeometry(wkbPolygon);
                ((OGRPolygon *) poClipDst)->addRing( &oRing );
                iArg += 4;
            }
            else if ((EQUALN(papszArgv[iArg+1], "POLYGON", 7) ||
                      EQUALN(papszArgv[iArg+1], "MULTIPOLYGON", 12)) &&
                      VSIStatL(papszArgv[iArg+1], &sStat) != 0)
            {
                char* pszTmp = (char*) papszArgv[iArg+1];
                OGRGeometryFactory::createFromWkt(&pszTmp, NULL, &poClipDst);
                if (poClipDst == NULL)
                {
                    char* pcaMessage=(char*) malloc((71)*sizeof(char));
                    sprintf( pcaMessage, "FAILURE: Invalid geometry. Must be a valid POLYGON or MULTIPOLYGON WKT");
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    Usage();
                }
                iArg ++;
            }
            else
            {
                pszClipDstDS = papszArgv[iArg+1];
                iArg ++;
            }
        }
        else if( EQUAL(papszArgv[iArg],"-clipdstsql") && iArg < nArgc-1 )
        {
            pszClipDstSQL = papszArgv[iArg+1];
            iArg ++;
        }
        else if( EQUAL(papszArgv[iArg],"-clipdstlayer") && iArg < nArgc-1 )
        {
            pszClipDstLayer = papszArgv[iArg+1];
            iArg ++;
        }
        else if( EQUAL(papszArgv[iArg],"-clipdstwhere") && iArg < nArgc-1 )
        {
            pszClipDstWhere = papszArgv[iArg+1];
            iArg ++;
        }
        else if( EQUAL(papszArgv[iArg],"-splitlistfields") )
        {
            bSplitListFields = TRUE;
        }
        else if ( EQUAL(papszArgv[iArg],"-maxsubfields") && iArg < nArgc-1 )
        {
            if (IsNumber(papszArgv[iArg+1]))
            {
                int nTemp = atoi(papszArgv[iArg+1]);
                if (nTemp > 0)
                {
                    nMaxSplitListSubFields = nTemp;
                    iArg ++;
                }
            }
        }
        else if( EQUAL(papszArgv[iArg],"-explodecollections") )
        {
            bExplodeCollections = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-zfield") && iArg < nArgc-1 )
        {
            pszZField = papszArgv[iArg+1];
            iArg ++;
        }
        else if( papszArgv[iArg][0] == '-' )
        {
            Usage();
        }
        else if( pszDestDataSource == NULL )
            pszDestDataSource = papszArgv[iArg];
        else if( pszDataSource == NULL )
            pszDataSource = papszArgv[iArg];
        else
            papszLayers = CSLAddString( papszLayers, papszArgv[iArg] );
    }

    if( pszDataSource == NULL )
        Usage();
#endif


    if( bPreserveFID && bExplodeCollections )
    {
#ifdef ZOO_SERVICE
      setMapInMaps(conf,"lenv","message","FAILURE: cannot use -preserve_fid and -explodecollections at the same time\n\n");
      return SERVICE_FAILED;
#else
      char* pcaMessage=(char*) malloc((75)*sizeof(char));
      sprintf( pcaMessage, "FAILURE: cannot use -preserve_fid and -explodecollections at the same time" );
      ZOO_DEBUG(pcaMessage);
      free(pcaMessage);
      Usage();
#endif
    }

    if( bClipSrc && pszClipSrcDS != NULL)
    {
        poClipSrc = LoadGeometry(pszClipSrcDS, pszClipSrcSQL, pszClipSrcLayer, pszClipSrcWhere);
        if (poClipSrc == NULL)
        {
#ifdef ZOO_SERVICE
	  setMapInMaps(conf,"lenv","message","FAILURE: cannot load source clip geometry");
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((42)*sizeof(char));
            sprintf( pcaMessage, "FAILURE: cannot load source clip geometry" );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            Usage();
#endif
        }
    }
    else if( bClipSrc && poClipSrc == NULL )
    {
        if (poSpatialFilter)
            poClipSrc = poSpatialFilter->clone();
        if (poClipSrc == NULL)
        {
#ifdef ZOO_SERVICE
	  setMapInMaps(conf,"lenv","message","FAILURE: -clipsrc must be used with -spat option or a"
		       "bounding box, WKT string or datasource must be specified");
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((110)*sizeof(char));
            sprintf( pcaMessage, "FAILURE: -clipsrc must be used with -spat option or a"
                             "bounding box, WKT string or datasource must be specified");
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            Usage();
#endif
        }
    }
    
    if( pszClipDstDS != NULL)
    {
        poClipDst = LoadGeometry(pszClipDstDS, pszClipDstSQL, pszClipDstLayer, pszClipDstWhere);
        if (poClipDst == NULL)
        {
#ifdef ZOO_SERVICE
	  setMapInMaps(conf,"lenv","message","FAILURE: cannot load dest clip geometry");
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((40)*sizeof(char));
            sprintf( pcaMessage, "FAILURE: cannot load dest clip geometry" );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            Usage();
#endif
        }
    }

    char* pcaMessage=(char*) malloc((6+strlen(__FILE__)+strlen(__LINE__))*sizeof(char));
    sprintf(pcaMessage,"%s %d",__FILE__,__LINE__);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);

/* -------------------------------------------------------------------- */
/*      Open data source.                                               */
/* -------------------------------------------------------------------- */
#if GDAL_VERSION_MAJOR >= 2
      GDALDataset *poDS =
	(GDALDataset*) GDALOpenEx( pszDataSource,
				   GDAL_OF_VECTOR,
				   NULL, NULL, NULL );
#else
    OGRDataSource       *poDS;    
    poDS = OGRSFDriverRegistrar::Open( pszDataSource, FALSE );
#endif

/* -------------------------------------------------------------------- */
/*      Report failure                                                  */
/* -------------------------------------------------------------------- */
    if( poDS == NULL )
    {
        OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
        
#ifdef ZOO_SERVICE
	char tmp[1024];
        sprintf( tmp, "FAILURE:\n"
		 "Unable to open datasource `%s' with the following drivers.\n",
		 pszDataSource );

	/*        for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
        {
	  sprintf( tmp+strlen(tmp), "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
	  }*/
	
	setMapInMaps(conf,"lenv","message",tmp);
	return SERVICE_FAILED;
#else
        char* pcaMessage=(char*) malloc((67+strlen(pszDataSource))*sizeof(char));
        sprintf( pcaMessage, "FAILURE:"
                "Unable to open datasource `%s' with the following drivers.",
                pszDataSource );
        ZOO_DEBUG(pcaMessage);
        free(pcaMessage);

        for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
        {
            char* pcaMessage=(char*) malloc((8)*sizeof(char));
            sprintf( pcaMessage, "  -> %s", poR->GetDriver(iDriver)->GetName() );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
        }

        exit( 1 );
#endif
    }

    char* pcaMessage=(char*) malloc((6+strlen(__FILE__)+strlen(__LINE__))*sizeof(char));
    sprintf(pcaMessage,"%s %d",__FILE__,__LINE__);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    
/* -------------------------------------------------------------------- */
/*      Try opening the output datasource as an existing, writable      */
/* -------------------------------------------------------------------- */
#if GDAL_VERSION_MAJOR >=2
    GDALDataset         *poODS = NULL;
    GDALDriver          *poDriver = NULL;
#else
    OGRDataSource       *poODS = NULL;
    OGRSFDriver          *poDriver = NULL;
#endif
    int                  bCloseODS = TRUE;
    char* pcaMessage=(char*) malloc((6+strlen(__FILE__)+strlen(__LINE__))*sizeof(char));
    sprintf(pcaMessage,"%s %d",__FILE__,__LINE__);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);

    if( bUpdate )
    {
        /* Special case for FileGDB that doesn't like updating if the same */
        /* GDB is opened twice. It stalls at datasource closing. So use just */
        /* one single connection. This could also TRUE for other drivers. */

        if (
#if GDAL_VERSION_MAJOR >=2
	    EQUAL(poDS->GetDriver()->GetDescription(), "FileGDB")
#else
	    EQUAL(poDS->GetDriver()->GetName(), "FileGDB")
#endif
	    && strcmp(pszDestDataSource, pszDataSource) == 0)
        {
            poODS = poDS;
            poDriver = poODS->GetDriver();
            bCloseODS = FALSE;
            if (bOverwrite || bAppend)
            {
                /* Various tests to avoid overwriting the source layer(s) */
                /* or to avoid appending a layer to itself */
                int bError = FALSE;
                if (pszNewLayerName == NULL)
                    bError = TRUE;
                else if (CSLCount(papszLayers) == 1)
                    bError = strcmp(pszNewLayerName, papszLayers[0]) == 0;
                else if (pszSQLStatement == NULL)
                    bError = TRUE;
                if (bError)
                {
#ifdef ZOO_SERVICE
		  setMapInMaps(conf,"lenv","message","ERROR: -nln name must be specified combined with "
			       "a single source layer name,\nor a -sql statement, and "
			       "name must be different from an existing layer.");
		  return SERVICE_FAILED;
#else
                    char* pcaMessage=(char*) malloc((150)*sizeof(char));
                    sprintf( pcaMessage,
                             "ERROR: -nln name must be specified combined with "
                             "a single source layer name,\nor a -sql statement, and "
                             "name must be different from an existing layer.");
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    exit(1);
#endif
                }
            }
        }
        else
#if GDAL_VERSION_MAJOR >= 2
	  poODS =
	    (GDALDataset*) GDALOpenEx( pszDestDataSource,
				       GDAL_OF_UPDATE | GDAL_OF_VECTOR,
				       NULL, NULL, NULL );
#else
            poODS = OGRSFDriverRegistrar::Open( pszDestDataSource, TRUE, &poDriver );
#endif

        if( poODS == NULL )
        {
            if (bOverwrite || bAppend)
            {
#if GDAL_VERSION_MAJOR >= 2
	      poODS =
		(GDALDataset*) GDALOpenEx( pszDestDataSource,
					   GDAL_OF_VECTOR,
					   NULL, NULL, NULL );
#else
                poODS = OGRSFDriverRegistrar::Open( pszDestDataSource, FALSE, &poDriver );
#endif
                if (poODS == NULL)
                {
                    /* ok the datasource doesn't exist at all */
                    bUpdate = FALSE;
                }
                else
                {
#if GDAL_VERSION_MAJOR < 2
                    OGRDataSource::DestroyDataSource(poODS);
#endif
                    poODS = NULL;
                }
            }

            if (bUpdate)
            {
#ifdef ZOO_SERVICE
	      setMapInMaps(conf,"lenv","message","Unable to open existing output datasource.");
#else
                char* pcaMessage=(char*) malloc((56+strlen(pszDestDataSource))*sizeof(char));
                sprintf( pcaMessage, "FAILURE:"
                        "Unable to open existing output datasource `%s'.",
                        pszDestDataSource );
                ZOO_DEBUG(pcaMessage);
                free(pcaMessage);
                exit( 1 );
#endif
            }
        }
        else if( CSLCount(papszDSCO) > 0 )
        {
#ifdef ZOO_SERVICE
	  setMapInMaps(conf,"lenv","message","WARNING: Datasource creation options ignored since an existing datasource"
		       "being updated.");
#else
            char* pcaMessage=(char*) malloc((97)*sizeof(char));
            sprintf( pcaMessage, "WARNING: Datasource creation options ignored since an existing datasource"
                    "         being updated." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
#endif
        }
    }

/* -------------------------------------------------------------------- */
/*      Find the output driver.                                         */
/* -------------------------------------------------------------------- */
    if( !bUpdate )
    {
        if (!bQuiet && !bFormatExplicitelySet)
            CheckDestDataSourceNameConsistency(pszDestDataSource, pszFormat);

        OGRSFDriverRegistrar *poR = OGRSFDriverRegistrar::GetRegistrar();
        int                  iDriver;

        poDriver = poR->GetDriverByName(pszFormat);
        if( poDriver == NULL )
        {
#ifdef ZOO_SERVICE
	  char tmp[1024];
	  sprintf( tmp, "Unable to find driver `%s'.\n", pszFormat );
	  sprintf( tmp+strlen(tmp),  "The following drivers are available:\n" );
        
	  for( iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
#if GDAL_VERSION_MAJOR >= 2
	      sprintf( tmp+strlen(tmp),  "  -> `%s'\n", poR->GetDriver(iDriver)->GetDescription() );
#else
	      sprintf( tmp+strlen(tmp),  "  -> `%s'\n", poR->GetDriver(iDriver)->GetName() );
#endif
            }
	  setMapInMaps(conf,"lenv","message",tmp);
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((28+strlen(pszFormat))*sizeof(char));
            sprintf( pcaMessage, "Unable to find driver `%s'.", pszFormat );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            char* pcaMessage=(char*) malloc((37)*sizeof(char));
            sprintf( pcaMessage,  "The following drivers are available:" );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
        
            for( iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
                char* pcaMessage=(char*) malloc((10)*sizeof(char));
                sprintf( pcaMessage,  "  -> `%s'", poR->GetDriver(iDriver)->GetName() );
                ZOO_DEBUG(pcaMessage);
                free(pcaMessage);
            }
            exit( 1 );
#endif
        }

#if GDAL_VERSION_MAJOR >=2
	if( !CPLTestBool( CSLFetchNameValueDef(poDriver->GetMetadata(), GDAL_DCAP_CREATE, "FALSE") ) )
#else
	if( !poDriver->TestCapability( ODrCCreateDataSource ) )
#endif
        {
#ifdef ZOO_SERVICE
	  char tmp[1024];
	  sprintf(tmp,  "%s driver does not support data source creation.\n",
		  pszFormat);
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((49+strlen(pszFormat))*sizeof(char));
            sprintf( pcaMessage,  "%s driver does not support data source creation.",
                    pszFormat );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            exit( 1 );
#endif
        }

/* -------------------------------------------------------------------- */
/*      Special case to improve user experience when translating        */
/*      a datasource with multiple layers into a shapefile. If the      */
/*      user gives a target datasource with .shp and it does not exist, */
/*      the shapefile driver will try to create a file, but this is not */
/*      appropriate because here we have several layers, so create      */
/*      a directory instead.                                            */
/* -------------------------------------------------------------------- */
        VSIStatBufL  sStat;
        if (
#if GDAL_VERSION_MAJOR >= 2
	    EQUAL(poDriver->GetDescription(), "ESRI Shapefile")
#else
	    EQUAL(poDriver->GetName(), "ESRI Shapefile")
#endif
	    &&
            pszSQLStatement == NULL &&
            (CSLCount(papszLayers) > 1 ||
             (CSLCount(papszLayers) == 0 && poDS->GetLayerCount() > 1)) &&
            pszNewLayerName == NULL &&
            EQUAL(CPLGetExtension(pszDestDataSource), "SHP") &&
            VSIStatL(pszDestDataSource, &sStat) != 0)
        {
            if (VSIMkdir(pszDestDataSource, 0755) != 0)
            {
                CPLError( CE_Failure, CPLE_AppDefined,
                      "Failed to create directory %s\n"
                      "for shapefile datastore.\n",
                      pszDestDataSource );
#ifdef ZOO_SERVICE
	      return SERVICE_FAILED;
#else
                exit(1);
#endif
            }
        }

/* -------------------------------------------------------------------- */
/*      Create the output data source.                                  */
/* -------------------------------------------------------------------- */
#if GDAL_VERSION_MAJOR >=2
        poODS = poDriver->Create( pszDestDataSource, 0, 0, 0, GDT_Unknown, papszDSCO );
#else
	poODS = poDriver->CreateDataSource( pszDestDataSource, papszDSCO );
#endif
        if( poODS == NULL )
        {
#ifdef ZOO_SERVICE
	  char tmp[1024];
	  sprintf(tmp,  "%s driver failed to create %s\n", 
		  pszFormat, pszDestDataSource );
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((30+strlen(pszFormat)+strlen(pszDestDataSource))*sizeof(char));
            sprintf( pcaMessage,  "%s driver failed to create %s", 
                    pszFormat, pszDestDataSource );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            exit( 1 );
#endif
        }
    }

/* -------------------------------------------------------------------- */
/*      Parse the output SRS definition if possible.                    */
/* -------------------------------------------------------------------- */
    if( pszOutputSRSDef != NULL )
    {
        poOutputSRS = (OGRSpatialReference*)OSRNewSpatialReference(NULL);
        if( poOutputSRS->SetFromUserInput( pszOutputSRSDef ) != OGRERR_NONE )
        {
#ifdef ZOO_SERVICE
	  char tmp[1024];
	  sprintf(tmp,"Failed to process SRS definition: %s",pszOutputSRSDef);
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((37+strlen(pszOutputSRSDef))*sizeof(char));
            sprintf(pcaMessage,  "Failed to process SRS definition: %s", 
                    pszOutputSRSDef );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            exit( 1 );
#endif
        }
    }

/* -------------------------------------------------------------------- */
/*      Parse the source SRS definition if possible.                    */
/* -------------------------------------------------------------------- */
    if( pszSourceSRSDef != NULL )
    {
        poSourceSRS = (OGRSpatialReference*)OSRNewSpatialReference(NULL);
        if( poSourceSRS->SetFromUserInput( pszSourceSRSDef ) != OGRERR_NONE )
        {
#ifdef ZOO_SERVICE
	  char tmp[1024];
	  sprintf(tmp,"Failed to process SRS definition: %s", 
		  pszSourceSRSDef);
	  return SERVICE_FAILED;
#else
            char* pcaMessage=(char*) malloc((37+strlen(pszSourceSRSDef))*sizeof(char));
            sprintf( pcaMessage,  "Failed to process SRS definition: %s", 
                    pszSourceSRSDef );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            exit( 1 );
#endif
        }
    }

/* -------------------------------------------------------------------- */
/*      Special case for -sql clause.  No source layers required.       */
/* -------------------------------------------------------------------- */
    if( pszSQLStatement != NULL )
    {
        OGRLayer *poResultSet;

        if( pszWHERE != NULL )
            char* pcaMessage=(char*) malloc((48)*sizeof(char));
            sprintf( pcaMessage,  "-where clause ignored in combination with -sql." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
        if( CSLCount(papszLayers) > 0 )
            char* pcaMessage=(char*) malloc((46)*sizeof(char));
            sprintf( pcaMessage,  "layer names ignored in combination with -sql." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
    char* pcaMessage=(char*) malloc((11+strlen(__FILE__)+strlen(__LINE__)+strlen(pszSQLStatement))*sizeof(char));
	sprintf(pcaMessage,"%s %d [%s]",__FILE__,__LINE__,pszSQLStatement);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    char* pcaMessage=(char*) malloc((9+strlen(__FILE__)+strlen(__LINE__)+strlen(pszDialect))*sizeof(char));
	sprintf(pcaMessage,"%s %d %s",__FILE__,__LINE__,pszDialect);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
        poResultSet = poDS->ExecuteSQL( pszSQLStatement, poSpatialFilter, 
                                        pszDialect );
    char* pcaMessage=(char*) malloc((11+strlen(__FILE__)+strlen(__LINE__)+strlen(pszSQLStatement))*sizeof(char));
	sprintf(pcaMessage,"%s %d [%s]",__FILE__,__LINE__,pszSQLStatement);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);

        if( poResultSet != NULL )
        {
            long nCountLayerFeatures = 0;
            if (bDisplayProgress)
            {
#if GDAL_VERSION_MAJOR >=2
	      if( !CPLTestBool( CSLFetchNameValueDef(poDriver->GetMetadata(), GDAL_DCAP_CREATE, "FALSE") ) )
#else
	      if( !poResultSet->TestCapability( ODrCCreateDataSource ) )
#endif
                {
                    char* pcaMessage=(char*) malloc((60)*sizeof(char));
                    sprintf( pcaMessage, "Progress turned off as fast feature count is not available.");
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    bDisplayProgress = FALSE;
                }
                else
                {
                    nCountLayerFeatures = poResultSet->GetFeatureCount();
                    pfnProgress = GDALTermProgress;
                }
            }

            OGRLayer* poPassedLayer = poResultSet;
            if (bSplitListFields)
            {
                poPassedLayer = new OGRSplitListFieldLayer(poPassedLayer, nMaxSplitListSubFields);
                int nRet = ((OGRSplitListFieldLayer*)poPassedLayer)->BuildLayerDefn(NULL, NULL);
                if (!nRet)
                {
                    delete poPassedLayer;
                    poPassedLayer = poResultSet;
                }
            }

/* -------------------------------------------------------------------- */
/*      Special case to improve user experience when translating into   */
/*      single file shapefile and source has only one layer, and that   */
/*      the layer name isn't specified                                  */
/* -------------------------------------------------------------------- */
            VSIStatBufL  sStat;
    /*            if (
#if GDAL_VERSION_MAJOR >=2
		EQUAL(poDriver->GetDescription(), "ESRI Shapefile")
#else
		EQUAL(poDriver->GetName(), "ESRI Shapefile")
#endif

		&&
                pszNewLayerName == NULL &&
                VSIStatL(pszDestDataSource, &sStat) == 0 && VSI_ISREG(sStat.st_mode))
            {
                pszNewLayerName = CPLStrdup(CPLGetBasename(pszDestDataSource));
		}*/

            if( !TranslateLayer( poDS, poPassedLayer, poODS, papszLCO, 
                                 pszNewLayerName, bTransform, poOutputSRS, bNullifyOutputSRS,
                                 poSourceSRS, papszSelFields, bAppend, eGType,
                                 bOverwrite, eGeomOp, dfGeomOpParam, papszFieldTypesToString,
                                 nCountLayerFeatures, bWrapDateline, poClipSrc, poClipDst,
                                 bExplodeCollections, pszZField, pszWHERE, pfnProgress, pProgressArg))
            {
#ifdef ZOO_SERVICE
	      setMapInMaps(conf,"lenv","message",
			"Terminating translation prematurely after failed\n"
			"translation from sql statement." );
	      return SERVICE_FAILED;
#else
	      CPLError( CE_Failure, CPLE_AppDefined, 
			"Terminating translation prematurely after failed\n"
			"translation from sql statement." );

                exit( 1 );
#endif
            }
    
            if (poPassedLayer != poResultSet)
                delete poPassedLayer;

            poDS->ReleaseResultSet( poResultSet );
        }else{
	  setMapInMaps(conf,"lenv","message",
		       "Error executing sql query" );
	  return SERVICE_FAILED;
	  
	}
    }

    else
    {

        int nLayerCount = 0;
        OGRLayer** papoLayers = NULL;

/* -------------------------------------------------------------------- */
/*      Process each data source layer.                                 */
/* -------------------------------------------------------------------- */
        if ( CSLCount(papszLayers) == 0)
        {
            nLayerCount = poDS->GetLayerCount();
            papoLayers = (OGRLayer**)CPLMalloc(sizeof(OGRLayer*) * nLayerCount);

            for( int iLayer = 0; 
                 iLayer < nLayerCount; 
                 iLayer++ )
            {
                OGRLayer        *poLayer = poDS->GetLayer(iLayer);

                if( poLayer == NULL )
                {
#ifdef ZOO_SERVICE
		  return SERVICE_FAILED;
#else
                    char* pcaMessage=(char*) malloc((45+strlen(iLayer))*sizeof(char));
                    sprintf( pcaMessage, "FAILURE: Couldn't fetch advertised layer %d!",
                            iLayer );
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    exit( 1 );
#endif
                }

                papoLayers[iLayer] = poLayer;
            }
        }
/* -------------------------------------------------------------------- */
/*      Process specified data source layers.                           */
/* -------------------------------------------------------------------- */
        else
        {
            nLayerCount = CSLCount(papszLayers);
            papoLayers = (OGRLayer**)CPLMalloc(sizeof(OGRLayer*) * nLayerCount);

            for( int iLayer = 0; 
                papszLayers[iLayer] != NULL; 
                iLayer++ )
            {
                OGRLayer        *poLayer = poDS->GetLayerByName(papszLayers[iLayer]);

                if( poLayer == NULL )
                {
                    char* pcaMessage=(char*) malloc((46+strlen(papszLayers[iLayer]))*sizeof(char));
                    sprintf( pcaMessage, "FAILURE: Couldn't fetch requested layer '%s'!",
                             papszLayers[iLayer] );
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    if (!bSkipFailures)
#ifdef ZOO_SERVICE
		      return SERVICE_FAILED;
#else
                        exit( 1 );
#endif
                }

                papoLayers[iLayer] = poLayer;
            }
        }

/* -------------------------------------------------------------------- */
/*      Special case to improve user experience when translating into   */
/*      single file shapefile and source has only one layer, and that   */
/*      the layer name isn't specified                                  */
/* -------------------------------------------------------------------- */
        VSIStatBufL  sStat;
        if (
#if GDAL_VERSION_MAJOR >=2
	    EQUAL(poDriver->GetDescription(),"ESRI Shapefile")
#else
	    EQUAL(poDriver->GetName(),"ESRI Shapefile")
#endif
	    &&
            nLayerCount == 1 && pszNewLayerName == NULL &&
            VSIStatL(pszDestDataSource, &sStat) == 0 && VSI_ISREG(sStat.st_mode))
        {
            pszNewLayerName = CPLStrdup(CPLGetBasename(pszDestDataSource));
        }

        long* panLayerCountFeatures = (long*) CPLMalloc(sizeof(long) * nLayerCount);
        long nCountLayersFeatures = 0;
        long nAccCountFeatures = 0;
        int iLayer;

        /* First pass to apply filters and count all features if necessary */
        for( iLayer = 0; 
            iLayer < nLayerCount; 
            iLayer++ )
        {
            OGRLayer        *poLayer = papoLayers[iLayer];
            if (poLayer == NULL)
                continue;

            if( pszWHERE != NULL )
            {
                if( poLayer->SetAttributeFilter( pszWHERE ) != OGRERR_NONE )
                {
                    char* pcaMessage=(char*) malloc((40+strlen(pszWHERE)));
                    sprintf( stderr, "FAILURE: SetAttributeFilter(%s) failed.", pszWHERE );
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    if (!bSkipFailures)
#ifdef ZOO_SERVICE
		      return SERVICE_FAILED;
#else
                        exit( 1 );
#endif
                }
            }

            if( poSpatialFilter != NULL )
                poLayer->SetSpatialFilter( poSpatialFilter );

            if (bDisplayProgress)
            {
                if (!poLayer->TestCapability(OLCFastFeatureCount))
                {   char* pcaMessage=(char*) malloc((60)*sizeof(char));
                    sprintf( pcaMessage, "Progress turned off as fast feature count is not available.");
                    ZOO_DEBUG(pcaMessage);
                    free(pcaMessage);
                    bDisplayProgress = FALSE;
                }
                else
                {
                    panLayerCountFeatures[iLayer] = poLayer->GetFeatureCount();
                    nCountLayersFeatures += panLayerCountFeatures[iLayer];
                }
            }
        }

        /* Second pass to do the real job */
        for( iLayer = 0; 
            iLayer < nLayerCount; 
            iLayer++ )
        {
            OGRLayer        *poLayer = papoLayers[iLayer];
            if (poLayer == NULL)
                continue;


            OGRLayer* poPassedLayer = poLayer;
            if (bSplitListFields)
            {
                poPassedLayer = new OGRSplitListFieldLayer(poPassedLayer, nMaxSplitListSubFields);

                if (bDisplayProgress && nMaxSplitListSubFields != 1)
                {
                    pfnProgress = GDALScaledProgress;
                    pProgressArg = 
                        GDALCreateScaledProgress(nAccCountFeatures * 1.0 / nCountLayersFeatures,
                                                (nAccCountFeatures + panLayerCountFeatures[iLayer] / 2) * 1.0 / nCountLayersFeatures,
                                                GDALTermProgress,
                                                NULL);
                }
                else
                {
                    pfnProgress = NULL;
                    pProgressArg = NULL;
                }

                int nRet = ((OGRSplitListFieldLayer*)poPassedLayer)->BuildLayerDefn(pfnProgress, pProgressArg);
                if (!nRet)
                {
                    delete poPassedLayer;
                    poPassedLayer = poLayer;
                }

                if (bDisplayProgress)
                    GDALDestroyScaledProgress(pProgressArg);
            }


            if (bDisplayProgress)
            {
                pfnProgress = GDALScaledProgress;
                int nStart = 0;
                if (poPassedLayer != poLayer && nMaxSplitListSubFields != 1)
                    nStart = panLayerCountFeatures[iLayer] / 2;
                pProgressArg = 
                    GDALCreateScaledProgress((nAccCountFeatures + nStart) * 1.0 / nCountLayersFeatures,
                                            (nAccCountFeatures + panLayerCountFeatures[iLayer]) * 1.0 / nCountLayersFeatures,
                                            GDALTermProgress,
                                            NULL);
            }

            nAccCountFeatures += panLayerCountFeatures[iLayer];

            if( !TranslateLayer( poDS, poPassedLayer, poODS, papszLCO, 
                                pszNewLayerName, bTransform, poOutputSRS, bNullifyOutputSRS,
                                poSourceSRS, papszSelFields, bAppend, eGType,
                                bOverwrite, eGeomOp, dfGeomOpParam, papszFieldTypesToString,
                                panLayerCountFeatures[iLayer], bWrapDateline, poClipSrc, poClipDst,
                                bExplodeCollections, pszZField, pszWHERE, pfnProgress, pProgressArg)
                && !bSkipFailures )
            {
                CPLError( CE_Failure, CPLE_AppDefined, 
                        "Terminating translation prematurely after failed\n"
                        "translation of layer %s (use -skipfailures to skip errors)\n", 
                        poLayer->GetName() );
#ifdef ZOO_SERVICE
		return SERVICE_FAILED;
#else
                exit( 1 );
#endif
            }

            if (poPassedLayer != poLayer)
                delete poPassedLayer;

            if (bDisplayProgress)
                GDALDestroyScaledProgress(pProgressArg);
        }

        CPLFree(panLayerCountFeatures);
        CPLFree(papoLayers);
    }
/* -------------------------------------------------------------------- */
/*      Process DS style table                                          */
/* -------------------------------------------------------------------- */

    poODS->SetStyleTable( poDS->GetStyleTable () );

/* -------------------------------------------------------------------- */
/*      Close down.                                                     */
/* -------------------------------------------------------------------- */
    OGRSpatialReference::DestroySpatialReference(poOutputSRS);
    OGRSpatialReference::DestroySpatialReference(poSourceSRS);
#if GDAL_VERSION_MAJOR < 2
    if (bCloseODS)
        OGRDataSource::DestroyDataSource(poODS);
    OGRDataSource::DestroyDataSource(poDS);
#endif
    OGRGeometryFactory::destroyGeometry(poSpatialFilter);
    OGRGeometryFactory::destroyGeometry(poClipSrc);
    OGRGeometryFactory::destroyGeometry(poClipDst);

    CSLDestroy(papszSelFields);
#ifndef ZOO_SERVICE
    CSLDestroy( papszArgv );
#endif
    CSLDestroy( papszLayers );
    CSLDestroy( papszDSCO );
    CSLDestroy( papszLCO );
    CSLDestroy( papszFieldTypesToString );
    CPLFree( pszNewLayerName );
    
    free(pszDataSource);
    free(pszDestDataSource);

    OGRCleanupAll();

#ifdef DBMALLOC
    malloc_dump(1);
#endif
    
#ifdef ZOO_SERVICE
    setMapInMaps(outputs,"Result","value",(char*)pszwebDestData);
    char* pcaMessage=(char*) malloc((6+strlen(__FILE__)+strlen(__LINE__))*sizeof(char));
    sprintf(pcaMessage,"%s %d",__FILE__,__LINE__);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    free(pszwebDestData);
    char* pcaMessage=(char*) malloc((6+strlen(__FILE__)+strlen(__LINE__))*sizeof(char));
    sprintf(pcaMessage,"%s %d",__FILE__,__LINE__);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    return SERVICE_SUCCEEDED;
#else
    return 0;
#endif
}

/************************************************************************/
/*                               Usage()                                */
/************************************************************************/

static void Usage(int bShort)

{
    OGRSFDriverRegistrar        *poR = OGRSFDriverRegistrar::GetRegistrar();


    printf( "Usage: ogr2ogr [--help-general] [-skipfailures] [-append] [-update]\n"
            "               [-select field_list] [-where restricted_where]\n"
            "               [-progress] [-sql <sql statement>] [-dialect dialect]\n"
            "               [-preserve_fid] [-fid FID]\n"
            "               [-spat xmin ymin xmax ymax]\n"
            "               [-a_srs srs_def] [-t_srs srs_def] [-s_srs srs_def]\n"
            "               [-f format_name] [-overwrite] [[-dsco NAME=VALUE] ...]\n"
            "               dst_datasource_name src_datasource_name\n"
            "               [-lco NAME=VALUE] [-nln name] [-nlt type] [layer [layer ...]]\n"
            "\n"
            "Advanced options :\n"
            "               [-gt n]\n"
            "               [-clipsrc [xmin ymin xmax ymax]|WKT|datasource|spat_extent]\n"
            "               [-clipsrcsql sql_statement] [-clipsrclayer layer]\n"
            "               [-clipsrcwhere expression]\n"
            "               [-clipdst [xmin ymin xmax ymax]|WKT|datasource]\n"
            "               [-clipdstsql sql_statement] [-clipdstlayer layer]\n"
            "               [-clipdstwhere expression]\n"
            "               [-wrapdateline]\n"
            "               [[-simplify tolerance] | [-segmentize max_dist]]\n"
            "               [-fieldTypeToString All|(type1[,type2]*)]\n"
            "               [-splitlistfields] [-maxsubfields val]\n"
            "               [-explodecollections] [-zfield field_name]\n");

    if (bShort)
    {
        printf( "\nNote: ogr2ogr --long-usage for full help.\n");
        exit( 1 );
    }

    printf("\n -f format_name: output file format name, possible values are:\n");

    for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
    {
#if GDAL_VERSION_MAJOR >= 2
      GDALDriver
#else 
	OGRSFDriver
#endif
         *poDriver = poR->GetDriver(iDriver);

      /*if( poDriver->TestCapability( ODrCCreateDataSource ) )
	printf( "     -f \"%s\"\n", poDriver->GetName() );*/
    }

    printf( " -append: Append to existing layer instead of creating new if it exists\n"
            " -overwrite: delete the output layer and recreate it empty\n"
            " -update: Open existing output datasource in update mode\n"
            " -progress: Display progress on terminal. Only works if input layers have the \n"
            "                                          \"fast feature count\" capability\n"
            " -select field_list: Comma-delimited list of fields from input layer to\n"
            "                     copy to the new layer (defaults to all)\n" 
            " -where restricted_where: Attribute query (like SQL WHERE)\n" 
            " -wrapdateline: split geometries crossing the dateline meridian\n"
            "                (long. = +/- 180deg)\n" 
            " -sql statement: Execute given SQL statement and save result.\n"
            " -dialect value: select a dialect, usually OGRSQL to avoid native sql.\n"
            " -skipfailures: skip features or layers that fail to convert\n"
            " -gt n: group n features per transaction (default 200)\n"
            " -spat xmin ymin xmax ymax: spatial query extents\n"
            " -simplify tolerance: distance tolerance for simplification.\n"
            " -segmentize max_dist: maximum distance between 2 nodes.\n"
            "                       Used to create intermediate points\n"
            " -dsco NAME=VALUE: Dataset creation option (format specific)\n"
            " -lco  NAME=VALUE: Layer creation option (format specific)\n"
            " -nln name: Assign an alternate name to the new layer\n"
            " -nlt type: Force a geometry type for new layer.  One of NONE, GEOMETRY,\n"
            "      POINT, LINESTRING, POLYGON, GEOMETRYCOLLECTION, MULTIPOINT,\n"
            "      MULTIPOLYGON, or MULTILINESTRING.  Add \"25D\" for 3D layers.\n"
            "      Default is type of source layer.\n"
            " -fieldTypeToString type1,...: Converts fields of specified types to\n"
            "      fields of type string in the new layer. Valid types are : Integer,\n"
            "      Real, String, Date, Time, DateTime, Binary, IntegerList, RealList,\n"
            "      StringList. Special value All will convert all fields to strings.\n");

    printf(" -a_srs srs_def: Assign an output SRS\n"
           " -t_srs srs_def: Reproject/transform to this SRS on output\n"
           " -s_srs srs_def: Override source SRS\n"
           "\n" 
           " Srs_def can be a full WKT definition (hard to escape properly),\n"
           " or a well known definition (ie. EPSG:4326) or a file with a WKT\n"
           " definition.\n" );

    exit( 1 );
}

/************************************************************************/
/*                               SetZ()                                 */
/************************************************************************/
static void SetZ (OGRGeometry* poGeom, double dfZ )
{
    if (poGeom == NULL)
        return;
    switch (wkbFlatten(poGeom->getGeometryType()))
    {
        case wkbPoint:
            ((OGRPoint*)poGeom)->setZ(dfZ);
            break;

        case wkbLineString:
        case wkbLinearRing:
        {
            int i;
            OGRLineString* poLS = (OGRLineString*) poGeom;
            for(i=0;i<poLS->getNumPoints();i++)
                poLS->setPoint(i, poLS->getX(i), poLS->getY(i), dfZ);
            break;
        }

        case wkbPolygon:
        {
            int i;
            OGRPolygon* poPoly = (OGRPolygon*) poGeom;
            SetZ(poPoly->getExteriorRing(), dfZ);
            for(i=0;i<poPoly->getNumInteriorRings();i++)
                SetZ(poPoly->getInteriorRing(i), dfZ);
            break;
        }

        case wkbMultiPoint:
        case wkbMultiLineString:
        case wkbMultiPolygon:
        case wkbGeometryCollection:
        {
            int i;
            OGRGeometryCollection* poGeomColl = (OGRGeometryCollection*) poGeom;
            for(i=0;i<poGeomColl->getNumGeometries();i++)
                SetZ(poGeomColl->getGeometryRef(i), dfZ);
            break;
        }

        default:
            break;
    }
}


/************************************************************************/
/*                           TranslateLayer()                           */
/************************************************************************/

static int TranslateLayer( 
#if GDAL_VERSION_MAJOR >= 2
			  GDALDataset
#else 
			  OGRDataSource
#endif
			  *poSrcDS, 
                           OGRLayer * poSrcLayer,
#if GDAL_VERSION_MAJOR >= 2
			  GDALDataset
#else 
			  OGRDataSource
#endif
			  *poDstDS,
                           char **papszLCO,
                           const char *pszNewLayerName,
                           int bTransform, 
                           OGRSpatialReference *poOutputSRS,
                           int bNullifyOutputSRS,
                           OGRSpatialReference *poSourceSRS,
                           char **papszSelFields,
                           int bAppend, int eGType, int bOverwrite,
                           GeomOperation eGeomOp,
                           double dfGeomOpParam,
                           char** papszFieldTypesToString,
                           long nCountLayerFeatures,
                           int bWrapDateline,
                           OGRGeometry* poClipSrc,
                           OGRGeometry *poClipDst,
                           int bExplodeCollections,
                           const char* pszZField,
                           const char* pszWHERE,
                           GDALProgressFunc pfnProgress,
                           void *pProgressArg)

{
    OGRLayer    *poDstLayer;
    OGRFeatureDefn *poSrcFDefn;
    OGRFeatureDefn *poDstFDefn = NULL;
    int         bForceToPolygon = FALSE;
    int         bForceToMultiPolygon = FALSE;
    int         bForceToMultiLineString = FALSE;
    
    char**      papszTransformOptions = NULL;

    if( pszNewLayerName == NULL )
        pszNewLayerName = poSrcLayer->GetName();

    if( wkbFlatten(eGType) == wkbPolygon )
        bForceToPolygon = TRUE;
    else if( wkbFlatten(eGType) == wkbMultiPolygon )
        bForceToMultiPolygon = TRUE;
    else if( wkbFlatten(eGType) == wkbMultiLineString )
        bForceToMultiLineString = TRUE;

/* -------------------------------------------------------------------- */
/*      Setup coordinate transformation if we need it.                  */
/* -------------------------------------------------------------------- */
    OGRCoordinateTransformation *poCT = NULL;

    if( bTransform )
    {
        if( poSourceSRS == NULL )
            poSourceSRS = poSrcLayer->GetSpatialRef();

        if( poSourceSRS == NULL )
        {
            char* pcaMessage=(char*) malloc((91)*sizeof(char));
            sprintf( pcaMessage, "Can't transform coordinates, source layer has no"
                    "coordinate system.  Use -s_srs to set one." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
#ifdef ZOO_SERVICE
	      return SERVICE_FAILED;
#else
                exit(1);
#endif
        }

        CPLAssert( NULL != poSourceSRS );
        CPLAssert( NULL != poOutputSRS );

        poCT = OGRCreateCoordinateTransformation( poSourceSRS, poOutputSRS );
        if( poCT == NULL )
        {
            char        *pszWKT = NULL;

            char* pcaMessage=(char*) malloc((200)*sizeof(char));
            sprintf( pcaMessage, "Failed to create coordinate transformation between the"
                   "following coordinate systems.  This may be because they"
                   "are not transformable, or because projection services"
                   "(PROJ.4 DLL/.so) could not be loaded." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            
            poSourceSRS->exportToPrettyWkt( &pszWKT, FALSE );
            char* pcaMessage=(char*) malloc((12+strlen(pszWKT))*sizeof(char));
            sprintf( pcaMessage,  "Source:\n%s", pszWKT );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            
            poOutputSRS->exportToPrettyWkt( &pszWKT, FALSE );
            char* pcaMessage=(char*) malloc((12+strlen(pszWKT))*sizeof(char));
            sprintf( pcaMessage,  "Target:\n%s", pszWKT );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
#ifdef ZOO_SERVICE
	      return SERVICE_FAILED;
#else
                exit(1);
#endif
        }
    }
    
    if (bWrapDateline)
    {
        if( poSourceSRS == NULL )
            poSourceSRS = poSrcLayer->GetSpatialRef();

        if (poCT != NULL && poOutputSRS->IsGeographic())
        {
            papszTransformOptions =
                CSLAddString(papszTransformOptions, "WRAPDATELINE=YES");
        }
        else if (poSourceSRS != NULL && poOutputSRS == NULL && poSourceSRS->IsGeographic())
        {
            papszTransformOptions =
                CSLAddString(papszTransformOptions, "WRAPDATELINE=YES");
        }
        else
        {
            char* pcaMessage=(char*) malloc((70)*sizeof(char));
            sprintf(pcaMessage, "-wrapdateline option only works when reprojecting to a geographic SRS");
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
        }
    }
/* -------------------------------------------------------------------- */
/*      Get other info.                                                 */
/* -------------------------------------------------------------------- */
    poSrcFDefn = poSrcLayer->GetLayerDefn();
    
    if( poOutputSRS == NULL && !bNullifyOutputSRS )
        poOutputSRS = poSrcLayer->GetSpatialRef();

/* -------------------------------------------------------------------- */
/*      Find the layer.                                                 */
/* -------------------------------------------------------------------- */

    /* GetLayerByName() can instanciate layers that would have been */
    /* 'hidden' otherwise, for example, non-spatial tables in a */
    /* Postgis-enabled database, so this apparently useless command is */
    /* not useless... (#4012) */
    CPLPushErrorHandler(CPLQuietErrorHandler);
    poDstLayer = poDstDS->GetLayerByName(pszNewLayerName);
    CPLPopErrorHandler();
    CPLErrorReset();

    int iLayer = -1;
    if (poDstLayer != NULL)
    {
        int nLayerCount = poDstDS->GetLayerCount();
        for( iLayer = 0; iLayer < nLayerCount; iLayer++ )
        {
            OGRLayer        *poLayer = poDstDS->GetLayer(iLayer);
            if (poLayer == poDstLayer)
                break;
        }

        if (iLayer == nLayerCount)
            /* shouldn't happen with an ideal driver */
            poDstLayer = NULL;
    }

/* -------------------------------------------------------------------- */
/*      If the user requested overwrite, and we have the layer in       */
/*      question we need to delete it now so it will get recreated      */
/*      (overwritten).                                                  */
/* -------------------------------------------------------------------- */
    if( poDstLayer != NULL && bOverwrite )
    {
        if( poDstDS->DeleteLayer( iLayer ) != OGRERR_NONE )
        {
            char* pcaMessage=(char*) malloc((47)*sizeof(char));
            sprintf( pcaMessage, 
                     "DeleteLayer() failed when overwrite requested." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            CSLDestroy(papszTransformOptions);
            return FALSE;
        }
        poDstLayer = NULL;
    }

/* -------------------------------------------------------------------- */
/*      If the layer does not exist, then create it.                    */
/* -------------------------------------------------------------------- */
    if( poDstLayer == NULL )
    {
        if( eGType == -2 )
        {
            eGType = poSrcFDefn->GetGeomType();

            if ( bExplodeCollections )
            {
                int n25DBit = eGType & wkb25DBit;
                if (wkbFlatten(eGType) == wkbMultiPoint)
                {
                    eGType = wkbPoint | n25DBit;
                }
                else if (wkbFlatten(eGType) == wkbMultiLineString)
                {
                    eGType = wkbLineString | n25DBit;
                }
                else if (wkbFlatten(eGType) == wkbMultiPolygon)
                {
                    eGType = wkbPolygon | n25DBit;
                }
                else if (wkbFlatten(eGType) == wkbGeometryCollection)
                {
                    eGType = wkbUnknown | n25DBit;
                }
            }

            if ( pszZField )
                eGType |= wkb25DBit;
        }

        if( !poDstDS->TestCapability( ODsCCreateLayer ) )
        {
            char* pcaMessage=(char*) malloc((61+strlen(pszNewLayerName))*sizeof(char));
            sprintf( pcaMessage, 
              "Layer %s not found, and CreateLayer not supported by driver.", 
                     pszNewLayerName );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            return FALSE;
        }

        CPLErrorReset();

        poDstLayer = poDstDS->CreateLayer( pszNewLayerName, poOutputSRS,
                                           (OGRwkbGeometryType) eGType, 
                                           papszLCO );

        if( poDstLayer == NULL )
        {
            CSLDestroy(papszTransformOptions);
            return FALSE;
        }

        bAppend = FALSE;
    }

/* -------------------------------------------------------------------- */
/*      Otherwise we will append to it, if append was requested.        */
/* -------------------------------------------------------------------- */
    else if( !bAppend )
    {
        char* pcaMessage=(char*) malloc((106+strlen(pszNewLayerName))*sizeof(char));
        sprintf( pcaMessage, "FAILED: Layer %s already exists, and -append not specified."
                "        Consider using -append, or -overwrite.",
                pszNewLayerName );
        ZOO_DEBUG(pcaMessage);
        free(pcaMessage);
        return FALSE;
    }
    else
    {
        if( CSLCount(papszLCO) > 0 )
        {
            char* pcaMessage=(char*) malloc((94)*sizeof(char));
            sprintf( pcaMessage, "WARNING: Layer creation options ignored since an existing layer is"
                    "         being appended to." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
        }
    }

/* -------------------------------------------------------------------- */
/*      Process Layer style table                                       */
/* -------------------------------------------------------------------- */

    poDstLayer->SetStyleTable( poSrcLayer->GetStyleTable () );
/* -------------------------------------------------------------------- */
/*      Add fields.  Default to copy all field.                         */
/*      If only a subset of all fields requested, then output only      */
/*      the selected fields, and in the order that they were            */
/*      selected.                                                       */
/* -------------------------------------------------------------------- */
    int         nSrcFieldCount = poSrcFDefn->GetFieldCount();
    int         iField, *panMap;

    // Initialize the index-to-index map to -1's
    panMap = (int *) VSIMalloc( sizeof(int) * nSrcFieldCount );
    for( iField=0; iField < nSrcFieldCount; iField++)
        panMap[iField] = -1;
        
    /* Caution : at the time of writing, the MapInfo driver */
    /* returns NULL until a field has been added */
    poDstFDefn = poDstLayer->GetLayerDefn();

    if (papszSelFields && !bAppend )
    {
        int  nDstFieldCount = 0;
        if (poDstFDefn)
            nDstFieldCount = poDstFDefn->GetFieldCount();
        for( iField=0; papszSelFields[iField] != NULL; iField++)
        {
            int iSrcField = poSrcFDefn->GetFieldIndex(papszSelFields[iField]);
            if (iSrcField >= 0)
            {
                OGRFieldDefn* poSrcFieldDefn = poSrcFDefn->GetFieldDefn(iSrcField);
                OGRFieldDefn oFieldDefn( poSrcFieldDefn );

                if (papszFieldTypesToString != NULL &&
                    (CSLFindString(papszFieldTypesToString, "All") != -1 ||
                     CSLFindString(papszFieldTypesToString,
                                   OGRFieldDefn::GetFieldTypeName(poSrcFieldDefn->GetType())) != -1))
                {
                    oFieldDefn.SetType(OFTString);
                }
                
                /* The field may have been already created at layer creation */
                int iDstField = -1;
                if (poDstFDefn)
                    iDstField = poDstFDefn->GetFieldIndex(oFieldDefn.GetNameRef());
                if (iDstField >= 0)
                {
                    panMap[iSrcField] = iDstField;
                }
                else if (poDstLayer->CreateField( &oFieldDefn ) == OGRERR_NONE)
                {
                    /* now that we've created a field, GetLayerDefn() won't return NULL */
                    if (poDstFDefn == NULL)
                        poDstFDefn = poDstLayer->GetLayerDefn();

                    /* Sanity check : if it fails, the driver is buggy */
                    if (poDstFDefn != NULL &&
                        poDstFDefn->GetFieldCount() != nDstFieldCount + 1)
                    {
                        CPLError(CE_Warning, CPLE_AppDefined,
                                 "The output driver has claimed to have added the %s field, but it did not!",
                                 oFieldDefn.GetNameRef() );
                    }
                    else
                    {
                        panMap[iSrcField] = nDstFieldCount;
                        nDstFieldCount ++;
                    }
                }
            }
            else
            {
                char* pcaMessage=(char*) malloc((38+strlen(papszSelFields[iField]))*sizeof(char));
                sprintf( pcaMessage, "Field '%s' not found in source layer.", 
                        papszSelFields[iField] );
                ZOO_DEBUG(pcaMessage);
                free(pcaMessage);
                if( !bSkipFailures )
                {
                    VSIFree(panMap);
                    CSLDestroy(papszTransformOptions);
                    return FALSE;
                }
            }
        }
        
        /* -------------------------------------------------------------------- */
        /* Use SetIgnoredFields() on source layer if available                  */
        /* -------------------------------------------------------------------- */
        if (poSrcLayer->TestCapability(OLCIgnoreFields))
        {
            int iSrcField;
            char** papszIgnoredFields = NULL;
            int bUseIgnoredFields = TRUE;
            char** papszWHEREUsedFields = NULL;

            if (pszWHERE)
            {
                /* We must not ignore fields used in the -where expression (#4015) */
                OGRFeatureQuery oFeatureQuery;
                if ( oFeatureQuery.Compile( poSrcLayer->GetLayerDefn(), pszWHERE ) == OGRERR_NONE )
                {
                    papszWHEREUsedFields = oFeatureQuery.GetUsedFields();
                }
                else
                {
                    bUseIgnoredFields = FALSE;
                }
            }

            for(iSrcField=0;iSrcField<poSrcFDefn->GetFieldCount();iSrcField++)
            {
                const char* pszFieldName =
                    poSrcFDefn->GetFieldDefn(iSrcField)->GetNameRef();
                int bFieldRequested = FALSE;
                for( iField=0; papszSelFields[iField] != NULL; iField++)
                {
                    if (EQUAL(pszFieldName, papszSelFields[iField]))
                    {
                        bFieldRequested = TRUE;
                        break;
                    }
                }
                bFieldRequested |= CSLFindString(papszWHEREUsedFields, pszFieldName) >= 0;
                bFieldRequested |= (pszZField != NULL && EQUAL(pszFieldName, pszZField));

                /* If source field not requested, add it to ignored files list */
                if (!bFieldRequested)
                    papszIgnoredFields = CSLAddString(papszIgnoredFields, pszFieldName);
            }
            if (bUseIgnoredFields)
                poSrcLayer->SetIgnoredFields((const char**)papszIgnoredFields);
            CSLDestroy(papszIgnoredFields);
            CSLDestroy(papszWHEREUsedFields);
        }
    }
    else if( !bAppend )
    {
        int nDstFieldCount = 0;
        if (poDstFDefn)
            nDstFieldCount = poDstFDefn->GetFieldCount();
        for( iField = 0; iField < nSrcFieldCount; iField++ )
        {
            OGRFieldDefn* poSrcFieldDefn = poSrcFDefn->GetFieldDefn(iField);
            OGRFieldDefn oFieldDefn( poSrcFieldDefn );

            if (papszFieldTypesToString != NULL &&
                (CSLFindString(papszFieldTypesToString, "All") != -1 ||
                 CSLFindString(papszFieldTypesToString,
                               OGRFieldDefn::GetFieldTypeName(poSrcFieldDefn->GetType())) != -1))
            {
                oFieldDefn.SetType(OFTString);
            }

            /* The field may have been already created at layer creation */
            int iDstField = -1;
            if (poDstFDefn)
                 iDstField = poDstFDefn->GetFieldIndex(oFieldDefn.GetNameRef());
            if (iDstField >= 0)
            {
                panMap[iField] = iDstField;
            }
            else if (poDstLayer->CreateField( &oFieldDefn ) == OGRERR_NONE)
            {
                /* now that we've created a field, GetLayerDefn() won't return NULL */
                if (poDstFDefn == NULL)
                    poDstFDefn = poDstLayer->GetLayerDefn();

                /* Sanity check : if it fails, the driver is buggy */
                if (poDstFDefn != NULL &&
                    poDstFDefn->GetFieldCount() != nDstFieldCount + 1)
                {
                    CPLError(CE_Warning, CPLE_AppDefined,
                             "The output driver has claimed to have added the %s field, but it did not!",
                             oFieldDefn.GetNameRef() );
                }
                else
                {
                    panMap[iField] = nDstFieldCount;
                    nDstFieldCount ++;
                }
            }
        }
    }
    else
    {
        /* For an existing layer, build the map by fetching the index in the destination */
        /* layer for each source field */
        if (poDstFDefn == NULL)
        {
            char* pcaMessage=(char*) malloc((20)*sizeof(char));
            sprintf( pcaMessage, "poDstFDefn == NULL." );
            ZOO_DEBUG(pcaMessage);
            free(pcaMessage);
            VSIFree(panMap);
            CSLDestroy(papszTransformOptions);
            return FALSE;
        }
        
        for( iField = 0; iField < nSrcFieldCount; iField++ )
        {
            OGRFieldDefn* poSrcFieldDefn = poSrcFDefn->GetFieldDefn(iField);
            int iDstField = poDstFDefn->GetFieldIndex(poSrcFieldDefn->GetNameRef());
            if (iDstField >= 0)
                panMap[iField] = iDstField;
        }
    }
    
/* -------------------------------------------------------------------- */
/*      Transfer features.                                              */
/* -------------------------------------------------------------------- */
    OGRFeature  *poFeature;
    int         nFeaturesInTransaction = 0;
    GIntBig      nCount = 0; /* written + failed */
    GIntBig      nFeaturesWritten = 0;

    int iSrcZField = -1;
    if (pszZField != NULL)
    {
        iSrcZField = poSrcFDefn->GetFieldIndex(pszZField);
    }
    
    poSrcLayer->ResetReading();

    if( nGroupTransactions )
        poDstLayer->StartTransaction();

    while( TRUE )
    {
        OGRFeature      *poDstFeature = NULL;

        if( nFIDToFetch != OGRNullFID )
        {
            // Only fetch feature on first pass.
            if( nFeaturesInTransaction == 0 )
                poFeature = poSrcLayer->GetFeature(nFIDToFetch);
            else
                poFeature = NULL;
        }
        else
            poFeature = poSrcLayer->GetNextFeature();
        
        if( poFeature == NULL )
            break;

        int nParts = 0;
        int nIters = 1;
        if (bExplodeCollections)
        {
            OGRGeometry* poSrcGeometry = poFeature->GetGeometryRef();
            if (poSrcGeometry)
            {
                switch (wkbFlatten(poSrcGeometry->getGeometryType()))
                {
                    case wkbMultiPoint:
                    case wkbMultiLineString:
                    case wkbMultiPolygon:
                    case wkbGeometryCollection:
                        nParts = ((OGRGeometryCollection*)poSrcGeometry)->getNumGeometries();
                        nIters = nParts;
                        if (nIters == 0)
                            nIters = 1;
                    default:
                        break;
                }
            }
        }

        for(int iPart = 0; iPart < nIters; iPart++)
        {
            if( ++nFeaturesInTransaction == nGroupTransactions )
            {
                poDstLayer->CommitTransaction();
                poDstLayer->StartTransaction();
                nFeaturesInTransaction = 0;
            }

            CPLErrorReset();
            poDstFeature = OGRFeature::CreateFeature( poDstLayer->GetLayerDefn() );

            if( poDstFeature->SetFrom( poFeature, panMap, TRUE ) != OGRERR_NONE )
            {
                if( nGroupTransactions )
                    poDstLayer->CommitTransaction();

                CPLError( CE_Failure, CPLE_AppDefined,
                        "Unable to translate feature %ld from layer %s.\n",
                        poFeature->GetFID(), poSrcFDefn->GetName() );

                OGRFeature::DestroyFeature( poFeature );
                OGRFeature::DestroyFeature( poDstFeature );
                VSIFree(panMap);
                CSLDestroy(papszTransformOptions);
                return FALSE;
            }

            if( bPreserveFID )
                poDstFeature->SetFID( poFeature->GetFID() );

            OGRGeometry* poDstGeometry = poDstFeature->GetGeometryRef();
            if (poDstGeometry != NULL)
            {
                if (nParts > 0)
                {
                    /* For -explodecollections, extract the iPart(th) of the geometry */
                    OGRGeometry* poPart = ((OGRGeometryCollection*)poDstGeometry)->getGeometryRef(iPart);
                    ((OGRGeometryCollection*)poDstGeometry)->removeGeometry(iPart, FALSE);
                    poDstFeature->SetGeometryDirectly(poPart);
                    poDstGeometry = poPart;
                }

                if (iSrcZField != -1)
                {
                    SetZ(poDstGeometry, poFeature->GetFieldAsDouble(iSrcZField));
                    /* This will correct the coordinate dimension to 3 */
                    OGRGeometry* poDupGeometry = poDstGeometry->clone();
                    poDstFeature->SetGeometryDirectly(poDupGeometry);
                    poDstGeometry = poDupGeometry;
                }

                if (eGeomOp == SEGMENTIZE)
                {
                    if (dfGeomOpParam > 0)
                        poDstGeometry->segmentize(dfGeomOpParam);
                }
                else if (eGeomOp == SIMPLIFY_PRESERVE_TOPOLOGY)
                {
                    if (dfGeomOpParam > 0)
                    {
                        OGRGeometry* poNewGeom = poDstGeometry->SimplifyPreserveTopology(dfGeomOpParam);
                        if (poNewGeom)
                        {
                            poDstFeature->SetGeometryDirectly(poNewGeom);
                            poDstGeometry = poNewGeom;
                        }
                    }
                }

                if (poClipSrc)
                {
                    OGRGeometry* poClipped = poDstGeometry->Intersection(poClipSrc);
                    if (poClipped == NULL || poClipped->IsEmpty())
                    {
                        OGRGeometryFactory::destroyGeometry(poClipped);
                        goto end_loop;
                    }
                    poDstFeature->SetGeometryDirectly(poClipped);
                    poDstGeometry = poClipped;
                }

                if( poCT != NULL || papszTransformOptions != NULL)
                {
                    OGRGeometry* poReprojectedGeom =
                        OGRGeometryFactory::transformWithOptions(poDstGeometry, poCT, papszTransformOptions);
                    if( poReprojectedGeom == NULL )
                    {
                        if( nGroupTransactions )
                            poDstLayer->CommitTransaction();

                        char* pcaMessage=(char*) malloc((85)*sizeof(char));
                        sprintf( pcaMessage, "Failed to reproject feature %d (geometry probably out of source or destination SRS).",
                                (int) poFeature->GetFID() );
                        ZOO_DEBUG(pcaMessage);
                        free(pcaMessage);
                        if( !bSkipFailures )
                        {
                            OGRFeature::DestroyFeature( poFeature );
                            OGRFeature::DestroyFeature( poDstFeature );
                            VSIFree(panMap);
                            CSLDestroy(papszTransformOptions);
                            return FALSE;
                        }
                    }

                    poDstFeature->SetGeometryDirectly(poReprojectedGeom);
                    poDstGeometry = poReprojectedGeom;
                }
                else if (poOutputSRS != NULL)
                {
                    poDstGeometry->assignSpatialReference(poOutputSRS);
                }

                if (poClipDst)
                {
                    OGRGeometry* poClipped = poDstGeometry->Intersection(poClipDst);
                    if (poClipped == NULL || poClipped->IsEmpty())
                    {
                        OGRGeometryFactory::destroyGeometry(poClipped);
                        goto end_loop;
                    }

                    poDstFeature->SetGeometryDirectly(poClipped);
                    poDstGeometry = poClipped;
                }

                if( bForceToPolygon )
                {
                    poDstFeature->SetGeometryDirectly(
                        OGRGeometryFactory::forceToPolygon(
                            poDstFeature->StealGeometry() ) );
                }
                else if( bForceToMultiPolygon )
                {
                    poDstFeature->SetGeometryDirectly(
                        OGRGeometryFactory::forceToMultiPolygon(
                            poDstFeature->StealGeometry() ) );
                }
                else if ( bForceToMultiLineString )
                {
                    poDstFeature->SetGeometryDirectly(
                        OGRGeometryFactory::forceToMultiLineString(
                            poDstFeature->StealGeometry() ) );
                }
            }

            CPLErrorReset();
            if( poDstLayer->CreateFeature( poDstFeature ) == OGRERR_NONE )
            {
                nFeaturesWritten ++;
            }
            else if( !bSkipFailures )
            {
                if( nGroupTransactions )
                    poDstLayer->RollbackTransaction();

                OGRFeature::DestroyFeature( poFeature );
                OGRFeature::DestroyFeature( poDstFeature );
                VSIFree(panMap);
                CSLDestroy(papszTransformOptions);
                return FALSE;
            }

end_loop:
            OGRFeature::DestroyFeature( poDstFeature );
        }

        OGRFeature::DestroyFeature( poFeature );

        /* Report progress */
        nCount ++;
        if (pfnProgress)
            pfnProgress(nCount * 1.0 / nCountLayerFeatures, "", pProgressArg);
    }

    if( nGroupTransactions )
        poDstLayer->CommitTransaction();

    CPLDebug("OGR2OGR", CPL_FRMT_GIB " features written in layer '%s'",
             nFeaturesWritten, pszNewLayerName);

/* -------------------------------------------------------------------- */
/*      Cleaning                                                        */
/* -------------------------------------------------------------------- */
    OGRCoordinateTransformation::DestroyCT(poCT);
    
    VSIFree(panMap);
    CSLDestroy(papszTransformOptions);

    return TRUE;
}

#ifdef ZOO_SERVICE
}
#endif
