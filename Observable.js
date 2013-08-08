define(["dojo/_base/declare", "dojo/when", "dojo/_base/array" /*=====, "./api/Store" =====*/
], function(declare, when, array /*=====, Store =====*/){

// module:
//		dojo/store/Observable
var undef, queryUpdaters = [], revision = 0;

	var inMethod;
	function whenFinished(action){
		return function(value){
			if(inMethod){
				// if one method calls another (like add() calling put()) we don't want two events
				return this.inherited(arguments);
			}
			inMethod = true;
			try{
				var results = this.inherited(arguments);
				var store = this;
				when(results, function(results){
					action.call(store, (typeof results == "object" && results) || value);
				});
				return results;
			}finally{
				inMethod = false;
			}
		}
	}
return declare(null, {
	currentRange: [],
	observe: function(listener, observeOptions){
		var queryUpdater;
		var listeners = this.hasOwnProperty('_observeListeners') ?
			this._observeListeners :
			(this._observeListeners = []);
		if(listeners.push(listener) == 1){
			var store = this.store || this;
			var filtered = this;
			// first listener was added, create the query checker and updater
			(store.queryUpdaters || (store.queryUpdaters = [])).push(queryUpdater = function(changed, existingId){
				when(filtered.data || filtered.partialData, function(resultsArray){
					var queryExecutor = filtered.queryer;
					var atEnd = false;//resultsArray.length != options.count;
					var i, l, listener;
					/*if(++queryRevision != revision){
						throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
					}*/
					var removedObject, removedFrom = -1, insertedInto = -1;
					if(existingId !== undef){
						// remove the old one
						for(i = 0, l = resultsArray.length; i < l; i++){
							var object = resultsArray[i];
							if(store.getIdentity(object) == existingId){
								removedObject = object;
								removedFrom = i;
								if(queryExecutor || !changed){// if it was changed and we don't have a queryExecutor, we shouldn't remove it because updated objects would be eliminated
									resultsArray.splice(i, 1);
								}
								break;
							}
						}
					}
					if(removedFrom > -1){
						// TODO: Eventually we will want to aggregate all the splice events
						// in an event turn, but we will wait until we have a reliable, performant queueing
						// mechanism for this (besides setTimeout)
						var copyListeners = listeners.slice();
						for(i = 0;listener = copyListeners[i]; i++){
							// splice removal arguments
							listener(removedFrom, 1);
						}
					}
					if(queryExecutor){
						// add the new one
						if(changed &&
								// if a matches function exists, use that (probably more efficient)
								(queryExecutor.matches ? queryer.matches(changed) : queryExecutor([changed]).length)){

							var firstInsertedInto = removedFrom > -1 ? 
								removedFrom : // put back in the original slot so it doesn't move unless it needs to (relying on a stable sort below)
								resultsArray.length;
							resultsArray.splice(firstInsertedInto, 0, changed); // add the new item
							insertedInto = array.indexOf(queryExecutor(resultsArray), changed); // sort it
							// we now need to push the change back into the original results array
							resultsArray.splice(firstInsertedInto, 1); // remove the inserted item from the previous index
							
/*							if((options.start && insertedInto == 0) ||
								(!atEnd && insertedInto == resultsArray.length)){
								// if it is at the end of the page, assume it goes into the prev or next page
								insertedInto = -1;
							}else{*/
								resultsArray.splice(insertedInto, 0, changed); // and insert into the results array with the correct index
							//}
						}
					}else if(changed){
						// we don't have a queryEngine, so we can't provide any information
						// about where it was inserted or moved to. If it is an update, we leave it's position alone, other we at least indicate a new object
						if(existingId !== undef){
							// an update, keep the index the same
							insertedInto = removedFrom;
						}else if(!options.start){
							// a new object
							insertedInto = store.defaultIndex || 0;
							resultsArray.splice(insertedInto, 0, changed);
						}
					}
					if(insertedInto > -1){
						var copyListeners = listeners.slice();
						for(i = 0;listener = copyListeners[i]; i++){
							// splice removal arguments
							listener(insertedInto, 0, changed);
						}						
					}
/*					if((removedFrom > -1 || insertedInto > -1) &&
							(!excludeObjectUpdates || !queryExecutor || (removedFrom != insertedInto))){
					}*/
				});
			});
		}
		var handle = {};
		handle.remove = function(){
			// remove this listener
			var index = array.indexOf(listeners, listener);
			if(index > -1){ // check to make sure we haven't already called cancel
				listeners.splice(index, 1);
				if(!listeners.length){
					// no more listeners, remove the query updater too
					store.queryUpdaters.splice(array.indexOf(store.queryUpdaters, queryUpdater), 1);
				}
			}
		};
		return handle;
	},
	// a Comet driven store could directly call notify to notify observers when data has
	// changed on the backend
	// create a new instance
	notify: function(object, existingId){
		revision++;
		var updaters = this.queryUpdaters.slice();
		for(var i = 0, l = updaters.length; i < l; i++){
			updaters[i](object, existingId);
		}
	},
	// monitor for updates by listening to these methods
	put: whenFinished(function(object){
		this.notify(object, this.getIdentity(object));
	}),
	add: whenFinished(function(object){
		this.notify(object);
	}),
	remove: whenFinished(function(id){
		this.notify(undefined, id);
	}),
	range: function(start, end){
		var rangeResults = this.inherited(arguments);
		if(!this.data){
			var partialData = this.partialData || (this.partialData = []);
			when(rangeResults.data, function(rangedData){
				// copy the new ranged data into the parent partial data set
				partialData.splice(start, end - start, rangedData);
			});
		}
		return rangeResults;
	}
});
});
