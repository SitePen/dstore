define(['dojo/_base/lang', 'dojo/has', 'dojo/_base/declare'
], function(lang, has, declare){

// module:
//		dstore/Store
// detect __proto__
has.add('object-proto', !!{}.__proto__);
var hasProto = has('object-proto');
return declare(null, {
	map: function(callback, thisObject){
		var results = [];
		// like forEach, except we collect results
		this.forEach(function(object){
			results.push(callback.call(thisObject, object));
		}, thisObject);
		return results;
	},
	// model: Function
	//		This should be a entity (like a class/constructor) with a 'prototype' property that will be
	//		used as the prototype for all objects returned from this store.
	model: {},
	
	assignPrototype: function(object){
		if(!object){
			return object;
		}

		var prototype = this.model.prototype;
		if(prototype){
			if(hasProto){
				// the fast easy way
				object.__proto__ = prototype;
			}else{
				// create a new object with the correct prototype
				object = lang.delegate(prototype, object);
			}
		}
		return object;
	}
});
});