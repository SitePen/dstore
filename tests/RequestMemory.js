define([
	'intern!object',
	'intern/chai!assert',
	'require',
	'dojo/when',
	'../RequestMemory'
], function (registerSuite, assert, require, when, RequestMemory) {

	var store;
	registerSuite({
		name: 'RequestMemory',

		beforeEach: function () {
			store = new RequestMemory({
				target: require.toUrl('dstore/tests/data/treeTestRoot')
			});
		},

		'.get': function () {
			return when(store.get('node2'), function (item) {
				assert.strictEqual(
					JSON.stringify(item),
					JSON.stringify({ 'id': 'node2', 'name':'node2', 'someProperty':'somePropertyB' })
				);
			});
		},

		// TODO: Test what put is supposed to resolve to
		'.put': function () {
			var updatedItem;
			return when(store.get('node5')).then(function (item) {
				item.name = 'nodeFIVE';
				updatedItem = item;

				return store.put(updatedItem);
			}).then(function () {
				return store.get('node5');
			}).then(function (item) {
				assert.strictEqual(JSON.stringify(item), JSON.stringify(updatedItem));
			});
		},

		// TODO: Test what add is supposed to resolve to
		'.add': function () {
			var newItem = { 'id': 'node6', 'name':'node5', 'someProperty':'somePropertyB' };
			return when(store.add(newItem), function () {
				return when(store.get('node6'), function (item) {
					assert.strictEqual(JSON.stringify(item), JSON.stringify(newItem));
				});
			});
		},

		// TODO: Test what remove is supposed to resolve to
		'.remove': function () {
			return when(store.get('node3')).then(function (item) {
				assert.ok(item);
				return store.remove('node3');
			}).then(function () {
				return store.get('node3');
			}).then(function (item) {
				assert.strictEqual(arguments.length, 1);
				assert.isUndefined(item);
			});
		},

		'filter': function () {
			var results = store.filter({ someProperty: 'somePropertyB' }).map(function (item) {
				return item.id;
			});
			return when(results, function (data) {
				assert.deepEqual(data, [ 'node2', 'node5' ]);
			});
		},

		'.sort': function () {
			var results = store.sort([
					{ property: 'someProperty', descending: true },
					{ property: 'name', descending: false }
				]).map(function (item) {
					return item.id;
				});
			return when(results, function (data) {
				assert.deepEqual(data, [ 'node3', 'node2', 'node5', 'node1', 'node4' ]);
			});
		},

		'.range': function () {
			var results = store.range(1, 4).map(function (item) {
					return item.id;
				});
			return when(results, function (data) {
				assert.deepEqual(data, [ 'node2', 'node3', 'node4' ]);
			});
		},

		'combined queries': function () {
			var results = store
				.filter(function (item) {
					return item.someProperty !== 'somePropertyB';
				})
				.sort('name', true)
				.range(1, 3)
				.map(function (item) {
					return item.id;
				});
			return when(results, function (data) {
				assert.deepEqual(data, [ 'node3', 'node1' ]);
			});
		},
		// TODO: Add tests for all permutations of filter, sort, range queries

		'like RequestMemory': function () {
			store.get('node3').then(function (object) {
				assert.strictEqual(JSON.stringify(object), JSON.stringify({ id: 'node3', name:'node3', someProperty:'somePropertyC'}));
			});
			var results = [];
			return store.filter({name: 'node2'}).forEach(function (object) {
				results.push(object);
			}).then(function () {
				assert.strictEqual(JSON.stringify(results), JSON.stringify([{ id: 'node2', name:'node2', someProperty:'somePropertyB'}]));
				return store.get('node3').then(function (object) {
					object.changed = true;
					return when(store.put(object), function () {
						return when(store.get('node3'), function (object) {
							assert.strictEqual(JSON.stringify(object),
								JSON.stringify({ id: 'node3', name:'node3', someProperty:'somePropertyC', changed: true}));
						});
					});
				});
			});
		}
	});
});

