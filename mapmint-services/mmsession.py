import zoo

def save(conf):
    try:
	fname="sess_"+conf["senv"]["MMID"]+".cfg"
        if conf["main"].keys().count("sessPath")>0:
            fullName=conf["main"]["sessPath"]+"/"+fname
	else:
            fullName=conf["main"]["tmpPath"]+"/"+fname
        f=open(fullName,"w")
        f.write("[senv]\n")
	for j in conf["senv"]:
            f.write(j+"="+conf["senv"][j]+"\n")
        f.close()
	return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"]="Error occured when trying to save session: "+e
        return zoo.SERVICE_FAILED
