define([
	'dojo/_base/lang',
	'dojo/aspect',
	'dojo/has',
	'dojo/when',
	'dojo/Deferred',
	'dojo/_base/declare',
	'./Model',
	'dojo/Evented'
], function(lang, aspect, has, when, Deferred, declare, Model, Evented){

// module:
//		dstore/Store
// detect __proto__
has.add('object-proto', !!{}.__proto__);
var hasProto = has('object-proto');
return declare(Evented, {
	constructor: function(options){
		// perform the mixin
		declare.safeMixin(this, options);
		if (!this.hasOwnProperty('model')) {
			// we need a distinct model for each store, so we can
			// save the reference back to this store on it
			this.model = declare(Model, {});
		}
		// give a reference back to the store for saving, etc.
		this.model.prototype._store = this;

		aspect.after(this, 'sort', function(){
			this.emit('refresh');
		}, true);
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
		return when(this.fetch(), function(data){
			for(var i = 0, l = data.length; i < l; i++){
				callback.call(thisObject, data[i]);
			}
			return data;
		});
	},
	on: function(type, listener){
		//	summary:
		//		Listen for data changes
		if (type !== 'refresh' && this.store && this.store !== this){
			return this.store.on(type, listener);
		}
		return this.inherited(arguments);
	},
	emit: function(type, event){
		event.type = type;
		return this.inherited(arguments);
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

	create: function(properties){
		return new this.model(properties);
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

	sort: function(property, descending){
		if(typeof property === 'object'){
			this.sorted = [].slice.call(arguments, 0);
		}else{
			this.sorted = [{
				property: property,
				descending: !!descending
			}];
		}
		return this;
	},

	range: function(start, end){
		return this._createSubCollection({
			ranged: { start: start, end: end }
		});
	}
});
});
