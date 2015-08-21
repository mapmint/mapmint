define([
], function() {
    
    
    // parseUri 1.2.2
    // (c) Steven Levithan <stevenlevithan.com>
    // MIT License

    function parseUri (str) {
    	var	o   = parseUri.options,
    		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
    		uri = {},
    		i   = 14;

    	while (i--) uri[o.key[i]] = m[i] || "";

    	uri[o.q.name] = {};
    	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    		if ($1) uri[o.q.name][$1] = $2;
    	});

    	return uri;
    };

    parseUri.options = {
    	strictMode: false,
    	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    	q:   {
    		name:   "queryKey",
    		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    	},
    	parser: {
    		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    	}
    };
    
    
    //
    function xmlToString(data) {
        //data.xml check for IE
        var xmlstr = data.xml ? data.xml : (new XMLSerializer()).serializeToString(data);
        return xmlstr;
    }

    function equalsString(a, b) {
    	if (!a) {
    		return false;
    	}

    	if (!b) {
    		return false;
    	}

    	return jQuery.trim(a).localeCompare(jQuery.trim(b)) == 0;
    }

    function encodeXML(str) {
        return str.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&apos;');
    };
    
    return {
        parseUri: parseUri,
        xmlToString: xmlToString,
        equalsString: equalsString,
        encodeXML: encodeXML,
    };
    
    
});