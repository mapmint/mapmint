# MapMint Official Docker Image


This Docker image can be used by combining the source code from the [MapMint](https://github.com/mapmint/mapmint) and [ZOO-Project](https://github.com/ZOO-Project/ZOO-Project) GitHub repositories.
To deploy MapMint on your local computer, you must first ensure that there is no service listening on the ports 80 and 5432. Then, once you are sure they are no service using these ports, you can use the following commands.

## Docker Image
```
docker pull geolabs/mapmint
```

## Port 80
Sometimes some services are running in the background on port 80. If your working OS is Ubuntu then the following command kills the services present on that port and the MapMint instance can be accessed.
``` 
sudo lsof -t -i tcp:80 -s tcp:listen | sudo xargs kill
```

## Create a working environment
For being able to use this Docker image, you will need to download the source code of both, the ZOO-Project and MapMint GitHub repository. You can find below the commands to setup a working startup tree.

## Clone Repositories
First clone the ZOO-Project GitHub repository
``` 
git clone https://github.com/ZOO-Project/ZOO-Project.git
```
Then, clone the MapMint GitHub repository.
```
git clone https://github.com/mapmint/mapmint
```

## Load Docker Images
Copy the file requied to load docker images
```
cp mapmint/docker-compose.yml
```

## Create directories and a few files
The following commands help in creating directories and a few files necessarily required during the runtime.
```
mkdir data data/share data/maps data/public_maps tmp \
    tmp/descriptions tmp/cache
touch \
    tmp/MainDescriptionMM5f6ee5fe-0b04-11ec-97ff-0242c0a8e006.html
cp mapmint/template/data/maps/* data/maps/
```

## Download Sample Dataset and Uncompress
Incase you use your own dataset, you may avoid the following.
```
curl -o north_carolina.tar.bz2 \
  http://geolabs.fr/dl/north_carolina.tar.bz2
tar -xvf north_carolina.tar.bz2 -C data/share/
```

## Startup MapMint
In the previous section we described how to produce a working tree from which you will be able to start the MapMint instance. From this directory (present one), simply run the following command from the terminal.
```
docker-compose up
```
You are ready to access the MapMint instance if you have followed the commands in the right order as described above.

















