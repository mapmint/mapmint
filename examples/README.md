## Steps to install and get Administration interface
1. Install OSGeo Live 12.0
	- Download link: https://live.osgeo.org/en/download.html
	- Instructions on setting up OSGeo Live Virtual Machine: https://live.osgeo.org/en/quickstart/virtualization_quickstart.html
2. Open terminal and execute the following commands sequentially.

```sh
cd
mkdir mm-install
cd mm-install

sudo su
# [Enter password]

apt-get install ansible git openssh-server python3-setuptools python-pip python3-pip

git clone --branch "GSoC-2019-python3-support" https://github.com/fenilgmehta/ansible-roles.git
cd ansible-roles
git reset --hard a34fb36a3927ae29a9a6812cb3d8ea0b166ae4cd

cd osgeolive
sed --in-place 's#hosts: all#hosts: localhost#g' server.yml
sed --in-place 's#https://github.com/mapmint/mapmint.git#https://github.com/fenilgmehta/mapmint.git#g' dependencies/tasks/main.yml

# Python 3.6.7 or higher
pip3 install beautifulsoup4
python3 "update_r-cran_version.py"
python3 "update_lo_version.py"

ansible-playbook -s server.yml -u root
```

3. Installation complete :)
4. Open the following link in browser: http://localhost/ui/Dashboard_bs

![Administration interface](https://raw.githubusercontent.com/fenilgmehta/mapmint/master/examples/Administration%20Interface.png)
