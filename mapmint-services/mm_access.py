import sys

mmatypes=["r","w","x"]

def getGroup(conf):
    if conf["senv"].has_key("group"):
        group=conf["senv"]["group"]
    else:
        group="public"
    return group.split(',')

def checkMapNavPriv(conf,map,navId):
    groups=getGroup(conf)
    tmp=map.web.metadata.get("mm_access_nav")
    if tmp is not None:
        tmp1=tmp.split("|")
        tmp=[]
        navIds=conf["mm"]["navId"].split(',')
        for i in tmp1:
            tmp+=[i.split(",")]
        tmp0=map.web.metadata.get("mm_access_groups").split(",")
        for group in groups:
            try: 
                return tmp[tmp0.index(group)][navIds.index(navId)]=="1"
            except:
                pass
    else:
        return True
    return False
    
def checkMapPriv(conf,map):
    groups=getGroup(conf)
    tmp=None
    if map.web.metadata.numitems>0:
        tmp=map.web.metadata.get("mm_access_groups")
    if tmp is None or tmp=="":
        return True
    else:
        for group in groups:
            if (tmp.count(group)>0 or tmp.count("public")>0):
                return True
        return False

def checkLayerPriv(conf,map,layer,typ):
    print >> sys.stderr,"LAYER "+str(layer)
    if len(typ)>1:
        ctypes=[]
        for i in range(0,len(typ)):
            ctypes+=[typ[i]]
    else:
        ctypes=[typ]
    groups=getGroup(conf)
    if checkMapPriv(conf,map):
	if map.getLayerByName(layer) is None:
		return False
        tmp=map.getLayerByName(layer).metadata.get("mm_access_groups")
        if tmp is not None:
            tmp=tmp.split(',')
            for group in groups:
                if tmp.count(group)>0:
                    tmp1=map.getLayerByName(layer).metadata.get("mm_access_"+group)
                    if tmp1 is not None:
                        tmp1=tmp1.split(",")
                        lcnt=0
                        for k in ctypes:
                            for i in range(0,len(mmatypes)):
                                if k==mmatypes[i] and ("1"==tmp1[i] or "true"==tmp1[i]):
                                    lcnt+=1
                        return (lcnt==len(ctypes))
            return False
        else:
            return True
    else:
        return False
    
def checkDataStorePriv(conf,ds,priv):
    import json
    import datastores.service as dss
    groups=getGroup(conf)
    path=dss.getPath(conf,ds)
    if len(priv)>1:
        cpriv=[]
        for i in range(0,len(priv)):
            cpriv+=[priv[i]]
    else:
        cpriv=[priv]
    try:
        f=open(path+".mmpriv","rb")
        priv0=f.read()
        f.close()
    except:
        print >> sys.stderr,"Unable to load the following file "+str(path)+".mmpriv"
        return True
    privs=priv0.split("\n")
    privf=[]
    for i in privs:
        privf+=[i.split(",")]
    cnt=0
    for i in privf:
        for group in groups:
            if i[0]==group:
                ecnt=0
                for k in cpriv:
                    for j in range(0,3):
                        if k==mmatypes[j]:
                            if i[j+1]=="1" or i[j+1]=="true":
                                ecnt+=1
                return (len(cpriv)==ecnt)
    return False

def checkDataSourcePriv(conf,m,dst,ds,priv):
    if m is None:
        import mapscript
        import datastores.service as dss
        path=dss.getPath(conf,dst)
        m=mapscript.mapObj(path+"ds_ows.map")
    if priv.count("w")==0:
        if checkDataStorePriv(conf,dst,"rx"):
            return checkLayerPriv(conf,m,ds,priv)
        else:
            return False
    else:
        if checkDataStorePriv(conf,dst,"rwx"):
            return checkLayerPriv(conf,m,ds,priv)
        else:
            return False
        
