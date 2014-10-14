define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/Tree'
], function (registerSuite, assert, declare, lang, Memory, Tree) {
	var TestStore = declare([ Memory, Tree ]);

	var data = [
		{ parent: null, id: '1', name: 'root1' },
		{ parent: '1', id: '1.1', name: 'child1.1' },
		{ parent: '1', id: '1.2', name: 'child1.2' },
		{ parent: '1.2', id: '1.2.1', name: 'grandchild1.2.1' },
		{ parent: '1.2', id: '1.2.2', name: 'grandchild1.2.2' },
		{ parent: '1', id: '1.3', name: 'child1.3' },
		{ parent: null, id: '2', name: 'root2' },
		{ parent: '2', id: '2.1', name: 'child2.1' },
		{ parent: '2', id: '2.2', name: 'child2.2' },
		{ parent: null, id: '3', name: 'root3' }
	];

	var store = new TestStore({
		data: data
	});

	// Create a copy of data with a different parent property for testing custom properties
	data = lang.clone(data);
	for (var i = data.length; i--;) {
		data[i].parentId = data[i].parent;
		delete data[i].parent;
	}
	var customPropertyStore = new TestStore({
		hasChildrenProperty: 'isParent',
		parentProperty: 'parentId',
		data: data
	});

	function createMayHaveChildrenTest(store, hasChildrenProperty) {
		return function () {
			var object = {};
			assert.isTrue(store.mayHaveChildren(object));

			object[hasChildrenProperty] = true;
			assert.isTrue(store.mayHaveChildren(object));

			object[hasChildrenProperty] = false;
			assert.isFalse(store.mayHaveChildren(object));
		};
	}

	function createGetChildrenTest(store, parentProperty) {
		return function () {
			var childlessObject = store.getSync('3');
			var children = store.getChildren(childlessObject).fetchSync().slice();
			assert.deepEqual(children, []);

			// parentPropertyObject is mixed into items for deepEqual assertions,
			// with dynamic parent property
			var parentPropertyObject = {};
			parentPropertyObject[parentProperty] = '1';

			var parentObject = store.getSync('1');
			children = store.getChildren(parentObject).fetchSync().slice();
			assert.deepEqual(children, [
				lang.mixin({ id: '1.1', name: 'child1.1' }, parentPropertyObject),
				lang.mixin({ id: '1.2', name: 'child1.2' }, parentPropertyObject),
				lang.mixin({ id: '1.3', name: 'child1.3' }, parentPropertyObject)
			]);

			parentPropertyObject[parentProperty] = '1.2';

			var grandparentObject = store.getSync('1.2');
			children = store.getChildren(grandparentObject).fetchSync().slice();
			assert.deepEqual(children, [
				lang.mixin({ id: '1.2.1', name: 'grandchild1.2.1' }, parentPropertyObject),
				lang.mixin({ id: '1.2.2', name: 'grandchild1.2.2' }, parentPropertyObject)
			]);
		};
	}

	registerSuite({
		name: 'dstore/Tree',

		'getRootCollection': function () {
			// slice() to get a copy of the results without a totalLength property
			var results = store.getRootCollection().fetchSync().slice();

			assert.deepEqual(results, [
				{ parent: null, id: '1', name: 'root1' },
				{ parent: null, id: '2', name: 'root2' },
				{ parent: null, id: '3', name: 'root3' }
			]);
		},

		'mayHaveChildren': createMayHaveChildrenTest(store, 'hasChildren'),
		'mayHaveChildren (custom hasChildrenProperty)': createMayHaveChildrenTest(customPropertyStore, 'isParent'),

		'getChildren': createGetChildrenTest(store, 'parent'),
		'getChildren (custom parentProperty)': createGetChildrenTest(customPropertyStore, 'parentId')
	});
});
