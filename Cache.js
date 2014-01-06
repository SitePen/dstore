define([
	"dojo/_base/lang",
	"dojo/when",
	"dojo/_base/declare",
	"./Memory"],
function(lang, when, declare, Memory){

// module:
//		dstore/Cache

function isEmpty(object){
	// will return true for empty objects, or empty strings
	for(var i in object){
		return false;
	}
	return true;
}
return declare(null, {
	cachingStore: null,
	constructor: function(options){
		for(var i in options){
			// mixin the options
			this[i] = options[i];
		}
		if(!this.cachingStore){
			this.cachingStore = new Memory();
		}
		this._collectionCache = {};
	},
	_tryCacheForResults: function(method, serialized, args){
		var cachingStore = this.cachingStore;
		if(this.allLoaded && this.hasOwnProperty('cachingStore')){
			// if we have loaded everything, we can go to the caching store
			// for quick client side querying
			var subCachingStore = new Memory();
			// wait for it to finish loading
			var data = when(when(this.allLoaded, function(){
					return cachingStore[method].apply(cachingStore, args);
				}), function(results){
					// now process the results to populate sub caching store
					var data = results.data;
					for(var i = 0; i < data.length; i++){
						subCachingStore.put(data[i]);
					}
					return data;
				});
				
			return lang.delegate(this, {
				allLoaded: data,
				data: data,
				cachingStore: subCachingStore
			});
		}
		var cacheable = !this.canCacheQuery || this.canCacheQuery(method, args);
		if(cacheable){
			// we use a key to see if we already have a sub-collection
			serialized = method + ':' + serialized;
			if(this._collectionCache[serialized]){
				return this._collectionCache[serialized];
			}
		}
		// nothing in the cache, have to use the inherited method to perform the action
		var results = this.inherited(args);
		if(cacheable){
			this._collectionCache[serialized] = results;
		}
		// give the results it's own collection cache and caching store
		results._collectionCache = {};

		if(results.data){
			var store = this;
			when(results.allLoaded = results.data, function(data){
				results.cachingStore = new Memory({data: data});
				for(var i = 0, l = data.length; i < l; i++){
					var object = data[i];
					if(!store.isLoaded || store.isLoaded(object)){
						cachingStore.put(object);
					}
				}
			});
		}
		return results;
	},
	sort: function(property, descending){
		return this._tryCacheForResults('sort',
			JSON.stringify(property) + (descending ? '-' : '+'), arguments);
	},
	filter: function(query){
		return this._tryCacheForResults('filter',
			JSON.stringify(query), arguments);
	},
	range: function(start, end){
		return this._tryCacheForResults('range',
			start + '-' + end, arguments);
	},
	forEach: function(callback, thisObject){
		var cachingStore = this.cachingStore;
		var store = this;
		if(this.allLoaded){
			// everything has been loaded, use the caching store
			return when(this.allLoaded, function(){
				return store.cachingStore.forEach(callback, thisObject);
			});
		}
		return this.allLoaded = this.inherited(arguments, [function(object){
			// store each object before calling the callback
			if(!store.isLoaded || store.isLoaded(object)){
				cachingStore.put(object);
			}
			callback.call(thisObject, object);
		}, thisObject]) || true;
	},
	/*canCacheQuery: function(method, args){
		// summary:
		//		this function can be overriden to provide more specific functionality for 
		// 		determining if a query should go to the master store or the caching store
		return true;
	},*/
	
	allLoaded: false,
	get: function(id, directives){
		var cachingStore = this.cachingStore;
		var masterGet = this.getInherited(arguments);
		var masterStore = this;
		return when(cachingStore.get(id), function(result){
			return result || when(masterGet.call(masterStore, id, directives), function(result){
				if(result){
					cachingStore.put(result, {id: id});
				}
				return result;
			});
		});
	},
	add: function(object, directives){
		var cachingStore = this.cachingStore;
		return when(this.inherited(arguments), function(result){
			// now put result in cache (note we don't do add, because add may have called put() and already added it)
			cachingStore.put(object && typeof result == "object" ? result : object, directives);
			return result; // the result from the add should be dictated by the master store and be unaffected by the cachingStore
		});
	},
	put: function(object, directives){
		// first remove from the cache, so it is empty until we get a response from the master store
		var cachingStore = this.cachingStore;
		cachingStore.remove((directives && directives.id) || this.getIdentity(object));
		return when(this.inherited(arguments), function(result){
			// now put result in cache
			cachingStore.put(object && typeof result == "object" ? result : object, directives);
			return result; // the result from the put should be dictated by the master store and be unaffected by the cachingStore
		});
	},
	remove: function(id, directives){
		var cachingStore = this.cachingStore;
		return when(this.inherited(arguments), function(result){
			return cachingStore.remove(id, directives);
		});
	},
	evict: function(id){
		return this.cachingStore.remove(id);
	}
});
});
