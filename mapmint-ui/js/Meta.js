/**
 * copyright © geolabs 2006-2010
 * author: Gérald Fenoy gerald [ at ] geolabs [dot] fr
 *
 * MetaJS is an Object Oriented Programming Language based on top of the 
 * prototyped JavaScript language.
 * 
 */


System={};
System.libpath="metajs/";
System.shouldStart=true;
System.debug=false;
System.loaded=false;
System.document=document;
System.window=window;
System.inheritedRequire=false;
System.start=function(){};
System.specialLoad=(navigator.userAgent.match("MSIE") || navigator.userAgent.match("Safari"));
  
System.loadScript=function(){
    document.write("<script src='"+(arguments[2]?arguments[2]:"")+arguments[1]+".js' type='text/javascript' charset='utf-8' id='lib.loaded."+arguments[1]+"'></script>");
};

System.require=function() {
  var tmp=arguments[0].split('.');
  if(tmp.length>1){
    this.inherited_require(tmp);
    this.shouldStart=false;
    this.ensure_included();
    this.shouldStart=true;
    this.require(tmp[tmp.length-1]);
    this.inheritedRequire=true;
    return;
  }
  if (eval("self."+arguments[0]) && document.getElementById('lib.loaded.'+arguments[0])) { // Already exists
    return;
  }
  if(!document.getElementById('lib.loaded.'+arguments[0])){
    System.loadScript(document,arguments[0],System.libpath);
  }
};

System.inherited_require=function(){
  for(var i=0;i<arguments[0].length-1;i++){
    this.require(arguments[0][i]);
  }
};

System.ensure_included=function(){
  var head = document.getElementsByTagName("head")[0];
  try{
    var ds='lib.loaded.';
    var libs=head.getElementsByTagName("script");
    for(var i=0;i<libs.length;i++){
      if(libs[i].id){
	if(libs[i].id.substr(0,ds.length)==ds){
	  toEval=libs[i].id.substr(ds.length,libs[i].id.length-1);
	  if(System.debug)
	   System.document.body.innerHTML+="[octometa log] => "+toEval+"<br />";
	  eval(toEval);
	}
      }
    }
  }
  catch(e){
    try{
      if(System.debug)
	System.document.body.innerHTML+="[octometa alert] => "+e;
      throw("[octometa alert] => "+e);
    }
    catch(e){
      setTimeout('System.shouldStart='+this.shouldStart+';System.ensure_included();',1000+this.waitForLoad);
      this.waitForLoad++;
      return 0;
    }
  }
  if(this.shouldStart && !this.loaded){
    this.start();
    this.loaded=true;
  }
  if(arguments.length>0)
    System.ensure_included_func=arguments[0];
  if(System.ensure_included_func)
    System.ensure_included_func();
  return 1;
};

/**
 * MetaClass Class.
 *
 * Class is the metaclass for all classes defined later.
 *
 */
function Class(){ };

Class.isDefined=true;

/**
 * Function used to define new classes.
 *
 * The mechanism used there imply the you must have a method called "_init" in 
 * the class created.
 *
 * You could use an object as first argument to be able to define static 
 * properties(represented by object property name).
 *
 * Exemple : 
 * {@code MyClass = Class.create({list: new Array()}); }
 * In this exemple we define MyClass with a static attribute called list which
 * is (for all the instances of MyClass) on the intialisation an empty Array.
 *
 */
Class.create=function(){
  return Class.extend(arguments[0]);
};

Class.append=function(){
  for(i in arguments[1]){
    arguments[0][i]=arguments[1][i];
  }
};

/**
 * Function used to define the properties of the created class.
 *
 * You must use this function when you want to add properties to the created 
 * class. It must be called with one parameter which must be a javascript object
 * where the properties names are the method an attributes name and the values
 * are the attribute values or the functions body.
 * 
 * This function has the particualarity to append to a _super namespace the
 * overloaded functions in subclasses. The choice has been made to let devs
 * use the _super method definition, this could be very usefull in reusable
 * software development.
 *
 * Exemple : 
 * {@code 
 * MyClass.define({
 *  _init: function([args]){[body]}[,
 *  other: function([args]){[body]},
 *  ... ]
 * });
 * }
 *
 */
Class.define=function(def){
  for(var i in def){
    if(this.prototype[i]){
      /**
       * be carfull modified on 2007/01/03
       * before we use this.prototype._super[i] and it works in most case
       * but I've just seen that you couldn't use it when you want to define a
       * function which is allready a Class function so I've removed it.
       * this.prototype._super[i]=this.prototype[i];
       */
      this.prototype._super[i]=this.prototype[i];
    }
    this.prototype[i]=def[i];
  }
};

/**
 * Function used to call superClass method
 *
 * Exemple:
 * {@code this.superCall("<func_name>",[arguments]); }
 *
 */
Class.superCall=function(){
  var args=new Array();
  if(arguments.length>1)
    args=arguments[1];

  var top=1;

  if(this._super[arguments[0]])
    this._super[arguments[0]].apply(this,args);
  else{
    toEval="this.prototype";
    while(eval(toEval)){
      if(eval(toEval)._super && eval(toEval)._super[arguments[0]]){
	eval(toEval)._super[arguments[0]].apply(this,args);
	return;
      }
      toEval+=".prototype";
    }
  }
};


Class.dump=function(){
  var tmp="";
  for(i in this){
    tmp+=i+"\n";
    if(typeof this[i]=="object"){
      //this[i].dump();
      for(var j in this[i]){
	tmp+=" + "+j+"\n";
	if(typeof this[i][j]=="object"){
	  //tmp+=this[i][j].dump()
	  for(var k in this[i][j])
	    tmp+="  + "+k+" => "+this[i][j][k]+"\n";
	}
	else
	  tmp+="  + "+j+" => "+this[i][j]+"\n";	  
      }
    }
    else
      tmp+=" + "+i+" => "+this[i]+"\n";
  }
  //return tmp;
  document.body.appendChild(document.createTextNode(tmp));
};

/**
 * Function used to extend from a class
 *
 * Exemple :
 * {@code
 * A=Class.create();
 * A.define({
 *    message: "test",
 *    _init: function(){},
 *    print: function(){document.write("A => "+this.message);}
 *  });
 * B=A.extend();
 * B.define({
 *    message: "test",
 *    _init: function(){},
 *    print: function(){
 *       this.superCall("print");
 *       document.write("B => "+this.message);
 *    }
 *  });
 * }
 */
Class.extend=function(staticDef){
  var newClass=function(){
    this._init.apply(this,arguments);
  }

  if(typeof staticDef=='object'){
    for(i in staticDef){
      newClass[i]=staticDef[i];
    }
  }

  var proto=new this();

  for(var property in this){
    var tmp=this[property];
    if(this[property]!==Class.create){
      proto[property]=tmp;
    }
  }

  newClass.prototype=proto;
  newClass._super={};//proto;
  newClass.define=this.define;
  newClass.extend=this.extend;
  newClass.dump=this.dump;
  newClass.isDefined=false;
  //newClass._name="Octo_"+this.name;

  return newClass;
};

/**
 * Function used to keep track on the object reference from an object 
 * method.
 *
 * The bind function was inspired by this work : 
 * @see http://www.brockman.se/writing/method-references.html.utf8
 * @see http://la.ma.la/misc/js/delicious.html
 */
Class.append(Function.prototype,{

  mbind: function(){
      var myFunction=this;
      var object=arguments[0];

      return function(){
	var pargs=new Array();
	for(i=0;i<arguments.length;i++){
	  pargs.push(arguments[i]);
	}
	myFunction.apply(object,pargs);
      };
    },

  mbindWithArg: function(){
      //alert("bind");
      var myFunction=this;
      var object=arguments[0];

      var args=new Array();
      for(i=1;i<arguments.length;i++){
	args.push(arguments[i]);
      }

      return function(){
	var pargs=new Array();
	for(i=0;i<args.length;i++)
	  pargs.push(args[i]);
	for(i=0;i<arguments.length;i++){
	  pargs.push(arguments[i]);
	}
	myFunction.apply(object,pargs);
      };
    },

  mloadArgv: function(obj){
      try{
	if(this.arguments[0]){
	  for(i in this.arguments[0]){
	    obj[i]=this.arguments[0][i];
	  }
	}
      }catch(e){console.logg(e);/*alert(e);*/}
    },

  mstartd: function(ms){
      this.PID = setInterval(this,ms);
      return this;
    },

  mstopd: function(){
      clearInterval(this.PID)
    }

  });

/**
 * don't work on safari browser even if I prefer this way
 */
/*Class.append(Element.prototype,{
  setStyle: function(style){
      if(document.all)
	this.style.setAttribute("cssText",style);
      else
	this.setAttribute("style",style);
    },
  setOpacity: function(opacity){
      this.style.filter='alpha(opacity='+(opacity*10)+')';
      this.style.opacity=''+(opacity/10)+'';
      this.style.MozOpacity=''+(opacity/10)+'';
      this.style.KhtmlOpacity=''+(opacity/10)+'';
    }
  });*/

/**
 * Here we need to use a new array cause if we use the args array 
 * and then add the new arguments, this imply that we have our arguments in
 * the last element of the array.
 * Exemple of old missuse :
 * for(i=0;i<arguments.length;i++){
 *   args[args.length+i]=arguments[i];
 * }
 * this works for the first call and only this one. Indeed suppose that you
 * bind a function on an event, when the first event has been fired we have 
 * one argument. 
 */

/**
 * instanceOf
 * @see http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Guide:Property_Inheritance_Revisited:Determining_Instance_Relationships
 */
function instanceOf(object, constructor) {
  while (object !== null) {
      if (object == constructor.prototype)
         return true;
      object = object.__proto__;
   }
   return false;
}
function $mj(){
  try{return System.document.getElementById(arguments[0]);}
  catch(e){
	try{
	var res=Array();
	for(i=0;i<arguments[0].length;i++)
		res[i]=arguments[0][i];
	return res;
	}
	catch(e){
	}
  }
}
