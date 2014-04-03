#!/usr/bin/env python
# -*- coding: utf-8 -*

import os
import sys
import epsglookup
import Projection

# Test Case based the PROJ.4's cs2cs command used by Frank Warmerdam
# in the document:
# PROJ.4 Handling Coordinate Systems Frank Warmerdam OSGIS June 2004
# http://www.omsug.ca/dl/osgis2004/PROJ4_HandlingCoordinateSystems.pdf
#
# cs2cs +proj=latlong +datum=WGS84 +to +proj=utm +zone=11 +datum=WGS84
# Input:
#  -118.0 33.0
# Output:
#  406582.22 3651730.97 0.00

try:
    
    # Simple configuration:
    # True - find projection by ID
    # False - find projection by Name
    lookup_by_id = False;
    
    #
    # 1. Preparation
    #
    
    # Input coordinates 
    input_coords = (-118.0, 33.0)
    
    # Expected output with coordinates projected to UTM Zone 11
    output_coords = (406582.22, 3651730.97, 0.00)

    # epsg file location
    epsg_file = os.path.join(os.getcwd(), "epsg.proj")
    
    # Instantiate lookup object attached to the epsg file.
    proj_lookup = epsglookup.ProjectionLookupXML(epsg_file)

    #
    # 2. Find projection definiton by EPSG id or name.
    #
    
    if lookup_by_id is True:
        # by EPSG id
        epsg_id_utm = 32611 # WGS 84 / UTM zone 11N
        epsg_utm_def = proj_lookup.find_by_id(epsg_id_utm)
    else:
        # by EPSG name
        epsg_name_utm = "WGS 84 / UTM zone 11N"
        epsg_utm_def = proj_lookup.find_by_name(epsg_name_utm)
        
    if epsg_utm_def is None:
        print "Projection not found"   
        sys.exit()
    
    # Check what we've found
    print "Found projection parameters:"
    print "ID: ", epsg_utm_def.id
    print "Name: ", epsg_utm_def.name
    print "Params: ", epsg_utm_def.params
    
    #
    # 3. Project coordinates
    #
    proj = Projection.Projection(epsg_utm_def.params)
    
    print "----------Project to UTM Zone 11-----------"
    print "Location: ", input_coords[0], input_coords[1]
    print "Forward: ", proj.Forward(input_coords[0], input_coords[1])
    print "----------Back to WGS84--------------------"
    print "Location: ", output_coords[0], output_coords[1]
    print "Forward: ", proj.Inverse(output_coords[0], output_coords[1])
    
except epsglookup.EPSGLookupError, err:
    print "Message: ", err.message, ", Ln: ", err.line, ",Col: ", err.column

