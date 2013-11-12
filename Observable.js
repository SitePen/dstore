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

	function createRange(newStart, newEnd){
		return {
			start: newStart,
			count: newEnd - newStart
		};
	}

	function registerRange(ranges, newStart, newEnd){
		function create(){
			createRange(newStart, newEnd);
		}

		var insertAtEnd = !array.some(ranges, function(range, i){
			var existingStart = range.start,
				existingEnd = existingStart + range.count;

			if(newEnd < existingStart){
				// the range completely procedes before the existing range
				ranges.splice(i + 1, 0, create());
				return true;
			}else if(newStart < existingStart){
				// the end of the new range overlaps with the existing range
				delete ranges[existingStart];
				range.start = newStart;
				range.count = existingEnd - newStart;
				return true;
			}else if(newStart <= existingEnd){
				// the start of the new range overlaps with the existing range
				range.count = newEnd - existingStart + 1;
				return true;
			}else{
				return false;
			}
		});

		if(insertAtEnd){
			ranges.push(create());
		}
	}

	function forgetRange(ranges, start, end){
		for(var i = 0, range; (range = ranges[i]); ++i){
			var existingStart = range.start,
				existingEnd = existingStart + range.count;

			// Remove all
			//	-> remove range
			// Split
			//	-> remove existing range and replace with two others
			// Remove from head
			//	-> modify existing range
			// Remove from tail
			//	-> modify existing range

			// TODO: Are these ranges inclusive or exclusive? Currently coding as if they are inclusive.
			if(start <= existingStart){
				if(end >= existingEnd){
					// The existing range is within the forgotten range
					ranges.splice(i, 1);
				}else{
					// The forgotten range overlaps the beginning of the existing range
					range.start = end + 1;
					range.count = existingEnd - range.start + 1;

					// Since the forgotten range ends before the existing range,
					// there are no more ranges to update, and we are done
					return;
				}
			}else if(start < existingEnd){
				if(end > existingStart){
					// The forgotten range is within the existing range
					ranges.splice(i, 1, createRange(existingStart, start - 1), createRange(end + 1, existingEnd));

					// We are done because the existing range bounded the forgotten range
					return;
				}else{
					// The forgotten range overlaps the end of the existing range
					range.count = start - range.start;
				}
			}
		}
	}

return declare(null, {
	currentRange: [],
	observe: function(listener, observeOptions){
		var store = this.store || this;
		var inMethod;
		function whenFinished(methodName, action){
			handles.push(aspect.around(store, methodName, function(originalMethod){
				return function(){
					var args = arguments;
					if(inMethod){
						// if one method calls another (like add() calling put()) we don't want two events
						return originalMethod.apply(this, args);
					}
					inMethod = true;
					try{
						var results = originalMethod.apply(this, args);
						when(results, function(results){
							action.apply(this, (typeof results == "object" && results) ? [results] : args);
						});
						return results;
					}finally{
						inMethod = false;
					}
				};
			}));
		}

		// monitor for updates by listening to these methods
		var handles = [];

		whenFinished("add", function(object){
			notify(object);
		});
		whenFinished("put", function(object){
			notify(object, store.getIdentity(object));
		});
		whenFinished("remove", function(id){
			notify(undefined, id);
		});
		whenFinished("notify", function(object, id){
			notify(object, id);
		});
		var observed = lang.delegate(this, {
			store: store,
			remove: function(){
				while(handles.length > 0){
					handles.pop().remove();
				}

				this.remove = function(){};
			}
		});

		var ranges = [];
		if(observed.data){
			observed.data = observed.data.slice(0); // make local copy
			// Treat in-memory data as one range to allow a single code path for all stores
			registerRange(ranges, 0, observed.data.length);

			// TODO: revisit. this strikes me as strange tonight
			observed.removeRange = function(){
				// No-op for an in-memory store
			};
		}else{
			var originalRange = observed.range;
			observed.range = function(start, end){
				var rangeResults = originalRange.apply(this, arguments),
					partialData = this.hasOwnProperty('partialData') ? this.partial : (this.partialData = []);

				// Wait for total in addition to data so updated objects sorted to
				// the end of the list have a known index
				whenAll({
					data: rangeResults.data,
					total: rangeResults.total
				}).then(function(result){
					// TODO: If the range overlaps an existing range, existing objects will be refreshed. Should there be an update notification?
					// copy the new ranged data into the parent partial data set
					var spliceArgs = [ start, end - start ].concat(result.data);
					partialData.splice.apply(partialData, spliceArgs);
					partialData.length = result.total;
					registerRange(ranges, start, end);
				});
				return rangeResults;
			};
			// TODO: Maybe this should be named `releaseRange` instead as it sounds less like a deletion
			observed.removeRange = function(start, end){
				unregisterRange(ranges, start, end);

				var partialData = this.partialData;

				// TODO: Is there need to be this careful w/ Math.min?
				for(var i = start, l = Math.min(end, partialData.length); i < l; ++i){
					delete partialData[i];
				}
			};
		}

		function notify(changed, existingId){
			revision++;
			when(observed.data || observed.partialData, function(resultsArray){
				var queryExecutor = observed.queryer;
				var atEnd = false;//resultsArray.length != options.count;
				var i, l;
				var totalItems = resultsArray.length;
				/*if(++queryRevision != revision){
					throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
				}*/
				var removedObject, removedFrom = -1, insertedInto = -1;
				if(existingId !== undef){
					// remove the old one
					for(var rangeIndex = 0; removedFrom === -1 && rangeIndex < ranges.length; ++rangeIndex){
						var range = ranges[rangeIndex];
						for(var i = range.start, l = i + range.count; i < l; ++i){
							var object = resultsArray[i];
							if(store.getIdentity(object) == existingId){
								removedFrom = i;
								removedObject = resultsArray[removedFrom];
								resultsArray.splice(removedFrom, 1);
								totalItems--;

								range.count--;
								for(var j = rangeIndex + 1; j < ranges.length; ++j){
									ranges[j].start--;
								}

								// TODO: Eventually we will want to aggregate all the listener events
								// in an event turn, but we will wait until we have a reliable, performant queueing
								// mechanism for this (besides setTimeout)
								listener(removedFrom, 1);
								break;
							}
						}
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

						// TODO: Optimize this naive implementation. Could start with the item's range before update, sort, and do something like a binary search from there.
						for(var i = 0; i < ranges.length; ++i){
							var range = ranges[i],
								startIndex = range.start,
								endIndex = startIndex + range.count,
								sampleArray = resultsArray.slice(startIndex, endIndex);

							sampleArray.push(changed);

							var sortedIndex = queryExecutor(sampleArray).indexOf(changed);
							if(sortedIndex > 0
							   && (sortedIndex < (sampleArray.length - 1) || sortedIndex === totalItems)){
								insertedInto = range.start + sortedIndex;
								resultsArray.splice(insertedInto, 0, changed);
								totalItems++;

								range.count++;
								for(var j = i + 1; j < ranges.length; ++j){
									ranges[j].start++;
								}
								break;
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
					totalItems++;
				}
				if(insertedInto > -1){
					// splice insertion arguments
					listener(insertedInto, 0, changed);
				}
/*					if((removedFrom > -1 || insertedInto > -1) &&
						(!excludeObjectUpdates || !queryExecutor || (removedFrom != insertedInto))){
				}*/
			});
		}

		return observed;
	},
	// a Comet driven store could directly call notify to notify observers when data has
	// changed on the backend
	// create a new instance
	notify: function(object, existingId){
	}
});
});
