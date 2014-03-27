import zoo
import os
import sys

def convert(conf,inputs,outputs):
    if list(conf.keys()).count("oo")>0 and list(conf["oo"].keys()).count("external")>0 and conf["oo"]["external"]=="true":
        from subprocess import Popen, PIPE
        process = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)
        script="import pp.PaperMint as PaperMint\n"
        script+="pm=PaperMint.LOClient()\n"
        script+="pm.loadDoc('"+inputs["oDoc"]["value"]+"')\n"
        docPath=conf["main"]["tmpPath"]+"/"+inputs["tDoc"]["value"]
        script+="pm.saveDoc('"+docPath+"')\n"
        script+="pm.unloadDoc('"+docPath+"')\n"
        process.stdin.write(script)
        process.stdin.close()
    else:
        import PaperMint
        pm=PaperMint.LOClient()
        pm.loadDoc(inputs["oDoc"]["value"])
        docPath=conf["main"]["tmpPath"]+"/"+inputs["tDoc"]["value"]
        pm.saveDoc(docPath)
        pm.unloadDoc(docPath)
    
    outputs["Result"]["value"]=open(docPath,"r").read()
    outputs["Result"]["mimeType"]=pm.outputFormat[pm.format][0]
    os.unlink(docPath)
    
    return zoo.SERVICE_SUCCEEDED

def addBgLayer(conf,m,size,zoomlevel,ext,typ="osm"):
    import json,mapscript,time,shutil
    delta=(100*(2**(18-zoomlevel)))
    ext0=json.dumps((float(ext[0])-delta,float(ext[3])+delta,float(ext[2])+delta,float(ext[1])-delta)).replace("[","").replace("]","").replace(" ","")
    hreq=conf["main"]["serverAddress"]+"?metapath=raster-tools&service=WPS&version=1.0.0&request=Execute&Identifier=translate&DataInputs=InputDSN=base_layers/mq-"+typ+".xml;OutputDSN=tmp_"+conf["senv"]["MMID"]+str(time.clock()).split(".")[1]+";Format=GTiff;OutSize="+str(size[0]*1.5)+","+str(size[1]*1.5)+";ProjWin="+ext0+"&RawDataOutput=Result&language="+conf["main"]["language"]
    import urllib2
    u = urllib2.urlopen(hreq)
    fName=u.read()
    fName1=fName.replace(".tif",str(time.clock()).split(".")[1]+".tif")
    shutil.move(fName,fName1)
    nl=mapscript.layerObj(m)
    nl.updateFromString('''LAYER 
 NAME "BaseLayerMap" 
 TYPE RASTER
 UNITS METERS
 STATUS ON
 DATA "'''+fName1+'''"
 PROCESSING "RESAMPLE=AVERAGE"
 PROJECTION 
   "init=epsg:900913"
 END
END''')
    ordon=()
    ordon+=((m.numlayers-1),)
    for a in range(0,m.numlayers-1):
        ordon+=(a,)
    m.setLayerOrder(ordon)
    
def preview(conf,inputs,outputs):
    import time
    _filename="tmp_"+str(time.clock()).split(".")[1]+".png"
    filename=conf["main"]["tmpPath"]+"/"+_filename
    error_msg=""
    try:
        resolution="16"
        if inputs.has_key("res"):
            resolution=inputs["res"]["value"]
        print >> sys.stderr,conf["oo"]["ghostscript"]+" -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dNOPAUSE -dBATCH -sDEVICE=png16m -r"+resolution+" -sOutputFile="+filename+" "+inputs["file"]["value"]+" 2> "+conf["main"]["tmpPath"]+"/polux.log > "+conf["main"]["tmpPath"]+"/polux1.log"
        os.system(conf["oo"]["ghostscript"]+" -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dNOPAUSE -dBATCH -sDEVICE=png16m -r"+resolution+" -sOutputFile="+filename+" "+inputs["file"]["value"]+" 2> "+conf["main"]["tmpPath"]+"/polux.log > "+conf["main"]["tmpPath"]+"/polux1.log")
        error_msg+=open(conf["main"]["tmpPath"]+"/polux1.log","r").read()
    except Exception,e:
        error_msg+=open(conf["main"]["tmpPath"]+"/polux.log","r").read()
        pass
    try:
        outputs["Result"]["value"]=open(filename,"rb").read()
        return zoo.SERVICE_SUCCEEDED
    except Exception,e:
        conf["lenv"]["message"]=error_msg+"\nUnable to open to generated preview: "+str(e)
        return zoo.SERVICE_FAILED
    
def printMap(conf,inputs,outputs):
    import sys
    if list(conf.keys()).count("oo")>0 and list(conf["oo"].keys()).count("external")>0 and conf["oo"]["external"]=="true":
        from subprocess import Popen, PIPE
        import json
        print >> sys.stderr,"Start"
        sys.stderr.flush()
        err_log = file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'w', 0)
        os.dup2(err_log.fileno(), sys.stderr.fileno())
        process = Popen([conf["oo"]["path"]],stdin=PIPE,stdout=PIPE)
        print >> sys.stderr,"Started"
        script=""
        if conf["senv"].has_key("prescr"):
            script+=conf["senv"]["prescr"]
        script+="import pp.PaperMint as PaperMint\n"
        print >> sys.stderr,"PaperMint) imported"        
    else:
        import PaperMint
    
    coeff=1;
    sizes={
        "preview": (1024*coeff,768*coeff),
        "A4l": (1024*coeff,768*coeff),
        "A4": (768*coeff,1024*coeff)
        }
    csize=sizes[inputs["iFormat"]["value"]]
    
    docPath=conf["main"]["tmpPath"]+"/"+conf["lenv"]["usid"]+"_"+inputs["tDoc"]["value"].replace('.pdf','.odt')
    if list(conf.keys()).count("oo")>0 and list(conf["oo"].keys()).count("external")>0 and conf["oo"]["external"]=="true":
        script+="pm=PaperMint.LOClient()\n"
        script+='pm.loadDoc("'+conf["main"]["dataPath"]+'/ftp/templates/MM-'+inputs["iFormat"]["value"]+'-template.odt")\n'
	script+='pm.saveDoc("'+docPath+'")\n'
        script+='pm.unloadDoc("'+conf["main"]["dataPath"]+'/ftp/templates/MM-'+inputs["iFormat"]["value"]+'-template.odt")\n'
	script+='pm.loadDoc("'+docPath+'")\n'
    else:
        pm=PaperMint.LOClient()
        # Load the document
        pm.loadDoc(conf["main"]["dataPath"]+"/ftp/templates/MM-"+inputs["iFormat"]["value"]+"-template.odt")
    
    # Load the map
    import mapscript
    mapfile=conf["main"]["dataPath"]+"/public_maps/project_"+inputs["map"]["value"]+".map"
    m=mapscript.mapObj(mapfile)
    if inputs["map"]["value"]=="indicateurs":
	import mapfile.service as mapfile
	mi=mapscript.mapObj(conf["main"]["dataPath"]+"/indexes_maps/project_PIndex"+conf["senv"]["last_index"]+".map")
	conf["senv"]["previous_map"]=conf["senv"]["last_map"]
	conf["senv"]["last_map"]="PIndex"+conf["senv"]["last_index"]
	#mapfile.saveLegendIconsForLayer(conf,m,m,ml,m.numlayers-1,prefix="indexes_");
	mapfile.saveLegendIcons(conf,mi,prefix="indexes_")
	ml=mi.getLayer(0).clone()
	ml.metadata.set("ows_title",inputs["index_name"]["value"])
	m.insertLayer(ml)
	conf["senv"]["last_map"]=conf["senv"]["previous_map"]
	inputs["layers"]["value"]+=","+str(m.numlayers-1)
    for i in range(m.numlayers):
        m.getLayer(i).status=mapscript.MS_OFF
    m.setProjection("init=epsg:900913")

    # Set activated layers to on
    layers=inputs["layers"]["value"].split(",")
    layerNames=[]
    script0=""
    print >> sys.stderr,"LAYERS:"+str(layers)
    nblayer=0
    for i in layers:
        if i!="":
            layer=m.getLayer(int(i))
            layer.status=mapscript.MS_ON
            print >> sys.stderr,layer.metadata.get("mmIcon")
            try:
		lname=layer.metadata.get("ows_title")
            except:
		lname=layer.name
            if layer.numclasses==1:
                if layer.metadata.get("mmIcon"):
                    ico=layer.metadata.get("mmIcon").replace(conf["main"]["tmpUrl"],conf["main"]["tmpPath"])
                try:
                    if layer.metadata.get("mmIcon"):
                        layerNames+=["[_"+layer.name+"_] "+lname]
                        script0+='pm.insertImageAt("[_'+layer.name+'_]","'+ico+'",True)\n'
                    else:
                        layerNames+=[" "+layer.name]
                except Exception,e:
                    print >> sys.stderr,e
                    if layer.metadata.get("mmIcon"):
                        layerNames+=["[_"+layer.name+"_] "+lname]
                        script0+='pm.insertImageAt("[_'+layer.name+'_]","'+ico+'",True)\n'
                    else:
                        layerNames+=[" "+layer.name]
            else:
                try:
                    toAppend=[m.getLayer(layer.index).metadata.get("ows_title")]
                except:
                    toAppend=[m.getLayer(layer.index).name]
                script0+="pm.nblayer="+str(nblayer)+"\n"
                for k in range(0,layer.numclasses):
                    if layer.metadata.get("mmIcon_"+str(k)):
                        toAppend+=["[_"+layer.name+"_"+str(k)+"_] "+layer.getClass(k).name]
                        ico=layer.metadata.get("mmIcon_"+str(k)).replace(conf["main"]["tmpUrl"],conf["main"]["tmpPath"])
                        script0+='pm.insertImageAt("[_'+layer.name+"_"+str(k)+'_]","'+ico+'",True)\n'
                    else:
                        toAppend+=[layer.getClass(k).name]
                layerNames+=toAppend
            nblayer+=1
    print >> sys.stderr,script0
    #We should use a BoundingBoxData here rather than simple string.
    ext=inputs["ext"]["value"].split(',')


    # Fix extent based on zoom Level
    if not(inputs.has_key("zoom")):
        import math
        n0=math.log((((20037508.34*2)*csize[0])/(256*(float(ext[2])-float(ext[0])))),2)
        m0=math.log(((20037508.34*csize[1])/(256*(float(ext[3])-float(ext[1])))),2)
        print >> sys.stderr,"+++++++++++++++++++++++++++++++++++++"
        if n0 > m0:
            zl=n0
            print >> sys.stderr,n0
        else:
            zl=m0
            print >> sys.stderr,m0
            #print >> sys.stderr,inputs["zoom"]["value"]
        print >> sys.stderr,"+++++++++++++++++++++++++++++++++++++"
    else:
        zl=int(inputs["zoom"]["value"])
    
    delta=(100*(2**(18-zl)))
    m.setExtent(float(ext[0])+delta,float(ext[1])+delta,float(ext[2])-delta,float(ext[3])-delta)

    # Fix size
    print >> sys.stderr,"OK"
    m.setSize(csize[0],csize[1])
    print >> sys.stderr,"OK"

    # Replace the Background Map image in the document template if any
    print >> sys.stderr,"OK"
    if inputs.has_key("bgMap"):
        print >> sys.stderr,"OK"
        nl=mapscript.layerObj(m)
        print >> sys.stderr,"OK"
        nl.updateFromString('''LAYER 
 NAME "BaseLayerMap" 
 TYPE RASTER
 UNITS METERS
 STATUS ON
 DATA "'''+inputs["bgMap"]["value"]+'''"
 PROCESSING "RESAMPLE=AVERAGE"
 PROJECTION 
   "init=epsg:900913"
 END
END''')
        print >> sys.stderr,"OK"
        ordon=()
        ordon+=((m.numlayers-1),)
        for a in range(0,m.numlayers-1):
            ordon+=(a,)
        m.setLayerOrder(ordon)
        print >> sys.stderr,"OK"

    # Draw the image and save it
    print >> sys.stderr,"Draw"
    i=m.draw()
    print >> sys.stderr,"OK"
    import time
    savedImage=conf["main"]["tmpPath"]+"/print_"+conf["senv"]["MMID"]+"_"+str(time.clock()).split(".")[1]+".png"
    print >> sys.stderr,"OK"
    try:
        os.unlink(savedImage)
    except:
        pass
    i.save(savedImage)
    print >> sys.stderr,"OK image was drawn"


    if list(conf.keys()).count("oo")>0 and list(conf["oo"].keys()).count("external")>0 and conf["oo"]["external"]=="true":
        script+='pm.searchAndReplaceImage("Map","'+savedImage+'")\n'
        script+='pm.searchAndReplace("[_map_title_]","'+m.web.metadata.get("mmTitle")+'")\n'
        script+='pm.addList("[_Legend_]",'+json.dumps(layerNames,ensure_ascii=False)+' )\n'
	script+='pm.saveDoc("'+docPath.replace('.odt','_0.odt')+'")\n'
        script+=script0
    else:
        # Replace the Map image in the document template
        pm.searchAndReplaceImage("Map",savedImage)
    
        # Replace the map_title field with Project Name
        pm.searchAndReplace("[_map_title_]",m.web.metadata.get("mmTitle"))

        # Replace the Legend field with Project Name
        pm.addList("[_Legend_]",layerNames)

    # Save the document
    docPath1=conf["main"]["tmpPath"]+"/"+conf["lenv"]["usid"]+"_"+inputs["tDoc"]["value"]
    if list(conf.keys()).count("oo")>0 and list(conf["oo"].keys()).count("external")>0 and conf["oo"]["external"]=="true":
        script+='pm.saveDoc("'+docPath1+'")\n'
        script+='pm.unloadDoc("'+docPath+'")\n'
        try:
            print >> sys.stderr,"Run"
            print >> sys.stderr,script
            process.stdin.write(script)
            print >> sys.stderr,"Run"
            sys.stderr.flush()
            process.stdin.close()
            print >> sys.stderr,"Run"
            sys.stderr.flush()
            process.wait()
            conf["lenv"]["message"]=str(process.stdout.readline())
            sys.stderr.flush()
            #sys.stderr.close()
            err_log=file(conf["main"]["tmpPath"]+'/tmp_err_log_file', 'r', 0)
            conf["lenv"]["message"]+=str(err_log.read())
        except Exception,e:
            conf["lenv"]["message"]="Unable to print your document :"+str(e)
            return zoo.SERVICE_FAILED
    else:
        pm.saveDoc(docPath)
        pm.unloadDoc(conf["main"]["dataPath"]+"/ftp/templates/MM-"+inputs["iFormat"]["value"]+"-template.odt")
    
    outputs["Result"]["value"]=open(docPath1,"rb").read()
    #outputs["Result"]["mimeType"]=pm.outputFormat[pm.format][0]
    #os.unlink(docPath)
    
    return 3


