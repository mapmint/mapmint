--
-- PostgreSQL database dump
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION searchField(val text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
        RETURN '%'||val||'%';
END;
$$;


CREATE FUNCTION get_nb_of(my_array smallint[], val smallint) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE        i int;        res int;        mymax int;BEGIN
        i:=1;
        res:=0;
        SELECT array_upper(my_array,1) INTO mymax;
        WHILE i <= mymax LOOP
                BEGIN
                        IF my_array[i] = val THEN
                                res=res+1;
                        END IF;
                EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'ERROR ON :%',my_array[i];
                        RETURN -1;
                END;
                i=i+1;
        END LOOP;
        RETURN res;

END;
$$;

CREATE FUNCTION get_index_of(my_array integer[], val integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
        i int;
        res int;
        mymax int;
BEGIN
        i:=1;
        res:=0;
        SELECT array_upper(my_array,1) INTO mymax;
        WHILE i <= mymax LOOP
                BEGIN
                        IF my_array[i] = val THEN
                                RETURN i;
                                res=res+1;
                        END IF;
                EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'ERROR ON :%',my_array[i];
                        RETURN -1;
                END;
                i=i+1;
        END LOOP;
        RETURN -1;

END;
$$;

CREATE FUNCTION get_index_of(my_array smallint[], val smallint) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
        i int;
        res int;
        mymax int;
BEGIN
        i:=1;
        res:=0;
        SELECT array_upper(my_array,1) INTO mymax;
        WHILE i <= mymax LOOP
                BEGIN
                        IF my_array[i] like '%'||val||'%' THEN
                                RETURN i;
                                res=res+1;
                        END IF;
                EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'ERROR ON :%',my_array[i];
                        RETURN -1;
                END;
                i=i+1;
        END LOOP;
        RETURN -1;

END;
$$;
--
-- Name: mm; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA mm;

SET search_path = mm, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;


--
-- Name: groups; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE groups (
    id serial PRIMARY KEY,
    name character varying(25) NOT NULL,
    description text,
    pid integer,
    adm integer,
    sadm boolean DEFAULT true
);


--
-- Name: users; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE users (
    id serial PRIMARY KEY,
    login character varying(26) DEFAULT ''::character varying NOT NULL,
    passwd character varying(40) DEFAULT NULL::character varying,
    firstname character varying(25) DEFAULT NULL::character varying,
    lastname character varying(25) DEFAULT NULL::character varying,
    phone character varying(15) DEFAULT NULL::character varying,
    fax character varying(15) DEFAULT NULL::character varying,
    mobile_phone character varying(15) DEFAULT NULL::character varying,
    mail character varying(100) DEFAULT NULL::character varying,
    s_group_id integer REFERENCES mm.users(id),
    valid boolean,
    last_con character varying(255),
    last_map text
);


--
-- Name: user_group; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE user_group (
    id serial PRIMARY KEY,
    id_user integer REFERENCES mm.users(id) ON DELETE CASCADE,
    id_group integer REFERENCES mm.groups(id) ON DELETE CASCADE
);


--
-- Name: amenagements; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE amenagements (
    id serial PRIMARY KEY,
    name character varying(255),
    filename character varying(255)
);


--
-- Name: contexts; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE contexts (
    id serial PRIMARY KEY,
    name character varying(25),
    layers text,
    ext character varying(100)
);


--
-- Name: favoris; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE favoris (
    id serial PRIMARY KEY,
    map text,
    u_id integer
);


--
-- Name: ilinks; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE ilinks (
    id serial PRIMARY KEY,
    name character varying(255),
    url text,
    content text,
    short character varying(250)
);

--
-- Name: links; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE links (
    id serial PRIMARY KEY,
    title character varying(255),
    url character varying(255)
);

CREATE TABLE links_groups (
    id serial PRIMARY KEY,
    l_id integer REFERENCES mm.links(id),
    g_id integer REFERENCES mm.groups(id)
);



--
-- Name: newstype; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE newstype (
    id serial PRIMARY KEY,
    name character varying(30)
);

--
-- Name: news; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE news (
    id serial PRIMARY KEY,
    title character varying(50),
    content text,
    newstype integer REFERENCES mm.newstype(id),
    id_user integer,
    p_date date
);

--
-- Name: news_groups; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE news_groups (
    id serial PRIMARY KEY,
    g_id integer REFERENCES mm.groups(id),
    n_id integer REFERENCES mm.news(id)
);



--
-- Name: revetements; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE revetements (
    id serial PRIMARY KEY,
    name character varying(255),
    filename character varying(255),
    type character varying(50)
);


--
-- Name: savedpath; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE savedpath (
    id serial PRIMARY KEY,
    trace text,
    name character varying(150),
    id_user integer REFERENCES mm.users(id),
    wkb_geometry public.geometry,
    CONSTRAINT enforce_dims_wkb_geometry CHECK ((public.st_ndims(wkb_geometry) = 2)),
    CONSTRAINT enforce_geotype_wkb_geometry CHECK (((public.geometrytype(wkb_geometry) = 'MULTIPOINT'::text) OR (wkb_geometry IS NULL))),
    CONSTRAINT enforce_srid_wkb_geometry CHECK ((public.st_srid(wkb_geometry) = 4326))
);


--
-- Name: themes; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE themes (
    id serial PRIMARY KEY,
    name character varying(50),
    description text,
    color character varying(6),
    ord integer,
    pid integer REFERENCES mm.themes(id)
);

--
-- Name: themes_groups; Type: TABLE; Schema: mm; Owner: postgres; Tablespace: 
--

CREATE TABLE themes_groups (
    id serial PRIMARY KEY,
    t_id integer REFERENCES mm.themes(id),
    g_id integer REFERENCES mm.groups(id)
);

CREATE TABLE documents (
    id serial PRIMARY KEY,
    name character varying(50),
    title character varying(50),
    description text,
    filename character varying(255),
    url text
);

CREATE TABLE documents_groups (
    id serial PRIMARY KEY,
    g_id integer REFERENCES mm.groups(id),
    d_id integer REFERENCES mm.documents(id)
);

CREATE TABLE documents_themes (
    id serial PRIMARY KEY,
    t_id integer REFERENCES mm.themes(id),
    d_id integer REFERENCES mm.documents(id)
);


CREATE TABLE pages (
    id serial PRIMARY KEY,
    title character varying(255),
    content text
);


CREATE TABLE servers (
    id serial PRIMARY KEY,
    name character varying(50),
    url text
);

CREATE TABLE protocols (
    id serial PRIMARY KEY,
    name character varying(3),
    cname character varying(25),
    ename character varying(25),
    lname character varying(50)
);

CREATE TABLE server_privileges (
    id serial PRIMARY KEY,
    id_group integer REFERENCES groups(id),
    id_server integer REFERENCES servers(id),
    id_protocol integer REFERENCES protocols(id),
    r boolean,
    w boolean,
    x boolean
);

CREATE TABLE layer_privileges (
    id serial PRIMARY KEY,
    id_group integer REFERENCES groups(id),
    id_server integer REFERENCES servers(id),
    id_protocol integer REFERENCES protocols(id),
    entity character varying(255),
    r boolean,
    w boolean,
    x boolean
);

CREATE TABLE tokens(
       id serial PRIMARY KEY,
       id_group int4 REFERENCES groups(id), 
       value varchar(25)
);

create table categories (
       id serial primary key, 
       name varchar(50)
);


create table requests(
       id serial PRIMARY KEY,
       name varchar(50)
);

create table request_protocol(
       id serial PRIMARY KEY,
       id_protocol int4 REFERENCES protocols(id),
       id_request int4 REFERENCES requests(id), 
       pos int,
       id_category int4 references categories(id) 
);

CREATE TABLE mm.ip_restirction (id serial primary key, sid int4 references servers(id), address varchar(15));

CREATE TABLE mm.security_logs (id serial primary key, request text, client varchar(15));


INSERT INTO categories (id, name) VALUES (1, 'Read');
INSERT INTO categories (id, name) VALUES (2, 'Write');
INSERT INTO categories (id, name) VALUES (3, 'Execute');


INSERT INTO protocols (id, name, cname, ename, lname) VALUES (1, 'SOS', 'SensorObservationService', NULL, NULL);
INSERT INTO protocols (id, name, cname, ename, lname) VALUES (4, 'WMS', 'WebMapService', 'Layer', NULL);
INSERT INTO protocols (id, name, cname, ename, lname) VALUES (2, 'WCS', 'WebCoverageService', 'CoverageOfferingBrief', NULL);
INSERT INTO protocols (id, name, cname, ename, lname) VALUES (5, 'WPS', 'WebProcessingService', 'Process', NULL);
INSERT INTO protocols (id, name, cname, ename, lname) VALUES (3, 'WFS', 'WebFeatureService', 'FeatureType', 'typeName');


INSERT INTO requests (id, name) VALUES (1, 'GETCAPABILITIES');
INSERT INTO requests (id, name) VALUES (2, 'GETMAP');
INSERT INTO requests (id, name) VALUES (3, 'GETFEATUREINFO');
INSERT INTO requests (id, name) VALUES (4, 'DESCRIBELAYER');
INSERT INTO requests (id, name) VALUES (5, 'GETLEGENDGRAPHIC');
INSERT INTO requests (id, name) VALUES (6, 'GETSTYLES');
INSERT INTO requests (id, name) VALUES (7, 'DESCRIBEFEATURETYPE');
INSERT INTO requests (id, name) VALUES (8, 'GETPROPERTYVALUE');
INSERT INTO requests (id, name) VALUES (9, 'GETFEATURE');
INSERT INTO requests (id, name) VALUES (10, 'LOCKFEATURE');
INSERT INTO requests (id, name) VALUES (11, 'GETFEATUREWITHLOCK');
INSERT INTO requests (id, name) VALUES (12, 'TRANSACTION');
INSERT INTO requests (id, name) VALUES (13, 'DESCRIBEPROCESS');
INSERT INTO requests (id, name) VALUES (14, 'EXECUTE');


INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (8, 3, 7, -1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (10, 3, 9, -1, 3);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (13, 3, 12, -1, 2);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (14, 5, 13, -1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (15, 5, 14, -1, 3);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (11, 3, 10, -1, 2);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (12, 3, 11, -1, 2);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (6, 4, 6, -1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (5, 4, 5, -1, 3);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (4, 4, 4, -1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (3, 4, 3, -1, 3);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (2, 4, 2, -1, 3);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (16, 5, 1, 1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (9, 3, 8, -1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (7, 3, 1, 1, 1);
INSERT INTO request_protocol (id, id_protocol, id_request, pos, id_category) VALUES (1, 4, 1, 1, 1);


SET search_path = mm, pg_catalog;

INSERT INTO groups VALUES (default, 'public', 'Public access to the application', NULL, 0);
INSERT INTO groups VALUES (default, 'admin', 'The adminstrator group', NULL, 1);

INSERT INTO users VALUES (default, 'test', '65bb58b00d00338d20e56ac3786cc15151ea5a72', 'Gérald', 'Fenoy', '+33670082539', '', '', 'gerald.fenoy@geolabs.fr', NULL, true, '2014-09-17 09:54:01.294737+00', 'XXX');


INSERT INTO user_group VALUES (default, 1, 2);


