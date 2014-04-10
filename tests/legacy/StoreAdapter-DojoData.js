define([
	'dojo/_base/declare',
	'dojo/Deferred',
	'dojo/data/ItemFileWriteStore',
	'dojo/store/DataStore',
	'intern!object',
	'intern/chai!assert',
	'dojo/store/Memory',
	'../sorting',
	'dstore/legacy/StoreAdapter',
	'../data/testData'
], function (declare, Deferred, ItemFileWriteStore, DataStore, registerSuite, assert, Memory, sorting, StoreAdapter, testData) {

	function getResultsArray(store) {
		var results = [];
		store.forEach(function (data) {
			results.push(data);
		});
		return results;
	}
	var store;

	registerSuite({
		name: 'legacy dstore adapter - dojo data',

		beforeEach: function () {
			var dataStore = new DataStore({
				store: new ItemFileWriteStore({
					data: testData
				})
			});
			store = StoreAdapter.adapt(dataStore);
			store.model.prototype.describe = function () {
				return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
			};
		},

		'get': function () {
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
			assert.strictEqual(store.getIdentity(store.get(1)), 1);
		},

		'model': function () {
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			var results = getResultsArray(store.filter({even: true}));
			assert.strictEqual(results.length, 2, 'The length is 2');
			assert.strictEqual(results[1].describe(), 'four is not a prime');
		},

		'filter': function () {
			assert.strictEqual(getResultsArray(store.filter({prime: true})).length, 3);
			assert.strictEqual(getResultsArray(store.filter({even: true}))[1].name, 'four');
		},

		'filter with string': function () {
			assert.strictEqual(getResultsArray(store.filter({name: 'two'})).length, 1);
			assert.strictEqual(getResultsArray(store.filter({name: 'two'}))[0].name, 'two');
		},

		'filter with regexp': function () {
			assert.strictEqual(getResultsArray(store.filter({name: /^t/})).length, 2);
			assert.strictEqual(getResultsArray(store.filter({name: /^t/}))[1].name, 'three');
			assert.strictEqual(getResultsArray(store.filter({name: /^o/})).length, 1);
			assert.strictEqual(getResultsArray(store.filter({name: /o/})).length, 3);
		},

		'filter with paging': function () {
			assert.strictEqual(getResultsArray(store.filter({prime: true}).range(1, 2)).length, 1);
			assert.strictEqual(getResultsArray(store.filter({even: true}).range(1, 2))[0].name, 'four');
		},

		'put new': function () {
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.get(6).perfect);
		}
	});
});
