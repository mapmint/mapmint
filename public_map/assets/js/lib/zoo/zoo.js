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
    'xml2json', 'queryString', 'wpsPayload', 'utils'
], function(X2JS, qs, wpsPayload, utils) {

    /** 
     * The ZooProcess Class
     * @constructs ZooProcess
     * @param {Object} params Parameters
     * @example
     * var myZooObject = new ZooProcess({
     *     url: "http://localhost/cgi-bin/zoo_loader.cgi",
     *     delay: 2500
     * });
     */
    var ZooProcess = function(params) {
        
        /**
	 * Object configuring the xml2json use.
	 *
         * @access private
	 * @memberof ZooProcess#
	 * @var _x2js {x2js}
         */         
        var _x2js = new X2JS({
            arrayAccessFormPaths: [
            'ProcessDescriptions.ProcessDescription.DataInputs.Input',
            'ProcessDescriptions.ProcessDescription.DataInputs.Input.ComplexData.Supported.Format',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output',
            'ProcessDescriptions.ProcessDescription.ProcessOutputs.Output.ComplexOutput.Supported.Format',
            'Capabilities.ServiceIdentification.Keywords'
            ],   
        });

       
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var debug {Boolean} true if verbose messages should be displayed on the console
	 * @default false
         */         
        this.debug = false;
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var url {String} The WPS Server URL
	 */
        this.url = params.url;
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var version {String} The WPS version
	 */
        this.version = params.version?params.version:"1.0.0";
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var language {String} The language to be used to request the WPS Server
	 * @default "en-US"
	 */
        this.language = params.language?params.language:"en-US";
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var statusLocation {Object} An object to store the statusLocation 
	 * URLs when running request including both the storeExecuteResponse and
	 * the status parameters set to true.
	 */
        this.statusLocation = {};
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var launched {Object} An object to store the running asynchrone services.
	 */
        this.launched = {};
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var terminated {Object} An object to store the finished services.
	 */
        this.terminated = {};
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var percent {Object} An object to store the percentage of completude of services.
	 */
        this.percent = {};
        /**
         * @access public
	 * @memberof ZooProcess#
	 * @var delay {Integer} The time (in milliseconds) between each polling requests.
	 * @default 2000
	 */
        this.delay = params.delay || 2000;
        
	/**
	 * The getCapabilities method run the GetCapabilities request by calling {@link ZooProcess#request}.
	 * 
	 * @method getCapabilities
	 * @memberof ZooProcess#
	 * @param {Object} params The parameter for the request and callback functions to call on success or
	 * on failure.
	 * @example
	 * // Log the array of available processes in console
	 * myZooObject.getCapabilities({
	 *     type: 'POST',
	 *     success: function(data){
	 *         console.log(data["Capabilities"]["ProcessOfferings"]["Process"]);
	 *     }
	 * });
	 */
        this.getCapabilities = function(params) {
            var closure = this;

            if (!params.hasOwnProperty('type')) {
                params.type = 'GET';
            }

            var zoo_request_params = {
                request: 'GetCapabilities',
                service: 'WPS',
                version: (params.hasOwnProperty('version')?params.version:closure.version),
            }

            this.request(zoo_request_params, params.success, params.error, params.type);
        };
        
	/**
	 * The describeProcess method run the DescribeProcess request by calling {@link ZooProcess#request}.
	 * 
	 * @method describeProcess
	 * @memberof ZooProcess#
	 * @param {Object} params 
	 * @example
	 * // Log x2js representation of all available services in console
	 * myZooObject.describeProcess({
	 *     type: 'POST',
	 *     identifier: "all"
	 *     success: function(data){
	 *         console.log(data);
	 *     }
	 * });
	 */
        this.describeProcess = function(params) {
            var closure = this;

            if (!params.hasOwnProperty('type')) {
                params.type = 'GET';
            }

            var zoo_request_params = {
                Identifier: params.identifier,
                request: 'DescribeProcess',
                service: 'WPS',
                version: (params.hasOwnProperty('version')?params.version:closure.version),
            }

            this.request(zoo_request_params, params.success, params.error, params.type);
        };
        
	/**
	 * The convertParams method convert parameters for Execute requests
	 *
	 * @method convertParams
	 * @memberof ZooProcess#
	 * @param {Object} params The original object
	 * @returns {Object} The converted object
	 */
	this.convertParams = function(params){
	    var closure = this;
	    if(closure.debug){
		console.log("======== Execute "+params.identifier);
		console.log(params);
	    }

            if (!params.hasOwnProperty('type')) {
                params.type = 'GET';
            }

            var zoo_request_params = {
                request: 'Execute',
                service: 'WPS',
                version: (params.hasOwnProperty('version')?params.version:closure.version),
                Identifier: params.identifier,
                DataInputs: params.dataInputs ? params.dataInputs : '',
                DataOutputs: params.dataOutputs ? params.dataOutputs : '',
            }

	    //console.log(zoo_request_params);

            if (params.hasOwnProperty('responseDocument')) {
                zoo_request_params.ResponseDocument = params.responseDocument;
            }
            if (params.hasOwnProperty('mode')) {
                zoo_request_params.mode = params.mode;
            }
            if (params.hasOwnProperty('storeExecuteResponse') &&  params.storeExecuteResponse) {
                zoo_request_params.storeExecuteResponse = 'true';
            }
            if (params.hasOwnProperty('status') &&  params.status) {
                zoo_request_params.status = 'true';
            }
            if (params.hasOwnProperty('lineage') &&  params.lineage) {
                zoo_request_params.lineage = 'true';
            }
	    return zoo_request_params;
	};

	/**
	 * The buildRequest method is building the object expected by
	 * [jQuery.ajax]{@link http://api.jquery.com/jquery.ajax/}.
	 * In case of GET request, it will use {@link ZooProcess#getQueryString}.
	 * In case of POST request, it will use {@link module:wpsPayload} getPayload.
	 *
	 * @method buildRequest
	 * @memberof ZooProcess#
	 * @param {Object} params the request parameters
	 * @param {String} type the request method ("GET" or "POST")
	 * @returns {Object} The expected object to give as input for the 
	 * [jQuery.ajax]{@link http://api.jquery.com/jquery.ajax/} function.
	 */
	this.buildRequest = function(params,type){
            var closure = this;
	    if(closure.debug){
		console.log('======== REQUEST method='+type);
		console.log(params);
	    }
            var url = this.url;
            var payload;
            var headers;
	    if(params.hasOwnProperty('DataOutputs'))
		for(var i=0;i<params.DataOutputs.length;i++)
		    if(params.DataOutputs[i].type==="raw"){
			params["RawDataOutput"]=params.DataOutputs[i];
			break;
		    }

	    params["language"]=this.language;
            if (type == 'GET') {
                url += '?' + this.getQueryString(params);
            } else if (type == 'POST') {
                payload = wpsPayload.getPayload(params);
		if(closure.debug){
                    console.log("======== POST PAYLOAD ========");
                    console.log(payload);
		    console.log(params);
		}

                headers = {
                    "Content-Type": "text/xml"        
                };
            }
	    
            if(closure.debug){
		console.log("ajax url: "+url);
	    }
	    return {"url":url,"headers": headers,"data": payload,"type":type};
	};

	/**
	 * The getRequest method call the {@link ZooProcess#buildRequest} method
	 * by giving the {@link ZooProcess#convertParams} result as first 
	 * argument and the detected type (default is 'GET') defined in params.
	 * 
	 * @method getRequest
	 * @memberof ZooProcess#
	 * @params {Object} params The request parameters
	 */
	this.getRequest = function(params){
	    var closure = this;
	    var type = 'GET';
	    if(params.hasOwnProperty("type"))
		type=params["type"];
	    return closure.buildRequest(closure.convertParams(params),type);
	};

	/**
	 * The execute method run the Execute request by calling {@link ZooProcess#request}
	 * with the params converted by {@link ZooProcess#convertParams}.
	 *
	 * @method execute
	 * @memberof ZooProcess#
	 * @param {Object} param Parameters
	 * @example
	 * myZooObject.execute({
	 *     identifier: "Buffer",
	 *     dataInputs: [{"identifier":"InputPolygon","href":"http://features.org/toto.xml","mimeType":"text/xml"}],
	 *     dataOutputs: [{"identifier":"Result","mimeType":"application/json","type":"raw"}],
	 *     type: 'POST',
	 *     success: function(data) {
	 *         console.log(data);
	 *     }
	 * });
	 */
        this.execute = function(params) {
            var closure = this;
            this.request(closure.convertParams(params), params.success, params.error, params.type);
        };

        
	/**
	 * The request method call {@link ZooProcess#buildRequest} method to
	 * to build parameters to give to 
	 * [jQuery.ajax]{@link http://api.jquery.com/jquery.ajax/}.
	 * If the request succeed and if the content-type of the response is 
	 * "text/xml" then xml2json is called on the resulting data and passed 
	 * to the onSuccess callback function given in parameter. In case the
	 * request failed, the WPS Exception Repport will be parsed with 
	 * xml2json and given as parameter to the onError callback function.
	 *
	 * @method request
	 * @memberof ZooProcess#
	 * @param {Object} params The object used as parameter for
	 * [jQuery.ajax]{@link http://api.jquery.com/jquery.ajax/}
	 * @param {Function} onSuccess The callback function called if the request succeed
	 * @param {Function} onError The callback function called if the request failed 
	 * @param {String} type The request method ('GET' or 'POST')
	 */
        this.request = function(params, onSuccess, onError, type) {
            var closure = this;

	    var obj;
	    obj=closure.buildRequest(params,type);
            $.ajax(obj)
		.always(
                    function() {
			//console.log("ALWAYS");
			console.log("ALWAYS");
                    }
		)
		.fail(
                    function(jqXHR, textStatus, errorThrown) {
			if(closure.debug){
			    console.log("======== ERROR ========");
			}
			var robj=_x2js.xml2json( jqXHR.responseXML );
			if(closure.debug){
			    console.log(robj);
			}
			if(onError)
			    onError(robj);
                    }
		)
		.done(
                    function(data, textStatus, jqXHR) {
			if(closure.debug){
			    console.log("======== SUCCESS ========2");
			    console.log(data);
			}
			var ctype=jqXHR.getResponseHeader("Content-Type").split(";")[0];
			if( ctype=="text/xml" )
			{
			    var tmpD=data;
			    try{
				data = _x2js.xml2json( data );
				data._origin=tmpD;
			    }catch(e){
				console.log("error "+e);
			    }
			}
			var launched;
			var version=(params.version?params.version:closure.version);
			if(version=="1.0.0"){
			    if (params.storeExecuteResponse == 'true' && params.status == 'true') {
				launched = closure.parseStatusLocation(data);            
				closure.statusLocation[launched.sid] = launched.statusLocation;
				
				if ( launched.hasOwnProperty('sid') && 
				     !closure.launched.hasOwnProperty(launched.sid)) {
				    closure.launched[launched.sid] = launched.statusLocation;
				}
			    }
			}
			else{
			    if (params.mode == 'async') {
				launched = closure.parseJobID(data);
				closure.statusLocation[launched.sid] = closure.url+"?request=GetStatus&service=WPS&version=2.0.0&JobID="+launched.jobid;
				if ( launched.hasOwnProperty('sid') && 
				     !closure.launched.hasOwnProperty(launched.sid)) {
				    closure.launched[launched.sid] = launched.jobid;
				}
			    }	    
			}

			if(onSuccess)
			    onSuccess(data, launched);
		    });
        };
        
	/**
	 * The watch method should be used from the success callback function
	 * passed to {@link ZooProcess#execute} when both status and 
	 * storeExecuteResponse parameters are set to 'true', so when the 
	 * service should be called asynchronously. This function is
	 * responsible for polling the WPS server until the service end (success
	 * or failure). It call the {@link ZooProcess#getStatus} method every
	 * {@link ZooProcess#delay} milliseconds.
	 *
	 * @method watch
	 * @memberof ZooProcess#
	 * @param {Integer} sid The identifier of the running service
	 * @param {Object} handlers The callback function definitions 
	 * (onPercentCompleted, onProcessSucceeded, onError)
	 * @example
	 * zoo.execute({
	 *     identifier: 'MyIdentifier',
	 *     type: 'POST',
	 *     dataInputs: myInputs,
	 *     dataOutputs: myOupts,
	 *     storeExecuteResponse: true,
	 *     status: true,
	 *     success: function(data, launched) {
	 *         zoo.watch(launched.sid, {
         *             onPercentCompleted: function(data) {
	 *                 console.log("**** PercentCompleted ****");
	 *                 console.log(data);
         *                 progress.text(data.text+' : '+(data.percentCompleted)+'%');
         *             },
	 *             onProcessSucceeded: function(data) {
         *                 progress.css('width', (100)+'%');
	 *                 progress.text(data.text+' : '+(100)+'%');
	 *                     if (data.result.ExecuteResponse.ProcessOutputs) {
	 *                         console.log("**** onSuccess ****");
	 *                         console.log(data.result);
	 *                     }
	 *             },
	 *             onError: function(data) {
	 *                 console.log("**** onError ****");
	 *                 console.log(data);
	 *             },
         *         });
	 *     },
	 *     error: function(data) {
	 *         console.log("**** ERROR ****");
	 *         console.log(data);
	 *         notify("Execute asynchrone failed", 'danger');
	 *     }
	 * });
	 */
        this.watch = function(sid, handlers) {
            //onPercentCompleted, onProcessSucceeded, onError
            var closure = this;
	    if(closure.debug){
		console.log("WATCH: "+sid);
	    }

            function onSuccess(data) {
		if(closure.debug){
                    console.log("++++ getStatus SUCCESS "+sid);
                    console.log(data);
		}

		if(data.StatusInfo || data.Result){
		    if (data.Result) {

			var ret = {
                            sid: sid,
                            text: "",
                            result: data
			};

			if (handlers.onProcessSucceeded instanceof Function) {
                            handlers.onProcessSucceeded(ret);
			}

			return;
		    }
		    if (data.StatusInfo.Status == "Running") {
			if(closure.debug){
			    console.log("#### ProcessStarted");
			}
			
			var message="";
			for(index=0;index<data._origin.childNodes[0].childNodes.length;index++){
			    if(data._origin.childNodes[0].childNodes[index].nodeType==8){
				message=data._origin.childNodes[0].childNodes[index].textContent;
			    }
			}
			var ret = {
                            sid: sid,
                            percentCompleted: (data.StatusInfo.PercentCompleted?data.StatusInfo.PercentCompleted:0),
                            text: message,
                            creationTime: "",
			};

			if (handlers.onPercentCompleted instanceof Function) {
                            handlers.onPercentCompleted(ret);
			}
                    }
                    else if (data.StatusInfo.Status == "Succeeded") {
			if(closure.debug){
			    console.log("#### ProcessSucceeded");
			}

			var text = "";
			closure.terminated[sid] = true;

			ret = {
                            sid: sid,
                            text: text,
                            result: data
			};
			
			closure.getResult(sid, onSuccess, onError);
                    }
                    else {
			if(closure.debug){
			    console.log("#### UNHANDLED EXCEPTION");
			}
			closure.terminated[sid] = true;
			ret = {
                            sid: sid,
                            code: 'BAD',
                            text: 'UNHANDLED EXCEPTION'
			};
			
			//closure.emit('exception', ret);
			if (handlers.onError instanceof Function) {
                            handlers.onError(ret);
			}
                    }

		    return
		}

		if (data.ExecuteResponse.Status.ProcessAccepted) {
                    var ret = {
                        sid: sid,
                        percentCompleted: 0,
                        text: data.ExecuteResponse.Status.ProcessAccepted.__text,
                        creationTime: data.ExecuteResponse.Status._creationTime,
                    };

                    closure.percent[sid] = ret.percentCompleted;
                    //closure.emit('percent', ret);

                    if (handlers.onPercentCompleted instanceof Function) {
                        handlers.onPercentCompleted(ret);
                    }

		}
                else if (data.ExecuteResponse.Status.ProcessStarted) {
		    if(closure.debug){
			console.log("#### ProcessStarted");
		    }

                    var ret = {
                        sid: sid,
                        percentCompleted: data.ExecuteResponse.Status.ProcessStarted._percentCompleted,
                        text: data.ExecuteResponse.Status.ProcessStarted.__text,
                        creationTime: data.ExecuteResponse.Status._creationTime,
                    };

                    closure.percent[sid] = ret.percentCompleted;
                    //closure.emit('percent', ret);

                    if (handlers.onPercentCompleted instanceof Function) {
                        handlers.onPercentCompleted(ret);
                    }
                }
                else if (data.ExecuteResponse.Status.ProcessSucceeded) {
		    if(closure.debug){
			console.log("#### ProcessSucceeded");
		    }

                    var text = data.ExecuteResponse.Status.ProcessSucceeded.__text;
                    closure.terminated[sid] = true;

                    ret = {
                        sid: sid,
                        text: text,
                        result: data
                    };

                    //closure.emit('success', ret);
                    if (handlers.onProcessSucceeded instanceof Function) {
                        handlers.onProcessSucceeded(ret);
                    }
                }
                else {
		    if(closure.debug){
			console.log("#### UNHANDLED EXCEPTION");
		    }
                    closure.terminated[sid] = true;
                    ret = {
                        sid: sid,
                        code: 'BAD',
                        text: 'UNHANDLED EXCEPTION'
                    };

                    //closure.emit('exception', ret);
                    if (handlers.onError instanceof Function) {
                        handlers.onError(ret);
                    }
                }    
            }

            function onError(data) {
		if(closure.debug){
                    console.log("++++ getStatus ERROR "+sid);
                    console.log(data);
		}
            }

            function ping(sid) {
		if(closure.debug){
                    console.log("PING: "+sid);
		}

                closure.getStatus(sid, onSuccess, onError);
                if (closure.terminated[sid]) {
		    if(closure.debug){
			console.log("++++ getStatus TERMINATED "+sid);
		    }
                }
                else if (!closure.percent.hasOwnProperty(sid) || closure.percent[sid]<100) {
                    setTimeout( function() {
                        ping(sid);
                     }, closure.delay);
                } else {
		    if(closure.debug){
			console.log(closure.percent);
		    }
                }
            }

            ping(sid);
        };
        
	/**
	 * The getStatus method call 
	 * [jQuery.ajax]{@link http://api.jquery.com/jquery.ajax/} to fecth the
	 * ExecuteResponse document which contains a Status node and
	 * potentially the result (when the asynch service end). This method is
	 * used by {@link ZooProcess#watch} to get the ongoing status of 
	 * services called asynchronously.
	 * 
	 * @method getStatus
	 * @memberof ZooProcess#
	 * @param {Integer} sid Service Identifier
	 * @param {Function} onSuccess callback 
	 * @param {Function} onError callback 
	 */
        this.getStatus = function(sid, onSuccess, onError) {
            var closure = this;
	    if(closure.debug){
		console.log("GET STATUS: "+sid);
	    }
            if (closure.terminated[sid]) {
		if(closure.debug){
                    console.log("DEBUG TERMINATED");
		}
                return;
            }
            if (!closure.launched[sid]) {
		if(closure.debug){
                    console.log("DEBUG LAUNCHED");
		}
                return;
            }

            $.ajax({
		url: closure.statusLocation[sid]
	    })
		.fail(
                    function(jqXHR, textStatus, errorThrown) {
			if(closure.debug){
			    console.log("======== ERROR ========");
			}
			var robj=_x2js.xml2json( jqXHR.responseXML );
			if(closure.debug){
			    console.log(robj);
			}
			if(onError)
			    onError(robj);
                    }
		)
		.done(
                    function(data, textStatus, jqXHR) {
			if(closure.debug){
			    console.log("======== SUCCESS ========2");
			    console.log(data);
			}
			var ctype=jqXHR.getResponseHeader("Content-Type").split(";")[0];
			if( ctype=="text/xml" ){
			    var tmpD=data;
			    data = _x2js.xml2json( data );
			    data._origin=tmpD;
			}
			if(onSuccess)
			    onSuccess(data);
		    });
        };

	/**
	 * The getResult method is used by {@link ZooProcess#watch} to get the
	 * final result of services called asynchronously.
	 * 
	 * @method getResult
	 * @memberof ZooProcess#
	 * @param {Integer} sid Service Identifier
	 * @param {Function} onSuccess callback 
	 * @param {Function} onError callback 
	 */
        this.getResult = function(sid, onSuccess, onError) {
            var closure = this;
	    if(closure.debug){
		console.log("GET STATUS: "+sid);
		console.log(closure.statusLocation[sid].replace(/GetStatus/g,"GetResult"));
	    }
            $.ajax({
		url: closure.statusLocation[sid].replace(/GetStatus/g,"GetResult")
	    })
		.fail(
                    function(jqXHR, textStatus, errorThrown) {
			if(closure.debug){
			    console.log("======== ERROR ========");
			}
			var robj=_x2js.xml2json( jqXHR.responseXML );
			if(closure.debug){
			    console.log(robj);
			}
			if(onError)
			    onError(robj);
                    }
		)
		.done(
                    function(data, textStatus, jqXHR) {
			if(closure.debug){
			    console.log("======== SUCCESS ========2");
			    console.log(data);
			}
			var ctype=jqXHR.getResponseHeader("Content-Type").split(";")[0];
			if( ctype=="text/xml" ){
			    var tmpD=data;
			    data = _x2js.xml2json( data );
			    data._origin=tmpD;
			}
			if(onSuccess)
			    onSuccess(data);
		    });
        };
        
	/**
	 * The getQueryString method generate a KVP GET request which can be 
	 * used to request a WPS server.
	 *
	 * @method getQueryString
	 * @memberof ZooProcess#
	 * @param {Object} params The WPS requests parameters
	 * @returns {String} The GET WPS request
	 * @example
	 * // Log GetCapabilities GET request in console
	 * var request_params = {
	 *     request: 'GetCapabilities',
         *     service: 'WPS',
         *     version: '1.0.0',
	 *     language; 'en-US'
         * }
	 * console.log(myZooObject.getQueryString(request_params));
	 */
        this.getQueryString = function(params) {
	    var closure = this;
            var ret = '';

            serializeInputs = function(obj) {
		if(closure.debug){
		    console.log("SERIALIZE dataInputs");
		    console.log(obj);
		}
		var lt=$.type(obj);
		if(lt === "string") {
                    return obj;
		}
		var str = [];
		for(var p in obj){
		    if(lt === "array"){
			if(obj[p].hasOwnProperty("href"))
			    str.push(obj[p]["identifier"] + "=Reference");
			else
			    str.push(obj[p]["identifier"] + "=" + obj[p]["value"]);
			for(var q in obj[p]){
			    if(q!="identifier" && q!="value" && q!="href")
				str.push("@" + q + "=" + obj[p][q]);
			    else
				if(q=="href")
				    str.push("@xlink:" + q + "=" + encodeURIComponent(obj[p][q]));
			}
			str.push(";");
		    }
		    else
			if (obj.hasOwnProperty(p)) {
			    if(p=="href")
				str.push(p + "=" + encodeURIComponent(obj[p]));
			    else
				str.push(p + "=" + obj[p]);
			}
		}
		return str.join("");
            }

            serializeOutputs = function(obj) {
		if(closure.debug){
		    console.log("SERIALIZE dataOutputs");
		    console.log(obj);
		}
		var lt=$.type(obj);
		if(lt === "string") {
                    return obj;
		}
		var str = [];
		for(var p in obj){
		    str.push(obj[p]["identifier"]);
		    for(var q in obj[p]){
			if(q!="identifier" && q!="type")
			    str.push("@" + q + "=" + obj[p][q]);
		    }
		    str.push(";");
		}
		return str.join("");
            }
	    
            var responseDocument = params.ResponseDocument;
            var tmp_params = {};

            var objectKeys = Object.keys || function (obj) {
                var keys = [];
                for (var key in obj) keys.push(key);
                return keys;
            };

            var skip = {
                'DataInputs': true,
                'DataOutputs': true,
                'ResponseDocument': true,
                'RawDataOutput': true,
            }
            var keys = objectKeys(params);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (skip.hasOwnProperty(key) && skip[key]) {
                    continue;
                }
                if (params.hasOwnProperty(key)) {
                    tmp_params[key] = params[key];
                }
            }
            ret = qs.stringify(tmp_params);

            //req_options.path = req_options.path.replace("&DataInputs=sid%3D", "&DataInputs=sid=")
            if (params.hasOwnProperty('DataInputs')) {
              //var dataInputs = params.DataInputs;
		var dataInputs = serializeInputs(params.DataInputs);
		if(closure.debug){
		    console.log("dataInputs: "+dataInputs);
		}
		ret += '&DataInputs=' + dataInputs;
            }
            
            if (params.hasOwnProperty('DataOutputs')) {
		var dataOutputs = serializeOutputs(params.DataOutputs);
		if(closure.debug){
		    console.log("dataOutputs: "+dataOutputs);
		}
		if(dataOutputs!=""){
		    var displayInputs=true;
		    for(var i=0;i<params.DataOutputs.length;i++)
			if(params.DataOutputs[i].type==="raw"){
			    ret += '&RawDataOutput=' + dataOutputs;
			    displayInputs=false;
			    break;
			}
		    if(displayInputs)
			ret += '&ResponseDocument=' + dataOutputs;
		}
            }else{
		if (params.hasOwnProperty('RawDataOutput')) {
		    ret+="&RawDataOutput="+params['RawDataOutput']+";";
		}else{
		    if (params.hasOwnProperty('ResponseDocument')) {
			var lt=$.type(params['ResponseDocument']);
			if(lt === "string") {
			    ret+="&ResponseDocument="+params['ResponseDocument']+";";
			}else{
			    var tmp_ret=serializeOutputs(params['ResponseDocument']);
			    ret+="&ResponseDocument="+tmp;
			}
		    }
		}
	    }
            
            return ret;
        };
        
	/**
	 * The parseStatusLocation method parse the statusLocation and return an
	 * object with sid and statusLocation attributes which contains
	 * respectively: a unique identifier named sid and the statusLocation
	 * value returned by the WPS server.
	 * 
	 * @method parseStatusLocation
	 * @memberof ZooProcess#
	 * @param {Object} data The XML response parsed by x2js.xml2json
	 * @returns {Object} The result is an object with sid and statusLocation
	 */
        this.parseStatusLocation = function(data) {
            var closure = this;

            if (statusLocation = data.ExecuteResponse._statusLocation) {
		if(closure.debug){
                    console.log("statusLocation: "+statusLocation);
		}

		var lsid=0;
		for(i in closure.statusLocation)
		    lsid++;
		
                return {sid: lsid, statusLocation: statusLocation};
            }
        };        

	/**
	 * The parseJobID method parse the JobID and return an
	 * object with sid and the JobID attributes which contains
	 * respectively: a unique identifier named sid and the JobID
	 * value returned by the WPS server.
	 * 
	 * @method parseJobID
	 * @memberof ZooProcess#
	 * @param {Object} data The XML response parsed by x2js.xml2json
	 * @returns {Object} The result is an object with sid and jobID
	 */
        this.parseJobID = function(data) {
            var closure = this;

            if (jobID = data.StatusInfo.JobID) {

		var lsid=0;
		for(i in closure.statusLocation)
		    lsid++;
		
                return {sid: lsid, jobid: jobID};
            }
        }; 

	/**
	 * The dismiss method run the Dismiss request by calling {@link ZooProcess#request}.
	 * 
	 * @method dismiss
	 * @memberof ZooProcess#
	 * @param {Object} params 
	 * @example
	 * // Log x2js representation of all available services in console
	 * myZooObject.dismiss({
	 *     type: 'POST',
	 *     jobid: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
	 *     success: function(data){
	 *         console.log(data);
	 *     }
	 * });
	 */
        this.dismiss = function(params) {
            var closure = this;

            if (!params.hasOwnProperty('type')) {
                params.type = 'GET';
            }

            var zoo_request_params = {
                Identifier: params.identifier,
                request: 'Dismiss',
                service: 'WPS',
		jobid: params.jobid,
                version: "2.0.0",
            }

            this.request(zoo_request_params, params.success, params.error, params.type);
        };

    };
    

    return ZooProcess;

});
