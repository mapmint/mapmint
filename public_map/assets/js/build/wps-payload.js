/**
 * Author : Samuel Souk aloun
 *
 * Copyright (c) 2014 GeoLabs SARL
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

define([
    'jquery', 'utils'
], function($, utils) {
    
    /**
     * The wpsPayload module is using the 
     * [Hogan.js]{@link http://twitter.github.io/hogan.js/} templating engine to
     * generate XML requests to be sent to a WPS Server.
     * In the ZOO-Client API, the Hogan.js templates have to be compiled before
     * you can use them from you application. Please refer to the ZOO-Client 
     * installation documentation for more informations.
     * 
     * @module wpsPayload 
     * @requires payloads
     * @requires jquery
     * @requires utils
     */
    
    return {

	/** @exports wpsPayload */
        
        /**
	 * The getPayload function uses the mustache 
	 * templates and the parameters provided to generate a valid WPS XML 
	 * request.
	 * 
	 * @static
	 * @param {Object} params - The object representing the request.
	 * @returns {string} - The corresponding XML request
	 * @example
	 * // GetCapabilities
	 * var request_params = {
         *     request: 'GetCapabilities',
	 *     language: 'en-US'
         * };
	 * console.wpsPayload.getPayload(request_params));
	 * @example
	 * // DescribeProcess with Identifier value set to "all".
	 * var request_params = {
         *     request: 'DescribeProcess',
	 *     identifier: ["all"]
         * };
	 * console.log(wpsPayload.getPayload(request_params));
	 * @example
	 * //
	 * var request_params = {
	 *     request: 'Execute',
	 *     Identifier: "Buffer",
	 *     DataInputs: [{"identifier":"InputPolygon","href":"http://features.org/toto.xml","mimeType":"text/xml"}],
	 *     DataOutputs: [{"identifier":"Result","mimeType":"application/json"}], 
	 *     language: 'en-US'
	 * };
	 * console.log(wpsPayload.getPayload(request_params));
	 */
        getPayload: function(params) {
            if (params.request == 'DescribeProcess') {
                return this.getPayload_DescribeProcess(params);
            } else if (params.request == 'GetCapabilities') {
                return this.getPayload_GetCapabilities(params);
            } else if (params.request == 'Execute') {
                return this.getPayload_Execute(params);
            } else {
                console.log("#### UNKNOWN REQUEST ####");
            }
        },

        /**
	 * The getPayload_GetCapabilities function is used to generate a valid 
	 * WPS XML GetCapabilities request using the 
	 * [payload_GetCapabilities.mustache]{@link http://zoo-project.org/trac/browser/trunk/zoo-project/zoo-client/lib/tpl/payload_GetCapabilities.mustache} 
	 * template.
	 * 
	 * @static
	 * @param {Object} params - The object representing the request.
	 * @returns {string} - The corresponding XML request
	 * @example
	 * // log the XML request in console
	 * var request_params = {
	 *     language: 'en-US'
         * };
	 * console.log(wpsPayload.getPayload_GetCapabilities(request_params));
	 */
        getPayload_GetCapabilities: function(params) {
            return templates["payload_GetCapabilities"].render(params);
        },
        
        /**
	 * The getPayload_DescribeProcess function is used to generate a valid 
	 * WPS XML DescribeProcess  request using the 
	 * [payload_DescribeProcess.mustache]{@link http://zoo-project.org/trac/browser/trunk/zoo-project/zoo-client/lib/tpl/payload_DescribeProcess.mustache} 
	 * template.
	 * 
	 * @static
	 * @param {Object} params - The object representing the request.
	 * @returns {string} - The corresponding XML request
	 * @example
	 * // log the XML request in console
	 * var request_params = {
	 *     Identifier: ["Buffer","Centroid"],
	 *     language: 'en-US'
         * };
	 * console.log(wpsPayload.getPayload_DescribeProcess(request_params));
	 */
        getPayload_DescribeProcess: function(params) {
            if (params.Identifier) {
                if ($.isArray(params.Identifier)) {
                    return templates["payload_DescribeProcess"].render({identifiers: params.Identifier,language: params.language});
                }
                else {
                    return templates["payload_DescribeProcess"].render({identifiers: [params.Identifier],language: params.language});
                }
            }
            // TODO: no Identifier
        },

        /**
	 * The getPayload_Execute function is used to generate a valid WPS XML 
	 * Excute request using the 
	 * [payload_Execute.mustache]{@link http://zoo-project.org/trac/browser/trunk/zoo-project/zoo-client/lib/tpl/payload_Execute.mustache}
	 * template.
	 * 
	 * @static
	 * @param {Object} params - The object representing the request.
	 * @returns {string} - The corresponding XML request
	 * @example
	 * // log the XML request in console
	 * var request_params = {
	 *     Identifier: "Buffer",
	 *     DataInputs: [{"identifier":"InputPolygon","href":"http://features.org/toto.xml","mimeType":"text/xml"}],
	 *     DataOutputs: [{"identifier":"Result","mimeType":"application/json"}], 
	 *     language: 'en-US'
	 * };
	 * console.log(wpsPayload.getPayload_Execute(request_params));
	 */
        getPayload_Execute: function(params) {
            if (params.DataInputs) {
                for (var i = 0; i < params.DataInputs.length; i++) {
		    /**
		     * Define inputs type depending on presence of mimeType, 
		     * dataType and crs or dimension for ComplexData, 
		     * LiteralData and BoundingBox data respectively
		     */
		    var hasType=false;
		    var lp={"data":"literal","mime":"complex"};
		    for(j in lp){
			if (params.DataInputs[i][j+"Type"]) {
			    params.DataInputs[i]['is_'+lp[j]] = true;
			    params.DataInputs[i].type=lp[j];
			    if(j=="mime"){
				params.DataInputs[i].is_XML=(params.DataInputs[i][j+"Type"]=="text/xml");
				if(!params.DataInputs[i].is_XML){
				    var tmp=params.DataInputs[i][j+"Type"].split(";");
				    params.DataInputs[i].is_XML=(tmp[0]=="text/xml");
				}
			    }
			    hasType=true;
			}
                    }
		    if(!hasType){
			if (params.DataInputs[i]["type"]=="bbox" || 
			    params.DataInputs[i]["dimension"] || 
			    params.DataInputs[i]["crs"]){

			    params.DataInputs[i]['is_bbox'] = true;
			    params.DataInputs[i].type='bbox';
			    hasType=true;
			    
			}
			if(!hasType){
			    params.DataInputs[i]['is_literal'] = true;
			    params.DataInputs[i].type = "literal";
			}
		    }
                    /*
                     * Set some default values and flags.
                     */
                    if (params.DataInputs[i].type == 'bbox') {
                	if (!params.DataInputs[i].crs) {
                    	    params.DataInputs[i].crs = "EPSG:4326";
                    	}
                    	if (!params.DataInputs[i].dimension) {
                    	    params.DataInputs[i].dimension = 2;
                    	}
            	    }
                    
                    // Complex data from payload callback.
                    if (params.DataInputs[i].complexPayload_callback) {			
                        params.DataInputs[i].value = window[params.DataInputs[i].complexPayload_callback]();
			console.log(params.DataInputs[i].value);
                    }
                    
                    // Complex data from reference.
                    if (params.DataInputs[i].href) {
                        params.DataInputs[i].is_reference = true;
                        //params.DataInputs[i].href = utils.encodeXML(params.DataInputs[i].href);
                        if (params.DataInputs[i].method == 'POST') {
                            params.DataInputs[i].is_post = true;
                        } else {
                            params.DataInputs[i].is_get = true;
                        }
                    }
                    else {                        
                        // Complex data, embeded
                    }
                } // for i loop
            }

            //console.log("==== OUTPUTS ====");
            if (params.DataOutputs || params.storeExecuteResponse || params.status || params.lineage) {
                
                for (var i = 0; i < params.DataOutputs.length; i++) {
                    //console.log(params.DataOutputs[i]);
                    
                    if (params.DataOutputs[i].type) {
                        params.DataOutputs[i]['is_'+params.DataOutputs[i].type] = true;
                    }
                }
            }
            
            return templates["payload_Execute"].render(params);
        },
        

    };

});
