define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/aspect",
	"dojo/when",
	"dojo/promise/all",
	"dojo/_base/array",
	"dojo/on",
	/*=====, "./api/Store" =====*/
], function(lang, declare, aspect, when, whenAll, arrayUtil, on /*=====, Store =====*/){

// module:
//		dstore/Observable
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
				existingStart = existingRange.start,
				existingEnd = existingStart + existingRange.count;

			if (newStart > existingEnd){
				// existing range completely precedes new range. we are done.
				ranges.splice(i + 1, 0, createRange(newStart, newEnd));
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

			if(start <= existingStart){
				if(end >= existingEnd){
					// The existing range is within the forgotten range
					ranges.splice(i, 1);
				}else{
					// The forgotten range overlaps the beginning of the existing range
					range.start = end;
					range.count = existingEnd - range.start;

					// Since the forgotten range ends before the existing range,
					// there are no more ranges to update, and we are done
					return;
				}
			}else if(start < existingEnd){
				if(end > existingStart){
					// The forgotten range is within the existing range
					ranges.splice(i, 1, createRange(existingStart, start), createRange(end, existingEnd));

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
	track: function(){
		var store = this.store || this;

		// monitor for updates by listening to these methods
		var handles = [];
		var eventTypes = {add: 1, update: 1, remove: 1};
		// register to listen for updates
		for(var type in eventTypes){
			this.on(type, (function(type){
				return function(event){
					notify(type, event.target || event.id, event);
				};
			})(type));
		}

		var observed = lang.delegate(this, {
			store: store,
			remove: function(){
				while(handles.length > 0){
					handles.pop().remove();
				}

				this.remove = function(){};
			}
		});

		var originalOn = this.on;
		// now setup our own event scope, for tracked events
		observed.on = function(type, listener){
				return on.parse(observed, type, listener, function(target, type){
				return type in eventTypes ?
					aspect.after(observed, 'ontracked' + type, listener, true) :
					originalOn.call(observed, type, listener);
			});
	};

		var ranges = [];
		if(this.hasOwnProperty('data')){
			observed.data = this.data.slice(0); // make local copy
			// Treat in-memory data as one range to allow a single code path for all stores
			registerRange(ranges, 0, observed.data.length);

			observed.releaseRange = function(){};
		}else{
			var originalRange = observed.range;
			observed.range = function(start, end){
				// trigger a request
				var rangeCollection = originalRange.apply(this, arguments).fetch(),
					partialData = this.hasOwnProperty('partialData') ? this.partialData : (this.partialData = []);

				// Wait for total in addition to data so updated objects sorted to
				// the end of the list have a known index
				whenAll({
					data: rangeCollection.data,
					total: rangeCollection.total
				}).then(function(result){
					partialData.length = result.total;

					// copy the new ranged data into the parent partial data set
					var spliceArgs = [ start, end - start ].concat(result.data);
					partialData.splice.apply(partialData, spliceArgs);
					registerRange(ranges, start, end);
				});
				return rangeCollection;
			};
			observed.releaseRange = function(start, end){
				unregisterRange(ranges, start, end);

				for(var i = start; i < end; ++i){
					delete this.partialData[i];
				}
			};

			// Clear partialData because the item order is unknown after sort
			var originalSort = observed.sort;
			observed.sort = function(){
				delete this.partialData;
				return originalSort.apply(this, arguments);
			};
		}

		function notify(type, target, event){
			revision++;
			event = lang.delegate(event, { index: undef, previousIndex: undef });
			when(observed.hasOwnProperty('data') ? observed.data : observed.partialData, function(resultsArray){
				var queryExecutor = observed.queryer;
				var atEnd = false;//resultsArray.length != options.count;
				var i, j, l, range;
				/*if(++queryRevision != revision){
					throw new Error("Query is out of date, you must observe() the query prior to any data modifications");
				}*/

				var targetId = type === "remove" ? target : store.getIdentity(target);
				var removedObject, removedFrom = -1, removalRangeIndex = -1, insertedInto = -1, insertionRangeIndex = -1;
				if(type === "remove" || type === "update"){
					// remove the old one
					for(i = 0; removedFrom === -1 && i < ranges.length; ++i){
						range = ranges[i];
						for(j = range.start, l = j + range.count; j < l; ++j){
							var object = resultsArray[j];
							if(store.getIdentity(object) == targetId){
								removedFrom = event.previousIndex = j;
								removalRangeIndex = i;
								resultsArray.splice(removedFrom, 1);

								range.count--;
								for(j = i + 1; j < ranges.length; ++j){
									ranges[j].start--;
								}

								break;
							}
						}
					}
				}

				if(type === "add" || type === "update"){
					if(queryExecutor){
						// with a queryExecutor, we can determine the correct sorted index for the change

						if(queryExecutor.matches ? queryer.matches(target) : queryExecutor([target]).length){
							var begin = 0,
								end = ranges.length - 1,
								sampleArray,
								sortedIndex,
								adjustedIndex;
							while (begin <= end && insertedInto === -1){
								i = begin + Math.round((end - begin) / 2);
								range = ranges[i];

								sampleArray = resultsArray.slice(range.start, range.start + range.count);

								// If the original index came from this range, put back in the original slot
								// so it doesn't move unless it needs to (relying on a stable sort below)
								if(removedFrom >= Math.max(0, range.start - 1) && removedFrom <= (range.start + range.count)){
									sampleArray.splice(removedFrom, 0, target);
								}else{
									sampleArray.push(target);
								}

								sortedIndex = arrayUtil.indexOf(queryExecutor(sampleArray), target);
								adjustedIndex = range.start + sortedIndex;

								if(sortedIndex === 0 && range.start !== 0){
									end = i - 1;
								}else if(sortedIndex >= (sampleArray.length - 1) && adjustedIndex < resultsArray.length){
									begin = i + 1;
								}else{
									insertedInto = adjustedIndex;
									insertionRangeIndex = i;
								}
							}
						}
					}else{
						// we don't have a queryEngine, so we can't provide any information
						// about where it was inserted or moved to. If it is an update, we leave it's position alone. other we at least indicate a new object

						if(type === "update"){
							insertedInto = removedFrom;
							insertionRangeIndex = removalRangeIndex;
						}else{
							// TODO: Should there be a default index for a new object of undetermined index?
							//		It seems like sending "add" notification with no index might be more appropriate.
							//		On the other hand, when adding to an unsorted list, I would expect the new element to be appended.
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
					}

					if(insertedInto > -1){
						event.index = insertedInto;
						resultsArray.splice(insertedInto, 0, target);

						// TODO: NOTE: This is broken for a non-zero store.defaultIndex because, when an insertion range is not found, this code assumes insertion at the beginning.
						if(insertionRangeIndex > -1){
							ranges[insertionRangeIndex].count++;
						}
						for(i = insertionRangeIndex + 1; i < ranges.length; ++i){
							ranges[i].start++;
						}
					}
				}

				// TODO: Eventually we will want to aggregate all the listener events
				// in an event turn, but we will wait until we have a reliable, performant queueing
				// mechanism for this (besides setTimeout)
				type = 'ontracked' + type;
				observed[type] && observed[type](event);
			});
		}

		return observed;
	},
	// a Comet driven store could directly call notify to notify observers when data has
	// changed on the backend
	// create a new instance
	notify: function(type, target){
	}
});
});
