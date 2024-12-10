import sys
import osgeo.ogr
from shapely.geometry import LineString, Point


def cut(line, distance):
    # Cuts a line in two at a distance from its starting point
    if distance <= 0.0 or distance >= line.length:
        return [LineString(line)]
    coords = list(line.coords)
    for i, p in enumerate(coords):
        pd = line.project(Point(p))
        if pd == distance:
            return [
                LineString(coords[:i + 1]),
                LineString(coords[i:])
            ]
        if pd > distance:
            cp = line.interpolate(distance)
            return [
                LineString(coords[:i] + [(cp.x, cp.y)]),
                LineString([(cp.x, cp.y)] + coords[i:])
            ]


def createNetwork(conf, inputs, outputs):
    import shapely
    import shapely.wkt

    zoo.info("Extract geometries")
    geometry1 = []
    ds = osgeo.ogr.Open(inputs["InputEntity1"]["value"])
    lyr = ds.GetLayer(0)
    feat = lyr.GetNextFeature()
    while feat is not None:
        geometry1 += [feat.Clone()]
        feat.Destroy()
        feat = lyr.GetNextFeature()
    ds.Destroy()

    zoo.info("Extract geometries")
    geometry2 = []
    ds = osgeo.ogr.Open(inputs["InputEntity2"]["value"])
    lyr = ds.GetLayer(0)
    feat = lyr.GetNextFeature()
    while feat is not None:
        geometry2 += [feat.Clone()]
        feat.Destroy()
        feat = lyr.GetNextFeature()
    ds.Destroy()

    # geometry1=extractInputs(conf,inputs["InputEntity1"])
    # geometry2=extractInputs(conf,inputs["InputEntity2"])

    zoo.info("Extracted geometries")

    i = 0
    if "offset" in inputs:
        i = int(inputs["offset"]["value"])
    oriLen = len(geometry1)
    if "limit" in inputs:
        oriLen = int(inputs["limit"]["value"]) + i

    #
    # Create the target datasets
    #
    drv = osgeo.ogr.GetDriver(0)
    ds = drv.CreateDataSource("c:/inetpub/wwwroot/tmp/store" + conf["lenv"]["sid"] + "_" + str(i) + "_" + str(oriLen) + ".shp")
    lyr = ds.CreateLayer("Result", None, osgeo.ogr.wkbLineString)

    # ds = drv.CreateDataSource( "c:/inetpub/wwwroot/tmp/intersection_poi"+conf["lenv"]["sid"]+".shp")
    # lyr1 = ds.CreateLayer( "Result", None, osgeo.ogr.wkbPoint )

    #
    # Create the target dataset fields
    #
    poDstFDefn = geometry1[0].GetDefnRef()
    if poDstFDefn is not None:
        nDstFieldCount = poDstFDefn.GetFieldCount()
        for iField in range(nDstFieldCount):
            poSrcFieldDefn = poDstFDefn.GetFieldDefn(iField)
            oFieldDefn = osgeo.ogr.FieldDefn(poSrcFieldDefn.GetNameRef(), poSrcFieldDefn.GetType())
            oFieldDefn.SetWidth(poSrcFieldDefn.GetWidth())
            oFieldDefn.SetPrecision(poSrcFieldDefn.GetPrecision())
            lyr.CreateField(oFieldDefn)
            # lyr1.CreateField( oFieldDefn )

    rgeometries = []
    rgeometries1 = []

    current = []
    # FOR EACH LINES IN PLAN
    while i < oriLen:  # :
        j = 0
        hasValue = False
        values = None
        toto = geometry1[i].GetGeometryRef().Clone()
        toto.FlattenTo2D()
        if toto.GetGeometryName() == 'MULTILINESTRING':
            current = []
            nb = toto.GetGeometryCount()
            for k in range(0, nb):
                tmp = toto.GetGeometryRef(k)
                zoo.info(str(i) + ' ' + str(k) + ' ' + ' ' + tmp.ExportToWkt())
                current += [tmp.Clone()]
        else:
            current = [toto]
        feat0 = geometry1[i].Clone()
        # FOR EACH LINES IN ROUTES
        while j < len(geometry2):
            tmp = geometry2[j].Clone()
            tg = geometry2[j].GetGeometryRef().Clone()
            length = len(current)
            o = 0
            # FOR EACH LINES IN CURRENT0
            while o < length:
                current0 = [current[o].Clone()]
                intersection = current0[0].Intersection(tg)

                if intersection is None or intersection.IsEmpty():
                    current0[0].Destroy()
                if intersection is not None and not (intersection.IsEmpty()):

                    hasValue = True

                    # CREATE SET OF INTERSECTING GEOMETRIES
                    current1 = []
                    if intersection.GetGeometryType() == 4:
                        nb = intersection.GetGeometryCount()
                        zoo.info("NB POINTS: " + str(nb))
                        # tmp0=intersection.Clone()
                        for k in range(0, nb):
                            current1 += [intersection.GetGeometryRef(k).Clone()]
                    else:
                        if intersection.GetGeometryName() == "LINESTRING":
                            zoo.info(str(ecurrent1))
                            current1 += [intersection.GetPoint_2D(), intersection.GetPoint_2D(intersection.GetPointCount() - 1)]
                        else:
                            if intersection.GetGeometryName() == "MULTILINESTRING":
                                nb = intersection.GetGeometryCount()
                                for k in range(0, nb):
                                    tmp = intersection.GetGeometryRef(k)
                                    zoo.info(str(i) + ' ' + str(k) + ' ' + ' ' + tmp.ExportToWkt())
                                    current1 += [tmp.StartPoint(), tmp.EndPoint()]
                            else:
                                current1 += [intersection.Clone()]

                    # CREATE SET OF SPLITTED LINES
                    length1 = len(current1)
                    for q in range(0, length1):
                        zoo.info(str(q) + " current0 length: " + str(len(current0)))
                        for r in range(0, len(current0)):
                            line = shapely.wkt.loads(current0[r].ExportToWkt())
                            point = shapely.wkt.loads(current1[q].ExportToWkt())
                            zoo.info(" POINT Distance LINE " + str(point.distance(line)))
                            if point.distance(line) > 0.000001:
                                continue
                            else:
                                try:
                                    titi = cut(line, line.project(point))
                                    try:
                                        current0[r] = osgeo.ogr.CreateGeometryFromWkt(titi[0].wkt)
                                        current0 += [osgeo.ogr.CreateGeometryFromWkt(titi[1].wkt)]
                                    except Exception as e:
                                        zoo.error("Error occurs: " + str(e))
                                    zoo.error("Line splited")
                                    break
                                except Exception as e:
                                    zoo.error("Unable to split thie line: " + str(e))
                                    pass
                    zoo.info("Current0: " + str(len(current0)))
                    current[o] = current0[0].Clone()
                    current0[0].Destroy()
                    for oo in range(1, len(current0)):
                        current += [current0[oo].Clone()]
                        current0[oo].Destroy()
                    zoo.info("Current: " + str(len(current)))
                    rgeometries += [tmp]

                o += 1

            j += 1
        if hasValue:
            tmpStr = ""
            for m in range(0, len(current)):
                feat = feat0.Clone()
                feat.SetGeometryDirectly(current[m].Clone())
                # tmpStr+="\n********\n"+feat.ExportToJson()
                lyr.CreateFeature(feat)
            zoo.info("\n********\nFeature " + str(i) + " was splitted in " + str(len(current)))
        if not (hasValue):
            zoo.info(str(i) + " not intersecting")
            rgeometries1 += [geometry1[i].Clone()]
            lyr.CreateFeature(geometry1[i].Clone())
        geometry1[i].Destroy()
        i += 1
    i = 0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i += 1
    ds.Destroy()
    # outputResult(conf,outputs["Result"],rgeometries)
    zoo.info("/outputResult")
    return 3
