define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/Observable'
], function(registerSuite, assert, array, declare, lang, Memory, Observable){

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
	function createBigStore(numItems){
		var data = [];
		var i;
		for(i = 1; i <= 100; i++){
			data.push({id: i, name: 'item ' + i, order: i});
		}
		return new MyStore({data: data});
	}

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
				bigStore = createBigStore(100),
				bigFiltered = bigStore.filter({}).sort('order');

			var rangedResults = [
			    bigFiltered.range(0,25).forEach(function(){}),
			    bigFiltered.range(25,50).forEach(function(){}),
			    bigFiltered.range(50,75).forEach(function(){}),
			    bigFiltered.range(75,100).forEach(function(){})
			];
			var observations = [];
			var bigObserved = bigFiltered.observe(function(type, target, info){
		    	observations.push({type: type, target: target, info: info});
		        console.log(" observed: ", type, target, info);
			});
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
				bigStore = createBigStore(100),
				bigFiltered = bigStore.filter({}).sort('order');

			var rangedResults = [
			    bigFiltered.range(0,25).forEach(function(){}),
			    bigFiltered.range(25,50).forEach(function(){}),
			    bigFiltered.range(50,75).forEach(function(){}),
			    bigFiltered.range(75,100).forEach(function(){})
			];
			var observations = [];
			var bigObserved = bigFiltered.observe(function(type, target, info){
		    	observations.push({type: type, target: target, info: info});
		        console.log(" observed: ", type, target, info);
			});
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

		'paging releaseRange': function(){
			// Remove all
			//	-> remove range
			// Split
			//	-> remove existing range and replace with two others
			// Remove from head
			//	-> modify existing range
			// Remove from tail
			//	-> modify existing range

			var itemCount = 100,
				store = createBigStore(itemCount),
				rangeToBeRemoved = { start: 5, end: 15 },
				rangeToBeSplit = { start: 25, end: 45 },
				rangeToBeHeadTrimmed = { start: 55, end: 65 },
				rangeToBeTailTrimmed = { start: 80, end: 95 },
				eclipsingRange = { start: 0, end: 20 },
				splittingRange = { start: 30, end: 39 },
				headTrimmingRange = { start: 50, end: 59 },
				tailTrimmingRange = { start: 90, end: 99 };

			var observations = [],
				latestObservation,
				expectedObject,
				observedStore = store.observe(function (obj, from, to) {
					latestObservation = { obj: obj, from: from, to: to };
				}),
				nextId = 101;

			observedStore.range(rangeToBeRemoved.start, rangeToBeRemoved.end);
			observedStore.range(rangeToBeSplit.start, rangeToBeSplit.end);
			observedStore.range(rangeToBeHeadTrimmed.start, rangeToBeHeadTrimmed.end);
			observedStore.range(rangeToBeTailTrimmed.start, rangeToBeTailTrimmed.end);

			observedStore.removeRange(eclipsingRange.start, eclipsingRange.end);
			latestObservation = null;
			//expectedObject = observedStore.get(
			store.put({ id: nextId++, name: "101", order: 10.5 });
			assert.strictEqual(latestObservation, null);

			// Verify correct split by testing in both result ranges and in the removed range between them
			observedStore.removeRange(splittingRange.start, splittingRange.end);
			expectedObject = { id: nextId++, name: nextId.toString(), order: 10.5 };
			store.add(expectedObject);
			assert.propertyVal(latestObservation, "obj", expectedObject);
			latestObservation = null;
			//expectedObject = { id = nextId++, name: nextId.toString(), order: 10.5 };
			store.add(expectedObject)
			assert.strictEqual(latestObservation, null);


			observedStore.removeRange(headTrimmingRange.start, headTrimmingRange.end);

			observedStore.removeRange(tailTrimmingRange.start, tailTrimmingRange.end);
		},

		'type': function(){
			assert.isFalse(store === store.observe(function(){}));
		}
	});
});
