define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/aspect",
	"dojo/when",
	"dojo/promise/all",
	"dojo/_base/array"
	/*=====, "./api/Store" =====*/
], function(lang, declare, aspect, when, whenAll, array /*=====, Store =====*/){

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
	function registerRange(ranges, newStart, newEnd){
		function createRange(){
			return {
				start: newStart,
				count: newEnd - newStart
			};
		}
		
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
	}

return declare(null, {
	currentRange: [],
	observe: function(listener, observeOptions){
		var store = this.store || this,
			ranges = [];
		function registerRangeChange(rangeIndex, difference){
			ranges[rangeIndex].count += difference;
			for(var i = rangeIndex + 1; i < ranges.length; ++i){
				ranges[i].start += difference;
			}
		}

		// monitor for updates by listening to these methods
		var handles = [
			aspect.around(store, "add", whenFinished(function(object){
				store.notify("add", object);
			})),
			aspect.around(store, "put", whenFinished(function(object){
				// TODO: The weakness here is that some use put() to add new items,
				// and this will communicate an update. How should we deal with this?
				store.notify("update", object);
			})),
			aspect.around(store, "remove", whenFinished(function(id){
				store.notify("remove", id);
			}))
		];
	
		var originalRange = this.range;
		var observed = lang.delegate(this, {
			store: store,
			remove: function(){
				while(handles.length > 0){
					handles.pop().remove();
				}

				store.queryUpdaters.splice(array.indexOf(store.queryUpdaters, queryUpdater), 1);

				this.remove = noOp;
			}

		});

		var ranges = [];
		if(observed.data){
			// Treat in-memory data as one range to allow a single code path for all stores
			registerRange(ranges, 0, observed.data.length);
		}else{
			var originalRange = observed.range;
			observed.range = function(start, end){
				var rangeResults = originalRange.apply(this, arguments),
					partialData = this.partialData || (this.partialData = []);

				// Wait for total in addition to data so updated objects sorted to
				// the end of the list have a known index
				whenAll({
					data: rangeResults.data,
					total: rangeResults.total
				}).then(function(result){
					// copy the new ranged data into the parent partial data set
					var spliceArgs = [ start, end - start ].concat(result.data);
					partialData.splice.apply(partialData, spliceArgs);
					partialData.length = result.total;
					registerRange(ranges, start, end);
				});
				return rangeResults;
			}
		}

		var queryUpdater;
		// first listener was added, create the query checker and updater
		(store.queryUpdaters || (store.queryUpdaters = [])).push(queryUpdater = function(type, target){
			when(observed.data || observed.partialData, function(resultsArray){
				function findItem(itemOrId){
					var id = typeof itemOrId === "object" ? store.getIdentity(itemOrId) : itemOrId;

					if(id){
						for(var rangeIndex = 0; rangeIndex < ranges.length; ++rangeIndex){
							var range = ranges[rangeIndex];
							for(var i = range.start, l = i + range.count; i < l; ++i){
								if(store.getIdentity(resultsArray[i]) === id){
									return {
										rangeIndex: rangeIndex,
										itemIndex: i
									};
								}
							}
						}
					}
				}

				var queryExecutor = observed.queryer;
				var atEnd = false;//resultsArray.length != options.count;
				var i, l;
				var totalItems = resultsArray.length;
				/*if(++queryRevision != revision){
					throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
				}*/

				var location = findItem(target);
				if(type === "remove"){
					if(location){
						resultsArray.splice(location.itemIndex, 1);
						registerRangeChange(location.rangeIndex, -1);
					}
					listener("remove", target, { index: location ? location.itemIndex : null });
				}else if(type === "add" || type === "update"){
					var previousIndex = location ? location.itemIndex : undef,
						insertionRangeIndex, insertionIndex;
					if(queryExecutor){
						// if a matches function exists, use that (probably more efficient)
						if(queryExecutor.matches ? queryer.matches(changed) : queryExecutor([changed]).length){
							//var firstInsertedInto =  previousIndex !== undef ? 
							//	previousIndex : // put back in the original slot so it doesn't move unless it needs to (relying on a stable sort below)
							//	resultsArray.length;

							// TODO: Optimize this naive implementation. Could start with the item's range before update, sort, and do something like a binary search from there.
							for(var i = 0; insertionIndex === undef && i < ranges.length; ++i){
								var range = ranges[i],
									startIndex = range.start,
									endIndex = startIndex + range.count,
									// TODO: Don't copy the results array if range is entire array
									sampleArray = resultsArray.slice(startIndex, endIndex);
									
								sampleArray.push(object);
								
								var sortedIndex = queryExecutor(sampleArray).indexOf(object);
								if(sortedIndex > 0
								   && (sortedIndex < (sampleArray.length - 1) || sortedIndex === (totalItems - 1))){
									insertionRangeIndex = rangeIndex;
									insertionIndex = range.start + sortedIndex;
								}
							}

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
					}else{
						// we don't have a queryEngine, so we can't provide any information
						// about where it was inserted or moved to. If it is an update, we leave it's position alone, other we at least indicate a new object
						if(location){
							// an update, keep the index the same
							insertionIndex = location.itemIndex;
						}else{
							// a new object
							// TODO: Find or register containing range
							insertionIndex = store.defaultIndex || 0;
							resultsArray.splice(insertionIndex, 0, changed);
						}
					}

					if(previousIndex !== undef){
						resultsArray[insertionIndex] = target;
					}else{
						if(previousIndex !== undef){
							resultsArray.splice(previousIndex, 1);
							registerRangeChange(location.rangeIndex, -1);
						}
						if(insertionIndex !== undef){
							resultsArray.splice(insertionIndex, 0, target);
							registerRangeChange(insertionRangeIndex, 1)
						}
					}
					listener(type, target, { index: insertionIndex, previousIndex: previousIndex });
/*					if((removedFrom > -1 || insertedInto > -1) &&
						(!excludeObjectUpdates || !queryExecutor || (removedFrom != insertedInto))){
				}*/
				}else{
					// TODO: Would it be better to log the error to console instead?
					throw new Error("Unknown notification type: " + type);
				}
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
