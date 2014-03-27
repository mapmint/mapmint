/*global OpenLayers, $, MMMap */

/* 
* @requires Lang.en.js
*/ 

(function ()
{
    /**
    * Before creating the MMMap namespace, check to see if
    * MMMap.singleFile is true.  This occurs if the
    * MMMap/SingleFile.js script is included before this one - as is the
    * case with single file builds.
    */
    var singleFile = (typeof MMMap === "object" && MMMap.singleFile);

    /**
    * Cache for the script location returned from
    * MMMap._getScriptLocation
    */
    var scriptLocation;

    /**
    * Namespace: MMMap
    * The MMMap object provides a namespace for all things MMMap
    */
    window.MMMap = {

        singleFile: singleFile,
        /**
        * Property: _scriptName
        * {String} Relative path of this script.
        */
        _scriptName: (!singleFile) ? "mmlib/MMMap.js" : "MMMap.js",

        /**
        * Function: _getScriptLocation
        * Return the path to this script.
        *
        * Returns:
        * {String} Path to this script
        */
        _getScriptLocation: function ()
        {
            if (scriptLocation)
            {
                return scriptLocation;
            }
            scriptLocation = "";
            var isMMMap = new RegExp("(^|(.*?\\/))(" + MMMap._scriptName + ")(\\?|$)", "i");
            var isMMMapMin = new RegExp("(^|(.*?\\/))(MMMap.min.js)(\\?|$)", "i");
            var isMMMapNojQuery = new RegExp("(^|(.*?\\/))(MMMap-nojq.js)(\\?|$)", "i");
            var isMMMapNojQueryMin = new RegExp("(^|(.*?\\/))(MMMap-nojq.min.js)(\\?|$)", "i");
            var tests = [isMMMap, isMMMapMin, isMMMapNojQuery, isMMMapNojQueryMin];
            var scripts = document.getElementsByTagName('script');
            for (var i = 0, len = scripts.length; i < len; i++)
            {
                var src = scripts[i].getAttribute('src');
                if (src)
                {
                    for (var j = 0; j < tests.length; j++)
                    {
                        var match = src.match(tests[j]);
                        if (match)
                        {
                            // convert match[1] to absolute url. 
                            // fixes bug with cooperation between SGManager and SGWP. 
                            // Manager uses relative url, and thus all default images in layer styles start with this relative url
                            // Then when I use this url in SGWP it fails since relative location is not good anymore.
                            var a = document.createElement('a');
                            a.href = match[1]; ;
                            scriptLocation = a.href;
                            return scriptLocation;
                        }
                    }
                }
            }
            return scriptLocation;
        },
        getImagesLocation: function ()
        {
            return MMMap._getScriptLocation() + "images/";
        },
        appendCss: function (css)
        {
            var cssNode = document.createElement('link');
            cssNode.type = 'text/css';
            cssNode.rel = 'stylesheet';
            cssNode.href = css;
            cssNode.media = 'screen';
            document.getElementsByTagName("head")[0].appendChild(cssNode);
        }
    };
    // register favicon if missing:
    var links = document.getElementsByTagName('link');
    var shortcutIconRegistered = false;
    for (var i = 0, len = links.length; i < len; i++)
    {
        var rel = links[i].getAttribute('rel');
        if (rel == "shortcut icon")
        {
            shortcutIconRegistered = true;
            break;
        }
    }
    if (!shortcutIconRegistered)
    {
        document.write("<link rel='shortcut icon' href='" + MMMap.getImagesLocation() + "sgmap.ico' />");
    }

    /**
    * MMMap.singleFile is a flag indicating this file is being included
    * in a Single File Library build of the MMMap Library.
    * 
    * When we are *not* part of a SFL build we dynamically include the
    * MMMap library code.
    * 
    * When we *are* part of a SFL build we do not dynamically include the 
    * MMMap library code as it will be appended at the end of this file.
    */
    var agent = navigator.userAgent;
    if (!singleFile)
    {
        var jsfiles = [
        ]; // etc.
        if (window.jQuery)
        {
            // remove jquery
            jsfiles.shift();
        }
        var css = [
            /*"../jquery-ui-1.8.17.custom.css",
            "../MMMap.css",
            "../scalebar-thin.css",
            "../sgstatusbar.css",*/
            "../MMPanZoom.css"/*,
            "../SGToolBar.css",
            "../SGLayerSwitcher.css",
            "../SGCatalogClient.css"*/
        ];

        var scriptTags = new Array(jsfiles.length);
        var host = MMMap._getScriptLocation() + "sglib/";
        for (var i = 0, len = jsfiles.length; i < len; i++)
        {
            scriptTags[i] = "<script src='" + host + jsfiles[i] +
                               "'></script>";
        }
        if (scriptTags.length > 0)
        {
            document.write(scriptTags.join(""));
        }
        for (var i = 0; i < css.length; i++)
        {
            MMMap.appendCss(host + css[i]);
        }
    }
    else
    {
        MMMap.appendCss(MMMap._getScriptLocation() + "sgmap.min.css");
    }

    // fix custom cursors fo ie. When resolving custom cursors IE uses current html as base and not css. so I can not define custom cursors in css
    // and since they wil be defined at page level anyway, they must be page related for all browsers
    var grabCursor = "url('" + MMMap.getImagesLocation() + "grab.cur'),default";
    var grabbingCursor = "url('" + MMMap.getImagesLocation() + "grabbing.cur'),default";
    var deleteCursor = "url('" + MMMap.getImagesLocation() + "cursor_d.cur'),default";
    var css = ".olDragDown {cursor: " + grabbingCursor + ";} .olControlDragFeatureActive.olControlDragFeatureOver.olDragDown {cursor: " + grabbingCursor + ";} div.cursorNavigation{cursor: " + grabCursor + ";}div.cursorDelete{cursor: " + deleteCursor + ";}"
    var style = document.createElement("style");
    style.setAttribute("type", "text/css");
    if (style.styleSheet)
    {   // for IE
        style.styleSheet.cssText = css;
    }
    else
    {                // others
        var textnode = document.createTextNode(css);
        style.appendChild(textnode);
    }
    document.getElementsByTagName("head")[0].appendChild(style);
})();

/**
* Constant: VERSION_NUMBER
*/
MMMap.VERSION_NUMBER = "MMMap 1.0.0.12 -- Beta version";
var urlParams = OpenLayers.Util.getParameters();
if (urlParams.hasOwnProperty("MMMap.Version"))
{
    alert(MMMap.VERSION_NUMBER);
}

MMMap.isMobile = (function(ua)
{
    var b = new RegExp("android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino", "im");
    var v = new RegExp("1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-", "im");
    if (ua.match(b) || ua.substring(0, 4).match(v))
        return true;
    return false;
})(navigator.userAgent.toLowerCase());

/*
MMMap.supportsAnimatedResize = (function()
{
    var result = MMMap.isMobile == false;

    // no jQuery is loaded, assume this is multi-file version running from my dev computer, so ff4+
    if (window.jQuery)
    {
        result = result && (
                ($.browser.msie == true && $.browser.version >= 9) || // IE9+
                (navigator.userAgent.toLowerCase().indexOf('chrome') != -1) || // assume chrome is latest version
                ($.browser.mozilla == true && $.browser.version >= 2) // ff4+
            );
    }
    return result;
})();
*/
MMMap.mobile = function ()
{
    MMMap.isMobile = true;
    MMMap.supportsAnimatedResize = false;
    if (window.location.hash && window.location.hash != '')
    {
        window.location.hash = "";
    }
    if ($.mobile)
    {
        MMMap.mobileInit();
    }
    else
    {
        $(window.document).one('mobileinit', function (event)
        {
            MMMap.mobileInit();
        });
    }
    MMMap.mobile = function () { };
};

MMMap.mobileInit = function ()
{
    $.mobile.autoInitializePage = false;
    // the animation is very bad on galaxy tab, so better to just disable it.
    // may be enable on iOS?
    $.mobile.defaultPageTransition = "none";
    //    var theme = "a";
    //    $.mobile.page.prototype.options.backBtnTheme = theme;
    //    $.mobile.page.prototype.options.headerTheme = theme;
    //    $.mobile.page.prototype.options.footerTheme = theme;
    //    $.mobile.page.prototype.options.contentTheme = theme;
    //    $.mobile.listview.prototype.options.filterTheme = theme;
    //    $.mobile.page.prototype.options.theme = theme;
    // when running on iPad as web-app-capable it hides safari chrome, including back button.
    // and iPad does not have hardware back button. this should bring it back.
    // Arik asked to return the button for all platforms
    $.mobile.page.prototype.options.addBackBtn = true; // window.navigator.standalone;
    // From http://jquerymobile.com/test/docs/api/events.html.
    // The timing of the orientationchange with relation to the change of the client height and width is different between browsers,
    // if you need width/height, disable orientationChange and use fallback resize event
    $.mobile.orientationChangeEnabled = false;
}

if (MMMap.isMobile)
{
    MMMap.mobile();
}


/*
Freeze 12:
moved to OL 2.11RC.
Changes in base classes:
1. modified XYZ to pass jsmin

Freeze 11:
Added mobile support

Freeze 10:
Adding new base map makes it current base map
Fixed a bug with zooms in ie7/ie8 comp mode in small windows

Freeze 9:
Added catalog client.
Hide all non-base layers on zoom operations
Added animated zoom (test transparent layers using http://demo.cubewerx.com/demo/cubeserv/cubeserv.cgi layer Foundation.COASTL_1M)
Zoom target

Freeze 8.5:
Fixed reading of layers created with VectorSVC - parsing of non-standart WFS xml responses.
Removed defaults from WFSLayer and WFS Streaming strategy on requestZoomLevel, since they where interfering with user-set visibleZoomLevel
*/