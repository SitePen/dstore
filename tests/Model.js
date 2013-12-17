define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/Deferred',
	'../Model',
	'../Property',
	'../Memory'
], function (registerSuite, assert, declare, Deferred, Model, Property, Memory) {
	function createPopulatedModel() {
		var model = new (declare(Model, {
			schema: {
				string: 'string',
				number: 'number',
				boolean: 'boolean',
				object: Object,
				array: Array,
				any: null,
				accessor: 'string'
			},
			additionalProperties: false,

			_accessorGetter: function () {
				return this._accessor;
			},

			_accessorSetter: function (value) {
				this._accessor = value;
				return value;
			}
		}))();

		model.set({
			string: 'foo',
			number: 1234,
			'boolean': true,
			object: { foo: 'foo' },
			array: [ 'foo', 'bar' ],
			any: 'foo',
			invalid: 'foo',
			accessor: 'foo'
		});

		return model;
	}


	registerSuite({
		name: 'Model',

		'#get and #set': function () {
			var model = createPopulatedModel();

			assert.strictEqual(model.get('string'), 'foo', 'string schema properties should be mutable as strings from an object');
			assert.strictEqual(model.get('number'), 1234, 'number schema properties should be mutable as numbers from an object');
			assert.strictEqual(model.get('boolean'), true, 'boolean schema properties should be mutable as booleans from an object');
			assert.deepEqual(model.get('object'), { foo: 'foo' }, 'Object schema properties should be mutable as objects from an object');
			assert.deepEqual(model.get('array'), [ 'foo', 'bar' ], 'Array schema properties should be mutable as arrays from an object');
			assert.strictEqual(model.get('any'), 'foo', 'null schema properties should be mutable as any value from an object');
			assert.strictEqual(model.get('invalid'), undefined, 'non-existant schema properties should not be mutable from an object');
			assert.strictEqual(model.get('accessor'), 'foo', 'accessors and mutators should work normally');

			model.set('number', 'not-a-number');
			assert.typeOf(model.get('number'), 'number', 'number schema properties should still be numbers even if passed a non-number value');
			assert.isTrue(isNaN(model.get('number')), 'number schema properties should still be set even if passed a non-number value');

			model.set('string', 1234);
			assert.typeOf(model.get('string'), 'string', 'string schema properties should still be strings even if passed a non-string value');
			assert.strictEqual(model.get('string'), '1234', 'string schema properties should still be set even if passed a non-string value');

			model.set('boolean', 'foo');
			assert.typeOf(model.get('boolean'), 'boolean', 'boolean schema properties should still be booleans even if passed a non-boolean value');
			assert.strictEqual(model.get('boolean'), true, 'boolean schema properties should still be set even if passed a non-boolean value');

			model.set('boolean', 'false');
			assert.strictEqual(model.get('boolean'), false, 'setting "false" string to boolean property should set it to false');

			model.set('boolean', '0');
			assert.strictEqual(model.get('boolean'), false, 'setting "0" string to boolean property should set it to false');

			model.set('boolean', []);
			assert.strictEqual(model.get('boolean'), false, 'setting an empty array to boolean property should set it to false');

			model.set('object', 'foo');
			assert.instanceOf(model.get('object'), Object, 'Object schema properties should still be Objects even if passed a non-Object value');
			assert.deepEqual(model.get('object'), { 0: 'f', 1: 'o', 2: 'o' }, 'Object schema properties should still be set even if passed a non-Object value');

			model.set('array', 'foo');
			assert.instanceOf(model.get('array'), Array, 'Array schema properties should still be Arrays even if passed a non-Array value');
			assert.deepEqual(model.get('array'), [ 'foo' ], 'Array schema properties should still be set even if passed a non-Array value');

			model.set('any', 1234);
			assert.typeOf(model.get('any'), 'number', 'any-type schema properties should be the type of the value passed');
			assert.strictEqual(model.get('any'), 1234, 'any-type schema properties should be set regardless of the type of value');

			model.set('invalid', 'foo');
			assert.strictEqual(model.get('invalid'), undefined, 'non-existant schema properties should not be mutable');
		},
		'#receive': function () {
			var model = createPopulatedModel();
			var wasReceived;
			function assertReceived (expected, test) {
				var wasReceived = false;
				test(function (value) {
					assert.strictEqual(expected, value);
					wasReceived = true;
				});
				assert.isTrue(wasReceived);
			}
			assertReceived('foo', function (callback) {
				model.receive('string', callback);
			});
			assertReceived('foo', function (callback) {
				model.receive('string').receive(callback);
			});
			assertReceived(1234, function (callback) {
				model.receive('number', callback);
			});
			assertReceived(true, function (callback) {
				model.receive('boolean').receive(callback);
			});
			// reset the model, so don't have to listeners
			model = createPopulatedModel();
			var string = model.receive('string');
			string.put(1234);
			assertReceived('1234', function (callback) {
				string.receive(callback);
				model.receive('string').receive(callback);
			});
			var number = model.receive('number');
			number.put(0);
			var order = [];
			number.receive(function (newValue) {
				order.push(newValue);
			});
			number.put(1);
			model.set('number', 2);
			model.set('number', '3');
			model.receive('number').put(4);
			number.put('5');

			assert.deepEqual(order, [0, 1, 2, 3, 4, 5]);

			model.prepareForSerialization();
			assert.strictEqual(JSON.stringify(model), '{"string":"1234","number":5,' +
				'"boolean":true,"object":{"foo":"foo"},"array":["foo","bar"],"any":"foo","_accessor":"foo"}');
		},

		'property definitions': function () {
			var model = new (declare(Model, {
				schema: {
					requiredString: new Property({
						type: 'string',
						required: true
					}),
					range: {
						validate: function() {
							if (this.value > 10 && this.value < 20) {
								this.set('errors', null);
								return true;
							}
							this.set('errors', ['not in range']);
						}
					},
					hasDefault: {
						default: 'beginning value'
					}
				},
				validateOnSet: false
			}))();
			assert.strictEqual(model.get('hasDefault'), 'beginning value');
			model.set('requiredString', 'a string');
			model.set('range', 15);
			assert.isTrue(model.validate());
			var lastReceivedErrors;
			model.receive('range').receive('errors', function(errors){
				lastReceivedErrors = errors;
			});
			model.set('requiredString', '');
			assert.isFalse(model.validate());
			model.set('range', 33);
			assert.isFalse(model.validate());
			assert.deepEqual(model.receive('requiredString').get('errors'), ['required, and it was not present']);
			assert.deepEqual(model.receive('range').get('errors'), ['not in range']);
			assert.deepEqual(lastReceivedErrors, ['not in range']);
			model.set('requiredString', 'a string');
			model.set('range', 15);
			assert.isTrue(model.validate());
			assert.strictEqual(lastReceivedErrors, null);
		},

		'#save async': function () {
			var model = new Model();

			// If there is an exception in the basic save logic, it will be used to fail the test
			return model.save();
		},

		'#validate async': function () {
			var asyncStringIsBValidator = {
				validate: function () {
					var dfd = new Deferred();
					var model = this;
					setTimeout(function () {
						if (model.value !== 'b') {
							model.set('errors', ['it is not b'])
							dfd.resolve(false);
						} else {
							dfd.resolve(true);
						}
					}, 0);

					return dfd.promise;
				}
			};

			var model = new (declare(Model, {
				schema: {
					test: new Property(asyncStringIsBValidator),
					test2: new Property({
						validator: asyncStringIsBValidator.validator,
						default: 'b'
					})
				}
			}))();
			model.set('test', 'a');

			return model.validate().then(function (isValid) {
				assert.isFalse(isValid, 'Invalid model should validate to false');

				var errors = model.receive('test').get('errors');
				assert.strictEqual(errors.length, 1, 'Invalid model field should have only one error');
				assert.strictEqual(errors[0], 'it is not b', 'Invalid model error should be set properly from validator');

				errors = model.receive('test2').get('errors');
				assert.isNotArray(errors, 'Valid model field should have zero errors');
			});
		},

		'#isFieldRequired': function () {
			var model = new (declare(Model, {
				schema: {
					requiredField: new Property({
						required: true
					}),
					optionalField: {}
				}
			}))();

			assert.isTrue(model.isFieldRequired('requiredField'), 'Field should be required');
			assert.isFalse(model.isFieldRequired('optionalField'), 'Field should not be required');
		},

		'with store': function () {
			var store = new Memory({data: [
				{id: 1, num: 1, str: 'hi', bool: true}
			]});
			var myObject = store.get(1);

		}

	});
});