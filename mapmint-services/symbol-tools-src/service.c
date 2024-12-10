// FreeTypeParser.cpp : définit le point d'entrée pour l'application console.
//

#ifdef WIN32
#endif
#include <ft2build.h>
#include <freetype/freetype.h>
#include FT_FREETYPE_H
#include "service.h"

FT_Library library; 
FT_Face face;

extern "C" {

#ifdef WIN32
__declspec(dllexport)
#endif
  int getSymbols(maps*& conf,maps*& inputs,maps*& outputs)
  {
    FT_Error error = FT_Init_FreeType( &library ); 
    map* tmpMap4Path=getMapFromMaps(conf,"main","dataPath");
    map* tmpMap=getMapFromMaps(inputs,"ttf","value");
    char ttfFile[1024];
    sprintf(ttfFile,"%s/fonts/%s",tmpMap4Path->value,tmpMap->value);
    char* pcaMessage=(char*) malloc((18+strlen(ttfFile))*sizeof(char));
    sprintf(pcaMessage,"File to open : %s",ttfFile);
    ZOO_DEBUG(pcaMessage);
    free(pcaMessage);
    error = FT_New_Face( library, ttfFile, 0, &face ); 
    if ( error == FT_Err_Unknown_File_Format ){ 
      setMapInMaps(conf,"lenv","message","Error unknow format");
      return SERVICE_FAILED;
    }
    else if ( error ) {
      setMapInMaps(conf,"lenv","message","Unable to load the specified file");
      return SERVICE_FAILED;
    }
    //int *charcodes=(int *)malloc(face->num_glyphs*sizeof(int));
  
  
    //printf("%d|",face->num_glyphs);

    int n;
    FT_CharMap found = 0; 
    FT_CharMap charmap; 
    int disp=0;
    char *charCodes=NULL;
    for ( n = 0; n < face->num_charmaps; n++ ) { 
      charmap = face->charmaps[n];
      //printf("\nplatform_id : %d ; encoding_id %d\n",charmap->platform_id,charmap->encoding_id);
      found = charmap; 
      error = FT_Set_Charmap( face, found ); 	

      FT_UInt  agindex;
      FT_ULong  charcode;
      charcode=FT_Get_First_Char(face,&agindex);
      int count=1;
      if(agindex==0){
	setMapInMaps(conf,"lenv","message","Unable to find anything in your font file");
	return SERVICE_FAILED;
      }
      else{
	char tmp[100];
	if(charCodes==NULL){
	  sprintf(tmp,"%d",charcode);
	  charCodes=(char*)malloc((strlen(tmp)+2)*sizeof(char));
	  sprintf(charCodes,"[%s",tmp);
	}else{
	  sprintf(tmp,",%d",charcode);
	  char *tmp2=strdup(charCodes);
	  charCodes=(char*)realloc(charCodes,(strlen(tmp2)+strlen(tmp)+1)*sizeof(char));
	  memcpy(charCodes+strlen(tmp2),tmp,strlen(tmp)+1);
	  free(tmp2);
	}

	while ( agindex != 0 )                                            
	  {   
	    charcode = FT_Get_Next_Char( face, charcode, &agindex );
	    if(agindex != 0 ){
	      char tmp1[100];
	      sprintf(tmp1,",%d",charcode);
	      char *tmp2=strdup(charCodes);
	      charCodes=(char*)realloc(charCodes,(strlen(tmp2)+strlen(tmp1)+1)*sizeof(char));
	      memcpy(charCodes+strlen(tmp2),tmp1,strlen(tmp1)+1);
	      free(tmp2);
	    }
	  }	
      }
    }
    char *tmp2=strdup(charCodes);
    charCodes=(char*)realloc(charCodes,(strlen(tmp2)+2)*sizeof(char));
    memcpy(charCodes+strlen(tmp2),"]",2);
    free(tmp2);
    //printf("\n**%s**\n",charCodes);
  
    setMapInMaps(outputs,"Result","value",charCodes);
    return SERVICE_SUCCEEDED;
  }

}
