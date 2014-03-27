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
                LineString(coords[:i+1]),
                LineString(coords[i:])
                ]
        if pd > distance:
            cp = line.interpolate(distance)
            return [
                LineString(coords[:i] + [(cp.x, cp.y)]),
                LineString([(cp.x, cp.y)] + coords[i:])
                ]

def createNetwork(conf,inputs,outputs):
    import shapely
    import shapely.wkt

    print >> sys.stderr,"Extract geometries"
    geometry1=[]
    ds = osgeo.ogr.Open(inputs["InputEntity1"]["value"])
    lyr = ds.GetLayer(0)
    feat = lyr.GetNextFeature()
    while feat is not None:
        geometry1+=[feat.Clone()]
        feat.Destroy()
        feat = lyr.GetNextFeature()
    ds.Destroy()

    print >> sys.stderr,"Extract geometries"
    geometry2=[]
    ds = osgeo.ogr.Open(inputs["InputEntity2"]["value"])
    lyr = ds.GetLayer(0)
    feat = lyr.GetNextFeature()
    while feat is not None:
        geometry2+=[feat.Clone()]
        feat.Destroy()
        feat = lyr.GetNextFeature()
    ds.Destroy()

    #geometry1=extractInputs(conf,inputs["InputEntity1"])
    #print >> sys.stderr,inputs["InputEntity2"]["value"][len(inputs["InputEntity2"]["value"])-100:len(inputs["InputEntity2"]["value"])-1]
    #geometry2=extractInputs(conf,inputs["InputEntity2"])

    print >> sys.stderr,"Extracted geometries"

    i=0
    if inputs.has_key("offset"):
        i=int(inputs["offset"]["value"])
    oriLen=len(geometry1)
    if inputs.has_key("limit"):
        oriLen=int(inputs["limit"]["value"])+i

    #
    # Create the target datasets
    #
    drv = osgeo.ogr.GetDriver( 0 )
    ds = drv.CreateDataSource( "c:/inetpub/wwwroot/tmp/store"+conf["lenv"]["sid"]+"_"+str(i)+"_"+str(oriLen)+".shp")
    lyr = ds.CreateLayer( "Result", None, osgeo.ogr.wkbLineString )

    #ds = drv.CreateDataSource( "c:/inetpub/wwwroot/tmp/intersection_poi"+conf["lenv"]["sid"]+".shp")
    #lyr1 = ds.CreateLayer( "Result", None, osgeo.ogr.wkbPoint )
    
    #
    # Create the target dataset fields
    #
    poDstFDefn=geometry1[0].GetDefnRef()
    if poDstFDefn is not None:
        nDstFieldCount = poDstFDefn.GetFieldCount()
        for iField in range(nDstFieldCount):
            poSrcFieldDefn = poDstFDefn.GetFieldDefn(iField)
            oFieldDefn = osgeo.ogr.FieldDefn(poSrcFieldDefn.GetNameRef(),poSrcFieldDefn.GetType())
            oFieldDefn.SetWidth( poSrcFieldDefn.GetWidth() )
            oFieldDefn.SetPrecision( poSrcFieldDefn.GetPrecision() )
            lyr.CreateField( oFieldDefn )
            #lyr1.CreateField( oFieldDefn )


    rgeometries=[]
    rgeometries1=[]

    current=[]
    # FOR EACH LINES IN PLAN
    while i < oriLen:# :
        j=0
        hasValue=False
        values=None
        toto=geometry1[i].GetGeometryRef().Clone()
        toto.FlattenTo2D()
        if toto.GetGeometryName() == 'MULTILINESTRING':
            current=[]
            nb=toto.GetGeometryCount()
            for k in range(0,nb):
                tmp=toto.GetGeometryRef(k)
                print >> sys.stderr,str(i)+' '+str(k)+' '+' '+tmp.ExportToWkt()
                current+=[tmp.Clone()]
        else:
            current=[toto]
        feat0=geometry1[i].Clone()
        # FOR EACH LINES IN ROUTES
        while j < len(geometry2):
            tmp=geometry2[j].Clone()
            tg=geometry2[j].GetGeometryRef().Clone()
            length=len(current)
            o=0
            # FOR EACH LINES IN CURRENT0
            while o < length:
                current0=[current[o].Clone()]
                intersection=current0[0].Intersection(tg)
                
                if intersection is None or intersection.IsEmpty():
                    current0[0].Destroy()
                if intersection is not None and not(intersection.IsEmpty()):
                    
                    #print >> sys.stderr,current0[0]
                    #print >> sys.stderr,intersection
                    #print >> sys.stderr,current0[0].Intersection(intersection)
                    #print >> sys.stderr,intersection.Intersection(current0[0])
                    hasValue=True
                    #print >> sys.stderr,str(i)+' '+str(j)+' '+str(o)+' '+intersection.GetGeometryName()

                    # CREATE SET OF INTERSECTING GEOMETRIES
                    current1=[]
                    if intersection.GetGeometryType() == 4:
                        nb=intersection.GetGeometryCount()
                        print >> sys.stderr, "NB POINTS: "+str(nb)
                        #tmp0=intersection.Clone()
                        for k in range(0,nb):
                            current1+=[intersection.GetGeometryRef(k).Clone()]
                    else:
                        if intersection.GetGeometryName()=="LINESTRING":
                            print >> sys.stderr,ecurrent1
                            current1+=[intersection.GetPoint_2D(),intersection.GetPoint_2D(intersection.GetPointCount()-1)]
                        else:
                            if intersection.GetGeometryName()=="MULTILINESTRING":
                                nb=intersection.GetGeometryCount()
                                for k in range(0,nb):
                                    tmp=intersection.GetGeometryRef(k)
                                    print >> sys.stderr,str(i)+' '+str(k)+' '+' '+tmp.ExportToWkt()
                                    current1+=[tmp.StartPoint(),tmp.EndPoint()]
                            else:
                                current1+=[intersection.Clone()]
                        
                    
                    # CREATE SET OF SPLITTED LINES
                    length1=len(current1)
                    for q in range(0,length1):
                        print >> sys.stderr,str(q)+" current0 length: "+str(len(current0))
                        for r in range(0,len(current0)):
                            #print >> sys.stderr,str(q)+" "+str(r)+" "+str(q)
                            #print >> sys.stderr,str(r)+" "+str(q)+" Intersection "+str(current0[r].Intersection(current1[q]))+" "+str(current0[r].Intersects(current1[q]))+" "+str(current0[r].Touches(current1[q]))
                            #print >>  sys.stderr,current0[r]
                            #print >>  sys.stderr,current1[q]
                            line=shapely.wkt.loads(current0[r].ExportToWkt())
                            point=shapely.wkt.loads(current1[q].ExportToWkt())
                            #print >> sys.stderr," LINE INTERSECTS POINT " + str(line.intersects(point))
                            #print >> sys.stderr," POINT INTERSECTS LINE " + str(point.intersects(line))
                            print >> sys.stderr," POINT Distance LINE " + str(point.distance(line))
                            if point.distance(line)>0.000001:
                                continue
                            else:
                                try:
                                    titi=cut(line,line.project(point))
                                    try:
                                        current0[r]=osgeo.ogr.CreateGeometryFromWkt(titi[0].wkt)
                                        current0+=[osgeo.ogr.CreateGeometryFromWkt(titi[1].wkt)]
                                    except Exception,e:
                                        print >> sys.stderr,"Error occurs: "+str(e)
                                    print >> sys.stderr,"Line splited"
                                    break
                                except Exception,e:
                                    print >> sys.stderr,"Unable to split thie line: "+str(e)
                                    pass
                    print >> sys.stderr,"Current0: "+str(len(current0))
                    current[o]=current0[0].Clone()
                    current0[0].Destroy()
                    for oo in range(1,len(current0)):
                        current+=[current0[oo].Clone()]
                        current0[oo].Destroy()
                    print >> sys.stderr,"Current: "+str(len(current))
                    rgeometries+=[tmp]
                    
                o+=1
                
            j+=1
        if hasValue:
            tmpStr=""
            for m in range(0,len(current)):
                feat=feat0.Clone()
                feat.SetGeometryDirectly(current[m].Clone())
                #tmpStr+="\n********\n"+feat.ExportToJson()
                lyr.CreateFeature(feat)
            print >> sys.stderr,"\n********\nFeature "+str(i)+" was splitted in "+str(len(current))
            #print >> sys.stderr,str(i)+" "+str(m)+" LINE : "+tmpStr
        if not(hasValue):
            print >> sys.stderr,str(i)+" not intersecting"
            rgeometries1+=[geometry1[i].Clone()]
            lyr.CreateFeature(geometry1[i].Clone())
        geometry1[i].Destroy()
        i+=1
    i=0
    while i < len(geometry2):
        geometry2[i].Destroy()
        i+=1
    ds.Destroy()
    #outputResult(conf,outputs["Result"],rgeometries)
    print >> sys.stderr,"/outputResult"
    return 3
