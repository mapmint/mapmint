--
-- PostgreSQL database dump
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;


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
    adm integer
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
    id_user integer REFERENCES mm.users(id),
    id_group integer REFERENCES mm.groups(id)
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


SET search_path = mm, pg_catalog;

INSERT INTO groups VALUES (default, 'public', 'Public access to the application', NULL, 0);
INSERT INTO groups VALUES (default, 'admin', 'The adminstrator group', NULL, 1);

INSERT INTO users VALUES (default, 'test', '65bb58b00d00338d20e56ac3786cc15151ea5a72', 'Gérald', 'Fenoy', '+33670082539', '', '', 'gerald.fenoy@geolabs.fr', NULL, true, '2014-09-17 09:54:01.294737+00', 'XXX');


INSERT INTO user_group VALUES (default, 1, 2);


