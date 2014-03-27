#!/bin/bash


BASE_DIR="/home/mapmint-prod/trial"
HTTP_USER="apache"
INITIAL_DIR="/home/mapmint-prod/trial/initial"
DATA_DEFAULT="/home/mapmint-prod/trial/data.trial"

usage()
{
cat << EOF
usage: $0 [-h|ie]

Script de deploiement d'une instance  free trial de mapmint 

OPTIONS:
  -h   afficher l'aide
  -i   identifiant de l'instance
  -e   adresse mail

EOF
}

if [ -z $1 ]
then
        usage
        exit 2
fi

while getopts "hi:e:" OPTION
do
        case $OPTION in
                h)
                        usage
                        exit 1
                        ;;
                i)
                        IDENT=$OPTARG
                        ;;
		e)
			EMAIL=$OPTARG
			;;
                ?)
                        usage
                        exit 5
                        ;;
        esac
done

LOCKFILE=/tmp/add_trial.lock
lockfile-create --retry 1 $LOCKFILE
if [ $? -ne 0 ]; then
        # could not create lock
        exit 2
fi

lockfile-touch $LOCKFILE &
LOCKFILEPID="$!"
trap "kill $LOCKFILEPID ; lockfile-remove $LOCKFILE" EXIT SIGKILL SIGTERM SIGQUIT

mkdir $BASE_DIR/$IDENT

if [ $? -ne 0 ]; then
	echo " Erreur lors de la creation de $BASE_DIR/$IDENT"
	exit 2
fi

echo "Creation arborescence"

mkdir $BASE_DIR/$IDENT/{conf,cache,data,www,tmp}
#mkdir $BASE_DIR/$IDENT/www/public_map
mkdir $BASE_DIR/$IDENT/data/{dirs,Upload,MySQL,PostGIS,maps,ftp}

cp -a $INITIAL_DIR/cgi-bin $BASE_DIR/$IDENT/
cp -a $INITIAL_DIR/data/fonts $BASE_DIR/$IDENT/data/
cp -a $INITIAL_DIR/data/symbols.sym $BASE_DIR/$IDENT/data/
cp -a $INITIAL_DIR/www/mm $BASE_DIR/$IDENT/www
cp -a $INITIAL_DIR/www/public_map $BASE_DIR/$IDENT/www

cp -a $DATA_DEFAULT/data/* $BASE_DIR/$IDENT/data/ftp/
cp -a $DATA_DEFAULT/maps/* $BASE_DIR/$IDENT/data/maps/

ln -s $BASE_DIR/$IDENT/data/ftp/world-shapefiles $BASE_DIR/$IDENT/data/dirs/world

find $BASE_DIR/$IDENT/data/ -name *.map | xargs perl -i -pe "s/initial/$IDENT/g"

echo "Creation configuration vhost"
./make_vhost.py -b "$BASE_DIR/$IDENT" -u "$IDENT.trial.mapmint.com" -d "$BASE_DIR/v.hosts/$IDENT.conf"

echo "Creation du main.cfg"
./make_cfg.py  -b "$BASE_DIR/$IDENT" -u "$IDENT.trial.mapmint.com" -f "$INITIAL_DIR/conf/main.cfg"  -d "$BASE_DIR/$IDENT/conf/main.cfg"

echo "Creation mapmint sqlite db"
PASS=$(./make_db.py -u "$IDENT.trial.mapmint.com" -e "$EMAIL" -d "$BASE_DIR/$IDENT/mm.db")

echo -e "$PASS\n$PASS" | pure-pw useradd $IDENT -u apache -g apache -d $BASE_DIR/$IDENT/data/ftp
pure-pw mkdb

chown -R $HTTP_USER:$HTTP_USER $BASE_DIR/$IDENT

echo "chargement du vhost"
/etc/init.d/apache2 graceful

wget -O- "http://$IDENT.trial.mapmint.com/cgi-bin/zoo_loader.cgi?metapath=authenticate&service=WPS&version=1.0.0&request=Execute&Identifier=logIn&DataInputs=login=admin;password=$PASS&RawDataOutput=Result"



