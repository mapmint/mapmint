extern "C" {
#include "mapogcfilter.h"
#include <libxml/tree.h>
#include <libxml/parser.h>
#include <libxml/xpath.h>
#include <libxml/xpathInternals.h>
}
#include "cpl_error.h"
#include "ogr_api.h"
#include "service.h"
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
//#include "mapserver.h"
//#include "mapows.h"
//#include "cpl_minixml.h"
#ifdef WIN32
#include <windows.h>
#endif


extern "C" {
  void getLockOnMap4Layer(char* mname,char* lname){
    char *lockOnMap4Layer=(char*)malloc((strlen(mname)+strlen(lname)+5)*sizeof(char));
    sprintf(lockOnMap4Layer,"%s_%s.lck",mname,lname);
    struct stat file_status;
    int istat = stat(lockOnMap4Layer, &file_status);
    while(true){
      if(istat==0 && file_status.st_size>0){
#ifndef WIN32
	sleep(1);
#else
	Sleep(10);
#endif
	istat = stat(lockOnMap4Layer, &file_status);
	fprintf(stderr,"waiting for %s",lockOnMap4Layer);
	continue;
      }else{
	//create the file !!
	int f=open(lockOnMap4Layer,O_CREAT|O_TRUNC|O_RDWR,S_IWRITE | S_IREAD);
	write(f,"12\n",4*sizeof(char));
	close(f);
	return;
      }
    }
  };

  void releaseLockOnMap4Layer(char* mname,char* lname){
    char *lockOnMap4Layer=(char*)malloc((strlen(mname)+strlen(lname)+5)*sizeof(char));
    sprintf(lockOnMap4Layer,"%s_%s.lck",mname,lname);
    struct stat file_status;
    int istat = stat(lockOnMap4Layer, &file_status);
    if(istat==0 && file_status.st_size>0){
      unlink(lockOnMap4Layer);
    }
  };


#ifdef WIN32
__declspec(dllexport)
#endif
  int Transaction(maps*& conf,maps*& inputs,maps*& outputs){
 
    int hasLock=-1;
    map* tmp=getMapFromMaps(inputs,"MapFile","value");
    fprintf(stderr,"[ZOO-WFS-T:Service]>>Mapfile : %s\n",tmp->value);
    mapObj *mymap = msLoadMap(tmp->value, NULL);
    char *mname=strdup(tmp->value);
    char *lname=NULL;
    msApplyDefaultSubstitutions(mymap);
    fprintf(stderr,"[ZOO-WFS-T:Service]>>Shape Path : %s\n",mymap->shapepath);
    fprintf(stderr,"[ZOO-WFS-T:Service]>>Map Path : %s\n",mymap->mappath);
    tmp=getMapFromMaps(inputs,"Request","value");
    xmlInitParser();
    xmlDocPtr resDoc = xmlNewDoc(BAD_CAST "1.0");
    xmlNsPtr ns_wfs,ns_wfs1,ns_ogc,ns_xsi;
    xmlNodePtr n;
    ns_wfs=xmlNewNs(NULL,BAD_CAST "http://www.opengis.net/ows/1.1",BAD_CAST "wfs");
    n = xmlNewNode(ns_wfs, BAD_CAST "TransactionResponse");
    ns_wfs1=xmlNewNs(n,BAD_CAST "http://www.opengis.net/wfs",BAD_CAST "wfs");
    ns_ogc=xmlNewNs(n,BAD_CAST "http://www.opengis.net/ogc",BAD_CAST "ogc");
    ns_xsi=xmlNewNs(n,BAD_CAST "http://www.w3.org/2001/XMLSchema-instance",BAD_CAST "xsi");
    xmlNewProp(n,BAD_CAST "xsi:schemaLocation",BAD_CAST "http://www.opengis.net/wfs http://www.opengis.net//wfs/1.0.0/WFS-transaction.xsd");
    xmlNewProp(n,BAD_CAST "version",BAD_CAST "1.0.0");
    fprintf(stderr,"DEBUG (%s)",tmp->value);
    xmlDocPtr doc = xmlParseMemory(tmp->value,strlen(tmp->value));
    xmlBufferPtr xmlbuff;
    int buffersize;
    xmlXPathContextPtr xpathCtx;
    xmlXPathObjectPtr xpathObj;
    //char * xpathExpr="/*/*[local-name()='Insert']/*";
    char * xpathExpr="/*/*";
    xpathCtx = xmlXPathNewContext(doc);
    xpathObj = xmlXPathEvalExpression(BAD_CAST xpathExpr,xpathCtx);
    if(!xpathObj->nodesetval){
      fprintf( stderr,"[ZOO-WFS-T:Service]>>Request parsing failed.");
      return SERVICE_FAILED;
    }
    xmlbuff=xmlBufferCreate();
    int size = (xpathObj->nodesetval) ? xpathObj->nodesetval->nodeNr : 0;
    OGRRegisterAll();
    for(int k=0;k<size;k++){ 
      xmlNodePtr tmpx=xpathObj->nodesetval->nodeTab[k];
      if(tmpx->type==XML_ELEMENT_NODE && xmlStrcasecmp(BAD_CAST "Insert",tmpx->name)==0){
	tmpx=tmpx->children;
	layerObj *mylayer=NULL;
	OGRDataSourceH hDS=NULL;
	OGRLayerH olayer=NULL;
	char *featureid;
	xmlNodePtr n1=xmlNewNode(ns_wfs, BAD_CAST "InsertResult");
	while(tmpx!=NULL){
	  while(tmpx->type!=XML_ELEMENT_NODE)
	    tmpx=tmpx->next;
	  if(mylayer==NULL){
	    fprintf(stderr,"[ZOO-WFS-T:Service]>>Mylayer Name %s\n",tmpx->name);
	    mylayer=mymap->layers[msGetLayerIndex(mymap,(char*)tmpx->name)];
	    fprintf(stderr,"[ZOO-WFS-T:Service]>>Layer Type %s + %s + %d + %d (\"%s\")\n",mylayer->plugin_library,mylayer->plugin_library_original,mylayer->connectiontype,mylayer->type,mylayer->connection);
	    //featureid=msLookupHashTable(&mylayer->metadata,"gml_featureid");
	    featureid=msLookupHashTable(&mylayer->metadata,"ows_featureid");
	    fprintf( stderr,"[ZOO-WFS-T:Service]>>FeatureId Field : %s.\n",featureid);
	    char tmpDS[1024];
	    sprintf(tmpDS,"%s%s%s",mymap->mappath,mymap->shapepath,mylayer->connection);
	    fprintf( stderr,"[ZOO-WFS-T:Service]>>Trying to open %s.",tmpDS);
	    hDS = OGROpen( tmpDS, TRUE, NULL );
	    if( hDS == NULL ){
	      /**
	       * Need to create an error message here rather than returning service_failed !
	       */
	      fprintf( stderr,"[ZOO-WFS-T:Service]>>Open %s failed : %s.",tmpDS,CPLGetLastErrorMsg());
	      OGRReleaseDataSource( hDS );
	      return SERVICE_FAILED;
	    }else
	      fprintf( stderr,"[ZOO-WFS-T:Service]>>Open %s successfully.\n",tmpDS );
	    olayer=OGR_DS_GetLayer(hDS,0);
	  }
	  OGR_L_ResetReading(olayer);
	  OGRFeatureH hFeature;
	  xmlNodePtr cnode=tmpx->children;
	  xmlNodePtr gnode;
	  OGRGeometryH hGeometry;
	  hFeature = OGR_F_Create( OGR_L_GetLayerDefn( olayer ) );
	  while(cnode!=NULL){
	    if(cnode->type == XML_ELEMENT_NODE) {
	      if(xmlStrncmp(cnode->name,BAD_CAST "msGeometry",xmlStrlen(cnode->name))==0){
		const xmlChar *content;
		xmlBufferEmpty(xmlbuff);
		xmlNodePtr inode=cnode->children;
		while(inode->type==XML_TEXT_NODE)
		  inode=inode->next;
		if(xmlNodeDump(xmlbuff,doc,inode,0,1)<=0){
		  fprintf(stderr,"[ZOO-WFS-T:Service]>>Error dumping the geometry node");
		  return SERVICE_FAILED;
		}
		content = xmlBufferContent(xmlbuff);
		fprintf(stderr,"[ZOO-WFS-T:Service]>>Insert field value : %s=%s\n",cnode->name,content);
		char *geomContent=(char*)malloc((xmlStrlen(content)+1)*sizeof(char));
		sprintf(geomContent,"%s",content);
		hGeometry = OGR_G_CreateFromGML(geomContent);
		OGR_F_SetGeometry( hFeature, hGeometry );
		OGR_G_DestroyGeometry(hGeometry);
	      }
	      else{
		fprintf(stderr,"[ZOO-WFS-T:Service]>>Insert field value : %s=%s\n",cnode->name,cnode->children->content);
		OGRFeatureDefnH hFDefn;
		int iField;
		OGRGeometryH hGeometry;
		hFDefn = OGR_L_GetLayerDefn(olayer);
		int fid=OGR_F_GetFieldIndex(hFeature,(char*)cnode->name);
		xmlChar *cctmp=cnode->children->content;
		char *ctmp=(char*)malloc((xmlStrlen(cctmp)+1)*sizeof(char));
		sprintf(ctmp,"%s",cctmp);
		ctmp[xmlStrlen(cctmp)]=0;
		fprintf( stderr,"[ZOO-WFS-T:Service]>>Field %d : %s = %s\n", fid,cnode->name,ctmp );
		if(fid>=0){
		  OGRFieldDefnH hFieldDefn = OGR_FD_GetFieldDefn( hFDefn,fid);
		  if( OGR_Fld_GetType(hFieldDefn) == OFTInteger ){
		    OGR_F_SetFieldInteger( hFeature, fid, atoi(ctmp));
		    fprintf( stderr,"[ZOO-WFS-T:Service]>>Integer : %s = %d\n", ctmp,atoi(ctmp) );
		  }
		  else if( OGR_Fld_GetType(hFieldDefn) == OFTReal ){
		    OGR_F_SetFieldDouble( hFeature, fid, atof(ctmp));
		    fprintf( stderr,"[ZOO-WFS-T:Service]>>Double : %s = %3f\n", ctmp,atof(ctmp) );
		  }
		  else if( OGR_Fld_GetType(hFieldDefn) == OFTString ){
		    OGR_F_SetFieldString( hFeature, fid, ctmp);
		    fprintf( stderr,"[ZOO-WFS-T:Service]>>String : %s = %s\n", ctmp,ctmp );
		  }
		  else
		    fprintf( stderr,"[ZOO-WFS-T:Service]>>Unsupported field type : %s = \"%s\"\n", OGR_Fld_GetNameRef(hFieldDefn),cctmp );
		}
		else{
		  OGR_F_SetFID( hFeature, atoi(ctmp));		  
		  fprintf( stderr,"[ZOO-WFS-T:Service]>>Unsupported field name : %s \n", cnode->name );
		}
	      }
	    }
	    cnode=cnode->next;
	  }
	  if( OGR_L_CreateFeature( olayer, hFeature )!= OGRERR_NONE )
	    {
	      fprintf( stderr,"Failed to create feature in datasource.\n" );
	      return SERVICE_FAILED;
	    }
	  xmlNodePtr n2=xmlNewNode(ns_ogc, BAD_CAST "FeatureId");
	  char *sfid=(char*)malloc((strlen(mylayer->name)+strlen(OGR_F_GetFieldAsString( hFeature, OGR_F_GetFieldIndex(hFeature,featureid)))+2)*sizeof(char));
	  sprintf(sfid,"%s.%s",mylayer->name,OGR_F_GetFieldAsString( hFeature, OGR_F_GetFieldIndex(hFeature,featureid)));
	  xmlNewProp(n2,BAD_CAST "fid",BAD_CAST sfid);
	  xmlAddChild(n1,n2);
	  fprintf(stderr,"<ogc:FeatureId fid=\"%s.%s\"/>",mylayer->name,OGR_F_GetFieldAsString( hFeature, OGR_F_GetFieldIndex(hFeature,featureid)));
	  OGR_F_Destroy( hFeature );
	  //xmlFree(n2);
	  tmpx=tmpx->next;	  
	}
	//OGRReleaseDataSource( hDS );
	OGR_DS_Destroy( hDS );
	xmlAddChild(n,n1);
      }
      else if(tmpx->type==XML_ELEMENT_NODE && (xmlStrcasecmp(BAD_CAST "Delete",tmpx->name)==0 || xmlStrcasecmp(BAD_CAST "Update",tmpx->name)==0)){
	layerObj *mylayer=NULL;
	OGRDataSourceH hDS=NULL;
	OGRLayerH olayer=NULL;
	char *featureid;
	int fid,lid;
	char *rtype=(char*)tmpx->name;
	map *properties=NULL;
	lname=(char*)malloc((xmlStrlen(xmlGetProp(tmpx,BAD_CAST "typeName"))+1)*sizeof(char));
	sprintf(lname,"%s",(char*)xmlGetProp(tmpx,BAD_CAST "typeName"));
	fprintf(stderr,"[ZOO-WFS-T:Service]>>Layer Name %s\n",lname);
	if(hasLock<0){
	  getLockOnMap4Layer(mname,lname);
	  hasLock=1;
	}
	lid=msGetLayerIndex(mymap,lname);
	fprintf(stderr,"[ZOO-WFS-T:Service]>>Layer Name %s , id : %d\n",lname,lid);
	mylayer=GET_LAYER(mymap,lid);
	rectObj ext;
	msOWSGetLayerExtent(mymap,mylayer,"MO",&ext);
	mylayer->status=MS_ON;

     	fprintf(stderr,"[ZOO-WFS-T:Service]>>Layer (%d) Type %s + %s + %d + %d (\"%s\")\n",lid,mylayer->plugin_library,mylayer->plugin_library_original,mylayer->connectiontype,mylayer->type,mylayer->connection);
	//featureid=msLookupHashTable(&mylayer->metadata,"gml_featureid");
	featureid=msLookupHashTable(&mylayer->metadata,"ows_featureid");

	fprintf( stderr,"[ZOO-WFS-T:Service]>>FeatureId Field : %s.\n",featureid);
	//char tmpDS[1024];
	/*char *tmpDS=(char*)malloc((strlen(mymap->mappath)+strlen(mymap->shapepath)+strlen(mylayer->connection)+1)*sizeof(char));
	  sprintf(tmpDS,"%s%s%s",mymap->mappath,mymap->shapepath,mylayer->connection);*/
	/*char tmpDS[1024];
	char *tmpDS=(char*)malloc((strlen(mylayer->connection)+strlen(mylayer->connection)+1)*/
	fprintf( stderr,"[ZOO-WFS-T:Service]>>Trying to open %s.",mylayer->connection,mylayer->data);
	hDS = OGROpen( mylayer->connection, TRUE, NULL );
	if( hDS == NULL ) {
	  /**
	   * Need to create an error message here rather than returning service_failed !
	   */
	  fprintf( stderr,"[ZOO-WFS-T:Service]>>Open %s failed : %s.",mylayer->connection,CPLGetLastErrorMsg());
	  return SERVICE_FAILED;
	}else
	  fprintf( stderr,"[ZOO-WFS-T:Service]>>Open from %s %s successfully.\n",mylayer->connection , lname);

	olayer=OGR_DS_GetLayerByName(hDS,lname);
	if(olayer==NULL){
	  fprintf(stderr,"Layer not found !!");
	}
	OGR_L_ResetReading(olayer);
	OGRFeatureH hFeature;
	while( (hFeature = OGR_L_GetNextFeature(olayer)) != NULL ){
	  fid=OGR_F_GetFieldIndex(hFeature,featureid);
	  OGR_F_Destroy(hFeature);
	  break;
	}
	tmpx=tmpx->children;
	char *fclause=NULL;
	while(tmpx!=NULL){
	  fprintf(stderr,"Starting %d\n",tmpx==NULL);
	  if(tmpx->type==XML_ELEMENT_NODE)
	    fprintf(stderr,"%s\n",tmpx->name);
	  while(tmpx!=NULL && tmpx->type!=XML_ELEMENT_NODE)
	    tmpx=tmpx->next;
	  fprintf(stderr,"Starting %d\n",tmpx==NULL);
	  if(tmpx==NULL)
	    break;
	  if(tmpx->type==XML_ELEMENT_NODE)
	    fprintf(stderr,"%s\n",tmpx->name);
	  if(xmlStrcasecmp(tmpx->name,BAD_CAST "Filter")==0){
	    xmlBufferEmpty(xmlbuff);
	    if(xmlNodeDump(xmlbuff,doc,tmpx,0,0)<=0){
	      fprintf(stderr,"[ZOO-WFS-T:Service]>>Error dumping the filter node");
	      return SERVICE_FAILED;
	    }
	    const xmlChar *content = xmlBufferContent(xmlbuff);
	    //char *filter=(char*)malloc((xmlStrlen(content)+1)*sizeof(char));
	    char *realfilter=(char*)malloc((xmlStrlen(content)+1)*sizeof(char));
	    sprintf(realfilter,"%s",content);
	    FilterEncodingNode *fen=FLTParseFilterEncoding(realfilter);
	    mylayer->maxfeatures = -1;
	    //layer->startindex = -1;
	    fprintf(stderr,"[ZOO-WFS-T:Service]>>Filter on %s : %s (%d-%d)\n",mylayer->name,realfilter,lid,FLTValidFilterNode(fen));

	    if (!fen) {
	      // Need to output exception response
	      fprintf(stderr,"[ZOO-WFS-T:Service]>>FilterNode is null !\n",content);
	      return SERVICE_FAILED;
	    }

	    //lid=msGetLayerIndex(mymap,mylayer->name);
	    /* preparse the filter for gml aliases */
	    FLTPreParseFilterForAlias(fen, mymap, lid, "G");

	    /* run filter.  If no results are found, do not throw exception */
	    /* this is a null result */
	    if( FLTApplyFilterToLayer(fen, mymap, lid) != MS_SUCCESS ) 
	      {
		errorObj *ms_error = msGetErrorObj();
		fprintf(stderr, "[ZOO-WFS-T:Service]>> FLTApplyFilterToLayer() result : %s\n",ms_error->message);
		
		if(ms_error->code != MS_NOTFOUND)
		  {
		    fprintf(stderr, "[ZOO-WFS-T:Service]>> FLTApplyFilterToLayer() failed \n");
		  }
	      }
	    int j=0;
	    fprintf(stderr,"[ZOO-WFS-T:Service]>>Filter NumResult : %d\n",mylayer->resultcache->numresults);
	    for(j=0;j<mylayer->resultcache->numresults;j++){
	      shapeObj shape;
	      msInitShape(&shape);
	      //msLayerResultsGetShape(mylayer, &shape, -1, j);
	      //msLayerResultsGetShape(mylayer, &shape, -1, j);
	      msLayerGetShape(mylayer, &shape, &(mylayer->resultcache->results[j]));
	      if(fclause==NULL){
		fclause=(char*)malloc((strlen(featureid)+strlen(shape.values[fid])+1)*sizeof(char));
		sprintf(fclause,"%s=%s",featureid,shape.values[fid]);
	      }
	      else{
		char *stmp=strdup(fclause);
		fclause=(char*)realloc(fclause,(strlen(fclause)+strlen(featureid)+strlen(shape.values[fid])+6)*sizeof(char));
		sprintf(fclause,"%s OR %s=%s",stmp,featureid,shape.values[fid]);
		free(stmp);
	      }
	      fprintf(stderr,"[ZOO-WFS-T:Service]>>FCLAUSE %s\n",fclause);
	      fprintf(stderr,"[ZOO-WFS-T:Service]>>FeatureId (%s-%d) value : %s\n",featureid,fid,shape.values[fid]);
	    }
	    FLTFreeFilterEncodingNode(fen);
	    fen=NULL;
	  }
	  else if(xmlStrcasecmp(tmpx->name,BAD_CAST "Property")==0){
	    xmlNodePtr inode=tmpx->children;
	    char *name;
	    while(inode!=NULL){
	      fprintf(stderr,"[ZOO-WFS-T:Service]>> Type: %d (%d)\n",inode->type,XML_ELEMENT_NODE);
	      while(inode->type!=XML_ELEMENT_NODE)
		inode=inode->next;
	      if(xmlStrcasecmp(inode->name,BAD_CAST "Name")==0){
		name=strdup((char*)inode->children->content);
		fprintf(stderr,"[ZOO-WFS-T:Service]>>Name: %s\n",inode->children->content);
	      }
	      if(xmlStrcasecmp(inode->name,BAD_CAST "Value")==0){

		xmlNodePtr inode1=xmlFirstElementChild(inode);
		fprintf(stderr,"[ZOO-WFS-T:Service]>>(%s) Value: %s %d==%d\n",name,inode->children->content,inode->children->type,XML_ELEMENT_NODE);
		
		char *value;
		if(inode->children->type!=XML_ELEMENT_NODE && strncmp("msGeometry",name,10)!=0)
		  value=strdup((char*)inode->children->content);
		else{
		  fprintf(stderr,"DEBUG %d\n",xmlNodeDump(xmlbuff,doc,xmlFirstElementChild(inode),0,1));
		  if(xmlNodeDump(xmlbuff,doc,inode->children,0,1)<=0){
		    fprintf(stderr,"[ZOO-WFS-T:Service]>>Error dumping the geometry node");
		    return SERVICE_FAILED;
		  }
		  const xmlChar *content;
		  content = xmlBufferContent(xmlbuff);
		  fprintf(stderr,"[ZOO-WFS-T:Service]>>Updated Geometry value : %s=%s\n",inode->children->name,content);
		  value=(char*)malloc((xmlStrlen(content)+1)*sizeof(char));
		  sprintf(value,"%s",content);
		}
		
		if(properties==NULL){
		  properties=createMap(name,value);
		}
		else
		  addToMap(properties,name,value);
		//dumpMap(properties);

		free(name);
		free(value);
		inode=NULL;
		continue;
	      }
	      inode=inode->next;
	    }
	  }
	  tmpx=tmpx->next;
	}


	fprintf(stderr,"[ZOO-WFS-T:Service]>>Starting (%s)!\n",fclause);
	if(fclause!=NULL && OGR_L_SetAttributeFilter(olayer,fclause)==OGRERR_NONE){
	  fprintf(stderr,"[ZOO-WFS-T:Service]>>Starting!\n");
	  OGR_L_ResetReading(olayer);
	  if(strcasecmp("Delete",rtype)==0){
	    while( (hFeature = OGR_L_GetNextFeature(olayer)) != NULL ){
	      OGR_L_DeleteFeature(olayer,OGR_F_GetFID(hFeature));
	      OGR_F_Destroy(hFeature);
	    }
	  }else if(strcasecmp("Update",rtype)==0 && properties!=NULL){
	    while( (hFeature = OGR_L_GetNextFeature(olayer)) != NULL ) {
	      map *tmap=properties;
	      while(tmap!=NULL) {
		if(strcasecmp("msGeometry",tmap->name)!=0){
		  int fid=OGR_F_GetFieldIndex(hFeature,tmap->name);
		  OGR_F_SetFieldString(hFeature,fid,tmap->value);
		}else{
		  OGRGeometryH hGeometry = OGR_G_CreateFromGML(tmap->value);
		  OGR_F_SetGeometry( hFeature, hGeometry );
		  OGR_G_DestroyGeometry(hGeometry);
		}
		fprintf( stderr,"[ZOO-WFS-T:Service]>>Update : %s(%d) = %s\n", tmap->name,fid, tmap->value);
		tmap=tmap->next;
	      }
	      OGR_L_SetFeature(olayer,hFeature);
	    }
	    OGR_F_Destroy(hFeature);
	  }
	}
	fprintf(stderr,"[ZOO-WFS-T:Service]>>Finishing!\n");
	free(fclause);
	fclause=NULL;
	freeMap(&properties);
	free(properties);
	properties=NULL;
	
	OGR_DS_Destroy( hDS );
      }
    }
    xmlChar *xmlb;
    int bsize;
    xmlNodePtr n1=xmlNewNode(ns_wfs,BAD_CAST "TransactionResult");
    xmlNewProp(n1,BAD_CAST "handle",BAD_CAST "Transaction 01");
    xmlNodePtr n2=xmlNewNode(ns_wfs,BAD_CAST "Status");
    xmlNodePtr n3=xmlNewNode(ns_wfs,BAD_CAST "SUCCESS");
    xmlAddChild(n2,n3);
    xmlAddChild(n1,n2);
    xmlAddChild(n,n1);
    xmlDocSetRootElement(resDoc, n);
    xmlDocDumpFormatMemory(resDoc, &xmlb, &bsize, 1);

    addToMap(outputs->content,"value",(char*)xmlb);
    //outputs->next=NULL;
    xmlXPathFreeObject(xpathObj);
    xmlXPathFreeContext(xpathCtx); 
    xmlCleanupParser();
    if(lname!=NULL){
      releaseLockOnMap4Layer(mname,lname);
    }
    return SERVICE_SUCCEEDED;
  }
  
}
