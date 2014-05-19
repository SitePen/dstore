define([
	'dojo/_base/lang',
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/when',
	'dojo/promise/all',
	'dojo/_base/array',
	'dojo/on'
	/*=====, './api/Store' =====*/
], function (lang, declare, aspect, when, whenAll, arrayUtil, on /*=====, Store =====*/) {

	// module:
	//		dstore/Observable
	var undef, revision = 0;

	function createRange(newStart, newEnd) {
		return {
			start: newStart,
			count: newEnd - newStart
		};
	}

	function registerRange(ranges, newStart, newEnd) {
		for (var i = ranges.length - 1; i >= 0; --i) {
			var existingRange = ranges[i],
				existingStart = existingRange.start,
				existingEnd = existingStart + existingRange.count;

			if (newStart > existingEnd) {
				// existing range completely precedes new range. we are done.
				ranges.splice(i + 1, 0, createRange(newStart, newEnd));
				return;
			} else if (newEnd >= existingStart) {
				// the ranges overlap and must be merged into a single range
				newStart = Math.min(newStart, existingStart);
				newEnd = Math.max(newEnd, existingEnd);
				ranges.splice(i, 1);
			}
		}

		ranges.unshift(createRange(newStart, newEnd));
	}

	function unregisterRange(ranges, start, end) {
		for (var i = 0, range; (range = ranges[i]); ++i) {
			var existingStart = range.start,
				existingEnd = existingStart + range.count;

			if (start <= existingStart) {
				if (end >= existingEnd) {
					// The existing range is within the forgotten range
					ranges.splice(i, 1);
				} else {
					// The forgotten range overlaps the beginning of the existing range
					range.start = end;
					range.count = existingEnd - range.start;

					// Since the forgotten range ends before the existing range,
					// there are no more ranges to update, and we are done
					return;
				}
			} else if (start < existingEnd) {
				if (end > existingStart) {
					// The forgotten range is within the existing range
					ranges.splice(i, 1, createRange(existingStart, start), createRange(end, existingEnd));

					// We are done because the existing range bounded the forgotten range
					return;
				} else {
					// The forgotten range overlaps the end of the existing range
					range.count = start - range.start;
				}
			}
		}
	}

	return declare(null, {
		currentRange: [],

		track: function () {
			var store = this.store || this;

			// monitor for updates by listening to these methods
			var handles = [];
			var eventTypes = {add: 1, update: 1, remove: 1};
			// register to listen for updates
			for (var type in eventTypes) {
				handles.push(
					this.on(type, (function (type) {
						return function (event) {
							notify(type, event.target || event.id, event);
						};
					})(type))
				);
			}

			// delegate rather than call _createSubCollection because we are not ultimately creating
			// a new collection, just decorating an existing collection with item index tracking.
			// If we use _createSubCollection, it will return a new collection that may exclude
			// important, defining properties from the tracked collection.
			var observed = lang.delegate(this, {
				// TODO: The fact that we have to remember `store` here might indicate the need to adjust our approach to _createSubCollection and perhaps allow for not excluding existing properties
				store: this.store || this,

				// Any sub-collections created from the tracked collection should be based on this
				// parent collection instead
				_createSubCollection: lang.hitch(this, '_createSubCollection'),

				tracking: {
					remove: function () {
						while (handles.length > 0) {
							handles.pop().remove();
						}

						this.remove = function () {};
					}
				}
			});

			var originalOn = this.on;
			// now setup our own event scope, for tracked events
			observed.on = function (type, listener) {
				return on.parse(observed, type, listener, function (target, type) {
					return type in eventTypes ?
						aspect.after(observed, 'on_tracked' + type, listener, true) :
						originalOn.call(observed, type, listener);
				});
			};

			var ranges = [];
			if (this.data) {
				observed.data = this.data.slice(0); // make local copy
				// Treat in-memory data as one range to allow a single code path for all stores
				registerRange(ranges, 0, observed.data.length);

				observed.releaseRange = function () {};
			} else {
				var originalRange = observed.range;
				observed.range = function (start, end) {
					// trigger a request
					var rangeCollection = originalRange.apply(this, arguments),
						partialData = this.hasOwnProperty('partialData') ? this.partialData : (this.partialData = []);

					// Wait for total in addition to data so updated objects sorted to
					// the end of the list have a known index
					whenAll({
						data: rangeCollection.fetch(),
						total: rangeCollection.total
					}).then(function (result) {
						partialData.length = result.total;

						// copy the new ranged data into the parent partial data set
						var spliceArgs = [ start, end - start ].concat(result.data);
						partialData.splice.apply(partialData, spliceArgs);
						registerRange(ranges, start, end);
					});
					return rangeCollection;
				};
				observed.releaseRange = function (start, end) {
					unregisterRange(ranges, start, end);

					for (var i = start; i < end; ++i) {
						delete this.partialData[i];
					}
				};
			}

			var queryExecutor;
			if (this.queryEngine) {
				arrayUtil.forEach(this.queryLog, function (entry) {
					// TODO: This isn't extensible for new query types. How we can we make a general determination to not include a query type as we do for 'range'?
					if (entry.type !== 'range') {
						var existingQueryer = queryExecutor,
							queryer = entry.queryer;
						queryExecutor = existingQueryer
							? function (data) { return queryer(existingQueryer(data)); }
							: queryer;
					}
				});
			}

			function notify(type, target, event) {
				revision++;
				event = lang.delegate(event);
				when(observed.hasOwnProperty('data') ? observed.data :
						observed.partialData, function (resultsArray) {
					/* jshint maxcomplexity: 30 */
					var i, j, l, range;
					/*if(++queryRevision != revision){
						throw new Error('Query is out of date, you must observe() the' +
						' query prior to any data modifications');
					}*/

					var targetId = type === 'remove' ? target : store.getIdentity(target);
					var removedFrom = -1,
						removalRangeIndex = -1,
						insertedInto = -1,
						insertionRangeIndex = -1;
					if (type === 'remove' || type === 'update') {
						event.previousIndex = undef;

						// remove the old one
						for (i = 0; removedFrom === -1 && i < ranges.length; ++i) {
							range = ranges[i];
							for (j = range.start, l = j + range.count; j < l; ++j) {
								var object = resultsArray[j];
								if (store.getIdentity(object) == targetId) {
									removedFrom = event.previousIndex = j;
									removalRangeIndex = i;
									resultsArray.splice(removedFrom, 1);

									range.count--;
									for (j = i + 1; j < ranges.length; ++j) {
										ranges[j].start--;
									}

									break;
								}
							}
						}
					}

					if (type === 'add' || type === 'update') {
						event.index = undef;

						if (queryExecutor) {
							// with a queryExecutor, we can determine the correct sorted index for the change

							if (queryExecutor.matches ? queryExecutor.matches(target) :
									queryExecutor([target]).length) {
								var begin = 0,
									end = ranges.length - 1,
									sampleArray,
									sortedIndex,
									adjustedIndex;
								while (begin <= end && insertedInto === -1) {
									// doing a binary search for the containing range
									i = begin + Math.round((end - begin) / 2);
									range = ranges[i];

									sampleArray = resultsArray.slice(range.start, range.start + range.count);

									// If the original index came from this range, put back in the original slot
									// so it doesn't move unless it needs to (relying on a stable sort below)
									if (removedFrom >= Math.max(0, range.start - 1) &&
											removedFrom <= (range.start + range.count)) {
										sampleArray.splice(removedFrom, 0, target);
									} else {
										sampleArray.push(target);
									}

									sortedIndex = arrayUtil.indexOf(queryExecutor(sampleArray), target);
									adjustedIndex = range.start + sortedIndex;

									if (sortedIndex === 0 && range.start !== 0) {
										end = i - 1;
									} else if (sortedIndex >= (sampleArray.length - 1) &&
											adjustedIndex < resultsArray.length) {
										begin = i + 1;
									} else {
										insertedInto = adjustedIndex;
										insertionRangeIndex = i;
									}
								}
							}
						} else {
							// we don't have a queryEngine, so we can't provide any information
							// about where it was inserted or moved to. If it is an update, we leave
							// its position alone. otherwise, we at least indicate a new object

							if (type === 'update') {
								insertedInto = removedFrom;
								insertionRangeIndex = removalRangeIndex;
							} else {
								var possibleRangeIndex;
								if (store.defaultToTop) {
									insertedInto = 0;
									possibleRangeIndex = 0;
								} else {
									// default to the bottom
									insertedInto = resultsArray.length;
									possibleRangeIndex = ranges.length - 1;
									
								}
								var range = ranges[possibleRangeIndex];
								if (range.start <= insertedInto && insertedInto <= (range.start + range.count)) {
									insertionRangeIndex = possibleRangeIndex;
								}
							}
						}

						// an item only truly has a known index if it is in a known range
						if (insertedInto > -1 && insertionRangeIndex > -1) {
							event.index = insertedInto;
							resultsArray.splice(insertedInto, 0, target);

							// update the count and start of the appropriate ranges
							ranges[insertionRangeIndex].count++;
							for (i = insertionRangeIndex + 1; i < ranges.length; ++i) {
								ranges[i].start++;
							}
						}
					}

					// TODO: Eventually we will want to aggregate all the listener events
					// in an event turn, but we will wait until we have a reliable, performant queueing
					// mechanism for this (besides setTimeout)
					type = 'on_tracked' + type;
					observed[type] && observed[type](event);
				});
			}

			return observed;
		}
	});
});
