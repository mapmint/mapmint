create schema mm_tables;

--
-- Table used to store history
--
CREATE TABLE mm_tables.ghosts (
       document_id serial PRIMARY KEY,
       pid integer REFERENCES mm_tables.ghosts(document_id) ON DELETE CASCADE,
       edition_date timestamp without time zone DEFAULT now(),
       operator character varying(255)
);

--
-- Table used to store ordering modes (asc, desc, none)
--
CREATE TABLE mm_tables.fclasses (
       id serial PRIMARY KEY,
       name character varying(255)
);

INSERT INTO mm_tables.fclasses (name) VALUES ('asc');
INSERT INTO mm_tables.fclasses (name) VALUES ('desc');
INSERT INTO mm_tables.fclasses VALUES (0,'none');

--
-- Table used to store fields types
--
CREATE TABLE mm_tables.ftypes(
       id serial PRIMARY KEY,
       name text,
       code varchar(255),
       ftype char,
       basic boolean DEFAULT true
);

INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Character varying(255)', 'varchar(255)', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Character varying(50)', 'varchar(50)', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Character varying(25)', 'varchar(25)', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Date', 'date', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Binary file', 'bytea', 'e', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Table link', 'tbl_linked', 'e', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Password', 'varchar(32)', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Number', 'float', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Reference', 'ref', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Link Table', 'tbl_link', 'e', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Linked Table', 'link', 'e', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Text', 'text', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Boolean', 'boolean', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Linked document', 'multiple_doc', 'r', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('SQL Table ', 'sql_array', 'r', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Paragraphs', 'paragraph_sql_array', 'r', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Diagram', 'diagram', 'r', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Geometry', 'geometry', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('HTML Text', 'html', 'e', true);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Table element', 'tbl_list', 'e', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('default', 'default', 'r', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('HTML Content', 'html', 'r', false);
INSERT INTO mm_tables.ftypes (name,code,ftype,basic) VALUES ('Date and Time', 'datetime', 'e', true);

--
-- Table used to store tables information
--
CREATE TABLE mm_tables.p_tables(
       id serial PRIMARY KEY,
       name text,
       title text,
       description text
);

--
-- Table used to store views information
--
CREATE TABLE mm_tables.p_views (
    id serial PRIMARY KEY,
    ptid integer REFERENCES mm_tables.p_tables(id) ON DELETE CASCADE,
    name character varying(255),
    description text,
    clause text,
    visible boolean DEFAULT true
);

--
-- Table used to store views' fields information
--
CREATE TABLE  mm_tables.p_view_fields (
    id serial PRIMARY KEY,
    alias text,
    vid integer REFERENCES mm_tables.p_views(id) ON DELETE CASCADE,
    value text,
    view boolean,
    search boolean,
    class integer REFERENCES mm_tables.fclasses(id) ON DELETE CASCADE,
    name text,
    width character varying(20) DEFAULT '20%'::character varying
);

CREATE TABLE mm_tables.p_view_groups (
    vid integer REFERENCES mm_tables.p_views(id) ON DELETE CASCADE,
    gid integer REFERENCES mm.groups(id) ON DELETE CASCADE
);

CREATE TABLE mm_tables.p_view_themes (
    vid integer REFERENCES mm_tables.p_views(id) ON DELETE CASCADE,
    tid integer REFERENCES mm.themes(id) ON DELETE CASCADE
);

--
-- Table used to store editions information
--
CREATE TABLE mm_tables.p_editions (
    id serial PRIMARY KEY,
    ptid integer REFERENCES mm_tables.p_tables(id) ON DELETE CASCADE,
    name character varying(255),
    step integer
);

CREATE TABLE mm_tables.p_edition_groups (
    eid integer REFERENCES mm_tables.p_editions(id) ON DELETE CASCADE,
    gid integer REFERENCES mm.groups(id)  ON DELETE CASCADE
);

CREATE TABLE mm_tables.p_edition_themes (
    eid integer REFERENCES mm_tables.p_editions(id) ON DELETE CASCADE,
    tid integer REFERENCES mm.themes(id) ON DELETE CASCADE
);

--
-- Table used to store editions' fields information
--
CREATE TABLE mm_tables.p_edition_fields (
    id serial PRIMARY KEY,
    eid integer REFERENCES mm_tables.p_editions(id) ON DELETE CASCADE,
    alias character varying(255),
    ftype integer REFERENCES mm_tables.ftypes(id) ON DELETE CASCADE,
    value text,
    dependencies text,
    edition boolean,
    name text
);

--
-- Table used to store reports information
--
CREATE TABLE mm_tables.p_reports (
    id serial PRIMARY KEY,
    ptid integer REFERENCES mm_tables.p_tables(id) ON DELETE CASCADE,
    name character varying(255),
    element boolean,
    clause text,
    file bytea
);

--
-- Table used to store reports' fields information
--
CREATE TABLE  mm_tables.p_report_fields (
    id serial PRIMARY KEY,
    rid integer REFERENCES mm_tables.p_reports(id) ON DELETE CASCADE,
    name character varying(255),
    ftype integer REFERENCES mm_tables.ftypes(id) ON DELETE CASCADE,
    value text
);

CREATE TABLE  mm_tables.p_report_groups (
    rid integer REFERENCES mm_tables.p_reports(id) ON DELETE CASCADE,
    gid integer REFERENCES mm.groups(id)  ON DELETE CASCADE
);

--
-- Table used to store importers information
--
CREATE TABLE  mm_tables.importers (
    id serial PRIMARY KEY,
    name character varying(255),
    description text,
    template bytea,
    tid int4 REFERENCES mm_tables.p_tables(id)
);

CREATE TABLE mm_tables.importer_groups (
    iid integer REFERENCES mm_tables.importers(id) ON DELETE CASCADE,
    gid integer REFERENCES mm.groups(id) ON DELETE CASCADE
);

CREATE TABLE mm_tables.importer_themes (
    iid integer REFERENCES mm_tables.importers(id) ON DELETE CASCADE,
    tid integer REFERENCES mm.themes(id) ON DELETE CASCADE
);


CREATE TABLE mm_tables.page_types (
    id serial PRIMARY KEY,
    name text,
    code text
);

INSERT INTO mm_tables.page_types (name,code) VALUES ('Lines', 'lines');
INSERT INTO mm_tables.page_types (name,code) VALUES ('Complex', 'complex');

--
-- Table used to store pages information
--
CREATE TABLE mm_tables.pages (
    id serial PRIMARY KEY,
    name text,
    tablename text,
    type integer REFERENCES mm_tables.page_types(id) ON DELETE CASCADE,
    ofield text,
    otype text,
    iid integer REFERENCES mm_tables.importers(id) ON DELETE CASCADE,
    length integer
);

--
-- Table used to store pages' fields information
--
CREATE TABLE mm_tables.page_fields (
    id serial PRIMARY KEY,
    pid integer REFERENCES mm_tables.pages(id),
    table_name text,
    field text,
    clause text,
    ignore integer,
    value text,
    label text,
    name character varying(50),
    type integer REFERENCES mm_tables.ftypes(id),
    rlabel text
);


CREATE OR REPLACE FUNCTION generate_create_ghost_table_statement(p_table_name varchar)
  RETURNS text AS
$BODY$
DECLARE
    table_name   text[];
    v_table_ddl   text;
    column_record record;
BEGIN
    SELECT regexp_split_to_array(p_table_name,'\.') INTO table_name;
    FOR column_record IN 
        SELECT 
            b.nspname as schema_name,
            b.relname as table_name,
            a.attname as column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) as column_type,
	    ''::text as column_default_value,
	    ''::text as column_not_null,
            a.attnum as attnum,
            e.max_attnum as max_attnum
        FROM 
            pg_catalog.pg_attribute a
            INNER JOIN 
             (SELECT c.oid,
                n.nspname,
                c.relname
              FROM pg_catalog.pg_class c
                   LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relname ~ ('^('||table_name[2]||')$') and n.nspname ~ ('^('||table_name[1]||')$')
              ORDER BY 2, 3) b
            ON a.attrelid = b.oid
            INNER JOIN 
             (SELECT 
                  a.attrelid,
                  max(a.attnum) as max_attnum
              FROM pg_catalog.pg_attribute a
              WHERE a.attnum > 0 
                AND NOT a.attisdropped
              GROUP BY a.attrelid) e
            ON a.attrelid=e.attrelid
        WHERE a.attnum > 0 
          AND NOT a.attisdropped
        ORDER BY a.attnum
    LOOP
        IF column_record.attnum = 1 THEN
            v_table_ddl:='CREATE TABLE mm_ghosts.'||column_record.schema_name||'_'||column_record.table_name||' (';
        ELSE
            v_table_ddl:=v_table_ddl||',';
        END IF;

        IF column_record.attnum <= column_record.max_attnum THEN
            v_table_ddl:=v_table_ddl||chr(10)||
                     '    '||column_record.column_name||' '||column_record.column_type||' '||column_record.column_default_value||' '||column_record.column_not_null;
        END IF;
    END LOOP;
    v_table_ddl:=v_table_ddl||')';
    v_table_ddl:=v_table_ddl||' inherits(mm_tables.ghosts);';
    RETURN v_table_ddl;
END;
$BODY$
  LANGUAGE 'plpgsql' COST 100.0 SECURITY INVOKER;


CREATE OR REPLACE FUNCTION automatically_update_geom_property() RETURNS trigger AS 
$BODY$
DECLARE
	newX float8;
	newY float8;
	oldX float8;
	oldY float8;
	lgeom geometry;
	xfield varchar;
	yfield varchar;
	srs varchar;
BEGIN
	xfield:=TG_ARGV[0];
	yfield:=TG_ARGV[1];
	srs:=TG_ARGV[2];
	EXECUTE 'SELECT ($1).' || xfield || '::float as a' INTO newX USING NEW;
	EXECUTE 'SELECT ($1).' || yfield || '::float as a' INTO newY USING NEW;

	IF (TG_OP = 'UPDATE') THEN
	   EXECUTE 'SELECT ($1).' || xfield || '::float as a' INTO oldX USING OLD;
	   EXECUTE 'SELECT ($1).' || yfield || '::float as a' INTO oldY USING OLD;

	   IF newX!=oldX or newY!=oldY or (NEW.wkb_geometry is null and newY is not null and newX is not null) THEN
	      EXECUTE $q$SELECT ST_SetSRID(ST_MakePoint($q$||newX||$q$,$q$||newY||$q$),(select srid from spatial_ref_sys where auth_name||':'||auth_srid='$q$||srs||$q$'))$q$ INTO NEW.wkb_geometry;
	   END IF;
	ELSE
	   BEGIN
	   EXECUTE $q$SELECT ST_SetSRID(ST_MakePoint($q$||newX||$q$,$q$||newY||$q$),(select srid from spatial_ref_sys where auth_name||':'||auth_srid='$q$||srs||$q$'))$q$ INTO NEW.wkb_geometry;
	   END;
	END IF;
	return NEW;
END;
$BODY$
  LANGUAGE 'plpgsql' COST 100.0 SECURITY INVOKER;


CREATE OR REPLACE FUNCTION update_ghosts() RETURNS trigger AS 
$$
DECLARE
	ireq TEXT;
	req TEXT;
	reqc TEXT;
	reqv TEXT;
	reqv_ TEXT;
	reqc1 TEXT;
	reqv1 TEXT;
	reqv1_ TEXT;
	myrec RECORD;
	ri RECORD;
	oldValue RECORD;
	newValue RECORD;
	columns RECORD;
	oldVal RECORD;
	newVal RECORD;
	cnt integer;
	types RECORD;
	myOperation varchar;
	i integer;
	newId integer;
	text_var1 text;
	text_var2 text;
  	text_var3 text;
	pkey text;
BEGIN
	cnt=1;
	RAISE WARNING 'START';
	RAISE NOTICE 'SELECT attname FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname=% AND pg_namespace.oid=relnamespace AND nspname=%) and attnum=(select conkey[1] from pg_constraint where conrelid=(SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname=% AND pg_namespace.oid=relnamespace AND nspname=%) and contype=p) INTO pkey ',quote_literal(TG_TABLE_NAME),quote_literal(TG_TABLE_SCHEMA),quote_literal(TG_TABLE_NAME),quote_literal(TG_TABLE_SCHEMA);
	SELECT attname FROM pg_catalog.pg_attribute a, pg_catalog.pg_type b WHERE  a.atttypid=b.oid AND a.attrelid = (SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname=quote_ident(TG_TABLE_NAME) AND pg_namespace.oid=relnamespace AND nspname=quote_ident(TG_TABLE_SCHEMA)) and attnum=(select conkey[1] from pg_constraint where conrelid=(SELECT pg_class.oid FROM pg_class, pg_namespace WHERE relname=quote_ident(TG_TABLE_NAME) AND pg_namespace.oid=relnamespace AND nspname=quote_ident(TG_TABLE_SCHEMA)) and contype='p') INTO pkey ;
	RAISE NOTICE 'Element %', pkey;
	SELECT ARRAY(SELECT column_name::text
	        FROM information_schema.columns
	        WHERE
	            table_schema = quote_ident(TG_TABLE_SCHEMA)
	        AND table_name = quote_ident(TG_TABLE_NAME)
	        ORDER BY ordinal_position) as a INTO columns;
	SELECT ARRAY(SELECT column_name::text
	        FROM information_schema.columns
	        WHERE
	            table_schema = quote_ident(TG_TABLE_SCHEMA)
	        AND table_name = quote_ident(TG_TABLE_NAME)
	        ORDER BY ordinal_position) as a INTO oldVal;
	SELECT ARRAY(SELECT column_name::text
	        FROM information_schema.columns
	        WHERE
	            table_schema = quote_ident(TG_TABLE_SCHEMA)
	        AND table_name = quote_ident(TG_TABLE_NAME)
	        ORDER BY ordinal_position) as a INTO newVal;
	SELECT ARRAY(SELECT data_type::text
	        FROM information_schema.columns
	        WHERE
	            table_schema = quote_ident(TG_TABLE_SCHEMA)
	        AND table_name = quote_ident(TG_TABLE_NAME)
	        ORDER BY ordinal_position) as a INTO types;
	reqc:='';
	reqv:='';
	reqv_:='';
	reqv1:='';
	myOperation:='insert';
	FOR ri IN
		-- Fetch a ResultSet listing columns defined for this trigger's table.
	        SELECT ordinal_position, column_name, data_type
	        FROM information_schema.columns
	        WHERE
	            table_schema = quote_ident(TG_TABLE_SCHEMA)
	        AND table_name = quote_ident(TG_TABLE_NAME)
	        ORDER BY ordinal_position
	LOOP
		-- For each column in this trigger's table, copy the OLD & NEW values into respective variables.
		-- NEW value
		RAISE NOTICE 'I (%)', cnt;
		RAISE NOTICE 'Column (%)', columns.a[cnt];
		RAISE NOTICE 'Type (%)', types.a[cnt];
		RAISE NOTICE 'oldVal (%)', oldVal.a[cnt];
		RAISE NOTICE 'newVal (%)', newVal.a[cnt];

		-- OLD value
		IF (TG_OP = 'UPDATE') OR (TG_OP = 'DELETE') THEN
		   myOperation:='update';
		   EXECUTE 'SELECT ($1).' || ri.column_name || ' as a' INTO oldValue USING OLD;
		   -- oldVal.a[cnt]:=oldValue;
		   IF reqv!='' THEN
		      BEGIN 
		      	    reqv:=reqv||','||quote_nullable(oldValue.a);
		      EXCEPTION WHEN others THEN
		      	    reqv:=reqv||',($1).'||columns.a[cnt];
			    reqv_:='issue';
		      END;
		   ELSE
		      reqv:=quote_nullable(oldValue.a);
		   END IF;
		   RAISE NOTICE 'REQV (%)', reqv;
		END IF;

		   IF (TG_OP != 'DELETE') THEN
		      EXECUTE 'SELECT ($1).' || ri.column_name || ' as a' INTO newValue USING NEW;
		      RAISE NOTICE  'SELECT cast((%).% as %)', newValue, ri.column_name,types.a[cnt];
		      -- newVal.a[cnt]:=newValue;
		      --IF newValue is not null and newValue.a is not null THEN
		      BEGIN
			IF reqv1!='' THEN
		      	   BEGIN 
		      	   	 reqv1:=reqv1||','||quote_nullable(newValue.a);
		      	   EXCEPTION WHEN others THEN
		      	    	 reqv1:=reqv1||',($1).'||columns.a[cnt];
			    	 reqv1_:='issue';
		      	   END;
		      	ELSE
				reqv1:=quote_nullable(newValue.a)||'';
		      	END IF;
		      EXCEPTION WHEN others THEN
				RAISE NOTICE 'Exception %',newValue;
		      END;

		      --END IF;		
		      RAISE NOTICE 'REQV1 (%)', reqv1;
		   END IF;

		   IF reqc!='' THEN
		      reqc:=reqc||','||quote_ident(columns.a[cnt]);
		   ELSE
		      reqc:=quote_ident(columns.a[cnt]);
		   END IF;

		   RAISE NOTICE 'REQC (%)', reqc;
		cnt=cnt+1;
	END LOOP;
	IF (TG_OP = 'UPDATE') THEN
	   EXECUTE 'SELECT ($1).' || pkey || ' as a' INTO newId USING NEW;
	   ireq:=$q$(SELECT max(document_id) from mm_ghosts.$q$||TG_TABLE_SCHEMA||$q$_$q$||TG_TABLE_NAME||$q$ where $q$||pkey||$q$=$q$||newId||$q$)$q$;
	   RAISE NOTICE 'IREQ (%)', ireq;
	   req:=$q$INSERT INTO mm_ghosts.$q$||TG_TABLE_SCHEMA||$q$_$q$||TG_TABLE_NAME||$q$ (operator,pid,$q$||reqc||$q$)$q$||$q$ VALUES ($q$||quote_literal(myOperation)||$q$,$q$||ireq||$q$,$q$||reqv||$q$) RETURNING document_id$q$;
	   RAISE NOTICE 'REQ (%)', req;
	   EXECUTE req INTO i USING OLD ;
	   req:=$q$INSERT INTO mm_ghosts.$q$||TG_TABLE_SCHEMA||$q$_$q$||TG_TABLE_NAME||$q$ (operator,pid,$q$||reqc||$q$)$q$||$q$ VALUES ($q$||quote_literal(myOperation)||$q$,$q$||i||$q$,$q$||reqv1||$q$)$q$;
	   RAISE NOTICE 'REQ (%)', req;
	   EXECUTE req USING NEW;
	ELSE
	   IF (TG_OP = 'DELETE') THEN
	      myOperation:='delete';
	   END IF;
	   IF (TG_OP = 'DELETE') THEN
	      req:=$q$INSERT INTO mm_ghosts.$q$||TG_TABLE_SCHEMA||$q$_$q$||TG_TABLE_NAME||$q$ (operator,$q$||reqc||$q$)$q$||$q$ VALUES ($q$||quote_literal(myOperation)||$q$,$q$||reqv||$q$)$q$;
	      EXECUTE req USING OLD;
	      RETURN OLD;
	   ELSE
	      req:=$q$INSERT INTO mm_ghosts.$q$||TG_TABLE_SCHEMA||$q$_$q$||TG_TABLE_NAME||$q$ (operator,$q$||reqc||$q$)$q$||$q$ VALUES ($q$||quote_literal(myOperation)||$q$,$q$||reqv1||$q$)$q$;
	      RAISE NOTICE 'REQ (%)', req;
	      EXECUTE req USING NEW;
	   END IF;
	END IF;
	-- RAISE NOTICE 'Calling myrec(%)', oldVal;
	-- RAISE NOTICE 'Calling myrec(%)', newVal;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
