define([
	'intern!object',
	'intern/chai!assert',
	'dojo/json',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'../Model',
	'../Property',
	'../ComputedProperty',
	'../extensions/HiddenProperties',
	'../Memory'
], function (registerSuite, assert, JSON, declare, lang, Deferred, Model, Property, ComputedProperty, HiddenProperties, Memory) {
	function createPopulatedModel() {
		var model = new (declare(Model, {
			schema: {
				string: 'string',
				number: 'number',
				boolean: 'boolean',
				object: Object,
				array: Array,
				any: {},
				accessor: {
					put: function (value) {
						return this._parent._accessor = value;
					},
					valueOf: function () {
						return this._parent._accessor;
					}
				}
			},
			additionalProperties: false

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


	var modelTests = {
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
			assert.typeOf(model.get('number'), 'number',
				'number schema properties should still be numbers even if passed a non-number value');
			assert.isTrue(isNaN(model.get('number')),
				'number schema properties should still be set even if passed a non-number value');

			model.set('string', 1234);
			assert.typeOf(model.get('string'), 'string',
				'string schema properties should still be strings even if passed a non-string value');
			assert.strictEqual(model.get('string'), '1234',
				'string schema properties should still be set even if passed a non-string value');

			model.set('boolean', 'foo');
			assert.typeOf(model.get('boolean'), 'boolean',
				'boolean schema properties should still be booleans even if passed a non-boolean value');
			assert.strictEqual(model.get('boolean'), true,
				'boolean schema properties should still be set even if passed a non-boolean value');

			model.set('boolean', 'false');
			assert.strictEqual(model.get('boolean'), false, 'setting "false" string to boolean property should set it to false');

			model.set('boolean', '0');
			assert.strictEqual(model.get('boolean'), false, 'setting "0" string to boolean property should set it to false');

			model.set('boolean', []);
			assert.strictEqual(model.get('boolean'), false, 'setting an empty array to boolean property should set it to false');

			model.set('array', 'foo');
			assert.instanceOf(model.get('array'), Array, 'Array schema properties should still be Arrays even if passed a non-Array value');
			assert.deepEqual(model.get('array'), [ 'foo' ], 'Array schema properties should still be set even if passed a non-Array value');

			model.set('any', 1234);
			assert.typeOf(model.get('any'), 'number', 'any-type schema properties should be the type of the value passed');
			assert.strictEqual(model.get('any'), 1234, 'any-type schema properties should be set regardless of the type of value');

			model.set('invalid', 'foo');
			assert.strictEqual(model.get('invalid'), undefined, 'non-existant schema properties should not be mutable');
		},
		'#property and #receive': function () {
			var model = createPopulatedModel();
			function assertReceived (expected, test) {
				var receivedCount = 0;
				test(function (value) {
					assert.strictEqual(expected, value);
					receivedCount++;
				});
				assert.strictEqual(receivedCount, 1);
			}
			assertReceived('foo', function (callback) {
				model.property('string').observe(callback);
			});
			assertReceived('foo', function (callback) {
				model.property('string').observe(callback);
			});
			assertReceived('foo', function (callback) {
				callback(model.property('string').valueOf());
			});
			assertReceived(1234, function (callback) {
				model.property('number').observe(callback);
			});
			assertReceived(true, function (callback) {
				model.property('boolean').observe(callback);
			});
			// make sure coercion works
			assert.strictEqual(model.property('number') + 1234, 2468);
			// reset the model, so don't have to listeners
			model = createPopulatedModel();
			var string = model.property('string');
			string.put(1234);
			assertReceived('1234', function (callback) {
				string.observe(callback);
			});
			assertReceived('1234', function (callback) {
				model.property('string').observe(callback);
			});
			assertReceived(true, function (callback) {
				model.property('boolean').observe(callback, {onlyFutureUpdates: true});
				model.set('boolean', true);
			});
			var number = model.property('number');
			number.put(0);
			var order = [];
			number.observe(function (newValue) {
				order.push(newValue);
			});
			number.put(1);
			model.set('number', 2);
			model.set('number', '3');
			model.property('number').put(4);
			number.put('5');

			assert.deepEqual(order, [0, 1, 2, 3, 4, 5]);
			model.property('object').set('foo', 'bar');

			model.prepareForSerialization();
			assert.strictEqual(JSON.stringify(model), '{"string":"1234","number":5,' +
				'"boolean":true,"object":{"foo":"bar"},"array":["foo","bar"],"any":"foo"' +
				(model instanceof HiddenProperties ? '' : ',"_accessor":"foo"') + '}');
		},

		'property definitions': function () {
			var model = new (declare(Model, {
				schema: {
					requiredString: new Property({
						type: 'string',
						required: true
					}),
					range: new Property({
						checkForErrors: function (value) {
							var errors = this.inherited(arguments);
							if (value < 10 || value > 20) {
								errors.push('not in range');
							}
							return errors;
						}
					}),
					hasDefault: {
						'default': 'beginning value'
					}
				},
				validateOnSet: false
			}))();
			assert.strictEqual(model.get('hasDefault'), 'beginning value');
			model.set('requiredString', 'a string');
			model.set('range', 15);
			assert.isTrue(model.validate());
			var lastReceivedErrors;
			model.property('range').property('errors').observe(function (errors) {
				lastReceivedErrors = errors;
			});
			model.set('requiredString', '');
			assert.isFalse(model.validate());
			model.set('range', 33);
			assert.isFalse(model.validate());
			assert.deepEqual(model.property('requiredString').get('errors'), ['required, and it was not present']);
			assert.deepEqual(model.property('range').get('errors'), ['not in range']);
			assert.deepEqual(lastReceivedErrors, ['not in range']);
			model.set('requiredString', 'a string');
			model.set('range', 15);
			assert.isTrue(model.validate());
			assert.strictEqual(lastReceivedErrors, undefined);
			model.property('range').addError('manually added error');
			assert.deepEqual(lastReceivedErrors, ['manually added error']);
		},
		defaults: function () {
			var model = new (declare(Model, {
				schema: {
					toOverride: {
						'default': 'beginning value'
					},
					hasDefault: {
						'default': 'beginning value'
					}
				}
			}))({
				toOverride: 'new value'
			});
			assert.strictEqual(model.get('toOverride'), 'new value');
			assert.strictEqual(model.get('hasDefault'), 'beginning value');
		},
		'computed properties': function () {
			var model = new (declare(Model, {
				schema: {
					firstName: 'string',
					lastName: 'string',
					name: new ComputedProperty({
						dependsOn: ['firstName', 'lastName'],
						getValue: function (firstName, lastName) {
							return firstName + ' ' + lastName;
						},
						setValue: function (value, parent) {
							var parts = value.split(' ');
							parent.set('firstName', parts[0]);
							parent.set('lastName', parts[1]);
						}
					}),
					birthDate: new ComputedProperty({
						dependsOn: ['birthDate'],
						getValue: function (birthDate) {
							return new Date(birthDate);
						},
						setValue: function (value, parent) {
							return parent[this.name] = value.getTime();
						}
					})
				},
				validateOnSet: false
			}))({
				firstName: 'John',
				lastName: 'Doe'
			});
			var updatedName;
			var nameProperty = model.property('name');
			var nameUpdateCount = 0;
			nameProperty.observe(function (name) {
				updatedName = name;
				nameUpdateCount++;
			});
			assert.strictEqual(nameProperty.valueOf(), 'John Doe');
			assert.strictEqual(nameUpdateCount, 1);
			model.set('firstName', 'Jane');
			assert.strictEqual(updatedName, 'Jane Doe');
			assert.strictEqual(nameUpdateCount, 2);
			var updatedName2;
			var handle = model.observe('name', function (name) {
				updatedName2 = name;
			});
			assert.strictEqual(updatedName2, 'Jane Doe');

			model.set('lastName', 'Smith');
			assert.strictEqual(updatedName, 'Jane Smith');
			assert.strictEqual(updatedName2, 'Jane Smith');
			assert.strictEqual(nameUpdateCount, 3);
			handle.remove();

			model.set({
				firstName: 'John',
				lastName: 'Doe'
			});
			assert.strictEqual(updatedName, 'John Doe');
			assert.strictEqual(updatedName2, 'Jane Smith');
			assert.strictEqual(nameUpdateCount, 4);
			model.set('name', 'Adam Smith');
			assert.strictEqual(updatedName, 'Adam Smith');
			assert.strictEqual(model.get('firstName'), 'Adam');
			assert.strictEqual(model.get('lastName'), 'Smith');
			assert.strictEqual(nameUpdateCount, 5);
			assert.strictEqual(updatedName2, 'Jane Smith');
			var then = new Date(1000000);
			model.set('birthDate', then);
			assert.strictEqual(model.get('birthDate').getTime(), 1000000);
			var updatedDate, now = new Date();
			model.observe('birthDate', function (newDate) {
				updatedDate = newDate;
			});
			model.set('birthDate', now);
			assert.strictEqual(updatedDate.getTime(), now.getTime());

			var standaloneComputed = new ComputedProperty({
				dependsOn: [nameProperty, model.property('birthDate')],
				getValue: function (name, birthDate) {
					return name + ' is ' + ((now - birthDate > 315360000000) ? 'older' : 'younger') +
						' than ten years old';
				}
			});
			var updatedComputed;
			standaloneComputed.observe(function (newValue) {
				updatedComputed = newValue;
			});
			assert.strictEqual(standaloneComputed.valueOf(), 'Adam Smith is younger than ten years old');
			assert.strictEqual(updatedComputed, 'Adam Smith is younger than ten years old');
			model.set('birthDate', then);
			assert.strictEqual(standaloneComputed.valueOf(), 'Adam Smith is older than ten years old');
			assert.strictEqual(updatedComputed, 'Adam Smith is older than ten years old');
			model.set('firstName', 'John');
			assert.strictEqual(standaloneComputed.valueOf(), 'John Smith is older than ten years old');
			assert.strictEqual(updatedComputed, 'John Smith is older than ten years old');
		},
		'#save async': function () {
			var model = new Model();

			// If there is an exception in the basic save logic, it will be used to fail the test
			return model.save();
		},

		'#validate async': function () {
			var AsyncStringIsBValidator = declare(null, {
				checkForErrors: function (value) {
					var errors = this.inherited(arguments);
					var dfd = new Deferred();
					setTimeout(function () {
						if (value !== 'b') {
							errors.push('it is not b');
						}
						dfd.resolve(errors);
					}, 0);
					return dfd.promise;
				}
			});
			var PropertyAsyncStringIsBValidator = declare([Property, AsyncStringIsBValidator]);


			var model = new (declare(Model, {
				schema: {
					test: new PropertyAsyncStringIsBValidator(),
					test2: new PropertyAsyncStringIsBValidator({
						'default': 'b'
					})
				}
			}))();
			model.set('test', 'a');

			return model.validate().then(function (isValid) {
				assert.isFalse(isValid, 'Invalid model should validate to false');

				var errors = model.property('test').get('errors');
				assert.strictEqual(errors.length, 1, 'Invalid model field should have only one error');
				assert.strictEqual(errors[0], 'it is not b', 'Invalid model error should be set properly from validator');

				errors = model.property('test2').get('errors');
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

			assert.isTrue(model.property('requiredField').required, 'Field should be required');
			assert.isFalse(!!model.property('optionalField').required, 'Field should not be required');
		},

		chaining: function () {
			var model = createPopulatedModel(),
				order = [];

			model.set('number', 1);
			var doubled = model.property('number').observe(function (value) {
				return value * 2;
			});
			doubled.observe(function (value) {
				order.push(value);
			});
			model.set('number', 2);
			model.set('number', 3);
			doubled.remove();
			model.set('number', 4);
			assert.deepEqual(order, [2, 4, 6]);
		},

		'object values': function () {
			var model = new Model(),
				order = [];
			model.set('object', {
				number: 1
			});
			var number = model.property('object', 'number');
			number.observe(function (value) {
				order.push(value);
			});
			model.set('object', {
				number: 2
			});
			model.property('object').set('number', 3);
			assert.deepEqual(order, [1, 2, 3]);
		},

		'with store': function () {
			var store = new Memory({
				data: [
					{id: 1, num: 1, str: 'hi', bool: true}
				],
				model: declare(Model, {
					schema: {
						str: {
							type: 'string',
							required: true
						},
						num: 'number'
					}
				})
			});
			var myObject = store.getSync(1);
			assert.strictEqual(myObject.get('num'), 1);
			myObject.set('num', 5);
			myObject.set('str', '');
			assert['throw'](function () {
				return myObject.save();
			}, Error);
			assert.isFalse(myObject.isValid());
			myObject.set('str', 'hellow');
			myObject.save();
			myObject = store.getSync(1);
			assert.strictEqual(myObject.get('num'), 5);
		}

	};
	registerSuite(modelTests);
	registerSuite(lang.mixin({}, modelTests, {
		name: 'HiddenProperties',
		setup: function(){
			Model = HiddenProperties;
		}
	}));
	
});
