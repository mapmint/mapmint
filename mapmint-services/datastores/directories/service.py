import osgeo.ogr
import osgeo.gdal
import sys
import os
import shutil
import json
import mm_access

if sys.platform == 'win32':
	import ntfslink
	os.readlink=ntfslink.readlink
	os.symlink=ntfslink.symlink

def mmListDir(path):
	"""
	Order all directories
	"""
	dirs = sorted([d for d in os.listdir(path) if os.path.isdir(path + os.path.sep + d)])
	"""
	Order all files
	"""
	dirs.extend(sorted([f for f in os.listdir(path) if os.path.isfile(path + os.path.sep + f)]))
	return dirs


def getOriginalDir(conf,val):
	if conf["main"].keys().count("isTrial") and conf["main"]["isTrial"]=="true":
		if val.count(conf["main"]["dataPath"]+"/ftp/")>0:
			return val
		else:
			return conf["main"]["dataPath"]+"/ftp/"+val
	else:
		if val is not None:
			return val
		else:
			return "/"

def saveDir(conf,inputs,outputs):
	if inputs.keys().count("path") and inputs["path"].keys().count("value"):
		od=getOriginalDir(conf,inputs["path"]["value"])
	if inputs["type"]["value"] == "new":
		try:
			os.mkdir(conf["main"]["dataPath"]+"/ftp/"+inputs["name"]["value"])
			inputs["path"]["value"]=conf["main"]["dataPath"]+"/ftp/"+inputs["name"]["value"]
		except:
			er=sys.exc_info()
			#print >> sys.stderr, er
			conf["lenv"]["message"]="Unable to create directory: "+er[1][1]
			return 4
	os.symlink(inputs["path"]["value"],conf["main"]["dataPath"]+"/dirs/"+inputs["name"]["value"])
	outputs["Result"]["value"]="Directory added as a datastore"
	#conf["main"]["dataPath"]+"/dirs/"+inputs["name"]["value"]
	return 3

def removeDS(conf,inputs,outputs):
	original_dir=inputs["dst"]["value"]
	try:
		tmp=mmListDir(original_dir)
	except Exception,e:
		conf["lenv"]["message"]="Unable to list files into directory: "+str(e)
		return 4
	tmpStr=""
	for i in tmp:
		print >> sys.stderr,i
		if i.count(inputs["dso"]["value"])>0:
			try:
				os.unlink(original_dir+"/"+i)
				tmpStr+=i+"<br/>"
			except Exception,e:
				tmpStr+="Unable to remove: "+i+" "+str(e)+"<br/>"
	outputs["Result"]["value"]="Files deleted: "+tmpStr
	return 3


def display(conf,inputs,outputs):
	import mm_access
	default_dir=conf["main"]["dataPath"]+"/dirs/"
	original_dir=conf["main"]["dataPath"]+"/dirs/"
	label_dir=""
	if inputs.has_key('dir') and inputs["dir"].has_key("value") and str(inputs["dir"]["value"])!="NULL": 
		original_dir=getOriginalDir(conf,inputs["dir"]["value"])
		label_dir=inputs["dir"]["value"]
	status="closed"
	if inputs.has_key('state') and inputs["state"].has_key('value'):
		status=inputs["state"]["value"]
	#print >> sys.stderr, conf["main"]["dataPath"]+"/dirs/"
	#print >> sys.stderr, original_dir
	#print >> sys.stderr, inputs["dir"]["value"]
	try:
		tmp=mmListDir(original_dir)
	except:
		return 4
	try:
		if original_dir!=default_dir:
			outputs["Result"]["value"]='''
	 <span class="folder"><a href="#">'''+original_dir.split('/')[len(original_dir.split('/'))-2]+'''</a></span>'''
	except:
		if original_dir!=default_dir:
			outputs["Result"]["value"]='''
	 <span class="folder"><a href="#">'''+original_dir+'''</a></span>'''
	outputs["Result"]["value"]=''' '''
	i=0
	j=0
	prefix=""
	try:
		if inputs["type"]:
			prefix=original_dir
			argument2=",'default'"
			suffix="/"
	except:
		prefix=""
		argument2=""
		suffix=""
	for t in tmp:
		try:
			#print >> sys.stderr,original_dir+t
			open(original_dir+t)
			hasValue=False
		except:
			i+=1
			dsn=original_dir+t+"/"
			print >> sys.stderr,dsn
			try:
				priv=mm_access.checkDataStorePriv(conf,dsn,"r") and mm_access.checkDataStorePriv(conf,dsn,"x")
			except Exception,e:
				priv=False
				print >> sys.stderr,e
			print >> sys.stderr,priv
			if os.access(original_dir+t,os.X_OK) and len(t.split('.'))==1:
				j+=1
				hasValue=True
				outputs["Result"]["value"]+='''
	<li id="browseDirectoriesList'''+original_dir.replace('/','__')+""+t+'''__"'''
				outputs["Result"]["value"]+=''' state="'''+status+'''">'''
				if default_dir == original_dir:
					outputs["Result"]["value"]+='''<div class="checker"><span><input type="checkbox" onclick="if(this.checked) Distiller.loadDir(this.value'''+argument2+''');else Distiller.unloadDir(this.value);" value="'''+prefix+t+suffix+'''" name="" style="opacity: 0;" /></span></div>'''
					outputs["Result"]["value"]+='''<span class="file">'''+t+'''</span>
'''
				else:
					outputs["Result"]["value"]+='''<div class="hitarea  expandable-hitarea" onclick="$mj('Datawarehouse.form.path').value=\''''+prefix+t+'''/\'; layouts[1].loadDir(\''''+prefix+t+suffix+'''\''''+argument2+''');"></div><span class="folder">'''+t+'''</span>
'''
				outputs["Result"]["value"]+='''
	</li>
'''			

	if j==0:
		outputs["Result"]["value"]=''' '''
	outputs["Result"]["value"]='''<ul> '''+outputs["Result"]["value"]+ '''</ul>'''

	return 3

def list(conf,inputs,outputs):
	import mm_access
	default_dir=conf["main"]["dataPath"]+"/dirs/"
	original_dir=conf["main"]["dataPath"]+"/dirs/"
	label_dir=""
	if inputs.has_key('dir') and inputs["dir"].has_key("value") and str(inputs["dir"]["value"])!="NULL": 
		original_dir=getOriginalDir(conf,inputs["dir"]["value"])
		label_dir=inputs["dir"]["value"]
	status="closed"
	if inputs.has_key('state') and inputs["state"].has_key('value'):
		status=inputs["state"]["value"]
	#print >> sys.stderr, conf["main"]["dataPath"]+"/dirs/"
	#print >> sys.stderr, original_dir
	#print >> sys.stderr, inputs["dir"]["value"]
	try:
		tmp=mmListDir(original_dir)
	except:
		return 4
	try:
		if original_dir!=default_dir:
			outputs["Result"]["value"]='''
	 <span class="folder"><a href="#">'''+original_dir.split('/')[len(original_dir.split('/'))-2]+'''</a></span>'''
	except:
		if original_dir!=default_dir:
			outputs["Result"]["value"]='''
	 <span class="folder"><a href="#">'''+original_dir+'''</a></span>'''
	outputs["Result"]["value"]=''' '''
	i=0
	j=0
	prefix=""
	try:
		if inputs["type"]:
			prefix=original_dir
			argument2=",'default'"
			suffix="/"
	except:
		prefix=""
		argument2=""
		suffix=""
	#print >> sys.stderr,"TMP > "+str(tmp)
	outputs["Result"]["value"]=""
	for t in tmp:
		try:
			#print >> sys.stderr,"TMP > "+str(original_dir+t)
			open(original_dir+t)
			hasValue=False
		except:
			i+=1
			#print >> sys.stderr,"TMP > "+str(original_dir+t)+" "+str(i)
			#print >> sys.stderr,os.access(original_dir+t,os.X_OK)
			#print >> sys.stderr,t.split('.')
			tmpStr=original_dir+t
			if tmpStr[len(tmpStr)-1]!="/":
				tmpStr+="/"
			if os.access(original_dir+t,os.X_OK) and mm_access.checkDataStorePriv(conf,tmpStr,"rwx") and len(t.split('.'))==1:
				j+=1
				hasValue=True
				outputs["Result"]["value"]+='''
	<li id="browseDirectoriesList'''+original_dir.replace('/','__')+""+t+'''__"'''
				outputs["Result"]["value"]+=''' state="'''+status+'''">'''
				if default_dir == original_dir:
					outputs["Result"]["value"]+='''<div class="checker"><span><input type="checkbox" onclick="if(this.checked) Distiller.loadDir(this.value'''+argument2+''');else Distiller.unloadDir(this.value);" value="'''+prefix+t+suffix+'''" name="" style="opacity: 0;" /></span></div>'''
					outputs["Result"]["value"]+='''<span class="file">'''+t+'''</span>
'''
				else:
					outputs["Result"]["value"]+='''<div class="hitarea  expandable-hitarea" onclick="$mj('Datawarehouse.form.path').value=\''''+prefix+t+'''/\'; layouts[1].loadDir(\''''+prefix+t+suffix+'''\''''+argument2+''');"></div><span class="folder">'''+t+'''</span>
'''
				outputs["Result"]["value"]+='''
	</li>
'''			

	if j==0:
		outputs["Result"]["value"]=''' '''
	outputs["Result"]["value"]='''<ul> '''+outputs["Result"]["value"]+ '''</ul>'''

	return 3

def displayJSON(conf,inputs,outputs):
	default_dir=conf["main"]["dataPath"]+"/dirs/"
	original_dir=conf["main"]["dataPath"]+"/dirs/"
	label_dir=""
	status="closed"
	if inputs.has_key('state') and inputs["state"].has_key("value"):
		status=inputs["state"]["value"]
	if inputs.has_key('dir') and inputs["dir"].has_key("value") and str(inputs["dir"]["value"])!="NULL":
		original_dir=getOriginalDir(conf,inputs["dir"]["value"])
		label_dir=inputs["dir"]["value"]
	try:
		if inputs["type"]:
			prefix=original_dir
			argument2=",'default'"
			suffix="/"
	except:
		prefix=""
		argument2=""
		suffix=""
	try:
		tmp=mmListDir(original_dir)
	except:
		conf["lenv"]["message"]="Unable to access the specified directory"
		return 4
	output=[]
	i=0
	j=0
	for t in tmp:
		try:
			open(original_dir+"/"+t)
			hasValue=False
			if (inputs.has_key('state') and inputs["state"].has_key("value") and inputs["state"]["value"]!="open") or not(inputs.has_key('state')) and mm_access.checkDataStorePriv(conf,(original_dir+"/"+t),"r") and os.path.isdir(original_dir+"/"+t):
				output.append({"id": (original_dir+"/").replace('/','__')+t, "text": t, "state": "open"})
		except:
			if os.access(original_dir+"/"+t,os.X_OK) and len(t.split('.'))==1 and  mm_access.checkDataStorePriv(conf,(original_dir+"/"),"r"):
				j+=1
				hasValue=True
				output.append({"id": (original_dir+"/").replace('/','__')+t, "text": t, "state": status})
		i+=1
	outputs["Result"]["value"]=json.dumps(output)
	return 3


def load(conf,inputs,outputs):
	a=inputs["name"]["value"]
	a=a.replace("__","/")
	b=a[1:len(a)-1].split("/")
	#print >> sys.stderr, a[0:len(a)-1]
	#print >> sys.stderr, b[len(b)-1]
	outputs["Result"]["value"]=json.dumps({"name": b[len(b)-1], "link":os.readlink(a[0:len(a)-1])})
	return 3
					      
def delete(conf,inputs,outputs):
	a=conf["main"]["dataPath"]+"/dirs/"+inputs["name"]["value"]
	try:
		if os.path.exists(a):
			os.unlink(a)
	except:
		er=sys.exc_info()
		conf["lenv"]["message"]="Unable to drop directory ("+a[0:len(a)-1]+"): "+er[1][1]
		return 4
	outputs["Result"]["value"]="Datastore deleted"
	return 3

def getDirSize(folder):
	folder_size = 0
	print >> sys.stderr,"==============================\n"+str(folder_size)
	for (path, dirs, files) in os.walk(folder):
		print >> sys.stderr,"==============================\n"+str(path)
		print >> sys.stderr,"==============================\n"+str(dirs)
		print >> sys.stderr,"==============================\n"+str(files)
		for i in files:
			print >> sys.stderr,"==============================\n"+str(i)
			filename = os.path.join(path, i)
			print >> sys.stderr,"==============================\n"+str(path)+" "+filename+" "+str(os.path.getsize(filename))
			try:
				folder_size += os.path.getsize(filename)
			except:
				pass
	return folder_size

def getFormatedSize(size):
	Sizes=['K','M','G','T']
	c=-1
	result=size
	if result!=0:
		for i in Sizes:
			if result/1024.0>=1:
				c+=1
				result/=1024.0
			else:
				break
	if c>=0:
		return str(round(result))+" "+Sizes[c]+"B"
	else:
		return str(result)+" B"

def cleanup(conf,inputs,outputs):
	import os
	nms={"postgis":"PostGIS","mysql":"MySQL","wfs":"WFS","wms":"WMS"}
	try:
		tmp=nms.keys()
		tmp0=inputs["dsName"]["value"].split(":")
		if tmp.count(inputs["dsType"]["value"])==0:
			os.unlink(inputs["dsName"]["value"]+"/ds_ows.map")
		else:
			if len(tmp0)>=2:
				os.unlink(conf["main"]["dataPath"]+"/"+nms[inputs["dsType"]["value"]]+"/"+tmp0[1]+"ds_ows.map")
			else:
				os.unlink(conf["main"]["dataPath"]+"/"+nms[inputs["dsType"]["value"]]+"/"+inputs["dsName"]["value"]+"ds_ows.map")
	except Exception,e:
		conf["lenv"]["message"]="Dir cleaned up failed: "+str(e)
		return 4
		pass
	outputs["Result"]["value"]="Dir cleaned up"
	return 3
	
