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
from Cheetah.Template import Template
import sys
import os
import shutil
import json
import gettext
import zoo


def GetConf(conf, inputs, outputs):
    outputs["Result"]["value"] = ""
    i = 0
    try:
        res = conf[inputs["section"]["value"]]
        if inputs["section"]["value"] == "identification":
            try:
                f = open(res["abstract"].replace(conf["main"]["tmpUrl"], conf["main"]["tmpPath"]), "rb")
                res["abstract"] = f.read()
            except:
                pass
        tmp = json.dumps(res)
        outputs["Result"]["value"] = tmp
    except Exception as e:
        conf["lenv"]["message"] = zoo._("Error occurs when trying to parse the ") + inputs["section"]["value"] + zoo._(
            "section") + str(e)
        return zoo.SERVICE_FAILED
    return zoo.SERVICE_SUCCEEDED


def SaveConf(conf, inputs, outputs):
    i = 0
    envs = ["lenv", "senv", "renv", "cookies", "request"]
    try:
        f = open(conf["lenv"]["cwd"].replace("\\", "/") + '/main.cfg', 'w')
        for a in conf:
            if envs.count(a) == 0:
                if i > 0:
                    f.write("\n")
                f.write("[" + a + "]\n")
                if a != inputs["section"]["value"]:
                    for b in conf[a]:
                        # print("STD[" + b + "=" + conf[a][b] + "]\n", file=sys.stderr)
                        f.write(b + "=" + conf[a][b] + "\n")
                else:
                    print(a, file=sys.stderr)
                    if a == "main":
                        f.write("isTrial=" + conf["senv"]["isTrial"] + "\n")

                    for b in conf[a]:
                        if b != "isSoap" and b != "isTrial":
                            try:
                                b.index('_label')
                                f.write(b + "=" + conf[a][b] + "\n")
                            # print("STD["+b+"="+conf[a][b]+"]\n", file= sys.stderr)
                            except:
                                if b in inputs:
                                    if b != "abstract":
                                        f.write(b + "=" + inputs[b]["value"] + "\n")
                                    else:
                                        f0 = open(conf["main"]["tmpPath"] + "/MainDescription" + conf["senv"][
                                            "MMID"] + ".html", "w")
                                        f0.write(inputs[b]["value"])
                                        f0.close()
                                        f.write(b + "=" + conf["main"]["tmpUrl"] + "/MainDescription" + conf["senv"][
                                            "MMID"] + ".html" + "\n")

                                else:
                                    if not ("force" in inputs):
                                        if b != "abstract":
                                            f.write(b + "=" + conf[a][b] + "\n")
                                        else:
                                            f0 = open(conf["main"]["tmpPath"] + "/MainDescription" + conf["senv"][
                                                "MMID"] + ".html", "w")
                                            f0.write(conf[a][b])
                                            f0.close()
                                            f.write(
                                                b + "=" + conf["main"]["tmpUrl"] + "/MainDescription" + conf["senv"][
                                                    "MMID"] + ".html" + "\n")

                    for b in inputs:
                        if b != "section" and b != "force" and not (b in conf[a]):
                            if b != "abstract":
                                f.write(b + "=" + inputs[b]["value"] + "\n")
                            else:
                                f0 = open(conf["main"]["tmpPath"] + "/MainDescription" + conf["senv"]["MMID"] + ".html",
                                          "w")
                                f0.write(inputs[b]["value"])
                                f.write(b + "=" + conf["main"]["tmpUrl"] + "/MainDescription" + conf["senv"][
                                    "MMID"] + ".html" + "\n")
                                f0.close()

                i += 1
        outputs["Result"]["value"] = zoo._("done")
        f.close()
    # print(os.path.abspath(os.getcwd())+'/main1.cfg'+" => "+os.path.abspath(os.getcwd())+'/main.cfg', file=sys.stderr)
    # shutil.copy(os.path.abspath(os.getcwd())+'/main1.cfg',os.path.abspath(os.getcwd())+'/main.cfg')
    except Exception as e:
        # print("Error occurs when trying to parse the section", file=sys.stderr)
        # print(inputs["section"]["value"], file=sys.stderr)
        conf["lenv"]["message"] = zoo._("Error occurs when trying to parse the ") + inputs["section"]["value"] + zoo._(
            " section: ") + str(e)
        return 4
    return 3


def display1(conf, inputs, outputs):
    # print(conf, file=sys.stderr)
    outputs["Result"]["value"] = '''
    <h1>Configuration <a href="#" class="close" onclick="dashboardLayout.close(\'west\')"></a></h1>

    <div class="toolbar">\n'''
    i = 0
    for a in conf:
        if a != 'lenv' and a != "senv" and a != 'mm':
            i = i + 1
            outputs["Result"]["value"] += '''
      <a class="fg-button ui-state-default maincfg''' + str(
                i) + '''" href="#''' + a + '''" onclick="loadTab(\'''' + a + '''\');return true;" title="'''
            if a + '_label' in conf[a]:
                outputs["Result"]["value"] += conf[a][a + '_label']
            else:
                outputs["Result"]["value"] += a.title()
            outputs["Result"]["value"] += '''"></a>
'''

    outputs["Result"]["value"] += '''
    </div>
    
    <div class="tabs">'''
    textarea = ['abstract', 'keywords']
    for a in conf:
        if a != 'lenv' and a != "senv" and a != 'mm':
            outputs["Result"]["value"] += '''      <div id="''' + a + '''">
    <table style="padding:10px;width:100%;">\n'''
            for b in conf[a]:
                try:
                    b.index('_label')
                except:
                    outputs["Result"]["value"] += '''
      <tr>
        <td valign="top">'''
                    if b + "_label" in conf[a]:
                        outputs["Result"]["value"] += conf[a][b + "_label"]
                    else:
                        outputs["Result"]["value"] += b.title()
                    outputs["Result"]["value"] += '''
:</td>
        <td>'''
                    # print(" Result Name " + a + " " + b + " " + conf[a][b], textarea, file=sys.stderr)
                    try:
                        textarea.index(b)
                        outputs["Result"][
                            "value"] += '''<textarea id="''' + b + '''" name="''' + b + '''" rows="3" cols="17" class="maincfg"></textarea>'''
                    except:
                        outputs["Result"]["value"] += '''<input id="''' + b + '''" type="text" class="rounded" />'''
                    outputs["Result"]["value"] += '''</td>
      </tr>
'''
            outputs["Result"]["value"] += '''
    </table>
      </div>
'''
    outputs["Result"]["value"] += '''
    </div>
    <center><input type="button" class="start-stop" onclick="saveConf(cTab);return false;" style="margin-top:10px;" value="Save configuration"></input></center>'''
    return 3


def display(conf, inputs, outputs):
    nameSpace = {'conf': conf, 'inputs': inputs, 'outputs': outputs}
    t = Template(file=conf["lenv"]["cwd"] + "/configuration/display.html", searchList=nameSpace)
    outputs["Result"]["value"] = t.__str__()
    return 3
