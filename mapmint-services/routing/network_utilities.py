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

    print("Extract geometries", file=sys.stderr)
    geometry1 = []
    ds = osgeo.ogr.Open(inputs["InputEntity1"]["value"])
    lyr = ds.GetLayer(0)
    feat = lyr.GetNextFeature()
    while feat is not None:
        geometry1 += [feat.Clone()]
        feat.Destroy()
        feat = lyr.GetNextFeature()
    ds.Destroy()

    print("Extract geometries", file=sys.stderr)
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
    # print(inputs["InputEntity2"]["value"][len(inputs["InputEntity2"]["value"])-100:len(inputs["InputEntity2"]["value"])-1], file=sys.stderr)
    # geometry2=extractInputs(conf,inputs["InputEntity2"])

    print("Extracted geometries", file=sys.stderr)

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
                print(str(i) + ' ' + str(k) + ' ' + ' ' + tmp.ExportToWkt(), file=sys.stderr)
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

                    # print(current0[0], file=sys.stderr)
                    # print(intersection, file=sys.stderr)
                    # print(current0[0].Intersection(intersection), file=sys.stderr)
                    # print(intersection.Intersection(current0[0]), file=sys.stderr)
                    hasValue = True
                    # print(str(i)+' '+str(j)+' '+str(o)+' '+intersection.GetGeometryName(), file=sys.stderr)

                    # CREATE SET OF INTERSECTING GEOMETRIES
                    current1 = []
                    if intersection.GetGeometryType() == 4:
                        nb = intersection.GetGeometryCount()
                        print("NB POINTS: " + str(nb), file=sys.stderr)
                        # tmp0=intersection.Clone()
                        for k in range(0, nb):
                            current1 += [intersection.GetGeometryRef(k).Clone()]
                    else:
                        if intersection.GetGeometryName() == "LINESTRING":
                            print(ecurrent1, file=sys.stderr)
                            current1 += [intersection.GetPoint_2D(), intersection.GetPoint_2D(intersection.GetPointCount() - 1)]
                        else:
                            if intersection.GetGeometryName() == "MULTILINESTRING":
                                nb = intersection.GetGeometryCount()
                                for k in range(0, nb):
                                    tmp = intersection.GetGeometryRef(k)
                                    print(str(i) + ' ' + str(k) + ' ' + ' ' + tmp.ExportToWkt(), file=sys.stderr)
                                    current1 += [tmp.StartPoint(), tmp.EndPoint()]
                            else:
                                current1 += [intersection.Clone()]

                    # CREATE SET OF SPLITTED LINES
                    length1 = len(current1)
                    for q in range(0, length1):
                        print(str(q) + " current0 length: " + str(len(current0)), file=sys.stderr)
                        for r in range(0, len(current0)):
                            # print(str(q)+" "+str(r)+" "+str(q), file=sys.stderr)
                            # print(str(r)+" "+str(q)+" Intersection "+str(current0[r].Intersection(current1[q]))+" "+str(current0[r].Intersects(current1[q]))+" "+str(current0[r].Touches(current1[q])), file=sys.stderr)
                            # print(current0[r], file=sys.stderr)
                            # print(current1[q], file=sys.stderr)
                            line = shapely.wkt.loads(current0[r].ExportToWkt())
                            point = shapely.wkt.loads(current1[q].ExportToWkt())
                            # print(" LINE INTERSECTS POINT " + str(line.intersects(point)), file=sys.stderr)
                            # print(" POINT INTERSECTS LINE " + str(point.intersects(line)), file=sys.stderr)
                            print(" POINT Distance LINE " + str(point.distance(line)), file=sys.stderr)
                            if point.distance(line) > 0.000001:
                                continue
                            else:
                                try:
                                    titi = cut(line, line.project(point))
                                    try:
                                        current0[r] = osgeo.ogr.CreateGeometryFromWkt(titi[0].wkt)
                                        current0 += [osgeo.ogr.CreateGeometryFromWkt(titi[1].wkt)]
                                    except Exception as e:
                                        print("Error occurs: " + str(e), file=sys.stderr)
                                    print("Line splited", file=sys.stderr)
                                    break
                                except Exception as e:
                                    print("Unable to split thie line: " + str(e), file=sys.stderr)
                                    pass
                    print("Current0: " + str(len(current0)), file=sys.stderr)
                    current[o] = current0[0].Clone()
                    current0[0].Destroy()
                    for oo in range(1, len(current0)):
                        current += [current0[oo].Clone()]
                        current0[oo].Destroy()
                    print("Current: " + str(len(current)), file=sys.stderr)
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
            print("\n********\nFeature " + str(i) + " was splitted in " + str(len(current)), file=sys.stderr)
            # print(str(i)+" "+str(m)+" LINE : "+tmpStr, file=sys.stderr)
        if not (hasValue):
            print(str(i) + " not intersecting", file=sys.stderr)
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
    print("/outputResult", file=sys.stderr)
    return 3
