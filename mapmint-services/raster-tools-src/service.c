/******************************************************************************
 * $Id$
 *
 * Project:  MapMint
 * Purpose:  Commandline App to build tile index for raster files.
 * Author:   Frank Warmerdam, warmerdam@pobox.com
 *
 ******************************************************************************
 * Copyright (c) 2001, Frank Warmerdam, DM Solutions Group Inc
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

#include <dirent.h>
#include <fcntl.h>
#include "ogr_api.h"
#include "ogr_srs_api.h"
#include "gdal.h"
#include "cpl_port.h"
#include "cpl_conv.h"
#include "cpl_string.h"

#include "service.h"
#include "service_internal.h"
#include "mapserver.h"
#include "maptree.h"

CPL_CVSID("$Id$");

extern "C" {
  /************************************************************************/
  /*                                main()                                */
  /************************************************************************/

#ifdef WIN32
__declspec(dllexport)
#endif
  int tindex(maps*& conf, maps*& inputs,maps*& outputs)
  {
    char *index_filename = NULL;
    const char *tile_index = "location";
    int		i_arg, ti_field;
    OGRDataSourceH hTileIndexDS;
    OGRLayerH hLayer = NULL;
    OGRFeatureDefnH hFDefn;
    int write_absolute_path = FALSE;
    char* current_path = NULL;
    int i;
    int nExistingFiles;
    int skip_different_projection = FALSE;
    char** existingFilesTab = NULL;
    int alreadyExistingProjectionRefValid = FALSE;
    char* alreadyExistingProjectionRef = NULL;
    char* index_filename_mod;
    int bExists;
    VSIStatBuf sStatBuf;

    /* Check that we are running against at least GDAL 1.4 */
    /* Note to developers : if we use newer API, please change the requirement */
    if (atoi(GDALVersionInfo("VERSION_NUM")) < 1400)
      {
	char tmp[1024];
        sprintf(tmp, "At least, GDAL >= 1.4.0 is required for this version of"
		"tindex, which was compiled against GDAL %s\n", GDAL_RELEASE_NAME);
        return SERVICE_FAILED;
      }

    GDALAllRegister();
    OGRRegisterAll();


    /* -------------------------------------------------------------------- */
    /*      Get the directory name to search for raster file to index.      */
    /* -------------------------------------------------------------------- */
    char *tmpDataDir;
    char *pszDataDir;
    map* tmpMap=getMapFromMaps(conf,"main","isTrial");      
    map* tmpMap1=getMapFromMaps(conf,"main","dataPath");
    map* tmpInputMap=getMapFromMaps(inputs,"dir","value");
    if(tmpMap!=NULL && strcasecmp(tmpMap->value,"true")==0){
      pszDataDir=(char*) malloc((strlen(tmpInputMap->value)+strlen(tmpMap1->value)+5+1)*sizeof(char));
      sprintf(pszDataDir,"%s/ftp/%s",tmpMap1->value,tmpInputMap->value);
    }else{
      pszDataDir=(char*) malloc(((strlen(tmpInputMap->value)+1)*sizeof(char)));
      sprintf(pszDataDir,"%s",tmpInputMap->value);
    }
    
    tmpMap=getMapFromMaps(inputs,"iname","value");
    tmpMap1=getMapFromMaps(inputs,"idir","value");
    map* tmpMap2=getMapFromMaps(conf,"main","dataPath");
    if(tmpMap!=NULL && tmpMap1!=NULL && tmpMap2!=NULL){
      index_filename = (char*) malloc((strlen(tmpMap->value)+strlen(tmpMap1->value)+strlen(tmpMap2->value)+12)*sizeof(char));
      sprintf(index_filename,"%s/dirs/%s/%s.shp",tmpMap2->value,tmpMap1->value,tmpMap->value);
    }
    fprintf(stderr,"Filename %s\n",index_filename);
    /* -------------------------------------------------------------------- */
    /*      Open or create the target shapefile and DBF file.               */
    /* -------------------------------------------------------------------- */
    index_filename_mod = CPLStrdup(CPLResetExtension(index_filename, "shp"));

    bExists = (VSIStat(index_filename_mod, &sStatBuf) == 0);
    if (!bExists)
      {
        CPLFree(index_filename_mod);
        index_filename_mod = CPLStrdup(CPLResetExtension(index_filename, "SHP"));
        bExists = (VSIStat(index_filename_mod, &sStatBuf) == 0);
      }
    CPLFree(index_filename_mod);

    if (bExists)
      {
        hTileIndexDS = OGROpen( index_filename, TRUE, NULL );
        if (hTileIndexDS != NULL)
	  {
            hLayer = OGR_DS_GetLayer(hTileIndexDS, 0);
	  }
      }
    else
      {
        OGRSFDriverH hDriver;
        const char* pszDriverName = "ESRI Shapefile";

        fprintf( stderr,"Creating new index file...\n" );
        hDriver = OGRGetDriverByName( pszDriverName );
        if( hDriver == NULL )
	  {
	    char msg[1024];
            sprintf( msg, "%s driver not available.", pszDriverName );
	    setMapInMaps(conf,"lenv","message",msg);
	    return SERVICE_FAILED;
	  }

        hTileIndexDS = OGR_Dr_CreateDataSource( hDriver, index_filename, NULL );
        if (hTileIndexDS)
	  {
            char* pszLayerName = CPLStrdup(CPLGetBasename(index_filename));
            OGRSpatialReferenceH hSpatialRef = NULL;
            GDALDatasetH hDS = GDALOpen( index_filename, GA_ReadOnly );
            if (hDS)
	      {
                const char* pszWKT = GDALGetProjectionRef(hDS);
                if (pszWKT != NULL && pszWKT[0] != '\0')
		  {
                    hSpatialRef = OSRNewSpatialReference(pszWKT);
		  }
                GDALClose(hDS);
	      }

	    DIR *dirp = opendir(pszDataDir);
	    if(dirp==NULL){
	      char tmp1[1024];
	      sprintf(tmp1,_ss("The specified path %s doesn't exist."),pszDataDir);
	      setMapInMaps(conf,"lenv","message",tmp1);
	      return SERVICE_FAILED;
	    }
	    char *res=NULL;
	    struct dirent *dp;
	    tmpMap=getMapFromMaps(inputs,"ext","value");
	    char *ext;
	    if(tmpMap!=NULL)
	      ext=tmpMap->value;
	    while ((dp = readdir(dirp)) != NULL){
	      if(strncmp(dp->d_name,".",1)!=0&&strncmp(dp->d_name,"..",2)!=0){
		char* argv=(char*) malloc((strlen(dp->d_name)+strlen(pszDataDir)+2)*sizeof(char));
		sprintf(argv,"%s/%s",pszDataDir,dp->d_name);
		GDALDatasetH hDS0 = GDALOpen( argv, GA_ReadOnly );
		if (hDS0)
		  {
		    const char* pszWKT = GDALGetProjectionRef(hDS0);
		    fprintf(stderr,"SRS %s \n",pszWKT);
		    if (pszWKT != NULL && pszWKT[0] != '\0')
		      {
			if (hSpatialRef)
			  OSRRelease(hSpatialRef);
			hSpatialRef = OSRNewSpatialReference(pszWKT);
		      }
		    GDALClose(hDS);
		  }
		break;
	      }
	    }
	    closedir(dirp);
            hLayer = OGR_DS_CreateLayer( hTileIndexDS, pszLayerName, hSpatialRef, wkbPolygon, NULL );
            CPLFree(pszLayerName);
            if (hSpatialRef)
	      OSRRelease(hSpatialRef);

            if (hLayer)
	      {
                OGRFieldDefnH hFieldDefn = OGR_Fld_Create( tile_index, OFTString );
                OGR_Fld_SetWidth( hFieldDefn, 255);
                OGR_L_CreateField( hLayer, hFieldDefn, TRUE );
                OGR_Fld_Destroy(hFieldDefn);
	      }
	  }
      }

    if( hTileIndexDS == NULL || hLayer == NULL )
      {
	char msg[1024];
        sprintf( msg, "Unable to open/create shapefile `%s'.", 
                 index_filename );
	setMapInMaps(conf,"lenv","message",msg);
      }

    hFDefn = OGR_L_GetLayerDefn(hLayer);

    for( ti_field = 0; ti_field < OGR_FD_GetFieldCount(hFDefn); ti_field++ )
      {
        OGRFieldDefnH hFieldDefn = OGR_FD_GetFieldDefn( hFDefn, ti_field );
        if( strcmp(OGR_Fld_GetNameRef(hFieldDefn), tile_index) == 0 )
	  break;
      }

    if( ti_field == OGR_FD_GetFieldCount(hFDefn) )
      {
	char msg[1024];
        sprintf( msg, "Unable to find field `%s' in DBF file `%s'.\n", 
                 tile_index, index_filename );
	setMapInMaps(conf,"lenv","message",msg);
	return SERVICE_FAILED;
      }

    /* Load in memory existing file names in SHP */
    nExistingFiles = OGR_L_GetFeatureCount(hLayer, FALSE);
    if (nExistingFiles)
      {
        OGRFeatureH hFeature;
        existingFilesTab = (char**)CPLMalloc(nExistingFiles * sizeof(char*));
        for(i=0;i<nExistingFiles;i++)
	  {
            hFeature = OGR_L_GetNextFeature(hLayer);
            existingFilesTab[i] = CPLStrdup(OGR_F_GetFieldAsString( hFeature, ti_field ));
            if (i == 0)
	      {
                GDALDatasetH hDS = GDALOpen(existingFilesTab[i], GA_ReadOnly );
                if (hDS)
		  {
                    alreadyExistingProjectionRefValid = TRUE;
                    alreadyExistingProjectionRef = CPLStrdup(GDALGetProjectionRef(hDS));
                    GDALClose(hDS);
		  }
	      }
            OGR_F_Destroy( hFeature );
	  }
      }

    if (write_absolute_path)
      {
        current_path = CPLGetCurrentDir();
        if (current_path == NULL)
	  {
            fprintf( stderr, "This system does not support the CPLGetCurrentDir call. "
		     "The option -write_absolute_path will have no effect\n");
            write_absolute_path = FALSE;
	  }
      }

      
    /* -------------------------------------------------------------------- */
    /*      loop over GDAL files, processing.                               */
    /* -------------------------------------------------------------------- */
    DIR *dirp = opendir(pszDataDir);
    if(dirp==NULL){
      char tmp1[1024];
      sprintf(tmp1,_ss("The specified path %s doesn't exist."),pszDataDir);
      setMapInMaps(conf,"lenv","message",tmp1);
      return SERVICE_FAILED;
    }
    char *res=NULL;
    struct dirent *dp;
    tmpMap=getMapFromMaps(inputs,"ext","value");
    char *ext;
    if(tmpMap!=NULL)
      ext=tmpMap->value;
    while ((dp = readdir(dirp)) != NULL){
      
      if(strlen(dp->d_name)>2 && strstr(dp->d_name,".")!=0 && strstr(dp->d_name,ext)>0){
	char* argv=(char*) malloc((strlen(dp->d_name)+strlen(pszDataDir)+2)*sizeof(char));
	sprintf(argv,"%s/%s",pszDataDir,dp->d_name);


        GDALDatasetH	hDS;
        double	        adfGeoTransform[6];
        double		adfX[5], adfY[5];
        int		nXSize, nYSize;
        char* fileNameToWrite;
        const char* projectionRef;
        VSIStatBuf sStatBuf;
        int k;
        OGRFeatureH hFeature;
        OGRGeometryH hPoly, hRing;

        /* Make sure it is a file before building absolute path name */
        if (write_absolute_path && CPLIsFilenameRelative( argv ) &&
            VSIStat( argv, &sStatBuf ) == 0)
	  {
            fileNameToWrite = CPLStrdup(CPLProjectRelativeFilename(current_path, argv));
	  }
        else
	  {
            fileNameToWrite = CPLStrdup(argv);
	  }

        /* Checks that file is not already in tileindex */
        for(i=0;i<nExistingFiles;i++)
	  {
            if (EQUAL(fileNameToWrite, existingFilesTab[i]))
	      {
                fprintf(stderr, "File %s is already in tileindex. Skipping it.\n",
                        fileNameToWrite);
                break;
	      }
	  }
        if (i != nExistingFiles)
	  {
            CPLFree(fileNameToWrite);
            continue;
	  }

        hDS = GDALOpen( argv, GA_ReadOnly );
        if( hDS == NULL )
	  {
            fprintf( stderr, "Unable to open %s, skipping.\n", 
                     argv );
            CPLFree(fileNameToWrite);
	    continue;
	  }

        GDALGetGeoTransform( hDS, adfGeoTransform );
        if( adfGeoTransform[0] == 0.0 
            && adfGeoTransform[1] == 1.0
            && adfGeoTransform[3] == 0.0
            && ABS(adfGeoTransform[5]) == 1.0 )
	  {
            fprintf( stderr, 
                     "It appears no georeferencing is available for\n"
                     "`%s', skipping.\n", 
                     argv );
            GDALClose( hDS );
            CPLFree(fileNameToWrite);
            continue;
	  }

        projectionRef = GDALGetProjectionRef(hDS);
        if (alreadyExistingProjectionRefValid)
	  {
            int projectionRefNotNull, alreadyExistingProjectionRefNotNull;
            projectionRefNotNull = projectionRef && projectionRef[0];
            alreadyExistingProjectionRefNotNull = alreadyExistingProjectionRef && alreadyExistingProjectionRef[0];
            if ((projectionRefNotNull &&
                 alreadyExistingProjectionRefNotNull &&
                 EQUAL(projectionRef, alreadyExistingProjectionRef) == 0) ||
                (projectionRefNotNull != alreadyExistingProjectionRefNotNull))
	      {
                fprintf(stderr, "Warning : %s is not using the same projection system as "
			"other files in the tileindex. This may cause problems when "
			"using it in MapServer for example.%s\n", argv,
			(skip_different_projection) ? " Skipping it" : "");
                if (skip_different_projection)
		  {
                    CPLFree(fileNameToWrite);
                    GDALClose( hDS );
                    continue;
		  }
	      }
	  }
        else
	  {
            alreadyExistingProjectionRefValid = TRUE;
            alreadyExistingProjectionRef = CPLStrdup(projectionRef);
	  }

        nXSize = GDALGetRasterXSize( hDS );
        nYSize = GDALGetRasterYSize( hDS );
        
        adfX[0] = adfGeoTransform[0] 
	  + 0 * adfGeoTransform[1] 
	  + 0 * adfGeoTransform[2];
        adfY[0] = adfGeoTransform[3] 
	  + 0 * adfGeoTransform[4] 
	  + 0 * adfGeoTransform[5];
        
        adfX[1] = adfGeoTransform[0] 
	  + nXSize * adfGeoTransform[1] 
	  + 0 * adfGeoTransform[2];
        adfY[1] = adfGeoTransform[3] 
	  + nXSize * adfGeoTransform[4] 
	  + 0 * adfGeoTransform[5];
        
        adfX[2] = adfGeoTransform[0] 
	  + nXSize * adfGeoTransform[1] 
	  + nYSize * adfGeoTransform[2];
        adfY[2] = adfGeoTransform[3] 
	  + nXSize * adfGeoTransform[4] 
	  + nYSize * adfGeoTransform[5];
        
        adfX[3] = adfGeoTransform[0] 
	  + 0 * adfGeoTransform[1] 
	  + nYSize * adfGeoTransform[2];
        adfY[3] = adfGeoTransform[3] 
	  + 0 * adfGeoTransform[4] 
	  + nYSize * adfGeoTransform[5];
        
        adfX[4] = adfGeoTransform[0] 
	  + 0 * adfGeoTransform[1] 
	  + 0 * adfGeoTransform[2];
        adfY[4] = adfGeoTransform[3] 
	  + 0 * adfGeoTransform[4] 
	  + 0 * adfGeoTransform[5];

        hFeature = OGR_F_Create( OGR_L_GetLayerDefn( hLayer ) );
        OGR_F_SetFieldString( hFeature, ti_field, fileNameToWrite );

        hPoly = OGR_G_CreateGeometry(wkbPolygon);
        hRing = OGR_G_CreateGeometry(wkbLinearRing);
        for(k=0;k<5;k++)
	  OGR_G_SetPoint_2D(hRing, k, adfX[k], adfY[k]);
        OGR_G_AddGeometryDirectly( hPoly, hRing );
        OGR_F_SetGeometryDirectly( hFeature, hPoly );

        if( OGR_L_CreateFeature( hLayer, hFeature ) != OGRERR_NONE )
	  {
	    fprintf( stderr, "Failed to create feature in shapefile.\n" );
	    break;
	  }

        OGR_F_Destroy( hFeature );

        
        CPLFree(fileNameToWrite);

        GDALClose( hDS );
      }
    }
    
    CPLFree(current_path);
    
    if (nExistingFiles)
      {
        for(i=0;i<nExistingFiles;i++)
	  {
            CPLFree(existingFilesTab[i]);
	  }
        CPLFree(existingFilesTab);
      }
    CPLFree(alreadyExistingProjectionRef);

    OGR_DS_Destroy( hTileIndexDS );
    
    GDALDestroyDriverManager();
    //OGRCleanupAll();
    setMapInMaps(outputs,"Result","value","Tile index successfully created.");
    //CSLDestroy(argv);
    
    return SERVICE_SUCCEEDED;
  } 
}
