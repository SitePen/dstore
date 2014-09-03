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
	//		dstore/Trackable
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
							notify(type, event);
						};
					})(type))
				);
			}

				// TODO: What should we do if there are mixed calls to `fetch` and `fetchRange`?
			function makeFetch() {
				return function () {
					var self = this;
					return when(this.inherited(arguments), function (results) {
						results = self._results = results.slice();

						self._ranges = [];
						registerRange(self._ranges, 0, results.length);

						return results;
					});
				};
			}
			function makeFetchRange() {
				return function (kwArgs) {
					var self = this,
						start = kwArgs.start,
						end = kwArgs.end,
						fetchResults = this.inherited(arguments);
					when(fetchResults, function (results) {
						return when(results.totalLength, function (totalLength) {
							var partialResults = self._partialResults || (self._partialResults = []);
							end = Math.min(end, start + results.length);

							partialResults.length = totalLength;

							// copy the new ranged data into the parent partial data set
							var spliceArgs = [ start, end - start ].concat(results);
							partialResults.splice.apply(partialResults, spliceArgs);
							registerRange(self._ranges, start, end);

							return results;
						});
					});
					return fetchResults;
				};
			}

			// delegate rather than call _createSubCollection because we are not ultimately creating
			// a new collection, just decorating an existing collection with item index tracking.
			// If we use _createSubCollection, it will return a new collection that may exclude
			// important, defining properties from the tracked collection.
			var observed = declare.safeMixin(lang.delegate(this), {
				_ranges: [],

				// TODO: What should we do if there are mixed calls to `fetch` and `fetchRange`?
				fetch: makeFetch(),
				fetchRange: makeFetchRange(),
				fetchSync: makeFetch(),
				fetchRangeSync: makeFetchRange(),

				releaseRange: function (start, end) {
					if (this._partialResults) {
						unregisterRange(this._ranges, start, end);

						for (var i = start; i < end; ++i) {
							delete this._partialResults[i];
						}
					}
				},

				on: function (type, listener) {
					var self = this,
						inheritedOn = this.getInherited(arguments);
					return on.parse(observed, type, listener, function (target, type) {
						return type in eventTypes ?
							aspect.after(observed, 'on_tracked' + type, listener, true) :
							inheritedOn.call(self, type, listener);
					});
				},

				tracking: {
					remove: function () {
						while (handles.length > 0) {
							handles.pop().remove();
						}

						this.remove = function () {};
					}
				},
				// make sure track isn't called twice
				track: null
			});
			if (this.fetchSync) {
				// only add these if we extending a sync-capable store
				declare.safeMixin(observed, {
					fetchSync: makeFetch(),
					fetchRangeSync: makeFetchRange()
				});
			}

			var queryExecutor;
			if (this.queryEngine) {
				arrayUtil.forEach(this.queryLog, function (entry) {
					var existingQuerier = queryExecutor,
						querier = entry.querier;
					queryExecutor = existingQuerier
						? function (data) { return querier(existingQuerier(data)); }
						: querier;
				});
			}

			var defaultEventProps = {
					'add': { index: undefined },
					'update': { previousIndex: undefined, index: undefined },
					'remove': { previousIndex: undefined }
				},
				findObject = function (data, id, start, end) {
					start = start !== undefined ? start : 0;
					end = end !== undefined ? end : data.length;
					for (var i = start; i < end; ++i) {
						if (store.getIdentity(data[i]) === id) {
							return i;
						}
					}
					return -1;
				};
			function notify(type, event) {
				revision++;
				var target = event.target;
				event = lang.delegate(event, defaultEventProps[type]);
				when(observed._results || observed._partialResults, function (resultsArray) {
					/* jshint maxcomplexity: 30 */

					function emitEvent() {
						// TODO: Eventually we will want to aggregate all the listener events
						// in an event turn, but we will wait until we have a reliable, performant queueing
						// mechanism for this (besides setTimeout)
						var method = observed['on_tracked' + type];
						method && method.call(observed, event);
					}

					if (!resultsArray) {
						// without data, we have no way to determine the indices effected by the change,
						// so just pass along the event and return.
						emitEvent();
						return;
					}

					var i, j, l, ranges = observed._ranges, range;
					/*if(++queryRevision != revision){
						throw new Error('Query is out of date, you must observe() the' +
						' query prior to any data modifications');
					}*/

					var targetId = 'id' in event ? event.id : store.getIdentity(target);
					var removedFrom = -1,
						removalRangeIndex = -1,
						insertedInto = -1,
						insertionRangeIndex = -1;
					if (type === 'remove' || type === 'update') {
						// remove the old one
						for (i = 0; removedFrom === -1 && i < ranges.length; ++i) {
							range = ranges[i];
							for (j = range.start, l = j + range.count; j < l; ++j) {
								var object = resultsArray[j];
								// often ids can be converted strings (if they are used as keys in objects),
								// so we do a coercive equality check
								/* jshint eqeqeq: false */
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
						if (queryExecutor) {
							// with a queryExecutor, we can determine the correct sorted index for the change

							if (queryExecutor.matches ? queryExecutor.matches(target) :
									queryExecutor([target]).length) {
								var begin = 0,
									end = ranges.length - 1,
									sampleArray,
									candidateIndex = -1,
									sortedIndex,
									adjustedIndex;
								while (begin <= end && insertedInto === -1) {
									// doing a binary search for the containing range
									i = begin + Math.round((end - begin) / 2);
									range = ranges[i];

									sampleArray = resultsArray.slice(range.start, range.start + range.count);

									if ('beforeId' in event) {
										candidateIndex = event.beforeId === null
											? sampleArray.length
											: findObject(sampleArray, event.beforeId);
									}

									if (candidateIndex === -1) {
										// If the original index came from this range, put back in the original slot
										// so it doesn't move unless it needs to (relying on a stable sort below)
										if (removedFrom >= Math.max(0, range.start - 1)
											&& removedFrom <= (range.start + range.count)) {
											candidateIndex = removedFrom;
										} else {
											candidateIndex = store.defaultNewToStart ? 0 : sampleArray.length;
										}
									}
									sampleArray.splice(candidateIndex, 0, target);

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
							// we don't have a queryExecutor, so we can't provide any information
							// about where it was inserted or moved to. If it is an update, we leave
							// its position alone. otherwise, we at least indicate a new object

							var range,
								possibleRangeIndex = -1;
							if ('beforeId' in event) {
								if (event.beforeId === null) {
									insertedInto = resultsArray.length;
									possibleRangeIndex = ranges.length - 1;
								} else {
									for (i = 0, l = ranges.length; insertionRangeIndex === -1 && i < l; ++i) {
										range = ranges[i];

										insertedInto = findObject(
											resultsArray,
											event.beforeId,
											range.start,
											range.start + range.count
										);

										if (insertedInto !== -1) {
											insertionRangeIndex = i;
										}
									}
								}
							} else {
								if (type === 'update') {
									insertedInto = removedFrom;
									insertionRangeIndex = removalRangeIndex;
								} else {
									if (store.defaultNewToStart) {
										insertedInto = 0;
										possibleRangeIndex = 0;
									} else {
										// default to the bottom
										insertedInto = resultsArray.length;
										possibleRangeIndex = ranges.length - 1;
									}
								}
							}

							if (possibleRangeIndex !== -1 && insertionRangeIndex === -1) {
								range = ranges[possibleRangeIndex];
								if (range && range.start <= insertedInto
									&& insertedInto <= (range.start + range.count)) {
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
					// update the total
					event.totalLength = resultsArray.length;

					emitEvent();
				});
			}

			return observed;
		}
	});
});
