
CREATE TABLE mm.territories (
    id serial PRIMARY KEY,
    name character varying(50),
    datasource character varying(255),
    ord integer
);

CREATE TABLE mm.territories_groups (
    g_id integer REFERENCES mm.groups(id) ON DELETE CASCADE,
    t_id integer REFERENCES mm.territories(id) ON DELETE CASCADE,
    id serial PRIMARY KEY
);


CREATE TABLE mm.territories_themes (
    g_id integer REFERENCES mm.territories(id) ON DELETE CASCADE,
    t_id integer REFERENCES mm.themes(id) ON DELETE CASCADE,
    id serial PRIMARY KEY
);

CREATE TABLE mm.t_hierarchy (
    id serial PRIMARY KEY,
    o_t_id integer REFERENCES mm.territories(id) ON DELETE CASCADE,
    p_t_id integer REFERENCES mm.territories(id) ON DELETE CASCADE
);

CREATE TABLE mm.indicators (
    id serial PRIMARY KEY,
    name character varying(50),
    description text,
    sources character varying(255),
    fiche character varying(255),
    ord integer,
    filename character varying(255),
    url text
);

CREATE TABLE mm.indicators_favoris (
    id serial PRIMARY KEY,
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE,
    u_id integer REFERENCES mm.users(id) ON DELETE CASCADE,
    note integer
);

CREATE TABLE mm.indicators_groups (
    id serial PRIMARY KEY,
    g_id integer REFERENCES mm.groups(id) ON DELETE CASCADE,
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE
);

CREATE TABLE mm.indicators_territories (
    id serial PRIMARY KEY,
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE,
    t_id integer REFERENCES mm.territories(id) ON DELETE CASCADE,
    filename text,
    o_key_link character varying(255),
    tbl_link character varying(255),
    tbl_key_link character varying(255),
    query text,
    temporale character varying(255),
    ds character varying(50),
    fields text,
    agregation boolean
);

CREATE TABLE mm.indicators_themes (
    id serial PRIMARY KEY,
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE,
    t_id integer REFERENCES mm.themes(id) ON DELETE CASCADE
);

CREATE TABLE mm.keywords (
    id serial PRIMARY KEY,
    nom character varying(255)
);

CREATE TABLE mm.indicators_keywords (
    id serial PRIMARY KEY,
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE,
    k_id integer REFERENCES mm.keywords(id) ON DELETE CASCADE
);

CREATE TABLE mm.operators (
    id serial PRIMARY KEY,
    name character varying(50),
    funcname text
);

CREATE TABLE mm.dtable (
    id serial PRIMARY KEY,
    it_id integer REFERENCES mm.indicators_territories(id) ON DELETE CASCADE,
    pos integer,
    var character varying(50),
    label character varying(150),
    value text,
    display boolean,
    search boolean,
    width integer,
    step integer
);

CREATE TABLE mm.d_table (
    id serial PRIMARY KEY,
    name character varying(50),
    order_by character varying(150),
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE,
    step integer
);

CREATE TABLE mm.graphs (
    id serial PRIMARY KEY,
    it_id integer REFERENCES mm.indicators_territories(id) ON DELETE CASCADE,
    type character varying(10),
    title character varying(150),
    vx character varying(50),
    lx text,
    vy character varying(50),
    ly text,
    odfile character varying(255),
    tooltip text,
    name character varying(255),
    formula text,
    step integer
);

CREATE TABLE mm.ftypes (
    id serial PRIMARY KEY,
    name character varying(50),
    label character varying(50)
);

INSERT INTO mm.ftypes (id,name,label) VALUES('0','default','Default display');
INSERT INTO mm.ftypes (id,name,label) VALUES('1','map','Main map image');
INSERT INTO mm.ftypes (id,name,label) VALUES('2','scalebar','Scalebar image');
INSERT INTO mm.ftypes (id,name,label) VALUES('3','table','Table display');
INSERT INTO mm.ftypes (id,name,label) VALUES('4','diag','Graph display');
INSERT INTO mm.ftypes (id,name,label) VALUES('5','desc','Index Description');
INSERT INTO mm.ftypes (id,name,label) VALUES('6','sources','Index Sources');
INSERT INTO mm.ftypes (id,name,label) VALUES('7','location','Location Map');

CREATE TABLE mm.rtable (
    id serial PRIMARY KEY,
    it_id integer REFERENCES mm.indicators_territories(id) ON DELETE CASCADE,
    var character varying(50),
    typ integer REFERENCES mm.ftypes(id) ON DELETE CASCADE,
    value text,
    display boolean,
    step integer
);

CREATE TABLE mm.r_table (
    id serial PRIMARY KEY,
    i_id integer REFERENCES mm.indicators(id) ON DELETE CASCADE,
    name character varying(50),
    doc text,
    step integer
);


create schema indexes;
