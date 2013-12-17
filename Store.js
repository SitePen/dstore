define(['dojo/_base/lang', 'dojo/has', 'dojo/when', 'dojo/Deferred', 'dojo/_base/declare', './Model'
], function(lang, has, when, Deferred, declare, Model){

// module:
//		dstore/Store
// detect __proto__
has.add('object-proto', !!{}.__proto__);
var hasProto = has('object-proto');
return declare(null, {
	constructor: function(options){
		// perform the mixin
		declare.safeMixin(this, options);
		// give a reference back to the store for saving, etc.
		this.model.prototype._store = this;
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
	forEach: function(callback, thisObject){
		return when(this.getData(), function(data){
			for(var i = 0, l = data.length; i < l; i++){
				callback.call(thisObject, data[i]);
			}
			return data;
		});

	},
	getData: function(){
		// summary:
		//		Retrieve the collection as an array, or a promise to an array
		return this.hasOwnProperty('data') ? this.data : (this.data = this.materialize());
	},
	then: function(callback, errback){
		// summary:
		//		Retrieve the collection as an array, passed to the callback, and returning a promise
		var data = this.data;
		if(this.data.then){
			return this.data.then(callback, errback);
		}else{
			var deferred = new Deferred();
			deferred.resolve(this.data);
			return deferred.then(callback);
		}
	},

	// model: Function
	//		This should be a entity (like a class/constructor) with a 'prototype' property that will be
	//		used as the prototype for all objects returned from this store. One can set this
	//		to an empty object if you don't want any methods to decorate the returned
	//		objects (this can improve performance by avoiding prototype setting)
	model: Model,

	assignPrototype: function(object){
		// Set the object's prototype
		var model = this.model;
		if(model && object){
			var prototype = model.prototype;
			if(hasProto){
				// the fast easy way
				// http://jsperf.com/setting-the-prototype
				object.__proto__ = prototype;
			}else{
				// create a new object with the correct prototype
				object = lang.delegate(prototype, object);
			}
		}
		return object;
	},

	_createSubCollection: function(kwArgs){
		return lang.delegate(this, lang.mixin({
			store: this.store || this,
			parent: this,
		}, kwArgs));
	},

	filter: function(filter){
		return this._createSubCollection({
			filtered: (this.filtered || []).concat(filter)
		});
	},

	sort: function(attribute, descending){
		return this._createSubCollection({
			sorted: (this.sorted || []).concat({ attribute: attribute, descending: !!descending })
		});
	},

	range: function(start, end){
		return this._createSubCollection({
			ranged: { start: start, end: end }
		});
	}
});
});
