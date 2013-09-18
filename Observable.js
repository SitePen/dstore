define(["dojo/_base/lang", "dojo/_base/declare", "dojo/aspect", "dojo/when", "dojo/_base/array" /*=====, "./api/Store" =====*/
], function(lang, declare, aspect, when, array /*=====, Store =====*/){

// module:
//		dojo/store/Observable
var undef, revision = 0;

	var inMethod;
	function whenFinished(action){
		return function(originalMethod){
			return function(){
				if(inMethod){
					// if one method calls another (like add() calling put()) we don't want two events
					return originalMethod.apply(this, arguments);
				}
				inMethod = true;
				try{
					var results = originalMethod.apply(this, arguments);
					when(results, function(results){
						action.apply(this, (typeof results == "object" && results) ? [results] : arguments);
					});
					return results;
				}finally{
					inMethod = false;
				}
			};
		};
	}
	function noOp(){}

return declare(null, {
	currentRange: [],
	observe: function(listener, observeOptions){
		var store = this.store || this;

		// monitor for updates by listening to these methods
		var handles = [
			aspect.around(store, "add", whenFinished(function(object){
				store.notify(object);
			})),
			aspect.around(store, "put", whenFinished(function(object){
				store.notify(object, store.getIdentity(object));
			})),
			aspect.around(store, "remove", whenFinished(function(id){
				store.notify(undefined, id);
			}))
		];

		var originalRange = this.range;
		var observed = lang.delegate(this, {
			store: store,
			ranges: [],
			remove: function(){
				while(handles.length > 0){
					handles.pop().remove();
				}

				store.queryUpdaters.splice(array.indexOf(store.queryUpdaters, queryUpdater), 1);

				this.remove = noOp;
			},

			registerRange: function(newStart, newEnd){
				function createRange(){
					return {
						start: newStart,
						count: newEnd - newStart
					};
				}
				
				var ranges = this.ranges = this.ranges || [];
				var insertAtEnd = !ranges.some(function(range, i){
					var existingStart = range.start,
						existingEnd = existingStart + range.count;

					if(newEnd < existingStart){
						// the range completely procedes before the existing range
						ranges.splice(i + 1, 0, createRange());
						return true;
					}else if(newStart < existingStart){
						// the end of the new range overlaps with the existing range
						delete ranges[existingStart];
						range.start = newStart;
						range.count = existingEnd - newStart;
						return true;
					}else if(newStart <= existingEnd){
						// the start of the new range overlaps with the existing range	
						range.count = newEnd - existingStart;
						return true;
					}else{
						return false;
					}
				});

				if(insertAtEnd){
					ranges.push(createRange());
				}
			},
			range: function(start, end){
				var rangeResults = originalRange.apply(this, arguments);
				//if(!this.data){
					var partialData = this.partialData || (this.partialData = []);
					var self = this;
					when(rangeResults.data, function(rangedData){
						// copy the new ranged data into the parent partial data set
						var spliceArgs = [ start, end - start ].concat(rangedData);
						partialData.splice.apply(partialData, spliceArgs);
						self.registerRange(start, end);
					});
				//}
				return rangeResults;
			}
		});

		var queryUpdater;
		var store = this.store || this;
		// first listener was added, create the query checker and updater
		(store.queryUpdaters || (store.queryUpdaters = [])).push(queryUpdater = function(changed, existingId){
			when(observed.data || observed.partialData, function(resultsArray){
				var queryExecutor = observed.queryer;
				var atEnd = false;//resultsArray.length != options.count;
				var i, l;
				/*if(++queryRevision != revision){
					throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
				}*/
				var removedObject, removedFrom = -1, insertedInto = -1;
				if(existingId !== undef){
					// remove the old one
					observed.ranges.some(function(range, index){
						for(var i = range.start, l = i + range.count; i < l; ++i){
							var object = resultsArray[i];
							if(store.getIdentity(object) == existingId){
								removedObject = object;
								removedFrom = i;
								resultsArray.splice(i, 1);

								range.count--;
								for(var j = index + 1; j < observed.ranges.length; ++j){
									observed.ranges[j].start--;
								}
								return true;
							}
						}
					});
				}
				if(removedFrom > -1){
					// TODO: Eventually we will want to aggregate all the splice events
					// in an event turn, but we will wait until we have a reliable, performant queueing
					// mechanism for this (besides setTimeout)

					// splice removal arguments
					listener(removedFrom, 1);
				}
				if(queryExecutor){
					// add the new one
					if(changed &&
							// if a matches function exists, use that (probably more efficient)
							(queryExecutor.matches ? queryer.matches(changed) : queryExecutor([changed]).length)){

						var firstInsertedInto = removedFrom > -1 ? 
							removedFrom : // put back in the original slot so it doesn't move unless it needs to (relying on a stable sort below)
							resultsArray.length;

						// TODO: Optimize this naive implementation
						observed.ranges.some(function(range, rangeIndex){
							var startIndex = range.start,
								endIndex = startIndex + range.count,
								sampleArray = resultsArray.slice(startIndex, endIndex);
								
							sampleArray.push(changed);
							
							var sortedIndex = queryExecutor(sampleArray).indexOf(changed);
							if(sortedIndex > 0 && sortedIndex < (sampleArray.length - 1)){
								insertedInto = startIndex + sortedIndex;
								resultsArray.splice(insertedInto, 0, changed);

								observed.ranges[rangeIndex].count++;
								for(var j = rangeIndex + 1; j < observed.ranges.length; ++j){
									observed.ranges[j].start++;
								}
							}

							return insertedInto !== -1;
						});

						/*resultsArray.splice(firstInsertedInto, 0, changed); // add the new item
						insertedInto = array.indexOf(queryExecutor(resultsArray), changed); // sort it
						// we now need to push the change back into the original results array
						resultsArray.splice(firstInsertedInto, 1); // remove the inserted item from the previous index*/
						
/*							if((options.start && insertedInto == 0) ||
							(!atEnd && insertedInto == resultsArray.length)){
							// if it is at the end of the page, assume it goes into the prev or next page
							insertedInto = -1;
						}else{*/
							//resultsArray.splice(insertedInto, 0, changed); // and insert into the results array with the correct index
						//}
					}
				}else if(changed){
					// we don't have a queryEngine, so we can't provide any information
					// about where it was inserted or moved to. If it is an update, we leave it's position alone, other we at least indicate a new object
					if(existingId !== undef){
						// an update, keep the index the same
						insertedInto = removedFrom;
					}else /*if(!options.start)*/{
						// a new object
						insertedInto = store.defaultIndex || 0;
					}
					resultsArray.splice(insertedInto, 0, changed);
				}
				if(insertedInto > -1){
					// splice insertion arguments
					listener(insertedInto, 0, changed);
				}
/*					if((removedFrom > -1 || insertedInto > -1) &&
						(!excludeObjectUpdates || !queryExecutor || (removedFrom != insertedInto))){
				}*/
			});
		});
		
		return observed;
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
	}
});
});
