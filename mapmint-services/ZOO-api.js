/**
 * Author : René-Luc D'Hont
 *
 * Copyright 2010 3liz SARL. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/* Copyright (c) 2006-2011 by OpenLayers Contributors (see 
 * https://github.com/openlayers/openlayers/blob/master/authors.txt for full 
 * list of contributors). Published under the Clear BSD license.
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. 
 */

/**
 * Class: ZOO
 */
ZOO = {
  /**
   * Constant: SERVICE_ACCEPTED
   * {Integer} used for
   */
  SERVICE_ACCEPTED: 0,
  /**
   * Constant: SERVICE_STARTED
   * {Integer} used for
   */
  SERVICE_STARTED: 1,
  /**
   * Constant: SERVICE_PAUSED
   * {Integer} used for
   */
  SERVICE_PAUSED: 2,
  /**
   * Constant: SERVICE_SUCCEEDED
   * {Integer} used for
   */
  SERVICE_SUCCEEDED: 3,
  /**
   * Constant: SERVICE_FAILED
   * {Integer} used for
   */
  SERVICE_FAILED: 4,
  /** 
   * Function: removeItem
   * Remove an object from an array. Iterates through the array
   *     to find the item, then removes it.
   *
   * Parameters:
   * array - {Array}
   * item - {Object}
   * 
   * Return
   * {Array} A reference to the array
   */
  removeItem: function(array, item) {
    for(var i = array.length - 1; i >= 0; i--) {
        if(array[i] == item) {
            array.splice(i,1);
        }
    }
    return array;
  },
  /** 
   * Function: indexOf
   * 
   * Parameters:
   * array - {Array}
   * obj - {Object}
   * 
   * Returns:
   * {Integer} The index at, which the first object was found in the array.
   *           If not found, returns -1.
   */
  indexOf: function(array, obj) {
    for(var i=0, len=array.length; i<len; i++) {
      if (array[i] == obj)
        return i;
    }
    return -1;   
  },
  /**
   * Function: extend
   * Copy all properties of a source object to a destination object. Modifies
   *     the passed in destination object.  Any properties on the source object
   *     that are set to undefined will not be (re)set on the destination object.
   *
   * Parameters:
   * destination - {Object} The object that will be modified
   * source - {Object} The object with properties to be set on the destination
   *
   * Returns:
   * {Object} The destination object.
   */
  extend: function(destination, source) {
    destination = destination || {};
    if(source) {
      for(var property in source) {
        var value = source[property];
        if(value !== undefined)
          destination[property] = value;
      }
    }
    return destination;
  },
  /**
   * Function: rad
   * 
   * Parameters:
   * x - {Float}
   * 
   * Returns:
   * {Float}
   */
  rad: function(x) {return x*Math.PI/180;},
  /**
   * Function: distVincenty
   * Given two objects representing points with geographic coordinates, this
   *     calculates the distance between those points on the surface of an
   *     ellipsoid.
   * 
   * Parameters:
   * p1 - {<ZOO.Geometry.Point>} (or any object with both .x, .y properties)
   * p2 - {<ZOO.Geometry.Point>} (or any object with both .x, .y properties)
   * 
   * Returns:
   * {Float} The distance (in km) between the two input points as measured on an
   *     ellipsoid.  Note that the input point objects must be in geographic
   *     coordinates (decimal degrees) and the return distance is in kilometers.
   */
  distVincenty: function(p1, p2) {
    var a = 6378137, b = 6356752.3142,  f = 1/298.257223563;
    var L = ZOO.rad(p2.x - p1.y);
    var U1 = Math.atan((1-f) * Math.tan(ZOO.rad(p1.y)));
    var U2 = Math.atan((1-f) * Math.tan(ZOO.rad(p2.y)));
    var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    var lambda = L, lambdaP = 2*Math.PI;
    var iterLimit = 20;
    while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit>0) {
        var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
        var sinSigma = Math.sqrt((cosU2*sinLambda) * (cosU2*sinLambda) +
        (cosU1*sinU2-sinU1*cosU2*cosLambda) * (cosU1*sinU2-sinU1*cosU2*cosLambda));
        if (sinSigma==0) {
            return 0;  // co-incident points
        }
        var cosSigma = sinU1*sinU2 + cosU1*cosU2*cosLambda;
        var sigma = Math.atan2(sinSigma, cosSigma);
        var alpha = Math.asin(cosU1 * cosU2 * sinLambda / sinSigma);
        var cosSqAlpha = Math.cos(alpha) * Math.cos(alpha);
        var cos2SigmaM = cosSigma - 2*sinU1*sinU2/cosSqAlpha;
        var C = f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1-C) * f * Math.sin(alpha) *
        (sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
    }
    if (iterLimit==0) {
        return NaN;  // formula failed to converge
    }
    var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
    var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
    var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
    var deltaSigma = B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-
        B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
    var s = b*A*(sigma-deltaSigma);
    var d = s.toFixed(3)/1000; // round to 1mm precision
    return d;
  },
  /**
   * Function: Class
   * Method used to create ZOO classes. Includes support for
   *     multiple inheritance.
   */
  Class: function() {
    var Class = function() {
      this.initialize.apply(this, arguments);
    };
    var extended = {};
    var parent;
    for(var i=0; i<arguments.length; ++i) {
      if(typeof arguments[i] == "function") {
        // get the prototype of the superclass
        parent = arguments[i].prototype;
      } else {
        // in this case we're extending with the prototype
        parent = arguments[i];
      }
      ZOO.extend(extended, parent);
    }
    Class.prototype = extended;

    return Class;
  },
  /**
   * Function: UpdateStatus
   * Method used to update the status of the process
   *
   * Parameters:
   * env - {Object} The environment object
   * value - {Float} the status value between 0 to 100
   */
  UpdateStatus: function(env,value) {
    return ZOOUpdateStatus(env,value);
  }
};

/**
 * Class: ZOO.String
 * Contains convenience methods for string manipulation
 */
ZOO.String = {
  /**
   * Function: startsWith
   * Test whether a string starts with another string. 
   * 
   * Parameters:
   * str - {String} The string to test.
   * sub - {Sring} The substring to look for.
   *  
   * Returns:
   * {Boolean} The first string starts with the second.
   */
  startsWith: function(str, sub) {
    return (str.indexOf(sub) == 0);
  },
  /**
   * Function: contains
   * Test whether a string contains another string.
   * 
   * Parameters:
   * str - {String} The string to test.
   * sub - {String} The substring to look for.
   * 
   * Returns:
   * {Boolean} The first string contains the second.
   */
  contains: function(str, sub) {
    return (str.indexOf(sub) != -1);
  },
  /**
   * Function: trim
   * Removes leading and trailing whitespace characters from a string.
   * 
   * Parameters:
   * str - {String} The (potentially) space padded string.  This string is not
   *     modified.
   * 
   * Returns:
   * {String} A trimmed version of the string with all leading and 
   *     trailing spaces removed.
   */
  trim: function(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  },
  /**
   * Function: camelize
   * Camel-case a hyphenated string. 
   *     Ex. "chicken-head" becomes "chickenHead", and
   *     "-chicken-head" becomes "ChickenHead".
   *
   * Parameters:
   * str - {String} The string to be camelized.  The original is not modified.
   * 
   * Returns:
   * {String} The string, camelized
   *
   */
  camelize: function(str) {
    var oStringList = str.split('-');
    var camelizedString = oStringList[0];
    for (var i=1, len=oStringList.length; i<len; i++) {
      var s = oStringList[i];
      camelizedString += s.charAt(0).toUpperCase() + s.substring(1);
    }
    return camelizedString;
  },
  /**
   * Property: tokenRegEx
   * Used to find tokens in a string.
   * Examples: ${a}, ${a.b.c}, ${a-b}, ${5}
   */
  tokenRegEx:  /\$\{([\w.]+?)\}/g,
  /**
   * Property: numberRegEx
   * Used to test strings as numbers.
   */
  numberRegEx: /^([+-]?)(?=\d|\.\d)\d*(\.\d*)?([Ee]([+-]?\d+))?$/,
  /**
   * Function: isNumeric
   * Determine whether a string contains only a numeric value.
   *
   * Examples:
   * (code)
   * ZOO.String.isNumeric("6.02e23") // true
   * ZOO.String.isNumeric("12 dozen") // false
   * ZOO.String.isNumeric("4") // true
   * ZOO.String.isNumeric(" 4 ") // false
   * (end)
   *
   * Returns:
   * {Boolean} String contains only a number.
   */
  isNumeric: function(value) {
    return ZOO.String.numberRegEx.test(value);
  },
  /**
   * Function: numericIf
   * Converts a string that appears to be a numeric value into a number.
   * 
   * Returns
   * {Number|String} a Number if the passed value is a number, a String
   *     otherwise. 
   */
  numericIf: function(value) {
    return ZOO.String.isNumeric(value) ? parseFloat(value) : value;
  }
};

/**
 * Class: ZOO.Class
 * Object for creating CLASS
 */
ZOO.Class = function() {
  var len = arguments.length;
  var P = arguments[0];
  var F = arguments[len-1];
  var C = typeof F.initialize == "function" ?
    F.initialize :
    function(){ P.prototype.initialize.apply(this, arguments); };

  if (len > 1) {
    var newArgs = [C, P].concat(
          Array.prototype.slice.call(arguments).slice(1, len-1), F);
    ZOO.inherit.apply(null, newArgs);
  } else {
    C.prototype = F;
  }
  return C;
};
/**
 * Function: create
 * Function for creating CLASS
 */
ZOO.Class.create = function() {
  return function() {
    if (arguments && arguments[0] != ZOO.Class.isPrototype) {
      this.initialize.apply(this, arguments);
    }
  };
};
/**
 * Function: inherit
 * Function for inheriting CLASS
 */
ZOO.Class.inherit = function (P) {
  var C = function() {
   P.call(this);
  };
  var newArgs = [C].concat(Array.prototype.slice.call(arguments));
  ZOO.inherit.apply(null, newArgs);
  return C.prototype;
};
/**
 * Function: inherit
 * Function for inheriting CLASS
 */
ZOO.inherit = function(C, P) {
  var F = function() {};
  F.prototype = P.prototype;
  C.prototype = new F;
  var i, l, o;
  for(i=2, l=arguments.length; i<l; i++) {
    o = arguments[i];
    if(typeof o === "function") {
      o = o.prototype;
    }
    ZOO.Util.extend(C.prototype, o);
  }
};
/**
 * Class: ZOO.Util
 * Object for utilities
 */
ZOO.Util = ZOO.Util || {};
/**
 * Function: extend
 * Function for extending object
 */
ZOO.Util.extend = function(destination, source) {
  destination = destination || {};
  if (source) {
    for (var property in source) {
      var value = source[property];
      if (value !== undefined) {
        destination[property] = value;
      }
    }
  }
  return destination;
};

ZOO._=function(str){
    return ZOOTranslate(str);
};

/**
 * Class: ZOO.Request
 * Contains convenience methods for working with ZOORequest which
 *     replace XMLHttpRequest. Because of we are not in a browser
 *     JavaScript environment, ZOO Project provides a method to 
 *     query servers which is based on curl : ZOORequest.
 */
ZOO.Request = {
  /**
   * Function: GET
   * Send an HTTP GET request.
   *
   * Parameters:
   * url - {String} The URL to request.
   * params - {Object} Params to add to the url
   * 
   * Returns:
   * {String} Request result.
   */
  Get: function(url,params) {
    var paramsArray = [];
    for (var key in params) {
      var value = params[key];
      if ((value != null) && (typeof value != 'function')) {
        var encodedValue;
        if (typeof value == 'object' && value.constructor == Array) {
          /* value is an array; encode items and separate with "," */
          var encodedItemArray = [];
          for (var itemIndex=0, len=value.length; itemIndex<len; itemIndex++) {
            encodedItemArray.push(encodeURIComponent(value[itemIndex]));
          }
          encodedValue = encodedItemArray.join(",");
        }
        else {
          /* value is a string; simply encode */
          encodedValue = encodeURIComponent(value);
        }
        paramsArray.push(encodeURIComponent(key) + "=" + encodedValue);
      }
    }
    var paramString = paramsArray.join("&");
    if(paramString.length > 0) {
      var separator = (url.indexOf('?') > -1) ? '&' : '?';
      url += separator + paramString;
    }
    return ZOORequest('GET',url);
  },
  /**
   * Function: POST
   * Send an HTTP POST request.
   *
   * Parameters:
   * url - {String} The URL to request.
   * body - {String} The request's body to send.
   * headers - {Object} A key-value object of headers to push to
   *     the request's head
   * 
   * Returns:
   * {String} Request result.
   */
  Post: function(url,body,headers) {
    if(!(headers instanceof Array)) {
      var headersArray = [];
      for (var name in headers) {
        headersArray.push(name+': '+headers[name]); 
      }
      headers = headersArray;
    }
    return ZOORequest('POST',url,body,headers);
  }
};

/**
 * Class: ZOO.Bounds
 * Instances of this class represent bounding boxes.  Data stored as left,
 *     bottom, right, top floats. All values are initialized to null,
 *     however, you should make sure you set them before using the bounds
 *     for anything.
 */
ZOO.Bounds = ZOO.Class({
  /**
   * Property: left
   * {Number} Minimum horizontal coordinate.
   */
  left: null,
  /**
   * Property: bottom
   * {Number} Minimum vertical coordinate.
   */
  bottom: null,
  /**
   * Property: right
   * {Number} Maximum horizontal coordinate.
   */
  right: null,
  /**
   * Property: top
   * {Number} Maximum vertical coordinate.
   */
  top: null,
  /**
   * Constructor: ZOO.Bounds
   * Construct a new bounds object.
   *
   * Parameters:
   * left - {Number} The left bounds of the box.  Note that for width
   *        calculations, this is assumed to be less than the right value.
   * bottom - {Number} The bottom bounds of the box.  Note that for height
   *          calculations, this is assumed to be more than the top value.
   * right - {Number} The right bounds.
   * top - {Number} The top bounds.
   */
  initialize: function(left, bottom, right, top) {
    if (left != null)
      this.left = parseFloat(left);
    if (bottom != null)
      this.bottom = parseFloat(bottom);
    if (right != null)
      this.right = parseFloat(right);
    if (top != null)
      this.top = parseFloat(top);
  },
  /**
   * Method: clone
   * Create a cloned instance of this bounds.
   *
   * Returns:
   * {<ZOO.Bounds>} A fresh copy of the bounds
   */
  clone:function() {
    return new ZOO.Bounds(this.left, this.bottom, 
                          this.right, this.top);
  },
  /**
   * Method: equals
   * Test a two bounds for equivalence.
   *
   * Parameters:
   * bounds - {<ZOO.Bounds>}
   *
   * Returns:
   * {Boolean} The passed-in bounds object has the same left,
   *           right, top, bottom components as this.  Note that if bounds 
   *           passed in is null, returns false.
   */
  equals:function(bounds) {
    var equals = false;
    if (bounds != null)
        equals = ((this.left == bounds.left) && 
                  (this.right == bounds.right) &&
                  (this.top == bounds.top) && 
                  (this.bottom == bounds.bottom));
    return equals;
  },
  /** 
   * Method: toString
   * 
   * Returns:
   * {String} String representation of bounds object. 
   *          (ex.<i>"left-bottom=(5,42) right-top=(10,45)"</i>)
   */
  toString:function() {
    return ( "left-bottom=(" + this.left + "," + this.bottom + ")"
              + " right-top=(" + this.right + "," + this.top + ")" );
  },
  /**
   * APIMethod: toArray
   *
   * Returns:
   * {Array} array of left, bottom, right, top
   */
  toArray: function() {
    return [this.left, this.bottom, this.right, this.top];
  },
  /** 
   * Method: toBBOX
   * 
   * Parameters:
   * decimal - {Integer} How many significant digits in the bbox coords?
   *                     Default is 6
   * 
   * Returns:
   * {String} Simple String representation of bounds object.
   *          (ex. <i>"5,42,10,45"</i>)
   */
  toBBOX:function(decimal) {
    if (decimal== null)
      decimal = 6; 
    var mult = Math.pow(10, decimal);
    var bbox = Math.round(this.left * mult) / mult + "," + 
               Math.round(this.bottom * mult) / mult + "," + 
               Math.round(this.right * mult) / mult + "," + 
               Math.round(this.top * mult) / mult;
    return bbox;
  },
  /**
   * Method: toGeometry
   * Create a new polygon geometry based on this bounds.
   *
   * Returns:
   * {<ZOO.Geometry.Polygon>} A new polygon with the coordinates
   *     of this bounds.
   */
  toGeometry: function() {
    return new ZOO.Geometry.Polygon([
      new ZOO.Geometry.LinearRing([
        new ZOO.Geometry.Point(this.left, this.bottom),
        new ZOO.Geometry.Point(this.right, this.bottom),
        new ZOO.Geometry.Point(this.right, this.top),
        new ZOO.Geometry.Point(this.left, this.top)
      ])
    ]);
  },
  /**
   * Method: getWidth
   * 
   * Returns:
   * {Float} The width of the bounds
   */
  getWidth:function() {
    return (this.right - this.left);
  },
  /**
   * Method: getHeight
   * 
   * Returns:
   * {Float} The height of the bounds (top minus bottom).
   */
  getHeight:function() {
    return (this.top - this.bottom);
  },
  /**
   * Method: add
   * 
   * Parameters:
   * x - {Float}
   * y - {Float}
   * 
   * Returns:
   * {<ZOO.Bounds>} A new bounds whose coordinates are the same as
   *     this, but shifted by the passed-in x and y values.
   */
  add:function(x, y) {
    if ( (x == null) || (y == null) )
      return null;
    return new ZOO.Bounds(this.left + x, this.bottom + y,
                                 this.right + x, this.top + y);
  },
  /**
   * Method: extend
   * Extend the bounds to include the point, lonlat, or bounds specified.
   *     Note, this function assumes that left < right and bottom < top.
   * 
   * Parameters: 
   * object - {Object} Can be Point, or Bounds
   */
  extend:function(object) {
    var bounds = null;
    if (object) {
      // clear cached center location
      switch(object.CLASS_NAME) {
        case "ZOO.Geometry.Point":
          bounds = new ZOO.Bounds(object.x, object.y,
                                         object.x, object.y);
          break;
        case "ZOO.Bounds":    
          bounds = object;
          break;
      }
      if (bounds) {
        if ( (this.left == null) || (bounds.left < this.left))
          this.left = bounds.left;
        if ( (this.bottom == null) || (bounds.bottom < this.bottom) )
          this.bottom = bounds.bottom;
        if ( (this.right == null) || (bounds.right > this.right) )
          this.right = bounds.right;
        if ( (this.top == null) || (bounds.top > this.top) )
          this.top = bounds.top;
      }
    }
  },
  /**
   * APIMethod: contains
   * 
   * Parameters:
   * x - {Float}
   * y - {Float}
   * inclusive - {Boolean} Whether or not to include the border.
   *     Default is true.
   *
   * Returns:
   * {Boolean} Whether or not the passed-in coordinates are within this
   *     bounds.
   */
  contains:function(x, y, inclusive) {
     //set default
     if (inclusive == null)
       inclusive = true;
     if (x == null || y == null)
       return false;
     x = parseFloat(x);
     y = parseFloat(y);

     var contains = false;
     if (inclusive)
       contains = ((x >= this.left) && (x <= this.right) && 
                   (y >= this.bottom) && (y <= this.top));
     else
       contains = ((x > this.left) && (x < this.right) && 
                   (y > this.bottom) && (y < this.top));
     return contains;
  },
  /**
   * Method: intersectsBounds
   * Determine whether the target bounds intersects this bounds.  Bounds are
   *     considered intersecting if any of their edges intersect or if one
   *     bounds contains the other.
   * 
   * Parameters:
   * bounds - {<ZOO.Bounds>} The target bounds.
   * inclusive - {Boolean} Treat coincident borders as intersecting.  Default
   *     is true.  If false, bounds that do not overlap but only touch at the
   *     border will not be considered as intersecting.
   *
   * Returns:
   * {Boolean} The passed-in bounds object intersects this bounds.
   */
  intersectsBounds:function(bounds, inclusive) {
    if (inclusive == null)
      inclusive = true;
    var intersects = false;
    var mightTouch = (
        this.left == bounds.right ||
        this.right == bounds.left ||
        this.top == bounds.bottom ||
        this.bottom == bounds.top
    );
    if (inclusive || !mightTouch) {
      var inBottom = (
          ((bounds.bottom >= this.bottom) && (bounds.bottom <= this.top)) ||
          ((this.bottom >= bounds.bottom) && (this.bottom <= bounds.top))
          );
      var inTop = (
          ((bounds.top >= this.bottom) && (bounds.top <= this.top)) ||
          ((this.top > bounds.bottom) && (this.top < bounds.top))
          );
      var inLeft = (
          ((bounds.left >= this.left) && (bounds.left <= this.right)) ||
          ((this.left >= bounds.left) && (this.left <= bounds.right))
          );
      var inRight = (
          ((bounds.right >= this.left) && (bounds.right <= this.right)) ||
          ((this.right >= bounds.left) && (this.right <= bounds.right))
          );
      intersects = ((inBottom || inTop) && (inLeft || inRight));
    }
    return intersects;
  },
  /**
   * Method: containsBounds
   * Determine whether the target bounds is contained within this bounds.
   * 
   * bounds - {<ZOO.Bounds>} The target bounds.
   * partial - {Boolean} If any of the target corners is within this bounds
   *     consider the bounds contained.  Default is false.  If true, the
   *     entire target bounds must be contained within this bounds.
   * inclusive - {Boolean} Treat shared edges as contained.  Default is
   *     true.
   *
   * Returns:
   * {Boolean} The passed-in bounds object is contained within this bounds. 
   */
  containsBounds:function(bounds, partial, inclusive) {
    if (partial == null)
      partial = false;
    if (inclusive == null)
      inclusive = true;
    var bottomLeft  = this.contains(bounds.left, bounds.bottom, inclusive);
    var bottomRight = this.contains(bounds.right, bounds.bottom, inclusive);
    var topLeft  = this.contains(bounds.left, bounds.top, inclusive);
    var topRight = this.contains(bounds.right, bounds.top, inclusive);
    return (partial) ? (bottomLeft || bottomRight || topLeft || topRight)
                     : (bottomLeft && bottomRight && topLeft && topRight);
  },
  CLASS_NAME: 'ZOO.Bounds'
});

/**
 * Class: ZOO.Projection
 * Class for coordinate transforms between coordinate systems.
 *     Depends on the zoo-proj4js library. zoo-proj4js library 
 *     is loaded by the ZOO Kernel with zoo-api.
 */
ZOO.Projection = ZOO.Class({
  /**
   * Property: proj
   * {Object} Proj4js.Proj instance.
   */
  proj: null,
  /**
   * Property: projCode
   * {String}
   */
  projCode: null,
  /**
   * Constructor: ZOO.Projection
   * This class offers several methods for interacting with a wrapped 
   *     zoo-pro4js projection object. 
   *
   * Parameters:
   * projCode - {String} A string identifying the Well Known Identifier for
   *    the projection.
   * options - {Object} An optional object to set additional properties.
   *
   * Returns:
   * {<ZOO.Projection>} A projection object.
   */
  initialize: function(projCode, options) {
    ZOO.extend(this, options);
    this.projCode = projCode;
    if (Proj4js) {
      this.proj = new Proj4js.Proj(projCode);
    }
  },
  /**
   * Method: getCode
   * Get the string SRS code.
   *
   * Returns:
   * {String} The SRS code.
   */
  getCode: function() {
    return this.proj ? this.proj.srsCode : this.projCode;
  },
  /**
   * Method: getUnits
   * Get the units string for the projection -- returns null if 
   *     zoo-proj4js is not available.
   *
   * Returns:
   * {String} The units abbreviation.
   */
  getUnits: function() {
    return this.proj ? this.proj.units : null;
  },
  /**
   * Method: toString
   * Convert projection to string (getCode wrapper).
   *
   * Returns:
   * {String} The projection code.
   */
  toString: function() {
    return this.getCode();
  },
  /**
   * Method: equals
   * Test equality of two projection instances.  Determines equality based
   *     soley on the projection code.
   *
   * Returns:
   * {Boolean} The two projections are equivalent.
   */
  equals: function(projection) {
    if (projection && projection.getCode)
      return this.getCode() == projection.getCode();
    else
      return false;
  },
  /* Method: destroy
   * Destroy projection object.
   */
  destroy: function() {
    this.proj = null;
    this.projCode = null;
  },
  CLASS_NAME: 'ZOO.Projection'
});
/**
 * Method: transform
 * Transform a point coordinate from one projection to another.  Note that
 *     the input point is transformed in place.
 * 
 * Parameters:
 * point - {{ZOO.Geometry.Point> | Object} An object with x and y
 *     properties representing coordinates in those dimensions.
 * sourceProj - {ZOO.Projection} Source map coordinate system
 * destProj - {ZOO.Projection} Destination map coordinate system
 *
 * Returns:
 * point - {object} A transformed coordinate.  The original point is modified.
 */
ZOO.Projection.transform = function(point, source, dest) {
    if (source.proj && dest.proj)
        point = Proj4js.transform(source.proj, dest.proj, point);
    return point;
};

/**
 * Class: ZOO.Format
 * Base class for format reading/writing a variety of formats. Subclasses
 *     of ZOO.Format are expected to have read and write methods.
 */
ZOO.Format = ZOO.Class({
  /**
   * Property: options
   * {Object} A reference to options passed to the constructor.
   */
  options:null,
  /**
   * Property: externalProjection
   * {<ZOO.Projection>} When passed a externalProjection and
   *     internalProjection, the format will reproject the geometries it
   *     reads or writes. The externalProjection is the projection used by
   *     the content which is passed into read or which comes out of write.
   *     In order to reproject, a projection transformation function for the
   *     specified projections must be available. This support is provided 
   *     via zoo-proj4js.
   */
  externalProjection: null,
  /**
   * Property: internalProjection
   * {<ZOO.Projection>} When passed a externalProjection and
   *     internalProjection, the format will reproject the geometries it
   *     reads or writes. The internalProjection is the projection used by
   *     the geometries which are returned by read or which are passed into
   *     write.  In order to reproject, a projection transformation function
   *     for the specified projections must be available. This support is 
   *     provided via zoo-proj4js.
   */
  internalProjection: null,
  /**
   * Property: data
   * {Object} When <keepData> is true, this is the parsed string sent to
   *     <read>.
   */
  data: null,
  /**
   * Property: keepData
   * {Object} Maintain a reference (<data>) to the most recently read data.
   *     Default is false.
   */
  keepData: false,
  /**
   * Constructor: ZOO.Format
   * Instances of this class are not useful.  See one of the subclasses.
   *
   * Parameters:
   * options - {Object} An optional object with properties to set on the
   *           format
   *
   * Valid options:
   * keepData - {Boolean} If true, upon <read>, the data property will be
   *     set to the parsed object (e.g. the json or xml object).
   *
   * Returns:
   * An instance of ZOO.Format
   */
  initialize: function(options) {
    ZOO.extend(this, options);
    this.options = options;
  },
  /**
   * Method: destroy
   * Clean up.
   */
  destroy: function() {
  },
  /**
   * Method: read
   * Read data from a string, and return an object whose type depends on the
   * subclass. 
   * 
   * Parameters:
   * data - {string} Data to read/parse.
   *
   * Returns:
   * Depends on the subclass
   */
  read: function(data) {
  },
  /**
   * Method: write
   * Accept an object, and return a string. 
   *
   * Parameters:
   * object - {Object} Object to be serialized
   *
   * Returns:
   * {String} A string representation of the object.
   */
  write: function(data) {
  },
  CLASS_NAME: 'ZOO.Format'
});
/**
 * Class: ZOO.Format.WKT
 * Class for reading and writing Well-Known Text. Create a new instance
 * with the <ZOO.Format.WKT> constructor.
 * 
 * Inherits from:
 *  - <ZOO.Format>
 */
ZOO.Format.WKT = ZOO.Class(ZOO.Format, {
  /**
   * Constructor: ZOO.Format.WKT
   * Create a new parser for WKT
   *
   * Parameters:
   * options - {Object} An optional object whose properties will be set on
   *           this instance
   *
   * Returns:
   * {<ZOO.Format.WKT>} A new WKT parser.
   */
  initialize: function(options) {
    this.regExes = {
      'typeStr': /^\s*(\w+)\s*\(\s*(.*)\s*\)\s*$/,
      'spaces': /\s+/,
      'parenComma': /\)\s*,\s*\(/,
      'doubleParenComma': /\)\s*\)\s*,\s*\(\s*\(/,  // can't use {2} here
      'trimParens': /^\s*\(?(.*?)\)?\s*$/
    };
    ZOO.Format.prototype.initialize.apply(this, [options]);
  },
  /**
   * Method: read
   * Deserialize a WKT string and return a vector feature or an
   *     array of vector features.  Supports WKT for POINT, 
   *     MULTIPOINT, LINESTRING, MULTILINESTRING, POLYGON, 
   *     MULTIPOLYGON, and GEOMETRYCOLLECTION.
   *
   * Parameters:
   * wkt - {String} A WKT string
   *
   * Returns:
   * {<ZOO.Feature.Vector>|Array} A feature or array of features for
   *     GEOMETRYCOLLECTION WKT.
   */
  read: function(wkt) {
    var features, type, str;
    var matches = this.regExes.typeStr.exec(wkt);
    if(matches) {
      type = matches[1].toLowerCase();
      str = matches[2];
      if(this.parse[type]) {
        features = this.parse[type].apply(this, [str]);
      }
      if (this.internalProjection && this.externalProjection) {
        if (features && 
            features.CLASS_NAME == "ZOO.Feature") {
          features.geometry.transform(this.externalProjection,
                                      this.internalProjection);
        } else if (features &&
            type != "geometrycollection" &&
            typeof features == "object") {
          for (var i=0, len=features.length; i<len; i++) {
            var component = features[i];
            component.geometry.transform(this.externalProjection,
                                         this.internalProjection);
          }
        }
      }
    }    
    return features;
  },
  /**
   * Method: write
   * Serialize a feature or array of features into a WKT string.
   *
   * Parameters:
   * features - {<ZOO.Feature.Vector>|Array} A feature or array of
   *            features
   *
   * Returns:
   * {String} The WKT string representation of the input geometries
   */
  write: function(features) {
    var collection, geometry, type, data, isCollection;
    if(features.constructor == Array) {
      collection = features;
      isCollection = true;
    } else {
      collection = [features];
      isCollection = false;
    }
    var pieces = [];
    if(isCollection)
      pieces.push('GEOMETRYCOLLECTION(');
    for(var i=0, len=collection.length; i<len; ++i) {
      if(isCollection && i>0)
        pieces.push(',');
      geometry = collection[i].geometry;
      type = geometry.CLASS_NAME.split('.')[2].toLowerCase();
      if(!this.extract[type])
        return null;
      if (this.internalProjection && this.externalProjection) {
        geometry = geometry.clone();
        geometry.transform(this.internalProjection, 
                          this.externalProjection);
      }                       
      data = this.extract[type].apply(this, [geometry]);
      pieces.push(type.toUpperCase() + '(' + data + ')');
    }
    if(isCollection)
      pieces.push(')');
    return pieces.join('');
  },
  /**
   * Property: extract
   * Object with properties corresponding to the geometry types.
   * Property values are functions that do the actual data extraction.
   */
  extract: {
    /**
     * Return a space delimited string of point coordinates.
     * @param {<ZOO.Geometry.Point>} point
     * @returns {String} A string of coordinates representing the point
     */
    'point': function(point) {
      return point.x + ' ' + point.y;
    },
    /**
     * Return a comma delimited string of point coordinates from a multipoint.
     * @param {<ZOO.Geometry.MultiPoint>} multipoint
     * @returns {String} A string of point coordinate strings representing
     *                  the multipoint
     */
    'multipoint': function(multipoint) {
      var array = [];
      for(var i=0, len=multipoint.components.length; i<len; ++i) {
        array.push(this.extract.point.apply(this, [multipoint.components[i]]));
      }
      return array.join(',');
    },
    /**
     * Return a comma delimited string of point coordinates from a line.
     * @param {<ZOO.Geometry.LineString>} linestring
     * @returns {String} A string of point coordinate strings representing
     *                  the linestring
     */
    'linestring': function(linestring) {
      var array = [];
      for(var i=0, len=linestring.components.length; i<len; ++i) {
        array.push(this.extract.point.apply(this, [linestring.components[i]]));
      }
      return array.join(',');
    },
    /**
     * Return a comma delimited string of linestring strings from a multilinestring.
     * @param {<ZOO.Geometry.MultiLineString>} multilinestring
     * @returns {String} A string of of linestring strings representing
     *                  the multilinestring
     */
    'multilinestring': function(multilinestring) {
      var array = [];
      for(var i=0, len=multilinestring.components.length; i<len; ++i) {
        array.push('(' +
            this.extract.linestring.apply(this, [multilinestring.components[i]]) +
            ')');
      }
      return array.join(',');
    },
    /**
     * Return a comma delimited string of linear ring arrays from a polygon.
     * @param {<ZOO.Geometry.Polygon>} polygon
     * @returns {String} An array of linear ring arrays representing the polygon
     */
    'polygon': function(polygon) {
      var array = [];
      for(var i=0, len=polygon.components.length; i<len; ++i) {
        array.push('(' +
            this.extract.linestring.apply(this, [polygon.components[i]]) +
            ')');
      }
      return array.join(',');
    },
    /**
     * Return an array of polygon arrays from a multipolygon.
     * @param {<ZOO.Geometry.MultiPolygon>} multipolygon
     * @returns {Array} An array of polygon arrays representing
     *                  the multipolygon
     */
    'multipolygon': function(multipolygon) {
      var array = [];
      for(var i=0, len=multipolygon.components.length; i<len; ++i) {
        array.push('(' +
            this.extract.polygon.apply(this, [multipolygon.components[i]]) +
            ')');
      }
      return array.join(',');
    }
  },
  /**
   * Property: parse
   * Object with properties corresponding to the geometry types.
   *     Property values are functions that do the actual parsing.
   */
  parse: {
    /**
     * Method: parse.point
     * Return point feature given a point WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the point
     * Returns:
     * {<ZOO.Feature>} A point feature
     */
    'point': function(str) {
       var coords = ZOO.String.trim(str).split(this.regExes.spaces);
            return new ZOO.Feature(
                new ZOO.Geometry.Point(coords[0], coords[1])
            );
    },
    /**
     * Method: parse.multipoint
     * Return a multipoint feature given a multipoint WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the multipoint
     *
     * Returns:
     * {<ZOO.Feature>} A multipoint feature
     */
    'multipoint': function(str) {
       var points = ZOO.String.trim(str).split(',');
       var components = [];
       for(var i=0, len=points.length; i<len; ++i) {
         components.push(this.parse.point.apply(this, [points[i]]).geometry);
       }
       return new ZOO.Feature(
           new ZOO.Geometry.MultiPoint(components)
           );
    },
    /**
     * Method: parse.linestring
     * Return a linestring feature given a linestring WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the linestring
     *
     * Returns:
     * {<ZOO.Feature>} A linestring feature
     */
    'linestring': function(str) {
      var points = ZOO.String.trim(str).split(',');
      var components = [];
      for(var i=0, len=points.length; i<len; ++i) {
        components.push(this.parse.point.apply(this, [points[i]]).geometry);
      }
      return new ZOO.Feature(
          new ZOO.Geometry.LineString(components)
          );
    },
    /**
     * Method: parse.multilinestring
     * Return a multilinestring feature given a multilinestring WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the multilinestring
     *
     * Returns:
     * {<ZOO.Feature>} A multilinestring feature
     */
    'multilinestring': function(str) {
      var line;
      var lines = ZOO.String.trim(str).split(this.regExes.parenComma);
      var components = [];
      for(var i=0, len=lines.length; i<len; ++i) {
        line = lines[i].replace(this.regExes.trimParens, '$1');
        components.push(this.parse.linestring.apply(this, [line]).geometry);
      }
      return new ZOO.Feature(
          new ZOO.Geometry.MultiLineString(components)
          );
    },
    /**
     * Method: parse.polygon
     * Return a polygon feature given a polygon WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the polygon
     *
     * Returns:
     * {<ZOO.Feature>} A polygon feature
     */
    'polygon': function(str) {
       var ring, linestring, linearring;
       var rings = ZOO.String.trim(str).split(this.regExes.parenComma);
       var components = [];
       for(var i=0, len=rings.length; i<len; ++i) {
         ring = rings[i].replace(this.regExes.trimParens, '$1');
         linestring = this.parse.linestring.apply(this, [ring]).geometry;
         linearring = new ZOO.Geometry.LinearRing(linestring.components);
         components.push(linearring);
       }
       return new ZOO.Feature(
           new ZOO.Geometry.Polygon(components)
           );
    },
    /**
     * Method: parse.multipolygon
     * Return a multipolygon feature given a multipolygon WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the multipolygon
     *
     * Returns:
     * {<ZOO.Feature>} A multipolygon feature
     */
    'multipolygon': function(str) {
      var polygon;
      var polygons = ZOO.String.trim(str).split(this.regExes.doubleParenComma);
      var components = [];
      for(var i=0, len=polygons.length; i<len; ++i) {
        polygon = polygons[i].replace(this.regExes.trimParens, '$1');
        components.push(this.parse.polygon.apply(this, [polygon]).geometry);
      }
      return new ZOO.Feature(
          new ZOO.Geometry.MultiPolygon(components)
          );
    },
    /**
     * Method: parse.geometrycollection
     * Return an array of features given a geometrycollection WKT fragment.
     *
     * Parameters:
     * str - {String} A WKT fragment representing the geometrycollection
     *
     * Returns:
     * {Array} An array of ZOO.Feature
     */
    'geometrycollection': function(str) {
      // separate components of the collection with |
      str = str.replace(/,\s*([A-Za-z])/g, '|$1');
      var wktArray = ZOO.String.trim(str).split('|');
      var components = [];
      for(var i=0, len=wktArray.length; i<len; ++i) {
        components.push(ZOO.Format.WKT.prototype.read.apply(this,[wktArray[i]]));
      }
      return components;
    }
  },
  CLASS_NAME: 'ZOO.Format.WKT'
});
/**
 * Class: ZOO.Format.JSON
 * A parser to read/write JSON safely. Create a new instance with the
 *     <ZOO.Format.JSON> constructor.
 *
 * Inherits from:
 *  - <ZOO.Format>
 */
ZOO.Format.JSON = ZOO.Class(ZOO.Format, {
  /**
   * Property: indent
   * {String} For "pretty" printing, the indent string will be used once for
   *     each indentation level.
   */
  indent: "    ",
  /**
   * Property: space
   * {String} For "pretty" printing, the space string will be used after
   *     the ":" separating a name/value pair.
   */
  space: " ",
  /**
   * Property: newline
   * {String} For "pretty" printing, the newline string will be used at the
   *     end of each name/value pair or array item.
   */
  newline: "\n",
  /**
   * Property: level
   * {Integer} For "pretty" printing, this is incremented/decremented during
   *     serialization.
   */
  level: 0,
  /**
   * Property: pretty
   * {Boolean} Serialize with extra whitespace for structure.  This is set
   *     by the <write> method.
   */
  pretty: false,
  /**
   * Constructor: ZOO.Format.JSON
   * Create a new parser for JSON.
   *
   * Parameters:
   * options - {Object} An optional object whose properties will be set on
   *     this instance.
   */
  initialize: function(options) {
    ZOO.Format.prototype.initialize.apply(this, [options]);
  },
  /**
   * Method: read
   * Deserialize a json string.
   *
   * Parameters:
   * json - {String} A JSON string
   * filter - {Function} A function which will be called for every key and
   *     value at every level of the final result. Each value will be
   *     replaced by the result of the filter function. This can be used to
   *     reform generic objects into instances of classes, or to transform
   *     date strings into Date objects.
   *     
   * Returns:
   * {Object} An object, array, string, or number .
   */
  read: function(json, filter) {
    /**
     * Parsing happens in three stages. In the first stage, we run the text
     *     against a regular expression which looks for non-JSON
     *     characters. We are especially concerned with '()' and 'new'
     *     because they can cause invocation, and '=' because it can cause
     *     mutation. But just to be safe, we will reject all unexpected
     *     characters.
     */
    try {
      if (/^[\],:{}\s]*$/.test(json.replace(/\\["\\\/bfnrtu]/g, '@').
                          replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
                          replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        /**
         * In the second stage we use the eval function to compile the
         *     text into a JavaScript structure. The '{' operator is
         *     subject to a syntactic ambiguity in JavaScript - it can
         *     begin a block or an object literal. We wrap the text in
         *     parens to eliminate the ambiguity.
         */
        var object = eval('(' + json + ')');
        /**
         * In the optional third stage, we recursively walk the new
         *     structure, passing each name/value pair to a filter
         *     function for possible transformation.
         */
        if(typeof filter === 'function') {
          function walk(k, v) {
            if(v && typeof v === 'object') {
              for(var i in v) {
                if(v.hasOwnProperty(i)) {
                  v[i] = walk(i, v[i]);
                }
              }
            }
            return filter(k, v);
          }
          object = walk('', object);
        }
        if(this.keepData) {
          this.data = object;
        }
        return object;
      }
    } catch(e) {
      // Fall through if the regexp test fails.
    }
    return null;
  },
  /**
   * Method: write
   * Serialize an object into a JSON string.
   *
   * Parameters:
   * value - {String} The object, array, string, number, boolean or date
   *     to be serialized.
   * pretty - {Boolean} Structure the output with newlines and indentation.
   *     Default is false.
   *
   * Returns:
   * {String} The JSON string representation of the input value.
   */
  write: function(value, pretty) {
    this.pretty = !!pretty;
    var json = null;
    var type = typeof value;
    if(this.serialize[type]) {
      try {
        json = this.serialize[type].apply(this, [value]);
      } catch(err) {
        //OpenLayers.Console.error("Trouble serializing: " + err);
      }
    }
    return json;
  },
  /**
   * Method: writeIndent
   * Output an indentation string depending on the indentation level.
   *
   * Returns:
   * {String} An appropriate indentation string.
   */
  writeIndent: function() {
    var pieces = [];
    if(this.pretty) {
      for(var i=0; i<this.level; ++i) {
        pieces.push(this.indent);
      }
    }
    return pieces.join('');
  },
  /**
   * Method: writeNewline
   * Output a string representing a newline if in pretty printing mode.
   *
   * Returns:
   * {String} A string representing a new line.
   */
  writeNewline: function() {
    return (this.pretty) ? this.newline : '';
  },
  /**
   * Method: writeSpace
   * Output a string representing a space if in pretty printing mode.
   *
   * Returns:
   * {String} A space.
   */
  writeSpace: function() {
    return (this.pretty) ? this.space : '';
  },
  /**
   * Property: serialize
   * Object with properties corresponding to the serializable data types.
   *     Property values are functions that do the actual serializing.
   */
  serialize: {
    /**
     * Method: serialize.object
     * Transform an object into a JSON string.
     *
     * Parameters:
     * object - {Object} The object to be serialized.
     * 
     * Returns:
     * {String} A JSON string representing the object.
     */
    'object': function(object) {
       // three special objects that we want to treat differently
       if(object == null)
         return "null";
       if(object.constructor == Date)
         return this.serialize.date.apply(this, [object]);
       if(object.constructor == Array)
         return this.serialize.array.apply(this, [object]);
       var pieces = ['{'];
       this.level += 1;
       var key, keyJSON, valueJSON;

       var addComma = false;
       for(key in object) {
         if(object.hasOwnProperty(key)) {
           // recursive calls need to allow for sub-classing
           keyJSON = ZOO.Format.JSON.prototype.write.apply(this,
                                                           [key, this.pretty]);
           valueJSON = ZOO.Format.JSON.prototype.write.apply(this,
                                                             [object[key], this.pretty]);
           if(keyJSON != null && valueJSON != null) {
             if(addComma)
               pieces.push(',');
             pieces.push(this.writeNewline(), this.writeIndent(),
                         keyJSON, ':', this.writeSpace(), valueJSON);
             addComma = true;
           }
         }
       }
       this.level -= 1;
       pieces.push(this.writeNewline(), this.writeIndent(), '}');
       return pieces.join('');
    },
    /**
     * Method: serialize.array
     * Transform an array into a JSON string.
     *
     * Parameters:
     * array - {Array} The array to be serialized
     * 
     * Returns:
     * {String} A JSON string representing the array.
     */
    'array': function(array) {
      var json;
      var pieces = ['['];
      this.level += 1;
      for(var i=0, len=array.length; i<len; ++i) {
        // recursive calls need to allow for sub-classing
        json = ZOO.Format.JSON.prototype.write.apply(this,
                                                     [array[i], this.pretty]);
        if(json != null) {
          if(i > 0)
            pieces.push(',');
          pieces.push(this.writeNewline(), this.writeIndent(), json);
        }
      }
      this.level -= 1;    
      pieces.push(this.writeNewline(), this.writeIndent(), ']');
      return pieces.join('');
    },
    /**
     * Method: serialize.string
     * Transform a string into a JSON string.
     *
     * Parameters:
     * string - {String} The string to be serialized
     * 
     * Returns:
     * {String} A JSON string representing the string.
     */
    'string': function(string) {
      var m = {
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"' : '\\"',
                '\\': '\\\\'
      };
      if(/["\\\x00-\x1f]/.test(string)) {
        return '"' + string.replace(/([\x00-\x1f\\"])/g, function(a, b) {
            var c = m[b];
            if(c)
              return c;
            c = b.charCodeAt();
            return '\\u00' +
            Math.floor(c / 16).toString(16) +
            (c % 16).toString(16);
        }) + '"';
      }
      return '"' + string + '"';
    },
    /**
     * Method: serialize.number
     * Transform a number into a JSON string.
     *
     * Parameters:
     * number - {Number} The number to be serialized.
     *
     * Returns:
     * {String} A JSON string representing the number.
     */
    'number': function(number) {
      return isFinite(number) ? String(number) : "null";
    },
    /**
     * Method: serialize.boolean
     * Transform a boolean into a JSON string.
     *
     * Parameters:
     * bool - {Boolean} The boolean to be serialized.
     * 
     * Returns:
     * {String} A JSON string representing the boolean.
     */
    'boolean': function(bool) {
      return String(bool);
    },
    /**
     * Method: serialize.date
     * Transform a date into a JSON string.
     *
     * Parameters:
     * date - {Date} The date to be serialized.
     * 
     * Returns:
     * {String} A JSON string representing the date.
     */
    'date': function(date) {    
      function format(number) {
        // Format integers to have at least two digits.
        return (number < 10) ? '0' + number : number;
      }
      return '"' + date.getFullYear() + '-' +
        format(date.getMonth() + 1) + '-' +
        format(date.getDate()) + 'T' +
        format(date.getHours()) + ':' +
        format(date.getMinutes()) + ':' +
        format(date.getSeconds()) + '"';
    }
  },
  CLASS_NAME: 'ZOO.Format.JSON'
});
/**
 * Class: ZOO.Format.GeoJSON
 * Read and write GeoJSON. Create a new parser with the
 *     <ZOO.Format.GeoJSON> constructor.
 *
 * Inherits from:
 *  - <ZOO.Format.JSON>
 */
ZOO.Format.GeoJSON = ZOO.Class(ZOO.Format.JSON, {
  /**
   * Constructor: ZOO.Format.GeoJSON
   * Create a new parser for GeoJSON.
   *
   * Parameters:
   * options - {Object} An optional object whose properties will be set on
   *     this instance.
   */
  initialize: function(options) {
    ZOO.Format.JSON.prototype.initialize.apply(this, [options]);
  },
  /**
   * Method: read
   * Deserialize a GeoJSON string.
   *
   * Parameters:
   * json - {String} A GeoJSON string
   * type - {String} Optional string that determines the structure of
   *     the output.  Supported values are "Geometry", "Feature", and
   *     "FeatureCollection".  If absent or null, a default of
   *     "FeatureCollection" is assumed.
   * filter - {Function} A function which will be called for every key and
   *     value at every level of the final result. Each value will be
   *     replaced by the result of the filter function. This can be used to
   *     reform generic objects into instances of classes, or to transform
   *     date strings into Date objects.
   *
   * Returns: 
   * {Object} The return depends on the value of the type argument. If type
   *     is "FeatureCollection" (the default), the return will be an array
   *     of <ZOO.Feature>. If type is "Geometry", the input json
   *     must represent a single geometry, and the return will be an
   *     <ZOO.Geometry>.  If type is "Feature", the input json must
   *     represent a single feature, and the return will be an
   *     <ZOO.Feature>.
   */
  read: function(json, type, filter) {
    type = (type) ? type : "FeatureCollection";
    var results = null;
    var obj = null;
    if (typeof json == "string")
      obj = ZOO.Format.JSON.prototype.read.apply(this,[json, filter]);
    else
      obj = json;
    if(!obj) {
      //ZOO.Console.error("Bad JSON: " + json);
    } else if(typeof(obj.type) != "string") {
      //ZOO.Console.error("Bad GeoJSON - no type: " + json);
    } else if(this.isValidType(obj, type)) {
      switch(type) {
        case "Geometry":
          try {
            results = this.parseGeometry(obj);
          } catch(err) {
            //ZOO.Console.error(err);
          }
          break;
        case "Feature":
          try {
            results = this.parseFeature(obj);
            results.type = "Feature";
          } catch(err) {
            //ZOO.Console.error(err);
          }
          break;
        case "FeatureCollection":
          // for type FeatureCollection, we allow input to be any type
          results = [];
          switch(obj.type) {
            case "Feature":
              try {
                results.push(this.parseFeature(obj));
              } catch(err) {
                results = null;
                //ZOO.Console.error(err);
              }
              break;
            case "FeatureCollection":
              for(var i=0, len=obj.features.length; i<len; ++i) {
                try {
                  results.push(this.parseFeature(obj.features[i]));
                } catch(err) {
                  results = null;
                  //ZOO.Console.error(err);
                }
              }
              break;
            default:
              try {
                var geom = this.parseGeometry(obj);
                results.push(new ZOO.Feature(geom));
              } catch(err) {
                results = null;
                //ZOO.Console.error(err);
              }
          }
          break;
      }
    }
    return results;
  },
  /**
   * Method: isValidType
   * Check if a GeoJSON object is a valid representative of the given type.
   *
   * Returns:
   * {Boolean} The object is valid GeoJSON object of the given type.
   */
  isValidType: function(obj, type) {
    var valid = false;
    switch(type) {
      case "Geometry":
        if(ZOO.indexOf(
              ["Point", "MultiPoint", "LineString", "MultiLineString",
              "Polygon", "MultiPolygon", "Box", "GeometryCollection"],
              obj.type) == -1) {
          // unsupported geometry type
          //ZOO.Console.error("Unsupported geometry type: " +obj.type);
        } else {
          valid = true;
        }
        break;
      case "FeatureCollection":
        // allow for any type to be converted to a feature collection
        valid = true;
        break;
      default:
        // for Feature types must match
        if(obj.type == type) {
          valid = true;
        } else {
          //ZOO.Console.error("Cannot convert types from " +obj.type + " to " + type);
        }
    }
    return valid;
  },
  /**
   * Method: parseFeature
   * Convert a feature object from GeoJSON into an
   *     <ZOO.Feature>.
   *
   * Parameters:
   * obj - {Object} An object created from a GeoJSON object
   *
   * Returns:
   * {<ZOO.Feature>} A feature.
   */
  parseFeature: function(obj) {
    var feature, geometry, attributes, bbox;
    attributes = (obj.properties) ? obj.properties : {};
    bbox = (obj.geometry && obj.geometry.bbox) || obj.bbox;
    try {
      geometry = this.parseGeometry(obj.geometry);
    } catch(err) {
      // deal with bad geometries
      throw err;
    }
    feature = new ZOO.Feature(geometry, attributes);
    if(bbox)
      feature.bounds = ZOO.Bounds.fromArray(bbox);
    if(obj.id)
      feature.fid = obj.id;
    return feature;
  },
  /**
   * Method: parseGeometry
   * Convert a geometry object from GeoJSON into an <ZOO.Geometry>.
   *
   * Parameters:
   * obj - {Object} An object created from a GeoJSON object
   *
   * Returns: 
   * {<ZOO.Geometry>} A geometry.
   */
  parseGeometry: function(obj) {
    if (obj == null)
      return null;
    var geometry, collection = false;
    if(obj.type == "GeometryCollection") {
      if(!(obj.geometries instanceof Array)) {
        throw "GeometryCollection must have geometries array: " + obj;
      }
      var numGeom = obj.geometries.length;
      var components = new Array(numGeom);
      for(var i=0; i<numGeom; ++i) {
        components[i] = this.parseGeometry.apply(
            this, [obj.geometries[i]]
            );
      }
      geometry = new ZOO.Geometry.Collection(components);
      collection = true;
    } else {
      if(!(obj.coordinates instanceof Array)) {
        throw "Geometry must have coordinates array: " + obj;
      }
      if(!this.parseCoords[obj.type.toLowerCase()]) {
        throw "Unsupported geometry type: " + obj.type;
      }
      try {
        geometry = this.parseCoords[obj.type.toLowerCase()].apply(
            this, [obj.coordinates]
            );
      } catch(err) {
        // deal with bad coordinates
        throw err;
      }
    }
        // We don't reproject collections because the children are reprojected
        // for us when they are created.
    if (this.internalProjection && this.externalProjection && !collection) {
      geometry.transform(this.externalProjection, 
          this.internalProjection); 
    }                       
    return geometry;
  },
  /**
   * Property: parseCoords
   * Object with properties corresponding to the GeoJSON geometry types.
   *     Property values are functions that do the actual parsing.
   */
  parseCoords: {
    /**
     * Method: parseCoords.point
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.Point>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.Point>} A geometry.
     */
    "point": function(array) {
      if(array.length != 2) {
        throw "Only 2D points are supported: " + array;
      }
      return new ZOO.Geometry.Point(array[0], array[1]);
    },
    /**
     * Method: parseCoords.multipoint
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.MultiPoint>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.MultiPoint>} A geometry.
     */
    "multipoint": function(array) {
      var points = [];
      var p = null;
      for(var i=0, len=array.length; i<len; ++i) {
        try {
          p = this.parseCoords["point"].apply(this, [array[i]]);
        } catch(err) {
          throw err;
        }
        points.push(p);
      }
      return new ZOO.Geometry.MultiPoint(points);
    },
    /**
     * Method: parseCoords.linestring
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.LineString>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.LineString>} A geometry.
     */
    "linestring": function(array) {
      var points = [];
      var p = null;
      for(var i=0, len=array.length; i<len; ++i) {
        try {
          p = this.parseCoords["point"].apply(this, [array[i]]);
        } catch(err) {
          throw err;
        }
        points.push(p);
      }
      return new ZOO.Geometry.LineString(points);
    },
    /**
     * Method: parseCoords.multilinestring
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.MultiLineString>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.MultiLineString>} A geometry.
     */
    "multilinestring": function(array) {
      var lines = [];
      var l = null;
      for(var i=0, len=array.length; i<len; ++i) {
        try {
          l = this.parseCoords["linestring"].apply(this, [array[i]]);
        } catch(err) {
          throw err;
        }
        lines.push(l);
      }
      return new ZOO.Geometry.MultiLineString(lines);
    },
    /**
     * Method: parseCoords.polygon
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.Polygon>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.Polygon>} A geometry.
     */
    "polygon": function(array) {
      var rings = [];
      var r, l;
      for(var i=0, len=array.length; i<len; ++i) {
        try {
          l = this.parseCoords["linestring"].apply(this, [array[i]]);
        } catch(err) {
          throw err;
        }
        r = new ZOO.Geometry.LinearRing(l.components);
        rings.push(r);
      }
      return new ZOO.Geometry.Polygon(rings);
    },
    /**
     * Method: parseCoords.multipolygon
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.MultiPolygon>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.MultiPolygon>} A geometry.
     */
    "multipolygon": function(array) {
      var polys = [];
      var p = null;
      for(var i=0, len=array.length; i<len; ++i) {
        try {
          p = this.parseCoords["polygon"].apply(this, [array[i]]);
        } catch(err) {
          throw err;
        }
        polys.push(p);
      }
      return new ZOO.Geometry.MultiPolygon(polys);
    },
    /**
     * Method: parseCoords.box
     * Convert a coordinate array from GeoJSON into an
     *     <ZOO.Geometry.Polygon>.
     *
     * Parameters:
     * array - {Object} The coordinates array from the GeoJSON fragment.
     *
     * Returns:
     * {<ZOO.Geometry.Polygon>} A geometry.
     */
    "box": function(array) {
      if(array.length != 2) {
        throw "GeoJSON box coordinates must have 2 elements";
      }
      return new ZOO.Geometry.Polygon([
          new ZOO.Geometry.LinearRing([
            new ZOO.Geometry.Point(array[0][0], array[0][1]),
            new ZOO.Geometry.Point(array[1][0], array[0][1]),
            new ZOO.Geometry.Point(array[1][0], array[1][1]),
            new ZOO.Geometry.Point(array[0][0], array[1][1]),
            new Z0O.Geometry.Point(array[0][0], array[0][1])
          ])
      ]);
    }
  },
  /**
   * Method: write
   * Serialize a feature, geometry, array of features into a GeoJSON string.
   *
   * Parameters:
   * obj - {Object} An <ZOO.Feature>, <ZOO.Geometry>,
   *     or an array of features.
   * pretty - {Boolean} Structure the output with newlines and indentation.
   *     Default is false.
   *
   * Returns:
   * {String} The GeoJSON string representation of the input geometry,
   *     features, or array of features.
   */
  write: function(obj, pretty) {
    var geojson = {
      "type": null
    };
    if(obj instanceof Array) {
      geojson.type = "FeatureCollection";
      var numFeatures = obj.length;
      geojson.features = new Array(numFeatures);
      for(var i=0; i<numFeatures; ++i) {
        var element = obj[i];
        if(!element instanceof ZOO.Feature) {
          var msg = "FeatureCollection only supports collections " +
            "of features: " + element;
          throw msg;
        }
        geojson.features[i] = this.extract.feature.apply(this, [element]);
      }
    } else if (obj.CLASS_NAME.indexOf("ZOO.Geometry") == 0) {
      geojson = this.extract.geometry.apply(this, [obj]);
    } else if (obj instanceof ZOO.Feature) {
      geojson = this.extract.feature.apply(this, [obj]);
      /*
      if(obj.layer && obj.layer.projection) {
        geojson.crs = this.createCRSObject(obj);
      }
      */
    }
    return ZOO.Format.JSON.prototype.write.apply(this,
                                                 [geojson, pretty]);
  },
  /**
   * Method: createCRSObject
   * Create the CRS object for an object.
   *
   * Parameters:
   * object - {<ZOO.Feature>} 
   *
   * Returns:
   * {Object} An object which can be assigned to the crs property
   * of a GeoJSON object.
   */
  createCRSObject: function(object) {
    //var proj = object.layer.projection.toString();
    var proj = object.projection.toString();
    var crs = {};
    if (proj.match(/epsg:/i)) {
      var code = parseInt(proj.substring(proj.indexOf(":") + 1));
      if (code == 4326) {
        crs = {
          "type": "OGC",
          "properties": {
            "urn": "urn:ogc:def:crs:OGC:1.3:CRS84"
          }
        };
      } else {    
        crs = {
          "type": "EPSG",
          "properties": {
            "code": code 
          }
        };
      }    
    }
    return crs;
  },
  /**
   * Property: extract
   * Object with properties corresponding to the GeoJSON types.
   *     Property values are functions that do the actual value extraction.
   */
  extract: {
    /**
     * Method: extract.feature
     * Return a partial GeoJSON object representing a single feature.
     *
     * Parameters:
     * feature - {<ZOO.Feature>}
     *
     * Returns:
     * {Object} An object representing the point.
     */
    'feature': function(feature) {
      var geom = this.extract.geometry.apply(this, [feature.geometry]);
      return {
        "type": "Feature",
        "id": feature.fid == null ? feature.id : feature.fid,
        "properties": feature.attributes,
        "geometry": geom
      };
    },
    /**
     * Method: extract.geometry
     * Return a GeoJSON object representing a single geometry.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry>}
     *
     * Returns:
     * {Object} An object representing the geometry.
     */
    'geometry': function(geometry) {
      if (geometry == null)
        return null;
      if (this.internalProjection && this.externalProjection) {
        geometry = geometry.clone();
        geometry.transform(this.internalProjection, 
            this.externalProjection);
      }                       
      var geometryType = geometry.CLASS_NAME.split('.')[2];
      var data = this.extract[geometryType.toLowerCase()].apply(this, [geometry]);
      var json;
      if(geometryType == "Collection")
        json = {
          "type": "GeometryCollection",
          "geometries": data
        };
      else
        json = {
          "type": geometryType,
          "coordinates": data
        };
      return json;
    },
    /**
     * Method: extract.point
     * Return an array of coordinates from a point.
     *
     * Parameters:
     * point - {<ZOO.Geometry.Point>}
     *
     * Returns: 
     * {Array} An array of coordinates representing the point.
     */
    'point': function(point) {
      return [point.x, point.y];
    },
    /**
     * Method: extract.multipoint
     * Return an array of coordinates from a multipoint.
     *
     * Parameters:
     * multipoint - {<ZOO.Geometry.MultiPoint>}
     *
     * Returns: 
     * {Array} An array of point coordinate arrays representing
     *     the multipoint.
     */
    'multipoint': function(multipoint) {
      var array = [];
      for(var i=0, len=multipoint.components.length; i<len; ++i) {
        array.push(this.extract.point.apply(this, [multipoint.components[i]]));
      }
      return array;
    },
    /**
     * Method: extract.linestring
     * Return an array of coordinate arrays from a linestring.
     *
     * Parameters:
     * linestring - {<ZOO.Geometry.LineString>}
     *
     * Returns:
     * {Array} An array of coordinate arrays representing
     *     the linestring.
     */
    'linestring': function(linestring) {
      var array = [];
      for(var i=0, len=linestring.components.length; i<len; ++i) {
        array.push(this.extract.point.apply(this, [linestring.components[i]]));
      }
      return array;
    },
    /**
     * Method: extract.multilinestring
     * Return an array of linestring arrays from a linestring.
     * 
     * Parameters:
     * multilinestring - {<ZOO.Geometry.MultiLineString>}
     * 
     * Returns:
     * {Array} An array of linestring arrays representing
     *     the multilinestring.
     */
    'multilinestring': function(multilinestring) {
      var array = [];
      for(var i=0, len=multilinestring.components.length; i<len; ++i) {
        array.push(this.extract.linestring.apply(this, [multilinestring.components[i]]));
      }
      return array;
    },
    /**
     * Method: extract.polygon
     * Return an array of linear ring arrays from a polygon.
     *
     * Parameters:
     * polygon - {<ZOO.Geometry.Polygon>}
     * 
     * Returns:
     * {Array} An array of linear ring arrays representing the polygon.
     */
    'polygon': function(polygon) {
      var array = [];
      for(var i=0, len=polygon.components.length; i<len; ++i) {
        array.push(this.extract.linestring.apply(this, [polygon.components[i]]));
      }
      return array;
    },
    /**
     * Method: extract.multipolygon
     * Return an array of polygon arrays from a multipolygon.
     * 
     * Parameters:
     * multipolygon - {<ZOO.Geometry.MultiPolygon>}
     * 
     * Returns:
     * {Array} An array of polygon arrays representing
     *     the multipolygon
     */
    'multipolygon': function(multipolygon) {
      var array = [];
      for(var i=0, len=multipolygon.components.length; i<len; ++i) {
        array.push(this.extract.polygon.apply(this, [multipolygon.components[i]]));
      }
      return array;
    },
    /**
     * Method: extract.collection
     * Return an array of geometries from a geometry collection.
     * 
     * Parameters:
     * collection - {<ZOO.Geometry.Collection>}
     * 
     * Returns:
     * {Array} An array of geometry objects representing the geometry
     *     collection.
     */
    'collection': function(collection) {
      var len = collection.components.length;
      var array = new Array(len);
      for(var i=0; i<len; ++i) {
        array[i] = this.extract.geometry.apply(
            this, [collection.components[i]]
            );
      }
      return array;
    }
  },
  CLASS_NAME: 'ZOO.Format.GeoJSON'
});
/**
 * Class: ZOO.Format.KML
 * Read/Write KML. Create a new instance with the <ZOO.Format.KML>
 *     constructor. 
 * 
 * Inherits from:
 *  - <ZOO.Format>
 */
ZOO.Format.KML = ZOO.Class(ZOO.Format, {
  /**
   * Property: kmlns
   * {String} KML Namespace to use. Defaults to 2.2 namespace.
   */
  kmlns: "http://www.opengis.net/kml/2.2",
  /** 
   * Property: foldersName
   * {String} Name of the folders.  Default is "ZOO export".
   *          If set to null, no name element will be created.
   */
  foldersName: "ZOO export",
  /** 
   * Property: foldersDesc
   * {String} Description of the folders. Default is "Exported on [date]."
   *          If set to null, no description element will be created.
   */
  foldersDesc: "Created on " + new Date(),
  /** 
   * Property: placemarksDesc
   * {String} Name of the placemarks.  Default is "No description available".
   */
  placemarksDesc: "No description available",
  /**
   * Property: extractAttributes
   * {Boolean} Extract attributes from KML.  Default is true.
   *           Extracting styleUrls requires this to be set to true
   */
  extractAttributes: true,
  /**
   * Constructor: ZOO.Format.KML
   * Create a new parser for KML.
   *
   * Parameters:
   * options - {Object} An optional object whose properties will be set on
   *     this instance.
   */
  initialize: function(options) {
    // compile regular expressions once instead of every time they are used
    this.regExes = {
           trimSpace: (/^\s*|\s*$/g),
           removeSpace: (/\s*/g),
           splitSpace: (/\s+/),
           trimComma: (/\s*,\s*/g),
           kmlColor: (/(\w{2})(\w{2})(\w{2})(\w{2})/),
           kmlIconPalette: (/root:\/\/icons\/palette-(\d+)(\.\w+)/),
           straightBracket: (/\$\[(.*?)\]/g)
    };
    // KML coordinates are always in longlat WGS84
    this.externalProjection = new ZOO.Projection("EPSG:4326");
    ZOO.Format.prototype.initialize.apply(this, [options]);
  },
  /**
   * APIMethod: read
   * Read data from a string, and return a list of features. 
   * 
   * Parameters: 
   * data    - {String} data to read/parse.
   *
   * Returns:
   * {Array(<ZOO.Feature>)} List of features.
   */
  read: function(data) {
    this.features = [];
    data = data.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
    data = new XML(data);
    var placemarks = data..*::Placemark;
    this.parseFeatures(placemarks);
    return this.features;
  },
  /**
   * Method: parseFeatures
   * Loop through all Placemark nodes and parse them.
   * Will create a list of features
   * 
   * Parameters: 
   * nodes    - {Array} of {E4XElement} data to read/parse.
   * options  - {Object} Hash of options
   * 
   */
  parseFeatures: function(nodes) {
    var features = new Array(nodes.length());
    for(var i=0, len=nodes.length(); i<len; i++) {
      var featureNode = nodes[i];
      var feature = this.parseFeature.apply(this,[featureNode]) ;
      features[i] = feature;
    }
    this.features = this.features.concat(features);
  },
  /**
   * Method: parseFeature
   * This function is the core of the KML parsing code in ZOO.
   *     It creates the geometries that are then attached to the returned
   *     feature, and calls parseAttributes() to get attribute data out.
   *
   * Parameters:
   * node - {E4XElement}
   *
   * Returns:
   * {<ZOO.Feature>} A vector feature.
   */
  parseFeature: function(node) {
    // only accept one geometry per feature - look for highest "order"
    var order = ["MultiGeometry", "Polygon", "LineString", "Point"];
    var type, nodeList, geometry, parser;
    for(var i=0, len=order.length; i<len; ++i) {
      type = order[i];
      nodeList = node.descendants(QName(null,type));
      if (nodeList.length()> 0) {
        var parser = this.parseGeometry[type.toLowerCase()];
        if(parser) {
          geometry = parser.apply(this, [nodeList[0]]);
          if (this.internalProjection && this.externalProjection) {
            geometry.transform(this.externalProjection, 
                               this.internalProjection); 
          }                       
        }
        // stop looking for different geometry types
        break;
      }
    }
    // construct feature (optionally with attributes)
    var attributes;
    if(this.extractAttributes) {
      attributes = this.parseAttributes(node);
    }
    var feature = new ZOO.Feature(geometry, attributes);
    var fid = node.@id || node.@name;
    if(fid != null)
      feature.fid = fid;
    return feature;
  },
  /**
   * Property: parseGeometry
   * Properties of this object are the functions that parse geometries based
   *     on their type.
   */
  parseGeometry: {
    /**
     * Method: parseGeometry.point
     * Given a KML node representing a point geometry, create a ZOO
     *     point geometry.
     *
     * Parameters:
     * node - {E4XElement} A KML Point node.
     *
     * Returns:
     * {<ZOO.Geometry.Point>} A point geometry.
     */
    'point': function(node) {
      var coordString = node.*::coordinates.toString();
      coordString = coordString.replace(this.regExes.removeSpace, "");
      coords = coordString.split(",");
      var point = null;
      if(coords.length > 1) {
        // preserve third dimension
        if(coords.length == 2) {
          coords[2] = null;
        }
        point = new ZOO.Geometry.Point(coords[0], coords[1], coords[2]);
      }
      return point;
    },
    /**
     * Method: parseGeometry.linestring
     * Given a KML node representing a linestring geometry, create a
     *     ZOO linestring geometry.
     *
     * Parameters:
     * node - {E4XElement} A KML LineString node.
     *
     * Returns:
     * {<ZOO.Geometry.LineString>} A linestring geometry.
     */
    'linestring': function(node, ring) {
      var line = null;
      var coordString = node.*::coordinates.toString();
      coordString = coordString.replace(this.regExes.trimSpace,
          "");
      coordString = coordString.replace(this.regExes.trimComma,
          ",");
      var pointList = coordString.split(this.regExes.splitSpace);
      var numPoints = pointList.length;
      var points = new Array(numPoints);
      var coords, numCoords;
      for(var i=0; i<numPoints; ++i) {
        coords = pointList[i].split(",");
        numCoords = coords.length;
        if(numCoords > 1) {
          if(coords.length == 2) {
            coords[2] = null;
          }
          points[i] = new ZOO.Geometry.Point(coords[0],
                                             coords[1],
                                             coords[2]);
        }
      }
      if(numPoints) {
        if(ring) {
          line = new ZOO.Geometry.LinearRing(points);
        } else {
          line = new ZOO.Geometry.LineString(points);
        }
      } else {
        throw "Bad LineString coordinates: " + coordString;
      }
      return line;
    },
    /**
     * Method: parseGeometry.polygon
     * Given a KML node representing a polygon geometry, create a
     *     ZOO polygon geometry.
     *
     * Parameters:
     * node - {E4XElement} A KML Polygon node.
     *
     * Returns:
     * {<ZOO.Geometry.Polygon>} A polygon geometry.
     */
    'polygon': function(node) {
      var nodeList = node..*::LinearRing;
      var numRings = nodeList.length();
      var components = new Array(numRings);
      if(numRings > 0) {
        // this assumes exterior ring first, inner rings after
        var ring;
        for(var i=0, len=nodeList.length(); i<len; ++i) {
          ring = this.parseGeometry.linestring.apply(this,
                                                     [nodeList[i], true]);
          if(ring) {
            components[i] = ring;
          } else {
            throw "Bad LinearRing geometry: " + i;
          }
        }
      }
      return new ZOO.Geometry.Polygon(components);
    },
    /**
     * Method: parseGeometry.multigeometry
     * Given a KML node representing a multigeometry, create a
     *     ZOO geometry collection.
     *
     * Parameters:
     * node - {E4XElement} A KML MultiGeometry node.
     *
     * Returns:
     * {<ZOO.Geometry.Collection>} A geometry collection.
     */
    'multigeometry': function(node) {
      var child, parser;
      var parts = [];
      var children = node.*::*;
      for(var i=0, len=children.length(); i<len; ++i ) {
        child = children[i];
        var type = child.localName();
        var parser = this.parseGeometry[type.toLowerCase()];
        if(parser) {
          parts.push(parser.apply(this, [child]));
        }
      }
      return new ZOO.Geometry.Collection(parts);
    }
  },
  /**
   * Method: parseAttributes
   *
   * Parameters:
   * node - {E4XElement}
   *
   * Returns:
   * {Object} An attributes object.
   */
  parseAttributes: function(node) {
    var attributes = {};
    var edNodes = node.*::ExtendedData;
    if (edNodes.length() > 0) {
      attributes = this.parseExtendedData(edNodes[0])
    }
    var child, grandchildren;
    var children = node.*::*;
    for(var i=0, len=children.length(); i<len; ++i) {
      child = children[i];
      grandchildren = child..*::*;
      if(grandchildren.length() == 1) {
        var name = child.localName();
        var value = child.toString();
        if (value) {
          value = value.replace(this.regExes.trimSpace, "");
          attributes[name] = value;
        }
      }
    }
    return attributes;
  },
  /**
   * Method: parseExtendedData
   * Parse ExtendedData from KML. Limited support for schemas/datatypes.
   *     See http://code.google.com/apis/kml/documentation/kmlreference.html#extendeddata
   *     for more information on extendeddata.
   *
   * Parameters:
   * node - {E4XElement}
   *
   * Returns:
   * {Object} An attributes object.
   */
  parseExtendedData: function(node) {
    var attributes = {};
    var dataNodes = node.*::Data;
    for (var i = 0, len = dataNodes.length(); i < len; i++) {
      var data = dataNodes[i];
      var key = data.@name;
      var ed = {};
      var valueNode = data.*::value;
      if (valueNode.length() > 0)
        ed['value'] = valueNode[0].toString();
      var nameNode = data.*::displayName;
      if (nameNode.length() > 0)
        ed['displayName'] = valueNode[0].toString();
      attributes[key] = ed;
    }
    return attributes;
  },
  /**
   * Method: write
   * Accept Feature Collection, and return a string. 
   * 
   * Parameters:
   * features - {Array(<ZOO.Feature>} An array of features.
   *
   * Returns:
   * {String} A KML string.
   */
  write: function(features) {
    if(!(features instanceof Array))
      features = [features];
    var kml = new XML('<kml xmlns="'+this.kmlns+'"></kml>');
    var folder = kml.Document.Folder;
    folder.name = this.foldersName;
    folder.description = this.foldersDesc;
    for(var i=0, len=features.length; i<len; ++i) {
      folder.Placemark[i] = this.createPlacemark(features[i]);
    }
    return kml.toXMLString();
  },
  /**
   * Method: createPlacemark
   * Creates and returns a KML placemark node representing the given feature. 
   * 
   * Parameters:
   * feature - {<ZOO.Feature>}
   * 
   * Returns:
   * {E4XElement}
   */
  createPlacemark: function(feature) {
    var placemark = new XML('<Placemark xmlns="'+this.kmlns+'"></Placemark>');
    placemark.name = (feature.attributes.name) ?
                    feature.attributes.name : feature.id;
    placemark.description = (feature.attributes.description) ?
                             feature.attributes.description : this.placemarksDesc;
    if(feature.fid != null)
      placemark.@id = feature.fid;
    placemark.*[2] = this.buildGeometryNode(feature.geometry);
    return placemark;
  },
  /**
   * Method: buildGeometryNode
   * Builds and returns a KML geometry node with the given geometry.
   * 
   * Parameters:
   * geometry - {<ZOO.Geometry>}
   * 
   * Returns:
   * {E4XElement}
   */
  buildGeometryNode: function(geometry) {
    if (this.internalProjection && this.externalProjection) {
      geometry = geometry.clone();
      geometry.transform(this.internalProjection, 
                         this.externalProjection);
    }
    var className = geometry.CLASS_NAME;
    var type = className.substring(className.lastIndexOf(".") + 1);
    var builder = this.buildGeometry[type.toLowerCase()];
    var node = null;
    if(builder) {
      node = builder.apply(this, [geometry]);
    }
    return node;
  },
  /**
   * Property: buildGeometry
   * Object containing methods to do the actual geometry node building
   *     based on geometry type.
   */
  buildGeometry: {
    /**
     * Method: buildGeometry.point
     * Given a ZOO point geometry, create a KML point.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.Point>} A point geometry.
     *
     * Returns:
     * {E4XElement} A KML point node.
     */
    'point': function(geometry) {
      var kml = new XML('<Point xmlns="'+this.kmlns+'"></Point>');
      kml.coordinates = this.buildCoordinatesNode(geometry);
      return kml;
    },
    /**
     * Method: buildGeometry.multipoint
     * Given a ZOO multipoint geometry, create a KML
     *     GeometryCollection.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.MultiPoint>} A multipoint geometry.
     *
     * Returns:
     * {E4XElement} A KML GeometryCollection node.
     */
    'multipoint': function(geometry) {
      return this.buildGeometry.collection.apply(this, [geometry]);
    },
    /**
     * Method: buildGeometry.linestring
     * Given a ZOO linestring geometry, create a KML linestring.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.LineString>} A linestring geometry.
     *
     * Returns:
     * {E4XElement} A KML linestring node.
     */
    'linestring': function(geometry) {
      var kml = new XML('<LineString xmlns="'+this.kmlns+'"></LineString>');
      kml.coordinates = this.buildCoordinatesNode(geometry);
      return kml;
    },
    /**
     * Method: buildGeometry.multilinestring
     * Given a ZOO multilinestring geometry, create a KML
     *     GeometryCollection.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.MultiLineString>} A multilinestring geometry.
     *
     * Returns:
     * {E4XElement} A KML GeometryCollection node.
     */
    'multilinestring': function(geometry) {
      return this.buildGeometry.collection.apply(this, [geometry]);
    },
    /**
     * Method: buildGeometry.linearring
     * Given a ZOO linearring geometry, create a KML linearring.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.LinearRing>} A linearring geometry.
     *
     * Returns:
     * {E4XElement} A KML linearring node.
     */
    'linearring': function(geometry) {
      var kml = new XML('<LinearRing xmlns="'+this.kmlns+'"></LinearRing>');
      kml.coordinates = this.buildCoordinatesNode(geometry);
      return kml;
    },
    /**
     * Method: buildGeometry.polygon
     * Given a ZOO polygon geometry, create a KML polygon.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.Polygon>} A polygon geometry.
     *
     * Returns:
     * {E4XElement} A KML polygon node.
     */
    'polygon': function(geometry) {
      var kml = new XML('<Polygon xmlns="'+this.kmlns+'"></Polygon>');
      var rings = geometry.components;
      var ringMember, ringGeom, type;
      for(var i=0, len=rings.length; i<len; ++i) {
        type = (i==0) ? "outerBoundaryIs" : "innerBoundaryIs";
        ringMember = new XML('<'+type+' xmlns="'+this.kmlns+'"></'+type+'>');
        ringMember.LinearRing = this.buildGeometry.linearring.apply(this,[rings[i]]);
        kml.*[i] = ringMember;
      }
      return kml;
    },
    /**
     * Method: buildGeometry.multipolygon
     * Given a ZOO multipolygon geometry, create a KML
     *     GeometryCollection.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.Point>} A multipolygon geometry.
     *
     * Returns:
     * {E4XElement} A KML GeometryCollection node.
     */
    'multipolygon': function(geometry) {
      return this.buildGeometry.collection.apply(this, [geometry]);
    },
    /**
     * Method: buildGeometry.collection
     * Given a ZOO geometry collection, create a KML MultiGeometry.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.Collection>} A geometry collection.
     *
     * Returns:
     * {E4XElement} A KML MultiGeometry node.
     */
    'collection': function(geometry) {
      var kml = new XML('<MultiGeometry xmlns="'+this.kmlns+'"></MultiGeometry>');
      var child;
      for(var i=0, len=geometry.components.length; i<len; ++i) {
        kml.*[i] = this.buildGeometryNode.apply(this,[geometry.components[i]]);
      }
      return kml;
    }
  },
  /**
   * Method: buildCoordinatesNode
   * Builds and returns the KML coordinates node with the given geometry
   *     <coordinates>...</coordinates>
   * 
   * Parameters:
   * geometry - {<ZOO.Geometry>}
   * 
   * Return:
   * {E4XElement}
   */
  buildCoordinatesNode: function(geometry) {
    var cooridnates = new XML('<coordinates xmlns="'+this.kmlns+'"></coordinates>');
    var points = geometry.components;
    if(points) {
      // LineString or LinearRing
      var point;
      var numPoints = points.length;
      var parts = new Array(numPoints);
      for(var i=0; i<numPoints; ++i) {
        point = points[i];
        parts[i] = point.x + "," + point.y;
      }
      coordinates = parts.join(" ");
    } else {
      // Point
      coordinates = geometry.x + "," + geometry.y;
    }
    return coordinates;
  },
  CLASS_NAME: 'ZOO.Format.KML'
});
/**
 * Class: ZOO.Format.GML
 * Read/Write GML. Create a new instance with the <ZOO.Format.GML>
 *     constructor.  Supports the GML simple features profile.
 * 
 * Inherits from:
 *  - <ZOO.Format>
 */
ZOO.Format.GML = ZOO.Class(ZOO.Format, {
  /**
   * Property: schemaLocation
   * {String} Schema location for a particular minor version.
   */
  schemaLocation: "http://www.opengis.net/gml http://schemas.opengis.net/gml/2.1.2/feature.xsd",
  /**
   * Property: namespaces
   * {Object} Mapping of namespace aliases to namespace URIs.
   */
  namespaces: {
    ogr: "http://ogr.maptools.org/",
    gml: "http://www.opengis.net/gml",
    xlink: "http://www.w3.org/1999/xlink",
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
    wfs: "http://www.opengis.net/wfs" // this is a convenience for reading wfs:FeatureCollection
  },
  /**
   * Property: defaultPrefix
   */
  defaultPrefix: 'ogr',
  /** 
   * Property: collectionName
   * {String} Name of featureCollection element.
   */
  collectionName: "FeatureCollection",
  /*
   * Property: featureName
   * {String} Element name for features. Default is "sql_statement".
   */
  featureName: "sql_statement",
  /**
   * Property: geometryName
   * {String} Name of geometry element.  Defaults to "geometryProperty".
   */
  geometryName: "geometryProperty",
  /**
   * Property: xy
   * {Boolean} Order of the GML coordinate true:(x,y) or false:(y,x)
   * Changing is not recommended, a new Format should be instantiated.
   */
  xy: true,
  /**
   * Property: extractAttributes
   * {Boolean} Could we extract attributes
   */
  extractAttributes: true,
  /**
   * Constructor: ZOO.Format.GML
   * Create a new parser for GML.
   *
   * Parameters:
   * options - {Object} An optional object whose properties will be set on
   *     this instance.
   */
  initialize: function(options) {
    // compile regular expressions once instead of every time they are used
    this.regExes = {
      trimSpace: (/^\s*|\s*$/g),
      removeSpace: (/\s*/g),
      splitSpace: (/\s+/),
      trimComma: (/\s*,\s*/g)
    };
    ZOO.Format.prototype.initialize.apply(this, [options]);
  },
  /**
   * Method: read
   * Read data from a string, and return a list of features. 
   * 
   * Parameters:
   * data - {String} data to read/parse.
   *
   * Returns:
   * {Array(<ZOO.Feature>)} An array of features.
   */
  read: function(data) {
    this.features = [];
    data = data.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
    data = new XML(data);

    var gmlns = Namespace(this.namespaces['gml']);
    var featureNodes = data..gmlns::featureMember;
    if (data.localName() == 'featureMember')
      featureNodes = data;
    var features = [];
    for(var i=0,len=featureNodes.length(); i<len; i++) {
      var feature = this.parseFeature(featureNodes[i]);
      if(feature) {
        features.push(feature);
      }
    }
    return features;
  },
  /**
   * Method: parseFeature
   * This function is the core of the GML parsing code in ZOO.
   *    It creates the geometries that are then attached to the returned
   *    feature, and calls parseAttributes() to get attribute data out.
   *    
   * Parameters:
   * node - {E4XElement} A GML feature node. 
   */
  parseFeature: function(node) {
    // only accept one geometry per feature - look for highest "order"
    var gmlns = Namespace(this.namespaces['gml']);
    var order = ["MultiPolygon", "Polygon",
                 "MultiLineString", "LineString",
                 "MultiPoint", "Point", "Envelope", "Box"];
    var type, nodeList, geometry, parser;
    for(var i=0; i<order.length; ++i) {
      type = order[i];
      nodeList = node.descendants(QName(gmlns,type));
      if (nodeList.length() > 0) {
        var parser = this.parseGeometry[type.toLowerCase()];
        if(parser) {
          geometry = parser.apply(this, [nodeList[0]]);
          if (this.internalProjection && this.externalProjection) {
            geometry.transform(this.externalProjection, 
                               this.internalProjection); 
          }                       
        }
        // stop looking for different geometry types
        break;
      }
    }
    var attributes;
    if(this.extractAttributes) {
      attributes = this.parseAttributes(node);
    }
    var feature = new ZOO.Feature(geometry, attributes);
    return feature;
  },
  /**
   * Property: parseGeometry
   * Properties of this object are the functions that parse geometries based
   *     on their type.
   */
  parseGeometry: {
    /**
     * Method: parseGeometry.point
     * Given a GML node representing a point geometry, create a ZOO
     *     point geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.Point>} A point geometry.
     */
    'point': function(node) {
      /**
       * Three coordinate variations to consider:
       * 1) <gml:pos>x y z</gml:pos>
       * 2) <gml:coordinates>x, y, z</gml:coordinates>
       * 3) <gml:coord><gml:X>x</gml:X><gml:Y>y</gml:Y></gml:coord>
       */
      var nodeList, coordString;
      var coords = [];
      // look for <gml:pos>
      var nodeList = node..*::pos;
      if(nodeList.length() > 0) {
        coordString = nodeList[0].toString();
        coordString = coordString.replace(this.regExes.trimSpace, "");
        coords = coordString.split(this.regExes.splitSpace);
      }
      // look for <gml:coordinates>
      if(coords.length == 0) {
        nodeList = node..*::coordinates;
        if(nodeList.length() > 0) {
          coordString = nodeList[0].toString();
          coordString = coordString.replace(this.regExes.removeSpace,"");
          coords = coordString.split(",");
        }
      }
      // look for <gml:coord>
      if(coords.length == 0) {
        nodeList = node..*::coord;
        if(nodeList.length() > 0) {
          var xList = nodeList[0].*::X;
          var yList = nodeList[0].*::Y;
          if(xList.length() > 0 && yList.length() > 0)
            coords = [xList[0].toString(),
                      yList[0].toString()];
        }
      }
      // preserve third dimension
      if(coords.length == 2)
        coords[2] = null;
      if (this.xy)
        return new ZOO.Geometry.Point(coords[0],coords[1],coords[2]);
      else
        return new ZOO.Geometry.Point(coords[1],coords[0],coords[2]);
    },
    /**
     * Method: parseGeometry.multipoint
     * Given a GML node representing a multipoint geometry, create a
     *     ZOO multipoint geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.MultiPoint>} A multipoint geometry.
     */
    'multipoint': function(node) {
      var nodeList = node..*::Point;
      var components = [];
      if(nodeList.length() > 0) {
        var point;
        for(var i=0, len=nodeList.length(); i<len; ++i) {
          point = this.parseGeometry.point.apply(this, [nodeList[i]]);
          if(point)
            components.push(point);
        }
      }
      return new ZOO.Geometry.MultiPoint(components);
    },
    /**
     * Method: parseGeometry.linestring
     * Given a GML node representing a linestring geometry, create a
     *     ZOO linestring geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.LineString>} A linestring geometry.
     */
    'linestring': function(node, ring) {
      /**
       * Two coordinate variations to consider:
       * 1) <gml:posList dimension="d">x0 y0 z0 x1 y1 z1</gml:posList>
       * 2) <gml:coordinates>x0, y0, z0 x1, y1, z1</gml:coordinates>
       */
      var nodeList, coordString;
      var coords = [];
      var points = [];
      // look for <gml:posList>
      nodeList = node..*::posList;
      if(nodeList.length() > 0) {
        coordString = nodeList[0].toString();
        coordString = coordString.replace(this.regExes.trimSpace, "");
        coords = coordString.split(this.regExes.splitSpace);
        var dim = parseInt(nodeList[0].@dimension);
        var j, x, y, z;
        for(var i=0; i<coords.length/dim; ++i) {
          j = i * dim;
          x = coords[j];
          y = coords[j+1];
          z = (dim == 2) ? null : coords[j+2];
          if (this.xy)
            points.push(new ZOO.Geometry.Point(x, y, z));
          else
            points.push(new Z0O.Geometry.Point(y, x, z));
        }
      }
      // look for <gml:coordinates>
      if(coords.length == 0) {
        nodeList = node..*::coordinates;
        if(nodeList.length() > 0) {
          coordString = nodeList[0].toString();
          coordString = coordString.replace(this.regExes.trimSpace,"");
          coordString = coordString.replace(this.regExes.trimComma,",");
          var pointList = coordString.split(this.regExes.splitSpace);
          for(var i=0; i<pointList.length; ++i) {
            coords = pointList[i].split(",");
            if(coords.length == 2)
              coords[2] = null;
            if (this.xy)
              points.push(new ZOO.Geometry.Point(coords[0],coords[1],coords[2]));
            else
              points.push(new ZOO.Geometry.Point(coords[1],coords[0],coords[2]));
          }
        }
      }
      var line = null;
      if(points.length != 0) {
        if(ring)
          line = new ZOO.Geometry.LinearRing(points);
        else
          line = new ZOO.Geometry.LineString(points);
      }
      return line;
    },
    /**
     * Method: parseGeometry.multilinestring
     * Given a GML node representing a multilinestring geometry, create a
     *     ZOO multilinestring geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.MultiLineString>} A multilinestring geometry.
     */
    'multilinestring': function(node) {
      var nodeList = node..*::LineString;
      var components = [];
      if(nodeList.length() > 0) {
        var line;
        for(var i=0, len=nodeList.length(); i<len; ++i) {
          line = this.parseGeometry.linestring.apply(this, [nodeList[i]]);
          if(point)
            components.push(point);
        }
      }
      return new ZOO.Geometry.MultiLineString(components);
    },
    /**
     * Method: parseGeometry.polygon
     * Given a GML node representing a polygon geometry, create a
     *     ZOO polygon geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.Polygon>} A polygon geometry.
     */
    'polygon': function(node) {
      nodeList = node..*::LinearRing;
      var components = [];
      if(nodeList.length() > 0) {
        // this assumes exterior ring first, inner rings after
        var ring;
        for(var i=0, len = nodeList.length(); i<len; ++i) {
          ring = this.parseGeometry.linestring.apply(this,[nodeList[i], true]);
          if(ring)
            components.push(ring);
        }
      }
      return new ZOO.Geometry.Polygon(components);
    },
    /**
     * Method: parseGeometry.multipolygon
     * Given a GML node representing a multipolygon geometry, create a
     *     ZOO multipolygon geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.MultiPolygon>} A multipolygon geometry.
     */
    'multipolygon': function(node) {
      var nodeList = node..*::Polygon;
      var components = [];
      if(nodeList.length() > 0) {
        var polygon;
        for(var i=0, len=nodeList.length(); i<len; ++i) {
          polygon = this.parseGeometry.polygon.apply(this, [nodeList[i]]);
          if(polygon)
            components.push(polygon);
        }
      }
      return new ZOO.Geometry.MultiPolygon(components);
    },
    /**
     * Method: parseGeometry.envelope
     * Given a GML node representing an envelope, create a
     *     ZOO polygon geometry.
     *
     * Parameters:
     * node - {E4XElement} A GML node.
     *
     * Returns:
     * {<ZOO.Geometry.Polygon>} A polygon geometry.
     */
    'envelope': function(node) {
      var components = [];
      var coordString;
      var envelope;
      var lpoint = node..*::lowerCorner;
      if (lpoint.length() > 0) {
        var coords = [];
        if(lpoint.length() > 0) {
          coordString = lpoint[0].toString();
          coordString = coordString.replace(this.regExes.trimSpace, "");
          coords = coordString.split(this.regExes.splitSpace);
        }
        if(coords.length == 2)
          coords[2] = null;
        if (this.xy)
          var lowerPoint = new ZOO.Geometry.Point(coords[0], coords[1],coords[2]);
        else
          var lowerPoint = new ZOO.Geometry.Point(coords[1], coords[0],coords[2]);
      }
      var upoint = node..*::upperCorner;
      if (upoint.length() > 0) {
        var coords = [];
        if(upoint.length > 0) {
          coordString = upoint[0].toString();
          coordString = coordString.replace(this.regExes.trimSpace, "");
          coords = coordString.split(this.regExes.splitSpace);
        }
        if(coords.length == 2)
          coords[2] = null;
        if (this.xy)
          var upperPoint = new ZOO.Geometry.Point(coords[0], coords[1],coords[2]);
        else
          var upperPoint = new ZOO.Geometry.Point(coords[1], coords[0],coords[2]);
      }
      if (lowerPoint && upperPoint) {
        components.push(new ZOO.Geometry.Point(lowerPoint.x, lowerPoint.y));
        components.push(new ZOO.Geometry.Point(upperPoint.x, lowerPoint.y));
        components.push(new ZOO.Geometry.Point(upperPoint.x, upperPoint.y));
        components.push(new ZOO.Geometry.Point(lowerPoint.x, upperPoint.y));
        components.push(new ZOO.Geometry.Point(lowerPoint.x, lowerPoint.y));
        var ring = new ZOO.Geometry.LinearRing(components);
        envelope = new ZOO.Geometry.Polygon([ring]);
      }
      return envelope;
    }
  },
  /**
   * Method: parseAttributes
   *
   * Parameters:
   * node - {<E4XElement>}
   *
   * Returns:
   * {Object} An attributes object.
   */
  parseAttributes: function(node) {
    var attributes = {};
    // assume attributes are children of the first type 1 child
    var childNode = node.*::*[0];
    var child, grandchildren;
    var children = childNode.*::*;
    for(var i=0, len=children.length(); i<len; ++i) {
      child = children[i];
      grandchildren = child..*::*;
      if(grandchildren.length() == 1) {
        var name = child.localName();
        var value = child.toString();
        if (value) {
          value = value.replace(this.regExes.trimSpace, "");
          attributes[name] = value;
        } else
          attributes[name] = null;
      }
    }
    return attributes;
  },
  /**
   * Method: write
   * Generate a GML document string given a list of features. 
   * 
   * Parameters:
   * features - {Array(<ZOO.Feature>)} List of features to
   *     serialize into a string.
   *
   * Returns:
   * {String} A string representing the GML document.
   */
  write: function(features) {
    if(!(features instanceof Array)) {
      features = [features];
    }
    var pfx = this.defaultPrefix;
    var name = pfx+':'+this.collectionName;
    var gml = new XML('<'+name+' xmlns:'+pfx+'="'+this.namespaces[pfx]+'" xmlns:gml="'+this.namespaces['gml']+'" xmlns:xsi="'+this.namespaces['xsi']+'" xsi:schemaLocation="'+this.schemaLocation+'"></'+name+'>');
    for(var i=0; i<features.length; i++) {
      gml.*::*[i] = this.createFeature(features[i]);
    }
    return gml.toXMLString();
  },
  /** 
   * Method: createFeature
   * Accept an ZOO.Feature, and build a GML node for it.
   *
   * Parameters:
   * feature - {<ZOO.Feature>} The feature to be built as GML.
   *
   * Returns:
   * {E4XElement} A node reprensting the feature in GML.
   */
  createFeature: function(feature) {
    var pfx = this.defaultPrefix;
    var name = pfx+':'+this.featureName;
    var fid = feature.fid || feature.id;
    var gml = new XML('<gml:featureMember xmlns:gml="'+this.namespaces['gml']+'"><'+name+' xmlns:'+pfx+'="'+this.namespaces[pfx]+'" fid="'+fid+'"></'+name+'></gml:featureMember>');
    var geometry = feature.geometry;
    gml.*::*[0].*::* = this.buildGeometryNode(geometry);
    for(var attr in feature.attributes) {
      var attrNode = new XML('<'+pfx+':'+attr+' xmlns:'+pfx+'="'+this.namespaces[pfx]+'">'+feature.attributes[attr]+'</'+pfx+':'+attr+'>');
      gml.*::*[0].appendChild(attrNode);
    }
    return gml;
  },
  /**
   * Method: buildGeometryNode
   *
   * Parameters:
   * geometry - {<ZOO.Geometry>} The geometry to be built as GML.
   *
   * Returns:
   * {E4XElement} A node reprensting the geometry in GML.
   */
  buildGeometryNode: function(geometry) {
    if (this.externalProjection && this.internalProjection) {
      geometry = geometry.clone();
      geometry.transform(this.internalProjection, 
          this.externalProjection);
    }    
    var className = geometry.CLASS_NAME;
    var type = className.substring(className.lastIndexOf(".") + 1);
    var builder = this.buildGeometry[type.toLowerCase()];
    var pfx = this.defaultPrefix;
    var name = pfx+':'+this.geometryName;
    var gml = new XML('<'+name+' xmlns:'+pfx+'="'+this.namespaces[pfx]+'"></'+name+'>');
    if (builder)
      gml.*::* = builder.apply(this, [geometry]);
    return gml;
  },
  /**
   * Property: buildGeometry
   * Object containing methods to do the actual geometry node building
   *     based on geometry type.
   */
  buildGeometry: {
    /**
     * Method: buildGeometry.point
     * Given a ZOO point geometry, create a GML point.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.Point>} A point geometry.
     *
     * Returns:
     * {E4XElement} A GML point node.
     */
    'point': function(geometry) {
      var gml = new XML('<gml:Point xmlns:gml="'+this.namespaces['gml']+'"></gml:Point>');
      gml.*::*[0] = this.buildCoordinatesNode(geometry);
      return gml;
    },
    /**
     * Method: buildGeometry.multipoint
     * Given a ZOO multipoint geometry, create a GML multipoint.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.MultiPoint>} A multipoint geometry.
     *
     * Returns:
     * {E4XElement} A GML multipoint node.
     */
    'multipoint': function(geometry) {
      var gml = new XML('<gml:MultiPoint xmlns:gml="'+this.namespaces['gml']+'"></gml:MultiPoint>');
      var points = geometry.components;
      var pointMember;
      for(var i=0; i<points.length; i++) { 
        pointMember = new XML('<gml:pointMember xmlns:gml="'+this.namespaces['gml']+'"></gml:pointMember>');
        pointMember.*::* = this.buildGeometry.point.apply(this,[points[i]]);
        gml.*::*[i] = pointMember;
      }
      return gml;            
    },
    /**
     * Method: buildGeometry.linestring
     * Given a ZOO linestring geometry, create a GML linestring.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.LineString>} A linestring geometry.
     *
     * Returns:
     * {E4XElement} A GML linestring node.
     */
    'linestring': function(geometry) {
      var gml = new XML('<gml:LineString xmlns:gml="'+this.namespaces['gml']+'"></gml:LineString>');
      gml.*::*[0] = this.buildCoordinatesNode(geometry);
      return gml;
    },
    /**
     * Method: buildGeometry.multilinestring
     * Given a ZOO multilinestring geometry, create a GML
     *     multilinestring.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.MultiLineString>} A multilinestring
     *     geometry.
     *
     * Returns:
     * {E4XElement} A GML multilinestring node.
     */
    'multilinestring': function(geometry) {
      var gml = new XML('<gml:MultiLineString xmlns:gml="'+this.namespaces['gml']+'"></gml:MultiLineString>');
      var lines = geometry.components;
      var lineMember;
      for(var i=0; i<lines.length; i++) { 
        lineMember = new XML('<gml:lineStringMember xmlns:gml="'+this.namespaces['gml']+'"></gml:lineStringMember>');
        lineMember.*::* = this.buildGeometry.linestring.apply(this,[lines[i]]);
        gml.*::*[i] = lineMember;
      }
      return gml;            
    },
    /**
     * Method: buildGeometry.linearring
     * Given a ZOO linearring geometry, create a GML linearring.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.LinearRing>} A linearring geometry.
     *
     * Returns:
     * {E4XElement} A GML linearring node.
     */
    'linearring': function(geometry) {
      var gml = new XML('<gml:LinearRing xmlns:gml="'+this.namespaces['gml']+'"></gml:LinearRing>');
      gml.*::*[0] = this.buildCoordinatesNode(geometry);
      return gml;
    },
    /**
     * Method: buildGeometry.polygon
     * Given an ZOO polygon geometry, create a GML polygon.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.Polygon>} A polygon geometry.
     *
     * Returns:
     * {E4XElement} A GML polygon node.
     */
    'polygon': function(geometry) {
      var gml = new XML('<gml:Polygon xmlns:gml="'+this.namespaces['gml']+'"></gml:Polygon>');
      var rings = geometry.components;
      var ringMember, type;
      for(var i=0; i<rings.length; ++i) {
        type = (i==0) ? "outerBoundaryIs" : "innerBoundaryIs";
        var ringMember = new XML('<gml:'+type+' xmlns:gml="'+this.namespaces['gml']+'"></gml:'+type+'>');
        ringMember.*::* = this.buildGeometry.linearring.apply(this,[rings[i]]);
        gml.*::*[i] = ringMember;
      }
      return gml;
    },
    /**
     * Method: buildGeometry.multipolygon
     * Given a ZOO multipolygon geometry, create a GML multipolygon.
     *
     * Parameters:
     * geometry - {<ZOO.Geometry.MultiPolygon>} A multipolygon
     *     geometry.
     *
     * Returns:
     * {E4XElement} A GML multipolygon node.
     */
    'multipolygon': function(geometry) {
      var gml = new XML('<gml:MultiPolygon xmlns:gml="'+this.namespaces['gml']+'"></gml:MultiPolygon>');
      var polys = geometry.components;
      var polyMember;
      for(var i=0; i<polys.length; i++) { 
        polyMember = new XML('<gml:polygonMember xmlns:gml="'+this.namespaces['gml']+'"></gml:polygonMember>');
        polyMember.*::* = this.buildGeometry.polygon.apply(this,[polys[i]]);
        gml.*::*[i] = polyMember;
      }
      return gml;            
    }
  },
  /**
   * Method: buildCoordinatesNode
   * builds the coordinates XmlNode
   * (code)
   * <gml:coordinates decimal="." cs="," ts=" ">...</gml:coordinates>
   * (end)
   * Parameters: 
   * geometry - {<ZOO.Geometry>} 
   *
   * Returns:
   * {E4XElement} created E4XElement
   */
  buildCoordinatesNode: function(geometry) {
    var parts = [];
    if(geometry instanceof ZOO.Bounds){
      parts.push(geometry.left + "," + geometry.bottom);
      parts.push(geometry.right + "," + geometry.top);
    } else {
      var points = (geometry.components) ? geometry.components : [geometry];
      for(var i=0; i<points.length; i++) {
        parts.push(points[i].x + "," + points[i].y);                
      }            
    }
    return new XML('<gml:coordinates xmlns:gml="'+this.namespaces['gml']+'" decimal="." cs=", " ts=" ">'+parts.join(" ")+'</gml:coordinates>');
  },
  CLASS_NAME: 'ZOO.Format.GML'
});
/**
 * Class: ZOO.Format.WPS
 * Read/Write WPS. Create a new instance with the <ZOO.Format.WPS>
 *     constructor. Supports only parseExecuteResponse.
 * 
 * Inherits from:
 *  - <ZOO.Format>
 */
ZOO.Format.WPS = ZOO.Class(ZOO.Format, {
  /**
   * Property: schemaLocation
   * {String} Schema location for a particular minor version.
   */
  schemaLocation: "http://www.opengis.net/wps/1.0.0/../wpsExecute_request.xsd",
  /**
   * Property: namespaces
   * {Object} Mapping of namespace aliases to namespace URIs.
   */
  namespaces: {
    ows: "http://www.opengis.net/ows/1.1",
    wps: "http://www.opengis.net/wps/1.0.0",
    xlink: "http://www.w3.org/1999/xlink",
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
  },
  /**
   * Method: read
   *
   * Parameters:
   * data - {String} A WPS xml document
   *
   * Returns:
   * {Object} Execute response.
   */
  read:function(data) {
    data = data.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
    data = new XML(data);
    switch (data.localName()) {
      case 'ExecuteResponse':
        return this.parseExecuteResponse(data);
      default:
        return null;
    }
  },
  /**
   * Method: parseExecuteResponse
   *
   * Parameters:
   * node - {E4XElement} A WPS ExecuteResponse document
   *
   * Returns:
   * {Object} Execute response.
   */
  parseExecuteResponse: function(node) {
    var outputs = node.*::ProcessOutputs.*::Output;
    if (outputs.length() > 0) {
      var res=[];
      for(var i=0;i<outputs.length();i++){
        var data = outputs[i].*::Data.*::*[0];
	if(!data){
          data = outputs[i].*::Reference;
	}
	var builder = this.parseData[data.localName().toLowerCase()];
	if (builder)
	  res.push(builder.apply(this,[data]));
	else
	  res.push(null);
      }
      return res.length>1?res:res[0];
    } else
      return null;
  },
  /**
   * Property: parseData
   * Object containing methods to analyse data response.
   */
  parseData: {
    /**
     * Method: parseData.complexdata
     * Given an Object representing the WPS complex data response.
     *
     * Parameters:
     * node - {E4XElement} A WPS node.
     *
     * Returns:
     * {Object} A WPS complex data response.
     */
    'complexdata': function(node) {
      var result = {value:node.toString()};
      if (node.@mimeType.length()>0)
        result.mimeType = node.@mimeType;
      if (node.@encoding.length()>0)
        result.encoding = node.@encoding;
      if (node.@schema.length()>0)
        result.schema = node.@schema;
      return result;
    },
    /**
     * Method: parseData.literaldata
     * Given an Object representing the WPS literal data response.
     *
     * Parameters:
     * node - {E4XElement} A WPS node.
     *
     * Returns:
     * {Object} A WPS literal data response.
     */
    'literaldata': function(node) {
      var result = {value:node.toString()};
      if (node.@dataType.length()>0)
        result.dataType = node.@dataType;
      if (node.@uom.length()>0)
        result.uom = node.@uom;
      return result;
    },
    /**
     * Method: parseData.reference
     * Given an Object representing the WPS reference response.
     *
     * Parameters:
     * node - {E4XElement} A WPS node.
     *
     * Returns:
     * {Object} A WPS reference response.
     */
    'reference': function(node) {
      var result = {type:'reference',value:node.@href};
      return result;
    }
  },
  CLASS_NAME: 'ZOO.Format.WPS'
});

/**
 * Class: ZOO.Feature
 * Vector features use the ZOO.Geometry classes as geometry description.
 * They have an 'attributes' property, which is the data object
 */
ZOO.Feature = ZOO.Class({
  /** 
   * Property: fid 
   * {String} 
   */
  fid: null,
  /** 
   * Property: geometry 
   * {<ZOO.Geometry>} 
   */
  geometry: null,
  /** 
   * Property: attributes 
   * {Object} This object holds arbitrary properties that describe the
   *     feature.
   */
  attributes: null,
  /**
   * Property: bounds
   * {<ZOO.Bounds>} The box bounding that feature's geometry, that
   *     property can be set by an <ZOO.Format> object when
   *     deserializing the feature, so in most cases it represents an
   *     information set by the server. 
   */
  bounds: null,
  /** 
   * Constructor: ZOO.Feature
   * Create a vector feature. 
   * 
   * Parameters:
   * geometry - {<ZOO.Geometry>} The geometry that this feature
   *     represents.
   * attributes - {Object} An optional object that will be mapped to the
   *     <attributes> property. 
   */
  initialize: function(geometry, attributes) {
    this.geometry = geometry ? geometry : null;
    this.attributes = {};
    if (attributes)
      this.attributes = ZOO.extend(this.attributes,attributes);
  },
  /** 
   * Method: destroy
   * nullify references to prevent circular references and memory leaks
   */
  destroy: function() {
    this.geometry = null;
  },
  /**
   * Method: clone
   * Create a clone of this vector feature.  Does not set any non-standard
   *     properties.
   *
   * Returns:
   * {<ZOO.Feature>} An exact clone of this vector feature.
   */
  clone: function () {
    return new ZOO.Feature(this.geometry ? this.geometry.clone() : null,
            this.attributes);
  },
  /**
   * Method: move
   * Moves the feature and redraws it at its new location
   *
   * Parameters:
   * x - {Float}
   * y - {Float}
   */
  move: function(x, y) {
    if(!this.geometry.move)
      return;

    this.geometry.move(x,y);
    return this.geometry;
  },
  CLASS_NAME: 'ZOO.Feature'
});

/**
 * Class: ZOO.Geometry
 * A Geometry is a description of a geographic object. Create an instance
 * of this class with the <ZOO.Geometry> constructor. This is a base class,
 * typical geometry types are described by subclasses of this class.
 */
ZOO.Geometry = ZOO.Class({
  /**
   * Property: id
   * {String} A unique identifier for this geometry.
   */
  id: null,
  /**
   * Property: parent
   * {<ZOO.Geometry>}This is set when a Geometry is added as component
   * of another geometry
   */
  parent: null,
  /**
   * Property: bounds 
   * {<ZOO.Bounds>} The bounds of this geometry
   */
  bounds: null,
  /**
   * Constructor: ZOO.Geometry
   * Creates a geometry object.  
   */
  initialize: function() {
    //generate unique id
  },
  /**
   * Method: destroy
   * Destroy this geometry.
   */
  destroy: function() {
    this.id = null;
    this.bounds = null;
  },
  /**
   * Method: clone
   * Create a clone of this geometry.  Does not set any non-standard
   *     properties of the cloned geometry.
   * 
   * Returns:
   * {<ZOO.Geometry>} An exact clone of this geometry.
   */
  clone: function() {
    return new ZOO.Geometry();
  },
  /**
   * Method: extendBounds
   * Extend the existing bounds to include the new bounds. 
   * If geometry's bounds is not yet set, then set a new Bounds.
   * 
   * Parameters:
   * newBounds - {<ZOO.Bounds>} 
   */
  extendBounds: function(newBounds){
    var bounds = this.getBounds();
    if (!bounds)
      this.setBounds(newBounds);
    else
      this.bounds.extend(newBounds);
  },
  /**
   * Set the bounds for this Geometry.
   * 
   * Parameters:
   * bounds - {<ZOO.Bounds>} 
   */
  setBounds: function(bounds) {
    if (bounds)
      this.bounds = bounds.clone();
  },
  /**
   * Method: clearBounds
   * Nullify this components bounds and that of its parent as well.
   */
  clearBounds: function() {
    this.bounds = null;
    if (this.parent)
      this.parent.clearBounds();
  },
  /**
   * Method: getBounds
   * Get the bounds for this Geometry. If bounds is not set, it 
   * is calculated again, this makes queries faster.
   * 
   * Returns:
   * {<ZOO.Bounds>}
   */
  getBounds: function() {
    if (this.bounds == null) {
      this.calculateBounds();
    }
    return this.bounds;
  },
  /** 
   * Method: calculateBounds
   * Recalculate the bounds for the geometry. 
   */
  calculateBounds: function() {
    // This should be overridden by subclasses.
    return this.bounds;
  },
  distanceTo: function(geometry, options) {
  },
  getVertices: function(nodes) {
  },
  getLength: function() {
    return 0.0;
  },
  getArea: function() {
    return 0.0;
  },
  getCentroid: function() {
    return null;
  },
  /**
   * Method: toString
   * Returns the Well-Known Text representation of a geometry
   *
   * Returns:
   * {String} Well-Known Text
   */
  toString: function() {
    return ZOO.Format.WKT.prototype.write(
        new ZOO.Feature(this)
    );
  },
  CLASS_NAME: 'ZOO.Geometry'
});
/**
 * Function: ZOO.Geometry.fromWKT
 * Generate a geometry given a Well-Known Text string.
 *
 * Parameters:
 * wkt - {String} A string representing the geometry in Well-Known Text.
 *
 * Returns:
 * {<ZOO.Geometry>} A geometry of the appropriate class.
 */
ZOO.Geometry.fromWKT = function(wkt) {
  var format = arguments.callee.format;
  if(!format) {
    format = new ZOO.Format.WKT();
    arguments.callee.format = format;
  }
  var geom;
  var result = format.read(wkt);
  if(result instanceof ZOO.Feature) {
    geom = result.geometry;
  } else if(result instanceof Array) {
    var len = result.length;
    var components = new Array(len);
    for(var i=0; i<len; ++i) {
      components[i] = result[i].geometry;
    }
    geom = new ZOO.Geometry.Collection(components);
  }
  return geom;
};
ZOO.Geometry.segmentsIntersect = function(seg1, seg2, options) {
  var point = options && options.point;
  var tolerance = options && options.tolerance;
  var intersection = false;
  var x11_21 = seg1.x1 - seg2.x1;
  var y11_21 = seg1.y1 - seg2.y1;
  var x12_11 = seg1.x2 - seg1.x1;
  var y12_11 = seg1.y2 - seg1.y1;
  var y22_21 = seg2.y2 - seg2.y1;
  var x22_21 = seg2.x2 - seg2.x1;
  var d = (y22_21 * x12_11) - (x22_21 * y12_11);
  var n1 = (x22_21 * y11_21) - (y22_21 * x11_21);
  var n2 = (x12_11 * y11_21) - (y12_11 * x11_21);
  if(d == 0) {
    // parallel
    if(n1 == 0 && n2 == 0) {
      // coincident
      intersection = true;
    }
  } else {
    var along1 = n1 / d;
    var along2 = n2 / d;
    if(along1 >= 0 && along1 <= 1 && along2 >=0 && along2 <= 1) {
      // intersect
      if(!point) {
        intersection = true;
      } else {
        // calculate the intersection point
        var x = seg1.x1 + (along1 * x12_11);
        var y = seg1.y1 + (along1 * y12_11);
        intersection = new ZOO.Geometry.Point(x, y);
      }
    }
  }
  if(tolerance) {
    var dist;
    if(intersection) {
      if(point) {
        var segs = [seg1, seg2];
        var seg, x, y;
        // check segment endpoints for proximity to intersection
        // set intersection to first endpoint within the tolerance
        outer: for(var i=0; i<2; ++i) {
          seg = segs[i];
          for(var j=1; j<3; ++j) {
            x = seg["x" + j];
            y = seg["y" + j];
            dist = Math.sqrt(
                Math.pow(x - intersection.x, 2) +
                Math.pow(y - intersection.y, 2)
            );
            if(dist < tolerance) {
              intersection.x = x;
              intersection.y = y;
              break outer;
            }
          }
        }
      }
    } else {
      // no calculated intersection, but segments could be within
      // the tolerance of one another
      var segs = [seg1, seg2];
      var source, target, x, y, p, result;
      // check segment endpoints for proximity to intersection
      // set intersection to first endpoint within the tolerance
      outer: for(var i=0; i<2; ++i) {
        source = segs[i];
        target = segs[(i+1)%2];
        for(var j=1; j<3; ++j) {
          p = {x: source["x"+j], y: source["y"+j]};
          result = ZOO.Geometry.distanceToSegment(p, target);
          if(result.distance < tolerance) {
            if(point) {
              intersection = new ZOO.Geometry.Point(p.x, p.y);
            } else {
              intersection = true;
            }
            break outer;
          }
        }
      }
    }
  }
  return intersection;
};
ZOO.Geometry.distanceToSegment = function(point, segment) {
  var x0 = point.x;
  var y0 = point.y;
  var x1 = segment.x1;
  var y1 = segment.y1;
  var x2 = segment.x2;
  var y2 = segment.y2;
  var dx = x2 - x1;
  var dy = y2 - y1;
  var along = ((dx * (x0 - x1)) + (dy * (y0 - y1))) /
               (Math.pow(dx, 2) + Math.pow(dy, 2));
  var x, y;
  if(along <= 0.0) {
    x = x1;
    y = y1;
  } else if(along >= 1.0) {
    x = x2;
    y = y2;
  } else {
    x = x1 + along * dx;
    y = y1 + along * dy;
  }
  return {
    distance: Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2)),
    x: x, y: y
  };
};
/**
 * Class: ZOO.Geometry.Collection
 * A Collection is exactly what it sounds like: A collection of different 
 * Geometries. These are stored in the local parameter <components> (which
 * can be passed as a parameter to the constructor). 
 * 
 * As new geometries are added to the collection, they are NOT cloned. 
 * When removing geometries, they need to be specified by reference (ie you 
 * have to pass in the *exact* geometry to be removed).
 * 
 * The <getArea> and <getLength> functions here merely iterate through
 * the components, summing their respective areas and lengths.
 *
 * Create a new instance with the <ZOO.Geometry.Collection> constructor.
 *
 * Inerhits from:
 *  - <ZOO.Geometry> 
 */
ZOO.Geometry.Collection = ZOO.Class(ZOO.Geometry, {
  /**
   * Property: components
   * {Array(<ZOO.Geometry>)} The component parts of this geometry
   */
  components: null,
  /**
   * Property: componentTypes
   * {Array(String)} An array of class names representing the types of
   * components that the collection can include.  A null value means the
   * component types are not restricted.
   */
  componentTypes: null,
  /**
   * Constructor: ZOO.Geometry.Collection
   * Creates a Geometry Collection -- a list of geoms.
   *
   * Parameters: 
   * components - {Array(<ZOO.Geometry>)} Optional array of geometries
   *
   */
  initialize: function (components) {
    ZOO.Geometry.prototype.initialize.apply(this, arguments);
    this.components = [];
    if (components != null) {
      this.addComponents(components);
    }
  },
  /**
   * Method: destroy
   * Destroy this geometry.
   */
  destroy: function () {
    this.components.length = 0;
    this.components = null;
  },
  /**
   * Method: clone
   * Clone this geometry.
   *
   * Returns:
   * {<ZOO.Geometry.Collection>} An exact clone of this collection
   */
  clone: function() {
    var geometry = eval("new " + this.CLASS_NAME + "()");
    for(var i=0, len=this.components.length; i<len; i++) {
      geometry.addComponent(this.components[i].clone());
    }
    return geometry;
  },
  /**
   * Method: getComponentsString
   * Get a string representing the components for this collection
   * 
   * Returns:
   * {String} A string representation of the components of this geometry
   */
  getComponentsString: function(){
    var strings = [];
    for(var i=0, len=this.components.length; i<len; i++) {
      strings.push(this.components[i].toShortString()); 
    }
    return strings.join(",");
  },
  /**
   * Method: calculateBounds
   * Recalculate the bounds by iterating through the components and 
   * calling extendBounds() on each item.
   */
  calculateBounds: function() {
    this.bounds = null;
    if ( this.components && this.components.length > 0) {
      this.setBounds(this.components[0].getBounds());
      for (var i=1, len=this.components.length; i<len; i++) {
        this.extendBounds(this.components[i].getBounds());
      }
    }
    return this.bounds
  },
  /**
   * APIMethod: addComponents
   * Add components to this geometry.
   *
   * Parameters:
   * components - {Array(<ZOO.Geometry>)} An array of geometries to add
   */
  addComponents: function(components){
    if(!(components instanceof Array))
      components = [components];
    for(var i=0, len=components.length; i<len; i++) {
      this.addComponent(components[i]);
    }
  },
  /**
   * Method: addComponent
   * Add a new component (geometry) to the collection.  If this.componentTypes
   * is set, then the component class name must be in the componentTypes array.
   *
   * The bounds cache is reset.
   * 
   * Parameters:
   * component - {<ZOO.Geometry>} A geometry to add
   * index - {int} Optional index into the array to insert the component
   *
   * Returns:
   * {Boolean} The component geometry was successfully added
   */
  addComponent: function(component, index) {
    var added = false;
    if(component) {
      if(this.componentTypes == null ||
          (ZOO.indexOf(this.componentTypes,
                       component.CLASS_NAME) > -1)) {
        if(index != null && (index < this.components.length)) {
          var components1 = this.components.slice(0, index);
          var components2 = this.components.slice(index, 
                                                  this.components.length);
          components1.push(component);
          this.components = components1.concat(components2);
        } else {
          this.components.push(component);
        }
        component.parent = this;
        this.clearBounds();
        added = true;
      }
    }
    return added;
  },
  /**
   * Method: removeComponents
   * Remove components from this geometry.
   *
   * Parameters:
   * components - {Array(<ZOO.Geometry>)} The components to be removed
   */
  removeComponents: function(components) {
    if(!(components instanceof Array))
      components = [components];
    for(var i=components.length-1; i>=0; --i) {
      this.removeComponent(components[i]);
    }
  },
  /**
   * Method: removeComponent
   * Remove a component from this geometry.
   *
   * Parameters:
   * component - {<ZOO.Geometry>} 
   */
  removeComponent: function(component) {      
    ZOO.removeItem(this.components, component);
    // clearBounds() so that it gets recalculated on the next call
    // to this.getBounds();
    this.clearBounds();
  },
  /**
   * Method: getLength
   * Calculate the length of this geometry
   *
   * Returns:
   * {Float} The length of the geometry
   */
  getLength: function() {
    var length = 0.0;
    for (var i=0, len=this.components.length; i<len; i++) {
      length += this.components[i].getLength();
    }
    return length;
  },
  /**
   * APIMethod: getArea
   * Calculate the area of this geometry. Note how this function is 
   * overridden in <ZOO.Geometry.Polygon>.
   *
   * Returns:
   * {Float} The area of the collection by summing its parts
   */
  getArea: function() {
    var area = 0.0;
    for (var i=0, len=this.components.length; i<len; i++) {
      area += this.components[i].getArea();
    }
    return area;
  },
  /** 
   * APIMethod: getGeodesicArea
   * Calculate the approximate area of the polygon were it projected onto
   *     the earth.
   *
   * Parameters:
   * projection - {<ZOO.Projection>} The spatial reference system
   *     for the geometry coordinates.  If not provided, Geographic/WGS84 is
   *     assumed.
   * 
   * Reference:
   * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
   *     Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
   *     Laboratory, Pasadena, CA, June 2007 http://trs-new.jpl.nasa.gov/dspace/handle/2014/40409
   *
   * Returns:
   * {float} The approximate geodesic area of the geometry in square meters.
   */
  getGeodesicArea: function(projection) {
    var area = 0.0;
    for(var i=0, len=this.components.length; i<len; i++) {
      area += this.components[i].getGeodesicArea(projection);
    }
    return area;
  },
  /**
   * Method: getCentroid
   *
   * Returns:
   * {<ZOO.Geometry.Point>} The centroid of the collection
   */
  getCentroid: function() {
    return this.components.length && this.components[0].getCentroid();
  },
  /**
   * Method: getGeodesicLength
   * Calculate the approximate length of the geometry were it projected onto
   *     the earth.
   *
   * Parameters:
   * projection - {<ZOO.Projection>} The spatial reference system
   *     for the geometry coordinates.  If not provided, Geographic/WGS84 is
   *     assumed.
   * 
   * Returns:
   * {Float} The appoximate geodesic length of the geometry in meters.
   */
  getGeodesicLength: function(projection) {
    var length = 0.0;
    for(var i=0, len=this.components.length; i<len; i++) {
      length += this.components[i].getGeodesicLength(projection);
    }
    return length;
  },
  /**
   * Method: move
   * Moves a geometry by the given displacement along positive x and y axes.
   *     This modifies the position of the geometry and clears the cached
   *     bounds.
   *
   * Parameters:
   * x - {Float} Distance to move geometry in positive x direction. 
   * y - {Float} Distance to move geometry in positive y direction.
   */
  move: function(x, y) {
    for(var i=0, len=this.components.length; i<len; i++) {
      this.components[i].move(x, y);
    }
  },
  /**
   * Method: rotate
   * Rotate a geometry around some origin
   *
   * Parameters:
   * angle - {Float} Rotation angle in degrees (measured counterclockwise
   *                 from the positive x-axis)
   * origin - {<ZOO.Geometry.Point>} Center point for the rotation
   */
  rotate: function(angle, origin) {
    for(var i=0, len=this.components.length; i<len; ++i) {
      this.components[i].rotate(angle, origin);
    }
  },
  /**
   * Method: resize
   * Resize a geometry relative to some origin.  Use this method to apply
   *     a uniform scaling to a geometry.
   *
   * Parameters:
   * scale - {Float} Factor by which to scale the geometry.  A scale of 2
   *                 doubles the size of the geometry in each dimension
   *                 (lines, for example, will be twice as long, and polygons
   *                 will have four times the area).
   * origin - {<ZOO.Geometry.Point>} Point of origin for resizing
   * ratio - {Float} Optional x:y ratio for resizing.  Default ratio is 1.
   * 
   * Returns:
   * {ZOO.Geometry} - The current geometry. 
   */
  resize: function(scale, origin, ratio) {
    for(var i=0; i<this.components.length; ++i) {
      this.components[i].resize(scale, origin, ratio);
    }
    return this;
  },
  distanceTo: function(geometry, options) {
    var edge = !(options && options.edge === false);
    var details = edge && options && options.details;
    var result, best;
    var min = Number.POSITIVE_INFINITY;
    for(var i=0, len=this.components.length; i<len; ++i) {
      result = this.components[i].distanceTo(geometry, options);
      distance = details ? result.distance : result;
      if(distance < min) {
        min = distance;
        best = result;
        if(min == 0)
          break;
      }
    }
    return best;
  },
  /** 
   * Method: equals
   * Determine whether another geometry is equivalent to this one.  Geometries
   *     are considered equivalent if all components have the same coordinates.
   * 
   * Parameters:
   * geom - {<ZOO.Geometry>} The geometry to test. 
   *
   * Returns:
   * {Boolean} The supplied geometry is equivalent to this geometry.
   */
  equals: function(geometry) {
    var equivalent = true;
    if(!geometry || !geometry.CLASS_NAME ||
       (this.CLASS_NAME != geometry.CLASS_NAME))
      equivalent = false;
    else if(!(geometry.components instanceof Array) ||
             (geometry.components.length != this.components.length))
      equivalent = false;
    else
      for(var i=0, len=this.components.length; i<len; ++i) {
        if(!this.components[i].equals(geometry.components[i])) {
          equivalent = false;
          break;
        }
      }
    return equivalent;
  },
  /**
   * Method: transform
   * Reproject the components geometry from source to dest.
   * 
   * Parameters:
   * source - {<ZOO.Projection>} 
   * dest - {<ZOO.Projection>}
   * 
   * Returns:
   * {<ZOO.Geometry>} 
   */
  transform: function(source, dest) {
    if (source && dest) {
      for (var i=0, len=this.components.length; i<len; i++) {  
        var component = this.components[i];
        component.transform(source, dest);
      }
      this.bounds = null;
    }
    return this;
  },
  /**
   * Method: intersects
   * Determine if the input geometry intersects this one.
   *
   * Parameters:
   * geometry - {<ZOO.Geometry>} Any type of geometry.
   *
   * Returns:
   * {Boolean} The input geometry intersects this one.
   */
  intersects: function(geometry) {
    var intersect = false;
    for(var i=0, len=this.components.length; i<len; ++ i) {
      intersect = geometry.intersects(this.components[i]);
      if(intersect)
        break;
    }
    return intersect;
  },
  /**
   * Method: getVertices
   * Return a list of all points in this geometry.
   *
   * Parameters:
   * nodes - {Boolean} For lines, only return vertices that are
   *     endpoints.  If false, for lines, only vertices that are not
   *     endpoints will be returned.  If not provided, all vertices will
   *     be returned.
   *
   * Returns:
   * {Array} A list of all vertices in the geometry.
   */
  getVertices: function(nodes) {
    var vertices = [];
    for(var i=0, len=this.components.length; i<len; ++i) {
      Array.prototype.push.apply(
          vertices, this.components[i].getVertices(nodes)
          );
    }
    return vertices;
  },
  CLASS_NAME: 'ZOO.Geometry.Collection'
});
/**
 * Class: ZOO.Geometry.Point
 * Point geometry class. 
 * 
 * Inherits from:
 *  - <ZOO.Geometry> 
 */
ZOO.Geometry.Point = ZOO.Class(ZOO.Geometry, {
  /** 
   * Property: x 
   * {float} 
   */
  x: null,
  /** 
   * Property: y 
   * {float} 
   */
  y: null,
  /**
   * Constructor: ZOO.Geometry.Point
   * Construct a point geometry.
   *
   * Parameters:
   * x - {float} 
   * y - {float}
   * 
   */
  initialize: function(x, y) {
    ZOO.Geometry.prototype.initialize.apply(this, arguments);
    this.x = parseFloat(x);
    this.y = parseFloat(y);
  },
  /**
   * Method: clone
   * 
   * Returns:
   * {<ZOO.Geometry.Point>} An exact clone of this ZOO.Geometry.Point
   */
  clone: function(obj) {
    if (obj == null)
      obj = new ZOO.Geometry.Point(this.x, this.y);
    // catch any randomly tagged-on properties
    // ZOO.Util.applyDefaults(obj, this);
    return obj;
  },
  /** 
   * Method: calculateBounds
   * Create a new Bounds based on the x/y
   */
  calculateBounds: function () {
    this.bounds = new ZOO.Bounds(this.x, this.y,
                                        this.x, this.y);
  },
  distanceTo: function(geometry, options) {
    var edge = !(options && options.edge === false);
    var details = edge && options && options.details;
    var distance, x0, y0, x1, y1, result;
    if(geometry instanceof ZOO.Geometry.Point) {
      x0 = this.x;
      y0 = this.y;
      x1 = geometry.x;
      y1 = geometry.y;
      distance = Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
      result = !details ?
        distance : {x0: x0, y0: y0, x1: x1, y1: y1, distance: distance};
    } else {
      result = geometry.distanceTo(this, options);
      if(details) {
        // switch coord order since this geom is target
        result = {
          x0: result.x1, y0: result.y1,
          x1: result.x0, y1: result.y0,
          distance: result.distance
        };
      }
    }
    return result;
  },
  /** 
   * Method: equals
   * Determine whether another geometry is equivalent to this one.  Geometries
   *     are considered equivalent if all components have the same coordinates.
   * 
   * Parameters:
   * geom - {<ZOO.Geometry.Point>} The geometry to test. 
   *
   * Returns:
   * {Boolean} The supplied geometry is equivalent to this geometry.
   */
  equals: function(geom) {
    var equals = false;
    if (geom != null)
      equals = ((this.x == geom.x && this.y == geom.y) ||
                (isNaN(this.x) && isNaN(this.y) && isNaN(geom.x) && isNaN(geom.y)));
    return equals;
  },
  /**
   * Method: toShortString
   *
   * Returns:
   * {String} Shortened String representation of Point object. 
   *         (ex. <i>"5, 42"</i>)
   */
  toShortString: function() {
    return (this.x + ", " + this.y);
  },
  /**
   * Method: move
   * Moves a geometry by the given displacement along positive x and y axes.
   *     This modifies the position of the geometry and clears the cached
   *     bounds.
   *
   * Parameters:
   * x - {Float} Distance to move geometry in positive x direction. 
   * y - {Float} Distance to move geometry in positive y direction.
   */
  move: function(x, y) {
    this.x = this.x + x;
    this.y = this.y + y;
    this.clearBounds();
  },
  /**
   * Method: rotate
   * Rotate a point around another.
   *
   * Parameters:
   * angle - {Float} Rotation angle in degrees (measured counterclockwise
   *                 from the positive x-axis)
   * origin - {<ZOO.Geometry.Point>} Center point for the rotation
   */
  rotate: function(angle, origin) {
        angle *= Math.PI / 180;
        var radius = this.distanceTo(origin);
        var theta = angle + Math.atan2(this.y - origin.y, this.x - origin.x);
        this.x = origin.x + (radius * Math.cos(theta));
        this.y = origin.y + (radius * Math.sin(theta));
        this.clearBounds();
  },
  /**
   * Method: getCentroid
   *
   * Returns:
   * {<ZOO.Geometry.Point>} The centroid of the collection
   */
  getCentroid: function() {
    return new ZOO.Geometry.Point(this.x, this.y);
  },
  /**
   * Method: resize
   * Resize a point relative to some origin.  For points, this has the effect
   *     of scaling a vector (from the origin to the point).  This method is
   *     more useful on geometry collection subclasses.
   *
   * Parameters:
   * scale - {Float} Ratio of the new distance from the origin to the old
   *                 distance from the origin.  A scale of 2 doubles the
   *                 distance between the point and origin.
   * origin - {<ZOO.Geometry.Point>} Point of origin for resizing
   * ratio - {Float} Optional x:y ratio for resizing.  Default ratio is 1.
   * 
   * Returns:
   * {ZOO.Geometry} - The current geometry. 
   */
  resize: function(scale, origin, ratio) {
    ratio = (ratio == undefined) ? 1 : ratio;
    this.x = origin.x + (scale * ratio * (this.x - origin.x));
    this.y = origin.y + (scale * (this.y - origin.y));
    this.clearBounds();
    return this;
  },
  /**
   * Method: intersects
   * Determine if the input geometry intersects this one.
   *
   * Parameters:
   * geometry - {<ZOO.Geometry>} Any type of geometry.
   *
   * Returns:
   * {Boolean} The input geometry intersects this one.
   */
  intersects: function(geometry) {
    var intersect = false;
    if(geometry.CLASS_NAME == "ZOO.Geometry.Point") {
      intersect = this.equals(geometry);
    } else {
      intersect = geometry.intersects(this);
    }
    return intersect;
  },
  /**
   * Method: transform
   * Translate the x,y properties of the point from source to dest.
   * 
   * Parameters:
   * source - {<ZOO.Projection>} 
   * dest - {<ZOO.Projection>}
   * 
   * Returns:
   * {<ZOO.Geometry>} 
   */
  transform: function(source, dest) {
    if ((source && dest)) {
      ZOO.Projection.transform(
          this, source, dest); 
      this.bounds = null;
    }       
    return this;
  },
  /**
   * Method: getVertices
   * Return a list of all points in this geometry.
   *
   * Parameters:
   * nodes - {Boolean} For lines, only return vertices that are
   *     endpoints.  If false, for lines, only vertices that are not
   *     endpoints will be returned.  If not provided, all vertices will
   *     be returned.
   *
   * Returns:
   * {Array} A list of all vertices in the geometry.
   */
  getVertices: function(nodes) {
    return [this];
  },
  CLASS_NAME: 'ZOO.Geometry.Point'
});
/**
 * Class: ZOO.Geometry.Surface
 * Surface geometry class. 
 * 
 * Inherits from:
 *  - <ZOO.Geometry> 
 */
ZOO.Geometry.Surface = ZOO.Class(ZOO.Geometry, {
  initialize: function() {
    ZOO.Geometry.prototype.initialize.apply(this, arguments);
  },
  CLASS_NAME: "ZOO.Geometry.Surface"
});
/**
 * Class: ZOO.Geometry.MultiPoint
 * MultiPoint is a collection of Points. Create a new instance with the
 * <ZOO.Geometry.MultiPoint> constructor.
 *
 * Inherits from:
 *  - <ZOO.Geometry.Collection>
 */
ZOO.Geometry.MultiPoint = ZOO.Class(
  ZOO.Geometry.Collection, {
  /**
   * Property: componentTypes
   * {Array(String)} An array of class names representing the types of
   * components that the collection can include.  A null value means the
   * component types are not restricted.
   */
  componentTypes: ["ZOO.Geometry.Point"],
  /**
   * Constructor: ZOO.Geometry.MultiPoint
   * Create a new MultiPoint Geometry
   *
   * Parameters:
   * components - {Array(<ZOO.Geometry.Point>)} 
   *
   * Returns:
   * {<ZOO.Geometry.MultiPoint>}
   */
  initialize: function(components) {
    ZOO.Geometry.Collection.prototype.initialize.apply(this,arguments);
  },
  /**
   * Method: addPoint
   * Wrapper for <ZOO.Geometry.Collection.addComponent>
   *
   * Parameters:
   * point - {<ZOO.Geometry.Point>} Point to be added
   * index - {Integer} Optional index
   */
  addPoint: function(point, index) {
    this.addComponent(point, index);
  },
  /**
   * Method: removePoint
   * Wrapper for <ZOO.Geometry.Collection.removeComponent>
   *
   * Parameters:
   * point - {<ZOO.Geometry.Point>} Point to be removed
   */
  removePoint: function(point){
    this.removeComponent(point);
  },
  CLASS_NAME: "ZOO.Geometry.MultiPoint"
});
/**
 * Class: ZOO.Geometry.Curve
 * A Curve is a MultiPoint, whose points are assumed to be connected. To 
 * this end, we provide a "getLength()" function, which iterates through 
 * the points, summing the distances between them. 
 * 
 * Inherits: 
 *  - <ZOO.Geometry.MultiPoint>
 */
ZOO.Geometry.Curve = ZOO.Class(ZOO.Geometry.MultiPoint, {
  /**
   * Property: componentTypes
   * {Array(String)} An array of class names representing the types of 
   *                 components that the collection can include.  A null 
   *                 value means the component types are not restricted.
   */
  componentTypes: ["ZOO.Geometry.Point"],
  /**
   * Constructor: ZOO.Geometry.Curve
   * 
   * Parameters:
   * point - {Array(<ZOO.Geometry.Point>)}
   */
  initialize: function(points) {
    ZOO.Geometry.MultiPoint.prototype.initialize.apply(this,arguments);
  },
  /**
   * Method: getLength
   * 
   * Returns:
   * {Float} The length of the curve
   */
  getLength: function() {
    var length = 0.0;
    if ( this.components && (this.components.length > 1)) {
      for(var i=1, len=this.components.length; i<len; i++) {
        length += this.components[i-1].distanceTo(this.components[i]);
      }
    }
    return length;
  },
  /**
     * APIMethod: getGeodesicLength
     * Calculate the approximate length of the geometry were it projected onto
     *     the earth.
     *
     * projection - {<ZOO.Projection>} The spatial reference system
     *     for the geometry coordinates.  If not provided, Geographic/WGS84 is
     *     assumed.
     * 
     * Returns:
     * {Float} The appoximate geodesic length of the geometry in meters.
     */
    getGeodesicLength: function(projection) {
      var geom = this;  // so we can work with a clone if needed
      if(projection) {
        var gg = new ZOO.Projection("EPSG:4326");
        if(!gg.equals(projection)) {
          geom = this.clone().transform(projection, gg);
       }
     }
     var length = 0.0;
     if(geom.components && (geom.components.length > 1)) {
       var p1, p2;
       for(var i=1, len=geom.components.length; i<len; i++) {
         p1 = geom.components[i-1];
         p2 = geom.components[i];
        // this returns km and requires x/y properties
        length += ZOO.distVincenty(p1,p2);
      }
    }
    // convert to m
    return length * 1000;
  },
  CLASS_NAME: "ZOO.Geometry.Curve"
});
/**
 * Class: ZOO.Geometry.LineString
 * A LineString is a Curve which, once two points have been added to it, can 
 * never be less than two points long.
 * 
 * Inherits from:
 *  - <ZOO.Geometry.Curve>
 */
ZOO.Geometry.LineString = ZOO.Class(ZOO.Geometry.Curve, {
  /**
   * Constructor: ZOO.Geometry.LineString
   * Create a new LineString geometry
   *
   * Parameters:
   * points - {Array(<ZOO.Geometry.Point>)} An array of points used to
   *          generate the linestring
   *
   */
  initialize: function(points) {
    ZOO.Geometry.Curve.prototype.initialize.apply(this, arguments);        
  },
  /**
   * Method: removeComponent
   * Only allows removal of a point if there are three or more points in 
   * the linestring. (otherwise the result would be just a single point)
   *
   * Parameters: 
   * point - {<ZOO.Geometry.Point>} The point to be removed
   */
  removeComponent: function(point) {
    if ( this.components && (this.components.length > 2))
      ZOO.Geometry.Collection.prototype.removeComponent.apply(this,arguments);
  },
  /**
   * Method: intersects
   * Test for instersection between two geometries.  This is a cheapo
   *     implementation of the Bently-Ottmann algorigithm.  It doesn't
   *     really keep track of a sweep line data structure.  It is closer
   *     to the brute force method, except that segments are sorted and
   *     potential intersections are only calculated when bounding boxes
   *     intersect.
   *
   * Parameters:
   * geometry - {<ZOO.Geometry>}
   *
   * Returns:
   * {Boolean} The input geometry intersects this geometry.
   */
  intersects: function(geometry) {
    var intersect = false;
    var type = geometry.CLASS_NAME;
    if(type == "ZOO.Geometry.LineString" ||
       type == "ZOO.Geometry.LinearRing" ||
       type == "ZOO.Geometry.Point") {
      var segs1 = this.getSortedSegments();
      var segs2;
      if(type == "ZOO.Geometry.Point")
        segs2 = [{
          x1: geometry.x, y1: geometry.y,
          x2: geometry.x, y2: geometry.y
        }];
      else
        segs2 = geometry.getSortedSegments();
      var seg1, seg1x1, seg1x2, seg1y1, seg1y2,
          seg2, seg2y1, seg2y2;
      // sweep right
      outer: for(var i=0, len=segs1.length; i<len; ++i) {
         seg1 = segs1[i];
         seg1x1 = seg1.x1;
         seg1x2 = seg1.x2;
         seg1y1 = seg1.y1;
         seg1y2 = seg1.y2;
         inner: for(var j=0, jlen=segs2.length; j<jlen; ++j) {
           seg2 = segs2[j];
           if(seg2.x1 > seg1x2)
             break;
           if(seg2.x2 < seg1x1)
             continue;
           seg2y1 = seg2.y1;
           seg2y2 = seg2.y2;
           if(Math.min(seg2y1, seg2y2) > Math.max(seg1y1, seg1y2))
             continue;
           if(Math.max(seg2y1, seg2y2) < Math.min(seg1y1, seg1y2))
             continue;
           if(ZOO.Geometry.segmentsIntersect(seg1, seg2)) {
             intersect = true;
             break outer;
           }
         }
      }
    } else {
      intersect = geometry.intersects(this);
    }
    return intersect;
  },
  /**
   * Method: getSortedSegments
   *
   * Returns:
   * {Array} An array of segment objects.  Segment objects have properties
   *     x1, y1, x2, and y2.  The start point is represented by x1 and y1.
   *     The end point is represented by x2 and y2.  Start and end are
   *     ordered so that x1 < x2.
   */
  getSortedSegments: function() {
    var numSeg = this.components.length - 1;
    var segments = new Array(numSeg);
    for(var i=0; i<numSeg; ++i) {
      point1 = this.components[i];
      point2 = this.components[i + 1];
      if(point1.x < point2.x)
        segments[i] = {
          x1: point1.x,
          y1: point1.y,
          x2: point2.x,
          y2: point2.y
        };
      else
        segments[i] = {
          x1: point2.x,
          y1: point2.y,
          x2: point1.x,
          y2: point1.y
        };
    }
    // more efficient to define this somewhere static
    function byX1(seg1, seg2) {
      return seg1.x1 - seg2.x1;
    }
    return segments.sort(byX1);
  },
  /**
   * Method: splitWithSegment
   * Split this geometry with the given segment.
   *
   * Parameters:
   * seg - {Object} An object with x1, y1, x2, and y2 properties referencing
   *     segment endpoint coordinates.
   * options - {Object} Properties of this object will be used to determine
   *     how the split is conducted.
   *
   * Valid options:
   * edge - {Boolean} Allow splitting when only edges intersect.  Default is
   *     true.  If false, a vertex on the source segment must be within the
   *     tolerance distance of the intersection to be considered a split.
   * tolerance - {Number} If a non-null value is provided, intersections
   *     within the tolerance distance of one of the source segment's
   *     endpoints will be assumed to occur at the endpoint.
   *
   * Returns:
   * {Object} An object with *lines* and *points* properties.  If the given
   *     segment intersects this linestring, the lines array will reference
   *     geometries that result from the split.  The points array will contain
   *     all intersection points.  Intersection points are sorted along the
   *     segment (in order from x1,y1 to x2,y2).
   */
  splitWithSegment: function(seg, options) {
    var edge = !(options && options.edge === false);
    var tolerance = options && options.tolerance;
    var lines = [];
    var verts = this.getVertices();
    var points = [];
    var intersections = [];
    var split = false;
    var vert1, vert2, point;
    var node, vertex, target;
    var interOptions = {point: true, tolerance: tolerance};
    var result = null;
    for(var i=0, stop=verts.length-2; i<=stop; ++i) {
      vert1 = verts[i];
      points.push(vert1.clone());
      vert2 = verts[i+1];
      target = {x1: vert1.x, y1: vert1.y, x2: vert2.x, y2: vert2.y};
      point = ZOO.Geometry.segmentsIntersect(seg, target, interOptions);
      if(point instanceof ZOO.Geometry.Point) {
        if((point.x === seg.x1 && point.y === seg.y1) ||
           (point.x === seg.x2 && point.y === seg.y2) ||
            point.equals(vert1) || point.equals(vert2))
          vertex = true;
        else
          vertex = false;
        if(vertex || edge) {
          // push intersections different than the previous
          if(!point.equals(intersections[intersections.length-1]))
            intersections.push(point.clone());
          if(i === 0) {
            if(point.equals(vert1))
              continue;
          }
          if(point.equals(vert2))
            continue;
          split = true;
          if(!point.equals(vert1))
            points.push(point);
          lines.push(new ZOO.Geometry.LineString(points));
          points = [point.clone()];
        }
      }
    }
    if(split) {
      points.push(vert2.clone());
      lines.push(new ZOO.Geometry.LineString(points));
    }
    if(intersections.length > 0) {
      // sort intersections along segment
      var xDir = seg.x1 < seg.x2 ? 1 : -1;
      var yDir = seg.y1 < seg.y2 ? 1 : -1;
      result = {
        lines: lines,
        points: intersections.sort(function(p1, p2) {
           return (xDir * p1.x - xDir * p2.x) || (yDir * p1.y - yDir * p2.y);
        })
      };
    }
    return result;
  },
  /**
   * Method: split
   * Use this geometry (the source) to attempt to split a target geometry.
   * 
   * Parameters:
   * target - {<ZOO.Geometry>} The target geometry.
   * options - {Object} Properties of this object will be used to determine
   *     how the split is conducted.
   *
   * Valid options:
   * mutual - {Boolean} Split the source geometry in addition to the target
   *     geometry.  Default is false.
   * edge - {Boolean} Allow splitting when only edges intersect.  Default is
   *     true.  If false, a vertex on the source must be within the tolerance
   *     distance of the intersection to be considered a split.
   * tolerance - {Number} If a non-null value is provided, intersections
   *     within the tolerance distance of an existing vertex on the source
   *     will be assumed to occur at the vertex.
   * 
   * Returns:
   * {Array} A list of geometries (of this same type as the target) that
   *     result from splitting the target with the source geometry.  The
   *     source and target geometry will remain unmodified.  If no split
   *     results, null will be returned.  If mutual is true and a split
   *     results, return will be an array of two arrays - the first will be
   *     all geometries that result from splitting the source geometry and
   *     the second will be all geometries that result from splitting the
   *     target geometry.
   */
  split: function(target, options) {
    var results = null;
    var mutual = options && options.mutual;
    var sourceSplit, targetSplit, sourceParts, targetParts;
    if(target instanceof ZOO.Geometry.LineString) {
      var verts = this.getVertices();
      var vert1, vert2, seg, splits, lines, point;
      var points = [];
      sourceParts = [];
      for(var i=0, stop=verts.length-2; i<=stop; ++i) {
        vert1 = verts[i];
        vert2 = verts[i+1];
        seg = {
          x1: vert1.x, y1: vert1.y,
          x2: vert2.x, y2: vert2.y
        };
        targetParts = targetParts || [target];
        if(mutual)
          points.push(vert1.clone());
        for(var j=0; j<targetParts.length; ++j) {
          splits = targetParts[j].splitWithSegment(seg, options);
          if(splits) {
            // splice in new features
            lines = splits.lines;
            if(lines.length > 0) {
              lines.unshift(j, 1);
              Array.prototype.splice.apply(targetParts, lines);
              j += lines.length - 2;
            }
            if(mutual) {
              for(var k=0, len=splits.points.length; k<len; ++k) {
                point = splits.points[k];
                if(!point.equals(vert1)) {
                  points.push(point);
                  sourceParts.push(new ZOO.Geometry.LineString(points));
                  if(point.equals(vert2))
                    points = [];
                  else
                    points = [point.clone()];
                }
              }
            }
          }
        }
      }
      if(mutual && sourceParts.length > 0 && points.length > 0) {
        points.push(vert2.clone());
        sourceParts.push(new ZOO.Geometry.LineString(points));
      }
    } else {
      results = target.splitWith(this, options);
    }
    if(targetParts && targetParts.length > 1)
      targetSplit = true;
    else
      targetParts = [];
    if(sourceParts && sourceParts.length > 1)
      sourceSplit = true;
    else
      sourceParts = [];
    if(targetSplit || sourceSplit) {
      if(mutual)
        results = [sourceParts, targetParts];
      else
        results = targetParts;
    }
    return results;
  },
  /**
   * Method: splitWith
   * Split this geometry (the target) with the given geometry (the source).
   *
   * Parameters:
   * geometry - {<ZOO.Geometry>} A geometry used to split this
   *     geometry (the source).
   * options - {Object} Properties of this object will be used to determine
   *     how the split is conducted.
   *
   * Valid options:
   * mutual - {Boolean} Split the source geometry in addition to the target
   *     geometry.  Default is false.
   * edge - {Boolean} Allow splitting when only edges intersect.  Default is
   *     true.  If false, a vertex on the source must be within the tolerance
   *     distance of the intersection to be considered a split.
   * tolerance - {Number} If a non-null value is provided, intersections
   *     within the tolerance distance of an existing vertex on the source
   *     will be assumed to occur at the vertex.
   * 
   * Returns:
   * {Array} A list of geometries (of this same type as the target) that
   *     result from splitting the target with the source geometry.  The
   *     source and target geometry will remain unmodified.  If no split
   *     results, null will be returned.  If mutual is true and a split
   *     results, return will be an array of two arrays - the first will be
   *     all geometries that result from splitting the source geometry and
   *     the second will be all geometries that result from splitting the
   *     target geometry.
   */
  splitWith: function(geometry, options) {
    return geometry.split(this, options);
  },
  /**
   * Method: getVertices
   * Return a list of all points in this geometry.
   *
   * Parameters:
   * nodes - {Boolean} For lines, only return vertices that are
   *     endpoints.  If false, for lines, only vertices that are not
   *     endpoints will be returned.  If not provided, all vertices will
   *     be returned.
   *
   * Returns:
   * {Array} A list of all vertices in the geometry.
   */
  getVertices: function(nodes) {
    var vertices;
    if(nodes === true)
      vertices = [
        this.components[0],
        this.components[this.components.length-1]
      ];
    else if (nodes === false)
      vertices = this.components.slice(1, this.components.length-1);
    else
      vertices = this.components.slice();
    return vertices;
  },
  distanceTo: function(geometry, options) {
    var edge = !(options && options.edge === false);
    var details = edge && options && options.details;
    var result, best = {};
    var min = Number.POSITIVE_INFINITY;
    if(geometry instanceof ZOO.Geometry.Point) {
      var segs = this.getSortedSegments();
      var x = geometry.x;
      var y = geometry.y;
      var seg;
      for(var i=0, len=segs.length; i<len; ++i) {
        seg = segs[i];
        result = ZOO.Geometry.distanceToSegment(geometry, seg);
        if(result.distance < min) {
          min = result.distance;
          best = result;
          if(min === 0)
            break;
        } else {
          // if distance increases and we cross y0 to the right of x0, no need to keep looking.
          if(seg.x2 > x && ((y > seg.y1 && y < seg.y2) || (y < seg.y1 && y > seg.y2)))
            break;
        }
      }
      if(details)
        best = {
          distance: best.distance,
          x0: best.x, y0: best.y,
          x1: x, y1: y
        };
      else
        best = best.distance;
    } else if(geometry instanceof ZOO.Geometry.LineString) { 
      var segs0 = this.getSortedSegments();
      var segs1 = geometry.getSortedSegments();
      var seg0, seg1, intersection, x0, y0;
      var len1 = segs1.length;
      var interOptions = {point: true};
      outer: for(var i=0, len=segs0.length; i<len; ++i) {
        seg0 = segs0[i];
        x0 = seg0.x1;
        y0 = seg0.y1;
        for(var j=0; j<len1; ++j) {
          seg1 = segs1[j];
          intersection = ZOO.Geometry.segmentsIntersect(seg0, seg1, interOptions);
          if(intersection) {
            min = 0;
            best = {
              distance: 0,
              x0: intersection.x, y0: intersection.y,
              x1: intersection.x, y1: intersection.y
            };
            break outer;
          } else {
            result = ZOO.Geometry.distanceToSegment({x: x0, y: y0}, seg1);
            if(result.distance < min) {
              min = result.distance;
              best = {
                distance: min,
                x0: x0, y0: y0,
                x1: result.x, y1: result.y
              };
            }
          }
        }
      }
      if(!details)
        best = best.distance;
      if(min !== 0) {
        // check the final vertex in this line's sorted segments
        if(seg0) {
          result = geometry.distanceTo(
              new ZOO.Geometry.Point(seg0.x2, seg0.y2),
              options
              );
          var dist = details ? result.distance : result;
          if(dist < min) {
            if(details)
              best = {
                distance: min,
                x0: result.x1, y0: result.y1,
                x1: result.x0, y1: result.y0
              };
            else
              best = dist;
          }
        }
      }
    } else {
      best = geometry.distanceTo(this, options);
      // swap since target comes from this line
      if(details)
        best = {
          distance: best.distance,
          x0: best.x1, y0: best.y1,
          x1: best.x0, y1: best.y0
        };
    }
    return best;
  },
  CLASS_NAME: "ZOO.Geometry.LineString"
});
/**
 * Class: ZOO.Geometry.LinearRing
 * 
 * A Linear Ring is a special LineString which is closed. It closes itself 
 * automatically on every addPoint/removePoint by adding a copy of the first
 * point as the last point. 
 * 
 * Also, as it is the first in the line family to close itself, a getArea()
 * function is defined to calculate the enclosed area of the linearRing
 * 
 * Inherits:
 *  - <ZOO.Geometry.LineString>
 */
ZOO.Geometry.LinearRing = ZOO.Class(
  ZOO.Geometry.LineString, {
  /**
   * Property: componentTypes
   * {Array(String)} An array of class names representing the types of 
   *                 components that the collection can include.  A null 
   *                 value means the component types are not restricted.
   */
  componentTypes: ["ZOO.Geometry.Point"],
  /**
   * Constructor: ZOO.Geometry.LinearRing
   * Linear rings are constructed with an array of points.  This array
   *     can represent a closed or open ring.  If the ring is open (the last
   *     point does not equal the first point), the constructor will close
   *     the ring.  If the ring is already closed (the last point does equal
   *     the first point), it will be left closed.
   * 
   * Parameters:
   * points - {Array(<ZOO.Geometry.Point>)} points
   */
  initialize: function(points) {
    ZOO.Geometry.LineString.prototype.initialize.apply(this,arguments);
  },
  /**
   * Method: addComponent
   * Adds a point to geometry components.  If the point is to be added to
   *     the end of the components array and it is the same as the last point
   *     already in that array, the duplicate point is not added.  This has 
   *     the effect of closing the ring if it is not already closed, and 
   *     doing the right thing if it is already closed.  This behavior can 
   *     be overridden by calling the method with a non-null index as the 
   *     second argument.
   *
   * Parameter:
   * point - {<ZOO.Geometry.Point>}
   * index - {Integer} Index into the array to insert the component
   * 
   * Returns:
   * {Boolean} Was the Point successfully added?
   */
  addComponent: function(point, index) {
    var added = false;
    //remove last point
    var lastPoint = this.components.pop();
    // given an index, add the point
    // without an index only add non-duplicate points
    if(index != null || !point.equals(lastPoint))
      added = ZOO.Geometry.Collection.prototype.addComponent.apply(this,arguments);
    //append copy of first point
    var firstPoint = this.components[0];
    ZOO.Geometry.Collection.prototype.addComponent.apply(this,[firstPoint]);
    return added;
  },
  /**
   * APIMethod: removeComponent
   * Removes a point from geometry components.
   *
   * Parameters:
   * point - {<ZOO.Geometry.Point>}
   */
  removeComponent: function(point) {
    if (this.components.length > 4) {
      //remove last point
      this.components.pop();
      //remove our point
      ZOO.Geometry.Collection.prototype.removeComponent.apply(this,arguments);
      //append copy of first point
      var firstPoint = this.components[0];
      ZOO.Geometry.Collection.prototype.addComponent.apply(this,[firstPoint]);
    }
  },
  /**
   * Method: move
   * Moves a geometry by the given displacement along positive x and y axes.
   *     This modifies the position of the geometry and clears the cached
   *     bounds.
   *
   * Parameters:
   * x - {Float} Distance to move geometry in positive x direction. 
   * y - {Float} Distance to move geometry in positive y direction.
   */
  move: function(x, y) {
    for(var i = 0, len=this.components.length; i<len - 1; i++) {
      this.components[i].move(x, y);
    }
  },
  /**
   * Method: rotate
   * Rotate a geometry around some origin
   *
   * Parameters:
   * angle - {Float} Rotation angle in degrees (measured counterclockwise
   *                 from the positive x-axis)
   * origin - {<ZOO.Geometry.Point>} Center point for the rotation
   */
  rotate: function(angle, origin) {
    for(var i=0, len=this.components.length; i<len - 1; ++i) {
      this.components[i].rotate(angle, origin);
    }
  },
  /**
   * Method: resize
   * Resize a geometry relative to some origin.  Use this method to apply
   *     a uniform scaling to a geometry.
   *
   * Parameters:
   * scale - {Float} Factor by which to scale the geometry.  A scale of 2
   *                 doubles the size of the geometry in each dimension
   *                 (lines, for example, will be twice as long, and polygons
   *                 will have four times the area).
   * origin - {<ZOO.Geometry.Point>} Point of origin for resizing
   * ratio - {Float} Optional x:y ratio for resizing.  Default ratio is 1.
   * 
   * Returns:
   * {ZOO.Geometry} - The current geometry. 
   */
  resize: function(scale, origin, ratio) {
    for(var i=0, len=this.components.length; i<len - 1; ++i) {
      this.components[i].resize(scale, origin, ratio);
    }
    return this;
  },
  /**
   * Method: transform
   * Reproject the components geometry from source to dest.
   *
   * Parameters:
   * source - {<ZOO.Projection>}
   * dest - {<ZOO.Projection>}
   * 
   * Returns:
   * {<ZOO.Geometry>} 
   */
  transform: function(source, dest) {
    if (source && dest) {
      for (var i=0, len=this.components.length; i<len - 1; i++) {
        var component = this.components[i];
        component.transform(source, dest);
      }
      this.bounds = null;
    }
    return this;
  },
  /**
   * Method: getCentroid
   *
   * Returns:
   * {<ZOO.Geometry.Point>} The centroid of the ring
   */
  getCentroid: function() {
    if ( this.components && (this.components.length > 2)) {
      var sumX = 0.0;
      var sumY = 0.0;
      for (var i = 0; i < this.components.length - 1; i++) {
        var b = this.components[i];
        var c = this.components[i+1];
        sumX += (b.x + c.x) * (b.x * c.y - c.x * b.y);
        sumY += (b.y + c.y) * (b.x * c.y - c.x * b.y);
      }
      var area = -1 * this.getArea();
      var x = sumX / (6 * area);
      var y = sumY / (6 * area);
    }
    return new ZOO.Geometry.Point(x, y);
  },
  /**
   * Method: getArea
   * Note - The area is positive if the ring is oriented CW, otherwise
   *         it will be negative.
   * 
   * Returns:
   * {Float} The signed area for a ring.
   */
  getArea: function() {
    var area = 0.0;
    if ( this.components && (this.components.length > 2)) {
      var sum = 0.0;
      for (var i=0, len=this.components.length; i<len - 1; i++) {
        var b = this.components[i];
        var c = this.components[i+1];
        sum += (b.x + c.x) * (c.y - b.y);
      }
      area = - sum / 2.0;
    }
    return area;
  },
  /**
   * Method: getGeodesicArea
   * Calculate the approximate area of the polygon were it projected onto
   *     the earth.  Note that this area will be positive if ring is oriented
   *     clockwise, otherwise it will be negative.
   *
   * Parameters:
   * projection - {<ZOO.Projection>} The spatial reference system
   *     for the geometry coordinates.  If not provided, Geographic/WGS84 is
   *     assumed.
   * 
   * Reference:
   * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
   *     Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
   *     Laboratory, Pasadena, CA, June 2007 http://trs-new.jpl.nasa.gov/dspace/handle/2014/40409
   *
   * Returns:
   * {float} The approximate signed geodesic area of the polygon in square
   *     meters.
   */
  getGeodesicArea: function(projection) {
    var ring = this;  // so we can work with a clone if needed
    if(projection) {
      var gg = new ZOO.Projection("EPSG:4326");
      if(!gg.equals(projection)) {
        ring = this.clone().transform(projection, gg);
      }
    }
    var area = 0.0;
    var len = ring.components && ring.components.length;
    if(len > 2) {
      var p1, p2;
      for(var i=0; i<len-1; i++) {
        p1 = ring.components[i];
        p2 = ring.components[i+1];
        area += ZOO.rad(p2.x - p1.x) *
                (2 + Math.sin(ZOO.rad(p1.y)) +
                Math.sin(ZOO.rad(p2.y)));
      }
      area = area * 6378137.0 * 6378137.0 / 2.0;
    }
    return area;
  },
  /**
   * Method: containsPoint
   * Test if a point is inside a linear ring.  For the case where a point
   *     is coincident with a linear ring edge, returns 1.  Otherwise,
   *     returns boolean.
   *
   * Parameters:
   * point - {<ZOO.Geometry.Point>}
   *
   * Returns:
   * {Boolean | Number} The point is inside the linear ring.  Returns 1 if
   *     the point is coincident with an edge.  Returns boolean otherwise.
   */
  containsPoint: function(point) {
    var approx = OpenLayers.Number.limitSigDigs;
    var digs = 14;
    var px = approx(point.x, digs);
    var py = approx(point.y, digs);
    function getX(y, x1, y1, x2, y2) {
      return (((x1 - x2) * y) + ((x2 * y1) - (x1 * y2))) / (y1 - y2);
    }
    var numSeg = this.components.length - 1;
    var start, end, x1, y1, x2, y2, cx, cy;
    var crosses = 0;
    for(var i=0; i<numSeg; ++i) {
      start = this.components[i];
      x1 = approx(start.x, digs);
      y1 = approx(start.y, digs);
      end = this.components[i + 1];
      x2 = approx(end.x, digs);
      y2 = approx(end.y, digs);

      /**
       * The following conditions enforce five edge-crossing rules:
       *    1. points coincident with edges are considered contained;
       *    2. an upward edge includes its starting endpoint, and
       *    excludes its final endpoint;
       *    3. a downward edge excludes its starting endpoint, and
       *    includes its final endpoint;
       *    4. horizontal edges are excluded; and
       *    5. the edge-ray intersection point must be strictly right
       *    of the point P.
       */
      if(y1 == y2) {
        // horizontal edge
        if(py == y1) {
          // point on horizontal line
          if(x1 <= x2 && (px >= x1 && px <= x2) || // right or vert
              x1 >= x2 && (px <= x1 && px >= x2)) { // left or vert
            // point on edge
            crosses = -1;
            break;
          }
        }
        // ignore other horizontal edges
        continue;
      }
      cx = approx(getX(py, x1, y1, x2, y2), digs);
      if(cx == px) {
        // point on line
        if(y1 < y2 && (py >= y1 && py <= y2) || // upward
            y1 > y2 && (py <= y1 && py >= y2)) { // downward
          // point on edge
          crosses = -1;
          break;
        }
      }
      if(cx <= px) {
        // no crossing to the right
        continue;
      }
      if(x1 != x2 && (cx < Math.min(x1, x2) || cx > Math.max(x1, x2))) {
        // no crossing
        continue;
      }
      if(y1 < y2 && (py >= y1 && py < y2) || // upward
          y1 > y2 && (py < y1 && py >= y2)) { // downward
        ++crosses;
      }
    }
    var contained = (crosses == -1) ?
      // on edge
      1 :
      // even (out) or odd (in)
      !!(crosses & 1);

    return contained;
  },
  intersects: function(geometry) {
    var intersect = false;
    if(geometry.CLASS_NAME == "ZOO.Geometry.Point")
      intersect = this.containsPoint(geometry);
    else if(geometry.CLASS_NAME == "ZOO.Geometry.LineString")
      intersect = geometry.intersects(this);
    else if(geometry.CLASS_NAME == "ZOO.Geometry.LinearRing")
      intersect = ZOO.Geometry.LineString.prototype.intersects.apply(
          this, [geometry]
          );
    else
      for(var i=0, len=geometry.components.length; i<len; ++ i) {
        intersect = geometry.components[i].intersects(this);
        if(intersect)
          break;
      }
    return intersect;
  },
  getVertices: function(nodes) {
    return (nodes === true) ? [] : this.components.slice(0, this.components.length-1);
  },
  CLASS_NAME: "ZOO.Geometry.LinearRing"
});
/**
 * Class: ZOO.Geometry.MultiLineString
 * A MultiLineString is a geometry with multiple <ZOO.Geometry.LineString>
 * components.
 * 
 * Inherits from:
 *  - <ZOO.Geometry.Collection>
 */
ZOO.Geometry.MultiLineString = ZOO.Class(
  ZOO.Geometry.Collection, {
  componentTypes: ["ZOO.Geometry.LineString"],
  /**
   * Constructor: ZOO.Geometry.MultiLineString
   * Constructor for a MultiLineString Geometry.
   *
   * Parameters: 
   * components - {Array(<ZOO.Geometry.LineString>)} 
   *
   */
  initialize: function(components) {
    ZOO.Geometry.Collection.prototype.initialize.apply(this,arguments);        
  },
  split: function(geometry, options) {
    var results = null;
    var mutual = options && options.mutual;
    var splits, sourceLine, sourceLines, sourceSplit, targetSplit;
    var sourceParts = [];
    var targetParts = [geometry];
    for(var i=0, len=this.components.length; i<len; ++i) {
      sourceLine = this.components[i];
      sourceSplit = false;
      for(var j=0; j < targetParts.length; ++j) { 
        splits = sourceLine.split(targetParts[j], options);
        if(splits) {
          if(mutual) {
            sourceLines = splits[0];
            for(var k=0, klen=sourceLines.length; k<klen; ++k) {
              if(k===0 && sourceParts.length)
                sourceParts[sourceParts.length-1].addComponent(
                  sourceLines[k]
                );
              else
                sourceParts.push(
                  new ZOO.Geometry.MultiLineString([
                    sourceLines[k]
                    ])
                );
            }
            sourceSplit = true;
            splits = splits[1];
          }
          if(splits.length) {
            // splice in new target parts
            splits.unshift(j, 1);
            Array.prototype.splice.apply(targetParts, splits);
            break;
          }
        }
      }
      if(!sourceSplit) {
        // source line was not hit
        if(sourceParts.length) {
          // add line to existing multi
          sourceParts[sourceParts.length-1].addComponent(
              sourceLine.clone()
              );
        } else {
          // create a fresh multi
          sourceParts = [
            new ZOO.Geometry.MultiLineString(
                sourceLine.clone()
                )
            ];
        }
      }
    }
    if(sourceParts && sourceParts.length > 1)
      sourceSplit = true;
    else
      sourceParts = [];
    if(targetParts && targetParts.length > 1)
      targetSplit = true;
    else
      targetParts = [];
    if(sourceSplit || targetSplit) {
      if(mutual)
        results = [sourceParts, targetParts];
      else
        results = targetParts;
    }
    return results;
  },
  splitWith: function(geometry, options) {
    var results = null;
    var mutual = options && options.mutual;
    var splits, targetLine, sourceLines, sourceSplit, targetSplit, sourceParts, targetParts;
    if(geometry instanceof ZOO.Geometry.LineString) {
      targetParts = [];
      sourceParts = [geometry];
      for(var i=0, len=this.components.length; i<len; ++i) {
        targetSplit = false;
        targetLine = this.components[i];
        for(var j=0; j<sourceParts.length; ++j) {
          splits = sourceParts[j].split(targetLine, options);
          if(splits) {
            if(mutual) {
              sourceLines = splits[0];
              if(sourceLines.length) {
                // splice in new source parts
                sourceLines.unshift(j, 1);
                Array.prototype.splice.apply(sourceParts, sourceLines);
                j += sourceLines.length - 2;
              }
              splits = splits[1];
              if(splits.length === 0) {
                splits = [targetLine.clone()];
              }
            }
            for(var k=0, klen=splits.length; k<klen; ++k) {
              if(k===0 && targetParts.length) {
                targetParts[targetParts.length-1].addComponent(
                    splits[k]
                    );
              } else {
                targetParts.push(
                    new ZOO.Geometry.MultiLineString([
                      splits[k]
                      ])
                    );
              }
            }
            targetSplit = true;                    
          }
        }
        if(!targetSplit) {
          // target component was not hit
          if(targetParts.length) {
            // add it to any existing multi-line
            targetParts[targetParts.length-1].addComponent(
                targetLine.clone()
                );
          } else {
            // or start with a fresh multi-line
            targetParts = [
              new ZOO.Geometry.MultiLineString([
                  targetLine.clone()
                  ])
              ];
          }

        }
      }
    } else {
      results = geometry.split(this);
    }
    if(sourceParts && sourceParts.length > 1)
      sourceSplit = true;
    else
      sourceParts = [];
    if(targetParts && targetParts.length > 1)
      targetSplit = true;
    else
      targetParts = [];
    if(sourceSplit || targetSplit) {
      if(mutual)
        results = [sourceParts, targetParts];
      else
        results = targetParts;
    }
    return results;
  },
  CLASS_NAME: "ZOO.Geometry.MultiLineString"
});
/**
 * Class: ZOO.Geometry.Polygon 
 * Polygon is a collection of <ZOO.Geometry.LinearRing>. 
 * 
 * Inherits from:
 *  - <ZOO.Geometry.Collection> 
 */
ZOO.Geometry.Polygon = ZOO.Class(
  ZOO.Geometry.Collection, {
  componentTypes: ["ZOO.Geometry.LinearRing"],
  /**
   * Constructor: ZOO.Geometry.Polygon
   * Constructor for a Polygon geometry. 
   * The first ring (this.component[0])is the outer bounds of the polygon and 
   * all subsequent rings (this.component[1-n]) are internal holes.
   *
   *
   * Parameters:
   * components - {Array(<ZOO.Geometry.LinearRing>)} 
   */
  initialize: function(components) {
    ZOO.Geometry.Collection.prototype.initialize.apply(this,arguments);
  },
  /** 
   * Method: getArea
   * Calculated by subtracting the areas of the internal holes from the 
   *   area of the outer hole.
   * 
   * Returns:
   * {float} The area of the geometry
   */
  getArea: function() {
    var area = 0.0;
    if ( this.components && (this.components.length > 0)) {
      area += Math.abs(this.components[0].getArea());
      for (var i=1, len=this.components.length; i<len; i++) {
        area -= Math.abs(this.components[i].getArea());
      }
    }
    return area;
  },
  /** 
   * APIMethod: getGeodesicArea
   * Calculate the approximate area of the polygon were it projected onto
   *     the earth.
   *
   * Parameters:
   * projection - {<ZOO.Projection>} The spatial reference system
   *     for the geometry coordinates.  If not provided, Geographic/WGS84 is
   *     assumed.
   * 
   * Reference:
   * Robert. G. Chamberlain and William H. Duquette, "Some Algorithms for
   *     Polygons on a Sphere", JPL Publication 07-03, Jet Propulsion
   *     Laboratory, Pasadena, CA, June 2007 http://trs-new.jpl.nasa.gov/dspace/handle/2014/40409
   *
   * Returns:
   * {float} The approximate geodesic area of the polygon in square meters.
   */
  getGeodesicArea: function(projection) {
    var area = 0.0;
    if(this.components && (this.components.length > 0)) {
      area += Math.abs(this.components[0].getGeodesicArea(projection));
      for(var i=1, len=this.components.length; i<len; i++) {
          area -= Math.abs(this.components[i].getGeodesicArea(projection));
      }
    }
    return area;
  },
  /**
   * Method: containsPoint
   * Test if a point is inside a polygon.  Points on a polygon edge are
   *     considered inside.
   *
   * Parameters:
   * point - {<ZOO.Geometry.Point>}
   *
   * Returns:
   * {Boolean | Number} The point is inside the polygon.  Returns 1 if the
   *     point is on an edge.  Returns boolean otherwise.
   */
  containsPoint: function(point) {
    var numRings = this.components.length;
    var contained = false;
    if(numRings > 0) {
    // check exterior ring - 1 means on edge, boolean otherwise
      contained = this.components[0].containsPoint(point);
      if(contained !== 1) {
        if(contained && numRings > 1) {
          // check interior rings
          var hole;
          for(var i=1; i<numRings; ++i) {
            hole = this.components[i].containsPoint(point);
            if(hole) {
              if(hole === 1)
                contained = 1;
              else
                contained = false;
              break;
            }
          }
        }
      }
    }
    return contained;
  },
  intersects: function(geometry) {
    var intersect = false;
    var i, len;
    if(geometry.CLASS_NAME == "ZOO.Geometry.Point") {
      intersect = this.containsPoint(geometry);
    } else if(geometry.CLASS_NAME == "ZOO.Geometry.LineString" ||
              geometry.CLASS_NAME == "ZOO.Geometry.LinearRing") {
      // check if rings/linestrings intersect
      for(i=0, len=this.components.length; i<len; ++i) {
        intersect = geometry.intersects(this.components[i]);
        if(intersect) {
          break;
        }
      }
      if(!intersect) {
        // check if this poly contains points of the ring/linestring
        for(i=0, len=geometry.components.length; i<len; ++i) {
          intersect = this.containsPoint(geometry.components[i]);
          if(intersect) {
            break;
          }
        }
      }
    } else {
      for(i=0, len=geometry.components.length; i<len; ++ i) {
        intersect = this.intersects(geometry.components[i]);
        if(intersect)
          break;
      }
    }
    // check case where this poly is wholly contained by another
    if(!intersect && geometry.CLASS_NAME == "ZOO.Geometry.Polygon") {
      // exterior ring points will be contained in the other geometry
      var ring = this.components[0];
      for(i=0, len=ring.components.length; i<len; ++i) {
        intersect = geometry.containsPoint(ring.components[i]);
        if(intersect)
          break;
      }
    }
    return intersect;
  },
  distanceTo: function(geometry, options) {
    var edge = !(options && options.edge === false);
    var result;
    // this is the case where we might not be looking for distance to edge
    if(!edge && this.intersects(geometry))
      result = 0;
    else
      result = ZOO.Geometry.Collection.prototype.distanceTo.apply(
          this, [geometry, options]
          );
    return result;
  },
  CLASS_NAME: "ZOO.Geometry.Polygon"
});
/**
 * Method: createRegularPolygon
 * Create a regular polygon around a radius. Useful for creating circles 
 * and the like.
 *
 * Parameters:
 * origin - {<ZOO.Geometry.Point>} center of polygon.
 * radius - {Float} distance to vertex, in map units.
 * sides - {Integer} Number of sides. 20 approximates a circle.
 * rotation - {Float} original angle of rotation, in degrees.
 */
ZOO.Geometry.Polygon.createRegularPolygon = function(origin, radius, sides, rotation) {  
    var angle = Math.PI * ((1/sides) - (1/2));
    if(rotation) {
        angle += (rotation / 180) * Math.PI;
    }
    var rotatedAngle, x, y;
    var points = [];
    for(var i=0; i<sides; ++i) {
        rotatedAngle = angle + (i * 2 * Math.PI / sides);
        x = origin.x + (radius * Math.cos(rotatedAngle));
        y = origin.y + (radius * Math.sin(rotatedAngle));
        points.push(new ZOO.Geometry.Point(x, y));
    }
    var ring = new ZOO.Geometry.LinearRing(points);
    return new ZOO.Geometry.Polygon([ring]);
};
/**
 * Class: ZOO.Geometry.MultiPolygon
 * MultiPolygon is a geometry with multiple <ZOO.Geometry.Polygon>
 * components.  Create a new instance with the <ZOO.Geometry.MultiPolygon>
 * constructor.
 * 
 * Inherits from:
 *  - <ZOO.Geometry.Collection>
 */
ZOO.Geometry.MultiPolygon = ZOO.Class(
  ZOO.Geometry.Collection, {
  componentTypes: ["ZOO.Geometry.Polygon"],
  /**
   * Constructor: ZOO.Geometry.MultiPolygon
   * Create a new MultiPolygon geometry
   *
   * Parameters:
   * components - {Array(<ZOO.Geometry.Polygon>)} An array of polygons
   *              used to generate the MultiPolygon
   *
   */
  initialize: function(components) {
    ZOO.Geometry.Collection.prototype.initialize.apply(this,arguments);
  },
  CLASS_NAME: "ZOO.Geometry.MultiPolygon"
});
/**
 * Class: ZOO.Process
 * Used to query OGC WPS process defined by its URL and its identifier. 
 * Usefull for chaining localhost process.
 */
ZOO.Process = ZOO.Class({
  /**
   * Property: schemaLocation
   * {String} Schema location for a particular minor version.
   */
  schemaLocation: "http://www.opengis.net/wps/1.0.0/../wpsExecute_request.xsd",
  /**
   * Property: namespaces
   * {Object} Mapping of namespace aliases to namespace URIs.
   */
  namespaces: {
    ows: "http://www.opengis.net/ows/1.1",
    wps: "http://www.opengis.net/wps/1.0.0",
    xlink: "http://www.w3.org/1999/xlink",
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
  },
  /**
   * Property: url
   * {String} The OGC's Web PRocessing Service URL, 
   *          default is http://localhost/zoo.
   */
  url: 'http://localhost/zoo',
  /**
   * Property: identifier
   * {String} Process identifier in the OGC's Web Processing Service.
   */
  identifier: null,
  /**
   * Constructor: ZOO.Process
   * Create a new Process
   *
   * Parameters:
   * url - {String} The OGC's Web Processing Service URL.
   * identifier - {String} The process identifier in the OGC's Web Processing Service.
   *
   */
  initialize: function(url,identifier) {
    this.url = url;
    this.identifier = identifier;
  },
  /**
   * Method: Execute
   * Query the OGC's Web PRocessing Servcie to Execute the process.
   *
   * Parameters:
   * inputs - {Object}
   *
   * Returns:
   * {String} The OGC's Web processing Service XML response. The result 
   *          needs to be interpreted.
   */
  Execute: function(inputs,outputs) {
    if (this.identifier == null)
      return null;
    var body = new XML('<wps:Execute service="WPS" version="1.0.0" xmlns:wps="'+this.namespaces['wps']+'" xmlns:ows="'+this.namespaces['ows']+'" xmlns:xlink="'+this.namespaces['xlink']+'" xmlns:xsi="'+this.namespaces['xsi']+'" xsi:schemaLocation="'+this.schemaLocation+'"><ows:Identifier>'+this.identifier+'</ows:Identifier>'+this.buildDataInputsNode(inputs)+this.buildDataOutputsNode(outputs)+'</wps:Execute>');
    body = body.toXMLString();
    var headers=['Content-Type: text/xml; charset=UTF-8'];
      if(arguments.length>2){
	headers[headers.length]=arguments[2];
      }
    var response = ZOO.Request.Post(this.url,body,headers);
    return response;
  },
  buildOutput:{
    /**
     * Method: buildOutput.ResponseDocument
     * Given an E4XElement representing the WPS ResponseDocument output.
     *
     * Parameters:
     * identifier - {String} the input indetifier
     * data - {Object} A WPS complex data input.
     *
     * Returns:
     * {E4XElement} A WPS Input node.
     */
    'ResponseDocument': function(identifier,obj) {
      var output = new XML('<wps:ResponseForm xmlns:wps="'+this.namespaces['wps']+'"><wps:ResponseDocument><wps:Output'+(obj["mimeType"]?' mimeType="'+obj["mimeType"]+'" ':'')+(obj["encoding"]?' encoding="'+obj["encoding"]+'" ':'')+(obj["asReference"]?' asReference="'+obj["asReference"]+'" ':'')+'><ows:Identifier xmlns:ows="'+this.namespaces['ows']+'">'+identifier+'</ows:Identifier></wps:Output></wps:ResponseDocument></wps:ResponseForm>');
      if (obj.encoding)
        output.*::Data.*::ComplexData.@encoding = obj.encoding;
      if (obj.schema)
        output.*::Data.*::ComplexData.@schema = obj.schema;
      output = output.toXMLString();
      return output;
    },
    'RawDataOutput': function(identifier,obj) {
      var output = new XML('<wps:ResponseForm xmlns:wps="'+this.namespaces['wps']+'"><wps:RawDataOutput '+(obj["mimeType"]?' mimeType="'+obj["mimeType"]+'" ':'')+(obj["encoding"]?' encoding="'+obj["encoding"]+'" ':'')+'><ows:Identifier xmlns:ows="'+this.namespaces['ows']+'">'+identifier+'</ows:Identifier></wps:RawDataOutput></wps:ResponseForm>');
      if (obj.encoding)
        output.*::Data.*::ComplexData.@encoding = obj.encoding;
      if (obj.schema)
        output.*::Data.*::ComplexData.@schema = obj.schema;
      output = output.toXMLString();
      return output;
    }

  },
  /**
   * Property: buildInput
   * Object containing methods to build WPS inputs.
   */
  buildInput: {
    /**
     * Method: buildInput.complex
     * Given an E4XElement representing the WPS complex data input.
     *
     * Parameters:
     * identifier - {String} the input indetifier
     * data - {Object} A WPS complex data input.
     *
     * Returns:
     * {E4XElement} A WPS Input node.
     */
    'complex': function(identifier,data) {
      var input = new XML('<wps:Input xmlns:wps="'+this.namespaces['wps']+'"><ows:Identifier xmlns:ows="'+this.namespaces['ows']+'">'+identifier+'</ows:Identifier>'+(data.value?'<wps:Data><wps:ComplexData><![CDATA['+data.value+']]></wps:ComplexData></wps:Data>':(data.xlink?'<wps:Reference xmlns:xlink="'+this.namespaces['xlink']+'" xlink:href="'+data.xlink+'" mimeType="'+data.mimeType+'" />':''))+'</wps:Input>');
      if(data.xlink)
	input.*::Reference.@mimeType = data.mimetype ? data.mimetype : 'application/json';
      else
	input.*::Data.*::ComplexData.@mimeType = data.mimetype ? data.mimetype : 'application/json';
      if (data.encoding)
        input.*::Data.*::ComplexData.@encoding = data.encoding;
      if (data.schema)
        input.*::Data.*::ComplexData.@schema = data.schema;
      input = input.toXMLString();
      return input;
    },
    /**
     * Method: buildInput.reference
     * Given an E4XElement representing the WPS reference input.
     *
     * Parameters:
     * identifier - {String} the input indetifier
     * data - {Object} A WPS reference input.
     *
     * Returns:
     * {E4XElement} A WPS Input node.
     */
    'reference': function(identifier,data) {
      return '<wps:Input xmlns:wps="'+this.namespaces['wps']+'"><ows:Identifier xmlns:ows="'+this.namespaces['ows']+'">'+identifier+'</ows:Identifier><wps:Reference xmlns:xlink="'+this.namespaces['xlink']+'" xlink:href="'+data.value.replace('&','&amp;','gi')+'"/></wps:Input>';
    },
    /**
     * Method: buildInput.literal
     * Given an E4XElement representing the WPS literal data input.
     *
     * Parameters:
     * identifier - {String} the input indetifier
     * data - {Object} A WPS literal data input.
     *
     * Returns:
     * {E4XElement} The WPS Input node.
     */
    'literal': function(identifier,data) {
	if(data && !eval(data["isArray"])){
	    var input = new XML('<wps:Input xmlns:wps="'+this.namespaces['wps']+'"><ows:Identifier xmlns:ows="'+this.namespaces['ows']+'">'+identifier+'</ows:Identifier><wps:Data><wps:LiteralData>'+data.value+'</wps:LiteralData></wps:Data></wps:Input>');
      if (data.type)
        input.*::Data.*::LiteralData.@dataType = data.type;
      if (data.uom)
        input.*::Data.*::LiteralData.@uom = data.uom;
      input = input.toXMLString();
      return input;
	}else if(data){
	    var inputf="";
	    for(i=0;i<parseInt(data["length"]);i++){
		var input = new XML('<wps:Input xmlns:wps="'+this.namespaces['wps']+'"><ows:Identifier xmlns:ows="'+this.namespaces['ows']+'">'+identifier+'</ows:Identifier><wps:Data><wps:LiteralData>'+data.value[i]+'</wps:LiteralData></wps:Data></wps:Input>');
		if (data.type)
		    input.*::Data.*::LiteralData.@dataType = data.type;
		if (data.uom)
		    input.*::Data.*::LiteralData.@uom = data.uom;
		inputf += input.toXMLString();
	    }
	    return inputf;
	}
	
    }
  },
  /**
   * Method: buildDataInputsNode
   * Method to build the WPS DataInputs element.
   *
   * Parameters:
   * inputs - {Object}
   *
   * Returns:
   * {E4XElement} The WPS DataInputs node for Execute query.
   */
  buildDataInputsNode:function(inputs){
    var data, builder, inputsArray=[];
    for (var attr in inputs) {
      data = inputs[attr];
	if (data && (data.mimetype || data.type == 'complex'))
        builder = this.buildInput['complex'];
	else if (data && (data.type == 'reference' || data.type == 'url'))
        builder = this.buildInput['reference'];
      else
        builder = this.buildInput['literal'];
      inputsArray.push(builder.apply(this,[attr,data]));
    }
    return '<wps:DataInputs xmlns:wps="'+this.namespaces['wps']+'">'+inputsArray.join('\n')+'</wps:DataInputs>';
  },

  buildDataOutputsNode:function(outputs){
    var data, builder, outputsArray=[];
    for (var attr in outputs) {
      data = outputs[attr];
      builder = this.buildOutput[data.type];
      outputsArray.push(builder.apply(this,[attr,data]));
    }
    return outputsArray.join('\n');
  },

  CLASS_NAME: "ZOO.Process"
});
