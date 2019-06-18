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
import psycopg2
import sys
import json
import time
import authenticate.service as auth
import zoo

# CREATE TEMPORARY TABLE home_catchment10km AS SELECT * from vertices_tmp as nodes JOIN (SELECT * FROM driving_distance('SELECT gid AS id,source,target,reverse_cost as cost from ways',2000,100000,false,false)) as Goo ON nodes.id=Goo.vertex_id;

psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

# con=psycopg2.connect("dbname=demogis user=djay host=127.0.0.1 port=5432")
# con.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE)

table = "network_20130318"

the_geom = "wkb_geometry"


def getRasterLayer(conf):
    import mapscript
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/public_maps/project_" + conf["senv"]["last_map"] + ".map")
    for i in range(0, m.numlayers):
        if m.getLayer(i).type == mapscript.MS_LAYER_RASTER and m.getLayer(i).metadata.get("mmQuery") == "true":
            return m.getLayer(i)
    return None


def getRoutingLayer(conf):
    import mapscript
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/public_maps/project_" + conf["senv"]["last_map"] + ".map")
    for i in range(0, m.numlayers):
        if m.getLayer(i).metadata.get("mmRouting") == "true":
            return m.getLayer(i)
    return None


def parseDb(dbp):
    print(auth.parseDb(dbp), file=sys.stderr)
    return auth.parseDb(dbp)


supportedgc = ['Bing', 'GeoNames', 'GeocoderDotUS', 'Google', 'GoogleV3', 'MapQuest', 'MediaWiki', 'OpenMapQuest', 'SemanticMediaWiki', 'Yahoo']


def reverseGeocode(conf, inputs, outputs):
    import shortInteger
    import geopy.geocoders as gc
    if not ("geocoder" in conf["main"]) or not (supportedgc.count(conf["main"]["geocoder"])):
        conf["lenv"]["message"] = zoo._("Unable to find reliable GeoCoder")
        return zoo.SERVICE_FAILED
    geolocator = eval("gc." + conf["main"]["geocoder"] + "()")
    location = geolocator.reverse(inputs["y"]["value"] + ", " + inputs["x"]["value"])
    if location is not None:
        outputs["Result"]["value"] = json.dumps({"address": location[0].address, "latitude": location[0].latitude, "longitude": location[0].longitude})
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("Unable to find any address for this locatiton")
        return zoo.SERVICE_FAILED


def geocodeAdresse(conf, inputs, outputs):
    import shortInteger
    import geopy.geocoders as gc
    if not ("geocoder" in conf["main"]) or not (supportedgc.count(conf["main"]["geocoder"])):
        conf["lenv"]["message"] = zoo._("Unable to find reliable GeoCoder")
        return zoo.SERVICE_FAILED
    geolocator = eval("gc." + conf["main"]["geocoder"] + "()")
    location = geolocator.geocode(inputs["search"]["value"])
    if location is not None:
        outputs["Result"]["value"] = json.dumps(location)
        return zoo.SERVICE_SUCCEEDED
    else:
        conf["lenv"]["message"] = zoo._("Unable to find any location for this address")
        return zoo.SERVICE_FAILED


def loadRoute(conf, inputs, outputs):
    import shortInteger
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    sql = "SELECT n, ST_AsGeoJSON(ST_GeometryN(the_geom, n)) As geomewkt FROM ((select wkb_geometry from velo.savedpath where trace='" + inputs["trace"]["value"] + "')) As foo(the_geom) CROSS JOIN generate_series(1,100) n WHERE n <= ST_NumGeometries(the_geom)"
    cur.execute(sql)
    res = cur.fetchall()
    points = []
    j = 0
    for i in res:
        print(i, file=sys.stderr)
        points += [json.loads(i[1])]
        j += 1

    outputs["Result"]["value"] = json.dumps({'trace': shortInteger.unShortURL(conf, inputs["trace"]["value"]), 'points': points})
    return zoo.SERVICE_SUCCEEDED


def removeRoute(conf, inputs, outputs):
    import os
    try:
        os.remove(conf["main"]["dataPath"] + "/Paths/Saved_Result_" + inputs["trace"]["value"] + ".map")
        os.remove(conf["main"]["dataPath"] + "/Paths/Saved_ZOO_DATA_Result_" + inputs["trace"]["value"] + ".json")
    except Exception as e:
        print(e, file=sys.stderr)
    res = []
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    sql = "delete from velo.savedpath where id_user=(SELECT id from velo.users where login='" + conf["senv"]["login"] + "') and trace='" + inputs["trace"]["value"] + "'"
    cur.execute(sql)
    conn.commit()
    listRoute(conf, inputs, outputs)
    return zoo.SERVICE_SUCCEEDED


def listRoute(conf, inputs, outputs):
    res = []
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    sql = "SELECT trace,name from velo.savedpath where id_user=(SELECT id from velo.users where login='" + conf["senv"]["login"] + "')"
    cur.execute(sql)
    res = cur.fetchall()
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def listRouteCG56(conf, inputs, outputs):
    res = []
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    sql = "SELECT trace,name from velo.savedpath where id_user in (SELECT id from velo.users where s_group_id=2)"
    cur.execute(sql)
    res = cur.fetchall()
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def listPOIUser(conf, inputs, outputs):
    res = []
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    sql = "SELECT id,title,content,ST_AsgeoJSON(geom) from actualites where cat=" + inputs["type"]["value"]
    cur.execute(sql)
    res = cur.fetchall()
    outputs["Result"]["value"] = json.dumps(res)
    return zoo.SERVICE_SUCCEEDED


def getGroupForUser(conf):
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    sql = "SELECT name from velo.groups where id=(select id_group from velo.users,user_group where velo.users.id=id_user and login='" + conf["senv"]["login"] + "')"
    cur.execute(sql)
    res = cur.fetchall()
    return res[0][0]


def applyStyleToRouteMap(conf, inputs, outputs):
    import mapscript
    m0 = mapscript.mapObj(inputs["map"]["value"])
    m = mapscript.mapObj(conf["main"]["dataPath"] + "/maps/project_StyleRoute.map")
    m.getLayer(0).name = m0.getLayer(0).name
    m.getLayer(0).data = m0.getLayer(0).data
    m.getLayer(0).connection = None
    m.getLayer(0).connection = m0.getLayer(0).connection
    m.getLayer(0).connectiontype = m0.getLayer(0).connectiontype
    m.getLayer(0).setProjection(m0.getLayer(0).getProjection())
    for i in range(0, m.getLayer(0).numclasses):
        if m.getLayer(0).getClass(i).name == "(null)":
            m.getLayer(0).getClass(i).name = ""
            tstr = m.getLayer(0).getClass(18).getExpressionString()
            m.getLayer(0).getClass(i).setExpression("(" + m.getLayer(0).getClass(18).getExpressionString().replace("(null)", "") + " or " + tstr.replace("(null)", "Inconnu") + ")")
    m.save(inputs["map"]["value"])
    outputs["Result"]["value"] = zoo._("Map updated")
    return zoo.SERVICE_SUCCEEDED


def savePOIUser(conf, inputs, outputs):
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    inputs["title"]["value"] = inputs["title"]["value"].replace("'", "''")
    inputs["content"]["value"] = inputs["content"]["value"].replace("'", "''")
    if "point" in inputs and inputs["point"]["value"] != "NULL":
        points = "(SELECT setSRID(GeometryFromText('POINT(" + inputs["point"]["value"].replace(",", " ") + ")'),4326) as geom)"
        print(points, file=sys.stderr)
        cur.execute("INSERT INTO actualites (title,content,id_user,cat,type_incident,geom) VALUES ('" + inputs["title"]["value"] + "','" + inputs["content"]["value"] + "',(SELECT id from velo.users where login='" + conf["senv"]["login"] + "')," + inputs["type"]["value"] + "," + inputs["type_incident"][
            "value"] + ",(" + points + "))")
    else:
        cur.execute(
            "INSERT INTO actualites (title,content,id_user,lon,lat,cat,type_incident) VALUES ('" + inputs["title"]["value"] + "','" + inputs["content"]["value"] + "',(SELECT id from velo.users where login='" + conf["senv"]["login"] + "')," + inputs["long"]["value"] + "," + inputs["lat"]["value"] + "," + inputs["type"][
                "value"] + "," + inputs["type_incident"]["value"] + ")")
    conn.commit()
    print("DEBUG", file=sys.stderr)
    # print >> sys.stderr,inputs["point"]["value"]

    outputs["Result"]["value"] = zoo._("Your news was successfully inserted.")
    return zoo.SERVICE_SUCCEEDED


def saveRoute(conf, inputs, outputs):
    import shutil
    import mapscript
    import shortuuid
    import shortInteger
    # Store a copy of the result then return it URL to be shared
    oFile = inputs["url"]["value"].replace(conf["main"]["mapserverAddress"] + "?map=", "")
    nameId = oFile.replace(conf["main"]["dataPath"], "").replace(".map", "").replace("Result_", "").replace("/", "")
    newNameId = str(time.time()).split('.')[0]
    shutil.copy2(oFile, oFile.replace("Result_" + nameId, "Saved_Result_" + newNameId).replace(conf["main"]["dataPath"], conf["main"]["dataPath"] + "/Paths/"))
    shutil.copy2(oFile.replace("Result_", "ZOO_DATA_Result_").replace(".map", ".json"), oFile.replace("Result_" + nameId, "Saved_ZOO_DATA_Result_" + newNameId).replace(".map", ".json").replace(conf["main"]["dataPath"], conf["main"]["dataPath"] + "/Paths/"))
    m = mapscript.mapObj(oFile.replace("Result_" + nameId, "Paths/Saved_Result_" + newNameId))
    con1 = m.getLayer(0).connection
    m.getLayer(0).connection = con1.replace("ZOO_DATA_Result_" + nameId, "Paths/Saved_ZOO_DATA_Result_" + newNameId)
    m.save(oFile.replace("Result_" + nameId, "Paths/Saved_Result_" + newNameId))

    fn = oFile.replace("Result_" + nameId, "Paths/Saved_Result_" + newNameId)
    file = open(fn, "r")
    fileo = open(fn.replace(newNameId, newNameId + "_tmp"), "w")
    for i in file.readlines():
        if i.count("EXTENT") == 0:
            fileo.write(i + "\n")
    file.close()
    fileo.close()

    m = mapscript.mapObj(fn.replace(newNameId, newNameId + "_tmp"))
    m.save(fn)

    outputs["Result"]["value"] = conf["main"]["applicationAddress"] + "load/" + conf["senv"]["last_map"] + "/" + shortInteger.shortURL(int(newNameId))

    return zoo.SERVICE_SUCCEEDED


def saveRouteForUser(conf, inputs, outputs):
    print("DEBUG 0000", file=sys.stderr)
    saveRoute(conf, inputs, outputs)

    print("DEBUG", file=sys.stderr)
    idtrace = outputs["Result"]["value"].replace(conf["main"]["applicationAddress"] + "load/" + conf["senv"]["last_map"] + "/", "")
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    points = "select ST_Union(t.geom) from ("
    for i in inputs["point"]["value"]:
        if points != "select ST_Union(t.geom) from (":
            points += " UNION "
        points += "(SELECT setSRID(GeometryFromText('POINT(" + i.replace(",", " ") + ")'),4326) as geom)"
    points += ") as t"
    print(points, file=sys.stderr)
    if "user" in inputs:
        cur.execute("INSERT INTO velo.savedpath (trace,name,id_user,wkb_geometry) VALUES ('" + idtrace + "','" + inputs["name"]["value"] + "',NULL,(" + points + "))")
    else:
        cur.execute("INSERT INTO velo.savedpath (trace,name,id_user,wkb_geometry) VALUES ('" + idtrace + "','" + inputs["name"]["value"] + "',(SELECT id from velo.users where login='" + conf["senv"]["login"] + "'),(" + points + "))")
    conn.commit()
    print("DEBUG", file=sys.stderr)
    print(inputs["point"]["value"], file=sys.stderr)

    outputs["Result"]["value"]
    return zoo.SERVICE_SUCCEEDED


def saveContext(conf, inputs, outputs):
    import shortInteger, time, sqlite3
    print("DEBUG 0000", file=sys.stderr)
    conn = sqlite3.connect(conf['main']['dblink'])
    cur = conn.cursor()
    newNameId = str(time.time()).split('.')[0]
    name = shortInteger.shortURL(int(newNameId))
    layers = ""
    if 'length' in inputs["layers"]:
        for i in inputs["layers"]["value"]:
            if layers != '':
                layers += ","
            layers += i
    else:
        layers += inputs["layers"]["value"]
    req = "INSERT INTO contexts (name,layers,ext) VALUES ('" + name + "','" + layers + "','" + inputs["extent"]["value"] + "')"
    print(req, file=sys.stderr)
    cur.execute(req)
    conn.commit()
    outputs["Result"]["value"] = conf["main"]["applicationAddress"] + "public/" + conf["senv"]["last_map"] + ";c=" + name
    return zoo.SERVICE_SUCCEEDED


def loadContext(conf, inputs, outputs):
    import shortInteger, time, sqlite3
    conn = sqlite3.connect(conf['main']['dblink'])
    cur = conn.cursor()
    name = inputs["name"]["value"]
    req = "SELECT ext,layers from contexts where name = '" + name + "'"
    cur.execute(req)
    conn.commit()
    res = cur.fetchall()
    outputs["Result"]["value"] = json.dumps({"ext": res[0][0], "layers": res[0][1].split(',')})
    return zoo.SERVICE_SUCCEEDED


def toLon(x):
    if x > 180:
        lon = x - 360
    else:
        lon = x
    return lon


# use the vincenty formula to get accurate distance measurements
def sphereDistance(from_point, to_point):
    distance.VincentyDistance.ELLIPSOID = 'WGS-84'
    return distance.distance((toLon(from_point.x), from_point.y), \
                             (toLon(to_point.x), to_point.y))


def computeDistanceAlongLine(conf, inputs, outputs):
    # import shapely
    # from shapely import geos
    # import shapely.wkt
    import osgeo.ogr
    import osgeo.gdal
    import os
    geom = osgeo.ogr.CreateGeometryFromJson(inputs["line"]["value"])
    print(geom, file=sys.stderr)
    points = geom.GetPoints()
    res = []
    for i in range(0, len(points) - 1):
        poi0 = osgeo.ogr.CreateGeometryFromWkt('POINT(' + str(points[i][0]) + '  ' + str(points[i][1]) + ')')
        poi1 = osgeo.ogr.CreateGeometryFromWkt('POINT(' + str(points[i + 1][0]) + '  ' + str(points[i + 1][1]) + ')')

        print(dir(poi0.Distance(poi1)), file=sys.stderr)
        res += [poi0.Distance(poi1)]
    outputs["Result"]["value"] = json.dumps(res)
    drv = osgeo.ogr.GetDriverByName("GeoJSON")
    ds = drv.CreateDataSource("/vsimem//store" + conf["lenv"]["sid"] + "0.json")
    lyr = ds.CreateLayer("Result", None, osgeo.ogr.wkbUnknown)
    field_defn = osgeo.ogr.FieldDefn("distance", osgeo.ogr.OFTString)
    field_defn.SetWidth(len(outputs["Result"]["value"]))
    lyr.CreateField(field_defn)
    feat = osgeo.ogr.Feature(lyr.GetLayerDefn())
    feat.SetField("distance", outputs["Result"]["value"])
    feat.SetGeometry(geom)
    lyr.CreateFeature(feat)
    ds.Destroy()
    print("OK1", file=sys.stderr)
    vsiFile = osgeo.gdal.VSIFOpenL("/vsimem//store" + conf["lenv"]["sid"] + "0.json", "r")
    print("OK2", file=sys.stderr)
    i = 0
    print(str(vsiFile), file=sys.stderr)
    osgeo.gdal.VSIFSeekL(vsiFile, 0, os.SEEK_END)
    print("OK", file=sys.stderr)
    while osgeo.gdal.VSIFSeekL(vsiFile, 0, os.SEEK_END) > 0:
        print("OK", file=sys.stderr)
        i += 1
    print("OK", file=sys.stderr)
    fileSize = osgeo.gdal.VSIFTellL(vsiFile)
    print("OK", file=sys.stderr)
    osgeo.gdal.VSIFSeekL(vsiFile, 0, os.SEEK_SET)
    outputs["Result"]["value"] = osgeo.gdal.VSIFReadL(fileSize, 1, vsiFile)
    osgeo.gdal.Unlink("/vsimem/store" + conf["lenv"]["sid"] + "0.json")
    print(outputs["Result"]["value"], file=sys.stderr)
    return zoo.SERVICE_SUCCEEDED


def splitLine(conf, inputs, outputs):
    import osgeo.ogr
    # import shapely
    # import shapely.wkt
    geom = osgeo.ogr.CreateGeometryFromJson(inputs["line"]["value"]).ExportToWkt()
    tmp = geom.split("(")[1].split(")")[0]
    geom = tmp.split(",")
    print(geom, file=sys.stderr)
    sPc = inputs["startPoint"]["value"].split(",")
    # sP=shapely.wkt.loads('POINT('+sPc[0]+' '+sPc[1]+')')
    ePc = inputs["endPoint"]["value"].split(",")
    res = []
    isStarted = False
    for i in range(0, len(geom)):
        toto = geom[i].split(" ")
        if float(toto[0]) == float(sPc[0]) and float(toto[1]) == float(sPc[1]):
            isStarted = True
        if float(toto[0]) == float(ePc[0]) and float(toto[1]) == float(ePc[1]):
            isStartted = False
            break
        if isStarted:
            res += [toto]
        print(geom[i], file=sys.stderr)
        print(sPc, file=sys.stderr)
        print(ePc, file=sys.stderr)
        print("******", file=sys.stderr)

    geometryRes = osgeo.ogr.Geometry(osgeo.ogr.wkbLineString25D)
    for i in range(0, len(res)):
        geometryRes.AddPoint(float(res[i][0]), float(res[i][1]), float(res[i][2]))
    outputs["Result"]["value"] = geometryRes.ExportToJson()
    return zoo.SERVICE_SUCCEEDED


def findNearestNode(table, cur, lonlat):
    sql = "with index_query as (  select    *, st_distance(the_geom,'SRID=4326;POINT(" + lonlat[0] + " " + lonlat[1] + ")') as distance  from vertices_tmp where the_geom && ST_Buffer(GeometryFromText('POINT(" + lonlat[0] + " " + lonlat[
        1] + ")',4326),0.001) limit 10) select * from index_query order by distance limit 1;"
    # sql="select *, distance("+the_geom+",GeometryFromText('POINT("+lonlat[0]+" "+lonlat[1]+")',4326)) as distance from vertices_tmp where ST_Intersects("+the_geom+",ST_Buffer(GeometryFromText('POINT("+lonlat[0]+" "+lonlat[1]+")',4326),0.001)) order by "+the_geom+" <-> GeometryFromText('POINT("+lonlat[0]+" "+lonlat[1]+")',4326) limit 1;"
    cur.execute(sql)
    res = cur.fetchall()
    return {"gid": res[0][0], "the_geom": res[0][1]}


def doDDPoints(conf, inputs, outputs):
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE)
    cur = conn.cursor()
    inputs["startPoint"]["value"] = inputs["startPoint"]["value"].split(",")
    startNode = findNearestNode(cur, inputs["startPoint"]["value"])
    sql = "CREATE TEMPORARY TABLE dd_res" + conf["senv"]["MMID"] + " AS SELECT * from vertices_tmp as nodes JOIN (SELECT * FROM driving_distance('SELECT gid AS id,source,target,cost from " + table + "'," + str(startNode["gid"]) + "," + inputs["distance"]["value"] + ",false,false)) as Goo ON nodes.id=Goo.vertex_id;"
    cur.execute(sql)
    sql = "SELECT id, ST_AsGeoJSON(the_geom) FROM dd_res" + conf["senv"]["MMID"]
    cur.execute(sql)
    res = cur.fetchall()
    result = {"type": "FeatureCollection", "features": []}
    for i in res:
        result["features"] += [{"type": "Feature", "geometry": json.loads(i[1]), "crs": {"type": "EPSG", "properties": {"code": "4326"}}, "properties": {"id": i[0]}}]
    outputs["Result"]["value"] = json.dumps(result)
    return zoo.SERVICE_SUCCEEDED


# demogis=# select points_as_polygon('SELECT id, ST_X(the_geom) AS x, ST_Y(the_geom) AS y FROM home_catchment10km where cost < 1500');
def doDDPolygon(conf, inputs, outputs):
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE)
    cur = conn.cursor()
    inputs["startPoint"]["value"] = inputs["startPoint"]["value"].split(",")
    startNode = findNearestNode(cur, inputs["startPoint"]["value"])
    sql = "CREATE TEMPORARY TABLE dd_res" + conf["senv"]["MMID"] + " AS SELECT * from vertices_tmp as nodes JOIN (SELECT * FROM driving_distance('SELECT gid AS id,source,target,cost from " + table + "'," + str(startNode["gid"]) + "," + inputs["distance"]["value"] + ",false,false)) as Goo ON nodes.id=Goo.vertex_id;"
    cur.execute(sql)
    sql = "select 1, ST_AsGeoJSON(the_geom) from points_as_polygon('SELECT id, ST_X(the_geom) AS x, ST_Y(the_geom) AS y FROM dd_res" + conf["senv"]["MMID"] + " where cost < " + inputs["distance"]["value"] + "');"
    cur.execute(sql)
    res = cur.fetchall()
    result = {"type": "FeatureCollection", "features": []}
    for i in res:
        result["features"] += [{"type": "Feature", "geometry": json.loads(i[1]), "crs": {"type": "EPSG", "properties": {"code": "4326"}}, "properties": {"id": i[0]}}]
    outputs["Result"]["value"] = json.dumps(result)
    conn.close()
    return zoo.SERVICE_SUCCEEDED


def findNearestEdge(table, cur, lonlat):
    sql = "with index_query as (  select   ogc_fid as gid, source, target, " + the_geom + ", st_distance(" + the_geom + ", 'SRID=4326;POINT(" + lonlat[0] + " " + lonlat[1] + ")') as distance  from " + table + " WHERE " + the_geom + " && 'BOX3D(" + str(float(lonlat[0]) - 0.001) + " " + str(
        float(lonlat[1]) - 0.001) + ", " + str(float(lonlat[0]) + 0.001) + " " + str(float(lonlat[1]) + 0.001) + ")'::box3d) select * from index_query order by distance limit 1;"
    print("DEBUG MSG: " + str(sql), file=sys.stderr)
    cur.execute(sql)
    res = cur.fetchall()
    print("DEBUG MSG: " + str(res), file=sys.stderr)
    return {"gid": res[0][0], "source": res[0][1], "target": res[0][2], "the_geom": res[0][3]}


def computeRoute(table, cur, startEdge, endEdge, method, conf, inputs):
    # conn=psycopg2.connect(parseDb(conf["velodb"]))
    # cur=conn.cursor()
    if "toLoad" in conf["senv"]:
        del (conf["senv"]["toLoad"])
    if method == 'SPA':
        _sql = "SELECT rt.gid, ST_AsGeoJSON(rt.the_geom) AS geojson, " + table + ".name, ST_length(rt.the_geom) AS length, " + table + ".gid FROM " + table + ", (SELECT gid, the_geom FROM astar_sp_delta('" + table + "'," + str(startEdge['source']) + "," + str(
            endEdge['target']) + ",0.01)) as rt WHERE " + table + ".gid=rt.gid;"
    else:
        if "distance" in inputs and inputs["distance"]["value"] == "true":
            _sql = "SELECT rt.gid, " + table + "." + the_geom + " AS geojson, " + table + ".name, mm_length(" + table + "." + the_geom + "), " + table + ".nature, " + table + ".revetement, " + table + ".tbllink as tid FROM " + table + ", (SELECT edge_id as gid FROM shortest_path('SELECT ogc_fid as id,source,target, length as cost from  " + table + "'," + str(
                startEdge['source']) + "," + str(endEdge['target']) + ",false,false)) as rt WHERE " + table + ".gid=rt.gid "
        #            _sql="SELECT rt.gid, rt.the_geom AS geojson, "+table+".name, length(rt.the_geom) AS length, "+table+".nature, "+table+".revetement, "+table+".tbllink as tid FROM "+table+", (SELECT gid, the_geom FROM dijkstra_sp_delta('"+table+"',"+str(startEdge['source'])+","+str(endEdge['target'])+",0.01)) as rt WHERE "+table+".gid=rt.gid "
        else:
            if "priorize" in inputs and inputs["priorize"]["value"] == "true":
                _sql = "SELECT rt.gid, " + table + "." + the_geom + " AS geojson, " + table + ".name, mm_length(" + table + "." + the_geom + ") AS length, " + table + ".nature, " + table + ".revetement, " + table + ".tbllink as tid FROM " + table + ", (SELECT edge_id as gid FROM shortest_path('SELECT gid as id,source,target,CASE WHEN tbllink=0 or tbllink=2 or tbllink=3 THEN length*0.5 ELSE CASE WHEN dp!=''Autre'' and tbllink=1 THEN length*1.75 ELSE length END END as cost from  " + table + "'," + str(
                    startEdge['source']) + "," + str(endEdge['target']) + ",false,false)) as rt WHERE " + table + ".gid=rt.gid "
            else:
                _sql = "SELECT " + table + ".ogc_fid as gid," + table + ".wkb_geometry AS geojson, " + table + ".name, st_length(" + table + ".wkb_geometry) AS length, " + table + ".highway FROM " + table + ", (SELECT id2 as edge_id FROM pgr_dijkstra('SELECT ogc_fid as id,source::int4,target::int4, st_length(wkb_geometry) as cost from  " + table + "'," + str(
                    startEdge['source']) + "," + str(endEdge['target']) + ",false,false)) as rt WHERE " + table + ".ogc_fid=edge_id "

    tblName = "tmp_route" + str(time.time()).split(".")[0]
    # TODO: confirm assumption: "inputs" is a Python 3 dictionary object
    # if list(inputs.keys()).count('cnt') > 0:
    if 'cnt' in inputs:
        tblName += inputs["cnt"]["value"]

    sql = "CREATE TEMPORARY TABLE " + tblName + "1 AS (" + _sql + ");"
    sql += "CREATE TEMPORARY TABLE " + tblName + " (id serial, gid int4, geojson text, name text, length float, highway varchar(250));"
    sql += "INSERT INTO " + tblName + " (id,gid,geojson,name,length,highway) (SELECT -1 ,ogc_fid, " + the_geom + " AS geojson, name, st_length(" + the_geom + ") AS length, highway from " + table + " WHERE ogc_fid=" + str(startEdge['gid']) + ");"

    sql += "INSERT INTO " + tblName + " (gid,geojson,name,length,highway) ( SELECT gid,geojson,name,st_length(geojson),highway FROM " + tblName + "1);"

    sql += "INSERT INTO " + tblName + " (gid,geojson,name,length,highway) (SELECT ogc_fid as gid, " + the_geom + " AS geojson, name, st_length(" + the_geom + "), highway from " + table + " WHERE ogc_fid=" + str(endEdge['gid']) + "); "

    # sqlUpdateFirst="DELETE FROM "+tblName+" WHERE id=(SELECT CASE WHEN (select geojson from "+tblName+" where id=1)=(select geojson from "+tblName+" where id=-1) THEN -1 ELSE NULL END);UPDATE "+tblName+" set geojson=(SELECT CASE WHEN spoint<epoint THEN ST_Line_Substring(geojson,spoint,epoint) ELSE ST_Line_Substring(geojson,epoint,spoint) END from (SELECT "+tblName+".geojson, CASE WHEN location<location1 THEN ST_line_locate_point(st_linemerge("+tblName+".geojson),a) ELSE ST_line_locate_point(st_linemerge("+tblName+".geojson),b) END as spoint,ST_line_locate_point(st_linemerge("+tblName+".geojson), st_setsrid(st_geometryFromText('POINT('|| "+ str(inputs["startPoint"]["value"][0]) +" ||' '|| "+ str(inputs["startPoint"]["value"][1]) +" || ')'),4326)) epoint from "+tblName+", (select *,ST_Distance(a,"+tblName+".geojson) as location, ST_Distance(b,"+tblName+".geojson) as location1 from (select *, ST_AsEWKT(ST_PointN(geojson,1)) as a , ST_AsEWKT(ST_PointN(geojson,ST_NumPoints(geojson))) as b from "+tblName+" order by id asc limit 1 offset 0) as foo, "+tblName+" WHERE "+tblName+".gid="+str(startEdge['gid'])+") as foo1 WHERE "+tblName+".gid="+str(startEdge['gid'])+") as foo2) WHERE gid="+str(startEdge['gid'])+";"
    sqlUpdateFirst = "DELETE FROM " + tblName + " WHERE id=(SELECT CASE WHEN (select geojson from " + tblName + " where id=1)=(select geojson from " + tblName + " where id=-1) THEN -1 ELSE NULL END);UPDATE " + tblName + " set geojson=(SELECT CASE WHEN spoint<epoint THEN ST_Line_Substring(geojson,spoint,epoint) ELSE ST_Line_Substring(geojson,epoint,spoint) END from (SELECT " + tblName + ".geojson, CASE WHEN location<location1 THEN ST_line_locate_point(st_linemerge(" + tblName + ".geojson),a) ELSE ST_line_locate_point(st_linemerge(" + tblName + ".geojson),b) END as spoint,ST_line_locate_point(st_linemerge(" + tblName + ".geojson), st_setsrid(st_geometryFromText('POINT('|| " + str(
        inputs["startPoint"]["value"][0]) + " ||' '|| " + str(inputs["startPoint"]["value"][
                                                                  1]) + " || ')'),4326)) epoint from " + tblName + ", (select *,ST_Distance(a," + tblName + ".geojson) as location, ST_Distance(b," + tblName + ".geojson) as location1 from (select *, ST_AsEWKT(ST_PointN(geojson,1)) as a , ST_AsEWKT(ST_PointN(geojson,ST_NumPoints(geojson))) as b from " + tblName + " order by id asc limit 1 offset 0) as foo, " + tblName + " order by " + tblName + ".id asc limit 1 offset 2) as foo1 WHERE " + tblName + ".gid=" + str(
        startEdge['gid']) + ") as foo2) WHERE gid=" + str(startEdge['gid']) + ";"

    sqlUpdateEnd = "UPDATE " + tblName + " set geojson=(SELECT CASE WHEN spoint<epoint THEN ST_Line_Substring(geojson,spoint,epoint) ELSE ST_Line_Substring(geojson,epoint,spoint) END from (SELECT " + tblName + ".geojson, CASE WHEN location<location1 THEN ST_line_locate_point(st_linemerge(" + tblName + ".geojson),a) ELSE ST_line_locate_point(st_linemerge(" + tblName + ".geojson),b) END as spoint,ST_line_locate_point(st_linemerge(" + tblName + ".geojson), st_setsrid(st_geometryFromText('POINT('|| " + str(
        inputs["endPoint"]["value"][0]) + " ||' '|| " + str(inputs["endPoint"]["value"][
                                                                1]) + " || ')'),4326)) epoint from " + tblName + ", (select *,ST_Distance(a," + tblName + ".geojson) as location, ST_Distance(b," + tblName + ".geojson) as location1 from (select *, ST_AsEWKT(ST_PointN(geojson,1)) as a , ST_AsEWKT(ST_PointN(geojson,ST_NumPoints(geojson))) as b from " + tblName + " order by id asc limit 1 offset (select count(*)-1 from " + tblName + ")) as foo, " + tblName + "  order by " + tblName + ".id asc limit 1 offset (select count(*)-3 from " + tblName + ")) as foo1 WHERE " + tblName + ".gid=" + str(
        endEdge['gid']) + ") as foo2 limit 1) WHERE gid=" + str(endEdge['gid']) + ";"

    # Update all other tuples to correct order
    sqlUpdateAll = sqlUpdateEnd + sqlUpdateFirst + "UPDATE " + tblName + " set length=st_length(geojson) WHERE gid!=" + str(startEdge['gid']) + ";"

    # print >> sys.stderr,sql
    cur.execute(sql)
    cur.execute(sqlUpdateFirst)
    cur.execute(sqlUpdateEnd)
    # print >> sys.stderr,sqlUpdateFirst
    # print >> sys.stderr,sqlUpdateEnd

    # Build the first segment from the starting point to the first edge
    sql1 = "select 0 as gid, ST_AsGeoJSON(st_geometryFromText('LINESTRING(' || " + str(inputs["startPoint"]["value"][0]) + " || ' ' || " + str(
        inputs["startPoint"]["value"][1]) + " || ', '|| st_x(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||' '||st_y(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||')'))::text, 'Parcours intermédiaire.'::text, st_length(st_geometryFromText('LINESTRING(' || " + str(
        inputs["startPoint"]["value"][0]) + " || ' '|| " + str(inputs["startPoint"]["value"][
                                                                   1]) + " || ', '||st_x(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||' '||st_y(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||')')),'Inconnu','Inconnu',0 from (SELECT *, ST_line_locate_point(st_linemerge(geojson), st_setsrid(st_geometryFromText('POINT('|| " + str(
        inputs["startPoint"]["value"][0]) + " ||' '|| " + str(inputs["startPoint"]["value"][1]) + " || ')'),4326)) as location from " + tblName + " WHERE gid=" + str(startEdge['gid']) + ") As initialLocation limit 1"
    # print >> sys.stderr,sql1

    # Build the last segment from last edge to the end point
    sql2 = "select 100000000000 as gid, ST_AsGeoJSON(st_geometryFromText('LINESTRING( ' || " + str(inputs["endPoint"]["value"][0]) + " || ' '|| " + str(
        inputs["endPoint"]["value"][1]) + " || ', '||st_x(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||' '||st_y(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||')')), 'Parcours intermédiaire.', st_length(st_geometryFromText('LINESTRING( ' || " + str(
        inputs["endPoint"]["value"][0]) + " || ' '|| " + str(inputs["endPoint"]["value"][
                                                                 1]) + " || ', '||st_x(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||' '||st_y(ST_Line_Interpolate_Point(st_linemerge(geojson),location))||')')),'Inconnu','Inconnu',100000000000 from (SELECT *, ST_line_locate_point(st_linemerge(geojson), st_setsrid(st_geometryFromText('POINT('|| " + str(
        inputs["endPoint"]["value"][0]) + " ||' '|| " + str(inputs["endPoint"]["value"][1]) + " || ')'),4326)) as location from " + tblName + " WHERE gid=" + str(endEdge['gid']) + " ) As finalLocation"
    # print >> sys.stderr,sql2

    # Build the final query as conmbinaison of the previous ones
    # sql+="SELECT * FROM ("+sql1+") as foo0;";

    sql = "SELECT * FROM (SELECT oldtable.* FROM (select foo.* from (SELECT gid,ST_AsGeoJSON(st_linemerge(geojson)), name, st_length(st_linemerge(GeomFromEWKT(geojson))),highway FROM (select * from get_grouped_road('" + tblName + "') as (id int4, gid int4,geojson text,name text,length float, highway varchar(250))) as foo_1 order by id) as foo) AS oldtable) as foo0";

    # sql="SELECT * FROM (SELECT oldtable.* FROM (select foo.* from (SELECT gid,ST_AsGeoJSON(st_linemerge(geojson)), name, st_length(st_linemerge(geojson)),nature,revetement,tid FROM "+tblName+" order by id) as foo) AS oldtable) as foo0";

    # sql+=""+sql2+";"
    # sql+="SELECT * FROM ("+sql1+") as foo0 UNION (SELECT row_number, oldtable.* FROM (select foo.* from (SELECT gid,ST_AsGeoJSON(st_linemerge(geojson)), name, length FROM tmp_route"+conf["senv"]["MMID"]+") as foo) AS oldtable CROSS JOIN generate_series(1, (SELECT COUNT(*) FROM tmp_route"+conf["senv"]["MMID"]+")) AS row_number) UNION ("+sql2+")"

    # print >> sys.stderr,sql

    result = {"type": "FeatureCollection", "features": []}
    cnt = 1

    cur.execute(sql1)
    res1 = cur.fetchall()
    # res1=[]

    for i in res1:
        print("I: " + str(i), file=sys.stderr)
        try:
            tmp = str(i[2])
        except:
            tmp = i[2]
        result["features"] += [{"type": "Feature", "geometry": json.loads(i[1]), "crs": {"type": "EPSG", "properties": {"code": "4326"}}, "properties": {"id": cnt, "name": tmp, "length": i[3]}, "highway": i[4]}]
        cnt += 1

    cur.execute(sql)
    res = cur.fetchall()

    for i in res:
        try:
            tmp = str(i[2])
        except:
            tmp = i[2]
        result["features"] += [{"type": "Feature", "geometry": json.loads(i[1]), "crs": {"type": "EPSG", "properties": {"code": "4326"}}, "properties": {"id": cnt, "name": tmp, "length": i[3], "highway": i[4]}}]
        cnt += 1

    cur.execute(sql2)
    res2 = cur.fetchall()
    # res2=[]

    for i in res2:
        try:
            tmp = str(i[2])
        except:
            tmp = i[2]
        result["features"] += [{"type": "Feature", "geometry": json.loads(i[1]), "crs": {"type": "EPSG", "properties": {"code": "4326"}}, "properties": {"id": cnt, "name": tmp, "length": i[3], "highway": i[4]}}]
        cnt += 1

    # conn.close()
    conf["senv"]["last_sid"] = conf["lenv"]["sid"]
    return result


def computeRouteUnion(inputs, cur, startEdge, endEdge, method):
    if method == 'SPA':
        sql = "SELECT max(rt.gid), ST_AsGeoJSON(ST_Union(rt.the_geom)) AS geojson, " + table + ".name, sum(length(rt.the_geom)) AS length FROM " + table + ", (SELECT gid, the_geom FROM astar_sp_delta('" + table + "'," + str(startEdge['source']) + "," + str(
            endEdge['target']) + ",1)) as rt WHERE " + table + ".gid=rt.gid ;"
    else:
        if "distance" in inputs and inputs["distance"]["value"] == "true":
            sql = "SELECT max(rt.gid), ST_AsGeoJSON(ST_LineMerge(ST_Union(" + table + ".the_geom))) AS geojson, sum(length(rt.the_geom)) AS length FROM " + table + ", (SELECT gid, the_geom FROM dijkstra_sp_delta('" + table + "'," + str(startEdge['source']) + "," + str(
                endEdge['target']) + ",0.01)) as rt WHERE " + table + ".gid=rt.gid "
        else:
            sql = "SELECT max(" + table + ".gid), ST_AsGeoJSON(ST_LineMerge(ST_Union(" + table + ".the_geom))) AS geojson, sum(length(" + table + ".the_geom)) AS length FROM " + table + ", (SELECT edge_id as gid FROM shortest_path('SELECT gid as id,source,target,CASE WHEN tbllink=1 THEN length/2 ELSE length*2 END as cost from  " + table + "'," + str(
                startEdge['source']) + "," + str(endEdge['target']) + ",false,false)) as rt WHERE " + table + ".gid=rt.gid "
        sql = "SELECT max(rt.gid), ST_AsGeoJSON(ST_LineMerge(ST_Union(rt.the_geom))) AS geojson, sum(length(rt.the_geom)) AS length FROM " + table + ", (SELECT gid, the_geom FROM dijkstra_sp_delta('" + table + "'," + str(startEdge['source']) + "," + str(endEdge['target']) + ",1)) as rt WHERE " + table + ".gid=rt.gid ;"
    print(sql, file=sys.stderr)

    cur.execute(sql)
    res = cur.fetchall()
    result = {"type": "FeatureCollection", "features": []}
    for i in res:
        try:
            result["features"] += [{"type": "Feature", "geometry": json.loads(i[1]), "crs": {"type": "EPSG", "properties": {"code": "4326"}}, "properties": {"id": i[0], "length": i[2]}}]
        except:
            pass
    return result


def do(conf, inputs, outputs):
    rl = getRoutingLayer(conf)
    table = rl.data
    print(rl.data, file=sys.stderr)
    print(rl.connection, file=sys.stderr)
    print(dir(getRoutingLayer(conf)), file=sys.stderr)
    conn = psycopg2.connect(rl.connection.replace("PG: ", ""))  # parseDb(conf["velodb"]))
    cur = conn.cursor()
    startpointInitial = ''.join(inputs["startPoint"]["value"])
    inputs["startPoint"]["value"] = inputs["startPoint"]["value"].split(',')
    if len(inputs["startPoint"]["value"]) == 2:
        startEdge = findNearestEdge(table, cur, inputs["startPoint"]["value"])
        inputs["endPoint"]["value"] = inputs["endPoint"]["value"].split(',')
        endEdge = findNearestEdge(table, cur, inputs["endPoint"]["value"])
        res = computeRoute(table, cur, startEdge, endEdge, "SPD", conf, inputs)
    else:
        i = 0

        endpointInitial = "".join(inputs["endPoint"]["value"])

        print(endpointInitial + " " + startpointInitial, file=sys.stderr)

        startpointInitial = startpointInitial.split(',')

        res = {"type": "FeatureCollection", "features": []}
        while i < len(startpointInitial):
            print("Etape " + str(i), file=sys.stderr)
            inputs["startPoint"]["value"] = [startpointInitial[i], startpointInitial[i + 1]]
            print(str(inputs["startPoint"]["value"]), file=sys.stderr)
            startEdge = findNearestEdge(table, cur, inputs["startPoint"]["value"])
            print(str(i + 3) + " " + str(len(startpointInitial)), file=sys.stderr)
            if i + 3 < len(startpointInitial):
                inputs["endPoint"]["value"] = [startpointInitial[i + 2], startpointInitial[i + 3]]
                print(str(inputs["endPoint"]["value"]), file=sys.stderr)
                endEdge = findNearestEdge(table, cur, inputs["endPoint"]["value"])
            else:
                print(str(inputs["endPoint"]["value"]), file=sys.stderr)
                inputs["endPoint"]["value"] = endpointInitial.split(',')
                print(str(inputs["endPoint"]["value"]), file=sys.stderr)
                endEdge = findNearestEdge(table, cur, inputs["endPoint"]["value"])
            inputs["cnt"] = {"value": str(i)}
            tmp = computeRoute(table, cur, startEdge, endEdge, "SPD", conf, inputs)
            res["features"] += tmp["features"];
            i += 2
    outputs["Result"]["value"] = json.dumps(res)
    conn.close()
    return 3


def doUnion(conf, inputs, outputs):
    conn = psycopg2.connect(parseDb(conf["velodb"]))
    cur = conn.cursor()
    startpointInitial = ''.join(inputs["startPoint"]["value"])
    inputs["startPoint"]["value"] = inputs["startPoint"]["value"].split(',')
    if len(inputs["startPoint"]["value"]) == 2:
        print(str(inputs), file=sys.stderr)
        startEdge = findNearestEdge(table, cur, inputs["startPoint"]["value"])
        print(str(inputs), file=sys.stderr)
        inputs["endPoint"]["value"] = inputs["endPoint"]["value"].split(',')
        endEdge = findNearestEdge(cur, inputs["endPoint"]["value"])
        print(str(inputs), file=sys.stderr)
        res = computeRouteUnion(inputs, cur, startEdge, endEdge, "SPD")
        outputs["Result"]["value"] = json.dumps(res)
    else:
        i = 0

        endpointInitial = "".join(inputs["endPoint"]["value"])

        print(endpointInitial + " " + startpointInitial, file=sys.stderr)

        startpointInitial = startpointInitial.split(',')

        res = {"type": "FeatureCollection", "features": []}
        while i < len(startpointInitial):
            print("Etape " + str(i), file=sys.stderr)
            inputs["startPoint"]["value"] = [startpointInitial[i], startpointInitial[i + 1]]
            print(str(inputs["startPoint"]["value"]), file=sys.stderr)
            startEdge = findNearestEdge(cur, inputs["startPoint"]["value"])
            print(str(i + 3) + " " + str(len(startpointInitial)), file=sys.stderr)
            if i + 3 < len(startpointInitial):
                inputs["endPoint"]["value"] = [startpointInitial[i + 2], startpointInitial[i + 3]]
                print(str(inputs["endPoint"]["value"]), file=sys.stderr)
                endEdge = findNearestEdge(cur, inputs["endPoint"]["value"])
            else:
                print(str(inputs["endPoint"]["value"]), file=sys.stderr)
                inputs["endPoint"]["value"] = endpointInitial.split(',')
                print(str(inputs["endPoint"]["value"]), file=sys.stderr)
                endEdge = findNearestEdge(cur, inputs["endPoint"]["value"])
            inputs["cnt"] = {"value": str(i)}
            tmp = computeRouteUnion(cur, startEdge, endEdge, "SPD")
            print(str(tmp), file=sys.stderr)
            if len(res["features"]) == 0:
                res["features"] += tmp["features"];
            else:
                res["features"][0]["geometry"]["coordinates"] = tmp["features"][0]["geometry"]["coordinates"] + res["features"][0]["geometry"]["coordinates"];
            i += 2
        outputs["Result"]["value"] = json.dumps(res)

    conn.close()
    return 3


def parseDistance(a):
    if (a / 1000 >= 1):
        tmp = str(a / 1000)
        tmp1 = tmp.split(".")
        tmp2 = a - (eval(tmp1[0]) * 1000)
        tmp3 = str(tmp2).split('.')
        tmp3[0] + ""
        if tmp2 >= 1:
            return " " + str(tmp1[0]) + "," + str(tmp3[0] + tmp3[1])[0:2] + " km "
        else:
            return " " + str(tmp1[0])
    else:
        tmp = str(a);
        tmp1 = tmp.split(".");
        return " " + tmp1[0] + " m ";


def printRoute(conf, inputs, outputs):
    import sys, os
    if list(conf.keys()).count("oo") > 0 and list(conf["oo"].keys()).count("external") > 0 and conf["oo"]["external"] == "true":
        from subprocess import Popen, PIPE
        import json
        print("Start", file=sys.stderr)
        sys.stderr.flush()
        err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'w', 0)
        os.dup2(err_log.fileno(), sys.stderr.fileno())
        process = Popen([conf["oo"]["path"]], stdin=PIPE, stdout=PIPE)
        print("Started", file=sys.stderr)
        script = "import  sys\nimport print.PaperMint as PaperMint\n"
        print("PaperMint imported", file=sys.stderr)
        print(script, file=sys.stderr)
    else:
        import PaperMint
    sizes = {
        "A4l": (1024, 768),
        "A4": (768, 1024)
    }
    csize = sizes["A4l"]

    ext = "3"
    if "components" in inputs:
        if inputs["components"]["value"].count("map") == 0 or inputs["components"]["value"].count("profile") == 0 or inputs["components"]["value"].count("roadmap") == 0:
            if inputs["components"]["value"].count("map") > 0:
                ext = "m"
            if inputs["components"]["value"].count("profile") > 0:
                ext += "p"
            if inputs["components"]["value"].count("roadmap") > 0:
                ext += "r"
    tmpl = "MM-Routing-A4l-template-" + ext + ".odt"
    if list(conf.keys()).count("oo") > 0 and list(conf["oo"].keys()).count("external") > 0 and conf["oo"]["external"] == "true":
        script += "pm=PaperMint.LOClient()\n"
        script += 'pm.loadDoc("' + conf["main"]["dataPath"] + '/ftp/templates/' + tmpl + '")\n'
    else:
        pm = PaperMint.LOClient()
        # Load the document
        pm.loadDoc(conf["main"]["dataPath"] + "/ftp/templates/" + tmpl + "")

    # Load the map
    import mapscript
    mapfile = conf["main"]["dataPath"] + "/public_maps/project_" + conf["senv"]["last_map"] + ".map"
    m = mapscript.mapObj(mapfile)
    for i in range(m.numlayers):
        m.getLayer(i).status = mapscript.MS_OFF
    m.setProjection("init=epsg:900913")

    # Add overlay layers
    mo = mapscript.mapObj(inputs["olayers"]["value"].replace(conf["main"]["mapserverAddress"] + "?map=", ""))
    l0 = mo.getLayer(0).clone()
    print("+++++++++++++++++++++++++++", file=sys.stderr)
    print(m.numlayers, file=sys.stderr)
    m.insertLayer(l0)
    m.getLayer(m.numlayers - 1).status = mapscript.MS_ON
    print(m.numlayers, file=sys.stderr)
    print("+++++++++++++++++++++++++++", file=sys.stderr)

    # Set activated layers to on and generate legend icons
    layers = inputs["layers"]["value"].split(",")
    layers += [mo.getLayer(0).name]
    print(layers, file=sys.stderr)
    layerNames = []
    for i in range(0, len(layers)):
        print(layers[i], file=sys.stderr)
        layer = m.getLayerByName(layers[i])
        if layer is None:
            i += 1
            layer = m.getLayerByName(layers[i])
        m.getLayer(layer.index).status = mapscript.MS_ON
        prefix = ""
        if layer.numclasses == 1:
            try:
                layerNames += ["[_" + layer.name + "_] " + layer.metadata.get("ows_title")]
            except:
                layerNames += ["[_" + layer.name + "_] " + layer.name]
        else:
            try:
                toAppend = [m.getLayer(layer.index).get("ows_title")]
            except:
                toAppend = [m.getLayer(layer.index).name]
            for k in range(0, layer.numclasses):
                toAppend += ["[_" + m.getLayer(layer.index).name + "_" + str(k) + "_] " + m.getLayer(layer.index).getClass(k).name]

            layerNames += toAppend

    # We should use a BoundingBoxData here rather than simple string.
    ext = inputs["ext"]["value"].split(',')

    # Compute width and width delta
    # width=csize[0]
    # cwidth=float(ext[2])-float(ext[0])
    # wdelta=cwidth/width

    # Compute height and height delta
    # height=csize[1]
    # cheight=float(ext[3])-float(ext[1])
    # hdelta=cheight/height

    # Delta
    # delta=float(width)/float(height)

    # Fix the maxy value depending on the Delta
    # ext[3]=((1/delta)*(float(ext[2])-float(ext[0])))+float(ext[1])

    # Fix extent based on zoom Level
    if not ("zoom" in inputs):
        import math
        n0 = math.log((((20037508.34 * 2) * csize[0]) / (256 * (float(ext[2]) - float(ext[0])))), 2)
        m0 = math.log(((20037508.34 * csize[1]) / (256 * (float(ext[3]) - float(ext[1])))), 2)
        if n0 > m0:
            zl = int(n0)
        else:
            zl = int(m0)
        print("+++++++++++++++++++++++++++++++++++++", file=sys.stderr)
        print(zl, file=sys.stderr)
        print("+++++++++++++++++++++++++++++++++++++", file=sys.stderr)
    else:
        zl = int(inputs["zoom"]["value"])

    # Strangely on windows / using mapserver 6.0.3 lead to use a different value for 
    # the buffer length around the baselayer (135when 100 was used n standard print)
    delta = (135 * (2 ** (18 - zl)))
    m.setExtent(float(ext[0]) + delta, float(ext[1]) + delta, float(ext[2]) - delta, float(ext[3]) - delta)

    # Fix size
    print("OK", file=sys.stderr)
    m.setSize(csize[0], csize[1])
    print("OK", file=sys.stderr)

    # Replace the Background Map image in the document template if any
    print("OK", file=sys.stderr)
    if "bgMap" in inputs:
        print("OK", file=sys.stderr)
        nl = mapscript.layerObj(m)
        print("OK", file=sys.stderr)
        nl.updateFromString('''LAYER 
 NAME "BaseLayerMap" 
 TYPE RASTER
 UNITS METERS
 STATUS ON
 DATA "''' + inputs["bgMap"]["value"] + '''"
 PROCESSING "RESAMPLE=AVERAGE"
 PROJECTION 
   "init=epsg:900913"
 END
END''')
        print("OK", file=sys.stderr)
        ordon = ()
        ordon += ((m.numlayers - 1),)
        for a in range(0, m.numlayers - 1):
            ordon += (a,)
        m.setLayerOrder(ordon)
        print("OK", file=sys.stderr)

    if 'profile' in inputs:
        import json
        tmp = json.loads(inputs["profile"]["value"])
        distances = json.loads(tmp["features"][0]["properties"]["distance"])
        # print >> sys.stderr,tmp["features"][0]["geometry"]["coordinates"]
        rvals = [[zoo._("Profile")], [], []]
        totald = 0
        for i in range(0, len(distances)):
            rvals[1] += [parseDistance((totald + distances[i]) * 111120)]
            totald += distances[i]
            rvals[2] += [[tmp["features"][0]["geometry"]["coordinates"][i][2]]]
        if list(conf.keys()).count("oo") > 0 and list(conf["oo"].keys()).count("external") > 0 and conf["oo"]["external"] == "true":
            script += "pm.statThis(\"[_profile_]\"," + json.dumps(rvals) + ")\n"

    if 'route' in inputs:
        import vector_tools.service as vt
        import osgeo.ogr as ogr
        geoms = vt.readFileFromBuffer(inputs["route"]["value"], "xml")
        rvals0 = [[zoo._("Step"), zoo._("Path"), zoo._("Distance"), zoo._("Type")]]
        for ij in range(0, len(geoms)):
            rvals0 += [[geoms[ij].GetField(2), geoms[ij].GetField(3), parseDistance(geoms[ij].GetField(1) * 111120), "[_route_danger_]"]]

    # Draw the image and save it
    print("Draw", file=sys.stderr)
    i = m.draw()
    print("OK", file=sys.stderr)
    import time
    savedImage = conf["main"]["tmpPath"] + "/print_" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + ".png"
    print("OK", file=sys.stderr)
    try:
        os.unlink(savedImage)
    except:
        pass
    print("OK", file=sys.stderr)
    i.save(savedImage)
    print("OK", file=sys.stderr)

    # Set activated layers to on
    # layers=inputs["layers"]["value"].split(",")
    script0 = ""
    for i in range(0, len(layers)):
        print(layers[i], file=sys.stderr)
        layer = m.getLayerByName(layers[i])
        if layer is None:
            i += 1
            layer = m.getLayerByName(layers[i])
        if layer.name != "Result":
            lm = mapscript.mapObj(conf["main"]["dataPath"] + "/public_maps/map4legend_" + conf["senv"]["last_map"] + "_" + layer.name + ".map")
        else:
            lm = mapscript.mapObj(conf["main"]["dataPath"] + "/maps/map4legend_StyleRoute_network2.map")
        lm.setSize(20, 20)
        lm.setExtent(-1.5, -1.5, 7.5, 7.5)
        if layer.numclasses == 1:
            lm.getLayer(0).status = mapscript.MS_ON
            lsavedImage = conf["main"]["tmpPath"] + "/print_" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + ".png"
            print("OK", file=sys.stderr)
            try:
                os.unlink(lsavedImage)
            except:
                pass
            img = lm.draw()
            img.save(lsavedImage)
            script0 += 'pm.insertImageAt("[_' + layer.name + '_]","' + lsavedImage + '",True)\n'
        else:
            for k in range(0, layer.numclasses):
                if layer.name != "Result":
                    lm = mapscript.mapObj(conf["main"]["dataPath"] + "/maps/map4legend_" + conf["senv"]["last_map"] + "_" + layer.name + ".map")
                else:
                    lm = mapscript.mapObj(conf["main"]["dataPath"] + "/maps/map4legend_StyleRoute_network2.map")
                lm.setSize(20, 20)
                lm.setExtent(-1.5, -1.5, 7.5, 7.5)
                lm.getLayer(k).status = mapscript.MS_ON
                for j in range(0, k - 1):
                    lm.getLayer(j).status = mapscript.MS_OFF
                for j in range(k + 1, lm.numlayers):
                    lm.getLayer(j).status = mapscript.MS_OFF
                lsavedImage = conf["main"]["tmpPath"] + "/print_" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + ".png"
                print("OK", file=sys.stderr)
                try:
                    os.unlink(lsavedImage)
                except:
                    pass
                img = lm.draw()
                img.save(lsavedImage)
                if layer.name != "Result":
                    script0 += 'pm.insertImageAt("[_' + layer.name + "_" + str(k) + '_]","' + lsavedImage + '",True)\n'
                else:
                    script0 += 'pm.insertImageAt("[_Result_' + str(k) + '_]","' + lsavedImage + '",True)\n'
        if layer.name == "Result":
            break

    if list(conf.keys()).count("oo") > 0 and list(conf["oo"].keys()).count("external") > 0 and conf["oo"]["external"] == "true":
        script += 'pm.searchAndReplaceImage("Map","' + savedImage + '")\n'
        script += 'pm.searchAndReplace("[_map_title_]","' + m.web.metadata.get("mmTitle") + '")\n'
        script += 'pm.addList("[_Legend_]",' + json.dumps(layerNames) + ' )\n'
        script += script0
    else:
        # Replace the Map image in the document template
        pm.searchAndReplaceImage("Map", savedImage)

        # Replace the map_title field with Project Name
        pm.searchAndReplace("[_map_title_]", m.web.metadata.get("mmTitle"))

        # Replace the Legend field with Project Name
        pm.addList("[_Legend_]", layerNames)

    if 'route' in inputs:
        if list(conf.keys()).count("oo") > 0 and list(conf["oo"].keys()).count("external") > 0 and conf["oo"]["external"] == "true":
            script += "pm.addTable(\"[_steps_]\"," + json.dumps(rvals0) + ")\n"
            script += "pm.insertImageAt('[_route_danger_]','C:/inetpub/wwwroot/public_map/img/design/amenagements/route_danger.png')\n"

    # Save the document
    docPath = conf["main"]["tmpPath"] + "/" + conf["senv"]["MMID"] + "_" + str(time.clock()).split(".")[1] + "_" + inputs["tDoc"]["value"]
    if list(conf.keys()).count("oo") > 0 and list(conf["oo"].keys()).count("external") > 0 and conf["oo"]["external"] == "true":
        script += 'print("' + docPath + '",file=sys.stderr)\n'
        script += 'pm.saveDoc("' + docPath + '")\n'
        script += 'pm.unloadDoc("' + conf["main"]["dataPath"] + '/ftp/templates/' + tmpl + '")\n'
        try:
            print("Run0", file=sys.stderr)
            print(script, file=sys.stderr)
            process.stdin.write(script)
            print("Run1", file=sys.stderr)
            process.stdin.close()
            print("Run2", file=sys.stderr)
            process.wait()
            conf["lenv"]["message"] = str(process.stdout.readline())
            sys.stderr.flush()
            sys.stderr.close()
            err_log = file(conf["main"]["tmpPath"] + '/tmp_err_log_file', 'r', 0)
            conf["lenv"]["message"] += str(err_log.read())
        except Exception as e:
            conf["lenv"]["message"] = "Unable to print your document :" + str(e)
            return zoo.SERVICE_FAILED
    else:
        pm.saveDoc(docPath)
        pm.unloadDoc(conf["main"]["dataPath"] + "/ftp/templates/" + tmpl + "")

    try:
        outputs["Result"]["value"] = open(docPath, "rb").read()
    except Exception as e:
        conf["lenv"]["message"] += str(e)
        return zoo.SERVICE_FAILED

    # unlink Failed on WIN32 because the SOffice server is running by another
    # user than the IIS AppPool\DefaultAppPool responsible for accessing files
    # from services
    try:
        os.unlink(docPath)
    except:
        pass
    return zoo.SERVICE_SUCCEEDED
