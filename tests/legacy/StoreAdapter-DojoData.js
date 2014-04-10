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
			var results = store.filter({even: true}).fetch();
			assert.strictEqual(results.length, 2, 'The length is 2');
			assert.strictEqual(results[1].describe(), 'four is not a prime');
		},

		'filter': function () {
			assert.strictEqual(store.filter({prime: true}).fetch().length, 3);
			assert.strictEqual(store.filter({even: true}).fetch()[1].name, 'four');
		},

		'filter with string': function () {
			assert.strictEqual(store.filter({name: 'two'}).fetch().length, 1);
			assert.strictEqual(store.filter({name: 'two'}).fetch()[0].name, 'two');
		},

		'filter with regexp': function () {
			assert.strictEqual(store.filter({name: /^t/}).fetch().length, 2);
			assert.strictEqual(store.filter({name: /^t/}).fetch()[1].name, 'three');
			assert.strictEqual(store.filter({name: /^o/}).fetch().length, 1);
			assert.strictEqual(store.filter({name: /o/}).fetch().length, 3);
		},

		'filter with paging': function () {
			assert.strictEqual(store.filter({prime: true}).range(1, 2).fetch().length, 1);
			assert.strictEqual(store.filter({even: true}).range(1, 2).fetch()[0].name, 'four');
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
