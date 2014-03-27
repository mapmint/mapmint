# -*- coding: utf-8 -*- 
from Cheetah.Template import Template
import sys
import os
import shutil
import json
import gettext

def GetConf(conf,inputs,outputs):
	outputs["Result"]["value"]="";
	i = 0
	try:
		tmp=json.dumps(conf[inputs["section"]["value"]])
		outputs["Result"]["value"]=tmp
	except:
		conf["lenv"]["message"]="Error occurs when trying to parse the "+inputs["section"]["value"]+"section"
		return 4
	return 3

def SaveConf(conf,inputs,outputs):
	i = 0
	try:
		f = open(conf["lenv"]["cwd"]+'/main.cfg', 'w')
		for a in conf:
			if a != "lenv":
				if i>0:
					f.write("\n");
				f.write("["+a+"]\n");
				if a!=inputs["section"]["value"]:
					for b in conf[a]:
						#print >> sys.stderr,"STD["+b+"="+conf[a][b]+"]\n"
						f.write(b+"="+conf[a][b]+"\n")
				else:
					for b in conf[a]:
						try:
							b.index('_label')
							f.write(b+"="+conf[a][b]+"\n")
							#print >> sys.stderr,"STD["+b+"="+conf[a][b]+"]\n"
						except:
							if inputs.has_key(b):
								f.write(b+"="+inputs[b]["value"]+"\n")
								#print >> sys.stderr,"DIFF["+b+"="+inputs[b]["value"]+"]\n"
							else:
								f.write(b+"="+conf[a][b]+"\n")
								#print >> sys.stderr,"STD["+b+"="+conf[a][b]+"]\n"

				i+=1
		outputs["Result"]["value"]="done"
		f.close()
		#print >> sys.stderr, os.path.abspath(os.getcwd())+'/main1.cfg'+" => "+os.path.abspath(os.getcwd())+'/main.cfg'
		#shutil.copy(os.path.abspath(os.getcwd())+'/main1.cfg',os.path.abspath(os.getcwd())+'/main.cfg')
	except:
		#print >> sys.stderr,"Error occurs when trying to parse the section"
		#print >> sys.stderr, inputs["section"]["value"]
		conf["lenv"]["message"]="Error occurs when trying to parse the "+inputs["section"]["value"]+"section"
		return 4
	return 3


def display1(conf,inputs,outputs):
	#print >> sys.stderr, conf
	outputs["Result"]["value"]='''
    <h1>Configuration <a href="#" class="close" onclick="dashboardLayout.close(\'west\')"></a></h1>

    <div class="toolbar">\n'''
	i=0
	for a in conf:
		if a!='lenv':
			i=i+1
			outputs["Result"]["value"]+='''
      <a class="fg-button ui-state-default maincfg'''+str(i)+'''" href="#'''+a+'''" onclick="loadTab(\''''+a+'''\');return true;" title="'''
			if conf[a].has_key(a+'_label'):
				outputs["Result"]["value"]+=conf[a][a+'_label']
			else:
				outputs["Result"]["value"]+=a.title()
			outputs["Result"]["value"]+='''"></a>
'''
	
	outputs["Result"]["value"]+='''
    </div>
    
    <div class="tabs">'''
	textarea=['abstract','keywords']
	for a in conf:
		if a!='lenv':
			outputs["Result"]["value"]+='''      <div id="'''+a+'''">
	<table style="padding:10px;width:100%;">\n'''
			for b in conf[a]:
				try:
					b.index('_label')
				except:
					outputs["Result"]["value"]+='''
	  <tr>
	    <td valign="top">'''
					if conf[a].has_key(b+"_label"):
						outputs["Result"]["value"]+=conf[a][b+"_label"]
					else:
						outputs["Result"]["value"]+=b.title()
					outputs["Result"]["value"]+='''
:</td>
	    <td>'''
					#print >> sys.stderr," Result Name "+a+" "+b+" "+conf[a][b],textarea
					try:
						textarea.index(b)
						outputs["Result"]["value"]+='''<textarea id="'''+b+'''" name="'''+b+'''" rows="3" cols="17" class="maincfg"></textarea>'''
					except:
						outputs["Result"]["value"]+='''<input id="'''+b+'''" type="text" class="rounded" />'''
					outputs["Result"]["value"]+='''</td>
	  </tr>
'''
			outputs["Result"]["value"]+='''
	</table>
      </div>
'''
	outputs["Result"]["value"]+='''
    </div>
    <center><input type="button" class="start-stop" onclick="saveConf(cTab);return false;" style="margin-top:10px;" value="Save configuration"></input></center>'''
	return 3

def display(conf,inputs,outputs):
	nameSpace = {'conf': conf,'inputs': inputs, 'outputs': outputs}
	t = Template(file=conf["lenv"]["cwd"]+"/configuration/display.html",searchList=nameSpace)
	outputs["Result"]["value"]=t.__str__()
	return 3
