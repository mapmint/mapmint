#!/usr/bin/env python
# -*- coding: UTF-8 -*-




##################################################
## DEPENDENCIES
import sys
import os
import os.path
try:
    import builtins as builtin
except ImportError:
    import __builtin__ as builtin
from os.path import getmtime, exists
import time
import types
from Cheetah.Version import MinCompatibleVersion as RequiredCheetahVersion
from Cheetah.Version import MinCompatibleVersionTuple as RequiredCheetahVersionTuple
from Cheetah.Template import Template
from Cheetah.DummyTransaction import *
from Cheetah.NameMapper import NotFound, valueForName, valueFromSearchList, valueFromFrameOrSearchList
from Cheetah.CacheRegion import CacheRegion
import Cheetah.Filters as Filters
import Cheetah.ErrorCatchers as ErrorCatchers
import zoo
import zoo
from datetime import datetime

##################################################
## MODULE CONSTANTS
VFFSL=valueFromFrameOrSearchList
VFSL=valueFromSearchList
VFN=valueForName
currentTime=time.time
__CHEETAH_version__ = '2.4.4'
__CHEETAH_versionTuple__ = (2, 4, 4, 'development', 0)
__CHEETAH_genTime__ = 1514992937.938605
__CHEETAH_genTimestamp__ = 'Wed Jan  3 16:22:17 2018'
__CHEETAH_src__ = '/Users/djay/Sites/progede2/mapmint-ui/templates/Skeleton_bs.tmpl'
__CHEETAH_srcLastModified__ = 'Wed Jan  3 16:22:05 2018'
__CHEETAH_docstring__ = 'Autogenerated by Cheetah: The Python-Powered Template Engine'

if __CHEETAH_versionTuple__ < RequiredCheetahVersionTuple:
    raise AssertionError(
      'This template was compiled with Cheetah version'
      ' %s. Templates compiled before version %s must be recompiled.'%(
         __CHEETAH_version__, RequiredCheetahVersion))

##################################################
## CLASSES

class Skeleton_bs(Template):

    ##################################################
    ## CHEETAH GENERATED METHODS


    def __init__(self, *args, **KWs):

        super(Skeleton_bs, self).__init__(*args, **KWs)
        if not self._CHEETAH__instanceInitialized:
            cheetahKWArgs = {}
            allowedKWs = 'searchList namespaces filter filtersLib errorCatcher'.split()
            for k,v in KWs.items():
                if k in allowedKWs: cheetahKWArgs[k] = v
            self._initCheetahInstance(**cheetahKWArgs)
        

    def respond(self, trans=None):



        ## CHEETAH: main method generated for this template
        if (not trans and not self._CHEETAH__isBuffering and not callable(self.transaction)):
            trans = self.transaction # is None unless self.awake() was called
        if not trans:
            trans = DummyTransaction()
            _dummyTrans = True
        else: _dummyTrans = False
        write = trans.response().write
        SL = self._CHEETAH__searchList
        _filter = self._CHEETAH__currentFilter
        
        ########################################
        ## START - generated method body
        
        try: # generated from line 12, col 1
            verr = VFFSL(SL,"errorMsg",True)
        except: # generated from line 14, col 1
            verr = None
        write(u'''<!DOCTYPE html>
<html lang="''')
        _v = VFN(VFFSL(SL,"conf",True)["main"]["lang"],"split",False)('-')[0] # u'$(conf["main"]["lang"].split(\'-\')[0])' on line 18, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$(conf["main"]["lang"].split(\'-\')[0])')) # from line 18, col 13.
        write(u'''">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="description" content="''')
        _v = VFN(VFFSL(SL,"zoo",True),"_",False)("MapMint: Professional SDI manager") # u'$zoo._("MapMint: Professional SDI manager")' on line 24, col 35
        if _v is not None: write(_filter(_v, rawExpr=u'$zoo._("MapMint: Professional SDI manager")')) # from line 24, col 35.
        write(u'''">
<meta name="keywords" content="MapMint, SDI, Geospatial, Web GIS, GIS, WPS, WMS, WFS, WCS, ZOO-Project, ZOO, ZOO WPS, MapServer, GDAL, OSGeo, FOSS4G, OGC, OWS">
<meta name="copyright" content="''')
        _v = VFFSL(SL,"conf",True)["provider"]["providerName"] # u'$conf["provider"]["providerName"]' on line 26, col 33
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["provider"]["providerName"]')) # from line 26, col 33.
        write(u'''">
<meta name="author" content="''')
        _v = VFFSL(SL,"conf",True)["provider"]["providerName"] # u'$conf["provider"]["providerName"]' on line 27, col 30
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["provider"]["providerName"]')) # from line 27, col 30.
        write(u'''">
<link rel="shortcut icon" href="''')
        _v = VFFSL(SL,"conf",True)["main"]["mmAddress"] # u'$conf["main"]["mmAddress"]' on line 28, col 33
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["mmAddress"]')) # from line 28, col 33.
        write(u'''/favicon.ico" />
<link rel="alternate" type="application/rss+xml" title="MapMint RSS Feed" href="''')
        _v = VFFSL(SL,"conf",True)["main"]["applicationAddress"] # u'$(conf["main"]["applicationAddress"])' on line 29, col 81
        if _v is not None: write(_filter(_v, rawExpr=u'$(conf["main"]["applicationAddress"])')) # from line 29, col 81.
        write(u'''public/rss" />
<title>''')
        _v = VFFSL(SL,"page_title",True) # u'$page_title' on line 30, col 8
        if _v is not None: write(_filter(_v, rawExpr=u'$page_title')) # from line 30, col 8.
        write(u'''</title>

''')
        if VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)("useCdn")>0 and VFFSL(SL,"conf",True)["mm"]["useCdn"]=="true": # generated from line 32, col 1
            write(u'''<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
''')
        else: # generated from line 35, col 1
            write(u'''<link href="''')
            _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 36, col 13
            if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 36, col 13.
            write(u'''/css/bootstrap.min.css" rel="stylesheet">
<link href="''')
            _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 37, col 13
            if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 37, col 13.
            write(u'''/css/bootstrap-theme.min.css" rel="stylesheet">
''')
        write(u'''<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 39, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 39, col 13.
        write(u'''/css/mapmint-admin.css" rel="stylesheet">
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 40, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 40, col 13.
        write(u'''/assets/css/mm-font.css" rel="stylesheet">
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 41, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 41, col 13.
        write(u'''/assets/css/loader.css" rel="stylesheet">
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 42, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 42, col 13.
        write(u'''/css/mm_icons.css" rel="stylesheet">
<link href="http://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css" rel="stylesheet">
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 44, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 44, col 13.
        write(u'''/css/metisMenu.min.css" rel="stylesheet">
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 45, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 45, col 13.
        write(u'''/assets/css/bootstrap-notify.css" rel="stylesheet">
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 46, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 46, col 13.
        write(u'''/assets/css/summernote.css" rel="stylesheet">


''')
        if VFFSL(SL,"istyles",True) is not None: # generated from line 49, col 1
            _v = VFFSL(SL,"istyles",True) # u'$istyles' on line 50, col 1
            if _v is not None: write(_filter(_v, rawExpr=u'$istyles')) # from line 50, col 1.
            write(u'''
''')
        write(u'''
<link href="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 53, col 13
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 53, col 13.
        write(u'''/assets/css/mapmint-fixes.css" rel="stylesheet">

</head>
<body>
''')
        self._handleCheetahInclude((VFFSL(SL,"conf",True)["main"]["templatesPath"]+"/loader_bs.tmpl"), trans=trans, includeFrom="file", raw=False)
        write(u'''
''')
        if VFFSL(SL,"mmodule",True)!="public": # generated from line 59, col 1
            if (VFN(VFN(VFFSL(SL,"conf",True),"keys",False)(),"count",False)("senv")>0 and VFN(VFN(VFFSL(SL,"conf",True)["senv"],"keys",False)(),"count",False)("loggedin")>0 and VFN(VFN(VFFSL(SL,"conf",True)["senv"],"keys",False)(),"count",False)("lastname")>0 and VFFSL(SL,"conf",True)["senv"]["loggedin"]!="false") and not(VFFSL(SL,"verr",True)): # generated from line 60, col 1
                write(u'''<div id="wrapper">
''')
                lfonts = {	"dashboard": "tachometer",	"distiller": "cubes",	"manager": "map-o",	"tables": "table",	"themes": "th",	"territories": "sitemap",	"indicators": "bar-chart",	"documents": "file-text-o",	"publisher": "laptop",	"georeferencer": "globe",	"importers": "upload"}
                write(u'''  <!-- Navigation -->
  <nav class="navbar navbar-default navbar-fixed-top" role="navigation" style="margin-bottom: 0">
   <div class="navbar-header">
     <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
     <span class="sr-only">Toggle navigation</span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
     </button>
''')
                try: # generated from line 84, col 1
                    cfont = VFFSL(SL,"lfonts",True)[VFN(VFN(VFFSL(SL,"mmodule",True),"lower",False)(),"replace",False)("-public","")]
                except: # generated from line 86, col 1
                    cfont = "question"
                write(u'''<!-- ''')
                _v = VFFSL(SL,"mmodule",True) # u'$mmodule' on line 89, col 6
                if _v is not None: write(_filter(_v, rawExpr=u'$mmodule')) # from line 89, col 6.
                write(u''' -->
''')
                if VFFSL(SL,"mmodule",True)=="tables-public": # generated from line 90, col 1
                    write(u'''     <a class="navbar-brand" href="#"><i class="fa fa-''')
                    _v = VFFSL(SL,"cfont",True) # u'$cfont' on line 91, col 55
                    if _v is not None: write(_filter(_v, rawExpr=u'$cfont')) # from line 91, col 55.
                    write(u'''"></i> <span class="hid">''')
                    _v = VFN(VFFSL(SL,"zoo",True),"_",False)("Tables") # u'$zoo._("Tables")' on line 91, col 86
                    if _v is not None: write(_filter(_v, rawExpr=u'$zoo._("Tables")')) # from line 91, col 86.
                    write(u'''</span></a>
''')
                else: # generated from line 92, col 1
                    write(u'''     <a class="navbar-brand" href="#"><i class="fa fa-''')
                    _v = VFFSL(SL,"cfont",True) # u'$cfont' on line 93, col 55
                    if _v is not None: write(_filter(_v, rawExpr=u'$cfont')) # from line 93, col 55.
                    write(u'''"></i> <span class="hid">''')
                    _v = VFN(VFFSL(SL,"zoo",True),"_",False)(VFFSL(SL,"mmodule",True)) # u'$zoo._($mmodule)' on line 93, col 86
                    if _v is not None: write(_filter(_v, rawExpr=u'$zoo._($mmodule)')) # from line 93, col 86.
                    write(u'''</span></a>
''')
                write(u'''   </div>
   <!-- /.navbar-header -->

   <ul class="nav navbar-top-links navbar-right" id="admin-submenu">
''')
                if VFFSL(SL,"admin_menu",True) is not None: # generated from line 99, col 1
                    write(u'''    ''')
                    _v = VFFSL(SL,"admin_menu",True) # u'$admin_menu' on line 100, col 5
                    if _v is not None: write(_filter(_v, rawExpr=u'$admin_menu')) # from line 100, col 5.
                    write(u'''
''')
                write(u'''     <li class="dropdown">
       <a class="dropdown-toggle" data-toggle="dropdown" href="#empty">
         <i class="fa fa-user fa-fw"></i>  <i class="fa fa-caret-down"></i>
       </a>
       <ul class="dropdown-menu dropdown-user">
\t <li><a href="#" id="mmmUserPreferences"><i class="fa fa-user fa-fw"></i> ''')
                _v = VFN(VFFSL(SL,"zoo",True),"_",False)("User Profile") # u'$zoo._("User Profile")' on line 107, col 76
                if _v is not None: write(_filter(_v, rawExpr=u'$zoo._("User Profile")')) # from line 107, col 76.
                write(u'''</a>
\t </li>
\t <li class="divider"></li>
\t <li><a href="#" id="mmmUserLogOut"><i class="fa fa-sign-out fa-fw"></i> ''')
                _v = VFN(VFFSL(SL,"zoo",True),"_",False)("Logout") # u'$zoo._("Logout")' on line 110, col 75
                if _v is not None: write(_filter(_v, rawExpr=u'$zoo._("Logout")')) # from line 110, col 75.
                write(u'''</a>
\t </li>
       </ul>
       <!-- /.dropdown-user -->
     </li>
   </ul>

''')
                if VFFSL(SL,"mmenu0",True) is None: # generated from line 117, col 1
                    if VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)('indicators')>0 and VFFSL(SL,"conf",True)["main"]["indicators"]=="true": # generated from line 118, col 1
                        menu = ['Dashboard','Distiller','Territories','Indicators','Themes','Documents','Manager','Publisher']
                    else: # generated from line 120, col 1
                        if VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)('indicators')>0 and VFFSL(SL,"conf",True)["mm"]["documents"]=="true": # generated from line 121, col 1
                            menu = ['Dashboard','Distiller','Manager','Themes','Documents','Publisher']
                        else: # generated from line 123, col 1
                            menu = ['Dashboard','Distiller','Manager','Themes','Publisher']
                    if VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)('tables')>0 and VFFSL(SL,"conf",True)["mm"]["tables"]=="true": # generated from line 127, col 1
                        mmenu0 = []
                        for a in range(0,len(VFFSL(SL,"menu",True))): # generated from line 129, col 1
                            mmenu0 += [VFFSL(SL,"menu",True)[a]]
                            if a==4: # generated from line 131, col 1
                                mmenu0 += ["Tables"]
                        menu = VFFSL(SL,"mmenu0",True)
                else: # generated from line 137, col 1
                    menu = VFFSL(SL,"mmenu0",True)
                write(u'''
''')
                if VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)('importers')>0 and VFFSL(SL,"conf",True)["mm"]["importers"]=="true": # generated from line 141, col 1
                    mmenu0 = []
                    for a in range(0,len(VFFSL(SL,"menu",True))): # generated from line 143, col 1
                        mmenu0 += [VFFSL(SL,"menu",True)[a]]
                        if a==5: # generated from line 145, col 1
                            mmenu0 += ["Importers"]
                    menu = VFFSL(SL,"mmenu0",True)
                write(u'''
\t  <div class="navbar-default sidebar" role="navigation">
\t  <div class="sidebar-nav navbar-collapse">
\t    <ul class="nav" id="side-menu">

''')
                for a in VFFSL(SL,"menu",True): # generated from line 156, col 1
                    write(u'''\t      <li ''')
                    if VFFSL(SL,"inputs",True)['tmpl']['value']==VFFSL(SL,"a",True)+"_bs": # generated from line 157, col 12
                        write(u'''class="active"''')
                    write(u'''>
\t      <a href="''')
                    if VFFSL(SL,"inputs",True)['tmpl']['value']==VFFSL(SL,"a",True)+"_bs": # generated from line 158, col 17
                        write(u'''#" class="active"''')
                    else: # generated from line 158, col 74
                        write(u'''./''')
                        _v = VFFSL(SL,"a",True) # u'$(a)' on line 158, col 82
                        if _v is not None: write(_filter(_v, rawExpr=u'$(a)')) # from line 158, col 82.
                        write(u'''_bs"''')
                    write(u'''><i class="fa fa-''')
                    _v = VFFSL(SL,"lfonts",True)[a.lower()] # u'$(lfonts[a.lower()])' on line 158, col 115
                    if _v is not None: write(_filter(_v, rawExpr=u'$(lfonts[a.lower()])')) # from line 158, col 115.
                    write(u''' fa-fw"></i> ''')
                    _v = VFN(VFFSL(SL,"zoo",True),"_",False)(VFFSL(SL,"a",True)) # u'$zoo._($a)' on line 158, col 148
                    if _v is not None: write(_filter(_v, rawExpr=u'$zoo._($a)')) # from line 158, col 148.
                    write(u'''
''')
                    if VFFSL(SL,"mmenu",True) is not None and VFFSL(SL,"inputs",True)['tmpl']['value']==VFFSL(SL,"a",True)+"_bs": # generated from line 159, col 1
                        write(u'''<span class="fa arrow"></span>
\t      </a>
\t      ''')
                        _v = VFFSL(SL,"mmenu",True) # u'$mmenu' on line 162, col 8
                        if _v is not None: write(_filter(_v, rawExpr=u'$mmenu')) # from line 162, col 8.
                        write(u'''
''')
                    else	      : # generated from line 163, col 1
                        write(u'''\t      </a>
''')
                    write(u'''\t      </li>
''')
                if VFN(VFFSL(SL,"menu",True),"count",False)(VFN(VFFSL(SL,"inputs",True)['tmpl']['value'],"replace",False)("_bs",""))==0: # generated from line 168, col 1
                    write(u'''\t      ''')
                    _v = VFFSL(SL,"mmenu",True) # u'$mmenu' on line 169, col 8
                    if _v is not None: write(_filter(_v, rawExpr=u'$mmenu')) # from line 169, col 8.
                    write(u'''
''')
                write(u'''
\t    </ul>
\t  </div>
\t  <!-- /.sidebar-collapse -->
          </div>
\t  <!-- /.navbar-static-side -->
        </nav>

\t<div id="page-wrapper">

\t<div class=\'notifications top-right\'></div>
''')
        write(u'''
''')
        _v = VFFSL(SL,"body",True) # u'$body' on line 185, col 1
        if _v is not None: write(_filter(_v, rawExpr=u'$body')) # from line 185, col 1.
        write(u'''

''')
        if VFFSL(SL,"tfooter",True) is not None: # generated from line 187, col 1
            _v = VFFSL(SL,"tfooter",True) # u'$tfooter' on line 188, col 1
            if _v is not None: write(_filter(_v, rawExpr=u'$tfooter')) # from line 188, col 1.
            write(u'''
''')
        write(u'''\t</div>
''')
        if VFFSL(SL,"mmodule",True)!="public" and (VFN(VFN(VFFSL(SL,"conf",True),"keys",False)(),"count",False)("senv")>0 and VFFSL(SL,"conf",True)["senv"]["loggedin"]!="false" and VFN(VFN(VFFSL(SL,"conf",True)["senv"],"keys",False)(),"count",False)("firstname")>0) and not(VFFSL(SL,"verr",True)): # generated from line 191, col 1
            write(u'''<div class="ui-layout-south hide"></div>
''')
        else: # generated from line 193, col 1
            if VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)("nofooter")==0 or (VFFSL(SL,"conf",True)["mm"]["nofooter"]!="true" and VFN(VFN(VFFSL(SL,"conf",True)["mm"],"keys",False)(),"count",False)("nofooter")>0): # generated from line 194, col 1
                write(u'''<footer>
  <div class="container text-center">
''')
                d = datetime.today()
                write(u'''    <p>Copyright &copy; <a href="''')
                _v = VFFSL(SL,"conf",True)["provider"]["providerSite"] # u'$conf["provider"]["providerSite"]' on line 199, col 34
                if _v is not None: write(_filter(_v, rawExpr=u'$conf["provider"]["providerSite"]')) # from line 199, col 34.
                write(u'''">''')
                _v = VFFSL(SL,"conf",True)["provider"]["providerName"] # u'$conf["provider"]["providerName"]' on line 199, col 69
                if _v is not None: write(_filter(_v, rawExpr=u'$conf["provider"]["providerName"]')) # from line 199, col 69.
                write(u'''</a> ''')
                _v = VFFSL(SL,"d.year",True) # u'$d.year' on line 199, col 107
                if _v is not None: write(_filter(_v, rawExpr=u'$d.year')) # from line 199, col 107.
                write(u'''</p>
  </div>
</footer>
''')
        write(u'''
<!--
<button style="position:absolute;bottom:0px" onclick="if($(\'.sidebar\').is(\':visible\')){$(\'#page-wrapper\').css({\'margin\':\'50px 0 0 0px\'});$(\'.sidebar\').hide();}else{$(\'#page-wrapper\').css({\'margin\':\'50px 0 0 250px\'});$(\'.sidebar\').show();}" class="btn btn-default"><i class="fa fa-eye"></i></button>
-->
</div>

<!-- User Preferences Modal -->
<div class="modal fade" id="userPreferencesModal" tabindex="-1" role="dialog" aria-labelledby="removeModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="removeModalLabel"><i class="fa fa-user"></i> ''')
        _v = VFN(VFFSL(SL,"zoo",True),"_",False)("User Settings") # u'$zoo._("User Settings")' on line 216, col 82
        if _v is not None: write(_filter(_v, rawExpr=u'$zoo._("User Settings")')) # from line 216, col 82.
        write(u''' </h4>
      </div>
      <div class="modal-body">
        <div class="myWell">
\t</div>
      </div>
    </div>
  </div>
</div>

<script data-main="''')
        _v = VFFSL(SL,"conf",True)["main"]["mmAddress"] # u'$conf["main"]["mmAddress"]' on line 226, col 20
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["mmAddress"]')) # from line 226, col 20.
        write(u'''/admin;module=''')
        _v = VFFSL(SL,"mmodule",True) # u'$mmodule' on line 226, col 60
        if _v is not None: write(_filter(_v, rawExpr=u'$mmodule')) # from line 226, col 60.
        write(u'''" src="''')
        _v = VFFSL(SL,"conf",True)["main"]["publicationUrl"] # u'$conf["main"]["publicationUrl"]' on line 226, col 75
        if _v is not None: write(_filter(_v, rawExpr=u'$conf["main"]["publicationUrl"]')) # from line 226, col 75.
        write(u'''/assets/js/lib/require.js"></script>

</body>
</html>
''')
        
        ########################################
        ## END - generated method body
        
        return _dummyTrans and trans.response().getvalue() or ""
        
    ##################################################
    ## CHEETAH GENERATED ATTRIBUTES


    _CHEETAH__instanceInitialized = False

    _CHEETAH_version = __CHEETAH_version__

    _CHEETAH_versionTuple = __CHEETAH_versionTuple__

    _CHEETAH_genTime = __CHEETAH_genTime__

    _CHEETAH_genTimestamp = __CHEETAH_genTimestamp__

    _CHEETAH_src = __CHEETAH_src__

    _CHEETAH_srcLastModified = __CHEETAH_srcLastModified__

    mmenu0 =None

    js1 = ["main_js"] 

    js3 = [] 

    mmodule = "Distiller"

    mmenu = None

    admin_menu = None

    istyles = None

    tfooter = None

    _mainCheetahMethod_for_Skeleton_bs= 'respond'

## END CLASS DEFINITION

if not hasattr(Skeleton_bs, '_initCheetahAttributes'):
    templateAPIClass = getattr(Skeleton_bs, '_CHEETAH_templateClass', Template)
    templateAPIClass._addCheetahPlumbingCodeToClass(Skeleton_bs)


# CHEETAH was developed by Tavis Rudd and Mike Orr
# with code, advice and input from many other volunteers.
# For more information visit http://www.CheetahTemplate.org/

##################################################
## if run from command line:
if __name__ == '__main__':
    from Cheetah.TemplateCmdLineIface import CmdLineIface
    CmdLineIface(templateObj=Skeleton_bs()).run()


