# -*- coding: utf-8 -*-
__author__ = "Gérald Fenoy"
__copyright__ = "Copyright (C) 2006-2011 GeoLabs SARL"
__license__ = "MIT/X11 Licence"
__version__ = "1.0"

from os.path import abspath
from os.path import isfile
from os.path import splitext
import sys, os
# from io import StringIO

import uno
import sys
import zoo

from unohelper import Base, systemPathToFileUrl, absolutize

from com.sun.star.beans import PropertyValue
from com.sun.star.script import CannotConvertException
from com.sun.star.lang import IllegalArgumentException
from com.sun.star.io import IOException, XOutputStream
from com.sun.star.text.TextContentAnchorType import AT_PARAGRAPH, AS_CHARACTER
from com.sun.star.text.ControlCharacter import PARAGRAPH_BREAK, LINE_BREAK
from com.sun.star.style.BreakType import PAGE_BEFORE, PAGE_AFTER
from com.sun.star.awt import Size, Point


class LOClient:
    outputFormat = {
        "HTML": {
            "html": ["text/html", "HTML (StarWriter)", ""],
            "odt": ["application/vnd.oasis.opendocument.text", "writer8", "private:factory/swriter"]
        },
        "ODT": {
            "pdf": ["application/pdf", "writer_pdf_Export"],
            "html": ["text/html", "HTML (StarWriter)"],
            "odt": ["application/vnd.oasis.opendocument.text", "writer8", "private:factory/swriter"],
            "doc": ["application/vnd.msword ", "MS Word 97"],
            "rtf": ["application/rtf", "Rich Text Format"]
        },
        "ODS": {
            "xls": ["application/vnd.ms-excel", "MS Excel 97"],
            "ods": ["application/vnd.oasis.opendocument.spreadsheet", "StarOffice XML (Calc)", "private:factory/scalc"],
            "csv": ["text/csv", "Text - txt - csv (StarCalc)"]
        },
        "CSV": {
            "ods": ["application/vnd.oasis.opendocument.spreadsheet", "StarOffice XML (Calc)", "private:factory/scalc"],
            "csv": ["text/csv", "Text - txt - csv (StarCalc)"]
        },
        "ODG": {
            "odg": ["application/vnd.oasis.opendocument.spreadsheet", "StarOffice XML (Draw)", "private:factory/scalc"],
            "pdf": ["application/pdf", "draw_pdf_Export"],
            "png": ["image/png", "draw_png_Export"]
        }
    }

    docList = {
    }

    def __init__(self):
        # get the uno component context from the PyUNO runtime  
        localContext = uno.getComponentContext()
        # create the UnoUrlResolver 
        resolver = localContext.ServiceManager.createInstanceWithContext(
            "com.sun.star.bridge.UnoUrlResolver", localContext)
        # connect to the running LibreOffice Server
        try:
            self.ctx = resolver.resolve(
                "uno:socket,host=libreoffice,port=3662;urp;StarOffice.ComponentContext")
            smgr = self.ctx.ServiceManager
            self.desktop = smgr.createInstance("com.sun.star.frame.Desktop")
            self.cursor = None
            self.vcursor = None
            self.nbc = 0
            self.table = None
            self.filterOptions = None
        except Exception as e:
            zoo.error('Unable to connect to the MapMint Document Server for the following reasons:\n' + str(e))

    def setConf(self,conf):
        import json
        self.conf=json.loads(conf)

    def setVar(self, name, value):
        self.conf[name]=value

    def createDoc(self, name):
        zoo.info(str(name))
        parts = name.split('.')
        propFich = PropertyValue("Hidden", 0, True, 0),
        self.doc = self.desktop.loadComponentFromURL(
            self.outputFormat[parts[len(parts) - 1].upper()][parts[len(parts) - 1].lower()][2], "_blank", 0, propFich)
        self.format = parts[len(parts) - 1].upper()
        self.docList[name] = [self.doc, self.format]

    def loadDoc(self, name):
        """ Load a document
        @param name Document filename
        """
        # get the file name of the document
        # TODO: confirm assumption: self.docList is Python dictionary object
        if name in self.docList:
            self.doc = self.docList[name][0]
            self.format = self.docList[name][1]
        else:
            addressDoc = systemPathToFileUrl(name)
            if self.filterOptions is not None:
                tmp = name.split('/')
                tmp = tmp[len(tmp) - 1].split('.')
                zoo.info(str(tmp))
                propFich = (
                    PropertyValue("Hidden", 0, True, 0),
                    PropertyValue("FilterName", 0, self.outputFormat["ODS"][tmp[len(tmp) - 1].lower()][1], 0),
                    PropertyValue("FilterOptions", 0, self.filterOptions, 0),
                )
            else:
                propFich = PropertyValue("Hidden", 0, True, 0),
            doc = 0
            try:
                self.doc = self.desktop.loadComponentFromURL(addressDoc, "_blank", 0, propFich)
                tmp = name.split('/')
                self.format = tmp[len(tmp) - 1].split('.')[1].upper()
                self.docList[name] = [self.doc, self.format, addressDoc]
            except Exception as e:
                zoo.error('Unable to open the file for the following reasons:\n' + str(e))
                return None

    def unloadDoc(self, name):
        """ Unload a document and remove it from the cache
        @param name Document filename
        """
        self.doc.close(True)
        del self.docList[name]

    def csv2ods(self, name, values):
        self.createDoc(name)
        vall = len(values)
        sheet = self.doc.getSheets().getByIndex(0)
        for i in range(vall):
            vall1 = len(values[i])
            for j in range(vall1):
                myCell = sheet.getCellByPosition(j, i)
                myCell.String = str(values[i][j])
        self.saveDoc(name)
        self.unloadDoc(name)

    def csv2ods1(self, oname, tname, options):
        self.filterOptions = options
        self.loadDoc(oname)
        self.saveDoc(tname)
        self.unloadDoc(oname)

    def saveDoc(self, name):
        """ Save the current document
        @param name Document filename
        """
        tmp = name.split('/')
        zoo.info("********" + str(tmp) + "**********")
        tmp = tmp[len(tmp) - 1].split('.')
        zoo.info("********" + tmp[len(tmp) - 1] + "**********")
        zoo.info(self.format)
        zoo.info(self.outputFormat[self.format][tmp[len(tmp) - 1]])
        prop1Fich = (
            PropertyValue("FilterName", 0, self.outputFormat[self.format][tmp[len(tmp) - 1]][1], 0),
            PropertyValue("Overwrite", 0, True, 0)
        )
        outputDoc = systemPathToFileUrl(name)
        self.doc.storeToURL(outputDoc, prop1Fich)

    def getCursor(self):
        self.text = self.doc.Text
        self.cursor = self.doc.Text.createTextCursor()

    def searchInTableWithContext(self, word):
        """ Search for a word in a table contained into a document 
        @param word the string to search for
        """
        for i in range(self.imin, self.doc.TextTables.getCount()):
            for j in range(self.jmin, self.doc.TextTables.getByIndex(i).getColumns().getCount()):
                for k in range(self.kmin, self.doc.TextTables.getByIndex(i).getRows().getCount()):
                    if (self.doc.TextTables.getByIndex(i).getCellByPosition(j, k).String.count(word) > 0):
                        zoo.info("OK FOUND !")
                        self.text = self.doc.TextTables.getByIndex(i).getCellByPosition(j, k).Text
                        self.cursor = self.text.createTextCursor()
                        # if self.vcursor is None:
                        self.vcursor = self.doc.CurrentController.ViewCursor
                        self.cursor.gotoStart(False)
                        self.cursor.gotoEnd(True)
                        zoo.info("***********\n" + self.cursor.String)
                        # self.cursor.goRight(self.text.String.index(word)-1,False)
                        # else:
                        #	self.vcursor.gotoRange(self.se[0],False)
                        # self.vcursor.gotoStart(False)
                        # self.vcursor.gotoEnd(True)
                        self.iposition = self.vcursor.getPosition()
                        self.se = [self.vcursor.getStart(), self.vcursor.getEnd()]
                        zoo.info(self.vcursor.getPosition())
                        # if self.cursor.String.count(word):
                        cpos = self.text.String.index(word)
                        # self.cursor.gotoStart(False)
                        # self.cursor.goRight(cpos+(1*self.nbc),False)
                        # self.cursor.goRight(len(word),True)
                        self.cursor.gotoStart(False)
                        self.cursor.goRight(cpos + (1 * self.nbc), False)
                        self.cursor.goRight(len(word), True)
                        zoo.info(self.cursor.String)
                        self.cursor.String = ""
                        # self.cursor.goRight(self.text.String.index(word)-1,False)
                        # self.cursor.goRight(self.text.String.index(word)+len(word),False)
                        # self.cursor=self.text.createTextCursorByRange(self.cursor)
                        self.imin = i
                        self.jmin = j
                        self.kmin = k
                        return True
        return False

    def searchInTable(self, word):
        """ Search for a word in a table contained into a document 
        @param word the string to search for
        """
        for i in range(self.doc.TextTables.getCount()):
            for j in range(self.doc.TextTables.getByIndex(i).getColumns().getCount()):
                for k in range(self.doc.TextTables.getByIndex(i).getRows().getCount()):
                    try:
                        if (self.doc.TextTables.getByIndex(i).getCellByPosition(j, k).String.count(word) > 0):
                            self.text = self.doc.TextTables.getByIndex(i).getCellByPosition(j, k).Text
                            self.cursor = self.text.createTextCursor()
                            self.cursor.gotoStart(False)
                            return True
                    except:
                        continue
        return False

    def goToWord(self, word):
        """ Search for a word in a document
        @param word Document filename
        """
        if not (self.searchInTable(word)):
            objSearch = self.doc.createSearchDescriptor()
            objSearch.SearchString = word
            objSearch.SearchWords = 1
            tmp = self.doc.findFirst(objSearch)
            # if self.cursor is None:
            self.getCursor()
            if tmp is not None:
                try:
                    self.cursor.gotoRange(tmp, 0)
                    return True
                except:
                    zoo.error("Cannot find the string " + word)
                    return False
            else:
                return False
        else:
            return True

    def searchAndReplaceG(self, orig, new):
        """ Search for a string in a document and replace all its occurence
        with a new value.
        @param orig The string to replace
        @param new The string to replace with
        """
        oDrawPages = self.doc.getDrawPages()
        oDrawPage = oDrawPages.getByIndex(0)
        # content=self.doc.findObjectByName(oDrawPage,"content")
        objSearch = oDrawPage.createSearchDescriptor()
        objSearch.SearchString = orig
        # objSearch.SearchCaseSensitive = False
        # objSearch.SearchWords = False
        # objSearch.ReplaceString = new
        zoo.info(str(oDrawPage.Count))
        i = 0
        for x in [0]:
            zoo.info(str(x))
            oFound = oDrawPage.getByIndex(x)
            oFound.GraphicURL = self.loadImage(new[i], new[i])
            i += 1
        for x in [2, 3, 4]:
            zoo.info(str(x))
            oFound = oDrawPage.getByIndex(x)
            oShape = oFound.Text
            # self.doc.CurrentController.Select(oShape)
            oFound.String = new[i]
            i += 1

        tmp = oDrawPage.findAll(objSearch)
        zoo.info("+++++++++++++++")
        zoo.info(str(tmp.Count))
        zoo.info("+++++++++++++++")
        for x in range(tmp.Count):
            zoo.info(str(x))
            oFound = tmp(x)
            oShape = oFound.Text
            zoo.info(str(oShape.String))
            zoo.info(str(oFound.String))
            self.doc.CurrentController.Select(oShape)
            oShape.String = new

        zoo.info(str(tmp))    
        # tmp = oDrawPage.findFirst(objSearch)
        # return tmp

    def searchAndReplace(self, orig, new, first=False):
        """ Search for a string in a document and replace all its occurence
        with a new value.
        @param orig The string to replace
        @param new The string to replace with
        """
        objSearch = self.doc.createSearchDescriptor()
        objSearch.SearchString = orig
        objSearch.SearchWords = 1

        tmp = self.doc.findFirst(objSearch)
        try:
            objSearch.ReplaceString = new
        except:
            return None

        if not (first):
            self.doc.replaceAll(objSearch)
        return tmp

    def searchAndReplaceImage(self, name, image_name):
        """ Search a named image and replace it by a new one
        @param name The image name
        @param image_name The image path
        """
        d = self.doc.getGraphicObjects()
        if d.hasByName(name):
            d.getByName(name).GraphicURL = self.loadImage(image_name, image_name)
            try:
                self.doc.DrawPage.add(d.getByName(name))
            except:
                pass

    def insertImage(self, image_name, width=None, height=None, vposition=None):
        """ Add image to a document
        Image is added to the active cursor position
        @param image_name Image filename
        """
        oShape = self.doc.createInstance("com.sun.star.text.TextGraphicObject")
        oShape.GraphicURL = image_name
        oShape.AnchorType = AS_CHARACTER
        if width is not None:
            oShape.Width = width
        if height is not None:
            oShape.Height = height
        if vposition is not None:
            oShape.VertOrient = uno.getConstantByName("com.sun.star.text.VertOrientation.CHAR_CENTER")
            oShape.VertOrientRelation = uno.getConstantByName("com.sun.star.text.RelOrientation.TEXT_LINE")
            oShape.VertOrientPosition = vposition
        self.cursor.Text.insertTextContent(self.cursor, oShape, uno.Bool(0))

    def loadImage(self, image_name, image_file):
        oBitmaps = self.doc.createInstance("com.sun.star.drawing.BitmapTable")
        try:
            oBitmaps.insertByName(image_name, systemPathToFileUrl(image_file))
        except Exception as e:
            zoo.error(": > " + e.Message)
        return oBitmaps.getByName(image_name)

    def loadImageG(self, image_name, image_file):
        oDrawPages = self.doc.getDrawPages()
        oDrawPage = oDrawPages.getByIndex(0)
        oBitmaps = oDrawPage.createInstance("com.sun.star.drawing.BitmapTable")
        try:
            oBitmaps.insertByName(image_name, systemPathToFileUrl(image_file))
        except Exception as e:
            zoo.error(": > " + e.Message)
        return oBitmaps.getByName(image_name)

    def insertImageAt(self, image_name, image_file, uniq=False):
        """ Add image to a document
        Image is added to the active cursor position
        @param image_name Image filename
        """
        cnt = 0
        try:
            image_url = self.loadImage(image_name, image_file)
        except:
            zoo.error(str(image_name))
            return -1
        self.imin = 0
        self.jmin = 0
        self.kmin = 0
        while self.searchInTableWithContext(image_name):
            # self.vcursor.gotoStart(False)
            # self.vcursor.gotoEnd(True)
            zoo.info("++++++++++++++++++")
            zoo.info(str(image_name))
            zoo.info(str(self.vcursor))
            zoo.info("++++++++++++++++++")
            # if self.vcursor.String is not None and self.vcursor.String.count(image_name)>0:
            #    cpos=self.vcursor.String.index(image_name)
            #    self.vcursor.gotoStart(False)
            #    self.vcursor.goRight(cpos,False)
            # self.vcursor.goRight(len(image_name),True)
            zoo.info("++++++++++++++++++")
            zoo.info("++++++++++++++++++")
            # self.cursor.gotoRange(self.vcursor,False)
            # self.vcursor.setString("")
            self.insertImage(image_url, vposition="43")
            self.nbc += 1
            return 1
        
        while self.goToWord(image_name):
            self.insertImage(image_url)
            self.searchAndReplace(image_name, "", True)
            sys.stderr.flush()
            cnt += 1
            if uniq:
                return 1

    def statThis(self, diagName, data):
        """ Fill a diagram with data
        @param diagName The diagram name
        @param data The diagram data
        """
        myObjects = self.doc.getEmbeddedObjects()
        myObject = myObjects.getByName(diagName)
        diagram = myObject.getEmbeddedObject()
        dat = diagram.Data

        dat.setColumnDescriptions(tuple(data[1]))
        dat.setRowDescriptions(tuple(data[0]))
        lstData = []
        try:
            for i in range(0, len(data[2])):
                lstData.append(tuple(data[2][i]))
                #lstData.append(data[2][i])
            dat.setData(tuple(lstData))
        except:
            #dat.setData(tuple([data[2]]))
            dat.setData([data[2]])

    def exportStatAsImage(self, imgName, diagName, data):
        """ Export a diagram as image
        @param diagName The diagram name
        @param data The diagram data
        """
        import time, shutil
        myObjects = self.doc.getEmbeddedObjects()
        myObject = myObjects.getByName(diagName)
        diagram = myObject.getEmbeddedObject()
        dat = diagram.Data

        dat.setColumnDescriptions(tuple(data[0]))
        dat.setRowDescriptions(tuple(data[1]))
        lstData = []
        for i in range(0, len(data[2])):
            lstData.append(tuple(data[2][i]))
        dat.setData(tuple(lstData))
        self.saveDoc(imgName.replace(".png", ".html"))
        self.loadDoc(imgName.replace(".png", ".html"))
        d = self.doc.getGraphicObjects()
        myFile = d.getByName(diagName).GraphicURL
        zoo.info(str(myFile))
        zoo.info(imgName.replace(".png", ".html"))
        shutil.copy(myFile.replace("file://", ""), imgName)

    def addParagraph(self, pName, pData):
        """ Add paragraphs from an Array
        @param pName the string to replace 
        @param pData the paragraphs Array
        """
        text = self.doc.Text
        if self.cursor is None:
            self.getCursor()
        self.goToWord(pName)
        #text.insertString(self.cursor, "", 0)
        #text.insertControlCharacter(self.cursor, PARAGRAPH_BREAK, 0)
        cnt = 0
        isHTML=False
        for i in pData:
            try:
                import time
                import random
                if i.count("<")>0:
                    if not(isHTML):
                        isHTML=True
                        fname = "/var/www/html/tmp/tmp_" + pName  + str(int(time.time()*random.random())) + ".html"
                        f = open(fname, "wb")
                    f.write( (i+"<br/>").encode("utf-8") )

                    #f.close()
                    #self.insertDoc(fname)
                else:
                    text.insertString(self.cursor, i, 0)
                    text.insertString(self.cursor, "\n", 0)
            #try:
            #    text.insertString(self.cursor, unicode(i + "", 'utf-8'), 0)
            except Exception as e:
                zoo.error(str(e))
                text.insertString(self.cursor, i, 0)
            text.insertControlCharacter(self.cursor, LINE_BREAK, 0)
            #if cnt + 1 < len(pData):
            #    text.insertControlCharacter(self.cursor, PARAGRAPH_BREAK, 0)
            #else:
            #    text.insertString(self.cursor, " ", 0)
            cnt += 1
        if isHTML:
            f.close()
            self.insertDoc(fname)
        self.searchAndReplace(pName, "")

    def searchTable(self, tName):
        if self.doc.TextTables.hasByName(tName):
            self.table = self.doc.TextTables.getByName(tName)
        else:
            self.table = None

    def addTable(self, tName, tData):
        text = self.doc.Text
        self.searchTable(tName)
        if self.cursor is None:
            self.cursor=self.getCursor()
        if self.table is None:
            self.table = self.doc.createInstance("com.sun.star.text.TextTable")
            self.table.initialize(len(tData), len(tData[0]))
            self.table.Name = tName
            text.insertTextContent(self.cursor, self.table, 0)
        i = 0
        i0 = 1
        countline = 0
        if len(tData)<=1:
            self.table.dispose()
            return -1
        while i < len(tData):
            j = 0
            if countline > 1:
                myLines = self.table.Rows
                myLines.insertByIndex(i, 1)
            while j < len(tData[i]):
                toto = tData[i][j]
                try:
                    cell = self.table.getCellByPosition(j, i)
                except:
                    myCols = self.table.Columns
                    myCols.insertByIndex(j, 1)
                    cell = self.table.getCellByPosition(j, i)
                try:
                    if toto.count("<") > 0 and toto.count(">") > 0 and toto.count('</')==0 and toto.count('/>')==0:
                        cell.setFormula(toto.replace("i", str(j)))
                    else:
                        cell.setValue(float(toto))
                except:
                    try:
                        cell.setString(unicode(str(toto), 'utf-8'))
                    except:
                        try:
                            if toto.count('</')>0 or toto.count('/>')>0:
                                fname = self.conf["tmpPath"] + "/report_tmp_" + self.conf["usid"] + ".html"
                                hfile = open(fname, "w")
                                hfile.write(str(toto))
                                hfile.close()
                                self.cursor=cell.createTextCursor()
                                self.insertDoc(fname)
                            else:
                                cell.setString(str(toto))
                        except:
                            cell.setString(str(toto))
                j += 1
            countline += 1
            i0 += 1
            i += 1

    def addImageTable(self, tName, tData, sizes):
        text = self.doc.Text
        self.searchTable(tName)
        if self.cursor is None:
            self.getCursor()
        if self.table is None:
            self.table = self.doc.createInstance("com.sun.star.text.TextTable")
            self.table.initialize(len(tData), len(tData[0]))
            self.table.Name = tName
            text.insertTextContent(self.cursor, self.table, 0)
        i = 0
        i0 = 0
        countline = 0
        j = 0
        while i < len(tData):
            if j >= 1:
                j = 0
                myLines = self.table.Rows
                myLines.insertByIndex(i0, 1)

            image_url = self.loadImage(tData[i], tData[i])
            self.text = self.table.getCellByPosition(j, i0).Text
            self.cursor = self.table.getCellByPosition(j, i0).Text.createTextCursor()
            self.insertImage(image_url, sizes[i]["width"], sizes[i]["height"])
            if i + 1 < len(tData):
                image_url = self.loadImage(tData[i + 1], tData[i + 1])
                self.text = self.table.getCellByPosition(j + 1, i0).Text
                self.cursor = self.table.getCellByPosition(j + 1, i0).Text.createTextCursor()
                self.insertImage(image_url, sizes[i + 1]["width"], sizes[i + 1]["height"])
            j += 2
            if j >= 1:
                i0 += 1
                i += 2

    def appendDoc(self, name):
        """ Append a document to the current document
        @param name Document to append filename
        """
        if self.cursor is None:
            self.getCursor()
        self.cursor.gotoEnd(0)
        self.cursor.BreakType = PAGE_BEFORE
        self.text.insertControlCharacter(self.cursor, PARAGRAPH_BREAK, 0)
        aDoc = systemPathToFileUrl(name)
        self.cursor.insertDocumentFromURL(aDoc, ())

    def insertDoc(self, name):
        """ Insert a document into the current document
        @param name Document to append filename
        """
        aDoc = systemPathToFileUrl(name)
        self.cursor.insertDocumentFromURL(aDoc, ())

    def addList(self, name, elem):
        """ Append a list to the current document
        @param name the string in the document to replace
        @param elem the element list
        """
        text = self.doc.Text
        if self.cursor is None:
            self.getCursor()
        tmp = self.goToWord(name)
        # self.cursor=tmp
        for i in elem:
            # self.cursor.NumberingType=CIRCLE_NUMBER
            self.cursor.NumberingStyleName = "List 1"
            self.cursor.NumberingLevel = 0
            # self.cursor.NumberingStyleName="Numbering "+str(1)
            if isinstance(i, (frozenset, list, set, tuple,)):
                self.text.insertString(self.cursor, i[0], 0)
                self.text.insertControlCharacter(self.cursor, PARAGRAPH_BREAK, 0)
                self.cursor.NumberingStyleName = ""
                for j in range(0, len(i)):
                    # self.cursor.NumberingType=CIRCLE_NUMBER
                    self.cursor.NumberingStyleName = "List 2"
                    self.cursor.NumberingLevel = 1
                    self.text.insertString(self.cursor, i[j], 0)
                    self.text.insertControlCharacter(self.cursor, PARAGRAPH_BREAK, 0)
                    self.cursor.NumberingStyleName = ""
            else:
                self.text.insertString(self.cursor, i, 0)
                self.text.insertControlCharacter(self.cursor, PARAGRAPH_BREAK, 0)
                self.cursor.NumberingStyleName = ""

        tmp = self.searchAndReplace(name, "")
