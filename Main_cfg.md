#### ![logo](mapmint-ui/img/mapmint-logo-small.png "MapMint") Main.cfg details####

<h3>The [main] Section</h3>

This section is a general section and contains:

 * ```mmAddress```: the url to use to access your MapMint setup
 * ```dataPath```: the directory to store maps, fonts and datasources
 * ```tmpPath```: the directory to store temporary files
 * ```tmpUrl```: the url to access the temporary files
 * ```cacheDir```: the directory to cache files
 * ```rootUrl```: the public url
 * ```templatesPath```: the full path to access the ```mapmint-ui/templates```
   directory
 * ```publicationUrl```: the url to access your ```public_maps``` directory from
   your webserver
 * ```publicationPath```: the full path of the ```public_maps``` directory
 * ```mmPath```: the full path to the ```mapmint-ui``` directory on the server
 * ```sessPatg```: the full path to store session files
 * ```applicationAddress```: the full url to access the ```mapmint-ui``` directory
   from the web server
 * ```templatesAddress```: url to access the geenrated templates for
   displaying informations about features
 * ```serverAddress```: the url to access the ZOO-Kernel
 * ```mapserverAddress```: the url to access the MapServer
 * ```Rpy2```: can take the value true or false depending on the
   availability of the Rpy2 module on the server
 * ```jsCache```: can take the value ```prod``` or ```dev``` and will define if the
   JavaScript files should be compressed on the fly or not
 * ```cssCache```: can take the value ```prod``` or ```dev``` and will define if the
  CSS files should be compressed on the fly or not
 * ```isTrial```: should take the value ```true```
 * ```encoding```: should be ```utf-8```
 * ```language```: the default language to use
 * ```lang```: available languages list (languages are separated by comma)
 * ```cookiePrefix```: the name of the cookie used by mapmint
 * ```msOgcVersion```: version of the OGC services published through
   MapServer (WMS/WFS/WCS)
 * ```dbuserName```: the name of an existing PostGIS datastore to access the
   user
 * ```dblink```: the full path to the sqlite database
 * ```dbuser```: can be the name of an available section in the ```main.cfg```
   defining the database connection parameters or dblink in case only
   sqlite is used
 * ```3D```: can take the value ```true``` or ```false``` to define if 3D capabilities
   should be activated or not (obsolete)

<h3>The database connection Section </h3>

This section is defined by administrator in the main.cfg and refered
in dbuser as mentionned in the previous section. It should contains at
a minimum:

 * ```host```: the hostname / ip address / socket to connect the database
 * ```schema```: the schema used to store the mapmint tables
 * ```port```: the port number to connect the database
 * ```dbname```: the database name
 * ```user```: the user to connect the database
 * ```password```: the password to connect the database 


<h3>The [oo] Section</h3>

This section is specific to the LibreOffice parameters and contains:

 * ```path```: the full path to the ```python``` binary available in your
   libreoffice distribution
 * ```ghostscript```: the full path to the ```gs``` binary
 * ```external```: can take the value ```true``` or ```false``` to define if the UNO
   python module is available only from an external python interpreter
   (different from the version used ot build the ZOO-Kernel against)


<h3>The [navbar] Section</h3>

This section is specific to buttons available in the main MapMint
toolbara and contains:

 * ```name```: list of names of each available button / capability
 * ```id```: list of HTML id used to display buttton
 * ```icon```: list of icons to use to display buttons
 * ```idX```: buttton which don't require to be activated
 * ```idXX```: button which should not be displayed
 * ```idF```: list the javascript functions to call when a button from idXX
   is pressed

<h3>The [othertools] Section</h3>

This section is specific to what is called other tools in the
publisher of the MapMint administration UI, it contains:

 * ```idso```: id of overview map module to distingish it from other
 * ```idsl```: List of optional tabs in the Add layer pannel
 * ```ids```: list of all available
 * ```idt```: a list of the HTML div id containing the pannel
 * ```idc```: a list of the prefix used for the ```-toogler``` class set to
   the button
 * ```idb```: the name of modules from ids which require to have a button in
   the second toolbar
 * ```names```: the name to display in the Publisher select and in the
   published application


