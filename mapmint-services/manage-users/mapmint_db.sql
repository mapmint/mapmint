CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            login varchar(25) UNIQUE,
            nom varchar(255),
            prenom varchar(255),
            passwd varchar(40),
            mail varchar(255),
            tel varchar(30),
            last_con datetime,
            last_map varchar(255)
);

CREATE TABLE groups (
	id INTEGER PRIMARY KEY,
	nom varchar(25) UNIQUE,
	description varchar(255)
);

CREATE TABLE user_group (
	id INTEGER PRIMARY KEY,
	id_user INTEGER,
	id_group INTEGER,
	FOREIGN KEY(id_user) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY(id_group) REFERENCES groups(id) ON DELETE CASCADE,
	UNIQUE (id_user,id_group)
);


INSERT INTO groups (nom,description) VALUES ('admin','The admin group');
INSERT INTO user_group (id_user,id_group) VALUES (1,1);