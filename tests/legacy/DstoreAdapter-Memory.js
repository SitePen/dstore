define([
	'dojo/_base/declare',
	'intern!object',
	'intern/chai!assert',
	'dstore/Memory',
	'../sorting',
	'dstore/legacy/DstoreAdapter'
], function (declare, registerSuite, assert, Memory, sorting, DstoreAdapter) {

	var store;

	registerSuite({
		name: 'legacy dstore adapter - Memory',

		beforeEach: function () {
			store = new DstoreAdapter({
				store: new Memory({
					data: [
						{ id: 1, name: 'one', prime: false, mappedTo: 'E' },
						{ id: 2, name: 'two', even: true, prime: true, mappedTo: 'D' },
						{ id: 3, name: 'three', prime: true, mappedTo: 'C' },
						{ id: 4, name: 'four', even: true, prime: false, mappedTo: null },
						{ id: 5, name: 'five', prime: true, mappedTo: 'A' }
					]
				})
			});
		},

		'get': function () {
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.strictEqual(store.get(3).id, 3);
			assert.strictEqual(store.getIdentity(store.get(2)), 2);
			assert.isTrue(store.get(5).prime);
		},
		'query': function () {
			assert.strictEqual(store.query({prime: true}).length, 3);
			assert.strictEqual(store.query({even: true})[1].name, 'four');
		},
		'query with string': function () {
			assert.strictEqual(store.query({name: 'two'}).length, 1);
			assert.strictEqual(store.query({name: 'two'})[0].name, 'two');
		},
		'query with reg exp': function () {
			assert.strictEqual(store.query({name: /^t/}).length, 2);
			assert.strictEqual(store.query({name: /^t/})[1].name, 'three');
			assert.strictEqual(store.query({name: /^o/}).length, 1);
			assert.strictEqual(store.query({name: /o/}).length, 3);
		},
		'query with test function': function () {
			assert.strictEqual(store.query({id: {test: function (id) {
				return id < 4;
			}}}).length, 3);
			assert.strictEqual(store.query({even: {test: function (even, object) {
				return even && object.id > 2;
			}}}).length, 1);
		},
		'query with sort': function () {
			assert.strictEqual(store.query({prime: true}, {sort: [
				{attribute: 'name'}
			]}).length, 3);
			assert.strictEqual(store.query({even: true}, {sort: [
				{attribute: 'name'}
			]})[1].name, 'two');
			assert.strictEqual(store.query({even: true}, {sort: function (a, b) {
				return a.name < b.name ? -1 : 1;
			}})[1].name, 'two');
			assert.strictEqual(store.query(null, {sort: [
				{attribute: 'mappedTo'}
			]})[4].name, 'four');
		},
		'query with paging': function () {
			assert.strictEqual(store.query({prime: true}, {start: 1, count: 1}).length, 1);
			assert.strictEqual(store.query({even: true}, {start: 1, count: 1})[0].name, 'four');
		},
		'query result includes `total` property': function () {
			var results = store.query();
			assert.property(results, 'total');
			assert.strictEqual(results.total, results.length);
		},
		'put update': function () {
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
		},
		'put new': function () {
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.get(6).perfect);
		},
		'add duplicate': function () {
			var threw;
			try {
				store.add({
					id: 5,
					perfect: true
				});
			} catch (e) {
				threw = true;
			}
			assert.isTrue(threw);
		},
		'add new': function () {
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.get(7).prime);
		},
		'remove': function () {
			assert.isTrue(store.remove(3));
			assert.strictEqual(store.get(3), undefined);
		},
		'remove missing': function () {
			assert.isFalse(!!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.get(1).id, 1, 'Everything is undisturbed.');
		},
		'query after changes': function () {
			store.add({ id: 7, prime: true });
			assert.strictEqual(store.query({prime: true}).length, 4);
			assert.strictEqual(store.query({perfect: true}).length, 0);
			store.remove(3);
			store.put({ id: 6, perfect: true });
			assert.strictEqual(store.query({prime: true}).length, 3);
			assert.strictEqual(store.query({perfect: true}).length, 1);
		},
		'ItemFileReadStore style data': function () {
			var dstoreObj = new Memory({
				data: {
					items: [
						{name: 'one', prime: false},
						{name: 'two', even: true, prime: true},
						{name: 'three', prime: true}
					],
					identifier: 'name'
				}
			});
			var anotherStore = new DstoreAdapter({ store: dstoreObj });
			assert.strictEqual(anotherStore.get('one').name, 'one');
			assert.strictEqual(anotherStore.query({name: 'one'})[0].name, 'one');
		},
		'add new id assignment': function () {
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		},
		nestedSuite: sorting('legacy dstore adapter sorting - dstore/Memory', function before(data) {
			return function before() {
				var dstoreObj = new Memory({data: data});
				store = new DstoreAdapter({ store: dstoreObj });
			};
		}, function sort() {
			var sort = [];
			for (var i = 0; i < arguments.length; i++) {
				sort[i] = {
					attribute: arguments[i].property,
					descending: arguments[i].descending
				};
			}
			return store.query({}, {
					sort: sort
				});
		})
		// TODO: Add tests with dojo/store/Observable
	});
});
