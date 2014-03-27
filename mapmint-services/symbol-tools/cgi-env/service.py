# -*- coding: utf-8 -*-
###############################################################################
#  Author:   Gérald Fenoy, gerald.fenoy@cartoworks.com
#  Copyright (c) 2010-2014, Cartoworks Inc. 
############################################################################### 
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the "Software"),
#  to deal in the Software without restriction, including without limitation
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,
#  and/or sell copies of the Software, and to permit persons to whom the
#  Software is furnished to do so, subject to the following conditions:
# 
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
# 
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#  DEALINGS IN THE SOFTWARE.
################################################################################
import zoo

def getAllSymbolsForTTF(conf,inputs,outputs):
    import mapscript
    import sys,os
    mapfile=conf["main"]["dataPath"]+"/maps/project_"+inputs["map"]["value"]+".map"
    print >> sys.stderr,mapfile
    m=mapscript.mapObj(mapfile)
    for i in range(0,m.numlayers):
        m.removeLayer(0)
    from Cheetah.Template import Template

    if inputs.keys().count('ttf'):
        symbFile=conf["main"]["tmpPath"]+"/symbols_"+inputs["ttf"]["value"]+".sym"
        if inputs['ttf']['value']=="images":
            try:
                os.unlink(symbFile)
            except:
                pass
        try:
            f=open(symbFile,"r")
        except:
            t=Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/Symbols.sym.tmpl",searchList={"conf": conf,"inputs": inputs,"outputs": outputs})
            f=open(symbFile,"w")
            f.write(t.__str__())
        f.close()
        m.setSymbolSet(symbFile)
        mapfile=conf["main"]["dataPath"]+"/maps/map4symbols_"+inputs["ttf"]["value"]+".map"
    else:
        mapfile=conf["main"]["dataPath"]+"/maps/map4symbols_default.map"
    images=[]
    print >> sys.stderr,mapfile
    print >> sys.stderr,m.getNumSymbols()
    i=0
    while i < m.getNumSymbols():
        m.symbolset.getSymbol(i)
        print >> sys.stderr,mapfile
        symb=m.symbolset.getSymbol(i)
        print >> sys.stderr,symb.name
        if symb.name is not None and symb.name.count('polygon_')==0:
            l=m.getLayerByName("Symbol_"+symb.name)
            print >> sys.stderr,l
            if l is None:
                layer=mapscript.layerObj(m)
                layer.type=mapscript.MS_LAYER_POINT
                feature=mapscript.shapeObj(mapscript.MS_SHAPE_POINT)
                layer.addFeature(feature.fromWKT("POINT(0.001 0.001)"))
                layer.connection=None
                print >> sys.stderr, symb.name
                layer.name="Symbol_"+symb.name
                layer.data=None
                layer.tileitem=None
                layer.units=mapscript.MS_PIXELS
                layer.sizeunits=mapscript.MS_PIXELS
                layer.toleranceunits=mapscript.MS_PIXELS
                tmpClass=mapscript.classObj(layer)
                tmpClass.name="Symbol_"+symb.name+"0"
                tmpStyle=mapscript.styleObj(tmpClass)
                tmpStyle.updateFromString('STYLE COLOR 0 0 0 OUTLINECOLOR 225 225 225 SYMBOL "'+symb.name+'" SIZE 20 END')
                layer.status=True
                #img_name="Symbol_"+symb.name+".png"
                #m.setSize(24,24)
                #m.setExtent(0,0,0.002,0.002)
                #tmpImage=m.draw()#
                images+=[{"id": layer.name,"value": conf["main"]["mapserverAddress"]+"?map="+mapfile+"&LAYERS="+layer.name+"&SRS=EPSG%3A4326&amp;FORMAT=image%2Fpng&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&EXCEPTIONS=application%2Fvnd.ogc.se_inimage&BBOX=0,0,0.002,0.002&WIDTH=32&HEIGHT=32&format=png"}]
                #tmpImage=tmpClass.createLegendIcon(m,layer,32,32)
                #tmpImage.write(conf["main"]["dataPath"]+"/maps/"+img_name)
                #print >> sys.stderr,conf["main"]["dataPath"]+"/maps/"+img_name
        i+=1
    m.save(mapfile)

    t=Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/SymbolChooser.tmpl",searchList={"images": images,"inputs":inputs})
    outputs["Result"]["value"]=t.__str__()

    return 3

def addSymbolToOrig(conf,inputs,outputs):
    import sys
    from Cheetah.Template import Template
    f=open(conf["main"]["dataPath"]+"/symbols.sym","r")
    newContent=""
    str=f.read()
    f.close()
    i=0
    b=str.split('SYMBOL\n')
    for a in b:
        if a!="" and a!='\n':
            if i+1 < len(b):
                if newContent!="":
                    newContent+='SYMBOL\n'+a
                else:
                    newContent+=a
            else:
                print >> sys.stderr,a[:len(a)-4]
                newContent+='SYMBOL\n'+a[:len(a)-5]
            i+=1
    t=Template(file=conf["main"]["templatesPath"]+"/Manager/Styler/Symbols.sym.tmpl",searchList={"conf": conf,"inputs": inputs,"outputs": outputs})
    newContent+=t.__str__().replace('SYMBOLSET\n',"")
    f=open(conf["main"]["dataPath"]+"/symbols.sym","w")
    f.write(newContent)
    f.close()
    outputs["Result"]["value"]=zoo._("Symbol added.")
    return 3
