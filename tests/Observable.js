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
		for(i = 1; i <= 100; i++){
			data.push({id: i, name: 'item ' + i, order: i});
		}
		return new Store({data: data});
	}

	function ObservablePartialDataStore(kwArgs){
		this.backingStore = new MyStore(kwArgs);

		array.forEach(["getIdentity", "get", "add", "put", "remove"], function(method){
			this[method] = function(){
				return this.backingStore[method].apply(this.backingStore, arguments);
			};
		}, this);

		array.forEach(["filter", "sort", "range"], function(method){
			this[method] = function(){
				var newBackingStore = this.backingStore[method].apply(this.backingStore, arguments);
				return lang.delegate(this, {
					store: this.store || this,
					backingStore: newBackingStore,
					queryer: newBackingStore.queryer
				});
			};
		}, this);

		this.forEach = function(callback, thisObj){
			this.backingStore.forEach(function(){});

			this.data = when(this.backingStore.data).then(function(data){
				array.forEach(data, callback, thisObj);
				return data;
			});
			this.total = when(this.backingStore.total);
			return this;
		};
	}
	ObservablePartialDataStore.prototype = new Observable();

	registerSuite({
		name: 'dstore Observable',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'query': function(){
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

		'query with zero id': function(){
			var results = store.filter({});
			assert.strictEqual(results.data.length, 8);
            var observer = results.observe(function(type, target, info){
                    // we only do puts so previous & new indices must always been the same
                	assert.ok(info.index === info.previousIndex);
            }, true);
			store.put({id: 5, name: '-FIVE-', prime: true});
			store.put({id: 0, name: '-ZERO-', prime: false});
		},

		'paging with store.data': function(){
			var results,
				// TODO: This is unused. Should it be incorporated or removed?
				opts = {count: 25, sort: [{attribute: "order"}]},
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

		'paging with store.partialData': function(){
			var results,
				// TODO: This is unused. Should it be incorporated or removed?
				opts = {count: 25, sort: [{attribute: "order"}]},
				bigStore = createBigStore(100, ObservablePartialDataStore),
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
			var results = bigObserved.partialData;
			bigStore.add({id: 101, name: 'one oh one', order: 2.5});
			assert.strictEqual(results.length, 101);
			assert.strictEqual(observations.length, 1);
			bigStore.remove(101);
			assert.strictEqual(observations.length, 2);
			assert.strictEqual(results.length, 100);
			// Addition on the edge of a range
			bigStore.add({id: 102, name: 'one oh two', order: 24.5});
			assert.strictEqual(results.length, 101);
			assert.strictEqual(observations.length, 3);
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
				latestObservation,
				expectedObject,
				observedStore = store.observe(function (obj, from, to) {
					latestObservation = { obj: obj, from: from, to: to };
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

			// Remove all
			//	-> remove range
			observedStore.range(rangeToBeEclipsed.start, rangeToBeEclipsed.end).forEach(function(){});
			assertRangeDefined(rangeToBeEclipsed.start, rangeToBeEclipsed.end);
			observedStore.releaseRange(eclipsingRange.start, eclipsingRange.end);
			assertRangeUndefined(rangeToBeEclipsed.start, rangeToBeEclipsed.end);

			// Split
			//	-> remove existing range and replace with two others
			observedStore.range(rangeToBeSplit.start, rangeToBeSplit.end).forEach(function(){});
			assertRangeDefined(rangeToBeSplit.start, rangeToBeSplit.end);
			observedStore.releaseRange(splittingRange.start, splittingRange.end);
			assertRangeDefined(rangeToBeSplit.start, splittingRange.start);
			assertRangeUndefined(splittingRange.start, splittingRange.end);
			assertRangeDefined(splittingRange.end, rangeToBeSplit.end);

			// Remove from head
			//	-> modify existing range
			observedStore.range(rangeToBeHeadTrimmed.start, rangeToBeHeadTrimmed.end).forEach(function(){});
			assertRangeDefined(rangeToBeHeadTrimmed.start, rangeToBeHeadTrimmed.end);
			observedStore.releaseRange(headTrimmingRange.start, headTrimmingRange.end);
			assertRangeUndefined(headTrimmingRange.start, headTrimmingRange.end);
			assertRangeDefined(headTrimmingRange.end, rangeToBeHeadTrimmed.end);

			// Remove from tail
			//	-> modify existing range
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
