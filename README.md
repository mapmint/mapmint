# ![logo](mapmint-ui/img/mapmint-logo-small.png "MapMint") MapMint

MapMint is a Geographic Information System (GIS) software running on a web server made to facilitate the adminstration of a <b>Spatial Data Infrastructure</b> (SDI), publishing cartographic portals and dynamic applications.

The MapMint platform is a GIS Software accessible thourgh a simple web browser but also a modular and extensible WEB-GIS application generator. It provides numerous GIS capability and let the user do the following:

 * <b>Import and store GIS data</b> (both vector and raster data)
 * <b>Query</b> Relational Database System and external WMS/WFS servers
 * <b>Publish</b> GIS data by using OGC Web Services: WMS, WFS et WMTS
 * <b>Treate, edit and style</b> data sources
 * Compose and save maps to create application projects (using mapfile)
 * Configure and generate Web GIS applications
 * <b>Configure</b> and use GIS portals
 * <b>Access and share maps</b>

<h3>Basic concepts: using the OGC standards</h3>

The main idea behind the MapMint solution is the massive usage of OGC Web Services and making all processing in the solution available as WPS services using the ZOO-Project OpenSource software.

<h3>Main software components</h3>

MapMint is using numerous OSGeo softwares and bring them all together in a complete Web-GIS platform by using the WPS to make them understandable and usable to and from each other.


 Software |	Usage 
------------- | -------------
 ![logo](http://geolabs.fr/mmws2014/_static/images/zoo-logo-green.png) | All the processing in the MapMint solution iso based on the ZOO-Project so on the OGC WPS standard, even to produce dynamic web pages.
 ![logo](http://geolabs.fr/mmws2014/_static/images/ms-logo-green.png) | 	MapMint use the MapServer cartographic engine to publish your date through OGC Web Services (WMS,WFS and WCS) in an efficient way.
 ![logo](http://geolabs.fr/mmws2014/_static/images/gdal-logo-green.png "GDAL logo") |	The abstraction library used to access and interract with datasources transparently is the GDAL/OGR library.
 ![logo](hhttp://geolabs.fr/mmws2014/_static/images/ol-logo-green.png "OpenLayers logo") | 	MapMint User Interfaces (UI) are using OpenLayers. 
 
For information on how to setup MapMint, please refer to https://github.com/mapmint/mapmint/edit/master/INSTALL.md.
