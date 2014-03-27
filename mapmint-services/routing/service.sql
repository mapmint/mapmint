CREATE OR REPLACE FUNCTION dijkstra_sp_s(
       geom_table varchar, source int4, target int4)
       RETURNS SETOF GEOMS AS
$$
DECLARE
        r record;
        path_result record;
        v_id integer;
        e_id integer;
        geom geoms;
        id integer;
BEGIN

        id :=0;

        FOR path_result IN EXECUTE 'SELECT gid,the_geom FROM ' ||
          'shortest_path(''SELECT gid as id, source::integer, target::integer, ' ||
          'length::double precision/(select type_id from way_tag, ways where ways.gid=way_id and way_id=gid) as cost FROM ' ||
          quote_ident(geom_table) || ''', ' || quote_literal(source) ||
          ' , ' || quote_literal(target) || ' , false, false), ' ||
          quote_ident(geom_table) || ' where edge_id = gid '
        LOOP

                 geom.gid      := path_result.gid;
                 geom.the_geom := path_result.the_geom;
                 id := id+1;
                 geom.id       := id;

                 RETURN NEXT geom;

        END LOOP;
        RETURN;
END;
$$
LANGUAGE 'plpgsql' VOLATILE STRICT;


CREATE OR REPLACE FUNCTION dijkstra_sp_delta(
       varchar,int4, int4, float8)
       RETURNS SETOF GEOMS AS
$$
DECLARE
        geom_table ALIAS FOR $1;
        sourceid ALIAS FOR $2;
        targetid ALIAS FOR $3;
        delta ALIAS FOR $4;

        rec record;
        r record;
        path_result record;
        v_id integer;
        e_id integer;
        geom geoms;

        id integer;
BEGIN

        id :=0;
        FOR path_result IN EXECUTE 'SELECT gid,the_geom FROM ' ||
           'dijkstra_sp_delta_directed(''' ||
           quote_ident(geom_table) || ''', ' || quote_literal(sourceid) || ', ' ||
           quote_literal(targetid) || ', ' || delta || ', false, false)'
        LOOP
                 geom.gid      := path_result.gid;
                 geom.the_geom := path_result.the_geom;
                 id := id+1;
                 geom.id       := id;

                 RETURN NEXT geom;

        END LOOP;
        RETURN;
END;
$$
LANGUAGE 'plpgsql' VOLATILE STRICT;

CREATE OR REPLACE FUNCTION dijkstra_sp_delta_directed(
       varchar,int4, int4, float8, boolean, boolean)
       RETURNS SETOF GEOMS AS
$$
DECLARE
        geom_table ALIAS FOR $1;
        sourceid ALIAS FOR $2;
        targetid ALIAS FOR $3;
        delta ALIAS FOR $4;
        dir ALIAS FOR $5;
        rc ALIAS FOR $6;

        rec record;
        r record;
        path_result record;
        v_id integer;
        e_id integer;
        geom geoms;

        srid integer;

        source_x float8;
        source_y float8;
        target_x float8;
        target_y float8;

        ll_x float8;
        ll_y float8;
        ur_x float8;
        ur_y float8;

        query text;
        id integer;
BEGIN

        id :=0;
        FOR rec IN EXECUTE
            'select srid(the_geom) from ' ||
            quote_ident(geom_table) || ' limit 1'
        LOOP
        END LOOP;
        srid := rec.srid;

        FOR rec IN EXECUTE
            'select x(startpoint(the_geom)) as source_x from ' ||
            quote_ident(geom_table) || ' where source = ' ||
            sourceid ||  ' or target='||sourceid||' limit 1'
        LOOP
        END LOOP;
        source_x := rec.source_x;

        FOR rec IN EXECUTE
            'select y(startpoint(the_geom)) as source_y from ' ||
            quote_ident(geom_table) || ' where source = ' ||
            sourceid ||  ' or target='||sourceid||' limit 1'
        LOOP
        END LOOP;

        source_y := rec.source_y;

        FOR rec IN EXECUTE
            'select x(startpoint(the_geom)) as target_x from ' ||
            quote_ident(geom_table) || ' where source = ' ||
            targetid ||  ' or target='||targetid||' limit 1'
        LOOP
        END LOOP;

        target_x := rec.target_x;

        FOR rec IN EXECUTE
            'select y(startpoint(the_geom)) as target_y from ' ||
            quote_ident(geom_table) || ' where source = ' ||
            targetid ||  ' or target='||targetid||' limit 1'
        LOOP
        END LOOP;
        target_y := rec.target_y;


        FOR rec IN EXECUTE 'SELECT CASE WHEN '||source_x||'<'||target_x||
           ' THEN '||source_x||' ELSE '||target_x||
           ' END as ll_x, CASE WHEN '||source_x||'>'||target_x||
           ' THEN '||source_x||' ELSE '||target_x||' END as ur_x'
        LOOP
        END LOOP;

        ll_x := rec.ll_x;
        ur_x := rec.ur_x;

        FOR rec IN EXECUTE 'SELECT CASE WHEN '||source_y||'<'||
            target_y||' THEN '||source_y||' ELSE '||
            target_y||' END as ll_y, CASE WHEN '||
            source_y||'>'||target_y||' THEN '||
            source_y||' ELSE '||target_y||' END as ur_y'
        LOOP
        END LOOP;

        ll_y := rec.ll_y;
        ur_y := rec.ur_y;

        query := 'SELECT gid,the_geom FROM ' ||
          'shortest_path(''SELECT gid as id, source::integer, target::integer, ' ||
          '(length::double precision * (class_id/100)) as cost ';

        IF rc THEN query := query || ' , reverse_cost ';
        END IF;

        query := query || ' FROM ' || quote_ident(geom_table) || ' where setSRID(''''BOX3D('||
          ll_x-delta||' '||ll_y-delta||','||ur_x+delta||' '||
          ur_y+delta||')''''::BOX3D, ' || srid || ') && the_geom'', ' ||
          quote_literal(sourceid) || ' , ' ||
          quote_literal(targetid) || ' , '''||text(dir)||''', '''||text(rc)||''' ), ' ||
          quote_ident(geom_table) || ' where edge_id = gid ';

        RAISE NOTICE 'REQUETE %s',query;
        FOR path_result IN EXECUTE query
        LOOP
                 geom.gid      := path_result.gid;
                 geom.the_geom := path_result.the_geom;
                 id := id+1;
                 geom.id       := id;

                 RETURN NEXT geom;

        END LOOP;
        RETURN;
END;
$$
LANGUAGE 'plpgsql' VOLATILE STRICT;
