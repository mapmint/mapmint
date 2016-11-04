/******************************************************************************
 * $Id$
 *
 * Project:  OpenGIS Simple Features Reference Implementation
 * Purpose:  Simple client for viewing OGR driver data.
 * Author:   Gérald Fenoy, gerald.fenoy@cartoworks.com
 *
 ******************************************************************************
 * Copyright (c) 2010-2014, Cartoworks Inc. 
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

#define _USE_MATH_DEFINES
#include <dirent.h>
#include <fcntl.h>
#include "ogr_api.h"
#include "ogrsf_frmts.h"
#include "cpl_multiproc.h"
#include "gdal.h"
#include "gdal_alg.h"

#ifdef ZOO_SERVICE
#ifdef WIN32
#define XP_WIN 1
#define NEED_STRCASESTR 1
#endif
#include "service.h"
#include "mapserver.h"
#endif

#include "service_internal.h"
extern "C" {
#include <libxml/tree.h>
#include <libxml/parser.h>
#include <libxml/xpath.h>
#include <libxml/xpathInternals.h>

#include <libxslt/xslt.h>
#include <libxslt/xsltInternals.h>
#include <libxslt/transform.h>
#include <libxslt/xsltutils.h>

#include "service_internal_ms.h"

  /*int SVFC=4;
    char* SVF[4]={
    "TAB",
    "GPX",
    "KML",
    "XML"
    };*/

  /*extern map* getCorrespondance();
    extern void setSrsInformations(maps* output,mapObj* m,layerObj* myLayer, char* pszProjection);
    void setMsExtent(maps* output,mapObj* m,layerObj* myLayer,
    double minX,double minY,double maxX,double maxY);*/

  char*   mimeType=NULL;
  int     mmPage = 1;
  int     mmLimit = 10;
  int     dataSource = TRUE;
  int     bReadOnly = FALSE;
  int     bVerbose = TRUE;
  int     bSummaryOnly = FALSE;
  int     nFetchFID = OGRNullFID;
  char**  papszOptions = NULL;

  void ReportOnLayer( mapObj*, maps*, char* , OGRLayer *, const char *, OGRGeometry *, xmlNodePtr,maps*  );
  void ReportOnLayer4Map( char*,OGRLayer*, const char*,OGRGeometry*, mapObj*, maps* , maps*);
  int gdalinfo( maps*,maps*, char*);

  /************************************************************************/
  /*                                main()                                */
  /************************************************************************/

#ifdef WIN32
__declspec(dllexport)
#endif
  int mmListVectorDir(maps*& conf,maps*& inputs,maps*& outputs)
  {
    const char  *pszWHERE = NULL;
    const char  *pszDataDir = NULL;
    char        *pszDataSource = NULL;
    char        **papszLayers = NULL;
    OGRGeometry *poSpatialFilter = NULL;
    int         nRepeatCount = 1, bAllLayers = FALSE;
    char  *pszSQLStatement = NULL;
    const char  *pszDialect = NULL;
    
    /* -------------------------------------------------------------------- */
    /*      Register format(s).                                             */
    /* -------------------------------------------------------------------- */
    OGRRegisterAll();
    
    bSummaryOnly = TRUE;
    bVerbose = FALSE;
    map *tmp=getMapFromMaps(inputs,"dataDir","value");
    if(tmp!=NULL)
      pszDataDir = strdup(tmp->value);
    else{
      setMapInMaps(conf,"lenv","message","Data Dir not found");
      return SERVICE_FAILED;
    }
    DIR *dirp = opendir(pszDataDir);
    if(dirp==NULL){
      char tmp1[1024];
      sprintf(tmp1,_ss("The specified path %s doesn't exist !!!"),pszDataDir);
      setMapInMaps(conf,"lenv","message",tmp1);
      return SERVICE_FAILED;
    }
    char *res=NULL;
    struct dirent *dp;
    while ((dp = readdir(dirp)) != NULL){
      
      if(strlen(dp->d_name)>2 && strstr(dp->d_name,".")!=0){
	/* -------------------------------------------------------------------- */
	/*      Open data source.                                               */
	/* -------------------------------------------------------------------- */
	
	pszDataSource=(char*) malloc((strlen(dp->d_name)+strlen(pszDataDir)+1)*sizeof(char));
	sprintf(pszDataSource,"%s%s",pszDataDir,dp->d_name);
#if GDAL_VERSION_MAJOR >= 2
      GDALDataset *poDS =
	(GDALDataset*) GDALOpenEx( pszDataSource,
				   GDAL_OF_READONLY | GDAL_OF_VECTOR,
				   NULL, NULL, NULL );
      GDALDriverManager* poR=GetGDALDriverManager();
      GDALDriver          *poDriver = NULL;
#else
      OGRDataSource* poDS = OGRSFDriverRegistrar::Open( pszDataSource, !bReadOnly, &poDriver );
      if( poDS == NULL && !bReadOnly ){
	poDS = OGRSFDriverRegistrar::Open( pszDataSource, FALSE, &poDriver );
      }
	OGRSFDriver         *poDriver = NULL;
#endif

	if( poDS != NULL ){
	  if(res!=NULL){
	    char* tmp4=strdup(dp->d_name);
	    tmp4[strlen(dp->d_name)-4]=0;
	    if(strstr(res,tmp4)==0){
	      char* tmp3=strdup(res);
	      res=(char*)realloc(res,(strlen(res)+strlen(dp->d_name)+strlen(pszDataSource)+5)*sizeof(char));
	      sprintf(res,"%s,\"%s\"",tmp3,pszDataSource);
	      free(tmp3);
	    }
	  }
	  else{
	    res=(char*)malloc((strlen(dp->d_name)+strlen(pszDataSource)+4)*sizeof(char));
	    sprintf(res,"[\"%s\"",pszDataSource);
	  }
#if GDAL_VERSION_MAJOR < 2
	  OGRDataSource::DestroyDataSource( poDS );
#endif
	}
	
	free(pszDataSource);
      }
    }
    char *tmp3=strdup(res);
    res=(char*)realloc(res,(strlen(res)+2)*sizeof(char));
    sprintf(res,"%s]",tmp3);
    free(tmp3);
    
    setMapInMaps(outputs,"Result","value",res);
    free(res);
    return SERVICE_SUCCEEDED;
  }

#ifdef WIN32
__declspec(dllexport)
#endif
  int mmExtractVectorInfo(maps*& conf,maps*& inputs,maps*& outputs)
  {
    char type[8];
    char  *pszDataSource = NULL;
    int isPg=-1;
    int isWxs=-1;
    int isJson=-1;
    int isRaster=-1;

    map *tmpP=getMapFromMaps(conf,"main","dataPath");
    map *tmp=getMapFromMaps(inputs,"dataSource","value");
    if(tmp!=NULL){
      char *tmpDataSource=strdup(tmp->value);
      char *pszDataDir;
      char *pszDataDirMY;
      pszDataDir=(char*)malloc((strlen(tmpDataSource)+strlen(tmpP->value)+14)*sizeof(char));
      sprintf(pszDataDir,"%s/PostGIS/%s.xml",tmpP->value,tmpDataSource);
      sprintf(type,"PostGIS");
      int dirp = open( pszDataDir , O_RDONLY );
      if(dirp<0){
	//free(pszDataDir);
	sprintf(pszDataDir,"%s/MySQL/%s.xml",tmpP->value,tmpDataSource);
	sprintf(type,"MySQL");
	dirp = open( pszDataDir , O_RDONLY );
      }
      char *res=NULL;
      struct dirent *dp;
      if(dirp>=0){
	close(dirp);
	fprintf(stderr,"XML FOUND \n");
	xsltStylesheetPtr cur = NULL;
	xmlDocPtr doc, res;
	char *xslFileName;
	fprintf(stderr,"XML FOUND %s \n",tmpP->value);
	xslFileName=(char*)malloc((strlen(tmpP->value)+18)*sizeof(char));
	sprintf(xslFileName,"%s/%s/conn.xsl",tmpP->value,type);
	cur = xsltParseStylesheetFile(BAD_CAST xslFileName);
	doc = xmlParseFile(pszDataDir);
	res = xsltApplyStylesheet(cur, doc, NULL);
	xmlChar *xmlbuff;
	int buffersize;
	xsltSaveResultToString(&xmlbuff, &buffersize, res, cur);
	pszDataSource = strdup((char*)xmlbuff);
	fprintf(stderr,"%s\n",pszDataSource);
	free(xmlbuff);
	isPg=1;
      }
      else{
	if(strncasecmp(tmpDataSource,"WFS",3)==0){
	  fprintf(stderr,"\n\n** %s **\n\n",tmpDataSource);
	  char* pszDataDir=(char*)malloc((strlen(tmpP->value)+strlen(strstr(tmp->value,":")+1)+17)*sizeof(char));
	  sprintf(pszDataDir,"%s/WFS/%s.txt",tmpP->value,strstr(tmp->value,":")+1);  
	  setMapInMaps(inputs,"wxsMap","value",strstr(tmp->value,":")+1);

	  int dirp = open( pszDataDir , O_RDONLY );
	  int nn;
	  fprintf(stderr,"DATADIR %s %i \n",pszDataDir,dirp);
	  struct stat results;
	  if (stat(pszDataDir, &results) == 0){
	    char *xbuff=(char*)malloc(results.st_size+1);
	    char *xbuff1=(char*)malloc(results.st_size+5);
	    while ( ( nn=read(dirp, xbuff, results.st_size)) >  0)
	      {
		xbuff[nn-1]='\0';
		sprintf(xbuff1,"WFS:%s",xbuff);
		xbuff[nn]='\0';
		pszDataSource = strdup(xbuff1);
		map* tmpMap=getMapFromMaps(inputs,"dataSource","value");
		free(tmpMap->value);
		tmpMap->value=strdup(pszDataSource);
		fprintf(stderr, "DS: (%s)\n", pszDataSource);
		isWxs=1;
	      }
	  }else{
	    fprintf(stderr,"Unable to load %s DataStore.",type);
	  }

	  //setMapInMaps(conf,"lenv","message","WFS not yet supported");
	  //return SERVICE_FAILED;
	}else{
	  char *tmpPath=(char*)malloc((strlen(tmpP->value)+7)*sizeof(char));
	  sprintf(tmpPath,"%s/dirs/",tmpP->value);
	  DIR *tmpD=opendir(tmpPath);
	  if(tmpD==NULL){
	    char tmp[1024];
	    snprintf(tmp,1024,_ss("Unable to open directory %s."),tmpP->value);
	    setMapInMaps(conf,"lenv","message",tmp);
	    return SERVICE_FAILED;
	  }
	  if(tmpD!=NULL)
	    while ((dp = readdir(tmpD)) != NULL){
	      fprintf(stderr,":> %s,%s\n",dp->d_name,tmpDataSource);
	      if(strstr(dp->d_name,tmpDataSource)!=NULL){
		pszDataSource=(char *)malloc((strlen(tmpP->value)+strlen(dp->d_name)+8)*sizeof(char));
#ifndef WIN32
		sprintf(pszDataSource,"%s/dirs/%s/",tmpP->value,dp->d_name);
#else
		sprintf(pszDataSource,"%s/dirs/%s",tmpP->value,dp->d_name);
#endif
		
	      }
	    }
	  else{
	    setMapInMaps(conf,"lenv","message","Unable to load Data Source");
	    return SERVICE_FAILED;
	  }
	}
	if(pszDataSource==NULL)
	  pszDataSource = strdup(tmp->value);
      }

    }
    else{
      setMapInMaps(conf,"lenv","message","Data Source not found");
      return SERVICE_FAILED;
    }
    fprintf(stderr,"MAP : %s\n",pszDataSource);

    char* iniPszDataSource=strdup(pszDataSource);
    /* -------------------------------------------------------------------- */
    /*      Load Mapfile                                                    */
    /* -------------------------------------------------------------------- */
    map* mapfilePath=getMapFromMaps(inputs,"dataSource","value");
    
    char* mapPath;
    if(isPg<0 && isWxs<0){
      mapPath=(char*)malloc((strlen(mapfilePath->value)+12)*sizeof(char));
      sprintf(mapPath,"%s/ds_ows.map",mapfilePath->value);
    }
    else{
      if(isWxs<0){
	map* tmpMap1=getMapFromMaps(conf,"main","dataPath");
	mapPath=(char*)malloc((strlen(tmpMap1->value)+strlen(type)+strlen(mapfilePath->value)+13)*sizeof(char));
	sprintf(mapPath,"%s/%s/%sds_ows.map",tmpMap1->value,type,mapfilePath->value);
      }else{
	map* tmpMap1=getMapFromMaps(conf,"main","dataPath");
	map* tmpMap2=getMapFromMaps(inputs,"wxsMap","value");
	
	mapPath=(char*)malloc((strlen(tmpMap1->value)+strlen(tmpMap2->value)+16)*sizeof(char));
	sprintf(mapPath,"%s/WFS/%sds_ows.map",tmpMap1->value,tmpMap2->value);
      }
	
    }
    setMapInMaps(conf,"main","mapfile",mapPath);

    fprintf(stderr,"Load Mapfile %s %d\n",mapPath,__LINE__);
    mapObj* myMap=msLoadMap(mapPath,NULL);
    if(myMap==NULL){
      mapfilePath->value[strlen(mapfilePath->value)-strlen(strrchr(mapfilePath->value,'/'))]=0;
      sprintf(mapPath,"%s/ds_ows.map",mapfilePath->value);
      fprintf(stderr,"Load Mapfile %s %d\n",mapPath,__LINE__);
      myMap=msLoadMap(mapPath,NULL);
      if(myMap==NULL){
	fprintf(stderr,"Unable to load mapfile %d !!\n\n",__LINE__);
      }
    }
    dumpMaps(inputs);
    fprintf(stderr,"Load Mapfile %s %d\n",mapPath,__LINE__);
    map* layerName=getMapFromMaps(inputs,"layer","value");
    fprintf(stderr,"Load Mapfile %s %d\n",mapPath,__LINE__);
    layerObj* myLayer=NULL;
    if(layerName!=NULL){
      fprintf(stderr,"Load Mapfile %s %d\n",mapPath,__LINE__);
      if(myMap!=NULL){
	fprintf(stderr,"Load Layer %s %d\n",layerName->value,myMap->numlayers);
	layerObj* myLayer=myMap->layers[msGetLayerIndex(myMap,layerName->value)];
	fprintf(stderr,"Load Layer %s %d\n",layerName->value,myLayer->type);
	//fprintf(stderr,"LAYER TYPE %d\n",myLayer->type);
        
	if(myLayer->type!=3 || myLayer->tileindex!=NULL){
	  fprintf(stderr,"LAYER CONNECTION %s\n",myLayer->connection);
	  if(isPg<0 && isWxs<0){
	    free(mapPath);
	    mapPath=(char*)malloc((strlen(iniPszDataSource)+13)*sizeof(char));
	    sprintf(mapPath,"%s/ds_ows.map",iniPszDataSource);
	    setMapInMaps(conf,"main","mapfile",mapPath);
	    free(pszDataSource);
	    if(myLayer->connection!=NULL)
	      pszDataSource=strdup(myLayer->connection);
	    else
	      if(myLayer->tileindex!=NULL)
		pszDataSource=strdup(myLayer->tileindex);
	  }

	if(myLayer->connection!=NULL && strstr(myLayer->connection,".json")!=NULL)
	  isJson=1;
	}
	else{
	  fprintf(stderr,"Should treat raster from here !!\n");
	  gdalinfo(conf,outputs,myLayer->data);
	  isRaster=1;
	}
      }
    }
    fprintf(stderr,"Load Mapfile %s %d\n",mapPath,__LINE__);

    if(isRaster<0){
    const char *pszWHERE = NULL;
    char        **papszLayers = NULL;
    OGRGeometry *poSpatialFilter = NULL;
    int         nRepeatCount = 1, bAllLayers = FALSE;
    char  *pszSQLStatement = NULL;
    const char  *pszDialect = NULL;
    
    /* -------------------------------------------------------------------- */
    /*      Register format(s).                                             */
    /* -------------------------------------------------------------------- */
    OGRRegisterAll();
    //msLookupHashTable(&(layer->metadata),defaultkey)
    
    xmlDocPtr resDoc = xmlNewDoc(BAD_CAST "1.0");
    xmlNodePtr n;
    
    bSummaryOnly = TRUE;
    bVerbose = FALSE;
    map *tmp1=getMapFromMaps(inputs,"layer","value");
    map *tmp2=getMapFromMaps(inputs,"getFeatures","value");
    if(isJson<0 || tmp2!=NULL){
      if(tmp1!=NULL){
	if(tmp2!=NULL && isJson>0)
	  papszLayers = CSLAddString( papszLayers, "OGRGeoJSON" );
	else
	  papszLayers = CSLAddString( papszLayers, tmp1->value );
      }
      else{
	char *tmp4=strrchr(tmp->value,'/');
	if(tmp4!=NULL && strlen(tmp4) > 1){
	  char *tmp2=strrchr(tmp->value,'/')+1;
	  tmp2[strlen(tmp2)-strlen(strstr(tmp2,"."))]=0;
	  char *tmp3=strdup(tmp2);
	  papszLayers = CSLAddString( papszLayers, tmp3 );
	  fprintf(stderr,tmp3);
	  free(tmp3);
	}
      }
    }
    
    tmp1=getMapFromMaps(inputs,"getFeatures","value");
    if(tmp1!=NULL){
      dataSource = FALSE;
      tmp1=getMapFromMaps(inputs,"page","value");
      if(tmp1!=NULL)
	mmPage=atoi(tmp1->value);
      tmp1=getMapFromMaps(inputs,"limit","value");
      if(tmp1!=NULL)
	mmLimit=atoi(tmp1->value);      
      
      char*   mmField=NULL;
      char*   mmOrder=NULL;
      tmp1=getMapFromMaps(inputs,"sortname","value");
      if(tmp1!=NULL)
	mmField=strdup(tmp1->value);
      tmp1=getMapFromMaps(inputs,"sortorder","value");
      if(tmp1!=NULL)
	mmOrder=strdup(tmp1->value);
      if(mmField!=NULL && mmOrder!=NULL){
	pszSQLStatement=(char*) malloc((strlen(mmField)+strlen(mmOrder)+128)*sizeof(char)+1);
	if(isPg<0)
	  sprintf(pszSQLStatement,"SELECT * FROM \"%s\" ORDER BY %s %s",papszLayers[0],mmField,mmOrder);
	else{
	  // Make it case sensitive !!
	  sprintf(pszSQLStatement,"SELECT * FROM %s ORDER BY %s %s",papszLayers[0],mmField,mmOrder);
	}
	
	//sprintf(pszSQLStatement,"SELECT * FROM \"%s\" ORDER BY %s %s",papszLayers[0],mmField,mmOrder);
	fprintf(stderr,"SQL (%s)\n",pszSQLStatement);
	free(mmField);
	free(mmOrder);
      }
    }
    
    if(dataSource){
      n = xmlNewNode(NULL, BAD_CAST "datasource");
    }
    else
      n = xmlNewNode(NULL, BAD_CAST "FeatureCollection");
    
    /* -------------------------------------------------------------------- */
    /*      Open data source.                                               */
    /* -------------------------------------------------------------------- */
#if GDAL_VERSION_MAJOR >= 2
    GDALDataset *poDS =
      (GDALDataset*) GDALOpenEx( pszDataSource,
				 GDAL_OF_READONLY | GDAL_OF_VECTOR,
				 NULL, NULL, NULL );
    GDALDriverManager* poR=GetGDALDriverManager();
    GDALDriver          *poDriver = NULL;
#else
    OGRDataSource       *poDS = NULL;
    OGRSFDriver         *poDriver = NULL;
    OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
    poDS = OGRSFDriverRegistrar::Open( pszDataSource, !bReadOnly, &poDriver );
    if( poDS == NULL && !bReadOnly )
      {
	poDS = OGRSFDriverRegistrar::Open( pszDataSource, FALSE, &poDriver );
      }
#endif    
    /* -------------------------------------------------------------------- */
    /*      Report failure                                                  */
    /* -------------------------------------------------------------------- */
    if( poDS == NULL )
      {
	char tmp2[2048];
	sprintf(tmp2,
		_ss("FAILURE:\n"
		    "Unable to open datasource `%s' with the following drivers:\n"),
		pszDataSource );
	
	for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
	  {
	    char *tmp3=strdup(tmp2);
#if GDAL_VERSION_MAJOR >=2
	    sprintf( tmp2,  "%s  -> `%s'\n", tmp3, poR->GetDriver(iDriver)->GetDescription() );
#else
	    sprintf( tmp2,  "%s  -> `%s'\n", tmp3, poR->GetDriver(iDriver)->GetName() );
#endif
	    free(tmp3);
	  }
	setMapInMaps(conf,"lenv","message",tmp2);
	return SERVICE_FAILED;
      }
    
    xmlNodePtr n1;
    if(dataSource){
      n1=xmlNewNode(NULL,BAD_CAST "dataType");
      poDriver=poDS->GetDriver();
#if GDAL_VERSION_MAJOR >=2
      xmlAddChild(n1,xmlNewText(BAD_CAST poDriver->GetDescription()));
#else
      xmlAddChild(n1,xmlNewText(BAD_CAST poDriver->GetName()));
#endif
      xmlAddChild(n,n1);
      
      //if(strcasecmp(tmp->GetName(),"ESRI Shapefile")==0){
      //OGRLayer *_poResultSet = poDS->ExecuteSQL( tmpSQL, poSpatialFilter, pszDialect );
      //}
    }
    
    
    /* -------------------------------------------------------------------- */
    /*      Special case for -sql clause.  No source layers required.       */
    /* -------------------------------------------------------------------- */
    map* tmpSql=getMapFromMaps(inputs,"sql","value");
    if(tmpSql!=NULL)
      pszSQLStatement=strdup(tmpSql->value);
    
    if( pszSQLStatement != NULL )
      {
	OGRLayer *poResultSet = NULL;
	
	nRepeatCount = 0;  // skip layer reporting.
	
	poResultSet = poDS->ExecuteSQL( pszSQLStatement, poSpatialFilter, 
					pszDialect );
	
	if( poResultSet != NULL )
	  {
	    if( pszWHERE != NULL )
	      poResultSet->SetAttributeFilter( pszWHERE );
	    ReportOnLayer( myMap, inputs, pszDataSource, poResultSet, NULL, NULL, n, conf );
	    poDS->ReleaseResultSet( poResultSet );
	  }
	free(pszSQLStatement);
      }
    
    
    for( int iRepeat = 0; iRepeat < nRepeatCount; iRepeat++ )
      {
	if ( CSLCount(papszLayers) == 0 )
	  {
	    /* -------------------------------------------------------------------- */ 
	    /*      Process each data source layer.                                 */ 
	    /* -------------------------------------------------------------------- */ 
	    for( int iLayer = 0; iLayer < poDS->GetLayerCount(); iLayer++ )
	      {
		OGRLayer        *poLayer = poDS->GetLayer(iLayer);
		
		if( poLayer == NULL )
		  {
		    char tmp[128];
		    sprintf( tmp,
			     _ss("FAILURE: Couldn't fetch advertised layer %d!\n"),
			     iLayer );
		    setMapInMaps(conf,"lenv","message",_ss(tmp));
		    return SERVICE_FAILED;
		  }
		
		if (!bAllLayers)
		  {
		    ReportOnLayer( myMap, inputs, pszDataSource, poLayer, pszWHERE, poSpatialFilter, n, conf );
		  }
		else
		  {
		    if( iRepeat != 0 )
		      poLayer->ResetReading();
		    
		    ReportOnLayer( myMap, inputs, pszDataSource, poLayer, pszWHERE, poSpatialFilter, n, conf );
		  }
	      }
	  }
	else
	  {
	    /* -------------------------------------------------------------------- */ 
	    /*      Process specified data source layers.                           */ 
	    /* -------------------------------------------------------------------- */ 
	    char** papszIter = papszLayers;
	    for( ; *papszIter != NULL; papszIter++ )
	      {
		OGRLayer        *poLayer = poDS->GetLayerByName(*papszIter);
		
		if( poLayer == NULL )
		  {
		    char tmp[128];
		    sprintf( tmp,
			     _ss("FAILURE: Couldn't fetch requested layer %s!\n"),
			     *papszIter );
		    setMapInMaps(conf,"lenv","message",tmp);
		    return SERVICE_FAILED;
		  }
		
		if( iRepeat != 0 )
		  poLayer->ResetReading();
		
		ReportOnLayer(myMap, inputs, pszDataSource,  poLayer, pszWHERE, poSpatialFilter, n, conf );
	      }
	  }
      }
    
    /* -------------------------------------------------------------------- */
    /*      Close down.                                                     */
    /* -------------------------------------------------------------------- */
    CSLDestroy( papszLayers );
    CSLDestroy( papszOptions );
#if GDAL_VERSION_MAJOR <2
    OGRDataSource::DestroyDataSource( poDS );
#endif
    if (poSpatialFilter)
      OGRGeometryFactory::destroyGeometry( poSpatialFilter );
    
    OGRCleanupAll();
    
    xmlChar *xmlb;
    int bsize;
    xmlDocSetRootElement(resDoc, n);
    xmlDocDumpFormatMemory(resDoc, &xmlb, &bsize, 1);
    setMapInMaps(outputs,"Result","value",(char*)xmlb);
	}
    
  

    msSaveMap(myMap,mapPath);
    msFreeMap(myMap);

    return SERVICE_SUCCEEDED;
  }


  /************************************************************************/
  /*                          mmVectorInfo2Map()                          */
  /************************************************************************/

#ifdef WIN32
__declspec(dllexport)
#endif
  int mmVectorInfo2Map(maps*& conf,maps*& inputs,maps*& outputs)
  {
    const char *pszWHERE = NULL;
    char  *pszDataSource = NULL;
    char        **papszLayers = NULL;
    OGRGeometry *poSpatialFilter = NULL;
    int         nRepeatCount = 1, bAllLayers = FALSE;
    char  *pszSQLStatement = NULL;
    const char  *pszDialect = NULL;
    int isPg=-1;
    int isWxs=-1;
    char type[8];
    
    /* -------------------------------------------------------------------- */
    /*      Register format(s).                                             */
    /* -------------------------------------------------------------------- */
    OGRRegisterAll();
    
    xmlDocPtr resDoc = xmlNewDoc(BAD_CAST "1.0");
    xmlNodePtr n;


    map* mapfilePath=getMapFromMaps(inputs,"dataSource","value");
    char* mapPath=(char*)malloc((strlen(mapfilePath->value)+11)*sizeof(char));
    sprintf(mapPath,"%sds_ows.map",mapfilePath->value);
    fprintf(stderr,"Save Mapfile %s\n",mapPath);

    /*
     * Create an empty map, set name, default size and extent
     */
    mapObj *myMap=msNewMapObj();
    free(myMap->name);
    myMap->name=strdup("ZOO-Project_WXS_Server");
    msMapSetSize(myMap,2048,2048);
    msMapSetExtent(myMap,-1,-1,1,1);
    /*
     * Set imagepath and imageurl using tmpPath and tmpUrl from main.cfg
     */
    map *tmp2=getMapFromMaps(conf,"main","tmpPath");
    myMap->web.imagepath=strdup(tmp2->value);
    tmp2=getMapFromMaps(conf,"main","tmpUrl");
    myMap->web.imageurl=strdup(tmp2->value);

    /*
     * Set mapserver PROJ_LIB or any other config parameter from main.cfg
     * [mapserver] section
     */
    maps *tmp3=getMaps(conf,"mapserver");
    if(tmp3!=NULL){
      map* tmp4=tmp3->content;
      while(tmp4!=NULL){
	msSetConfigOption(myMap,tmp4->name,tmp4->value);
	tmp4=tmp4->next;
      }
    }
  
    /*
     * Define supported output formats
     */
    outputFormatObj *o1=msCreateDefaultOutputFormat(NULL,"AGG/PNG","png");
    o1->imagemode=MS_IMAGEMODE_RGBA;
    o1->transparent=MS_TRUE;
    o1->inmapfile=MS_TRUE;
    msAppendOutputFormat(myMap,msCloneOutputFormat(o1));
    msFreeOutputFormat(o1);

#ifdef USE_KML
    outputFormatObj *o2=msCreateDefaultOutputFormat(NULL,"KML","kml");
    o2->inmapfile=MS_TRUE;  
    msAppendOutputFormat(myMap,msCloneOutputFormat(o2));
    msFreeOutputFormat(o2);
#endif

    outputFormatObj *o3=msCreateDefaultOutputFormat(NULL,"GDAL/GTiff","tiff");
    if(!o3)
      fprintf(stderr,"Unable to initialize GDAL driver !\n");
    else{
      o3->imagemode=MS_IMAGEMODE_BYTE;
      o3->inmapfile=MS_TRUE;  
      msAppendOutputFormat(myMap,msCloneOutputFormat(o3));
      msFreeOutputFormat(o3);
    }

    outputFormatObj *o4=msCreateDefaultOutputFormat(NULL,"GDAL/AAIGRID","grd");
    if(!o4)
      fprintf(stderr,"Unable to initialize GDAL driver !\n");
    else{
      o4->imagemode=MS_IMAGEMODE_INT16;
      o4->inmapfile=MS_TRUE;  
      msAppendOutputFormat(myMap,msCloneOutputFormat(o4));
      msFreeOutputFormat(o4);
    }

#ifdef USE_CAIRO
    outputFormatObj *o5=msCreateDefaultOutputFormat(NULL,"CAIRO/PNG","cairopng");
    if(!o5)
      fprintf(stderr,"Unable to initialize CAIRO driver !\n");
    else{
      o5->imagemode=MS_IMAGEMODE_RGBA;
      o5->transparent=MS_TRUE;
      o5->inmapfile=MS_TRUE;
      msAppendOutputFormat(myMap,msCloneOutputFormat(o5));
      msFreeOutputFormat(o5);
    }
#endif

    /*
     * Set default projection to EPSG:4326
     */
    msLoadProjectionStringEPSG(&myMap->projection,"EPSG:4326");
    myMap->transparent=1;

    /**
     * Set metadata extracted from main.cfg file maps
     */
    maps* cursor=conf;
    map* correspondance=getCorrespondance();
    while(cursor!=NULL){
      map* _cursor=cursor->content;
      map* vMap;
      while(_cursor!=NULL){
	if((vMap=getMap(correspondance,_cursor->name))!=NULL){
	  if (msInsertHashTable(&(myMap->web.metadata), vMap->value, _cursor->value) == NULL){
#ifdef DEBUGMS
	    fprintf(stderr,"Unable to add metadata");
#endif
	    return SERVICE_FAILED;
	  }
	}
	_cursor=_cursor->next;
      }
      cursor=cursor->next;
    }

    /**
     * Set a ows_rootlayer_title,  
     */
    if (msInsertHashTable(&(myMap->web.metadata), "ows_rootlayer_name", "ZOO_Project_Layer") == NULL){
#ifdef DEBUGMS
      fprintf(stderr,"Unable to add metadata");
#endif
      return SERVICE_FAILED;
    }
    if (msInsertHashTable(&(myMap->web.metadata), "ows_rootlayer_title", "ZOO_Project_Layer") == NULL){
#ifdef DEBUGMS
      fprintf(stderr,"Unable to add metadata");
#endif
      return SERVICE_FAILED;
    }

    /**
     * Enable all the WXS requests using ows_enable_request
     * see http://mapserver.org/trunk/development/rfc/ms-rfc-67.html
     */
    if (msInsertHashTable(&(myMap->web.metadata), "ows_enable_request", "*") == NULL){
#ifdef DEBUGMS
      fprintf(stderr,"Unable to add metadata");
#endif
      return SERVICE_FAILED;
    }
    msInsertHashTable(&(myMap->web.metadata), "ows_srs", "EPSG:4326");

    /**
     * Set Mapfile SYMBOLSET
     */
    map* _tmp1=getMapFromMaps(conf,"main","dataPath");
    char *tmpPath=(char*)malloc((13+strlen(_tmp1->value))*sizeof(char));
    sprintf(tmpPath,"%s/symbols.sym",_tmp1->value);
    msInitSymbolSet(&myMap->symbolset);
    myMap->symbolset.filename=strdup(tmpPath);
    free(tmpPath);

    /**
     * Set Mapfile FONTSET
     */
    char *tmpPath1=(char*)malloc((16+strlen(_tmp1->value))*sizeof(char));
    sprintf(tmpPath1,"%s/fonts/list.txt",_tmp1->value);
    msInitFontSet(&myMap->fontset);
    myMap->fontset.filename=strdup(tmpPath1);
    free(tmpPath1);

        
    bSummaryOnly = TRUE;
    bVerbose = FALSE;
    map *tmpP=getMapFromMaps(conf,"main","dataPath");
    map *tmp=getMapFromMaps(inputs,"dataSource","value");
    if(tmp!=NULL) {
      if(strncasecmp(tmp->value,"WMS",3)!=0 && strncasecmp(tmp->value,"WFS",3)!=0){
	char *tmpDataSource=strdup(tmp->value);
	char *pszDataDir;
	char *pszDataDirMY;
	pszDataDir=(char*)malloc((strlen(tmpDataSource)+strlen(tmpP->value)+14)*sizeof(char));
	sprintf(pszDataDir,"%s/PostGIS/%s.xml",tmpP->value,tmpDataSource);
	sprintf(type,"PostGIS");
	int dirp = open( pszDataDir , O_RDONLY );
	if(dirp<0){
	  //free(pszDataDir);
	  sprintf(pszDataDir,"%s/MySQL/%s.xml",tmpP->value,tmpDataSource);
	  sprintf(type,"MySQL");
	  dirp = open( pszDataDir , O_RDONLY );
	}
	fprintf(stderr,"\n\n\nDEBUG %s\n",pszDataDir);
	char *res=NULL;
	struct dirent *dp;
	if(dirp>=0){
	  close(dirp);
	  fprintf(stderr,"XML FOUND \n");
	  xsltStylesheetPtr cur = NULL;
	  xmlDocPtr doc, res;
	  char *xslFileName;
	  fprintf(stderr,"XML FOUND %s \n",tmpP->value);
	  xslFileName=(char*)malloc((strlen(tmpP->value)+18)*sizeof(char));
	  sprintf(xslFileName,"%s/%s/conn.xsl",tmpP->value,type);
	  fprintf(stderr,"%s \n",xslFileName);
	  cur = xsltParseStylesheetFile(BAD_CAST xslFileName);
	  fprintf(stderr,"%s \n",xslFileName);
	  doc = xmlParseFile(pszDataDir);
	  fprintf(stderr,"%s \n",xslFileName);
	  res = xsltApplyStylesheet(cur, doc, NULL);
	  fprintf(stderr,"%s \n",xslFileName);
	  xmlChar *xmlbuff;
	  int buffersize;
	  xsltSaveResultToString(&xmlbuff, &buffersize, res, cur);
	  pszDataSource = strdup((char*)xmlbuff);
	  fprintf(stderr,"%s\n",pszDataSource);
	  free(xmlbuff);
	  isPg=1;
	}
	else{
	  char *tmpPath=(char*)malloc((strlen(tmpP->value)+7)*sizeof(char));
	  sprintf(tmpPath,"%s/dirs/",tmpP->value);
	  DIR *tmpD=opendir(tmpPath);
	  if(tmpD==NULL){
	    char tmp[1024];
	    snprintf(tmp,1024,_ss("Unable to open directory %s."),tmpP->value);
	    setMapInMaps(conf,"lenv","message",tmp);
	    return SERVICE_FAILED;
	  }
	  while ((dp = readdir(tmpD)) != NULL){
	    fprintf(stderr,":> %s,%s (%s)\n",dp->d_name,tmpDataSource,strstr(tmpDataSource,dp->d_name));
	    if(strstr(tmpDataSource,dp->d_name)!=NULL){
	      pszDataSource=(char *)malloc((strlen(tmpP->value)+strlen(dp->d_name)+8)*sizeof(char));
#ifndef WIN32
	      sprintf(pszDataSource,"%s/dirs/%s/",tmpP->value,dp->d_name);
#else
	      sprintf(pszDataSource,"%s/dirs/%s",tmpP->value,dp->d_name);
#endif
	      {
		FILE* test0=fopen(pszDataSource,"r");
		if(test0!=NULL)
		  pszDataSource=strdup(tmpDataSource);
	      }
	      fprintf(stderr,"DATA SOURCE : %s\n",tmpDataSource);
	    }
	  }
	  if(pszDataSource==NULL){
	    pszDataSource = strdup(tmp->value);
	  }
	}	
      }else{
	if(strncmp(tmp->value,"WFS",3)==0){
	  sprintf(type,"WFS");
	  isWxs=1;
	}
	if(strncmp(tmp->value,"WMS",3)==0){
	  sprintf(type,"WMS");
	  isWxs=1;
	}
	
	if(isWxs>0){
	  // WFS
	  fprintf(stderr,"TYPE %s \n",type);
	  char* pszDataDir=(char*)malloc((strlen(type)+strlen(tmpP->value)+strlen(strstr(tmp->value,":")+1)+14)*sizeof(char));
	  sprintf(pszDataDir,"%s/%s/%s.txt",tmpP->value,type,strstr(tmp->value,":")+1);	  
	  int dirp = open( pszDataDir , O_RDONLY );
	  int nn;
	  fprintf(stderr,"DATADIR %s %i \n",pszDataDir,dirp);
	  struct stat results;
	  if (stat(pszDataDir, &results) == 0){
	    char *xbuff=(char*)malloc(results.st_size+1);
	    char *xbuff1=(char*)malloc(results.st_size+5);
	    while ( ( nn=read(dirp, xbuff, results.st_size)) >  0)
	      {
		xbuff[nn-1]='\0';
		sprintf(xbuff1,"%s:%s",type,xbuff);
		xbuff[nn]='\0';
		pszDataSource = strdup(xbuff1);
		map* tmpMap=getMapFromMaps(inputs,"dataSource","value");
		free(tmpMap->value);
		tmpMap->value=strdup(pszDataSource);
		fprintf(stderr, "DS: (%s)\n", pszDataSource);
	      }
	  }else{
	    fprintf(stderr,"Unable to load %s DataStore.",type);
	  }
	}
      }
    }
    else{
      setMapInMaps(conf,"lenv","message","Data Source not found");
      return SERVICE_FAILED;
    }
    fprintf(stderr,"MAP : %s\n",pszDataSource);
    map *tmp1=getMapFromMaps(inputs,"layer","value");
    if(tmp1!=NULL)
      papszLayers = CSLAddString( papszLayers, tmp1->value );
    else{
      if(strncmp(tmp->value,"WFS",3)!=0 && strncmp(tmp->value,"WMS",3)!=0){
	fprintf(stderr,"%s\n",tmp->value);
	char *tmp4=strrchr(tmp->value,'/');
	fprintf(stderr,"tmp4 %s\n",tmp4);
	if(tmp4!=NULL && strlen(tmp4) > 1){
	  char *tmp2=strrchr(tmp->value,'/')+1;
	  if(strstr(tmp2,".")!=NULL){
	    tmp2[strlen(tmp2)-strlen(strstr(tmp2,"."))]=0;
	    char *tmp3=strdup(tmp2);
	    papszLayers = CSLAddString( papszLayers, tmp3 );
	    fprintf(stderr,"TMP3 %s\n",tmp3);
	    free(tmp3);
	  }
	}
      }
    }
    fprintf(stderr,"DATASOURCE : %s\n",pszDataSource);

    tmp1=getMapFromMaps(inputs,"getFeatures","value");
    if(tmp1!=NULL){
      dataSource = FALSE;
      tmp1=getMapFromMaps(inputs,"page","value");
      if(tmp1!=NULL)
	mmPage=atoi(tmp1->value);
      tmp1=getMapFromMaps(inputs,"limit","value");
      if(tmp1!=NULL)
	mmLimit=atoi(tmp1->value);      

      char*   mmField=NULL;
      char*   mmOrder=NULL;
      tmp1=getMapFromMaps(inputs,"sortname","value");
      if(tmp1!=NULL)
	mmField=strdup(tmp1->value);
      tmp1=getMapFromMaps(inputs,"sortorder","value");
      if(tmp1!=NULL)
	mmOrder=strdup(tmp1->value);
      if(mmField!=NULL && mmOrder!=NULL){
	pszSQLStatement=(char*) malloc((strlen(mmField)+strlen(mmOrder)+128)*sizeof(char)+1);
	//char tmpLayer=strstr(papszLayers[0],".")+1;

	if(isPg<0)
	  sprintf(pszSQLStatement,"SELECT * FROM \"%s\" ORDER BY %s %s",papszLayers[0],mmField,mmOrder);
	else{
	  // Make it case sensitive !!
	  sprintf(pszSQLStatement,"SELECT * FROM %s ORDER BY %s %s",papszLayers[0],mmField,mmOrder);
	}
	//sprintf(pszSQLStatement,"SELECT * FROM \"%s\" ORDER BY %s %s",papszLayers[0],mmField,mmOrder);
	fprintf(stderr,"SQL (%s)\n",pszSQLStatement);
	free(mmField);
	free(mmOrder);
      }
    }else{
      papszLayers=NULL;
    }
    if(dataSource)
      n = xmlNewNode(NULL, BAD_CAST "datasource");
    else
      n = xmlNewNode(NULL, BAD_CAST "FeatureCollection");

    /* -------------------------------------------------------------------- */
    /*      Open data source.                                               */
    /* -------------------------------------------------------------------- */
#if GDAL_VERSION_MAJOR >= 2
      GDALDataset *poDS =
	(GDALDataset*) GDALOpenEx( pszDataSource,
				   GDAL_OF_VECTOR,
				   NULL, NULL, NULL );
      GDALDriverManager* poR=GetGDALDriverManager();
      GDALDriver          *poDriver = NULL;
#else
    OGRDataSource       *poDS = NULL;
    OGRSFDriver         *poDriver = NULL;
    OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
    poDS = OGRSFDriverRegistrar::Open( pszDataSource, !bReadOnly, &poDriver );
    if( poDS == NULL && !bReadOnly )
      {
        poDS = OGRSFDriverRegistrar::Open( pszDataSource, FALSE, &poDriver );
      }
#endif

    /* -------------------------------------------------------------------- */
    /*      Report failure                                                  */
    /* -------------------------------------------------------------------- */
    if( poDS == NULL )
      {
	fprintf(stderr,"ERROR OCCURS %s\n",pszDataSource);
	char tmp[1024];
        sprintf( tmp, "FAILURE:\n"
		 "Unable to open datasource `%s' with the following drivers.\n",
		 pszDataSource );

        for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
        {
#if GDAL_VERSION_MAJOR >= 2
	    fprintf( stderr, "  -> %s\n", poR->GetDriver(iDriver)->GetDescription() );
	    sprintf( tmp+strlen(tmp), "  -> %s\n", poR->GetDriver(iDriver)->GetDescription() );
#else
	    fprintf( stderr, "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
	    sprintf( tmp+strlen(tmp), "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
#endif
        }
	
	setMapInMaps(conf,"lenv","message",tmp);
	goto TRYGDAL;
      }

    if(dataSource){
      xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "dataType");
#if GDAL_VERSION_MAJOR >= 2
      GDALDriver*
#else
      OGRSFDriver*
#endif
	tmp=poDS->GetDriver();
#if GDAL_VERSION_MAJOR >= 2
      xmlAddChild(n1,xmlNewText(BAD_CAST tmp->GetDescription()));
      fprintf(stderr,"Driver Name: %s\n",BAD_CAST tmp->GetDescription());      
#else
      xmlAddChild(n1,xmlNewText(BAD_CAST tmp->GetName()));
      fprintf(stderr,"Driver Name: %s\n",BAD_CAST tmp->GetName());
#endif
      xmlAddChild(n,n1);
    }

    /* -------------------------------------------------------------------- */
    /*      Special case for -sql clause.  No source layers required.       */
    /* -------------------------------------------------------------------- */
    if( pszSQLStatement != NULL )
      {
        OGRLayer *poResultSet = NULL;

        nRepeatCount = 0;  // skip layer reporting.

        poResultSet = poDS->ExecuteSQL( pszSQLStatement, poSpatialFilter, 
                                        pszDialect );

        if( poResultSet != NULL )
	  {
            if( pszWHERE != NULL )
	      poResultSet->SetAttributeFilter( pszWHERE );

            //ReportOnLayer( inputs, pszDataSource, poResultSet, NULL, NULL, n, conf );
            poDS->ReleaseResultSet( poResultSet );
	  }
	free(pszSQLStatement);
      }


    for( int iRepeat = 0; iRepeat < nRepeatCount; iRepeat++ )
      {
        if ( CSLCount(papszLayers) == 0 )
	  {
	    /* -------------------------------------------------------------------- */ 
	    /*      Process each data source layer.                                 */ 
	    /* -------------------------------------------------------------------- */ 
            for( int iLayer = 0; iLayer < poDS->GetLayerCount(); iLayer++ )
	      {
                OGRLayer        *poLayer = poDS->GetLayer(iLayer);
		char tmp[128];
		sprintf( tmp,
			 _ss("Fetch layer %d!\n"),
			 iLayer );
		fprintf(stderr,"MSG: %s",tmp);

                if( poLayer == NULL )
		  {
		    char tmp[128];
                    sprintf( tmp,
			     _ss("FAILURE: Couldn't fetch advertised layer %d!\n"),
			     iLayer );
		    setMapInMaps(conf,"lenv","message",_ss(tmp));
                    return SERVICE_FAILED;
		  }

                if (!bAllLayers)
		  {
                    if( iRepeat != 0 )
		      poLayer->ResetReading();
		    fprintf(stderr,"MSG: %s",tmp);
		    /*
#if GDAL_VERSION_MAJOR >= 2
		    if(strcasecmp(poDriver->GetDescription(),"ESRI Shapefile")==0)
#else
		    if(strcasecmp(poDriver->GetName(),"ESRI Shapefile")==0)
#endif
		      {
			fprintf(stderr,"MSG: %s",tmp);
			char tmpSQL[1024];
			sprintf(tmpSQL,"CREATE SPATIAL INDEX ON %s",poLayer->GetName());
			poDS->ExecuteSQL( tmpSQL, poSpatialFilter, 
					  pszDialect );
					  }*/

		fprintf(stderr,"MSG: %s",tmp);
                    ReportOnLayer4Map( pszDataSource, poLayer, pszWHERE, poSpatialFilter, myMap, conf , NULL);
		fprintf(stderr,"MSG: %s",tmp);

		    xmlNodePtr n0=xmlNewNode(NULL,BAD_CAST "layer");
		    xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "name");
		    xmlAddChild(n1,xmlNewText(BAD_CAST poLayer->GetLayerDefn()->GetName()));	      
		    xmlAddChild(n0,n1);
		    xmlAddChild(n,n0);
		    n1=xmlNewNode(NULL,BAD_CAST "geometry");
		    xmlAddChild(n1,xmlNewText(BAD_CAST 
					      OGRGeometryTypeToName(
								    poLayer->GetLayerDefn()->GetGeomType()
								    )
					      ));
		    xmlAddChild(n0,n1);
		  }
                else
		  {
                    if( iRepeat != 0 )
		      poLayer->ResetReading();

                    //ReportOnLayer( inputs, pszDataSource, poLayer, pszWHERE, poSpatialFilter, n, conf );
		  }
	      }
	  }
        else
	  {
	    /* -------------------------------------------------------------------- */ 
	    /*      Process specified data source layers.                           */ 
	    /* -------------------------------------------------------------------- */ 
            char** papszIter = papszLayers;
            for( ; *papszIter != NULL; papszIter++ )
	      {
                OGRLayer        *poLayer = poDS->GetLayerByName(*papszIter);

                if( poLayer == NULL )
		  {
		    char tmp[128];
                    sprintf( tmp,
			     _ss("FAILURE: Couldn't fetch requested layer %s!\n"),
			     *papszIter );
		    setMapInMaps(conf,"lenv","message",tmp);
		    return SERVICE_FAILED;
		  }

                if( iRepeat != 0 )
		  poLayer->ResetReading();

                //ReportOnLayer( inputs, pszDataSource, poLayer, pszWHERE, poSpatialFilter, n, conf );
	      }
	  }
      }

    /* -------------------------------------------------------------------- */
    /*      Close down.                                                     */
    /* -------------------------------------------------------------------- */
    CSLDestroy( papszLayers );
    CSLDestroy( papszOptions );
#if GDAL_VERSION_MAJOR < 2
    OGRDataSource::DestroyDataSource( poDS );
#endif
    if (poSpatialFilter)
      OGRGeometryFactory::destroyGeometry( poSpatialFilter );

    if(isWxs>0){
      int nlayer=myMap->numlayers;
      fprintf(stderr,"Layer num %d\n",nlayer);
      int i=0;
      for(i=0;i<nlayer;i++){
	layerObj *l=GET_LAYER(myMap,i);
	char* tmp=strdup(strstr(pszDataSource,":")+1);
	//msConnectLayer(l,MS_WFS,tmp);
	fprintf(stderr,"Layer name %s\n",l->name);
	msInsertHashTable(&(l->metadata), "wfs_typename", l->name);
	msInsertHashTable(&(l->metadata), "wfs_version", "1.0.0");
	free(tmp);
      }
      goto CONCLUDE;
    }

  TRYGDAL:{
      
      if(isPg>0){
	goto CONCLUDE;
      }

      /**
       * Raster data
       */
      mapfilePath=getMapFromMaps(inputs,"dataSource","value");
      fprintf(stderr,"%s  \n",mapfilePath->value);
      DIR *dirp = opendir(mapfilePath->value);
      int res=0;
      if(dirp==NULL){
	if(isWxs>0){
	  maps* tmp=(maps*)malloc(MAPS_SIZE);
	  tmp->name=strdup("RasterDS");
	  tmp->content=createMap("storage",pszDataSource);
	  tmp->next=NULL;
	  dumpMaps(tmp);
	  if(res!=1){
	    char **papszMetadata;
	    char **papszMetadataInit;
	    GDALDatasetH hDataset;
	    int i,j=0;
	    //res=tryGdal(conf,tmp,myMap);
	    GDALAllRegister();
	    hDataset = GDALOpen( pszDataSource, GA_ReadOnly );
	    res=1;
	    papszMetadata = GDALGetMetadata( hDataset, "SUBDATASETS" );
	    if( CSLCount(papszMetadata) > 0 ){
	      for( i = 1; i<CSLCount(papszMetadata) && papszMetadata[i] != NULL; i+=2 ){

		if(strstr(papszMetadata[i-1],"_NAME")!=NULL)
		  fprintf( stderr,"URL  %s\n", papszMetadata[i-1] );
		if(strstr(papszMetadata[i],"_DESC")!=NULL)
		  fprintf( stderr,"DESC  %s\n", papszMetadata[i] );
		
		if(msGrowMapLayers(myMap)==NULL){
		  return -1;
		}
		if(initLayer((myMap->layers[myMap->numlayers]), myMap) == -1){
		  return -1;
		}

		char *tName=(char*)malloc(15*sizeof(char));
		sprintf(tName,"WMSLayer_%d",j);

		layerObj* myLayer=myMap->layers[myMap->numlayers];		
		myLayer->name = strdup(tName);
		myLayer->tileitem=NULL;
		myLayer->data = NULL;
		myLayer->index = myMap->numlayers;
		myLayer->dump = MS_TRUE;
		myLayer->status = MS_ON;
		myLayer->type = MS_LAYER_RASTER;
		myLayer->connection = strdup(strstr(papszMetadata[i-1],"WMS:")+4);
		msConnectLayer(myLayer,MS_WMS,myLayer->connection);
		
		char *dname=strdup(strstr(papszMetadata[i],"=")+1);
		msInsertHashTable(&(myLayer->metadata), "ows_label", dname);
		msInsertHashTable(&(myLayer->metadata), "ows_title", dname);
		msInsertHashTable(&(myLayer->metadata), "ows_abstract", dname);
		msInsertHashTable(&(myMap->web.metadata), "ows_srs", "EPSG:4326 EPSG:900913");
		msInsertHashTable(&(myLayer->metadata), "ows_srs", "EPSG:4326 EPSG:900913");

		myMap->layerorder[myMap->numlayers] = myMap->numlayers;
		myMap->numlayers++;
		j++;
		free(tName);

		xmlNodePtr n2=xmlNewNode(NULL,BAD_CAST "layer");
		xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "name");
		xmlAddChild(n1,xmlNewText(BAD_CAST myLayer->name));
		xmlNodePtr n3=xmlNewNode(NULL,BAD_CAST "label");
		xmlAddChild(n3,xmlNewText(BAD_CAST dname));
		xmlNodePtr n4=xmlNewNode(NULL,BAD_CAST "preview_link");
		xmlAddChild(n4,xmlNewText(BAD_CAST myLayer->connection));
		xmlAddChild(n2,n1);
		n1=xmlNewNode(NULL,BAD_CAST "geometry");
		xmlAddChild(n1,xmlNewText(BAD_CAST "raster"));
		xmlAddChild(n2,n1);
		xmlAddChild(n2,n3);
		xmlAddChild(n2,n4);
		xmlAddChild(n,n2);
		fprintf(stderr,"RASTER FOUND %s\n",tmp->name);
	      }
	    }
	  }

	}
	else{
	  if(getMaps(inputs,"force")==NULL){
	    setMapInMaps(conf,"lenv","message",_("The specified path doesn't exist."));
	    return 4;//errorException(m, ,"InvalidParameterValue");
	  }
	}
      }else{
	struct dirent *dp;
	while ((dp = readdir(dirp)) != NULL){
	  if(strcmp(dp->d_name,"..")!=0 && strcmp(dp->d_name,".")!=0){
	    fprintf(stderr,"%s : %s \n",mapfilePath->value,dp->d_name);
	    fflush(stderr);
	    char* fname=(char*)malloc((2+strlen(dp->d_name)+strlen(mapfilePath->value))*sizeof(char));
#ifndef WIN32
	    sprintf(fname,"%s/%s",mapfilePath->value,dp->d_name);
#else
		sprintf(fname,"%s%s",mapfilePath->value,dp->d_name);
#endif
	    char* rname=strdup(dp->d_name);
	    maps* tmp=(maps*)malloc(MAPS_SIZE);
	    tmp->name=strdup(dp->d_name);
	    char* sext=strstr(rname,".");
	    tmp->name[strlen(rname)-strlen(sext)]=0;
	    tmp->content=createMap("storage",fname);
	    tmp->next=NULL;
	    // Make sure the file is not vector
	    int res=0;
	    int hasValue=0;
	    {
	      fprintf(stderr,"OK %s %s %d \n\n",dp->d_name,strstr(dp->d_name,"."),strcasecmp(strstr(dp->d_name,"."),".DBF"));
	    if(strstr(dp->d_name,".")!=NULL && 
	       (strcasecmp(strstr(dp->d_name,"."),".SHP")!=0 &&
		strcasecmp(strstr(dp->d_name,"."),".DBF")!=0 &&
		strcasecmp(strstr(dp->d_name,"."),".SHX")!=0 &&
		strcasecmp(strstr(dp->d_name,"."),".QIX")!=0 &&
		strcasecmp(strstr(dp->d_name,"."),".PRJ")!=0)){
	      //res=tryOgr(conf,tmp,myMap);
#if GDAL_VERSION_MAJOR >= 2
	      poDS =
		(GDALDataset*) GDALOpenEx( fname,
					   GDAL_OF_VECTOR,
					   NULL, NULL, NULL );
#else
	      poDS = OGRSFDriverRegistrar::Open( fname, !bReadOnly, &poDriver );
	      if( poDS == NULL && !bReadOnly ){
		poDS = OGRSFDriverRegistrar::Open( fname, FALSE, &poDriver );
	      }
#endif
	      if( poDS != NULL){
		fprintf(stderr,"Successfully tried to open OGR DataSource %s => %d\n",tmp->content->value,res);
		
		
		for( int iRepeat = 0; iRepeat < nRepeatCount; iRepeat++ )
		  {
		    if ( CSLCount(papszLayers) == 0 )
		      {
			/* -------------------------------------------------------------------- */ 
			/*      Process each data source layer.                                 */ 
			/* -------------------------------------------------------------------- */ 
			for( int iLayer = 0; iLayer < poDS->GetLayerCount(); iLayer++ )
			  {
			    OGRLayer        *poLayer = poDS->GetLayer(iLayer);
			    
			    if( poLayer == NULL )
			      {
				char tmp[128];
				sprintf( tmp,
					 _ss("FAILURE: Couldn't fetch advertised layer %d!\n"),
					 iLayer );
				setMapInMaps(conf,"lenv","message",_ss(tmp));
				return SERVICE_FAILED;
			      }
			    
			    if (!bAllLayers)
			      {
				if( iRepeat != 0 )
				  poLayer->ResetReading();
				
				ReportOnLayer4Map( tmp->content->value, poLayer, pszWHERE, poSpatialFilter, myMap, conf, tmp );
				
				xmlNodePtr n0=xmlNewNode(NULL,BAD_CAST "layer");
				xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "name");
				if(strcasecmp(poLayer->GetLayerDefn()->GetName(),"OGRGeoJSON")!=0)
				  xmlAddChild(n1,xmlNewText(BAD_CAST poLayer->GetLayerDefn()->GetName()));
				else
				  xmlAddChild(n1,xmlNewText(BAD_CAST tmp->name));	    
				
				xmlAddChild(n0,n1);
				xmlAddChild(n,n0);
				n1=xmlNewNode(NULL,BAD_CAST "geometry");
				xmlAddChild(n1,xmlNewText(BAD_CAST 
							  OGRGeometryTypeToName(
										poLayer->GetLayerDefn()->GetGeomType()
										)
							  ));
				xmlAddChild(n0,n1);
			      }
			    else
			      {
				if( iRepeat != 0 )
				  poLayer->ResetReading();
				
				//ReportOnLayer( inputs, pszDataSource, poLayer, pszWHERE, poSpatialFilter, n, conf );
			      }
			  }
		      }
		    else
		      {
			/* -------------------------------------------------------------------- */ 
			/*      Process specified data source layers.                           */ 
			/* -------------------------------------------------------------------- */ 
			char** papszIter = papszLayers;
			for( ; *papszIter != NULL; papszIter++ )
			  {
			    OGRLayer        *poLayer = poDS->GetLayerByName(*papszIter);
			    
			    if( poLayer == NULL )
			      {
				char tmp[128];
				sprintf( tmp,
					 _ss("FAILURE: Couldn't fetch requested layer %s!\n"),
					 *papszIter );
				setMapInMaps(conf,"lenv","message",tmp);
				return SERVICE_FAILED;
			      }
			    
			    if( iRepeat != 0 )
			      poLayer->ResetReading();
			    
			    //ReportOnLayer( inputs, pszDataSource, poLayer, pszWHERE, poSpatialFilter, n, conf );
			  }
		      }
		  }

		/* -------------------------------------------------------------------- */
		/*      Close down.                                                     */
		/* -------------------------------------------------------------------- */
		CSLDestroy( papszLayers );
		CSLDestroy( papszOptions );
#if GDAL_VERSION_MAJOR < 2
		OGRDataSource::DestroyDataSource( poDS );
#endif		
		hasValue=1;
	      }
	      else{
		fprintf(stderr,"Before Gdal %d \n",res);
		//dumpMaps(conf);
		map *storage=getMap(tmp->content,"storage");
		fprintf(stderr,"Before Gdal %d \n",res);
		addToMap(tmp->content,"title",dp->d_name);
		addToMap(tmp->content,"abstract",dp->d_name);
		if(hasValue!=1 && res!=1 && (storage!=NULL && strcasecmp(dp->d_name,"ds_ows.map")!=0 && strstr(dp->d_name,".aux.xml")==NULL)){
		  res=tryGdal(conf,tmp,myMap);
		}
		fprintf(stderr,"After Gdal %d \n",res);
	      }
	    }
	    }
	  
	  if(res==1){
	    xmlNodePtr n2=xmlNewNode(NULL,BAD_CAST "layer");
	    xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "name");
	    xmlAddChild(n1,xmlNewText(BAD_CAST tmp->name));
	    xmlAddChild(n2,n1);
	    n1=xmlNewNode(NULL,BAD_CAST "geometry");
	    xmlAddChild(n1,xmlNewText(BAD_CAST "raster"));
	    xmlAddChild(n2,n1);
	    xmlAddChild(n,n2);
	    fprintf(stderr,"RASTER FOUND %s\n",tmp->name);
	  }
	  freeMaps(&tmp);
	  free(tmp);
	  }
	}
      }
    }

  CONCLUDE:

    OGRCleanupAll();
    xmlChar *xmlb;
    int bsize;

    xmlDocSetRootElement(resDoc, n);
    map* encoding=getMapFromMaps(inputs,"encoding","value");
    if(encoding!=NULL){
      xmlDocDumpFormatMemoryEnc(resDoc, &xmlb, &bsize, encoding->value, 1);
    }
    else
      xmlDocDumpFormatMemory(resDoc, &xmlb, &bsize, 1);
    setMapInMaps(outputs,"Result","value",(char*)xmlb);


    fprintf(stderr,"MAPFILE TO SAVE !\n");    
    if(isPg>0 || isWxs>0){
      char *tmp1=strdup(mapPath);
      free(mapPath);
      map* tmpMap1=getMapFromMaps(conf,"main","dataPath");
      mapPath=(char*)malloc((strlen(tmpMap1->value)+strlen(mapPath)+strlen(type)+4+1)*sizeof(char));
      fprintf(stderr,"MAPFILE TO SAVE %s !\n",tmp1);    
      if(isWxs>0)
	sprintf(mapPath,"%s/%s/%s",tmpMap1->value,type,strstr(tmp1,":")+1);
      else
	sprintf(mapPath,"%s/%s/%s",tmpMap1->value,type,tmp1);
      fprintf(stderr,"MAPFILE TO SAVE %s\n",mapPath);
    }
    struct stat mstat;
    int s=stat(mapPath,&mstat);
    if(s<0){
      msSaveMap(myMap,mapPath);
      msFreeMap(myMap);
    }

    return SERVICE_SUCCEEDED;
  }


  /************************************************************************/
  /*                           ReportOnLayer()                            */
  /************************************************************************/

  void ReportOnLayer( mapObj* myMap, maps* inputs, char * pszDataSource, OGRLayer * poLayer, const char *pszWHERE, 
		      OGRGeometry *poSpatialFilter, xmlNodePtr n, maps* conf)

  {
    OGRFeatureDefn      *poDefn = poLayer->GetLayerDefn();

    /* -------------------------------------------------------------------- */
    /*      Report various overall information.                             */
    /* -------------------------------------------------------------------- */

    char* layerName=NULL;
    if(dataSource){
      xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "name");
      if(strcasecmp(poDefn->GetName(),"OGRGeoJSON")!=0){
	layerName=strdup(poDefn->GetName());
      }
      else{
	map* tmp=getMapFromMaps(inputs,"layer","value");
	layerName=strdup(tmp->value);
      }
      xmlAddChild(n1,xmlNewText(BAD_CAST layerName));
      xmlAddChild(n,n1);
      n1=xmlNewNode(NULL,BAD_CAST "geometry");
      xmlAddChild(n1,xmlNewText(BAD_CAST 
				OGRGeometryTypeToName( poDefn->GetGeomType() )
				));
      xmlAddChild(n,n1);


      int i=0;
      if(myMap!=NULL)
      for(i=0;i<myMap->numlayers;i++){
	//fprintf(stderr,"layer %s %s => %s\n",poLayer->GetName(),myMap->layers[i]->name,myMap->layers[i]->encoding);
	char* ows_encoding=myMap->layers[i]->encoding;//msLookupHashTable(&(myMap->layers[i]->metadata), "ows_encoding");
	//fprintf(stderr,"layer %s %s => %s\n",poLayer->GetName(),myMap->layers[i]->name,ows_encoding);
	if(strcmp(myMap->layers[i]->name,poLayer->GetName())==0 ||
	   strcmp(myMap->layers[i]->name,layerName)==0){
	  n1=xmlNewNode(NULL,BAD_CAST "encoding");
	  ows_encoding=myMap->layers[i]->encoding;
	  //ows_encoding=msLookupHashTable(&(myMap->layers[i]->metadata), "ows_encoding");
	  //fprintf(stderr,"layer %s => %s\n",myMap->layers[i]->name,ows_encoding);
	  if(ows_encoding!=NULL)
	    xmlAddChild(n1,xmlNewText(BAD_CAST ows_encoding));
	  else{
	    map* encoding=getMapFromMaps(conf,"main","encoding");
	    xmlAddChild(n1,xmlNewText(BAD_CAST encoding->value));
	  }
	  xmlAddChild(n,n1);
	  
	}
      }

      n1=xmlNewNode(NULL,BAD_CAST "featureCount");
      char tmp[128];
      sprintf(tmp,"%i",poLayer->GetFeatureCount());
      xmlAddChild(n1,xmlNewText(BAD_CAST tmp));
      xmlAddChild(n,n1);
      OGREnvelope oExt;
      xmlNodePtr n2;
      
      //fprintf(stderr,"\n*** %s ***\n",pszDataSource);

      char    *pszWKT;
      if( poLayer->GetSpatialRef() == NULL )
	pszWKT = CPLStrdup( "(unknown)" );
      else
	{
	  OGRSpatialReference* tmpSRS=poLayer->GetSpatialRef();
	  tmpSRS->AutoIdentifyEPSG();
	  const char* authNameSRS=tmpSRS->GetAuthorityName(NULL);
	  const char* authIdSRS=tmpSRS->GetAuthorityCode(NULL);
	  if(authNameSRS!=NULL && authIdSRS!=NULL){
	    pszWKT=(char*)malloc((strlen(authNameSRS)+strlen(authIdSRS)+2)*sizeof(char));
	    sprintf(pszWKT,"%s:%s",authNameSRS,authIdSRS);
	    OGREnvelope ogExt;
	    if (OGR_L_GetExtent(poLayer,&ogExt, TRUE) == OGRERR_NONE){

	      OGRSpatialReference oSourceSRS, oTargetSRS;
	      OGRCoordinateTransformation *poCT;
	      double  xmin, ymin,xmax, ymax;

	      oSourceSRS.importFromEPSG(atoi(authIdSRS));
	      oTargetSRS.importFromEPSG(4326);
	      poCT = OGRCreateCoordinateTransformation( &oSourceSRS,&oTargetSRS );

	      xmin = ogExt.MinX ;
	      ymin = ogExt.MinY;
	      if( poCT == NULL || !poCT->Transform( 1, &xmin, &ymin ) )
		fprintf(stderr, "Transformation failed x/y.\n" );
	      else{
		xmin = ogExt.MinY ;
		ymin = ogExt.MinX;
		if( poCT == NULL || !poCT->Transform( 1, &ymin, &xmin ) )
		  fprintf(stderr, "Transformation failed y/x.\n" );
		else
		  fprintf( stderr, "\n\n(%f,%f) -> (%f,%f)\n\n", 
			   ogExt.MinX,
			   ogExt.MinY,
			   xmin, ymin );
	      }
	      xmax = ogExt.MaxX ;
	      ymax = ogExt.MaxY;
	      if( poCT == NULL || !poCT->Transform( 1, &xmax, &ymax ) )
		fprintf(stderr, "Transformation failed x/y.\n" );
	      else{
		xmax = ogExt.MaxY ;
		ymax = ogExt.MaxX;
		if( poCT == NULL || !poCT->Transform( 1, &xmax, &ymax ) )
		  fprintf(stderr, "Transformation failed y/x.\n" );
		else
		  fprintf( stderr, "\n\n(%f,%f) -> (%f,%f)\n\n", 
			   ogExt.MaxX,
			   ogExt.MaxY,
			   xmax, ymax );
	      }
	      map* tmpMapPath=getMapFromMaps(conf,"main","mapserverAddress");
	      char* mapPath=(char*)malloc((strlen(tmpMapPath->value)+strlen(pszDataSource)+11)*sizeof(char));
	      sprintf(mapPath,"%sds_ows.map",pszDataSource);
	      
	      
	      fprintf(stderr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=1024&HEIGHT=1024&LAYERS=%s\n",tmpMapPath->value,mapPath,xmin,ymin,xmax,ymax,layerName);

	      int maxWidth=512;
	      int maxHeight=359;
	      double deltaX=xmax-xmin;
	      double deltaY=ymax-ymin;
	      double qWidth=maxWidth/deltaX; 
	      double qHeight=maxHeight/deltaY;
	      double qValue=qWidth;
	      double width=qValue*deltaX;
	      double height=(deltaY*qValue);
	      if(qWidth>qHeight){
		qValue=qHeight;
		width=qWidth*deltaX;;
		height=qValue*deltaY;
	      }
#ifdef DEBUGMS
	      fprintf(stderr,"deltaX : %.15f \ndeltaY : %.15f\n",deltaX,deltaY);
	      fprintf(stderr,"qWidth : %.15f \nqHeight : %.15f\n",qWidth,qHeight);
	      fprintf(stderr,"qWidth : %.15f \nqHeight : %.15f\n",width,height);
#endif
	      
	      char tmpStr[2048];
	      map* tmpMap=getMapFromMaps(conf,"main","mapfile");

	      /*if(pszWKT!=NULL && strncasecmp(pszWKT,"EPSG:4326",9)!=0)
		else
	      sprintf(tmpStr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=%f&HEIGHT=%f&LAYERS=%s\n",tmpMapPath->value,tmpMap->value,xmin,ymin,xmax,ymax,width,height,poDefn->GetName());
	      */
	      sprintf(tmpStr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=%f&HEIGHT=%f&LAYERS=%s\n",tmpMapPath->value,tmpMap->value,ymin,xmin,ymax,xmax,width,height,layerName);
	      fprintf(stderr,"SRS : %s\n",tmpStr);

	      n2=xmlNewNode(NULL,BAD_CAST "previewLink");
	      xmlAddChild(n2,xmlNewText(BAD_CAST tmpStr));
	      xmlAddChild(n,n2);

	    

	    }

	  }else{
	    tmpSRS->exportToPrettyWkt( &pszWKT );
	    OGREnvelope ogExt;
	    if (OGR_L_GetExtent(poLayer,&ogExt, TRUE) == OGRERR_NONE){
	      OGRSpatialReference oSourceSRS, oTargetSRS;
	      OGRCoordinateTransformation *poCT;
	      double  xmin, ymin,xmax, ymax;
	      OSRImportFromWkt( &oSourceSRS, &pszWKT );
	      oTargetSRS.importFromEPSG(4326);
	      poCT = OGRCreateCoordinateTransformation( &oSourceSRS,&oTargetSRS );
	      xmin = ogExt.MinX ;
	      ymin = ogExt.MinY;
	      if( poCT == NULL || !poCT->Transform( 1, &xmin, &ymin ) )
		fprintf(stderr, "Transformation failed.\n" );
	      else
		fprintf( stderr, "\n\n(%f,%f) -> (%f,%f)\n\n", 
			 ogExt.MinX,
			 ogExt.MinY,
			 xmin, ymin );
	      xmax = ogExt.MaxX ;
	      ymax = ogExt.MaxY;
	      if( poCT == NULL || !poCT->Transform( 1, &xmax, &ymax ) )
		fprintf(stderr, "Transformation failed.\n" );
	      else
		fprintf( stderr, "\n\n(%f,%f) -> (%f,%f)\n\n", 
			 ogExt.MaxX,
			 ogExt.MaxY,
			 xmax, ymax );
	  
	      char* mapPath=(char*)malloc((strlen(pszDataSource)+11)*sizeof(char));
	      sprintf(mapPath,"%sds_ows.map",pszDataSource);
	      

	      int maxWidth=512;
	      int maxHeight=359;
	      double deltaX=xmax-xmin;
	      double deltaY=ymax-ymin;
	      double qWidth=maxWidth/deltaX; 
	      double qHeight=maxHeight/deltaY;
	      double qValue=qWidth;
	      double width=qValue*deltaX;
	      double height=(deltaY*qValue);
	      if(qWidth<qHeight){
		qValue=qHeight;
		width=qValue*deltaX;;
		height=qValue*deltaY;
	      }
#ifdef DEBUGMS
	      fprintf(stderr,"deltaX : %.15f \ndeltaY : %.15f\n",deltaX,deltaY);
	      fprintf(stderr,"qWidth : %.15f \nqHeight : %.15f\n",qWidth,qHeight);
	      fprintf(stderr,"qWidth : %.15f \nqHeight : %.15f\n",width,height);
#endif
	      
	      char tmpStr[2048];
	      map* tmpMapPath=getMapFromMaps(conf,"main","mapserverAddress");
	      map* tmpMap=getMapFromMaps(conf,"main","mapfile");

	      /*if(pszWKT!=NULL && strncasecmp(pszWKT,"EPSG:4326",9)==0)*/
	      sprintf(tmpStr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=%f&HEIGHT=%f&LAYERS=%s\n",tmpMapPath->value,tmpMap->value,xmin,ymin,xmax,ymax,width,height,layerName);
	      /*else
	      sprintf(tmpStr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=%f&HEIGHT=%f&LAYERS=%s\n",tmpMapPath->value,tmpMap->value,ymin,xmin,ymax,xmax,width,height,poDefn->GetName());*/
		
	      n2=xmlNewNode(NULL,BAD_CAST "previewLink");
	      xmlAddChild(n2,xmlNewText(BAD_CAST tmpStr));
	      xmlAddChild(n,n2);

	    }

	  }
	  
	}
      fprintf(stderr,"pszWKT %s\n",pszWKT);	  
      n1=xmlNewNode(NULL,BAD_CAST "srs");
      xmlAddChild(n1,xmlNewText(BAD_CAST pszWKT));
      xmlAddChild(n,n1);
      fprintf(stderr,"pszWKT %s\n",pszWKT);	  


      if (poLayer->GetExtent(&oExt, TRUE) == OGRERR_NONE)
	{
	  char tmp[128];
	  if(pszWKT!=NULL && strncasecmp(pszWKT,"EPSG:4326",9)!=0)
	    sprintf(tmp,"%f, %f,%f, %f", 
		    oExt.MinY, oExt.MinX, oExt.MaxY, oExt.MaxX);
	  else
	    sprintf(tmp,"%f, %f,%f, %f", 
		    oExt.MinX, oExt.MinY, oExt.MaxX, oExt.MaxY);
	  n1=xmlNewNode(NULL,BAD_CAST "extent");
	  xmlAddChild(n1,xmlNewText(BAD_CAST tmp));
	  xmlAddChild(n,n1);

	  char tmpStr[2048];
	  map* tmpMapPath=getMapFromMaps(conf,"main","mapserverAddress");
	  char* mapPath=(char*)malloc((strlen(tmpMapPath->value)+strlen(pszDataSource)+11)*sizeof(char));
	  sprintf(mapPath,"%sds_ows.map",pszDataSource);

	  int maxWidth=512;
	  int maxHeight=359;
	  double deltaX=oExt.MaxX-oExt.MinX;
	  double deltaY=oExt.MaxY-oExt.MinY;
	  double qWidth=maxWidth/deltaX; 
	  double qHeight=maxHeight/deltaY;
	  double qValue=qWidth;
	  double width=qValue*deltaX;
	  double height=(deltaY*qValue);
	  if(qWidth<qHeight){
	    qValue=qHeight;
	    width=qValue*deltaX;;
	    height=qValue*deltaY;
	  }
	  
	  map* tmpMap=getMapFromMaps(conf,"main","mapfile");

	  /*if(pszWKT!=NULL && strncasecmp(pszWKT,"EPSG:4326",9)==0)
	  sprintf(tmpStr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=%f&HEIGHT=%f&LAYERS=%s\n",tmpMapPath->value,tmpMap->value,oExt.MinY,oExt.MinX,oExt.MaxY,oExt.MaxX,width,height,poDefn->GetName());
	  else*/
	    sprintf(tmpStr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=%f&HEIGHT=%f&LAYERS=%s\n",tmpMapPath->value,tmpMap->value,oExt.MinX,oExt.MinY,oExt.MaxX,oExt.MaxY,width,height,layerName);
	  fprintf(stderr,"previewLink *%s* %d\n",tmpStr,(pszWKT!=NULL && strncasecmp(pszWKT,"EPSG:4326",9)!=0));	  
	  n2=xmlNewNode(NULL,BAD_CAST "previewLink");
	  xmlAddChild(n2,xmlNewText(BAD_CAST tmpStr));
	  xmlAddChild(n,n2);
	}
      
      n1=xmlNewNode(NULL,BAD_CAST "fields");
      for( int iAttr = 0; iAttr < poDefn->GetFieldCount(); iAttr++ )
	{
	  
	  OGRFieldDefn    *poField = poDefn->GetFieldDefn( iAttr );
	  
	  xmlNodePtr n2=xmlNewNode(NULL,BAD_CAST "field");
	  
	  xmlNodePtr n3=xmlNewNode(NULL,BAD_CAST "id");
	  xmlAddChild(n3,xmlNewText(BAD_CAST poField->GetNameRef()));
	  xmlAddChild(n2,n3);
	  
	  n3=xmlNewNode(NULL,BAD_CAST "type");
	  char tmp[128];
	  sprintf( tmp, "%s (%d.%d)",
		   poField->GetFieldTypeName( poField->GetType() ),
		   poField->GetWidth(),
		   poField->GetPrecision() );
	  xmlAddChild(n3,xmlNewText(BAD_CAST tmp));
	  xmlAddChild(n2,n3);
	  
	  xmlAddChild(n1,n2);
	  
	}
      xmlAddChild(n,n1);
    }
    else{
      const char* pszDisplayFields =
	CSLFetchNameValue(papszOptions, "DISPLAY_FIELDS");
      OGRFeature  *poFeature = NULL;
      int nbFeature=0;


      /*int i=0;
	char* ows_encoding=myMap->layers[i]->encoding;//msLookupHashTable(&(myMap->layers[i]->metadata), "ows_encoding");*/
      map* encoding=getMapFromMaps(inputs,"encoding","value");
      /*if(encoding!=NULL){
	for(i=0;i<myMap->numlayers;i++){
	  fprintf(stderr,"layer %s => %s\n",myMap->layers[i]->name,ows_encoding);
	  if(strcmp(myMap->layers[i]->name,poLayer->GetName())==0){
	    myMap->layers[i]->encoding=strdup(encoding->value);
	    //msInsertHashTable(&(myMap->layers[i]->metadata),"ows_encoding",encoding->value);
	    ows_encoding=myMap->layers[i]->encoding;//msLookupHashTable(&(myMap->layers[i]->metadata), "ows_encoding");*/
      if(myMap!=NULL){
	int i=0;
	char* ows_encoding=myMap->layers[i]->encoding;//msLookupHashTable(&(myMap->layers[i]->metadata), "ows_encoding");
	if(encoding!=NULL){
	  for(i=0;i<myMap->numlayers;i++){
	    fprintf(stderr,"layer %s => %s\n",myMap->layers[i]->name,ows_encoding);
	    if(strcmp(myMap->layers[i]->name,poLayer->GetName())==0){
	      myMap->layers[i]->encoding=strdup(encoding->value);
	      //msInsertHashTable(&(myMap->layers[i]->metadata),"ows_encoding",encoding->value);
	      ows_encoding=myMap->layers[i]->encoding;//msLookupHashTable(&(myMap->layers[i]->metadata), "ows_encoding");
	      fprintf(stderr,"layer %s => %s\n",myMap->layers[i]->name,ows_encoding);
	    }
	  }
	}
      }


      while((poFeature = poLayer->GetNextFeature()) != NULL ){
	if( nbFeature >= ( ( mmPage * mmLimit ) - mmLimit ) && 
	    nbFeature < ( mmPage * mmLimit ) ){
	  xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "featureMember");
	  for( int iField = 0; iField < OGR_F_GetFieldCount(poFeature); iField++ )
	    {
	      OGRFieldDefn    *poFDefn = poDefn->GetFieldDefn(iField);
	      xmlNodePtr n2=xmlNewNode(NULL,BAD_CAST poFDefn->GetNameRef());
	      if( OGR_F_IsFieldSet( poFeature, iField ) ){
		const char* cf=OGR_F_GetFieldAsString( poFeature, iField );
		if(encoding==NULL)
		  encoding=getMapFromMaps(conf,"main","encoding");
		if(encoding!=NULL && strncasecmp(encoding->value,"undefined",9)!=0){
		  char* tmp=msGetEncodedString(cf,encoding->value);
		  xmlAddChild(n2,xmlNewText(BAD_CAST tmp));
		}
		else
		  xmlAddChild(n2,xmlNewText(BAD_CAST cf));
	      }
	      else
		xmlAddChild(n2,xmlNewText(BAD_CAST "(null)" ));
	      xmlAddChild(n1,n2);
	    }
	  xmlAddChild(n,n1);
	}
	else{
	  if( nbFeature < ( ( mmPage * mmLimit ) - mmLimit ) )
	    ;
	  else
	    break;
	}
	nbFeature++;
      }
    }
  }

  /************************************************************************/
  /*                         ReportOnLayer4Map()                          */
  /************************************************************************/

  void ReportOnLayer4Map( char* pszDataSource,
			  OGRLayer * poLayer, const char *pszWHERE, 
			  OGRGeometry *poSpatialFilter, mapObj* m, maps* conf,
			  maps* lay)

  {
    OGRFeatureDefn      *poDefn = poLayer->GetLayerDefn();

    /* -------------------------------------------------------------------- */
    /*      Report various overall information.                             */
    /* -------------------------------------------------------------------- */

    if(dataSource){

      /**
       * Add a new layer set name, data
       */
      if(msGrowMapLayers(m)==NULL){
	fprintf(stderr,"Unable to add layer");
	return;
      }
      if(initLayer((m->layers[m->numlayers]), m) == -1){
	fprintf(stderr,"Unable to init layer");
	return;
      }
      
      layerObj* myLayer=m->layers[m->numlayers];
      //dumpMaps(output);
      if(strcasecmp(poDefn->GetName(),"OGRGeoJSON")!=0)
	myLayer->name = strdup(poDefn->GetName());
      else
	myLayer->name = strdup(lay->name);
      fprintf(stderr,"LAYER NAME: %s\n",myLayer->name);
      if(strncasecmp(myLayer->name,"tile_",4)==0){
	myLayer->tileindex = (char*)malloc((strlen(pszDataSource)+strlen(myLayer->name)+5+1)*sizeof(char));
	sprintf(myLayer->tileindex,"%s/%s.shp",pszDataSource,myLayer->name);
	myLayer->tileitem=strdup("Location");
	myLayer->type = MS_LAYER_RASTER;
	msLayerAddProcessing(myLayer,"RESAMPLE=AVERAGE");
      }else{
	myLayer->tileitem=NULL;
	
	myLayer->data = strdup(poDefn->GetName());
	myLayer->index = m->numlayers;
	myLayer->dump = MS_TRUE;
	myLayer->status = MS_ON;
	if(strncasecmp(pszDataSource,"WFS",3)==0){
	  char  *tmp=strdup(strstr(pszDataSource,":")+1);
	  myLayer->connection = strdup(tmp);
	  msConnectLayer(myLayer,MS_WFS,tmp);
	  fprintf(stderr,"WFS %s\n",tmp);
	  free(tmp);
	}
	else{
	  myLayer->connection = strdup(pszDataSource);
	  msConnectLayer(myLayer,MS_OGR,pszDataSource);
	}
	if(strncasecmp(pszDataSource,"PG:",3)==0 ||
	   strncasecmp(pszDataSource,"MYSQL:",6)==0 ||
	   strncasecmp(pszDataSource,"OCI:",4)==0 )
	  msLayerAddProcessing(myLayer,"CLOSE_CONNECTION=DEFER");

	/**
	 * Detect the Geometry Type or use Polygon
	 */
	if(OGR_L_GetGeomType(poLayer) != wkbUnknown){
	  switch(OGR_L_GetGeomType(poLayer)){
	  case wkbPoint:
	  case wkbMultiPoint:
	  case wkbPoint25D:
	  case wkbMultiPoint25D:
#ifdef DEBUGMS
	    fprintf(stderr,"%s %s POINT DataSource Layer \n",pszDataSource,myLayer->data);
#endif
	    myLayer->type = MS_LAYER_POINT;
	    break;
	  case wkbLineString :
	  case wkbMultiLineString :
	  case wkbLineString25D:
	  case wkbMultiLineString25D:
#ifdef DEBUGMS
	    fprintf(stderr,"%s %s LINE DataSource Layer \n",pszDataSource,myLayer->data);
#endif
	    myLayer->type = MS_LAYER_LINE;
	    break;
	  case wkbPolygon:
	  case wkbMultiPolygon:
	  case wkbPolygon25D:
	  case wkbMultiPolygon25D:
#ifdef DEBUGMS
	    fprintf(stderr,"%s %s POLYGON DataSource Layer \n",pszDataSource,myLayer->data);
#endif
	    myLayer->type = MS_LAYER_POLYGON;
	    break;
	  default:
	    myLayer->type = MS_LAYER_POLYGON;
	    break;
	  }
	}else
	  myLayer->type = MS_LAYER_POLYGON;
      }

      /**
       * Detect spatial reference or use WGS84
       **/
      OGRSpatialReferenceH srs=OGR_L_GetSpatialRef(poLayer);
      if(srs!=NULL){
	char *wkt=NULL;
	OSRExportToWkt(srs,&wkt);
	setSrsInformations(NULL,m,myLayer,wkt);
	//msLoadProjectionString(&(myLayer->projection),wkt);
	OGREnvelope ogExt;
	if (OGR_L_GetExtent(poLayer,&ogExt, TRUE) == OGRERR_NONE){
	  OGRSpatialReference oSourceSRS, oTargetSRS;
	  OGRCoordinateTransformation *poCT;
	  double  xmin, ymin,xmax, ymax;
	  OSRImportFromProj4( &oSourceSRS, wkt );
	  oTargetSRS.importFromEPSG(4326);
	  poCT = OGRCreateCoordinateTransformation( &oSourceSRS,&oTargetSRS );
	  xmin = ogExt.MinX ;
	  ymin = ogExt.MinY;
	  if( poCT == NULL || !poCT->Transform( 1, &xmin, &ymin ) )
	    fprintf(stderr, "Transformation failed.\n" );
	  else{
	    xmin = ogExt.MinY;
	    ymin = ogExt.MinX;	    
	    if( poCT == NULL || !poCT->Transform( 1, &xmin, &ymin ) )
	      fprintf(stderr, "Transformation failed.\n" );
	    else
	      fprintf( stderr, "\n\n(%f,%f) -> (%f,%f)\n\n", 
		       ogExt.MinX,
		       ogExt.MinY,
		       xmin, ymin );
	  }
	  xmax = ogExt.MaxX ;
	  ymax = ogExt.MaxY;
	  if( poCT == NULL || !poCT->Transform( 1, &xmax, &ymax ) )
	    fprintf(stderr, "Transformation failed.\n" );
	  else{
	    xmax = ogExt.MaxY;
	    ymax = ogExt.MaxX;
	    if( poCT == NULL || !poCT->Transform( 1, &xmax, &ymax ) )
	      fprintf(stderr, "Transformation failed.\n" );
	    else	  
	      fprintf( stderr, "\n\n(%f,%f) -> (%f,%f)\n\n", 
		       ogExt.MaxX,
		       ogExt.MaxY,
		       xmax, ymax );
	  }
	  map* tmpMapPath=getMapFromMaps(conf,"main","mapserverAddress");
	  char* mapPath=(char*)malloc((strlen(tmpMapPath->value)+strlen(pszDataSource)+11)*sizeof(char));
	  sprintf(mapPath,"%sds_ows.map",pszDataSource);


	  //fprintf(stderr,"%s?map=%s&SERVICE=WMS&VERSION=1.0.0&REQUEST=GetMap&FORMAT=png&BBOX=%f,%f,%f,%f&SRS=EPSG:4326&WIDTH=1024&HEIGHT=1024&LAYERS=%s\n",tmpMapPath->value,mapPath,xmin,ymin,xmax,ymax,myLayer->data);
	}

      }
      else{

	msLoadProjectionStringEPSG(&m->projection,"EPSG:4326");
	msLoadProjectionStringEPSG(&myLayer->projection,"EPSG:4326");
	msInsertHashTable(&(m->web.metadata), "ows_srs", "EPSG:4326 EPSG:900913");
	msInsertHashTable(&(myLayer->metadata), "ows_srs", "EPSG:4326 EPSG:900913");
      }

      msInsertHashTable(&(m->web.metadata), "ows_srs", "EPSG:4326 EPSG:900913");
      msInsertHashTable(&(myLayer->metadata), "ows_srs", "EPSG:4326 EPSG:900913");

      OGREnvelope ogExt;
      if (OGR_L_GetExtent(poLayer,&ogExt, TRUE) == OGRERR_NONE){
	if(strncasecmp(pszDataSource,"WFS",3)==0){
	  fprintf(stderr,"WFS FOUND !!\n");
	  msLayerSetExtent(myLayer,ogExt.MinY,ogExt.MinX,ogExt.MaxY,ogExt.MaxX);
	}
	else
	  msLayerSetExtent(myLayer,ogExt.MinX, ogExt.MinY, ogExt.MaxX, ogExt.MaxY);
	
	//eErr = poDstFeature->GetGeometryRef()->transform( poCT );
	
      }
      
      
      if(strncasecmp(myLayer->name,"tile_",4)!=0){      
	/**
	 * Detect the FID column or use the first attribute field as FID
	 */
	//char *fid=NULL;
	
	/**
	 * Should be better to set gml_include_items list and gml_[attr]_type
	 */
	msInsertHashTable(&(myLayer->metadata), "gml_include_items", "all");
	msInsertHashTable(&(myLayer->metadata), "gml_types", "auto");
	const char *fid=OGR_L_GetFIDColumn(poLayer);
	fprintf(stderr,"FID COLUMN %s ! \n",fid);
	int hasFid=-1;
	if(strlen(fid)==0){
	  OGRFeatureDefnH def=OGR_L_GetLayerDefn(poLayer);
	  int fIndex=0;
	  for(fIndex=0;fIndex<OGR_FD_GetFieldCount(def);fIndex++){
	    OGRFieldDefnH fdef=OGR_FD_GetFieldDefn(def,fIndex);
	    if(hasFid<0)
	      fid=OGR_Fld_GetNameRef(fdef);
	    fprintf(stderr,"FID COLUMN %s ! \n",fid);
	    if(strcasestr(fid,"id")!=NULL){
	      hasFid=1;
	      break;
	    }
	    /*char tmpTypes[128];
	      sprintf(tmpTypes"gml_%s_types",);
	      msInsertHashTable(&(myLayer->metadata), tmpType, "auto");*/
	    //break;
	  }
	}
	msInsertHashTable(&(myLayer->metadata), "gml_featureid", fid);
	msInsertHashTable(&(myLayer->metadata), "ows_featureid", fid);
	msInsertHashTable(&(myLayer->metadata), "ows_name", myLayer->name);
	msInsertHashTable(&(myLayer->metadata), "ows_title", myLayer->name);
	
	
	classObj* myClass;
	if((myClass=msGrowLayerClasses(myLayer)) == NULL)
	  return;
	///myLayerclass;
	//classObj* myClass=myLayer->class;
	if(initClass(myClass) == -1)
	  return;
	//myClass->type = myLayer->type;
	if(msGrowClassStyles(myClass) == NULL)
	  return ;
	if(initStyle(myClass->styles[myClass->numstyles]) == -1)
	  return;
	
	/**
	 * Set style
	 */
	myClass->styles[myClass->numstyles]->color.red=125;
	myClass->styles[myClass->numstyles]->color.green=125;
	myClass->styles[myClass->numstyles]->color.blue=255;
	myClass->styles[myClass->numstyles]->outlinecolor.red=80;
	myClass->styles[myClass->numstyles]->outlinecolor.green=80;
	myClass->styles[myClass->numstyles]->outlinecolor.blue=80;
	
	/**
	 * Set specific style depending on type
	 */
	if(myLayer->type == MS_LAYER_POLYGON)
	  myClass->styles[myClass->numstyles]->width=3;
	if(myLayer->type == MS_LAYER_LINE){
	  myClass->styles[myClass->numstyles]->width=3;
	  myClass->styles[myClass->numstyles]->outlinewidth=1.5;
	}
	if(myLayer->type == MS_LAYER_POINT){
	  myClass->styles[myClass->numstyles]->symbol=1;
	  myClass->styles[myClass->numstyles]->size=15;
	}
	
	
	myClass->numstyles++;
	myLayer->numclasses++;
      }
      
      m->layerorder[m->numlayers] = m->numlayers;
      m->numlayers++;

      xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "name");
      xmlAddChild(n1,xmlNewText(BAD_CAST poDefn->GetName()));
      //xmlAddChild(n,n1);
      n1=xmlNewNode(NULL,BAD_CAST "geometry");
      xmlAddChild(n1,xmlNewText(BAD_CAST 
				OGRGeometryTypeToName( poDefn->GetGeomType() )
				));
      //xmlAddChild(n,n1);
      n1=xmlNewNode(NULL,BAD_CAST "featureCount");
      char tmp[128];
      sprintf(tmp,"%i",poLayer->GetFeatureCount());
      xmlAddChild(n1,xmlNewText(BAD_CAST tmp));
      //xmlAddChild(n,n1);
      OGREnvelope oExt;
      if (poLayer->GetExtent(&oExt, TRUE) == OGRERR_NONE)
	{
	  char tmp[128];
	  sprintf(tmp,"%f, %f,%f, %f", 
		  oExt.MinX, oExt.MinY, oExt.MaxX, oExt.MaxY);
	  n1=xmlNewNode(NULL,BAD_CAST "extent");
	  xmlAddChild(n1,xmlNewText(BAD_CAST tmp));
	  //xmlAddChild(n,n1);
	}
      char    *pszWKT;
      if( poLayer->GetSpatialRef() == NULL )
	pszWKT = CPLStrdup( "(unknown)" );
      else
	{
	  OGRSpatialReference* tmpSRS=poLayer->GetSpatialRef();
	  tmpSRS->AutoIdentifyEPSG();
	  const char* authNameSRS=tmpSRS->GetAuthorityName(NULL);
	  const char* authIdSRS=tmpSRS->GetAuthorityCode(NULL);
	  if(authNameSRS!=NULL && authIdSRS!=NULL){
	    pszWKT=(char*)malloc((strlen(authNameSRS)+strlen(authIdSRS)+2)*sizeof(char));
	    sprintf(pszWKT,"%s:%s",authNameSRS,authIdSRS);
	  }else
	    tmpSRS->exportToPrettyWkt( &pszWKT );
	}            
      n1=xmlNewNode(NULL,BAD_CAST "srs");
      xmlAddChild(n1,xmlNewText(BAD_CAST pszWKT));
      //xmlAddChild(n,n1);
      
      n1=xmlNewNode(NULL,BAD_CAST "fields");
      for( int iAttr = 0; iAttr < poDefn->GetFieldCount(); iAttr++ )
	{
	  
	  OGRFieldDefn    *poField = poDefn->GetFieldDefn( iAttr );
	  
	  xmlNodePtr n2=xmlNewNode(NULL,BAD_CAST "field");
	  
	  xmlNodePtr n3=xmlNewNode(NULL,BAD_CAST "id");
	  xmlAddChild(n3,xmlNewText(BAD_CAST poField->GetNameRef()));
	  xmlAddChild(n2,n3);
	  
	  n3=xmlNewNode(NULL,BAD_CAST "type");
	  char tmp[128];
	  sprintf( tmp, "%s (%d.%d)",
		   poField->GetFieldTypeName( poField->GetType() ),
		   poField->GetWidth(),
		   poField->GetPrecision() );
	  xmlAddChild(n3,xmlNewText(BAD_CAST tmp));
	  xmlAddChild(n2,n3);
	  
	  xmlAddChild(n1,n2);
	  
	}
      //xmlAddChild(n,n1);
    }
    else{
      const char* pszDisplayFields =
	CSLFetchNameValue(papszOptions, "DISPLAY_FIELDS");
      OGRFeature  *poFeature = NULL;
      int nbFeature=0;
      while((poFeature = poLayer->GetNextFeature()) != NULL ){
	if( nbFeature >= ( ( mmPage * mmLimit ) - mmLimit ) && 
	    nbFeature < ( mmPage * mmLimit ) ){
	  xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "featureMember");
	  for( int iField = 0; iField < OGR_F_GetFieldCount(poFeature); iField++ )
	    {
	      OGRFieldDefn    *poFDefn = poDefn->GetFieldDefn(iField);
	      xmlNodePtr n2=xmlNewNode(NULL,BAD_CAST poFDefn->GetNameRef());
	      if( OGR_F_IsFieldSet( poFeature, iField ) )
		xmlAddChild(n2,xmlNewText(BAD_CAST OGR_F_GetFieldAsString( poFeature, iField )));
	      else
		xmlAddChild(n2,xmlNewText(BAD_CAST "(null)" ));
	      xmlAddChild(n1,n2);
	    }
	  //xmlAddChild(n,n1);
	}
	else{
	  if( nbFeature < ( ( mmPage * mmLimit ) - mmLimit ) )
	    ;
	  else
	    break;
	}
	nbFeature++;
      }
    }
    fprintf(stderr,"exit %s DataSource Layer \n",pszDataSource);
  }


  /************************************************************************/
  /*                            gdalinfo()                                */
  /************************************************************************/

  int gdalinfo( maps* conf,maps* outputs, char *pszFilename )

  {
    GDALDatasetH	hDataset;
    GDALRasterBandH	hBand;
    int			i, iBand;
    double		adfGeoTransform[6];
    GDALDriverH		hDriver;
    char		**papszMetadata;
    int                 bComputeMinMax = TRUE, bSample = FALSE;
    int                 bShowGCPs = TRUE, bShowMetadata = TRUE, bShowRAT=TRUE;
    int                 bStats = FALSE, bApproxStats = TRUE, iMDD;
    int                 bShowColorTable = TRUE, bComputeChecksum = FALSE;
    int                 bReportHistograms = TRUE;
    int                 nSubdataset = -1;
    char              **papszExtraMDDomains = NULL, **papszFileList;
    const char  *pszProjection = NULL;
    OGRCoordinateTransformationH hTransform = NULL;
    int             bShowFileList = TRUE;

    int                 hasMin = FALSE, hasMax = FALSE;

    xmlDocPtr resDoc = xmlNewDoc(BAD_CAST "1.0");
    xmlNodePtr n = xmlNewNode(NULL, BAD_CAST "datasource");

    /* Check that we are running against at least GDAL 1.5 */
    /* Note to developers : if we use newer API, please change the requirement */
    if (atoi(GDALVersionInfo("VERSION_NUM")) < 1500)
      {
	char message[1024];
        sprintf(message,"GDAL >= 1.5.0 is required but you are using "
                "GDAL %s\n", GDAL_RELEASE_NAME);
        return 4;
      }


    GDALAllRegister();

    /* -------------------------------------------------------------------- */
    /*      Parse arguments.                                                */
    /* -------------------------------------------------------------------- *
       for( i = 1; i < argc; i++ )
       {
       if( EQUAL(argv[i], "--utility_version") )
       {
       printf("%s was compiled against GDAL %s and is running against GDAL %s\n",
       argv[0], GDAL_RELEASE_NAME, GDALVersionInfo("RELEASE_NAME"));
       return 0;
       }
       else if( EQUAL(argv[i], "-mm") )
       bComputeMinMax = TRUE;
       else if( EQUAL(argv[i], "-hist") )
       bReportHistograms = TRUE;
       else if( EQUAL(argv[i], "-stats") )
       {
       bStats = TRUE;
       bApproxStats = FALSE;
       }
       else if( EQUAL(argv[i], "-approx_stats") )
       {
       bStats = TRUE;
       bApproxStats = TRUE;
       }
       else if( EQUAL(argv[i], "-sample") )
       bSample = TRUE;
       else if( EQUAL(argv[i], "-checksum") )
       bComputeChecksum = TRUE;
       else if( EQUAL(argv[i], "-nogcp") )
       bShowGCPs = FALSE;
       else if( EQUAL(argv[i], "-nomd") )
       bShowMetadata = FALSE;
       else if( EQUAL(argv[i], "-norat") )
       bShowRAT = FALSE;
       else if( EQUAL(argv[i], "-noct") )
       bShowColorTable = FALSE;
       else if( EQUAL(argv[i], "-mdd") && i < argc-1 )
       papszExtraMDDomains = CSLAddString( papszExtraMDDomains,
       argv[++i] );
       else if( EQUAL(argv[i], "-nofl") )
       bShowFileList = FALSE;
       else if( EQUAL(argv[i], "-sd") && i < argc-1 )
       nSubdataset = atoi(argv[++i]);
       else if( pszFilename == NULL )
       pszFilename = argv[i];
       }
    */

    

    /* -------------------------------------------------------------------- */
    /*      Open dataset.                                                   */
    /* -------------------------------------------------------------------- */
    hDataset = GDALOpen( pszFilename, GA_ReadOnly );
    
    if( hDataset == NULL )
      {
        fprintf( stderr,
                 "gdalinfo failed - unable to open '%s'.\n",
                 pszFilename );

        //CSLDestroy( argv );
        CSLDestroy( papszExtraMDDomains );
    
        //GDALDumpOpenDatasets( stderr );

        GDALDestroyDriverManager();

        CPLDumpSharedList( NULL );

	setMapInMaps(conf,"lenv","message","Unable to open the file");
        return SERVICE_FAILED;
      }
    
    /* -------------------------------------------------------------------- */
    /*      Read specified subdataset if requested.                         */
    /* -------------------------------------------------------------------- */
    if ( nSubdataset > 0 )
      {
        char **papszSubdatasets = GDALGetMetadata( hDataset, "SUBDATASETS" );
        int nSubdatasets = CSLCount( papszSubdatasets );

        if ( nSubdatasets > 0 && nSubdataset <= nSubdatasets )
	  {
            char szKeyName[1024];
            char *pszSubdatasetName;

            snprintf( szKeyName, sizeof(szKeyName),
                      "SUBDATASET_%d_NAME", nSubdataset );
            szKeyName[sizeof(szKeyName) - 1] = '\0';
            pszSubdatasetName =
	      CPLStrdup( CSLFetchNameValue( papszSubdatasets, szKeyName ) );
            GDALClose( hDataset );
            hDataset = GDALOpen( pszSubdatasetName, GA_ReadOnly );
            CPLFree( pszSubdatasetName );
	  }
        else
	  {
            fprintf( stderr,
                     "gdalinfo warning: subdataset %d of %d requested. "
                     "Reading the main dataset.\n",
                     nSubdataset, nSubdatasets );

	  }
      }

    /* -------------------------------------------------------------------- */
    /*      Report general info.                                            */
    /* -------------------------------------------------------------------- */
    hDriver = GDALGetDatasetDriver( hDataset );
    xmlNodePtr n1=xmlNewNode(NULL,BAD_CAST "dataType");
    xmlAddChild(n1,xmlNewText(BAD_CAST GDALGetDriverLongName( hDriver )));
    xmlAddChild(n,n1);
    
    
    n1=xmlNewNode(NULL,BAD_CAST "size");
    char size[1024];
    sprintf(size,"%d,%d",
	    GDALGetRasterXSize( hDataset ),GDALGetRasterYSize( hDataset ));
    xmlAddChild(n1,xmlNewText(BAD_CAST size));
    xmlAddChild(n,n1);

    /* -------------------------------------------------------------------- */
    /*      Report projection.                                              */
    /* -------------------------------------------------------------------- */
    n1=xmlNewNode(NULL,BAD_CAST "srs");
    if( GDALGetProjectionRef( hDataset ) != NULL )
      {
        OGRSpatialReferenceH  hSRS;
        char		      *pszProjection;

        pszProjection = (char *) GDALGetProjectionRef( hDataset );

        hSRS = OSRNewSpatialReference(NULL);
        if( OSRImportFromWkt( hSRS, &pszProjection ) == CE_None )
	  {
            char	*pszPrettyWkt = NULL;

            OSRExportToPrettyWkt( hSRS, &pszPrettyWkt, FALSE );
            fprintf( stderr, "Coordinate System is:\n%s\n", pszPrettyWkt );
            CPLFree( pszPrettyWkt );
	  }
        else
	  fprintf( stderr, "Coordinate System is `%s'\n",
		   GDALGetProjectionRef( hDataset ) );

        OSRDestroySpatialReference( hSRS );
      }

    /* -------------------------------------------------------------------- */
    /*      Report Geotransform.                                            */
    /* -------------------------------------------------------------------- */
    if( GDALGetGeoTransform( hDataset, adfGeoTransform ) == CE_None )
      {
        if( adfGeoTransform[2] == 0.0 && adfGeoTransform[4] == 0.0 )
	  {
	    n1=xmlNewNode(NULL,BAD_CAST "origin");
	    char orig[1024];
	    sprintf( orig,"%.15f,%.15f",
		     adfGeoTransform[0], adfGeoTransform[3] );
	    xmlAddChild(n1,xmlNewText(BAD_CAST orig));
	    xmlAddChild(n,n1);

	    n1=xmlNewNode(NULL,BAD_CAST "prixelSize");
	    sprintf( orig,"%.15f,%.15f",
		     adfGeoTransform[1], adfGeoTransform[5] );
	    xmlAddChild(n1,xmlNewText(BAD_CAST orig));
	    xmlAddChild(n,n1);	    
	  }
        else{
	  char orig[2048];
	  n1=xmlNewNode(NULL,BAD_CAST "geoTransform");
	  sprintf( orig,"%.16g,%.16g,%.16g;"
		   "%.16g,%.16g,%.16g\n", 
		   adfGeoTransform[0],
		   adfGeoTransform[1],
		   adfGeoTransform[2],
		   adfGeoTransform[3],
		   adfGeoTransform[4],
		   adfGeoTransform[5] );
	  xmlAddChild(n1,xmlNewText(BAD_CAST orig));
	  xmlAddChild(n,n1);
	  
	}
      }

    /* -------------------------------------------------------------------- */
    /*      Report GCPs.                                                    */
    /* -------------------------------------------------------------------- */
    if( bShowGCPs && GDALGetGCPCount( hDataset ) > 0 )
      {
        if (GDALGetGCPProjection(hDataset) != NULL)
	  {
            OGRSpatialReferenceH  hSRS;
            char		      *pszProjection;

            pszProjection = (char *) GDALGetGCPProjection( hDataset );

            hSRS = OSRNewSpatialReference(NULL);
            if( OSRImportFromWkt( hSRS, &pszProjection ) == CE_None )
	      {
                char	*pszPrettyWkt = NULL;

                OSRExportToPrettyWkt( hSRS, &pszPrettyWkt, FALSE );
                fprintf( stderr, "GCP Projection = \n%s\n", pszPrettyWkt );
                CPLFree( pszPrettyWkt );
	      }
            else
	      fprintf( stderr,"GCP Projection = %s\n",
		       GDALGetGCPProjection( hDataset ) );

            OSRDestroySpatialReference( hSRS );
	  }

        for( i = 0; i < GDALGetGCPCount(hDataset); i++ )
	  {
            const GDAL_GCP	*psGCP;
            
            psGCP = GDALGetGCPs( hDataset ) + i;

            fprintf( stderr, "GCP[%3d]: Id=%s, Info=%s\n"
		     "          (%.15g,%.15g) -> (%.15g,%.15g,%.15g)\n", 
		     i, psGCP->pszId, psGCP->pszInfo, 
		     psGCP->dfGCPPixel, psGCP->dfGCPLine, 
		     psGCP->dfGCPX, psGCP->dfGCPY, psGCP->dfGCPZ );
	  }
      }

    /* -------------------------------------------------------------------- */
    /*      Report metadata.                                                */
    /* -------------------------------------------------------------------- *
       papszMetadata = (bShowMetadata) ? GDALGetMetadata( hDataset, NULL ) : NULL;
       if( bShowMetadata && CSLCount(papszMetadata) > 0 )
       {
       printf( "Metadata:\n" );
       for( i = 0; papszMetadata[i] != NULL; i++ )
       {
       printf( "  %s\n", papszMetadata[i] );
       }
       }

       for( iMDD = 0; bShowMetadata && iMDD < CSLCount(papszExtraMDDomains); iMDD++ )
       {
       papszMetadata = GDALGetMetadata( hDataset, papszExtraMDDomains[iMDD] );
       if( CSLCount(papszMetadata) > 0 )
       {
       printf( "Metadata (%s):\n", papszExtraMDDomains[iMDD]);
       for( i = 0; papszMetadata[i] != NULL; i++ )
       {
       printf( "  %s\n", papszMetadata[i] );
       }
       }
       }*/

    /* -------------------------------------------------------------------- */
    /*      Report "IMAGE_STRUCTURE" metadata.                              */
    /* -------------------------------------------------------------------- *
       papszMetadata = (bShowMetadata) ? GDALGetMetadata( hDataset, "IMAGE_STRUCTURE" ) : NULL;
       if( bShowMetadata && CSLCount(papszMetadata) > 0 )
       {
       printf( "Image Structure Metadata:\n" );
       for( i = 0; papszMetadata[i] != NULL; i++ )
       {
       printf( "  %s\n", papszMetadata[i] );
       }
       }*/

    /* -------------------------------------------------------------------- */
    /*      Report subdatasets.                                             */
    /* -------------------------------------------------------------------- *
       papszMetadata = GDALGetMetadata( hDataset, "SUBDATASETS" );
       if( CSLCount(papszMetadata) > 0 )
       {
       printf( "Subdatasets:\n" );
       for( i = 0; papszMetadata[i] != NULL; i++ )
       {
       printf( "  %s\n", papszMetadata[i] );
       }
       }*/

    /* -------------------------------------------------------------------- */
    /*      Report geolocation.                                             */
    /* -------------------------------------------------------------------- */
    papszMetadata = (bShowMetadata) ? GDALGetMetadata( hDataset, "GEOLOCATION" ) : NULL;
    if( bShowMetadata && CSLCount(papszMetadata) > 0 )
      {
        fprintf( stderr,"Geolocation:\n" );
        for( i = 0; papszMetadata[i] != NULL; i++ )
	  {
            fprintf( stderr,"  %s\n", papszMetadata[i] );
	  }
      }

    /* -------------------------------------------------------------------- */
    /*      Report RPCs                                                     */
    /* -------------------------------------------------------------------- */
    papszMetadata = (bShowMetadata) ? GDALGetMetadata( hDataset, "RPC" ) : NULL;
    if( bShowMetadata && CSLCount(papszMetadata) > 0 )
      {
        fprintf( stderr,"RPC Metadata:\n" );
        for( i = 0; papszMetadata[i] != NULL; i++ )
	  {
            fprintf( stderr,"  %s\n", papszMetadata[i] );
	  }
      }

    /* -------------------------------------------------------------------- */
    /*      Setup projected to lat/long transform if appropriate.           */
    /* -------------------------------------------------------------------- */
    if( GDALGetGeoTransform( hDataset, adfGeoTransform ) == CE_None )
      pszProjection = GDALGetProjectionRef(hDataset);

    if( pszProjection != NULL && strlen(pszProjection) > 0 )
      {
        OGRSpatialReferenceH hProj, hLatLong = NULL;

        hProj = OSRNewSpatialReference( pszProjection );
        if( hProj != NULL )
	  hLatLong = OSRCloneGeogCS( hProj );

        if( hLatLong != NULL )
	  {
            CPLPushErrorHandler( CPLQuietErrorHandler );
            hTransform = OCTNewCoordinateTransformation( hProj, hLatLong );
            CPLPopErrorHandler();
            
            OSRDestroySpatialReference( hLatLong );
	  }

        if( hProj != NULL )
	  OSRDestroySpatialReference( hProj );
      }

    /* -------------------------------------------------------------------- */
    /*      Report corners.                                                 */
    /* -------------------------------------------------------------------- */
    /*printf( "Corner Coordinates:\n" );
      GDALInfoReportCorner( hDataset, hTransform, "Upper Left", 
      0.0, 0.0 );
      GDALInfoReportCorner( hDataset, hTransform, "Lower Left", 
      0.0, GDALGetRasterYSize(hDataset));
      GDALInfoReportCorner( hDataset, hTransform, "Upper Right", 
      GDALGetRasterXSize(hDataset), 0.0 );
      GDALInfoReportCorner( hDataset, hTransform, "Lower Right", 
      GDALGetRasterXSize(hDataset), 
      GDALGetRasterYSize(hDataset) );
      GDALInfoReportCorner( hDataset, hTransform, "Center", 
      GDALGetRasterXSize(hDataset)/2.0, 
      GDALGetRasterYSize(hDataset)/2.0 );*/

    if( hTransform != NULL )
      {
        OCTDestroyCoordinateTransformation( hTransform );
        hTransform = NULL;
      }
    
    xmlNodePtr n2;

    /* ==================================================================== */
    /*      Loop over bands.                                                */
    /* ==================================================================== */
    for( iBand = 0; iBand < GDALGetRasterCount( hDataset ); iBand++ )
      {
	n1=xmlNewNode(NULL,BAD_CAST "Band");
        double      dfMin, dfMax, adfCMinMax[2], dfNoData;
        int         bGotMin, bGotMax, bGotNodata, bSuccess;
        int         nBlockXSize, nBlockYSize, nMaskFlags;
        double      dfMean, dfStdDev;
        GDALColorTableH	hTable;
        CPLErr      eErr;

        hBand = GDALGetRasterBand( hDataset, iBand+1 );


        if( bSample )
	  {
            float afSample[10000];
            int   nCount;

            nCount = GDALGetRandomRasterSample( hBand, 10000, afSample );
            fprintf( stderr,"Got %d samples.\n", nCount );
	  }
        
        GDALGetBlockSize( hBand, &nBlockXSize, &nBlockYSize );
        fprintf( stderr, "Band %d Block=%dx%d Type=%s, ColorInterp=%s\n", iBand+1,
		 nBlockXSize, nBlockYSize,
		 GDALGetDataTypeName(
				     GDALGetRasterDataType(hBand)),
		 GDALGetColorInterpretationName(
						GDALGetRasterColorInterpretation(hBand)) );

        if( GDALGetDescription( hBand ) != NULL 
            && strlen(GDALGetDescription( hBand )) > 0 )
	  fprintf( stderr,"  Description = %s\n", GDALGetDescription(hBand) );

        dfMin = GDALGetRasterMinimum( hBand, &bGotMin );
        dfMax = GDALGetRasterMaximum( hBand, &bGotMax );
        if( bGotMin || bGotMax || bComputeMinMax )
	  {
            if( bGotMin ){
	      char orig[128];
	      n2=xmlNewNode(NULL,BAD_CAST "min");
	      sprintf( orig,"%.3f", dfMin );
	      xmlAddChild(n2,xmlNewText(BAD_CAST orig));
	      xmlAddChild(n1,n2);
	      hasMin=TRUE;
	    }
            if( bGotMax ){
	      char orig[128];
	      n2=xmlNewNode(NULL,BAD_CAST "max");
	      sprintf( orig,"%.3f", dfMax );
	      xmlAddChild(n2,xmlNewText(BAD_CAST orig));
	      xmlAddChild(n1,n2);
	      hasMax=TRUE;
	    }
        
            if( bComputeMinMax )
	      {
                CPLErrorReset();
                GDALComputeRasterMinMax( hBand, FALSE, adfCMinMax );
                if (CPLGetLastErrorType() == CE_None)
		  {
		    char orig[128];
		    n2=xmlNewNode(NULL,BAD_CAST "cmin");
		    sprintf( orig,"%.3f", adfCMinMax[0] );
		    xmlAddChild(n2,xmlNewText(BAD_CAST orig));
		    xmlAddChild(n1,n2);

		    n2=xmlNewNode(NULL,BAD_CAST "cmax");
		    sprintf( orig,"%.3f", adfCMinMax[1] );
		    xmlAddChild(n2,xmlNewText(BAD_CAST orig));
		    xmlAddChild(n1,n2);
		  }
	      }
	  }

        eErr = GDALGetRasterStatistics( hBand, bApproxStats, bStats, 
                                        &dfMin, &dfMax, &dfMean, &dfStdDev );
	fprintf(stderr,"loop over %d Band : %.3f %.3f %.3f %.3f\n",GDALGetRasterCount( hDataset ),dfMin, dfMax, dfMean, dfStdDev);

        if( eErr == CE_None )
	  {
            fprintf( stderr, "  Minimum=%.3f, Maximum=%.3f, Mean=%.3f, StdDev=%.3f\n",
		     dfMin, dfMax, dfMean, dfStdDev );
	  }

        if( bReportHistograms )
	  {
            int nBucketCount, *panHistogram = NULL;

            eErr = GDALGetDefaultHistogram( hBand, &dfMin, &dfMax, 
                                            &nBucketCount, &panHistogram, 
                                            TRUE, NULL, NULL );
	    fprintf(stderr,"Error : %d\n",eErr);
            if( eErr == CE_None )
	      {
                int iBucket;

		char orig[128];

		n2=xmlNewNode(NULL,BAD_CAST "number");
		sprintf( orig,"%d", nBucketCount );
		xmlAddChild(n2,xmlNewText(BAD_CAST orig));
		xmlAddChild(n1,n2);

		if(hasMin==FALSE){
		  n2=xmlNewNode(NULL,BAD_CAST "min");
		  sprintf( orig,"%.3f", dfMin );
		  xmlAddChild(n2,xmlNewText(BAD_CAST orig));
		  xmlAddChild(n1,n2);
		}
		if(hasMax==FALSE){
		  n2=xmlNewNode(NULL,BAD_CAST "max");
		  sprintf( orig,"%.3f", dfMax );
		  xmlAddChild(n2,xmlNewText(BAD_CAST orig));
		  xmlAddChild(n1,n2);
		}

		n2=xmlNewNode(NULL,BAD_CAST "histogram");
                for( iBucket = 0; iBucket < nBucketCount; iBucket++ ){
		  if(iBucket==0)
		    sprintf( orig, "%d", panHistogram[iBucket] );
		  else
		    sprintf( orig, ",%d", panHistogram[iBucket] );
		  xmlAddChild(n2,xmlNewText(BAD_CAST orig));
		}
		xmlAddChild(n1,n2);

                CPLFree( panHistogram );
	      }
	  }

        if ( bComputeChecksum)
	  {
            fprintf( stderr, "  Checksum=%d\n",
		     GDALChecksumImage(hBand, 0, 0,
				       GDALGetRasterXSize(hDataset),
				       GDALGetRasterYSize(hDataset)));
	  }

        dfNoData = GDALGetRasterNoDataValue( hBand, &bGotNodata );
        if( bGotNodata )
	  {
            if (CPLIsNan(dfNoData))
	      fprintf( stderr,"  NoData Value=nan\n" );
            else
	      fprintf( stderr,"  NoData Value=%.18g\n", dfNoData );
	  }

        if( GDALGetOverviewCount(hBand) > 0 )
	  {
            int		iOverview;

            fprintf( stderr, "  Overviews: " );
            for( iOverview = 0; 
                 iOverview < GDALGetOverviewCount(hBand);
                 iOverview++ )
	      {
                GDALRasterBandH	hOverview;
                const char *pszResampling = NULL;

                if( iOverview != 0 )
		  fprintf( stderr, ", " );

                hOverview = GDALGetOverview( hBand, iOverview );
                if (hOverview != NULL)
		  {
                    fprintf( stderr, "%dx%d", 
			     GDALGetRasterBandXSize( hOverview ),
			     GDALGetRasterBandYSize( hOverview ) );

                    pszResampling = 
		      GDALGetMetadataItem( hOverview, "RESAMPLING", "" );

                    if( pszResampling != NULL 
                        && EQUALN(pszResampling,"AVERAGE_BIT2",12) )
		      fprintf( stderr,"*" );
		  }
                else
		  fprintf( stderr, "(null)" );
	      }
            fprintf( stderr, "\n" );

            if ( bComputeChecksum)
	      {
                fprintf( stderr, "  Overviews checksum: " );
                for( iOverview = 0; 
		     iOverview < GDALGetOverviewCount(hBand);
		     iOverview++ )
		  {
                    GDALRasterBandH	hOverview;

                    if( iOverview != 0 )
		      fprintf( stderr, ", " );

                    hOverview = GDALGetOverview( hBand, iOverview );
                    if (hOverview)
		      fprintf( stderr, "%d",
			       GDALChecksumImage(hOverview, 0, 0,
						 GDALGetRasterBandXSize(hOverview),
						 GDALGetRasterBandYSize(hOverview)));
                    else
		      fprintf( stderr, "(null)" );
		  }
                fprintf( stderr, "\n" );
	      }
	  }

        if( GDALHasArbitraryOverviews( hBand ) )
	  {
            fprintf( stderr, "  Overviews: arbitrary\n" );
	  }
        
        nMaskFlags = GDALGetMaskFlags( hBand );
        if( (nMaskFlags & (GMF_NODATA|GMF_ALL_VALID)) == 0 )
	  {
            GDALRasterBandH hMaskBand = GDALGetMaskBand(hBand) ;

            fprintf( stderr, "  Mask Flags: " );
            if( nMaskFlags & GMF_PER_DATASET )
	      fprintf( stderr, "PER_DATASET " );
            if( nMaskFlags & GMF_ALPHA )
	      fprintf( stderr, "ALPHA " );
            if( nMaskFlags & GMF_NODATA )
	      fprintf( stderr, "NODATA " );
            if( nMaskFlags & GMF_ALL_VALID )
	      fprintf( stderr, "ALL_VALID " );
            fprintf( stderr, "\n" );

            if( hMaskBand != NULL &&
                GDALGetOverviewCount(hMaskBand) > 0 )
	      {
                int		iOverview;

                fprintf( stderr, "  Overviews of mask band: " );
                for( iOverview = 0; 
                     iOverview < GDALGetOverviewCount(hMaskBand);
                     iOverview++ )
		  {
                    GDALRasterBandH	hOverview;

                    if( iOverview != 0 )
		      fprintf( stderr, ", " );

                    hOverview = GDALGetOverview( hMaskBand, iOverview );
                    fprintf( stderr, "%dx%d", 
			     GDALGetRasterBandXSize( hOverview ),
			     GDALGetRasterBandYSize( hOverview ) );
		  }
                fprintf( stderr, "\n" );
	      }
	  }

        if( strlen(GDALGetRasterUnitType(hBand)) > 0 )
	  {
            fprintf( stderr, "  Unit Type: %s\n", GDALGetRasterUnitType(hBand) );
	  }

        if( GDALGetRasterCategoryNames(hBand) != NULL )
	  {
            char **papszCategories = GDALGetRasterCategoryNames(hBand);
            int i;

            fprintf( stderr, "  Categories:\n" );
            for( i = 0; papszCategories[i] != NULL; i++ )
	      fprintf( stderr, "    %3d: %s\n", i, papszCategories[i] );
	  }

        if( GDALGetRasterScale( hBand, &bSuccess ) != 1.0 
            || GDALGetRasterOffset( hBand, &bSuccess ) != 0.0 )
	  fprintf( stderr, "  Offset: %.15g,   Scale:%.15g\n",
		   GDALGetRasterOffset( hBand, &bSuccess ),
		   GDALGetRasterScale( hBand, &bSuccess ) );

        papszMetadata = (bShowMetadata) ? GDALGetMetadata( hBand, NULL ) : NULL;
        if( bShowMetadata && CSLCount(papszMetadata) > 0 )
	  {
            fprintf( stderr, "  Metadata:\n" );
            for( i = 0; papszMetadata[i] != NULL; i++ )
	      {
                fprintf( stderr, "    %s\n", papszMetadata[i] );
	      }
	  }

        papszMetadata = (bShowMetadata) ? GDALGetMetadata( hBand, "IMAGE_STRUCTURE" ) : NULL;
        if( bShowMetadata && CSLCount(papszMetadata) > 0 )
	  {
            fprintf( stderr, "  Image Structure Metadata:\n" );
            for( i = 0; papszMetadata[i] != NULL; i++ )
	      {
                fprintf( stderr, "    %s\n", papszMetadata[i] );
	      }
	  }

        if( GDALGetRasterColorInterpretation(hBand) == GCI_PaletteIndex 
            && (hTable = GDALGetRasterColorTable( hBand )) != NULL )
	  {
            int			i;

            if (bShowColorTable)
	      {
		n2=xmlNewNode(NULL,BAD_CAST "colorTable");
                for( i = 0; i < GDALGetColorEntryCount( hTable ); i++ )
		  {
                    GDALColorEntry	sEntry;
    
                    GDALGetColorEntryAsRGB( hTable, i, &sEntry );
		    char tmp[1024];
		    sprintf( tmp, "%d,%d,%d,%d;",
			     i, 
			     sEntry.c1,
			     sEntry.c2,
			     sEntry.c3,
			     sEntry.c4 );
		    xmlAddChild(n2,xmlNewText(BAD_CAST tmp));
		  }
		xmlAddChild(n1,n2);
	      }
	  }

        if( bShowRAT && GDALGetDefaultRAT( hBand ) != NULL )
	  {
            GDALRasterAttributeTableH hRAT = GDALGetDefaultRAT( hBand );
            
            //GDALRATDumpReadable( hRAT, NULL );
	  }
	xmlAddChild(n,n1);
      }

    GDALClose( hDataset );
    
    CSLDestroy( papszExtraMDDomains );
    
    //GDALDumpOpenDatasets( stderr );

    GDALDestroyDriverManager();

    CPLDumpSharedList( NULL );
    CPLCleanupTLS();

    xmlChar *xmlb;
    int bsize;
    xmlDocSetRootElement(resDoc, n);
    xmlDocDumpFormatMemory(resDoc, &xmlb, &bsize, 1);
    setMapInMaps(outputs,"Result","value",(char*)xmlb);
    return SERVICE_SUCCEEDED;
  }

}
