define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/when',
	'dstore/Memory',
	'dstore/Observable'
], function(registerSuite, assert, array, declare, lang, when, Memory, Observable){

	var MyStore = declare([Memory, Observable], {
		get: function(){
			// need to make sure that this.inherited still works with Observable
			return this.inherited(arguments);
		}
	});
	var store = new MyStore({
		data: [
			{id: 0, name: 'zero', even: true, prime: false},
			{id: 1, name: 'one', prime: false},
			{id: 2, name: 'two', even: true, prime: true},
			{id: 3, name: 'three', prime: true},
			{id: 4, name: 'four', even: true, prime: false},
			{id: 5, name: 'five', prime: true}
		]
	});

	// TODO: Maybe name this differently
	function createBigStore(numItems, Store){
		var data = [];
		var i;
		for(i = 0; i < numItems; i++){
			data.push({id: i, name: 'item ' + i, order: i});
		}
		return new Store({data: data});
	}

	// A store for testing Observable with only partial in-memory data
	var ObservablePartialDataStore = declare(Observable, (function(){
		var proto = {
			constructor: function(kwArgs){
				this.backingStore = new MyStore(kwArgs);
			}
		};

		array.forEach(["getIdentity", "get", "add", "put", "remove"], function(method){
			proto[method] = function(){
				return this.backingStore[method].apply(this.backingStore, arguments);
			};
		});

		array.forEach(["filter", "sort", "range"], function(method){
			proto[method] = function(){
				var newBackingStore = this.backingStore[method].apply(this.backingStore, arguments);
				return lang.delegate(this, {
					store: this.store || this,
					backingStore: newBackingStore,
					queryer: newBackingStore.queryer
				});
			};
		});

		// Make backing store an observed collection so its data is kept up-to-date
		proto.observe = function(){
			this.backingStore = this.backingStore.observe(function(){});
			return this.inherited(arguments);
		};

		proto.forEach = function(callback, thisObj){
			this.backingStore.forEach(function(){});

			this.data = when(this.backingStore.data).then(function(data){
				array.forEach(data, callback, thisObj);
				return data;
			});
			this.total = when(this.backingStore.total);
			return this;
		};

		return proto;
	})());

	registerSuite({
		name: 'dstore Observable',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'filter': function(){
			var results = store.filter({prime: true});
			assert.strictEqual(results.data.length, 3);
			var changes = [], secondChanges = [];
			var observer = results.observe(function(type, target, info){
				changes.push({type: type, target: target, info: info});
			});
			var secondObserver = results.observe(function(type, target, info){
				secondChanges.push({type: type, target: target, info: info});
			});
			var expectedChanges = [],
				expectedSecondChanges = [];
			var two = results.data[0];
			two.prime = false;
			store.put(two); // should remove it from the array
			assert.strictEqual(observer.data.length, 2);
			expectedChanges.push({
				type: "update",
				target: two,
				info: {
					previousIndex: 0
				}
			});
			expectedSecondChanges.push(expectedChanges[expectedChanges.length - 1]);
			secondObserver.remove();
			var one = store.get(1);
			one.prime = true;
			store.put(one); // should add it
			expectedChanges.push({
				type: "update",
				target: one,
				info: {
					index: 2
				}
			});
			assert.strictEqual(observer.data.length, 3);
			// shouldn't be added
			var six = {id:6, name:"six"};
			store.add(six);
			assert.strictEqual(observer.data.length, 3);

			expectedChanges.push({
				type: "add",
				target: six,
				info: {
					// no index because the addition doesn't have a place in the filtered results
				}
			});

			// should be added
			var seven = {id:7, name:"seven", prime:true};
			store.add(seven);
			assert.strictEqual(observer.data.length, 4);

			expectedChanges.push({
				type: "add",
				target: seven,
				info: {
					index: 3
				}
			});
			store.remove(3);
			expectedChanges.push({
				type: "remove",
				target: 3,
				info: {
					previousIndex: 0
				}
			});
			assert.strictEqual(observer.data.length, 3);

			observer.remove(); // shouldn't get any more calls
			store.add({// should not be notified for this addition
				id:11, name:"eleven", prime:true
			});

			assert.deepEqual(secondChanges, expectedSecondChanges);
			assert.deepEqual(changes, expectedChanges);
		},

		'filter with zero id': function(){
			var results = store.filter({});
			assert.strictEqual(results.data.length, 8);
            var observer = results.observe(function(type, target, info){
                    // we only do puts so previous & new indices must always been the same
                	assert.ok(info.index === info.previousIndex);
            });
			store.put({id: 5, name: '-FIVE-', prime: true});
			store.put({id: 0, name: '-ZERO-', prime: false});
		},

		'paging with store.data': function(){
			var results,
				bigStore = createBigStore(100, MyStore),
				bigFiltered = bigStore.filter({}).sort('order');

			var observations = [];
			var bigObserved = bigFiltered.observe(function(type, target, info){
		    	observations.push({type: type, target: target, info: info});
		        console.log(" observed: ", type, target, info);
			});
			var rangedResults = [
			    bigObserved.range(0,25).forEach(function(){}),
			    bigObserved.range(25,50).forEach(function(){}),
			    bigObserved.range(50,75).forEach(function(){}),
			    bigObserved.range(75,100).forEach(function(){})
			];
			var results = bigObserved.data;
			bigStore.add({id: 101, name: 'one oh one', order: 2.5});
			assert.strictEqual(results.length, 101);
			assert.strictEqual(observations.length, 1);
			bigStore.remove(101);
			assert.strictEqual(observations.length, 2);
			assert.strictEqual(results.length, 100);
			bigStore.add({id: 102, name: 'one oh two', order: 26.5});
			assert.strictEqual(results.length, 101);
			assert.strictEqual(observations.length, 3);
		},

		// TODO: Consider breaking this down into smaller test cases
		'paging with store.partialData': function(){
			var bigStore = createBigStore(100, ObservablePartialDataStore),
				bigFiltered = bigStore.filter({}).sort('order'),
				latestObservation,
				bigObserved = bigFiltered.observe(function(type, target, info){
					latestObservation = {type: type, target: target, info: info};
					console.log(" observed: ", type, target, info);
				}),
				backingData = bigObserved.backingStore.data,
				item,
				assertObservationIs = function(expectedObservation){
					assert.deepEqual(latestObservation, expectedObservation);
				};
			// TODO: Fix names bigXyz names. Probably use the term collection instead of store for return value of filter and sort

			// An update outside of requested ranges has an indeterminate index
			item = bigStore.get(0);
			item.order = 1.25;
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { } });

			// An addition outside of requested ranges has an indeterminate index
			item = { id: 1.5, name: 'item 1.5', order: 1.5 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { } });

			// Remove additional item to make subsequent item indices and id's line up
			bigStore.remove(item.id);
			assertObservationIs({ type: "remove", target: item.id, info: { } });

			// An update sorted to the beginning of a range and the data has a known index
			bigObserved.range(0, 25).forEach(function(){});
			item = bigStore.get(0);
			item.order = 0;
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { index: 0, previousIndex: 1 } });

			// An addition sorted to the beginning of a range and the data has a known index
			item = { id: -1, name: 'item -1', order: -1 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { index: 0 } });

			// Remove additional item to make subsequent item indices and id's line up
			bigStore.remove(item.id);
			assertObservationIs({ type: "remove", target: item.id, info: { previousIndex: 0 } });

			// An update sorted to the end of a range has an indeterminate index
			item = bigStore.get(24);
			item.name = "item 24 updated";
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { previousIndex: 24 } });

			// An addition sorted to the end of a range has an indeterminate index
			item = { id: 24.1, name: 'item 24.1', order: 24.1 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { } });

			// Remove additional item to make subsequent item indices and id's line up
			bigStore.remove(item.id);
			assertObservationIs({ type: "remove", target: item.id, info: { } });

			// The previous update with an undetermined index resulted in an item dropping from the first range
			// and the first range being reduced to 0-23 instead of 0-24.
			// Requesting 24-50 instead of 25-50 in order to request a contiguous range.
			// Observable should treat contiguous requested ranges as a single range.
			bigObserved.range(24, 50).forEach(function(){});

			// An update sorted to the end of a range but adjacent to another range has a known index
			item = bigStore.get(22);
			item.order = 23.1;
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { index: 23, previousIndex: 22 } });

			// An addition sorted to the end of a range but adjacent to another range has a known index
			item = { id: 23.2, name: 'item 23.2', order: 23.2 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { index: 24 } });

			// Remove additional item to make subsequent item indices and id's line up
			bigStore.remove(item.id);
			assertObservationIs({ type: "remove", target: item.id, info: { previousIndex: 24 } });

			// An update sorted to the beginning of a range but adjacent to another range has a known index
			item = bigStore.get(25);
			item.order = 23.9;
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { index: 24, previousIndex: 25 } });

			// An addition sorted to the beginning of a range but adjacent to another range has a known index
			item = { id: 23.8, name: 'item 23.8', order: 23.8 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { index: 24 } });

			// Remove additional item to make subsequent item indices and id's line up
			bigStore.remove(item.id);
			assertObservationIs({ type: "remove", target: item.id, info: { previousIndex: 24 } });

			// Request range at end of data
			bigObserved.range(75, 100).forEach(function(){});

			// An update at the end of a range and the data has a known index
			item = bigStore.get(98);
			item.order = 99.1;
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { index: 99, previousIndex: 98 } });

			// An addition at the end of a range and the data has a known index
			item = { id: 99.2, name: 'item 99.2', order: 99.2 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { index: 100 } });

			// An update at the beginning of a range has an indeterminate index
			item = bigStore.get(76);
			item.order = 74.9;
			bigStore.put(item);
			assertObservationIs({ type: "update", target: item, info: { previousIndex: 76 } });

			// An addition at the beginning of a range has an indeterminate index
			item = { id: 74.8, name: 'item 74.8', order: 74.8 };
			bigStore.add(item);
			assertObservationIs({ type: "add", target: item, info: { } });
		},

		'paging releaseRange with store.partialData': function(){
			var itemCount = 100,
				store = createBigStore(itemCount, ObservablePartialDataStore),
				rangeToBeEclipsed = { start: 5, end: 15 },
				rangeToBeSplit = { start: 25, end: 45 },
				rangeToBeHeadTrimmed = { start: 55, end: 65 },
				rangeToBeTailTrimmed = { start: 80, end: 95 },
				eclipsingRange = { start: 0, end: 20 },
				splittingRange = { start: 30, end: 40 },
				headTrimmingRange = { start: 50, end: 60 },
				tailTrimmingRange = { start: 90, end: 100 };

			var observations = [],
				observedStore = store.observe(function (obj, from, to) {
					// Do nothing
				}),
				assertRangeDefined = function(start, end){
					for(var i = start; i < end; ++i){
						assert.notEqual(observedStore.partialData[i], undefined);
					}
				},
				assertRangeUndefined = function(start, end){
					for(var i = start; i < end; ++i){
						assert.equal(observedStore.partialData[i], undefined);
					}
				};

			// Remove all of a range
			observedStore.range(rangeToBeEclipsed.start, rangeToBeEclipsed.end).forEach(function(){});
			assertRangeDefined(rangeToBeEclipsed.start, rangeToBeEclipsed.end);
			observedStore.releaseRange(eclipsingRange.start, eclipsingRange.end);
			assertRangeUndefined(rangeToBeEclipsed.start, rangeToBeEclipsed.end);

			// Split a range
			observedStore.range(rangeToBeSplit.start, rangeToBeSplit.end).forEach(function(){});
			assertRangeDefined(rangeToBeSplit.start, rangeToBeSplit.end);
			observedStore.releaseRange(splittingRange.start, splittingRange.end);
			assertRangeDefined(rangeToBeSplit.start, splittingRange.start);
			assertRangeUndefined(splittingRange.start, splittingRange.end);
			assertRangeDefined(splittingRange.end, rangeToBeSplit.end);

			// Remove from range head
			observedStore.range(rangeToBeHeadTrimmed.start, rangeToBeHeadTrimmed.end).forEach(function(){});
			assertRangeDefined(rangeToBeHeadTrimmed.start, rangeToBeHeadTrimmed.end);
			observedStore.releaseRange(headTrimmingRange.start, headTrimmingRange.end);
			assertRangeUndefined(headTrimmingRange.start, headTrimmingRange.end);
			assertRangeDefined(headTrimmingRange.end, rangeToBeHeadTrimmed.end);

			// Remove from range tail
			observedStore.range(rangeToBeTailTrimmed.start, rangeToBeTailTrimmed.end).forEach(function(){});
			assertRangeDefined(rangeToBeTailTrimmed.start, rangeToBeTailTrimmed.end);
			observedStore.releaseRange(tailTrimmingRange.start, tailTrimmingRange.end);
			assertRangeDefined(rangeToBeTailTrimmed.start, tailTrimmingRange.start);
			assertRangeUndefined(tailTrimmingRange.start, tailTrimmingRange.end);
		},

		'type': function(){
			assert.isFalse(store === store.observe(function(){}));
		}
	});
});
