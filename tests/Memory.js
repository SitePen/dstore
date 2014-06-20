define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'./sorting',
	'dstore/Model',
	'dstore/Memory'
], function (registerSuite, assert, declare, sorting, Model, Memory) {

	var store;

	registerSuite({
		name: 'dstore Memory',

		beforeEach: function () {
			store = new Memory({
				data: [
					{ id: 1, name: 'one', prime: false, mappedTo: 'E' },
					{ id: 2, name: 'two', even: true, prime: true, mappedTo: 'D' },
					{ id: 3, name: 'three', prime: true, mappedTo: 'C' },
					{ id: 4, name: 'four', even: true, prime: false, mappedTo: null },
					{ id: 5, name: 'five', prime: true, mappedTo: 'A' }
				],
				model: Model
			});

			// add a method to the model prototype
			store.model.prototype.describe = function () {
				return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
			};
		},

		'get': function () {
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'model': function () {
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			assert.strictEqual(store.filter({even: true}).fetch()[1].describe(), 'four is not a prime');
		},

		'no model': function() {
			var noModelStore = new Memory({
				data: [
					{id: 1, name: 'one', prime: false, mappedTo: 'E'}
				],
				model: null
			});
			assert.strictEqual(noModelStore.get(1).get, undefined);
			assert.strictEqual(noModelStore.get(1).save, undefined);
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

		'filter with test function': function () {
			assert.strictEqual(store.filter({id: {test: function (id) {
				return id < 4;
			}}}).fetch().length, 3);
			assert.strictEqual(store.filter({even: {test: function (even, object) {
				return even && object.id > 2;
			}}}).fetch().length, 1);
		},

		'filter with sort': function () {
			assert.strictEqual(store.filter({prime: true}).sort('name').fetch().length, 3);
			assert.strictEqual(store.filter({even: true}).sort('name').fetch()[1].name, 'two');
			assert.strictEqual(store.filter({even: true}).sort(function (a, b) {
				return a.name < b.name ? -1 : 1;
			}).fetch()[1].name, 'two');
			assert.strictEqual(store.filter(null).sort('mappedTo').fetch()[4].name, 'four');
		},

		'filter with paging': function () {
			assert.strictEqual(store.filter({prime: true}).fetchRange({start: 1, end: 2}).length, 1);
			assert.strictEqual(store.filter({prime: true}).fetchRange({start: 1, end: 2}).totalLength, 3);
			assert.strictEqual(store.filter({even: true}).fetchRange({start: 1, end: 2})[0].name, 'four');
		},

		'filter with inheritance': function () {
			var store = new Memory({
				data: [
					{id: 1, name: 'one', prime: false},
					{id: 2, name: 'two', even: true, prime: true}
				],
				getIdentity: function () {
					return 'id-' + this.inherited(arguments);
				},
				newMethod: function () {
					return 'hello';
				}
			});
			var filtered = store.filter({even: true}).sort('name');
			var one = filtered.get('id-1');
			one.changed = true;
			filtered.put(one);
			assert.strictEqual(filtered.getIdentity(one), 'id-1');
			assert.strictEqual(filtered.newMethod(), 'hello');
			store.remove('id-1');
			assert.strictEqual(filtered.get('id-1'), undefined);
		},

		'put update': function () {
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
		},

		save: function () {
			var four = store.get(4);
			four.square = true;
			four.save();
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

		'put with options.beforeId': function () {
			// Make default put index 0 so it is clear beforeId:null is working
			store.defaultNewToStart = true;

			store.put({ id: 4 }, { beforeId: 3 });
			store.put({ id: 0 }, { beforeId: null });
			var results = store.fetch();
			assert.strictEqual(results[2].id, 4);
			assert.strictEqual(results[3].id, 3);
			assert.strictEqual(results[results.length - 1].id, 0);
		},

		'add with options.beforeId': function () {
			// Make default put index 0 so it is clear beforeId:null is working
			store.defaultNewToStart = true;

			store.add({ id: 42 }, { beforeId: 3 });
			store.add({ id: 24 }, { beforeId: null });
			var results = store.fetch();
			assert.strictEqual(results[2].id, 42);
			assert.strictEqual(results[3].id, 3);
			assert.strictEqual(results[results.length - 1].id, 24);
		},

		'create and remove': function () {
			var newObject = store.create({
				id: 10,
				name: 'ten'
			});
			assert.strictEqual(store.get(10), undefined);
			newObject.save();
			assert.isObject(store.get(10));
			newObject.remove();
			assert.strictEqual(store.get(10), undefined);
		},

		'add duplicate': function () {
			store.put({
				id: 6,
				perfect: true
			});

			var threw;
			try{
				store.add({
					id: 6,
					perfect: true
				});
			}catch(e) {
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
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.remove(7));
			assert.strictEqual(store.get(7), undefined);
		},

		'remove from object': function () {
			var newObject = store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(newObject.remove());
			assert.strictEqual(store.get(7), undefined);
		},

		'remove missing': function () {
			var expectedLength = store.fetch().length;
			assert(!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.fetch().length, expectedLength);
		},

		'filter after changes': function () {
			store.remove(2);
			store.add({ id: 6, perfect: true });
			assert.strictEqual(store.filter({prime: true}).fetch().length, 2);
			assert.strictEqual(store.filter({perfect: true}).fetch().length, 1);
		},

		'ItemFileReadStore style data': function () {
			var anotherStore = new Memory({
				data: {

					items: [
						{name: 'one', prime: false},
						{name: 'two', even: true, prime: true},
						{name: 'three', prime: true}
					],
					identifier: 'name'
				}
			});
			assert.strictEqual(anotherStore.get('one').name, 'one');
			assert.strictEqual(anotherStore.filter({name: 'one'}).fetch()[0].name, 'one');
		},

		'add new id assignment': function () {
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		},

		'total property': function () {
			var filteredCollection = store.filter(function (o) {
				return o.id <= 3;
			});

			var sortedCollection = store.sort('id');

			var ranged = store.fetchRange({start: 0, end: 3});
			assert.strictEqual(ranged.totalLength, 5);
			assert.strictEqual(ranged.length, 3);
		},
		nestedSuite: sorting('dstore Memory sorting', function before(data) {
			return function before() {
				store = new Memory({data: data});
			};
		}, function sort() {
			return store.sort.apply(store, arguments).fetch();
		})

		// TODO: Add add, update, and remove event tests for Memory or develop a reusable suite
	});
});
