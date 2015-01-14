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
import sys

def getForm(conf,inputs,outputs):
    import datastores.service as ds
    import mm_access
    ds.list(conf,inputs,outputs)
    elements=eval(outputs["Result"]["value"])
    dirs=[]
    j=0
    for i in range(0,len(elements["Directories"])):
        print >> sys.stderr,elements["Directories"][i]["name"]+" rwx"
        if mm_access.checkDataStorePriv(conf,elements["Directories"][i]["name"],"rwx"):
            dirs+=[elements["Directories"][i]["name"]]
        j+=1
    import template.service as tmpl    
    inputs1=inputs
    inputs1["tmpl"]={"value":inputs["form"]["value"]}
    inputs1["dirs"]=dirs
    tmpl.display(conf,inputs1,outputs)
    return 3

def saveOnServer(conf,inputs,outputs):
    import shutil
    print >> sys.stderr,"ok1 "+str(inputs)
    dir=conf["main"]["tmpPath"]+"/data_tmp_1111"+conf["senv"]["MMID"]
    try:
        shutil.os.mkdir(dir)
    except Exception,e:
        print >> sys.stderr,str(e)
        pass
    field="file"
    if inputs.has_key("filename"):
        field=inputs["filename"]["value"]
    print >> sys.stderr,"ok2 "+str(inputs)
    tmp=inputs[field]["lref"].split("/")
    print >> sys.stderr,"ok3 "+str(inputs)
    outFileName=dir+"/"+tmp[len(tmp)-1]
    print >> sys.stderr,"ok4 "+str(inputs)
    shutil.move(inputs[field]["lref"],outFileName);
    conf["senv"]["last_file"]=outFileName
    conf["senv"]["last_ufile"]=outFileName
    import mmsession
    mmsession.save(conf)
    print >> sys.stderr,"ok5 "+str(inputs)
    outputs["Result"]["value"]="Your "+tmp[len(tmp)-1]+" file was uploaded on the server"
    print >> sys.stderr,"ok6 "+str(inputs)
    return 3


def checkFile(conf,inputs,outputs):
    import shutil
    import osgeo.gdal
    import osgeo.ogr
    dir=conf["main"]["tmpPath"]+"/data_tmp_1111"+conf["senv"]["MMID"]
    accepted=[]
    anames=[]
    dnames=[]
    deleted=[]
    tmp=shutil.os.listdir(dir)
    for i in range(0,len(tmp)):
        tmp1=tmp[i].split(".")
        t=None
        for j in range(0,len(accepted)):
            print >> sys.stderr,"Accepted / tmp1"
            print >> sys.stderr,anames
            print >> sys.stderr,tmp1
            if tmp1[0] == anames[j].split(".")[0]:
                print >> sys.stderr,"OK"
                t="OK"
                break
        if t is None:
            t=osgeo.ogr.Open(dir+"/"+tmp[i])
        if t is None:
            t=osgeo.gdal.Open(dir+"/"+tmp[i])
            if t is not None:
                b=t.GetRasterBand(0)
                t=b
        if t is None:
            deleted+=[i]
            dnames+=[tmp[i]]
        else:
            accepted+=[i]
            anames+=[tmp[i]]


    k=0
    i=len(deleted)-1
    print >> sys.stderr,str(deleted)+" "+str(dnames)
    while i>=0:
        for j in range(0,len(accepted)):
            if len(dnames)>i and anames[j].split(".")[0] == dnames[i].split(".")[0]:
                accepted+=[deleted[i]]
                anames+=[dnames[i]]
                deleted.pop(i)
                dnames.pop(i)
        i-=1

    deletedList=[]
    for i in range(0,len(deleted)):
        try:
            shutil.os.unlink(dir+"/"+tmp[deleted[i]])
        except:
            pass
        deletedList+=[tmp[deleted[i]]]

    acceptedList=[]
    for i in range(0,len(accepted)):
        print >> sys.stderr,i
        #try:
        shutil.move(dir+"/"+tmp[accepted[i]],conf["main"]["dataPath"]+"/dirs/"+inputs["dest"]["value"]+"/"+tmp[accepted[i]])
        acceptedList+=[tmp[accepted[i]]]
        #except:
        #    deletedList+=[tmp[accepted[i]]]

    try:
        shutil.os.unlink(conf["main"]["dataPath"]+"/dirs/"+inputs["dest"]["value"]+"/ds_ows.map")
    except:
        pass
    try:
        shutil.os.rmdir(dir)
    except:
        pass
    
    outputs["Result"]["value"]=str({"accepted": acceptedList,"refused": deletedList})
    return 3
