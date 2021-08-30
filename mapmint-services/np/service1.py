import zoo
import os
import shutil

def join(conf,inputs,outputs):
    filename=conf["main"]["tmpPath"]+"/"+conf["lenv"]["usid"]+"_local.db"
    fext=open(filename,"wb")
    for i in range(len(inputs["files"]["value"])):
        fo=open(inputs["files"]["value"][i],"rb")
        shutil.copyfileobj(fo, fext)
        fo.close()
    fext.close()
    outputs["Result"]["value"]=filename
    #conf["senv"]["last_ufile"]=filename
    #conf["senv"]["last_file"]=filename
    return zoo.SERVICE_SUCCEEDED
