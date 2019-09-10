#!/usr/bin/env python
# -*- coding: utf-8 -*
"""
epsglookup.py - the EPSG projection lookup utility

This software is released under the MIT License
(see copy at http://www.opensource.org/licenses/mit-license.html)

Copyright (c) 2006 by Mateusz Łoskot <mateusz@loskot.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

"""
__revision__ = "$Revision: 1.2 $"

#
# Imports
#

import re

from xml.sax import ContentHandler
from xml.sax import make_parser
from xml.sax import SAXParseException


#
# Common Public Members
#

class EPSGLookupError(Exception):
    """ Exception class used by this module.
    
    This exception is thrown when parsing errors occure.
    
    """

    def __init__(self, message, line=0, column=0):
        """ Lookup exception constructor.
        
        message - error message forwarded from SAXException
        line - line in which parse error occured
        column - column in which parse error occured
        
        """
        self.message = message
        self.line = line
        self.column = column
        Exception.__init__(self, message)


class ProjectionDef:
    """ Structure of attributes of projection."""

    def __init__(self):
        """Default constructor."""
        self.id = 0
        self.name = ""
        self.params = []


#
# Standard EPSG related Public Members
#

class ProjectionLookup:
    """Projection lookup class for standard EPSG file."""

    def __init__(self, epsg_file):
        """ Constructor.
        
        epsg_file - EPSG projections dictionary (PROJ.4 format)
        
        """
        self.__epsg_file = epsg_file
        self.__epsg_str = open(self.__epsg_file).read()
        self.__proj_def = ProjectionDef()

    def __lookup(self, regexp):
        """ Split projection string to list of separate parameters.
        
        regexp - lookup regular expression comiled by callee
        """
        try:
            # Compile regexp and search projection
            rpattern = re.compile(regexp, re.MULTILINE)
            rmatch = rpattern.search(self.__epsg_str)
            if rmatch == None:
                return None

            # Create output object
            self.__proj_def.id = rmatch.group(5).strip()
            self.__proj_def.name = rmatch.group(2).strip()

            # Projection parameters list
            self.__proj_def.params = []
            for param in rmatch.group(7).split(" "):
                if len(param.strip()) > 0:
                    if param[0] != "<" and param[1] != ">":
                        self.__proj_def.params.append(param.lstrip("+"))

            return self.__proj_def

        except Exception:
            raise EPSGLookupError("Lookup runtime error!")

    def find_by_id(self, epsg_id):
        """ Finds projection definition by EPSG id.
        
        epsg_id - numeric identifier of projection.
        
        """
        # Prepare searching regexp
        regexp = r"^(#\s)(.+)(\n)(\<)(%d)(\>)(.+)(\n)" % epsg_id
        return self.__lookup(regexp)

    def find_by_name(self, epsg_name):
        """ Finds projection definition by EPSG id.
        
        epsg_name - projection descriptive name.
        
        """
        # Prepare searching regexp
        regexp = r"^(#\s)(.*%s.*)(\n)(\<)([0-9]+)(\>)(.+)(\n)" % epsg_name
        return self.__lookup(regexp)


#
# Custom EPSG in XML format related Public Members
#

class ProjectionLookupXML:
    """ Projection lookup class for XML version of EPSG dictionary file.
    
    XML format for EPSG was introduced in Thuban project (by Intevation GmbH.).
    Thuban includes also 'make_epsg.py' script to generate XML 'epsg.proj' file.
    This class provides operation to find PROJ.4 projection using its
    name or EPSG id.
    Thic class is based on the SAX parser from Python Standard Library.
    
    """

    def __init__(self, epsg_proj_file):
        """ Constructor.
    
        epsg_proj_file - path to EPSG data file; data file is assumed to be
                        in XML format defined by Thuban.
        
        """
        self.__epsg_file = epsg_proj_file
        self.__xml_parser = make_parser()

    def __lookup(self, name, value):
        """ Main lookup function finds projection with given name or id.
        
        name - name of attribute by which lookup is made (epsg|name)
        value - value of attribute (EPSG id or descriptive name)
        
        """
        proj_handler = _ProjectionHandler(name, value)
        self.__xml_parser.setContentHandler(proj_handler)
        try:
            self.__xml_parser.parse(self.__epsg_file)
        except _StopOnFound as value:
            # Found it!
            return proj_handler.get_projection()
        except SAXParseException as error:
            # Parsing Error
            raise EPSGLookupError(error.getMessage(),
                                  error.getLineNumber(),
                                  error.getColumnNumber())

    def find_by_id(self, epsg_id):
        """ Finds projection definition by EPSG id.
        
        epsg_id - numeric identifier of projection.
        
        """
        # Simple input param validation
        if isinstance(epsg_id, (int, float)):
            lookup_id = str(epsg_id)
        else:
            lookup_id = epsg_id

        if len(lookup_id) <= 0:
            return None

        # Find projection
        return self.__lookup("epsg", lookup_id)

    def find_by_name(self, epsg_name):
        """ Finds projection definition by EPSG id.
        
        epsg_name - projection descriptive name.
        
        """
        # Simple input param validation
        lookup_name = epsg_name

        if not isinstance(lookup_name, str) or len(lookup_name) <= 0:
            return None

        # Find projection
        return self.__lookup("name", lookup_name)


#
# Private Members
#

class _StopOnFound(Exception):
    """ Exception signaling projection is found.
    
    This exception is used internally and is catched inside the module.
    ***It's never assumed to be thrown outside the module.***
    
    """
    pass


class _ProjectionHandler(ContentHandler):
    """Handler to deal with projection definitions."""

    def __init__(self, name, value):
        """ Constructor.
        
        name - name of searched attribute
        value - searched value of attribute of given name
        
        """
        # Flag indicating if searched projection has been found
        self.__is_proj = 0
        # Searched parameter name, attribute (epsg|name)
        self.__lookup_name = name
        # Searched parameter value (epsg id or name)
        self.__lookup_value = value
        # Projection definition
        self.__proj_def = ProjectionDef()

        ContentHandler.__init__(self)

    def get_projection(self):
        """Returns definition of found projection or None."""
        if len(self.__proj_def.params) > 0:
            return self.__proj_def
        else:
            return None

    def startElement(self, name, attrs):
        """ Start element handler. It defines main searching logic.
        
        name - name of XML element
        attrs - list of element attributes
        
        """
        if name == "projection":

            if attrs.get(self.__lookup_name) == self.__lookup_value:
                # Found Projection!
                self.__is_proj = 1
                self.__proj_def.id = attrs.get("epsg").encode("ascii")
                self.__proj_def.name = attrs.get("name").encode("ascii")

            elif self.__is_proj == 1:
                # Next <projection> has been encountered
                # then report found projection 
                raise _StopOnFound("Projection found!")

        elif name == "parameter" and self.__is_proj == 1:
            # Read projection parameters one-by-one
            param = attrs.get("value")
            self.__proj_def.params.append(param.encode("ascii"))
