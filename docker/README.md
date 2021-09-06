# Setup MapMint with Docker

## Working OS
```
Ubuntu 20.04 LTS
```

## Pull image from docker hub
```
docker pull geolabs/mapmint
```

## Clone Repositories
Open you terminal to clone MapMint and ZOO-Project's GitHub Repositories.
```
git clone https://github.com/ZOO-Project/ZOO-Project.git
cd ZOO-Project
```
Inside the ZOO-Project directory, replace the contents of the docker-compose.yml with the [following code](https://gist.github.com/aryanxk02/1368534336640d163e8ead241c31125e)

Now head to the docker directory and change the contents of the main.cfg file with the [following code](https://gist.github.com/aryanxk02/8290457778fdcd003210fd2273e97209)

```
git clone https://github.com/mapmint/mapmint.git
cd mapmint
git checkout gsoc
```

## Build the image

Open your terminal inside the ZOO-Project directory and enter the following command.

```
sudo docker-compose up
```

Access the instance by the following links:

```
1. MapMint: http://localhost/ui/Dashboard_bs

2. ZOO-Project: localhost
```
