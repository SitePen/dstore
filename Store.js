define(['dojo/_base/lang', 'dojo/has', 'dojo/when', 'dojo/_base/declare'
], function(lang, has, when, declare){

// module:
//		dstore/Store
// detect __proto__
has.add('object-proto', !!{}.__proto__);
var hasProto = has('object-proto');
return declare(null, {
	constructor: function(){
		var store = this;
		// create the default data model
		(this.model = function(){}).prototype = {
			save: function(){
				return store.put(this);
			},
			remove: function(){
				return store.remove(store.getIdentity(this));
			}
		};
	},
	map: function(callback, thisObject){
		var results = [];
		// like forEach, except we collect results
		return when(this.forEach(function(object){
			results.push(callback.call(thisObject, object));
		}, thisObject), function(){
			return results;
		});
	},
	// model: Function
	//		This should be a entity (like a class/constructor) with a 'prototype' property that will be
	//		used as the prototype for all objects returned from this store. One can set this
	//		to an empty object if you don't want any methods to decorate the returned
	// 		objects (this can improve performance by avoiding prototype setting) 
	model: null,
	
	assignPrototype: function(object){
		var model = this.model;
		if(model && object){
			var prototype = model.prototype;
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