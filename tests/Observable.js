define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/Observable'
], function(registerSuite, assert, array, declare, lang, Memory, Observable){

	var MyStore = declare([Memory], {
		get: function(){
			// need to make sure that this.inherited still works with Observable
			return this.inherited(arguments);
		}
	});
	var memoryStore = new MyStore({
		data: [
			{id: 0, name: 'zero', even: true, prime: false},
			{id: 1, name: 'one', prime: false},
			{id: 2, name: 'two', even: true, prime: true},
			{id: 3, name: 'three', prime: true},
			{id: 4, name: 'four', even: true, prime: false},
			{id: 5, name: 'five', prime: true}
		]
	});
	var store = new Observable(memoryStore);
	var data = [];
	var i;
	for(i = 1; i <= 100; i++){
		data.push({id: i, name: 'item ' + i, order: i});
	}
	var bigStore = Observable(new Memory({data: data}));

	registerSuite({
		name: 'dstore Observable',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'query': function(){
			var results = store.query({prime: true});
			assert.strictEqual(results.length, 3);
			var changes = [], secondChanges = [];
			var observer = results.observe(function(object, previousIndex, newIndex){
				changes.push({previousIndex: previousIndex, newIndex: newIndex, object: object});
			});
			var secondObserver = results.observe(function(object, previousIndex, newIndex){
				secondChanges.push({previousIndex: previousIndex, newIndex: newIndex, object: object});
			});
			var expectedChanges = [],
				expectedSecondChanges = [];
			var two = results[0];
			two.prime = false;
			store.put(two); // should remove it from the array
			assert.strictEqual(results.length, 2);
			expectedChanges.push({
				previousIndex: 0,
				newIndex: -1,
				object: {
					id: 2,
					name: 'two',
					even: true,
					prime: false
				}
			});
			expectedSecondChanges.push(expectedChanges[expectedChanges.length - 1]);
			secondObserver.cancel();
			var one = store.get(1);
			one.prime = true;
			store.put(one); // should add it
			expectedChanges.push({
				previousIndex: -1,
				'newIndex': 2,
				object: {
					id: 1,
					name: 'one',
					prime: true
				}
			});
			assert.strictEqual(results.length, 3);
			store.add({// shouldn't be added
				id: 6, name: 'six'
			});
			assert.strictEqual(results.length, 3);
			store.add({// should be added
				id: 7, name: 'seven', prime: true
			});
			assert.strictEqual(results.length, 4);

			expectedChanges.push({
				previousIndex: -1,
				'newIndex': 3,
				'object': {
					id: 7, name: 'seven', prime: true
				}
			});
			store.remove(3);
			expectedChanges.push({
				'previousIndex': 0,
				newIndex: -1,
				object: {id: 3, name: 'three', prime: true}
			});
			assert.strictEqual(results.length, 3);

			observer.remove(); // shouldn't get any more calls
			store.add({// should not be added
				id: 11, name: 'eleven', prime: true
			});
			assert.strictEqual(JSON.stringify(secondChanges), JSON.stringify(expectedSecondChanges));
			assert.strictEqual(JSON.stringify(changes), JSON.stringify(expectedChanges));
		},

		'query with zero id': function(){
			var results = store.query({});
			assert.strictEqual(results.length, 8);
			results.observe(function(object, previousIndex, newIndex){
				// we only do puts so previous & new indices must always been the same
				// unfortunately if id = 0, the previousIndex
				assert.strictEqual(previousIndex, newIndex);
			}, true);
			store.put({id: 5, name: '-FIVE-', prime: true});
			store.put({id: 0, name: '-ZERO-', prime: false});
		},

		'paging': function(){
			var results, opts = {count: 25, sort: [
				{attribute: 'order'}
			]};
			results = window.results = [
				bigStore.query({}, lang.delegate(opts, {start: 0})),
				bigStore.query({}, lang.delegate(opts, {start: 25})),
				bigStore.query({}, lang.delegate(opts, {start: 50})),
				bigStore.query({}, lang.delegate(opts, {start: 75}))
			];
			var observations = [];
			array.forEach(results, function(r){
				r.observe(function(obj, from, to){
					observations.push({from: from, to: to});
				}, true);
			});
			bigStore.add({id: 101, name: 'one oh one', order: 2.5});
			assert.strictEqual(results[0].length, 26);
			assert.strictEqual(results[1].length, 25);
			assert.strictEqual(results[2].length, 25);
			assert.strictEqual(results[3].length, 25);
			assert.strictEqual(observations.length, 1);
			bigStore.remove(101);
			assert.strictEqual(observations.length, 2);
			assert.strictEqual(results[0].length, 25);
			bigStore.add({id: 102, name: 'one oh two', order: 26.5});
			assert.strictEqual(results[0].length, 25);
			assert.strictEqual(results[1].length, 26);
			assert.strictEqual(results[2].length, 25);
			assert.strictEqual(observations.length, 3);
		},

		'type': function(){
			assert.isFalse(memoryStore === store);
		}
	});
});
