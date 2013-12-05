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
		for(var i = ranges.length - 1; i >= 0; --i){
			var existingRange = ranges[i],
				existingStart = range.start,
				existingEnd = existingStart + range.count;

			if (newStart > existingEnd){
				// existing range completely precedes new range. we are done.
				ranges.splice(i, 0, createRange(newStart, newEnd));
				return;
			}else if(newEnd >= existingStart){
				// the ranges overlap and must be merged into a single range
				newStart = Math.min(newStart, existingStart);
				newEnd = Math.max(newEnd, existingEnd);
				ranges.splice(i, 1);
			}
		}

		ranges.unshift(createRange(newStart, newEnd));
	}

	function unregisterRange(ranges, start, end){
		for(var i = 0, range; (range = ranges[i]); ++i){
			var existingStart = range.start,
				existingEnd = existingStart + range.count;

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
			notify(undef, id);
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

			observed.releaseRange = function(){};
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
			observed.releaseRange = function(start, end){
				unregisterRange(ranges, start, end);

				for(var i = start; i <= end; ++i){
					delete this.partialData[i];
				}
			};
		}

		function notify(changed, existingId){
			revision++;
			when(observed.data || observed.partialData, function(resultsArray){
				var queryExecutor = observed.queryer;
				var atEnd = false;//resultsArray.length != options.count;
				var i, j, l, range;
				/*if(++queryRevision != revision){
					throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
				}*/

				function updateRange(rangeIndex, index, count){
					var range = ranges[rangeIndex];
				}

				var removedObject, removedFrom = -1, removalRangeIndex = -1, insertedInto = -1, insertionRangeIndex = -1;
				if(existingId !== undef){
					// remove the old one
					for(var i = 0; removedFrom === -1 && i < ranges.length; ++i){
						range = ranges[rangeIndex];
						for(var j = range.start, l = j + range.count; j < l; ++j){
							var object = resultsArray[j];
							if(store.getIdentity(object) == existingId){
								removedFrom = j;
								removalRangeIndex = i;
								removedObject = resultsArray[removedFrom];
								resultsArray.splice(removedFrom, 1);

								range.count--;
								for(j = rangeIndex + 1; j < ranges.length; ++j){
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
				if(changed){
					if(queryExecutor){
						if(queryExecutor.matches ? queryer.matches(changed) : queryExecutor([changed]).length){
							var begin = 0,
								end = array.length - 1,
								sampleArray,
								sortedIndex;
							while (begin <= end && insertedInto === -1){
								i = begin + Math.round((end - begin) / 2);
								range = ranges[i];

								sampleArray = resultsArray.slice(range.start, range.start + range.count);

								// If the original index is in range, put back in the original slot
								// so it doesn't move unless it needs to (relying on a stable sort below)
								if(removedFrom >= range.start && removedFrom < (range.start + range.count)){
									sampleArray.splice(removedFrom, 0, changed);
								}else{
									sampleArray.push(changed);
								}

								sortedIndex = queryExecutor(sampleArray).indexOf(changed);

								if(sortedIndex < 0 || (sortedIndex === 0 && range.start !== 0)){
									end = i - 1;
								}else if(sortedIndex >= sampleArray.length && sortedIndex < resultsArray.length){
									begin = i + 1;
								}else{
									insertedInto = range[rangeIndex].start + sortedIndex;
									insertionRangeIndex = i;
								}
							}
						}
					}else if(existingId !== undef){
						// we don't have a queryEngine, so we can't provide any information
						// about where it was inserted or moved to. If it is an update, we leave it's position alone. other we at least indicate a new object
						insertedInto = removedFrom;
						insertionRangeIndex = removalRangeIndex;
					}else{
						// a new object
						insertedInto = store.defaultIndex || 0;

						var range;
						for(i = 0; insertionRangeIndex === -1 && i < ranges.length; ++i){
							range = ranges[i];
							if(range.start <= insertedInto && insertedInto < (range.start + range.count)){
								insertionRangeIndex = i;
							}
						}
					}

					if(insertedInto > -1){
						resultsArray.splice(insertedInto, 0, changed);

						// TODO: NOTE: This is broken for a non-zero store.defaultIndex because, when an insertion range is not found, this code assumes insertion at the beginning.
						if(insertionRangeIndex > -1){
							ranges[rangeIndex].count++;
						}
						for(i = insertionRangeIndex + 1; i < ranges.length; ++i){
							ranges[i].start++;
						}

						// splice insertion arguments
						listener(insertedInto, 0, changed);
					}
				}
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
