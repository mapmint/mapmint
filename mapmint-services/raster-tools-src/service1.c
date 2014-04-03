/******************************************************************************
 * $Id$
 *
 * Project:  GDAL Utilities
 * Purpose:  GDAL Image Translator Program
 * Author:   Frank Warmerdam, warmerdam@pobox.com
 *
 ******************************************************************************
 * Copyright (c) 1998, 2002, Frank Warmerdam
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

#include "cpl_vsi.h"
#include "cpl_conv.h"
#include "cpl_string.h"
#include "gdal_priv.h"
#include "ogr_spatialref.h"
#include "vrtdataset.h"

#include "service.h"

CPL_CVSID("$Id$");

extern "C" {


  static void AttachMetadata( GDALDatasetH, char ** );
  static int bSubCall = FALSE;

  /************************************************************************/
  /*                          Gdal_Translate()                            */
  /************************************************************************/
#ifdef WIN32
__declspec(dllexport)
#endif
  int translate(maps*& conf,maps*& inputs,maps*& outputs)
  {
    
    /*fprintf(stderr,"STARTING GDAL TRANSLATE\n");
      fflush(stderr);*/

    GDALDatasetH	hDataset, hOutDS;
    int			i;
    int			nRasterXSize, nRasterYSize;
    const char		*pszSource=NULL, *pszDest=NULL, *pszFormat = "GTiff";
    GDALDriverH		hDriver;
    int			*panBandList = NULL, nBandCount = 0, bDefBands = TRUE;
    double		adfGeoTransform[6];
    GDALDataType	eOutputType = GDT_Unknown;
    int			nOXSize = 0, nOYSize = 0;
    char		*pszOXSize=NULL, *pszOYSize=NULL;
    char                **papszCreateOptions = NULL;
    int                 anSrcWin[4], bStrict = FALSE;
    const char          *pszProjection;
    int                 bScale = FALSE, bHaveScaleSrc = FALSE;
    double	        dfScaleSrcMin=0.0, dfScaleSrcMax=255.0;
    double              dfScaleDstMin=0.0, dfScaleDstMax=255.0;
    double              dfULX, dfULY, dfLRX, dfLRY;
    char                **papszMetadataOptions = NULL;
    char                *pszOutputSRS = NULL;
    int                 bQuiet = TRUE, bGotBounds = FALSE;
    GDALProgressFunc    pfnProgress = GDALDummyProgress;
    int                 nGCPCount = 0;
    GDAL_GCP            *pasGCPs = NULL;
    int                 iSrcFileArg = -1, iDstFileArg = -1;
    int                 bCopySubDatasets = FALSE;
    double              adfULLR[4] = { 0,0,0,0 };
    int                 bSetNoData = FALSE;
    double		dfNoDataReal = 0.0;
    int                 nRGBExpand = 0;

    anSrcWin[0] = 0;
    anSrcWin[1] = 0;
    anSrcWin[2] = 0;
    anSrcWin[3] = 0;

    dfULX = dfULY = dfLRX = dfLRY = 0.0;

    /* ----------------------------------------------------------------- */
    /*      Register standard GDAL drivers, and process generic GDAL     */
    /* ----------------------------------------------------------------- */
    GDALAllRegister();

    /* ----------------------------------------------------------------- */
    /* Extract Format, InputDSN, OutputDSN parameters                    */
    /* ----------------------------------------------------------------- */

    map* tmpMap=NULL;

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

    tmpMap=getMapFromMaps(inputs,"Format","value");
    if(tmpMap!=NULL){
      pszFormat=tmpMap->value;
    }
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"InputDSN","value");
    if(tmpMap!=NULL){
      pszSource=(char*)malloc(sizeof(char)*(strlen(dataPath)+strlen(tmpMap->value)+4));
      sprintf((char*)pszSource,"%s/%s",dataPath,tmpMap->value);
    }
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"OutputDSN","value");
    if(tmpMap!=NULL){
      pszDest=(char*)malloc(sizeof(char)*(strlen(tempPath)+strlen(tmpMap->value)+6));
      char *ext=new char[4];
      ext="tif";
      if(strncasecmp(pszFormat,"AAIGRID",7)==0)
	ext="csv";
      else 
	if(strncasecmp(pszFormat,"PNG",3)==0)
	  ext="png";
	else
	  if(strncasecmp(pszFormat,"GIF",3)==0)
	    ext="gif";
	  else
	    if(strncasecmp(pszFormat,"JPEG",4)==0)
	      ext="jpg";
      sprintf((char*)pszDest,"%s/%s.%s",tempPath,tmpMap->value,ext);
      fprintf(stderr,"DEBUG pszDest : %s\n",pszDest);
    }
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"ProjWin","value");
    if(tmpMap!=NULL){
      char *tmp=tmpMap->value;
      char *t=strtok(tmp,",");
      int cnt=0;
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
	fprintf(stderr,"%s\n\n",t);
	fprintf(stderr,"%f - %f - %f - %f\n\n",dfULX,dfULY,dfLRX,dfLRY);
	t=strtok(NULL,",");
	cnt++;
      }
    }
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"SRS","value");
    if(tmpMap!=NULL){
      OGRSpatialReference oOutputSRS;
      if( oOutputSRS.SetFromUserInput( tmpMap->value ) != OGRERR_NONE )
	{
	  fprintf( stderr, "Failed to process SRS definition: %s\n", 
		   tmpMap->value );
	    /**
	     * Avoiding GDALDestroyDriverManager() call
	     */
	  return 4;
	}
      oOutputSRS.exportToWkt( &pszOutputSRS );
    }
    tmpMap=NULL;
    tmpMap=getMapFromMaps(inputs,"Type","value");
    if(tmpMap!=NULL){
      int	iType;
      
      for( iType = 1; iType < GDT_TypeCount; iType++ )
	{
	  if( GDALGetDataTypeName((GDALDataType)iType) != NULL
	      && EQUAL(GDALGetDataTypeName((GDALDataType)iType),
		       tmpMap->value) )
	    {
	      eOutputType = (GDALDataType) iType;
	    }
	}
      
      if( eOutputType == GDT_Unknown )
	{
	  fprintf( stderr, "Unknown output pixel type: %s\n", tmpMap->value );
	  /**
	   * Avoiding GDALDestroyDriverManager() call
	   */
	  return 4;
	}
    }
    fprintf(stderr,"==%s %s %s %==\n",pszFormat,pszSource,pszDest);
    fflush(stderr);

    tmpMap=getMapFromMaps(inputs,"OutSize","value");
    if(tmpMap!=NULL){
      char *temp=strstr(tmpMap->value,",");
      pszOXSize=strdup(tmpMap->value);
      pszOXSize[strlen(tmpMap->value)-strlen(temp)]=0;
      pszOYSize=strdup(temp+1);
      fprintf(stderr,"pszOSize %s %s",pszOXSize,pszOYSize);
    }

    if( pszDest == NULL ){
	fprintf(stderr,"exit line 416");
	fflush(stderr);
	/**
	 * Avoiding GDALDestroyDriverManager() call
	 */
        return 4;
      }

    if ( strcmp(pszSource, pszDest) == 0)
      {
        fprintf(stderr, "Source and destination datasets must be different.\n");
	fflush(stderr);
	/**
	 * Avoiding GDALDestroyDriverManager() call
	 */
        return 4;
      }

    /* ----------------------------------------------------------------- */
    /*      Attempt to open source file.                                 */
    /* ----------------------------------------------------------------- */

    fprintf(stderr,"dataSource %s\n",pszSource);
    hDataset = GDALOpenShared( pszSource, GA_ReadOnly );
    
    if( hDataset == NULL ){
        fprintf( stderr,
                 "GDALOpen failed - %d\n%s\n",
                 CPLGetLastErrorNo(), CPLGetLastErrorMsg() );
	fflush(stderr);
	/**
	 * Avoiding GDALDestroyDriverManager() call
	 */
        return 4;
      }

    /* ----------------------------------------------------------------- */
    /*      Handle subdatasets.                                          */
    /* ----------------------------------------------------------------- */
    if( !bCopySubDatasets 
        && CSLCount(GDALGetMetadata( hDataset, "SUBDATASETS" )) > 0 
        && GDALGetRasterCount(hDataset) == 0 )
      {
        fprintf( stderr,
                 "Input file contains subdatasets. Please, select one of them for reading.\n" );
	fflush(stderr);
        GDALClose( hDataset );
	/**
	 * Avoiding GDALDestroyDriverManager() call
	 */
        return 4;
      }

    if( CSLCount(GDALGetMetadata( hDataset, "SUBDATASETS" )) > 0 
        && bCopySubDatasets )
      {
        char **papszSubdatasets = GDALGetMetadata(hDataset,"SUBDATASETS");
        char *pszSubDest = (char *) CPLMalloc(strlen(pszDest)+32);
        int i;
        int bOldSubCall = bSubCall;
        
        //argv[iDstFileArg] = pszSubDest;
        bSubCall = TRUE;
        for( i = 0; papszSubdatasets[i] != NULL; i += 2 )
	  {
            //argv[iSrcFileArg] = strstr(papszSubdatasets[i],"=")+1;
            sprintf( pszSubDest, "%s%d", pszDest, i/2 + 1 );
            /*if( ProxyMain( argc, argv ) != 0 )
	      break;*/
	  }
        
        bSubCall = bOldSubCall;
        CPLFree( pszSubDest );

        GDALClose( hDataset );

        if( !bSubCall )
	  {
            GDALDumpOpenDatasets( stderr );
	    fflush(stderr);
	    /**
	     * Avoiding GDALDestroyDriverManager() call
	     */
	  }
        return 1;
      }

    /* ----------------------------------------------------------------- */
    /*      Collect some information from the source file.               */
    /* ----------------------------------------------------------------- */
    nRasterXSize = GDALGetRasterXSize( hDataset );
    nRasterYSize = GDALGetRasterYSize( hDataset );

    if( !bQuiet )
      printf( "Input file size is %d, %d\n", nRasterXSize, nRasterYSize );

    if( anSrcWin[2] == 0 && anSrcWin[3] == 0 ){
        anSrcWin[2] = nRasterXSize;
        anSrcWin[3] = nRasterYSize;
      }

    /* ----------------------------------------------------------------- */
    /*	Build band list to translate	                                 */
    /* ----------------------------------------------------------------- */
    if( nBandCount == 0 ){
        nBandCount = GDALGetRasterCount( hDataset );
        if( nBandCount == 0 ){
            fprintf( stderr, "Input file has no bands, and so cannot be translated.\n" );
	    fflush(stderr);
	    /**
	     * Avoiding GDALDestroyDriverManager() call
	     */
            return 4;
	  }

        panBandList = (int *) CPLMalloc(sizeof(int)*nBandCount);
        for( i = 0; i < nBandCount; i++ )
	  panBandList[i] = i+1;
      }
    else
      {
        for( i = 0; i < nBandCount; i++ )
	  {
            if( panBandList[i] < 1 || panBandList[i] > GDALGetRasterCount(hDataset) )
	      {
                fprintf( stderr, 
                         "Band %d requested, but only bands 1 to %d available.\n",
                         panBandList[i], GDALGetRasterCount(hDataset) );
		fflush(stderr);
		/**
		 * Avoiding GDALDestroyDriverManager() call
		 */
                return 4;
	      }
	  }

        if( nBandCount != GDALGetRasterCount( hDataset ) )
	  bDefBands = FALSE;
      }

    /* ----------------------------------------------------------------- */
    /*   Compute the source window from the projected source window      */
    /*   if the projected coordinates were provided.  Note that the      */
    /*   projected coordinates are in ulx, uly, lrx, lry format,         */
    /*   while the anSrcWin is xoff, yoff, xsize, ysize with the         */
    /*   xoff,yoff being the ulx, uly in pixel/line.                     */
    /* ----------------------------------------------------------------- */
    if( dfULX != 0.0 || dfULY != 0.0 
        || dfLRX != 0.0 || dfLRY != 0.0 )
      {
        double	adfGeoTransform[6];

        GDALGetGeoTransform( hDataset, adfGeoTransform );

        if( adfGeoTransform[2] != 0.0 || adfGeoTransform[4] != 0.0 ){
            fprintf( stderr, 
                     "The -projwin option was used, but the geotransform is\n"
                     "rotated.  This configuration is not supported.\n" );
            GDALClose( hDataset );
            CPLFree( panBandList );
	    fflush(stderr);
	    /**
	     * Avoiding GDALDestroyDriverManager() call
	     */
            return 4;
	  }

        anSrcWin[0] = (int) 
	  ((dfULX - adfGeoTransform[0]) / adfGeoTransform[1] + 0.001);
        anSrcWin[1] = (int) 
	  ((dfULY - adfGeoTransform[3]) / adfGeoTransform[5] + 0.001);

        anSrcWin[2] = (int) ((dfLRX - dfULX) / adfGeoTransform[1] + 0.5);
        anSrcWin[3] = (int) ((dfLRY - dfULY) / adfGeoTransform[5] + 0.5);

        if( !bQuiet )
	  fprintf( stdout, 
		   "Computed -srcwin %d %d %d %d from projected window.\n",
		   anSrcWin[0], 
		   anSrcWin[1], 
		   anSrcWin[2], 
		   anSrcWin[3] );
        
        if( anSrcWin[0] < 0 || anSrcWin[1] < 0 
            || anSrcWin[0] + anSrcWin[2] > GDALGetRasterXSize(hDataset) 
            || anSrcWin[1] + anSrcWin[3] > GDALGetRasterYSize(hDataset) )
	  {
            fprintf( stderr, 
                     "Computed -srcwin falls outside raster size of %dx%d.\n",
                     GDALGetRasterXSize(hDataset), 
                     GDALGetRasterYSize(hDataset) );
            return 4;
	  }
      }

    /* ----------------------------------------------------------------- */
    /*      Verify source window.                                        */
    /* ----------------------------------------------------------------- */
    if( anSrcWin[0] < 0 || anSrcWin[1] < 0 
        || anSrcWin[2] <= 0 || anSrcWin[3] <= 0
        || anSrcWin[0] + anSrcWin[2] > GDALGetRasterXSize(hDataset) 
        || anSrcWin[1] + anSrcWin[3] > GDALGetRasterYSize(hDataset) )
      {
        fprintf( stderr, 
                 "-srcwin %d %d %d %d falls outside raster size of %dx%d\n"
                 "or is otherwise illegal.\n",
                 anSrcWin[0],
                 anSrcWin[1],
                 anSrcWin[2],
                 anSrcWin[3],
                 GDALGetRasterXSize(hDataset), 
                 GDALGetRasterYSize(hDataset) );
        return 4;
      }

    /* ----------------------------------------------------------------- */
    /*      Find the output driver.                                      */
    /* ----------------------------------------------------------------- */
    hDriver = GDALGetDriverByName( pszFormat );
    if( hDriver == NULL )
      {
        int	iDr;
        
        printf( "Output driver `%s' not recognised.\n", pszFormat );
        printf( "The following format drivers are configured and support output:\n" );
        for( iDr = 0; iDr < GDALGetDriverCount(); iDr++ )
	  {
            GDALDriverH hDriver = GDALGetDriver(iDr);

            if( GDALGetMetadataItem( hDriver, GDAL_DCAP_CREATE, NULL ) != NULL
                || GDALGetMetadataItem( hDriver, GDAL_DCAP_CREATECOPY,
                                        NULL ) != NULL )
	      {
                fprintf( stderr, "  %s: %s\n",
                        GDALGetDriverShortName( hDriver  ),
                        GDALGetDriverLongName( hDriver ) );
	      }
	  }
        fprintf( stderr,"\n" );
        
        GDALClose( hDataset );
        CPLFree( panBandList );
	fflush(stderr);
	/**
	 * Avoiding GDALDestroyDriverManager() call
	 */
        CSLDestroy( papszCreateOptions );
        return 4;
      }

    /* ----------------------------------------------------------------- */
    /*   The short form is to CreateCopy().  We use this if the input    */
    /*   matches the whole dataset.  Eventually we should rewrite        */
    /*   this entire program to use virtual datasets to construct a      */
    /*   virtual input source to copy from.                              */
    /* ----------------------------------------------------------------- */
    if( eOutputType == GDT_Unknown 
        && !bScale && CSLCount(papszMetadataOptions) == 0 && bDefBands 
        && anSrcWin[0] == 0 && anSrcWin[1] == 0 
        && anSrcWin[2] == GDALGetRasterXSize(hDataset)
        && anSrcWin[3] == GDALGetRasterYSize(hDataset) 
        && pszOXSize == NULL && pszOYSize == NULL 
        && nGCPCount == 0 && !bGotBounds
        && pszOutputSRS == NULL && !bSetNoData
        && nRGBExpand == 0)
      {
        
        hOutDS = GDALCreateCopy( hDriver, pszDest, hDataset, 
                                 bStrict, papszCreateOptions, 
                                 pfnProgress, NULL );

        if( hOutDS != NULL )
	  GDALClose( hOutDS );
        
        GDALClose( hDataset );

        CPLFree( panBandList );

        if( !bSubCall )
	  {
            GDALDumpOpenDatasets( stderr );
	    /**
	     * Avoiding GDALDestroyDriverManager() call
	     */
	  }

        CSLDestroy( papszCreateOptions );
	//outputs=(maps*)malloc(sizeof(maps*));
	//outputs->name="OutputedPolygon";
	setMapInMaps(outputs,"Result","value",(char*)pszDest);
	//outputs->next=NULL;
	
	return SERVICE_SUCCEEDED;
      }
    fprintf(stderr,"==%s %s %s %==\n",pszFormat,pszSource,pszDest);
    fflush(stderr);

    /* ----------------------------------------------------------------- */
    /*      Establish some parameters.                                   */
    /* ----------------------------------------------------------------- */
    if( pszOXSize == NULL )
      {
        nOXSize = anSrcWin[2];
        nOYSize = anSrcWin[3];
      }
    else
      {
        nOXSize = (int) ((pszOXSize[strlen(pszOXSize)-1]=='%' 
                          ? atof(pszOXSize)/100*anSrcWin[2] : atoi(pszOXSize)));
        nOYSize = (int) ((pszOYSize[strlen(pszOYSize)-1]=='%' 
                          ? atof(pszOYSize)/100*anSrcWin[3] : atoi(pszOYSize)));
      }
    fprintf(stderr,"==%s %s %s %==\n",pszFormat,pszSource,pszDest);
    fflush(stderr);

    /* ================================================================= */
    /*      Create a virtual dataset.                                    */
    /* ================================================================= */
    VRTDataset *poVDS;
        
    /* ----------------------------------------------------------------- */
    /*      Make a virtual clone.                                        */
    /* ----------------------------------------------------------------- */
    poVDS = (VRTDataset *) VRTCreate( nOXSize, nOYSize );

    if( nGCPCount == 0 )
      {
        if( pszOutputSRS != NULL )
	  {
            poVDS->SetProjection( pszOutputSRS );
	  }
        else
	  {
            pszProjection = GDALGetProjectionRef( hDataset );
            if( pszProjection != NULL && strlen(pszProjection) > 0 )
	      poVDS->SetProjection( pszProjection );
	  }
      }

    if( bGotBounds )
      {
        adfGeoTransform[0] = adfULLR[0];
        adfGeoTransform[1] = (adfULLR[2] - adfULLR[0]) / nOXSize;
        adfGeoTransform[2] = 0.0;
        adfGeoTransform[3] = adfULLR[1];
        adfGeoTransform[4] = 0.0;
        adfGeoTransform[5] = (adfULLR[3] - adfULLR[1]) / nOYSize;

        poVDS->SetGeoTransform( adfGeoTransform );
      }

    else if( GDALGetGeoTransform( hDataset, adfGeoTransform ) == CE_None 
	     && nGCPCount == 0 )
      {
        adfGeoTransform[0] += anSrcWin[0] * adfGeoTransform[1]
	  + anSrcWin[1] * adfGeoTransform[2];
        adfGeoTransform[3] += anSrcWin[0] * adfGeoTransform[4]
	  + anSrcWin[1] * adfGeoTransform[5];
        
        adfGeoTransform[1] *= anSrcWin[2] / (double) nOXSize;
        adfGeoTransform[2] *= anSrcWin[3] / (double) nOYSize;
        adfGeoTransform[4] *= anSrcWin[2] / (double) nOXSize;
        adfGeoTransform[5] *= anSrcWin[3] / (double) nOYSize;
        
        poVDS->SetGeoTransform( adfGeoTransform );
      }

    if( nGCPCount != 0 )
      {
        const char *pszGCPProjection = pszOutputSRS;

        if( pszGCPProjection == NULL )
	  pszGCPProjection = GDALGetGCPProjection( hDataset );
        if( pszGCPProjection == NULL )
	  pszGCPProjection = "";

        poVDS->SetGCPs( nGCPCount, pasGCPs, pszGCPProjection );

        GDALDeinitGCPs( nGCPCount, pasGCPs );
        CPLFree( pasGCPs );
      }

    else if( GDALGetGCPCount( hDataset ) > 0 )
      {
        GDAL_GCP *pasGCPs;
        int       nGCPs = GDALGetGCPCount( hDataset );

        pasGCPs = GDALDuplicateGCPs( nGCPs, GDALGetGCPs( hDataset ) );

        for( i = 0; i < nGCPs; i++ )
	  {
            pasGCPs[i].dfGCPPixel -= anSrcWin[0];
            pasGCPs[i].dfGCPLine  -= anSrcWin[1];
            pasGCPs[i].dfGCPPixel *= (nOXSize / (double) anSrcWin[2] );
            pasGCPs[i].dfGCPLine  *= (nOYSize / (double) anSrcWin[3] );
	  }
            
        poVDS->SetGCPs( nGCPs, pasGCPs,
                        GDALGetGCPProjection( hDataset ) );

        GDALDeinitGCPs( nGCPs, pasGCPs );
        CPLFree( pasGCPs );
      }

    /* ----------------------------------------------------------------- */
    /*      Transfer generally applicable metadata.                      */
    /* ----------------------------------------------------------------- */
    poVDS->SetMetadata( ((GDALDataset*)hDataset)->GetMetadata() );
    AttachMetadata( (GDALDatasetH) poVDS, papszMetadataOptions );
    fprintf(stderr,"Transfer generally applicable metadata.\n");
    fflush(stderr);

    /* ----------------------------------------------------------------- */
    /*      Transfer metadata that remains valid if the spatial          */
    /*      arrangement of the data is unaltered.                        */
    /* ----------------------------------------------------------------- */
    if( anSrcWin[0] == 0 && anSrcWin[1] == 0 
        && anSrcWin[2] == GDALGetRasterXSize(hDataset)
        && anSrcWin[3] == GDALGetRasterYSize(hDataset) 
        && pszOXSize == NULL && pszOYSize == NULL )
      {
        char **papszMD;

        papszMD = ((GDALDataset*)hDataset)->GetMetadata("RPC");
        if( papszMD != NULL )
	  poVDS->SetMetadata( papszMD, "RPC" );
      }

    if (nRGBExpand != 0)
      nBandCount += nRGBExpand - 1;

    /* ================================================================= */
    /*      Process all bands.                                           */
    /* ================================================================= */
    for( i = 0; i < nBandCount; i++ )
      {
        VRTSourcedRasterBand   *poVRTBand;
        GDALRasterBand  *poSrcBand;
        GDALDataType    eBandType;

        if (nRGBExpand != 0 && i < nRGBExpand)
	  {
            poSrcBand = ((GDALDataset *) 
			 hDataset)->GetRasterBand(panBandList[0]);
            if (poSrcBand->GetColorTable() == NULL)
	      {
                fprintf(stderr, "Error : band %d has no color table\n", panBandList[0]);
                GDALClose( hDataset );
                CPLFree( panBandList );
		fflush(stderr);
		/**
		 * Avoiding GDALDestroyDriverManager() call
		 */
                CSLDestroy( papszCreateOptions );
                exit( 1 );
	      }
	  }
        else
	  poSrcBand = ((GDALDataset *) 
		       hDataset)->GetRasterBand(panBandList[i]);

	/* ------------------------------------------------------------ */
	/*      Select output data type to match source.                */
	/* ------------------------------------------------------------ */
        if( eOutputType == GDT_Unknown )
	  eBandType = poSrcBand->GetRasterDataType();
        else
	  eBandType = eOutputType;

	/* ------------------------------------------------------------ */
	/*      Create this band.                                       */
	/* ------------------------------------------------------------ */
        poVDS->AddBand( eBandType, NULL );
        poVRTBand = (VRTSourcedRasterBand *) poVDS->GetRasterBand( i+1 );
            
	/* ------------------------------------------------------------ */
	/*      Do we need to collect scaling information?              */
	/* ------------------------------------------------------------ */
        double dfScale=1.0, dfOffset=0.0;

        if( bScale && !bHaveScaleSrc )
	  {
            double	adfCMinMax[2];
            GDALComputeRasterMinMax( poSrcBand, TRUE, adfCMinMax );
            dfScaleSrcMin = adfCMinMax[0];
            dfScaleSrcMax = adfCMinMax[1];
	  }

        if( bScale )
	  {
            if( dfScaleSrcMax == dfScaleSrcMin )
	      dfScaleSrcMax += 0.1;
            if( dfScaleDstMax == dfScaleDstMin )
	      dfScaleDstMax += 0.1;

            dfScale = (dfScaleDstMax - dfScaleDstMin) 
	      / (dfScaleSrcMax - dfScaleSrcMin);
            dfOffset = -1 * dfScaleSrcMin * dfScale + dfScaleDstMin;
	  }

	/* ------------------------------------------------------------ */
	/*      Create a simple or complex data source depending on the */
	/*      translation type required.                              */
	/* ------------------------------------------------------------ */
        if( bScale || (nRGBExpand != 0 && i < nRGBExpand) )
	  {
            poVRTBand->AddComplexSource( poSrcBand,
                                         anSrcWin[0], anSrcWin[1], 
                                         anSrcWin[2], anSrcWin[3], 
                                         0, 0, nOXSize, nOYSize,
                                         dfOffset, dfScale,
                                         VRT_NODATA_UNSET,
                                         (nRGBExpand != 0 && i < nRGBExpand) ? i + 1 : 0 );
	  }
        else
	  poVRTBand->AddSimpleSource( poSrcBand,
				      anSrcWin[0], anSrcWin[1], 
				      anSrcWin[2], anSrcWin[3], 
				      0, 0, nOXSize, nOYSize );

        /* In case of color table translate, we only set the color interpretation */
        /* other info copied by CopyCommonInfoFrom are not relevant in RGB expansion */
        if (nRGBExpand != 0 && i < nRGBExpand)
	  {
            poVRTBand->SetColorInterpretation( (GDALColorInterp) (GCI_RedBand + i) );
	  }
        else
	  {
	    /* --------------------------------------------------------- */
	    /*      copy over some other information of interest.        */
	    /* --------------------------------------------------------- */
            poVRTBand->CopyCommonInfoFrom( poSrcBand );
	  }

	/* ------------------------------------------------------------- */
	/*      Set a forcable nodata value?                             */
	/* ------------------------------------------------------------- */
        if( bSetNoData )
	  poVRTBand->SetNoDataValue( dfNoDataReal );
      }

    /* ----------------------------------------------------------------- */
    /*      Write to the output file using CopyCreate().                 */
    /* ----------------------------------------------------------------- */
    fprintf(stderr,"DEBUG pszDest %s\n",pszDest);
    hOutDS = GDALCreateCopy( hDriver, pszDest, (GDALDatasetH) poVDS,
                             bStrict, papszCreateOptions, 
                             pfnProgress, NULL );
    fprintf(stderr,"DEBUG pszDest %s\n",pszDest);
    fflush(stderr);

    if( hOutDS != NULL )
      {
        GDALClose( hOutDS );
      }
    
    GDALClose( (GDALDatasetH) poVDS );
        
    GDALClose( hDataset );

    CPLFree( panBandList );
    
    CPLFree( pszOutputSRS );

    if( !bSubCall )
      {
        GDALDumpOpenDatasets( stderr );
	fflush(stderr);
	/**
	 * Avoiding GDALDestroyDriverManager() call
	 */
      }

    CSLDestroy( papszCreateOptions );
    
    setMapInMaps(outputs,"Result","value",(char*)pszDest);

    return SERVICE_SUCCEEDED;
  }


  /************************************************************************/
  /*                           AttachMetadata()                           */
  /************************************************************************/

  static void AttachMetadata( GDALDatasetH hDS, char **papszMetadataOptions )

  {
    int nCount = CSLCount(papszMetadataOptions);
    int i;

    for( i = 0; i < nCount; i++ )
      {
        char    *pszKey = NULL;
        const char *pszValue;
        
        pszValue = CPLParseNameValue( papszMetadataOptions[i], &pszKey );
        GDALSetMetadataItem(hDS,pszKey,pszValue,NULL);
        CPLFree( pszKey );
      }

    CSLDestroy( papszMetadataOptions );
  }

}
